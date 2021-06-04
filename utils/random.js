const crypto = require("crypto");
const promisify = require("./../utils/promisify");

const randomBytes = promisify(crypto.randomBytes);

async function uuidv4() {
  try {
    let b1, b2, b3, b4, b5;

    b1 = await randomBytes(4);
    b2 = await randomBytes(2);
    b3 = await randomBytes(2);
    b4 = await randomBytes(2);
    b5 = await randomBytes(6);

    let uuid = `${b1.toString("hex")}-${b2.toString("hex")}-${b3.toString(
      "hex"
    )}-${b4.toString("hex")}-${b5.toString("hex")}`;

    return uuid;
  } catch (error) {
    throw error;
  }
}

/**
 * @typedef CharactersOptions
 * @type {Object}
 * @property {string} urlSafeCharacters
 * @property {string} numericCharacters
 * @property {string} distinguishableCharacters
 * @property {string} asciiPrintableCharacters
 * @property {string} alphanumericCharacters
 */
const charactersOptions = {
  urlSafeCharacters:
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~".split(
      ""
    ),
  numericCharacters: "0123456789".split(""),
  distinguishableCharacters: "CDEHKMPRTUWXY012458".split(""),
  asciiPrintableCharacters:
    "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~".split(
      ""
    ),
  alphanumericCharacters:
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789".split(""),
};

/**
 * Generates random string of given length compose of given characters.
 * Characters can be a string of characters all next to each other or
 * an array of single character.
 * If no specific characters are passed, it defaults to url-safe characters.
 * @param {!number} length
 * @param {Array<string> | string} [characters]
 * @returns {Promise<string>}
 */
async function randomString(length, characters) {
  try {
    if (!characters) {
      characters = charactersOptions["urlSafeCharacters"];
    } else if (typeof characters === "string") {
      if (characters in charactersOptions) {
        characters = charactersOptions[characters];
      } else {
        characters = characters.split("");
      }
    } else {
      if (!(characters instanceof Array)) {
        throw new InvalidArgumentError(
          "characters can only be a string, array<string> or the predefined characters options."
        );
      }
    }

    const characterCount = characters.length;
    const maxValidSelector =
      Math.floor(0x10000 / characterCount) * characterCount - 1;
    const entropyLength = 2 * Math.ceil(1.1 * length);

    let string = "";
    let stringLength = 0;

    while (stringLength < length) {
      const entropy = await generateRandomBytes(entropyLength);
      let entropyPosition = 0;

      while (entropyPosition < entropyLength && stringLength < length) {
        const ev = entropy.readUInt16LE(entropyPosition);
        entropyPosition += 2;
        if (ev > maxValidSelector) continue;

        string += characters[ev % characterCount];
        stringLength += 1;
      }
    }

    return string;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error("Error while generating random string.");
    }
  }
}

/**
 * Generates random buffer
 * @param {number} length
 * @returns {Promise<Buffer>}
 */
const generateRandomBytes = async (length) => await randomBytes(length);

module.exports = {
  uuidv4,
  generateRandomBytes,
  randomString,
};
