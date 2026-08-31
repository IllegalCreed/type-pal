# MIG-PAL-CRAFT-FAILURE-MESSAGE-1 - PAL 炼蛊失败原文迁移闭环

Status: review
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
  - premise: **verified（2026-08-31，独立直读 raw 事件链、sdlpal 0x20 语义、producer、current 数据与
    runtime/editor 下游，非复述 Codex/GLM；与 GLM 证据各自独立取得后收敛）**：
    1. **终端失败臂实锤（本人链式复算）**:data/extracted/events/all.json 中炼蛊链为
       L39598 `[117,1,→39600]` → L39600 `[118,1,→39602]` → L39602 `[119,1,→39604]` →
       L39604 `[120,1,→39606]` → **L39606 `[121,1,→39595]`**——前四条 failure 边链到下一条
       0x20，最后一条指向 L39595；L39595 恰为 `setDialogStyleNarration →
       showDialog(messageIndex 12541 "炼蛊的材料不足") → end` 严格三件套；成功臂
       L39607 `giveItem 148` + “炼成一只蛊．．”在旁。0x20 语义直读：材料不足时
       `wScriptEntry = operand[2] - 1`（reference/sdlpal/script.c:977-1024，operand[2]=0 则
       恒成功不落失败臂）——“五种材料全不足 → 显示‘炼蛊的材料不足’”成立。
    2. **根因实锤**:`translateCraftRecipeScript`（migrate-content.ts:962-1007）对每条 0x20
       仅用 failure 边判断“链继续（目标是 0x20）还是 break”，随后只提取 giveItem 产物并
       `return { kind:'craftRecipe', recipes }`——**终端非 0x20 失败臂（L39595）从未被读取，
       unavailableMessage 从未产出**；current item268 effect 只有 recipes（本人数据直读一致），
       运行时缺 message 走通用 fallback、编辑器忠实显空——缺失唯一位于 migration producer。
    3. **替代解释排除**:“省略 message 是合法默认”只证明 schema 可选，不能证明 producer 可以丢弃
       已存在、可达、schema 可表达的源文案；schema 有 `unavailableMessage?`（item.ts:146-155）、
       runtime 透传 optional message、editor 有通用字段——三层均可表达，无需任何 PAL 特判。
    4. **可证伪观察**:L39595 实际不可达（本人链式复算：L39606 直达；GLM 唯一入边扫描独立佐证）；
       文本不属于材料全不足场景（链尾唯一非 0x20 失败臂）；current schema/runtime 无法表达
       （三层直读均可表达）——出现任一真反证本签字失效。
  - design: **agree（2026-08-31，附 KC1-KC5 必落钉；与 GLM GM-C1~C4 收敛互补）**：
    - **KC1（终端臂识别钉）**：终端失败地址 = 链中最后一条 0x20 的 failure 边且目标**不是** 0x20；
      链式继续边（failure→0x20）语义不变，不得把中间边误当终端。以 L39598..L39606 链为正例回归。
    - **KC2（strict shape + fail-loud 边界钉，同 GM-C1）**：仅 `setDialogStyleNarration →
      showDialog(nonblank) → end` 翻译为 trimmed unavailableMessage；空白/纯空白文本、缺
      narration、缺 end、臂内插额外命令或其它可达非零终端形状一律 fail-loud（返回 undefined →
      调用方保留脚本迁移路径，**不生成缺提示的半截 craftRecipe**）；operand[2]=0 的恒成功链无
      终端臂属合法，不误伤；禁止任何“尽力翻译前缀”的宽松化。
    - **KC3（下游零特判钉，同 GM-C4）**:runtime fallback 保持通用“材料不足”只服务于无 message
      的作者工程；编辑器字段通用展示；任何层不得出现 item268 特判、PAL 专用文案或 UI 隐藏规则。
    - **KC4（exact-diff 与 current-only 钉，同 GM-C3）**：首次 plan 精确 `writes=1`
      （content/items.json，双树 + `_state.json` 该文件 hash，managedFiles 不变）；其余 items、
      shops、scenes、scripts、ids、counts、orders 零漂移，current↔baseline 镜像；内部 replay 与
      独立第二次 plan 全零；本卡是永久 producer 修复，无一次性转换器可退、不引入 upgrader/兼容分支。
    - **KC5（回归矩阵钉，同 GM-C2）**:translator 正例（strict→trimmed message）+ 畸形臂负例组 +
      PAL integration exact（item268 五条 117..121→148 不变、仅新增 message）+ publication
      镜像门禁；卡面已指出的“integration expectation 漏断言 message”必须补上，防同类漏检回流。
