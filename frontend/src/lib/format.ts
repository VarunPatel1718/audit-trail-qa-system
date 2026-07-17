export function formatCurrency(amount: string | number, currency: string): string {
  const value = typeof amount === 'string' ? Number(amount) : amount
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value)
  } catch {
    // Unknown/unsupported currency code — fall back to a plain number with the code appended.
    return `${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
  }
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}
