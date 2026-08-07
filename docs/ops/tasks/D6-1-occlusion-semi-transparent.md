# D6-1 - 遮挡半透明（方案 A，议题 6）

Status: draft
Phase: phase2
Capability: 议题 6 遮挡现代化（P1 渲染 + P0 留位）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Kimi（视觉/渲染主审）+ GLM（场景遮挡覆盖矩阵）
Visual Verification Owner: Kimi
Unavailable Agents: none
Branch: TBD

## 目标

人物被前景（屋顶/树冠/山坡）遮挡时，前景按方案 A 半透明化（D27 已拍），玩家能看到角色位置；
schema 保证遮挡关系可判定。

## 范围

- 范围内:
  - 遮挡判定：实体与 occludesActors 瓦片/图层的关系（baseY 深度排序已对，补遮挡重叠检测）。
  - 被遮挡时前景 alpha 化：触发阈值（遮挡面积/距离）与透明度曲线，P1 渲染实现细节随观感定。
  - 触发/恢复无闪烁（阈值迟滞）。
- 范围外:
  - 描轮廓/剪影方案（已否，D27）。
  - 渲染 API 大改（沿用 Canvas 2D + alpha）。
  - 遮挡对演出（RNG/对话）的交互。
- 明确不做:
  - 不逐帧复刻原版遮挡观感（原版是「完全看不见」，本卡就是要改掉它）。

## 上下文锚点

- 已拍板决策 / 铁律:
  - D27（2026-08-06 用户拍板）：方案 A 前景半透明。
  - D4/D10：RGBA + Canvas 2D 渲染，alpha 为渲染一等能力。
  - 议题 4/6 方向：N 视觉层 + 遮挡关系可判定。
- 代码锚点:
  - `packages/reforge/src/render.ts:2`（baseY 深度排序）、`:295-346`（瓦片/精灵 alpha）。
  - `packages/reforge/src/main.ts:4529-4531`（实体 collide）、`:4304`（?collision 调试层）。
  - slice1-indoor spec `occludesActors=true` 瓦片层语义。
- 已知坑 / 审计文档:
  - 一阶段「视觉忠实 vs bug」教训：渲染观感以原版 runtime 为准——本卡是作者拍板的
    现代化偏离，验收以作者/Kimi 观感为准。
- 不得重新引入:
  - 全局「前景半透明」开关式的状态泄漏（只影响被遮挡区域）。
- 相关测试:
  - render 现有单测。

## 验收条件

- 功能:
  - 屋顶/树冠/山坡遮挡角色时前景半透明，角色可见；离开后恢复。
  - 无闪烁、阈值迟滞；脚本演出（对话/RNG）不破坏遮挡。
- 测试:
  - 遮挡判定单测（面积/距离/边界）；多场景遮挡覆盖矩阵（GLM）。
- 文档:
  - backlog 议题 6 状态更新；capability-map 渲染口径。
- 视觉 / 手工验证:
  - Kimi 浏览器实测代表性遮挡场景（屋顶/树/山丘）并排对比 + 手感确认。

## 推进签字

### 进入 build 前:设计签字

- Codex: agree（2026-08-07 设计冻结，见「设计结论」）
- Kimi: pending
- GLM: pending
- counter / 分歧处理: N/A
- 缺签豁免: N/A
- build 准入结论: blocked

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

**2026-08-07 冻结（Codex agree）**：

1. **复用现成遮挡关系，不新增检测算法**：render.ts 已按 `PAL_CalcCoverTiles` 逐 sprite
   算「会被哪些 cover 瓦片遮挡」（`coverTileCandidates`，render.ts:191-199，输入
   coverILayer/coverSortOffset），并在排序表里把那些瓦片画在 sprite 之后（正确遮挡）。
   半透明 = 把这些「已判定遮挡该角色的 cover 瓦片」以低 alpha 绘制（方案 A，D27），
   遮挡关系零新增计算。
2. **触发对象**：仅「角色类 sprite」（玩家/队员/跟随者/NPC，即有 coverSortOffset 的
   实体精灵）；纯静物 prop 的遮挡瓦片保持不透明（prop 被挡=正常遮挡，不触发前景透明）。
   具体以 SpriteDraw 的 coverSortOffset/来源实体区分，build 时按 main.ts 精灵构造点确认。
