# 字体 / 调色板 / 屏幕特效 — 三方逐函数对照审计

> 审计日期 **2026-07-05** · 基线 commit `6ddb4434`(`docs(phase2): 第一阶段深度审计跟踪表 — 73 单元全列`)。
> 审计员:Claude(深度审计模式)。范围:sdlpal C 真值 → 一阶段(game 包)→ reforge 重写引擎。
> 文件锚点用 `path:line`,C 源用 `reference/sdlpal/...`。状态标记 ✅正确 / ⚠️偏差 / ❌缺失 / ✨免疫(无需移植)。
> **审计单元**:W-font(字体渲染)、W-palette(调色板 fade)、W-fx(屏幕波纹/震屏)。

---

## 0. 审计总览(执行摘要)

| 单元 | sdlpal C | 一阶段 | reforge | 一阶段忠重度 | reforge 忠重度 |
|---|---|---|---|---|---|
| **W-font 字体 blit** | font.c + text.c | font.ts | glyph.ts + text-render.ts | ✅ 逐位忠实 | ⚠️ blit 忠实,数据源换 |
| **W-font 三层阴影** | text.c:1144-1156 | font.ts:122-127 | text-render.ts:38-44 | ✅ triple(color 0) | ✅ triple(color 0) |
| **W-palette 六类 fade** | palette.c 6 函数 | palette-fade.ts 6 builder | main.ts `hostFade`(RGBA 幕布) | ✅ 逐位忠实 | ❌ 仅 fade-in/out 幕布 |
| **W-palette UI 色绑定** | text.c:29-34 + 调色板 | dialog-box.ts + present.ts palette-as-state | palette-color.ts(固定 RGBA) | ✅ 绑场景 palette | ⚠️ 解耦为固定 RGBA |
| **W-fx 屏幕波纹 32 相位** | scene.c:365-450 | screen-wave.ts | (无) | ✅ 逐行卷动忠实 | ❌ 缺失 |
| **W-fx 震屏垂直跳动** | video.c:571-616 | screen-shake.ts | (无) | ✅ 奇偶帧 ±level 忠实 | ❌ 缺失 |

**最高风险缺口**(reforge):屏幕波纹 / 震屏 / 六类 palette fade 全缺 → 剧情 0x71(波纹)、0x0035(震屏)、0x4F(FadeToRed)、0x8C(ColorFade)、0x93(SceneFade)在 reforge 全部静默降级为「RGBA 幕布或无」。

**结论**:一阶段是 sdlpal 的逐位级端口(C 真值的 TypeScript 翻译);reforge 是**外观等价的 RGBA/Canvas 重写**,有意放弃 indexed-palette 忠实,但**丢掉了三类像素级特效**(波纹/震屏/真 FadeToRed)。

---

## 1. 单元 W-font — 字体渲染

### 1.1 sdlpal C 真值

#### `PAL_DrawCharOnSurface`(font.c:521-608)
单字符 blit 到 8-bit indexed surface。

- **位序**:MSB-first。`unicode_font[wChar][i] & (1 << (7 - j))` (font.c:580/598/600)。
- **字形尺寸**:全宽 `font_width==32`(32 字节 = 16 行×2 字节,16px 宽),半宽 `font_width<32`(16 字节 = 16 行×1 字节,8px 宽)。font.c:574 分支。
- **font_offset_x/y**:自定义 BDF 字体的 BBX 偏移(font.c:383-384 `_font_height - bboy - bbh - 4`)。内嵌字形偏移恒 0。
- **8x8 分支**:`iso_font_8x8[wChar][i] & (1 << j)`(font.c:565)— 注意 8x8 用 LSB-first,16x16 用 MSB-first。
- **越界保护**:`x+j < lpSurface->w && x+j >= 0`(font.c:578)、`dest < top`(底部裁剪)。
- **颜色**:单色 `bColor`(palette index,典型 0x4F)。

#### `PAL_DrawTextUnescape`(text.c:1087-1185)
逐字符 blit 串,**三层阴影**。

- **阴影逻辑**(text.c:1144-1156)— ⚠️ 审计重点:
  ```
  PAL_DrawCharOnSurface(ch, gpScreen, PAL_XY(x+1, y),   0, fUse8x8Font);  // 右
  PAL_DrawCharOnSurface(ch, gpScreen, PAL_XY(x,   y+1), 0, fUse8x8Font);  // 下
  PAL_DrawCharOnSurface(ch, gpScreen, PAL_XY(x+1, y+1), 0, fUse8x8Font);  // 右下
  PAL_DrawCharOnSurface(ch, gpScreen, PAL_XY(x,   y),   bColor, fUse8x8Font);  // 主色
  ```
  **三层** color 0(黑),偏移 (+1,0)/(0,+1)/(+1,+1),然后主色 @ (x,y)。
