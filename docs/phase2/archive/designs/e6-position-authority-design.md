# E6 · 实体定位权威 设计方案（2026-07-05 · **已评审**:决策①仅被接管实体暂停 auto/②位移指令才隐式接管;③④留 E7/C7 期再拍）

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: design-spec-v1 / 1.0.0

本页把历史设计正文接入 `design-spec-v1`，并保留 archive overlay。原始日期、方案语义、版本数字、冲突、未知项和链接均通过下方逐行引用保全；本页不授予当前产品、runtime、E2E、视觉或 coverage 信用。

## 问题与目标

- 历史设计问题/目标：每实体一个位置权威；auto/队形与脚本互斥，只有接管实体暂停 auto，位移命令才隐式 take，显式 release；挂载父子局部偏移；followers 作为 E7/C7 预留；给出实现切分。
- 文档身份：phase2 / archive；原始状态为 `archived`，当前有效性固定为 `historical`。
- 本次目标：让历史设计具备可检索的设计章节和历史边界，不把当时方案改写成当前合同。

## 真值与约束

- 固定源 revision：`45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA：`99a404f997accf60de7982bf3b579e8053f3a00d96c5972a4260036a9f11a9f7`；原文 101 行、6244 bytes。
- 一手来源/正文锚点：docs/phase2/archive/designs/e6-position-authority-design.md:1-1；标题锚点：1:E6 · 实体定位权威 设计方案（2026-07-05 · **已评审**:决策①仅被接管实体暂停 auto/②位移指令才隐式接管;③④留 E7/C7 期再拍）, 9:0. 问题是什么（考证结论压缩）, 29:1. 核心模型：每实体一个位置权威（authority）, 53:2. take/release：隐式为主，显式为辅, 63:3. 挂载（E7 地基，D20「父动子随」落地形）, 75:4. 跟随者（预留模型，随 C7 实施）, 84:5. 实施切分（评审通过后）, 95:6. 待作者拍板的决策点。
- 当前阶段证据：本批只做文档全文读取、语义分层和字节保全；current contract 必须回读继任规范、当前代码和真实调用域。
- 不可违反的约束：历史状态词只描述原文时点；旧 schema、迁移计划、done/待审标签和演出设想不得单独证明今天的实现。
- 未知与冲突：
- 评审结论明确决策③④留 E7/C7；挂载/跟随行为在本文不是已实现合同。
- authority/take/release 与当前 runtime 语义可能发生漂移，必须以当前 caller/测试复核。

## 方案

- 原始方案语义：每实体一个位置权威；auto/队形与脚本互斥，只有接管实体暂停 auto，位移命令才隐式 take，显式 release；挂载父子局部偏移；followers 作为 E7/C7 预留；给出实现切分。
- 本次治理方案：将上述语义拆入问题、真值、方案、边界、验收五个可定位章节；原文不删节，以 quote 作为唯一完整正文保全层。
- 继任关系：
- docs/phase2/READ-FIRST.md
- docs/phase2/capability-map.md
- 当前 reforge entity authority/follower/mount 代码与测试
- 明确不做：不执行原文迁移/实现步骤，不恢复 legacy fallback，不把历史计划、Self-Review 或静态审计当作 runtime/E2E/视觉/coverage 结果。

## 边界与风险

- 历史边界：本文可以说明当时为什么设计、如何计划和哪些问题已被识别，不能替代当前 canonical 文档、源码、测试或用户裁决。
- 主要冲突/风险：
- 评审结论明确决策③④留 E7/C7；挂载/跟随行为在本文不是已实现合同。
- authority/take/release 与当前 runtime 语义可能发生漂移，必须以当前 caller/测试复核。
- 停止线：不得把“已评审”标题当作 runtime accept；未核对当前 authority owner、移动和 mount 调用域前不能实现/迁移。
- 若重新启用：必须以当前一手来源重新核对 schema、版本、调用方、合法输入和业务 oracle，并建立新的 review record；不得沿用本页日期作准入。

## 验收

- 可执行验证：模板章节完整；原文 quote 去除 `> ` 前缀后与 source UTF-8 字节逐字节相等；source/after SHA 写入 central review、registry、catalog 和 evidence receipt。
- 业务 oracle：历史结论、日期、状态、数字、链接、未知和冲突可定位；任何当前性主张都有继任入口或明确停止线。
- 本次执行范围：只读源、模板迁移、账本同步和静态治理门；runtime、E2E、视觉、coverage 均未运行。
- 复核 Owner 与截止条件：Codex 独立复核本页及三账本；非作者候选验收通过前保持 build/review，不标全量完成。

## 历史范围

- 原始范围：phase2 archive design；固定来源 `45d890e4ce3862aeac9c54eef2d7d18a32032cee`，原始正文 SHA `99a404f997accf60de7982bf3b579e8053f3a00d96c5972a4260036a9f11a9f7`，原文日期和版本轴以 quote 为准。
- 归档原因：正文混合历史设计、阶段计划和后来附录；继任规范/代码已经承担当前合同，故本页只保留历史证据。

## 原始结论

- E6 · 实体定位权威 设计方案（2026-07-05 · **已评审**:决策①仅被接管实体暂停 auto/②位移指令才隐式接管;③④留 E7/C7 期再拍）：这是 design-spec，当前文档状态为 historical。全文 102 行、8 个标题；摘要/首段为「> 解「队形 vs 演出 vs 载具打架」的根本（capability-map E6，当前最高优先地基）。」。属于历史/归档材料，不能单独证明当前实现。
- 上述结论只属于其原始日期和适用范围；本页新增的结构化表述不改变原始结论。

## 当时证据

- source revision `45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA `99a404f997accf60de7982bf3b579e8053f3a00d96c5972a4260036a9f11a9f7`；全文 101 行 / 6244 bytes。
- 原文标题/章节锚点：1:E6 · 实体定位权威 设计方案（2026-07-05 · **已评审**:决策①仅被接管实体暂停 auto/②位移指令才隐式接管;③④留 E7/C7 期再拍）, 9:0. 问题是什么（考证结论压缩）, 29:1. 核心模型：每实体一个位置权威（authority）, 53:2. take/release：隐式为主，显式为辅, 63:3. 挂载（E7 地基，D20「父动子随」落地形）, 75:4. 跟随者（预留模型，随 C7 实施）, 84:5. 实施切分（评审通过后）, 95:6. 待作者拍板的决策点。完整正文与链接、表格、代码、历史状态词在下方 quote 保留。

