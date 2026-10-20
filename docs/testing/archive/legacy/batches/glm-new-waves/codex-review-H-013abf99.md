# TEST-GLM-NEW-H-1 · Codex 独立审核 r1

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-GLM-NEW-H-1 首轮审核（2026-09-29，HEAD 013abf99…c6c2、基点 2948810f）：**rework，未合 main，未运行官方门**。

## Scope

- 已独立验证：差异为 12 同目录新测+Wave H typed harness+三份 JSON；产品/旧测/配置基线未改；game typecheck 零诊断；定向 12 文件 48/48；docs 0 issue；派发校验器缺陷 main 修复不归责；一手抽查 fight.c:4719-4775 法术自动防御先掷再跑 scriptOnUse、battle.c:1238-1293 hidden-exp 等级 99 钳制、script.c:3267/3428 ClearDialog 确证；合成 fixture 不冒称原始实测、baseDamage≤0 疑点登记未证未私改。

## Execution and assertions

- **返工 1**：完整 lint 失败 3 errors（wave-H/{counter-controls,receipt,vitest}.json 格式）——局部 13 代码文件 Biome 0 不等于硬门 0/0/0
- **返工 2**：magic.glm-next-wave.test.ts:66-104「RNG 预掷先于 scriptOnUse」未记录真实交错顺序：runScript 写独立 log 函数结束才构造 rngCalls: [...rng.calls, ...log]——脚本在这个数组中永远排在全部 RNG 之后（无论何时执行）；改 RNG 与脚本回调写同一实时事件轨迹再断言首掷早于脚本；保留孪生战斗结果正反证
- **返工 3**：counter-controls.json 四枚反控直接临时改 battle-opcodes/anim-timeline/battle-progression/battle-settlement 生产源码并用 checkout 还原——卡面产品只读；改隔离副本或 loader 注入；判据核基线 exit0/针 exit1/唯一注入/预期失败集合/绝对 file-fullName/执行数/无混错-skip-timeout-exit2/生产 hash 不变+可复跑证据
- **返工 4**：receipt.json:144-147 head 是「branch tip at push」文字非固定完整 SHA；写入 r1 与返工候选完整 SHA、更新新鲜 JSON 与反控；未经实测不把 48/48 推为官方覆盖率收益

## Results

- 返工仅修 Wave H 原白名单；视觉按卡不要求；复跑定向+相邻+game typecheck+完整 lint 0/0/0+docs/diff。

## Evidence

- 证据路径：本回执正文（quote 保全）。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| r1 审核 | 2026-09-29 | 时序拼接+瞬态改生产+JSON 格式+SHA 文字 | rework | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy batches/glm-new-waves 的 Wave H r1 审核回执；固定来源与 source SHA 见下方保全节。

## 原始结论

rework 四项：三 JSON 格式、rngCalls 事后拼接（脚本恒排后）、四针直接改生产源 checkout 还原越只读白名单、head SHA 文字化；一手 C 源抽查确证。

## 当时证据

四项返工与一手抽查在 quote 保全。

## 当前有效性

historical。rework 由 r1 返工 accept 闭合。

## 继任文档

当前结论归 Wave H r1 返工验收回执。

## 原文保全

固定源 revision `64bd3b936eb8fdd0943deba5e476d032a30c1830`，source SHA `df0e94054e59f281c463d0953bdb45ed553e9e763bdf2dd3dee010b375e0da6a`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # TEST-GLM-NEW-H-1 · Codex 独立审核 r1
>
> 日期：2026-09-29。候选 `codex/glm-new-h-r1` HEAD
> `013abf99e647ecd027aeb05d6225ae5c9ee7c6c2`，相对派发基点 `2948810f`。
> 结论：**rework，未合 main，未运行官方 ratchet/受保护 fast**。
>
> ## 已独立验证
>
> - 差异为 12 个同目录新测试、一个 Wave H typed harness 和三份 wave-H JSON 证据；
>   未改产品源、旧测试、共享配置/基线或其它 wave，候选工作树干净，diff check 干净。
> - `@type-pal/game typecheck` 零诊断；Codex 定向复跑 12 文件 **48/48 passed**；
>   候选文档检查 0 issue。派发版 `verify-targets.mjs` 会把交付后存在的新测试
>   误判路径占用，属于 Codex 脚本缺陷，已在 main `10a5d601` 修复，非 GLM 返工项。
> - 一手抽查：`reference/sdlpal/fight.c:4719–4775` 确有法术自动防御先掷再跑
>   scriptOnUse；`battle.c:1238–1293` 有 hidden-exp 等级 99 钳制与仅主升级时回满；
>   `script.c:3267/3428` 确有 ClearDialog。合成 fixture 不冒称原始实测，
>   baseDamage≤0 等可疑产品差异被登记未证而未私改产品。
>
> ## 必须返工
>
> 1. 完整 `pnpm lint` **失败：3 errors**，均为提交的
>    `docs/testing/archive/legacy/batches/glm-new-waves/wave-H/{counter-controls,receipt,vitest}.json`
>    格式诊断。局部 13 代码文件 Biome 0 不等于硬门 0/0/0；按原规则格式化证据，
>    重跑完整 lint，不加 ignore/降规则。
> 2. `packages/game/src/core/battle/actions/magic.glm-next-wave.test.ts:66–104`
>    的“RNG 预掷先于 scriptOnUse”测试并未记录真实交错顺序：`runScript` 写独立
>    `log`，函数结束才构造 `rngCalls: [...rng.calls, ...log]`，因此无论脚本何时执行，
>    它在这个数组中永远排在全部 RNG 之后。改为 RNG 与脚本回调写**同一实时事件轨迹**，
>    再断言首掷早于脚本；保留孪生战斗结果正/反证。
> 3. `wave-H/counter-controls.json` 记载四枚反控**直接临时改
>    `battle-opcodes.ts`、`anim-timeline.ts`、`battle-progression.ts`、
>    `battle-settlement.ts` 生产源码并用 checkout 还原**。虽然候选最终 hash/工作树已干净，
>    卡面仍明确产品只读、贡献者仅写新测/专属 fixture/证据。请改用隔离副本或 loader
>    注入完成代表针，不在正式源码路径做瞬态变异；判据需核基线 exit0、针 exit1、
>    唯一注入、预期失败集合、绝对 test file/fullName、实际执行数、无混错/skip/
>    timeout/exit2、前后生产 hash 不变，并留可复跑证据。
> 4. `wave-H/receipt.json:144–147` 的 `head` 是“branch tip at push”文字，
>    不是固定完整候选 SHA。写入 r1 与返工候选的完整 SHA，更新新鲜测试 JSON 和
>    反控结果；未经实测不把“48/48”推为官方覆盖率收益。
>
> 仅修 Wave H 原白名单；视觉按卡不要求。返工后复跑定向及相邻、game typecheck、
> 完整 lint 0/0/0、docs/diff，推送新 SHA 交 Codex 再审。
>
<!-- original-source-quote:end -->
