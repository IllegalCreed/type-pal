# CODE1：PAL来源读取修复与代码范围收口

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-31
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

用户批准原盘精灵读取修复（call_50e2479c：仅PAL/legacy来源读取，author格式与全部资产/save字节不变）后的CODE1有限代码范围收口（2026-10-25，基点9d57b2f33，candidate为明确指纹的未提交源码差异）。[review.json](review.json)、[receipts.json.gz](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/code1-closeout/pal-source-fix/receipts.json.gz)、[verify.mjs](verify.mjs)。工程4文件/Q1b 539JSON与119语句84断言、旧RLE59例质量复用有效版本，未重做整批审查。

## 来源与输入

修复内容：先补现有legacy公共入口两个业务AssertionError，新增明确PAL入口按来源处理WORD特殊偏移（0x18444→0x8444）与高位literal；作者canonical偏移/跨行游程/编码器保持。最终同一4例对精确旧源加三个名字alias仍两红两绿（alias不改旧函数体，临时副本finally清理）；两author正控防止把PAL规则错误扩到自建格式。验证：6shared文件63例、8extract文件42例、3game文件16例、3Reforge文件25例、2migrate文件18例共164不同合同通过，四受影响包TC零诊断。

## 断言与业务 oracle

- 1428个选定原盘记录的旧TS平面摘要仅MGO571增加一帧（DATA仅9/10/12）；两新完整平面对既存未改原生C goldens吻合；不宣称所有raw/native/原EXE等价。真实Reforge origin选择对原始571得到两帧/0坏尾。
- 真实Chrome loadSpriteFramesBlob→playEndingAnimation第200步与原C第二帧SHA完全相同、23036非零像素、0浏览器诊断（浏览器/自有Vite已关闭）；见[ending-fixed.png](ending-fixed.png)，只是隔离妖兽层，不是完整普通剧情结局E2E。
- 实际生产CLI的MGO/F/ABC三个写出阶段在独占新temp执行，两遍共809产物逐字节相同并与当前extracted原件相同，第二遍零diff；现有636+172迁移物化测试第二遍零写。只有源事实从4133/30更正4134/29；bytes/tuple digest/catalog、raw、extracted及projects字节均未改，不用生成物修补上游。
- 保留边界：O1分配策略/O2过短RangeError保持原策略；O3来源特例已修（无571运行时ID分支）；O4旧九退役映射保留。resources/sprite的extractCharacterSprites额外公开包装只有测试caller，原可选退役候选不借本次来源授权擅删，整文件维持review；广域migrate三文件只接受delta、仍pending。

## 结果

rle.ts与新pal专测闭合、parser-diagnostics完整核验后新闭合、已有转发/运输/map范围刷新——11文件三档裁定见review.json。CODE1原卡有限范围代码接受，pre94固定83卡原范围83代码accept；这是审查范围结论，全仓check、official coverage/protected、远端CI与唯一PR/合并另记。量化初筛（TS AST自有分支估计，非标准测评门）：decodeRleFrame17、strict-frame15、strict-container12、indexed26均>10标记，只抽取确有两个消费者的来源判定，不为降数字合并不同失败合同。

## 限制与复核

复验器只读Git/文件/原件：版本不符STALE、输入缺失UNAVAILABLE(3)、断言失败非0；核原件字段与精确失败身份，不信作者passed字段；MATCH只支持所列可执行证据，八维语义仍依已记录人工审查，统一门不由本脚本认证。披露：新shared专测误用Node crypto导致一次TC失败，按浏览器包边界删除依赖而未改types/规则；首次census产生者误读archive envelope保留失败原件；最终发布者先猜缺失config停止（record-missing-config.py保留）后按实际config修复。若来源、caller、格式、原生/author输入或依赖变化，只复核受影响claim；静态/统一门原件在最终窗口另行附录，不把延后说成通过；94–102不扩。本治理候选不重开任务、不重跑执行、不授新信用。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 4026B / SHA-256 2a685914274087e9c3bc4436aa7c39efd2b4956a3e7a814b69ca58add3d2f261；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE1：PAL来源读取修复与代码范围收口

