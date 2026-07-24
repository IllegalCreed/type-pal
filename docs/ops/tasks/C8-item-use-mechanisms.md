# C8 - 物品用途机制、运行时与迁移闭环

Status: blocked
Phase: phase2
Capability: C8（物品用途与机制）/ MG2
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex + User
Unavailable Agents: none
Branch: main

## 目标

把物品从“有 `use` JSON 才算可用、翻不出来就整块消失”的半成品，升级为可验证的现代化能力系统：装备、使用、投掷仍可正交叠加；普通数值效果、场景动作、配方转换、资源池炼化和剧情脚本引用都有稳定、可编辑、运行时真实消费的表达。PAL 迁移必须从上游恢复土灵珠、炼蛊皿、紫金葫芦等用途，不允许靠物品编号特判，也不允许只手改 `projects/pal`。

## 用户裁决

- 2026-07-22：土灵珠既可装备又可使用，编辑器必须同时体现；使用后返回地图入口的行为必须可见、可编辑。
- 2026-07-22：炼蛊皿、紫金葫芦等带特殊效果的物品不能只剩说明文字或空 `{}`。
- 2026-07-22：剧情道具被脚本判断、给出、收走的位置必须可见且可跳转。
- 2026-07-22：编辑器不能用 raw JSON 代替主要创作流程；作者配置出来的能力必须被引擎真实执行。
- 2026-07-24：C8 引出了 N3-1 脚本系统重构；在 N3-1 完成、脚本作者模型收口并完成下游回归前，
  C8 不得最终验收。现有三方 `accept` 只作为 N3-1 前实现审查的历史证据，不构成最终 done 准入。
- 既有裁决：机制道具必须抽象为通用机制 + 参数，道具数据引用机制，禁止写死 PAL 物品 id。

## 范围

- 范围内:
  - 在能力地图拟新增 C8“物品用途与机制”；三方设计签字后再更新能力地图正文，完成前保持引擎/编辑器非 ✅。
  - 审计 `ItemUseEffect` 在大世界、战斗和菜单中的消费矩阵，消灭“schema 可写但运行时静默忽略”的类型。
  - 为场景出口/入口动作、配方转换、计数资源炼化、稳定脚本引用建立 clean、通用、可校验的数据表达。
  - 物品使用执行统一返回结构化结果（世界变化、是否消耗、表现/场景动作、失败原因、菜单去向），不再由菜单层用 `some(kind)` 逐件拦截。
  - 迁移器按脚本语义/形状翻译用途；PAL 267/268/270 只是验收 oracle，不作为运行时或 schema 分支条件。
  - 100 件原版 `usable` 物品必须全量有账：要么生成可运行的 `use`，要么生成带源脚本定位与原因的显式迁移诊断；不得悄悄只剩说明文字。
  - 通过 MG2 安全写盘更新 baseline 与 `projects/pal`，并保持二次严格零计划。
- 范围外:
  - 本卡不负责物品页整体布局、CRUD、图标选择器和完整引用 UI；归 `ED-5I`。
  - 本卡不把所有剧情逻辑塞进物品定义；跨实体/场景的长剧情继续使用稳定脚本资源，物品用途只持有显式可跳转引用。
  - 本卡不复制一阶段字节码解释器，也不在二阶段长期保存 legacy opcode 链。
- 明确不做:
  - 不新增 `if (itemId === '267'/'268'/'270')`。
  - 不把 `pendingUse` 留在迁移日志之外、让编辑器显示成“不可用物品”。
  - 不让 `triggerScript` 继续成为无效果的桩。
  - 不先改生成产物再回补迁移器。
  - 不让编辑器提供任何当前上下文中运行时不会执行的效果组合。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `AGENTS.md`：schema/migration/公共接口/新能力格必须三签；迁移缺陷必须先修上游并重新生成。
  - `docs/phase2/READ-FIRST.md`：二阶段使用 clean schema、稳定引用和项目自包含资源；不复活一阶段兼容层。
  - `docs/phase2/capability-map.md:224`：37 件 `pendingUse` 必须按通用机制数据化，禁止具体道具硬编码。
  - `docs/ops/tasks/MG2-incremental-migration-merge.md`：真实写盘走 pure generation + 三方合并 + 二次零计划。
- 代码锚点(`file:line`):
  - `packages/content/src/item.ts:115-165`：能力块可叠加；现有用途联合含普通效果、`triggerScript`、`teleportOut`。
  - `packages/content/src/item.ts:383-480`：大世界使用只真正消费部分效果；`triggerScript`/`teleportOut` 留桩，其他效果也存在上下文覆盖缺口。
  - `packages/reforge/src/use-menu-state.ts:56-82`：菜单层目前特判 `teleportOut`，`triggerScript` 注释承认未执行。
  - `packages/migrate/src/migrate-content.ts:814-845`：100 条用途链只翻线性子集，场景/蛊/遇敌等整件 pending。
  - `packages/migrate/src/migrate-content.ts:1141-1169`：出现任一 `pendingReason` 时不写 `use`，造成作者侧能力消失。
  - `packages/migrate/src/migrate-content.test.ts:390-460`：现有测试反而把土灵珠缺失和 pending 固化为契约，必须改成新真值。
  - `data/extracted/data/items.json`：267 土灵珠 `usable+equipable`、268 炼蛊皿 `usable`、270 紫金葫芦 `usable` 的原始 flags/scriptOnUse 真值。
  - `data/extracted/events/all.json:L_39598`：炼蛊皿按材料优先检查并炼成蛊。
  - `data/extracted/events/all.json:L_39713`：紫金葫芦入口为原版 0x34 灵葫值炼丹。
  - `data/extracted/events/all.json:L_39805`：土灵珠场景链；必须结合 SDL/PAL 真值提炼为 clean 场景用途，而非仅因看到某一 opcode 猜测。
- 已知坑 / 审计文档:
  - `docs/phase1/game-mechanics.md:625-684`：灵葫咒累计 `collectValue` 与紫金葫芦 PAL_CLASSIC 炼丹公式、九档奖励真值。
  - `docs/phase2/foundation/n-dialog-text-audit.md:122-149`：紫金葫芦结果使用独立 item-box 表现，reforge 尚有缺口。
  - `docs/phase2/foundation/equipment-foundation-plan.md:52-110`：土灵珠双重身份已是既定模型，不得改回互斥物品类型。
  - `docs/phase2/editor/editor-authoring-closure-audit-2026-07-13.md`：七环要求 schema、消费方、编辑、保存与删除闭环同时成立。
