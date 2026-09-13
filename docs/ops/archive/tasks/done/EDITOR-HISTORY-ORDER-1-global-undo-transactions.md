# EDITOR-HISTORY-ORDER-1 - 全局撤销顺序与成对操作完整性

Status: done
Phase: phase2
Capability: ops（审计 D-01 修复，不新增能力格）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: both
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: main
Revision: r1（候选70e3f627三席accept；2026-09-13用户明确验收通过，已收口）
Evidence Baseline: 9fd32674（设计前提历史，产品同10c84238）；整卡终审对比10c84238..70e3f627（含首批dded6f27）

## 目标与范围

连续撤销/重做严格按照用户实际操作顺序；一个同时涉及主属性与脚本的操作必须整笔处理，不能留下半个动作。
本卡承接 D-01，不重开 A-07 离开保护；用户已要求继续，并要求给 GLM 更多并行工作。

- 范围内：两 session 与项目级历史协调、当前跨 session 成对命令、全局菜单/工具栏/快捷键接线、
  失败时历史/内容保全、保存合并时拒绝“有私有脚本引用但无正文”的半状态、相邻回归与覆盖率。
- 范围外：持久化历史、跨浏览器 undo、D13 时间旅行、协同编辑、玩家存档、A-02/A-03 保存协议、
  D-02 引用补边、其他审计缺陷、schema/迁移、PAL生成文件、全仓 Command 重写或新历史面板。
- 不改现有按钮尺寸/布局、文本输入自己的撤销；不增加拖拽/移动等无关交互。
- GLM 并行工作见[工作包](../../../../testing/glm-pre-e2e-prep.md)：D-01 设计签字优先交回，其他三组只读取证可继续，
  不因此授权提前改任何产品代码/正式测试，不拖住本卡已有准入流程。

## 前提真值门

一句话：当前 App 用“最后发通知的是哪个 session”猜全局历史；undo 也更新这个标记，连续撤销会选错栈。
配对协调器只在两半都在栈顶时接管，返回 false 后 App 的单栈 fallback 会拆开事务。

| 维度 | 真值 / 目标 | 一手证据（行号据9fd32674） |
|---|---|---|
| 原版 / primary source | 原版无本创作编辑器；现行产品合同规定全局 undo/redo、一意图一笔、失败零写入、成功新编辑才清 redo | [设计规范](../../../../phase2/specs/editor-design-system.md) DS-I.2/4，行911、931–934；[编辑器会话](../../../../../packages/editor/src/core/edit-session.ts) 行1–11 |
| 第一阶段 | N/A：一阶段游戏进度/菜单不是作者编辑历史，不能拿玩家存档或旧引擎流程定义本卡 | [CLAUDE](../../../../../CLAUDE.md) 阶段边界；[READ-FIRST](../../../../phase2/READ-FIRST.md) 新编辑器架构与无对应UX边界 |
| 当前二阶段 | 最后通知归属会被undo改写；配对失败转单栈；丢失的正文可被保存合并静默跳过 | [App](../../../../../packages/editor/src/ui/App.tsx) 行1605–1660；[协调器](../../../../../packages/editor/src/core/editor-history-coordinator.ts) 行22–88；[保存投影](../../../../../packages/editor/src/core/script-editor-projection.ts) 行88–116/187–199 |
| 本任务目标 | 单一项目级操作时间线决定全局undo/redo，配对为一个提交；失败不产生半状态；保存不抹平缺正文错误 | 本卡H-01～H-12验收目标；不声称已经实现 |

### 当前复核与可证伪观察

