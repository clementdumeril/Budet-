import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";

import { fetchAllTransactions, type Transaction } from "../api/client";

Chart.register(
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  DoughnutController,
  Filler,
  Legend,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
);

const MONTH_LABELS = [
  "Janvier",
  "Fevrier",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Aout",
  "Septembre",
  "Octobre",
  "Novembre",
  "Decembre",
];

const CATEGORY_COLORS: Record<string, string> = {
  Alimentation: "#e47f37",
  Transport: "#2f9d8f",
  Loyer: "#7e8ce0",
  Loisirs: "#597ef7",
  Abonnements: "#d5a336",
  Sante: "#4db6ac",
  Scolarite: "#c4657b",
  Ponctuel: "#d5a336",
  Autre: "#95a0ae",
};

type DashboardState = {
  search: string;
  year: string;
  month: string;
  category: string;
  reimbursed: string;
};

type MonthlyBucket = {
  year: number;
  month: number;
  key: string;
  label: string;
  shortLabel: string;
  total: number;
  own: number;
  reimbursed: number;
  cumulative: number;
  ownCumulative: number;
};

type CategorySummary = {
  category: string;
  total: number;
  share: number;
};

type DisplayCategory = CategorySummary & {
  value: number;
  color: string;
  groupKey: "essentiel" | "formation" | "vie-perso";
};

type DashboardMetrics = {
  total: number;
  reimbursed: number;
  own: number;
  avgMonthly: number;
  topCategory: string | null;
  topCategoryTotal: number;
  topMonth: string | null;
  topMonthTotal: number;
  transactionCount: number;
  monthsCount: number;
  reimbursementRate: number;
};

