export const memberNetworks = [
  { value: "homens", label: "Homens" },
  { value: "mulheres", label: "Mulheres" },
  { value: "rapazes", label: "Rapazes" },
  { value: "mocas", label: "Moças" },
] as const;

export type MemberNetwork = (typeof memberNetworks)[number]["value"];

export const maximumMemberPhotoSize = 10 * 1024 * 1024;
export const allowedMemberPhotoTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const networkValues = new Set<string>(
  memberNetworks.map((network) => network.value),
);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type MemberRegistrationInput = {
  fullName: string;
  photoObjectPath: string;
  birthDate: string;
  rg: string;
  addressStreet: string;
  addressNumber: string;
  neighborhood: string;
  city: string;
  postalCode: string;
  baptismDate: string;
  network: MemberNetwork;
  disciplerName: string;
  whatsapp: string;
};

export type MemberRegistrationValidation =
  | { ok: true; value: MemberRegistrationInput }
  | { ok: false; message: string };

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isValidDate(value: string, currentDate: string) {
  if (!datePattern.test(value) || value < "1900-01-01" || value > currentDate) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function validateMemberRegistration(
  raw: Record<keyof MemberRegistrationInput, string>,
  currentUserId: string,
  currentDate: string,
): MemberRegistrationValidation {
  const fullName = normalizeText(raw.fullName);
  const rg = normalizeText(raw.rg);
  const addressStreet = normalizeText(raw.addressStreet);
  const addressNumber = normalizeText(raw.addressNumber);
  const neighborhood = normalizeText(raw.neighborhood);
  const city = normalizeText(raw.city);
  const disciplerName = normalizeText(raw.disciplerName);
  const postalCode = raw.postalCode.replace(/\D/g, "");
  const whatsapp = raw.whatsapp.replace(/\D/g, "");
  const network = raw.network as MemberNetwork;
  const expectedPhotoPath = new RegExp(
    `^${currentUserId}/${uuidPattern.source.slice(1, -1)}\\.(jpg|jpeg|png|webp)$`,
    "i",
  );

  if (fullName.length < 2 || fullName.length > 160) {
    return { ok: false, message: "Informe o nome completo do membro." };
  }
  if (!expectedPhotoPath.test(raw.photoObjectPath)) {
    return { ok: false, message: "A foto enviada possui um caminho inválido." };
  }
  if (!isValidDate(raw.birthDate, currentDate)) {
    return { ok: false, message: "Informe uma data de nascimento válida." };
  }
  if (rg.length < 4 || rg.length > 30) {
    return { ok: false, message: "Informe um RG válido." };
  }
  if (addressStreet.length < 2 || addressStreet.length > 180) {
    return { ok: false, message: "Informe a rua ou avenida do endereço." };
  }
  if (addressNumber.length < 1 || addressNumber.length > 30) {
    return { ok: false, message: "Informe o número da residência." };
  }
  if (neighborhood.length < 2 || neighborhood.length > 100) {
    return { ok: false, message: "Informe o bairro." };
  }
  if (city.length < 2 || city.length > 100) {
    return { ok: false, message: "Informe a cidade." };
  }
  if (postalCode.length !== 8) {
    return { ok: false, message: "Informe um CEP com 8 números." };
  }
  if (!isValidDate(raw.baptismDate, currentDate)) {
    return { ok: false, message: "Informe uma data de batismo válida." };
  }
  if (!networkValues.has(network)) {
    return { ok: false, message: "Selecione a rede do membro." };
  }
  if (disciplerName.length < 2 || disciplerName.length > 160) {
    return { ok: false, message: "Informe o nome do discipulador ou discipuladora." };
  }
  if (whatsapp.length < 10 || whatsapp.length > 13) {
    return { ok: false, message: "Informe um WhatsApp válido, com DDD." };
  }

  return {
    ok: true,
    value: {
      fullName,
      photoObjectPath: raw.photoObjectPath,
      birthDate: raw.birthDate,
      rg,
      addressStreet,
      addressNumber,
      neighborhood,
      city,
      postalCode,
      baptismDate: raw.baptismDate,
      network,
      disciplerName,
      whatsapp,
    },
  };
}

export function memberPhotoExtension(file: Pick<File, "name" | "type">) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return file.name.toLowerCase().endsWith(".jpeg") ? "jpeg" : "jpg";
}

export function memberNetworkLabel(value: string) {
  return (
    memberNetworks.find((network) => network.value === value)?.label ?? value
  );
}
