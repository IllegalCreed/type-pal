# CODE-QUALITY-72 — game boot loading lifecycle

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

保留原卡「CODE-QUALITY-72 — game boot loading lifecycle」的任务归属与历史边界。原目标见原文(摘录:Reviewer: Codex（独立验收） Capability: Q3 game/shell Visual Verification Timing: functional-ui（启动 overlay);本页治理不重开已终态任务。

## 范围

原卡含章节[CODE-QUALITY-72 — game boot loading lifecycle、范围、验证、交接、2026-10-18 当前复审、下一位 Agent 提示词],共4个原文链接。治理范围仅限文档角色、保全与链接处置,不改产品/测试/coverage。

## 前提与证据

固定main源3579B(SHA cb39111e5816);原卡前提按原时点保留。当前存活入口:[README.md](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/72-boot-loading/README.md) [README.md](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/72-boot-loading/approved-fix/README.md) [shell-lifecycle-local.json](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/shell-lifecycle-local.json) [QUALITY-BOOT-FAILURE-PROGRESS-1.md](../../../tasks/QUALITY-BOOT-FAILURE-PROGRESS-1.md)。

## 验收

本页治理验收=模板符合+原文逐字节保全+链接处置如实;原卡验收结论保持原时点(原Status:done),治理不改写。

## 状态与交接

done保持原语义;本治理候选为作者稿(partial/needs),交Owner非作者接收;无新执行授权。

## 历史范围

原卡属固定main时点;CODE-QUALITY-72 — game boot loading lifecycle的原始范围与日期在保全块内逐字保留。

## 原始结论

原卡结论按其Status(done)原样;治理不撤销/不恢复旧信用。

## 当时证据

原文4个链接与当时回执属原时点证据;本页不重跑、不复授。

## 当前有效性

仅历史任务归属有效;不凭旧基点认定当前实现或授权新产品取舍。

## 继任文档

接替/关联入口见原文链接;当前任务导航以看板为准。 关联:[README.md](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/72-boot-loading/README.md) [README.md](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/72-boot-loading/approved-fix/README.md) [shell-lifecycle-local.json](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/shell-lifecycle-local.json) [QUALITY-BOOT-FAILURE-PROGRESS-1.md](../../../tasks/QUALITY-BOOT-FAILURE-PROGRESS-1.md)。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3579B / SHA-256 cb39111e5816d53b25f2f62ee04f59a84ab6c74c324c256e20db85399ae454cb；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
````markdown
# CODE-QUALITY-72 — game boot loading lifecycle

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 game/shell
Visual Verification Timing: functional-ui（启动 overlay DOM 生命周期）

## 范围

- `packages/game/src/shell/boot-loading.ts`
- `packages/game/src/shell/boot-loading.test.ts`
- `packages/game/src/shell/boot-loading-host.grok-r1.test.ts`

## 验证

完整读取实现、main/bootstrap caller 与两份测试；范围/host tests 共 20 tests 全绿，覆盖 fetch 计数、分母/单调进度、onProgress/SW 互斥、note、finish/fail/restore、缺 DOM、缺节点、rAF fallback、幂等与错误生命周期。最近完整 `pnpm check`、ratchet、protected fast、lint-zero、docs/content review、ledger 已通过；无实现改动，未发现直接缺陷。

## 交接

2026-10-13 Codex：accept/done；账本收口为 `3266 / 322 closed / 8 review / 2936 pending`。

## 2026-10-18 当前复审

Codex单一Owner，build allowed仅两测试与治理证据；完整读取149行实现、主/host和真实main/资源屏障/UI/HTML caller。原20例保留数量：弱重复失败提示归G09-C11，增加Request/init/Response透传，增强底层reject同一对象、4/8分母、599/600ms与异步/全局清理。三枚隔离反控各旧20绿→新19绿1指定AssertionError，正式20绿；相邻6文件54例和game typecheck通过。

另发现真实模块组合ui.fail被迟到fetch进度覆盖，一条明确DOM AssertionError；生产未修，已开[高风险卡](../../../tasks/QUALITY-BOOT-FAILURE-PROGRESS-1.md)，main/boot review、precache-ui旧关闭撤回rework。source/caller/oracle/排重、raw/native/hash与未执行边界见[72证据](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/72-boot-loading/README.md)。本批无新全仓check/ratchet/protected；当前partial，不以原done或邻包全绿关闭产品。288closed/47review/2977pending；49partial/34pending/0整卡accept；下一批73。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-72 game boot loading lifecycle
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-72-game-boot-loading-lifecycle.md
当前状态：done，已归档；当前结论 accept/done，无实现改动
```

## 2026-10-18 用户批准后的窄修

[批准修复证据](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/72-boot-loading/approved-fix/README.md)替代上述“未修/冻结”的当前状态：三个生产文件按批准修复失败进度与计数ownership，四条先红后绿、相邻58绿/原红精确重放1绿、game typecheck及实际PROD失败/正常进场与看图完成。boot-loading.ts新增闭合，main/UI仍review，UI主测试新增review；289closed/47review/2976pending。旧counter和原NaN/测试历史原件保留，不把整卡升格accept。全仓check/ratchet/protected未运行，47–52旧门信用已撤回；下一步同片UI测试合同/隔离，再续73。

## 2026-10-21 shell生命周期五卡收口

原三文件接受；批准修复后的main/UI/boot测试等完整直达文件仍同字节，bootstrap/loader/HTML当前caller片段另核。复用原生产错误/正常DOM及原生证据，不重复跑视觉；表外宽域main/UI仍review。四条被-t选中的红例只作指定场景观察，不冒充零pending完整反控。

[当前逐文件A–H、迁移、完整原件及集中门](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/shell-lifecycle-local.json)。只接受原卡及明确迁移范围，广域caller/听感/剧情E2E不附带接受；Git发布另以实际交接为准。
````
<!-- incremental-original-source:end -->
