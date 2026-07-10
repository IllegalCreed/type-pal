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
  - 瓦片动画、autotile/地形笔刷(RPG Maker 高级件,后续)。
  - 量化抖动算法(初版最近邻色距;观感不足由用户裁决后再迭代)。
  - AI 生图产 tileset(归 Codex Generation Owner 的独立任务)。

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
- Opus: agree(起草本卡;设计倾向见 Draft,设计题 1-4 待三方收敛)
- GLM: pending
- counter / 分歧处理:
- 缺签豁免: N/A
- build 准入结论: blocked(待 Codex + GLM 设计签字;设计题 1-4 三方收敛后方可 build)

### 进入 done 前:审查签字

- Codex: pending
- Opus: pending
- GLM: pending
- counter / 返工处理:
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计倾向(Opus 初稿)与待收敛设计题

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
