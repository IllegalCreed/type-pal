# C8 - 物品用途机制、运行时与迁移闭环

Status: done（2026-08-06 用户联合验收确认 + N3-1 下游回归 accept；三方 done accept 齐）
Phase: phase2
Capability: C8（物品用途与机制）/ MG2
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Codex + User
Unavailable Agents: none（Kimi 额度已于 2026-07-26 恢复）
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
- 2026-07-26：用户确认剩余 **20 件确实没有迁移完成**，批准重新启动迁移；旧
  `80 runnable + 20 diagnostics = 100` 只是缺口总账，不再视为完成口径。C8-R2 的最终硬门槛改为
  **100 件 usable 全部有可运行用途、0 条物品用途迁移诊断**。本批可以并入 N3-1 当前 canonical v5
  候选继续返工，不必等待旧候选先标 done；但 C8-R2 修改会重置 N3-1 的 GLM 最终审查基线。
- 2026-07-26：Kimi 额度耗尽；沿用用户“合成一个都让 GLM 审核”的代班裁决，由 GLM 合并承担
  C8-R2 的 schema/save/runtime/canonical augmentation/MG2/测试审查。历史 Kimi 签字按事实保留，
  本批不等待补审；GLM 当前设计签字仍不可省略。
- 2026-07-26：用户确认 Kimi 额度恢复，并询问是否恢复审查。C8-R2 同时触碰 schema、save、
  runtime、canonical migration 与 MG2，恢复 Kimi 架构审查；上一条缺席豁免仅作为历史记录，
  不再用于本批 build 准入。Kimi 与 GLM 均须对 R2 设计签 `agree`。
- 既有裁决：机制道具必须抽象为通用机制 + 参数，道具数据引用机制，禁止写死 PAL 物品 id。

## 范围

- 范围内:
  - 在能力地图拟新增 C8“物品用途与机制”；三方设计签字后再更新能力地图正文，完成前保持引擎/编辑器非 ✅。
  - 审计 `ItemUseEffect` 在大世界、战斗和菜单中的消费矩阵，消灭“schema 可写但运行时静默忽略”的类型。
  - 为场景出口/入口动作、配方转换、计数资源炼化、稳定脚本引用建立 clean、通用、可校验的数据表达。
  - 物品使用执行统一返回结构化结果（世界变化、是否消耗、表现/场景动作、失败原因、菜单去向），不再由菜单层用 `some(kind)` 逐件拦截。
  - 迁移器按脚本语义/形状翻译用途；PAL 267/268/270 只是验收 oracle，不作为运行时或 schema 分支条件。
  - 100 件原版 `usable` 物品必须全部生成可运行的 `use`；物品用途迁移诊断必须归零，不得再把显式诊断计作迁移完成。
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
  - `docs/ops/archive/tasks/done/MG2-incremental-migration-merge.md`：真实写盘走 pure generation + 三方合并 + 二次零计划。
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
  - `docs/phase2/archive/audits/n-dialog-text-audit.md:122-149`：紫金葫芦结果使用独立 item-box 表现，reforge 尚有缺口。
  - `docs/phase2/archive/plans/equipment-foundation-plan.md:52-110`：土灵珠双重身份已是既定模型，不得改回互斥物品类型。
  - `docs/phase2/archive/audits/editor-authoring-closure-audit-2026-07-13.md`：七环要求 schema、消费方、编辑、保存与删除闭环同时成立。
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

## C8-R2 当前返工设计与门禁（2026-07-26）

本节取代下方 C8-R1 的 `80 runnable + 20 diagnostics` 完成口径。下方旧设计、Build、Review 和
三方签字继续作为历史事实保留，但不能授权本批实现，也不能作为本批 done 证据。

### 真实基线与冻结清单

- 当前 PAL：234 件物品；源数据 100 件 `flags.usable`；最终 canonical 工程只有 80 件可运行
  `use`，另有 20 条物品用途迁移诊断。
- 通用机制 4 件：90 驱魔香、91 十里香、137 无影毒、150 金蚕王。
- 面向场景对象触发剧情（legacy `0x81`）14 件：
  260 圣灵珠、263 风灵珠、264 雷灵珠、271 布包、272 桂花酒、273 紫金丹、279 破天锤、
  284 钓竿、286 六神丹、287 情书、288 玉佩、289 石钥匙、291 香蕉、292 凤纹手绢。
- 在队伍前方放置场景对象（legacy `0x84`）2 件：285 捕兽夹、294 芦苇漂。
- 额外发现：137 无影毒的 `scriptOnThrow=39499` 也未完整迁移。只补它的 `use` 虽能清掉
  20 条用途诊断之一，却不能声称“无影毒已迁完”；因此 R2 必须同时补齐其投掷语义。

### 设计冻结候选（待 GLM 签字）

1. **四件通用机制按 opcode/参数形状迁移，不按物品 id 特判**
   - `0x62[600]` / `0x63[600]` →
     `modifyHostileAwareness { rangeMultiplier: 0|3, durationMs: 60000 }`。这是追逐感知范围系数，
     不是移动速度。后使用者覆盖前一个；仅在大世界逻辑拍计时，战斗期间暂停。
   - `WorldState.hostileAwareness?: { rangeMultiplier; remainingMs }` 随存档保存；缺字段等于默认
     系数 1。保存离散剩余时间，不保存绝对时钟；跨场景与保存/读取后继续生效。
   - `0x5A` → `scaleCurrentHp { numerator: 1, denominator: 2 }`，向下取整，1 HP 可变 0，
     不伪装成中毒。大世界与战斗使用同一通用效果。
   - `0x8D[1]` → `levelUp { levels: 1 }`。抽取可注入 RNG 的通用成长函数；等级封顶 99，
     但 99 级仍执行一次属性成长；七项属性按 SDL/PAL 公式成长并封顶 999，经验清零，不回满
     HP/MP、不立即学习技能、不触发战后升级界面。
   - 无影毒投掷的 `0x42[24] + 0x5B[1000]` →
     `currentHpDamage { numerator: 1, denominator: 2, bonus: 1, cap: 1000 }`，伤害为
     `min(1000, floor(enemy.hp / 2) + 1)`；不得误做普通毒伤或走巫抗。
   - 通用效果在战斗中造成的永久变更必须带回世界：金蚕王只掷一次成长 delta，并在胜、败、逃
     三条退出路径写回；写回发生在胜利经验结算前。遇敌香状态写回世界且战斗期间不扣时。

2. **14 件剧情用途成为物品私有脚本，继续复用统一脚本编辑器**
   - 在冻结的 P7 canonical 投影完成后增加独立、确定性的 C8 canonical augmentation：
     从权威 `scriptOnUse` 根与 legacy command graph 生成 author body，直接写入该物品唯一的
     `itemPrivateScript(use)`。
   - 不回灌 v4 `runScript`，不重新制造 `shared/user/pal-item-use/*` 伪共享脚本，也不复制一套
     “物品脚本编辑器”；物品页仍通过 N3-1 的统一 `CanonicalScriptBodyEditorV5` 编辑内联正文。
   - 12 件现有 full translator 可零缺口生成：260、264、271、272、273、279、286、287、288、
     289、291、292。263 需先用 canonical `currentScene` 条件承接 legacy `0x95`；284 需补齐
     sprite 259 `static / 27 帧` 的布局证据后生成，禁止猜测。
   - 这类依赖当前场景实体的用途显式限定为 world context；编辑器与菜单必须在战斗上下文
     fail-loud/不展示，不能让战斗执行器静默吞掉。

3. **两件放置用途使用结构化通用 effect**
   - legacy `0x84` →
     `placeEntityInFront { target: EntityAddress, state: 2, unavailableMessage }`；
     285 指向 `s048/e797`，294 指向 `s213/e3606`。
   - host 负责校验目标属于当前场景、队伍前方落点与障碍，并返回明确成败；成功才更新实体坐标/
     状态并消耗，失败显示“此处无法放置”、不改变世界也不消耗。
   - 不把它伪装成返回 `void` 的脚本命令；否则统一用途执行器无法按放置成败决定事务提交。

4. **不改写已发布的 N3-1 历史控制账**
   - `_transitions/script-v4-v5.json`、compatibility sidecar 和 P7 的 6-item golden 保持 immutable。
   - 新增 append-only `_transitions/c8-item-use-v5-v1.json`，绑定既有 P7 ledger digest、20 个
     源根、canonical target identity/digest 与生成器版本；MG2 每次从权威提取结果重建并验签。
   - C8 augmentation 属于 P7 后的 canonical 生成层；不得把历史 full ledger 重签，也不得手改
     `projects/pal` 或 baseline。

### C8-R2 验收硬门禁

- 源 `usable` ID 集合与目标有可运行 `use` 的 ID 集合严格相等，均为 100；不是只比数量。
- `migration-diagnostics.json` 中 `target.domain=item && capability=use` 必须为 0；用途诊断本身
  即写前失败，不再允许 `use || diagnostic` 二选一。
- 20 件逐 ID deep oracle；四类通用机制用任意测试 item id 验证，防止 PAL id 特判；137 的
  `throw` 也必须存在并有战斗 oracle。
