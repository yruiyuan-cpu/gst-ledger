export const INCOME_CATEGORIES = [
  "Design consulting income",
  "Property consulting income",
  "Other service income",
  "Rental income",
  "Owner's funding",
  "Refund from IRD",
  "GST refund from IRD",
  "Other income",
] as const;

export const EXPENSE_CATEGORIES = [
  "Office rent",
  "Office supplies & stationery",
  "Internet & mobile phone",
  "Software subscriptions & cloud services",
  "Travel & transport",
  "Marketing & advertising",
  "Client entertainment & meals",
  "Material cost",
  "Accounting, legal & professional services",
  "Insurance",
  "Asset cost",
  "Financial loan",
  "Pay to IRD",
  "GST payment to IRD",
  "Income tax to IRD",
  "Other IRD payments",
  "Other general expenses",
] as const;

export const ALL_CATEGORIES = [
  ...EXPENSE_CATEGORIES,
  ...INCOME_CATEGORIES,
] as const;
