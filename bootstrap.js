const { FilePicker } = ChromeUtils.importESModule("chrome://zotero/content/modules/filePicker.mjs");

const PREF_ROOT_PATH = "extensions.zoteroRootPdfMatcher.rootPath";
const PREF_SCAN_MAX_DEPTH = "extensions.zoteroRootPdfMatcher.scanMaxDepth";
const PREF_CONFIRM_FULL_SCAN = "extensions.zoteroRootPdfMatcher.confirmBeforeFullScan";
const MENU_PLUGIN_ID = "zotero-root-pdf-matcher@fabio.dev";
const MENU_ID = "zotero-root-pdf-matcher-menu";
const DOI_REGEX = /\b10\.\d{4,9}\/[\-._;()/:A-Z0-9]+\b/i;
const MAX_HEADER_BYTES = 2048;
const EXTRA_TAG = "PDF anexado automaticamente via Root Matcher";
const CACHE_FILE_NAME = "root-pdf-matcher-cache.json";
const CACHE_VERSION = 1;
const HISTORY_LIMIT = 30;
const HISTORY_PREVIEW_LIMIT = 10;
const APP_TITLE = "Matcher de PDFs";
const MENU_SUBMENU_LABEL = "Matcher de PDFs";
const MENU_ACTION_RUN_LABEL = "Anexar PDFs por DOI";
const MENU_ACTION_CONFIG_LABEL = "Definir pasta raiz de PDFs";
const MENU_ACTION_REINDEX_LABEL = "Reindexar cache";
const MENU_ACTION_CLEAR_LABEL = "Limpar cache";
const MENU_ACTION_HISTORY_LABEL = "Historico recente";
const MENU_ACTION_DIAGNOSTIC_LABEL = "Diagnostico rapido";
const MENU_SUBMENU_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='context-fill' d='M3 1h7l3 3v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zm6 1v3h3'/%3E%3Cpath fill='context-fill' d='M4.2 11.8h1v-3.6h-1zm1.8-3.6h1.3c1.1 0 1.8.6 1.8 1.6s-.7 1.6-1.8 1.6H7v1.4H6zm1 .8v1.6h.3c.5 0 .8-.3.8-.8s-.3-.8-.8-.8zm2.5-.8h2.3v.8h-1.3v.7h1.2v.8h-1.2v1.7h-1z'/%3E%3C/svg%3E";
const MENU_ACTION_RUN_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='context-fill' d='M4 2.5v11l9-5.5z'/%3E%3C/svg%3E";
const MENU_ACTION_CONFIG_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='context-fill' d='M1.5 4a1 1 0 0 1 1-1h3l1 1h7a1 1 0 0 1 1 1v6.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 1.5 11.5z'/%3E%3C/svg%3E";
const MENU_ACTION_HISTORY_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='6' fill='none' stroke='context-fill' stroke-width='1.5'/%3E%3Cpath fill='context-fill' d='M7.2 4.5h1.2v3.1l2.2 1.3-.6 1-2.8-1.7z'/%3E%3C/svg%3E";
const MENU_ACTION_REINDEX_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='context-fill' d='M8 2a5.5 5.5 0 0 1 4.8 2.8V3.5h1.2v3.6h-3.6V5.9h1.7A4.3 4.3 0 0 0 8 3.2a4.4 4.4 0 0 0-4.2 3.2H2.6A5.6 5.6 0 0 1 8 2zm5.4 7.6A5.6 5.6 0 0 1 8 14a5.5 5.5 0 0 1-4.8-2.8v1.3H2v-3.6h3.6v1.2H3.9A4.3 4.3 0 0 0 8 12.8a4.4 4.4 0 0 0 4.2-3.2z'/%3E%3C/svg%3E";
const MENU_ACTION_CLEAR_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='context-fill' d='M6 1.8h4l.6 1.2H13v1.2H3V3h2.4zM4.5 5.2h7l-.6 8.3a1 1 0 0 1-1 .9H6.1a1 1 0 0 1-1-.9z'/%3E%3C/svg%3E";
const MENU_ACTION_DIAGNOSTIC_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Ccircle cx='8' cy='8' r='6' fill='none' stroke='context-fill' stroke-width='1.5'/%3E%3Cpath fill='context-fill' d='M7.3 11.5h1.4V7.2H7.3zm0-5.5h1.4v1.4H7.3z'/%3E%3C/svg%3E";
const REINDEX_CONFIRM_DIR_THRESHOLD = 200;
const REINDEX_CONFIRM_PDF_THRESHOLD = 800;
const REINDEX_ESTIMATE_DIR_SCAN_LIMIT = 400;
const REINDEX_ESTIMATE_PDF_SCAN_LIMIT = 1200;

