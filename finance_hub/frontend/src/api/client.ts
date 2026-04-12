export type KPIResponse = {
  total: number;
  reimbursed: number;
  own: number;
  avg_monthly: number;
  top_category: string | null;
  top_category_total: number;
  top_month: string | null;
  top_month_total: number;
  transaction_count: number;
  months_count: number;
};

export type BudgetTarget = {
  id: number;
  year: number;
  month: number;
  category: string;
  planned_amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BudgetPlanItem = {
  category: string;
  planned: number;
  actual: number;
  variance: number;
  variance_pct: number | null;
  status: string;
};

export type BudgetPlanResponse = {
  year: number;
  month: number;
  period: string;
  total_planned: number;
  total_actual: number;
  total_variance: number;
  items: BudgetPlanItem[];
};

export type CategoryBreakdownItem = {
  category: string;
  total: number;
  share: number;
};

export type MonthlyPoint = {
  year: number;
  month: number;
  period: string;
  total: number;
  cumulative: number;
  categories: Record<string, number>;
};

export type Transaction = {
  id: number;
  source_row: number | null;
  month_name: string | null;
  year: number;
  month: number;
  date: string | null;
  category: string;
  description: string | null;
  amount: number;
  reimbursement_to_parents: boolean;
  source: string;
  created_at: string;
};

export type TransactionListResponse = {
  items: Transaction[];
  total: number;
  limit: number;
  offset: number;
};

export type TransactionCreatePayload = {
  month_name?: string | null;
  year: number;
  month: number;
  date?: string | null;
  category: string;
  description?: string | null;
  amount: number;
  reimbursement_to_parents: boolean;
  source?: string;
};

export type User = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
};

export type Account = {
  id: number;
  label: string;
  institution: string;
  type: string;
  currency: string;
  balance: number | null;
  last4: string | null;
  is_active: boolean;
  notes: string | null;
};

export type Investment = {
  id: number;
  type: string;
  amount: number;
  date_label: string | null;
  current_value: number | null;
  notes: string | null;
};

export type Loan = {
  id: number;
  type: string;
  amount: number;
  rate: number | null;
  start_label: string | null;
  due_label: string | null;
  status: string;
  notes: string | null;
};

export type ImportSource = {
  id: number;
  label: string;
  provider: string;
  source_type: string;
  status: string;
  last_imported_at: string | null;
  storage_path: string | null;
  notes: string | null;
};

export type CsvPreviewRow = {
  month_name: string;
  year: number;
  category: string;
  description: string | null;
  amount: number;
  reimbursement_to_parents: boolean;
};

export type CsvPreviewResponse = {
  filename: string;
  detected_rows: number;
  categories: string[];
  preview: CsvPreviewRow[];
};

export type CsvImportResponse = {
  status: string;
  imported: number;
  filename: string;
  path: string;
};

export type NotesPreviewResponse = {
  detected_rows: number;
  categories: string[];
  preview: CsvPreviewRow[];
};

export type NotesImportResponse = {
  status: string;
  imported: number;
};

export type AuthResponse = {
  user: User;
};

type LocalDatabase = {
  version: number;
  user: User;
  transactions: Transaction[];
  budgets: BudgetTarget[];
  accounts: Account[];
  investments: Investment[];
  loans: Loan[];
  importSources: ImportSource[];
  reportSettings: {
    title: string;
    recentMonths: number;
    includeTransactions: boolean;
  };
  counters: {
    transaction: number;
    budget: number;
    account: number;
    investment: number;
    loan: number;
    importSource: number;
  };
};

type ParsedImportRow = {
  source_row: number;
  month_name: string;
  year: number;
  month: number;
  date: string | null;
  category: string;
  description: string | null;
  amount: number;
  reimbursement_to_parents: boolean;
  source: string;
};

const STORAGE_KEY = "finance-hub.local-db.v2";
const MONTH_ORDER: Record<string, number> = {
  Janvier: 1,
  Fevrier: 2,
  Mars: 3,
  Avril: 4,
  Mai: 5,
  Juin: 6,
  Juillet: 7,
  Aout: 8,
  Septembre: 9,
  Octobre: 10,
  Novembre: 11,
  Decembre: 12,
};
const MONTH_LABELS = Object.entries(MONTH_ORDER).reduce<Record<number, string>>((acc, [label, month]) => {
  acc[month] = label;
  return acc;
}, {});
const MONTH_NAME_TO_NUMBER: Record<string, number> = {
  janvier: 1,
  jan: 1,
  fevrier: 2,
  fevr: 2,
  fev: 2,
  mars: 3,
  avril: 4,
  avr: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  juil: 7,
  aout: 8,
  aou: 8,
  septembre: 9,
  sept: 9,
  octobre: 10,
  oct: 10,
  novembre: 11,
  nov: 11,
  decembre: 12,
  dec: 12,
};
const CATEGORIES = ["Alimentation", "Transport", "Loyer", "Loisirs", "Abonnements", "Sante", "Scolarite", "Ponctuel", "Autre"];
const CATEGORY_MAP: Record<string, string> = {
  food: "Alimentation",
  groceries: "Alimentation",
  carrefourcity: "Alimentation",
  train: "Transport",
  transport: "Transport",
  bus: "Transport",
  rent: "Loyer",
  housing: "Loyer",
  loisirs: "Loisirs",
  subscription: "Abonnements",
  health: "Sante",
  school: "Scolarite",
  ensam: "Scolarite",
  autoecole: "Transport",
  onetime: "Ponctuel",
  other: "Autre",
  autre: "Autre",
};
const COLUMN_ALIASES: Record<string, string[]> = {
  date: ["date", "operationdate", "transactiondate", "bookingdate"],
  month_name: ["monthname", "mois", "monthlabel"],
  year: ["year", "annee"],
  month: ["month", "monthnumber", "monthnum", "moisnumero", "moisnum"],
  raw_category: ["category", "categorie", "type", "poste", "rubrique"],
  description: ["description", "label", "libelle", "merchant", "details", "intitule"],
  amount: ["amount", "montant", "value", "valeur", "expense"],
  debit: ["debit", "debits", "withdrawal"],
  credit: ["credit", "credits", "deposit"],
  reimbursement: ["reimbursement", "reimbursed", "remboursement", "parents", "priseencharge"],
};
const TRUTHY_REIMBURSEMENT = new Set(["yes", "oui", "true", "1", "parents", "parent", "reimbursed", "rembourse"]);
const NOTE_REIMBURSED_TRUE = new Set(["oui", "yes", "true", "1", "parent", "parents", "rembourse", "remboursee", "reimbursed"]);
const NOTE_REIMBURSED_FALSE = new Set(["non", "no", "false", "0", "perso", "personnel", "a ma charge", "charge"]);
let dbPromise: Promise<LocalDatabase> | null = null;

