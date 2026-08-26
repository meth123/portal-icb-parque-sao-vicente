import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  memberNetworkLabel,
  validateMemberRegistration,
} from "../src/lib/member-registration.ts";

const userId = "11111111-1111-4111-8111-111111111111";
const photoId = "22222222-2222-4222-8222-222222222222";

function validRegistration() {
  return {
    fullName: "  Maria   da Silva  ",
    photoObjectPath: `${userId}/${photoId}.jpg`,
    birthDate: "1990-05-20",
    rg: "12.345.678-9",
    addressStreet: "  Rua das Flores ",
    addressNumber: "123",
    neighborhood: "Centro",
    city: "Santo André",
    postalCode: "09210-000",
    baptismDate: "2010-08-15",
    network: "mulheres",
    disciplerName: "  Ana   Souza ",
    whatsapp: "(11) 99999-9999",
  };
}

test("valida e normaliza todos os dados da ficha", () => {
  const result = validateMemberRegistration(
    validRegistration(),
    userId,
    "2026-08-26",
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.fullName, "Maria da Silva");
  assert.equal(result.value.addressStreet, "Rua das Flores");
  assert.equal(result.value.postalCode, "09210000");
  assert.equal(result.value.whatsapp, "11999999999");
  assert.equal(memberNetworkLabel(result.value.network), "Mulheres");
});

test("recusa foto fora da pasta do usuário autenticado", () => {
  const registration = validRegistration();
  registration.photoObjectPath = `33333333-3333-4333-8333-333333333333/${photoId}.jpg`;

  const result = validateMemberRegistration(
    registration,
    userId,
    "2026-08-26",
  );
  assert.deepEqual(result, {
    ok: false,
    message: "A foto enviada possui um caminho inválido.",
  });
});

test("recusa datas futuras e contato incompleto", () => {
  const futureDate = validRegistration();
  futureDate.birthDate = "2026-08-27";
  assert.equal(
    validateMemberRegistration(futureDate, userId, "2026-08-26").ok,
    false,
  );

  const shortPhone = validRegistration();
  shortPhone.whatsapp = "1234";
  assert.equal(
    validateMemberRegistration(shortPhone, userId, "2026-08-26").ok,
    false,
  );
});

test("banco e rotas protegem a consulta para supervisão, pastor e administrador", () => {
  const migration = readFileSync(
    new URL(
      "../supabase/migrations/20260826121908_create_member_registrations.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const dataSource = readFileSync(
    new URL("../src/lib/data/member-registrations.ts", import.meta.url),
    "utf8",
  );
  const photoRoute = readFileSync(
    new URL(
      "../src/app/(portal)/portal/ficha-de-membro/cadastros/[id]/foto/route.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(migration, /alter table public\.member_registrations enable row level security/i);
  assert.match(migration, /for insert\s+to authenticated\s+with check/i);
  assert.match(
    migration,
    /for select\s+to authenticated\s+using \(\(select public\.is_administrator\(\)\)\)/i,
  );
  assert.match(migration, /'member-photos',[\s\S]*false,[\s\S]*10485760/);
  assert.match(dataSource, /canAccessAdministration\(user\)/);
  assert.match(photoRoute, /canAccessMemberRegistrations\(\)/);
});

test("envio captura os campos antes de desabilitar o formulário", () => {
  const formSource = readFileSync(
    new URL(
      "../src/app/(portal)/portal/ficha-de-membro/member-registration-form.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const formDataPosition = formSource.indexOf("const formData = new FormData(form)");
  const uploadingPosition = formSource.indexOf("setUploading(true)", formDataPosition);

  assert.ok(formDataPosition > 0);
  assert.ok(uploadingPosition > formDataPosition);
  assert.doesNotMatch(formSource, /defaultValue=\{defaultFullName\}/);
  assert.match(formSource, /defaultValue=\{defaultDisciplerName\}/);
  assert.match(formSource, /<CheckCheck aria-hidden="true"/);
});

test("equipe pastoral possui ações protegidas para editar e excluir", () => {
  const migration = readFileSync(
    new URL(
      "../supabase/migrations/20260826155126_manage_member_registrations.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const actions = readFileSync(
    new URL(
      "../src/app/(portal)/portal/ficha-de-membro/actions.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(migration, /for update\s+to authenticated[\s\S]*with check/i);
  assert.match(migration, /for delete\s+to authenticated/i);
  assert.match(actions, /export async function updateMemberRegistration/);
  assert.match(actions, /export async function deleteMemberRegistration/);
  assert.ok((actions.match(/canAccessAdministration\(user\)/g)?.length ?? 0) >= 2);
});

test("listagem não baixa miniaturas das fotos dos membros", () => {
  const directory = readFileSync(
    new URL(
      "../src/app/(portal)/portal/ficha-de-membro/cadastros/member-registration-directory.tsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.doesNotMatch(directory, /\/foto/);
  assert.doesNotMatch(directory, /<img/);
  assert.match(directory, /<UserRound aria-hidden="true"/);
});
