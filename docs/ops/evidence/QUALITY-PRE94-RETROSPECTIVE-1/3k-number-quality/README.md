# CODE3k 数字布局、共享blit与非有限隔离

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-31
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「CODE3k 数字布局、共享blit与非有限隔离」的治理候选页;证据原件即下方逐字节保全的固定main源(2832B)。同一3y、Codex单Owner、基点f5457a14,main合并后两CI完整日志0诊断;复用[README.md](../present-primitives-quality/README.md)原primitive逐文件证据,只补number余项;有限窗口已接受(2026-10-24收口:2新关闭+5身份槽位刷新,67accept/16partial/0pending,3411tracked/420closed/99review/2892pending)。

## 来源与输入

来源为固定Git载体,非本次运行;原5链接处置见作者review的linkDisposition。当前存活入口:[review.json](review.json) [prove-blit.mjs](prove-blit.mjs) [verify.mjs](verify.mjs) [README.md](../present-primitives-quality/README.md) [GAME-DRAW-NUMBER-NONFINITE-1.md](../../../tasks/GAME-DRAW-NUMBER-NONFINITE-1.md)。三个当前实施文件=draw-number.ts、slots专测、新nonfinite专测;原8布局例与共享叶未改。

## 断言与业务 oracle

Infinity风险实证:有限base通过V1并保留到装备重算,再跑原盘43028-43031变身/buff片段可得Infinity,真实状态页被同步VM看门狗中断;普通剧情自然可达性未证、完整浏览器读档未跑;按[GAME-DRAW-NUMBER-NONFINITE-1.md](../../../tasks/GAME-DRAW-NUMBER-NONFINITE-1.md)用户批准『跳过异常数字』(call_edfe7d7f,2026-10-24)。判别力:两正式业务红后17数字绿;原5 slots在mask误判黑色时仍绿,补强后恰一C01 AssertionError,已完整恢复(testMapping:mask-old5/5绿、mask-new4/5仅G05-C01红)。纯共享提取与行为guard分提交;prove-blit.mjs默认只读语句证明旧私有blit与当前通用叶同体。

## 结果

定向13到17例、相邻16文件77例;完整check20576包例+700工具例、七包typecheck;唯一官方采集20147例/777源与同报告ratchet/strict protected通过,硬静态及运行0/0/0。首次全check在文档门停止(E2E006发布复核期限10-23到期):全文核现有阶段/报告/配对JSON/活动卡,三sourceRefs匹配,仅续下次发布/状态复核到10-31,rework、lastVerified10-03与历史执行字段不变,无新E2E/视觉信用;两次文档前置失败保留(第二次为续期引用的一层SHA漏更新),最终全部归零;复验脚本初版6个useTemplate info已按具体字符串改正,该次exit0不算零诊断。封存补核:旧SDLPal注释链接少一级../,已纠正为实际存在的根reference路径,commentDelta证明唯一差异、可执行字节不变。

## 限制与复核

未重跑;不扩94-102;E2E006仍rework无新增执行/视觉信用;发布状态按后继分支/PR回执。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2832B / SHA-256 eb47f12ab9a9650c387b7b8d1a7444d5d2f7d3e380f0c57c38bcbd2d698785c7；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3k 数字布局、共享blit与非有限隔离

同一3y，Codex单Owner，基点f5457a14；main合并后两CI完整日志0诊断。复用[原primitive逐文件证据](../present-primitives-quality/README.md)，只补number余项；有限窗口已接受，发布状态按后继分支/PR回执。

[五项逐文件A–H、实际读域/调用链与限制](review.json)，[默认只读语句证明](prove-blit.mjs)。三个当前实施文件为draw-number.ts、slots专测、新nonfinite专测；原8布局例与共享叶未改。

有限base通过V1并保留到装备重算，再跑原盘43028–43031变身/buff片段，可得Infinity；真实状态页被同步VM看门狗中断。普通剧情自然可达性未证；完整浏览器读档没有跑。[用户批准与风险卡](../../../tasks/GAME-DRAW-NUMBER-NONFINITE-1.md)。两正式业务红后17数字绿；原5slots在mask误判黑色时仍绿，补强后恰一C01 AssertionError，已完整恢复。

纯共享提取与行为guard分提交；全部相关切片完成后集中全仓/official/protected，本窗仅关闭两个已完成逐文件证据的路径。不扩94–102。

首次全check在文档门停止（尚未执行产品测试/coverage）：E2E006发布复核期限10-23到期。全文核现有阶段/报告/配对JSON/活动卡，三sourceRefs匹配；仅续下次发布/状态复核到10-31，rework、lastVerified10-03与历史执行字段不变，无新E2E/视觉信用。索引生成未产生差异。原拒绝完整保留。复验脚本初版6个useTemplate info已按具体字符串改正，不能把该次exit0算零诊断。

2026-10-24 CODE3k数字质量收口：2新关闭（draw-number与新nonfinite专测），5身份槽位专测刷新接受，原8例/共享叶及其它五primitive复用指纹证据。固定67accept/16partial/0pending；3411tracked/420closed/99review/2892pending。定向13→17、相邻16文件77例；完整check20576包例+700工具例、七包typecheck；唯一官方采集20147例/777源与同报告ratchet/strict protected通过，硬静态及运行0/0/0。纯blit复用与用户批准异常数值guard分提交，保存原红/反控/门禁失败原件，不扩94–102。

[默认只读复验](verify.mjs)核当前指纹、全部原件分片、原生红绿/反控身份与main CI日志；不重跑测试或覆盖率。完整集中门回执列于review.json的gateReceiptParts。两次文档前置失败保留，后一次为续期引用的一层SHA漏更新；最终全部归零。E2E006仍rework，无新增执行/视觉信用。

封存补核：旧SDLPal注释链接少一级../，已纠正为实际存在的根reference路径；其余源码字节与f2d4ba3b9完整候选一致。原冻结件/原件不重写，commentDelta说明唯一差异；复用同一覆盖率报告，最终Git候选/CI以后继回执为准。
```
<!-- incremental-original-source:end -->
