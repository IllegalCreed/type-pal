# C1-2 - 结构化人物对话身份与立绘约束

Status: done
Phase: phase2
Capability: C1 / N1
Coding Owner: Codex
Generation Owner: N/A
Reviewer: both
Visual Verification Owner: Codex
Visual Verification Timing: mixed
Unavailable Agents: none
Branch: TBD

## 目标

把“谁在说话”和“显示哪张立绘”从任意文本/全局资产拼装升级为结构化身份：人物说话时引用 Actor，
表情只能从该人物的立绘组选择；旁白、文书、泛称和未归档旧内容保留显式非人物通道。

## 范围

- 范围内：对话身份联合、Actor 表情选择、编辑器工作流、运行时与存档兼容、contentVersion 13→14
  无损结构升级、引用/删除/重命名闭包和可审计迁移计划。
- 范围外：PAL NPC 人物归并、按姓名/图片自动猜身份、删除非人物说话通道。
- 明确不做：在三方设计签字前修改 `DialogueCue`、contentVersion、迁移器或 generated PAL 内容；本卡不把
  PAL 任一旧 cue 自动提升为 Actor 身份，人物归档统一留给 C1-3。

## 前提真值门

### 一句话行为 / 工程前提

当前 cue 的 speaker 是 TextId、portrait 是全局 AssetId，不能证明二者属于同一人物；目标是新增现代作者
身份约束，同时保留原版大量旁白/泛称内容的合法表达。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | 头像来自 `setDialogStyle*` 的独立数值参数；说话人来自 `showDialog` 文本中以冒号结尾的姓名行，两者都没有 Actor/event object 稳定身份。 | `packages/game/src/core/event-system.ts:1251-1277,2207-2246`; `packages/migrate/src/translate-events.ts:580-581,986-1044` |
| 第一阶段 | 运行时忠实保存当前样式/立绘号和姓名文本状态，只解决原版显示/擦除语义，不建立作者侧人物身份。 | `docs/phase1/engineering-notes.md:114-117`; `docs/phase2/foundation/phase1-knowledge-harvest.md:130-134,289-294` |
| 当前二阶段 | `DialogueCue.speaker?: TextId` 与 `portrait?: {asset,side}` 仍互不相关；编辑器可从全局 portrait 资产任意选择，运行时也直接消费两个字段。 | `packages/content/src/index.ts:41-53`; `packages/editor/src/ui/CommandForm.tsx:255-395`; `packages/reforge/src/dialog/dialog-box.ts:256-277` |
| 本任务目标 | cue 必须有显式 narration / actor / unbound 身份；actor 身份引用 `ActorDef.id`，立绘只能引用该 Actor 的 default/命名 expression；旧内容无损进入 unbound，不猜 Actor。 | 2026-08-14 用户方向裁决；本卡 Draft schema |

### 反证与替代解释

- 最强替代解释：把所有 speaker 标签或 portrait 资源直接变 Actor。反证：原版两条来源彼此独立；PAL 当前
  6,235 cue / 318 个 speaker id / 87 张被用立绘，而 Actor 只有 6 个且只登记 6 张 default。没有任何
  `cue.speaker === actor.name` 稳定 id 边；按 locale 显示名只能得到 1,619 条人工候选，其中 796 条使用
  该 Actor 当前 default 以外的立绘，且存在跨人物头像异常，不能作为自动迁移 authority。
- 什么观察会推翻前提：若 primary source、提取产物或已发布 migration evidence 中存在可逐 occurrence 验签的
  speaker/portrait→人物稳定映射，应优先把它接进迁移 authority，并重新审 C1-3 的人工范围。
- audit 红项排查：
  - runtime 语义：现运行时只按 cue 直接画姓名与图片，未隐藏人物解析层；问题真实存在。
  - 原版 / 第一阶段理解：头像 opcode 与姓名文本为独立状态，未发现稳定人物 id。
  - extractor / 数据解码：当前迁移器明确用冒号正则生成 `spk.*`，用样式 opcode 生成 portrait，非遗漏 join。
  - audit / test model：census 同时覆盖 294 scene、items、shared、enemies；6018 的旧口径漏了 enemies 中 217 cue，
    正式口径更正为 6235。

### 用户可见偏离

- 是否主动偏离已核真值：yes（现代作者能力；旧内容兼容策略待用户拍板）
- `before -> after`：任意 speaker/portrait 组合 -> 结构化人物身份与人物内表情选择
- 代表场景：同一人物用默认、愤怒两张立绘发言；旁白无人物也可正常显示。
- 用户裁决：2026-08-14 已批准“预制人物 + 场景零件拼装双轨”及人物对话身份方向；精确 schema/migration
  仍须三方设计签字。

## 上下文锚点

- 已拍板：C1-1 只做人物预制，不偷改对话 schema；非人物通道必须保留。
- 代码：`packages/content/src/actor.ts:101-123`; `packages/content/src/index.ts:41-53`;
  `packages/content/src/script.ts:462-490`; `packages/editor/src/ui/CommandForm.tsx:255-395`;
  `packages/editor/src/ui/PortraitEditor.tsx`; `packages/reforge/src/dialog/dialog-box.ts:256-277`;
  `packages/content/src/actor-reference.ts:8-62`; `packages/reforge/src/save/types.ts:21,116-134`。
- 文档：`docs/phase2/READ-FIRST.md`; `docs/phase2/dialogue/model-design.md`;
  `docs/phase2/foundation/phase1-knowledge-harvest.md`; `docs/phase1/engineering-notes.md:114-117`;
  `docs/phase2/editor/actor-presets.md`。
- 不得重新引入：按显示文本、sprite 或 portrait hash 猜 Actor；强迫旁白建 Actor。
- 相关测试：content dialogue/refs、editor CommandForm/PortraitEditor、reforge dialogue、migration determinism。

## 验收条件

- 功能：人物 cue 的姓名默认来自 Actor、可显式覆写显示称谓，立绘只能选该 Actor 的 default/命名 expression；
  narration 与 unbound 非人物通道明确可用；Actor/表情引用的删除、重命名、跳转闭合。
- 测试：v13→v14 全 command tree 无损升级、schema/runtime/editor/asset/actor refs/save identity、全量 PAL
  6235 cue、连续迁移第二次零 diff、重放/历史工程兼容完整。
- 文档：更新 dialogue/actor 作者模型、content14/save8 兼容边界、C1-3 人工归档输入和 E2E 用例。
- 视觉：编辑器功能性验证；剧情观感在代码冻结后的集中 E2E 批次验收。
- E2E：至少登记默认/表情/无立绘/旁白/旧 cue 五类入口与证据路径。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: verified（原版头像/姓名独立证据见 `event-system.ts:1251-1277,2207-2246`；当前任意拼装见
    `index.ts:41-53` 与 `CommandForm.tsx:255-395`；PAL census 6235 cue）
  - design: agree（2026-08-14；同意下方 v14 联合、无损 unbound 升级与 C1-3 分层）