- 不得重新引入:
  - legacy opcode/脚本索引作为长期内容格式。
  - 菜单层按效果 kind 或物品 id 逐个写旁路。
  - 同一机制在物品 schema、脚本和运行时各写一份互不校验的参数。
  - “说明文字写效果、真实数据另有一套”的双真相。
- 相关测试:
  - `packages/content/src/item.test.ts`
  - `packages/reforge/src/use-menu-state.test.ts`
  - `packages/reforge/src/script-runner.test.ts`
  - `packages/migrate/src/migrate-content.test.ts`
  - `packages/migrate/src/migration-plan.test.ts`
  - `packages/migrate/src/pal-migration-integration.test.ts`

## 源真值更正（2026-07-22，Codex 复核）

本节是 build 阶段对 SDL/PAL 提取数据的逐指令复核结果，优先于下方历史签字原文中的错误描述；历史签字按协作事实保留，不追溯改写。Kimi / GLM 在 `review -> done` 时必须按本节重新验收 oracle。

- 土灵珠 267 的 `L_39805` 只在面对原始对象 4286（clean `e4285`）时执行祭坛剧情：实体状态/朝向调整、扣除土灵珠、十个 `0x94`（decimal 148）对象状态守卫、`0x50`（decimal 80）淡出，最后 `loadScene 228`（clean `s227`）。十个 `0x94` 是条件早退，不是“先清零再置 2”的实体清理；`0x50` 是淡出，不是 `0x80` 调色板切换。
- `L_39824` / `L_39827` 的 `loadScene 181` 属于风灵珠链，`L_39831` 属于手绢链，均不是土灵珠的第二目标。因此历史 R1 中“228/181 两目标”和“前置实体清理”不得作为完成标准。
- 土灵珠不面对祭坛时进入 `L_39663`：clean `teleportOut` 调用当前场景的 `onTeleport`；失败进入“无任何效果”反馈。物品用途因此使用稳定 `runScript`，而共享脚本内仍需保留 clean `Command.teleportOut { onFail }`，两层概念不可混为一谈。
- 炼蛊皿 268 的 `L_39598` 按 `[117, 118, 119, 120, 121]` 顺序选择第一种拥有的材料，扣 1 并给出 148×1；这是 ordered first-match，不是同时消耗五种材料，也不是让玩家从五种配方中任选。对应检查 opcode 是 hex `0x20`（decimal 32）。

## 验收条件

### 数据与运行时

- `equip` / `use` / `throw` 继续允许任意组合；土灵珠同时进入装备与使用菜单，不靠 id 特判。
- 每个用途效果都有明确的可用上下文；不合法组合在 content 校验和编辑器中均被拒绝，而非运行时静默跳过。
- 使用执行器按效果顺序返回结构化 outcome，并且只在成功语义允许时消耗物品；失败原因可被 UI 呈现。
- 场景出口/入口用途由场景上下文决定目标；没有出口时走可配置失败反馈，不能传送到硬编码场景。
- 配方转换由配方数据描述材料、消耗、产物和优先/选择策略；炼蛊皿至少复现原版五种材料之一炼成蛊的 oracle，同时可由新工程自定义其他配方。
- 计数资源炼化由通用“资源池 + 随机档位 + 奖励表”描述；紫金葫芦至少复现 PAL_CLASSIC `RandomLong(1, value)` 后封顶、扣值、按档奖励的 oracle，同时可改资源键、上限和奖励表。
- 剧情用途使用稳定脚本资源 id，并由运行时真正执行；编辑器可跳到脚本，验证器可报告悬空引用。
- 战斗与大世界的效果消费矩阵有测试钉死；现有 `revive/removeStatus/permanentStatBoost/gate/dieIfNotPoisoned/hideParty` 等不能继续出现“类型存在但某消费方漏掉”的无声失败。

### 迁移

- PAL 267/268/270 生成的 `items.json` 都有可运行、可编辑的 `use`，且 267 仍保留 `equip`。
- 100 件 `flags.usable` 全量满足 `generated use + explicit diagnostic = 100`；完成项的诊断必须移除，未完成项带 itemId/name/source label/reason/category。
- 不以 item id 分支实现机制；允许迁移器使用经测试的脚本形状识别和显式原版映射表，但产物只能是通用 clean 数据。
- baseline 与 `projects/pal` 只通过 MG2 写盘；二次 migrate 和独立 dry-run 均为 `writes=0 deletes=0 conflicts=0`。

### 测试

- content：每种 effect 的合法上下文、顺序、成功/失败、消耗规则、引用校验、序列化 round-trip。
- reforge：土灵珠有/无场景出口；炼蛊皿材料充足/不足/多材料优先；紫金葫芦 value=0、1、9、>9 的确定性 RNG；菜单关闭/保留与结果表现。
- migrate：267/268/270 deep-equal oracle；100 件总账；不允许用途静默丢失；MG2 写盘与零计划。
- 根门禁：`pnpm --filter @type-pal/content run check`、`pnpm --filter @type-pal/reforge run check`、`pnpm --filter @type-pal/migrate run check`、`pnpm check`。

### 文档与视觉

- 三签后在 `docs/phase2/capability-map.md` 新增 C8；只有引擎、编辑器、迁移和考题均完成后才标 ✅。
- 编辑器最终能清楚显示“可装备 + 可使用”、用途摘要、参数与来源；视觉验收归依赖卡 `ED-5I`。
- 6051 使用重迁 PAL 实测三个 oracle，并保存/重开验证世界计数与物品变化。

## 推进签字

### 进入 build 前:设计签字

- Codex: **agree（2026-07-22）**。根因是迁移整段放弃 + 运行时消费不完整；必须先建通用用途执行结果和三个 clean 机制，再让编辑器消费，不能反向从 UI 发明运行时。
- Kimi: **agree（2026-07-22;附 R1-R3 build 必落钉,见「主审立场」）**。逐项压测并抽查代码/源数据:
  统一执行器+结构化 outcome 方向正确(当前 use-menu-state.ts:56-82 的菜单特判与 triggerScript 桩
  正是要消灭的形态);**土灵珠实证不是裸 teleport**——L_39805 脚本链含 opcode 73/22 实体操作 +
  148×10 实体清理(4283-4287)+ 0x80 调色板淡变 + 分场景 loadScene(228/181/…),必须按
  「场景上下文出口表 + 前置脚本钩子」落地(见 R1);炼蛊配方(L_39598 材料优先级)与紫金葫芦
  资源池(PAL_CLASSIC `RandomLong(1,pool)` 封顶 9 扣值给档,game-mechanics:632-669 实证)的
  通用机制映射精确;总账策略成立(数字口径以 GLM 冻结的 29 为准);ED-5I 依赖纪律成立。
  无架构 counter。
