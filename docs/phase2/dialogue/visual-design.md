> **历史文档（2026-09-06 标注）**：本文写作于方案设计/计划阶段，正文中的执行指令、
> Agent 分工、版本号与“当前状态”均为**当时快照**，不是现行契约或待办；已被后续
> current-only / canonical 实现取代的方案不恢复。现行真值见 docs/phase2/READ-FIRST.md
> 与 capability-map.md。

# 对话框外观 · ② 实现设计(Canvas2D 适配 + 完整技术点覆盖)

> 状态:草案(2026-06-27 立)。承接 [D11](../decisions.md) ②、[GLM 外观真值 spec](visual-spec.md)、[D13](../decisions.md) 文本分层、[D12](../decisions.md) demo 定位。是「三刀」的**第②刀**(① 数据地基已完成,③ 迁移器留后)。

## 0. 这份文档定什么(大白话)

把对话框外观**适配到 reforge 的 Canvas2D**(原版是 indexed 软件 framebuffer,两套渲染),并把鬼话设计成**对话系统全部技术点的「完成度仪表盘」**——跑一遍 5 句,每个特性亮一遍,一眼看到对话系统做到哪了(D12 的最佳实践)。

外观**真值**(位置 / 色值 / 打字时序)在 [GLM spec](visual-spec.md) §3,本文不重抄;本文定的是 **Canvas2D 适配方案 + 架构分层 + 仪表盘分配**。

## 1. 范围:全覆盖(D12)

**做(鬼话仪表盘覆盖的全部技术点):**

| 类 | 技术点 |
|---|---|
| 文本 | 正文字模、颜色着色(青 / 红 / 黄) |
| 打字 | 逐字打字、播放速度(快 / 慢 / 默认)、自动播放(`autoAdvance` 不等键) |
| 推进 | 翻页(等键光标)、自动播放推进 |
| 元素 | 姓名牌、头像(无 / 左 / 右)、光标(3 形轮换) |
| 布局 | 框位置(slot:上 / 下)、**双框共存**(top + bottom 同屏) |

**留后(按 [D13](../decisions.md),不属于对话系统 / 演出层):**
- narration / item-box(各归演出 / 物品系统,复用 `text-render`)
- center 布局(对话用上 / 下够;center 罕用)
- 选项 / 分支(演出层 choice action)
- 头像视觉:鬼魂无原版头像 → **用原版某头像 chunk 占位**先验证渲染链路,鬼气立绘回头换

## 2. 架构:两层(D13 落地)

把对话渲染从 main.ts 闭包**拎出来**(兑现约定),分两层:

```
packages/reforge/src/text/         ← 共享文本渲染原语(不绑对话)
  glyph.ts        loadGlyphs(glyphs.json) + per-(字符,RGBA) bake 离屏 canvas + 缓存
  text-render.ts  renderText(ctx, spans, x, y, {shadow}) — 逐字 blit + 三层阴影 + 着色
packages/reforge/src/dialog/        ← 对话渲染(消费 text-render)
  dialog-assets.ts  加载光标(DATA chunk12)/ 头像(RGM)
  dialog-box.ts     DialogBox:管理多 slot(top/bottom)各自状态(留显/活跃)+ 打字时间态 + 画框/姓名/正文/头像/光标,调 text-render
main.ts             只 new DialogBox + 每帧 dialogBox.render(pageLines, …)
```

**关键纪律(D13)**:`text/` 不知道「对话」存在——物品框 / 旁白 / 死亡文本将来都复用它。对话特有的(姓名牌 / 翻页 / 头像 / 框位置)只在 `dialog/`。

## 3. Canvas2D 适配(6 点)

原版写 indexed framebuffer(`fb.writePixel(colorIndex)` → `toImageData(palette)`);reforge 是 Canvas2D RGBA。逐点适配:

