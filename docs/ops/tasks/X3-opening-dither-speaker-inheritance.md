# X3/M3 - 通用 0x73 逐像素过渡、开场恢复与 opcode 迁移语义修复

Status: draft
Phase: phase2
Capability: X3（标题/流程/开场演出）+ M3（脚本迁移）
Coding Owner: Codex（拟定，待三签）
Generation Owner: N/A
Reviewer: Opus + GLM
Visual Verification Owner: Codex 自验；Opus 复验
Unavailable Agents: none
Branch: main

## 目标

先撤掉当前未完成 dither 草稿对全局 `loadScene` 的破坏，恢复所有普通场景稳定跳转；再把
`0x73 VIDEO_FadeScreen` 建模为可在任意脚本站点执行的通用 RGBA `ditherScreen`，开场
s000→s001 只是其中一个跨场景用例。同时修复梦话 speaker 继承、`0x49` phantom `e-1` 和
`0x50/0x51` 淡变时长丢失。普通换场景不得被冻结或被迫等待 dither。

## 范围

- 范围内：
  - 恢复普通 `loadScene` 原有淡出、切场景、淡入路径。
  - 新增显式通用 `ditherScreen` ScriptCommand、runner host/dispatch、RGBA dissolve 状态和生命周期收口。
  - 迁移器把所有可达 `0x73` 译为 `ditherScreen`，时长为 `((speed + 1) * 10 * 72)`；speed=2 即 2160ms。
  - `ditherScreen` 支持两类 backup 来源：跨场景由窄前瞻 `loadScene` 在 switch 前捕获并一次性交接；独立站点无交接态时才在命令内快照。
  - 仅目标 onEnter 当前活动 stage 在首个阻塞命令前明确含 `ditherScreen` 时，前置换场景才关闭对话、快照旧帧、跳过普通 fade 并短暂保持该帧；其他场景完全走原路径。
  - 迁移器 speaker 状态跨同 slot 的 `flush/clearDialog` 继承，遇新姓名牌或换 slot 时替换/清空。
  - `0x49` operand[0]==0 时只保留批次边界、不产实体命令，消除 `e-1`。
  - `0x50/0x51` 按原始 delay 保存 `ms`：FadeOut 用 `(op0 || 1) * 600`；FadeIn 用 `(int16(op0)>0 ? op0 : 1) * 600`。
  - 对 s000/s001 迁移产物做最小手工同步；其余受影响产物用不落盘 dry-run 核对，不运行现有全量写盘脚本。
- 范围外：
  - 重做整个开场、菜单、视频/RNG、其他演出 opcode。
  - 把一阶段 palette nibble 算法或 paletteId 带回 reforge。
  - 修改普通门、楼梯、传送触发器的既有转场形态。
- 明确不做：
  - 不直接运行会写工作区的 `pnpm migrate:content`，避免覆盖全量 pal 场景和注入 demo 内容；需要全量核对时只准临时目录/dry-run。
  - 不把 `0x73` 放到 `loadScene` 内无条件执行，也不靠 150 帧超时掩盖错误路由。
  - 不改工作区中与本任务无关的大量未提交迁移产物、E2E checkpoint 和场景修复。

## 上下文锚点

- 已拍板决策 / 铁律：
  - `docs/phase2/READ-FIRST.md` 铁律 4/6/8/9：架构干净；演出显式编排；一阶段只作 UX 参考；先读一阶段沉淀。
  - 用户 2026-07-12 明确判定当前全局 dither 改法作废，首要要求是恢复正常场景跳转。
  - reforge 保持 RGBA 架构，禁止恢复 palette / paletteId；视觉采用逐像素硬替换 dissolve。
- 原始数据与一阶段锚点：
  - `data/extracted/events/scene-001.json` segment[0] `[586..593]`：`playMusic -> raw 0x45 -> teleport(0x46) -> 0x73 -> setDialogStyleTop -> 李大娘对白`。
  - `packages/game/src/core/event-system.ts:2493`：0x73 建立 72 步 fadeState，先清对话并阻塞完成，随后脚本才执行下一条对白。
  - `packages/game/src/present/present.ts:603`：先画对话，再应用 fadeState；0x73 启动时已清对话，因此新目标帧不含后续“李逍遥！你皮痒啊？”对白。
  - `packages/game/src/present/dither-fade.ts:13`：RG_INDEX 与 72 步空间相位参考；reforge 只继承空间节奏，不继承 palette nibble。
