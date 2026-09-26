# 全仓架构债与分批治理

基点：09429b6c，2026-09-24。首轮静态盘点，不是全仓语义审计完成证明。
用户已要求推进；第一阶段同样允许功能不漂移的代码优化，也必须检查实现缺陷。
2026-09-24 用户曾授权“架构治理全部由 Codex 独立推进”；A1/A2及已完成A3分段按当时授权保留历史事实。
**2026-09-25 用户更新分工**：Codex继续掌握高风险状态所有权、时序、第一阶段机制与迁移；边界清楚的
中低风险拆分可交GLM/Grok/Cursor实施，Codex独立复核、集成与收口。固定三贤人签字仍暂停，贡献者自测
不充当独立审查。新授权只在具体任务卡列白名单并核准后生效，不把整条队列同时开放build；任何可见行为、
玩法、schema/save/UI形态变更仍需单独裁决。当前分工见下方“并行所有权”。

## 判断依据

2026-09-26最新执行：用户要求Codex连续完成剩余治理，并明确让Cursor承担大量并行任务。
[连续收口卡](../tasks/ARCH-CONTINUATION-1-remaining-queue.md)维护本轮11项（D1/E2/F2已完成，剩余8项）；
[Cursor24组卡](../archive/tasks/done/ARCH-F2-CURSOR-BATCH-1-domain-modules.md)及[剩余九组验收](../../testing/cursor-commands-wave2-integration.md)已完成，F2委派所有权全部释放。
Codex负责其余高风险实现和全部独立接收；执行仍按单一状态边界串行验证，不改变玩法/格式/UI合同。

不以行数单独判债。重点是：职责是否跨域、状态归谁、谁负责取消/释放、依赖是否反向、
能否在不启动整个应用的情况下测试一个领域。禁止只搬文件后让每个模块继续接收完整RuntimeContext。

首轮排除测试/fixture/declaration/generated输出，对630个src TS/TSX文件解析静态运行时import/export，
不含type-only；另盘点scripts/MTS/MJS。未发现可解析静态跨包环或editor/core→ui反向边；
动态import、运行期回调互引和包exports全部变体未据此获证。

## 治理队列

行号/规模为上述基点，不作为永久行数门槛；每批开工重新核对调用者与所有权。

| 队列 | 证据与问题 | 拆分方向 | 验证边界 |
|---|---|---|---|
| A1 Reforge菜单/物品宿主（已done） | 09429基点main.ts:5293、:5368、:6384，菜单态/物品异步执行混入6696行bootGame | dbe55b55已移出15状态，main7153→6798；MenuSession/ItemUseSession拥有控制状态，窄端口接线 | 28新增、155序列3798步等价、10针、check8440/strict7949通过；A2已另行完成，A3分段推进 |
| A2 Reforge战斗宿主（[r1 done](../archive/tasks/done/ARCH-REFORGE-BATTLE-1-host-lifecycle.md)） | 7f3840e6 main.ts:2149–2505，资源准备、会话、结算、战后脚本由大闭包调度 | 46287966 BattleHost/准备单元已落；main6798→6486；独立所有权，不改核心 | 23新增/11针/check8463/strict7972/637与真实功能验证通过；自审两处时序补正已闭 |
| A3 Reforge世界/帧循环（[首段done](../archive/tasks/done/ARCH-REFORGE-FRAME-1-clock-and-input.md)、[资源预检段done](../../testing/scene-preparation-refactor.md)、[活动场景/镜头段accept](../../testing/active-scene-refactor.md)、[移动/绘制候选](../../testing/world-runtime-refactor.md)） | 原大闭包同时拥有场景资源、镜头、移动、绘制；各分段以冻结SHA重定位 | 7be10bf4候选已迁WorldMotionRuntime/WorldScenePresentation；main6486→6427→6260→6148→5698；统一门/集成后正式完成 | 20新增/九针、Reforge1642、TC/build与6053隔离功能通过；全仓check/ratchet/strict待原接收对话，未提前标done |
| B1 编辑器App | App.tsx共5170行；App:360单组件3345行，含导航/保存/历史/试打/场景选择 | 工程会话协调、导航、场景工作区、试打生命周期分别归属 | undo顺序、保存/恢复、离开保护原门禁；最小功能视觉 |
| B2 地图工作区 | MapMode.tsx:251单组件3569行 | 工具手势会话、选择/剪贴板、组合模板操作与视图拆分 | 操作提交原子性、取消与重放、地图权限原断言；不改格式 |
| B3 脚本/内容表单 | ScriptEditor.tsx:1710单表单913行；CommandForm.tsx:257单组件1842行 | 按命令族分表单；收敛作者/通用命令桥接类型，不靠强转掩盖边界 | canonical合同与引用保护，不能以“清理”删除仍有真实调用的领域能力 |
| C1 战斗会话 | BattleSession:217单类2806行/134成员，tick:1191为488行 | 选择输入、动作/演出调度、资源屏障、结算呈现各有所有者 | 不拆坏状态推进顺序；先锁实际会话结果，不重写公式 |
| D1 第一阶段依赖环（[已完成](../../testing/phase1-dependency-refactor.md)） | 原7文件运行时SCC | d488f72e将脚本目录/背包/毒/装备状态/地图身份/菜单栈下沉，静态运行期环清零 | 161函数体/旧出口保持、8新增/三针、PAL全包与最小功能验证；check8678/strict8186/654 |
| D2 第一阶段大主控 | event-system5784行/applyRawOpcode1459行；battle-system3749行；bootstrap1946行 | opcode处理族、运行资源生命周期、启动装配分开 | 真实PAL数据/现有机制回归；结构优化与缺陷修复分提交 |
| E1 迁移转换 | migrate-content3314行/mapScenesStatic808行；translate-events2472行/walkBody1184行 | 按人物/技能/物品/场景映射及控制流处理阶段拆分 | 生成结果对比、事务写保护、幂等；不得顺手改生成产物 |
| E2 内容校验边界（[已完成](../../testing/content-validation-refactor.md)） | 原author-script-core ↔ enemy-script 双向依赖 | 4cdefcf1拆协议/形状/AI/演出，50函数体保持、运行期环清零 | ebef3d5a单独修嵌套cue漏options；13项先红后绿，和D1统一门禁；非“有环即有bug” |
| F1 工具维护 | design-system-audit.mjs6337行/reachableJsxOwners935行 | AST事实、CSS推导、规则、报告分层 | 旧违规样本/反例判据不变；不为加速删规则 |
| F2 组织性整理（已完成） | 原盘点commands4475/controls2589，按战场/控件/领域命令分批落位 | commands最终179行、controls35行稳定barrel；剩余九组90声明与119出口/62绑定保持，无新运行期环 | [2022acc3最终验收](../../testing/cursor-commands-wave2-integration.md)：check8740/strict8248/701、五针和隔离UI通过；纯搬移无覆盖metrics增长 |

