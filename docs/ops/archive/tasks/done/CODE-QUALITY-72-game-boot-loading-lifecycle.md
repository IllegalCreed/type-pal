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
