# C02 导入与历史回流证据

任务：[QUALITY-EDITOR-DIAGNOSTICS-3](../../tasks/QUALITY-EDITOR-DIAGNOSTICS-3.md)。
当前build，仅四份测试源码。基线与分步定向保存完整raw.gz/runner JSON/命令和诊断数；未知边界不作关闭。

生命周期原30例完整保留：baseline535→bitmap-only535（假设撤回、observer实现删除）→提交/历史等待23→G01实际派发/撤销act后0。
最终30例完整0skip/0诊断；runRawAction只等待新notice并返回当次DOM，applyAppearance核真实history增量或新错误回执，applyBattleHistory复用已有真实历史act并等待实际cache。
所有点击只执行一次，轮询只读Session/notice；没有sleep、空act、核心mock或检查静音。中间消融保存执行原件，不冒称已保存每个临时源码快照；最终源码SHA见read-boundaries.json。
四文件仍review，G01 pending窗口与G05类型/排重尚待下一提交核验；没有新增/删除用例。

生命周期检查点：相邻9文件78例完整通过、0skip/0诊断；editor typecheck、docs、lint4174文件0/0/0通过。机器3284/229closed/54review/3001pending。完整模块门留在精度修正后的稳定源码窗口，不在中途重复全仓测试。