function nowIso() {
  return new Date().toISOString();
}

function normalizeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeCategoryLabel(value: string) {
  const label = value.trim();
  if (!label) {
    return "Autre";
  }
  if (CATEGORIES.includes(label)) {
    return label;
  }
  return CATEGORY_MAP[normalizeText(label)] ?? "Autre";
}

function formatPeriod(year: number, month: number, monthName?: string | null) {
  return `${monthName && monthName.trim() ? monthName : MONTH_LABELS[month] ?? String(month)} ${year}`;
}

function compareTransactionsAsc(left: Transaction, right: Transaction) {
  return (left.date ?? "").localeCompare(right.date ?? "") || left.year - right.year || left.month - right.month || left.id - right.id;
}

function compareTransactionsDesc(left: Transaction, right: Transaction) {
  return compareTransactionsAsc(right, left);
}

function parseNumericValue(value: string) {
  const cleaned = value
    .replace(/\u00a0/g, "")
    .replace(/€/g, "")
    .replace(/EUR/gi, "")
    .replace(/\s+/g, "")
    .replace(",", ".")
    .trim();
  if (!cleaned) {
    return null;
  }
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function saveDatabase(db: LocalDatabase) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function splitCsvLine(line: string, delimiter: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      values.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function parseDelimitedText(text: string) {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    throw new Error("CSV vide.");
  }

  const sample = lines[0];
  const delimiter = sample.includes(";") ? ";" : sample.includes("\t") ? "\t" : ",";
  return lines.map((line) => splitCsvLine(line, delimiter));
}

function findColumn(headers: string[], target: string) {
  const aliases = COLUMN_ALIASES[target];
  return headers.find((header) => aliases.includes(normalizeText(header))) ?? null;
}

function parseDateToken(token: string) {
  const trimmed = token.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed) || /^\d{4}\/\d{2}\/\d{2}$/.test(trimmed)) {
    const normalized = trimmed.replace(/\//g, "-");
    const date = new Date(`${normalized}T12:00:00`);
    return Number.isNaN(date.getTime()) ? null : normalized;
  }

  const frMatch = trimmed.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (frMatch) {
    const [, day, month, year] = frMatch;
    return `${year}-${month}-${day}`;
  }

  return null;
}

function parsePeriodToken(value: string) {
  const exactDate = parseDateToken(value);
  if (exactDate) {
    const [year, month] = exactDate.split("-").map(Number);
    return { year, month, month_name: MONTH_LABELS[month], date: exactDate };
  }

  const compact = value.trim();
  const yearMonth = compact.match(/^(\d{4})[-/](\d{2})$/);
  if (yearMonth) {
    const year = Number(yearMonth[1]);
    const month = Number(yearMonth[2]);
    return { year, month, month_name: MONTH_LABELS[month], date: null };
  }

  const normalized = value
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const named = normalized.match(/^([a-z]+)\s+(\d{4})$/);
  if (named) {
    const month = MONTH_NAME_TO_NUMBER[named[1]];
    if (month) {
      const year = Number(named[2]);
      return { year, month, month_name: MONTH_LABELS[month], date: null };
    }
  }

  throw new Error("Format de periode invalide. Utilise 2026-04-08, 08/04/2026, 2026-04 ou Avril 2026.");
}

function parseReimbursedFlag(value: string) {
  const normalized = value
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (NOTE_REIMBURSED_TRUE.has(normalized)) {
    return true;
  }
  if (NOTE_REIMBURSED_FALSE.has(normalized)) {
    return false;
  }
  return null;
}

