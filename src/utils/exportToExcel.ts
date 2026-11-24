import FileSaver from "file-saver";
import { ASVSRequirement, asvsChapters } from "../data/asvsData";
import { getVerificationGuide } from "./verificationGuide";
import { sanitizeCsvCell } from "./csv";
import { calculateAsvsCoverage } from "./asvsMetrics";
import { summarizeThreats, type Threat } from "./threatModel";

const { saveAs } = FileSaver;

export interface ExportOptions {
  analysisId?: string;
  analysisName?: string;
  targetLevel?: number | "all";
  onlyGaps?: boolean;
  includeSummary?: boolean;
  includeRequirements?: boolean;
  includeThreats?: boolean;
  density?: "comfortable" | "compact";
}

function getStoredAnalysisName(analysisId?: string): string {
  if (!analysisId) return "Bezpečnostná analýza systému";
  try {
    const raw = localStorage.getItem("atap_analyses");
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        const found = list.find((a: any) => a.id === analysisId);
        if (found && found.name) return found.name;
      }
    }
  } catch (e) {
    // fallback
  }
  return `Analýza #${analysisId}`;
}

function getSafeExportId(analysisId: string): string {
  return analysisId.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 80) || "analysis";
}

function isThreat(value: unknown): value is Threat {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const threat = value as Record<string, unknown>;
  return typeof threat.id === "string" &&
    typeof threat.title === "string" &&
    typeof threat.description === "string" &&
    typeof threat.stride === "string" &&
    ["Open", "Mitigated", "Remediated", "Accepted"].includes(threat.status as string) &&
    ["Very Low", "Low", "Medium", "High", "Critical"].includes(threat.risk as string);
}

