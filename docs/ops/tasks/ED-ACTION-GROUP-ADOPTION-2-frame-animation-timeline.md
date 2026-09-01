# ED-ACTION-GROUP-ADOPTION-2 - 帧动画时间线动作组与纵向可见边界

Status: draft
Phase: phase2
Capability: Editor design-system adoption（不改变 capability-map）
Coding Owner: Codex
Reviewer: Kimi + GLM
Risk: 常规迭代（用户可见时间线高度变化；开卡，走完整三签）
Target Design-System Version: `2.22.0`（采用既有 ActionGroup，不新增公共 API）

## 目标

把“资源 / 过场素材 / 帧动画”的每帧左右移动动作迁移到 compact `DsActionGroup`，并同时修复现有
时间线纵向 viewport 小于 132px track、导致移动按钮大面积或完全不可见的问题。排序仍只写帧动画本地
draft history，不改变 EditSession command、资源格式、稳定 frame id、选择或保存语义。

## 范围

- `packages/editor/src/ui/FrameAnimationEditor.tsx`
- `packages/editor/src/ui/editor.css` 的 `.fa-editor/.fa-timeline*/.fa-frame*`
- `action-group-adoption.json`、audit/边界/业务测试、DS-C.2a census
- 真实过场素材页面与经典横滚条压力 fixture 的几何/a11y 验证

不在范围：

- 410 帧场景的真正 DOM virtualization（已跟踪为 `ED-FRAME-TIMELINE-VIRTUALIZATION-1`，不夹进本卡；
  本卡 done 前该债卡必须保持可追踪）
- 帧资源 codec/schema/worker、保存格式、预览播放/缩放行为
- 图层栈、精灵预制动作目录及其余 action-group candidates

## 前提真值门

### 一句话前提

当前缺陷不是单纯 30px/2px 私有动作簇：时间线 shell 只给出 96px（窄态88px）可视高度，却承载
132px track，按钮在真实页面已被纵向裁切；因此 ActionGroup 采用必须和父时间线可见边界同卡修复。

### 四向真值矩阵

| 维度 | 结论 | 一手证据 |
|---|---|---|
| 原版 / primary source | N/A：二阶段作者工具布局，不涉及原版游戏行为。 | `docs/phase2/READ-FIRST.md:8-20` |
| 第一阶段 | N/A：一阶段没有当前帧动画作者时间线。 | `CLAUDE.md:5-12` |
| 当前二阶段 | shell 126/118px，header 30px，timeline client 约96/88px；track 132px，frame 102×122 且 overflow hidden；动作两枚、30px/2px。 | `editor.css:7886-7893,7986-8033,8076-8081,8158-8167`；`FrameAnimationEditor.tsx:138-159,875-917` |
| 本任务目标 | shell 固定186px（30px header +156px timeline），结果门禁为 timeline clientHeight≥132；每帧 compact ActionGroup 68px/32×32，focus 完整可见。 | 本卡设计/验收；用户裁决 pending |

### 直接证据与替代解释

- 可复现真实证据：`http://localhost:6010/?module=asset&page=cutscene&object=frame-animation.pal.000`，
  1280×720；`.fa-timeline` rect `top=599,bottom=694,clientHeight=95,scrollHeight=132`，`.fa-track`
  height132，首帧`.fa-frame-actions` `top=683,bottom=723`，两按钮 `top=688,bottom=718`。因此按钮仅露
  约6px；access tree仍可见“上移/下移第 N 帧”，不能替代视觉可达。`<=980px` 的88px档按同一CSS
  算术会完全裁掉动作行。
- 当前卡内横向也紧：102px border-box +3px padding，右侧按钮4px focus 外扩贴近 overflow clip。
- 最强替代解释：“只是当前滚动位置或浏览器 overlay scrollbar 造成”。反证：不依赖滚动位置，静态
  96/88 < 132 已足以裁切；经典横滚条还会继续吃掉 clientHeight，而不是改善。
- 可推翻观察：若真实 overlay 与经典横滚条环境都能证明 `timeline.clientHeight >= 132` 且首/中/末按钮
  及4px focus rect完整位于 timeline/frame 内，则本前提失效。

## 用户可见偏离

- `before -> after`：时间线 shell 宽态 `126px`、窄态 `118px` → 两档统一 `186px`；时间线可用高度
  96/88px → 至少132px（设计值156px，预留最多约24px给经典横滚条/焦点安全区）。主预览相应减少
  60/68px高度；帧卡102×122、横向 stride108保持不变。
- 按钮标签从上下移动口径改为具体的“向左移动第 N 帧 / 向右移动第 N 帧”；方向与排序结果不变。
- 用户裁决：**pending**。

## 上下文锚点

