import { fetchAccounts } from "../api/client";
import { formatEuro } from "./finance-data";

export async function renderAccountsPage(): Promise<HTMLElement> {
  const accounts = await fetchAccounts();

  const section = document.createElement("section");
  section.className = "page-grid";
  section.innerHTML = `
    <section class="overview-hero">
      <div>
        <p class="eyebrow">Accounts</p>
        <h1>Vue multi-banques et multi-comptes.</h1>
        <p class="hero-copy">Cette page sert de base pour separer les flux entre compte courant, carte, epargne, broker et cash.</p>
      </div>
      <div class="overview-mini-stats">
        <article>
          <span>Comptes actifs</span>
          <strong>${accounts.filter((account) => account.is_active).length}</strong>
        </article>
        <article>
          <span>Balance totale</span>
          <strong>${formatEuro(accounts.reduce((sum, account) => sum + (account.balance ?? 0), 0))}</strong>
        </article>
      </div>
    </section>

    <section class="overview-card-grid">
      ${accounts
        .map(
          (account) => `
            <article class="overview-card">
              <p class="eyebrow">${account.institution}</p>
              <strong>${account.label}</strong>
              <p class="muted">${account.type} · ${account.currency}${account.last4 ? ` · ****${account.last4}` : ""}</p>
              <div class="account-balance">${formatEuro(account.balance ?? 0)}</div>
              <p class="muted">${account.notes ?? "Aucune note pour ce compte."}</p>
            </article>
          `,
        )
        .join("")}
    </section>
  `;

  return section;
}