3. **呈现**：命中 cover 瓦片以常量 `OCCLUSION_ALPHA = 0.35` 绘制（集中一处定义，
   Kimi 视觉验收可调）；整块瓦片半透明（不做区域遮罩，v1 范围），base/地板层不受影响。
4. **迟滞防闪烁**：瓦片进出遮挡集合按 per-tile latch（进入后保持 alpha 120ms，
   防角色贴墙边缘抖动闪烁）；alpha 变化本身是瞬时切换（无过渡动画，v1 简单化，
   若视觉需要再加渐变）。
5. **性能**：coverTileCandidates 已是每帧既有计算，半透明只改 drawTile 的 alpha 参数，
   无新增每帧检测；迟滞用 Map<tileKey, untilMs>，规模=视口 cover 瓦片数，可忽略。
6. **范围重申**：不做描边剪影（D27 已否）、不做全局半透明、不做遮挡对演出
   （RNG/对话）的交互；`?collision`/debug 叠加层不受影响。

### 已知风险

- 风险: alpha 化破坏原版像素观感。
- 缓解: 透明度曲线可调 + Kimi/作者验收门禁。
- 风险: 贴墙边界闪烁。
- 缓解: per-tile 120ms 迟滞 latch;Kimi 视觉验收实测边界场景。
- 风险: 角色类与 prop 的区分误判（prop 也触发透明）。
- 缓解: 以 coverSortOffset/实体来源为判据,build 时核对 main.ts 精灵构造点,视觉验收抽验。

### 主审立场

- Reviewer: Kimi（视觉/渲染）+ GLM（遮挡场景覆盖）
- 结论: pending
- 必改项: pending
- 是否建议进入 build: pending

### 三方争议记录(按需)

- Codex: 2026-08-06 用户拍板方案 A（D27）后开卡。
- Kimi: pending
- GLM: pending

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件: pending；设计三签前不得开始实现。
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending（Kimi 视觉验收）
- 跳过的检查及原因: N/A

## 视觉验证记录(如适用)

- Visual Verification Owner: Kimi
- 验证方式: pending
- 截图 / 像素检查路径: pending
- 结论: pending

## Review: 审查与返工

- Reviewer: Kimi + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: pending

## 交接日志

- 2026-08-06 Codex: 用户拍板方案 A（D27）后开卡；reforge 深度排序/alpha 已具备，
  缺遮挡重叠检测与半透明实现。
- 2026-08-07 Codex: 设计冻结并签 agree。复用 coverTileCandidates 现成遮挡关系,把
  「已判定遮挡角色类的 cover 瓦片」以 OCCLUSION_ALPHA=0.35 绘制;仅角色类触发、prop
  不触发;per-tile 120ms 迟滞防闪烁;无新增每帧检测;不做遮罩/渐变/演出交互。

## 下一位 Agent 提示词

```text
接手任务: D6-1 遮挡半透明（方案 A）
任务卡: docs/ops/tasks/D6-1-occlusion-semi-transparent.md
当前状态: draft（build 准入 blocked；Codex 设计冻结并签 agree，见「设计结论」）
你的角色: Kimi 视觉/渲染主审；GLM 遮挡场景覆盖矩阵主审
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡、decisions.md D27、
  render.ts:2/191-199/295-346、main.ts:4206（精灵 coverILayer 构造点）、
  slice1-indoor spec occludesActors
已完成: Codex 设计冻结——复用 coverTileCandidates（PAL_CalcCoverTiles 移植）现成遮挡
  关系,把「已判定遮挡角色类的 cover 瓦片」以 OCCLUSION_ALPHA=0.35 绘制;仅角色类
  sprite 触发(prop 不触发);per-tile 120ms 迟滞防闪烁;无新增每帧检测
请你做: Kimi 压测触发对象判据(角色 vs prop)、alpha 常量与边界闪烁迟滞、整块瓦片
  半透明的观感;GLM 复核遮挡场景覆盖矩阵与回归样例;
  冻结方案后 agree/counter
不要做: 不得修改实现文件；不得重开方案 B；不得把半透明做成全局开关状态
输出要求: 更新设计签字、主审立场、争议处理和下一位提示词
```
