import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { calculateScenario } from './calculationEngine';
import { categoryLabels, costRateLabels, modeLabels } from './constants';
import { exportScenarioAsExcel } from './exportService';
import { formatMoney, formatPercent } from './formatters';
import { cloneScenario, createScenario } from './scenarioFactory';
import { loadScenarios, saveScenarios } from './storage';
import type {
  CalculationParameters,
  CostCategory,
  CostCalculationMode,
  CostItem,
  CostRateKey,
  RevenueItem,
  Scenario,
} from './types';

const categories = Object.keys(categoryLabels) as CostCategory[];
const modes = Object.keys(modeLabels) as CostCalculationMode[];
const taxRateKeys: CostRateKey[] = [
  'outputVatRate',
  'incomeTaxRate',
  'internalLaborTaxRate',
  'outsourcingVatRate',
];
const periodRateKeys: CostRateKey[] = ['managementFeeRate', 'salesFeeRate'];
const categoryIndexLabels = ['一', '二', '三', '四', '五', '六', '七', '八'];

const numberValue = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const percentValue = (value: string) => numberValue(value) / 100;
const numberInputValue = (value: number) => (value === 0 ? '' : value);

const isAmountEnabled = (mode: CostCalculationMode) => mode === 'manual';
const isUnitEnabled = (mode: CostCalculationMode) => mode === 'unit_quantity';
const isRateEnabled = (mode: CostCalculationMode) => mode === 'revenue_rate';
const isPeriodExpense = (category: CostCategory) => category === 'period_expense';
const getEffectiveMode = (category: CostCategory, mode: CostCalculationMode): CostCalculationMode =>
  isPeriodExpense(category) ? 'revenue_rate' : mode;
const revenueModeLabels = {
  manual: '手动录入',
  unit_quantity: '单价 x 数量',
} as const;
const revenueModes = Object.keys(revenueModeLabels) as Array<keyof typeof revenueModeLabels>;

const getRateOptions = (category: CostCategory): CostRateKey[] =>
  category === 'period_expense' ? periodRateKeys : taxRateKeys;

const getDefaultRateKey = (category: CostCategory, name = ''): CostRateKey => {
  if (category === 'period_expense') {
    return name.includes('销售') ? 'salesFeeRate' : 'managementFeeRate';
  }

  return name.includes('自有人工') ? 'internalLaborTaxRate' : 'outsourcingVatRate';
};

const resolveRateKey = (category: CostCategory, rateKey: CostRateKey | undefined, name: string) => {
  const options = getRateOptions(category);
  return rateKey && options.includes(rateKey) ? rateKey : getDefaultRateKey(category, name);
};

const getDisplayRate = (
  category: CostCategory,
  item: ReturnType<typeof calculateScenario>['costs'][number],
  parameters: CalculationParameters,
) => {
  if (!isPeriodExpense(category)) return item.taxRate;
  const rateKey = resolveRateKey(category, item.rateKey, item.name);
  return parameters[rateKey];
};

const touch = (scenario: Scenario): Scenario => ({
  ...scenario,
  updatedAt: new Date().toISOString(),
});

