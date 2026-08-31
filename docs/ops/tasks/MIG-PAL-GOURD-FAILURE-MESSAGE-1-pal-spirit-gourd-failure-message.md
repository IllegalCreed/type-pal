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
  - premise: **verified（2026-08-31，独立直读 raw 命令、sdlpal else 与解释器返回规则、一阶段 port、
    producer、共享臂入边与 current 数据，非复述 Codex/GLM；与 GLM 证据各自独立取得后收敛）**：
    1. **命令与跳转实锤（本人直读）**:item270 源数据 `scriptOnUse=39713, applyToAll=true`
       （data/extracted/data/items.json:5437-5460）；L39713 恰为 `raw 0x34 operands [38780,0,0]`
       （data/extracted/events/all.json:261339-261352），线性后继恰为 `end`；sdlpal 0x34 在
       `wCollectValue > 0` 失败时走 `else { wScriptEntry = operand[0] - 1 }`
       （reference/sdlpal/script.c:1515-1518），解释器 `return wScriptEntry + 1`（script.c:3083）
       ——**collectValue==0 时精确落到 L38780**；L38780 恰为 `setDialogStyleNarration →
       showDialog(12538 "无任何效果") → end`（all.json:254503-254513）。
    2. **共享臂实锤（本人全扫）**:38780 的 operands 入边 18 处 + goto 入边 1 处 = **19 处**
       （与 GLM 独立一致）——L38780 确为多脚本共享的通用失败臂；卡面“不要求唯一入边、只依
       L39713 operand0 直接控制流、不修改共享臂、不从文本反推 owner”的边界**必要且正确**
       （CRAFT 卡的唯一入边证明在此不适用）。
    3. **一阶段实锤**:raw port 的 0x34 else 实现跳转 operand0（event-system.ts:4032-4055，
       `else(==0):jump op0`）；docs/phase1/game-mechanics.md:703 “灵葫值 = 0 时按一下没反应
       （`if (wCollectValue > 0)` 不成立）”与 else 跳转矛盾——**“没反应”确为陈旧误述，
       纠正为“跳共享失败臂显示‘无任何效果’”真实必要**。
    4. **根因实锤**:producer 的 pool 分支只凭 `useHead` 是 0x34 + Store0 rewards 构造
       `{kind, resource, maxRoll, rewards}`（migrate-content.ts:1554-1611），**从未读取
       `useHead.operands[0]`**；current item270 无 unavailableMessage（本人数据直读一致）；
       Reforge value<=0 已能透传 optional message，Editor 忠实显空——缺失唯一位于 migration
       producer。
    5. **替代解释排除**:“0 时静默”漏掉 else 的 `wScriptEntry = operand[0] - 1` 与解释器 +1
       返回规则；“operand0 不是失败地址”被 else 直读推翻；“L38780 不可达”被 L39713 直接控制流
       推翻；“schema/runtime 无法表达”被 optional field 与 value<=0 透传推翻。
    6. **可证伪观察**:0x34 else 不落 operand0（直读：落）；item270 使用前另有不可绕过的
       collectValue>0 guard（源脚本直读：无，0x34 即 use head）；L38780 文本不属于零灵葫值语境
       （共享臂语义直读：通用无效提示，operand0 控制流是唯一归属依据）——出现真反证本签字失效。
  - design: **agree（2026-08-31，附 KG1-KG6 必落钉；与 GLM GM-D1~D4 收敛互补）**：
    - **KG1（operand0 控制流驱动钉，同 GM-D2）**:failure 地址只从 0x34 operand0 直接读取；
      共享臂本体不改；禁止按文本内容反推 owner、禁止对 L38780 入边做唯一性断言（19 入边会假红）、
      禁止假设该臂为 0x34 专属。
    - **KG2（strict pool translator 边界钉，同 GM-D1）**:head=0x34 + Store0 reward 非空 +
      线性后继为 end + operand0 非零可解析 + 臂严格 `narration → showDialog(nonblank) → end`
      （trimmed 非空），任一不满足返回 undefined 走 pending，**不产缺 message 的半截 pool**；
      operand0=0 的恒成功形态不误伤；成功 0x34 行为与 item-box 不变；**craft translator 控制流/
      输出零改变，其聚焦测试保持绿**。
    - **KG3（generated message ownership 钉，同 GM-D3）**:craft+pool 接线按 item id + effect
      kind ordinal + 完整结构证据配对，**只覆盖 generated 明确提供的 message 叶**、保留作者其它
      字段；重复 id、owner 缺失、resource/maxRoll/rewards 漂移均 fail-loud；不得出现 item270
      分支或文案常量。
    - **KG4（invariant 扩展钉，同 GM-D3）**:item270 resource/maxRoll/rewards 九档序列零漂移 +
      `unavailableMessage === "无任何效果"`，补缺失/错误/首尾空白负例；落在 pal-store-boundary
      既有 assertSpiritGourd 家族（:74-101 实在），item268 文案与五配方零漂移，不扩写 Store0/
      CRAFT 两卡范围，不重开其签字。
    - **KG5（exact-diff 与双零钉，同 GM-D4）**：三文件允许集（current/baseline items.json +
      `_state.json` 该文件 hash）；managedFiles 与其余 hashes 不变；镜像；首次 `writes=1`；
      内部 replay 与独立第二次 plan 全零；永久 producer/ownership/invariant 留存，无转换器/
      upgrader。
    - **KG6（依赖与文档钉）**:Store0 / craft 两张 Depends On 未 done 前本卡不转 build；同 commit
      纠正 game-mechanics.md:703 为“0 时跳共享失败臂并显示‘无任何效果’”，不借机改写其它一阶段
      真值。