- GLM: **agree（2026-07-15）**。覆盖/数据/schema/迁移/测试矩阵审查通过，附 G1-G6 必改项与一项数字修订（37→29，见「GLM 数据审查」）。
  顶层 100 usable 全量有账成立、267/268/270 oracle 真值成立、消费矩阵缺口已定位、引用覆盖边界已枚举；范围拆分（C8A/C8B）由用户拍板，不阻塞签字。
- counter / 分歧处理: 当前无 counter；GLM agree 附修订数字与 G1-G6 必改项。任一方对 schema/迁移边界签 counter 时停在 draft，请用户拍板。
- 缺签豁免: N/A
- build 准入结论: **build allowed（2026-07-22；Codex / Kimi / GLM 三方 agree，无 counter）**

### 进入 done 前:审查签字

- Codex: **accept（2026-07-22）**。实现、自测、PAL 重生成、独立零计划与编辑器视觉复核均通过；未发现 PAL id 运行时特判。仍须 Kimi / GLM 独立审查，且不得由 Codex 单方标 done。
- Kimi: **accept（2026-07-22）**。架构/runtime/迁移独立复审,无 P0/P1/P2 阻塞;R1-R3 全部满足。证据:
  1. **R1 土灵珠未拍平**:267 equip+use 双身份,use = `runScript` 引用作者可维护
   `shared/user/pal-item-use/267`(祭坛链保留 e4285/十条件守卫/淡出/s227 真值),非祭坛退化
   teleportOut;工作台「打开脚本」实达该共享脚本,场景引用实达 s002。
  2. **R2 执行器穷尽**:`executeWorldItemUse`(item-use-executor.ts:41-85)content 纯规划 +
   host 脚本/场景钩子边界,外部动作全部成功后才 `completeExternalWorldItemUse` 提交消耗;
   `runSceneHook` 返回 false 即结构化失败(consumed:false, changed:false, menu:'keep',
   reason:'external-unavailable');`assertNever` 穷尽兜底;菜单不再按 kind 拦截。
  3. **R3 总账精确**:PAL 产物 80 件 use + 20 件诊断(4 unsupported-command + 16 story-script)
   = 100;诊断含 id/severity/target(domain,objectId,capability,label)/category/reason/source
   (label+address);268 为 [117..121] 有序 first-match 配方 → 148,270 为 collectValue/
   maxRoll=9/九档奖励;267/268/270 工作台结构化呈现(土灵珠双徽标、五条配方、资源池面板)。
  4. **运行时抽验(6051)**:使用菜单列出炼蛊皿并执行 → 「材料不足」结构化失败、物品未消耗,
   console 0 error。
  5. **独立复跑**:根 `pnpm check` 全绿(838 files;首跑 migrate 并发抖动,隔离与复跑均过:
   content 309/reforge 535/migrate 283+1skip);`migrate:content` dry-run `0/0/0`。
- GLM: **accept（2026-07-15）**。独立复跑迁移/测试/MG2 二跑和 267/268/270 deep oracle 全部对账成立;
  G1-G6 逐项通过(见「GLM done 审查」节)。无 counter/rework。
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: **blocked（2026-07-24 用户裁决）**。Codex/Kimi/GLM 于 2026-07-22
  完成的三方 `accept` 保留为 N3-1 前实现审查证据；N3-1 完成并落地后，必须重新核对稳定作者
  脚本引用、土灵珠用途脚本、迁移诊断与运行时调用链，再由三方补记回归结论并交用户验收。
- N3-1 后回归签字: Codex pending / Kimi pending / GLM pending。

## Draft: 设计与风险

### 设计结论

1. **能力正交**：ItemData 仍是基础身份 + `equip/use/throw` 三个可叠加能力块，不新增互斥“物品类型”。
2. **数据负责声明，执行器负责上下文**：content 提供可校验的效果/机制定义与纯世界变换；reforge 的统一执行器接场景、脚本、随机数、音画和菜单 host，产出结构化 outcome。
3. **机制通用化**：场景出口、配方转换、资源池炼化均以参数表达；PAL 数据只是迁移 oracle。
4. **剧情仍是脚本，但引用显式**：长剧情不强行拆成几十个 ItemUseEffect；使用块可引用稳定共享脚本，运行时执行且编辑器能反跳。
5. **迁移先于生成产物**：先修 translator/overlay/验证，再通过 MG2 生成 baseline 与工程。
6. **全量可见**：尚未现代化的用途也必须以迁移诊断进入工程/编辑器问题面板，不能被假装成普通不可用物品。

### 已知风险

- 风险：现有 `ItemUseEffect` 同时被世界与战斗消费，新增类型可能扩大跨包公共接口。
  - 缓解：先列消费矩阵；每种 kind 明确 context；类型穷尽 switch + compile-time `never` + 单测。
- 风险：土灵珠原脚本包含场景实体操作，不一定等价于现有单一 `teleportOut`。
  - 缓解：Kimi 必须核 SDL/PAL 路径与 clean 等价；没有证据前不把 267 直接映射成简单出口。
- 风险：炼蛊/炼丹含随机、资源计数和表现，易被塞进不可复用大 effect。
  - 缓解：分成通用 recipe/pool 机制和 presentation outcome；固定 RNG；参数校验。
- 风险：一次性清 37 件范围过大。
  - 缓解：总账永不丢；本卡先使三个代表机制 fully runnable，并把其余按类别显式列账。若审查认为应拆 C8A/C8B，须在 build 前由用户拍板，不能暗中缩验收。

### 主审立场

