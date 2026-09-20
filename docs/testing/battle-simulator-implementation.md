# 战斗模拟器 r2 实施记录

关联[任务卡](../ops/tasks/EDITOR-SKILL-TRIAL-1-isolated-battle.md)与[冻结设计](battle-simulator-r2-design.md)。
Coding Owner：Codex。起点 `af916f5b`，分支 `codex/editor-battle-simulator-r2`。
隔离工作树：`/Users/zhangxu/.codex/worktrees/battle-simulator-r2/type-pal`。

## 当前候选与质量门（2026-09-20）

产品候选 **bd4c67c6**（相对最新主线基点 **1bae48e4**）；r2/r2a范围完成实现，待独立终审，**不是done**。
下方WIP、失败及重测记录按时间保留，不再代表当前准入。

- 完整`pnpm check`：**7891项**通过，日志`/tmp/type-pal-simulator-check-final.log`；47条既有警告/6条信息，无错误。
- 官方ratchet后，`TYPE_PAL_COVERAGE_BASE_REF=1bae48e4 pnpm coverage:fast` **单次严格复跑7400项通过**，
  相对新基线提升0/下降0。日志`/tmp/type-pal-simulator-ratchet-final.log`与`/tmp/type-pal-simulator-strict.log`。
  生产范围631文件；editor250测试文件/2514项，reforge130文件/1278项。未改选择/排除/超时/门槛。
- `pnpm --filter @type-pal/editor run build`通过，独立宿主拆为11.07KB chunk；保留大chunk警告，不声称发布优化或A8完成。
- S1四对照/四针、运行边界六对照/六针均业务断言红；后者最终证据临时目录`type-pal-simulator-runtime-nc-KfWqQZ`。
- 另补音频第二个后端构造失败时释放第一个上下文，真实宿主回归4项；没有借关闭页面来掩盖部分初始化泄漏。
- `projects/`、`data/`、`packages/migrate/`相对1bae48e4零diff。测试所需忽略资产仅复制到隔离工作树，不进Git。

视觉已验：真实编辑器四目录与空态、命名/引用/删除/跨页undo、长表单滚动、1/3人实战、4人禁入、施法/投掷、
正式胜利奖励、停止/重开/关闭、F5拒绝、图标三态、自适应字段与82px移除按钮、技能多选搜索/计数/Escape。
768/1024/宽屏均检查；360宽受现有编辑器主壳最小列限制，未宣称移动端通过。
**原生目录选择器在自动化中返回取消，浏览器保存→重开正向链未通过**；该部分由S1真实事务/writer/loader集成证明，
不是用mock保存成功替代。独立终审须知此验证边界。剧情观感、全量Q2/Q1、未签新快捷入口仍不在本批完成范围。

普通DEV调试面板仍可直接改当前游戏world（包括授技/补MP）；它不是本卡隔离入口，原存档保证未扩大。
新技能/敌队/敌人按钮只走本卡握手；旧`?skill`在正常boot/SaveStore之前拒绝，不能沿旧URL授技。

### 使用入口

1. 一级菜单“战斗模拟器”→“试打方案”；另外三个目录管理我方、敌方、背包预设。
2. 方案可直接内嵌配置或引用预设，不必先建立四份记录；命名改动使用顶部“保存”。
3. “建立本场临时副本”只改本场，必要时“另存为方案”；其它作者改动仍须先保存再试打。
4. “开始试打”打开同源独立窗口；停止丢弃本场，重新试打从最初配置重建，不延续消耗或奖励。
5. 技能“战斗中试放”、敌队与敌人原试打按钮选择完整方案后明确带入本场对象；缺方案时进入详细配置。

## 历史实施过程（r2a build）

r2a三席已齐，人数阻塞已解除：我方1～3人，第四人拒绝，敌方五槽不动。
当前继续实现/验证，不是review-ready；下方人数阻塞节仅保留历史。

