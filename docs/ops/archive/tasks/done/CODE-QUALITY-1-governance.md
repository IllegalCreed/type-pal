# CODE-QUALITY-1 - 全仓代码质量治理与首批 RLE 解码边界

Status: done
Phase: cross-phase code quality
Capability: ops / code-quality
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Contributor: Codex
Branch: codex/code-quality-governance
Base: `b9ba7e0fa` (`origin/main`，2026-10-04)
Worktree: `/Users/zhangxu/illegal/type-pal-code-quality`

> 本卡覆盖代码质量专项的总纲、机器清单和首个有限实现批。它不重领
> `docs/ops/audits/architecture-debt.md` 中已完成的 13 批架构拆分，也不接管覆盖率、E2E、测试文档线程。
> 当前模式按 [`AGENTS.md`](../../../../../AGENTS.md) 执行：Codex 负责范围、实现和独立验收；固定三签不是当前门禁。

## 目标

建立按工程 → 模块 → 功能 → 文件组织、可机器核验且不与并行线程重叠的代码质量治理账，先在 shared 的 RLE
解码边界收口一个可证伪的失败语义问题：畸形零长度/截断指令不得让生产解码器死循环或静默读入未定义字节，合法
资源的像素与透明度结果保持不变。

## 范围

- 范围内：`packages/shared`、`packages/content`、`packages/pal-extract`、`packages/migrate`、`packages/game`、
  `packages/reforge`、`packages/editor` 与 `scripts` 的生产源码逐文件清点；Q1 收 shared RLE 解码边界，Q1b 收
  editor PAL project-reference census 合同与官方覆盖基线更新。
- 范围外：覆盖率目标/候选测试批，E2E/剧情脚本，`docs/testing/**`，并行线程正在修改的实现文件，
  `projects/**`、`data/raw/**`、生成输出、vendor/reference、schema/save、UI 形态和产品玩法。
- 明确不做：按行数、静态计数或重复片段直接判债；只改名、搬文件、补表面注释；恢复旧版本 upgrader/fallback；
  直接改生成产物；为过门降低 lint/typecheck/格式规则或新增 ignore。

## 前提真值门

### 一句话行为 / 工程前提

生产 RLE 解码入口必须对合法帧保持既有像素/opaque 结果，并对无法消费的指令在有限步内显式失败或按既有 PAL
宽容入口跳过，不能因零长度或截断输入无限循环、越界读取或把 `undefined` 当像素。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | PAL RLE 以宽高和指令流逐像素推进；零长度指令不产生进度，不能作为可消费帧继续运行 | `reference/sdlpal/palcommon.c:118-226`；`palcommon.c:129-140` 的 `T` 分支 |
| 第一阶段 | shared `decodeRle` 被 extractor 与 game 共同消费；宽容 `parseSpriteChunk` 已对 broken sprite 尺寸跳过，严格入口拒坏容器 | `packages/shared/src/rle.ts:1-9,61-100,103-124,167-182,189-216`；`packages/game/src/assets/tileset-blob.ts:34-55`；`packages/pal-extract/src/cli.ts:372-390` |
| 当前二阶段 | Reforge 直接消费 shared 的 `parseSpriteChunk`，不应把第一阶段的隐式死循环或未定义读入带入新资源加载链 | `packages/reforge/src/assets.ts:1-45,420-450`；`docs/phase2/READ-FIRST.md:1-11,17-30` |
| 本任务目标 | 在 shared 解码层增加有限进度/边界检查；合法输入字节结果不变，宽容入口继续跳过不可解帧，严格入口继续 fail-loud | `packages/shared/src/rle.ts:50-100,128-164`；首批验证见本卡“验收条件” |

### 反证与替代解释

