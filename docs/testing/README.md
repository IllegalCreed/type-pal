# 跨阶段测试与验证

覆盖率说明统计范围和防回退门槛；E2E 合同定义业务断言、检查点链、战斗速胜边界与录像条件。两者各自维护，不能互相替代。

上级：[文档总入口](../README.md)。

## 文档与附件

- [GLM非视觉补测长队列](glm-coverage-work-queue.md)与[617文件机器台账](glm-coverage-work-queue.json)（当前批之外十批78候选模块；先细化/逐卡准入，不新增E2E前置门；[快照复算](glm-coverage-queue-census.mjs)）
- [GLM运行时状态与元数据六组补测](glm-runtime-state-boundaries.md)（draft；11模块39族，先去重、三签后整包连续实施）
- [内容合同残项工作包](glm-content-residual.md)（队列TB-01 draft；上包登记残项+跨包去重，未获实施授权）
- [资源读取缓存与音效准备工作包](glm-reforge-asset-io.md)（队列TB-02 draft；六模块族账，未获实施授权）
- [导入编码线程与视频元数据工作包](glm-editor-import-codec.md)（队列TB-03 draft；七模块族账，未获实施授权）
- [独立技能试放设计与验收](../ops/tasks/EDITOR-SKILL-TRIAL-1-isolated-battle.md)与[当前前提探针](skill-trial-premise.mjs)（D-04/D-05；独立临时状态已裁决，入口UI待确认，未实施）
- [第一阶段资源测试输入合同](phase1-resource-test-inputs.md)（E-01完成；20项隔离输入回归、真实资源对拍通过，check7478/严格fast6989绿）
- [编辑器预览缓存连续修复](editor-preview-cache.md)（E-03/E-04完成；15项真实字节回归、7负控及原生绘制验证，check7457/严格fast6969通过）
- [场景删除引用保护实现与验证](scene-reference-guard.md)（D-02/done；83598cc4三席accept并归档；22回归/PAL补1边、最小界面验证及check7442/严格fast6954通过）
- [GLM运行时基础功能五组补测工作包](glm-reforge-runtime-contracts.md)与[任务卡](../ops/archive/tasks/done/TEST-REFORGE-RUNTIME-CONTRACTS-1-runtime-boundaries.md)（done；62a18137三席accept、用户确认，核零漂移归档）
- [运行时补测Codex接收复核](reforge-runtime-contracts-review.md)（60/1190、五见证/原15跑通过；check7538/严格fast7049，已收口）
- [六组内容合同补测工作包](glm-content-contracts.md)与[任务卡](../ops/archive/tasks/done/TEST-CONTENT-CONTRACTS-1-content-validation-boundaries.md)（done；adbabb84三席accept、用户确认签字，118项，GLM贡献/Codex集成/Kimi独立终审）
- [内容合同补测Codex复核](content-contracts-review.md)（R1～R4闭环、六见证/12负控、43族归属订正；check7420/严格fast6932通过，已核零漂移归档）
- [精灵上传选图归属](sprite-selection.md)（a88ab18d三席accept、用户验收通过并done；真实组件乱序/字节/历史、六负控及最小界面验证）
- [当前检查点导出](checkpoint-export.md)（真实DEV注册、安全快照共队列、失败恢复与隔离负控；R4整页闭环待执行）
- [编辑器命令与引用补测工作包](../ops/archive/tasks/done/TEST-EDITOR-LOGIC-COVERAGE-1-editor-command-boundaries.md)与[GLM回执](glm-editor-logic-coverage-receipt.md)（done；四组非视觉测试，GLM贡献、Codex集成、Kimi独立终审）
- [编辑器补测Codex接收复核](editor-logic-coverage-review.md)（5ca9dad2三席accept并收口；47项/四见证、check7282、严格fast6794通过；历史counter保留）
- [四包基础边界测试补强](../ops/archive/tasks/done/TEST-FOUNDATION-COVERAGE-1-core-boundaries.md)与[GLM回执](glm-foundation-coverage-receipt.md)（done；shared/content/pal-extract/migrate，产品不变、非视觉）
- [四包测试Codex接收复核](glm-foundation-coverage-review.md)（48d3b8e3三席accept并收口，139项/14反控、check7218与strict fast6730通过；历轮counter原文保留）
- [世界异步操作提交一致性](world-async-commit.md)（B-05/08/09；真实入口回归、隔离反控与集中E2E登记）
- [保存与嵌套脚本活动互等](save-barrier-lineage.md)（B-06/B-07；真实lease准入、子流程完整执行、反控与集中E2E登记）
- [测试覆盖率基线与只升不降门禁](coverage.md)
- [GLM剩余边界大批工作包（二）](glm-pre-e2e-boundary-batch-2.md)与[回执](glm-pre-e2e-boundary-batch-2-report.md)（Codex接手完成六组72项诊断准备；34覆盖/23复现/15待证，不代表产品已修复或官方覆盖率提升）
- [两阶段 E2E 与录像验证合同](e2e.md)
- [未保存修改的离开保护](editor-leave-guard.md)（A-07；真实菜单/保存回归、原生刷新与选夹、负控制和质量门）
- [GLM并行审计准备工作包](glm-pre-e2e-prep.md)与[整批回执](glm-pre-e2e-prep-report.md)（44项只读取证；D-01签字先回，引用删除/上传/缓存三组并行准备，不授权产品修复）
- [D-01：GLM配对工作流正式回归](glm-editor-history-workflows.md)与[回执及Codex接收勘误](glm-editor-history-workflows-receipt.md)（20项检查范围；Codex适配核心、补强断言并负责视觉/集成）
- [作者保存恢复：GLM大批测试工作包](editor-save-recovery-glm-batch.md)与[整批回执](editor-save-recovery-glm-batch-report.md)（父卡r2实施期附件）
- [作者保存恢复：保存前校验与序列化测试包](editor-save-recovery-glm-preflight.md)（preflight-r1；含GLM回执区）
- [保存恢复：接收侧未覆盖分支台账](editor-save-recovery-coverage-pending.md)（逐臂事实；可达性待Codex核实，不冒称已覆盖）
- [作者保存恢复：原生目录与界面验证](editor-save-recovery-native-ui.md)（系统授权、关闭编辑页恢复、继续保存/试玩及外部冲突实测；边界与API验证分栏）
- [作者保存恢复：GLM打开身份测试包](editor-save-recovery-glm-open-identity.md)（open-identity-r1；只做代码级测试，不含浏览器或视觉任务）
- [作者保存恢复：GLM身份基础测试包](editor-save-recovery-glm-identity-foundation.md)（identity-foundation-r1；标记/指纹/锁与存储代码合同，两个新测试文件）
- [编辑器保存中断恢复：最终候选收口](editor-save-recovery-closeout.md)（旧作者链退役、OS目录重启/撤权补证、性能边界及最终质量门）
- [作者保存恢复：project-io边界复核](editor-save-recovery-project-io-review.md)（Codex写侧回归；构造保证与旧路径退役候选不冒充覆盖）
- [作者保存恢复：写入授权生命周期](editor-save-recovery-capability-review.md)（真实token失效、提交后写保护、登记/计划归属与单点负控）
