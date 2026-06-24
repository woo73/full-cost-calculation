import { categoryLabels, modeLabels } from './constants';
import type { CalculationResult, CostCategory, Scenario } from './types';

const escapeHtml = (value: string | number) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const categories = Object.keys(categoryLabels) as CostCategory[];

/** 构建一行带数值格式的单元格 */
const row = (cells: Array<{ value: string | number; cls?: string } | string | number>) =>
  `<tr>${cells
    .map((cell) => {
      if (typeof cell === 'object' && 'value' in cell) {
        return `<td class="${cell.cls ?? ''}">${escapeHtml(cell.value)}</td>`;
      }
      return `<td>${escapeHtml(cell)}</td>`;
    })
    .join('')}</tr>`;

/** 分类标题行（跨列合并） */
const sectionRow = (label: string, cols: number, cls = 'section') =>
  `<tr class="${cls}"><td colspan="${cols}">${escapeHtml(label)}</td></tr>`;

/** 金额单元格 */
const amt = (val: number) => ({ value: Number.isFinite(val) ? val : 0, cls: 'num' });
/** 百分比单元格 */
const pct = (val: number) => ({ value: Number.isFinite(val) ? val : 0, cls: 'pct' });

export const exportScenarioAsExcel = (scenario: Scenario, result: CalculationResult) => {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;

  const label = { draft: '草稿', confirmed: '已确认', archived: '已归档' }[scenario.status];

  /* ========== 成本明细 - 按分类生成行 ========== */
  const costRows: string[] = [];
  for (const cat of categories) {
    const items = result.costs.filter((c) => c.category === cat);
    if (items.length === 0) continue;

    const total = result.categoryTotals.find((t) => t.category === cat);
    const catLabel = categoryLabels[cat];

    // 分类标题 + 小计
    costRows.push(
      `<tr class="sub-section"><td colspan="7">${escapeHtml(catLabel)}</td></tr>`,
    );
    for (const item of items) {
      costRows.push(
        row([
          item.name,
          modeLabels[item.calculationMode],
          amt(item.computedAmountWithTax),
          amt(item.amountWithoutTax),
          amt(item.computedAmountWithTax - item.amountWithoutTax),
          pct(item.taxRate),
          item.sourceNote,
        ]),
      );
    }
    // 分类小计行
    if (total) {
      costRows.push(
        row([
          { value: `${catLabel} 小计`, cls: 'summary' },
          '',
          amt(total.amountWithTax),
          amt(total.amountWithoutTax),
          amt(total.amountWithTax - total.amountWithoutTax),
          '',
          '',
        ]),
      );
    }
  }

  /* ========== 组装 HTML ========== */
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <style>
      body { font-family: "Microsoft YaHei", Arial, sans-serif; margin: 30px; }
      table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
      td, th { border: 1px solid #999; padding: 5px 8px; font-size: 11pt; }
      th { background: #4f81bd; color: #fff; font-weight: bold; text-align: center; }
      .title-row td { font-size: 16pt; font-weight: bold; text-align: center; background: #1f3864; color: #fff; border-color: #1f3864; }
      .section { background: #d9ead3; font-weight: bold; font-size: 12pt; }
      .sub-section { background: #e2efda; font-weight: bold; }
      .summary { background: #fff2cc; font-weight: bold; }
      .grand-total { background: #fce4d6; font-weight: bold; font-size: 12pt; }
      .label-cell { background: #f2f2f2; font-weight: bold; }
      .center { text-align: center; }
      .num { mso-number-format:"\\#\\,\\#\\#0"; text-align: right; }
      .pct { mso-number-format:"0.00%"; text-align: right; }
    </style>
  </head>
  <body>
    <!-- ======== 标题 ======== -->
    <table>
      <tr class="title-row"><td colspan="7">${escapeHtml(scenario.name)}</td></tr>
      <tr>
        <td colspan="7" style="text-align:right;color:#666;border-color:#fff;font-size:10pt;">
          导出时间: ${now.toLocaleString('zh-CN')} &nbsp;|&nbsp; 状态: ${label}
        </td>
      </tr>
    </table>

    <!-- ======== 项目信息 ======== -->
    <table>
      ${sectionRow('项目信息', 7)}
      <tr>
        <td class="label-cell" style="width:12%">项目名称</td>
        <td style="width:23%">${escapeHtml(scenario.projectInfo.projectName)}</td>
        <td class="label-cell" style="width:12%">客户名称</td>
        <td style="width:23%">${escapeHtml(scenario.projectInfo.customerName)}</td>
        <td class="label-cell" style="width:10%">负责人</td>
        <td style="width:20%" colspan="2">${escapeHtml(scenario.projectInfo.owner)}</td>
      </tr>
      <tr>
        <td class="label-cell">服务类型</td>
        <td>${escapeHtml(scenario.projectInfo.serviceType)}</td>
        <td class="label-cell">测算日期</td>
        <td>${escapeHtml(scenario.projectInfo.estimateDate)}</td>
        <td class="label-cell">描述</td>
        <td colspan="2">${escapeHtml(scenario.projectInfo.description)}</td>
      </tr>
    </table>

    <!-- ======== 测算参数 ======== -->
    <table>
      ${sectionRow('测算参数', 7)}
      <tr>
        <td class="label-cell">增值税率1</td>
        <td class="pct">${scenario.parameters.outputVatRate}</td>
        <td class="label-cell">增值税率2</td>
        <td class="pct">${scenario.parameters.incomeTaxRate}</td>
        <td class="label-cell">自有人工税率</td>
        <td class="pct">${scenario.parameters.internalLaborTaxRate}</td>
        <td class="label-cell">外包税率</td>
        <td class="pct">${scenario.parameters.outsourcingVatRate}</td>
      </tr>
      <tr>
        <td class="label-cell">附加税比例</td>
        <td class="pct">${scenario.parameters.surchargeRate}</td>
        <td class="label-cell">附加税基准</td>
        <td>${scenario.parameters.surchargeBase === 'output_vat' ? '销项税额' : '不含税收入'}</td>
        <td class="label-cell">自有人工单价</td>
        <td class="num">${scenario.parameters.internalLaborUnitPrice}</td>
        <td colspan="2"></td>
      </tr>
      <tr>
        <td class="label-cell">管理费用比例</td>
        <td class="pct">${scenario.parameters.managementFeeRate}</td>
        <td class="label-cell">销售费用比例</td>
        <td class="pct">${scenario.parameters.salesFeeRate}</td>
        <td class="label-cell">财务费用比例</td>
        <td class="pct">${scenario.parameters.financeFeeRate}</td>
        <td colspan="2"></td>
      </tr>
      <tr>
        <td class="label-cell">目标毛利率</td>
        <td class="pct">${scenario.parameters.targetGrossMarginRate}</td>
        <td class="label-cell">警戒毛利率</td>
        <td class="pct">${scenario.parameters.warningGrossMarginRate}</td>
        <td colspan="4"></td>
      </tr>
    </table>

    <!-- ======== 收入明细 ======== -->
    <table>
      ${sectionRow('收入明细', 7)}
      <tr>
        <th style="width:18%">科目</th>
        <th style="width:10%">计算方式</th>
        <th style="width:15%">含税金额</th>
        <th style="width:15%">不含税金额</th>
        <th style="width:12%">税额</th>
        <th style="width:10%">税率</th>
        <th>说明</th>
      </tr>
      ${result.revenues
        .map((item) =>
          row([
            item.name,
            item.calculationMode === 'unit_quantity'
              ? `单价x数量(${item.unitPrice ?? 0}x${item.quantity ?? 0})`
              : '手动录入',
            amt(item.computedAmountWithTax),
            amt(item.amountWithoutTax),
            amt(item.computedAmountWithTax - item.amountWithoutTax),
            pct(item.taxRate),
            item.note,
          ]),
        )
        .join('')}
      <tr class="summary">
        <td colspan="2">收入合计</td>
        <td class="num">${escapeHtml(Number.isFinite(result.revenueWithTax) ? result.revenueWithTax : 0)}</td>
        <td class="num">${escapeHtml(Number.isFinite(result.revenueWithoutTax) ? result.revenueWithoutTax : 0)}</td>
        <td class="num">${escapeHtml(Number.isFinite(result.revenueWithTax - result.revenueWithoutTax) ? result.revenueWithTax - result.revenueWithoutTax : 0)}</td>
        <td></td>
        <td></td>
      </tr>
    </table>

    <!-- ======== 成本明细 ======== -->
    <table>
      ${sectionRow('成本明细', 7)}
      <tr>
        <th style="width:18%">科目</th>
        <th style="width:10%">计算方式</th>
        <th style="width:15%">含税金额</th>
        <th style="width:15%">不含税金额</th>
        <th style="width:12%">税额</th>
        <th style="width:10%">税率</th>
        <th>说明</th>
      </tr>
      ${costRows.join('')}
      <tr class="grand-total">
        <td colspan="2">成本总计</td>
        <td class="num">${escapeHtml(Number.isFinite(result.costWithTax) ? result.costWithTax : 0)}</td>
        <td class="num">${escapeHtml(Number.isFinite(result.costWithoutTax) ? result.costWithoutTax : 0)}</td>
        <td class="num">${escapeHtml(Number.isFinite(result.costWithTax - result.costWithoutTax) ? result.costWithTax - result.costWithoutTax : 0)}</td>
        <td></td>
        <td></td>
      </tr>
    </table>

    <!-- ======== 利润指标 ======== -->
    <table>
      ${sectionRow('利润指标', 4)}
      <tr>
        <th style="width:30%">指标</th>
        <th style="width:35%">含税金额</th>
        <th style="width:35%">不含税金额</th>
      </tr>
      ${row([
        '销售收入',
        amt(result.revenueWithTax),
        amt(result.revenueWithoutTax),
      ])}
      ${row([
        '销项税额',
        amt(result.outputVat),
        '-',
      ])}
      ${row([
        '项目全成本',
        amt(result.totalProjectCostWithTax),
        amt(result.totalProjectCostWithoutTax),
      ])}
      ${row([
        '税前利润',
        amt(result.profitBeforeTaxWithTax),
        amt(result.profitBeforeTaxWithoutTax),
      ])}
      ${row([
        '所得税',
        amt(result.incomeTaxWithTax),
        amt(result.incomeTaxWithoutTax),
      ])}
      ${row([
        '税后利润',
        amt(result.profitAfterTaxWithTax),
        amt(result.profitAfterTaxWithoutTax),
      ])}
      ${row([
        '附加税金',
        amt(result.surchargeTax),
        '-',
      ])}
      <tr class="summary">
        <td>项目毛利率</td>
        ${[
          pct(result.projectGrossMarginRateWithTax),
          pct(result.projectGrossMarginRateWithoutTax),
        ]
          .map((c) => `<td class="${c.cls}">${escapeHtml(c.value)}</td>`)
          .join('')}
      </tr>
      ${row([
        { value: '成本利润率', cls: 'summary' },
        pct(result.costProfitRateWithTax),
        pct(result.costProfitRateWithoutTax),
      ])}
      ${row([
        { value: '销售利润率', cls: 'summary' },
        pct(result.salesProfitRateWithTax),
        pct(result.salesProfitRateWithoutTax),
      ])}
    </table>

    <!-- ======== 预警状态 ======== -->
    <table>
      <tr>
        <td style="border:none;text-align:right;color:#999;font-size:9pt;">
          预警等级: ${result.warningLevel === 'excellent' ? '优秀' : result.warningLevel === 'normal' ? '正常' : '警告'}
          &nbsp;|&nbsp; 目标毛利率: ${(scenario.parameters.targetGrossMarginRate * 100).toFixed(1)}%
          &nbsp;|&nbsp; 实际毛利率: ${(result.projectGrossMarginRateWithoutTax * 100).toFixed(1)}%
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const blob = new Blob(
    [html],
    { type: 'application/vnd.ms-excel;charset=utf-8' },
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${scenario.name || '全成本测算'}_${dateStr}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
