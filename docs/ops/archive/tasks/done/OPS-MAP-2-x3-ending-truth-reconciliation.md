# OPS-MAP-2 - X3 通关/结局流转真值纠偏

Status: done
Phase: ops
Capability: X3 / capability-map truth
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi + GLM
Visual Verification Owner: Q1 集中 E2E 批次（本卡只做文档真值纠偏）
Visual Verification Timing: e2e-deferred
Unavailable Agents: none
Branch: codex/d15-movement-premise-gate

## 目标

纠正 `docs/phase2/capability-map.md` 对 X3「通关/结局流转全无」的陈旧判断。现有一手代码、PAL
生成内容、R2 三方审查、用户验收和 git 提交共同证明：二阶段已经具备可作者化的结局视频序列与回标题
流程，且 s281 原版结局链已经实际跑通。本卡只恢复路线图真值并重跑下一步选择器，不新增产品实现。

## 范围

- 范围内:
  - 对账原版 `0xA0`、一阶段结局实现、当前二阶段 `quitToTitle` 全链与 R2 完成证据；
  - 将 X3 从 `⚠️ / —` 纠正为 `✅ / —`，更新其说明；
  - 将回归沙盒「通关/结局流转」从 `❌` 纠正为 `✅`；
  - 从 §4 候选池和 §5 本轮首选中移除 X3，按真实剩余半 done 格重跑选择器；
  - 将 s281 最终战→结局演出→回标题登记为 Q1 全流程 E2E 的最终段，并从 roadmap R6 产品缺口中
    移除 X3；
  - 明确「X3 已完成」与「未来可新增更丰富的多结局/结局编排能力」不是同一结论。
- 范围外:
  - 不修改 `packages/*`、`projects/pal`、schema、migration、save 或资源文件；
  - 不重复执行 s281 数百段剧情 E2E；复用 R2 已冻结的双路径视觉/运行证据；
  - 不以本卡承诺新的多结局系统、结局时间轴编辑器或 DOS fallback 精确复刻；
  - 不在 X3 纠偏前直接启动其替代候选的产品实现。
- 明确不做:
  - 不因能力还能增强就把已存在、已作者化、已验收的基础闭环继续标为缺失；
  - 不把原版引擎 GPL credits 当成 PAL 游戏内容缺口；
  - 不把 R2 的完成证据仅解释为「迁移 opcode」，忽略其 schema/runtime/editor/content/E2E 全链。

## 前提真值门

### 一句话行为 / 工程前提

原版在结局脚本 `0xA0` 播放 Win95 结局视频后退出；一阶段把浏览器适配为 4/5/6 视频后回标题；
二阶段已经把同一行为收敛成作者可编辑的 `quitToTitle(videos[])`，PAL s281 全链和回标题均已验收，
所以当前地图「结局序列全无」为假。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | s281 尾部源命令为 `0xA0`；SDLPal Win95 路径按 4、5、6 AVI 播放结局，随后 credits/shutdown | `data/extracted/events/scene-281.json:1160-1167`; `reference/sdlpal/script.c:2988-2996`; `reference/sdlpal/ending.c:396-485` |
| 第一阶段 | `0xA0` 已实现；Win95 播 4/5/6 MP4 后回标题，DOS 有完整 fallback 编排；引擎 GPL credits 按既有用户裁决跳过 | `docs/phase1/status/opcode-status.md:33,206`; `packages/game/src/shell/bootstrap.ts:1383-1508,1741-1777` |
| 当前二阶段 schema / authoring | `Command` 有 `quitToTitle` 与可选 `AssetId[]`，严格验证；编辑器提供「返回标题前播放的视频」逐行编辑表单 | `packages/content/src/script.ts:167,613-621`; `packages/editor/src/ui/CanonicalScriptEditorV5.tsx:1898-1920` |
| 当前二阶段 migration / content | `0xA0` 稳定迁为 `quitToTitle(video.pal.004/005/006)`；PAL s281 实际包含该命令，三段视频均在资源注册表 | `packages/migrate/src/translate-events.ts:2065-2070`; `packages/migrate/src/translate-events.test.ts:836-844`; `projects/pal/content/scenes/s281.json:1220-1225`; `projects/pal/assets/index.json:1096-1129` |
| 当前二阶段 runtime | runner 分派该命令；主机先播放视频序列，再导航到干净标题入口 `?menu&skip-startup=1` | `packages/reforge/src/script-runner.ts:683-684`; `packages/reforge/src/main.ts:3733-3740` |
| 完成证据 | R2 状态 done，Capability 明列 X3；三方 implementation accept；用户 2026-07-14 明确「齐了」；提交已在 HEAD；s281 全链两条独立浏览器路径均到 `?menu` 且零错误 | `docs/ops/archive/tasks/done/R2-script-single-model.md:3-5,357-375,385-408`; commit `76df4665a67ce7665b9a848c072fc1205bbc8c16` |
| 本任务目标 | 不改变行为，只把地图与上述已存在能力恢复一致，并重新选择真正未完成的格 | 本卡验收条件 |

