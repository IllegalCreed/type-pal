# E2E-004 · 端菜与赠酒

Status: verified
Owner: Codex
Last reviewed: 2026-10-16
Template: test-e2e-stage-v1 / 1.0.0

本页是 e2e-004 端菜与赠酒稳定入口。verified/10月2日仅保原出版状态与核验日期；旧11月2日期限已退休；本次只静态治理，不能把旧技术passed、用户观感和capture合成一个done。

## 入口与前置

只接受本引擎真实003厨房末档及匹配源/原字节hash、未取菜和待取菜持久appearance合同。正常held与菜单use；story、items、saves分别运行，capture另轴。公开来源包括 `pnpm e2e:004`、`:reforge`、`:items`、`:saves`、`:both` 及 `--case story|items|saves`；本次不调用。

## 当前结论

原六case的技术收口与旧comparison failed/receipt-only复核并存，见[报告](report.md#results)。只有两份story不能叫完整both；原10月2日E2E-004-2明确记录用户“非常好”认可该连续演示，范围限该项；本轮没有新演出、像素或用户签字。原d022/content22/SAVE11保持，10月6日22/12源码核读不替旧候选升级；006不借本段变绿。

## 证据与状态

原YAML除活动期限移除外保留，正式报告入口不变；原Owner、lastVerified不由治理刷新。

```yaml
id: e2e-004
status: verified
phase: [phase1, phase2]
engines: [game, reforge]
owner: Codex
lastVerified: 2026-10-02
dependsOn: [e2e-003]
tags: [story, items, menu, save-restore, checkpoint]
canonicalReport: report.md
```

正式报告：[report.md](report.md)。story、items、saves 是不同 profile，不可混报为同一 both 回执。

story是连续40行到真实恢复控制，不插取消/慢读/存读；items走15行前置，取消0dispatch、错误use1dispatch且酒仍1/绑定不变；saves独立慢读取菜姿态、中途208与终点正式保存、fresh完整World/Canvas恢复。唯saves产合法004.end.save.json给005，story/items/capture均不产前驱。

配对[机器文档审计](../../evidence/e2e-004.json)保原16键、document-audit/source-backed、runtimeExecution.performed=false与artifacts=[]；本轮不改JSON。原raw、截图/存档/trace字节及存储Owner/retention目前unknown，不能由旧指针推今天可复演。

## 依赖与历史

`dependsOn=e2e-003`，后继[005买虾](../005-shrimp/README.md)只消费同引擎004 saves。用户10月6日删除结束后的测试走位，旧尾部commit仅是当时记录；NPC唯一赠酒正文不移回道具private fallback。原0/0/1与2/1/2警告保留，不冒console零或静态豁免。

后继事实权：[连续卡撤信](../../../../ops/archive/tasks/done/E2E-CONTINUOUS-001-006.md#2026-10-08-前批结果历史完整执行链结论被上述反例推翻)与[10月11日另轮](../../../../ops/archive/tasks/done/E2E-CONTINUOUS-001-006.md#2026-10-11-最终重录与headed验收accept)各守候选。静态模板不授runtime/E2E/视觉/coverage。完整原16行由回执span或固定5a Git blob恢复；固定777正文及完整回执语义已获非作者接收；后续根行政与中央接入范围见[专属治理记录](../../../../phase-governance/reviews/20261016-e2e-stage-m.json)，不自授新的运行信用。

## 2026-10-30 版本适用性规则

按[测试治理](../../../governance.md#版本适用性)取消活动 `reviewBy`。上文旧到期／续期只作历史，不再触发复核或重跑。运行 `node scripts/docs/testing-revisions.mjs e2e-004` 对比原候选、content/save版本及已声明源码指纹；记录缺失为unknown，相关边界不同为changed，匹配也不新增执行信用。status、lastVerified、原报告和机器证据保持原范围。
