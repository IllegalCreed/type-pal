# W7B - tileset 库:自有瓦片图集(上传 → 量化贴盘 0 → 入库可选)

Status: draft
Phase: phase2
Capability: W7b(与 A4 素材导入交集)
Coding Owner: 待三方设计签字后由用户指定
Generation Owner: N/A(作者上传素材;AI 生图另立任务归 Codex)
Reviewer: 三方(新能力格 + 资产管线,必审)
Visual Verification Owner: 实现方自验 + Opus 复验(量化观感属像素级)
Unavailable Agents: none
Branch: main

## 目标

自有地图摆脱「借用原版 tileset 号」:建立 tileset 资产库 —— 作者上传 PNG 瓦片图集,
编辑器切片、**量化贴合调色板 0**(已拍板机制:全彩素材近似到盘 0 色域求风格统一,
同 RNG/立绘烘焙路线),入库登记后可绑定到任意自有地图作画;原版 tileset 成为库里的
内置条目(借用路径迁为注册表引用)。

## 范围

- 范围内:
  - Tileset 注册表 schema(content 校验)+ 内置原版条目(现 `tileset/<n>.rle` 借用
    迁为注册表 id 引用,零视觉变化)。
  - PNG 上传 → 切片 → 量化贴盘 0 → 存工程 assets + 登记(全流程浏览器端,FSA 落盘)。
  - 渲染消费自有 tileset(RGBA baked 路径;原版 .rle 索引路径保留)。
  - tileset 库 UI(列表/分类/上传/切片与量化预览)+ 地图模式绑定切换。
  - OwnMap.tileset 引用形态随注册表定案(设计题 3)。
- 范围外 / 明确不做:
  - per-tile 高度/属性**编辑 UI**(schema 留字段,渲染按缺省 1;编辑后续卡)。
  - 瓦片动画、autotile/地形笔刷、图章(stamp)成组摆放(RPG Maker/Tiled 高级件,后续;
    autotile 服务套件型素材、stamp 服务整图切片型素材,见下方法论)。
  - 量化抖动算法(初版最近邻色距;观感不足由用户裁决后再迭代)。
  - AI 生图产 tileset(归 Codex Generation Owner 的独立任务)。

## 素材方法论(用户提问后定调,2026-07-10)

tileset 的创作路线有两条,W7B 管线通吃,差别只在上传的 PNG 装什么:

- **套件型(主力)**:先设计可复用单元(平铺瓦/8向过渡瓦/独立物件),再拼图 —— 复用率是
  设计出来的。素材来源:现成等距素材包;**AI 生图按套件生成**(生成任务的提示词要点:
  「可平铺等距瓦 + 过渡件」,严禁「生成大图再切」= 零复用陷阱)。
- **整图切片型(点缀)**:一次性地标/大物件,切片只是载入格式,不为复用,成组摆一次。
- 原版 PAL 即混合体(每图专属 tileset 但内部大量重复瓦):先画场景再 tile 化归并。
- 一张地图 = 套件铺底 + 地标点缀;后续增强件:autotile(套件爽用)、stamp(切片型不痛苦)。

## 上下文锚点

- 铁律:`docs/phase2/READ-FIRST.md`;调色板概念已退役 —— **不得暴露 palId 给作者**,
  量化目标「盘 0 色域」是内部机制不是用户概念(memory: no-palette-concept 再犯史);
  运行时方向 = 烘死 RGBA、零调色盘。
- 已拍板:上传全彩素材量化贴盘 0(用户 2026-07-09 重申「你还记得么」);tileset 按
  环境分类(用户提出);UI 照 RPG Maker/Tiled 惯例(授权惯例路线,形态分歧再问)。
- 现状代码锚点:
  - `packages/reforge/src/assets.ts` loadTilesetByPath(.rle → gzip → parseSpriteChunk
    → Map<number, RleFrame>);`render.ts` Canvas2DRenderer.bakedTile(RleFrame + 盘 0
    着色 → canvas 缓存)—— RGBA 路径可在此层直接给 baked canvas。
  - `packages/content/src/own-map.ts` OwnMap.tileset: string(现为资产相对路径)。
  - `packages/editor/src/ui/MapMode.tsx` 瓦片面板(TileThumb 吃 RleFrame + palette
    bakeFrame —— 需抽象成「已烘瓦片图像」)。
  - 工程自包含:资产落 `assets/`(P1-P4 生命周期;FSA writeFile 已支持 ArrayBuffer)。
  - 盘 0 数据:`assets/palettes/0.json`(256 RGB)。
- 不得重新引入:paletteId / 多盘概念;下标式身份(tileset 用稳定 id,不用数组下标)。

## 验收条件

- 功能:上传一张 PNG 图集 → 切片预览 → 量化预览 → 入库 → 新建/切换自有地图绑定它 →
  画瓦渲染正确;原版内置条目照旧可用;保存→重开 round-trip;reuse 场景零回归。
