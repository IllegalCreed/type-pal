# CODE-QUALITY-60 — game quick-save lifecycle

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

保留原卡「CODE-QUALITY-60 — game quick-save lifecycle」的任务归属与历史边界。原目标见原文(摘录:逐文件核验快速存档/读档快捷键、准入状态、取消解绑、异常传播与 bootstrap caller，确认 F5/F9 不越过战斗/对话/菜单门，不吞错误，不残留 window listener。);本页治理不重开已终态任务。

## 范围

原卡含章节[CODE-QUALITY-60 — game quick-save lifecycle、目标、范围、前提真值门、验证、当前模式推进记录],共1个原文链接。治理范围仅限文档角色、保全与链接处置,不改产品/测试/coverage。

## 前提与证据

固定main源3735B(SHA 322f4fb89980);原卡前提按原时点保留。当前存活入口:[save-v1-local.json](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/save-v1-local.json)

## 验收

本页治理验收=模板符合+原文逐字节保全+链接处置如实;原卡验收结论保持原时点(原Status:done),治理不改写。

## 状态与交接

done保持原语义;本治理候选为作者稿(partial/needs),交Owner非作者接收;无新执行授权。

## 历史范围

原卡属固定main时点;CODE-QUALITY-60 — game quick-save lifecycle的原始范围与日期在保全块内逐字保留。

## 原始结论

原卡结论按其Status(done)原样;治理不撤销/不恢复旧信用。

## 当时证据

原文1个链接与当时回执属原时点证据;本页不重跑、不复授。

## 当前有效性

仅历史任务归属有效;不凭旧基点认定当前实现或授权新产品取舍。

## 继任文档

接替/关联入口见原文链接;当前任务导航以看板为准。 关联:[save-v1-local.json](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/save-v1-local.json)


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3735B / SHA-256 322f4fb89980ae81f27c46e7364e9ad282f4f19a80607368aaf6d0ff30693937；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
````markdown
# CODE-QUALITY-60 — game quick-save lifecycle

> 2026-10-21当前复审accept：[CODE59/60逐文件A–H与完整原件](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/save-v1-local.json)。获准结构/历史非空/角色域修复先红后绿，52相邻、20386全仓check、19988 official ratchet/protected全部零诊断；5次原生文件/IDB入口验证。60复用有效九例及反控；不扩大到Save/IDB/面板整文件或94–102。下文保留历史时点。

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 game/tools / save wave
Visual Verification Timing: N/A（快捷键与 toast 生命周期）

## 目标

逐文件核验快速存档/读档快捷键、准入状态、取消解绑、异常传播与 bootstrap caller，确认 F5/F9 不越过战斗/对话/菜单门，不吞错误，不残留 window listener。

## 范围

- `packages/game/src/tools/quick-save.ts`
- `packages/game/src/tools/quick-save.test.ts`

只读相邻 caller/oracle：`packages/game/src/shell/bootstrap.ts:1110-1118`、`packages/game/src/tools/save-io.ts`、`packages/game/src/core/save/api.ts`、`packages/game/src/tools/save-import-quicksave.glm-msio.test.ts`、phase1 save plan 快捷键准入。

## 前提真值门

- 一句话行为 / 工程前提：F5 只在 explore、无 dialog、无 menu 时保存固定 slot 1；F9 委托 bootstrap 完整读档恢复；两键都 preventDefault 并将失败转为 toast。
- 原版/primary source：SDLPal 快速键是 type-pal 工具便利能力，N/A；phase1 save plan 与当前 bootstrap 注入 caller 定义准入和 slot 1 委托。
- 当前实现：`quick-save.ts:1-61`；bootstrap 注入 `Save.saveSlot` / `loadGameFromSlot`；MSIO 测试覆盖异常 toast/空槽。
- 当前 `before -> after`：文件仍待逐文件核验 -> 以真实 caller、测试 oracle 和 save wave 全门登记已验证；不改变快捷键或 slot 形态。

## 验证

- 完整读取实现、测试、bootstrap caller、Save API 与 save-io 边界。
- 定向 quick-save 4 tests；与 tools-panel/save-io/MSIO 合计 29 tests 全绿；game 全包 3522 tests。
- 同一 save wave 的 `pnpm check`、官方 ratchet、origin/main protected fast、lint-zero、docs/content review、ledger 全部通过；无实现改动。

## 当前模式推进记录

- Codex 范围/前提核验: verified
- Codex 独立验收: accept（2 文件逐段核验、真实 bootstrap caller、定向/相邻与全门通过）
- done 准入: Codex done allowed；本批无代码修改。

## 交接

2026-10-21 Codex：唯一Owner，治理树3y，基点92e901806926c0fb08b9787877eed9ed45147d8d。完整核当前两文件、相邻parser/MSIO/toast及真实bootstrap/Save边界；A–H逐文件写入回执。纯测试合同迁移与注释修正，无产品执行变化、用户槽位或schema修改。旧MSIO的D1移入save-io主测，E1/E2/E3并入强化后的quick-save主测；20→18包含toast相邻，不以数量或包绿授验收。覆盖率、protected和全仓check未运行，本中间片未推送/合并，CODE60保持partial，待完整模块门后正式裁定。

- 2026-10-13 Codex：F5/F9 准入、preventDefault、解绑函数、Save/loader 异常 toast 与 bootstrap caller 均核验；save wave 全门通过。账本收口为 `3266 / 292 closed / 8 review / 2966 pending`。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-60 game quick-save lifecycle
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-60-game-quick-save-lifecycle.md
当前状态：done，已归档
若重开审计：复核 quick-save.ts/test、bootstrap caller 与 save version boundary；不得直接重用本卡作为新 build 授权
当前结论：accept/done，无实现改动
```
````
<!-- incremental-original-source:end -->
