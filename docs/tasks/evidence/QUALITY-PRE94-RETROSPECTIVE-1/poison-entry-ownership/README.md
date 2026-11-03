# 玩家毒入口的毒槽所有权修复

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是玩家毒入口毒槽所有权修复的治理候选页;原件为 Codex 单Agent 修复回执(原文 Status: recorded; code accepted, unified gates deferred)。[当前修复与回执](review.json)、[完整C／TS程序、正式红绿及命令双流](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/poison-entry-ownership/receipts.json.gz)、[初始停线探针](probe.json);probe.json 保留批准前状态,不代表当前尚未批准。

## 来源与输入

用户 call_331f12c139684e7b9b17c3e28ec9b529 批准毒入口槽位归属。正式 7 例先 3 绿/4 业务红、再 7 绿;四条通过真实玩家 opcode→同步入口核嵌套施毒、同毒有限递归去重、自解毒和卸 Wear 移动。入口异常例核撤销自己的占位、保留原空槽表示;不把入口当事务回滚。当前测试/旧源另冻字节复现同四红,恢复后 7 绿;只改成复制移动 packet 的反控恰一条续点业务红,恢复原件完整。

## 断言与业务 oracle

实现先占毒槽,续点归该记录;Wear 前移同一记录,清毒后不再把旧记录放回。保留全 16 槽去重、不丢洞后毒、role→队伍位置及原抗性/RNG 归属,不改 Save 或表格式。原 C 完整 PAL_AddPoisonForPlayer(1459–1517)由最小 globals/入口 stub 证明登记顺序,不冒称完整 C 解释器。普通原盘剧情/Save 自定义毒入口可达性仍未证明;探针为合成合法域(party=[2,0],TS slot1=null 对原生 O0/O2 双槽 552+553)。

## 结果

11 相邻文件 491 例及 game typecheck 零诊断;成功 stderr 0;初始错误/正式失败双流不裁剪。原文时点结论:代码接受、统一门延后。逐文件 A–H、版本桥与只读快检统一在[3o／3p代码验收](../mode-player-closeout/README.md)。本治理不重跑、不改写原判定。

## 限制与复核

无浏览器/原 EXE 复现;无 full check、coverage、protected 或 PR;全仓/coverage/protected 与单 PR 仍等全部 pre94;无浏览器/视觉或全仓完成信用。原件逐字节保全在下方;候选待Owner非作者接收。

原文存活链接原样保留:[README.md](../mode-player-closeout/README.md) [probe.json](probe.json) [receipts.json.gz](https://github.com/IllegalCreed/type-pal/blob/159cd0e2f8753536800ba4635e896020a897fddc/docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/poison-entry-ownership/receipts.json.gz) [review.json](review.json)。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1540B / SHA-256 c89560d688dcfa96285e32cd7842359ecfab5b973939e49b3e59db8007f07d2a；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# 玩家毒入口的毒槽所有权修复

Status: recorded; code accepted, unified gates deferred
Owner: Codex（单Agent，自审身份明确）

[当前修复与回执](review.json)、[完整C／TS程序、正式红绿及命令双流](receipts.json.gz)、[初始停线探针](probe.json)。probe.json保留批准前状态，不代表当前尚未批准。

用户call_331f12c139684e7b9b17c3e28ec9b529批准毒入口槽位归属。正式7例先3绿/4业务红，再7绿；四条通过真实玩家opcode→同步入口核嵌套施毒、同毒有限递归去重、自解毒和卸Wear移动。入口异常例核撤销自己的占位、保留原空槽表示；不把入口当事务回滚。当前测试/旧源另冻字节复现同四红，恢复后7绿；只改成复制移动packet的反控恰一条续点业务红，恢复原件完整。

实现先占毒槽，续点归该记录；Wear前移同一记录，清毒后不再把旧记录放回。保留全16槽去重、不丢洞后毒、role→队伍位置及原抗性/RNG归属，不改Save或表格式。原C完整PAL_AddPoisonForPlayer由最小globals/入口stub证明登记顺序，不冒称完整C解释器。普通原盘剧情/Save自定义毒入口可达性仍未证明。

11相邻文件491例及game typecheck零诊断；成功stderr0。初始错误/正式失败双流不裁剪。逐文件A–H、版本桥与只读快检统一在[3o／3p代码验收](../mode-player-closeout/README.md)。全仓/coverage/protected与单PR仍等全部pre94；无浏览器/视觉或全仓完成信用。
```
<!-- incremental-original-source:end -->
