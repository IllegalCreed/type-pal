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
- Kimi: **agree**（2026-08-07，视觉/渲染主审：触发判据/alpha 叠加/latch 生命周期逐项
  压测，G1 裁定 (a) prop 不触发，附 K1-K5 build 验收钉，见「Kimi 设计主审」）
- GLM: **agree（2026-08-07，附 G1-G3 build 准入钉，见「GLM 设计准入复审」）**
- counter / 分歧处理: 无 counter；G1（角色 vs prop 判据）经 Kimi 裁定为 (a) 显式标记
  （见「Kimi 设计主审」K1）
- 缺签豁免: N/A
- build 准入结论: **allowed**（2026-08-07，三方 agree 齐；G1-G3 + K1-K5 为 build 验收钉，
  不阻塞准入）

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
- 结论: **GLM agree（附 G1-G3）+ Kimi agree（附 K1-K5）**
- 必改项: 见 G1-G3 + K1-K5（build 准入钉）
- 是否建议进入 build: **双方同意进入 build（钉子均为验收钉，不阻塞准入）**

### 三方争议记录(按需)

- Codex: 2026-08-06 用户拍板方案 A（D27）后开卡。
- Kimi: **agree（2026-08-07，视觉/渲染主审；G1 裁定 (a)）**。详见「Kimi 设计主审」。
- GLM: **agree（2026-08-07，遮挡场景覆盖矩阵主审）**。详见「GLM 设计准入复审」。

#### Kimi 设计主审（2026-08-07，视觉/渲染）：**agree（附 K1-K5 build 准入钉）**

**方法**：只读独立压测；一手读 render.ts 全文（coverTileCandidates :191-264、
renderScene :272-354、drawTile alpha 通道 :295-304）、main.ts 精灵构造三点
（实体 :4198-4209 / 队长 :4229-4239 / 队员 :4242-4268）、EntityRef 判别
（content/index.ts:65 `{actor}|{sprite}|{zone}` 三选一）、slice1 occludesActors spec。
未修改实现。

**独立确认（附议 GLM G1-G3）**：

1. **G1 判据失效** 独立核实成立：main.ts:4198-4209 实体循环对所有实体（含 prop）
   统一 push `coverSortOffset: effectiveLayer*8+9`，coverSortOffset 无法区分角色/prop。
2. **G2(a) 跨 sprite 重复绘制** 独立核实成立且**比 GLM 写的更严重**：renderScene
   :337-349 外层 for sprite、内层 candidates 无跨 sprite 去重——同一 cover 瓦片被
   多角色候选集各 push 一条 entry。不透明时代无害（同像素重画）；半透明后
   0.35 画 N 次 → 有效不透明度 1-(1-0.35)^N 随在场人数漂移（两角色 0.58、
   三角色 0.73）——观感随人数变化，是确定性缺陷而非风险。
3. **G3** 附议（latch 到期恢复、场景切换清空、alpha 叠加规则需定义）。

**G1 裁定（本席，GLM 让渡）：选 (a)——prop 不触发，判据 = 显式标记**：

- 方案 A（D27）的痛点是「角色被屋顶/树冠盖住找不到人」；prop（箱柜桌椅）被挡是
  自然视觉层次，半透明化会让玩家走过屋檐时大面积漏光、破坏场景层次（PAL prop 量大）。
- 判据落地：SpriteDraw 加显式标记（建议 `occlusionTrigger?: boolean`）——实体循环
  按 EntityRef 判别（`{actor}` = 角色实体；`{sprite}` = prop 不标），玩家/队员/
  编外跟随者 push 点恒 true。**禁止用 coverSortOffset 隐式推断**（GLM 已证失效）。

**K 钉（build 准入必落，增量于 G1-G3，不阻塞 agree）**：

- **K1（G1 裁定落地）**：选 (a)；显式标记字段 + 三处 push 点逐一核对；prop 实体
  （`{sprite}` 外观）不标。视觉验收抽验 prop 在屋檐下保持不透明。
