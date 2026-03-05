
import log4js from "log4js";
import { formatDate } from "./dates";
import { translateNameStatus } from "./string";

const logger = log4js.getLogger("homologate");

export const replaceMap = {
    'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
    'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
    'ñ': 'n', 'Ñ': 'N',
    'º': 'O', // remove degree symbol
    '°': 'O', // remove degree symbol
    ' ': '_', // replace spaces with spaces (for consistency)
    '�': 'O'
};

export const replaceMapValue = {
    'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
    'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
    'ñ': 'n', 'Ñ': 'N',
    'º': '', // remove degree symbol
    '°': '', // remove degree symbol
    ' ': ' ', // replace spaces with spaces (for consistency)
    '�': ''
};

export function getFirstRow<T>(data: any[]): T[] {
    if (data.length === 0) {
        return [];
    }
    return [data[0]];
}

export function getPropertyNameFromJSONObjects<T extends Record<string, any>>(objects: T[], replaceMap: Record<string, string>): string[] {
    return objects.map(obj => {
        const nameKey = Object.keys(obj).find(key => key.length > 1);
        if (nameKey) {
            let normalizedNameKey = nameKey;
            for (const [key, value] of Object.entries(replaceMap)) {
                normalizedNameKey = normalizedNameKey.replace(new RegExp(key, 'g'), value);
            }
            return normalizedNameKey;
        }
        return '';
    });
}

export function normalizePropertyNames<T extends Record<string, any>>(objects: T[], replaceMap: Record<string, string>, replaceMapValue: Record<string, string>): T[] {
    return objects.map(obj => {
        const normalizedObj: { [key: string]: any } = {};
        for (const key in obj) {
            if (Object.hasOwnProperty.call(obj, key)) {
                const normalizedKey = key.trim().replace(new RegExp(Object.keys(replaceMap).join('|'), 'g'), match => replaceMap[match]).trim();
                normalizedObj[normalizedKey] = obj[key].trim().replace(new RegExp(Object.keys(replaceMapValue).join('|'), 'g'), (match: any) => replaceMapValue[match]).trim()
            }
        }
        return normalizedObj as T;
    });
}

export function normalizeArrayStringPropertyNames<T extends Record<string, any>>(objects: T[], replaceMap: Record<string, string>): T[] {
    return objects.map(obj => {
        const normalizedObj: { [key: string]: any } = {};
        for (const key in obj) {
            if (Object.hasOwnProperty.call(obj, key)) {
                const normalizedKey = key.trim().replace(new RegExp(Object.keys(replaceMap).join('|'), 'g'), match => replaceMap[match]).trim();
                normalizedObj[normalizedKey] = obj[key];
            }
        }
        return normalizedObj as T;
    });
}

export function normalizeArrayString(arr: string[]): string[] {
    return arr.map(element => {
        let normalizedElement = element.trim();
        for (const [key, value] of Object.entries(replaceMap)) {
            normalizedElement = normalizedElement.replace(new RegExp(key, 'g'), value);
        }
        return normalizedElement;
    });
}

export function concatInvoiceStatusProperties(statuses: any[]): string {
    try {
        return statuses.reduce((concat, item) => {
            return concat + `${translateNameStatus(item?.oldInvoiceStatus?.name)} a ${translateNameStatus(item?.currentInvoiceStatus?.name)} por ${item.createdBy} el ${formatDate(item?.createdAt ?? null, 'YYYY-MM-DD')} `;
        }, '');
    } catch (error) {
        return '';
    }
}

export function getPropertyNameFromJSONObjects_<T extends Record<string, any>>(objects: T[], replaceMap: Record<string, string>): string[] {
    return objects.map(obj => {
        const nameKey = Object.keys(obj).find(key => key.length > 1);
        if (nameKey) {
            let normalizedNameKey = nameKey;
            for (const [key, value] of Object.entries(replaceMap)) {
                normalizedNameKey = normalizedNameKey.replace(new RegExp(key, 'g'), value);
            }
            return normalizedNameKey;
        }
        return '';
    });
}

export function getPropertyNames<T extends Record<string, any>>(objects: T[]): string[] {
    if (objects.length === 0) {
        return [];
    }

    const firstObject = objects[0];
    return Object.keys(firstObject);
}


export function getCompareArray(arr1: string[], arr2: string[]): { coincide: boolean; doNotMatch: string[] } {
    const coincide = arr1.every(element => arr2.includes(element)) &&
        arr2.every(element => arr1.includes(element));

    const doNotMatch: string[] = [];
    for (const element of arr1) {
        if (!arr2.includes(element)) {
            doNotMatch.push(element);
        }
    }
    for (const element of arr2) {
        if (!arr1.includes(element)) {
            doNotMatch.push(element);
        }
    }

    return { coincide, doNotMatch };
}

export function getCompareArrays(arr1: any[], arr2: any[]): { coincide: boolean; doNotMatchA: any; doNotMatchB: any } {
    const coincide = arr1.every(element => arr2.includes(element)) &&
        arr2.every(element => arr1.includes(element));

    const doNotMatchA: any = arr1.filter(element => !arr2.includes(element));
    const doNotMatchB: any = arr2.filter(element => !arr1.includes(element));

    return { coincide, doNotMatchA, doNotMatchB };
}

export function convertStringToArray(chain: string): any[] {
    const cleanChain = chain.trim();
    return cleanChain.split(',').map(elemento => elemento.trim());
}

export function sumArrayValues(arr: number[]): number {
    let sum = 0;
    for (let i = 0; i < arr.length; i++) {
        sum += arr[i];
    }
    return sum;
};

