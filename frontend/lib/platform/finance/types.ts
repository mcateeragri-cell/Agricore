export type AccountingMethod = "accrual" | "cash";
export type FinanceProfile = {
  company_id: string;
  country_code: string;
  base_currency_code: string;
  tax_system: string;
  tax_label: string;
  accounting_method: AccountingMethod;
  accounting_standard: string;
  financial_year_start_month: number;
  financial_year_start_day: number;
  chart_template: string;
  government_connector: string;
  created_at: string;
  updated_at: string;
};

export type FinanceAccount = {
  id: string;
  company_id: string;
  code: string;
  name: string;
  account_type: "asset" | "liability" | "equity" | "income" | "expense";
  normal_balance: "debit" | "credit";
  system_key: string | null;
  active: boolean;
};

export type FinancePeriod = {
  id: string;
  company_id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  status: "open" | "locked" | "closed";
};
