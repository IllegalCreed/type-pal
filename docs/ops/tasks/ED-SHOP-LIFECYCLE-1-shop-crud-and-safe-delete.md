# ED-SHOP-LIFECYCLE-1 - 商店生命周期闭环

Status: draft
Phase: phase2
Capability: E9 / Editor shop lifecycle
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: main

## 目标

让作者在商店工作区内完成商店的新建、复制、安全删除、撤销/重做、保存重开和独立试买；
删除前只把真实读取 `ShopDef` 的 buy 指令作为引用，并直接消费 ED-3 的统一 `ProjectReferenceIndex`。

## 范围

- 范围内:
  - 商店目录的新建、复制与稳定数值 id 展示；继续使用货单内容派生的可读目录标题。
  - 安全删除、统一引用面板与结构化跳转；`openShop(mode='buy')` 阻断，sell 的历史 `shop` 值不形成引用。
  - 货单保持有序且允许重复，全部操作可 undo/redo、保存重开。
  - 使用正式 Reforge 商店结算做独立试买，覆盖余额充足/不足、物品入包和价格真值。
  - 核实 PAL 商店作者 ownership/重迁合并，保证作者新建/改动不会被下一次 current publication 覆盖。
- 范围外:
  - 不重做物品数据、当铺卖出机制、炼蛊皿或紫金葫芦机制页。
  - 不改 ED-3 边合同，不新增商店私有引用收集器。
- 明确不做:
  - 不把 sell `shop=0` 或任意非零历史字段解释成商店引用。
  - 不自动改写 `openShop`、不级联删除、不把目录派生标题当稳定身份。
  - 不为本卡新增 ShopDef 名称、schema/contentVersion、upgrader 或 fallback；原用户范围没有要求可编辑商店名。

## 前提真值门

### 一句话行为 / 工程前提

当前 `AddShopCommand` 只能追加空货单，ShopTab 可编辑货单但没有复制、删除、引用守卫或独立试买；
ED-3 已证明运行时 buy 查商店而 sell 只查背包，并提供 buy-only 统一引用边。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | 买入读取店铺货单和物品买价；卖出读取背包与物品卖价，不读取商店表。 | `packages/content/src/shop.ts`; `packages/reforge/src/main.ts:3442-3452` |
| 第一阶段 | 只提供游戏内商店/当铺运行行为，没有二阶段作者 CRUD。 | `docs/phase1/game-mechanics.md`; `docs/phase2/READ-FIRST.md` |
| 当前二阶段 | `ShopDef` 只有数值 id 与 items；`AddShopCommand` 新建空货单，ShopTab 目录标题从首件货品派生，无复制/删除/试玩。 | `packages/content/src/shop.ts:11`; `packages/editor/src/core/commands.ts:4057`; `packages/editor/src/ui/ShopTab.tsx:100-165` |
| 本任务目标 | 复用 ED-3 buy-only edge/index 闭合七环，并先核 PAL 商店作者 ownership；目录继续使用真实货单派生标题，不新增名称 schema。 | `docs/ops/tasks/ED-3-project-reference-index.md`; 本卡范围 |

### 反证与替代解释

- 最强替代解释: 商店生命周期必须顺带新增可编辑显示名。
- 什么观察会推翻当前前提: 若真实工作流证明货单派生标题 + 稳定数值 id 仍无法辨识商店，再单独提交
  产品裁决；本卡不据生命周期模板擅自新增用户未要求的持久字段。PAL ownership 未核实前不得 build。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: ED-3 已用一手 runtime 分支和 29 buy/6 sell census 固定 buy-only。
  - 原版 / 第一阶段理解: 只约束结算真值，不推导编辑器 IA。
  - extractor / 地图 / 数据解码: PAL 20 店数据只作 coverage，不决定作者 ownership。
  - audit / test model: 必须以实际试买业务结果和重迁 zero-plan 验证，不能只测数组变更。

### 用户可见偏离

- 是否主动偏离已核真值: yes（补齐二阶段作者工作流，不改变买卖结算机制）
- `before -> after` 一句话: 只能新建和改货单 -> 可复制、安全删除、保存重开并用正式结算试买。
- 代表场景: 复制一间有重复货品的商店并修改顺序；buy 引用阻止删除，sell 不阻止；解除 buy 后删除并 undo。
- 用户裁决: 2026-09-04 用户已将商店生命周期列为第二阶段必须项；PAL ownership 方案 pending。