- GLM:
  - premise: **verified（2026-08-31，raw 脚本臂 / translator / schema / runtime / current 数据全部本人一手复算，非复述 Codex）**：
    1. **核验点①实锤**：raw 五连 0x20 链逐命令复算——L_39598(117×1 fail→39600)→L_39600(118)→
       L_39602(119)→L_39604(120)→**L_39606(121×1, fail→39595)**；成功臂各层 `goto L_39607`
       （giveItem 148 蛊 + 旁白「炼成一只蛊．．」+ end）；**L_39595 = setDialogStyleNarration →
       showDialog「炼蛊的材料不足」(messageIndex 12541) → end**，且全局唯一入边就是 L_39606 的
       failure operand（本人扫描 43503 命令仅此一引用）——可达性语义恰为「五种材料全不足」。
    2. **核验点②实锤**：`migrate-content.ts:986-989` 在 failure 命令非 0x20 时直接 `break`，
       :1004-1007 返回值仅 `{kind, recipes}`——**终端失败臂的地址与文案结构上不可达**，根因唯一
       落在 migration。全库 46 个 opcode-32 命令中唯一「fail→下一 0x20」真链即 39598..39606
       （:978 `failureAddress<=0 → undefined` 已排除平行形状），item268 是唯一 craft 源。
    3. **核验点③合理**：严格三元组 [setDialogStyleNarration, showDialog(非空), end] 是最小忠实
       表达（对白样式属 runtime 表现层，无需迁移）；形状不受支持返回 undefined 不产半截效果 +
       PAL publication 断言缺 message 即红——双层 fail-loud 正确。schema `unavailableMessage?`
       可选性不变（item.ts:146-147）；runtime `message: eff.unavailableMessage` 直传
       （item.ts:928-930），壳层 `if (message) return message` 否则才回退通用「材料不足」
       （main.ts:5428-5440）——通用工程零影响。
    4. **核验点④可行**：items current==baseline **今日即逐字镜像**（本人 `cur == base` True）；
       唯一变更为 item268 effect 新增一个键；manifest/scenes/shops 对物品文本零依赖；
       `_state.json` 仅 `files["content/items.json"]` hash。exact diff 三文件允许集封闭。
    5. **核验点⑤充分**：writes 按 content path 计（LABEL 卡先例：17 路径跨双树=writes=17）——
       items.json 单路径首跑 writes=1；内部 replay + 删除一次性辅助后的独立第二次全零，
       与本席 GM-A3 先例同构，幂等证明充分。
    6. **before 状态复核**：current item268 effect keys 恰 `['kind','recipes']`，无
       unavailableMessage；编辑器 ItemAlchemyTab:215 忠实渲染空值——「字段空是迁移丢失可表达
       源文案」的定性成立；卡面「integration expectation 漏断言 message」的 audit/test-model
       替代根因排查属实。
  - design: **agree（2026-08-31，附 GM-C1~GM-C4 必落钉）**：
    - **GM-C1（translator 正负例矩阵钉）**：正例 = PAL 真链五层 + 严格三元组 → 5 recipes + trimmed
      「炼蛊的材料不足」；负例至少四条且均须 undefined：①三元组 showDialog 文本为空白；②三元组
      缺 `end` 或其后还有更多命令；③narration 与 showDialog 之间插入额外命令；④各层 success
      目标不一致（productStart mismatch，现有）。禁止任何「尽力翻译前缀」的宽松化。
    - **GM-C2（PAL invariant 钉）**：publication 永久断言 item268 craftRecipe 的
      `unavailableMessage === '炼蛊的材料不足'`（精确、trimmed）且 recipes 仍 5×(117..121→148)
      零漂移；integration expectation 补上此前缺失的 message 断言（卡面已登记的测试模型缺口）。
    - **GM-C3（exact diff 与幂等钉）**：结构化 diff 允许集恰三文件；`_state.json` 断言仅
      `files["content/items.json"]` 变化、managedFiles 与其余键零变化；current/baseline items
      改后仍镜像；首跑 `writes=1 deletes=0 conflicts=0 asset-deletes=0`、写盘事务恰三文件、
      内部 replay 与独立第二次 plan 全零。
    - **GM-C4（通用语义不扩大钉）**：不改 schema 可选性、不给 runtime 加 PAL 文案、编辑器无
      item268 特判（Alchemy 页继续渲染字段本体）；ED-ITEM-ALCHEMY-SURFACE-1 解除阻塞后
      编辑器自动显示预填原文，其卡的 5/9 census 数据不变。
  - 独立反证：①若 L_39595 存在第二条入边或其文本不属于「材料全不足」语境（本人唯一引用扫描 +
      块结构直读已排除）——前提失效；②若终端臂三元组外还有必须迁移的表现命令（块内 39595-39597
      恰三条，已排除）；③若任何其他生成文件依赖 item268 文本（mirror + 依赖面直读已排除）。
