# GLM十二组架构回归实验包 r1

任务：[ARCH-REGRESSION-LAB-GLM-1](../../ops/tasks/ARCH-REGRESSION-LAB-GLM-1-twelve-packs.md)，状态draft。
生产冻结**86e928b5**；独立worktree建议`/Users/zhangxu/illegal/type-pal-glm-regression-lab`，
分支`codex/glm-architecture-regression-lab-r1`。从包含本工作包的Codex交付提交起步，记录完整SHA。

## 交付定位

产物以**可执行断言、可复现失败、真实功能操作**为主；已有测试够用则复用，不重复编例。
8组候选回归和4组功能视觉可连续完成，不每组等Codex签收；各组独立提交，整包统一交回。
不设“至少多少条测试/多少个bug”的指标。候选未转正前，不计入官方测试总数和覆盖率提升。

本目录是隔离实验区：默认七包test/coverage不把它作为用例收集或生产覆盖范围；根lint/文档门仍会检查这些文件。
这里允许真实候选test.ts/tsx和显式运行config，
但不允许修改官方runner/选择/超时/阈值来接入；Codex接收后再按语义不变的路径适配转为正式回归。
这让本包可以立即在draft准备阶段开展，不预支产品build授权。

## 0. 先做一次启动校验

1. 读根AGENTS/CLAUDE、phase2 READ-FIRST、任务卡、[旧包接收记录](../../ops/tasks/ARCH-SUPPORT-GLM-1-eight-audit-packages.md)。
   旧包报告是检索线索，已列风险不是已证缺陷；遇到原文与源码不同以本轮一手证据纠正，不复述错误。
2. 新worktree不切main、不复用旧取证分支叠实现；核目标生产文件与86e928b5零diff。
   指定分支/路径若已存在，先核归属和未提交改动，不覆盖、不force重建。
   允许`pnpm install --frozen-lockfile`，禁止修改lockfile。`@type-pal/*`必须解析到本工作树，复用pnpm store不等于复用main源码。
3. 先建立本目录内的显式配置及typed fixture；正常配置只收集`candidates/**`，故意业务红放`diagnostics/**`单独运行。
   配置复用当前包的必要JSX/环境/解析合同，不改仓库配置；依赖库用现有安装，不另装版本。
4. 跑通一个真实正控与一个单点破坏后的业务红小样，再连续完成全部组。不依靠源码字符串测试替代业务执行。
5. 自有工程从`packages/editor/src/core/seed.ts:71 buildBlankProject`或已经验证的现行fixture构造，
   走正式loader/相应guard。原始一阶段数据/迁移中间态按真实调用域校验，不硬塞进不适用的canonical guard。

## 1. 八组候选回归

下表是**验证轴**，不是宣称当前都缺覆盖。每个轴先读既有断言；相同业务、同层级、同输入轴已有证据则登记
existing-proof并跳过，不将原测试换名复制。优先产出拆分前最需要的生命周期、失败与状态保真断言。