- 代码锚点：
  - `packages/reforge/src/main.ts:474`：`switchScene` 原子切换场景；`getSceneDef` 可在旧场景仍显示时预读目标定义。
  - `packages/reforge/src/main.ts:777`：当前未提交草稿无条件快照所有 `loadScene`，并删除普通 fade。
  - `packages/reforge/src/main.ts:1861`：主脚本收尾与目标 onEnter 排队，可在 abort/未消费 dither 时统一清理 pending 状态。
  - `packages/reforge/src/main.ts:2246`：当前未提交 dissolve 绘制草稿。
  - `packages/reforge/src/dither-transition.ts`：当前未提交 RGBA dissolve 纯 helper，尚无单测。
  - `packages/content/src/script.ts:33`、`:53`：ScriptCommand 的 fade/loadScene 现有公共接口。
  - `packages/reforge/src/script-runner.ts:17`、`:274`：ScriptHost 与命令 dispatch。
  - `packages/migrate/src/translate-events.ts:244`：对话 batch/flush；`:563` 当前错误地把 0x73 变成 no-op。
  - `packages/migrate/src/translate-events.test.ts:76`：旧测试仍断言 0x73 迁为 alpha fade，必须改成 ditherScreen 精确时长。
- GLM opcode 迁移审计补充（用户转交，Codex 2026-07-12 本地复核）：
  - `0x49`：`all.json` canonical 流中 operand[0]==0 共 20 个条目；scene/shared 分区存在重复/可达折叠，当前生成产物实际有 17 个 `entity:"e-1"`。原版 `script.c:1711` 明确 operand[0]==0 为 no-op。
  - `0x50`：`all.json` 907 条（873 条 op0=0）；`0x51` 4 条。`script.c:1775` 与 `palette.c:PAL_FadeOut/PAL_FadeIn` 定义总时长为 delay×10×60ms，即 delay×600ms；当前无 ms 时 runner 默认 300ms，连默认档都缩短一半。
  - `0x73`：`all.json` 有 69 个 canonical 条目，`shared.json` 另有 4 个索引副本，形成 GLM 审计所报 73 个迁移索引条目；`scene-*` 直接分区可见 63 条。它们包含大量不邻接 loadScene 的站点，因此必须是通用屏幕重绘特效。
- 已知坑 / 审计文档：
  - `docs/phase2/foundation/w-render-audit.md:301`：dither 属壳层输出特效，不应污染场景渲染模型。
  - `docs/phase2/foundation/x-shell-audit.md`：time-based 状态必须有明确收尾人；切场景、读档、abort 不得留下孤儿 Promise/冻屏。
  - 当前基线证据：`pnpm --filter @type-pal/reforge run typecheck` 失败，报 `pendingDitherBackup/pendingDitherFrames` 未声明、ScriptHost 无 `ditherIn` 等 9 个诊断。
  - 附件中“0x73 位于对白前”与“目标帧已含后续叫醒对白”互相矛盾。按原始指令顺序和一阶段执行代码，本卡定案为：dither 目标是已落位的 s001 世界帧，完成后才显示叫醒对白。
- 不得重新引入：
  - 全局 `loadScene` 无条件冻屏、150 帧兜底、0x73 no-op、alpha 黑场冒充 dither、把通用命令误命名为只适合入场的 `ditherIn`。
  - palette index / nibble / paletteId 进入 reforge schema 或运行时。
  - speaker 只活在单次 `flush()` 内导致同一段梦话后续页丢姓名。
- 相关测试：
  - `packages/reforge/src/script-runner.test.ts`
  - `packages/migrate/src/translate-events.test.ts`
  - 新增 `packages/reforge/src/dither-transition.test.ts`
  - `packages/content` command/guard 相关测试及全仓 `pnpm check`

## 验收条件

- 功能：
  - s000 最后一帧以 72 级逐像素硬替换 dissolve 到已落位的 s001 世界帧，持续 2160ms，无 alpha 混色。
  - dissolve 完成后才出现李大娘叫醒对白，顺序与 extracted opcode / 一阶段执行链一致。
  - s000 梦话正文各批次均保留浅蓝“李逍遥”姓名，换 slot 后不错误串到下一位说话人。
  - 普通门/楼梯/传送仍按原有 fade 跳转；目标 stage 没有早期 ditherScreen 时不得产生 dither 状态或冻屏。
  - 切场景、读档、脚本 abort、目标 stage 结束但未消费 dither 时均能清理并兑现状态，无永久冻结。