- GLM:
  - premise: **verified（2026-08-31，raw 控制流 / SDLPal else+解释器 / 一阶段 port / producer / current
    数据全部本人一手复算，非复述 Codex）**：
    1. **L39713 实锤**：item270 `scriptOnUse: 39713`（extracted items.json 直读）；L_39713 = raw
       opcode 52（0x34）operands **[38780, 0, 0]**，线性后继恰 `end`（本人逐命令打印）。
    2. **collectValue==0 跳转语义实锤**：`script.c:1514-1517` else 分支
       `wScriptEntry = pScript->rgwOperand[0] - 1`；解释器 `:3083 return wScriptEntry + 1`——
       (38780-1)+1 精确落 **L_38780**。一阶段 port `event-system.ts` 0x34 else
       `jumpToGlobalIp(gs, cursor, operands[0] ?? 0)`（本人直读）。「最强替代解释（if>0 所以 0 时
       静默）」被 else + 返回规则逐字排除。
    3. **L38780 失败臂实锤**：`setDialogStyleNarration` → `showDialog「无任何效果」(messageIndex
       12538)` → `end`——严格三元组。**共享臂事实**：本人扫描 38780 共 **19 处入边**（opcode
       6/100/129/56/52 与 goto）——卡面「共享通用失败臂、不要求唯一入边、只按 L39713 operand0 直接
       控制流读取」的范围纪律正确且必要。
    4. **producer 根因实锤**：`migrate-content.ts:1593-1610` `isResourcePool && poolRewards.length>0`
       分支只构造 `{kind, resource:'collectValue', maxRoll, rewards}`——**operand0 从未被读取**，
       无 message 路径。current item270 effect keys 恰 `[kind, resource, maxRoll, rewards]`（无
       message）；items current==baseline 镜像 True；Reforge 回退链
       `empty-resource-pool → '当前没有可用资源'`（main.ts:5440-5441 直读）——「before」状态与卡面
       一致。craft 卡已落地（item268 现含 `炼蛊的材料不足`），本卡 diff 基线即当前 HEAD。
    5. **既有 invariant 可扩展**：`pal-store-boundary.ts assertSpiritGourd`（Store0 卡产物）已锁
       item270 resource/maxRoll/九档镜像——本卡在其上扩展 message 断言属自然增量，不与已生效签字
       冲突。
  - design: **agree（2026-08-31，附 GM-D1~GM-D4 必落钉）**：
    - **GM-D1（translator 正负例矩阵钉）**：正例 = PAL 真链（head 0x34 + operand0 非零可解析 +
       线性后继 end + 严格三元组）→ 九档 pool + trimmed「无任何效果」；负例至少六条均
       undefined/pending 不产半截 effect：①operand0=0；②operand0 悬空（label 不可解析）；
       ③三元组文本空白；④缺 narration；⑤缺 end 或 head 与 end 间有额外命令；⑥poolRewards 空。
       **回归钉**：不得改变 craft translator 控制流/输出——craft 卡全部聚焦测试保持绿且零修改。
    - **GM-D2（共享臂纪律钉）**：failure-arm reader 只消费 L39713 operand0 的**直接控制流**，
       禁止对 L38780 入边做唯一性断言（现存 19 入边会假红）、禁止从文本反推 owner、禁止假设该臂
       为 0x34 专属——这是本卡与 craft 卡（唯一入边）的关键差异，必须落测试注释与负例。
    - **GM-D3（ownership 接线 + invariant 钉）**：generated message 配对按 item id + effect kind
       ordinal + 完整结构证据（resource/maxRoll/rewards 逐项相等）；只覆盖 message 叶、保留作者
       其它字段；重复 id / owner 缺失 / 结构漂移均 fail-loud；扩展 `assertSpiritGourd` 断言
       `unavailableMessage === '无任何效果'`，负例覆盖缺失/错误/首尾空白三种；item268 文案与五配方
       零漂移（craft 卡 invariant 不动）。
    - **GM-D4（exact diff / 幂等 / 文档钉）**：结构化 diff 允许集恰三文件；`_state.json` 仅
       `files["content/items.json"]` hash 变化、managedFiles 与其余 hash 零变化；current/baseline
       改后字节镜像；首跑 `writes=1 deletes=0 conflicts=0 asset-deletes=0`、事务恰三文件、内部
       replay 与独立第二次 plan 全零；`docs/phase1/game-mechanics.md` 紫金葫芦节 0 值行为纠正为
       「跳共享失败臂并显示无任何效果」（port 注释已是正确口径，文档对齐）；零灵葫值游戏用例登记
       集中 E2E。
  - 独立反证：①若 operand0 非失败地址而是成功续行（script.c else + 解释器 +1 已逐字排除）——
    前提失效；②若 item270 使用前存在不可绕过的 collectValue>0 guard（L_39713 即 use head、前无
    guard，已排除）——失败臂不可达；③若 current publication 接线无法按结构证据唯一配对 item270
    （全项目 pool owner 恰 1，已排除）——ownership 失效需重设计。
