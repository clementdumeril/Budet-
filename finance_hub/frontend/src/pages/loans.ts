import { createLoan, fetchLoans, updateLoan, type Loan } from "../api/client";
import { escapeHtml, formatEuro } from "./finance-data";

const LOAN_STATUSES = [
  { value: "planned", label: "A lancer" },
  { value: "active", label: "En cours" },
  { value: "paused", label: "En pause" },
  { value: "closed", label: "Cloture" },
];

function parseRequiredAmount(value: string) {
  const normalized = Number(value.trim().replace(",", "."));
  return Number.isFinite(normalized) ? normalized : Number.NaN;
}

function parseOptionalAmount(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = Number(trimmed.replace(",", "."));
  return Number.isFinite(normalized) ? normalized : Number.NaN;
}

function buildStatusOptions(selectedValue: string) {
  return LOAN_STATUSES.map(
    (status) => `<option value="${status.value}"${status.value === selectedValue ? " selected" : ""}>${status.label}</option>`,
  ).join("");
}

function statusLabel(value: string) {
  return LOAN_STATUSES.find((status) => status.value === value)?.label ?? value;
}

function buildLoanStats(loans: Loan[]) {
  const total = loans.reduce((sum, loan) => sum + loan.amount, 0);
  const active = loans.filter((loan) => loan.status === "active").length;
  const rates = loans.map((loan) => loan.rate).filter((rate): rate is number => rate !== null);
  const averageRate = rates.length ? rates.reduce((sum, rate) => sum + rate, 0) / rates.length : 0;

  return `
    <article>
      <span>Montant suivi</span>
      <strong>${formatEuro(total)}</strong>
    </article>
    <article>
      <span>Prets actifs</span>
      <strong>${active}</strong>
    </article>
    <article>
      <span>Taux moyen</span>
      <strong>${rates.length ? `${averageRate.toFixed(2).replace(".", ",")} %` : "-"}</strong>
    </article>
  `;
}

function buildLoanList(loans: Loan[]) {
  if (loans.length === 0) {
    return `<div class="empty-state">Ajoute ici tes prets et echeances pour garder une vue propre du reste a piloter.</div>`;
  }

  return loans
    .map(
      (loan) => `
        <article class="entity-row">
          <div class="entity-row-main">
            <div>
              <strong>${escapeHtml(loan.type)}</strong>
              <p>${escapeHtml(loan.start_label ?? "Debut libre")}${loan.due_label ? ` - echeance ${escapeHtml(loan.due_label)}` : ""}</p>
            </div>
            <div class="entity-row-meta">
              <span class="status-chip status-chip-soft">${escapeHtml(statusLabel(loan.status))}</span>
              <strong>${formatEuro(loan.amount)}</strong>
            </div>
          </div>
          <div class="entity-row-footer">
            <p>${escapeHtml(loan.notes ?? "Pret suivi manuellement depuis l'app locale.")}</p>
            <div class="entity-inline-meta">
              <span>${loan.rate === null ? "Sans taux" : `${loan.rate.toFixed(2).replace(".", ",")} %`}</span>
              <button class="ghost-button entity-action" type="button" data-edit-loan="${loan.id}">Modifier</button>
            </div>
          </div>
        </article>
      `,
    )
    .join("");
}

