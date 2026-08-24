import type { SupervisionAttendanceSession } from "@/lib/data/supervision-attendance";
import {
  formatSupervisionDate,
  supervisionNetworkLabel,
} from "../supervision-attendance.ts";

type PdfPage = { commands: string[] };

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 46;

function normalizeText(value: string) {
  return value
    .replaceAll("\u2011", "-")
    .replaceAll("\u2013", "-")
    .replaceAll("\u2014", "-")
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

function truncate(value: string, maximum: number) {
  const normalized = normalizeText(value).trim();
  return normalized.length <= maximum
    ? normalized
    : `${normalized.slice(0, maximum - 3).trimEnd()}...`;
}

export function createSupervisionAttendancePdf(
  session: SupervisionAttendanceSession,
) {
  if (session.status !== "finalized") {
    throw new Error("SUPERVISION_ATTENDANCE_NOT_FINALIZED");
  }

  const pages: PdfPage[] = [{ commands: [] }];
  let page = pages[0];
  let y = pageHeight - margin;
  const networkLabel = supervisionNetworkLabel(session.networkCode);
  const dateLabel = formatSupervisionDate(session.sessionOn);

  function text(
    value: string,
    x: number,
    baseline: number,
    options: { size?: number; bold?: boolean; color?: string } = {},
  ) {
    page.commands.push(
      `BT /${options.bold ? "F2" : "F1"} ${(options.size ?? 10).toFixed(2)} Tf ${options.color ?? "0.14 0.11 0.15"} rg 1 0 0 1 ${x.toFixed(2)} ${baseline.toFixed(2)} Tm (${escapePdfText(value)}) Tj ET`,
    );
  }

  function rectangle(
    x: number,
    bottom: number,
    width: number,
    height: number,
    color: string,
  ) {
    page.commands.push(
      `${color} rg ${x.toFixed(2)} ${bottom.toFixed(2)} ${width.toFixed(2)} ${height.toFixed(2)} re f`,
    );
  }

  function pageHeader(continued = false) {
    rectangle(margin, pageHeight - margin - 72, pageWidth - margin * 2, 72, "0.35 0.09 0.41");
    text("ICB CONECTA | CHAMADA DA SUPERVISÃO", margin + 16, pageHeight - margin - 22, {
      size: 8.5,
      bold: true,
      color: "1 1 1",
    });
    text(`Supervisão ${networkLabel} — ${dateLabel}${continued ? " — continuação" : ""}`, margin + 16, pageHeight - margin - 50, {
      size: 16,
      bold: true,
      color: "1 1 1",
    });
    y = pageHeight - margin - 92;
  }

  function newPage() {
    page = { commands: [] };
    pages.push(page);
    pageHeader(true);
  }

  function ensureSpace(height: number) {
    if (y - height < 62) newPage();
  }

  function sectionTitle(title: string) {
    ensureSpace(38);
    rectangle(margin, y - 24, pageWidth - margin * 2, 24, "0.96 0.92 0.97");
    text(title, margin + 10, y - 16, { size: 10, bold: true, color: "0.35 0.09 0.41" });
    y -= 34;
  }

  function personRow(name: string, cellName: string | null, index: number) {
    ensureSpace(30);
    if (index % 2 === 1) {
      rectangle(margin, y - 26, pageWidth - margin * 2, 26, "0.96 0.95 0.97");
    }
    text(truncate(name, 52), margin + 10, y - 17, { size: 9.5, bold: true });
    text(truncate(cellName ?? "Célula não informada", 31), margin + 310, y - 17, {
      size: 8.5,
      color: "0.38 0.35 0.40",
    });
    y -= 26;
  }

  pageHeader();
  const absent = session.total - session.present;
  text(`Total: ${session.total}`, margin, y, { size: 11, bold: true });
  text(`Presentes: ${session.present}`, margin + 115, y, { size: 11, bold: true, color: "0.09 0.48 0.29" });
  text(`Ausentes: ${absent}`, margin + 255, y, { size: 11, bold: true, color: "0.65 0.16 0.16" });
  text(`Presença: ${session.percentage}%`, margin + 385, y, { size: 11, bold: true, color: "0.35 0.09 0.41" });
  y -= 28;
  text(`Responsável: ${truncate(session.responsibleName, 68)}`, margin, y, { size: 9.5 });
  y -= 30;

  const presentPeople = session.people.filter((person) => person.present === true);
  const absentPeople = session.people.filter((person) => person.present === false);
  sectionTitle(`PRESENTES (${presentPeople.length})`);
  presentPeople.forEach((person, index) => personRow(person.fullName, person.cellName, index));
  if (presentPeople.length === 0) {
    text("Nenhuma pessoa presente.", margin + 10, y - 16, { size: 9, color: "0.38 0.35 0.40" });
    y -= 28;
  }

  y -= 12;
  sectionTitle(`AUSENTES (${absentPeople.length})`);
  absentPeople.forEach((person, index) => personRow(person.fullName, person.cellName, index));
  if (absentPeople.length === 0) {
    text("Nenhuma pessoa ausente.", margin + 10, y - 16, { size: 9, color: "0.38 0.35 0.40" });
    y -= 28;
  }

  pages.forEach((currentPage, index) => {
    page = currentPage;
    text(`ICB Conecta | ${networkLabel} | ${dateLabel}`, margin, 31, { size: 7.5, color: "0.38 0.35 0.40" });
    text(`Página ${index + 1} de ${pages.length}`, pageWidth - margin - 80, 31, { size: 7.5, bold: true, color: "0.38 0.35 0.40" });
  });

  const objects = new Map<number, Uint8Array>();
  const pageObjectIds = pages.map((_, index) => 5 + index * 2);
  objects.set(1, encodeWinAnsi("<< /Type /Catalog /Pages 2 0 R >>"));
  objects.set(2, encodeWinAnsi(`<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`));
  objects.set(3, encodeWinAnsi("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"));
  objects.set(4, encodeWinAnsi("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"));

  pages.forEach((currentPage, index) => {
    const pageObjectId = pageObjectIds[index];
    const contentObjectId = pageObjectId + 1;
    const content = encodeWinAnsi(currentPage.commands.join("\n"));
    objects.set(pageObjectId, encodeWinAnsi(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>`));
    objects.set(contentObjectId, concatenate([
      encodeWinAnsi(`<< /Length ${content.length} >>\nstream\n`),
      content,
      encodeWinAnsi("\nendstream"),
    ]));
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
  const xrefLines = ["xref", `0 ${maximumObjectId + 1}`, "0000000000 65535 f "];
  for (let objectId = 1; objectId <= maximumObjectId; objectId += 1) {
    xrefLines.push(`${String(offsets[objectId]).padStart(10, "0")} 00000 n `);
  }
  xrefLines.push("trailer", `<< /Size ${maximumObjectId + 1} /Root 1 0 R >>`, "startxref", String(xrefOffset), "%%EOF");
  chunks.push(encodeWinAnsi(`${xrefLines.join("\n")}\n`));
  return concatenate(chunks);
}
