export const INCOME_CATEGORIES = [
  "Design consulting income",
  "Property consulting income",
  "Other service income",
  "Rental income",
  "Other income",
] as const;

export const EXPENSE_CATEGORIES = [
  "Office rent",
  "Office supplies & stationery",
  "Internet",
  "Mobile phone",
  "Software subscriptions & cloud services",
  "Travel & transport",
  "Marketing & advertising",
  "Client entertainment & meals",
  "Project costs & purchases",
  "Accounting, legal & professional services",
  "Insurance",
  "Equipment & asset purchases",
  "Other general expenses",
] as const;

export const ALL_CATEGORIES = [
  ...EXPENSE_CATEGORIES,
  ...INCOME_CATEGORIES,
] as const;
