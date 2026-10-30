# 玩家毒入口的毒槽所有权修复

Status: recorded; code accepted, unified gates deferred
Owner: Codex（单Agent，自审身份明确）

[当前修复与回执](review.json)、[完整C／TS程序、正式红绿及命令双流](receipts.json.gz)、[初始停线探针](probe.json)。probe.json保留批准前状态，不代表当前尚未批准。

用户call_331f12c139684e7b9b17c3e28ec9b529批准毒入口槽位归属。正式7例先3绿/4业务红，再7绿；四条通过真实玩家opcode→同步入口核嵌套施毒、同毒有限递归去重、自解毒和卸Wear移动。入口异常例核撤销自己的占位、保留原空槽表示；不把入口当事务回滚。当前测试/旧源另冻字节复现同四红，恢复后7绿；只改成复制移动packet的反控恰一条续点业务红，恢复原件完整。

实现先占毒槽，续点归该记录；Wear前移同一记录，清毒后不再把旧记录放回。保留全16槽去重、不丢洞后毒、role→队伍位置及原抗性/RNG归属，不改Save或表格式。原C完整PAL_AddPoisonForPlayer由最小globals/入口stub证明登记顺序，不冒称完整C解释器。普通原盘剧情/Save自定义毒入口可达性仍未证明。

11相邻文件491例及game typecheck零诊断；成功stderr0。初始错误/正式失败双流不裁剪。逐文件A–H、版本桥与只读快检统一在[3o／3p代码验收](../mode-player-closeout/README.md)。全仓/coverage/protected与单PR仍等全部pre94；无浏览器/视觉或全仓完成信用。
