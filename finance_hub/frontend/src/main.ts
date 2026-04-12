import "./style.css";

import { fetchSession, login, type User } from "./api/client";
import { renderAccountsPage } from "./pages/accounts";
import { renderDataRoomPage } from "./pages/data-room";
import { renderDashboardPage } from "./pages/dashboard";
import { renderInvestmentsPage } from "./pages/investments";
import { renderLoansPage } from "./pages/loans";
import { renderOverviewPage } from "./pages/overview";
import { renderReportsPage } from "./pages/reports";
import { renderTransactionsPage } from "./pages/transactions";

type ViewName = "overview" | "accounts" | "cashflow" | "transactions" | "reports" | "investments" | "loans" | "data";

const appRoot = document.querySelector<HTMLDivElement>("#app");

if (appRoot === null) {
  throw new Error("App root not found");
}

const app = appRoot;

function formatRoleLabel(role: string | undefined) {
  if (!role) {
    return "viewer";
  }
  if (role === "admin") {
    return "admin local";
  }
  return role;
}

const navItems: Array<{ key: ViewName; label: string; description: string; eyebrow: string; title: string }> = [
  {
    key: "overview",
    label: "Dashboard",
    description: "Vue generale et points cles",
    eyebrow: "Dashboard",
    title: "Vue generale du budget",
  },
  {
    key: "cashflow",
    label: "Cash Flow",
    description: "Lecture visuelle des flux",
    eyebrow: "Cash Flow",
    title: "Lecture des flux et de la structure budgetaire",
  },
  {
    key: "accounts",
    label: "Comptes",
    description: "Soldes, banques et reperes",
    eyebrow: "Comptes",
    title: "Pilotage des comptes et des banques",
  },
  {
    key: "transactions",
    label: "Depenses",
    description: "Journal detaille et saisie",
    eyebrow: "Transactions",
    title: "Historique detaille des transactions",
  },
  {
    key: "reports",
    label: "Rapports",
    description: "Rapports et analyses",
    eyebrow: "Rapports",
    title: "Rapports analytiques et tendances",
  },
  {
    key: "investments",
    label: "Investissements",
    description: "Epargne et placements",
    eyebrow: "Investissements",
    title: "Suivi investissements et portefeuille",
  },
  {
    key: "loans",
    label: "Prets",
    description: "Credits et echeances",
    eyebrow: "Prets",
    title: "Suivi des prets et du reste a rembourser",
  },
  {
    key: "data",
    label: "Donnees",
    description: "Imports, notes et exports",
    eyebrow: "Donnees",
    title: "Donnees brutes et pipelines d'import",
  },
];

let currentUser: User | null = null;

