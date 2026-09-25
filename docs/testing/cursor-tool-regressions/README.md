# Cursor工具纯函数回归接入记录

任务：[TEST-CURSOR-TOOLS-1](../../ops/archive/tasks/done/TEST-CURSOR-TOOLS-1-pure-regressions.md)。
当前实施与验证：[正式接入和路径修复](integration.md)。
贡献者：Cursor；原候选`02d91f7a`、窄返工`85f2a824`，当时证据冻结`590037a6`。

## 正式接入

Codex按用户2026-09-25“验证之后提交推送”要求，将候选放入正式测试入口，并修正
`scripts/docs/relocate.mjs`被无效较长前缀遮蔽有效父目录映射的缺陷。修前业务回归先红，修后通过。

- T01～T05及原T05诊断：[文档工具测试](../../../scripts/docs/cursor-parent-mapping.test.mjs)、
  `scripts/docs/cursor-{markdown,targets,task-index,current-section,path-rewrite}.test.mjs`。
  默认`pnpm test:docs-tools`和文档CI会收集；四条仅检验导入的烟测未转正。
- T06：原[编辑器选择器测试](../../../packages/editor/src/ui/design-system/selector-prefilter.test.ts)已充分覆盖，没有新增同义用例。
- T07～T08：[编辑器审计测试](../../../packages/editor/scripts/cursor-allowlist.test.mjs)与
  [导航字形测试](../../../packages/editor/scripts/cursor-navigation-glyph.test.mjs)由包内Vitest收集。
- 目录漏改是本批确认的一个工具缺陷，不是多个产品bug。原候选的诊断曾为1绿/1红，
  正式修复后同输入改为绿；不要再把历史红例当作当前失败。

以下原回执是隔离实验时点记录。原测试文件与失败诊断的当时字节可从`85f2a824`恢复，
正式执行结果以本节及任务卡最终质量门为准。

## 八组交付登记（隔离候选历史）

| 组 | 状态 | 新增测试/既有证据 | 精确测试名与差异轴 | 验证命令/exit |
|---|---|---|---|---|
| T01 链接定位 | candidate-green | `tests/t01-markdown.test.mjs`；围栏/注释/转义不入链见 `scripts/docs/check.test.mjs` 第2例 | `markdown parser import smoke`（typeof/`exitCode` 烟测，不证明零副作用）；`Chinese multiline fences and comments keep real link lines and positions on the original input`：中文多行里围栏与注释共存时，`positions` 切片等于原输入目标；引用式使用处行号为第6行，坐标与定义行第9行的 `./定义.md` 相同；`positions: false` 只保留 target/line | 候选命令见下；22 pass / 0 fail |
| T02 本地目标 | candidate-green；外链与坏百分号 existing-proof | `tests/t02-targets.test.mjs`；`https`/`#`/`%zz` 见 `check.test.mjs`「local links decode paths…」 | `target helper import smoke`；`local targets keep repo-root, encoded, query and directory forms and leave inputs unchanged`：仓库根相对与绝对路径、`%E6%96%87%E4%BB%B6` 加 query/fragment、`..`/`../` 目录；`checkout ancestor sets include the repo root and do not mutate the file list`：祖先集合为 `.`、文件及父目录，输入数组深相等。不把 `../` 当成必须拒绝 | 同上，exit 0 |
| T03 任务元信息/索引 | candidate-green；顶部 Status 覆盖正文 existing-proof | `tests/t03-task-index.test.mjs`；顶部 `Status:` 与已知终态中文标签见 `check.test.mjs`「task status comes only from the top…」 | `task documents are only cards in the active, done, and cancelled directories`：三目录真卡为真，README/index/两模板及嵌套、templates、board 为假；`a missing top title falls back to the file name and later status text does not replace Status`：无标题用文件名，已知历史文件同时有 `Status: review` 与中文 done 时取 review；`a mixed task index sorts, escapes title pipes, and does not mutate the input array`：en 排序、`\|`、三类分组、输入 `structuredClone` 不变 | 同上，exit 0 |
| T04 现行段版本 | candidate-green；终点缺失、拒绝范围、历史段 existing-proof | `tests/t04-current-section.test.mjs`；终点缺失、`1..19` 拒绝、Current/History 合法组合见 `check.test.mjs`「current versions…」与「rejecting an old content version…」 | `a bounded current section accepts content and SAVE while ignoring map and catalog axes`：`/^## 现行/m` 至 `/^## 历史/m`，`contentVersion: 20`/`SAVE 8` 通过，`mapVersion`/`catalog` 不产生 content/SAVE 错误；`a missing start marker is reported once and does not scan the rest of the document`；`repeated current-section version mismatches are reported once per distinct message`：两条 `content19`、两条 `SAVE7` 各一条，另加缺少 content 声明 | 同上，exit 0 |
| T05 纯文本搬移 | candidate-green + reproduced-defect | 绿：`tests/t05-path-rewrite.test.mjs`。诊断：`diagnostics/t05-parent-mapping.test.mjs`。label/title、引用定义只改一次、`sha^:` 与 `.bak` 仍见 `relocate.test.mjs` 前三例。未调用 `applyRelocation`。原`02d91f7a`把 `docs/old/deep-extra.md` 在双映射下保持原样写成绿，已撤销 | 绿：`path rewrite helper import smoke`；`suffix-distinct document paths validate and the entries array stays intact`；`a parent directory mapping rewrites a hyphenated child that is not under a deeper key`：仅 `docs/old → docs/archive/old` 时 `docs/old/deep-extra.md` → `docs/archive/old/deep-extra.md`；`repository path rewrite prefers the longest valid key and preserves SHA and unmatched suffixes`：`docs/old/deep/file.md` 走更深键，`abcdef0:` 保留，`docs/other/deep-extra.md` 无映射不改，仅 `docs/old/deep` 时 `docs/old/deep-extra.md` 保持原样；`link rewrite…`。诊断绿对照：`parent-only mapping rewrites a hyphenated path that is not under the deeper directory`。诊断红：`an inapplicable deeper mapping must not hide the still-valid parent rewrite`，actual `docs/old/deep-extra.md`，expected `docs/archive/old/deep-extra.md` | 候选见下，22 pass。诊断命令见下，1 pass / 1 fail，exit 1 |
| T06 选择器预筛 | existing-proof | 不新增文件。`packages/editor/src/ui/design-system/selector-prefilter.test.ts` 三例及 DOM 矩阵 | 本轮不重做。祖先/兄弟类、不支持语法空集、standards-mode DOM 对照均已在该文件 | 本轮未重跑 Vitest |
| T07 例外清单判定 | candidate-green；仅 exit code 的空清单/过期/单键形状 existing-proof | `tests/t07-allowlist.test.mjs`；`adoption.test.ts`「distinguishes unapproved…」只断言 `.code` | `allowlist helper import smoke`；`a non-empty legal allowlist entry is accepted and Cursor is not an owner`：具名 `document`/`cursorDocument` 各一份调用前深快照；`file, line, and rule mismatches stay unapproved while the original entry is stale`：三轴各建具名 `document`/`rows`，调用前 `structuredClone`、调用后立即比同一实参，完整返回 `{code,active,unapproved,stale,problems}`；`an exact allowlist match…`；`invalid allowlist shapes…`：具名 `versionDocument`/`versionRows` 与 `nullDocument`/`nullRows`，同样调用前后比实参并保留完整返回 | 候选命令，exit 0 |
| T08 导航字形工具 | candidate-green；单词方向控件与单行 `DsDiagnosticRow` existing-proof | `tests/t08-navigation-glyph.test.mjs`；`adoption.test.ts`「rejects navigation glyphs…」 | `a self-contained TSX scan returns only matching navigation tags with their lines`：第4行 `DsButton`、第7行 `DsReferenceRow`；第5行 `button` 与第6行仅方向的 `DsButton` 不在数组。这是源码扫描，不证明运行期可达 | 同上，exit 0 |

