# 美术资产生图管线（art-pipeline）

> 第二阶段美术资产怎么生产。
> **双重目的**：① 消除"没有美术能力=第二阶段完蛋"的恐惧（假危机）；② 确认这是**商业化的硬约束**（真刚需）。
> 最后查证：2026-06-25

---

## ⚠️ 商业化约束（最重要的前提）

**原版仙剑的美术资产有版权（大宇/软星）。商业化发布时，所有面向玩家的美术资产必须自研。**

- 第一阶段忠实复刻用原版资产 → 合法（学习/研究/自用）
- 第二阶段一旦商业化 → **原版精灵/tile/音乐/文字必须全部替换成自研**，否则侵权
- 架构本质：**仙剑世界观（致敬，思想不受版权保护）+ 全自研美术/代码/文字 = 合法的独立商业游戏**

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

**静态资产和动画资产走同一条固定管线，不需要 ComfyUI。**

| 资产 | prompt | 后处理 |
|---|---|---|
| 静态（精灵/图标/tile/立绘） | 单图 prompt | 降采样 + 调色板量化 |
| 动画（精灵多帧） | sprite sheet prompt（N×M grid） | 降采样 + **切帧** + 调色板量化 |

两者共用 gpt-image 客户端 + anchor 风格锚定，只在 prompt 和后处理末尾分叉。

**关键修正**：之前文档说"动画要走 ComfyUI / sprite sheet 工具"——**错误**。实际是让 gpt-image 一次性生成整张 sprite sheet（多帧拼图），再代码切帧。ComfyUI 只在"精细骨骼动画"这种特例才用得上，而仙剑一扩展几乎用不上。

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

**游戏用途**：拿一张**原版仙剑像素图当 anchor**，后续生成的新怪/新 NPC 都按原版风格出。**这就是"像素风 LoRA"的更优雅替代——不需要训练 LoRA，用 anchor + vision 就够了。**

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

ComfyUI 真正不可替代的场景是"对已有精灵做精细骨骼动画 / 特定姿态 ControlNet 生成"。仙剑一扩展几乎用不上。**结论：ComfyUI = 可能永远用不上的备选，主流管线不依赖它。**

### 4.4 ⚠️ 待验证：斜 45° 俯视视角（作者提出的关键未知）

仙剑一是**斜 45° 棱形俯视视角**（isometric-ish），不是正面或侧面视角。gpt-image 能否准确生成这种视角的精灵/tile，**目前未知，必须实验验证**。

**实验计划**（商业化前必做）：
- 用 gpt-image 生成几张斜 45° 俯视的角色/地图 tile
- 对比原版仙剑的视角准确度
- 若 gpt-image 不擅长，备选：ControlNet 锁视角参考图、或人工后期修正视角

> 这是管线落地前最大的技术未知数。但不阻塞当前阶段——开发期用原版资产先跑通，实验可以后置。

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

## 参考资源

- [Developing Sprite Sheets with GPT Image 2 — OpenAI Community](https://community.openai.com/t/developing-sprite-sheets-with-gpt-image-2/1379831)
- [Turn ChatGPT Image 2 Sprites into a Real Game — Combos](https://combos.converge.ai/blog/turn-chatgpt-image-2-sprites-into-a-real-game-step-by-step)
- [Create Game-Ready Animated Sprites — @chongdashu](https://x.com/chongdashu/status/2047674244713099632)
- [PixExact — AI 游戏素材工作流](https://www.pixexact.com/zh/use-cases/game-assets)
- [Midjourney 像素风提示词](https://zhuanlan.zhihu.com/p/1893698293130847170)
- [Stable Diffusion 像素美术方法](http://www.gamelook.com.cn/2023/05/516727/)
- [comfyui-2d-character-pipeline (备选)](https://github.com/mor-o/comfyui-2d-character-pipeline)
- [2026 像素画生成工具盘点](https://www.sprite-ai.art/blog/best-pixel-art-generators-2026)
