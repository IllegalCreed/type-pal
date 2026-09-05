# 对话/文本系统 三方逐函数审计(对话框渲染 / 控制符解析 / 文本数据)

| 字段 | 值 |
|---|---|
| 审计日期 | 2026-07-05 |
| HEAD commit | `282c1fab1deb101a397617e70282460e85cdc290`(`audit(phase2): 第一批渲染地基 6 单元逐函数对照`) |
| sdlpal C 真值 | `reference/sdlpal/text.c`(2569 行)/ `res.c` — 与 HEAD 同 commit(monorepo,非 submodule) |
| 一阶段 .ts | `packages/game/src/present/dialog-box.ts`(909 行)/ `pal-extract/src/utils/gbk.ts` / `io/word.ts` / `io/msg.ts` |
| reforge .ts | `packages/reforge/src/dialog/{dialog-box.ts(307),slot.ts(39),layout.ts(87)}` / `content/src/{rich-text.ts(24),index.ts(161)}` / `reforge/src/text/{typewriter.ts,palette-color.ts}` |
| 审计单元 | 3(对话框渲染 / 控制符解析 / 文本数据 WORD+M.MSG) |
| 方法 | sdlpal C 真值语义 → 一阶段逐函数对照(含 git log 踩坑)→ reforge 逐函数对照(✅/⚠️/❌/✨)→ 缺口 + 风险 + 行动 |

> 全文行号锚点都基于上述 commit。判断必有 `文件:行`。
> 状态图例:✅ 对齐 / ⚠️ 部分对齐或语义偏差 / ❌ 缺失 / ✨ 主动超越 sdlpal。

---

## 审计单元 1:对话框渲染

sdlpal 真值锚点:`text.c:1207-1817`(`PAL_StartDialogWithOffset` / `PAL_ShowDialogText` / `PAL_DialogWaitForKeyWithMaximumSeconds` / `PAL_ClearDialog` / `PAL_EndDialog`)。

### 1.1 sdlpal C 真值(`reference/sdlpal/text.c`)

#### 五分支 `bDialogLocation`(text.c:1277-1347)
枚举定义见 `text.h`:`kDialogUpper=0 / kDialogCenter / kDialogLower / kDialogCenterWindow`。**注意:sdlpal 只有 4 个枚举值**;「item-box 紫金葫芦炼丹」走 `kDialogCenterWindow + yOff=-10 + iDialogShadow=5`(script.c:1479-1513),不是独立枚举。本审计沿用一阶段/reforge 的「5 style」口径,但**真值根是 4 枚举 + offset**。

| 分支 | posDialogTitle | posDialogText | 立绘位置 | 是否画 box | 等键箭头 |
|---|---|---|---|---|---|
| `kDialogUpper`(top) | `(face>0?80:12, 8)` | `(face>0?96:44, 26)` | `(48-w/2, 55-h/2)`(text.c:1289) | 否(透明 typing) | ✅ 画 |
| `kDialogCenter`(center) | default `(12,8)`(不重设,title 一般不画) | `(80, 40)`(text.c:1321) | 无 | 否 | **❌ 不画**(text.c:1385-1386 / 1412-1413 双重守卫) |
| `kDialogLower`(bottom) | `(face>0?4:12, 108)` | `(face>0?20:44, 126)` | `(270-w/2, 144-h/2)`(text.c:1332-1333) | 否 | ✅ 画 |
| `kDialogCenterWindow`(narration) | — | `(160, 40)`(text.c:1345) | 无 | **✅ SingleLineBox**(text.c:1687) | **❌ 不画**(text.c:1385);且 1.4s 自动关(text.c:1701) |
| (item-box 炼丹) | — | `(160, 30)`(=CenterWindow+yOff-10) | 无 | **✅ ITEMBOX 精灵 + 每行 SingleLineBox shadow=5** | ❌ 不画(CenterWindow 守卫) |

- **xOff/yOff 偏移**(text.c:1349-1350):`posDialogTitle` 与 `posDialogText` 在 switch 后**统一**加 xOff/yOff(物品框靠此落到 y=30)。
- **战斗特例**(text.c:1251-1258):`gpGlobals->fInBattle && !g_fUpdatedInBattle` → 先 `VIDEO_UpdateScreen(NULL)`(避免战斗中画面花)。

#### `PAL_ShowDialogText`(text.c:1616-1749)— **核心状态机**
1. **翻页触发**(text.c:1649-1658):`nCurrentDialogLine > 3`(即已画第 4 行,来第 5 行)→ `PAL_DialogWaitForKey()`(等键)→ `nCurrentDialogLine = 0` → `VIDEO_RestoreScreen`(restore 到含 title、无 body 的 backup)→ `VIDEO_UpdateScreen`。
2. **行 y 坐标**(text.c:1661):`y = posDialogText.y + nCurrentDialogLine * 18`。**LINE_HEIGHT=18**。
3. **CenterWindow 分支**(text.c:1663-1710):
   - 战斗中 → `PAL_BattleUIShowText(text, 1400)`(1.4s 战斗飘字,独立系统)。
   - 非战斗 → 测宽 `len = Σ CharWidth(ch)>>3`(半角 1 / 全角 2)→ `pos = (160 - len*4, 40)` → `PAL_CreateSingleLineBoxWithShadow(pos, (len+1)/2, FALSE, iDialogShadow)` → 画文字 `TEXT_DisplayText(..., isDialog=TRUE)` → `PAL_DialogWaitForKeyWithMaximumSeconds(1.4)`(1.4s 自动关)→ `PAL_DeleteBox` → `PAL_EndDialog`。
4. **姓名牌判定**(text.c:1715-1726)— **三条件 AND**:
   - `nCurrentDialogLine == 0`(首行)
   - `bDialogPosition != kDialogCenter`(非居中)
   - 末字 ∈ {`0xff1a`(全角：), `0x2236`(∶), `0x3a`(:)}
   - 命中 → `PAL_DrawText(text, posDialogTitle, FONT_COLOR_CYAN_ALT=0x8C, fShadow=TRUE, fUpdate=TRUE, 8x8=FALSE)`,**不计入 nCurrentDialogLine**(title 不 ++)。
5. **首行备份**(text.c:1729-1735):`!fPlayingRNG && nCurrentDialogLine==0` → `VIDEO_BackupScreen`(供翻页 restore)。
6. **正文路径**(text.c:1737):`x = TEXT_DisplayText(text, x, y, isDialog=FALSE)` → `posIcon = PAL_XY(x, y)`(等键图标位置 = 本行末尾)→ `nCurrentDialogLine++`。

#### `TEXT_DisplayText`(text.c:1458-1613)— **打字 + 控制符 state machine**(详见单元 2)
- **打字延时**(text.c:1600):每字后 `UTIL_Delay(g_TextLib.iDelayTime * 8)`。`iDelayTime` 默认 3(text.c:885)= **24ms/字**。
- **fUserSkip 跨行连锁**(text.c:1597-1608):打字中按 Search/Menu → `fUserSkip=TRUE`,**同段后续行不再 delay**(`!isDialog && !fUserSkip` 守卫),直到翻页/`~`/新对话复位。
- **`~NN` 尾停顿**(text.c:1542-1554):`fUserSkip` 时先 `VIDEO_UpdateScreen(NULL)`;`UTIL_Delay(NN*80/7)`(**不可加速**——delay 是同步阻塞,玩家按键只穿透进 dwKeyPress,不重置);`nCurrentDialogLine = -1` → 回 `PAL_ShowDialogText` 后 `++` → **0**(行计数复位,致其后 ClearDialog 见 0 行 → 不等键、不画箭头);`fUserSkip = FALSE`;`return x`(本行止)。