- 独立反证审查: GLM（2026-08-31，完成——raw failure edge、L_39595 唯一入边、translator break 点、
  runtime fallback 分支、items 镜像均本人直读）；Kimi（2026-08-31，完成——独立链式复算
  L39598→…→L39606→L39595、producer 丢弃点、0x20 sdlpal 语义与下游三层可表达性直读，
  可证伪观察见 Kimi 签节第 4 条；两席反证独立取得后收敛）。
- counter / 分歧处理: none（Kimi KC1-KC5 与 GLM GM-C1~C4 逐项收敛，无冲突）
- 缺签豁免: N/A
- build 准入结论: **allowed（签字面）（2026-08-31，Codex + Kimi（KC1-KC5）+ GLM（GM-C1~C4）三签齐、
  无 counter，两席非 Owner 独立反证完成）。Codex 开工时状态转 build，仍为唯一 Coding Owner;
  与 ED-ITEM-ALCHEMY-SURFACE-1 按 Blocks 依赖串行。**

### 进入 done 前：审查签字

- Codex: **accept（2026-08-31）**——实现提交 `62e30f56`；strict terminal arm、环/悬空/畸形
  fail-loud、current publication producer-message 接线、item268 exact invariant、三文件 exact diff、
  writes=1→事务 3 文件→内部/独立 replay 全零均已自验。migrate typecheck、Biome 与唯一一次全量
  50 files / 402 tests 全绿；编辑器字段预填与五配方最小浏览器验收通过。
