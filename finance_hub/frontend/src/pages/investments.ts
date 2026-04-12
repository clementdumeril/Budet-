import { createInvestment, fetchInvestments, updateInvestment, type Investment } from "../api/client";
import { escapeHtml, formatEuro } from "./finance-data";

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

function buildInvestmentStats(investments: Investment[]) {
  const invested = investments.reduce((sum, item) => sum + item.amount, 0);
  const current = investments.reduce((sum, item) => sum + (item.current_value ?? item.amount), 0);
  const gain = current - invested;

  return `
    <article>
      <span>Capital verse</span>
      <strong>${formatEuro(invested)}</strong>
    </article>
    <article>
      <span>Valeur actuelle</span>
      <strong>${formatEuro(current)}</strong>
    </article>
    <article>
      <span>Variation</span>
      <strong>${gain >= 0 ? "+" : "-"}${formatEuro(Math.abs(gain))}</strong>
    </article>
  `;
}

function buildInvestmentList(investments: Investment[]) {
  if (investments.length === 0) {
    return `<div class="empty-state">Ajoute ici tes poches Trade Republic, ETF ou epargne investie.</div>`;
  }

  return investments
    .map((item) => {
      const currentValue = item.current_value ?? item.amount;
      const delta = currentValue - item.amount;
      return `
        <article class="entity-row">
          <div class="entity-row-main">
            <div>
              <strong>${escapeHtml(item.type)}</strong>
              <p>${escapeHtml(item.date_label ?? "Sans date")}</p>
            </div>
            <div class="entity-row-meta">
              <span class="status-chip status-chip-soft">${delta >= 0 ? "suivi" : "a surveiller"}</span>
              <strong>${formatEuro(currentValue)}</strong>
            </div>
          </div>
          <div class="entity-row-footer">
            <p>${escapeHtml(item.notes ?? `Verse ${formatEuro(item.amount)} et valorise a la main quand tu veux.`)}</p>
            <div class="entity-inline-meta">
              <span>${delta >= 0 ? "+" : "-"}${formatEuro(Math.abs(delta))}</span>
              <button class="ghost-button entity-action" type="button" data-edit-investment="${item.id}">Modifier</button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

export async function renderInvestmentsPage(): Promise<HTMLElement> {
  let investments = await fetchInvestments();
  let editingInvestmentId: number | null = null;

  const section = document.createElement("section");
  section.className = "page-grid";
  section.innerHTML = `
    <section class="overview-hero">
      <div>
        <p class="eyebrow">Investissements</p>
        <h1>Suivi manuel des placements et de Trade Republic.</h1>
        <p class="hero-copy">Tu notes ici ce que tu as verse et la valeur actuelle quand tu veux faire un point. Pas de connexion broker fragile, juste une vue claire de ton patrimoine investi.</p>
      </div>
      <div class="overview-mini-stats" id="investmentsHeroStats">
        ${buildInvestmentStats(investments)}
      </div>
    </section>

    <section class="overview-layout">
      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Portefeuille</p>
            <h2>Lignes suivies</h2>
          </div>
          <div class="muted">Mise a jour manuelle des valorisations</div>
        </div>
        <div class="entity-list" id="investmentsList">${buildInvestmentList(investments)}</div>
      </article>

      <article class="panel">
        <div class="panel-heading compact-heading">
          <div>
            <p class="eyebrow">Edition</p>
            <h2 id="investmentFormTitle">Ajouter une ligne</h2>
          </div>
        </div>
        <form id="investmentForm" class="manual-entry-form">
          <label class="field manual-field">
            <span>Type de placement</span>
            <input id="investmentType" type="text" placeholder="Ex: Trade Republic, ETF Monde, Livret..." required />
          </label>

          <label class="field manual-field">
            <span>Capital verse</span>
            <input id="investmentAmount" type="text" inputmode="decimal" placeholder="0,00" required />
          </label>

          <label class="field manual-field">
            <span>Valeur actuelle</span>
            <input id="investmentCurrentValue" type="text" inputmode="decimal" placeholder="Optionnel" />
          </label>

          <label class="field manual-field">
            <span>Date repere</span>
            <input id="investmentDateLabel" type="text" placeholder="Ex: Avril 2026" />
          </label>

          <label class="field manual-field manual-field-span">
            <span>Notes</span>
            <textarea id="investmentNotes" class="notes-capture-input compact-textarea" placeholder="Ex: versement mensuel, ETF principal, poche de securite..."></textarea>
          </label>

          <div class="manual-form-actions manual-field-span">
            <button id="investmentSubmitButton" class="primary-button entity-submit" type="submit">Ajouter la ligne</button>
            <button id="investmentCancelButton" class="ghost-button entity-cancel" type="button" hidden>Annuler</button>
          </div>
          <p id="investmentStatus" class="muted manual-status">Sers-toi de cet ecran comme d'un carnet de valorisation simple.</p>
        </form>
      </article>
    </section>
  `;

  const heroStats = section.querySelector<HTMLElement>("#investmentsHeroStats");
  const list = section.querySelector<HTMLElement>("#investmentsList");
  const form = section.querySelector<HTMLFormElement>("#investmentForm");
  const formTitle = section.querySelector<HTMLElement>("#investmentFormTitle");
  const typeInput = section.querySelector<HTMLInputElement>("#investmentType");
  const amountInput = section.querySelector<HTMLInputElement>("#investmentAmount");
  const currentValueInput = section.querySelector<HTMLInputElement>("#investmentCurrentValue");
  const dateLabelInput = section.querySelector<HTMLInputElement>("#investmentDateLabel");
  const notesInput = section.querySelector<HTMLTextAreaElement>("#investmentNotes");
  const submitButton = section.querySelector<HTMLButtonElement>("#investmentSubmitButton");
  const cancelButton = section.querySelector<HTMLButtonElement>("#investmentCancelButton");
  const status = section.querySelector<HTMLElement>("#investmentStatus");

  if (
    !heroStats ||
    !list ||
    !form ||
    !formTitle ||
    !typeInput ||
    !amountInput ||
    !currentValueInput ||
    !dateLabelInput ||
    !notesInput ||
    !submitButton ||
    !cancelButton ||
    !status
  ) {
    return section;
  }

  const resetForm = () => {
    editingInvestmentId = null;
    form.reset();
    formTitle.textContent = "Ajouter une ligne";
    submitButton.textContent = "Ajouter la ligne";
    cancelButton.hidden = true;
  };

  const syncUi = () => {
    heroStats.innerHTML = buildInvestmentStats(investments);
    list.innerHTML = buildInvestmentList(investments);
  };

  list.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const investmentId = target.dataset.editInvestment;
    if (!investmentId) {
      return;
    }

    const investment = investments.find((entry) => entry.id === Number(investmentId));
    if (!investment) {
      return;
    }

    editingInvestmentId = investment.id;
    typeInput.value = investment.type;
    amountInput.value = String(investment.amount).replace(".", ",");
    currentValueInput.value = investment.current_value === null ? "" : String(investment.current_value).replace(".", ",");
    dateLabelInput.value = investment.date_label ?? "";
    notesInput.value = investment.notes ?? "";
    formTitle.textContent = `Modifier ${investment.type}`;
    submitButton.textContent = "Enregistrer";
    cancelButton.hidden = false;
    status.textContent = `Edition de la ligne ${investment.type}.`;
  });

  cancelButton.addEventListener("click", () => {
    resetForm();
    status.textContent = "Edition annulee.";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const amount = parseRequiredAmount(amountInput.value);
    const currentValue = parseOptionalAmount(currentValueInput.value);

    if (!typeInput.value.trim() || !Number.isFinite(amount) || amount <= 0) {
      status.textContent = "Renseigne un type et un capital verse valide.";
      return;
    }

    if (Number.isNaN(currentValue)) {
      status.textContent = "La valeur actuelle doit etre un nombre valide.";
      return;
    }

    const payload = {
      type: typeInput.value.trim(),
      amount,
      current_value: currentValue,
      date_label: dateLabelInput.value.trim() || null,
      notes: notesInput.value.trim() || null,
    };

    submitButton.disabled = true;
    cancelButton.disabled = true;
    status.textContent = editingInvestmentId === null ? "Creation de la ligne..." : "Mise a jour de la ligne...";

    try {
      const saved = editingInvestmentId === null
        ? await createInvestment(payload)
        : await updateInvestment(editingInvestmentId, payload);

      if (editingInvestmentId === null) {
        investments = [saved, ...investments];
        status.textContent = `Ligne ajoutee: ${saved.type}.`;
      } else {
        investments = investments.map((entry) => (entry.id === saved.id ? saved : entry));
        status.textContent = `Ligne mise a jour: ${saved.type}.`;
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
