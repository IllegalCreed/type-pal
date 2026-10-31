# CODE-QUALITY-53 candidate evidence

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 CODE-QUALITY-53 证据目录的索引页,对应任务卡 docs/ops/tasks/CODE-QUALITY-53-player-status-runtime-zero.md（player status runtime-zero / party-slot 毒寻址）。它说明目录内各证据文件分别记录什么、哪些门失败仍然有效、哪些结论不因这些记录成立。证据原件即下方逐字节保全的固定main源(4294B,SHA 4de090bc65e4)。

目录证据围绕三组事实:(1) party-slot 毒寻址与 runtime 0 的修复回归及其反控;(2) 重复角色队伍([4,5,4])下的消费者退化反控;(3) 2026-10-13 检查点的质量门执行结果。产品裁决由用户2026-10-13给出:保留真实 runtime 0、按当前 party slot 读毒、换队清毒按已核源码行为执行。

## 来源与输入

来源为固定Git载体,非本次运行;本页正文无 markdown 链接(原0个链接,处置见作者review的linkDisposition)。原文记载的各证据文件及本轮逐篇核读确认的真实内容:

- reconstructed-negative-control.json:三个针对重建 HEAD 生产源的类型化反控(0x29 槽写、0x61 槽读、status runtime zero),每次恰一业务 AssertionError,源/测试hash与恢复绿齐备;属实现后重放,不是 red-first 时间证据。
- slot-regression-red.txt / slot-regression-green.txt:修正重复角色消费者前后的红/绿日志;红例为 battle HP 180 而非190、状态页与 inspect 重复毒。
- slot-negative-controls.json:三个逐项重建的消费者退化反控(battle-system 战前毒双发 180≠190、状态页 cursor2 复用首槽蛊毒行、inspect 快照复用首槽毒),每例红跑 exit 1 恰一失败,恢复源字节后同一测试通过。
- first-poison-entry.json:data/extracted/events/all.json 的只读提取哈希与全部12个字面 0x29 引用玩家毒的首次入口(10个以 raw opcode 27 起、1个 opcode 28 起、1个仅 end),无 SetParty/重入施毒;不证明任意注入 catalog 或后续续点安全。
- candidate-source-sha256.json:本检查点质量门所涉25个 game 源/测试文件 SHA256;其中6个与 slot-negative-controls 记录的源/测试hash一致。
- gate-check.txt / gate-ratchet.txt:root check exit 0 但含两条 jsdom 导航诊断(统一零诊断未达)与官方 ratchet exit 1;未降任何基线。
- gate-results.json:串行五门(check/ratchet/protected-fast/lint-zero/ledger)的命令、环境、起止时间与退出码 0/1/1/0/0;protected fast 同因覆盖率回退 exit 1。
- ownership-controls.json:七个实现后判别力反控(5次 roleId 兜底退化共用同一 mutant、1次省略0x75清表、1次省略装备刷新),每针恰一 AssertionError,恢复后同一 fullName 通过。
- ownership-results.json 与 ownership-{targeted,typecheck,game}.txt:最终两文件37测试、game typecheck、全包312 files/3540 tests 全 exit 0;两份 changed test hash 与七个反控hash匹配。root check/ratchet/protected fast 故意延后,先前失败仍未解决。
- CODE80 证据目录的 DOM 探针:反证 applyFixture 省略装备重建的临时推断(startBattle 已重算),并记录 party 点击生命周期缺口;探针源存为文本,临时测试执行后删除。

原文并记载:较早未提交的两文件重放 fixture 较弱,已被类型化记录取代,不作为验收证据交付;绿日志缺末尾空行、两个覆盖日志仅缺行尾填充空格,诊断/数值/结果行保留。

## 断言与业务 oracle