### 四证对账

| 证据 | 结论 |
|---|---|
| Task status | `R2-script-single-model.md` 为 `done`，Capability 包含 X3 |
| 三方 done 前审查 | Codex、Opus（现役迁移前历史签字有效）、GLM 均 `accept`，无返工项 |
| 用户验收 | 2026-07-14 用户确认「齐了」，任务卡用户结论为 done |
| Git | `76df4665`（R2 单一脚本运行时）在当前 HEAD；`b99d4fb7` 后续补全过场资源闭包/作者工作台 |

### 反证与替代解释

- 最强替代解释 1: 当前只有 PAL 专用的硬编码结局，不是通用作者能力。
  - 反证: schema 接受任意 `videos?: AssetId[]`，编辑器可以逐行配置，runtime 按列表顺序播放；PAL 的
    004/005/006 只是一个具体内容实例。
- 最强替代解释 2: 没有独立「多结局编辑器」或复杂结局时间轴，因此 X3 仍只能算半完成。
  - 边界: X3 当前定义是「标题/流程/结局」与「新游戏/通关」。作者可在任意脚本前置剧情/战斗/视频，
    最后用 `quitToTitle` 收口；这已经完成该格的基础闭环。多结局分支、专用时间轴或更高级模板若有真实
    用户需求，应按发现协议作为新能力/增量另行评估，不能倒写成当前实现不存在。
- 最强替代解释 3: 第一阶段对精确视听仍记录 partial，所以二阶段 X3 不能完成。
  - 反证: 一阶段 partial 是 DOS fallback/视听精调风险；二阶段 X3 的能力口径是可执行、可作者化、可回
    标题的结局流转。R2 已对当前 PAL Win95 结局做 8,438 帧独立视觉审计和真实导航验证。
- 什么观察会推翻当前前提:
  - `quitToTitle` 无法由编辑器保存/重开，或 runtime 不消费配置的视频数组；
  - s281 生成内容不再包含该命令/视频资产，或 R2 用户验收证据并非针对结局回标题；
  - X3 在地图的正式定义另有尚未实现的硬性验收项，而非当前「新游戏/通关」文字。
  当前一手证据均不支持这些反例。
- audit 红项如适用，已排查的替代根因:
  - runtime 语义 / 命令分类: schema、runner、host 三层均直接核对；
  - 原版 / 第一阶段理解: 原版源码、extracted s281 与一阶段真实实现一致；
  - extractor / 地图 / 数据解码: extracted `opcode:160` 与生成 `quitToTitle` 一一对应，并有迁移单测；
  - audit / test model: 不以单测单独下结论，另有真实 s281 E2E、双浏览器视觉证据和用户验收。

### 用户可见偏离

- 是否主动偏离已核真值: no
- `before -> after` 一句话: 产品行为不变；路线图从「结局序列全无」改为「结局视频序列 + 回标题已完成」。
- 代表场景: s281 拜月最终链 → 4/5/6 视频 → `?menu` 标题入口。
- 用户裁决: 2026-08-13 用户明确判断「关于这个任务更像是 E2E 的一部分」。据此冻结边界：X3
  已实现，s281 结局链后续属于 Q1 集中 E2E，不再作为新的产品实现任务；本卡仍完成地图真值纠偏。

## 上下文锚点

- 已拍板决策 / 铁律:
  - `AGENTS.md`：capability-map 状态变化必须三方介入；关键前提 unknown 时必须停；Opus 历史签字
    按席位迁移规则保留有效；
  - `docs/phase2/READ-FIRST.md`：二阶段以 clean semantic command 和可作者化内容为目标，不复制原 opcode
    第二解释器；
  - `docs/phase2/capability-map.md:203-239`：选择器以地图当前真值为输入，一轮一承诺。
- 代码 / 文档锚点: 见真值矩阵；另见 `docs/ops/archive/tasks/done/R2-script-single-model.md` 完整验收记录。
- 已知坑 / 审计文档:
  - OPS-MAP-1 只按当时地图行重跑选择器，没有对 X3 候选再做产品前提核验；
  - 「任务已经完成但能力地图仍写缺失」与此前 W9/C8/N3 陈旧状态属于同类治理故障；
  - 任务选择器只能产生候选，候选在开卡前仍必须过原版/一阶段/当前实现 premise gate。
- 不得重新引入:
  - 只看 capability-map 当前符号就假设实现缺失；
  - 只搜一个命令名而不检查可作者性、实际 PAL 内容、runtime 和用户验收；
  - 用「还可以更强」否定已经闭合的基础能力；
  - 纠偏卡中顺手写产品代码。
