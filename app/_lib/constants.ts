export const CURRENCIES = [
  "USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "HKD", "SGD", "MXN",
  "BRL", "INR", "NOK", "SEK", "DKK", "NZD", "ZAR", "AED", "SAR", "PLN",
] as const;

export const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "check", label: "Cheque" },
  { value: "credit_card", label: "Credit Card" },
  { value: "other", label: "Other" },
] as const;

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  bank_transfer: "Bank Transfer",
  check: "Cheque",
  credit_card: "Credit Card",
  other: "Other",
};

export const STATUS_STYLES: Record<string, { fg: string; bg: string }> = {
  draft:   { fg: "#A0A0A0", bg: "#1C1C1C" },
  sent:    { fg: "#6366F1", bg: "#1E1B4B" },
  partial: { fg: "#F59E0B", bg: "#431407" },
  paid:    { fg: "#22C55E", bg: "#052E16" },
  overdue: { fg: "#EF4444", bg: "#450A0A" },
  void:    { fg: "#6B6B6B", bg: "#171717" },
};
