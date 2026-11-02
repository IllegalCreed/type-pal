# TEST-GLM-STATE-COMMANDS-1 独立接收反证

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-GLM-STATE-COMMANDS-1 的 Codex 独立接收反证：候选 codex/glm-state-commands-r1@36c1f034（对 main@b1e646e2）判 counter/rework；GLM 是贡献者，自验不是独立接收。

## Scope

已证实：16 目标源码 SHA 与冻结表一致零漂移；reforge 4 文件 34/34、editor 12 文件 82/82 独立定向；b|c|d 三批反控各绿对照+三针钉名业务红（A 批不在工具批次表）；白名单恰 16 新叶测试+三薄 fixture+专属工具与回执。四项 counter：R1 A 批交付不完整（README 仍写待实施、ledger/fullName/命令退出码缺、A 反控未交付）；R2 静态硬门未过（biome 6 error/1 warning：A 四文件导入排序+use-menu-state 格式+工具 noTemplateCurlyInString）；R3 B/C/D 合法最小项目不合法（scene:s+scenes:[] 过 validateManifestEntryPoints 会被 assertProjectSaveValid 拒，as unknown as 越过类型检查）；R4 最终回执与树不同步（候选头 36c1f034 vs 卡面 7be02ad6）。

## Execution and assertions

- **定向+反控+静态**：vitest run glm-boundaries（34/34、82/82）；mutants b；c；d 各 exit0 三针红；biome 完整 JSON 6E/1W；Codex；R1-R4 逐项锚点（a/README.md:3、tools:20-183、b.ts:71-72、d.ts:74-75、c.ts:89-97、project-diagnostics.ts:148-210、:823-828）；返工后 Codex 定点复核 R1–R4 才合入

## Results

- counter 四项（R1 A 批证据链未交付/R2 biome 6E 1W/R3 B/C/D scenes:[] 非法最小项目/R4 回执与树不同步）；定向 34/34、82/82 与反控 b/c/d 三针已独立复现，16 目标源零漂移。

## Evidence

- 证据路径：本反证正文（quote 保全）；/tmp/codex-glm-state-{a,bcd}-tests.log、-mutants-{b,c,d}.log、-biome.log 在 quote 提及。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| r1 接收反证 | 原文时点 | 白名单核+定向+反控+静态门 | counter/rework | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy batches/glm-state-commands 的独立接收反证；固定来源与 source SHA 见下方保全节。

## 原始结论

counter/rework 四项（A 批证据链、静态 6E/1W、B/C/D 非法最小项目、回执不同步）；不合 main、不跑官方全仓 ratchet/strict-fast、不标 done。

## 当时证据

定向/反控/静态日志路径与 R1–R4 逐项锚点在 quote 保全。

## 当前有效性

historical。后续轮次以任务卡链为准。

## 继任文档

当前结论归 TEST-GLM-STATE-COMMANDS-1 完成卡（后续 R1-R4 返工已闭合、90400f17 集成）。

## 原文保全

固定源 revision `1cfd3cdbe7a13898672dfe5ae89b6a60e0f18c31`，source SHA `73f9298808753c624ef410c031f8e3138be5d122c888fa22ba4cbfaa772b092b`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # TEST-GLM-STATE-COMMANDS-1 独立接收反证
>
> 候选 `codex/glm-state-commands-r1@36c1f03400584f510e5ecfc79e24c208de1be506`，
> 对 `main@b1e646e2`；状态 **counter / rework**。GLM 是贡献者，自验不是独立接收。
> 本复核仅检查测试包；产品/旧测试/资产/官方基线均未进入候选增量。
>
> ## 已独立证实
>
> - `targets.freeze.json` 的 16 个目标源码 SHA-256 与候选工作树逐一相符，产品目标零漂移。
> - `env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/reforge exec vitest run glm-boundaries.test.ts`
>   为 4 文件 34/34；editor 同命令为 12 文件 82/82。原始日志
>   `/tmp/codex-glm-state-{a,bcd}-tests.log`。
> - `node docs/testing/archive/legacy/batches/glm-state-commands/tools/state-commands-mutants.mjs b|c|d` 分别 exit0；
>   三批各一组绿对照、三针确切钉名业务红。原始日志
>   `/tmp/codex-glm-state-mutants-{b,c,d}.log`。A 不在该工具的批次表，不能归入此结论。
> - 白名单增量恰为 16 新叶测试、B/C/D 三薄 fixture、专属工具和回执/任务卡；
>   主线 E2E 和三份未提交的帧编辑 WIP 未触碰。
>
> ## R1：A 批交付不完整
>
> `docs/testing/archive/legacy/batches/glm-state-commands/a/README.md:3` 仍写“待 GLM 实施”，四行 ledger、实际
> fullName、命令/退出码与去重分类全缺；`tools/state-commands-mutants.mjs:20-183` 的
> `batches` 仅有 b/c/d，`tools/README.md:16-20` 仍说 A 交付时再登记。
> A01–A04 的四个测试文件已在候选中且独立跑 34 绿，故不是缺代码，而是任务卡明定的
> 2–3 针 A 反控和证据链未交付。按当前测试标题选可达的单点错误，登记共用判据中的 A 对照和针，
> 从最终树生成四行回执；不得把 B/C/D 反控算成 A。
>
> ## R2：静态硬门未过
>
> 对所有新叶测试、B/C/D fixture 和共用反控工具执行 `pnpm exec biome check`，结果为
> **6 error、1 warning**（`/tmp/codex-glm-state-biome.log`）：A 的 Reforge 四文件均有导入排序错误，
> `use-menu-state` 另有格式错误；共用工具有格式错误与 `noTemplateCurlyInString` 警告。
> `CLAUDE.md` 的用户硬门要求 error/warning/info 全为零。修正后须在最终树一次性核全白名单，
> 保持反控针的原字符串字节和唯一命中，不能通过忽略规则消警。
>
> ## R3：B/C/D“合法最小项目”正例不合法
>
> `__tests__/glm-state-commands-b.ts:71-72` 与 `-d.ts:74-75` 都有入口 `scene: 's'`
> 和 `scenes: []`；`-c.ts:89-97` 同样 `scenes: []`，而 C 的 manifest 入口仍指向 `s`。
> 三者以 `as unknown as EditorState` 越过类型检查并自称“合法最小”。正式
> `project-diagnostics.ts:148-210` 的 `validateManifestEntryPoints` 会报
> `missing-entry-point-scene`，`assertProjectSaveValid` 在 `:823-828` 拒绝。
> 这与本卡“先过现行守卫”“C 从 buildBlankProject 取得正式可用基线”的准入冲突。
>
> 请使业务正例从现行合法项目/已验证 fixture 起步，并在构造后由正式保存门自证；
> 缺席表等有意非法的防御轴明确单列，不拿它充合法正例。更换基础状态后复核所有
> 输入深快照、引用 provider、负控及实际业务断言，不能只给空 `scenes` 加强转。
>
> ## R4：最终回执与树不同步
>
> 候选头是 `36c1f034`，任务卡“整包收口”仍写最终候选 `7be02ad6`，未包含后续
> `36c1f034` 测试修复。更新最终 SHA、A/B/C/D 逐文件计数、最终验证命令/exit 与
> 反控汇总。已有 B/C/D 结论无需无故重写语义，但必须以最终树复核。
>
> 当前不合 main、不跑官方全仓 ratchet/strict-fast、不标 done。GLM 返工后 Codex 对
> R1–R4 定点复核；通过才统一合入并串行执行全仓质量门。
>
<!-- original-source-quote:end -->
