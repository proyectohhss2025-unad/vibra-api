import { Permission } from 'src/domains/permissions/schemas/permission.schema';

/**
 * Genera un identificador único (serial) basado en timestamp y caracteres aleatorios
 *
 * @param {string} [prefix] - Prefijo opcional para el serial
 * @returns {string} - Serial único generado
 *
 * @example
 * // Sin prefijo
 * generateSerial(); // Output: "PT-20240615-a1b2c3"
 *
 * @example
 * // Con prefijo
 * generateSerial('USER'); // Output: "USER-20240615-x7y8z9"
 */
export function generateSerial(prefix?: string): string {
  const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomChars = Math.random().toString(36).substring(2, 8);
  const serialPrefix = prefix || 'PT';

  return `${serialPrefix}-${timestamp}-${randomChars}`;
}

export function findItem(
  collection: Permission[] = [],
  itemId?: string,
): Permission | undefined {
  return collection.find((item) => item.serial === itemId);
}

export function decomposeAlphanumeric(chain: string): {
  string: string;
  number: number;
} {
  try {
    const hyphenIndex = chain ? chain.indexOf('-') : -1;

    // If no hyphen is found, treat the entire string as alphanumeric
    if (hyphenIndex === -1) {
      let indexFirstNonDigit = 0;
      try {
        indexFirstNonDigit = chain.search(/\D/g);
      } catch (e) {
        return { string: '', number: Number(chain) };
      }

      if (indexFirstNonDigit === -1) {
        return { string: '', number: Number(chain) };
      }

      const aux = countNonNumericCharacters(chain);

      const lettersPart = chain.slice(0, indexFirstNonDigit + aux);
      const numericalPart = Number(chain.slice(indexFirstNonDigit + aux));

      return { string: lettersPart, number: numericalPart };
    }
    // Split the string at the hyphen
    const lettersPart_ = chain.slice(0, hyphenIndex);
    const numericalPart_ = Number(chain.slice(hyphenIndex + 1));

    return { string: lettersPart_, number: numericalPart_ };
  } catch (error) {
    return { string: '', number: 0 };
  }
}

function countNonNumericCharacters(chain: string): number {
  const regexNonNumeric = /\D/g;
  const coincidences = chain.match(regexNonNumeric);
  if (!coincidences) {
    return 0;
  }
  return coincidences.length;
}

/**
// Example
const chain = "$ 517.673";
const number = formatAndConvertToNumber(chain);
 
console.log(`Number: ${number}`); // Exit: Number: 517673
*/
export function formatAndConvertToNumber(chain: string): number {
  // Replace empty, $, point by empty.
  if (chain && chain.length == 0) {
    return 0;
  }
  const formatChain = chain.replace(/[\s$.]/g, '');
  const numero = parseFloat(formatChain);

  return numero;
}

/**
 * Formats a string by removing spaces, points, commas, hyphens, and accents.
 *
 * @param {string} chain The string to be formatted.
 * @param {string} defaultChain The default string to return if the input chain is empty or undefined. Defaults to the current date and time.
 * @returns {string} The formatted string.
 *
 * @example
 * formatString("mini - CARTERA A MARZO 2024 - 06-MAYO-2024");
 * // Output: "miniCARTERAMARZO202406MAYO2024"
 *
 * @example
 * formatString("");
 * // Output: "20231026T184919322Z" (current date and time)
 */
export function formatString(
  chain: string,
  defaultChain: string = '' + new Date(Date.now()),
): string {
  // Replace spaces, points, eat, scripts and accents.
  if (chain && chain.length == 0) {
    const defaultChainFormat = defaultChain
      .replace(/[\s.:,\-]/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    return defaultChainFormat;
  }
  const chainFormat = chain
    .replace(/[\s.,\-]/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Return format chain.
  return chainFormat;
}

export function normalizeStringArray(
  array: string[],
  replaceMap: Record<string, string>,
): string[] {
  return array.map((str) => {
    let normalizedString = str;
    for (const [key, value] of Object.entries(replaceMap)) {
      normalizedString = normalizedString.replace(new RegExp(key, 'g'), value);
    }
    return normalizedString;
  });
}

export function getUrlBase(url: string): string {
  const partsUrl = url.split('/');
  if (partsUrl.length < 3) {
    return url;
  }
  return partsUrl.slice(0, 3).join('/');
}

export function mapArrayToString(obj: any): string {
  if (!obj.myArray || obj.myArray.length === 0) {
    return '';
  }

  const mappedString = obj.myArray
    .map((item: any, index: any) => {
      if (index === obj.myArray.length - 1) {
        return item;
      }

      return `${item}, `;
    })
    .join('');

  return mappedString;
}

export function translateNameStatus(statusName: any): string {
  const translate =
    statusName === 'Sent'
      ? 'Radicada'
      : statusName === 'Generated'
        ? 'Generada'
        : statusName === 'Glossed'
          ? 'Glosada'
          : statusName === 'Approved'
            ? 'Aprobada'
            : statusName === 'Paid'
              ? 'Pago completo'
              : statusName === 'Partial_payment'
                ? 'Pago parcial'
                : statusName === 'Signed'
                  ? 'Firmada'
                  : statusName === 'Verified'
                    ? 'Verificada'
                    : statusName;
  return translate;
}
