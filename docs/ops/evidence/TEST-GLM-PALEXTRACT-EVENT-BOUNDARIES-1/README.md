# TEST-GLM-PALEXTRACT-EVENT-BOUNDARIES-1 证据索引（GLM r1）

- 交付物（仅新增测试，产品/旧测/config/baseline/真实数据零 diff）：
  `packages/pal-extract/src/resources/parsers/__tests__/player-roles.event-boundaries-1.test.ts`
  （PR-NAME-BOUNDARY-1 名称缺省/越表 fail-soft、PR-ELEM-ORDER-1 elemResistance water/earth 键映射判别）。
- 排重账：[dedup-ledger.md](dedup-ledger.md)——7 个范围内文件逐 `source:line × 公开 caller × 合法
  typed 输入 × 业务 oracle × 旧 fullName` 排重；events 五文件与 scene.ts 全轴 existing-proof /
  unreachable / blocked（不换数字重测、不为未定政策造绿测），仅 player-roles 2 条真实新合同；
  含 CLI/extract-videos「明确不做」复核与 main 既有环境观察（coverage 仪表×rng-frames 超时、
  board/index content-review pin drift 随卡修复）。
- 身份集：[identity.json](identity.json)——2 合同 source/caller/输入/oracle/fullName/针位与排重依据。
- 反控：[counterproof.json](counterproof.json)（2/2 针 VALID；每针红相位 exit 1、恰 1 指定业务
  AssertionError、还原字节=原始、还原绿）+ 可重放脚本 [run-counterproof.mjs](run-counterproof.mjs)
  + 四态 raw [mutation-logs/](mutation-logs/)（green-baseline / 每针 red+green / final-replay）；
  逐针记录产品文件 原始/变异/恢复 sha256；临时树 mkdtemp 在 finally 移除并留存在性证明。
- 门证据：[adjacent.raw](adjacent.raw)（定向 2/2 + 相邻 events/scene/player-roles/tables 20 文件
  206/206，双段 exit=0）、[full-suite.raw](full-suite.raw)（pal-extract 全包 69 文件 417/417）、
  [typecheck.raw](typecheck.raw)（tsc --noEmit exit 0）、[lint.raw](lint.raw)（全仓 0/0/0）、
  [docs-gate.raw](docs-gate.raw)（check:docs PASS）。

## 反控口径

每针 = 产品源码变异（`resources/parsers/player-roles.ts`；锚文本在目标文件命中恰 1 次才有效）→
定向文件 `-t` 无括号唯一子串过滤执行（红相位验收：exit≠0 且 `1 failed` 且首条失败为业务
AssertionError，防 `-t` 零匹配假绿）→ `git checkout --` 字节还原（sha256 复核）→ 同过滤复跑全绿。
四态 hash = green-baseline / 每针 red / 每针 restoredGreen / final-replay，按落盘字节（trimEof
恰一个终止换行）计算。变异直接落跟踪文件并立即 git 还原；每相位 raw 先写 mkdtemp 临时树再
终结化到证据目录，finally 移除（清理证明写入 counterproof.json cleanup 节）；清理复核 = 全仓
`git status --porcelain` 仅剩本卡证据/测试/文档新增。

## 范围与不做

- CLI.ts、extract-videos.ts、真实 data/raw|extracted 提取入口：零接触（子进程零覆盖归因是既有
  结论）；无进程内 import、无真实写盘、无覆盖率凑数。
- 覆盖率/例数不是完成条件：2 合同为少而精补充，不设数量门槛；未标 done，等待 Codex 独立验收。
- board.md / tasks/index.md content-review pin：本卡动手前即 drift（main 7a9157ac5 未刷 pin），
  按「三 pin drift 随卡修复」判例在 `docs/phase-governance/reviews/20261004-semantic-current-batch.json`
  做三处 sha 外科替换 + history 头插，未重排 JSON、未改任何文档语义。
