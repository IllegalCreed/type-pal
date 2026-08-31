# MIG-PAL-CRAFT-FAILURE-MESSAGE-1 - PAL 炼蛊失败原文迁移闭环

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
Blocks: `ED-ITEM-ALCHEMY-SURFACE-1`

## 目标

修复 `translateCraftRecipeScript` 丢失炼蛊最终失败分支文案的上游缺陷：PAL item268 重新发布后，
`craftRecipe.unavailableMessage` 必须精确为“炼蛊的材料不足”，编辑器自动预填原文，运行时材料全不足时不再退化为
通用“材料不足”。只修 migration/current publication，不直接手改 `projects/pal`，不新增 schema、upgrader 或 UI fallback。

## 范围

- 范围内：
  - 识别 `0x20` 有序配方链的终端失败地址。
  - 严格翻译 `setDialogStyleNarration -> showDialog(nonblank) -> end` 为 `unavailableMessage`。
  - 畸形或不可完整翻译的可达终端失败臂 fail-loud，不再生成缺提示的半截 `craftRecipe`。
  - 重新发布 PAL current/baseline，验证 exact diff 与独立二次零计划。
- 范围外：
  - 不改通用 `craftRecipe` schema 可选性；作者工程仍可省略 message 并使用 runtime 通用 fallback。
  - 不改炼蛊材料顺序、产物、数量、自动取材语义或游戏菜单。
  - 不改 runtime fallback 为 PAL 专用文案，不给编辑器增加 item268 特判。
  - 不碰 `MIG-PAL-STORE0-SHOP-BOUNDARY-1` 的 Shop 数据。

## 前提真值门

### 一句话行为 / 工程前提

PAL 炼蛊皿五种材料全部不足时，原版可达失败臂会显示“炼蛊的材料不足”；当前字段为空是 migration 丢失可表达源文案，
不是原版无文案，也不是编辑器输入框无用。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | L39606 最后一个 `0x20` 的 failure operand 指向 L39595；L39595 是旁白样式、“炼蛊的材料不足”、end。 | `data/extracted/events/all.json:260499-260509,260572-260579`；`reference/sdlpal/script.c:977-1024` |
| 第一阶段 | item268 `applyToAll` 直接执行 raw script；showDialog 原文由脚本解释器呈现，不被菜单替换。 | `data/extracted/data/items.json:5384-5408`；`reference/sdlpal/play.c:264-323`；`packages/game/src/core/menu/menu-driver.ts:703-716` |
| 当前二阶段 | translator 在解析终端 failure address 后直接 break，只返回 recipes；current/baseline item268 无 message。runtime outcome 因此为 undefined，壳层回退“材料不足”；编辑器忠实显示空值。 | `packages/migrate/src/migrate-content.ts:962-1007`；`projects/pal/content/items.json:9294-9373`；`packages/content/src/item.ts:920-930`；`packages/reforge/src/main.ts:5428-5440`；`packages/editor/src/ui/ItemAlchemyTab.tsx:202-220` |
| 本任务目标 | producer 完整翻译终端提示；current/baseline item268 只新增 exact message，runtime/UI 无 PAL 特判。 | 本卡设计与验收条件 |

### 反证与替代解释

- 最强替代解释：“省略 message 是合法默认，所以当前迁移正确。”——只证明通用 schema 允许省略；不能证明 PAL producer
  可以丢弃已存在、可达且 schema 可表达的源文案。
- 什么观察会推翻当前前提：L39595 实际不可达；其文本不属于材料全不足；或 current schema/runtime 无法表达该文本。
  当前最后 failure operand、脚本臂和已有 optional field 逐项排除这些反证。
- 已排查替代根因：
  - runtime 语义 / 命令分类：runtime 正确透传 optional message；缺失时才走通用 fallback。
  - 原版 / 第一阶段理解：raw failure edge 与 showDialog 直接可见，第一阶段执行 raw script。
  - extractor / 数据解码：extracted command/text 完整，非提取缺失。
  - audit / test model：current integration expectation本身漏断言 message，需补回归。

### 用户可见偏离

- 是否主动偏离已核真值：no
- `before -> after`：字段空、游戏显示“材料不足” -> 字段预填、游戏显示原文“炼蛊的材料不足”。
- 代表场景：背包没有 117..121，直接使用炼蛊皿。
- 用户裁决：N/A（保持原版已核行为，不主动改产品机制）

## 上下文锚点