| 适配点 | 原版 | reforge 方案 |
|---|---|---|
| **字模 blit** | glyph 亮像素 `fb.writePixel(idx)` | per-(字符,RGBA) **bake 离屏 canvas**;bit 解码抽纯函数 `decodeGlyph`(可单测),`bakeGlyph` 只做 canvas 涂绘+缓存(测试环境无 canvas,留浏览器验) |
| **字体色** | palette index `0x4F` | `palette.colors[index]` → `[R,G,B]`(reforge 已加载 palette) |
| **三层阴影** | 黑(idx 0)画 3 偏移 + 主色 | 同,离屏 canvas 画 4 次(`(+1,0)/(0,+1)/(+1,+1)` 黑 + 主色) |
| **打字** | tickDialog 算 `charsRevealed` | 渲染层 `performance.now`:`charsShown = (now-lineStartMs)/speedMs`,只画前 N 字(逻辑层①不变,时间态归 DialogBox——design §6)。**逐显示行串行**(第 i 行等前 i-1 行打完才开始) |
| **光标闪烁** | palette `0xF9–0xFE` 轮转 | 取 `palette.colors[0xF9..0xFE]` 6 色 RGBA,光标按 100ms/步在 6 色间轮转着色;3 形(frame 0/1/2)由 `cursorFrame` 字段选,缓存 key=frame×6+step |
| **分页 / 位置** | 4 行/页,bottom `(44,126)` 行高18 | **逐段推进 + slot 共存**:每段话独立 `layoutLines` 折行,每页 ≤4 显示行;坐标 spec §3(bottom `(44,126)` / top `(44,26)`,有头像时正文缩进)。分页归渲染层(DialogBox),非 dialogue.ts |

**字体方案取舍**:考虑过「reforge 也搞 indexed framebuffer 给文字」(违 D10 Canvas2D 精神)vs「per-glyph bake」——选后者(贴现有 `bakeFrame`、可缓存、纯函数可测)。

## 4. 数据模型扩展 + slot 共存模型(② 在 ① 上加)

**对话框 = 具名 slot**(2026-06-27 拍板):屏幕有几个独立文本面板(`top` / `bottom`,可扩展),**能同屏共存**。每句显式指定画到哪个 slot。

```ts
interface DialogueLine {
  speaker?: TextId
  text: TextId
  speed?: number        // ms/字(① 已有)
  autoAdvance?: number  // ms(① 已有);存在 = 打完停 N ms 自动推进、不等键
  // ── ② 新增(可选,缺省 = bottom / 无 / f0)──
  slot?: 'top' | 'bottom'                    // 画到哪个面板;默认 bottom
  portrait?: { icon: number; side: 'left' | 'right' }  // 头像 chunk + 左/右;省略 = 无头像
  cursorFrame?: 0 | 1 | 2                    // 等键光标形态(0 默认/1/2);省略=0。原版 `(`/`)` 控制符→此字段
}
```

> **实现回填(2026-06-27)**:slot 共存 + cursorFrame 已落地(reforge `dialog/`)。关键交互规则:
> - **autoAdvance 尾停顿不可加速**(sdlpal §Bug3 真值):打字中按 space = 跳字瞬显(fUserSkip);**打完进入尾停顿后按 space = noop,必须等时间到**。有 autoAdvance 的段**不画光标**(不等键,不误导)。
> - **分页按显示行算**(每段独立 layoutLines 折行,每页 ≤4 显示行);一段长独白跨页时**每页都带该段姓名/头像**(同句跨页常驻)。
> - **头像加载简化**:fetch `/extracted/images/portraits/XX.png` → `Image` → `drawImage`(无需 indexed 解码);位置 spec §3(bottom 右 270 / top 左 48),有头像时正文 x 缩进。
> - slot 由 `dialog/slot.ts` 纯状态机管(同槽覆盖/异槽共存/activeSlot),每槽渲染态(displayLines/pageStart)在 DialogBox。

**slot 生命周期(demo 够用的最简语义)**:
- 同 slot 连续句 = **翻页覆盖**(旧句被新句替换)
- 不同 slot = **共存**(前一 slot 内容留显,新 slot 成活跃)
- 推进(按键)= 推进当前**活跃句**;留显的 slot 不动
- 对话结束 = 清所有 slot
- **复杂清屏编排**(任意时点清某 slot、黑屏叠字…)留**演出系统**(P0 §6 timeline action),不塞对话数据

**位置「自动 vs 手动」统一在创作期、不在运行时**(2026-06-27 拍板):
- 运行时**只忠实渲染数据里的 slot**(确定、可调试、编辑器可视)
- 「按说话人自动定位」是**编辑器 / 迁移器的便利规则**(A→top、B→bottom、同人连续→同 slot),自动**填出显式 slot 数据**,仍可看 / 改 / 覆盖
- **杜绝「运行时猜说话人→位置」的隐式魔法**(违 D13 / 铁律)。原版「上下共存」只是 framebuffer 不清屏的副作用,这里做成显式 slot

