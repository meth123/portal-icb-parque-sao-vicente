import assert from "node:assert/strict";
import test from "node:test";
import {
  generateTemporaryPassword,
  isValidNewPassword,
} from "../src/lib/auth/passwords.ts";

test("senha temporária é individual, forte e não contém espaços", () => {
  const passwords = Array.from({ length: 32 }, generateTemporaryPassword);

  assert.equal(new Set(passwords).size, passwords.length);
  for (const password of passwords) {
    assert.equal(password.length, 8);
    assert.match(password, /[A-Z]/);
    assert.match(password, /[a-z]/);
    assert.match(password, /\d/);
    assert.match(password, /[^A-Za-z0-9]/);
    assert.doesNotMatch(password, /\s/);
  }
});

test("validação de nova senha respeita os limites do fluxo", () => {
  assert.equal(isValidNewPassword("1234567"), false);
  assert.equal(isValidNewPassword("12345678"), true);
  assert.equal(isValidNewPassword("x".repeat(128)), true);
  assert.equal(isValidNewPassword("x".repeat(129)), false);
});
