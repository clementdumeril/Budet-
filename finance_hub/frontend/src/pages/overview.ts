import {
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";

import {
  fetchBudgetPlan,
  fetchCategories,
  fetchKpis,
  fetchMonthly,
  upsertBudgetTarget,
  type BudgetPlanResponse,
  type CategoryBreakdownItem,
  type KPIResponse,
  type MonthlyPoint,
} from "../api/client";
import { formatCompactEuro, formatEuro, formatPercent } from "./finance-data";

Chart.register(
  BarController,
  BarElement,
  CategoryScale,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
);

const EDITABLE_BUDGET_CATEGORIES = [
  "Loyer",
  "Alimentation",
  "Transport",
  "Loisirs",
  "Abonnements",
  "Sante",
  "Scolarite",
  "Ponctuel",
];

function buildMetricCard(label: string, value: string, detail: string) {
  const card = document.createElement("article");
  card.className = "overview-card";
  card.innerHTML = `
    <p class="eyebrow">${label}</p>
    <strong>${value}</strong>
    <p class="muted">${detail}</p>
  `;
  return card;
}

function statusLabel(status: string) {
  if (status === "over") {
    return "Au-dessus";
  }
  if (status === "under") {
    return "Sous le budget";
  }
  if (status === "unplanned") {
    return "Non prevu";
  }
  return "Dans la cible";
}

function varianceLabel(value: number) {
  if (value === 0) {
    return "Pile sur la cible";
  }
  return `${value > 0 ? "+" : "-"}${formatEuro(Math.abs(value))}`;
}

function progressWidth(planned: number, actual: number) {
  const maxValue = Math.max(planned, actual, 1);
  return Math.min((actual / maxValue) * 100, 100);
}

function renderBudgetRows(plan: BudgetPlanResponse) {
  if (plan.items.length === 0) {
    return `<div class="empty-state">Aucun budget defini pour ${plan.period}.</div>`;
  }

  return plan.items
    .map(
      (item) => `
        <article class="overview-list-item">
          <div>
            <strong>${item.category}</strong>
            <p>${formatEuro(item.actual)} reels pour ${formatEuro(item.planned)} prevus</p>
            <div class="flow-track">
              <span
                class="flow-bar"
                style="width:${Math.max(progressWidth(item.planned, item.actual), 6)}%; background:${
                  item.status === "over" || item.status === "unplanned" ? "#c4657b" : "#2f9d8f"
                };"
              ></span>
            </div>
          </div>
          <div class="import-source-meta">
            <span>${statusLabel(item.status)}</span>
            <small>${varianceLabel(item.variance)}</small>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderBudgetFormFields(plan: BudgetPlanResponse) {
  const plannedByCategory = new Map(plan.items.map((item) => [item.category, item.planned]));
  return EDITABLE_BUDGET_CATEGORIES.map((category) => {
    const planned = plannedByCategory.get(category);
    return `
      <label class="field manual-field">
        <span>${category}</span>
        <input
          type="text"
          inputmode="decimal"
          data-budget-category="${category}"
          value="${planned && planned > 0 ? String(planned).replace(".", ",") : ""}"
          placeholder="0,00"
        />
      </label>
    `;
  }).join("");
}

function renderTopCategories(categories: CategoryBreakdownItem[]) {
  if (categories.length === 0) {
    return `<div class="empty-state">Aucune categorie exploitable.</div>`;
  }

  return categories
    .slice(0, 5)
    .map(
      (item) => `
        <article class="overview-list-item">
          <div>
            <strong>${item.category}</strong>
            <p>${formatPercent(item.share)} du total cumule</p>
          </div>
          <span>${formatEuro(item.total)}</span>
        </article>
      `,
    )
    .join("");
}

export async function renderOverviewPage(): Promise<HTMLElement> {
  const [kpis, monthlyResponse, categoriesResponse, initialPlan] = await Promise.all([
    fetchKpis(),
    fetchMonthly(),
    fetchCategories(),
    fetchBudgetPlan(),
  ]);

  let budgetPlan = initialPlan;
  const monthly = monthlyResponse.items;
  const categories = categoriesResponse.items;

  const section = document.createElement("section");
  section.className = "page-grid";
  section.innerHTML = `
    <section class="overview-hero">
      <div>
        <p class="eyebrow">Budget</p>
        <h1>Vue d'ensemble du budget et du reel du mois.</h1>
        <p class="hero-copy">La synthese du haut est maintenant centree sur un vrai pilotage prevu vs reel pour ${budgetPlan.period}.</p>
      </div>
      <div class="overview-mini-stats">
        <article>
          <span>Periode suivie</span>
          <strong>${budgetPlan.period}</strong>
        </article>
        <article>
          <span>Transactions</span>
          <strong>${kpis.transaction_count}</strong>
        </article>
        <article>
          <span>Periodes</span>
          <strong>${kpis.months_count}</strong>
        </article>
      </div>
    </section>

    <section class="overview-card-grid" id="overviewCards"></section>

    <section class="overview-layout">
      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Tendance</p>
            <h2>Depenses mensuelles</h2>
          </div>
          <div class="muted">${kpis.months_count} periodes</div>
        </div>
        <div class="chart-stage">
          <canvas id="overviewMonthlyChart"></canvas>
        </div>
      </article>

      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Budget actuel</p>
            <h2>Prevu vs reel</h2>
          </div>
          <div class="muted" id="budgetPlanDetail">${budgetPlan.period}</div>
        </div>
        <div class="overview-list" id="budgetPlanList"></div>
      </article>
    </section>

    <section class="overview-layout">
      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Edition</p>
            <h2>Definir les cibles mensuelles</h2>
          </div>
          <div class="muted">Mise a jour sur ${budgetPlan.period}</div>
        </div>
        <form id="budgetTargetsForm" class="manual-entry-form">
          <div class="filter-grid">
            ${renderBudgetFormFields(budgetPlan)}
          </div>
          <button id="budgetTargetsSubmit" class="primary-button manual-submit" type="submit">Enregistrer les budgets</button>
          <p id="budgetTargetsStatus" class="muted manual-status">Les montants saisis alimentent le suivi prevu vs reel du mois courant.</p>
        </form>
      </article>

      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Top categories</p>
            <h2>Poids structurel</h2>
          </div>
        </div>
        <div class="overview-list" id="overviewTopCategories"></div>
      </article>
    </section>
  `;

  const cards = section.querySelector<HTMLElement>("#overviewCards");
  const topCategories = section.querySelector<HTMLElement>("#overviewTopCategories");
  const monthlyCanvas = section.querySelector<HTMLCanvasElement>("#overviewMonthlyChart");
  const budgetPlanList = section.querySelector<HTMLElement>("#budgetPlanList");
  const budgetPlanDetail = section.querySelector<HTMLElement>("#budgetPlanDetail");
  const budgetTargetsForm = section.querySelector<HTMLFormElement>("#budgetTargetsForm");
  const budgetTargetsSubmit = section.querySelector<HTMLButtonElement>("#budgetTargetsSubmit");
  const budgetTargetsStatus = section.querySelector<HTMLElement>("#budgetTargetsStatus");

  if (
    !cards ||
    !topCategories ||
    !monthlyCanvas ||
    !budgetPlanList ||
    !budgetPlanDetail ||
    !budgetTargetsForm ||
    !budgetTargetsSubmit ||
    !budgetTargetsStatus
  ) {
    return section;
  }

  const renderCards = (plan: BudgetPlanResponse, currentKpis: KPIResponse) => {
    cards.replaceChildren(
      buildMetricCard("Budget du mois", formatEuro(plan.total_planned), `${plan.items.length} categories suivies`),
      buildMetricCard("Reel du mois", formatEuro(plan.total_actual), `${varianceLabel(plan.total_variance)} vs budget`),
      buildMetricCard(
        "Charge perso cumulee",
        formatEuro(currentKpis.own),
        `${formatEuro(currentKpis.avg_monthly)} par mois en moyenne`,
      ),
      buildMetricCard(
        "Categorie dominante",
        currentKpis.top_category ?? "Aucune",
        formatEuro(currentKpis.top_category_total),
      ),
    );
  };

  const syncBudgetWidgets = (plan: BudgetPlanResponse) => {
    budgetPlan = plan;
    budgetPlanDetail.textContent = plan.period;
    budgetPlanList.innerHTML = renderBudgetRows(plan);
    const inputs = budgetTargetsForm.querySelectorAll<HTMLInputElement>("[data-budget-category]");
    const plannedByCategory = new Map(plan.items.map((item) => [item.category, item.planned]));
    inputs.forEach((input) => {
      const category = input.dataset.budgetCategory ?? "";
      const planned = plannedByCategory.get(category);
      input.value = planned && planned > 0 ? String(planned).replace(".", ",") : "";
    });
    renderCards(plan, kpis);
  };

  renderCards(budgetPlan, kpis);
  topCategories.innerHTML = renderTopCategories(categories);
  syncBudgetWidgets(budgetPlan);

  budgetTargetsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const inputs = Array.from(
        budgetTargetsForm.querySelectorAll<HTMLInputElement>("[data-budget-category]"),
      );
      const payloads = inputs.flatMap((input) => {
        const rawValue = input.value.trim();
        if (!rawValue) {
          return [];
        }

        const normalizedAmount = Number(rawValue.replace(",", "."));
        if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
          throw new Error(`Montant invalide pour ${input.dataset.budgetCategory ?? "une categorie"}.`);
        }

        return [
          {
            year: budgetPlan.year,
            month: budgetPlan.month,
            category: input.dataset.budgetCategory ?? "Autre",
            planned_amount: normalizedAmount,
            notes: null,
          },
        ];
      });

      if (payloads.length === 0) {
        budgetTargetsStatus.textContent = "Renseigne au moins un montant a enregistrer.";
        return;
      }

      budgetTargetsSubmit.disabled = true;
      budgetTargetsSubmit.textContent = "Enregistrement...";
      budgetTargetsStatus.textContent = "Mise a jour des budgets en cours...";

      await Promise.all(payloads.map((payload) => upsertBudgetTarget(payload)));
      const updatedPlan = await fetchBudgetPlan(budgetPlan.year, budgetPlan.month);
      syncBudgetWidgets(updatedPlan);
      budgetTargetsStatus.textContent = `Budgets mis a jour pour ${updatedPlan.period}.`;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      budgetTargetsStatus.textContent = `Enregistrement impossible: ${message}`;
    } finally {
      budgetTargetsSubmit.disabled = false;
      budgetTargetsSubmit.textContent = "Enregistrer les budgets";
    }
  });

  queueMicrotask(() => {
    new Chart(monthlyCanvas, {
      type: "bar",
      data: {
        labels: monthly.map((bucket: MonthlyPoint) => bucket.period),
        datasets: [
          {
            label: "Depenses",
            data: monthly.map((bucket: MonthlyPoint) => bucket.total),
            backgroundColor: "#e47f37",
            borderRadius: 10,
            borderSkipped: false,
            maxBarThickness: 34,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#7b8594", maxRotation: 0, autoSkip: true, maxTicksLimit: 8 },
          },
          y: {
            grid: { color: "rgba(40, 52, 71, 0.08)" },
            ticks: {
              color: "#7b8594",
              callback: (value) => formatCompactEuro(Number(value)),
            },
          },
        },
      },
    });
  });

  return section;
}
