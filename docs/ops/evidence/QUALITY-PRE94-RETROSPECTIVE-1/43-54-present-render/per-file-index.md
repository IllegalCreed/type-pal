# C1 逐文件 A–H 索引 — 43-54 present 渲染(10 条 fullReads)

读域标注同 [73-78 索引](../73-78-shell-lifecycle/per-file-index.md)。指纹勘误见 [`read-boundaries.json`](read-boundaries.json)。共享论据引用本目录 README。

## 生产文件(4)

**draw-sprite.ts**【原审全文】A:每帧自身宽高定 anchor(scene.c:224/291/358 逐帧 PAL_RLEGet*)、opaque mask 判透明(M3.5 fix:RLE-skip 与 palette-0 分离)。caller=present/party/NPC 精灵 blit、minimap 缩略。B:chunk193 爬行偏下根因注释与测试锚一致。C:纯 blit 不持状态。D:与 blitTile 各自服务 sprite/tile 像素布局,不强行合并。F/G:49 行无冗余。H:像素 oracle 可直测。
**font.ts**【原审全文】A:tofu 确定性像素、三影 text.c:1144-1155(sdlpal 自统一 triple,DOS/WIN95 分歧如实注)、blitGlyph 位序、measureText/palCharWidth 分工。caller=dialog-box/draw-menu/draw-number 等全部文本渲染。B:palCharWidth/palWordWidth 已知近似(控制字符/Latin-1/代理区)边界精确披露并说明不修理由。C:GlyphTable 注入无全局。D:renderText/renderColoredText 共享 blitGlyph。F/G:无死分支。H:mock GlyphTable 直测。
**follower-render.ts**【原审全文】A:follower k→trail[3+k](scene.c:737-740)、FOLLOWER_STEP_FRAME [0,2,0,1](654-674,区别 leader [0,1,0,2])、spriteNum=0x98 operand 直当 chunk(res.c:335-348 不走 rgwSpriteNum)。caller=present 收集 Y-sort 队列。C:纯函数。F/G:trail 深度不足跳过有测试。H:参数全显式。
**draw-tilemap.ts**【原审全文】A:map.c:382-417 公式(h=0 (-16,-8)/h=1 baseline)、±1 fence(layer0 回落首格 412/layer1 -1 跳过)、L32 缺图回落仅 layer0、coverage 判漏黑+逐趟扩散(repairTilemapSeams)、PAL_CalcCoverTiles 五 case 表(scene.c:77-178)+L31 负坐标 trunc(113-117)与 blit 相消推导(357-360)。caller=present.ts 两层绘制+addCoverTileEntries。B:每条公式带 C 行号与修复史(M3 T3 D29 baseline 反置/M3.5 T6 fence)。C:camera 语义=viewport 单一约定。D:blitTileAt 公开仅测试端口(已披露)。F/G:382 行无死分支。H:TileImages 注入+coverage 可选口。

## 测试文件(6,E 为主)

**draw-sprite.test.ts**【原审全文】E:anchor 剖面(31..73)/底边对齐恒 cy-1/opaque 真值三态(0 不覆盖、opaque1+idx0 画)/屏外不抛。oracle=frame 高度表+C 逐帧语义。
**font.test.ts**【原审全文】E:palCharWidth ASCII/CJK、palWordWidth 4/5/6 CJK 与 8-ASCII=4(非 length)、mock 字形 blit 顶行/游标推进/未知码点 tofu、measureText 五例。
**font.glm-phase1-leaves.test.ts**【原审全文】E:renderColoredText 对位色/缺色 0x4F/三影写黑不覆盖主字、tofu 框精确像素(顶 0-14 亮 col15 暗/中行 col0/col9)、空表 ASCII fallback 16(布局禁用锚)。
**follower-render.test.ts**【原审全文】E:无 follower 空、深度不足跳过、trail[3]/[4] 双跟随、站立 dir*3、行走步序 [0,2,0,1] 全四步、0x98 operand 直传。
**draw-tilemap.test.ts**【原审全文】E:子行坐标(camera 语义 160,112 双点)、fence layer0 get 计数>1/layer1 恰 [0xfe]、9-bit 提取双臂、coverage 标记/远处不标、seam 邻居填充/opaque-0 不污染/多趟扩散。
**draw-tilemap-pixels.grok-r1.test.ts**【返工补读】原审查仅头部 60 行+标题全列,2026-10-20 返工全文补读。E:G03-A01-11——分 layer 缺图回落三态、透明不记 coverage/opaque-0 记、x=0/y=0 跨界裁剪、整行/整列剔除不取 id、接缝西北邻居优先、maxPasses=1 单圈、blitTileAt 1×1。补读结论:与主测试互补无重复,无缺口。