let registeredMenuID = null;

function startup() {
  Zotero.debug("Root PDF Matcher | Iniciado");
  registerOfficialMenus();
}

function shutdown() {
  Zotero.debug("Root PDF Matcher | Desativado");
  unregisterOfficialMenus();
}

function install() {}
function uninstall() {}

function getMainWindow() {
  return Zotero.getMainWindow();
}

function buildMenuItem(label, command, icon, darkIcon) {
  return {
    menuType: "menuitem",
    onShowing: (_event, context) => {
      if (context?.menuElem) {
        context.menuElem.setAttribute("label", label);
      }
      if (icon && typeof context?.setIcon === "function") {
        context.setIcon(icon, darkIcon);
      }
    },
    onCommand: () => {
      command().catch((err) => {
        Zotero.logError(err);
      });
    }
  };
}

function buildMenuSubmenu(label, menus, icon, darkIcon) {
  return {
    menuType: "submenu",
    onShowing: (_event, context) => {
      if (context?.menuElem) {
        context.menuElem.setAttribute("label", label);
      }
      if (icon && typeof context?.setIcon === "function") {
        context.setIcon(icon, darkIcon);
      }
    },
    menus
  };
}

function buildMenuSeparator() {
  return {
    menuType: "separator"
  };
}

function registerOfficialMenus() {
  if (registeredMenuID) {
    return registeredMenuID;
  }

  const menuID = Zotero.MenuManager.registerMenu({
    menuID: MENU_ID,
    pluginID: MENU_PLUGIN_ID,
    target: "main/menubar/tools",
    menus: [buildMenuSubmenu(MENU_SUBMENU_LABEL, [
      buildMenuItem(MENU_ACTION_CONFIG_LABEL, chooseAndSaveRootFolder, MENU_ACTION_CONFIG_ICON),
      buildMenuItem(MENU_ACTION_RUN_LABEL, runMatcher, MENU_ACTION_RUN_ICON),
      buildMenuSeparator(),
      buildMenuItem(MENU_ACTION_HISTORY_LABEL, showHistoryInteractive, MENU_ACTION_HISTORY_ICON),
      buildMenuItem(MENU_ACTION_DIAGNOSTIC_LABEL, showDiagnosticInteractive, MENU_ACTION_DIAGNOSTIC_ICON),
      buildMenuItem(MENU_ACTION_REINDEX_LABEL, reindexCacheInteractive, MENU_ACTION_REINDEX_ICON),
      buildMenuItem(MENU_ACTION_CLEAR_LABEL, clearCacheInteractive, MENU_ACTION_CLEAR_ICON)
    ], MENU_SUBMENU_ICON)]
  });

  if (!menuID) {
    Zotero.logError(new Error("Root PDF Matcher | Zotero.MenuManager.registerMenu retornou falso"));
    throw new Error("Root PDF Matcher | Falha ao registrar menu oficial");
  }

  registeredMenuID = menuID;
  return registeredMenuID;
}

function unregisterOfficialMenus() {
  if (!registeredMenuID) {
    return;
  }

  Zotero.MenuManager.unregisterMenu(registeredMenuID);
  registeredMenuID = null;
}

async function chooseAndSaveRootFolder() {
  const win = getMainWindow();
  if (!win) {
    throw new Error("Janela principal do Zotero indisponivel");
  }

  const fp = new FilePicker();
  fp.init(win, "Selecione a pasta raiz de PDFs", fp.modeGetFolder);
  const rv = await fp.show();
  if (rv !== fp.returnOK || !fp.file) {
    Zotero.debug("Root PDF Matcher | Selecao de pasta cancelada");
    return null;
  }

  const rootPath = fp.file.path;
  Zotero.Prefs.set(PREF_ROOT_PATH, rootPath);
  Zotero.debug(`Root PDF Matcher | Pasta raiz salva: ${rootPath}`);
  return rootPath;
}