- 14 个 item-private 正文不得残留 legacy/raw opcode、legacy call/jump、共享脚本桥壳或悬空
  EntityAddress；失败分支、物品消费和动态 trigger script 选择必须与源语义一致。
- `placeEntityInFront` 覆盖错场景、受阻、成功坐标/状态与失败不消费；两件物品分别做集成 oracle。
- 遇敌香覆盖/到期/跨场景/存读档/战斗暂停；金蚕王固定 RNG 上下界、99 级成长、经验清零、
  不回血回蓝/不学技能，以及胜/败/逃持久回写；无影毒 HP 奇偶值与投掷 1000 cap。
- 编辑器中 20 件全部显示可使用；14 件私有脚本使用统一编辑器且保存重开不丢；四种通用效果和
  放置效果使用中文名称/参数表单；问题面板不再出现物品用途待迁移。
- MG2 首跑精确审 plan，`--write` 后内建二跑和独立 dry-run 均为
  `writes=0 deletes=0 conflicts=0`；baseline、工程、append-only C8 证据账与非托管文件闭合。
- 包级 `content/reforge/migrate/editor` 检查、根 `pnpm check` 和 PAL 运行时抽验全部通过后，
  才能进入 review。

### C8-R2 进入 build 前签字

| 席位 | 签字 | 日期 | 结论 |
|---|---|---|---|
| Codex | **agree** | 2026-07-26 | 同意以上通用 effect、world/save 状态、战斗持久回写、P7 后 canonical augmentation、结构化放置与 100/0 硬门禁；实现前不得再把显式诊断算完成。 |
| Kimi | **agree** | 2026-07-26 | 主审 schema/save/runtime、战斗持久回写、P7 后 canonical augmentation、immutable ledger 边界与 0x84 事务；逐项核过源语义与代码锚点，无 counter，附 R1-R8 必落风险钉（见「Kimi C8-R2 架构审查」）。 |
| GLM | **agree（合并代审）** | 2026-07-26 | 独立核对 20 件源数据（usable ID + scriptOnUse/Throw 全匹配）、4 件通用机制 opcode 映射（0x62/0x63/0x5A/0x8D/0x42+0x5B）、14 件剧情 itemPrivateScript augmentation、2 件 placeEntityInFront 目标实体（s048/e797 + s213/e3606 已验证存在）、137 throw=39499 含 0x5B[1000] cap、immutable P7 ledger + append-only C8 证据账分层、100 runnable/0 diagnostics 硬门禁。见「GLM C8-R2 合并代审」。 |

- 当前准入结论：**build allowed（2026-07-26；Codex / Kimi / GLM 三方 agree，无 counter）**。
  build 必须同时落实 GLM 的 G1-G5 与 Kimi 的 R1-R8 必落钉。
- C8-R2 实现一旦开始，N3-1 的 GLM 最终审查基线必须从 `5b6bb58e` 更新为包含 C8-R2 的候选；
  N3-1、C8、ED-5I 均不能沿用旧候选直接标 done。

### GLM C8-R2 合并代审（2026-07-26）

**方法**：只读设计审查，不改实现文件。独立核对 20 件源数据 + 当前 PAL canonical 状态 + opcode 映射 +
目标实体存在性 + ledger 分层设计。

#### 重点 1：14 件剧情用途 P7 后 canonical itemPrivateScript augmentation ✅

GLM 独立核对源数据：14 件全部 `flags.usable=true`，`scriptOnUse` 地址与设计清单逐条匹配。

| itemId / name | scriptOnUse | 特殊处理 |
|---|---|---|
| 260 圣灵珠 | 39768 | — |
| 263 风灵珠 | 39781 | 需 canonical `currentScene` 条件承接 legacy `0x95` |
| 264 雷灵珠 | 39787 | — |
| 271 布包 | 39715 | — |
| 272 桂花酒 | 39647 | — |
| 273 紫金丹 | 39644 | — |
| 279 破天锤 | 39632 | — |
| 284 钓竿 | 39651 | 需补齐 sprite 259 `static/27 帧` 布局证据后生成，禁止猜测 |
| 286 六神丹 | 39660 | — |
| 287 情书 | 39722 | — |
| 288 玉佩 | 39742 | — |
| 289 石钥匙 | 39749 | — |
| 291 香蕉 | 39757 | — |
| 292 凤纹手绢 | 39831 | — |

**设计正确**：P7 后 augmentation 从权威 `scriptOnUse` 根与 legacy command graph 生成 author body，
直接写入 `itemPrivateScript(use)`，不回灌 `runScript` 或伪共享脚本。统一编辑器复用 N3-1 的
`CanonicalScriptBodyEditorV5`，不另造物品脚本编辑器。

**G1 必落**：263 的 `0x95` 和 284 的 sprite 259 布局证据必须在 build 时按实际源数据生成，
不能猜测或跳过。

#### 重点 2：2 件 placeEntityInFront 成功/失败及消费事务 ✅

- 285 捕兽夹 → `s048/e797`（GLM 确认实体存在：sprite-268，非 zone）
- 294 芦苇漂 → `s213/e3606`（GLM 确认实体存在：sprite-84，非 zone）
- 设计正确：`placeEntityInFront { target: EntityAddress, state: 2, unavailableMessage }` 是
  结构化通用 effect（不是脚本命令）；host 校验目标属于当前场景 + 队伍前方落点 + 障碍；
  成功才更新实体坐标/状态并消耗，失败显示"此处无法放置"且不改变世界不消耗。
- **G2 必落**：统一用途执行器必须按放置成败决定事务提交——不把 placeEntityInFront 伪装成
  返回 void 的脚本命令。

#### 重点 3：遇敌香存档状态 + 金蚕王战斗持久回写 ✅

- **90 驱魔香 0x62[600]** → `modifyHostileAwareness { rangeMultiplier: 0, durationMs: 60000 }`
  （暂停追逐；`WorldState.hostileAwareness` 随存档；保存离散剩余时间不保存绝对时钟；跨场景/存读档继续）
- **91 十里香 0x63[600]** → `modifyHostileAwareness { rangeMultiplier: 3, durationMs: 60000 }`
  （加速追逐；后使用者覆盖前一个）
- **150 金蚕王 0x8D[1]** → `levelUp { levels: 1 }`（99 级仍执行成长；属性按 SDL/PAL 公式封顶 999；
  经验清零、不回满 HP/MP、不学技能、不触发升级界面）
- **战斗持久回写**：通用效果在战斗中造成的永久变更必须带回世界；金蚕王只掷一次成长 delta，
  在胜/败/逃三条退出路径写回；写回发生在胜利经验结算前。遇敌香状态写回世界且战斗期间不扣时。
- **G3 必落**：胜/败/逃三路径写回必须覆盖金蚕王 delta；遇敌香战斗期间不扣时 + 写回世界。

#### 重点 4：无影毒 use 与 throw ✅

- **137 无影毒 use 0x5A** → `scaleCurrentHp { numerator: 1, denominator: 2 }`
  （向下取整，1 HP 可变 0，不伪装中毒；大世界与战斗同一通用效果）
- **137 无影毒 throw 0x42[24] + 0x5B[1000]**（scriptOnThrow=39499）
  → `currentHpDamage { numerator: 1, denominator: 2, bonus: 1, cap: 1000 }`
  （伤害 `min(1000, floor(enemy.hp / 2) + 1)`；GLM 验证 L_39499 含 opcode 91 (0x5B) operands [1000,0,0] = cap 1000）
- **G4 必落**：137 的 throw 必须存在并有战斗 oracle；只补 use 不补 throw 不能声称"无影毒已迁完"。

#### 重点 5：immutable P7 ledger + append-only C8 证据账 ✅

- P7 `_transitions/script-v4-v5.json` + compatibility sidecar + 6-item golden 保持 **immutable**
- 新增 `_transitions/c8-item-use-v5-v1.json`（append-only），绑定：
  - 既有 P7 ledger digest（锚定 immutable 历史）
  - 20 个源根（scriptOnUse/Throw 地址）
  - canonical target identity/digest（itemPrivateScript/placeEntityInFront/通用 effect）
  - 生成器版本
- MG2 每次从权威提取结果重建并验签；C8 augmentation 属于 P7 后 canonical 生成层
- **G5 必落**：不得重签历史 full ledger；不得手改 projects/pal 或 baseline。

#### 重点 6：100 runnable / 0 diagnostics 硬门禁 ✅

- 当前 PAL：100 usable = 80 runnable + 20 diagnostics（GLM 独立确认：80 with use, 20 without use）
- 20 条 item-use diagnostics 全部有明确分类（4 unsupported-command + 16 story-script）
- C8-R2 硬门禁：完成后 `source usable ID set === target runnable use ID set`（严格 ID 相等，非数量）
  + `migration-diagnostics.json` 中 `target.domain=item && capability=use` 必须为 **0**
- **用途诊断本身即写前失败**，不再允许 `use || diagnostic` 二选一——这是比 R1 的 `80+20=100` 更严格
  的完成口径。

#### GLM 必落项汇总

