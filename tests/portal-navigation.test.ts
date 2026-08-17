import assert from "node:assert/strict";
import test from "node:test";
import { buildPortalNavigation } from "../src/lib/portal-navigation.ts";

function hrefs(items: ReturnType<typeof buildPortalNavigation>["moreItems"]) {
  return items.map((item) => item.href);
}

test("usuário sem vínculo recebe somente início e perfil", () => {
  const navigation = buildPortalNavigation({
    cellId: null,
    hasDocumentLibraryAccess: false,
    hasPastoralAccess: false,
    hasAdministrationAccess: false,
  });

  assert.deepEqual(hrefs(navigation.primaryItems), ["/portal"]);
  assert.deepEqual(hrefs(navigation.bottomItems), ["/portal"]);
  assert.deepEqual(hrefs(navigation.moreItems), ["/portal/perfil"]);
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
  assert.deepEqual(hrefs(navigation.secondaryItems), ["/portal/documentos"]);
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
    "/portal/documentos",
    "/portal/organizacao",
    "/portal/supervisao",
    "/portal/admin",
  ]);
  assert.ok(hrefs(navigation.primaryItems).includes("/portal/relatorios"));
  assert.ok(!hrefs(navigation.primaryItems).some((href) => href.includes("/celulas/")));
});
