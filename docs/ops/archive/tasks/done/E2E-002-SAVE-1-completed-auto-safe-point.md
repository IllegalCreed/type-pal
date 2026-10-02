# E2E-002-SAVE-1 — 已完成 auto 的保存安全点

Status: done
Phase: phase2
Capability: E2E-R4 / X1
Coding Owner: Codex Root
Generation Owner: N/A
Reviewer: Codex（冻结E2E独立验收） / e2e_002_runner（非实现只读复核）
Visual Verification Owner: Codex
Visual Verification Timing: e2e-consolidated
Contributor: Codex
Branch: codex/e2e-002-r1

## 目标与范围

修复三人进房、数值state0隐藏后，已完成的auto仍占用活动租约导致正式保存超时。
只提交已完成body的cursor安全点；不让隐藏/暂停中的实体执行下一游戏命令，不绕过保存屏障。

- Root独占实现白名单：`packages/reforge/src/script-runner-core.ts`、`script-project-core.ts`、
  `runtime-script-project.ts`、`main.ts`；新 `main.auto-save-flows.test.ts`，
  以及 `script-runner-core.test.ts` 的针对性回归。
- 工作树 `/Users/zhangxu/.codex/worktrees/e2e-002/type-pal`。002工具贡献者不写上述文件；
  作者编排另见[作者卡](E2E-002-CHOREO-1-trio-dialogue-authority.md)，不混改三人auto正文。
- 不改schema/save版本、timeout、质量规则、资源/地图/迁移；不忽略活动lease，不把state0
  伪装为lifecycle hide/remove，不允许保存含半执行command/index/call stack。
- 不扩张为暂停于body中间的通用随时存档；该场景仍须达到原定flow安全点。

## 前提真值门

### 一句话行为 / 工程前提

游戏命令的可执行门与“body已经完成、只提交cursor”的门不应混为一谈：后者仍须modal、
abort和epoch/CAS检查，但不该被该body最后写入的entityState0永久拦截。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | N/A：现代flow租约/安全快照不属于原版机制；L_406/411/420只证明走位后state0与脚本结束，不证明新保存API | `data/extracted/events/all.json:2871/2911/2987` |
| 第一阶段 | 自己的正式002快存/新上下文读回通过；无需模拟现代lease；此处不复制旧保存结构 | 真实 `build/e2e/game-002-2026-09-30T09-06-32-906Z/report.json`；贡献者正式F5/标题槽位流程 |
| 当前二阶段 | 三人state0/no motion slot，但活动lease不退出；awaitGate在最终cursor前等autoAllowed，false永久阻塞；屏障合法地等所有lease | `packages/reforge/src/main.ts:1066/2900`、`script-runner-core.ts:183/257`、`script-world.ts:441/580/702`；诊断 `build/e2e/reforge-002-2026-09-30T09-24-33-221Z/002-save-barrier-failure.json`（三人active、motion/world gate关闭） |
| 本任务目标 | body完成后可提交next/关闭lease；下一command仍受原gameplay门；正式保存与002新上下文恢复成功 | 本卡设计与正式主壳回归；冻结002执行器合同 |

### 反证与替代解释

- 最强替代解释：不是末尾门，而是未达移动终点/大娘nudge漂移/仍有pending touch/未关闭前台。
  诊断证明三人终点已提交、slot空、authority world、pendingTouch=false；e56已completed且live/durable
  都为(137,66)，前台/dialog/menu全部关闭。Root直接读诊断及生产调用链，非只复述贡献者。
- 数值state0不会调用terminateLifecycleMotion；lifecycle hide本身确有ownEpoch abort，不能误修该路径。
- 推翻观察：红回归不在此门失败；修后隐藏实体仍执行下一command、modal被越过、未达endpoint也能
  快照、旧epochcursor复活、activelease被直接删掉或屏障依然超时。
- runtime：源级定位于最终awaitGate与autoAllowed；原版理解：不推断旧保存等价新租约；
  extractor/data：真实20行/500/三终点已提交；collector：detached诊断只读active keys/场景，不改调度。

### 用户可见偏离

- 主动偏离已核行为：no。仅让完整演出后的正式保存可用，隐藏/暂停与移动行为保持。
- before → after：完整进房后保存超时 → 在原flow安全点正常存档、读回。
- 产品裁决：N/A，既定002验收与现行保存合同的缺陷修复，不新增随时存档或兼容选择。

## 上下文锚点

- [二阶段铁律](../../../../phase2/READ-FIRST.md)、[CLAUDE](../../../../../CLAUDE.md)、[AGENTS](../../../../../AGENTS.md)。
- [脚本系统](../../../../phase2/specs/script-system.md)游标/安全点；[002卡](E2E-002-1-inn-route-and-trio.md)。
- [一阶段知识测绘](../../../../phase2/reference/phase1-knowledge-harvest.md)E6/E7：真tick、调用域与死锁反控。
- `entity-lifecycle.ts:33–56`：state、lifecycle各自派生，不把state0变成despawned。
- `runtime-script-project.ts:467–494`：屏障等lease、同步snapshot、原10000ms timeout不得改变。
- `main.ts:4061`：纯state0→可见保留activation；不能通过abort并重跑奖励“修复”。
- 既有`main.save-flows.test.ts`、`runtime-script-project.test.ts`、`script-runner-core.test.ts`。

## 设计与风险