async function getOrConfigureRootPath() {
  let rootPath = Zotero.Prefs.get(PREF_ROOT_PATH);
  if (rootPath) {
    return rootPath;
  }
  return chooseAndSaveRootFolder();
}

function normalizeDOI(doi) {
  if (!doi) {
    return "";
  }
  return String(doi).trim().toLowerCase();
}

async function runMatcher() {
  const startedAt = Date.now();
  const rootPath = await getOrConfigureRootPath();
  if (!rootPath) {
    return;
  }

  const selectionResult = await getCandidateItems();
  if (selectionResult.cancelled) {
    Zotero.debug("Root PDF Matcher | Operacao cancelada pelo usuario");
    return;
  }

  const items = selectionResult.items;
  if (!items.length) {
    Zotero.debug("Root PDF Matcher | Nenhum item elegivel encontrado");
    return;
  }

  const scanMaxDepth = getScanMaxDepth();

  const targetDOIs = new Set();
  for (const item of items) {
    const doi = normalizeDOI(item.getField("DOI"));
    if (doi) {
      targetDOIs.add(doi);
    }
  }

  if (!targetDOIs.size) {
    Zotero.debug("Root PDF Matcher | Nenhum DOI valido entre os itens elegiveis");
    return;
  }

  let cache = await loadValidCache(rootPath);
  if (!cache) {
    cache = {
      version: CACHE_VERSION,
      rootPath,
      builtAt: new Date().toISOString(),
      doiToFile: {}
    };
  }

  const doiToFileMap = new Map();
  let cacheHits = 0;

  for (const doi of targetDOIs) {
    const path = cache.doiToFile[doi];
    if (!path) {
      continue;
    }
    if (await IOUtils.exists(path)) {
      doiToFileMap.set(doi, path);
      cacheHits++;
    }
    else {
      delete cache.doiToFile[doi];
    }
  }

  cache.builtAt = new Date().toISOString();

  const missingDOIs = new Set();
  for (const doi of targetDOIs) {
    if (!doiToFileMap.has(doi)) {
      missingDOIs.add(doi);
    }
  }

  let scannedPdfCount = 0;
  if (missingDOIs.size) {
    Zotero.debug(`Root PDF Matcher | Escaneando PDFs em: ${rootPath} (faltantes: ${missingDOIs.size})`);
    const scanResult = await buildDoiFileMap(rootPath, missingDOIs, scanMaxDepth);
    scannedPdfCount = scanResult.pdfScanned;
    for (const [doi, filePath] of scanResult.doiToFileMap.entries()) {
      doiToFileMap.set(doi, filePath);
      cache.doiToFile[doi] = filePath;
    }
  }

  let attachedCount = 0;
  let notFoundCount = 0;
  let failedCount = 0;
  for (const item of items) {
    try {
      const doi = normalizeDOI(item.getField("DOI"));
      if (!doi) {
        continue;
      }
      const filePath = doiToFileMap.get(doi);
      if (!filePath) {
        notFoundCount++;
        continue;
      }

      await attachPdfToItem(item, filePath);
      attachedCount++;
    }
    catch (err) {
      failedCount++;
      Zotero.logError(err);
    }
  }

  const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(2);
  appendHistoryEntry(cache, {
    event: "match-run",
    at: new Date().toISOString(),
    scope: selectionResult.scope,
    scanMaxDepth,
    processedCount: items.length,
    attachedCount,
    notFoundCount,
    failedCount,
    cacheHits,
    scannedPdfCount,
    elapsedSeconds: Number(elapsedSeconds)
  });
  await writeCache(cache);

  Zotero.debug(`Root PDF Matcher | Concluido. PDFs anexados: ${attachedCount}`);
  showExecutionReport({
    processedCount: items.length,
    attachedCount,
    notFoundCount,
    failedCount,
    cacheHits,
    scannedPdfCount,
    elapsedSeconds,
    scope: selectionResult.scope,
    scanMaxDepth
  });
}

