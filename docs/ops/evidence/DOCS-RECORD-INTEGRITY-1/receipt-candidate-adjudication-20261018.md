# 剩余十五个回执变动候选逐项裁定

Status: review
Owner: Codex root（本轮调查作者）
Reviewer: 非作者独立验收待执行
Last reviewed: 2026-10-18
Template: audit-report-v1 / 1.0.0

## 审计问题

原始筛查的十五个候选是否改写了同一次执行的结果，还是新增证据、字段改名、记录重排或明确撤回？逐项给出处置，不将“没发现篡改”解释为当时命令真实通过，也不以新执行补造历史运行。

## 范围与证据

- 固定输入：[原始筛查](receipt-history-scan.json)中的十六项扣除已确认的 `183ec0bf0`；保留原筛查字节与原 verdict。
- [逐项机械观察](receipt-candidate-observations-20261018.json)给出十五组完整 Git before/after blob/SHA、字段是否原先存在、实际 JSON pointer 和 artifact 定位；不是这十五份大文档的全文语义审查。
- [当前字节数反证](receipt-byte-count-counters-20261018.json)给出 coverage 回执全部 72 个 stdout/stderr descriptor 的原声明、实测字节、UTF-16 code unit 数与 SHA。
- 工具：`scripts/docs/inspect-receipt-candidates.py --output <新文件>`，以及 `--current-byte-counters`。只写新调查产物和原字节副本，不改来源回执或运行产品、旧测试、coverage。
- `/tmp` 仍存在的指定日志按原字节留存在本目录 raw，并在观察 JSON 记录原路径、SHA 和当前所见 mtime。Git 不保留历史文件 mtime；当前 mtime 和空 diff 日志均不能单独证明历史退出码。未钉原 SHA 的日志只作相符性佐证。
- 原生 raw 的 JSON/TSV 内容不转为散文；raw 副本使用 `.log` 承载原字节，原路径、格式责任与出处在观察 JSON 显式映射，不授模板迁移完成信用。

## 发现

十项可解释其记录变动；五项进入限定范围的执行信用隔离。十五项都已有裁定，不能写成十五次执行验收通过。

| ID | 源提交 | 记录变动 | 处置 |
|---|---|---|---|
| C01 | d8ec18185a | producer 指针更新、exitCode 改名 exit | 已解释；旧 proof 保留，新旧 artifact 分开 |
| C02 | c562676bf5 | 新增 projection regeneration 块 | 已解释；指定原日志 SHA 匹配 |
| C03 | d5641eef52 | 新增 N intake 接收报告中的五项 gate 引用 | 已解释；五份指定日志 SHA 匹配，原文已声明未重跑 |
| C04 | 69427d5d56 | 新增 F1 四项 gate 引用 | 已解释；四份指定日志 SHA 匹配 |
| C05 | e1366cd135 | 删除旧 inventory consumer 证明 | 已解释；是撤销旧证据，非把失败改为成功 |
| C06 | 9cf1fd09f1 | 把原 exit1 失败完整复制到 originalRecordedFailure | 已解释；完整原失败对象相等 |
| C07 | bb90428668 | 新增 paired integration gates 与 lint rerun | 已解释；找到指定日志且数字吻合，原报告未钉 hash 的限制保留 |
| C08 | 28ea701cc5 | 新增 integratedGates 三项 exit0 摘要 | 隔离；没有可认证的对应原始执行输出 |
| C09 | c1c4ba289b | 新增 followupMachineAudits 三项 gate 摘要 | 隔离；没有可认证的对应原始执行输出 |
| C10 | 517dc85717 | 新增 release coverage 完整块与 gzip 日志 | 已解释；压缩/解压 SHA 与原 TOTAL 相符，不作本轮 coverage 通过 |
| C11 | 53eb295a0f | 摘要替换为分阶段 reporter/identity 证据 | 已解释；八份 identity 和三份 console 源 blob 均匹配 |
| C12 | 431c5f70ca | 六条旧针重跑并新增六条；byte metadata 有错 | 部分隔离；SHA 支持不同运行，错误 bytes 声明撤回 |
| C13 | d03cba2c23 | 既有 lint 摘要 2787 改 2791 | counter；该 lint 信用隔离，其他新增执行不替它作证 |
| C14 | d056af0e65 | 按数组下标误报的记录重排 | 已解释；按稳定 label 对齐无既有结果变更 |
| C15 | 525c40cd08 | 新增历史 implementation/gates | 隔离；指定临时 raw 已缺失，旧 47 warning/6 info 不授当前零诊断 |

### C01