| # | 必落项 | 风险 |
|---|---|---|
| G1 | 263 `0x95` currentScene 条件 + 284 sprite 259 布局证据按实际源数据生成 | 中——猜测会引入错误 |
| G2 | placeEntityInFront 是结构化 effect 非脚本命令，事务按成败提交 | 高——伪装成 void 会丢事务语义 |
| G3 | 金蚕王三路径写回 + 遇敌香战斗不扣时 | 高——漏路径丢永久成长 |
| G4 | 137 throw 必须同时迁移并有 oracle | 中——只补 use 不完整 |
| G5 | P7 ledger immutable，C8 只 append-only | 高——重签会破坏 N3-1 历史 |

#### 结论

**GLM C8-R2 合并代审 agree**。20 件源数据逐条对账成立；4 件通用机制 opcode 映射精确；
14 件剧情 augmentation 设计正确（P7 后 canonical itemPrivateScript，统一编辑器）；2 件放置用途
结构化 effect + 事务语义完整；137 throw 独立确认（0x5B[1000] cap）；immutable P7 ledger + append-only
C8 证据账分层正确；100/0 硬门禁比 R1 更严格。G1-G5 必落项明确。

**build 准入**：blocked on Kimi design agree（Kimi 额度已恢复，应独立审 schema/save/runtime）。
GLM agree 后等待 Kimi；两方 agree 后 Codex 可开始实现。

### Kimi C8-R2 架构审查（2026-07-26）

**方法**：只读架构审查，不改实现文件。独立核对 sdlpal 源语义、content/reforge/migrate 代码锚点、
N3-1 immutable 约束与提取数据，并对 schema/save/runtime/ledger 做压力测试。

#### 源语义逐项核对（全部与冻结设计一致）

- **137 无影毒**：use = `0x5A`（script.c:1887 `rgwHP /= 2`，整除向下取整）→ `scaleCurrentHp{1/2}` ✓；
  throw = `0x42[24]`（模拟法术动画，纯表现）+ `0x5B[1000]`（script.c:1895 `w = HP/2+1; cap op0`）
  → `currentHpDamage{1/2, bonus:1, cap:1000}` ✓。当前 items.json 中 137 的 use 与 throw **双双缺失**，
  R2 同补 throw 的口径成立。
- **150 金蚕王**：`0x8D[1]` → `PAL_PlayerLevelUp`（global.c:2347-2409）实证：level clamp 99 但属性
  仍按次数成长 ✓；七项属性 999 封顶 ✓；经验清零（`:2406-2408`）✓；**不回满 HP/MP**（回满只在战后
  经验升级循环 battle.c:1115-1116）✓；不学技能（学习在 battle.c:1300-1321）✓。冻结设计五条逐条成立。
- **90/91 遇敌香**：`0x62/0x63[600]`（script.c:1967-1975）直接赋值 `wChaseRange=0|3` +
  `wChasespeedChangeCycles=600`；感知判定是**乘数**（script.c:393 `wChaseRange*32*gpGlobals->wChaseRange`）
  且 0 时整段不追（script.c:341）→ `rangeMultiplier` 语义 ✓；后使用覆盖前者=直接赋值 ✓；
  按逻辑帧递减、到期归 1（play.c:235-237），战斗期间 GameUpdate 不跑 → "战斗中暂停"与原版一致 ✓。
- **0x84 放置**：script.c:2473-2509 与 `placeEntityInFront` 冻结逐条吻合——校验目标属当前场景、
  算队前格、查障碍，成功设坐标 + `sState=op1(=2)`，失败跳 op2 且 `g_fScriptSuccess=FALSE`（不消耗）✓。
  目标实体在提取数据核实存在：798 → s048/e797、3607 → s213/e3606 ✓。

#### 架构边界核对

- **itemPrivateScript 承载成立**：`ItemPrivateScriptV5{id:'use'}` schema 已存在且 v5 context 表强制
  world-only（item-v5.ts:5-14, :41），与"剧情用途显式限定 world context、战斗 fail-loud"一致；
  P7 已闭合的同形状 6 件（265/266/267/280/290/293）证明该管线可用。
- **统一执行器可承载放置事务**：`executeWorldItemUse`（item-use-executor.ts:41-85）的外部效果
  模型（content 纯规划 + host 执行 + 全部成功后才 `completeExternalWorldItemUse` 提交消耗）已有
  `runSceneHook` 布尔成败先例；`placeEntityInFront` 按同模式加 host 布尔返回即可，不需要新事务框架。
- **append-only C8 账不触碰 P7 immutable**：N3-1:2804"控制账是 generator-owned immutable input"；
  P7 的 6-item golden 与 ledger digest 只消费 P7 shadow 重建产物（p7-project.test.ts:41、
  p7-shadow.ts:569-582），不读 projects/pal——post-P7 augmentation 写物品文件不会使既有校验变红；
  `assertPublishedTransition`/`verifyDigestRecord`（p7-mg2.ts:24-59）的验签模式可镜像复用，
  baseline `_state.json` 的 `transitions: Record<string,string>` 无需 schema 变更即可加 C8 键。
- **save 兼容成立**：`hostileAwareness` 走 WorldState 可选字段 + 读取端 `??` 缺省（`collectValue`
  先例，character.ts:31-32），IndexedDB 结构化克隆存储，不需 bump SAVE_VERSION。
- **通用性成立**：四类机制参数（rangeMultiplier/durationMs、分数、cap、levels、EntityAddress、
  奖励表）全部来自物品数据，运行时零 PAL id 分支；验收用任意测试 item id 做 oracle 的口径正确；
  迁移侧只允许形状识别 + 显式映射表，产物为 clean 数据。

#### 数据勘误（不 reopen GLM agree，build 前采用更正值）

- GLM 审查节 :233/:234 写「e797 = sprite-268」「e3606 = sprite-84」。Kimi 直查提取数据：
  源对象 798 `spriteNum=343`（scene/48.json）、3607 `spriteNum=0` 且 `sState=2`（隐藏锚点，
  scene/213.json）。实体存在性（承重结论）成立，sprite 引用号以本勘误为准。

#### 必落风险钉（R，build 验收核对，不阻塞签字）

- **R1 战斗→世界永久回写通道必须通用化**：这是引擎首个战斗内永久变更回写（现状
  permanentStatBoost 因"战斗临时态没有持久写回通道"被限 world-only，item.ts:211-213、
  battle-core.ts:1375-1385）。实现必须是战斗态携带通用 pending 回写队列（非 itemId 特判），
  战中掷一次成长 delta 存战斗态、三退出路径复用同一 delta，在统一收口段（main.ts:2416-2432）
  写回且**早于胜利结算**（buildSettlement main.ts:2348-2381）。注意败路径默认 gameOver 读最近档
  （main.ts:3114-3116）：oracle 钉"写回发生在 gameOver 流程之前"，不得断言读档后世界里仍保留，
  也不得在重载存档上二次施加。
- **R2 遇敌香状态必须随存档，且这是原版一致行为**：sdlpal 的 `SAVEDGAME_COMMON` 明确包含
  `wChaseRange/wChasespeedChangeCycles`（global.c:470-486），读档在 global.c:614-615 恢复，
  写档在 global.c:758-759 保存。倒计时必须挂在 `tickHostiles` 的 guard 同层
  （main.ts:3060-3092，战斗/对话/菜单期不推进）按 dt 扣减；**不得**挂 timers 线
  （战斗期间照走，main.ts:4312-4336）。
- **R3 rangeMultiplier 作用域必须拍板**：原版乘数同时作用于明雷怪感知与脚本侧
  `PAL_MonsterChasePlayer`（script.c:393）；reforge 剧情追逐 `chasePlayer` 是独立链路
  （script-runner.ts:46、main.ts:1351）。build 须在卡内写明遇敌香是否影响剧情追逐——建议只作用
  明雷怪（插点 main.ts:3075）并记录偏离，或抽共享感知判定层；不许静默只实现一半。
- **R4 augmentation 挂点与 digest 对象**：只能在 `buildP7GeneratedCanonical` 生成 items.json
  之后做 snapshot 级后处理（p7-generated.ts:70 之后），**严禁**侵入 `projectP7CanonicalProject`、
  P6 IR 或 p7-shadow 管线——否则 6-item golden 与 `canonicalScriptProjectDigest` 全红。C8 账的
  canonical target digest 必须针对 augmentation 后的 generated theirs，**不得** digest
  projects/pal 的 ours（作者手改会导致验签漂移误爆）。C8 账享受 P7 ledger 同待遇：从三方合并
  摘除、generated 禁含、只验签 clone；首次 seal 需显式注入 baseline `_state.json` transitions
  （p7-mg2.ts:112 目前 verbatim clone base metadata）。
- **R5 `currentScene` 条件是 schema 变更**：v4 `ScriptCondition` 与 v5 `AuthorConditionV5` 目前
  都无此变体（script.ts:33-50、script-v5.ts:84-99）；host 已有 `currentSceneId()`
  （script-project-v5.ts:39）。build 前在卡内拍板双侧同加还是 v5-only；运行时求值必须
  fail-loud，不得在缺 host 能力时静默 false。
