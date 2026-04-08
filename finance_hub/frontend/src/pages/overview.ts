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
  buildCategorySummary,
  buildMetrics,
  buildMonthlyBuckets,
  formatCompactEuro,
  formatEuro,
  formatPercent,
  loadTransactions,
} from "./finance-data";

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

export async function renderOverviewPage(): Promise<HTMLElement> {
  const transactions = await loadTransactions();
  const monthly = buildMonthlyBuckets(transactions);
  const categories = buildCategorySummary(transactions);
  const metrics = buildMetrics(transactions, monthly, categories);

  const section = document.createElement("section");
  section.className = "page-grid";
  section.innerHTML = `
    <section class="overview-hero">
      <div>
        <p class="eyebrow">Dashboard</p>
        <h1>Vue d'ensemble du budget etudiant.</h1>
        <p class="hero-copy">Un ecran de synthese pour lire vite le volume global, la tendance recente et les categories qui tirent le budget.</p>
      </div>
      <div class="overview-mini-stats">
        <article>
          <span>Transactions</span>
          <strong>${metrics.transactionCount}</strong>
        </article>
        <article>
          <span>Periodes</span>
          <strong>${metrics.monthsCount}</strong>
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
          <div class="muted">${metrics.monthsCount} periodes</div>
        </div>
        <div class="chart-stage">
          <canvas id="overviewMonthlyChart"></canvas>
        </div>
      </article>

      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Snapshot</p>
            <h2>Top categories</h2>
          </div>
          <div class="muted">Top 5</div>
        </div>
        <div class="overview-list" id="overviewTopCategories"></div>
      </article>
    </section>

    <section class="overview-layout">
      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Charge perso</p>
            <h2>Repartition perso vs aides</h2>
          </div>
        </div>
        <div class="chart-stage chart-stage-compact">
          <canvas id="overviewSplitChart"></canvas>
        </div>
      </article>

      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Highlights</p>
            <h2>Points rapides</h2>
          </div>
        </div>
        <div class="insights-grid insights-grid-dual">
          <article class="insight-card">
            <span class="badge badge-orange">Point haut</span>
            <strong>${metrics.topMonth ?? "Aucune"}</strong>
            <p>${formatEuro(metrics.topMonthTotal)} sur la periode la plus intense.</p>
          </article>
          <article class="insight-card">
            <span class="badge badge-blue">Top categorie</span>
            <strong>${metrics.topCategory ?? "Aucune"}</strong>
            <p>${formatEuro(metrics.topCategoryTotal)} concentres sur ce poste.</p>
          </article>
          <article class="insight-card">
            <span class="badge badge-green">Aides</span>
            <strong>${formatPercent(metrics.reimbursementRate)}</strong>
            <p>${formatEuro(metrics.reimbursed)} couverts par une aide ou un remboursement.</p>
          </article>
          <article class="insight-card">
            <span class="badge badge-rose">Moyenne</span>
            <strong>${formatEuro(metrics.avgMonthly)}</strong>
            <p>Depense moyenne par mois sur toute la base.</p>
          </article>
        </div>
      </article>
    </section>
  `;

  const cards = section.querySelector<HTMLElement>("#overviewCards");
  const topCategories = section.querySelector<HTMLElement>("#overviewTopCategories");
  const monthlyCanvas = section.querySelector<HTMLCanvasElement>("#overviewMonthlyChart");
  const splitCanvas = section.querySelector<HTMLCanvasElement>("#overviewSplitChart");

  if (!cards || !topCategories || !monthlyCanvas || !splitCanvas) {
    return section;
  }

  cards.append(
    buildMetricCard("Total depense", formatEuro(metrics.total), `${metrics.transactionCount} transactions importees`),
    buildMetricCard("A ta charge", formatEuro(metrics.own), `${formatEuro(metrics.avgMonthly)} par mois`),
    buildMetricCard("Aides", formatEuro(metrics.reimbursed), `${formatPercent(metrics.reimbursementRate)} du total`),
    buildMetricCard("Categorie dominante", metrics.topCategory ?? "Aucune", formatEuro(metrics.topCategoryTotal)),
  );

  topCategories.innerHTML = categories
    .slice(0, 5)
    .map(
      (item) => `
        <article class="overview-list-item">
          <div>
            <strong>${item.category}</strong>
            <p>${formatPercent(item.share)} du total</p>
          </div>
          <span>${formatEuro(item.total)}</span>
        </article>
      `,
    )
    .join("");

  queueMicrotask(() => {
    new Chart(monthlyCanvas, {
      type: "bar",
      data: {
        labels: monthly.map((bucket) => bucket.shortLabel),
        datasets: [
          {
            label: "Depenses",
            data: monthly.map((bucket) => bucket.total),
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

    new Chart(splitCanvas, {
      type: "bar",
      data: {
        labels: ["Budget"],
        datasets: [
          {
            label: "A ta charge",
            data: [metrics.own],
            backgroundColor: "#597ef7",
            borderRadius: 12,
            borderSkipped: false,
            stack: "total",
          },
          {
            label: "Aides et remboursements",
            data: [metrics.reimbursed],
            backgroundColor: "#2f9d8f",
            borderRadius: 12,
            borderSkipped: false,
            stack: "total",
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { usePointStyle: true, boxWidth: 10, color: "#566173" },
          },
        },
        scales: {
          x: {
            stacked: true,
            grid: { color: "rgba(40, 52, 71, 0.08)" },
            ticks: {
              color: "#7b8594",
              callback: (value) => formatCompactEuro(Number(value)),
            },
          },
          y: {
            stacked: true,
            grid: { display: false },
            ticks: { color: "#4f5968" },
          },
        },
      },
    });
  });

  return section;
}