export async function renderLoansPage(): Promise<HTMLElement> {
  let loans = await fetchLoans();
  let editingLoanId: number | null = null;

  const section = document.createElement("section");
  section.className = "page-grid";
  section.innerHTML = `
    <section class="overview-hero">
      <div>
        <p class="eyebrow">Prets</p>
        <h1>Suivi simple des credits, prets et echeances.</h1>
        <p class="hero-copy">Tu n'as pas besoin d'un connecteur bancaire pour savoir ou tu en es. Tu renseignes le montant, le taux, l'echeance et tu gardes une vision propre de ce qu'il reste a piloter.</p>
      </div>
      <div class="overview-mini-stats" id="loansHeroStats">
        ${buildLoanStats(loans)}
      </div>
    </section>

    <section class="overview-layout">
      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Engagements</p>
            <h2>Prets suivis</h2>
          </div>
          <div class="muted">Vision manuelle, lisible et modifiable</div>
        </div>
        <div class="entity-list" id="loansList">${buildLoanList(loans)}</div>
      </article>

      <article class="panel">
        <div class="panel-heading compact-heading">
          <div>
            <p class="eyebrow">Edition</p>
            <h2 id="loanFormTitle">Ajouter un pret</h2>
          </div>
        </div>
        <form id="loanForm" class="manual-entry-form">
          <label class="field manual-field">
            <span>Libelle</span>
            <input id="loanType" type="text" placeholder="Ex: Pret etudiant, avance familiale..." required />
          </label>

          <label class="field manual-field">
            <span>Montant</span>
            <input id="loanAmount" type="text" inputmode="decimal" placeholder="0,00" required />
          </label>

          <label class="field manual-field">
            <span>Taux</span>
            <input id="loanRate" type="text" inputmode="decimal" placeholder="Optionnel" />
          </label>

          <label class="field manual-field">
            <span>Statut</span>
            <select id="loanStatus">
              ${buildStatusOptions("active")}
            </select>
          </label>

          <label class="field manual-field">
            <span>Debut</span>
            <input id="loanStartLabel" type="text" placeholder="Ex: Septembre 2026" />
          </label>

          <label class="field manual-field">
            <span>Echeance</span>
            <input id="loanDueLabel" type="text" placeholder="Ex: Juin 2030" />
          </label>

          <label class="field manual-field manual-field-span">
            <span>Notes</span>
            <textarea id="loanNotes" class="notes-capture-input compact-textarea" placeholder="Ex: mensualite, reste a payer, conditions, aide familiale..."></textarea>
          </label>

          <div class="manual-form-actions manual-field-span">
            <button id="loanSubmitButton" class="primary-button entity-submit" type="submit">Ajouter le pret</button>
            <button id="loanCancelButton" class="ghost-button entity-cancel" type="button" hidden>Annuler</button>
          </div>
          <p id="loanStatusMessage" class="muted manual-status">Utilise cette vue comme ton registre de credits et d'engagements.</p>
        </form>
      </article>
    </section>
  `;

  const heroStats = section.querySelector<HTMLElement>("#loansHeroStats");
  const list = section.querySelector<HTMLElement>("#loansList");
  const form = section.querySelector<HTMLFormElement>("#loanForm");
  const formTitle = section.querySelector<HTMLElement>("#loanFormTitle");
  const typeInput = section.querySelector<HTMLInputElement>("#loanType");
  const amountInput = section.querySelector<HTMLInputElement>("#loanAmount");
  const rateInput = section.querySelector<HTMLInputElement>("#loanRate");
  const statusInput = section.querySelector<HTMLSelectElement>("#loanStatus");
  const startLabelInput = section.querySelector<HTMLInputElement>("#loanStartLabel");
  const dueLabelInput = section.querySelector<HTMLInputElement>("#loanDueLabel");
  const notesInput = section.querySelector<HTMLTextAreaElement>("#loanNotes");
  const submitButton = section.querySelector<HTMLButtonElement>("#loanSubmitButton");
  const cancelButton = section.querySelector<HTMLButtonElement>("#loanCancelButton");
  const statusMessage = section.querySelector<HTMLElement>("#loanStatusMessage");

  if (
    !heroStats ||
    !list ||
    !form ||
    !formTitle ||
    !typeInput ||
    !amountInput ||
    !rateInput ||
    !statusInput ||
    !startLabelInput ||
    !dueLabelInput ||
    !notesInput ||
    !submitButton ||
    !cancelButton ||
    !statusMessage
  ) {
    return section;
  }

  const resetForm = () => {
    editingLoanId = null;
    form.reset();
    statusInput.value = "active";
    formTitle.textContent = "Ajouter un pret";
    submitButton.textContent = "Ajouter le pret";
    cancelButton.hidden = true;
  };

  const syncUi = () => {
    heroStats.innerHTML = buildLoanStats(loans);
    list.innerHTML = buildLoanList(loans);
  };

  list.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const loanId = target.dataset.editLoan;
    if (!loanId) {
      return;
    }

    const loan = loans.find((entry) => entry.id === Number(loanId));
    if (!loan) {
      return;
    }

    editingLoanId = loan.id;
    typeInput.value = loan.type;
    amountInput.value = String(loan.amount).replace(".", ",");
    rateInput.value = loan.rate === null ? "" : String(loan.rate).replace(".", ",");
    statusInput.value = loan.status;
    startLabelInput.value = loan.start_label ?? "";
    dueLabelInput.value = loan.due_label ?? "";
    notesInput.value = loan.notes ?? "";
    formTitle.textContent = `Modifier ${loan.type}`;
    submitButton.textContent = "Enregistrer";
    cancelButton.hidden = false;
    statusMessage.textContent = `Edition du pret ${loan.type}.`;
  });

  cancelButton.addEventListener("click", () => {
    resetForm();
    statusMessage.textContent = "Edition annulee.";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const amount = parseRequiredAmount(amountInput.value);
    const rate = parseOptionalAmount(rateInput.value);

    if (!typeInput.value.trim() || !Number.isFinite(amount) || amount <= 0) {
      statusMessage.textContent = "Renseigne un libelle et un montant valide.";
      return;
    }

    if (Number.isNaN(rate)) {
      statusMessage.textContent = "Le taux doit etre un nombre valide.";
      return;
    }

    const payload = {
      type: typeInput.value.trim(),
      amount,
      rate,
      status: statusInput.value,
      start_label: startLabelInput.value.trim() || null,
      due_label: dueLabelInput.value.trim() || null,
      notes: notesInput.value.trim() || null,
    };

    submitButton.disabled = true;
    cancelButton.disabled = true;
    statusMessage.textContent = editingLoanId === null ? "Creation du pret..." : "Mise a jour du pret...";

    try {
      const saved = editingLoanId === null ? await createLoan(payload) : await updateLoan(editingLoanId, payload);

      if (editingLoanId === null) {
        loans = [saved, ...loans];
        statusMessage.textContent = `Pret ajoute: ${saved.type}.`;
      } else {
        loans = loans.map((entry) => (entry.id === saved.id ? saved : entry));
        statusMessage.textContent = `Pret mis a jour: ${saved.type}.`;
      }

      syncUi();
      resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      statusMessage.textContent = `Operation impossible: ${message}`;
    } finally {
      submitButton.disabled = false;
      cancelButton.disabled = false;
    }
  });

  return section;
}