`/actualPhaseProjections/execution/proof/exitCode` 的消失对应同一 exit0 的字段改名 `exit`，同时切换到新的 signoff producer proof。新旧 catalog SHA 分别与提交父树和提交树的真实 catalog 字节匹配。旧 proof 完整保留在 `/rootC1Repair/actualProjectionRegeneration`，逐对象相等；新旧指定日志与新 proof JSON 的原 SHA 全部匹配。日志同 SHA 是两次 producer 输出同为固定摘要，不能仅凭相同输出认定复用造假。本项解释的是版本切换，不重授 P 文档语义、Q build 或任何新独立身份。

### C02

`/rootC1Repair/actualProjectionRegeneration` 在父版本不存在，新增 exit0、catalog SHA、字节数和日志定位。不是覆盖父版本 exit；指定 `/tmp/type-pal-p11-root-c1-repair-phase-producer-20261016.log` 与源记录 SHA 匹配，内容只说明生成两个 view。只保留该有限 producer 证据，不把生成成功当作全文审查。

### C03

新增的是 `/rootIntakeAcceptance/report/review/rootSameByteGatesVerifiedNotRerunByThisReviewer/logs` 五项引用。父版本五个 pointer 均不存在；五份指定日志都找到并匹配原 SHA，其中两份 diff 日志为空。docs 日志实际为 1228 Markdown、7952 links、727 条 content，lint 为当时零诊断；这不等于当前树通过。对象名已明确“复核原 gate、没有由该 reviewer 重跑”，本次保留这个边界，不替其补一次执行。

### C04

四个 `/rootIndependentAcceptance/fullReview/finalSameBytesRootHardGates/checks/*` 都是新增，不是修改既有 exit0。指定日志与四个原 SHA 匹配；docs 日志为 1227 Markdown、7939 links、218 body contracts、727 content。这里确认记录追加与输出吻合，不单凭报告里出现 independent 就接受审查者身份，也不将 2026-10-16 的结果用于当前总门。

### C05

旧 `/entries/13/evidence/actualInventoryConsumer` 整块被删除；原先 3292/229/5/3058 的对象仍可从父 blob 读取。当前 evidence 没有用新的 exit0 冒充它。该项同时记载固定 prior source 回读和 K0 新增一条 pending 的 delta，closed/review 没增加；本轮不重授其历史审查身份。本次裁定为撤销旧证明，不恢复那个已删除对象的执行信用；也不验证整个质量账本的源码结论。

### C06

`/integration/additionalQualityLedgerFailure/originalRecordedFailure` 是新增副本，与父版本完整失败对象相等：exit1、declared `[3283,229,5,3049,3054]` 和 actual `[3290,229,5,3056,3061]` 均保留。外层加 resolution，不能抹掉原失败。该筛查命中的是新增失败证据，不是失败改成功。新 consumer PASS 仍只属当时 inventory 修复，不是 229 份源码重新验收。

### C07

新增 `checkDocs` 和 `lint.rerun`，并保留了先前 lint 格式失败。找到两份明确指定的原日志：docs 实际 68 工具测试、1223 Markdown、7119 links、91 body contracts、616 content；lint 为 4083 files、0/0/0，与新增字段相符。源报告没有为这两份日志钉 SHA，本轮记录的是当前找到的原字节及其 SHA，不能谎称这是当时已经钉住的 hash，也不能独由日志证明进程退出码。

### C08

`/acceptedContributorCardsB/integratedGates` 的三项是新增，未覆盖原有 observation。新增摘要称 docs 63 tests、71 body contracts、608 content，lint 4073 files。该块没有 raw 路径或 hash；本轮没有找到足以认证这些具体执行的原始输出。裁定：不是已证的 R65 式同次结果改写，也不是已验证执行；该三项静态通过信用按来源提交和 pointer 隔离。保留原记录，不给历史内容迁移额外补签。

### C09

`/followupMachineAudits/staticGates` 三项同样原先不存在，新增摘要为 63 tests、61 body contracts、608 content、lint 4072 files。命令名与新增 exit0 本身不能证明运行。该三项执行信用隔离，原 followup JSON 中源码核读与“没有重跑 PAL/storage”的限制继续有效；不能用本轮 docs 命令替代当时的未知执行。

### C10

新增 `/coverage`，此前没有同次 coverage 对象。固定提交中的 `release-coverage.raw.gz` SHA 为 `55d7f2b5…`，解压后 SHA 为 `415ac258…`，均与原字段匹配。原 TOTAL 行的 736 files、19857 tests，以及四组 covered/total 均与 receipt 相等；尾部确有提升4项、范围变化0项。只确认历史日志与摘要对应，本轮没有运行或修改 coverage/baseline，更不能把当时全包测试数作当前通过。