- 测试：
  - dither helper 覆盖 step 0、step 72、单调揭示、边界 clamp/像素数。
  - runner/host 覆盖两路：跨场景精确消费 `loadScene` 交接帧；无前置 loadScene 时关闭对话后自行快照当前帧；两路均 await 完成并支持 abort 收口。
  - migrate 覆盖 0x73 speed=2 精确生成 2160ms；canonical/共享索引去重后所有可达站点均不再丢失。
  - migrate 覆盖 0x49 operand0=0 不产实体命令但仍 flush；最终产物扫描 `entity:"e-1"` 为 0。
  - migrate 覆盖 0x50/0x51 的 0、正数和 0xFFFF delay，精确断言 600ms 倍数。
  - migrate 覆盖姓名跨 raw 0x05/flush 继承、换 slot 清空、新姓名替换。
  - `pnpm --filter @type-pal/content run check`
  - `pnpm --filter @type-pal/migrate run check`
  - `pnpm --filter @type-pal/reforge run check`
  - `pnpm check`
- 文档：任务卡 Build/Review、验证命令、截图和已知未验项如实记录。
- 视觉 / 手工验证：
  - 6051 走 `?menu` 新故事到 s000→s001；记录 0/25/50/75/100% 截图和 `window.__rfDither`。
  - **M3 像素锚**：dither 0% 帧必须与切换前保存的 s000 最终冻帧逐像素相等（纯旧场景；不得是 s001、黑帧或混合帧）。
  - 中间帧像素检查同时存在旧帧与新帧原色，不出现插值 alpha 色；终帧与正常 s001 渲染一致。
  - 从 s001 走至少一个普通出口到 s003，确认无 150 帧冻结、无残留旧帧、无脚本错误。
  - 6002 仅用于确认演出顺序与姓名呈现，不要求 RGBA dissolve 与 palette nibble 逐像素数值相同。

## 推进签字

### 进入 build 前：设计签字

- Codex: **agree**（2026-07-12；已接受并写入 Opus M1：跨场景由 loadScene 窄前瞻在 switch 前捕获一次性交接帧，独立站点才命令内快照；M2 采用先关 dialog 状态再取最后已呈现 canvas；M3 已补 0% 纯旧帧像素锚。其余 opcode 三修与统一收口不变）
- Opus: **agree**（2026-07-12 复核；Codex Draft 设计点 2-6 已落实 M1/M2/M3——M1 跨场景 backup 由 loadScene 窄前瞻在 switchScene 前捕获 + `targetSceneId` 一次性交接、收口全路径零超时(根除 s001→s001);M2 先 `dialogBox.close()` 再取最后已呈现 canvas,经核对与一阶段 present.ts:262-267 拷 backup 顺序一致(纠正我原"清对话后不含对话"假设);M3 已补 0% 帧像素锚。逐项复核通过,无剩余必改项。详见主审立场复核结果）
- GLM: **agree**（整体设计方向 + 迁移三修 + 测试矩阵均正确；Opus M1 是运行时架构修正，不影响迁移语义）。逐项复核：

  **迁移覆盖（1）0x73 全站点**：
  - all.json canonical 69 条 + shared.json 4 条索引 = 73 个迁移条目。迁移器当前（translate-events.ts:562-566）把 0x73 **注释为 no-op 不产命令**——产物实测 `ditherScreen: 0 条`、`unmigrated 0x73: 0 条`。
  - 设计改为 `ditherScreen{ms: (op0+1)*10*72}` 正确。build 时迁移器改 line 562-566 产 `ditherScreen` 命令 + 重跑迁移 → 产物应出 73 条 `ditherScreen`（去重后）。**全覆盖可达，无遗漏。**
  - ⚠ build 注意：当前产物是旧迁移器跑的（0x73 被注释为 no-op），改完迁移器后必须**重跑迁移**才能出 ditherScreen。但用户有"不跑全量 migrate:content 写盘"约束 → 建议只 dry-run 核对 73 条数量 + 手工同步 s000/s001。

  **迁移覆盖（2）0x49 e-1 归零**：
  - 产物实测 `entity:"e-1"` = **17 条**（s026 1 条 + s081 7 条 + 其余分布）。设计改为 operand0==0 时 flush 但不 push → 产物 `e-1` 应归零。✅ 方向正确。
  - 批次边界保留（flush 后不 push，不 continue）→ 对话不会被错误合并。✅

  **迁移覆盖（3）0x50/0x51 fade 时长**：
  - 产物实测：fade 有 ms = 304 条、无 ms = **255 条**。255 条无 ms 的会被 runner 默认 300ms（而非原版 600ms）。
  - 设计改为 `(op0||1)*600` / `(int16(op0)>0?op0:1)*600`。公式经 Opus 逐项核对与 sdlpal palette.c:163/232 对齐。✅
  - 测试矩阵覆盖 op0=0（→600ms）/ 正数 / 0xFFFF（int16<0→600ms）三类边界。✅

  **迁移覆盖（4）speaker 继承**：
  - activeSpeaker 批次外 + 同 slot flush/0x05 不清 + 新姓名替换 + 换 slot 清空 + walkBody 重置。与一阶段 dialog-box.ts:192 姓名（末字冒号）语义一致。✅
  - 测试矩阵正反例（继承/清空/替换）完整。✅

  **Opus M1 评估**：M1（跨场景 backup 由 loadScene 窄前瞻在 switchScene 前快照交接）**只动 reforge 运行时（main.ts/script-runner.ts），不影响迁移语义**——迁移器照常产 `ditherScreen` 命令，不关心 backup 从哪来。M1/M2/M3 是运行时/视觉层的事，GLM 无异议。

  **测试矩阵评估**：验收条件里的测试项（dither helper / runner host / migrate 0x73+0x49+0x50-51+speaker / pnpm check）覆盖完整，无遗漏。补一条建议：migrate 测试加一条**产物扫描**（`ditherScreen` 条数 == 预期、`e-1` == 0），作为 dry-run 回归锚。

