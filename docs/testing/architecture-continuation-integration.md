# 架构治理剩余八项统一集成

Owner：Codex；用户于 2026-09-26 追加要求完成剩余步骤并合并推送，授权本实现对话执行统一门与集成。
候选 `f884e07c`，保护基点 `origin/main@2647960455ad3e4d67471ff70019ef0bf89dbd8b`，验证合并树 `a2485e7d`。
当前状态：八项统一验收通过，主卡done归档；原13批治理队列已全部完成，执行合并推送。
结构化计数与证据归属见[机账](architecture-continuation-integration-evidence.json)。

## 范围与来源

| 项 | 已实现边界 | 分项证据 |
|---|---|---|
| A3 | 世界移动/绘制 owner，沿用此前时钟/输入、准备、活动场景/镜头 owner | [回执](world-runtime-refactor.md) |
| B1 | 编辑器总壳的导航、场景、试玩、工程四个会话 owner | [回执](editor-app-sessions-refactor.md) |
| B2 | 地图手势、变换/剪贴板、视图、结构操作 owner | [回执](map-workspace-sessions-refactor.md) |
| B3 | 四类命令表单、共享控件、作者桥接合同 | [回执](command-form-families-refactor.md) |
| C1 | 战斗选择、readiness、动作演出、结算 owner | [回执](battle-session-owners-refactor.md) |
| D2 | 一阶段角色 opcode、战斗资源/终态/成长/结算、启动资源 owner | [回执](phase1-main-owners-refactor.md) |
| E1 | 移动族 opcode 翻译与场景源规划纯内存 owner | [回执](migration-phase-owners-refactor.md) |
| F1 | 审计 AST/CSS/规则/报告分层及等价 switch 路径去重 | [回执](design-system-audit-layering-refactor.md) |

分项已完成定向、相邻、类型、严格业务反控及适用的隔离功能验证；八项合计 109 针反控记录保留在分项机账，
不冒充本次重新执行。同步 main 的六个提交为补测、文档与官方覆盖基线，无生产改动；唯一合并冲突为测试目录索引，
双方新增条目均保留。没有删除生产文件，没有变更 coverage include/exclude、测试 timeout 或 provider。

## 统一质量门

`pnpm check` 首次统一运行 exit 0：7 包共 9573 项 / 957 测试文件；类型检查通过，Biome 无错误（62 warnings、
6 infos，未作越界清理）。各包 shared 115、content 1022、pal-extract 299、game 2478、reforge 1743、
migrate 926、editor 2990。日志目录：`/tmp/type-pal-architecture-integration.dSjSiY`。

保护 `26479604` 的官方 `coverage:ratchet` exit 0：9081 项 / 728 生产文件，新增 27 个生产文件全部纳入统计。
分支 `45477/63178` → `45738/63288`（71.98% → 72.27%）；20 项指标上升，其余不降，统计口径不变。
保护同一基点的单次 `coverage:fast` exit 0，9081项/728生产文件；七包metrics与ratchet及官方baseline逐项全等。
Game/Reforge/Editor生产build和正式 `audit:design-system` gate均通过；构建仅有既存大chunk提示。
完整 check 只临时链接所需 MKF、M.MSG、WORD.DAT 与 extracted/baked 输入；不链接 RPG 存档，退出后解除链接。
没有运行迁移发布命令或修改生成产物。所有共享全仓门串行执行，官方基线只能由正式 ratchet 更新。

## 保留边界

- content20/SAVE8、玩法、公式、UI 形态、资产约定和正常存档不变，不占 6010。
- 原生文件选择器落盘、720/900 裁切/隐藏 separator/boot 首屏失败矩阵及原生 zoom 的原有未证轴仍保留。
- E1 的 `globalScriptAliases` 已由主线新增 `migrate-scenes.sessions.test.ts` 的真实 registry body、排序重放、
  非法入口与输入保真回归补证，本次完整 check 已执行；当前 PAL `current-r13-6b`/`stable-id` 组合经过完整
  migration/publication 回归。其余冻结历史 profile/reference 的 mapScenesStatic 组合不宣称全覆盖，
  架构 owner 收口不等于该历史组合矩阵已完成，也不把它们扩张为新的产品兼容承诺。
- 剧情观感、full 覆盖报告与完整 Q1/Q2 仍归原定集中验收；没有借架构完成关闭这些任务、demo/s135 独立问题，
  或 Cursor/GLM 未接收的补测候选。
- 主工作树其他对话的未提交文件不进入本批，不 stash、不覆盖、不提交；本批从隔离工作树推送。

本文件是分项候选之后的集成记录；分项中的“未运行统一门”描述只对应当时的候选快照。
