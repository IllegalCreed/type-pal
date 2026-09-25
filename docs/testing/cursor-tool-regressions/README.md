# Cursor工具纯函数候选回归实验包

任务：[TEST-CURSOR-TOOLS-1](../../ops/tasks/TEST-CURSOR-TOOLS-1-pure-regressions.md)。
状态：draft准备，八组候选已做完，待Codex接收；证据冻结590037a6。完整范围、去重入口和允许命令以任务卡为准。
这是隔离候选，不是正式测试接入或七包覆盖率增量，Cursor不得改产品、正式测试或门禁。

## 八组交付登记

| 组 | 状态 | 新增测试/既有证据 | 精确测试名与差异轴 | 验证命令/exit |
|---|---|---|---|---|
| T01 链接定位 | candidate-green | `tests/t01-markdown.test.mjs`；围栏/注释/转义不入链见 `scripts/docs/check.test.mjs` 第2例 | `importing the markdown parser does not run a checker`；`Chinese multiline fences and comments keep real link lines and positions on the original input`：中文多行里围栏与注释共存时，`positions` 切片等于原输入目标；引用式使用处行号为第6行，坐标与定义行第9行的 `./定义.md` 相同；`positions: false` 只保留 target/line | 见下方整包命令；21 pass / 0 fail |
| T02 本地目标 | candidate-green；外链与坏百分号 existing-proof | `tests/t02-targets.test.mjs`；`https`/`#`/`%zz` 见 `check.test.mjs`「local links decode paths…」 | `local targets keep repo-root, encoded, query and directory forms and leave inputs unchanged`：仓库根相对与绝对路径、`%E6%96%87%E4%BB%B6` 加 query/fragment、`..`/`../` 目录；`checkout ancestor sets include the repo root and do not mutate the file list`：祖先集合为 `.`、文件及父目录，输入数组深相等。不把 `../` 当成必须拒绝 | 同上，exit 0 |
| T03 任务元信息/索引 | candidate-green；顶部 Status 覆盖正文 existing-proof | `tests/t03-task-index.test.mjs`；顶部 `Status:` 与已知终态中文标签见 `check.test.mjs`「task status comes only from the top…」 | `task documents are only cards in the active, done, and cancelled directories`：三目录真卡为真，README/index/两模板及嵌套、templates、board 为假；`a missing top title falls back to the file name and later status text does not replace Status`：无标题用文件名，已知历史文件同时有 `Status: review` 与中文 done 时取 review；`a mixed task index sorts, escapes title pipes, and does not mutate the input array`：en 排序、`\|`、三类分组、输入 `structuredClone` 不变 | 同上，exit 0 |
| T04 现行段版本 | candidate-green；终点缺失、拒绝范围、历史段 existing-proof | `tests/t04-current-section.test.mjs`；终点缺失、`1..19` 拒绝、Current/History 合法组合见 `check.test.mjs`「current versions…」与「rejecting an old content version…」 | `a bounded current section accepts content and SAVE while ignoring map and catalog axes`：`/^## 现行/m` 至 `/^## 历史/m`，`contentVersion: 20`/`SAVE 8` 通过，`mapVersion`/`catalog` 不产生 content/SAVE 错误；`a missing start marker is reported once and does not scan the rest of the document`；`repeated current-section version mismatches are reported once per distinct message`：两条 `content19`、两条 `SAVE7` 各一条，另加缺少 content 声明 | 同上，exit 0 |
| T05 纯文本搬移 | candidate-green；label/title、引用定义只改一次、`sha^:` 与 `.bak` existing-proof | `tests/t05-path-rewrite.test.mjs`；上述既有轴见 `scripts/docs/relocate.test.mjs` 前三例。未调用 `applyRelocation` | `suffix-distinct document paths validate and the entries array stays intact`：`docs/a.md` 与 `docs/a.md.bak` 可同时通过且 entries 深相等；`repository path rewrite prefers the longest key, keeps suffixes, and preserves SHA references`：`docs/old/deep` 长于 `docs/old`，`deep-extra` 不改，`abcdef0:` 历史引用保留；`link rewrite changes destinations only, encoding bare spaces and keeping angle-bracket spaces`：query/fragment 保留，尖括号空格不编码，Map 深相等 | 同上，exit 0 |
| T06 选择器预筛 | existing-proof | 不新增文件。`packages/editor/src/ui/design-system/selector-prefilter.test.ts` 三例及 DOM 矩阵 | `extracts only target classes, not ancestor or sibling classes`；`never interprets classes inside complex or escaped selectors`；`filtered matching stays identical to native matching across DOM contexts`。祖先/兄弟类、不支持语法空集、standards-mode DOM 对照均已在该文件 | 本轮未重跑 Vitest adoption/boundary。去重为读断言，不是失败 |
| T07 例外清单判定 | candidate-green；仅 exit code 的空清单/过期/单键形状 existing-proof | `tests/t07-allowlist.test.mjs`；`adoption.test.ts`「distinguishes unapproved violations from invalid or stale exceptions」只断言 `.code` | `a non-empty legal allowlist entry is accepted and Cursor is not an owner`：完整合法条目问题为空，owner `Cursor` 被既有规则拒绝；`file, line, and rule mismatches stay unapproved while the original entry is stale`：单轴错配时 code 2，unapproved 为该条，stale 为原 identity；`an exact allowlist match returns the active identity and no stale or unapproved rows`；`invalid allowlist shapes return problems and do not classify violations`：version 2 与 `null` 条目返回 problems，不把违规写入 unapproved。输入深快照在各例内 | 同上，exit 0 |
| T08 导航字形工具 | candidate-green；单词方向控件与单行 `DsDiagnosticRow` existing-proof | `tests/t08-navigation-glyph.test.mjs`；`adoption.test.ts`「rejects navigation glyphs…」 | `a self-contained TSX scan returns only matching navigation tags with their lines`：第4行 `DsButton`、第7行 `DsReferenceRow`；第5行 `button` 与第6行仅方向的 `DsButton` 不在数组。这是源码扫描，不证明运行期可达 | 同上，exit 0 |