- 配置守卫与界面共用3人上限；定向配置30项、库/保存24项通过。
- 合法自有工程经正式loader校验；实际BattleSession工厂供浏览器宿主与集成测试共用。
  工作流14项、真实施法/投掷/使用与正式结算3项、资源快照/取消5项、内存握手5项通过。
- 6011端口运行实际编辑器+内存自有工程（`node docs/testing/battle-simulator-functional.mjs`），
  不写PAL、不影响主线6010。Codex已目视验证四目录入口/方案页、真实战斗、投掷药品胜利与经验4/金钱3结算，
  重新试打恢复MP20/背包3，停止/关闭可操作；编辑器保存按钮保持disabled。
  F5被拒绝且提示不存档；这仅是功能验证，不代替尚待补齐的所有SaveStore零IO回归。
- 用户截图发现既有战斗图标误用工程色盘：`battle-ui.ts`使用项目0..31作为灰/红色带，
  `seed-assets.ts`同位置是草绿/蓝/褐与黑。正式一阶段`draw-battle-ui.ts:438`三态与本任务目标一致；
  现修chrome自有色带、保持选中原图/灰项/暗红禁用和布局；不修改工程色盘或资产管线。

本轮测试开发时暴露并修正的夹具/预期问题：effectSprite=-1不合法，改实际0号合法三帧资源；
敌人动画分段不连续，改正式连续分段；效果字节以ArrayBuffer交付，不能把Uint8Array当JSON序列化。
正式胜利奖励会恢复缺失MP的一半，现分别观察行动消耗与结算后状态，不把MP18误当胜利最终值。
使用药品用例原低防角色被正式敌人行动击败，改显式合法攻防配置聚焦药品行为，未改变战斗算法。
跨包Node/Vite集成测试放editor/scripts沿用既有宿主惯例，避免Node类型污染生产DOM程序；
不改tsconfig/覆盖率选择或排除。jsdom测试使用Node Blob匹配生产所需stream，不修改产品API。

- 已补开战有效值预览，共用正式角色实例/覆写/装备派生，与真实启动输入比较；不重复实现数值公式。
  初版预览参数误取作者物品类型，而EditorState持运行投影，TC发现后改用实际ItemDataMap，不断言强转。
- 图标回归2项先红后绿，连同BattleSession43项共45项通过；Reforge TC通过。浏览器同一工程未改色盘，
  已恢复灰项和暗红合击；原选中位图/位置不变。实际技能快速入口已验证扣MP20→18、正式结算后MP29，作者仍已保存。
- 握手补重复刷新即时拒绝、同窗新nonce重开保持最初配置、真实工程变化拒绝；用例误写project.json后按实际manifest.json修正。
- 准备页有取消/关闭；读取或授权挂起时取消，迟到成功不启动；真实play入口6项、真实宿主3项通过。
  入口测试只替换load/boot/run边界验证路由；宿主测试仅替换重型浏览器资源准备，实际BattleSession构造与键盘/停止/收尾运行，
  SaveStore构造、indexedDB.open、Storage.setItem均为0。真实行动/资源解码另由前述集成与浏览器证据承担，不夸成无桩全链。
- 临时BGM owner新增幂等dispose，停止/完成时释放AudioContext；迟到初始化/歌曲读取不能播放，2项新增+相邻15项通过。
 普通音乐stop/续播合同不变，不重开initP失败缓存政策。

新增负控首轮发现迟到准入用例只观察readJson，移除第一道active门后状态文件readText已发生、后层门仍挡住readJson，
因此该针漏检；补观察同一source真实readText，不删除后层保护、不改变负控位置。UI测试首跑遗漏已登记的空stamps参数，
正式守卫拒绝，现先核夹具stamps确为空再按生产接口交付；测试button补type后Biome错误清除。

最小功能视觉进一步完成：三人实际自动战斗/三栏与正式结算，第4人禁加；命名我方预设→方案引用→删除列影响方案→
跨页undo恢复；1024/768宽中央scrollWidth等于clientWidth且长表单能到达底部。360宽受现有主壳最小中心列限制裁切，
不宣称移动端通过、不扩大本卡改造整个编辑器主壳。临时副本试打后作者dirty仍false。

