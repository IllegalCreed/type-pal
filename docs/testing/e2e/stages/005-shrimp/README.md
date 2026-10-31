# E2E-005 · 买虾与报信

Status: verified
Owner: Codex
Last reviewed: 2026-10-16
Template: test-e2e-stage-v1 / 1.0.0

本页维护 e2e-005 买虾与报信入口。verified及原日期属于catalog出版，不代表本轮执行或用户观感done；原候选、失败和后补case各守时点，006仍有独立rework边界。

## 入口与前置

前驱仅本引擎真实004 saves报告与未改原档，核hash、引擎和passed状态；拒story/items/capture、错引擎、失败或手改档。正常held路线/对白，saves另用fresh存储恢复；公开来源 `pnpm e2e:005`、`:reforge`、`:guards`、`:saves`、`:both`，这里只列caller不执行。

## 当前结论

[报告结果](report.md#results)保98a42d4e六case技术接收、原wrapper启动失败及后补；不能叫同一次wrapper全程成功。原“治理后当前检查点”是10月3日22/11快照，不授权今天22/12输入；后继连续批次另查相应来源。用户连续观感、录像和R4异常监督不因出版verified关闭。

## 证据与状态

原YAML除活动期限移除外保留，正式报告入口不变；原Owner、lastVerified不由治理刷新。

```yaml
id: e2e-005
status: verified
phase: [phase1, phase2]
engines: [game, reforge]
owner: Codex
lastVerified: 2026-10-02
dependsOn: [e2e-004]
tags: [story, npc, guards, save-restore, checkpoint]
canonicalReport: report.md
```

正式报告：[report.md](report.md)。本阶段止于丁香兰报信，不进入求药或出海。

story40行、唯一50文500→550及报信因果；guards49行含复读不重给钱/张四两后续，saves40行并核正式持久世界及恢复后香兰真实后台位移/前台可控。张四布防晚于522早于282；走近必须布防后的真实移动，不能取更早巡逻冒充。香兰报信各页原Game1688,1388、RF139.5,34,0朝上；动态背景跨时刻Canvas不要求相同hash。

配对[机器文档审计](../../evidence/e2e-005.json)保原16键、document-audit/source-backed、runtimeExecution.performed=false与artifacts=[]；本轮不改JSON。原raw、截图/存档/trace字节及存储Owner/retention目前unknown，不能由旧指针推今天可复演。

## 依赖与历史

`dependsOn=e2e-004`；本阶段止丁香兰报信、恢复控制及后台返程，不求药、不出海，后继[006](../006-doctor-boat/README.md)另核；只有005 saves产下一段前驱。40/49/40行、两轨三case、416输入/413Git/8trace/两档分职责排重；最终自然case未触发replan，不补称该巡逻相位已验。

后继事实权：[连续卡撤信](../../../../ops/archive/tasks/done/E2E-CONTINUOUS-001-006.md#2026-10-08-前批结果历史完整执行链结论被上述反例推翻)与[10月11日另轮](../../../../ops/archive/tasks/done/E2E-CONTINUOUS-001-006.md#2026-10-11-最终重录与headed验收accept)各守候选。静态模板不授runtime/E2E/视觉/coverage。完整原16行由回执span或固定5a Git blob恢复；固定777正文及完整回执语义已获非作者接收；后续根行政与中央接入范围见[专属治理记录](../../../../phase-governance/reviews/20261016-e2e-stage-m.json)，不自授新的运行信用。

## 2026-10-30 版本适用性规则

按[测试治理](../../../governance.md#版本适用性)取消活动 `reviewBy`。上文旧到期／续期只作历史，不再触发复核或重跑。运行 `node scripts/docs/testing-revisions.mjs e2e-005` 对比原候选、content/save版本及已声明源码指纹；记录缺失为unknown，相关边界不同为changed，匹配也不新增执行信用。status、lastVerified、原报告和机器证据保持原范围。
