/** Small formatting helpers shared by the UI. */

/**
 * Prices without a confirmed currency are never shown. When the clinic
 * publishes prices they are rendered in the currency stored with the service
 * (`OMR` by default), using three decimals — the convention for Omani Rial.
 */
export function formatCurrency(amount: number, currency = 'OMR'): string {
  const fractionDigits = currency === 'OMR' ? 3 : 2;
  try {
    return new Intl.NumberFormat('en-OM', {
      style: 'currency',
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amount);
  } catch {
    return `${amount.toFixed(fractionDigits)} ${currency}`;
  }
}

/** Joins class names, dropping falsy values. */
export function cx(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}