正式派生回归补携带状态/毒/装备/合击及debug开关不污染输入；真实BattleSession失败终态只写临时world，
与施法/投掷/药品合计5项通过。4项实际React控件流程覆盖预设CRUD/引用/删除/undo、三人配置及第四人拒绝、
装备/技能/HP比例/MP0与有效值、背包数量清零、技能快速入口失败可重试。不是视觉测试的替代。

两组负控最终通过：S1四对照/四针；runtime六对照/六针，全为钉名AssertionError、产品hash不变。
证据分别为系统临时目录`type-pal-simulator-s1-nc-lxzDIb`与`type-pal-simulator-runtime-nc-I2bEEb`，
可通过仓内脚本重建。后者判据直接拒绝普通Error内嵌AssertionError和超时等环境错误。

仍需统一质量门与剩余保存重开功能复核。
未改官方基线、未合主线、不标done。

### 整体接入与用户布局反馈

首次全仓check失败：editor 9文件49项红，其余已跑包通过。主要是新增四目录/3个UI文件未同步到设计系统
双向清单；路由检查只认旧四kind；新增关闭态alertdialog被旧离开保护用例误选；新界面“工程”不符合
编辑器统一“项目”用词。修复为显式登记31页/109滚动记录/95UI文件、新增模拟器真实路由及目录转发门，
按真实源码重算字段/数字/目录行与CSS轨道，未添加例外或放宽既有断言；临时离开/删除弹窗仅在请求时挂载。
定向135项首复跑只剩两处清单断言：95文件数字与脚本目录测试证据路径，随后按真实路径接入并增加包边界反例。

用户指出移除按钮横跨整行；按既有规范DS-L.7/DS-C.5复用DsInlineComposer，把加入队伍、移除物品、加入当前技能
接到正式同行action槽。配置来源、装备、初始HP/MP、敌方槽位、战场/音乐采用容器自适应结构网格；
数值仍由DsNumberFieldGrid/DsDraftNumberField限宽，未覆写公共按钮尺寸/标签轨。宽屏实测移除按钮82px，原行1636px；
768宽字段自动单列，均由Codex目视检查。使用web-design-guidelines复核label/键盘/焦点/布局；仓库规范优先。

保存原生选择器在当前自动化浏览器中返回AbortError（用户取消合同），没有获得目录句柄、没有落盘。
临时诊断日志已移除；不能把这次尝试算为浏览器保存/重开通过。真实writer/重开/删除/恢复/ZIP仍有S1自动集成证据。
自动化本轮的HMR曾重复createRoot，后续视觉用显式reload干净页，不把热更新残态归因于保存算法。

运行时的4个集成测试文件现归`packages/reforge/scripts`（27项），编辑器握手/入口/UI留`packages/editor/scripts`。
原因是官方覆盖率按包运行，放在editor的runtime调用不能算入reforge基线；只移动未发布的新测试，不改官方选择/排除。

用户随后要求指定习得技能改为勾选多选与外部计数。现复用DsMultiSelect（搜索/checkbox/全选/清空/Escape），
为本场控件选择count摘要；其他调用保留原labels摘要。控件补标准id供DsField标签绑定，继承/指定仍是原合同。
已选但缺失的技能作为可取消项保留，外层诊断继续阻止启动，不静默丢引用；装备授技不混入习得集合。
我方字段的模式/多选也放入自适应列。组件与实际界面均已复验；UI流程增至7项，包含缺引用修复与无命名方案入口。

第二次全仓check通过：7包7887项，47条既有警告/6条信息，无错误。
首次官方ratchet全部7396项测试通过，但editor包四项比例轻微低于原基线（语句78.56/分支70.33/函数76.35/行80.81），
因此**ratchet拒绝写基线**。全局和Reforge提高不能替代editor不下降；补临时三域覆写/条件/无预设入口等真实回归后重测。
当次报告`/tmp/type-pal-simulator-ratchet.log`，未运行受保护strict-fast；不把本次失败写成通过。