- 相关测试 / 证据:
  - `packages/migrate/src/translate-events.test.ts:836-844`；
  - R2 的 s281 双路径 E2E 与 8,438 帧视觉审计；
  - `git merge-base --is-ancestor 76df4665 HEAD`。

## 验收条件

- 功能: N/A；产品行为与生成内容零变化。
- 文档:
  - X3 改为 `✅ / —`，说明准确覆盖标题、新游戏、读档、入场事务、结局视频序列与回标题；
  - §4 候选池不再包含 X3；§5 删除 X3 首选，按剩余真实半 done 格给出新的候选；
  - 回归沙盒「通关/结局流转」改为 `✅`，附 R2 与 s281 证据；
  - roadmap 把 s281 结局链归入 Q1 全流程最终段，并从 R6 待补能力中移除 X3；
  - 不宣称具备未实现的专用多结局/时间轴系统。
- 测试:
  - 四证扫描确认 R2 task/三签/user/git 全成立；
  - 静态扫描不再出现「X3 只缺通关」「结局序列全无」等当前态陈旧文案；
  - `git diff --check` 与 Markdown 链接检查通过。
- 视觉 / 手工验证: 不重复长剧情 E2E；复用 R2 已冻结的 Codex + Opus 两条独立 s281 证据。
- E2E 用例登记: `R2-script-single-model.md` 已登记并完成，入口 s281 e4800，预期最终
  `quitToTitle -> ?menu`、6 段 RNG/对话无闪回、控制台零错误。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: **verified（2026-08-13）**。原版 `script.c/ending.c`、一阶段 `bootstrap.ts`、二阶段
    schema/migration/PAL/runtime/editor 与 R2 四证逐层核对，均指向 X3 已闭合；地图当前文案为陈旧错误。
  - design: **agree（2026-08-13）**。只做真值纠偏和选择器重跑，不改产品代码，不扩写成多结局承诺。
- Kimi:
  - premise: **verified（2026-08-13，本人只读独立核证，非代理）**。能力边界/架构反证逐项一手
    核实，五条证伪路径均不成立（见下方「Kimi 独立反证审查」）。地图 X3「结局序列全无」
    （`docs/phase2/capability-map.md:130`、§6 :261）确为陈旧错误。
  - design: **agree（2026-08-13，附三条 build 注意项）**。docs-only 纠偏方向正确；
    注意项：① §6 回归沙盒 :261「结局序列全无」必须与 X3 行同步改为 ✅ 并附 R2/s281 证据
    （验收条件已含，落实时不得遗漏）；② §4 :190 与 §5 :232 的 X3 候选文案同步移除，新候选
    保持「候选不是承诺」；③ X3 说明只写已实现的通用命令/视频列表/回标题，不宣称专用多结局
    或时间轴系统。
- GLM:
  - premise: **verified（2026-08-13，本人独立四证 + 证伪尝试）**。逐层独立核实原版 0xA0 → 一阶段 →
    二阶段 schema/migration/runtime/editor/PAL content → R2 E2E 四证，并主动尝试从四个角度证伪"X3
    基础闭环已完成"（通用性、真实运行、R2 四证、隐藏硬门）——四条证伪路径全部失败。地图"结局序列
    全无"为陈旧错误。详见下方「GLM 独立反证审查」。
  - design: **agree（2026-08-13）**。只做真值纠偏和选择器重跑，不改产品代码；X3 基础闭环与未来
    多结局增强边界划分正确。
- 独立反证审查（至少一位非 Coding Owner 必填）:
  - 审查者: GLM（本人）
  - 独立证据锚点: 见下方「GLM 独立反证审查」逐层证据表
  - 可证伪观察: 见下方四条证伪尝试与结论
- counter / 分歧处理: none
- 缺签豁免: N/A
- build 准入结论: **allowed（2026-08-13）**——Codex/Kimi/GLM 三方 `premise verified` +
  `design agree` 齐；Kimi 三条 build 注意项（§6 同步、§4/§5 移除 X3、不夸大多结局）为
  build 必落项，不阻塞准入。

#### GLM 独立反证审查（2026-08-13，本人；非代理）

**premise verified — 逐层独立核实 + 四条证伪尝试全部失败：**

