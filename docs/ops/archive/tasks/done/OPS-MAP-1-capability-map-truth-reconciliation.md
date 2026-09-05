# OPS-MAP-1 - 能力地图真值对账与选择器校准

Status: done
Phase: ops
Capability: capability-map / roadmap truth
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: none
Branch: codex/d15-movement-premise-gate

## 目标

让能力地图、任务卡、git 完成记录和用户验收重新一致，并删除已经完成能力仍被推荐为“下一步”的陈旧
选择器文案。对账完成前不据此启动新产品任务；证据不完整的能力保持未完成或 `blocked`，不猜测补齐。

## 范围

- 范围内:
  - 对账 `docs/phase2/capability-map.md` 中 W9、E18、C8、N3、B11 注记、议题 18 与 §4/§5 选择器；
  - 核对任务卡头部 `Status`、done 前三签、用户验收节与对应 git 提交是否一致；
  - 修正 `docs/ops/board.md` 中违反“只保留进行中/阻塞任务”的 done 行；
  - 按修正后的半 done/缺失格重新运行选择器，给出下一产品任务候选及直接依据。
- 范围外:
  - 不修改任何产品代码、schema、save、migration 或 generated content；
  - 不为缺失的用户验收代签，不把 commit message 单独当作用户验收；
  - 不顺手实现被选中的下一产品任务；
  - 不重写能力地图历史，只修客观陈旧状态和当前选择器。
- 明确不做:
  - 不因任务卡首行写 `done` 就自动把能力格改为 `✅`；
  - 不因地图当前写 `❌/draft` 就忽略任务卡和 git 中更晚的完成证据；
  - 不用本卡替用户补 E18 等缺失的最终产品验收。

## 前提真值门

### 一句话行为 / 工程前提

当前能力地图的多处状态和“下一步”建议落后于任务卡/git，若不先对账，下一轮选择器会推荐已经完成的能力。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：本卡只校准项目治理状态，不改变游戏行为 | 本卡范围；`docs/phase2/capability-map.md:203-224` |
| 第一阶段 | N/A：不作机制判断；下一产品任务另开卡后再核一阶段真值 | 本卡范围外 |
| 当前二阶段 | 地图仍把 W9/E18 写 draft、C8 写 review、N3 写 build，并把 W1/E6 当下一步；对应多张任务卡已写 done，部分源卡自身又有 `done`/用户 pending 矛盾 | `docs/phase2/capability-map.md:62,77,90,98,174,192-199`; `docs/ops/tasks/{W9-entity-lifecycle-respawn,E18-1-editor-actor-battle-fields,C8-item-use-mechanisms,N3-1-script-control-flow-modernization}.md:3` |
| 本任务目标 | 逐能力建立 `task status + 三签 + user acceptance + git` 四证对账；全证成立才更新完成，证据冲突则停线并明确待谁确认 | 本卡验收条件 |

### 已发现的证据冲突

| 项 | 地图 | 任务卡 / git | 初步处置（待审） |
|---|---|---|---|
| W9 | `❌ / draft` | 卡头 `done`；提交 `b9de09d0` 的 diff 记录 User 2026-08-12 accept，但卡内旧“用户结论: pending”未回填 | 核 commit 与三签后回填用户节并更新地图；不得只看卡头 |
| E18 | `— / ❌ / draft` | 卡头 `done`；`9952aa53` 写 three accepts，但同提交仍写“待用户验收后标 done”，当前用户节仍 pending | 无用户证据前 fail-closed：不得把地图改 `✅`；应将源卡状态纠正为 review 或请用户确认 |
| C8 / ED-5I | `⚠️ / review，等待 N3-1` | 两卡卡头均记录 2026-08-06 用户联合验收 + 三方 accept + done | 核证后更新地图，不再保留已解除依赖 |
| N3 | 行状态 `✅/✅`，备注仍称 R13 build/不得 done | N3-1 卡头和用户结论均为 2026-08-06 done | 只更新陈旧备注，不改变已正确的格状态 |
| B11 / 议题18 | 注记仍称 E18/W9 draft | W9 有完成证据；E18 验收冲突待解 | 分别写真实状态，不用一个总称掩盖差异 |
| §4/§5 | 仍称 W1 地图绘制缺、E6 唯一最高优先 | W1/W7 表已 `✅/✅`；E6 引擎及依赖链已完成，残留仅低优先调试可视化 | 删除陈旧推荐，按修正后地图重跑选择器 |
| ops board | 仍保留 `D15-1 done` | board 规则明确只保留进行中/阻塞 | 移除 done 行 |

### 反证与替代解释

