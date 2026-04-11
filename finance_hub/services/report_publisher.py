"""Static report exporter for local-only usage."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone
from html import escape
from pathlib import Path

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.config import Settings
from backend.models import Transaction
from services.budget_planner import build_budget_plan_payload
from services.kpi_engine import (
    build_categories_payload,
    build_cumulative_payload,
    build_kpis_payload,
    build_monthly_payload,
)


@dataclass(slots=True)
class ExportResult:
    output_dir: Path
    html_path: Path
    json_path: Path
    generated_at: str


def _money(value: float) -> str:
    return f"{value:,.2f} EUR".replace(",", " ").replace(".", ",")


def _status_label(status: str) -> str:
    labels = {
        "over": "Depasse",
        "under": "Sous budget",
        "on_track": "Au niveau",
        "unplanned": "Non prevu",
    }
    return labels.get(status, status)


def _to_serializable(payload: object) -> object:
    if hasattr(payload, "model_dump"):
        return payload.model_dump()
    return payload


def _build_html(snapshot: dict[str, object], title: str, include_transactions: bool) -> str:
    generated_at = escape(str(snapshot["generated_at"]))
    kpis = snapshot["kpis"]
    categories = snapshot["categories"]["items"]
    monthly = snapshot["monthly"]["items"]
    cumulative = snapshot["cumulative"]["items"]
    budget_plan = snapshot["budget_plan"]
    transactions = snapshot["recent_transactions"]

    category_rows = "".join(
        f"""
        <tr>
          <td>{escape(item['category'])}</td>
          <td>{_money(float(item['total']))}</td>
          <td>{float(item['share']):.2f}%</td>
        </tr>
        """
        for item in categories[:8]
    )
    month_rows = "".join(
        f"""
        <tr>
          <td>{escape(item['period'])}</td>
          <td>{_money(float(item['total']))}</td>
          <td>{_money(float(item['cumulative']))}</td>
        </tr>
        """
        for item in monthly
    )
    budget_rows = "".join(
        f"""
        <tr>
          <td>{escape(item['category'])}</td>
          <td>{_money(float(item['planned']))}</td>
          <td>{_money(float(item['actual']))}</td>
          <td>{_money(float(item['variance']))}</td>
          <td>{escape(_status_label(str(item['status'])))}</td>
        </tr>
        """
        for item in budget_plan["items"]
    )
    transaction_block = ""
    if include_transactions and transactions:
        transaction_rows = "".join(
            f"""
            <tr>
              <td>{escape(str(item['date'] or item['period']))}</td>
              <td>{escape(item['category'])}</td>
              <td>{escape(item['description'] or '-')}</td>
              <td>{_money(float(item['amount']))}</td>
            </tr>
            """
            for item in transactions
        )
        transaction_block = f"""
        <section class="panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Recentes</p>
              <h2>Dernieres transactions</h2>
            </div>
          </div>
          <table>
            <thead>
              <tr><th>Date</th><th>Categorie</th><th>Description</th><th>Montant</th></tr>
            </thead>
            <tbody>{transaction_rows}</tbody>
          </table>
        </section>
        """

    trend_points = " ".join(
        f"{escape(item['period'])}: {_money(float(item['cumulative']))}" for item in cumulative[-6:]
    )

    return f"""<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex,nofollow">
    <title>{escape(title)}</title>
    <style>
      :root {{
        color-scheme: light;
        --bg: #f4f2ea;
        --panel: #fffdfa;
        --line: rgba(45, 50, 59, 0.12);
        --text: #202328;
        --muted: #6b717b;
        --accent: #1d5c57;
        --alert: #b04b2c;
      }}
      * {{ box-sizing: border-box; }}
      body {{
        margin: 0;
        font-family: "Georgia", "Times New Roman", serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(29, 92, 87, 0.08), transparent 28%),
          linear-gradient(180deg, #faf7ef 0%, var(--bg) 100%);
      }}
      main {{
        width: min(1120px, calc(100% - 32px));
        margin: 0 auto;
        padding: 40px 0 64px;
      }}
      header {{
        padding: 28px 0 24px;
        border-bottom: 1px solid var(--line);
        margin-bottom: 24px;
      }}
      h1, h2 {{ margin: 0; font-weight: 600; }}
      h1 {{ font-size: clamp(2.4rem, 4vw, 4rem); letter-spacing: -0.04em; }}
      h2 {{ font-size: 1.35rem; }}
      p {{ margin: 0; }}
      .lede {{
        margin-top: 12px;
        max-width: 780px;
        color: var(--muted);
        line-height: 1.6;
      }}
      .meta {{
        margin-top: 14px;
        color: var(--muted);
        font-size: 0.92rem;
      }}
      .grid {{
        display: grid;
        gap: 18px;
      }}
      .grid.kpis {{
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        margin-bottom: 24px;
      }}
      .panel {{
        background: color-mix(in srgb, var(--panel) 94%, white);
        border: 1px solid var(--line);
        border-radius: 22px;
        padding: 22px;
        box-shadow: 0 14px 32px rgba(32, 35, 40, 0.04);
      }}
      .panel-header {{
        display: flex;
        justify-content: space-between;
        align-items: end;
        gap: 12px;
        margin-bottom: 18px;
      }}
      .eyebrow {{
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        color: var(--accent);
        margin-bottom: 6px;
      }}
      .kpi-value {{
        margin-top: 8px;
        font-size: 1.6rem;
      }}
      .kpi-note {{
        margin-top: 8px;
        color: var(--muted);
        font-size: 0.92rem;
      }}
      .layout {{
        display: grid;
        gap: 18px;
        grid-template-columns: 1.1fr 0.9fr;
        margin-bottom: 18px;
      }}
      table {{
        width: 100%;
        border-collapse: collapse;
      }}
      th, td {{
        text-align: left;
        padding: 10px 0;
        border-bottom: 1px solid var(--line);
        font-size: 0.95rem;
      }}
      th {{
        color: var(--muted);
        font-size: 0.82rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }}
      .budget-summary {{
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
        gap: 12px;
        margin-bottom: 18px;
      }}
      .budget-summary article {{
        padding: 14px;
        border-radius: 16px;
        background: rgba(29, 92, 87, 0.06);
      }}
      .budget-summary span {{
        display: block;
        color: var(--muted);
        font-size: 0.85rem;
        margin-bottom: 6px;
      }}
      .budget-summary strong {{
        font-size: 1.15rem;
      }}
      .alert {{
        color: var(--alert);
      }}
      footer {{
        margin-top: 24px;
        color: var(--muted);
        font-size: 0.9rem;
      }}
      @media (max-width: 900px) {{
        .layout {{
          grid-template-columns: 1fr;
        }}
      }}
    </style>
  </head>
  <body>
    <main>
      <header>
        <p class="eyebrow">Finance Hub Snapshot</p>
        <h1>{escape(title)}</h1>
        <p class="lede">Rapport statique genere localement depuis ta base Finance Hub. L'application reste privee en local; seul ce snapshot agrege est fait pour etre depose sur un site statique ou dans un dossier synchronise.</p>
        <p class="meta">Genere le {generated_at}</p>
      </header>

      <section class="grid kpis">
        <article class="panel">
          <p class="eyebrow">Global</p>
          <h2>Total suivi</h2>
          <div class="kpi-value">{_money(float(kpis['total']))}</div>
          <p class="kpi-note">{int(kpis['transaction_count'])} transactions sur {int(kpis['months_count'])} mois</p>
        </article>
        <article class="panel">
          <p class="eyebrow">Charge perso</p>
          <h2>Reste a ta charge</h2>
          <div class="kpi-value">{_money(float(kpis['own']))}</div>
          <p class="kpi-note">Rembourse par les parents: {_money(float(kpis['reimbursed']))}</p>
        </article>
        <article class="panel">
          <p class="eyebrow">Rythme</p>
          <h2>Moyenne mensuelle</h2>
          <div class="kpi-value">{_money(float(kpis['avg_monthly']))}</div>
          <p class="kpi-note">Pic: {escape(str(kpis['top_month'] or 'Aucun'))} ({_money(float(kpis['top_month_total']))})</p>
        </article>
        <article class="panel">
          <p class="eyebrow">Categorie</p>
          <h2>Poste principal</h2>
          <div class="kpi-value">{escape(str(kpis['top_category'] or 'Aucune'))}</div>
          <p class="kpi-note">{_money(float(kpis['top_category_total']))}</p>
        </article>
      </section>

      <section class="layout">
        <section class="panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Budget</p>
              <h2>{escape(str(budget_plan['period']))}</h2>
            </div>
          </div>
          <div class="budget-summary">
            <article><span>Prevu</span><strong>{_money(float(budget_plan['total_planned']))}</strong></article>
            <article><span>Reel</span><strong>{_money(float(budget_plan['total_actual']))}</strong></article>
            <article><span>Ecart</span><strong class="{'alert' if float(budget_plan['total_variance']) > 0 else ''}">{_money(float(budget_plan['total_variance']))}</strong></article>
          </div>
          <table>
            <thead>
              <tr><th>Categorie</th><th>Prevu</th><th>Reel</th><th>Ecart</th><th>Statut</th></tr>
            </thead>
            <tbody>{budget_rows}</tbody>
          </table>
        </section>

        <section class="panel">
          <div class="panel-header">
            <div>
              <p class="eyebrow">Tendance</p>
              <h2>Derniers cumuls</h2>
            </div>
          </div>
          <p class="lede">Lecture rapide des derniers points de cumul: {trend_points}</p>
          <table>
            <thead>
              <tr><th>Periode</th><th>Total</th><th>Cumul</th></tr>
            </thead>
            <tbody>{month_rows}</tbody>
          </table>
        </section>
      </section>

      <section class="panel">
        <div class="panel-header">
          <div>
            <p class="eyebrow">Categories</p>
            <h2>Repartition principale</h2>
          </div>
        </div>
        <table>
          <thead>
            <tr><th>Categorie</th><th>Total</th><th>Part</th></tr>
          </thead>
          <tbody>{category_rows}</tbody>
        </table>
      </section>

      {transaction_block}

      <footer>
        Snapshot genere par Finance Hub. Fichier statique; aucune authentification ou base distante n'est necessaire pour le consulter.
      </footer>
    </main>
  </body>