| 层 | 本人一手核实 | 结论 |
|---|---|---|
| 原版 0xA0 | `script.c:2988-2996` `case 0x00A0: if(WIN95) PAL_EndingScreen(); PAL_AdditionalCredits(); PAL_Shutdown(0)` | ✓ 结局 = 播视频 + credits + 退出 |
| 一阶段 | `opcode-status.md:33` "0xA0 quit/ending: ✅ 已实现"; `bootstrap.ts:989-990` WIN95 结局 4→5→6 | ✓ 已实现回标题 |
| 二阶段 schema | `script.ts:167` `\| { kind:'quitToTitle'; videos?: AssetId[] }` + `:613-621` 严格验证 videos 为可选 AssetId 数组 | ✓ 通用可作者化 |
| 二阶段 migration | `translate-events.ts:2065-2070` `0xa0 → quitToTitle(videos:[004,005,006])`; `:836-844` 迁移单测 | ✓ 稳定迁移 |
| 二阶段 runtime | `script-runner.ts:683-684` `case 'quitToTitle': return h.quitToTitle?.(cmd.videos)`; `main.ts:3733-3740` host 播视频序列 → `?menu&skip-startup=1` | ✓ 真实运行 |
| 二阶段 editor | `CanonicalScriptEditorV5.tsx:1898-1920` 逐行视频编辑表单 | ✓ 可作者编辑 |
| PAL s281 实际内容 | `s281.json` 实含 `{"kind":"quitToTitle","videos":["video.pal.004","video.pal.005","video.pal.006"]}` | ✓ 生成内容存在 |
| R2 四证 | Status=done(:3) + Codex/Opus/GLM accept(:166-177) + 用户"齐了"(:387) + `76df4665`∈HEAD + Capability 含 X3(:5) | ✓ 全齐 |

**四条证伪尝试（全部失败 → premise 成立）：**

1. **"quitToTitle 只是 PAL 硬编码特例，不可作者化"** → **证伪失败**。schema `videos?: AssetId[]`
   接受任意视频；编辑器有逐行表单；PAL 的 004/005/006 只是一个内容实例。创作者可在任意脚本末尾
   添加 `quitToTitle(videos: ['any.video.id'])`。
2. **"s281 没有真实跑通，只验了迁移"** → **证伪失败**。R2 卡 :169 记录 6051 独立浏览器复验：
   s281 e4800 真实 touch 触发 → 19 组前置对话 → 最终战 → 6 段 RNG 完整链 → quitToTitle → `?menu`
   导航，8,438 帧 rAF 逐帧采样 worldFlash=0/dlgNoLayer=0，console 零错误。
3. **"R2 四证不齐"** → **证伪失败**。Status=done；Codex accept(:166) + Opus accept(:167，席位迁移
   有效) + GLM accept(:174)；用户 2026-07-14 "齐了"(:387)；`76df4665` ∈ HEAD（本人 `git merge-base
   --is-ancestor` 确认）。
4. **"X3 正式定义另含未实现硬门（多结局/时间轴编辑器）"** → **证伪失败**。X3 定义为"标题/流程/结局"
   与考试用例"新游戏/通关"（map :130）。标题+新游戏+读档+入场事务（X3-1 done）+ 结局视频序列+
   回标题已闭合。多结局分支/专用时间轴是未来新能力（§8 发现协议另开格），不是当前格的硬门。

**地图陈旧状态确认：**
- `capability-map.md:130` X3 行写"缺通关/结局流转(❌)"——与上述全链证据矛盾，陈旧错误。
- `:261` §6 回归沙盒"通关/结局流转 | ❌ | 结局序列全无"——陈旧。
- `:190` §4"X3…只缺通关/结局流转"——陈旧。
- `:232` §5"首选候选为 X3（通关/结局流转）"——陈旧（候选会推荐已完成能力）。

**design agree**：只纠偏地图真值 + 重跑选择器，不改产品代码；X3 基础闭环与未来多结局增强边界
划分正确（设计结论 §3）。X3 编辑器列 `—` 合理（quitToTitle 经脚本创编，非独立"结局编辑器"能力）。

**可证伪观察**：若 `quitToTitle` 无法经编辑器保存/重开，或 s281 生成内容不再包含该命令/视频资产，
或 R2 用户验收并非针对结局回标题——前提失效。当前一手证据均不支持这些反例。

Evidence: `script.c:2988-2996` / `opcode-status.md:33` / `script.ts:167,613-621` /
`translate-events.ts:2065-2070` + `:836-844` / `script-runner.ts:683-684` / `main.ts:3733-3740` /
`CanonicalScriptEditorV5.tsx:1898-1920` / s281.json 含 quitToTitle / R2 卡 :3,5,166-177,387 /
`76df4665` ∈ HEAD / capability-map.md :130,190,232,261。只读审查，未改产品实现/地图/源任务卡，
未代签 Kimi，未标 build/done。

#### Kimi 独立反证审查（2026-08-13，本人；非代理；能力边界/架构角度）

**方法**：一手读取原版/一阶段/二阶段/schema/migration/PAL 产物/runtime/editor/R2 全链锚点，
以「证伪 X3 基础闭环已完成」为目标逐层尝试推翻。与 GLM 结论独立一致；以下为本人证据与
增量架构检查。

**五条证伪路径（全部不成立 → premise 成立）：**

1. **「quitToTitle 是 PAL 硬编码特例，不可作者化」→ 不成立**。schema 为通用
   `videos?: AssetId[]`（`packages/content/src/script.ts:167`）+ 严格校验（:613-621）；
   编辑器逐行表单任意增删、空列表回落 `undefined`（`CanonicalScriptEditorV5.tsx:1898-1923`）；
   runtime 按传入列表播放后统一导航（`main.ts:3734-3739`）。`video.pal.004/005/006` 只出现在
   迁移输出（`translate-events.ts:2065-2070`）与 PAL 内容实例（`s281.json:1220-1225`），
   不构成能力层耦合。
