# 最近两百文件剩余项逐文件复核

Owner: Codex
Template: evidence-receipt-v1 / 1.0.0

## 任务与候选

[任务卡](../../tasks/QUALITY-RECENT-200-CONTENT-AUDIT-2.md)，基点6ebca402ae2c419ad9922f8d29097b45ea6a0df6，同一codex/code-quality-94-102分支，精确候选字节见audit与coverage-bindings；本回执在首次发布前冻结。

## 进度与范围

原200中前47保留有效证据，本窗口153完成全文八维及必要整改，累计200；固定排队0。每个主体、八维与准确读域见[audit.json](audit.json)，完整200身份/排队见[queue.json](queue.json)。枚举、依赖补读与新helper不充主体。

用户要求剩余全部复查，已核的不重做。原关闭信用只按实际缺口撤回/恢复，不重复加closed。商店与文本缺键的两项继承属性缺陷已获用户批准，正式红例先行；纯测试排重/断言与内部路径规则提取单列。战斗精灵声明帧风险仍按旧draft冻结，不改资源上限；变量编辑命令继承键观察尚未核实，不冒称已修。

## 证据与复验

默认只读：`node docs/ops/evidence/QUALITY-RECENT-200-CONTENT-AUDIT-2/verify.mjs`。核153当前主体/前47身份、原件字节、正式红例、指定反控及实际绿结果；不自动认证八维语义，不联网、不写文件、不跑测试/覆盖率。相关依赖/合同变化按audit内claim范围复核，不能仅凭主体SHA相同延续信用。

[native-index.json](native-index.json)逐附件索引[native.json.gz](native.json.gz)，保存完整stdout/stderr、原生file×fullName、执行元数据、producer及恢复证据。解包读取示例：`node --input-type=module -e "import fs from 'node:fs';import z from 'node:zlib';const d=JSON.parse(z.gunzipSync(fs.readFileSync('docs/ops/evidence/QUALITY-RECENT-200-CONTENT-AUDIT-2/native.json.gz')));process.stdout.write(d.files['content-package-final.stdout.raw'])"`。

## 验证与限制

content整包145文件/1473例通过、stderr空；随后仅将tileset快照改用现有helper，补跑该3例与content typecheck通过。reforge相邻7文件/36例、editor相邻6文件/31例，相关typecheck通过，均保留default reporter完整原件。当前改动20文件scoped Biome零诊断。本轮后续工具64、音频/偏好47、设备16、stats/hold27、播放器22与extract全包412均通过，原件保留。随后冻结执行全仓check、official coverage与protected集中门；最终结果及原始执行身份见下节，不授新视觉/E2E信用。

合并后main的[CI原始回执](main-ci.json)及两完整日志zip已保存：documentation40653820151、coverage40653820177成功，CRC与可见诊断计数均已核。其候选是基点6eb，不替代本轮未提交改动的门禁。

## 勘误与失败保留

曾误判旧test.each参数传错；实际删守卫反控旧8红推翻该判断，已公开撤回。已安装Vitest4.1.7根据整表是否全数组决定展开，旧混合表传完整条目；原生标题不能推出回调参数。真正补强是错误原因判别：把所有错误统一成数组错误时，旧11绿、新指定9业务红。两次producer失败（假设错误、引号语法）、typecheck的structuredClone失败、两格式诊断均保留原件；均未写成通过。首正式红例源码由固定基点加未变的两新增例重建，明确不是当时冻结原字节。

## 资源／编解码收尾与反控

保留同合同mkMkf调用名，改为共用binary-fixtures的mkfContainer；删除splash无caller私有blit和恒零时间偏移。相邻注释更正计时、默认跳过、MGO接入、可逆子集，未改游戏/格式/接口。PNG旧魔数检查加强为三槽完整尺寸/解码RGBA；事件重复startBattle例的命令/三操作数由KIMI完整双target及原字节例承接。精确测试映射见audit。

PNG反控首跑-t短词命中父describe，选5例，其中两个原盘摘要正常拒绝坏像素，不能当指定单红；v2用leaf全词限定旧1绿/新1业务红，恢复证据和完整原件在native归档。extract整包在反控前12秒结束，未遭临时变异影响。

## 集中门与发布边界

全仓check20506测试、七包typecheck及lint6191文件0/0/0通过。官方fast原流程完成shared/content后在pal-extract一条既有5000ms CLI例超时；保持源码/选择/期限，原parser/census复用前两报告，补跑该包356绿（原失败例4171ms）及未执行五包。所有包20157例／810源完成；content精确结构差异触发旧floor拒绝，按既有用户合理重计授权记录[五文件差异](coverage-recount.json)。两条新增退役快照和map当前快照见[精确合同映射](retirement-recount.json)。同报原生ratchet与protected最终均exit0、stderr空，11项实际指标提升保留，不改规则、选择、deadline或ignore，不再次采集。

一条既有CLI耗时波动的底层原因尚未确定，不声称已修其宿主。原件包含首次超时、恢复后的旧floor拒绝、首次对象/文件SHA口径误配拒绝与后续纠正；全部保留。main附件的完整四选中成员按ZIP Range取得并逐CRC校验，完整ZIP下载失败，不能声称整包SHA本地通过。

[coverage-replay.mjs](coverage-replay.mjs)只复用已冻结报告，正文从原runner逐声明/尾段抽取，正常比较不启动测试；只有显式--ratchet允许原writer写baseline。[coverage-bindings.json](coverage-bindings.json)绑定2458源/测试/guard输入，不授额外阅读信用。coverage-resume.mjs是重型历史producer，需显式--resume，日常只跑verify.mjs。代码完成／最后静态／远端PR分开记录；本回执未提前声明提交推送合并。

## 发布前最终静态回执

[集中门索引](gates.json)绑定完整原始执行：check20506、官方20157／810与同报ratchet/protected通过；最后check:docs、lint6195文件0error/0warning/0info、diff、账本及只读verify均通过。当前3464／797closed／0review／2667pending；原200不重复加closed，新增关闭仅内部路径helper1。受保护PR、推送和合并另据GitHub实际状态，本地通过不预授远端CI信用。