### 并行所有权（2026-09-26 更新）

| Owner | 可推进的窄批 | 明确不碰 |
|---|---|---|
| Codex | A3候选待统一集成；续推B1/B2、C1、D2、E1、F1 的关键所有权与语义裁决；全仓质量门及集成 | 不借纯重构夹带新玩法或迁移生成物手改 |
| GLM | 前批已done；[六组同步守卫补测](../tasks/TEST-GLM-CONTENT-GUARDS-2-leaf-boundaries.md)窄返工R1–R4 | 只改content白名单新测试，生产零改，不接视觉/时序混合包；未接收不计官方统计 |
| Grok | [F2 溢出文本组件搬迁](../archive/tasks/done/ARCH-F2-DS-OVERFLOW-1.md)已按窄切片 done，仅 `DsOverflowText`；下个中风险批另卡核准 | 其它控件、CSS/交互重设计、A3及战斗引擎 |
| Cursor | [九组剩余命令拆分](../archive/tasks/done/ARCH-F2-CURSOR-BATCH-2-remaining-commands.md)已独立accept/done，F2完成 | 本次Owner范围已释放；新工作另卡，不重做已关闭项 |

四位Owner工作树/主文件互不重叠。后续若需要同一文件，按前批Codex接收后再开下一批；没有“两个Agent同时改一个宿主文件”的并行授权。

第一阶段SCC成员：event-system、scene-system、equip-effect、battle-opcodes、menu-driver、menu-mode、magic-script。
这是静态依赖证据，不是七个已确认bug。需要优化时仍直接核源码，不从“有环”推导故障或机制变更。

### A1验证中新发现的独立待办

- DEMO-CURRENT-1：`projects/demo/content/maps/map-056.json:2`仍为地图version2；当前正式guard仅支持4，
  `dev`默认demo启动即拒绝。09429b6c已有、A1零改此文件；先查demo生成/维护真源，再重建当前数据，不加旧版兼容。
  尚未归因为迁移器缺陷，不借A1关闭。
- s135的调试直达落点在黑区：本轮仅观察到`?scene=s135`，尚未与正常门/脚本入口对照，
  不扩大为所有默认落点故障，也不以菜单验证宣布落点问题已解决；跟既有落点规则议题核对后归属。

## 批次与风险纪律

1. 首批A1[任务卡](../archive/tasks/done/ARCH-REFORGE-MENU-1-session-controller.md)已按本批用户单席豁免完成；
   [回执](../../testing/menu-session-refactor.md)保留模式与证据；后续卡按上述用户新的全队列独立授权推进。
2. 上述队列不是全仓同时build授权；一批只改变一个主要状态所有权边界，Coding Owner唯一。
3. 无行为变化的重构与实际bug修复分别提交。发现原测试把缺陷当合同，先做直接反证，不盲目保留或直接改预期。
4. 不重写schema/SAVE8/content20，不改公式/原版玩法，不以重构夹带新UI。需要改变这些时另开相应卡。
5. 开发过程只跑定向/相邻/TC，整批末check→官方ratchet→受保护单次strict；源码移动须核旧范围没有遗漏。
   不能靠减少分母或新模块未纳入统计提高百分比；不要求为一个机械移动重复执行整仓coverage。
6. 第一阶段确认本项目bug须有原版数据/参考实现/调用域证据；不能拿“功能不漂移”作为不修bug的理由。
7. 功能界面按需做最小浏览器验收；剧情视觉仍集中E2E，既有R4/N6b/Q1/Q2与其它缺陷台账不借此关闭。
8. 纯拆分新增的`await`也是可观察时序边界：不得提前冻结可变world输入，或把释放会话和写回拆到不同微任务。
   A2曾据此自审返工（见[回执](../../testing/battle-host-refactor.md)）；后续批次先列出同步提交区与采样时点，
   再跑整批门禁，不等统计通过后才补原子性审查。模块间传递“准备产物”不等于已经提交世界快照。

## 成功标准

- 每个新模块有明确状态所有者、受限依赖和关闭/取消入口；不重建万能上下文或新的千行宿主。
- main/App只逐步保留装配、路由和生命周期协调；拆分单元可直接独立测试，但端到端宿主回归仍保留。
- 行为不变用状态/副作用/输入归属/错误/取消证据证明，不只看TypeScript通过或行数变少。
- 全仓最终覆盖目标仍保持；架构治理与补测结合推进，不等覆盖率达到90%才开始。
