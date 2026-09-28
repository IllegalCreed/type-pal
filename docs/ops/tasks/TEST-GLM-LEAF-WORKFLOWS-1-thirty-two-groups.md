# TEST-GLM-LEAF-WORKFLOWS-1 — 三十二组叶层与小界面补测

Status: build
Owner: GLM（受委派测试贡献者）
Reviewer: Codex（独立验收、统一质量门与集成）
Phase: phase2
Capability: editor / content / coverage
Visual Verification Timing: dev-functional（明确步骤的隔离小闭环；G/H 纯函数 N/A）

## 授权与目标

2026-09-28 用户要求给 GLM 超大批量、较低单组复杂度的补测任务，并确认其多模态能力。
按 **32 组 / A–H 八批 / 每批四组** 连续实施，当前直接准入新增测试，不先交纯审计报告再等待。
Codex 独立接收，不恢复固定三签；作者自验不是独立第三方证明。

生产冻结 `3925980cab8e1e62bb59cf560db756935fda7d05`（对 `29e76fe6` 仅派发文档变更）。
[冻结表](../../testing/glm-leaf-workflows/targets.json)含 49 个实际目标源 hash、正式 fast 统计、
公开入口行号、静态 import 线索及同名旧测试入口；工作包定义每组窄范围。
分支 `codex/glm-leaf-workflows-r1`，已准备隔离工作树
`/Users/zhangxu/.codex/worktrees/glm-leaf-workflows/type-pal`；不借 main、Kimi 或 Codex E2E 树。

## 前提真值门

- 工程前提：49 目标现有 fast 分支 4,459/5,584（未命中 1,125），行 4,500/5,161（未命中 661）；
  从已有公开组件/纯函数选择新合同。缺口不是新 bug 数，也不等于所有臂可合法触达或承诺覆盖增量。
- 一手依据：冻结 LCOV 的 source/hash 与逐文件计数；`DsMultiSelect` 的过滤/禁用/选择路径
  `multi-select.tsx:21–66`；`DsZoomToolbar/DsMediaViewport` 的上下界 `media.tsx:17/73`；
  `editor-target.ts:10` 当前对象查询；`map-selection-overlay.ts:36/62` 边界与绘制；
  `command-asset-record.ts:18/31/42/53` 明确只校验 record/长度/头部；
  `frame-sequence.ts:567/593` 播放区间/时长；其余公开入口及实际消费者按冻结表逐组查阅。
- 原版/第一阶段机制 N/A：本卡不改玩法、数值、格式、碰撞或渲染架构；只补当前二阶段已定合同。
  当前可见 UI 来源为生产控件/已有设计系统，测试不授权 UI 重设计。
- before → after：产品不变，新增可自动复跑的断言和最小功能证据。没有新产品取舍。
- 最强替代解释：空臂是编译器防御、旧测试跨文件已证、或过时入口；只看 LCOV 不足以断言有新合同。
  `StampPlacementInspector.tsx` 未找到当前产品消费者，已主动从本包移除，不造新挂载来刷覆盖。
- 推翻条件：只能 mock 掉上游守卫/伪造旧版本或读私有函数才能触达；登记不可达或风险，继续下一族。
  合法业务失败交正确预期的隔离红诊断，不通过改预期掩盖，也不擅修产品。

## 范围与隔离

- 精确新测试路径：targets.json 的 49 个 `newTest`；没有新合同的模块可只登记 existing-proof，不能凑文件。
- fixture 白名单：`packages/editor/src/ui/__tests__/glm-leaf-workflows/**`、
  `packages/content/src/__tests__/glm-leaf-workflows/**`，仅本包 typed fixture / 硬件端口替身。
- 工具/回执/诊断/最小浏览器宿主：`docs/testing/glm-leaf-workflows/**`；冻结表只读。
- 不能改产品、旧测试、官方配置、依赖/锁、基线、任务卡/看板/公共索引、其他贡献者文件、正式工程资产。
  如需产品修复交 Codex；本卡不因产品缺陷自动扩权。
