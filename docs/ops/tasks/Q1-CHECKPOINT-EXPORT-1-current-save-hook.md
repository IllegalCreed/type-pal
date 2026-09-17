# Q1-CHECKPOINT-EXPORT-1 - 当前存档检查点导出接线

Status: build
Phase: phase2
Capability: Q1/R4准备（不改变能力地图状态）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi / GLM
Visual Verification Owner: Codex
Visual Verification Timing: e2e-deferred
Unavailable Agents: none
Branch: main

Revision: r1，2026-09-17。取证代码基线`c1cec3adde5b0090acbc6bc1f325ca1301689873`，
取证时HEAD`0d39b797`相对此基线仅分配文档变更。2026-09-17核三席r1设计齐（GLM 04383fa7、Kimi 787c1e0f），Codex开build；不重签。

## 目标与范围

R4 runner以`await window.__tpE2e.dumpSave()`取得一个独立、当前SAVE8/content20、可被正式恢复链接受的检查点；
导出与普通保存共用现有安全快照队列，不写用户槽、缩略图或保存次数，不导出脚本半状态。

- 只修DEV导出接线、抽取主壳内部共用快照入队入口、补真实调用链回归与使用说明。
- 不改SAVE/content版本、codec、schema、存储格式、迁移、PAL工程、资产、读档提交序或脚本调度规则。
- 不建完整runner/001–010链、不实施N6b、不改变F5权限、不导出战斗/对话中间调用栈。
- 不碰GLM编辑器补测白名单；不改原审计探针/旧测试预期/统计范围/生产10秒上限。
- [WORLD](../archive/tasks/done/WORLD-ASYNC-COMMIT-1-world-async-commit.md)已三席accept，本轮独立收口；其后仅已验收保存子链修改共用core，与本卡设计依赖一致，不借用其签字。

## 前提真值门

一句话前提：当前DEV零参钩子错误地裸绑三参builder；修正后也必须遵守现行安全点快照合同，而非只保证字段齐全。

| 维度 | 当前真值与一手证据 |
|---|---|
| 原版 / primary source | 原版机制N/A：现代DEV检查点不是原版功能。当前一手协议为[存档规范](../../phase2/specs/save-system.md):20–28，只保存FlowCursor，不保存命令栈/等待相位，超时无半成品；[E2E规范](../../testing/e2e.md):243–250明确此钩子待修 |
| 第一阶段 | 不以一阶段存档布局/事件游标替代二阶段WorldState；无复用一阶段DEV钩子的需求。[工程经验](../../phase1/engineering-notes.md):65说明JSON可丢Map语义，故本卡验收包括真实JSON往返，而不添加一阶段兼容fallback |
| 当前二阶段缺陷 | `main.ts:6940–6948`只在DEV注册，`:6942`绑定`buildCurrentSavePayload`；`save/ops.ts:34–39`需world/position/projectId。实际注册函数零参调用后三个字段undefined，JSON仅version/contentVersion，正式preflight拒projectId |
| 当前正确零参捕获 | `main.ts:958`深克隆world，`:5589–5596`克隆位置并附真实inputProject ID。相同合法内存世界经真实capture/codec/restore成功；不是builder/codec或工程数据缺陷 |
| 当前安全与并发边界 | `main.ts:5603–5622`先经saveSnapshotQueue，`runtime-script-project.ts:466–496`等待barrier后同步快照并finally释放。重复barrier不是自动排队，会报“已经关闭”；`runtime-save-lineage.test.ts:306–337`已有此合同 |
| 当前世界身份 | `main.ts:3929`唯一构造并赋值scriptRuntime；`:721–731`保持canonical world对象并同步替换内容；`:5741–5761`读档world/scene提交无await。导出应像现有保存一样读取实际快照执行时的当前世界，不拼请求时world与稍后scene，也不要求另建旧请求token |
| 本任务目标 | DEV零参异步接口等待同一快照队列/barrier，返回独立当前payload；正常保存的meta/payload同边界与独立写队列不变。无输入参数、无默认世界/地图中心/工程ID补猜 |

