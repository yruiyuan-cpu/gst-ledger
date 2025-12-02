export type CategoryConfig = {
  name: string;
  type: "income" | "expense";
  includeInGst: boolean;
};

const CATEGORY_CONFIGS: CategoryConfig[] = [
  {
    name: "Design consulting income",
    type: "income",
    includeInGst: true,
  },
  {
    name: "Property consulting income",
    type: "income",
    includeInGst: true,
  },
  {
    name: "Other service income",
    type: "income",
    includeInGst: true,
  },
  {
    name: "Rental income",
    type: "income",
    includeInGst: true,
  },
  {
    name: "Owner's funding",
    type: "income",
    includeInGst: false,
  },
  {
    name: "Refund from IRD",
    type: "income",
    includeInGst: false,
  },
  {
    name: "GST refund from IRD",
    type: "income",
    includeInGst: false,
  },
  {
    name: "Other income",
    type: "income",
    includeInGst: true,
  },
  {
    name: "Office rent",
    type: "expense",
    includeInGst: true,
  },
  {
    name: "Office supplies & stationery",
    type: "expense",
    includeInGst: true,
  },
  {
    name: "Internet & mobile phone",
    type: "expense",
    includeInGst: true,
  },
  {
    name: "Software subscriptions & cloud services",
    type: "expense",
    includeInGst: true,
  },
  {
    name: "Travel & transport",
    type: "expense",
    includeInGst: true,
  },
  {
    name: "Marketing & advertising",
    type: "expense",
    includeInGst: true,
  },
  {
    name: "Client entertainment & meals",
    type: "expense",
    includeInGst: true,
  },
  {
    name: "Material cost",
    type: "expense",
    includeInGst: true,
  },
  {
    name: "Accounting, legal & professional services",
    type: "expense",
    includeInGst: true,
  },
  {
    name: "Insurance",
    type: "expense",
    includeInGst: true,
  },
  {
    name: "Asset cost",
    type: "expense",
    includeInGst: true,
  },
  {
    name: "Financial loan",
    type: "expense",
    includeInGst: false,
  },
  {
    name: "Pay to IRD",
    type: "expense",
    includeInGst: false,
  },
  {
    name: "GST payment to IRD",
    type: "expense",
    includeInGst: false,
  },
  {
    name: "Income tax to IRD",
    type: "expense",
    includeInGst: false,
  },
  {
    name: "Other IRD payments",
    type: "expense",
    includeInGst: false,
  },
  {
    name: "Other general expenses",
    type: "expense",
    includeInGst: true,
  },
];

export const INCOME_CATEGORIES = CATEGORY_CONFIGS.filter(
  (category) => category.type === "income",
).map((category) => category.name);

export const EXPENSE_CATEGORIES = CATEGORY_CONFIGS.filter(
  (category) => category.type === "expense",
).map((category) => category.name);

export const ALL_CATEGORIES = [
  ...EXPENSE_CATEGORIES,
  ...INCOME_CATEGORIES,
] as string[];

const gstIncludeLookup = CATEGORY_CONFIGS.reduce<Record<string, boolean>>(
  (acc, category) => {
    acc[category.name.toLowerCase()] = category.includeInGst;
    return acc;
  },
  {},
);

export const isCategoryIncludedInGst = (name?: string | null) => {
  if (!name) return true;
  const key = name.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(gstIncludeLookup, key)) {
    return gstIncludeLookup[key];
  }
  return true;
};

export const CATEGORY_CONFIG = CATEGORY_CONFIGS;