async function getCandidateItems() {
  const pane = Zotero.getActiveZoteroPane();
  let items = pane ? pane.getSelectedItems() : [];
  let scope = "selection";

  if (!items || !items.length) {
    if (!(await confirmFullLibraryScan())) {
      return { items: [], cancelled: true, scope: "library" };
    }
    scope = "library";
    items = await Zotero.Items.getAll(Zotero.Libraries.userLibraryID, true, false);
  }

  const candidates = [];
  for (const item of items) {
    if (!item || !item.isRegularItem()) {
      continue;
    }

    const doi = normalizeDOI(item.getField("DOI"));
    if (!doi) {
      continue;
    }

    const hasPDF = await itemHasPDFAttachment(item);
    if (!hasPDF) {
      candidates.push(item);
    }
  }

  return { items: candidates, cancelled: false, scope };
}

async function confirmFullLibraryScan() {
  const shouldConfirm = getBoolPref(PREF_CONFIRM_FULL_SCAN, true);
  if (!shouldConfirm) {
    return true;
  }

  const win = getMainWindow();
  if (!win || typeof win.confirm !== "function") {
    return true;
  }

  return win.confirm(
    "Nenhum item selecionado. Deseja processar toda a biblioteca de usuario agora?"
  );
}

function getScanMaxDepth() {
  const raw = getPrefOrDefault(PREF_SCAN_MAX_DEPTH, -1);
  const value = Number.parseInt(raw, 10);
  if (Number.isNaN(value)) {
    return -1;
  }
  return value;
}

function getPrefOrDefault(prefKey, fallback) {
  const value = Zotero.Prefs.get(prefKey);
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  return value;
}

function getBoolPref(prefKey, fallback) {
  const value = getPrefOrDefault(prefKey, fallback);
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true" || normalized === "1" || normalized === "yes") {
      return true;
    }
    if (normalized === "false" || normalized === "0" || normalized === "no") {
      return false;
    }
  }
  return Boolean(value);
}

async function itemHasPDFAttachment(item) {
  const attachmentIDs = item.getAttachments();
  for (const attachmentID of attachmentIDs) {
    const att = await Zotero.Items.getAsync(attachmentID);
    if (att && att.isAttachment() && att.attachmentContentType === "application/pdf") {
      return true;
    }
  }
  return false;
}

async function buildDoiFileMap(rootPath, targetDOIs, scanMaxDepth = -1) {
  const doiToFileMap = new Map();
  const stack = [{ path: rootPath, depth: 0 }];
  let pdfScanned = 0;

  while (stack.length && doiToFileMap.size < targetDOIs.size) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    const currentDir = current.path;
    const currentDepth = current.depth;

    try {
      const childPaths = await IOUtils.getChildren(currentDir);
      for (const childPath of childPaths) {
        let isDirectory = false;
        try {
          const childChildren = await IOUtils.getChildren(childPath);
          isDirectory = Array.isArray(childChildren);
        }
        catch (_err) {
          isDirectory = false;
        }

        if (isDirectory) {
          if (scanMaxDepth < 0 || currentDepth < scanMaxDepth) {
            stack.push({ path: childPath, depth: currentDepth + 1 });
          }
          continue;
        }

        if (childPath.toLowerCase().endsWith(".pdf")) {
          pdfScanned++;
          const doi = await findDOIInPDF(childPath, getFileName(childPath));
          if (doi && targetDOIs.has(doi) && !doiToFileMap.has(doi)) {
            doiToFileMap.set(doi, childPath);
          }
        }
      }
    }
    catch (err) {
      Zotero.logError(err);
    }
  }

  return { doiToFileMap, pdfScanned };
}

async function findDOIInPDF(filePath, fileName) {
  const filenameMatch = extractDOI(fileName || "");
  if (filenameMatch) {
    return filenameMatch;
  }

  try {
    const headerText = await readPdfHeader(filePath, MAX_HEADER_BYTES);
    return extractDOI(headerText);
  }
  catch (err) {
    Zotero.logError(err);
    return null;
  }
}

function extractDOI(text) {
  if (!text) {
    return null;
  }
  const match = String(text).match(DOI_REGEX);
  return match ? normalizeDOI(match[0]) : null;
}

async function readPdfHeader(filePath, maxBytes) {
  const bytes = await IOUtils.read(filePath, { maxBytes });
  return new TextDecoder("latin1").decode(bytes);
}

