# 编辑器保存中断恢复：最终候选收口

父卡：[EDITOR-SAVE-RECOVERY-1](../ops/tasks/EDITOR-SAVE-RECOVERY-1-interrupted-author-save.md)，r2设计签字沿用。
起点：7087dbad；执行：Codex，2026-09-13。用户批准连续完成旧保存链清理、两项原生补证、性能核验和候选冻结。
本页记录当前批次，不把此前子包accept冒充整卡done；外部终审和用户验收仍按父卡推进。

## 范围与实现边界

当前作者项目只消费canonical脚本。正式loader已经拒绝`content.scripts`，而旧序列化仍能输出该字段与分片，
App还保留了不会被正式启动链采用的旧抽屉。清理目标是同一作者行为由当前工作台/完整writer承担，不是第三阶段脚本模板库改造。

直接证据（起点7087dbad）：project-loader 188–191拒绝旧字段；main.tsx两条启动路径均构造ScriptEditSession；
App的必填props.script.session及getStateSnapshot必定产生当前状态，旧ScriptDrawer fallback没有正常启动域。
独立Codex子代理复核了静态caller与命令/undo路径；并非仅凭grep零命中删代码。最强替代解释是正常启动存在无canonical session时段，
现有创建点/初始化/getStateSnapshot不支持；若后续新增该类入口，必须修当前合同，不能复活旧作者存储。

- 移除ScriptDrawer及其独占scene-script-view/shared-script/script-edit/script-context四个editor私有模块；
  删除旧七个作者命令与专属辅助。当前CanonicalSceneScriptWorkspace、ScriptEditSession、共享脚本命令与格式器保留。
- 序列化明确拒绝`content.scripts`，不再校验/输出旧index/chunks。真实canonical sharedScripts保存/重开正控保留。
- 移除无生产caller的`project-io.writeFile`与`fsa-copy.copyDirRecursive`及其写辅助；当前作者写入走完整writer/journal，
  fsa-copy只保留现行只读库存`readDirectoryCopy`。不是把遗留逐文件写改名继续当产品保存入口。
- 旧低层授权测试改为显式的[policy测试consumer](../../packages/editor/src/core/__tests__/policy-io.ts)，只组合真实公开授权/预检/开始/完成记账API；
  测试fixture含部分/非工程JSON，不能冒充完整writer。保留原授权/冲突/单次消费断言；保留空间拒绝改走真实writeProject。
- 必须保留的内部模型：world-sprite-behavior把canonical共享脚本lowering成预览chunks；迁移器仍使用content的脚本规范化工具。
  因此不删除跨包ScriptChunk/ScriptIndex模型、content/reforge导出、CommandForm或ScriptTree格式器，不宣称整个字段已无caller。
- 同步退役UI专属CSS和adoption登记，对所有仍在源码中的控件继续全量检查；不改全局超时、排除、覆盖率门槛、content20或SAVE8。

原实现文件和旧测试由Git保留，可从7087dbad恢复；没有删除作者工程或素材。

## 测试迁移与贡献披露

Codex主代理改生产、独立核查和集成；两个Codex子代理分别提供只读E0审计/新测试与旧测试/登记适配，**不是GLM或Kimi席位，不代签**。
GLM此前所有测试贡献仍按父卡和各工作包披露；不能将贡献者自测当独立第三方终审。

旧抽屉/命令及独占模块共退休38项旧模型测试：commands专属12、ScriptDrawer4、scene-script-view4、shared-script2、script-edit14、script-context2。
其中commands的12项已迁为12项当前模型测试，文件仍114项；不是恢复旧命令或通过改文件名规避测试计数保护。
现行ScriptEditor新增真实会话的对话行排序/单次提交/undo/redo证据，ScriptTree新增仅callback层的拒绝不变证据；
旧fsa-copy的6项改为10项当前collector+完整writer测试，含合法资源、作者覆盖、私有排除与三种慢源/目标漂移。
不能用退休前后的测试数量差值推断丢失业务保障；最终测试身份清单与真实源码退休另做机械对账。