- counter / 分歧处理: Codex 已按 Opus M1/M2/M3 更新 Draft；GLM 迁移层无 counter。等待 Opus 复核后把其 counter 改签 agree。
- 缺签豁免: N/A
- build 准入结论: **allow —— 三签齐(Codex agree + GLM agree + Opus agree),M1/M2/M3 复核通过,允许 Codex 进入 build。**

### 进入 done 前：审查签字

- Codex: pending
- Opus: pending
- GLM: pending
- counter / 返工处理:
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

1. **先恢复基线**：普通目标 stage 不含早期 `ditherScreen` 时，`loadScene` 保留既有
   `fade out -> switchScene -> fade in`，不创建任何 dither 状态。
2. **两类 backup 来源（落实 Opus M1）**：
   - **跨场景**：`loadScene` 在旧场景仍可见时用 `getSceneDef(sceneId)` + 当前 stage 下标检查确定性
     命令前缀。只有在首个异步/视觉阻塞命令前必然执行 `ditherScreen`，才在 `switchScene` 前关闭
     dialog 状态、从当前 canvas 捕获旧帧，写入一次性交接态 `{targetSceneId, backup}`，跳过固定 fade。
   - **独立站点**：执行 `ditherScreen` 时若不存在匹配当前 scene 的交接态，则关闭 dialog 状态后直接
     从当前 canvas 捕获 backup。它覆盖没有前置 loadScene 的通用 0x73 站点。
3. **跨场景等待期只保持已确认的旧帧**：switchScene/onEnter 前缀的 async 间隙中，render 仅在该
   一次性交接态存在且 sceneId 匹配时覆盖显示 backup，防止 s001 提前闪现。它由确定性窄前瞻创建，
   只能被紧随的 ditherScreen 消费，不设 150 帧超时，不扩散到普通 loadScene。
4. **ditherScreen 消费规则**：优先原子 take 匹配当前 scene 的交接 backup；否则使用独立站点命令内
   backup。随后建立 active effect，下一次世界渲染后取 target 一次，按 72 级 dissolve，完成后 resolve。
5. **M2 对话顺序**：两路都先 `dialogBox.close()`，再捕获“最后已呈现 canvas”。关闭状态只影响后续
   target，不强制重绘或篡改已经呈现的旧像素；这与一阶段 `clearDialogBoxes` 先改状态、
   `present.ts:265` 随后从尚未 clear 的 framebuffer 取 backup 的实际顺序一致。
