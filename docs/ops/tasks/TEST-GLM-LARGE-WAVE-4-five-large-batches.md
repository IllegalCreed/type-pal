# TEST-GLM-LARGE-WAVE-4 — 五批大型当前合同补测

Status: review
Owner: GLM（单一测试 Coding Owner）
Reviewer: Codex（独立验收、统一质量门与集成）
Phase: phase2（editor/content/reforge/migrate；D 批仅引用原版数据格式，不改一阶段引擎）
Capability: coverage / editor / current-content / runtime-support
Visual Verification Timing: dev-functional（A 两条、B/C 各一条隔离小闭环）

## 用户授权与目标

2026-09-29 用户要求“再来至少 5 批任务给 GLM，每批都量大一些”。本卡给**一个 GLM 对话**
顺序实施 A–E **五个大批**：每批 6 个工作组、12 个互不重复的生产源码目标，共 30 组/60 目标。
每组须先旧测去重，有新合同才建测试；每批规划约 30–50 条有意义用例作为工作量参考，
不以凑用例或命中率为门。完整窄合同在[工作包](../../testing/glm-large-wave/README.md)，
路径与 source digest 在[冻结清单](../../testing/glm-large-wave/targets.json)。

当前临时模式按 [`AGENTS.md`](../../../AGENTS.md) 顶部：Codex 定范围/单一 Owner，GLM 贡献并自验，
Codex 独立接收和集成；固定三签暂休。此卡不授权产品、schema、存档、资产或用户可见行为变化。

## 前提真值门与上下文锚点

| 方向 | 当前核定 |
|---|---|
| 原版/primary source | 本卡没有原版玩法变更，普通 UI/当前 schema 测试 N/A。D 批若以原版字节/脚本映射作预期，须从 `data/raw` 或 `reference/sdlpal` 等一手输入逐轴核，不把合成输入说成原版实测。 |
| 第一阶段 | 不改 `packages/game` 或一阶段可见行为；一阶段机制对 A/B/C/E 为 N/A。D 批原始数据语义若有争议，先读 [`CLAUDE.md`](../../../CLAUDE.md) 与[工程经验](../../phase1/engineering-notes.md)，停止该轴交 Codex。 |
| 当前二阶段 | 生产冻结 `9c35748a0e36d6b1e4368a6b427ed63ab6d6e700`、正式 fast 基线 SHA256 `a682d4e1b970df7c2f5a100ca6a1c8ed9cc23e7a612b7328998949db9fa75b41`。`CommandForm.tsx:28–34` 组合 A 表单，`editor/main.tsx:24/28` 接 B 会话，`reforge/main.ts:179/181` 用 C script host，`migrate/migrate-content.ts:199/211` 用 D translator，`reforge/main.ts:146/159` 用 E 当前 loader/save preflight；先读 [`READ-FIRST`](../../phase2/READ-FIRST.md)。 |
| 本任务目标 | 产品 before → after 为**不变**；只新增可证伪回归及少量隔离功能画面。60 源目标及五个 digest 的只读验证命令：`node docs/testing/glm-large-wave/verify-targets.mjs`。 |

五批整文件未命中分支选题空间依次为 A 639、B 515、C 368、D 650、E 328；数字不是
可达性、新合同或保证增量。最强替代解释：旧测试跨文件/full-only 已证、空臂为合法守卫挡住的防御、
或导出当前无消费者。**推翻条件**：只有强转非法 fixture、mock 核心、读取私有态、复活旧版/无 caller
才能命中；该组登记 `existing-proof/unreachable/blocked`，继续其它组，不改预期凑绿。

前期已收口 Kimi 与三条 GLM 队列的 182 个主目标经只读脚本比对，本卡 60 源零交集；
新测试路径均未占用。E2E-R4-1 的场景/移动/对话主链、`EDITOR-SCENE-FACING-1` 已知红、
第三阶段地图重建及角色换装均不属于本卡。真实用户产品取舍仍交用户，不能由测试补测暗定。

## 批次与单写入所有权

| 批 | 组 / 源码 | 主要公开合同与风险边界 | GLM 自验 | Codex 独立验收 |
|---|---|---|---|---|
| A 编辑器表单/工作区 | A01–A06，12 源；目标 `command-form-control.tsx:54`、`DataMode.tsx:54` 等 | 合法表单提交/取消、作者页、资源预览；不接 App/ScriptEditor 总链，A 两条视觉 | pending | pending |
| B 编辑器会话/引用 | B01–B06，12 源；`script-editor.ts:37`、`edit-session.ts:42` 等 | 定位、引用、undo、派生态与当前保存；临时目录/内存 FSA，B 一条视觉 | pending | pending |
| C Reforge 脚本/演出助手 | C01–C06，12 源；`script-runner.ts:34`、`dither-transition.ts:15` 等 | 有界公开 step/tick/帧输出；无主场景 E2E、碰撞/战斗会话，C 一条视觉 | pending | pending |
| D 迁移纯映射/诊断 | D01–D06，12 源；`translate-events.ts:65`、`migration-transaction.ts:27` 等 | 原始输入/当前输出、审计路径、临时 journal；不跑真实迁移/提取/烘焙/发布 | pending | pending |
| E 当前内容校验/项目读取 | E01–E06，12 源；`validate.ts:78`、`project-loader.ts:71` 等 | 当前 canonical guard、引用、loader/save preflight；不保旧版兼容、不写真档 | pending | pending |