[workspace-final-boundaries.test.ts](../../packages/editor/src/core/workspace-final-boundaries.test.ts)新增6项：同目录不同handle对象恢复并续写、
复制目录拒绝、target签发后坏沙盒marker或PAL sentinel混入拒绝、合法沙盒完整writer/登记正控。
以及真实已完成/已过期写入scope不能再次开始作者IO；这项验证生命周期拒绝，不冒称填上了active scope重复begin的幂等分支。
登记/锁/恢复链为生产实现；FSA与IDB替身只提供宿主边界。首存retry用例只声称公开API合同，当前App恢复完成后通常转bound授权。

## 原生OS目录补证

使用独立Microsoft Edge持久资料`/tmp/codex-save-closeout.tEOvxV/edge-profile`及系统目录`project-restart`。
6011为本次自建实例，用户6010和日常Chrome未动。真实OS picker/权限由Codex通过CUA操作，原生FSA/IDB/Web Locks未替换。
临时Vite钩子仅在`__save_closeout`页面、该专用目录、非私有`content/actors.json`写入边界fail/hold/off；没有写进生产。

1. 从真实启动屏创建空白工程并授权。用真实finishOpen/serialize/writeProject准备maxHP=237，在作者人物表写入前中断：
   磁盘人物仍100、状态pending。补证不重复此前已通过的完整“新增人物及引用”UI流程。
2. 关闭**整个独立Edge进程**（原PID11224已不存在），以同一持久资料重启；最近项目及句柄仍在，权限是prompt。
   点最近项目、真实“Allow this time”重连，看到“正在完成上次保存”；释放gate后同一operation变committed，磁盘maxHP=237。
   这次证明的是正常浏览器退出/重启，不冒称OS断电、kill -9或硬件级事务。
3. 下一次保存目标238中断，恢复已进入作者IO gate后，在真实站点权限面板关闭File editing。
   释放后原生getDirectoryHandle拒绝；前后全部文件/目录SHA与mtime快照逐字相同，pending与目标字节保留，启动屏按钮仍可用。
4. 发现旧UI只显示浏览器英文NotAllowedError。按r2既定反馈要求，ProjectPicker仅在本次action确已进入恢复时，
   先将该权限异常展示为中文重连指引。
   非权限错误保留原因；未进入恢复的失败不冒称存在恢复数据；取消仍静默。四项组件测试，修前两条业务红、修后全绿。
5. 真实重选原目录并允许Save changes后恢复238成功。再以239目标复验修订后的撤权，中文完整可见、前后快照相同，保留238/pending现场。

最终代码审阅进一步收窄文案为“目录访问权限已失效。请重新授权后打开原文件夹，确认保存结果或继续恢复。”
原因是onRecovering只说明曾进入恢复，不能区分尚在恢复与已提交后加载失败；UI不应预断数据一定仍pending。
最终短文案由组件测试验证，原生截图保留前版中文显示的实测；底层撤权/字节保留证据不变，不伪称截图显示了最终逐字文案。

截图`restart-recovering.png`、`revoke-error.png`、`revoke-fixed.png`均已由Codex实际查看；快照两组cmp exit0。
测试浏览器已关闭，持久资料/目录保留作证据，没有清理恢复凭据。目录只含本次测试内容。
准备过程的CUA参数错误、一次失效AX编号、Node REPL旧page闭包与错误fsaSource导入均不计入业务证据，修正后才执行上述流程。

## 性能结论与不纳入项

复用[入库计量入口](../ops/audits/pre-e2e/measure-pal-save-recovery.mjs)，专用6011、独立新OPFS，未与check/coverage/子代理测试并跑。
本次完整克隆84.480s，含打开85.683s，小增量2.947s；1,934资源/69,092,169字节，最大单资源8,091,135字节。
作者输出146,895,754字节、暂存147,348,008字节、4,945次close，与前批相同；首次作者close约29.572s。
CDP分别采样usedSize峰393,355,652、backingStorageSize峰384,465,506字节，不相加、不当作RSS。