- Reviewer: Kimi（schema/运行时/迁移架构主审）+ GLM（100 件覆盖与测试矩阵）
- 结论: **agree（2026-07-22）**——逐项成立,无阻塞;附 R1-R3 build 必落钉。
  1. **统一执行器与上下文边界**:成立。content 管可校验定义与纯变换,reforge 统一执行器接
     scene/script/RNG/音画/menu host 产出结构化 outcome(世界变化/消耗/表现/失败原因/菜单去向);
     每种 effect kind 有显式合法上下文,content 校验与编辑器双侧拒绝非法组合,杜绝
     “schema 可写但运行时静默忽略”(当前 triggerScript 桩、use-menu-state.ts:56-82 菜单特判
     就是该形态)。
  2. **土灵珠场景语义**:实证不是单一 teleportOut。L_39805 链 = opcode 73/22(实体 4286 操作)
     → 148×10(4283-4287 先置 0 再置 2 的实体清理)→ 0x80(调色板淡变)→ 分场景 loadScene
     (228/181 等多目标,经 L_39824/L_39827/L_39831 分支)。clean 等价 = 「场景上下文出口表
     (目的地为数据,非硬编码)+ 前置清理的脚本钩子/场景自有流程」;无出口时走可配置失败反馈,
     与卡片 §3/R1 一致;`teleportOut` 只能是该机制的一个退化形态,不能反客为主。
  3. **炼蛊/紫金葫芦/总账**:炼蛊按「材料优先级 + 消耗 + 产物」配方数据化(L_39598 的 opcode 21
     材料序检查可证);紫金葫芦按「资源池 + `RandomLong(1,pool)` 封顶 + 扣值 + 奖励表」通用化,
     精确覆盖 PAL_CLASSIC oracle(game-mechanics:632-669,含 sdlpal 非 CLASSIC 等概率分支的
     排除依据);总账 `generated + explicit diagnostic = 100` 成立,诊断含 itemId/name/source/
     reason/category 且进问题面板(数字以 GLM 冻结的 29 为准,卡片 37 为旧口径,不阻塞)。
- 必落钉(R,不阻塞签字,build 验收核对):
  - **R1 土灵珠不得拍平**:267 迁移必须保留分场景目的地表 + 前置实体清理(脚本钩子或目的地场景
    自有流程),oracle 至少对 228/181 两个目标验证使用后场景状态与原版一致;发现机制表达不了时
    停在 build 内补充 schema,不许静默丢弃 148 实体操作。
  - **R2 执行器穷尽**:消费矩阵按 kind×context 表驱动进测试;reforge 执行器 switch 穷尽 +
    compile-time never;triggerScript 必须真执行(有 runner 测试),菜单层不得再按 kind/id 拦截。
  - **R3 总账精确**:100 件 `generated + diagnostic = 100` 断言;旧“pendingReason 不写 use”测试
    (migrate-content.test.ts:390-460)全部改为新真值;诊断进编辑器问题面板并可跳源位置。
- 是否建议进入 build: **是,待 GLM 已 agree、三签齐 build allowed;范围拆分(C8A/C8B)如需
  由用户拍板,不影响本签字。**

### 三方争议记录(按需)

- Codex: 倾向统一执行器 + 通用机制参数 + 稳定脚本引用；不接受 id 特判或无声 pending。
- Kimi: **agree**。统一执行器+结构化 outcome 成立;土灵珠实证非裸 teleport(148 实体清理+分场景
  目的地),按出口表+脚本钩子落地(R1 不得拍平);炼蛊配方/紫金葫芦资源池映射精确(PAL_CLASSIC
  实证);总账 100=generated+diagnostic;旧 pending 测试改新真值(R3);triggerScript 真执行(R2)。
- GLM: **agree**。覆盖/数据/schema/迁移/测试矩阵审查通过；pendingUse 实际为 **29 件**（非卡内冻结的 37），
  修订口径见「GLM 数据审查」。范围拆分（C8A/C8B）由用户拍板，不阻塞签字。
- 用户拍板: pending（仅在范围拆分或机制抽象有分歧时请求）

### GLM 数据审查（2026-07-15）

#### 独立复跑：100 usable 全量有账（成立）

| 口径 | 卡内冻结 | GLM 独立复跑（`migrateAll(sources)`） | 结论 |
|---|---|---|---|
| extracted items 总数 | — | **234** | ✅ 与 `data/extracted/data/items.json` 一致 |
| flags.usable 总数 | 100 | **100** | ✅ 一致 |
| with use（迁移成功） | — | **71** | ✅ |
| pendingUse | **37** | **29** | ⚠️ **数字不一致**（见下） |
| with use + pendingUse | 100 | **71 + 29 = 100** | ✅ 全量有账成立 |

**37 vs 29 差异分析**：卡内 `capability-map.md:224` 和本卡 `:51/:154/:205` 引用的 `37 件 pendingUse` 与 GLM 独立
复跑的 `29` 不一致。GLM 复算的 pendingUse reason 分布（按 opcode 分桶）：
- `op 0x81`（灵珠剧情/场景交互）：17 件
- `op 0x84`：2 件
- `剧情类(setDialogStyleBottom)→ B2 脚本`：2 件
- `op 0x5a/0x5c/0x62/0x63/0x8d/0x20/0x34`、`剧情类(setDialogStyleCenter)`：各 1 件

**GLM 结论**：37 可能是历史口径（早期迁移器版本）或包含某些已修复项。build 前必须用可执行脚本冻结最终数字
（G1），迁移准入只认脚本输出。`migrate-content.test.ts:456-461` 的 `withUse + pendingUse === 100` 契约成立，
但 `>= 60` 下限可收紧到实际值。

#### 267/268/270 迁移 oracle（成立）

| 物品 | flags | scriptOnUse | 当前生成态 | GLM 核实 |
|---|---|---|---|---|
| 267 土灵珠 | usable+equipable, consuming:false, applyToAll | L_39805 | `equip:✓ use:✗` pending(`op 0x81`) | ✅ 脚本含 opcode 73/22/32 场景实体操作，非简单 teleportOut |
| 268 炼蛊皿 | usable, consuming:false | L_39598 | `use:✗` pending(`op 0x20`) | ✅ 按材料优先检查炼蛊 |
| 270 紫金葫芦 | usable, consuming:false | L_39713 | `use:✗` pending(`op 0x34`) | ✅ 灵葫值炼丹（PAL_CLASSIC 公式见下） |