#### `PAL_DialogWaitForKeyWithMaximumSeconds`(text.c:1355-1448)
- **图标守卫**(text.c:1385-1386):`if (bDialogPosition != kDialogCenterWindow && != kDialogCenter)` 才画 `bufDialogIcons[bIcon]`(bIcon:0默认 / 1 `)` / 2 `(`)。
- **0xF9-0xFE palette 轮转**(text.c:1412-1426):同样受上述守卫;每 100ms 把 palette[0xF9..0xFE] 循环左移 1 → 黄色箭头「闪烁」。
- **等键循环**(text.c:1408-1437):`UTIL_Delay(100)` 轮询;`fMaxSeconds>0 && GetTicks-begin > 1000*fMax` 超时 break;`dwKeyPress != 0` break。
- **复位**(text.c:1442-1447):非 center/window → `PAL_SetPalette` 还原;`PAL_ClearKeyState`;`fUserSkip = FALSE`。

#### `PAL_ClearDialog` / `PAL_EndDialog`(text.c:1751-1817)
- `PAL_ClearDialog(fWaitForKey)`:`nCurrentDialogLine > 0 && fWaitForKey` → 等键;然后 `nCurrentDialogLine = 0`;**仅 `kDialogCenter` 重置 bCurrentFontColor + posDialog + 回 kDialogUpper**(text.c:1777-1783)——**普通翻页(upper/lower)色态跨页持续**。
- `PAL_EndDialog`:`ClearDialog(TRUE)` + 全部默认值复位(含 `fUserSkip=FALSE`、`fPlayingRNG=FALSE`)。

#### 立绘残留陷阱(text.c:1280-1315 / 1325-1339)
立绘在 `PAL_StartDialogWithOffset` 内 `PAL_RLEBlitToSurface` **直接画到 gpScreen**(不是持久态字段)。`posDialogText/posDialogTitle` 是**独立持久 metric**(`g_TextLib` 字段)。后果:0x05 `PAL_MakeScene` 重画场景擦掉立绘,但缩进位置仍在 → 其后**无 PAL_StartDialog** 的 showDialog 文本缩进但无图(扬州师爷「大人息怒」复用太守头像位置 bug)。

---

### 1.2 一阶段实现(`packages/game/src/present/dialog-box.ts`)

#### 五分支 style(dialog-box.ts:157-189 `getDialogTextPos` / `getDialogTitlePos`)
- ✅ **top / bottom 位置完全对齐** text.c:1316/1321/1340/1345(含 `hasPortrait ? 96:44` 三元)。
- ✅ **center** `(80,40)`(ts:162)对齐 text.c:1321。
- ✅ **narration** 复用 bottom pos(ts:164-165 `hasPortrait?20:44, 126`)—— ⚠️ **此处是占位**:narration 实际渲染走 `drawNarrationDialog`(ts:772-839)用硬编码 `(160,40)`,与此函数返回值无关。函数注释(ts:167)已说明。
- ✅ **item-box** `(160,30)`(ts:167)对齐 text.c:1345+1350(CenterWindow+yOff-10)。

#### 姓名牌三条件(dialog-box.ts:194-207)
- ✅ **`isCharacterNameLine`**(ts:194-198):末字 `0xff1a / 0x2236 / 0x3a`,完全对齐 text.c:1717-1719。
- ✅ **`shouldRenderAsTitle`**(ts:205-207):`dialogLineCount===0 && style!=='center' && isCharacterNameLine` —— 三条件 AND,对齐 text.c:1715。
- **git 踩坑**(commit `88e176f6` 「姓名牌判定补全三条件」):原先只判末字冒号 → 段中续行冒号句被误当姓名牌(从正文丢失)+ center 独白被错画左上角姓名牌。M1/L1(2026-06-07 审查)补全。

#### 立绘残留修复(dialog-box.ts:641-645 / 268-269)
- ✅ **`portraitLayout` 字段**(ts:268-269):与 `portraitIcon` 解耦。缩进由 `portraitLayout` 决定,缺省回退 `portraitIcon!==undefined`。
- ✅ **渲染读 `state.portraitLayout ?? state.portraitIcon`**(ts:645):0x05 重画擦掉立绘后,`portraitLayout` 仍 true → 文本继续缩进。对齐「posDialogText 是持久 metric」真值。
- **git 踩坑**(commit `850411d3` 「立绘图与缩进布局解耦」):修扬州师爷「大人息怒」。

#### 打字 wall-clock(dialog-box.ts:466-497 `tickDialog`)
- ✅ **wall-clock 优先**(ts:474-476):`elapsed = now - lineStartMs`;缺省 now 回退 `typingFrames * FRAME_MS_EXPLORE`(100ms/tick 旧行为,兼容旧测试)。
- ✅ **revealAt 驱动**(ts:478):`while (revealAt[shown] <= elapsed) shown++`。
- **git 踩坑**(commit `bdf68787` 「打字改 wall-clock」):Bug1 —— 旧实现 100ms/tick 把 24ms/字打成「每 100ms 蹦 4 字成块」。

#### `~NN` 尾停顿不可加速 + fUserSkip 跨行(dialog-box.ts:512-562 `confirmDialog`)
- ✅ **Bug3-2**(ts:518-520):`~` 行字已全显后再按 Confirm → `'noop'`。注释引 text.c:1551 同步 delay 不可重置。
- ✅ **wall-clock 对齐**(ts:533-534):跳字后 `lineStartMs = now - lastReveal` → 后续 elapsed 只走 ~NN 尾停顿。
- ✅ **fUserSkip 跨行**(ts:362-368 `appendDialogLine`):`state.userSkip` → 续行 `charsRevealed = text.length`(整行瞬显);`~` 收尾 `userSkip=false`(ts:367,对齐 text.c:1553)。
- ✅ **翻页复位**(ts:555):`page-advance` 后 `userSkip=false`(对齐 text.c:1447)。
- **git 踩坑**(commit `098b4057` Bug2「按一下全显」+ Bug3「~NN 尾停顿瞬显」;`eac911c1` L2 fUserSkip 跨行;`5d383b61` DL18 ~ 行跳字保留尾停顿)。

#### 等键图标 + 0xF9-0xFE 闪烁(dialog-box.ts:701-708 `shouldShowKeyIcon`)
- ✅ **center 排除**(ts:706):`style === 'center' → false`。对齐 text.c:1385-1386。
- ✅ **narration 排除**:narration 在 `drawDialogBox` 入口 short-circuit(ts:625-628 走 `drawNarrationDialog`),不到 `shouldShowKeyIcon`。
- ✅ **仅 waiting-page-key / waiting-end-key 显示**(ts:707):line-done(行间自动推进)不显。注释 ts:698-699 说明对齐 text.c(等键只在 page-break text.c:1654 + dialog 结束 text.c:1772)。
- ✅ **bIcon 帧选择**(ts:682):`iconFrames.get(state.iconKind ?? 0)`,iconKind 来自 parseDialogText 的 `)`(1)/`(`(2)。对齐 text.c:1391。
- ✅ **posIcon = 本行末尾**(ts:691-692):`iconX = basePos.x + measureText(lastLineText)`。对齐 text.c:1745 `posIcon = PAL_XY(x, y)`(x 是 TEXT_DisplayText 返回值)。
- ✅ **0xF9-0xFE palette 轮转**:注释 ts:495-496 / 677-678 说明已移到 present 层(palette 轮转,非 show/hide)。Ⓜ️ **需核实 present.ts 是否真做了轮转**(本审计范围外,标 待核实)。

