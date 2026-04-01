export function formatToLocalCurrency(amount: number, locale: string): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });

  return formatter.format(amount);
}
