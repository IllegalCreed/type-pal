# Q2 正常战斗专项入口

Status: current
Owner: Codex
Last reviewed: 2026-11-12
Template: governance-index-v1 / 1.0.0

## 目的

定位正常战斗双端验证的运行方式、覆盖台账、原件与后续范围。

## 范围

任务状态取原卡。已执行的场景、验证义务和原件取覆盖报告及配对机器回执。

## 当前状态

首批业务闭环已补三处表现复验。第二批核单体普攻和双回合操作，第三批核敌双动、敌方睡眠、普攻附毒和赤毒头像。第四批已复验八个局面的回合反馈、动作音效、主动防御复位及自动格挡，归档血口虫的两段带声分屏。

## 入口与责任

- [覆盖报告](report.md)：场景、指令、断言、已测/未测与后续差异。
- [机器回执](evidence.json)：冻结候选、实际命令、原件与SHA。
- [任务卡](../../../../tasks/cards/E2E-Q2-1-battle-foundation.md)：Coding Owner、准入、独立复核和接续范围。
- [通用E2E合同](../../../e2e/contract.md)：真实输入、采集、比较和分屏验收要求。

## 证据与下一步

从报告的冻结候选和绑定原件重比。后续批次按任务卡准入并回填对应覆盖。

带声复核使用单个固定局面。例如运行 `node scripts/e2e/battle-foundation.mjs --engine=game --scenario=equivalent-poison --audio-review`，第二阶段换 `--engine=reforge`。自动格挡用 `--scenario=automatic-block`。输出含原始浏览器音轨与可暂停画面，正式比较使用同一候选的 verify 报告。