- Kimi 的 20 目标与本卡 49 目标集合已核零交集；公共依赖覆盖可能重叠，最终贡献按 main 并集去重。
  两者都只新增自身测试，不改共享产品/fixture。并发 package 测试限制低 worker，重门串行。
- Codex 继续 E2E002；001/002、App、ScriptEditor、PreviewCanvas、FrameAnimationEditor、
  已知朝向清除问题与角色换装均不在 GLM 范围；不把测试任务变成新功能任务。

## 验收

完整分组、操作步骤、精简账与运行要求见[工作包](../../testing/glm-leaf-workflows/README.md)。

1. 真实公开入口、有效 fixture 与业务结果；允许组件规定的 callback，不以 mock 核心函数冒充业务链。
2. 每批优先 2 个最强代表单点反控（全包约 16–24 针），共用严判据，不逐组搭一套验证框架。
   关键失败/输入保真合同必须可证伪；数量不是验收门，不造无关变异。
3. 每批定向/相邻、对应包 typecheck、新增文件 Biome 全零诊断、docs/diff；D/H 批末各跑一次
   截至当时受影响包全测。不每加几个用例就跑全包/覆盖。
4. A–F 各一条指定小 UI 闭环，两种工作区宽度；真实截图/日志，G/H 纯函数无需虚构视觉。
5. D/H 两个批末里程碑各做一次局部、同口径 before/after 覆盖（E–H 报后半增量及总并集，不重复相加）；
   所有官方全仓 check / ratchet / strict-fast 和基线由 Codex 统一执行。
6. 每四组固定候选 SHA 并推送，可继续下一批；单组卡住登记原因，不堵其余七批。
   接收通过后 Codex 集成推送、核 done、清理退休分支/worktree，不要求用户再提醒。

## 当前模式推进记录

- Codex 前提/范围：verified，32 组 49 目标；统计与 Kimi 零交集校验，移除无当前消费者的旧组件。
- build 准入：**build allowed（仅本卡新增测试、fixture 与隔离证据）**，2026-09-28。
- Coding Owner：GLM；不分派其改 E2E/产品，复杂跨组件竞态另归 Kimi/Codex。
- GLM 交付与自验：pending，A → H 可连续实施。
- Codex 独立验收：pending，分批接收；已闭合项不重开。
- 用户可感知产品验收：N/A，本卡不改行为；发现需要新产品裁决则另提。
- done 准入：未开放，待独立验收与正式集成质量门。

## 交接日志

- 2026-09-28 Codex：依现有 Vitest/pnpm 与 fast 证据派发八批，未重跑覆盖率盘点。
  GLM 直接实现，不先堆审计材料；允许有界的隔离功能视觉，不占用用户服务。

## 下一位 Agent 提示词

```text
接手 TEST-GLM-LEAF-WORKFLOWS-1。先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、
docs/ops/tasks/TEST-GLM-LEAF-WORKFLOWS-1-thirty-two-groups.md、
docs/testing/glm-leaf-workflows/README.md 和 targets.json。
你是测试 Coding Owner，已 build allowed；直接实现，不是再做一包只读审计。
在 /Users/zhangxu/.codex/worktrees/glm-leaf-workflows/type-pal、
codex/glm-leaf-workflows-r1 分支，从派发提交连续做 A→H，
每四组一批，固定 SHA 后提交推送，随后继续下一批，不等 Codex 审完。
只改精确新增测试、专属 fixture/证据；不改产品、旧测试、官方配置/依赖/基线或别人的文件。
先旧断言去重，再用真实公开入口和合法 fixture；业务结果要有正控和可证伪反控。
按工作包的六条视觉步骤在自有端口/浏览器/临时项目取证，不碰 6010、Kimi 和 E2E 环境。
静态门必须 error/warning/info 全零；D/H 批末再做受影响包全测和局部覆盖对照，别逐例跑覆盖。
不跑官方全仓 check/ratchet/strict-fast。真 bug 交隔离红诊断，不改预期凑绿；阻塞一族继续其它族。
每批回执给候选 SHA、真实新合同/旧证据去重、复跑命令、JSON、反控、截图和未证项。
GLM 是贡献者；Codex 独立验收、集成推送、统一质量门和清理。不要合 main、代签或标 done。
```