export async function exportASVSToExcel(
  requirements: ASVSRequirement[],
  options: ExportOptions = {}
): Promise<void> {
  const {
    analysisId = "default",
    targetLevel = "all",
    onlyGaps = false,
    includeSummary = true,
    includeRequirements = true,
    includeThreats = true,
    density = "comfortable"
  } = options;
  if (!includeSummary && !includeRequirements && !includeThreats) {
    throw new Error("Vyberte aspoň jednu sekciu pre Excel export.");
  }

  const analysisName = options.analysisName || getStoredAnalysisName(analysisId);
  const { default: ExcelJS } = await import("exceljs");

  let scopedReqs = [...requirements];
  if (targetLevel !== "all") {
    scopedReqs = scopedReqs.filter(r => r.level <= targetLevel);
  }
  const filteredReqs = onlyGaps
    ? scopedReqs.filter(r => r.status === "Partial" || r.status === "Missing")
    : scopedReqs;

  let threats: Threat[] = [];
  if (includeSummary || includeThreats) {
    const savedThreats = localStorage.getItem(`atap_threats_${analysisId}`);
    if (savedThreats) {
      const parsed: unknown = JSON.parse(savedThreats);
      if (!Array.isArray(parsed) || !parsed.every(isThreat)) {
        throw new Error("Register hrozieb má neplatný formát; Excel export bol zrušený.");
      }
      threats = parsed;
    }
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "AVERT";
  workbook.lastModifiedBy = "AVERT Security Reviewer";
  workbook.created = new Date();
  workbook.modified = new Date();

  // -------------------------------------------------------------
  // 1. Súhrnný hárok (Executive Summary)
  // -------------------------------------------------------------
  const summarySheet = workbook.addWorksheet("Prehľad auditu", {
    views: [{ showGridLines: true }]
  });

  // Title
  summarySheet.mergeCells("A1:H1");
  const titleCell = summarySheet.getCell("A1");
  titleCell.value = "AVERT — OWASP ASVS 5.0 Security Assessment";
  titleCell.font = { name: "Calibri", size: 16, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0F172A" } // Slate-900
  };
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  summarySheet.getRow(1).height = 42;
  summarySheet.mergeCells("A2:H2");
  const subtitleCell = summarySheet.getCell("A2");
  subtitleCell.value = "Architecture · STRIDE · Risk · ASVS · Reports";
  subtitleCell.font = { name: "Calibri", size: 10, italic: true, color: { argb: "FF475569" } };
  subtitleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  summarySheet.getRow(2).height = 24;

  // Metadata block
  const dateStr = new Date().toLocaleDateString("sk-SK", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  summarySheet.getCell("A3").value = "Názov projektu / analýzy:";
  summarySheet.getCell("A3").font = { bold: true };
  summarySheet.getCell("B3").value = analysisName;

  summarySheet.getCell("A4").value = "Identifikátor analýzy:";
  summarySheet.getCell("A4").font = { bold: true };
  summarySheet.getCell("B4").value = analysisId;

  summarySheet.getCell("A5").value = "Dátum a čas exportu:";
  summarySheet.getCell("A5").font = { bold: true };
  summarySheet.getCell("B5").value = dateStr;

  summarySheet.getCell("A6").value = "Cieľová úroveň ASVS:";
  summarySheet.getCell("A6").font = { bold: true };
  summarySheet.getCell("B6").value = targetLevel === "all" ? "Všetky úrovne (L1-L3)" : `Level ${targetLevel}`;
  summarySheet.getCell("A7").value = "Detail požiadaviek:";
  summarySheet.getCell("A7").font = { bold: true };
  summarySheet.getCell("B7").value = onlyGaps
    ? "Filter detailu: iba Partial a Missing; súhrn pokrýva celý zvolený rozsah."
    : "Detail obsahuje všetky požiadavky vo zvolenom rozsahu.";

  // KPI calculations
  const total = scopedReqs.length;
  const implemented = scopedReqs.filter(r => r.status === "Implemented").length;
  const partial = scopedReqs.filter(r => r.status === "Partial").length;
  const missing = scopedReqs.filter(r => r.status === "Missing").length;
  const na = scopedReqs.filter(r => r.status === "N/A").length;
  const pending = scopedReqs.filter(r => (r.status as string) !== "Implemented" && (r.status as string) !== "Partial" && (r.status as string) !== "Missing" && (r.status as string) !== "N/A").length;
  const gaps = partial + missing;
  const coveragePct = calculateAsvsCoverage(scopedReqs);

  // Metrics KPI Table
  summarySheet.getCell("A8").value = "Kľúčové metriky auditu";
  summarySheet.getCell("A8").font = { bold: true, size: 13, color: { argb: "FF1E293B" } };

  const kpiHeaders = ["Metrika", "Počet požiadaviek", "Podiel z celku (%)", "Poznámka"];
  const kpiHeaderRow = summarySheet.addRow(kpiHeaders);
  kpiHeaderRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  const kpiData = [
    ["Kontroly v rozsahu", total, "100%", "Požiadavky vo vybranom rozsahu ASVS"],
    ["Splnené kontroly (Implemented)", implemented, total > 0 ? `${Math.round((implemented / total) * 100)}%` : "0%", "Plne implementované a overené riadiace prvky"],
    ["Identifikované bezpečnostné medzery (Gaps)", gaps, total > 0 ? `${Math.round((gaps / total) * 100)}%` : "0%", `Chýbajúce: ${missing}, Čiastočné: ${partial}`],
    ["Vylúčené z rozsahu (N/A)", na, total > 0 ? `${Math.round((na / total) * 100)}%` : "0%", "Nerelevantné technológie alebo funkcie"],
    ["Čakajúce na posúdenie (Pending)", pending, total > 0 ? `${Math.round((pending / total) * 100)}%` : "0%", "Zatiaľ neoverené požiadavky"],
    ["Pokrytie ASVS (vážené)", `${implemented} splnené · ${partial} čiastočné`, `${coveragePct}%`, "Implemented + 0,5 × Partial; Pending a N/A sa nezapočítavajú"]
  ];

  kpiData.forEach(row => {
    const addedRow = summarySheet.addRow(row);
    addedRow.getCell(2).alignment = { horizontal: "center" };
    addedRow.getCell(3).alignment = { horizontal: "center" };
  });

  summarySheet.addRow([]);
  const riskTitleRow = summarySheet.addRow(["Súhrn STRIDE a rizík"]);
  riskTitleRow.getCell(1).font = { bold: true, size: 13, color: { argb: "FF1E293B" } };
  const threatSummary = summarizeThreats(threats);
  [
    ["Hrozby spolu", threatSummary.total],
    ["Otvorené hrozby", threatSummary.open],
    ["Otvorené High / Critical", threatSummary.openHighOrCritical],
    ["Otvorené riziká podľa úrovne", (["Critical", "High", "Medium", "Low", "Very Low"] as const)
      .map(level => `${level}: ${threats.filter(threat => threat.status === "Open" && threat.risk === level).length}`)
      .join(" · ")]
  ].forEach(row => summarySheet.addRow(row));

  // Chapter breakdown table
  summarySheet.addRow([]);
  const chTitleRow = summarySheet.addRow(["Rozpad auditu podľa kapitol OWASP ASVS"]);
  chTitleRow.getCell(1).font = { bold: true, size: 13, color: { argb: "FF1E293B" } };

  const chHeaderRow = summarySheet.addRow([
    "Kapitola",
    "Názov bezpečnostnej domény",
    "Celkom",
    "Splnené",
    "Medzery (Gaps)",
    "N/A",
    "Čakajúce",
    "Pokrytie (%)"
  ]);
  chHeaderRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } }; // Dark Blue
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  asvsChapters.forEach(ch => {
    const chReqs = scopedReqs.filter(r => r.chapterId === ch.id);
    if (chReqs.length === 0) return;
    const chImpl = chReqs.filter(r => r.status === "Implemented").length;
    const chGaps = chReqs.filter(r => r.status === "Missing" || r.status === "Partial").length;
    const chNa = chReqs.filter(r => r.status === "N/A").length;
    const chPending = chReqs.filter(r => (r.status as string) !== "Implemented" && (r.status as string) !== "Missing" && (r.status as string) !== "Partial" && (r.status as string) !== "N/A").length;
    const chPct = calculateAsvsCoverage(chReqs);

    const r = summarySheet.addRow([
      `V${ch.id}`,
      ch.name,
      chReqs.length,
      chImpl,
      chGaps,
      chNa,
      chPending,
      `${chPct}%`
    ]);
    r.getCell(1).alignment = { horizontal: "center" };
    r.getCell(3).alignment = { horizontal: "center" };
    r.getCell(4).alignment = { horizontal: "center" };
    r.getCell(5).alignment = { horizontal: "center" };
    r.getCell(6).alignment = { horizontal: "center" };
    r.getCell(7).alignment = { horizontal: "center" };
    r.getCell(8).alignment = { horizontal: "center" };
  });

  summarySheet.columns = [
    { width: 28 },
    { width: 44 },
    { width: 14 },
    { width: 14 },
    { width: 16 },
    { width: 12 },
    { width: 14 },
    { width: 16 }
  ];

  // -------------------------------------------------------------
  // 2. Hárok požiadaviek (ASVS Requirements Detail)
  // -------------------------------------------------------------
  const reqSheet = workbook.addWorksheet("AVERT ASVS 5.0 Požiadavky", {
    views: [{ state: "frozen", ySplit: 1, showGridLines: true }]
  });

  const columns = [
    { header: "ID Požiadavky", key: "id", width: 15 },
    { header: "Kapitola", key: "chapter", width: 32 },
    { header: "Sekcia", key: "section", width: 34 },
    { header: "Level", key: "level", width: 10 },
    { header: "Popis bezpečnostnej požiadavky", key: "description", width: 55 },
    { header: "Stav overenia", key: "status", width: 16 },
    { header: "Dôvod vylúčenia / Triáž", key: "triageReason", width: 28 },
    { header: "Odporúčaná metóda overenia", key: "verificationMethod", width: 24 },
    { header: "Kľúčová otázka overenia", key: "keyQuestion", width: 45 },
    { header: "Poznámky audítora a evidencia", key: "notes", width: 45 },
    { header: "CWE", key: "cwe", width: 14 },
    { header: "NIST SP 800-53", key: "nist", width: 16 }
  ];

  reqSheet.columns = columns;

  // Header row styling
  const headerRow = reqSheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell(cell => {
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF0F172A" } // Dark Slate
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      bottom: { style: "medium", color: { argb: "FF334155" } }
    };
  });

  // Fill rows
  filteredReqs.forEach(req => {
    const chapter = asvsChapters.find(c => c.id === req.chapterId);
    const chapterText = chapter ? `V${chapter.id} - ${chapter.name}` : `V${req.chapterId}`;
    const sectionText = req.sectionName || req.section_name || req.title || (req.sectionId ? `Sekcia ${req.sectionId}` : "");
    const guide = getVerificationGuide(req);

    const reqAny = req as any;
    const row = reqSheet.addRow({
      id: req.id,
      chapter: chapterText,
      section: sectionText,
      level: `L${req.level}`,
      description: req.description || "",
      status: req.status || "Pending",
      triageReason: req.triageReason || (reqAny.triageExcluded ? "Vylúčené na základe dotazníka" : ""),
      verificationMethod: reqAny.verificationMethod || guide.method,
      keyQuestion: guide.keyQuestion || "",
      notes: req.notes || "",
      cwe: reqAny.cwe || "",
      nist: reqAny.nist || ""
    });

    row.height = density === "compact" ? 22 : 36;

    // Alignments
    row.getCell("id").alignment = { vertical: "top", horizontal: "center" };
    row.getCell("level").alignment = { vertical: "top", horizontal: "center" };
    row.getCell("status").alignment = { vertical: "top", horizontal: "center" };
    row.getCell("cwe").alignment = { vertical: "top", horizontal: "center" };
    row.getCell("nist").alignment = { vertical: "top", horizontal: "center" };
    row.getCell("chapter").alignment = { vertical: "top", horizontal: "left", wrapText: true };
    row.getCell("section").alignment = { vertical: "top", horizontal: "left", wrapText: true };
    row.getCell("description").alignment = { vertical: "top", horizontal: "left", wrapText: true };
    row.getCell("triageReason").alignment = { vertical: "top", horizontal: "left", wrapText: true };
    row.getCell("verificationMethod").alignment = { vertical: "top", horizontal: "left", wrapText: true };
    row.getCell("keyQuestion").alignment = { vertical: "top", horizontal: "left", wrapText: true };
    row.getCell("notes").alignment = { vertical: "top", horizontal: "left", wrapText: true };

    // Status coloring
    const statusCell = row.getCell("status");
    statusCell.font = { bold: true };
    switch (req.status) {
      case "Implemented":
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFDCFCE7" } }; // Green-100
        statusCell.font = { bold: true, color: { argb: "FF166534" } }; // Green-800
        break;
      case "Missing":
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } }; // Red-100
        statusCell.font = { bold: true, color: { argb: "FF991B1B" } }; // Red-800
        break;
      case "Partial":
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } }; // Amber-100
        statusCell.font = { bold: true, color: { argb: "FF92400E" } }; // Amber-800
        break;
      case "N/A":
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } }; // Slate-100
        statusCell.font = { bold: true, color: { argb: "FF475569" } }; // Slate-600
        break;
      default:
        statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFF6FF" } }; // Blue-50
        statusCell.font = { bold: true, color: { argb: "FF1E40AF" } }; // Blue-800
        break;
    }
  });

  // Enable AutoFilter on requirements sheet
  reqSheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: filteredReqs.length + 1, column: columns.length }
  };

  // -------------------------------------------------------------
  // 3. Hárok hrozieb (STRIDE Threat Register - ak existujú dáta)
  // -------------------------------------------------------------
  if (includeThreats && threats.length > 0) {
    const threatSheet = workbook.addWorksheet("STRIDE Register hrozieb", {
      views: [{ state: "frozen", ySplit: 1, showGridLines: true }]
    });

    threatSheet.columns = [
      { header: "ID Hrozby", key: "id", width: 14 },
      { header: "Názov hrozby", key: "title", width: 35 },
      { header: "Popis scenára", key: "description", width: 50 },
      { header: "STRIDE Kategória", key: "stride", width: 22 },
      { header: "Závažnosť (Impact)", key: "impact", width: 16 },
      { header: "Pravdepodobnosť", key: "likelihood", width: 16 },
      { header: "Celkové riziko", key: "risk", width: 16 },
      { header: "Stav", key: "status", width: 16 },
      { header: "ASVS referencie", key: "asvsRefs", width: 22 },
      { header: "Komponenty", key: "components", width: 28 },
      { header: "Pôvod / kontrola", key: "review", width: 24 },
      { header: "Zmierňujúce opatrenie", key: "mitigation", width: 45 }
    ];

    const tHeader = threatSheet.getRow(1);
    tHeader.height = 28;
    tHeader.eachCell(c => {
      c.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
      c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    });

    threats.forEach(threat => {
      const references = threat.asvsRefs || (threat.mitigation.match(/V\d+(?:\.\d+)*/g) || []);
      const row = threatSheet.addRow({
        id: threat.id,
        title: threat.title,
        description: threat.description,
        stride: threat.stride,
        impact: threat.impact,
        likelihood: threat.likelihood,
        risk: threat.risk,
        status: threat.status,
        asvsRefs: references.join(", "),
        components: threat.componentIds?.join(", ") || "",
        review: threat.architectureFlowId
          ? (threat.architectureReviewed ? "STRIDE návrh · skontrolovaný" : "STRIDE návrh · vyžaduje kontrolu")
          : "Manuálne zadaná hrozba",
        mitigation: threat.mitigation
      });

      for (const key of ["description", "asvsRefs", "components", "review", "mitigation"]) {
        row.getCell(key).alignment = { vertical: "top", wrapText: true };
      }
    });

    threatSheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: threats.length + 1, column: 12 }
    };
  }

  if (!includeSummary) {
    const sheet = workbook.getWorksheet("Prehľad auditu");
    if (sheet) workbook.removeWorksheet(sheet.id);
  }
  if (!includeRequirements) {
    const sheet = workbook.getWorksheet("AVERT ASVS 5.0 Požiadavky");
    if (sheet) workbook.removeWorksheet(sheet.id);
  }

  // -------------------------------------------------------------
  // Vygenerovanie binárneho súboru .xlsx a spustenie stiahnutia
  // -------------------------------------------------------------
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  });

  const cleanFilename = `avert_asvs_5.0_audit_${getSafeExportId(analysisId)}_${new Date().toISOString().slice(0, 10)}.xlsx`;

  try {
    saveAs(blob, cleanFilename);
  } catch (e) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = cleanFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export function exportASVSToCSV(
  requirements: ASVSRequirement[],
  options: ExportOptions = {}
): void {
  const {
    analysisId = "default",
    targetLevel = "all",
    onlyGaps = false
  } = options;

  let filteredReqs = [...requirements];
  if (targetLevel !== "all") {
    filteredReqs = filteredReqs.filter(r => r.level <= targetLevel);
  }
  if (onlyGaps) {
    filteredReqs = filteredReqs.filter(r => r.status === "Partial" || r.status === "Missing");
  }

  // Helper to prevent CSV / Formula Injection (CWE-1236)
  const header = "Requirement ID,Chapter ID,Chapter Name,Section ID,Section Name,Level,Requirement Description,Status,Triage Justification,Notes\n";
  const csvRows = filteredReqs.map(r => {
    const chapter = asvsChapters.find(c => c.id === r.chapterId);
    return [
      sanitizeCsvCell(r.id),
      sanitizeCsvCell(`V${r.chapterId}`),
      sanitizeCsvCell(chapter?.name || ""),
      sanitizeCsvCell(r.sectionId || ""),
      sanitizeCsvCell(r.sectionName || r.section_name || r.title || ""),
      sanitizeCsvCell(r.level),
      sanitizeCsvCell(r.description || ""),
      sanitizeCsvCell(r.status),
      sanitizeCsvCell(r.triageReason || ""),
      sanitizeCsvCell(r.notes || ""),
    ].join(",");
  }).join("\n");

  // Include UTF-8 BOM (\uFEFF) so Excel on Windows opens diacritics / special characters correctly
  const blob = new Blob(["\uFEFF" + header + csvRows], { type: "text/csv;charset=utf-8;" });
  const cleanFilename = `avert_asvs_5.0_analysis_${getSafeExportId(analysisId)}_${new Date().toISOString().slice(0, 10)}.csv`;

  try {
    saveAs(blob, cleanFilename);
  } catch (e) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = cleanFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
