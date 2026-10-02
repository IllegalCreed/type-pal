# Kimi 脚本生命周期中包二（2026-10-02）

任务：[TEST-KIMI-SCRIPT-LIFECYCLE-MEDIUM-2](../../ops/tasks/TEST-KIMI-SCRIPT-LIFECYCLE-MEDIUM-2.md)。
Owner Kimi，独立分支 `codex/kimi-script-lifecycle-medium-r1`，原32例中包已accept且只读，不覆盖它或O/P/Q/其他队列。
当前 sourceBase `8990f0cde3edfe6feb908234aeafcc937daaec52`，content21/SAVE10；开工 BASE 是该分支随后 docs-only 登记提交。
[冻结/精确白名单](targets.json)、[只读核验](verify.mjs)、[三个真实公开API输入小样](preflight.json)、[作者证据目录](evidence/README.md)。

2026-10-02 [Codex独立复核/窄收尾提示词](evidence/codex-review-20261002/README.md)：固定3be438a9，50/50与四代表反控已核；仅M01未结算请求与作者证据措辞返工，不加例、不续派原卡之外范围，不接受作者自验为done。

## 容量与责任

16 个精确候选全部处置，预计12–18个合法未重复新例，硬上限24。数字是额度预算，不是凑数门。
本轮仍按此前约1/3额度控制；没有自动下一大包。只两个新test/专属fixture/evidence可写，所有产品/旧测试/配置/基线/真实项目/共享文档只读。
作者不写或运行反控工具，不重采原四针或Q旧针。4个不同新业务oracle代表变异由Codex按最终候选采样；至少两枚要旧绿新红，数量不足如实记录不造针。
本包纯程序化生命周期，不开浏览器、不声称确认框视觉/故事E2E验收、不改save格式、恢复策略、UX或产品行为。

## 精确候选与旧证明限制

每 ID 最多一个主用例；必要的布尔/清理相位对照可放同例，不拆换值标题增加净新。
这里只授予候选处置，作者仍须核 main、Q12和Kimi32以及其他固定候选全部旧matcher；更强旧证/无合法输入/真实缺陷如实分类，缺口不足不扩域。

| ID | 合法输入与精确目标 | 当前源锚点 | 已有证明限制 |
|---|---|---|---|
| KM-LIFE-M01 | 真实captureFrame记录port；blocked及已有active两次activate均false、capture零调用、队列/token/frame不动；实际激活才调用一次 | script-confirm-modal.ts:82-92 | Q的canActivate/active旧例未提供capture port；capture旧例只证成功替换，不证拒绝时零IO |
| M02 | 修改公开view返回对象的selectedYes/answerPending/presentedFrames，下一view与最终答案不受污染；opaque frame身份不强求deep clone | :43-55 | Q旧例只读取字段，未改view包装；不测试未承诺的frame深拷贝 |
| M03 | 默认No先submit，帧门未满时toggle/submit/submitNo不能改false答案；两帧后结果false | :96-117 | Q已有true答案锁定；其false默认用例未在待兑现期再操作，缺false-versus-undefined判别 |
| M04 | 两帧已presented但没有提交，Promise仍pending、active与answerPending=false保持；之后显式submit才兑现 | :120-151 | main旧例“先两帧后submit”只验最终结果，没有settlement journal；不假定自动默认选择 |
| M05 | 三请求入队，激活前取消中间项（queue index1），首/尾token1/3与FIFO、各自答案及pending计数正确 | :153-161 | Q只测head(index0)取消或active取消，未证正索引splice不误删首尾 |
| M06 | 标准Signal add/removeEventListener spy不替代核心：正常兑现、abort、cancelAll均移除各自真实注册handler，结算不重复移除 | :75/:164-177 | Q“结算后移除监听”标题只验迟到abort结果，未验真正remove调用/handler/拒绝路径 |
| M07 | 第一项已结算、第二项真实active时第一Signal迟到abort，第二token/view/答案和pending保留 | :153-177 | Q迟到abort发生在空队列；旧active+queued中止都取消，不证后来新活动存活 |
| M08 | 标准API spy封enqueue初检后/真实addEventListener前的abort窗口，使用真实controller.abort，最终reject AbortError、pending0、无可激活请求 | :58-77 | Q仅预取消/已安装监听后取消；禁止伪Signal或改aborted私态 |
| KM-LIFE-L01 | withRegistered的外借真实lease中body拒绝自有Error；同一reason、registration移除但lease仍活；save barrier仍等外部close | script-activity-lineage.ts:33-59 | 旧failed activity测withScript拥有的transient，不能证明借入lease不被helper关闭 |
| L02 | 同key/exactSignal两个活跃真实lease，最新scope先正常结束；lookup退回仍活较早lease，随后全清 | :15-26/:47-59 | 旧overlap仅较早scope先结束、最新存活；不是反向出栈fallback |
| L03 | 最新lease已close但其body/finally未结，lookup跳过它并退回较早live；最新finally结清不删较早registration | :15-26/:55-59 | 旧closed pending-finally无另一个live predecessor；Codex公开API小样已跑通 |
| L04 | 同opaque key/exactSignal，两个真实coordinator各自mint并注册live lease；分别查询只返回本coordinator，结一域不擦另一域 | :15-26/:47-59 | 旧different coordinator只验无对应注册时独立等待；此为helper权限隔离合法输入，不伪造lease |
| L05 | 同key/coordinator两个真实Signal及live lease并行注册，一方拒绝/finally后另一域仍正确可借；最终自行close | :41-59 | 旧different signal只验独立等待；未同时注册两Signal并核局部清理 |
| L06 | 自有transient的async body pending时lookup仍live、barrier未ready；body拒绝后同一Error、membership/registration释放，barrier可ready | :67-95 | 旧failed activity仅同步throw/message；只新增异步持有+reason identity，不重领同步清理 |
| L07 | 真实AbortController自有reason，预取消沿公开helper返回原reason身份；gate等待取消返回coordinator规范化AbortError与实际message，body零调用，gate释放无迟到执行 | :40/:73/:78-80；script-world.ts:682-697 waitForActivationGate | 旧已证默认AbortError/name；只新增预取消身份及等待时实际message，两时序同例不换字符串凑数；原派发精确reason过宽措辞由Codex校正 |
| L08 | 同key/exactSignal第一次scope失败释放后第二次合法进入，第二body确有新live lease而非旧闭lease，最终全清 | :41-59/:74-94 | 旧失败后只证barrier能ready；replacement旧例未重新登记同lineage；若真实旧集成已证则existing-proof |

