import { supabase } from './supabaseClient';
import type { Scenario } from './types';
import { defaultParameters } from './constants';

const LOCALSTORAGE_KEY = 'full-cost-calculation:scenarios';

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

export const loadScenarios = async (): Promise<Scenario[]> => {
  const { data, error } = await supabase
    .from('scenarios')
    .select('data')
    .order('data->updatedAt', { ascending: false });

  if (error || !data) return [];
  const supabaseScenarios = data.map((row) => normalizeScenario(row.data as Scenario));

  // 尝试从旧的 localStorage 迁移数据（合并到 Supabase）
  const localScenarios = loadLocalScenarios();
  if (localScenarios.length > 0) {
    await migrateToSupabase(localScenarios);
    localStorage.removeItem(LOCALSTORAGE_KEY);
    // 合并：localStorage 中的方案优先（更新更及时），再追加 Supabase 中不重复的
    const localIds = new Set(localScenarios.map((s) => s.id));
    const extras = supabaseScenarios.filter((s) => !localIds.has(s.id));
    return [...localScenarios, ...extras];
  }

  return supabaseScenarios;
};

const loadLocalScenarios = (): Scenario[] => {
  try {
    const raw = localStorage.getItem(LOCALSTORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeScenario) : [];
  } catch {
    return [];
  }
};

const migrateToSupabase = async (scenarios: Scenario[]) => {
  const rows = scenarios.map((s) => ({
    id: s.id,
    data: s,
    updated_at: new Date().toISOString(),
  }));
  await supabase.from('scenarios').upsert(rows, { onConflict: 'id' });
};

export const saveScenarios = async (scenarios: Scenario[]) => {
  const { data: existing } = await supabase.from('scenarios').select('id');
  const existingIds = new Set((existing ?? []).map((r) => r.id));
  const newIds = new Set(scenarios.map((s) => s.id));

  const toRemove = [...existingIds].filter((id) => !newIds.has(id));
  if (toRemove.length > 0) {
    await supabase.from('scenarios').delete().in('id', toRemove);
  }

  if (scenarios.length === 0) return;

  const rows = scenarios.map((s) => ({
    id: s.id,
    data: s,
    updated_at: new Date().toISOString(),
  }));

  await supabase.from('scenarios').upsert(rows, { onConflict: 'id' });
};

export const verifyPassword = async (password: string): Promise<boolean> => {
  const { data } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'entry_password')
    .single();

  return data?.value === password;
};