- **R6 284 sprite 259 证据缺口维持硬阻塞**：27 帧物理真值已核实（259.rle 严格解码 = 27 帧），
  但 `static` 布局 overlay 条目仍缺（migrate-content.ts:2071 会抛"禁止从脚本资源号猜布局"）。
  无 overlay 条目不得生成 284 的 use；不得用猜测布局绕过。
- **R7 throw 通道扩展保持单一真源**：`currentHpDamage` 需同时扩 `itemUseEffectSupportsContext`
  与 `performThrow`（battle-core.ts:1496-1554，现仅 applyPoison 过 throw 上下文）；context 表
  仍是唯一裁决处，assertNever 穷尽兜底不得删。`0x42[24]` 是表现 outcome，不是第二个效果；
  137 的上下文矩阵（use=world+battle、throw=throw-only）进测试。
- **R8 12 件"零缺口"目前只有间接证据**：16 个 story 根从未进入 v4→v5 翻译管线（P2-P6 IR 中
  0 命中），现有把握来自 opcode 覆盖推断 + 同形状 6 件已闭合。R2 的 20-ID deep oracle 必须落成
  直接证据（正文无 legacy opcode/悬空 EntityAddress、失败分支与消费语义与源一致），不得以
  "同形状"推断替代逐件验收。

#### 结论

**Kimi agree**。七项重点（14 件 augmentation、2 件放置事务、遇敌香存档、金蚕王三路径回写、
无影毒 use+throw、append-only C8 账、运行时零 PAL id 特判）逐项核对成立，无 schema/save/runtime/
ledger 级反例；R1-R8 为 build 必落钉。

#### Codex 签后源证据更正（2026-07-26）

- Kimi 原始 R2 记录曾写“sdlpal 未保存遇敌香状态”，并引用仓库中不存在的 `savegame.c`。
  Codex 在进入 build 前复核 `reference/sdlpal/global.c:470-486,614-615,758-759`，确认原版存档
  **明确保存并恢复** `wChaseRange/wChasespeedChangeCycles`；上方 R2 已按源证据更正。
- 该更正不改变 `WorldState.hostileAwareness` 随存档、战斗/菜单期间暂停计时的冻结方案，也不
  推翻 Kimi `agree`；它移除了“有意偏离原版”的错误风险描述。review 时以本更正后的 R2 验收。

## C8-R2 Build 收口（2026-07-26）

- 最终实现候选：`0d4aa48b`（`fix(editor): make reference jumps visible`），父提交
  `88277465`（`feat(phase2): close C8 item-use migration`）包含 C8-R2 数据、迁移、运行时与
  私有脚本编辑闭环。
- Coding Owner：Codex；实现期间没有第二位 Agent 修改实现文件。
- 当前结论：C8-R2 的 build 与最终审查硬门禁均已满足，任务仍保持 `review`。Codex、Kimi、
  GLM 已对最终候选 `0d4aa48b` 全部签 `accept`；但按用户裁决，N3-1 完成与联合验收前仍不得
  标记 `done`。

### 实现结果

- **通用能力与运行时**：
  - 新增并接通 `modifyHostileAwareness`、`scaleCurrentHp`、`levelUp`、
    `currentHpDamage`、`placeEntityInFront`；effect context 表仍是唯一上下文真源，运行时没有
    PAL item id 特判。
  - 遇敌香状态以可选 `WorldState.hostileAwareness` 保存离散剩余时长；只在大世界敌人逻辑拍
    递减，战斗/菜单/对话期间暂停，后使用者覆盖前者。
  - 金蚕王使用通用 battle → world pending writeback；成长 delta 只掷一次，胜/败/逃统一写回，
    胜利路径早于经验结算，败路径早于 game-over 载档。
  - `placeEntityInFront` 抽为独立 host 事务；错场景、受阻均不改世界且不消费，成功才写坐标/
    状态并消费。PAL 285 → `s048/e797,state=2`，294 → `s213/e3606,state=2`。
  - 无影毒 137 同时补齐 use 与 throw；投掷死亡目标会重选存活目标，外部脚本先消费物品时不会
    被统一提交层误判失败，private-first 混合效果会在执行脚本前完成全链 preflight。
- **canonical migration / MG2**：
  - 新增 P7 后的 C8 augmentation：14 件新增剧情用途直接生成唯一
    `itemPrivateScript(use)`，复用统一 canonical v5 编辑器；加上 P7 已有 6 件，最终 PAL 中
    `itemPrivateScript` 用途共 20 件。
  - C8 冻结账覆盖 20 件物品、21 个源根（额外根为 137 throw）；逐 ID deep oracle 覆盖
    4 件通用机制、14 件剧情用途、2 件放置用途及 137 投掷。
  - 新增 append-only `_transitions/c8-item-use-v5-v1.json`；测试钉死发布记录 digest
    `fbdbd50f5e47b924c8bf4dcfb0700d5b08a04afa0d3cc2bff0711b4b9da627a3`。
  - 历史 P7 full ledger 与 baseline/project compatibility sidecar 字节不变：
    ledger SHA-256 `41263ba1fa216af014bf8b880405a587938be38938449f77ccec84ed40da6b12`，
    两份 sidecar SHA-256 均为
    `30ce8717aa9f6f21e14d862cde2aa44dff8f3652833826b4506e49bc7a6a2ed0`。
  - 真实写盘后独立 dry-run：
    `writes=0 deletes=0 conflicts=0`、`generated=0 kept=1 merged=223`；
    写前门禁 `scenes=294 pages=3616 shared=0 legacy-scripts=0`。
- **编辑器闭环**：
  - 物品私有脚本没有另造编辑器；仍由
    `CanonicalScriptBodyEditorV5` / `ItemUseEffectEditor` 共用脚本组件。
  - 现有私有脚本支持新增、删除、排序、双击编辑、undo/redo 与保存重开；history 只保存 item
    shell，active canonical projection 随历史同步，避免删除后残留 ghost reference。
  - Playwright 实测 290 天书：新增第二个效果时私有脚本正文保留且不再出现“外部脚本必须唯一”
    的伪诊断；删除私有脚本效果后正文退出活动投影；undo 可恢复原正文与顺序。浏览器未保存，
    没有污染工程文件。

### 引用跳转可感知性返工（`0d4aa48b`）

- **用户验收反例**：物品 289“石钥匙”的“引用 2”中，“打开位置”点击后看起来没有任何反应；
  同页物品私有脚本引用尤其像无效按钮。
- **根因与修复**：
  - 引用 locator 与回调接线本身有效，但同页跳转没有成功提示，目标行只有很弱的常驻选中态；
    所有 canonical 引用成功后现在统一显示包含场景/实体/方案/步骤/正文/指令序号的“已定位到”
    状态，并对目标指令行播放可重复触发的蓝色定位脉冲。
  - 跨场景引用还有一个真实滚动缺陷：指令编辑器安排下一帧 `scrollIntoView/focus` 后，外层布局
    测量重渲染会取消该帧，同时 revision 已被记为完成，目标虽已选中却仍留在屏幕外。现在以
    当前 revision 守卫异步定位，不再由无关重渲染取消；过期请求会自行失效。
  - 连续点击同一条引用会递增 focus revision，并在两组等价动画名间切换，保证第二次点击仍有
    明确反馈；`prefers-reduced-motion` 下保留静态高亮边框。
- **覆盖**：
  - 新增 App 真实接缝测试，覆盖物品同页引用与场景跨页引用的路由、owner/behavior/stage/command
    精确选择、成功提示和连续点击；
  - Workspace、ItemTab 与统一正文编辑器分别覆盖 locator 映射、revision 传播、滚动/聚焦，以及
    “外层先重渲染、下一帧才执行”回归。

### 最终验证证据

- PAL 产品账实测：
  `{"runnable":100,"privateCount":20,"itemUseDiagnostics":0,"items":234}`；
  源 `usable` ID 集与目标 runnable use ID 集严格相等，均为 100。
- 聚焦回归：
  - content 最终 347 tests；
  - reforge 最终 607 tests；
  - editor 最终 761 tests；
  - C8 20-ID deep golden 单文件 6/6；
  - C8 augmentation + MG2 两个测试文件 20/20；P7 ledger 隔离复跑 1/1。
- 根 `pnpm check` 最终通过：shared 121、content 347、reforge 607、pal-extract 246、
  game 2289、editor 761、migrate 432 passed + 1 历史 skip；随后 Biome 检查 957 files，
  无修复项。
- 真实浏览器运行时烟测：6051 加载重迁 PAL，直达 `s048` 的 `e797` 附近，场景渲染、菜单与
  “物品 → 使用”入口正常，console 3 info / 0 error / 0 warning。dev 初始库存为空，因此没有
  在该次烟测中真实消耗 R2 物品；放置、成长、追逐范围、投掷与 private/mixed-chain 的消费事务
  由上述 content/reforge 集成测试覆盖。
- 最终 editor delta：`pnpm --filter @type-pal/editor check` 为 **91 files / 766 tests passed**
  且 typecheck 通过；7 个变更文件 Biome 与 `git diff --check` 全绿。
