# M3 - 迁移脚本控制流去内联与体积门禁

Status: draft
Phase: phase2
Capability: M3(脚本迁移)
Coding Owner: Codex(待三签准入)
Reviewer: Opus + GLM
Visual Verification Owner: Codex + Opus
Unavailable Agents: none
Branch: main

## 目标

彻底取消 `goto/call/条件跳转` 目标的递归复制：每个可达脚本体只存一次，控制流边只存 O(1) 的具名引用。迁移后全库脚本总体积不得超过源 `all.json` 一个数量级，并为后续每次迁移建立自动失败门禁。

## 用户裁决(2026-07-13)

- 本问题必须彻查，不能只修几个超大巡逻实体。
- 不能因为 `goto` 导致场景脚本膨胀。
- 所有迁移后脚本总体积相对 `data/extracted/events/all.json` 至少保持在同一数量级；本卡把它定义为 **不超过 10 倍**。

## 现状量化

统一以 UTF-8 字节计数：

| 指标 | 当前值 | 相对源 |
|---|---:|---:|
| `all.json` 磁盘 pretty | 5,470,901 B | 1.00x |
| `all.json` 规范化紧凑 JSON | 2,274,228 B | 1.00x |
| 原始指令数 | 43,503 | 1.00x |
| 迁移后脚本根规范化紧凑 JSON | 44,751,237 B | **19.68x** |
| 迁移后脚本根独立 pretty JSON | 110,156,998 B | **20.14x** |
| 迁移后递归 Command 节点 | 990,160 | 22.76x |

- 最大 8 棵循环 auto 树占 25,180,678 B 紧凑 JSON；删掉它们会暂时降到 19,570,559 B(8.61x)，但这只是碰巧过线，非循环共享 DAG 仍可被内联放大。
- 当前超过 10MB 的场景有 `s005` 25MB、`s035` 41MB、`s049` 32MB；最大单实体 auto 紧凑 JSON 约 4.25MB / 92,514 个递归命令。
- `MAX_ARM_BODY` 当前只检查顶层 `arm.length`，嵌套 `branch.then/onNo/onLose` 不计入预算，无法阻止结构树爆炸。
- `749c1ce3` 对 `s019/s176/s186` 的 34 个实体移植旧 depth-3 巡逻树只是临时止血。

## 范围

- 范围内：全局脚本库、`callScript/jumpScript` 具名控制流、runner 解析、迁移 CFG 注册表、loader/editor round-trip、脚本覆盖层、全库体积与单文件门禁、运行行为回归。
- 范围外：把原版 opcode/IP 解释器带回运行时、紧凑化所有项目 JSON、无关内容域重迁、可视化脚本库编辑 UI。
- 明确不做：继续提高/降低 `MAX_ARM_DEPTH` 来碰运气；靠 compact JSON 掩盖 AST 复制；只在 auto 回环处打补丁后宣布根治。

## 上下文锚点

- 已拍板决策 / 铁律：遵守 `docs/phase2/READ-FIRST.md`；保持单一 clean ScriptRunner，不恢复原版 opcode 兼容执行器；脚本引用使用稳定业务 id，不暴露原始 IP 给作者 UI。
- 既有设计：`docs/phase2/foundation/script-model-m3-design.md:101-116,134-140` 已明确“goto 单前驱内联、多前驱提共享 Script(callScript)”和 M3c `callScript` 共享库；当前实现漏掉了共享库部分，才退化为递归内联。
- 代码锚点：
  - `packages/migrate/src/translate-events.ts:103-108`：现有 depth/body 护栏。
  - `packages/migrate/src/translate-events.ts:295-322`：具名 goto 当前直接切换 `at` 继续内联。
  - `packages/migrate/src/translate-events.ts:377-408`：条件跳转 `inlineArm` 与路径相关 `armMemo`。
  - `packages/migrate/src/translate-events.ts:861-893`：`0x04` call 当前递归内联。
  - `packages/migrate/src/migrate-content.ts:1384-1397`：trigger/auto 共用翻译上下文。
  - `packages/content/src/script.ts:28-178`：当前 Command / ScriptStage schema 尚无脚本引用。
  - `packages/reforge/src/script-runner.ts:251-289`：runner 顺序执行与 stop 收口。
  - `packages/reforge/src/loader.ts:41-108,204-243`：项目内容加载面。
  - `packages/editor/src/core/project-io.ts:66-114`：编辑器 content round-trip 面。
  - `packages/migrate/scripts/migrate-content.mts:93-107`：现有全量写盘会覆盖整个 pal content。
  - `packages/migrate/scripts/patch-scene-stages.mts:1-15`：现有离线补丁依赖盘上手工内容，不是可重复 overlay。
