# C10 恢复：真实提交等待、失败收尾与有证排重

基点d261e1d17，唯一codex/code-quality-3y；最新origin/main=f98d0ddd8。归属[任务卡](../../../tasks/QUALITY-EDITOR-UPLOAD-DIAGNOSTICS-1.md)。本检查点修四份测试/驱动文件，0新增关闭；不代表94前83卡或94–102已验收。用户重申全量复审后，保存本片并回3d/3g，editor其它诊断留在队列，不无限扩大本片。

## 逐文件证据与根因

完整读取路径、字节SHA、实际局部caller范围见[读取边界](read-boundaries.json)。Wizard548行完整读；WorldSpriteLibrary仅761–798，AddSpriteCommand/EditSession仅所列范围，不把caller局部当整文件验收。真实链为合法PNG→量化/编码→实际gzip→实际SHA→EditSession/AddSpriteCommand→onDone；父组件onDone关闭上传并选中新定义。旧mock族只读到指定片段，其合法性与跨族排重仍pending。

| 文件 | 直接发现与本片处理 | 尚未闭合 |
|---|---|---|
| upload-ui.ts | G02-10故意给空sprites props绕过UI预检，真实AddSpriteCommand拒绝重复id；原act外DOM轮询使catch/finally两更新逃出act。只在该命令失败caller选用真实digest Promise等待，act退出后直接验错误UI。 | Viewer/Uploader及其它caller全域仍待；只改Wizard段。 |
| upload-ports.ts | G07原闸门在断言失败时可能不释放/恢复。记录真实gzip任务，drain在finally的act内放行并等真实gzip/SHA，嵌套finally恢复spy。 | G05只做相邻回归，完整合同/排重未接收。 |
| G02测试 | 保留十例真实取消、迟到释放、错误和恢复oracle；仅替换第10例等待方式，不改业务结果。 | 产品其它边界/统一门未闭合。 |
| G07测试 | finally保证失败也收尾；03取消/一次回调/历史是02弱子集，09第二次成功是04弱子集；05实为首次自定义id/label，修标题并直接断言完整这两个值。10→8。 | 其它旧mock族排重未知，不扩大退役。 |

依据[React act官方说明](https://react.dev/reference/react/act)及实际安装React19.2.7的async act收尾源码：等待真实异步交付，再在act完成后断言DOM。digest spy默认透传真实硬件方法，不替换结果，不执行额外hash；闸门仍调用实际gzip。没有console过滤、环境关闭、核心mock、规则放宽或产品变更。产品、harness、配置、baseline与资源字节保持基点原样。

## 同身份清零，再裁定精简

先实际保留全部30身份：initial30通过但2act；zero-thirty30通过且0act/环境/stderr。两条已证弱子集随后退役，最终三Wizard文件28通过、0失败/跳过/诊断。G07的03没有检验标题声称的kind，kind禁用由保留的10直接核；09没有检验错误恢复，不据旧标题保留重复。05标题更正带来一条身份替换，公开三旧身份移除/一新身份加入，不伪称所有身份不变。

原生Vitest list、三快照输入、源SHA和精确注册见[retirement.json](retirement.json)：G07精确10→8，批准表27项/net62。旧26项及matcher/拒绝合同不变；只增本文件count/双identity digest/当前SHA，固定表测试同步计数。官方baseline没有手改，尚未运行当前官方ratchet。

## 判别力、转移与诊断反控

[before-proof](before-proof.json)与[after-proof](after-proof.json)保留各六次完整原生执行及模块副本SHA；before是同30身份已零诊断阶段，不能冒充初始d261。所有临时副本精确清理，真实实现始终未改。

| 隔离变异 | 精简前→后 | 结论 |
|---|---|---|
| 取消后漏关迟到bitmap | 两阶段均仅G02-02一个AssertionError | 有效业务反控，0其它诊断。 |
| 去掉同步submit锁 | 两阶段均仅G07-02一个AssertionError | 有效业务反控；finally排空实际gzip/SHA，即使双提交也0act。 |
| 在途取消按钮错误可用 | G07-02/03两红→只02一红 | 03 oracle确实转移，单列，不算新增业务针。 |
| 第二次真实提交回调id错误 | G02-10/G07-04/09三红→10/04两红 | 09 oracle确实转移，单列。 |
| 恢复G02旧act外错误DOM轮询 | 两阶段原生全绿，但均2act | 诊断反控；退出码0仍拒绝质量验收，不冒充业务AssertionError。 |

精简后第一次静态检查exit0仍报unused import，原始[JSON](pre-import-style.original.json.gz)保留，未记为通过。随后只删除唯一未使用wizardWaitDecoded import；[精确差异](final-source-delta.json)重建证明body/其余字节未变，最终28回归用的就是清理后字节。没有为这一个import删除重跑/改写历史十二轮反控。

## 回归与未完成项

[定向/相邻/类型/工具回执](regressions.json)：Wizard28零诊断；十一文件相邻78通过但Uploader仍6act，不能称统一通过。editor两个typecheck配置通过；coverage-tools72通过。[完整editor](editor-full.json)为631实际文件/4943通过/0失败跳过，但624act、243环境告警、1表单告警、321stderr块，明确未通过零诊断验收；1353是Vitest suite计数，不冒充文件数。按文件归并见[诊断队列](editor-diagnostics-by-file.json)。

相邻reforge回归、静态门与账本最终结果见[gates.md](gates.md)。反控图、真实runner、SHA、精确退役与来源冻结由[只读核验](verify.py)另进程重建，回执[verification.json](verification.json)；这是Codex证据自核，不冒充第三方审查。

四文件继续review；没有产品/UI/schema/save/资产管线/公共接口变化。完整check/official ratchet/protected fast等待稳定模块窗口，不以当前包绿合main。94前全83卡仍10partial/73pending/0整卡accept；下一片回3d PNG与3g CLI，editor Uploader六act及其它46文件诊断继续登记，94–102原返工保持。