#### narration CenterWindow(dialog-box.ts:772-839 `drawNarrationDialog`)
- ✅ **posDialogText (160,40)**(ts:792-793)对齐 text.c:1345。
- ✅ **len = Σ CharWidth>>3**(ts:786-789):`cp<0x80?1:2`。对齐 text.c:1681。
- ✅ **boxX = 160 - len*4**(ts:794)对齐 text.c:1685。
- ✅ **SingleLineBox**(ts:800-806):`len=(len+1)/2`,**shadowOffset=0**(ts:805)。
- ✅ **文字 pos**(ts:810-811):`boxX+8+((len&1)<<2), boxY+10`。对齐 text.c:1698。
- ✅ **数字字符走 PAL_DrawNumber sprite**(ts:824-828):`ch>='0'&&<='9'` → `drawNumber(fb, digit, 1, {x,y+4}, 'yellow', 'left')`,`cursorX+=8`。
- ✅ **isDialog DEFAULT→color 0**(ts:833):`colors?.[ci] ?? 0`;`renderText(..., fShadow=false)`(ts:834)。对齐 text.c:1581-1582 / 1594。
- ✅ **shadowOffset=0 修复**(commit `8a4e50b2` 「narration 框去多余阴影」):原默认 6px 投影与原版不符。
- ✅ **数字步进 PAL_CharWidth=8 修复**(commit `7f543c00` L33):`cursorX+=8`(font_width>>1),digit sprite 6px 留 2px 间隙。
- ❌ **1.4s 自动关闭未在此层实现**:narration 的 1.4s(`PAL_DialogWaitForKeyWithMaximumSeconds(1.4)`)在 sdlpal 是 `PAL_ShowDialogText` 内同步等待(dialog-box.ts 注释 ts:760 提及)。一阶段把等待推给 **event-system**(调用方负责 `setWaitingEndKey` + 计时),本文件不含。Ⓜ️ **需核实 event-system 是否真做了 1.4s 超时**(标 待核实,非本审计单元范围)。

#### item-box 紫金葫芦炼丹(dialog-box.ts:841-909 `drawItemBoxDialog` / `drawItemBoxLine`)
- ✅ **ITEMBOX 居中**(ts:869-870):`(320-w)/2, (200-h)/2`。对齐 script.c:1485。
- ✅ **物品图标@(bx+8, by+7)**(ts:874)对齐 script.c:1507。
- ✅ **2 行各 SingleLineBox shadow=5**(ts:878-879 / 903):line1@y=30, line2@y=48(30+18)。对齐 text.c:1661 行距。
- ✅ **boxX = 160 - len*4**(ts:895)对齐 text.c:1685。
- ✅ **iDialogShadow=5**(ts:903)对齐 script.c:1479。
- **git**:commit `fb5c3f81` feat(L1)。

---

### 1.3 reforge 实现(`packages/reforge/src/dialog/dialog-box.ts` + `slot.ts` + `layout.ts`)

reforge 采用**完全不同的架构**:数据驱动 `DialogueLine[]`(content/src/index.ts:44-59 结构化字段)+ slot 共存模型(top/bottom 两槽留显)+ 运行时自动折行(layout.ts)。**不移植 sdlpal 的「累计 4 行翻页 + RestoreScreen」机制**,改为「每段话独立分页 + slot 留显」。

#### slot 模型(slot.ts:1-39)
- ✅ **top/bottom 两槽**(ts:11 `SlotId = 'top'|'bottom'|'narration'`)。
- ✅ **同槽覆盖 / 异槽共存**(ts:32-39 `advanceSlots`):`{...state, [slot]:{lineIdx}, activeSlot: slot}`。
- ⚠️ **narration slot 仅在 SlotState 有定义,渲染层不画**(见下)。

#### 五分支 style — **reforge 只有 3 个 POS**(dialog-box.ts:17-43)
- ✅ **bottom**(ts:21-27):text/title/textWithPortrait/titleWithPortrait/portrait 全套,数值对齐 text.c。
- ✅ **top**(ts:28-34):同上,数值对齐 text.c:1316。
- ⚠️ **narration**(ts:36-42):`text:(60,88) / title:(60,72) / portrait:(-100,-100)`。
  - ❌ **数值与 sdlpal text.c:1345 `(160,40)` 完全不符**。sdlpal narration 是**屏幕水平居中**(x=160)的 SingleLineBox;reforge 给的是 `(60,88)` 偏左下。
  - ❌ **narration slot 从不被渲染**:render 循环(dialog-box.ts:204)`for (const slotId of ['bottom','top'])` **只画 bottom/top**,narration slot 即使 `advanceSlots` 设了 activeSlot 也画不出来。
  - 实测路径(main.ts:516-517):`gameOver` 用 `host.dialog({slot:'narration'})` → `dialogBox.open`(main.ts:461-463)→ `slots.activeSlot='narration'` → `render()` 不画 → **gameover 文字不可见**。这是 **🔴 高危缺口**。
- ❌ **center(kDialogCenter)完全缺失**:无 `'center'` POS。sdlpal text.c:1321 `posDialogText=(80,40)` + text.c:1385 不画箭头的分支,reforge 无对应。`DialogueLine.slot` 类型(content/index.ts:54)`'top'|'bottom'|'narration'` 也不含 `'center'`。
- ❌ **item-box(紫金葫芦炼丹)完全缺失**:无 `'item-box'` style。`DialogueLine` 无 itemBox 字段。sdlpal script.c:1479-1513 的炼丹框(L1 已实现)reforge 未移植。

#### 姓名牌 — **数据驱动 speaker 字段**(dialog-box.ts:236-243)
- ✅ **speaker 字段消除末字冒号误判**(content/index.ts:46 `speaker?: TextId`):内容层显式标注说话人,不靠「末字冒号」启发式。✨ **超越 sdlpal**(sdlpal text.c:1715 启发式有段中续行冒号误判风险)。
- ✅ **渲染**(ts:236-243):`line.speaker` 存在 → `renderSpans(nameSpans=[{text: lookupText(speaker)+'：'}], titleX, title.y, {forceRgba: TITLE_RGBA, shadow:true})`。
- ✅ **TITLE_RGBA = 原 0x8C**(palette-color.ts:12 `[101,203,170]`)对齐 text.c:1725 FONT_COLOR_CYAN_ALT。
- ⚠️ **姓名牌「同段跨页常驻」**:注释 ts:235 说「该 slot 当前段话首行的 speaker(同段跨页常驻)」,但代码 ts:236 用 `page[0]`(当前页首行)的 `line.speaker`,**不是 srcLineIdx 首行**。若一段话折成多页,第 2 页 `page[0]` 的 srcLineIdx 仍是同一段(isLineStart 仅首显示行 true,但 speaker 取的是 line 对象非 isLineStart 判定)—— 实际因 `layoutLineInto` 每次只排一段话(ts:91 `[line]` 单元素),page 内所有 displayLine 的 srcLineIdx 都指向同一段,`page[0]` 取到的 line 正确。⚠️ **逻辑正确但脆弱**(依赖 layoutLineInto 单段输入不变式,无显式断言)。

#### 打字 wall-clock(dialog-box.ts:247-265 + typewriter.ts)
- ✅ **wall-clock 驱动**(ts:247):`elapsed = nowMs - this.lineStartMs`;nowMs 来自 main.ts:1489 `performance.now()`(非 tick)。✅ 对齐 Bug1 修复。
- ✅ **DEFAULT_SPEED_MS=24**(typewriter.ts:5):注释「iDelayTime=3 × 8」。✅ 对齐 text.c:885/1600。
- ✅ **逐显示行串行打字**(ts:248-263):`charsBefore` 累加前序行字符数,`limit = charsShown(elapsed - charsBefore*speed, speed)`。即第 N 行的打字起点 = 前 N-1 行总字数 × speed。✨ **超越 sdlpal**:sdlpal 每行独立 `TEXT_DisplayText`(行间无串行,但行间也无 delay——同段连续行是逐行画的,等价串行)。reforge 的串行模型视觉等价。
- ✅ **charsShown = ⌊elapsed/speed⌋**(typewriter.ts:8-9):恒速,无 $NN 变速支持(见下)。

