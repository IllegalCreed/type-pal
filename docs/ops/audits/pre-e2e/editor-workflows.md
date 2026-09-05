# D批 · 编辑器工作流审计

基线：`50ed0f0f`，产品代码与A–C批一致。Owner：Codex，内部并行只读取证，非Kimi/GLM签字。
性质：审计报告，**不是实现任务卡，也不是编辑器综合E2E验收**。未改产品代码、正式测试、工程或存档。

## 本轮结论与范围

确认5项：4个功能缺陷家族、1个试玩隔离/告知承诺缺口。D-01两种历史错序、D-02三种引用漏边不重复计数。
不是全编辑器逐控件审美检查，也不为已验收页面重开签字。A批保存问题继续复用，不重新计入本批。

| ID | 级别 | 确认内容 | 后续优先级 |
|---|---|---|---|
| D-01 | P2 | 全局撤销走错栈并拆开配对动作，错误半状态仍可通过序列化 | 编辑器历史/作者数据一致性，综合工作流E2E前处理 |
| D-02 | P2 | 部分场景依赖未进入删除守卫，允许删后又被保存校验拒绝 | 引用图补边与删除→撤销→保存回归 |
| D-03 | P2 | 快速切换上传图片，迟到旧解码覆盖最新选择并入库 | 精灵导入/异步草稿工作流 |
| D-04 | P2 | 技能试放写死PAL场景/敌队；新工程无该敌队时返回桩胜，没试放 | 自有工程技能试玩可信度 |
| D-05 | P2，条件性 | 试放承诺“不改存档”，但随后主动保存会写入临时授技和999真气上限 | 试玩隔离/告知合同需选定；不把用户主动保存视为违规 |

主要覆盖：主/脚本两会话与全局撤销重做、成对命令、作者数据合并/序列化、统一引用图与冷删除守卫、
场景/商店生命周期调用、地图/组合库/精灵动作草稿边界、上传向导、同源试玩身份及技能试放接线。
阅读当前`READ-FIRST`、相关ED-3/生命周期与组件代码；第一阶段无对应创作编辑器，不强行对齐旧引擎内部结构。

## D-01 · 跨会话撤销没有统一的时间顺序

- `App.tsx:1576-1593`只有一个`historyOwnerRef`记录最近通知来自main还是script；undo/redo自身同样发通知。
  `:1610-1620`先尝试配对，否则优先撤该owner栈，不能判断两个栈顶哪个动作真正较新。
  `editor-history-coordinator.ts:38-45`只有配对两半同时在各自栈顶时才处理，返回false不能阻止App单独撤一半。
- 真实UI对应入口：`ItemTab.tsx:1152`创建私有脚本（两会话配对），`:1539`改买价（main），`:975`改正文（script）。
  探针取真实`buildBlankProject→内存FileSource→loadCurrentProjectFrom→toEditorState`，
  使用真实两Session、Command、Coordinator；App两个history订阅与undo/redo回调由AST原样执行，导航回调为空桩。
- 配对反例：P创建私有脚本→M买价0改10→S正文改`wait(1)`→Undo1正确撤S；
  Undo2**应该撤M**，实际script栈撤掉P的canonical半边：买价仍10、main仍有1个脚本引用、canonical脚本已为0。
  此时`script-editor-projection.ts:107-116`发现私有正文缺席便跳过，真实
  `merge→serializeProjectWithMapCopies`成功输出物品`use.effects=[]`，没有保存错误拦截。
- 普通交错控制：已有脚本→main买价10→script正文wait1→main买价20；
  Undo1回买价10正确，Undo2却回买价0、正文仍wait1。说明不仅是某个配对Command出错，是全局历史顺序家族。
- 正向/恢复控制：只有P时，原App undo/redo会同时清除/恢复两侧，序列化成功；
  配对反例发生后立即一次redo能恢复canonical记录（正文为Undo1之后的空正文）。
  **不是永久丢失**，也不声称Undo1已被用户撤销的wait指令本应恢复。
  已复现移除的是Undo1后已空的私有脚本记录，尚未证明未被用户撤销的非空正文丢失，故按P2而非P1登记。
