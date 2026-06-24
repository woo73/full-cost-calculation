import { categoryLabels } from './constants';
import type {
  CalculationParameters,
  CalculationResult,
  ComputedCostItem,
  ComputedRevenueItem,
  CostCategory,
  CostItem,
  CostRateKey,
  Scenario,
  WarningLevel,
} from './types';

const money = (value: number) => (Number.isFinite(value) ? value : 0);

const withoutTax = (amountWithTax: number, taxRate: number) => {
  const safeTaxRate = money(taxRate);
  if (safeTaxRate <= 0) return money(amountWithTax);
  return money(amountWithTax) / (1 + safeTaxRate);
};

const sum = (values: number[]) => values.reduce((total, value) => total + money(value), 0);

const rate = (numerator: number, denominator: number) => (denominator === 0 ? 0 : numerator / denominator);

const getCostRateValue = (
  rateKey: CostRateKey | undefined,
  parameters: CalculationParameters,
  fallback: number,
) => {
  if (!rateKey) return money(fallback);
  if (!['managementFeeRate', 'salesFeeRate', 'financeFeeRate'].includes(rateKey)) {
    return money(fallback);
  }
  return money(parameters[rateKey]);
};

const getCostTaxRate = (item: CostItem, parameters: CalculationParameters) => {
  if (
    item.calculationMode === 'formula' ||
    item.calculationMode === 'revenue_rate' ||
    item.category === 'period_expense' ||
    item.category === 'simulated_interest' ||
    item.category === 'surcharge_tax'
  ) {
    return 0;
  }

  if (
    item.rateKey === 'outputVatRate' ||
    item.rateKey === 'incomeTaxRate' ||
    item.rateKey === 'outsourcingVatRate' ||
    item.rateKey === 'internalLaborTaxRate'
  ) {
    return money(parameters[item.rateKey]);
  }

  return money(parameters.outsourcingVatRate);
};

const computeCostAmount = (
  item: CostItem,
  revenueWithTax: number,
  revenueWithoutTax: number,
  surchargeTax: number,
  parameters: CalculationParameters,
) => {
  const calculationMode = item.category === 'period_expense' ? 'revenue_rate' : item.calculationMode;

  switch (calculationMode) {
    case 'unit_quantity':
      return money(item.unitPrice) * money(item.quantity);
    case 'revenue_rate':
      return (item.category === 'period_expense' ? revenueWithTax : revenueWithoutTax) *
        getCostRateValue(item.rateKey, parameters, item.rate);
    case 'formula':
      return item.category === 'surcharge_tax' ? surchargeTax : money(item.amountWithTax);
    case 'manual':
    default:
      return money(item.amountWithTax);
  }
};