源码路径省略前缀时均指`packages/reforge/src/`。仅代码/内存宿主取证，未运行浏览器或PAL剧情。

### 已复算证据（2026-09-17，Codex）

旧探针保持零修改，执行：

```sh
node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-barrier.mjs --mode=observe --case B11
node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-barrier.mjs --mode=contract --case B11
node --import tsx docs/ops/audits/pre-e2e/probe-glm-next-barrier.mjs --mode=contract --case B12
```

- B11 observe exit0/reproduced；contract exit1业务断言：`存档工程 "undefined" 与当前工程 "b2-save" 不匹配`。
  该探针抽取真实`dumpSave`属性，不是只调builder。B12 contract exit0：实际capture→normalize→restore恢复money=123、目标scene/position；外围资源/渲染/存储不在该证明内。
- 独立Vite只读加载真实`world-async-fixture.mainApi`与ops/codec/content：真实注册函数arity=3，零参JSON=`{"version":8,"contentVersion":20}`；
  正控真实capture通过current codec，分数坐标1.5/2.5保持。修改输出money/位置后原world/party/player位置不变，说明现有capture已有深隔离，不臆造别名缺陷。
- 另一次真实runtime诊断：confirm挂起→直接capture的`checkpointComplete`缺席；同runtime的withSaveBarrier在答复前snapshotCalls=0，
  答复及后续setFlag完成后snapshotCalls=1、flag=true。等待中再请求barrier明确报“save barrier 已经关闭”。
  这证明只绑capture不足以满足安全点合同，共用队列也不是无证据的架构扩张；不是新的正式回归或完整bootstrap验证。

### 替代解释、证伪与行为偏离

- 最强替代解释：钩子本来要求调用方传三参。反证：现行E2E文档约定零参，DEV绑定无封装；全仓`dumpSave`调用清单只有此注册、诊断和待建文档，没有工作中的三参runner合同。
- runtime/命令语义：builder是合法纯拼装函数，故修主壳注册/快照入口，不给builder加隐式全局状态或fallback。
- 原版/第一阶段：不以原盘经验改变当前保存规则；不扩大成战中任意保存或剧情续播格式。
- 提取/地图/解码：合法空白工程及内存world正控已通过同一codec，错误发生在字段根部，不存在迁移/PAL手改依据。
- audit/test model：已执行实际注册属性，正控与反例共用codec；当前capture本身隔离成立，不因“怕引用”而重复深克隆整个世界。
- 可证伪：若注册点实际会补参、三参调用已是受支持接口，或共用队列并非同runtime/barrier，须停下重核；若实现只修字段但安全点前快照或F5并发报重复barrier，即不通过。
- 主动偏离已核真值：no。before→after为不可用缺字段对象→await取得合法安全快照；异步是等待既有合同的必要结果，文档须显式写await。
  代表场景：runner在确认流程结束后导出下一段起点，不能拿确认前状态冒称段完成；调用者仍负责业务结束断言。

## 上下文锚点