#### $NN 变速 / ~NN 尾停顿 — **数据驱动 speed/autoAdvance 字段**
- ✅ **speed 字段**(content/index.ts:50 `speed?: number` ms/字):「原版 $NN」。渲染 ts:246 `line.speed ?? DEFAULT_SPEED_MS`。
- ✅ **autoAdvance 字段**(content/index.ts:52 `autoAdvance?: number` ms):「原版 ~NN 尾停顿 + 自动推进」。`update()`(ts:184-198)计 `doneAt = totalChars*speed + auto`,到点 `advanceToNextLine`。
- ✅ **~NN 尾停顿不可加速**(ts:138):`if (this.activeAutoAdvance() !== undefined) return` —— 翻完 + 有 autoAdvance 时按 space = noop,必须等 update。注释引 spec §Bug3。✅ 对齐 text.c:1551。
- ⚠️ **$NN 跨行持续态缺失**:sdlpal `g_TextLib.iDelayTime` 是**脚本级全局**(text.c:885/1204/1538),`$NN` 写入后跨 ClearDialog+StartDialog 持续到脚本结束(一阶段 dialog-box.ts:273-276 / 357 注释明确)。reforge `speed` 是**单段字段**(每段 DialogueLine 独立),无跨段持续语义。**迁移器须把 sdlpal「$NN 后续所有行」展开成每段 DialogueLine 的 speed 字段**,否则变速只作用单段。Ⓜ️ 中风险(迁移器责任,引擎语义不保真但不崩)。
- ⚠️ **~NN 行计数复位语义缺失**:sdlpal text.c:1552 `~` 收尾 `nCurrentDialogLine=-1→++→0`,致其后 ClearDialog 见 0 行不等键、不画箭头(开场梦境三句均 ~NN 收尾,原版无结尾光标)。reforge autoAdvance 是「过尾停顿自动推进下一段」,不等价「复位行计数使整段末不等键」。**但**:reforge 整段结束本就走 `advanceToNextLine`→ 下一段或 close,不依赖「行计数复位」这一 sdlpal 实现细节。✅ 语义等价(不同实现路径达成同效果),前提是**每段 ~NN 收尾的台词在内容数据里标了 autoAdvance**。

#### fUserSkip 跨行连锁(dialog-box.ts:121-140 `advance`)
- ✅ **两段式 pageDone**(ts:58 / 121-126):未全显按 space → `pageDone=true`(瞬显该页);全显按 space → 翻页/推进。
- ⚠️ **fUserSkip 跨「段」不跨「行」**:sdlpal text.c:1597 fUserSkip 置位后**同段后续行瞬显**(直到翻页/~/新对话)。reforge 的 pageDone 是**页级**(ts:58 「活跃槽当前页是否已全显」),翻页后 ts:133 `pageDone=false` 重新逐字 —— 对齐 sdlpal「翻页复位 fUserSkip」(text.c:1447)。✅ 但 reforge **段内多页**:第 2 页会重新逐字(sdlpal 同段翻页也复位),✅ 对齐。
- ✅ **autoAdvance 段不响应 space**(ts:138):见上。

#### 等键光标 + 0xF9-0xFE 闪烁(dialog-box.ts:282-306 `drawCursor` / `bakeCursorStep`)
- ✅ **光标位置 = 末显示行末尾**(ts:294-295):`cursorX = text.x + measureSpans(lastSpans)`;`cursorY = text.y + lastRowIdx*LINE_HEIGHT`。✅ 对齐 text.c:1745 posIcon。
- ✅ **cursorFrame 选择**(ts:289):`this.cursorFrames[frameIdx ?? 0]`;frameIdx 来自 `line.cursorFrame`(content/index.ts:58,原版 `(`/`)`)。✅ 对齐 text.c:1391 bIcon。
- ✅ **0xF9-0xFE 6 色轮转**(palette-color.ts:14-21 `CURSOR_RGBA` 6 色)+ ts:291 `Math.floor(nowMs/100) % CURSOR_COLOR_COUNT`。✅ 对齐 text.c:1419 每 100ms 轮转。
- ✅ **bake 缓存**(ts:292-305):`frameIdx*6+step` 唯一 key,预烘焙避免每帧 tint。✨ 性能优化。
- ⚠️ **center 不画光标守卫缺失**:sdlpal text.c:1385 center/window 都不画箭头。reforge 光标显示条件(ts:271)`isActive && pageDone && autoAdvance===undefined` —— **未排除 center slot**。但因 reforge 无 center slot 实现(slot 类型不含 center),实际不会触发。Ⓜ️ 若将来加 center slot,须补 `slotId !== 'center'` 守卫。
- ⚠️ **narration 不画光标**:narration slot 不被 render 循环画(ts:204),自然不画光标。✅ 副作用正确(但 narration 整个不渲染是更大问题)。

#### 立绘残留 — **reforge 无此问题**(架构免疫)
- reforge 立绘是 `line.portrait`(content/index.ts:56 结构化字段),渲染时从 `this.portraits.get(line.portrait.icon)` 取(dialog-box.ts:225),**每帧重新画**。无 sdlpal「立绘 blit 到 gpScreen 后被 0x05 擦掉」的副作用。
- ✅ **line-bound 免疫**:立绘绑定到 DialogueLine,不依赖「StartDialog 时画一次」。✨ 架构超越。
- ✅ **缩进与立绘解耦**:ts:83 `startX = hasPortrait ? POS[slot].textWithPortrait.x : POS[slot].text.x`,其中 `hasPortrait = Boolean(portraitImg)`(ts:82)—— **基于实际立绘资产是否存在**,不是「StartDialog 时是否传了 face」。⚠️ **与 sdlpal 语义有偏差**:sdlpal posDialogText 在 StartDialog 时按 `iNumCharFace>0` 设(text.c:1317),其后即使立绘被擦缩进仍在。reforge 若 `portraits.get(icon)` 返回 undefined(资产缺失),会 fallback 到无缩进位置 —— 与 sdlpal 不符。Ⓜ️ 低风险(资产齐全时不触发)。

#### SingleLineBox / 1.4s 自动关闭 — **reforge narration 完全缺失**
- ❌ **narration SingleLineBox 未实现**:sdlpal text.c:1687 的居中 SingleLineBox,reforge 无(menu/menu-box.ts:228 有 SingleLineBox 实现但未接入 dialog)。
- ❌ **1.4s 自动关闭未实现**:sdlpal text.c:1701 `PAL_DialogWaitForKeyWithMaximumSeconds(1.4)`。reforge narration 无超时逻辑(`update()` 只处理 autoAdvance,narration 段未标 autoAdvance 则永不消失)。
- ❌ **战斗飘字 `PAL_BattleUIShowText(text, 1400)` 未实现**:sdlpal text.c:1671 战斗中 CenterWindow 走战斗飘字系统。reforge battle-ui.ts 无此。

#### 资产解码 — renderSpans / measureSpans(text-render.ts)
- ✅ **逐 span 上色**(text-render.ts:29-50):`forceRgba ?? colorRgba(span.color)`;`maxChars` 截断打字。
- ✅ **shadow 三层**:需核实 text-render.ts:38 是否三层(text.c:1144-1156 DOS triple)。Ⓜ️ 待核实(本审计未读 text-render.ts 全文)。

---

### 1.4 单元 1 缺口汇总