async function attachPdfToItem(item, filePath) {
  await Zotero.Attachments.importFromFile({
    file: Zotero.File.pathToFile(filePath),
    parentItemID: item.id,
    libraryID: item.libraryID
  });

  const previousExtra = item.getField("extra") || "";
  if (!previousExtra.includes(EXTRA_TAG)) {
    const nextExtra = previousExtra ? `${previousExtra}\n${EXTRA_TAG}` : EXTRA_TAG;
    item.setField("extra", nextExtra);
    await item.saveTx();
  }
}

function getCacheFilePath() {
  const basePath = String(Zotero.DataDirectory.dir).replace(/[\\/]+$/, "");
  return `${basePath}/${CACHE_FILE_NAME}`;
}

function getFileName(filePath) {
  return String(filePath).split(/[\\/]/).pop();
}

async function readCache() {
  const cachePath = getCacheFilePath();
  const exists = await IOUtils.exists(cachePath);
  if (!exists) {
    return null;
  }

  try {
    const raw = await IOUtils.readUTF8(cachePath);
    const parsed = JSON.parse(raw);
    return parsed;
  }
  catch (err) {
    Zotero.logError(err);
    return null;
  }
}

async function writeCache(cacheObject) {
  const cachePath = getCacheFilePath();
  const payload = JSON.stringify(cacheObject);
  await IOUtils.writeUTF8(cachePath, payload);
}

async function loadValidCache(rootPath) {
  const cache = await readCache();
  if (!cache) {
    return null;
  }
  if (cache.version !== CACHE_VERSION) {
    return null;
  }
  if (cache.rootPath !== rootPath) {
    return null;
  }
  if (!cache.doiToFile || typeof cache.doiToFile !== "object") {
    return null;
  }
  if (!Array.isArray(cache.history)) {
    cache.history = [];
  }
  return cache;
}

async function reindexCacheInteractive() {
  const startedAt = Date.now();
  const rootPath = await getOrConfigureRootPath();
  if (!rootPath) {
    return;
  }

  const cache = {
    version: CACHE_VERSION,
    rootPath,
    builtAt: new Date().toISOString(),
    doiToFile: {},
    history: []
  };

  const scanMaxDepth = getScanMaxDepth();
  if (!(await confirmLargeReindex(rootPath, scanMaxDepth))) {
    Zotero.debug("Root PDF Matcher | Reindexacao cancelada pelo usuario");
    return;
  }

  const stats = {
    pdfScanned: 0,
    doiIndexed: 0,
    scanErrors: 0
  };

  const stack = [{ path: rootPath, depth: 0 }];
  while (stack.length) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    const currentDir = current.path;
    const currentDepth = current.depth;

    try {
      const childPaths = await IOUtils.getChildren(currentDir);
      for (const childPath of childPaths) {
        let isDirectory = false;
        try {
          const childChildren = await IOUtils.getChildren(childPath);
          isDirectory = Array.isArray(childChildren);
        }
        catch (_err) {
          isDirectory = false;
        }

        if (isDirectory) {
          if (scanMaxDepth < 0 || currentDepth < scanMaxDepth) {
            stack.push({ path: childPath, depth: currentDepth + 1 });
          }
          continue;
        }

        if (childPath.toLowerCase().endsWith(".pdf")) {
          stats.pdfScanned++;
          const doi = await findDOIInPDF(childPath, getFileName(childPath));
          if (doi && !cache.doiToFile[doi]) {
            cache.doiToFile[doi] = childPath;
            stats.doiIndexed++;
          }
        }
      }
    }
    catch (err) {
      stats.scanErrors++;
      Zotero.logError(err);
    }
  }

  appendHistoryEntry(cache, {
    event: "reindex",
    at: new Date().toISOString(),
    scanMaxDepth,
    pdfScanned: stats.pdfScanned,
    doiIndexed: stats.doiIndexed,
    scanErrors: stats.scanErrors
  });

  await writeCache(cache);
  const elapsedSeconds = ((Date.now() - startedAt) / 1000).toFixed(2);
  showPopup(
    `${APP_TITLE} | Reindexacao concluida`,
    [
      `Pasta raiz: ${rootPath}`,
      `PDFs escaneados: ${stats.pdfScanned}`,
      `DOIs indexados: ${stats.doiIndexed}`,
      `Erros de varredura: ${stats.scanErrors}`,
      `Profundidade maxima: ${scanMaxDepth < 0 ? "sem limite" : scanMaxDepth}`,
      `Tempo total (s): ${elapsedSeconds}`
    ].join("\n")
  );
}

