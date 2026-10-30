# GA失败安装资源回滚（用户A裁决）

Status: recorded
Owner: Codex（单Agent实施/核证，不冒充第三方）
Date: 2026-10-18
Base: `31a6769e7d6cd0e3c02669e3827beb38e818ed4e`
Branch: `codex/code-quality-3y`

## 授权、合同和读取

[任务卡](../../tasks/GAME-ANALYTICS-FAILED-INSTALL-OWNERSHIP-1.md)用户明确选A：“失败即撤销本次监听和隐私控件，刷新页面后重试”。这是原pre94 3z发现的真实失败安装ownership修复；3w只读核验已暂停，没有混入结算改动。Google SDK命令合同与项目自己的错误/重试策略分开；本功能无SDLPal机制或二阶段对应。真实main启动catch、installer→consent/UI→GA、两源和专测/共享host均全文核读，见[当前边界](read-boundaries.json)与[基点字节](before.json)。旧OPS-GA4当前历史wrapper只提供可选能力不阻塞启动/consent意图，不授新产品范围。

## 问题和窄修

旧startGoogleAnalytics先取得consent/page释放函数，再apply初始授权；js/config或readPage异常导致没有stop句柄却留下订阅，安装器也没有撤销已装UI。现GA创建者在page订阅与初次apply阶段捕获错误、释放已取得的两个订阅再抛回；installer只撤自己创建的UI，原错误交main既有可选扩展隔离。正常授权、URL清洗、pathname去重、SDK脚本error重试及公共签名不改。只有两个实现与一个新正式测试；没有纯重构混批、规则/ignore新增、baseline/退役/schema/save/资产变化。

回滚范围是尚未返回controller的安装。已有SDK命令不可撤销，不清共享gtag/dataLayer、既有脚本或别的Owner资源；本片不把任意unsubscribe回调自身抛错、订阅源先注册后抛却不交句柄，或安装已返回后事件回调异常认证为已解决。生产consent释放是已全文核读的原生removeEventListener。没有实现B的同页自动重装/完整初始化重试状态机。

## 先红后绿和判别力

原正式4文件在产品修改前15绿/5指定业务AssertionError，0skip/pending/unhandled；第一版消息比较红件保留，随后错误对象identity加强的red-final仍15/5，且冻结了修前两源SHA/最终红测字节，见[先红记录](red-before-fix.json)。五个新case分别核js/config、page订阅失败、初次readPage失败及installer UI组合层；每层先核同一错误对象，再核真实释放和后续native事件静默，不用核心mock。完整raw/native保留。

首轮typecheck在新测试spy的显式泛型上报TS2344，原件保留为失败；改为实际spy类型推断和闭包恢复，没有cast/ignore/放宽规则。产品执行未随该测试修正改变；[当前精确spec回放](controls.json)只替换两旧源，五业务红再次成立，明确不是原时间顺序的第一次红。两个额外变异（page订阅移出事务、删除installer UI回滚）各完整5例4绿1指定AssertionError；不是从五个正式失败里筛单红。每次源/测字节finally恢复，自有临时目录精准清理。

最终7文件30绿（5新直接/25相邻），全case身份与原15保持；game typecheck最终零诊断。旧15/5/更早30绿raw与失败TC原件不改写成最终候选，实际结果见[gates](gates.json)和[合同/排重](test-contracts.json)。

## 实际功能验证

[browser原件](browser.json)：本地6005用actual installer/consent/UI模块和显式抛错/记录型SDK端口，无真实Google网络。失败页观察errorIdentity=true、无controller、privacyRoots=0，恢复SDK后deny/grant仍0命令；隔离进入按钮仍可点击。实际reload后返回controller、1root、js/config/page_view各一次，隐私按钮可打开真实面板。此入口是诊断宿主页，不是完整游戏启动或真实GA采集验收。错误/告警console空。自有cleanup按钮撤root、fixture源码恢复原consent key及probe session keys；AX保留的savedChoice/hasController是旧快照值，不冒充清理后实时值。截图留ignored build/dev-screenshots，raw AX压缩入证据，临时HTML和自有server/tab已移除/关闭。

## 账本与剩余

两个原源继续review，新测试仅review；0新增closed，3317 tracked /253 closed /99 review /2965 pending。pre94仍55partial/28pending/0accept，83对象与原历史卡SHA不改。本卡review等待统一门；不是专项完成。全仓check、official coverage ratchet、protected fast按用户成本要求留大任务窗口，不为这三文件重跑；docs125工具源码不变复用37e原件，本片仅实跑五消费者。未合main；下一步回3w结算实现/专测，随后94前其余卡，94–102/editor后置。无下一位Agent提示词。