另外只在仓外Vite配置里试验复用IDB连接，**没有缓存凭据、改变strict或事务次数**：克隆81.287s、含打开82.461s、增量2.943s，
输出字节/close数相同。单组约3.8%的差异仍处于历史约81秒的量级，没有证明足够收益；原型未补全连接生命周期，也**未纳入生产**。
参考[IndexedDB连接与关闭规范](https://w3c.github.io/IndexedDB/#database-connection)，若未来采用连接复用，必须补版本变化/异常关闭等生命周期处理，不能直接使用本原型。

结论：没有宣称这轮克隆提速。保留当前安全协议及已测约80–85秒大克隆成本；r2未设数值性能阈值，终审需明确确认该风险是否阻断。
进一步拆分持久凭据/游标或减少检查不属于本次授权，不自行实施；若发布目标要求显著更快，另行设计并取得审查/产品裁决。
本次不能把已量化成本写成“性能问题彻底解决”。

## 质量门与剩余分支

### 定向与单点负控制

- 原低层授权/冲突与序列化3文件73项通过；当前复制10项+project-copy17项通过；新首存边界5项通过；
  当前脚本排序/提交/undo/redo所在ScriptEditor24项通过；恢复权限反馈4项通过；editor typecheck通过。
  后续补齐后，workspace-final6项、ProjectPicker5项与PanelResizeHandle9项合计20项定向通过。
- 本席独立临时配置`negative.config.mts`，仅进程内单点替换并记录源码前后hash，三文件15项正常对照通过：
  去掉旧content.scripts拒绝→序列化错误接受，1红；去掉不同对象同目录isSameEntry→合法续写被误报冲突，1红；
  去掉反馈的recovering前提→普通打开错误被错误宣称“恢复数据保留”，1红。
- 沙盒身份throw去除后，两条用例改被后层“目录非空”拒绝，仅错误文案不同；如实归重叠保护，不作为独立业务负控。
  这些用例在原代码上的快照/IO/凭据不变断言仍成立，不需要删除后层保护来造放行。
- 退役后以真实main启动评审沙盒、切换当前脚本工作台，编辑器与脚本编辑区正常装配、pageerror为空。
  `canonical-script-after-retirement.png`已查看；这不是剧情/预览播放验收。最初REPL用了不匹配评审沙盒的“保存”按钮定位，
  触发会话超时，改独立可重跑`verify-canonical-ui.mjs`按实际工作台就绪条件验证；不把定位失败当产品失败。

### 最后适配中发现并修正的问题

- 第一轮源码退休ratchet被正确拒绝：editor四指标上升，但全仓加权行覆盖47,898/68,763低于旧48,480/69,581。
  baseline没有写低。补当前仍在用的分隔线交互/存储及保存状态回归后再跑，不恢复废弃源码或减统计范围凑绿。
- 后续ratchet数值通过，但严格保护基线仍拒绝commands.test.ts用例数减少；检查器没有放宽。
  该文件退役的12个旧命令用例已迁为当前canonical命令回归：共享库payload隔离、失败更新保持redo/dirty/通知、
  同名私有行为跨channel/entity/scene隔离、双真实caller逐一解除删除、稳定步骤/非首页编辑、空实体不隐式造页、动画/空页精确保留。
  使用真实ScriptEditSession及canonical visitor→引用边→ProjectReferenceIndex，未伪造删除oracle；其余98个普通测试体及一个参数化定义按AST逐一保留。
  文件114/114、typecheck/biome通过；主代理读取完整新增断言及getState克隆合同后纳入冻结候选。
- CSS退役初稿误将三个共享规则当成旧Drawer独占；主代理再次读取SceneScriptWorkspace的实际root/header，
  恢复`.script-drawer`、其`.drawer-head`及`.t`三条基础规则。其余删除规则仅剩已退休的旧侧栏/表单消费者。
  `canonical-script-final.png`已重新查看，当前标题/页签的单行与布局保持；初稿不得当作已验收的最终视觉结果。
- 新分隔线回归发现原组件没有处理lostpointercapture。新增一条事件接线到既有结束逻辑；真实活跃pointerId匹配才清理，
  不改变方向/边界/disabled/Home或未被当前宿主采用的toggle语义。9项新增测试覆盖三处当前宿主、取消/结束/丢失、卸载与存储不可用。
  主代理独立移除这一条接线，1项用例出现横竖两向共4个业务失败（标记残留与后续错误resize）；正常20项对照通过。
  Chrome原生复核先确认gotpointercapture，再真实release并移动，标记消失且高度保持420，日志`NATIVE_LOST_CAPTURE_PASS`。
  首次辅助脚本释放的只是pending capture、尚未got，未构成实际lost事件并超时；修正前提后通过，没有为辅助脚本改产品。
- 原审计probe文件保持零diff。直接复跑在其旧IDB替身缺db.close处退出，尚未到达原反例，**不能称该失败证明缺陷已修复**；
  当前结果由完整writer/恢复单测与上述原生持久目录证据证明。旧探针不为适配新恢复数据库而偷偷改写。

### 最终质量门（当前树）

`check-ready.log`：完整pnpm check exit0，七包6,873项，editor224文件/2,305项；文档工具20、覆盖工具17另计。
lint为48条既有warning、11条info、零error；相对起点50条warning随旧代码退休减少，不是压低诊断等级。

`ratchet-ready.log`与`strict-ready.log`：均以7087dbad作受保护基准；官方ratchet显式允许实际源码退休，随后单次严格fast exit0。
共6,385项、613生产文件；editor205测试文件/2,146项、215生产文件。strict报告与新baseline的每包指标/清单/计数一致。
此前带102项commands.test.ts的中间baseline被保护规则拒绝；补齐当前114项后，先从Git精确恢复受保护旧baseline，
再由官方ratchet生成最终基线。未手填更低指标、修改runner或切换BASE_REF绕过检查。

全仓行47,935/68,763（69.71%）、语句53,083/78,549（67.58%）、函数10,033/14,397（69.69%）、分支38,005/61,633（61.66%），均不低于起点。
editor行21,829/27,580（79.15%）、语句24,199/31,537（76.73%）、函数6,000/7,996（75.04%）、分支18,701/27,252（68.62%）。
这些增益包含实际源码退休后的分母变化，不宣传为全部新增命中；全仓最终90%/85%的目标尚未达到，本次亦未重跑full或完整E2E。

| 核心模块 | 行 | 函数 | 分支 |
|---|---:|---:|---:|
| author-save-journal | 387/393 | 57/57 | 273/297 |
| author-save-store | 91/91 | 22/22 | 102/102 |
| workspace-persistence | 412/417 | 58/58 | 415/427 |
| project-io | 264/266 | 50/50 | 205/227 |
| fsa-copy（当前只读库存） | 19/19 | 6/6 | 6/6 |

核心新增逻辑达到本卡行/函数≥95%、分支≥90%的目标；其他既有UI与全仓模块仍按总覆盖计划继续。
wp相对起点新增159/1、164/2、169/0，旧98/0随旧逐文件/复制测试退休失去覆盖，净增加2臂，不写成“全部无回退”。
两重点模块剩34臂及其30项构造保证/4项待确认详见[台账](editor-save-recovery-coverage-pending.md#当前清单)，全部继续在分母。

`reconcile.mjs`独立核5个实际退休源码路径、各包生产清单和比率、逐模块整数/未覆盖行、strict与baseline字段，输出`reconciled.json`。
全文保留的失败日志包括：索引遗漏、一次import格式、首次行比率回退、中间baseline计数保护、原探针旧宿主模型错误及辅助UI脚本前提错误；均不涂改成成功。
全部运行/负控/报告证据在`/tmp/codex-save-closeout.tEOvxV/`；本轮过程中曾有正常适配失败（旧符号未移除、静态计数待更新等），最终绿不覆盖原日志。

## 终审入口与限制

本批实现/自验证收口，交Kimi与GLM并行终审；父卡保持review，不标done。三席终审及用户验收之前不把A-03列为整体验收完成。
Kimi独立核架构、原授权/持久状态/完整消费入口与反例；GLM须披露测试贡献，做独立矩阵/证据对账而非自我证明。
所有视觉验证由Codex执行，审查不重复已完成的浏览器流程。性能约80–85秒大克隆成本、未覆盖防御分支、原探针适用性与跨浏览器/硬件断电限制均必须保留。
