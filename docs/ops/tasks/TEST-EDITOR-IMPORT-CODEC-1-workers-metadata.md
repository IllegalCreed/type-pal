# TEST-EDITOR-IMPORT-CODEC-1 - 导入、编码工作线程与视频元数据补测（队列 TB-03）

Status: draft
Phase: phase2
Capability: 已有导入/编码合同覆盖（不改变能力地图）
Coding Owner: GLM（只新增测试）
Integration Owner: Codex
Reviewer: Codex / Kimi
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: none
Branch: codex/glm-editor-import-codec-r1（获准后使用）

Revision: r1，2026-09-19；生产核对点`e58834f6389a40ffe9f187e6a8051f552e964d79`。
来源：[补测长队列](../../testing/glm-coverage-work-queue.md) TB-03，规划产物非实施授权。
唯一工作包/族账/白名单：[glm-editor-import-codec.md](../../testing/glm-editor-import-codec.md)。

## 目标与边界

补 editor 七模块的导入阶段化失败、帧图序列守卫、TPFS 编码边界、worker 请求分派与 BMFF box 解析回归。
合法二进制独立构造+真实编码链，非上传界面；上传选图竞态（EDITOR-SPRITE-PICK-1）已 done 不重开；
不做视觉/截图/听感；不动 UI 布局与动画观感。

## 前提真值门

| 维度 | 一手证据与结论 |
|---|---|
| 原版/primary source | TPFS/BMFF 均为本工程自定格式；PNG 为公开标准——以现行 codec 实现与标准结构为真源，不引原版 |
| 第一阶段 | N/A——编辑器为一期后新增 |
| 当前二阶段 | caller 直读：ImageTab.tsx:525 prepareAuthoredImage、BattleSpriteLibrary.tsx:1269、FrameAnimationEditor.tsx:506/550/593（decode/quantize/encode worker 链）、CutsceneTab.tsx:232/472/479/491（mp4HasAudioTrack/decodeFrameImages）；image-import/codec/images/video-metadata 既有测试 2/2/1/1 项已列去重表；battle-sprite-import 与 worker-client/worker 无既有测试 |
| 本任务目标 | before→after 只增合法正反测试与覆盖账；导入/编码行为零变 |

最强替代解释：既有两例已覆盖（codec 量化/重排）、worker 宿主在 Node 测试环境不可达（定案时核
直调 handler 的等价性并登记取舍）、box 组合不可构造。反证成立登记已有/防御，不造假二进制。

## 推进签字

### build前（r1）

- Codex：pending（独立核队列 TB-03 范围/去重表/白名单，尤其 worker 测试宿主方案）。
- Kimi：pending（独立前提/设计审查，不读 GLM 结论）。
- GLM：**premise verified / design agree（2026-09-19，核对点 e58834f6；锚点本人直读，未读他席）**。
  七模块存在、计数与台账逐格一致（census --check）；caller 与既有测试计数（2/0/1/2/0/0/1）核实；
  C1-C8 族锚点在工作包；worker 宿主方案（Node worker_threads 或直调 handler）留待 Codex 定案时
  裁定并登记取舍。可证伪：某族已被 codec 两例同合同覆盖→登记已有；宿主不支持真 worker 且直调不等价
  →该族降防御并说明；产品/旧测试/基线 diff→停。
- build准入：未开放；三席同 r1 齐且无 counter 后由 Codex 核定。

### done前

- GLM/Codex/Kimi：pending；done准入未开放，不代签、不标done。

## 交接日志

- 2026-09-19 GLM：按队列 TB-03 细化。核七模块 caller（ImageTab/BattleSpriteLibrary/
  FrameAnimationEditor/CutsceneTab）与既有测试计数；battle-sprite-import/worker-client/worker 无
  既有测试确认；产出本卡+工作包（C1-C8 族账/负控/覆盖方案）。仅规划，未写测试。

## 下一位Agent提示词

Codex/Kimi 并行审查提示词统一见队列文件"可直接交给GLM的总提示词"节与看板；本卡签齐前不实施。