| # | 缺口 | sdlpal 真值 | 一阶段 | reforge | 风险 | 行动建议 |
|---|---|---|---|---|---|---|
| **G1.1** | **narration slot 不渲染** | text.c:1663-1710 CenterWindow 居中窗 | ✅ drawNarrationDialog(dialog-box.ts:772) | ❌ render 循环只画 bottom/top(dialog-box.ts:204),narration POS 数值也错(60,88 非 160,40) | 🔴 **高**(gameover 文字不可见) | render 循环加 narration;或 narration 走独立 SingleLineBox 渲染路径;POS 改 (160,40) |
| **G1.2** | **narration 1.4s 自动关闭缺失** | text.c:1701 `WaitForKeyWithMaximumSeconds(1.4)` | Ⓜ️ 推给 event-system(待核实) | ❌ update() 无 narration 超时 | 🔴 **高**(narration 永不消失) | narration slot 默认挂 1.4s 超时自动 close;或内容数据强制 autoAdvance |
| **G1.3** | **center(kDialogCenter)slot 缺失** | text.c:1321 (80,40) + 不画箭头(text.c:1385) | ✅ getDialogTextPos(dialog-box.ts:162) | ❌ SlotId/content 无 'center' | 🟡 **中**(center 用于部分旁白/系统提示) | 加 'center' 到 SlotId + DialogueLine.slot + POS;光标守卫补 center 排除 |
| **G1.4** | **item-box 炼丹框缺失** | script.c:1479-1513 | ✅ drawItemBoxDialog(dialog-box.ts:857) | ❌ 无 item-box style/字段 | 🟡 **中**(紫金葫芦炼丹 cutscene) | 炼丹走独立 UI(非 DialogBox),或加 item-box slot + ITEMBOX 精灵 + 2 行 SingleLineBox |
| **G1.5** | **$NN 跨段持续态缺失** | text.c:1538 iDelayTime 脚本级全局 | ✅ iDelayState 跨行(dialog-box.ts:357) | ⚠️ speed 单段字段 | 🟡 **中**(变速只作用单段) | 迁移器把 $NN 展开成每段 speed;或引擎加「当前脚本 speed 栈」 |
| **G1.6** | **光标守卫未排除 center** | text.c:1385 | ✅ shouldShowKeyIcon(dialog-box.ts:706) | ⚠️ drawCursor 无 center 排除(dialog-box.ts:271) | 🟢 **低**(当前无 center slot,不触发) | 加 center slot 时同步补守卫 |
| **G1.7** | **立绘缩进基于资产而非 face 参数** | text.c:1317 iNumCharFace>0 设持久 metric | ✅ portraitLayout 字段解耦 | ⚠️ hasPortrait=Boolean(portraitImg)(dialog-box.ts:82) | 🟢 **低**(资产齐全不触发) | 可接受;或加 portraitLayout 等价字段 |
| **G1.8** | **姓名牌 isLineStart 不变量脆弱** | text.c:1715 nCurrentDialogLine==0 | ✅ shouldRenderAsTitle 三条件 | ⚠️ 依赖 layoutLineInto 单段输入(dialog-box.ts:236) | 🟢 **低** | 加断言或显式取段首 |

---

## 审计单元 2:对话解析(控制符)

sdlpal 真值锚点:`text.c:1458-1613` `TEXT_DisplayText`(无独立 parseDialogText 函数,控制符消费与绘制耦合在 display 循环内)+ `text.c:1038-1072` `PAL_UnescapeText`。

### 2.1 sdlpal C 真值(`reference/sdlpal/text.c`)

#### 控制符 state machine(TEXT_DisplayText text.c:1472-1610)

| 控制符 | 行为 | 状态副作用 | 跨行持续? |
|---|---|---|---|
| `-` | toggle CYAN(0x8D)↔ DEFAULT(0x4F) | 改 `bCurrentFontColor` | ✅ 跨行(g_TextLib 字段) |
| `'` | toggle RED(0x1A)↔ DEFAULT | 改 `bCurrentFontColor` | ✅ |
| `@` | toggle RED_ALT(0x17)↔ DEFAULT | 改 `bCurrentFontColor` | ✅ |
| `"` | toggle YELLOW(0x2D)↔ DEFAULT —— **仅 `!isDialog`**(text.c:1522);但 `"` **总被消费**(text.c:1531 `lpszText++` 在 if 外) | 改 `bCurrentFontColor` | ✅ |
| `$NN` | `iDelayTime = NN*10/7`(text.c:1538);`lpszText+=3`(消费 $ + 2 位) | 改 `iDelayTime` | ✅ 跨行(g_TextLib 字段,仅 RunTriggerScript 入口重置 3) |
| `~NN` | `fUserSkip`时先 UpdateScreen;`UTIL_Delay(NN*80/7)`;`nCurrentDialogLine=-1`;`fUserSkip=FALSE`;**return x**(本行止) | 复位行计数 + fUserSkip | — (本行终止) |
| `)` | `bIcon=1`(text.c:1560) | 改 `bIcon` | ✅ 跨行(g_TextLib 字段) |
| `(` | `bIcon=2`(text.c:1568) | 改 `bIcon` | ✅ |
| `\` | `lpszText++`(text.c:1572);画下一字符**字面**(不当代码) | 无 | — |
| 其他 | 画字符(text.c:1576-1595) | 无 | — |

#### 字符绘制(text.c:1576-1595)
- `text[0]=*lpszText++; text[1]=0`。
- `color = bCurrentFontColor`。
- **isDialog 真值**(text.c:1580-1588):
  - `isDialog && bCurrentFontColor==FONT_COLOR_DEFAULT` → `color=0`(黑)。
  - `isDialog && '0'<=text[0]<='9'` → `isNumber=1` → `PAL_DrawNumber(ch-'0', 1, PAL_XY(x,y+4), kNumColorYellow, kNumAlignLeft)`(数字走 yellow sprite digit,text.c:1592)。
  - 否则 `PAL_DrawTextUnescape(text, PAL_XY(x,y), color, fShadow=!isDialog, fUpdate=!isDialog&&!fUserSkip, 8x8=FALSE, fUnescape=FALSE)`(text.c:1594)。
- `x += PAL_CharWidth(text[0])`(text.c:1595):半角 8 / 全角 16。

#### fShadow(text.c:1144-1156)
对话正文 isDialog=FALSE → fShadow=TRUE → **三层阴影** `(+1,0)/(0,+1)/(+1,+1)` color 0(DOS triple,sdlpal 统一)。narration isDialog=TRUE → fShadow=FALSE。

#### `PAL_UnescapeText`(text.c:1038-1072)— 给非 display 路径(eg. word 长度计算 text.c:694)用
- 消费 `- ' @ " $ ~ ) (`,遇到 `\` 跳过转义画字面。与 TEXT_DisplayText 控制符集**一致**(但无副作用,纯剥离)。

#### isDialog 来源(text.c:1737 vs 1698)
- **普通对话**(top/bottom/center):`TEXT_DisplayText(..., isDialog=FALSE)`(text.c:1737)→ 打字 delay 走、`"`黄 toggle 走、fShadow=TRUE。
- **narration**(CenterWindow):`TEXT_DisplayText(..., isDialog=TRUE)`(text.c:1698)→ 打字 delay **不走**(整段一次性)、`"`黄被屏蔽、fShadow=FALSE、数字走 sprite。

---

### 2.2 一阶段实现(`packages/game/src/present/dialog-box.ts:84-145` `parseDialogText`)

#### 控制符消费(dialog-box.ts:118-143)— **逐字符对齐**
- ✅ `-`(ts:121)/ `'`(ts:122)/ `@`(ts:123):toggle 对应色 ↔ DEFAULT。对齐 text.c:1476-1517。
- ✅ `"`(ts:124-126):`if(!isDialog) toggle YELLOW`;**总 break 消费**(ts:126)。对齐 text.c:1518-1532(`lpszText++` 在 if 外)。
- ✅ `$NN`(ts:127-132):`iDelay = floor(NN*10/7)`;`i+=2`。对齐 text.c:1538-1539。
- ✅ `~NN`(ts:133-137):`endDelay = floor(NN*80/7)`;`return`(本行止,endedWithTilde=true)。对齐 text.c:1542-1554。
- ✅ `)`(ts:138)/ `(`(ts:139):icon=1/2。对齐 text.c:1556-1570。
- ✅ `\`(ts:140):`chars[++i]` 转义画字面。对齐 text.c:1572。
- ✅ default(ts:141):`emit(ch)`。

#### 逐字符色 + 时间驱动(dialog-box.ts:111-116 `emit`)
- ✅ **color 映射**(ts:113):`isDialog && color===DEFAULT ? 0 : color`。对齐 text.c:1581-1582。
- ✅ **revealAt**(ts:114-115):`revealAt.push(cum); cum += iDelay*8`。对齐 text.c:1600 每字 `UTIL_Delay(iDelayTime*8)`。
- ✅ **endColor / endIDelay 跨行**(ts:144):返回 `endColor: color, endIDelay: iDelay`。caller `appendDialogLine`(ts:333/336)读作下一起始态。对齐 g_TextLib 跨行持续。

#### isDialog 传递(dialog-box.ts:287 / 331)
- ✅ `isDialog = style === 'narration'`(ts:287 / 331)。普通对话 FALSE,narration TRUE。对齐 text.c:1737/1698。
- ✅ **narration `"`黄被屏蔽**:isDialog=TRUE → parseDialogText 内 `if(!isDialog)` 不进(ts:125)。对齐 text.c:1522。

