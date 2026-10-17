# CODE72 启动加载逐文件复审与错误态风险

基点 `0587d8714`，唯一 `codex/code-quality-3y`。Codex单一Owner，build allowed仅两份boot-loading测试及治理证据；实现/主入口/进度UI冻结。72由pending推进partial，不作整卡accept；新产品问题单列[高风险卡](../../../tasks/QUALITY-BOOT-FAILURE-PROGRESS-1.md)。

## 全文读取、真实caller与primary

[read-boundaries](read-boundaries.json)记149行实现、两测试、83行main、187行precache-ui及并行资源屏障/DOM骨架/真实caller的范围和SHA。primary为项目静态index.html与main的两段进度、onPlayable/失败和bootstrap资源屏障合同；SDLPal无同形浏览器加载UI，未改第一阶段机制。

实现包装fetch并finally记完成数；fallback DOM采用max(started,expected)分母、单调99封顶，finish才100并600ms移除；callback模式不写fallback DOM。restoreBootFetch停止计数/回调，主入口成功时调onPlayable。异步/所有权必须连main/进度UI一起核，不能只看本文件入口测试绿。

## 两测试的处理与排重

[contracts](contracts.json)人工列9+11条实际合同、合法输入、精确oracle、排重和隔离。保留20例：删除main弱重复失败提示用例，交由G09-C11的完整文案/错误类/同一root/释放包装核验；新增Request/init含headers/signal和Response身份透传。

主测试改typed fetch IO替身和受控16ms刷新，去除无谓核心强转；第二波请求用可完成的deferred并finally settle，新增实际4/8分母断言；finish细化599/600ms，缺overlay直接检查未包装身份，不再声称未实跑的SSR。afterEach释放callback、排空待渲染再清timer，避免模块rafPending跨例。host拒绝用例不再把resolve/reject都吞掉，而验证同一Error；RAF恢复原函数，虚拟timeout回调在finally也清理。DOM编码PNG只作数据IO见证，不赋浏览器视觉信用。

[before-proof](before-proof.json)、[after-proof](after-proof.json)与native/raw gzip保存command/cwd、exit/signal/spawn、完整file×fullName、正式源/测试/mutant hash及精确副本清理。三枚变异分别丢RequestInit、吞底层reject、固定分母：各旧20绿→新19绿/1个指定AssertionError；正式恢复20绿。未把collection/runtime错误或多红计有效针。

## 高风险直接反例与旧关闭撤回

[failure-repro](failure-repro.json)用真实公开boot-loading+precache-ui及typed在途fetch，先ui.fail后完成请求；当前DOM从“启动失败:主资源加载失败”变为“加载必要资源 50%”，恰一指定AssertionError。spec/native/raw/source SHA与清理原件齐全；不mock bootstrap核心，不声称完整main/HTTP/SW或浏览器现场。loader/resourcesReady的Promise.all与main PROD catch源码支持该可玩前时序。条宽、错误类和视觉未在这条红例断言。

生产未修。main和boot-loading保持review；precache-ui旧整文件“已验证”因直接counter撤回rework，原NaN窄修与原件不追溯抹除。boot-loading头注释仍有“分波会小幅回退/所有入口no-op”等与当前单调/恢复行为不一致表述，列待修，不把注释改写充当产品修复。高风险卡draft冻结生产，不能用本片测试修复绕过准入。

## 验证、账本与下一批

[test-gates](test-gates.json)：直接20例、precache UI及bootstrap相邻合计 **6 files / 54 tests passed**，0failed/pending/stderr；game typecheck通过。最终[static-gates](static-gates.json)记录docs/lint/ledger/diff。bug红例单独记录，不是正式门全绿或已修复声明。无新全仓check、official coverage ratchet、protected fast；旧53波次不认证本候选，昂贵门留模块收尾。

账本3312 tracked / 288 closed / 47 review / 2977 pending：两测试首次有直接证据+2closed，UI旧关闭撤回1，main/boot待审；83卡49partial/34pending/0accept。没有把54相邻例所涉其它文件关闭。下一批73 input四文件；本风险由专卡继续，94–102/editor优先顺序保持。

静态首轮：125文档工具测试和docs/model/testing/phase均通过；content-review因新增3i勘误的after SHA遗漏而失败。已保留失败raw，全文旧卡/四行新勘误核读后只更新该条记录和既有引用链；不以宽泛hash刷新冒充新验收。最终文档/lint复验见static-gates中的后续回执。

## 2026-10-18 用户批准后的窄修

[批准修复证据](approved-fix/README.md)替代上述“未修/冻结”的当前状态：三个生产文件按批准修复失败进度与计数ownership，四条先红后绿、相邻58绿/原红精确重放1绿、game typecheck及实际PROD失败/正常进场与看图完成。boot-loading.ts新增闭合，main/UI仍review，UI主测试新增review；289closed/47review/2976pending。旧counter和原NaN/测试历史原件保留，不把整卡升格accept。全仓check/ratchet/protected未运行，47–52旧门信用已撤回；下一步同片UI测试合同/隔离，再续73。
