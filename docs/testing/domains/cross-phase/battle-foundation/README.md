# Q2 正常战斗专项入口

Status: current
Owner: Codex
Last reviewed: 2026-11-13
Template: governance-index-v1 / 1.0.0

## 目的

定位正常战斗双端验证的运行方式、覆盖台账、原件与后续范围。

## 范围

任务状态取原卡。已执行的场景、验证义务和原件取覆盖报告及配对机器回执。

## 当前状态

首批业务闭环已补三处表现复验。第二批核单体普攻和双回合操作，第三批核敌双动、敌方睡眠、普攻附毒和赤毒头像。第四批已复验 13 个局面的回合反馈、动作音效、血口虫行动节拍、玩家伤亡对白、雷咒和毒伤，并实跑普通明雷全灭和读档。物攻伤亡与上述伤亡及全灭分屏均已获用户验收。玩家动作追加了合击降级、回梦收招及法术绘制顺序复验，已获用户接受并由 PR #63 合入。道具组七局双端通过，四段原速带声分屏获用户验收并由 PR #64 合入。后继五个固定局面已完成双端复验。逐件投掷、化尸水目标和提示、定身与封咒解除、护体自然过期有各自的原件。其余范围取覆盖报告。

## 入口与责任

- [覆盖报告](report.md)：场景、指令、断言、已测/未测与后续差异。
- [机器回执](evidence.json)：冻结候选、实际命令、原件与SHA。
- [任务卡](../../../../tasks/cards/E2E-Q2-1-battle-foundation.md)：Coding Owner、准入、独立复核和接续范围。
- [通用E2E合同](../../../e2e/contract.md)：真实输入、采集、比较和分屏验收要求。

## 证据与下一步

从报告的冻结候选和绑定原件重比。覆盖台账列出投掷、玩家仙术、合击、特殊状态和增益的实际进度。后续批次按任务卡准入后继续同样的双端流程。

两端默认各跑完整矩阵。只核玩家动作时，两端 runner 和离线比较器均传 `--group=player-actions`。合击降级和回梦命中、抵抗传 `--group=coop-sleep-followup`，战斗道具与投掷传 `--group=item-effects`，复核解睡、护体、五气朝元、盐巴与吸星锁传 `--group=status-followup`。带声复核使用单个固定局面。例如运行 `node scripts/e2e/battle-foundation.mjs --engine=game --scenario=equivalent-poison --audio-review`，第二阶段换 `--engine=reforge`。自动格挡用 `--scenario=automatic-block`。输出含原始浏览器音轨与可暂停画面，正式比较使用同一候选的 verify 报告。Verify 默认采集轨迹和截图，需另存静音视频时传 `--visual-review`。