- 最强替代解释：`0x00` 或 `0x80` 可能是某个真实资源方言中的合法 no-op，当前 decoder 只是为了对齐旧引擎而故意容忍。
- 什么观察会推翻当前前提：原始/供应链资源样本中存在需要零长度指令推进的可达帧，且对应调用方依赖“读入 undefined/无限等待”才能得到正确像素；或首批回归显示合法 PAL 帧 digest 改变。当前仓库没有提交 `data/raw` 原始资源，不能把“未扫描到”写成已排除。
- audit 红项替代根因排查：
  - runtime 语义 / 命令分类：RLE 指令解释只在 `shared/rle.ts`，不是事件或战斗命令；首批不改 opcode/渲染语义。
  - 原版 / 第一阶段理解：直接读取 `palcommon.c` 的消费循环与现有 `rle.test.ts`/`rle.boundaries.test.ts`，仅收紧无进度/缺字节输入。
  - extractor / 地图 / 数据解码：`parseSpriteChunk` 的 source caller 只依赖返回帧；不改地图/提取映射，不改生成物。
  - audit / test model：现有严格测试已证明命令 0 会被拒绝，但未覆盖 `0x80` 无进度和宽容入口的截断；既有 runtime-resource 回执还明确登记“截断流会死循环、交 Codex 裁决”（`docs/testing/glm-runtime-resource-wave/receipt.md:73-81`）。新增测试只钉这两个原子失败合同，不增加覆盖率配额。

### 用户可见偏离

- 是否主动偏离已核真值：N/A（内部畸形输入失败语义收紧；合法资源的用户可见表现不变）
- `before -> after` 一句话：`畸形 RLE 可能死循环/读未定义字节 -> 在有限步内抛错，宽容 sprite 入口跳过该帧并继续其它帧`
- 代表场景：game/reforge 加载含损坏尾帧或截断帧的 sprite blob 时，页面/CLI 不再卡在解码循环；正常角色、tileset、dialog icon 的像素与 opaque 逐字节不变。
- 用户裁决：N/A

## 上下文锚点

- 已拍板决策 / 铁律：`AGENTS.md:11-25,66-84`（单一 Owner、零诊断、证据先于方案）；`CLAUDE.md:5-29`（阶段区分、只修根因、允许行为不漂移治理）；`docs/phase2/READ-FIRST.md:1-11,17-30`（Reforge 架构优先、不可把旧引擎怪癖带入）。
- 代码锚点：`packages/shared/src/rle.ts:50-100`（宽容 decoder）；`:128-164`（严格 decoder）；`:167-182`（宽容 sprite 入口）；`packages/game/src/assets/tileset-blob.ts:34-55`、`packages/game/src/assets/dialog-assets.ts:69-92`、`packages/pal-extract/src/cli.ts:372-390`、`packages/reforge/src/assets.ts:420-450`（生产 callers）。
- 已知坑 / 审计文档：`docs/ops/audits/architecture-debt.md:18-23,67-80`（不以行数判债、状态/错误/释放证据）；`docs/testing/quality-zero/README.md`（静态零诊断已收口，不借本卡修改规则）；`docs/phase1/engineering-notes.md:34-37`（修真因、不在相邻层叠补丁）。
- 不得重新引入：完整 `RuntimeContext`、下标身份替代稳定语义、旧版本兼容 fallback、测试专用导入绕过 typed caller、对合法数据无证据的行为改写。
- 相关测试：`packages/shared/src/rle.test.ts`、`packages/shared/src/rle.boundaries.test.ts`、`packages/shared/src/rle-encode.test.ts`；受影响包 typecheck/test 与最终 `pnpm check`/`pnpm lint`。

## 验收条件

测试按[统一质量标准](../../../agent-workflow.md)核对原子合同、合法 typed 输入、真实 decoder caller、排重和有效反控；不以例数或覆盖率单独 accept。

- 功能：`decodeRle`/严格帧解析对 `0x00`、`0x80`、截断头、截断 payload、目标越界均有限失败；合法实心、透明、palette-0、混合帧结果与改动前逐字节一致；宽容 `parseSpriteChunk` 对不可解帧保持跳过，不压缩其它可解帧之外的新索引政策。
- 测试：shared RLE 定向测试、相邻 `rle-encode` 往返、shared typecheck/test；不要修改其它包测试来“守覆盖率数字”。
- 文档：本卡、机器清单/治理路线与看板责任列更新；不改 `docs/testing/**`。
- 视觉 / 手工验证：N/A；本批无 UI/演出改动。
- E2E 用例登记：N/A（纯解码失败语义，剧情视觉延后不受影响）。

## 当前模式推进记录

### 进入 build 前：Codex 核定