- 最强替代解释: 地图的旧文字可能故意保留历史，而非陈旧错误。
- 什么观察会推翻当前前提: 若对应段明确标注为历史快照、且 §5 选择器不会消费这些文字，便不应改；当前
  §4 标题和 §5 标准动作明确声称用于“决定先做谁”，所以该反例暂不成立。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: N/A，本卡不审产品行为；
  - 原版 / 第一阶段理解: N/A，本卡不据此改机制；
  - extractor / 地图 / 数据解码: N/A；
  - audit / test model: 本次 Node 扫描只发现候选 mismatch，不自动决定最终状态；最终以四证人工对账。

### 用户可见偏离

- 是否主动偏离已核真值: no
- `before -> after` 一句话: 能力本身不变，只把路线图从陈旧状态改为已有证据支持的真实状态。
- 代表场景: N/A
- 用户裁决: 2026-08-13 用户指示“推进”；本卡不把该指示解释成 E18 的历史用户验收。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `AGENTS.md` 前提真值门：关键 unknown 必须 blocked；capability-map 状态变化必须三方介入；
  - `docs/phase2/capability-map.md:203-224`：下一步选择器与“一轮一承诺”；
  - `docs/ops/board.md`：看板只保留进行中和阻塞任务。
- 代码 / 文档锚点:
  - `docs/phase2/capability-map.md:52-174,180-224`；
  - 本卡真值矩阵中列出的五张任务卡；
  - `git show b9de09d0 -- docs/ops/archive/tasks/done/W9-entity-lifecycle-respawn.md`；
  - `git show 9952aa53 -- docs/ops/archive/tasks/done/E18-1-editor-actor-battle-fields.md`。
- 已知坑 / 审计文档:
  - 卡头、正文、git 和用户验收可能不同步；任何单一来源都可能陈旧；
  - commit message 的 `done` 不等于用户在产品层验收；
  - 地图表格状态正确但备注错误，仍会污染选择器判断。
- 不得重新引入:
  - 只看任务卡首行；
  - 只看能力地图当前符号；
  - 把“技术三签”冒充“用户验收”；
  - 为了尽快选下一项而把 unknown 写成 done。
- 相关测试:
  - 文档四证对账脚本、链接/状态一致性扫描、陈旧关键词扫描、`git diff --check`。

## 验收条件

- 每个修改的能力格都有任务卡 Status、三方 done 签字、用户验收、git 提交四列证据；缺任一列则保持
  非 done 并写明责任人/下一步。
- W9 卡内历史 `用户结论: pending` 与真实提交证据一致化；若无法证明用户 accept，则 W9 也不得升级地图。
- E18 不得因卡头 `done` 自动升级；无直接用户证据时纠正为 review/pending，并在地图保留未完成。
- C8/ED-5I/N3 的 2026-08-06 联合验收若四证成立，解除地图陈旧依赖说明并更新真实状态。
- §4 不再把已完成的 W1/E6 主链写成当前最高优先；§5 保留通用选择算法，并基于修正后表格给出新一轮候选，
  不把候选自动写成已承诺任务。
- board 移除 D15-1 done 行，只保留本卡及既有 draft/blocked 项。
- `git diff --check`、Markdown 链接检查和陈旧关键词扫描通过。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: **verified（2026-08-13）**。直接证据见本卡真值矩阵和逐项 `file:line`/git 提交；地图
    当前会推荐已完成 W1/E6，且 W9/E18 源卡存在不同类型的证据冲突。
  - design: **agree（2026-08-13）**。采用四证 fail-closed 对账；不把用户“推进”代签成 E18 验收。
- Kimi:
  - premise: **verified（2026-08-13，本人只读独立核对，非代理）**。直接证据：一手读取五张源卡
    与三份提交 diff，四证逐项对账见下方「Kimi 独立四证对账」。地图 W9 ❌/draft
    （`docs/phase2/capability-map.md:62`）、E18 ❌/draft（:77）、C8 ⚠️ 等待 N3-1（:90）、
    N3 备注「不得把 N3-1 标 done」（:98）、§4 W1/E6 陈旧推荐（:183-199）、board D15-1 done 行
    （`docs/ops/board.md:19`）均与源卡/git 更晚证据冲突；`b9de09d0`/`9952aa53`/`e70987d6`
    均经 `git merge-base --is-ancestor` 确认在 HEAD 内。前提成立。
  - design: **agree（2026-08-13，附必改项 K1-K6，见「Kimi 独立四证对账」）**。四证
    fail-closed、先修源卡再改地图、不代签 E18 用户验收的方向正确；K1-K6 为 build 必落钉。