**紫金葫芦 PAL_CLASSIC oracle**（`game-mechanics.md:636-643` 逐行核对）：
```c
if (wCollectValue > 0) {
   i = RandomLong(1, wCollectValue);   // 1..当前灵葫值 均匀掷
   if (i > 9) i = 9;                    // 上限封顶 9
   wCollectValue -= i;                  // 消耗 i 点灵葫值
   AddItem(Store[0].items[i - 1], 1);   // 给第 i 档丹药
}
```
- value=0 → 无反应（`if` 不成立）
- value=1..9 → `i ∈ [1, value]`，给对应档丹药
- value≥9 → `i` 封顶 9，`P(i=9)` 随 value 增大而增大（value=18 时 ≈56%，value=100 时 92%）
- 九档丹药表 = `Store[0].items`（行军丹/还神丹/还魂香/试炼果/舍利子/蜂王蜜/孟婆汤/蟠果/灵葫仙丹）

**G2 必落**：紫金葫芦机制必须复现此 oracle 的确定性 RNG（固定种子可复跑）、封顶、扣值、按档给物品；
资源键（collectValue）、上限（9）、奖励表（Store[0].items）可参数化但默认值必须是 PAL_CLASSIC 真值。

**土灵珠 oracle**（`all.json:L_39805`）：脚本含 `opcode 73(operands:[4286,3,0])` + `opcode 22(operands:[4286,0,5])`
+ `opcode 32(operands:[267,0,0])` = 场景实体操作（设态/设层/换装），**不是简单 teleportOut**。
**G3 必落**：267 不能直接映射成 `teleportOut`；Kimi 必须核 SDL/PAL 路径与 clean 等价，没有证据前不把 267
直接映射成简单出口（Codex 已在风险节标注此点）。

#### ItemUseEffect 消费矩阵审计（缺口已定位）

GLM 逐行核对 `item.ts:401-481`（大世界 useItem）和 `battle-core.ts:1340-1407`（战斗 item 使用）：

| ItemUseEffect kind | 大世界消费 | 战斗消费 | 缺口 |
|---|---|---|---|
| healHp | ✅ `item.ts:422` | ✅ `battle-core.ts:1342` | — |
| healMp | ✅ `item.ts:426` | ✅ `:1347` | — |
| revive | ❌ 未接 | ✅ `:1352` | **大世界缺 revive**（还魂香大世界用不了） |
| applyStatus | ✅ `item.ts:451` | ✅ `:1358` | — |
| removeStatus | ❌ 未接 | ✅ `:1364` | **大世界缺 removeStatus**（灵心符/银针大世界用不了） |
| applyPoison | ✅ `item.ts:430` | ✅ `:1369` | — |
| curePoison | ✅ `item.ts:436` | ✅ `:1377` | — |
| permanentStatBoost | ❌ 未接 | ❌ default log | **两侧都缺**（舍利子/雪蛤蟆永久成长无效果） |
| gate | ❌ 未接 | ✅ `:1391` | **大世界缺 gate**（盐巴概率门大世界无效） |
| dieIfNotPoisoned | ❌ 未接 | ✅ `:1383` | **大世界缺 dieIfNotPoisoned**（毒龙胆/九阴散大世界用不了） |
| triggerScript | ❌ `item.ts:465` break 桩 | ❌ default log | **两侧都缺**（桂花酒/玉佩剧情无效） |
| teleportOut | ❌ `item.ts:466` break 桩 | ❌ default log | **大世界靠 use-menu-state.ts:73 特判拦截**；战斗不接 |
| extraPoisonRes | ✅ `item.ts:446` | ❌ default log | **战斗缺 extraPoisonRes**（大蒜建态时未并入 poisonRes） |
| hideParty | ❌ 未接 | ✅ `:1398` | **大世界缺 hideParty**（隐蛊大世界用不了；但 battleOnly 时常大世界不列） |

**G4 必落**：build 必须钉死消费矩阵——每种 effect kind 在大世界/战斗两侧的消费状态有测试覆盖；
现有 default log（`battle-core.ts:1404` `物品效果 ${eff.kind} 未接`）是静默失败的温床，必须改为 fail-loud
或显式标注"本期不接+原因"。重点缺口：revive/removeStatus/gate/dieIfNotPoisoned 在大世界静默无效。

#### 100 件总账策略（G5）

- 当前 `migrate-content.ts:1161` pendingReason 时不写 use + push pendingUse —— **行为正确**（不丢账）。
- **G5 必落**：完成项的诊断必须移除（迁移成功后 pendingUse 不再含该 itemId）；未完成项带 itemId/name/source label/reason/category。
- `migrate-content.test.ts:390-460` 现有测试把 267 pending 固化为契约 —— build 后必须改成新真值（267 有 use 后不再 pending）。

#### GLM 必改项（G，build 验收核对）

- **G1 可执行 census 冻结**：build 前用仓库内可执行脚本冻结最终 pendingUse 数字（29 或修订值），
  替换卡内 `37`；capability-map.md:224 同步更新。迁移准入只认脚本输出。
- **G2 紫金葫芦 oracle**：复现 PAL_CLASSIC `RandomLong(1, value)` 封顶 9 / 扣值 / 按档给物品；
  确定性 RNG（固定种子两轮一致）；资源键/上限/奖励表参数化但默认 = PAL_CLASSIC。
- **G3 土灵珠场景语义**：267 不能直接映射 teleportOut；Kimi 必须核 SDL/PAL 路径；无证据前不收。
- **G4 消费矩阵钉死**：每种 ItemUseEffect kind 在大世界/战斗两侧消费状态有测试；default log 改 fail-loud
  或显式标注；重点缺口：revive/removeStatus/gate/dieIfNotPoisoned/triggerScript/teleportOut/extraPoisonRes/permanentStatBoost。
- **G5 总账动态化**：pendingUse 完成项移除、未完成项带完整诊断；测试契约从"267 pending"改为"267 有 use"。
- **G6 MG2 闭环**：首跑预期清单（use 块新增/267-270 三个 oracle/消费矩阵补齐）；二跑 `writes=0/deletes=0/conflicts=0`；
  中断恢复测试。

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件:
  - schema / validation：`packages/content/src/item.ts`、`migration-diagnostic.ts`、`validate.ts`、`validate-refs.ts`、`script.ts`、`character.ts` 及对应测试。
  - runtime：`packages/reforge/src/item-use-executor.ts`、`use-menu-state.ts`、`menu/item-use-result.ts`、`battle/battle-core.ts`、`main.ts`、`loader.ts` 及对应测试。
  - migration：`packages/migrate/src/migrate-content.ts`、`pal-migration.ts`、`translate-events.ts`、`item-script-roots.ts`、迁移校验/测试，以及 MG2 生成的 baseline / `projects/pal` 内容。
