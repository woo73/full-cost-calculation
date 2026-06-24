# 技术架构文档

## 1. 架构目标

系统第一阶段目标是快速交付可用的本地 Web 测算工具，同时保留后续升级为多人在线系统的空间。

架构设计原则：

- 计算逻辑独立，不与页面强耦合。
- 数据结构清晰，便于后续接入数据库。
- 前端即可完成第一阶段全部能力。
- 导出能力可复用当前数据模型。
- 后续可平滑扩展登录、权限、审批和服务端存储。

## 2. 第一阶段推荐架构

第一阶段采用本地单页面应用架构。

```text
Browser
  |
  |-- UI Layer
  |     |-- Project Form
  |     |-- Cost Table
  |     |-- Result Panel
  |     |-- Scenario List
  |
  |-- Domain Layer
  |     |-- Calculation Engine
  |     |-- Validation Rules
  |     |-- Default Parameters
  |
  |-- Data Layer
        |-- Local Storage
        |-- Excel Export
```

## 3. 技术选型

### 3.1 前端框架

推荐使用 React + TypeScript。

理由：

- 适合构建动态表单和实时计算页面。
- 类型系统有助于控制计算字段。
- 后续组件化扩展方便。

### 3.2 构建工具

推荐使用 Vite。

理由：

- 启动快。
- 配置轻。
- 适合中小型单页面应用。

### 3.3 样式方案

推荐第一阶段使用普通 CSS 或 CSS Modules。

理由：

- 系统以表格和经营指标为主，不需要复杂设计系统。
- 便于快速控制打印和导出视觉。

### 3.4 数据存储

第一阶段使用浏览器 localStorage。

后续升级路径：

- IndexedDB：适合本地大量方案保存。
- SQLite：适合桌面应用。
- PostgreSQL / MySQL：适合多人在线系统。

### 3.5 Excel 导出

推荐使用 xlsx 类库生成 Excel。

导出时应复用系统内部数据模型，而不是从 DOM 表格中抓取数据。

## 4. 分层设计

### 4.1 UI Layer

负责页面展示和用户输入。

主要组件：

- `ScenarioList`：测算方案列表。
- `ProjectInfoForm`：项目基础信息。
- `ParameterPanel`：参数配置。
- `RevenueTable`：收入明细表。
- `CostTable`：成本明细表。
- `ResultPanel`：利润结果面板。
- `ExportButton`：导出按钮。

UI 层不直接写复杂公式，只调用计算服务。

### 4.2 Domain Layer

负责业务规则和计算逻辑。

主要模块：

- `calculationEngine`：全成本计算核心。
- `defaultParameters`：默认参数。
- `validators`：输入校验。
- `formatters`：金额和百分比格式化。

### 4.3 Data Layer

负责本地数据读写和导出。

主要模块：

- `scenarioRepository`：方案保存、读取、删除、复制。
- `exportService`：Excel 导出。
- `storageAdapter`：localStorage 封装。

## 5. 计算引擎设计

计算引擎输入：

- 测算方案基础信息。
- 收入明细。
- 成本明细。
- 参数配置。

计算引擎输出：

- 收入汇总。
- 成本分类汇总。
- 税金汇总。
- 利润指标。
- 预警状态。

计算引擎应保持纯函数特征：

- 相同输入得到相同输出。
- 不直接读写 localStorage。
- 不直接操作页面。

## 6. 状态管理

第一阶段不建议引入复杂状态管理库。

推荐：

- React `useState` 管理当前编辑方案。
- React `useMemo` 计算派生结果。
- 独立 repository 模块保存历史方案。

当功能扩展到多人协同、复杂流程后，再考虑引入更完整的状态管理方案。

## 7. 数据流

```text
用户输入
  -> 更新当前方案状态
  -> 调用计算引擎
  -> 得到测算结果
  -> 页面实时展示
  -> 用户保存方案
  -> 写入 localStorage
  -> 用户导出
  -> 生成 Excel
```

## 8. 后续在线化架构

当需要多人使用时，可升级为前后端分离架构。

```text
Browser
  |
API Server
  |
Database
```

建议服务端能力：

- 用户登录。
- 角色权限。
- 方案持久化。
- 操作日志。
- 参数后台。
- 审批流程。

服务端接口建议按 REST 设计：

- `GET /api/scenarios`
- `POST /api/scenarios`
- `GET /api/scenarios/{id}`
- `PUT /api/scenarios/{id}`
- `DELETE /api/scenarios/{id}`
- `POST /api/scenarios/{id}/duplicate`
- `GET /api/scenarios/{id}/export`

## 9. 目录结构建议

第一阶段代码目录建议：

```text
src/
  components/
    CostTable.tsx
    RevenueTable.tsx
    ResultPanel.tsx
    ProjectInfoForm.tsx
    ParameterPanel.tsx
    ScenarioList.tsx
  domain/
    calculationEngine.ts
    defaultParameters.ts
    validators.ts
    formatters.ts
  data/
    scenarioRepository.ts
    storageAdapter.ts
    exportService.ts
  types/
    scenario.ts
    calculation.ts
  App.tsx
  main.tsx
```

## 10. 风险与控制

### 10.1 计算口径风险

风险：系统计算结果与财务口径不一致。

控制：

- 将公式集中在计算规则文档中。
- 代码中建立单元测试。
- 使用截图表格作为第一组验算样例。

### 10.2 本地存储风险

风险：用户清理浏览器缓存后数据丢失。

控制：

- 页面明确提示数据保存在本机浏览器。
- 第一阶段提供 Excel 导出。
- 后续升级数据库存储。

### 10.3 Excel 导出格式风险

风险：导出表不符合用户习惯。

控制：

- 第一版尽量复刻原表结构。
- 后续根据使用反馈优化格式。