## 当前有效性

historical。不得将历史设计字段、迁移步骤、旧版本号、done/待审标签或静态审计结果外推为当前事实。
- 当前不得外推的部分：不得把“已评审”标题当作 runtime accept；未核对当前 authority owner、移动和 mount 调用域前不能实现/迁移。

## 继任文档

- 当前 canonical / 复核入口：docs/phase2/READ-FIRST.md, docs/phase2/capability-map.md, 当前 reforge entity authority/follower/mount 代码与测试。
- supersedes / superseded-by：本页保留旧结构化记录作为历史；当前合同由继任规范、代码和新的独立审查记录决定。
- 重新启用条件：新的 primary source、版本/适用范围、合法输入、business oracle、可证伪观察和独立验收齐备。

## 原文保全

固定源 SHA `99a404f997accf60de7982bf3b579e8053f3a00d96c5972a4260036a9f11a9f7`；以下 quote 只增加 Markdown blockquote 前缀，逆回读必须得到相同 UTF-8 字节。
<!-- original-source-quote:start -->
> # E6 · 实体定位权威 设计方案（2026-07-05 · **已评审**:决策①仅被接管实体暂停 auto/②位移指令才隐式接管;③④留 E7/C7 期再拍）
>
> > 解「队形 vs 演出 vs 载具打架」的根本（capability-map E6，当前最高优先地基）。
> > 解锁：E7 载具/挂载（父动子随，D20 契约）、N7 演出接管（显式 take/release 非冻帧）。
> > 考证素材：reforge 位置写点全景 + 原版冻帧机制拆解（两路 agent 考证，2026-07-05；要点内嵌下文）。
>
> ---
>
> ## 0. 问题是什么（考证结论压缩）
>
> **原版把三件事焊在 party 全局上碰运气**：队形（rgTrail 扇形偏移）+ 演出冻结（walking
> 闸门 + frozenOffset 快照 + 静止期从不重算 wFrame/xy）+ 载具共乘（0xA1 聚拢锁重叠 +
> 0x3F/0x44/0x97 骑乘每步刷 trail/camera）。一阶段照抄后在跟随者朝向/位置/间隙上反复修了
> 5 个 commit（design-backlog 议题14 D组），根因一句话：**三方共享全局，没有权威概念**。
>
> **reforge 现状**（写点普查）：
> - `player.pos` 单点、脚本期 runner 吞输入 → 输入 vs 脚本互斥，**干净**。
> - `e.pos` 六个写点（moveEntity tick / stepEntity / nudgeEntity / chaseStep / tickHostiles / spawn），
>   **无仲裁**。B9 已被 runner gate 挡住；但 **auto 巡逻在主脚本演出期不暂停**
>   （main.ts:976 实现「并行」——2026-07-03 作者拍板不复刻对话冻结 NPC；而 main.ts:416 注释
>   仍写「主脚本期间暂停」）——**416↔976 矛盾注释就是权威未定的化石**。主脚本 moveEntity
>   与该实体自己的 auto stepEntity 可对同一 `e.pos` 交错写 = 现存打架面。
> - 相机：恒跟随玩家 + `cameraOffset` 脚本偏移**叠加**（不暂停跟随）——考证确认此模型工作
>   良好（彩依飞走案的教训已内化），**本设计不动相机**。
> - 跟随者：不存在（只画队长；CharacterInstance 无 pos）——是待建项不是待修项。
>
> ---
>
> ## 1. 核心模型：每实体一个位置权威（authority）
>
> ```ts
> type Authority =
>   | { kind: 'world' }                          // 缺省:explore 物理(输入/auto/hostile)
>   | { kind: 'script'; token: number }          // 演出接管(N7):脚本持有,world 侧让位
>   | { kind: 'mount'; parent: string; dx: number; dy: number } // 挂载(E7):位置=父+偏移,不自写
>
> // 运行时一张表(不进存档 —— 权威是演出/挂载的瞬时态,读档回 world):
> authority: Map<'party' | entityId, Authority>   // 缺省不在表 = world
> ```
>
> **写入规则（唯一裁决点）**：任何要写 `pos` 的代码先过 `canWrite(who, id)`：
>
> | 写者 | world | script(本脚本) | script(他人) | mount |
> |---|---|---|---|---|
> | 玩家输入(party) | ✅ | ❌(现状 runner 吞输入,不变) | — | ❌ |
> | 主脚本 moveEntity/stepEntity/… | ✅(隐式 take) | ✅ | ❌排队/跳过 | ❌(先 unmount) |
> | auto 巡逻 | ✅ | **❌暂停该实体** | ❌ | ❌ |
> | tickHostiles | ✅(现有 gate 不变) | ❌ | ❌ | ❌ |
> | mount 派生(每 tick) | — | — | — | ✅(唯一写者) |
>
> ---
>
> ## 2. take/release：隐式为主，显式为辅
>
> - **隐式（迁移内容零改动）**：主脚本的任何位移 op（moveEntity/stepEntity/nudgeEntity/
>   teleport…）执行时自动对目标实体 `take(script)`；**脚本链收尾（完成/abort/切场景）自动
>   release 全部**——一阶段「time-based 状态要有兜底收尾人」教训直接内化为结构，不可能泄漏。
> - **显式（手工内容增强）**：新命令 `takeEntity` / `releaseEntity`——演出中途归还某实体
>   （比如群演先动后自由巡逻）。迁移器不产出，编辑器命令面板提供。
> - **auto 巡逻语义（对齐既有拍板）**：默认**并行**（作者 2026-07-03：不复刻对话冻结 NPC）；
>   仅当实体被脚本 take 时**该实体的 auto 暂停**（release 后恢复）。修 416 注释对齐实现。
>
> ## 3. 挂载（E7 地基，D20「父动子随」落地形）
>
> ```ts
> // 运行时挂载(E7 实施;E6 只定契约):
> mount(id, parent, dx, dy)   → authority[id] = mount;每 tick pos = parent.pos + (dx,dy)
> unmount(id)                 → 回 world(位置留在当下)
> ```
> - **骑乘 = 反向挂载**：party mount 到载具实体，**输入转发驱动载具**（载具的碰撞规则——
>   芦苇漂 floating 穿水——天然生效），party 跟着走。原版 0xA1 聚拢+锁重叠的语义 =
>   全员 mount 到队长 offset(0,-1)，用同一契约表达，不再特例。
> - 嵌套（人挂船、船挂洋流）：拓扑排序每 tick 派生，禁环（编辑器校验）。
>
> ## 4. 跟随者（预留模型，随 C7 实施）
>
> E6 只定数据形：`trail: RingBuffer<{x,y,dir}>`（队长移动 unshift）+ **数据驱动偏移表**
> （per-slot {dx,dy}，替换一阶段 m===2 硬编码分支）。跟随者位置 = 纯派生（trail + 偏移表），
> 不进 authority 表（它们从不被单独写——演出要单独调队员时先 detach 成临时实体，这正是
> 原版 0x15 point-name 转向的 clean 表达）。实现排 C7（有队友才有跟随者）。
>
> ---
>
> ## 5. 实施切分（评审通过后）
>
> | 步 | 内容 | 动面 |
> |---|---|---|
> | E6a | authority 表 + canWrite 裁决 + 隐式 take/release + auto 暂停语义 + 416 注释修正 | main.ts 集中改造;行为回归=现有 Playwright 垫 |
> | E6b | takeEntity/releaseEntity 命令(schema+runner+编辑器表单) | 三包小增量 |
> | E7 | mount/unmount + 骑乘输入转发 + 0xA1/骑乘 op 迁移翻译 | 单独一轮 |
> | N7 | 演出接管验收:隐龙窟门口垫(回归沙盒❌→✅) | 内容验证轮 |
>
> ---
>
> ## 6. 待作者拍板的决策点
>
> 1. **auto 巡逻暂停粒度**：✅ 拍板 =「仅被 take 的实体暂停」（2026-07-05）。
> 2. **隐式 take 的范围**：✅ 拍板 =「位移指令才 take」（2026-07-05）。
> 3. **骑乘输入转发**（E7 期）：推荐「输入驱动载具、party 挂载跟随」；备选「输入仍驱动
>    party、载具跟 party」（简单但载具碰撞规则失效,芦苇漂穿水要特判——不推荐）。
> 4. **跟随者偏移表**放哪：推荐工程 content（创作者可调队形）；备选引擎常量（原版忠实值）。
<!-- original-source-quote:end -->