function showExecutionReport({
  processedCount,
  attachedCount,
  notFoundCount,
  failedCount,
  cacheHits,
  scannedPdfCount,
  elapsedSeconds,
  scope,
  scanMaxDepth
}) {
  showPopup(
    `${APP_TITLE} | Relatorio de execucao`,
    [
      `Escopo: ${scope === "library" ? "biblioteca inteira" : "selecao atual"}`,
      `Profundidade maxima: ${scanMaxDepth < 0 ? "sem limite" : scanMaxDepth}`,
      `Itens processados: ${processedCount}`,
      `PDFs anexados: ${attachedCount}`,
      `Nao encontrados: ${notFoundCount}`,
      `Falhas: ${failedCount}`,
      `Acertos no cache: ${cacheHits}`,
      `PDFs escaneados nesta execucao: ${scannedPdfCount}`,
      `Tempo total (s): ${elapsedSeconds}`
    ].join("\n")
  );
}

async function clearCacheInteractive() {
  const cachePath = getCacheFilePath();
  const exists = await IOUtils.exists(cachePath);
  if (!exists) {
    showPopup(`${APP_TITLE} | Limpeza de cache`, "Cache inexistente. Nada para limpar.");
    return;
  }

  await IOUtils.remove(cachePath);
  showPopup(`${APP_TITLE} | Limpeza de cache`, "Cache removido com sucesso.");
}

async function showHistoryInteractive() {
  const cache = await readCache();
  if (!cache || !Array.isArray(cache.history) || !cache.history.length) {
    showPopup(`${APP_TITLE} | Historico`, "Historico vazio. Execute o matcher ou reindexe o cache primeiro.");
    return;
  }

  const latestEntries = cache.history.slice(-HISTORY_PREVIEW_LIMIT).reverse();
  const lines = [];
  lines.push(`Mostrando ultimos ${latestEntries.length} eventos:`);

  for (const entry of latestEntries) {
    const timestamp = entry.at || "sem-data";
    if (entry.event === "reindex") {
      lines.push(
        `${timestamp} | reindex | PDFs: ${entry.pdfScanned || 0} | DOIs: ${entry.doiIndexed || 0} | erros: ${entry.scanErrors || 0}`
      );
      continue;
    }

    if (entry.event === "match-run") {
      lines.push(
        `${timestamp} | match | anexados: ${entry.attachedCount || 0} | nao encontrados: ${entry.notFoundCount || 0} | falhas: ${entry.failedCount || 0} | cache hits: ${entry.cacheHits || 0}`
      );
      continue;
    }

    lines.push(`${timestamp} | evento: ${entry.event || "desconhecido"}`);
  }

  showPopup(`${APP_TITLE} | Historico recente`, lines.join("\n"));
}

async function showDiagnosticInteractive() {
  const rootPath = getPrefOrDefault(PREF_ROOT_PATH, "");
  const scanMaxDepth = getScanMaxDepth();
  const confirmFullScan = getBoolPref(PREF_CONFIRM_FULL_SCAN, true);
  const cachePath = getCacheFilePath();
  const cacheExists = await IOUtils.exists(cachePath);
  let cacheSize = "n/d";
  let cacheBuiltAt = "n/d";
  let cacheHistoryCount = 0;

  if (cacheExists) {
    try {
      const stat = await IOUtils.stat(cachePath);
      cacheSize = `${stat.size} bytes`;
    }
    catch (_err) {
      cacheSize = "erro ao ler";
    }

    const cache = await readCache();
    if (cache && typeof cache === "object") {
      cacheBuiltAt = cache.builtAt || "n/d";
      cacheHistoryCount = Array.isArray(cache.history) ? cache.history.length : 0;
    }
  }

  let rootPathExists = false;
  if (rootPath) {
    rootPathExists = await IOUtils.exists(rootPath);
  }

  showPopup(
    `${APP_TITLE} | Diagnostico rapido`,
    [
      `Versao do plugin: 1.1.0`,
      `Pasta raiz configurada: ${rootPath ? "sim" : "nao"}`,
      `Pasta raiz existe: ${rootPath ? (rootPathExists ? "sim" : "nao") : "n/d"}`,
      `Pasta raiz: ${rootPath || "(nao definida)"}`,
      `Profundidade maxima: ${scanMaxDepth < 0 ? "sem limite" : scanMaxDepth}`,
      `Confirmar varredura completa: ${confirmFullScan ? "sim" : "nao"}`,
      `Cache existe: ${cacheExists ? "sim" : "nao"}`,
      `Cache caminho: ${cachePath}`,
      `Cache tamanho: ${cacheSize}`,
      `Cache builtAt: ${cacheBuiltAt}`,
      `Eventos no historico: ${cacheHistoryCount}`
    ].join("\n")
  );
}

