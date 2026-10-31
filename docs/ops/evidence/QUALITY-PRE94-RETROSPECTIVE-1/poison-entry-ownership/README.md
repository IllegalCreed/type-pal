# 玩家毒入口的毒槽所有权修复

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「玩家毒入口的毒槽所有权修复」的治理候选页;证据原件即下方逐字节保全的固定main源(1540B,SHA c89560d688dc)。

## 来源与输入

来源为固定Git载体,非本次运行;原4个链接处置见作者review的linkDisposition。当前存活入口:[README.md](../mode-player-closeout/README.md)、[probe.json](probe.json)、[receipts.json.gz](receipts.json.gz)、[review.json](review.json)

## 断言与业务 oracle

文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


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