- Kimi: **accept（2026-08-31，只读终审 `62e30f56` + 本人独立复核命令与聚焦复跑，非复述 Codex）**。
  按 KC1-KC5 与卡面核验点逐项核验：
  - **strict 终端臂翻译 ✓（KC1/KC2/GM-C1）**:`translateCraftRecipeScript`
    （migrate-content.ts:969-1029）现逐钉落实——链环 `seen` 命中即 `return undefined`（:973-975）；
    failure 地址不可解析即 undefined（:989，悬空 fail-loud）；仅当终端非 0x20 目标严格为
    `setDialogStyleNarration → showDialog(nonblank) → end` 时取 `text.trim()`（:997-1010，
    缺 narration / 非 dialog / 空白文本 / 缺 end 全 undefined）；三元组后若存在**无 label 的
    续行命令**同样 undefined（:1003-1007，臂内/臂后额外命令防前缀宽松化）；产物入口不一致保持
    既有 productStart 语义。L39606→L39595 迁移结果即 working tree item268
    `unavailableMessage: "炼蛊的材料不足"`（本人 node 复算：五条 117..121 ×1 → 148 ×1、
    零 resource pool、message 精确）。
  - **operand[2]=0 不误投影 ✓**:`failureAddress <= 0` 维持既有 `return undefined`（:981），
    恒成功语义不会被生成 craftRecipe。
  - **generated ownership ✓（KC3/GM ownership）**:`applyPalGeneratedCraftMessages`
    （pal-authored-overlays.ts:273-352）——双侧 unique-id（重复 id 抛错）、current 缺物品抛错、
    craft 数量漂移抛错、逐 effect `sameRecipes` 完整结构证据（ingredients+products 逐项）不匹配
    抛错、message undefined 跳过、空/未 trim message 抛错；**只赋值 `unavailableMessage` 叶**，
    配方/名称/价格/其它 effect 全留作者侧；文件内无 item268 分支、无文案常量。publication 接线
    `applyPalGeneratedCraftMessages(applyPalItemOverlays(baselineItems), generatedItems)`
    （pal-current-publication.ts）顺序正确。
  - **invariant 与下游零特判 ✓（KC5/GM-C2）**:`assertVesselRecipes` 断言 message 精确
    “炼蛊的材料不足” + 五条配方精确结构（pal-store-boundary.ts:53-71，含首尾空白负例
    pal-store-boundary.test.ts:151）；本人 grep `炼蛊的材料不足` 在 reforge/editor/game **零命中**，
    仅 migrate 侧 invariant/测试持有——无 runtime/editor 特判、无一次性转换器、无 upgrader。
  - **exact-diff 与幂等 ✓（KC4/GM-C3）**：本提交 generated 侧仅 items.json×2 + `_state.json`
    items hash（本人 `git show` 证实 items.json diff 恰 +3 行 message-only）；Codex 记录
    写前 writes=1、事务 3 文件、1934 资产不变、内部 replay 与独立第二进程 dry-run 四项全零。
  - **本人复跑**:migrate-content + pal-authored-overlays + pal-store-boundary（unit+pal）+
    pal-derived-content + pal-current-publication → **6 files / 75 tests 全绿**（含真实 PAL
    镜像断言与 publication 全量 publish）；按纪律未重复全量。
  无返工项；未修改实现，未代签 GLM。
- GLM: pending
- 用户验收: pending
- done 准入结论: **blocked（Codex + Kimi accept 已签；缺 GLM accept 与用户验收）**

## Draft / Build / Review

- Draft：前提真值、producer 根因、最小 strict translator 与 exact-diff 方案已登记。
- Build：completed（`62e30f56`）；Codex 按 KC1-KC5 / GM-C1-GM-C4 完成实现、重迁和自验证。
- Review：in progress；Codex accept，待 Kimi / GLM 独立终审与用户验收。

## Build / Review 证据

- producer：`translateCraftRecipeScript` 继续沿 failure→0x20 解析有序链，只在最后一个非 0x20 failure
  目标严格匹配 `setDialogStyleNarration -> showDialog(nonblank) -> end` 时输出 trimmed message；failure
  环、悬空地址、空白文本、缺 narration/end、臂内/臂后多命令、产物入口不一致均返回 undefined。
  `operand[2]=0` 保持非候选，避免把原版恒继续语义误投影为“材料足量”配方。
- current publication：新增两输入纯函数，只把同轮 generated craft 的已翻译非空 message 接回
  baseline-derived items；按 item id + craft ordinal 配对，重复 id、缺 owner、craft/recipe 结构漂移
  fail-loud，只改 message 叶，不覆盖作者名称、说明、价格、配方或其它 effect；无 item268/runtime/UI 特判，
  不是一次性转换器或 upgrader。
