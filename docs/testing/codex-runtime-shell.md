# Codex：真实运行时宿主六组补测

2026-09-23。任务卡：[TEST-RUNTIME-SHELL-COVERAGE-1](../ops/archive/tasks/done/TEST-RUNTIME-SHELL-COVERAGE-1-boot-menu-flows.md)，r1/done，统一候选b6286df0。
实现候选 **1d3d3fb3**（前序542e1c07/cb77adb1），基点4872b017；产品冻结57dda7ed不变。
独立工作树 `/Users/zhangxu/illegal/type-pal-runtime-shell`，分支 `codex/runtime-shell-coverage-r1`。

## 当前结论

六组实现完成，36项/全reforge 152文件1414项、TC、11代码工具文件Biome与**1完整正控+8单点业务负控**通过。
新增6测试+3薄fixture+2工具，不改产品、旧测试、官方配置/排除/超时/基线。633生产文件在每个负控前后hash不变。
**本卡已done**：三席同候选accept齐（Kimi aa436d9f、GLM 326e4906），用户确认后Codex于a13a66f7核定归档。
旧计数虚高已定位到V8两类initializer合并身份冲突，另卡r1三席准入后已正式修补，
详见[统计根因与实施](coverage-initializer-diagnosis.md)。宿主测试文件保持1d3d3fb3逐字节不变，已与修补卡组成
联合验证树e0803d6e→基线候选b6286df0；全仓check8317、官方ratchet7826、保护c5569d1a的单次strict7826/633
均exit0，其它六包基线对象不变。GLM战斗返工未纳入、不借此放行。

## 已实现的真实链

| 组 | 项数 | 非空业务结果 |
|---|---:|---|
| H1 启动 | 9 | 正式loader→真bootGame→首帧；两入口拥有不同队伍/金钱/落点；无效入口回默认；scope/画布/context/旧试放先拒；Chrome资源失败后新owner恢复；真标题选择后进入所选世界 |
| H2 标题/读槽 | 4 | 真runOpeningMenu、真MemorySaveStore；按键选第二入口、空槽不读、跨页读真实meta/thumb，退出后旧键盘/RAF不再动作 |
| H3 菜单 | 7 | 两角色状态页、选择施法人/目标并精确HP/MP变化、无技能角色、MP4拒/MP5同输入成功、显式静音与取消保真、空装备/使用列表回hub |
| H4 对话/脚本 | 8 | top/bottom/narration/center真实作者cue编译，菜单不能穿透；六行分页最后确认后才执行后续命令；gameplay wait与真实二选一yes/no分支 |
| H5 保存 | 5 | 真F5/IDB三store→实际菜单施法→F9恢复；跨工程隔离；空槽提示；NaN坏档拒绝后菜单仍可用、好档恢复；两次保存计数；原IDB读取晚到不覆盖新恢复 |
| H6 场景 | 3 | 真公开跳场景往返，不同落点；真实map IO失败保原世界、修源重试；悬挂原map请求，经新B→A往返后旧结果不得改回B |

输入经过正式loadCurrentProjectFrom及当前guard；资源额外过validateAssetFileClosure（引用错误/字节/摘要均拒），
使用实际encodeSpriteChunk/compressGzip/sha256。H1/H3/H4比较**实际交给bootGame的LoadedCurrentProject纯数据**，
只排除五个IO/cache所有者，不用原始文件表快照冒充实际输入保真。明确mutating的world操作按完整预期变化比较。

没有mock loader/projection/codec/store/runner/菜单状态机，没有AST拷贝或私写闭包。renderer/map函数的spy透明调用原实现，
前者仅记录文本参数，后者只取得**原本那条Promise**作为收口见证。IDB乱序只延迟真实request成功事件交付，
不替换SaveStore；finally放行并消费同一请求。每测试重置模块/DOM/内存IDB并移除自身listeners/RAF/位图。

Canvas adapter只记录调用与提供像素缓冲；字库为有效的最小BDF，PNG样本与仓内num/1.png全字节一致且CRC独立通过。
所有Chrome图像/缩略图在此用合法PNG替身，**不证明真实尺寸布局、缩略图像素或中文像素可见性**。
错误提示只证真实renderSpans收到了对应文本；原SAVE-PREFLIGHT像素回归不被本卡替代。未操作浏览器、未跑剧情/E2E/full/Q1/Q2。

