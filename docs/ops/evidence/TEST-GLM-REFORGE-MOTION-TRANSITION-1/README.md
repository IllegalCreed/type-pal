# TEST-GLM-REFORGE-MOTION-TRANSITION-1 交付证据

上级：[任务专属证据](../../README.md) · 任务卡：[TEST-GLM-REFORGE-MOTION-TRANSITION-1](../../tasks/TEST-GLM-REFORGE-MOTION-TRANSITION-1.md)

- 基线：`origin/main` `7a9157ac5`，分支 `codex/glm-reforge-motion-transition-r1`。
- 产品/schema/API/旧测/config/baseline/真实数据零改动（diff 仅本卡测试、脚本、证据与卡面）。
- 结论：8 文件中 7 文件全轴 existing-proof 饱和；`world-motion-runtime.ts` 补 3 条真实
  残余合同，唯一新增测试文件 `packages/reforge/src/world-motion-runtime.motion-transition-1.test.ts`。

## 文件

- [dedup-ledger.md](dedup-ledger.md) — 8 文件逐轴排重账（source:line × caller × 输入 ×
  oracle × 判定），含 U 账 4 条防御臂与候选不设针账。
- [counterproof.json](counterproof.json) — 3/3 针四态反控回执（原始绿/指定业务红/字节恢复绿/
  rebuilt hash），执行集 = reforge 全量套件（无 `-t` 过滤，免疫零匹配假绿），红相位全包恰
  1 failed 且为指定业务 AssertionError。
- [counterproof-raw/](counterproof-raw/) — baseline、每针 mutant/restored 的默认 reporter
  全量 console 原文（EOF 已按纪律规整，sha256 见 counterproof.json）。
- 定向/相邻/typecheck/lint/docs 门禁 raw 见本目录 `gates/` 子目录（交付时生成）。
- 复现：`node packages/reforge/scripts/mt1-mutation-counterproof.mjs`（约 15 分钟，前置要求
  工作树对产品文件 clean）。

## 三条新合同摘要

1. MT-CADENCE-CLAMP-1 — 停顿帧（dt ≥ 2×stepMs）真积压被钳掉：一帧至多一拍，丢弃的余数
   不结转成下一帧的提前拍；普通 carry（< stepMs）不受影响（对照臂）。
2. MT-PARTY-COMPLETE-STALE-1 — 被替换的旧 party 走位槽迟到完成不得唤醒新等待者
   （身份守卫）；当前槽完成照常兑现并清槽。可达性注记见 ledger（宿主同步窗现不产生陈旧引用，
   钉模块公开 API 所有权承诺，按 DT-FIRE-DROP-1 先例交付）。
3. MT-PARTY-RESOLVE-RELEASE-1 — abortScript（读档/dev 强停，main.ts:4568）收口以 fulfilled
   兑现当前在途走位并清槽；结算后迟到 abort 不二次结算（全仓旧测对 resolvePartyMove 行为零覆盖）。

## 环境与清理

- 变异/恢复全程在交付工作树内以字节级写回完成（original/mutant/restored/rebuilt 四态
  sha256 见 counterproof.json），脚本内 mkdtemp 临时树 finally 强制移除。
- 产品源文件最终态与基线逐字节一致（rebuilt hash == original hash），工作树对产品文件 clean。
