# MIGRATION-LEGACY-SCRIPT-DISCOVERY-1 — 退役脚本索引与托管范围

Status: draft
Phase: phase2
Capability: current migration IO ownership
Coding Owner: Codex（只读提案）
Reviewer: Codex
Visual Verification Timing: N/A（无UI变化）
Branch: codex/code-quality-94-102

## 事实与范围

当前migration-project-io::discoverProjectManagedFiles仍读取content/scripts/index.json的chunks，并将其中path并入托管集。当前pal-current-publication::FORBIDDEN_CURRENT_PATH已拒绝content/scripts/发布路径，canonical作者脚本保存在作者场景/物品/共享正文，ARCH-PAL-SUPPLY-1历史记录确认旧转换域已经退役；旧任务记录只供事实来源，不自动作为本次写盘授权。

现有boundaries与glm-o专测把chunks轴明确标为退役、不复活，但主测仍混有该域的fixture与断言。不能只删测试或修改coverage掩盖活代码。

## 可审阅方案与停止线

待用户：删除仅该旧索引读取分支；保留scene/map当前发现、显式seed、原始字节快照、TOCTOU、非托管保护。主测将额外场景/地图发现保留为当前合同，移除chunk专属片段，额外目标TOCTOU改用当前地图路径。不改导出签名、当前格式、作者脚本或工程产物，不运行含recover写入的真实migrate:content命令。

该项会改变旧文件是否被自动纳入托管，属于AGENTS资产管线ownership停止线。原52中的migration-project-io.ts继续review；用户答复前不实施。父52其它未闭合范围继续，统一门仍留全52收尾。

## 交接

2026-10-26 Codex：完整读取133行实现、真实publication CLI与plan、相关主测和边界/GLM专测；只读确认上述矛盾。当前实现未改，未声称格式真值或产品行为缺陷已修。准入需用户裁决，不授其它迁移模块整文件信用。
