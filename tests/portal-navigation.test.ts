import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildPortalNavigation } from "../src/lib/portal-navigation.ts";

const portalNavigationSource = readFileSync(
  new URL("../src/components/portal/portal-nav-link.tsx", import.meta.url),
  "utf8",
);
const portalHomeSource = readFileSync(
  new URL("../src/app/(portal)/portal/page.tsx", import.meta.url),
  "utf8",
);
const currentUserSource = readFileSync(
  new URL("../src/lib/auth/current-user.ts", import.meta.url),
  "utf8",
);

function hrefs(items: ReturnType<typeof buildPortalNavigation>["moreItems"]) {
  return items.map((item) => item.href);
}

test("ficha de membro fica em Mais e não na barra inferior", () => {
  const navigation = buildPortalNavigation({
    cellId: null,
    hasDocumentLibraryAccess: false,
    hasPastoralAccess: false,
    hasAdministrationAccess: false,
  });

  assert.deepEqual(hrefs(navigation.primaryItems), ["/portal"]);
  assert.deepEqual(hrefs(navigation.bottomItems), ["/portal"]);
  assert.deepEqual(hrefs(navigation.secondaryItems), [
    "/portal/ficha-de-membro",
    "/portal/testemunhos",
  ]);
  assert.deepEqual(hrefs(navigation.moreItems), [
    "/portal/ficha-de-membro",
    "/portal/testemunhos",
    "/portal/perfil",
  ]);
});

test("liderança recebe somente os recursos vinculados à própria célula", () => {
  const navigation = buildPortalNavigation({
    cellId: "cell-1",
    hasDocumentLibraryAccess: true,
    hasPastoralAccess: false,
    hasAdministrationAccess: false,
  });

  assert.deepEqual(hrefs(navigation.primaryItems), [
    "/portal",
    "/portal/relatorios",
    "/portal/celulas/cell-1",
    "/portal/checklist",
  ]);
  assert.deepEqual(hrefs(navigation.secondaryItems), [
    "/portal/ficha-de-membro",
    "/portal/testemunhos",
    "/portal/documentos",
  ]);
  assert.deepEqual(hrefs(navigation.bottomItems), [
    "/portal",
    "/portal/relatorios",
    "/portal/celulas/cell-1",
    "/portal/documentos",
  ]);
  assert.ok(hrefs(navigation.moreItems).includes("/portal/ficha-de-membro"));
  assert.ok(!hrefs(navigation.moreItems).includes("/portal/documentos"));
  assert.ok(!hrefs(navigation.bottomItems).includes("/portal/testemunhos"));
  assert.ok(!hrefs(navigation.moreItems).includes("/portal/admin"));
});

test("acesso pastoral e administrativo libera somente os módulos correspondentes", () => {
  const navigation = buildPortalNavigation({
    cellId: null,
    hasDocumentLibraryAccess: true,
    hasPastoralAccess: true,
    hasAdministrationAccess: true,
  });

  assert.deepEqual(hrefs(navigation.secondaryItems), [
    "/portal/ficha-de-membro",
    "/portal/testemunhos",
    "/portal/documentos",
    "/portal/organizacao",
    "/portal/supervisao",
    "/portal/supervisao/chamada",
    "/portal/admin",
  ]);
  assert.ok(hrefs(navigation.primaryItems).includes("/portal/relatorios"));
  assert.ok(!hrefs(navigation.primaryItems).includes("/portal/ficha-de-membro"));
  assert.deepEqual(hrefs(navigation.bottomItems), [
    "/portal",
    "/portal/relatorios",
    "/portal/documentos",
  ]);
  assert.ok(!hrefs(navigation.primaryItems).some((href) => href.includes("/celulas/")));
});

test("chamada da supervisão usa ícone próprio de presença", () => {
  assert.match(portalNavigationSource, /attendance: UserRoundCheck/);
  assert.match(
    portalHomeSource,
    /title="Chamada da Supervisão"[\s\S]*icon={<UserRoundCheck/,
  );
});

test("chamada da supervisão não é liberada apenas pelo vínculo de liderança", () => {
  const functionStart = currentUserSource.indexOf(
    "export function canManageSupervisionAttendance",
  );
  const permissionRule = currentUserSource.slice(functionStart, functionStart + 500);

  assert.notEqual(functionStart, -1);
  assert.match(permissionRule, /globalRole === "administrator"/);
  assert.match(permissionRule, /globalRole === "pastor"/);
  assert.match(permissionRule, /isSupervisor/);
  assert.doesNotMatch(permissionRule, /currentLeadershipRole/);
});
