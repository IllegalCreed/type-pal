# EDITOR-LEAVE-GUARD-1 - 未保存修改的离开保护

Status: draft
Phase: phase2
Capability: ops（审计 A-07 修复，不新增能力格）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: both
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: none
Branch: main
Revision: r1（2026-09-13，设计候选，尚未允许实现）
Evidence Baseline: fa8d4e52

## 当前结论与目标

用户要求继续既定审计修复队列；上一张 A-03 保存中断恢复已经验收、归档，不重开签字。
本卡只承接 A-07：作者有未保存修改时，新建、打开另一个项目或离开页面不能未经确认丢掉当前编辑会话。
取消、保存失败、打开失败均保留当前内容及历史；明确放弃后才允许切换。

本卡先完成前提/设计审查。D-01 撤销顺序随后另卡，未开始实现；不为等待签字擅自扩大上一张卡授权。
用户对 A-03 的免手动复审不自动外推为本卡免签或最终验收。

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
| 原版 / primary source | 原版没有本创作编辑器；产品一手合同要求未保存离开/关闭需阻止或确认。目录选择需要用户激活；unload 只有浏览器确认机制，不能依赖异步保存完成 | [设计规范](../../phase2/specs/editor-design-system.md) DS-I.3，行 919–927；[FSA 草案](https://wicg.github.io/file-system-access/)，§3.1；[HTML BeforeUnloadEvent](https://html.spec.whatwg.org/multipage/nav-history-apis.html#the-beforeunloadevent-interface) |
| 第一阶段 | N/A：第一阶段为游戏运行时，无对应作者项目双会话/目录切换；不套玩家存档或退出游戏 UI | [CLAUDE](../../../CLAUDE.md) 阶段边界；[知识采集](../../phase2/reference/phase1-knowledge-harvest.md) X9 是运行态存档归一化，不是本卡的编辑器离开合同 |
| 当前二阶段 | 已有双 dirty；新建直接回 picker；打开成功直接 onOpened；Root 创建新两 session 并增加 mount 身份；保存自己捕获错误且返回 void，不能 await 完成就认定保存成功 | [App](../../../packages/editor/src/ui/App.tsx) 行 430、2066–2189、2192–2205、2260–2281；[Root](../../../packages/editor/src/main.tsx) 行 158–176、191–202；[pickDir](../../../packages/editor/src/core/open-actions.ts) 行 75–84 |
| 本任务目标 | 当前会话只有 clean、明确放弃本次修改、或成功保存且无更新修改时可被替换；失败/取消保留原会话；确认不跨修改版本复用 | 同一 DS-I.3 合同；本卡 LG-01～LG-10 为待验证目标，不冒称已实现 |

### 替代解释、反证及边界

- 最强替代解释：A-03 已在某一共享入口处理离开，或 Root 有最终 dirty 守卫，故 A-07 已被间接修好。
  本轮重读当前 App→runProj/onBackToPicker→Root 完整域：两处仍直达替换；全 editor 源无 beforeunload。
  A-03 只恢复完整暂存过的保存，不保存尚未点击保存的编辑。
- 何种观察推翻前提：真实“主编辑修改/仅脚本修改→新建或打开”调用已被现行共享守卫拒绝、确认或保留；
  若审查发现该路径，先更正前提，不叠第二道提示。
- runtime/命令分类：dirty 已由 EditSession/ScriptEditSession 正式 dispatch/undo/redo 维护，不是运行态改动；
  [EditSession](../../../packages/editor/src/core/edit-session.ts) 行 173–200、[ScriptEditSession](../../../packages/editor/src/core/script-editor.ts) 行 1321–1340。
- 原版/第一阶段理解：无同类编辑器 UX，按现行设计系统确认框合同；不据 sdlpal 推出任何产品行为。
- 提取/地图/解码：离开入口只需两 session 与回调；不依赖 PAL 数据、地图中心、坏资源或迁移版本。
- audit/test model：原 A-07 是调用链证据，不是假装已经浏览器复现；本轮再次核源码仍成立。
  `saveAs` 期间新命令的替换复验是防护验收边界，未额外计为已实测的新缺陷。

### 用户可见变化

- 是否主动偏离已核产品合同：no；修复 DS-I.3 已要求的保护，不重新设计编辑页面。
- before → after：有未保存修改时新建/打开可直接丢会话 → 先选择取消、放弃或保存；失败留在原项目。
- 代表场景：只修改物品脚本正文、不改主属性，点“项目→打开项目”；仍必须提示，取消后正文及 undo 不变。
- 新提示复用现有 DsDialog/DsButton 短决策形态；下方文字线框为 r1 方案，不引入侧栏/新工作台。
- 用户已要求继续修复；本卡尚待三席设计准入，不把该请求当作代签。

## 上下文锚点

- [AGENTS](../../../AGENTS.md)、[CLAUDE](../../../CLAUDE.md)、[READ-FIRST](../../phase2/READ-FIRST.md)：
  当前 canonical、单 Coding Owner、功能视觉由 Codex 负责；不重开已完成 A-03。
- [A-07 审计](../audits/pre-e2e/README.md#a-07--新建打开缺少未保存内容离开保护)、
  [D-01 相邻问题](../audits/pre-e2e/editor-workflows.md#d-01--跨会话撤销没有统一的时间顺序)、
  [A-03 验收边界](../../testing/editor-save-recovery-closeout.md)。
- [App](../../../packages/editor/src/ui/App.tsx)：行 580–584 同步保存门；1922–1966 快捷键；
  1989 入口失效早退；2166–2174 保存快照/dirty 保护；2207–2235 另存为；2477 编辑区 inert。
- [DsDialog](../../../packages/editor/src/ui/design-system/overlays.tsx) 行 177–237：native modal、焦点归还、Esc；
  [已有放弃草稿框](../../../packages/editor/src/ui/SpriteActionEditorDialog.tsx) 行 407–432；
  [保存进度框](../../../packages/editor/src/ui/ProjectSaveDialog.tsx) 不可用 Esc 伪取消写盘。
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

全部以下为待执行，当前没有计入通过数。测试须执行真实生产调用，不复制判断逻辑当被测物。

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
- Kimi：premise pending；design pending。独立证据 / 可证伪观察：待本人填写。
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
- build 准入结论：blocked（等待本卡 r1 两席；Status 保持 draft，不修改实现文件）。

### 进入 done 前：审查签字

- Codex：pending。
- Kimi：pending。
- GLM：pending。
- counter / 返工：待审。
- 缺签豁免：无。
- done 准入结论：blocked。

## Build / Review / 视觉 / 用户验收

- Build：尚未开始；产品/测试零修改。本轮仅源码复核、规范核验与设计落卡。
- Draft 文档自检：`node --test scripts/docs/*.test.mjs` 20/20；`node scripts/docs/check.mjs`
  411 Markdown / 1,944 local links / 141 tasks / content20 SAVE8，零问题；完整产品 check/覆盖率未重跑（本轮无源码变更）。
- Review：尚未开始，主审 Kimi；GLM 核覆盖/遗漏。没有内部子 Agent 代签。
- 视觉：尚未开始；Owner Codex，dev-functional。新提示为上方文字线框，复用现有短决策形态。
- 用户验收：待实现与三席审查后按用户裁决；不要求用户跑技术命令。
- 资源生成/额度代班：N/A，无资源任务、无缺席代班。

## 交接日志

- 2026-09-13 Codex：同步核 main/origin 为 fa8d4e52、工作树净；确认 A-03 done 后新卡只处理 A-07。
  重新核两条 Root 替换调用、save void/catch 和 FSA 激活要求；登记另存为完成复验/原生卸载边界。
  当前为设计候选，未开始产品修改；Kimi 与 GLM 可并行独立取证、各自落签，不依赖另一席结果。
  同步修正工程生命周期规范残留的“A-03 实施中/未终审”旧状态；只更新事实，不改验收合同。
- Kimi 交接日志：待本人填写。
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

## 下一位 Agent 提示词

### 给 Kimi（与 GLM 并行，r1 / 证据基线 fa8d4e52）

```text
在 /Users/zhangxu/illegal/type-pal 审查 EDITOR-LEAVE-GUARD-1。
任务卡 docs/ops/tasks/EDITOR-LEAVE-GUARD-1-unsaved-project-changes.md，draft，r1，证据基线 fa8d4e52。
先同步分支并检查工作树，读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡及其上下文锚点。
你负责独立前提/架构审查：从 App 新建/打开→Root 重建双会话、save 的实际结果与错误边界读一手源码；
核确认绑定修改版本、保存后继续打开的用户激活、最终 onOpened 复验、另存为新修改保留、beforeunload 边界。
不要读取或复述 GLM 结论。判断范围是否真正停在 A-07，不能顺带重写 D-01 或 A-03 持久化协议。
输出带 file:line 的 premise verified + design agree，或 counter 与最小必改项、可证伪观察。
直接只写你自己的设计签字块和交接日志，提交推送；提交前同步并保留他席修改，竞态自行处理。
不得改产品/测试，不改另一席结论/共享准入/Status，不得开始实现或标 done。视觉由 Codex 后续执行。
```

### 给 GLM（与 Kimi 并行，r1 / 证据基线 fa8d4e52）

```text
在 /Users/zhangxu/illegal/type-pal 审查 EDITOR-LEAVE-GUARD-1。
任务卡 docs/ops/tasks/EDITOR-LEAVE-GUARD-1-unsaved-project-changes.md，draft，r1，证据基线 fa8d4e52。
先同步分支并检查工作树，读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡及其上下文锚点。
你负责独立前提/测试矩阵审查：直接核双 session dirty、全部替换回调、取消/失败/保存后新增修改、
busy 与 beforeunload 的边界，逐条核 LG-01～10 是否可证伪、有成功正控、没有用源码字符串或桩行为代替产品断言。
重点检查原生选夹必须新点击、save 返回 void 的失败误判、另存为与普通打开不可混称“零 IO”、仅 hydrate 不误拦。
不要读取或复述 Kimi 结论；不做浏览器操作、截图或视觉验收，不新增测试或实现。
输出带 file:line 的 premise verified + design agree，或 counter 与最小补项、可证伪观察。
直接只写你自己的设计签字块和交接日志并提交推送；提交前同步保留他席修改，竞态自行处理。
不得改另一席结论/共享准入/Status，不得开始实现或标 done。
```