## 历史：S2/S3 WIP检查点与人数阻塞（已由r2a解除）

当时**blocked，非review-ready**。发现正式战斗信息栏第4人x=322已经超出320逻辑画布，
1～5人精灵站位不能证明五人完整交互。任务卡记录前提counter及用户二选一：首版限我方3人，或扩展正式战斗界面支持4～5人。
当时用户尚未裁决；该检查点保留原5人配置上限以保存现场，**不是认可该上限可用**，未擅改正式战斗UI。
敌方五个位置不受此反例影响。下面S1状态/接续序列为前日历史，当前以本节与任务卡为准。

已提交共用提取`6a1d4761`：玩家属性/装备/技能派生与战果写回/奖励调用供主壳和临时宿主共用，
当时3文件80项通过、Reforge typecheck通过；完整普通战斗等价/结算测试仍待补，不冒充全量验证。

本次WIP包含：四目录表单/方案与快速入口、临时修改/离开保护、内容引用检查；一次性内存握手/身份与版本复验；
临时world、私有资源快照和真实BattleSession宿主；替换旧技能/敌队/单敌入口并拒绝旧授技URL。
这些是未完成实现，不声称保存→准备→战斗→结算→重开闭环已经通过；没有启动正式浏览器视觉验证。

检查点验证：

- SkillTab/EnemyTab/EnemyTeamTab/editor-navigation四文件69项通过（回调ID与现有UI/引用断言）。
- 两包typecheck通过；首跑因新夹具错误给ThrowSpec写consuming而失败，核当前接口后移除不合法字段再跑通过。
- 改动25文件Biome exit0，只有App中3条既有noUselessFragments信息；format机械调整2文件。
- 新自有工程夹具计划用正式loader守卫，但本轮尚未执行该fixture的真实战斗用例。
  直接Node导入尝试在既有Reforge barrel→main的import.meta.glob处失败；不得据此声明夹具已经合法，后续用Vitest/Vite宿主执行。
- 未运行全仓check/ratchet/strict-fast，官方基线未改；WIP不并主线、不交终审、不标done。

恢复后尚需：实际配置有效值展示/边界测试，握手重复/迟到/换代与正常SaveStore零IO负控，资源准备/取消收尾，
正式行动与写回回归，功能视觉及统一质量门。已发现maxPool装备效果无当前正式消费链，登记Q2待复验，
临时宿主不得另算“理想效果”。待人数裁决并完成受影响前提复核后再推进。

## 2026-09-19：S1 配置与作者保存基础

状态：**部分实现，仍为 build；不是整卡完成、不是可用战斗模拟器**。
未改GLM候选或官方覆盖率基线；尚未运行全仓check/ratchet/strict-fast，留完整首批集成后串行执行。

已落产品：

- Reforge小型配置合同：我方成员、基础属性覆写、装备槽继承/空槽、技能继承/替换、HP/MP满值/绝对值/百分比、
  五个敌方语义槽、背包、战场、三态音乐与金钱/自动/Boss。只解析数据，不另写战斗算法。
  战场ID直接使用 `BattleFieldDef['id']` 的非负安全整数，敌队ID使用 `EnemyTeamDef['id']` 字符串；不把现行数字稳定ID误作数组位置。
- 编辑器四类命名记录、严格当前格式、独立副本解析、引用/内嵌来源及整段显式覆写；空队伍是可编辑草稿，不等于可开战。
  删除被方案引用的预设要求确认精确受影响方案集，保留悬空引用供修复；命令进入现有EditSession，不加新撤销栈。
- `editor/battle-simulator.json`接入本地/开发HTTP打开、toEditorState、序列化、准备写集复验和原作者事务。
  真正不存在与坏JSON/权限错区分；损坏错误不被包成泛泛的canonical内容错，保留具体文件路径与重新打开提示。
- 已打开/复制的可选文件“缺席”也加入字节基线，防止读取后被外部创建却悄悄忽略。配置文件不能与任何内容/资产路径及其大小写别名冲突。
- 首次使用写文件、删空删除文件、重开后首次保存也显式删除；App保存/另存两条实际回调接入删除路径。
  原始克隆逐字节携带附属文件；另存以当前编辑覆盖源副本或执行明确删除；作者ZIP自然携带，恢复目录仍排除。
