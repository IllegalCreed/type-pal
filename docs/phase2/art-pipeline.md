# 美术资产生图管线（art-pipeline）

> 第二阶段美术资产怎么生产。**这份文档的核心目的：消除"没有美术能力=第二阶段完蛋"的恐惧。** 查证表明这是假危机。
> 最后查证：2026-06-25

---

## 核心结论（先看这个）

**"做仙剑扩展内容必须能产出全新多帧动画精灵"——这个前提是错的。** 因此"完蛋"的结论不成立。

真实图景：

| 资产类型 | 占比 | 生产方式 | 要新做吗 |
|---|---|---|---|
| NPC / 怪物精灵（绝大多数） | ~85% | **复用原版 sdlpal 资源 + 改 PAL 调色板** | 不用新做 |
| 静态图（道具图标、立绘、CG、地图图块） | ~10% | **复用 big-ppt 生图架构**（已验证可行） | 现成能力 |
| 需要全新多帧动画的精灵 | ~5%（甚至为 0） | AI 出 sprite sheet（见下）或复用改色 | 多数情况避免 |

**关键洞察**：仙剑一扩展的主角是**李逍遥本人**——直接用原版精灵，不换皮。新内容 90% 是"原版素材改色/改数据"。真正需要全新动画美术的场景，可能根本到不了。

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

## 四、动画（曾经的"完蛋点"，其实有现实路径）

### 4.1 先认清：仙剑一扩展大概率不需要新动画精灵

- 主角 = 原版李逍遥（不换皮）→ 用现成动画
- 战斗怪物 → 原版鬼怪精灵 + 改色（sdlpal 资源库几十种）
- NPC → 多数是站桩 + 对话头像，原版几百个够用
- 道具/地图 tile → 静态，生图即可

**真正需要"全新多帧动画"的场景，可能为零。**

### 4.2 如果真要做新动画精灵，AI 已有成熟方案（2026 查证）

| 方案 | 说明 | 来源 |
|---|---|---|
| **AI sprite sheet 生成器** | 上传一张角色图 → 选动作（walk/idle/attack）→ 自动生成多帧 sprite sheet | [spritesheets.ai](https://www.spritesheets.ai/)、[LlamaGen](https://llamagen.ai/ai-pixel-art-generator)（30 秒出完整动画） |
| **ComfyUI 工作流** | 像素风 + sprite sheet 直出 | [知乎实战](https://zhuanlan.zhihu.com/p/1966420000517656707)、[B站教程](https://www.bilibili.com/video/BV1ds4y1Y7Qj/) |
| **学术方案** | Sprite Sheet Diffusion（扩散模型直接生成可动画精灵） | [arXiv:2412.03685](https://arxiv.org/html/2412.03685v2) |
| **专用平台** | PixelLab（文本→像素游戏资产）、Scenario（参考图+文本） | [PixelLab](https://www.pixellab.ai/)、[Scenario](https://www.scenario.com/blog/ai-sprite-generator) |

**工作流**：AI 出关键帧 / 概念图（gpt-image + anchor）→ sprite sheet 生成器拆帧补动画 → Aseprite 手动微调（可选）。

**结论**：动画不是"做不了"，是"有工具链，但成本比静态图高，且当前阶段大概率用不上"。**不构成第二阶段阻塞。**

---

## 五、建议的生产顺序（数据先行）

1. **现在**：内容 schema 里给每个美术资产加 `art_description` 字段（描述视觉）。数据先行，不需要图。
2. **引擎跑通后**：搭静态生图管线（复用 big-ppt openai-image + 改 styleHint/anchor/落点）。产出：道具图标、立绘、地图 tile、概念图。
3. **需要时**：复用改色覆盖 NPC/怪物精灵（sdlpal PAL 文件操作，不需 AI）。
4. **真要做新动画精灵时**：再上 sprite sheet 生成器（第四节）。大概率到不了这步。

---

## 六、待办（不阻塞，引擎跑通后做）

- [ ] 把 big-ppt 的 `openai-image.ts` 迁移到本项目（或作为共享 package）
- [ ] 写像素风版 `buildStructuredImagePrompt`（改 styleHint/palette/anchor）
- [ ] 写降采样后处理脚本（大图→像素小图→调色板量化）
- [ ] 选一张原版精灵作 anchor 测试风格一致性
- [ ] 内容 schema 加 `art_description` 字段（这个现在就能做）

## 参考资源

- [PixExact — AI 游戏素材工作流](https://www.pixexact.com/zh/use-cases/game-assets)
- [Midjourney 像素风提示词](https://zhuanlan.zhihu.com/p/1893698293130847170)
- [Stable Diffusion 像素美术方法](http://www.gamelook.com.cn/2023/05/516727/)
- [spritesheets.ai — sprite sheet 生成](https://www.spritesheets.ai/)
- [LlamaGen — 30 秒 sprite 动画](https://llamagen.ai/ai-pixel-art-generator)
- [arXiv:2412.03685 — Sprite Sheet Diffusion](https://arxiv.org/html/2412.03685v2)
- [2026 像素画生成工具盘点](https://www.sprite-ai.art/blog/best-pixel-art-generators-2026)