function parseNotesContent(content: string): ParsedImportRow[] {
  const rows: ParsedImportRow[] = [];
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length === 0) {
    throw new Error("Aucune note detectee.");
  }

  lines.forEach((line, index) => {
    const cleaned = line.trim().replace(/^[-*•]\s*/, "");
    const parts = (cleaned.includes("|") ? cleaned.split("|") : cleaned.includes(";") ? cleaned.split(";") : cleaned.split(/\t+/))
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length < 4) {
      throw new Error(`Ligne ${index + 1}: format invalide. Utilise 'date | categorie | description | montant | perso/parents'.`);
    }

    let reimbursed = false;
    const maybeFlag = parseReimbursedFlag(parts[parts.length - 1]);
    let workingParts = parts.slice();
    if (maybeFlag !== null) {
      reimbursed = maybeFlag;
      workingParts = workingParts.slice(0, -1);
    }

    const amountIndex = [...workingParts.keys()].reverse().find((position) => parseNumericValue(workingParts[position]) !== null);
    if (amountIndex === undefined) {
      throw new Error(`Ligne ${index + 1}: montant introuvable.`);
    }

    const amount = parseNumericValue(workingParts[amountIndex]);
    if (amount === null || amount <= 0) {
      throw new Error(`Ligne ${index + 1}: montant invalide.`);
    }

    const remaining = workingParts.filter((_, position) => position !== amountIndex);
    if (remaining.length < 3) {
      throw new Error(`Ligne ${index + 1}: il faut une periode, une categorie et une description.`);
    }

    const period = parsePeriodToken(remaining[0]);
    rows.push({
      source_row: index + 1,
      month_name: period.month_name,
      year: period.year,
      month: period.month,
      date: period.date,
      category: normalizeCategoryLabel(remaining[1]),
      description: remaining.slice(2).join(" | ").trim() || null,
      amount,
      reimbursement_to_parents: reimbursed,
      source: "note_capture",
    });
  });

  return rows;
}

function rowsToRecords(matrix: string[][]) {
  if (matrix.length < 2) {
    throw new Error("CSV non reconnu.");
  }

  const headers = matrix[0];
  return matrix.slice(1).map((row) =>
    headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = row[index] ?? "";
      return acc;
    }, {}),
  );
}

function parseFlexibleCsv(records: Record<string, string>[]) {
  const headers = Object.keys(records[0] ?? {});
  const dateCol = findColumn(headers, "date");
  const monthNameCol = findColumn(headers, "month_name");
  const yearCol = findColumn(headers, "year");
  const monthCol = findColumn(headers, "month");
  const categoryCol = findColumn(headers, "raw_category");
  const descriptionCol = findColumn(headers, "description");
  const amountCol = findColumn(headers, "amount");
  const debitCol = findColumn(headers, "debit");
  const creditCol = findColumn(headers, "credit");
  const reimbursementCol = findColumn(headers, "reimbursement");

  if (!categoryCol || !descriptionCol || (!amountCol && !debitCol && !creditCol)) {
    throw new Error("Unsupported CSV format");
  }

  const rows: ParsedImportRow[] = [];
  records.forEach((record, index) => {
    const parsedDate = dateCol ? parseDateToken(record[dateCol] ?? "") : null;
    const dateParts = parsedDate ? parsedDate.split("-").map(Number) : null;
    const year = yearCol ? Number(record[yearCol]) : dateParts?.[0] ?? NaN;
    const month = monthCol
      ? Number(record[monthCol])
      : monthNameCol
        ? MONTH_ORDER[record[monthNameCol].trim() as keyof typeof MONTH_ORDER] ?? NaN
        : dateParts?.[1] ?? NaN;

    const amount = amountCol
      ? parseNumericValue(record[amountCol] ?? "")
      : Math.abs(parseNumericValue(record[debitCol ?? ""] ?? "") ?? parseNumericValue(record[creditCol ?? ""] ?? "") ?? NaN);

    if (!Number.isFinite(year) || !Number.isFinite(month) || amount === null || amount <= 0) {
      return;
    }

    const reimbursement = reimbursementCol
      ? TRUTHY_REIMBURSEMENT.has((record[reimbursementCol] ?? "").trim().toLowerCase())
      : false;

    rows.push({
      source_row: index + 2,
      month_name: MONTH_LABELS[month] ?? String(month),
      year,
      month,
      date: parsedDate,
      category: normalizeCategoryLabel(record[categoryCol] ?? ""),
      description: (record[descriptionCol] ?? "").trim() || null,
      amount,
      reimbursement_to_parents: reimbursement,
      source: "csv_import",
    });
  });

  if (!rows.length) {
    throw new Error("Aucune depense exploitable detectee dans ce CSV.");
  }

  return rows.sort((left, right) => left.year - right.year || left.month - right.month || left.source_row - right.source_row);
}

function parseLegacyBudgetCsv(matrix: string[][]) {
  const rows: ParsedImportRow[] = [];
  matrix.slice(1).forEach((row, index) => {
    const month_name = row[1]?.trim();
    const year = Number(row[2]);
    const amount = parseNumericValue(row[5] ?? "");
    const month = MONTH_ORDER[month_name as keyof typeof MONTH_ORDER];
    if (!month_name || !Number.isFinite(year) || !month || amount === null || amount <= 0) {
      return;
    }

    rows.push({
      source_row: index + 2,
      month_name,
      year,
      month,
      date: null,
      category: normalizeCategoryLabel(row[3] ?? ""),
      description: row[4]?.trim() || null,
      amount,
      reimbursement_to_parents: (row[6] ?? "").trim().toLowerCase() === "yes",
      source: "csv_import",
    });
  });

  if (!rows.length) {
    throw new Error("Aucune depense exploitable detectee dans ce CSV.");
  }

  return rows;
}

function parseCsvContent(text: string) {
  const matrix = parseDelimitedText(text);
  try {
    return parseFlexibleCsv(rowsToRecords(matrix));
  } catch {
    return parseLegacyBudgetCsv(matrix);
  }
}