- Coding Owner / 隔离工作树 / 修改白名单：Codex；`/Users/zhangxu/illegal/type-pal-code-quality`；首批仅 `packages/shared/src/rle.ts`、`packages/shared/src/rle.test.ts`、`packages/shared/src/rle.boundaries.test.ts`、`packages/shared/src/rle.glm-runtime-resource.test.ts`，治理脚本/清单/本卡可由 Codex 修改。
- 前提核验：verified（直接证据见真值矩阵；可证伪点已列；当前无用户行为/schema/save 变化）
- 范围、设计和验收条件：agree（先有限边界，再扩包；合法输入 oracle 固定既有测试，畸形输入 oracle 为显式失败/有限跳过）
- 高风险用户产品裁决：N/A（不改变合法产品行为）
- build 准入结论：Codex build allowed（首批边界限定；若发现真实资源依赖零长度命令或需改 caller 政策，立即停线并回到 draft/blocked）

### 进入 done 前：独立验收

- 贡献者交付与自验：Codex（本批无外部贡献者；候选 SHA `7fde00ce302250e823fe53edd7c705560e698acf`；定向证据已记录）
- Codex 独立复核：accept（RLE 合法路径/畸形失败语义/宽容 caller/机器清单生成器均已直接复核；全仓统一门保持 blocked，见下）
- 用户体验/产品验收：N/A（无用户可见形态变化）
- done 准入结论：Codex done allowed（完整 `pnpm check`、官方 `coverage:ratchet`、受保护 `TYPE_PAL_COVERAGE_BASE_REF=b9ba7e0fa pnpm coverage:fast` 均通过；本卡首批完成，不等于全仓逐文件治理完成）

## Draft: 设计与风险

### 设计结论

治理路线按四层产物落盘：

1. `scripts/quality/code-quality-inventory.mjs` 生成全仓逐文件 JSON 清单（可输出到临时路径），稳定输出 category/domain/module/feature、出口与生产 caller 的静态线索，并将未知职责标为 `待核`，不把静态计数当缺陷。
2. `docs/ops/audits/code-quality-governance.md` 维护工程/模块/功能地图、问题优先级、文件级 Owner、首批停线和后续候选；正文只写已核证据，未知项单列。
3. 首批收口 shared RLE 解码器的无进度/截断失败语义；生产算法只加边界，不动合法字节路径或资源格式。
4. 每批定向门后按风险串行全仓 `pnpm check`、官方 ratchet/受保护 strict（若源码变更进入统计域），再更新本卡与看板；未全仓零诊断不宣布专项总体完成。

### 已知风险

- 风险：RLE 原始资源不可用，无法在本树扫描所有真实帧中的 `0x80`。
  - 缓解：只对零进度/缺字节输入收紧，保留合法回归与现有 strict parser 合同；若真实资源反例出现，立即停止并交用户裁决，不改原始数据。
- 风险：宽容入口若直接向 caller 抛错会改变既有资源降级策略。
  - 缓解：宽容入口捕获本批 decoder 边界错误并跳过该帧；严格入口仍传播错误。
- 风险：全仓清单与并行线程文档可能出现索引交集。
  - 缓解：本卡只写 `docs/ops/tasks`、`docs/ops/board` 及独立 code-quality audit；不写 `docs/testing/**`、E2E 脚本和覆盖候选文件。

### 专项审查安排（按需）

- Reviewer：Codex 独立验收；当前不派固定三贤人席位。
- 结论：build allowed 已核；仍需在 review 读 diff、真实 callers、失败语义与零诊断门。
- 必改项：若发现 `0x80` 是真实合法命令、宽容入口 caller 需要不同失败政策、或改动引入任何合法像素差异，则 rework/blocked。
- 是否建议进入 build：agree

## 分派与容量记录（如适用）

- 原负责人及改派原因：无；Codex 从最新 main 独立开工。
- 新贡献者与独占写入范围：Codex 独占本卡及首批文件；覆盖率、E2E、测试文档线程继续使用各自工作树，不共享实现文件。
- 交接风险与 Codex 验收方式：本轮不交给其它 Agent；如后续需要贡献者，先复制任务卡 revision 和白名单，不得直接在主 checkout 修改。

## Build: 实现与自测

