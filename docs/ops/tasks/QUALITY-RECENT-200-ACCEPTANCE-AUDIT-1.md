# QUALITY-RECENT-200-ACCEPTANCE-AUDIT-1 — 两百文件回执返工与风险抽核

Status: done
Owner: Codex
Reviewer: Codex（单Agent；本次实际抽核与既有证据复用分别记录）
Phase: ops
Capability: code-quality
Visual Verification Timing: N/A（源码、合同与必要软件测试；不授新视觉/E2E信用）
Branch: codex/code-quality-94-102

## 目标

落实用户2026-10-28指令：修好第一窗口已发现的问题，再抽核最近200个快速完成文件的质量信用。结论必须能低成本定位实际代码、caller、oracle及未知，不能由模板、指纹或绿门自动获得。

## 范围

第一窗口资产/渲染整片30文件，以及追加24个风险样本；两者重叠8个，合计46个既有主体，清单见[审查索引](../evidence/QUALITY-RECENT-200-ACCEPTANCE-AUDIT-1/audit.json)。此前15测试与7夹具的全文读域只有在版本匹配、具体claim仍成立时复用。额外样本涵盖覆盖率worker/IO、原盘表和YJ2夹具、生产音频/输入生命周期、作者内容校验、长测试与演出专测。

写白名单：这46文件内必要的注释/测试/测试夹具整改、原证据及本卡/中央账本投影；产品行为、schema/save/资产与公共接口的新取舍单项停止。实际重要缺口扩核同模块；不是随机统计抽样，不外推其余154文件全部合格。新增关闭信用为0，已审文件不重复充数。

## 前提真值门

工程前提：已合并与全绿不足以证明八维合格，已发现15份C–H模板化及7份记录局部事实错误。最强替代解释是共享合同允许复用描述、生产caller可与测试入口不同；须核具体字段，不能仅凭相同措辞判代码缺陷。版本基点b8b6989b952968ab60108ae45842ae5689822925，当前只有5份属于本线的证据WIP，已无损备份；主树只读。首次新fetch TLS失败不冒称已同步，发布前继续重试。

本卡授权审查和有限质量整改；涉及行为/格式的新反例另开高风险卡并停受影响文件。第一阶段SDLPal证据与第二阶段canonical合同分用；既有真值可按版本复用，不重推已支撑机制。

## 上下文锚点

[长期八维](../code-quality.md)、[工作流](../agent-workflow.md)、[原资产/渲染任务](QUALITY-GAME-ASSET-RENDER-TESTS-1.md)、[首窗口](QUALITY-PENDING-100-1.md)、[第二窗口](QUALITY-PENDING-100-2.md)、[本次证据入口](../evidence/QUALITY-RECENT-200-ACCEPTANCE-AUDIT-1/README.md)。

## 验证

逐文件全文或明确版本限定的既有全文读域；实际生产出口/相邻类型/生命周期、A–H、逐例oracle/合法输入/排重和清理。原始失败保留，反控只在判别力缺口需要时执行。修复文档运行docs/lint/diff及只读证据核验；代码/测试改变按影响范围集中定向/相邻及typecheck。可靠未变候选结果复用，重型check/coverage仅在本次稳定收尾确有必要时集中运行，不为每片反复收集。受保护PR所需远端检查照常，不绕过main。

## 当前模式推进记录

2026-10-28 Codex build allowed：同一隔离分支、单一Owner、以上有限白名单；其它活跃剧情/英文/实体预览/回合边界任务不写。任务仍build，旧卡done不代替本轮结论；发现关键未修项须在账本恢复review。

## 交接

本次先修第一窗口5份补证，再核追加样本；审查结论、质量门和提交/合并分开登记。incoming-five.tar.gz与指纹保存在本机任务外部证据目录，原始已合入raw不改。

## 下一位 Agent 提示词

无下一位Agent提示词。当前Codex单Agent持续完成本有限任务；真实风险只暂停受影响文件，不扩大为下一批pending治理。

## 夹具职责扩核准入

同域构造重复已由两源全文与22个实际消费者核定。Codex build allowed追加旧boot legal夹具（200主体内）和loader legal-host（相邻依赖）：将前者移为语义目录asset-fixtures.ts，共享Palette/Tilemap/EventObject/SceneAssets及两帧构造；所有旧boot导入点同步，loader IO host保留自己的装配/HTTP职责。移动不新增关闭；保留不同失败消息的PNG宿主构造，不用模式参数硬合。缓存D01与主测不同，予以保留；不因形似减少用例。

## 本轮审查已冻结与后续建议

原46主体加同域旧boot夹具1，共47个最近200主体，另loader HTTP宿主1个不计主体。具体结论/47当前指纹与局限见audit.json；两百份回执机械初筛见screen-200.json，仅提供候选，不授语义信用。七组重复描述来自必要worker/environment输入，不据措辞自动返工。已修五类问题：15份C–H与九项事实勘误、构造重复、对话继承键漏拒绝、present位置判别、FrameSequence无用异步暂存。

用户询问是否还需扩抽：结论是需要，建议再核约20个高风险文件，优先同类引用/字典、共用夹具、presence-only/self-derived oracle与最大/最泛化回执；再发现同族实质问题即扩到模块。此建议不是本回执已执行20文件；未抽153不认证，不宣称200全面可靠。当前47整改在一次集中门禁窗口收尾。

## 本地收口（2026-10-28）

Codex独立验收：本卡有限范围代码/证据接受。全仓20506包测试与七包typecheck通过，lint完整0/0/0；一次官方fast20157/809，ratchet和同报protected均0，指标无下降，源范围不移除。原件见[门禁回执](../evidence/QUALITY-RECENT-200-ACCEPTANCE-AUDIT-1/gates.json)。文档最终投影已单列零诊断复核，随后同分支分开纯测试重构与获批产品修复提交；推送/PR/合并未由此段冒称完成。后续扩抽建议不算本卡已执行。