- 已知坑 / 审计：`docs/phase2/foundation/n-event-script-audit.md`、`am-asset-migrate-audit.md`、`phase1-knowledge-harvest.md` E6。
- 不得重新引入：递归内联跳转目标、路径相关结果写入全局 memo、trigger/auto 语义混用、全量写盘抹掉手工演出。
- 相关测试：`translate-events.test.ts`、`migrate-content.test.ts`、`pal-project.test.ts`、`script-runner.test.ts`、`loader.test.ts`、`project-io.test.ts`。

## Draft: 设计与风险

### A. 体积审计与硬门禁

新增可独立运行的脚本体积审计，固定输出以下三个口径：

1. `normalizedRatio = migratedNormalizedScriptBytes / sourceNormalizedBytes <= 10`。
2. `prettyRatio = migratedPrettyScriptBytes / sourceAllJsonFileBytes <= 10`。
3. `nodeRatio = migratedRecursiveCommandNodes / sourceCommandCount <= 10`。

其中迁移脚本总量包括全部 scene 的 `onEnter/onTeleport/trigger/auto` 根和共享脚本库；不得漏算嵌套臂或运行时换页脚本。另加每场景实际文件 `<10MB`、每个脚本根 `<1MB` 门禁。审计必须进入仓库 `pnpm check`，不是一次性统计脚本。

### B. clean 共享脚本库

新增可选内容域 `manifest.content.scripts -> content/scripts.json`：

```ts
interface ScriptLibraryV1 {
  version: 1
  scripts: Record<string, Command[]>
}
```

- `Command` 新增 `callScript{script,self?}`(执行完返回调用点)与 `jumpScript{script,self?}`(尾转移，不返回原体)；`self` 显式承载原版 0x04 改属主及实体根脚本的执行属主，禁止靠解析 script id 猜。
- 引用 id 使用稳定具名形式，例如 `shared/L_35639@e312`；本期允许按 owner 专门化，以保持现有显式实体 id schema，最终体积仍由 10 倍门禁约束。
- scene 的 `ScriptStage[]` 继续作为持久页阶段壳，保留原有 `next: advance | number`；迁移生成的 stage body 可缩为一条 `callScript`。共享库只承载命令体，不拿内部 CFG 冒充持久 stage。
- 这是 clean AST 的具名控制流，不是原版 IP/opcode 解释器。普通手写工程不声明 `content.scripts` 时行为不变。
- loader/FSA/HTTP/编辑器序列化必须完整 round-trip 该内容域；脚本树查看器至少能解析引用并显示目标，不要求本卡新增完整共享库编辑 UI。

### C. Runner 控制流语义

- `jumpScript` 通过 runner 内部尾转移循环切换目标体，不递归压栈；循环 goto 因此保持常量内存并可持续执行。
- `callScript` 使用受控调用栈，callee 正常结束后返回；仅真实 0x04 使用。设置明确的调用深度故障诊断，但不得把合法 goto 环误算成 call 深度。
- `AbortSignal`、`paceMs`、`selfId`、`stopScript` 必须跨引用保持；call 返回时恢复 caller self，jump 时把目标 self 带入尾转移；auto 的 100ms 指令节拍不能因拆库变快或变慢。
- `jumpScript` 从任何嵌套 branch 抛出的尾转移必须穿透当前命令体，由当前脚本执行循环接管；不得落穿执行父体后续。

### D. 迁移器改为图注册，不再展开边

- 迁移上下文维护 `ScriptRegistry`，键至少包含 `label + owner`，状态为 `unseen/translating/done`。首次遇到目标时登记并翻译一次；再次遇到(含正在翻译的循环)只发引用。
- 具名 `goto`、条件跳转命中臂、确认否臂、战斗败/逃臂等尾转移统一发 `jumpScript`；跳 0 仍发 `stopScript`。
- 真实 `0x04` 发 `callScript`；不得与 goto 共用“内联后补 stop”逻辑。
- 删除 `inlineArm` 递归复制与依赖它的 `armMemo/MAX_ARM_DEPTH` 主路径。护栏改为“注册脚本数量、单脚本递归节点、真实 call 深度”诊断，不再把 goto 深度当内容规模。
- 对 43,503 条源指令构建全库可达图，报告每个 label 的前驱数、强连通分量、未解析引用和不可达脚本；所有控制流边在 JSON 中必须是常量大小引用。

### E. 可重复迁移与手工演出保护