- 已直接重读[原审计](../../../audits/pre-e2e/editor-workflows.md#d-01--跨会话撤销没有统一的时间顺序)及其全部
  [原探针](../../../audits/pre-e2e/probe-editor-history.mjs)，本轮原文件与产品零改动。
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

- [AGENTS](../../../../../AGENTS.md)、[READ-FIRST](../../../../phase2/READ-FIRST.md)、[项目生命周期](../../../../phase2/specs/project-lifecycle.md)：
  当前canonical、不可变command、单Coding Owner、已完成A-07保护不得回退；不开历史版本兼容分支。
- [EditSession](../../../../../packages/editor/src/core/edit-session.ts) 行190–318：dispatch/undo/redo、
  transaction receipt、map dirty/pin/revision/reference缓存；[ScriptEditSession](../../../../../packages/editor/src/core/script-editor.ts)
  行1368–1457：状态、历史、affectedRecordsByVersion与回滚。
- [Root](../../../../../packages/editor/src/main.tsx) 行122–147/158–176：装配新双session后才挂App；
  App当前用useMemo创建协调器，必须考虑StrictMode和卸载/重连，不能在render遗留第二个订阅Owner。
- [ItemTab](../../../../../packages/editor/src/ui/ItemTab.tsx) 行1016–1036/1150–1179：创建/删除私有脚本配对；
  App行1785–1817/1893–1904/2057：场景复制/创建/删除、实体增删配对。GLM须完整census，不只复制这些例子。
- [派生索引](../../../../../packages/editor/src/core/editor-derived-store.ts)、[离开守卫](../../../../../packages/editor/src/core/project-leave-guard.ts)：
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

下表保留r1验收合同；整卡实现证据见后文“最终实现与自验证”。旧错误特征探针通过不当验收通过。

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

- Codex（2026-09-13）：**accept，候选70e3f627**。独立实现/接收复核、自测及功能界面验证完成，H-01～H-12证据见后文。
  一手锚点：editor-history-coordinator.ts的commitNew/prepareEntry/commit唯一顺序与先准备后提交；
  edit-session.ts/script-editor.ts的prepareHistoryChange失败不写索引；App统一Owner接线；Root主投影与canonical正文分离。
  check6,981、ratchet及单次严格fast6,493通过；五针反控、GLM冻结树15绿/5红独立复算与20项接收勘误成立。
  GLM为测试贡献者，不能凭本包自测当独立第三方验收；内部Codex只读补审也不占Kimi/GLM席位。
  非本卡待修D-06/D-07有新旧证据，已登记且未宣称修复；原/GLM历史探针零diff，无content/reforge/migrate/生成项目/样式修改。
  可证伪：任一合法交错仍错序、pair只撤半边、失败改变版本/内容/历史、新分支复活旧redo、重开遗漏正文、质量门降范围，均撤回accept。
- Kimi：**accept（2026-09-13，r1 整卡独立代码/架构终审候选 `70e3f627`，对比 `10c84238..70e3f627` 含首批 `dded6f27`；设计不重签；未读 GLM 本轮结论）**。
  接手 HEAD `20b43b87` 与 origin/main 一致、工作树干净；候选后 packages 零漂移；content/reforge/
  game/migrate/projects/pnpm-lock 整卡零 diff（实测）。
  - **唯一全局日志/事务身份**：`editor-history-coordinator.ts` 全量直读——HistoryEntry 用
    `Symbol('editor-transaction')` 独立身份（同命令对象重复提交各为一笔）；`connect()` 把两 session
    的 dispatch/undo/redo/canUndo/canRedo/discardRedo 全部路由到 Owner（`edit-session.ts:193-221`
    绑定后全部经 router）；`assertCanAttachHistory` 拒第二 Owner、拒接管已有独立栈；transact
    禁重入；`commit()` 先全 validate 再全 commit、再更新日志、再 advance/publish 通知，
    通知异常由 `notifyEditorObservers` 隔离不回滚（editor-history-participant.ts:30-39）。
  - **两侧原子提交/失败保全**：prepare 阶段两側按逆/正序运算且公开状态保持旧态
    （coordinator:186-199 注释在案）；prepareHistoryChange 记 before/version、validate 查失效、
    commit 才写状态/索引/dirty/version（edit-session.ts:243-287、script-editor.ts:1425-1472）——
    **pop 已从 prepare 移入 commit，pop-then-invert 缺陷结构消除**；no-op dispatch 返回 false
    不入栈不清 redo；未参与侧 prepareHistoryDiscard 行政清 future 且版本递增（A-07 授权保守失效）。
  - **redo 清理/地图元数据**：任一侧新成功提交经 commitNew 清全局 future + 另一侧执行索引；
    `prepareMapChanges` 只拷贝 dirty/pin/revision/facts 轻量元数据，未变地图跳过准备——不为每次
    编辑深拷贝全工程；publishReferences 在提交后。Root 成组构造两 session+Owner 再发布 Boot，
    App 仅 connect/dispose + assertSessions；historyOwnerRef/单栈 fallback 已删除（diff 实证）。
  - **保存/重开投影**：`script-editor-projection.ts:204-223` 保存入口逐 shell 私有引用核
    canonical 正文（`Array.isArray(body)`，空 [] 合法、未引用记录不判错），缺失带物品/下标/
    脚本 ID 拒绝、零 writer 提交；共用识别器覆盖 loader canonical 与 ItemTab 内部 runScript
    两表面；`projectEditorItemShells` 复用 reforge 既有 projectItemsView 按作者数组保序——
    重开白屏修复不改 loader/序列化/格式。
  - **本人实跑**：核心四文件（coordinator/foundations/timeline/paired-workflows）**62/62 绿**、
    editor typecheck exit 0；交叉核日志 check 6,981（editor 2,413）、strict TOTAL **617 文件/6,493**。
  - **两针负控制本人独立重建**（/tmp/kimi-history-nc/negative.config.mts，唯一锚点断言、内存
    变换、磁盘零改）：split（undo 只准备 main 一側）→ **28 红**含七族完整内容差异；save（保存
    守卫 `if (!bodyPresent)` 失效）→ **恰 6 红**（4 错误放行 + 2 下游校验但错误层位变化），
    与回执针型一致；无收集/环境错误。
  - **GLM 贡献口径**：paired-workflows 20 项为 GLM 贡献经 Codex 勘误补强，不作该部分独立自证；
    本人复跑该文件 20 项在最终树全绿。冻结树复算（15 绿/5 红）证据在案。
  - **D-06/D-07 延期边界核实**：两处锚点相对 dded6f27 类文本未变（D-06 非本卡回归）；D-07 合法
    输入在旧树 serialize 已拒绝、当前守卫更早拒绝——**可保存输入集合未变**，非可保存→不可保存
    回归；均登记 P2 待修、证据独立，不因已登记放过，也不属本卡 counter。
  - **旧版本兼容审查：pass**——旧 transaction receipt/top 检测协议删除而非并存；无版本分支/
    旧格式/升级器/fallback 引入；旧测试适配新 Owner，业务断言保留。
  返工项：无。剩余限制如实保留（全仓 90/85 未达、R4 集中链待执行、强杀不承诺）。
  本 accept 不代签、不授权 done。
- GLM（2026-09-13，覆盖/矩阵席终审）：**accept，候选 70e3f627**。披露：本席是 20 项配对工作流测试
  （P01–P20，冻结树交付 1f043a66）的作者，该部分以 Codex 接收勘误后的主线适配版为准，本席终审只做
  独立复核，不以贡献者自测充当该部分独立第三方验收。独立复核证据：①核心四文件实跑 **62/62 绿**
  （coordinator4+foundations14+timeline24+paired20）；App.leave-guard **31/31**、
  script-editor-projection **5/5**；②五针负控本人复跑（/tmp/type-pal-history-main.WcgNcg/
  negative.config.mts）：order **10红**/split **26红**/future **2红**/pop **3红**/save **6红**，与 Codex
  记录一致——分层判定：split/pop 及 order 主体为错序/拆半业务红；save 中 4 例「promise resolved
  instead of rejecting」=保存守卫移除后错误放行、2 例为下游校验层位变化（非守卫缺口）；future 2 例
  以另一侧 historyVersion 未失效鉴别（全局日志重叠防护挡住直接放行，判定式仍有效）；无跳过伪绿；
  ③独立单次严格 `coverage:fast`（TYPE_PAL_COVERAGE_BASE_REF=10c84238）**exit0：6,493 项 / 617 生产
  文件 / editor 219 生产文件、210 测试文件、2,254 项**，门禁通过未下降；基线对账：整卡（自
  leave-guard 收口基线 6,430）**+63**、本轮（自 dded6f27 基线 6,444）**+49**；新增恰 3 个 D-01 测试
  文件（timeline/foundations/paired）与 1 个生产文件 editor-history-participant.ts（10c84238 内嵌
  基线为 6,385 系当时未含 leave-guard 收口再生成，差异已在账内说明）；**移除清单为空**（无旧测试
  文件/生产文件删除，其他六包 fastTests 逐包 identical）——无范围缩减；④源码抽核：唯一全局日志
  （coordinator past/future+symbol 事务 id；普通 dispatch 经 edit-session.ts:195-197 路由进 Owner；
  assertCanAttachHistory :226-229 拒接管已有独立栈；dispose 幂等保留日志）；原子性（commitNew 先
  prepare 双侧、单侧提交为另一侧补行政失效、commit() validate→commit→updateLog→advance→version++
  →publish，通知仅在双侧与日志就绪后发布——timeline「pair success notifies both domains only
  after both states and history are committed」逐值断言完整态）；跨侧分支（P13/P14 适配版先断言双侧
  canRedo=false 再试 redo，无 if(revived) 掩盖）；保存守卫（projection 缺正文抛错带物品/效果索引/ID，
  空正文[] 合法保留）；App/Root 接线（main.tsx 成组建 Coordinator；App.tsx props.history+
  assertSessions+connect/dispose；undo/redo 直走 Owner 并表错）；⑤H 矩阵映射成立：H-01/02→timeline+
  P08/P09（P09 第三撤只撤正文不撤创建事务，勘误已核）；H-03→P01-P07 动态+P12 静态（raw 源码导入，
  七 caller 脚本侧先于主侧）；H-04→timeline asymmetric futures+P13/P14/P15；H-05→P11；H-06→
  foundations+timeline 失败注入+P16（clean 态注入全状态核+同对命令重试成功）；H-07→P18；H-08→
  timeline dispose/connect 幂等+App.leave-guard 卸载重连；H-09→projection5+save 负控；H-10→App 单一
  Owner 代码读+App.leave-guard 31+ItemTab/App.reference-navigation 回归；H-11→五针；H-12 Codex 自持
  视觉（按分工不在本席复核域）。静/动边界：P12/P20 现为 Vite ?raw 静态源码对账（入口存在性与顺序），
  动态行为由 timeline/foundations/paired 真实调用覆盖，两层不混称。D-06/D-07 延期边界已核（类文本
  未变、未宣称修复，非本卡范围）。可证伪：任一合法交错错序、pair 拆半、失败改版本/内容、新分支复活
  旧 redo、保存漏正文、质量门缩范围，本 accept 撤回。旧版本兼容审查：**pass**——script-editor 旧
  dispatchForTransaction/rollback/isUndoTop 协议整删未并存，无版本分支/旧格式/升级器/fallback；旧
  coordinator 双顶检测被唯一日志取代而非保留旁路。本 accept 不代签、不授权 done。
- Codex最终核定（2026-09-13）：三席均针对70e3f627签accept，无counter/返工项，无缺签豁免；**done准入allowed**。
  用户在技术终审汇总与最小验收清单交付后明确回复“验收通过”，本卡Status→done并归档。
  收口前HEAD e8170d0f相对候选的packages/scripts零diff，终审后无产品或基线漂移；不代签、不重新设计签字。
  用户确认的是本卡验收结果，不推断其具体手工执行方式，也不外推为其他任务免签/免验收。

## 实现 / 视觉 / 用户验收

- 2026-09-13取证接收阶段的历史边界：r1两席设计签字均已落盘（GLM623c592f、Kimi3f34c558），当时用户要求复核并行只读取证，
  尚未启动产品实现。GLM批028ad866的R1～R4 counter见[批次接收报告](../../../../testing/glm-pre-e2e-prep-report.md)；
  该counter针对取证/分类质量，不改变本卡已核前提或已签方案，不要求重签设计。
- 首批历史：保存静默丢正文、脚本历史失败丢项/no-op清redo的保护与14项正式回归先落地；当时尚未实施项目级日志。后续整卡实现见“最终实现与自验证”；没有版本/能力格状态修改。
- Codex dev-functional已完成本卡最小闭环；无新UI形态设计，沿用既有控件，证据及边界见后文。
- 三席技术终审通过；用户于2026-09-13明确回复“验收通过”。此前Codex界面实测和两席结论保持有效，已完成归档准入，不要求重复验收。
- 额度/资源生成：N/A，无缺席代班或生图。

### 用户最小验收（历史清单，已验收通过）

Codex已完成以下真实界面流程，用户随后明确验收通过。下列为交付时的可选代表检查，归档保留，不重新要求用户执行。

1. 在本地测试项目进入“物品 → 物品”，选一个**已存在、尚无私有脚本**的物品（不要用本轮刚新建但未重开的物品，D-06另卡待修）。
   将买价设为10，启用使用能力，再点“添加当前物品脚本”。
2. 依次把买价改为11、在脚本中添加“等待200ms”、再把买价改为20。点三次撤销：应依次为
   “买价11且有等待 → 买价11且空正文 → 买价10且空正文”；再撤销一次，整笔私有脚本创建消失。
   连续重做四次，应恢复买价20和等待200ms，不能只恢复引用而丢正文。
3. 保存后关闭/重新打开测试项目：买价20、脚本等待200ms仍在，物品页正常显示，新的会话撤销按钮灰显。

通过标准：顺序、整笔恢复与保存重开一致，按钮布局没有变化；错序、只恢复半边、正文丢失或白屏则反馈具体步骤。
不要求用户检查像素、故障注入、版本、覆盖率或运行任何测试命令；R4完整创作/试玩链仍集中E2E验证。

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
- 首批时本卡未到review：全局交错顺序、配对原子发布/回滚、跨会话redo、生命周期与App统一按钮/快捷键/名称、
  功能视觉和完整保存链仍待实施。当前通过仅为上述首批边界，不把旧4项简单配对通过充作全局问题已修。

## 最终实现与自验证（Codex，2026-09-13）

### 实现边界

- 项目级EditorHistoryCoordinator持有唯一past/future，每次成功提交用独立Symbol身份；两session局部记录仅为执行索引。
  普通dispatch和直接session.undo/redo全部路由到Owner，删除App的historyOwnerRef/单栈fallback、旧transaction receipt/top检测协议；无旧版兼容或历史持久化。
- 两侧prepare先计算命令与地图轻量元数据，再统一validate→commit→更新日志/版本→发布通知。
  失败发生在写入前，不靠用户可见redo补偿；无作者变化不增加dirty。通知异常已属提交之后，单个订阅抛错不回滚已成功事务、不吞其它订阅。
  新分支同时清另一侧执行索引future并递增其historyVersion，A-07授权保守失效；markSaved/hydrate不创建作者日志项。
- 不为每次普通编辑深拷贝全部地图/媒体：map/index/stamp引用未变就跳过地图准备；变更仅拷贝dirty/pin/revision/facts等轻量元数据。
  script command原有before/after快照合同不扩大；七处生产配对caller每次新建命令，无跨操作保留stateful命令的实际接线。
  同一个stateless命令重复提交仍分配独立事务ID，不以命令对象相等当同一事务。
- Root在发布Boot前成组构造两session与Owner，App只connect/dispose；同Owner重连保留日志、断开期编辑拒绝、重复Owner和两份已有独立栈拒绝。
  App统一按钮/菜单/快捷键状态与动作名，保持原按钮尺寸/布局，未改CSS/增加拖拽/历史面板；文本/IME/contenteditable/modal不劫持全局undo。
  同名连续编辑订阅稳定toolbar快照，保留既有页面局部订阅与C组渲染门禁。
- 保存完整性守卫沿用首批；本轮H-09/H-12发现正式重开私有脚本物品会向runtime效果编辑器传入canonical效果导致白屏。
  一手链：toEditorState保留作者items；ItemUseEffectEditor调用itemUseEffectSupportsContext只识别当前runtime效果。
  本卡仅在Root交互态装配复用reforge既有projectItemsView，按作者ID数组保序；ScriptSession保留canonical正文，保存时合并回来。
  不改loader/serializer/content20/SAVE8、不新增lowerer/分片/跨包接口，属于r1主投影/作者正文分离与重开验收的落实，不重签。
  正式loader fixture含私有/共享/普通三类物品、数字形态ID顺序及保存还原控制；App实际卸载/重挂物品页验证正文。

### H-01～H-12 对账

| 合同 | 证据 |
|---|---|
| H-01/H-02/H-05 | timeline的M/S/M、S/M/S、三笔非四半、到底边界；GLM适配P08～P11完整内容往返 |
| H-03 | P01～P07七族真实命令/正式loader/保存合法；P12/P20入口标记与Codex独立七caller census分栏 |
| H-04 | timeline双侧新分支/非对称多深度混合future/行政discard；foundations no-op/失败保留；P13～P15 |
| H-06 | prepare第一/第二apply、第二inverse、第二redo失败全状态/dirty/版本不变与立即重试；P16/P17两侧订阅完整、失败零通知；通知异常与重入/断开守卫 |
| H-07 | 地图失败undo的revision/dirty/facts对象保全、成功undo/redo单调；map引用订阅看到完整两侧与版本；markSaved/hydrate不计序；非地图不读取全作者元数据 |
| H-08 | timeline重复Owner/断开重连/已有独立past或future；App测试真实StrictMode；author-save-conflict真实Root AST重开新双session/Owner且旧历史不串入 |
| H-09 | foundations空正文合法/缺正文先拒；App真实保存调用缺正文零writer凭据/IO→undo修正→保存→正式loader及Item页重挂；P19确实undo/redo后保存重开 |
| H-10 | App四条回归：toolbar/menu/CtrlZ共用日志，文本/IME/modal不越界，失败提示可见且重试成功；A-07全部既有断言保留 |
| H-11 | 下列五针隔离反控及原冻结产品复算，不把重叠拒绝当放行级反例 |
| H-12 | 下列隔离原生浏览器，主属性/正文交错、整笔撤销/键盘重做、保存重开及磁盘正文实测 |

### GLM贡献与负控制

- 接收远端1f043a66的20项测试包，非独立终审自证；[接收勘误](../../../../testing/glm-editor-history-workflows-receipt.md)
  记录P09错误终点、P10弱断言、P13/14条件断言、P16/17狭窄观察、P19缺undo步骤、P20静态证明过宽的修正。
  删除整文件ts-nocheck和旧fallback，P12/P20改raw导入；既有断言未删减以迁就实现。
- Codex用Vite隔离加载git对象（原测试1f043a66、四个核心模块dded6f27）复算：恰15绿/5红，
  P08/P09/P13/P14/P17合同失败，P09真正失败为第二撤价格而非原回执的第一撤。P12/P20文件系统census读取主线相同七caller形状，非冻结语义推断依据。
  `glm-frozen.config.mts`/`glm-frozen-recomputed.log`，磁盘产品未切换、未stash、未动原探针。
- 新主线同口径58/58绿；`negative.config.mts`以Vite load单点改写，不改产品文件。D1_NC依次control/order/split/future/pop/save：
  - control：58绿，exit0。
  - order：undo偏选main，M/S/M第二撤回0且脚本仍在，10红；模拟旧归属偏栈这一反例，不冒称完整复刻旧算法，另有执行索引重叠拒绝。
  - split：只提交undo第一参与者，26红，包括七族完整内容差异；不是收集错误。
  - future：移除未参与侧discard，2红是historyVersion未递增；全局日志仍拦住孤儿，因此不声称该针使孤儿真的复活。
  - pop：仅inverse失败路径先弹脚本索引，3红（standalone丢历史、两条后续重试被索引守卫拒绝）。
  - save：删保存完整性块，6红=4错误放行+2被下游校验拒但错误层位变化。
- 原审计及已接收GLM四探针保持零diff；临时配置/日志均在`/tmp/type-pal-history-main.WcgNcg/`，不把临时图片/配置加入仓库。

### 最小功能界面验证（Codex）

- localhost:6011真实编辑器、独立Playwright Chromium上下文，原生OPFS目录与IndexedDB；仅OS选夹API替换为任务专用OPFS句柄。
  未访问用户项目或真实已有存档，不将此证据当OS选夹/权限UI测试。系统权限链已有A-03/A-07证据，不重复扩大流程。
- 最终干净目录history-complete-final：新建项目/物品、启用使用、price10，保存基线并重开；
  添加当前物品脚本（pair）→price11（M）→wait200（S）→price20（M）。toolbar连续undo轨迹
  `20/有正文 → 11/有正文 → 11/空正文 → 10/空正文`；再undo一次移除整笔私有脚本，添加按钮恢复可用。
  四次Meta+Shift+Z还原price20/wait200。真实保存metadata=committed，刷新并从Recent登记目录重开后
  price20/body=[wait200]、新历史为空；直接读OPFS items.json核同值，save-state仍committed，最终正向期间pageerror=0。
- `native-final-edit.js`/`native-final-reopen.js`内有上述业务assert；Codex查看ui-final-saved.png/ui-final-reopened.png：
  工具栏图标尺寸/布局不变，“撤销：修改物品”提示完整可读，私有脚本正文保存重开后可见，无白屏。
  场景演出与完整R4试玩仍按原E2E集中策略登记，不冒称已通关或所有布局已巡检。
- 过程失败如实分栏：初版浏览器指定版本不存在，改用已安装Chromium；脚本TTY长行截断后改临时文件；
  新项目沿用URL中的不存在item目标先显示目标不存在，按“打开当前页面”回正确页面；均未篡改产品来让自动化通过。
  早期开发中HMR重载打断任务目录，后来该目录恢复冲突，不能当本卡成功证据；最终停止产品编辑后新鲜目录完整重跑通过。
  另发现新建物品未重开时canonical item缺席，已作为[D-06](../../../audits/pre-e2e/editor-workflows.md#d-06--新建物品后立即添加私有脚本缺少作者记录2026-09-13补充)单列待修，不以本次绕过宣称已修。
- Codex内部只读补审（不是Kimi/GLM席位签字）未发现本卡阻断；指出共享ScriptId与内部私有前缀歧义，已由主线读取探针并复跑新旧树。
  正式loader均接受，旧树serialize已拒绝，当前更早被缺正文守卫拒绝，输入/作者IO不变，不是可保存输入回归；
  已作为[D-07](../../../audits/pre-e2e/editor-workflows.md#d-07--共享scriptid与内部私有引用前缀相同时无法保存2026-09-13补充)待修，不冒称完整共享命名域已支持，也不扩大本卡为身份格式修改。

### 质量门与计数

- 新增timeline24、GLM适配20、App4、投影1，共49项；首批14另在dded6f27，整卡新增合计63项。
  旧测试适配新Owner/Root依赖/动作标签与全局顺序，业务断言保留并加强；不改配置、超时、排除或原探针。
- editor完整check：229文件/2,413项通过；末次Root额外身份断言随完整pnpm check复验通过。
- 整卡完整pnpm check exit0、6,981项；全仓lint0 error/48 warning/11 info（既有），日志check-final.log。
  官方coverage:ratchet exit0之后，单次严格coverage:fast exit0：6,493项/617生产文件，editor210测试文件/2,254项。
  基线仅editor及汇总/生成时间变化；其他六包逐字一致，原生产文件/测试无移除，新增1 helper/2测试文件及49项，未改配置/排除/阈值。
  editor行22,147/27,797（79.67%）、分支19,081/27,545（69.27%）、语句24,585/31,808（77.29%）、函数6,124/8,099（75.61%）。
  全仓行69.95%、分支61.99%，尚未达到最终覆盖率目标；不等于coverage:full或完整E2E。
  日志ratchet-final.log/strict-fast-final.log；计数6444→6493与新增24+20+4+1一致；旧实现退休分母与新代码并存，不把净增覆盖数全部算新增测试贡献。
- 过程定向失败均保留日志：affected记录最初被额外clone导致结构共享断言红（撤销该额外clone）；
  App AST边界因render新增显式早抛而红（改Owner断言方法，保留校验、不改审计）；Root fixture注入真实新增依赖；
  aria动作名/菜单快捷键文本和modal选择器适配；投影初稿误用deriveScriptChunk参数已撤回，复用生产projectItemsView；
  script.getState本来返回clone，新增identity测试改为公开getStateSnapshot比较，不把clone当产品写入。

## 交接日志

- 2026-09-13 Codex正式收口：用户明确“验收通过”。接手fetch核main/origin一致、工作树干净，e8170d0f相对70e3f627的产品/测试/覆盖基线零diff；
  三席accept、用户验收均齐，统一核定done allowed并将本卡移入done归档，同步引用、任务索引、看板、审计进度及覆盖说明。
  本轮只改文档，不重跑已冻结候选的全仓/视觉流程；保留check6,981、严格fast6,493与GLM贡献披露。
  D-06/D-07、R4集中创作/试玩链、全仓覆盖率最终目标继续留在原待办，不以D-01完成宣称整组审计或完整E2E完成。
  归档采用仓内relocate工具（单卡移动、关联引用同步）；文档检查417 Markdown/2,001本地链接/142任务通过，文档工具20/20通过，git diff --check干净。
  独立比较确认三席设计/终审原文除机械链接重定位外保持不变，候选packages/scripts零diff；未删除产品/测试或丢失历史任务。
- 2026-09-13 Codex汇总终审：用户反馈“签了”；fetch核main/origin一致、工作树干净，最新a4cd8c19仅任务卡审查登记变化。
  Kimi与GLM均accept同候选70e3f627，前提/设计不重签；两席负控及GLM严格fast已分清本人复跑/采信证据，GLM20项贡献已披露。
  统一核定技术门通过，保留review待用户验收，不将签字回报写成用户已验收。已补可选最小界面清单，用户也可直接认可Codex实测。
  收窄说明：D-07新旧对照只证明该合法共享ID碰撞用例此前也无法保存，不证明任意输入集合完全相等；其修复仍另卡。
  本轮只更新交接/进度文档，原候选产品/测试/基线及三席原文不变，不重复全仓/视觉验证，不启动其它缺陷实施。
- 2026-09-13 GLM（r1 整卡覆盖/矩阵终审）：按本席当前提示词复核候选 70e3f627（对比 10c84238..70e3f627
  含首批 dded6f27；其后仅文档）。复跑核心四文件 62/62、App.leave-guard 31/31、projection 5/5；五针
  负控本人复跑 order10/split26/future2/pop3/save6 红（分层：save 4 错误放行+2 下游层位、future 以
  另一侧 historyVersion 未失效鉴别）；独立单次严格 coverage:fast exit0（6,493/617；editor 210/2,254）
  并完成 +63/+49 与移除清单为空的基线对账（10c84238 内嵌旧基线 6,385 的口径差异已注明）。源码抽核
  唯一日志 Owner/两阶段提交/通知时序/保存守卫/Root-App 接线；H-01～H-12 与 timeline24/foundations14/
  paired20/App31/投影5 的映射及 P12/P20 静(?raw)/动边界核清；接收勘误（P09 第三撤语义、P13/P14
  canRedo 前置、P16 clean 态重试、raw 导入替代 ts-nocheck）逐条与最终测试源码核对成立。签 accept、
  旧版本兼容审查 pass（详见 done 前席位）。未改实现/测试/基线/他席/Status，未读 Kimi 本轮结论，
  不做视觉验证。Next：三席齐（Codex/Kimi/GLM 均 accept），交用户验收裁决；本席不代签 done。
- 2026-09-13 Kimi（r1 整卡独立终审）：同步 `20b43b87`、工作树干净后按 `10c84238..70e3f627` 全量核实现。
  直读 coordinator/participant/edit-session/script-editor 两阶段协议（Symbol 事务身份、全入口路由、
  validate→commit→日志→通知次序、失败不写索引、pop 移入 commit、行政 discard 递增版本）、
  保存完整性守卫与 Root 投影重开、App 统一接线（historyOwnerRef 已删）；D-06/D-07 延期证据核实
  非本卡回归。复跑核心四文件 62/62、typecheck exit 0；独立重建 split/save 两针负控制
  （28 红 / 恰 6 红，工作树零改动）；交叉核 check 6,981、strict 617/6,493。
  签 accept，无返工项；旧版本兼容审查 pass。未改实现/测试/基线/他席/Status，未读 GLM 结论。
  Next：GLM 并行终审落卡后，Codex 统一核定 done。提交 SHA 见本条推送。
- 2026-09-13 Codex启动整卡终审：用户在整卡review交付后要求“继续”，接续为正式终审，而非另开GLM测试包审查。
  接手fetch核main与origin/main一致、工作树干净，HEAD3634e2e9相对实现候选70e3f627的packages/scripts零diff；无新增counter。
  Kimi/GLM两席可独立并行，均钉r1/70e3f627，整卡diff从10c84238起包含首批保存守卫；不重签设计、不改候选、不标done。
  两席职责与直接落卡/推送提示词见下；GLM20项测试贡献继续披露，不能当该部分独立第三方自证。
  本轮仅交接文档与看板/总进度更新，不重跑已验证的产品全仓测试或视觉流程；测试结果仍归上一轮候选自验证。
- 2026-09-13 Codex整卡交付：实现候选70e3f627，Status→review，本人accept；三席r1设计不重签，Kimi/GLM终审仍pending，不标done。
  GLM工作流候选1f043a66经独立冻结树复算、修正P09等断言并适配当前Owner后接收20/20；连本轮其它回归新增49项。
  完整check6,981、ratchet/严格fast6,493，最小原生OPFS+真实App保存重开通过，旧探针/产品白名单核对通过。
  用户本轮明确“不转Kimi”，因此本次只完成接收/整卡自验证与review登记，不为测试包另起终审、不自动转交两席、不代签。
  下一步待用户启动正卡终审；届时两席钉同一候选独立读取证据、直接落各自席位，贡献者身份照常披露。
- 2026-09-13 Codex连续推进：用户明确要求做到整卡完成，不再按小批停。主线持续完成实现/质量门/功能验证到可终审，
  正式done仍按原三席终审与用户裁决，不代签。GLM可并行[20项配对工作流回归](../../../../testing/glm-editor-history-workflows.md)，
  冻结dded6f27产品，仅新增独立测试/回执；Codex独占核心、App与视觉，不等待测试包才能继续实施。
- 2026-09-13 Codex准入：用户要求继续，已核三席r1签字及取证接收树aa326f3f，Status→build；仅Codex改实现。
  本卡采用GLM取证材料但正式回归由Codex独立断言/验证，未来终审披露贡献；不重开已签设计。
- 2026-09-13 Codex首批：三处安全边界与事务no-op收口已落地；14新回归、三针反控、check6,932、ratchet及严格fast6,444通过。
  未修改App/按钮样式、content/reforge/migrate、生成工程或原/GLM审计探针；视觉/全局日志与配对原子性待后续。
  下一步同Owner推进项目级历史，不请求用户验收技术切片、不转review、不标done。
- 2026-09-13 Codex取证接收：GLM工作包最终11fb8148通过独立复核，报告/四诊断脚本已接入main；
  [接收结论与正式回归节奏](../../../../testing/glm-pre-e2e-prep-report.md)披露GLM贡献与11项待证归属。
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

本卡实现、自验证、三席终审及用户验收均已完成，候选70e3f627未变，已done归档。
**无下一位Agent提示词，本卡已收口。** 下列提示词均为已执行的历史记录，不重新授权实现、签字或验收。

### 给 Codex（历史：汇总技术终审与归档，已完成）

```text
在 /Users/zhangxu/illegal/type-pal 汇总 EDITOR-HISTORY-ORDER-1 收口，任务卡 docs/ops/archive/tasks/done/EDITOR-HISTORY-ORDER-1-global-undo-transactions.md，review/r1，终审候选 70e3f627（候选后 packages 零漂移）；r1 设计不重签。
先同步并检查工作树，读本卡 done 前三席签字与终审日志。现状：Codex（实现者自验证）与 Kimi（独立整卡终审，签字提交 e7c364ad）已 accept；GLM 覆盖/矩阵终审落卡后，请统一核定：三席钉同一候选 70e3f627、无 counter/返工项/缺签豁免，将任务推进 done，同步看板/索引/审计进度（D-01 可标修复）。
收口时保留并转述限制：全仓 90/85 未达、R4 综合链（物品买价与私有脚本交替、成对新增场景/实体、撤销到基线全部重做→保存→重开→试玩）待集中执行；D-06（新建物品作者记录生命周期）与 D-07（共享 ScriptId/私有前缀身份边界）为已登记 P2 待修，证据独立、非本卡回归，按队列另卡。
不得代签任何一席、不把本收口扩张为其他审计缺陷的整组授权；用户验收按惯例另行进行。
```

### Kimi（历史：r1整卡代码/架构终审，已完成）

```text
在 /Users/zhangxu/illegal/type-pal 终审 EDITOR-HISTORY-ORDER-1。
任务卡 docs/ops/archive/tasks/done/EDITOR-HISTORY-ORDER-1-global-undo-transactions.md，review/r1；设计签字不重签。
固定实现候选70e3f62770bbe0a23c4b9d90c31258a3d2883772，整卡对比10c84238..70e3f627，包含首批dded6f27；后续只应有文档diff。
先同步main并检查工作树，读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡上下文/最终实现回执与最新日志。独立读取一手证据，不读取或复述GLM本轮终审结论。
重点核唯一全局日志/事务ID、所有session入口路由、两侧prepare/validate/commit原子性、失败和订阅抛错、全局redo清理、地图元数据/affected记录、Root与StrictMode生命周期、App统一入口及文本/modal边界、保存缺正文拒绝与Root投影重开。
复跑editor的editor-history-coordinator/foundations/timeline/paired-workflows四测试文件（62项）及typecheck；按疑点补App/Root/地图相邻测试。独立复算至少两针负控制，参考 /tmp/type-pal-history-main.WcgNcg/negative.config.mts，核唯一替换点及业务失败，不把索引重叠拒绝冒称错误放行。
已有完整check6,981、严格fast6,493、Codex原生OPFS功能验证见卡，不重复视觉；采信日志须与本人复跑分栏。GLM贡献20项测试且经Codex补强，不能作为该部分独立自证。核D-06/D-07新旧证据及延期归属；若实际为本卡回归须counter，不因已登记就放过。
只在本卡“进入done前”的Kimi席位及本人日志写accept或带file:line/反例的counter，单列旧版本兼容审查pass/counter。不得改实现、正式测试、基线、其他席位、Status/共享准入，不代签、不标done。
提交前同步最新main，保留他席改动，提交推送自己的签字/日志；push竞态自行处理，不要求用户复制审查正文。最后给Codex接收提示词与提交SHA。
```

### GLM（历史：r1整卡覆盖/矩阵终审，已完成）

```text
在 /Users/zhangxu/illegal/type-pal 终审 EDITOR-HISTORY-ORDER-1 的测试矩阵与覆盖证据。
任务卡 docs/ops/archive/tasks/done/EDITOR-HISTORY-ORDER-1-global-undo-transactions.md，review/r1；设计签字不重签。
固定实现候选70e3f62770bbe0a23c4b9d90c31258a3d2883772，整卡对比10c84238..70e3f627，包含首批dded6f27；后续只应有文档diff。
先同步main并检查工作树，读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡H-01～H-12/最终回执/最新日志及 docs/testing/glm-editor-history-workflows-receipt.md 的接收勘误。独立核源码与最终测试，不读取或复述Kimi本轮结论。
本席贡献过20项配对测试，必须披露；不得把自己的测试自测包装成该部分独立第三方验收。重点核最终P09/P10/P13～P17/P19业务断言、七caller census的静/动边界，以及Codex timeline24/foundations14/App4/投影1与H矩阵的实际映射。
复跑核心四文件（coordinator/foundations/timeline/paired-workflows，共62项）及App.leave-guard、script-editor-projection测试；核五针order/split/future/pop/save单点反控（配置 /tmp/type-pal-history-main.WcgNcg/negative.config.mts，可自行重建），如实区分错误放行、重叠守卫拒绝、版本未失效。
独立运行单次严格pnpm coverage:fast，核6,493项/617生产文件、editor210测试文件/2,254项；不运行ratchet、不改基线。对比10c84238及dded6f27，核整卡+63项/本轮+49项、旧生产文件/测试未移除、其他六包指标和范围不变；既有check6,981与本人复跑分栏。若抖动复现按确定性缺陷报告，不靠多数通过放行。
检查回执/看板/覆盖文档以及D-06/D-07延期边界；单列旧版本兼容审查pass/counter。不做浏览器、截图或视觉判断，不改产品/测试/配置/基线，不把本卡扩成其它缺陷修复授权。
只在本卡“进入done前”的GLM席位与本人日志写accept或带file:line/业务反例的counter；不得改另一席结论、Status/共享准入，不代签、不标done。提交前同步main保留他席改动，提交推送自己的签字与日志，自行处理push竞态；用户不搬运审查正文。最后给Codex接收提示词与提交SHA。
```

以下r1设计提示词已执行，仅为历史，不再次转发、不重签。

### Kimi（历史：D-01 r1设计审查，与GLM并行）

```text
在 /Users/zhangxu/illegal/type-pal 审查 EDITOR-HISTORY-ORDER-1。
任务卡 docs/ops/archive/tasks/done/EDITOR-HISTORY-ORDER-1-global-undo-transactions.md，draft/r1，证据基线9fd32674，产品同10c84238。
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
先读AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md和工作包；D-01卡为 docs/ops/archive/tasks/done/EDITOR-HISTORY-ORDER-1-global-undo-transactions.md，draft/r1，产品冻结10c84238。
先独立完成D-01前提/矩阵设计审查，自己的premise/design签字与日志直接提交推送main；不要等其余三组做完，不读Kimi结论，不改状态或产品。
随后按工作包从59e03bdb建立独立worktree与codex/glm-pre-e2e-prep分支，核产品对10c84238零漂移，连续完成引用删除、上传乱序、预览缓存的只读取证。
只能改工作包白名单报告/诊断探针；不改packages、scripts、生成数据、正式测试、正式配置或覆盖率基线；不跑浏览器/截图/视觉/声音验收，不整仓check/coverage与Codex争抢资源。
每项给真实调用证据、合法正控、反例或待证原因；probe环境失败不能算产品缺陷，禁止跳过伪绿。已证实项可引用复跑，不堆无意义用例数。
不必每小组问继续；阻断独立登记后继续其他组。最后整批提交推送并给Codex分支/SHA、44项唯一ID账、命令/退出码/日志和复算入口。
这批是卡前取证，不是修复授权；不代签、不标done、不自行转Kimi。Codex统一审查和决定后续实现。
```