- Kimi:
  - premise: **verified（2026-08-14，本人只读独立核证，非代理）**。① 原版无稳定人物 join：
    立绘来自 `setDialogStyle*` opcode 的数值 arg0（`event-system.ts:2207-2248` →
    `applySetDialogStyle:1251-1277` 仅存 `currentDialogPortraitIcon: number`）；speaker 来自
    文本行尾冒号（`translate-events.ts:580-581` SPEAKER_RE → `:1036-1041` 生成 `spk.*` TextId），
    两条独立状态、无任何共享身份字段（`sss.ts` EventObject 亦无）。② 当前二阶段确为任意拼装：
    `index.ts:41-53` speaker/portrait 互不相关；`dialog-box.ts:256-277` 直读两字段；
    `CommandForm.tsx:265-271` 甚至把显示文本直接写回 `cue.speaker`。③ PAL 基线抽查吻合：
    `actors.json` 6 Actor 全部 default-only portraits（本人复算）；`enemies.json` `"cue"` 计数
    =217 与卡口径一致；`spk.*`（migrate :1037）与 `name.*`（mapActor）命名前缀零交集，
    「零稳定 speaker→Actor 边」由生成规则直接证明。
  - design: **agree（2026-08-14，附必落钉 K1-K3，见「Kimi 独立反证审查」）**。必填判别联合
    优于可并存 `actor?`；narration/actor/unbound 三分流无损覆盖全部现存 cue 形态；历史类型冻结、
    单解析器、expression refactor 与 SAVE8/content14 identity 方向均正确。
- GLM:
  - premise: **verified（2026-08-14，本人独立复算全部 PAL census + 递归 command surface，非代理）**。
    6235/1786/141/2389/1919/318/87/217/1619 全部逐项精确吻合；speaker→Actor 稳定边确认为 0；
    locale 显示名候选 1619 确认为人工候选而非迁移 authority。详见下方「GLM 独立反证审查」。
  - design: **agree（2026-08-14，附必改项 G1，非阻塞准入）**。v14 必填判别联合、无损 unbound 升级、
    无自动 actor promotion、SAVE8 identity 保留与全树 typed walker 方向正确。G1 修正 enemy cue
    路径显式列表。
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: Kimi（2026-08-14，本人）+ GLM（2026-08-14，本人）
  - 独立证据锚点: 见下方「Kimi/GLM 独立反证审查」
  - 可证伪观察: 见下方各节末尾
- counter / 分歧处理: none（Kimi agree 附 K1-K3；GLM agree 附 G1）
- 缺签豁免：N/A
- build 准入结论：**allowed（2026-08-14）——Codex/Kimi/GLM 三方 premise verified + design agree 齐；
  K1-K3 + G1 为 build 必落钉。**

#### Kimi 独立反证审查（2026-08-14，本人；非代理）

**方法**：一手读取任务卡全部锚点 + 历史类型链 + PAL 数据抽查，逐项压力测试任务卡点名的五个问题。

**五项压力测试结论：**

1. **原版头像 opcode 与姓名文本无稳定人物 join → 成立**。立绘是 `setDialogStyleTop/Bottom`
   的 arg0 数值（`event-system.ts:2215,2236`），`center/narration` 恒无头像（:2225,2245）；
   状态仅存 `currentDialogPortraitIcon: number`（:1274-1277）。speaker 是迁移器用冒号正则从
   文本行提取（`translate-events.ts:580-581`），立绘由样式 opcode 流跟踪（:987-988）——两条
   独立通道在生成端也从未相交（:1036-1043）。无任何可验签的 speaker/portrait→人物映射。
2. **narration/actor/unbound 联合 → 覆盖正确**。别名/称谓 = `speakerOverride`（不改真实身份）；
   无立绘人物 = actor + portrait 省略（编辑器禁用立绘控件并解释）；portrait-only = unbound 第二
   变体（`speaker?: never`）；空 unbound 禁止、纯无身份归 narration。旧四态（speaker-only 1786 /
   portrait-only 141 / both 2389 / neither 1919）分流规则（neither→narration、其余→unbound）
   逐态无损，slot/autoAdvance/cursorFrame/rows 原样保留。`slot` 窗体位置与 identity 说话者身份
   正交的显式声明正确（旧 narration 窗 cue 可能仍带 speaker/portrait）。
3. **Actor 别名/无立绘/portrait-only/expression 引用 → 覆盖**。`default` 要求 Actor 有
   `portraits.default`、expression 必须 exact 命中同 Actor key、找不到一律 fail-loud 不回退——
   与 content 既有 fail-closed 纪律一致；PAL 6 Actor 当前全 default-only（本人复算），expression
   机制为新作者能力，不与旧数据冲突。
4. **历史 v5/v13 类型隔离 → 风险真实、方案必要充分**。本人实证污染链：`script.ts:76`
   `{kind:'dialog'; cue: DialogueCue}` 引自 `index.ts`；`script-v5.ts:5,164` 以
   `Exclude<LegacyCommandV4,…>` 继承进 `AuthorCommandV5`；`script-v13.ts` 再经
   `RewriteCommandTreeV13` 继承。原地改 `index.ts` 的 DialogueCue 会同时改写 v4/v5/v13 历史
   输入类型。冻结 `DialogueCueV13` 历史输入 + 新 `DialogueCueV14` current 是必要且充分的隔离。
   Runtime：`dialog-box.ts:256-277` 目前直读字段，v14 单解析器（identity+actorsById→
   {speaker?,portrait?}）供 runtime/preview/tree 共用、缺引用 fail-loud，方向正确。
5. **Actor/表情删除重命名闭包与 SAVE8/content14 → 成立**。`dialogue-actor` 加入
   `ActorReferenceKind` 沿用 C1-1 typed collector（17→18 外部），scene/item/shared/enemy 全树
   递归登记；expression 是 (actor, key) 引用，rename 必须 refactor command 原子改写全部 cue、
   delete 有引用硬阻塞；换 expression 的 asset 不动 cue——正是人物预制复用价值。
   `save/types.ts:110-134` 已有 `SavePayloadV8`(content12)/`SavePayloadV8Content13` 同构先例，
   新增 `SavePayloadV8Content14` 沿用同一 identity 模式、world 形状不变；`SAVE_VERSION=8`
   （:21）不动。「只推进内容身份」成立。

**必落钉（K1-K3，build 必落，不阻塞设计准入）：**

