import type { CellReportVersionDetail } from "@/lib/data/cell-report-detail";

type PdfPage = {
  commands: string[];
};

const pageWidth = 595.28;
const pageHeight = 841.89;
const margin = 48;
const contentWidth = pageWidth - margin * 2;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
    new Date(`${value}T12:00:00Z`),
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

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
  const extraCharacters = new Map<string, number>([
    ["€", 128],
    ["‚", 130],
    ["ƒ", 131],
    ["„", 132],
    ["…", 133],
    ["†", 134],
    ["‡", 135],
    ["ˆ", 136],
    ["‰", 137],
    ["Š", 138],
    ["‹", 139],
    ["Œ", 140],
    ["Ž", 142],
    ["‘", 145],
    ["’", 146],
    ["“", 147],
    ["”", 148],
    ["•", 149],
    ["–", 150],
    ["—", 151],
    ["˜", 152],
    ["™", 153],
    ["š", 154],
    ["›", 155],
    ["œ", 156],
    ["ž", 158],
    ["Ÿ", 159],
  ]);
  const bytes: number[] = [];

  for (const character of value) {
    const code = character.codePointAt(0) ?? 63;

    if (code <= 255) {
      bytes.push(code);
    } else {
      bytes.push(extraCharacters.get(character) ?? 63);
    }
  }

  return Uint8Array.from(bytes);
}