- Playwright 精确反跳：
  - 场景引用定位到 `s047/e760` 交互脚本正文第 24 条，活动 path=`23`，目标行滚入可视区，
    编辑区 `scrollTop=1150`，并显示完整“已定位到”状态；
  - 物品 289 自引用连续点击两次均定位到使用脚本第 4 条，活动 path=`3`，定位脉冲
    `odd → even` 重新播放；console **0 error / 0 warning**。

### C8-R2 进入 done 前签字

| 席位 | 签字 | 日期 | 结论 |
|---|---|---|---|
| Codex | **accept** | 2026-07-26 | 最终候选 `0d4aa48b`（父 `88277465`）完成 100/0、20-ID deep oracle、统一私有脚本编辑闭环、P7 immutable + C8 append-only seal，并补齐引用跳转成功提示、可重复定位脉冲与跨场景真实滚动；editor 91/766、Playwright 场景/物品精确反跳及 console 0/0 通过。 |
| Kimi | **accept** | 2026-07-26 | 只读终审通过（父候选 `88277465` + editor delta `0d4aa48b`）：R1-R8 逐钉核实、事务/seal 抽查、100/0 与 dry-run 独立复算、P7 ledger/sidecar 哈希实测不变、运行时零 PAL id 特判；migrate 超时定性为 CPU 争用（限流复跑 33/33 绿）。证据与记录项见「Kimi C8-R2 done 审查」。 |
| GLM | **accept（含 editor delta）** | 2026-07-26 | 已对父候选 `88277465` 的 100/0、20 件、C8 seal/MG2、content/reforge/editor 核心矩阵签 `accept`（证据完整保留在下节）；最终候选 `0d4aa48b` 的 editor 引用导航 delta 独立补审通过——同页重复定位（revision 奇偶 class）、场景跨页精确定位（scene+entity+drawer+command path）、目标滚入可视区（scrollIntoView center）、重渲染竞态（rAF revision guard 不取消帧）、reduced-motion（media query animation:none）五项逐项成立；editor 91 files / 766 tests passed，reference-navigation 25/25 isolated pass。 |

- 当前 done 准入：**done allowed（2026-08-06）**——三方 done accept 齐（Codex/Kimi/GLM
  含 editor delta）；N3-1 终态 + 下游回归 accept（GLM/Kimi/Codex A-D，覆盖 267/268/270
  用途、canonical 脚本选择不反跳、引用闭包/删除守卫/保存重开、MG2 零计划、运行时金丝雀）；
  用户确认性验收通过。

### GLM C8-R2 core done 前复审（`88277465`，2026-07-26）

**方法**：只读终审，不改实现文件。独立核对 canonical PAL 100/0 闭合 + 20 件逐项 + C8 seal/MG2 + 全包 check。

#### 100/0 严格闭合 ✅

GLM 独立验证（`projects/pal/content/items.json` vs `data/extracted/data/items.json`）：

| 口径 | 结果 |
|---|---|
| source usable ID 集合 | 100 件 |
| target runnable use ID 集合 | 100 件 |
| **严格 ID 相等** | ✅ `[...usableIds].sort() === [...useIds].sort()` |
| item-use diagnostics | **0** |
| missing（有 usable 无 use） | **(none)** |

#### 20 件逐项核对 ✅

- **4 件通用机制**：90 驱魔香 + 91 十里香（modifyHostileAwareness）+ 137 无影毒（scaleCurrentHp）+ 150 金蚕王（levelUp）
- **14 件剧情用途**：260/263/264/271/272/273/279/284/286/287/288/289/291/292 全部 `itemPrivateScript(use)`
- **2 件放置用途**：285 捕兽夹（placeEntityInFront→s048/e797/state=2）+ 294 芦苇漂（placeEntityInFront→s213/e3606/state=2）
- **137 throw**：`currentHpDamage { numerator:1, denominator:2, bonus:1, cap:1000 }` 独立确认存在
- **20 itemPrivateScript**：P7 已有 6 件（265/266/267/280/290/293）+ C8 新增 14 件 = 20

#### C8 seal + P7 immutable ✅

- C8 append-only seal `c8-item-use-v5-v1.json`：20 items + parent P7 ledger digest `9b01dea8…` + seal digest `fbdbd50f…`
- P7 `_transitions/script-v4-v5.json` immutable（C8 parent 引用其 digest，不修改）
- MG2 dry-run：`writes=0 / deletes=0 / conflicts=0, generated=0/kept=1/merged=223`
- 写前门禁：`scenes=294 pages=3616 shared=0 legacy-scripts=0`

#### 独立复跑全绿

| 包 | 卡内冻结 | GLM 复跑 | 结论 |
|---|---|---|---|
| content | 347 | **28 files / 347 passed** | ✅ |
| reforge | 607 | **67 files / 607 passed** | ✅ |
| editor | 761 | **90 files / 761 passed** | ✅ |
| migrate | 432+1skip | 全量并行有 flaky timeout（P2-P7 shadow tests I/O 压力） | ⚠️ 非正确性 |
| C8 augmentation+MG2 | 20 | **20/20 isolated pass** | ✅ |
| P7 ledger | 18/18 | **1/1 isolated pass（63s）** | ✅ |
| MG2 dry-run | 0/0/0 | **0/0/0** | ✅ |

**flaky timeout 说明**：全量并行 migrate 测试中，P2-P7 shadow tests 每个需要重跑完整迁移管线（60-370s），
并行 I/O 压力下超 120s 默认 timeout。隔离复跑全部通过。这不是正确性问题——建议 Codex 把 shadow PAL
tests 的 timeout 统一设为 300s 或用 `--maxWorkers=1` 跑。

#### G1-G5 必落项核对

| 必落项 | 状态 | 证据 |
|---|---|---|
| G1: 263 `0x95` + 284 sprite 259 | ✅ | augmentation 测试覆盖 `seals sprite 259 with its physical static layout` |
| G2: placeEntityInFront 结构化 effect + 事务 | ✅ | 285/294 目标实体确认 + 错场景/受阻不消费 |
| G3: 金蚕王三路径写回 + 遇敌香战斗不扣时 | ✅ | reforge 607 tests 含 battle writeback |
| G4: 137 throw 同时迁移 | ✅ | `currentHpDamage` throw 独立确认 |
| G5: P7 immutable + C8 append-only | ✅ | C8 seal parent 引用 P7 digest，P7 字节不变 |

#### 结论

**GLM C8-R2 done 前 accept**。100/0 严格 ID 闭合、20 件逐项核对、C8 seal/MG2 0/0/0、G1-G5 全部落地。
全量并行 migrate flaky timeout 是 I/O 压力问题非正确性。无 counter/rework。
该结论审查的是父候选 `88277465`；随后提交 `0d4aa48b` 只修改 editor 引用导航与测试，因此核心
数据/迁移/运行时 accept 继续保留，但最终候选的 GLM 席位回到 `pending（editor delta）`。
**done 准入 blocked on GLM editor delta accept + N3-1/用户联合验收（Kimi 已 accept）。**

### Kimi C8-R2 done 审查（2026-07-26）

**方法**：只读终审，不改实现文件。三路独立代码审查（reforge 运行时 / migrate augmentation 与 seal /
content schema 与 save）+ 关键代码点一手抽查 + 独立复算与复跑。审查对象为父候选 `88277465`，
并覆盖 `88277465..0d4aa48b` 的 editor 引用导航 delta。

#### R1-R8 逐钉核对（全部落地）

| 钉 | 结论 | 证据 |
|---|---|---|
| R1 金蚕王通用 writeback | ✅ | `BattleWorldMutation` 判别联合（battle-core.ts:114-124）+ `pendingWorldMutations`（:230），mutation 带 characterId/delta **无 itemId**；战中 `applyLevelGrowth` 只掷一次（rewards.ts:44-72）；幂等写回 `writeBackPersistentEffects`（battle-session.ts:2001-2025）；胜路径 main.ts:2385 早于经验结算 :2398，败/逃 main.ts:2453 在 gameOver 载档流程之前；oracle 未断言读档后保留。机制通用，不是只为 levelUp 开口子。 |
| R2 遇敌香 | ✅ | 倒计时在 `tickHostiles` guard 内按 dt 扣（main.ts:3096-3104），不挂 timers 线；倍率乘入 :3120；后使用覆盖前者=直接赋值。R2 前提更正：sdlpal `SAVEDGAME_COMMON`（global.c:485-486）本就保存 `wChaseRange/wChasespeedChangeCycles`（我设计审时 grep savegame.c 不全），随存档=原版一致行为，卡内已记录更正。 |
| R3 作用域拍板 | ✅ | main.ts:3119 注释明确感知香只影响引擎明雷追逐，剧情 chasePlayer 不受污染。 |
| R4 augmentation 挂点 | ✅ | `augmentC8ItemUsesAfterP7`（c8-item-use-augmentation.ts:761）只在克隆 snapshot 上操作；挂点 p7-generated.ts:88 严格在 items.json 落盘（:80）后，`project` 原样透传；6-item golden（p7-project.test.ts:41、p7-shadow.ts:574）未动且有反向 pin 测试；seal digest 针对 generated theirs（augmentation.ts:713-746）。 |
| R5 currentScene | ✅ | v4（script.ts:36-37）+ v5（script-v5.ts:87）双侧同加；求值 fail-loud（script-runner.ts:224-228、script-world-v5.ts:595-599，缺查询直接 throw）；263 产物已实际使用 `{"kind":"currentScene","scene":"s178"}`。 |
| R6 sprite 259 | ✅ | overlay 条目 pal-world-sprite-layouts.ts:34-38（static/27 帧/证据 `all.json:L_9952;L_9954..L_10020`）；冲突即 throw + 测试钉死。 |
| R7 throw 通道 | ✅ | context 表唯一真源（item.ts:227-263，assertNever 兜底）；performThrow `min(cap, trunc(hp*num/den)+bonus)`（battle-core.ts:1615-1622）；0x42[24] 仅为 `ThrowSpec.presentation`（item.ts:278-279），非第二效果。 |
| R8 20-ID deep oracle | ✅ | c8-item-use-augmentation.test.ts 逐件 golden sha256 + 结构性断言（无 legacyRaw/runScript/callScript/jumpScript、EntityAddress 全解析、失败分支与消费语义）；285/294 另钉 s048/e797、s213/e3606、state=2。 |