- GLM:
  - premise: **verified（2026-08-13，本人独立四证核实）**。逐项 task Status / 三签 / 用户验收 / git
    四列独立对账确认：地图多处状态和选择器确实落后于任务卡/git（见下方「GLM 独立反证审查」
    逐项四证表）。W9 可回填完成；E18 必须退 review；C8/ED-5I/N3 四证成立可解除陈旧依赖；
    W1/E6 选择器推荐确已过时；board D15-1 done 行违反看板规则。
  - design: **agree（2026-08-13）**。四证 fail-closed 对账 + 先修源卡再改地图 + 不代签用户验收
    的方向正确。附 1 条非阻塞必改项（见下）。
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: GLM（本人）
  - 独立证据锚点: 见下方「GLM 独立反证审查」逐项四证表
  - 可证伪观察: 若 §4/§5 明确标注为历史快照且不被选择器消费，则本卡前提失效。实测 `§4` 标题
    "阶梯依赖图(决定先做谁)"、`§5` "下一步选择器(每次开工先跑这个)"——两者均自称当前决策工具，
    故前提成立。
- counter / 分歧处理: none
- 缺签豁免: N/A
- build 准入结论: **allowed（2026-08-13）**——Codex/Kimi/GLM 三方 `premise verified` +
  `design agree` 齐；GLM R1 与 Kimi K1-K6 为 build 必落钉，不阻塞准入。

#### GLM 独立反证审查（2026-08-13，本人；非代理）

**premise verified — 逐项四证独立对账（task Status / 三签 / 用户验收 / git）：**

| 项 | task Status | 三签 | 用户验收 | git | 地图当前 | GLM 裁决 |
|---|---|---|---|---|---|---|
| **W9** | done ✓ | Codex accept(681) + Kimi accept(614/634) + GLM accept(638) ✓ | **行 608-609 明文记录 "User 2026-08-12 最终验收: accept"** ✓；但 `### 用户验收` 结构节(730+) 仍写 pending（结构节未回填） | b9de09d0 ✓ | ❌/draft | **可回填**：四证全成立。结构节 pending 需同步更新。地图应改 ✅ |
| **E18** | done | Codex accept(74) + Kimi accept(77) + GLM accept(80) ✓ | **行 407 "用户结论: pending"** ✗；行 83 done gate 自己写 "待用户验收后标 done" ✗ | 9952aa53 "close E18-1 done (three accepts)" — Codex 自标 done，无用户验收 | —/❌/draft | **必须退 review**：用户验收从未发生；done gate 文本自相矛盾。地图不得改 ✅ |
| **C8** | "done（2026-08-06 用户联合验收确认）" | 行 916 "accept（Codex/GLM/Kimi 三方，2026-07-22）" ✓ | 结构节(963+) 2026-07-26 写 review；但 Status 引用 2026-08-06 联合验收；**commit e70987d6 "user acceptance confirmed"** ✓ | e70987d6 ✓ | ⚠️/"review 等待 N3-1" | **可解除依赖**：四证成立（commit + Status 双独立引用 2026-08-06 用户验收）。地图应更新；结构节需回填 |
| **N3** | "done（2026-08-06 用户确认性验收通过）" | P0 Kimi/GLM + P2 Codex 分批 accept ✓ | 结构节(3070) 写 "pending"；但 Status 引用 2026-08-06 用户确认；**commit e70987d6** ✓ | e70987d6 ✓ | ✅/✅ 但备注 "不得把 N3-1 标 done" | **备注陈旧**：格状态正确但备注直接矛盾。只更新备注 |
| **ED-5I** | "done（2026-08-06…用户确认性验收）" | 行 179-180 Kimi/GLM accept ✓；Codex accept(153) | Status 引用 2026-08-06；**commit e70987d6** ✓ | e70987d6 ✓ | (C8 依赖行内) | **四证成立**：随 C8/N3 联合验收解除 |
| **§4:197** | — | — | — | — | "E6 当前唯一最高优先" | **过时**：E6 为 ✅/⚠️（引擎 done，编辑器仅缺低优先调试可视化） |
| **§5:199** | — | — | — | — | "W1 编辑器侧…较大缺口" | **过时**：W1 为 ✅/✅ |
| **board** | D15-1 卡 Status: done | — | — | — | board 行 19 "D15-1 done" | **违反看板规则**（只保留进行中/阻塞）|

**E18 关键裁决（fail-closed）**：E18 done gate 文本（行 83）自己写"待用户验收后标 done"，而 Status
写 done——这是 Codex 在用户验收未发生时单方面标的 done（commit 9952aa53 message 自称 "three
accepts"，但 three accepts ≠ user acceptance）。地图当前 —/❌ 是**正确的**；卡头 done 是**错误的**。
应纠正卡头为 review 并保留地图未完成，直到用户真正验收。

**C8/N3/ED-5I 2026-08-06 联合验收**：commit `e70987d6`（2026-08-06 18:33）message 明文
"N3-1/C8/ED-5I done - user acceptance confirmed, downstream regression closed"；三张卡的 Status
字段独立引用同一日期的"用户确认性验收"。结构节 pending 是 2026-07-26 的旧文本未回填。四证成立，
可解除地图"等待 N3-1"依赖。