Cursor将待执行替换为candidate-green / existing-proof / reproduced-defect / pending-contract /
blocked-environment；一个组可逐用例分栏，不把局部绿写为全组全部已证。不设最低新增数。

## 本人运行与边界

- Node v22.23.2。工作树 `/Users/zhangxu/illegal/type-pal-cursor-tools-tests`，分支 `codex/cursor-tools-tests-r1`，基点 `1763ac58`。`590037a6..1763ac58` 的 `scripts/` 与 `packages/` 无差异；本轮未改产品、正式测试、配置、基线或前批文档。
- 候选：`env -u NODE_COMPILE_CACHE node --test --test-concurrency=1 docs/testing/cursor-tool-regressions/tests/*.test.mjs`，cwd 工作树根，exit 0，21 pass / 0 fail / 0 skipped。无 diagnostics 文件。T06 无新增文件，不把空 glob 算通过。
- 相邻：`env -u NODE_COMPILE_CACHE node --test --test-concurrency=1 scripts/docs/*.test.mjs`，exit 0，20 pass / 0 fail。
- 本人目录 `pnpm exec biome check --write docs/testing/cursor-tool-regressions` 后复查无剩余问题。`node scripts/docs/check.mjs` 为 `docs: PASS (0 issues)`，exit 0。`git diff --check` exit 0。
- 未跑全仓 check、官方 coverage/ratchet/strict、Vitest adoption/boundary、CLI、`applyRelocation`、迁移。T07/T08 依赖来自本工作树 `pnpm install --frozen-lockfile`，锁文件无改动。未使用 JSDOM，无临时 Markdown。

## 接收交付

T01～T04 提交 `a898d1fc2d92f8392a2dbd10a71b26719eb58d56`。T05～T08 与本总账在后一提交；tip SHA 以该提交为准，不在本文自写。
候选 21，diagnostics 0。T06 整组 existing-proof；T02/T03/T04/T05/T07/T08 各有注明的既有轴，其余为 candidate-green。无 reproduced-defect、pending-contract、blocked-environment。
这些数字不是正式覆盖率，也不是独立 bug 数。未标 done，未代签。

下一位 Codex 提示词：

```text
接收 TEST-CURSOR-TOOLS-1 隔离候选。工作树 /Users/zhangxu/illegal/type-pal-cursor-tools-tests，
分支 codex/cursor-tools-tests-r1，基点 1763ac58，证据冻结 590037a6。
先读 docs/testing/cursor-tool-regressions/README.md 与 docs/ops/tasks/TEST-CURSOR-TOOLS-1-pure-regressions.md。
只复核候选测试是否打到真实公开函数、是否重复旧断言、失败是否被改预期。
T06 为 existing-proof，无新文件。未调用 applyRelocation、runDesignSystemGate、迁移或全仓审计。
正式转正、抽查反控和质量门由你决定。不合 main、不代签、不标 done。
```
