import { fetchAllTransactions, type Transaction } from "../api/client";

export const MONTH_LABELS = [
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

export type MonthlyBucket = {
  year: number;
  month: number;
  key: string;
  label: string;
  shortLabel: string;
  total: number;
  own: number;
  reimbursed: number;
  cumulative: number;
};

export type CategorySummary = {
  category: string;
  total: number;
  share: number;
};

export type DashboardMetrics = {
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

export function formatEuro(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCompactEuro(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value: number) {
  return `${new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  }).format(value)}%`;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function compareTransactionsAsc(left: Transaction, right: Transaction) {
  return left.year - right.year || left.month - right.month || left.id - right.id;
}

export function compareTransactionsDesc(left: Transaction, right: Transaction) {
  return right.year - left.year || right.month - left.month || right.id - left.id;
}

export function formatPeriodLabel(year: number, month: number, monthName?: string | null) {
  const label = monthName && monthName.trim().length > 0 ? monthName : MONTH_LABELS[month - 1] ?? String(month);
  return `${label} ${year}`;
}

export function formatShortPeriod(year: number, month: number) {
  const label = MONTH_LABELS[month - 1] ?? String(month);
  return `${label.slice(0, 3)} ${String(year).slice(-2)}`;
}

function getPeriodKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export async function loadTransactions() {
  return (await fetchAllTransactions()).slice().sort(compareTransactionsAsc);
}

export function buildMonthlyBuckets(transactions: Transaction[]): MonthlyBucket[] {
  const grouped = new Map<string, MonthlyBucket>();

  transactions.forEach((transaction) => {
    const key = getPeriodKey(transaction.year, transaction.month);
    const current = grouped.get(key) ?? {
      year: transaction.year,
      month: transaction.month,
      key,
      label: formatPeriodLabel(transaction.year, transaction.month, transaction.month_name),
      shortLabel: formatShortPeriod(transaction.year, transaction.month),
      total: 0,
      own: 0,
      reimbursed: 0,
      cumulative: 0,
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
  return Array.from(grouped.values())
    .sort((left, right) => left.key.localeCompare(right.key))
    .map((bucket) => {
      cumulative += bucket.total;
      return {
        ...bucket,
        cumulative: Number(cumulative.toFixed(2)),
      };
    });
}

export function buildCategorySummary(transactions: Transaction[]): CategorySummary[] {
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

export function buildMetrics(
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
