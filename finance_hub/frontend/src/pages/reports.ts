import {
  ArcElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";

import {
  buildCategorySummary,
  buildMetrics,
  buildMonthlyBuckets,
  formatCompactEuro,
  formatEuro,
  formatPercent,
  loadTransactions,
} from "./finance-data";

Chart.register(
  ArcElement,
  CategoryScale,
  DoughnutController,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
);

const REPORT_COLORS = ["#597ef7", "#e47f37", "#2f9d8f", "#c4657b", "#d5a336", "#95a0ae"];

export async function renderReportsPage(): Promise<HTMLElement> {
  const transactions = await loadTransactions();
  const monthly = buildMonthlyBuckets(transactions);
  const categories = buildCategorySummary(transactions);
  const metrics = buildMetrics(transactions, monthly, categories);

  const section = document.createElement("section");
  section.className = "page-grid";
  section.innerHTML = `
    <section class="panel reports-header">
      <div>
        <p class="eyebrow">Reports</p>
        <h1>Analyse et rapports budgetaires</h1>
        <p class="hero-copy">Une vue analytique pour suivre l'evolution, le mix categories et la structure generale du budget.</p>
      </div>
      <div class="reports-kpi-strip">
        <article><span>Total</span><strong>${formatEuro(metrics.total)}</strong></article>
        <article><span>Perso</span><strong>${formatEuro(metrics.own)}</strong></article>
        <article><span>Aides</span><strong>${formatEuro(metrics.reimbursed)}</strong></article>
        <article><span>Taux</span><strong>${formatPercent(metrics.reimbursementRate)}</strong></article>
      </div>
    </section>

    <section class="overview-layout">
      <article class="panel panel-large">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Tendance longue</p>
            <h2>Cumul du budget</h2>
          </div>
        </div>
        <div class="chart-stage">
          <canvas id="reportsCumulativeChart"></canvas>
        </div>
      </article>

      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Mix</p>
            <h2>Repartition categories</h2>
          </div>
        </div>
        <div class="chart-stage chart-stage-compact">
          <canvas id="reportsCategoryChart"></canvas>
        </div>
      </article>
    </section>

    <section class="overview-layout">
      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Structure</p>
            <h2>Reperes de pilotage</h2>
          </div>
        </div>
        <div class="reports-stat-list">
          <article><span>Moyenne mensuelle</span><strong>${formatEuro(metrics.avgMonthly)}</strong></article>
          <article><span>Periode la plus haute</span><strong>${metrics.topMonth ?? "Aucune"}</strong><small>${formatEuro(metrics.topMonthTotal)}</small></article>
          <article><span>Categorie dominante</span><strong>${metrics.topCategory ?? "Aucune"}</strong><small>${formatEuro(metrics.topCategoryTotal)}</small></article>
          <article><span>Nombre de periodes</span><strong>${metrics.monthsCount}</strong><small>${metrics.transactionCount} transactions</small></article>
        </div>
      </article>

      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Classement</p>
            <h2>Categories principales</h2>
          </div>
        </div>
        <div class="overview-list">
          ${categories
            .slice(0, 6)
            .map(
              (item) => `
                <article class="overview-list-item">
                  <div>
                    <strong>${item.category}</strong>
                    <p>${formatPercent(item.share)}</p>
                  </div>
                  <span>${formatEuro(item.total)}</span>
                </article>
              `,
            )
            .join("")}
        </div>
      </article>
    </section>
  `;

  const cumulativeCanvas = section.querySelector<HTMLCanvasElement>("#reportsCumulativeChart");
  const categoryCanvas = section.querySelector<HTMLCanvasElement>("#reportsCategoryChart");

  if (!cumulativeCanvas || !categoryCanvas) {
    return section;
  }

  queueMicrotask(() => {
    new Chart(cumulativeCanvas, {
      type: "line",
      data: {
        labels: monthly.map((bucket) => bucket.shortLabel),
        datasets: [
          {
            label: "Cumul",
            data: monthly.map((bucket) => bucket.cumulative),
            borderColor: "#597ef7",
            backgroundColor: "rgba(89, 126, 247, 0.14)",
            tension: 0.3,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: "#7b8594", maxRotation: 0 },
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

    new Chart(categoryCanvas, {
      type: "doughnut",
      data: {
        labels: categories.slice(0, 6).map((item) => item.category),
        datasets: [
          {
            data: categories.slice(0, 6).map((item) => item.total),
            backgroundColor: REPORT_COLORS,
            borderWidth: 0,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "68%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { usePointStyle: true, boxWidth: 10, color: "#566173" },
          },
        },
      },
    });
  });

  return section;
}