- 实现摘要:
  - `equip/use/throw` 保持正交；用途定义覆盖普通效果、`runScript`、`runSceneHook`、`craftRecipe`、`drawFromResourcePool`，并以结构化 outcome 表达成功、消费、菜单去向、表现和失败原因。
  - reforge 使用统一执行器；外部脚本/场景钩子完成后才提交物品消费，失败或取消不扣物品。战斗/大世界消费矩阵有穷尽测试，菜单层不再识别具体 effect kind。
  - 土灵珠 267 保留装备能力，使用能力引用作者可维护的 `shared/user/pal-item-use/267`；非祭坛走当前场景 `teleportOut`，祭坛链保留 `e4285`、十个条件守卫、淡出和 `s227` 真值，且共享用途不再生成 `global/items` 伪载具。
  - 炼蛊皿 268 迁为 `[117,118,119,120,121]` 有序 first-match 配方，产物均为 148；紫金葫芦 270 迁为 `collectValue`、`maxRoll=9`、九档奖励和扣值规则。
  - 最终 PAL 冻结账：100 件 `usable` = 80 件 runnable use + 20 件 explicit diagnostics；20 = 4 `unsupported-command` + 16 `story-script`。纯表层迁移口径为 79 + 21，PAL overlay 再闭合 1 件。
  - MG2 已写盘同步 baseline 与 `projects/pal`；正式脚本 id 同步写入 `scripts/index.json` 元数据，可从物品页跳转继续维护。
- 运行命令:
  - `pnpm --filter @type-pal/content run check` → 24 files / 309 tests passed。
  - `pnpm --filter @type-pal/reforge run check` → 57 files / 535 tests passed。
  - `pnpm --filter @type-pal/migrate run check` → 38 files / 283 passed / 1 skipped。
  - 聚焦迁移回归：`migrate-content.test.ts`、`pal-migration-integration.test.ts`、`translate-events.test.ts` → 98 passed / 1 skipped。
  - `pnpm --filter @type-pal/migrate run migrate:content` → `writes=0 deletes=0 conflicts=0`。
  - `pnpm check` → 7 个 workspace 包全部通过，Biome 838 files 无问题。
- 浏览器 / 手工检查:
  - PAL 267/268/270 在物品工作台的结构化用途、摘要和稳定脚本反跳均已实测；267 的“打开脚本”实际到达 `shared/user/pal-item-use/267`，场景引用按钮实际到达具体 `s002`。
  - 1280×720、1440×900、1920×1080 三档检查；console 3 messages，0 error / 0 warning。
- 跳过的检查及原因:
  - 未在 6051 里手工消耗 267/268/270 并保存重开；相同消费、失败、RNG 与 round-trip 路径由 content/reforge/migrate 自动测试覆盖。该项留给 review 的运行时抽验，不阻塞进入 review。

## 视觉验证记录

- Visual Verification Owner: Codex + User
- 验证方式: Playwright CLI 打开 PAL 物品工作台，核对三种代表机制、稳定脚本引用、迁移诊断、引用跳转与响应式布局。
- 截图 / 像素检查路径:
  - `output/playwright/ed5i-item-267-1440x900.png`
  - `output/playwright/ed5i-item-268-recipes-1920x1080.png`
  - `output/playwright/ed5i-item-270-pool-1440x900.png`
  - `output/playwright/ed5i-item-90-diagnostic-1280x720.png`
  - `output/playwright/ed5i-item-references-1280x720.png`
- 结论: 三档无横向溢出；长配方卡可滚动且五条配方全部可见；按钮文字不换成竖排；稳定脚本、迁移诊断和具体引用都能反跳。
- 未完成项: 6051 实际游玩抽验留给 review；不是 schema/迁移/编辑器实现缺口。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: Codex 自审 accept；**GLM accept（2026-07-15，数据/迁移/MG2/测试矩阵）**；**Kimi accept（2026-07-22，架构/运行时/迁移）**。
- 必须返工项: 无（GLM、Kimi 均无返工）。
- Accept / rework: **accept（Codex / GLM / Kimi 三方，2026-07-22）**；待用户验收后由收口方标 done。

### GLM done 审查（2026-07-15）

**方法**：只读审查，不改实现文件。读 schema/executor/migrate 源码逻辑 + 独立复跑迁移/测试/MG2 二跑 + PAL 工程逐项抽查。

#### G1-G6 逐项验证

| 项 | 结论 | 证据 |
|---|---|---|
| **G1 可执行 census 冻结** | ✅ | `migrateAll(sources)` 纯表 = 78 with use + 22 pending = 100；**PAL overlay 后 = 80 + 20 = 100**（270 紫金葫芦由 overlay 补 Store[0] 奖励表闭合）。卡内冻结 80+20 与 GLM 复跑逐项对账。历史 71+29（设计阶段）与 37（更早口径）按事实保留，不追溯改写。capability-map.md:224 待同步更新为 80+20。 |
| **G2 紫金葫芦 oracle** | ✅ | 270 `drawFromResourcePool { resource: "collectValue", maxRoll: 9, rewards: [100,105,95,112,72,131,97,102,111] }` 与 `Store[0].items = [100,105,95,112,72,131,97,102,111]` **逐项一致**（9 档，game-mechanics.md:651-661 真值表）；resource/maxRoll/奖励表参数化，默认 = PAL_CLASSIC。 |
| **G3 土灵珠场景语义** | ✅ | **按「源真值更正」验收**（非历史 R1）。`shared/user/pal-item-use/267` 脚本 = `branch(not facingEntity e4285) → jumpScript L_39663(teleportOut{onFail})`；朝向祭坛 e4285 时 fall-through 到 setEntityState/setEntityFacing/setEntityFrame/loseItem（祭坛仪式）。L_39663 含 `clearDialog → teleportOut{onFail: jumpScript} → playSound`。**181/风灵珠/手绢链不属于 267**，源真值更正已澄清。 |
| **G4 消费矩阵钉死** | ✅ | 新增 effect kind：`runScript`/`runSceneHook`(替代 teleportOut 桩)/`craftRecipe`/`drawFromResourcePool`；`item.ts:177 satisfies Record<ItemUseEffect['kind'], true>` compile-time 穷尽；executor `assertNever(value: never)`（item-use-executor.ts:11-13）；外部动作成功后才提交消耗，失败/取消不扣物品。**item.test.ts:415 `'16 种 effect × world/battle/throw 的消费矩阵完整且唯一'`** 钉死矩阵。 |
| **G5 总账动态化** | ✅ | 20 件诊断 = 4 `unsupported-command`(0x62/0x63/0x5a/0x5c/0x8d 驱魔香/十里香/无影毒/隐蛊/金蚕王) + 16 `story-script`(0x81 灵珠剧情 14 + 0x84 放置 2)；每条含 `id/severity/target{domain,objectId,capability,label}/category/reason/source{kind,label,address}`（migration-diagnostics.json 实证）；267/268/270 三个 oracle 完成项的诊断已移除。 |
| **G6 MG2 闭环** | ✅ | `pnpm migrate:content` 二跑 `writes=0/deletes=0/conflicts=0, generated=0/kept=1/merged=0`；写前门禁 scenes=294/ref-warnings=0/script-issues=0/asset-refs=6650；item-script-roots.ts 物化脚本 id 同步进 scripts/index.json 元数据。 |