| 组 | 真实目标与本次验证轴 | 先去重的证据 | 候选文件 |
|---|---|---|---|
| G01 地图手势终结 | MapMode的选择拖动、笔划、平移；分别用真实pointercancel/lostcapture/blur结束，随后迟到move/up不再提交；正常up为同输入正控 | `ui/MapMode.tsx:2292–2310/3075–3079`、MapMode.test.tsx72项、PanelResizeHandle-interaction仅作宿主capture替身参考，不冒充MapMode合同 | `candidates/editor/g01-map-gesture.test.tsx` |
| G02 地图会话失效 | 正在进行手势时换map/换同ID新EditSession、外部undo/redo或对象失效；旧手势不能提交到新会话；当前选择/clipboard/dirty/历史按真实既定语义核对 | MapMode.test.tsx的1507/1579/1611/2000等已测普通切换；本组必须证明差异在**活跃手势与迟到事件**，不是重复普通切页 | `candidates/editor/g02-map-scope.test.tsx` |
| G03 App所有权生命周期 | 真实App挂载/更换session/卸载；derivedStore旧worker终止、旧事件不污染新页，已打开临时试玩窗口关闭；绑定监听/媒体preview按实际owner收尾。start返回stop已知存在，不能再报缺实现 | App.tsx:382–426/491；editor-derived-store.test.ts22、App.leave-guard及App.reference-navigation；测试真实App接线，不只再测store.stop | `candidates/editor/g03-app-lifecycle.test.tsx` |
| G04 脚本编辑草稿 | 真实CanonicalScriptBodyEditor/当前会话：编辑或插入弹窗尚未提交时外部撤销/redo、同路径换命令、切上下文；旧草稿不改新对象；取消零命令，合法确认一笔，undo/redo保真 | ScriptEditor.test.tsx24、CommandForm.current-characterization13、script-editor.hooks-session3；已有排序/默认hook三轴不复制 | `candidates/editor/g04-script-draft.test.tsx` |
| G05 预览停止与换源 | SceneScriptWorkspace→真实Playback：播放中换scene/entity/hook/channel、stop与unmount；旧播放不得推进新源；重新播放从当前源起，声音/定时/通知按公开合同清理 | SceneScriptWorkspace.tsx:177–194、core/playback.ts:105/216/575及playback.test.ts；SceneScriptWorkspace5项主要证范围/owner定位，不据此推断播放中生命周期已证 | `candidates/editor/g05-playback-scope.test.tsx` |
| G06 跨校验器递归 | author→enemy choreography及enemy→author调用：合法非空嵌套正控；七个递归入口的代表组合，非法叶错误path正确且实际输入前后深等；不发明深度上限或新拒绝政策 | content/author-script-core.ts:600/661/663/669/708/710/722/726；enemy-script.ts:359/598；两族test/boundaries/wave2已有矩阵 | `candidates/content/g06-validation-crosscalls.test.ts` |
| G07 第一阶段模块边界 | 真实公开调用的跨模块顺序：scene更新当前map后事件读取、装备脚本经event表执行、battle opcode消费装备派生值；两独立GameState/连续会话不被测试全局态串扰。断言既有已核行为，不改变角色索引/公式 | game/core/event-system、scene-system、equip-effect、battle/battle-opcodes及对应702收集；phase1工程笔记§3.1、相关机制资料/原始输入。已有单模块例不能冒充跨caller；有足够跨caller则复用 | `candidates/game/g07-core-boundaries.test.ts` |
| G08 迁移转换边界 | mapScenesStatic六参数、translateActivationBlock等现行公开入口：小型合法非空source，重复调用输出稳定、输入深保真、globalRoots/options/sound映射各有真实差异见证；异常路径不污染下次调用 | migrate-content.test.ts、translate-events.test.ts及wave2夹具；只调用内存函数，不import有写盘副作用的CLI。回调不structuredClone，纯数据快照与回调轨迹分开 | `candidates/migrate/g08-conversion-isolation.test.ts` |

### 候选断言纪律

- 每个故障/取消案例有同输入成功对照；必须证明请求/手势真正entered，不能挂在目标阶段之前就取消。
- 状态断言落在实际业务对象：真实session的state/undo/redo/version/dirty、实际回调参数、实际IO轨迹。
  不只数mock调用、不与自己返回的同引用作比较；调用前structuredClone可克隆的实际输入，调用后立即比较。
- 允许宿主替身：Canvas/PointerCapture/Worker/文件读取/音频设备/窗口等边界；不mock被测store、命令、
  协调器、validator、Playback或历史栈来决定结果。不读私有栈/反射私有字段，不用`as unknown as`掩盖非法核心数据。
- promise/gate在finally中放行并消费**原pending**，finally不放遮盖原错误的断言；不以超时作为负控红因。
- 每组挑1～2个关键新增断言做隔离单点反控；若不能形成单点鉴别力或被后层拦住，如实记overlapping-protection，
  不删除多层守卫硬造放行。反控只能在临时加载视图或自有/tmp副本改变产品，源文件hash必须不变。
- 对照exit0；有效负控必须恰exit1、指定file/fullName实际执行、候选AssertionError、注入见证命中。
  普通Error、TypeError、超时、加载失败、0执行/错标题均记invalid。不要复制旧弱判据，优先复用现有严格工具的判定纪律。
- 发现真实产品缺陷：保留原预期与失败用例到diagnostics的显式入口，记reproduced-defect并交Codex；
  不skip/test.fails、不改预期迁就、不顺手修产品。合同尚不明确则pending-contract，不把当前行为固化成正确。

## 2. 四组功能视觉