2. **「s281 未真实跑通」→ 不成立**。R2 冻结两条相互独立的浏览器证据：Codex Playwright 路径
   与 Opus chrome-devtools CDP 路径（R2 卡 :357-375），8,438 帧 rAF 采样 worldFlash=0 /
   dlgNoLayer=0，终态导航 `?menu`，console 零错误。本卡按范围复用该冻结证据，未重复跑长剧情
   E2E；但代码锚点本人已按当前工作树逐一重读，未漂移。
3. **「R2 四证不齐 / 用户验收与结局无关」→ 不成立**。R2 卡 :3 `Status: done`、:5 Capability
   含 X3；Codex + Opus + GLM 三签 accept（Opus 为 2026-07-18 席位迁移前历史签字，按 AGENTS.md
   规则保留有效）；用户 2026-07-14「齐了」（R2 卡 :387），其验收对象正含 s281 结局回标题
   复验（:372-375 Opus 独立复验明确覆盖 `quitToTitle 后 ?menu`）；`76df4665`、`b99d4fb7`
   均经本人 `git merge-base --is-ancestor` 确认在 HEAD。
4. **「X3 正式边界另含未实现硬门」→ 不成立**。地图 X3 行（map :130）自列构成：标题屏、
   新游戏、读档、入场事务（X3-1 done 2026-07-15）均已完成，唯一缺口文字即「通关/结局流转」；
   格定义与考题（新游戏/通关）均不含多结局分支或专用时间轴。该缺口由 `quitToTitle` 全链闭合，
   X3 无剩余硬门。
5. **架构增量检查：静默 no-op 风险 → 不成立**。runner 用可选链 `h.quitToTitle?.(...)`
   （`script-runner.ts:683-684`），宿主缺失时会静默跳过；但宿主已在 `main.ts:3733-3740`
   实现（先 `resetFrameAnimationPresentation` 清呈现态、再 `playVideoSequence`、最后
   `?menu&skip-startup=1` 干净重启），且 R2 E2E 实证导航真实发生。另核迁移单测
   `translate-events.test.ts:836-844` 直接断言 `0xA0 → quitToTitle(004/005/006)`。

**陈旧状态确认（本人一手）**：map :130 X3 行「缺通关/结局流转(❌)」、:190 §4 候选、
:232 §5 首选、:261 §6「结局序列全无」均与上述全链证据矛盾。

**可证伪观察**：① 若编辑器保存/重开后 `videos` 丢失或 runtime 不消费配置数组，前提失效；
② 若 s281 生成内容或 `assets/index.json` 中三段视频资产被移除，前提失效（本人已实测三者
均在册）；③ 若用户否认 2026-07-14「齐了」针对结局链，R2 证明③失效；④ 若 X3 格定义被正式
修订为包含多结局/时间轴硬门，则本结论仅覆盖旧定义边界。当前一手证据均不支持任一反例。

Evidence: `data/extracted/events/scene-281.json:1160-1167` / `reference/sdlpal/script.c:2988-2996` /
`reference/sdlpal/ending.c:418-485` / `docs/phase1/status/opcode-status.md:33,206` /
`packages/game/src/shell/bootstrap.ts:1741-1777` / `packages/content/src/script.ts:167,613-621` /
`packages/editor/src/ui/CanonicalScriptEditorV5.tsx:1898-1923` /
`packages/migrate/src/translate-events.ts:2065-2070` + 测试 `:836-844` /
`projects/pal/content/scenes/s281.json:1220-1225` / `projects/pal/assets/index.json`（video.pal.004/005/006）/
`packages/reforge/src/script-runner.ts:683-684` / `packages/reforge/src/main.ts:3733-3740` /
R2 卡 :3,5,357-375,385-388 / git `76df4665`、`b99d4fb7` ∈ HEAD / capability-map.md :130,190,232,261。
只读审查，未改产品实现/地图/源任务卡，未代签 GLM，未标 build/done。

### 进入 done 前:审查签字

- Codex: **accept（2026-08-13；Kimi R1/R2 返工后重签）**。docs-only build 完成；X3/§4/§5/§6
  与 roadmap Q1/R6 已同步，用户 E2E 分类裁决已落实；另修正 C8 沙盒行、R2 推荐表状态与 A7-4
  陈旧 v11 候选。链接、状态、陈旧词和 diff 门禁通过。