#### 事务与 seal 抽查

- **placeEntityInFront 事务**：错场景/受阻 `planItemEntityPlacement` 返回 undefined（item-use-placement.ts:18-25）→ 结构化失败 `consumed:false`（item-use-executor.ts:201-220），不改世界不消费；成功才写坐标/状态并由 `completeExternalWorldItemUse` 统一提交。
- **混合链**：`executeMixedItemPrivateUse` 先全链 preflight 再跑脚本（item-use-executor.ts:79-94）；`consumedByExternal`（item.ts:1144-1150）保证外部脚本先消费时不误判失败。当前 PAL 数据无混合链，该路径为防御性能力，有测试覆盖。
- **C8 append-only seal**：绑定 P7 ledger digest `9b01dea8…`、20 件/21 根、generated theirs 的 target digest、生成器版本；每次 MG2 重建并验签，漂移/篡改/重签即 throw（c8-item-use-mg2.ts:102-110、:122-203、:282-284）；三方合并前摘除、generated/project 禁含、首次 seal 显式注入（:239-305）；`_state.json` 双键 digest 与卡一致。
- **P7 immutable 实测**：`script-v4-v5.json` SHA-256 `41263ba1…`、两份 sidecar `30ce8717…`，与卡冻结值一致，字节未变。

#### 独立复算与复跑

- 产品账独立复算：源 `flags.usable` 100 件 == baseline runnable `use` 100 件（**ID 集严格相等**）；item/use 诊断 0（总诊断也为 0）；`itemPrivateScript` 共 20 件。
- 独立 dry-run（`tsx scripts/migrate-content.mts`）：`writes=0 deletes=0 conflicts=0`、`generated=0 kept=1 merged=223`、写前门禁 `scenes=294 pages=3616 shared=0 legacy-scripts=0`，与卡一致。
- 包级复跑：content / reforge / editor（含 delta，766/766）通过；migrate 全量在默认并行下多次出现重 PAL 重建测试**超时**（P2-P6 shadow、MG2 空计划回归，全部 `Test timed out`，无一条断言失败）——当时机器 load avg 7.8-20.4（11 核，Chrome 129% CPU 等）；以 `--maxWorkers=2` 复跑全部 7 个超时文件 **33 passed / 1 skipped**，其中 MG2 严格空计划 80s 通过。结论：环境 CPU 争用，非代码回归；GLM 复审结论相同。C8 两个测试文件单跑 20/20 通过。
- 运行时 PAL id 特判 grep（reforge/content 非测试源码，90/91/137/150/260-294 等字面量）：无按物品 id 分支。

#### editor delta（`0d4aa48b`）

纯表现层：`App.tsx` 复用既有 workspaceNotice 报告"已定位到：…"，`CanonicalScriptEditorV5.tsx` 按
focusRevision 奇偶交替重放定位脉冲，CSS + 352/80/57/115 行测试。不触碰数据流、schema、迁移与
运行时；editor check 766/766 通过。架构干净，无反例。

#### 记录项（不阻塞 accept）

1. `writeBackPersistentEffects` 的 switch（battle-session.ts:2004-2024）无 assertNever 兜底：未来新增
   `BattleWorldMutation` kind 漏接写回时编译期不报错。建议后续补穷尽守卫（小改）。
2. 混合链边界：私有脚本消耗最后一件物品后，后续纯效果段 preflight 会报 not-owned 而脚本副作用已落地；
   现数据无此链，属已记录的防御性边界。
3. 卡内原“C8 seal / P7 immutable / final-target MG2 guards 18/18”口径已由收口方更正为
   C8 augmentation + MG2 两文件 20/20、P7 ledger 隔离 1/1，不影响实质。
4. validate.ts 新 5 种效果只有正向覆盖（真实数据经 validateItems 兜住），缺 rangeMultiplier=1、cap=0
   等负向单测与专门 round-trip 测试；低风险。
5. migrate 重型 PAL 重建测试对 CPU 争用敏感：复跑方遇超时先用 `--maxWorkers=2` 再判失败。

#### 结论

**Kimi accept**。schema/save 兼容、通用 battle writeback、placeEntityInFront 与混合链事务、
post-P7 augmentation、P7 immutable/C8 append-only seal、运行时零 PAL id 特判逐项核实成立，
R1-R8 全部落地，无 counter/rework。未修改实现文件。

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
- 100 件 `flags.usable` 的源 ID 集合与目标可运行 `use` ID 集合严格相等；物品用途迁移诊断为 0。
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

## C8-R1 历史推进签字（已被 C8-R2 取代）

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

- 2026-07-24 历史结论: N3-1 未完成前不能按 R1 口径验收 C8。
- 2026-07-26 历史结论: **review**。最终候选 `0d4aa48b`（父 `88277465`）已达到 100 件
  usable 全部可运行、0 条物品用途迁移诊断，并补齐无影毒投掷、物品私有脚本新增/删除/撤销
  闭环，以及引用反跳成功提示、可重复高亮和跨场景精确滚动。
- 用户结论: **accept（2026-08-06，联合验收）**。N3-1 通过后，用户确认 C8 与 ED-5I 联合
  回归验收通过；与卡头状态及提交 `e70987d6` 一致。
- 后续任务: 无。C8 已 `done`，不再等待 N3-1；能力地图由 OPS-MAP-1 同步。

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
- 2026-07-26 User: 确认剩余 20 件“确实没有迁移完成”，批准开始迁移；R1 的
  `80 runnable + 20 diagnostics` 不再是完成口径。Evidence: 当前用户裁决、C8-R2 真实基线。
  Next: Codex 冻结 14 剧情 + 2 放置 + 4 通用机制方案，交 GLM 合并设计审查。
- 2026-07-26 Codex: 完成源数据、SDL/PAL、N3 canonical 投影、save/runtime 与现有门禁的只读审计；
  冻结 C8-R2 候选：14 item-private canonical augmentation、2 个结构化放置 effect、4 个通用
  use effect、无影毒 throw、遇敌香存档状态、金蚕王战斗持久回写，以及 immutable P7 ledger
  之外的 append-only C8 证据账。Kimi 因额度耗尽由 GLM 合并代审。未修改实现文件。
  Next: GLM 只读设计审查并签 `agree/counter`；`agree` 前不得进入 build。
- 2026-07-26 User: 通知 Kimi 额度恢复，并提出恢复其审查。Evidence: 当前用户消息。
  Next: C8-R2 撤销当前 build 准入中的缺席豁免，恢复 Kimi + GLM 双审。
- 2026-07-26 Codex: 已把 Kimi 恢复为 R2 架构主审，GLM 回归数据/覆盖/测试矩阵主审；两方均
  `agree` 前不得进入 build。此前额度耗尽与 GLM 合并代审记录按历史事实保留。
- 2026-07-26 Kimi: 完成 C8-R2 只读架构审查，签 **agree**，附 R1-R8 必落风险钉（见「Kimi C8-R2
  架构审查」）。逐项核对 sdlpal 源语义：137 use(0x5A)/throw(0x42[24]+0x5B[1000]) 与
  script.c:1887/1630/1895 一致且当前双双缺失；150 `PAL_PlayerLevelUp`(global.c:2347-2409)
  实证冻结设计五条全成立；90/91 乘数语义（script.c:1967-1975/:393）与战斗中暂停（play.c:235）
  成立；0x84 事务语义（script.c:2473-2509）与 placeEntityInFront 冻结逐条吻合；itemPrivateScript
  v5 schema（item-v5.ts:5-14）与 executor 外部效果事务（item-use-executor.ts:41-85）可承载设计；
  append-only C8 账不触碰 P7 immutable 控制账（N3-1:2804、p7-mg2.ts:24-59）。最大新架构面是首个
  战斗→世界永久回写通道，必须通用化（R1）。数据勘误一处：GLM 节 :233/:234 的 sprite 号
  （e797=343、e3606=0，非 268/84），实体存在性成立，build 以更正值为准。未修改实现文件。
  Next: GLM 已先行 agree，三方设计签齐，build 准入改 allowed；Codex 按 G1-G5 + R1-R8 开始实现。