- 永久 invariant：item268 必须唯一 craft、零 resource pool、message 精确为“炼蛊的材料不足”，五条配方
  必须依次为 117..121 ×1 -> 148 ×1；缺失、通用文案、首尾空白和配方漂移均有负例。
- 聚焦测试：translator 56/56；PAL Store0 unit 8/8；publication overlay 7/7；PAL publication + mirror
  3/3。最终 `@type-pal/migrate` typecheck 通过，Biome 9 个受影响源文件通过；唯一一次完整测试为
  50 files / 402 tests 全绿。
- 重迁：写前 `managed=537 writes=1 deletes=0 conflicts=0 asset-deletes=0`；正式事务
  `transaction-changes=3`，1934 资产全部 unchanged，内部 replay 四项全零；独立第二进程 dry-run
  `writes=0 deletes=0 conflicts=0 asset-deletes=0`。
- exact diff：结构化脚本证明 current/baseline items 只给 item268 craft effect 新增一个
  `unavailableMessage`；两树 JSON/字节镜像；`_state.json` 仅 `files["content/items.json"]` 从
  `b42b...8090` 更新为 `0058...a45`，managedFiles、其余 536 个文件哈希及全部其他生成路径零变化。
- 编辑器 dev-functional：`/?module=item&page=crafting&object=268` 在 1280×720 下字段唯一、可见、可编辑，
  值精确为“炼蛊的材料不足”；5 个配方 article 与五种材料均可见，body `scrollWidth=clientWidth=1280`，
  保存按钮保持 disabled（无脏写）。
- gameplay E2E（集中批次登记）：入口为背包中 117..121 全部为 0 时直接使用 item268；预期不扣材料、
  不给 148，旁白显示“炼蛊的材料不足”后结束。按视觉纪律延后到代码冻结后的剧情/运行时集中 E2E。

## 用户验收

- 问题确认：2026-08-31 用户指出“材料不足提示”字段为空并质疑其用途。
- 实现验收：pending。

## 交接日志

- 2026-08-31 Kimi: 只读终审 `62e30f56`，签 **accept**。独立证据：translator 环/悬空/缺 narration/
  空白/缺 end/臂后无 label 续行全 undefined（migrate-content.ts:969-1029 直读）、strict 三元组
  trimmed message；operand[2]=0 保持非候选（:981）；`applyPalGeneratedCraftMessages` 双侧
  unique-id + sameRecipes 结构证据 + 只覆 message 叶、无 item268 分支与文案常量
  （pal-authored-overlays.ts:273-352）；invariant 精确 message + 五条结构 + 空白负例；本人 grep
  reforge/editor/game 零特判；items.json diff 恰 +3 行 message-only、state 仅 items hash；
  本人 node 复算 item268 五条 117..121→148 + 精确 message + 零 pool；本人复跑 6 files / 75 tests
  全绿。无返工项；未修改实现，未代签 GLM，未标 done。Next: GLM 终审与用户验收。
- 2026-08-31 Codex: `62e30f56` 完成 strict producer、current publication message ownership 接线、
  item268 exact invariant 与 current/baseline 重迁。结构化 exact diff 仅三文件；writes=1、事务 3、
  内部 replay 与独立二次计划全零；migrate typecheck / Biome / 50 files 402 tests 全绿。应用内浏览器确认
  炼蛊失败字段精确预填、5 条配方完整、1280px 无横溢且无脏保存。Codex 签 accept，状态转 review；
  gameplay 零材料用例已登记集中 E2E。Next: Kimi / GLM 只读终审并分别签 accept/counter，签字不足不得 done。
- 2026-08-31 Codex: 开工前逐项核对任务卡实际签字表；Codex / Kimi / GLM 三方 premise verified +
  design agree 已齐、两席独立反证完成、无 counter，build 准入结论为 allowed。状态转 build；Codex
  继续作为唯一 Coding Owner，先补 strict translator 聚焦回归，再补 PAL invariant，最后执行重迁、
  exact diff 与双零计划。未重索签，未修改 runtime/editor fallback，未直接手改 current。
