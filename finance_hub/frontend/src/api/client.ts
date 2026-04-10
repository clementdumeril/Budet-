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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function buildApiError(response: Response): Promise<Error> {
  try {
    const payload = (await response.json()) as { detail?: string };
    if (payload.detail) {
      return new Error(payload.detail);
    }
  } catch {
    // Ignore JSON decoding failures and fall back to status-based message.
  }
  return new Error(`API request failed: ${response.status}`);
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw await buildApiError(response);
  }
  return (await response.json()) as T;
}

async function postJson<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    throw await buildApiError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export function fetchKpis() {
  return getJson<KPIResponse>("/api/analytics/kpis");
}

export function fetchCategories() {
  return getJson<{ items: CategoryBreakdownItem[] }>("/api/analytics/categories");
}

export function fetchMonthly() {
  return getJson<{ items: MonthlyPoint[] }>("/api/analytics/monthly");
}

export function fetchBudgetPlan(year?: number, month?: number) {
  const params = new URLSearchParams();
  if (year !== undefined) {
    params.set("year", String(year));
  }
  if (month !== undefined) {
    params.set("month", String(month));
  }
  const query = params.toString();
  return getJson<BudgetPlanResponse>(`/api/budget-plan${query ? `?${query}` : ""}`);
}

export function upsertBudgetTarget(payload: {
  year: number;
  month: number;
  category: string;
  planned_amount: number;
  notes?: string | null;
}) {
  return postJson<BudgetTarget>("/api/budgets", payload);
}

export function fetchTransactions(params: URLSearchParams) {
  const query = params.toString();
  return getJson<TransactionListResponse>(`/api/transactions${query ? `?${query}` : ""}`);
}

export function createTransaction(payload: TransactionCreatePayload) {
  return postJson<Transaction>("/api/transactions", payload);
}

export async function fetchAllTransactions() {
  const limit = 500;
  let offset = 0;
  let total = 0;
  const items: Transaction[] = [];

  do {
    const response = await fetchTransactions(
      new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      }),
    );
    total = response.total;
    items.push(...response.items);
    offset += response.items.length;
    if (response.items.length === 0) {
      break;
    }
  } while (offset < total);

  return items;
}

export function fetchSession() {
  return getJson<AuthResponse>("/api/auth/me");
}

export function fetchAccounts() {
  return getJson<Account[]>("/api/accounts");
}

export function fetchInvestments() {
  return getJson<Investment[]>("/api/investments");
}

export function fetchImportSources() {
  return getJson<ImportSource[]>("/api/import-sources");
}

async function encodeFileToBase64(file: File) {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

export async function previewCsvUpload(file: File) {
  return postJson<CsvPreviewResponse>("/api/import-csv/preview", {
    filename: file.name,
    content_base64: await encodeFileToBase64(file),
    replace_existing: false,
  });
}

export async function importCsvUpload(file: File, replaceExisting = false) {
  return postJson<CsvImportResponse>("/api/import-csv/upload", {
    filename: file.name,
    content_base64: await encodeFileToBase64(file),
    replace_existing: replaceExisting,
  });
}

export function previewNotesCapture(content: string) {
  return postJson<NotesPreviewResponse>("/api/import-notes/preview", {
    content,
    replace_existing: false,
  });
}

export function importNotesCapture(content: string, replaceExisting = false) {
  return postJson<NotesImportResponse>("/api/import-notes", {
    content,
    replace_existing: replaceExisting,
  });
}

export async function downloadTransactionsExport() {
  const response = await fetch(`${API_BASE_URL}/api/transactions/export`, {
    credentials: "include",
  });
  if (!response.ok) {
    throw await buildApiError(response);
  }

  const disposition = response.headers.get("content-disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const filename = match?.[1] ?? "finance-hub-report.csv";
  return {
    filename,
    blob: await response.blob(),
  };
}

export function login(email: string, password: string) {
  return postJson<AuthResponse>("/api/auth/login", { email, password });
}

export function logout() {
  return postJson<void>("/api/auth/logout");
}
