---
testingSchema: 2
id: game-script-corrections
evidence: domains/cross-phase/script-corrections/evidence.json
---

<!-- testing-meta
{"id":"game-script-corrections","sourceRefs":[{"path":"packages/pal-extract/src/events/script-corrections.ts","lines":"148","anchor":"export function correctScripts","role":"correction-source","sha256":"235627c8a17ca5bba8a50ae19a70525c33d6043a9d7305e1bf396d2b85517b0c"},{"path":"packages/pal-extract/src/events/win-script-corrections.json","lines":"2","anchor":"\"version\": \"pal-win-1\"","role":"reviewed-rule-data","sha256":"c345c2a9b823446105369001d6a672d1368a55784c8dcaa6ec5fed87310c7e02"},{"path":"packages/pal-extract/src/cli.ts","lines":"230","anchor":"const corrected = faithful","role":"caller","sha256":"9cb15bea656a04f4c5793386df75a1acd67a38c0ca6774fa431a11304141b8b7"},{"path":"packages/game/src/core/object-script-state.ts","lines":"63","anchor":"export function setMagicScriptEntry","role":"saved-entry-owner","sha256":"8d805022e2ea3fc951abd83b3c58f22035140069cf79366f744df2e4e3beee32"},{"path":"packages/game/src/core/script-story-corrections.pal.test.ts","lines":"33","anchor":"function play","role":"oracle","sha256":"912ae80ee2c9d7f162999488b21b7ea48d350231590e5d660ff147dd2abda192"},{"path":"packages/game/src/core/script-topology-corrections.pal.test.ts","lines":"59","anchor":"function portal","role":"oracle","sha256":"a95ff231f2a7c434c31d1c989f025e52f2dc1152967ce8f9704c371b6890110b"},{"path":"packages/reforge/src/pal-story-corrections.test.ts","lines":"11","anchor":"test('鬼阴坛告别","role":"oracle","sha256":"caa2b63faa2c75691cbc8b4164f8949e63af4f46ce1bf5e9bcb816ed1d5adcf9"},{"path":"packages/reforge/src/battle/pal-cure-status-corrections.test.ts","lines":"54","anchor":"test.each","role":"oracle","sha256":"2bd2b255958e04579a377b2aadd29e98f18231c624f52af6d23b6b8371a444c5"}],"publicCallers":["pnpm extract","pnpm --filter @type-pal/game exec vitest run src/core/script-corrections.pal.test.ts src/core/script-story-corrections.pal.test.ts src/core/script-topology-corrections.pal.test.ts --reporter=default","pnpm --filter @type-pal/reforge exec vitest run src/pal-story-corrections.test.ts src/pal-court-corrections.test.ts src/pal-trial-portals-corrections.test.ts src/pal-palace-corrections.test.ts src/battle/pal-cure-status-corrections.test.ts --reporter=default"],"legalInputs":["Supported Win SSS.MKF SHA and original M.MSG; default corrected generation after faithful round-trip","Current typed GameState, real extracted scripts, isolated legal script boundaries","Canonical PAL author content22 and SAVE12; stable actor/entity identities"],"businessOracle":{"type":"paired-script-gameplay-and-source-integrity","assertions":["Declining a purchase preserves cash; successful purchase pays exactly twenty; insufficient cash gives nothing","Cures remove silence while retaining buffs; replacing/removing the blade keeps correct slot bonuses","Story completion, conditional actor presence, early handover cleanup and portal return routes hold independently in each phase","Wine God progress belongs to saved OBJECT state, removes Li Xiaoyao magic on use nine, rejects a tenth through normal action validation, resets on new game","Bad source/prevalue rejects; raw bytes unchanged; generation is repeatable and final byte changes update asset manifest"]},"dedupe":{"result":"reviewed","against":["packages/game/src/core/event-system.test.ts","packages/game/src/core/scene-system.test.ts","packages/reforge/src/battle/r13-six-b-battle.test.ts","packages/reforge/src/pal-unified-steps-content.test.ts"],"notes":"Retired two runtime treasure patch tests with their removed helper; extraction rules and real caller tests replace that contract. Existing generic mechanisms retained. Headless runner/effect seams and map connectivity do not grant complete route or visual E2E credit."},"revision":{"currentSha":null,"shaStatus":"missing-in-report","contentVersion":22,"minimumSaveVersion":12,"history":[{"date":"2026-10-22","action":"two-phase-corrections-implementation-and-regression","scope":"Working candidate, before final integration commit. Original red logs, corrected green tests and generation receipts retained. Full browser/story E2E not executed."}]},"evidence":"domains/cross-phase/script-corrections/evidence.json","schemaVersion":2}
-->

