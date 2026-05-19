// All monetary values are stored as numbers with 2 decimal places.
// The base currency of this project is MXN.

export function roundMxn(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function sumMxn(...amounts: number[]): number {
  return roundMxn(amounts.reduce((acc, v) => acc + (v ?? 0), 0));
}

export function convertToMxn(amount: number, exchangeRate: number): number {
  return roundMxn(amount * exchangeRate);
}

export function formatMxn(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(amount);
}