**W9 用户验收回填依据**：交接日志行 608-609 记录 "User（2026-08-12 最终验收）：accept——通过
`?scene=s006&pos=102,50&skill=392` 与 `?battle=4&skill=392` 复验后确认'没问题了'"。这是直接用户
证据；`### 用户验收` 结构节(730+) 的 "pending" 是未同步的旧文本。

**design agree — 方向正确，附 1 条非阻塞必改项：**

四证 fail-closed 对账（先修源卡再改地图、不代签用户、commit ≠ user acceptance）是正确方法。
逐项处置方向与 GLM 独立核实一致。

**必改项（非阻塞 build 准入，build 实现时必须落实）：**

- **R1（结构节回填范围）**：除 W9 外，C8(963+)、N3(3068+)、ED-5I(552+) 的结构化 `## 用户验收`
  节均写 pending/review，但 Status 字段和 commit `e70987d6` 记录了 2026-08-06 用户验收。build 时
  必须同步回填这四个结构节（W9 + C8 + N3 + ED-5I），不能只改地图状态而不修源卡结构节——否则
  下一次对账会再次发现同样的"结构节 vs Status"矛盾。卡文验收条件 `:106` 已要求四列证据闭合，
  但应明确"结构节也是用户验收列的一部分"。

**可证伪观察**：若 §4/§5 被明确重新标注为"历史快照，不用于当前选择"，且实际选择器不消费这些
文字，则本卡前提（"选择器会推荐已完成能力"）失效。实测 §4 标题"阶梯依赖图(决定先做谁)"、
§5 "下一步选择器(每次开工先跑这个)"——均自称当前决策工具，前提成立。

Evidence: W9 卡 :3,608-609,614,634,638,681 + b9de09d0 / E18 卡 :3,74,77,80,83,407 + 9952aa53 /
C8 卡 :3,916,963-970 / N3 卡 :3,3068-3070 + e70987d6 / ED-5I 卡 :3,153,179-180 /
capability-map.md :62,77,90,98,197,199 / board.md :19 / git commit e70987d6 message。
只读审查，未改 capability-map/board/源任务卡，未代签 Kimi，未标 done。

#### Kimi 独立四证对账（2026-08-13，本人；非代理）

**方法**：一手读取 `capability-map.md:40-224`、`board.md` 全文、W9/E18-1/C8/ED-5I/N3-1 五张
源卡；`git show b9de09d0 / 9952aa53 / e70987d6` 逐提交核对 diff；`git merge-base --is-ancestor`
确认三提交均在 HEAD；`projects/pal/manifest.json:4` 实测 contentVersion=13。结论与 GLM 逐项一致，
以下为独立证据与 GLM 未覆盖的增量发现。

| 项 | ① Status | ② 三签 | ③ 用户验收 | ④ git | Kimi 裁决 |
|---|---|---|---|---|---|
| W9 | done（W9 卡 :3） | Codex/Kimi/GLM accept + 2026-08-12 返工补审 accept（W9 卡 :614、:649） | **成立**：Review 节记 User 2026-08-12 经 `?scene=s006&pos=102,50&skill=392` 与 `?battle=4&skill=392` 复验「没问题了」（W9 卡 :607-609，在 `b9de09d0` diff 内）；`board.md:5` 佐证；结构节 :918 仍 pending 未回填 | `b9de09d0` ∈ HEAD | **可回填完成**，地图 ❌→✅；编辑器列单独核定（K2） |
| E18 | done（E18-1 卡 :3） | 三方 accept（E18-1 卡 :74-83，在 `9952aa53` diff 内） | **缺失**：用户验收节 :407 pending；同提交 done 准入自写「待用户验收后标 done」；全仓库无用户证据 | `9952aa53` ∈ HEAD | **fail-closed**：地图保持 ❌/draft；源卡 Status 纠正为 review 或请用户确认唯一一项（K1） |
| C8 | done（C8 卡 :3） | 三方 accept + N3-1 后回归（C8 卡 :684-692；`e70987d6` diff 记「done allowed 2026-08-06」） | **成立**：`e70987d6` 卡头+提交记录 2026-08-06 用户联合验收；结构节 :966-971 仍写 review 未回填 | `e70987d6` ∈ HEAD | **可解除 N3-1 依赖**，地图 ⚠️→✅；回填结构节 |
| ED-5I | done（ED-5I 卡 :3） | 三方 accept + 2026-08-06 回归三签（ED-5I 卡 :172-181） | **成立**：`e70987d6` 记用户确认性验收；结构节 :554 仍写 blocked(2026-07-24) 未回填 | `e70987d6` ∈ HEAD | 同上 |
| N3-1 | done（N3-1 卡 :3） | 齐（`e70987d6`） | **成立**：同上；结构节 :3070 仍 pending 未回填 | `e70987d6` ∈ HEAD | 地图格 ✅/✅ 已正确；仅备注（map :98「R13-6~Z 未完成不得标 done」）与 N2 备注陈旧（K3） |
| §4/§5 | — | — | — | — | **过时**：W1 ✅/✅（map :54）、E6 引擎 ✅（map :73，编辑器仅缺低优先调试可视化）；§4 :183-199 仍称 W1 地图绘制缺、E6「当前唯一最高优先」 |
| board | — | — | — | — | `board.md:19` D15-1 done 行违反「只保留进行中/阻塞」规则，移除 |

