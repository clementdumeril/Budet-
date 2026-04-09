import {
  downloadTransactionsExport,
  fetchImportSources,
  importCsvUpload,
  importNotesCapture,
  previewCsvUpload,
  previewNotesCapture,
  type CsvPreviewResponse,
  type ImportSource,
  type NotesPreviewResponse,
} from "../api/client";

function sanitizeUiCopy(value: string) {
  return value.split("\u00C2\u00B7").join(" - ");
}

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
  return sanitizeUiCopy(
    sources
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
    .join(""),
  );
}

function renderPreviewMarkup(preview: CsvPreviewResponse | NotesPreviewResponse | null, sourceLabel: "notes" | "csv") {
  if (!preview) {
    return `
      <div class="empty-state import-empty-state">
        <p>Lance une preview depuis les notes ou depuis un CSV pour verifier les lignes avant import.</p>
      </div>
    `;
  }

  return sanitizeUiCopy(`
    <div class="import-preview-header">
      <div>
        <strong>${"filename" in preview ? preview.filename : `Capture ${sourceLabel}`}</strong>
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
  `);
}

function buildClaudeCsvPrompt() {
  return [
    "Transforme ce CSV bancaire en CSV normalise pour Finance Hub.",
    "Conserve uniquement les depenses positives.",
    "Sors exactement ces colonnes dans cet ordre :",
    "date,month_name,year,month,category,description,amount,reimbursement_to_parents,source",
    "",
    "Regles :",
    "- `date` au format YYYY-MM-DD si disponible, sinon vide.",
    "- `month_name` en francais: Janvier, Fevrier, Mars, Avril, Mai, Juin, Juillet, Aout, Septembre, Octobre, Novembre, Decembre.",
    "- `year` sur 4 chiffres.",
    "- `month` entre 1 et 12.",
    "- `category` choisie parmi: Alimentation, Transport, Loyer, Loisirs, Abonnements, Sante, Scolarite, Ponctuel, Autre.",
    "- `description` courte et propre.",
    "- `amount` en nombre positif avec point decimal.",
    "- `reimbursement_to_parents` vaut `yes` ou `no`.",
    "- `source` vaut `csv_import`.",
    "",
    "Ne retourne que le CSV final, sans commentaire ni markdown.",
  ].join("\n");
}

