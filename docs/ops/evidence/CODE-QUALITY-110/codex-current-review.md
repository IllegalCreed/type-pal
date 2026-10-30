# CODE-QUALITY-110 — Codex 当前验收（2026-10-17）

## 读取范围

完整读取：

- `packages/game/src/present/draw-sprite.ts`（49 行）
- `packages/game/src/present/draw-sprite.test.ts`（85 行）
- `packages/game/src/present/draw-sprite-clip.grok-r1.test.ts`（79 行）
- `present.ts` 中 party/follower/NPC/额外 follower 的真实 draw caller
- `shell/fbp-player.ts`、`shell/ending-player.ts` 的 top-left caller
- `shell/bootstrap.ts` 的 sprite loader 注入、`assets/dialog-assets.ts` 的相邻 sprite shape、
  `present/framebuffer.ts` 的 writePixel ownership
- `present/__tests__/grok-present/p10-indexed-png.test.ts` 的解码→draw caller

primary：SDLPal `palcommon.c:36-130` 的 RLE blit/crop/透明处理、`scene.c:210-316` 的
每帧宽高/anchor/屏外剔除/排序与 `fight.c` sprite blit anchors。

## 当前结论

`toSpriteImages` 对每帧独立计算底部中心 anchor，保留 indices/opaque identity；`drawSprite`
只按 opaque mask 写入，允许 palette index 0 作为合法不透明像素，并通过 `Framebuffer.writePixel`
统一边界裁剪。present、FBP、ending 和 dialog 资产 caller 的坐标 ownership 与该合同一致。

三个测试分别覆盖帧高/宽 anchor、palette-0/透明孔、屏外裁剪、identity 复用和 PNG 解码 caller；
未发现恒真、无业务执行或明显重复用例，也没有需要改生产实现的直接反例。

## 验证

- game present 定向：3 files / 17 tests PASS，0 stderr。
- game typecheck：PASS。

本批无生产或测试源码改动；两个实现/三个测试文件登记为 `review`，待统一质量门后收口。