**增量发现（GLM 未覆盖的遗漏陈旧状态，均有直接证据）：**

- **X1 备注陈旧**（map :128）：「当前 epoch 为 SAVE 8 / contentVersion 10」——实测
  `projects/pal/manifest.json:4` contentVersion=**13**（W9 发布链占用 11/12/13，见
  `packages/content/src/skill-execution-v11-upgrade.ts:19`、`enemy-team-slots-v12-upgrade.ts:103`）。
- **A7 备注陈旧**（map :158）：「contentVersion 5～10 已由 N3-1 P7/R13 占用…A7-4 顺延到
  contentVersion 11」——11 已被 N3-1 后续、12 被 B10-1、13 被 W9 占用，「候选 11」不成立。
- **N2 备注陈旧**（map :97）：「N3-1 R13 仍在逐批关闭源语义缺口，最终验收未完成」——
  N3-1 卡头 :3 已 done（2026-08-06 用户确认性验收）。

**必改项（K1-K6，build 必落钉）：**

- **K1（E18 fail-closed）**：E18 地图格保持 ❌/draft，不得升级；E18-1 源卡 Status `done` 与
  用户验收节 `pending` 矛盾，build 期将源卡纠正为 `review`（或用户确认验收后闭环）；本卡
  不为用户代签。对账收口后向用户提唯一确认项：E18-1 是否已验收。
- **K2（W9 引擎/编辑器分列核定）**：W9 卡范围含 editor v12→v13 overlay/manifest-last 升级与
  生命周期/明雷策略 CRUD（W9 卡 :33），地图 W9 行编辑器列当前 `—`；升级时按该范围与三方
  accept 证据单独判断编辑器列是否 ✅，不得照抄引擎列、也不得沿用 `—` 了事。
- **K3（补三处遗漏陈旧）**：X1/A7/N2 三处备注按上述证据更新；若 Codex 认为超出本卡范围，
  必须在卡内显式记录 defer 及理由，不得静默跳过。
- **K4（结构节回填，附议 GLM R1）**：W9（:916-918）、C8（:963-971）、ED-5I（:552-558）、
  N3-1（:3068-3072）四卡结构化 `## 用户验收` 节回填为与卡头/git 一致的真实状态。
- **K5（选择器与看板）**：board 移除 D15-1 done 行；§4 删除 W1/E6 陈旧推荐与「待闭合半done格」
  中已完成项（W1/N7 等）；议题 18 行（map :174）拆分写 W9 done / E18 draft；§5 保留通用
  算法，重跑结果只作候选、不写成已承诺任务。
- **K6（B11/议题18 注记）**：B11 注记「编辑器侧编辑归 E18（draft）」（map :119）在 K1
  fail-closed 下保持正确，不改；议题 18 行按 K5 拆分。

**可证伪观察**：① 用户若否认 2026-08-12 对 W9 的「没问题了」验收，W9 证明③失效、退回
review——当前证据锚点为 `b9de09d0` diff 内 Review 节与 `board.md:5`；② 用户若出示 E18-1
验收记录，E18 可免退 review 直接闭环——当前全仓库（含两提交 diff）无此类证据；③ X1/A7
epoch 判断若错，可由 manifest 实测证伪——已实测 contentVersion=13，判断成立。

Evidence: capability-map.md :54,62,73,77,90,97,98,119,128,158,174,183-199 / board.md :5,19 /
W9 卡 :3,33,607-609,614,649,916-918 / E18-1 卡 :3,74-83,407 / C8 卡 :3,684-692,963-971 /
ED-5I 卡 :3,172-181,552-558 / N3-1 卡 :3,3068-3072 / git b9de09d0,9952aa53,e70987d6 /
projects/pal/manifest.json:4。只读审查，未改 capability-map/board/源任务卡，未代签 GLM，
未标任何 done。

### 进入 done 前:审查签字

- Codex: **accept（2026-08-13，自审）**。R1 与 K1-K6 已逐项落地：四卡结构化用户验收回填；
  E18 源卡退 `review` 且地图保持 ❌；W9 引擎/编辑器分别核为 ✅；X1/A7/N2 及额外发现的 N6
  陈旧备注已更新；board/§4/议题18/§5 已校准。文档链接、状态断言、陈旧关键词扫描与
  `git diff --check` 均通过。