export const calculateScenario = (scenario: Scenario): CalculationResult => {
  const revenues: ComputedRevenueItem[] = scenario.revenues.map((item) => {
    const taxRate = money(scenario.parameters[item.rateKey ?? 'outputVatRate']);
    const computedAmountWithTax =
      item.calculationMode === 'unit_quantity'
        ? money(item.unitPrice ?? 0) * money(item.quantity ?? 0)
        : money(item.amountWithTax);
    const amountWithoutTax = withoutTax(computedAmountWithTax, taxRate);
    return {
      ...item,
      taxRate,
      computedAmountWithTax,
      amountWithoutTax,
      taxAmount: computedAmountWithTax - amountWithoutTax,
    };
  });

  const revenueWithTax = sum(revenues.map((item) => item.computedAmountWithTax));
  const revenueWithoutTax = sum(revenues.map((item) => item.amountWithoutTax));
  const outputVat = revenueWithTax - revenueWithoutTax;
  const surchargeBase =
    scenario.parameters.surchargeBase === 'output_vat' ? outputVat : revenueWithoutTax;
  const surchargeTax = surchargeBase * money(scenario.parameters.surchargeRate);

  const costs: ComputedCostItem[] = scenario.costs.map((item) => {
    const computedAmountWithTax = computeCostAmount(
      item,
      revenueWithTax,
      revenueWithoutTax,
      surchargeTax,
      scenario.parameters,
    );
    const taxRate = getCostTaxRate(item, scenario.parameters);
    const amountWithoutTax = withoutTax(computedAmountWithTax, taxRate);
    return {
      ...item,
      taxRate,
      computedAmountWithTax,
      amountWithoutTax,
      taxAmount: computedAmountWithTax - amountWithoutTax,
    };
  });

  const categories = Object.keys(categoryLabels) as CostCategory[];
  const categoryTotals = categories.map((category) => {
    const items = costs.filter((item) => item.category === category);
    return {
      category,
      amountWithTax: sum(items.map((item) => item.computedAmountWithTax)),
      amountWithoutTax: sum(items.map((item) => item.amountWithoutTax)),
    };
  });

  const costWithTax = sum(costs.map((item) => item.computedAmountWithTax));
  const costWithoutTax = sum(costs.map((item) => item.amountWithoutTax));
  const totalProjectCostWithTax = costWithTax;
  const totalProjectCostWithoutTax = costWithoutTax;
  const profitBeforeTaxWithTax = revenueWithTax - totalProjectCostWithTax;
  const incomeTaxWithTax =
    Math.max(profitBeforeTaxWithTax, 0) * money(scenario.parameters.incomeTaxRate);
  const profitAfterTaxWithTax = profitBeforeTaxWithTax - incomeTaxWithTax;
  const projectGrossMarginRateWithTax = rate(profitBeforeTaxWithTax, revenueWithTax);
  const costProfitRateWithTax = rate(profitBeforeTaxWithTax, totalProjectCostWithTax);
  const salesProfitRateWithTax = rate(profitAfterTaxWithTax, revenueWithTax);
  const profitBeforeTaxWithoutTax = revenueWithoutTax - totalProjectCostWithoutTax;
  const incomeTaxWithoutTax =
    Math.max(profitBeforeTaxWithoutTax, 0) * money(scenario.parameters.incomeTaxRate);
  const profitAfterTaxWithoutTax = profitBeforeTaxWithoutTax - incomeTaxWithoutTax;
  const projectGrossMarginRateWithoutTax = rate(profitBeforeTaxWithoutTax, revenueWithoutTax);
  const costProfitRateWithoutTax = rate(profitBeforeTaxWithoutTax, totalProjectCostWithoutTax);
  const salesProfitRateWithoutTax = rate(profitAfterTaxWithoutTax, revenueWithoutTax);

  const totalProjectCost = totalProjectCostWithoutTax;
  const profitBeforeTax = profitBeforeTaxWithoutTax;
  const incomeTax = incomeTaxWithoutTax;
  const profitAfterTax = profitAfterTaxWithoutTax;
  const projectGrossMarginRate = projectGrossMarginRateWithoutTax;
  const costProfitRate = costProfitRateWithoutTax;
  const salesProfitRate = salesProfitRateWithoutTax;

  let warningLevel: WarningLevel = 'excellent';
  if (projectGrossMarginRate < scenario.parameters.warningGrossMarginRate) {
    warningLevel = 'warning';
  } else if (projectGrossMarginRate < scenario.parameters.targetGrossMarginRate) {
    warningLevel = 'normal';
  }

  return {
    revenues,
    costs,
    revenueWithTax,
    revenueWithoutTax,
    outputVat,
    costWithTax,
    costWithoutTax,
    categoryTotals,
    surchargeTax,
    totalProjectCost,
    totalProjectCostWithTax,
    totalProjectCostWithoutTax,
    profitBeforeTaxWithTax,
    incomeTaxWithTax,
    profitAfterTaxWithTax,
    projectGrossMarginRateWithTax,
    costProfitRateWithTax,
    salesProfitRateWithTax,
    profitBeforeTaxWithoutTax,
    incomeTaxWithoutTax,
    profitAfterTaxWithoutTax,
    projectGrossMarginRateWithoutTax,
    costProfitRateWithoutTax,
    salesProfitRateWithoutTax,
    profitBeforeTax,
    incomeTax,
    profitAfterTax,
    projectGrossMarginRate,
    costProfitRate,
    salesProfitRate,
    warningLevel,
  };
};
