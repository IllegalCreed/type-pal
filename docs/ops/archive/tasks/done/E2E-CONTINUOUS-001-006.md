# E2E-CONTINUOUS-001-006 — 双轨连续主线演示与演出差异治理

Status: done
Phase: phase2
Capability: C1 / E2E
Coding Owner: Codex
Reviewer: Codex（独立验收）

## 2026-10-11 CI 干净 checkout 跟进

合并提交 `f2e62dd41` 的 Documentation CI 已通过，但 Coverage ratchet
运行 `38074893085` 在覆盖率开始前的 typecheck 失败：
`pal-errand-author.test.ts` 静态导入未入库的 `data/extracted/data/event-objects.json`
和 `data/extracted/events/all.json`，产生两条 TS2307 与两条后续 TS7006。
上节本地质量门使用了现存提取数据，不能证明 CI 干净 checkout 可用；失败日志原样保留。
独立工作树不含提取数据或原始 SSS，已复现同样四条诊断。

build allowed 限定测试输入可用性这一根因，Codex 为单一 Owner；产品、剧情、提取器和
CI 排除/静态规则保持原合同。测试仅消费对象123、两条登船姿势和16条划船指令，
现改为 `packages/reforge/src/__tests__/pal-errand-primary.json` 的原始记录窄摘录。
夹具保存原 SSS 及两个提取文件的 SHA256、chunk、记录/指令地址与宽度；完整对象和
18条命令与原提取结果逐项相等，状态及18条指令字与原 SSS 字节直接相等。
测试仍走当前作者 flow 的编译/运行，保留相反朝向反控及全部15项既有断言合同，
不从待测作者内容生成期望值，不增加测试豁免。真源维护参考 `io/sss.ts` 的chunk0/4
布局和 `resources/scene.ts` 的零基记录 id，后续仅随已核原始输入刷新此夹具。

干净 checkout 的全仓 typecheck 与 lint 已通过，3860文件 error/warning/info 全部0，
相关作者测试15项通过。提交后的 GitHub CI 回执须另行确认，不以本地通过替代。
证据位于 `build/ci/e2e-main-20261011/`，原始固定输入/headed
验收仍为冻结批次，不重新录制或改写旧回执。本次新增夹具只增加治理台账待核库存一项。

初次完整 fast 的19755项测试均通过，但 content 三项和 editor 四项覆盖率低于受保护
基线，`coverage-fast-initial.log`及`coverage-initial/`保留失败指标。两项后续根因依次允许
修复，由 Codex 单一写入，不扩展产品合同。先闭合 content 根因：
新增 mountParty.riders 运行时输入校验未有包内测试；补一项合法组合和六项独立拒绝边界，
核同场景、非载具自身/不重复、有限偏移，既有 helper 合同不重复补测。1498项通过，
content statements/branches/lines 分别为5668/5878、4827/5129、5061/5199，均高于旧比例。

随后核 editor 根因：`AUTHOR_CUSTOM_COMMAND_KINDS`将 mountParty 留在 CanonicalCommandForm，
真实`createAuthorCommandFormBridge`对合法搭乘命令返回undefined；ScriptEditor:2483附近
进入canonical实体表单，不能到达旧 ActorCommandForm 搭乘臂。仅删除本次E2E新增的51行
不可达rider控件和回调，该文件回到 main父版本内容，不增加直接挂载死臂的覆盖率用例。
canonical入口、作者schema、runtime骑乘及既有UI行为不变；五个现有表单/所有权文件30项通过。
修复后按官方ratchet逻辑重新完整实测，保护与范围检查不改；为遵守apply_patch写源码纪律，
生成器只将最终基线输出重定向到ignored候选文件，审核后再用apply_patch落正式基线。
临时生成器不进入提交，不能代替提交后的GitHub CI回执。

完整重测已exit0：七包19762项全部通过、729份生产源码均被纳入，候选基线与实际汇总
逐字段一致。相对原基线15项比例提升、10项范围/测试身份变更，零回退、零移除；
另与 `fd2c645`、`f2e62dd` 的受保护基线分别用正式比较与范围函数复核，同样零回退/
零移除，不使用范围删除开关或退役豁免。editor 实测 statements/branches/functions/
lines 为30224/33522、24259/29079、7655/8544、27049/29293，均高于原比例。
`baseline-verification.json`、`coverage-final/`和`coverage-ratchet-candidate.log`保留此轮
新证据；正式 `baseline.fast.json` 经apply_patch更新后与生成候选逐字节相同。
质量工具37项、覆盖率工具58项通过；此修复不重做已验收主线生产者或E2E反控。
无下一位 Agent 提示词，本次 CI 跟进由 Codex 收口。

## 2026-10-11 main 集成与分支退役

用户后续明确授权推送，并选择“把 E2E 合入 main，再清理这两个分支”。本次集成父版本为
main `fd2c6452269f39e4bf03ede91ee29f9ad974643b` 和已验收 E2E
`33afa37d55b377bcf99965dfc5e037405c22b72e`；代码治理分支 tip
`7ce19176c83f4a0d5fd4502b169f10575f222f06` 已包含在 main 中。
在独立工作树处理十处冲突，保留 main 的测试治理归档、真实绘制断言及版本常量，同时接入
E2E 的 SAVE12 sceneRuntime、实体朝向命令和已验收剧情编排。没有手工改动产品实现或剧情内容。

集成时修正测试接线：新增夹具补齐 sceneRuntime 和 faceEntityToParty；runtime-handoff
提取真实存档夹具时显式注入正式模块的版本常量；authority 清理用例明确使用 script owner，
auto 相位保留、接管期间站立及释放后继续由已有真实 main 用例核验。
另一条视频取消用例原用初始即为 50 的金额判定读档完成，存在提前释放资源的竞态；现先确认
实际资源读取进入等待，再用不同的存档金额 40 确认真实恢复，保持原取消与单次奖励断言，
并等待实际异步帧回执。没有增加等待时长或弱化断言。

现行测试报告、phase/lore catalog 和 review 的 source binding 按集成差异更新；原 sourceSha、
历史事件、旧候选版本和旧测试计数保留。治理文件台账仅更新库存：3251 个受管文件，
已闭合仍为 229、review 仍为 5、pending 为 3017；净增 166 个文件没有自动获得语义审查信用。

质量门按实际组件收口：content 149文件/1491项、shared 16/131、game 311/3519、
pal-extract 70/423 的完整 check 通过；editor 完整 check 为 625/4917，migrate 为 96/739；
最后修正测试后重新运行 Reforge 完整 check，356文件/8944项通过。各包 typecheck 零诊断；
docs工具48、coverage工具58、quality工具37、E2E工具395和script-governance工具22项通过。
作者工程检查为294场景/223地图/1934资源。正文更新后的 docs/lint 再单独执行，最终 lint
3859文件 error/warning/info 全部0。当前日志位于 `build/e2e/main-integration-20261011/`。
此前完整 `pnpm check` 因上述测试接线或夹具失败的原始日志保留，不改写为 exit0；
本次结论由各完整组件检查与最终文档/静态门组成，不将失败总命令冒称通过。

下节最终固定输入及 headed 证据仍属于冻结的 `33afa37` 批次；36份证据文件 hash 核验不变，
没有重跑已通过 producer，也没有将旧 acceptance 晋升为合并后源码的全新 E2E 验收。
原工作树13个未提交 JSON 经内容对比仅为格式化/键序调整，无另一分支的新逻辑或回执，
与备份逐字节一致且未纳入提交。两分支旧 tip、引用及这些文件已建立可验证 bundle/文件备份。
分支退役仅删除已集成本地/远程引用，原 E2E 与代码治理工作树保留在各自原 tip 的 detached HEAD；
推送与删除的实际结果以新集成目录的清理回执为准，不预写操作成功。临时集成工作树在日志
完整复制核验后归档。无下一位 Agent 提示词，本包由 Codex 收口。

## 2026-10-11 最终重录与headed验收（accept）

本节为当前收口结论；下方rework、失败、旧通过与暂不提交记录均保留其发生时的事实。
用户002段内残留反例已闭合：修当前作者对白段落→动作/剧情auto启动/释放前的显式clear，
保留同段上下对白共存；采集核完整槽实际成功draw，验收另查遗漏的动作边界。
真实native正控及删除002 clear的产品反控有判别力，不以根脚本最后清屏代替段内消失。

最终六份正式固定输入acceptance为下节表列的16:34–16:57新批次，全部
status=passed、findings=0、sourceChanges=0。冻结后没有再修改产品、采集或判定源码。
正式连续tape为`build/e2e/final-dialogue-action-clear-20261011/tape.json`，绑定这六份完整
证据及004/005双侧四个真实存档交接；Game387/RF390个动作均无录制墙钟atMs调度。

默认headed命令已exit0，实际最终父回执：
`build/e2e/continuous-both-2026-10-10T17-08-36-216Z/continuous-both.json`。
Game/Reforge两个child均code0、signal=null；preflight ready含两侧且released=true；
001–006每个barrier均含game/reforge。两侧`continuous-report.json`及`report.json`均passed：

- Game：`build/e2e/continuous-game-2026-10-10T17-20-23-390Z/`。
- Reforge：`build/e2e/continuous-reforge-2026-10-10T17-20-23-388Z/`。

每侧六份checkpoint JSON与六张756×900 PNG完整，共24个文件；最终复读实际JSON，对应
report fragment.state、独立正式终点及完整world checkpoint合同均通过，全部输入ledger
含实际执行回执，无action/route failure文件。实际002及006截图已查看，收尾均无残留对白。
文件hash核验索引为`build/e2e/dialogue-action-clear-investigation-20261011/final-headed-file-verification.json`，
该索引不代替上述正式acceptance/父回执。Game浏览器warnings为空；RF保留实际404控制台消息
和Canvas2D读回性能提示，未将浏览器消息改写成零。硬性静态门零诊断另由实际质量日志证明。

本轮002实际input ledger：离卧房路线松键到下一移动Game1606ms/RF1387ms；接近剧情路线
松键到首次确认Game637ms/RF291ms。索引`final-headed-002-input-timing.json`保留实际时间；
不把录制工具导出/核验墙钟延迟重放成剧情等待，也不要求不同批次机械复现相同毫秒值。

全仓`pnpm check`已exit0，日志`dialogue-action-clear-investigation-20261011/check-after-clear-contract.log`；
lint3380文件error/warning/info全部0，各包typecheck、测试、工具及治理门通过；
`content.log`当前294场景/223地图/1934资源检查通过。首次正文收口lint仍0/0/0；
docs-after-headed.log因终态卡尚未归档、索引和看板未同步而exit1，失败日志原样保留。
已将本卡归档，移出活动看板，按实际顶部状态生成索引并仅重定位现行文档引用；
旧报告/回执数值不变。归档后的最终文档/lint日志为同目录docs-after-archive.log与
lint-after-archive.log，不改首次失败或旧批次报告。

Codex最终验收accept。按用户已确认的范围收口已核438个主线候选文件及必要的归档/索引更新，覆盖对白/记录器、SAVE12、
001–006因果合同及相关内容/文档；13个独立测试治理JSON冻结hash不变且不入提交。
用户授权提交，不包含push；实际commit由Git记录。无下一位Agent提示词，本包无需转交。

## 2026-10-11 用户反例：段内对白消失边界（rework）

用户指出002李大娘说完后苗人头领开始移动时仍有旧对白，并明确要求不能只在根脚本最后
清屏；释放实体后的自动移动也须核对白消失。当前headed两侧code0只证明整段执行完成，
`continuous-both-2026-10-10T16-07-12-870Z`及`final-dialogue-acceptance-20261011/001`至`006`
不晋升为此新增义务的最终验收。原始报告、回执及数值原样保留；暂不提交。

| 真值方向 | 一手证据 | 当前结论/目标 |
| --- | --- | --- |
| 原始数据/参考 | scene-003.json的dlg.29/30后切换大娘auto、等待并启动三位客人；sdlpal script.c:3340附近0x0009先PAL_ClearDialog再PAL_MakeScene，text.c:1752–1817区分状态清除与重画 | 这是对白转动作的段内边界；参考源码不冒称pal.exe像素实测 |
| Game实际记录 | game-002-2026-10-10T15-23-51-273Z/inn-trace.json的presentation order3163仍显示dlg.29/30，order3177实际槽已空 | 旧对白在后续动作段前消失，不只在脚本结束消失 |
| RF实际记录 | reforge-002-2026-10-10T15-23-51-310Z/inn-trace.json的order6102–7408共152次成功绘制保留已确认dlg.29/30；期间e59实际位置从[122,46,0]移至[124,46,0] | 段内未执行clearDialog，约2.516秒残留；不是已经执行清除但renderer漏擦 |
| 目标 | 同段上下对白保留；段内转身、移动、剧情auto启动/释放前明确结束旧对白段 | 作者显式clearDialog，不将旧引擎的每opcode清屏耦合搬进runtime |

记录器现在已有全槽成功绘制及clear请求/close的beforeSlots/afterSlots；本例确已录到残留。
验收缺口是只证明现有作者clear与槽生命周期一致，未检查遗漏的段内清除边界。新增门必须同时核
真实clear caller及后续实际draw，不能以active=null、根结束或clear请求本身冒充消失。
最强替代解释是作者有意让对白覆盖后续动作；用户反例和Game此段实绘已否定002这一解释。
其它001–006边界须逐段核实际caller与绘制，不把任意非对白命令都批量视为清屏。

build allowed限定同一“段内过度留显”根因；Codex为唯一Owner。READ-FIRST铁律10的2026-09-30
作者所有权例外允许修当前canonical剧情正文，不恢复已退役转换器。先在已录六段中定位真实
动作/释放边界，补显式编排及有判别力的真实caller回归，再冻结重录受影响链并重新headed。
此前全仓check-final-after-retirement.log为exit0、静态3380文件error/warning/info全部0；
新修改后重新执行适用门。已暂存438个主线文件仍未commit；13个独立治理JSON按冻结hash保留。

已核当前六段实际执行的30处对白段落→动作边界，修五个canonical场景的clear位置：已有clear
移到首动作前，缺失处补clear；保留所有非clear命令、正文、坐标、等待、奖励与take/release编排。
`inactive-slots-at-commands.json`是实际raw定位清单，不能作为通过回执。s000离梦的含文字旧帧
捕获未机械清除，仍按场景过渡合同；无关auto/e203不受此门影响。

真实main普通移动触发s003/e56触碰页的回归同时核：最后大娘槽消失后e59实际world draw开始位移，
随后dlg.32与dlg.36两槽实际文本绘制共存。局部5文件50项通过。只临时删除dlg.29/30后的clear，
同一入口在首位移draw时断言失败；已恢复，失败日志保留为反控，不作为acceptance。
采集/验收工具24项通过，其中删除真实clear操作及close的记录反控在releaseEntity前拒绝；
旧002 raw的dlg.29/30区间现在于order6080首个auto选择命令被拒绝。新增门按真实interactive
command检查动作前槽已清，再沿完整lifecycle/成功draw检查实际消失，不使用对白literal名单。

局部lint3380文件0/0/0、全仓typecheck、docs及testing-docs通过。全部产品/采集/判定源码冻结后
开始新固定输入链；001内容变化改变canonical digest及后续SAVE12绑定，因此从001重建受影响
checkpoint链，不复用旧RF起始存档。本轮共同录制依赖也绑定变更过的作者合同；为满足最终
sourceChanges=0，两侧生成新producer回执。全仓质量门和新headed尚未完成，不提前授信。
全部新日志位于`build/e2e/dialogue-action-clear-investigation-20261011/`。

全仓首轮在RF329文件8829项中发现两项旧opening检查仍要求pose之后才clear，及静态计数
15处“pose紧邻clear”。前者按本次已核清除边界改为clear先于转身，既有等待值不变；后者
没有实际draw/时钟caller，以该邻接数量冒充重画节拍，删除此弱用例，不把计数改成7过门。
真实native首位移/两槽共存用例及001–006逐命令时钟/全部draw合同负责行为验收。
首次失败check-final.log保留，修正后全仓日志另存check-after-clear-contract.log。

当前全仓`pnpm check`已exit0：RF329文件8828项、editor605文件4855项、migrate94文件722项
通过，其余包及395项E2E工具亦通过；lint3380文件error/warning/info全部0。
`content.log`检查当前294场景/223地图/1934资源通过。新001–005两侧正式固定输入及各自
完整aux用例已通过，acceptance全部passed/findings0/sourceChanges0。新006两侧producer
已code0，完整比较与新连续tape/headed尚待完成，Status保留rework，未commit/push。

新006严格比较完成，六份当前acceptance均passed/findings0/sourceChanges0：

| 段 | 当前正式双轨回执（build/e2e下） |
| --- | --- |
| 001 | both-001-2026-10-10T16-34-22-903Z/acceptance.json |
| 002 | both-002-2026-10-10T16-36-00-739Z/acceptance.json |
| 003 | both-003-2026-10-10T16-38-12-036Z/acceptance.json |
| 004 | both-004-2026-10-10T16-39-39-220Z/acceptance.json |
| 005 | both-005-2026-10-10T16-43-21-908Z/acceptance.json |
| 006 | both-006-2026-10-10T16-57-16-729Z/acceptance.json |

002实际新clear为order7476，首auto选择为7478，至下一对白的153次成功presentation均空槽；
这是本次实际记录，不要求下一批重复同样绘制次数。raw诊断new-002-clear-witness.json只索引
这些draw，不代替该段acceptance。004/005的story及独立aux两侧各六个child均code0。
连续输入使用新目录`build/e2e/final-dialogue-action-clear-20261011/`，原始report数组与六份
acceptance路径已准备，builder重新核完整raw/来源与四个真实存档交接后才写tape。
新headed完成之前仍不收口或提交。

builder已exit0，正式新tape为`build/e2e/final-dialogue-action-clear-20261011/tape.json`：
Game387/RF390个动作、六份当前acceptance、四个真实存档交接；动作均无录制墙钟atMs调度。
已按`node scripts/e2e/continuous-story-replay-both.mjs --tape build/e2e/final-dialogue-action-clear-20261011/tape.json`
启动默认headed两侧执行。最终需要实际child code0、preflight released、全部barrier、两侧passed
及完整检查点；命令已启动本身不计成功。

## 2026-10-11 用户授权重新录制、最终核验与提交（进行中）

用户明确要求重新录制、最后核验并提交，并确认提交本主线累积修复（对白、记录器、SAVE12、
相关内容与文档）；独立测试治理改动保留未提交。此前禁止重录/commit的记录保留为历史，
本次授权覆盖这两项，不包含push。不覆盖既有dirty，不修改历史报告/acceptance/tape。

首轮新001两侧producer均code0、剧情与真实存读档通过，但最终acceptance为needs-review，
不能晋升：`build/e2e/both-001-2026-10-10T14-56-54-122Z/acceptance.json`。
唯一finding是新dialogue-clear-request借用了上条dialog的occurrence（6），实际clearDialog
已派发为7。根因在新采集caller归属，不是对白运行行为；失败raw原样保留。

首次caller修正只覆盖直接传runner signal的CutsceneController；第二次001的真实main
另为clear新建signal，12条caller错误触发缓冲封存（不是字节容量耗尽）。失败目录
`build/e2e/both-001-2026-10-10T15-07-55-906Z/`原样保留，不算通过。
续修从真实script-host-adapter携原runner signal进入同步clear上下文，再跨主机新建的
effect signal进入CutsceneController；只认这条真实同步桥，不借用上条对白。
abort/切场/dither传实际signal，根收尾/复位不借用旧对白身份。真实ScriptRunnerCore→
script-host-adapter→新effect signal→CutsceneController→清除执行器用例证明clear的
occurrence是当前clearDialog，借用旧对白身份会被lineage拒绝；394项E2E工具回归通过。

全仓检查首轮缺worktree的忽略MKF输入，已从原仓库补本地链接，不改变源码/测试。
补输入后检查发现72项测试合同错配，逐根因修正：绘制顺序检查改visible（5项通过）；
恢复点旧下标失效时只允许唯一out/in+原记录后续anchor定位，仍执行真实compiler/fade
及取消门（72项通过）；e88的已批准落地idle page精确核新字段，其余实体/属性仍核原
非脚本快照（1项通过）。剩余68项是17条已调整auto的旧名义执行hash，先完成新严格
E2E，再依据已核primary语言/真实author caller合同更新当前oracle，不豁免NPC或字段。

下一步依次完成当前代码全仓质量门、新001–006真实固定输入录制及零finding对比、
以新验收构建连续tape、headed两侧完整回执核验，再核定主线文件并提交。
未完成的门不得提前写passed。验证日志与索引使用新的
`build/e2e/final-dialogue-rerecord-20261010/`目录；该索引不替代各producer/raw和acceptance。

新001在真实host-adapter桥修正后通过（`both-001-2026-10-10T15-11-00-187Z`）。
新002两侧producer均通过，但auto e59的100ms等待在frame1090到期，剧情同帧take，
gate255从order7595到10489等待真实release；原核验错误要求到期后立即进入下一命令。
补真实等待完成→take命令→coordinator权属epoch→原activity/sceneSession唤醒门→
release命令→权属解除→首可执行帧/首次draw的通用因果核验，不按NPC或时长豁免。
全段held lifecycle必须保持同一活动和权属；普通等待继续严格核首次续行。
真实FrameSession/Runner/ProjectHost/MotionCoordinator/WakeGate用例及7项失真反例通过；
395项工具回归通过。002重比`final-002-dialogue-gate-recompare-20261011`为0 finding，
但有6条verifier源码变更，**仅为诊断，不晋升最终acceptance**；冻结后重新录制。

用户指出002两侧出卧房后、第一句确认前过长停顿。primary caller为连续播放器将正式
report的atMs当墙钟deadline重放，包含route receipt导出/核验耗时。旧正式tape第一句前
Game/RF间隔4601/7353ms；本次002为4850/9880ms。演示删除该墙钟调度和无caller helper，
动作投影不带atMs；原独立actions/raw仍保留真实时间。演示仍按真实对白ready/consume、
场景和事件驱动路线等待，正式固定输入不改。不能把录制工具耗时当作者节奏。

冻结后的001–006全部新producer已完成：004 story/items/saves和005 story/guards/saves
两侧各六个child均code0；006两侧也已完成上岛收尾对白。005首次最终比较因e91恢复恰在
原始工厂坐标[94,28,0]失败：实际位置赋值无状态变化，稀疏observer不产生commit:entity.pos。
这不是坐标误差或运行时漏恢复。补通用精确不变分支：实际capture位置必须等于primary
工厂坐标，runtime-projection-start的canonical entityPos必须完全一致，全部真实staging
位置不得变化；pose/cursor/occurrence/sceneVisit和首auto前绘制仍按原门验证。需位移时仍
要求唯一实际位置commit。真实main位置writer与真实稀疏collector同时覆盖有变/不变，
删实际commit、改canonical坐标、改staging坐标均拒绝。旧失败acceptance原样保留。

005修正重比`final-005-dialogue-position-recompare-20261011/acceptance.json`与006
`both-006-2026-10-10T15-43-39-688Z/acceptance.json`均passed/findings0/sourceChanges0。
该纯verifier修正未改变任何producer输入；统一当前verifier后的最终六份回执另写
`build/e2e/final-dialogue-acceptance-20261011/001`至`006`，不改历史回执。
17条已批准auto的68个名义单测hash只在上述严格双轨通过后同步，每条明确primary语言/
原生author或mounted caller依据；其余1297条auto快照保持既有约束。名义hash不冒充绘制
时序证书。完整质量门日志为`final-dialogue-rerecord-20261010/check-final.log`，完成前不
提前授全仓门通过。主线外13个独立测试治理JSON已单独冻结hash，提交前后核字节未变。

全仓检查在编辑器605文件4855项通过后，迁移包的`pal-project.test.ts`旧断言仍要求
e10没有pages、退场全为前台blocking move，与2026-10-07用户批准的离房auto/take/release
矛盾。该项只读生成JSON，不调用迁移器；删除这项过时检查，不复制新结构堆断言。
行为验收由真实`pal-meal-shell.test.ts`的100/17ms两种帧相位继续负责：两次对白精确停点
及连续5次实际draw、同拍转身/换装、-12.875释放、主角起步时大娘仍可见、最终-12离场；
新001正式双轨严格比较和实际离房路线另核完整剧情。未变产品/作者，也未降低门规则。
首次全仓失败日志原样保留，修正后的迁移包与全仓门另跑新日志，不将失败写成通过。

## 2026-10-10 对白留显修复交付（当前）

用户授权的根因修复及局部代码/工具验证已完成；Status保留rework，完整剧情观感尚未对本次修复
重新授信。此前headed成功及六份acceptance是历史事实，不晋升为本次新增显隐义务的通过证据。

- `DialogBox.open`增加内部script生命周期：普通上下对白确认后只结束活动等待，槽继续绘制；
  同槽替换、异槽共存，只有最新活动槽使用确认键。每槽保存自己的cue/头像、页起点及稳定
  presentationId，不能用下一次单cue会话的cueIdx查询旧头像。独立Dialogue及narration横卷轴
  仍按原生命周期关闭；奖励时点、作者正文、NPC接管规则均未改动。
- 真实main以visible而非active决定绘制；clearDialog、根脚本结束、取消和切场景清除留显，
  目标没有entry过场也清除。子调用完成不触发根脚本清理。未新增单槽清除schema指令。
- 采集在成功UI绘制后记录`dialogue-presentation`完整槽集，Game包含dialogBoxKept；RF每槽
  绑定最初open caller，保持run/occurrence与world renderId。生命周期有beforeSlots/afterSlots；
  7个真实host清除入口记录原因。活动页为null只证明等待完成，不当作画面清除。
- 新显隐合同接入现有Game/RF对白门：缺槽、缺中间draw、借用新cue身份或确认后清旧槽拒绝；
  当前真实采集边界声明版本，缺字段不能自动降级。历史active-only录制只保留其原有合同范围。

验证证据：`build/e2e/dialogue-visibility-fix-20261010/verification.json`，同目录保存全部实际日志及
源码hash；这是局部修复验证，**不是正式001–006 acceptance**。真实main/脚本caller的6文件33项
测试通过，E2E工具394项通过；临时将确认分支恢复为close，目标共存用例exit1，还原修复后exit0。
还核实际Game切换的kept+active绘制、RF两头像来源和删槽/删draw/借cue/删生命周期的拒绝。
lint全仓3381文件error/warning/info均0，全仓typecheck、docs与testing-docs均零诊断/问题。

文档门26处哈希漂移只同步当前sourceRefs索引，并注明局部授信范围；历史revision、运行结论、
数字及raw原样保留。六份指定acceptance复核仍passed、findings0、sourceChanges0；正式producer、
tape及历史报告均未重录/改写，未commit/push。修复后尚未再跑headed演示，视觉验收未完成。

无下一位Agent提示词，同一Codex保留工作树，等待用户观感验收；不默认重跑001–006整链。

## 2026-10-10 对白留显修复准入（当前）

用户已明确授权修复对白bug，奖励横卷轴留待用户继续观察，本轮不改奖励时序。
Codex为唯一写入Owner；build allowed限定于脚本对白等待与可见槽生命周期，以及该域采集/验证。
不新增clearDialog schema参数，不改作者正文，不commit/push，不覆盖既有未提交改动或历史报告。

| 前提 | 一手证据 | 本任务目标 |
| --- | --- | --- |
| 原版数据/用户实测 | all.json指令313–322异侧对白之间没有clear，323才0x05；用户直接观察上下共存 | 已确认的上下对白保留，异槽出现不清前槽 |
| 第一阶段 | event-system.ts:1094–1108/1749保留异侧box；present.ts:145–150实际绘制kept与active | 参考呈现意图，不复制持久framebuffer或全局冻结 |
| 当前二阶段 | main.ts:2090每命令单cue；dialog-box.ts:238–257完成即close全部，open再次清全部 | 确认完成只结束该命令等待；清除另由同槽替换/clearDialog/根脚本收尾及取消离场负责 |
| 记录器 | inn-observer.mjs:344只观察活动box；DialogueObservation只读active | 独立采集真实draw全部可见槽与生命周期原因，不把active=null等同清屏 |

最强替代解释是作者明确要求清屏，但002真实上下调用间无clear，已排除；若真实caller含明确clear或
正常脚本已结束，旧槽继续显示将推翻修复。对白文字/头像必须来自各自cue，不能靠跨会话cue下标复用。
横卷轴及独立完整Dialogue保持原有结束清除行为；普通脚本上下槽留显不得继续吞键、暂停世界或延迟脚本。
验证使用真实main+ScriptProjectRuntime caller，另核采集真实draw的失败路径及缺证拒绝；组件多cue绿灯不能替代。

## 2026-10-10 用户对白/奖励卷轴反例：只读调查（当前）

用户要求先查清楚，暂不实施修复。headed执行回执保持历史真实PASS，但不证明下面两个新观察域
已通过；Status继续rework。此次只读取源码与既有正式raw，不重录producer、不修改历史报告、
acceptance或tape，不commit/push。原版数据、sdlpal参考与本项目Game实跑分开授信，未实跑pal.exe。

### 对白上下槽留显：已定位实际caller缺陷及验收漏项

- 用户直接观察到原版上下对白共存。原始`events/all.json`指令313–322先top的dlg.32–34，
  再bottom的dlg.36–38，直到323的0x05才显式重画清除。Game
  `event-system.ts:1094–1108/1749`保留异侧dialogBoxKept，`present.ts:145–150`实际先画kept再画active。
- RF `dialog/slot.ts:35`及`dialog-box.ts:246–248`确实支持同一Dialogue内异槽共存；但真实
  `main.ts:2090`每条脚本dialog都调用`open(startDialogue({cues:[cue]}))`。单cue确认结束在
  `dialog-box.ts:238–239`调用close，清全部slots/renders；下一条open在194–195又清全部。
  因而不是缺少两槽组件，而是脚本等待完成与画面清除被实际接线合为同一生命周期。
- 正式RF002 `reforge-002-2026-10-10T12-18-33-706Z/inn-trace.json`的run22：top命令5740，
  open5747，确认close6140/advance6141；bottom命令6143，open6151时before=null。
  两条作者dialog之间无clearDialog，却已清前槽，证实不是作者明确要求清屏。
- 采集漏项：`inn-observer.mjs:344`只读gs.dialogBox，未读dialogBoxKept；RF
  `DialogueObservation`只返回activeSlot。因果流同样只记录活动页，不能证明全部留显槽或头像的实际draw。
  `opening-hold-intent.mjs:458`以活动页after=null确认单cue等待结束，没有另核留显画面；
  after=null本身不证明像素已清除，也不能判留显错误。当前合同能证明页面被显示/消费，不能证明
  旧槽按正确clear时机保留。组件内多cue测试不覆盖真实脚本caller。

### 两次给钱及横卷轴：已有采集，缺统一生命周期/参考关系门

`main.ts:2597–2598`的giveMoney只修改world.money，不弹奖励UI；这两次横卷轴来自独立
dialog/narration cue，调用真实`DialogBox.renderNarrationScroll`。因此“加钱就自动弹窗”不是当前实现事实。

| 段与真实作者入口 | 原始数据及Game实跑 | RF当前作者与实跑 | 调查判断 |
| --- | --- | --- | --- |
| 002 s003/e56/trigger/default，500文 | 原指令342加500，343清屏，344选narration，345显示dlg.51。正式raw余额order5083；卷轴首显示5098，下一null5185，页面观察区间1398.5ms | s003.json:1226给500，清屏/wait100后dlg.51/autoAdvance1400；余额7456，卷轴7507，实际close8002/render8004，下一page-null8028 | 加钱早于提示的偏序一致；本次未发现弹出起点错序，不移动giveMoney。RF自动尾停顿不允许提前按键是既有窄差异，不能在本次只读调查中擅改 |
| 005 s001/e19/trigger/c8-74bc98f07f8e，买虾50文（非003） | 原L741先买虾说明，748显示dlg.215，749加50，750清屏；Game等待卷轴结束后才执行749。正式raw首显示3129，余额变550为3213，下一page-null3218，页面观察区间1399.5ms | s001.json:2781–2796同样先dlg.215卷轴再giveMoney50；cue无autoAdvance。正式raw首显示2704，confirm close2742，余额变550为2748，下一page-null2756，页面观察区间133.9ms；open2702到close2742约132.1ms | 加钱/提示先后仍一致；缺无输入自动关闭，实际由输入关。短停本身不能判缺陷，参考也允许按键提前关闭；不能机械补足每次1.4s |

上述raw均位于build/e2e：002 Game/RF目录分别`game-002-2026-10-10T12-18-33-705Z`与
`reforge-002-2026-10-10T12-18-33-706Z`；005分别`game-005-story-2026-10-10T12-32-15-958Z`与
`reforge-005-story-2026-10-10T12-32-15-927Z`。002取inn-trace.json，005取005-latest.trace.json。
页面首显示到下一null只是实际采样区间，不冒充精确像素删除时刻。

参考`text.c:1698–1709`显示中央卷轴后最长等1.4s再删除；Game
`event-system.ts:1685–1707`支持任意键提前关及14拍自动关。原始指令只能证明声明先后，
不能单独证明pal.exe像素时序；本次未把参考实现冒称原版直接实测。

记录器已在这两段pages里记录narration首个实绘观察及后续null，RF因果流还记录open/render/
advance/close/update，余额变化亦有证据。缺的不是所有“卷轴弹出时机”，而是完整留显槽集合、
卷轴实际绘制/消除生命周期与参考关闭规则的验收关系；rewardGainQueue另走物品使用结果路径，
此次未证明该独立UI也有完整draw采集。`verifyOpeningDialogue`仅核当前作者cue自身deadline或
合法确认，005作者缺autoAdvance仍可passed，不代表已核无输入自关或双轨奖励窗交互等价。

下一明确根因为脚本对白等待与留显/清除生命周期；先补真实host caller及全部槽呈现证据，
不得用组件内多cue自验替代。奖励窗口作为另一根因单列，不同时修改给钱时点或批量补narration时长。
无下一位Agent提示词，同一Codex保留工作树；本轮未修改产品或授予新的视觉验收。

## 2026-10-10 headed 连续演示执行回执（当前）

本次仅运行既有正式 tape 的 headed 左右分屏演示，没有重做审计、001–006 producer 或离线反控，
没有修改源码、tape、独立 acceptance 或历史报告，没有 commit/push。

- 命令：`node scripts/e2e/continuous-story-replay-both.mjs --tape build/e2e/final-continuous-story-20261010/tape.json`。
- 新父回执：`build/e2e/continuous-both-2026-10-10T13-57-10-575Z/continuous-both.json`。
  父命令 exit 0，Game/Reforge child 均 code 0、signal null；preflight released=true；
  barriers 001–006 每项均含 game/reforge。
- 两侧目录：`build/e2e/continuous-game-2026-10-10T14-10-09-373Z/`、
  `build/e2e/continuous-reforge-2026-10-10T14-10-09-373Z/`。
  各自 continuous-report.json 与 report.json 均 status=passed；001–006 每段 checkpoint JSON
  可解析、PNG 签名及非空大小已核，两侧共12份JSON和12份PNG；无 action/route failure 文件。
- 六份指定最终 acceptance 原样保留，逐项复核均 passed、comparison.findings=0、sourceChanges=0：
  `final-001-recompare-20261010` 至 `final-005-recompare-20261010`，以及
  `both-006-2026-10-10T12-49-54-069Z` 内的 acceptance.json。
- Codex查看本次001与006两侧checkpoint截图，确认房间和到岛画面呈现；只授信该抽验，
  不冒称逐帧看完全部演出。headed执行及机器回执要求已完成；卡Status保留rework，等待用户观感验收。
  `continuous-both-2026-10-10T13-32-44-782Z` 仍无成功信用，旧报告不改写。

无下一位Agent提示词，等待用户验收；本轮没有新增产品取舍或扩大剧情范围。

## 目标

先建立“现象优先”的双轨状态对比门禁，再修复当前双轨实跑暴露的三类用户可见差异，并建立不依赖逐碎片修改的连续主线演示：第一阶段与 Reforge 左右分屏、同一语义检查点同步，只跑 001–006 story 主线，不混入 guards/items/saves 专项。三处已知差异暂作为回归样本，不得先用内容修补把样本抹掉。

连续模式的边界已明确：每个碎片的独立验收继续保留真实前驱读档、正文、正式存档和读回；连续演示在同一引擎页面内把上一段的内存世界直接交给下一段，不执行碎片边界的 load/save。用户后续明确允许演示读取运行态、语义寻路；独立测试仍使用受控真实输入。演示不是拼接报告，不能替代独立验收。

## 三步门禁（用户 2026-10-04 明确）

1. **双轨独立通过**：第一阶段与 Reforge 各自从真实前驱进入碎片，完成 story 正文、真实路线、必要存档/读回和本引擎证据。
2. **双轨独立对比**：只读取两份已通过的独立 trace/报告，按位置提交、移动节奏、朝向、显隐、状态、帧/精灵、对白和控制权判断 `fix / accepted / evidence-gap`；红项未裁决前不得串联。
3. **连续主线串联**：只有前两步收口的碎片才进入同一 live page 的 `load:false/save:false` 连续执行；连续报告不得反向替代独立验收。

### 2026-10-08 当前规划：执行、录制、比较一体补强

### 2026-10-10 用户画面反例（当前，撤回冻结与连续演示验收）

**当前优先级：合理性复核，禁止为清零机械改行为。** 用户再次指出此前已明确的标准未被一贯落实：
第一阶段可能有bug，原版设定也可能不合理。这不是新的产品方针；`READ-FIRST.md`铁律2/6/8、
E2E contract“意图优先，差异不等于缺陷”及本卡2026-10-07裁决已经生效。前提证据说明差异来源，
不自动证明产品缺陷；测试证明候选实现，不代替合理性判断。最终重录暂不推进，Status继续rework。

本轮已回查内容结构差异（30个实体及s001 hooks；s014候选已撤回），以及绘制/走位/帧内
续行/保存恢复的相关runtime差异与历史裁决。清单只是源码及意图复核，不冒称逐帧视觉验收。
未提交推送，既有未提交工作不覆盖；未知候选不批量撤回，旧报告和旧验证保持历史原样。

| 改动族及当前锚点 | 合理性判断与本轮处置 |
| --- | --- |
| 实际draw/current-frame采集、cursor/slot/run/visit来源、输入消费、终点completion | 修工具漏证据或误放行，不要求产品照搬Game调度；保留证据补强，0 findings不代表视觉合理 |
| main / scene-runtime-state / motion的保存、重入、取消、一次性commit去重 | 保存恢复不应丢现场或重复位移；属于运行时正确性，保留，不以原版状态字段数量作产品目标 |
| ScriptWorkQueue就绪续行与首个应呈现画面 | 避免换装/回头闪旧姿态及无故休拍；真实IO继续并发，不复制旧栈结构，保留 |
| 三苗人take/release步态 | 用户本轮明确选择暂停时站立；保留位置/相位冻结及恢复续走，撤回“必须保留迈步画面”候选。既有2026-10-06合同原本就是暂停时呈现停止状态，不能称旧adapter为已证产品bug |
| 大娘末半格匀速、楼梯目标移动、说完准备酒菜继续去厨房 | 已有合理性及作者取舍，不回滚成吸附末步/大量nudge或对白全局冻结；保留明确登记的差异 |
| e19/e35/e36/e56/e123/e124/e127显式面向主角 | 说话前面向对方、说完恢复工作朝向有意图依据；保留有限真实caller编排，不新增全局隐式转身。e35隐藏前fixed-left已撤回，不能复活 |
| 001/002可见动作与开门呈现拍 | 避免机关/中间开门画面瞬间跳过、无源小停顿；保留当前显式编排。100ms等是当前作者声明，不能声称原值是唯一合理节奏；未核观感不标视觉accept |
| 005有限auto语言、环境动作、e117同拍nudge/animate | 减少机械拆指令的额外停顿，保留实际动作及闭合循环；合法时钟的不同循环相位不要求相等。原版拍数只作意图参考，不能把其它合理作者节奏自动定bug |
| e123 state2、e84/e127初始朝向、e87/e88初始姿态 | 不靠状态数字归一化；e84初始up、e127初始down、e87初始frame1已撤回。e84确有屏内初始站姿，用户已接受各自合法初态，见下方当前诊断；e127/e87首个实际屏内姿态已有自动writer。保留e88米粒落地待机，不扩成全NPC逐像素门 |
| 无entry场景auto启动的剩余转场gate | 已撤回补足旧600ms的额外340ms等待；auto在当前声明的fade完成后启动，恢复期间仍保留合法姿态。真实native fade完成后奖励尚未执行的反控先红后绿 |
| s014/e203岸边船的onEnter take/release | 已撤回仅为复制Game对白冻结而添加的两条命令，s014恢复本轮修改前正文。真实entry/page/pose期间实际selected frame继续动画；加入接管的合法反控画面全0并被拒 |
| 队伍绘制+4、NPC+7及新增每draw几何门 | 已撤回party screenOffsetY4候选，RF继续统一+7。逐draw仍核自身声明的锚点（Game4/RF7）、实际位置/资源/矩形，合法错矩形反控拒绝；跨引擎3px差异本身不判产品bug |
| 乘船队长反向、载具旋转/上船跳动 | 用户实际可见反例及载具/乘员意图有依据；保留明确朝向和消除无故跳动的修复，不复制steering/frame隐式双状态 |
| 遮挡前景权重0.8 | 用户明确偏好，保留真实像素合成及防闪回归；原版透明参数不决定二阶段选择 |

当前下一步：完成审计后当前代码质量门及005/006比较器返工；002已修复有界站立与实际出屏
证据的组合，仍核真实take/run/visit、整段draw、固定位置、保留相位及正确resume，不能批量豁免NPC。
核完合理性及各自有效反控后才重新跑硬门/冻结/录最终001–006。无下一位Agent提示词，同一Codex继续。

用户2026-10-10补充接管边界：第一阶段对白会全局冻结NPC；二阶段按剧情需要显式选择。
剧情相关NPC若auto会导致提前进场或离场，相关窗口必须接管冻结并正确释放；无关NPC和环境
动态精灵继续。验收同时拒绝漏接管抢跑及多余接管误冻，不把Game全局停当统一目标；真实
take/release/run/sceneVisit、动作余时及全部draw仍核。该裁决适用于本链各实际caller，不扩到
范围外夜间剧情；s014/e203继续自身page动画不是遗漏冻结，仍待有界比较证明和有效反控。

#### 全量改动范围与合理性审计（2026-10-10，当前）

用户要求复核整条主线，而非只复核最近三个画面差异。当前HEAD至工作树的清单包含198个E2E
工具/测试文件、33个Reforge生产源码文件、6个PAL内容文件；其它测试/fixture、编辑器、文档和
manifest也有未提交改动。这个数量是文件范围，**不是缺陷数量，也不能全算作本轮或本人新增**。
此处按实际根因和行为合并审计；没有把同一修复的采集、比较、测试各算一个bug。

判定分为：**缺陷证据支持保留**（有独立于双轨差异的失败）、**合理取舍保留**（说明目标和边界）、
**候选未确认**（原值或测试通过不能证明取舍）、**已撤回**。保留也不等于最终E2E或视觉accept。
四向事实及原始反控仍见下方对应历史根因段；当前处置以本节为准，旧报告不改写。

| ID / 实际改动与源码范围 | 独立判断依据、最强替代解释及当前处置 |
| --- | --- |
| R01 保存现场：main、scene-runtime-state、save/{types,ops,current-codec,current-structure} | 读档/返场应恢复本引擎保存的位置、朝向、动作进度和剩余等待；旧路径实际重启动作或丢现场，原生F5/F9及返场用例可证伪。**缺陷证据支持保留**；SAVE12不是模仿原版字段，旧开发档不加兼容回退 |
| R02 动作恢复：entity-action-player、active-scene、runtime-script-project | 同一动作恢复不能重放已发生的cue、重复安装或清掉后来前台pose；completed收据必须对应尚待cursor确认的真实owner/leaf。原生完成边界/取消/相同binding不同owner反例有判别力。**缺陷证据支持保留**；并非所有auto动作都必须同步Game相位 |
| R03 移动恢复：world-motion-runtime、main | 保存slow休拍、gait和实际move目标，恢复不提前迈步或重头走；恢复cursor/实际命令不匹配要拒绝。**缺陷证据支持保留**，目的为自身存档连续性，不能仅凭capture→resume自洽授信 |
| R04 执行就绪：script-work-queue、runtime-frame-session、main | 同帧已就绪转向/换装应在首draw前兑现；冷IO及真实future-event等待不得冻结邻居。旧首draw闪旧pose及重复世界推进是独立失败；真实frame、冷/缓存IO、touch竞争有反控。**缺陷证据支持保留**，不要求与Game相同Promise层数或绘制次数 |
| R05 就绪接线：battle/battle-host、dither-transition、fade-driver、frame-animation-player、menu/reward-gain-queue、script-confirm-modal、script-wake-gate、script-world、video-player、world-camera | 这些是R04的等待/IO生命周期接线，不是另12类产品缺陷。等待应释放本引擎就绪队列，取消不能反写新owner。**接线保留**；001–006不覆盖全部战斗/视频业务，不能拿本链宣布这些领域全量验收 |
| R06 await后提交门：script-execution-gate、script-runner-core、script-project-core、latest-snapshot-transaction | 接管、取消或换scene后，await完成不能仍按旧owner提交canonical/live变更；最终gate检查与mutation同栈，已commit的settlement不再次改世界。**缺陷证据支持保留**，不是复制旧全局暂停 |
| R07 一次性位移去重：world-motion-runtime、main | 已commit而ack尚未送达的one-shot不应在下一world tick再次迈步。实际重复位移可独立证伪，committed只控制暂态slot寿命。**缺陷证据支持保留** |
| R08 take/release：motion-runtime-coordinator、main、world-motion-runtime | 同一auto owner的位置、wait、动作相位暂停后恢复，邻居继续；releaseAll须逐个释放并通知。**合理取舍保留**。用户选择暂停时站立；已撤回强画迈步候选。不能把原版迈步画面当正确性要求 |
| R09 单步动画与交接：main、world-motion-runtime | 连续编排四步时每步重置第一张迈步图会丢完整步态；保留实际phase直到release/终点/pose writer，有实际canonical八步及前台arrival反控。**合理取舍保留**；短节拍wait属于连续行走，明确take属于站定，不能把所有wait一律当迈步或站立 |
| R10 auto首次入场与隐藏唤醒：main | entry先拥有初始化；隐藏→可见后不应漏当前真实可执行帧。**有条件保留**当前entry/lifecycle边界；首帧正确性有自身内容依据，旧600ms不是必要前提。额外无entry等待已撤回，见R15 |
| R11 真实帧观察：world-scene-presentation、main | gait计数、literal、action阶段不是实际selected frame；观察真实renderer选择并清理失效项。**工具证据修复保留**，不构成产品必须与Game逐帧相同的命令 |
| R12 面向对方命令：entity-walk、index、script-runner、script-host-adapter、content/author-script-core及编辑器表单/预览 | 用户2026-10-07已批准显式faceEntityToParty；说话前看对方，用live脚底位置，零距离不擅转身，不改位置/控制权。**合理取舍保留**；象限/资产朝向须正确，primary的轴向tie只提供定义，不是唯一审美结论 |
| R13 ride载具朝向：main、world-motion-runtime | 普通walk转向不适合只平移的船；无转向命令却自行旋转，且用户实见反向。暂态preserveFacing只用于ride，普通move反控仍转向。**缺陷证据支持保留**；不引入原版steering/图像双状态 |
| R14 遮挡权重：render | 用户明确前景保留约80%，当前0.8及真实像素合成/迟滞反控。**用户取舍保留**，0.35不是因与Game不同而被判bug |
| R15 无entry补足600ms：main、story-presentation-intent、auto-entry-gate-counter | 当前fade声明260ms，另等340ms只有“旧引擎600ms”理由。**已撤回**；实际fade完成后立即auto，保留恢复pose保护。独立计时诊断只报告各自elapsed，不再授予共同600ms信用 |
| R16 队伍绘制+4候选：render、world-scene-presentation、sprite-resource-contract | 3px差异和原版公式已证，但尚无+7贴地错误的独立证据。**已撤回**screenOffsetY4；RF统一+7。保留自身锚点的精确矩形合同，错矩形反控不靠容差 |
| E01 编辑器面向命令与setEntityPos预览：core/{command-catalog,playback}、ui/{ScriptEditor,command-form-contract} | R12的插入、表单、说明、实体筛选和预览接线应完整；预览必须用setEntityPos后的live位置转向，而非旧位置。**作者功能接线保留**，不以双轨帧相等作为编辑器目标；真实地址census的调整仅反映正文引用，不能降低删除阻断或引用图判别力 |
| C01 s001/e10及onEnter：离房auto、4目标、13个新增呈现wait | 可见中间动作不应被同拍跳过；匀速目标取代nudge是既有作者结构取舍。**合理编排候选保留**，精确100ms等是作者节拍，不称唯一正确值；尚需本轮最终观感检查 |
| C02 s001/e15接管e26 | 前台重摆位时不与其auto同时写位置；结束释放继续。**控制权修复保留**，只绑定真实动作参与者，不以整段对白冻结环境 |
| C03 s001/e19四trigger入口 | 交谈前面向对方并站定，结束恢复工作方向。**合理取舍保留**，不把每次source转向隐式塞回引擎 |
| C04 s002/e35/e36 | 真实重复交谈均应在首句前看对方；source入口与正文须分开核。**合理取舍保留**face-party/frame0；隐藏前fixed-left误读相邻对象37，候选已撤回，不复活 |
| C05 s003/e48、e56/legacy-003接管 | **001–006范围外的历史审计候选**；不作为当前主线缺陷推进。尚需逐入口核取消及终态是否无需release，不能由“Game全局停”推导所有NPC都应停；本次临时范围外测试已撤回，未修改其正文 |
| C06 s003/e56开门/楼梯/离厨房 | 首句先朝人，右门先开等中间画面要可见；已批六目标匀速，非发言大娘继续去厨房。**合理取舍保留**；100ms呈现拍、1000/1500/800/100运动等待有来源，但本轮不声称原拍数唯一合理 |
| C07 s003/e59目标、e60/e61同步组与等待 | e59明确目标[137,72]及中断前缀不能拿最后sample作终点；e60零距move显式right/frame0，同源门属性无需逐条停顿。**合同/作者意图支持保留**；等待节奏仍是编排取舍，不据source误差批量改其它场景 |
| C08 s003/e62各交谈接管、环境周期 | 发言者暂离工作动作、邻居继续，有明确take/release；工作节拍改为当前作者200/200/1300。**合理取舍保留**，原版节拍有参考意义但不证明旧时长是产品bug |
| C09 s004/e76巡逻压缩 | 24条重复目标缩成12个真实目标，减少机械拆指令等待；仍精确核逐leg/stride/动作/完整draw。**结构简化保留**，不以draw次数相同验收 |
| C10 s004/e83报信/巡逻 | relative摆位与已批准十二步近前[139.5,34]，不强行补走到原版未实际达到的[140,32]。**合理取舍保留**；真正位移/对白/slot仍要证明，进度证书不能接受任意路径 |
| C11 s004/e84、e87自动selector禁用/重启 | 当前已选择行为的后续与重复执行风险须由实际控制字证明；避免重演已完成动作有正确性依据。**控制流程候选保留**，初始facing/frame另列C14，不把源一致作为它的证明 |
| C12 s004/e85/e86/e89/e90静态循环，e91/e92/e93移动循环 | 清掉机械双份循环与额外wait，合法概率分支和闭合动作需完整保留。**结构简化候选保留**；有限图可证明语言与执行合法，不能证明更短节拍更好看。不同实际clock的循环相位不要求一致 |
| C13 s005/e121/e122循环压缩，e116环境周期，e117同拍nudge/animate | 同源成对effect不应被机械拆成额外停顿，避免路径圈尾漂移；实际slot/wait/draw仍有因果门。**合理编排候选保留**，16×100ms不作为其它合理节奏一律有bug的依据 |
| C14 e84初始up、e87/e88页面resting与sprites42/43 pose、e127初始down | source一致不证明改进。用户表示原问题无法理解；未将其回复当批准。独立核实际raw的viewport/draw及首个可见姿态后，**已撤回**e84初始up、e127初始down、e87页面frame1及sprite42 pose；保留各自auto/交谈writer。e88末帧米粒落地相对frame0悬空有明确待机意图，**合理取舍保留**；不把阿珠两种手势之一宣布为唯一正确 |
| C15 s005/e116乘船正文、两ride leg及rower接管 | 用户实见主角反向；实际rower上船前跳0.25格与被auto先走可独立复现。**缺陷证据支持保留**down及有限两leg/接管；每leg目标、completion、源第一步和每draw须核，不用两leg总终点掩盖错误 |
| C16 s005/e123入口、state2、八步，e124/e127交谈入口 | 入口看人属合理取舍；state2/3虽都可见，但真实条件精确读整数，不能做state-class归一化。**入口/语义保持候选保留**，找不到该state在本段影响分支的实际观察时不称已证明用户可见bug；八步相位见R09 |
| C17 s014/e203对白冻结 | 岸边环境船无静止剧情要求，复制Game对白全局冻结不成立。**已撤回**onEnter take/release；真实canonical page动画继续，不能把e203从比较范围删除 |
| T01 固定输入、input-ledger、fixed-route-plan、browser-journey及六段journey/contract/both | 旧press记录意图冒成功、长按裁半组、终点轮询、共享输入缺路段，均是执行器缺陷。**工具修复保留**，独立E2E按真实固定键；动态NPC阻挡只能改已证固定方案，不用寻路掩盖 |
| T02 recorder/transport/snapshot-graph/long-evidence及trace插件 | 丢state/behavior/实际draw、日志满额、长JSON溢出、假completed draw均有反例。**工具修复保留**；预算变化不降overflow门，压缩须恢复完整证据，不代表产品缺陷 |
| T03 causal/actor/resource/pose/action/motion/clock/obligations | 实际effect应有真实caller、run、slot、wait与draw，不以literal集合、合法资源或终点自洽授信。**工具修复保留**；源与作者两侧各自正确性先核，然后判断差异合理性 |
| T04 automatic-language、closed/stationary/restored/captured-ambient循环 | e93合法frame10→13旧门误绿；restored cursor/path自洽伪造旧门误绿。**工具漏洞修复保留**；完整draw/latest actor/source occurrence/sceneVisit仍是必要条件，语言等价不是审美证明 |
| T05 route/refinement/interrupted/reporting/movement-draw-opportunity | 只看方向/首尾的宽证书可掩盖错误stride，最后sample也非completion。**工具漏洞修复保留**；独立来源逐transition，合法不同进度可以解释，不加坐标容差 |
| T06 boat interval/recording/rider/terminal/mounted-rower | 晚裁boarding漏首步、artifact起点不同、漏party实际frame，让反向和终点错漏检。**工具缺陷修复保留**；不得用NPC小范围证明替代主角/船实际画面 |
| T07 连续story/actions/checkpoint/report与acceptance/preflight | 旧code0但未到真实终点、边界存档误用、启动相差数分钟是实际工具失败。**工具修复保留**；真实同page、前驱/tape绑定、两子件预检完成再同步启动，独立验收未闭合不得演示 |
| T08 provenance/recompare/evidence-dependencies/producer-inputs | 源改变、交换引擎、借用旧receipt不能冒新证据；纯判定变更可离线重比，但producer行为变更须重录。**工具修复保留**；0 sourceChanges证明来源稳定，不证明改动合理 |
| T09 比较器误报与尚未完成项 | 002误报根因是站立组合遗漏已证明的逐commit裁剪/scene-exit机会，现复用逐项等价结果，不放宽任何子证书。旧raw离线正控及合法错误迈步draw反控见下方；005初值、006环境船仍待各自合理呈现证明，不能改产品去满足旧门 |

范围核对：198个工具文件按唯一归属分为独立执行/输入/段落合同52、连续准入/报告19、
录制/资源/来源30、移动/接管/恢复/终点45、指令语言/因果呈现及诊断52（包含测试，含已删除的
inn-route两个文件）。33个生产runtime文件均在R01–R16列明；main多个hunk不能算单一修复。
6个内容文件逐结构比较覆盖上述30实体及s001 hook、sprite43（sprite42候选已撤回）。未把其它编辑器测试精简、
治理fixture和历史文档dirty项归为本链产品缺陷或擅自撤回；face命令及SAVE12的连带caller另核。

当前撤回验证：暂停站姿原生3文件79项及合法迈步反控；统一RF+7的真实Canvas/资源门2项及
合法+3错矩形反控；岛上canonical entry/page/pose实际selected frame继续动画1项及加hold反控；
无entry按声明fade结束立即auto1项（旧额外wait实现先红，修后再次临时恢复旧wait仍被拒，再恢复绿）。日志分别为
`/tmp/type-pal-paused-idle-native-green2-20261010.log`、
`/tmp/type-pal-reasonable-anchor-native-20261010.log`、
`/tmp/type-pal-reasonable-island-native-green-20261010.log`、
`/tmp/type-pal-reasonable-entry-native-{red,green}-20261010.log`，追加修后有效反控及恢复日志
`/tmp/type-pal-rationality-entry-{counter,restored}-20261010.log`。
这些是当前候选的定向证据，**不是新的正式001–006验收**。

补充素材核验（未启动剧情重录）：`sprite.pal.042/043`从当前catalog映射的gzip RLE实际字节解码，
frame42的0/1均23×46、只是手势区别；frame43的0/7均28×18，粒子从半空到地面。
primary `L824`到`L840`确实由阿珠动作安装邻近粒子动画，dlg262/263为“咕．．咕．．”“快快吃，
快快长大喔．．”。这支持e88落地待机的合理性，不能用“resting”自拟名字证明阿珠手势1更好。
诊断素材图`/tmp/type-pal-initial-pose-choices-20261010.png`，不是E2E画面或视觉accept。
用户2026-10-10允许就不确定项提问；两项初值问题表述不清，用户表示不能理解，不算产品裁决。
后续独立检查实际viewport、screenVisible及完整draw前缀，撤回仅为源值一致所加候选。
e84的前缀可见性结论已由下方新诊断纠正；用户已接受合法初始朝向，不继续要求其选择内部数值。

实际可见性诊断：历史005的e84首次屏内draw为up/frame6站姿（此前“已走到”的解读错误），e87首次屏内draw已在喂鸡循环，
e88首次屏内draw为落地frame7；006鱼嫂全部屏内draw朝left，RF初始down在首draw前已经被auto改left。
证据为`/tmp/type-pal-rationality-initial-visible-20261010.log`；不是撤回后的新录制验收。
e87只要求源初始frame1的测试已退役；e88原生page/action/render仍验证落地待机、setter优先及
删除binding的有效反控，定向4/4，`/tmp/type-pal-rationality-initial-contract-20261010.log`。
编辑器当前作者引用census通过生产loader/projection重新核计，保留所有独立collector/index及
删除阻断断言；定向3文件49/49，`/tmp/type-pal-rationality-editor5-20261010.log`。

002比较器本轮只修证据组合：`movementFrameParity`给出每个已验证的等价commit，站立证明复用
这些结果，再逐项补确切take-before-draw overlay。历史第四轮raw离线诊断innTiming passed、
findings=[]，`/tmp/type-pal-rationality-standing-002-20261010.log`；原acceptance文件保持不变。
有效反控由`scripts/e2e/inn-standing-counter.mjs`执行，须在同一完整比较中实际命中e60站立和两次
出屏证书，改单次idle9真实draw为合法资源stride11/10均拒；与Game相同的stride11仍因自身
站立合同失败，stride10还触发movement-frame。`/tmp/type-pal-rationality-standing-counter4-20261010.log`
记录正控及两项拒绝；相关既有工具用例44/44，`/tmp/type-pal-rationality-standing-tools-20261010.log`。
资源合法性只核该NPC，历史party+4
不能通过当前RF+7自身锚点门。这是诊断反控，不是完整资源门或当前E2E acceptance。

审计后当前验证（2026-10-10）：E2E工具392/392（退役e87无观感依据的源初值断言，无新增
运行时例数），lint3376文件0 error/0 warning/0 info，全仓7个workspace typecheck、content
294场景/223地图/1934资源通过；原生6文件93/93、编辑器3文件49/49通过。
日志`/tmp/type-pal-rationality-{tools3,lint3,types2,content3,native3,editor5}-20261010.log`。
文档门首次拒绝两项当前npc-transition-contract哈希，后又拒绝catalog未同步；仅刷新当前
sourceRefs hash（原261–337 span未变），保留历史版本/执行/来源，testing-docs最终0 issues，
`/tmp/type-pal-rationality-testing-docs5-20261010.log`；完整docs门最终48/48、915 Markdown /
5218 local links、testing-docs均0 issues，`/tmp/type-pal-rationality-docs5-20261010.log`。
这些不是最终录制或冻结准入。

剩余明确工具工作（下方新诊断已纠正005根因）：006的环境船需按自己的canonical page/action
真实时钟解释，仍保留完整e203参与者。相关证明均须有
真实activation/visit/writer/draw绑定及合法错帧反控，不能删除参与者或改产品满足旧门。
审计覆盖改动族与已撤回候选，不冒称每个dirty文件的全部业务或全链视觉已独立验收；未知精确
节拍与e123 state影响仍按C01/C16保持待核，若涉及真正可见的产品取舍再给用户具体画面对比。

#### 2026-10-10 当前005初态诊断与用户裁决（build allowed，仅比较器）

本轮范围仍为001–006。s003后续夜间剧情不在主线内；此前把同文件审计候选混进当前进度的
表述错误，临时范围外测试已撤回，未修改该剧情正文，不能把它登记为本链缺陷或待验入口。

新的005两轨固定输入诊断生产者均passed：Game
`build/e2e/game-005-story-2026-10-10T08-51-27-454Z/report.json`，Reforge
`build/e2e/reforge-005-story-2026-10-10T09-05-17-093Z/report.json`。离线完整比较日志
`/tmp/type-pal-005-rationality-current-compare-20261010.log`为sourceChanges=[]、storyTiming
passed，唯一finding为e84初始facing：Game up/right/down/right，RF down/right/down/right。
e87实际走多visit stationary合同，没有复现此前假定的跨轨seed frame阻塞；不修不存在的调用缺陷。
这些是诊断，工具尚未冻结，不是最终001–006验收。

纠正此前可见性结论：e84（秀兰，挑水浇菜）开始转向前，Game有6次、RF有14次实际draw的
几何在屏内；up/frame6是站姿，不能写成“已走动”或猜遮挡放行。原诊断日志不改写；新证据
`/tmp/type-pal-005-initial-facing-prefix-20261010.log`。实际资源图
`/tmp/type-pal-e84-idle-choice-20261010.png`只展示sprite4的两种站姿，不是E2E场景截图。
香兰（e83，巡逻/报信）与秀兰是不同角色，不能混用caller或路线。

用户2026-10-10裁决：持续自动活动NPC的初始第一帧朝向不重要，两种都可以。
目标为保留RF自己的合法入场站姿，仅将首次入场、首个实际转向writer之前的初态登记为
合理差异；后续路线、转向、暂停/恢复及实际draw继续严格核。四向事实：primary event84的
direction2/currentFrame0、L1350 wait及L1351 right/frame0；Game首次ready up；canonical
s004/e84未声明facing故默认down，auto先wait1500再right/frame0；本任务不改内容初始朝向。
比较器必须绑定canonical初值、primary初值、实际source call及RF run/wait/occurrence、同visit
完整draw前缀与转向后序列；合法错帧、错转向、缺writer/跨visit均应拒绝。
不得复活invisibleInitialFacingProjection候选或删除e84比较。Codex premise verified / design
agree / build allowed；同一Coding Owner继续，无下一位Agent提示词。反控与质量门仍待执行。

本轮当前质量门：E2E tools392/392、lint3378文件0 error/0 warning/0 info、全仓7个workspace
typecheck、content294场景/223地图/1934资源、作者/原生2文件69/69通过；docs48/48、915 Markdown/
5218 local links及testing-docs0 issues。日志`/tmp/type-pal-approved-initial-{tools,lint,types,
content,native,docs2}-20261010.log`。文档首次拒绝当前consumer hash，随后仅刷新三处当前
sourceRefs及移位后的262–338引用，未重写历史执行结论。反控首轮未找到首draw前已记录的
替代帧资源而失败，`/tmp/type-pal-005-approved-initial-counter-20261010.log`；不当成有效反控。
第二轮改用真实后续frame9→10及更早已解码的同尺寸资源，并单独核合法初始draw的错误朝向；
`/tmp/type-pal-005-approved-initial-counter2-20261010.log`完整正控和合法错帧反控通过，但跨visit
证据被render span校验直接拒绝，旧反控壳层误要求返回null而失败；未当作整包通过。
第三轮按实际拒绝方式修正壳层，`/tmp/type-pal-005-approved-initial-counter3-20261010.log`
完整正控0 findings/storyTiming passed；真实draw18807的9→合法10（资源proved）被自身pose
oracle拒绝，初始错误朝向、缺真实writer、跨visit、后续错朝向均拒绝。此根因已闭合，只是
现有raw诊断反控，不升级为冻结后最终验收。新接管裁决文档门0 issues，反控脚本格式0诊断。

#### 2026-10-10 当前006诊断（未冻结，未正式验收）

当前005真实存读前驱均passed：
`build/e2e/game-005-saves-2026-10-10T09-36-49-978Z/report.json`、
`build/e2e/reforge-005-saves-2026-10-10T09-36-51-071Z/report.json`。
由其固定输入新录006，独立生产者均passed：
`build/e2e/game-006-2026-10-10T09-38-50-069Z/report.json`、
`build/e2e/reforge-006-2026-10-10T09-38-52-713Z/report.json`。
离线完整比较`/tmp/type-pal-006-rationality-current-compare-20261010.log`：sourceChanges=[]、
storyTiming passed/errors=[]，**唯一finding为s014/e203 rendered-pose**。e35/e36/e116/e123朝向
序列和本段状态吻合，boat终点合同、leader/rider合同无finding；旧报告红项不继续冒称当前阻塞。
e59两轨离场采样分别[137,72]/[137,70.5]，仍由已有逐transition authored leg/stride及真实
中断边界证明处理，未加坐标容差，未把RF离场采样叫作完成终点。实体摘要仅诊断：
`/tmp/type-pal-006-rationality-actor-summary-20261010.log`。

e203当前source原始两wait6/frame1/wait9/frame0/reset，RF canonical页面动画为
frame0/1300ms、frame1/1000ms、frame0/100ms循环；各自完整时钟/实际draw已经独立通过。
Game岛岸对白期间保持frame0，RF实际页面动作继续。只看跨轨frame序列会重引已撤回的对白
全局冻结。下一根因是比较器尚未证明这种纯自身页面动画的合理进度差异；须绑定primary
有限帧语言、canonical page/action、实际安装/advance/gate/selection及全部实际draw，合法错帧和
缺安装/跨visit反控仍应拒绝。005初态反控闭合后才处理这一根因，不改剧情、不删e203。

005反控已闭合，本根因进入build allowed（仅比较器）。四向真值：primary event203为
static sprite196、down、frame0，L36140纯自身wait/frame/reset循环；Game当前s014对白全局
停auto，61次draw保持0；RF当前s014/e203单页面循环已真实创建track14、安装88141、选择
88144、139次未暂停gate/advance，140次draw为0/1/0；目标保持环境动画继续。最强替代解释
是RF漏接管了剧情参与者，但此源循环没有进出场/位置/交互effect，当前entry不写该实体，
船停靠已由006载具/终点合同独立证明；用户最新明确无关环境不冻。比较器只登记纯自身页面
帧周期的进度差，不豁免位置、facing、state、sprite或控制权。必须证明有限primary步骤与
canonical action、同visit安装/选择/全部gate/advance、双轨完整draw及RF每帧独立预测；
合法错frame、缺安装、跨visit及多余hold均须反控拒绝。Codex premise verified / design agree。

当前页面动画证书已落地 `scripts/e2e/page-cycle-progress.mjs`，并接入
`story-presentation-intent` 与 NPC 比较器。它只接受有限 self-only primary wait/frame/reset
循环；要求 canonical page/action、同visit真实 installation/selection、每个 gate/advance、两轨
完整draw及RF每个实际draw的 action 预测，位置/facing/state/sprite/显隐继续由原门独立检查。
`/tmp/type-pal-006-page-cycle-counter2-20261010.log` 的实际反控已通过：正控0 findings/0
sourceChanges；order88833 的合法资源 frame1→0 被 pose oracle 拒绝；缺安装、借用installation
visit、把无关循环置held均拒绝。故e203差异已证明为合理页面动画进度差，未改产品接管。

**第四轮002差异与已撤回候选（历史诊断，不是已证产品bug）**：001
`both-001-2026-10-10T07-02-14-886Z`正式passed/0 findings/0 sourceChanges；002两轨独立
passed，但`both-002-2026-10-10T07-04-02-157Z`正式needs-review/1 finding/0 sourceChanges，
链停在002。e60同一位置[121.75,45]的真实draw为Game11/RF9，不能借路线证书放行。

四向核验：primary `scene.c:262-280/893-902`每次实际NPC步进更新currentFrame，绘制仍取
该frame，脚本暂停不隐式归零；`L_411`后第三条0x11为[44,89,1]。Game
`event-system.ts:4708`实际步进保留scriptedFrame，当前raw source commit5913后draw5950为11。
RF真实步进后gait11/auto epoch5保留，authority-changed8698接管发生在同tick实际render之前，
draw8710却为9；release后同位置draw8867恢复11。根因是`main.ts`传给真实presentation的
entityGait在auto被接管时返回undefined，走idle分支，而不是位置/gait提前推进或资源映射错误。
当时拟定目标为移动暂停期间保留最近实际提交的步姿，继续冻结位置及相位。该目标遗漏既有合理性
标准，用户已明确选择暂停时站立；原版不归零不再授权此产品修改。实际pose setter、结束和取消
仍拥有各自清理合同；位置/资源相同只证明差异，不证明二阶段站立不合理。

补强既有原生boot测试的实际selected frame（合法directional资源）；当前同tick接管先红，
expected7/actual6，日志`/tmp/type-pal-held-gait-native-red2-20261010.log`。原用例只检查
冻结的位置/相位，还断言entityGait为undefined，遗漏真实画面。候选曾定向79项通过，但typecheck
因测试spy context未收窄失败，不能称硬门通过；保留原日志。现已恢复暂停时站立接线，既有native
测试加强实际selected frame及合法“强画迈步帧”反控：拒绝候选先红expected6/actual7，再绿79项。
日志`/tmp/type-pal-paused-idle-native-{red,green}-20261010.log`，context使用真实instanceof收窄，
不强转或降低规则。该定向通过不替代正式002比较或最终全链。

**历史偏移诊断与已撤回+4候选（仅差异，不再定性产品bug）**：启动同步修复后的headed
`continuous-both-2026-10-10T06-38-39-057Z`真实执行及六个barrier passed；子件
`continuous-game-2026-10-10T06-51-35-244Z`、`continuous-reforge-2026-10-10T06-51-35-247Z`
的001–003检查点看图发现RF队长比Game下沉3原生像素。因此继续rework，第三轮正式0/0和
本次执行通过只保留为当前根因诊断，不能授予最终视觉验收。

四向核验：primary `reference/sdlpal/scene.c:224`队伍sortY为party.y+wLayer+10、iLayer为
wLayer+6，`:358`实际blit减height及iLayer，精确相消为party.y+4-height；Game
`present.ts:374`实际draw使用capturedSY+4，第三轮006真raw首个队伍矩形为
[1733,1322,22,50]；RF同站位[140,31,0]的真实矩形为[1733,1325,22,50]，真实
WorldScenePresentation→Canvas2DRenderer→spriteBlitRect沿用NPC默认+7。本任务目标为同
逻辑坐标保持primary队伍+4，NPC仍+7；不动sort/cover/逻辑位置/骑乘偏移。最强替代解释
为不同帧高度或camera：两轨真实frame0资源同为22×50，worldRect尚未减camera，已排除。
反证为同站位同资源实际draw矩形相同；现有raw直接推翻该反证。Codex premise verified /
build allowed，仅此根因。

有效旧反控日志`/tmp/type-pal-party-blit-old-counter-20261010.log`：两轨各把一个实际party
draw的worldRect.y加3，frame/资源/位置/数量均不变，旧资源门及完整006 specialization
仍proved。须补真实draw矩形合同、先红后绿原生caller与资源合法反控，再跑全部硬门。
本修复涉及独立runtime/比较器，确实影响依赖闭包；冻结后须新录001–006全链及连续演示。

偏移候选已核：renderer的矩形投影接受screenOffsetY，真实party assembly显式4，NPC缺省7，
逻辑坐标、sort/cover保持原合同。实际原生RF caller先红[1205,1333,22,50]→绿
[1205,1330,22,50]，实际Canvas draw坐标也精确对应camera扣减。资源门现在把每次party
draw绑到最近同visit真实actor位置、原版+4、实际资源宽高及worldRect；原生合法资源+3
反控拒绝。旧Game raw正例proved，其单draw+3反控拒绝；旧RF raw被新门拒绝，均见
`/tmp/type-pal-party-blit-raw-counter-20261010.log`。未加入坐标容差或改变逻辑站位。
新硬门：393/393 tools，3文件30个渲染测试通过，lint3375文件0 error/warning/info，
全仓typecheck、content294/223/1934、docs/testing-docs0 issues与diff检查通过。
日志`/tmp/type-pal-party-blit-*20261010.log`；源码及比较器重新冻结，开始第四轮新独立链。

**历史独立链（第三轮，当前不授信最终验收）**：当时重新冻结后从001录制，001–006正式
acceptance全部passed/0 findings/0 sourceChanges；004 story/items/saves及005 story/guards/saves
六份专项各自齐全、独立通过。同轮真实前驱，未拼接旧报告。新tape已通过完整准入，headed首轮
暴露下述启动同步根因；连续演示与视觉验收尚未完成，Status继续rework。

| 段 | 本轮正式acceptance（build/e2e） |
| --- | --- |
| 001 | both-001-2026-10-10T05-38-33-750Z/acceptance.json |
| 002 | both-002-2026-10-10T05-40-40-983Z/acceptance.json |
| 003 | both-003-2026-10-10T05-42-07-061Z/acceptance.json |
| 004 | both-004-2026-10-10T05-45-01-894Z/acceptance.json |
| 005 | both-005-2026-10-10T05-48-17-731Z/acceptance.json |
| 006 | both-006-2026-10-10T06-04-45-530Z/acceptance.json |

006新件Game `game-006-2026-10-10T05-54-36-429Z`、RF `reforge-006-2026-10-10T05-54-37-289Z`。
其完整合同及资源合法反向帧反控再次通过：Game71次/RF403次真实乘船draw，全部frame0/down；
frame0→6资源仍proved，但完整006拒绝；missing-draw/borrowed-setter也拒绝。
日志`/tmp/type-pal-final3-rider-counter-20261010.log`。完整generic、boat terminal/leader、关键NPC、
对白/控制合同都在正式006门内，没有坐标容差或范围删除。

本轮004第一次`both-004-2026-10-10T05-42-50-043Z`因Game items浏览器newContext传输超时
失败，actions=[]，保留原报告；工具源码未变，从本轮003前驱重新完整跑004后通过。不扩大超时，
不把失败计作通过。新的tape输入为`continuous-inputs-final3-20261010`，只引用上表当前链。

**headed启动同步根因（独立工具不变）**：首轮
`continuous-both-2026-10-10T06-14-52-891Z`失败，Game
`continuous-game-2026-10-10T06-24-15-628Z`与RF
`continuous-reforge-2026-10-10T06-28-53-088Z`的001剧情各耗时71018/66057ms；两轨
startedAt相差277408ms，finishedAt相差272447ms，超过既有001 barrier的180000ms。
根因是子进程各自完成重验即启动浏览器，较早一轨的剧情门错误地计入另一轨的离线重验。
不是乘船/正文/终点差异；保留失败产物，不扩大剧情门时限。

唯一修复为`continuous-preflight-gate.mjs`：双方都完成真实acceptance重验之后，父进程以
实际IPC readiness同时放行浏览器启动；启动等待由父进程拥有的peer失败/退出及IPC disconnect
终止，剧情barrier仍180000ms。真实双子进程测试以IPC往返验证早轨不能执行任何story input；
绕过等待的反控产生提前input并被拒绝，不用sleep猜进度。393/393 tools、lint3375文件零
error/warning/info、全仓typecheck、content294/223/1934、docs/testing-docs零issues通过。
日志`/tmp/type-pal-continuous-startup-*20261010.log`。

本修改只涉及continuous启动控制器及其采集来源声明；上表六份正式独立acceptance的完整
依赖闭包逐一核过，均不包含这三个controller/helper文件。独立执行器/录制器/比较器、内容、
primary与新raw均未变，不把未受影响的最终链重复重录；新headed仍须重新完整复核六段
current sourceChanges=0及tape绑定。continuous控制器重新冻结后，使用同一新tape重跑全六段。

用户在 headed 连续演示中指出乘船时李逍遥两轨朝向相反，并要求 Reforge 前景遮挡保留约80%不透明度。
本轮 headed 进程及六个 barrier 实际 passed，产物为 `continuous-both-2026-10-10T04-45-37-442Z`，
但该结果没有证明乘船队长的实际绘制正确，不授予视觉验收。下方六份正式0 findings记录保持原状，
不能据此收口；工具冻结撤回，Status rework。不commit/push，不改历史报告。

直接线索：`L_1511/L_1513` 的0x15均指定direction0/gesture0；Game
`event-system.ts:3565`写入partyScriptedFrame，骑乘`partyRideEventObject`只更新运行态direction，
`present.ts`静止时仍取脚本帧。当前作者`s005/e116/legacy-001`却写up；船段只采party运行态facing，
`inn-observer.mjs`显式排除了party的actor-render，RF render identity也只接NPC。必须核真实队长绘制，
补draw合同并先证明该反例被拒，再修作者朝向。替代解释为资产方向布局/renderer映射错误，须以真实
decoded帧和实际draw排除。遮挡参数当前`OCCLUSION_ALPHA=0.35`，按用户授权单独调整到0.8，
沿用真实像素合成反控。两根因逐项验证后才重新跑硬门、冻结、新录最终链与连续演示。

无下一位Agent提示词，同一Codex继续。

**本反例修复候选（2026-10-10）**：四向核验完成。primary `L_1511/L_1513`均为
0x15(direction0/gesture0)，后者点名队长；Game实际setter写partyScriptedFrame0，ride只改变
steering direction；原生`presentFrame`配实际sprite2.rle确认运行态up仍绘制frame0。
RF canonical e116前两个setter误写up，真实compiler/runner定向测试先红后绿，改为down。
真实RF sprite assembly/draw同资源选择down→frame0、up→frame6；排除资产方向映射颠倒和
“第一阶段画错”两种替代解释。before→after为反向站立画面→保留primary指定的down站立姿势，
未把原版steering与frame的隐式双状态引入RF引擎。Codex premise verified / build allowed。

工具补强：Game与RF队长实际draw接入既有资源/画序/geometry通路，005/006及continuous采集器
保留party actor-render；006新增`boat-rider-pose.mjs`，绑定真实setter/run/sceneVisit、整个ride
每个world draw、最新actor、非walking、精确frame0、sprite身份及draw资源字节。比较画面facing，
steeringFacings单独保留诊断；未删除朝向检查、未加豁免或容差。旧两轨raw均拒绝，日志
`/tmp/type-pal-rider-old-raw-rejected-20261010.log`。

Game当前006诊断`game-006-2026-10-10T05-16-17-573Z`实跑passed；以它执行真实合法frame0→6
draw反控，资源仍proved，完整006 specialization拒绝；不称最终acceptance。RF消费旧005存档
恢复失败“auto resume: 内容digest不匹配”，日志`/tmp/type-pal-rider-006-reforge-diagnostic-20261010.log`，
保留失败，不改旧档。正在只重建RF当前诊断前驱链，供006原件反控；尚未重新冻结或启动最终双轨录制。

遮挡作为独立用户取舍：`render.ts`前景权重0.35→0.8；原真实RGBA测试在0.8 oracle下先红
（15失败/6通过），修改后21/21通过，保留NPC遮挡、透明像素、迟滞及无叠加提亮反控。
新定向4文件48 tests、工具391/391、lint3373文件0 error/warning/info、全仓typecheck、
content294/223/1934、docs/testing-docs0 issues通过。日志`/tmp/type-pal-rider-*20261010.log`。
源码绑定仅刷新testing sourceRefs/hash/当前行号，历史revision/执行结果保持原状。

**重复 setter 采集反例闭合**：RF当前诊断链001 `05-22-02-927Z`、002 `05-23-53-399Z`、
003 `05-26-18-797Z`、004 saves `05-27-19-313Z`、005 saves `05-29-13-690Z`均实跑passed。
首次006 `reforge-006-2026-10-10T05-31-07-986Z`执行passed，但新pose合同拒绝：member1先
写down，队长重复写down后状态未变，稀疏日志缺少post-setter观测。保留该失败，未放宽合同。
`errand-observer.mjs`现在保留真实`refreshRuntimeProjection`完成后的party观测；实际投影函数
反控删掉完成hook会拒绝，NPC仍保持稀疏。新006 `reforge-006-2026-10-10T05-35-01-845Z`
通过完整specialization：run245/visit14/setter75752/ride75778→90404，共420次真实draw，
全部frame0/down。其合法frame0→6反控资源仍proved，完整006合同拒绝；missing-draw及
borrowed-setter反控也拒绝，日志`/tmp/type-pal-rider-reforge-raw-counter2-20261010.log`。
Game71次真实draw的相同三项反控见`/tmp/type-pal-rider-game-raw-counter3-20261010.log`。
这些均为诊断及反控，不能冒充最终acceptance。

**本轮冻结准入**：392/392工具测试、3373文件lint零error/warning/info、全仓typecheck、
content294/223/1934与docs/testing-docs零issues；日志`/tmp/type-pal-rider-*-freeze*20261010.log`。
姿势与遮挡两项根因各自已完成有效反控。继续从001重新录制两轨001–006及004/005全部专项，
每段新正式acceptance须passed/0 findings/0 sourceChanges，再生成新tape和headed连续演示。
历史第二轮链及其headed结果继续保持撤回视觉验收；源码冻结后不改执行器/采集器/比较器。

### 2026-10-10 接手续修（历史，第二轮独立链通过）

本节覆盖下方历史进度中的“当前 / 已冻结”表述；历史报告与计数原样保留。全部源码修改使用
apply_patch，未 commit / push。以下调查记录按实际时点保留；最新结果为下方最终独立链。

**最终独立链（2026-10-10，第二轮冻结后）**：001–006 全部重新录制，真实固定输入、真实同轮前驱，
004 story/items/saves 与005 story/guards/saves 全部双轨 passed。下列六份新正式 acceptance 均
`passed / 0 findings / 0 sourceChanges`；第一轮004失败及全部旧诊断保持原状。

| 段 | 正式 acceptance（均位于 build/e2e） |
| --- | --- |
| 001 | both-001-2026-10-10T04-12-21-145Z/acceptance.json |
| 002 | both-002-2026-10-10T04-14-33-599Z/acceptance.json |
| 003 | both-003-2026-10-10T04-15-51-738Z/acceptance.json |
| 004 | both-004-2026-10-10T04-16-34-504Z/acceptance.json |
| 005 | both-005-2026-10-10T04-19-46-285Z/acceptance.json |
| 006 | both-006-2026-10-10T04-33-50-368Z/acceptance.json |

006 新件为 Game `game-006-2026-10-10T04-25-21-766Z` 与 RF
`reforge-006-2026-10-10T04-25-22-351Z`，boat/leader及完整generic同在正式门内。
日志 `/tmp/type-pal-final2-001` 至 `006-20261010.log`（006另有两轨录制日志）。
下一步仅使用这六段 acceptance 绑定的 story report 生成 tape，004/005不混入专项；同一 live page
连续运行通过后，再执行 headed 左右分屏。此刻连续演示未完成，Status仍build；无下一位Agent提示词，
同一Codex继续收口。冻结依赖保持不变，不commit/push。

**tape 准入（2026-10-10）**：`build/e2e/continuous-story-tape-final2-20261010.json` 已生成。
生成器从六段完整raw重建正式comparison并逐份精确匹配receipt，还原四个004/005 saves handoff；
story-only、fragmentLoad=false、fragmentSave=false。日志`/tmp/type-pal-final2-tape-20261010.log`。
headed入口同时验证同一page的001–006连续运行与六个双轨同步barrier；直接使用该模式执行连续验证
和左右分屏，未额外重复同一套headless演示。命令已启动，入口会先独立重验tape，当前未宣告演示passed。

**返工更新（2026-10-10，最终重录第一轮）**：001–003 的新正式 acceptance 均 passed / 0 findings /
0 sourceChanges；004 story/items 双轨及 RF saves passed，但 Game saves
`game-004-saves-2026-10-10T04-00-03-879Z` 在 pickup 后立即断言 e19 up 失败，004 无 acceptance，
链止于004，未启动005或连续演示。raw order1144/1147 仅实际执行 L_35631 reset→35630，
仍 down/frame0；下一 eligible auto 才执行 L_35630（0x0f [2,0,0]）转 up/frame0。
primary `script.c:3515–3547` 与 Game `event-system.ts:1254–1301` 明确 reset 不继续执行下一指令；
RF 当前 e20/take-dishes 正文显式 setEntityFacing(up)+frame0，不能用其同步行为推断 Game 也已完成。
build allowed 仅修 saves 执行器等待：绑定 dlg.142 后同 visit 的实际 command/autoCall/run/step，
再等真实 world draw 的 [704,1072]/up/frame6；保持固定按键、内容和生产运行时。
工具冻结撤回，待有效反控、定向实跑和变化后硬门完成再冻结，并从001新建最终链。
本轮001–003及下方冻结记录保留原状，不能组成返工后最终全链；不改历史报告。

**重新冻结更新（2026-10-10，004 saves 返工后）**：真实 tickAutoScripts 消费 primary 全局命令的
定向正控与6类反控通过（reset 未转向、合法 wrong setter、漏 command、错 owner、缺后续 draw、
借用旧回执；另拒未绑定 afterOrder）。Game004 saves 新诊断
`game-004-saves-2026-10-10T04-09-19-235Z` passed，sourceHashesStable=true，pickup receipt 为
sourceOrder1521→terminal1526→draw1548，同 autoCall39/run2/visit2，真实 up/frame6；carry/end
存档与新上下文读回均通过。该诊断不算最终 acceptance。
当前 tools390/390、lint3371文件0 error/warning/info、全仓typecheck、content294/223/1934、
docs/testing-docs 0 issues、git diff --check均通过，日志`/tmp/type-pal-*-pickup-return{,2}-20261010.log`。
Codex独立复核允许重新冻结，从001创建第二轮全新固定输入最终链；六段正式 acceptance 必须全部
passed / 0 findings / 0 sourceChanges 后才制作 continuous tape 与 headed split。
冻结期间不改工具/内容/运行时依赖，不commit/push；失败即停止下游并核单一根因。

**冻结更新（2026-10-10，本轮反控结束后）**：tools389/389、lint3371文件0 error/warning/info、
全仓typecheck、content294/223/1934、docs/testing-docs 0 issues，git diff --check通过。
005/006完整诊断均0 findings，boat/leader合同闭合；e93、restored cursor、逐transition路线、
e59、e83和e117各项有效反控均拒。最后mounted-rower-counter完整正控0 findings；合法实际draw
order65011/frame0→1使用已有decoded资源，resource仍proved，完整比较因actual rendered frame不符
拒绝且没有mounted frame证书，日志`/tmp/type-pal-mounted-rower-counter-20261010.log`。
Codex独立复核准入冻结后最终双轨001–006重录；从001创建全新真实固定输入链，每段正式acceptance
必须passed / 0 findings / 0 sourceChanges，然后才可continuous tape与headed split。
此刻尚无最终链acceptance；冻结期间不改执行/录制/比较/内容/运行时依赖，不commit/push。

- e35 候选核验：撤掉接手时刚加在隐藏前的 fixed-left。`L_1026` 是 opcode 0x40 的 trigger mode；
  `L_1066/L_1068` 的 opcode 0x16 operand 37 指向零基 e36，不是 e35。e35 的真正 left 来自
  `reference/sdlpal/play.c:107–153` 与 `packages/game/src/core/scene-system.ts:224–249` 的自动触发
  caller；旧 Game raw order12929 在 command12956/ip1026 前已转 left。修 s002/e35 入口为
  faceEntityToParty + frame0，保持隐藏前无固定转向。e36 首次/两个 repeat 步骤补同一入口合同。
- e123 独立根因：Game 006 order35790 的真实手动 caller 先转 left，随后 L1465 正文、右四步、下四步。
  RF legacy-002 缺入口转向；补 live-party facing/frame0；状态具体数字经下文补核恢复 primary state2。
  真实 compiler/RuntimeScriptRunner 的 e35/e36/e123 作者反控先红后绿；3 文件 92 项定向检查通过，
  `/tmp/type-pal-e123-entry-{red,green}-20261010.log`。新增 entry pose 不代表完整 006 已验收。
- 恢复 cursor：原 `/tmp/restored-cursor-counter8.mjs` 在本环境已不存在，重建等价的真实原件反控
  `scripts/e2e/restored-cursor-provenance-counter.mjs`。e91 capture20632/snapshot12 的合法同 digest
  body15→body14，capture/projection/resume/path 同改，handoffs 仍 proved；保留 capture 前的真实
  source actor/poses，最新 cursor 守卫拒绝。日志 `/tmp/type-pal-restored-cursor-provenance-20261010.log`。
- e93：`scripts/e2e/automatic-draw-counter.mjs` 在 byte-bound 旧 005 正控上 exercised 当前证书；
  改实际 draw order19776/render1410 的 frame10→13，并使用更早真实 decoded frame13 的资源，
  位置/geometry/actor/effect/slot/wait 不改。资源仍 proved、变体拒绝且没有 causal language 证书，
  `/tmp/type-pal-e93-causal-counter-final2-20261010.log`。这是反控诊断，不是旧 005 acceptance 续授信。
- Game 白框来源模型：`game-state.ts:1897` 初始化 top，`event-system.ts:1953–1962` 真正结束 trigger 后
  复位 top，primary reference `text.c:1814` 一致。比较器原初始化 bottom 且跨段继承；改为 source
  dispatch + 无活动 cursor / 无 dialogue 的实际 event-after 结束证据才复位，不借 auto end / 待确认
  end。真实 Game 三段 top→bottom→top 的页面/输入/绘制反控通过；删除 end、改 page slot 均拒绝。
  两文件 34 tests；旧 Game006 95 pages 因果核验 proved，仍仅诊断。
- boat terminal：最后 draw 不是动作终点。旧 Game 最后 sample 为 [126,34.25]，真实 retry1516
  commit46626 后 continuation46628/ip1517 为 [126,34]；RF slot213 settled76923、leaf76928 同为
  [126,34]。`boat-terminal-contract.mjs` 独立核 primary 命令、同 run/visit、latest actor own pose，
  RF 实际 canonical ride / slot / completed leaf / fade continuation；保留全部 motion artifact/draw
  合同，把 sampledEnd 与已证 end 分开。每轨三项 raw 反控均拒（缺 completion、错 own pose、
  actor/pose 自洽改为 [126,34.25] 且全部 draws 原样）；日志
  `/tmp/type-pal-boat-terminal-counter-final-20261010.log`。未使用 0.25 容差。

最近一轮完整门为 tools388/388、lint3366 文件零 error/warning/info、全仓7包typecheck、
content294/223/1934、docs/testing-docs 0 issues，日志 current2/current3；此后又修 boat 区间的 slot
前缀与逐leg路线证书，并新增 raw counter，必须再跑变化后的硬门。native/author/runtime 定向119项
已通过。s002/s005 改动使旧 RF 前驱 digest 失效，必要诊断前驱已重建；该单轨链不作为工具冻结后的
最终 001–006 链。005c 因录制期间比较器依赖变化被 sources-changed 守卫拒绝，不能使用；替代005d
与006c均独立passed，当前完整比较仍为诊断，不宣告通过。

仍待闭合：006 新件的完整 generic 与 boat/leader 比较；005 的 e76/e83/e84 路线证明及反控。
sameSampledRoute 已撤回，不保留只核 compact direction/首尾/draw数的宽证书；剩余
sameAuthoredRouteProgress 必须逐transition绑定独立 Game source call 与真实 authored motion slot，
逐leg验证目标、stride与完整draw；不能把不同leg的direction-wide最大步距当共同真值。e59 候选已通过
五类真实反控，正式 caller 的新件接线结果仍须复核。e59 原自动目标仍 [137,72]
（L1166），下一目标 [137,52]（L1168），不能改成触发停止点 [137,73] 来掩盖固定输入/调度差异。
冻结后才从001重录两轨全链并要求正式 passed / 0 findings / 0 sourceChanges，再进入两个演示。
无下一位 Agent 提示词，由同一 Codex 继续核验与收口。

#### 006 当前根因补核（2026-10-10，已诊断重录，未正式验收）

- e203：primary `L_36140` 的两个 wait6、frame1、wait9、frame0 确实是动画，不得把 sprite196
  全局静态化。`reference/sdlpal/play.c:60–85` 先跑完 onEnter，Game
  `event-system.ts:1194–1212` 的实际调度对白期间不跑 auto；旧 Game s014/e203 order46704/46712
  后没有该 actor 的 auto command，实际 draw 全 frame0。RF 同一阶段 action-selected78653 后实际
  frame1 draw79385，独立页面动作推进是根因。保持 `main.ts:3888` 的对白/NPC 解耦裁决，build allowed
  仅 s014/default onEnter 显式 take/release e203，不改运行时全局门、不删比较实体。真实 bootGame
  测试消费 canonical entry/page/pose（只适配 fixture IO/address），删掉接管后实际画出1；
  有效 red `/tmp/type-pal-e203-entry-red3-20261010.log`，green 同名 entry-green，邻居继续、释放后恢复。
- e123：纠正上文“已批准 state3”用语；旧卡 state3 是实现方案，未取得该具体数字的用户裁决证据。
  primary EventObject123.sState=2；L1070–1072 只定位、选 trigger、设 facing，Game 当前真实恢复值2。
  `content/src/script.ts:405` 的2/3都可见挡路，但 `script-world.ts:804` 的状态条件按整数精确判定，
  故不授予 state-class 归一化。build allowed 恢复原值2并同步006真实caller断言；原卡历史方案不改。
  实际 author compiler/runner 已先红（收到3、期望源值2）后绿；与 e203/入口治理合跑94 tests。
- e116 ride facing 前提：primary `script.c:203–307` 只更新 party direction 与载具 x/y，不写载具
  direction；Game `event-system.ts:4840–4915` 同样保持载具 facing。RF `main.ts:2790` 把 ride 直接
  转为普通 move，`main.ts:4020` 使用 walkTick facing，native bootGame 已复现 left→up。最强替代解释
  是内容主动要求载具转向；当前 canonical ride 无转向命令，真实Game boat全down，不支持该解释。
  可证伪观察：primary ride 写载具 direction 或 caller 有真实 setEntityFacing。build allowed 仅在真实
  ride 注册的暂态 motion slot 标识保留当前 facing；普通 move 仍转向，轨迹/速度/坐标/终点不变，不改
  authored/save schema。同步 recorder 与独立 motion/pose oracle，并以普通move替代ride的合法反控验证。
- e123 脚本单步相位：primary `scene.c:887–902` / Game `event-system.ts:515` 每次真正 step 推进同一
  currentFrame；Game实际八步画10/9/11/9、1/0/2/0。RF旧raw八步为10/10/10/10、1/1/1/1；
  `main.ts:3830` 在无slot的脚本wait世界拍清掉gait，下一step从0重启。build allowed 仅在同一实体仍由
  script authority 接管时保留已有单步gait，release/收尾/显式pose仍清理；move终点继续显式清gait。
  同步独立pose reducer。native test消费canonical两段四步/100ms等待，合法8帧fixture核1..8真实
  phase与实际draw，旧实现为红；不加手工frame序列或改源步距。
- e117 boarding：Game source L1516 的第一船步 order37863 先走至[126,51.75]，rower仍[124,54]；
  其首个 L36147 nudge/animate order37881 才在下一source tick发生。RF旧mount order64073在船尚
  [126,52]时把rower从54拉到54.25，order64091实际画出跳动；不是遮挡推断。build allowed 用两个
  精确ride leg表达同一源动作：先载party完成源第一步，再以已到达的真实2.25偏移挂rower，续至34。
  不改mount公共语义、不加位置容差；第一目标由源4/-2px步换算，不能是任意中间点。
  native正/反控消费canonical carrier与rower auto caller，红证据为实际[6,6.25]非源[6,6]；
  终点合同必须核两leg各自slot/completion、canonical occurrence及源第一步，不准只核总终点。
  只分leg的候选被真实rower auto caller反控拒绝（船还没动，rower先走到53.75）；因此必须先显式take
  rower，源第一船步后以mount权威接续，再释放其automatic wait到mount语义，不准用无auto的fixture授信。
- e117 自动周期为另一个已证作者正文根因：primary `script.c:2056/2277` 的0x6c同次nudge+animate、
  0x7d仅nudge；L36147–36162共16拍，L36163零延迟goto同source拍续跑（Game event-system.ts:1303）。
  当前author把两个0x6c各拆成两个100ms等待，并把圈尾等待写140，实际compiled调用合同为18个wait。
  `packages/migrate/README.md` 明确原剧情转换核已退役，当前场景正文不重生成；build allowed只修当前
  e117/legacy-001作者周期为16×100ms及同拍effect对，不重启已退役转换器、不改资源供应baseline。
  正/反控消费真实primary slice和canonical compiler/runner，日志rower-cycle-red2/green；先前red
  使用错误的host.wait观察点不算有效反控。

#### 当前诊断件与工具反控（2026-10-10）

- 当前内容下 RF 前驱诊断链：001 `reforge-001-2026-10-10T02-53-58-983Z`、002
  `reforge-002-2026-10-10T02-57-39-509Z`、003 `reforge-003-2026-10-10T02-59-25-306Z`、
  004 saves `reforge-004-saves-2026-10-10T03-00-23-697Z`、005 saves
  `reforge-005-saves-2026-10-10T03-06-44-523Z`、006 `reforge-006-2026-10-10T03-09-27-924Z`，
  均在 build/e2e 下，各 report.status=passed。工具尚在修订，不是最终冻结链，不替代旧Game的重录。
- e59 build allowed 只补证书：primary L1166/L1168 exact slow goal、1076实际selector；Game完整caller
  census、逐call原始4/-2px步/current frame、latest same-visit source actor；RF真实两run/slot的
  canonical occurrence、每个应执行step、真实take/select/release/cancel与离场边界，leader pages必须
  精确绑定自身第一leg的中断点。旧诊断Game 12+4步，RF 13+5步；这是独立因果进度，不是0.25容差。
  `interrupted-route-counter.mjs` 五项变体均拒：合法错误目标且所有actor/draw不变、借用另一轨leader
  坐标、错误native相位、缺latest actor、错误stride。日志 interrupted-route-counter-20261010。
- boat-terminal 新006正控曾被误拒：boarding区间裁剪了先前ambient slot的registration，却留下该slot
  cancellation；必须以完整raw前缀核slot lifecycle，再按两条真实ride occurrence选择证据。
  修前有效红 `/tmp/type-pal-boat-terminal-counter-current2-20261010.log`，修后current3两轨各三反控
  均拒；RF真实第一leg settlement64206/completion64209=[126,51.75]，末leg
  settlement77269/completion77272=[126,34]。adapter合同新增合法跨区间ambient slot；2项通过。
- 撤回sampled宽证书后的旧005诊断重新暴露e76/e83/e84，不能回填旧报告为通过。
  `/tmp/type-pal-route-binding-diagnostic-20261010.log` 已证明e76/e84各个transition均有独立真实
  source call/slot；旧legFor把corner只归前leg，且direction-wide最大stride错误混合slow/normal leg。
  当前候选改成两端均属于一个同向authored leg，并依靠各自primary/slot的精确步距证明；actual raw
  `/tmp/type-pal-authored-route-counter2-20261010.log` 正控实际 exercised e84 证书；保留 compact
  directions、起终点、全部 draw 和合法资源，仅将相邻两步改成0.375/0.125，即拒绝精确 authored stride。
  第一轮 counter 构造误改 cached before 而未同步 state，不能作有效反控；保留原失败日志。
- e83 不是内容目标错误：005原卡已批准 foreground 十二步走近的实际停步点[139.5,34]，不能改成
  原L886尚未走到的最终目标[140,32]。`reporting-route-contract.mjs` 绑定L903相对party摆位、L905
  实际安装L886、L907实际12-frame wait及12次source calls；canonical report/1 relative和report/5
  normal slot均须实际own party/actor、exact0.375步、settled、完整九行对白及draw。default巡逻前缀
  仍逐transition/leg/stride核验，relative reset不是普通路线步。真实raw五项反控均拒绝，日志
  `/tmp/type-pal-reporting-route-counter2-20261010.log`。首轮误把scope外的background return纳入正文
  正控已撤销，counter改用正式caller同一storyProofPrefix；原失败日志保留。
- 当前006完整诊断曾仅剩e117 movement-frame：每轨71次exact0.25 carrier movement相同，循环在
  第32/36/48/52等步出现实际frame0/1进度差。primary script.c:2056/2277及自动跳转3515/3550，
  Game按source update执行，RF runtime-frame-session.ts:74–111按实际100ms deadline、首个到期帧
  续行，carrier有独立世界cadence；不得把不同clock的phase采样当共同literal证书。新增有限图nudge
  effect，L36147–36163与canonical e117/legacy-001精确同拍nudge+animate/16×100ms证明通过，
  四个合法作者反控均拒。候选mounted-rower合同还要求实际L1515 selector、真实run/source call/
  wait/control、mount authority、两leg terminal、完整draw和每个RF draw=latest同visit actor frame。
  只解释matching carrier movements的动画进度，不豁免任何坐标/facing/state/visibility。
  完整006及合法draw frame0→1反控仍运行，不能在结果前授信。一次接线误引用未定义变量导致诊断
  中止，已改为实际movement.transitions；失败日志mounted-language-diagnostic保留。
- 续修门当前tools389/389、lint3371文件0 error/warning/info、全仓typecheck、content294/223/1934、
  docs/testing-docs 0 issues。完整005/006诊断及mounted draw反控尚未完成，工具未冻结；没有正式
  重录或演示准入。日志e2e-tools-route-candidate、lint-route-candidate2、typecheck-route-candidate、
  content-route-candidate、docs-route-candidate2均为20261010。
- 随后完整诊断结果：`/tmp/type-pal-005-route-candidate-diagnostic-20261010.{json,log}` 的
  storyTiming passed / errors=[] / findings=[]，e76/e83/e84均实际使用逐transition证书；006同名
  route-candidate-diagnostic亦为passed / errors=[] / findings=[]，实际使用mounted rower窄帧证明。
  `/tmp/type-pal-006-boat-current-diagnostic-20261010.log` 两轨special proof与boat compare均通过：
  actual terminal均[126,34]，Game sampledEnd仍[126,34.25]；leader各自[137,73]/[137,72.75]由
  同一raw的interruptedRoute精确绑定。不是坐标容差，未删关键实体。mounted-rower-counter完整
  正/反控尚未结束；这些均是诊断，未生成正式acceptance/0sourceChanges结论，工具仍未冻结。

本节诊断日志全部在/tmp；没有正式acceptance、continuous tape或headed split证据。历史raw/report
保持不改，未commit/push；无下一位Agent提示词，同一Codex继续。

### 2026-10-09 当前真实进度（未收口）

#### 最新接手增量（本轮）

本轮复核结论（2026-10-09 后续）以当前源码和 raw 为准：此前 `literalDomainProgress` 证书已撤回。独立 raw counter
`/tmp/e93-literal-counter-result.json` 将同一 Reforge e93 actor-render 的真实 frame 10 改为同 sprite
已有资源 frame 13，`checkSpriteResources` 仍 proved 且旧 comparator 曾 0 findings；这证明只核 literal 集合、
资源域和 draw 数量不足以授权差异，不能接正式 acceptance。当前窄替代证书要求 source/authored effect 集合、
真实 binding runs/sourceCalls、双轨完整 draw coverage，以及 Reforge 每个实际 drawn frame 与最近 actor
observation 的精确因果绑定；同一 counter 必须拒绝后才可重录 005。

同一独立审查发现 restored cursor provenance 缺口：`/tmp/restored-cursor-counter8.mjs` 将 e91 capture、
projection、resume、path 自洽地改为另一合法 digest 内 cursor 后，旧 `verifyRestoredAutomaticActivations`
仍 accepted。该合同尚需把 saved cursor 绑定 capture 前同 activation 的真实 source leaf/step、sceneVisit、
path 和 latest actor observation；此项未闭合，不能给跨 visit 恢复证书授信。

当前 006 的真实 raw 曾暴露三项工具链问题：boarding interval 起点晚于 island-arrival route、artifact 与
interval 不同源、scene gate/action pose contracts 的误报。interval/artifact 同源修复、无 auto scene gate
和 action scene mutation 的窄合同已写入候选并有定向测试，但随后 e59 cancellation/pose 与完整 006 generic
链仍未重新录制。此前所有 006 raw 只作诊断。

本轮继续收敛：action preparation 现在只在有真实同 scene mutation command 且逐实体绑定变更时允许
capture→prepare 差异；scene lifecycle gate 只在该 scene/visit 实际启动 auto runner 时要求 runner；
pose reducer 对真实 `observe:causal` / motion cancellation 清理 gait，并用按 sceneVisit/entity 索引的
latest actor observation 做每个 drawn frame 的因果核验。006 旧 raw 上这些检查已能通过 story pose 的单独调用，
但完整 generic 006 compare 仍有 e35/e36/e59/e116/e123 等关键实体的真实朝向、终点、帧序列和对白因果红项，
不能用 scope 缩减或坐标容差放行；需继续按实体/合同核根因。

独立审查已确认 e93 literal-domain 反控和 restored e91 cursor/path 反控均为有效 verifier 漏洞；前者已撤回，
后者已加入 latest source actor cursor 与 source occurrence path 绑定，`/tmp/restored-cursor-counter8.mjs`
现拒绝。same-route 证书新增 authored-leg 与逐 transition stride 约束；尚未取得正式 005/006 新 acceptance。

最新硬门（本轮最近一次源码变更后）：`pnpm test:e2e-tools` 388/388、lint 3360 文件零 error/warning/info、
entity-action/story-pose 定向测试通过；完整 typecheck/content/docs-testing 需在下一轮 contract 修复后再跑。
最终 001–006 链、continuous live-page tape、headed 左右分屏均仍禁止推进。

本轮先复现并保留 reviewer phase-counter 反控：真实 e91/e92 正控仍为 116/95 increments，capture12
为 gait80/67；15 项有效 raw 变异全部拒绝，包含 53716/53917→21949/21950 借序、旧观察、错误
state、插入新观察及 step 窗口。`restored-automatic-cycle.mjs` 与 `closed-layout-counter.mjs --restored`
继续以真实 raw 正控 e91 capture21951→projection52893、e92→52895，旧 slot50 无 commit 后新
slot215 单次 commit；均未接正式 acceptance。

针对 primary `event-system.ts:700–730` 的 600ms scene palette gate，Reforge 无 entry 场景原先在
260ms fade 后立即启动 auto；已在 `packages/reforge/src/main.ts` 保留对白并行与 restorePayload 即时
恢复合同，只把无 entry 场景的 auto 启动推迟到剩余 gate 时间。`story-presentation-intent.mjs`
现在把该 loadScene timer 作为 scene lifecycle receipt，`opening-causal.test.mjs` 有有效正/负控。
targeted runtime 61/61、opening causal 19/19 通过。

同一真实 004 saves 前驱的 005 story 已重新跑：
`build/e2e/game-005-story-2026-10-09T18-51-49-802Z/report.json` 与
`build/e2e/reforge-005-story-2026-10-09T18-50-19-080Z/report.json` 均 independent passed；
入口 gate 正控仍为 Game 870.4/874.0/875.3ms、Reforge 609.6/610.8/611.2ms。最新同版正式比较
`/tmp/type-pal-005-current-formal-v1.json` needs-review、27 findings、0 sourceChanges，
storyTiming passed；e83 的 before-render 实际 auto-gait 清理已被比较器重放，并以方向序列、
初始/终点 canonical position 和完整 draw coverage 证成“同作者路线、不同中间采样”。剩余 27 项
是 e76/e84 路线/朝向/终点、其它跨 visit 姿态/帧及 actor-render sequence 等真实差异，尚未裁决。
fresh story 不是最终冻结证据，001–004 也尚未在本轮工具冻结后重录。

含 e84 facing 的当前 005 双轨 story 原件为
`build/e2e/game-005-story-2026-10-09T19-15-22-109Z/report.json` /
`build/e2e/reforge-005-story-2026-10-09T19-15-22-074Z/report.json`；离线重比
`/tmp/type-pal-005-final-route-progress-v3.json` 的 storyTiming passed、24 findings、2 sourceChanges，
e83 sampling/timing 与 e84 same-authored-route-progress 三证书均命中。最终 001–004 当前链均正式 0 findings/0 sourceChanges；
005 必须在工具冻结后再重录，才能取得 0 sourceChanges 正式收据。

随后 multi-visit stationary 合同覆盖了 e85/e86/e89/e90 的实际 continuation projection/own pose、
self pose writers 与完整 draw coverage；`/tmp/type-pal-005-final-e90-cert.json` 降为 4 findings。
当前 e87 dynamic selector/restart 已由实际 source opcode36、Reforge disabled→legacy selector、
self pose writers 与多 visit stationary continuation 证书闭合；e93 literal-domain 也已完成精确
证书：primary nSpriteFrames=2、source/authored literals 8–13 相等、实际 language/slot/wait/draw
和 sprite direction domain 全通过。最新离线比较
`/tmp/type-pal-005-final-literal-domain-v3.json` 已 `passed / 0 findings`，仅有 2 sourceChanges；
未做未知 literal 或 selector 批量放行。

本轮最终链前四段已用当前内容/工具从 001 重建并正式通过：
`both-001-2026-10-09T19-00-57-847Z`、`both-002-2026-10-09T19-03-34-951Z`、
`both-003-2026-10-09T19-08-45-019Z`、`both-004-2026-10-09T19-10-49-042Z` 均
`passed / 0 findings / 0 sourceChanges`。005 当前 `both-005-2026-10-09T19-15-21-544Z`
两轨六 journeys passed，但正式比较仍 needs-review；006、continuous tape、headed 左右分屏
尚未启动。
随后比较器又接入了 e76 route-progress、multi-visit stationary 和 e90 animate 合同，因此上述
001–004 收据只保留为上一工具版本诊断证据；工具冻结后的最终 001→004 仍需重新录制，不能直接
作为最终链收口证据。

恢复合同已从 opt-in counter 接入正式 storyTiming；e91 实际 `resume.frames` 为三帧（含两个
loop/body control），e92 为两帧。按实际 loop-body frame 栈扩展合同，并在 gate-pending 保留
restored gait 的运行时修复后，formal restoredAutomatic 对 e91/e92 各有 1 个 restoration、
phase93 均通过；projection receipt 与 activation own pose 保持同一 commit/state，未借最新
actor 观察覆盖 projection，也未借 committed continuation 放行。

e84 初始朝向根因现已允许推进并接回 `projects/pal/content/scenes/s004.json`：primary
EventObject84 `direction:2` 与 Game 首状态均为 `up`，Reforge canonical 由缺省 `down` 改为
`up`。作者工程检查已通过；旧 Game 18-21-42 诊断 raw 与旧 RF predecessor 不再作为证据，需
随内容 digest 更新后的 001→前驱链重录。e84 后续路线/终点仍是独立差异，不由此修复一并放行。

本轮更新 sourceRef 后 `check:testing-docs`/`check:docs` 均 0 issues；新增 reducer 接线后的完整门为
E2E tools 387/387、lint 3360 文件零 error/warning/info、全仓 typecheck、content check 通过。
006、最终 001–006 链、continuous tape、headed 左右分屏继续禁止推进。

最新005诊断链`both-005-2026-10-09T08-07-36-201Z`两轨六journeys passed，正式比较
needs-review、35findings、0sourceChanges；006及连续仍禁止。e87首auto-before Game帧1、RF帧0
是真实初始状态错误；source EventObject id87/currentFrameNum1，sss.ts:122直接解word11，
game-state.ts:2011物化scriptedFrame；RF sprite-42 static/default页没有初始动作。
publication仍只供资源/current baseline保留作者正文，同e88已核ownership，不是假定迁移缺陷。
原生page/action/render正控扩至e87，先红4/5（错误frame0），
`/tmp/type-pal-e87-initial-red-20261009.log`。最强反证是首auto前其它writer合法改0；
独立raw/primary核查须排除。Codex premise verified/build allowed仅sprite42单帧初始pose及
e87 default animation绑定，保持auto正文/其它实体不变；修后setter0必须仍优先、删绑定须拒。
所有既有链仍诊断，内容变化后最终冻结新链仍须从001重录，不授35findings通过信用。
e87候选独立accept：原生5/5、content294场景/223地图/1934资源、全仓typecheck通过，
lint3348零error/warning/info、docs0、完整tools384/384含Chrome watchdog。日志
`/tmp/type-pal-e87-{initial-green,content,types,lint,docs,tools}-20261009.log`。
下一窄合同为通用single-visit stationary self-pose循环证书，不按ID白名单：相同primary初始root、
仅本实体frame/facing效果、位置/朝向/显隐/state/sprite稳定、无authority/selector/跨visit，
所有源command按已核primary效果分类排除incoming writer，未知opcode拒；全部实际effect/wait/draw
仍须已有正式bridge通过。本次e116源4轮/RF7轮真实同root0，不能用名义图单独豁免。
bridge_review直接读全部4099 Game command及RF全leaf：无117 target/self116 trigger，
0x6f写self非operand target、0x87按真实owner；未执行range writer，RF无外写/authority。
Codex premise verified/build allowed只为该窄比较证书与有效反控，不改变运行时或剧情/输入；
错seed/漏setter/错等待/错draw/外writer/未知opcode/跨visit均须拒。e89返回root不同及e87/e88
联合restart不获该证书；其余35差异不批量放行，最终005仍须重新实录。
stationary候选独立counter已闭合：取首次activation实际最新actor输入，精确绑定run/auto-before
自己的姿态及commitOrder，resume非null拒；call/leaf/draw排重与同前缀tuple完整绑定。
真实旧005原件opt-in `scripts/e2e/stationary-cycle-counter.mjs`拒18种变异；229/1038实际draw
正控及两侧错draw帧均由正式presentation函数拒绝。该实验不出版acceptance。
`/tmp/type-pal-stationary-counter-final-20261009.log`；0x6f写错对象的原生变异红，
删除seed守卫的实际raw变异红，已恢复；日志`/tmp/type-pal-stationary-{writer,seed}-mutant-red-20261009.log`。
bridge_review独立实测18拒绝/原生1绿并窄accept。正式caller只在同次raw的所有presentation/
effect/wait/control/language门全通过后派生证书，仅豁免actor-render-sequence采样次数，
不豁免路径/朝向/终点/其它finding；未知domain保留decline。旧报告离线对比仅诊断，非最终录制。
本候选完整tools385/385、lint3351零诊断；docs首跑两处比较器hash不符，已更新common-issues/
evidence/catalog当前hash再跑docs0；历史报告原样。离线旧005现为68findings/6sourceChanges，
包含当前e87初始1对旧RF0的准确拒绝，storyTiming因此失败且不会放行stationary证书。
`/tmp/type-pal-005-stationary-diagnostic-20261009.json`不是34finding或新E2E通过。
下一窄候选singlevisit closed self-step：e121/e122首root共同0/down/state/sprite/position相等，
两侧有限图全部choice/合流/回边空间potential一致，32/40 source step节点、cycle净位移0，
source实际±4/±2对应canonical0.25及authoredMotionStep。独立全incoming census无外写/
selector/authority。Codex premise verified/build allowed仅比较证明与真实反控；必须逐source
before/after绑定root+ip势能、RF occurrence/slot实际起止绑定作者势能，未完成slot不提前计位移，
并从primary初始帧沿实际word解释动画，每draw仍独立核；drop/错stride/错frame/非单visit拒。
e91/e92虽然各循环也闭合，但有跨visit/resume且Game缓存祖先收据缺口，明确不获此证书。
closed候选真实反控复核发现末draw之后terminal只核位置的缺口：e122末draw52402，
末actor52448篡改facing仍accept；现以同一效果fold独立走至terminal核position/facing/
当前frameDebug输入，Game末actor精确绑定末auto-step自己的pose/commitOrder与after。
再补terminal未知高优先输入及source invocation身份守卫；`frameRendered`可能是上次图像，
终点不把它当current phase；hydrate后的autoFrames16不能误当静态dump0。
`/tmp/type-pal-closed-terminal-counter-v5-20261009.log`拒33实际原件内存变异，78真实
committed steps及pending prefix1step/0commit正控通过；所有原件不改。Game e121这批229draw
实际全部culled，不能称可见Game帧覆盖，错draw反控明确是culled-frame-insertion。
正式caller仅同raw全部前置门passed后派生单visit证书，initial/visible/state/sprite仍精确，
final位置还要求比较器两轨实际终点分别等于各自证书终点；e91/e92/resume仍decline。
本候选全仓typecheck/content通过，lint3353零error/warning/info，完整tools386/386含
Chrome watchdog；docs首跑2处当前hash债，核源更新三份metadata后docs0。
日志`/tmp/type-pal-closed-{types,lint,content,tools,docs-final}-20261009.log`。
这些仍为工具/诊断证据，未宣布最终001–006或连续演示通过；不commit/push。
接线独立复核继续给出无draw outgoing缓存尾和active中间facing反控，均先保留counter，
不以完整draw计数冒充这些观察已证。现所有非active尾观察精确等于自身终点；active全部
position/facing沿真实效果回放。RF main.ts:4267–4268先pos后facing，采用实际位移order及
同slot/run/visit唯一commit自己pose.commitOrder分开解释，不能假定两次观察原子合并。
Game call内只允许本次before/after精确组合，call间必须前次after/primaryroot。
`/tmp/type-pal-closed-observations-counter-v3-20261009.log`36拒绝及真实pending正控通过；
新增两轨无因中间朝向、无draw缓存尾反控。补后tools386/386、lint3353零诊断、docs0，
`/tmp/type-pal-closed-observations-{tools,lint,docs}-20261009.log`。
在发现这些接线根因前已启动的链只能作候选诊断：001 `both-001-2026-10-09T09-37-56-550Z`、
002 `both-002-2026-10-09T09-39-59-639Z`、003 `both-003-2026-10-09T09-44-52-065Z`
两轨独立执行及正式比较passed；尚非最终冻结后的001–006通过，006及连续仍不运行。
closed窄接线独立accept已收：e121/e122各78实际commits，原e122 actor23029中间朝向
反控现拒。候选004 `both-004-2026-10-09T09-46-01-903Z`六journeys passed，但正式
needs-review：e62 actor-render-sequence一finding、0sourceChanges、storyTiming passed。
005/006/连续已停。只读真实前驱排除本侧丢帧：Game003 saved allEventObjects62 frame1/
cursor736、末actor7087与004 materialized2067/auto-before2218一致；RF003 saved fixed0/
explicit0、resume frames loop1/body5、1300ms wait余1150，末actor7001与004 loaded6/
projection1614/run1638/consumed1652一致，未重启等满1300。两份003 save sha分别与004
predecessor收据直接相等。primary734–739/作者200入場+(frame1 wait200;frame0 wait1300)
已由003各自实际cycle证明；004原660设frame2、662停auto，RF相应停auto/set2，终点
两侧hidden/state0/frame2。最强反证是自己的保存值与恢复/剩余等待不同，本次直接排除。
Codex premise verified/build allowed仅跨前驱循环相位、take及共同setter终结的比较证书，
不改runtime/作者/输入，不把此actor套单visit纯self证书；须重核前驱raw/保存字节hash/
自己的末pose/恢复pose/原wait余时，首错phase/丢setter/错余时/未停auto/错实际draw反控必拒。
captured-ambient候选已接正式比较，独立复核进行中。仅saved steady cycle图从735进入，
不把source出生首call时钟100与作者birth wait200错误宣布名义等价；003祖先真实raw合同独立
重算并校验保存字节/末pose，004实际load/resume/每次capture/projection/余wait独立绑定。
Game各visit实际autoCursor WeakMap runId连续，RF每次own snapshot；take/停auto/共同frame2
分别核自己的真实source committed selection及RF run-ended/leaf-completed，实际draw不得脱离。
`/tmp/type-pal-captured-counter-20261009.log`23种实际raw/保存负例拒绝，正控108 source calls、
415/1323 scoped draws；实验原件不改且不出版acceptance。修正过实验恒同frame2→2及scope外
取样，未放宽合同。`/tmp/type-pal-004-captured-diagnostic-v6-20261009.json`0finding但4sourceChanges，
只作诊断，须冻结后从001重新录制。当前完整tools386/386含Chrome、lint3355零诊断、
typecheck/content通过；比较器hash变化更新三份当前sourceRef后docs0，历史原样。
日志`/tmp/type-pal-captured-{counter,tools,types,content,lint,docs}-20261009.log`。
用户要求日志不阻碍测试：inn events 32MiB已经实测，保留真实overflow反控；不因旧4MiB容量停测。
captured接线独立窄accept已收：reviewer直接复跑真实原件23拒绝，核祖先字节/原始合同、
两visit各自snapshot/余wait、source游标连续、foreground真实终结与仅render-sequence分类。
未找到基础门继续passed且其它finding保留情况下的可执行反例。静态冻结候选
`build/e2e/freeze-captured-ambient-20261009.json`passed，只是工具清单，不授旧report通过。
当前sourceRef行号同步完整render消费者257–333，含evidence claim，testing-docs0。
开始同冻结版本重新录制001；每段须正式passed及0sourceChanges才推进，仍未完成最终001–006。
冻结后新001 `both-001-2026-10-09T10-36-10-083Z`正式passed、0findings、0sourceChanges；
独立G `game-001-2026-10-09T10-36-10-693Z` / RF `reforge-001-2026-10-09T10-36-10-700Z`
均实际正文/存读/控制权passed。002已只用这两份真实新前驱开始，后续还未完成。
新002 `both-002-2026-10-09T10-37-49-679Z`正式passed、0findings、0sourceChanges；
G `game-002-2026-10-09T10-37-50-168Z` / RF `reforge-002-2026-10-09T10-37-50-167Z`
真实独立执行均passed，events 32MiB未超限；003仅用两份新002开始。
新003 `both-003-2026-10-09T10-39-26-340Z`正式passed、0findings、0sourceChanges；
G `game-003-2026-10-09T10-39-26-814Z` / RF `reforge-003-2026-10-09T10-39-26-797Z`
均真实独立passed。004正文/物品/存读两轨六journeys开始，仍不授未完成段信用。
下一项仅只读真值核验，不授权当前冻结内实现：旧005 e91/e92的source游标有真实WeakMap
身份（opening-causal-instrumentation:316 / script-causal-observer:94–102），各93正文调用
完整after→before连续，跨visit返回物化及首调用精确承接；RF有own snapshot12/余wait。
但primary nSpriteFrames2，不能套当前closed的mod4。sdlpal scene.c:893–900及Game
event-system.ts:527/present.ts:554–562按2折叠步进；RF sprite-anim.ts:19–21/62–96一致，
fixed override仍literal，不取模。独立原生fixture验证fixed2/up帧6→animate explicit3/up帧5、
gait2/up帧4，错误mod4帧7/6均拒；无浏览器/无文件修改，非E2E或跨visitaccept。
待fresh005证据再决定比较器泛化；当前录制过程中不修改工具或演员行为。
新004 `both-004-2026-10-09T10-40-25-450Z`六journeys及正式比较passed、0findings、
0sourceChanges。新003祖先bytes/raw重新绑定，captured e62本批108calls/416G+1315RFdraws。
正文G/R `10-40-25-962Z` / `10-40-25-945Z`、items `10-41-25-896Z` / `10-41-25-872Z`，
saves `10-42-07-969Z` / `10-42-07-944Z`；全部目录前缀为各engine-004-case-2026-10-09T。
005已仅用这两份新saves报告开始；006及连续仍未执行。
新005 `both-005-2026-10-09T10-44-11-221Z`六独立journeys passed，但正式needs-review：
30findings、0sourceChanges，storyTiming/12bindings均passed。e116静止证明及e121/e122
闭合证明真实命中，后者包含本批72step/71commit合法pending及90/90commit，不靠旧结果。
正文G `game-005-story-2026-10-09T10-44-11-785Z` / RF `reforge-005-story-2026-10-09T10-44-11-740Z`；
saves G/R `10-46-25-443Z` / `10-46-25-406Z`。剩e76/83/84路线与跨visit e85/86/89/91/92/93、
e87/88动态selector；不把needs-review冒充通过，006/连续仍禁止。本批未出现日志容量失败。
fresh e91/e92 source各93calls，游标run28/29及跨visit8→12完整phase连续；RF本批e91恢复
gait80/wait400余366.6，e92恢复gait67/pending step后new slot215实际单次commit再wait200。
不能照搬旧两实体都wait恢复的描述，后续须用该批独立原件闭合。
下一单根因layout2比较模型：primary scene.c:893–900、Game真实walkFrameMod、RF实际
deriveStepCycle/WorldScenePresentation均已核双帧步进周期2，固定帧仍literal；作者/schema/
运行时不变。fresh首次s004完整前缀G截止17462、RF21904，各80sourcecalls/119G+508RFdraws，
单visit完整root/census/control/effect身份门与42真实motion routes通过，closed随后只拒layout。
Codex premise verified/build allowed仅比较器派生phase period及实际prefix反控，不同时改跨visit。
最强反证是fixed2/up错误取模或mod4仍可冒充actual animate/gait；必须各有真实caller判别。
加入opt-in closed-layout-counter，校验同报告/raw hash并精确截真实draw span、保留全部此前
cause/pose。先记录当前layout unsupported红控，修后该prefix应走完整closed fold，而完整
005继续因跨visit等合同decline，不赋其自动通过信用。此前新001–004保留其运行时结果；
比较器发生变化后最终全链仍须冻结重录，当前任务不标done。
layout2单根因已闭合：红 `/tmp/type-pal-closed-layout-red-20261009.log`，当前双帧phase
派生修后完整prefix成功；e91 10/10commit，e92 32/31保持实际pending终点。
`/tmp/type-pal-closed-layout-counter-final-20261009.log`保留hash绑定、2原件正控及旧mod4
内存变异/两侧实际visible draw变异共6拒绝；原件不改。独立reviewer直接重跑窄accept，
fixed2/up资源6→animate资源5的literal边界不变；e93 literal13等仍不支持，不扩跨visit。
新counter首选到e93时正确触发旧大literal域守卫，现按layout2+step+当前literal域选实验，
不是entity ID白名单。完整00530findings仍保留，无全005/006/连续通过信用。
layout2后tools386/386、lint3356零诊断、docs0，日志`/tmp/type-pal-closed-layout-{tools,lint,docs}-20261009.log`。
下一根因仅closed self循环跨visit恢复。primary全局NPC current-frame/ip持续，Game代码真实
autoCursor对象WeakMap身份与fresh93 calls全phase连续；RF main.ts:4832/5262–5343先捕获
实际位置/fixed/motion/cursor/wait，再取消旧槽，返回时原生restoreEntity重投影。
fresh e91的400ms wait余366.6及e92未提交step已有各自真实链，Codex premise verified/
build allowed仅因果恢复证明与实际反控，不改runtime/作者/输入或扩dynamic selector、大literal。
full-prefix红控`/tmp/type-pal-closed-restored-red-20261009.log`当前仍需单activation而拒。
e92原槽50注册21903→capture12 21951→取消21977（无commit）→projection52895→
run209 52972→新槽215注册53069→commit53223；同leaf path initial/0/body/26、同digest/up。
保存resume末frame只有index26，没有control字段，不能补成continuation。旧run-ended22203
外层已s005/visit12，不能强求旧sceneVisit；须核runId/owner而非猜场景。
最强反控是保存motion相位+1/+2与project/start一致篡改；既有handoff只证明自洽，须再与
primaryroot起的实际效果累计counter、capture ownpose/commitOrder相连。未提交旧槽不能
推进空间/帧；新slot唯一commit才推进。已提交continuation不得借本批empty resumedOneShots
正控授信用，须独立实际原件/原生合同闭合。完整005仍needs-review，006/连续禁止。
恢复相位子合同已实现 `scripts/e2e/automatic-capture-phase.mjs`，尚未接正式acceptance：
只接实际初始register0、纯self step/animate作者word；每实际slot唯一commit及动画
completion自己的pose.commitOrder计一次，不按可见phase取模。fresh005 e91/e92实际
116/95次increment，capture12 gait80/67，与capture own最新观察及重投影/启动精确一致。
`automatic-capture-phase-counter.mjs`独立从报告/raw hash读取，按图域选取而非ID白名单，
每次重新派生slots/handoffs/motion。两侧capture/store/save assembly/payload/projection/
activation与ownactor一起+1/+2变异时既有native proofs仍通过，新效果word拒绝；另借旧
capture pose各拒，合计6有效反控（中间候选）；最终独立反控见下方15项日志
`/tmp/type-pal-capture-phase-counter-20261009.log`。
真实RF返回阶段还存在分字段staging：factory52825/52826→projecting52863→位置52867/
52868→runtime projection start52869→朝向/gait52892/52894→own receipts52893/52895。
至run207/209启动真实world draw0，首draw53162；factory frame6/5为旧绘制缓存，不能
作为当前phase。完整恢复证明必须保留这些观察并显式join原生生命周期和每条ownreceipt。
本子合同不授恢复cursor/slot重试/staging/draw/最终E2E信用；完整00530findings保留。
本轮Codex独立复核发现 reviewer 借序变异在当前 raw 上会先因 `21949/21950` 没有真实
actor observation 而 fail closed（原先的 mode 检查也会拒绝），不能把它复述为已通过；
根因合同仍成立：phase 不能直接相信 `completion.poses[self].commitOrder`。
`automatic-capture-phase.mjs` 现核同 actor/scene/visit 的真实 actor、深 state、最新观察及
合法窗口：`command < ownactor < completion`；step 则核实际位移 commit `<= ownactor <`
acknowledgement。`automatic-capture-phase-counter.mjs` 从同一真实 acceptance/raw 重派生
e91/e92，正控仍为 116/95 increments、capture12 gait 80/67，15 项有效反控全部拒绝，
包括 reviewer 53716/53917→21949/21950、旧观察、错误 state、插入新观察及 step 窗口；
日志 `/tmp/type-pal-capture-phase-counter-final-20261009.log`。这仍是诊断合同，不出版旧005
通过或正式 acceptance。
`restored-automatic-cycle.mjs` 已格式化并以真实 e91/e92 raw 正控：e91 capture21951→
projection52893，e92 同 capture→projection52895，旧 slot50 21903→21977 无 commit 后
新 slot215 53069→53223 单次 commit；修正了 `route.terminal`/数字 `route.end` 字段误读。
`closed-layout-counter.mjs --restored` 现在把 full-prefix 恢复证书与 first-visit closed
证书分开核验，并以真实 staging 位置篡改反控；e91/e92 均 `diagnostic-prefix-passed`，
日志 `/tmp/type-pal-closed-restored-counter-final-20261009.log`。没有把候选接成正式
acceptance，也未修改运行时、作者工程、固定输入或批量 NPC 白名单。
对下一根因的只读核查已排除“RF完全丢掉离场位置”：fresh raw 的最终 s004 projection 自有
`world.script.entityPos`/pose 分别为 e76 `[139,55]`、e83 `[153,42]`、e84 `[101.75,36]`，
与各自旧 visit 的 live observation 相连；Game 则在对应 scene materialization 形成自己的
`[139.75,58]`、`[153,44]`、`[100,36]` 前缀。当前剩余的是 e76/e83/e84 的路线段/终点/朝向
在两轨不同故事时序下的差异，尚未有足够 primary/semantic checkpoint 证据把它归为同一
runtime 根因，未修改作者目标、速度、坐标或比较器放行规则。
新增 `auto-entry-gate-counter.mjs` 直接核 primary `event-system.ts:700–730` 的 600ms
palette gate：旧005 raw 真实红于 Reforge 首 auto 比 ready 早约 0.7ms；候选 warmup 版本
以新005 raw 绿于 e76/e83/e84 约 628/630/630ms，Game 同批约 872/875/876ms。候选随后因
现有 SAVE/restore 合同仍期待立即恢复 auto 而撤回全局 warmup；红/绿日志分别为
`/tmp/type-pal-auto-entry-gate-{red,green}-20261009.log`。当前只保留无争议的 scene
淡入完成后再启动 auto 顺序修复，对白期间是否暂停 auto 等待用户取舍。
候选 gate 版本的实际 003 Reforge 复跑为
`build/e2e/reforge-003-2026-10-09T16-25-51-856Z`；候选 005 story 两轨为
`game-005-story-2026-10-09T16-31-37-302Z` / `reforge-005-story-2026-10-09T16-30-17-676Z`，
离线比较仍 needs-review，69 findings、0 recorded-source changes。它们只证明候选工具/运行时
观察，不替代工具冻结后的 001→005 重新录制，也不授 006 或连续演示信用。
本轮工具与质量门：E2E tools 386/386；lint 3360 文件、0 error/warning/info；全仓 typecheck、
content check、testing-docs 0 issues。日志分别为 `/tmp/type-pal-auto-gate-{lint,types,content,docs}-20261009.log`。
完整005仍 needs-review，e76/e83/e84、e85/e86/e89、e87/e88、e93 等独立根因未闭合；006、
最终001–006重录、连续 story tape、headed 左右分屏均继续禁止。保持不commit/push。

本轮最近运行时/内容版本诊断链（工具后续已变，不能作为最终冻结版本证据）：
001 `both-001-2026-10-09T10-36-10-083Z`、002 `both-002-2026-10-09T10-37-49-679Z`、
003 `both-003-2026-10-09T10-39-26-340Z`、004 `both-004-2026-10-09T10-40-25-450Z`
均正式passed/0findings/0sourceChanges。005 `both-005-2026-10-09T10-44-11-221Z`
两轨6journeys passed，正式needs-review/30findings/0sourceChanges；storyTiming及12binding
bridge passed。只从这些raw继续定位，待工具完整冻结后再从001录最终新链。
005 story原件：`game-005-story-2026-10-09T10-44-11-785Z/report.json` 与
`reforge-005-story-2026-10-09T10-44-11-740Z/report.json`，均在 `build/e2e/` 下。
006与连续/左右分屏均未执行。inn events已4→32MiB，新002无overflow；用户再次明确
日志不足就继续扩大，不能因此阻止测试，也不能将容量/Chrome watchdog误判剧情失败。

最新候选重录链001/002正式passed、0finding/0sourceChanges：
`both-001-2026-10-09T07-15-24-344Z`、`both-002-2026-10-09T07-18-09-294Z`。
新003两轨正文/正式存读passed，但`both-003-2026-10-09T07-20-05-536Z`比较needs-review，
6 findings、0sourceChanges；链已停在003，未启动本候选004–006及连续演示。
首root已独立核为oracle误把固定帧当自动步态：RF实际setter4039 frame1→take4128→authority4130/
pause4132→draw4143仍frame1；main.ts:1585仅接管/暂停，5718仅隐藏auto gait，
world-scene-presentation.ts:130固定帧优先。原版当前帧机制与该行为一致；目标仅纠正oracle。
build allowed为kitchen/inn同根因的帧来源区分，不改运行时/作者工程/输入。
最强反证是真实移动后接管的步态仍应变站立，或take期间setter被release旧帧覆盖；两者必须拒绝。
原生WorldMotionRuntime+WorldScenePresentation反控先红`1 !== 0`，修后绿；
inn原模型也独立红，修后保留合法fixed帧和接管期间新setter，篡改实际draw为0/旧帧仍拒绝。
日志`/tmp/type-pal-kitchen-fixed-take-red-20261009.log`、
`/tmp/type-pal-inn-fixed-take-red-v2-20261009.log`及`/tmp/type-pal-fixed-take-green-v2-20261009.log`。
bridge_review只读新raw/primary确认首root，无最终E2E信用。工具变更后上述001–003只留诊断证据，
最终仍须冻结后重录；离线诊断不得充当最终新录制通过。
独立复核另提出有效初始gait counter，已补`initial-presentation-source.mjs`：仅从首draw前
同actor/scene/visit实际观察的frameDebug取来源，缺观察/借actor/跨visit/晚观察均拒；已有override
优先，已有auto gait必须owner=auto且authority=world。原生e59实际markGait→take→release绘制
`[1,0,1]`；旧默认fixed模型先红`0 !== 1`，修后正控及四种来源反控绿；接管draw篡改1仍拒。
adapter按main只隐藏auto gait；不把无sprite测试TypeError当反控。
`/tmp/type-pal-initial-gait-{red,green,tools}-20261009.log`，完整tools383/383含Chrome watchdog；
新003离线六finding清零但保留4sourceChanges，仅根因诊断。07:35重录001发生于本来源修订前，
亦不得当最新冻结证据。当前仍未进入004–006或连续演示。

initial-source候选基础设施：`build/e2e/infrastructure-candidate-20261009-initial-source.json`
passed，12语言/6合同/12producer闭包/812来源；typecheck/content通过，lint3348文件零诊断、docs0、
tools383/383含Chrome watchdog及diffcheck通过。bridge_review独立accept初始source counter闭合，
初始已taken或非auto gait明确unsupported，未猜测其前态。
该候选重新录制001：`both-001-2026-10-09T07-40-27-380Z/acceptance.json`正式passed，
0findings/0sourceChanges；bridge_review独立核report/save哈希、36/30固定真实press全部完成、
末control与draw、生产存档/真实读回world+frame exact均accept。002沿07:40新001链执行中。
其余新链仍待独立复核/重录/比较，本节下方早先候选均历史或诊断用途，不能补足当前链。
07:42新002两轨journeys正文/正式存读passed，但正式比较needs-review：inn旧录制器e54首draw前
实际seed没有frameDebug，初始来源门准确fail closed。build allowed仅统一inn只读观测，
采用既有reforgeActorObservation并保留完整scene ID的behavior索引；不改产品/输入。
真实main AST插桩commit测试先红undefined→补采后绿；原生motion/presentation分别记录fixed1、
explicit2，清fixed后auto gait3/epoch17及script authority，旧快照仍1；不从display frame反推。
bridge_review独立核新raw及caller并accept此根因/观测候选。旧door测试适配新增只读getter且新增
collector errors=[]断言；完整tools首测382/383（door旧mock缺getter），定向补齐后通过，
原始失败日志保留`/tmp/type-pal-inn-collector-tools-20261009.log`，不改写成全绿。
`/tmp/type-pal-inn-frame-collector-{red,green,native}-20261009.log`、
`/tmp/type-pal-inn-collector-targeted-20261009.log`。源码再次变化，07:40–07:42链均历史诊断，
不得授最新冻结信用；新003–006/连续仍未启动。
inn-frame-inputs候选最新00107:49正式passed、0finding/0sourceChanges，bridge_review独立核原件
与生产存读accept。沿此链07:50新002 Game passed，RF日志overflow，顺序链自动停，未启动003。
独立重算budget group为events4,193,524B（4MiB仅余780B），其它组/count未满；events数组本身
2.32MB，另406条kind=command的真实runtime-wait-consumed在该budget组占1.87MB。
e63/e64变化为合法behavior.cursor推进，未证实unbounded explicit的初步内部猜测；不以该猜测改代码。
sealed后previous不能推进，会连带报后续unobserved move；原件不能恢复首次被拒收据，不猜其order/id。
用户明确批准“log不够了就再加大”。据此仅inn events字节容量4MiB→32MiB，全部原始字段及
6000条数/硬overflow/语义验收不变；不为旧失败报告改状态。当前002扩大容量后诊断补跑中，
基础设施最终冻结后仍须同一当前候选完整新001–006链；不因存储问题停住根因验证。
容量候选全工具383/383、lint3348零诊断、docs/sourceRef0及diffcheck通过；inn当前三份sourceRef
仅同步实际文件hash，历史运行报告不改。002容量后真实补跑`both-002-2026-10-09T08-00-18-649Z`
formal passed、0finding/0sourceChanges，两raw errors=[]/overflowfalse，events Game1538/RF3166。
bridge_review容量独立accept，字节/count硬负控6/6通过。003首次启动Game前驱文件名误填
08:00:20-008，原失败尝试保留且不给信用；按002正式登记的08:00:20-047正确前驱重启，
RF前驱08:00:20-038。当前为诊断链排根因，最终全链仍待基础设施冻结后统一重录。
正确前驱003 `both-003-2026-10-09T08-03-01-717Z`正式passed、0finding/0sourceChanges。
bridge_review独立核002/003四份report/raw/hash、29/18与57/46固定press/down/up全部完成、
存档原字节/前驱hash及end world/frame exact restore均accept；两raw errors=[]/overflowfalse。
002 e54真实seed已带frameDebug；003本次实际fixed0（4062 setter→4146 take→4160 draw0，
5361 release→5371 draw0），不声称本raw观察fixed1；fixed1由前述独立native正/反控证明。
004六案例后接005，当前诊断链；全部通过前不进006或连续演示，不替代最终freeze后新全链。
004 `both-004-2026-10-09T08-04-18-897Z`六案例全部passed，formal0finding/0sourceChanges。
bridge_review只读六raw/hash/current source与80/77 story、58/59 items、94/79 saves固定输入accept；
items cancel dispatch0/invalidUse dispatch1，carry/final原件字节、生产读回world/frame exact均核。
005六case已沿该次004 saves登记报告执行，未授005/006或连续信用。
005纯自动差异预核仍要求共同初始root及逐visit唯一祖先，名义图+actual桥不单独豁免。
Game primary为game-state.ts:2092共享allEventObjects切片、bootstrap.ts:834正常切片与读档重切引用；
RF已有capture/store/projection，但不能代证Game跨visit。前visit末转移、缺席期cross-target writer、
回场真实seed/cursor以及读档字节链若缺就unknown；e87/e88 restart与e86 incoming selector持久义务保留。
当前不实现/放行该证书，等本轮005新原件裁判；不扩展到状态组合/全房间覆盖。

本次接续包（优先于下列接线前状态）：Codex保留全部既有未提交改动，未提交推送。
build allowed范围仅正式oracle接线、Game真实setter观测及当前sourceRef债；不改产品、固定输入、
作者工程或后续覆盖范围。原版数据为`data/extracted/events/all.json`和EventObject初始autoLabel，
Game primary为`event-system.ts`的OP_SET_AUTO_SCRIPT实际label/cursor赋值，RF为真实runner、
运动槽及world draw caller。目标是名义有限图必须与实际执行同时成立；不是改变演出。
最强反证是静态图通过但某实际run缺repeat后继、源调用逃图、借其它visit收据或目标cursor未重置。

- 已接`automatic-language-receipts.mjs`到正式`compareStoryPresentationIntent`；12项已核绑定从
  原版EventObject或原始安装边取入口，静态图仍明确为`proved-nominal-language`，不独自放行。
  实际run逐控制字核验并绑定初始stage，逐leaf绑定run/occurrence/sceneVisit、slot/wait及同窗口
  每个实际draw；持久效果、权限及源后态继续是总acceptance的独立必需门。
- 已证实并修复纯repeat选择遗漏：真实runner先红`0 !== 1`，新增requiredAuthors后绿；缺第二次
  wait仍拒绝。源0x24原合同只推进本身cursor而漏目标重启；现于实际setter后观测并核精确目标、
  label及全cursor，缺setter先红`Missing expected exception`后绿，保留旧cursor反控拒绝。
  红日志`/tmp/type-pal-language-repeat-red-20261009.log`、`/tmp/type-pal-auto-setter-red-20261009.log`。
- 独立`bridge_review`提出的域外source预过滤、未绑定stage和不同label仅检查cursor存在三个counter
  已逐项修订；新增原生caller跨入口、stage不匹配及不同installation的cursor/entry/operand反控。
  当前定向原生2/2通过，日志`/tmp/type-pal-auto-bridge-native-final-20261009.log`；bridge_review独立
  最终accept三个counter闭合，仅验桥基础设施，不给剧情实跑信用。
- testing-docs实测36项sourceRef债已核实际caller/断言后同步metadata、catalog、evidence及当前claim，
  `check-testing`为0问题；历史revision/版本/runtimeExecution与raw未改。全仓typecheck零诊断，
  作者工程检查通过；最终完整工具379/379（包含真实Chrome watchdog）和lint3346文件
  零error/warning/info通过，docs915Markdown/5217链接及testing-docs均0问题。
  日志`/tmp/type-pal-bridge-{tools,lint,docs}-freeze-20261009.log`、
  `/tmp/type-pal-resume-{types,content}-20261009.log`；git diff --check通过。
- 最终工具冻结原件`build/e2e/infrastructure-freeze-final-20261009.json`：12名义自动语言、49条
  必需作者run、12个producer闭包及812来源哈希。recordings只是历史可用性census，不授予旧raw通过。
- 已从冻结工具重新完成001两轨正文/正式存读与比较：
  `both-001-2026-10-09T05-53-09-567Z/acceptance.json` passed、sourceChanges=[]、findings=0；
  独立只读原件复核accept，正文末页后的控制归还及draw、固定输入ledger、实际存档字节和真实恢复均核。
  002同新001链`both-002-2026-10-09T05-55-15-945Z/acceptance.json`亦passed、0finding/0sourceChanges。
  003同新002链`both-003-2026-10-09T05-56-42-595Z/acceptance.json`亦passed、0finding/0sourceChanges。
  bridge_review独立复核002/003原件hash、真实按键、前驱存档字节、正文末draw及正式恢复均accept。
  RF报告保留浏览器404warning，未发现collector/资源证明失败，不宣称浏览器console零告警。
  004六个story/items/saves案例全通过，`both-004-2026-10-09T05-59-44-202Z/acceptance.json`
  passed、0finding/0sourceChanges；bridge_review独立核真实前驱、物品边界、carry/final正式存读及
  motion/slot/wait/draw均accept。004不进入12项s004/s005图绑定域，未据此宣称有限图已实跑。
  005六个story/guards/saves实跑全绿，但`both-005-2026-10-09T06-03-26-533Z/acceptance.json`
  正式needs-review（72 findings），不得串联；006/连续tape/左右分屏未启动。
  首个root为合法relative-step恢复被要求新槽：e92原slot54 registered20114→committed20211→
  capture12/20228→store20229→cancel20252→projection51335→新run209/occ6450 command51535→
  completion51548。primary main.ts:1711及script-runner-core.ts:398只续接已提交步，不重发位移。
  build allowed窄修仅motion/自动图桥的严格恢复证书，不更改运行时、作者工程或输入。
  真实runner/queue/main capture-project-continuation先红`0 !== 1`，后严格正控及commit/path/
  digest/phase/snapshot/self/completion/重复位移反控绿；独立复核指出旧新sceneSession不得整体相等，
  已分别钉原slot/capture与新projection/run并实际切换session反控。定向新raw已证209 motion及
  1条恢复链。日志`/tmp/type-pal-step-resume-{red,green}-20261009.log`。
  恢复证书独立accept（sceneSession counter闭合）；定向21/21及Biome零诊断。
  v2离线诊断首motion root已闭合，余oracle缺口：hold run187/slot204仍活prefix的末draw58584
  被开边界排除；源桥把actor order当world draw order。两项均先红后窄修：仅recording-prefix
  允许末draw闭边界，真实terminal仍开；每个源draw绑定world order/renderId/visit/actor order，
  并补独立指出的actor/world visit精确相同，错visit正控先红后绿。定向9/9通过，日志
  `/tmp/type-pal-prefix-hold-red-20261009.log`、`/tmp/type-pal-source-draw-binding-red-20261009.log`、
  `/tmp/type-pal-source-visit-{red,green}-20261009.log`。两项及visit counter独立accept。
  v3另核e91 run207/occ6459 wait100恢复为0：consume51563 origin snapshot12/immediate2723→
  completion51578，无timer。桥已消费独立handoff的精确零余时链，不凭零值放行；同run/occ/visit/
  duration、唯一completion及无中间draw皆必需。真实零余时save/load先红后绿，独立accept；
  日志`/tmp/type-pal-zero-wait-{red,final}-20261009.log`。
  v4离线`/tmp/type-pal-005-oracle-diagnostic-v4-20261009.json`：storyTiming passed/errors=[]，
  12绑定实际控制/源调用/slot/wait/draw均闭合；整份仍needs-review，38项跨轨序列/路径/边界差异，
  2项recorded-sourceChanges保留，不能作当前最终信用。完整工具此前379/379，本次零余时修改后待再回归。
  独立审查明确有限图桥不能自动豁免raw差异；需逐visit精确seed、effect域及完整writer覆盖。
  e87含跨实体restart，不属于pure ambient；e76/e83/e84不在12图域，其红项继续保留。
  比较器已变，前述001–004本轮passed为历史候选证据，最终仍须再冻结后重新录制；离线诊断不替代。
  无下一位Agent提示词，Codex继续本卡，不进入后续状态方案/剧情阶段设计。

- v4后完整工具379/379、lint3346文件0诊断、docs/testing-docs均0问题，日志
  `/tmp/type-pal-oracle-{tools,lint,docs}-v4-20261009.log`。
  独立逐visit首auto-before/run-start取seed：仅e89/e116/e121/e122全部visit精确相等；
  e85/e86/e90/e93返回相位不同，e91/e92返回位置/朝向亦不同，e87/e88首visit已不同。
  e87跨实体restart、e88安装完成、e86外部trigger-selection写入均不得归入无持久effect域。
  38红项继续保留，不作统一ambient豁免。
- 新核明确根因：e83 default闲逛第一暂停仍将原始0x0f的朝向/帧拆开，并残留trigger时基。
  四向真值：原始all.json commands1307 wait5→1308 pose(up,0)→1309 wait5；第一阶段
  event-system.ts:1339逐auto tick计wait，1423起move/stagger按真实到达推进；二阶段s004.json
  default首暂停为400ms→facing→100ms→frame→400ms；目标实际到达后600ms原子姿态，
  姿态后下一慢速首次运动仍保留源侧合法间隔。不改移动路径/速度/输入或其它暂停。
  真实Game auto/Reforge runner失败反控已证600ms vs400ms，日志
  `/tmp/type-pal-stroll-first-pause-red-20261009.log`。最强替代解释是现代匀速到达耗时差异；
  从各自实际到达计时已排除此解释。若真实caller得出相同暂停则推翻此前提。
  Codex核前提与范围后build allowed仅此作者暂停及对应原生反控，Owner仍Codex；非整体005通过。
- 上项600ms/原子姿态/后500ms原生验证通过；实际首次slow位移相对姿态600ms，删后等待反控拒绝。
  bridge_review独立primary及caller复核accept，仅该第一暂停；其它default暂停未获信用。
- 下一独立根因e88初始可见姿态丢失：primary EventObject currentFrameNum=7且无初始autoLabel；
  第一阶段game-state.ts:2011物化scriptedFrame7，raw首屏内draw8302/render317为7，setter9904
  才改0；RF无page/action初始姿态，draw9189/render1022为0，setter11757才改0。
  源setter前7个屏内画面，不满足不可见前缀；runtime推进不是当前根因。
  当前publication pal-content-supply.ts:35只产静态资源引用，不生成作者正文/动作；
  pal-current-publication.ts:104从current baseline保留作者场景，故未证上游迁移缺陷，不开全量迁移。
  现有SpriteDef.poses + page.animation已能表达单帧默认姿态；ScenePreparer.pageActions及
  WorldScenePresentation.sprites优先真实frame setter、后默认动作，不新增schema/兼容层。
  原生canonical page/player/render先红（0帧 vs primary7帧），日志
  `/tmp/type-pal-e88-initial-pose-red-20261009.log`。可证伪：初始7出自其它writer、RF首前缀
  全offscreen或已绑定7却画0；独立raw均排除。Codex premise verified/build allowed仅e88
  初始作者单帧动作及实际setter优先反控，Owner Codex；其它实体/资产布局不扩。
- e88窄修原生3/3通过；bridge_review独立核single-frame完成后保持末帧、sameBinding不重启、
  fixed/gait/explicit优先与main往返actions/fixed/motion恢复链accept，仅候选不授最终E2E信用。
  内容294场景/223地图/1934资源通过；作者9/9；Biome及diff-check零诊断，testing-docs0问题。
  日志`/tmp/type-pal-e88-initial-pose-green-20261009.log`、
  `/tmp/type-pal-author-pose-{content,tests,biome-final,docs}-20261009.log`。
  38差异尚未重录重比较，不追溯改写旧报告；当前作者工程改变后001–004候选存档也不是最终来源。
- e83 default完整真实自动执行反控又证其余暂停同根因：source1303–1348的wait/end/atomic-pose
  必须按auto100ms拍及0x11真实stagger计时；从各自实际arrival/pose到首次位移逐段比较，
  已排除匀速整段耗时差异。红日志`/tmp/type-pal-stroll-{remaining,movement-gaps}-red-20261009.log`。
  例如139/59源600 vsRF500、139/65源1000 vsRF800、150/55源1000 vsRF700，
  两次连续原子姿态仍被100ms拆分。部分非整拍等待在100ms测试步进中偶然取整相等，
  不据此认定实际细帧deadline相等，也不一刀切删相邻slow等待。
  build allowed扩展仅e83 default已核同一auto时基/atomic-pose根因；路径/速度/源0x24目标不改。
  第一阶段dense allEventObjects供0x24真实目标解析；RF测试仅度量该实体pose/motion时序，
  selection的持久效果仍由正式effect/lifecycle门承担，不授予端到端剧情信用。
- e83 default两圈原生4/4绿、独立复核accept：wait4→首次slow位移600ms，wait8→1000ms；
  pose1335→setter300ms→normal首步1100ms；尾pose1346→下一圈slow首步500ms。
  `s004.json`仅更改e83 default等待/atomic-pose，全部目标、速度、相邻slow wait100及
  selection目标保留。日志`/tmp/type-pal-stroll-{remaining-green,two-cycles}-20261009.log`。
  首暂停正控已被完整两圈合同包含，按测试少而精合并并保留其删post-rest反控，最终运行时
  数量不以叠加子集计；历史4/4日志保留。frame绘制及selection持久effect仍待新raw正式验证。
  在扩展此修复前全仓381/381工具、typecheck、lint0诊断及docs/testing-docs0问题通过，日志
  `/tmp/type-pal-author-pose-{tools,types,lint,docs}-final-20261009.log`；本次合并后再回归。
- e84入场已修内容未重复重写；新核返程尾部source1379→1380 wait2→1381 slow最后目标。
  从实际99/30到达计时，native Game首位移400ms、当前RF200ms，先红
  `/tmp/type-pal-xiulan-tail-red-20261009.log`。source1382 wait2→1383 atomic right→
  1384 wait4→1385 atomic up→1386 reset仍须独立核尾部与下一圈间隔。
  四向真值原始all.json1379–1386、第一阶段真实auto/stagger caller、RF e84 default尾部wait100/
  280/360/140、目标保留原始wait/end语义；从两侧实际arrival计时排除移动总时长差异。
  Codex premise verified/build allowed仅此尾部等待与对应原生反控；不改入场、路径、速度、
  0x24目标或新增初始global parity规则。若native相同则推翻此root。Owner Codex。
- e84尾部已原生4/4转绿，并保留旧wait100反控：实际首slow位移400ms、尾right300/up800，
  reset后下一right2500（从最后arrival计），up→nextRight1700；改四个尾wait为300/300/500/200。
  `xiulan-tail-pose-red-v2`先证旧700/2400，与源800/2500不等；绿日志
  `/tmp/type-pal-xiulan-tail-green-20261009.log`，未授实际绘制/最终E2E信用。
  一次短上下文patch误命中e76首wait100→300，已即时撤回并精确核e76仍仅wait100；
  后续采用完整实体/坐标锚点；入场/其它作者未改，独立scope复核待回。
- e84尾四wait及scope已独立accept：4/4原生绿，e76仍12目标单循环/仅一个wait100；
  e83 default与已审版本一致，legacy-002仍绿。仅授窄时序与误改恢复，不授最终E2E。
- 当前候选全仓实测382/382 E2E tools、typecheck、lint3346文件0诊断、docs/testing-docs0问题、
  content294场景/223地图/1934资源通过，diff-check通过；日志
  `/tmp/type-pal-current-{tools,types,lint,docs,content}-20261009.log`。
  `build/e2e/infrastructure-candidate-20261009-pose-tail.json` passed，12有限图/6合同完整闭包。
  它固定当前候选来源，不代表005差异已清零；历史recording census的offline-recompare标签
  不替代用户明确要求的重新录制。已从001重新建立新真实存档链，005通过前不串006/tape/分屏。

以下为本次接线前的交接快照（历史，不作为当前门禁结论）：

- 三套工具不是“全部完成”：录制器的共用收据/边界与005同步终点已补强；比较器已有严格坐标、朝向、显隐、真实绘制帧、步态序列和控制权合同；连续执行器已有共享底层与语义边界。但自动脚本有限图证明仍是隔离的 `proved-nominal-language` 诊断，尚未接入正式 acceptance，也不能替代实际 effect/slot/render 证据。
- 12个005环境自动方案已按原始控制流重写并通过名义图对照，旧正文均被拒绝；这只是作者层修复，尚未以最终冻结工具重新录制001–006。
- 原生运行时又证实一项共性缺陷：Reforge 将固定帧、步态帧、显式动画帧分开计数，导致重复 `animEntity` 首帧重复、`stepEntity → animEntity` 被旧 gait 覆盖。当前已在 `WorldMotionRuntime` 接通同一 current-frame phase，并由定帧写入该 phase；定向 runtime/main 测试 70/70 通过，尚待真实渲染证据复核。
- e76/e83/e84作者节奏修复已落到当前canonical：王小虎改为12目标单循环，仅保留慢速相邻段间隔；香兰返程恢复原始姿态槽与移动后停顿；秀兰恢复15拍入场等待、原子姿态、慢速路线节拍及e82自动方案切换。作者工程检查通过，相关Reforge测试99/99；新增真实Game自动执行器与Reforge slot/frame runner的香兰返程时序反控通过，自动语言/边界/真实执行器合同6/6；这些仍不是新001–006收据。
- 不可见商贩初始朝向的通用证据合同已补：要求两侧初始位置/状态一致、源侧存在后续 canonical facing setter、完整前缀渲染均有独立 offscreen 证据、共同姿态字段一致；当前旧005诊断中 e128–e132 五项均命中该证书，非 ID 白名单。尚未完成的实施包：有限图与真实 effect/slot/绘制收据桥接；全仓零诊断/文档/内容门；最终冻结后001–006独立重录与正式比较；最后才是连续左右分屏演示。当前不得把旧收据或旧连续回放标成通过。
- 005旧报告以新证书离线复核：五个商贩不再产生 facing finding，但整份旧报告仍为 needs-review（其它旧差异及22项sourceChanges保留）；证明只验证比较器分类，不把旧执行提升为最终收据。
- 工具回归：去除环境敏感的真实Chrome browser-watchdog子测后，371/371 E2E工具测试通过；该子测本轮单独45秒超时，未归因于剧情/比较器，需在浏览器环境稳定后单独重试。Reforge typecheck、定向Biome和git diff --check通过；testing-docs仍有既有多文件sourceRef哈希/行号债，尚未宣称全仓文档门通过。

### 后续场景覆盖范围（不混入本轮主线收口）

- 当前本卡只覆盖001–006主线剧情相关实体；没有宣称已完成盛渔村/市集码头全场NPC、房间、道具、商店和支线扫描。
- 主线收口后另建覆盖矩阵，至少登记：皇甫英家带条件对话分支；第一次出客栈与丁香兰的布鞋支线；丁老伯病倒及后续剧情；洪大夫买药；学会御剑术后的林木匠商店；铁匠商店；盛渔村与市集码头各房间进出、NPC交互、道具和支线触发。
- 这些案例用于后续系统性场景覆盖和回归，不作为当前001–006主线三步门禁的隐式附加范围。

005批量根因核验（2026-10-09，尚未通过）：当前完整比较48项差异，source/author/控制流/逐draw
均已证明，但这些单轨证明不代表跨源脚本等价。原始L36675概率回边在e85/e86被截成单次；
鸡e91/e92分支重复包含前进步；L36140船的12/9拍等待被缩短；L1350秀兰15拍被写成700ms。
comparison_review、execution_review独立核原指令、Game运行态及canonical；修复层为作者工程，
不是运行时或公共迁移器。recording_review核packages/migrate/README.md:23/75、
migrate-content.mts:116和migration-merge.ts:119：当前脚本不从原版再生成，修改projects/pal
会由三方合并保留；不得手改baseline或重启退休转换器。
四向前提：原版上述opcode/100ms自动拍；Game实际dispatch/步数/等待符合源；RF当前作者
正文与原意不等；目标恢复源循环、动作次数及节奏，保留已批准现代移动和明确接管。
build allowed：Codex唯一写入，先补跨源有限图失败诊断和原生异步step反控，再修本批正文；
新图尚未具备actual提交绑定前不得作放行证书。最强反证是stepEntity等下一运动slot后又wait100，
实际会两拍一步；不能把所有作者叶当瞬时命令累加毫秒。

005终点采集窄修前提：Game末page-clear32080、RF成功draw56752均已完成报信且丁香兰
精确[139.5,34]；截图await后RF新增返程步56843，旧scope57048误含此步。
execution_review独立核control恢复和末draw。build allowed：对白ready状态、日志order和endWorld
同一次同步page读取，在截图前固定终点；完整raw及另行存档/返程证据保留，不删实际事件。
不以取样边界替代最后对白/控制权/实际绘制验证，也不把剩余朝向差异一并放行。

2026-10-09 005 oracle三项根因（不改产品/录制）：鱼嫂告知风浪大、鲜虾无货的最后对白，
canonical初始阶段到此结束，实际close27862→settled27866→正常end27867→draw27869；
旧对话合同误要求下一command。现先核完整有限作者链，再核同帧正常终结及首绘；遗漏后续作者
指令、提前/延后终结、错误run、resolved=false均拒绝。execution_review独立核实际18对白/1EOF。
Game环境自动域缺0x87推进帧和0x06概率分支：primary为sdlpal script.c:2540、3575及
Game event-system.ts:1357、4120；RF对应animEntity/branch；目标是证明各自源语义，不改演出。
原生调用/帧布局/跳转同调用及概率0/1/101边界反控通过，recording_review独立accept。
无RNG样本时只证明合法非确定转移，不宣称抽样值或概率分布真值。

循环控制字证明前提：原版结构指令N/A（两种脚本语言不同）；Game由原opcode合同验证；
RF primary为script-runner-core.ts:320–610、script-continuation.ts:40–90；目标按canonical
自动flow建立允许的控制字前缀，而非把break/continue加白名单。build allowed：仅oracle，
当前有限语法leaf/branch/repeat/forever/break/continue/finish；未知语法仍拒绝验收。
分支保留候选集合，实际后继只能淘汰不能生成候选；状态条件读实际前态，恢复分支不重掷。
正常完成、真实取消、窗口仍存活三种结果分开；恢复入口绑定安装cursor和digest并验证完整帧链。
原生runner正反控覆盖内/外跳转、重复次数、同前缀分支、多层恢复、body尾index及终结。
comparison_review独立59个真实自动run复核，41取消前缀/18存活前缀；恢复入口counter已闭合。
额外跨engine结构指令counter先红后绿，命令/叶完成/终结统一核同run/activity/runner/parent/call；
恢复帧按1..256、digest、精确字段及合法leaf相位全量核，不能等到消费才检查。独立窄复核accept。
失败witness仅存runId和具体义务，不把整段展开raw塞入报告。372/372工具测试通过；同合同也直接
复验现001–003的1/5/5个循环run通过，最终完整离线验收仍须按冻结版本重算。

005完整比较性能复核：先前lineage深复制优化前后完整结果逐字段相同，用时约12分→2分20秒。
对白误报修好后首次真正走完整hold窗口，运行栈确认verifyStoryHolds每draw/每run重复全流查询，
5分钟仅检查到order14960/57286；此诊断已中断，不产通过回执。后改按runId建保序索引，仅替换
原谓词已有runId限制的查询，跨run收尾/child仍全流。实际005全2710draw/55实体用时14.681秒；
54个分布于全窗口的draw与未索引原函数逐字段相同（旧子集耗时28.741秒），不冒称旧全量结果已跑完。
原生runner+RuntimeFrameSession保留可执行索引/原全流对照与删等待反控，comparison_review核谓词等价accept。
旧005因共享路线已改仅作诊断，不能冒充本版正式通过；最终冻结后004–006同版重录。

005比较性能窄修：旧完整比较用时约12分钟，实际暂停栈为checkOccurrenceLineage→
checkTransitionTrace。原版/产品真值N/A；两个引擎的原件与模型检查不变；当前模型每事件
deepClone包含全部历史occurrence的状态；目标仅减少同一不可变证据的反复复制。
comparison_review独立核实际RF39,686条因果、7240 dispatch，状态2.25MB、累计复制历史
至少26.8GB；canonical branch大正文是热点，不误称world快照。
build allowed：通用初始及默认deepClone保留，仅lineage显式复制顶层和两个可变索引，
不可变entry共享并freeze，完整深值匹配仍保留。反控比较原默认算法的成功/失败完整结果、
失败前先改计数/替换run/插入occurrence仍不污染witness.before、冻结输入不被修改。
这是纯oracle变更，不要求重录001–003；最终离线回执须按最终版本更新。

005 20-54批正文两轨passed；RF guards固定路线卡在村街[95,27]，非overflow。
原件`reforge-005-guards-2026-10-08T20-55-13-520Z`含完整raw/status/截图。
前提四向：原版输入路线无强制要求；Game同固定路线可走；RF现场e91[94.75,27.5]，
真实planEntityMotion+map-001判party下一步blocked actor e91，移除实体保留地形则moved；
目标仅将固定测试输入避开鸡群/木桶狭口，不改产品碰撞/脚本/NPC/随机数。
execution_review独立核同一primary；新去程R5D20与反向U20L5U2在失败占位下逐步精确moved。
build allowed：修改005/006预编写路线，仍同两轨固定长按，不做运行时寻路/位移注入。
反证：新路线任一步terrain/actor blocked或sidestep即拒绝；已加原生碰撞回归，原路线先红。
限制：e84作者路线横穿col100，不能宣称对所有背景相位绝对无阻；本次以完整实跑验证。
共享story-input-plans在004生产者闭包中，所以004须同版重录，001–003不受影响，不豁免源绑定。

005 20-48批正文/guards两轨通过，saves Game通过，RF明确撞到actor事件计数16,000上限；
首次诊断完整留存于`reforge-005-saves-2026-10-08T20-50-28-779Z/005-failure-status.json`。
events预算组22.7MB、causes29.4MB、pool11.0MB均未超字节限，不再猜容量归因。
按用户允许加日志容量，errand adapter默认事件计数增至200,000，与长因果流同级；
字节预算、显式小流上限及overflow拒绝不变，共享kernel与001–004生产者不动。
真实collector连续16,001条commit回归确认不丢记录。此producer改变后005两轨重新生成。

005紧凑流入口复核：20-43批Game正文passed，RF仍被容量门拒绝；独立status已落盘，
events used67,091,725 B、causes22,943,527 B、pool7,396,430 B。具体首回调被后续内部错误
覆盖仍为unknown；已改保留首次overflowDetails，不由近预算推断。更关键的可证根因是因果流
`runtime-wait-consumed`带原生payload kind=command（004真raw有401条），原编码只认kind=cause
导致该流部分未压缩，并在decode时被missing snapshot refs拒绝。改为按createCausalObserver的
实际append入口统一编码，原kind及所有字段不改；真实RuntimeConsume调用加入spy全字段正反控。
366/366通过。20-43失败原件保留，不算新005通过；只修005/006 adapter，无前段生产者变更。
recording_review独立反控accept：真实RuntimeConsume正确解码，内存回退旧kind判断即失败；
注入pool上限后events/resources不再增长，首次overflow回执不被20次secondary覆盖。
byteSizes仍是共享kernel的预算组，不是流census：原生kind=command保留并计入events组，
其重复快照现已统一进池；不能把byteSizes.causes称为整个因果流大小。共同总上限仍有界。

2026-10-09 005 长日志表示修订（当前）：Game005正文passed；RF005在news前发生collector overflow，
随后完整导出报 `RangeError: Invalid string length`。原件
`reforge-005-story-2026-10-08T20-20-52-777Z/report.json`保留，具体首次溢出流unknown，不能反推成
causes或OOM。主因与secondary已分开保留。表示冗余的一手测量：004 RF raw 的poses106.5MB中
唯一快照13.5MB、world12MB中唯一1.08MB、lifecycle3.96MB中唯一22.8KB；这不是005实测容量。
前提四向：原版/游戏产品机制N/A（完全不改）；Game005实际raw仍为6071 events/25592 causes，
录制全量约200MB causes；RF由script-causal-observer每次提供完整poses/world/lifecycle并在
errand append重复存储；目标为同一逻辑JSON值、同一事件/顺序/帧的无损compact物理表示。
替代根因未排除的是计数或其它流先溢出，故增加轻量used/count/attempt诊断，未知内部支路不猜。
recording_review/execution_review独立核caller与消费边界，方案同意；Codex唯一写入 build allowed。
范围仅005/006共享errand adapter：子树DAG快照池+现有progress delta直接持久化，Node还原完整
未scope逻辑trace后照常验；真实save/checkpoint/006 motion/state小旁证不改。失败取证也不能重新
序列化展开trace。snapshot graph预算128MiB，compact causes96MiB、其它原流合计136MiB，总
存储预算360MiB，physical artifact384MiB（共享256MiB默认不改）；overflow仍拒绝并封存。
反证门：任一字段/键序/帧/seq/order/历史快照变化、错ref放过、正式reader未解码即推翻方案。
001–004 producer不包含新codec/errand，npc-transition只属oracle；其raw无需重录，最后重比。
本轮旧Game005同样不能充当新producer回执；新格式冻结后005两轨一起重录。
本包实现/复核闭合：recording_review的解码节点/字节预算counter已修并独立accept；
execution_review核全部正常/失败写出，006失败归档已去缩进；独立轻DTO在full导出前wx写盘。
真实collector编码前spy与解码逐字段相同，原地写/旧值恢复/换场/真实帧像素反控通过。
Game005真实历史raw全量离线往返：208,569,248 B → 23,217,275 B，25,592 causes、6,071 events
逐条deepEqual通过；这是逻辑值相同而非新旧JSON字节相同。快照内部键序保留，cause封套字段位置
可变化。`build/e2e/codec-only-005-reader-proof-20261009`另证readErrandReceipt/readNpcTrace两条
正式消费者读紧凑原件后通过；明确只作codec验证，不冒充新独立录制。366/366工具测试通过。

2026-10-09 004 最新正式通过：`both-004-2026-10-08T20-17-01-110Z/acceptance.json` passed、
sourceChanges=[]，正文/物品/存读档六个独立case全通过。正文Game/RF分别
`game-004-story-2026-10-08T20-17-01-613Z` / `reforge-004-story-2026-10-08T20-17-01-591Z`；
正式存档来源Game/RF分别 `game-004-saves-2026-10-08T20-18-42-146Z` /
`reforge-004-saves-2026-10-08T20-18-42-125Z`。随从完整八步、步帧、完成游标、实际终态绘制及
当时控制权均经新合同验证，无 prefix 豁免；005已从这两份真实正式存档进入。

2026-10-09 004 完整返程窗口（当前）：19-52 批六个独立 case 全通过，比较只剩随从返程
prefix 两项。已逐帧核明 Game/RF 都是隔一世界拍移动；Game 出房前记录六步到[107.5,24]，
RF 旧场景在 600ms 出场淡出中继续运行，完整八步到[107,24]。不是 stride/按键/NPC 遮挡。
原始证据 `both-004-2026-10-08T19-52-52-278Z/acceptance.json` 保留为未通过。
目标改为明确观察完整返程后再离房：Game 原 L537→L541/L542八次→L543，RF
e26/auto/legacy-003 repeat8 step+wait→正常 run-ended；原型数据与两个真实调用/渲染流为依据。
本改动只扩 004 测试观察窗口，不裁决淡出机制、不修改演出，不新增 prefix 豁免。
build allowed：meal observer 通过实际终结及 world-render 事件通知，精确终点、最终帧与控制权
同时成立才放行；随后原 Down/Down/Up 等路线不改。独立专用合同从真实交接核足八步/八步帧/
同 visit 的正常终结/终结后实际绘制/随后离房，公共完整 canonical/节奏/归属证明继续执行。
反控覆盖缺步、错步帧、提前离房、错 visit、缺终态实际绘制；坐标到达/单有终结不能唤醒。
005/006 相同大档热读与 finally 覆盖错误已在各自 adapter 收敛；共享 guard 只管理读取失败与
诊断，不改公共采集器，成功 raw 仍必存且复用同一份验收，失败原错误不被二次导出覆盖。
工具 364/364；本次只重录受影响 004，001–003生产者闭包未改，最后按最终 oracle 离线重验。
comparison_review 的两个窄 counter 已闭合：RF 只接受实际 finishStep complete 且同一作者
cursor completed 的正常终结；最终 draw 必须绑定同 scene/visit 的实际 control=true。
换 wait/未完成 cursor/控制权 false 反控均拒绝，独立复核 accept；旧 raw 在淡出中完成故不能充当
新观察门正控。冻结验证 `/tmp/type-pal-tools-return-freeze-20261009.log` 364/364，
`/tmp/type-pal-return-freeze-lint-20261009.log` 3335文件零诊断，docs零问题；004新六case执行中。

2026-10-09 004 后续修复（优先于下方中间状态）：19-30 批正文两轨均独立通过；
Game/RF 分别 `game-004-story-2026-10-08T19-30-20-587Z`、`reforge-004-story-2026-10-08T19-30-20-565Z`。
四类 oracle 根因已以真实 caller 核明并修复：保留同场景每次完成的 runtime projection，姿态绑定
snapshot/scene/visit/边界/实体回执；后续首次访问允许消费 identity-bound load 安装的缓存 clone；
已结束 timer 的同 owner、settled=true、remaining=0 查询不是再次推进；Game 0x6f 按目标前态和
signed operand 条件同步自己的状态。另一处 action dt 从累计 now 反推造成 IEEE-754 差异，改由
realNow/冻结门控正向计算并逐项严格相等，不加 epsilon。既有 raw 的完整 core 比较已零 finding：
`/tmp/type-pal-004-current-core-20261009.log`；因执行器正修改，这不是新版正式验收回执。
recording_review 独立核 4 次投影/128 条姿态回执；comparison_review 核 3319 个时钟/2354 个动作帧、
timer 五反控及原生条件同步。工具 362/362、lint 0 errors/warnings/infos。

同批 items：Game passed，RF 最终完整导出时 browser closed，原业务四项 passed 不能冒充整体通过。
没有 crash/exit 证据，退出原因 unknown，不能称 OOM；13 次完整导出约 81 秒和 finally 重导覆盖
原异常是明确工具问题。build allowed：仅 meal adapter 将 phase/status/dialogue 热路径改小投影，
仍消费原 phase/对白/状态 oracle；最终 raw/序号连续性/字节上限验收不减。成功不重复导出，失败
诊断不能覆盖 primary，closed/已失败 export 不重试；新增 page crash/close、browser disconnect
诊断。execution_review 窄复核验收条件不减；此生产者变化只要求重录 004，不牵连 001–003。
不改公共 browser-journey，不用未明浏览器退出原因推断游戏缺陷。下一步冻结 004，重跑六 case。

003同版完整通过：`both-003-2026-10-08T19-22-49-396Z/acceptance.json`，0 finding/0 source change；
Game/RF分别`game-003-2026-10-08T19-22-49-852Z`、`reforge-003-2026-10-08T19-22-49-832Z`。
004首录Game story passed；RF送餐中途因普通events字节达4 MiB封存而拒绝，不是游戏卡死：
`reforge-004-story-2026-10-08T19-23-59-711Z/004-latest-trace.json`，events 4,191,280 B、
causes 54,554,522 B（4456项），其它流未达上限。用户已允许扩大日志容量，meal/errand两个长段
adapter分别配置events 64 MiB、causes 768 MiB、atomic 32 MiB；保留计数上限、全流封存和溢出失败。
未改公共kernel/001–003 adapter；已核003两轨生产者闭包不含这两个文件，无需重录前段。
359/359工具测试、lint零诊断；既有005实际byte overflow测试相应改为越过新上限，仍严格拒绝。
004从同一003前驱重录中，004失败原件保留。

当前同版001/002均完整通过：001
`both-001-2026-10-08T19-15-38-134Z/acceptance.json`；002
`002-world-restore-acceptance-20261009.json`，均0 finding/0 source change。
新001 Game/RF时间分别19-15-38-583Z/584Z；新002两轨均19-17-19-393Z。
002已实际观察到loadId=1的s000/s001两个缓存来源及恢复预备，不再缺录。
新增世界预备事件不能当作活动session快照；生命周期fold只保留其活动状态域，来源仍由
restore/action独立合同严格验。真实main.prepareSceneActions+EntityActionPlayer空actions入口
在live coordinator建立前运行，后续take/release/session缺失反控不变；原生7/7通过。
003正在从上述002真实前驱执行；不是旧19-11批中断报告复用。

2026-10-09 后续当前状态（优先于下方中间回执）：新002独立两轨通过，比较先拒绝省略的
`world.skillUseCounts` 与current loader补空表不等；restore-input oracle仅独立应用当前schema
两个允许缺省的容器，其余字段完整比较。真实current-codec/合法fixture正反控和comparison_review
窄复核通过。再核出runtime-loaded清单为空：main先替换全场景缓存，再commitSceneSwitch，
记录器却按旧bootstrap scene过滤。相邻prepareSceneActions/action-track恢复预备有同域漏项，
recording_review已直接核main/observer确认。因此三类世界/预备域来源不受旧活动scene过滤，
普通局部事件域不变；两个原生测试均先切到不在跟踪集合的s000，修前失败、修后通过。
`/tmp/type-pal-tools-world-restore-final-20261009.log` 359/359；lint/docs零诊断。
002失败证据`002-normalized-restore-20261009.json`保留；提前启动的003已中断，不作验收。
这是录制器变更，不能以oracle重比替代缺失来源；001起重新生成同版串联证据。

2026-10-09 公共逐帧包收尾（优先于旧冻结回执）：前驱原文件/inputPayload/loadId 接线已完成；
实际 motion slot、页动作安装/每帧推进/恢复来源、Game 两个自动调度调用入口，均接入原生证据。
公共 004–006 合同按 canonical setter/精确步长/控制权/真实恢复来源重建姿态，再核每次真实绘制；
主角脚本走位单独核实际 party queue，父脚本等待绑定唯一子调用，资源等待绑定实际 scriptWorkIO。
等待前缀、终结和实际绘制不是同一边界：未完成移动仍欠后续 world tick；IO 必须在叶完成前闭合；
bootstrap 第一个游戏帧前创建的计时器只能从 gameplay time 0 起算，不伪造 frame receipt。
comparison_review 已独立复核自动 mode dispatch 与父子归因；提出的 party 前缀漏检和 IO 缺 end
均已修，并有原生队列/主角移动分支/资源队列反控。工具 358/358：
`/tmp/type-pal-tools-finish-20261009.log`。此为工具测试回执，不是新 001–006 全通过。
日志上限由 40,000 增至 200,000，仍保持溢出拒绝；未删除按键、未加容差、未更改产品行为。
下一步：全仓零诊断/预检清单后冻结生产者，重新录制独立六段并比较，最后连续双轨。

本轮首录 001：Game `game-001-2026-10-08T18-57-50-938Z` passed，RF
`reforge-001-2026-10-08T18-57-50-944Z` 因 8 次 `unobserved matrix move` 被严格拒绝。
根因是新 party step 观察插在位置赋值后、既有 `commit:player.pos` 前，snapshot 抢先看到移动；
不是 NPC 遮挡或输入误差。修到同一同步分支紧随 facing 赋值处，保持位置 commit 先记录。
原生 party 测试改为使用完整 opening 插桩组合，明确断言 step snapshot 之前已有真实位置 commit；
`/tmp/type-pal-party-hook-order-20261009.log` passed。共用生产者依赖绑定导致新串联门不能直接
沿用旧 Game 报告，001 两轨同版重新生成；不回写失败原件、不增加 source 白名单。

同版 001 已通过：`both-001-2026-10-08T19-01-39-513Z/acceptance.json` passed，0 finding，
0 source change；Game `game-001-2026-10-08T19-01-40-824Z`、RF
`reforge-001-2026-10-08T19-01-40-703Z`，均完成正式存档/读回。全部 358 工具测试和 lint
在 party 观察顺序修订后重新通过；冻结清单为
`/tmp/type-pal-infra-common-freeze-party-order-20261009.json`。002 已从这两份前驱继续。

2026-10-09 E阶段004第二轮：`both-004-2026-10-08T16-42-15-998Z`六项独立流程passed，
完整比较10项未决，不是004整体通过。新raw首次明确：meal Game采集漏autoIp（其它四采集器已有）；
RF末对白close/advance已经after=null，但page列表没有随后空态；永久auto自隐藏后合法挂在gate，
持久效果合同错误地强要next-command/terminal。先完成根因、反控和复核，再重录受影响生产者。
对白变体的纯oracle窄修build allowed：Game原204文本与RF `dlg.204.v-8ce072c3`实际显示相同，
execution_review独立核25页场景/编号/正文全同；新合同必须同时核源编号、顺序与实际全文，
不允许只剥suffix放行，不把颜色相等冒充文本合同。缺正文unknown，错字/错编号rejected。
共用取证窄修build allowed（recording_review独立primary核验）：原版/产品变更N/A；Game实际
autoCursor→meal.actor漏autoIp；RF `main.ts`实际世界绘制后的dialogBox.active分支未采else空态；
`script-runner-core.ts`的host.execute成功返回尚无叶完成回执。新增只读成功回执，不改变调度/状态。
反例：自动关的同帧仍留文字，不能在close或render尾根据最新active伪造空画面；host抛错不能有成功完成。
持久写以本叶成功world或已存在的下一自身命令/正常终结证据证明；自隐藏的永续auto不应伪造run结束。
另经comparison_review确证：004–006仍无逐draw停留归因适配，之前D“本批完成”范围表述过宽，
当前不再沿用为全六段准入。003可复用机制需参数化，场景恢复剩余wait与Game本地帧投影须保留独立证据，
不能按NPC豁免或把unknown改passed。本轮合并修订后才重录，不逐小项重跑001。

本包补充前提与准入（Codex唯一写入，既有reviewer只读）：recording_review直接读取main的
capture/store/apply/wait调用和003/004原件，核实83.4ms和100ms是恢复余量，不是作者wait改短。
原版产品变更N/A，Game机制变更N/A；RF实际连续语义不变，目标只增加原生交接证据。
因此build allowed：捕获/存储/恢复/单次消费图、计时器handle与真实remaining取值；禁止二次capture、
禁止按小于作者时长放行。真实调用反控覆盖错快照/续点/剩余、重复消费和零余量重启。
comparison_review又核出绘制依赖于gait来源、自动单步slot身份、页动作实际dt/gate；本轮一起补证，
不分段发现后再扩大录制格式。有限域为setter/控制权、move、nudge+anim/step、mount/ride、page action，
004–006实际参与精灵仅directional/static，不扩loop layout或新产品脚本功能。

已闭合的窄包（不是全套完成）：leaf-completed实际成功边+live/top-stack/current/unique归属、
对白变体编号及全文、Game meal autoIp、实际无对白绘制分支，均有真实caller反控与execution_review accept。
runtime-handoff新增真实remaining/handle、capture-store-project-consume、save assembly/output图；
录制后快照与原输入分开为payload/inputPayload，同一实际原payload对象绑定loadId。
recording_review实测并复核后一连接accept（/tmp/type-pal-handoff-real4-20261009.log）；
前驱文件字节入口核对仍待接线，不能把此accept扩成全部handoff验收。
action时间轴数学正控通过，但comparison_review有效反控指出仍缺已安装base的每帧完整义务、
canonical实体页binding、restore具体来源；当前action模型未接正式验收，不许以局部正控宣布冻结。
001–006实际没有playEntityAction/stopEntityAction；需验的页动作还包括002门、005码头两NPC与006船，
不是只验e203，也不扩未执行的override能力。slot与公共004–006绘制/停留适配仍在本包完成列表内。

2026-10-09 E阶段002定向复核（优先于下方中间结果）：新Game/RF002分别
`game-002-2026-10-08T16-07-15-654Z`、`reforge-002-2026-10-08T16-07-15-672Z`，
独立正文/正式存档/读回均通过，正文各10次Enter，约43/50秒；轻量读取修订已由实跑验证。
奖励提示自动关后，完整离线比较 `002-terminal-auto-20261009.json` 为0 finding；窄复核继续核证据。

窄复核已闭合：comparison_review独立以真实raw核两支决策及自动提示显示帧边界，删证据/错决策
反控有效，accept。最终工具350/350、lint/typecheck/docs零诊断；最新不可变验收为
`build/e2e/001-current-acceptance-20261009.json`、`build/e2e/002-current-acceptance-20261009.json`，
均passed/0 finding，源码差异仅声明的oracle，未篡改旧录制hash。
003新两轨从上述002存档完整运行并比较passed/0 finding：
`build/e2e/both-003-2026-10-08T16-26-15-896Z/acceptance.json`；
Game `game-003-2026-10-08T16-26-16-349Z`、RF `reforge-003-2026-10-08T16-26-16-331Z`。
004正文/items/saves独立批次进行中，未提前宣称后续通过。

004本批首跑失败，保留原报告，不算通过：`both-004-2026-10-08T16-27-15-611Z`。
Game送餐已触发，raw为run11 command469@3665→e15隐藏@3666→command470@3669，
但party IP增量首次由observe:causal采到，旧入口只认tick/render导致误拒。
Codex改入口为本腿真实trigger run/sceneVisit及469→隐藏→470，不以采样hook名称代替调用身份；
本次失败raw离线转正，错误owner/IP/run/visit及缺提交反控仍拒绝。
RF报告rpc另证实full-trace从0.2秒逐步升至41秒，末次46秒失败，尚未走到送餐；不能说NPC挡路。

纯工具定向修订准入：一手证据为上述raw/RPC和executeFixedRoute实际消费域；原版产品行为N/A，
不改产品状态/输入/采集或断言。执行即读小投影、归档仍完整；若完整归档字节发生语义变化即推翻方案。
execution_review隔离空白Chrome实测同一真实raw子集：0.524MB对象传输170–190ms、JSON字符串+解析约21ms；
2.095MB对象591–592ms、字符串+解析约77ms，四次SHA相同。主成本在对象by-value链路，
不是靠增超时/删采样解决。统一004–006 full archive JSON传输；三者固定路线只读party提交，
005存档等待只读完成计数，实际保存payload仍最终核对。通用固定计划/执行器未改，001–003不受此执行改动影响。
当前真实collector单测证明轻量读取不访问causal/resource，完整导出有实际非空像素且与持久JSON逐字相同。

- 新日志同时证明两轨都先结束接客，再由李大娘离开柜台的自动脚本切换下次交互。
  Game原指令352结束并续到353，之后自动指令改355；RF先保存default→legacy-002，后切greet并清旧cursor。
  `script-world.ts:249–257/403–423`只有实际effective behavior变化才失效同通道lease。
  comparison_review独立核primary/runtime/raw，确认旧合同强制stop是将一次并发顺序当成必然。
  Codex核定纯oracle修订build allowed；产品/按键/录制不变。
- 统一终结证明供专用时序与必需run合同共用：改写已提交才允许stop；旧run先完成只能continue；
  两支均核实际世界快照、作者续点、唯一改写来源与旧cursor清除。safe-point交错缺证为unknown。
  `002-terminal-negative-20261009.json`含真实raw内存反控：错stop、删续点、写回旧cursor均rejected，
  缺提交快照/改快照来源为unknown；原件未改。
- 本轮新自动关cue不能继续套“必须按键关”的旧对白合同。单页narration按完整页面、实际update/render关闭、
  相邻成功显示帧跨作者deadline核验，不假称有未录的render(nowMs)参数；其它自动类型不默认放行。
  真实插桩ScriptRunner+DialogBox测试运行1400ms自动关，删update/页面或前后改时长均拒绝。
  工具350/350、真实lease测试12/12、lint3311文件零诊断（`/tmp/type-pal-infra-full20-20261009.log`、
  `/tmp/type-pal-terminal-world-20261009.log`、`/tmp/type-pal-terminal-lint-20261009.log`）。
  001用原始raw重算仍0 finding，不重录；当前RF001仍为15-54-17新digest存档。

2026-10-09 D冻结回执（优先于下方历次中间回执）：A–C本批工具补强完成，进入必要的新录制与E验收。

- 有限合同：49条canonical必需run、12个producer依赖闭包及实际causal插桩锚点通过预检；
  新增实际command域归属，未知额外效果必须unknown，不能仅因未列入预期run而消失。
  冻结依赖清单：`/tmp/type-pal-infra-freeze-20261009.json`，包含逐件旧raw缺证与源文件hash。
- 独立窄复核闭合：recording_review接管竞争/移动提交事务accept；comparison_review实际资源/span及
  原型见证选择accept；execution_review当前5条显式fade/dither的实例、实际输出、结束合同accept。
  dither增加真实成功输出时钟夹界；fade允许真实advance→drain→新效果→render，不强造额外终帧。
  另以本机Chrome空白canvas核实rgba满alpha被规范为#000000；不是剧情录制。
- 退休重复authority-trace-model及3条旧测试，保留真实host dispatch合同；退休旧sprite检查，
  唯一实际资源证明由checkSpriteResources承担。数量减少来自排重，不删除有效业务反控。
- 当前工具348/348（`/tmp/type-pal-infra-full17-20261009.log`）；lint3311文件零error/warning/info
  （`/tmp/type-pal-infra-lint-final6-20261009.log`）；七包typecheck零诊断
  （`/tmp/type-pal-infra-typecheck3-20261009.log`，之后只改工具JS/文档）；文档门零问题
  （`/tmp/type-pal-infra-docs-final7-20261009.log`）。源码引用hash刷新，不重写历史实跑结果。
- 旧001–006两轨共12件缺实际资源/页面实例等必需字段，按清单重录；004/005保存provider仍独立。
  先001完整新正控，再运行raw变异反控；之后顺序推进002–006和连续演示。本回执不是剧情通过，
  不声称未来任意脚本、音频硬件、全屏RGBA或全浏览器调度均已形式证明。

E进度：001新录制及完整比较通过，0未决finding；Game `game-001-2026-10-08T15-46-50-172Z`、
RF `reforge-001-2026-10-08T15-46-50-173Z`，双轨目录 `both-001-2026-10-08T15-46-49-758Z`。
`build/e2e/001-frozen-prototype-20261009.json`以此完整正控执行6项原始证据内存反控，全被对应义务拒绝。
原件hash复核未变；不是将人工篡改回写raw。

002奖励提示修复前提（本包限作者cue，不改runtime/执行/采集/比较）：

| 原版参考 | 一阶段 | 当前二阶段 | 目标 |
| --- | --- | --- | --- |
| `reference/sdlpal/text.c:1663–1701`中央窗全文显示后最长1.4秒关闭；不是未经实测的pal.exe结论 | `packages/game/src/core/event-system.ts:1685`narration全文瞬显，14探索拍自动清除 | `projects/pal/content/scenes/s003.json:1236`李大娘接客后的dlg.51未设autoAdvance；`dialog-box.ts:181/271`narration已瞬显但无自动关闭 | 该cue显式autoAdvance1400；正文10次确认，不靠额外输入关闭奖励窗 |

根因是当前作者cue缺时长，不是按键丢失、移动/碰撞或原版字幕理解错误。
`packages/migrate/README.md:23/62/75`明确作者脚本不再由旧迁移器重生成，故修当前作者正文，
不恢复已退役转换器。最强替代解释为通用runtime丢autoAdvance：真实DialogBox以canonical cue核
1399ms仍显示、1400ms已关闭；若cue已有1400却仍等键，将推翻本定位。
001两份story producer依赖均未包含s003，但不能据此断言001存档无需重建（见下方实际读档纠正）。
execution_review独立读取原脚本第345条、Game旧raw14拍无按键自动关、RF旧raw等advance关闭，
签premise verified / design agree（上述窄范围）；Codex据此build allowed。
边界：Game/SDLPal中央窗可任意键提前关，RF现有autoAdvance尾停顿不可跳过。本包修无输入时自关，
固定输入不在此页发键；不宣称所有提前按键交互相等，不为此扩通用runtime。

002修复实测：canonical奖励cue→真实DialogBox红测在waiting-input失败，补autoAdvance1400后
18项相关测试通过，RF typecheck/作者工程校验通过。首次002新RF在读档即被产品拒绝：
`script-continuation.ts:29`对自动脚本续执行digest严格相等；该digest绑定整个canonical工程，
并非仅001实际出现的场景。此前“无需重录001”的判断只查story依赖、漏了存档绑定，现明确纠正。
不改旧raw/存档digest、不降校验；仅重新运行RF001生产新存档，Game001与本次Game002可保留。
工具判定代码不为此修改；后续任何作者内容变更，须同时审故事依赖与保存continuation摘要。

002新证据暴露执行读取缺口（冻结后定向修订，不扩比较域）：RF
`reforge-002-2026-10-08T15-55-55-730Z/report.json`240秒超时，停在赏银前对白。
已显示完→实际确认间隔4/11/19/36/40秒，按键dispatch仅2–15ms；
inn-journey每次对白循环全量读取__readInnEvidence，后者structuredClone所有causes/resources，
旧RF002完整raw已128MiB。003的progress、004–006的drive已是轻量读取，002漏接。
Codex核定窄修build allowed：补同型__readInnProgress，只投影final/pages/count/order/health，
对白/hold/结束等待不再复制档案，最终仍原样导出完整证据；不改产品、采集域、比较、按键、超时。
真实collector反控证明progress不读causal/pixels、返回脱离副本，最终完整导出仍包含全部字段。
两个001 producer均不依赖本次inn-observer/inn-journey；此次是工具JS修订，不改变存档digest，
因此复用最新RF001正式存档。002两引擎执行器均受影响，必须重新采002，不复用其旧执行成功冒充新通过。
execution_review独立窄审accept：真实collector进度读取不读causal/resources，最终非空像素/因果完整导出；
结束全量导出再核innEndPresented。另补RF auto-advance奖励页截图里程碑，发键条件未改。
本修订工具349/349、lint3311文件零诊断、文档门零问题；日志为
`/tmp/type-pal-infra-full19-20261009.log`、`/tmp/type-pal-read-lint2-20261009.log`、
`/tmp/type-pal-read-docs2-20261009.log`。性能恢复只能由下一次002新实跑证明，离线不冒称。

以下为冻结前记录，保留历史：2026-10-09 A–C收尾，尚未宣布D冻结。
保持原任务继续推进，未开启剧情浏览器、未补录、未提交推送。Codex唯一写入，既有reviewer只读验收。

- 执行/资源/存档衔接窄包已获独立复核：004/005 story与saves provider分别绑定；005实际保存输入、
  初始实际恢复和前驱文件严格相连；RF实际bake canvas→成功draw→decoded frame字节链完整。
  删除旧checkReforgeSpriteDraws及其重复测试，由checkSpriteResources唯一承担实际资源证明；
  旧函数的跨scope合法span误拒和中途换sprite漏检均已由真实collector正反控覆盖。删除可由Git恢复。
- 六段authority、camera、persistent、invocation、有限作者执行均已接共同比较；49条必需run在录制前
  独立预检完整有限分支/repeat，不把七场景spec硬塞进每个producer依赖。
- 镜头新增独立canonical scene/map边界与来源hash，两边各自精确夹取；非新增坐标容差。
  接管竞争窗口包含initialCauses中已开始未完成的指令；同visit不同run不能借用彼此接管结果。
- persistent新增金钱/物品/音乐/外观、组队保留实例和技能、相对定位；真实caller正反控通过。
  moveEntity记录真实script-project-core开始/终点提交/结束，区分提交前取消、提交后取消和仍运行；
  提交后取消不得回滚，缺结束/缺快照为unknown，保留旧起点的反控被拒。未改产品语义。
- 当前显式屏幕效果只有5条：004醉道士两次720ms溶解，006洪大夫600ms淡出/淡入、上船600ms淡出。
  新增实际effect实例、owner、成功输出、完成/取消取证与合同；真实driver/output caller正反控通过，
  execution_review独立窄复核中。不声称调色板、全屏RGBA、声音硬件或所有rAF逐次相等。
- 原型改为完整accepted基线+语义witness定位，不写旧order、不把unknown当正控；接管删除选有前后
  同session checkpoint的见证。完整raw反控留待新accepted基线执行，不能宣称已跑通。
- 离线预检脚本infrastructure-preflight已检查49个spec、全部causal锚点和12个producer依赖闭包。
  `/tmp/type-pal-infra-preflight-20261009.json`逐件绑定旧report/raw，12件均缺实际资源/页面实例；
  RF另缺author/lifecycle，004–006旧件缺完整causes。因此需要12件新独立story，不升级旧raw。
  004/005正式saves provider仍另跑；这不是把专项重复当作完整story通过。
- 全工具中间回执347/347（`/tmp/type-pal-infra-full15-20261009.log`，后续屏幕效果改动待最终全量）。
  typecheck七包零诊断；lint3306文件0error/0warning/0info。文档门发现84项源码hash/行锚点过期，
  正在核对刷新；不豁免、不改历史实跑结果。最终冻结后才进入D补录和E剧情验收。

本节是用户要求的后续架构与实施计划，**正在实施，不是完成回执**。整卡保持build。
2026-10-08用户批准按序实施后，中断于未验收的工具改动；恢复时先修正这些未完成改动，
不能把此前346例通过或001/002旧回执当作当前工具候选已验收。不开剧情浏览器、不补录。
Owner为Codex；execution_review、recording_review、comparison_review只读复核，禁止并行写同一实现文件。
本次窄包build allowed：统一按键尝试/释放及失败收据，修复页面实例采集与004–006因果采集的已核缺口；
依据下表真实caller及复核证据实施，A的完整义务/依赖清单仍须收口后才能进入C、D，不宣称A整体完成。
不要求用户重复决定已经明确的原则；只有新的演出取舍或关键事实无法核实才交用户裁决。

#### 目标与非目标

目标是**共用机制、分离策略、保留剧情特例**：执行负责真实操作，录制负责忠实取证，比较负责独立判断，
连续演示只负责编排已经验收的片段。不能靠统一入口包住六份重复底层实现，也不把特殊剧情塞进通用内核。
用001–006完成这一架构的实际接入，但不声称证明未来全部剧情。下一段只需新增场景配置/专用义务；
真正出现新机制时，以明确的不支持或缺证拒绝，不能默认为通过。

不新建游戏剧情阶段、状态方案或并行脚本功能；不改产品行为；不为此次工具整理重写整个游戏事件系统。
不追求两引擎内部指令、所有浏览器rAF次数或绝对墙钟一一相等，也不增加坐标容差、菜单键过滤或NPC白名单豁免。
已批准的001/003末半格匀速差异继续作为严格转换关系检查，原有有效专用剧情检查保留。

#### 已核缺口与代码锚点

以下是本规划时源码锚点，后续移动文件/行号须同步；它们证明工具缺口，不等同于新产品缺陷。

| 缺口 | 已核现状 | 补强归属 |
| --- | --- | --- |
| 按键执行仍有多份实现 | `input-ledger.mjs:19/74`已共享异常释放/执行收据，但`kitchen-journey.mjs:104`、`meal-journey.mjs:414`、`errand-journey.mjs:98`、`boat-journey.mjs:104`、`boat-game.mjs:170`及`continuous-story-replay-engine.mjs:337`仍直接操作键盘 | 共享执行内核，逐caller接入；不是再加一层入口 |
| 路线/转向策略与底层耦合 | `inn-journey.mjs:238`已用固定计划与位置事件；`committed-route.mjs:6`转向仍轮询；`meal-journey.mjs:48`自己实现导航，003–006仍调用旧导航 | 固定测试策略与演示策略分开，共享事件等待/输入生命周期 |
| 录制不能完整辨认实际呈现 | `opening-trace-plugin.mjs:105/116`的Game精灵只记cache类别；`opening-matrix-observer.mjs:373`对白全局按内容去重，重复同文页面可被抹掉 | 引擎只读采集适配器，实际资源身份与页面实例 |
| 单项效果正确尚不足以证明顺序正确 | `trace-prototype-check.mjs:356`仍列跨效果先后关系unknown；`script-causal-observer.mjs:2`已有run/occurrence/wait等可复用证据 | 因果关系比较与义务覆盖，不重建一份平行日志 |
| 完成判定和准入范围不完整 | `trace-prototype-check.mjs:342`写死partial；`recompare-recording.mjs:16`只接001–003；`continuous-acceptance.mjs:68`新producer门按001/002特判 | 统一义务清单/能力校验与001–006接入；不是把partial改成passed |
| 来源依赖只能保守判断 | `recompare-recording.mjs:64`哈希全部非测试E2E模块，`continuous-acceptance.mjs:18`用少量纯判定文件分类 | 可核的执行/采集/语义输入/判定依赖分组；未知影响仍阻断，不能目录豁免 |

前提矩阵：原版为N/A（本包不改原版机制）；第一阶段原生输入/提交/绘制为对照事实；第二阶段用自身
命令/提交/绘制证据表达同一演出意图；工具目标为如实执行、取证和判断，不改变两边时序来制造等价。
涉及资源选择、页面实例或控制权钩子的具体实现，须在A包补齐原始caller锚点和可证伪观察后才实现。
最强替代解释为日志/适配错误而非产品错误；必须同时验证合法并发、重复对白和合理末步差异不被误拒。

#### 分层与职责边界

| 层 | 共用部分 | 允许不同的部分／禁止越界 |
| --- | --- | --- |
| 剧情用例 | 用例描述入口、动作作用域、参与者、语义检查点、结束条件、验收义务 | 001–006各自正文、物品/对白/乘船等业务步骤；不直接发键或自己写松键/重试循环 |
| 执行内核 | 按下/保持/释放、订阅先于输入、事件等待、超时/取消、异常清理、执行收据、浏览器会话生命周期 | 不含李大娘/张四、碎片号、剧情成功判据；长直线持续按住，不拆成逐格短按 |
| 执行策略 | 都调用同一执行内核 | 独立测试为冻结真实输入计划；连续演示可用语义路线/寻路。策略不能改角色坐标、写剧情状态或伪造输入 |
| 引擎适配 | 向上提供含来源的标准事实，保留原生字段/坐标和精确转换 | Game/RF真实位置提交、转向、对白/菜单消费、切场ready、存读档协议不同；适配器不能宣布“这一剧情通过” |
| 录制内核 | 事件顺序、身份、深拷贝、容量/丢失检测、不可变输出、来源与能力清单 | 用例声明采集域，引擎适配器读取真实事实；不知道预期正确值，不合成缺失证据 |
| 比较与验收 | 原始记录只读、语义适配、义务覆盖、转换关系、因果关系、三态结论与证据定位 | 剧情特例作为显式合同接入，不能改raw、绕过共性失败或直接覆写总passed |
| 连续编排 | 六段准入、完整boundary操作裁剪、前后边界检查、双屏同步 | 可选择演示策略，不再实现按键/录制底层；演示成功不能替代独立对比 |

这是模块责任划分，不是七套新框架。优先复用并收敛`browser-journey`、`input-ledger`、`committed-route`、
`script-causal-observer`、`trace-refinement`及现有专用合同；不为目录整齐整体搬家，不引入另一门剧情DSL。
browser-journey目前默认装opening采集器，后续由用例/引擎显式注入采集配置，会话核不硬编码001。
存读档是带边界scope的上层流程，菜单操作仍经共用输入核；连续模式省略整个边界流程，不屏蔽Escape/Enter。

#### 执行与录制协议

1. **计划与实绩分开**：用例计划是期望输入及完成条件，actions是唯一实际输入账本，route等只是投影。
   不能把跑偏后的实绩反写成正确计划。独立测试不运行自适应导航；两引擎差异只可来自有来源依据的
   输入协议适配，不能运行时临时补键。002目前Game10/RF11次正文Enter不是完全相同输入，A包须核清
   这是已定义消费协议还是需调整的输入合同，不能以同文本结果代替说明。
2. **真实事件而非轮询停点**：位置进度只收位置变化提交；转向等待另订阅转向；场景就绪/对白完成另证。
   移动最后一次提交不等于最终停点。先订阅再按键，异常/超时/页面关闭均尽力释放并记失败。
   订阅本身不保证异步松键没有延迟；必须反控多到一步、连续突发提交和释放迟到，偏差立即失败，不能容差通过。
   服务启动/健康检查可轮询，但不能借此决定剧情输入、到点松键或转向。
3. **分清操作与消费**：输入执行完成只证明浏览器调用完成；位置变化、对白确认、菜单操作实际被游戏消费
   须有独立观测。记录取消/失败结果，不用finally观察冒充成功提交。用例的完成判据同时核关键剧情结束、
   无待确认对白、所需控制状态和精确停点，不用route最后一条代替。
4. **有身份的事件**：统一envelope至少保留引擎、录制、sceneVisit、递增order、事件kind和真实来源；
   actor/run/command occurrence/action/page/draw各用适用的身份字段，不要求每种事件填全部字段。
   坐标、朝向、状态、behavior/activation、精灵/帧、控制权、等待及对白消费分别保留真实转换；
   原地状态变更不能按位置/帧去重，相同对白的新实例不能按文本去重。
5. **实际绘制证据**：Game在真实资源选择/绘制caller记录资源身份、实际帧及fallback，再与独立资源真值关联；
   不能拿NPC元数据填充“实际用了该精灵”。对白实例、首次符合条件的显示、完整页及消费分别关联。
   保留绘制节奏/持续区间与状态变化，不能通过压掉停顿或所有重复帧掩盖卡顿；不为此要求全rAF内部调度相等。
6. **控制权的观察边界**：先复用现有run/command/等待/切场证据，核暂停、恢复、取消与跨visit归属；
   本域必要的激活/释放事实不足时补只读钩子，不能只因命令边界合规就声称全生命周期已证。
   外层cleanup的绝对调度瞬间不是默认比较目标，但影响后续动作/首个画面的释放先后属于必需义务。
7. **能力不是自报通过**：producer列出证据能力和真实依赖，收尾以实际字段、身份连续性、错误/溢出核验。
   A包测算001–006各域容量；需加容量或分块时保留全局顺序与数量校验，不能截断后仍passed。
   旧raw只读，缺字段标unknown；不写兼容默认值，也不把原始文件“升级”成新录制。

#### 比较协议与有限完成标准

以“义务清单 + 实际证据 + 转换关系”替代不停增加NPC特判。清单同时由**用例预期**和**实际执行效果**
核覆盖：少跑整个run/漏采整个NPC不能因它没出现在日志里而消失；实际多出的未知效果也不能没人检查。
每项义务记录适用前提、来源、所需证据能力、承担的通用/专用规则和证据定位。

- **单轨先证事实链**：输入执行/消费、源命令occurrence、效果提交、状态观察、实际绘制/页面、剧情结束
  分别校验并关联，不能用同一待测输出生成预期再自证。有限正文、背景循环和取消run分别规定终结条件。
- **跨效果先后使用偏序关系**：按源脚本意图/已核合同生成必需的先于、等待完成、暂停、并发和恢复关系，
  将每个范围内的持久效果挂到相应run及移动/等待/对白边界；并非把两个引擎全局事件排成相同一条串行序列。
  独立NPC合法并发可换序，但不能把应在对白前的定位延迟到对白后仍通过。
- **跨轨比较语义观察**：精确位置/终点、姿态/实际帧序列、可见状态、步态节奏、对白内容/显示/消费、控制权及
  有意义的时序均在域内；两边opcode/内部cursor不同不是错误。获批差异用有前提的转换关系证明，不是跳过比较。
- **覆盖缺口进入总判定**：缺规则/缺证据为unknown，违反关系为rejected，满足为proved；所有必需义务都proved
  才能通过。approved refinement仍需其关系proved。未适用项须有可核前提，不能自由标N/A。
  原型不再写死partial，但也不因删掉固定unknown就通过；原型、独立比较、连续准入共用同一义务结果。
- **输出可定位**：给出NPC中文名、剧情段、首个违约关系、两侧原始order/来源、缺证字段和原因分类。
  保留专项检查，不要求一个超大函数吃下所有剧情；新专用规则必须有正例和有效反例。
- **来源失效按依赖判断**：区分执行/录制/运行时与内容/判定/语义真值依赖，核真实import与非代码读取；
  漏报依赖的反例必须失败。不能用手填“纯判定”名单规避影响，也不因无关工具改动自动重录全部剧情。

#### 实施顺序与每包出口

| 包 | 工作与交付 | 进入下一包的条件 |
| --- | --- | --- |
| A：冻结合同与caller清单 | 001–006×两引擎及连续模式逐入口列出输入、事件、采集、依赖、义务；复用现有六段合同，核清消费协议/特殊能力/存档边界 | 每个caller有归属、每个必需义务有证据来源与验证者；未知关键前提已查清，形成有限清单和本包build准入 |
| B：执行/录制共用核 | 将短按、长按、转向、取消/释放、会话生命周期收敛；两引擎适配；补资源/页面/必要生命周期证据；一次接齐001–006和演示调用方 | 不再有场景脚本自写底层发键/松键；真实caller与插桩反控通过；旧重复实现及无人使用分支移除，剧情特殊策略仍清晰 |
| C：比较/准入闭环 | 补效果偏序和覆盖，复用专用合同；离线接入004–006及完整来源校验；原型/比较/连续使用一致门禁 | 下述正反控通过，所有范围内效果有规则；工具支持六段不等于六段已passed，缺证须准确阻断 |
| D：工具冻结与最小补采 | 工具/静态质量零诊断、独立复核；离线扫描旧/新raw的实际能力，出逐片段逐引擎缺证清单；先冻结producer/合同/比较器，再执行必要补录 | 每次补录只补列明的缺证，原始文件/前驱链可核；无缺字段的记录复用，不能在跑到后段时临时扩比较功能 |
| E：剧情验收与连续演示 | 按001→006审当前双轨结果，发现产品差异先归因、修复并最小复验；六段通过后移除完整边界流程、同页连续执行并左右分屏 | 独立、双轨、连续三个回执分别成立；最终对白完成/控制归还/终点精确，连续异常与分段原日志首差对照 |

A–C先闭合基础设施，不再“001工具先补一点并重录，走到004再补另一种工具”。可以内部拆小提交/测试，
但未过D不得宣布工具补强完成或开始常规剧情批次。D发现真实caller无法离线证明的采集事实时，只做有明确
问题与出口的最小采集验证，不能假称已有新浏览器证据。Owner负责记录证据，不要求用户搬运审查结论。

工具验收反控按机制而非数量：

- 执行：实际调用方的按下部分失败、释放失败、取消、事件早于等待注册、突发提交/迟到释放、只转向不移动、
  切场后同坐标、长直线单次hold；正常菜单输入保留，跨scope按键对不能被裁成半对。
- 录制：同位置state A→B→A、连续同文新页面、错误资源/fallback、错run/visit、日志溢出/丢事件；
  真实转换后的collector验证读值/深拷贝/插桩一次，不只对手写对象做schema断言。
- 比较：删除必需run/中间效果/帧或页面、调换有依赖的效果、效果晚于显示、收据错owner均不可通过；
  合法并发、重复页面、同姿态多次绘制和已批准末步关系须能通过，防止用过严全序换取假安全。
- 准入：同一真实raw正控先通过，再分别破坏必要字段、来源hash、前驱、完整action/boundary映射，须在开浏览器前拒绝。
  故障副本不改原件，不把本来unknown的基线当“检出成功”；不硬编码旧日志order来定位反例。

**补录决策**：刚补录的001/002修好了当时的state/behavior/输入收据缺口，不代表拥有尚未采集的实际Game
资源身份及001页面实例。因此不承诺这两段永不再采，也不现在宣布全链重录。D按实际缺证选择片段和引擎；
仅比较器变化一律先离线重算。新报告路径不等于世界状态变化：可用内容hash证明前驱状态未变的，显式绑定证据
而非静默改写旧前驱；只有实际存档/下段起始语义改变，才从最早受影响边界向后验证。
连续计划仍必须绑定真实被接受的前驱证据，不能为了少跑绕过链验证。

收口分两次明确报告：D的“工具补强完成”给出caller收敛表、义务/能力矩阵、真实反控及零诊断证据；
E的“001–006双轨/连续完成”给出六段和演示回执。不能混称，也不以工具测试数或“0finding但覆盖不全”代替完成。
已完成的上一包与旧原始报告保留为历史事实，不追溯改写。本轮无下一位Agent提示词；
Codex继续唯一实现，现有reviewer只读复核，不要求用户转交。

### 2026-10-08 当前实施回执（未冻结，不启动剧情批次）

续推工具接入回执（仍在A–C，未到D）：

- Game001已接runBrowserJourney，共用会话/超时/异常清理/报告发布；保留开场、输入、正式存读档和原判据。
  删除无人调用的inn-route及旧轮询导航实现/仅为它们服务的测试，原实现可由Git恢复；未改正常菜单输入。
- required-story-executions已从独立的canonical作者清单核001–006必需有限run、完整命令链及真实run结束。
  切场必须在本run结束前发生、不能借竞争loadScene；非取消异常不作成功。背景循环/生命周期全证明仍未完成。
- 001–006双轨入口均发布recompare-recording产生的同型acceptance.json；004/005专项保持独立，
  不用saves的第一上下文片段冒充完整story。004离线重放三段真实phase，核窗口顺序/对白归属/物品派发；
  006从完整raw重算船体/乘员真实draw，核motion/stateTrace字节、原始终点、最终对白和归还控制。
- 修正006旧入口“计算了苗人头领hold但不计总判定”：现在以真实对白开始/关闭及实体提交/绘制检查，
  同文页面不变时A→B→A移动也拒绝；不是只核页快照。对白95行/说话人由原始脚本读取，保留文本控制符转换。
- evidence-dependencies按实际import与HTML module入口构建执行/采集/运行时闭包；核参与包和tsconfig父链、
  workspace/lockfile。必需非代码输入由当前合同+producer-inputs独立规定，不能由report删掉后自证完整。
  移除continuous-acceptance的手填verdictOnly和001/002特殊准入；缺manifest保持缺证，不升级旧raw。
  worktree共享extracted只接受Git common-dir推导的同路径真实输入，其它越界/任意symlink仍拒绝。
- 实际collector反控暴露meal/errand在切场但主角坐标未变时漏新visit观察；现保留before连续性并记录新visit。
  全五collector同坐标跨visit、006真实collector/文件绑定及NPC中途移回反控通过。
- 当前全工具334/334通过（/tmp/type-pal-infra-full10-20261008.log，约6.6s），格式检查零诊断；
  数量较旧366减少主要为已退休轮询实现的测试。未拿此数冒充整套accept，静态全仓门待最终冻结再核。
  recording_review/comparison_review正在独立复核上述窄包；未启动新剧情浏览器，未提交/推送。

本轮追加（仍未冻结）：

- 实际authority mutation/epoch、auto启动/取消/结束、wake gate注册/兑现已只读采集并接总比较。
  recording_review独立关闭四项反例：getter须在实际boot恢复/启动前安装；abort观察异常不得外抛；
  auto-ended须在实际map删除和finishWork后；session切换须有真实失效事件。机制测试4/4通过；
  不把restored自动动作的全部行为或任意target eligibility宣称为已证。
- 实际NPC绘制资源新增decoded pixels/opaque不可变收据，与原始资源字节独立解码核对。
  RF依据实际bake的canvas绑定、成功entry.image绘制取证，避免借sprites选择时旧frame；
  catalog解析与hash绑定同一份字节；跨story边界draw span保留真实之前actor时间线。
  这是indexed frame输入证明，不声称调色板/最终遮挡合成的RGBA全等。资源窄复核仍在进行。
- 006跨对白窗口draw span反例由comparison_review关闭；真实collector正反控2/2。
  006 CLI拒绝未知/重复from及冲突模式，两个producer读取005完整独立receipt，不仅信任status字段。
- 连续准入分离story与004/005 saves provider：由下一段真实predecessor派生，绑定同引擎、同前置、
  revision、完整producer依赖和全部raw/save字节。004新增三context/两save离线检查及真正加载成功钩子。
  execution_review发现005最终保存输入和004/005初始恢复未连接到实际存档；已补连接，待反控复核。
- 定向26/26通过（/tmp/type-pal-handoff3-resource2-20261008.log）；此前全工具339/341中两项是新增
  lifecycle缺证结果未更新期望，已修测试期望并启动全量复验。未启动剧情浏览器、未提交推送。

仍须完成：004–006全域效果偏序/覆盖接入、原型去旧order反控及固定partial、上述窄包复核、
D最终质量/缺证表。旧段通过结果不升级为本候选通过。

继续实施补记（仍未过D，不是六段验收回执）：

- 五个observer已共用evidence-recorder：所有流统一顺序、深拷贝、字节/条数预算；任一流溢出封住全部流，
  span扩展也计容量，失败不虚增order。独立只读复核确认此窄包及不可变/溢出反控。
- 004–006改为story-input-plans冻结路线，经executeFixedRoute执行、同一actions记账并严格核实际步骤和独立终点。
  execution_review核14份旧raw：133条路线中128条完整一致，5条为已列明计划调整且终点一致，
  这5条须D/E实跑，不冒称新通过；旧无人调用的动态路线实现还须清理。
- 006运动证据改读真实完成world draw，保留船停顿期间的party/张四/船A→B→A变化；删除微小坐标容差和取整。
  execution_review复核真实collector反控，并离线消费两份旧006raw确认此窄包关闭。
- RF runId改为真实runFlow调用实例，activity/signal与runner分开；实际runEntityTrigger桥、子run及返回逐项绑定。
  异步timer/IO保存注册时完整owner，而非结束时借当前command；recording_review独立关闭错owner、隐去父子关系、
  同改bridge/child目标三项反控。共享脚本callScript等非本域调用仍明确unknown，不宣称全引擎证明。
- actual run-start记录实际entity行为/scene hook/item-private作者来源；全量RF world仅在真实observe:causal同步读取后
  立即深拷贝，不借旧快照。有限必需作者清单story-execution-specs已建立，接入总比较/终结仍在进行。
- 持久效果由自己的下一command/settlement设截止点，完整world核跨场景状态；与有限参与者姿态证明分开。
  comparison_review指出的并发借证已修：相同值竞争也不能替本命令作证，writer范围含multi-state、relative-pos、
  moveEntity终点，并覆盖窗口开始前已运行的异run写。取消/异常结尾未观察到效果归unknown，不假称错误执行。
  切页仅清selection/activation、不无条件清cursor；loadScene前命令仍须及时生效，不整run豁免。
- 最新全工具候选曾366/366通过（/tmp/type-pal-infra-full7-20261008.log）；此后上述并发/取消补丁定向27/27通过
  （/tmp/type-pal-own-deadline-20261008.log）。仍需最终全量/静态门和独立复核，不能引用旧零诊断当冻结证明。

本节追加实际进度，不覆盖下面历史补录结果。当前唯一写入Owner为Codex；既有execution_review、
recording_review、comparison_review仅独立只读复核。无提交/推送，无新剧情浏览器录制或演示。

已实施并有离线证据：

- 真实按键统一进入input-ledger；尝试先登记、部分keydown失败仍释放、keyup有界重试且不抹第一次错误。
  正文菜单键保留；连续报告只保存实际执行actions，计划/skipped放operations，失败仍写真实收据。
- committed-route在浏览器内先订阅、按真实位置提交消费完整步骤，长直线一次hold；转向也用事件。
  达标后到实际keyup/finalize期间仍有守卫，额外玩家提交、跨visit、转身后又转回、终点暂到后漂移均拒绝。
- 003五段已改用kitchen-input-plan/fixed-route-plan；两份
  `build/e2e/{game,reforge}-003-2026-10-07T14-28-05-{155,138}Z/report.json`
  完整replay.steps（仅排除order）与独立completion逐项一致；execution_review另行读两份raw核实。
  这是计划与历史证据核对，不是003新录制通过。
- 五个observer共用script-causal-observer的页面实例与因果采集；Game按实际shownLines生命周期，
  RF按真实open epoch/slot/page，不按文本/时间去重。Game dispatch增加auto和onEnter实际读取点，
  同帧goto多条命令保持不同occurrence；battle/use/poison未纳入本域，不能声称全引擎生命周期已证。
- Game绘制记录实际spriteNum，RF分开definition asset和真实resource key；这不是资源内容digest证明。
  004/005/006的world-render/command context补真实causalFrame、party与commitOrder；
  006保存完整errand trace，删除以前以轮询状态补造岛上actor的fallback。
- 独立复核检出的两个窄包漏洞已关闭：完整页witness只在真实overlay成功尾部生成；
  两侧006写trace/通过前共用collector overflow/errors/seq/order检查。
  recording_review独立复跑相关正反控后确认，仅对这两项关闭，不代表整套accept。
- 证据文件新增共同编码/写入/读取：哈希和byteLength对应同一序列化字节，新证据文件不可覆盖；
  readNpcTrace先核声明绑定，再生成story投影，并保留rawTrace。旧件缺绑定为unknown，不修改旧raw。
  006乘船motion和stateTrace也记录绑定，消费这些旁证的离线006入口仍待接齐。
- 文件读写边界另核realpath，目录内符号链接越界读写被拒；实际I/O反控确认外部无新文件。
  recording_review已独立关闭此项；这不是恶意并发文件系统的完整安全证明。
- 004阶段开始返回原子marker.order，不再另一次RPC取起点；检查结束记真实end marker。
  mealPhaseWindow只选真实区间；Game serve沿用guest-room起点（进客房即可触发），RF用serve起点。
  不用后续拿酒/送酒事件污染前面的pickup检查。

独立复核边界：execution_review定向29/29，额外直接终点漂移反例被拒；
recording_review原页面/dispatch/资源包24/24，随后两个漏洞的修复正反控均通过；
comparison_review只完成下表接入审计，没有签整套accept。
本轮工具全量曾356/356通过（`/tmp/type-pal-infra-full4-20261008.log`，此后仍有上述修改，
不能当最终冻结回执）；最新证据文件/合同定向96/96通过
（`/tmp/type-pal-artifact-binding2-20261008.log`）。
004区间窄包由comparison_review独立42/42及真实observer start→commit→end→window核验通过；
文件绑定窄包由recording_review核真实I/O与所有写入caller后确认，006旁证消费未冒称完成。

容量实测只读旧raw（紧凑JSON字节，不冒称当前producer新录制）：

| 段 | Game bytes | Reforge bytes | 缺证限制 |
| --- | ---: | ---: | --- |
| 001 | 2,324,797 | 5,709,381 | 新资源/实例等字段仍须D判断 |
| 002 | 5,111,855 | 56,481,671 | RF causes占51,791,861 bytes、19,157条 |
| 003 | 2,699,820 | 10,105,798 | 当前固定计划未实跑 |
| 004 | 1,549,004 | 3,480,422 | 旧件未录causes/phase闭合 |
| 005 | 5,569,681 | 3,157,025 | 旧件未录causes |
| 006 | 952,997 | 2,568,589 | 旧件是裁剪NPC trace，不代表完整新trace体积 |

据此删除005整件16MiB限制，改共同256MiB（与causes192/render24/snapshot8/event4 MiB流预算相容，
留导出开销）；超限继续硬失败，未截断放行。当前004–006实际总容量仍须D最小采集确认。
小预算反控验证共同编码器的超限拒绝，不为了测上限反复分配256MiB伪大字符串。

当前候选质量回执（只是本轮代码/文档门，不是D冻结或剧情验收）：

- `pnpm test:e2e-tools`：360/360，零failed/skipped，`/tmp/type-pal-infra-full6-20261008.log`。
- `pnpm typecheck`：七包完成，零诊断，`/tmp/type-pal-infra-typecheck2-20261008.log`。
- `pnpm lint`：3287 files，0 errors / 0 warnings / 0 infos，
  `/tmp/type-pal-infra-lint4-20261008.log`；Biome当前工具格式检查亦通过。
- `pnpm check:docs`：915 Markdown / 5216 links / 288 tasks，文档与testing-docs均0 issues，
  `/tmp/type-pal-infra-docs2-20261008.log`。
  首次文档门的源码hash过期未忽略：实际核读八份E2E文档现有caller/input/oracle/collector锚点后，
  只刷新catalog、testing-meta与document-audit的sourceRefs，并追加“非新实跑”的说明。
  历史candidateSha/revision/版本/history/runtimeExecution及build原始产物均未改写。
- `git diff --check`无问题。未执行全仓`pnpm check`，不冒称产品全量测试已跑。

#### 已核有限接入清单（不是字段存在即证明）

| 段 | 既有专用判据 | 离线必需原件／本包剩余 |
| --- | --- | --- |
| 001 | assertOpeningMatrix/Actors、OpeningHoldIntent有限作者链/终结/等待/绘制 | report完整matrix；现有离线入口不能代替完整义务覆盖 |
| 002 | assertInnEvidence/Choreography、InnTimingIntent；slow-reader另用DialogueHolds | 完整inn-trace、终态/存档/作者合同 |
| 003 | assertKitchenTrace/Dialogue/StoryEnd、KitchenTimingIntent | 完整kitchen-trace、stairs、前驱/终态payload |
| 004 | assertMealCollector/Dialogue/Phase/EndWorld | context trace、真实phase start/end、storyEndWorld、物品合同；离线重放各区间待接 |
| 005 | readErrandReceipt已串哈希/collector/对白/先后/终态 | 全量contextTraces；saves另核正式存档及第二恢复上下文，不能把storyScope投影拿来核全局序号 |
| 006 | assertBoatReport/StoryEnd、summarizeBoatMotion/compareBoatObservations | 完整context、绑定motion/stateTrace、实际最终控制与对白结束；须从CLI抽纯入口，报告字段不能自证 |

已核实际新增语义域：004外观/道具/dither；005相对定位/场景hook/停音乐；
006fade/定位/stepEntity/乘船与切场自动链。现有persistent-effect只覆盖state/behavior/page/activation，
authority/camera/effects入口仍限001–003；不能扩大switch后即称六段全部支持。
需要把实际命令域映射到既有通用/专项证明，未覆盖项进入unknown；预期必需run和实际多出效果都要核。

剩余出口（A/B/C均不冒称完成）：

1. 004–006固定独立路线及对白/菜单消费协议接入；不得保留动态重规划冒充固定输入。
2. 统一observer序号/容量/不可变快照机制；旧件容量已测，当前完整因果采集容量还不能用旧小件冒充验证。
3. 完整生命周期、资源oracle、同期效果的偏序证明与有限expected/actual义务覆盖。
4. 上表004–006离线合同、所有原件绑定/健康检查；准入去掉001/002特判及手填纯判定文件名单，
   按真实依赖分类失效，不按整个工具目录自动要求重录。
5. 冻结前全量工具/零诊断静态门和独立复核；然后才生成最小缺证补录清单、执行D/E。

另有已查清但本工具包不改产品的差异：002两侧10/11次确认并非可直接放行的“协议差异”。
RF多的一次对应dlg.51“获得500文”居中提示；Game narration/item-box最长1.4秒自动消失，
RF此cue未设autoAdvance。证据：game/core/event-system.ts narration分支、
reforge/dialog/dialog-box.ts advance/update及s003/e56作者cue；参考实现
`reference/sdlpal/text.c:1663–1710`的PAL_DialogWaitForKeyWithMaximumSeconds(1.4)。
SDLPal是参考实现，不宣称等同未直接验证的pal.exe。剧情修复批次按意图/迁移层继续归因，
不能通过多发Enter掩盖这个差异。

### 2026-10-08 已完成包：执行/采集补强及001、002补录

用户明确将本轮扩大到录制器、执行器和001/002补录；以下取代历史包的“只离线、不采集”范围限制。
build allowed：Codex唯一实现Owner；pose_contract_review核采集，escort_truth_review核执行，均只读。
本包不改游戏演出或内容，不补录003–006，不启动连续演示。新报告另建目录，旧raw不可变。

前提真值：原版输入/状态不变（不改原版，N/A）；一阶段原生`NpcState.sState`与行为游标已有，
001投影`opening-matrix-observer.mjs:411`遗漏；二阶段`host.getEntityState`及`world.script.behaviors`
已存在，001/002投影漏采，而003已采。目标是在真实`refreshRuntimeProjection`完成边界记录完整状态，
保持同一order/sceneVisit和深拷贝，缺省覆盖明确null。真实状态效果和新模型共同反控，不靠末档推断中间态。

执行前提：`inn-navigation.mjs:137`独立002仍轮询决定松键，既有两轨原始路线均为向下11格、向左17格；
目标是冻结这段真实输入路线，用既有位置提交订阅判定精确进度，直线一次按住，无自适应改道、无坐标容差。
`game-opening.mjs:180`、`reforge-opening.mjs:94`、`inn-journey.mjs:138`短按缺异常释放，目标为真实按键
尝试/完成/失败收据与finally释放；不能把失败输入记成成功。边界裁剪只能按完整action scope，不能滤键名。
最强替代解释为采集投影而非产品错误、订阅误把转向当移动、末次移动不等于剧情完成；以真实转换后的caller、
异常键盘、完整提交序列和独立完成事件分别反控。先过工具测试，再001两轨，再以各自新001真存档进入002。

连续入口缺当前双轨比较回执的门禁已登记，本包核定并补强可复用执行/输入边界；不能以独立passed代替双轨验收。
硬性质量门零诊断，补录前后分别核producer哈希，新的比较回执必须绑定新的raw。

#### 本包完成回执（2026-10-08）

001、002各一次新双轨浏览器批次，四份独立报告均passed，真实存档/新上下文读回完成；
两份新双轨比较均0finding，原有明确批准差异仍按关系核验，不等于逐rAF完全相同。
001相关持久效果4命令/76检查、002为18命令/867检查，均proved且missing为空。
新001 Game/RF正文均55行；新002均20行。002路线两轨均为Down长按11格、Left长按17格，
实际提交全序列精确匹配，之后单独等待切场ready/李大娘对白，未引入寻路或坐标容差。
对白确认沿既有本引擎消费协议：001两轨各24次正文Enter，002 Game10/RF11，与各自旧录制一致；
不能把语义相同的对白消费宣称成跨引擎所有输入边缘数绝对相同。

新raw目录（均在`build/e2e`，内容不可变）：

- `game-001-2026-10-08T01-53-29-332Z`、`reforge-001-2026-10-08T01-53-29-336Z`。
- `game-002-2026-10-08T01-58-05-455Z`、`reforge-002-2026-10-08T01-58-05-476Z`；各自predecessor绑定上述同引擎新001。
- 双轨`both-001-2026-10-08T01-53-29-093Z/comparison.json`及`both-002-2026-10-08T01-58-04-912Z/comparison.json`。
- 当前独立离线回执`001-rerecorded-acceptance-final-20261008.json`、`002-rerecorded-acceptance-final-20261008.json`，
  status均passed、sourceChanges均0；verifier为`8133bec0ce304286e54f4bc143fead6a2278d5a34e70b55f885aaea7ec71c092`。

采集未溢出：001 actor总日志108/144，NPC快照57/94；002事件1511/2064，NPC快照933/1301；
最大全帧日志6300/60000，RF002 causal19157，全部errors为空。投影提交共用插桩在001–005转换链均一次，
003删除重复finally，不改变产品语义；finally只证明调用后观察，不代表该调用成功。

执行/采集之外补连续安全门：发布和直接播放入口都先真实离线重算，整体核receipt/plan/actions/前驱。
不再信自报source清单、不把所有E2E模块视为纯比较器、旧无receipt tape不得启动。
当前离线支持仍限001–003，故完整六段在004前拒绝，不能称连续已完成；本包未跑003–006或演示。
总形式化观察域仍有前批声明的跨效果先后覆盖边界，不能因本轮补证通过宣告整个001–006目标done。

主代理实证：`recording-admission-counters-20261008.json`为2个真实新回执正控、10个反控全部阻止通过
（其中删state/behavior为unknown并进入findings），6个新raw唯一文件hash不变；旧六份录制12个引用hash也不变。
反控域为证据完整性/输入收据，不冒充新增产品用例。准入首次实测暴露JSON省略undefined造成误拒，
修正为wire形式比较并加codec反控，只离线重算；没有再跑剧情。旧候选及失败日志保留。

最终工具346/346；typecheck全工作区零诊断；lint3281文件0error/0warning/0info；
docs48工具测试、915Markdown/5216链接零问题。来源锚点只同步current sourceRefs，不重写历史运行声明。
日志：`/tmp/type-pal-recording-tools-closed-20261008.log`、`/tmp/type-pal-recording-types-20261008.log`、
`/tmp/type-pal-recording-lint-closed-20261008.log`、`/tmp/type-pal-recording-docs-closed-20261008.log`、
`/tmp/type-pal-recording-admission-final-20261008.log`及`/tmp/type-pal-rerecord-00{1,2}-20261008.log`。
pose_contract_review接受采集边界；escort_truth_review接受输入/连续准入边界；Codex完成真实新raw独立核验。
无下一位Agent提示词，本包已收口，整卡保持build；没有提交/推送或改游戏内容。

### 2026-10-08 前批冻结：语义适配与统一关系（仍非完整双轨证明）

**本轮冻结：指令—观测—显示因果链（2026-10-08）**

本轮没有改游戏、内容或采集器，没有重跑浏览器。统一的是证明义务，不是取消专用剧情检查。
`causal-recording-contract.mjs`核指令occurrence先于归属它的收据；Game由独立dialogue快照和源style命令
推导每个实际draw应显示的完整行，要求首次eligible draw有页面观察，再核显示先于消费，并按源messageIndex
对应RF页面。普通渐显行和瞬显narration走同一义务；源IP合法重入不是重复执行错误。
`persistent-effect-model.mjs`核目标实体的持久override实际观测及RF真实draw的资源身份；数值state不再
把1和2都折成visible。page切换清掉trigger/auto/activation覆盖，inherit删除覆盖，不把内部cursor当跨轨同构。

本轮可证伪反控按根因收口，而不是NPC豁免：错精灵；正确命令后错误行为选择；跨场景state未生效；
正文指令晚于显示；整组页面晚于消费；删除/迟到中间完整行页；瞬显奖励页迟到；收据失去owner；
效果观测落在旧visit或没有采集来源。非proved统一进入完整比较findings，不许unknown旁路。
既有末步细分、选择性并行离场、自动等待暂停等专用合同全部保留。

**新门禁下的真实边界（不追溯改写旧报告）**：

- 001：新增对白、指令溯源与真实精灵检查通过；数值state未采到，无法区分可见但不挡路/可见且挡路，
  persistentOverrides为unknown，整段needs-review。末档隐藏不能证明中间状态。
- 002：新增对白、指令溯源、数值状态与精灵检查通过；逐次behavior/activation/page覆盖字段没有进入
  同时钟actor日志，persistentOverrides为unknown，整段needs-review。report.events确有独立边界快照，
  但不能伪造其与raw order的一一对应；后续应先复用该边界证据，再定最小补采。
- 003：8条相关持久效果命令均有实际观测承接，新检查和既有专用合同均通过。
- 三段Game实际页面55/20/14，对应跨轨完整页26/11/6；只证已采完整行，不冒称逐字像素/逐rAF完全等价。
  Game旧spriteSource仅记录cache类别，不能宣称已经验证实际asset身份。
- 形式化总原型仍partial：除了以上缺字段，尚未完成把**每一项持久效果**关联到源移动/等待/对白边界的
  跨效果先后关系覆盖证明。已有对白对应和局部时序证明不可外推成整个timed word等价。

独立复核：pose_contract_review接受本次效果模型修订与反控，但不签001/002补证完成；
escort_truth_review接受完整行/瞬显提示/消费的限定因果链及其反控。Codex仍为唯一实现Owner。测试基础设施额外修正了纯SSR加载测试的
Vite WebSocket监听（实际安装8.0.14的ws:false），不改变生产dev服务，也不以静默日志掩盖端口冲突。
无下一位Agent提示词；本包由Codex冻结与记录，整卡保留build，不能推进004–006或连续演示。

冻结回执：`build/e2e/001-formal-effects-final-20261008.json`、`002-formal-effects-final-20261008.json`、
`003-formal-effects-final-20261008.json`，公共验证器hash为
`06f402c331d516a41f1af4f239b7a70711830b0ebad49e53a7534eccbedaa5c3`。
三份分别为needs-review/needs-review/passed，前两份各一项persistentOverrides缺证；总原型partial。
反例13/19/22共54项均未获通过（49 rejected、5 unknown），不是54项产品缺陷。
旧反控21/35/56共112项仍全部检出，收据`build/e2e/00{1,2,3}-infra-counters-effects-20261008.json`。
原始report/trace字节hash不变；最终405项当前验证器/运行时/语义输入hash检查与冻结收据一致。
E2E工具339/339（其中真实caller形式化测试13/13）；全仓typecheck零诊断；lint3276文件
0error/0warning/0info；文档工具48/48、915Markdown/5215链接零问题。日志：
`/tmp/type-pal-causal-effects-tools-final-20261008.log`、`/tmp/type-pal-causal-effects-types-20261008.log`、
`/tmp/type-pal-causal-effects-lint-20261008.log`、`/tmp/type-pal-causal-effects-docs-final-20261008.log`。
历史带端口冲突的首次工具日志保留，不冒充最终无错误日志。

继续包准入（用户要求做到相对满意，Codex唯一写入Owner，build allowed）：只读独立核验把当前缺口落实为
指令→提交→绘制/消费的关联缺失，不删除有效专用合同。001把被测实体e11实际draw的spriteSource从628改21、
002把头领state2改1、003把碗碟后继方案take-dishes改default，旧完整入口仍0finding；003把对白页移到确认后
或把showDialog移到实际显示后也未报错。均为旧raw内存反例，不是已证产品bug，不修改原始文件。
一手前提：原始EventObject精灵/状态、Game实际page/cause、RF实际spriteSource、003的behavior已采；
`entity-lifecycle.ts:36–43`区分显示与挡路，`script-world.ts:237–260`写selection，
`event-system.ts:2011–2116`及实际页采集给出showDialog/翻页/显示语义。目标是通用关联与明确证据域，
不另造NPC豁免或强迫两轨浏览器时间全等。最强反证为合法多行翻页/重复ip或暂存中间态被误拒；
须以真实caller、六份raw正例及上述故障副本共同验证。缺字段留具体unknown，不用改报告标签代替补证。

用户授权继续完成原型；本包仍限001–003已有录制的离线语义适配，不改产品/内容/采集，不开浏览器，
不推进004–006。Codex唯一写入Owner；两位贡献者只读独立复核。以下取代前批的当前缺口清单，历史原样保留。

**准入与前提**：build allowed。原版`reference/sdlpal/script.c:81`目标移动末步按坐标距离直接补齐，一阶段保留这一行为；
当前Reforge `entity-walk.ts:72`按步长截断，两者都到精确终点。用户已批准001离房和003厨房的匀速末半格，
目标是明确的转换关系，不是容差。Game `packages/game/src/present/present.ts:550–561`依据原始`nSpriteFrames`映射实际帧，不能以NPC名单
代替布局。Reforge `motion-runtime-coordinator.ts`和`main.ts`决定接管/释放；一阶段没有同名命令，故本包只证
二阶段自动命令准入，不虚构跨轨接管指令相等。`WorldCamera`与Game镜头调用在本批为主角跟随、无pan/边界clamp，
预期镜头由独立主角commit推导，不能拿待检camera计算几何后自证。原版/一阶段/二阶段/目标四向前提均不改变演出取舍。
最强替代解释为采集上下文或模型分类错误；错误owner、错误scene、假materialized、未结束run提前control、错视口/镜头
必须被拒绝，未知效果不能当恒等变换。

- **NPC控制权状态机**：初始化取真实materialized，隐式接管按实际host caller分类；自动command先核scene/visit、
  canonical owner及run上下文，再判断是否被接管。cleanup须前台run结束、恢复control并有后续实际draw，
  不凭core.run-ended或单个control信号放行。001/002/003相关自动命令5/66/52条均proved；未知命令仍unknown。
  只证明已记录命令边界上的准入，不证明activation创建或外层释放的精确瞬间。
- **统一末步关系**：`motion-refinement.mjs`不含NPC/碎片分支；完整位置前缀必须相同，末半格精确为Game一步与RF
  3/8+1/8两步。核末段全部实际draw、连续逻辑拍、朝向/精灵/显隐与首终点draw。001离房及003厨房三段共四例通过。
  全前缀姿态和节拍仍由外层source/author/cadence/presentation义务共同承担，不把terminal proved说成整段等价。
- **Game语义适配与相机**：帧映射读原始精灵布局，删除NPC编号分类；Game视口严格320×200。
  `camera-trace-model.mjs`逐draw核跟随镜头，Game/RF计数分别468/1786、411/4348、236/1019。
  错一小数坐标、错宽度或缺主角提交都不靠容差放行。本声明不覆盖另有pan/clamp的场景。
- **真实caller与反控**：实际host effect、MotionRuntimeCoordinator、Game presentFrame像素输出、RF walkTick和
  WorldCamera参与模型测试。原有三针与12个整run删除保留；本批模型反控共41针，旧完整比较反控21/35/56全部拒绝。
  诊断变异不计作产品覆盖率。pose_contract_review独立核控制权并accept；escort_truth_review独立核末步与camera并accept，
  其发现的错误owner/提前cleanup/视口321/镜头偏移反例已闭合。
- **证据复用**：六份10-07录制原样复用，不重录、不改raw。`currentSemanticSources`单独钉住新适配器读取的布局、
  actor/sprite与场景数据，不伪造为旧producer已记录。候选收据为`build/e2e/00{1,2,3}-formal-adapters-20261008.json`；
  最终冻结版本与质量收据见下方收口记录，不以候选hash冒充最终版本。

仍有两类**未完成**：声明观察域内状态效果的规则覆盖与证据对应；跨引擎完整定时观察序列的语义锚点。
用户2026-10-08进一步澄清：形式化体系与特殊剧情专用检查并不矛盾；此前以“仍有专用验证器”解释未完成不准确。
通用/专用规则都可承担验证义务，完成标准是覆盖、证据及组合判定闭合，不是将全部检查替换成同一个通用函数。
后续按[共同合同](../../../../testing/e2e/contract.md#形式化验证与剧情专用检查用户2026-10-08)推进，保留有效专用检查，
逐项指出未覆盖效果/缺失因果锚点，而非把“专用”本身列为缺陷。此澄清尚未补齐实际缺口，输出保持partial，整卡保持build。
Game日志没有逐rAF调度收据，不能声称已检查未采到的调度过程。当前无需用户作新的产品决策。
本包无下一位Agent提示词；独立只读复核完成，Codex负责当前收口与后续实现。

#### 本批冻结收据与质量门

- 最终收据：`build/e2e/001-formal-adapters-final-20261008.json`、
  `002-formal-adapters-final-20261008.json`、`003-formal-adapters-final-20261008.json`。
  三份比较器SHA均为`53afc3abe385275faeb22b13daea9f0b8e8589072560dc0ff5970f4312fb38f1`，
  三段archived comparison均passed/0finding；formal总状态仍partial，两个unproved义务原样列出。
  其中关于专用验证器的历史措辞按本页上方用户澄清理解，不作为要求消灭专用检查的依据；不可变收据不重写。
  原始report/trace在读取和全部反控完成后再次核hash，均未改变；新语义数据来源与历史runtime收据分栏保留。
- 本批41针反控分别12/17/12；旧完整比较入口21/35/56针仍全部拒绝，收据
  `build/e2e/00{1,2,3}-infra-counters-adapters-20261008.json`。这些是故障注入标本，非新产品用例数。
- E2E工具335/335；全工作区typecheck零诊断；全仓lint3274文件0error/0warning/0info；
  文档48工具测试、915Markdown/5214链接/testing-docs均零问题。初次文档门发现消费者行号引用未同步，
  修正引用后复跑通过，不隐藏该失败。日志为`/tmp/type-pal-semantics-{tools,types,lint}-20261008.log`及
  `/tmp/type-pal-semantics-docs-final-20261008.log`；`git diff --check`通过。
- 没有修改产品行为，没有新浏览器验证，没有提交/推送，没有宣告整卡done。后续应完成统一语义义务，
  不因本批passed先跑004，也不为比较器改动从001重录。

### 2026-10-08 前批结果：形式化轨迹验证原型已验证（非完整双轨证明）

本原型边界内交付，整卡保持build。没有修改产品/内容/采集，没有新浏览器录制。正式终极门禁尚未完成，不能
据本原型进入“001–006全链已验收”；原型明确输出partial，控制权完整投影明确unknown。

- 001三针已闭合：删除接管、转向、定帧command，统一有限作者转换模型均拒绝，且完整比较入口明确报
  opening-authored-execution。不是按order/id特判。001–003共12个必需有限run，逐个删除整个run也拒绝。
- 原型实证：`build/e2e/001-formal-prototype-20261008.json`、`002-formal-prototype-20261008.json`、
  `003-formal-prototype-20261008.json`；三份旧合同重判均0finding，原始report/trace字节hash逐一不变。
  比较器统一SHA为`d2407a941685cb213f91a4426afea0dfdb5adbfc58b370c979f6aec8d5782589`。
  23针分别是用户3针、12个整run缺失、8个显式take后插入owner自动指令；全部按预期拒绝。
- 真实caller：通用有限PC模型用实际compiler/runner执行entry与嵌套repeat后逐command删除反控；权威代数
  与实际MotionRuntimeCoordinator逐步对照重复take、no-op release与release-all；观察等价分别反控错帧、
  错坐标、变更时刻与总时长，并验证重复draw正例。5项精简模型测试，不将23个诊断变异计作产品覆盖率。
- 独立复核：pose_contract_review核三针、三段raw和模型；发现chasePlayer隐式接管被适配器漏分类后，
  改成正面识别显式操作，其余所有前台操作invalidate/unsupported，而非继续补黑名单。适配器反控与
  去掉未知effect的正控通过；独立复核accept仅限本包声明边界，不替完整等价背书。
- 回归：旧真实轨迹反控21/35/56仍全部拒绝（`*-infra-counters-formal-20261008.json`）；E2E工具331/331；
  全工作区typecheck零诊断；lint3271文件0error/0warning/0info。日志`/tmp/type-pal-formal-{tools,types,lint}-20261008.log`。
  文档48项工具测试、915Markdown/5214链接/testing-docs均零问题；`git diff --check`通过。
  最终日志`/tmp/type-pal-formal-{docs,lint}-final-20261008.log`。文档current sourceRefs仅同步本轮比较器hash，
  历史录制/revision不变。

后续明确缺口：Game语义适配、完整状态/渲染因果映射、已批准匀速末步的等价关系、初始权威及外层cleanup
证据。不得将这些unknown默认为passed。下一步应建立闭合的状态/效果分类与对应适配，不按NPC继续加分支。
本包无下一位Agent提示词，独立只读复核已完成，等待用户对原型方向验收；不是要求用户搬运审查。

#### 原型设计与准入

用户明确纠正：完整指令链只是一个证据合同，不能冒充形式化差异验证。授权“试着做”，同时要求保留并修好下述
001三针漏检。当前包限定可执行原型，不新开浏览器、不改产品/内容/采集、不宣称001–006已被形式化证明。
pnpm/Vitest技能用于工作区与测试约束；E2E工具沿用现有node:test，真实TS caller通过Vite SSR调用，无浏览器。

**模型与可判定边界**：

- 统一核：`M=(S,Σ,δ,s0,F)`，按事件次序计算`si+1=δ(si,ei)`；前置条件不成立即返回首个反例前缀，
  包含转换前状态、事件、违反的规则。未知字母/未证初始条件输出unknown，不当作silent step。
- 有限作者执行实例：状态为程序位置、已消费occurrence与order；序列来自canonical作者的entry/body/repeat，
  不是从观察轨迹反推。上下文与完整command必须相符，结束必须到接受状态。参与run由剧情入口独立声明；
  无整个run也失败。该实例只证明作者执行证据，不证明作者等于原始意图或画面正确。
- 控制权实例：每个实体为`unknown/free/script`；take覆盖为script（非计数），release为free，release-all清已知集合。
  `auto-step(e)`前置条件是e不为script；unknown不能证明许可。同一规则量化所有实体，不写NPC编号分支。
  原始日志只适配显式控制操作；所有未建模前台操作、外层cleanup与初始缺证时invalidate，不能凭core.run-ended
  推断已释放。因保守失效，不能声称一个含其它前台操作的完整take→release区间已被全部证明。
- 观察等价实例：输入为同一语义锚点后的完整`(time, observedState)`序列与区间时长。只折叠相邻完全相同的状态，
  保留后续变更时刻和区间结束。等价要求归约词与时长精确相同。换帧/位置、插错姿态或改持帧时长不能被折叠；
  schema增减字段是unknown。该实例暂只接模型层反例，**尚未建立两引擎的完整语义锚点映射**，不声称真实双轨已通过它。
- 组合原则：每项必需义务proved才能宣告目标被证明；任何rejected给反例，任何unknown保留缺口。现有旧比较器的
  passed仅是旧合同结果，不能覆盖原型unknown；半格匀速的已批准等价关系本包尚未形式化，不用容差替代。

前提一手证据：`script-runner-core.ts:270–365`的entry、逐指令gate、同run收尾；
`motion-runtime-coordinator.ts:59–71`的覆盖式take、释放幂等；`main.ts:1579–1595,2657–2663,4967`的release-all、
暂停自动等待与外层cleanup。第一阶段没有显式接管，不强行伪造同名指令；原版/一阶段意图沿用既有对照合同，
本原型不更改它们。pose_contract_review直接核raw：001–003共8个显式take→release区间；001/002无authority字段，
003 cause.poses又可早于投影提交，因此不能把cause快照当原子权威收据。最强反证是重复take被误拒、unknown初态被
误绿、漏指令仍被接受或改变帧时长被当作无害重复；必须分别通过真实caller及变异轨迹验证。

下述是被用户纠正前的漏检定位与有限作者实例准入记录，不代表整套形式化方法已完成。

用户授权先建立可执行验证方法，不再按碎片叠加漏检补丁。追加独立复核推翻了下述“基础设施收口”结论：
在最新001真实记录的内存副本中，分别删除李大娘接管指令initial/57、initial/36转向、initial/37定帧，
完整比较仍然0finding。它们是同一个“只核选定动作与末条、未核完整作者链”的工具缺口，不是三个已证游戏bug。
旧报告保留历史；本批不进入004，不重录、不改产品演出。

四向前提：原版意图仍由现有source/timing/presentation合同核对，不把Reforge作者当原版替身；一阶段是已有真实
录制与原脚本对照；当前二阶段由script-compiler-core.ts:144–170编译repeat、script-runner-core.ts:475–604
逐次执行，001作者含entry.prepare与repeat；目标把002/003已有全路径检查统一为001–003共用有限run合同，
核独立声明的必需run、全顺序/参数/owner/occurrence，缺证据不能绿。对话按actors.json解析身份后核完整cue，
不能只核kind。跨场景与无限循环保留各自合同，不冒充有限路径覆盖。
最强反证：合法repeat/entry/对话解析被误拒，或整条run被删除仍绿；用真实runner及现有raw正例/定向反例证伪。
pose_contract_review已独立复现001三针漏检；其已核21针合理差异邻域均拒绝，避免无证扩大重做。
验收是明确义务清单全部满足、完整证据且无未解释差异，不是“当前没发现红项”。Codex唯一写入Owner。

### 2026-10-08 前批结果（历史；完整执行链结论被上述反例推翻）

本批完成，不新增浏览器实跑、不修改产品/内容/采集语义。001–003使用10-07 14:24/14:25/14:28的六份真实
录制，在同一冻结比较器下均为passed、0未决finding；保留1/10/5项有证据的既有合理差异。
总收据为`build/e2e/offline-infrastructure-acceptance-20261008.json`，三份判定为
`build/e2e/001-offline-frozen-20261008.json`、`002-offline-frozen-20261008.json`、
`003-offline-frozen-20261008.json`。这不是新录制，更不是004–006或连续演示通过；整卡保持build。

- **来源与复用证明**：三份`verifier.sha256`均为
  `3a68ea698587ec0c6930343d5c8a8a7bd13461b7b86eccce4197f79e3481cbce`，表示同一非测试E2E工具清单；
  各段runtime/content/oracle来源另列`currentRecordedSources`，不混作比较器版本。全部登记的非E2E源码/资源
  哈希与录制一致。game/reforge-opening、inn/kitchen-contract四文件只增加终结helper的来源清单行；
  内存撤去该行后逐字节SHA与录制值一致，证明没有改输入或采集逻辑。其余变更是离线判定/读取检查。
  10个独立原始report/trace文件的字节hash保持不变；002/003的两轨前驱路径与真实checkpoint哈希逐一吻合。
- **已修的同型工具缺口**：统一有限run的唯一terminal/end、作者后继、合法decision、完整归属与ready帧；
  共用wait-start/end的now绑定真实clock；001读取保留errors/overflow，完整比较入口拒绝丢标志、错误或溢出。
  002李大娘旧前台脚本的stop仅允许实际自动脚本替换trigger的已核链，不通用放行stop。
- **反例与独立复核**：真实记录的IO/采集域定向反例001=21/21、002=35/35、003=56/56均拒绝；
  不是112个新产品测试。`escort_truth_review`独立读取源码/实际raw并复算三段正例、30针共用证据及
  12个有限run的24针缺terminal/end，结论accept，无未决counter。真实main/runner回归与工具全量326/326通过。
  离线CLI另外6针证明交换引擎拒绝、已有输出拒绝且原文件不变。
- **精确边界**：003首个scoped自动调用没有独立前驱idle，故只证中段真实前后调用连续，不虚构初始idle。
  第一版反例误选首条的失败日志保留，已改为有前后邻居的中段；等待clock反例明确选当前正文的foreground等待，
  不能把未列入本段的背景NPC循环说成正文检查漏洞。相关auto等待仍走002参与者/003醉道士专用合同。
  跨场景启动、取消与无限循环不套同场景有限终结规则。未加入容差或实体级豁免。
- **质量**：E2E工具326/326、脚本治理22/22、全工作区typecheck零诊断；lint3266文件0error/0warning/0info；
  文档48/48工具及915Markdown/5213链接/testing-docs零问题，`git diff --check`通过。
  日志`/tmp/type-pal-infra-{tools,types,governance}-20261008.log`及
  `/tmp/type-pal-infra-{lint,docs}-final-20261008.log`。当前sourceRefs同步不改历史runtimeExecution/revision。

后续执行仍遵守共同合同：工具修正先离线重算；只有实际影响运行或缺字段才补采受影响片段。
前批独立复核已完成，但后续反例要求本页上方rework；不再以此历史收据授权004。

#### 2026-10-07 本批取证与补强过程（历史记录）

最新授权：用户要求001–003全部通过再停。冻结003收口后的运行时/内容/比较器，从新的001正式存档接新002、
再接新003；每段必须独立正文/存读档及完整帧/状态/因果比较均通过。001–002旧raw缺头像IO观察，且运行时
已变，旧通过只保留历史，不作为当前准入；003的14:12通过也要用本轮新前驱再验。若共用代码必须修复，
重验受影响前段，不以旧hash混接。Codex唯一实现Owner；当前只实跑取证，不预设产品修法或放宽标准。
本次不启动004–006、连续演示、状态方案或剧情阶段组合。整卡保持build。

用户随后明确纠正成本顺序：停止新的浏览器整链实跑，先把比较基础设施核清。现有14:24/14:25/14:28三段raw
作为离线正例与反例底稿，先横向核001–003共用检查调用方、同型终结漏洞、采集完整性及真实caller回归；
独立复核无未决counter、质量门通过并冻结工具之后，先离线重算本批判定；只有运行行为改变或确实缺字段
才补采受影响片段。不再以“先跑绿、后补检查”的方式重启001，也不因比较器变化自动废弃原始录制。

2026-10-08用户授权固定范围收尾：当前批次只做离线基础设施验收，不启动浏览器，不扩大功能范围。
先统一核证据完整性/作者绑定/时钟因果/有限终结/逐帧覆盖，集中独立复核。验收通过后001–003复用已有
六份录制另存新判定；后续004–006及连续演示仍按三步门推进，状态方案与剧情阶段组合不进入本批。
规则已固化于[共同合同](../../../../testing/e2e/contract.md#录制与判定分离最小重跑用户2026-10-08)。

本轮终结合同补齐准入（仅E2E工具，Codex build allowed）：新14:24/14:25/14:28三段正常实跑均报passed，
但独立review删除001卧房进场/李大娘离场以及002随从的terminal/end后仍误绿。旧001/002持帧检查把“无下一条
command”当结束，未消费003已补采的真实终结，须一次补齐同型漏洞后重新冻结全三段；不改游戏演出。
四向真值：原始剧情确实收尾恢复控制，第一阶段正常控制/存档已实跑；RF `script-runner-core.ts:299–309`
经真实safe point再结束；001作者s001 onEnter/default末setPartyFacing、e10 leave-bedroom末setState，均complete；
002四auto均finishStep complete。例外是002李大娘前台：auto/legacy-006第18条切她自己的trigger为
greet-after-guests，`script-world.ts:248–256,403–409`使旧lease返回stop且不覆盖新绑定，正式save也核新selection/
无旧cursor；不得机械要求continue。目标统一核唯一terminal/end、canonical后继与有依据的decision、完整上下文、
同ready帧且首draw前完成。最强反证是合法stop被误拒或缺结束仍绿；以真实raw逐run删记录、错decision及破坏
替换链反控。独立escort_truth_review已直接核上述source/raw并给counter，非产品新问题。跨场景启动入口与无限
auto按各自合同处理，不纳入同场景有限演出的瞬时尾命令规则，不声称观察过未采的内部epoch。

- **最新验收口径（用户明确纠正）**：原版脚本的演出意图与合理呈现优先；第一阶段是对照证据，不保证无bug，不能机械复制其每次draw或调度瑕疵。仍完整保留实际帧、位置与时序证据；判定依据是精确目标、动作/对白先后与并发因果、作者等待、步态连续性以及首个应呈现画面的正确性。不同浏览器绘制次数不要求相等；已证明合理的匀速末步与其镜头出屏后果可以明确登记。缺动作、错姿态闪现、无故停顿不能靠此口径豁免，位置不增容差。发现差异先核原始内容与机制意图，再决定修运行时、内容或比较器；不再把第一阶段差异本身当作bug证明。
- **本轮范围收紧**：只收001及本次代码直接引入的回归。独立审查发现物品脚本外层扣除晚于draw，但对照Git旧实现已确认是既有行为，既不属于001也不是本包回归，本轮不修改菜单/物品事务。001最新真实两轨独立通过，帧/状态及因果时序比较也已通过；未决finding为0，保留1项用户批准的末半格匀速差异。后文旧批次的未决记录保留为历史，不作为当前状态。
- **推进顺序（用户最新要求）**：先处理完001全部差异并复验，再推进002；001未收口前不重跑002–006。独立流程PASS不等于帧比较通过。

#### 002 当前核验（2026-10-07，001收口后接续）

真实前驱为001的10:03冻结报告。002初跑两轨正文/赏银/全部进房/正式存读档均passed，
`both-002-2026-10-07T10-19-38-737Z`比较未通过，不能据独立通过宣布收口。
Game/RF为`game-002-2026-10-07T10-19-39-303Z`、`reforge-002-2026-10-07T10-19-39-333Z`。
红项先分为大娘分步对齐、苗人实际绘制、停顿归因三组，不把十条finding说成十个产品缺陷。

先核测试工具前提：`inn-observer.mjs`没有causes/causalFrame，`inn-trace-plugin.mjs`已复用真实生产插桩，
但可选钩子无人接收；`npc-transition-contract.mjs:405`因缺来源而保留hold-attribution，正确地没有自动放行。
原始脚本L_285/三苗人离场链规定动作与等待；Game/RF实际输入/世界draw分别来自两个真实runner；
本步目标只补002只读因果证据，复用001已反控的生产观察点，不改原版、作者或产品执行。
替代解释是作者等待或移动节奏确实有错；如果新证据显示错deadline/漏拍，必须修相应根因，不能用采集补齐当通过。
Codex核准该限定工具包build allowed。贡献者仅只读核原始意图和帧差异，Codex是唯一写入Owner。

002内容修复前提已核：原L_285由proximity入口先转向主角，当前正文却在dlg25后补固定右转；
`scene-system.ts:232–249`与本轮两轨首句draw证实先后错位。原L290/293/295/298/303/343各有
无对白重绘拍，Game因果raw逐条实收60ms，当前作者clearDialog不承担等待，尤其中间左右门画面丢失。
L308/312/346/348为10/15/8/1个100ms探索拍，当前作者误作400/600/320/40ms；
L291/296的0x85各320ms正确保留。目标是显式faceEntityToParty+站帧放首句前、六个100ms呈现拍、
上述四个正确运动等待，不改clearDialog全局含义。开门随从L412零距move隐式右转在RF不成立，
作者显式右转/站帧，保留目标move及零距move全局合同。四向证据分别为原all.json指令、上述Game源码/实际draw、
s003作者正文/实际draw、本段明确目标；最强替代解释“相机或输入错位”被同位置首句/门中间draw反证。
独立只读席escort_truth_review/pose_contract_review直接核过原数据与raw，Codex复核并准入上述内容修复。
大娘楼梯直线目标是SCRIPT-AUTHOR-2已批准的结构改进，不回滚成24次nudge，也不以步数相等放行。

自动随从的同类前提也已独立核清：L411/420是2/4个100ms自动拍，L423/425是2/4拍；
旧作者180/260/280/360来自40ms误换算再叠旧编译器机械100ms边界（70cbe05f27前后可证），
不是原等待。Game实跑随从到门tick1089、同拍转身定帧1092、首移1097；开门者转身1081、
同步call两门全开1082，源码event-system.ts:1388–1412明确同拍消化callee。当前作者把转身/定帧、
两门六条属性拆成逐条100ms，造成无源停顿。Codex核原all.json及源码，独立席核raw后准入：
初等200/400；到门转身前300、转身后400；同源复合动作组内不插等待，动作组之间保留节拍。
真实运行的timer到期/续行/首移仍须复验，不以这些候选数或单测宣称节奏验收；
Game全局slow奇偶门与RF每动作slow门的差异另核，不通过初等偷偷补100对齐。

002本批已落地的根因/修法（后续碎片复用经验，不自动批量改其它剧情）：

| 人物/剧情现象 | 已核根因 | 修法与反控 |
|---|---|---|
| 李大娘首句训话朝向晚一拍 | Game靠近触发入口先面向主角；作者把固定转向放在第一句之后 | 首句前用现有faceEntityToParty+站帧；真实首句draw核方向，不能依赖NPC恰好原本朝右 |
| 李大娘开门时少了右门先开、左门未开的中间画面 | 无对白0x05重绘拍被迁移成无等待的clearDialog | 六个有源呈现拍显式100ms；两轨前七固定等待的两门/大娘实际姿态逐项相等 |
| 三苗人起步、赏银前后的等待过短 | 0x09探索帧被按40ms换算 | 10/15/8/1拍改1000/1500/800/100；两个0x85延时320不变；每条核实际指令、注册、deadline与首可续行draw |
| 开门随从入场没有先朝走廊转身 | Game零距离walkTo仍设右向；RF零距离move约定不改姿态 | 作者显式右转/站帧，不改通用no-op；门前同源转向/定帧不拆成两拍 |
| 随从开门被拆成一串小停顿 | 旧编译器把原同步call中两个门的六条属性机械分隔100ms | 同源复合动作同次续行完成；实际clock/frame核六条命令中间无draw；初等/跟随等候按有源100ms拍重算 |
| 开门随从最后两步被报缺帧 | Game提前裁剪画外sprite，RF仍发出画布外draw调用 | 仅当两轨同位置、同朝向、实际首draw、同visit、合法sprite矩形/相机/viewport证明完全出屏才登记；不把null当帧号、不删除raw |

冻结作者内容后重新生成真实001：`both-001-2026-10-07T10-42-25-482Z`再次passed；
两轨前驱为`game-001-2026-10-07T10-42-25-748Z`与`reforge-001-2026-10-07T10-42-25-752Z`。
由它们进入的新002为`game-002-2026-10-07T10-44-04-313Z`、
`reforge-002-2026-10-07T10-44-04-328Z`，两轨独立正文/赏银/全部进房/正式存读档均passed。
`both-002-2026-10-07T10-44-03-769Z`整段比较仍failed（8 finding），未启动003。

新`inn-timing-intent.mjs`在以上实际raw核过：12个前台等待、26个相关自动等待、11个RF对白命令、
10次Game完整对白消费；14段RF自动目标移动共261次实际位移，每次应执行拍/slow休息/接管暂停、
真实首draw及步间/末点站定draw逐项核验。它是独立的局部收据，**不因局部passed删除原有8条finding**。
声明owner、canonical命令地址与路径可核；实际内部slot的commandEpoch未采集，不宣称内部slot归属已证明。
10:26补采首轮因consumer漏把causes纳入单一order而在正文后失败，已修并加删回执反控；失败报告不重写。

独立反控已用于加强工具：出屏矩形零/负尺寸、空/零画布、退化/溢出投影均须失败；
缺首draw但保留随后同坐标draw不能代替首显。时间合同不能只核留下来的wait：必须逐作者命令匹配唯一注册、
完整路径与原始opcode/operands；timer的now必须绑定实际clock；终点之后到下一合法姿态变化同样核帧；
单轨已分配renderId缺口必须失败。不得以两浏览器draw次数不同作为这些缺证据的借口。

剩余差异已核的事实与边界：

- 李大娘下楼：SCRIPT-AUTHOR-2批准六段目标/有界匀速，不能为了Game相同分步数回滚24次楼梯nudge。
  逐段意图与完整帧的自动归类尚未收口，现有movement-leg-alignment保留。
- 李大娘在苗人谈话期间继续离开：不是新漏写接管。历史`E2E-002-CHOREO-1`明确只接管三苗人、
  让非发言的大娘继续去厨房；原L307在“准备酒菜”后启动离场，但Game全局对白冻结使她仍停在楼梯。
  实际Game首句order1063至奖励1494大娘0位移，RF对应3768至11126有70次位移；末句Game停
  `[125.46875,50.15625]`、RF已到`[137,66]`。这是既有作者取舍，不称用户专门批准，也不称Game bug；
  按最新合理呈现标准建议保留离场并明确登记，本批没有擅加self接管或全局冻结。
- 苗人头领被接管时站定：Game保留抬脚帧，RF临时站帧，释放回原gait且下次真实步帧连续。
  两轨所有对应位移首帧相同；RF每个步间draw已按take/release核验。仍需把该有界差异写入严格分类器，
  不能整个人物或对白区间排除。

以上所有修复只改canonical作者或E2E证据工具；未改Game/Reforge通用运行时、schema或状态方案。

冻结工具后第二次002独立实跑：`game-002-2026-10-07T11-09-05-329Z`与
`reforge-002-2026-10-07T11-09-05-340Z`再次passed；各77份源hash全部与当前文件一致。
`both-002-2026-10-07T11-09-04-768Z`内innTiming passed，完整比较仍如实failed/8 finding。
独立只读复核frame_contract_review：最初真实反例中的缺等待、伪造时钟/源opcode、错声明owner/path、
终点后错帧、整帧删除等均已修并复跑；18/18反控被拒绝，原始基线仍passed、定向2/2。
源码与作者定向39/39、全E2E工具315/315；全仓typecheck零诊断，lint3255文件零error/warning/info；
当前作者工程294场景/223地图/1934资源检查通过。日志均为`/tmp/type-pal-002-*20261007.log`。
主代理查看了10:44两轨末句截图，确认正文完整并用于上述大娘离场归因；不以截图宣称步态已验。
本批未运行003–006、未连续演示、未提交推送。下一步只收002的严格差异分类，不新增剧情状态层或并行能力。
部分交付冻结收据为`build/e2e/002-repair-20261007.json`，明确partial而非acceptance。

002分类收口准入：Codex build allowed，仅E2E比较/反控/源hash，不改产品行为。
四向前提：原L373–384六段离场与24个楼梯增量；Game `core/event-system.ts`的轴向末步吸附及
`core/mode.ts`对白期间不跑auto；当前RF沿SCRIPT-AUTHOR-2已验六目标匀速，
E2E-002-CHOREO-1明确只接管三苗人；目标按脚本意图核精确路径、全部draw、实际等待与可续行帧，
显式登记匀速/局部接管，不能按整个实体免检。最强替代解释是无因停顿或错姿态被分类掩盖；
反证要求等待内部/对白内部/显式转身之后错帧、隐藏后复现、即刻命令晚一帧、路径中间偏移均拒绝。
Game的`autoEligible`只代表event分支，不作探索态完整资格证明；不拿false豁免探索尾部。
编辑器真实项目引用测试先以旧22722基准失败，实测22724（显式转向/定帧新增两条实体地址引用）；
仅刷新该census，独立删除阻断数/图边数等其它断言原样，重跑1/1通过。
新sourceRefs仅更新当前源码hash/定位，不改历史runtimeExecution或旧报告字节。

#### 002逐帧分类与反控闭合

002比较器收口补充（接续11:09 partial，不改写旧报告）：

- 新`inn-presentation-intent.mjs`逐实际draw核全部八个相关实体，包括两扇房门；不仅移动途中，
  显式转向后的等待、对白停步、隐藏后的尾部和开门后也延续严格姿态约束。
- Game大娘独立按源IP374/375/376/377/378/379/381/382生成97次像素移动、局部步帧与朝向；
  auto373激活后非移动提交不得无源重置帧。RF按已批准六目标匀速验全部97个实际位移，不因步数相同放行。
- 两轨sprite矩形须锚定实际位置；Game源cull锚比画面顶边低4px，按源码核合法边缘剔除，
  不能随意移动bbox后声称“屏外”。Game383与RF3912次draw分别全覆盖，不要求浏览器次数相等。
- 等待、对白、目标移动各用真实收据；瞬时命令不得多占一个draw；完整canonical指令序列及finishStep正文
  均绑定。每次draw写明等待/对白/运动/正式结束后的静止来源，封口必须保留story终点原观察记录。
- 独立复核先给出真实counter，修后`escort_truth_review`与`frame_contract_review`分别accept：
  无源长时间站帧重置、假bbox剔除、错误楼梯步/源IP/步帧、等待/对白/门姿态错帧、隐藏后复现、
  ready续行延后、complete改stay、两轨尾draw截断均拒绝；standing映射不能吞掉接管内错误步帧。
  本包不宣称已采集真实内部slot commandEpoch。
- 首次新实跑`both-002-2026-10-07T11-39-11-656Z`两轨独立passed、比较failed，原件保留。
  原因已从真实RF order12171位移→12172明确take→12184首draw确认：同一帧已完成接管，
  合法首显应是站6，不必先闪抬脚7。原比较器只对后续draw识别take，首draw误报。
  首draw现在按绘制时的实际authority验证；仅已核stand overlay匹配原挂起gait时登记差异。
  新增同帧先移动后接管反控；站姿区画回步帧仍失败，不调整产品时序或姿态。

002最终冻结：`both-002-2026-10-07T11-43-33-708Z/comparison.json`真实passed，0未决；
Game `game-002-2026-10-07T11-43-34-228Z`、RF `reforge-002-2026-10-07T11-43-34-248Z`
各自20行/500文/三人全进房/正式存档新上下文恢复通过。每轨78个源hash与当前文件逐个相等。
每个相关实体Game393与RF4335个实际draw全覆盖；12前台wait、26auto wait、14自动路线261次RF位移全验。
11条分类记录为8实体的因果持帧、已验大娘匀速离场、头领接管站定、随从出屏，不是11项未修bug。
冻结收据`build/e2e/002-acceptance-20261007.json`单独保存，不改此前partial/failed原件。

质量：E2E工具321/321；全仓7包typecheck零诊断；lint3257文件零error/warning/info；
docs915Markdown/5208链接/288任务与testing-docs零问题。日志`/tmp/type-pal-002-closure-*20261007.log`，
typecheck为`/tmp/type-pal-002-classifier-types-20261007.log`。本批只改证据工具，未重跑全runtime/editor套件，
此前作者39/39等记录不冒充本次新实跑。当前比较器重新读已冻结001仍0未决/1批准差异。
主代理看过最新两轨结束截图：三苗人已离场、菜单关闭，主角停点正确；连续动画由实际draw合同验证，
不以截图证明动画。Game浏览器warning0，RF保留1条缺省save-state.json 404提示，errors均空；
`browser-journey.mjs:182–198`只识别该精确URL，资产404仍失败，不宣称浏览器零warning。
独立复核同帧接管增量accept：站6改7、删take、take延到world/actor draw之后或提前到位移之前均红。
002技术验收收口；整卡仍build，003–006和连续演示未在本轮执行。无下一位Agent转交提示词。

#### 003接续准入（2026-10-07）

从11:43已验002两轨正式存档进入003，范围止于李大娘催端酒菜，不拾取物品。
Codex核准只读证据包build allowed：kitchen-trace-plugin已继承真实因果插桩，但kitchen-observer
未接收causes、world draw未绑定执行clock；沿用001/002已反控的collector，补全单一order消费者、
源hash及定向反控。不改Game/RF运行时或作者脚本，不以补采本身宣称003通过。
四向前提：原L355–370/L604–626/L560–565为本段正文，Game实际dispatch/clock与RF实际command/wait
已有观察点，当前kitchen只收位置/帧，目标补足等待与续行来源。最强替代解释是作者等待/姿态确有迁移错误；
若实际新raw显示错误deadline或漏拍，须查源并修对应层，不能调整比较器吞掉。
Codex唯一写入Owner；escort_truth_review独立只读核原指令、作者和Game语义。

003内容/终点修复准入：12:01两轨独立passed、比较7红，原报告不改写。新增时间比较器先在该raw
检出15/16等待缺项。原L356无对白0x05、L364/366/368六/四/二个100ms拍；Game实际wait-start
与源相符，作者缺入口呈现拍且仍为240/160/80。scene-system.ts:232–249入口还负责面向主角/站帧，
RF须在正文显式表达。目标100+600/400/200和入口face/frame，不改clearDialog全局语义。
Game厨房raw order1606交还控制、1608最后draw时大娘仍down；原auto L35630明确up/frame0，
下一explore拍尚未执行。现作者显式回灶台正确；修测试终点为实际画出该源意图姿态，不删正确动作、
不延时凑数。独立席直接核原all.json、Game dispatch/auto和两轨raw，Codex复核build allowed。
替代解释“Game要保持面对主角”被L35630反证；若下一实际探索拍没有画出up/frame6则继续红。
独立原始/raw复核又钉清同一作者链两处残留：大娘greet正文的release/take醉道士没有源操作或
历史取舍依据，移除跨人物多余控制，保留道士自己对白整段接管。回厨房三个连续0x10中前两次转弯
Game各下一tick即起步，RF在move后加wait100造成隔一拍再起步（70→72、85→87）；只删除前两条
无源wait，末点到显示厨房大娘、再隐藏大厅大娘的两条独立100ms交接拍保留。Codex准入此限定修复，
不改世界节拍/auto调度、不以两引擎全局对白冻结相同为目标。

#### 003醉道士接管语义裁决（2026-10-07，build allowed）

用户在听取具体剧情、动作与依据后明确批准：takeEntity暂停目标自身的自动脚本及等待剩余时间，
release后续跑；不冻结其它实体，不建立对白与全局自动脚本的隐式耦合。
四向真值：原数据`events/all.json:L_734–739`为两个姿势的循环；SDL参考`script.c:3593`按自动更新
累计等待，`text.c:1356`读对白不调用世界更新（PAL.EXE未实跑，不冒称二进制实证）；Game
`event-system.ts:1208,1342`及`mode.ts`同样只在允许的世界拍推进；当前RF`main.ts:1970`
把自动等待登记为全局gameplay deadline，take只挡姿态写入，导致时间在对话期间耗尽。
实际003 RF `12-01-50-530Z` order2135开始1300ms、2229在300ms后take、2532对白内到期、
2944释放与2946换帧在同一gameplay时刻。目标是暂停剩余1000ms而非重启1300ms或立即换帧。
最强替代解释“姿态已经挡住即可”由用户本次明确否定；旧auto-pose测试允许taken owner的wait/reward
推进属于被本次取代的合同，跨owner操作被接管目标的权限门仍保留。
白名单：main自动执行门/自动等待、runtime-frame-session可暂停等待、对应真实caller测试、
E2E等待证据插桩与合同/文档。Codex唯一写入Owner，pose_contract_review只读复核生命周期边界。
验证先红后绿：接管前经过300ms、跨过原deadline仍不推进、邻居继续、释放后恰剩1000ms；
重复take/release、替换/离场取消、既有移动/姿态/存档续行回归。暂停不轮询坐标或重启auto游标。
本段还未验收：003修前独立通过但完整比较7红；新共享对白准备期检查在最新001缓存肖像场景
出现同帧draw反例，需查清后修正检查器，不能抹去失败记录或用旧通过宣称当前整链已通过。

本次用户批准后的实现与回归（2026-10-07）：

- 自动等待改用原gameplay clock上的可暂停计时，take同步保存剩余值、release重设剩余deadline；
  不用轮询或第二套时钟。主执行门覆盖分支/循环、已在途跨实体移动/动作和IO完成后的提交；
  被接管目标的跨owner权威门仍保留。已选定终结的cursor提交另标内部committed收尾，不重选分支。
- 真实boot反例先红后绿：1300ms等待经过300ms被接管，保持2000ms后释放仍须等1000ms；
  旧实现释放即奖励，日志`/tmp/type-pal-take-wait-red2-20261007.log`。异步gate后的branch曾发生
  take→branch→release（`/tmp/type-pal-take-branch-order-20261007.log`），现提交前同步复核owner。
  邻居继续、跨目标动作/移动冻结、加载在take期间完成但不提交、离场/替换/取消与余时续存都有真实caller回归。
- 全量首轮30失败保留`/tmp/type-pal-take-reforge-all-20261007.log`：12项为AST夹具缺新增真实gate依赖，
  1项为finishStep原子锁退化，2项为001李大娘交接步态重置，15项为前轮已批准作者修正的旧oracle/地址。
  未放宽原子锁和001原帧断言。001先前靠auto预先注册槽保留步态，新暂停语义不能再执行该预注册；
  改为只在本帧真实末步生成一次性步态交接收据，正常仍站定，release后同activation/场景/停点的实际auto
  非零move可承接；到绘制或下一运动拍即失效，不写SAVE、不预测下一指令。定向5文件157项通过。
- 三条当前oracle单独核对后更新，非把全红列表录成新快照：大娘回厨房三段move之间无额外wait，
  两个场景实体交接拍各100ms（叶命令投影时间400/500）；开门随从初等200、同源两门六属性同批，
  交接投影1000/1100；跟随者初等400、转身前300/后400，交接1600/1700。
  依据为本卡002真值段、L411–427、L604–626、pal-inn-choreography与pal-inn-kitchen的逐命令断言。
  `pal-unified-steps-auto-oracle.json`仅更新上述3条四种seed/env结果；终末setState地址随正文变为6/21/12。
  原红日志/旧E2E不改写，不把该投影测试误称真实行走时长。
- 本轮首次真实003：`both-003-2026-10-07T13-02-13-588Z`，Game `13-02-14-221Z`、RF `13-02-14-193Z`
  两轨独立正文/保存/新上下文读回passed，完整比较仍8条finding。RF自动wait113在order2068开始，
  2464接管剩50.1ms，3208释放后deadline13230.7，3236首个可用帧到期，3238执行下一指令；
  期间约2516.6ms没有消耗余时。新比较器逐实际clock和take/release命令核算，未用时间容差。
  001步帧及终结锁修好后的冻结复跑另记结果；上述实跑不能代表修后完整003已经通过。
- 只读复核指出批量release先通知再清authority会误删同拍收据，现复用单实体release的先撤销再通知；
  反控真正调用releaseAll而非只换case名称。另显式animEntity须打断交接收据，在
  advanceExplicitAnimation统一失效；仅撤掉这一行的生产突变实际报phase11对undefined，恢复后20项通过，
  日志`/tmp/type-pal-take-animation-{red,green}-20261007.log`。不把直接clearReceipt的测试当作anim真实caller。
  Reviewer曾提出“auto A take B导致save循环等待”，复核真实adapter→autoHost后撤回：auto的take是report-only，
  不能用schema允许推断运行时已接管。未因此扩改自动脚本作者权限或存档合同。
- 浏览器异常保留：`both-003-2026-10-07T13-12-22-315Z` 的RF在新建读档context时超时；
  Game完成。随后`13-14-35-571Z`和`13-17-27-575Z`两轨独立passed，自动接管余时验证passed，
  但完整比较仍8项未决（不等于8个已确诊产品bug）。新增helper与原子资源快照模块已纳入源码hash清单；
  不给此前报告补写当时未采的hash。最终explicit-animation修订之后的收据另记。

接管修复最终收据（本包通过，不等于003整段通过）：

- `both-003-2026-10-07T13-22-59-990Z/comparison.json` 保持failed；Game `13-23-00-548Z`、
  RF `13-23-00-532Z` 独立passed，真实002前驱仍为12:09那批。RF源码hash首尾稳定，新gate模块已收录。
  automaticTake为passed：wait从8550.4开始1300ms，9600.4接管余250，12033.5释放后deadline12283.5，
  12283.6首个可用帧到期，下一指令order3226先于下一实际draw。接管区间146次真实world draw逐条匹配
  同visit RLE帧证据，醉道士均为frame0、位置[137,73,0]，不是只比坐标或只查首尾帧。
- 整段剩余8条finding涉及厨房大娘持帧、大厅大娘路线/朝向/帧、道士整段循环相位/持帧以及一次等待
  的续行首draw检查。仍需按原版意图分别核验，未将“暂停余时通过”扩大成整段帧序列已一致。
  本次不触碰004–006、连续演示、状态方案或剧情阶段。
- 最终运行时329文件/8807项通过：`/tmp/type-pal-take-reforge-closure-20261007.log`；
  工具326/326：`/tmp/type-pal-take-tools-freeze-20261007.log`。全仓7包typecheck零诊断：
  `/tmp/type-pal-take-types-closure-20261007.log`；lint零诊断以`/tmp/type-pal-take-lint-closure2-20261007.log`
  为准，前一次格式失败日志保留。docs/testing当前sourceRefs仅同步当前源码/行锚点，不改历史revision或runtimeExecution。
  浏览器保留可选资源404 warning，不冒称浏览器控制台零告警；此与硬性静态门零诊断分别记账。
- pose_contract_review只读复核accept（两个counter均已核销）；Codex独立核生产突变红/绿、全量与实际003
  接管回执。未提交推送。无下一位Agent提示词；本次接管修复收口，主卡仍build，后续继续003未决项。

#### 003 最终收口：不能用“走完”替代“比较通过”（2026-10-07）

本轮唯一产品改动是通用交互转向的零轴择边修正；接管余时实现沿用上一包，不增加作者并行指令、状态方案、
剧情阶段或坐标容差。003规范中的两位李大娘是大厅/厨房两个场景实体；本段只有赶道士、讨酒被拒、厨房交代，
没有拿菜、使用物品或送酒。Coding Owner仍为Codex；两贡献者只读独立核source/raw/反例，未写共享实现。

前提真值与build allowed：

| 问题 | 原版/一手来源 | 第一阶段 | 修前二阶段/工具 | 目标与核准 |
| --- | --- | --- | --- | --- |
| 大厅大娘面向正上方主角时择边不同 | `reference/sdlpal/play.c:129–141` 的交互dx>0/dy>0规则，不同于script.c移动规则 | `scene-system.ts:238–244`；两轨主角[135,64]、大娘[137,66]，Game向left | faceEntityToParty复用walk的facingToward，零横差向up | 独立interactionFacingToward供运行时/编辑器，走路/chase不变；真boot四轴反例先4红后绿，Codex核准 |
| 最后一条wait被当成漏续行 | 原L35707、L368后是正常结束，没有下一动作 | 正常终结/恢复控制 | 比较器强制下一command存在 | 真实runner安全点返回值+结束回执、canonical后继、owner/scene/visit/clock及首draw闭环；不是空next即放过 |
| 首次头像等待没有来源 | main真实portrait加载、scriptWorkIO唤醒 | 非两引擎耗时相等合同 | main插桩分支提前return，漏接IO；自写box.open测试未覆盖真实main | 组合lifecycle与causal插桩，真实main冷/缓存caller验证；不改对白运行时或容忍未知停帧 |
| 循环数/末半格/持帧不能直接一一配对 | 原L386–390三段move及显隐；L734–739是2/13个实际auto拍 | 实际runOneAutoOp观察+每次actor/draw | 不同浏览器输入/IO与明确接管导致周期数不同；RF末半格匀速已获批准 | 核每个合法动作、应执行拍、200/1300ms余时、全量draw；源和实际帧必须连成同一因果链 |

最强替代解释“对白真的多停一帧”已用新raw的IO start→pending draw→wake→end→open反证；无IO、错资源或
wake后仍绘制都会失败。交互转向不归因于位置误差，两边触发位置完全相同。末半格授权不豁免转弯或普通步。

经验/修法（后续碎片必须复用，而不是每次重新猜）：

- 比较分组独立执行，保留完整错误列表。以前一个wait失败会遮住后面的dialogue核查；初步全绿不能替代未执行的检查。
- 可复用指令必须测边界：四个象限之外还测四条投影零轴、同点和高度；编辑器预览执行同一语义。
- 观察器组合必须测试真实caller。仅锚点存在/源码字符串/自写简化dialog不能证明main已接线。
  `opening-causal.test.mjs`现在执行真正转换后的main dialog/awaitRunner/atScriptMutation，配真实runner、queue、timer、DialogBox。
  只删除main的causal组合，测试实际红为“dialogue opening delayed without IO evidence”；恢复后绿。
- 自然收尾不是下一指令：最后wait须核独立作者后继、实际continue决定、同owner/场景/visit/帧和非取消run-ended，
  首draw前完成。另真实timer→世界离场→runner取消→新场景draw测试覆盖“timer恰到期但已离场”，不得伪装正常继续。
- 不能把两套各自自洽的记录当作已互相验证：独立review造出Game大娘cursor-only无源抬腿、道士逻辑/画面一起改错
  两针都曾漏报。现源移动后逐snapshot禁止无源姿态重置；真实auto.after绑定actor localFrame和每次draw，两针均红。
- 自动循环首尾不删：读档/正文边界前的注册放initialCauses只读证据；离场尾轮必须真实abort、owner终结、新场景
  首draw。完整轮逐deadline和首续行核验，不能按clock.autoEligible猜实际auto调用或允许13±1拍。

正式候选`both-003-2026-10-07T13-57-15-510Z/comparison.json`通过：Game `13-57-16-069Z`、RF `13-57-16-061Z`；
0 finding、5条有证据的解释（3人全帧持帧归因、大娘已批准匀速末步、道士逐轮因果对齐）。
不是5个未修产品bug，也不是全局白名单。16个前台固定等待、6组对白命令/14行正文、3条精确运动目标、
原版47步和RF50步均核。该批大厅Game159/RF775次draw、厨房Game79/RF244次draw全覆盖；
Game112次真实道士auto调用连到实际画面，不按浏览器draw数量强求相等。正式存档及全新context读回均passed，
sourceHashesStable=true。Codex已查看两轨大娘首句、厨房终点截图：正确朝向、未拿菜、无菜单残留；
连续步帧以完整draw/cause验证，不用静态截图冒充动画证明。

`kitchen-counterexamples.mjs`可对真实passed报告复跑17针：错帧、缺draw/移动/计时、错误余时、缺初始注册、
错误terminal、漏IO/错visit、缺源auto调用、两种连逻辑一起改的错误及漏整段对白均必须拒绝。
候选反控产物为`build/e2e/003-counterexamples-20261007.json`；冻结格式/源码后的最终实跑和质量收据另记下方。
旧failed JSON/旧runtimeExecution保持原样，不能把内存新比较结论写回历史报告。

最后独立复核发现并关闭的比较器反例（不是新增产品演出bug）：13:57/14:02候选虽然报passed，
但厨房大娘结尾的非wait命令只查terminal cursor/order，删除run-ended或改decision=stop仍误绿。
相同旁路也覆盖道士release和大娘auto finishStep。因此候选passed不当作独立accept。
先追加真实记录反控，日志`/tmp/type-pal-003-terminal-counter-red-20261007.log`确实红；再统一五个有限
NPC/楼梯run的终结核验：最后作者命令、唯一terminal/end、完整occurrence/owner/stage/timing/engine/
scene/visit/clock、continue、非aborted，且必须在首个可用draw之前。末wait仍按真实到期帧而非注册帧；
楼梯repeat按真实结构节点与count展开28条路径，不再因嵌套而跳过。厨房入口loadScene是跨场景合同，
不混入这个同场景终结规则；道士无限auto的离场取消另核，不能强制正常完成。

最终冻结正式收据：`build/e2e/both-003-2026-10-07T14-12-13-739Z/comparison.json` passed，0 finding、
0 violation、5条逐事实解释。Game `game-003-2026-10-07T14-12-14-294Z`、RF
`reforge-003-2026-10-07T14-12-14-277Z`；两轨95项源码hash首尾及当前均一致。大厅Game159/RF774次draw、
厨房Game77/RF242次draw全核，RF共1016次world draw逐次归因，Game112次真实道士auto调用。
本批接管剩100ms，释放后仍等完余时；14行正文及正常保存/全新空存储读回passed，结束/恢复像素hash各轨相等。
Codex复看此批两轨结束截图：主角在厨房大娘旁，菜在桌上，无菜单或对白残留；不以截图冒充连续动画证据。

对该冻结raw的46针反控全部被拒绝：`build/e2e/003-counterexamples-frozen-20261007.json`，
日志`/tmp/type-pal-003-counterexamples-frozen-20261007.log`。新增部分覆盖五run分别缺结束/中止、
非wait终结context/clock/重复/迟到及楼梯缺重复叶子；不只增加正常通过用例。
`escort_truth_review`独立对14:02 raw执行46针及额外self/stage/timing三针，accept；
`pose_contract_review`独立核真实main、末wait与IO并实跑causal6/6，20项上下文/IO反控全拒绝，accept。
两席均只读。已知验证边界：deadline后同帧离场取消由真实FrameSession→runner集成测试覆盖，
当前003正式raw触发的是正常离场取消，不冒称完整boot E2E覆盖了恰同deadline那一分支。

质量收据：运行时329文件/8811项、编辑器真实预览18项；E2E工具326/326；全仓7包typecheck零诊断；
lint全仓零error/warning/info，docs与testing-docs零问题。日志为`/tmp/type-pal-003-runtime-20261007.log`、
`/tmp/type-pal-003-facing-green-20261007.log`、`/tmp/type-pal-003-tools-closure-20261007.log`、
`/tmp/type-pal-003-types-20261007.log`、`/tmp/type-pal-003-lint-closure-20261007.log`、
`/tmp/type-pal-003-docs-closure-20261007.log`。文档当前sourceRefs和claims只同步实际源码hash/行锚，
历史revision/runtimeExecution不改；中途失效hash/行锚导致的红日志保留。
Game保留开场AVI play被pause中断warning1，RF保留缺省save-state.json 404 warning1，errors均空；
与静态门零诊断分开记，不把运行告警藏掉。003技术验收完成，主卡仍build；不声称004–006及连续通过。
未提交推送；无下一位Agent转交提示词。本轮按用户要求到003通过为止。

#### 001 本轮收敛清单与验证边界

本轮修复层明确分开：内容编排、运行时缺陷、比较器错误和合理实现差异；不新增作者并行指令、
剧情阶段或状态方案，不调整第一阶段产品基线，不以位置容差或输入过滤求通过。

| 人物/剧情与现象 | 根因与修法 | 验收证据 |
|---|---|---|
| 李大娘叫醒逍遥、密道机关停顿过短或漏停顿 | 原版等待的探索拍换算及无对白clear后的重绘节拍未完整表达；canonical作者脚本显式恢复固定等待，机关各次位移保留对应节拍 | 原始脚本→Game实际等待→RF作者命令逐项关联；35个固定等待分别核声明、deadline、首个可推进帧、实际呈现姿态，不用总时长抵消漏项 |
| 李大娘离房回头前闪过错误姿态，主角起步太晚 | 原有毫秒等待不能表示移动完成；即刻脚本续行晚于世界draw。改用现有moveEntity的精确中途目标和take/release；内部ScriptWorkQueue只等待已就绪脚本收尾，真正移动/等待/IO仍让世界继续 | 真实bootGame在100ms及17ms帧相位核初显、换装、回头首draw；主角第一步同批大娘在[60,-12.5]，两段对白各连续5个实际draw站定 |
| 中途交还大娘自动走位时步帧不连贯 | 前台到中间点清除了仍有效auto的gait且漏计到点步；只在目标和owner生命周期均允许续行时保留准确步态 | 原先累计11步反例先红后绿；目标/跨实体owner暂停、取消、无auto和真正终点反控保留；未改变对白的全局冻结政策 |
| 比较器把各引擎帧号、绘制次数和对白耗时混为作者停顿 | 新增仅E2E的实际等待/指令/对白消费/世界节拍观察；逐固定等待、逐页输入、逐移动应执行拍归因，draw绑定真实执行帧 | 房内21段对白、23次实际确认及全部30个大娘移动提交均覆盖；漏翻页、自动翻页冒充确认、错误页ID、遗漏对白、慢一倍、漏移动拍均被拒绝 |
| 大娘最后半格多一次匀速步，导致镜头提前把她裁出屏幕 | 用户批准保留匀速；比较器依据真实sprite矩形、相机与viewport证明两边出屏，不把no-draw当错姿态，也不删除raw | 仅末段1:2步登记accepted；到首隐藏帧的完整闭区间与本轨draw时钟逐条对齐。漏最后可见帧、漏首隐藏帧、隐藏跨sceneVisit都失败 |

新浏览器收据：`build/e2e/both-001-2026-10-07T09-59-42-212Z/comparison.json`为passed，
Game `game-001-2026-10-07T09-59-42-451Z`与Reforge `reforge-001-2026-10-07T09-59-42-454Z`
均完成正文、正式保存与新上下文读回。比较为0 finding、1 accepted、35固定等待、4动作里程碑；
移动节拍五区间为8/4/4/11/3步，无未分类大娘移动。主代理已查看本批两轨回头对白及结束截图，
位置/姿态/对白正确，结束时无菜单残留；动画连续性另由完整实际draw与移动因果日志验证，不冒称静态截图能证明动画。

比较器反控与独立复核：`pose_contract_review`先指出隐藏边界漏采可通过，补闭区间后独立accept；
`escort_truth_review`先指出漏翻页、错误页归属、移动加慢800ms及错draw frame仍通过，修后用上述原始报告
独立复跑全部反例并accept。最初09:48的passed只保留其当时结果，不作为加强后的最终验收。
新真实Vite SSR测试执行实际ScriptRunnerCore、RuntimeFrameSession和DialogBox，不把合成耗时当运行时证明。

当前代码质量收据：Reforge 329文件/8787测试；E2E工具310/310；全仓7包typecheck零诊断；
lint3252文件0error/0warning/0info；docs915Markdown/5204链接/288任务与testing-docs均零问题。
日志为`/tmp/type-pal-001-runtime-final-20261007.log`、`/tmp/type-pal-001-tools-final2-20261007.log`、
`/tmp/type-pal-001-types-final-20261007.log`、`/tmp/type-pal-001-lint-final-20261007.log`、
`/tmp/type-pal-001-docs-final-20261007.log`。当前sourceRefs刷新不改历史runtimeExecution/revision。
公共帧回执改动后的旧“提交后尚未ack再按键保存”测试改验真实可到达的作者等待边界；提交去重仍有底层反控，
不把已不存在的公共输入时间窗冒称实测。AST restore夹具补真实scriptWorkIO依赖，不用空实现掩盖工具回归。

整卡仍build：本轮未运行002–006或连续演示，未提交推送；后续从002继续，不能宣称001–006完成。
无下一位Agent提示词，Codex继续本卡；贡献者仅完成限定只读复核。

冻结后再次复跑：`both-001-2026-10-07T10-03-36-945Z/comparison.json`仍passed；
Game `game-001-2026-10-07T10-03-37-177Z`、RF `reforge-001-2026-10-07T10-03-37-179Z`
均完成独立正文/正式保存/读回。最终收据`build/e2e/001-acceptance-20261007.json`冻结两报告和比较SHA，
逐项核对23/34份记录的当前源码hash；新增因果插桩、节拍、内部queue及比较器源均已记录，不给旧报告回填hash。
RF原始浏览器保留2条notice：干净工程缺可选save-state的404及Canvas readback性能提示，未冒称浏览器零warning；
静态质量门的error/warning/info仍必须全部为0。

关联内容回归149文件/1491项通过。编辑器全量首轮最终为604文件通过/1文件失败、4850测试通过/1测试失败，
唯一失败为旧PAL引用census断言，原日志保留在`/tmp/type-pal-001-editor-final-20261007.log`；
另有jsdom未实现navigation提示，不冒称测试控制台零输出。使用独立Vite真实loader→
toEditorState→diagnostics复算为addresses/blockers/rows/targets=22722/4367/25213/28118，
只把s001换回HEAD则为22696/4363/25208/28113，证明变化来自本次作者内容引用而非索引算法。
当前s001 onEnter明确包含大娘的take/state/4个move/facing/frame/release共9处目标引用；
比上一版已核census增加2处外部引用。更新四个冻结总数，其余逐项collector/index、删除阻断及worker一致性断言不变，
修正后定向1/1通过，其余604文件已由上述全量实测覆盖；未把分次结果冒称为修后全量单次通过。
最终E2E工具310/310、lint3252文件零诊断、docs915Markdown/5207链接/288任务零问题；
日志为`/tmp/type-pal-001-tools-closure-20261007.log`、`/tmp/type-pal-001-lint-closure-20261007.log`、
`/tmp/type-pal-001-docs-closure-20261007.log`。独立引用复算与定向测试见`/tmp/type-pal-001-reference-recount2-20261007.log`与
`/tmp/type-pal-001-reference-green-20261007.log`，不把首轮失败日志改写为全绿。
- **001离房末半格裁决（用户2026-10-07明确批准）**：李大娘到卧室门口的最后半格保留Reforge匀速，并明确登记差异。证据为`both-001-2026-10-07T06-39-26-646Z`对应原始报告：Game从[60,-12.5]一步补到[60,-12]；Reforge经过[60,-12.125]再到同一终点。这仅批准该末段分步与相应耗时，不批准回头多画朝下帧、其它持帧时序、主角并行起步偏移或初次显示缺帧。后续比较仍须验证精确路径/终点及匀速新增步的实际行走帧，禁止实体豁免、坐标容差或因移动数组不同跳过渲染检查。本轮已实现局部1:2步与实际draw的严格对齐，保留原始order/时钟；其它finding不消失，不将旧报告改为PASS。
- **苗人随从（s001/e26，004 送菜后退回）必须拆开两条证据**：旧 RF `reforge-004-story-2026-10-07T03-38-20-028Z/004-story.trace.json` 的末帧由 5 回到 3，发生于 auto 完成后 gait 清理，同一位置没有新增移动提交；该批两轨均记录 13 次位移，不能说此实跑证明了“重复走一步”。另一个真实运行时缺陷由 `main.auto-save-flows.test.ts` 专门复现：一次性 step/chase 提交后，deferred ack 尚未执行时再来 world tick，会重复规划；修前日志为 `/tmp/type-pal-one-shot-commit-red-20261007.log`。这是独立的运行时回归证据，不冒充原 E2E 现象的根因。
- **e26 公共修复层**：`world-motion-runtime.ts` 给 step/chase 槽增加只读 `committed` 生命周期；`main.ts` motion planner 在一次性槽已提交但尚未 deferred ack 时跳过再次规划。真实 caller 回归在 `main.auto-save-flows.test.ts` 连续两个 world tick 断言位置与 gait 不变；该批 Reforge 定向 89/89、typecheck 通过。此合同和作者首步丢失是两个问题。
- **e26 作者修复纠正**：原先“尾部frame2匹配7步”候选撤回。Game完整auto是8步，但旧004路线在第7步离场；RF在接管未释放时已选auto，首步被丢弃，故错误地在[107.25,24]完成。现在先release再选auto，删除人工尾frame2。真实正文壳层完成8步至[107,24]，实际draw帧为4/3/5/3/4/3/5/3；修前位置断言红、修后实际draw通过。旧`both-004-2026-10-07T05-22-01-897Z`不再报e26只证明不完整窗口碰巧匹配，不作为本修复验收。
- **醉道士（s003/e62，004 门口赠酒）**：当前每个含对白 stage 已由逐句 take/release 改为整段一次接管/释放，合同见 `pal-inn-choreography.test.ts`；这是已实施候选，不能因静态合同通过就称其修复了当前帧差异。剩余红项出现在赠酒 trigger 取得 authority 之前，尚没有证据把它归因于对白句间释放。
- **醉道士节拍与窗口分开处理**：Game真实auto执行器证实循环1500ms；RF将仅首次的200ms等待误放loop内，成为1700ms。已将首次等待移到loop外，编译器/runner跨两轮回归先红后绿。此前“Game visit3停留约0.7s、RF约6.6s”的解释撤销：前者是materialize前的中间记录。可见循环数量还受进门至开菜单的时间及menu暂停域影响，004实际帧仍须新链验证，不以周期修复或整段接管放行。
- **复用经验**：遇到“移动帧不连贯”，先按 `注册 → live commit → deferred ack` 检查一次性槽是否重复规划；遇到“对白间 NPC 自动继续”，先检查 `take/release` 是完整 stage 还是每句 dialog，而不是先改寻路、加坐标容差或屏蔽输入。所有结论必须落 raw trace、修前红回归、修后真实 caller。
- **005 入口归属补正**：最终核对发现此前的 `faceEntityToParty` 曾误落在 s005/e123 的后继方案，而不是 e124/e127 默认交互；当前已移到 e124/e127 默认入口，并将 e127 静态初始朝向恢复为 down。`pal-errand-author.test.ts` 锁住目标与初始朝向。此前 005 报告不覆盖此最后修正，必须重新生成 001→005 前驱链。

## 前提真值矩阵

### 2026-10-07 既有接管/移动能力复核：不新增作者并行功能

当前续修新增已核白名单（build allowed）：001 canonical、opening 作者/真实壳层回归。
原始0x05在无对白分支重绘后延时60ms，第一阶段100ms探索拍实际保留一个完整拍；有对白时消费确认直接继续，
不能全局改变clearDialog。本次只在原始3565/3598/3621/3658/3666/3672/3677/3699/3701/3705/3709/3711/3717/3719/3732
对应的十五处姿态重绘补显式100ms，已存在的四次道具位移间隔不重复叠加。证据为scene-001原始正文、
event-system.ts无对白redrawDelayMs与pendingFullClear分支；只读escort_truth_review独立核相同入口。
最强替代解释“所有clear都应停顿”被原始有对白分支否定；真实编译展开回归同时锁住普通对白clear不新增等待。
修前日志 `/tmp/type-pal-opening-redraw-red-20261007.log` 保留缺失等待的失败，不代表整段已验收。

帧内续行修复准入（Codex唯一写入，build allowed）：只引入内部ready/真实wait回执与帧阶段drain，
不新增作者能力、schema、时钟、等待语义。原版同栈执行后draw；当前RF同步tick先draw再Promise续行，
真实candidate壳层在-20换装、-17转身、-12.875释放均先画旧姿态。目标是同一世界提交后，touch取得首个
阻塞回执，再唤醒移动续行，所有就绪指令收尾后绘制；每帧仍只移动一次、消费一次输入。
只读frame_contract_review已独立核same-signal均为串行子调用，Promise.all仅资源加载；每signal用
references>0且parkCount===0判ready（不能用references-parkCount）。外层finally必须在end回执前完成。
最强替代解释是延一轮timer即足够；执行预算256条后宏任务yield及多层async反证它，故不做定时draw。
真实冷IO不能冻结整个世界，缓存IO也不能制造假休拍；两者须独立反控，未通过前不得启用此帧门。
本轮候选编排白名单准入：e10显现前take；依次move至-20换装、-18.5问话、-17回头答话、
-12.875释放并启动partyMove；后台保留最终-12目标。四个停点由Game逐步实际draw独立推导，
不是运行时坐标容差/轮询或新增到点作者事件。原始auto到点/启用e3出口/隐藏各占一拍，故后二者前各写
明确wait100；匀速增加的末步不通过删源节拍补偿。真实壳层新增100ms和17ms两种帧相位下的首draw、
换装及精确同拍断言，修前收据`/tmp/type-pal-opening-handoff-red-20261007.log`。

用户确认继续按现有指令处理001。撤回“必须新增并行/到点事件作者功能”的前提：前台和auto已经并行，
`moveEntity`已有终点等待、两个运动槽独立，take/release可以保留后台目标。
候选编排的-20、-18.5、-17、-12.875只是前台现有moveEntity终点，不新增状态方案、剧情阶段或编辑器功能。
但可表达不等于已绘制正确，canonical编排暂不改成尚未验证的候选。

- **有限运行时修复 build allowed**：只修前台中途走位完成后，交还仍有效且未到终点的auto时丢失步态。
  白名单为`main.ts`运动提交段、`main.auto-pose-authority.test.ts`和本卡/经验记录；不改调度、wait含义或schema。
- 四向真值：原版/第一阶段离房演出见`data/extracted/events/scene-001.json`的L_39后台移动、
  `game-001-2026-10-07T06-05-49-499Z/report.json`的actor/render538/540（第27步-12.875，down/frame2）
  与541/544（第28步-12.5，down/frame0）。当前RF的`main.ts`在每个move终点清gait且不计终点这一步；
  单纯take/release的已有测试不覆盖前台实际走位。目标是保留真实步数与确切auto运动owner，
  对白接管时仍站定、最终目的地仍清理；实际移动来源仍为script，不伪装成auto提交。
- 新真实bootGame反控：先自动移动，再take并前台移动到累计第11步，停留后release；
  `/tmp/type-pal-waypoint-gait-red-20261007.log`在期望phase11处得到undefined。只证明运行态交接缺陷，
  不把它冒称实际draw已验收。无待续auto、auto被替换/取消、真实最终点和零距离命令须独立反控。
- 非Owner只读复核：pose_contract_review独立读Game路径与运行时清理链，指出前三个候选停点恰为4拍整周期，
  会掩盖清零；frame_contract_review独立确认另一个首draw问题不能靠固定微任务次数或setTimeout(render)解决。
  最强替代解释“清gait是正确站定”以接管仍隐藏auto姿态、释放继续相位、真实终点仍站定三项区分。
- 初版局部反控虽绿，独立审查给出`counter`：正式suspend后前台到点再release，会向呈现暴露不能推进的auto gait。
  原始counter保留，不以110/110覆盖它。主代理直接核`deriveEntityLifecycleGates`并补目标/跨实体owner两例，
  `/tmp/type-pal-waypoint-suspend-red-20261007.log`分别得到gait5/11而非站姿；收窄新交接前提为二者均autoAllowed。
  不改suspend含义、不取消保留的auto slot，也不增加对白全局冻结。修后复核和最终回归另记。
- **仍未修的独立问题**：move完成通知及多层async脚本续行晚于本帧draw；需要内部就绪工作/真正阻塞边界的
  明确回执，覆盖touch优先权和脚本外层finally。没有现成的可复用空闲门；不能把save barrier或整条owner结束
  当作绘制门，也不能用下一次timer碰运气。此处不新增实现，不将步态局部修复等同001通过。
- 修后独立复核：pose_contract_review对main `04b368788f70…`、测试`febcfc46637d…`给出局部accept，
  独立8项通过，明确关闭上述suspend counter，不覆盖first-draw或001整段。
  Codex最终实测相关6文件112/112、全Reforge328文件8780/8780、E2E工具305/305；全仓typecheck零诊断，
  lint3247文件0error/0warning/0info；docs915Markdown/5203链接/288任务及testing-docs零问题。
  日志`/tmp/type-pal-waypoint-gait-final-suite-20261007.log`、`/tmp/type-pal-waypoint-reforge-final-20261007.log`、
  `/tmp/type-pal-waypoint-tools-20261007.log`、`/tmp/type-pal-waypoint-{types,lint,docs}-final-20261007.log`。
  初版8778全绿发生在suspend counter修复前，保留原日志而不作为最终版本证明。本轮未跑浏览器/002–006，
  未改canonical001候选编排，未提交推送；整卡仍build。无下一位Agent提示词，Codex后续仍先处理001帧内续行和持帧归因。

### 2026-10-07 独立复核后的最小作者修复（build allowed）

用户追加批准001李大娘使用已有接管指令，替代早期缺该指令时的手工阻塞编排（build allowed）。
原始L_39是一个走向[60,-12]的后台动作，onEnter在800/400/400/1200ms的窗口内安排主角动作与两次对白；
Game对白隐式暂停该实体。当前RF把它拆为三个blocking move，导致主角换装/起步都等大娘先走到中间或最终终点。
目标：e10新增明确命名的离房auto（一个最终目标与到达后的门/显隐状态），onEnter只负责两次take→对白/转身→release，
并保留原有交叉角色时间窗；不把对话全局冻结移入引擎。真实完整onEnter壳层反控已红：主角首次起步时大娘已经隐藏，
原始Game应仍在-12.5附近向出口走。旧逐段阻塞move的末姿态闪帧与匀速末步对齐另保留，不因本项而宣称所有帧已同。

接管版完整壳层暴露第一次对白停在-18.875而非-18.5，少一次0.375移动。核对`main.ts`可见：
数值状态隐藏的auto activation保留在`waitForScriptGameplay`；`setEntityState`投影显示后调用
`maybeResumeLifecycleHiddenMotion`，但已有activation既不重启也不收到gate通知，直到下一rAF才唤醒；
该帧的同步advanceMoves已先于Promise恢复执行。原始L_39与Game逐拍执行都要求显现后的首个世界拍能走位。
最强替代解释为作者等待短一拍，故不改800/400原始窗口；本轮扩展白名单到该恢复函数，开放已有gate时立即通知，
不重置cursor、不更换移动调度、不引入定时补偿。完整onEnter两次精确停点与实际绘制并行性为反证门，失败则继续查因。

只读独立复核补充入口边界：上述少一步反控来自直接boot s001，已有隐藏activation；真实001由s000载入s001，
onEnter期间全场auto延后启动，显示e10时可首次创建activation。因此通知修复是真实公共缺陷，不能冒充完整001实跑中
所有偏差的原因。notify在有效auto gate开放、restart处理之后执行，仅兑现仍有效waiter，不重建游标；接管权仍由motion planner核验。

新001实跑：`both-001-2026-10-07T06-39-26-646Z`，Game/RF子报告均后缀`06-39-26-889Z`且独立PASS，
两次对白停点精确，移动阶段12/4/13对12/4/14（末步匀速差异）。NPC比较仍4项：e8/e11持帧、e10路线末步与转身首帧。
e10第二停点Game tick620首draw为up/frame6；RF tick208先down/frame0，再同tick晚约84ms为up/frame6。
独立复核否定“仅由Promise晚一次绘制就能解释84ms”的过早归因：该down姿态持续5次完整draw。
原版等待按世界拍计数，当前作者`wait(ms)`按经过毫秒计时；对白结束相位可能不与100ms移动拍重合，
还叠加到期帧同步present先于Promise续行的边界。真实帧时钟/移动类的相位反控另验证，不把400ms暗改为4拍，
也不加减wait补偿或跳过该draw。既有`waitWorldTick`端口仍映射100ms且当前runner不调用，不能当已有事件等待能力。
当前壳层“主角首次起步时大娘仍未隐藏”只证明存在重叠，不证明原版精确同拍；后续须补首draw转身和并行起步精确位置反控。

本轮验证：Reforge全量328文件/8773测试通过、E2E工具293/293通过、全仓typecheck零诊断。
`pal-meal-shell`除精确停点外记录成功world draw，验证两次对白各连续5次绘制的坐标/朝向/显示帧均不变。
日志分别为`/tmp/type-pal-takeover-full-reforge-20261007.log`、`/tmp/type-pal-takeover-tools-20261007.log`、
`/tmp/type-pal-takeover-full-typecheck-20261007.log`；新001浏览器日志为`/tmp/type-pal-opening-takeover-both-20261007.log`。
测试oracle仅更新已独立推导的随从8步及道士1500ms循环两条hash，未批量录失败结果；e10新增一个auto使总数1322/4656。
当前源码引用hash更新不修改历史执行收据；001帧红项仍在，不标全链done。无下一位Agent提示词，仍由本卡继续。

#### 001 接管后剩余的通用时序差异：已核原因，未改等待语义

本轮比较器修正范围（build allowed）：Codex为唯一写入Owner，贡献者只读复核。
第一阶段`mode.ts`推进的frameNum与RF`WorldMotionRuntime.worldTick`不是同一时钟域；
`npc-transition-contract.mjs`却直接用二者差值判持帧，且只有整条移动数组一致时才比较完整姿态序列。
001原始实际draw反例是李大娘叫醒frame3：Game约299.9ms/3拍、RF约317.3ms/4拍；
frame1同为3拍却也相差约17ms。目标是保留各自拍号用于诊断，增加实际draw经过时长，
对未分离作者等待/打字/确认输入的时长差标明归因缺口，不冒称多停100ms，也不加毫秒容差放行。
移动不齐时仍比较精确共享移动前后的完整姿态窗口，不能因末端差异漏掉初次显示或中途转身。
原版数据不定义浏览器观测时钟，故该指标的primary source为两运行时和原始draw记录，不变更原版或产品。
最强替代解释为末步多一帧必然导致整个序列错位；反控以末步不同但前面插入一个错帧证明共享窗口可独立判错，
同时拒绝把较短路线的未匹配尾部当成另一侧的共享窗口。获准末半格仅在完整路径和实际draw均符合时另记裁决，
其它红项不消失；本轮不新增作者指令、schema或修改全局调度。

比较器本轮交付：001 reader补齐lifecycle接线；移动数组不同仍比较初次移动前、各精确共享移动窗口内的
**全部实际draw姿态变化**，不是只比每步首帧；不能把一边较短的未匹配尾部拿来对齐。局部末半格模块
`opening-terminal-motion.mjs`仅在前缀、访问、逐步位置/实际帧/完整绘制时钟均满足时登记accepted；
到达后的隐藏/转身仍独立核，不删除新增步再重新计算hold。
对06-39批次旧raw只读重算为1项accepted、5项finding：e8/e10/e11持帧归因缺口，e10实际姿态序列和
移动首帧差异。e10当前批次首个可见draw已经移动，另在-17先画down0后up6；其它批次初显不能据此一概而论。
Game frameNum和RF worldTick仅作为各自诊断值，不再直接比较；elapsedMs也不能直接冒充作者等待，
缺等待/打字/确认责任记录时仍报evidence-gap，即使数值相同也不自动通过。
工具305/305；只刷新当前sourceRefs/配对source-contract锚点，不改历史runtimeExecution或revision。

- 主代理独立重跑真实`RuntimeFrameSession`+`WorldMotionRuntime`的内存相位反例，日志
  `/tmp/type-pal-wait-phase-counter-20261007.log`：400ms等待分别在移动拍相位0/25/75ms开始，
  第4拍都在1400ms，首up绘制却在1405/1430/1480ms，额外down窗口为5/30/80ms。
  测试用5ms实际帧推进，Promise只在每次同步tick返回后恢复；这是合法等待与真实移动节拍的组合，不是完整剧情替身。
- 源锚：`runtime-frame-session.ts:55`建立毫秒deadline，`:97`起settle→advanceWorld→present；
  `world-motion-runtime.ts:217`独立累积100ms步进；Game `event-system.ts:1478`在帧计数归零后同栈继续转身。
  实际RF日志对白关闭clock58405.8，后4次移动为58455.8/58555.8/58655.8/58755.8；新的对白页58829.2开始。
  原日志没有wait注册事件，因此不把某个推算deadline写成已采集事实。
- 原版主角首移的同拍大娘位置为-12.5；RF首移同拍大娘随后推进至-12.125。不得取RF上一条NPC记录冒充该拍终态。
  仅将脚本续行放到绘制前仍不能让新注册的partyMove在已经提交的同一批中移动；禁止再执行一次advanceMoves。
- 后续范围需单独核定：明确的世界拍/动作同步点等待与绘制前即时脚本段收尾，而非暗改wait(ms)、定时补偿、
  全局对白冻结或放松比较。当前未新增作者指令、schema或全局调度规则，保留全部红项。
- 本轮docs零问题；lint3246文件0error/0warning/0info；`git diff --check`通过。未提交推送。
- 编辑器作者回归另实测：content1491/1491；editor首轮605文件中604通过，仅原引用census断言失败
  （4850通过/1失败，原报告不改）。用真实loader→toEditorState→diagnostics独立重算，当前
  addresses/blockers/rows/targets为22720/4365/25211/28116；只将s001/s003/s005替回HEAD内容的同caller结果
  为22676/4359/25204/28109，逐场景差量亦已核。不是仅复制失败的第一个数字。
  更新精确census并新增e10/default页→leave-bedroom的唯一auto绑定断言，保留全部collector/index逐项一致性、
  删除阻断、worker结果及2.5MB上限；定向重跑1/1通过。日志`/tmp/type-pal-reference-delta-20261007.log`与
  `/tmp/type-pal-takeover-reference-census-green-20261007.log`；不把原全量失败日志追溯改成全量绿。

Coding Owner仍为Codex；三位贡献者只读复核，未改实现。只修下面已核的canonical作者编排及针对性测试，
不改自动脚本接管时丢弃一次性指令的既定合同，不顺带改菜单/对白的全局冻结政策。

| 用户可见行为 | 原始内容 | 第一阶段真实调用/记录 | 当前二阶段 | 本轮目标与反证 |
|---|---|---|---|---|
| 起床时李大娘动作节拍 | `data/extracted/events/scene-001.json:4362`起，frame1/2/3/0间的0x09操作数3/0/0/0/2/3 | `event-system.ts` opcode9按max(n,1)个100ms探索拍；Game001新raw前三次持帧300/200/300ms | `s001`onEnter对应wait120/40/40/40/80/120 | 六wait改300/100/100/100/200/300；先作者真实编译caller反控，再新001实际draw验证，不把跨对白末hold一并归因 |
| 送菜后苗人随从完整退回 | `all.json` L_537安装auto541；L_541左移，L_542 reset541/idleFrames8，L_543结束 | Game runOneAutoOp完整8步，从[1360,1064]至[1328,1048]；004录制在第7步离场，不是完整终点 | e15先选auto后release，首步因authority丢弃；完成于[107.25,24]；尾frame2碰巧匹配Game第7步 | release前移到选auto之前，保留8步，删人为frame2；壳层执行完整正文并等待auto完成，严格验[107,24]；不能以离场前7步对齐证真 |
| 门口醉道士循环节拍 | `all.json` L_734–739 | 真实runOneAutoOp：frame1在tick2/17/32/47，frame0在4/19/34/49；周期15拍 | loop内wait200→frame1→wait200→frame0→wait1300，周期17拍 | 首次wait200移出loop，loop内保留200/1300；覆盖连续至少两轮，拒绝只检查单轮wait数组 |

最强替代解释分别为采样时钟不同、Game本来只走7步、可见窗口不同。上述原始操作数、完整自动执行器和
真实帧/位置记录已排除其作为这三条缺陷的解释；窗口/菜单本身仍可能造成其它独立差异，不因本轮而放行。
原始日志不改写。当前001–003新独立流程均已完成，但NPC比较仍红，仅为修前证据，不继续循环重录未冻结内容。

### 2026-10-06 用户要求先启动串行诊断

- 用户在获知 SAVE12 两轨独立20例已通过、NPC比较仍未收口后，明确要求“开始串行测试吧”。本次先执行诊断串行，不将第二步未决项当作通过，也不以串行结果替代独立帧比较验收。
- 输入严格取 `build/e2e/save12-independent-receipts-20261006.json` 冻结的12份story报告，逐份核SHA256后通过现有生成器构建 `build/e2e/save12-continuous-story-tape-20261006.json`。不使用items/guards/saves专项，不修改产品或比较器。
- 同一页面从001到006，裁剪显式boundary操作，正常菜单输入保留；每段精确核对独立终点和真实世界checkpoint。首次偏离保留现场，与对应独立日志对齐，不猜测遮挡或改寻路。
- 本次日志：`/tmp/type-pal-save12-continuous-20261006.log`。`continuous-both-2026-10-06T14-55-55-249Z`对应两引擎 `continuous-{game,reforge}-2026-10-06T14-55-55-618Z`，001–005均通过实际checkpoint。006 Game在doctor action35等待下一对白超时，随后中断RF；两边均无006 checkpoint，不算通过。

#### 2026-10-07 用户纠正006停止点（本轮 build allowed）

- 用户指出上岛后必须完成张四最后对白，未结束不能存档。旧独立006仅在岛屿首句 `dlg.1886` 出现即报passed，录制不含收尾输入；旧报告保留原状，但撤销其“完整006结束”信用。RF连续在上岛后等待控制返回，却没有收尾输入；与Game医生确认输入超时是两处不同缺陷。
- 原版/primary及第一阶段：`data/extracted/events/all.json:33078` 至 `33109` 依次1886/1888/1889/1890，随后end；Game真实解释器消费该事件。当前二阶段：`projects/pal/content/scenes/s014.json:667` 至 `711` 为相同两组对白，之后complete。当前测试：`boat-journey.mjs`/`boat-game.mjs` 的touch终点接受dialogue，未执行岛上dialogue。目标：完成四行、对白关闭、剧情结束并恢复控制，才记录006终点，不进入岛上其它剧情。
- 最强替代解释是“RF仅因联动中断而未说完”；独立报告endWorld.arrivalDialogue=[dlg.1886]且最后actions仅乘船方向键，反证收尾输入本来就未生成。不是NPC遮挡、坐标误差或产品脚本缺行。
- Codex核定白名单：006两引擎journey、boat合同/对比及反控、连续终点门及反控、剧情/检查点说明与本卡看板；不改产品、作者内容、移动算法或存档schema。先反控拒绝未完成报告，再补独立执行四行并实跑两轨。医生输入重播差异另以日志核实，不用过滤Enter或跳过整段掩盖。
- 医生输入根因已核：旧Game独立006 actions有15次doctor Enter，但state-trace对应7个不同的等待页；例如1791297985951/5996/6041三次都对应同一“我出门的时候，她还好好的啊”页面。boat两引擎dialogue循环漏掉了inn/kitchen/meal/errand既有的“确认后等待dialog状态改变”，Game尚未消费时反复注入。连续每条确认均等待下一页，于第8条医生确认开始多等。本轮仅让boat补齐既有确认消费等待，不改连续重播策略，不筛掉已记录输入；重新实际录制。
- 006终点反控先红2/2，修复后合同4/4通过、全工具279/279、lint3241文件零诊断。首轮补终点RF `reforge-006-2026-10-06T15-07-36-373Z`完成四行并返回控制；Game `game-006-2026-10-06T15-07-35-058Z`因新岛上断言误纳入之前码头对白失败，不是产品漏说。修正为乘船前显式开始island-arrival证据阶段，保留从登船到完整上岛对白的全部记录；与消费等待补齐后两轨再次实跑。
- 补齐后独立006两轨通过：`game-006-2026-10-06T15-10-00-341Z`、`reforge-006-2026-10-06T15-10-01-878Z`；各7次doctor确认、2次island-arrival确认，完整记录1886/1888/1889/1890，endWorld均arrivalDialogue=[]/controlReturned=true/facing=down，最终Game[752,808]与RF[74,27,0]精确对应。旧001–005 story哈希再次核验，替换006生成`build/e2e/island-complete-story-tape-20261007.json`并重启双轨连续；不是把失败日志删键加工成通过。
- 新串行实际通过：`continuous-both-2026-10-06T15-12-20-222Z/continuous-both.json` 两进程exit0，001–006六个barrier均双轨到达；两引擎目录均为 `continuous-{game,reforge}-2026-10-06T15-12-20-593Z`，各一个浏览器context、errors=[]。006各自真实执行两次island-arrival Enter，最后Game scene15/[752,808]/down、RF s014/[74,27,0]/down，dialog/menu关闭、事件执行结束；Codex检查双方006最终截图，均已关闭对白，未将单帧截图当完整动画验收。
- 全程复用两边各自页面，不执行片段边界存读档；004真实菜单使用酒的输入保留。连续终点通过不反向放行NPC帧比较：新 `both-006-2026-10-06T15-12-21-302Z` 主线对白/船段findings=[]，NPC仍37项未决。第一步完整独立与本次诊断串行已通过，第二步仍未收口，不开始状态方案/剧情阶段组合，不标整体done。
- 最终质量：工具279/279、docs工具48/48及915Markdown/5202链接和testing-docs均零问题、lint3241文件0error/0warning/0info；日志 `/tmp/type-pal-island-{tools,docs,lint}-final-20261007.log`。独立Game录制后仅Biome调整if换行，无语义改动；报告保留原采集源码hash，不覆盖原文件冒充重录。未修改产品/内容/存档schema，未提交推送。无下一位Agent提示词；当前串行展示等待用户验收，NPC语义帧比较另继续本卡。

| 维度 | 结论 | 一手证据 |
|---|---|---|
| 原版/第一阶段规避 | NPC 触碰主角后存在实际推离提交，且不是玩家输入步 | `packages/game/src/core/scene-system.ts:276` `pushPartyAwayFromBlockingNpcs`；当前 `game-002` trace 的 actor/party 提交 |
| 当前 Reforge 规避 | authored `moveEntity` 使用 `scriptedBypass`，动态 sidestep 不覆盖该来源，且没有 post-contact 分离 | `packages/reforge/src/motion-runtime-wiring.ts:14`；`packages/reforge/src/main.ts` motion batch |
| 004 随从移动 | 第一阶段 e26 位移提交约每 100ms；Reforge e26 的 6 次 nudge 同一调度批集中执行 | 当前 `game-004-story/004-story.trace.json` vs `reforge-004-story/004-story.trace.json` |
| 005 张四转身 | 第一阶段张四对白前出现 `left → right` 实际朝向提交；Reforge e123 对应正文缺少显式转身 | 当前 `game-005-story/005-latest.trace.json`；`projects/pal/content/scenes/s005.json` e123 |
| 本任务目标 | 状态变更日志先于脚本指令成为比较入口；连续演示复用通用片段注册/检查点，不改每个碎片验收脚本来“拼接”；主线画面可左右分屏且同步推进 | 用户 2026-10-04 指定 |

## 替代解释与反证

### 2026-10-07 正文观测边界补证据（build allowed，先003真实caller验证）

- 上一goal回合为progress：取得六段双轨连续收据，补正006完整收尾；本轮不重复演示，继续第二步未决证据。先实现通用的显式正文order区间及初始状态基线，在003真实入口验证，再扩到其余入口；不是为003设置NPC豁免，也不放行其它片段。
- 四向前提：原版存储实现N/A（这里只界定E2E正文）；第一阶段003 `game-003-2026-10-06T14-38-25-388Z` e56首记录已为[137,66]/down；当前RF同批 e56 order14是恢复前[124,45]/left，order44回到[137,66]、order48恢复down、首render为正确现场。`kitchen-journey.mjs` 已在bootstrap完成、输入前记录route.startOrder（Game16/RF99），但`readNpcTrace`直接将全trace交给比较器。目标：两边均从明确的恢复完成正文边界比较，保留该时刻完整已观测初值；记录原始初始化不删改。
- 最强替代解释是“e56真的以错误位置进入正文”；新初始基线仍逐项精确比较，若恢复后+1格或正文移动+1格，反控必须继续报错。不得按NPC/id删除初始化，不得把边界前后的render span截丢，缺连续render clock仍失败。
- 白名单：新增通用npc-story-scope模块及少量反控、003 journey记录显式起止边界、NPC trace消费和render span范围处理、本卡/源核验说明。只加E2E证据，不修改产品、内容、移动算法、场景恢复或比较阈值。当前只完成边界维度，不以此声称语义路线段/时钟域已经实现。
- 003实跑：`game-003-2026-10-06T15-42-57-515Z` / `reforge-003-2026-10-06T15-42-57-499Z` 独立均passed，显式正文区间分别(52,959] / (98,2801]。同一批原始trace全量比较26项，正文含精确初值比较9项；减少的17项均为e56/e59/e60/e61读档初始化混入。e19/e20场景进入状态、e56语义移动段对齐、e62循环帧仍未决，`both-003-2026-10-06T15-42-56-960Z`仍failed，不放行。
- 反控：跨边界render span用例修复前失败（含了窗口外draw），修复后22/22相关测试、全工具282/282；初值+1格、终点+1格、原span缺钟均拒绝。lint3243文件零诊断；docs源哈希待同步，不宣称质量门已全过。
- 扩展白名单到001两入口、002/004/005 journey、006两入口（build allowed）：001在“新的故事”真实输入前/最终matrix采集后记边界；002在bootstrap后/innEndPresented返回的原trace记边界；004仅单context正文case在pickup前/醉道士演出完整返还控制后记边界，不给跨context saves伪造区间；005在bootstrap后/news完整返还控制后；006在bootstrap后/完成岛上对白的最终NPC trace记边界。均只记观测order，不修改任何按键、产品状态或原始trace，既有正常菜单属于正文。先重录这些正文入口，存读档专项不因增加metadata自动重发证明。
- 六段12个独立正文入口均已重录passed；001–006当前NPC未决数为3/7/9/7/23/37，仍不是整体双轨通过。完整原始路径、report/trace/comparison SHA256、显式边界、真实前驱及本轮源码冻结在`build/e2e/npc-story-scope-receipts-20261007.json`；004/005本轮只重录story，未给专项重新发证，前驱沿用同canonical内容的真实独立checkpoint。006新Game `game-006-2026-10-06T15-55-47-783Z` / RF `reforge-006-2026-10-06T15-55-47-766Z` 均完成岛上张四收尾，终点再次为对白关闭、控制返回；`both-006-2026-10-06T15-57-35-476Z` 保留NPC未决。
- 新边界没有修改输入架构或产品：正常菜单仍完整，原始trace不删改；正文外的完整render时钟仍用于校验跨界span，比较只消费显式正文窗口及精确初值。001/002/004/005/006的其余问题不因003初始化归因而一并消除。frameSource为Game实际drawn、RF selected的差别，以及场景materialization/时钟域/语义段对齐仍需分别核实。
- 最终复核：`/tmp/type-pal-npc-scope-types-20261007.log` 全工作区typecheck零诊断；`/tmp/type-pal-npc-scope-{tools,docs,lint}-final-20261007.log` 为工具282/282、docs工具48/48及915Markdown/5202链接和testing-docs零问题、lint3243文件0error/0warning/0info，`git diff --check`通过。源锚只更新当前sourceRefs/hash，历史runtimeExecution/revision等原样保留。未提交推送。

### 2026-10-07 用户批准通用实体面向主角指令

- 用户明确：“如果缺少指令应该补上，因为真值是第一阶段”。将003/005李大娘交互转身缺失列为产品修复，不按可接受差异或主角路线差异豁免。
- 一手证据：第一阶段`packages/game/src/core/scene-system.ts:162`的applySearchVisualEffect在实际Confirm入口调用（:561），按主角反方向转NPC并定站立帧；003新Game trace中e19朝向up→down→up，RF始终up。RF `packages/reforge/src/main.ts:4983`/`:5994`仅findTrigger→fireTrigger→startScript，`projects/pal/content/scenes/s001.json:2524`的serve-guests正文直接dialog后切e20方案，没有转身；不是collector遗漏已有指令。
- 现有`packages/content/src/author-script-core.ts:189` / `script.ts:135`的setEntityFacing只接受四向Facing；现有author条件也不能查询主角当前朝向/相对方位。先前take-dishes中的固定down/up只处理端菜表演，不能用它替代从不同方向交互的动态朝向。不得仅为当前E2E路线硬写down；也不得把第一阶段的隐式Search副作用搬回所有Reforge交互。
- 已向用户提交最小新增能力建议：通用显式“实体面向主角”指令，由相关交互脚本调用；李大娘对白后再显式恢复厨房工作朝向。这涉及content/runtime/editor公共合同，尚未改schema或产品，等待这项形式确认后单独核四向真值、运行时/预览入口和失败反控；不影响已完成的正文边界包。无下一位Agent提示词，Codex继续本卡，转向能力方案待用户确认。
- 用户随后明确批准：“‘实体面向主角’指令可以加，这样很多npc对话转身面向主角都能用了”。该确认解除能力形式等待；只在显式调用的脚本转向，不修改所有交互入口。下面实际draw取证包尚未实施，空辅助模块已撤回，先完成本项获批公共能力。
- Codex核定 `build allowed`：新增当前作者指令 `faceEntityToParty {target: EntityAddress}`，执行时使用当前场景目标与队长的实时地面坐标、既有 `entity-walk.ts:facingToward` 像素象限；同点保持原朝向，不改位置、帧、动作或控制权。非当前场景沿用实体转向命令的无现场副作用语义，不把主角投射到异地实体。自动脚本必须走既有目标姿态权威等待。编辑器采用相同计算，显式目标选择/展示/预览齐备；不增加旧运行时指令方言或隐式交互规则。
- 四向矩阵补全：原版引擎依据为 `reference/sdlpal/play.c` 的PAL_Search（仅参考，不声称已实跑PAL.EXE）；第一阶段为上述Confirm真实调用与003原始trace；二阶段当前固定朝向指令、实时位置和像素朝向计算已具备但缺动态指令；目标为用户批准的显式动态转向与李大娘对白后恢复工作朝向。替代解释“按主角反方向即可”以主角朝向不变、位置分处NPC四侧的真实runtime/preview用例反证；禁止静态坐标或当前路线硬编码。
- 本包白名单：content作者指令/验证、host适配/main自动姿态权威、editor当前作者表单/目录/预览、对应真实caller测试、s001/e19作者正文与文档。其它NPC仅登记，不批量猜测补指令；实际draw取证仍待后续。新增指令不接管、不暂停自动脚本，作者需要时仍显式take/release。
- 补核e19收尾：`data/extracted/data/scene/1.json` e19的autoLabel为L_35630；`events/all.json`该入口为0x0F [2,0,0]再reset，固定朝上站立。003新trace order923→951、005新trace order335→419均为交互down后返回up。当前作者内容已将这种空转自动脚本烘为静态up，故在五个交互步骤前显式face/frame0、步骤尾显式up/frame0，不恢复隐式auto↔dialog冻结耦合。
- 真实preview组合测试先暴露另一个直接依赖缺口：Playback.host缺setEntityPos，adapter可选调用未写overlay，后续动态转向读到旧位置；补上现有定位命令的预览实现，不改运行时定位或引入状态方案。四向/同点组合修复后14/14通过。作者编排新增测试修前恰一AssertionError、其余5例通过，日志`/tmp/type-pal-face-party-author-red-20261007.log`；不将schema尚无新kind导致的guard错误冒称有效业务反控。
- 实现复核：`author-script-core.ts:190`只加当前author/runtime叶，不扩旧Command方言；`script-host-adapter.ts:172`按场景地址派发，`main.ts:2465`按live位置转向、`:3317`纳入目标姿态权威等待。`playback.ts:364`当前canonical定位完整保留GridPos高度（不依赖旧host的二维定位类型），`:831`复用同一facingToward。编辑器中文目录/插入/目标选择/描述/预览齐备，触发区继续禁止选作转向目标；无固定方向字段。schema、适配隔离、真实bootGame四向/同点、自动owner等待、preview实时overlay和实际React插入改目标均通过。
- 新内容实跑前驱链：RF001 `reforge-001-2026-10-06T16-19-39-186Z` → 002 `reforge-002-2026-10-06T16-21-51-415Z` → 003 `reforge-003-2026-10-06T16-22-44-441Z` → 004正式存读档专项 `reforge-004-saves-2026-10-06T16-24-03-110Z` → 005正文 `reforge-005-story-2026-10-06T16-25-29-609Z` 全部passed；均真实新录制，不改旧存档digest，不过滤按键。004/005其余专项、006与连续没有因此自动重发验收。
- 目标对比收据 `build/e2e/face-party-receipts-20261007.json` 固定原Game、修前RF与新RF的trace路径/SHA256。003及005 e19修前RF仅up，修后两轨均up→down→up；已观测姿态序列均[up,6]→[down,0]→[up,6]。Codex查看新003-kitchen.png，确认对话时面向逍遥。Game帧来源仍为drawn、RF为selected，不能冒称实际绘制与持续时长已一致；完整比较003仍8项、005仍22项未决，整体不标done。
- 全量回归纠正三类过期测试事实，不改产品规则或降低门禁：厨房handoff测试不再假设切换酒菜方案是最后一条（尾部现在有显式复位）；项目概览最低存档版本断言由旧11核为当前12；PAL引用census与数字输入wrapper census按真实collector/AST刷新，collector/index删除阻断的逐项一致断言与worker payload上限保留。e19新增20条自引用不成为外部删除阻断；旧e15接管/释放形成2条外部引用，未移除任何边。
- 已完成质量：content全包1491/1491、reforge全包8768/8768、editor全包4851/4851（605文件）、E2E工具282/282；全工作区typecheck零诊断、lint3243文件0error/0warning/0info、docs工具及915Markdown/5202链接/testing-docs零问题。当前sourceRefs仅同步已重核main接线的SHA，不改历史runtimeExecution/revision。日志 `/tmp/type-pal-face-party-{content,reforge-all-final,editor-all-final,tools-final,types-final,lint-final,docs-final}-20261007.log`；editor全包首轮3条过期断言已修，最后完整复跑exit0。editor测试日志仍有jsdom的navigation未实现提示，不将其冒称控制台零输出；硬性静态门零诊断。
- 本项显式转向能力及e19编排验证完成，本卡整体仍为build；其余NPC帧与实际draw取证未收口，不以局部通过替代双轨整体验收。无下一位Agent提示词，本项交付用户，后续继续本卡须保持上述未决项。

### 2026-10-07 Reforge实际绘制取证（build allowed，仅隔离插桩）

- 上一goal回合为progress：六段正文边界真实重录和零诊断验证已落盘。本回合不把自动续跑当动态转向方案的人类批准，先修另一处已证采集缺口。
- 四向前提：原版像素合成N/A（本包不判最终遮挡像素）；第一阶段present.ts的真实NPC draw回调成功后记录所选资源，并在完整entries循环成功后发布世界帧；RF `world-scene-presentation.ts:168`在sprites组装时写renderedEntityFrames，`:173`只入队SpriteDraw；`render.ts:535`实际draw回调、`:602`完整队列执行才是提交边界；当前`opening-trace-plugin.mjs:161`只证明renderWorld返回，不含逐实体draw结果。目标：保留选帧证据，并额外记录真实逐实体绘制提交，完整world返回才发布，不冒称最终可见像素。
- 最强替代解释是“选帧已经等于成功绘制”；真实caller反例将让第二个NPC draw抛错，应有部分draw调用但没有新的world完成记录。共用同一frame资源的两NPC须按SpriteDraw对象身份区分，不用资源或数组下标当实体身份；不更换原资源、不改排序、不吞掉绘制错误。
- 白名单：通用隔离render插桩辅助模块、opening及继承插件接入、五个observer对真实draw结果的消费、真实caller回归及本卡/源锚。生产渲染器、运行时、内容、指令schema均只读。先做反控与完整工具门，再用003已知相机/帧差异真实入口验证；不为日志归一化隐藏实体或增容差。
- 本轮goal continuation为progress，承接已完成的显式转身包。实际实现为`scripts/e2e/reforge-render-evidence.mjs`：通过精确AST锚点插入只读记录，WeakMap以SpriteDraw对象身份关联实体/位置/朝向/实际所选资源下标，真实排序后的entry.draw成功才登记；整个renderScene成功才发布该sprites批次，main完整renderWorld返回后才交给collector。重画同批前撤销旧pass，后一个draw抛错不发布局部成功；不修改生产源文件、绘制表达式、资源、排序或异常传播。
- 根因回归日志：`/tmp/type-pal-reforge-draw-red-20261007.log`中真实Vite插件加载的WorldScenePresentation→Canvas2DRenderer完成两次draw，却没有实体draw证据，恰一AssertionError；`/tmp/type-pal-reforge-observer-red-20261007.log`中旧collector把缓存9当实际draw0，恰一AssertionError；`/tmp/type-pal-reforge-provenance-red-20261007.log`中相同数字但selected/world-pass-only仍被当作已验证，恰一AssertionError。这里记修前回归，不冒称完成官方mutation重建验收。对应真实caller测试还验证共用同一帧资源的两NPC按反向输入、实际深度排序后不会串身份，第二次绘制中途失败不复用第一帧成功记录。
- 五个collector统一只消费renderEvidence.actors：drawn、明确not-drawn、缺来源unknown分开，不以选帧缓存兜底。比较器新增render-evidence-source判据，两边帧号相同也不能放行selected/unknown或完全缺失的绘制记录；明确没有draw是观测结果，不冒充缺日志。无容差、无NPC豁免、无按键或正常菜单变更。Reforge001–005及连续录制源指纹纳入新helper；本轮核验另发现006独立入口没有继承inn源列表，其per-run hashes仍缺helper（实际draw记录存在），不追改原报告，另在整批收据冻结helper与生产渲染源码，后续补齐006源清单。
- 003最小实跑：Game `game-003-2026-10-06T16-45-02-746Z`与RF `reforge-003-2026-10-06T16-45-02-728Z`独立通过，RF原始frameSource仅drawn/none，没有selected/unknown；配对`both-003-2026-10-06T16-45-02-195Z`仍8项未决。具体e19/e20进厨房的恢复前状态混入、Game离屏裁剪与RF整批draw差异、e56最后一步0.5格与RF0.375+0.125格的路径采样不同、e62循环动画观察窗/时钟仍需独立判因，本包不改引擎或把这些标accepted。
- 工具全量285/285通过；lint3245文件0error/0warning/0info；文档sourceRefs仅刷新已核读的collector/consumer和未改合同的前驱检查哈希，历史revision/runtimeExecution保持原状。当前日志为`/tmp/type-pal-reforge-draw-{tools,lint,docs}-20261007.log`。冻结后已启动001→006双轨全量独立重录（含004/005专项），未全部结束，不提前发证；本轮不重复串行展示掩盖第二步未决。

#### 2026-10-07 用户裁决：保留匀速，明确登记末步差异

- 用户针对003李大娘回厨房的已核差异明确选择“保留匀速，明确登记差异（推荐）”。第一阶段末段剩0.5格时一次走完，Reforge按正常速度分0.375+0.125格完成；精确终点相同。本裁决保留Reforge当前移动算法，不恢复第一阶段任一轴接近时整体吸附的规则。
- 判定边界：允许该已核末步分解差异，不放宽起终点坐标，不豁免朝向、完整步态、速度、暂停恢复或其它帧差异；不按e56/id建立跳过规则。后续比较须取得真实路线段证据后按已批准的语义段合同核对，当前movement-leg-alignment缺口仍如实保留，不仅凭本裁决把整个003改成passed。
- 当前全量独立重录继续使用冻结的运行时、内容与比较器，不因本次裁决修改正在运行的候选。无下一位Agent提示词，Codex继续本卡。

#### 2026-10-07 帧比较去除混合原始索引（build allowed，仅consumer）

- 四向前提：原版机械帧索引N/A（不移植实现）；第一阶段`packages/game/src/present/present.ts:530`至`:565`将scriptedFrame与朝向换算成实际帧；`scripts/e2e/errand-observer.mjs:353`记录的actor.frame仍是scriptedFrame。当前Reforge actor.frame来自显示帧缓存，而`npc-transition-contract.mjs:599`仍直接对两边actor.fields.frame调用frameSummary，混合了不同含义。目标只用已有的实际draw记录判断画面帧变化，原始状态字段继续保留作诊断，不改actor位置/朝向等合同。
- 实跑反例：新005 `both-005-2026-10-06T16-59-41-395Z`将e19列为actor-frame-animation：Game原始frame=[0]、RF=[0,6,0,6]；同一报告实际drawn姿态两边均[up,6]→[down,0]→[up,6]。离屏not-drawn差异另保留，不能用本结论放行rendered-pose整项。替代解释“Game没有转身/缺实际帧”已被两边真实draw记录反证。
- Codex核准白名单：比较器移除旧原始frame是否变化的重复判据、相关精确回归及本卡/源锚。既有render-evidence-source、完整rendered-pose、停留和movement-frame合同不减弱；真实draw错帧或缺日志仍失败。不修改正在录制的产品/collector，006及旧比较器完整批次结束并保留报告后，才应用consumer修复，对同一批原始报告另存新比较结果，不覆盖旧失败。
- 反例`/tmp/type-pal-frame-index-red-20261007.log`恰一业务断言失败：相同实际draw序列6→0→6，仅原始索引语义不同，误报actor-frame-animation。移除旧frameSummary判据后定向全部通过；同一用例只改实际draw的中间帧0→1仍精确报rendered-pose，缺来源反控仍失败。原始actor字段继续留存，未删除绘制序列/停留/逐次位移帧比较。
- 冻结新独立批次`build/e2e/actual-draw-independent-receipts-20261007.json`：001–006两轨story及004 items/saves、005 guards/saves共20例passed；5412条报告内源码哈希逐项核对当前文件无差异。原比较001–006未决分别3/7/8/7/22/37，全部路径、SHA256、真实前驱、正文边界及006终点保留。006两轨实际1886/1888/1889/1890四行结束、arrivalDialogue=[]、controlReturned=true；Game[752,808]/down与RF[74,27,0]/down精确对应。
- 只读重算`build/e2e/actual-draw-frame-index-recheck-20261007.json`保存修复后comparator SHA及每段原输入SHA；当前未决分别3/7/8/7/17/34。逐条完整finding核对：仅删除005的e19/e62/e123/e124/e127和006的e35/e36/e203这8条混合索引误报，其余finding内容完全相同，无新增豁免、容差或末步特例。重算不是新浏览器运行，旧失败报告未覆盖，第二步仍未通过。
- 当前质量：E2E工具286/286、lint3245文件0error/0warning/0info；日志`/tmp/type-pal-frame-index-{tools,lint}-final-20261007.log`。本轮产品源码未修改；全工作区typecheck零诊断收据`/tmp/type-pal-reforge-draw-types-20261007.log`仍有效。文档最终48/48工具、915Markdown/5202链接及testing-docs零问题，见`/tmp/type-pal-frame-index-docs-verified-20261007.log`；前轮sourceRefs行号更新但claim未同步导致的1项失败保留，已同时修正引用，不回写旧日志。20份原报告哈希及12份正文trace的drawn/none来源再次核对，原始证据未改。未重跑连续演示、未提交推送，不开始状态方案/剧情阶段；下一步先按真实场景呈现边界、同义时钟及语义路线段补证据，剩余朝向差异逐条核第一阶段入口与作者正文，不猜测批量修复。无下一位Agent提示词，Codex继续本卡。

- 若 Reforge 实际 trace 已存在 post-contact party 位移，则规避项改为观测器/录制缺口；当前代码与 trace 尚未观察到，先修运行时合同。
- 若 e26 连续位移是浏览器采样压缩而非真实脚本同批执行，则加入独立 motion commit 时序断言；当前 trace 的提交时间已显示同一毫秒级批次，且正文没有 wait。
- 若张四朝向来自渲染层而非脚本正文，则在 render/commit 双层 trace 交叉核验，不盲加内容命令。

## 白名单与验收

### 2026-10-07 实际绘制几何补证据（build allowed，不改变比较策略）

- 上一goal回合为progress：真实场景生命周期、003新双轨和严格静态门已完成。本轮继续未决rendered-pose根因核验，不改产品、内容或比较器。
- 四向前提：原版像素算法N/A（本包不修改渲染）；第一阶段`present.ts:584-587`在加入绘制队列前裁掉屏外NPC，实际blit由`draw-sprite.ts:42-44`使用当前帧anchor；RF `render.ts:509-540`给所有可见sprite建立drawImage回调，由Canvas裁掉屏外区域，`world-scene-presentation.ts:314-333`还会应用worldScale。现采集仅记录draw回调是否完成，不能从drawn直接推出屏内可见。
- 反例与替代解释：003厨房e19/e20两轨可见状态一致，但Game含not-drawn而RF始终drawn；也可能是两边相机或精灵实际落位不同，不能未核便标成误报。补实际世界blit矩形、视口/相机/变换；原drawn/not-drawn、帧号、全order和比较结论不变。矩形相交仅证明几何进入画布，不冒称透明像素/遮挡后可见。
- 白名单：两引擎隔离draw插桩、五个collector无损保留view/geometry、真实caller反控、003最小双轨实跑与源锚。几何随actor姿态span保存，camera/viewport随world-render记录，避免把相机移动复制成每个NPC的伪状态变化。不引入新渲染裁剪规则、坐标容差、frame例外或按NPC过滤。

### 2026-10-07 e62 auto节奏诊断（先证据，未改作者内容）

- 003的屏外裁剪误报已与e62分开：屏内实际姿态序列仍显示e62差异，不能用几何边界放行。第一阶段真实`tickAutoScripts`调用`L_734`链的可复现实验：frame 1出现在第2次auto调用，frame 0第4次，下一轮frame 1第17次、frame 0第19次，即逻辑间隔约`200ms / 1300ms`（入口相位只影响首段）。证据脚本直接执行真实`event-system.ts`与真实scene-3 event object，不是手写模拟。
- Reforge真实作者auto flow `projects/pal/content/scenes/s003.json:e62` 的等待顺序是`40,100,140,100,640ms`，编译器实际展开为frame 1约`140ms`、frame 0约`240ms`、下一轮frame 1约`780ms`。这解释了浏览器里RF较快切帧；不是位置、屏外绘制或比较器索引错配。
- 独立浏览器观察还显示Game与RF在后续对白间都可能继续推进e62 auto；因此“给e62所有对白阶段补take/release”不是已证根因。曾在候选树临时加入7个take/release并重录，RF authority采样仍为world且e62 rendered-pose差异未消失；该候选已撤回，当前作者内容未因本诊断改变。候选运行因内容digest变化不能作为当前报告，全部不计入独立/连续收据。
- 用户已明确：即使使用新脚本系统，也要尽可能还原原版演出效果。因此当前 canonical e62 auto 已按原版逻辑帧循环改写为作者脚本节拍：`wait 200 → frame1 → wait 200 → frame0 → wait 1300 → loop`；不是把原版 opcode 原样搬进 Reforge，而是在作者命令层保留原版可见节奏。原版证据为`events/all.json:L_734`的`set frame1 / set frame0 / wait10 / reset`，第一阶段真实auto调用为frame1约第2次、frame0约第4次、下一轮frame1约第17次。已加作者链回归，Reforge e62/content定向测试通过。
- 本次只改 canonical作者内容与其回归，不改引擎隐式对白冻结、不加坐标容差、不改比较器。此前40/100/140/100/640候选报告全部作废；必须从当前内容digest重新生成001→006前驱链。

### 2026-10-07 用户裁决：e62 按原版演出节奏修复

- 用户明确要求：即使使用二阶段新脚本系统，目标仍是尽可能还原原本演出效果。`packages/migrate/README.md:23-30`确认场景/共享脚本属于 canonical 作者正文，不由原版重导覆盖；因此本项修复落在`projects/pal/content/scenes/s003.json`作者脚本，而不是恢复一个旧迁移器兼容分支。
- `e62`的作者auto由`wait 40 / facing / wait100 / frame1 / wait140 / facing / wait100 / frame0 / wait640`改为`wait200 / facing / frame1 / wait200 / facing / frame0 / wait1300`。这是把原版`L_734`的`frame1 → frame0 → wait opcode9[10] → reset`还原为新脚本的显式墙钟节拍；不把原版opcode或第二解释器引入Reforge。
- 回归合同：`packages/reforge/src/pal-inn-choreography.test.ts`直接读取canonical e62 auto flow，断言等待序列`[200,200,1300]`和帧序列`[1,0]`；Reforge定向10/10、content validator 94/94通过。旧候选报告全部无效，当前链必须从001重新生成。
- 随后按用户原则把take/release细化到每个e62 `dialog` 命令前后，而不是整段stage接管；从当前内容重新生成001→006前驱链。当前003屏内姿态循环已对齐为Game 10次、RF 11次，0/1循环形态一致；比较器仍保留首帧/场景边界证据，不用忽略规则放行。当前003剩余e19/e20恢复状态和e56 movement-leg-alignment，e62不再出现在finding中。
- 当前003有效收据为Game `game-003-2026-10-07T03-13-11-122Z`、RF `reforge-003-2026-10-07T03-13-11-117Z`、比较 `both-003-2026-10-07T03-13-10-569Z`；随后当前004/005/006独立流程均通过，004比较 `both-004-2026-10-07T03-38-19-365Z`、005比较 `both-005-2026-10-07T03-41-53-528Z`、006比较 `both-006-2026-10-07T03-49-29-847Z`均保留未决差异/needs-review。001→006尚未完成同一内存页面连续串联，不标整体done。

### 2026-10-07 场景装载生命周期补证据（build allowed，不改变判定）

- 上一goal回合为progress：真实draw取证、20例独立新录制及混合帧索引误报修复已完成。本轮继续既定第二步，生产代码、内容、存档、移动算法只读；先给既有日志补实际场景建立/投影完成边界，不过滤原状态、不改比较结论。
- 四向前提：原版存储机制N/A（只为E2E取证）；第一阶段真实入口是`packages/game/src/shell/bootstrap.ts:789`的loadSceneCommon，先设置场景与NPC切片、恢复素材，再于`:855`开始onEnter；不是dev用的scene-system.loadScene。当前RF `main.ts:952`提交ActiveScene后、`:958`定位主角时NPC世界状态尚未投影，`:1418`applyWorldToScene完成后才具备完整现场。003新trace的e19 order2051为before:player.pos/hidden，order2069为before:entity.pos/visible，首world draw在2102；不能把这两次初始化采样当已绘制的隐藏/出现。
- 最强替代解释：恢复完成前确实有新场景画面呈现，或ready被异常/early return伪造。只在真实资源准备及投影成功边界记录，保留raw提交和全部world draw，用实际caller验证正常提前返回也完成、异常则无ready；实跑核materialized→ready之间是否有draw。发现提前绘制时保留异常，不用边界删除它。
- Codex核准白名单：隔离scene生命周期插桩、五个collector同一order账本保留事件、已存在runner源指纹、真实caller/collector反控及文档。未批准按生命周期过滤，未新增坐标容差、NPC豁免或产品行为。本轮同时补006未完整登记插桩源的问题，不追改旧报告。当前工作树权限已变为只读，所有写入只经明确限定该工作树文件的审批工具进行，不转写主工作区。
- 实现与反例：新增`scene-lifecycle-trace.mjs`仅给实际caller插入materialized/projecting/ready/failed记录，五个collector保留同一全局order。RF正常提前return仍ready，throw原样重抛且只failed；Game须await资源成功才ready。真实Game加载器回归通过五层插件继承链执行，errand不再绕过上游bootstrap插桩；006源指纹补全所有继承插桩目标及helper，但本轮没有重跑006，不给旧报告回填哈希。
- 第一次003补证据两轨独立passed（`game-003-2026-10-06T17-29-54-536Z`、`reforge-003-2026-10-06T17-29-54-540Z`），比较仍8项failed。发现新Game materialized观测点在wNumScene写入后、NPC切片绑定前，会把旧NPC集合归到新场景。增加真实loader的“materialized必须已绑定新NPC集合”断言，先红（`/tmp/type-pal-scene-materialized-binding-red-20261007.log`）；然后把观测点移到实际`applySceneAssetsToPresent`之后、资源await之前。未修改第一阶段加载逻辑，未改写首轮报告。
- 最终003真实重跑：Game `game-003-2026-10-06T17-33-12-503Z`、RF `reforge-003-2026-10-06T17-33-12-496Z`独立passed。Game厨房materialized/ready/首draw order为770/772/777，RF为2291/2307/2311；两边从新实例首状态到ready均0次world draw。厨房e19/e20恢复完成后的精确位置、朝向、visible和state两轨完全相同：e19=[89,45]/up/true/2，e20=[92,51]/down/true/1。RF隐藏→显示发生在第一次draw之前；这是恢复中间态证据，不是已显示的NPC消失/出现。
- 收据`build/e2e/scene-lifecycle-003-receipts-20261007.json`冻结两份report/trace及比较报告SHA，逐项核对两份报告共170条源码哈希；完整raw状态与绘制时钟均保留。`both-003-2026-10-06T17-33-11-928Z`仍8项未决：e19/e20各visible/state/rendered-pose、e56 movement-leg-alignment、e62 rendered-pose。四条visible/state已定位恢复期混入，consumer尚未修改；三条真实呈现序列和一条移动段证据仍须另核，不能一并放行。用户批准的匀速末步差异不变。
- 当前工具289/289通过，见`/tmp/type-pal-scene-lifecycle-tools-final-20261007.log`；全工作区typecheck零诊断见`/tmp/type-pal-scene-lifecycle-types-final-20261007.log`。文档sourceRefs/引用行号同步仅指当前源码，历史runtimeExecution/revision保留；格式检查首轮失败已保留，最终静态门另记。本轮没有产品/内容/存档/移动算法改动，没有全链重录、串行或提交推送，不开始状态方案。无下一位Agent提示词，Codex继续本卡。
- 最终质量：`/tmp/type-pal-current-tools-20261007.log`为工具290/290；`/tmp/type-pal-current-lint-20261007.log`为3246文件0error/0warning/0info；`/tmp/type-pal-current-docs-20261007.log`为docs工具48/48、915Markdown/5202链接、testing-docs零问题，`git diff --check`通过。未降低规则/新增ignore。下一核查锚点：本批e19实际draw姿态两边均up/6→down/0→up/6，但Game额外有not-drawn记录；e20同样存在not-drawn与drawn边界不同；e62两边0/1循环的可观测段不同。须读取实际呈现裁剪/时钟caller后定因，不直接删除not-drawn、压缩循环或承认等价。

### 2026-10-07 005 报信移动根因：auto 提前于 onEnter 启动（build allowed）

- 四向前提：第一阶段场景切换后先完成入场脚本，再进入正常世界更新；当前 Reforge `main.ts:2292-2300` 在 `loadScene()` 提交场景后先 `applyWorldToScene()`、`startAutoRunners()`，随后才由 pending onEnter 启动入场脚本。当前005 RF真实trace中，s004 e83 materialized为`[157,50]`，ready前已出现`commit:entity.pos [139.603,36.060]`；Game同一入口在ready后从`[157,50]`按路线提交。替代解释“这是保存的e83持久位置”已核当前005前驱save：payload没有s004/e83 entityPos；不是作者目标本身。
- 目标 before→after：`before` 场景 ready/entry 前 auto 已抢跑，污染报信正文起点；`after` 有 onEnter entry 时先完成 entry，再启动该场景 auto；无 onEnter 的普通场景保持现有启动顺序。不得全局冻结对白或为e83加特例。
- 白名单：Reforge `loadScene`/pending onEnter 生命周期、真实caller回归、005 e83/e84 current chain；不改作者目标、移动算法、坐标阈值、比较器豁免。需验证 entry 完成后 auto 恢复、无 entry 场景 auto 仍启动、读档跳过 onEnter 不受影响。

### 2026-10-07 005 船家入口转向补齐（build allowed）

- 原版交互入口的搜索视觉会让可交互 NPC 先面向主角；当前 e124（水生叔）和 e127（鱼嫂）的作者默认 trigger 没有显式面向命令，导致 RF 保持右/左单一朝向，而 Game trace 分别出现 e124 `right→left`、e127 `down→left→down→left`。
- 已在`projects/pal/content/scenes/s005.json`的e124/e127默认入口加入`faceEntityToParty`，并在`packages/reforge/src/pal-errand-author.test.ts`锁住命令顺序。该内容变更尚未重建001→006链，旧005/006报告不覆盖这项修复。

### 连续串联故障定位纪律（用户 2026-10-06 明确）

- 连续运行出现新问题时，先停止实现猜测，直接对齐连续日志与对应独立分段 trace，定位第一个可证伪的状态/事件偏离；不得先归因于 NPC 遮挡、寻路或坐标误差。
- 移动等待必须以引擎真实提交事件为驱动：第一阶段使用 `commit:tickSceneInput`；Reforge 玩家输入使用实际 `playerOutcome` 提交处的 `commit:player.input`。`player.pos`/`nudgeParty` 也会包含乘船派生、脚本与被动推离，不能混作玩家按键步；坐标只能作为提交后的断言，不能用固定间隔轮询代替事件。
- 任何新的输入驱动、回放架构或公共观测语义取舍，先列出一手证据、候选方案和风险并请求用户裁决；未经裁决不得扩展方案。
- 以上规则属于本卡持续有效的执行协议，不要求用户在后续消息重复粘贴。
- 长直线只按住一次方向键，转弯/终点才释放；不得逐格按下抬起。位置等待监听真实位置提交，不把朝向/步帧提交算移动。
- 所有落点精确相等，禁止 1.5 格或其它人为误差容限。连续只去掉显式 boundary scope 的操作，正常菜单/物品输入保留。
- 位置提交不是剧情终点；玩家输入路线、脚本走位过程和执行器 finished 后的最终状态分别记录。不得从 `route.steps` 最后一条抽样或下一段首条抽样倒推终点。

### 2026-10-06 终点与 002 出门停顿复核（本轮 build allowed）

- 修改限 E2E，不改游戏移动/触发/剧情内容。独立 `kitchen-journey.mjs` 本来就以 `[131,52]` 且恢复控制为楼梯完成条件；错误位于连续工具将抽样 `route.steps` 当提交路线。
- 一手证据：Game `game-003-2026-10-05T18-53-01-481Z/kitchen-trace.json` 的最后玩家输入提交为 `[1168,1368]`（格坐标 `[122,49]`），脚本随后移至 `[1264,1464]`（`[131,52]`）；Reforge 对应 `reforge-003-2026-10-05T18-53-01-476Z` 也是先 `player.pos [122,49]`，再 `nudgeParty [122.9375,49.3125]` 等中间帧，最终 `[131,52]` 交还控制权。此前聊天中的 `[121,49]` 终点结论撤销。
- 002 Game `game-002-2026-10-05T18-52-06-823Z/report.json`：走廊加载中时间戳 `1791226332739`，恢复 explore 但 fading=true 为 `1791226333428`，fading=false 为 `1791226334119`，左键按下为 `1791226334155`。独立运行的可见停顿包含场景加载/淡入；淡入结束到左键只有36ms。不能把 observer 的 control=true（未包含 fading）直接当可发路线输入。
- 连续重播旧循环在每个已完成语义等待后又全量 sleep 相邻录制间隔，确有重复计时。修复为每段绝对录制时间 deadline，已消耗的等待时间不再叠加。
- 反证/验收：若真实 player.pos/tickSceneInput 包含脚本小数位移，或 finished 后仍为中途状态，本方案拒绝生成路线，不取整/放宽。新测试验证精确位置、第一处分歧失败并松键、同向持续按住、已到终点可立即登记完成、同 phase 的 Enter 不被路线消费；随后独立重录002/003，再连续复跑。尚未完成全量连续验收。
- 本轮实跑：002 `both-002-2026-10-06T05-22-37-379Z`、003 `both-003-2026-10-06T05-23-33-366Z` 均通过；连续 `continuous-both-2026-10-06T05-27-45-798Z/continuous-both.json` 在 `--stop-at 003` 下两进程均 exit0，001/002/003 三个 barrier 均双轨抵达。003 最终 Game `[688,1080]`、Reforge `[89,46,0]` 为同一厨房停点，正常 e19 交互及最后对白均有 action 记录。
- 前一次连续 `05-24-21-114Z` 已正确进厨房，但在 actionIndex22 再检查已消费路线里的旧场景转弯输入而超时；修复为按显式 routeId 一次消费整条路线，不按 phase 批量吞掉对白。该失败保留，不能算通过。
- 当前实现：`committed-route.mjs` 读取有起止 order 的玩家位置提交，独立保留 completion；浏览器订阅先登记确认再按键，连续同方向只 down 一次，第一处分歧报错并在 finally 松键，无坐标取整/误差容差/自动改路兜底。`continuous-route.mjs` 已删除抽样 steps 推导终点的分支，缺 leg completion 直接拒绝并要求重录。
- 当前验证：`pnpm test:e2e-tools` 250/250；严格 lint 3235文件、error/warning/info 全0。这些不代表004→006的新连续驱动已验收；后续要将其尚存的 semantic target/旧导航分支统一到相同的提交路线合同，再重录并双轨连续验证。状态方案/剧情阶段组合仍不开始。
- 文档门未收口：`pnpm check:docs` 的 Markdown 链接检查已通过（006 的本地产物链接改为保留原路径的证据文字），但 testing-docs 报40项 hash/anchor 问题，涉及 `e2e-common-issues`、001/004/005/006、`runtime-active-scene`、`runtime-battle-host`、`runtime-world-owners` 及配套 evidence。不能仅改哈希宣称旧验收覆盖当前代码，须重验相应合同后同步锚点。统一质量门不得报全绿。

### 2026-10-06 共用录制器与连续终点验收（进行中）

- 004/005/006 的路线与002/003统一为 `committedRouteReceipt`：记录实际输入位置提交和独立 completion；转向的真实 down/up 通过 `recordFacingInput` 进入同一 actions 账本。连续工具删除猜门口坐标、起点不符后重新寻路及未录制的手动转向分支，只重播有证据的路线和输入。
- 连续终点新增 `continuous-checkpoint.mjs`：用脱离 live world 的只读快照复用002/003/004/005独立剧情断言，并精确比较独立报告的最终位置/朝向，不以最后路线采样替代最终世界。001核开场真实交接状态，006仍须实际岛屿场景及独立到岛落点；不制造存档、不调用存档 barrier。
- 新004第一阶段红样本：`game-004-story-2026-10-06T05-44-48-711Z/004-latest-trace.json` 中 guest-room 路线后 party 为 `[1248,1104]`，随后e15于order451隐藏并进入送餐脚本；`report.route.inputs` 的serve段为空。录制器原先无条件要求移动提交而拒绝合法的无输入等待。修复仅允许明确 `inputCount===0` 的空路线；有输入无提交仍失败，并加入反控测试。Reforge该次story通过，但整对按失败保留。
- 新录制链：001 `both-001-2026-10-06T05-38-10-765Z`、002（零输入修复后）`both-002-2026-10-06T05-46-31-223Z`通过；003及后续正在重跑。此前05:42/05:43的002/003亦通过，但不拿旧source receipt冒充最终冻结证据。
- 当前工具测试249/249，严格lint3235文件零error/warning/info；不代表004→006新录制器或全六段连续已经通过。状态方案/剧情阶段组合继续延期。

### 2026-10-06 006 录制修复与帧比较门重新开启（当前状态）

- 006 Reforge 的乘船位移曾被错误标为玩家输入，产生 `0,-0.25` 的非整步断言。`inn-trace-plugin.mjs` 现在只在实际处理 `playerOutcome.to` 的写入处标记 `commit:player.input`，并区分 `passive-yield`；挂载派生、脚本位移保持各自来源，不取整、不伪造方向键。受此标签变化影响，002→006 后续连续用报告必须重录，不能用旧 source 名自动兼容。
- 006 第一阶段失败现场 `game-006-2026-10-06T06-04-07-866Z/006-failure-state.json`：party `[1008,1656]`，e59 已从初始位置移到 `[1036,1674]`，实际 `triggerOwnerId=59`、ip1084、苗人头领对白已经开始。旧检查仍用接近前的 target 坐标判断脚本是否预期，因此误报。现使用实际 scene/mode/triggerOwner 确认目标接管，再等待对白完成条件；其它 owner 仍拒绝。删除006 touch中额外的 Chebyshev 范围分支，只保留第一阶段真实加权像素触发公式。
- 下一次 `game-006-2026-10-06T06-08-52-020Z` 已真实到岛（scene15、`[752,808]`），但日志满4MiB，因此按失败保留。494条progress记录占3,662,235字节，主要是每次移动重复整批未变化的持久实体。`errand-observer.mjs` 内部改用无损键差量，导出仍还原完整 `before/state`；4MiB事件上限、8MiB原子快照上限和溢出失败规则不变。反控验证大对象仍触发溢出，正常重复状态能完整还原，包括删除键。
- 修复后006独立两轨均通过：Game `game-006-2026-10-06T06-13-43-469Z`、Reforge `reforge-006-2026-10-06T06-14-41-050Z`。最终Game `[752,808]` 精确对应Reforge `[74,27,0]`；这是独立执行证据，不代表帧比较或全连续通过。
- 撤销先前“仅帧集合相同即通过”的有效性：同一帧集合仍可能顺序错误。中间候选“按1秒停顿切段、250ms取帧窗口”也会混入站立采样，已删除。当前 `movementFrameEvidence` 按每条实际位移的order/位置绑定帧：Game取该提交的换算显示帧，Reforge要求同一位置、下一次位移前的实际render证据。完整有序帧数组比较，不压成集合、不猜循环、不旋转对齐；缺渲染证据为 `evidence-gap`，不拿旧缓存补。
- 中间比较器版本的只读重算证据：`build/e2e/frame-commit-recheck-{002,004,005,006}-20261006.json`。004/005无新差异；002的e60/e61有帧序列差异，e56/e59另有3/1处实际render记录缺口；006有新增render缺口及需重新核对的差异。这些报告保留各自comparatorHash，不代表下一条新观测合同的最终覆盖。旧006帧rationale不能覆盖新粒度。当前第二步未通过，禁止启动全六段连续演示。
- 随后修复真正的render采集缺口：inn/meal/errand三类collector以独立 `actor-render` 记录渲染完成后的 position/facing/visible/frame，不再与actor提交共用差分基线；位置变了但显示帧未变也必须记录。Reforge直接取 `WorldScenePresentation.renderedEntityFrame`，不用gait/override fallback冒充实际画面。比较器现在**两边都只消费真实render记录**，旧报告无此记录就报缺口，不兼容猜帧。隐藏期间无可见渲染的位移不比较画面帧，但原始actor移动/状态记录及其它比较保留。
- 新002实跑：`both-002-2026-10-06T06-20-49-952Z`，Game `game-002-2026-10-06T06-20-50-471Z` 与Reforge `reforge-002-2026-10-06T06-20-50-467Z` 独立均passed，比较failed。四个 `actor-frame-sequence` 为e56/e59/e60/e61，**没有render evidence-gap**。直接反例：e59同位置 `[123,46]`，Game order415/render420/frame9，对照Reforge order451/render456/frame10。e56同时存在位移分步点不一致，不能把所有红项笼统认定为同一个动画根因。
- 下一步直接用上述新002trace核对接管/释放及gait生命周期，先建立真实runtime红测试再修；当前未改运行时，不能把相位重置候选记为已确认根因。修复后须重新录制001–006同版本证据，再恢复连续验证。
- 本轮工具测试255/255通过；严格lint3235文件、error/warning/info全0。此前记录的40项testing-docs hash/anchor问题未闭合，统一质量门仍不得宣称全绿。无下一位 Agent 提示词，Codex继续本卡验证。

- 运行时：状态日志只读取实际提交/呈现边界；后续才允许处理 Reforge motion contact resolver、continuous demo orchestration；不得改变通用 authored movement 的 bypass 语义。
- 内容：`projects/pal/content/scenes/s001.json` e15 随从移动等待、`s005.json` e123 张四转身；不得恢复旧迁移核或增加自动行为承载剧情跳转。
- E2E：连续主线 runner 复用各 fragment 的语义动作/观察器；每段记录 scene 中实际出现的全部实体、位置、朝向、显隐、状态、精灵/帧、对白和控制权；缺少帧/控制权证据直接报 evidence-gap，专项 case 仍独立运行。对比器从状态变化推断接触/节奏，脚本 source 只作解释字段。
- 视觉：两窗口等宽完整画布、同一检查点后再共同前进；检查 002 碰撞推离、004 随从连续移动、005 张四转身。
- 质量：lint/typecheck/docs/content/相关测试零诊断；旧 `pnpm check` migrate 存量必须单列，不以新告警豁免。

## 当前证据锚点

### 2026-10-06 SAVE12 运行现场实施与独立复核（进行中）

- 用户继续授权后，运行现场修复已在本隔离树实现：位置唯一落在同一快照的 `world.script.entityPos`，必需 `sceneRuntime` 保存各场景朝向/定帧/步态、自动移动节拍、分类等待剩余时间、动作时间轴及稳定 owner、自动 continuation 与 chase 认领。离场不后台模拟，普通回场恢复现场后执行当前进场 hook，读档不重跑 hook。当前只支持 SAVE12/content22，旧开发存档须真实重录，不新增兼容路径或作者状态方案。
- 分派范围：`pose_contract_review` 在隔离候选交付 action player/restore 回归，`frame_contract_review` 在另一隔离候选交付 runtime continuation 预检/回归；Codex 逐文件接收并独立核 main 接线。主集成树实现 Owner 始终为 Codex，贡献者不写主树、不合 main。旧三席签字要求不适用。
- 实际 boot 新反例：后台动作已经安装而保存 cursor 仍停旧 play 叶，`/tmp/type-pal-background-atomic-red-20261006.log` 为 index1 对 index2 的业务 AssertionError。修复为只有 awaited action 开放 pending checkpoint，wait:false 安装与叶推进保持同一 mutation；真实 F9 不二次调用 play，相关四文件72项通过（`/tmp/type-pal-background-atomic-green2-20261006.log`）。
- 完成 owner 的后台跨目标动作、restore 复用 activation controller、已兑现 action 重入覆盖新定帧、inactive hide/remove 的目标/owner 边界已逐项复核；main boot 当前26项通过（`/tmp/type-pal-inactive-scene-green-20261006.log`）。无效 loop-layout 候选被真实 current loader 拒绝，已删除本轮新增的不可达 loopElapsedMs/clock 接线和非法测试；不放宽 loader，合法循环动作仍由 action timeline 覆盖。
- 本轮运行态完整质量证据：Reforge typecheck/328文件8760项通过（包含最后5项boot补强，`/tmp/type-pal-save12-runtime-final-20261006.log`）；全工作区typecheck通过（`/tmp/type-pal-save12-workspace-types-20261006.log`）；作者工程294场景/223地图/1934资源通过（`/tmp/type-pal-save12-content-20261006.log`）。先前工具263项和lint3239文件零诊断仅覆盖当时源码，比较器/采集器新候选仍需复跑；现行SAVE12说明已同步，文档门剩当前source-audit锚点/hash更新，不得改写历史动态验收。不能称全仓收口。
- 比较器独立反控确认：真实RF002 e56整轨平移+1格、order341以后统一增加700ms均被旧合同漏过；scene/id渲染去重会丢重返同场景首帧，未呈现的离场前位移还会借到下次访问render。按已批准路线段方案，下一包先补 scene visit、逻辑拍、实际选帧/绘制边界和移动/控制证据，坐标平移、停顿、跨访问借帧必须先红后绿。不更改固定输入、不加入NPC豁免、不宣称新SAVE12的001–006或连续演示已通过。
- 比较器基础补漏：精确核各NPC已观察到的初末坐标；movement frame限定同scene/visit且不得跨scene边界借图；`before:null`是新观察基线，不能与旧visit拼成虚假移动；render证据保留order/时间/位置/逻辑拍。三项初始反控日志`/tmp/type-pal-position-render-red-20261006.log`为3红12绿，visit基线反控`/tmp/type-pal-visit-baseline-red-20261006.log`为1红15绿，最终本文件16/16绿。真实RF002轨迹+1格再次运行，明确报初始[124,45]→[125,45]、最终[137,66]→[138,66]。这些只证明基础漏洞闭合，不代表路线段、停顿时长或新采集器已验收；旧全局第N步帧比较仍需替换。

### 2026-10-06 用户裁决：两项建议均同意，恢复实施

#### 当前采集与比较补强收据

- 新采集记录 scene visit、真实逻辑 tick、每次完成 world draw 的时钟和实际选帧来源。相同姿态用无损 span 保存，展开必须有连续完整的 world-render 时钟；Game 使用实际绘制选帧，RF 仅声明 selected/world-pass-only，不冒充逐实体可见像素。每次 draw 派生记录统一用该边界时钟，finally 清除，防止后续菜单/对白借用旧时间。
- 比较器已删除全局第 N 步错配及 median/burst 阈值放行；不同中间路径目前明确报 movement-leg-alignment evidence-gap，尚待真实命令/路线段对齐，不能称帧比较收口。相同完整姿态路径按逻辑拍比较停留；增加 7 拍会失败，浏览器时间微抖动不代替逻辑节拍。
- 首轮 SAVE12 001：Game `game-001-2026-10-06T14-25-15-614Z` 因共享日志容量耗尽失败（6525 world draws 挤满总计7200条）；RF `reforge-001-2026-10-06T14-25-15-615Z` 因旧 consumer 未按 sceneVisit 分离状态链失败。原始失败报告保留，均不算独立通过，不据此归因产品。
- 已修 consumer：同场景重新 materialize 独立分链，但不伪造路线切场景；同 visit 丢事件仍被反控捕获。逐帧日志改独立60000条（240秒×250draw/s），不挤原状态条目容量；005时钟独立24MiB，原事件4MiB/快照8MiB不变；达到上限仍失败，不丢帧继续通过。用户明确同意容量按需增加，容量不是产品行为门。
- 工具反控与整套回归：`/tmp/type-pal-opening-visit-consumer-red-20261006.log`、`/tmp/type-pal-render-capacity-red-20261006.log` 先红；`/tmp/type-pal-render-capacity-green-20261006.log` 277/277通过。第二轮新001正在录制；001–006新SAVE12链与连续演示仍未通过。
- 第二轮001（14:30:34）和随后002（14:32:23）两轨独立均通过，当前runtime保存/读回证明保留；但随后核对001 e11每次画面出现null/0交替，发现Game完成draw插桩错误地落入entries逐物体循环：statement.end与loop.end同偏移的两次插入顺序导致。该两批Game worldRenders/帧比较信用撤销，不据此修产品。现在统一在同一suffix先关闭循环再记录完成边界，所有继承插件一并修正；真实presentFrame两物体且第二物体抛错的反控先红（2次对1次）、后绿，完整工具仍277/277，日志 `/tmp/type-pal-complete-world-draw-{red,green}-20261006.log`。第三轮001重录中。
- 有效的RF002运行态证据：`reforge-002-2026-10-06T14-32-23-266Z/002.end.save.json` 保存e56/down、e59/up、e60/up；独立新页正式读档的 `002-restored-trace.json` 首次render中e56为 `[137,66,0]`/down/frame0，e59/e60在保存的隐藏位置仍为up。旧版朝向回初值的问题在这次真实读档中未复现；此项不借用无效Game半帧记录，也不替代全链验收。
- 修复完整draw后，新001（14:35:12）、002（14:37:40）、003（14:38:25）两轨独立均通过；004（14:39:00起）两轨story/items/saves六例通过。各段NPC比较仍未通过，不能进入连续。001半帧null/0假差异已消失；仍有e10语义段对齐缺口及待分类的hold差异。独立复核明确Game frameNum所有模式递增、RF worldTick在menu/battle冻结时不递增，不能将原始tick差直接认定为等义时长。另003对比仍混入恢复完成前的RF静态初始化事件，须按真实执行边界分离，不以NPC豁免处理。
- 005新story的RF `reforge-005-story-2026-10-06T14-41-52-816Z/005-latest.trace.json` 只有起始1次restore：s004 visit5离场末次render e84 order2147为 `[102.25,36,0]`/right/frame10；visit7回场首render order4207仍相同，随后继续到 `[106,38.25,0]`。e83同样从离场 `[153,42.25,0]`/up/frame8原样回场。两条实际运行日志未再复现原版RF从旧endpoint和静态朝向重开的缺陷；不据此声称所有帧节奏已一致。
- 源核验候选15文档已独立接收，56个历史revision/versions/candidateSha/runtimeExecution/history/artifacts块逐项保持。`/tmp/type-pal-save12-docs-final-20261006.log` 为48文档工具测试、915Markdown/5202链接及testing docs零问题；`/tmp/type-pal-save12-lint-final-20261006.log` 为3240文件0error/0warning/0info。
- 新SAVE12完整独立链已跑完：001–006两轨story，及004 items/saves、005 guards/saves，共20个独立case全部passed。006两轨真实报告 `game-006-2026-10-06T14-46-02-909Z` / `reforge-006-2026-10-06T14-46-02-892Z`；原始001–006 comparison仍分别有3/7/26/7/24/37项未决（含初始化/时钟/语义段证据缺口，不能等同已确认产品bug数量）。`build/e2e/save12-independent-receipts-20261006.json` 冻结全部真实report路径、SHA256、比较结果与当前关键源码hash。第一步完成，第二步未完成，第三步未运行；不重用旧PASS放行，不改goal为complete。
- 下一包只读设计已收：真实command/activation/owner/target、控制流回边/退出、明确时钟域/实际gate原因，及bootstrap ready后首正文输入前由journey显式标记的story-start完整现场。它为已批准语义路线段合同补证据，尚未实施或接入；不得依靠坐标猜段、同ip重试当新圈、初始化事件冒充正文，也不得把不同暂停原因当豁免。后续须核精确白名单、同一个全局order sink与真实caller反控，再进入下一包实现；不扩大产品移动或作者schema。

- 用户明确答复“我同意按照你的建议来做”：批准本轮修NPC读档/换场景的运行态恢复及必要存档合同变更；离场暂停，回来保留现场继续，不新增后台模拟，不引入状态方案/剧情阶段；批准保留新移动算法，按路线段严格核精确端点、朝向、完整步态/节奏/暂停恢复，允许可解释的中间步数差异，不豁免速度、时序或真实帧错误。
- 以下停止线保留为历史，已被本次人工裁决解除。恢复顺序：真实caller失败回归 → 状态恢复根因实现 → 完整静态/运行时门 → 帧比较器红反控与新规则 → 001–006全新独立双轨 → 同一页面连续六段语义checkpoint与分屏演示。旧PASS不顶替新收据。
- 四向前提：原版内部存储机制N/A（新引擎按干净的当前版本合同实现）；第一阶段UX与最新真实日志见下方002存读、005场景重返证据；当前RF的保存只取live pos、场景重建只用canonical endpoint且朝向/步态未恢复；目标是没有内容命令改变时，精确保留现场与动作进度。替代解释“后台正常推进”“初始采样还没恢复”已由无中途restore、相同continuation及首个render精确回退反证，不扩大为其它NPC差异都同因。
- Codex为唯一实现写入Owner；两项只读独立复核分别检查状态所有权/真实回归入口和帧合同/证据边界，不修改实现文件。先获准编写根因回归；具体保存职责和生命周期接线核定后再落实现，不以测试快照或缓存帧冒充canonical状态。

### 2026-10-06 当前停止线：等待范围与比较规则裁决

- 连续多个goal回合已请求同一组裁决，尚无人工答复。前两轮只读取证分别确认了读档朝向丢失的影响范围，以及无读档场景重返也丢移动现场；本轮复核冻结内容/比较器SHA256全部未变，未发现新的授权或运行中任务。自动goal续跑不视为人工批准。
- 尚待裁决：①本轮是否纳入NPC运行态在存读及场景重建后的恢复，涉及canonical保存/重建合同，但不开展状态方案或剧情阶段；②是否保留已批准的新移动算法，按相同路线段严格核精确起终点、朝向和完整步态，不机械要求两轨中间提交步数相同。
- 两项直接决定下一步实现和验收标准，不能靠重复实跑、更新oracle、放宽坐标或固定NPC豁免绕过。现有安全取证已明确修复边界；没有仍需等待的活进程。卡与长期goal标blocked，完整001–006目标不缩减，不标完成。
- 无下一位Agent提示词；等待用户裁决后由Codex在同一工作树恢复，先补能识别缺陷的失败比较/回归，再实施获准范围的修复及重新独立验收。证据和未提交改动保留。

### 2026-10-06 本轮冻结结论（07:43 UTC）

- 当前内容包含e8显式节拍修复及e59自动目标恢复72；从新001真实前驱重跑到006，六段两引擎现有独立流程均passed，004/005全部专项也passed。严格双轨比较依次仍有2/1/10/1/11/20条未决，不能宣布全面通过；独立验收新发现的读档朝向遗漏也不能由现有PASS覆盖。
- 可复核汇总 `build/e2e/frozen-e8-e59-receipts-20261006.json` 保存两处内容、两个比较器的SHA256及所有精确报告路径。比较批次：001 `07-29-25-286Z`，002 `07-31-07-976Z`，003 `07-32-10-835Z`，004 `07-33-10-628Z`，005 `07-36-10-673Z`，006 `07-43-35-119Z`，均为2026-10-06的`both-<段>-<日期时间>`目录。
- 最新006：Game `game-006-2026-10-06T07-40-53-955Z`、RF `reforge-006-2026-10-06T07-40-55-391Z`均到岛。两边e59对白窗口同为 `[137,72]`、left、期间无移动；只证明本窗口接管成立，20条其它未决原样保留，没有用局部窗口豁免整条轨迹。船体专项findings为空，不代表NPC比较通过。
- 最新质量：`/tmp/type-pal-e59-restored-check-20261006.log` typecheck及326文件8686测试通过；`/tmp/type-pal-e59-restored-lint-20261006.log` 3236文件、0error/0warning/0info；`/tmp/type-pal-e59-restored-content-20261006.log` 294场景/223地图/1934资源通过；E2E工具261/261与docs/testing-docs均通过。未宣称全仓其它包check或E2E整体验收已完成。
- 本轮没有运行六段连续演示、没有提交/推送或改动主工作区；状态方案/剧情阶段组合未启动。新的朝向保存合同缺口须先补实际读回状态比较，再核存档状态职责；尚未改schema/save版本。此前异步询问的按路线段核帧规则仍未收到裁决，不默许为已批准。
- 无下一位Agent提示词；Codex保留当前工作树。下一步需明确朝向持久化的存档合同修复是否纳入本轮，不用给e56正文补定向来掩盖通用存档缺口。

### 2026-10-06 001密道遮挡物节拍修复（build allowed）

- 行为目标：密道遮挡物e8移出与退回时，四个中间位置应逐拍呈现，不能把四次位移压成一次瞬移。这里只修作者正文，不向nudgeEntity或animEntity加隐式等待。
- 四向前提：原版机制移植N/A（二阶段作者编排）；第一阶段 `game-001-2026-10-06T06-59-08-496Z/report.json` matrix中的e8位置提交各约100ms；当前RF同批报告的四步各相隔约0.1ms，且中间位置无render。当前作者真源为s001/onEnter/default/initial中向外repeat4和向内repeat3+末步，repeat均无wait；main.ts的nudgeEntity及animEntity是即时动作，ScriptRunnerCore只有显式wait才等待时间。目标沿用既定八次位移及归位点，每拍间隔100ms，保留末步已有120ms停顿及全部对白。
- 最强替代解释：可能只是collector丢帧或两个位置提交的时间戳采样失真。核验真实canonical flow经compiler+RuntimeScriptRunner产生的指令顺序，并用独立浏览器commit/render核实际间隔；若原内容已逐拍wait，则不准修改正文。旧浏览器同批commit与源码无wait相互印证。
- 白名单：s001开场onEnter的两处repeat补wait100，新增该canonical caller的编排回归，相关证据/剧情说明；不改变移动语义、坐标、帧号、schema、源资产，不改未经核实的其它同形循环。同类候选按入口列明，不能因看起来相似就批量增加等待。
- Codex premise verified / design agree / build allowed；单一Coding Owner继续为Codex。E2E后必须同一比较器确认e8缺帧/节奏红项消失；e10分步帧差异保持独立未决，不借本修复放行001整体。

#### 修复验证与剩余差异

- 只给上述两个repeat各补一条wait100，保持八次位移、坐标、帧指令与末步wait120。`pal-opening-choreography.test.ts` 通过真实编译器和runner验证展开后的每一步接animEntity、显式wait；测试不模拟实际渲染或声称虚拟时钟就是浏览器时间。
- 首版测试适配器误把显式wait当成host.wait处理，而实际显式wait进入host.execute。因此 `/tmp/type-pal-opening-prop-business-red-20261006.log` 和 `/tmp/type-pal-opening-prop-green-20261006.log` 的失败**撤销根因证明信用**，保留原日志；不能用它们冒充有效先红后绿。修正测试后，将仅新增的两条wait临时置0，回归准确失败于期望100实得0，证据 `/tmp/type-pal-opening-prop-contract-counter-20261006.log`；恢复后s001 SHA256精确回到 `49cc5395ad14fb27b8668080a50e8cd3b81ffbf02d1c23c76dd998dd3c484bc1`。定向15测试及完整Reforge typecheck/326文件8686测试通过，完整收据 `/tmp/type-pal-reforge-e8-check-20261006.log`。
- 真实新001：Game `game-001-2026-10-06T07-10-39-994Z` 与RF `reforge-001-2026-10-06T07-10-39-993Z` 各自passed；同一比较器汇总 `both-001-2026-10-06T07-10-39-720Z` 仍failed，但e8全部红项消失，两边均8次位移且每次有实际render，中位位移间隔100.2/100.3ms（包含中间对白间隔，不能把两段拼作连续8拍）。
- e10仍有两类差异，不合并猜测：末段Game `[60,-12.5]→[60,-12]`，RF增加 `[60,-12.125]` 中间步；另在同一 `[60,-17]`，Game order115位移→116转up→117首次render帧6，RF order105位移→107先render帧0→108转up→110再render帧6，两次RF render相隔约15.2ms。后者不是末段步数差异；现比较器只取位移后第一帧，仍须审明完整姿态切换合同，不以按路线切段直接放过。
- `/tmp/type-pal-e8-lint-20261006.log`：3236文件、0error/0warning/0info。内容改动使旧continuation digest失效，002–006正在从此次001重建；旧六段独立全通过不作为修复后全链通过。帧对齐裁决仍待用户；禁止全六段连续演示。

#### 006旧自动豁免撤除（build allowed）

- 已读真实caller `scripts/e2e/boat-both.mjs`：按type/id/field匹配固定文字后，将finding移出未决列表；e59仅凭对白窗口停住就接受整段movement-count/path。背景演员、乘船专项通过或一个局部窗口，不证明其它时段帧/姿态差异合理。旧自动规则未经当前粒度证据验证，不能继续使用。
- Codex核范围：只删除这张自动接受表和过滤，不改collector/产品/帧对齐/输入/剧情；保留e59DialogueEvidence及其窗口布尔结果用于调查。此为撤除无效PASS依据，不是批准新对齐策略。所有原始NPC findings直接影响006比较状态。
- 反证/验收：用同一份既有双轨006报告执行真实wrapper，旧reviewed条目应全部回到未决，不能新增或丢掉原始finding。旧报告只读保留，不重写其历史结论；新006独立链完成后还须重新比较。
- 实测wrapper `both-006-2026-10-06T07-22-46-041Z`：原10条未决+11条自动accepted变为21条未决，逐条type/id/field/game/reforge内容相等，findings与violations相等；没有改写旧报告。E2E工具261/261、docs/testing-docs零问题。

#### e59自动目标误取接管停点纠正（build allowed）

- 四向真值：提取真源 `data/extracted/events/all.json` 的L_1166为0x11 `[32,104,1]`，目标像素 `[1040,1672]`，菱形坐标 `[137,72]`；第一阶段 `event-system.ts` 的tickAutoScripts→npcWalkTo按该目标执行。诊断 `build/e2e/verify-e59-target-20261006.mts` 读取真实L_1166指令，经实际tickAutoScripts运行至游标推进，证实倒数第二步 `[137,72.25]` 仍ip0，最终 `[137,72]` 才ip1，日志 `/tmp/type-pal-e59-target-primary-20261006.log`。
- 当前RF目标为 `[137,73]`，由提交05761fbd4把原本72改为73；当时依据的是对白接管停点，而不是自动命令完成目标。最新Game006对白停在 `[137,72.25]` 且autoIp1166，RF停在73；两边均左朝向且对白期间稳定，因此当前差异不证明接管失效，却推翻“对白停点就是路线终点”的旧前提。此前oracle差量证明仅证明改了一个参数，**不能证明该参数改动正确**，撤销其产品前提信用，保留历史证据。
- 最强替代解释：73可能是第一阶段完整路线终点，72是解码偏差；实际第一阶段caller在读取真源后完成到72已经推翻该解释。本任务只恢复作者目标72，保留take/release与显式left；不改速度、移动机制、触发范围，不把两轨在不同时间触发后的中途停点强行改成一致。
- Codex premise verified / design agree / build allowed。白名单s003/e59/auto/legacy-001唯一目标row、对应内容合同和四个该流oracle值及证据。先让目标合同对73失败，再恢复72，实际compiler/runner差量核验后更新oracle。004当前批次结束后不继续生成将过期的005/006；内容冻结后重新001起链。
- 目标合同 `/tmp/type-pal-e59-endpoint-red-20261006.log` 精确失败于期望72、当前73；恢复后 `verify-e59-oracle-restoration-20261006.mts` 从现有合同提取实际observe函数，经真实compiler/runner执行全部四组scenario。整张s003只改一个目标row，输出trace只变该move参数，时间与完成cursor不变；日志 `/tmp/type-pal-e59-oracle-restoration-20261006.json`。四hash恢复为 `46ae1a0ef037dfb488aa063463c27245e71933d645452790ddeb40aa2ac59052`，不是因断言红就盲改oracle。
- 中间e8-only批次：002 `both-002-2026-10-06T07-19-56-294Z` 与003 `both-003-2026-10-06T07-21-37-527Z` 各自两轨独立通过，比较仍failed；004 `both-004-2026-10-06T07-23-27-004Z` 六个story/items/saves独立通过，比较仅e26切场景前render缺口。此后e59目标又恢复72，以上不能作为最新内容版本的完整独立链；新001已启动。

### 2026-10-06 002→003真实朝向丢失（只读取证，未实施存档模型变更）

- 最新RF002 `reforge-002-2026-10-06T07-31-08-487Z/inn-trace.json` e56末次位置order781为 `[137,66]`，order786实际render为down/frame0。其endWorld、restoredWorld、postResumeWorld均仅保存该实体的entityPos及behavior，不含朝向。
- 真正消费同一存档的RF003 `reforge-003-2026-10-06T07-32-11-381Z/kitchen-trace.json`：e56 order14为静态初值 `[124,45]`/left，order44恢复位置为 `[137,66]`/left，order61实际render仍left/frame3。位置恢复但朝向没恢复；不是主角按键偏差或NPC挡路。
- 同一个002用例自己的 `002-restored-trace.json` 也直接记录order64为 `[137,66]`/left/frame3，不必依赖003才复现。这里的actor-render是本次渲染循环选择的精灵帧，不等于该NPC在视口内有可见像素：`WorldScenePresentation.sprites` 在裁剪前登记帧。已查看 `002-end.png`，该NPC确实不在画面内，主角在 `[126,46]`；endFrame与restoredFrame哈希同为 `2a4d896f4a9209892c56b580e0853576147960542524d61bf3e0e66729eef2c9`。因此截图一致并未否定NPC运行态丢失；之前“首个画面朝左”的表述收窄为“首个渲染循环的朝向/选帧已经朝左”。
- 源码确认：`main.ts:3960` 运动提交只赋当前live实体facing；`main.ts:2349` 显式setEntityFacing同样只写live实体。`script-project-core.ts:192` canonical运动终点只写entityPos；`author-script-core.ts:87` WorldScriptState没有实体朝向字段。存档world哈希相同不能证明恢复后的实际NPC姿态相同，旧独立save通过不覆盖该合同。
- 最强替代解释“只是初始化采样，首个画面前会恢复down”已被order61的实际render推翻。必须先补读档前后实际姿态比较与可复现反例，再核定canonical保存/重建职责；不能在e56正文补固定朝向、取frame缓存或使用状态方案掩盖。此项涉及存档/公开状态合同，当前没有实施schema或版本切换，单列待定范围。

#### 同批读档影响范围复核（只读取证）

- 诊断脚本 `build/e2e/audit-restore-pose-20261006.mjs` 只读冻结的真实trace，输出 `build/e2e/restore-pose-scope-20261006.json`，包含各输入SHA256、restore commit、首个提交后render order及相关实体原始状态。它不是新增验收规则，不改写旧报告，也不把不同采样时刻当同一个存档瞬间。
- 002同一读档还丢失e59的up→right、e60的up→down；两者与e56一样，坐标精确恢复、auto cursor已经completed。三者均不是自动行为读回后又走了一步。第一阶段相同002收据没有这三名实体的朝向变化；其e62帧1→0属于仍活动的动画候选，不据此认定存档错误。
- 005 saves的e84保存位置为 `[104,36,0]`，保存前最后render order1783为right/frame9，读回首个render order13在相同位置为down/frame0；到order20移动到 `[104.25,36,0]` 后才转回right/frame10。最终快照朝向相同会掩盖这个首帧重置，不能只比较读回后较晚的final。
- 005的e83不能以“存档前trace最终位置”指控读档退步：payload保存 `[139.53862696519684,34.77253930393692,0]`，读回order11精确恢复该值；保存后的页面又移动到 `[139.55150262026245,35.03005240524922,0]` 才结束trace。原日志同保存坐标的order1776选frame2，而读回选frame0；这是待核的动态步态相位差，现有数据未给出原子存档瞬间的相位，不强行定性。
- 同批003、004 carry和004 end在已采集的当前场景实体中，没有新增朝向/显隐/所选渲染帧差异；仅此范围，不表示世界全量状态已验证。001没有独立保存的读回actor trace，006没有结束读档配对，均不能据现有收据声明完整读回姿态通过。
- 保存源码进一步核实 `main.ts:4871` 的真实同步capture只复制实体pos；`main.ts:1347` 的进场/读档投影恢复位置并清gait，不恢复实体朝向。根因范围是运行态保存/重建，不是e56专用内容。修复存档合同与新的帧对齐规则仍待用户裁决；本轮不修改产品、schema、驱动或公共观测语义，不放行连续演示。

#### 005无中途读档的场景重返丢失现场（只读取证）

- 进一步推翻“只修存档朝向就覆盖运行态丢失”的范围假设：`reforge-005-story-2026-10-06T07-36-11-288Z/005-latest.trace.json` 整段只有开头一次restore。s004→s005→s004途中没有restore，e84离场前最后render order646为 `[102,36,0]`/right/frame9；返回首个render order1598却为 `[98,36,0]`/down/frame0，随后order1606从 `[98.25,36,0]`/right/frame10重新走同一路段。
- 真实auto continuation在离场前、重新materialize后保持同一cursor：default / initial / loop body index11，指向走到 `[106,36,0]`；此前已经完成的路段终点是 `[98,36,0]`。正文没有要求退回该点，s004进场hook只调用e83的报信trigger。`script-project-core.ts:176` 的moveEntity只在终点写canonical entityPos；`main.ts:4462` teardown取消未完成运动，`main.ts:894`替换活动场景；`runtime-project-view.ts:145`从canonical实体定义克隆，`main.ts:1358`只重放已有世界位置/门控。这里丢的是未完成移动的现场位置和朝向，不是输入误差。
- 只读可复核诊断 `build/e2e/audit-scene-reentry-20261006.mjs` → `build/e2e/scene-reentry-pose-20261006.json`，保留两个引擎同一005 story的原始order/source/state与SHA256，并断言途中没有restore、RF cursor相同及上述精确位置/帧。Game对应e84离场render order714为 `[1032,1092]`/right/frame9，返回order1344为 `[1036,1094]`/right/frame11；没有在本诊断强行对齐两轨经过时间或步数。
- 结论边界：render记录不保证该NPC在淡入期间已有可见像素；本证据也不证明e84造成先前连续主角路线失败。尚未决定离场NPC应暂停还是继续模拟，不能把该产品选择混进修复；但仅补save capture字段不能处理这条无读档路径。下一步范围裁决须涵盖NPC运行态的场景重建与存读，而不是孤立补e56朝向。
- 005/006其余朝向项不是全部同因：e19/e124/e127/e35/e36的第一阶段交互含`scene-system.ts:162`显式调用的search转向；RF相关trigger没有对应的面向来访者步骤（e36已有剧情中down→left，不包含随后再交互的left→down）。不把这些内容缺口归给读档，也不按测试路线硬编码一个方向。e116移动转向及e123跨场景初始朝向仍保留未决，不以这份诊断整体放行。

### 2026-10-06 冻结录制复核与比较覆盖补漏（build allowed）

- 当前冻结录制：001 `both-001-2026-10-06T06-39-50-594Z`、003 `both-003-2026-10-06T06-44-05-744Z` 的既有门通过；002 `both-002-2026-10-06T06-41-29-653Z` 两轨独立通过，仍仅 e56 帧对齐未决。004 `both-004-2026-10-06T06-44-59-032Z` 的六个独立 story/items/saves 均通过，但比较未通过。005/006继续独立录制，不启动连续演示。
- 004新缺帧的一手证据：Game story trace的e26在order761提交 `[1332,1050]`（canonical `[107.25,24]`），order764已经切到s003，两者之间没有world draw；不能用提交中的计算帧5冒充实际呈现。这是切场景前未呈现的提交，不是丢了方向输入，也未据此修改产品或放行帧比较。
- 覆盖审计纠正：001现有matrix只核替身姿势/机关位移和时序，没有李大娘完整移动帧比较；003 wrapper没有调用NPC比较器，collector也没有独立actor-render；005比较器只选了e123，虽然scene映射包含其它相关NPC。这些既有PASS只保留原门证明范围，撤销“完整帧比较已覆盖六段”的信用。
- Codex准入：先补001/003独立渲染/控制记录、接入现有严格帧比较器，并补齐005已注册相关NPC；不改变e56对齐算法，不把切场景缺帧直接豁免，不修改输入、产品移动或内容。反控必须证明被遗漏NPC的帧序列错误会使比较失败。实现后新采集器需实跑，不把旧trace补写成新证据。
- 质量债独立复核：`s003/e59/auto/legacy-001` 四个旧oracle哈希确实仅对应已批准的目标row72→73。诊断实际执行原测试的compiler/runner，旧源码复现旧hash、当前源码仅一条move参数变化，时间/完成游标不变，证据 `build/e2e/e59-oracle-delta-20261006.json`；四hash已更新。完整Reforge typecheck通过、8685测试通过；当次仍有jsdom pause诊断，随后修为使用该测试文件已有媒体边界fixture，定向7项零诊断通过，完整门待重跑。
- 文档锚点经当前caller/oracle核读后同步，`/tmp/type-pal-docs-frozen-20261006.log` 的docs/testing-docs均零问题；只刷新source-audit，不升级历史runtime验收结论。无下一位Agent提示词，Codex继续本卡。

#### 补漏后的实跑与当前剩余项

- 005冻结独立收据 `both-005-2026-10-06T06-50-16-337Z`：story/guards/saves六个子进程均passed；其旧版比较器只检查张四，因此汇总PASS不具有其它NPC帧覆盖信用。006独立Game `game-006-2026-10-06T06-54-23-578Z`、Reforge `reforge-006-2026-10-06T06-54-24-969Z`均passed；新比较 `both-006-2026-10-06T06-56-22-472Z` 为needs-review。至此本轮相同产品源码的001–006独立流程均实际走通，但第二步未通过。
- 001/003已加入独立actor-render及控制记录，001使用跨actors/renders/controls/pages的全局order；两wrapper均调用NPC比较器，比较抛错会把汇总标failed。005纳入原scene映射中遗漏的e19/e62/e83/e84/e124/e127。三项回归先红（日志 `/tmp/type-pal-frame-coverage-red-20261006.log`），修复后全工具261/261通过；不是只加单测而未接真实caller。
- 001首个新采集候选 `both-001-2026-10-06T06-56-43-698Z` 的RF独立失败：s000启动放置早于runner初始化，新control读法触发TDZ；实际插桩函数回归先红后绿，改为客房阶段才读取已初始化的控制源，保留失败报告。修正后 `both-001-2026-10-06T06-59-08-243Z` 两轨独立passed，比较failed；003 `both-003-2026-10-06T07-00-51-457Z`同样独立passed、比较failed。
- 001无图像的出口e3没有动画帧：Game资源加载 `bootstrap.ts` 仅加载spriteNum>0，RF该实体sprite=null。比较器只在两边所有观察都明确sprite=0/null时不要求帧；缺失sprite字段仍算未知，出现任何实际sprite仍须帧证据，显隐/朝向等状态继续比较。反控证明非图像触发器显隐错误和一侧出现图像均不能漏过，不增加按ID豁免。
- 当前只读重算保存在 `build/e2e/{001,003,005}-npc-coverage-review-20261006.json`，各自含comparatorHash及原报告路径。001新增已确认内容缺陷：e8移出四步、退回四步，Game每步约100ms，RF各四步同批约0.1ms；s001 onEnter body82、111的repeat没有等待，中间渲染缺失。当前未修改内容，待先补真实runner节奏回归再修；不能把原matrix“8次位移、终点回原位”当动画连续证明。
- 003新增e19/e56朝向、e56移动帧与提交路径差异，e59/e60/e61还有初始化提交差异；005新增e19/e124/e127朝向，以及e83/e84朝向/路径/帧证据差异，尚未全部归因。001 e10及002 e56涉及新旧分步路线的帧对齐。004保留切场景前未绘制提交，006保留帧缺口、e59对话窗口及到岛e203帧差异。没有把这些项归入泛化“可接受”或恢复连续演示。
- 本次补漏只接通原有移动帧序列合同，不宣称所有非位移动画、所有实体图像资产及渲染裁剪情况已完整验证；这些采集/比较适用边界仍需核完。e56对齐规则的用户裁决仍未收到，不借继续执行默认为已批准。
- 完整Reforge已在媒体fixture修复后再次执行：`/tmp/type-pal-reforge-check-final-20261006.log`，typecheck通过、325文件/8685测试通过，无此前pause/stderr诊断。严格lint首次仅报common-issues evidence一处JSON格式，修格式后重跑；docs须与本次opening-both新增门的source-audit哈希一并复验。当前未宣称全仓统一质量门或任务收口完成。
- 本轮复验收据：`/tmp/type-pal-tools-frame-final-20261006.log` 261/261；`/tmp/type-pal-lint-frame-final2-20261006.log` 3235文件、0error/0warning/0info；`/tmp/type-pal-docs-frame-final-20261006.log` docs/testing-docs通过；`/tmp/type-pal-content-frame-final-20261006.log` 作者工程294场景/223地图/1934资源通过；`git diff --check`通过。这些质量结果不覆盖尚未修复的E2E红项，也不等于全仓全部包check完成。
- 下一步先修已有直接证据的001机关批处理节奏，再核003/005朝向差异的真实交互caller及初始化边界；先建立失败回归，不改原版移动、不扩容差、不用名单豁免。e56路线分步的帧比较规则继续等待用户裁决；状态方案/剧情阶段和六段连续演示均未启动。无下一位Agent提示词，Codex保留当前工作树继续推进。

### 2026-10-06 当前收据与 e56 比较对齐待裁决

- 自动步态暂停修复后，新002 `both-002-2026-10-06T06-27-07-792Z` 两条独立旅程passed，e59/e60/e61实际渲染帧序列相同；e56仍报差异。没有据此宣称002比较或六段连续通过。
- 继续核出观测器缺陷：原 `render()` / `presentFrame()` 的finally钩子在保留旧画面的early return后仍记录 `render:world`，可以把新的实体坐标与缓存的旧帧配成一条假渲染。旧源码实执行反例为 `build/e2e/render-hook-counter-20261006.json`：保留旧帧却产出 `before:render,render:world`。修复只改E2E插桩：Reforge在 `worldPresentation.renderWorld` 成功返回后、Game在world entries全部绘制后采集；不改变产品渲染流程。新测试执行真实函数，覆盖保留帧、绘制失败及实际完成。
- 正确采集点的新002为 `both-002-2026-10-06T06-34-58-773Z`，Game `game-002-2026-10-06T06-34-59-278Z`、Reforge `reforge-002-2026-10-06T06-34-59-277Z` 独立passed；比较仅e56的 `actor-frame-sequence/movement-frame` 未通过，无render缺口。苗人三名帧序列继续通过。
- e56第一处真实分步差异：Game从 `[121,48.375]` 直接到 `[121,49]`；Reforge先到 `[121,48.75]` 再到 `[121,49]`。后续楼梯Game24次提交、Reforge21次，两边均精确到 `[131,52]`，步态都按 `10,9,11,9` 循环。六段终点均相同，逐段帧和order见 `build/e2e/e56-segment-evidence-20261006.json`。不能按全段第N次位移比较不同位置的帧，也不能省略步态检查。
- 真源核定：`SCRIPT-AUTHOR-2-readable-inn-choreography.md` 的目标向量归一化、每拍有界和六路段方案已批准，提交 `422bb561a` 引入；不得回退为旧引擎任一轴接近就整体吸附。当前不改移动算法、不加入e56豁免、不降低坐标精度。
- 已向用户请求比较规则裁决：保留已批准的新走位，按相同路线段对齐，严格核起终点/朝向，并逐帧核完整步态与暂停恢复，避免按全局移动序号错配；或先展示差异后裁决。未收到答复前不实施此规则调整、不标002 parity通过。当前卡仍rework，不变更长期goal状态。
- 当前定向运行时回归47/47、E2E工具256/256，严格lint3235文件，0error/0warning/0info。完整Reforge的typecheck通过，测试8681通过/4失败（325文件中1失败）：`pal-unified-steps-content.test.ts` 的同一 `s003/e59/auto/legacy-001` 在四组seed/environment下期望hash `46ae1a...`、实际 `04e3a3...`；已核提交 `05761fbd4` 将该自动方案目标row72改73，但旧oracle尚未完成对应的差量核验，因此本轮不盲更新hash。原日志 `/tmp/type-pal-reforge-check-20261006-render.log` 另有jsdom的 `HTMLMediaElement.pause` 未实现输出，保留原样。之前testing-docs锚点债仍未闭合，不能宣称统一质量门通过。
- 无下一位 Agent 提示词；Codex保留本卡，等待上述帧比较对齐规则的用户裁决后继续。没有将裁决等待标成长线goal的暂停或完成。

### 2026-10-06 自动步态暂停的运行时根因（build allowed）

- 用户可见目标：显式take/release暂停及恢复自动走位，不把已经进行中的走路帧循环重置为第一步。仍然只暂停被接管实体，不增加对话全局冻结。
- 四向证据：原版机械实现不移植（N/A，遵守READ-FIRST铁律6）；第一阶段与当前Reforge的实际画面证据为上一节06:20新002trace，e59同落点frame9对frame10；当前运行时 `takeByScript` 清gait，`WorldMotionRuntime` 的authorityChanged回调又清gait，`settleEntityGaitsForTick`在接管等待期间再次清gait；目标合同为E6设计§2的“暂停该实体，release后恢复”。
- 最强替代解释：内容显式重置帧、渲染缓存误读、不同输入导致暂停落点不同。真实boot测试只执行wait/take/wait/release与一条自动move，仍在take后把phase3清成undefined，独立于render采集已证明运行时相位被清理。红测试 `main.auto-pose-authority.test.ts` 的 `in-flight automatic walk`，日志 `/tmp/type-pal-auto-gait-red-20261006.log`。先前“新collector已排除缓存误读”结论过强：后续发现render的early return仍冒充完成，已按上一节修复并重跑。
- Codex核准修复范围：将权限变更与自动步态相位清理分开；暂停时保留auto相位，渲染仍呈现停止状态；实际脚本位移/姿态新owner、终点及activation结束继续各自收尾。先验证真实脚本caller暂停不移动、恢复继续相位、终点清理及既有pose authority测试，再重跑002。不得以修改内容帧号、比较器容差或全局冻结替代此根因修复。

### 2026-10-06 当前修复范围（build allowed）

- 004 帧序列红样本先于运行时修复已复现：旧 Reforge e26 自动回放的实际渲染帧只有 `4,3` 循环，比较器输出 `actor-frame-sequence`；Game 同段为 `4,3,5,3,4,3,5`。证据为 `build/e2e/reforge-004-story-2026-10-05T17-55-36-909Z/004-story.trace.json` 对 `build/e2e/game-004-story-2026-10-05T18-00-04-451Z/004-story.trace.json`。
- 修复落点：`WorldScenePresentation` 暴露实际 `renderedEntityFrame`；NPC 合同比较按真实渲染帧、移动分段和循环相位比较，不再只比较坐标/是否变化；e15 明确 `takeEntity(e26)`/`releaseEntity(e26)`；Reforge 自动 `stepEntity` 在自动行为存续期间保留 gait 相位，行为结束清理；`animEntity` 清理旧定帧后再推进动画。修复后 e26 实际帧为 `4,3,5,3,4,3,5`，同一比较器 `findings=[]`。
- 修复后 004 story 双轨独立均通过：Game `build/e2e/game-004-story-2026-10-05T18-15-24-750Z`，Reforge `build/e2e/reforge-004-story-2026-10-05T18-29-14-650Z`；004 NPC 状态/帧分段比较通过。由于 e15 内容变更使 continuation digest 失效，Reforge 001→003 已从新 001 前驱重建：`reforge-001-2026-10-05T18-12-45-615Z`、`reforge-002-2026-10-05T18-14-01-333Z`、`reforge-003-2026-10-05T18-14-44-246Z`。
- 当前仍未收口：001–006 全量独立新报告尚未因本次 004 内容/运行时修复全部重建，005 连续 live runner 仍在单独排查；第三步连续演示不得宣称通过。
- 2026-10-06：按用户要求在实际渲染帧/分段帧比较器更新后，从当前 001 前驱重建并重新完成 001–006 双轨对比，六段均 `passed`：001 `both-001-2026-10-05T18-42-06-262Z`、002 `both-002-2026-10-05T18-52-06-301Z`、003 `both-003-2026-10-05T18-53-00-908Z`、004 `both-004-2026-10-05T18-53-46-715Z`、005 `both-005-2026-10-05T19-23-47-313Z`、006 `both-006-2026-10-05T19-29-22-343Z`。002/006 的绝对帧索引差异经朝向组内局部帧归一化后消失；006 隐藏实体、挂载前采样和交互前站位差异均有边界证据并按既有 rationale 接受。独立第二步现已完成，第三步连续串联仍待重新启动和验收。
- 2026-10-06：第三步用上述当前六段报告重建 `final-story-tape.json` 后重跑；连续执行在 005 失去双轨同步并触发 watchdog。Game progress 停在 `actionIndex=18 / Enter interact e19`，Reforge 停在 `actionIndex=10 / ArrowLeft`，Reforge 运行态已在 s003 `[133,63]` 而 Game 仍在 s001；证据分别为 `continuous-game-2026-10-05T19-13-39-973Z/continuous-progress.json`、`continuous-reforge-2026-10-05T19-13-39-979Z/continuous-progress.json`。第三步保持 `rework`，不得宣称连续通过；当前阻塞属于 004→005 live 内存边界/route tape 起点复用，不是独立片段或帧比较失败。
- 2026-10-06：为 005 `route.legs` 增加真实结束场景/位置，并让连续 tape 绑定最终释放键；同时连续 replay 对新 leg 目标改走语义寻路并补 Reforge 交互目标定位。新尝试仍在 005 aunt leg 卡住：Reforge 当前 `[88,55]`，目标 `[89,46]`，未进入 e19 交互；Game 已到 `[688,1080]` 并等待 `Enter interact e19`。本次具体证据为 `continuous-reforge-2026-10-05T19-57-31-798Z/continuous-progress.json` 与 `continuous-game-2026-10-05T19-57-31-798Z/continuous-progress.json`；静态 planner 能生成 8 步 ArrowUp 路径，但 live 浏览器未提交第一步，第三步继续 `rework`。

- 001–004 连续候选已实跑至四个双轨 checkpoint：`build/e2e/continuous-both-2026-10-05T14-28-53-424Z/continuous-both.json`；这只证明前四段，不证明六段完成。
- 005/006 独立驾驶器曾把方向键只写入 `route.inputs`，而 002–004 同时写入 `route.inputs` 与 `actions`；这是 E2E 报告格式不一致，不是剧情差异。修复落在 `errand-journey.mjs`/`boat-journey.mjs` 的真实 `onInput` caller，统一把路线事件写入两处；连续提取器继续只消费统一后的 `actions`，不手填路线。
- 005/006 修复限定 E2E 工具：不改产品移动/触发、内容、schema 或独立测试；报告重跑后再重建 tape，并从 001 开始连续验证。
- 最强反证：若缺失路线已存在于 `actions`、trace 与报告不匹配或顺序无法唯一复原，则拒绝生成，不能猜坐标补齐。回归核路线/对白插入顺序、重复输入拒绝及缺证据拒绝；浏览器从 001 新故事连续运行到 005。
- 用户停止线：遇到无法确认的新卡点，报告实际现象和证据，询问用户意见；不继续猜改。状态方案/剧情阶段组合仍不进入本轮。

- 002：`build/e2e/game-002-2026-10-04T03-40-12-965Z/inn-trace.json`、`build/e2e/reforge-002-2026-10-04T03-40-12-955Z/inn-trace.json`
- 004：`build/e2e/game-004-story-2026-10-04T03-42-13-225Z/004-story.trace.json`、`build/e2e/reforge-004-story-2026-10-04T03-42-13-209Z/004-story.trace.json`
- 005：`build/e2e/game-005-story-2026-10-04T03-45-14-683Z/005-latest.trace.json`、`build/e2e/reforge-005-story-2026-10-04T03-45-14-643Z/005-latest.trace.json`

## 推进记录

- 2026-10-04 Codex：build allowed；用户已明确主线演示只跑 story，不展示专项分支。
- 2026-10-04 Codex：按用户要求暂停三处内容修复，先落状态优先比较器。`scripts/e2e/npc-transition-contract.mjs` 从 trace 中自动枚举两边实际出现的全部 actor，统一像素/瓦片坐标、位置位移/节奏、显隐、状态、朝向、帧/精灵、对白增量和控制权；接触由“稳定后的小位移 + 邻近可见 NPC”推断，不读取脚本函数名；缺帧/缺控制权记为 `evidence-gap`。`npc-transition-contract.test.mjs` 5 项合同测试通过；001–005 旧 trace 作为故意红样本时，002 的 e56 朝向/接触、004 的 e26 位移/状态/帧差异、005 的 e123 朝向及其它观察差异均被识别（所有 `findings` 都是未收口项）。三处内容仍未修改。
- 2026-10-04 Codex：当前 canonical 独立重跑证据：001、002、003、004 story、005 story 均可独立走通；002 状态门禁已抓到 e56 朝向差异，004 在加入 e26 nudge 间隔后移动节奏收敛，005 张四朝向门禁收敛。新增 `continuous-story.mjs`：六段 story registry、`load:false/save:false` 连续边界上下文、双轨 barrier、story-only action 提取；纯合同测试通过。连续 runner 尚未完成真实浏览器串行演示，任务保持 build。
- 2026-10-04 Codex：连续 replay runner 已实跑通过：`build/e2e/continuous-both-2026-10-04T08-01-44-889Z/continuous-both.json`，两引擎均 code 0，001–006 六个 barrier 均收到 game/reforge；每段各有 checkpoint PNG 与 `continuous-report.json`。headed 演示窗口使用半屏全高外框与完整 8:5 画布，用户可见验证仍待确认；当前 runner 已支持 `--hold` 停在 006。
- 2026-10-04 Codex：E2E 工作已迁入独立 worktree/分支 `codex/e2e-continuous-20261004`，避免共享 checkout 抢分支；worktree `pnpm test:e2e-tools` 229/229、严格 lint 3221 文件零诊断通过。该分支 headless 连续 replay 再次通过：`build/e2e/continuous-both-2026-10-04T09-08-08-203Z/continuous-both.json`；headed runner 已支持 756×982 左右窗口、756×900 viewport、完整 8:5 画布与 `--hold`。
- 2026-10-04 Codex 独立复核纠正：上述连续 replay 的 PASS **无效，不得作为本卡或001–006连续覆盖证据**。`continuous-report.json` 的第一阶段006仍在scene2，RF006仍在s001；002截图仍是开场房间。旧 runner 只验按键消费/进程code0，没有真实语义终点。现已加场景边界及控制权前置失败门；真实重跑进入002/003后仍失败，本卡转 rework，不以放宽坐标误差代替完成。
- 2026-10-04 002新红样本：`build/e2e/game-002-2026-10-04T10-06-57-076Z/inn-trace.json` 对照 RF `reforge-002-2026-10-04T10-06-57-075Z/inn-trace.json`：第一阶段仅一格推离，RF连续三格推离。根因是作者auto走位后接触半径误用L1格距<=1.5，涵盖并未接触的两侧格。比较器的1000ms dwell过滤也漏掉同次接触后两次推离；新增真实三次接触序列反控已先红后绿。
- 2026-10-04 002局部修复实跑：接触按资产坐标加权像素足迹<=12判断，保留authored bypass。`game-002-2026-10-04T10-17-10-115Z` / `reforge-002-2026-10-04T10-17-10-120Z`均仅e60导致 `[126,45]→[126,46]` 一次位移；整段仍为red（e56首次转身缺right）。不宣布002全面验收通过。
- 2026-10-04 连续执行缺口：统计许可层吞键、菜单证明动作过滤不成对、001正文尚未真正结束就进入002、route只依赖录制时长且缺005/006方向输入。已验证独立第一阶段002正常持续按住：房间11次、走廊17次实际位置提交。下一步须让连续模式复用现有实时片段执行体，禁用边界load/save；不继续堆坐标容差/补按键的replay特例。
- 2026-10-04 主菜单适配：启动前注入同一画布fit规则；双轨 `continuous-title.png`（`continuous-game-2026-10-04T11-36-46-474Z` / `continuous-reforge-2026-10-04T11-36-46-433Z`）已目视确认完整且同尺寸。原生半屏窗口位置/首帧仍需整体headed复核，截图不冒充窗口布置证明。6012编辑器未关闭。
- 2026-10-04 连续 runner 当前改动：route 段开始消费实时 `navigateInnRoute`/当前页观察，而不是只按录制时长；目标位置只作语义门，失败仍保留。定向合同、Reforge typecheck、严格 lint 已通过；连续六段真实 run 尚未通过，不能标 done。
- 2026-10-04 按用户要求改走逐碎片双轨：001 当前 canonical 独立通过（`both-001-2026-10-04T13-07-55-771Z`）；002 正文/保存读回/接触推离通过，但比较器仅保留 e56 朝向红项（`both-002-2026-10-04T13-09-49-436Z`）；003 独立通过（`both-003-2026-10-04T13-12-43-584Z`）；004 story 及其专项分支均通过，story NPC 对比 `findings=[]`（`both-004-2026-10-04T13-14-27-243Z`）；005 story 及其专项分支均通过，NPC 对比 `findings=[]`（`both-005-2026-10-04T13-20-13-146Z`）。006 当时只有 Reforge 旧独立报告，待第一阶段适配器补齐；该历史状态已由下一条记录纠正。
- 2026-10-05：补齐当前 worktree 的第一阶段 006 独立执行器与 006 双轨比较器。两轨独立正文均通过（第一阶段 `game-006-2026-10-04T18-44-27-288Z`、Reforge `reforge-006-2026-10-04T19-17-06-374Z`）；比较 `both-006-2026-10-04T19-18-45-307Z` 为 `passed`。rider mount、主角锚点、骑乘朝向和完整 state/frame trace 均已收敛；第三步连续串联进入编排器门禁。
- 2026-10-05：修复 Reforge continuation digest 根因：`packages/reforge/src/main.ts` 改为对完整 canonical scene 集合计算 digest，不再使用当前页面懒加载子集；该修复使新页真实读回链 001→005 可继续通过。运行时报告/证据文档的旧 source hash 尚待门禁同步更新。
- 2026-10-05：新增显式 rider mount（e116 搭载 e117）与当前载具锚点/朝向编排，006 双轨比较已 `passed`；连续 story replay 仍在 003 跨场景边界失败，失败点属于 replay route 编排器，未把它作为产品剧情通过。
- 2026-10-05：按三步门禁复核后撤销 006 比较器对缺日志/背景朝向的自动放行；严格状态日志仍发现 e59 离场朝向序列差异，006 当前回到 `needs-review`。连续 replay 的第三步仍停在 003 跨场景路线，未进入视觉演示验收。
- 2026-10-05：补强连续门禁：002 检查三名苗人均已隐藏且队伍落点为 `[126,46]`；路线 tape 按实际 `phase` 绑定 leg，避免把同场景不同步骤误当跨场景；新增 s003↔s001 边界处理。真实连续重跑仍在 003 普通路线触发错误场景，故第三步保持未通过；独立对比不受连续失败反向放行。
- 2026-10-05：按用户重新确认的三步顺序重跑当前候选。第一步（双轨独立）001–006 均通过：001 `both-001-2026-10-05T00-46-55-272Z`、002 `both-002-2026-10-05T00-48-39-201Z`、003 `both-003-2026-10-05T00-49-43-796Z`、004 `both-004-2026-10-05T00-50-26-275Z`、005 `both-005-2026-10-05T00-53-38-823Z`、006 独立报告 `game-006-2026-10-05T00-58-18-971Z` / `reforge-006-2026-10-05T00-58-18-961Z`；004/005 的专项分支也在同一批次通过。第二步（双轨差异）001–005 均 `passed`；006 `both-006-2026-10-05T01-00-22-527Z` 为 `needs-review`，因此第三步（同一 live page 连续串联）明确禁止启动。
- 2026-10-05：006 差异初裁（只依据独立 trace，不改剧情内容）：`e59` 在两轨从同一 `[137,76]` 出发，但第一阶段在场景边界前只提交到 `[137,73]`，Reforge 继续到 `[137,57]`，判定 **fix（真实可见路线/时序差异）**；`e60/e61` 第一阶段始终隐藏，Reforge 在场景 materialization 先出现 state 2 后隐藏并有 3 次位置提交，判定 **fix（隐藏实体初始化/证据边界需修）**；`e116/e117` 的额外计数与第一段 `[-1,-1]` 路径来自搭载前挂载/两坐标采样，船上相对偏移分别稳定为 `[−2,−4]`、`[−2,2.25]` 且两轨乘船朝向均为 `up`，判定 **accepted（比较器应排除挂载前段，保留原始 trace）**；`e123` 初始朝向序列不同，但两轨均在交互前出现实际转向并完成张四对白，且 005 独立比较已通过，判定 **accepted（前置站位/采样差异）**；`e203` Reforge 没有直接 actor commit，只能由 island state trace 补写，判定 **evidence-gap（先补观测，不得用补写冒充状态等价）**。在这五项裁决落盘并重跑 006 比较前，不得进入第三步。
- 2026-10-05：修正 006 观测边界：Reforge e203 增加显式 `observe:island-state` 首个稳定到岛观测；第一阶段补写条件收紧到 `s014/e203`，不再被前置场景同 ID 事件遮蔽。随后把 Game/Reforge 船 e116 终点差异确认为真实内容错误：Reforge `s005/e116` 原停在 `[124,30]`，第一阶段实测为 `[126,34]`；作者脚本已改为 `[126,34]`，并按 digest 保护从 001 重建到 006。又修正 Reforge ride 的 mounted continuous cadence，普通 slow NPC 仍保留休拍。当前独立报告为 Game `game-006-2026-10-05T02-07-44-485Z`、Reforge `reforge-006-2026-10-05T02-07-44-471Z`；比较 `both-006-2026-10-05T02-12-03-232Z` 的船体/乘员终点、相对位移、骑乘朝向和 ride cadence 已收敛，e35/e36/e60/e61/e116/e117/e123 的差异均绑定证据后记录为 reviewed；仅 e59 的朝向/路径/提交数量仍 unresolved。006 仍为 `needs-review`，第三步连续串联禁止启动；此前 `01-27-13` 的批量 accepted 结论撤销，不作为收口证据。
- 2026-10-05：第三步曾在 006 尚未收口时试跑过 001→002；002 双轨语义检查曾通过，但一次完整串联在 003 入口路线提前停位，且该 run 使用了后来撤销的 006 accepted 结论，全部标为无效，不计连续覆盖证据。当前因 e59 unresolved 停在第二步，等待用户裁决后再恢复串联。
- 2026-10-05：在隔离 worktree `codex/e2e-continuous-20261004`、HEAD `05761fbd4` 的同一内容候选上，补齐 s003/e59 交互方案的显式 `takeEntity`/`releaseEntity`、对白前 `left` 朝向，并把 e59 auto authored 停点从 `[137,72]` 修到第一阶段 trace 的 `[137,73]`；新增顺序合同。当前独立第一步 001–006 全部通过：001 `both-001-2026-10-05T08-25-58-178Z`、002 `both-002-2026-10-05T08-27-29-266Z`、003 `both-003-2026-10-05T08-29-27-218Z`、004 `both-004-2026-10-05T08-33-47-580Z`、005 `both-005-2026-10-05T08-36-48-256Z`、006 Game `game-006-2026-10-05T08-42-31-145Z` / Reforge `reforge-006-2026-10-05T08-44-28-981Z`。严格第二步 `both-006-2026-10-05T08-48-11-665Z` 已 `passed`；e59 接管窗口证据显示两轨对白期间位置稳定、均左转且 canonical 停点一致，提交采样差异按证据标记 accepted。后续测试/runner 合同提交为 `083477ca3`、`3ec1cf053`，不改变上述 canonical content hash。
- 2026-10-05：第三步连续回放仍为 `rework`。`continuous-both-2026-10-05T09-58-50-439Z` 等最新 runs 已通过 001→002 边界，但在后续片段复用独立 route tape 时出现连续 live 起点与独立存档 settlement 不同，导致方向键/脚本 settlement 不一致；已补跨场景 settlement、短腿精度、隐藏 NPC observer 合同，但尚未形成“复用片段执行体、只裁剪 load/save”的完整闭环。不能把第三步标为通过，也不能进入状态方案/剧情阶段设计。