v2 使用单一现有host gate，传可选 boundary：settlement只表示完整body后的cursor提交；
continuation只存在于machine `to`已提交target、下一state尚未进入的执行门，携带真实lease安全点回调。
不读取boundary的宿主保持原gate效果。正式主壳settlement仍等待modal；普通/continuation仍等待
auto gameplay，只有保存屏障已关闭才调用continuation回调；真实CAS/close返回stop后正常退出invocation。
不替换AbortSignal、不race孤儿等待、不删除active。每次等待后核abort、modal、activation身份；
没有开始新body时才能再次使用已提交target。nested回调仍continue，不伪造父命令完成。
`continue`不是安全点；midbody隐藏仍不能随时快照。默认门允许时不重复提交cursor。

风险：boundary丢失经过base/current host的转发；默认门纪律漏gate；abort/旧epoch仍提交；
machine下一state误执行。用核心门测试、真实正式主壳自动机/快存和冻结E2E反证，不只mock host自证。

## 验收条件与E2E登记

- 正式主壳回归先红后绿：真实move→reward→self state0→next completed后F5，快照含正确cursor/endpoint，
  不因存档重复奖励；恢复仍隐藏且不会重跑该stage。
- 核心stage/machine安全点、下一command暂停、modal阻塞、abort与旧epoch/CAS相关回归通过；
  未完成move不得被此修复放行。existing gate默认行为不变。
- 002真实001正常路线/长短读对白/实际终点/正式dumpSave及新页恢复全部通过，证据`build/e2e/*002*`。
- 最终完整pnpm check硬性零诊断；不宣称覆盖率增长、003或完整通关完成。

## 当前模式推进记录

- Root premise verified（2026-09-30）：已直接读取诊断、生产门/host/lease完整路径，反证如上。
- 非实现贡献者独立证据：e2e_002_runner定位三人hidden active lease与setEntityState非lifecycle分支；
  设计压力审、实现只读复核pending。
- Root design agree / build allowed：唯一Owner/白名单确定，原保存门保留；先红正式主壳用例再修。
- 实现/定向测试/非实现复核：已完成，历史v1 counter及v2闭合见后文；最终E2E与全仓门通过，Root accept。
- 2026-09-30 非实现counter：v1只分末尾safePointGate不能处理machine to已经提交target、
  在下一state执行门挂起后才请求保存；lease仍active。当前不得集成v1；先补真实主壳反例，
  设计v2复核通过后重新准入，未完成body不能借修复放行。
- 2026-09-30 v2独立design agree：贡献者直接核真实lease/CAS与主壳门；to:hidden/suspended晚5tick
  F5反例已红。Root重新核定build allowed；产品修改仍由Root独占，v1未被集成。
- 2026-10-01 v2实现冻结`43092cc0`：核心/真实主壳55项通过，已独立核nested与旧epoch边界。
  completion增量见[SCRIPT-COMPLETE-1](SCRIPT-COMPLETE-1-explicit-flow-completion.md)，不抹掉旧to反控。
  冻结`b83faa50`真实002正常20行/500/进房后生产保存仅15ms，三人的lease不再挂住屏障；
  fresh-context已loaded，整体报告仍failed（正常e62循环在晚到二次dump期间推进），归工具取证域。
  F5/F9证据为6项真实主壳回归，RF浏览器正式链是dumpSave，不混称。
  最终全仓门与集成pending，不据单独barrier成功关闭002。
- 2026-10-01最终门：冻结完整check10648项通过、严格lint2703文件零诊断；`fc1d5804`已集成，
  主树全包typecheck/严格lint/作者检查绿。正式002第二轮生产保存13ms，实际恢复提交点全量World
  与原档严格一致，含各completed cursor；6项真实F5/F9主壳反控保持通过。
  002整体仍failed：门瞬态frame1→0的独立画面问题另见[E2E-002-DOOR-1](E2E-002-DOOR-1-persistent-open-presentation.md)。
  本卡保存门实现accept；最终002画面条件尚未闭合，顶部保留review，不冒称全恢复验收通过。
- 2026-10-01最终RF002 `16-31-19-969Z` passed：三人实际终点/隐藏/completed后生产保存195ms，
  原始SAVE9/content21档SHA `42ac15aff0719f8f11b3f59d6001266c59e2075c715d616f5c75985bcfb0136f`。
  fresh-context loaded；真实成功restore提交点全量持久域严格相同，晚到完整背景World另存，
  Canvas亦同SHA。Root核原始字节/49源hash/提交点及两图，6项真实主壳F5/F9保持通过。
  没有改timeout、lease门或保存格式；完整演出/恢复门闭合，最后全仓质量门随后通过。
- 2026-10-01完整`pnpm check`冻结3feb5a77 exit0，10655包测试全绿、E2E工具57项；
  lint2704文件0 error/warning/info，日志`build/e2e/door-20261001/check-final-v2.log`。
  Root最终accept / done allowed；v1反例/返工保留，不扩张中途随时保存或兼容能力。

## 交接日志

- 2026-09-30 Root：从真实002保存失败另开修复卡，不通过改作者auto或延长等待掩盖。
- 2026-09-30 Root：v1 stage/advance正式主壳先红后绿；贡献者独立指出to边界晚请求保存counter，
  接受并转rework，补to自隐藏/末尾suspend案例，设计待复核；v1绿不构成收口。

## 下一位Agent提示词

无下一位Agent提示词。v2与最终002恢复已收口；母卡继续后续片段，不追加中途随时保存能力。