async function renderView(view: ViewName) {
  const outlet = document.getElementById("viewOutlet");
  const topbarEyebrow = document.getElementById("topbarEyebrow");
  const topbarTitle = document.getElementById("topbarTitle");
  if (!outlet) {
    return;
  }

  const meta = navItems.find((item) => item.key === view);
  if (meta && topbarEyebrow && topbarTitle) {
    topbarEyebrow.textContent = meta.eyebrow;
    topbarTitle.textContent = meta.title;
  }

  outlet.innerHTML = `<section class="panel loading-panel"><p>Chargement des donnees...</p></section>`;

  try {
    const content =
      view === "overview"
        ? await renderOverviewPage()
        : view === "accounts"
          ? await renderAccountsPage()
          : view === "cashflow"
            ? await renderDashboardPage()
            : view === "reports"
              ? await renderReportsPage()
              : view === "investments"
                ? await renderInvestmentsPage()
                : view === "loans"
                  ? await renderLoansPage()
                : view === "data"
                  ? await renderDataRoomPage()
                  : await renderTransactionsPage();
    outlet.replaceChildren(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    if (message.includes("401")) {
      currentUser = null;
      renderLoginShell("Session expiree, reconnecte-toi.");
      return;
    }
    outlet.innerHTML = `<section class="panel error-panel"><h2>Finance Hub indisponible</h2><p>${message}</p><p>Relance l'application avec FinanceHub.bat pour rouvrir ton espace local.</p></section>`;
  }
}

function renderShell() {
  app.innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand-block">
          <p class="eyebrow">Finance Hub</p>
          <h1>Ton cockpit budget</h1>
          <p class="muted">Une app locale pour suivre depenses, comptes, placements et prets sans connexion bancaire obligatoire.</p>
          <div class="brand-meta-strip">
            <article class="brand-meta-card">
              <span>Mode</span>
              <strong>App locale</strong>
            </article>
            <article class="brand-meta-card">
              <span>Rapports</span>
              <strong>Hebdo</strong>
            </article>
          </div>
        </div>
        <nav class="side-nav" id="sideNav"></nav>
        <div class="sidebar-footer">
          <p class="sidebar-footer-title">${currentUser?.full_name ?? "Profil local"}</p>
          <p class="sidebar-footer-copy">Saisie rapide, imports avec preview et publication de rapports dans le meme espace.</p>
        </div>
      </aside>
      <main class="content-area">
        <header class="topbar">
          <div class="topbar-copy">
            <p class="eyebrow" id="topbarEyebrow">Dashboard</p>
            <h2 id="topbarTitle">Vue generale du budget</h2>
            <p class="topbar-note">App locale de pilotage: tu suis les soldes a la main, tu importes tes depenses et tu publies des rapports propres.</p>
          </div>
          <div class="topbar-actions">
            <div class="topbar-user">
              <span class="status-chip">mode local</span>
              <strong>${currentUser?.full_name ?? "Utilisateur local"}</strong>
            </div>
            <div class="topbar-user">
              <span class="status-chip status-chip-soft">${formatRoleLabel(currentUser?.role)}</span>
              <strong>publication prete</strong>
            </div>
          </div>
        </header>
        <div id="viewOutlet"></div>
      </main>
    </div>
  `;

  const nav = document.getElementById("sideNav");
  if (!nav) {
    return;
  }

  navItems.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nav-card";
    button.dataset.view = item.key;
    button.innerHTML = `
      <span>${item.label}</span>
      <small>${item.description}</small>
    `;
    button.addEventListener("click", () => {
      document
        .querySelectorAll<HTMLButtonElement>(".nav-card")
        .forEach((entry) => entry.classList.toggle("is-active", entry === button));
      void renderView(item.key);
    });
    nav.appendChild(button);
  });

  const firstButton = nav.querySelector<HTMLButtonElement>(".nav-card");
  if (firstButton) {
    firstButton.classList.add("is-active");
  }
}

function renderLoginShell(errorMessage?: string) {
  app.innerHTML = `
    <main class="login-layout">
      <section class="login-panel">
        <p class="eyebrow">Finance Hub</p>
        <h1>Finance Hub</h1>
        <p class="muted">Mode de secours local. En usage normal, l'app ouvre directement ton espace personnel.</p>
        <form id="loginForm" class="login-form">
          <label>
            <span>Email</span>
            <input id="emailInput" type="email" autocomplete="username" placeholder="local@financehub.app" required />
          </label>
          <label>
            <span>Mot de passe</span>
            <input id="passwordInput" type="password" autocomplete="current-password" placeholder="local-only" required />
          </label>
          <button type="submit" class="primary-button">Se connecter</button>
        </form>
        <p class="login-hint">Cette vue n'apparait que si le chargement automatique local echoue.</p>
        ${errorMessage ? `<p class="login-error">${errorMessage}</p>` : ""}
      </section>
    </main>
  `;

  const form = document.getElementById("loginForm") as HTMLFormElement | null;
  const emailInput = document.getElementById("emailInput") as HTMLInputElement | null;
  const passwordInput = document.getElementById("passwordInput") as HTMLInputElement | null;

  if (!form || !emailInput || !passwordInput) {
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = form.querySelector<HTMLButtonElement>("button[type='submit']");
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Connexion...";
    }

    try {
      const auth = await login(emailInput.value, passwordInput.value);
      currentUser = auth.user;
      renderShell();
      void renderView("overview");
    } catch (error) {
      const message = error instanceof Error && error.message.includes("401")
        ? "Identifiants invalides."
        : "Connexion locale impossible. Recharge l'application ou reessaie.";
      renderLoginShell(message);
    }
  });
}

async function bootstrapApp() {
  try {
    const auth = await fetchSession();
    currentUser = auth.user;
    renderShell();
    await renderView("overview");
  } catch {
    currentUser = null;
    renderLoginShell();
  }
}

void bootstrapApp();