### C11

新报告把 `mutant.exitCode` 等摘要改到 `mutant.phase.exitCode`，console 另有 `consolePhase`，并增加 finalReplay。generatedAt 从 `12:43:14.996Z` 变为 `13:40:28.201Z`，不是无标记地只改一个数字。固定提交的八份 identity artifact SHA、UTF-8 字节数与8767行均匹配：baseline、三次恢复和 finalReplay 全 passed，三次 mutant 均8766 passed加1 failed，无其它状态；三份新 console 的 SHA/bytes 也匹配。它是更完整的阶段证据替代，不是把原 exit1 改 exit0。未重跑该反控，也未验全部8767项业务合同。

### C12

结果数组从6增至12；前六条并非字节不变，execution 被重新采集，另三条 red 摘要也更新，不能说“只是追加六条”。逐个比较这六条的三阶段，共18组 before/after raw：两侧 SHA 都与各自固定 Git blob 匹配，reporter `startTime` 18/18 都不同。因此存在不同运行的证据，原六条不能按同次摘要篡改判定。

同时查出独立的真实缺陷：当时72个 stream SHA全匹配，但48个 `bytes` 与UTF-8字节数不同，恰等于UTF-16 code unit数。固定源 `mutation-runner.mjs:115/120` 写的是 `(proc.stdout ?? '').length` / stderr同式。当前同路径回执72个SHA仍匹配，但50个bytes错误，也都等于UTF-16长度；详见逐字段反证。处理：原 raw 与历史 payload 不改，错误 byte-size 信用撤回，以源SHA绑定的 sidecar 提供实测值；修复/重跑旧测试 runner 不在本卡授权内，不冒充已完成。历史测试计数、exit、AssertionError没有因此被改写或重新授信。

### C13

`/gates/lint/summary` 的确把2787 files换成2791；command、exit0都没变，note也改成下一次另报。新增 adjacent31项和 packageTest 的 exit1/2764 pass/13 skip有各自 scope，但不能证明 lint 是新执行。receipt 没有绑定新 lint raw 或执行身份；本轮也未取得可认证的原 lint 输出。裁定为记录完整性 counter：该 lint snapshot 信用撤回并隔离，不能认定2791已验证；也不凭缺证直接断言造假。原 packageTest 的失败/skip保持，不做旧测试执行。

### C14

以 `label` 对齐，A的17条、B的12条及C保留的18条对象全部相等，无任何共同label的exit/count/失败名单变动。C移出两个原本exit0且已标惰性的旧针，转到 `supersededInitialNeedles`，原来源仍可由父blob回读；两个替代red label在父版本已存在，不是本次伪造新red。总49→47是删掉两条已废弃记录，生成时间 `generated` 也实际变化；原筛查没有识别该时间键。数组下标的八处差异不代表同一执行被改结果。本项只关闭变动嫌疑，不重授47条反控业务质量。

### C15

整个 `/implementation` 在父版本不存在，新增冷安装、unpatched、host controls和全仓gates，不能当作覆盖既有同次exit。十个指定临时artifact本轮均未找到；具体声明的8317/7826等结果不由本轮代跑或补造。执行信用隔离。该历史 `pnpm check` 明写47 warning、6 info，时间早于当前零诊断规则；原数保持，不回填成0，也不把exit0当当前验收通过。

## 结论

- 十五项变动已有可审查处置：10项变动解释；C08/C09/C12/C13/C15的限定执行或byte metadata信用隔离。C13为既有摘要改写且新执行缺证；C12另有已证byte单位错误。
- 缺证、可解释、SHA一致、日志相符，各自不是整篇语义深审、独立身份或当前产品运行通过。R39–R94的撤回状态不因这些调查恢复。
- 本报告仍为作者候选。非作者必须从Git原blob和原raw重核，不能只复制本表；完整硬门未过，本卡/全量卡不done，候选不合main。

## 整改与复核

- Owner：Codex root，仅本卡文档/治理工具白名单。
- 原筛查、原回执、原stdout/stderr均不覆写。当前裁定经本页及 integrity-audit 的 source/pointer 映射覆盖历史信用，不改旧exit或summary来消counter。
- 非作者验收范围：十五项裁定、隔离是否落实、1896条撤回、113份quote保全、artifactOnly回退和真实命令捕获；如有counter先返工。不是1838份语义全量接受。
- 下一步：限定纠错验收通过后，优先重审仍被当作准入入口却遭历史化的 READ-FIRST 等文档。当前仅排期，没有提前授予这些文档新的语义信用。
- supersedes：[此前“其余十五项待核”](README.md)的调查状态；不替代原历史source、原始错误或正式运行验收。