function buildNotesTemplate() {
  return [
    "2026-04-08 | Alimentation | Courses Carrefour | 32,50 | perso",
    "2026-04 | Loyer | Studio Paris | 650 | perso",
    "Avril 2026 | Transport | Train Lyon | 48,90 | parents",
  ].join("\n");
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

export async function renderDataRoomPage(): Promise<HTMLElement> {
  let sources = await fetchImportSources();
  let selectedFile: File | null = null;
  let preview: CsvPreviewResponse | NotesPreviewResponse | null = null;
  let previewSource: "notes" | "csv" = "notes";
  const claudePrompt = buildClaudeCsvPrompt();
  const notesTemplate = buildNotesTemplate();

  const section = document.createElement("section");
  section.className = "page-grid";
  section.innerHTML = `
    <section class="overview-hero">
      <div>
        <p class="eyebrow">Data</p>
        <h1>Entrer des notes, normaliser des CSV et sortir des rapports.</h1>
        <p class="hero-copy">Le flux principal part des notes rapides. Le CSV reste disponible en seconde voie avec aide de normalisation et export rapport depuis le site.</p>
      </div>
      <div class="overview-mini-stats">
        <article>
          <span>Modes d'entree</span>
          <strong>2</strong>
        </article>
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

    <section class="overview-layout data-room-grid">
      <article class="panel import-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Notes first</p>
            <h2>Capturer des depenses depuis des notes</h2>
          </div>
        </div>

        <div class="import-form">
          <label class="field manual-field manual-field-span">
            <span>Notes ligne par ligne</span>
            <textarea id="notesCaptureInput" class="notes-capture-input" placeholder="2026-04-08 | Alimentation | Courses Carrefour | 32,50 | perso&#10;2026-04 | Loyer | Studio Paris | 650 | perso&#10;Avril 2026 | Transport | Train Lyon | 48,90 | parents"></textarea>
          </label>
          <div class="csv-assist-block">
            <div class="csv-assist-head">
              <strong>Modele notes</strong>
              <button id="fillNotesTemplateButton" class="ghost-button" type="button">Charger un exemple</button>
            </div>
            <textarea id="notesTemplateOutput" class="claude-prompt-output" readonly>${notesTemplate}</textarea>
          </div>

          <label class="import-toggle">
            <input id="replaceNotesExistingInput" type="checkbox" />
            <span>Remplacer les transactions existantes avec cette capture</span>
          </label>

          <div class="import-actions">
            <button id="previewNotesButton" class="ghost-button" type="button">Preview notes</button>
            <button id="importNotesButton" class="primary-button import-primary" type="button">Importer les notes</button>
          </div>

          <p id="notesStatus" class="muted import-status">Utilise les notes comme entree principale pour construire une base propre.</p>
        </div>
      </article>

      <article class="panel import-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">CSV assist</p>
            <h2>Importer un CSV ou le faire normaliser avant</h2>
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

          <div class="csv-assist-block">
            <div class="csv-assist-head">
              <strong>Prompt Claude pour normaliser un CSV non compatible</strong>
              <button id="copyClaudePromptButton" class="ghost-button" type="button">Copier le prompt</button>
            </div>
            <textarea id="claudePromptOutput" class="claude-prompt-output" readonly>${claudePrompt}</textarea>
          </div>

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
            <p class="eyebrow">Exports</p>
            <h2>Sortir des rapports depuis le site</h2>
          </div>
        </div>
        <div class="import-form export-actions-block">
          <button id="downloadReportButton" class="primary-button import-primary" type="button">Telecharger le CSV rapport</button>
          <p id="reportStatus" class="muted import-status">Exporte la base normalisee actuelle sous forme de CSV rapport.</p>
        </div>
        <div class="panel-heading compact-heading">
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
          ${renderPreviewMarkup(preview, previewSource)}
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
            <strong>Capturer en notes</strong>
            <p>Tu notes rapidement les depenses par ligne puis tu verifies la preview.</p>
          </article>
          <article class="insight-card">
            <span class="badge badge-blue">2</span>
            <strong>Normaliser le CSV si besoin</strong>
            <p>Si ton export banque est exotique, tu peux le reformater avec le prompt Claude fourni.</p>
          </article>
          <article class="insight-card">
            <span class="badge badge-green">3</span>
            <strong>Importer une base propre</strong>
            <p>Le backend remplit ensuite la base exploitee par les dashboards.</p>
          </article>
          <article class="insight-card">
            <span class="badge badge-rose">4</span>
            <strong>Sortir un rapport CSV</strong>
            <p>Tu peux retelecharger un CSV propre depuis le site pour partage ou archivage.</p>
          </article>
        </div>
      </article>
    </section>
  `;

  const fileInput = section.querySelector<HTMLInputElement>("#csvUploadInput");
  const notesInput = section.querySelector<HTMLTextAreaElement>("#notesCaptureInput");
  const fileName = section.querySelector<HTMLElement>("#importFileName");
  const fileMeta = section.querySelector<HTMLElement>("#importFileMeta");
  const replaceExistingInput = section.querySelector<HTMLInputElement>("#replaceExistingInput");
  const replaceNotesExistingInput = section.querySelector<HTMLInputElement>("#replaceNotesExistingInput");
  const previewNotesButton = section.querySelector<HTMLButtonElement>("#previewNotesButton");
  const importNotesButton = section.querySelector<HTMLButtonElement>("#importNotesButton");
  const fillNotesTemplateButton = section.querySelector<HTMLButtonElement>("#fillNotesTemplateButton");
  const previewButton = section.querySelector<HTMLButtonElement>("#previewImportButton");
  const importButton = section.querySelector<HTMLButtonElement>("#runImportButton");
  const notesStatus = section.querySelector<HTMLElement>("#notesStatus");
  const status = section.querySelector<HTMLElement>("#importStatus");
  const reportStatus = section.querySelector<HTMLElement>("#reportStatus");
  const copyClaudePromptButton = section.querySelector<HTMLButtonElement>("#copyClaudePromptButton");
  const claudePromptOutput = section.querySelector<HTMLTextAreaElement>("#claudePromptOutput");
  const notesTemplateOutput = section.querySelector<HTMLTextAreaElement>("#notesTemplateOutput");
  const downloadReportButton = section.querySelector<HTMLButtonElement>("#downloadReportButton");
  const previewWrap = section.querySelector<HTMLElement>("#importPreviewWrap");
  const sourcesList = section.querySelector<HTMLElement>("#importSourcesList");

  if (
    !fileInput ||
    !notesInput ||
    !fileName ||
    !fileMeta ||
    !replaceExistingInput ||
    !replaceNotesExistingInput ||
    !previewNotesButton ||
    !importNotesButton ||
    !fillNotesTemplateButton ||
    !previewButton ||
    !importButton ||
    !notesStatus ||
    !status ||
    !reportStatus ||
    !copyClaudePromptButton ||
    !claudePromptOutput ||
    !notesTemplateOutput ||
    !downloadReportButton ||
    !previewWrap ||
    !sourcesList
  ) {
    return section;
  }

  const setBusy = (busy: boolean) => {
    fileInput.disabled = busy;
    notesInput.disabled = busy;
    replaceExistingInput.disabled = busy;
    replaceNotesExistingInput.disabled = busy;
    previewNotesButton.disabled = busy;
    importNotesButton.disabled = busy;
    fillNotesTemplateButton.disabled = busy;
    previewButton.disabled = busy;
    importButton.disabled = busy;
    copyClaudePromptButton.disabled = busy;
    downloadReportButton.disabled = busy;
    previewNotesButton.textContent = busy ? "Chargement..." : "Preview notes";
    importNotesButton.textContent = busy ? "Import en cours..." : "Importer les notes";
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
    previewSource = "csv";
    previewWrap.innerHTML = renderPreviewMarkup(preview, previewSource);

    if (!selectedFile) {
      fileName.textContent = "Choisir un export banque ou budget";
      fileMeta.textContent = "Le fichier reste prive, une copie horodatee est stockee dans le dossier data/imports.";
      status.textContent = "Selectionne un fichier pour lancer la preview.";
      return;
    }

    fileName.textContent = selectedFile.name;
    fileMeta.textContent = `${(selectedFile.size / 1024).toFixed(1)} Ko · ${selectedFile.type || "text/csv"}`;
    fileMeta.textContent = sanitizeUiCopy(fileMeta.textContent ?? "");
    status.textContent = "Fichier charge. Lance une preview pour verifier le parsing.";
  });

  previewNotesButton.addEventListener("click", async () => {
    const content = notesInput.value.trim();
    if (!content) {
      notesStatus.textContent = "Ajoute d'abord quelques lignes de notes.";
      return;
    }

    setBusy(true);
    notesStatus.textContent = "Lecture et structuration des notes...";

    try {
      preview = await previewNotesCapture(content);
      previewSource = "notes";
      previewWrap.innerHTML = renderPreviewMarkup(preview, previewSource);
      notesStatus.textContent = `${preview.detected_rows} lignes detectees depuis les notes.`;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      notesStatus.textContent = `Preview impossible: ${message}`;
    } finally {
      setBusy(false);
    }
  });

  fillNotesTemplateButton.addEventListener("click", () => {
    notesInput.value = notesTemplateOutput.value;
    notesStatus.textContent = "Exemple charge. Adapte les lignes puis lance la preview.";
  });

  importNotesButton.addEventListener("click", async () => {
    const content = notesInput.value.trim();
    if (!content) {
      notesStatus.textContent = "Ajoute d'abord quelques lignes de notes.";
      return;
    }

    setBusy(true);
    notesStatus.textContent = "Import des notes dans la base...";

    try {
      const result = await importNotesCapture(content, replaceNotesExistingInput.checked);
      await refreshSources();
      notesStatus.textContent = `${result.imported} lignes importees depuis les notes.`;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      notesStatus.textContent = `Import impossible: ${message}`;
    } finally {
      setBusy(false);
    }
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
      previewSource = "csv";
      previewWrap.innerHTML = renderPreviewMarkup(preview, previewSource);
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

  copyClaudePromptButton.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(claudePromptOutput.value);
      status.textContent = "Prompt Claude copie.";
    } catch {
      claudePromptOutput.select();
      status.textContent = "Copie automatique impossible. Le prompt a ete selectionne.";
    }
  });

  downloadReportButton.addEventListener("click", async () => {
    reportStatus.textContent = "Preparation du rapport CSV...";
    downloadReportButton.disabled = true;
    try {
      const { filename, blob } = await downloadTransactionsExport();
      downloadBlob(filename, blob);
      reportStatus.textContent = `Rapport telecharge: ${filename}.`;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      reportStatus.textContent = `Export impossible: ${message}`;
    } finally {
      downloadReportButton.disabled = false;
    }
  });

  return section;
}
