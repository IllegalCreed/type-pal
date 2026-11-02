# CODE3切分复审与CLI world写出阶段

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「CODE3切分复审与CLI world写出阶段」的治理候选页;证据原件即下方逐字节保全的固定main源(2226B,SHA eadcac62925d)。本页语义:2026-10-24,base 90506b7/codeHead 3a1335e,只接受CODE3原slice/annotate范围与独立world阶段;整CLI/CODE3g不关闭;named scopes内代码接受,最终统一pre94门前所有全仓/official/protected/新PR不跑。历史验收时点,不重开任务。

## 来源与输入

来源为固定Git载体,非本次运行;原4个链接处置见作者review的linkDisposition。当前存活入口:[receipts.json.gz](receipts.json.gz) [review.json](review.json) [static.json](static.json) [verify.mjs](verify.mjs)。九文件A-H、版本桥与限制见review;完整原件/程序与失败版本在receipts;合并候选静态门见static。

## 断言与业务 oracle

文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。本页真实oracle事实:(1)Kimi/global与runtime原身份不增减(slice 35+kimi 11+runtimeResource 3,added/deleted=0);全end数量oracle补为具体脚本地址。(2)故意让global入口误落0号,仅指定原case反控:旧绿、新一条AssertionError红;其它case同样被筛选,不能写成旧全套误绿。(3)正式四切分文件35例零skip/零可见诊断;六真实隔离CLI基线后六文件39例相邻绿,extract typecheck与局部静态0;6子进程原始输出附齐,其它5套件只有完整Vitest原件。(4)CLI地图/逐场景/全局EO输出移到resources/world-assets.ts,五参明确根与数据、无反向CLI依赖;精确阶段+四helper+全CLI还原+实际导入绑定证明通过;两次校验器失败(AST位置失配/属性名误替换)原样保留。(5)schema跨文件goto是合法Command值,负入口/缺resetTo/EO越界只认证helper防御。(6)main估计CC66→55、world为12,数字仅阅读线索。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;不产生新执行结果。批结论:CODE3九文件代码接受,world-assets.ts入账;master派生汇总曾滞后(实际74/9,缓存72/11)按实际卡重算为75/8/0并留勘误;合并候选静态门13项全过、lint 6010文件零诊断、六真实文档消费者PASS、125未变docs工具复用不重跑;master格式拒绝与证据工具6info均保留未静音;main来向仅README+4截图,合并提交在静态门之后。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。原文明示:无完整真实raw CLI抽取(仅合成全管线/负资源fixture),data/raw所有权未动;无原子目录事务/fallback策略/schema重设计;CLI剩余数据表/RNG/FIRE/精灵/声音/背景编排仍rework,CODE3g仍partial;剩余规则与IO按实际合同继续治理,不能以函数变短收整卡;未改原盘/生成物/失败策略/Save/schema,94–102不扩。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2226B / SHA-256 eadcac62925d384df731f2064699bdf31c9e484548e8e8c2e101016b81d0b137；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3切分复审与CLI world写出阶段

Status: code accepted within named scopes; CODE3g remains partial
Owner: Codex（单Agent，自审身份明确）

[逐文件A–H、版本桥与限制](review.json)、[完整原件/程序与失败版本](receipts.json.gz)、[默认只读快检](verify.mjs)。只接受CODE3原slice/annotate范围与独立world阶段；整CLI/3g不关闭，全部pre94完成前不跑全仓/official/protected或新PR。

Kimi/global与runtime原身份不增减；全end数量oracle补为具体脚本地址。故意让global入口误落0号，仅指定原case反控：旧绿、新一条AssertionError红；其它case同样被筛选，不能写成旧全套误绿。正式四切分文件35例零skip/零可见诊断，既有A2/reset/auto、metadata/计数与P3红绿复用。schema的跨文件goto是合法Command值，负入口/缺resetTo/EO越界只认证helper防御，不冒称原盘或disasm会产生。

CLI中的地图/逐场景/全局EO输出移到resources/world-assets.ts，五参明确根与数据、无反向CLI依赖；输出清理/预检仍由总装持有。精确阶段+四helper+全CLI还原+实际导入绑定证明通过；先前AST位置/属性名两次校验器失败原样保留，不当产品红或通过。六真实隔离CLI基线后，六文件39例相邻绿、extract TC及局部静态0；6子进程原始输出附齐，其它5套件只有完整Vitest原件，不冒称另存所有child。

世界阶段注释只留格式/索引/ownership约束。main估计CC66→55，world为12；数字仅阅读线索。剩余数据表、RNG/FIRE/精灵/声音/背景的规则与IO仍需按实际合同继续治理，不能以函数变短收整卡。未改原盘、生成物、失败策略、Save/schema或94–102。

[合并候选的静态门与完整原件](static.json)：六实际文档消费者、ledger/diff及lint-zero均通过；lint6009文件，0error/0warning/0info。master格式拒绝与证据工具6info均保留，未静音。main的README/4截图增量无产品blob变化，不重跑35/39或TC。

最终delivery lint包含新增manifest/检查器共6010文件，仍0/0/0；只读快检同时核83卡身份、派生汇总和最新增量快照，防止再次缓存滞后。
```
<!-- incremental-original-source:end -->
