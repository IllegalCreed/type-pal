# MIGRATION-LEGACY-SCRIPT-DISCOVERY-1 — 退役脚本索引与托管范围

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

保留原卡「MIGRATION-LEGACY-SCRIPT-DISCOVERY-1 — 退役脚本索引与托管范围」的任务归属与历史边界。原目标见原文(摘录:Capability: current migration IO ownership Reviewer: Codex Visual Verification Timing: N/A（无UI变化）);本页治理不重开已终态任务。

## 范围

原卡含章节[MIGRATION-LEGACY-SCRIPT-DISCOVERY-1 — 退役脚本索引与托管范围、事实与范围、可审阅方案与停止线、交接、2026-10-26 当前批准与build准入],共0个原文链接。治理范围仅限文档角色、保全与链接处置,不改产品/测试/coverage。

## 前提与证据

固定main源3247B(SHA 6fbad1e6983c);原卡前提按原时点保留。当前存活入口:无当前仓库内存活链接。

## 验收

本页治理验收=模板符合+原文逐字节保全+链接处置如实;原卡验收结论保持原时点(原Status:done),治理不改写。

## 状态与交接

done保持原语义;本治理候选为作者稿(partial/needs),交Owner非作者接收;无新执行授权。

## 历史范围

原卡属固定main时点;MIGRATION-LEGACY-SCRIPT-DISCOVERY-1 — 退役脚本索引与托管范围的原始范围与日期在保全块内逐字保留。

## 原始结论

原卡结论按其Status(done)原样;治理不撤销/不恢复旧信用。

## 当时证据

原文0个链接与当时回执属原时点证据;本页不重跑、不复授。

## 当前有效性

仅历史任务归属有效;不凭旧基点认定当前实现或授权新产品取舍。

## 继任文档

接替/关联入口见原文链接;当前任务导航以看板为准。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3247B / SHA-256 6fbad1e6983cd2cc84992d4b15a962d8d6a36d1e2d369aba40942ea106954560；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# MIGRATION-LEGACY-SCRIPT-DISCOVERY-1 — 退役脚本索引与托管范围

Status: done
Phase: phase2
Capability: current migration IO ownership
Coding Owner: Codex（单一实现写入者）
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

## 2026-10-26 当前批准与build准入

用户明确批准删除退役脚本index读取，旧文件保持非托管；当前场景/地图/seed/TOCTOU不扩域。 Codex核当前main未变、单一Owner与隔离治理分支，build allowed。上文待裁决描述保留为历史提案；本轮以此明确答复为准。定向与相邻集中验证，纯清理/行为修复独立提交，全部52稳定后统一门。

2026-10-26 实施：只删除退役脚本index读取，显式seed/scene/map保持。正式新例6绿1指定业务红后修，五迁移/plan文件36绿0stderr；原专测chunk片段退休、场景精确全集保留，TOCTOU换当前map路径。旧JSON及chunk按非托管哈希，坏旧索引亦不解析；未启动真实migrate命令/不写工程。统一门与发布另核。

- 2026-10-26 本地统一门收口：52/52代码接受；全仓20620产品＋721工具／七包TC、lint6137文件0/0/0，完整stderr空；唯一official20185／809全部测试绿、原旧比率拒绝如实保留。按用户既有授权仅pal-extract的死包装与视频CLI保护两文件精确重计，六其它包收益保留；同一报告原policy重放ratchet/protected均exit0，三项精确退役匹配。完整原件与低成本复验见父52证据uniform.json；当前尚未推送/PR/合并，卡面done为代码与本地门，发布以真实GitHub状态另核。
```
<!-- incremental-original-source:end -->
