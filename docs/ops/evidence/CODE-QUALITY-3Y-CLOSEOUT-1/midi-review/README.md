# Y01：CODE75 MIDI旧测试复审

2026-10-16，唯一治理分支`codex/code-quality-3y`，候选995cd8aee，main=f98d0ddd8。父分支保全与删除证明见[统一治理线](../README.md)。本片仅处理旧测试重复与过期协议；没有修改MIDI产品、音色、资源管线、公共接口或规则，0新增关闭。

## 实际读取与合同

[读取清单](read-and-retirement.json)记录4份全文的行数/SHA，以及caller和primary的实际段落；没有把局部caller读取记成整文件验收。直接读取当前MIDI实现242行、旧测试135行、main测试323行及CODE75历史卡98行。MusicBackend、AudioManager切歌/stop/dispose和source-controller的ready/错误回调是实际生产合同。SDLPal TSF_Play支持停止旧曲的前提；安装版SpessaSynth 4.3.6源码表明loadNewSongList只提交工作，songChange/midiError随后报告完成。

旧两例在统一候选实跑1绿1红，原件/runner见父目录midi-integration-baseline系列；旧FakeSequencer缺少事件协议，不能通过恢复老实现解决。旧测试还使用1字节MIDI、强转Response、定时猜完成，以及未恢复的fetch全局。旧文件字节保存在retired-test.ts.gz，SHA=a55ce7bb26059e35da357250cf4c1e2aee2cb6d28d3b73ffe486cd0fa751f2f6。

两个合同均已有更强的主线测试，file×fullName映射在读取清单中。主线“newer track wins”证明旧body实际消费完毕后，只有当前曲的精确字节/文件名/loop提交；“after stop”证明body实际读取与完成后零load/零play。其余10例覆盖parser失败串行、当前失败传播、resume、gain/dispose、初始化退役及同曲循环意图。保留完整12例原字节，未新增替代测试或扩大排除项。

## 验证与反控

定向12/12、6个音频相邻文件44/44、game typecheck均通过，0skip，无act/环境/导航诊断。命令、时间、退出码和原始输出SHA见directed.json、adjacent.json、typecheck.json；原始stdout/stderr与完整Vitest JSON均无损gzip留存。test SHA=5310870943689fd623d4d29f4e5cd4443c422411e90793750725c0574bc8d155，产品SHA=118a645461e4ca3dac7583a4ca7fc485149d64f3204f37d5408f21593fe017bc，均与origin/main精确相同。

[反控脚本](counter-run.py)只在临时源副本删除stop内的一次generation递增，保留abort及其它代码。完整12例先绿，变异11绿/1指定AssertionError，恢复12绿；失败直接观察stop后的旧曲错误提交，不是timeout/TypeError或setup失败。counter.json记录每次实际file/fullName/status/failure与raw/runner SHA；[独立清理后复核](counter-split-verification.json)重新核recipe、主线原字节、所有runner身份及SHA，临时目录已删除。首次准备因shared没有node_modules而中止，未执行测试；counter-preparation-1.json保留此失败，不计为业务反控。修正仅为处理无依赖目录，不改变测试或产品。

## 当前结论与待续

删除唯一已证重复的旧boundaries测试文件2例；保留主线12例原字节。覆盖保护表、matcher及基线未修改；官方runner对已实际删除文件已有独立范围规则，下一官方ratchet仍须原生确认scope removal，并核main及旧3y两条保护线，不把删除当作规则豁免。

ledger实测3287 inventory /223 closed /198 review /2866 pending。原旧test的review记录随删除移除，main现有测试仅pending→review，产品继续review。CODE75历史done结论保留原时点，当前整文件验收/功能证据与统一质量门未收口；其余57卡仍待逐项复审，完整进度见[rereview-progress.json](../rereview-progress.json)。

文档门通过：1333 Markdown /7067链接，phase184、content570。lint首次发现本片docs.json证据文件的格式错误1项，lint-first原始失败回执保留；格式修正后完整lint通过4340文件、0 error/0 warning/0 info，ledger通过。没有静音或降低规则。最终新增回执的格式再按原规则核对。

全仓check、official ratchet、两父protected fast留到稳定模块窗口集中运行；本片不是完整质量门通过或合main许可。下一片可从同一3y分支复核fetch-retry相邻测试与历史CODE71，不再建治理分支。