- **颜色**不进字段——走 locale 富文本标记(① 已定),`text-render` 解析 spans 着色。
- 行级可覆盖为编辑器逐句可调 + demo 仪表盘;真实剧情通常整段一致。

## 5. 鬼话 = 完整仪表盘(特性分配)

鬼话**保留剧情主线**,**加一个「远处的鬼」搭腔**(为验证双框共存),每句配不同展示参数 → 覆盖全部技术点。**⚠ demo 验证样本(D12),真实内容不会这么花**:

| 句 | speaker | text(示例,可调) | slot | portrait | speed | 颜色 | 推进 |
|---|---|---|---|---|---|---|---|
| 0 | 游魂 | ……活人气味……可不该有活人啊…… | bottom | 右 | 默认 | 「活人气味」**黄** | 翻页·光标 f0 |
| 1 | 游魂 | 南边……来过个使刀的侠客……仗义的…… | bottom | 右 | **慢** | 「使刀的侠客」**青** | 翻页·光标 f1 |
| 2 | **远处的鬼** | (远处)那使刀的……我也念叨过……煞气冲天…… | **top** | **左** | 默认 | 「煞气冲天」**红** | 翻页·光标 f2 |
| 3 | 游魂 | 咳,名字?鬼啊,只记得自己怎么死的…… | bottom | 右 | **快** | — | **自动播放** |
| 4 | (旁白) | (李逍遥心头一动:……使刀的侠客……) | bottom | **无** | 默认 | 「使刀的侠客」青 | 结束 |

**双框共存的关键**:句2「远处的鬼」画 **top**,此刻 bottom 还留着游魂句1 → **上下同屏共存**;句3 游魂回 bottom(覆盖句1),top 的远处鬼**留显** → 继续共存,直到句4 结束清所有 slot。

> **实现落地(2026-06-27)**:鬼话仪表盘已在 `packages/content/src/index.ts` 配齐(slot/portrait/cursorFrame/speed/autoAdvance)+ `locale.ts` 颜色标记。与上表差异:句2 文案改为**超长独白**(110字,为验证"单段多页翻页 + 翻页只翻活跃槽");句3 `autoAdvance: 800`(800ms 尾停顿,不可加速)。头像用原版 chunk1/2 **占位**(鬼气专属立绘等生图管线)。

**覆盖核对**:颜色 黄/青/红 ✓;速度 默认/慢/快 ✓;自动播放 ✓(句3);光标 f0/f1/f2 ✓;翻页 ✓;姓名牌 游魂/远处的鬼/无(旁白)✓;头像 右/左/无 ✓;slot top/bottom + **双框共存** ✓;打字 全程 ✓。

## 6. 资产加载(reforge assets 扩展)

端口第一阶段加载逻辑,reforge 用 `fetch` + Canvas:
- **字模**:`/extracted/data/font/glyphs.json`(Unifont,① 用过结构)→ `loadGlyphs`
- **光标**:`/extracted/data/dialog-icons-raw.json` → base64 → `parseSpriteChunk` → frame 0/1/2(DialogSprite:indices+opaque)→ bake
- **头像**(占位):`/extracted/data/portraits.json` + PNG → 选一个 chunk 占位(具体号 plan 时定)

## 7. 实现切分(给 plan 的阶段提示)

② 内部建议顺序(每步可单独验)：
1. `text/glyph.ts` + `text-render.ts`:字模 bake + renderText + 三层阴影(纯函数 + 离屏 canvas,可单测 bake)
2. 打字动画(performance.now 驱动 charsShown)
3. `dialog/dialog-box.ts`:框 / 姓名牌 / 正文多行 / 分页位置(bottom 先)+ 从 main 拎出
4. 颜色着色(locale 富文本 → spans → 逐段色)
5. 光标(加载 + 画行末 + 6 色轮转)+ 自动播放
6. slot 模型(`DialogueLine` 加 `slot`/`portrait`)+ **多 slot 共存渲染**(top/bottom 独立状态 + 留显/活跃)+ 头像(占位 + 左/右)+ top 布局
7. 鬼话仪表盘参数落地 + 浏览器验全部特性

## 8. 留后(不在 ②)

- narration / item-box / 死亡文本 / 旁白 —— [D13](../decisions.md) 各归各系统,复用 `text-render`
- center 布局、选项分支(演出层)
- 头像鬼气立绘(先占位)
- 原版彩色对话的迁移 —— ③ 迁移器