#### 数字字符 sprite 处理 — **不在 parseDialogText,在 drawNarrationDialog**
- ✅ narration 路径(dialog-box.ts:823-828):`ch>='0'&&<='9'` → `drawNumber(...)` sprite;否则 `renderText`。对齐 text.c:1583-1594。
- ⚠️ **普通对话路径不处理数字 sprite**:sdlpal text.c:1580 `if(isDialog)` 守卫 —— 数字 sprite **仅 isDialog=TRUE**(narration)走。普通对话(isDialog=FALSE)`isNumber=0`,数字走普通 `PAL_DrawTextUnescape`。一阶段 drawTextLine(ts:710-736)无数字分支,**普通对话数字走 renderText**。✅ 对齐(isDialog=FALSE 不走数字 sprite)。

#### git 踩坑
- commit `77f6c2ec` 「逐字符颜色控制符全套」:原先控制符被字面显示(黄/青/红字丢失)。
- commit `bea94757` 「时间驱动打字」:$NN 真变速 + ~NN 尾暂停。
- commit `eac911c1` L2:fUserSkip 跨行。
- commit `8f333ef3` 「黑屏提示文字颜色」:narration isDialog=TRUE DEFAULT→0。

---

### 2.3 reforge 实现(`packages/content/src/rich-text.ts` + `content/src/index.ts` + `typewriter.ts`)

reforge 采用**结构化字段模型**:控制符不再是内联文本字符,而是 `DialogueLine` 的显式字段(speed/autoAdvance/cursorFrame/speaker)+ locale 富文本 `<color>` 标记。

#### 颜色控制符 — **locale 富文本 `<color>` 标记**(rich-text.ts:10-24 `parseRichText`)
- ✅ **4 色**(rich-text.ts:3 `['cyan','red','redAlt','yellow']`):对应 sdlpal `- ' @ "`。palette 映射 palette-color.ts:4-10(DIALOG_RGBA)对齐 text.c:29-34。
- ✅ **成对闭合标签**(ts:12 `<cyan>…</cyan>`):正则 `<(tag)>(.*?)</\1>` 非贪婪。✨ **超越 sdlpal**:sdlpal 是 toggle(同符再出现复位),reforge 是显式闭合区间 —— 无 toggle 状态泄漏风险。
- ⚠️ **toggle vs 区间语义差异**:sdlpal `-` 是 toggle,若一段话 `-ABC-DEF`(`-` 复位),ABC 青、DEF 默认。reforge `<cyan>ABC</cyan>DEF` 等价。✅ 语义等价(迁移器把 toggle 转区间)。
- ❌ **`"`黄仅 !isDialog 屏蔽缺失**:sdlpal text.c:1522 `"`黄 toggle 仅普通对话,narration 被屏蔽。reforge `<yellow>` 在 locale 富文本里**无 isDialog 概念**,narration slot 也能用 `<yellow>`。Ⓜ️ 低风险(narration 本就不渲染,且内容作者可控)。
- ❌ **DEFAULT→0(isDialog)缺失**:sdlpal text.c:1581 narration(isDialog=TRUE)DEFAULT 色映射到 0(黑)。reforge palette-color.ts:5 `default: [199,186,174]`(原 0x4F)—— **narration 也用 0x4F 非 0**。Ⓜ️ 中风险(narration 文字颜色偏亮,与原版黑字不符)。但因 narration 不渲染(G1.1),当前不触发。

#### `$NN` 变速 — **speed 字段**(content/index.ts:50)
- ✅ **speed 字段**(ms/字):「原版 $NN」。typewriter.ts:246 `line.speed ?? DEFAULT_SPEED_MS`。
- ⚠️ **NN*10/7 换算责任在迁移器**:sdlpal text.c:1538 `iDelayTime = NN*10/7`,每字 delay = iDelayTime*8 = NN*80/7 ms。reforge speed 直接是 ms/字,**迁移器须把 $NN 转成 speed=NN*80/7**(近似 NN*11.43)。若迁移器直接用 NN 当 ms 会偏慢 7/80。Ⓜ️ 中风险(迁移器责任)。
- ⚠️ **跨段持续态缺失**:见 G1.5。

#### `~NN` 尾停顿 — **autoAdvance 字段**(content/index.ts:52)
- ✅ **autoAdvance 字段**(ms):「原版 ~NN 尾停顿 + 自动推进」。`update()`(dialog-box.ts:184-198)计 `doneAt = totalChars*speed + auto`。
- ⚠️ **NN*80/7 换算责任在迁移器**:sdlpal text.c:1551 `UTIL_Delay(NN*80/7)`。reforge autoAdvance 直接 ms。Ⓜ️ 同上。
- ✅ **不可加速**(dialog-box.ts:138):autoAdvance 段按 space = noop。✅ 对齐 text.c:1551。
- ⚠️ **行计数复位语义**:见单元 1 G1.5 讨论(reforge 走 advanceToNextLine 不依赖行计数复位)。

#### `(`/`)` 等键图标 — **cursorFrame 字段**(content/index.ts:58)
- ✅ **cursorFrame 字段**(0/1/2):「原版 `(`/`)`」。dialog-box.ts:289 `cursorFrames[frameIdx ?? 0]`。✅ 对齐 text.c:1560/1568。
- ✨ **超越 sdlpal**:cursorFrame 是段级字段,不依赖内联控制符消费顺序。

#### `\` 转义 — **locale 富文本无此需求**
- sdlpal `\` 转义下一字符字面(防止控制符字符被当代码)。reforge locale 富文本用 `<color>` 标签,**控制符字符(`- ' @ " $ ~ ( )`)在富文本里就是字面字符**,无需转义。✅ 架构免疫。
- ⚠️ **若 locale 文本要含 `<cyan>` 字面**:reforge 正则会误解析。Ⓜ️ 低风险(剧情文本罕见)。

#### 打字延时 — **typewriter.ts**
- ✅ **DEFAULT_SPEED_MS=24**(typewriter.ts:5):对齐 iDelayTime=3×8=24。
- ✅ **charsShown=⌊elapsed/speed⌋**(ts:8-9):wall-clock 驱动。
- ❌ **逐字符变速不支持**:sdlpal `$NN` 可在**行中间**改速(text.c:1538 消费后立即影响后续字)。reforge speed 是**段级常量**,无法行内变速。Ⓜ️ 低风险(sdlpal 行内 $NN 罕见,多为行首)。

#### fShadow 三层 — **待核实**
- renderSpans(text-render.ts:38)是否三层 color 0。Ⓜ️ 待核实。

---

### 2.4 单元 2 缺口汇总

