# ARCH-REFORGE-BATTLE-1 — 战斗宿主生命周期拆分（A2）

Status: draft
Phase: phase2
Capability: 架构治理 A2（不改变能力格状态）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: TBD
Visual Verification Owner: Codex
Visual Verification Timing: mixed
Unavailable Agents: Kimi / GLM（最近用户表示额度不足；本卡豁免待确认）
Branch: main

Revision: r1
Evidence base: 7f3840e6

## 目标与范围

把 Reforge 主壳中的战斗启动、资源准备协调、活动会话与收尾职责交给明确所有者，
保留现有输入、音频、取消、结算、战后脚本与错误传播行为。不以单纯减少 main 行数为验收标准。

- 范围内：`main.ts` 战斗宿主接线；新增包内战斗宿主/准备模块及直接回归；相关诊断和文档。
- 范围外：`BattleSession`/战斗核心内部拆分（队列 C1）、公式、回合规则、渲染坐标、存档与内容格式、
  编辑器、生成数据、世界/帧循环本体（A3）。不处理 demo 版本与 s135 默认落点的单列问题。
- 旧回归业务断言不削弱；历史审计探针不改；发现实际行为 bug 先取直接反证，另列修复范围与提交。

## 前提真值门

### 一句话工程前提

战斗生命周期目前仍由 `bootGame` 巨型闭包持有；可在不更改 BattleSession 合同的前提下，
将启动有效性、活动实例和收尾归属抽为独立包内所有者。

| 维度 | 当前真值 | 直接证据（7f3840e6） |
|---|---|---|
| 原版 / primary source | 原版机制 N/A：本批不改变玩法；工程一手证据是当前实际主壳，不推导新机制 | `packages/reforge/src/main.ts:2149` 启动主体，`:2441` 发布实例，`:2472` 写回前复核 |
| 第一阶段 | 不重写其逻辑/UI；仅采用“在途操作有明确收尾人”的工程教训，不复制旧架构 | `docs/phase2/reference/phase1-knowledge-harvest.md:414` X7；第二阶段规则见 READ-FIRST 2/8/9 |
| 当前二阶段 | launch intent + runner + script mutation + world 身份共同守卫；资源完成后才发布战斗；旧 finally 只清自己的实例 | `main.ts:1316`、`:2161`、`:2342`、`:2464`、`:5115` |
| 本任务目标 | 保留上述顺序及取消协议，将所有权迁出主壳；外部仍用实际 BattleSession tick/render 与脚本宿主接口 | `main.ts:3299`、`:3451`、`:6265`；`battle/battle-world-result.ts:8`、`:44` |

最强替代解释：main 可能只是在做不可避免的装配，抽取后反而形成万能 RuntimeContext。
反证标准：若候选仍需整个 bootGame 可变上下文或主壳继续持有活动实例与 launch intent，
则不算职责拆分完成，不能凭行数减少收口。若旧/新同输入出现额外写回、通知、音乐或错误吞没，即回退设计。

本批无大量数据红项、不选择迁移/schema 修复层；runtime 命令分类、原版理解、提取解码与审计模型
均不作为此重构前提。不把历史 harvest 的“当时缺失”直接当成当前缺陷。
用户可见 `before -> after`：行为保持；无新 UI、玩法或兼容策略。发现需要偏离则另请产品裁决。

## 上下文锚点

- [READ-FIRST](../../phase2/READ-FIRST.md)、[架构队列](../audits/architecture-debt.md)。
- [A1 已完成卡](../archive/tasks/done/ARCH-REFORGE-MENU-1-session-controller.md)：豁免仅 A1，不授权本卡。
- `main.ts:2149–2505`：资源顺序、会话发布、终态、战后脚本与恢复场景音效。
- `main.ts:1316–1332`：活动实例、启动意图、错误去重集合、战场表懒加载。
- `main.ts:3451`：DEV preset 包装留在 DEV gateway，不能进入作者命令或持久世界模型。
- `main.ts:5115`：强停；`:6265`：主循环 tick/render 转发。不得新增第二帧调度器。
- `main.battle-host-flows.test.ts:37/72/90/126/165/177`：H9 六条真实宿主链，
  已涵盖胜利/败北、作者续链、投掷库存、空敌队、迟到精灵与换场景；不能只用核心 mock 替代。
- [战斗流程接收证据](../../testing/battle-workflows-integration.md)、
  [真实宿主二批](../../testing/codex-runtime-shell-wave2.md)：接收结论保留，新模块须重验接线。
- 不得重引 `sys:battleField`、完整 RuntimeContext、下标身份、旧 save/content fallback 或测试专用产品入口。

## Draft：边界设计

1. **BattleHost**（拟名）：独占活动会话、启动 intent、错误去重与取消入口。
   提供 start/cancel 和只读当前会话查询；tick/render 仍由原主循环驱动，不新增计时器。