同一实现文件同一时间仅 GLM 一位 Coding Owner。五批在
`/Users/zhangxu/.codex/worktrees/glm-large-wave/type-pal`、`codex/glm-large-wave-r1` 分支中
A→E 连续做；每完成 6 组固定提交并推送完整候选 SHA，可继续下一批，不等固定 AI 席位签字。
该隔离树从派发提交建立；不得在 main 或 E2E 工作树实施。

## 精确白名单与质量门

- `targets.json` 中每个源文件旁边仅允许一个同目录新测试：`stem.glm-large-wave.test.ts` 或
  `.tsx`（后缀与源扩展名相同）；没有新合同可不建。专属 typed fixture 仅各受影响包的
  `src/__tests__/glm-large-wave/**`，工具/回执/诊断/隔离宿主仅 `docs/testing/glm-large-wave/**`。
  冻结清单、生产、旧测试、共享配置、依赖/锁、官方覆盖基线、任务卡/看板由 GLM 只读。
- 使用现行正式构造器/guard 和实际被消费的对象；合法路径不得 `any`、`as never`、双强转或
  `@ts-ignore/@ts-expect-error`。不 mock 被测函数/守卫；输入前深快照与完整非空业务结果要相互可证伪。
  异步须 entered/deferred/finally 释放，不能以固定 sleep 或超时作为取消证明。
- 每批定向新测/相邻、相关包 typecheck、精确新增文件 Biome **error/warning/info 全零**、
  docs/diff；每批约 2–4 针共用一套可自测严判据（exit0 对照、恰 exit1 业务红、绝对文件/fullName、
  唯一注入、实际执行、拒混错/timeout/skip、产品 hash 不变）。数量不是反控验收门，针要有实际鉴别力。
- A/B/C 最小浏览器宿主用自有空闲 6086–6089 严格端口和临时项目，不碰 6005/6010/6050/E2E。
  截图 `/tmp/type-pal-glm-large-wave/`，回执写完整 SHA256、视口、URL、步骤/预期/实际与 console。
  直挂组件只声明直挂范围，不冒充完整 App；D/E 纯函数不强行造视觉。
- 发现真产品 bug：本目录隔离红诊断写正确预期/实际/调用链，交 Codex 另卡修；GLM 不越界改产品。
  未定 schema/save/迁移或一阶段机制政策先停对应组，不能把当前错误表现钉为合同。
- GLM 不运行全仓 check、官方 ratchet/strict-fast 或 E2E，不修改生产资源/正式工程。
  五批结束 Codex 核真实最新 HEAD、独立复核并集，串行执行必要全仓 check → 官方 ratchet →
  受保护单次 strict-fast；正式收益以 main 并集计，不相加隔离分支增量。

## 当前模式推进记录与交接

- 2026-09-29 Codex：当前正式基线与60个源码、旧队列零交集、所有派生新测试路径未占用均已核；
  每批 6 组/12 源，五个 source digest 可独立复算。Coding Owner：GLM；Reviewer：Codex。
- 2026-09-29 Codex：派发文档提交 `86c5590928da523a1338c6ea79d4567bedfeff2b` 后创建隔离
  工作树 `/Users/zhangxu/.codex/worktrees/glm-large-wave/type-pal`，分支 `codex/glm-large-wave-r1`；
  单一写入 Owner 仍为 GLM，Codex 只负责准入、独立验收与最终集成。
- `draft -> build` 准入：**build allowed 仅限上述测试/fixture/隔离证据**。高风险 D/E 仍须每组
  用当前合法输入与直接证据，不授权产品/格式/写盘变更。用户可见产品验收 N/A。
- `review -> done` 尚未开放；待 GLM A–E 候选、自验、反控/视觉与 Codex 独立验收、统一质量门。

## 2026-09-29 Codex 独立审核与返工

候选 `8cb0af0ad2e5952c01e8fa95144b495df4ceaecc` 独立审核结论为 **rework，
未接收/未合 main**。完整一手命令、通过项和五条返工项见
[Codex 审核回执](../../testing/glm-large-wave/codex-review-8cb0af0a.md)。
定向 66/66、三包 typecheck、冻结/文档检查通过；但完整 lint 有 15 error/2 warning/1 info，
且 typed fixture、测试路径和反控判据不合卡面。GLM 只修原白名单内问题，
复跑零诊断和反控并推送新完整 SHA；Codex 再审后才可能做全仓/官方覆盖门。
用户可见产品取舍仍未授权；F–J 并行 wave 与本卡独立。