function csvEscape(value: string) {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function serializeTransactionsCsv(transactions: Transaction[]) {
  const lines = [
    "date,month_name,year,month,category,description,amount,reimbursement_to_parents,source",
    ...transactions.map((item) =>
      [
        item.date ?? "",
        item.month_name ?? "",
        item.year,
        item.month,
        csvEscape(item.category),
        csvEscape(item.description ?? ""),
        item.amount.toFixed(2),
        item.reimbursement_to_parents ? "yes" : "no",
        item.source,
      ].join(","),
    ),
  ];
  return lines.join("\n");
}

function buildMonthlyItems(transactions: Transaction[]) {
  const grouped = new Map<string, MonthlyPoint>();
  const sorted = transactions.slice().sort(compareTransactionsAsc);

  sorted.forEach((transaction) => {
    const key = `${transaction.year}-${String(transaction.month).padStart(2, "0")}`;
    const current = grouped.get(key) ?? {
      year: transaction.year,
      month: transaction.month,
      period: formatPeriod(transaction.year, transaction.month, transaction.month_name),
      total: 0,
      cumulative: 0,
      categories: {},
    };

    current.total += transaction.amount;
    current.categories[transaction.category] = Number(((current.categories[transaction.category] ?? 0) + transaction.amount).toFixed(2));
    grouped.set(key, current);
  });

  let cumulative = 0;
  return Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, item]) => {
      cumulative += item.total;
      return {
        ...item,
        total: Number(item.total.toFixed(2)),
        cumulative: Number(cumulative.toFixed(2)),
      };
    });
}

function buildCategoryItems(transactions: Transaction[]) {
  const total = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const buckets = new Map<string, number>();
  transactions.forEach((transaction) => {
    buckets.set(transaction.category, (buckets.get(transaction.category) ?? 0) + transaction.amount);
  });

  return Array.from(buckets.entries())
    .map(([category, amount]) => ({
      category,
      total: Number(amount.toFixed(2)),
      share: total > 0 ? Number(((amount / total) * 100).toFixed(2)) : 0,
    }))
    .sort((left, right) => right.total - left.total);
}

function buildKpiPayload(transactions: Transaction[]): KPIResponse {
  const monthly = buildMonthlyItems(transactions);
  const categories = buildCategoryItems(transactions);
  const total = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const reimbursed = transactions.reduce((sum, transaction) => sum + (transaction.reimbursement_to_parents ? transaction.amount : 0), 0);
  const topMonth = monthly.reduce<MonthlyPoint | null>((current, item) => (current === null || item.total > current.total ? item : current), null);
  const topCategory = categories[0] ?? null;

  return {
    total: Number(total.toFixed(2)),
    reimbursed: Number(reimbursed.toFixed(2)),
    own: Number((total - reimbursed).toFixed(2)),
    avg_monthly: monthly.length ? Number((total / monthly.length).toFixed(2)) : 0,
    top_category: topCategory?.category ?? null,
    top_category_total: topCategory?.total ?? 0,
    top_month: topMonth?.period ?? null,
    top_month_total: topMonth?.total ?? 0,
    transaction_count: transactions.length,
    months_count: monthly.length,
  };
}