- Kimi: **accept（2026-08-13，R1/R2 返工聚焦复验后改签；此前 counter 按事实保留于下）**。
  复验（本人实跑，仅核 R1/R2 与门禁，未扩大为全面复审）：
  - **R1 ✓**：`capability-map.md:257` §6「机制与剧情道具」已改 `✅`，备注明确指向
    C8/N3-1/ED-5I 2026-08-06 联合验收与 `e70987d6`（100 runnable / 0 item-use diagnostics，
    私有脚本/放置/通用机制/无影毒 throw 闭合、MG2 与运行时回归通过）；「仍为 ⚠️ 只因 N3-1
    未终态」陈旧文字已删。
  - **R2 ✓**：`roadmap.md` 推荐表 R2 行已标 done（2026-07-14 三方复验 + 用户验收）；R3/A7
    行改为「当前发布链已占用 contentVersion 11/12/13，A7-4…开卡时必须重新核定下一未占用
    epoch，不预先承诺固定版本号」，「当前候选 v11」已删，与 `capability-map.md:158` 一致。
  - **门禁复跑**：`git diff --check` 通过；「当前候选 v11」「待复验」「仍为 ⚠️ 只因 N3-1」
    在 map/roadmap 零命中。
  未改任何文件，未代签 GLM/用户，未标 done。
  <历史 counter（2026-08-13，已闭环）>：X3 纠偏本体四项核查全部通过（X3=✅/— 四证充分且不
  夸大、s281 归 Q1 且 R6 移除 X3、§4/§5 候选池与本人 ⚠️ 全量枚举 :59,73,83,110,113,131,158
  逐项一致、C1 作为候选符合选择器规则且「候选不是承诺」明文保留）；但发现两处同文件陈旧状态
  与已校准真值直接矛盾：
  - **R1**：`capability-map.md:257` §6「机制与剧情道具」行仍为 `⚠️`（与 C8 done/`e70987d6`
    矛盾，OPS-MAP-1 遗漏的 §6 陈旧行）。
  - **R2**：`roadmap.md:194` 仍写 A7-4「当前候选 v11」（11/12/13 已被占用，与地图 :158 矛盾）。
- GLM: **accept（2026-08-13，本人文档覆盖/状态一致性终审，非代理）**。四项标准逐项通过
  （见下方「GLM done 前终审证据」）。docs-only build 正确：X3 ✅/— 有 R2 四证支持且不夸大；
  s281 归 Q1、R6 移除 X3、§4/§5/§6 无陈旧；C1 为候选非承诺；git diff --check + 陈旧词扫描全清。
- counter / 返工处理: **已闭环（2026-08-13）**：Kimi counter 的 R1/R2 已由 Codex 返工，
  Kimi 聚焦复验通过并改签 accept。
- 缺签豁免: N/A
- done 准入结论: **三方 accept 齐（Codex/Kimi/GLM，2026-08-13），用户已于 2026-08-14 最终验收通过**

#### GLM done 前终审证据（2026-08-13，本人；非代理）

**标准 1 — X3=✅/— 被 R2 四证充分支持，不夸大 ✓**：
- `capability-map.md:130` X3 = `✅ / —`，说明只陈述已实现能力：`quitToTitle(videos[])` 可作者化命令、
  PAL s281 播 004/005/006 后回 `?menu`、R2 双路径 E2E + 三方审查 + 用户验收。无"专用多结局工作台"
  或"时间轴编辑器"措辞；明确写"持续通关回归归 Q1 全流程 E2E，不另开 X3 产品卡"。
- R2 四证已在前一轮独立核实（done + Codex/Opus/GLM accept + 用户"齐了" + 76df4665∈HEAD）。

**标准 2 — s281 归 Q1、R6 移除 X3、§4/§5/§6 同步无陈旧 ✓**：
- `roadmap.md:176` R5 最终段覆盖"s281 最终战→结局演出→quitToTitle 回标题"。
- `roadmap.md:177` R6 "X3 结局流已由 R2 完成，不再列为产品缺口"。
- `capability-map.md:262` §6 通关/结局流转 = `✅`（原 `❌`），附 R2/s281 证据 + Q1 归属。
- `:231` §4 "X3 已从产品候选移除"。
- `:233` §5 首选候选 = C1（原 X3）。
- 陈旧词扫描（本人实跑）：`缺通关/结局流转`=0、`结局序列全无`=0、`首选候选为 X3`=0、
  `X3 只缺`=0；X3 不出现在 `⚠️` 扫描中。

**标准 3 — C1 作为候选（非承诺）符合剩余格与选择器 ✓**：
- `:233-238` C1（角色 CRUD 七环）为首选候选，理由为"直接阻塞从空白工程创作完整 RPG"；
  B2 为下一同级候选。明确写"这只是选择器输出，不等于已开卡或已承诺。若用户选择 C1，仍须
  另开任务卡……集齐三方设计签字后再实现"。符合选择器"候选不是承诺"纪律。