- **C 源注释自白**(text.c:1147-1150):"In the original PAL DOS version, the text has **triple shadows**, while Win95 only has one layer. It is suspected that there is a bug in the original Win95 version, so sdlpal chose to use **triple shadows** for both." — sdlpal 主观统一 triple(认为 Win95 单层是 bug)。
- **宽度推进**:`rect.x += PAL_CharWidth(ch)`(text.c:1157)。
- **更新区膨胀**:fShadow 时 `urect.w++, urect.h++`(text.c:1165)。

#### `PAL_CharWidth`(font.c:611-629)
`font_width[ch] >> 1`(32→16px,16→8px,0→0)。含 unicode 代理区/PUA 裁剪(`wChar >= unicode_lower_top && < unicode_upper_base` 返 0)。

#### 字体加载(`PAL_InitFont` font.c:433-510)
- `wor16.fon` @ offset 0x682(BIG5,font.c:177)— **原版繁中字模源**。
- 或内嵌 `fontglyph_cn`(GBK 16px)/ `fontglyph_tw`(BIG5 15px)/ `fontglyph_jp`(16px)。
- BDF 用户字体(`PAL_LoadUserFont` font.c:200-431):解析 BBX/DWIDTH/ENCODING,BIG5/GBK/ISO10646 任一。

### 1.2 一阶段实现(font.ts)

逐函数对照:

| C 函数 | 一阶段对应 | 忠重度 | 说明 |
|---|---|---|---|
| `PAL_DrawCharOnSurface` | `blitGlyph`(font.ts:73-90) | ✅ | MSB-first `>> (7-(col%8))` 与 C `>> (7-j)` 同序;单色 `fgColor` palette index。 |
| `PAL_DrawTextUnescape` | `renderText`(font.ts:105-131) | ✅ | fShadow triple(+1,0)/(0,+1)/(+1,+1) color 0 + 主色,逐行逐位与 C 一致。 |
| (per-char color) | `renderColoredText`(font.ts:140-165) | ✅ | port text.c:1594 每字符用当时 `bCurrentFontColor`;缺色防御 fallback 0x4F。 |
| `PAL_CharWidth` | `palCharWidth`(font.ts:196-198) | ⚠️ | **近似**:`cp<0x80?8:16`。注释自承(font.ts:188-194)未移植 unicode 代理/PUA 裁剪;对游戏文案(纯 CJK+ASCII)零影响。 |
| (word wrap) | `palWordWidth`(font.ts:205-209) | ✅ | port ui.c:836-861 `(ΣcharW+8)>>4` 全宽量化。 |
| `PAL_FontHeight` | (常量 16) | ✅ | Glyph.height=16 固定。 |

**字形数据源**:一阶段读 `data/extracted/data/font/glyphs.json`(font.ts:44-62),由 `pal-extract/src/font/bdf-to-json.ts` 从 **GNU Unifont CN BDF** 预生成(非原版 wor16.fon BIG5)。`parseBdf`(bdf-to-json.ts:14-65)按 BBX/ENCODING/BITMAP 解析,`codepoint > 0` 才收。

**Tofu fallback**(font.ts:27-40):16×16 空心框,缺字形时占位。

