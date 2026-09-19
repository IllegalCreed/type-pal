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

Revision: r2，2026-09-19；生产核对点`e58834f6389a40ffe9f187e6a8051f552e964d79`不变。r1前提/方案已收窄，旧签留历史，不授权r2。
来源：[补测长队列](../../testing/glm-coverage-work-queue.md) TB-03，规划产物非实施授权。
唯一工作包/族账/白名单：[glm-editor-import-codec.md](../../testing/glm-editor-import-codec.md)。

## 目标与边界

补 editor 七模块的导入阶段化失败、帧图序列守卫、TPFS 编码边界、worker 请求分派与 BMFF box 解析回归。
合法二进制独立构造+真实编码链，非上传界面；上传选图竞态（EDITOR-SPRITE-PICK-1）已 done 不重开；
不做视觉/截图/听感；不动 UI 布局与动画观感。

## 前提真值门

| 维度 | 一手证据与结论 |
|---|---|
| 原版/primary source | 原版机制N/A。TPFS是工程自定格式；PNG与ISO BMFF为标准格式；[W3C ISO BMFF来源](https://www.w3.org/TR/mse-byte-stream-format-isobmff/)。video-metadata只实现窄音轨探测，不充当完整MP4校验器 |
| 第一阶段 | N/A——编辑器为一期后新增 |
| 当前二阶段 | ImageTab:525导入、BattleSpriteLibrary:1269、FrameAnimationEditor:506/550/593分别为decode/quantize/encode；CutsceneTab:232是MP4探测，:472/479/491是图片/量化/编码。四旧文件6项已复跑，worker已零改源码调用真实self.onmessage并验证transfer；无同名直接测试不等于无间接消费 |
| 本任务目标 | before→after 只增合法正反测试与覆盖账；导入/编码行为零变 |

最强替代解释：旧codec量化/重排已覆盖、宿主替身替掉产品逻辑、box输入不在声明域、真实缺陷被错误绿测遮盖。
r2已证明现有worker handler可在Node窄宿主调用，不新增产品导出；PNG编码失败位图泄漏由Codex隔离修复，非本包正确绿测。

## 推进签字

### build前（r2，当前）

- Codex：**premise verified / design agree（2026-09-19，r2，冻结e58834f6）**。本人直读worker-client.ts/codec.worker.ts、image-import.ts:130–142、video-metadata.ts:23–52及正式UI调用；四既有文件6项绿。亲自复跑现有self.onmessage的真实quantize/encode、TPFS像素恢复、client真实transfer和原buffer保真，零产品导出；并复现PNG成功close=1、仅编码失败close=0。r2将泄漏交Codex另修，不让GLM写错绿或顺手改产品；订正ISO BMFF标准来源与窄探测边界。可证伪：真实handler/codec未执行、transfer没detach、非法fixture提前拦截、代码异常被包装成业务正控，则不准计覆盖。
- Kimi：pending（独立审r2，不读GLM结论）。
- GLM：**r2 premise verified / design agree（2026-09-19，r2，冻结 e58834f6；差异锚点本人直读/复跑，未读 Kimi 结论；r1 签字留历史）**。
  - **worker 零导出方案**：codec.worker.ts:27–35 本人直读——真实 handler 已挂 `self.onmessage`
    （quantize/encode + postMessage transfer），r1 稿"Node worker_threads 或直调 handler 留 Codex
    裁定"的悬置收口为"隔离 self 后动态 import 真实 worker"正确：零产品导出、真实 codec 执行、
    只测 Node 宿主协议不冒称浏览器线程调度。
  - **client transfer**：worker-client.ts:39–49 postMessage 前 `rgba.slice(0)` 复制、:76–77
    transfer 数组——探针 rc0 证明 structuredClone transfer 后传输副本 detach 而调用者原 buffer
    完好、terminate=1，与 C6 的假 Worker 方案（真实 structuredClone+transfer、输出也转移）一致。
  - **BMFF 订正**：video-metadata.ts:23–28 本人直读——窄音轨探测三态（非 ftyp→undefined、
    未找到/畸形→false、找到 soun→true），W3C ISO BMFF 标准来源正确；r1 稿"工程自定格式"有误。
  - **caller 订正**：FrameAnimationEditor:506=decode、:593=encode、CutsceneTab:232=MP4 探测
    ——r1 稿 :479 列为探测入口有偏，r2 订正正确。
  - **PNG 泄漏隔离**：image-import.ts:128–142 本人直读——canvasPng 抛错路径确无 finally、
    bitmap.close() 不可达；探针 rc0 复现 control close=1 / 编码失败 close=0。归 Codex 修复卡、
    本包不写默认红、不固化"不释放"为正确绿测——同意（这是 r2 最重要的边界收敛）。
  - **既有基线复跑**：四直接文件 6/6 绿（本人执行）；官方 include 含 worker（0/13 非排除）
    与 battle-sprite-import 输入由正式 Uploader 提供的分层同意。
  - **可证伪观察**：①真实 handler/codec 未执行（mock 整个模块）→C7 无效；②transfer 未 detach
    或原 buffer 变化→C6 无效；③非法 fixture 在守卫前被拦→该轴不能计新增；④泄漏被顺手修或
    写绿→越界即停。
  - 返工项：无。Kimi 签齐且无 counter 后由 Codex 核定 build。
- build准入：未开放；同r2三席齐且无counter后由Codex核定。其它批次无依赖者独立裁决，TB-00返工仍优先。

### build前r1签字（历史，已被r2替代）

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
- 2026-09-19 GLM：完成 r2 差异确认，签 premise verified / design agree，无 counter。复核
  worker 零导出宿主方案、client 真实 transfer/detach、BMFF 三态与标准来源订正、caller 修正、
  PNG 编码失败泄漏隔离边界；探针 rc0；四旧文件 6/6 复跑。未读 Kimi 结论；仅改本席与日志。

- 2026-09-19 Codex：按用户要求与TB-00返工并行推进本卡；固定零产品改动worker宿主方案；订正BMFF真源、三态与caller；已确认PNG失败释放缺陷隔离，正式测试不含默认红。已把修订合入工作包正文，r2本人前提/设计签字完成，待GLM补充确认与Kimi独立审查。仅文档/只读探针，未写正式测试或改产品。统一证据见[前三批设计收口](../../testing/glm-coverage-queue-design-review.md)。

- 2026-09-19 GLM：按队列 TB-03 细化。核七模块 caller（ImageTab/BattleSpriteLibrary/
  FrameAnimationEditor/CutsceneTab）与既有测试计数；battle-sprite-import/worker-client/worker 无
  既有测试确认；产出本卡+工作包（C1-C8 族账/负控/覆盖方案）。仅规划，未写测试。

## 下一位Agent提示词

两席完整合并提示词见[前三批r2设计交接](../../testing/glm-coverage-queue-design-review.md#两席并行提示词)。本卡最小可复制交接如下：

```text
在 /Users/zhangxu/illegal/type-pal 审 docs/ops/tasks/TEST-EDITOR-IMPORT-CODEC-1-workers-metadata.md（r2/draft，冻结e58834f6）。先同步检查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡和对应工作包、docs/testing/glm-coverage-queue-design-review.md，直接读一手代码而非复述他席。
Codex已签r2。GLM负责对本卡r2差异补充确认，Kimi负责独立设计压力测试，两席可并行且不读另一席结论。分别只在本人r2席位/日志写带直接锚点和可证伪观察的premise verified/design agree或counter，并提交推送。
同时审其余TB-01～03同r2卡可用合并提示词，但各卡独立裁决。不得改产品/正式测试/另一席/状态，不标build/done；三席齐后Codex核准入。TB-00返工不因本轮设计等待而停止。
```
