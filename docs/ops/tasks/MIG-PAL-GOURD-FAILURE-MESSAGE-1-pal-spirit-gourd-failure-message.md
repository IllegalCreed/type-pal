# MIG-PAL-GOURD-FAILURE-MESSAGE-1 - PAL 紫金葫芦零灵葫值原文迁移闭环

Status: draft
Phase: phase2
Capability: PAL item migration / current publication（不改变 capability-map）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex
Visual Verification Timing: mixed（editor dev-functional；gameplay E2E deferred）
Unavailable Agents: none
Branch: `main`
Depends On: `MIG-PAL-STORE0-SHOP-BOUNDARY-1`；`MIG-PAL-CRAFT-FAILURE-MESSAGE-1`
Blocks: `ED-ITEM-ALCHEMY-SURFACE-1`

## 目标

修复 PAL `0x34` 紫金葫芦 producer 丢失零灵葫值失败臂原文的上游缺陷。item270 重新发布后，
`drawFromResourcePool.unavailableMessage` 必须精确为“无任何效果”；编辑器自动预填，运行时灵葫值为 0 时
不再退化成通用“当前没有可用资源”。只修 migration/current publication 与错误的一阶段说明，不直接手改
`projects/pal`，不新增 schema、upgrader、runtime 或 UI 特判。

## 范围

- 范围内：
  - 从 `0x34` operand0 读取可达失败地址。
  - 严格翻译 `setDialogStyleNarration -> showDialog(nonblank) -> end` 为 `unavailableMessage`。
  - 非零 failure 悬空或形状不可完整翻译时 fail-loud，不生成缺 message 的半截 resource pool。
  - 把同轮 generated resource-pool message 接回 baseline-derived current items，只更新 message 叶。
  - 重迁 current/baseline、exact diff、双零计划；纠正一阶段“灵葫值=0 按一下没反应”的陈旧说明。
- 范围外：
  - 不改 `drawFromResourcePool` schema 可选性或通用 runtime fallback。
  - 不改 Store0 九档、随机公式、扣值、奖励、item270 target/consuming 或成功 item-box。
  - 不给编辑器/runtime 增加 item270 文案特判，不手填 current。
  - 不扩写已进入 review 的 Store0 / craft failure 两卡，不重开其已生效签字。

## 前提真值门

### 一句话行为 / 工程前提

PAL 紫金葫芦在全局灵葫值为 0 时，原版 `0x34` 会跳到 L38780 并显示“无任何效果”；当前字段为空是
migration producer 未读取 operand0 failure arm，不是原版静默，也不是 UI 输入框无用。

### 四向真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | item270 L39713 为 `0x34 [38780,0,0]`；`wCollectValue==0` 时跳 operand0；L38780 是旁白“无任何效果”后 end。 | `data/extracted/data/items.json:5437-5460`；`data/extracted/events/all.json:254503-254513,261339-261352`；`reference/sdlpal/script.c:1452-1518,3083` |
| 第一阶段 | raw opcode port 在 collectValue=0 时跳 operand0；成功 item-box 已完整。一阶段机制文档把失败误写成“没反应”，需纠正。 | `packages/game/src/core/event-system.ts:4032-4055`；`packages/game/src/core/event-system.test.ts:5528-5615`；`docs/phase1/game-mechanics.md:682-704` |
| 当前二阶段 | producer 只凭 0x34 + Store0 生成 resource/maxRoll/rewards，未读 operand0；item270 无 message。content 已在 value<=0 时透传 message，Reforge 仅因缺字段回退通用文案；Editor 忠实显示空。 | `packages/migrate/src/migrate-content.ts:1554-1611`；`projects/pal/content/items.json:9410-9470`；`packages/content/src/item.ts:947-960`；`packages/reforge/src/main.ts:5428-5442`；`packages/editor/src/ui/ItemAlchemyTab.tsx:285-330` |
| 本任务目标 | producer 严格翻译失败臂；current/baseline item270 只新增 exact message；下游零特判。 | 本卡设计与验收条件 |

### 反证与替代解释

