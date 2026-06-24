# 数据架构文档

## 1. 数据设计目标

数据架构需要同时满足两个目标：

- 第一阶段支持本地单页面应用快速落地。
- 后续能够平滑迁移到数据库和多人在线系统。

因此数据模型不应过度依赖页面结构，而应围绕测算业务对象设计。

## 2. 核心实体

### 2.1 Scenario 测算方案

测算方案是系统的主实体。

字段建议：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 方案唯一 ID |
| name | string | 方案名称 |
| projectName | string | 项目名称 |
| customerName | string | 客户名称 |
| serviceType | string | 服务类型 |
| owner | string | 项目负责人 |
| status | string | 方案状态 |
| projectInfo | ProjectInfo | 项目基础信息 |
| parameters | CalculationParameters | 计算参数 |
| revenues | RevenueItem[] | 收入明细 |
| costs | CostItem[] | 成本明细 |
| notes | string | 备注 |
| createdAt | string | 创建时间 |
| updatedAt | string | 更新时间 |

状态建议：

- draft：草稿。
- confirmed：已确认。
- archived：已归档。

第一阶段可只使用 draft。

### 2.2 ProjectInfo 项目基础信息

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| projectName | string | 项目名称 |
| customerName | string | 客户名称 |
| serviceType | string | 服务类型 |
| owner | string | 项目负责人 |
| estimateDate | string | 测算日期 |
| description | string | 项目说明 |

### 2.3 CalculationParameters 计算参数

| 字段 | 类型 | 默认建议 | 说明 |
| --- | --- | --- | --- |
| outputVatRate | number | 0.06 | 增值税率1 |
| incomeTaxRate | number | 0.15 | 增值税率2 |
| outsourcingVatRate | number | 0.06 | 外包进项税率 |
| internalLaborTaxRate | number | 0 | 自有人工税率 |
| surchargeRate | number | 0.0163 | 附加税比例，可按业务口径调整 |
| internalLaborUnitPrice | number | 3100 | 自有人工人天单价 |
| managementFeeRate | number | 0.06 | 管理费用比例 |
| salesFeeRate | number | 0 | 销售费用比例 |
| financeFeeRate | number | 0 | 财务费用比例 |
| targetGrossMarginRate | number | 0.25 | 目标毛利率 |
| warningGrossMarginRate | number | 0.15 | 警戒毛利率 |

说明：

- 所有比例字段统一使用小数存储，例如 6% 存为 0.06。
- 页面展示时再格式化为百分比。

### 2.4 RevenueItem 收入明细

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 收入项 ID |
| name | string | 科目名称 |
| amountWithTax | number | 含税金额 |
| taxRate | number | 税率 |
| amountWithoutTax | number | 不含税金额，计算得出 |
| note | string | 说明 |

第一阶段可以默认一条收入：

- BIM 建模服务费用。

### 2.5 CostItem 成本明细

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 成本项 ID |
| category | CostCategory | 成本分类 |
| name | string | 科目名称 |
| calculationMode | CostCalculationMode | 计算方式 |
| unitPrice | number | 单价 |
| quantity | number | 项目数量 |
| personDays | number | 历史兼容字段，后续不作为页面输入 |
| amountWithTax | number | 含税金额 |
| taxRate | number | 税率 |
| amountWithoutTax | number | 不含税金额，计算得出 |
| sourceNote | string | 采集或测算说明 |
| sortOrder | number | 排序 |

### 2.6 CostCategory 成本分类

建议枚举：

| 值 | 说明 |
| --- | --- |
| product_allocation | 产品分摊成本 |
| infrastructure | 基础设施成本 |
| delivery_implementation | 交付实施成本 |
| custom_development | 定制开发成本 |
| operation_maintenance | 运维成本 |
| period_expense | 期间费用 |
| simulated_interest | 模拟计息财务费用 |
| surcharge_tax | 附加税金 |

### 2.7 CostCalculationMode 成本计算方式

建议枚举：

| 值 | 说明 |
| --- | --- |
| manual | 手动录入金额 |
| unit_quantity | 单价乘项目数量 |
| revenue_rate | 按收入比例 |
| formula | 系统公式 |