# 两阶段脚本纠错与持久入口回归

Status: active
Owner: Codex
Last reviewed: 2026-10-22
Template: test-domain-report-v1 / 1.1.0

## Domain scope

第一阶段以忠实解码后的构建纠错和通用 OBJECT 脚本入口所有权修复；第二阶段直接修改 canonical 作者内容。逐项 D/E 处理、旧审计勘误与原始输入 SHA 由[任务卡](../../../../ops/tasks/GAME-SCRIPT-CORRECTIONS-1.md)维护，未上传 raw/en/EXE。

## Claim matrix

| 合同 | 真实 caller / oracle | 限制 |
|---|---|---|
| 数据纠错、输入拒绝、缓存刷新 | 默认 CLI、round-trip、规则前值、最终输出字节 SHA | faithful 显式仅解码；原盘仅本地 |
| 剧情、购买、清状态、装备和门禁 | Game tickEventSystem、performMagic/performItem、装备 runner；Reforge ScriptProjectRuntime、battle execution | 单段合法脚本边界；host UI、战斗结果和资产 I/O有明确测试 seam |
| 九次酒神与通用进度 | 原盘法术脚本 + 保存导入/读档 + Repeat action validation | 旧发布档没有过去的入口进度时从原静态入口开始，无法追溯推测已用次数 |
| 传送及返回 | 真实 portal 脚本 + 原地图生产碰撞/连通性；二阶段独立入口/出口 | 地图通路证明不等于从新游戏走到此处的连续 E2E |

## Inputs and fixtures

输入和命令见 metadata。原盘依赖用例命名 `*.pal.test.ts`，沿既有 fast/full 分区执行；缺输入直接失败，无 skip 或测试环境旁路。合成 CLI 输入显式 faithful，真实源默认纠正另测。Wine God 生命周期测试采用保留原控制流的局部指令表，并与真实资源九次施法配对；损坏指纹/前值测试只计输入拒绝域。

## Results and gaps

[配对 evidence](evidence.json)与[本任务原始日志](../../../../ops/evidence/GAME-SCRIPT-CORRECTIONS-1/)保存修前失败、修后结果、夹具校准和生成回执。两阶段独立测试，已有正确/不适用组仍保留核对依据。初次集成发现贡献者未完成的局部 helper 变量，已修复并重新通过；不把此失败冒充修复原 bug 的 red。

官方fast基线重新实测：20,081例全部通过；总行覆盖率92.05%、分支83.88%，各包不下降。原盘依赖的第一阶段22例及提取/CLI/往返7例另有逐例原生结果，未计入fast。受保护基线比较与全仓检查的最终回执见任务卡。

完整故事浏览器 E2E、演出逐帧与编辑器预览现场、部署均未执行；这些结果不得从本报告推导为 passed。

## Quality gate

最终集中检查及按失败范围续验、lint、typecheck、docs、coverage均已写回[集成回执](../../../../ops/evidence/GAME-SCRIPT-CORRECTIONS-1/integration-receipt.json)；原整仓命令的失败不倒写为0。原始诊断和失败保留。贡献者候选由 Codex 按真实差异、返回入口生命周期、schema读写、原始规则与最强反例独立复核；无重复全文审核或重复全量跑测声明。
