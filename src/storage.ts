import type { Scenario } from './types';
import { defaultParameters } from './constants';

const storageKey = 'full-cost-calculation:scenarios';

export const loadScenarios = (): Scenario[] => {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeScenario) : [];
  } catch {
    return [];
  }
};

const normalizeScenario = (scenario: Scenario): Scenario => ({
  ...scenario,
  parameters: {
    ...defaultParameters,
    ...scenario.parameters,
  },
  costs: scenario.costs.map((item) => ({
    ...item,
    category:
      (item.category as string) === 'product_platform' ? 'product_allocation' : item.category,
    calculationMode:
      item.category === 'period_expense'
        ? 'revenue_rate'
        : (item.calculationMode as string) === 'unit_person_day'
          ? 'unit_quantity'
          : item.calculationMode,
    quantity:
      (item.calculationMode as string) === 'unit_person_day' && item.quantity === 0
        ? item.personDays
        : item.quantity,
    rateKey:
      item.category === 'period_expense'
        ? item.name.includes('销售')
          ? 'salesFeeRate'
          : 'managementFeeRate'
        : item.rateKey ??
      (item.name.includes('自有人工')
        ? 'internalLaborTaxRate'
        : item.name.includes('销售')
        ? 'salesFeeRate'
        : item.name.includes('财务')
          ? 'financeFeeRate'
          : item.calculationMode === 'revenue_rate'
            ? 'managementFeeRate'
            : 'outsourcingVatRate'),
  })),
  revenues: scenario.revenues.map((item) => ({
    ...item,
    calculationMode: item.calculationMode ?? 'manual',
    unitPrice: item.unitPrice ?? 0,
    quantity: item.quantity ?? 0,
    rateKey: item.rateKey ?? 'outputVatRate',
  })),
});

export const saveScenarios = (scenarios: Scenario[]) => {
  localStorage.setItem(storageKey, JSON.stringify(scenarios));
};
