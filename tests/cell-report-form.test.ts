import assert from "node:assert/strict";
import test from "node:test";
import {
  flattenGuestGroups,
  getFirstPendingLeadershipId,
  getLeadershipRecords,
  parsePastedNames,
  removeIncompleteLeadershipDrafts,
} from "../src/lib/cell-report-form.ts";

const leader = "leader-id";
const junior = "junior-id";
const pedro = "pedro-id";

test("um registro compartilhado satisfaz Líder e Vice sem criar cópia", () => {
  const records = [
    {
      leadershipIds: [leader, junior],
      durationText: "4h",
      referenceDate: "2026-08-10",
    },
  ];

  assert.equal(getLeadershipRecords(records, leader).length, 1);
  assert.equal(getLeadershipRecords(records, junior).length, 1);
  assert.equal(
    getFirstPendingLeadershipId([leader, junior], records, {}),
    undefined,
  );
});

test("grupos diferentes permanecem em registros diferentes", () => {
  const records = [
    { leadershipIds: [leader, junior, pedro], durationText: "2h" },
    { leadershipIds: [leader, pedro], durationText: "2h" },
  ];

  assert.equal(getLeadershipRecords(records, leader).length, 2);
  assert.equal(getLeadershipRecords(records, junior).length, 1);
  assert.equal(getLeadershipRecords(records, pedro).length, 2);
});

test("a mesma pessoa pode participar de registro compartilhado e depois sozinha", () => {
  const records = [
    { leadershipIds: [leader, junior] },
    { leadershipIds: [junior] },
  ];

  assert.equal(getLeadershipRecords(records, junior).length, 2);
  assert.equal(
    getFirstPendingLeadershipId([leader, junior], records, {}),
    undefined,
  );
});

test("status usa ID e não confunde duas pessoas com o mesmo nome", () => {
  const firstPedroId = "pedro-1";
  const secondPedroId = "pedro-2";
  const records = [{ leadershipIds: [firstPedroId] }];

  assert.equal(getLeadershipRecords(records, firstPedroId).length, 1);
  assert.equal(getLeadershipRecords(records, secondPedroId).length, 0);
  assert.equal(
    getFirstPendingLeadershipId(
      [firstPedroId, secondPedroId],
      records,
      { [secondPedroId]: "Não participou nesta semana." },
    ),
    undefined,
  );
});

test("integrantes manuais não alteram o status da liderança", () => {
  const records = [
    {
      leadershipIds: [leader],
      manualParticipants: ["Mateus", "Rafael"],
    },
  ];

  assert.equal(getLeadershipRecords(records, junior).length, 0);
  assert.equal(
    getFirstPendingLeadershipId([leader, junior], records, {}),
    junior,
  );
});

test("Não evangelizou resolve a pendência imediatamente, antes de digitar o motivo", () => {
  assert.equal(
    getFirstPendingLeadershipId([leader, junior], [], {
      [leader]: "",
      [junior]: "Não participou nesta semana.",
    }),
    undefined,
  );
});

test("Não evangelizou remove o rascunho incompleto sem apagar registros válidos", () => {
  const records = [
    {
      key: 1,
      primaryLeadershipId: junior,
      leadershipIds: [junior],
      complete: false,
    },
    {
      key: 2,
      primaryLeadershipId: leader,
      leadershipIds: [leader, junior],
      complete: false,
    },
    {
      key: 3,
      primaryLeadershipId: leader,
      leadershipIds: [leader, junior],
      complete: true,
    },
  ];

  assert.deepEqual(
    removeIncompleteLeadershipDrafts(
      records,
      junior,
      (record) => !record.complete,
    ),
    [
      {
        key: 2,
        primaryLeadershipId: leader,
        leadershipIds: [leader],
        complete: false,
      },
      {
        key: 3,
        primaryLeadershipId: leader,
        leadershipIds: [leader, junior],
        complete: true,
      },
    ],
  );
});

test("convidados agrupados na interface voltam ao payload plano", () => {
  const guests = flattenGuestGroups([
    {
      responsibleName: "Eugênio",
      guests: [
        { key: 1, name: "Mateus", isFirstTime: true },
        { key: 2, name: "Marcos", isFirstTime: false },
      ],
    },
    {
      responsibleName: "Junior",
      guests: [{ key: 3, name: "Pedro", isFirstTime: false }],
    },
  ]);

  assert.deepEqual(guests, [
    {
      key: 1,
      name: "Mateus",
      isFirstTime: true,
      responsibleName: "Eugênio",
    },
    {
      key: 2,
      name: "Marcos",
      isFirstTime: false,
      responsibleName: "Eugênio",
    },
    {
      key: 3,
      name: "Pedro",
      isFirstTime: false,
      responsibleName: "Junior",
    },
  ]);
});

test("lista colada cria somente nomes não vazios com espaços externos removidos", () => {
  assert.deepEqual(
    parsePastedNames(
      "  Manoel  \r\n\r\nRafael\n   Lucas   \n   \nMaria\nJoana  ",
    ),
    ["Manoel", "Rafael", "Lucas", "Maria", "Joana"],
  );
});