- 在写新脚本产物前，先把 `patch-scene-stages.mts` 的有效转换和 pal 手工演出整理为纯函数/显式 overlay，并在内存迁移结果上应用；不得再依赖“先读盘上旧产物再补”。
- 覆盖清单至少钉住 `s000/s001` 的 dither、speaker、center、李大娘两段式、对白锚点，以及现有脚本补丁脚本列出的 playVideo、四技、coveredBy、隐蛊等历史定制。
- 产品同步只允许改 manifest 的 scripts 路径、`content/scripts.json` 和明确列出的脚本 JSON Pointer；实体静态字段、地图、资源、locale 等非脚本数据出现 diff 即失败。
- 全量生成必须可重复：连续运行两次第二次零 diff。

### 已知风险

- 风险：`jumpScript` 被实现成普通 await call，目标结束后落穿父体。缓解：独立尾转移信号 + runner 循环，单测钉嵌套 branch 穿透。
- 风险：owner 专门化仍产生跨 NPC 重复。缓解：先以正确性优先，10 倍总门禁约束；若仍超标，再单开 self 引用 schema，不在本卡暗加魔法字符串。
- 风险：共享库改变 auto 节拍或 stop/stage 语义。缓解：确定性 fake clock 比对引用前后命令轨迹、等待序列和 stage 结果。
- 风险：全库重迁抹掉人工演出。缓解：overlay 先落、golden 先过，之后才允许写盘；白名单外 diff 直接退出非零。

### Codex 主审立场(2026-07-13)

- 结论：**原“auto 回环检测 + 定点替换”方案 counter；本全库共享脚本方案 agree**。
- 理由：路径循环检测只能消掉循环树，无法保证非循环 DAG、多前驱 goto 和 0x04 call 不继续复制；用户的全库 10 倍上限需要控制流引用成为结构性不变量。
- 是否建议进入 build：否，schema/loader/runner/editor/migration 跨包变更，等待 Opus + GLM 复核签字。

### Opus 主审立场(2026-07-13,架构/运行语义)

- 结论：**agree,附 R1-R3 必落修正(设计补充,非推翻)**。
- 合法性：`script-model-m3-design.md` §3 层3 + M3c **原设计本就规定**"goto 单前驱内联、多前驱提共享
  Script(callScript)、共享段 `shared/L_35639`、callScript 目标全部提名"——本方案是回归原架构,
  实现漏掉共享库才退化成递归内联。锚点核实(translate-events.ts:295-322 goto 切 `at` 同体续走 /
  861-893 0x04 memo 防重译但仍逐站点 `push(...calleeBody)` 复制),卡内现状描述准确。
- 逐项复核：
  - **schema(Draft B)**:`Record<string, Command[]>` 命令体 + scene 保留 ScriptStage 持久页壳,
    分层正确(stage=实体持久状态机,共享体=控制流目标,不混)。owner 专门化(`@e312`)是正确的
    分期:命令体内实体 id 是显式烘焙(铁律5 杜绝下标的代价),跨 NPC 真共享需 self-relative
    引用 = 另一张 schema 卡;10 倍门禁作总闸,风险2 的处置顺序对。
  - **call/jump 语义(Draft C)**:jumpScript 尾转移(常量栈,循环可持续)vs callScript 受控栈
    (0x04 含 op1 改属主 → `self`),映射原版语义正确;二者不得共用"内联后补 stop"路径 ✓。
    嵌套 branch 尾转移穿透 + "call 内 goto 不越过 call 边界、链终仍返回 caller"已列测试单 ✓。
  - **注册算法(Draft D)**:label+owner 键 + unseen/translating/done 三态,translating 态处理
    环 = 结构性消灭递归复制,O(1) 边成立;统一发 jumpScript(放弃单前驱内联优化)是更简单
    安全的取舍,体积由门禁兜底。前驱数/SCC/不可达报告 ✓。
  - **门禁(Draft A)**:三口径定义清楚、含共享库与嵌套臂、进 pnpm check ✓。⚠ 量化警示:卡内
    自算"删 8 棵循环树后 8.61x"——距 10x 余量仅 14%,owner 专门化 + 引用开销可能回弹;若
    首轮审计超标,风险2 的 self-relative 引用卡**立即转必做**,不再是"若仍超标再议"。
  - **overlay(Draft E)**:纯函数 overlay + JSON Pointer 白名单 + 双跑零 diff,方向对;⚠ build
    时注意 overlay 锚点须按**语义定位**(label/实体 id/内容匹配),不可按旧产物结构位置——
    全量重迁后 onEnter 可能缩成一条 callScript,结构位置全变。