- 已拍板铁律：`AGENTS.md` migration 上游优先、开发期 current-only；`docs/phase2/READ-FIRST.md`。
- 相关任务：`ED-ITEM-ALCHEMY-SURFACE-1-two-item-refining-workbenches.md`。
- producer：`packages/migrate/src/migrate-content.ts:958-1007,1520-1542`。
- schema/runtime/UI：`packages/content/src/item.ts:146-147,913-945`；`packages/reforge/src/main.ts:5428-5440`；
  `packages/editor/src/ui/ItemAlchemyTab.tsx:202-220`。
- 原始数据：`data/extracted/data/items.json:5384-5408`；`data/extracted/events/all.json:260499-260597`。
- 不得重新引入：手改 current、item268 runtime fallback、兼容分支、一次性转换器、旧版本 upgrader。

## 验收条件

- translator：终端失败臂严格匹配时输出 trimmed message；有可达非零 failure 但形状不受支持时返回 undefined/pending。
- PAL data：item268 唯一 craft effect、五条 117..121→148 不变，只新增
  `unavailableMessage: "炼蛊的材料不足"`。
- exact generated diff 仅：
  - `projects/pal/content/items.json`
  - `packages/migrate/baselines/pal/content/items.json`
  - `packages/migrate/baselines/pal/_state.json`
- `_state.json` 仅 `files["content/items.json"]` hash 变化，managedFiles 不变；其他 items、shops、scenes、scripts、
  ids、counts、orders 零变化；current/baseline 镜像。
- 第一次 plan `writes=1 deletes=0 conflicts=0 asset-deletes=0`；写盘事务三文件；内部 replay 与独立第二次 plan 全零。
- 测试：translator 正例、畸形臂负例、PAL integration exact、publication/mirror；migrate 受影响包全量只跑一次。
- 视觉：Editor 炼蛊失败字段显示原文；游戏材料全不足用例登记到集中 E2E，预期旁白“炼蛊的材料不足”。

## 推进签字

### 进入 build 前：前提 / 设计

- Codex:
  - premise: **verified（2026-08-31）**——直读 L39606→L39595、原始旁白、0x20、producer、current、runtime
    fallback 与 editor；根因唯一落在 migration 终端失败臂未翻译。
  - design: **agree（2026-08-31）**——严格形状翻译、畸形 fail-loud、三生成文件 exact diff、双零计划；无
    runtime/UI fallback。
- Kimi:
  - premise: pending
  - design: pending
- GLM:
  - premise: pending
  - design: pending
- 独立反证审查：pending（至少一位非 Coding Owner 必须直读 raw failure edge 与 producer）。
- counter / 分歧处理: none
- 缺签豁免: N/A
- build 准入结论: **blocked（Codex only；Kimi / GLM pending）**

### 进入 done 前：审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- 用户验收: pending
- done 准入结论: blocked

## Draft / Build / Review

- Draft：前提真值、producer 根因、最小 strict translator 与 exact-diff 方案已登记。
- Build：blocked，三方 premise/design 签字齐前不得修改 migration/current publication。
- Review：pending。

## 用户验收

- 问题确认：2026-08-31 用户指出“材料不足提示”字段为空并质疑其用途。
- 实现验收：pending。

## 交接日志

- 2026-08-31 User/Codex: 用户指出空字段。Codex + 两席只读独立审计确认 primary 明有原文，schema/runtime/UI
  均可表达，`translateCraftRecipeScript` 丢弃最终 failure arm 是唯一根因。开高风险 migration 卡；未修改实现或
  generated current。Next: Kimi / GLM 独立签 premise/design，三签齐前不得 build。

## 下一位 Agent 提示词

```text
设计签字 MIG-PAL-CRAFT-FAILURE-MESSAGE-1（Kimi 或 GLM，只读）。

任务卡：docs/ops/tasks/MIG-PAL-CRAFT-FAILURE-MESSAGE-1-pal-craft-failure-message.md
当前状态：draft；Codex premise verified + design agree；Kimi/GLM pending；不得开始实现。

先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md 与任务卡。独立直读：
- data/extracted/events/all.json 的 L39606 failure→L39595 与“炼蛊的材料不足”
- reference/sdlpal/script.c 0x20
- packages/migrate/src/migrate-content.ts:958-1007
- current/baseline item268、content runtime fallback

请核：根因是否确在 migration；终端臂 strict narration/showDialog/end 翻译与畸形 fail-loud 是否正确；generated
exact diff 是否只能是 current/baseline items + state hash；第一次 writes=1、replay/独立二次全零是否足够。
Kimi 重点审控制流与架构边界；GLM 重点审 exact diff、负例与测试矩阵。

输出 premise verified + design agree，或带 file:line/反例的 counter；写回任务卡和交接日志。不得修改实现，
不得代签另一席，三签齐前不得把状态改 build。
```