## 反控鉴别力

[工具](codex-runtime-shell-mutants.mjs)默认跑36项完整正控及8针：scope先核、标题键盘所有权、施法派发、对话推进、
保存次数、坏档短提示、场景路由、AsyncIntentController.assertCurrent公共原语。每针源码唯一替换、实际load标记、
仅执行正控中确认过的精确新增标题，必须候选自身AssertionError；混合Error/嵌入AssertionError/timeout/未执行拒绝。
同文件其余用例为名称过滤，不计执行，不在源码skip。

**如实保留一个未通过的探索针**：单删main的sceneSwitchIntent.assertCurrent仍绿，不算成功反控。
`abortScript():5168-5171`同时使world token失效，`:1181`是后层重叠防护。第8针故意打坏两者共用的
AsyncIntentController.assertCurrent单个谓词，实际产出旧B覆盖A的业务AssertionError；不冒称单删任一调用点即红。

## 局部覆盖对照（官方fast口径，不写官方基线）

测量代码点cb77adb1，before 146文件1378项，after 152文件1414项。统计生产路径与四维分母逐文件一致，before四维分子与官方7790基线reforge对象一致。
后续1d3d3fb3只强化H6实际Promise收口/第8针，不为此再重跑全包覆盖；最终候选与GLM并集在统一门禁时重新统计，以下不充当最终覆盖率签字。

| Reforge | before | after | 净增 |
|---|---:|---:|---:|
| 行 | 8759/14599（60.00%） | 10374/14599（71.06%） | +1615 |
| 语句 | 9710/16737 | 11430/16737 | +1720 |
| 函数 | 1542/2539 | 1750/2539 | +208 |
| 分支 | 5913/11359（52.06%） | 6712/11359（59.09%） | +799 |

六直接目标行：main 30→1140/3360、opening 9→82/83、menu-box 62→204/235、save-browser 7→76/77、
magic-box 35→87/87、dialog-box 17→128/148；净增其余依赖单列在[机账](codex-runtime-shell-evidence.json)。
上表**已经扣除**下面script-runner-core的-37行/-42语句/-2函数/-37分支，没有只展示正增量。
main仍有2220遗漏行；未涵盖实体复杂运动/战斗/视频等其它宿主分支、真实图像/中文排版、非空装备/道具全矩阵，
无whole-file95/90或完整E2E达标声明；后续不把本卡完成的36项再领一次。

## STAT-1：旧覆盖计数虚高反例（已定位并另卡修补）

未改的script-runner-core.ts在旧1378套件报195/195行，加入本包报158/195；旧17个core用例前后全部执行且通过，
statementMap/fnMap/branchMap相同。不能只看总包增长就忽略逐文件倒退，也不能马上归咎业务测试丢失。

独立运行见证：原1378用例全部绿；只在`:123`不支持compilerVersion的throw前插入临时文件见证，确认load钩已进入，
但该分支见证文件未产生（**0次进入**）。与此同时旧报告同statement计数为**2**；至少这一条旧计数是虚高。
不是改掉探针/删旧用例/放宽断言得来的结论；产品磁盘字节零改。初次诊断没有判定具体层；后续原生12组与
项目raw对照已定位合并器的同range双initializer身份冲突，37/42/2/37差额全部可由该冲突解释。
详见上方统计修复卡证据，仍**不将此观察自动当成全量统计豁免**。

历史可重建：`node docs/testing/codex-runtime-shell-mutants.mjs --probe-core-coverage`，要求e7c4b743的未打补丁7790冻结树，
顺序运行旧1378/旧+新1414的一文件局部覆盖和旧1378的真实分支见证；JSON输出到独立/tmp，不动官方报告。
现有输出：`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-runtime-shell-mutants-3Dr2qd/core-witness.json`。
其它定位也保留：core-only/core+host/core+shop/core+shop+host都只149/195行，旧全集回到195；简单二分两个半集均不出现
该虚高，不能假定一个单独旧文件是根因。宿主卡不授权依赖改动；正式patch归新统计修复卡，不改宿主测试或生产代码。