**标准 4 — git diff --check / 相对链接 / 状态/陈旧词扫描 ✓（本人实跑）**：
- `git diff --check`：clean。
- 4 个修改文件 Markdown 相对链接：通过。
- 陈旧词扫描：4 项均 0 命中。
- board.md：OPS-MAP-2 行为 review，无陈旧 done 行。

Evidence: capability-map.md :130,231,233-238,262 / roadmap.md :176-177,184 / board.md :16 /
  git diff --check clean / 陈旧词扫描全清。只读终审，未改产品实现/地图/源任务卡，
  未代签 Kimi/用户，未标 done。

## Draft: 设计与风险

### 设计结论

1. 以 X3 当前格定义「标题/流程/结局；新游戏/通关」为验收边界。
2. 用原版→一阶段→二阶段 schema/migration/content/runtime/editor→R2 E2E 的纵向证据证明该边界已完成。
3. 地图只描述已存在能力，不把未来增强项塞回基础格；若审查者识别出真实新能力，按 §8 发现协议另开格。
4. s281 最终战→结局演出→回标题作为 Q1 全流程 E2E 的最终段持续回归；不再为它开 X3 产品卡。
5. 删除错误候选后重新运行选择器；新候选仍只是候选，必须另开产品卡并重新过 premise gate。

### 已知风险

- 风险: 把「能用脚本组合多个结局」夸大成「已有专用多结局工作台」。
  - 缓解: X3 说明只写已实现的通用脚本命令、视频列表和回标题，不写专用编排器。
- 风险: 复用旧 E2E 掩盖后来回归。
  - 缓解: 本卡是状态对账，不改产品；后续全仓回归仍可发现功能回归。若代码证据已漂移，审查必须 counter。
- 风险: 新候选再次由陈旧文字驱动。
  - 缓解: 新候选只在纠偏后输出；真正开卡前强制再核 task/git + 原版/一阶段/当前实现。

### 主审立场

- Reviewer: GLM（覆盖/状态对账主审）+ Kimi（能力边界反证）
- 结论: **GLM agree + Kimi agree**（双方独立证伪路径全部失败，结论一致）
- 必改项: Kimi 三条 build 注意项——① §6 :261 与 X3 行同步改 ✅ 并附 R2/s281 证据；
  ② §4 :190、§5 :232 的 X3 候选文案同步移除；③ X3 说明不宣称专用多结局/时间轴系统
- 是否建议进入 build: **是**（三方 premise verified + design agree 齐）

### 三方争议记录(按需)

- Codex: X3 基础闭环已完成；未来多结局/专用时间轴是新增增强，不是现有缺口。
- Kimi: 无争议。五条证伪路径（PAL 硬编码/s281 未跑通/R2 四证缺/隐藏硬门/宿主静默 no-op）
  全部不成立；X3 格定义内无剩余硬门，多结局增强属未来新格。
- GLM: 无争议。四条证伪路径失败；X3 编辑器列 `—` 合理（quitToTitle 经脚本创编，非独立
  结局编辑器）。
- 用户拍板: 2026-08-13 明确将结局链归为 E2E 的一部分。

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件:
  - `docs/phase2/capability-map.md`
  - `docs/phase2/roadmap.md`
  - `docs/ops/board.md`
  - 本卡
- 实现摘要:
  - X3 从 `⚠️ / —` 纠正为 `✅ / —`，说明只陈述已实现的 `quitToTitle(videos[])`、PAL s281
    004/005/006 视频序列与回标题，不宣称专用多结局/时间轴工作台；
  - §4/§5 移除 X3 产品候选，§6「通关/结局流转」改为 `✅`；
  - 按用户裁决把 s281 最终链归入 roadmap Q1 全流程 E2E 最终段，并从 R6 产品缺口移除 X3；
  - 选择器基于剩余真实半 done 格重跑，输出 C1 角色 CRUD 为新首选候选、B2 为下一同级候选，
    同时保留「候选不是承诺」。
  - 按 Kimi counter 最小返工：§6 C8 道具机制由陈旧 `⚠️` 改为 2026-08-06 联合验收后的 `✅`；
    roadmap R2 推荐表同步 done，A7-4 删除已失效的 contentVersion 11 候选，改为开卡时重新核定。
- 运行命令:
  - `git diff --check`：通过；
  - 4 个修改 Markdown 文件本地相对链接扫描：通过；
  - 状态断言：X3=`✅/—`、沙盒结局=`✅`、X3 不在 `⚠️` 扫描、Q1 拥有 s281 最终段、R6 不再
    把 X3 当产品缺口、C1 只作为候选：全部通过；
  - 当前态陈旧词扫描：`缺通关/结局流转`、`结局序列全无`、`首选候选为 X3` 在
    `capability-map.md`/`roadmap.md` 中零命中。
  - Kimi counter 返工扫描：C8 沙盒行=`✅`；roadmap 无 `当前候选 v11`/`build 已完成，待复验`；
    A7-4 明文要求开卡时重核 epoch：通过。
