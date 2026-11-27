import FileSaver from "file-saver";
import { ASVSRequirement, asvsChapters } from "../data/asvsData";
import { getVerificationGuide } from "./verificationGuide";
import { sanitizeCsvCell } from "./csv";
import { calculateAsvsCoverage } from "./asvsMetrics";
import { summarizeThreats, type Threat } from "./threatModel";
import { reportText, type ReportLanguage } from "./reportLanguage";

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
  language?: ReportLanguage;
}

function getStoredAnalysisName(analysisId: string | undefined, language: ReportLanguage): string {
  if (!analysisId) return reportText(language, "Bezpečnostná analýza systému", "System security assessment");
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
  return reportText(language, `Analýza #${analysisId}`, `Analysis #${analysisId}`);
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
    density = "comfortable",
    language = "sk"
  } = options;
  const t = (sk: string, en: string) => reportText(language, sk, en);
  if (!includeSummary && !includeRequirements && !includeThreats) {
    throw new Error("Vyberte aspoň jednu sekciu pre Excel export.");
  }

  const analysisName = options.analysisName || getStoredAnalysisName(analysisId, language);
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
  const summarySheet = workbook.addWorksheet(t("Prehľad auditu", "Audit overview"), {
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
  const dateStr = new Date().toLocaleDateString(language === "sk" ? "sk-SK" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  summarySheet.getCell("A3").value = t("Názov projektu / analýzy:", "Project / analysis name:");
  summarySheet.getCell("A3").font = { bold: true };
  summarySheet.getCell("B3").value = analysisName;

  summarySheet.getCell("A4").value = t("Identifikátor analýzy:", "Analysis ID:");
  summarySheet.getCell("A4").font = { bold: true };
  summarySheet.getCell("B4").value = analysisId;

  summarySheet.getCell("A5").value = t("Dátum a čas exportu:", "Export date and time:");
  summarySheet.getCell("A5").font = { bold: true };
  summarySheet.getCell("B5").value = dateStr;

  summarySheet.getCell("A6").value = t("Cieľová úroveň ASVS:", "Target ASVS level:");
  summarySheet.getCell("A6").font = { bold: true };
  summarySheet.getCell("B6").value = targetLevel === "all" ? t("Všetky úrovne (L1-L3)", "All levels (L1-L3)") : `Level ${targetLevel}`;
  summarySheet.getCell("A7").value = t("Detail požiadaviek:", "Requirements detail:");
  summarySheet.getCell("A7").font = { bold: true };
  summarySheet.getCell("B7").value = onlyGaps
    ? t("Filter detailu: iba Partial a Missing; súhrn pokrýva celý zvolený rozsah.", "Detail filter: Partial and Missing only; the summary covers the entire selected scope.")
    : t("Detail obsahuje všetky požiadavky vo zvolenom rozsahu.", "Detail includes all requirements in the selected scope.");

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
  summarySheet.getCell("A8").value = t("Kľúčové metriky auditu", "Key audit metrics");
  summarySheet.getCell("A8").font = { bold: true, size: 13, color: { argb: "FF1E293B" } };

  const kpiHeaders = [t("Metrika", "Metric"), t("Počet požiadaviek", "Requirements"), t("Podiel z celku (%)", "Share of total (%)"), t("Poznámka", "Note")];
  const kpiHeaderRow = summarySheet.addRow(kpiHeaders);
  kpiHeaderRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });

  const kpiData = [
    [t("Kontroly v rozsahu", "Controls in scope"), total, "100%", t("Požiadavky vo vybranom rozsahu ASVS", "Requirements in the selected ASVS scope")],
    [t("Splnené kontroly (Implemented)", "Implemented controls"), implemented, total > 0 ? `${Math.round((implemented / total) * 100)}%` : "0%", t("Plne implementované a overené riadiace prvky", "Fully implemented and verified controls")],
    [t("Identifikované bezpečnostné nedostatky (Gaps)", "Identified security gaps"), gaps, total > 0 ? `${Math.round((gaps / total) * 100)}%` : "0%", t(`Chýbajúce: ${missing}, Čiastočné: ${partial}`, `Missing: ${missing}, Partial: ${partial}`)],
    [t("Vylúčené z rozsahu (N/A)", "Out of scope (N/A)"), na, total > 0 ? `${Math.round((na / total) * 100)}%` : "0%", t("Nerelevantné technológie alebo funkcie", "Irrelevant technologies or features")],
    [t("Čakajúce na posúdenie (Pending)", "Pending assessment"), pending, total > 0 ? `${Math.round((pending / total) * 100)}%` : "0%", t("Zatiaľ neoverené požiadavky", "Requirements not yet verified")],
    [t("Pokrytie ASVS (vážené)", "Weighted ASVS coverage"), t(`${implemented} splnené · ${partial} čiastočné`, `${implemented} implemented · ${partial} partial`), `${coveragePct}%`, t("Implemented + 0,5 × Partial; Pending a N/A sa nezapočítavajú", "Implemented + 0.5 × Partial; Pending and N/A are excluded")]
  ];

  kpiData.forEach(row => {
    const addedRow = summarySheet.addRow(row);
    addedRow.getCell(2).alignment = { horizontal: "center" };
    addedRow.getCell(3).alignment = { horizontal: "center" };
  });

  summarySheet.addRow([]);
  const riskTitleRow = summarySheet.addRow([t("Súhrn STRIDE a rizík", "STRIDE and risk summary")]);
  riskTitleRow.getCell(1).font = { bold: true, size: 13, color: { argb: "FF1E293B" } };
  const threatSummary = summarizeThreats(threats);
  [
    [t("Hrozby spolu", "Total threats"), threatSummary.total],
    [t("Otvorené hrozby", "Open threats"), threatSummary.open],
    [t("Otvorené High / Critical", "Open High / Critical"), threatSummary.openHighOrCritical],
    [t("Otvorené riziká podľa úrovne", "Open risks by level"), (["Critical", "High", "Medium", "Low", "Very Low"] as const)
      .map(level => `${level}: ${threats.filter(threat => threat.status === "Open" && threat.risk === level).length}`)
      .join(" · ")]
  ].forEach(row => summarySheet.addRow(row));

  // Chapter breakdown table
  summarySheet.addRow([]);
  const chTitleRow = summarySheet.addRow([t("Rozpad auditu podľa kapitol OWASP ASVS", "Audit breakdown by OWASP ASVS chapter")]);
  chTitleRow.getCell(1).font = { bold: true, size: 13, color: { argb: "FF1E293B" } };

  const chHeaderRow = summarySheet.addRow([
    t("Kapitola", "Chapter"),
    t("Názov bezpečnostnej domény", "Security domain"),
    t("Celkom", "Total"),
    t("Splnené", "Implemented"),
    t("Nedostatky (Gaps)", "Gaps"),
    "N/A",
    t("Čakajúce", "Pending"),
    t("Pokrytie (%)", "Coverage (%)")
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
  const reqSheet = workbook.addWorksheet(t("AVERT ASVS 5.0 Požiadavky", "AVERT ASVS 5.0 Requirements"), {
    views: [{ state: "frozen", ySplit: 1, showGridLines: true }]
  });

  const columns = [
    { header: t("ID Požiadavky", "Requirement ID"), key: "id", width: 15 },
    { header: t("Kapitola", "Chapter"), key: "chapter", width: 32 },
    { header: t("Sekcia", "Section"), key: "section", width: 34 },
    { header: "Level", key: "level", width: 10 },
    { header: t("Popis bezpečnostnej požiadavky", "Security requirement description"), key: "description", width: 55 },
    { header: t("Stav overenia", "Verification status"), key: "status", width: 16 },
    { header: t("Dôvod vylúčenia / Triáž", "Exclusion reason / triage"), key: "triageReason", width: 28 },
    { header: t("Odporúčaná metóda overenia", "Recommended verification method"), key: "verificationMethod", width: 24 },
    { header: t("Kľúčová otázka overenia", "Key verification question"), key: "keyQuestion", width: 45 },
    { header: t("Poznámky audítora a evidencia", "Auditor notes and evidence"), key: "notes", width: 45 },
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
    const sectionText = req.sectionName || req.section_name || req.title || (req.sectionId ? t(`Sekcia ${req.sectionId}`, `Section ${req.sectionId}`) : "");
    const guide = getVerificationGuide(req, language);

    const reqAny = req as any;
    const row = reqSheet.addRow({
      id: req.id,
      chapter: chapterText,
      section: sectionText,
      level: `L${req.level}`,
      description: req.description || "",
      status: req.status || "Pending",
      triageReason: req.triageReason || (reqAny.triageExcluded ? t("Vylúčené na základe dotazníka", "Excluded based on the questionnaire") : ""),
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
    const threatSheet = workbook.addWorksheet(t("STRIDE Register hrozieb", "STRIDE Threat register"), {
      views: [{ state: "frozen", ySplit: 1, showGridLines: true }]
    });

    threatSheet.columns = [
      { header: t("ID Hrozby", "Threat ID"), key: "id", width: 14 },
      { header: t("Názov hrozby", "Threat title"), key: "title", width: 35 },
      { header: t("Popis scenára", "Scenario description"), key: "description", width: 50 },
      { header: t("STRIDE Kategória", "STRIDE category"), key: "stride", width: 22 },
      { header: t("Závažnosť (Impact)", "Impact"), key: "impact", width: 16 },
      { header: t("Pravdepodobnosť", "Likelihood"), key: "likelihood", width: 16 },
      { header: t("Celkové riziko", "Overall risk"), key: "risk", width: 16 },
      { header: t("Stav", "Status"), key: "status", width: 16 },
      { header: t("ASVS referencie", "ASVS references"), key: "asvsRefs", width: 22 },
      { header: t("Komponenty", "Components"), key: "components", width: 28 },
      { header: t("Pôvod / kontrola", "Origin / review"), key: "review", width: 24 },
      { header: t("Zmierňujúce opatrenie", "Mitigation"), key: "mitigation", width: 45 }
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
          ? (threat.architectureReviewed ? t("STRIDE návrh · skontrolovaný", "STRIDE proposal · reviewed") : t("STRIDE návrh · vyžaduje kontrolu", "STRIDE proposal · review required"))
          : t("Manuálne zadaná hrozba", "Manually entered threat"),
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
    workbook.removeWorksheet(summarySheet.id);
  }
  if (!includeRequirements) {
    workbook.removeWorksheet(reqSheet.id);
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
    onlyGaps = false,
    language = "en"
  } = options;

  let filteredReqs = [...requirements];
  if (targetLevel !== "all") {
    filteredReqs = filteredReqs.filter(r => r.level <= targetLevel);
  }
  if (onlyGaps) {
    filteredReqs = filteredReqs.filter(r => r.status === "Partial" || r.status === "Missing");
  }

  // Helper to prevent CSV / Formula Injection (CWE-1236)
  const header = reportText(language,
    "ID požiadavky,ID kapitoly,Názov kapitoly,ID sekcie,Názov sekcie,Úroveň,Popis požiadavky,Stav,Dôvod triáže,Poznámky\n",
    "Requirement ID,Chapter ID,Chapter Name,Section ID,Section Name,Level,Requirement Description,Status,Triage Justification,Notes\n");
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