- [AGENTS](../../../AGENTS.md)、[CLAUDE](../../../CLAUDE.md)、[READ-FIRST](../../phase2/READ-FIRST.md)、[协作流程](../agent-workflow.md)。
- [Q1追加缺陷](../audits/pre-e2e/summary.md#审计后实现期追加2026-09-07)、[批二B11/B12](../../testing/glm-pre-e2e-boundary-batch-2-report.md)。GLM原始探针贡献须披露，Codex本轮独立复算不称GLM独立终审。
- [保存子链已完成卡](../archive/tasks/done/SAVE-BARRIER-LINEAGE-1-nested-script-save.md)、[实现回执](../../testing/save-barrier-lineage.md)：不改coordinator/lineage准入，不重开其设计。
- [E2E顺序](../../phase2/roadmap.md#第二阶段后半程路线)：修前置缺陷→R4 content20薄基线→N6b content21→完整E2E，不把整仓覆盖率目标当本卡附加准入。
- 现有`save/restore-preflight.chain.test.ts`、`save-lineage.chain.test.ts`、`runtime-save-lineage.test.ts`、`save/store*.test.ts`；正式新测试不得import审计探针代替生产链。

## Draft：最小设计

1. 在main内部抽一个同步快照回调的异步排队入口，共用**现有**saveSnapshotQueue；任务执行时取得当前runtime，调用现有withSaveBarrier。
   尾Promise无论成功失败均归一化为void，调用方仍收到本次原始错误。不能另开一个export队列去竞争同一barrier。
2. doSave只将现有meta/payload同步捕获块交给该入口；meta/payload仍同一次深快照，thumb失败处理、saveWriteQueue、提交成功才增savedTimes等顺序不变。
3. DEV dumpSave注册为零参异步wrapper，调用同一入口并复用captureCurrentSavePayload；不附meta、不碰saveStore/缩略图/保存次数，不调用doSave绕道写槽。
4. 捕获时点与普通保存一致：排队和barrier等待结束后的同步时刻；读档/场景同步提交若已结束就捕获新状态，未结束则捕获当前已提交状态。
   不混合两个时点、不尝试恢复等待中的旧世界；snapshot本身无await，不改变现有加载提交保护。
5. 超时/异常直接reject，不返回空对象或半档；下次导出/保存可继续。保留10秒上限，不引入自动重试或吞错；调用方必须await并处理失败。
6. 文档只在实现后改为可用，示例显式`JSON.stringify(await window.__tpE2e.dumpSave())`。这里只冻结拟议合同，不预宣告导出已修。

产品预计只改`packages/reforge/src/main.ts`；新增`packages/reforge/src/checkpoint-export.chain.test.ts`。
必要时新建本卡专用测试fixture/负控脚本，但不修改共享公共接口/旧断言。超出上述产品面先说明并重新评估，不顺手改codec/调度器。
并发风险重点：多保存/导出抢同一barrier；失败毒死队尾；重构意外让存储I/O持有barrier；假AST测试未覆盖真实DEV绑定；JSON往返丢字段。

## 验收条件

| ID | 必须核验 |
|---|---|
| CE-01 | 从实际DEV注册点零参调用并await，SAVE8/content20/projectId/world/position齐全；JSON序列化再解析通过真实preflight/normalize，并经现有restore链核关键字段 |
| CE-02 | world/party/script/position独立；快照后改变实时状态不改变输出，改变输出也不影响实时状态；分数坐标、显式静音/合法可选字段不丢失 |
| CE-03 | 真实ScriptProjectRuntime内confirm→尾标志，等待期不拍快照，安全点后返回完整尾标志/游标；不能以假的立即resolve barrier证明 |
| CE-04 | 两次导出、保存→导出、导出→保存都依请求顺序进入同一快照队列，不报重复barrier；不得只断言两Promise都resolved |
| CE-05 | 导出超时/快照抛错均reject且无空快照，下一次有效导出和普通保存可用；测试用假时间推进生产上限，不改全局超时 |
| CE-06 | 导出不读写槽、不制作缩略图、不消费savedTimes；存储在途不占用快照barrier，普通保存的既有写队列/失败/计数语义不变 |
| CE-07 | 等待期间一次合法世界/scene同步提交，捕获时字段来自同一当前提交，不能拼旧world与新position；不复制替代restore算法当端到端证明 |
| CE-08 | DEV注册范围不变，正常生产不暴露新公共入口；dumpMotionTrace/State/clear绑定不受影响；全仓调用与文档改用await，无旧兼容分支 |

- 新回归须钉真实注册/主壳函数体，合法非空fixture。负控至少：恢复裸builder、绕barrier、导出另走独立队列、吞快照失败，唯一命中+真实业务红+完整实现绿。
- 定向/相邻save与runtime、Reforge typecheck、改动文件Biome；集成后串行完整check→官方ratchet→受保护单次严格fast，不与GLM临时测量共享输出。
- 旧B11探针为历史同步调用模型；修成Promise后它不能自动证明新合同。保持原探针零改动，新正式回归必须await，不能把旧探针继续红说成修复失败或用其红因自证。
- 文档/回执准确披露GLM原始诊断贡献；该卡没有GLM测试实现贡献，不能借另一编辑器卡签字代签。

### 集中E2E登记

时机e2e-deferred，Owner Codex。R4独立测试工程从合法入口启动→业务完成断言→await导出并保存JSON→
新页面`?e2e-load=<本检查点>`走正式恢复→断言工程、场景、队伍/背包/标志及下一条可操作行为。
加确认框挂起期间请求导出→答复继续→检查尾标志；失败后不得发出下一段检查点。证据归R4执行回执，当前未跑也未声称完成。
本卡无可见界面改动，不为每张保存卡重复走PAL剧情；功能正确性在代码级闭环，完整runner/画面归R4。

## 推进签字

### 进入build前

- Codex（2026-09-17）：**premise verified / design agree**。直接读取主壳真实绑定/capture/队列、runtime barrier与current codec；B11实绑零参业务红，B12同codec/restore正控绿；独立复算深隔离、真实等待期不拍快照与重复barrier拒绝。证据/反证见上，不推断原版机制。
- Kimi：**premise verified / design agree（2026-09-17，r1，取证产品 c1cec3ad；全部证据本人直读/复跑，未读 GLM 结论）**。
  - **缺陷直读**：`main.ts:6940-6948` DEV 分支 `dumpSave: buildCurrentSavePayload` 裸绑；
    `save/ops.ts:34-39` builder 签名 (world, position, projectId) 三参必填；零参调用后三字段
    undefined（JSON 仅 version/contentVersion），正式 preflight 拒 projectId。全仓无受支持的
    三参 runner 调用方、e2e.md:243-250 登记零参合同——「本意要求传参」替代解释不成立。
  - **正控链直读**：`main.ts:958` `currentWorldSnapshot=()=>structuredClone(world)`；
    `:5589-5596` captureCurrentSavePayload 克隆 position + 真实 inputProject.manifest.id——
    正确零参捕获已在主壳内，修注册/排队入口而非 builder/codec 的层判正确。
  - **安全边界直读**：`main.ts:5603-5622` doSave 经 saveSnapshotQueue + withSaveBarrier，
    meta/payload 在同一同步块深快照（注释明示存储 I/O 不得持 barrier）；尾 Promise
    `.then(()=>undefined,()=>undefined)` 归一化——错误不毒死队尾；barrier 等待后同步快照、
    finally 释放（runtime-script-project.ts:466-496，保存子链卡已终审）。共用队列是现行安全点
    合同的必要结果，不是架构扩张。
  - **本人复跑**：B11 observe exit0/reproduced（registeredZeroArg=true、codec 拒
    「工程 "undefined"」）；B11 contract 业务红（断言文本在位）；B12 contract exit 0
    （真实 capture→normalize→restore 恢复 money=123）。旧 B11 为同步调用模型，其红不能
    自证新异步合同（卡面已钉，本席背书）。
  - **设计同意**：main 内抽同步快照回调的异步排队入口共用现有 saveSnapshotQueue（不开第二
    队列抢同一 barrier）；doSave 语义不变；DEV dumpSave 零参异步 wrapper 复用
    captureCurrentSavePayload、不碰槽/缩略图/savedTimes/不经 doSave；捕获时点=排队+barrier 后
    同步时刻（与普通保存一致，不拼两个时点）；超时/异常 reject 无重试无吞错；文档实现后再改且
    示例显式 await。产品面限 main.ts + 一个新测试文件；CE-01～08 覆盖真实注册调用、深隔离、
    真实 barrier（禁假立即 resolve）、队列顺序、失败恢复、零槽副作用、并发提交一致性、
    DEV 范围不变；负控制（裸绑/绕 barrier/独立队列/吞快照失败）要求唯一命中+业务红。
    不扩 SAVE8/content20、无旧兼容分支。
  - **可证伪观察**（任一反例即 counter 或收窄）：① 注册点实际补参或存在受支持三参调用方 →
    前提倒（本人核对否定）；② 只换绑定不经 barrier → CE-03 红；③ 导出另开队列 → 重复
    barrier「已经关闭」；④ 失败毒死队尾或存储 I/O 持 barrier → CE-05/06 红；⑤ JSON 往返丢
    分数坐标/可选字段 → CE-02 红；⑥ 扩大 SAVE8/content20 或新增公共入口 → 越界。
  - 返工项：无。非阻断备注：WORLD 卡终审相关返工若触及快照依赖须重核（卡面已列，本席背书）；
    失败提示的「调用方必须 await 并处理失败」在文档示例中落实，终审时核。
- GLM：**premise verified / design agree（2026-09-17，r1，取证产品 c1cec3ad、工作树 e06cba01 相对基线仅文档；
  全部证据本人直读/复跑，未读 Kimi 结论；B11/B12 探针为本席批二原始材料，本轮为独立重核）**。
  - **缺陷直读**：`main.ts:6940-6948` DEV 分支 `dumpSave: buildCurrentSavePayload` 裸绑三参 builder；
    `save/ops.ts:34-40` 签名为 (world, position, projectId)。零参调用后三字段 undefined——`e2e.md:243-250`
    已把该钩子登记为待修且合同为零参，全仓无受支持的三参 runner 调用方，"本意要求传参"替代解释不成立。
  - **正控链直读**：`main.ts:958` `currentWorldSnapshot=()=>structuredClone(world)`；`:5587-5596`
    captureCurrentSavePayload 克隆 position 并取 `inputProject.manifest.id`——零参捕获在主壳内已有正确实现，
    修注册/队列而非 builder/codec 的层判正确。
  - **安全边界直读**：`main.ts:5603-5622` doSave 经 saveSnapshotQueue + `withSaveBarrier(prepareSnapshot)`；
    `runtime-script-project.ts:466-496` barrier.ready 后同步快照（thenable 拒绝）、异常 cancel、finally release。
    只重绑 capture 不经 barrier 会拍下确认框中途半状态——设计走共用队列不是架构扩张，是现行安全点合同的必要结果。
  - **本人复跑**：B11 observe exit0（registeredZeroArg=true）+ contract 业务红「存档工程 "undefined" 与当前工程
    "b2-save" 不匹配」；B12 contract exit0（真实 capture→normalize→restore money=123）——红因在字段根部，
    非迁移/工程数据缺陷。旧 B11 为同步调用模型，修成 Promise 后其红不能自证新合同（卡面 :111 已钉，本席背书）。
  - **设计同意**：D1 共用现有 saveSnapshotQueue 的同步快照排队入口+尾 Promise 归一化；D2 doSave 语义不动；
    D3 零参异步 wrapper 复用 captureCurrentSavePayload、不碰槽/缩略图/计数；D4 捕获时点=排队+barrier 后同步时刻；
    D5 超时/异常直接 reject 无重试；D6 文档实现后再改——与 CE-01～08 逐条对应，产品面限 main.ts+新测试文件。
  - **可证伪观察**：①若 DEV 注册点实际补参或存在受支持三参调用方→前提倒（本人核对不存在）；②实现只换绑定
    不经 barrier→CE-03 红（确认挂起期 snapshotCalls=0 已由 runtime 诊断+本人批二 B05 族知识佐证）；
    ③导出另开队列抢同一 barrier→重复 barrier「已经关闭」（CE-04，合同已在 runtime-save-lineage:306-337）；
    ④失败毒死队尾或存储 I/O 持 barrier→CE-05/06 红；⑤JSON 往返丢分数坐标/可选字段→CE-02 红
    （JSON.stringify 丢 Map 语义的工程经验 :65 已列）；⑥实现扩大 SAVE8/content20/新增公共入口→越界。
  - 返工项：无。本席只签设计；实现由 Codex 负责，本席不改 reforge。
- 非Owner独立primary证据：Kimi与GLM分别完成，见上方证据与反证；缺签豁免：无；build准入：build allowed（2026-09-17 Codex核定，本卡三席齐、无counter）。

### 进入done前

- Codex：pending。
- Kimi：pending。
- GLM：pending。
- 缺签豁免：无；done准入：blocked。

## 实现、审查与交接

- 2026-09-17 Codex：用户确认“签了”；核当前787c1e0f与远端同步、工作树干净，本卡三席r1齐且无counter，推进build。产品取证基线以来零漂移；先写真实注册/安全点/共队列回归，再实现main最小修复。GLM编辑器四组独立推进。
- 2026-09-17 Kimi：完成 r1 独立设计审查，签 premise verified + design agree，无返工项。
  直读 main.ts:6940-6948 裸绑注册、ops.ts:34-39 三参 builder、:958/:5589-5596 正确零参捕获、
  :5603-5622 共用队列+barrier 同步快照与队尾归一化；复跑 B11 observe/contract（真注册零参业务红）
  与 B12 正控（money=123 往返绿）。六条可证伪观察写入本席；不扩 SAVE8/content20。
  未改产品/他席/状态，未开始实现。Next：三签齐后 Codex 实现，终审按 CE-01～08。
- 当前产品零改动；正式回归、质量门、实现终审均未执行；用户验收pending。
- 2026-09-17 Codex：按用户“给他们提示词，你做你的工作”推进主线，完成上述只读取证与r1 draft；GLM/Kimi另有编辑器工作包，本卡不占其产品/测试面。下一步两席独立设计审查，准入齐后Codex实现。

## 下一位Agent提示词

与[编辑器补测工作包](TEST-EDITOR-LOGIC-COVERAGE-1-editor-command-boundaries.md#下一位agent提示词)的分配并行；两席只写各自签字与日志并提交推送，不改状态/产品，不代签。

### Kimi

```text
另审 Q1-CHECKPOINT-EXPORT-1 r1：docs/ops/tasks/Q1-CHECKPOINT-EXPORT-1-current-save-hook.md（draft），取证产品c1cec3adde5b0090acbc6bc1f325ca1301689873，Codex是Coding Owner。
先同步查工作树，读AGENTS.md、CLAUDE.md、READ-FIRST、本卡、当前存档/E2E规范及已完成保存子链卡。独立核真实dumpSave注册/三参builder、capture深隔离、saveSnapshotQueue/withSaveBarrier、世界与scene同步提交域，复算B11业务红和B12正控；当前只诊断未实现。
重点压力测试：只换绑定为何不足、共用队列不持存储I/O、错误后队尾恢复、异步await合同、JSON往返及不扩SAVE8/content20。不要读取/复述GLM结论。只在本人席位签带primary证据/可证伪观察的premise verified/design agree或counter并提交推送；不改产品/他席/状态，不开始实现、不标done。
```

### GLM

```text
另审 Q1-CHECKPOINT-EXPORT-1 r1：docs/ops/tasks/Q1-CHECKPOINT-EXPORT-1-current-save-hook.md（draft），取证产品c1cec3adde5b0090acbc6bc1f325ca1301689873，Codex是Coding Owner。
先同步查工作树，读AGENTS.md、CLAUDE.md、READ-FIRST、本卡、当前存档/E2E规范。独立核真实主壳注册与B11/B12，CE-01～08合法fixture、同一快照队列/真实barrier、导出零槽副作用、JSON往返、错误恢复与负控制。旧B11是同步探针，异步实现不能拿旧红因自证；不改原探针，不把“有字段”当完整安全快照。
不读取/复述Kimi结论，不做视觉。只在本人设计席位签有一手证据的premise verified/design agree或counter并提交推送，不改产品/测试/他席/状态、不标done。本卡与你负责的编辑器四组测试独立，不替Codex实现；签齐后回去连续完成编辑器工作包。
```
