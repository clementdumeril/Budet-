import {
  fetchImportSources,
  importCsvUpload,
  previewCsvUpload,
  type CsvPreviewResponse,
  type ImportSource,
} from "../api/client";

function formatDate(value: string | null) {
  if (!value) {
    return "Jamais";
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function renderSourcesMarkup(sources: ImportSource[]) {
  return sources
    .map(
      (source) => `
        <article class="overview-list-item">
          <div>
            <strong>${source.label}</strong>
            <p>${source.provider} · ${source.source_type}${source.storage_path ? ` · ${source.storage_path}` : ""}</p>
          </div>
          <div class="import-source-meta">
            <span>${source.status}</span>
            <small>${formatDate(source.last_imported_at)}</small>
          </div>
        </article>
      `,
    )
    .join("");
}

function renderPreviewMarkup(preview: CsvPreviewResponse | null) {
  if (!preview) {
    return `
      <div class="empty-state import-empty-state">
        <p>Choisis un fichier puis lance une preview pour verifier les lignes avant import.</p>
      </div>
    `;
  }

  return `
    <div class="import-preview-header">
      <div>
        <strong>${preview.filename}</strong>
        <p>${preview.detected_rows} lignes detectees · ${preview.categories.join(", ") || "Aucune categorie"}</p>
      </div>
    </div>
    <div class="table-wrap">
      <table class="transactions-table import-preview-table">
        <thead>
          <tr>
            <th>Mois</th>
            <th>Categorie</th>
            <th>Description</th>
            <th>Montant</th>
            <th>Parents</th>
          </tr>
        </thead>
        <tbody>
          ${preview.preview
            .map(
              (row) => `
                <tr>
                  <td>${row.month_name} ${row.year}</td>
                  <td><span class="pill">${row.category}</span></td>
                  <td>${row.description ?? "Sans libelle"}</td>
                  <td>${formatAmount(row.amount)}</td>
                  <td>${row.reimbursement_to_parents ? "Oui" : "Non"}</td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

export async function renderDataRoomPage(): Promise<HTMLElement> {
  let sources = await fetchImportSources();
  let selectedFile: File | null = null;
  let preview: CsvPreviewResponse | null = null;

  const section = document.createElement("section");
  section.className = "page-grid";
  section.innerHTML = `
    <section class="overview-hero">
      <div>
        <p class="eyebrow">Data</p>
        <h1>Zone donnees brutes et pipelines d'import.</h1>
        <p class="hero-copy">Tu deposes ici les exports banque ou broker, tu verifies le parsing, puis tu importes la base exploitee par les dashboards.</p>
      </div>
      <div class="overview-mini-stats">
        <article>
          <span>Sources suivies</span>
          <strong>${sources.length}</strong>
        </article>
        <article>
          <span>Sources connectees</span>
          <strong>${sources.filter((source) => source.status === "connected").length}</strong>
        </article>
      </div>
    </section>

    <section class="overview-layout">
      <article class="panel import-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Upload</p>
            <h2>Importer un nouveau CSV</h2>
          </div>
        </div>

        <div class="import-form">
          <label class="import-dropzone" for="csvUploadInput">
            <input id="csvUploadInput" type="file" accept=".csv,text/csv" />
            <span class="badge badge-blue">CSV</span>
            <strong id="importFileName">Choisir un export banque ou budget</strong>
            <p id="importFileMeta">Le fichier reste prive, une copie horodatee est stockee dans le dossier data/imports.</p>
          </label>

          <label class="import-toggle">
            <input id="replaceExistingInput" type="checkbox" checked />
            <span>Remplacer les transactions existantes par ce nouvel import</span>
          </label>

          <div class="import-actions">
            <button id="previewImportButton" class="ghost-button" type="button">Preview</button>
            <button id="runImportButton" class="primary-button import-primary" type="button">Importer</button>
          </div>

          <p id="importStatus" class="muted import-status">Selectionne un fichier pour lancer la preview.</p>
        </div>
      </article>

      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Sources</p>
            <h2>Donnees disponibles</h2>
          </div>
        </div>
        <div id="importSourcesList" class="overview-list">
          ${renderSourcesMarkup(sources)}
        </div>
      </article>
    </section>

    <section class="overview-layout import-preview-layout">
      <article class="panel">
        <div class="panel-heading compact-heading">
          <div>
            <p class="eyebrow">Preview</p>
            <h2>Lignes normalisees avant import</h2>
          </div>
        </div>
        <div id="importPreviewWrap">
          ${renderPreviewMarkup(preview)}
        </div>
      </article>

      <article class="panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Workflow</p>
            <h2>Comment alimenter le site</h2>
          </div>
        </div>
        <div class="insights-grid insights-grid-dual">
          <article class="insight-card">
            <span class="badge badge-orange">1</span>
            <strong>Deposer le brut</strong>
            <p>Export CSV banque, budget ou broker.</p>
          </article>
          <article class="insight-card">
            <span class="badge badge-blue">2</span>
            <strong>Verifier la preview</strong>
            <p>Tu controles categories, montants et libelles avant ecriture.</p>
          </article>
          <article class="insight-card">
            <span class="badge badge-green">3</span>
            <strong>Importer la base</strong>
            <p>Le backend sauvegarde le fichier puis remplit la base exploitee.</p>
          </article>
          <article class="insight-card">
            <span class="badge badge-rose">4</span>
            <strong>Lire les dashboards</strong>
            <p>Les vues se basent ensuite sur les donnees propres, pas sur le CSV brut.</p>
          </article>
        </div>
      </article>
    </section>
  `;

  const fileInput = section.querySelector<HTMLInputElement>("#csvUploadInput");
  const fileName = section.querySelector<HTMLElement>("#importFileName");
  const fileMeta = section.querySelector<HTMLElement>("#importFileMeta");
  const replaceExistingInput = section.querySelector<HTMLInputElement>("#replaceExistingInput");
  const previewButton = section.querySelector<HTMLButtonElement>("#previewImportButton");
  const importButton = section.querySelector<HTMLButtonElement>("#runImportButton");
  const status = section.querySelector<HTMLElement>("#importStatus");
  const previewWrap = section.querySelector<HTMLElement>("#importPreviewWrap");
  const sourcesList = section.querySelector<HTMLElement>("#importSourcesList");

  if (
    !fileInput ||
    !fileName ||
    !fileMeta ||
    !replaceExistingInput ||
    !previewButton ||
    !importButton ||
    !status ||
    !previewWrap ||
    !sourcesList
  ) {
    return section;
  }

  const setBusy = (busy: boolean) => {
    fileInput.disabled = busy;
    replaceExistingInput.disabled = busy;
    previewButton.disabled = busy;
    importButton.disabled = busy;
    previewButton.textContent = busy ? "Chargement..." : "Preview";
    importButton.textContent = busy ? "Import en cours..." : "Importer";
  };

  const refreshSources = async () => {
    sources = await fetchImportSources();
    sourcesList.innerHTML = renderSourcesMarkup(sources);
  };

  fileInput.addEventListener("change", () => {
    selectedFile = fileInput.files?.[0] ?? null;
    preview = null;
    previewWrap.innerHTML = renderPreviewMarkup(preview);

    if (!selectedFile) {
      fileName.textContent = "Choisir un export banque ou budget";
      fileMeta.textContent = "Le fichier reste prive, une copie horodatee est stockee dans le dossier data/imports.";
      status.textContent = "Selectionne un fichier pour lancer la preview.";
      return;
    }

    fileName.textContent = selectedFile.name;
    fileMeta.textContent = `${(selectedFile.size / 1024).toFixed(1)} Ko · ${selectedFile.type || "text/csv"}`;
    status.textContent = "Fichier charge. Lance une preview pour verifier le parsing.";
  });

  previewButton.addEventListener("click", async () => {
    if (!selectedFile) {
      status.textContent = "Choisis d'abord un fichier CSV.";
      return;
    }

    setBusy(true);
    status.textContent = "Lecture et normalisation du CSV...";

    try {
      preview = await previewCsvUpload(selectedFile);
      previewWrap.innerHTML = renderPreviewMarkup(preview);
      status.textContent = `${preview.detected_rows} lignes detectees. Tu peux maintenant importer.`;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      status.textContent = `Preview impossible: ${message}`;
    } finally {
      setBusy(false);
    }
  });

  importButton.addEventListener("click", async () => {
    if (!selectedFile) {
      status.textContent = "Choisis d'abord un fichier CSV.";
      return;
    }

    setBusy(true);
    status.textContent = "Import du CSV dans la base...";

    try {
      const result = await importCsvUpload(selectedFile, replaceExistingInput.checked);
      await refreshSources();
      status.textContent = `${result.imported} lignes importees depuis ${result.filename}.`;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      status.textContent = `Import impossible: ${message}`;
    } finally {
      setBusy(false);
    }
  });

  return section;
}
