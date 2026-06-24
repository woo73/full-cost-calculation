import type { CalculationParameters, CostCategory, CostCalculationMode, CostRateKey } from './types';

export const categoryLabels: Record<CostCategory, string> = {
  product_allocation: '产品分摊成本',
  infrastructure: '基础设施成本',
  delivery_implementation: '交付实施成本',
  custom_development: '定制开发成本',
  operation_maintenance: '运维成本',
  period_expense: '期间费用',
  simulated_interest: '模拟计息财务费用',
  surcharge_tax: '附加税金',
};

export const modeLabels: Record<CostCalculationMode, string> = {
  manual: '手动录入',
  unit_quantity: '单价 x 数量',
  revenue_rate: '收入比例',
  formula: '系统公式',
};

export const costRateLabels: Record<CostRateKey, string> = {
  outputVatRate: '增值税率1',
  incomeTaxRate: '增值税率2',
  outsourcingVatRate: '外包税率',
  internalLaborTaxRate: '自有人工税率',
  managementFeeRate: '管理费用比例',
  salesFeeRate: '销售费用比例',
  financeFeeRate: '财务费用比例',
};

export const defaultParameters: CalculationParameters = {
  outputVatRate: 0.06,
  outsourcingVatRate: 0.06,
  internalLaborTaxRate: 0,
  incomeTaxRate: 0.15,
  surchargeRate: 0.0163,
  surchargeBase: 'revenue_without_tax',
  internalLaborUnitPrice: 3100,
  managementFeeRate: 0.06,
  salesFeeRate: 0,
  financeFeeRate: 0,
  targetGrossMarginRate: 0.25,
  warningGrossMarginRate: 0.15,
};
