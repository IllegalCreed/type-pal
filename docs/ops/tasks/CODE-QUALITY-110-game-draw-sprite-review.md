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
