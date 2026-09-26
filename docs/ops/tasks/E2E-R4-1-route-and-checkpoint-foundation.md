# E2E-R4-1 — 路线驱动与合法检查点薄基线

Status: draft
Owner: Codex
Phase: ops
Visual Verification Timing: e2e-consolidated（本轮仅方案讨论，未执行）

## 用户意图与当前准入

2026-09-27用户要求不再由Codex持续补覆盖率，转向讨论快速通关E2E，避免模型盲探剧情与迷宫。
GLM/Cursor仍后台补测，用户不承担手动通关。固定三签暂休。
最终执行器必须无Agent/模型API依赖：AI只在开发期设计/校准，运行时所有分支由程序决定，
未知状态失败留证；独立进程可连续跑声明流程是最终验收门，不以AI操作浏览器通关替代。
用户已追加确认两阶段双线、主线优先+大型支线、普通遇敌速胜/剧情Boss个案、保留对话和后续录制用途。
本卡**未build allowed**：范围不再重复请示；先核两引擎实际观察/输入/保存/战斗结果入口、实施白名单与隔离方式，
再据[路线方案](../../testing/e2e-route-proposal.md)开执行器建设。不会因旧审计或check通过就宣称前置清零。
二阶段R4→N6b版本顺序保持，第一阶段独立向前，不等待二阶段卡住的片段。

## 一手锚点与真值

- 当前版本content20/SAVE8，`content/src/character.ts:168-170`；切版checkpoint重建，禁止兼容层。
- Reforge main:5372-5418的导出/恢复，main:797-809/5073后的读观察点；package.json没有runner。
- 碰撞与地图实例：reforge/src/collision.ts；动态移动继续走生产输入链，不用测试路径规划替换它。
- 用户已确认001/002见[剧情边界](../../../projects/pal/e2e-checkpoints/README.md)，003–010仍须Codex先起草。
- [现行E2E合同](../../testing/e2e.md)、[旧前置盘点](../../testing/pre-e2e-admission.md)和READ-FIRST：
  旧日期/行号/缺陷状态必须按当前树重核；一阶段只作内容/UX参考，不对齐内部状态。
- 最强替代解释：直跳场景或读档失败回落新游戏造成假通；必须有正式恢复成功与起始契约、真实前驱档hash。
- 第一阶段bootstrap:1120-1133/1918-1919的DEV状态与core/save/api.ts；game与reforge对话分页接口不同，
  不能共享内部存档或照搬固定回车次数。主线checkpoint只继承本引擎前段实跑结束状态。

## 本轮不做

不实现runner/测试后门/速胜，不改存档/迁移，不跑剧情或共享coverage，不替用户决定特殊战斗胜负。
Codex帧动画补测WIP冻结保留、未计入基线；+5pp目标未完成但不阻塞本卡讨论。
后续build卡须明确允许动作、只读状态协议、失败停线/预算、检查点来源链和小样验证。

无下一位Agent提示词，当前由Codex与用户讨论；两贡献者在独立测试卡连续实施。
