# EDITOR-LEAVE-GUARD-1 - 未保存修改的离开保护

Status: done
Phase: phase2
Capability: ops（审计 A-07 修复，不新增能力格）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: both
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: main
Revision: r1（2026-09-13，三席终审 accept，用户授权继续，Codex 收口归档）
Evidence Baseline: fa8d4e52
Implementation Baseline: d46d63fa
Implementation Candidate: 10c84238（产品/测试；生成覆盖率基线与回执随后落盘）
Closed: 2026-09-13（用户在仅待验收确认的上下文回复“继续推进”，授权按既有验证收口；不记作手动复验）

## 当前结论与目标

用户要求继续既定审计修复队列；上一张 A-03 保存中断恢复已经验收、归档，不重开签字。
本卡只承接 A-07：作者有未保存修改时，新建、打开另一个项目或离开页面不能未经确认丢掉当前编辑会话。
取消、保存失败、打开失败均保留当前内容及历史；明确放弃后才允许切换。

本卡三席前提/设计审查已完成，用户回复“签了”，Codex 核定进入 build。D-01 撤销顺序随后另卡，未开始实现。
用户对 A-03 的免手动复审不自动外推为本卡免签或最终验收。

2026-09-13 Codex 接收 GLM 11d6026b / Kimi 2d8e56d0 终审：三席均对10c84238签accept，无返工项；
接手 main/origin 同为2d8e56d0、工作树净，候选后 packages 零 diff，两席只更新本卡。
[实现与验证回执](../../../../testing/editor-leave-guard.md)记录原生操作、LG矩阵、五组负控制及自审返工；
check6,918/严格fast6,430仍为同一候选证据，不重跑不代签。
随后用户在仅待验收确认的上下文回复“继续推进”，本卡按已有功能验证授权收口；Codex在9fd32674核工作树净、
main/origin同步、候选后packages零漂移，推进done并归档。不把此前“签了”倒记为手动复验，也不外推为未来任务免签。
本卡无需再转发审查提示词、重签设计或重复验收；D-01/完整E2E仍未完成。

## 范围

- 范围内：项目菜单新建/打开、两份 session 的 dirty 合并判断、保存后再离开、最终替换会话前复验、
  原生刷新/关闭的 beforeunload 提醒，以及另存为成功替换会话时不能丢弃保存快照之外的新修改。
- 另存为原本就是保存动作，不在开始时额外弹“放弃改动”框；只复用最终替换保护。
- 范围外：D-01 两栈历史算法、未提交到 session 的各领域临时草稿、玩家存档、自动保存、崩溃恢复新协议、
  工程格式/迁移/生成文件、全编辑器路由重写、同项目内正常选页/选对象与试玩/ZIP 的既有确认。
- 不改 A-02/A-03 的目录权限、可信身份、保存凭据、事务与读锁合同；不增加全局数据缓存或旧格式兼容。
- 不承诺浏览器强杀、系统崩溃必定弹框，也不把提醒当作未点击保存编辑的持久恢复。

## 前提真值门

### 一句话前提

当前两份 session 已能表达未保存修改，但项目离开入口没有消费这个事实，Root 随后直接卸载旧会话；
缺口在编辑器入口与异步完成后的会话替换，不在文件内容、迁移器或 A-03 保存恢复。

### 四向真值矩阵（源码行号均据 fa8d4e52）