## 上下文锚点

- 已拍板决策 / 铁律: `AGENTS.md`; `docs/phase2/READ-FIRST.md`; ED-3 buy-only 真值与 current-only 纪律。
- 代码锚点(`file:line`):
  - `packages/content/src/shop.ts:11`
  - `packages/reforge/src/main.ts:3442-3452`
  - `packages/editor/src/core/commands.ts:4020-4080`
  - `packages/editor/src/ui/ShopTab.tsx:90-180`
  - `packages/editor/src/core/project-reference-adapters.ts`
  - `packages/migrate/src/pal-current-publication.ts`
- 已知坑 / 审计文档: `docs/ops/tasks/ED-5I-item-workbench.md`; `docs/ops/tasks/MIG-PAL-STORE0-SHOP-BOUNDARY-1-pal-store-zero-resource-pool.md`;
  ED-3 的 29 buy + 6 sell、current-author、TOCTOU 与 fail-closed 约束。
- 不得重新引入: shop=0 伪引用、派生标题身份、页面私有 scanner、自动 cascade、直接手改 PAL 生成产物。
- 相关测试: `shop.test.ts`, `ShopTab.test.tsx`, `commands.test.ts`, `project-reference*.test.ts`,
  `pal-current-publication.pal.test.ts`。

## 验收条件

- 功能:
  - 新建/复制/删除均通过 Command；复制精确保留货单顺序与重复项并生成新稳定 id。
  - 删除前由 ED-3 index 展示全部 buy 引用；sell `shop=0` 与 sell 非零 fixture 均不成为引用。
  - checking/stale/failed/current-without-index 全部 fail-closed；确认后 live 新引用和 redo 均重新验真。
  - 保存重开与 current publication 后作者数据不丢；迁移 dry-run 四零。
  - 独立试买使用正式 `shopBuy`/Reforge 路径，断言余额、价格、背包和不足反馈，不做 UI 仿真结算。
- 测试:
  - 货单空/单项/重复项、create/copy/name/delete/cancel、buy/sell、provider failure、TOCTOU、undo/redo、
    保存重开、publication ownership 与正式试买。
  - editor/content/migrate typecheck、聚焦测试、最终 editor 全量、production build、design-system gate。
- 文档: 更新 editor design、roadmap、capability-map 与商店/当铺说明；不把炼化机制混回商店。
- 视觉 / 手工验证: 空商店、有货商店、被 buy 引用商店；1280/720；引用跳转、删除确认与试买反馈。
- E2E 用例登记: 空白工程 → 新建/复制商店 → 上架重复货品 → 保存重开 → 正式试买 → 安全删除。

## 推进签字

### 进入 build 前:设计签字

- Codex: premise pending | design pending
- Kimi: premise pending | design pending
- GLM: premise pending | design pending
- 独立反证审查: pending
- counter / 分歧处理: pending
- 缺签豁免: N/A
- build 准入结论: blocked

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: pending
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

pending。先核数值 id 分配、PAL ownership 与正式试买入口；引用查询、定位和删除策略只消费 ED-3，
不新增 ShopDef 名称或 contentVersion。

### 已知风险

- 风险: PAL 重迁当前直接重建 shops 表，可能覆盖作者复制/货单修改；试买若另写模拟会漂移。
- 缓解: 前提门先核 publication merge/ownership；复用正式结算与运行壳；保持 schema-neutral。

### 主审立场

- Reviewer: Kimi（ownership/运行链）+ GLM（数据/测试矩阵）
- 结论: pending
- 必改项: pending
- 是否建议进入 build: pending

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件: pending
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: pending

## 视觉验证记录

- Visual Verification Owner: Codex
- Visual Verification Timing: dev-functional
- 验证方式: pending
- 集中 E2E 用例 / 批次: 编辑器综合工作流前置子链
- 截图 / 像素检查路径: pending
- 结论: pending
- 未完成项: pending

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: R4 薄 E2E。

## 交接日志

- 2026-09-05 Codex: ED-3 收口时建立后续正式卡，只固定范围、地基和验收边界；未做前提/设计签字，
  不授权 build。Next: 场景生命周期后按第二阶段队列启动本卡前提真值门。

## 下一位 Agent 提示词

无下一位 Agent 提示词；本卡尚未启动，等待 ED-3 和场景生命周期完成。