- Kimi: **accept（2026-08-13，本人只读终审，非代理）**。逐项独立复核：
  1. **W9 ✅/✅ 分列成立**：引擎列证据为 content13 生命周期/reducer/BattleResult + 用户
     2026-08-12 复验（W9 卡 :607-609、`b9de09d0`）；编辑器列有独立证据——editor v12→v13
     manifest-last overlay、生命周期命令 CRUD、undo/redo、引用保护（W9 卡 :33、:219、:1081），
     GLM 实现复审覆盖「editor v13 引用闭包+删除保护+fail-before-write」（W9 卡 :1031-1033），
     非照抄引擎列（K2 落 ✓）。
  2. **E18 fail-closed 严格执行**：源卡 :3 `Status: review`，done 准入结论改为
     「blocked（三方 accept 齐；仍待用户验收…）」，地图保持 `—/❌`（map :77）并明文
     「three accepts 不能代替用户产品验收」；未代签（K1 落 ✓）。
  3. **K1-K6 全部落地**：四卡结构化用户验收节已回填直接证据且保留历史结论（R1+K4 ✓）；
     X1 epoch 改 SAVE8/content13（map :128，与 `projects/pal/manifest.json:4` 实测一致）、
     A7 候选 11 已删改为「重新核定下一未占用 epoch」（map :158）、N2/N6 备注同步终态
     （map :97、:101）（K3 ✓）；board D15-1 done 行已移除、§4 陈旧推荐已删、议题 18 行
     拆分「W9 done；E18 review（待用户验收）」（map :174）、§5 重跑仅给候选（K5 ✓）；
     B11 注记按 K6 未改（K6 ✓）。
  4. **X3 只是候选**：§5 重跑节标题即「候选，不是承诺」（map :228-236），明文「不等于已开卡
     或已承诺」；本卡用户验收节同样声明「X3 只是选择器候选，未开卡、未承诺」。
  5. **门禁复跑（本人实跑）**：`git diff --check` exit 0；陈旧关键词扫描（`W9/E18 draft`、
     `当前唯一最高优先`、`当前候选 contentVersion 11`、`R13-6`、`不得把 N3-1 标 done`、
     `W1 编辑器侧`）对 map/board 零命中；状态断言（E18-1 :3 = review、W9/C8/ED-5I/N3-1 :3 =
     done、board 无 done 行）逐一成立；地图新增任务卡相对链接目标均存在。
  附议 GLM 的**非阻塞记录项**（本人独立发现同一处）：B11 备注尾注「归 E18（draft）」
  （map :119）中 `draft` 已与 E18 当前 `review` 不一致，建议顺手改为「review，待用户验收」；
  「未完成」语义结论不变，不阻塞 done。
  未修改任何产品实现、地图、board 或源任务卡；未代签 GLM 或用户；未标 done。
- GLM: **accept（2026-08-13，本人四证覆盖/文档一致性终审，非代理）**。R1 + K1-K6 逐项落地，
  五项标准全部通过（见下方「GLM done 前终审证据」）。附 1 条非阻塞观察（B11 E18 标签）。
- counter / 返工处理: none
- 缺签豁免: N/A
- done 准入结论: **allowed（2026-08-13）**——Codex/Kimi/GLM 三方 `accept` 齐，用户明确
  验收 `OPS-MAP-1：通过`。

#### GLM done 前终审证据（2026-08-13，本人；非代理）

**标准 1 — 四证一致性 ✓（本人逐项一手核实）：**

| 项 | Status | 三签 | 用户验收 | git | 地图 | 裁决 |
|---|---|---|---|---|---|---|
| W9 | done ✓ | Codex/Kimi/GLM accept ✓ | **已回填** "accept（2026-08-12）" + `?scene=s006` 复验证据 ✓ | b9de09d0 ✓ | ✅/✅ ✓ | 一致 |
| E18 | **review** ✓ | 三方 accept（技术层）| **pending** ✓（保持 fail-closed）| 9952aa53 ✓ | —/❌ ✓ | 一致（done gate blocked）|
| C8 | done ✓ | 三方 accept ✓ | **已回填** "accept（2026-08-06，联合验收）" ✓ | e70987d6 ✓ | ✅/✅ ✓ | 一致 |
| ED-5I | done ✓ | 三方 accept ✓ | **已回填** "accept（2026-08-06，联合验收）" ✓ | e70987d6 ✓ | (C8 行) ✓ | 一致 |
| N3-1 | done ✓ | P0/P2 分批 accept ✓ | **已回填** "accept（2026-08-06，确认性验收）" ✓ | e70987d6 ✓ | ✅/✅ ✓ | 一致 |