文档事实核对(currentExecution=false):各文件记录按其自身字段成立。本轮逐篇核读确认的关键身份:slot-negative-controls 三例红败 fullName 分别为 startBattle 战前毒[4,5,4](180≠190)、状态页 cursor2 毒行与 inspect 按显示槽读毒数组不等;gate-results 五门时间窗 2026-10-13T03:34:11–04:07:13,退出码 0/1/1/0/0;ownership-results(04:34–04:35)与 candidate-source-sha256 对 glm-q/cov85 两份测试记录不同 hash,对应任务卡记载的测试强化迭代,非矛盾。空数组/exit0/成功字样不外推为零诊断或产品通过;本目录任何记录都不关闭整文件或授权集成。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;本轮语义整改在不重开任务、不重跑执行的前提下,把各文件的真实语义(失败身份、mutant 内容、门退出码时序)写回可见正文。不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点。原文引用的各 *.txt 日志与 reconstructed-negative-control.json 不在本轮逐篇核读范围,其语义按原文与任务卡转述,未独立重证。任务卡 Status 为 review 且明确不删除范围,本页不改变任何卡终态。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 4294B / SHA-256 4de090bc65e49aa77ede36ce932762e4c90a2465ad246f48c2ab079c67fa0306；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-53 candidate evidence

The task remains build; these records do not close whole files or authorize integration.

- `reconstructed-negative-control.json`: three focused typed tests against reconstructed HEAD production sources (0x29 slot write, 0x61 slot read, status runtime zero). Each run has one business AssertionError, source/test hashes and the same test passing after byte-for-byte restoration. These are post-implementation replays, not evidence of red-first chronology.
- `slot-regression-red.txt`: actual failures recorded before correcting duplicate-role consumers: battle HP 180 rather than190, duplicate status-page poison, duplicate inspect poison.
- `slot-regression-green.txt`: the adjacent 5-file / 378-test rerun after those corrections.
- `slot-negative-controls.json`: three individually reconstructed consumer regressions, each with one business AssertionError and the same test passing after byte-for-byte restoration. The combined first-red log is regression evidence, not three independently qualified mutation needles.

The earlier uncommitted two-file replay used weaker fixtures and has been superseded by the typed records; it is not delivered as acceptance evidence. CODE53/CODE79 record remaining lifecycle, full-file, and 0x61 mechanism work.

`first-poison-entry.json` records read-only extracted-data hashes and all 12 literal-0x29-referenced player-poison first invocations. No generated assets were edited; this bounded scan does not prove arbitrary injected catalogs or later resumed scripts safe.

`candidate-source-sha256.json` records the 25 changed game source/test files used by this checkpoint's gates. `gate-check.txt` preserves the complete root check output: exit 0 with all package tests passing and static lint at zero diagnostics, but two jsdom navigation messages still prevent unified zero-diagnostic acceptance. `gate-ratchet.txt` preserves the official exit-1 ratchet result; no baseline was lowered. These are checkpoint evidence, not a closed batch or merge approval.

`gate-results.json` records command, environment, start/end and exit for the serial check/ratchet/protected-fast/lint/ledger run. Its original local log paths correspond to the bundled `gate-*.txt` files. Protected fast also exited 1 for the same coverage regression. Static lint exited 0 with all error/warning/info counts zero; ledger remained 338 closed / 10 review / 2919 pending. Final documentation/static checks are recorded separately after these receipts were saved. No E2E, browser visual verification or hosted CI acceptance is claimed.

The bundled green regression log omits its final empty line, and the two coverage logs omit trailing table-padding spaces only; diagnostic messages, values and result lines are retained. `final-docs.txt` and `final-lint.txt` are the successful final documentation and static-check outputs (lint: 4000 files, zero errors/warnings/infos).


`ownership-controls.json` adds seven post-implementation discrimination checks: five absent-role operations against a role-ID fallback, plus the existing 0x75 test against omitted clearing and omitted equipment reconstruction. Each mutation produces exactly one AssertionError; the same test passes after source bytes are restored. These test improvements do not close the files or erase previous failed gates.

The CODE80 evidence directory contains a typed diagnostic DOM probe. It disproves the provisional claim that applyFixture omits equipment reconstruction (startBattle already performs it), and records separate party-click lifecycle gaps. That probe is not a permanent test accepting broken behavior; its source is saved as text and the temporary test is removed after execution.


`ownership-results.json` and `ownership-{targeted,typecheck,game}.txt` record the final two-file 37-test run, game typecheck, and 312-file / 3540-test adjacent package run. All exit zero; the changed test hashes and seven control hashes match. Root check/ratchet/protected fast are intentionally deferred until this lifecycle batch is ready; their prior failures remain unresolved. Documentation and zero-diagnostic static receipts follow separately.

The ownership game/targeted/typecheck text logs omit the final empty line only; result lines and diagnostics are unchanged.
```
<!-- incremental-original-source:end -->
