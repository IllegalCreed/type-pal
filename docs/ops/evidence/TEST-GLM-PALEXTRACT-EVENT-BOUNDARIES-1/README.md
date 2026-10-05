# TEST-GLM-PALEXTRACT-EVENT-BOUNDARIES-1 证据索引（GLM r2）

- 交付物（仅新增测试，产品/旧测/config/baseline/真实数据零 diff）：
  `packages/pal-extract/src/resources/parsers/__tests__/player-roles.event-boundaries-1.test.ts`
  （PR-NAME-BOUNDARY-1 名称缺省/越表 fail-soft、PR-ELEM-ORDER-1 elemResistance water/earth 键映射判别）。
- 排重账：[dedup-ledger.md](dedup-ledger.md)——7 个范围内文件逐 `source:line × 公开 caller × 合法
  typed 输入 × 业务 oracle × 旧 fullName` 排重；events 五文件与 scene.ts 全轴 existing-proof /
  unreachable / blocked（不换数字重测、不为未定政策造绿测），仅 player-roles 2 条真实新合同；
  含 CLI/extract-videos「明确不做」复核与 main 既有环境观察（coverage 仪表×rng-frames 超时、
  board/index content-review pin drift 随卡修复）。
- 身份集：[identity.json](identity.json)——2 合同 source/caller/输入/oracle/机读精确 fullName/
  针位（含指定 AssertionError 子串与红相位门）与排重依据。
- 反控（**r2 runner v2**，Codex 一审返工后重造）：[counterproof.json](counterproof.json)
  （schema `vitest-json-reporter-v2`；2/2 针 VALID + 13 自测用例全按预期）+ 可重放脚本
  [run-counterproof.mjs](run-counterproof.mjs) + 六相位机读 JSON 与 stdout 档案
  [mutation-logs/](mutation-logs/)（original / 每针 red+green / final-replay，各含 .json 与 .raw）。
- 门证据：[adjacent.raw](adjacent.raw)（定向 2/2 + 相邻 events/scene/player-roles/tables 20 文件
  206/206，双段 exit=0）、[full-suite.raw](full-suite.raw)（pal-extract 全包 69 文件 417/417）、
  [typecheck.raw](typecheck.raw)（tsc --noEmit exit 0）、[lint.raw](lint.raw)（全仓 0/0/0）、
  [docs-gate.raw](docs-gate.raw)（check:docs PASS）。

## 反控口径（r2：判据全部来自 vitest JSON reporter，stdout 只落档）

- 每相位以 `vitest run --reporter=json --outputFile=<mkdtemp 临时树>` 执行（cwd=包根裸 exec），
  机读 JSON 提取：计数（numFailedTests/numPendingTests/numTodoTests/numTotalTests）+ 完整执行集
  `file×fullName×status`（排序稳定摘要 + 规范序列化 sha256）。旧 `/1 failed/` 文本匹配与
  「stdout 首行」判据已废除。
- **红相位门**：exit!==0 && signal===null && spawnError===null && numFailedTests===1 &&
  numPendingTests===0 && numTodoTests===0 && 无 runtime/collection error；且唯一失败条目
  fullName 严格 === 目标合同 fullName（original 执行集按 title 唯一提取），其 failureMessages
  中恰 1 条以 AssertionError 开头且含指定差异子串。红相位跑**全文件不 -t 过滤**——同时证明
  针不误伤兄弟测试。
- **绿相位门**（original / 每针还原后 / final-replay）：exit===0 && 三失败类计数 0 &&
  numTotalTests>0 && 全 passed && 无 runtime error；restored 与 finalReplay 的完整执行集必须与
  original 逐三元组一致（identity set + sha 相等）。
- 产品源每针记录 原始/变异/恢复 sha256（还原字节=原始）；临时树 mkdtemp 在 finally 移除并留
  存在性证明；清理复核 = 全仓 `git status --porcelain` 仅剩本卡证据/测试/文档新增。
- **runner 自测反例**（synthetic phase 喂同一验证器，13 例）：两失败 / 错误 fullName / 红相位
  exit 0 / pending / todo / runtime error / collection error / signal / spawn 失败 / 绿相位带失败
  ——全部必须被拒；canonical 红/绿正控必须被接收（防验证器恒拒）；identity 漂移必须被检出。
  任何一步不符即非零退出，不产出合格回执。

## 范围与不做

- CLI.ts、extract-videos.ts、真实 data/raw|extracted 提取入口：零接触（子进程零覆盖归因是既有
  结论）；无进程内 import、无真实写盘、无覆盖率凑数。
- 覆盖率/例数不是完成条件：2 合同为少而精补充，不设数量门槛；未标 done，等待 Codex 独立验收。
- board.md / tasks/index.md content-review pin：r1 前即 drift（main 7a9157ac5 未刷 pin），按
  「三 pin drift 随卡修复」判例在 `docs/phase-governance/reviews/20261004-semantic-current-batch.json`
  做三处 sha 外科替换 + history 头插，未重排 JSON、未改任何文档语义；r2 追加的 board/evidence
  README 行更新同样随改随刷。

## r1→r2 返工记录（Codex 一审意见）

业务测试 2/2 绿、typecheck/docs/lint 通过被认可；反控 runner 不合格（默认 reporter 首行 +
`/1 failed/` 非锚定匹配、无执行集/严格相位验证/自测反例）。r2 重造 runner v2（上文口径），
六相位全部重跑，替换 r1 的四态 raw 命名（r1 版本在 git 历史 aa8de30f3 保留）；合同测试、产品、
旧测、config、baseline、真实数据零改动。