**标准 2 — 结构化用户验收节回填 ✓**：W9（:730+ "accept（2026-08-12）"）、C8（:966+ "accept
（2026-08-06，联合验收）"）、ED-5I（:552+ "accept（2026-08-06，联合验收）"）、N3-1（:3068+
"accept（2026-08-06，确认性验收）"）四卡结构节均已回填，与卡头 Status、git commit `e70987d6`
一致。E18 正确保持 pending。

**标准 3 — E18 fail-closed ✓**：E18 源卡 Status=`review`（不再是 done）；done gate=`blocked（仍待
用户验收）`；地图 E18=`—/❌` + 备注"three accepts 不能代替用户产品验收，故能力格 fail-closed
保持未完成"；议题 18 行拆分"W9 done；E18 review（待用户验收）"。未代签用户。

**标准 4 — 地图/board/选择器无陈旧回归 ✓**：
- W9 地图 `✅/✅`（引擎 + 编辑器 v12→v13 overlay/lifecycle CRUD 独立依据，K2 已核）；C8 地图
  `✅/✅`（无"等待 N3-1"残留）；N3 地图备注不再含"不得把 N3-1 标 done"。
- X1 备注更新为 `SAVE8/contentVersion 13`（不再写 10）；A7 删除"候选 contentVersion 11"；N2
  备注"N3-1 已把实体 Page…发布为 canonical V5"（不再写未完成）。
- §4 删除 W1/E6 陈旧推荐（:201 "E6 调试可视化不再冒充唯一最高优先"）；§5 保留通用算法，
  X3 明确"这只是选择器输出，不等于已开卡或已承诺"。
- board D15-1 done 行已移除。

**标准 5 — Markdown / git ✓（本人实跑）**：
- `git diff --check`：clean。
- 7 个修改文件的 Markdown 相对链接：OK。
- 陈旧关键词扫描：`W9.*draft`=0、`W1.*地图绘制缺`=0、`当前唯一最高优先`=0、
  `当前候选 contentVersion 11`=0、`不得把 N3-1 标 done`=0。

**GLM 非阻塞观察（不阻塞 done）**：
- B11 地图行（:119）仍写"编辑器侧编辑归 E18（draft）"，而 E18 现为 `review`。K6 有意保留
  （"在 K1 fail-closed 下保持正确"）——语义状态（E18 未完成）正确，仅标签从 draft→review 未同步。
  不影响本卡对账正确性；若后续修订地图可顺手把 draft 改 review。

Evidence: W9 卡 :3,730+ / E18 卡 :3,83,407 / C8 卡 :3,966+ / ED-5I 卡 :3,552+ / N3-1 卡 :3,3068+ /
  capability-map.md :62,77,90,97,98,119,128,158,174,201,230-234 / board.md (D15-1 已移除) /
  git diff --check clean / 陈旧关键词扫描全清。只读终审，未改产品实现/地图/源任务卡，
  未代签 Kimi/用户，未标 done。

## Draft: 设计与风险

### 设计结论

先做来源对账，再改地图；先修陈旧状态，再运行选择器。所有更新必须可从四证表回溯，证据冲突优先修源卡，
不能让能力地图成为第五份独立真相。

### 已知风险

- 风险: 历史用户验收存在聊天中但未落卡。
  - 缓解: git diff/任务日志能直接证明的回填；仍无法证明的保持 pending，并只请用户确认具体一项。
- 风险: 广泛对账变成重写整个地图。
  - 缓解: 本卡只处理已发现的明确 stale 项和当前选择器，不改无冲突行。
- 风险: 更新完成状态时误把编辑器/引擎两边混为一谈。
  - 缓解: 每格分别核引擎/编辑器能力与任务范围，不能只以任务名推导两列均 done。

### 主审立场

- Reviewer: Kimi（状态权威/流程边界）+ GLM（四证数据对账/覆盖）
- 结论: **GLM agree + Kimi agree**（双方逐项四证独立对账结论一致；Kimi 增量发现 X1/A7/N2
  三处遗漏陈旧，见 K3）
- 必改项: GLM R1（四卡结构节回填）+ Kimi K1-K6（E18 fail-closed、W9 编辑器列分列核定、
  遗漏陈旧、选择器/看板修正）
- 是否建议进入 build: **是**（三方 premise verified + design agree 齐；R1 与 K1-K6 为
  build 必落钉）

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件:
  - `docs/phase2/capability-map.md`
  - `docs/ops/board.md`
  - `docs/ops/archive/tasks/done/W9-entity-lifecycle-respawn.md`
  - `docs/ops/archive/tasks/done/E18-1-editor-actor-battle-fields.md`
  - `docs/ops/archive/tasks/done/C8-item-use-mechanisms.md`
  - `docs/ops/archive/tasks/done/ED-5I-item-workbench.md`
  - `docs/ops/archive/tasks/done/N3-1-script-control-flow-modernization.md`
  - 本卡