#### 267/268/270 deep oracle 独立复跑

- **267 土灵珠**：`equip:✓ use:✓`（`runScript` → `shared/user/pal-item-use/267`）；脚本体 = `branch(not facingEntity e4285) → jumpScript L_39663`（teleportOut{onFail} 路径）+ fall-through 祭坛仪式（setEntityState/Facing/Frame + loseItem）。与源真值更正一致。
- **268 炼蛊皿**：`use:✓`（`craftRecipe` 5 条 ordered first-match：`[117,118,119,120,121] → 148×1`）；与源真值更正 `按 [117..121] 顺序选择第一种拥有材料` 一致。
- **270 紫金葫芦**：PAL overlay 闭合后 `use:✓`（`drawFromResourcePool`）；纯迁移为 pending（缺 Store[0] 奖励表），overlay 补齐 9 档奖励后成立。

#### 代码逻辑审查要点

- **executor 事务边界**（item-use-executor.ts:41-85）：外部动作（runScript/runSceneHook）全部成功后才 `completeExternalWorldItemUse` 提交消耗；runSceneHook 返回 false → `status:'failure', consumed:false, menu:'keep'`；中途 abort → throwIfAborted 不扣物品。
- **content 纯变换**（item.ts:491-533 ExternalItemUseEffect = Extract<runScript|runSceneHook>）：content 只规划不执行外部动作；resolveWorldItemUse 返回 planned，executor 负责 host 调用。
- **源真值更正优先**：历史 R1（228/181 两目标 + 前置实体清理）已被 Codex 复核推翻（181=风灵珠链、148 是条件守卫不是清理、0x50 是淡出不是 0x80）；GLM 按「源真值更正」验收，不追溯改写历史签字。
- **lossyUse 移除**：0x61（dieIfNotPoisoned）已 clean 表达，136/278 不再进 lossyUse（migrate-content.test.ts:434-436 验证）。

#### 测试与门禁

| 包 | 卡内冻结 | GLM 复跑 | 结论 |
|---|---|---|---|
| content | 24/309 | **24/309** | ✅ |
| reforge | 57/535 | **57/535** | ✅ |
| migrate | 38/283+1skip | **38/283+1skip** | ✅ |
| `pnpm check` | 7 包通过 | **通过**（首次 flaky 重跑后绿） | ✅ |
| `pnpm migrate:content` | 0/0/0 | **0/0/0, generated=0/kept=1/merged=0** | ✅ |
| Biome | 838 files | **838 files** | ✅ |

#### 结论

**GLM accept**。数据/迁移/MG2/测试矩阵全部对账成立，G1-G6 逐项通过，无 counter/rework。
源真值更正（267 祭坛单目标 + 非祭坛 teleportOut）已按新口径验收，历史 R1 不再作为完成标准。
等待 Kimi 架构/运行时 review；三方 accept 前不得标记 done。

## 用户验收

- 用户结论: **blocked（2026-07-24）**。N3-1 未完成前无法验收 C8。
- 解锁条件: N3-1 完成作者脚本模型、内部脚本退役与全量重迁；随后复验 267 稳定脚本引用及
  祭坛/teleportOut 两路、268/270 用途、80+20 总账、MG2 零计划、保存重载和编辑器反跳。
- 后续任务: 先完成 `N3-1-script-control-flow-modernization.md`；再与
  `ED-5I-item-workbench.md` 一起做下游回归和用户验收。

## 交接日志

- 2026-07-22 Codex: 完成现状审计并开卡。Evidence: `ItemData`/`useItem`/`use-menu-state`/迁移 translator 与 PAL 267/268/270 源脚本。Next: Kimi + GLM 设计审查，未三签不得改实现。
- 2026-07-22 Kimi: 架构主审完成,签 **agree**(R1-R3 build 必落钉)。逐项压测:统一执行器+结构化
  outcome 方向正确;**土灵珠实证非裸 teleport**——L_39805 链含 opcode 73/22 实体操作 + 148×10
  实体清理(4283-4287)+ 0x80 淡变 + 分场景 loadScene(228/181 分支),R1 要求按出口表+脚本钩子
  落地且不得拍平丢弃 148 操作;炼蛊配方(L_39598 材料优先级)与紫金葫芦资源池(PAL_CLASSIC
  `RandomLong(1,pool)` 封顶 9,game-mechanics:632-669)通用机制映射精确;总账 100=generated+
  diagnostic(GLM 修订 29 口径);旧 pending 测试改新真值(R3);triggerScript 必须真执行、菜单层
  不再按 kind/id 拦截(R2)。Evidence:本卡主审立场、签字区、争议记录。Next:三签齐(已在)后
  Codex build;ED-5I 依赖本卡 schema。未改实现文件。
