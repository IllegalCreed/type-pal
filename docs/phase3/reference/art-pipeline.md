# 美术资产生图管线（art-pipeline，第三阶段输入）

> **现行边界（用户拍板，2026-09-03）**：版权素材的实际批量替换与生图/授权验收归第三阶段；
> 第二阶段只保证资源可导入、可替换、可追踪且工程自包含。本文保留为第三阶段规划输入，不是第二阶段
> 退出条件或当前 build authority。现行待办归属见
> [第三阶段版权资源替换](../backlog.md#0-发布与版权资源替换)。
>
> 第三阶段美术资产怎么生产。
> **双重目的**：① 消除"没有美术能力=第二阶段完蛋"的恐惧（假危机）；② 确认这是**商业化的硬约束**（真刚需）。
> 最后查证：2026-06-25

---

## ⚠️ 商业化约束（最重要的前提）

**原版仙剑的美术资产有版权（大宇/软星）。商业化发布时，所有面向玩家的美术资产必须自研。**

- 第一阶段忠实复刻用原版资产 → 合法（学习/研究/自用）
- 第三阶段若进入商业化发布 → **原版精灵/tile/音乐/文字必须全部替换成自研或获授权素材**，否则侵权
- 架构本质：**仙剑世界观（致敬）+ 全自研美术/代码/文字** —— 但「自研美术」**不自动 =「合法商业游戏」**。⚠️ 真正的法律风险主要在**名字 / 角色 / 剧情 /「仙剑奇侠传」商标**（受保护的表达，不是「不受保护的思想」）；换掉美术清不掉这层，带原创美术的商业同人照样可能被发函下架。**商业化前必须先走通 IP 这条路**（拿授权 / 届时换成自有 IP 皮 / 或保持非商业免费），别把计划全押在「能卖」上。开发期（学习 / 自用）当下无虞。

**因此：素材制作管线不是"锦上添花"，是"从复刻走向原创的必经门槛"。** 它在路线图里必须有明确位置：

| 阶段 | 美术资产 | 生图管线角色 |
|---|---|---|
| 开发期（现在） | 用原版资产跑通玩法/剧情 | **不急**，管线可后搭 |
| 商业化前 | **必须全部替换成自研** | **刚需**，发布前必须完成 |

> 所以管线"现在不急，但商业化前必须完成"——既不是越早越好，也不是永远可推迟。

---

## 核心结论

**"没有美术能力=第二阶段完蛋"——这个恐惧是假的。** 原因：

1. **开发期不需要新美术**：主角是李逍遥（用原版精灵不换皮），新内容 90% 是原版素材改色/改数据。
2. **商业化期有现实路径自研美术**：AI 生图（gpt-image）能力已足够，且你有 big-ppt 现成架构。

### 技术结论（2026-06-25 修正版）

**静态资产走单图固定管线；动画走 sprite sheet 直出 + 切帧——能试，但帧一致 / 视角是难点，ComfyUI / ControlNet 可能才是稳的那条（见 §四.3、§七 校准）。**

| 资产 | prompt | 后处理 |
|---|---|---|
| 静态（精灵/图标/tile/立绘） | 单图 prompt | 降采样 + 调色板量化 |
| 动画（精灵多帧） | sprite sheet prompt（N×M grid） | 降采样 + **切帧** + 调色板量化 |

两者共用 gpt-image 客户端 + anchor 风格锚定，只在 prompt 和后处理末尾分叉。

**关键修正**：之前文档说"动画要走 ComfyUI / sprite sheet 工具"——**部分对**：静态确实不用 ComfyUI；但动画让 gpt-image 一次生成整张 sprite sheet 再切帧，**只是「能试」，不是「稳了」**——gpt-image 直出 sheet 最易翻车，ComfyUI / ControlNet 可能才是动画稳定的关键（见 §四.3、§七 校准）。

---

## 一、可直接复用的能力（big-ppt 已验证）

### 1.1 双路 OpenAI 生图客户端

来源：`/Users/zhangxu/workspace/big-ppt/packages/agent/src/llm/openai-image.ts`

- **路 A**：`POST /v1/responses` + `gpt-5.5` + `image_generation` 工具 → 带 reasoning 自动改写 prompt + LLM 决定何时出图（OpenAI 推荐路径）
- **路 B**：`POST /v1/images/generations` + `gpt-image-2` → 兜底，简单稳定
- **降级链**：路 A 失败 → 路 B → 抛错。401/403 fail-fast，429 限流处理，AbortSignal 取消
- **hybrid 模式**：透传 base64 参考图，让 vision 模型看原图再生新图（**这就是风格锚定的基础**）

**迁移结论**：错误处理和降级链**原样照搬**，游戏这边不用重写。

### 1.2 结构化 prompt 注入（最关键的资产）

来源：`big-ppt` 的 `buildStructuredImagePrompt` 函数

它做的事：**不让 LLM 自由发挥，在工具层强制注入"风格不变量"**：
- 色板（palette hex 列表）
- 风格关键词（styleHint）
- 中文 label 约束
- 边界约束（avoid 清单）

解决的问题：**风格一致性**——AI 生图最大的毛病是每次风格漂移，这个函数强制所有调用共享同一份 invariants。

**游戏美术的最大痛点恰恰就是风格一致性**（所有精灵要像同一个游戏的）。这个函数是解药。

### 1.3 anchor（参考图）hybrid 模式 = 风格锚定

big-ppt 的能力：用户选一张参考图，后续生成都按参考图风格出。

**游戏用途**：拿一张**原版仙剑像素图当 anchor**，后续生成的新怪/新 NPC 都按原版风格出。**但别高估它**：anchor + vision 只给**松散的风格影响**，锁不住几百张资产间的严格一致（调色 / 光影 / 像素粒度 / 比例都会漂），是个**合理起点**、不是 LoRA 的等价替代。big-ppt 做幻灯片配图，一致性要求比游戏低一档（配图各自独立；游戏精灵要并排同屏、tile 要无缝拼）。**真实预期**：要「像同一个游戏」，大概率仍需训一个**小风格 LoRA**或接受可观重抽 / 修补。**一致性是整条管线最该盯、且尚未解决的点**（详见 §七）。

---

## 二、游戏美术 vs 幻灯片配图的差异（要改的）

| 维度 | 幻灯片（现状） | 游戏像素美术（目标） | 改动 |
|---|---|---|---|
| 输出尺寸 | 1536×720 大图 | 像素精灵小（48×48 / 32×32 等） | 加**降采样后处理** |
| 风格 | 扁平商务/插画 | 仙剑 DOS 像素风（受限调色板） | 改 anchor + styleHint |
| 透明背景 | 不需要 | **必须**（精灵叠地图上） | gpt-image 原生支持 `background: transparent` ✅ |
| 落点 | slide frontmatter | 资源目录 + 索引 | 改 createAsset 落点 |
| 帧动画 | 单张静态 | 多帧（走路/待机/攻击） | 见第四节 |

### 降采样后处理（关键步骤）

AI 模型在 16×16 这种极小尺寸上表现差（[搜索结论](https://top.aibase.com/tool/pixel)）。正确做法：

```
大尺寸像素风图（如 512×512，带 pixel art 提示词）
  → 最近邻降采样到目标尺寸（48×48）
  → 受限调色板量化（映射到仙剑原版 PAL 的子集）
  → 输出
```

可写一个 Canvas 脚本完成，或用 Aseprite 导入缩放。

---

## 三、生图提示词模板（像素风版）

参考 [Midjourney 像素风提示词](https://zhuanlan.zhihu.com/p/1893698293130847170) + big-ppt 结构化 schema。游戏版的 `buildStructuredImagePrompt` 应注入：

```
Use case: game-asset-pixel-sprite
Asset type: RPG character sprite, DOS-era pixel art style (仙剑奇侠传 1995)
Primary request: {art_description}   ← 来自内容 schema 的字段
Visual style: 16-bit pixel art, limited palette (≤32 colors), 
              dithering, hard pixel edges, retro JRPG aesthetic.
              MUST match the attached reference sprite's style exactly
              (same palette, same shading, same level of detail).
Color palette: {原版 PAL 子集 hex}
Composition: centered, facing forward/side, transparent background.
Avoid: anti-aliasing, smooth gradients, 3D shading, photo-realism, 
       text, watermark, modern illustration style.
```

**`art_description` 字段**：内容 schema 里每个美术资产都应有这个字段，它是生图的提示词来源。定义内容数据时顺手写，将来生图直接读。

---

## 四、动画（gpt-image sprite sheet + 切帧，不需要 ComfyUI）

> ⚠️ 2026-06-25 修正：之前版本写"动画要走 ComfyUI / sprite sheet 工具"——**错误**。实际方案是让 gpt-image 一次生成整张 sprite sheet，再代码切帧。ComfyUI 不是必需。

### 4.1 先认清：仙剑一扩展大概率不需要新动画精灵（开发期）

- 主角 = 原版李逍遥（不换皮）→ 用现成动画
- 战斗怪物 → 原版鬼怪精灵 + 改色（sdlpal 资源库几十种）
- NPC → 多数是站桩 + 对话头像，原版几百个够用
- 道具/地图 tile → 静态，生图即可

**开发期真正需要"全新多帧动画"的场景，可能为零。**（但商业化期替换资产时，新动画需求会上升——见 §商业化约束）

### 4.2 真要做动画时的方案：gpt-image sprite sheet + 代码切帧

**核心方法**（OpenAI 社区 + 多个实战教程一致）：

```
1. 给 gpt-image 一个 sprite sheet prompt：
   "a 4-frame walk cycle sprite sheet, 2x2 grid, 
    each cell 64x64, pixel art, transparent background, 
    [角色描述]"
   ↓
2. gpt-image 返回一张大图，内含 2×2 网格的 4 个走路姿势
   ↓
3. 代码用 Canvas 按网格 crop，切成 4 张独立帧
   ↓
4. 每帧走 §二的降采样 + 调色板量化，落到资源目录
```

**关键点**：
- 第 1 步 = 你 big-ppt 的 `generateImage`，现成。
- 第 3 步 = ~20 行 Canvas crop 脚本，和静态图的后处理一样简单。
- **静态和动画共用同一条管线**，只在 prompt 和后处理末尾分叉。

**网格尺寸参考**（[@chongdashu 实测](https://x.com/chongdashu/status/2047674244713099632)）：10 帧动画用 512×1280 的 2×5 grid。

来源：[OpenAI 社区·sprite sheets with gpt-image-2](https://community.openai.com/t/developing-sprite-sheets-with-gpt-image-2/1379831)、[Combos 实战教程](https://combos.converge.ai/blog/turn-chatgpt-image-2-sprites-into-a-real-game-step-by-step)

### 4.3 ComfyUI 的定位（备选，非必需）

ComfyUI / ControlNet 的真正价值在**锁姿势、锁视角、锁角色一致**——这恰是动画（多帧同人同对齐）和斜 45° 视角最难处。所以「几乎用不上」**下早了**：gpt-image 直出 sprite sheet 是**最薄、最易翻车**的一环（角色逐帧漂、帧不对齐、凑不成循环，多半要重抽或手修），ControlNet 很可能正是让动画 / 视角**稳定**的那个工具。

**取舍先知道**：好走的路（gpt-image 直出 sheet）不稳；稳的路（ControlNet）要么走**云端 API**（Replicate/fal，按次收费但不用本地 GPU、可进编辑器），要么本地 ComfyUI（最强但有学习 / 运维负担）。不是「用不上」，是「到动画 / 视角这步，大概率得在这两条里选一条」。

### 4.4 ⚠️ 待验证：斜 45° 俯视视角（作者提出的关键未知）

仙剑一是**斜 45° 棱形俯视视角**（isometric-ish），不是正面或侧面视角。gpt-image 能否准确生成这种视角的精灵/tile，**目前未知，必须实验验证**。

**实验计划**（商业化前必做）：
- 用 gpt-image 生成几张斜 45° 俯视的角色/地图 tile
- 对比原版仙剑的视角准确度
- 若 gpt-image 不擅长，备选：ControlNet 锁视角参考图、或人工后期修正视角

> 这是管线落地前最大的技术未知数，**风险要往上调**：它很可能就是那个**逼你上 ControlNet 或手工修视角**的点，可能改变管线选型——所以是「可能改变方案的关键实验」，不是「确认一下」。但仍不阻塞当前阶段——开发期用原版资产先跑通，实验后置。

---

## 五、建议的生产顺序（数据先行，商业化前闭环）

1. **现在（开发期）**：内容 schema 里给每个美术资产加 `art_description` 字段。用原版资产跑通玩法/剧情。生图管线不急。
2. **引擎跑通后**：搭静态生图管线（复用 big-ppt openai-image + 像素风 styleHint/anchor/落点）。先做斜 45° 视角实验（§4.4）。
3. **静态验证可行后**：扩展到动画（sprite sheet + 切帧，§4.2）。
4. **商业化前**：用自研资产**全量替换**原版资产。这是发布的硬门槛。

---

## 六、待办

- [ ] 内容 schema 加 `art_description` 字段（现在就能做，开发期即用）
- [ ] **斜 45° 视角实验**（商业化前必做，是最大未知数）
- [ ] 把 big-ppt 的 `openai-image.ts` 迁移到本项目（引擎跑通后）
- [ ] 写像素风版 `buildStructuredImagePrompt`（改 styleHint/palette/anchor）
- [ ] 写降采样 + 调色板量化后处理脚本
- [ ] 写 sprite sheet 切帧脚本（Canvas crop）
- [ ] 选一张原版精灵作 anchor 测试风格一致性
- [ ] 商业化前：全量资产替换计划

---

## 七、补充（2026-06-25 复核）：编辑器解耦 · 无需手工修像素 · LoRA 数据 · 决策规则

> 本节是与作者复核后的校准。与前文（尤其 ComfyUI / 一致性的乐观表述）如有出入，**以本节为准**。

### 7.1 美术生成与编辑器解耦（别把生成焊进编辑器）

- **编辑器只「消费」资产**：实体指 `sprite: ghost-01`，编辑器从 `assets/` 读图显示，不关心图怎么来。
- **美术「生产」是另一回事**：离线、偶尔跑一次。可以是 CLI 调 gpt-image、ComfyUI 手搓、或将来编辑器加按钮调云端——**三者随便换，编辑器一行不动**。
- `art_description` 字段 + `assets/` 目录**就是这条接缝**。守住「编辑器只读成品」这一条纪律，所有生成方案都留着。
- 推论：**ControlNet 也能进编辑器**——用云端 API（Replicate/fal）即可，调用形状同 OpenAI 客户端，还绕开本地 ComfyUI 的学习 / 运维。「进不了编辑器」只对**本地 ComfyUI GUI** 成立，而那只是离线出 PNG 丢进目录，照样不挡编辑器。

### 7.2 不需要手工修像素（关键，别被「像素美术」吓住）

把 AI 出图变成干净像素图那步 = **降采样 + 调色板量化 = 一个脚本，自动跑**（即 §二那条 Canvas 脚本），不是手抠像素。整条路：

```
AI 出图(gpt-image 或 SD+LoRA) → 脚本自动降采样+量化 → 成品
```

出得不好 = **重抽（regenerate），不是手修**（点一下、几毛钱，零像素功底）。
**诚实天花板**：成品是「扎实、够用、风格统一的 AI 像素风」，不是逐像素手作精品——对同人 / 独立游戏是完全体面的标准。

### 7.3 LoRA 数据够不够：远远够

- 风格 LoRA **吃数据少**：几十张代表性图即可，多了更好。仙剑提取的精灵 / tile / 头像有**几百上千张**——数据不是瓶颈，挑 30~100 张干净、能代表风格的子集即可。
- 训出的 LoRA = 「仙剑像素风」风格插件；给新内容（如 DLC-01 新鬼魂）prompt 描述即按风格出图。
- ⚠️ 法律：拿**原版美术**训 LoRA，开发 / 自用没问题；**商业化**理想是训在**自有风格**上而非原版（呼应 §商业化约束）。
- gpt-image 这边**装不了自训 LoRA**（OpenAI 不开放；LoRA 在 Stable Diffusion 生态，云端 Replicate/fal 可跑）。要「紧」的一致性 → SD+LoRA；要「快 / 省 / 单张」→ gpt-image。

### 7.4 决策规则（不用现在做）

1. **静态资产**：gpt-image + 清理脚本起步——零训练、云端、最省事，多半够。
2. **风格漂成墙**时：加一个**风格 LoRA**（Replicate/fal 云训云跑，「传图、点训练」，无需本地 GPU、无需修像素）。
3. **动画 / 斜 45°**：真难的两块，推迟；到时云端 ControlNet 或接受重抽。
4. **想去掉猜测**：拿一张原版精灵当 anchor 跑 10 张图小实验，一致性 + 45° 当场见真章。

## 八、资产交付:散文件 vs 雪碧图(atlas)(2026-06-29,scale-up 记录)

> 起因:状态板/装备菜单的物品图标现在是散 PNG(`/ui/items/{bitmap}.png`),作者问散文件会不会开销太大。

- **现状**:`bake-assets` 把每个 UI sprite / 图标烤成独立 PNG(box / num / cursor / items …,`public/ui/` 现 ~70 文件,tracked)。demo 量级**没问题**。
- **scale 隐患**:满内容(234 件物品 + 全套 UI sprite + tile)= 几百个小文件 → 请求数多、SW 预缓存清单膨胀、缓存碎片。
- **解法(长期)= atlas**:`bake-assets` 输出**一张大图 + `{key:{x,y,w,h}}` manifest**;加载器 fetch 一次、`drawImage(atlas, sx,sy,sw,sh, …)` blit 子矩形(connect 全套 UI sprite + 图标一起打)。
- **关键:数据模型 atlas 无关**。`ItemData.icon = bitmap 号`、菜单渲染逻辑都不动;只换 **bake 输出格式 + 加载器**两处 → 局部可换实现,**不是重构**。
- **何时做**:全量迁移 234 件物品 / 编辑器要批量图标时。**现在 YAGNI**(demo 7 图标;且已有 SW 预缓存一次性下载 + HTTP/2 多路复用兜底,散文件短期不致命)。

## 参考资源

- [Developing Sprite Sheets with GPT Image 2 — OpenAI Community](https://community.openai.com/t/developing-sprite-sheets-with-gpt-image-2/1379831)
- [Turn ChatGPT Image 2 Sprites into a Real Game — Combos](https://combos.converge.ai/blog/turn-chatgpt-image-2-sprites-into-a-real-game-step-by-step)
- [Create Game-Ready Animated Sprites — @chongdashu](https://x.com/chongdashu/status/2047674244713099632)
- [PixExact — AI 游戏素材工作流](https://www.pixexact.com/zh/use-cases/game-assets)
- [Midjourney 像素风提示词](https://zhuanlan.zhihu.com/p/1893698293130847170)
- [Stable Diffusion 像素美术方法](http://www.gamelook.com.cn/2023/05/516727/)
- [comfyui-2d-character-pipeline (备选)](https://github.com/mor-o/comfyui-2d-character-pipeline)
- [2026 像素画生成工具盘点](https://www.sprite-ai.art/blog/best-pixel-art-generators-2026)