6. **统一收尾**：集中 helper 负责 cancel/finish。正常完成、script abort、读档、再次切场景、
   target onEnter 意外结束但未消费均清交接/active 状态并兑现已有 resolve，禁止孤儿 Promise；
   未消费时立即放行目标场景，不使用帧数超时。
7. **speaker 状态属于 walkBody**：`activeSpeaker` 放在批次外；同 slot 的 `flush`、0x05 clearDialog
   不清；新姓名牌替换；任何 setDialogStyle* 先 flush 旧批再清 speaker；新 walkBody 自然重置。
8. **0x49 no-op 保留结构边界**：operand0=0 时调用 `flush()` 后不 push Command，不能直接 continue，
   否则会把 opcode 两侧对话错误合并成同一批。
9. **0x50/0x51 时长数据化**：继续复用现有 `{kind:'fade',dir,ms}`，迁移时写入精确 delay×600ms；
   不把 palette 状态带回 reforge，只保留用户可感知的快慢。
10. **产物最小同步**：迁移逻辑和测试是长期真值；本次手工同步 s001 的 ditherScreen 与 s000 speaker。
   全量受影响统计通过临时输出核对；未经用户批准不覆盖当前大量脏场景文件。

### 当前草稿处置

- 保留候选：`dither-transition.ts` 的 RGBA helper、main.ts DEV `__rfScene/__rfDither`（验收后仅保留有用口）。
- 必须重写：main.ts 全局无条件 loadScene 劫持改为“窄前瞻一次性交接态”、0x73 no-op 注释；命令名由 ditherIn 改为 ditherScreen。
- 必须补齐：ScriptCommand、ScriptHost、runner dispatch、三类单测、普通换场景回归。
- 不属于本卡：`dialog-text.ts`、center slot、loadScene 1-based 修复、E2E checkpoint、全量场景差异；
  本卡不得顺手回退或提交这些改动。

### 已知风险

- 风险：只扫描“场景里任意 ditherScreen”会为未执行分支错误跳过普通 fade。
  - 缓解：按当前活动 stage 且仅扫描确定性的同步前缀；遇 branch/await 类命令立即判定“不跳过普通 fade”。
- 风险：一次性交接态错误路由或未消费会造成旧帧残留。
  - 缓解：交接态绑定 `targetSceneId`，仅匹配 scene 的首个 ditherScreen 可原子 take；onEnter 收尾/abort/
    再切场景统一清理，零超时；普通 loadScene 永不创建它。
- 风险：ImageData 物理尺寸大且每帧全扫描。
  - 缓解：只在显式过渡期间持有 backup/target；72 步单调更新；结束立即释放。
- 风险：speaker 继承过宽造成跨人物串名。
  - 缓解：换 slot 清空、新姓名覆盖、walkBody 边界清空；用正反例测试钉住。
- 风险：全量迁移输出会覆盖工作区中其他 Agent 的大量改动。
  - 缓解：先在临时目录生成并做结构化 diff；本卡只应用白名单产物，禁止直接写盘全量迁移。
- 风险：当前工作区有大量其他未提交文件。
  - 缓解：实现和提交只按白名单文件收口，提交前逐文件审 diff，不运行全量迁移。

### 主审立场