- **K2（G2a 修法方向）**：cover 瓦片收集从 per-sprite push 改为跨 sprite 按 tile key
  合并（`Map<tileKey, candidate>`，同瓦片同 baseY 去重后排序行为不变）；单测断言
  「两角色共享同一遮挡瓦片只画一次」（防 alpha 叠加变暗）。
- **K3（G3c 叠加规则裁定）**：`opts.showAll`/`focusLayerId` 调试态存在时遮挡半透明
  **不生效**（调试图层所见即所得），不做 alpha 叠乘——gameplay 态与调试态不混；
  latch Map 挂 Renderer 实例（非模块级/全局，守「不得全局开关状态」纪律），
  场景切换时清空（G3b 附议）。
- **K4（瞬时切换 pop 验收钉）**：alpha 0.35↔1 瞬跳有 pop 感；v1 无渐变可接受，
  视觉验收专测「单次进出 pop 是否刺眼」；若刺眼备选 = render 层数帧线性插值，
  验收时定。
- **K5（alpha 观感基准）**：OCCLUSION_ALPHA=0.35 起始；验收时并排 0.35/0.5 截图
  对比定稿（0.35 可能偏透、屋顶几乎消失）；常量集中一处。

**视觉验收计划（本席，build 后执行）**：代表性遮挡场景截图对比（客栈屋檐 / 镇内
树冠 / 山坡）；贴墙边界走动看闪烁与 pop（K4）；prop 不触发抽验（K1）；多角色同檐
下 alpha 不随人数变（K2）；?collision 叠加层不受影响确认。

**结论**：**agree**。复用 coverTileCandidates 的零新增计算方向成立；G1 裁定 (a)；
K1-K5 为 build 验收钉，不阻塞准入。

**边界**：本 agree 只准入 D6-1 build，不代表 done。

#### GLM 设计准入复审（2026-08-07）：**agree（附 G1-G3 build 准入钉）**

**方法**：只读审查；一手核实 render.ts（coverTileCandidates :191-199 + 调用点 :335-345 + tileAlpha
:289-300 + SpriteDraw 接口 :71-86）、main.ts 精灵构造点（:4163-4212 实体循环 + :4229/4256/4291
队伍）、D27 裁决、slice1 occludesActors。未修改实现。

**正面核实（设计成立）**

1. **复用 coverTileCandidates 真实成立** ✅：render.ts:191 `coverTileCandidates` 已按 PAL_CalcCoverTiles
   五邻 tile 候选 + 高度门算「挡住该精灵的 cover 瓦片」；调用点（:339）把它们画在 sprite 之后
   （正确遮挡）。半透明 = 把这些已判定瓦片以低 alpha 绘制，遮挡关系零新增计算——设计核心成立。
2. **实现路径清楚** ✅：当前 cover 瓦片 alpha = `tileAlpha(tile)`（:343，图层聚焦/调暗用，非遮挡）；
   半透明改这一处 → 「该瓦片在角色遮挡集合 ? OCCLUSION_ALPHA : tileAlpha(tile)」。drawTile 已支持
   globalAlpha（:303-310），alpha 是渲染一等能力（D10）。
3. **迟滞防闪烁方向对** ✅：per-tile latch（Map<tileKey, untilMs>，进入遮挡集合后保持 alpha 120ms）
   防贴墙边缘抖动；alpha 变化瞬时切换（无过渡动画，v1 简化合理）。
4. **性能纪律** ✅：coverTileCandidates 是每帧既有计算，半透明只改 drawTile alpha 参数 + latch Map
   （规模=视口 cover 瓦片数），无新增每帧检测。
5. **范围纪律** ✅：不做描边剪影（D27 已否）、不做全局半透明开关、不做遮挡对演出交互、
   `?collision`/debug 不受影响 → 无 schema/save/migration 风险，常规迭代。

**G 钉（build 准入必落，非 agree 阻塞）**

