import type {
  ChecklistResultsPerson,
  ChecklistResultsReport,
  ChecklistResultsSummary,
} from "@/lib/data/checklist-results";
import { formatChecklistPeriodLabel } from "../checklist-results.ts";

type PdfPage = { commands: string[] };
type Color = readonly [number, number, number];

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 44;
const contentWidth = pageWidth - margin * 2;
const footerLimit = margin + 24;

const colors = {
  primary: [0.482, 0.122, 0.635] as Color,
  primaryDark: [0.353, 0.09, 0.408] as Color,
  primarySoft: [0.961, 0.918, 0.973] as Color,
  primaryBorder: [0.875, 0.765, 0.906] as Color,
  foreground: [0.129, 0.106, 0.137] as Color,
  secondary: [0.384, 0.349, 0.4] as Color,
  border: [0.871, 0.843, 0.882] as Color,
  surface: [1, 1, 1] as Color,
  surfaceMuted: [0.949, 0.937, 0.957] as Color,
  success: [0.086, 0.475, 0.294] as Color,
  successSoft: [0.918, 0.969, 0.941] as Color,
  warning: [0.545, 0.369, 0] as Color,
  warningSoft: [1, 0.969, 0.863] as Color,
} as const;

function normalizeText(value: string) {
  return value
    .replaceAll("\u2011", "-")
    .replaceAll("\u2013", "-")
    .replaceAll("\u2014", "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replaceAll("\u2026", "...");
}

function escapePdfText(value: string) {
  return normalizeText(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
    .replace(/[\r\n]+/g, " ");
}

function encodeWinAnsi(value: string) {
  return Uint8Array.from(
    Array.from(value, (character) => {
      const code = character.codePointAt(0) ?? 63;
      return code <= 255 ? code : 63;
    }),
  );
}

function concatenate(chunks: Uint8Array[]) {
  const result = new Uint8Array(
    chunks.reduce((length, chunk) => length + chunk.length, 0),
  );
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

function wrapLine(value: string, maximumCharacters: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let currentLine = "";
  for (const originalWord of words) {
    let word = originalWord;
    while (word.length > maximumCharacters) {
      if (currentLine) lines.push(currentLine);
      currentLine = "";
      lines.push(word.slice(0, maximumCharacters));
      word = word.slice(maximumCharacters);
    }

    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (candidate.length <= maximumCharacters) {
      currentLine = candidate;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

function truncateText(value: string, maximumCharacters: number) {
  const normalized = normalizeText(value).trim();
  if (normalized.length <= maximumCharacters) return normalized;
  return `${normalized.slice(0, Math.max(1, maximumCharacters - 3)).trimEnd()}...`;
}

function leadershipLabel(role: ChecklistResultsPerson["leadershipRole"]) {
  return role === "leader" ? "Líder" : "Vice-líder";
}

function colorCommand(color: Color, operator: "rg" | "RG") {
  return `${color.map((channel) => channel.toFixed(3)).join(" ")} ${operator}`;
}

function estimateTextWidth(value: string, size: number) {
  return normalizeText(value).length * size * 0.5;
}

export function createChecklistResultsPdf(report: ChecklistResultsReport) {
  if (!report.isComplete) {
    throw new Error("CHECKLIST_RESULTS_PERIOD_INCOMPLETE");
  }

  const periodLabel = formatChecklistPeriodLabel(
    report.periodType,
    report.periodStart,
    report.periodEnd,
  );
  const selectedNetwork = report.selectedNetworkCode ?? "Todas as Redes";
  const weeksLabel = `${report.weeks.length} ${report.weeks.length === 1 ? "semana elegível" : "semanas elegíveis"}`;
  const pages: PdfPage[] = [{ commands: [] }];
  let page = pages[0];
  let y = pageHeight - margin;

  function drawRect(
    x: number,
    bottom: number,
    width: number,
    height: number,
    fill: Color,
    stroke?: Color,
    strokeWidth = 0.7,
  ) {
    const path = `${x.toFixed(2)} ${bottom.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re`;
    if (stroke) {
      page.commands.push(
        `${colorCommand(fill, "rg")} ${colorCommand(stroke, "RG")} ${strokeWidth.toFixed(2)} w ${path} B`,
      );
      return;
    }
    page.commands.push(`${colorCommand(fill, "rg")} ${path} f`);
  }

  function drawLine(
    x1: number,
    lineY: number,
    x2: number,
    color: Color,
    width = 0.6,
  ) {
    page.commands.push(
      `${colorCommand(color, "RG")} ${width.toFixed(2)} w ${x1.toFixed(2)} ${lineY.toFixed(2)} m ${x2.toFixed(2)} ${lineY.toFixed(2)} l S`,
    );
  }

  function drawText(
    value: string,
    x: number,
    baseline: number,
    options: {
      size?: number;
      bold?: boolean;
      color?: Color;
      width?: number;
      align?: "left" | "center" | "right";
    } = {},
  ) {
    const size = options.size ?? 10;
    const color = options.color ?? colors.foreground;
    const width = options.width ?? 0;
    const align = options.align ?? "left";
    const estimatedWidth = estimateTextWidth(value, size);
    let textX = x;
    if (align === "center") textX += Math.max(0, (width - estimatedWidth) / 2);
    if (align === "right") textX += Math.max(0, width - estimatedWidth);
    page.commands.push(
      `BT /${options.bold ? "F2" : "F1"} ${size.toFixed(2)} Tf ${colorCommand(color, "rg")} 1 0 0 1 ${textX.toFixed(2)} ${baseline.toFixed(2)} Tm (${escapePdfText(value)}) Tj ET`,
    );
  }

  function drawContinuationHeader() {
    const top = pageHeight - margin;
    drawRect(margin, top - 44, contentWidth, 44, colors.primaryDark);
    drawText("RESULTADOS DO CHECKLIST", margin + 14, top - 18, {
      size: 10,
      bold: true,
      color: colors.surface,
    });
    drawText(periodLabel, margin + 14, top - 33, {
      size: 8.5,
      color: colors.primarySoft,
    });
    drawText(selectedNetwork, margin + 14, top - 28, {
      size: 8.5,
      bold: true,
      color: colors.surface,
      width: contentWidth - 28,
      align: "right",
    });
    y = top - 60;
  }

  function startPage() {
    page = { commands: [] };
    pages.push(page);
    drawContinuationHeader();
  }

  function ensureSpace(height: number) {
    if (y - height >= footerLimit) return false;
    startPage();
    return true;
  }

  function drawSectionTitle(title: string) {
    ensureSpace(30);
    drawRect(margin, y - 18, 4, 18, colors.primary);
    drawText(title, margin + 12, y - 14, {
      size: 11,
      bold: true,
      color: colors.primaryDark,
    });
    y -= 30;
  }

  function drawMetricCard(
    x: number,
    top: number,
    width: number,
    label: string,
    value: string,
    note: string,
    tone: "primary" | "success" | "warning" = "primary",
  ) {
    const height = 74;
    const fill =
      tone === "success"
        ? colors.successSoft
        : tone === "warning"
          ? colors.warningSoft
          : colors.primarySoft;
    const accent =
      tone === "success"
        ? colors.success
        : tone === "warning"
          ? colors.warning
          : colors.primary;
    drawRect(x, top - height, width, height, fill, colors.border);
    drawRect(x, top - height, 4, height, accent);
    const labelLines = wrapLine(
      label.toUpperCase(),
      Math.max(12, Math.floor((width - 24) / 4.4)),
    ).slice(0, 2);
    labelLines.forEach((line, index) => {
      drawText(line, x + 14, top - 16 - index * 10, {
        size: 7.5,
        bold: true,
        color: colors.secondary,
      });
    });
    drawText(value, x + 14, top - 48, {
      size: 18,
      bold: true,
      color: accent,
    });
    drawText(
      truncateText(note, Math.max(12, Math.floor((width - 24) / 4.2))),
      x + 14,
      top - 64,
      { size: 7, color: colors.secondary },
    );
  }

  function drawSummary(summary: ChecklistResultsSummary) {
    drawSectionTitle(`RESUMO GERAL - ${periodLabel.toUpperCase()}`);
    ensureSpace(164);
    const gap = 8;
    const threeColumnWidth = (contentWidth - gap * 2) / 3;
    const twoColumnWidth = (contentWidth - gap) / 2;
    const denominator = summary.eligibleChecklists;

    drawMetricCard(
      margin,
      y,
      threeColumnWidth,
      "Lideranças consideradas",
      String(summary.leadershipsConsidered),
      `${denominator} participações elegíveis`,
    );
    drawMetricCard(
      margin + threeColumnWidth + gap,
      y,
      threeColumnWidth,
      "Oração em grupo",
      `${summary.prayedCount}/${denominator}`,
      "checklists com oração",
    );
    drawMetricCard(
      margin + (threeColumnWidth + gap) * 2,
      y,
      threeColumnWidth,
      "Jejum pela célula",
      `${summary.fastedCount}/${denominator}`,
      "checklists com jejum",
    );
    y -= 82;
    drawMetricCard(
      margin,
      y,
      twoColumnWidth,
      "Evangelismo",
      `${summary.evangelizedCount}/${denominator}`,
      "checklists com evangelismo",
      "success",
    );
    drawMetricCard(
      margin + twoColumnWidth + gap,
      y,
      twoColumnWidth,
      "Pendências",
      `${summary.pendingCount}/${denominator}`,
      "checklists com dados pendentes",
      summary.pendingCount > 0 ? "warning" : "success",
    );
    y -= 90;
  }

  function drawNetworkSummaries() {
    if (report.networkSummaries.length <= 1) return;

    drawSectionTitle("RESUMO POR REDE");
    const rowHeight = 28;
    const headerHeight = 27;
    const columnWidths = [167, 68, 68, 68, 68, 68];
    ensureSpace(headerHeight + report.networkSummaries.length * rowHeight + 12);
    const headers = [
      "Rede",
      "Lideranças",
      "Oração",
      "Jejum",
      "Evangelismo",
      "Pendentes",
    ];
    let x = margin;
    drawRect(margin, y - headerHeight, contentWidth, headerHeight, colors.primaryDark);
    headers.forEach((header, index) => {
      drawText(header, x + (index === 0 ? 10 : 0), y - 18, {
        size: index === 4 ? 7.2 : 7.6,
        bold: true,
        color: colors.surface,
        width: columnWidths[index] - (index === 0 ? 10 : 0),
        align: index === 0 ? "left" : "center",
      });
      x += columnWidths[index];
    });
    y -= headerHeight;

    report.networkSummaries.forEach((network, index) => {
      const bottom = y - rowHeight;
      drawRect(
        margin,
        bottom,
        contentWidth,
        rowHeight,
        index % 2 === 0 ? colors.surface : colors.surfaceMuted,
        colors.border,
        0.4,
      );
      const values = [
        `${network.networkName} (${network.networkCode})`,
        String(network.leadershipsConsidered),
        `${network.prayedCount}/${network.eligibleChecklists}`,
        `${network.fastedCount}/${network.eligibleChecklists}`,
        `${network.evangelizedCount}/${network.eligibleChecklists}`,
        `${network.pendingCount}/${network.eligibleChecklists}`,
      ];
      x = margin;
      values.forEach((value, valueIndex) => {
        drawText(
          valueIndex === 0 ? truncateText(value, 31) : value,
          x + (valueIndex === 0 ? 10 : 0),
          bottom + 10,
          {
            size: valueIndex === 0 ? 8.2 : 8.5,
            bold: valueIndex === 0,
            color:
              valueIndex === 5 && network.pendingCount > 0
                ? colors.warning
                : colors.foreground,
            width: columnWidths[valueIndex] - (valueIndex === 0 ? 10 : 0),
            align: valueIndex === 0 ? "left" : "center",
          },
        );
        x += columnWidths[valueIndex];
      });
      y = bottom;
    });
    y -= 16;
  }

  const detailColumns = [215, 73, 73, 73, 73.28];

  function drawNetworkHeader(name: string, code: string, continued = false) {
    const height = 35;
    drawRect(margin, y - height, contentWidth, height, colors.primary);
    drawText(
      `${name} (${code})${continued ? " - continuação" : ""}`,
      margin + 13,
      y - 23,
      { size: 12, bold: true, color: colors.surface },
    );
    y -= height;
  }

  function drawCellHeader(name: string, continued = false) {
    const height = 31;
    drawRect(
      margin,
      y - height,
      contentWidth,
      height,
      colors.primarySoft,
      colors.primaryBorder,
    );
    drawRect(margin, y - height, 5, height, colors.primaryDark);
    drawText(
      `CÉLULA  ${truncateText(name, 58)}${continued ? " - continuação" : ""}`,
      margin + 14,
      y - 20,
      { size: 9.5, bold: true, color: colors.primaryDark },
    );
    y -= height;
  }

  function drawPeopleTableHeader() {
    const height = 27;
    drawRect(
      margin,
      y - height,
      contentWidth,
      height,
      colors.surfaceMuted,
      colors.border,
    );
    const headers = ["Liderança", "Oração", "Jejum", "Evangelismo", "Pendências"];
    let x = margin;
    headers.forEach((header, index) => {
      drawText(header, x + (index === 0 ? 10 : 0), y - 18, {
        size: index >= 3 ? 7.5 : 8,
        bold: true,
        color: colors.secondary,
        width: detailColumns[index] - (index === 0 ? 10 : 0),
        align: index === 0 ? "left" : "center",
      });
      x += detailColumns[index];
    });
    y -= height;
  }

  function drawPersonRow(person: ChecklistResultsPerson, alternate: boolean) {
    const height = 40;
    const bottom = y - height;
    drawRect(
      margin,
      bottom,
      contentWidth,
      height,
      alternate ? colors.surfaceMuted : colors.surface,
      colors.border,
      0.4,
    );
    drawText(truncateText(person.fullName, 37), margin + 10, bottom + 23, {
      size: 9,
      bold: true,
    });
    drawText(leadershipLabel(person.leadershipRole), margin + 10, bottom + 10, {
      size: 7.5,
      color: colors.secondary,
    });

    const values = [
      `${person.prayedCount}/${person.eligibleChecklists}`,
      `${person.fastedCount}/${person.eligibleChecklists}`,
      `${person.evangelizedCount}/${person.eligibleChecklists}`,
      `${person.pendingCount}/${person.eligibleChecklists}`,
    ];
    let x = margin + detailColumns[0];
    values.forEach((value, index) => {
      drawText(value, x, bottom + 17, {
        size: 10,
        bold: true,
        color:
          index === 2
            ? colors.success
            : index === 3 && person.pendingCount > 0
              ? colors.warning
              : colors.foreground,
        width: detailColumns[index + 1],
        align: "center",
      });
      x += detailColumns[index + 1];
    });
    y = bottom;
  }

  function drawMainHeader() {
    const top = pageHeight - margin;
    const height = 118;
    drawRect(margin, top - height, contentWidth, height, colors.primaryDark);
    drawRect(margin, top - height, 7, height, colors.primary);
    drawText("ICB CONECTA  |  PARQUE SÃO VICENTE", margin + 22, top - 22, {
      size: 8.5,
      bold: true,
      color: colors.primarySoft,
    });
    drawText("Resultados do Checklist", margin + 22, top - 55, {
      size: 22,
      bold: true,
      color: colors.surface,
    });
    drawText(periodLabel, margin + 22, top - 79, {
      size: 11,
      bold: true,
      color: colors.surface,
    });
    drawText(`${selectedNetwork}  |  ${weeksLabel}`, margin + 22, top - 99, {
      size: 8.5,
      color: colors.primarySoft,
    });
    y = top - height - 22;
  }

  drawMainHeader();
  drawSummary(report.summary);
  drawNetworkSummaries();
  drawSectionTitle("DETALHAMENTO POR REDE E CÉLULA");

  const networks = new Map<
    string,
    {
      name: string;
      code: string;
      cells: Map<string, { name: string; people: ChecklistResultsPerson[] }>;
    }
  >();
  for (const person of report.people) {
    const network = networks.get(person.networkId) ?? {
      name: person.networkName,
      code: person.networkCode,
      cells: new Map(),
    };
    const cell = network.cells.get(person.cellId) ?? {
      name: person.cellName,
      people: [],
    };
    cell.people.push(person);
    network.cells.set(person.cellId, cell);
    networks.set(person.networkId, network);
  }

  if (networks.size === 0) {
    ensureSpace(72);
    drawRect(margin, y - 58, contentWidth, 58, colors.surfaceMuted, colors.border);
    drawText("Nenhuma liderança elegível para o período selecionado.", margin + 16, y - 33, {
      size: 10,
      bold: true,
      color: colors.secondary,
    });
    y -= 70;
  }

  for (const network of networks.values()) {
    ensureSpace(35 + 31 + 27 + 40 + 14);
    drawNetworkHeader(network.name, network.code);

    for (const cell of network.cells.values()) {
      if (ensureSpace(31 + 27 + 40 + 12)) {
        drawNetworkHeader(network.name, network.code, true);
      }
      drawCellHeader(cell.name);
      drawPeopleTableHeader();

      cell.people.forEach((person, index) => {
        if (ensureSpace(40)) {
          drawNetworkHeader(network.name, network.code, true);
          drawCellHeader(cell.name, true);
          drawPeopleTableHeader();
        }
        drawPersonRow(person, index % 2 === 1);
      });
      y -= 12;
    }
    y -= 8;
  }

  pages.forEach((currentPage, index) => {
    page = currentPage;
    drawLine(margin, 42, pageWidth - margin, colors.border, 0.5);
    drawText(`ICB Conecta  |  ${periodLabel}`, margin, 27, {
      size: 7.5,
      color: colors.secondary,
    });
    drawText(`Página ${index + 1} de ${pages.length}`, margin, 27, {
      size: 7.5,
      bold: true,
      color: colors.secondary,
      width: contentWidth,
      align: "right",
    });
  });

  const objects = new Map<number, Uint8Array>();
  const pageObjectIds = pages.map((_, index) => 5 + index * 2);
  objects.set(1, encodeWinAnsi("<< /Type /Catalog /Pages 2 0 R >>"));
  objects.set(
    2,
    encodeWinAnsi(
      `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    ),
  );
  objects.set(
    3,
    encodeWinAnsi(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    ),
  );
  objects.set(
    4,
    encodeWinAnsi(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    ),
  );

  pages.forEach((currentPage, index) => {
    const pageObjectId = pageObjectIds[index];
    const contentObjectId = pageObjectId + 1;
    const content = encodeWinAnsi(currentPage.commands.join("\n"));
    objects.set(
      pageObjectId,
      encodeWinAnsi(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
      ),
    );
    objects.set(
      contentObjectId,
      concatenate([
        encodeWinAnsi(`<< /Length ${content.length} >>\nstream\n`),
        content,
        encodeWinAnsi("\nendstream"),
      ]),
    );
  });

  const chunks: Uint8Array[] = [encodeWinAnsi("%PDF-1.4\n%âãÏÓ\n")];
  const offsets = [0];
  let currentOffset = chunks[0].length;
  const maximumObjectId = Math.max(...objects.keys());
  for (let objectId = 1; objectId <= maximumObjectId; objectId += 1) {
    const object = objects.get(objectId);
    if (!object) continue;
    offsets[objectId] = currentOffset;
    const objectChunk = concatenate([
      encodeWinAnsi(`${objectId} 0 obj\n`),
      object,
      encodeWinAnsi("\nendobj\n"),
    ]);
    chunks.push(objectChunk);
    currentOffset += objectChunk.length;
  }

  const xrefOffset = currentOffset;
  const xrefLines = [
    "xref",
    `0 ${maximumObjectId + 1}`,
    "0000000000 65535 f ",
  ];
  for (let objectId = 1; objectId <= maximumObjectId; objectId += 1) {
    xrefLines.push(`${String(offsets[objectId]).padStart(10, "0")} 00000 n `);
  }
  xrefLines.push(
    "trailer",
    `<< /Size ${maximumObjectId + 1} /Root 1 0 R >>`,
    "startxref",
    String(xrefOffset),
    "%%EOF",
  );
  chunks.push(encodeWinAnsi(`${xrefLines.join("\n")}\n`));

  return concatenate(chunks);
}
