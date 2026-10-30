# CODE-QUALITY-110 — Codex 当前验收（2026-10-17）

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

原审计「CODE-QUALITY-110 — Codex 当前验收（2026-10-17）」的主题按原文时点保留(摘录:完整读取： - `packages/game/src/present/draw-sprite.ts`（49 行） - `packages/game/src/present/draw-sprite.te)。

## 范围与证据

原报告含章节[CODE-QUALITY-110 — Codex 当前验收（2026-10-17）、读取范围、当前结论、验证]、0个链接;固定main源1644B(SHA fc28cef0818c)。当前存活入口:无当前仓库内存活链接。

## 发现

原文发现/计数/日期按原时点保留在保全块;本页不重算审计结论。

## 结论

原结论保持原时点;治理不改写审计判定,不撤销旧撤信,不恢复旧完成声明。

## 整改与复核

本治理候选仅覆盖文档角色与保全;整改事实以原文与后继卡为准;候选待Owner接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1644B / SHA-256 fc28cef0818c7d03cd2c0397b4b89279ccdcb3ee2333b72c3df3bb74fca77b58；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
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
```
<!-- incremental-original-source:end -->