- **G1（角色 vs prop 判据——设计卡缓解措施失效，build 前必须对齐）**：设计卡第 2 条说"仅角色类
  sprite 触发（有 coverSortOffset 的实体精灵）、prop 不触发"，风险缓解（:112）写"以 coverSortOffset/
  实体来源为判据"。但一手核实 main.ts:4198-4212 实体精灵循环 `for (const e of scene.entities)`
  **不区分 actor/prop**——所有场景实体（含静物 prop）都 push SpriteDraw 且统一带
  `coverSortOffset: effectiveLayer*8+9`（:4207）。**即 coverSortOffset 不能区分角色 vs prop**，
  缓解判据失效。实现前必须二选一并落卡：
  - (a) 找真正的区分字段（SpriteDraw 加 `isActor` 标记，或来源实体类型 actor vs prop），
    只对 actor 触发；或
  - (b) 明确"prop 被遮挡也半透明"（符合 D27 信息优先语义——prop 被挡看不见与角色被挡同等
    烦，半透明让 prop 也可见），判据简化为"所有走 coverTileCandidates 的精灵"。
  建议 (b)（更简单 + 符合方案 A 语义）；但属作者审美，Kimi 视觉主审可裁。**不得用 coverSortOffset
  当判据**（已证失效）。
- **G2（OCCLUSION_ALPHA 常量 + 整块瓦片观感）**：0.35 集中一处定义（Kimi 视觉可调）；整块瓦片
  半透明（v1 不做区域遮罩）。须确认 (a) 同一 cover 瓦片同时遮挡多个角色时只画一次（去重，
  coverTileCandidates 的 seen Set 已防同 tile 重复，但跨 sprite 合并须核实——避免同瓦片被多个
  sprite 的候选集各画一次导致 alpha 叠加变更暗）；(b) base/地板层不受影响（只 cover 瓦片 alpha 化）。
- **G3（迟滞 latch 生命周期）**：per-tile 120ms latch 须确认 (a) 角色离开遮挡后 latch 到期恢复不透明
  的时机（下一帧 coverTileCandidates 不再含该 tile → latch 到期后 alpha 回 1）；(b) 场景切换/重渲染
  时 latch Map 清空（不跨场景残留）；(c) latch 与图层聚焦（tileAlpha dimAlpha）的 alpha 叠加规则
  （聚焦变暗 + 遮挡半透明同时命中时取哪个，或相乘）。实现期在 render 单测钉。

**结论**：设计方向干净、复用 coverTileCandidates 成立、迟滞/性能纪律对、无 schema/save/migration 风险。
**agree**。G1（角色 vs prop 判据——coverSortOffset 已证失效，build 前必须重新定）、G2（alpha 常量 +
跨 sprite 去重）、G3（latch 生命周期 + alpha 叠加）为 build 准入必落钉——其中 **G1 必须在动手实现前
对齐判据**（否则按失效判据实现），其余为实现期验收钉。建议进入 build。

**边界**：本 agree 只准入 D6-1 build。不代表 done；方案 B 不重开（D27）；遮挡对演出交互明确不做。

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件:
  - `packages/reforge/src/render.ts`（SpriteDraw.occlusionTrigger?;OCCLUSION_ALPHA=0.35 /
    OCCLUSION_LATCH_MS=120 常量;OcclusionLatch 迟滞类 + mergeCoverCandidates 纯函数
    (K2 跨 sprite 瓦片去重 + latch);Canvas2DRenderer 注入 now + resetOcclusionLatch;
    renderScene cover 段改合并绘制,showAll/focus 调试态不生效(K3)）
  - `packages/reforge/src/main.ts`（四类角色精灵 push 点 occlusionTrigger:实体按
    `'actor' in e` 判 actor/prop(K1)、队长/队员/编外跟随者恒 true）
  - `packages/reforge/src/render.test.ts`（+4 测:K1 prop 不触发、K2 双角色共享瓦片
    只画一次、K3 latch 迟滞到期恢复、K3 调试态不生效）
