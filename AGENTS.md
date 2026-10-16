# AGENTS.md

本文件只放多 Agent 协作协议本体。项目知识、工程经验、阶段纪律和常用命令见:

- [`CLAUDE.md`](CLAUDE.md): 项目知识、阶段判断、工程经验、常用命令。
- [`docs/phase2/READ-FIRST.md`](docs/phase2/READ-FIRST.md): 第二阶段 Reforge 开工铁律。
- [`docs/ops/agent-workflow.md`](docs/ops/agent-workflow.md): 多 Agent 具体工作流。
- [`docs/ops/board.md`](docs/ops/board.md): 当前任务看板。
- [`docs/ops/tasks/`](docs/ops/tasks): 任务卡。

## 操作与必读

先按操作选择规范，再进入对应任务和证据；这样可以避免把归档结论当成当前授权。目录职责与事实权见[项目文档模型](docs/ops/guides/documentation-model.md)。

| 操作 | 必读 | 一句话要点 |
|---|---|---|
| 新建、修改或治理文档 | [项目文档模型](docs/ops/guides/documentation-model.md) | 先定唯一事实源与模板；同提交写回；提交前运行 check:docs、lint 和 diff 检查，诊断全部为零 |
| 开始或接手非小改 | [当前协作流程](docs/ops/agent-workflow.md)、[活动看板](docs/ops/board.md) | 读卡顶部状态与准入；历史三签不恢复，旧 counter 不自动消失 |
| 写、改或审查测试 | [测试治理](docs/testing/governance.md)、[测试质量验收](docs/ops/agent-workflow.md#测试质量验收用户-2026-10-03-固化) | 核 caller、合法输入、oracle、排重和反控；catalog 与 evidence 配对 |
| 第一阶段机制或缺陷 | [第一阶段知识](CLAUDE.md)、[机制真值](docs/phase1/game-mechanics.md) | 分清原始数据、sdlpal 参考与本项目观察，保留原版证据边界 |
| 第二阶段引擎、编辑器或内容 | [Reforge 开工规则](docs/phase2/READ-FIRST.md) | 干净架构、当前 canonical；先 harvest，演出差异先归因 |
| E2E、剧情回写或编辑器预览起点 | [E2E 合同](docs/testing/e2e/contract.md)、[剧情时间线](docs/lore/timeline.md) | 只将实际核读、实跑与用户判断写回各自证据范围 |
| 封板、合并或发布回执 | [文档完成定义](docs/ops/guides/documentation-model.md#完成定义)、[文档检查](docs/ops/guides/documentation.md) | 静态零诊断是必要条件，不能代替 runtime、E2E、视觉或部署验收 |

本节只路由。完整项目知识与历史协议保留在下游；其他 Agent 入口先转发本节，不维护第二套操作规则。

## 当前临时模式：Codex 分派、贡献者执行、Codex 独立验收

用户于 2026-09-25 明确改为此模式，**三贤人强制三签暂时退休**，直到用户再次明确恢复。本文下方及旧任务卡中与此冲突的 Codex/Kimi/GLM 三方必签、缺签豁免、额度代班和固定席位交接要求仅作历史记录，**不再是当前 `build`/`done` 门禁**；已完成任务的历史签字和结论原样保留，不追溯重写。

- Codex 负责选择不重叠的工作包、核定前提与范围、分配 Coding Owner、维护任务卡/看板、独立复核交付、执行必要质量门、合并提交推送及清理已退役分支/worktree。贡献者可为 Cursor、GLM、Grok、Gemini、Kimi 等，按具体任务能力委派；作者自验不能替代 Codex 独立验收。
- 非小改或跨 Agent 交接继续开卡并保留代码/证据锚点。`draft -> build` 由 Codex 核前提、范围、单一写入 Owner 和验收方式后记 `build allowed`；`review -> done` 由 Codex 独立核交付与相应测试后收口。**不等待固定 AI 席位签字，也无需逐卡申请三签豁免。**隔离只读/候选包可留 `draft` 交付，不等于产品 build 或官方覆盖率接入。
- 高风险的 schema/save/migration/资产管线、公共接口、第一阶段机制真值或用户可见行为变化，仍须一手证据、可证伪反例和充分验证；需要新的产品取舍、不可逆操作或关键前提未定时交用户裁决。取消的是固定三签，不是事实核验、安全边界或用户决策权。
- 同一实现文件同一时间只有一位 Coding Owner；贡献者在隔离分支/worktree 交付，未接收前不得合 main。Codex 独立审核后决定返工或集成，并把结果写入卡与交接日志。旧 `counter` 不因模式变更自动消失，须逐项复核闭合。
- 用户验收适用于用户可感知的产品/UI取舍；纯文档或测试包按卡面验收条件可由 Codex 收口。工作模式变更不自动批准其它卡的产品范围扩张。
- **硬性代码质量必须零诊断（用户2026-09-27）**：lint、格式、typecheck及其它硬性静态门的error/warning/info必须清零。
  退出码0但有诊断不算质量验收通过；“既有告警”“仅反控字符串”等不能作为常驻豁免。不得为过门降低规则级别、
  新增排除/ignore/强转掩盖问题。历史报告保留原始计数，不追溯改写成零诊断。
- 贡献者修本卡白名单内问题；全仓存量诊断由Codex集中清理，不因新门槛授权贡献者越界改产品或共享配置。
  独立代码复核与全仓门分开记录，全仓未零诊断前不得宣布统一质量门/集成收口完成。
- **测试少而精（用户2026-10-03）**：所有贡献者测试任务按[测试质量验收](docs/ops/agent-workflow.md)独立核合同原子性、合法输入、真实caller/oracle、排重、判别力、隔离和有效反控；全绿/数量/覆盖率不能单独代表accept。已证重复、恒真或无业务执行的用例精简，类型合同走typecheck，不计运行时数量；精简后重新实测官方基准，不为保覆盖率堆弱断言或降低规则。未知候选不自动删除，待核项不标已验证。

## 历史协议入口

原三贤人系统、席位迁移与旧签字流程完整保存在[协作协议分层前快照](docs/ops/archive/protocols/three-sages-20261015.md)；只供查旧任务，当前准入以本页临时模式与[现行工作流](docs/ops/agent-workflow.md)为准。历史签字和 counter 不因分层而改写。