先读`docs/phase2/specs/editor-design-system.md`、模拟器/物品已done实现回执及
`editor-functional-visual-2026-09-22.md`。只做dev-functional，不跑PAL剧情E2E/全Q1/Q2，不重开360旧披露边界。

| 组 | 实际操作任务 | 必需证据与范围 |
|---|---|---|
| V01 表单键盘与草稿 | 用自有合法工程，角色/物品/技能/敌队/战场/模拟器各选代表表单；Tab/方向键/Enter/Esc，搜索后选中/取消、字段Enter与blur不重复提交、关闭后归焦、undo恢复 | 明确实际对象、字段、操作前后值/计数/焦点；截图只证明所见区域。既有多选即时提交合同不重开，不把placeholder当accessible name |
| V02 工作区与分隔条 | 1280/900/720 CSS px下场景/地图/非空脚本工作区；实际拖分隔条、键盘调整/Home、隐藏恢复、内容滚动；浏览器125%/150%可操作时补测 | 分隔条与Inspector Tab分开；脚本有实际合法命令，空态图不冒充编辑。记录真实CSS viewport/zoom/DPR，不能以CSS缩放或PNG尺寸冒充浏览器缩放；工具做不到记未证并继续 |
| V03 异步与错误恢复 | 只在自有HTTP测试宿主注入一次性读取失败/受控迟到，真实UI打开A→B、失败→重试、关闭/换页；错误可见可操作，旧结果不覆盖新对象，解除故障后恢复 | 正常/失败/恢复三态同输入，entered与完成信号；不改app内部state、不跳守卫。不能把未ready/缺资源截图当产品缺陷，不做原生目录授权或用户项目保存 |
| V04 媒体操作与引用刷新 | 正式组件显示确定合法的小图/精灵/背景；fit/1:1/缩放、切对象、替换自有内存源revision后刷新、长名称与侧栏滚动；选中/预览对象身份一致 | 复用已验证资源/正式编码器生成确定性测试字节，先核catalog bytes/SHA/decoder与实际HTTP正控。不是AI生图；E-03/E-04既有红蓝绿私有缓存证明不重复，本组关注真实页面消费者与操作链 |

### 视觉环境

- 独立6013(editor)/6053(reforge，如确需)；先查监听和进程归属，不抢端口、不停别人服务，不动6010/6051/用户标签。
  旧GLM实例若属于旧工作树，先确认并只清理自己的实例；记录新实例工作树/提交/端口。
- 优先复用`docs/testing/battle-simulator-functional.mjs`的**正式loader+内存文件HTTP宿主模式**，
  但在本目录新建专属host并使用本包端口，不改旧host，不直接运行其固定6011端口。
  fixture可复用`core/__tests__/battle-trial-project.ts`或buildBlankProject，按需要合法扩充非空场景/脚本/数据页。
- 不读写真实用户项目/存档、不清空用户localStorage/IDB、不启动真实保存/导出到用户目录；
  仅在本次沙盒内存做可丢弃编辑。服务端fixture文件源只读，POST/写请求应拒绝；测试状态与来源文件快照分开。
- 第一张验收截图前须完成资源正控。若使用PAL，先证明该次catalog/路径/字节一致；缺资源只写blocked-environment，
  不把“worktree缺资源”当无需证据的万能归因。不修改projects/pal/data生成产物，不运行extract/migrate修环境。
- 截图/录像放`/tmp/type-pal-glm-regression-lab/`或新mktemp专用目录，不进Git。只保留各案例必要的前/后证据，
  记录完整SHA256、实际尺寸、工具/浏览器版本和步骤；禁止假称亲眼看图、脚本注入UI结果或复用他人截图冒充本次。
- 不同设备/zoom无法操作时如实pending，不盲点重试；遇到真正产品问题按V03相同条件对照取最小证据，
  不要求发现固定数量的视觉缺陷，不擅自修改已批准的布局/交互政策。

## 3. 唯一写入白名单与执行资源

**所有新增文件仅在`docs/testing/glm-architecture-regression-lab/**`**：

```text
README.md                       # 只追加实际交付入口，不改Codex范围/授权
results.json                    # 唯一结论/计数账，由运行结果生成
receipt.md                      # 简短人类回执，引用ID，不再手写重复数字表
candidates/{editor,content,game,migrate}/g*.test.{ts,tsx}
fixtures/**                     # typed测试fixture，不能是复制的大段生产实现
configs/**                      # 显式Vitest/类型检查配置，不扩散到仓库配置
tools/**                        # 本包runner/只读校验/隔离变异/独立dev host
diagnostics/**                  # 真实缺陷/待证的显式复现，默认不加入候选绿套件
```