- 2026-08-31 Kimi: 独立链式复算 raw 五连 0x20 链（L39598→L39600→L39602→L39604→L39606，前四条
  failure 链下一条、L39606 终端 fail→L39595 三元组「炼蛊的材料不足」）、直读 0x20 sdlpal 语义、
  translator 丢弃点（failure 边只判 continue/break、返回值无 message）、下游三层可表达性与
  exact-diff/幂等设计。签 premise verified + design agree，附 KC1（终端臂识别）/KC2（strict
  三元组 + 畸形 fail-loud、恒成功链不误伤）/KC3（下游零特判）/KC4（writes=1 + 双零计划 +
  current-only）/KC5（回归矩阵含漏断言补钉）。未修改实现，未代签 GLM。三签齐，build 准入
  （签字面）allowed。Next: Codex 按钉 build，与 ED-ITEM-ALCHEMY-SURFACE-1 串行。
- 2026-08-31 GLM: 独立复算五项核验点全部闭合——raw 五连 0x20 链（L_39598..L_39606）终端 fail→
  L_39595 三元组「炼蛊的材料不足」且全局唯一入边；translator :986-989 break 点丢弃终端臂、返回值
  无 message 路径（根因唯一）；严格三元组 + 畸形 undefined + publication 断言双层 fail-loud 合理；
  items 双树今日即镜像、exact diff 三文件允许集封闭；writes=1 + 双零计划与 GM-A3 先例同构。
  签 premise verified + design agree，附 GM-C1（正负例矩阵含四负例）/GM-C2（PAL invariant 补
  message 断言）/GM-C3（三文件 exact diff + managedFiles 零变化 + 幂等）/GM-C4（通用语义不扩大）。
  未修改实现，未代签 Kimi。Next: Kimi 签控制流/架构边界后三签齐，Codex 方可 build。
- 2026-08-31 User/Codex: 用户指出空字段。Codex + 两席只读独立审计确认 primary 明有原文，schema/runtime/UI
  均可表达，`translateCraftRecipeScript` 丢弃最终 failure arm 是唯一根因。开高风险 migration 卡；未修改实现或
  generated current。Next: Kimi / GLM 独立签 premise/design，三签齐前不得 build。

## 下一位 Agent 提示词

```text
终审 MIG-PAL-CRAFT-FAILURE-MESSAGE-1（Kimi 或 GLM，只读；不得修改实现）。

任务卡：docs/ops/tasks/MIG-PAL-CRAFT-FAILURE-MESSAGE-1-pal-craft-failure-message.md
当前状态：review；实现提交 `62e30f56`，Codex accept；Kimi / GLM / 用户验收 pending，签字不足不得 done。
先完整阅读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、任务卡与 `62e30f56` diff。

请独立核：
1. 终端 failure 仅 strict narration/showDialog(nonblank)/end 输出 trimmed message；链继续、环、悬空、
   畸形臂、productStart mismatch、operand[2]=0 非候选是否全部 fail-loud 且不产半截配方。
2. current publication 是否只同步 generated producer 的 message 叶，保持作者其它字段；是否没有 item268
   runtime/editor 特判、一次性转换器、upgrader 或兼容分支。
3. item268 永久 invariant 是否精确钉 message + 117..121→148；负例和 publication 接线是否足够。
4. generated exact diff 是否恰 current/baseline items + `_state.json` items hash；current/baseline 镜像，
   writes=1、事务3、内部 replay/独立 dry-run 全零；migrate 50 files / 402 tests 与浏览器证据是否可信。

Kimi 重点审控制流、current publication ownership 与无下游特判；GLM 重点独立复算 exact diff、invariant、
负例/测试矩阵和二次零计划。结论写回本卡“进入 done 前”签字与交接日志：accept，或带 file:line、
可复现反例和返工项的 counter。不得代签另一席、不得改实现、不得标记 done；用户验收仍单独 pending。
```