export const App = () => {
  const [scenarios, setScenarios] = useState<Scenario[]>(() => {
    const stored = loadScenarios();
    return stored.length > 0 ? stored : [createScenario()];
  });
  const [activeId, setActiveId] = useState(() => scenarios[0]?.id ?? '');

  const activeScenario = scenarios.find((scenario) => scenario.id === activeId) ?? scenarios[0];
  const result = useMemo(() => calculateScenario(activeScenario), [activeScenario]);

  useEffect(() => {
    saveScenarios(scenarios);
  }, [scenarios]);

  const updateActive = (updater: (scenario: Scenario) => Scenario) => {
    setScenarios((current) =>
      current.map((scenario) => (scenario.id === activeScenario.id ? touch(updater(scenario)) : scenario)),
    );
  };

  const addScenario = () => {
    const scenario = createScenario('新的全成本测算');
    setScenarios((current) => [scenario, ...current]);
    setActiveId(scenario.id);
  };

  const duplicateScenario = () => {
    const scenario = cloneScenario(activeScenario);
    setScenarios((current) => [scenario, ...current]);
    setActiveId(scenario.id);
  };

  const deleteScenario = () => {
    if (scenarios.length === 1) return;
    const next = scenarios.filter((scenario) => scenario.id !== activeScenario.id);
    setScenarios(next);
    setActiveId(next[0].id);
  };

  const updateRevenue = (id: string, patch: Partial<RevenueItem>) => {
    updateActive((scenario) => ({
      ...scenario,
      revenues: scenario.revenues.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const updateCost = (id: string, patch: Partial<CostItem>) => {
    updateActive((scenario) => ({
      ...scenario,
      costs: scenario.costs.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
  };

  const addCost = (category: CostCategory) => {
    updateActive((scenario) => ({
      ...scenario,
      costs: [
        ...scenario.costs,
        {
          id: `cost_${crypto.randomUUID()}`,
          category,
          name: '新增细项',
          calculationMode: isPeriodExpense(category) ? 'revenue_rate' : 'manual',
          unitPrice: 0,
          quantity: 0,
          personDays: 0,
          rate: 0,
          rateKey: getDefaultRateKey(category),
          amountWithTax: 0,
          taxRate: 0,
          sourceNote: '',
          sortOrder: scenario.costs.length + 1,
        },
      ],
    }));
  };

  const addRevenue = () => {
    updateActive((scenario) => ({
      ...scenario,
      revenues: [
        ...scenario.revenues,
        {
          id: `rev_${crypto.randomUUID()}`,
          name: '新增收入',
          calculationMode: 'manual',
          unitPrice: 0,
          quantity: 0,
          amountWithTax: 0,
          taxRate: scenario.parameters.outputVatRate,
          rateKey: 'outputVatRate',
          note: '',
        },
      ],
    }));
  };

  const removeCost = (id: string) => {
    updateActive((scenario) => ({
      ...scenario,
      costs: scenario.costs.filter((item) => item.id !== id),
    }));
  };

  const removeRevenue = (id: string) => {
    updateActive((scenario) => ({
      ...scenario,
      revenues: scenario.revenues.length === 1 ? scenario.revenues : scenario.revenues.filter((item) => item.id !== id),
    }));
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span>全成本测算</span>
          <button type="button" onClick={addScenario} title="新建方案">
            +
          </button>
        </div>
        <div className="scenario-list">
          {scenarios.map((scenario) => (
            <button
              type="button"
              key={scenario.id}
              className={scenario.id === activeScenario.id ? 'scenario active' : 'scenario'}
              onClick={() => setActiveId(scenario.id)}
            >
              <strong>{scenario.name}</strong>
              <span>{scenario.projectInfo.serviceType || '未分类'}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <input
              className="title-input"
              value={activeScenario.name}
              onChange={(event) =>
                updateActive((scenario) => ({
                  ...scenario,
                  name: event.target.value,
                  projectInfo: { ...scenario.projectInfo, projectName: event.target.value },
                }))
              }
            />
            <p>本地保存 · 最后更新 {new Date(activeScenario.updatedAt).toLocaleString('zh-CN')}</p>
          </div>
          <div className="actions">
            <button type="button" onClick={duplicateScenario}>复制</button>
            <button type="button" onClick={deleteScenario} disabled={scenarios.length === 1}>删除</button>
            <button type="button" onClick={() => exportScenarioAsExcel(activeScenario, result)}>导出Excel</button>
          </div>
        </header>

        <div className="main-grid">
          <section className="left-panel">
            <Panel title="项目信息">
              <div className="form-grid">
                <TextField label="客户名称" value={activeScenario.projectInfo.customerName} onChange={(value) => updateActive((scenario) => ({ ...scenario, projectInfo: { ...scenario.projectInfo, customerName: value } }))} />
                <TextField label="服务类型" value={activeScenario.projectInfo.serviceType} onChange={(value) => updateActive((scenario) => ({ ...scenario, projectInfo: { ...scenario.projectInfo, serviceType: value } }))} />
                <TextField label="负责人" value={activeScenario.projectInfo.owner} onChange={(value) => updateActive((scenario) => ({ ...scenario, projectInfo: { ...scenario.projectInfo, owner: value } }))} />
                <TextField label="测算日期" type="date" value={activeScenario.projectInfo.estimateDate} onChange={(value) => updateActive((scenario) => ({ ...scenario, projectInfo: { ...scenario.projectInfo, estimateDate: value } }))} />
              </div>
            </Panel>

            <Panel title="参数配置">
              <div className="form-grid">
                <NumberField label="增值税率1" value={activeScenario.parameters.outputVatRate * 100} onChange={(value) => updateActive((scenario) => ({ ...scenario, parameters: { ...scenario.parameters, outputVatRate: percentValue(value) } }))} />
                <NumberField label="增值税率2" value={activeScenario.parameters.incomeTaxRate * 100} onChange={(value) => updateActive((scenario) => ({ ...scenario, parameters: { ...scenario.parameters, incomeTaxRate: percentValue(value) } }))} />
                <NumberField label="自有人工税率%" value={activeScenario.parameters.internalLaborTaxRate * 100} onChange={(value) => updateActive((scenario) => ({ ...scenario, parameters: { ...scenario.parameters, internalLaborTaxRate: percentValue(value) } }))} />
                <NumberField label="外包税率%" value={activeScenario.parameters.outsourcingVatRate * 100} onChange={(value) => updateActive((scenario) => ({ ...scenario, parameters: { ...scenario.parameters, outsourcingVatRate: percentValue(value) } }))} />
                <NumberField label="附加税比例%" value={activeScenario.parameters.surchargeRate * 100} onChange={(value) => updateActive((scenario) => ({ ...scenario, parameters: { ...scenario.parameters, surchargeRate: percentValue(value) } }))} />
                <NumberField label="管理费用比例%" value={activeScenario.parameters.managementFeeRate * 100} onChange={(value) => updateActive((scenario) => ({ ...scenario, parameters: { ...scenario.parameters, managementFeeRate: percentValue(value) } }))} />
                <NumberField label="销售费用比例%" value={activeScenario.parameters.salesFeeRate * 100} onChange={(value) => updateActive((scenario) => ({ ...scenario, parameters: { ...scenario.parameters, salesFeeRate: percentValue(value) } }))} />
                <NumberField label="财务费用比例%" value={activeScenario.parameters.financeFeeRate * 100} onChange={(value) => updateActive((scenario) => ({ ...scenario, parameters: { ...scenario.parameters, financeFeeRate: percentValue(value) } }))} />
                <NumberField label="目标毛利率%" value={activeScenario.parameters.targetGrossMarginRate * 100} onChange={(value) => updateActive((scenario) => ({ ...scenario, parameters: { ...scenario.parameters, targetGrossMarginRate: percentValue(value) } }))} />
                <NumberField label="警戒毛利率%" value={activeScenario.parameters.warningGrossMarginRate * 100} onChange={(value) => updateActive((scenario) => ({ ...scenario, parameters: { ...scenario.parameters, warningGrossMarginRate: percentValue(value) } }))} />
              </div>
              <label className="field wide">
                <span>附加税基准</span>
                <select value={activeScenario.parameters.surchargeBase} onChange={(event) => updateActive((scenario) => ({ ...scenario, parameters: { ...scenario.parameters, surchargeBase: event.target.value as 'output_vat' | 'revenue_without_tax' } }))}>
                  <option value="revenue_without_tax">不含税收入</option>
                  <option value="output_vat">销项税额</option>
                </select>
              </label>
            </Panel>

            <ResultPanel result={result} />
          </section>

          <section className="tables">
            <Panel title="收入项" action={<button type="button" onClick={addRevenue}>新增收入</button>}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>科目</th>
                      <th>方式</th>
                      <th>单价</th>
                      <th>数量</th>
                      <th>含税金额</th>
                      <th>税率选择</th>
                      <th>税率%</th>
                      <th>不含税金额</th>
                      <th>说明</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.revenues.map((item) => (
                      <tr key={item.id}>
                        <td><input value={item.name} onChange={(event) => updateRevenue(item.id, { name: event.target.value })} /></td>
                        <td>
                          <select
                            value={item.calculationMode ?? 'manual'}
                            onChange={(event) => {
                              const nextMode = event.target.value as keyof typeof revenueModeLabels;
                              updateRevenue(item.id, {
                                calculationMode: nextMode,
                                amountWithTax: nextMode === 'manual' ? item.amountWithTax : 0,
                                unitPrice: nextMode === 'unit_quantity' ? item.unitPrice ?? 0 : 0,
                                quantity: nextMode === 'unit_quantity' ? item.quantity ?? 0 : 0,
                              });
                            }}
                          >
                            {revenueModes.map((mode) => (
                              <option key={mode} value={mode}>{revenueModeLabels[mode]}</option>
                            ))}
                          </select>
                        </td>
                        <td><input type="number" value={numberInputValue(item.unitPrice ?? 0)} disabled={(item.calculationMode ?? 'manual') !== 'unit_quantity'} onChange={(event) => updateRevenue(item.id, { unitPrice: numberValue(event.target.value) })} /></td>
                        <td><input type="number" value={numberInputValue(item.quantity ?? 0)} disabled={(item.calculationMode ?? 'manual') !== 'unit_quantity'} onChange={(event) => updateRevenue(item.id, { quantity: numberValue(event.target.value) })} /></td>
                        <td><input type="number" value={numberInputValue((item.calculationMode ?? 'manual') === 'manual' ? item.amountWithTax : item.computedAmountWithTax)} disabled={(item.calculationMode ?? 'manual') !== 'manual'} onChange={(event) => updateRevenue(item.id, { amountWithTax: numberValue(event.target.value) })} /></td>
                        <td>
                          <select
                            value={item.rateKey ?? 'outputVatRate'}
                            onChange={(event) =>
                              updateRevenue(item.id, {
                                rateKey: event.target.value as 'outputVatRate' | 'incomeTaxRate',
                              })
                            }
                          >
                            <option value="outputVatRate">增值税率1</option>
                            <option value="incomeTaxRate">增值税率2</option>
                          </select>
                        </td>
                        <td className="number muted">{formatPercent(item.taxRate)}</td>
                        <td className="number">{formatMoney(item.amountWithoutTax)}</td>
                        <td><input value={item.note} onChange={(event) => updateRevenue(item.id, { note: event.target.value })} /></td>
                        <td><button type="button" className="icon" onClick={() => removeRevenue(item.id)}>x</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title="成本项">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>科目</th>
                      <th>方式</th>
                      <th>单价</th>
                      <th>数量</th>
                      <th>金额</th>
                      <th>税率选择</th>
                      <th>税率/比例%</th>
                      <th>说明</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category, index) => {
                      const categoryItems = result.costs
                        .filter((item) => item.category === category)
                        .sort((a, b) => a.sortOrder - b.sortOrder);
                      const categoryTotal = result.categoryTotals.find((item) => item.category === category);
                      return (
                        <CostCategoryGroup
                          key={category}
                          category={category}
                          indexLabel={categoryIndexLabels[index] ?? String(index + 1)}
                          items={categoryItems}
                          amountWithTax={categoryTotal?.amountWithTax ?? 0}
                          amountWithoutTax={categoryTotal?.amountWithoutTax ?? 0}
                          onAdd={() => addCost(category)}
                          onUpdate={updateCost}
                          onRemove={removeCost}
                          parameters={activeScenario.parameters}
                        />
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          </section>
        </div>
      </section>
    </main>
  );
};

const Panel = ({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) => (
  <section className="panel">
    <div className="panel-head">
      <h2>{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

const TextField = ({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (value: string) => void; type?: string }) => (
  <label className="field">
    <span>{label}</span>
    <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
  </label>
);

const NumberField = ({ label, value, onChange }: { label: string; value: number; onChange: (value: string) => void }) => (
  <label className="field">
    <span>{label}</span>
    <input type="number" value={Number.isFinite(value) ? value : 0} onChange={(event) => onChange(event.target.value)} />
  </label>
);

const CostCategoryGroup = ({
  category,
  indexLabel,
  items,
  amountWithTax,
  amountWithoutTax,
  onAdd,
  onUpdate,
  onRemove,
  parameters,
}: {
  category: CostCategory;
  indexLabel: string;
  items: ReturnType<typeof calculateScenario>['costs'];
  amountWithTax: number;
  amountWithoutTax: number;
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<CostItem>) => void;
  onRemove: (id: string) => void;
  parameters: CalculationParameters;
}) => (
  <>
    <tr className="category-row">
      <td colSpan={9}>
        <div className="category-title">
          <strong>{indexLabel}、{categoryLabels[category]}</strong>
          <span>含税 {formatMoney(amountWithTax)} · 不含税 {formatMoney(amountWithoutTax)}</span>
          <button type="button" onClick={onAdd}>新增细项</button>
        </div>
      </td>
    </tr>
    {items.map((item) => (
      <tr key={item.id}>
        <td><input value={item.name} onChange={(event) => onUpdate(item.id, { name: event.target.value })} /></td>
        <td>
          {isPeriodExpense(category) ? (
            <select
              value={resolveRateKey(category, item.rateKey, item.name)}
              onChange={(event) =>
                onUpdate(item.id, {
                  calculationMode: 'revenue_rate',
                  amountWithTax: 0,
                  unitPrice: 0,
                  quantity: 0,
                  personDays: 0,
                  rateKey: event.target.value as CostRateKey,
                  rate: 0,
                })
              }
            >
              {periodRateKeys.map((rateKey) => (
                <option key={rateKey} value={rateKey}>{costRateLabels[rateKey]}</option>
              ))}
            </select>
          ) : (
            <select
              value={item.calculationMode}
              onChange={(event) => {
                const nextMode = event.target.value as CostCalculationMode;
                onUpdate(item.id, {
                  calculationMode: nextMode,
                  amountWithTax: isAmountEnabled(nextMode) ? item.amountWithTax : 0,
                  unitPrice: isUnitEnabled(nextMode) ? item.unitPrice : 0,
                  quantity: isUnitEnabled(nextMode) ? item.quantity : 0,
                  personDays: 0,
                  rateKey: resolveRateKey(category, item.rateKey, item.name),
                  rate: 0,
                });
              }}
            >
              {modes.map((mode) => <option key={mode} value={mode}>{modeLabels[mode]}</option>)}
            </select>
          )}
        </td>
        <td><input type="number" value={numberInputValue(item.unitPrice)} disabled={!isUnitEnabled(getEffectiveMode(category, item.calculationMode))} onChange={(event) => onUpdate(item.id, { unitPrice: numberValue(event.target.value) })} /></td>
        <td><input type="number" value={numberInputValue(item.quantity)} disabled={!isUnitEnabled(getEffectiveMode(category, item.calculationMode))} onChange={(event) => onUpdate(item.id, { quantity: numberValue(event.target.value) })} /></td>
        <td>
          <input
            type="number"
            value={numberInputValue(isAmountEnabled(getEffectiveMode(category, item.calculationMode)) ? item.amountWithTax : item.computedAmountWithTax)}
            disabled={!isAmountEnabled(getEffectiveMode(category, item.calculationMode))}
            onChange={(event) => onUpdate(item.id, { amountWithTax: numberValue(event.target.value) })}
          />
        </td>
        <td>
          {isPeriodExpense(category) ? (
            <span className="empty-cell">-</span>
          ) : (
            <select
              value={resolveRateKey(category, item.rateKey, item.name)}
              onChange={(event) => onUpdate(item.id, { rateKey: event.target.value as CostRateKey })}
            >
              {getRateOptions(category).map((rateKey) => (
                <option key={rateKey} value={rateKey}>{costRateLabels[rateKey]}</option>
              ))}
            </select>
          )}
        </td>
        <td className="number muted">{formatPercent(getDisplayRate(category, item, parameters))}</td>
        <td><input value={item.sourceNote} onChange={(event) => onUpdate(item.id, { sourceNote: event.target.value })} /></td>
        <td><button type="button" className="icon" onClick={() => onRemove(item.id)}>x</button></td>
      </tr>
    ))}
  </>
);

const ResultPanel = ({ result }: { result: ReturnType<typeof calculateScenario> }) => {
  const label = {
    excellent: '优秀',
    normal: '正常',
    warning: '警告',
  }[result.warningLevel];

  return (
    <Panel title="测算结果">
      <div className={`status-banner status-${result.warningLevel}`}>{label}</div>
      <div className="result-groups">
        <ResultGroup title="含税金额" rows={[
          ['销售收入', formatMoney(result.revenueWithTax)],
          ['项目全成本', formatMoney(result.totalProjectCostWithTax)],
          ['税前利润', formatMoney(result.profitBeforeTaxWithTax)],
          ['税后利润', formatMoney(result.profitAfterTaxWithTax)],
          ['项目毛利率', formatPercent(result.projectGrossMarginRateWithTax)],
          ['成本利润率', formatPercent(result.costProfitRateWithTax)],
          ['销售利润率', formatPercent(result.salesProfitRateWithTax)],
        ]} />
        <ResultGroup title="不含税金额" rows={[
          ['销售收入', formatMoney(result.revenueWithoutTax)],
          ['项目全成本', formatMoney(result.totalProjectCostWithoutTax)],
          ['税前利润', formatMoney(result.profitBeforeTaxWithoutTax)],
          ['税后利润', formatMoney(result.profitAfterTaxWithoutTax)],
          ['项目毛利率', formatPercent(result.projectGrossMarginRateWithoutTax)],
          ['成本利润率', formatPercent(result.costProfitRateWithoutTax)],
          ['销售利润率', formatPercent(result.salesProfitRateWithoutTax)],
        ]} />
      </div>
    </Panel>
  );
};

const ResultGroup = ({ title, rows }: { title: string; rows: Array<[string, string]> }) => (
  <section className="result-group">
    <h3>{title}</h3>
    <div className="metrics">
      {rows.map(([label, value]) => (
        <Metric key={`${title}-${label}`} label={label} value={value} />
      ))}
    </div>
  </section>
);

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="metric">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);