function formatEuro(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatCompactEuro(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value)}%`;
}

function formatPeriod(year: number, month: number, monthName?: string | null) {
  const label = monthName && monthName.trim().length > 0 ? monthName : MONTH_LABELS[month - 1] ?? String(month);
  return `${label} ${year}`;
}

function formatShortPeriod(year: number, month: number) {
  const label = MONTH_LABELS[month - 1] ?? String(month);
  return `${label.slice(0, 3)} ${String(year).slice(-2)}`;
}

function getPeriodKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function compareTransactions(left: Transaction, right: Transaction) {
  return left.year - right.year || left.month - right.month || left.id - right.id;
}

function buildKpiCard(label: string, value: string, detail: string, tone: string) {
  const card = document.createElement("article");
  card.className = `kpi-card tone-${tone}`;
  card.innerHTML = `
    <p class="eyebrow">${label}</p>
    <h3>${value}</h3>
    <p class="muted">${detail}</p>
  `;
  return card;
}

function deriveMonthlyBuckets(transactions: Transaction[]): MonthlyBucket[] {
  const grouped = new Map<string, MonthlyBucket>();

  transactions
    .slice()
    .sort(compareTransactions)
    .forEach((transaction) => {
      const key = getPeriodKey(transaction.year, transaction.month);
      const current = grouped.get(key) ?? {
        year: transaction.year,
        month: transaction.month,
        key,
        label: formatPeriod(transaction.year, transaction.month, transaction.month_name),
        shortLabel: formatShortPeriod(transaction.year, transaction.month),
        total: 0,
        own: 0,
        reimbursed: 0,
        cumulative: 0,
        ownCumulative: 0,
      };

      current.total += transaction.amount;
      if (transaction.reimbursement_to_parents) {
        current.reimbursed += transaction.amount;
      } else {
        current.own += transaction.amount;
      }

      grouped.set(key, current);
    });

  let cumulative = 0;
  let ownCumulative = 0;

  return Array.from(grouped.values())
    .sort((left, right) => left.key.localeCompare(right.key))
    .map((bucket) => {
      cumulative += bucket.total;
      ownCumulative += bucket.own;
      return {
        ...bucket,
        cumulative: Number(cumulative.toFixed(2)),
        ownCumulative: Number(ownCumulative.toFixed(2)),
      };
    });
}

function deriveCategorySummary(transactions: Transaction[]): CategorySummary[] {
  const totals = new Map<string, number>();
  const total = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);

  transactions.forEach((transaction) => {
    totals.set(transaction.category, (totals.get(transaction.category) ?? 0) + transaction.amount);
  });

  return Array.from(totals.entries())
    .map(([category, amount]) => ({
      category,
      total: Number(amount.toFixed(2)),
      share: total > 0 ? Number(((amount / total) * 100).toFixed(2)) : 0,
    }))
    .sort((left, right) => right.total - left.total);
}

function deriveMetrics(
  transactions: Transaction[],
  monthlyBuckets: MonthlyBucket[],
  categories: CategorySummary[],
): DashboardMetrics {
  const total = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const reimbursed = transactions.reduce(
    (sum, transaction) => sum + (transaction.reimbursement_to_parents ? transaction.amount : 0),
    0,
  );
  const topMonth = monthlyBuckets.reduce<MonthlyBucket | null>(
    (current, bucket) => (current === null || bucket.total > current.total ? bucket : current),
    null,
  );
  const topCategory = categories[0] ?? null;

  return {
    total: Number(total.toFixed(2)),
    reimbursed: Number(reimbursed.toFixed(2)),
    own: Number((total - reimbursed).toFixed(2)),
    avgMonthly: monthlyBuckets.length ? Number((total / monthlyBuckets.length).toFixed(2)) : 0,
    topCategory: topCategory?.category ?? null,
    topCategoryTotal: topCategory?.total ?? 0,
    topMonth: topMonth?.label ?? null,
    topMonthTotal: topMonth?.total ?? 0,
    transactionCount: transactions.length,
    monthsCount: monthlyBuckets.length,
    reimbursementRate: total > 0 ? Number(((reimbursed / total) * 100).toFixed(2)) : 0,
  };
}

function filterTransactions(transactions: Transaction[], state: DashboardState) {
  const search = state.search.trim().toLocaleLowerCase();

  return transactions.filter((transaction) => {
    if (state.year !== "all" && String(transaction.year) !== state.year) {
      return false;
    }
    if (state.month !== "all" && String(transaction.month) !== state.month) {
      return false;
    }
    if (state.category !== "all" && transaction.category !== state.category) {
      return false;
    }
    if (state.reimbursed === "yes" && !transaction.reimbursement_to_parents) {
      return false;
    }
    if (state.reimbursed === "no" && transaction.reimbursement_to_parents) {
      return false;
    }
    if (!search) {
      return true;
    }

    const haystack = [
      transaction.description ?? "",
      transaction.category,
      transaction.month_name ?? "",
      String(transaction.year),
    ]
      .join(" ")
      .toLocaleLowerCase();

    return haystack.includes(search);
  });
}

function getCategoryColor(category: string, index: number) {
  const fallbackPalette = ["#e47f37", "#2f9d8f", "#597ef7", "#d5a336", "#c4657b", "#7e8ce0", "#95a0ae"];
  return CATEGORY_COLORS[category] ?? fallbackPalette[index % fallbackPalette.length];
}

function buildSelectOptions(options: Array<{ value: string; label: string }>, selectedValue: string) {
  return options
    .map(
      (option) =>
        `<option value="${option.value}"${option.value === selectedValue ? " selected" : ""}>${option.label}</option>`,
    )
    .join("");
}

function createFilterTags(state: DashboardState) {
  const tags: string[] = [];

  if (state.search.trim()) {
    tags.push(`Recherche: ${state.search.trim()}`);
  }
  if (state.year !== "all") {
    tags.push(`Annee ${state.year}`);
  }
  if (state.month !== "all") {
    tags.push(MONTH_LABELS[Number(state.month) - 1] ?? state.month);
  }
  if (state.category !== "all") {
    tags.push(state.category);
  }
  if (state.reimbursed === "yes") {
    tags.push("Parents");
  }
  if (state.reimbursed === "no") {
    tags.push("A ta charge");
  }

  return tags;
}

function toggleChartState(canvas: HTMLCanvasElement, emptyLabel: HTMLParagraphElement, hasData: boolean) {
  canvas.hidden = !hasData;
  emptyLabel.hidden = hasData;
}

function buildTimeChartOptions(monthlyBuckets: MonthlyBucket[]) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    layout: {
      padding: { top: 8, right: 8, bottom: 0, left: 0 },
    },
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: { usePointStyle: true, boxWidth: 10, color: "#566173" },
      },
      tooltip: {
        callbacks: {
          title: (items: Array<{ dataIndex: number }>) => monthlyBuckets[items[0]?.dataIndex ?? 0]?.label ?? "",
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: "#7b8594",
          autoSkip: true,
          maxRotation: 0,
          minRotation: 0,
          maxTicksLimit: 8,
        },
      },
      y: {
        grid: { color: "rgba(40, 52, 71, 0.08)" },
        ticks: {
          color: "#7b8594",
          callback: (value: string | number) => formatCompactEuro(Number(value)),
        },
      },
    },
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getCategoryGroup(category: string): DisplayCategory["groupKey"] {
  if (category === "Alimentation" || category === "Transport" || category === "Loyer" || category === "Ponctuel") {
    return "essentiel";
  }
  if (category === "Scolarite" || category === "Abonnements" || category === "Sante") {
    return "formation";
  }
  return "vie-perso";
}

function buildDisplayCategories(categories: CategorySummary[]): DisplayCategory[] {
  const topItems = categories.slice(0, 5).map((item, index) => ({
    ...item,
    value: item.total,
    color: getCategoryColor(item.category, index),
    groupKey: getCategoryGroup(item.category),
  }));
  const remaining = categories.slice(5).reduce((sum, item) => sum + item.total, 0);

  if (remaining > 0) {
    topItems.push({
      category: "Autres",
      total: Number(remaining.toFixed(2)),
      value: Number(remaining.toFixed(2)),
      share: 0,
      color: "#9aa3b2",
      groupKey: "vie-perso",
    });
  }

  const total = topItems.reduce((sum, item) => sum + item.total, 0);
  return topItems.map((item) => ({
    ...item,
    share: total > 0 ? Number(((item.total / total) * 100).toFixed(2)) : 0,
  }));
}

function buildCashflowMap(metrics: DashboardMetrics, ownCategories: CategorySummary[]) {
  if (metrics.total <= 0) {
    return `<div class="empty-state">Aucune donnee a afficher pour cette selection.</div>`;
  }

  const categories = buildDisplayCategories(ownCategories);
  const groupMeta = {
    essentiel: { label: "Essentiel", color: "#f0b53f" },
    formation: { label: "Formation", color: "#d96a9f" },
    "vie-perso": { label: "Vie perso", color: "#5c7cf5" },
  } as const;

  const groups = (Object.keys(groupMeta) as Array<keyof typeof groupMeta>)
    .map((key) => {
      const items = categories.filter((item) => item.groupKey === key);
      return {
        key,
        label: groupMeta[key].label,
        color: groupMeta[key].color,
        items,
        value: Number(items.reduce((sum, item) => sum + item.total, 0).toFixed(2)),
      };
      })
      .filter((group) => group.value > 0);

  const splitNodes = [
    { key: "own", label: "A ta charge", color: "#597ef7", value: metrics.own },
    ...(metrics.reimbursed > 0 ? [{ key: "parents", label: "Parents", color: "#3cae7b", value: metrics.reimbursed }] : []),
  ].filter((node) => node.value > 0);

  const layoutSegments = <T extends { value: number }>(
    items: T[],
    total: number,
    startY: number,
    height: number,
    gap: number,
    minimumHeight: number,
  ) => {
    if (!items.length) {
      return [] as Array<T & { y: number; height: number }>;
    }

    const usableHeight = height - gap * Math.max(items.length - 1, 0);
    const floor = Math.min(minimumHeight, usableHeight / items.length);
    const rawHeights = items.map((item) => (total > 0 ? usableHeight * (item.value / total) : usableHeight / items.length));
    const liftedHeights = rawHeights.map((value) => Math.max(value, floor));
    const scale = usableHeight / liftedHeights.reduce((sum, value) => sum + value, 0);
    const normalizedHeights = liftedHeights.map((value) => value * scale);

    let cursor = startY;
    return items.map((item, index) => {
      const segmentHeight = index === items.length - 1 ? startY + height - cursor : normalizedHeights[index];
      const laidOut = { ...item, y: cursor, height: segmentHeight };
      cursor += segmentHeight + gap;
      return laidOut;
    });
  };

  const ribbonPath = (x1: number, x2: number, y1Top: number, y1Bottom: number, y2Top: number, y2Bottom: number) => {
    const curve = Math.max((x2 - x1) * 0.42, 42);
    return [
      `M ${x1} ${y1Top}`,
      `C ${x1 + curve} ${y1Top}, ${x2 - curve} ${y2Top}, ${x2} ${y2Top}`,
      `L ${x2} ${y2Bottom}`,
      `C ${x2 - curve} ${y2Bottom}, ${x1 + curve} ${y1Bottom}, ${x1} ${y1Bottom}`,
      "Z",
    ].join(" ");
  };

  const viewWidth = 1180;
  const viewHeight = 470;
  const top = 58;
  const flowHeight = 336;
  const nodeWidth = 18;
  const sourceX = 72;
  const splitX = 336;
  const groupX = 622;
  const leafX = 904;

  const splitSlices = layoutSegments(splitNodes, metrics.total, top, flowHeight, 18, 34);
  const sourceSlices = layoutSegments(splitNodes, metrics.total, top, flowHeight, 0, 0);
  const ownSplit = splitSlices.find((node) => node.key === "own");

  const groupSegments = ownSplit
    ? layoutSegments(groups, metrics.own || 1, ownSplit.y, ownSplit.height, 16, 32)
    : [];
  const ownSlices = ownSplit
    ? layoutSegments(groups, metrics.own || 1, ownSplit.y, ownSplit.height, 0, 0)
    : [];

  const leafSegments = groupSegments.flatMap((group) =>
    layoutSegments(group.items, Math.max(group.value, 1), group.y, group.height, 10, 24),
  );
  const groupSourceSlices = groupSegments.flatMap((group) =>
    layoutSegments(group.items, Math.max(group.value, 1), group.y, group.height, 0, 0),
  );

  const splitCards = splitSlices
    .map(
      (node) => `
        <article class="cashflow-node cashflow-node-split">
          <div class="cashflow-node-topline">
            <span class="cashflow-node-label"><i style="background:${node.color}"></i>${escapeHtml(node.label)}</span>
            <strong>${escapeHtml(formatEuro(node.value))}</strong>
          </div>
          <div class="cashflow-meter"><span style="width:${Math.max((node.value / metrics.total) * 100, 6)}%; background:${node.color}"></span></div>
          <small>${formatPercent((node.value / metrics.total) * 100)} du total selectionne</small>
        </article>
      `,
    )
    .join("");

  const topOwnCategories = categories.length
    ? categories
        .map(
          (item) => `
            <article class="cashflow-list-card">
              <div class="cashflow-list-head">
                <span class="cashflow-list-label"><i style="background:${item.color}"></i>${escapeHtml(item.category)}</span>
                <strong>${escapeHtml(formatEuro(item.total))}</strong>
              </div>
              <div class="cashflow-meter"><span style="width:${Math.max((item.total / Math.max(metrics.own, 1)) * 100, 8)}%; background:${item.color}"></span></div>
              <small>${formatPercent((item.total / Math.max(metrics.own, 1)) * 100)} de la charge perso</small>
            </article>
          `,
        )
        .join("")
    : `<div class="empty-state">Aucune categorie perso a detailler.</div>`;

  const splitLinks = splitSlices
    .map((target, index) => {
      const source = sourceSlices[index];
      return `<path class="cashflow-link" d="${ribbonPath(
        sourceX + nodeWidth,
        splitX,
        source.y,
        source.y + source.height,
        target.y,
        target.y + target.height,
      )}" fill="${target.key === "parents" ? "rgba(60, 174, 123, 0.24)" : "rgba(89, 126, 247, 0.24)"}" />`;
    })
    .join("");

  const groupLinks = groupSegments
    .map((target, index) => {
      const source = ownSlices[index];
      return `<path class="cashflow-link" d="${ribbonPath(
        splitX + nodeWidth,
        groupX,
        source.y,
        source.y + source.height,
        target.y,
        target.y + target.height,
      )}" fill="${target.color}26" />`;
    })
    .join("");

  const leafLinks = leafSegments
    .map((target) => {
      const source = groupSourceSlices.find((item) => item.category === target.category);
      if (!source) {
        return "";
      }

      return `<path class="cashflow-link" d="${ribbonPath(
        groupX + nodeWidth,
        leafX,
        source.y,
        source.y + source.height,
        target.y,
        target.y + target.height,
      )}" fill="${target.color}24" />`;
    })
    .join("");

  const splitNodeRects = splitSlices
    .map(
      (node) => `
        <rect x="${splitX}" y="${node.y}" width="${nodeWidth}" height="${node.height}" rx="7" fill="${node.color}" />
        <text x="${splitX + nodeWidth + 14}" y="${node.y + node.height / 2 - 4}" class="cashflow-node-title">${escapeHtml(node.label)}</text>
        <text x="${splitX + nodeWidth + 14}" y="${node.y + node.height / 2 + 18}" class="cashflow-node-subtitle">${escapeHtml(formatEuro(node.value))}</text>
      `,
    )
    .join("");

  const groupNodeRects = groupSegments
    .map(
      (group) => `
        <rect x="${groupX}" y="${group.y}" width="${nodeWidth}" height="${group.height}" rx="7" fill="${group.color}" />
        <text x="${groupX + nodeWidth + 14}" y="${group.y + group.height / 2 - 4}" class="cashflow-node-title">${escapeHtml(group.label)}</text>
        <text x="${groupX + nodeWidth + 14}" y="${group.y + group.height / 2 + 18}" class="cashflow-node-subtitle">${escapeHtml(formatEuro(group.value))}</text>
      `,
    )
    .join("");

  const leafNodeRects = leafSegments
    .map(
      (item) => `
        <rect x="${leafX}" y="${item.y}" width="${nodeWidth}" height="${item.height}" rx="7" fill="${item.color}" />
        <text x="${leafX + nodeWidth + 14}" y="${item.y + item.height / 2 + 6}" class="cashflow-leaf-title">${escapeHtml(item.category)}</text>
      `,
    )
    .join("");

  return `
    <div class="cashflow-board">
      <div class="cashflow-header-row">
        <div>
          <p class="eyebrow">Cash flow</p>
          <h3>Lecture claire du flux budgetaire</h3>
        </div>
        <div class="cashflow-toolbar">
          <span class="cashflow-chip">Sankey budgetaire</span>
          <span class="cashflow-chip">${metrics.monthsCount} periodes</span>
        </div>
      </div>
      <div class="cashflow-summary-strip">
        <article class="cashflow-summary-card">
          <span>Total observe</span>
          <strong>${escapeHtml(formatEuro(metrics.total))}</strong>
          <small>100% de la selection</small>
        </article>
        <article class="cashflow-summary-card">
          <span>A ta charge</span>
          <strong>${escapeHtml(formatEuro(metrics.own))}</strong>
          <small>${formatPercent((metrics.own / metrics.total) * 100)} du total</small>
        </article>
        <article class="cashflow-summary-card">
          <span>Parents</span>
          <strong>${escapeHtml(formatEuro(metrics.reimbursed))}</strong>
          <small>${formatPercent((metrics.reimbursed / metrics.total) * 100)} du total</small>
        </article>
      </div>
      <div class="cashflow-sankey-shell">
        <svg class="cashflow-svg" viewBox="0 0 ${viewWidth} ${viewHeight}" role="img" aria-label="Sankey budgetaire du total vers les postes de depense">
          <rect x="0" y="0" width="${viewWidth}" height="${viewHeight}" rx="28" fill="rgba(255,255,255,0.48)" />
          <text x="${sourceX}" y="34" class="cashflow-column-label">Selection</text>
          <text x="${splitX}" y="34" class="cashflow-column-label">Split</text>
          <text x="${groupX}" y="34" class="cashflow-column-label">Blocs</text>
          <text x="${leafX}" y="34" class="cashflow-column-label">Categories</text>

          <rect x="${sourceX}" y="${top}" width="${nodeWidth}" height="${flowHeight}" rx="7" fill="#1f2430" />
          <text x="${sourceX + nodeWidth + 16}" y="${top + flowHeight / 2 - 8}" class="cashflow-source-title">Total selectionne</text>
          <text x="${sourceX + nodeWidth + 16}" y="${top + flowHeight / 2 + 18}" class="cashflow-source-value">${escapeHtml(formatEuro(metrics.total))}</text>

          ${splitLinks}
          ${groupLinks}
          ${leafLinks}
          ${splitNodeRects}
          ${groupNodeRects}
          ${leafNodeRects}
        </svg>
      </div>
      <div class="cashflow-side-grid">
        <section class="cashflow-column">
          <div class="cashflow-column-head">
            <strong>Lecture globale</strong>
            <span>${splitNodes.length} blocs</span>
          </div>
          <div class="cashflow-list">${splitCards}</div>
        </section>
        <section class="cashflow-column">
          <div class="cashflow-column-head">
            <strong>Postes les plus lourds</strong>
            <span>${categories.length} categories</span>
          </div>
          <div class="cashflow-list">${topOwnCategories}</div>
        </section>
      </div>
    </div>
  `;
}

