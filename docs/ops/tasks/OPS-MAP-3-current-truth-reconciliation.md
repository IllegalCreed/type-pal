# OPS-MAP-3 - 能力地图、议题池与看板当前真值对账

Status: done
Phase: phase2
Capability: Ops / documentation truth（不改产品能力状态的实现，只校准已完成事实）
Owner: Codex
Risk: 小型纯文档对账

## 用户裁决

- 2026-09-03 用户批准开始，并明确：“对账你自己做就行了，用不到三签；小的需求无需三签。”
- 本卡据此由 Codex 单人完成，不请求 Kimi / GLM 签字；该豁免只适用于本次已有证据的文档状态校准，
  不授权后续 B5 实现免签。

## 范围与证据

- 只修改：`docs/phase2/capability-map.md`、`docs/phase2/design-backlog.md`、`docs/ops/board.md`，
  并新增本卡作为本次对账回执。
- 直接证据：对应任务卡首行 `Status` 与 Git 收口记录，包括 D6-1、D12-1、D13-1、D14-2、D14-3、
  D15-1、W9、B2-1、E18-1、ARCH-CURRENT-ONLY-1、ARCH-ACTOR-CONDITION-SEED-1、W4-1。
- 不修改任何代码、schema、runtime、editor、迁移器或项目内容；不重写历史任务卡事实。

## 对账结果

- 修正 X4/A7、B2、W4、W5、B10、X7 及议题 4/5/6/12/13/14/15/18b/18e 的陈旧说明。
- 议题映射同步为：D6-1、D12-1、D14-2/3、D15-1、W9、E18 均按已完成任务卡记账；D13-1
  首批 done，时间旅行仍为独立按需增强。
- 看板删除全部历史 `done/cancelled` 行，恢复“只显示进行中和阻塞任务”的自身合同；当前为空。
- 当前真实半完成能力只剩：W6（时间/天气，等待内容需求）、E6（authority 调试可视化，低优先）、
  B5（战斗表现，旧审计需重算）。真实未实现为 A1、A6，其中 A6 明确非 MVP。
- 下一候选是 B5 gap census，但尚未形成任务承诺；必须先剔除后续任务已关闭的旧缺口，再开有界实现卡。

## 验证

- 陈旧短语定向检索归零：D14-2/3、D12-1、D6-1、D13-1 draft，W4-1 build，W9/E18 review/draft，
  X4/A7 等待 ARCH-CURRENT-ONLY-1。
- capability map 剩余 `⚠️/❌` 精确为 W6、E6、B5、A1、A6。
- Markdown 相对链接存在性检查通过；`git diff --check` 通过。

## 下一位 Agent 提示词

无下一位 Agent 提示词；本卡按用户明确的小需求免三签裁决由 Codex 单人收口。
