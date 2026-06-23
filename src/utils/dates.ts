import moment from 'moment';

const COLOMBIA_TZ = 'America/Bogota';

/**
 * Obtiene el inicio y fin del día en Colombia (UTC-5)
 * Devuelve rangos en UTC para usar en queries de MongoDB
 */
export function getColombiaDayRange(): {
  start: Date;
  end: Date;
  todayStr: string;
  tomorrowStr: string;
} {
  const now = new Date();

  // Convertir la hora actual a string en Colombia para obtener la fecha
  const colombiaDateStr = now.toLocaleDateString('en-CA', {
    timeZone: COLOMBIA_TZ,
  }); // yyyy-mm-dd

  // Crear inicio del día en Colombia en UTC
  const start = new Date(`${colombiaDateStr}T00:00:00-05:00`);
  const end = new Date(`${colombiaDateStr}T23:59:59.999-05:00`);

  // Strings para comparación en aggregate (siempre en Colombia)
  const todayStr = colombiaDateStr;
  // Sumar 24h en timestamp y convertir a Colombia para obtener el "día siguiente"
  const tomorrowDate = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrowDate.toLocaleDateString('en-CA', {
    timeZone: COLOMBIA_TZ,
  });

  return { start, end, todayStr, tomorrowStr };
}

// Function to format the selected date using Moment.js
export const formatDate = (date: Date | null, format: string): string => {
  if (!date) {
    return 'Select a date';
  }
  return moment(date).format(format); // Customize format as needed
};

export const getDaysInArrears = (expirationDate: Date): number => {
  try {
    const today = new Date();
    const differenceInMillis = today.getTime() - expirationDate.getTime();
    const daysInMora = Math.floor(differenceInMillis / (1000 * 60 * 60 * 24));
    return daysInMora;
  } catch (error) {
    return 0;
  }
};

export const addDays = (date: any, days: any): Date => {
  const result = new Date(date); // Crear una copia
  result.setDate(result.getDate() + days); // Sumar los días
  return result;
};
