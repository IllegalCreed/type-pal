# CODE3h/CODE71 fetch-retry 成果复审

基点dfd03a811，main=f98d0ddd8，唯一codex/code-quality-3y。三测试有限补证，生产源/接口/规则/baseline/精确退役表未改；0新增关闭。[CODE71原卡](../../../../archive/tasks/done/CODE-QUALITY-71-game-fetch-retry-abort-boundary.md)全文核清后当前partial，旧done不等于本轮accept。全83卡当前14partial/69pending/0整卡accept，94–102/editor继续。

## 逐文件、真实caller与停止线

实际全文/分段读取和SHA见[read-boundaries](read-boundaries.json)。fetch-retry.ts只由main.ts安装，先于boot-loading计数包装，后者restore保留捕获的底层；audio-midi.ts的曲目/音色库fetch、stop/dispose是真实signal caller；ending-avi-host的POST Request是相邻测试，不伪称生产调用。SDLPal没有该浏览器网络API，N/A；第二阶段产品未改。

| 当前文件 | 直接问题与处理 | 当前结论 |
|---|---|---|
| shell/fetch-retry.ts | 真实Node原生fetch/本机HTTP确认退避不响应取消、Request自定义reason被重试；与旧71“取消不等待backoff”矛盾 | 旧关闭撤回rework，转[取消生命周期卡](../../../../tasks/QUALITY-FETCH-ABORT-LIFECYCLE-1.md)draft；本片不实施产品修复，不重开未核产品取舍 |
| shell/fetch-retry.test.ts | 每次抛同类同消息错误只验消息，耗尽弱例转更强boundary；混合503/404拆两独立输入轴；去fetch强转，POST核同错误身份 | 实际仍6例但删除/新增身份公开，不伪称六身份不变；保持review |
| shell/fetch-retry.boundaries.test.ts | “最后Error”每次复用同一对象，不能区别首末；末503改用两不同Response且核最后引用；补请求中真实init.signal取消、自定义非AbortError原因 | 10→11；旧关闭撤回review，3新补证中两项落此文件。Request/等待期风险仍未解决 |
| shell/fetch-retry.glm-phase1-leaves.test.ts | 原卸载例直接换新fetch，根本未使用被恢复对象；原重装例只一次成功调用 | 现在实际同一flaky卸载前3次/后1次，恢复引用在teardown前断言；重装前0重试正控、后实际1次重试，2身份保留，仍review |

测试所有mock有typeof fetch完整签名，无新增强转/ignore/核心替身。teardown在finally恢复自己拥有的原global/timer/mock；即使被测uninstall坏掉也不污染相邻测试，但它不能替代用例中的真实恢复断言。

已知未修注释：boundary的POST覆盖GET例仍有“网关耗尽拒绝”的旧括号描述，实际exhausted HTTP Response会返回；留在review，随取消实现切片校正，不把整文件记为注释已清。第一阶段网络行为/音频UI、完整浏览器取消效果未验；没有因为包绿关闭这些域。

## 反控：三个新缺口，三个原oracle保留/转移

[before](before-proof.json)/[after](after-proof.json)：每轮同三文件完整集合、file/fullName/status、命令/cwd/exit/signal/spawn、raw/JSON、源/临时副本SHA与精确清理。正式生产源逐字节不变。

| 临时变化 | 原18例 | 最终19例 | 说明 |
|---|---|---|---|
| 正常源 | 18绿 | 19绿 | 完整对照 |
| 留第一次网络错误 | 18绿 | 18绿/1个boundary最后错误AssertionError | 不同attempt真实TypeError对象补证 |
| uninstall不恢复fetch | 18绿 | 18绿/1个GLM恢复引用AssertionError | 原用例换新fetch造成假证明，现在真用同一对象 |
| 删init.signal.aborted判断 | 18绿 | 18绿/1个请求中取消AssertionError | 原AbortError名字例仍保留；非AbortError reason的真实controller独立判别 |
| clone终态503 Response | 17绿/1红 | 18绿/1红 | 旧已有保护，不领新缺口信用；当前两不同Response/精确引用更直接 |
| 默认retries改1 | 17绿/1个主耗尽例红 | 18绿/1个boundary耗尽例红 | 默认次数/消息oracle一对一转移 |
| 错将404当瞬态重试 | 17绿/1个主混合例红 | 18绿/1个独立404例红 | 原oracle一对一转移，独立输入轴更清楚 |

