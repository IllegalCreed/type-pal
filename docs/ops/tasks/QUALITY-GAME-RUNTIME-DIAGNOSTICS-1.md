# QUALITY-GAME-RUNTIME-DIAGNOSTICS-1 — game包17块运行时诊断核清

Status: draft
Owner: Codex
Reviewer: Codex（当前原生输出核验，不冒充第三方）
Phase: phase1 game
Capability: runtime diagnostics / fixture and IO oracle quality
Visual Verification Timing: 先代码/测试定位；功能UI必要时最小验证，剧情视觉集中E2E

## 当前事实与范围

dfd03a811上的fetch三测试初始候选进行了game完整包验证，原生320文件/3605例通过、0失败/跳过，但完整输出17块stderr，因此不算包级质量验收。之后仅修正fetch新取消例的测试域约束；这17块对应的14份测试源码均逐字节等于dfd03a811，原件不会被该修正抹掉或升级为已清零。

[原生诊断清单与源SHA](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/fetch-retry/game-diagnostics.json)列完整header/body、14路径和当前阅读边界；[完整包回执](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/3h/fetch-retry/initial-candidate/test-gates.json)及game-full的raw/JSON保存原始执行。当前只核输出，未全文审14文件，未判断每项都只是预期负例，也未给任何文件accept。

涉及event-system/scene/mode、magic/equipment脚本、战斗fixture、AVI/RNG/precache。实际文本同时有预期缺label/IO失败和疑似错误fixture（缺current EO、未知enemy等）；归因必须逐file、真实caller/typed状态与primary核实，不以stderr计数代替语义。

## 后续有限准入前提

- 先核看板/当前卡与活跃GLM、ED Owner，挑2–4个相关且不重叠文件；完整读测试和真实caller/oracle后另记build allowed，本draft没有实现授权。
- 合法业务正例因fixture缺字段而触发warn时先修fixture；预期负面IO必须核完整记录、实参/错误身份与隔离，不能全局静音console、过滤未知输出或改生产日志级别。
- 异步任务须真实entered/结局、取消/卸载与失败路径清理；同步Console合同不能冒充异步IO收尾。少量高判别力反例与排重，不靠数量/覆盖率收口。
- 若发现第一阶段机制、公共接口、schema/save/资源或产品行为风险，停该项专卡核真值，不借诊断清理改产品。
- 相邻/包/typecheck/静态门与统一check/ratchet/protected要核完整输出；退出0仍有诊断不通过。历史raw/计数不改写为零。

## 当前结论与交接

17块未清，保留draft；与editor全包诊断共同阻塞统一质量门，未合main、0新增文件关闭。fetch取消产品风险另归[生命周期卡](QUALITY-FETCH-ABORT-LIFECYCLE-1.md)，不混为console清理。全部83卡与94–102/editor目标继续；无下一位Agent提示词，Codex单Agent继续。
