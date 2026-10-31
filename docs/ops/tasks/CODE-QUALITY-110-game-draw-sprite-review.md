# CODE-QUALITY-110 — game present draw-sprite 逐文件复核

Status: review
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

保留原卡「CODE-QUALITY-110 — game present draw-sprite 逐文件复核」的任务归属与历史边界。原目标见原文(摘录:Reviewer: Codex（独立验收） Capability: present / sprite blit and frame anchor Visual Verification Timing:);本页治理不重开已终态任务。

## 范围

原卡含章节[CODE-QUALITY-110 — game present draw-sprite 逐文件复核、目标与白名单、完整读取与 caller/oracle、逐文件结论、当前验证与收口要求、2026-10-17 批次收口回执],共0个原文链接。治理范围仅限文档角色、保全与链接处置,不改产品/测试/coverage。

## 前提与证据

固定main源2525B(SHA 5d272f5868f2);原卡前提按原时点保留。当前存活入口:无当前仓库内存活链接。

## 验收

本页治理验收=模板符合+原文逐字节保全+链接处置如实;原卡验收结论保持原时点(原Status:review),治理不改写。

## 状态与交接

review保持原语义;本治理候选为作者稿(partial/needs),交Owner非作者接收;无新执行授权。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2525B / SHA-256 5d272f5868f22a6bdeb86dd541ca4e7271e76e5be24c1f539c125930c1e45b8b；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-110 — game present draw-sprite 逐文件复核

Status: review
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1
Capability: present / sprite blit and frame anchor
Visual Verification Timing: N/A（本批为源码/像素 buffer 合同核验，不改 UI）

## 目标与白名单

- `packages/game/src/present/draw-sprite.ts`
- `packages/game/src/present/draw-sprite.test.ts`
- `packages/game/src/present/draw-sprite-clip.grok-r1.test.ts`

## 完整读取与 caller/oracle

完整读取实现、三个测试、`present.ts` 的 party/follower/NPC draw caller、FBP/ending shell
caller、bootstrap 资源注入、dialog asset shape、Framebuffer 写入边界，以及 PNG 解码集成测试。
primary 为 SDLPal `palcommon.c:36-130`、`scene.c:210-316`、`fight.c` 的 RLE blit/anchor/clip
和排序合同。

## 逐文件结论

- `draw-sprite.ts`：逐帧 `anchorX=floor(width/2)`、`anchorY=height`，opaque mask 与 palette-0
  正确分离，所有写入经 `Framebuffer.writePixel`；未发现产品缺陷。
- `draw-sprite.test.ts`：覆盖不同帧高、脚底对齐、palette-0、透明孔和屏外调用，oracle 具体。
- `draw-sprite-clip.grok-r1.test.ts`：补奇数宽、左右/上下裁剪、identity 复用和透明孔；与主干合同
  分工清晰，未发现重复或弱断言。

## 当前验证与收口要求

- 定向：3 files / 17 tests PASS，0 stderr。
- game typecheck：PASS。
- 收口前运行全仓 `pnpm check`、official coverage ratchet、protected fast、lint-zero、
  `pnpm check:docs`、ledger 和 `git diff --check`。coverage baseline 回退保持原样；任何
  sprite asset/schema、生成物、公共接口或用户可见行为变化另开高风险卡。

## 2026-10-17 批次收口回执

- 定向：3 files / 17 tests PASS、0 stderr；game typecheck PASS。
- 全仓 `pnpm check` exit 0：content 149/149、shared 16/16、game 321/3613、
  pal-extract 72/434、reforge 359/8964、editor 631/4943、migrate 96/739；各包
  typecheck/test 完成，lint 4962 files 为 0 errors / 0 warnings / 0 infos。
- `pnpm check:docs`、`node scripts/quality/code-quality-ledger.mjs` 和 `git diff --check`
  通过；账本为 3307 tracked / 231 closed / 35 review / 3041 pending。
- official `pnpm coverage:ratchet` 与 protected fast 仍因既有 shared/pal-extract/total
  baseline 回退失败；本批无源码修复，不调整 baseline。
- 三个文件保持 `review`；没有 schema/save、公共接口、生成物或用户可见行为修改。
```
<!-- incremental-original-source:end -->