- 实现摘要: 三方签后完成。K1 显式标记 occlusionTrigger(实体按 EntityRef actor/prop 判别,
  prop 不触发);K2 cover 瓦片按 tile key 跨 sprite 合并(同瓦片多角色只画一次,防
  alpha 叠加变暗);K3 latch 挂 Renderer 实例(按场景重建天然清空) + showAll/focus 调试态
  不生效;K4 瞬跳 pop 留视觉验收;K5 OCCLUSION_ALPHA=0.35 集中一处。
- 运行命令:
  - `pnpm --filter @type-pal/reforge check`（811 通过,render 5 条含 4 新测）
  - `pnpm --filter @type-pal/content check`（400 通过）
  - `pnpm --filter @type-pal/editor typecheck` 通过
- 浏览器 / 手工检查: pending（Kimi 视觉验收——客栈屋檐/镇内树冠/山坡遮挡对比;贴墙边界
  闪烁与 pop(K4);prop 不触发抽验(K1);多角色同檐下 alpha 不随人数变(K2);?collision
  叠加层不受影响）
- 跳过的检查及原因: 视觉验收(需要真实浏览器)按协议由 Kimi 承担,Codex 自证到类型+单测层;
  K4 pop 观感为验收钉,未在实现层加渐变(v1 无渐变已定)。

### 钉逐项对照(G1-G3/K1-K5)

- G1/K1 判据: ✅ 显式 occlusionTrigger 标记;实体按 `'actor' in e`(actor 触发、prop 不触发),
  队长/队员/编外跟随者恒 true;禁止 coverSortOffset 隐式推断。
- G2(a)/K2 去重: ✅ mergeCoverCandidates 按 tile key 跨 sprite 合并,单测证双角色共享
  瓦片只画一次。
- G2(b) base 不受影响: ✅ 只 cover 瓦片 alpha 化,base 段不动。
- G3/K3 latch 生命周期: ✅ OcclusionLatch 挂 Renderer 实例(按场景重建天然清空,
  main.ts:2785-2791)+ resetOcclusionLatch;showAll/focusLayer 调试态遮挡半透明不生效;
  单测证 120ms 内保持、到期恢复。
- K4 pop: ✅ v1 无渐变(已定),视觉验收专测单次进出 pop 是否刺眼;备选数帧插值。
- K5 常量: ✅ OCCLUSION_ALPHA=0.35 集中一处导出,验收时并排 0.35/0.5 截图对比定稿。

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
- 2026-08-07 GLM（遮挡场景覆盖矩阵主审）: 签 **agree（附 G1-G3）**——G1 coverSortOffset
  判据失效（实体循环不分 actor/prop）、G2 跨 sprite 去重 + alpha 常量、G3 latch 生命周期。
  详见「GLM 设计准入复审」。
- 2026-08-07 Kimi（视觉/渲染主审）: 签 **agree（附 K1-K5）**——三方 agree 齐，
  **build 准入 allowed**。**G1 裁定 (a) prop 不触发**：判据 = SpriteDraw 显式标记
  （occlusionTrigger），实体循环按 EntityRef 判别（{actor} 标/{sprite} 不标），玩家/队员/
  跟随者恒 true；禁止 coverSortOffset 隐式推断。K2 跨 sprite 按 tile key 合并去重
  防 alpha 叠加、K3 latch 挂 Renderer 实例 + 调试态不生效、K4 pop 验收钉、K5 0.35 起始
  可调。详见「Kimi 设计主审」。
- 2026-08-07 Codex: 实现完成并自证——reforge 811（render 5 条含 4 新测）/ content 400 /
  editor typecheck 全绿;G1-G3/K1-K5 逐项落地(见 Build 节钉对照)。待 Kimi 视觉验收
  (浏览器实测)后进 review。
  （证：不去重则 alpha 随人数漂移 1-(1-0.35)^N，确定性缺陷）、K3 调试态遮挡半透明
  不生效（不叠乘）+ latch 挂 Renderer 实例、K4 瞬时切换 pop 为验收专测项、K5 alpha
  0.35/0.5 并排对比定稿。详见「Kimi 设计主审」。

## 下一位 Agent 提示词