- 测试:注册表 schema 校验、切片几何、量化函数(色距/边界)、引用解析双路(内置 .rle /
  自有 PNG);全仓 pnpm check 绿。
- 文档:content-schema 补 tileset 节;capability-map W7b 状态更新。
- 视觉:量化前后对拍截图(观感由用户终裁);tileset 库 UI 全流程实测。

## 推进签字

### 进入 build 前:设计签字

- Codex: pending
- Opus: agree(起草本卡)+ **接受 GLM counter 并收敛终案**(2026-07-10):
  量化后落盘 = **索引格式**,渲染 = **单路**。核实 D25 原文后确认 GLM 引用准确,且判据行
  (decisions.md D25 补)明文「随场景盘变(精灵/**瓦片**)→ gzip 索引 + 运行时上色」;
  我起草时把「运行时零调色盘」(= 不暴露用户/不烘 RGBA)误延伸成「落盘 RGBA」,GLM 抓得对。
  终案比双方原案更简(见 Draft「收敛终案」):量化输出编码为**与原版 tileset 同构的
  .rle(gzip GOP 索引帧组)** —— D25 补² 实测证明 PLTE 索引 PNG 被每文件盘开销反超,
  gzip 共享盘索引才是正解;且 loadTilesetByPath/渲染/TileThumb **零改动**,
  「双路」概念整个消失,注册表 schema 随之再简化。待 GLM 对收敛版一句话复确认 + 用户拍板。
- GLM: **agree**（4 题逐个表态 + 1 条 counter 需三方收敛）。

  **题 1 注册表 schema：agree**。显式帧表（非隐式网格）正确——菱形瓦高度可变，网格切不动。category 字段对齐用户"按环境分类"诉求。内置原版条目用 `{ kind: "rle", path }` 借用、自有条目用 `{ kind: "atlas", image, frames }` 切片，判别联合干净。测试矩阵须覆盖：id 唯一校验 / 帧表界内校验 / 帧表 w/h=0 边界 / 内置与自有解析双路 / 注册表缺失 tileset id 报错。

  **题 2 渲染双路：agree（倾向 b）**。b（baked 瓦片图像抽象）正确——.rle 走现有 bake（索引+盘 0），PNG 图集直接切帧（已量化 RGBA），渲染器 bakedTile 之下无感知。测试须覆盖：baked tile 对齐（与旧 .rle bake 像素级等价）/ PNG 帧切片坐标越界报错 / baked canvas 缓存键。

  **题 3 引用形态：agree**。注册表稳定 id（非文件路径）符合铁律 #5（杜绝下标/路径当身份）。OwnMap.tileset 从 `"tileset/20.rle"` 改为 `"pal-20"` / `"grass"` 是正确迁移。测试须覆盖：旧自有地图 tileset 路径 → 注册表 id 迁移 / 缺失 id 报错。

  **题 4 量化算法：agree，但 ⚠ 有 D25 方针冲突需三方收敛（见下）**。

  **⚠ counter（量化存储格式 vs D25）**：设计题 4 写"量化在上传时一次性完成并**落盘**（烘死），运行时零转换"——但**落盘成什么格式**没写清。D25 方针第 2 条明文：「凡用盘 0 的已烘资源 → **存索引（1 字节/像素）+ 运行时共享盘 0 上色**，**不烘 RGBA**（4 字节/像素，膨胀 4×）」。

  如果量化后落盘成 **RGBA PNG**（设计题 2 倾向 b 的"PNG 图集天然 RGBA"暗示），那**违背 D25**——该存索引 + 共享盘 0，不存 RGBA。如果量化后落盘成**索引 PNG（palette PNG，1 字节/像素 + 嵌入 PLTE）或自定义索引格式**，则对齐 D25。

  **两种走法的差异**：
  - RGBA PNG（设计题 2 b 的自然结果）：简单（drawImage 直吃），但 4× 膨胀，违背 D25
  - 索引格式（D25 定案）：压缩（1 字节/像素），但渲染层要"索引帧 + 盘 0 → bake"（和现有 .rle 路径一致，反而统一了管线）

  **建议**：量化后存**索引格式**（对齐 D25），渲染双路 b 改为"自有 tileset 走和 .rle 同一条索引→bake 路径"——即 **渲染不是双路，是单路**（索引帧 + 盘 0 → bake，.rle 和 PNG 上传后殊途同归）。这比设计题 2 的"双路"更简、更对齐 D25。

  **需三方收敛**：量化后落盘是 RGBA 还是索引？这决定渲染层是双路还是单路。Opus 倾向 b（双路）可能没考虑 D25 的索引存储方针。

  **测试矩阵补充**：量化函数须覆盖——alpha<128→透明边界 / 全透明图 / 单色图（量化不变）/ 256 色图（精确命中盘 0）/ 超出色域图（最近邻近似度）。

  **终案复确认（2026-07-10）**：agree，无异议。Opus 收敛终案（量化落盘 = 原版同构 .rle gzip 索引帧组，非 PLTE PNG；渲染单路零改；schema 去 kind 联合与帧表）比 GLM 原建议更精确——"索引格式"是方向，".rle 同构"是精确落点（连 loadTilesetByPath 都不改，双路概念消失）。counter 闭环。

### 额度 / 代班记录(2026-07-10)

- 缺席 Agent: Codex(订阅额度耗尽,无法出具设计签字)
- 代班安排: 设计签字缺席标「待 Codex 补签」;若用户豁免,Opus+GLM 双签 + 用户拍板即可进 build。
  Coding Owner 按代班规则由 **Opus 全量代班**(编码/验证/git 收口;AGENTS.md 额度与代班节),待用户批准。
- 风险: 缺 Codex 的实现可行性视角 —— 缓解:终案已把实现面收缩到纯函数(量化+RLE 编码)
  与既有管线零改,可行性风险低;Codex 额度恢复后可补签/补审。
- 是否需要补签: 属三方必审(新能力格+资产管线),额度恢复后应补记。
- 用户裁决: pending

### 进入 done 前:审查签字

- Codex: pending
- Opus: pending
- GLM: pending
- counter / 返工处理:
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计倾向(Opus 初稿)与待收敛设计题

### 收敛终案(2026-07-10,Opus 接受 GLM counter 后修订;待 GLM 复确认 + 用户拍板)

**量化落盘 = 原版同构 `.rle`(gzip + GOP sprite chunk 索引帧组),渲染单路。**

- 上传管线:PNG → 切片(编辑器内帧表)→ 量化(RGBA → 盘 0 索引,最近邻,alpha<128→透明)
  → 编码 PAL RLE 帧组(shared rle.ts 解码器的逆,写编码器 + roundtrip 单测)→ gzip
  (CompressionStream)→ 落盘 `assets/tilesets/<id>.rle`。
- 加载/渲染:`loadTilesetByPath` **原样零改**(gzip → parseSpriteChunk → 索引帧 + 盘 0
  bake)—— 自有与原版 tileset **同格式同管线**,单路;TileThumb/bakedTile 全部原样。
- 注册表 schema 随之简化(修订题 1):source 无需 kind 判别联合、无需 frames 帧表
  (RLE 帧组自描述 w/h):

```jsonc
// content/tilesets.json
[
  { "id": "pal-20", "name": "原版·仙灵岛", "category": "builtin", "path": "tileset/20.rle" },
  { "id": "grass",  "name": "草地",       "category": "outdoor",  "path": "assets/tilesets/grass.rle",
    "tiles": [{ "height": 1 }] }   // per-tile 元数据(留字段)
]
```

- D25 对齐:第 2 条(存索引 1B/px,不烘 RGBA)✓;判据行(瓦片 → gzip 索引 + 运行时
  上色)✓;补²(不用 PLTE PNG,共享盘不进文件)✓;第 4 条(上传即量化,创作者零
  调色盘知识)✓。
- 分期修订:**B2 期(渲染/加载双路)取消** —— 併入 B1 为「注册表解析 + id→路径」;
  新 B2 = 量化 + RLE 编码纯函数(TDD,roundtrip 钉死);B3/B4 不变。
- GLM 补充的测试矩阵(帧表界内/量化边界五例/id 唯一/缺失 id 报错)全部纳入,另加
  RLE 编码 roundtrip(编→解 = 恒等)与 gzip 往返。

---

以下为起草时的原始设计题(题 2/4 已被上方终案取代,留档):

**设计题 1:Tileset 注册表 schema(倾向如下)**

```jsonc
// manifest.content.tilesets → content/tilesets.json
[
  { "id": "pal-20", "name": "原版·仙灵岛", "category": "builtin",
    "source": { "kind": "rle", "path": "tileset/20.rle" } },        // 内置:索引色路径
  { "id": "grass", "name": "草地", "category": "outdoor",
    "source": { "kind": "atlas", "image": "assets/tilesets/grass.png",
                "frames": [{ "x":0,"y":0,"w":32,"h":15 }, ...] },   // 自有:PNG 图集+帧表
    "tiles": [{ "height": 1 }, ...] }                                // per-tile 元数据(留字段)
]
```
- 帧表显式(切片时生成)而非隐式网格 —— 菱形瓦高度可变(cover 瓦更高),网格切不动;
  切片 UI 可先提供「等距网格 + 行高」快捷生成帧表。
- OwnMap.tileset 从路径改为**注册表 id**(设计题 3):`"tileset": "grass"`;
  loadSceneMap 经注册表解析 source。迁移:现存自有地图 tileset 路径 → 内置条目 id
  (无真实内容,直接切)。

**设计题 2:渲染双路(倾向 b)**
- a. 自有 PNG 量化后转 RleFrame 索引喂现有管线(单管线,但自造索引编码步骤别扭);
- b. tileset 加载层抽象为「id → baked 瓦片图像(canvas)」:.rle 走现有 bake(索引+盘 0),
  PNG 图集直接切帧(已量化,天然 RGBA)—— 渲染器 bakedTile 之下无感知,零调色盘方向。

**设计题 3:引用形态** —— 注册表稳定 id(倾向)vs 继续文件路径。id 符合杜绝下标/路径
身份的架构方向,且库 UI/绑定切换都以 id 为键。

**设计题 4:量化算法** —— 初版每像素最近邻(RGB 欧氏距离,alpha<128 → 透明);
不做抖动。量化在上传时一次性完成并落盘(烘死),运行时零转换。

**分期**(一卡四期,不换 Owner):
- B1 注册表 schema+校验+内置条目迁移(纯数据,零视觉变化);
- B2 渲染/加载双路(id 解析 + PNG 图集帧切 + baked 抽象);
- B3 上传/切片/量化 UI + 库页 + 地图绑定切换;
- B4 文档 + 闭环验收(上传→画→存→重开→渲染)。

### 已知风险

- 风险:量化观感(全彩照片类素材贴盘 0 可能脏)。缓解:量化预览步 + 用户终裁;
  算法可后续迭代(范围外声明)。
- 风险:TileThumb/渲染器对 RleFrame 的直接依赖扩散。缓解:B2 先立「baked 瓦片图像」
  抽象,面板与渲染器一并迁移;typecheck 扫全。
- 风险:上传文件名/尺寸不受控。缓解:注册表校验(id 唯一/帧表界内/图幅上限)+
  上传入口 clamp。
- 风险:UI 形态(库页 + 切片向导)是新形态延伸。缓解:照 RPG Maker 数据库页签 +
  Tiled tileset 面板惯例;形态分歧问用户。

### 审查方立场

- 主审:三方(新能力格 + 资产管线)。
- 是否建议进入 build: 待 Codex / GLM 设计签字(重点收敛设计题 1-4)。

## 交接日志

- 2026-07-10 Opus: 起草本卡(注册表 schema 倾向 + 渲染双路倾向 b + 量化定向 + 四期
  分期);W7c-4 尺寸编辑已另行交付(eded4bca),W7 地基侧无遗留。Evidence: 本卡。
  Next: Codex + GLM / 设计签字(收敛设计题 1-4)。
- 2026-07-10 GLM: 设计签字 agree + 1 counter(题 4 量化落盘格式 vs D25:应存索引非 RGBA,
  渲染可统一单路)。Evidence: 签字区 GLM 行。Next: Opus / 回应 counter。
- 2026-07-10 Opus: 核实 D25 后**接受 counter**,收敛终案 —— 量化落盘 = 原版同构 .rle
  (gzip 索引帧组,D25 判据行明文瓦片走此路;D25 补² 证明 PLTE PNG 反超),渲染单路零改,
  schema 再简化,B2 双路期取消。同步记录 Codex 额度耗尽缺席(代班安排见额度/代班记录)。
  Evidence: Draft「收敛终案」。Next: GLM / 复确认终案;User / 拍板终案 + 豁免 Codex 设计签 + 定 Owner。

## 下一位 Agent 提示词

```text
接手任务: W7B - tileset 库(上传 → 量化贴盘 0 → 入库可选)
任务卡: docs/ops/tasks/W7B-tileset-library.md
当前状态: draft(build 准入 blocked,Opus agree,待你设计签字)
你的角色: 设计签字(Codex:实现可行性/上传与 FSA 落盘/渲染双路工作量;
  GLM:schema 覆盖/测试矩阵/量化边界与文档风险)
先读: AGENTS.md;本卡全部(尤其 4 个设计题与分期);docs/phase2/READ-FIRST.md;
  packages/reforge/src/assets.ts(loadTilesetByPath)与 render.ts(bakedTile)。
已完成: Opus 起草 —— 注册表 schema 倾向(显式帧表)、渲染双路倾向 b(baked 抽象)、
  引用形态倾向 id、量化最近邻定向、B1-B4 分期。
请你做: 对 4 个设计题逐个表态(agree 或 counter+替代方案),整体签 agree / counter。
不要做: 不要开始实现(签字未齐);不要引入 paletteId/多盘概念(量化目标是内部机制,
  不暴露给作者);不要把 tileset 身份做成数组下标或裸路径。
输出要求: 签字写回本卡「进入 build 前:设计签字」你的行;由用户转达或有文件权限的
  一方代录。三签齐后用户指定 Coding Owner。
```
