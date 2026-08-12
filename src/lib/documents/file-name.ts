const windowsReservedNames = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

export function createSafePdfFileName(originalFileName: string) {
  const withoutExtension = originalFileName.replace(/\.pdf$/i, "");
  const normalizedBaseName = withoutExtension
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  const safeBaseName =
    normalizedBaseName && !windowsReservedNames.test(normalizedBaseName)
      ? normalizedBaseName
      : "documento";

  return `${safeBaseName}.pdf`;
}
