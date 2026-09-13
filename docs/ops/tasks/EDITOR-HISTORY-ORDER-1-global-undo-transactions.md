# EDITOR-HISTORY-ORDER-1 - 全局撤销顺序与成对操作完整性

Status: build
Phase: phase2
Capability: ops（审计 D-01 修复，不新增能力格）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: both
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: main
Revision: r1（2026-09-13，三席前提/设计已签，Codex核定build准入）
Evidence Baseline: 9fd32674（产品同10c84238；本轮仅文档推进）

## 目标与范围

连续撤销/重做严格按照用户实际操作顺序；一个同时涉及主属性与脚本的操作必须整笔处理，不能留下半个动作。
本卡承接 D-01，不重开 A-07 离开保护；用户已要求继续，并要求给 GLM 更多并行工作。

- 范围内：两 session 与项目级历史协调、当前跨 session 成对命令、全局菜单/工具栏/快捷键接线、
  失败时历史/内容保全、保存合并时拒绝“有私有脚本引用但无正文”的半状态、相邻回归与覆盖率。
- 范围外：持久化历史、跨浏览器 undo、D13 时间旅行、协同编辑、玩家存档、A-02/A-03 保存协议、
  D-02 引用补边、其他审计缺陷、schema/迁移、PAL生成文件、全仓 Command 重写或新历史面板。
- 不改现有按钮尺寸/布局、文本输入自己的撤销；不增加拖拽/移动等无关交互。
- GLM 并行工作见[工作包](../../testing/glm-pre-e2e-prep.md)：D-01 设计签字优先交回，其他三组只读取证可继续，
  不因此授权提前改任何产品代码/正式测试，不拖住本卡已有准入流程。

## 前提真值门

一句话：当前 App 用“最后发通知的是哪个 session”猜全局历史；undo 也更新这个标记，连续撤销会选错栈。
配对协调器只在两半都在栈顶时接管，返回 false 后 App 的单栈 fallback 会拆开事务。

| 维度 | 真值 / 目标 | 一手证据（行号据9fd32674） |
|---|---|---|
| 原版 / primary source | 原版无本创作编辑器；现行产品合同规定全局 undo/redo、一意图一笔、失败零写入、成功新编辑才清 redo | [设计规范](../../phase2/specs/editor-design-system.md) DS-I.2/4，行911、931–934；[编辑器会话](../../../packages/editor/src/core/edit-session.ts) 行1–11 |
| 第一阶段 | N/A：一阶段游戏进度/菜单不是作者编辑历史，不能拿玩家存档或旧引擎流程定义本卡 | [CLAUDE](../../../CLAUDE.md) 阶段边界；[READ-FIRST](../../phase2/READ-FIRST.md) 新编辑器架构与无对应UX边界 |
| 当前二阶段 | 最后通知归属会被undo改写；配对失败转单栈；丢失的正文可被保存合并静默跳过 | [App](../../../packages/editor/src/ui/App.tsx) 行1605–1660；[协调器](../../../packages/editor/src/core/editor-history-coordinator.ts) 行22–88；[保存投影](../../../packages/editor/src/core/script-editor-projection.ts) 行88–116/187–199 |
| 本任务目标 | 单一项目级操作时间线决定全局undo/redo，配对为一个提交；失败不产生半状态；保存不抹平缺正文错误 | 本卡H-01～H-12验收目标；不声称已经实现 |

### 当前复核与可证伪观察