- 独立反证审查: GLM（2026-08-31，完成——0x34 else、解释器返回规则、L_39713 operand0、L_38780 三元
  组与 19 入边、producer 未读点、current 空值均本人直读）；Kimi（2026-08-31，完成——独立直读
  L39713 `[38780,0,0]` 与线性 end、sdlpal else + 解释器 +1 返回、L38780 三元组、19 入边共享事实
  （本人 operands+goto 全扫）、一阶段 port else-jump、producer 丢弃点与 game-mechanics.md:703 误述
  原文；可证伪观察见 Kimi 签节第 6 条；两席反证独立取得后收敛）。
- counter / 分歧: none（Kimi KG1-KG6 与 GLM GM-D1~D4 逐项收敛，无冲突）
- 缺签豁免: N/A
- build 准入结论: **签字面三签齐（2026-08-31，Codex + Kimi（KG1-KG6）+ GLM（GM-D1~D4），无 counter，
  两席非 Owner 独立反证完成）；但 Depends On 两卡（Store0 / craft）done 收口前本卡不得转 build，
  届时由 Codex 作为唯一 Coding Owner 开工并转 Status。**

### 进入 done 前：审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- 用户验收: pending
- done 准入结论: blocked

## Draft / Build / Review

- Draft：原版失败臂、producer 根因、current publication 接线与 exact-diff 方案已登记。
- Build：blocked；三方 premise/design 签字已齐，仍须等两张 Depends On done 后才能修改 migration/current publication。
- Review：pending。

