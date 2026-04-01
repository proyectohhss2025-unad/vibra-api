import moment from 'moment';

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
