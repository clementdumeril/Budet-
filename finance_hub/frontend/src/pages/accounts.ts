import { createAccount, fetchAccounts, updateAccount, type Account } from "../api/client";
import { escapeHtml, formatEuro } from "./finance-data";

const ACCOUNT_TYPES = [
  { value: "checking", label: "Compte courant" },
  { value: "savings", label: "Epargne" },
  { value: "broker", label: "Broker" },
  { value: "cash", label: "Cash" },
  { value: "card", label: "Carte" },
  { value: "other", label: "Autre" },
];

function parseOptionalAmount(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const normalized = Number(trimmed.replace(",", "."));
  return Number.isFinite(normalized) ? normalized : Number.NaN;
}

function typeLabel(value: string) {
  return ACCOUNT_TYPES.find((entry) => entry.value === value)?.label ?? value;
}

function buildTypeOptions(selectedValue: string) {
  return ACCOUNT_TYPES.map(
    (type) => `<option value="${type.value}"${type.value === selectedValue ? " selected" : ""}>${type.label}</option>`,
  ).join("");
}

function buildAccountList(accounts: Account[]) {
  if (accounts.length === 0) {
    return `<div class="empty-state">Ajoute ton premier compte pour suivre tes soldes a la main.</div>`;
  }

  return accounts
    .map(
      (account) => `
        <article class="entity-row">
          <div class="entity-row-main">
            <div>
              <strong>${escapeHtml(account.label)}</strong>
              <p>${escapeHtml(account.institution)} - ${escapeHtml(typeLabel(account.type))}${account.last4 ? ` - ****${escapeHtml(account.last4)}` : ""}</p>
            </div>
            <div class="entity-row-meta">
              <span class="status-chip ${account.is_active ? "" : "status-chip-soft"}">${account.is_active ? "actif" : "archive"}</span>
              <strong>${formatEuro(account.balance ?? 0)}</strong>
            </div>
          </div>
          <div class="entity-row-footer">
            <p>${escapeHtml(account.notes ?? "Aucune note pour ce compte.")}</p>
            <button class="ghost-button entity-action" type="button" data-edit-account="${account.id}">Modifier</button>
          </div>
        </article>
      `,
    )
    .join("");
}

function buildAccountCards(accounts: Account[]) {
  const activeCount = accounts.filter((account) => account.is_active).length;
  const totalBalance = accounts.reduce((sum, account) => sum + (account.balance ?? 0), 0);
  const brokerBalance = accounts
    .filter((account) => account.type === "broker")
    .reduce((sum, account) => sum + (account.balance ?? 0), 0);

  return `
    <article>
      <span>Comptes actifs</span>
      <strong>${activeCount}</strong>
    </article>
    <article>
      <span>Vision totale</span>
      <strong>${formatEuro(totalBalance)}</strong>
    </article>
    <article>
      <span>Poche placements</span>
      <strong>${formatEuro(brokerBalance)}</strong>
    </article>
  `;
}