export async function renderDashboardPage(): Promise<HTMLElement> {
  const allTransactions = (await fetchAllTransactions()).slice().sort(compareTransactions);
  const availableYears = Array.from(new Set(allTransactions.map((transaction) => transaction.year))).sort(
    (left, right) => right - left,
  );
  const availableCategories = Array.from(
    new Set(allTransactions.map((transaction) => transaction.category)),
  ).sort((left, right) => left.localeCompare(right, "fr"));

  const state: DashboardState = {
    search: "",
    year: "all",
    month: "all",
    category: "all",
    reimbursed: "all",
  };

  const section = document.createElement("section");
  section.className = "page-grid dashboard-page";
  section.innerHTML = `
    <section class="dashboard-hero">
      <div class="hero-copy-block">
        <p class="eyebrow">Budget cockpit</p>
        <h1>Une lecture plus riche, plus filtrable et plus nette de tes depenses.</h1>
        <p class="hero-copy">
          Le tableau central combine le mix mensuel, la part remboursee par les parents, les categories
          dominantes et les periodes qui tirent le budget vers le haut.
        </p>
        <div class="filter-tag-row" id="dashboardTagRow"></div>
      </div>
      <div class="hero-aside">
        <article class="hero-stat">
          <span class="hero-stat-label">Perimetre courant</span>
          <strong id="heroScopeValue">Toutes les periodes</strong>
          <small id="heroScopeDetail">Analyse complete</small>
        </article>
        <article class="hero-stat">
          <span class="hero-stat-label">Selection</span>
          <strong id="heroSelectionValue">0 ligne</strong>
          <small id="heroSelectionDetail">0 categorie</small>
        </article>
      </div>
    </section>

    <section class="panel filter-panel">
      <div class="panel-heading compact-heading">
        <div>
          <p class="eyebrow">Filtres</p>
          <h2>Piloter l'analyse</h2>
        </div>
        <button class="ghost-button" id="resetDashboardFilters" type="button">Reinitialiser</button>
      </div>
      <div class="filter-grid">
        <label class="field field-search">
          <span>Recherche</span>
          <input id="dashboardSearch" type="search" placeholder="Description, categorie, periode" />
        </label>
        <label class="field">
          <span>Annee</span>
          <select id="dashboardYear">
            ${buildSelectOptions(
              [
                { value: "all", label: "Toutes" },
                ...availableYears.map((year) => ({ value: String(year), label: String(year) })),
              ],
              state.year,
            )}
          </select>
        </label>
        <label class="field">
          <span>Mois</span>
          <select id="dashboardMonth">
            ${buildSelectOptions(
              [
                { value: "all", label: "Tous" },
                ...MONTH_LABELS.map((label, index) => ({ value: String(index + 1), label })),
              ],
              state.month,
            )}
          </select>
        </label>
        <label class="field">
          <span>Categorie</span>
          <select id="dashboardCategory">
            ${buildSelectOptions(
              [
                { value: "all", label: "Toutes" },
                ...availableCategories.map((category) => ({ value: category, label: category })),
              ],
              state.category,
            )}
          </select>
        </label>
        <label class="field">
          <span>Prise en charge</span>
          <select id="dashboardReimbursed">
            ${buildSelectOptions(
              [
                { value: "all", label: "Tout" },
                { value: "no", label: "A ta charge" },
                { value: "yes", label: "Parents" },
              ],
              state.reimbursed,
            )}
          </select>
        </label>
      </div>
    </section>

    <section class="kpi-grid" id="dashboardKpis"></section>

    <section class="analytics-layout">
      <article class="panel panel-large panel-span-full">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Vision centrale</p>
            <h2>Carte des flux budgetaires</h2>
          </div>
          <div class="muted" id="mixChartDetail">0 periode</div>
        </div>
        <div class="cashflow-stage" id="cashflowStage">
          <div class="empty-state">Chargement du cash flow...</div>
        </div>
      </article>

      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Categories</p>
            <h2>Poids relatif</h2>
          </div>
          <div class="muted" id="categoryChartDetail">0 categories</div>
        </div>
        <div class="chart-stage chart-stage-compact">
          <p class="chart-empty" id="categoryShareEmpty" hidden>Aucune categorie a afficher.</p>
          <canvas id="categoryShareChart"></canvas>
        </div>
        <div class="chart-legend-list" id="categoryLegend"></div>
      </article>

      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Classement</p>
            <h2>Top categories</h2>
          </div>
          <div class="muted">Top 6</div>
        </div>
        <div class="chart-stage chart-stage-compact">
          <p class="chart-empty" id="topCategoryEmpty" hidden>Pas assez de donnees pour classer les categories.</p>
          <canvas id="topCategoryChart"></canvas>
        </div>
      </article>

      <article class="panel panel-large panel-span-full">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Trajectoire</p>
            <h2>Cumul total et charge personnelle</h2>
          </div>
          <div class="muted" id="cumulativeChartDetail">Lecture en continu</div>
        </div>
        <div class="chart-stage">
          <p class="chart-empty" id="cumulativeEmpty" hidden>Aucun cumul disponible sur cette selection.</p>
          <canvas id="cumulativeChart"></canvas>
        </div>
      </article>
    </section>

    <section class="dashboard-bottom">
      <article class="panel flow-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Budget flow</p>
            <h2>Ou part l'argent</h2>
          </div>
          <div class="muted" id="flowPanelDetail">Vue concentree</div>
        </div>
        <div class="flow-list" id="flowList"></div>
      </article>

      <article class="panel insight-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Lecture rapide</p>
            <h2>Points d'attention</h2>
          </div>
        </div>
        <div class="insights-grid insights-grid-dual" id="insightCards"></div>
      </article>
    </section>
  `;

  const searchInput = section.querySelector<HTMLInputElement>("#dashboardSearch");
  const yearSelect = section.querySelector<HTMLSelectElement>("#dashboardYear");
  const monthSelect = section.querySelector<HTMLSelectElement>("#dashboardMonth");
  const categorySelect = section.querySelector<HTMLSelectElement>("#dashboardCategory");
  const reimbursedSelect = section.querySelector<HTMLSelectElement>("#dashboardReimbursed");
  const resetButton = section.querySelector<HTMLButtonElement>("#resetDashboardFilters");
  const tagRow = section.querySelector<HTMLDivElement>("#dashboardTagRow");
  const heroScopeValue = section.querySelector<HTMLElement>("#heroScopeValue");
  const heroScopeDetail = section.querySelector<HTMLElement>("#heroScopeDetail");
  const heroSelectionValue = section.querySelector<HTMLElement>("#heroSelectionValue");
  const heroSelectionDetail = section.querySelector<HTMLElement>("#heroSelectionDetail");
  const kpiGrid = section.querySelector<HTMLElement>("#dashboardKpis");
  const mixChartDetail = section.querySelector<HTMLElement>("#mixChartDetail");
  const categoryChartDetail = section.querySelector<HTMLElement>("#categoryChartDetail");
  const cumulativeChartDetail = section.querySelector<HTMLElement>("#cumulativeChartDetail");
  const flowPanelDetail = section.querySelector<HTMLElement>("#flowPanelDetail");
  const flowList = section.querySelector<HTMLElement>("#flowList");
  const insightCards = section.querySelector<HTMLElement>("#insightCards");
  const cashflowStage = section.querySelector<HTMLElement>("#cashflowStage");
  const categoryShareCanvas = section.querySelector<HTMLCanvasElement>("#categoryShareChart");
  const categoryLegend = section.querySelector<HTMLElement>("#categoryLegend");
  const topCategoryCanvas = section.querySelector<HTMLCanvasElement>("#topCategoryChart");
  const cumulativeCanvas = section.querySelector<HTMLCanvasElement>("#cumulativeChart");
  const categoryShareEmpty = section.querySelector<HTMLParagraphElement>("#categoryShareEmpty");
  const topCategoryEmpty = section.querySelector<HTMLParagraphElement>("#topCategoryEmpty");
  const cumulativeEmpty = section.querySelector<HTMLParagraphElement>("#cumulativeEmpty");

  if (
    !searchInput ||
    !yearSelect ||
    !monthSelect ||
    !categorySelect ||
    !reimbursedSelect ||
    !resetButton ||
    !tagRow ||
    !heroScopeValue ||
    !heroScopeDetail ||
    !heroSelectionValue ||
    !heroSelectionDetail ||
    !kpiGrid ||
    !mixChartDetail ||
    !categoryChartDetail ||
    !cumulativeChartDetail ||
    !flowPanelDetail ||
    !flowList ||
    !insightCards ||
    !cashflowStage ||
    !categoryShareCanvas ||
    !categoryLegend ||
    !topCategoryCanvas ||
    !cumulativeCanvas ||
    !categoryShareEmpty ||
    !topCategoryEmpty ||
    !cumulativeEmpty
  ) {
    return section;
  }

  let categoryShareChart: Chart | null = null;
  let topCategoryChart: Chart | null = null;
  let cumulativeChart: Chart | null = null;

  const refreshDashboard = () => {
    const filteredTransactions = filterTransactions(allTransactions, state);
    const monthlyBuckets = deriveMonthlyBuckets(filteredTransactions);
    const categorySummary = deriveCategorySummary(filteredTransactions);
    const ownCategorySummary = deriveCategorySummary(
      filteredTransactions.filter((transaction) => !transaction.reimbursement_to_parents),
    );
    const metrics = deriveMetrics(filteredTransactions, monthlyBuckets, categorySummary);
    const activeTags = createFilterTags(state);
    const hasMonthlyData = monthlyBuckets.length > 0;
    const hasCategoryData = categorySummary.length > 0;

    tagRow.innerHTML = activeTags.length
      ? activeTags.map((tag) => `<span class="filter-tag">${tag}</span>`).join("")
      : `<span class="filter-tag filter-tag-muted">Aucun filtre actif</span>`;

    heroScopeValue.textContent = hasMonthlyData
      ? `${monthlyBuckets[0].label} -> ${monthlyBuckets[monthlyBuckets.length - 1].label}`
      : "Aucune periode";
    heroScopeDetail.textContent = hasMonthlyData ? `${metrics.monthsCount} mois couverts` : "Ajuste les filtres";
    heroSelectionValue.textContent = `${metrics.transactionCount} ligne${metrics.transactionCount > 1 ? "s" : ""}`;
    heroSelectionDetail.textContent = `${categorySummary.length} categorie${categorySummary.length > 1 ? "s" : ""}`;

    kpiGrid.replaceChildren(
      buildKpiCard(
        "Total selectionne",
        formatEuro(metrics.total),
        `${metrics.transactionCount} transaction${metrics.transactionCount > 1 ? "s" : ""} dans la vue`,
        "orange",
      ),
      buildKpiCard(
        "A ta charge",
        formatEuro(metrics.own),
        `${formatEuro(metrics.avgMonthly)} par mois en moyenne`,
        "blue",
      ),
      buildKpiCard(
        "Parents",
        formatEuro(metrics.reimbursed),
        `${formatPercent(metrics.reimbursementRate)} du total`,
        "green",
      ),
      buildKpiCard(
        "Point haut",
        metrics.topMonthTotal > 0 ? formatEuro(metrics.topMonthTotal) : formatEuro(0),
        metrics.topMonth ?? "Aucune periode dominante",
        "rose",
      ),
    );

    mixChartDetail.textContent = `${metrics.monthsCount} periode${metrics.monthsCount > 1 ? "s" : ""}`;
    categoryChartDetail.textContent = `${categorySummary.length} categorie${categorySummary.length > 1 ? "s" : ""}`;
    cumulativeChartDetail.textContent = metrics.topCategory
      ? `${metrics.topCategory} domine avec ${formatEuro(metrics.topCategoryTotal)}`
      : "Aucune categorie dominante";
    flowPanelDetail.textContent = metrics.topMonth ? `Pic sur ${metrics.topMonth}` : "Selection vide";

    flowList.innerHTML = hasCategoryData
      ? categorySummary
          .slice(0, 6)
          .map(
            (item, index) => `
              <article class="flow-row">
                <div class="flow-row-head">
                  <div>
                    <strong>${item.category}</strong>
                    <p>${formatPercent(item.share)} de la selection</p>
                  </div>
                  <span>${formatEuro(item.total)}</span>
                </div>
                <div class="flow-track">
                  <span class="flow-bar" style="width: ${Math.max(item.share, 6)}%; background: ${getCategoryColor(item.category, index)};"></span>
                </div>
              </article>
            `,
          )
          .join("")
      : `<div class="empty-state">Aucune categorie a synthetiser avec ce filtrage.</div>`;

    categoryLegend.innerHTML = hasCategoryData
      ? categorySummary
          .slice(0, 6)
          .map(
            (item, index) => `
              <div class="chart-legend-item">
                <span class="chart-legend-swatch" style="background:${getCategoryColor(item.category, index)};"></span>
                <span class="chart-legend-label">${item.category}</span>
                <strong>${formatPercent(item.share)}</strong>
              </div>
            `,
          )
          .join("")
      : "";

    const latestMonth = monthlyBuckets[monthlyBuckets.length - 1];
    insightCards.innerHTML = `
      <article class="insight-card">
        <span class="badge badge-orange">Categorie forte</span>
        <strong>${metrics.topCategory ?? "Aucune"}</strong>
        <p>${metrics.topCategory ? `${formatEuro(metrics.topCategoryTotal)} sur la selection.` : "Ajuste les filtres pour retrouver une tendance."}</p>
      </article>
      <article class="insight-card">
        <span class="badge badge-green">Part remboursee</span>
        <strong>${formatPercent(metrics.reimbursementRate)}</strong>
        <p>${metrics.reimbursed > 0 ? `${formatEuro(metrics.reimbursed)} repris par les parents.` : "Aucun remboursement visible sur cette vue."}</p>
      </article>
      <article class="insight-card">
        <span class="badge badge-blue">Rythme recent</span>
        <strong>${latestMonth ? formatEuro(latestMonth.total) : formatEuro(0)}</strong>
        <p>${latestMonth ? `Derniere periode visible: ${latestMonth.label}.` : "Pas de periode recente a comparer."}</p>
      </article>
      <article class="insight-card">
        <span class="badge badge-rose">Pression budget</span>
        <strong>${metrics.topMonth ?? "Stable"}</strong>
        <p>${metrics.topMonth ? `Le plus haut point atteint ${formatEuro(metrics.topMonthTotal)}.` : "Le filtrage courant ne montre aucun pic."}</p>
      </article>
    `;

    categoryShareChart?.destroy();
    topCategoryChart?.destroy();
    cumulativeChart?.destroy();
    cashflowStage.innerHTML = buildCashflowMap(metrics, ownCategorySummary);
    toggleChartState(categoryShareCanvas, categoryShareEmpty, hasCategoryData);
    toggleChartState(topCategoryCanvas, topCategoryEmpty, hasCategoryData);
    toggleChartState(cumulativeCanvas, cumulativeEmpty, hasMonthlyData);
    if (hasMonthlyData) {
      const labels = monthlyBuckets.map((bucket) => bucket.shortLabel);
      const sharedTimeOptions = buildTimeChartOptions(monthlyBuckets);
      cumulativeChart = new Chart(cumulativeCanvas, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Cumul total",
              data: monthlyBuckets.map((bucket) => bucket.cumulative),
              borderColor: "#e47f37",
              backgroundColor: "rgba(228, 127, 55, 0.14)",
              tension: 0.28,
              fill: true,
            },
            {
              label: "Cumul a ta charge",
              data: monthlyBuckets.map((bucket) => bucket.ownCumulative),
              borderColor: "#1f2430",
              backgroundColor: "rgba(31, 36, 48, 0.04)",
              tension: 0.28,
              fill: false,
            },
          ],
        },
        options: {
          ...sharedTimeOptions,
          plugins: {
            ...sharedTimeOptions.plugins,
            tooltip: {
              callbacks: {
                title: (items) => monthlyBuckets[items[0]?.dataIndex ?? 0]?.label ?? "",
                label: (context) => `${context.dataset.label}: ${formatEuro(Number(context.raw))}`,
              },
            },
          },
        },
      });
    }

    if (hasCategoryData) {
      categoryShareChart = new Chart(categoryShareCanvas, {
        type: "doughnut",
        data: {
          labels: categorySummary.map((item) => item.category),
          datasets: [
            {
              data: categorySummary.map((item) => item.total),
              backgroundColor: categorySummary.map((item, index) => getCategoryColor(item.category, index)),
              borderWidth: 0,
              hoverOffset: 8,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => `${context.label}: ${formatEuro(Number(context.raw))}`,
              },
            },
          },
          layout: {
            padding: { top: 4, right: 4, bottom: 4, left: 4 },
          },
          cutout: "66%",
        },
      });

      topCategoryChart = new Chart(topCategoryCanvas, {
        type: "bar",
        data: {
          labels: categorySummary.slice(0, 6).map((item) => item.category),
          datasets: [
            {
              label: "Montant",
              data: categorySummary.slice(0, 6).map((item) => item.total),
              backgroundColor: categorySummary
                .slice(0, 6)
                .map((item, index) => getCategoryColor(item.category, index)),
              borderRadius: 12,
              borderSkipped: false,
            },
          ],
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => formatEuro(Number(context.raw)),
              },
            },
          },
          scales: {
            x: {
              grid: { color: "rgba(40, 52, 71, 0.08)" },
              ticks: {
                color: "#7b8594",
                callback: (value) => formatCompactEuro(Number(value)),
              },
            },
            y: {
              grid: { display: false },
              ticks: { color: "#4f5968" },
            },
          },
        },
      });
    }
  };

  const syncState = () => {
    state.search = searchInput.value;
    state.year = yearSelect.value;
    state.month = monthSelect.value;
    state.category = categorySelect.value;
    state.reimbursed = reimbursedSelect.value;
    refreshDashboard();
  };

  searchInput.addEventListener("input", syncState);
  yearSelect.addEventListener("change", syncState);
  monthSelect.addEventListener("change", syncState);
  categorySelect.addEventListener("change", syncState);
  reimbursedSelect.addEventListener("change", syncState);

  resetButton.addEventListener("click", () => {
    searchInput.value = "";
    yearSelect.value = "all";
    monthSelect.value = "all";
    categorySelect.value = "all";
    reimbursedSelect.value = "all";
    syncState();
  });

  queueMicrotask(() => {
    refreshDashboard();
    window.dispatchEvent(new Event("resize"));
  });
  return section;
}