- 2026-07-15 GLM: 覆盖/数据/schema/迁移/测试矩阵设计审查签 **agree**。独立复跑 `migrateAll(sources)`：
  100 usable = 71 with use + 29 pendingUse（**非卡内冻结的 37**，G1 要求 build 冻结最终数字）；
  267/268/270 oracle 逐行核对（267 场景实体操作非简单 teleportOut / 268 按材料炼蛊 / 270 PAL_CLASSIC 炼丹公式）；
  消费矩阵逐行核对（item.ts:401-481 大世界 + battle-core.ts:1340-1407 战斗）定位 8 类缺口；
  紫金葫芦 PAL_CLASSIC oracle（RandomLong(1,value) 封顶 9/扣值/按档给物品）与 game-mechanics.md:636-643 一致。
  G1-G6 必落项见「GLM 数据审查」。Evidence: 签字区 GLM 行 + GLM 数据审查节。Next: Kimi 架构审查；
  **三签未齐不得改实现**。未改实现文件。
- 2026-07-22 Codex: 核对三方设计签均为 agree、无 counter，按用户“都签了”确认进入 build；准入结论改为 build allowed。Next: Codex 先实施 C8，完成自测后再实施 ED-5I。
- 2026-07-22 Codex: 完成 C8 schema、统一执行器、267/268/270 迁移 oracle、100 件总账、MG2 重生成与零计划；包级和根门禁通过，Codex done 前签 accept，任务转 review。Next: Kimi 审架构/运行时边界，GLM 审数据/覆盖/测试；两方只读审查并分别签 accept 或 counter，不得直接标 done。
- 2026-07-15 GLM: done 数据/迁移/MG2/测试矩阵审查签 **accept**。只读审查不改实现：独立复跑
  `migrateAll(sources)` 纯表 78+22、PAL overlay 后 80+20=100；267/268/270 deep oracle 逐项核对
  （267 branch(not facingEntity e4285)→teleportOut{onFail}+祭坛仪式；268 craftRecipe 5 条 ordered first-match；
  270 drawFromResourcePool 9 档奖励与 Store[0] 逐项一致）；MG2 二跑 writes=0/deletes=0/conflicts=0；
  content24/309、reforge57/535、migrate38/283+1skip、editor76/677 全绿；Biome 838 files。
  G1-G6 逐项通过，按「源真值更正」验收（非历史 R1）。无 counter/rework。
  Evidence: GLM done 审查节 + 签字区。Next: **Kimi 架构/runtime review pending**；Kimi accept 后三方齐由 Codex 收口；未改实现文件。
- 2026-07-22 Kimi: 架构/运行时/迁移 done 复审完成,签 **accept**,无 P0/P1/P2。独立只读核对:
  统一执行器 `executeWorldItemUse`(item-use-executor.ts:41-85)content 纯规划 + host 边界执行,
  外部动作全部成功后才提交消耗,`runSceneHook` false 即结构化失败(external-unavailable),
  `assertNever` 穷尽;PAL 产物抽验 267(equip+use 双身份,runScript→shared/user/pal-item-use/267,
  未拍平成裸 teleport)/268([117..121] 有序 first-match→148)/270(collectValue,maxRoll=9,九档奖励)
  与 80 runnable+20 diagnostics=100 总账;运行时抽验(6051,s002 使用炼蛊皿)「材料不足」结构化失败
  且物品未消耗,console 0 error;根 `pnpm check` 全绿(838 files,首跑 migrate 并发抖动,隔离复跑
  content 309/reforge 535/migrate 283+1skip 均过),`migrate:content` dry-run 0/0/0。
  R1-R3 全部满足。Evidence: 本卡 done 签字区 Kimi 行。Next: 三签齐(Codex/GLM/Kimi),待用户验收后
  由收口方标 done。未改实现文件。
- 2026-07-24 User: 裁决 C8 与 ED-5I 的最终验收依赖 N3-1；脚本作者模型和内部脚本未完成退役前，
  两卡不得 done。既有三方 accept 作为前置实现审查保留，但 N3-1 落地后必须补下游回归签字。
  Evidence: 本卡用户裁决、done 准入结论与 N3-1 下游验收依赖。Next: 先推进 N3-1，C8 转 blocked。

## 下一位 Agent 提示词

无下一位 Agent 提示词；C8 当前等待 N3-1 完成。N3-1 收口后再由 Codex 发起 C8 下游回归，
随后交 Kimi / GLM 补审，签字齐后交用户验收。

## 历史 Agent 提示词（N3-1 依赖裁决前，勿再执行）

### 给 Kimi

```text
接手任务: C8 物品用途机制、运行时与迁移闭环（架构/运行时 review）
任务卡: docs/ops/tasks/C8-item-use-mechanisms.md
当前状态: review；Codex 已 accept，Kimi / GLM pending，done 仍 blocked。
你的职责: 只读审查统一用途执行器、schema 边界、消费提交时机与 PAL 267/268/270 clean 等价；不得直接修改实现文件或单方标 done。
必读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡全部，尤其「源真值更正」；该节优先于历史 R1：土灵珠只有祭坛 e4285→s227，十个 0x94 是条件守卫，0x50 是淡出，181/风灵珠与手绢链不属于土灵珠，非祭坛才走 teleportOut。
已完成证据: 100 usable=80 runnable+20 diagnostics；267 正式脚本 shared/user/pal-item-use/267 可反跳；268 ordered first-match；270 PAL_CLASSIC 资源池；四包与根 pnpm check 通过；migrate dry-run 0/0/0。
请输出: 在本卡 Review、done 前 Kimi 签字和交接日志写 accept，或写 counter 的具体文件/语义/测试理由；若有返工只列必须项。不要修改历史设计签字。
```

### 给 GLM

```text
接手任务: C8 物品用途机制、运行时与迁移闭环（数据/覆盖/测试 review）
任务卡: docs/ops/tasks/C8-item-use-mechanisms.md
当前状态: review；Codex 已 accept，Kimi / GLM pending，done 仍 blocked。
你的职责: 只读复核迁移总账、三个 oracle、effect×context 测试矩阵、诊断来源和 MG2 零计划；不得直接修改实现文件或单方标 done。
必读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡全部与「源真值更正」、packages/migrate/src/migrate-content.test.ts、pal-migration-integration.test.ts、packages/reforge/src/item-use-executor.test.ts。
冻结口径: 纯表 79+21；最终 PAL 80+20；20=4 unsupported-command+16 story-script。历史 71+29 是设计阶段事实，不追溯改写。
请输出: 在本卡 Review、done 前 GLM 签字和交接日志写 accept，或写 counter 的具体漏项/测试证据；重点核对 267/268/270 deep oracle、正式脚本 metadata、diagnostic source 与独立 dry-run 0/0/0。
```