| # | 缺口 | sdlpal 真值 | 一阶段 | reforge | 风险 | 行动建议 |
|---|---|---|---|---|---|---|
| **G2.1** | **narration DEFAULT→0(黑)缺失** | text.c:1581 isDialog+DEFAULT→color 0 | ✅ parseDialogText emit(dialog-box.ts:113) | ❌ palette-color default=0x4F 非 0(palette-color.ts:5) | 🟡 **中**(narration 文字偏亮) | narration slot 渲染时 default 色强制映射 0;或加 isDialog 透传 |
| **G2.2** | **$NN 行内变速不支持** | text.c:1538 行中间改速 | ✅ iDelay 跨字符(dialog-box.ts:127-132) | ❌ speed 段级常量 | 🟢 **低**(行内 $NN 罕见) | 可接受;或 TextSpan 加 speed |
| **G2.3** | **`"`黄 narration 屏蔽缺失** | text.c:1522 !isDialog | ✅ parseDialogText isDialog(dialog-box.ts:125) | ❌ rich-text 无 isDialog | 🟢 **低**(narration 不渲染 + 作者可控) | narration slot 禁用 yellow,或文档约束 |
| **G2.4** | **$NN/~NN 换算(×10/7, ×80/7)责任在迁移器** | text.c:1538/1551 | ✅ 引擎内换算 | ⚠️ 迁移器须算 | 🟡 **中**(迁移器漏算则变速/停顿失真) | 迁移器单测覆盖 $NN→speed、~NN→autoAdvance 换算 |
| **G2.5** | **locale 富文本 `<cyan>` 字面误解析** | —(sdlpal 无标签) | — | ⚠️ rich-text.ts:12 正则 | 🟢 **低** | 可接受;或加 `\<` 转义 |

---

## 审计单元 3:文本数据(WORD.DAT / M.MSG)

sdlpal 真值锚点:`text.c:648-894` `PAL_InitText`(M.MSG + WORD.DAT 二进制路径)+ `text.c:153-646` `PAL_ReadMessageFile`(文本 message 文件路径)+ `text.c:1963-2229` `PAL_MultiByteToWideCharCP`(GBK/BIG5/UTF-8 解码)+ `res.c`(资源加载)。

### 3.1 sdlpal C 真值

#### WORD.DAT 加载(text.c:718-790)— **二进制路径**
- `fpWord = UTIL_OpenRequiredFile("word.dat")`(text.c:719)。
- **每条 10 字节**:`g_TextLib.nWords = (filesize + dwWordLength-1) / dwWordLength`(text.c:730),`dwWordLength` 默认 10(global.c)。
- **尾部去空格**(text.c:762):`while(pos>=base && temp[pos]==' ') temp[pos--]=0`(逐条右去 0x20)。
- **GBK→宽字符**(text.c:763/784):`PAL_MultiByteToWideChar` 走全局 codepage(`g_codepage`,默认 GBK,由 `PAL_DetectCodePage` 检测)。
- **剥尾 '1'**(text.c:785-786):`if(l>0 && lpWordBuf[i][l-1]=='1') lpWordBuf[i][l-1]=0` —— BIG5→GBK 不彻底简体化遗留的标记字节。
- **额外词**(text.c:872-876):`SYSMENU_LABEL_LAUNCHSETTING` 塞「返回设置」,`SYSMENU_LABEL_BATTLEMODE` 塞战斗速度档(6 词)。

#### M.MSG 加载(text.c:794-866)
- **偏移表在 SSS.MKF chunk 3**(text.c:795):`PAL_MKFGetChunkSize(3, fpSSS)/sizeof(DWORD)` 得条数。
- `PAL_MKFReadChunk(offsets, ..., 3, fpSSS)`(text.c:807)。
- **切片**(text.c:859-866):`lpMsgBuf[i]` 从 `offsets[i]` 到 `offsets[i+1]` 切,GBK 解码。

#### message 文件路径(text.c:153-646 `PAL_ReadMessageFile`)— **文本路径**(本作不用)
- `[BEGIN MESSAGE] N` / `[END MESSAGE] N` / `[BEGIN WORDS]` / `[CLEAR MESSAGE]` 等。
- UTF-8 解码(text.c:282-284 `PAL_MultiByteToWideCharCP(CP_UTF_8, ...)`)。
- **indexBuf 二级结构**(text.c:566-616):`lpIndexBuf[index][indexEnd-index][order]` → msgNum。0=暂停等键,-1=结束。

#### GBK 解码(text.c:2117-2141 `PAL_MultiByteToWideCharCP` CP_GBK 分支)
- 双字节首字节 `0x81-0xFE`,次字节 `0x40-0xFE`(0x7F 跳过)。
- **查表**:`cptbl_gbk[lead-0x81][trail-0x40]`(codepage.h,线性映射)。
- **PUA 映射**:GBK 造字区(AA-AF/FE 行)在 cptbl_gbk 里线性映射到 U+E000-U+F8FF 私用区 —— **fontglyph_cn.h 的 PUA 区字形全 0 → 渲染空白**。
- **0x80 → U+20AC(€)**(text.c:2126),**0xFF → U+F8F5**(text.c:2128)。
- **invalid_char = 0x3F('?')**(text.c:2118):次字节 <0x40 → '?'。

#### codepage 检测(text.c:1897-1961 `PAL_DetectCodePageForString`)
- 试 GBK + BIG5,选 invalid 最少的(global.c 启动时对 word.dat 检测)。

---

### 3.2 一阶段实现(`packages/pal-extract/src/utils/gbk.ts` + `io/word.ts` + `io/msg.ts`)

#### `decodeGbk`(gbk.ts:17-22)
- ✅ **iconv-lite gbk 解码**(ts:20):`iconv.decode(Buffer, 'gbk')`。等效 text.c:2117 CP_GBK 查表(iconv 表与 cptbl_gbk 同源)。
- ✅ **0x00 截断**(ts:18-19):`bytes.indexOf(0)`。对齐 C 字符串语义。
- ✅ **fixupTranscodeResidue**(ts:21):见下。

#### `fixupTranscodeResidue`(gbk.ts:76-96)— **PUA 残留修复**
- ✅ **PUA 检测快路径**(ts:77-85):无 PUA 直接返回(零开销)。
- ✅ **FULL_LINE_FIXUP**(ts:33-40):4 条整条未转码 BIG5 台词(瑈猐/芬袍 等)精确匹配。✨ **超越 sdlpal**:sdlpal 这些位置是空白(PUA 字形 0),一阶段据 BIG5 标准 + 逐字剧情判断还原正字。
- ✅ **PUA_CHAR_FIXUP**(ts:45-70):15 个 PUA → 正字映射(繁体字残留 8 + BIG5 标点 9 + 颜文字噪声 4)。
- ✅ **未知 PUA 删(空白)**(ts:93):对齐 sdlpal 缺字空白。

#### WORD.DAT 解析(io/word.ts:34-99 `parseWordDat`)
- ✅ **每条 10 字节**(ts:21 `WORD_LENGTH=10`)。对齐 text.c:730。
- ✅ **尾部去空格**(ts:68-69 `readBlock`):`while(end>start && buf[end-1]===0x20) end--`。对齐 text.c:762。
- ✅ **剥尾 '1'**(ts:63-65 `stripTrailingOne`):`s.endsWith('1') ? slice(0,-1)`。对齐 text.c:785-786。
  - **git 踩坑**(commit 注释 ts:28-29 L28):在解码后(字符串层)剥,避免误剥 GBK 双字节 trail 0x31。
- ✅ **565 条 flat**(ts:74-86):`flat[i]` 直对 sdlpal `PAL_GetWord(i)`。✨ 超越(M5.6 hotfix 修「5 category dump 漏 55 条 sys/UI/battle label」,commit 注释 ts:55-58)。
- ✅ **7 category 切片**(ts:88-97):system/persons/battleUi/items/spells/enemies/scenes。

#### M.MSG 解析(io/msg.ts:8-15 `parseMessages`)
- ✅ **偏移表切片**(ts:13-15):`offsets[i]` 到 `offsets[i+1]`,decodeGbk。对齐 text.c:859-866。
- ✅ **offsets 来自 SSS.MKF chunk 3**(cli.ts:193 `sss.messageOffsets`)。