- 编辑器开发/预览服务对缺席附属文件返回404，权限/目录等错误返回500，不落SPA的200 HTML。普通运行时不读模拟器库。

## 证据与边界

新增67项：Reforge配置29；编辑器库/命令11、真实持久化13、实际App撤销保存1、服务路由12、真实HTTP1。
新增夹具使用正式 `buildBlankProject` 工程；库夹具的空敌队是合法**编辑草稿**，没有宣称已经可开战。
存储集成只替换浏览器FSA/IDB/picker边界；loader、事务、恢复、身份/锁、克隆、ZIP、序列化均执行生产代码。

定向与相邻：13文件243项通过；Reforge配置29项通过；服务路由与真实HTTP共37项通过。
完整fast测试选择（复用 `scripts/coverage/config.mjs` 的 `testSelection`，**不启用覆盖率/不写基线**）：
editor 225文件/2397项，reforge 117文件/1219项，全绿。两包typecheck另跑；仅本卡改动文件执行Biome。

负控制：[可重建脚本](battle-simulator-s1-mutants.mjs)，运行 `node docs/testing/battle-simulator-s1-mutants.mjs`。
四正控全绿、四个单点坏实现由精确新测试标题产生AssertionError；原产品文件SHA-256前后相同。

| 控制点 | 唯一变更 | 真正被钉的业务失败 |
|---|---|---|
| open | open-local不加载库 | 正式重开丢失已提交配置 |
| preflight | 移除附属JSON早期校验 | 无效输入进入journal准备，非零凭据 |
| absence | 不记录读取时的文件缺席 | 外部创建后finish错误成功 |
| delete-after-open | 只移除App save的删除路径，保留save-as | 删空→保存→重开仍残留配置 |

逐项失败记录（不省略返修过程）：

- 扩大相邻测试首跑8红：1项原census仅列输出文件、不含新缺席见证；7项AST调用链环境未注入新实际函数。
  更新精确census、注入真实函数，原业务断言未删除；新增真实App删空/撤销/重开用例。复跑37/37通过。
- 新命名记录更新函数初版参数只写 `{id}` 导致新测试对象字面量typecheck拒绝；收紧到真正 `TrialPreset<unknown>` 后通过。
- 负控首跑停在absence：Vitest `.rejects` 对错误resolve报告为普通Error，而非本脚本要求的AssertionError。
  改成观察该次Promise结果，明确断言真实 `AuthorSaveConflictError` 与对应path；不放松反控判据。随后四针全红。
- 真实HTTP测试初放src内，`import vite`把Node类型传入编辑器DOM-only程序，触发5条旧ts-expect-error变为unused。
  该Node宿主测试移到 `packages/editor/scripts/*.test.mjs`，仍纳入原Vitest/fast选择，不改生产tsconfig、不删旧断言、不加排除。
- 初版配置实现把战场ID当字符串，核 `content/enemy.ts:119` 与 `validateBattleFields` 后修正为当前数字稳定ID，
  用0作合法正控；未发布此错误形态，也未引入兼容分支。

本轮没有正式界面或真实战斗可验；此前草图的布局检查不充当本批产品视觉证据。

## 接续工作（不重签设计）

1. S1剩余：按目录/记录/字段定位的内容引用诊断与启动前合法性校验；接入四目录UI后验证真实跨页历史。
2. S2：复用正式玩家派生，独立临时world、握手和BattleSession宿主、零正常存档IO、资源/取消/结果链。
3. S3：完整配置界面、技能/敌队/单敌原入口替换，本场调整差异可见；视觉仅Codex执行。
4. S4：实际1～3人/技能/配装/道具行为、隔离负控、功能视觉，最终全仓check→ratchet→受保护strict-fast，再给两席终审。

无下一位Agent提示词；当前由Codex继续实现，不交终审、不标done。
