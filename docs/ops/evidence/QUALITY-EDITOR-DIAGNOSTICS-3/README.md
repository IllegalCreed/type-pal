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