- Reviewer: Opus（架构/视觉主审）+ GLM（迁移覆盖/测试矩阵）
- 结论: **agree**（2026-07-12 复核；Codex 已在 Draft 设计点 2-6 落实 M1/M2/M3,逐项核对满足;整体通用 `ditherScreen` 架构 + opcode 三修 + 统一收尾均正确,无剩余阻塞项）。
- M1/M2/M3 复核结果（原 counter 三项，现全部通过）:
  - **【M1 通过】跨场景 backup 帧捕获**:设计点 2 改为 `loadScene` 窄前瞻在 **`switchScene` 之前**从当前 canvas 捕获旧帧、写入 `{targetSceneId, backup}` 一次性交接态——backup 在 canvas 确定仍是旧场景时捕获,**不受后续 async `switchScene`/`onEnter`/`setActorSprite` 的 rAF 影响,根除 s001→s001**(即我原 counter 的核心风险)。设计点 3/6:交接态绑 `targetSceneId`、只被紧随 ditherScreen 原子 take、普通 `loadScene` 永不创建、**零 150 帧超时**、onEnter 未消费即放行——够窄且收口完整,非全局冻屏。独立站点仍命令内快照(设计点 2/4),两类分开写清。收尾人覆盖正常/abort/读档/再切场景/onEnter 未消费全路径,符合 x-shell-audit。
  - **【M2 通过】backup 对话顺序**:核对**推翻我原假设**——一阶段 present.ts:262-267 的 `backupPixels = new Uint8Array(fb.indices)` 在 `fb.clear()` **之前**拷(注释明写"fb clear 前还留着上一帧像素"),即一阶段 backup **本就含上一帧对话像素**,dialog 状态清只影响 target。Codex"先 `dialogBox.close()` 再取最后已呈现 canvas"与此**顺序一致**(backup 含旧对话、target 不含),论证成立。s000→s001 主用例此刻梦话已清、canvas 无对话框、无差异。
  - **【M3 通过】0% 帧像素锚**:验收 103 已补"dither 0% 帧须与切换前保存的 s000 最终冻帧逐像素相等(非 s001/黑/混合帧)",正是 backup 正确性的硬锚。
- 已核对通过、agree 的部分(供 build 直接采用):
  - **0x50/0x51 时长公式正确**:sdlpal script.c:1780 `PAL_FadeOut(op0?op0:1)`、:1790 `PAL_FadeIn(int16(op0)>0?op0:1)`,palette.c:163/232 `iDelay*10*60`=×600ms → Codex 的 `(op0||1)*600` / `(int16(op0)>0?op0:1)*600` **逐项对齐**,含 op0=0(=1 档=600ms)与 0xFFFF(int16<0 → 1 档)边界。当前 runner 默认 300ms 确是缩半 bug。
  - **0x49 operand0==0 flush-不-push**:保留批次边界、消除 `e-1`,方向对(script.c:1711 no-op 语义)。
  - **speaker 属 walkBody**:activeSpeaker 批次外 + 同 slot flush/0x05 不清 + 新姓名替换 + 换 slot 清空 + walkBody 重置,符合一阶段 dialog-box.ts:192 姓名识别(末字冒号独立句)语义,agree。
  - **统一收尾 helper**(正常/abort/读档/再切场景全清 active + 兑现 resolve、禁孤儿 Promise、不用超时)符合 x-shell-audit 收尾人原则,agree。
  - **对白在 dither 完成后出现**:依 event-system.ts:2493 + present.ts:603 一阶段执行链,任务卡定案正确,agree。⚠ 用户 2026-07-11 视觉描述"带第二句对话一起过渡"与此有观感分歧——按铁律 8 视觉裁决权归用户:6051 须录 0/25/50/75/100% 交用户复验,若用户坚持对白参与 dissolve 再单开变更,不在本卡强行改语义。
  - **产物白名单收口 + 禁 migrate:content 写盘**:工作区当前有 40+ 脏场景文件,严格白名单(s000/s001 手工同步 + migrate src/test),其余 dry-run,agree 且强调。
- 是否建议进入 build: **是 —— 三签齐(Codex agree + GLM agree + Opus agree),M1/M2/M3 全部复核通过,无剩余阻塞项,允许 Codex 进入 build。** build 时必须钉死:①M3 的 0% 帧 = s000 冻帧逐像素锚(backup 正确性硬验);②普通场景(s001→s003 出口)全程 `__rfDither` inactive 回归;③交接态收口全路径测试(正常/abort/读档/再切场景/onEnter 未消费);④迁移产物 dry-run 白名单同步(s000/s001 + migrate src/test,禁 migrate:content 写盘)。

### 三方争议记录（按需）