所有目标失败实际default reporter是恰一指定AssertionError，0skip/act/环境/stderr块；不是普通Error、导入错误或超时。旧局部V8已100%而前三变异仍全绿，覆盖率不能替代判别力。

## 测试域修正与初始候选

初始新增例将controller先abort，却要求底层必须被调用一次。这会拒绝合法取消预检。保存[初始候选](initial-candidate/README.md)，[scope-proof](scope-proof.json)只在临时生产副本多加一条合法init预检：初始19例18绿/1个该例AssertionError；最终19例全绿。

最终场景改为底层请求确实开始后，由真实controller取消并让IO以同reason拒绝，因此保留精确一次调用断言，同时允许未来实现做合法预检。没有将断言放宽为“至多一次”。修正后重新运行最终七轮反控/正常对照、list/V8、定向相邻与typecheck；旧before七轮原件未重跑或改写，初始after/包回执保留归属，不当最终源码验证。

## 身份、排重与局部覆盖

[collection](collection.json)原生list：main=5/10/2（缺3y的AbortError例）、旧3y/本片基点=6/10/2、最终=6/11/2；三快照字节差异见[snapshot](snapshot-comparison.json)。Node localeCompare/JSON.stringify identityDigest可另进程重建；main同数量不代表同身份。

主耗尽例的默认3attempt和“Failed to fetch”消息由boundary的三不同错误、最后对象及3次调用蕴含；原503/404例拆独立2例。所以族18→19并非无精简：一弱例转移、混合例1→2、增一独立取消域。各文件数量没有下降，不修改精确退役表；30项/net65、matcher/拒绝合同和官方baseline保持原字节。

真实fetch-retry.ts局部V8旧/新均statements33/33、functions5/5、branches41/41、lines29/29；不是官方ratchet/protected。[verify.py](verify.py)只读重建最终14业务/转移轮、2合法scope对照、5 list/V8、真实HTTP证据和完整包诊断原件，不冒充独立第三方。

## 真实取消风险与完整game门

[真实HTTP/原生fetch](real-abort-proof.json)在治理候选上观察到两个未覆盖域：init在503后的backoff中取消仍持有timer/Promise；已取消Request带自定义Error reason还走两次退避、三次底层调用。后者0条HTTP请求，不能把底层调用写成真实发包。最终server、global、timer均恢复；只拦截一个独有delay并手动释放，不等待该wall-clock值，不声称是浏览器/线上复测。[Fetch取消标准](https://fetch.spec.whatwg.org/#abort-fetch)与[旧71既定合同](../../../../archive/tasks/done/CODE-QUALITY-71-game-fetch-retry-abort-boundary.md)支持停止线；产品修复另卡准入。

三片game攒到这轮后完整运行一次：初始候选320文件3605 passed/0pending，但[17块stderr](game-diagnostics.json)涉及14份测试，故包质量未过。对应14源码与dfd03a811同SHA；只是输出定位，不等于全文核验或全部属于预期负例。转[game运行时诊断卡](../../../../tasks/QUALITY-GAME-RUNTIME-DIAGNOSTICS-1.md)draft，不能静音过滤、弱化fixture或改日志级别。

最终候选只修上述测试域约束后，实际[25文件156例、game typecheck、75覆盖工具](test-gates.json)均通过，零失败/跳过/运行时诊断；完整包未重复执行，原件保留在初始候选，不冒充最终源码的全包收口。docs/lint-zero/ledger/diff与源重建见[gates](gates.md)实际回执。

## 状态与下一批

本片0新增关闭。source旧关闭撤回rework、boundary旧关闭撤回review，其它两测试仍review；全83卡14partial/69pending/0整卡accept。统一check/official ratchet/protected未新跑，game诊断与editor最近全包诊断均未清，不合main。

下一有限片先以取消生命周期卡核失败反例与实现准入，恢复既有71合同；随后按2–4文件核game17块与editor余诊断，稳定窗口集中统一门和阶段集成。全部83卡及94–102/editor仍在范围内。无下一位Agent提示词，Codex单Agent继续。