- 根目录、packages/**、scripts/**、旧取证包、正式测试、锁文件、官方baseline/include/exclude/timeout、共享看板和任务卡均只读。
- 每组一提交；同一工作树顺序推进，不跨组同时修改。最后一次push交整包，中途只因真正产品决策/权限问题联系Codex。
- Node按当前项目环境记录，检查子进程去掉NODE_COMPILE_CACHE，不把Node升级/加超时当测试修复。
  候选test默认maxWorkers=2；浏览器、定向测试和反控串行，禁止与官方覆盖率争用。
- 允许本组定向/必要相邻、相关包typecheck、本人目录Biome和文档门；**不跑全仓check、官方ratchet/fast/full**。
  候选TS/TSX须通过适用的独立类型检查，不能只因放在docs就躲开类型错误，不新增ts-nocheck。
- 以冻结testSelection解释fast/full归属；没有跑覆盖率就不报“新增命中多少臂”。G08自包含输入可作为未来fast候选，
  真实PAL输入需要full的案例单列，不能靠排除依赖或改生产统计范围“变fast”。

## 4. 统一交付，不写十二份重复总报告

每个案例一个稳定ID（G01-01/V01-01等），至少字段：

- `pack/id/status`：状态只用`candidate-green / existing-proof / reproduced-defect / pending-contract / blocked-environment`。
  完成一个组不等于所有候选都green；组的小计从实际案例生成。
- `evidenceKind`：`source / test-body / executed / browser`数组；不把静态观察与执行状态混在一个covered词里。
- `contract`：真正预期来源file:line/条款；`sourceKey`引用唯一source registry里的完整path/SHA256。
- `test`：真实file、Vitest完整fullName、JSON结果路径；`command/cwd/exit`必须能照抄，不以grep数声明测试数量。
- `expected/actual`、`positiveControl`、`mutation`（或说明为何不适用/重叠保护）、`cleanup`、`artifacts`、`attribution`。
  screenshot必须绝对路径+完整SHA；借用既有Codex证据必须写归属，不冒充自己执行。

GLM先实现本目录`tools/verify.mjs`，从最终树与运行JSON机械核对：
白名单/产品hash零漂移、唯一ID、group/total合计、真实test fullName及状态、证据文件/hash、命令工作目录、
报告引用ID存在、负控判据拒绝错标题/零执行/普通Error/超时。不要把“打印手填totals”叫复算。

最终只需：12组状态摘要、results.json、所有可执行命令、精确新增候选数/复用数/有效负控数/真实失败数、
未证项和环境失败原日志。**不要把测试数量、负控红数、产品bug数合并成一个成绩。**
JSON最后一次SHA登记后必须再次Biome；避免为填自己的commit hash循环提交，可固定contentCandidate与独立registrationCommit口径。

Codex接收时逐组决定转正或返工，并独立复核；正式集成后才串行check→ratchet→受保护strict，整批统一统计。
GLM贡献须在最终实施审查披露；本卡不授予自验充独立终审、代签或标done权限。

## 实际交付登记（GLM，2026-09-25）

- 起点 `a3ceaf05199fe334bdf5dea8d2b362e34de8679b`（对冻结 86e928b5 packages/scripts 零 diff）；
  分支 `codex/glm-architecture-regression-lab-r1` @ worktree `/Users/zhangxu/illegal/type-pal-glm-regression-lab`。
- 实际文件：[receipt.md](receipt.md)、configs/{candidates,diagnostics}.vitest.mts、fixtures/{editor,migrate}/**、
  candidates/{editor,content,game,migrate}/*.test.*（含 lab-startup 启动小样）、
  diagnostics/lab-startup-red.test.tsx、tools/{red-control,verify}.mjs、results.json、receipt.md。
- 每组一提交；候选绿套件命令、负控 runner、机械对账器见 receipt.md 复算命令节。
- 截图 6 张在 /tmp/type-pal-glm-regression-lab/（不入 Git），用途登记于 results.json artifacts。
- 12 组全部交付：candidate-green 37 / existing-proof 1 / blocked-environment 1。V04 深链覆写已按 Codex 裁定改判为预期中止。