## 用户验收

- 问题确认：2026-08-31 用户指出紫金葫芦“不可用提示”也为空。
- 实现验收：pending。

## 交接日志

- 2026-08-31 Kimi: 独立直读全部核验点——item270 scriptOnUse=39713/applyToAll、L39713
  `[38780,0,0]` 线性后继 end、sdlpal else `wScriptEntry=operand[0]-1` + 解释器 `return +1` 精确落
  L38780、L38780 严格三元组「无任何效果」、19 入边共享臂（本人 operands+goto 全扫与 GLM 独立
  一致）、一阶段 port else-jump、producer 未读 operand0、game-mechanics.md:703「没反应」误述原文。
  签 premise verified + design agree，附 KG1（operand0 控制流驱动、禁文本反推/禁唯一性断言）/
  KG2（strict pool translator 边界 + craft 回归零改动）/KG3（generated message ownership 只覆
  message 叶 + fail-loud）/KG4（assertSpiritGourd 扩展、item268 零漂移）/KG5（三文件 exact diff +
  双零 + 无转换器）/KG6（Depends On 未 done 不转 build + 文档纠正）。未修改实现，未代签 GLM。
  签字面三签齐；本卡 build 另需 Store0 与 craft 两卡 done 收口放行。
- 2026-08-31 GLM: 独立核验四要点全部闭合——L_39713 0x34 [38780,0,0] 线性后继 end；script.c else
  `wScriptEntry=operand[0]-1` + 解释器 `return +1` 精确落 L_38780（一阶段 port jumpToGlobalIp 同义）；
  L_38780 严格三元组「无任何效果」且为 19 入边共享臂（卡面按直接控制流限界的纪律正确）；producer
  :1593-1610 未读 operand0、current item270 无 message、Reforge 回退「当前没有可用资源」链直读。
  签 premise verified + design agree，附 GM-D1（六负例 + craft 回归钉）/GM-D2（共享臂纪律：禁唯一性
  断言/禁文本反推）/GM-D3（结构证据配对 + assertSpiritGourd 扩展 + item268 零漂移）/GM-D4（三文件
  exact diff + 双零 + 一阶段文档纠正 + E2E 登记）。未修改实现，未代签 Kimi。Next: Kimi 签控制流/
  publication ownership；本卡 build 另需 Store0 与 craft 两卡 done 收口放行。
- 2026-08-31 User/Codex: 用户指出 item270 空字段。Codex + 三路只读审计独立确认 L39713 0x34 在
  collectValue=0 时直跳 L38780，原文“无任何效果”；producer 只构造九档 pool、未读 operand0，是唯一根因。
  新开独立 migration 卡，不扩两张 review 卡，保持其签字/exact diff 有效；未修改实现或 generated current。
  Next: Kimi / GLM 独立签 premise/design；同时先完成两张 Depends On 的终审。

## 下一位 Agent 提示词

```text
无下一位 Agent 提示词；MIG-PAL-GOURD-FAILURE-MESSAGE-1 签字面三签已齐
（Codex + Kimi KG1-KG6 + GLM GM-D1~D4，无 counter，两席独立反证完成）。

本卡 build 的前置条件：Depends On 两卡（MIG-PAL-STORE0-SHOP-BOUNDARY-1、
MIG-PAL-CRAFT-FAILURE-MESSAGE-1）done 收口。届时请直接把本提示词替换为 Codex build 版：
唯一 Coding Owner = Codex，开工时 Status 转 build；已冻结结论（L39713 [38780,0,0] → L38780
「无任何效果」共享臂 19 入边、producer 未读 operand0 为唯一根因）不得重开；build 必落钉
KG1-KG6 与 GM-D1~D4（operand0 控制流驱动、strict pool translator + craft 回归零改动、
generated message ownership 只覆 message 叶、assertSpiritGourd 扩展、三文件 exact diff、
writes=1/双零、game-mechanics.md:703 纠正、零灵葫值 E2E 登记）。
```