</html>
"""


def export_static_report(
    db: Session,
    settings: Settings,
    *,
    output_dir: Path | None = None,
    title: str | None = None,
    recent_months: int | None = None,
    include_transactions: bool | None = None,
) -> ExportResult:
    """Export an aggregated static report to a target directory."""

    generated_at = datetime.now(timezone.utc).astimezone().strftime("%d/%m/%Y %H:%M")
    target_dir = (output_dir or settings.report_publish_dir).resolve()
    months_limit = max(1, recent_months or settings.report_recent_months)
    export_transactions = settings.report_include_transactions if include_transactions is None else include_transactions
    report_title = title or settings.report_title

    kpis = build_kpis_payload(db)
    monthly = build_monthly_payload(db)
    categories = build_categories_payload(db)
    cumulative = build_cumulative_payload(db)
    budget_plan = build_budget_plan_payload(db)

    monthly_items = monthly.items[-months_limit:]
    cumulative_items = cumulative.items[-months_limit:]
    recent_transactions = []
    if export_transactions:
        recent_pool = db.scalars(
            select(Transaction).order_by(Transaction.year.desc(), Transaction.month.desc(), Transaction.id.desc()).limit(12)
        ).all()
        recent_transactions = [
            {
                "date": item.date.isoformat() if item.date is not None else None,
                "period": f"{item.month_name} {item.year}",
                "category": item.category,
                "description": item.description,
                "amount": float(item.amount),
            }
            for item in recent_pool
        ]

    snapshot = {
        "generated_at": generated_at,
        "title": report_title,
        "kpis": _to_serializable(kpis),
        "monthly": {"items": [_to_serializable(item) for item in monthly_items]},
        "categories": _to_serializable(categories),
        "cumulative": {"items": [_to_serializable(item) for item in cumulative_items]},
        "budget_plan": _to_serializable(budget_plan),
        "recent_transactions": recent_transactions,
    }

    target_dir.mkdir(parents=True, exist_ok=True)
    html_path = target_dir / "index.html"
    json_path = target_dir / "report.json"

    html_path.write_text(_build_html(snapshot, report_title, export_transactions), encoding="utf-8")
    json_path.write_text(json.dumps(snapshot, indent=2, ensure_ascii=True), encoding="utf-8")

    return ExportResult(
        output_dir=target_dir,
        html_path=html_path,
        json_path=json_path,
        generated_at=generated_at,
    )