function concatenate(chunks: Uint8Array[]) {
  const length = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const result = new Uint8Array(length);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

function wrapLine(value: string, maximumCharacters: number) {
  const words = value.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return [""];
  }

  const lines: string[] = [];
  let currentLine = "";

  for (const originalWord of words) {
    let word = originalWord;

    while (word.length > maximumCharacters) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = "";
      }
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

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

export function createCellReportPdf(detail: CellReportVersionDetail) {
  const pages: PdfPage[] = [{ commands: [] }];
  let page = pages[0];
  let y = pageHeight - margin;

  function startPage() {
    page = { commands: [] };
    pages.push(page);
    y = pageHeight - margin;
  }

  function ensureSpace(height: number) {
    if (y - height < margin + 22) {
      startPage();
    }
  }

  function addText(
    value: string,
    options: {
      size?: number;
      bold?: boolean;
      indent?: number;
      spaceBefore?: number;
      spaceAfter?: number;
      lineHeight?: number;
    } = {},
  ) {
    const size = options.size ?? 10;
    const indent = options.indent ?? 0;
    const lineHeight = options.lineHeight ?? size * 1.4;
    const spaceBefore = options.spaceBefore ?? 0;
    const spaceAfter = options.spaceAfter ?? 0;
    const maximumCharacters = Math.max(
      20,
      Math.floor((contentWidth - indent) / (size * 0.52)),
    );
    const paragraphs = normalizeText(value).split(/\r?\n/);
    const lines = paragraphs.flatMap((paragraph) =>
      wrapLine(paragraph, maximumCharacters),
    );

    ensureSpace(spaceBefore + lines.length * lineHeight + spaceAfter);
    y -= spaceBefore;

    for (const line of lines) {
      page.commands.push(
        `BT /${options.bold ? "F2" : "F1"} ${size.toFixed(2)} Tf 0 g ${(margin + indent).toFixed(2)} ${y.toFixed(2)} Td (${escapePdfText(line)}) Tj ET`,
      );
      y -= lineHeight;
    }

    y -= spaceAfter;
  }

  function addSection(title: string) {
    ensureSpace(48);
    y -= 18;

    page.commands.push(
      `0.95 g ${margin.toFixed(2)} ${(y - 7).toFixed(2)} ${contentWidth.toFixed(2)} 27 re f`,
    );

    addText(title, {
      size: 13,
      bold: true,
      indent: 10,
      lineHeight: 18,
      spaceAfter: 11,
    });
  }

  addText("ICB Parque São Vicente", { size: 10, bold: true, spaceAfter: 8 });
  addText("Ficha de Organização", { size: 22, bold: true, lineHeight: 27 });
  addText(detail.cellName, { size: 16, bold: true, spaceBefore: 3, spaceAfter: 7 });
  addText(
    `Data da Célula: ${formatDate(detail.meetingOn)}  |  Versão ${detail.versionNumber}${detail.isCurrent ? " - atual" : " - substituída"}`,
    { size: 10, spaceAfter: 4 },
  );
  addText(
    `Formato: ${detail.meetingFormat === "in_person" ? "Presencial" : "Online"}  |  Membros: ${detail.membersCount}  |  Convidados: ${detail.guestsCount}  |  1ª vez: ${detail.firstTimeGuestsCount}  |  Geral: ${detail.membersCount + detail.guestsCount}`,
    { size: 10 },
  );

  addSection("Presença da liderança");
  addText(
    `Líder: ${detail.leaderName} - ${detail.leaderWasPresent ? "Presente" : "Ausente"}`,
    { size: 10, spaceAfter: 4 },
  );
  const viceLeaders = detail.leadership.filter(
    (person) => person.role === "vice_leader",
  );
  if (viceLeaders.length === 0) {
    addText("Vice-líderes: Nenhum vinculado à célula.");
  } else {
    for (const viceLeader of viceLeaders) {
      addText(
        `Vice-líder: ${viceLeader.name} - ${detail.presentViceLeadershipIds.includes(viceLeader.leadershipId) ? "Presente" : "Ausente"}`,
        { size: 10, spaceAfter: 3 },
      );
    }
  }

  addSection("Membros");
  if (detail.members.length === 0) {
    addText("Membros presentes: Nenhum");
  } else {
    for (const member of detail.members) {
      addText(`${member.position}. ${member.name}`, { indent: 8, spaceAfter: 2 });
    }
  }

  addSection("Convidados");
  if (detail.guests.length === 0) {
    addText("Convidados: Nenhum");
  } else {
    const guestGroups = new Map<string, typeof detail.guests>();
    for (const guest of detail.guests) {
      const group = guestGroups.get(guest.responsibleName) ?? [];
      group.push(guest);
      guestGroups.set(guest.responsibleName, group);
    }

    for (const [responsibleName, guests] of guestGroups) {
      addText(`Responsável: ${responsibleName}`, {
        bold: true,
        spaceBefore: 5,
        spaceAfter: 3,
      });
      for (const guest of guests) {
        addText(
          `${guest.position}. ${guest.name}${guest.isFirstTime ? " (1ª vez)" : ""}`,
          { indent: 8, spaceAfter: 2 },
        );
      }
    }
  }

  addSection("Relatório de Evangelismo");
  for (const [index, entry] of detail.evangelismEntries.entries()) {
    if (entry.didEvangelize) {
      addText(`Evangelismo ${index + 1} - Evangelizou`, {
        size: 11,
        bold: true,
        spaceBefore: 5,
        spaceAfter: 4,
      });
      addText(
        `Liderança: ${entry.leadershipNames.join(", ") || entry.registeredByName}`,
        { indent: 8, spaceAfter: 2 },
      );
      addText(`Quem registrou: ${entry.registeredByName}`, {
        indent: 8,
        spaceAfter: 2,
      });
      addText(
        `Data: ${entry.evangelismOn ? formatDate(entry.evangelismOn) : "Não informada"}  |  Tempo: ${entry.durationText ?? "Não informado"}`,
        { indent: 8, spaceAfter: 2 },
      );
      addText(
        `Integrantes: ${entry.participantNames.length > 0 ? entry.participantNames.join(", ") : "Nenhum"}`,
        { indent: 8, spaceAfter: 2 },
      );
    } else {
      addText(`${entry.registeredByName} - Não evangelizou`, {
        size: 11,
        bold: true,
        spaceBefore: 5,
        spaceAfter: 4,
      });
    }

    addText(`Comentários: ${entry.comments}`, {
      indent: 8,
      spaceAfter: 6,
    });
  }

  ensureSpace(32);
  y -= 20;
  addText(
    `Enviada por ${detail.submittedByName} em ${formatDateTime(detail.submittedAt)}.`,
    { size: 9 },
  );

  pages.forEach((currentPage, index) => {
    currentPage.commands.push(
      `BT /F1 8 Tf 0.35 g ${(pageWidth / 2 - 22).toFixed(2)} 25 Td (Página ${index + 1} de ${pages.length}) Tj ET`,
    );
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
