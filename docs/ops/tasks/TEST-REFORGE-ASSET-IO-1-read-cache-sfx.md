# TEST-REFORGE-ASSET-IO-1 - 资源读取、缓存与音效准备补测（队列 TB-02）

Status: draft
Phase: phase2
Capability: 已有读取/缓存/音效准备合同覆盖（不改变能力地图）
Coding Owner: GLM（只新增测试）
Integration Owner: Codex
Reviewer: Codex / Kimi
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: none
Branch: codex/glm-reforge-asset-io-r1（获准后使用）

Revision: r2，2026-09-19；生产核对点`e58834f6389a40ffe9f187e6a8051f552e964d79`不变。r1前提/方案已收窄，旧签留历史，不授权r2。
来源：[补测长队列](../../testing/glm-coverage-work-queue.md) TB-02，规划产物非实施授权。
唯一工作包/族账/白名单：[glm-reforge-asset-io.md](../../testing/glm-reforge-asset-io.md)。

## 目标与边界

补 reforge 六模块的读取分阶段失败/取消窗口/缓存生命周期/注册表失败重试/非战斗音效集合回归。
不听音、不做视觉；不改保存稳定读门/锁/恢复；不碰技能试放/Codex main 接线；与已接收十模块包
（audio/bgm、midi-preview 已在彼包）不重叠。

## 前提真值门

| 维度 | 一手证据与结论 |
|---|---|
| 原版/primary source | 不新增原版音频规则；当前 TS 合同为真源 |
| 第一阶段 | harvest X2/X4/X8 只取"迟到播放/缓存回填"通用教训，不搬旧 AudioManager 结构 |
| 当前二阶段 | main:774–789向collector传canonicalScene；project-loader:455构造image cache/:461构造httpSource，registry真正由menu-box:363/main:628消费。HTTP仅透传signal，FSA逐await查取消；browserAdapter复制与assertWave标记门分层。六旧文件实跑39项，去重/待证见r2工作包 |
| 本任务目标 | before→after 只增合法正反测试与覆盖账；读取/缓存行为零变 |

最强替代解释：已有强断言、在途dispose回填政策未定、canonical页选择尚未核清、窗口不可达。
SfxPlayer没有原稿所称通用AbortError自动重试；反证成立登记已有/待证/防御，不把现状固化为合同。

## 推进签字

### build前（r2，当前）

- Codex：**premise verified / design agree（2026-09-19，r2，冻结e58834f6）**。本人直读file-source.ts:27–47与fsa-source.ts:18–50，核实HTTP透传而FSA主动查取消；sfx.ts:63–94的实际browserAdapter复制/标记门已用宿主探针复跑；main.ts:774–789与readiness.ts:168证实页选择前提不能由旧玩具fixture代证。六旧文件39项绿。r2排除未定页选择/在途dispose，去重12项sfx及已有registry503重试；不宣称PCM/听感或浏览器验证。可证伪：替身替掉产品判据、真正消费者输入与fixture不同、只有旧强例重复，则收窄而不固化。
- Kimi：pending（独立审r2，不读GLM结论）。
- GLM：pending（对r2事实与实施钉补充确认；原r1签字保留在下方，不直接沿用）。
- build准入：未开放；同r2三席齐且无counter后由Codex核定。其它批次无依赖者独立裁决，TB-00返工仍优先。

### build前r1签字（历史，已被r2替代）

- Codex：pending（独立核队列 TB-02 范围/去重表/白名单）。
- Kimi：pending（独立前提/设计审查，不读 GLM 结论）。
- GLM：**premise verified / design agree（2026-09-19，核对点 e58834f6；锚点本人直读，未读他席）**。
  六模块存在、计数与台账逐格一致（census --check）；caller 锚点（main/loader/menu-box/editor 两文件）
  与既有测试标题逐一直读核实并列入去重表；B1-B10 族锚点在工作包。可证伪：某族已被既有厚测试同合同
  覆盖→登记已有；未定政策（在途 dispose 回填）→隔离待证不默认绿；产品/旧测试/基线 diff→停。
- build准入：未开放；三席同 r1 齐且无 counter 后由 Codex 核定。

### done前

- GLM/Codex/Kimi：pending；done准入未开放，不代签、不标done。

## 交接日志

- 2026-09-19 Codex：按用户要求与TB-00返工并行推进本卡；HTTP/FSA取消、browserAdapter复制、RIFF标记门/PCM解码分层；订正既有用例计数与caller，页选择疑点隔离。已把修订合入工作包正文，r2本人前提/设计签字完成，待GLM补充确认与Kimi独立审查。仅文档/只读探针，未写正式测试或改产品。统一证据见[前三批设计收口](../../testing/glm-coverage-queue-design-review.md)。

- 2026-09-19 GLM：按队列 TB-02 细化。核六模块 caller/既有测试（sfx×8、sfx-readiness 厚集、
  image-cache/file-source/fsa-source/registry 标题全列）；产出本卡+工作包（B1-B10 族账/负控/覆盖方案）。
  仅规划，未写测试。

## 下一位Agent提示词

两席完整合并提示词见[前三批r2设计交接](../../testing/glm-coverage-queue-design-review.md#两席并行提示词)。本卡最小可复制交接如下：

```text
在 /Users/zhangxu/illegal/type-pal 审 docs/ops/tasks/TEST-REFORGE-ASSET-IO-1-read-cache-sfx.md（r2/draft，冻结e58834f6）。先同步检查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡和对应工作包、docs/testing/glm-coverage-queue-design-review.md，直接读一手代码而非复述他席。
Codex已签r2。GLM负责对本卡r2差异补充确认，Kimi负责独立设计压力测试，两席可并行且不读另一席结论。分别只在本人r2席位/日志写带直接锚点和可证伪观察的premise verified/design agree或counter，并提交推送。
同时审其余TB-01～03同r2卡可用合并提示词，但各卡独立裁决。不得改产品/正式测试/另一席/状态，不标build/done；三席齐后Codex核准入。TB-00返工不因本轮设计等待而停止。
```