- Codex: 接受 Opus M1，把 backup 来源拆成“跨场景 loadScene 窄前瞻一次性交接 / 独立站点命令内快照”；接受 M2 的先关 dialog 状态再取最后已呈现 canvas，并补 M3 0% 纯旧帧锚。附件对白顺序仍按 extracted + 一阶段执行链定为 dither 完成后出现。
- Opus: 整体设计 agree。**核心分歧 M1**——设计点 2/3“命令内快照 + switchScene/onEnter 同一微任务链捕获旧帧”在当前架构不成立(switchScene async + onEnter 走 pendingOnEnter tick + setActorSprite async → 任一 await 触发 rAF 渲染新场景 → 命令内快照取到新场景帧)。主张:跨场景用例由 loadScene 窄前瞻在 switchScene 前快照旧帧交接(窄确定协作,≠ 被否的全局无条件 + 150 帧超时);独立站点仍走命令内快照。**次分歧 M2**:backup 是否含旧对话——一阶段清对话后 backup,建议对齐(先关 dialogBox 再快照)。对白顺序 agree 任务卡定案,但用户“带对话过渡”观感留 6051 用户复验。与 Codex 的共识:通用 ditherScreen 命令、恢复基线、opcode 三修、统一收尾方向全部正确,分歧仅在跨场景 backup 的捕获时机与来源。
- GLM: pending
- 用户拍板: 用户已否定当前全局 loadScene 改法；对白顺序若两方仍有异议再请用户视觉裁决。

## 额度 / 代班记录（如适用）

- 缺席 Agent: none
- 缺席原因: N/A
- 代班 Agent: N/A
- 代班范围: N/A
- 风险: N/A
- 是否需要补审: N/A
- 用户裁决: N/A

## Build: 实现与自测

- Coding Owner: Codex（拟定，待三签）
- 修改文件: 待 build
- 实现摘要: 待 build
- 运行命令: 当前仅基线 `pnpm --filter @type-pal/reforge run typecheck`，失败（9 个 dither 草稿相关诊断）
- 浏览器 / 手工检查: 未开始
- 跳过的检查及原因: build 门禁未通过

## 资源生成记录（如适用）

N/A

## 视觉验证记录（如适用）

- Visual Verification Owner: Codex 自验；Opus 复验
- 验证方式: 6051 开场全链 + 普通出口回归 + 分阶段截图/像素检查
- 截图 / 像素检查路径: 待 build
- 结论: 未开始
- 未完成项: 全部

## Review: 审查与返工

- Reviewer: Opus + GLM
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: pending

## 交接日志

- 2026-07-12 Codex: 读取用户转交说明并审计未提交实现；确认全局 loadScene 被错误劫持、0x73 被置空、schema/runner 未接通，reforge typecheck 失败。已按用户“当前改法作废、恢复正常跳转”要求重写设计并签 agree。Evidence: 本卡上下文锚点与基线命令。Next: 等待 opcode 审计补充后更新设计。
- 2026-07-12 Codex: 接收 GLM opcode 审计并本地复核：0x73 为通用独立站点（69 canonical + 4 shared 索引条目），旧 pending-loadScene 设计作废，改为命令内快照的 ditherScreen；同时纳入 0x49 no-op/e-1 与 0x50/51 delay×600ms。Evidence: `all.json`/`shared.json` 统计、`script.c:1711/1775`、`palette.c:PAL_FadeOut/In`。Next: Opus 复核修订版设计；不得实现。
- 2026-07-12 Opus: 设计签 **counter**（M1 阻塞 + M2/M3 非阻塞）。核对锚点:sdlpal script.c:2140-2147(0x73=VIDEO_BackupScreen→MakeScene→FadeScreen,原版不清对话)、:1780/:1790(0x50/0x51 delay 公式)、palette.c:163/232(×10×60=600ms) → 0x50/0x51 公式确认正确;main.ts:474/478(switchScene async)、:790/1881(onEnter 走 pendingOnEnter tick)、:810(setActorSprite async) → 坐实"命令内快照会取到新场景帧",跨场景须 loadScene 窄前瞻在 switchScene 前快照交接。整体通用 ditherScreen 架构、opcode 三修、统一收尾、speaker walkBody、产物白名单均 agree。Evidence: 本卡主审立场 + 三方争议 Opus 行。Next: GLM 复核迁移覆盖/测试矩阵;Codex 据 M1/M2/M3 更新 Draft 后三签齐再 build。未改任何实现文件。
- 2026-07-12 Codex: 已落实 Opus M1/M2/M3：跨场景由 loadScene 窄前瞻在 switch 前捕获并按 targetSceneId 一次性交接，等待期仅该路径保持旧帧；独立站点仍命令内快照；两路先关 dialog 状态再取最后已呈现 canvas；验收新增 0% 与 s000 冻帧逐像素相等。Evidence: Draft 设计点 2-6、验收 M3。Next: Opus 复核改签 agree；仍不得 build。
- 2026-07-12 Opus: **复核改签 agree,三签齐**。逐项核对 Draft 设计点 2-6:【M1 通过】backup 在 `switchScene` 前从当前 canvas 捕获 + `{targetSceneId,backup}` 一次性交接 + 收尾全路径(正常/abort/读档/再切场景/onEnter 未消费)零超时 → 根除 s001→s001;【M2 通过】核对 present.ts:262-267 `backupPixels` 在 `fb.clear()` 前拷、本就含上一帧对话像素,Codex"先 `dialogBox.close()` 再取最后已呈现 canvas"与一阶段顺序一致(纠正我原"清对话后 backup 不含对话"假设);【M3 通过】验收 103 补 0% 帧=s000 冻帧逐像素锚。0x50/0x51 公式、speaker walkBody、统一收尾、产物白名单沿用 agree。build 准入改 allow。Evidence: 主审立场复核结果 + present.ts:262-267。Next: Codex 进 build,钉死 ①0% 帧像素锚 ②普通场景 `__rfDither` inactive 回归 ③交接收口全路径测试 ④迁移 dry-run 白名单(禁 migrate:content 写盘)。未改任何实现文件。