## 3. 汇总结果模型

### 3.1 CalculationResult

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| revenueWithTax | number | 含税收入合计 |
| revenueWithoutTax | number | 不含税收入合计 |
| outputVat | number | 销项税额 |
| costWithTax | number | 含税成本合计 |
| costWithoutTax | number | 不含税成本合计 |
| categoryTotals | CategoryTotal[] | 分类成本汇总 |
| surchargeTax | number | 附加税金 |
| totalProjectCost | number | 项目全成本 |
| totalProjectCostWithTax | number | 含税项目全成本 |
| totalProjectCostWithoutTax | number | 不含税项目全成本 |
| profitBeforeTaxWithTax | number | 含税金额口径税前利润 |
| profitAfterTaxWithTax | number | 含税金额口径税后利润 |
| projectGrossMarginRateWithTax | number | 含税金额口径项目毛利率 |
| costProfitRateWithTax | number | 含税金额口径成本利润率 |
| salesProfitRateWithTax | number | 含税金额口径销售利润率 |
| profitBeforeTaxWithoutTax | number | 不含税金额口径税前利润 |
| profitAfterTaxWithoutTax | number | 不含税金额口径税后利润 |
| projectGrossMarginRateWithoutTax | number | 不含税金额口径项目毛利率 |
| costProfitRateWithoutTax | number | 不含税金额口径成本利润率 |
| salesProfitRateWithoutTax | number | 不含税金额口径销售利润率 |
| profitBeforeTax | number | 税前利润 |
| incomeTax | number | 所得税 |
| profitAfterTax | number | 税后利润 |
| projectGrossMarginRate | number | 项目毛利率 |
| costProfitRate | number | 成本利润率 |
| salesProfitRate | number | 销售利润率 |
| warningLevel | string | 预警等级 |

### 3.2 CategoryTotal

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| category | CostCategory | 成本分类 |
| amountWithTax | number | 含税小计 |
| amountWithoutTax | number | 不含税小计 |

## 4. 本地存储结构

第一阶段 localStorage 建议使用以下 key：

| Key | 内容 |
| --- | --- |
| full-cost-calculation:scenarios | 测算方案数组 |
| full-cost-calculation:settings | 全局默认参数 |

`scenarios` 存储结构：

```json
[
  {
    "id": "scenario_001",
    "name": "某 BIM 建模项目测算",
    "projectName": "某 BIM 建模项目",
    "customerName": "某客户",
    "serviceType": "BIM 建模",
    "parameters": {},
    "revenues": [],
    "costs": [],
    "createdAt": "2026-06-23T10:00:00.000Z",
    "updatedAt": "2026-06-23T10:00:00.000Z"
  }
]
```

## 5. 后续数据库表设计

如果升级为在线系统，可拆分为以下表：

### 5.1 scenarios

保存方案主信息。

### 5.2 scenario_parameters

保存方案级参数快照。

原因：即使全局参数后续调整，历史方案也应保留当时的测算口径。

### 5.3 revenue_items

保存收入明细。

### 5.4 cost_items

保存成本明细。

### 5.5 calculation_snapshots

保存关键计算结果快照。

用途：

- 提升列表查询效率。
- 支持历史审计。
- 避免后续公式变化影响旧方案展示。

### 5.6 operation_logs

保存用户操作日志。

第一阶段不需要。

## 6. 数据校验规则

### 6.1 金额字段

- 不允许为非数字。
- 默认不允许小于 0。
- 金额可保留 2 位小数。

### 6.2 税率和比例字段

- 存储范围建议为 0 到 1。
- 页面输入可使用百分比形式。

### 6.3 必填字段

第一阶段建议必填：

- 方案名称。
- 项目名称。
- 至少一条收入项。

### 6.4 明细项

成本明细应至少有：

- 成本分类。
- 科目名称。
- 计算方式。

## 7. 数据迁移策略

因为第一阶段使用 localStorage，后续升级时可提供导入导出：

- 从 localStorage 导出 JSON。
- 在线系统导入 JSON。
- 按版本号兼容字段变化。

建议为方案数据增加版本字段：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| schemaVersion | number | 数据结构版本 |

第一版设置为 1。