2. **战斗准备单元**：使用明确的静态内容投影、资源读取器和准备端口，组织当前图片/SFX/精灵/FIRE/背景闭包。
   不接收整个 world 可变宿主或 DOM/window；不改底层缓存/解码器/资产格式，不扩大资源扫描范围。
   保持每个 await 后有效性检查及错误降级/致命分类，不能为了“并行加载”重排副作用。
3. **主壳端口**：当前世界/场景读取、script mutation 有效性断言、退出帧步进、
   场景音效恢复、战后脚本执行、音乐与 DEV 发布；限于实际所需字段/操作，不提供任意回调执行器。
   切场景/恢复/保存仍由原所有者处理。世界值在原读取时点取得，不把全部动态值随意冻结为启动快照。
4. **结算**：继续调用现有 settleBattleVictory/finishBattleWorldState，保持单次授予点、
   victory/defeat/abort 分支、库存与 money/成长写回以及 onDefeated 顺序。相关生产算法零改。
5. 不顺便强制串行化重入、不改变“新 intent 使旧启动失效”的现行合同。
   旧会话 finally 必须用实例身份判断；取消不得抢先恢复新场景音乐或写回旧世界。

### 验证与验收

- 独立所有权：main 不再写活动实例/launch intent；端口白名单明确；无包反向依赖/万能上下文。
- 新模块直接测试覆盖准备中取消、新启动覆盖、旧 finally 遇新实例、世界替换、脚本意图失效，
  以及运行中取消；用 entered/deferred 与实际 settled 观察器，不用固定 sleep 或超时当业务反证。
- 保留 H9 六项与既有战斗流程全组，增加真实宿主错误/恢复/接线缺口回归；
  非空 world/inventory 深快照、真实终态及 finally 消费 pending，避免自比较和挂起遮盖原错。
- 单点负控至少钉住迟到发布、旧 finally 清新会话、取消后写回、战后错误传播和主壳接线；
  exact file/title + exit 1 + 候选自身 AssertionError，混错/timeout 不能当 detected。
- 重构前后实际结果/调用顺序对照，必要时用冻结源码隔离 oracle；旧实现不进产品兼容层。
- 开发期只跑定向/相邻/typecheck；整批末串行 check → 官方 ratchet → 受保护单次 strict-fast。
  审查移动前后源码全集/分母与包统计，不靠漏计新模块提高比例；不逐用例跑覆盖率。
- 旧版本兼容审查单列 pass/counter；SAVE8/content20 和公共包接口保持。
- 功能最小验证由 Codex 执行：现有模拟器选合法预制→开战→停止→重开，输入归属可用；
  不改 UI、不要求用户补做技术验证。剧情演出仍 e2e-deferred：沿用已登记 R4/N6b/Q1/Q2，
  对本批终态/战后脚本不以视觉延后替代代码验证。

## 推进签字

### 进入 build 前

- Codex：2026-09-24 r1 `premise verified / design agree`。直接读取上述 7f3840e6 锚点及 H9 六项；
  最强反证为抽取后仍需万能上下文/无法隔离生命周期，或同输入副作用顺序漂移。
- Kimi：pending（未代签）。
- GLM：pending（未代签）。
- 非 Coding Owner 独立反证：pending；如用户批准单席，必须在此明确登记风险与范围。
- 缺签豁免：pending。本次“继续推进”不自动扩张上批仅 A1 的明确豁免。
- build 准入结论：blocked；仅 draft 准备，不改实现文件。

### 进入 done 前

- Codex：pending。
- Kimi：pending。
- GLM：pending。
- 缺签豁免：pending。
- done 准入结论：blocked；没有实现候选或验证结果，不标 done。

## 额度 / 代班与用户裁决

最近用户告知 Kimi/GLM 额度不足，希望 Codex 独立推进。A1 已获明确本批授权；
A2 尚待确认是否仍豁免两席的 build/done 签字、由 Codex 独立实施自验收口。
风险：缺少独立架构审查，须以真实宿主回归、可鉴别负控和副作用对照缓解，不能宣称等价于三席。
是否需要后续补审：随本卡用户裁决登记，不外推其它 11 批。

## Build / Review / 用户验收

未开始。本轮只同步主线、取证、开卡；无产品、测试、资产、基线改动。

## 交接日志

- 2026-09-24 Codex：在 main 7f3840e6 干净树 fetch/ff-only（无远端增量）；
  重读协议、队列与源码，建立 A2 r1 范围和验证计划。下一步仅待本批单席授权或另行安排两席审查。
  文档检查：`pnpm check:docs` 20 工具测试全过，520 Markdown / 2867 链接 / 174 卡，0 issues。
  未执行产品测试与覆盖率，本轮无生产改动。

## 下一位 Agent 提示词

暂无跨 Agent 移交；等待用户确认本批协作方式，不要求转交当前额度不足的两席。
无下一位 Agent 提示词，等待用户裁决。未准入前不得开始实现、不得标记 done。