R2 候选 `031b3e479e18bf1add1d5b559716172cfb7c031f` 的 lint、三包 typecheck、
66 项定向测试、强转/后缀/17:43 已核闭合，但严格反控的 INVALID 路径会遗留临时针文件，
且部分回执锚仍陈旧；结论仍为 **rework**。见
[Codex R2 审核回执](../../testing/glm-large-wave/codex-review-r2-031b3e47.md)。
GLM 只修反控判据/自测与记录，不再扩大测试范围；官方覆盖门继续暂缓。

## 历史首轮派发提示词（已执行）

```text
你是 GLM，本卡 TEST-GLM-LARGE-WAVE-4 的唯一测试 Coding Owner。先读 AGENTS.md、CLAUDE.md、
docs/phase2/READ-FIRST.md、docs/ops/tasks/TEST-GLM-LARGE-WAVE-4-five-large-batches.md、
docs/testing/glm-large-wave/README.md 和 targets.json；D 批遇原版数据语义再读
docs/phase1/engineering-notes.md 与相应一手字节/reference。先运行
node docs/testing/glm-large-wave/verify-targets.mjs。仅在
/Users/zhangxu/.codex/worktrees/glm-large-wave/type-pal 的 codex/glm-large-wave-r1 分支
连续做 A→E 五批，每批 6 组/12 源；每批完成提交推送固定 SHA 后继续，不等固定席位签字。
先核现行 caller 与精确旧断言，确有新合同才建同目录 .glm-large-wave.test.ts(x)；
合法 typed fixture/真实公开 API/输入深快照，禁止强转、mock 核心或改预期凑绿。
每批跑定向+相邻、相关包 typecheck、Biome 零诊断、docs/diff 和 2–4 枚代表反控；
A 两条、B/C 各一条自有端口功能视觉，D/E 不造视觉。只改白名单测试、专属 fixture 与证据；
不改产品、旧测试、配置/依赖/基线/正式工程，不跑真实迁移/提取/烘焙或 E2E。
每批回执给完整候选 SHA、逐组旧证→新差异、JSON file/fullName/status、反控、截图和未证项。
GLM 贡献者不合 main/标 done；Codex 独立验收、统一覆盖率门、集成推送和清理。
```

## 历史 GLM r1 返工提示词（已执行）

```text
你仍是 TEST-GLM-LARGE-WAVE-4 的测试 Coding Owner。只在原工作树
/Users/zhangxu/.codex/worktrees/glm-large-wave/type-pal、原分支 codex/glm-large-wave-r1
返工候选 8cb0af0ad2e5952c01e8fa95144b495df4ceaecc。先读本卡和
main 上 docs/testing/glm-large-wave/codex-review-8cb0af0a.md（必要时 git show origin/main:路径）；
不拉取/合并 F–J 分支。逐项闭合完整 lint 15/2/1、24 处非法强转、两个测试扩展名、
needle-judge 判据及自测、并集 17/43 计数和逐批完整 SHA。UI 子组件替身须按卡面端口
边界改成真实消费链或收窄未证声明；恢复只读 README，别修改产品、旧测试、配置、
官方基线或正式工程。复跑新测+相邻、三包 typecheck、完整 pnpm lint 零诊断、docs/diff、
严格反控；提交推送新完整候选 SHA 和逐项证据。你不合 main、不标 done；Codex 独立复核。
```

## 历史 GLM R3 窄返工提示词（已执行）

```text
你仍是 TEST-GLM-LARGE-WAVE-4 测试 Coding Owner。只在原工作树
/Users/zhangxu/.codex/worktrees/glm-large-wave/type-pal、原分支 codex/glm-large-wave-r1
返工 R2 候选 031b3e479e18bf1add1d5b559716172cfb7c031f。先读本卡和 main 上
docs/testing/glm-large-wave/codex-review-r2-031b3e47.md。重点修 needle-judge.mjs：
INVALID/异常也必须删临时针；精确核绝对失败文件、完整 fullName 和 failed=1，
selftest 对每种 INVALID 断言无遗留临时文件。修 receipt-batch-b 的旧 .tsx 后缀；
五批回执和 R2/R3 证据写完整候选 SHA，docs issue 按实际 7 条登记。
只改原卡隔离工具/回执/必要新测，不碰产品、旧测、共享配置/基线或 F–J；
不要为过 docs 门修改只读 README（Codex 负责导航）。复跑 selftest、11 枚业务针、
定向测试、三包 typecheck、完整 pnpm lint 0/0/0、docs/diff，推送 R3 完整 SHA
和逐项证据。你不合 main、不标 done；Codex 独立再审。
```

## 2026-09-29 Codex R3 候选验收

候选 `4e200099257ed5167b640eb5abadd7129859dfee` **代码/证据 accept**，
见[独立验收回执](../../testing/glm-large-wave/codex-accept-r3-4e200099.md)。
状态为 `review`，尚未合 main；7 条只读 README 导航由 Codex 集成时补齐，
统一 `pnpm check`、官方 ratchet、受保护 fast 和 main 并集收益均未运行/未确认。
无下一位 GLM 提示词；等待 Codex 与其它已接收 wave 选择性集成及统一收口。