- **K1（resolver 唯一性）**：content 单解析器输出 `{speaker?, portrait?}`，runtime、编辑器
  预览与树摘要共用；缺 actor / 缺 `portraits.default` / 缺 expression key 一律 fail-loud，
  禁止任何回退到全局图或默认图；落实为单测钉。
- **K2（speakerOverride locale 事务）**：override 是 TextId——新建 override 的 locale 写入
  必须与 cue 编辑同一可撤销事务（C1-1 locale+Actor 先例）；悬空 TextId 由既有 text 校验兜底。
- **K3（历史类型零漂移实证）**：build diff 中 `script.ts`/`script-v5.ts`/`script-v13.ts` 的
  历史类型定义零改动；v13→v14 upgrader 覆盖 scene v13、item private v5、shared v13、enemy
  choreography/onDefeated 全部递归 arms（GLM 复核矩阵）；13→14 后二次升级拒绝或 replay 零 diff。

**可证伪观察**：① 若 extracted/primary source 中存在 setDialogStyle 与 speaker 文本的官方
join（同一 event object 字段或对照表），前提 1 失效，应改走提取器上游 authority——本人已核
event-system/translate-events/sss.ts，不存在；② 若 6,235 cue 中存在 `cue.speaker === actor.name`
稳定 id 边，自动归档 authority 可能成立——已由 `spk.*`/`name.* 前缀零交集证伪；③ 若 PAL 存在
联合四态无法表达的 cue 形态（如 slot 与 identity 的非法组合在旧数据真实出现），分流有损——
旧 slot 四态与 speaker/portrait 四态自由组合均可由 identity+独立 slot 无损表达，不成立。

Evidence: `event-system.ts:1251-1277,2207-2248` / `translate-events.ts:580-581,986-1044` /
`index.ts:41-53` / `dialog-box.ts:256-277` / `CommandForm.tsx:253-271` / `script.ts:76` /
`script-v5.ts:5,164` / `script-v13.ts`（RewriteCommandTreeV13）/ `save/types.ts:21,110-134` /
`projects/pal/content/actors.json`（6 Actor default-only，本人复算）/ `enemies.json` cue=217。
只读审查，未改实现/迁移器/projects/pal，未代签 GLM，未标 build/done。

#### GLM 独立反证审查（2026-08-14，本人；非代理）

**方法**：本人用 Node 独立递归扫描 PAL 全部四个来源（scenes/items/shared-scripts/enemies）的
`rows`+`speaker`+`portrait` 字段，逐项复算卡文 PAL 审计基线。

**PAL census 独立复算（全部精确吻合）：**

| 指标 | 卡文 | 本人复算 | 核对 |
|---|---|---|---|
| 全部 cue（scene+item+shared+enemy） | 6,235 | 6,235 | ✓ 精确 |
| 来源 scene / item / shared / enemy | (6018+217) | 5995 / 23 / 0 / 217 | ✓ 精确 |
| speaker only | 1,786 | 1,786 | ✓ 精确 |
| portrait only | 141 | 141 | ✓ 精确 |
| both | 2,389 | 2,389 | ✓ 精确 |
| neither | 1,919 | 1,919 | ✓ 精确 |
| unique speaker TextId | 318 | 318 | ✓ 精确 |
| unique portrait AssetId | 87 | 87 | ✓ 精确 |
| `cue.speaker === actor.name` 稳定边 | 0 | 0 | ✓ 精确 |
| locale 显示名匹配 Actor 的 cue（人工候选） | 1,619 | 1,619 | ✓ 精确 |

speaker TextId 前缀 `spk.*`（migrate `:1037`）与 Actor name 前缀 `name.*`（mapActor）命名零交集，
**"零稳定边"由生成规则直接证明**——不是"没找到边"，是"生成器从一开始就用了不同前缀"。

**递归 command surface 核实 ✓（含关键发现 G1）：**

本人确认 dialogue cue 出现在 PAL 四个来源的深层递归路径中：
- **scene**（5995）：onEnter / onTouch / entities[].pages[].trigger/auto script body、onEnter hooks variants。
- **item**（23）：item 私有脚本 body。
- **shared**（0）：当前无 cue，但 walker 必须覆盖以防未来内容。
- **enemy**（217）：**关键发现**——本人逐条核路径分布：
  - `ai.hooks.*.states.*.body[]`：**~200 cue**（turnStart/ready 等钩子状态机 body 中的 `cue` 命令）
  - `onDefeated[]`：~17 cue

卡文 `:190` 显式列表写"enemy choreography/onDefeated"，但**实际 enemy cue 中约 200/217 在
`ai.hooks.*.states.*.body[]`，不在 choreography**。"等全部递归 arms"的修饰语覆盖了该路径，但
C1-1 经验表明显式列表会被实现者直接使用——若只建 choreography walker 会漏约 200 cue。

**必改项 G1（非阻塞 build 准入，build 实现时必须落实）：**

卡文 `:190` 的 enemy 路径显式列表应从"enemy choreography/onDefeated"修正为
"enemy `ai.hooks.*.states.*.body[]` + `onDefeated[]` + `choreography`（如有）"。200/217 enemy cue
在 ai.hooks 状态机 body 中，不在 choreography。"等全部递归 arms"虽在文字上覆盖，但显式列表应准确，
以防实现者只建 choreography walker。

**v13→v14 无损分流逻辑 ✓：**
- neither（1919）→ `narration` ✓
- speaker-only（1786）+ portrait-only（141）+ both（2389）= 4316 → `unbound`（保留 speaker/portrait）✓
- 自动提升为 actor = **0**（speaker→Actor 边 = 0，C1-3 人工归档另卡）✓
- rows/slot/autoAdvance/cursorFrame 逐字节不变 ✓
- 升级前后 resolved speaker/portrait/side 全等 ✓

**Actor/expression refs、asset closure、SAVE8 identity ✓（设计层面）：**
- `dialogue-actor` 加入 `ActorReferenceKind`（C1-1 typed collector 扩展）—— Actor 删除阻塞闭合。
- expression key 稳定引用；rename 原子 rewrite 全部 cue；delete 有引用则阻塞。
- asset closure 由 ActorDef.portraits 提供；unbound portrait 继续直接 asset 引用 + 既有删除保护。
- SAVE_VERSION=8 不变；新增 SavePayloadV8Content14；world/position 深等；与 W9/B10 content-axis
  successor 同构。
- 全迁 allowlist + 第二次 0/0/0 标准 append-only 纪律。

**可证伪观察：**
① 若 primary source 中存在未发现的 speaker/portrait→Actor 稳定映射表，C1-3 人工范围应缩小——
  本人核 sss.ts EventObject + translate-events 生成器，未发现此类映射。
② 若 build walker 只覆盖卡文显式列出的路径（choreography）而漏 ai.hooks，约 200 enemy cue 不升级——
  G1 要求修正显式列表。
③ 若 v14 联合在 PAL 真实数据中出现无法无损表达的形态——Kimi 已分析 slot 四态 × speaker/portrait
  四态的全部组合均可由 identity + 独立 slot 表达，本人核 PAL 数据未发现例外。

Evidence: 本人 Node 独立扫描 scenes(5995)+items(23)+shared(0)+enemies(217)=6235 cue /
speaker→Actor 边=0 / locale 候选=1619 / enemy path 分布 ai.hooks ~200 + onDefeated ~17 /
script-v13.ts 存在 / actor-reference.ts:8-62（C1-1 typed collector 扩展点）。只读审查，未改实现/
迁移器/projects/pal，未代签 Kimi，未标 build/done。

### 进入 done 前:审查签字

- Codex: **accept（2026-08-14）**。content14 schema/runtime/save/editor/migration 已落；PAL 6235 cue
  全量升级并发布，ordinary replay 0/0/0；编辑器真实 s001 场景完成“脚本→编辑旧 cue→切预制人物→
  Actor/称谓/人物立绘出现”的功能走查，fresh tab console error=0。自测证据见 Build/视觉记录。
- Kimi: **accept（2026-08-14，本人只读架构/schema 终审 + 四包实跑 + PAL 独立 census，非代理）**。
  对照本人设计期 K1-K3 逐项核销：
  1. **K1 单解析器 ✓**：`resolveDialogueIdentityV14`（`dialogue-v14.ts:163-197`）缺 Actor /
     缺 `portraits.default` / 缺 expression key 全部 throw、零 fallback；loader-v14 全表域经唯一
     `resolveDialogueTreeV14ToV13` 投影（`loader-v14.ts:143-146,284`），runner 只读冻结 v13
     runtime view，编辑器树摘要缺陷已贯通同一 resolver 并有回归。
  2. **K2 称谓事务 ✓**：`CompositeCommand('修改人物称谓', [UpdateLocaleCommand, edit])`
     （`SharedScriptTab.tsx:827-833`、`ScriptDrawer.tsx:1401`）locale+cue 单次 undo。
  3. **K3 历史零漂移 ✓**：`script.ts`/`script-v5.ts`/`script-v13.ts` 零 diff；`index.ts` 仅新增
     `DialogueCueV13` 别名与 export；`RewriteDialogueTreeV14` 类型级只替换 dialog cue。
  4. **联合与校验 ✓**：必填判别联合 + exactKeys 严格校验，空 unbound 拒绝、旧身份字段混入
     拒绝、重复升级拒绝（`script-v14.ts:79-80`）；`downgrade` 对 actor 身份 fail-loud。
  5. **G1 walker ✓**：结构无关递归 walker 覆盖 scene/item/shared/enemy；
     `dialogue-v14.test.ts:207-232` 专测 ai.hooks/onDefeated/choreography。
  6. **引用闭包 ✓**：`dialogue-actor` 入 typed policy（external/error，
     `actor-reference.ts:26,60,120-129`），删除阻塞经 C1-1 collector 覆盖；
     `RenameActorPortraitExpressionCommand` 原子改写全树并断言 改写数==引用数，
     remove expression/portrait set 引用硬阻塞（`actor-dialogue-commands.ts`）。
  7. **SAVE8/content14 ✓**：`WorldStateV14 = WorldStateV13` 别名（`character.ts:80`），
     `SavePayloadV8Content14` 同构先例（`save/types.ts:125-131`），SAVE_VERSION=8 不动。
  **本人实跑**：content 473 / reforge 1023 / editor 857 / migrate fast 627 passed + 5 skipped
  （含 `pal-c1-dialogue-identity.pal.test.ts` census+seal 钉、pal-oracle 链钉），exit 0。
  **PAL 独立 census（本人复算）**：narration 1919 + unbound 4316 + actor 0 + 无 identity 0 =
  **6235**，与分流规则逐项吻合；零自动提升；`_transitions/c1-dialogue-identity-v1.json`
  append-only（parent=w9）。
  **非阻塞记录项**：O1 content `validateReferences` 对 `entryPoints[].startWorld.party` 等的
  历史残余与 C1-1 O1 相同，不属本卡新增面；O2 视觉证据以 Codex 登记的 s001 走查为准，
  本人未重跑浏览器（功能性编辑器验证归 Codex，剧情观感归集中 E2E）。
  未改任何实现文件，未代签 GLM，未标 done。
- GLM: **accept（2026-08-14，本人覆盖/数据/测试矩阵终审，非代理）**。全部验证通过（见下方
  「GLM done 前终审证据」）。v14 已发布；6235 cue 无损分流精确；G1 enemy ai.hooks 已落实并有
  专门测试；replay 0/0/0；oracle 2/2；三包 473/1023/857 全绿；两个白屏回归已钉；E2E 五类已登记。
- counter / 返工处理：none
- 缺签豁免：N/A
- done 准入结论：**三方 accept 齐（Codex/Kimi/GLM，2026-08-14），用户已于 2026-08-14 最终验收通过**

#### GLM done 前终审证据（2026-08-14，本人；非代理）

**1. v14 发布状态 ✓**：`CONTENT_VERSION=14`；`manifest.json contentVersion=14`；
C1 seal `c1-dialogue-identity-v1.json` 存在（parent=w9-entity-lifecycle-v1）；
`dialogue-v14.ts` / `script-v14.ts` / `validate-v14.ts` 全部存在。

**2. PAL v14 census 无损分流（本人独立复算）✓**：

| 指标 | 设计期望 | v14 实际 | 核对 |
|---|---|---|---|
| total cues | 6,235 | 6,235 | ✓ |
| sources | 5995/23/0/217 | 5995/23/0/217 | ✓ |
| narration | 1,919 | 1,919 | ✓ |
| unbound speaker-only | 1,786 | 1,786 | ✓ |
| unbound portrait-only | 141 | 141 | ✓ |
| unbound both | 2,389 | 2,389 | ✓ |
| actor（自动提升） | **0** | **0** | ✓ |

**3. G1 enemy ai.hooks walker ✓**：enemy 217 v14 cues 全部有 identity；ai.hooks 202 +
onDefeated 15 = 217（choreography 0）。`dialogue-v14.test.ts:207` 有专门的 G1 walker 测试
"同一 walker 覆盖 ai.hooks、onDefeated、choreography 与递归 arm"。

**4. replay + oracle ✓（本人实跑）**：`migrate:content` → `writes=0 deletes=0 conflicts=0` +
`[C1-2 dry-run] content14 dialogue identity writer/seal 预检完成`。`test:oracle:verify` →
**2/2 passed**。

**5. 三包测试 ✓（本人实跑）**：content **473** / reforge **1023** / editor **857** 全绿。
（content +1 vs 卡文 472 = build 后新增测试，无碍。）

**6. 两个白屏回归已钉 ✓**：
- 回归 1（canonical session）：`App.reference-navigation.test.tsx:357` "content14 场景脚本进入
  canonical 工作区而不是 legacy stages 抽屉" + `:425` "content14 保存合并保留 shell 空间改动
  与 canonical 身份对话"。
- 回归 2（actorsById context）：`CanonicalScriptEditorV5.test.tsx:402` "resolves content14
  actor identity in canonical command summaries"。

**7. dialogue-v14.test.ts 测试矩阵 ✓（9 tests）**：四态无猜测升级(:28) + identity 首位(:57) +
actor 逆映射 fail-loud(:83) + Actor 解析(:97) + 缺引用 fail-loud 不回退(:134) + 拒绝半状态(:164) +
历史 v13 冻结(:189) + **G1 walker**(:207) + runtime 同一 resolver(:239)。

**8. K1-K3/G1 落实**：K1 resolver fail-loud（:134）; K3 expression rename/delete
（actor-dialogue-commands.test.ts :96/:111/:121）; G1 walker（:207）。K2 speakerOverride locale
在 actor-dialogue-commands locale fixture 中覆盖。

**9. E2E 五类登记 ✓**：actor-default / actor-expression / actor-no-portrait / narration /
unbound-legacy 全部在 `:440-446` 表格中，按集中 E2E 纪律延后到代码冻结后执行。

**10. git diff --check ✓**：clean。

Evidence: `character.ts CONTENT_VERSION=14` / `manifest.json contentVersion=14` / C1 seal /
dialogue-v14.test.ts 9 tests / App.reference-navigation.test.tsx :357/:425 /
CanonicalScriptEditorV5.test.tsx :402 / actor-dialogue-commands.test.ts / 三包 473/1023/857 实跑 /
oracle 2/2 / replay 0/0/0 / git diff --check clean。只读终审，未改实现文件，未代签 Kimi，未标 done。

## Draft: 设计与风险

### 设计结论

### Schema（候选 contentVersion 14）

不在旧 cue 上追加可并存的 `actor?`。那会制造 `actor + 任意 speaker + 任意 portrait` 半状态和优先级，永久
保留本次要消灭的歧义。v14 用必填判别联合，并把 v13 cue 留作历史输入类型：

```ts
type DialogueActorPortrait =
  | { kind: 'default'; side: 'left' | 'right' }
  | { kind: 'expression'; expression: string; side: 'left' | 'right' }

