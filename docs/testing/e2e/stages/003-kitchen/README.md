# E2E-003 · 下楼、道士与厨房

Status: verified
Owner: Codex
Last reviewed: 2026-10-16
Template: test-e2e-stage-v1 / 1.0.0

本页维护 e2e-003 的稳定入口。verified 与原 lastVerified/reviewBy 是出版记录，不是本次执行。新增日期只指2026-10-16静态文档治理；六篇正文由 history_cards_a 迁移，固定777候选已获 history_cards_c_tail 非作者内容接收；根接入另验。

## 入口与前置

前驱必须是本引擎真实、passed 的002报告及原档，核原字节hash与交接语义后正常恢复，以held输入下楼、和醉道士交谈并进厨房。旧RF002曾把错误次日方案一致保存；“恢复相等”不能使其成为合法003前驱。公开来源为 `pnpm e2e:003`、`:reforge`、`:both` 及 `kitchen-game.mjs → runKitchenJourney(game)`；这里只登记caller，不启动旧runner。

## 当前结论

[分轮结果](report.md#results)分别说明10月1日两独立SHA、10月7日14:12/14:28不同前驱批次与10月8日离线局部结论。14行正文、12次楼梯真实提交和存读证据均只归原轮；首个scoped调用缺独立初始idle，不能补造。完整链/基础设施的旧收口已被001漏针反证撤信，10月11日另轮接收不能倒签旧轮。

## 证据与状态

原YAML除活动期限移除外保留，正式报告入口不变；原Owner、lastVerified不由治理刷新。

```yaml
id: e2e-003
status: verified
phase: [phase1, phase2]
engines: [game, reforge]
owner: Codex
lastVerified: 2026-10-02
dependsOn: [e2e-002]
tags: [story, inn, kitchen, npc, checkpoint]
canonicalReport: report.md
```

正式报告：[report.md](report.md)。本阶段止于厨房交代，不进入取菜或 004。

业务oracle是楼梯12次真实commit及逐段实绘步帧，14行56/57/58、145/146、148/149/150、152/153、155/156、126/127和说话人完整；止126/127且还控制、钱仍500、未取菜/未换208，完整持久世界与同引擎Canvas正式fresh恢复。Game drawn与Reforge selected/world-pass-only不是同一种像素证明。

配对[机器文档审计](../../evidence/e2e-003.json)保原16键、document-audit/source-backed、runtimeExecution.performed=false与artifacts=[]；本轮不改JSON。原raw、截图/存档/trace字节及存储Owner/retention目前unknown，不能由旧指针推今天可复演。

## 依赖与历史

`dependsOn=e2e-002`；本段不取菜，不提前搬入送酒后dlg207，后继[004端菜](../004-meal/README.md)独立核验。14行、12楼梯提交、16固定wait/6对白消费不叠加成新执行量；46/56反控、90/92工具和两批draw数各归旧候选。当前窄源22/12不改原d022的22/11。

后继事实权：[连续卡撤信](../../../../ops/archive/tasks/done/E2E-CONTINUOUS-001-006.md#2026-10-08-前批结果历史完整执行链结论被上述反例推翻)与[10月11日另轮](../../../../ops/archive/tasks/done/E2E-CONTINUOUS-001-006.md#2026-10-11-最终重录与headed验收accept)各守候选。静态模板不授runtime/E2E/视觉/coverage。完整原16行由回执span或固定5a Git blob恢复；固定777正文及完整回执语义已获非作者接收；后续根行政与中央接入范围见[专属治理记录](../../../../phase-governance/reviews/20261016-e2e-stage-m.json)，不自授新的运行信用。

## 2026-10-30 版本适用性规则

按[测试治理](../../../governance.md#版本适用性)取消活动 `reviewBy`。上文旧到期／续期只作历史，不再触发复核或重跑。运行 `node scripts/docs/testing-revisions.mjs e2e-003` 对比原候选、content/save版本及已声明源码指纹；记录缺失为unknown，相关边界不同为changed，匹配也不新增执行信用。status、lastVerified、原报告和机器证据保持原范围。
