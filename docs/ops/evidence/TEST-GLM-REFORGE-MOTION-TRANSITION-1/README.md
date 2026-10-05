# TEST-GLM-REFORGE-MOTION-TRANSITION-1 交付证据

上级：[任务专属证据](../../README.md) · 任务卡：[TEST-GLM-REFORGE-MOTION-TRANSITION-1](../../archive/tasks/done/TEST-GLM-REFORGE-MOTION-TRANSITION-1.md)

- 基线：`origin/main` `7a9157ac5`，分支 `codex/glm-reforge-motion-transition-r1`。
- 产品/schema/API/旧测/config/baseline/真实数据零改动（diff 仅本卡测试、脚本、证据与卡面）。
- 结论：8 文件中 7 文件全轴 existing-proof 饱和；`world-motion-runtime.ts` 补 3 条真实
  残余合同，唯一新增测试文件 `packages/reforge/src/world-motion-runtime.motion-transition-1.test.ts`。

## 文件

- [dedup-ledger.md](dedup-ledger.md) — 8 文件逐轴排重账（source:line × caller × 输入 ×
  oracle × 判定），含 U 账 4 条防御臂与候选不设针账。
- [counterproof.json](counterproof.json) — r2 反控回执：runner 自测 11 例（9 拒收反例 +
  2 放行正例）全过；每针四态（原始绿/指定业务红/字节恢复绿/rebuilt hash）与完整 argv/cwd/env
  摘要、JSON 计数、exit/signal/spawnError、源文件四态 sha256。
- [counterproof-raw/](counterproof-raw/) — 每个 phase（baseline / 每针 mutant / 每针
  restored / final-replay）的**完整 file×fullName×status 执行集** TSV artifact
  （`*.identity.tsv`，按 (file, fullName) 排序，字节流即 identitySha256，8 个 artifact 逐一经
  回执 sha256 复核）+ 红相位默认 reporter console 原文。红相位硬门：exit≠0、signal/spawnError
  null、numFailedTests=1、numPending/numTodo=0、无空断言集失败 suite、唯一失败 fullName 与
  目标合同**精确相等**、failureMessages 含指定 AssertionError；绿相位硬门：全 passed 且
  identitySha256 与 baseline 集合级一致。
- 定向/相邻/全包/typecheck/lint/docs 门禁 raw 见本目录 `gates/` 子目录。
- 复现：`node packages/reforge/scripts/mt1-mutation-counterproof.mjs`（约 15 分钟，前置要求
  工作树对产品文件 clean；回执跑后以 biome format 规整，artifact TSV 不经 format、字节即 hash）。

## r2 返工说明（2026-10-05，Codex 一审反控证据门）

r1 回执只存计数摘要、failed 用 includes 前缀匹配、绿相位无执行集比较。r2 按返工令重铸：完整
执行集 TSV artifact + 集合级 identitySha256 比较、严格红/绿相位硬门（exit/signal/spawnError/
pending/todo/collection 形态）、精确 fullName 相等判、runner 自测反例族（多失败/错名/exit0/
pending/collection error/非断言错误/signal/spawn/绿相位集合漂移全部拒收，正例放行）。三针三态
与全部门禁由最终脚本字节重出。

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