- 2026-07-26 Codex: 复核三方设计签均为 `agree`、无 counter，C8-R2 正式转 `build`。进入实现前
  更正 Kimi R2 的单一源事实错误：sdlpal `global.c:470-486,614-615,758-759` 明确保存并恢复
  `wChaseRange/wChasespeedChangeCycles`，所以遇敌香随存档是原版一致行为，不是设计偏离。
  Evidence:「Codex 签后源证据更正」。Next: Codex 作为唯一 Coding Owner 实施 G1-G5 + R1-R8。
- 2026-07-26 Codex: 完成 C8-R2 上游实现、真实重迁与编辑器闭环，提交候选 `88277465`；
  最终 PAL 为 100 runnable / 0 item-use diagnostics，20 件/21 根 deep oracle、P7 immutable、
  append-only C8 seal、独立 dry-run 0/0/0、根 `pnpm check`、290 天书私有脚本新增/删除/撤销
  浏览器实测及 6051 PAL 烟测均通过，Codex 签 **accept**，任务转 `review`。
  Next: Kimi + GLM 分别只读终审并签 `accept/counter`；不得自行标 done。
- 2026-07-26 GLM: 对候选 `88277465` 完成 C8-R2 核心只读终审并签 **accept**：独立确认
  100/0 严格闭合、20 件/21 根、P7 immutable + C8 append-only seal、MG2 0/0/0、G1-G5 与
  content/reforge/editor 核心矩阵；全量 migrate 并行 timeout 隔离复跑通过。Evidence:
  「GLM C8-R2 core done 前复审」。Next: Kimi final review + N3-1/用户联合验收。
- 2026-07-26 User: 报告物品 289“石钥匙”的引用“打开位置”点击后没有可感知反应。
  Evidence: 物品工作台截图，右栏同时包含场景引用和物品私有脚本自引用。
- 2026-07-26 Codex: 复现并修复引用反跳的两层缺陷，提交最终候选 `0d4aa48b`：同页成功跳转
  现在显示完整定位状态并播放可重复脉冲；跨场景定位不再被布局重渲染取消下一帧滚动。新增
  App 真实接缝及 Workspace/ItemTab/统一正文编辑器回归；editor 91 files / 766 tests +
  typecheck、Biome/diff 全绿；Playwright 实测场景 path 23 与物品 path 3 精确可见，console
  0 error / 0 warning。GLM 对 `88277465` 的核心 accept 按事实保留，但最终候选席位重置为
  `pending（editor delta）`。Next: Kimi 完整终审，GLM 只读补审 editor delta。
- 2026-07-26 Kimi: 完成 C8-R2 最终只读终审（父候选 `88277465` + editor delta `0d4aa48b`），
  签 **accept**。R1-R8 逐钉核实成立；placeEntityInFront/混合链/consumedByExternal 事务边界、
  post-P7 挂点（p7-generated.ts:88 严格后置、project 未污染）、C8 seal append-only 验签与
  generated-theirs digest、运行时零 PAL id 特判均一手抽查或三路独立审查确认。独立复算
  100/0（ID 集严格相等、诊断 0、privateScript 20 件）、dry-run 0/0/0、P7 ledger `41263ba1…`
  与 sidecar `30ce8717…` 字节不变；editor check 766/766。migrate 全量超时定性为 CPU 争用
  （load avg 7.8-20.4/11 核；`--maxWorkers=2` 复跑 7 个超时文件 33/33 绿，MG2 空计划 80s 通过），
  非代码回归。记录项 5 条（writeback switch 缺 assertNever 等，不阻塞）见「Kimi C8-R2 done 审查」。
  未修改实现文件。Next: GLM 只读补审 editor delta；其后 N3-1/用户联合验收，不得提前标 done。
- 2026-07-26 GLM: 对 `88277465..0d4aa48b` editor 引用导航 delta 补审签 **accept**：
  同页重复定位、场景跨页 scene/entity/drawer/command 精确传播、目标滚入可视区、rAF revision
  guard 重渲染竞态与 reduced-motion 五项成立；editor 91 files / 766 tests、聚焦回归 25/25。
  父候选 core accept 继续有效。Next: C8 三方最终 accept 已齐，保持 `review` 等待
  N3-1/用户联合验收。

## 下一位 Agent 提示词

无下一位 Agent 提示词；C8 三方最终 `accept` 已齐，当前等待 N3-1 完成与用户联合验收。下方
Kimi / GLM 提示词均只保留为历史交接证据，勿再执行。

### 给 Kimi（C8-R2 最终架构 / 运行时审查）——已于 2026-07-26 执行，签 accept（保留备查，勿再执行）

```text
接手任务：C8-R2 最终架构 / 运行时只读审查
任务卡：docs/ops/archive/tasks/done/C8-item-use-mechanisms.md
当前状态：review；最终实现候选 0d4aa48b，父候选 88277465；Codex accept，Kimi pending；
GLM 已 accept 父候选核心、最终 editor delta pending。你是 Kimi 架构主审，不得修改实现文件，
不得单方标 done。

必须先读：
- AGENTS.md、docs/phase2/READ-FIRST.md
- 本卡「C8-R2 当前返工设计与门禁」「Kimi C8-R2 架构审查」R1-R8、
  「C8-R2 Build 收口」
- docs/ops/archive/tasks/done/N3-1-script-control-flow-modernization.md 的 P7 immutable ledger 约束、
  docs/ops/archive/tasks/done/MG2-incremental-migration-merge.md

重点核对：
1. schema/context 表与 save 兼容；遇敌香只在大世界逻辑拍递减。
2. 金蚕王通用 pending writeback 是否胜/败/逃复用同一 delta，顺序是否正确。
3. placeEntityInFront、private-first mixed chain、外部脚本消费与死亡投掷目标的事务边界。
4. post-P7 augmentation 是否只 digest generated theirs；P7 ledger/sidecar 是否真正 immutable；
   C8 seal 是否 append-only。
5. 运行时是否完全没有 PAL item id 特判；currentScene / throw / private script 是否 fail-loud。
6. 只读检查 `88277465..0d4aa48b`：物品同页与场景跨页引用是否都显示明确成功反馈、精确选中并
   把目标指令滚入可视区；连续点击同一引用是否重新反馈；外层重渲染不得再次取消待执行滚动。

请输出并写回任务卡：
- 无反例则在「C8-R2 进入 done 前签字」Kimi 行签 accept（日期、证据、复跑命令），并在交接日志
  写结论；
- 有问题则签 counter，列出具体文件/语义/测试反例，任务转 rework；
- 不得修改 R1 或 GLM 父候选历史签字，不得标记 done。GLM 仍须对 editor delta 补签 accept。
```

### 给 GLM（C8-R2 最终 editor delta 补审）——已于 2026-07-26 执行，签 accept（保留备查，勿再执行）

```text
接手任务：C8-R2 最终 editor 引用导航 delta 只读补审
任务卡：docs/ops/archive/tasks/done/C8-item-use-mechanisms.md
当前状态：review；最终实现候选 0d4aa48b，父候选 88277465。你已对父候选的 100/0、20 件、
C8 seal/MG2 和核心测试签 accept；该历史证据继续有效。最终候选仅新增 editor delta，你的最终
签字为 pending。不得修改实现文件，不得单方标 done。

必须先读：
- AGENTS.md、docs/phase2/READ-FIRST.md
- 本卡「C8-R2 Build 收口」「引用跳转可感知性返工」「GLM C8-R2 core done 前复审」
- `git diff 88277465..0d4aa48b -- packages/editor`
- packages/editor/src/ui/App.reference-navigation.test.tsx
- packages/editor/src/ui/CanonicalScriptEditorV5.tsx 及其测试
- packages/editor/src/ui/CanonicalSceneScriptWorkspaceV5.test.tsx
- packages/editor/src/ui/ItemTab.test.tsx

重点核对：
1. App 成功分支是否统一使用 typed locator 描述“已定位到”，失败分支是否仍 fail-closed。
2. 物品私有脚本自引用是否即使 URL 不变也递增 revision、精确选中 command path，并让连续点击
   重新显示定位反馈。
3. 场景引用是否精确传播 scene/entity/owner/behavior/stage/command，切页后目标真正滚入可视区。
4. `requestAnimationFrame` revision guard 是否能抵抗外层布局重渲染，同时阻止过期请求误聚焦。
5. 动效是否不改变 canonical 数据/undo 历史；reduced-motion 下是否仍有静态可见反馈。
6. 独立复跑 editor check，并确认该 editor-only delta 没有改变你已验收的 100/0、C8 seal/MG2
   与 P7 immutable 证据。

请输出并写回任务卡：
- 无漏项则在「C8-R2 进入 done 前签字」GLM 行把 `pending（editor delta）` 改为 accept，写明
  父候选核心 accept 继续有效及本次 delta 复跑证据，并在交接日志写结论；
- 有问题则签 counter，列出具体文件/locator/交互/测试反例，任务转 rework；
- 不得重写父候选 GLM 审查原文，不得标记 done。Kimi 已独立 accept（2026-07-26，覆盖父候选 +
  本 delta）；你 accept 后仅剩 N3-1/用户联合验收。
```

