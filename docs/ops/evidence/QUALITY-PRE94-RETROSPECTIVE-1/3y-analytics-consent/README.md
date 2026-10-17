# CODE-QUALITY-3y analytics consent当前复审

Status: recorded
Owner: Codex（单Agent，自身源码/测试核证，不冒充第三方）
Date: 2026-10-18
Base: `28fcfbe310815bcfd712b2f3da1849e0f4076092`
Branch: `codex/code-quality-3y`

## 身份、准入与逐文件读取

id: QUALITY-PRE94-RETROSPECTIVE-1 / 3y-analytics-consent；schemaVersion:1；status:recorded。沿用[父卡](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)低风险注释/测试准入。旧卡CODE-QUALITY-3y与治理分支同名是两个身份；本片非CODE109后续范围扩张。三原文件90/57/71行全文；安装器/两消费端/主入口及四相邻测试、OPS/宿主历史卡全文见[实际边界](read-boundaries.json)。未把旧done或未成功的protected结果继承为当前accept。

## Primary、caller、ownership与实现结论

这是第一阶段项目扩展，SDLPal无此UI/统计功能；不伪造原版依据。OPS-GA4历史basic-consent意图与当前typed端口为项目合同来源，不沿用旧签字/法律断语。main只在页面入口安装并隔离异常；install将真实window/document/storage注入UI和GA，未传subscribePage；当前main未持有installation是页面生命周期，测试须自己destroy。UI选择先write成功才隐藏面板；GA订阅真实consent事件并在非granted时停发，生产消费者使用同一window。无任何游戏状态/存档/输入订阅。

consent源纯读写与事件端口边界清楚，存储缺失/读异常/非法外部stored值归unset，DNT='1'/GPC=true只给无选择者默认denied。存储写失败返回false且不广播；成功写后同步广播，广播异常吞掉且仍true。源码旧“广播异常仍失败关闭”无充分支持，改成只描述已提交且不保证订阅者收通知；[parsedTS/JS证明](emit-identity.json)相同，产品执行未改。未更改隐私策略、GA网络、UI形态、schema/save、资产或公共接口。

## 测试问题、修复与排重

旧主测清空全部localStorage，订阅无finally；H04有as never/unknown双强转、标题称无window却没执行、默认宿主只typeof boolean，混放dispatch失败与stored-denied，读异常/非法事件重复。现两文件只保存/恢复自有持久键；订阅/spy/window模拟精确finally清理。getter的never返回类型是合法拒绝访问IO，直接满足Pick<Window,'localStorage'>；EventTarget保持真实，仅模拟宿主dispatch异常。没有核心mock、强转、ignore/降规则或放宽断言。

主测3例：独立持久键/合法两态/未知或抛错读；默认真实Storage+window的granted/denied写入，listener在通知当场读到提交值；信号真假、DNT与GPC单独fallback、保存的granted/denied均优先。H04从3拆成4例：实际无window/属性拒绝、写失败false且零广播、广播失败true且精确写键值、真实未知事件与unsubscribe后零回调。[逐断言迁移](assertion-transfers.json)保留原有效合同；不同异常文案/无效detail字面值因同一catch-all/二值membership条件归并，不按测试名相似臆断等价。没有整例退役或baseline/测试catalog改动；历史报告与SHA保留。

[五反控](controls.json)全文件未过滤：先通知后持久化、DNT='0'误识别、默认写宿主丢失，各旧主3绿→新主2绿1指定AssertionError；写失败仍通知、无window回退全局storage，各旧H04 3绿→新H04 3绿1指定AssertionError。native完整file×fullName/JSON/raw/command/cwd/exit/signal/spawn和源/测试/mutant SHA、逐轮finally恢复与精确临时树清理均保留。正常恢复7定向+17相邻（6文件24绿）、game typecheck零诊断；jsdom未执行真实Google端点，不以DOM script断言冒充实网/生产采集验收。

## 当前状态、门与限制

三路径此前未在live表登记，按真实tracked库存属于pending；本次只pending→review，不是撤销三个既有关闭。最终机器3315 tracked /261 closed /85 review /2969 pending，0新closed。只CODE-QUALITY-3y从pending→partial；83卡52partial/31pending/0accept，scopeConfirmed=false和currentAcceptance=false保留，其他82对象/历史SHA完全不改。旧历史卡继续原路径/原done时点，不恢复新门。

[门回执](gates.json)保留完整未裁剪gzip原件与实际诊断。全仓check、official coverage ratchet、protected fast按用户成本规则留大任务收尾；本片不跑全包/生产部署/浏览器视觉/E2E，不合main。全仓现有诊断与其它pending并未由本片消除。

未验证仍有跨window/realm与非默认storage注入组合、广播失败时现存GA订阅的端到端一致性、真实存储策略/浏览器/网络行为及完整UI卸载。当前同窗生产caller未发现本片可直接修复的新执行缺陷；未知不当已验证，也不修政策或接口。重复的小型测试自有键hooks暂留各文件owner；更大的宿主复用须先核UI/GA不同全局清理域，不为了抽象扩大白名单。

## 交接与下一批

同一治理分支提交推送、fresh fetch确认0behind；三源/测继续review，不将静态绿数写成整卡accept。下一批CODE-QUALITY-3z：google-analytics.ts与两专测，重点订阅/全局恢复、UTM坏注、异步script生命周期和真实consumer；GA/隐私/网络行为若需改，先专卡裁决。94–102/editor后置，无下一位Agent提示词，Codex继续全部83卡。

静态门过程：首次pnpm check:docs工具125全通过，随后因父导航漏链exit1；docs.raw.gz原件保留。补导航后仅重放五个实际消费者，不重复125，不把原exit1改成通过。最终消费者与lint结果逐项见gates；统一门和实网仍未运行。

宿主精度：本片“真实Storage/window/EventTarget”指正式game jsdom runner的实际DOM/存储实现及真实SUT接线；不表示独立浏览器或生产端实跑。相邻GA/UI测试也只按此范围记证据。
