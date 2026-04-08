import {
  MONTH_LABELS,
  buildCategorySummary,
  compareTransactionsDesc,
  escapeHtml,
  formatEuro,
  formatPeriodLabel,
  formatPercent,
  loadTransactions,
} from "./finance-data";

import { createTransaction, type Transaction } from "../api/client";

type TransactionFilters = {
  search: string;
  year: string;
  category: string;
  reimbursed: string;
};

function filterTransactions(transactions: Transaction[], filters: TransactionFilters) {
  const search = filters.search.trim().toLocaleLowerCase();

  return transactions.filter((transaction) => {
    if (filters.year !== "all" && String(transaction.year) !== filters.year) {
      return false;
    }
    if (filters.category !== "all" && transaction.category !== filters.category) {
      return false;
    }
    if (filters.reimbursed === "yes" && !transaction.reimbursement_to_parents) {
      return false;
    }
    if (filters.reimbursed === "no" && transaction.reimbursement_to_parents) {
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

function buildSelectOptions(options: Array<{ value: string; label: string }>, selectedValue: string) {
  return options
    .map(
      (option) =>
        `<option value="${option.value}"${option.value === selectedValue ? " selected" : ""}>${option.label}</option>`,
    )
    .join("");
}

function buildSummaryMetrics(transactions: Transaction[]) {
  const total = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const reimbursed = transactions.reduce(
    (sum, transaction) => sum + (transaction.reimbursement_to_parents ? transaction.amount : 0),
    0,
  );
  const largest = transactions.reduce<Transaction | null>(
    (current, transaction) => (current === null || transaction.amount > current.amount ? transaction : current),
    null,
  );
  const categories = buildCategorySummary(transactions);

  return {
    total,
    reimbursed,
    own: total - reimbursed,
    count: transactions.length,
    largest,
    average: transactions.length ? total / transactions.length : 0,
    topCategory: categories[0] ?? null,
    first: transactions[transactions.length - 1] ?? null,
    last: transactions[0] ?? null,
  };
}

function buildFilterOptions(transactions: Transaction[], state: TransactionFilters) {
  const years = Array.from(new Set(transactions.map((transaction) => transaction.year))).sort((left, right) => right - left);
  const categories = Array.from(new Set(transactions.map((transaction) => transaction.category))).sort((left, right) =>
    left.localeCompare(right, "fr"),
  );

  return {
    years,
    categories,
    yearMarkup: buildSelectOptions(
      [
        { value: "all", label: "Date" },
        ...years.map((year) => ({ value: String(year), label: String(year) })),
      ],
      state.year,
    ),
    categoryMarkup: buildSelectOptions(
      [
        { value: "all", label: "Filters" },
        ...categories.map((category) => ({ value: category, label: category })),
      ],
      state.category,
    ),
  };
}

export async function renderTransactionsPage(): Promise<HTMLElement> {
  const now = new Date();
  let allTransactions = (await loadTransactions()).slice().sort(compareTransactionsDesc);
  const state: TransactionFilters = {
    search: "",
    year: "all",
    category: "all",
    reimbursed: "all",
  };

  const manualYears = Array.from(new Set([now.getFullYear(), ...allTransactions.map((transaction) => transaction.year)]))
    .sort((left, right) => right - left)
    .slice(0, 8);
  const defaultMonth = now.getMonth() + 1;
  const defaultYear = now.getFullYear();

  const filterOptions = buildFilterOptions(allTransactions, state);

  const section = document.createElement("section");
  section.className = "page-grid";
  section.innerHTML = `
    <section class="ledger-shell">
      <div class="ledger-main panel">
        <div class="ledger-header">
          <div>
            <p class="eyebrow">Transactions</p>
            <h1>Ledger personnel</h1>
          </div>
          <div class="ledger-toolbar">
            <label class="toolbar-search">
              <input id="transactionsSearch" type="search" placeholder="Search" />
            </label>
            <select id="transactionsYear" class="toolbar-select">
              ${filterOptions.yearMarkup}
            </select>
            <select id="transactionsCategory" class="toolbar-select">
              ${filterOptions.categoryMarkup}
            </select>
            <select id="transactionsReimbursed" class="toolbar-select">
              ${buildSelectOptions(
                [
                  { value: "all", label: "Tout" },
                  { value: "no", label: "Perso" },
                  { value: "yes", label: "Parents" },
                ],
                state.reimbursed,
              )}
            </select>
            <button class="ghost-button" id="resetTransactionsFilters" type="button">Reset</button>
          </div>
        </div>

        <div class="ledger-subbar">
          <div class="muted" id="transactionsMeta">${allTransactions.length} lignes disponibles</div>
          <div class="ledger-actions">
            <span class="ledger-chip">Saisie manuelle active</span>
          </div>
        </div>

        <div class="ledger-list" id="transactionsLedger"></div>
      </div>

      <aside class="ledger-aside">
        <section class="ledger-summary panel">
          <div class="panel-heading compact-heading">
            <div>
              <p class="eyebrow">Summary</p>
              <h2>Resume</h2>
            </div>
          </div>
          <div class="summary-metrics" id="transactionsSummary"></div>
        </section>

        <section class="panel manual-entry-panel">
          <div class="panel-heading compact-heading">
            <div>
              <p class="eyebrow">Manual entry</p>
              <h2>Ajouter une depense</h2>
            </div>
          </div>

          <form id="manualTransactionForm" class="manual-entry-form">
            <label class="field manual-field manual-field-span">
              <span>Description</span>
              <input id="manualDescription" type="text" placeholder="Ex: courses, Uber, resto..." maxlength="160" required />
            </label>

            <label class="field manual-field">
              <span>Montant</span>
              <input id="manualAmount" type="text" inputmode="decimal" placeholder="0,00" required />
            </label>

            <label class="field manual-field">
              <span>Categorie</span>
              <input id="manualCategory" type="text" list="manualCategoryList" placeholder="Ex: Alimentation" required />
              <datalist id="manualCategoryList">
                ${filterOptions.categories.map((category) => `<option value="${escapeHtml(category)}"></option>`).join("")}
              </datalist>
            </label>

            <label class="field manual-field">
              <span>Mois</span>
              <select id="manualMonth">
                ${MONTH_LABELS.map(
                  (monthLabel, index) =>
                    `<option value="${index + 1}"${index + 1 === defaultMonth ? " selected" : ""}>${monthLabel}</option>`,
                ).join("")}
              </select>
            </label>

            <label class="field manual-field">
              <span>Annee</span>
              <select id="manualYear">
                ${manualYears
                  .map((year) => `<option value="${year}"${year === defaultYear ? " selected" : ""}>${year}</option>`)
                  .join("")}
              </select>
            </label>

            <label class="field manual-field manual-field-span">
              <span>Date exacte</span>
              <input id="manualDate" type="date" />
            </label>

            <label class="manual-toggle">
              <input id="manualReimbursed" type="checkbox" />
              <span>Remboursement parents</span>
            </label>

            <label class="field manual-field manual-field-span">
              <span>Source</span>
              <input id="manualSource" type="text" value="manual" maxlength="32" />
            </label>

            <button id="manualSubmitButton" class="primary-button manual-submit" type="submit">Ajouter la ligne</button>
            <p id="manualTransactionStatus" class="muted manual-status">La saisie manuelle cree directement une transaction dans la base.</p>
          </form>
        </section>
      </aside>
    </section>
  `;

  const searchInput = section.querySelector<HTMLInputElement>("#transactionsSearch");
  const yearSelect = section.querySelector<HTMLSelectElement>("#transactionsYear");
  const categorySelect = section.querySelector<HTMLSelectElement>("#transactionsCategory");
  const reimbursedSelect = section.querySelector<HTMLSelectElement>("#transactionsReimbursed");
  const resetButton = section.querySelector<HTMLButtonElement>("#resetTransactionsFilters");
  const meta = section.querySelector<HTMLElement>("#transactionsMeta");
  const ledger = section.querySelector<HTMLElement>("#transactionsLedger");
  const summary = section.querySelector<HTMLElement>("#transactionsSummary");
  const form = section.querySelector<HTMLFormElement>("#manualTransactionForm");
  const descriptionInput = section.querySelector<HTMLInputElement>("#manualDescription");
  const amountInput = section.querySelector<HTMLInputElement>("#manualAmount");
  const categoryInput = section.querySelector<HTMLInputElement>("#manualCategory");
  const monthInput = section.querySelector<HTMLSelectElement>("#manualMonth");
  const yearInput = section.querySelector<HTMLSelectElement>("#manualYear");
  const dateInput = section.querySelector<HTMLInputElement>("#manualDate");
  const reimbursedInput = section.querySelector<HTMLInputElement>("#manualReimbursed");
  const sourceInput = section.querySelector<HTMLInputElement>("#manualSource");
  const submitButton = section.querySelector<HTMLButtonElement>("#manualSubmitButton");
  const status = section.querySelector<HTMLElement>("#manualTransactionStatus");
  const categoryList = section.querySelector<HTMLDataListElement>("#manualCategoryList");

  if (
    !searchInput ||
    !yearSelect ||
    !categorySelect ||
    !reimbursedSelect ||
    !resetButton ||
    !meta ||
    !ledger ||
    !summary ||
    !form ||
    !descriptionInput ||
    !amountInput ||
    !categoryInput ||
    !monthInput ||
    !yearInput ||
    !dateInput ||
    !reimbursedInput ||
    !sourceInput ||
    !submitButton ||
    !status ||
    !categoryList
  ) {
    return section;
  }

  const refreshFilterSelects = () => {
    const options = buildFilterOptions(allTransactions, state);
    yearSelect.innerHTML = options.yearMarkup;
    categorySelect.innerHTML = options.categoryMarkup;
    categoryList.innerHTML = options.categories
      .map((category) => `<option value="${escapeHtml(category)}"></option>`)
      .join("");
  };

  const refreshLedger = () => {
    const filtered = filterTransactions(allTransactions, state).sort(compareTransactionsDesc);
    const visibleRows = filtered.slice(0, 120);
    const grouped = new Map<string, Transaction[]>();

    visibleRows.forEach((transaction) => {
      const key = formatPeriodLabel(transaction.year, transaction.month, transaction.month_name);
      const bucket = grouped.get(key) ?? [];
      bucket.push(transaction);
      grouped.set(key, bucket);
    });

    const totals = buildSummaryMetrics(filtered);
    meta.textContent = `${filtered.length} lignes visibles sur ${allTransactions.length}`;

    ledger.innerHTML = visibleRows.length
      ? Array.from(grouped.entries())
          .map(
            ([label, items]) => `
              <section class="ledger-group">
                <header class="ledger-group-header">
                  <strong>${escapeHtml(label)}</strong>
                  <span>${formatEuro(items.reduce((sum, item) => sum + item.amount, 0))}</span>
                </header>
                <div class="ledger-group-body">
                  ${items
                    .map(
                      (transaction) => `
                        <article class="ledger-row">
                          <div class="ledger-cell ledger-primary">
                            <span class="ledger-dot"></span>
                            <div>
                              <strong>${escapeHtml(transaction.description ?? transaction.category)}</strong>
                              <p>${escapeHtml(transaction.category)}</p>
                            </div>
                          </div>
                          <div class="ledger-cell">
                            <span class="ledger-chip">${escapeHtml(transaction.category)}</span>
                          </div>
                          <div class="ledger-cell">
                            <span class="ledger-chip ${transaction.reimbursement_to_parents ? "is-green" : ""}">
                              ${transaction.reimbursement_to_parents ? "Parents" : "Perso"}
                            </span>
                          </div>
                          <div class="ledger-cell ledger-amount ${transaction.reimbursement_to_parents ? "is-positive" : ""}">
                            ${transaction.reimbursement_to_parents ? "+" : ""}${formatEuro(transaction.amount)}
                          </div>
                        </article>
                      `,
                    )
                    .join("")}
                </div>
              </section>
            `,
          )
          .join("")
      : `<div class="empty-state">Aucune transaction ne correspond au filtre courant.</div>`;

    summary.innerHTML = `
      <article><span>Total transactions</span><strong>${totals.count}</strong></article>
      <article><span>Largest transaction</span><strong>${totals.largest ? formatEuro(totals.largest.amount) : "-"}</strong></article>
      <article><span>Average transaction</span><strong>${formatEuro(totals.average)}</strong></article>
      <article><span>Total perso</span><strong>${formatEuro(totals.own)}</strong></article>
      <article><span>Total parents</span><strong>${formatEuro(totals.reimbursed)}</strong></article>
      <article><span>Top category</span><strong>${totals.topCategory?.category ?? "-"}</strong><small>${totals.topCategory ? formatPercent(totals.topCategory.share) : ""}</small></article>
      <article><span>First period</span><strong>${totals.first ? formatPeriodLabel(totals.first.year, totals.first.month, totals.first.month_name) : "-"}</strong></article>
      <article><span>Last period</span><strong>${totals.last ? formatPeriodLabel(totals.last.year, totals.last.month, totals.last.month_name) : "-"}</strong></article>
    `;
  };

  const syncState = () => {
    state.search = searchInput.value;
    state.year = yearSelect.value;
    state.category = categorySelect.value;
    state.reimbursed = reimbursedSelect.value;
    refreshLedger();
  };

  searchInput.addEventListener("input", syncState);
  yearSelect.addEventListener("change", syncState);
  categorySelect.addEventListener("change", syncState);
  reimbursedSelect.addEventListener("change", syncState);

  resetButton.addEventListener("click", () => {
    searchInput.value = "";
    yearSelect.value = "all";
    categorySelect.value = "all";
    reimbursedSelect.value = "all";
    syncState();
  });

  dateInput.addEventListener("change", () => {
    if (!dateInput.value) {
      return;
    }

    const chosenDate = new Date(`${dateInput.value}T12:00:00`);
    if (Number.isNaN(chosenDate.getTime())) {
      return;
    }

    monthInput.value = String(chosenDate.getMonth() + 1);
    const chosenYear = String(chosenDate.getFullYear());
    if (!Array.from(yearInput.options).some((option) => option.value === chosenYear)) {
      yearInput.innerHTML = [`<option value="${chosenYear}">${chosenYear}</option>`, yearInput.innerHTML].join("");
    }
    yearInput.value = chosenYear;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const normalizedAmount = Number(amountInput.value.replace(",", ".").trim());
    const category = categoryInput.value.trim();
    const description = descriptionInput.value.trim();
    const source = sourceInput.value.trim() || "manual";

    if (!description || !category || !Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      status.textContent = "Renseigne une description, une categorie et un montant valide.";
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Ajout...";
    status.textContent = "Creation de la transaction...";

    try {
      const month = Number(monthInput.value);
      const year = Number(yearInput.value);
      const created = await createTransaction({
        month_name: MONTH_LABELS[month - 1] ?? null,
        year,
        month,
        date: dateInput.value || null,
        category,
        description,
        amount: normalizedAmount,
        reimbursement_to_parents: reimbursedInput.checked,
        source,
      });

      allTransactions = [created, ...allTransactions].sort(compareTransactionsDesc);
      refreshFilterSelects();
      refreshLedger();

      form.reset();
      monthInput.value = String(defaultMonth);
      yearInput.value = Array.from(yearInput.options).some((option) => option.value === String(defaultYear))
        ? String(defaultYear)
        : yearInput.options[0]?.value ?? String(defaultYear);
      sourceInput.value = "manual";
      status.textContent = `Ligne ajoutee: ${created.description ?? created.category} pour ${formatEuro(created.amount)}.`;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      status.textContent = `Ajout impossible: ${message}`;
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Ajouter la ligne";
    }
  });

  refreshLedger();
  return section;
}