### 已执行的审查提示词（保留备查，勿再执行）

### 给 Kimi（C8-R2 schema + save + runtime + canonical migration 架构审查）——已于 2026-07-26 执行，签 agree

```text
接手任务：C8-R2 剩余 20 件物品用途迁移架构设计审查
任务卡：docs/ops/archive/tasks/done/C8-item-use-mechanisms.md
当前状态：rework；Codex agree，Kimi pending，GLM pending。你的额度已恢复；此前缺席豁免仅作
历史记录，不再用于 build 准入。Kimi 与 GLM 均 agree 前不得开始实现。

必须先读：
- AGENTS.md
- docs/phase2/READ-FIRST.md
- docs/ops/archive/tasks/done/C8-item-use-mechanisms.md，重点是「C8-R2 当前返工设计与门禁」
- docs/ops/archive/tasks/done/N3-1-script-control-flow-modernization.md 的 P7 发布后 immutable ledger 约束
- docs/ops/archive/tasks/done/MG2-incremental-migration-merge.md
- packages/content/src/item.ts、item-v5.ts、rewards.ts、character.ts
- packages/reforge/src/item-use-executor.ts、battle/battle-core.ts、main.ts、save/*
- packages/migrate/src/migrate-content.ts、migration-validate.ts、
  experimental/script-v5/p7-generated.ts、p7-mg2.ts、p7-project.ts

冻结事实：
1. 当前 100 usable = 80 runnable use + 20 item/use diagnostics；最终必须是 100/0。
2. 20 件 = 4 通用（90/91/137/150）+ 14 个 0x81 剧情用途
   （260/263/264/271/272/273/279/284/286/287/288/289/291/292）
   + 2 个 0x84 放置用途（285/294）。
3. 137 的 throw 也未完成，必须一并补。
4. 14 件拟走 P7 后 canonical itemPrivateScript augmentation；不得重造共享脚本或改写已发布
   P7 full ledger、sidecar、6-item 历史 golden。
5. 两个 0x84 拟走 host 返回成败的 placeEntityInFront effect；失败不改变世界、不消耗。
6. 90/91 拟使用随存档的 60 秒追逐感知范围状态；150 战斗内成长必须在胜/败/逃写回且不
   重掷 RNG；137 use/throw 是 HP 比例效果，不是毒状态。

你的职责：
- 只读压力测试 schema 公共接口、save 兼容、战斗持久回写、P7 后 augmentation 边界、
  currentScene canonical 条件、0x84 事务和 append-only C8 证据账。
- 重点判断该方案是否真正 generic、是否破坏 N3/P7 immutable transition、不允许运行时
  PAL item id 特判，以及是否存在更小且闭合的架构。
- 不得修改实现文件，不得沿用 R1 accept，不得把 diagnostics 计作完成。

请输出并写回任务卡：
- 同意则把 C8-R2 Kimi 行签为 `agree（日期）`，写明核过的架构边界与必落风险钉；
- 不同意则签 `counter`，列出具体 schema/save/runtime/ledger 反例，保持 rework；
- 更新交接日志并给 GLM 或 Codex 下一步提示词。只有 Kimi 与 GLM 都 agree 才可把 build
  准入改为 allowed。不得标记 done。
```

### 给 GLM（C8-R2 数据覆盖 + MG2 + 测试矩阵设计审查）——已于 2026-07-26 执行，签 agree（合并代审）

```text
接手任务：C8-R2 剩余 20 件物品用途迁移设计审查
任务卡：docs/ops/archive/tasks/done/C8-item-use-mechanisms.md
当前状态：rework；Codex agree，Kimi pending，GLM pending。Kimi 额度已经恢复，负责架构审查；
你负责数据覆盖、MG2 与测试矩阵。Kimi 与 GLM 均 agree 前不得开始实现。

必须先读：
- AGENTS.md
- docs/phase2/READ-FIRST.md
- docs/ops/archive/tasks/done/C8-item-use-mechanisms.md，重点是 C8-R2 当前节；下方 R1 的 80+20
  签字只作历史，不能当本批准入
- docs/ops/archive/tasks/done/N3-1-script-control-flow-modernization.md 的 P7 发布后 immutable ledger 约束
- docs/ops/archive/tasks/done/MG2-incremental-migration-merge.md
- packages/content/src/item.ts、item-v5.ts、rewards.ts、character.ts
- packages/reforge/src/item-use-executor.ts、battle/battle-core.ts、main.ts、save/*
- packages/migrate/src/migrate-content.ts、migration-validate.ts、
  experimental/script-v5/p7-generated.ts、p7-mg2.ts、p7-project.ts

冻结事实：
1. 当前 100 usable = 80 runnable use + 20 item/use diagnostics；最终目标必须是 100/0。
2. 20 件 = 4 通用（90/91/137/150）+ 14 个 0x81 剧情用途
   （260/263/264/271/272/273/279/284/286/287/288/289/291/292）
   + 2 个 0x84 放置用途（285/294）。
3. 137 的 throw 也未完成，必须一并补，否则不能声称无影毒迁完。
4. 14 件走 P7 后 canonical itemPrivateScript augmentation；不能新造共享脚本，也不能改写
   已发布 P7 full ledger、sidecar 或 P7 的 6-item 历史 golden。
5. 两个 0x84 走 host 可返回成败的通用 placeEntityInFront effect；失败不消耗。
6. 90/91 是 60 秒追逐感知范围系数 0/3 且随存档；137 use 是 HP 向下减半；
   150 是 PAL_PlayerLevelUp 精确成长；137 throw 是 min(1000,floor(HP/2)+1) 即时伤害。

你的职责：
- 只读核对 20 件源根/名称/分类、逐件 oracle、无影毒 throw、append-only C8 证据账、
  100/0 写前门禁、MG2 和测试矩阵；同时指出任何会让覆盖账失真的 schema/runtime 问题。
- 特别判断：是否同意新增 currentScene canonical 条件、post-P7 augmentation 的输入/输出边界、
  遇敌香 remainingMs 持久化、金蚕王胜/败/逃写回与胜利经验结算顺序。
- 不得修改实现文件，不得沿用 R1 accept，不得把 diagnostics 计作完成。

请输出并写回任务卡：
- 同意则把 C8-R2 GLM 行改为 `agree（日期）`，写明核过的数据边界与必落测试；只有 Kimi
  与 GLM 均 agree 才把 build 准入改为 allowed；或
- 签 `counter`，列出具体源语义、schema、事务、ledger 或测试反例，保持 rework。
- 更新交接日志，并给 Codex 一段可直接复制的实现提示词。不得标记 done。
```

## 历史 Agent 提示词（N3-1 依赖裁决前，勿再执行）

### 给 Kimi

```text
接手任务: C8 物品用途机制、运行时与迁移闭环（架构/运行时 review）
任务卡: docs/ops/archive/tasks/done/C8-item-use-mechanisms.md
当前状态: review；Codex 已 accept，Kimi / GLM pending，done 仍 blocked。
你的职责: 只读审查统一用途执行器、schema 边界、消费提交时机与 PAL 267/268/270 clean 等价；不得直接修改实现文件或单方标 done。
必读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡全部，尤其「源真值更正」；该节优先于历史 R1：土灵珠只有祭坛 e4285→s227，十个 0x94 是条件守卫，0x50 是淡出，181/风灵珠与手绢链不属于土灵珠，非祭坛才走 teleportOut。
已完成证据: 100 usable=80 runnable+20 diagnostics；267 正式脚本 shared/user/pal-item-use/267 可反跳；268 ordered first-match；270 PAL_CLASSIC 资源池；四包与根 pnpm check 通过；migrate dry-run 0/0/0。
请输出: 在本卡 Review、done 前 Kimi 签字和交接日志写 accept，或写 counter 的具体文件/语义/测试理由；若有返工只列必须项。不要修改历史设计签字。
```

### 给 GLM

```text
接手任务: C8 物品用途机制、运行时与迁移闭环（数据/覆盖/测试 review）
任务卡: docs/ops/archive/tasks/done/C8-item-use-mechanisms.md
当前状态: review；Codex 已 accept，Kimi / GLM pending，done 仍 blocked。
你的职责: 只读复核迁移总账、三个 oracle、effect×context 测试矩阵、诊断来源和 MG2 零计划；不得直接修改实现文件或单方标 done。
必读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡全部与「源真值更正」、packages/migrate/src/migrate-content.test.ts、pal-migration-integration.test.ts、packages/reforge/src/item-use-executor.test.ts。
冻结口径: 纯表 79+21；最终 PAL 80+20；20=4 unsupported-command+16 story-script。历史 71+29 是设计阶段事实，不追溯改写。
请输出: 在本卡 Review、done 前 GLM 签字和交接日志写 accept，或写 counter 的具体漏项/测试证据；重点核对 267/268/270 deep oracle、正式脚本 metadata、diagnostic source 与独立 dry-run 0/0/0。
```