- 最强替代解释：“0x34 内部只有 `if (wCollectValue > 0)`，所以 0 时静默。”——遗漏了紧随 `else` 的
  `wScriptEntry = operand[0] - 1`；解释器返回时再 `+1`，精确落到 L38780。
- L38780 是多个脚本共享的通用失败臂，不要求唯一入边；本任务只依据 L39713 operand0 的直接控制流读取，
  不修改共享臂，也不从文本反推 owner。
- 会推翻前提的观察：operand0 不是失败地址；item270 使用前已有不可绕过的 collectValue>0 guard；L38780
  不可达或不显示该文本；schema/runtime 无法表达 message。raw 控制流、第一阶段 port 与当前 optional field 已逐项排除。
- 已排查替代根因：
  - runtime：value<=0 已正确透传 optional message。
  - 原版理解：0x34 else 直接跳 operand0。
  - extractor：operand 与 L38780 文本完整存在。
  - UI：字段只是 canonical effect 的通用编辑面，空值来自上游数据。
  - audit/test：现有 item270 integration 与 PAL invariant 漏断言 message，需补回归。

### 用户可见 before -> after

- 是否主动偏离已核真值：no。
- `before`：字段为空，灵葫值 0 时显示通用“当前没有可用资源”。
- `after`：字段预填且游戏显示原版“无任何效果”。
- 代表场景：全局 `collectValue=0`，在大世界直接使用 item270。
- 用户裁决：N/A（保持已核原版行为）。

## 上下文锚点

- `AGENTS.md` migration 上游优先、前提真值门、current-only；`CLAUDE.md`；`docs/phase2/READ-FIRST.md`。
- paired cards：`MIG-PAL-STORE0-SHOP-BOUNDARY-1-pal-store-zero-resource-pool.md`；
  `MIG-PAL-CRAFT-FAILURE-MESSAGE-1-pal-craft-failure-message.md`；
  `ED-ITEM-ALCHEMY-SURFACE-1-two-item-refining-workbenches.md`。
- producer/publication：`packages/migrate/src/migrate-content.ts:1554-1611`；
  `packages/migrate/src/pal-current-publication.ts:156-172`；`packages/migrate/src/pal-authored-overlays.ts`。
- invariant：`packages/migrate/src/pal-store-boundary.ts:74-101`。
- 不得重新引入：手改 current、item270 runtime/UI fallback、一次性转换器、旧 upgrader、Store0 ShopDef。

## 设计方案

1. 新增通用 `translateResourcePoolScript`：要求 head 为 0x34、reward 非空、线性后继为 end、operand0 为
   非零可解析地址，failure arm 严格三元组且文本 trimmed 非空；否则返回 undefined，由现有 pending 路径承接。
2. 复用或抽取 strict narration failure-arm reader，但不得改变已完成 item268 craft translator 的控制流/输出。
3. 将 current publication 的 generated failure-message 接线从仅 craft 扩为 craft + resource pool；按 item id、
   effect kind ordinal 与完整结构证据配对，只覆盖 generated 明确提供的 message，保留作者其它字段；重复 id、
   owner 缺失或 resource/maxRoll/rewards 漂移均 fail-loud。无 item270 分支和文案常量。
4. 扩展 PAL 永久 invariant：item270 resource/maxRoll/rewards 不变且
   `unavailableMessage === "无任何效果"`；补缺失、错误和首尾空白负例。
5. 重迁后不保留转换器、compat 或 upgrader；永久保留 producer、current publication ownership 与 invariant。

## 验收条件

- translator：PAL 真链输出九档 pool + exact message；operand0=0、悬空、空白、缺 narration/end、臂内/臂后
  额外命令均 undefined/pending，不产半截 effect；成功 0x34 行为与 item-box 不变。
- current data：item270 唯一 pool，`resource=collectValue`、`maxRoll=9`、九档序列与 count 全不变，只新增
  `unavailableMessage: "无任何效果"`；item268 message/五配方不变。
- exact generated diff 仅：
  - `projects/pal/content/items.json`
  - `packages/migrate/baselines/pal/content/items.json`
  - `packages/migrate/baselines/pal/_state.json`