- 边界：无浏览器键盘事件/FSA写盘；没有把所有场景/其他配对命令逐一实测。
  已证实的是错误状态可被保存文件集接受，并非用户磁盘上已经丢了脚本。
- 修复方向：全局历史应表达真正的操作顺序与事务身份，undo/redo自身通知不能充当新作者动作；
  成对操作必须整体撤销/重做，不能让fallback分发拆开；合并缺失作者正文也需要明确失败策略。
- E2E：主属性与脚本正文交替编辑→连续撤销/重做→保存重开；覆盖配对动作、普通动作、另开新编辑清redo。

## D-02 · 引用图遗漏部分场景依赖

- `project-reference-adapters.ts:215-232`命令目标adapter白名单不包含`selectSceneHooks`；
  `script-editor.ts:916-925`另一路只为`selection.kind=use`添加具体hook边，因此纯disabled/inherit不产生场景边。
  content的typed collector其实已经支持该场景依赖（`content/src/command-target-reference.ts:156-163`）。
- `project-reference-adapters.ts:1846`只把commandVisits交给目标adapter；transitionVisits虽然交给actor/item等，
  却未进入场景目标收集，因此`stateMachine.next.branch.cond.currentScene`也漏。
- 三个反例（disabled、inherit、transition currentScene）均：基线通过现有序列化校验→冷引用图blockers=0→
  真实Coordinator配对`DeleteSceneDefinitionCommand+DeleteSceneCommand`成功删target→
  再序列化报“场景 target 不在 scenes”。App删除路径确实调用这对命令（`App.tsx:1759`），不是绕过冷检查。
- 对照：`use(value=main)`有1个blocker，删除被拒；三个错误分支都能通过coordinator.undo恢复并重新通过序列化。
  **保存防护有效，没有真正删磁盘，不是永久不可恢复**。本批样例是通过保存校验的内存引用工程，不冒称完整可玩包。
- 作者入口允许这些组合：`ScriptEditor.tsx:2531-2561`可选继承/禁用；`:3624`的transition编辑复用
  支持currentScene的条件编辑器（`:1366`）。不是人为构造未支持的脚本语法。
  当前PAL`s172.json:1435`存在对s182禁用onEnter/onTeleport的形状；**未证明s182没有其他阻断引用**，
  因而不能声称现存PAL的s182可直接删除。
- 修复方向：统一引用语义应以typed collector覆盖所有命令与条件拥有者；不能靠某种hook边偶然代替父场景依赖。
- E2E：上述三分支删除前必须可见/可定位并阻断；去掉真实依赖后再删除、撤销、保存重开。

## D-03 · 旧图片解码完成后覆盖新选图