- 已直接重读[原审计](../audits/pre-e2e/editor-workflows.md#d-01--跨会话撤销没有统一的时间顺序)及其全部
  [原探针](../audits/pre-e2e/probe-editor-history.mjs)，本轮原文件与产品零改动。
- 原探针直接跑先在 `.type-pal/save-state.json` 缺席处失败：旧内存 FileSource 抛通用 assertion，
  不符合当前 loader 的 NotFoundError 合同。该失败不是“D-01已修”的证据。
- `/tmp/type-pal-history-draft.zKSHBp/reprobe.mjs` 仅将导入/root改为可从临时入口解析的绝对URL，并令
  缺席 save-state 抛 NotFoundError；其余输入、产品调用、AST抽取与业务断言保持原样。未启HTTP/浏览器/真实IDB，fetch明禁。
  第一次临时 data-URL 导入尚缺 Vite 绝对file-URL转换，只有环境错误；修正后 `current-history-final.log` exit0，
  含三组**旧错误行为特征复现**，不是正确性测试绿色：
  1. 仅配对 P：undo两边归零，redo两边恢复，序列化通过（正向控制）。
  2. P→M买价10→S正文wait(1)→两次undo：买价仍10、shell引用1、canonical正文记录0；
     序列化输出effects=[]。紧接redo可以恢复空正文记录，不叫永久丢失。
  3. M买价10→S正文wait(1)→M买价20→两次undo：错误回买价0而脚本仍wait(1)；正确应买价10、正文回空。
- 最强替代解释：A-07 已间接建立正确全局历史，或问题只是私有脚本模型/某个命令；
  新复核中普通交错与配对反例同时成立，且历史函数相对首轮仍未修，排除此解释。
- 反证条件：使用真实当前主/脚本入口及全局历史操作能按预期顺序恢复，或上述合法输入被正式loader拒绝，
  则应更正前提；不能通过更改探针预期或移除失败断言让前提“成立”。
- 替代根因排查：命令各自的单栈控制可用，但路由选错；第一阶段无对应作者UX；不依赖提取/地图解码；
  探针环境过期已单独排除，合法seed经过正式loader，业务调用及错误结果直接观察。
- 无主动偏离产品合同。before→after：连续撤销可能走错/拆半 → 按实际逆序整笔撤销；代表为上述P/M/S。
  用户已要求按审计队列修复，不另问“是否应该正确撤销”，事实与实现准入仍由三席负责。

## 上下文锚点

- [AGENTS](../../../AGENTS.md)、[READ-FIRST](../../phase2/READ-FIRST.md)、[项目生命周期](../../phase2/specs/project-lifecycle.md)：
  当前canonical、不可变command、单Coding Owner、已完成A-07保护不得回退；不开历史版本兼容分支。
- [EditSession](../../../packages/editor/src/core/edit-session.ts) 行190–318：dispatch/undo/redo、
  transaction receipt、map dirty/pin/revision/reference缓存；[ScriptEditSession](../../../packages/editor/src/core/script-editor.ts)
  行1368–1457：状态、历史、affectedRecordsByVersion与回滚。
- [Root](../../../packages/editor/src/main.tsx) 行122–147/158–176：装配新双session后才挂App；
  App当前用useMemo创建协调器，必须考虑StrictMode和卸载/重连，不能在render遗留第二个订阅Owner。
- [ItemTab](../../../packages/editor/src/ui/ItemTab.tsx) 行1016–1036/1150–1179：创建/删除私有脚本配对；
  App行1785–1817/1893–1904/2057：场景复制/创建/删除、实体增删配对。GLM须完整census，不只复制这些例子。
- [派生索引](../../../packages/editor/src/core/editor-derived-store.ts)、[离开守卫](../../../packages/editor/src/core/project-leave-guard.ts)：
  使用historyVersion/affected records观察变化；不得因新增全局时间线而回退版本或误放行旧离开授权。
- 既有 `editor-history-coordinator.test.ts` 4项只覆盖简单配对；同文件legacy变量指当前shell投影，
  不据变量名批量删当前ScriptRef。`__author-script-runtime`仍为合法内部lowering，不是旧文件分片回归许可。

## Draft：设计选择

### 唯一全局顺序，保留领域状态

1. 将EditorHistoryCoordinator收敛为**项目级操作日志的唯一顺序/事务Owner**，记录每次成功作者提交的独立事务身份，
   entry为主命令、脚本命令或成对命令。所有现行session.dispatch入口必须被纳入，不能只修App几个按钮。
2. 两session仍持各自领域状态、dirty、地图元数据/affected records。现有单会话API可保留；
   绑定同一项目日志后，undo/redo与新分支裁定必须经该Owner，不能出现两套可独立选择的全局past/future。
   局部命令/反向资料若作为执行索引保留，只能由Owner驱动并验证对应事务身份，不参与“猜哪边更新”。
3. 使用明确的成功作者提交/历史操作通道，不从普通subscribe/getHistoryVersion推导新作者动作；
   undo/redo、markSaved、hydrate、discardRedo、失败补偿不能伪装成新编辑提交。命令对象本身不能充当唯一提交身份，
   同对象重复使用的现有合同须核清，不能把对象相等误当同一笔事务。
4. 删除historyOwnerRef和App单栈fallback；工具栏/菜单/快捷键、可用状态与动作名称来自同一全局日志。
   保持按钮形态，动作名称复用已有可访问标签/提示，不新增历史列表UI；输入框本地历史与modal屏蔽保持既有边界。

### 原子性与分支

5. 配对dispatch作为一笔提交。两侧apply/invert都成功才改变全局历史；失败恢复内容、past/future、dirty、
   地图/pin/revision与脚本affected记录的正确逻辑状态，不以一次普通redo/undo补偿留下半笔redo。
   ScriptEditSession.undo当前先pop再invert，需要同组修复失败先后序；不只修正常路径的排序。
6. 事务期间对外不暴露只应用一半的状态；通知在两侧和日志就绪后发布。提交后的通知异常与提交失败分清，
   不能因此只回滚一边或复活redo。版本保持单调，失败/补偿该发的失效通知仍发，不把“零内容变化”说成“零通知”。
7. 任一侧新的成功作者操作清掉**整个项目**的redo分支；失败与明确返回原态的no-op不能清redo。
   不为本卡在每次操作深比较/永久深拷贝全工程与媒体；广泛的值相等但返回新引用的Command治理不混入本卡。
8. 同一项目日志只绑定一组session；connect/dispose与StrictMode明确、一组只一个活跃Owner，重连不清有效历史。
   Root当前装配新空历史可直接建立日志；不能把两个已经各自编辑过且没有可比较顺序的栈事后猜序拼接。
   接线/样例若有该真实域，设计审查时列counter并收敛初始化合同，不能build时静默丢历史。

### 保存边界与限制

9. 在保存专用 `mergeEditorProjectionWithCurrentAuthorState` 入口核“shell当前私有脚本引用→canonical正文”完整性，
   缺失时给出物品/脚本位置并拒绝，错误进入既有保存反馈，零writer提交；**空正文[]合法**，
   被shell移除/未引用的canonical记录不自动判错。共用的UI投影函数不能被无差别改成中间态就抛错。
10. 保存/打开/另存/导出/离开门禁和正式文件格式不改；不重建旧脚本分片/旧格式fallback。
    r1代码面预计限editor会话、协调器/必要内部历史helper、保存投影、App与对应测试；
    非必要不得改reforge/content/migrate、资产管线或生成工程。若需要扩大，先回卡说明并按协议收敛。

## 验收矩阵

均为待实施，不把当前错误特征探针通过当验收通过。

| ID | 必须证明的业务结果 |
|---|---|
| H-01 | 普通M/S/M交错，三次undo严格逆序、三次redo严格正序；主/脚本互换同样成立 |
| H-02 | P/M/S与S/M/P等排列，P恰一次整笔undo/redo，不出现shell有引用而正文缺席 |
| H-03 | 场景新建/复制/删除、实体增删、私有脚本增删所有现行配对入口核清；每族至少一正向回归 |
| H-04 | 任一侧新编辑清全局redo；跨多笔混合历史，另一侧不能重做孤儿；失败/no-op对照保留原redo |
| H-05 | 无历史、只有main、只有script、连续undo到底/redo到底不越界；状态与可用按钮一致 |
| H-06 | dispatch/invert/redo任一参与者抛错，内容、全局历史、局部执行索引及dirty保持正确，无半redo；后续合法操作仍可用 |
| H-07 | 保存标记、地图hydrate/引用通知不改变全局操作顺序；地图dirty/pin/revision与脚本受影响记录不回退 |
| H-08 | StrictMode重挂载/清理、重开项目、同工程新App实例不串历史；禁止重复Owner或无依据拼接旧栈 |
| H-09 | 保存遇shell引用缺正文先拒绝，空正文合法；修正后正式保存/loader重开核值，不靠toast判成功 |
| H-10 | 真实App按钮与快捷键调用同一日志；modal/文本框边界与A-07 busy/dirty/choice守卫不回退 |
| H-11 | 单点负控制能抓：旧通知归属算法、拆开pair、只清一侧redo、失败先pop历史、保存静默丢正文 |
| H-12 | Codex最小功能界面验证：主属性与脚本交替编辑→连续撤销/重做→保存重开；不要求用户跑技术命令 |

- 按命令成功提交计序，不用Date.now、延时或测试文件排序凑确定性；真状态/命令/正式loader，必要外部IO才替身。
- 定向/相邻、editor typecheck、完整pnpm check、官方ratchet与单次严格fast；旧测试/源码不缩范围、门槛不下调。
- 当前参考check6918/fast6430，不是本卡通过数；精确新增和修订身份逐项对账。
- R4：物品买价与私有脚本交替修改、成对新增场景/实体、撤销到基线并全部重做→保存→重开→试玩。
  本卡只做开发期最小功能验证，R4完整链仍集中；视觉只由Codex执行。

## 推进签字

### 进入 build 前

- Codex（2026-09-13）：premise verified，基于上方当前反例与控制；design agree，按唯一日志/原子配对与保存拒绝半态方向。
  可证伪观察：同一合法P/M/S经当前App能正确撤销、或有既有权威时间线遗漏未读，则重开前提。
- Kimi：**premise verified / design agree（2026-09-13，r1，证据基线 9fd32674；全部证据本人直读/复跑，未读 GLM 结论——其签字于本人核查完成后落盘，仅确认席位位置）**。
  - **通知归属缺陷直读**：`App.tsx:1605-1660` historyOwnerRef 由两 session subscribe「最后通知」
    写入；而 `edit-session.ts:121` undo/redo 自身递增 historyVersion——**撤销动作会改写归属标记**，
    下一次撤销再选同一栈，路由必然错。协调器回 false 后 App 单栈 fallback（:1632-1660）在案。
  - **配对拆半直读**：`editor-history-coordinator.ts:38-45` undo 要求 pair 两半同时 `isUndoTop`，
    否则 return false 转单栈——P/M/S 交错时必然拆半；`:51` 失败用普通 `redo()` 补偿、
    `script-editor.ts` undo **先 pop 后 invert**（invert 抛错即丢栈项），设计点 5 的同组修复必要。
  - **保存跳过缺正文直读**：`script-editor-projection.ts:99-114` shell 私有脚本引用在
    canonicalPrivate 查不到时 `continue` 静默跳过——拆半产物（shell 有引用、canonical 无正文）
    在保存合并被抹平；`mergeEditorProjectionWithCurrentAuthorState`（:187-199）为保存专用入口，
    设计点 9 在此加完整性守卫、共享 UI 投影不抛中间态，落点正确。
  - **本人复跑**：原探针先在 `.type-pal/save-state.json` 替身处 assertion 失败（环境过期，
    **不作为产品已修证据**，与卡面一致）；改编 reprobe exit 0 复现三组特征——
    ①配对 P 正控 undo/redo 双边归零/恢复、序列化通过；②P/M/S 两次 undo 后 price=10、
    shellEffects=1、canonicalEffects=0（拆半），序列化 effects=[]；③M/S/M 两次 undo 后
    price=0 且正文仍 wait(1)（正确应为 price=10、正文回空）。普通交错与配对反例同时成立。
  - **设计同意**：协调器收敛为项目级操作日志唯一 Owner，所有 dispatch 入口纳入（GLM census
    兜底），两 session 保留领域状态/dirty/地图元数据；明确成功作者提交通道计序，不从
    subscribe/historyVersion 推导，undo/redo/markSaved/hydrate/discardRedo/失败补偿不冒充新提交，
    命令对象不当事务身份；配对一笔提交、失败恢复内容/历史/dirty/affected，修 pop-then-invert
    先后序，通知在双侧与日志就绪后发布；任一侧新成功作者操作清整项目 redo、失败/no-op 不清；
    StrictMode/重连单一活跃 Owner、不事后拼接两已有栈（Root main.tsx:158-176 现行均为新空栈
    装配，无该真实域）；保存入口拒绝 shell 引用缺正文（空正文合法、未引用记录不自动判错）、
    共享投影函数不改成中间态抛错。范围确停在 D-01：无持久化历史/协同/新面板/格式或 A-02/A-03
    协议改动。
  - **可证伪观察**（任一反例即 counter 或收窄）：① 当前 App 任一合法 M/S/M 已按正确顺序撤销、
    或正式 loader 已拒绝上述输入 → 前提倒（本人复跑否定）；② 实现后仍存在绕过日志的单独
    dispatch 入口（census 缺口）；③ undo/redo/markSaved/hydrate/discardRedo 能产生日志项；
    ④ 配对失败留下半笔内容/历史或孤儿 redo、ScriptEditSession.undo 仍先 pop；⑤ 保存仍静默
    跳过缺正文，或误拒空正文 []/未引用记录；⑥ StrictMode 双 Owner 或重连清历史；
    ⑦ 删除通知归属算法的单点突变仍全绿 → 回归未钉住。
  - 返工项：无。非阻断备注：通知在双侧与日志就绪后发布与「版本保持单调但失效通知仍发」
    两条需在实现期统一口径（通知异常≠提交失败，也不把零内容变化说成零通知）；
    全局动作名称复用既有可访问标签，不新增历史列表 UI（设计点 4 已列）。
- GLM（2026-09-13，前提/矩阵席）：**premise verified**。本席独立直读当前 main（产品同 10c84238）一手源码，
  四条前提腿全部证实：①归属启发式——App.tsx:1602-1617 两份 subscribe 以「谁的历史版本变了」改写
  `historyOwnerRef`，App.tsx:1631-1653 undo/redo 在协调器返回 false 后按该旗选栈；undo 本身使被撤侧版本变化、
  旗随通知翻转，本席手推 M10→S(wait1)→M20→两次undo 得「买价回 0 而脚本仍 wait(1)」（第二撤应撤脚本），
  与卡内复现 3 一致；交错结尾在 main 侧时错误可达。②拆半——editor-history-coordinator.ts:44-52 `undo()`
  仅在 pair 两半都是栈顶时接管，否则 return false 落入上述单栈 fallback，成对命令被拆开。③静默跳过——
  script-editor-projection.ts:88-116 两处 `if (!replacement) continue`（itemPrivateScript 与
  `__author-script-runtime` 分支）：shell 引用私有脚本而 canonical 正文缺席时效果被无声丢弃，
  :187-199 `mergeEditorProjectionWithCurrentAuthorState` 无完整性核验。④失败次序——script-editor.ts:1425-1437
  `undo()` 先 `past.pop()` 再 `command.invert()`，invert 抛错时该项既不在 past 也未入 future，无补偿即丢历史项。
  替代解释（A-07 间接修好/仅私有脚本模型问题）不成立：普通交错与配对反例机制均独立于 A-07 与具体命令。
  **design agree**：唯一项目级日志/成功提交计序（设计1-4）正对启发式与通知推导；原子配对与失败先后序
  （5-7）覆盖④；StrictMode 单 Owner（8）——本席核 Root（main.tsx:158-176）只在 onOpened 成组新建双 session，
  当前不存在「两份已各自编辑的栈事后拼接」的真实域，初始化合同可收敛为「构造时空日志+成组绑定」，无需
  counter，未来新接线出现该域时须回卡；保存完整性守卫+空正文[]合法（9）与 ③ 精确对应，且共用 UI 投影
  函数不改中间态抛错的边界正确。H-01～12 逐条可证伪、含正控（H-05 边界、H-09 修正后正式保存/重开核值）
  与负控靶（H-11 五针）；H-10 显式保 A-07 守卫不回退——本席指出一点设计交互：A-07 离开守卫当前以两 session
  的 historyVersion 捕获修改版本（project-leave-guard 既有回归钉 hydrate/markSaved/discardRedo 语义），
  D-01 落地后 undo/redo/清 redo 仍必须保持「两侧版本照常演进、可区分作者提交」的既有合同，否则 A-07 的
  授权失效/保守失效用例会红——这与设计 3「不从普通 subscribe 推导新作者动作」同向，作为可证伪观察交给实现。
  可证伪观察：(a) 若经真实 App 全局 undo 入口的合法 P/M/S 今日已按实际逆序恢复，前提应重开（本席源码手推
  相反）；(b) 若 mergeEditorProjectionWithCurrentAuthorState 已拒绝缺正文（实测为 continue 静默跳过），
  设计 9 应收敛；(c) 若存在「拼接两份已编辑栈」的真实接线域而设计未列初始化合同，第 8 条须补 counter。
- 独立反证：GLM 已直接核四条一手证据（见上）；Kimi 席另行独立。
- counter / 分歧：无；三席r1前提/设计签字均有效，缺签豁免：无。
- build 准入：allowed。2026-09-13用户在取证包接收后要求“继续推进”，Codex核main aa326f3f产品仍同10c84238，前提/方案未变，准入生效，不重签。

### 进入 done 前

- Codex：pending。
- Kimi：pending。
- GLM：pending。
- done 准入：blocked；无缺签豁免，不代签。

## 实现 / 视觉 / 用户验收

- 2026-09-13取证接收阶段的历史边界：r1两席设计签字均已落盘（GLM623c592f、Kimi3f34c558），当时用户要求复核并行只读取证，
  尚未启动产品实现。GLM批028ad866的R1～R4 counter见[批次接收报告](../../testing/glm-pre-e2e-prep-report.md)；
  该counter针对取证/分类质量，不改变本卡已核前提或已签方案，不要求重签设计。
- 当前build首批：保存静默丢正文、脚本历史失败丢项/no-op清redo的保护与14项正式回归已落地；项目级日志与App接线尚未实施，整体H-01～H-12未完成。没有版本/能力格状态修改。
- 视觉未开始；Codex dev-functional；无新UI形态设计，沿用既有控件。
- 用户验收未开始；实现和三席终审完成后按用户裁决。
- 额度/资源生成：N/A，无缺席代班或生图。

### Build 首批：保存完整性与单会话失败边界

- 新正式回归：`packages/editor/src/core/editor-history-foundations.test.ts`，14项。材料来自GLM G-H08/12/15，
  Codex重建真实fixture、编写断言并独立验证；未来终审须披露GLM测试设计贡献，不当独立第三方自证。
- `ScriptEditSession.undo`在invert成功后才出栈；失败保留状态、dirty、historyVersion/通知版本、affected records及可重试undo。
  既有redo失败保全作为正控。dispatch返回原state时不入历史、不清redo、不发通知；三种栈位置均测。
  事务dispatch也识别无变化，协调器在脚本半边无变化时先拒绝，不执行main或发出可回滚的虚假receipt。
- 保存专用合并先核当前物品私有引用对应canonical正文，再序列化；物品缺席/脚本缺席/正文缺席明确失败。
  两种当前内存表面共用引用识别器：loader给canonical itemPrivateScript，ItemTab配对命令仍可给内部runScript引用。
  不增加历史格式兼容。UI/引用投影仍可读取不完整工作态；空正文[]、shell移除引用都保持合法。
- 保存负例由真实blank工程经过正式loader构造；失败无序列化readText、fixture全IO轨迹为空、输入不变；
  修正同一输入后正式序列化/loader重开核正文。**这不是App保存提示与正式writer全链验收**，后者随H-09/H-12剩余项完成。
- 先红记录：首个fixture误认loader输出runScript，导致6项fixture失败（非产品缺陷）；改为真实UpdateItemCommand生成内部引用后，
  初版11项中8红/3绿，红点为invert先pop、三种no-op入栈、四种缺引用保存错误放行。
  后续补正文缺席两项与事务no-op一项，最终14项；不把后加用例倒填为最初先红数量。
- 初步定向/相邻7文件93项通过、editor typecheck通过。证据目录`/tmp/type-pal-history-build.TjyP2Y/`。
- 首批统一质量门：完整`pnpm check` exit0、6,932项（editor 2,364）；改动源码/测试定向Biome0/0，
  全仓lint为0错误、48 warning/11 info，未借本卡扩大存量清理。
  官方`coverage:ratchet` exit0后，单次严格`coverage:fast` exit0，均6,444项/616生产文件；editor208测试文件/2,205项。
  新增14项全部入fast清单，基线只改editor及汇总/生成时间，未改变其它包或旧测试身份、未移除范围/降阈值。
  editor行22,047/27,708（79.57%）、分支18,923/27,408（69.04%）；仍未达到最终覆盖率目标，不以微增冒称覆盖率建设完成。
- 三针Vite隔离负控（磁盘产品零改，`negative.config.mts`，`HISTORY_NEGATIVE=undo|noop|save`）：
  undo先pop→1红，移除no-op早退→4红，去掉保存守卫→6红（4错误放行+2被下游校验拒绝但错误层位不同）。
  后两种正文缺席有下游重叠校验，不能冒称6项全部是放行级反例；无测试收集/环境错误。日志分别negative-undo/noop/save。
- 本卡未到review：全局交错顺序、配对原子发布/回滚、跨会话redo、生命周期与App统一按钮/快捷键/名称、
  功能视觉和完整保存链仍待实施。当前通过仅为上述首批边界，不把旧4项简单配对通过充作全局问题已修。

## 交接日志

- 2026-09-13 Codex连续推进：用户明确要求做到整卡完成，不再按小批停。主线持续完成实现/质量门/功能验证到可终审，
  正式done仍按原三席终审与用户裁决，不代签。GLM可并行[20项配对工作流回归](../../testing/glm-editor-history-workflows.md)，
  冻结dded6f27产品，仅新增独立测试/回执；Codex独占核心、App与视觉，不等待测试包才能继续实施。
- 2026-09-13 Codex准入：用户要求继续，已核三席r1签字及取证接收树aa326f3f，Status→build；仅Codex改实现。
  本卡采用GLM取证材料但正式回归由Codex独立断言/验证，未来终审披露贡献；不重开已签设计。
- 2026-09-13 Codex首批：三处安全边界与事务no-op收口已落地；14新回归、三针反控、check6,932、ratchet及严格fast6,444通过。
  未修改App/按钮样式、content/reforge/migrate、生成工程或原/GLM审计探针；视觉/全局日志与配对原子性待后续。
  下一步同Owner推进项目级历史，不请求用户验收技术切片、不转review、不标done。
- 2026-09-13 Codex取证接收：GLM工作包最终11fb8148通过独立复核，报告/四诊断脚本已接入main；
  [接收结论与正式回归节奏](../../testing/glm-pre-e2e-prep-report.md)披露GLM贡献与11项待证归属。
  本卡优先将交错/配对、孤儿redo、失败保全、半态通知及缺正文保存转成正确性回归；G-H05/10/14在实施域补证。
  不重签r1设计、不代签、不改变Status/共享build准入，本轮仍未改产品或正式测试；下一步由Codex接续主线准入/实施。
- 2026-09-13 Codex：A-07按用户“继续推进”收口，D-01接续；当前复跑普通/配对错误仍在，旧探针环境错与产品错分栏。
  未动原探针或产品。用户追加更多GLM工作，已拆44项只读取证，D-01签字先回、其余并行，不等整批才开主线。
  文档检查415 Markdown/1,983本地链接/142任务通过，文档工具20项通过；44项唯一ID机械复算16+10+8+10，
  无重复。未跑全仓check/coverage（本轮无产品改动），不报新覆盖率进展。
- Kimi：2026-09-13 完成 r1 独立前提/架构审查，签 premise verified + design agree，无返工项。
  直读 App.tsx:1605-1660 通知归属（undo 自改写标记，edit-session.ts:121 递增版本）、
  editor-history-coordinator.ts:38-88 双栈顶接管+false 转单栈拆半+普通 redo 补偿、
  script-editor.ts undo 先 pop 后 invert、script-editor-projection.ts:99-114 缺正文静默跳过、
  DS-I.2/4 合同、Root main.tsx:158-176 新空栈装配。本人复跑：原探针 save-state 替身环境失败
  （不作产品已修证据）；改编 reprobe exit 0 复现三组特征（配对正控/P/M/S 拆半 effects=[]/
  M/S/M 错序 price 0+wait(1)）。七条可证伪观察与两条非阻断备注（通知口径、动作名复用）
  写入本席。未改产品/正式测试/他席/共享准入/Status，未读 GLM 结论。
  Next：GLM 并行签字；两席齐后 Codex 放行 build；视觉由 Codex 后续执行。
- GLM：待本人填写本席设计日志；批量取证另写工作包指定报告，不塞满本卡。
- GLM 设计交接日志（2026-09-13）：按工作包节点一完成 D-01 r1 独立前提/设计审查并签字（premise verified +
  design agree，无 counter）。四条前提腿一手直读：App.tsx:1602-1617/1631-1653（归属启发式与单栈 fallback，
  手推 M10→S→M20 双撤错序复现）、editor-history-coordinator.ts:44-52（pair 非双顶即 false→拆半）、
  script-editor-projection.ts:88-116/187-199（缺正文 `continue` 静默跳过、merge 入口无守卫）、
  script-editor.ts:1425-1437（undo 先 pop 再 invert、失败丢项无补偿）。设计 1-9 与四腿一一对应；
  第 8 条初始化合同按「构造时空日志+成组绑定」收敛（当前无拼接真实域）；A-07 historyVersion 捕获合同
  与设计 3 的交互写入可证伪观察。未读 Kimi 结论，未改产品/正式测试/Status/共享准入。Next：转工作包
  节点二（59e03bdb 取证分支，44 项四组），本席 G-H 组结论以工作包报告为准，不回填本卡。

## 下一位 Agent 提示词

当前仍为build，由Codex同卡继续项目级日志/原子配对及App接线；不转终审、不要求用户验收这批技术切片。
无新的跨Agent交接提示词。以下r1设计提示词已执行，仅为历史，不再次转发、不重签。

### Kimi（历史：D-01 r1设计审查，与GLM并行）

```text
在 /Users/zhangxu/illegal/type-pal 审查 EDITOR-HISTORY-ORDER-1。
任务卡 docs/ops/tasks/EDITOR-HISTORY-ORDER-1-global-undo-transactions.md，draft/r1，证据基线9fd32674，产品同10c84238。
先同步并检查工作树，读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡及其一手锚点。
独立核M/S/M错序与P/M/S拆半、保存跳过缺正文；不要读取或复述GLM签字/批量结论。
重点审唯一项目日志与两session关系、成功提交而非notify计序、失败原子性/redo分支、StrictMode绑定/已有栈边界、保存专用完整性守卫。
复现脚本边界适配见卡；原探针当前会因missing save-state替身失败，不得把此当产品修好。
只在自己的设计签字块/日志写带file:line的premise verified + design agree，或counter与最小必改项，提交推送并保留他席修改。
不得改产品/正式测试/他席结论/共享准入/Status，不得开始实现或标done；视觉由Codex后续执行。
```

### GLM（历史：先回D-01签字，再独立完成额外批次）

```text
在 /Users/zhangxu/illegal/type-pal 执行 docs/testing/glm-pre-e2e-prep.md 的 r1 工作包（44项、四组，连续完成）。
先读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md和工作包；D-01卡为 docs/ops/tasks/EDITOR-HISTORY-ORDER-1-global-undo-transactions.md，draft/r1，产品冻结10c84238。
先独立完成D-01前提/矩阵设计审查，自己的premise/design签字与日志直接提交推送main；不要等其余三组做完，不读Kimi结论，不改状态或产品。
随后按工作包从59e03bdb建立独立worktree与codex/glm-pre-e2e-prep分支，核产品对10c84238零漂移，连续完成引用删除、上传乱序、预览缓存的只读取证。
只能改工作包白名单报告/诊断探针；不改packages、scripts、生成数据、正式测试、正式配置或覆盖率基线；不跑浏览器/截图/视觉/声音验收，不整仓check/coverage与Codex争抢资源。
每项给真实调用证据、合法正控、反例或待证原因；probe环境失败不能算产品缺陷，禁止跳过伪绿。已证实项可引用复跑，不堆无意义用例数。
不必每小组问继续；阻断独立登记后继续其他组。最后整批提交推送并给Codex分支/SHA、44项唯一ID账、命令/退出码/日志和复算入口。
这批是卡前取证，不是修复授权；不代签、不标done、不自行转Kimi。Codex统一审查和决定后续实现。
```
