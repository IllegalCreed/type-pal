# Five remaining review files — responsibility and test-quality closeout

Status: current
Owner: Codex
Last reviewed: 2026-11-01
Template: evidence-receipt-v1 / 1.0.0

## 目的

用户要求处理最后五个review，按实际职责拆合，不只删cov85后缀。仍使用codex/code-quality-94-102；冻结输入为5e66fa6b6291f94330fb5d7fc9828062e0eb8a51，main同点，主工作树未动。五原文件3647行完整核读，生产实现不改；本地验收已完成，提交／CI／合并状态由治理PR发布回执记录，具体字节见[映射](mapping.json)。

## 范围

| 原文件（均为旧cov85专测） | 当前职责 |
| --- | --- |
| battle-opcodes | damage / status / control；仅前两者共用命令筛选 |
| battle-system | lifecycle / enemy-idle；两个消费者共用合法startBattle夹具 |
| event-opcode-player | attributes / equipment / status；复用现存hydrated工厂 |
| event-opcodes | battle-world fallback / 真正world party equipment refresh |
| menu-driver | trading / inventory / magic / system；共用数据与输入，不共享hooks |

结果是14个专测与3个夹具，不以移动路径数量冒称新审17个历史主体。既有宽域harness仍pending，不把它的旧命名一并升格。无产品行为、公共接口、存档或资源格式修改，无E2E/视觉验收信用。

## 执行与证据

- [逐文件A–H、读域、已有证据复用与问题处置](review.json)：每个输出独立判定；旧报告只复用明确版本/合同。
- [181原身份→177存活＋4退役](mapping.json)：153callback在有限私有helper命名映射后相同，24个明确输入/断言整改逐条说明。4退役分别由真实屏波交接、真实fade hold、选敌确认、等待落盘的保存强例承接。
- [完整依赖闭包](dependency-closures.json.gz)：测试、局部声明、imports和hooks；callback相同不代替fixture/cleanup审核。
- [当前环境及caller版本](context-pins.json)：指纹是身份，不冒称所有依赖本轮重新全文阅读。
- [完整原件](raw.json.gz)：base64保留stdout/stderr/native JSON/命令原始字节与SHA，含所有失败轮次；[反控补丁](flee-skip.patch)用于隔离树重放。
- [只读复验器](verify.mjs)：检查Git冻结输入、实际输出/依赖、完整身份与原始结果，正向及尾字段/断言缺调用负向自检共用同一比较器。

最终定向与相邻一次22文件950例通过，stderr空；其中177例是本次组织后专测。相邻原menu-driver主测有一条普通`[save] saved to slot 1(times=1)` stdout，明确披露，不是act/环境/静态诊断。本窗旧同步保存弱例已由等待真实落盘的强例承接；没有为了清输出静音整个console。

旧逃跑测试在真实“跳过玩家performFlee”变异下仍绿；新例恰一条因缺失失败演出而AssertionError。产品源恢复SHA精确相同。这是测试判别力反控，不伪造产品修前失败。非法属性行也补正实际role以到达它声称验证的守卫。

## 过程偏差与限制

首轮整理脚本的标题正则误删了数字括号，造成15条失败；已留失败候选及原件，从冻结输入重建并改用AST标题节点。失能占位的首次期望也有一条失败，随后核真实自动填充合同纠正。两次都未改产品。全部177身份和声明闭包已复验，不能把失败原件倒写为通过。

旧全量窗口的证明仍针对其冻结版本；本包是显式继任映射，不修改其数百项pin。无关pending和主工作树改动不纳入本次。后续实现、caller、依赖、输入域或合同变化时只重核受影响claim。

## 收尾文档组织修复

全仓测试与七包typecheck完成后，末尾lint发现回执格式与R93审查账超出既有1MiB限制。仅将三个活动ops投影记录完整移至现有R94机器回执账，保持全部140条记录逐字段相等，并更新三条registry路由；未改规则、ignore或大小上限。[迁移证明](projection-move.json)和[迁移前原件](pre-projection-move.json.gz)保留事实。格式整改后lint为6319文件0/0/0；首次失败不写成全量一次通过，最终由原完整检查加受影响门补验收束。

最终文档门曾在临时Git夹具的`hash-object --stdin`进程停滞；采样及原件保留，只终止自有子进程。原命令重跑131工具例通过，随后检查指出done卡应退出活动看板并重新生成索引，已按现有生成器修正；后续只补验受影响静态文档门。独立diff检查另指出反控patch的空白上下文行，缩短同一有效hunk后`git apply --check`和diff均通过。以上均不改变源码／测试或验证规则。

## 复验与下一步

在仓库根运行：

```sh
node docs/ops/evidence/QUALITY-NAMING-ORGANIZATION-1/remaining-five/verify.mjs
```

预期5输入、17输出、177mapped、4retired、153callbackExact、3比较器自检；默认零写入。语义结论仍需阅读review.json，机器不会自动证明八维设计。

五文件代码复审完成后才集中执行全仓check、唯一官方coverage采集、同报告ratchet/protected及lint/docs。本地统一门由[gates.json](gates.json)及[完整未裁剪原件](gates.raw.json.gz)记录。全仓20,544测试与七包typecheck通过；首个check命令末尾lint失败和文档修复后的补验分别保留。单次官方fast20,195／815源码，ratchet及同报告protected通过，零诊断。三个共用夹具增加覆盖分母，旧源码计数全部保持，baseline只上调、无规则或排除变化。最终账本3459／827closed／0review／2632pending；5原主体不因17输出而多计原文件审查信用。发布状态由同一治理分支PR记录，不将尚未发生的CI／合并写成成功。