function getReferencePeriod(transactions: Transaction[]) {
  const last = transactions.slice().sort(compareTransactionsDesc)[0];
  if (last) {
    return { year: last.year, month: last.month };
  }

  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function buildBudgetPlan(db: LocalDatabase, year?: number, month?: number): BudgetPlanResponse {
  const reference = year !== undefined && month !== undefined ? { year, month } : getReferencePeriod(db.transactions);
  const actualMap = new Map<string, number>();
  db.transactions
    .filter((transaction) => transaction.year === reference.year && transaction.month === reference.month)
    .forEach((transaction) => {
      actualMap.set(transaction.category, (actualMap.get(transaction.category) ?? 0) + transaction.amount);
    });

  const plannedItems = db.budgets.filter((item) => item.year === reference.year && item.month === reference.month);
  const plannedMap = new Map(plannedItems.map((item) => [item.category, item]));
  const categories = Array.from(new Set([...plannedMap.keys(), ...actualMap.keys()])).sort((left, right) => left.localeCompare(right, "fr"));
  const items = categories.map((category) => {
    const planned = plannedMap.get(category)?.planned_amount ?? 0;
    const actual = Number((actualMap.get(category) ?? 0).toFixed(2));
    const variance = Number((actual - planned).toFixed(2));
    const variancePct = planned > 0 ? Number(((variance / planned) * 100).toFixed(2)) : null;
    const status = planned <= 0 && actual > 0 ? "unplanned" : variance > 0 ? "over" : variance < 0 ? "under" : "on_track";
    return { category, planned, actual, variance, variance_pct: variancePct, status };
  });

  const totalPlanned = items.reduce((sum, item) => sum + item.planned, 0);
  const totalActual = items.reduce((sum, item) => sum + item.actual, 0);
  return {
    year: reference.year,
    month: reference.month,
    period: formatPeriod(reference.year, reference.month, MONTH_LABELS[reference.month]),
    total_planned: Number(totalPlanned.toFixed(2)),
    total_actual: Number(totalActual.toFixed(2)),
    total_variance: Number((totalActual - totalPlanned).toFixed(2)),
    items,
  };
}

function defaultImportSources() {
  const timestamp = nowIso();
  return [
    {
      id: 1,
      label: "Primary budget import",
      provider: "Finance Hub demo",
      source_type: "csv",
      status: "connected",
      last_imported_at: timestamp,
      storage_path: "demo-budget.csv",
      notes: "Jeu de donnees de demo charge au premier lancement local.",
    },
    {
      id: 2,
      label: "Quick notes capture",
      provider: "Saisie locale",
      source_type: "notes",
      status: "planned",
      last_imported_at: null,
      storage_path: null,
      notes: "Capture rapide ligne par ligne depuis l'app.",
    },
    {
      id: 3,
      label: "Broker or bank CSV",
      provider: "Fichier local",
      source_type: "csv",
      status: "planned",
      last_imported_at: null,
      storage_path: null,
      notes: "Import CSV local avec preview avant integration.",
    },
  ] satisfies ImportSource[];
}

async function buildInitialDatabase(): Promise<LocalDatabase> {
  const seedTransactions: Transaction[] = [];
  try {
    const response = await fetch("/demo-budget.csv");
    if (response.ok) {
      const rows = parseCsvContent(await response.text());
      rows.forEach((row, index) => {
        seedTransactions.push({
          id: index + 1,
          source_row: row.source_row,
          month_name: row.month_name,
          year: row.year,
          month: row.month,
          date: row.date,
          category: row.category,
          description: row.description,
          amount: row.amount,
          reimbursement_to_parents: row.reimbursement_to_parents,
          source: row.source,
          created_at: nowIso(),
        });
      });
    }
  } catch {
    // Ignore demo loading failures and start empty.
  }

  const user: User = {
    id: 1,
    email: "local@financehub.app",
    full_name: "Finance Hub Local",
    role: "owner",
    is_active: true,
    created_at: nowIso(),
  };

  const now = new Date();
  const budgets: BudgetTarget[] = [
    { id: 1, year: now.getFullYear(), month: now.getMonth() + 1, category: "Loyer", planned_amount: 650, notes: null, created_at: nowIso(), updated_at: nowIso() },
    { id: 2, year: now.getFullYear(), month: now.getMonth() + 1, category: "Alimentation", planned_amount: 260, notes: null, created_at: nowIso(), updated_at: nowIso() },
    { id: 3, year: now.getFullYear(), month: now.getMonth() + 1, category: "Transport", planned_amount: 120, notes: null, created_at: nowIso(), updated_at: nowIso() },
    { id: 4, year: now.getFullYear(), month: now.getMonth() + 1, category: "Loisirs", planned_amount: 90, notes: null, created_at: nowIso(), updated_at: nowIso() },
    { id: 5, year: now.getFullYear(), month: now.getMonth() + 1, category: "Abonnements", planned_amount: 35, notes: null, created_at: nowIso(), updated_at: nowIso() },
  ];

  return {
    version: 2,
    user,
    transactions: seedTransactions,
    budgets,
    accounts: [
      { id: 1, label: "Compte principal", institution: "Banque Campus", type: "checking", currency: "EUR", balance: 1260, last4: "2048", is_active: true, notes: "Compte courant utilise pour les depenses du quotidien." },
      { id: 2, label: "Epargne projet", institution: "Savings Space", type: "savings", currency: "EUR", balance: 1850, last4: null, is_active: true, notes: "Reserve pour semestre, depot de garantie ou demenagement." },
      { id: 3, label: "Trade Republic", institution: "Trade Republic", type: "broker", currency: "EUR", balance: 980, last4: null, is_active: true, notes: "Poche placements et versements long terme." },
    ],
    investments: [
      { id: 1, type: "ETF Monde", amount: 900, current_value: 980, date_label: "Mars 2026", notes: "Exemple de placement long terme verse chaque mois." },
    ],
    loans: [],
    importSources: defaultImportSources(),
    reportSettings: {
      title: "Finance Hub Report",
      recentMonths: 6,
      includeTransactions: false,
    },
    counters: {
      transaction: seedTransactions.length,
      budget: budgets.length,
      account: 3,
      investment: 1,
      loan: 0,
      importSource: 3,
    },
  };
}

async function ensureDb() {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = (async () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved) as LocalDatabase;
    }

    const initialDb = await buildInitialDatabase();
    saveDatabase(initialDb);
    return initialDb;
  })();

  return dbPromise;
}

async function mutateDb<T>(mutation: (db: LocalDatabase) => T | Promise<T>) {
  const db = await ensureDb();
  const result = await mutation(db);
  saveDatabase(db);
  return clone(result);
}

function nextId(db: LocalDatabase, key: keyof LocalDatabase["counters"]) {
  db.counters[key] += 1;
  return db.counters[key];
}

function touchImportSource(
  db: LocalDatabase,
  source: {
    label: string;
    provider: string;
    source_type: string;
    status: string;
    storage_path: string | null;
    notes: string;
  },
) {
  const existing = db.importSources.find((entry) => entry.label === source.label);
  const lastImportedAt = nowIso();
  if (existing) {
    existing.provider = source.provider;
    existing.source_type = source.source_type;
    existing.status = source.status;
    existing.storage_path = source.storage_path;
    existing.notes = source.notes;
    existing.last_imported_at = lastImportedAt;
    return;
  }

  db.importSources.unshift({
    id: nextId(db, "importSource"),
    label: source.label,
    provider: source.provider,
    source_type: source.source_type,
    status: source.status,
    storage_path: source.storage_path,
    notes: source.notes,
    last_imported_at: lastImportedAt,
  });
}

async function fileToText(file: File) {
  return file.text();
}