- `_state.json` 仅 `files["content/items.json"]` hash 变化，managedFiles 与其余 536 hashes 不变；
  current/baseline 字节镜像；shops/scenes/scripts/其余 items 零变化。
- 首次 plan `writes=1 deletes=0 conflicts=0 asset-deletes=0`；事务三文件；内部 replay 与独立第二次 plan 全零。
- 测试：translator 正负例、真实 item270 integration、generated ownership、PAL invariant/publication/mirror；
  migrate 受影响包全量只跑一次。
- 视觉：Editor 紫金葫芦“不可用提示”自动显示“无任何效果”；游戏零灵葫值用例登记集中 E2E。
- 文档：`docs/phase1/game-mechanics.md` 明确 0 时跳共享失败臂并显示“无任何效果”。

## 推进签字

### 进入 build 前：前提 / 设计

- Codex:
  - premise: **verified（2026-08-31）**——直读 item270、L39713 `[38780,0,0]`、0x34 else、解释器
    返回规则、L38780 三元组、producer 丢弃点、current、content runtime、Reforge fallback 与 Editor；根因
    唯一落在 migration/current publication。
  - design: **agree（2026-08-31）**——通用 strict pool translator、generated message ownership、item270
    exact invariant、三文件 exact diff、writes=1/双零、纠正文档；无下游特判或旧版本残留。
- Kimi:
  - premise: pending
  - design: pending
- GLM:
  - premise: pending
  - design: pending
- 独立反证审查: pending（至少一位非 Coding Owner 必须直读 0x34 else、L39713 operand0 与 L38780）。
- counter / 分歧: none
- 缺签豁免: N/A
- build 准入结论: **blocked（Codex only；Kimi / GLM pending；两张 Depends On 仍在 review）**

### 进入 done 前：审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- 用户验收: pending
- done 准入结论: blocked

## Draft / Build / Review

- Draft：原版失败臂、producer 根因、current publication 接线与 exact-diff 方案已登记。
- Build：blocked；三方 premise/design 签字与 Depends On done 前不得修改 migration/current publication。
- Review：pending。

## 用户验收

- 问题确认：2026-08-31 用户指出紫金葫芦“不可用提示”也为空。
- 实现验收：pending。

## 交接日志

- 2026-08-31 User/Codex: 用户指出 item270 空字段。Codex + 三路只读审计独立确认 L39713 0x34 在
  collectValue=0 时直跳 L38780，原文“无任何效果”；producer 只构造九档 pool、未读 operand0，是唯一根因。
  新开独立 migration 卡，不扩两张 review 卡，保持其签字/exact diff 有效；未修改实现或 generated current。
  Next: Kimi / GLM 独立签 premise/design；同时先完成两张 Depends On 的终审。

## 下一位 Agent 提示词

```text
设计签字 MIG-PAL-GOURD-FAILURE-MESSAGE-1（Kimi 或 GLM，只读，不得修改实现）。

任务卡：docs/ops/tasks/MIG-PAL-GOURD-FAILURE-MESSAGE-1-pal-spirit-gourd-failure-message.md
当前状态：draft；Codex premise verified + design agree；Kimi / GLM pending；两张 Depends On 在 review。

先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md 与本卡。独立直读：
- item270 scriptOnUse=39713/applyToAll
- L39713 raw 0x34 operands [38780,0,0]
- reference/sdlpal/script.c 的 0x34 collectValue==0 else 跳 operand0
- L38780 narration → showDialog“无任何效果” → end
- migrate-content.ts 当前 inline pool producer、current item270、content runtime 与 Reforge fallback

请核：根因是否确在 migration；strict failure-arm + 畸形 pending 是否正确；generated message ownership 是否
只改 message 叶且不覆盖作者字段；item270 invariant、三文件 exact diff、writes=1/双零是否封闭；是否应保持
既有 craft/Store0 review 卡范围不变。Kimi 重点审控制流与 current publication ownership；GLM 重点审
exact diff、负例、九档零漂移与测试矩阵。

输出 premise verified + design agree，或带 file:line/反例的 counter；写回任务卡和交接日志。不得代签另一席，
不得修改实现，三签与 Depends On done 前不得转 build。
```
