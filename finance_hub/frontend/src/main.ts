import "./style.css";

import { fetchSession, login, logout, type User } from "./api/client";
import { renderAccountsPage } from "./pages/accounts";
import { renderDataRoomPage } from "./pages/data-room";
import { renderDashboardPage } from "./pages/dashboard";
import { renderInvestmentsPage } from "./pages/investments";
import { renderOverviewPage } from "./pages/overview";
import { renderReportsPage } from "./pages/reports";
import { renderTransactionsPage } from "./pages/transactions";

type ViewName = "overview" | "accounts" | "cashflow" | "transactions" | "reports" | "investments" | "data";

const appRoot = document.querySelector<HTMLDivElement>("#app");

if (appRoot === null) {
  throw new Error("App root not found");
}

const app = appRoot;

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
    label: "Accounts",
    description: "Vue multi-comptes et soldes",
    eyebrow: "Accounts",
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
    label: "Reports",
    description: "Rapports et analyses",
    eyebrow: "Reports",
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
    key: "data",
    label: "Data",
    description: "Sources brutes et imports",
    eyebrow: "Data",
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
    outlet.innerHTML = `<section class="panel error-panel"><h2>API indisponible</h2><p>${message}</p><p>Demarre le backend FastAPI avant le frontend.</p></section>`;
  }
}

function renderShell() {
  app.innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand-block">
          <p class="eyebrow">Finance Hub</p>
          <h1>Pilotage budgetaire</h1>
          <p class="muted">Interface simple pour suivre depenses, comptes, epargne et imports CSV depuis un seul espace clair.</p>
        </div>
        <nav class="side-nav" id="sideNav"></nav>
      </aside>
      <main class="content-area">
        <header class="topbar">
          <div>
            <p class="eyebrow" id="topbarEyebrow">Dashboard</p>
            <h2 id="topbarTitle">Vue generale du budget</h2>
          </div>
          <div class="topbar-actions">
            <div class="status-chip">${currentUser?.role ?? "viewer"}</div>
            <button class="logout-button" id="logoutButton" type="button">Se deconnecter</button>
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

  const logoutButton = document.getElementById("logoutButton");
  if (logoutButton) {
    logoutButton.addEventListener("click", async () => {
      await logout();
      currentUser = null;
      renderLoginShell();
    });
  }
}

function renderLoginShell(errorMessage?: string) {
  app.innerHTML = `
    <main class="login-layout">
      <section class="login-panel">
        <p class="eyebrow">Finance Hub</p>
        <h1>Finance Hub</h1>
        <p class="muted">Connecte-toi pour piloter tes finances en local avec un parcours de demarrage simple.</p>
        <form id="loginForm" class="login-form">
          <label>
            <span>Email</span>
            <input id="emailInput" type="email" autocomplete="username" placeholder="demo@financehub.local" required />
          </label>
          <label>
            <span>Mot de passe</span>
            <input id="passwordInput" type="password" autocomplete="current-password" placeholder="demo1234" required />
          </label>
          <button type="submit" class="primary-button">Se connecter</button>
        </form>
        <p class="login-hint">Compte demo local par defaut. Change les identifiants avant de publier une instance.</p>
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
        : "Connexion impossible. Verifie que le backend tourne.";
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
