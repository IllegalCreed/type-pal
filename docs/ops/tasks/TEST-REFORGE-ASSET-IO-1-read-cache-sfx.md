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

Revision: r1，2026-09-19；生产核对点`e58834f6389a40ffe9f187e6a8051f552e964d79`。
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
| 当前二阶段 | caller 直读：main.ts:783 collectSceneSoundAssets、project-loader.ts:455/461 registry、menu-box.ts:363、editor open-local.ts:38/load-play-project.ts:15（fsaSource）；sfx/image-cache/file-source/fsa-source/registry 既有测试标题已逐项列入工作包去重表 |
| 本任务目标 | before→after 只增合法正反测试与覆盖账；读取/缓存行为零变 |

最强替代解释：已有强断言（sfx/sfx-readiness 既有测试很厚）、宿主行为未定（在途 dispose 回填、
AbortError 通用重试政策）、窗口不可达。反证成立登记已有/待证/防御，不把现状固化为合同。

## 推进签字

### build前（r1）

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

- 2026-09-19 GLM：按队列 TB-02 细化。核六模块 caller/既有测试（sfx×8、sfx-readiness 厚集、
  image-cache/file-source/fsa-source/registry 标题全列）；产出本卡+工作包（B1-B10 族账/负控/覆盖方案）。
  仅规划，未写测试。

## 下一位Agent提示词

Codex/Kimi 并行审查提示词统一见队列文件"可直接交给GLM的总提示词"节与看板；本卡签齐前不实施。