- `SpriteUploadWizard.tsx:145-173`的pickFile在`await createImageBitmap`后直接写draft，没有请求身份检查；
  文件选择器`:271`只在submitting时禁用，图片解码期仍能再次选择。
  [HTML Standard 的createImageBitmap Blob分支](https://html.spec.whatwg.org/multipage/imagebitmap-and-animations.html#dom-createimagebitmap)
  在并行步骤中读取/处理Blob，再排任务完成Promise；据此不能假定多次调用必按选择顺序完成。
- 探针原样执行pickFile/submit及grid/quantized计算回调；仅图片解码、Canvas取像素与React setters为内存边界。
  后续切帧、量化、RLE编码、gzip、SHA、`AddSpriteCommand`、`EditSession`均真实，最后重新解码入库字节。
- 先选A再选B：A为1×1/索引像素100，B为2×1/索引像素200。
  完成顺序A→B时入库宽2/像素200正确；B→A时入库宽1/像素100，实际存了旧A，history增加1。
- ID/label采用`prev || base`保留已有名称是现有策略，不另计命名错误；核心是最后选择B却提交了A的内容。
  submitting锁对提交期重复操作的保护仍在，不将问题扩成“所有上传都无保护”。
- 边界：没有用实际浏览器解码两张大图的现场录像；已复现原回调在合法乱序时的状态结果，
  并验证最终真实资源字节，不声称图片格式解码器本身错误或做了新美术资源制作。
- 修复方向：每次选图持有独立请求身份，只有当前选择可提交结果/错误；关闭或切换向导也明确失效边界。
- 编辑器E2E：快速选A再选B，控制两种完成顺序→预览/入库→保存重开；最后一次选择应始终获胜。

## D-04 · 技能“战斗中试放”仍固定旧工程入口

- `SkillTab.tsx:1120`URL写死`scene=s001&battle=0`，只将project/workspace/skill做参数化。
  新空白工程真实种子只有start场景，未生成敌队0（`core/seed.ts:164-166,222-245`）。
- 真实SkillTab服务端渲染传入自定义project/workspace和合法技能，实际链接仍带s001/0；
  真实`resolveInitialSceneId`把无效s001回退start。**场景回退不是战斗失败的必要原因，敌队0才是关键依赖**。
- 原`main.ts`的startBattleBody函数体（AST读取，仅代入编译期DEV常量，缺队路径未变）收到该链接的battle=0：
  `:2217-2225`发现空敌人列表，toast“敌队缺数据,桩胜(M4c)”后等待400ms并返回`victory`，没有创建BattleSession。
  `:6998-7005`试打调用方只会按结果提示结束，不能证明任何技能真执行过。
- 验证边界：组件SSR不是浏览器点击；函数体只替等待/提示和启动环境，走缺队早退；未完整启动引擎。
  此分支及新工程事实均独立于地图画面/声音资源，不能拿一个href字符串测试通过当试放通过。
  已有技能链接单测甚至将此固定URL当期望（`SkillTab.test.tsx:265`）。
- 反证：有PAL场景/敌队0的工程不因本条失败，workspace参数没有丢，也不是A批跨项目存档键问题。
- 修复方向：根据当前工程选择真实可用的试打对象，缺条件时给出明确可操作反馈；
  不让缺数据返回胜利充当测试成功。具体入口设计另定，不在审计中创建一套新战斗编辑界面。
- E2E：从空白工程建立技能/敌队→保存→试放，必须看到真实战斗并执行目标技能；无敌队不能报告试打成功。

## D-05 · 临时试放“不改存档”的告知与保存行为不一致

- `SkillTab.tsx:1119`title明确写“临时授此技试放（不改存档/项目数据）”；
  `main.ts:6950-6958`也称“不落档”，但直接改活动world的learnedSkills、maxMP和MP。
  试打收尾`:6998-7005`没有撤回临时授予；回到探索后正常F5入口`:6727-6728`仍可达，
  quickSave→doSave→captureCurrentSavePayload会完整保存该world。
- 原授技代码段＋原quickSave/doSave/快照/刷新元数据函数体，配真实builder和MemorySaveStore：
  baseline同项目quick槽的maxMP=0；授技后主动调用quickSave，槽内maxMP/MP=999、learnedSkills含试放技能。
  源种子人物定义maxMP仍0，**项目源JSON没有改变**。
- 限定：**本轮证实的反例由用户随后主动保存触发**，未证实打开链接立即写盘/自动覆盖，
  也未排除后续切场景等自动存档路径保存临时状态；
  本轮没有运行真实战斗收尾与键盘F5事件，接线由源码确认，写槽反例由原保存函数体执行。
  空闲save barrier、缩略图/解码为边界桩，存储仅内存；同projectId案例，不重复A-01跨项目命名空间问题。
- 这是一项已确认的隔离/告知承诺缺口，**不是把用户主动保存视为错误操作**。
  后续需要选择“临时试玩隔离”“禁存”或准确告知可保存试放状态；不得由本审计擅自拍板产品行为。
  独立商店试买已有不boot world、不建SaveStore的隔离路径（`shop-trial.ts:1,63`），未发现同样缺口。
- E2E：选择约定后验证试玩→退出→F5/菜单保存→返回原游戏读档，临时状态和真实进度按明确合同处理。

## 对照、已有问题与未覆盖范围

- A-02/03/07的多窗口旧快照、跨文件部分保存、新建打开无放弃确认仍属A批；不重复计数。
- 本地试玩workspace/project身份不符和句柄丢失已有fail-loud，未发现静默回退PAL的新反例。
  未保存内容只从磁盘试玩的既有合同保持不变，不能把所有“未保存改动没进试玩”当缺陷。
- 演出预览的战斗/音乐等日志桩在Playback合同中已明确，本轮不将预览不能替代引擎E2E当新问题。
  预览停止/取消、动作弹窗scope/baseline与地图会话reset已读；没有足够证据另计对象串写。
- 全部领域Command逐项apply/invert、每个资源类型的全部引用、真实地图手势/焦点/滚动/浏览器交互未穷举。
  未做本批功能界面的浏览器视觉验收；相关补验归后续修复卡的Codex开发期功能检查与编辑器综合E2E，
  不把代码/内存探针冒称像素验收，也不要求用户现在逐条手测。
- 旧调用入口/compat标注及测试是否只验链接/桩返回值归E批继续核对；
  不引入第三阶段X5“试玩前配置全套世界状态”，不借本审计扩大第二阶段范围。

## 可复现证据与测试

四份最终探针均由主Agent独立复跑，断言**当前未修复的输出**，不是正式正确性回归门禁。
修复后应转为正确行为测试并退役旧假设；不为保持审计脚本通过而保留旧产品行为。

```sh
node --import tsx docs/ops/audits/pre-e2e/probe-editor-history.mjs
node --import tsx docs/ops/audits/pre-e2e/probe-editor-reference-delete.mjs
node --import tsx docs/ops/audits/pre-e2e/probe-editor-sprite-upload.mjs
node --import tsx docs/ops/audits/pre-e2e/probe-editor-trial.mjs
```

Vite只用于实际模块转换，最终D批脚本不启HTTP服务，hmr=false且ws=false；拒绝fetch及已有IndexedDB。
初版并发复跑曾出现默认WebSocket端口争用；已查本地Vite代码，hmr=false不等于ws=false，
所以最终脚本显式禁用ws再复跑。此为诊断工具配置修正，不是产品发现。
Vite仍可能使用正常模块缓存，不能宣称整个进程绝对零系统写入。
没有运行迁移、extract、工程写盘、真实Save或发布命令。

现有测试使用`pnpm --filter @type-pal/editor exec vitest run <文件> --no-file-parallelism`：

| 执行方 | 文件 | 结果 |
|---|---|---|
| 主Agent | `src/core/{play-workspace,play-url,load-play-project,playback}.test.ts`、`src/ui/{SkillTab,ShopTab}.test.tsx` | 6 files / 48 tests |
| 内部历史分工 | `src/core/{edit-session,script-editor,editor-history-coordinator}.test.ts` | 3 / 51 |
| 内部引用分工 | `src/core/{project-reference,project-reference-adapters,scene-lifecycle}.test.ts` | 3 / 37 |
| 内部创作分工 | `src/ui/{SpriteUploadWizard,SpriteActionEditorDialog,MapMode,StampLibraryTab}.test.tsx` | 4 / 111 |

共16个独立文件/247条通过。创作分工等价使用包目录下`node ../../node_modules/vitest/vitest.mjs run ...`。
通过的两栈配对单测不代表交错历史整体正确；链接单测、完整字段的引用样例、顺序解码单测也不能替代上述反例。

## 下一步

继续E批：测试可信度、构建发布边界、性能与维护性；随后归并A–E发现，区分薄E2E前置修复、Q2专项和非阻断优化。
本轮不开始修复、不修改已验收能力状态。无下一位外部Agent提示词，继续Codex只读审计，无需追加三签。