不追加 captureFrame抛错恢复策略、不允许mock coordinator.beginActivity制造合法输入不可达的登记失败；发现缺陷只停对应ID举证，不夹修。
所有deferred有明确finally/结算，拒绝Promise及时消费，不靠sleep/扩timeout/skip/todo隐藏未处理错误。

## 旧证明与caller

主旧文件：main的script-confirm-modal.test.ts四例、script-activity-lineage.test.ts全例及runtime-script-project/script-project-core/script-world相关集成。
Q固定候选内script-confirm-modal.glm-q.test.ts十二例必读，FIFO/token/预取消/空操作/正常capture/true锁定/active取消/已提交取消/自定义取消等已有部分不计新。
原Kimi32的续存地址/作者组织不在本包新域，9 deferred不自动转为本卡工作。
实际生产caller：main.ts:1044-1046/2668/4403/4951-4969/5361-5364；runtime-script-project.ts:207/432/496/566/599/674；script-project-core.ts:331/406/421/472/502。
这些是当前二阶段primary；原版/一阶段机制及UX选择N/A，本包不裁决视觉表现或历史兼容。

## 执行与交付

先 `git status`、核 branch/BASE；`node docs/testing/kimi-script-lifecycle-medium-20261002/verify.mjs --base BASE`。
依赖沿冻结lockfile；定向使用 `pnpm --filter @type-pal/reforge exec vitest run 新两文件 src/script-confirm-modal.test.ts src/script-activity-lineage.test.ts --reporter=json --outputFile=绝对路径`。
需要Q旧十二例对照时只在自有临时副本从固定对象读取，不拷入正式测试或merge旧候选；记录实际fullName/断言锚。
最终 `env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/reforge test` 与typecheck各一次；根lint完整0/0/0、docs、diff/verifier，检查脚本已有参数，不重复传maxWorkers。
全包资产红保留原报告并列路径；可只读复制ignored资产到自有副本，记录SHA，绝不改真实PAL/产品或填假绿。
evidence/内交README、contracts.json（每ID源码条件/caller/合法输入/旧blob-fullName-matcher/完整expected/分类）、directed-vitest.json、receipt.json与原始门日志。普通JSON必须遵守原格式门，raw独立保留。
最后推一次真实40位候选SHA、准确测试/证据与docs-only尾区间，达到24停新加；不main/done/official gates/改baseline/清退休树。
私有覆盖非必需，不花额度重复全仓测量；正式main并集和85%只归Codex，不保证本包提升多少pp。