Status: finite CODE1 code scope accepted; unified pre94 gates deferred
Owner: Codex（单Agent，自审身份明确）

[11文件逐项八维、来源、授权与保留域](review.json)、[完整未裁剪红／绿／native／产生者与失败原件](receipts.json.gz)、[默认只读快检](verify.mjs)。基点9d57b2f33，candidate为明确指纹的源码差异；Git提交后由沿革定位。工程4文件/Q1b539JSON与119语句84断言、旧RLE59例质量复用有效版本，未重做整批审查。

用户批准原盘读取修复后，先补现有legacy公共入口两个业务AssertionError；新增明确PAL入口，按来源处理WORD特殊偏移与高位literal。作者canonical偏移/跨行游程/编码器保持。最终同一4例对精确旧源加三个名字alias仍两红两绿；alias不改旧函数体，临时副本finally清理。两author正控防止把PAL规则错误扩到自建格式。

6shared文件63例、8extract文件42例、3game文件16例、3Reforge文件25例、2migrate文件18例，共164不同合同通过；四受影响包TC零诊断。1428个选定原盘记录的旧TS平面摘要仅MGO571增加一帧（DATA仅9/10/12）；两新完整平面对既存未改原生C goldens吻合。不宣称所有raw/native/原EXE等价。真实Reforge origin选择对原始571得到两帧/0坏尾，同一公共入口仍完整读取author大偏移。

真实Chrome loadSpriteFramesBlob→playEndingAnimation第200步与原C第二帧SHA完全相同，23036非零像素、0浏览器诊断，浏览器/自有Vite已关闭。见[本次真实Canvas](ending-fixed.png)；只是隔离妖兽层，不是完整普通剧情结局E2E。

实际生产CLI的MGO/F/ABC三个写出阶段在独占新temp执行，两遍共809产物逐字节相同，并与当前extracted原件相同；第二遍零diff，temp已清理。现有636+172迁移物化测试第二遍零写。只有源事实从4133/30更正4134/29；bytes/tuple digest/catalog、raw、extracted及projects字节均未改，不用生成物修补上游。

rle.ts与新pal专测闭合，parser-diagnostics完整核验后新闭合；已有转发/运输/map范围刷新。resources/sprite的额外公开包装只有测试caller，原可选退役候选不借本次来源授权擅删，整文件维持review；广域migrate三文件只接受delta、仍pending。O1分配策略/O2过短RangeError保留具体边界，O3来源特例已修、O4旧九退役映射保留，不把候选或全包绿强制改成已验证。

CODE1原卡有限范围代码接受，pre94固定83卡原范围83代码accept；这是审查范围结论，全仓check、official coverage/protected、远端CI与唯一PR/合并另记。若来源、caller、格式、原生/author输入或依赖变化，快检返回STALE并只复核受影响claim，94–102不扩。

新shared专测误用Node crypto导致一次TC失败，按浏览器包边界删除依赖而未改types/规则；首次census产生者误读archive envelope也保留失败与原产生者。新author标题据实际语义收窄，字节指纹仍由未变encoder及旧domain原件支撑。静态／统一门原件在最终窗口另行附录，不把延后说成通过。

量化初筛用已安装TypeScript AST自有分支估计（非标准测评门）：decodeRleFrame17、strict-frame15、strict-container12、indexed26，均标记>10；对应实际流推进、有限边界/失败与历史坏尾验证。此轮只抽取确有两个消费者的来源判定，不为降数字合并不同失败合同或新增碎片策略；完整口径和结果在原件complexity.json。

复验器另行核过：只读Git/文件/原件，版本不符STALE、输入缺失UNAVAILABLE(3)、断言失败非0；不修改候选/联网/重跑测试。核原件字段与精确失败身份，不信作者passed字段；539输入和实际caller一起绑定，无自嵌JSON哈希/忽略。MATCH只支持所列可执行证据，八维语义仍依已记录人工审查，统一门不由本脚本认证。
```
<!-- incremental-original-source:end -->