type DialogueIdentity =
  | { kind: 'narration' }
  | {
      kind: 'actor'
      actor: string                 // ActorDef.id
      speakerOverride?: TextId      // 伪装名/称谓；缺省 = ActorDef.name
      portrait?: DialogueActorPortrait
    }
  | ({ kind: 'unbound' } & (
      | { speaker: TextId; portrait?: { asset: AssetId; side: 'left' | 'right' } }
      | { speaker?: never; portrait: { asset: AssetId; side: 'left' | 'right' } }
    ))

interface DialogueCueV14 {
  identity: DialogueIdentity
  rows: DialogueRow[]
  autoAdvance?: number
  slot?: 'top' | 'bottom' | 'narration' | 'center'
  cursorFrame?: 0 | 1 | 2
}
```

- `slot` 是窗体位置，不代表说话者身份；任何 identity 都可使用合法 slot。
- `actor.portrait.kind=default` 要求 Actor 有 `portraits.default`；`expression` 必须 exact 命中同 Actor 的
  `portraits.expressions` key。找不到一律 fail-loud，不回退全局图片或默认图。
- `speakerOverride` 只改显示称谓，不改变真实 Actor 身份；处理“神秘人/掌柜/少年时期”等演出称谓。
- `unbound` 是正式的“非人物/尚未归档”通道，不叫 legacy；但必须至少有 speaker 或 portrait。纯无名无图用
  `narration`，不允许空 unbound。
- 表情 key 是稳定引用身份。重命名必须用 editor refactor command 原子改写全部 cue；删除已引用表情硬阻塞。

### 数据流与引用 authority

1. content 提供唯一纯解析器，把 identity + `actorsById` 解析成 `{speaker?, portrait?}`；runtime/preview/tree
   共用，禁止三份 fallback。
2. shape validator 校验联合互斥；project reference validator 再校验 Actor、expression、TextId/AssetId。
3. `ActorReferenceKind` 增 `dialogue-actor`，所有 scene/item/shared/enemy command tree 都必须递归登记；Actor
   删除沿 C1-1 同一阻塞/跳转真值。
4. 新增表情引用 collector，PortraitEditor 的 rename/delete 不再直接改 Record：rename 原子 rewrite，delete
   有引用则列 locator 并阻塞。换 expression 对应 asset 不改 cue，正是人物预制的复用价值。
5. actor identity 不直接拥有 AssetId 引用；asset closure 由 ActorDef.portraits 提供。unbound portrait 继续是
   直接 asset 引用，保留现有删除保护。

### Runtime / editor

- DialogBox 与编辑器预览只消费统一 resolved identity；Actor 名、称谓覆写、default/expression 画面均从同一
  resolver 得出，缺引用不得静默不画。
- CommandForm 第一项改为“身份类型：旁白 / 人物 / 自定义未绑定”。人物模式先选 Actor，再从该 Actor 的
  “不显示 / 主立绘 / 命名表情”中选择；全局 ImageAssetPicker 只出现在 unbound 模式。
- Actor 工作区增加“被对话引用”摘要和可跳转引用；人物无立绘组时人物 cue 仍可说话，但立绘控件禁用并解释。
- 插入新 dialog 默认 `identity:{kind:'narration'}`，不再生成缺身份 cue；raw JSON 也必须过同一保存门。

### 版本与迁移

- 当前 `CONTENT_VERSION=13`，仓库未占用 14；本设计候选升 content14。`SAVE_VERSION` 保持 8，世界形状不变；
  新增 `SavePayloadV8Content14`，v13 存档升级只改 content identity 并保持 world/position 深等。
- v13→v14 纯升级逐 command occurrence 改 cue，绝不按名字/资源猜 Actor：
  - 无 speaker 且无 portrait → `identity:{kind:'narration'}`；
  - 其余 → `identity:{kind:'unbound', speaker?, portrait?}`；
  - rows/slot/autoAdvance/cursorFrame 与原序列逐字节语义不变，输入不变。
- 升级覆盖 scene v13、item private v5、shared v13，以及 enemy `ai.hooks.*.states.*.body[]`、
  `onDefeated[]`、`choreography`（如有）的全部递归 arms；PAL 生成器从同一转换函数产 v14，不手改
  `projects/pal`。enemy 217 cue 中约 200 条位于 `ai.hooks`，不得只建 choreography walker（G1）。
- C1-3 消费 v14 unbound inventory，凭人工签字/显式 provenance 把一部分提升为 actor，并补 Actor/NPC 预制和
  expression 表；C1-2 不预支该判断。

### PAL 审计基线（2026-08-14）

| 项 | 数量 |
|---|---:|
| 全部 cue（scene + item + shared + enemy） | 6,235 |
| speaker only / portrait only / both / neither | 1,786 / 141 / 2,389 / 1,919 |
| unique speaker TextId / portrait AssetId | 318 / 87 |
| Actor / 有 portrait set / 已登记 portrait binding | 6 / 6 / 6（均只有 default） |
| 按 locale 显示名看似匹配 6 Actor 的 cue（只作人工候选，不作 authority） | 1,619 |
| 上述候选中无图 / 当前 default / 其它图 | 197 / 626 / 796 |
| `cue.speaker === actor.name` 的稳定 id 边 | 0 |

旧 6,018 口径只含 scenes/items/shared；enemy 中另有 217 cue。测试与迁移 closure 以后统一使用 6,235。

### 测试矩阵

- schema：联合所有合法态；actor+asset 混搭、空 unbound、缺 actor、缺 portrait set、缺 expression、旧字段混入
  全部拒绝；输入对象不变。
- upgrader：三种 identity 分流、所有递归 arms/dialect、未知字段/混合 v13-v14 拒绝、13→14 后二次升级拒绝或
  current replay 零 diff。
- refs/editor：Actor 删除、expression rename/delete、scene/item/shared/enemy locator、undo/redo、保存重开、
  raw JSON 绕过失败；表达式换 asset 后所有 cue 自动得到新图。
- runtime：Actor 默认名、override、无图、default、expression、narration、unbound speaker/portrait；missing ref
  fail-loud；现有 6235 cue 结构升级前后 resolved speaker/portrait/side 全等。
- save：SAVE8/content13→SAVE8/content14 仅内容轴变化，world/position 深等；旧/未来非法 tuple 拒绝。
- PAL：6235 全覆盖、318/87 census pin、无自动 actor promotion、生成 allowlist、连续全迁第二次 0/0/0。

### 已知风险

- schema 与 migration 不可逆；旁白/别名误归档会改变剧情呈现。
- common `DialogueCue` 当前横跨 v4/v5/v13 命令类型，直接原地替换会污染历史类型。
- Actor expression key 目前可在 UI 直接重命名/删除，新增持久引用后必须先收紧命令边界。
- 6235 cue 分布于 scene/item/shared/enemy，若只沿旧 6018 census 会漏敌人编排。
- 缓解：单独冻结 `DialogueCueV13` 历史输入与 v14 current type；无损先迁 unbound；全树 typed walker；
  expression refactor command；剧情视觉集中 E2E。

### 主审立场

- Reviewer: Kimi 主审 schema/架构，GLM 主审数据覆盖与迁移矩阵。
- 结论: **Kimi / GLM 均 agree；build allowed**
- 必改项: K1 resolver 唯一性 fail-loud、K2 speakerOverride locale 同事务、K3 历史类型零漂移、
  G1 enemy `ai.hooks` 明确覆盖——详见两份独立反证审查。
- 是否建议进入 build: **yes（2026-08-14 三签齐）**

### 三方争议记录

- Codex: 不接受 v13 上追加可并存 `actor?`；不接受显示名/portrait hash 自动归档；content14 + save8 identity
  successor 是当前最小可逆边界。
- Kimi: 无方向性争议。同意拒绝可并存 `actor?`（半状态永存歧义）；联合覆盖、类型隔离、单解析器、
  SAVE8/content14 identity 五项压力测试均成立，见「Kimi 独立反证审查」。
- GLM: 无方向性争议；独立复算全部 census 一致，并补出 G1 enemy `ai.hooks` 路径漏口，设计 agree。
- 用户拍板: 2026-08-14 批准“预制人物说话引用人物自身立绘、历史 PAL 不自动猜人物”的设计并允许 build；
  同日最终产品验收 `C1-2：通过`。

## 额度 / 代班记录

- 缺席 Agent: none
- 其余: N/A

## Build: 实现与自测

- Coding Owner: Codex（仅在三方 design agree 后）
- content：新增冻结的 `DialogueCueV14` narration/actor/unbound 联合、v14 scene/item/enemy/shared
  类型与 strict validator；历史 v5/v13 类型保持不变。Actor/default/expression 统一 resolver 缺引用
  fail-loud，v13→v14 walker 覆盖 scene、item private、shared、enemy ai hooks/onDefeated/choreography。
- runtime/save：新增 content14 author loader + 唯一 v14→v13 runtime view；SAVE_VERSION 保持 8，新增
  content14 identity 检查与 save migration，world payload 形状不变。
- editor：对话表单显式三身份；Actor 只列人物表，立绘只列该人物 default/expression；称谓 locale+cue
  原子更新；Actor/expression rename/delete/refactor/跳转闭合。content13/14 现在统一创建 canonical script
  session，保存边界合并 shell 空间改动与 canonical scripts，不再错误落入 legacy `ScriptDrawer`。
- migration：新增 append-only `c1-dialogue-identity-v1` seal/rewind/project rewind，PAL 5995 scene +
  23 item + 0 shared + 217 enemy = 6235 cue；不做任何 Actor 猜测；项目与 baseline 已发布 content14，
  首次计划 246 project files + baseline transition，重放与 ordinary no-flag 均 0/0/0。
- oracle/current replay：PAL compact oracle 与历史 current successor rewind 已追加 C1；PAL lite 测试钉
  seal、manifest、局部 project rewind 保留非 C1 编辑、其余 parent surface exact。
- 验证：
  - `@type-pal/content`: 40 files / 472 tests passed。
  - `@type-pal/reforge`: 100 files / 1023 tests passed；v14 PAL loader 5 tests passed。
  - `@type-pal/editor`: 103 files / 857 tests passed；`tsc --noEmit` 与 Vite production build passed。
  - `@type-pal/migrate` fast gate: 84 files / 627 passed / 5 skipped；C1 PAL lite 1 passed
    （约 61s）；oracle verify 与 test manifest verify passed。
  - `git diff --check`: passed。
- build 期间功能验收发现并修复两处真实集成缺陷：
  1. content13/14 未创建 canonical session，s001 点“脚本”时 legacy `ref-index/ScriptDrawer`
     把 behavior id 当 stages，`stages is not iterable`/`.map` 白屏；已改为 current canonical route，
     并加 App regression + 保存合并回归。
  2. cue 切换 Actor 后 canonical tree summary 未向统一 resolver 传 `actorsById`，合法 Actor 被当未知
     而白屏；已贯通 context，并加 Actor identity summary 回归。

## E2E 登记（代码冻结后集中剧情观感）

| 用例 | 入口 | 预期 | 证据路径 |
|---|---|---|---|
| Actor 默认立绘 | s001 任一旧 cue 在编辑器绑定 `li-xiaoyao` + default | 姓名来自 Actor，默认立绘与 side 正确 | C1-2 E2E 截帧 `actor-default` |
| Actor 命名表情 | synthetic/后续 C1-3 已归档 cue 选 expression | 只能选该 Actor expression，显示对应图 | C1-2 E2E 截帧 `actor-expression` |
| Actor 无立绘 | Actor identity 不启用 portrait | 有姓名、无立绘、排版不留空洞 | C1-2 E2E 截帧 `actor-no-portrait` |
| 旁白 | PAL `neither` cue / narration slot | 无人物姓名与立绘，正文/自动推进不变 | C1-2 E2E 截帧 `narration` |
| 旧 cue | PAL unbound speaker/portrait cue | resolved 画面与 content13 同义，无自动人物猜测 | C1-2 E2E 对照 `unbound-legacy` |

## 视觉验证记录

- Visual Verification Owner: Codex
- Visual Verification Timing: mixed
- 2026-08-14 Codex（功能性界面最小验证）：fresh in-app Browser 打开 PAL content14，进入 s001，
  点“脚本”显示 canonical command tree；编辑“李大娘”旧 cue，身份下拉含旁白/预制人物/未绑定；切换
  预制人物后出现 Actor 下拉、显示称谓、人物立绘，页面 DOM 完整且 console error=0。浏览器改动未保存。
- 剧情演出观感按项目规则延后到上表 E2E 集中批次，不以本次表单验证替代。

## Review: 审查与返工

- Reviewer: both
- 审查结论: **Codex accept + GLM accept + Kimi accept（三方齐，2026-08-14）**。Kimi 架构/schema
  终审对照设计期 K1-K3 逐项核销通过（见 done 前签字区），附 O1/O2 非阻塞记录项。
- 必须返工项: none
- Accept / rework: **accept；用户已最终验收，任务收口。**

## 用户验收

- 用户结论: **通过（2026-08-14）**
- 验收原文: `C1-2：通过`
- 后续任务: C1-3 PAL NPC 人工归档与迁移保持独立 draft，须另过前提与推进签字门禁，
  不由本卡自动启动。

## 交接日志

- 2026-08-14 Codex: 按 C1-1 冻结边界建立 successor，未改 schema/实现。Next: 用户排期后启动三方前提审计。
- 2026-08-14 Codex: 完成 primary/phase1/current 四向核对与 PAL census。正式口径 6235 cue（含 enemy 217），
  零稳定 speaker→Actor 边；冻结 v14 narration/actor/unbound 候选、无损 v13→v14 与 C1-3 分层。Codex
  `premise verified / design agree`，build 仍 blocked。Next: Kimi、GLM 独立签字。
- 2026-08-14 Kimi: 签 premise verified + design agree（附必落钉 K1-K3）。五项压力测试：原版无稳定
  join（opcode 数值立绘 vs 冒号姓名两条独立通道）、联合四态无损覆盖、别名/无立绘/portrait-only/
  expression 均有归属、历史类型污染链实证（script.ts→v5→v13 继承 DialogueCue）且冻结方案充分、
  SAVE8/content14 identity 同构先例成立。PAL 抽查：6 Actor 全 default-only、enemy cue=217、
  spk.*/name.* 前缀零交集。Next: GLM 独立复算 6235 口径、全 command arms 与迁移矩阵并签字；
  三签齐前不得 build。
- 2026-08-14 GLM: 签 premise verified + design agree；独立复算 6235 全口径一致，补出 G1：enemy 217 cue
  中约 200 条位于 `ai.hooks.*.states.*.body[]`。Codex 已将 K1-K3/G1 纳入 build 门禁。三签齐，任务进入
  build；Coding Owner=Codex。
- 2026-08-14 Codex: 完成 content14/schema/runtime/save/editor/migration/PAL 发布；自测中通过真实浏览器
  抓出并修复 canonical session 缺接线与 Actor summary context 缺失两次白屏，补组件/保存回归；任务转
  review，Codex `accept`。Next: Kimi/GLM 分别做 done 前只读审查并签 `accept` 或列 counter。
- 2026-08-14 GLM: done 前终审 accept（七项证据见 Review 节「GLM done 前终审证据」）。
- 2026-08-14 Kimi: done 前架构/schema 终审 **accept**——设计期 K1-K3 逐项核销（单解析器零 fallback、
  称谓 locale+cue 单事务、历史类型零漂移），联合校验/G1 walker/dialogue-actor 闭包/expression
  原子改写/SAVE8-content14 identity 均一手核实；本人实跑四包 content 473 / reforge 1023 /
  editor 857 / migrate fast 627+5 全绿；PAL 独立 census narration 1919 + unbound 4316 + actor 0
  = 6235 零自动提升。附 O1/O2 非阻塞记录项。三方 accept 齐，done 准入仅待用户最终验收。
  Next: 用户验收后标 done；C1-3 保持 draft 另过前提门。
- 2026-08-14 User: 最终验收 `C1-2：通过`。Codex 将本卡转为 done 并从进行中看板移除；
  C1-3 仍保持独立 draft，未自动进入 build。
- 2026-08-14 Codex: 用户验收后同步 `docs/phase2/capability-map.md` 的 C1-2 状态为 done，并在用户要求
  “继续”后仅启动 C1-3 draft 前提/设计审计；C1-3 三签前未修改实现或 PAL 生成数据。

## 下一位 Agent 提示词

```text
无下一位 Agent 提示词。C1-2 已完成三方审查与用户最终验收，状态为 done。
C1-3 仍是独立 draft，必须另过前提门与推进签字，不得由本卡自动启动。
```

### 给 Kimi（done 前架构/代码审查）——已于 2026-08-14 执行完毕，签 accept（保留备查，勿再执行）

```text
接手任务: C1-2 结构化人物对话身份与立绘约束
任务卡: docs/ops/tasks/C1-2-actor-dialogue-identity.md
当前状态: review；三方设计签字已齐，Codex build/自测完成并签 accept；不得修改实现或标 done
你的角色: done 前架构、schema、代码与可逆迁移只读审查
先读: AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、任务卡；重点读
packages/content/src/dialogue-v14.ts、script-v14.ts、validate-v14.ts、actor-reference.ts，
packages/reforge/src/loader-v14.ts、save/migration-v14.ts，
packages/editor/src/main.tsx、core/script-v5-editor.ts、core/project-io-v5.ts、ui/CommandForm.tsx、
ui/CanonicalScriptEditorV5.tsx、core/actor-dialogue-commands.ts，
packages/migrate/src/pal-c1-dialogue-identity.ts、scripts/migrate-content.mts 与 C1 PAL test。
已完成: 必填 narration/actor/unbound 联合；历史 v5/v13 冻结；单 resolver；speakerOverride 原子事务；
expression refactor；SAVE8/content14；6235 PAL cues 无猜测升级；append-only seal/rewind/project rewind；
ordinary replay 0/0/0。浏览器实测还额外修了 content14 错落 legacy ScriptDrawer 白屏、Actor summary
漏传 actorsById 白屏，并有回归测试。
请你做: 压力测试 K1-K3、schema 半态、resolver fail-closed、editor current-session/save 合并是否丢空间或
脚本编辑、Actor/expression 删除重命名、manifest/seal/rewind/allowlist/历史 current adapter。复核实际 diff
与测试，不接受任务卡自述代替代码。把结论写回任务卡 Review 与 Kimi done 签字。
输出要求: `accept + 直接证据`，或 `counter + 精确 blocker/复现/修法`。不要代签 GLM，不要标 done。
```

### 给 GLM（done 前覆盖/数据/测试审查）——已于 2026-08-14 执行完毕，签 accept（保留备查，勿再执行）

```text
接手任务: C1-2 结构化人物对话身份与立绘约束
任务卡: docs/ops/tasks/C1-2-actor-dialogue-identity.md
当前状态: review；三方设计签字已齐，Codex build/自测完成并签 accept；不得修改实现或标 done
你的角色: done 前全树覆盖、数据口径、测试矩阵与文档只读审查
先读: AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、任务卡；重点读 content v14 tree walker/validators、
editor Actor/expression reference collectors、migrate C1 seal/project rewind/PAL test、pal-test-oracle、
projects/pal 与 migrate baseline 的 manifest/seal/scene/item/enemy 产物，以及更新后的 dialogue/model-design。
已完成: PAL 正式 summary scene5995/item23/shared0/enemy217=6235；无 Actor 自动 promotion；
speaker-only/portrait-only/both/neither 全部无损进 unbound/narration；enemy ai.hooks/onDefeated/choreography
纳入递归；发布后 ordinary replay 0/0/0；editor 103 files/857 tests，migrate fast 84/627。
请你做: 独立复算 6235 及 source-kind counts，检查 scene/item/shared/enemy 所有递归 arms、legacyCueOrders
逐字节 rewind、全 migration allowlist、project copied seal/局部 rewind、oracle/test-manifest；审 E2E 五类登记
和两次白屏回归是否真正覆盖。把结论写回任务卡 Review 与 GLM done 签字。
输出要求: `accept + 复算/命令证据`，或 `counter + 漏项/错误口径/失败命令`。不要代签 Kimi，不要标 done。
```

### 历史设计审查提示词（已执行）

### 给 Kimi

```text
接手任务: C1-2 结构化人物对话身份与立绘约束
任务卡: docs/ops/tasks/C1-2-actor-dialogue-identity.md
当前状态: draft；Codex 已完成前提审计并签 premise verified / design agree，build 仍 blocked
你的角色: 架构与 schema 独立反证、设计签字
先读: AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、任务卡；并直接读
packages/game/src/core/event-system.ts:1251-1277,2207-2246、
packages/migrate/src/translate-events.ts:580-581,986-1044、
packages/content/src/index.ts:41-53、packages/content/src/actor.ts:101-123、
packages/editor/src/ui/CommandForm.tsx:255-395、packages/reforge/src/dialog/dialog-box.ts:256-277、
packages/reforge/src/save/types.ts:21,116-134。
已完成: PAL 正式口径 6235 cue（含 enemy 217），零 cue.speaker===actor.name 稳定边；候选 content14
采用必填 narration/actor/unbound 联合，Actor 立绘只引用 default/expression，v13 无损全部进 narration/unbound，
人物归档留 C1-3；SAVE_VERSION 保持8，只推进 content identity。
请你做: 独立核原版头像/姓名是否确实无稳定人物 join；压力测试联合是否覆盖演员别名、无立绘、portrait-only、
历史 v5/v13 类型隔离、runtime resolver、Actor/expression 删除重命名和 SAVE8/content14 边界。把直接证据、
可证伪观察和结论写回任务卡的 Kimi 签字、独立反证、主审/争议记录。
不要做: 不得改实现、contentVersion、迁移器或 projects/pal；不得按显示名/图片 hash 自动归 Actor；不得标 build。
输出要求: `premise verified + design agree`，或 `counter + 必改理由`；有 counter 时保持 blocked。
```

### 给 GLM

```text
接手任务: C1-2 结构化人物对话身份与立绘约束
任务卡: docs/ops/tasks/C1-2-actor-dialogue-identity.md
当前状态: draft；Codex 已完成前提审计并签 premise verified / design agree，build 仍 blocked
你的角色: 数据口径、迁移覆盖与测试矩阵独立反证、设计签字
先读: AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、任务卡；并直接读
packages/migrate/src/translate-events.ts:580-581,986-1044、packages/content/src/script.ts:462-490、
packages/content/src/script-v5.ts、packages/content/src/script-v13.ts、packages/content/src/validate-refs.ts、
packages/editor/src/core/actor-references.ts、projects/pal/content/actors.json 与 locale/scenes/items/shared/enemies。
已完成: 正式 census 为 6235 cue：speaker-only/portrait-only/both/neither=1786/141/2389/1919，
unique speaker/portrait=318/87；旧6018口径漏 enemy 217。按 locale 显示名只有1619条人工候选，
无图/current default/其它图=197/626/796，不构成迁移 authority。
请你做: 独立复算上述数量；确认 scene/item/shared/enemy 所有递归 command arms 与历史 dialect 都在
v13→v14 无损转换范围；压力测试 narration/actor/unbound 三分流、Actor/expression refs、asset closure、
SAVE8 identity、全迁 allowlist/二次0 diff及 E2E 登记。把复算方法、直接证据、可证伪观察和结论写回
任务卡的 GLM 签字、独立反证、测试矩阵/争议记录。
不要做: 不得改实现或 generated PAL；不得把显示名/portrait 相似当稳定人物映射；不得标 build/done。
输出要求: `premise verified + design agree`，或 `counter + 漏项/错误口径`；有 counter 时保持 blocked。
```