- Coding Owner：Codex
- 修改文件：`packages/shared/src/rle.ts`、`packages/shared/src/rle.test.ts`、`packages/shared/src/rle.boundaries.test.ts`、`packages/shared/src/rle.glm-runtime-resource.test.ts`、`packages/editor/src/core/project-reference.pal.test.ts`、`scripts/coverage/baseline.fast.json`；治理清单/总纲/看板/索引
- 实现摘要：decoder 对 zero-progress、header/command/pixel/transparent 越界显式失败；strict parser 同步拒绝 `0x80`；宽容 sprite parser 捕获不可解帧并保留后续合法帧；合法路径逐字节回归保持。
- 运行命令：shared 全包 `vitest` 117/117、shared typecheck；game 资产相邻 39/39；reforge 资产/对话相邻 11/11；pal-extract RLE/sprite 相邻 10/10；质量清单工具 28/28；完整 `pnpm check` 通过（editor 605/4844、migrate 95/723）；`pnpm coverage:ratchet` 通过，shared 语句/分支 401/420、184/199；`TYPE_PAL_COVERAGE_BASE_REF=b9ba7e0fa pnpm coverage:fast` 通过；全仓 `pnpm lint`（3196 文件）零诊断。
- 浏览器 / 手工检查：N/A
- 跳过的检查及原因：无必须检查跳过项；无浏览器验证（非 UI）。

## 资源生成记录(如适用)

- Generation Owner：N/A

## 视觉验证记录(如适用)

- Visual Verification Owner：N/A
- Visual Verification Timing：N/A
- 结论：N/A

## Review: 审查与返工

- Reviewer：Codex
- 审查结论：accept。RLE 失败语义、合法 callers、editor 当前 census、官方 ratchet 和受保护 fast 均已直接复核；未修改 editor collector 或产品数据。
- 必须返工项：无
- Accept / rework：accept

## 用户验收

- 用户结论：N/A（本批无用户可见选择）
- 后续任务：按 [`code-quality-governance.md`](../../../audits/code-quality-governance.md) 开 Q2–Q6 不重叠窄批；不把本卡 done 解释为全仓治理完成。

## 交接日志

- 2026-10-04 Codex：核对主 checkout 未提交改动、覆盖率/E2E/文档活跃线程与 worktree；从 `origin/main@b9ba7e0fa` 建立独立工作树。读取 AGENTS、CLAUDE、READ-FIRST、agent-workflow、board、architecture-debt 及相关历史收口卡；原 13 批架构治理均已 done，本专项不重领。Next: 生成逐文件清单并完成首批 RLE 边界取证。
- 2026-10-04 Codex：前提真值门完成，直接读取 `reference/sdlpal/palcommon.c`、shared decoder 和全部生产 callers；清单生成器与治理路线已落盘。首批白名单只含 `shared/src/rle.ts` 及同域回归，合法输入不变、畸形输入显式失败/宽容跳过。Next: 实现并跑定向/相邻回归。
- 2026-10-04 Codex：Q1 实现完成。`decodeRle`/strict parser 增加 header、尺寸、游标、零进度和段越界失败语义；宽容入口保留坏帧跳过；历史 runtime-resource 回执中的截断死循环登记转为可反证回归。影响包定向/全包测试与 typecheck 通过，`pnpm lint` 3196 文件零诊断。Evidence: `packages/shared/src/rle*.test.ts`、`docs/testing/glm-runtime-resource-wave/receipt.md:73-81`。Next: review/选择性集成。
- 2026-10-04 Codex：全仓 `pnpm check` 已串行尝试；主树 ignored raw/extracted 输入以只读 symlink 补齐后，除 editor 全包一个既有 `project-reference` 计数合同（22666→22663）外均通过；不修改该存量 oracle。候选已提交并推送 `7fde00ce302250e823fe53edd7c705560e698acf`（`codex/code-quality-governance`）。专项留在 review，统一质量门不宣称 done。Next: 用户/后续 Codex 处理存量合同后再重跑全仓门。
- 2026-10-04 Codex：继续核实 `379304503` 与后续 `66676dc9f` 的内容/测试历史，确认 22666、4356、4450、25201/28104 是旧 census；当前 collector 与精确关系断言在 22663、4353、4448、25196/28092 下全绿。完整 check、ratchet 与 protected fast 均通过。Next: 归档本卡，保留 Q2–Q6 路线。
- 2026-10-04 Codex：为 RLE 新增尺寸/透明段/像素段/命令流四个原子反例，shared 117/117；`pnpm coverage:ratchet` 只升不降（shared 401/420 statements、184/199 branches），`TYPE_PAL_COVERAGE_BASE_REF=b9ba7e0fa pnpm coverage:fast` 受保护门通过；全仓 `pnpm check` 与 lint 已通过。Next: 本卡完成，后续按 Q2–Q6 另开窄批。

## 下一位 Agent 提示词

无，等待后续 Q2–Q6 窄批；本卡已完成，不得把历史归档卡当作新的实现授权。