- `docs/phase2/READ-FIRST.md`
- `docs/ops/tasks/ED-ACTION-GROUP-SPEC-1-editor-action-group-contract.md`
- `docs/ops/tasks/ED-ACTION-GROUP-ADOPTION-1-editor-action-group-adoption-batch-1.md`
- `docs/phase2/editor/editor-design-system-v1.md` DS-C.2a / DS-C.4d
- `FrameAnimationEditor.tsx:82,138-159,378-391,556-596,875-950`
- `FrameAnimationEditor.reorder.test.tsx:89-157`
- `editor.css:7886-8081,8158-8167`
- 不得重新引入：业务 gap/尺寸 owner、用负 outline offset 掩盖裁切、overflow-y visible 穿透时间线、
  以保存 command 代替本地 draft history。

## 设计方案

1. `.fa-frame-actions` 改为 `<DsActionGroup density="compact">`；两个 move button 保留 itemKey/direction，
   显式加入“向左/向右移动第 N 帧”标签。
2. `.fa-frame-actions` 删除 display/justify-content/gap，只保留 `justify-self:end; align-self:center` placement。
3. `.fa-frame` 保持102×122与 overflow hidden，只把 inline-end padding从3px增为4px，给右侧4px focus外扩
   留在卡内；动作轨40px恰容32px按钮和上下各4px focus。
4. `.fa-editor` 基础和 `max-width:980px` 的时间线轨都改为186px；shell仍为30px header + timeline。
   完成条件锁结果：overlay与强制17px横滚条压力下 `timeline.clientHeight >= 132`，不得只断言裸高度186。
5. registry 把 `asset/frame-animation-timeline/actions` 从 deferred 转 adopted；新基线冻结：
   **11 groups / 46 moves / 22 adopted / 24 raw / 12 candidates（1 equivalent +11 deferred）**。
6. 同版更新 DS-C.2a census，不升设计系统版本；真正DOM virtualization另卡处理。

## 验收条件

- 语义：frame.id/reorder key、scope/revision/horizontal orientation不变；一次有效左右移动只增加一条
  draft history，EditSession dispatch/historyVersion保持0；selected ids、active index、anchor跟随逻辑帧；
  边界按钮disabled/no-op零history；undo/redo对称；保存仍是唯一 UpsertAssetCommand 入口。
- DOM/a11y：group 68px；两按钮32×32、4px gap、同top；具体左右 aria-label +同文案 tooltip；SVG hidden；
  wrapper无新role，普通Tab序列与handle键盘替代保留。
- 几何：1/3/64/410帧，首/中/末、横滚末端；1280/981/980/720px与480/600/720px窗口高度；
  overlay及强制17px经典横滚条。track=132px，timeline clientHeight≥132，frame/按钮/focus rect完整位于
  frame/track/timeline，双轴与document无非预期溢出。
- 门禁：11/46/22/24/12精确；其余12 candidates生产DOM/CSS零diff；`.fa-frame-actions`不持
  display/gap/wrap/尺寸；shell旧126/118与旧30/2规则回流必红。
- 验证：action-group audit/boundary、FrameAnimationEditor reorder与移动按钮聚焦测试、typecheck、
  design-system gate；受影响包全量一次。真实200%无法可靠触发时明写未实测。

## 推进签字

### 进入 build 前

- Codex:
  - premise: **verified（2026-09-01）**——独立直读生产DOM/CSS/本地draft与保存链，并在真实64帧页面
    核access tree；96/88<132与经典滚条替代解释已排除。
  - design: **agree（2026-09-01）**——ActionGroup与纵向裁切同卡；186为跨平台安全值，完成门锁
    clientHeight/完整focus结果；不夹带virtualization。
- Kimi: premise/design pending
- GLM: premise/design pending
- 用户裁决: pending（186px时间线形态）
- build 准入: **blocked**（Kimi/GLM签字与用户裁决未齐，不得实现）

### 进入 done 前

- Codex: pending
- Kimi: pending
- GLM: pending
- 用户验收: pending
- done 准入: blocked

## 交接日志

- 2026-09-01 Codex: 三路只读审计后把本卡收窄为帧动画独立几何 slice；未修改实现。Next: 用户批准
  126/118→186形态；Kimi/GLM独立设计审签，三门齐前不得build。

## 下一位 Agent 提示词

```text
审签 ED-ACTION-GROUP-ADOPTION-2（Kimi 席，draft；生产实现只读，只允许更新任务卡签字/交接）。

任务卡：docs/ops/tasks/ED-ACTION-GROUP-ADOPTION-2-frame-animation-timeline.md
当前用户186px时间线形态裁决仍pending；用户 + Kimi + GLM三门齐前不得build。
先读：AGENTS.md 前提真值门、READ-FIRST、ED-ACTION-GROUP-SPEC-1、ADOPTION-1、DS-C.2a，及本卡全部证据。

请独立核验：96/88px timeline 与132px track的裁切前提；经典横滚条替代解释；186px shell是否为最小
跨平台安全形态；102×122卡内32px/4px focus containment；frame.id、本地draft history、选择与保存命令
零漂移；registry 11/46/22/24/12；virtualization明确排除。

输出 Kimi premise verified + design agree，或 counter + P0/P1/P2/file:line/反例。若agree，仅写回
本卡签字与交接，并附GLM提示词；不得修改实现、代签GLM或标build/done。
```