async function getTransactions() {
  const db = await ensureDb();
  return db.transactions.slice().sort(compareTransactionsDesc);
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function buildStaticReportSnapshot() {
  const db = await ensureDb();
  const transactions = db.transactions.slice().sort(compareTransactionsAsc);
  const monthly = buildMonthlyItems(transactions);
  const categories = buildCategoryItems(transactions);
  const kpis = buildKpiPayload(transactions);
  const budgetPlan = buildBudgetPlan(db);
  const recentMonths = Math.max(1, db.reportSettings.recentMonths);
  const snapshot = {
    generated_at: new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date()),
    title: db.reportSettings.title,
    kpis,
    monthly: { items: monthly.slice(-recentMonths) },
    categories: { items: categories.slice(0, 10) },
    budget_plan: budgetPlan,
    recent_transactions: db.reportSettings.includeTransactions
      ? transactions.slice(0, 12).map((item) => ({
          date: item.date,
          period: formatPeriod(item.year, item.month, item.month_name),
          category: item.category,
          description: item.description,
          amount: item.amount,
        }))
      : [],
  };

  const categoryRows = snapshot.categories.items
    .map((item) => `<tr><td>${item.category}</td><td>${item.total.toFixed(2)} EUR</td><td>${item.share.toFixed(1)}%</td></tr>`)
    .join("");
  const monthRows = snapshot.monthly.items
    .map((item) => `<tr><td>${item.period}</td><td>${item.total.toFixed(2)} EUR</td><td>${item.cumulative.toFixed(2)} EUR</td></tr>`)
    .join("");
  const budgetRows = snapshot.budget_plan.items
    .map((item) => `<tr><td>${item.category}</td><td>${item.planned.toFixed(2)} EUR</td><td>${item.actual.toFixed(2)} EUR</td><td>${item.variance.toFixed(2)} EUR</td><td>${item.status}</td></tr>`)
    .join("");

  const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${snapshot.title}</title>
    <style>
      body { font-family: "Manrope", sans-serif; margin: 0; padding: 32px; color: #1f2430; background: #f4ede0; }
      main { width: min(1080px, 100%); margin: 0 auto; }
      h1, h2 { font-family: "Sora", sans-serif; margin: 0; }
      .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); margin: 24px 0; }
      .card, .panel { background: rgba(255,255,255,0.88); border-radius: 24px; padding: 20px; border: 1px solid rgba(31,36,48,0.06); }
      .layout { display: grid; gap: 16px; grid-template-columns: 1fr 1fr; }
      table { width: 100%; border-collapse: collapse; }
      th, td { text-align: left; padding: 10px 0; border-bottom: 1px solid rgba(31,36,48,0.08); }
      th { font-size: 12px; text-transform: uppercase; color: #6f7786; letter-spacing: 0.08em; }
      @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <main>
      <p>Finance Hub Snapshot</p>
      <h1>${snapshot.title}</h1>
      <p>Genere le ${snapshot.generated_at} depuis ton espace local Finance Hub.</p>
      <section class="grid">
        <article class="card"><h2>Total suivi</h2><p>${snapshot.kpis.total.toFixed(2)} EUR</p></article>
        <article class="card"><h2>A ta charge</h2><p>${snapshot.kpis.own.toFixed(2)} EUR</p></article>
        <article class="card"><h2>Moyenne mensuelle</h2><p>${snapshot.kpis.avg_monthly.toFixed(2)} EUR</p></article>
        <article class="card"><h2>Categorie dominante</h2><p>${snapshot.kpis.top_category ?? "Aucune"}</p></article>
      </section>
      <section class="layout">
        <article class="panel">
          <h2>${snapshot.budget_plan.period}</h2>
          <table>
            <thead><tr><th>Categorie</th><th>Prevu</th><th>Reel</th><th>Ecart</th><th>Statut</th></tr></thead>
            <tbody>${budgetRows}</tbody>
          </table>
        </article>
        <article class="panel">
          <h2>Derniers mois</h2>
          <table>
            <thead><tr><th>Periode</th><th>Total</th><th>Cumul</th></tr></thead>
            <tbody>${monthRows}</tbody>
          </table>
        </article>
      </section>
      <section class="panel" style="margin-top:16px;">
        <h2>Categories</h2>
        <table>
          <thead><tr><th>Categorie</th><th>Total</th><th>Part</th></tr></thead>
          <tbody>${categoryRows}</tbody>
        </table>
      </section>
    </main>
  </body>
</html>`;

  return {
    title: snapshot.title,
    html,
    json: JSON.stringify(snapshot, null, 2),
  };
}

async function publishStaticReportToFolder() {
  const snapshot = await buildStaticReportSnapshot();
  if ("showDirectoryPicker" in window) {
    const directoryHandle = await (window as typeof window & { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker();
    const htmlHandle = await directoryHandle.getFileHandle("index.html", { create: true });
    const jsonHandle = await directoryHandle.getFileHandle("report.json", { create: true });
    const htmlWritable = await htmlHandle.createWritable();
    await htmlWritable.write(snapshot.html);
    await htmlWritable.close();
    const jsonWritable = await jsonHandle.createWritable();
    await jsonWritable.write(snapshot.json);
    await jsonWritable.close();
    return { mode: "folder" as const, title: snapshot.title };
  }

  const htmlBlob = new Blob([snapshot.html], { type: "text/html;charset=utf-8" });
  const jsonBlob = new Blob([snapshot.json], { type: "application/json;charset=utf-8" });
  downloadBlob("index.html", htmlBlob);
  downloadBlob("report.json", jsonBlob);
  return { mode: "download" as const, title: snapshot.title };
}

export async function fetchKpis() {
  return buildKpiPayload(await getTransactions());
}

export async function fetchCategories() {
  return { items: buildCategoryItems(await getTransactions()) };
}

export async function fetchMonthly() {
  return { items: buildMonthlyItems(await getTransactions()) };
}

export async function fetchBudgetPlan(year?: number, month?: number) {
  const db = await ensureDb();
  return clone(buildBudgetPlan(db, year, month));
}

export async function upsertBudgetTarget(payload: {
  year: number;
  month: number;
  category: string;
  planned_amount: number;
  notes?: string | null;
}) {
  return mutateDb((db) => {
    const existing = db.budgets.find(
      (item) => item.year === payload.year && item.month === payload.month && item.category === payload.category,
    );
    if (existing) {
      existing.planned_amount = payload.planned_amount;
      existing.notes = payload.notes ?? null;
      existing.updated_at = nowIso();
      return existing;
    }

    const created: BudgetTarget = {
      id: nextId(db, "budget"),
      year: payload.year,
      month: payload.month,
      category: payload.category,
      planned_amount: payload.planned_amount,
      notes: payload.notes ?? null,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    db.budgets.push(created);
    return created;
  });
}

export async function fetchTransactions(params: URLSearchParams) {
  const all = await getTransactions();
  const filtered = all.filter((transaction) => {
    const category = params.get("category");
    const year = params.get("year");
    const month = params.get("month");
    const reimbursed = params.get("reimbursed");
    const query = params.get("q")?.trim().toLowerCase() ?? "";
    if (category && transaction.category !== category) {
      return false;
    }
    if (year && transaction.year !== Number(year)) {
      return false;
    }
    if (month && transaction.month !== Number(month)) {
      return false;
    }
    if (reimbursed !== null && reimbursed !== String(transaction.reimbursement_to_parents)) {
      return false;
    }
    if (query) {
      const haystack = `${transaction.description ?? ""} ${transaction.category} ${transaction.month_name ?? ""} ${transaction.year}`.toLowerCase();
      return haystack.includes(query);
    }
    return true;
  });

  const limit = Number(params.get("limit") ?? 50);
  const offset = Number(params.get("offset") ?? 0);
  return {
    items: filtered.slice(offset, offset + limit),
    total: filtered.length,
    limit,
    offset,
  } satisfies TransactionListResponse;
}

export async function createTransaction(payload: TransactionCreatePayload) {
  return mutateDb((db) => {
    const created: Transaction = {
      id: nextId(db, "transaction"),
      source_row: null,
      month_name: payload.month_name ?? MONTH_LABELS[payload.month] ?? null,
      year: payload.year,
      month: payload.month,
      date: payload.date ?? null,
      category: payload.category,
      description: payload.description ?? null,
      amount: payload.amount,
      reimbursement_to_parents: payload.reimbursement_to_parents,
      source: payload.source ?? "manual",
      created_at: nowIso(),
    };
    db.transactions.push(created);
    return created;
  });
}

export async function fetchAllTransactions() {
  return getTransactions();
}

export async function fetchSession() {
  const db = await ensureDb();
  return { user: clone(db.user) } satisfies AuthResponse;
}

export async function login(_email: string, _password: string) {
  const db = await ensureDb();
  return { user: clone(db.user) } satisfies AuthResponse;
}

export async function logout() {
  return;
}

export async function fetchAccounts() {
  const db = await ensureDb();
  return clone(db.accounts);
}

export async function createAccount(payload: {
  label: string;
  institution: string;
  type: string;
  currency?: string;
  balance?: number | null;
  last4?: string | null;
  is_active?: boolean;
  notes?: string | null;
}) {
  return mutateDb((db) => {
    const account: Account = {
      id: nextId(db, "account"),
      label: payload.label,
      institution: payload.institution,
      type: payload.type,
      currency: payload.currency ?? "EUR",
      balance: payload.balance ?? null,
      last4: payload.last4 ?? null,
      is_active: payload.is_active ?? true,
      notes: payload.notes ?? null,
    };
    db.accounts.unshift(account);
    return account;
  });
}

export async function updateAccount(
  accountId: number,
  payload: {
    label: string;
    institution: string;
    type: string;
    currency?: string;
    balance?: number | null;
    last4?: string | null;
    is_active?: boolean;
    notes?: string | null;
  },
) {
  return mutateDb((db) => {
    const account = db.accounts.find((item) => item.id === accountId);
    if (!account) {
      throw new Error("Compte introuvable.");
    }

    account.label = payload.label;
    account.institution = payload.institution;
    account.type = payload.type;
    account.currency = payload.currency ?? "EUR";
    account.balance = payload.balance ?? null;
    account.last4 = payload.last4 ?? null;
    account.is_active = payload.is_active ?? true;
    account.notes = payload.notes ?? null;
    return account;
  });
}

export async function fetchInvestments() {
  const db = await ensureDb();
  return clone(db.investments);
}

export async function createInvestment(payload: {
  type: string;
  amount: number;
  date_label?: string | null;
  current_value?: number | null;
  notes?: string | null;
}) {
  return mutateDb((db) => {
    const investment: Investment = {
      id: nextId(db, "investment"),
      type: payload.type,
      amount: payload.amount,
      date_label: payload.date_label ?? null,
      current_value: payload.current_value ?? null,
      notes: payload.notes ?? null,
    };
    db.investments.unshift(investment);
    return investment;
  });
}

export async function updateInvestment(
  investmentId: number,
  payload: {
    type: string;
    amount: number;
    date_label?: string | null;
    current_value?: number | null;
    notes?: string | null;
  },
) {
  return mutateDb((db) => {
    const investment = db.investments.find((item) => item.id === investmentId);
    if (!investment) {
      throw new Error("Placement introuvable.");
    }

    investment.type = payload.type;
    investment.amount = payload.amount;
    investment.date_label = payload.date_label ?? null;
    investment.current_value = payload.current_value ?? null;
    investment.notes = payload.notes ?? null;
    return investment;
  });
}

export async function fetchLoans() {
  const db = await ensureDb();
  return clone(db.loans);
}

export async function createLoan(payload: {
  type: string;
  amount: number;
  rate?: number | null;
  start_label?: string | null;
  due_label?: string | null;
  status: string;
  notes?: string | null;
}) {
  return mutateDb((db) => {
    const loan: Loan = {
      id: nextId(db, "loan"),
      type: payload.type,
      amount: payload.amount,
      rate: payload.rate ?? null,
      start_label: payload.start_label ?? null,
      due_label: payload.due_label ?? null,
      status: payload.status,
      notes: payload.notes ?? null,
    };
    db.loans.unshift(loan);
    return loan;
  });
}

export async function updateLoan(
  loanId: number,
  payload: {
    type: string;
    amount: number;
    rate?: number | null;
    start_label?: string | null;
    due_label?: string | null;
    status: string;
    notes?: string | null;
  },
) {
  return mutateDb((db) => {
    const loan = db.loans.find((item) => item.id === loanId);
    if (!loan) {
      throw new Error("Pret introuvable.");
    }

    loan.type = payload.type;
    loan.amount = payload.amount;
    loan.rate = payload.rate ?? null;
    loan.start_label = payload.start_label ?? null;
    loan.due_label = payload.due_label ?? null;
    loan.status = payload.status;
    loan.notes = payload.notes ?? null;
    return loan;
  });
}

export async function fetchImportSources() {
  const db = await ensureDb();
  return clone(db.importSources);
}

export async function previewCsvUpload(file: File) {
  const rows = parseCsvContent(await fileToText(file));
  return {
    filename: file.name,
    detected_rows: rows.length,
    categories: Array.from(new Set(rows.map((row) => row.category))).sort((left, right) => left.localeCompare(right, "fr")),
    preview: rows.slice(0, 8).map((row) => ({
      month_name: row.month_name,
      year: row.year,
      category: row.category,
      description: row.description,
      amount: row.amount,
      reimbursement_to_parents: row.reimbursement_to_parents,
    })),
  } satisfies CsvPreviewResponse;
}

export async function importCsvUpload(file: File, replaceExisting = false) {
  const rows = parseCsvContent(await fileToText(file));
  return mutateDb((db) => {
    if (replaceExisting) {
      db.transactions = [];
      db.counters.transaction = 0;
    }

    rows.forEach((row) => {
      db.transactions.push({
        id: nextId(db, "transaction"),
        source_row: row.source_row,
        month_name: row.month_name,
        year: row.year,
        month: row.month,
        date: row.date,
        category: row.category,
        description: row.description,
        amount: row.amount,
        reimbursement_to_parents: row.reimbursement_to_parents,
        source: "csv_import",
        created_at: nowIso(),
      });
    });

    touchImportSource(db, {
      label: "Primary budget import",
      provider: "Fichier local",
      source_type: "csv",
      status: "connected",
      storage_path: file.name,
      notes: "Dernier CSV importe depuis le navigateur local.",
    });

    return {
      status: "ok",
      imported: rows.length,
      filename: file.name,
      path: `local-file:${file.name}`,
    } satisfies CsvImportResponse;
  });
}

export async function previewNotesCapture(content: string) {
  const rows = parseNotesContent(content);
  return {
    detected_rows: rows.length,
    categories: Array.from(new Set(rows.map((row) => row.category))).sort((left, right) => left.localeCompare(right, "fr")),
    preview: rows.slice(0, 8).map((row) => ({
      month_name: row.month_name,
      year: row.year,
      category: row.category,
      description: row.description,
      amount: row.amount,
      reimbursement_to_parents: row.reimbursement_to_parents,
    })),
  } satisfies NotesPreviewResponse;
}

export async function importNotesCapture(content: string, replaceExisting = false) {
  const rows = parseNotesContent(content);
  return mutateDb((db) => {
    if (replaceExisting) {
      db.transactions = [];
      db.counters.transaction = 0;
    }

    rows.forEach((row) => {
      db.transactions.push({
        id: nextId(db, "transaction"),
        source_row: row.source_row,
        month_name: row.month_name,
        year: row.year,
        month: row.month,
        date: row.date,
        category: row.category,
        description: row.description,
        amount: row.amount,
        reimbursement_to_parents: row.reimbursement_to_parents,
        source: "note_capture",
        created_at: nowIso(),
      });
    });

    touchImportSource(db, {
      label: "Quick notes capture",
      provider: "Saisie locale",
      source_type: "notes",
      status: "connected",
      storage_path: null,
      notes: "Dernier lot de notes importe depuis l'app locale.",
    });

    return {
      status: "ok",
      imported: rows.length,
    } satisfies NotesImportResponse;
  });
}

export async function downloadTransactionsExport() {
  const transactions = (await getTransactions()).slice().sort(compareTransactionsAsc);
  const filename = `finance-hub-report-${new Date().toISOString().replace(/[:]/g, "-").slice(0, 16)}.csv`;
  return {
    filename,
    blob: new Blob([serializeTransactionsCsv(transactions)], { type: "text/csv;charset=utf-8" }),
  };
}

export async function publishStaticReport() {
  return publishStaticReportToFolder();
}