## 下一位 Agent 提示词

```text
接手任务:X3/M3 通用 0x73 逐像素过渡、开场恢复与 opcode 迁移语义修复（进入 build）
任务卡:docs/ops/tasks/X3-opening-dither-speaker-inheritance.md
当前状态:draft；三签齐(Codex agree + GLM agree + Opus agree),build 准入 allow
你的角色:Codex，Coding Owner，按 Draft 设计点 1-10 实现并自测,填写 Build 段与视觉验证段
先读:AGENTS.md、docs/phase2/READ-FIRST.md、任务卡全部(尤其 Draft 设计点 1-10、验收条件、当前草稿处置、已知风险、三方 agree 逐项复核)
已完成:三签齐设计定案——通用 ditherScreen 命令(跨场景由 loadScene 窄前瞻在 switchScene 前捕获旧帧 + targetSceneId 一次性交接;独立站点命令内快照);统一收尾 helper(正常/abort/读档/再切场景/onEnter 未消费,零超时);0x49 flush-不-push 消 e-1;0x50/0x51 delay×600ms;speaker walkBody 继承;M2 先 close dialog 再取最后已呈现 canvas;M3 0% 帧=s000 冻帧像素锚
请你做:按白名单实现——(1)撤当前草稿的全局 loadScene 劫持/pending 冻屏/0x73 no-op,恢复普通 loadScene 的 fade out→switchScene→fade in;(2)ScriptCommand `ditherScreen` + ScriptHost + runner dispatch;(3)loadScene 窄前瞻 `{targetSceneId,backup}` 交接态 + ditherScreen 两路 backup(交接优先/独立站点命令内)+ tick 72 级 dissolve 绘制 + 统一收尾 helper;(4)migrate 0x73→`ditherScreen{ms:(op0+1)*10*72}`、0x49 op0==0 no-op-但-flush、0x50/0x51 delay×600ms、speaker 跨 flush 继承;(5)三类单测(dither helper step0/72/单调/边界 + runner 两路+abort + migrate 四项)+ 产物扫描(ditherScreen 条数==预期、e-1==0);(6)手工同步 s000/s001,其余 dry-run 临时目录核对;(7)6051 视觉验证(0/25/50/75/100% 截图 + `__rfDither`,M3 0% 帧=s000 冻帧逐像素锚,s001→s003 普通出口全程 `__rfDither` inactive 回归)。填 Build/视觉验证段
不要做:不跑会写工作区的 pnpm migrate:content(只临时目录 dry-run);不碰工作区 40+ 无关脏场景文件;不把 0x73 塞回全局 loadScene/pending 冻屏/150 帧超时;不带 palette/nibble/paletteId 进 reforge;非本卡改动(dialog-text/center slot/loadScene 1-based/E2E checkpoint)不顺手提交或回退
输出要求:修改文件白名单、`pnpm check` 结果、6051 截图 + 0% 帧像素锚结论、跳过项及原因、提交 hash;done 前回三签审查(Codex 自审 + Opus 视觉复验 + GLM 迁移复核)
```
