export type CostCategory =
  | 'product_allocation'
  | 'infrastructure'
  | 'delivery_implementation'
  | 'custom_development'
  | 'operation_maintenance'
  | 'period_expense'
  | 'simulated_interest'
  | 'surcharge_tax';

export type CostCalculationMode =
  | 'manual'
  | 'unit_quantity'
  | 'revenue_rate'
  | 'formula';

export type CostRateKey =
  | 'outputVatRate'
  | 'incomeTaxRate'
  | 'outsourcingVatRate'
  | 'internalLaborTaxRate'
  | 'managementFeeRate'
  | 'salesFeeRate'
  | 'financeFeeRate';

export type WarningLevel = 'excellent' | 'normal' | 'warning';

export interface ProjectInfo {
  projectName: string;
  customerName: string;
  serviceType: string;
  owner: string;
  estimateDate: string;
  description: string;
}

export interface CalculationParameters {
  outputVatRate: number;
  outsourcingVatRate: number;
  internalLaborTaxRate: number;
  incomeTaxRate: number;
  surchargeRate: number;
  surchargeBase: 'output_vat' | 'revenue_without_tax';
  internalLaborUnitPrice: number;
  managementFeeRate: number;
  salesFeeRate: number;
  financeFeeRate: number;
  targetGrossMarginRate: number;
  warningGrossMarginRate: number;
}

export interface RevenueItem {
  id: string;
  name: string;
  calculationMode?: 'manual' | 'unit_quantity';
  unitPrice?: number;
  quantity?: number;
  amountWithTax: number;
  taxRate: number;
  rateKey?: 'outputVatRate' | 'incomeTaxRate';
  note: string;
}

export interface CostItem {
  id: string;
  category: CostCategory;
  name: string;
  calculationMode: CostCalculationMode;
  unitPrice: number;
  quantity: number;
  personDays: number;
  rate: number;
  rateKey?: CostRateKey;
  amountWithTax: number;
  taxRate: number;
  sourceNote: string;
  sortOrder: number;
}

export interface Scenario {
  schemaVersion: number;
  id: string;
  name: string;
  status: 'draft' | 'confirmed' | 'archived';
  projectInfo: ProjectInfo;
  parameters: CalculationParameters;
  revenues: RevenueItem[];
  costs: CostItem[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComputedRevenueItem extends RevenueItem {
  computedAmountWithTax: number;
  amountWithoutTax: number;
  taxAmount: number;
}

export interface ComputedCostItem extends CostItem {
  computedAmountWithTax: number;
  amountWithoutTax: number;
  taxAmount: number;
}

export interface CategoryTotal {
  category: CostCategory;
  amountWithTax: number;
  amountWithoutTax: number;
}

export interface CalculationResult {
  revenues: ComputedRevenueItem[];
  costs: ComputedCostItem[];
  revenueWithTax: number;
  revenueWithoutTax: number;
  outputVat: number;
  costWithTax: number;
  costWithoutTax: number;
  categoryTotals: CategoryTotal[];
  surchargeTax: number;
  totalProjectCost: number;
  totalProjectCostWithTax: number;
  totalProjectCostWithoutTax: number;
  profitBeforeTaxWithTax: number;
  incomeTaxWithTax: number;
  profitAfterTaxWithTax: number;
  projectGrossMarginRateWithTax: number;
  costProfitRateWithTax: number;
  salesProfitRateWithTax: number;
  profitBeforeTaxWithoutTax: number;
  incomeTaxWithoutTax: number;
  profitAfterTaxWithoutTax: number;
  projectGrossMarginRateWithoutTax: number;
  costProfitRateWithoutTax: number;
  salesProfitRateWithoutTax: number;
  profitBeforeTax: number;
  incomeTax: number;
  profitAfterTax: number;
  projectGrossMarginRate: number;
  costProfitRate: number;
  salesProfitRate: number;
  warningLevel: WarningLevel;
}
