# CODE-QUALITY-70 — game audio volume boundary

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

原卡目标:补齐 `audio-volume.test.ts` 主测试文件的逐文件记录（实现与 boundaries 已由 CODE-QUALITY-3i 收口）:clamp/NaN/explicit zero/default、静音/unmute、三通道 keyVol 独立、共享 keyMute 与静音中目标值更新。

## 范围

单测试文件;相邻已闭合实现/边界证据复用 3i 结论。

## 前提与证据

2026-10-18 复审:完整读取实现/两测试,核 bootstrap 三通道注入和 tools-panel 广播/滑块 caller。修前实际 3+3 共 6 例（旧 3+5 计数按历史保留）;静音中改目标归入 main,拆 stored/default 与音量键/静音键配置轴,补完整状态/sink/storage oracle 和前后清理,纠正"setter 读共享键"注释;修后 3+5 共 8 例,不以数量/包绿作验收。

## 验收

忽略 keyMute 隔离反控:旧 6 绿→新 7 绿 1 个指定 AssertionError,正式 8 绿;相邻 6 文件 36 例及 game typecheck 通过;当时 287 closed/44 review/2981 pending,当前 partial。证据见 [README.md](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/70-audio-volume/README.md)。2026-10-21 基础绘制与同版本只读补证收口:只接受原一主测——clamp、目标/有效输出、启动读回均有真实 controller、Storage 与 sink 组合 oracle;三份音量源/测试与 8 例及 keyMute 单红原件同 SHA,bootstrap 三路注入和 panel 广播定向重核;0 新增执行,不附带 controller、boundary 或听感验收。A-H 见 [present-shell-readonly.json](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-shell-readonly.json),完整当前门见 [present-leaves-gates.json](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json)。

## 状态与交接

done 保持原历史语义;2026-10-18 复审 partial、2026-10-21 收口只接受原一主测范围。

## 历史范围

原卡属 2026-10-13 补记录时点;原始记录在保全块内逐字保留。

## 原始结论

原卡结论按 Status(done) 原样:主合同记录补齐。治理不撤销/不恢复旧信用。

## 当时证据

当时回执（keyMute 隔离反控原件、相邻 36 例）属原时点证据;本页不重跑、不复授。

## 当前有效性

仅历史任务归属有效;当前结论以 present 收口原件为准。

## 继任文档

CODE-QUALITY-3i（实现/边界既有记录）与 present 收口证据为继任;当前任务导航以看板为准。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2997B / SHA-256 6985bc42e0613317422c479c51b2fbf04416b802ce3409077d67d52e7b9a1ea3；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
````markdown
# CODE-QUALITY-70 — game audio volume boundary

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 game/shell
Visual Verification Timing: N/A（localStorage/音频 sink controller）

## 范围

- `packages/game/src/shell/audio-volume.test.ts`

相邻已闭合实现/边界证据：`audio-volume.ts` 与 `audio-volume.boundaries.test.ts` 已由 CODE-QUALITY-3i 收口，本卡补齐主测试文件的逐文件记录。

## 验证

完整读取主测试文件与 CODE-QUALITY-3i 已闭合的实现/边界合同；主测试 3 tests 与相邻边界 5 tests 全绿，覆盖 clamp/NaN/explicit zero/default、静音/unmute、三通道 keyVol 独立、共享 keyMute 与静音中目标值更新。最近完整 `pnpm check`、official ratchet、protected fast、lint-zero、docs/content review、ledger 均通过；无实现改动。

## 交接

2026-10-13 Codex：accept/done；补齐 `audio-volume.test.ts` 主合同记录，账本收口为 `3266 / 317 closed / 8 review / 2941 pending`。

## 2026-10-18 当前复审

Codex单一Owner，build allowed仅主/边界两测试与治理证据。完整读取实现/两测试，核bootstrap三通道注入和tools-panel广播/滑块caller。修前实际3+3共6例，旧3+5计数按历史保留；静音中改目标归入main，拆stored/default与音量键/静音键配置轴，补完整状态/sink/storage oracle和前后清理，纠正“setter读共享键”注释。修后3+5共8例，不以数量/包绿作验收。

忽略keyMute隔离反控旧6绿→新7绿1个指定AssertionError，正式8绿；相邻6文件36例及game typecheck通过。源/API/UI/save与规则未改。实际读取/合法输入/primary/caller/oracle/排重/native/raw/hash见[70证据](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/70-audio-volume/README.md)。新全仓check/ratchet/protected未跑，旧波次不认证本候选，当前partial。新增main一项closed，287closed/44review/2981pending，48partial/35pending/0整卡accept；下一批72。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-70 game audio volume boundary
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-70-game-audio-volume-boundary.md
当前状态：done，已归档；当前结论 accept/done，无实现改动
```

## 2026-10-21 基础绘制与同版本只读补证收口

只接受原一主测：clamp、目标/有效输出、启动读回均有真实controller、Storage与sink组合oracle。三份音量源/测试与8例及keyMute单红原件同SHA，bootstrap三路注入和panel广播定向重核。0新增执行，不附带controller、boundary或听感验收。

[A-H, callers, native evidence and limits](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-shell-readonly.json); [complete current gates](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/present-leaves-gates.json). Original failures/counts remain historical; no broad/adjacent file or deferred visual credit. Git integration is recorded separately.
````
<!-- incremental-original-source:end -->