- 浏览器 / 手工检查: N/A（复用 R2）
- 跳过的检查及原因: 产品测试与剧情浏览器 E2E 未重复执行；本卡零产品改动，s281 后续回归按用户裁决
  归 Q1 集中 E2E。

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: **GLM accept + Kimi accept（counter 已闭环改签）**。X3 纠偏本体双方确认成立；
  Kimi counter 的 R1/R2 两处跨文档陈旧已由 Codex 修复并经 Kimi 聚焦复验通过。
- 必须返工项: 无（R1/R2 已完成并复验）
- Accept / rework: **accept（三方齐）；用户已最终验收，任务收口**

## 用户验收

- 用户结论: **通过（2026-08-14）**
- 验收原文: `OPS-MAP-2：通过`
- 后续任务: s281 结局链的持续回归归 Q1 集中 E2E；X3 纠偏后重跑选择器产生的候选仍须另开卡，
  不由本卡自动承诺或启动。

## 交接日志

- 2026-08-13 Codex: X3 开工前 premise gate 发现地图陈旧；完成原版、一阶段、二阶段全链与 R2 四证
  对账，创建本卡但未修改产品代码/能力地图。Evidence: 本卡真值矩阵。Next: Kimi + GLM 独立反证并签
  premise/design；三签齐后 Codex 才执行 docs-only build。
- 2026-08-13 User: 裁决结局流更应属于 E2E。Codex 将其归入 Q1 全流程最终段；X3 不再开产品卡，
  OPS-MAP-2 只做 capability-map/roadmap 真值纠偏。Next: Codex docs-only build。
- 2026-08-13 GLM: 签 premise verified + design agree（四条证伪路径全部失败，逐项四证表）。
- 2026-08-13 Kimi: 签 premise verified + design agree（能力边界/架构反证：五条证伪路径全部
  不成立，含宿主可选链静默 no-op 增量检查；附三条 build 注意项）。三方设计签字齐，build 准入
  allowed。Next: Codex docs-only build，落实三条注意项；完成后 Kimi + GLM 做 done 前审查。
- 2026-08-13 Codex: docs-only build 完成并自审 accept。X3/§4/§5/§6 与 roadmap Q1/R6 已同步；
  选择器改选 C1 但明确未承诺；相对链接、状态断言、陈旧词扫描和 `git diff --check` 全通过。
  Next: Kimi + GLM done 前只读审查，未齐不得标 done。
- 2026-08-13 Kimi: done 前终审对 X3 本体无异议，但 counter 两处跨文档陈旧真值：§6 C8 仍 `⚠️`、
  roadmap A7-4 仍写已占用的 v11 候选。Next: Codex 最小返工后 Kimi 聚焦复验。
- 2026-08-13 Codex: 完成 Kimi R1/R2 返工，并一并把同表 R2「build 已完成，待复验」同步为
  2026-07-14 done。重新执行相对链接、状态、陈旧词和 diff 门禁通过。Next: Kimi 只需核三处 diff
  并将 counter 改签 accept；GLM 已 accept。
- 2026-08-13 GLM: done 前终审 **accept**（四项标准逐项通过）。
- 2026-08-13 Kimi: done 前终审 **counter**。X3 纠偏本体四项核查全过，但发现两处跨文档陈旧：
  R1 = `capability-map.md:257` §6「机制与剧情道具」行仍为 ⚠️（与 C8 done/`e70987d6`/地图 :90 ✅✅
  矛盾，OPS-MAP-1 遗漏）；R2 = `roadmap.md:194` 仍写 A7-4「当前候选 v11」（11/12/13 已被占用，
  与地图 :158 矛盾）。两项均为一行级修正。Next: Codex 最小返工 R1/R2 + 复跑扫描；Kimi 核 diff
  后转 accept；未代签、未标 done。
- 2026-08-13 Kimi: R1/R2 聚焦复验通过，counter 改签 **accept**——§6 :257 已 ✅ 且证据指向
  C8/N3-1/ED-5I 联合验收与 `e70987d6`；roadmap R2 行标 done、A7-4 改为开卡时重核 epoch；
  `git diff --check` 与「当前候选 v11」「待复验」「仍为 ⚠️ 只因 N3-1」扫描零命中。三方 accept 齐，
  done 准入仅待用户最终验收。Next: 用户验收本卡；E18-1 验收仍是 OPS-MAP-1 遗留的独立确认项。
- 2026-08-14 User: 最终验收 `OPS-MAP-2：通过`。Codex 将本卡转为 done 并从进行中看板移除；
  s281 持续回归仍归 Q1 集中 E2E，不新增 X3 产品任务。

## 下一位 Agent 提示词

```text
无下一位 Agent 提示词。OPS-MAP-2 已完成三方审查与用户最终验收，状态为 done。
后续 s281 结局链回归由 Q1 集中 E2E 承接；新的角色或结局增强需求必须另行开卡。
```
