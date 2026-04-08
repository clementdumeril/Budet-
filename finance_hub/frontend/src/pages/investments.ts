import { fetchInvestments } from "../api/client";
import { formatEuro } from "./finance-data";

export async function renderInvestmentsPage(): Promise<HTMLElement> {
  const investments = await fetchInvestments();
  const invested = investments.reduce((sum, item) => sum + item.amount, 0);
  const current = investments.reduce((sum, item) => sum + (item.current_value ?? item.amount), 0);

  const section = document.createElement("section");
  section.className = "page-grid";
  section.innerHTML = `
    <section class="overview-hero">
      <div>
        <p class="eyebrow">Investissements</p>
        <h1>Epargne, placements et objectifs longs.</h1>
        <p class="hero-copy">Cette zone sert a preparer le suivi des versements recurrents, des positions et de la valorisation sans dependre d'un broker en particulier.</p>
      </div>
      <div class="overview-mini-stats">
        <article>
          <span>Capital investi</span>
          <strong>${formatEuro(invested)}</strong>
        </article>
        <article>
          <span>Valeur actuelle</span>
          <strong>${formatEuro(current)}</strong>
        </article>
      </div>
    </section>

    <section class="overview-layout">
      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Positions</p>
            <h2>Lignes suivies</h2>
          </div>
        </div>
        <div class="overview-list">
          ${investments
            .map(
              (item) => `
                <article class="overview-list-item">
                  <div>
                    <strong>${item.type}</strong>
                    <p>${item.date_label ?? "Sans date"}${item.notes ? ` · ${item.notes}` : ""}</p>
                  </div>
                  <span>${formatEuro(item.current_value ?? item.amount)}</span>
                </article>
              `,
            )
            .join("")}
        </div>
      </article>

      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Roadmap</p>
            <h2>Prochaines briques</h2>
          </div>
        </div>
        <div class="insights-grid insights-grid-dual">
          <article class="insight-card">
            <span class="badge badge-blue">Plateformes</span>
            <strong>Multi-broker</strong>
            <p>Rattacher les comptes titres et historiser les versements.</p>
          </article>
          <article class="insight-card">
            <span class="badge badge-green">Positions</span>
            <strong>Valorisation</strong>
            <p>Ajouter ticker, quantite, prix de revient et performance latente.</p>
          </article>
          <article class="insight-card">
            <span class="badge badge-orange">Flux</span>
            <strong>Versements</strong>
            <p>Tracer les virements depuis les comptes bancaires vers l'epargne ou les placements.</p>
          </article>
          <article class="insight-card">
            <span class="badge badge-rose">Historique</span>
            <strong>Courbe de valeur</strong>
            <p>Ajouter une serie temporelle du portefeuille et des objectifs.</p>
          </article>
        </div>
      </article>
    </section>
  `;

  return section;
}