async function confirmLargeReindex(rootPath, scanMaxDepth) {
  const estimate = await estimateReindexCost(rootPath, scanMaxDepth);
  const shouldConfirm = estimate.hitLimit
    || estimate.directoriesVisited >= REINDEX_CONFIRM_DIR_THRESHOLD
    || estimate.pdfFilesFound >= REINDEX_CONFIRM_PDF_THRESHOLD;
  if (!shouldConfirm) {
    return true;
  }

  const win = getMainWindow();
  if (!win || typeof win.confirm !== "function") {
    return true;
  }

  const dirCount = estimate.hitLimit ? `${estimate.directoriesVisited}+` : `${estimate.directoriesVisited}`;
  const pdfCount = estimate.hitLimit ? `${estimate.pdfFilesFound}+` : `${estimate.pdfFilesFound}`;
  return win.confirm(
    [
      "A reindexacao pode demorar.",
      `Pastas estimadas: ${dirCount}`,
      `PDFs estimados: ${pdfCount}`,
      "Deseja continuar?"
    ].join("\n")
  );
}

async function estimateReindexCost(rootPath, scanMaxDepth) {
  const stack = [{ path: rootPath, depth: 0 }];
  let directoriesVisited = 0;
  let pdfFilesFound = 0;

  while (stack.length) {
    const current = stack.pop();
    if (!current) {
      continue;
    }

    directoriesVisited++;
    if (directoriesVisited >= REINDEX_ESTIMATE_DIR_SCAN_LIMIT || pdfFilesFound >= REINDEX_ESTIMATE_PDF_SCAN_LIMIT) {
      return {
        directoriesVisited,
        pdfFilesFound,
        hitLimit: true
      };
    }

    try {
      const childPaths = await IOUtils.getChildren(current.path);
      for (const childPath of childPaths) {
        let isDirectory = false;
        try {
          const childChildren = await IOUtils.getChildren(childPath);
          isDirectory = Array.isArray(childChildren);
        }
        catch (_err) {
          isDirectory = false;
        }

        if (isDirectory) {
          if (scanMaxDepth < 0 || current.depth < scanMaxDepth) {
            stack.push({ path: childPath, depth: current.depth + 1 });
          }
          continue;
        }

        if (childPath.toLowerCase().endsWith(".pdf")) {
          pdfFilesFound++;
          if (pdfFilesFound >= REINDEX_ESTIMATE_PDF_SCAN_LIMIT) {
            return {
              directoriesVisited,
              pdfFilesFound,
              hitLimit: true
            };
          }
        }
      }
    }
    catch (_err) {
      // Keep estimate resilient on unreadable folders.
    }
  }

  return {
    directoriesVisited,
    pdfFilesFound,
    hitLimit: false
  };
}

function appendHistoryEntry(cache, entry) {
  if (!cache || typeof cache !== "object") {
    return;
  }
  if (!Array.isArray(cache.history)) {
    cache.history = [];
  }
  cache.history.push(entry);
  if (cache.history.length > HISTORY_LIMIT) {
    cache.history = cache.history.slice(cache.history.length - HISTORY_LIMIT);
  }
}

function showPopup(title, body) {
  const win = getMainWindow();
  const message = body || "";
  if (win && typeof win.alert === "function") {
    win.alert(`${title}\n\n${message}`);
    return;
  }
  Zotero.debug(`${title} | ${message}`);
}
