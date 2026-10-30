# CODE43/44/45/54 present 渲染四卡复审切片(GLM,只读零改动)

基点 `dec0626e1c`;本片零改动(文件与基点逐字节相同)。范围:CODE-QUALITY-43(draw-sprite)、44(font)、45(follower-render)、54(draw-tilemap)四卡 4 生产文件 + 6 份测试全文逐文件八维。读取 SHA 见 [`read-boundaries.json`](read-boundaries.json) 逐文件 A–H 索引与读域标注见 [`per-file-index.md`](per-file-index.md)(2026-10-20 C1 返工新增)。,定向原件 [`directed-final.json`](directed-final.json)。

**结论:未发现可由 primary source + 真实 caller 证实的新 direct defect;零改动。**四卡建议 `pending → partial`。

## A 正确性与边界(逐文件)

- **draw-sprite.ts(49)**:逐帧 anchor(每帧自身宽高,chunk193 爬行帧高 31..73 的偏下根因回归有测试);opaque mask 判透明(M3.5 fix,palette-0 不再误杀)。
- **font.ts(202)**:tofu 回退确定性像素;fShadow 三影对齐 text.c:1144-1155(sdlpal 自身统一 triple,注释如实交代 DOS/WIN95 分歧);`palCharWidth`/`palWordWidth` 的已知近似(控制字符/Latin-1/代理区偏差)在 docblock 精确披露边界并说明为何不修——菜单文案域内零影响。measureText 与布局入口的区分(ASCII fallback 翻倍陷阱)有注释+测试双锚。
- **follower-render.ts(64)**:follower k→trail[3+k]、FOLLOWER_STEP_FRAME [0,2,0,1](区别于 leader [0,1,0,2])、spriteNum=0x98 operand 直当 chunk(res.c:335-348 不走角色表)——三处易错真值均有判别测试。
- **draw-tilemap.ts(382)**:map.c:382-417 公式逐行锚;±1 fence(layer0 回落首格 tile / layer1 跳过);L32 缺图回落仅 layer0;repairTilemapSeams 用 coverage(非 indices===0)判漏黑——opaque index-0 不污染有测试;PAL_CalcCoverTiles 五 case 表 + L31 负坐标 trunc 边界(区别 floor)完整移植。

## B–H

B:注释密度高且每条带 C 行号与修复史,与实现一致。C:纯函数+coverage 注入,无隐式全局。D:blitTile 复用(blitTileAt 公开仅测试端口)。F/G:无死代码。H:可直测(像素 oracle)。

## E 测试质量(逐例)

6 份测试逐例核读:anchor 剖面/底边对齐/opaque 真值表三态、字形 blit/游标推进/tofu 像素/逐字符色/三影不覆盖主字、follower 帧序与 trail 深度、tilemap 子行坐标/fence 回落分 layer/9-bit id 提取/半裁剪 coverage/行列剔除/邻居顺序/maxPasses(G03-A01..A11)。无缺口,不新增。

## 执行事实

定向 6 files / **51 passed** / 0 failed,exit 0,无 stderr。零改动无需 typecheck/biome。**未跑**(留阶段收尾):全仓 check、ratchet、protected fast、coverage。

## 失效条件与剩余项

map.c/scene.c/res.c/text.c/font.c 参考库、Tilemap/SpriteImage 类型、present caller 变化会使对应结论待复核。CODE-QUALITY-57 的 thumbnail seam(bootstrap.ts)不在本片(54 卡只辖 draw-tilemap.ts 本体)。