#### 数据流(cli.ts)
- `parseWordDat(loadFile('WORD.DAT'))` → `lookup/words.json`。
- `parseMessages(loadFile('M.MSG'), sss.messageOffsets)` → `lookup/strings.json`(cli.ts:842)。
- ✅ **PUA 残留实测 0**(本审计核验:`strings.json` 13513 条全无 PUA)—— fixup 表已覆盖全部 46 处。

---

### 3.3 reforge 实现 — **复用 shared / 经 JSON 间接用 decodeGbk**

reforge **不直接读 WORD.DAT / M.MSG 二进制**,而是消费 pal-extract 产出的 JSON。

#### 文本数据来源
- **glyphs.json**(main.ts:181 `loadGlyphs()` → glyph.ts:41 `fetch('/extracted/data/font/glyphs.json')`):Unifont CN 简体点阵(第一阶段 port)。
- **project.locale**(main.ts:387 `project.locale`):`Record<TextId, string>`,来自工程 project.json —— **手写/迁移器产出**,非直接读 strings.json。
- **lookupText**(content/locale.ts:7-9 `lookupText(id, locale) = locale[id] ?? id`)。

#### decodeGbk 是否真被 reforge 用?
- ❌ **reforge 运行时不直接调 decodeGbk**:grep `decodeGbk` 在 reforge 包内**零命中**。
- ✅ **间接经 pal-extract**:pal-extract 用 decodeGbk 产 strings.json / words.json;若迁移器把 strings.json 内容搬进 project.locale,则 reforge 经 locale 间接消费已解码文本。
- ⚠️ **PUA 残留 46 处经 fixup 已清零**(strings.json 实测)—— 但**仅当迁移器搬 strings.json 原文**才继承此修复。若迁移器重新解码或用其他源,PUA 可能复现。Ⓜ️ 中风险(迁移器责任)。

#### 字词查表 — **无 PAL_GetWord 等价**
- sdlpal `PAL_GetWord(i)`(text.c:965-985)按 index 取词。一阶段 words.json `flat[i]` 直对。
- ❌ **reforge 无按 index 取词的运行时 API**:reforge 用 `lookupText(textId, locale)`(textId 是字符串,非数字 index)。物品名/技能名等通过 `name.${template}`(main.ts:846/885)查 locale。
- ⚠️ **words.json flat[i] 未接入 reforge**:若迁移器没把 WORD.DAT 的 565 词展开进 locale,reforge 取不到。Ⓜ️ 中风险(迁移器责任)。

#### GBK→Unicode PUA 处理 — **reforge 不接触**
- reforge 消费的是 UTF-8 JSON(locale/glyphs.json),无 GBK 字节流。✅ 架构免疫(解码责任在 pal-extract 一次性完成)。
- ⚠️ **但 glyphs.json 字形覆盖**:Unifont CN 简体点阵 —— 若 fixup 还原的正字(eg. 裡→里)在 Unifont 有字形 ✅;若 PUA 删除的未知字(空白)在 reforge 也是空白 ✅(无字形 = 不画)。需核实 glyphs.json 是否含全部 fixup 正字的字形。Ⓜ️ 低风险(Unifont 覆盖 CJK 基本区)。

---

### 3.4 单元 3 缺口汇总

| # | 缺口 | sdlpal 真值 | 一阶段 | reforge | 风险 | 行动建议 |
|---|---|---|---|---|---|---|
| **G3.1** | **reforge 不直接用 decodeGbk(经 JSON 间接)** | text.c:2117 运行时解码 | ✅ decodeGbk(gbk.ts:17) | ⚠️ 间接(pal-extract→JSON→locale) | 🟢 **低**(架构分层合理) | 可接受;迁移器单测验证 locale 文本无 PUA |
| **G3.2** | **无 PAL_GetWord(i) 运行时等价** | text.c:965 按 index 取词 | ✅ words.json flat[i] | ❌ 仅 lookupText(textId) | 🟡 **中**(系统词/UI 词按 id 取) | 迁移器把 WORD.DAT 565 词展开进 locale(eg. `word.42`→「炼出」);或 reforge 加按 id 取词 |
| **G3.3** | **PUA 残留修复依赖迁移器搬 strings.json** | text.c PUA→空白 | ✅ fixup 46 处清零 | ⚠️ 间接继承 | 🟡 **中**(若迁移器另解码 PUA 复现) | 迁移器直接搬 pal-extract 的 strings.json;或共享 decodeGbk 给迁移器 |
| **G3.4** | **0x80→€ / 0xFF→PUA 特殊映射未核实** | text.c:2126/2128 | ⚠️ iconv 表(未核实一致) | — | 🟢 **低**(本作罕见) | 可接受 |

---

## 总体风险矩阵(3 单元合并)

### 🔴 高危(影响基本可玩性)
1. **G1.1 narration slot 不渲染 + POS 错误**:gameover 文字不可见(dialog-box.ts:204 render 循环缺 narration;ts:36-42 POS 数值错)。sdlpal text.c:1663-1710 居中 SingleLineBox 完全未移植。
2. **G1.2 narration 1.4s 自动关闭缺失**:narration 段永不消失。sdlpal text.c:1701。

### 🟡 中危(语义失真但不崩)
3. **G1.3 center slot 缺失**:kDialogCenter 完全无实现(text.c:1321/1385)。
4. **G1.4 item-box 炼丹框缺失**:L1 已实现的紫金葫芦炼丹 cutscene 无 reforge 对应。
5. **G1.5 / G2.4 $NN/~NN 跨段持续 + 换算**:reforge speed/autoAdvance 是单段字段,跨段持续态与 ×10/7、×80/7 换算责任全在迁移器。
6. **G2.1 narration DEFAULT→0(黑)缺失**:palette-color default=0x4F 非 0,narration 文字偏亮。
7. **G3.2 无按 index 取词 API**:系统词/UI 词取不到。
8. **G3.3 PUA 修复依赖迁移器**:若迁移器不搬 strings.json,46 处 PUA 复现。

### 🟢 低危(边缘场景 / 架构免疫)
9. **G1.6/1.7/1.8** 光标守卫 / 立绘缩进 / 姓名牌不变量。
10. **G2.2/2.3/2.5** 行内 $NN / `"`黄 narration / `<cyan>` 字面。
11. **G3.1/3.4** decodeGbk 间接 / 0x80 特殊映射。

---

## 优先行动建议(按 ROI 排序)

1. **修 G1.1 + G1.2(narration 渲染 + 1.4s 自动关)**:render 循环加 narration;narration POS 改 (160,40);接 SingleLineBox(menu/menu-box.ts:228 已有实现);narration slot 默认挂 1.4s 超时。**这是 gameover 不可见的直接根因,最高优先级**。
2. **加 G1.3 center slot**:SlotId + DialogueLine.slot + POS{(80,40)};光标守卫补 center 排除。center 用于部分系统提示。
3. **写迁移器单测覆盖 G1.5/G2.4/G3.2/G3.3**:验证 $NN→speed(NN×80/7)、~NN→autoAdvance(NN×80/7)、WORD.DAT→locale、strings.json→locale(含 PUA fixup 继承)。
4. **G1.4 item-box 炼丹框**:评估是否走独立 UI(非 DialogBox);L1 drawItemBoxDialog 可作参考。
5. **G2.1 narration DEFAULT→0**:narration slot 渲染时 default 色强制 0。

---

## 附录:待核实项(超出本次审计范围)

- **A1**:一阶段 `present.ts` 是否真做了 0xF9-0xFE palette 轮转(一阶段注释 dialog-box.ts:495-677 声称移到 present 层)。reforge 已用 CURSOR_RGBA 6 色轮转实现(dialog-box.ts:291)。
- **A2**:一阶段 event-system 是否真实现了 narration 1.4s 超时(一阶段 dialog-box.ts 注释声称推给 event-system)。
- **A3**:reforge renderSpans(text-render.ts:38)shadow 是否三层 color 0(text.c:1144-1156 DOS triple)。
- **A4**:glyphs.json 是否含全部 fixup 还原正字的字形。