- **R1-R3 必落修正(build 范围)**:
  - **R1 尾转移让出保证**:每次 jumpScript 尾转移必须保证至少一次事件循环让出(pace 下限或
    显式 yield)——纯同步命令体的 jump 环(理论存在)否则会同步自旋占死主线程;验收"不死循环
    占满主线程"须有此机制背书,不能只靠"原版循环都带 wait"的经验假设。
  - **R2 对话样式态跨引用保真(本审最重要发现)**:当前 goto 是**同 walkBody 续走**——
    slot/portrait/activeSpeaker 跨 goto **延续**;改为 jumpScript 引用后目标体 fresh 启动
    (样式重置为默认)。mid-style 的 goto(跳转点样式态非默认且目标体含先于样式 op 的对话)
    语义会**静默改变**(top+立绘 → bottom 素框)。这正是 armMemo 路径相关性存在的原因,删它
    必须显式承接:CFG 构建时**统计"跳转点携带非默认对话样式态且目标体入口对话依赖它"的边数**,
    非零则按入口态专门化注册(键加样式摘要)或落人工清单;golden 无法全覆盖此类边,必须靠
    迁移期统计钉死。(0x04 现实现 callee 已 fresh,无此问题。)
  - **R3 resolver 归属与缺引用运行时诊断**:runner 构造注入 `resolveScript(id) → Command[]`
    接口,loader(HTTP/FSA)与 editor Playback 各自供给——editor 预览经同一 runner 免费获得
    解析,不另写模拟;运行时引用缺失 = 显式报错停脚本(诊断含 id 与调用点),不得静默跳过
    ——迁移期"无孤儿"校验只覆盖迁移产物,手写工程需运行时兜底。
- 命名注:`shared/L_35639@e312` 含原始地址,与"不暴露原始 IP 给作者 UI"不冲突——它是迁移产物的
  稳定不透明 id(唯一可用身份),规则约束的是"不让作者用 IP 推理";手写脚本用语义名,迁移 id
  后续可加语义别名,不在本卡。

## 验收条件

- 结构：迁移产物中 goto/call 类边只出现 `jumpScript/callScript` 引用；禁止由迁移器生成深层复制目标体。脚本库所有引用存在、无孤儿、id 稳定。
- 单测：self-loop、A-B 环、多分支 SCC、共享 DAG、多前驱 goto、嵌套 branch 尾转移、0x04 返回、call 内 goto、jump 0、auto pace/abort/self、trigger stage advance/reset。
- 规模：三个 10 倍口径全过；每场景 `<10MB`、每脚本根 `<1MB`；输出修复前后 Top 20 与 SCC/前驱报告。
- 覆盖：295 场景 schema + 引用校验全过；43,503 源指令的可达控制流无静默丢边；既有 17 条合法深臂不回退为 `unmigrated`。
- round-trip：HTTP/FSA loader、编辑器打开/保存、clone/zip、脚本预览均保留 `scripts.json`，普通无脚本库工程兼容。
- 手工演出：`s000/s001` 与历史 overlay golden 全过；写盘 diff 无白名单外变化；连续迁移两次第二次零 diff。
- 行为：6051 抽查 `s005/s019/s035/s049/s176/s186` 巡逻，连续移动/换向、不死循环占满主线程；开场和普通换场景不回归。
- 门禁：migrate/content/reforge/editor 定向测试、类型检查和仓库 `pnpm check` 全绿。

## 推进签字

### 进入 build 前:设计签字

- Codex: **agree**(2026-07-13，仅同意本全库共享脚本修订版)
- Opus: **agree**(2026-07-13,附 R1-R3 必落修正——①jumpScript 尾转移强制事件循环让出;
  ②对话样式态跨引用保真:CFG 统计 mid-style goto 边并按入口态专门化/人工清单(当前 goto 同体
  续走样式延续,引用化会静默重置——armMemo 路径相关性的真实原因必须显式承接);③resolver
  注入接口 + 运行时缺引用显式报错。另:8.61x 距 10x 余量仅 14%,首轮审计超标则 self-relative
  引用卡转必做。详见 Opus 主审立场)
- GLM: pending
- counter / 分歧处理：原 37 行“循环检测 + 全量重迁”与中间版“仅 auto 定点同步”均已作废。Opus 无
  counter,R1-R3 为 build 必落设计补充;请 GLM 复核覆盖/体积公式/测试矩阵 + R2 的统计口径可行性。