export async function renderAccountsPage(): Promise<HTMLElement> {
  let accounts = await fetchAccounts();
  let editingAccountId: number | null = null;

  const section = document.createElement("section");
  section.className = "page-grid";
  section.innerHTML = `
    <section class="overview-hero">
      <div>
        <p class="eyebrow">Comptes</p>
        <h1>Suivi manuel des banques et poches de cash.</h1>
        <p class="hero-copy">Tu poses ici tes comptes de reference puis tu corriges les soldes quand tu veux. L'app ne depend pas d'une API bancaire pour rester simple et fiable.</p>
      </div>
      <div class="overview-mini-stats" id="accountsHeroStats">
        ${buildAccountCards(accounts)}
      </div>
    </section>

    <section class="overview-layout">
      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Pilotage</p>
            <h2>Comptes suivis</h2>
          </div>
          <div class="muted">Saisie et mise a jour manuelles</div>
        </div>
        <div class="entity-list" id="accountsList">${buildAccountList(accounts)}</div>
      </article>

      <article class="panel">
        <div class="panel-heading compact-heading">
          <div>
            <p class="eyebrow">Edition</p>
            <h2 id="accountFormTitle">Ajouter un compte</h2>
          </div>
        </div>
        <form id="accountForm" class="manual-entry-form">
          <label class="field manual-field">
            <span>Libelle</span>
            <input id="accountLabel" type="text" placeholder="Ex: Compte principal" required />
          </label>

          <label class="field manual-field">
            <span>Etablissement</span>
            <input id="accountInstitution" type="text" placeholder="Ex: Boursorama" required />
          </label>

          <label class="field manual-field">
            <span>Type</span>
            <select id="accountType">
              ${buildTypeOptions("checking")}
            </select>
          </label>

          <label class="field manual-field">
            <span>Solde actuel</span>
            <input id="accountBalance" type="text" inputmode="decimal" placeholder="0,00" />
          </label>

          <label class="field manual-field">
            <span>Devise</span>
            <input id="accountCurrency" type="text" value="EUR" maxlength="8" />
          </label>

          <label class="field manual-field">
            <span>4 derniers chiffres</span>
            <input id="accountLast4" type="text" maxlength="8" placeholder="1234" />
          </label>

          <label class="field manual-field manual-field-span">
            <span>Notes</span>
            <textarea id="accountNotes" class="notes-capture-input compact-textarea" placeholder="Ex: compte salaire, reserve de securite, carte voyage..."></textarea>
          </label>

          <label class="manual-toggle manual-field-span">
            <input id="accountIsActive" type="checkbox" checked />
            <span>Compte actif dans les vues principales</span>
          </label>

          <div class="manual-form-actions manual-field-span">
            <button id="accountSubmitButton" class="primary-button entity-submit" type="submit">Ajouter le compte</button>
            <button id="accountCancelButton" class="ghost-button entity-cancel" type="button" hidden>Annuler</button>
          </div>
          <p id="accountStatus" class="muted manual-status">Ajoute tes comptes de reference puis mets a jour les soldes a la main quand necessaire.</p>
        </form>
      </article>
    </section>
  `;

  const heroStats = section.querySelector<HTMLElement>("#accountsHeroStats");
  const list = section.querySelector<HTMLElement>("#accountsList");
  const form = section.querySelector<HTMLFormElement>("#accountForm");
  const formTitle = section.querySelector<HTMLElement>("#accountFormTitle");
  const labelInput = section.querySelector<HTMLInputElement>("#accountLabel");
  const institutionInput = section.querySelector<HTMLInputElement>("#accountInstitution");
  const typeInput = section.querySelector<HTMLSelectElement>("#accountType");
  const balanceInput = section.querySelector<HTMLInputElement>("#accountBalance");
  const currencyInput = section.querySelector<HTMLInputElement>("#accountCurrency");
  const last4Input = section.querySelector<HTMLInputElement>("#accountLast4");
  const notesInput = section.querySelector<HTMLTextAreaElement>("#accountNotes");
  const activeInput = section.querySelector<HTMLInputElement>("#accountIsActive");
  const submitButton = section.querySelector<HTMLButtonElement>("#accountSubmitButton");
  const cancelButton = section.querySelector<HTMLButtonElement>("#accountCancelButton");
  const status = section.querySelector<HTMLElement>("#accountStatus");

  if (
    !heroStats ||
    !list ||
    !form ||
    !formTitle ||
    !labelInput ||
    !institutionInput ||
    !typeInput ||
    !balanceInput ||
    !currencyInput ||
    !last4Input ||
    !notesInput ||
    !activeInput ||
    !submitButton ||
    !cancelButton ||
    !status
  ) {
    return section;
  }

  const resetForm = () => {
    editingAccountId = null;
    form.reset();
    typeInput.value = "checking";
    currencyInput.value = "EUR";
    activeInput.checked = true;
    formTitle.textContent = "Ajouter un compte";
    submitButton.textContent = "Ajouter le compte";
    cancelButton.hidden = true;
  };

  const syncUi = () => {
    heroStats.innerHTML = buildAccountCards(accounts);
    list.innerHTML = buildAccountList(accounts);
  };

  list.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const accountId = target.dataset.editAccount;
    if (!accountId) {
      return;
    }

    const account = accounts.find((entry) => entry.id === Number(accountId));
    if (!account) {
      return;
    }

    editingAccountId = account.id;
    labelInput.value = account.label;
    institutionInput.value = account.institution;
    typeInput.value = account.type;
    balanceInput.value = account.balance === null ? "" : String(account.balance).replace(".", ",");
    currencyInput.value = account.currency;
    last4Input.value = account.last4 ?? "";
    notesInput.value = account.notes ?? "";
    activeInput.checked = account.is_active;
    formTitle.textContent = `Modifier ${account.label}`;
    submitButton.textContent = "Enregistrer";
    cancelButton.hidden = false;
    status.textContent = `Edition du compte ${account.label}.`;
  });

  cancelButton.addEventListener("click", () => {
    resetForm();
    status.textContent = "Edition annulee.";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const balance = parseOptionalAmount(balanceInput.value);
    if (Number.isNaN(balance)) {
      status.textContent = "Le solde doit etre un nombre valide.";
      return;
    }

    const payload = {
      label: labelInput.value.trim(),
      institution: institutionInput.value.trim(),
      type: typeInput.value,
      currency: currencyInput.value.trim().toUpperCase() || "EUR",
      balance,
      last4: last4Input.value.trim() || null,
      is_active: activeInput.checked,
      notes: notesInput.value.trim() || null,
    };

    if (!payload.label || !payload.institution) {
      status.textContent = "Le libelle et l'etablissement sont obligatoires.";
      return;
    }

    submitButton.disabled = true;
    cancelButton.disabled = true;
    status.textContent = editingAccountId === null ? "Creation du compte..." : "Mise a jour du compte...";

    try {
      const saved = editingAccountId === null
        ? await createAccount(payload)
        : await updateAccount(editingAccountId, payload);

      if (editingAccountId === null) {
        accounts = [saved, ...accounts];
        status.textContent = `Compte ajoute: ${saved.label}.`;
      } else {
        accounts = accounts.map((account) => (account.id === saved.id ? saved : account));
        status.textContent = `Compte mis a jour: ${saved.label}.`;
      }

      syncUi();
      resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      status.textContent = `Operation impossible: ${message}`;
    } finally {
      submitButton.disabled = false;
      cancelButton.disabled = false;
    }
  });

  return section;
}