- 实现摘要:
  - 四证成立：W9 升为引擎/编辑器 `✅/✅`，C8 升为 `✅/✅`，N3/N2/N6 备注同步终态；W9、
    C8、ED-5I、N3-1 四卡结构化用户验收节回填直接证据。
  - 四证缺失：E18-1 从误写 `done` 退回 `review`，done gate 改为 blocked，地图保持 `—/❌`；
    未代签用户验收。
  - current epoch 改为 SAVE8/content13/minimumSave8；A7 删除已失效的 contentVersion 11 候选，
    改为开卡时重新核定下一未占用 epoch。
  - board 删除 D15-1 done 行；§4 删除 W1/E6 等陈旧推荐；§5 保留通用算法并记录重跑候选 X3，
    明确“候选不是承诺”。
- 运行命令:
  - `git diff --check`：通过。
  - 8 个修改 Markdown 文件的本地相对链接扫描：通过。
  - 状态断言：E18 源卡=`review`；W9/C8/N3=`✅/✅`；E18=`—/❌`；board 无 done 行：通过。
  - 陈旧关键词扫描：`W9/E18 draft`、`W1 编辑器侧`、`当前唯一最高优先`、
    `当前候选 contentVersion 11`、`N3-1 R13 build` 均无命中。
- 浏览器 / 手工检查: N/A
- 跳过的检查及原因: 产品测试 N/A；本卡只校准文档状态。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: **GLM accept + Kimi accept**（双方独立终审，逐项四证与门禁复跑一致；各附同一条
  非阻塞记录项：B11 注记 `E18（draft）` 标签未随 `review` 同步，见 GLM 终审证据末节与 Kimi
  accept 附议）
- 必须返工项: 无
- Accept / rework: **accept（三方齐）；待用户验收后转 done**

## 用户验收

- 用户结论: **accept（2026-08-13）**。用户明确回复 `OPS-MAP-1：通过`。
- 后续任务: 无。X3 仍只是选择器候选，未开卡、未承诺；E18-1 产品验收继续独立处理。

## 交接日志

- 2026-08-13 User: 指示继续推进。Evidence: 当前会话。Next: Codex 先提交 D15/OPS-TRUTH，随后
  按新制度建立地图真值对账卡。
- 2026-08-13 Codex: D15-1 与 OPS-TRUTH-1 已分别提交 `18ebeb44` / `81ac410b`，工作树归零；只读
  扫描发现 W9/E18/C8/N3/selector/board 明确不一致，建立本卡并签 premise/design。Next: Kimi / GLM
  独立四证审查；签字前不得修改 capability-map 或源任务状态。
- 2026-08-13 GLM: 签 premise verified + design agree（逐项四证表 + 必改项 R1 结构节回填）。
- 2026-08-13 Kimi: 签 premise verified + design agree（附必改项 K1-K6）。独立核对五卡三提交，
  结论与 GLM 一致；增量发现 X1/A7/N2 三处遗漏陈旧（contentVersion 实测 13、A7 候选 11 已被占、
  N2 备注未随 N3-1 done 更新）。三方设计签字齐，build 准入 allowed。Next: Codex build，落实
  GLM R1 + Kimi K1-K6；E18 保持 fail-closed，收口后向用户提唯一确认项（E18-1 是否已验收）。
- 2026-08-13 Codex: build 完成并签自审 `accept`。R1/K1-K6 全部落地；额外清除 N6 的 R13 build
  陈旧注记；链接、状态断言、陈旧关键词和 diff 门禁通过。Next: Kimi + GLM 只读 review；不得在
  两方 accept 和用户验收前标 `done`。
- 2026-08-13 GLM: done 前终审 **accept**（五项标准逐项通过，附 B11 `E18（draft）` 标签非阻塞
  观察）。
- 2026-08-13 Kimi: done 前终审 **accept**（本人只读复核：W9 编辑器列独立证据成立、E18 严格
  fail-closed、K1-K6 全落、X3 仅为候选、`git diff --check` 与陈旧扫描本人复跑通过；独立发现
  同一处 B11 标签记录项，附议 GLM）。三方 accept 齐。Next: 用户验收本卡对账结果，并单独确认
  E18-1 是否已验收；用户确认前本卡保持 review，X3 不开卡不承诺。
- 2026-08-13 User: 明确验收 `OPS-MAP-1：通过`。三方 review 与用户验收齐，本卡转 `done` 并从
  进行中看板移除。用户另确认“E18-1 就这样做”，仅作为当前设计方案确认，未写成产品实操验收。

## 下一位 Agent 提示词

```text
无下一位 Agent 提示词——OPS-MAP-1 三方 done 前 accept 与用户验收均已齐，任务已收口。
X3 只保留为选择器候选；E18-1 产品验收继续作为独立事项，不由本卡代签。
```
