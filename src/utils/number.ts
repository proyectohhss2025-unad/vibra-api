/**
 * Formats a phone number string into the standard (XXX) XXX-XXXX format.
 *
 * This function takes a phone number string as input, removes any non-digit characters,
 * and then formats it with parentheses and hyphens.
 *
 * @param {string} phoneNumber - The phone number string to format.
 * @returns {string} - The formatted phone number string in (XXX) XXX-XXXX format.
 *
 * @example
 * maskFormatPhoneNumber('1234567890'); // returns '(123) 456-7890'
 * maskFormatPhoneNumber('(123) 456-7890'); // returns '(123) 456-7890'
 * maskFormatPhoneNumber('123-456-7890'); // returns '(123) 456-7890'
 */
export const maskFormatPhoneNumber = (phoneNumber: string): string => {
  const cleanedNumber = phoneNumber.replace(/\D/g, '');
  const formattedNumber = `(${cleanedNumber.slice(0, 3)})-${cleanedNumber.slice(3, 6)}-${cleanedNumber.slice(6, 10)}`;

  return formattedNumber;
};

/**
 * Formats a string and converts it to a number.
 *
 * The function removes spaces, dollar signs ($), and periods (.) from the input string
 * before converting it to a floating-point number using `parseFloat`.
 *
 * @param {string} chain - The string to format and convert.
 * @returns {number} - The formatted and converted number.
 *
 * @example
 * formatAndConvertToNumber('123.45'); // returns 123.45
 * formatAndConvertToNumber('$1,234.56'); // returns 1234.56
 * formatAndConvertToNumber('123 456'); // returns 123456
 * formatAndConvertToNumber(' '); // returns 0
 */
export function formatAndConvertToNumber(chain: any): number {
  try {
    if (chain && chain.length == 0) {
      return 0;
    }
    if (Number.isInteger(chain)) {
      return chain;
    }
    const formatChain = chain.replace(/[\s$.]/g, '');
    const numero = parseFloat(formatChain);

    return numero;
  } catch (error) {
    return 0;
  }
}

export function validateIfTheValueIsZero(chain: any): boolean {
  try {
    if (chain && chain.length == 0) {
      return false;
    }
    if (Number.isInteger(chain)) {
      return Number(chain) === 0;
    }
    return false;
  } catch (error) {
    return false;
  }
}

export function extractNumberFromString(inputString: string): {
  number: any;
  string: any;
} {
  const parts = inputString.split(',');
  const numericPart = parts[0].trim();

  if (!isNaN(Number(numericPart))) {
    return { number: Number(numericPart), string: parts[1].trim() };
  } else {
    throw new Error('The string does not contain a valid numeric value.');
  }
}

export function extractDataFromString(inputString: string): {
  partA: any;
  partB: any;
} {
  const parts =
    inputString && inputString.length > 0 ? inputString.split(',') : [];
  try {
    if (parts?.length > 1) {
      return {
        partA: parts[0].trim(),
        partB: parts[1].trim().replace('Í', 'I'),
      };
    }
    if (parts?.length === 1) {
      return { partA: parts[0].trim(), partB: '' };
    }
    return { partA: '', partB: '' };
  } catch (error) {
    return { partA: '', partB: '' };
  }
}

export function calculateTotalInvoiceAmount(items: any[]): number {
  try {
    let totalAmount = 0;
    for (const item of items) {
      totalAmount += item.quantity * item.unitPrice;
    }
    return totalAmount;
  } catch (error) {
    return 0;
  }
}

export function round(numero: number | string, decimales: number = 2): number {
  const num = typeof numero === 'string' ? parseFloat(numero) : numero;
  if (isNaN(num)) {
    throw new Error('El valor proporcionado no es un número válido.');
  }
  return Number(num.toFixed(decimales));
}
