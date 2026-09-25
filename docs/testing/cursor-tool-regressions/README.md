# Cursor工具纯函数候选回归实验包

任务：[TEST-CURSOR-TOOLS-1](../../ops/tasks/TEST-CURSOR-TOOLS-1-pure-regressions.md)。
状态：draft准备，T01～T04已提交候选，T05～T08待执行；证据冻结590037a6。完整范围、去重入口和允许命令以任务卡为准。
这是隔离候选，不是正式测试接入或七包覆盖率增量，Cursor不得改产品、正式测试或门禁。

## 八组交付登记

| 组 | 状态 | 新增测试/既有证据 | 精确测试名与差异轴 | 验证命令/exit |
|---|---|---|---|---|
| T01 链接定位 | candidate-green | `tests/t01-markdown.test.mjs`；围栏/注释/转义不入链见 `scripts/docs/check.test.mjs` 第2例 | `importing the markdown parser does not run a checker`；`Chinese multiline fences and comments keep real link lines and positions on the original input`：中文多行里围栏与注释共存时，`positions` 切片等于原输入目标；引用式使用处行号为第6行，坐标与定义行第9行的 `./定义.md` 相同；`positions: false` 只保留 target/line | `env -u NODE_COMPILE_CACHE node --test --test-concurrency=1 docs/testing/cursor-tool-regressions/tests/*.test.mjs`；Node v22.23.2；cwd 工作树根；exit 0；11 pass / 0 fail |
| T02 本地目标 | candidate-green；外链与坏百分号 existing-proof | `tests/t02-targets.test.mjs`；`https`/`#`/`%zz` 见 `check.test.mjs`「local links decode paths…」 | `local targets keep repo-root, encoded, query and directory forms and leave inputs unchanged`：仓库根相对与绝对路径、`%E6%96%87%E4%BB%B6` 加 query/fragment、`..`/`../` 目录；`checkout ancestor sets include the repo root and do not mutate the file list`：祖先集合为 `.`、文件及父目录，输入数组深相等。不把 `../` 当成必须拒绝 | 同上，exit 0 |
| T03 任务元信息/索引 | candidate-green；顶部 Status 覆盖正文 existing-proof | `tests/t03-task-index.test.mjs`；顶部 `Status:` 与已知终态中文标签见 `check.test.mjs`「task status comes only from the top…」 | `task documents are only cards in the active, done, and cancelled directories`：三目录真卡为真，README/index/两模板及嵌套、templates、board 为假；`a missing top title falls back to the file name and later status text does not replace Status`：无标题用文件名，已知历史文件同时有 `Status: review` 与中文 done 时取 review；`a mixed task index sorts, escapes title pipes, and does not mutate the input array`：en 排序、`\|`、三类分组、输入 `structuredClone` 不变 | 同上，exit 0 |
| T04 现行段版本 | candidate-green；终点缺失、拒绝范围、历史段 existing-proof | `tests/t04-current-section.test.mjs`；终点缺失、`1..19` 拒绝、Current/History 合法组合见 `check.test.mjs`「current versions…」与「rejecting an old content version…」 | `a bounded current section accepts content and SAVE while ignoring map and catalog axes`：`/^## 现行/m` 至 `/^## 历史/m`，`contentVersion: 20`/`SAVE 8` 通过，`mapVersion`/`catalog` 不产生 content/SAVE 错误；`a missing start marker is reported once and does not scan the rest of the document`；`repeated current-section version mismatches are reported once per distinct message`：两条 `content19`、两条 `SAVE7` 各一条，另加缺少 content 声明 | 同上，exit 0 |
| T05 纯文本搬移 | 待执行 | — | — | — |
| T06 选择器预筛 | 待执行 | — | — | — |
| T07 例外清单判定 | 待执行 | — | — | — |
| T08 导航字形工具 | 待执行 | — | — | — |

Cursor将待执行替换为candidate-green / existing-proof / reproduced-defect / pending-contract /
blocked-environment；一个组可逐用例分栏，不把局部绿写为全组全部已证。不设最低新增数。

## 本人运行与边界

待记录Node版本、工作树/基点、源码零漂移、实际执行结果与未运行项。
临时JSDOM必须close；只测输入输出，不调用写盘或全仓扫描入口，不生成真实项目/存档。

## 接收交付

待记录正文SHA、登记tip、候选/诊断/既有证据计数、检查结果及下一位Codex提示词。
不得提前报accept/done，不将候选数或诊断数当作正式覆盖率、独立bug数量。