Cursor将待执行替换为candidate-green / existing-proof / reproduced-defect / pending-contract /
blocked-environment；一个组可逐用例分栏，不把局部绿写为全组全部已证。不设最低新增数。

## 本人运行与边界

- Node v22.23.2。工作树 `/Users/zhangxu/illegal/type-pal-cursor-tools-tests`，分支 `codex/cursor-tools-tests-r1`，基点 `1763ac58`，原候选 `02d91f7a`。`590037a6..1763ac58` 的 `scripts/` 与 `packages/` 无差异；本轮只改 `docs/testing/cursor-tool-regressions/**`，未改产品、正式测试、配置、基线、Codex 冻结见证或前批文档。
- 绿候选：`env -u NODE_COMPILE_CACHE node --test --test-concurrency=1 docs/testing/cursor-tool-regressions/tests/*.test.mjs`，cwd 工作树根，exit 0，22 pass / 0 fail / 0 skipped。其中 4 条 import smoke，18 条行为例。T06 无新增文件。
- 显式诊断：`env -u NODE_COMPILE_CACHE node --test --test-concurrency=1 docs/testing/cursor-tool-regressions/diagnostics/*.test.mjs`，exit 1，1 pass / 1 fail / 0 skipped。红因见上表 T05。不加入默认绿集合，无 skip/`test.fails`。
- 相邻：`env -u NODE_COMPILE_CACHE node --test --test-concurrency=1 scripts/docs/*.test.mjs`，exit 0，20 pass / 0 fail。相邻套件自己会在 mkdtemp 调 `applyRelocation`；候选与诊断未调用。
- 本人目录 `pnpm exec biome check docs/testing/cursor-tool-regressions` 8 文件通过。`node scripts/docs/check.mjs` 为 `docs: PASS (0 issues)`，exit 0。`git diff --check` exit 0。
- 未跑全仓 check、官方 coverage/ratchet/strict、Vitest adoption/boundary、CLI、迁移。未修生产 `rewriteRepositoryPaths`。

## 接收交付

原候选 `02d91f7ac98e7737283f4c255f5e76e23a49fd6e`。本次窄返工 tip 以提交为准，不在本文自写。
绿候选 22（4 smoke + 18 行为），diagnostics 2（1 对照绿 / 1 真实红）。T05 现为 candidate-green + reproduced-defect；T06 仍 existing-proof。无 pending-contract、blocked-environment。
这些数字不是正式覆盖率，也不是独立 bug 数。未标 done，未代签。Codex 见证冻结旧候选，本轮不改该工具。

下一位 Codex 提示词：

```text
再核 TEST-CURSOR-TOOLS-1 窄返工。工作树 /Users/zhangxu/illegal/type-pal-cursor-tools-tests，
分支 codex/cursor-tools-tests-r1，原候选 02d91f7a，证据冻结 590037a6。
先读 docs/testing/cursor-tool-regressions/README.md。
CT-R1：绿套件不再预期 docs/old/deep-extra.md 在双映射下保持原样；
diagnostics/t05-parent-mapping.test.mjs 用正确父映射 docs/archive/old/deep-extra.md，
单父映射对照绿，双映射实际红。未修 relocate.mjs。
CT-R2：T07 错配三轴与两个 invalid 分支均具名 document/rows，调用前深快照、后立即比同一实参，完整返回值仍在。
导入标题已收窄为 import smoke。T06 未重做。未改 cursor-tools-review-witness.mjs。
只决定是否接受修订候选与诊断；不合 main、不代签、不标 done。
```
