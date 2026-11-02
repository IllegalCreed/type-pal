# C02 导入与历史回流证据

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-31
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 QUALITY-EDITOR-DIAGNOSTICS-3(C02 导入、迟到操作者与历史回流)的证据目录页,任务卡见 [QUALITY-EDITOR-DIAGNOSTICS-3.md](../../cards/QUALITY-EDITOR-DIAGNOSTICS-3.md)。任务范围仅四份测试源码(battle-sprite-ui.ts 与 G01/G02/G05 三测试),基线与分步定向保存完整raw.gz/runner JSON/命令和诊断数;未知边界不作关闭。

## 来源与输入

消融链原件:baseline.json(30/30 但 535 unwrappedAct)→ image-only.json(只等待真实bitmap后仍 535,图片主因假设撤回、observer实现删除)→ commit-history.json(只等真实提交/新notice/历史回流后 535→23,余23均为G01 act外dispatch/undo)→ lifecycle.json 与 lifecycle-final.json(30/30、0诊断)。相邻:adjacent-lifecycle.json(检查点9文件78例)、precision-adjacent.json(命令误写两个过滤名,实际7文件69例,不计完整相邻)、precision-adjacent-corrected.json(纠正后9文件77例0skip/0诊断)。精度:precision-30.json→retirement-proof.json(G01 10→9唯一退役C02-G01-02,oracle全部迁入03)→precision-29.json;反控原件oracle-proof.json与清理后独立核验oracle-rebuild.json;支持门precision-support-gates.json、checkpoint-gates.json、postflight.json。稳定窗口完整报告见 [window-review.md](window-review.md);数值原件window-proof.json(单票window-check/window-ratchet-confirmed/window-protected)、scope-proof.json、window-snapshot.json;读取边界read-boundaries.json与next-read-boundaries.json;逐文件诊断归因diagnostic-census.json。

## 断言与业务 oracle

文档事实核对(currentExecution=false):最终29例完整0skip/0诊断;runRawAction只等待新notice并返回当次DOM、applyAppearance核真实history增量或新错误回执、applyBattleHistory复用已有真实历史act并等待实际cache;所有点击只执行一次,轮询只读Session/notice,无sleep、空act、核心mock或检查静音。oracle转移由mutant证明:移除proofReady守卫后G01-01/08各恰一AssertionError;草稿reset mutant下原03漏报、原02与合并后03均检出同一缺陷,故只退役02。但三门exit0仍带unwrappedAct 1501/1466/1422、environment 577、navigation 2,统一零诊断门NOT PASSED——exit0与全绿不外推为零诊断或产品通过。

## 结果

治理结果=证据保全完整、消融与精简链可独立复验;不产生新执行结果。账本3284/229closed/54review/3001pending,0新关闭;四文件仍review、未合main;官方基线只由ratchet更新且仅G01 10→9一条精简。

## 限制与复核

未重跑任何命令;宿主历史pending导航与故障清理fault injection、未知跨文件重复仍review;完整模块门已跑但统一门未过。下一只读范围按next-read-boundaries.json(候选Kimi BattleSprite工作流)。历史结论保持原时点;候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2438B / SHA-256 77172c968b6a8e03254b27bebd772543d11272ee5c0a48565d7e41fedb4c1eb2；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# C02 导入与历史回流证据

任务：[QUALITY-EDITOR-DIAGNOSTICS-3](../../tasks/QUALITY-EDITOR-DIAGNOSTICS-3.md)。
当前build，仅四份测试源码。基线与分步定向保存完整raw.gz/runner JSON/命令和诊断数；未知边界不作关闭。

生命周期原30例完整保留：baseline535→bitmap-only535（假设撤回、observer实现删除）→提交/历史等待23→G01实际派发/撤销act后0。
最终30例完整0skip/0诊断；runRawAction只等待新notice并返回当次DOM，applyAppearance核真实history增量或新错误回执，applyBattleHistory复用已有真实历史act并等待实际cache。
所有点击只执行一次，轮询只读Session/notice；没有sleep、空act、核心mock或检查静音。中间消融保存执行原件，不冒称已保存每个临时源码快照；最终源码SHA见read-boundaries.json。
生命周期检查点时四文件仍review，G01 pending窗口与G05类型/排重未核；该时点没有新增/删除用例。

生命周期检查点：相邻9文件78例完整通过、0skip/0诊断；editor typecheck、docs、lint4174文件0/0/0通过。机器3284/229closed/54review/3001pending。完整模块门留在精度修正后的稳定源码窗口，不在中途重复全仓测试。

精度检查点：G01真实reader交付闸门证pending窗口；移除生产守卫后01/08均准确红。草稿reset反控证原03漏报、原02与合并后03均检出同一缺陷，故只退役02，全部独有oracle迁入03。见oracle-proof.json与清理后独立核验oracle-rebuild.json、retirement-proof.json。精度前30例与精简后29例完整0skip/0诊断。G05消除unknown强转，头注撤回未核实的新颖性。

第一次相邻命令误写两个过滤名，实际上7文件69例（precision-adjacent）；不计为完整相邻。纠正后9文件77例通过且0skip/0诊断（precision-adjacent-corrected）。coverage-tools65/65，editor typecheck通过。判据与拒绝用例未动；只有G01精确10→9支持行。完整check/ratchet/protected将在此稳定模块统一运行，不能据局部结果合main。

稳定模块全门已完成：[完整报告](window-review.md)。数值check/ratchet/protected均exit0，统一零诊断门仍失败；本片0关闭、四文件review、未合main。官方基线只由ratchet更新，覆盖分子/分母和生产范围全同，仅已证G01退役一例。下一只读范围见next-read-boundaries.json。
```
<!-- incremental-original-source:end -->