#### git fix 史(一阶段字体)
- `50837b71` feat(M2.17):初版色块占位字(非真字模)。
- `eaf9b626` fix(M2.17):命名/注释清理。
- `9eff3722` feat(M4.P4.T3):**真 glyph blit 重写**(Unifont CN 16×16)。
- `9e73f068` fix(M5.6 hotfix):**menu text triple shadow** — user 怼 OpeningMenu 没阴影,sdlpal ui.c:458 `PAL_ReadMenu` fShadow=TRUE 真值,补 triple。**反 shallow 教训第 6 类**。
- `42428699` fix(M5.6 hotfix×N):shadow 回 triple(user 给 sdlpal Win95 截图对照)。
- `77f6c2ec` feat(dialog):逐字符颜色控制符全套(- 青 / ' 红 / @ 红alt / " 黄)。

### 1.3 reforge 实现(glyph.ts + text-render.ts)

| 功能 | reforge | 对照 C | 状态 |
|---|---|---|---|
| 位解码 MSB-first | `decodeGlyph`(glyph.ts:19-36) `>> (7-(col%8))` | font.c:580 `>> (7-j)` | ✅ 同序 |
| 三层阴影 | `renderSpans`(text-render.ts:38-44) drawImage×3 @ (+1,0)/(0,+1)/(+1,+1) + 主色 | text.c:1152-1156 | ✅ **triple,color [0,0,0]** |
| 半宽/全宽 | Glyph.width 8/16 | font_width>>1 | ✅ |
| 字形缓存 | `bakeGlyph`(glyph.ts:69-87) 按 (cp,rgba) 缓存 canvas | (C 无,逐次 blit) | ✨ Canvas 优化,不影响外观 |
| 字形数据源 | 同一阶段 glyphs.json(glyph.ts:40-58 fetch 同路径) | wor16.fon BIG5 | ⚠️ 见下 |

**M.MSG 繁体 BIG5/PUA 残留核查**(审计重点):
- glyphs.json 实测 **57083 条**,codepoint 范围 `0x1 .. 0xFFFD`。
- **PUA(E000-F8FF / plane15):0 条** ✅ — 无私用区残留。
- **CJK Unified(4E00-9FFF):20992 条**,ASCII(<0x80):127 条。
- 源是 **Unifont CN BDF**(现代 Unicode 简体),**非原版 wor16.fon BIG5 繁体**。
- 结论:reforge 读的是**干净 glyphs.json**,无 BIG5/PUA 残留风险。但**字形外观与原版繁中有差异**(Unifont CN 简体 vs wor16.fon 繁体) — 这是**数据源选择差异**,非 bug,一阶段同样如此。

**font_offset_x/y 缺失**(reforge + 一阶段均无):
- C `PAL_DrawCharOnSurface` 用 `font_offset_x/y[wChar]`(font.c:551-552)做 BBX 偏移(自定义 BDF 才非 0)。
- 一阶段 blitGlyph / reforge decodeGlyph **均无 offset 应用**。
- 影响:仅自定义 BDF 字体(用户加载)有偏移;内嵌 Unifont CN glyphs 偏移恒 0,**对游戏字形零影响**。标 ⚠️ 但低风险。

### 1.4 W-font 产出

**缺口**:
1. `font_offset_x/y` 未移植(reforge + 一阶段)— 自定义 BDF 字体偏移丢失。**影响:无**(游戏用内嵌 Unifont,偏移恒 0)。
2. `palCharWidth` unicode 代理/PUA 裁剪未移植(一阶段)— 控制字符宽度近似。**影响:无**(游戏文案纯 CJK+ASCII)。
3. 字形数据源是 Unifont CN 简体,非原版 wor16.fon 繁体 — **外观差异**(设计选择,非 bug)。

**风险**:**低**。字体 blit 核心逻辑(位序、三层阴影、宽度推进)三方一致。

**行动**:无需立即修。若未来支持用户 BDF 字体,补 `font_offset_x/y`。

---

## 2. 单元 W-palette — 调色板

### 2.1 sdlpal C 真值(palette.c)

调色板来源 `pat.mkf`(palette.c:53),每色 6-bit `<< 2` 升 8-bit(palette.c:79-81)。`fNight` 选后半 256 色(palette.c:69-75)。

#### 六类 fade 函数

| 函数 | 行号 | 算法 | 步数 | 终值处理 |
|---|---|---|---|---|
| `PAL_FadeOut` | 122-190 | `pal[i]*j>>6`,j:60→0 | time-based 60 步 | 循环后 `memset 0` SetPalette(精确 0%) |
| `PAL_FadeIn` | 192-259 | `pal[i]*j>>6`,j:0→60(=60-j) | time-based 60 步 | 循环后 SetPalette(palette)(精确 100%) |
| `PAL_SceneFade` | 261-378 | `pal[j]*i>>6`,i:0→63(in)/63→0(out) | 64 步,**每步重绘 PAL_MakeScene** | **无循环后补满**(in 停 63/64≈98.4%) |
| `PAL_PaletteFade` | 380-459 | `lerp(cur,new,i/31)`=(cur*(31-i)+new*i)/31 | 32 步 | 自然到 target |
| `PAL_ColorFade` | 461-592 | approach ±4 朝 target/color | 64 步 | 循环后 SetPalette(palette 或 solid) |
| `PAL_FadeToRed` | 594-667 | approach ±8,`target=(r+g+b)/4+64, g=0,b=0` | 32 步 | 自然收敛;**skip idx 0x4F**(文字不染);**fb 像素 0x4F→0x4E HACK**(palette.c:623-629) |

**关键量化坑(L34)**:FadeOut/FadeIn j∈0..60 循环封顶 60/64=93.75%,SceneFade i∈0..63 封顶 63/64=98.4% — 精确 0%/100% 靠循环后 SetPalette 补。SceneFade-in **无补满** → 停 98.4%。

**FadeToRed 双重特殊**:
1. `skip idx 0x4F`(palette.c:637-640)— 文字色保原色不被染红。
2. fade 前 fb 像素 `0x4F→0x4E` 重映射(palette.c:623-629)— 场景里用 0x4F 的像素也染红。

### 2.2 一阶段实现(palette-fade.ts)

**逐 builder 对照**:

| C 函数 | 一阶段 builder | 忠重度 | 关键还原 |
|---|---|---|---|
| `PAL_FadeOut` | `buildFadeOut`(palette-fade.ts:117-133) | ✅ | `fade60:'out'`(j 60→0 量化 93.75%)+ `freeze:true`(PAL_FadeOut 不调 MakeScene → 冻屏淡黑)+ finalize 补精确 0% |
| `PAL_FadeIn` | `buildFadeIn`(palette-fade.ts:136-151) | ✅ | `fade60:'in'`(j 0→60)+ finalize 补精确 100% |
| `PAL_SceneFade` | `buildSceneFade`(palette-fade.ts:158-175) | ✅ | `fade63:'in'/'out'`(i 0..63);**fadeIn finalize 只补量化值 63/64,不到 100%**(palette-fade.ts:309-313)— 忠实 C 无补满 |
| `PAL_PaletteFade` | `buildPaletteFade`(palette-fade.ts:181-196) | ✅ | lerp 32 步 |
| `PAL_ColorFade` | `buildColorFade`(palette-fade.ts:203-220) | ✅ | approach ±4,64 步;fFrom 双向 |
| `PAL_FadeToRed` | `buildFadeToRed`(palette-fade.ts:227-249) | ✅ | approach ±8,32 步;`skipIndex:0x4F` + `remap:{0x4F→0x4E}` |

**核心引擎**:
- `stepPaletteFade`(palette-fade.ts:258-302):time-based(progress=elapsed/totalMs),lerp 线性插值 / approach `moveToward(±increment*floor(progress*steps))`。L34 量化分支(`fade60`/`fade63`)逐位复刻 C `>>6`。
- `finalizePaletteFade`(palette-fade.ts:305-318):补精确 target;SceneFade-in 特殊只补量化 63/64。
- `resolveNightColors`(palette-fade.ts:94-100):port `buf[(fNight?256*3:0)+i*3]`。

**palette-as-state(一阶段)**:
- `gs.palette.colors` 是**可变工作副本**(palette-fade.ts:321-325 `makeWorkingPalette`),fade 原地 ramp。
- UI 色(dialog-box.ts:40-48 `FONT_COLOR_*` = palette index 0x4F/0x2D/0x1A/0x8D/0x17)**绑场景 palette** → FadeToRed 时随 palette 染红(除 skip 的 0x4F)。
- 等键箭头闪烁 = palette[0xF9..0xFE] 左轮转(present.ts:733-745 `applyDialogIconPaletteShift`),port text.c:1408-1426。

**与 dither-fade 正交**:dither-fade.ts(mutate fb.indices,nibble blend,VIDEO_FadeScreen 0x9B)vs palette-fade.ts(mutate gs.palette.colors,RGB LUT)。注释明示(palette-fade.ts:4-7)。

#### git fix 史(一阶段 palette)
- `fec9a117` feat(effects A):**调色板淡入淡出引擎** — 0x50/0x51/0x4F/0x8C/0x80/0x93 全栈接入。
- `ac8612eb` feat(effects A):夜间调色板 game 侧接线 — 0x51/0x80/0x93 据 fNight 选夜色。
- `10ed54c5` fix(palette):**L34 FadeIn/Out 封顶 60/64(93.75%)逐位复刻 C**。
- `866c0ffc` fix(palette):**SceneFade 补 fade63 量化 i∈0..63 + fadeIn 不补满**(palette.c:307-378)。
- `a1fef8d6` fix(battle):补全战斗调色板 fade — 0x51/0x80/0x8C/0x93 战斗侧。

### 2.3 reforge 实现(palette-color.ts + main.ts)

**palette-color.ts(固定 RGBA)**:
- `DIALOG_RGBA`(palette-color.ts:4-10):5 色 fixed RGBA(default [199,186,174] / cyan / red / redAlt / yellow)— **原版 pal0 的 UI index 快照**。
- `TITLE_RGBA`(palette-color.ts:12):[101,203,170](原 0x8C)。
- `CURSOR_RGBA`(palette-color.ts:14-21):6 色 fixed(原 palette 0xF9-0xFE 快照)。
- `colorRgba`(palette-color.ts:24-26):DialogColor → 固定 RGBA 查表。

**main.ts fade(幕布式)**:
- `hostFade`(main.ts:439-448):dir(ms,color) → `fadeFx` + `fadeCurtain`。
- 渲染:RGBA alpha 幕布(`fadeBlack` 0→1,fadeCurtain 'black'|'red')。
- gameOver(main.ts:513-519):`hostFade('out', 900, 'red')` + dialog + loadLastSave。
- loadScene(main.ts:535-541):`hostFade('out', 260)` → switchScene → `hostFade('in', 260)`。

**逐 fade 对照**:

| C fade | reforge | 状态 | 差异 |
|---|---|---|---|
| FadeOut(0x50) | hostFade('out', ms, 'black') | ⚠️ | RGBA 幕布,非 palette ramp;无 freeze 语义(但 reforge 本就无 scene 重绘循环) |
| FadeIn(0x51) | hostFade('in', ms, 'black') | ⚠️ | 同上 |
| SceneFade(0x93) | (loadScene 内 hostFade) | ⚠️ | 无边淡边重绘 NPC 语义;无 fade63 量化 |
| PaletteFade(0x80) | hostFade('out'→'in') | ❌ | 无 palette-to-palette lerp(全黑中转) |
| ColorFade(0x8C) | (无) | ❌ | 缺失 |
| FadeToRed(0x4F) | hostFade('out', 900, 'red') | ❌ | **RGBA 红幕布,非 palette ramp**;无 skip 0x4F;无 fb 像素 0x4F→0x4E 重映射 |

**D15 全 RGBA 后的实现**:
- reforge 设计拍板(D15):全 RGBA,不再有 indexed palette 运行时。
- palette-color.ts 固定 RGBA = 原版 pal0 快照 → **解耦了场景 palette**(UI 色不再随场景调色板变)。
- 代价:FadeToRed 无法逐色 ramp(skip 0x4F 保文字色)— 只能整屏红幕布,文字也变红(除非 dialog 在 fade 后画,用固定 RGBA)。

**palette-as-state 解耦核查**(审计重点):
- 一阶段:UI 色绑 `gs.palette.colors[idx]`(palette-as-state)→ FadeToRed/夜间场景影响 UI 色。
- reforge:palette-color.ts 固定 RGBA → **UI 色与场景 palette 解耦**。
- ✅ 解耦成功(设计意图),但 ⚠️ 失去了 palette-fade 联动 UI 色的能力。

### 2.4 W-palette 产出

**缺口**:
1. ❌ PaletteFade(0x80)palette-to-palette lerp — reforge 全黑中转,失去平滑过渡。
2. ❌ ColorFade(0x8C)纯色淡变 — 完全缺失。
3. ❌ FadeToRed(0x4F)逐色 ramp + skip 0x4F + fb remap — reforge 红幕布,gameOver 文字可能被染红(取决于绘制序)。
4. ⚠️ SceneFade 无边淡边重绘 NPC 语义(一阶段 `waiting='scene-fade'` 放行 autoScript)。
5. ⚠️ FadeOut freeze 语义(冻屏淡黑 vs 重绘)— reforge 无 scene 重绘循环,等效但语义不同。

**风险**:**中高**。
- gameOver 红幕布 vs 真 FadeToRed:视觉差异(整屏红 vs 场景逐色染红 + 文字保色)。user 若对照 sdlpal 会察觉。
- ColorFade(0x8C)用于某些场景转换(纯色闪),缺失 = 静默跳过。

**行动**:
1. 高优先:FadeToRed 用 RGBA 逐色 ramp 等价模拟(场景 texture → 红色调 + 文字层后画保色),替代纯红幕布。
2. 中优先:ColorFade 补 RGBA 幕布(纯色 in/out)等价。
3. 低优先:PaletteFade 用 crossfade 两场景 texture 替代 palette lerp。

---

## 3. 单元 W-fx — 屏幕波纹 / 震屏

### 3.1 sdlpal C 真值

#### `PAL_ApplyWave`(scene.c:365-450)— 屏幕波纹

**32 相位偏移表**(scene.c:404-417):
```
a=0; b=60+8=68;
for i in 0..15:
    b -= 8;       // b: 60,52,44,...,8
    a += b;       // a: 60,112,156,192,220,240,252,252,244,228,204,172,132,84,28,-36
    wave[i]    = a * wScreenWave / 256;     // 整除截断
    wave[i+16] = 320 - wave[i];             // 镜像凑满 32 相位
```

**逐扫描线卷动**(scene.c:423-449):
- 200 行,每行相位 `a = (index + row) % 32`。
- 每行左移 `b = wave[a]` 像素:`memcpy(buf,p,b); memmove(p,&p[b],320-b); memcpy(&p[320-b],buf,b)`(scene.c:438-442)— 循环卷动(卷出的 b 像素接回行尾)。
- `index = (index+1) % 32`(scene.c:449)— 跨帧持久 static,波形向上滚动。

**波幅推进**(scene.c:389-398):
- 每帧 `wScreenWave += sWaveProgression`(SHORT 可负 → 渐强/渐弱)。
- `==0 || >=256` → 清零关闭。

**调用序**(scene.c:486):PAL_MakeScene 内,**画完两层地图、画 sprite 之前** → 只波动地图层,sprite 不受影响。

**触发**:
- script.c:2136 `gpGlobals->wScreenWave = operand[0]; sWaveProgression = operand[1]`(opcode 0x71)。
- battle.c:1563 战斗场景 `wScreenWave = BattleField.wScreenWave`(如水面战场)。
- ending.c:329 结局动画 `wScreenWave = 2`。

#### `VIDEO_ShakeScreen`(video.c:1030-1053 + 571-616)— 震屏

**设值**(video.c:1051-1052):仅写 static `g_wShakeTime` / `g_wShakeLevel`(非存档字段)。

**渲染**(video.c:571-616,VIDEO_UpdateScreen 内):
- `g_wShakeTime != 0` 时进 shake 分支。
- **纯垂直跳动**(无水平):
  - `srcrect.h = 200 - g_wShakeLevel`(源高裁掉 level 行)。
  - 奇帧(`g_wShakeTime & 1`):`srcrect.y = g_wShakeLevel`(源顶部裁 level 行)→ 整幅上移;屏底 level 行填黑。
  - 偶帧:`dstrect.y = g_wShakeLevel` → 整幅下移;屏顶 level 行填黑。
- 末尾 `g_wShakeTime--`(video.c:615)— 计数递减,到 0 停。

**触发**:
- script.c:1530 `VIDEO_ShakeScreen(operand[0], i)`(opcode 0x0035,time=operand[0],level=i 通常 4 或 3)。
- fight.c:2718/2942 战斗魔法震屏 `VIDEO_ShakeScreen(i, 3)`。

### 3.2 一阶段实现(screen-wave.ts + screen-shake.ts)

#### screen-wave.ts(`applyScreenWave`)
逐行对照 scene.c:365-450:

| C 逻辑 | 一阶段 | 行号 | 忠重度 |
|---|---|---|---|
| wScreenWave += sWaveProgression | `gs.wScreenWave += gs.sWaveProgression`(advance 时) | 35 | ✅ |
| ==0/>=256 清零 | 同 + advance 守卫 | 36-42 | ✅ |
| 32 相位表 a/b 递推 | `a=0,b=68; b-=8,a+=b; wave[i]=trunc(a*wScreenWave/256); wave[i+16]=320-wave[i]` | 47-54 | ✅ 整除截断同 C |
| 逐行卷动 memcpy/memmove/memcpy | `buf.set/subarray + indices.copyWithin + indices.set` | 57-69 | ✅ 左移 shift 卷回行尾 |
| index 跨帧持久 +1%32 | `s_waveIndex`(模块级)+ `resetScreenWavePhase`(测试) | 17,70 | ✅ |
| advance=false 不推进计数 | DM32 fade-only 补帧 | 31,37,70 | ✅ |

#### screen-shake.ts(`applyScreenShake`)
逐行对照 video.c:571-616:

| C 逻辑 | 一阶段 | 行号 | 忠重度 |
|---|---|---|---|
| srcrect.h = 200-level | `level>0 && level<200` 守卫 | 36 | ✅ |
| 奇帧 srcrect.y=level 上移 + 底填黑 | `indices.copyWithin(0, shift, end); indices.fill(0, end-level*W, end)` | 40-42 | ✅ |
| 偶帧 dstrect.y=level 下移 + 顶填黑 | `indices.copyWithin(shift, 0, end-shift); indices.fill(0, 0, shift)` | 45-48 | ✅ |
| g_wShakeTime-- | `if(advance) gs.shakeTime--` | 53 | ✅ 无论可见都递减 |

**1:1 化简说明**(screen-shake.ts:9-18):sdlpal 用 SDL_SoftStretch(srcrect→dstrect)做缩放 blit;一阶段 framebuffer 无缩放(1:1 320×200)→ 化简为 copyWithin + fill。**语义等价**。

#### 集成(present.ts)
- screen-wave:present.ts:294-296,step 2b(画完两层 tilemap + 接缝修复之后、sprite 之前)— **与 C scene.c:486 同序**。
- screen-shake:present.ts:683-684,渲染末尾(战斗走 presentBattleFrame 不经此)。
- gs 字段:game-state.ts:816-834 `sWaveProgression`/`shakeTime`/`shakeLevel`/`wScreenWave`,读档恒置 0(global.c:611 真值)。

#### git fix 史
- `8872b546` feat(effects B/C):屏幕波动 0x71 + RNG 动画。
- `c2122e33` feat(G9):ShakeScreen present 实接。
- `77b7ee4c` fix(画面):**fade-only 补帧不推进 wave/shake 计数器(DM32)**。

### 3.3 reforge 实现(搜索结果)

**屏幕波纹**:`grep -rn "wave|Wave|screenWave|wScreenWave" packages/reforge/src/` → **仅 battle/battle-anim.ts 的 magic `wWave` 字段(法术数据,非屏幕特效)**。render-scene.ts / render.ts / main.ts **无 applyScreenWave**。

**震屏**:`grep -rn "shake|Shake" packages/reforge/src/` → **仅 battle/battle-session.ts:620 `shake: a.shake ?? 0` + battle-anim.ts 的法术 shake 帧计数(法术演出时长计算,非屏幕垂直跳动)**。**无 applyScreenShake 渲染逻辑**。

**render-scene.ts**(render-scene.ts:29-41):`clear → save → scale → renderScene → restore`,**无 wave/shake 步骤**。

**script-runner.ts**(script-runner.ts:214-215):host 仅 `fade` 命令,**无 wave/shake 命令**。content/script.ts:30 fade schema 也仅 fade。

| C 特效 | reforge | 状态 |
|---|---|---|
| PAL_ApplyWave(0x71) | (无) | ❌ 缺失 |
| VIDEO_ShakeScreen(0x0035) | (无) | ❌ 缺失 |
| 战斗 wScreenWave(水面战场) | (无) | ❌ 缺失 |
| 战斗魔法震屏 | battle-anim.ts shake 帧计数(时长用,非渲染) | ❌ 无渲染 |

### 3.4 W-fx 产出

**缺口**:
1. ❌ 屏幕波纹(0x71)完全缺失 — 水面战场、热浪场景、结局动画的波纹效果全无。
2. ❌ 震屏(0x0035)完全缺失 — 法术震屏、剧情震屏全无。
3. ❌ 战斗水面波纹缺失。

**风险**:**高**。
- 波纹是 PAL 标志性氛围效果(水面、热浪),缺失 = 明显视觉退化。
- 震屏是法术冲击感核心,缺失 = 战斗打击感下降。
- 这些是**像素级逐扫描线特效**,RGBA/Canvas 重写需在 render-scene 加逐行偏移步骤(非简单幕布)。

**行动**:
1. **高优先**:在 reforge render-scene.ts 加 `applyScreenWave` 等价(逐行 drawImage 偏移 或 ImageData 行卷动)。需先在 content/script.ts 加 `wave` 命令 + script-runner host 接线。
2. **高优先**:在 reforge render-scene.ts 加 `applyScreenShake` 等价(ctx.translate 垂直偏移 + 黑条 fillRect)。content/script.ts 加 `shake` 命令。
3. 参考 screen-wave.ts / screen-shake.ts 的相位表与奇偶帧逻辑(可直接 port,Uint8Array→ImageData 适配)。

---

## 4. 跨单元总结

### 4.1 一阶段忠重度评估
**全单元逐位忠实** C 真值。palette-fade 六类 + L34 量化 + FadeOut freeze + FadeToRed skip/remap + wave 32 相位 + shake 奇偶帧,全部精确 port。git fix 史显示多次「user 怼截图 + sdlpal 真值对照」迭代收敛。**可直接作为 reforge port 的参考实现**。

### 4.2 reforge 忠重度评估

| 单元 | 状态 | 说明 |
|---|---|---|
| W-font blit + 三层阴影 | ✅ | 位序/阴影/宽度全对;数据源换 Unifont CN(设计选择) |
| W-font glyphs.json 洁净 | ✅ | 0 PUA,纯 Unicode,无 BIG5 残留 |
| W-palette 六类 fade | ❌ | 仅 fade-in/out 幕布;PaletteFade/ColorFade/FadeToRed 缺失或降级 |
| W-palette UI 色解耦 | ✅⚠️ | 解耦成功(设计意图),失 palette-fade 联动 |
| W-fx 波纹 | ❌ | 完全缺失 |
| W-fx 震屏 | ❌ | 完全缺失 |

### 4.3 reforge 行动优先级

| 优先 | 项 | 工作量 | 参考一阶段文件 |
|---|---|---|---|
| P0 | 屏幕波纹(0x71)+ 震屏(0x0035)render-scene 接线 | 中(ImageData 逐行偏移) | screen-wave.ts / screen-shake.ts |
| P0 | FadeToRed RGBA 等价(场景染红 + 文字保色) | 中 | palette-fade.ts:227-249 + present.ts:215-221 remap 逻辑 |
| P1 | ColorFade(0x8C)RGBA 幕布等价 | 小 | palette-fade.ts:203-220 |
| P1 | PaletteFade(0x80)crossfade 两场景 | 中 | palette-fade.ts:181-196 |
| P2 | SceneFade 边淡边重绘 NPC 语义 | 中(需 autoScript 协调) | palette-fade.ts:158-175 + present.ts waiting |

### 4.4 免疫项(✨ 无需移植)
- `font_offset_x/y`:自定义 BDF 偏移,游戏用内嵌字形恒 0。
- `palCharWidth` unicode 代理/PUA 裁剪:游戏文案纯 CJK+ASCII。
- `wor16.fon` BIG5 加载:数据源已换 Unifont CN。
- 字形缓存(`bakeGlyph` canvas 缓存):Canvas 优化,C 逐次 blit 无此概念。

---

## 附录 A — 三方文件映射

| 单元 | sdlpal C | 一阶段 | reforge |
|---|---|---|---|
| 字形 blit | reference/sdlpal/font.c:521-608 | packages/game/src/present/font.ts:73-90 | packages/reforge/src/text/glyph.ts:19-36 |
| 字形加载 | reference/sdlpal/font.c:103-198 | packages/pal-extract/src/font/bdf-to-json.ts | packages/reforge/src/text/glyph.ts:40-58 |
| 文字 blit + 三层阴影 | reference/sdlpal/text.c:1087-1185 | packages/game/src/present/font.ts:105-165 | packages/reforge/src/text/text-render.ts:20-51 |
| 字宽 | reference/sdlpal/font.c:611-629 | packages/game/src/present/font.ts:196-209 | packages/reforge/src/text/text-render.ts:54-62(measureSpans) |
| 调色板 fade 六类 | reference/sdlpal/palette.c:122-667 | packages/game/src/core/palette-fade.ts | packages/reforge/src/main.ts:439-448(hostFade) |
| 调色板来源 | reference/sdlpal/palette.c:24-90 | packages/game/src/present/present.ts(palette-as-state) | packages/reforge/src/text/palette-color.ts(固定 RGBA) |
| UI 色 | reference/sdlpal/text.c:29-34 | packages/game/src/present/dialog-box.ts:40-48 | packages/reforge/src/text/palette-color.ts:4-12 |
| 屏幕波纹 | reference/sdlpal/scene.c:365-450 | packages/game/src/present/screen-wave.ts | (无) |
| 震屏 | reference/sdlpal/video.c:571-616,1030-1053 | packages/game/src/present/screen-shake.ts | (无) |

## 附录 B — 关键 git fix 提交(一阶段)

- `9e73f068` menu text triple shadow(sdlpal ui.c:458 真值)
- `10ed54c5` L34 FadeIn/Out 封顶 60/64 逐位复刻
- `866c0ffc` SceneFade fade63 量化 + fadeIn 不补满
- `77b7ee4c` fade-only 补帧不推进 wave/shake 计数(DM32)
- `a1fef8d6` 战斗调色板 fade 补全
- `fec9a117` 调色板淡入淡出引擎初版(六类全栈)