```text
接手任务: D6-1 遮挡半透明（方案 A）实现（三方 agree 齐,build allowed）
任务卡: docs/ops/tasks/D6-1-occlusion-semi-transparent.md
当前状态: draft → build 准入 allowed(Codex/GLM/Kimi 三方 agree,2026-08-07)。
你的角色: Coding Owner——build 阶段唯一实现文件修改者。
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡全文(设计结论 + GLM G1-G3 +
  Kimi K1-K5 + G1 裁定);render.ts 全文(重点 :71-86 SpriteDraw、:191-264
  coverTileCandidates、:272-354 renderScene)、main.ts:4198-4268(三处精灵 push 点)、
  content/index.ts:65(EntityRef 三选一判别)、content/actor.ts(isActorEntity)。
必落钉(build 验收逐项核):
  - G1 裁定(a)+K1: SpriteDraw 加显式 occlusionTrigger;实体循环按 {actor} 外观标、
    {sprite} prop 不标;玩家/队员/编外跟随者 push 点恒 true;禁止 coverSortOffset 推断。
  - G2a+K2: cover 瓦片跨 sprite 按 tile key 合并去重(Map<tileKey, candidate>);
    单测断言两角色共享遮挡瓦片只画一次(alpha 不随人数漂移)。
  - G3+K3: latch Map 挂 Renderer 实例、场景切换清空;opts.showAll/focusLayerId 调试态
    遮挡半透明不生效(不叠乘);到期恢复 alpha=1。
  - K5: OCCLUSION_ALPHA=0.35 集中一处定义(视觉验收 0.35/0.5 并排定稿)。
  - G2b: base/地板层不受影响;?collision/debug 叠加层不受影响。
测试: 遮挡判定单测(角色触发/prop 不触发/去重/latch 进出与到期/调试态不生效);
  reforge check 全绿。
视觉验收(Kimi 席,build 后): 屋檐/树冠/山坡代表场景截图对比;边界走动闪烁与 pop(K4);
  prop 抽验;多角色同檐 alpha 一致;0.35 vs 0.5 并排定稿。
纪律: 不重开方案 B;不做全局半透明开关;不做遮罩/渐变(K4 若需渐变由验收定);
  不做遮挡对演出交互。
验收输出: 实现摘要 + 钉逐项对照 + 测试证据;回卡交 GLM/Kimi review 签字。
```

```text
接手任务: D6-1 遮挡半透明（方案 A）（Kimi 视觉/渲染主审）——已执行完毕,勿再执行
说明: 本提示词为历史记录,Kimi 已于 2026-08-07 签 agree(G1 裁定 (a) + K1-K5),
  三方 agree 齐,build 准入 allowed。请改用上方实现提示词。
```

```text
接手任务: D6-1 遮挡半透明——实现完成,交 Kimi 视觉验收 + 双审(当前生效)
任务卡: docs/ops/tasks/D6-1-occlusion-semi-transparent.md
当前状态: build(实现完成,提交 TBD;reforge 811 / content 400 / editor typecheck 全绿)。
你的角色: Kimi 视觉验收(浏览器实测)+ Kimi/GLM review 签字;不是再改实现。
已实现(Codex): occlusionTrigger 显式标记(actor 触发/prop 不触发)+ cover 瓦片跨 sprite
  按 tile key 去重合并 + OcclusionLatch 120ms 迟滞 + OCCLUSION_ALPHA=0.35 集中定义;
  showAll/focus 调试态不生效;G1-G3/K1-K5 全落(见 Build 节钉对照)。
请你做: 浏览器实测(PAL)客栈屋檐/镇内树冠/山坡遮挡场景——角色可见、离开恢复;
  贴墙边界走动看闪烁与 pop(K4);prop 抽验不触发(K1);多角色同檐下 alpha 不随人数变
  (K2);0.35 vs 0.5 并排截图定稿(K5);?collision 叠加层不受影响。
  done 前审查签字表签 accept/counter。
不要做: 不得修改实现文件(必改项以 counter + 返工项写卡)。
输出要求: 更新审查签字、视觉验证记录、下一位提示词(无则写「等待用户验收」)。
```
