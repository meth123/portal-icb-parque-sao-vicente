import { randomInt } from "node:crypto";

export const minimumPasswordLength = 8;
export const maximumPasswordLength = 128;
const temporaryPasswordLength = 8;
const uppercaseCharacters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const lowercaseCharacters = "abcdefghijkmnopqrstuvwxyz";
const numericCharacters = "23456789";
const symbolCharacters = "!@#$%";
const temporaryPasswordCharacters =
  uppercaseCharacters +
  lowercaseCharacters +
  numericCharacters +
  symbolCharacters;

function randomCharacter(characters: string) {
  return characters[randomInt(characters.length)];
}

export function isValidNewPassword(password: string) {
  return (
    password.length >= minimumPasswordLength &&
    password.length <= maximumPasswordLength
  );
}

export function generateTemporaryPassword() {
  const characters = [
    randomCharacter(uppercaseCharacters),
    randomCharacter(lowercaseCharacters),
    randomCharacter(numericCharacters),
    randomCharacter(symbolCharacters),
  ];

  while (characters.length < temporaryPasswordLength) {
    characters.push(randomCharacter(temporaryPasswordCharacters));
  }

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const targetIndex = randomInt(index + 1);
    [characters[index], characters[targetIndex]] = [
      characters[targetIndex],
      characters[index],
    ];
  }

  return characters.join("");
}