| 维度 | 真值 / 目标 | 直接证据 |
|---|---|---|
| 原版 / primary source | 原版没有本创作编辑器；产品一手合同要求未保存离开/关闭需阻止或确认。目录选择需要用户激活；unload 只有浏览器确认机制，不能依赖异步保存完成 | [设计规范](../../../../phase2/specs/editor-design-system.md) DS-I.3，行 919–927；[FSA 草案](https://wicg.github.io/file-system-access/)，§3.1；[HTML BeforeUnloadEvent](https://html.spec.whatwg.org/multipage/nav-history-apis.html#the-beforeunloadevent-interface) |
| 第一阶段 | N/A：第一阶段为游戏运行时，无对应作者项目双会话/目录切换；不套玩家存档或退出游戏 UI | [CLAUDE](../../../../../CLAUDE.md) 阶段边界；[知识采集](../../../../phase2/reference/phase1-knowledge-harvest.md) X9 是运行态存档归一化，不是本卡的编辑器离开合同 |
| 当前二阶段 | 已有双 dirty；新建直接回 picker；打开成功直接 onOpened；Root 创建新两 session 并增加 mount 身份；保存自己捕获错误且返回 void，不能 await 完成就认定保存成功 | [App](../../../../../packages/editor/src/ui/App.tsx) 行 430、2066–2189、2192–2205、2260–2281；[Root](../../../../../packages/editor/src/main.tsx) 行 158–176、191–202；[pickDir](../../../../../packages/editor/src/core/open-actions.ts) 行 75–84 |
| 本任务目标 | 当前会话只有 clean、明确放弃本次修改、或成功保存且无更新修改时可被替换；失败/取消保留原会话；确认不跨修改版本复用 | 同一 DS-I.3 合同；本卡 LG-01～LG-10 为待验证目标，不冒称已实现 |

### 替代解释、反证及边界

- 最强替代解释：A-03 已在某一共享入口处理离开，或 Root 有最终 dirty 守卫，故 A-07 已被间接修好。
  本轮重读当前 App→runProj/onBackToPicker→Root 完整域：两处仍直达替换；全 editor 源无 beforeunload。
  A-03 只恢复完整暂存过的保存，不保存尚未点击保存的编辑。
- 何种观察推翻前提：真实“主编辑修改/仅脚本修改→新建或打开”调用已被现行共享守卫拒绝、确认或保留；
  若审查发现该路径，先更正前提，不叠第二道提示。
- runtime/命令分类：dirty 已由 EditSession/ScriptEditSession 正式 dispatch/undo/redo 维护，不是运行态改动；
  [EditSession](../../../../../packages/editor/src/core/edit-session.ts) 行 173–200、[ScriptEditSession](../../../../../packages/editor/src/core/script-editor.ts) 行 1321–1340。
- 原版/第一阶段理解：无同类编辑器 UX，按现行设计系统确认框合同；不据 sdlpal 推出任何产品行为。
- 提取/地图/解码：离开入口只需两 session 与回调；不依赖 PAL 数据、地图中心、坏资源或迁移版本。
- audit/test model：原 A-07 是调用链证据，不是假装已经浏览器复现；本轮再次核源码仍成立。
  `saveAs` 期间新命令的替换复验是防护验收边界，未额外计为已实测的新缺陷。

### 用户可见变化

- 是否主动偏离已核产品合同：no；修复 DS-I.3 已要求的保护，不重新设计编辑页面。
- before → after：有未保存修改时新建/打开可直接丢会话 → 先选择取消、放弃或保存；失败留在原项目。
- 代表场景：只修改物品脚本正文、不改主属性，点“项目→打开项目”；仍必须提示，取消后正文及 undo 不变。
- 新提示复用现有 DsDialog/DsButton 短决策形态；下方文字线框为 r1 方案，不引入侧栏/新工作台。
- 用户已要求继续修复并确认签字完成；准入依据为仓内三席本人签字，不代签。

## 上下文锚点

- [AGENTS](../../../../../AGENTS.md)、[CLAUDE](../../../../../CLAUDE.md)、[READ-FIRST](../../../../phase2/READ-FIRST.md)：
  当前 canonical、单 Coding Owner、功能视觉由 Codex 负责；不重开已完成 A-03。
- [A-07 审计](../../../audits/pre-e2e/README.md#a-07--新建打开缺少未保存内容离开保护)、
  [D-01 相邻问题](../../../audits/pre-e2e/editor-workflows.md#d-01--跨会话撤销没有统一的时间顺序)、
  [A-03 验收边界](../../../../testing/editor-save-recovery-closeout.md)。
- [App](../../../../../packages/editor/src/ui/App.tsx)：行 580–584 同步保存门；1922–1966 快捷键；
  1989 入口失效早退；2166–2174 保存快照/dirty 保护；2207–2235 另存为；2477 编辑区 inert。
- [DsDialog](../../../../../packages/editor/src/ui/design-system/overlays.tsx) 行 177–237：native modal、焦点归还、Esc；
  [已有放弃草稿框](../../../../../packages/editor/src/ui/SpriteActionEditorDialog.tsx) 行 407–432；
  [保存进度框](../../../../../packages/editor/src/ui/ProjectSaveDialog.tsx) 不可用 Esc 伪取消写盘。
- 不得重新引入 ScriptDrawer/旧作者脚本分片；不改历史协调器冒充已经解决 D-01。

## Draft：设计

### 1. 短决策与用户激活

复用居中 DsDialog；默认焦点落“取消”，Esc/关闭均等价取消；三个按钮同一尺寸、规范 footer 间距、文字按钮无装饰图标。

```text
有未保存的修改
继续新建/打开项目前，请先保存，或明确放弃当前修改。

[取消]  [不保存并继续]  [先保存]
```

- clean：新建直接回 picker；打开从点击调用栈同步启动选夹，不先 await 预检查。
- dirty：此时不打开文件夹、不卸载会话、不清 dirty/历史。“不保存并继续”才授权当前修改版本离开。
  新建回 picker；打开在该按钮点击调用栈直接启动现行 openExistingProject。
- “先保存”复用唯一 save 路径；不另造保存器。保存成功且两边无更新修改后显示“已保存”，
  footer 为“返回编辑”和“继续新建/继续打开”；继续打开必须重新点击，避免长保存耗尽激活后自动弹目录失败。
  不承诺 Promise continuation 必然还有 transient activation，不使用自动重试选夹。
- 保存取消/失败保持当前项目，恢复可操作确认框并显示同一错误事实；不得将 await save() 的正常 resolve 当作成功。
  保存进度期间只保留一个可操作顶层 modal，不做两个焦点陷阱互抢。
- 保存后若又有主编辑/脚本命令，不能显示无条件的“已保存”；回到需决策状态，不复用旧放弃授权。

### 2. 单一离开入口与最后复验

- 编辑器内用一个小型离开协调器/受控状态实现 `idle → decision → saving/ready → opening → commit`，
  不拆整个 App、不导出跨包新接口。Root 的 onOpened/onBackToPicker 只能由本轮获准的完成路径调用。
- 捕获 App 实例、请求身份、两 session 的 historyVersion；异步开始/完成均判断归属。
  原生 picker 打开前、保存/打开等待期以同步门防双击和互斥；React state 只负责展示。
- 未保存确认/等待打开期间禁用背景作者操作与相冲突全局快捷键；不以禁用 UI 替代完成时校验。
  在 onOpened 前再次验证当前请求、会话身份及自确认/保存捕获以来无新作者动作。
- 打开取消/抛错：保留旧 session 对象、内容、dirty、undo/redo；不预先清它们，也不先去 picker。
  打开目标本身可能按 A-03 恢复/登记；取消旧项目离开不回滚已合法发生的目标恢复，不声称打开必然零磁盘 IO。
- 等待时内容变化：拒绝本次替换并提示重新操作；不要持有久置的 Opened 绕过目标重验。
  `saveAs` 同理：目标成功写出但原会话期间又有新修改时保留原会话，明确告知副本已保存而当前新修改仍未保存；
  不删已生成目标、不额外自动重写、不把这部分新修改标记已保存。
- 仅 hydrate/markSaved 通知不算新的作者命令；不能让普通地图懒加载使打开永远失败。
  不改 session 的 dirty/历史语义；版本获取用于此处短时授权，不变成全局 undo 时间线。
- 清理卸载/StrictMode 订阅及失效请求；旧 Promise 不得在新 App 上提交、覆盖错误或解锁新请求。

### 3. 刷新 / 关闭

- 在 App 早退渲染前装配同一双 dirty 观察；有未保存内容或正在保存/恢复时，在 beforeunload 请求浏览器确认。
  clean 且无写操作不干扰正常离开；事件处理读取实时 session/ref，不能只用旧 render 闭包。
- 不在 beforeunload 中启动异步保存、选夹或自制三选一 modal；原生提示的展示/文字由浏览器决定。
  用户选“留在页面”时会话仍可编辑/重试；提示不是硬件或强杀保证。
- 不拦截同项目内正常页签/对象选择，不改路由语义。未进入 session 的局部新建草稿仍由其既有 modal 管理；
  本卡不声称全域未提交输入已纳入 global dirty。

### 4. 文件与风险边界

预计生产面限 editor 内 App、必要的小型离开协调器/hook/提示组件、唯一 save 的结果返回；
仅有直接必要性时调整 main 最后装配接线。持久化核心、content/reforge/migrate、工程数据、版本常量零修改。
新组件优先复用 DS，不为本卡增加一套 button/dialog CSS；确需类名只在 editor 样式内最小增量。
发现需要改持久化协议、共享 schema 或前提时停线说明，不把修复膨胀成第二张 A-03。

## 验收条件与测试矩阵

以下为已签验收矩阵；本轮实现/自测证据见回执，终审由两席独立核定。测试执行真实生产调用，不复制判断逻辑当被测物。

| ID | 最小正/反向业务验收 |
|---|---|
| LG-01 | clean 新建/打开直接进入；main-only、script-only、双 dirty 均拦截，确认前回调/选夹调用为零 |
| LG-02 | 取消按钮/Esc/关闭框保留两 session 内容、dirty、undo/redo，焦点返回；取消不排队稍后自动执行 |
| LG-03 | 明确放弃后新建恰一次；打开取消/错误不卸载旧项目，成功才替换；下一次离开重新询问 |
| LG-04 | 先保存：正常提交后可继续；选夹取消、PAL 确认取消、writer 错误/冲突/IO AbortError 均不离开；清理 warning 与未提交失败区分 |
| LG-05 | 保存/打开被 entered/deferred 真挂起时，新建/打开/保存/另存冲突入口不重复启动；错误/结束正常释放，无延时凑门 |
| LG-06 | 完成时主/脚本新命令逐轴使旧授权失效；clean→dirty 也覆盖；仅 markSaved/hydrate 不误判作者变更 |
| LG-07 | 另存为正控切换到新项目；返回 null/失败留旧项目；保存期间新修改留旧会话与 dirty，副本已提交事实不被伪装成回滚 |
| LG-08 | 原生事件：main-only/script-only dirty、保存/恢复中请求离开确认；clean 无多余提示；卸载/StrictMode 不重复监听；入口失效页也有保护 |
| LG-09 | 真实 App 菜单/全局快捷键接线能命中守卫，modal 不让保存/撤销/删除穿透背景；只测纯 helper 不够 |
| LG-10 | 最小浏览器：慢保存后“继续打开”仍能原生选夹；取消/失败后可编辑；刷新点留在页面后修改仍在；宽/窄窗按钮等高有间距、文案不截断 |

- 使用真实 EditSession/ScriptEditSession 与当前 blank fixture；FSA/IDB 只在边界隔离，至少一条保存后正式重开核值。
- 单点负控制至少覆盖：移除 script dirty、将失败当保存成功、删除最终修改版本复验、旁路一个真实新建/打开入口；
  新回归必须出现错误离开/修改丢失级业务红，不能只靠文案/源码字符串失败。记录突变精确唯一位置。
- 修改测试定向 + editor typecheck + 完整 `pnpm check` + 官方 ratchet + 单次严格 `coverage:fast`；
  保留基线分母和既有测试，串行运行重检查，不用多次取多数规避确定性失败。
- 当前参考基线：check 6,873，fast 6,385；只是 fa8d4e52 的证据，不是本卡结果或固定加法目标。
- 视觉由 Codex 在隔离测试工程执行；不操作用户日常工程/浏览器资料，不让 GLM 做截图或浏览器验证。
- R4 集中用例：修改主属性与脚本→取消离开→保存→打开另项目→重开原项目，核值和操作历史边界；
  A-03 持久恢复已有证据复用，不重复跑全套浏览器重启/撤权。具体证据路径在 build 回执登记。

## 推进签字

### 进入 build 前：设计签字

- Codex（2026-09-13）：premise verified；直接重读 fa8d4e52 的 App 行 430/2192–2205/2260–2281 与
  main 行 158–176/202，双 dirty 不进入两条离开回调，当前 source 未见 beforeunload。
  design agree；复用既有保存与 DS，确认绑定当前修改版本，异步失败与原生用户激活单列。
  可证伪观察：若真实生产入口已有守卫或保存失败仍可触发“已保存→继续”，本签字应重开。
- Kimi：**premise verified / design agree（2026-09-13，r1，证据基线 fa8d4e52；全部证据本人直读，未读 GLM 结论——其签字于本人核查完成后落盘，仅确认席位位置）**。
  - **前提直读**：`App.tsx:430` 双 dirty 已存在（`session.isDirty() || scriptSession?.isDirty()`）；
    `runProj`（:2192-2205）打开成功直接 `props.onOpened?.(o)`；「新建项目」命令（:2260-2281）
    直接 `props.onBackToPicker?.()`；Root `onOpened`（main.tsx:158-176）新建双 session 并递增
    mount 身份、`onBackToPicker={() => setBoot('picker')}` 直接卸载 App——两条替换路径均无
    dirty 消费；全 editor 源无 beforeunload（grep 实证）。`save`（:2066-2191）返回 void 且
    catch 内 `setSaveErr` 后正常 resolve——**await save() resolve ≠ 保存成功**，设计警告属实；
    markSaved 有 `session.getState() === savedState` 与脚本 version 双重防误清（:2166-2174）。
    `saveAs`（:2207-2235）await 后直接 onOpened——等待期新命令会被静默丢弃，前提完整成立。
  - **版本语义直读**：`edit-session.ts:121` historyVersion 只在 dispatch/undo/redo 递增，
    `:508` 按需 hydrate「不入 undo、不置脏」，`:287-288` undo 置 dirty=true 且版本递增——
    完全撤销后仍提示属保守正确方向（比较 dirty/版本而非 state 相等）；
    `script-editor.ts:1321-1340` 双 version 计数——「确认绑定修改版本、仅 hydrate/markSaved
    不误判作者变更」有既有合同支撑，非新造语义。
  - **规范/边界直读**：DS-I.3（editor-design-system.md:919-927）「离开/关闭前有未保存改动必须
    阻止或确认」为已有一手合同；`open-actions.ts:75-84` showDirectoryPicker 需用户激活、
    AbortError→null 取消静默；saveAs 已在点击调用栈同步启动（:2220-2221 注释在案）——
    「保存后继续打开必须重新点击、不承诺 Promise continuation 有 transient activation」与
    FSA 现行约束一致。
  - **设计同意**：单一离开协调器（idle→decision→saving/ready→opening→commit）+ 请求身份/
    双 historyVersion 捕获 + onOpened 前复验；取消/失败保留旧 session 对象与 undo；saveAs
    期间新修改保留原会话并明确告知副本已存而新修改未存；等待期内容变化拒绝替换不持有久置
    Opened；保存结果真实返回（成功/失败/cleanup warning 区分）不拿 void resolve 冒充；
    beforeunload 早退渲染前装配、读实时 ref、不在其中启动异步保存/选夹/自制 modal；
    复用 DsDialog 短决策与唯一 save 路径；文件面限 App+小协调器+save 返回+必要 main 接线。
    **范围确停在 A-07**：D-01 两栈算法、未提交草稿、自动保存、崩溃恢复新协议、A-02/A-03
    目录权限/凭据/事务/读锁均明确不动；无全局数据缓存或旧格式兼容引入。
  - **可证伪观察**（任一反例即 counter 或收窄）：① 现行任一新建/打开入口已有共享守卫 →
    前提倒，先更正不叠第二提示；② 实现后 save 失败/cleanup warning 被当「已保存→继续」；
    ③ 确认后新 dispatch（主轴或脚本轴）仍复用旧放弃授权完成替换；④ 懒地图 hydrate 或
    markSaved 被误判为作者命令致打开永败；⑤ saveAs 等待期新修改被静默替换且未告知；
    ⑥ beforeunload 在 clean/无写操作时误拦截，或 dirty 时漏装；⑦ 守卫只在 helper 层生效而
    真实菜单/快捷键旁路（LG-09）；⑧ 旧 Promise 在新 App 上提交/覆盖错误。
  - 返工项：无。非阻断备注：file.new 命令、runProj 与 Root onBackToPicker 必须全部经同一
    协调器（设计 §2 已列）；picker 取消静默与 IO AbortError 失败在 LG-04 已分列，实现期
    不得合并文案；冲突入口互斥须沿用既有 saveInFlight/exporting 旗语，守卫不得另开旁路。
- GLM（2026-09-13，前提/测试矩阵席）：**premise verified**。本席直读 fa8d4e52 源码（HEAD 2c4cf16b 对
  fa8d4e52 的 packages 零 diff，源码基线成立）：双 dirty 合并在 App.tsx:430（`session.isDirty() ||
  (scriptSession?.isDirty() ?? false)`）；两条替换直达——runProj 在 App.tsx:2196-2198 `if (o) props.onOpened?.(o)`
  不消费 dirty，saveAs 在 App.tsx:2230 快照后无条件 onOpened（2213-2214 先取 savedState，期间新命令会被
  丢弃，LG-07 前提真实），file.new 在 App.tsx:2264 直达 onBackToPicker；Root main.tsx:158-176 重建双 session
  并以 key 重挂载、191-202 `setBoot('picker')` 直接卸载；editor 全源 `beforeunload` 零命中（grep 计 0）。
  dirty 由正式 dispatch/undo/redo 维护（edit-session.ts:190-200、script-editor.ts:1321-1340），非运行态推断。
  save 返回 `Promise<void>` 且内部 catch setSaveErr（App.tsx:2066-2068、~2185-2187）→ await resolve 不能
  当成功，设计 §4「唯一 save 的结果返回」为必要改动。pickDir 为真实 `showDirectoryPicker`（open-actions.ts:75-84，
  AbortError→null）；saveAs 既有注释 App.tsx:2215-2216 已确认目录选择器必须点击调用栈内同步启动——设计
  「继续打开必须重新点击」与仓内先例和 FSA 激活合同一致。**design agree**：LG-01～10 逐条可证伪、均含成功
  正控（clean 直行/成功保存后继续/saveAs 成功切换/失败留原会话），且明令真实生产调用、禁源码字符串与桩行为
  替代产品断言、禁多数通过规避确定性失败；四个重点陷阱全部核实——①选夹新点击（LG-10 慢保存后继续打开即
  可证伪见证）；②save void 失败误判（LG-04 区分 cleanup warning 与未提交失败，现行 `setSaveErr(result.cleanupWarning ?? '')`
  已有区分基础）；③另存为/普通打开不混称零 IO（设计 §2 明示，LG-03 断言旧会话保留而非零 IO）；④仅 hydrate
  不误拦（ensureMapLoaded 水合直接写 state 但不置 dirty、不增 historyVersion——edit-session.ts:509 起；
  markSaved 清 dirty 也不增版本 → historyVersion 捕获能区分作者命令与水合/通知）。
  最小补项（非阻断，建议进 build 前矩阵）：(1) LG-05 冲突入口清单补 `exporting`（runProj/save/saveAs 共用
  `saveInFlightRef.current || exporting` 互斥旗 App.tsx:2067/2193/2208，离开守卫不得绕过或破坏）；
  (2) LG-01/02 补「编辑→完全撤销→离开」用例，钉保守提示语义（undo 置 dirty=true 仅 markSaved 清，
  edit-session.ts:287-299——守卫应比较 dirty/版本而非 state 相等）；(3) LG-06 非作者动作清单在 markSaved/hydrate
  外补列 `discardRedo`（edit-session.ts:280-286 无内容变化却增 historyVersion；其误判方向保守=多问一次，
  可接受但须声明，防止实现换信号时无据）。
  可证伪观察：(a) 若任一真实入口（菜单/快捷键/saveAs 完成）在 dirty 时已被守卫拦截或确认，前提不成立——
  本席核对未发现，反证未出现；(b) 若 markSaved/hydrate/discardRedo 之外的 notify-only 路径能触发误拦、
  或反之真实作者命令不能使旧授权失效，LG-06 应红；(c) 若慢保存后免新点击自动重试选夹能成功，
  「必须重新点击」的设计前提应重开——现行证据相反。
- 独立反证审查：GLM 已直接核一手源码（见上）；Kimi 席位另行独立。
- counter / 分歧：GLM 无 counter；三条最小补项供 Codex 吸收进矩阵，不构成阻断。
- 缺签豁免：无。
- build 准入结论：build allowed（2026-09-13 Codex 核 GLM 20bde469、Kimi d46d63fa，三席 r1 齐、无 counter/缺签豁免）。

### Codex 准入吸收（不改他席原始签字）

- LG-05 纳入 exporting 的同步互斥与错误后释放；LG-01/02 加“编辑→完全撤销→离开”仍按 dirty 保守提示。
- LG-06：discardRedo 虽不改内容也递增 historyVersion，按已签方案保守失效短时授权；不改变历史系统。
- cleanup warning 表示已提交但清理有警告，不是未保存失败；仅在已成功提交且当前两 session clean 时可继续，
  警告仍可见。Kimi 可证伪观察②按其设计同意段的“成功/失败/cleanup warning 区分”和 LG-04 执行。
- 某次慢保存后的自动选夹偶尔成功，不反证激活有时效；本方案始终要求新点击，不依赖宿主偶然保留激活。

### 进入 done 前：审查签字

- Codex（2026-09-13）：accept，候选 10c84238 对比 d46d63fa；r1 保持有效，无代签。
  - 独立自测：guard 18 + 真实 App 27 + 既有保存冲突 36 = 81/81；保存后正式 loader 重开核主/脚本值。
    PAL 确认取消、真正 IO AbortError、清理警告、原生选夹取消与异步晚到命令各有边界断言。
  - 自审 ceec744a 的 ready→decision 旧按钮误授权有两条先红业务回归，10c84238 用 choice 与 phase 校验及
    不同 button key 修复，两条转绿。五个单点负控制分别 5/2/7/10/2 红；不把 modal 缺席 TypeError 或文案失败充业务红。
  - 完整 check 6,918（editor 226/2,350）、官方 ratchet 和单次严格 fast 6,430（editor 207/2,191）均 exit0；
    相对 d46d63fa 新增 3 生产文件/2 测试文件45项，旧测试身份/计数零变化，无源码移出范围，无门槛下调。
  - 原生功能/视觉由本人执行：独立 Edge/6011/OS 测试目录；取消刷新保留内容、慢保存后新点击选夹、
    失败可操作/重试成功；1280/720 下按钮36px高、间距8px。原生证据为 ceec744a，点击身份补强复用
    未改变的外观/文件流程，另有真实 App 回归与单点反证；完整细节、混杂的准备尝试及边界均在回执，不冒充最终全部浏览器路径。
  - 旧版本兼容审查：pass；产品面限 editor 的 App/guard/hook/dialog，持久化核心、Root、其他包、生成数据和版本零改。
    不重引 ScriptDrawer/旧分片/升级器；A-02/A-03 权限/凭据/事务/读锁保持，D-01 单独排队。
  - 剩余：guard 分支61/63（96.83%，常规汇总四舍五入），两臂保留分母；不承诺强杀/未提交领域草稿。
    全仓覆盖率仍未达最终90%/85%目标，R4 综合链尚待集中执行。
- Kimi：**accept（2026-09-13，独立终审候选 `10c84238` 对比 `d46d63fa`；r1 不重签；未读 GLM 终审结论——其签字于本人核查完成后落盘，仅确认席位位置）**。
  接手 HEAD `e777f42b` 与 origin/main 一致、工作树干净；候选后 packages 零漂移。
  - **guard 内核直读**（`project-leave-guard.ts` 全量）：request 干净直行/脏开决策并捕获
    [main/script historyVersion]；begin 同步租约（save 仅 decision 期可 saveBeforeLeaving）、
    saveInFlight/exporting 排他语义合入单一 gate；canReplace = isCurrent + 双版本不变
    （discardRedo 递增版本保守失效，注释与设计轮观察一致）；finish 仅在 committed 且
    无新修改时进 ready；connect/disconnect 卸载作废旧租约；beforeunload 读实时状态。
  - **App 接线直读**：守卫装于入口失效早退之前；`save` 返回真实 ProjectSaveOutcome，
    每个 await 点查 isCurrent、finally finish(lease, outcome)，cleanup warning 仍归 committed
    不冒充失败；`runProj`/`saveAs` 在 onOpened 前 canReplace 复验，分别给出「打开期间当前项目
    又有修改，已保留」与「副本已保存；当前新修改仍未保存」的准确事实；`performLeave('open')`
    同步穿 pickDir 保激活；file.new/open 经 requestLeave；守卫 blocked 时全局快捷键拦截且
    cmd+S preventDefault；`scene?.id` 修正使入口失效页守卫真正可达。
  - **choice 修复独立复核**：ceec744a 的 confirm() 只读调用时 phase——ready 被后台命令降级
    后，旧「继续打开」点击会被误当 discard 授权（数据丢失方向）。10c84238 修复为调用方携带
    渲染所表达的 choice + guard 校验 phase 一致 + 两动作不同 React key 重挂载。先红证据
    consent-before.log 恰两条红（core 返回 open 而非拒绝、App picker 被调 1 次）；
    **本人独立重建负控制**：内存变换仅删 ` || decision.phase !== choice`（唯一锚点断言），
    恰该两条回归红（2 failed/9 passed/34 skipped），其余不变，工作树零改动。
  - **本人实跑**：定向 81/81（guard 18 + App 27 + 既有保存冲突 36）；editor typecheck exit 0。
    交叉核收口日志：check 6,918（editor 2,350）、strict TOTAL **616 文件/6,430 项**；
    基线身份变化精确为 +2 测试文件/+3 生产文件，旧测试零移出。
  - **视觉证据复用**（Codex 已执行，不重复浏览器流程）：亲看 decision-wide.png——三按钮
    同高、取消默认焦点、danger 放弃、文案完整，与 r1 线框一致；慢保存/激活过期新点击/
    失败可操作重试等原生流程及准备期失败边界在回执如实登记，不把开发热重载当产品导航。
  - **范围**：产品面限 App/guard/hook/dialog + 既有测试接线；持久化核心、Root、其他包、
    生成数据、版本常量零改；无 ScriptDrawer/旧分片/升级器回引；A-02/A-03 权限/凭据/事务/
    读锁未动；D-01 未混入；guard 为 session-local UI admission，非写能力、非新 undo 时间线。
  返工项：无。剩余限制如实保留（guard 两臂在分母、强杀/未提交草稿不承诺、R4 集中链待执行、
  全仓 90/85 未达）。本 accept 不代签、不授权 done。
- GLM（2026-09-13，矩阵/覆盖席终审）：**accept**。披露：本席为 r1 前提/矩阵签字方，本次为对候选
  10c84238 的独立矩阵/覆盖终审复核，非第三方重验全部原生证据（原生/视觉由 Codex 持有，本席未操作浏览器）。
  ①定向实跑 **81/81**：project-leave-guard 18 + App.leave-guard 27 + 既有 author-save-conflict 36，
  数量与身份精确一致；②五组单点负控本席独立复跑（/tmp/type-pal-leave.MtfuoI/negative.config.mts，include
  钉死两文件，每针唯一替换）：script/result/revision/menu/choice 分别 **5/2/7/10/2 项业务红**，红测均为
  真实回调/选夹/历史断言而非文案或 TypeError；③机械对账：baseline.fast testCount=**6,430**、七包源码
  **616**、editor **218** 与声明一致；d46d63fa→HEAD 基线身份 diff 精确为「+2 测试文件（+45 项）、+3 生产
  文件（project-leave-guard.ts/ProjectLeaveDialog.tsx/use-project-leave-guard.ts）、零移出零改动」，其余六包
  fastTests 逐包 identical——旧测试身份计数零变化、无门槛下调属实；候选 10c84238 之后仅 docs/baseline
  提交，packages 零漂移；check-consent.log 复核 editor 226/2,350、lint 48 warning/0 error。④焦点项逐一有
  具名测试：PAL 首存确认取消不选夹不丢编辑（App.leave-guard:407 起）、真实 IO AbortError（:362）与选夹
  AbortError（:102）、cleanup warning 不冒充失败（guard:290）、export 读写互斥及真实读失败释放（App:326）、
  完全撤销保守再问+discardRedo 保守失效（guard:78）、真实保存后正式重开核值且继续需新点击（guard:270）、
  旧 ready 点击竞态防重新解释为放弃（guard:193 + App:305 + choice 负控）——**本席 r1 三条最小补项
  （exporting 互斥/完全撤销/discardRedo）全部被吸收为具名测试**。⑤存储替身与原生证据区分明确：App 测试
  替身仅 FSA 目录/原生 picker/origin 存储记录边界，文档明示不借此宣称身份/锁协议重验收；原生证据为
  Codex 的 ceec744a 实测 + 点击身份补强经真实回归与 choice 负控佐证。剩余限制如实保留：guard 61/63 两臂
  在分母、强杀/未提交草稿不承诺、R4 集中链待执行、全仓 90/85 未达。无 counter。
- counter / 返工：无；Codex 已于2026-09-13核两席均accept且钉同候选。
- 缺签豁免：无。
- done 准入结论：done allowed（2026-09-13 Codex核三席accept、零代码漂移、用户“继续推进”授权收口；无缺签豁免）。

## Build / Review / 视觉 / 用户验收

- Build：2026-09-13 Codex 接手 d46d63fa；工作树净、main/origin 同步、产品相对 fa8d4e52 零 diff。
  ceec744a 实现与首轮验证后自审发现窄竞态，10c84238 补强并重新跑完整质量门；证据见上方 Codex 席位与回执。
- Draft 文档自检：`node --test scripts/docs/*.test.mjs` 20/20；`node scripts/docs/check.mjs`
  411 Markdown / 1,944 local links / 141 tasks / content20 SAVE8，零问题；完整产品 check/覆盖率未重跑（本轮无源码变更）。
- Review：三席均accept，Codex已核定；没有内部子Agent代签。
- 视觉：Codex dev-functional 已完成，见回执；不交由 GLM，也不让两席重复已有视觉流程。
- 用户验收：用户已授权按既有验证收口，未另跑手动复验。以下保留历史可选复验步骤，不再要求重做：专用测试项目中改一个场景名→文件/打开→取消，
  确认名称与未保存态仍在；再选择先保存→已保存→继续打开，取消选夹后仍留原项目。故障注入由 Codex 已测，不让用户代跑。
- 资源生成/额度代班：N/A，无资源任务、无缺席代班。

## 交接日志

- 2026-09-13 Codex：同步核 main/origin 为 fa8d4e52、工作树净；确认 A-03 done 后新卡只处理 A-07。
  重新核两条 Root 替换调用、save void/catch 和 FSA 激活要求；登记另存为完成复验/原生卸载边界。
  当前为设计候选，未开始产品修改；Kimi 与 GLM 可并行独立取证、各自落签，不依赖另一席结果。
  同步修正工程生命周期规范残留的“A-03 实施中/未终审”旧状态；只更新事实，不改验收合同。
- Kimi 交接日志（r1 设计审查，2026-09-13）：完成 r1 独立前提/架构审查，签 premise verified +
  design agree，无返工项。直读 App.tsx:430 双 dirty、runProj:2192-2205/file.new:2260-2281 两条
  直达替换、Root main.tsx:158-176 重建与 setBoot('picker') 卸载、save:2066-2191 void+catch resolve、
  saveAs:2207-2235 await 后直接 onOpened；版本语义 edit-session.ts:121/287-288/508 与
  script-editor.ts:1321-1340；DS-I.3:919-927、pickDir:75-84、全源 beforeunload 零命中。
  八条可证伪观察与三条非阻断备注写入设计席。未改产品/测试/他席/共享准入/Status。
- Kimi 交接日志（r1 终审，2026-09-13）：终审完成，签 accept（候选 10c84238 对比 d46d63fa），无返工项。
  直读 guard 全量（request/confirm/begin/canReplace/finish 与双版本捕获、discardRedo 保守失效、
  卸载作废）、App 接线（save 真实 outcome + isCurrent 检查点、runProj/saveAs canReplace 复验、
  performLeave 同步穿 pickDir、快捷键拦截、入口失效页 scene?.id 修正）；ceec744a choice 竞态
  独立复核：先红两条（consent-before.log）+ 本人重建负控制（仅删 phase!==choice 绑定，恰两条
  回归红、工作树零改动）。复跑定向 81/81、typecheck exit 0；交叉核 check 6,918、strict 616/6,430、
  基线 +2 测试/+3 生产零移出。视觉复用 Codex 证据（亲看 decision-wide.png 与 r1 线框一致）。
  未改产品/测试/他席/共享准入/Status，未读 GLM 终审结论。Next：Codex 统一核定 done；
  R4 集中链与用户验收按台账另推。
  直读 App.tsx:430 双 dirty、runProj:2192-2205/file.new:2260-2281 两条直达替换、Root main.tsx:158-176
  重建与 setBoot('picker') 卸载、save:2066-2191 void+catch resolve（失败≠成功）、saveAs:2207-2235
  await 后直接 onOpened；版本语义 edit-session.ts:121/287-288/508（undo 置脏递增属保守正确、
  hydrate 不置脏）与 script-editor.ts:1321-1340；DS-I.3:919-927 一手合同、pickDir:75-84 激活/取消
  边界、全源 beforeunload 零命中。八条可证伪观察与三条非阻断备注（入口全经协调器、取消/AbortError
  文案分列、沿用 saveInFlight/exporting 互斥）写入本席。未改产品/测试/他席/共享准入/Status，
  未读 GLM 结论。Next：两席齐后 Codex 放行 build；视觉由 Codex 后续执行。
- GLM 交接日志（2026-09-13）：按本席 r1 提示词完成独立前提/测试矩阵审查并签字（premise verified +
  design agree，无 counter）。同步 origin/main 后直读 fa8d4e52 一手源码：双 dirty（App.tsx:430）、两条
  替换直达（App.tsx:2196-2198/2230/2264、main.tsx:158-176/191-202）、beforeunload 零命中、save void+内部
  catch（App.tsx:2066 起）、pickDir 真实激活要求（open-actions.ts:75-84 + App.tsx:2215-2216 仓内先例）、
  hydrate/markSaved/discardRedo 的版本与 dirty 语义（edit-session.ts:173-200/280-299/509 起、
  script-editor.ts:1321-1340）、DS-I.3 一手合同（editor-design-system.md:919-927）。LG-01～10 逐条判定
  可证伪且有成功正控、无源码字符串/桩行为替代产品断言；四重点陷阱全部核实成立。留三条最小补项
  （exporting 互斥入口、编辑后完全撤销的保守提示语义、discardRedo 非作者动作清单）与三条可证伪观察
  于签字块。未读 Kimi 结论，未改产品/测试/他席内容/Status/共享准入，不标 done。下一位：待 Kimi 独立
  签字后由 Codex 核 build 准入；本席补项是否吸收由 Codex 拍板。
- 2026-09-13 Codex 实现交接：核三席 r1 后推进 build，吸收 exporting/完全撤销/discardRedo 三补项；
  候选10c84238，81定向、五针业务红、check6918、ratchet及严格fast6430。原生浏览器和自建6011已收尾。
- GLM 终审日志（2026-09-13，矩阵/覆盖席）：按本席终审提示词复核候选 10c84238（对比 d46d63fa）并签
  **accept**（done 前席位，无 counter）。未读 Kimi 终审结论、未操作浏览器/截图。证据：81/81 定向实跑；
  五针 5/2/7/10/2 业务红独立复跑（先查回调/选夹/历史，非文案）；基线机械对账 6,430/616/218、
  +45 项/+3 生产文件/零移出、六包 fastTests identical、候选后 packages 零漂移；check-consent.log 抽核。
  七个指定焦点项（PAL 取消、IO AbortError、cleanup warning、export 互斥、discardRedo、真实保存重开、
  旧 ready 点击竞态）逐一映射到具名测试；r1 三补项全部吸收。存储替身与原生证据边界、guard 61/63 两臂、
  R4 集中链与全仓 90/85 未达均如实保留。done 准入仍待 Kimi 终审与用户验收；本席不改产品/测试/他席结论/
  Status，不标 done。完成交 Codex 统一核门禁。
  审计探针/持久化核心/生成工程零 diff；两席设计原文完整保留。下一步两席针对同候选独立终审并各自落盘。
- Kimi 终审交接日志定位：已见上方本人“r1终审”日志，无待补签。
- GLM 终审交接日志定位：已见上方本人“矩阵/覆盖席”终审日志，无待补签。
- 2026-09-13 Codex 接收终审：在2d8e56d0核三席accept、同候选及packages零漂移，无返工。
  只更新当前状态/看板/审计进度，不改两席签字或复跑既有原生流程；等待用户确认验收，再统一归档。
  口径澄清：Kimi“每个await点查isCurrent”按实际源码应理解为关键完成/提交与反馈边界，非每个await之后都有检查；
  以候选源码和本卡验收边界为准，不扩大为任意异步步骤均可取消的保证。
- 2026-09-13 Codex 收口：用户“继续推进”承接仅待验收确认，按既有验证授权收口；三席签字保留，9fd32674
  相对候选packages零diff。归档、同步索引/看板/审计与规范；只跑文档门禁，未重跑相同原生流程或代签。
  D-01另卡先做前提复核/设计；本卡完成不扩张为其他缺陷实现授权。

## 下一位 Agent 提示词

无下一位 Agent 提示词，本卡已完成收口。下方提示均为历史，不再转发。

### 给 Codex（历史：汇总核定 done，技术门已核定）

```text
在 /Users/zhangxu/illegal/type-pal 汇总 EDITOR-LEAVE-GUARD-1 收口，任务卡 docs/ops/archive/tasks/done/EDITOR-LEAVE-GUARD-1-unsaved-project-changes.md，review/r1，终审候选 10c84238（候选后 packages 零漂移）；r1 设计不重签。
先同步并检查工作树，读本卡 done 前三席签字与两席终审日志。现状：Codex（实现者自测）、Kimi（独立终审）、GLM（矩阵/覆盖席）三席 accept 均已落盘，无 counter、无返工项、无缺签豁免。
请统一核定 done 准入：核对三席钉同一候选 10c84238，将任务推进 done，同步看板/索引/审计进度（A-07 可标修复）。
收口时保留并转述限制：guard 分支 61/63 两臂留分母、强杀/未提交领域草稿不承诺、R4 综合链（主属性/脚本交替编辑→取消离开→保存→打开另项目→重开原项目核值）待集中执行、全仓 90/85 目标未达；D-01 按队列另卡，不借本收口推进。
不得代签任何一席、不把本收口扩张为其他审计缺陷的整组授权；用户验收按惯例另行进行。
```

### 给 Kimi（历史：与 GLM 并行终审，已完成，r1 / 候选 10c84238）

```text
在 /Users/zhangxu/illegal/type-pal 终审 EDITOR-LEAVE-GUARD-1。
任务卡 docs/ops/archive/tasks/done/EDITOR-LEAVE-GUARD-1-unsaved-project-changes.md，review，产品/测试候选10c84238，对比d46d63fa；r1不重签。
先同步并检查工作树，读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡及 docs/testing/editor-leave-guard.md。
你负责独立代码/架构审查：真实新建/打开/另存回调、双 dirty、同步互斥、请求与修改版本/点击 choice、失败与清理警告、卸载和 beforeunload。
重点复核 ceec744a 的旧 ready 点击误当 discard 两条先红及10c84238修复，重建 choice/revision 负控制；不要读取或复述 GLM 终审结论。
已测81定向、check6918、严格fast6430；原生功能/视觉与准备期失败边界在回执，复用证据，不重跑已有浏览器流程。
直接把 accept 或带 file:line 的 counter 写入你自己的 done 前签字块和终审日志，并提交推送，保留他席改动。
不得改产品/测试/另一席结论/共享准入/Status，不标done，不扩大D-01或A-03范围；生成覆盖基线/文档在候选后另提交，packages须零漂移。
```

### 给 GLM（历史：与 Kimi 并行终审，已完成，r1 / 候选 10c84238）

```text
在 /Users/zhangxu/illegal/type-pal 终审 EDITOR-LEAVE-GUARD-1。
任务卡 docs/ops/archive/tasks/done/EDITOR-LEAVE-GUARD-1-unsaved-project-changes.md，review，产品/测试候选10c84238，对比d46d63fa；r1不重签。
先同步并检查工作树，读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡及 docs/testing/editor-leave-guard.md。
你负责独立矩阵/覆盖审查：逐条核LG-01～10与成功正控，18 guard+27真实App+36既有保存冲突共81项，抽查五组单点业务负控制。
重点核PAL取消、IO AbortError、cleanup warning、export互斥、discardRedo保守失效、真实保存重开和旧ready点击竞态；不要读取或复述Kimi终审结论。
核check6918、严格fast6430/616源码；旧测试身份计数零变化，新45项与3源码入分母，无门槛下调；区分存储替身和原生证据。
不操作浏览器、不判断截图，视觉由Codex已执行。直接把accept或带file:line的counter写入自己的done前签字块/终审日志并提交推送。
不得改产品/测试/另一席结论/共享准入/Status，不标done；同步保留他席修改，生成基线/文档在候选后另提交，packages须零漂移。
```
