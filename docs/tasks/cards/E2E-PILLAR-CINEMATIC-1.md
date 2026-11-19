# E2E-PILLAR-CINEMATIC-1 — 末柱至雪崖首句分片返工

Status: review
Phase: cross-phase
Owner: Codex
Coding Owner: Codex
Reviewer: Codex
Visual Verification Owner: Codex（双端复核）/ User（产品取舍）
Visual Verification Timing: mixed
Last reviewed: 2026-11-19
Template: task-card-v1 / 1.0.0
Branch: codex/q2-content-coverage

## 目标

在当前统一离线入口验证末柱倒塌后的逐角色演出、影片交接和雪崖首句；正式出片先重算同局双端原件。以本分片验证仓库开工路由和缺证拦截。

## 范围

同局起点为 s144/e2390 接触前的六柱已毁存档，终点为 s150/e2465 首句实际绘出。原生载入与战斗是可复验触发条件。起点为独立原生局面，不是顺序分片的正式前驱；终点还在脚本中，不授终档、连续链或 capture-ready 信用。Q2 仍持有毒神龙的起战、战斗及返场证据。雪崖首句以后和 Q2 的其他战斗专项不在本轮。

## 前提与证据

| 维度 | 已核事实 | 直接依据 |
| --- | --- | --- |
| 原盘 | 24820–24836 八次点名设置队员姿势；两片之间走廊群演有各自路标和步态。 | 本地提取 `data/extracted/events/all.json`、[SDL 逐队员指令及步进](../../../reference/sdlpal/script.c) |
| 第一阶段 | 旧同局 Game 实绘李逍遥 6→9→3，林月如 6→3→0→9。走廊 e2461 全亮时在 [94,42] 朝下，移动中实绘 0 与 1。 | [旧双端原件](../evidence/E2E-Q2-1-cliff-sword-saint-walk-20261119.tar.gz) |
| 当前 Reforge | 八条转向均被执行，指定跟随者的分支却没有写绘制姿势。e2461 全亮时仍在 [92.75,41] 朝右，只画 0。 | [姿势宿主](../../../packages/reforge/src/main.ts)、[走廊正文](../../../projects/pal/content/scenes/s149.json)、同一份归档 |
| 反证 | 同一条语义等待内角色画面、动作先后和路标若已相符，则不能归因于产品；缺角色、缺拍、未解释差异或使用自动行为执行一次性剧情时不得签发正式回执。 | [统一 E2E 合同](../../testing/e2e/contract.md) |

## 验收

1. 从 AGENTS 路由加载本轮必读和当前卡；单一执行入口能拒绝缺义务或文件已改变的预检。同局起点、计划、正式输入消费和实际调用有原件。
2. 经统一离线入口重读带哈希的真实旧原件，自动拒绝其单独通过的旧回执，逐名报告红廊和走廊差异。帧、位置、朝向和脚本权属各自有证明。
3. 修后逐拍核实绘、停留/动作、两影片完整、镜头交接和雪崖首句。预览初态和动作所有权另核，列明可复验边界。
4. 正式分屏入口从原件重算结果；同源、原速、双侧原声音轨和解码终帧通过。配对回执写回本卡、分片台账及受影响规范。静态门零诊断。

## 状态与交接

2026-11-19 Codex build allowed。用户明确配置可验证的流程门，并将本段划归分片 E2E。Codex 唯一写入工作流准入、分片适配和演出修复，白名单为相关工具配置、分片执行/比较、队员绘制、s144/s149 作者数据和相应现行文档。interlude_audit 与 native_capture_audit 仅读原件和源码，已提供反证及复验入口。两份产品候选已独立核对后集成，复验 75ac7609a。


### 2026-11-19 双端复验与验收分屏

- 开工命令：`node scripts/workflow/open.mjs task,e2e,code,test,reforge docs/tasks/cards/E2E-PILLAR-CINEMATIC-1.md`。实际测试了未开工、跨轮次及规范变更被工具拦截。Codex 会话的 Hook 需由用户信任项目配置；本片正式出片入口与 Hook 的信任状态独立。
- 旧双端用原件离线拒绝。第 24822 拍林月如原版绘制 3、Reforge 6；第 24827 拍李逍遥原版绘制 9、Reforge 6；e2461 旧候选在全亮时位置与朝向错误，也只绘出帧 0。正式出片返回 1，没有生成 MP4。
- 候选 `75ac7609a59a32aa91a23a513321dddbf606458f` 的两端原生实跑，红廊三人的脚点、前景八次转身及可见着装与红色覆盖通过。灵儿使用正确的四帧方向组，原盘硬按三帧索引的差异明记在回执。s149 八名群演在共同可见区的有序位置、朝向和资源帧逐步相符，没有自动行为调用。Game 的视口裁切为绘制坐标加 4 像素；Reforge 多绘的下缘及原盘尾部极暗调色拍单独留证。
- 两段影片分别绘完 82、93 帧。对原生视频和右屏逐帧解码，没有命中已知的错误走廊和默认雪崖场景帧。雪崖剑圣两端全亮时走到第 7 步；走满 15 步、停约四拍再转向、第一句正常实绘。编辑器实页核走廊前景轨道、淡入中动作及重置。编辑器单队长预览不授跟随者实绘信用。
- 39.38 秒成片以「七根龙柱全部毁去」对齐，1 倍速，Game 左画面与原声在左、Reforge 右画面与原声在右。两端各自真实终帧停留。 [归档、命令与分屏](../evidence/E2E-PILLAR-CINEMATIC-1-20261119.tar.gz)

用 `node scripts/e2e/recompare-recording.mjs dragon-pillar GAME_REPORT REFORGE_REPORT NEW_JSON` 在归档所记的固定候选复算；原生 WebM 的校验指针在实际执行记录，文件留本地 build。新出片经 `node scripts/e2e/dragon-pillar/split.mjs GAME_REPORT REFORGE_REPORT NEW_MP4 NEW_RECEIPT` 重算后交付。卡面 review 等待作者复看，首句之后保持未验。