- 缺签豁免: N/A
- build 准入结论: **blocked(Codex+Opus agree,待 GLM;R1-R3 纳入 build 范围)**

### 进入 done 前:审查签字

- Codex: pending
- Opus: pending
- GLM: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

## Build: 实现与自测

- Coding Owner: Codex(未准入)
- 修改文件: pending
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: pending

## Review: 审查与返工

- Reviewer: Opus + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 交接日志

- 2026-07-13 Opus: 记录指数展开、GitHub 100MB 拒绝、`749c1ce3` 临时止血与循环检测初案。Next: 三方设计。
- 2026-07-13 Codex: 首轮复核发现 trigger/auto、memo、浅层预算和全量覆盖问题，提出 auto 路径检测窄修。Next: 用户复核范围。
- 2026-07-13 User: 裁决必须彻查所有 goto 膨胀，迁移后脚本总体积不得超过 `all.json` 一个数量级。Next: Codex 重做全库设计。
- 2026-07-13 Codex: 量化当前脚本两个字节口径均约 20 倍；确认原 M3 设计预留的 `callScript` 共享库未实现，改为全局脚本库 + O(1) call/jump 引用 + 三重 10 倍门禁 + 可重复 overlay。Next: Opus 复核，不得 build。
- 2026-07-13 Opus: 设计签 **agree + R1-R3 必落**。核实:原 M3 设计 §3/M3c 本就规定共享库(方案=回归原架构);锚点 295-322(goto 同体续走)/861-893(0x04 memo 防重译仍逐站点复制)与卡描述一致。逐项过:schema 分层/call-jump 语义/registry 三态环处理/门禁口径/overlay 均正确。**关键发现 R2**:当前 goto 续走使对话样式态跨 goto 延续,引用化后 fresh 重置 = mid-style goto 对白样式静默改变(armMemo 路径相关的真实原因),CFG 须统计此类边并专门化/人工清单——golden 覆盖不到,必须迁移期统计钉死。R1=尾转移强制让出(防同步自旋);R3=resolver 注入 + 缺引用运行时报错。量化警示:8.61x 距 10x 仅 14% 余量,超标则 self-relative 卡转必做。Evidence: Opus 主审立场。Next: GLM 复核覆盖/体积公式/测试矩阵/R2 统计口径;三签齐后 Codex build(R1-R3 入范围)。未改实现文件。

## 下一位 Agent 提示词

```text
接手 M3 全库脚本控制流去内联设计复核(GLM)。
任务卡: docs/ops/tasks/M3-wander-arm-explosion.md
当前状态: draft；Codex agree + Opus agree(附 R1-R3 必落)；GLM pending,build blocked。
你的角色: GLM,覆盖/体积公式/测试矩阵复核;只审设计,不改实现文件。
先读: AGENTS.md、docs/phase2/READ-FIRST.md、任务卡 Draft A-E、Codex 与 Opus 两个主审立场(尤其 R1-R3)。
用户硬约束: 迁移脚本总体积 ≤ all.json 10 倍;goto/call 不得递归复制目标体。
已确认: Opus 核实方案=回归原 M3 设计(§3/M3c 共享库);R1=jumpScript 尾转移强制事件循环让出;R2=对话样式态跨引用保真(当前 goto 同体续走样式延续,引用化 fresh 重置会静默改变 mid-style goto 对白样式,CFG 须统计此类边并入口态专门化/人工清单);R3=resolver 注入 + 运行时缺引用显式报错;量化警示 8.61x 距 10x 仅 14% 余量。
请你复核: (1)三个 10 倍门禁公式与计量口径(含共享库/嵌套臂/运行时换页,不漏算);(2)验收单测矩阵(self-loop/A-B 环/SCC/共享 DAG/多前驱/嵌套穿透/0x04 返回/call 内 goto/jump0/auto pace-abort-self/stage advance-reset)对 Draft C/D 语义的覆盖完整性 + R1-R3 的测试补充;(3)R2 统计口径可行性(迁移器在 emit jumpScript 时可得样式态,目标体入口对话可静态判定);(4)43,503 源指令可达图覆盖(不静默丢边/17 条合法深臂不回退);(5)overlay 清单完整性(对照 patch-scene-stages.mts 现有全部定制)。在设计签字 GLM 行签 agree/counter,更新交接日志与下一位提示词(agree 即三签齐,交 Codex build,R1-R3 入范围)。
不要做: 不改实现文件;不跑 migrate:content 全量写盘;不推进 build。
输出要求: 明确 agree/counter、门禁公式核验、测试矩阵评估、提交 hash。
```