## DEV-TOAST-1：不固化的产品观察

开发跳场景链的旧取消请求会经main.ts末尾无条件catch产生“切场景失败: AbortError…”提示，可能覆盖后来的成功反馈。
目前只观察代码与隔离宿主，不裁决为已修/必须改变的产品合同。H6原来曾等该文本收口，已撤掉这种错误抽象，改为等待
实际原loadSceneMap Promise及后续事件循环轮次；不会把旧失败提示写成应当保留的正确行为。反馈政策归后续复核，
本卡不改产品，也不借“世界没被覆盖”宣称提示所有权都正确。

## 验证与失败记录

最终候选36项与全reforge1414绿、TC exit0、11文件Biome无诊断、8针exit1业务红且总工具exit0。
日志根 `/tmp/type-pal-shell-validation.JeWbvP/`：`reforge-final3.log`、`typecheck-final.log`、`biome-final.log`、`mutants-final8.log`。
最后负控目录 `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-runtime-shell-mutants-2fo4zD/`。
覆盖before在`coverage/before`，after在`coverage-final/after`；before.log/after-final.log均exit0。完整命令如下：

```bash
pnpm --filter @type-pal/reforge exec vitest run src/main.boot-flows.test.ts src/opening-menu.flows.test.ts src/main.menu-flows.test.ts src/main.dialog-flows.test.ts src/main.save-flows.test.ts src/main.scene-flows.test.ts
pnpm --filter @type-pal/reforge run typecheck
pnpm --filter @type-pal/reforge test
node docs/testing/codex-runtime-shell-mutants.mjs
# 用你自己新建的/tmp输出目录替换此路径；before/after只在整批末跑。
SHELL_COVERAGE_DIR=/tmp/type-pal-shell-review SHELL_COVERAGE_PHASE=before pnpm exec vitest run --config docs/testing/codex-runtime-shell-coverage.config.mts
SHELL_COVERAGE_DIR=/tmp/type-pal-shell-review SHELL_COVERAGE_PHASE=after pnpm exec vitest run --config docs/testing/codex-runtime-shell-coverage.config.mts
```

开发失败不隐去（草稿阶段多数仅保留会话命令输出，不冒称每次都保存了文件日志）：

- 首次1项失败：fixture战斗形象castEffectBase/attackEffectBase=-1被guard拒，改合法0；未改guard。
- 初版TC：Canvas this无注解/createImageData重载不完整，改窄IO签名；后续菜单传author items类型不合，改真实projectItemsView，不cast业务输入。
- 一次补sceneWithCommands括号遗漏导致6套件解析失败/0测试；修语法后复跑，不算业务反例。
- 初版32项21绿/11红：scene hook缺initial、把已预载scene读当在途边界、SAVE8合法归一化新增counts/清临时状态的预期遗漏。改合法入口选择、真map IO gate与准确完整输出。
- 随后14项10绿/4红：确认框尚未实际显示就发键、runner完成观察太早、期待错误尾部而生产提示已截断。改实际呈现见证/完整完成条件、错误前缀+注入计数+同源恢复正控；不改产品。
- 首版H2列表读取自造结果已在同轮自查撤销，改真实MemorySaveStore播种；H6原等旧取消提示的收口也已撤销。
- 探索scene-request-owner删除单个调用点仍绿，工具按预期拒绝，不计入8针；分类与后续公共原语针见上。
- 覆盖校验发现上述STAT-1；临时/tmp import-only probe因模块解析失败，未算证据，改用仓内既有套件组合与入仓复建工具。

## 下一步与交接

Kimi统计窄审e7c4b743已完成；新统计修复卡r1三席设计也已齐，旧签不代整卡终审。
GLM战斗W1～W6返工独立。本卡与统计修复组合验证，不等待或纳入未接收的GLM用例；统一门禁后按两卡分别
三席同候选b6286df0独立审查已完成、Codex已分别核定done。无下一位Agent提示词；GLM战斗返工另行接收。
