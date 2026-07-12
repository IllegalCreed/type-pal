# X3/M3 - 通用 0x73 逐像素过渡、开场恢复与 opcode 迁移语义修复

Status: rework
Phase: phase2
Capability: X3（标题/流程/开场演出）+ M3（脚本迁移）
Coding Owner: Codex（用户否决第三版 source-L bridge；第四版设计待三签，暂停实现）
Generation Owner: N/A
Reviewer: Opus + GLM
Visual Verification Owner: Codex 自验；Opus 复验
Unavailable Agents: none
Branch: main

## 目标

先撤掉当前未完成 dither 草稿对全局 `loadScene` 的破坏，恢复所有普通场景稳定跳转；再把
`0x73 VIDEO_FadeScreen` 建模为可在任意脚本站点执行的通用 RGBA `ditherScreen`，开场
s000→s001 只是其中一个跨场景用例。同时修复梦话 speaker 继承、`0x49` phantom `e-1` 和
`0x50/0x51` 淡变时长丢失。视觉必须保留一阶段“每个像素自身逐级变色”的特征，而不是把
每个像素在旧色/新色之间生硬切换；普通换场景不得被冻结或被迫等待 dither。

## 范围

- 范围内：
  - 恢复普通 `loadScene` 原有淡出、切场景、淡入路径。
  - 新增显式通用 `ditherScreen` ScriptCommand、runner host/dispatch、RGBA 渐变状态和生命周期收口。
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
  - reforge 保持 RGBA 架构，禁止恢复 palette / paletteId；视觉采用 6 相位错峰、每像素 12 级离散 RGBA 渐变。
- 原始数据与一阶段锚点：
  - `data/extracted/events/scene-001.json` segment[0] `[586..593]`：`playMusic -> raw 0x45 -> teleport(0x46) -> 0x73 -> setDialogStyleTop -> 李大娘对白`。
  - `packages/game/src/core/event-system.ts:2493`：0x73 建立 72 步 fadeState，先清对话并阻塞完成，随后脚本才执行下一条对白。
  - `packages/game/src/present/present.ts:603`：先画对话，再应用 fadeState；0x73 启动时已清对话，因此新目标帧不含后续“李逍遥！你皮痒啊？”对白。
  - `packages/game/src/present/dither-fade.ts:13`：RG_INDEX 与 72 步空间相位参考；reforge 只继承空间节奏，不继承 palette nibble。
- 代码锚点：
  - `packages/reforge/src/main.ts:474`：`switchScene` 原子切换场景；`getSceneDef` 可在旧场景仍显示时预读目标定义。
  - `packages/reforge/src/main.ts`：开卡时草稿曾无条件快照所有 `loadScene` 并删除普通 fade；未提交 build
    已改为窄前瞻交接，但普通出口黑屏说明回归仍未闭环。
  - `packages/reforge/src/main.ts` 主脚本收尾与目标 onEnter 排队处：可在 abort/未消费 dither 时统一清理 pending 状态。
  - `packages/reforge/src/main.ts`：当前未提交过渡绘制与 DEV 诊断接线；时序可保留，视觉算法待返工。
  - `packages/reforge/src/dither-transition.ts`：当前未提交二值 RGBA helper + 生命周期 controller；已有单测，
    但二值视觉断言随用户裁决作废。
  - `packages/content/src/script.ts:33`、`:53`：ScriptCommand 的 fade/loadScene 现有公共接口。
  - `packages/reforge/src/script-runner.ts:17`、`:274`：ScriptHost 与命令 dispatch。
  - `packages/migrate/src/translate-events.ts`：对话 batch/flush 与 0x49/0x50/0x51/0x73 分派；开卡时
    0x73 是 no-op，未提交 build 已修正并有定向测试。
  - `packages/migrate/src/translate-events.test.ts`：已在未提交 build 中加入 ditherScreen 精确时长与迁移四修覆盖。
- GLM opcode 迁移审计补充（用户转交，Codex 2026-07-12 本地复核）：
  - `0x49`：`all.json` canonical 流中 operand[0]==0 共 20 个条目；scene/shared 分区存在重复/可达折叠，当前生成产物实际有 17 个 `entity:"e-1"`。原版 `script.c:1711` 明确 operand[0]==0 为 no-op。
  - `0x50`：`all.json` 907 条（873 条 op0=0）；`0x51` 4 条。`script.c:1775` 与 `palette.c:PAL_FadeOut/PAL_FadeIn` 定义总时长为 delay×10×60ms，即 delay×600ms；当前无 ms 时 runner 默认 300ms，连默认档都缩短一半。
  - `0x73`：`all.json` 有 69 个 canonical 条目，`shared.json` 另有 4 个索引副本，形成 GLM 审计所报 73 个迁移索引条目；`scene-*` 直接分区可见 63 条。它们包含大量不邻接 loadScene 的站点，因此必须是通用屏幕重绘特效。
- 已知坑 / 审计文档：
  - `docs/phase2/foundation/w-render-audit.md:301`：dither 属壳层输出特效，不应污染场景渲染模型。
  - `docs/phase2/foundation/x-shell-audit.md`：time-based 状态必须有明确收尾人；切场景、读档、abort 不得留下孤儿 Promise/冻屏。
  - 开卡时基线证据（历史）：`pnpm --filter @type-pal/reforge run typecheck` 曾失败，报
    `pendingDitherBackup/pendingDitherFrames` 未声明、ScriptHost 无 `ditherIn` 等 9 个诊断；这些诊断已在
    未提交 build 中消除，最新验证状态以 Build 段为准。
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
  - s000 最后一帧以 72 步错峰渐变到已落位的 s001 世界帧，持续 2160ms；每个逻辑像素自身经历最多 12 级离散颜色逼近，不是旧色/新色二选一。
  - dither 完成后才出现李大娘叫醒对白，顺序与 extracted opcode / 一阶段执行链一致。
  - s000 梦话正文各批次均保留浅蓝“李逍遥”姓名，换 slot 后不错误串到下一位说话人。
  - 普通门/楼梯/传送仍按原有 fade 跳转；目标 stage 没有早期 ditherScreen 时不得产生 dither 状态或冻屏。
  - 切场景、读档、脚本 abort、目标 stage 结束但未消费 dither 时均能清理并兑现状态，无永久冻结。
- 测试：
  - dither helper 覆盖 step 0、step 72、6 相位顺序、12 级单像素单调逼近、边界 clamp/像素数。
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
  - 中间帧抽样必须能观察到单个逻辑像素的离散中间色，不能只有旧帧/新帧原色；同一 4×4 逻辑像素块使用同一渐变级别；终帧与正常 s001 渲染一致。
  - 从 s001 走至少一个普通出口到 s003，确认无 150 帧冻结、无残留旧帧、无脚本错误。
  - 6002 仅用于确认演出顺序与姓名呈现；RGBA 适配不要求与 palette nibble 数值相同，但动态特征须一致。

## 推进签字

### 第一次进入 build 前：设计签字（历史记录，视觉算法已作废）

> 2026-07-12 用户视觉验收否决“像素按阈值在旧色/新色之间硬切换”的实现。以下三签只覆盖旧版
> hard dissolve 设计，不能作为二次 build 准入依据；backup、时序、opcode 迁移等未被否决部分继续有效。

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
- 历史 build 准入结论: **曾 allow；现已被用户视觉裁决撤销。**

### 二次进入 build 前：视觉算法修订签字

- Codex: **agree**（2026-07-12；复核一阶段 `packages/game/src/present/dither-fade.ts:29-42` 后确认：旧实现错误地只移植空间相位、把每个像素改成旧色/新色硬替换，丢失了像素低 nibble 逐趟逼近目标的核心观感。提议在不恢复 palette 的前提下，以 320×200 逻辑像素、`RG_INDEX` 六相位错峰、每像素 12 级离散 RGBA 插值复刻动态特征；0%/100% 精确等于旧/新帧）
- Opus: **agree**（2026-07-12 二次;12 级离散 RGBA 插值数学核对正确,恢复“每像素逐级变色”核心动态。附 3 复验重点:①颜色空间——sRGB 直接插值中间色可能偏暗,6051 中间帧复验亮度,已定 gamma-correct 退路(纯 RGBA、不恢复 palette);②“首趟高位跳”细节丢失,6051 与一阶段录屏并排比节奏;③浏览器取样补 25/50/75% 中间帧亮度数值。1 独立阻塞:s001→s003 黑屏 done 前必解。详见二次主审立场逐条结论）
- GLM: **agree**（二次，2026-07-12）。视觉算法重写对迁移层零影响，迁移四修沿用，测试矩阵完整。逐项：

  **视觉重写对迁移零影响**：12 级离散 RGBA 插值是 reforge 运行时纯函数（dither-transition.ts），不改迁移器产出的 Command schema/语义。迁移器照常产 `ditherScreen{ms}`，运行时怎么画 backup→target 渐变不归迁移管。✅ 零影响确认。

  **迁移四修沿用（二次复核）**：第一次签字已核过的四项（0x73 全站点 73 条 / 0x49 e-1 归零 / 0x50-0x51 ms×600 / speaker 继承）**不被视觉算法重写触及**——迁移器代码不变，只换运行时 helper。Codex Build 段 dry-run 实测：`ditherScreen` 110 处（含内联展开）、`entity:"e-1"` 0、fade 缺 ms 0。✅ 全部沿用有效。

  **12 级测试矩阵评估**：
  - phase rank 顺序（RG_INDEX={0,3,1,5,2,4} × outer/inner 组合）✅
  - 12 级单像素单调逼近（level=clamp(outer+...,0,12)）✅
  - 0/72 端点精确等于 old/target ✅
  - 4×4 物理块共享逻辑 level ✅
  - 非累积（每帧从不可变 old/target 重算）✅
  - 浏览器同逻辑像素跨帧取样出现离散中间色 ✅
  - Opus 补的 25/50/75% 中间帧亮度数值记录（sRGB vs gamma-correct 裁决量化依据）✅ 纳入验收
  **测试矩阵完整，无遗漏。**

  **gamma 退路评估**：sRGB 直接插值（`round((old*(12-level)+target*level)/12)`）作为起点 + gamma-correct 退路（`round((...)**(1/2.2)*255)` 纯 RGBA）——**两条公式都是 reforge 运行时纯函数，不引入 palette/index/nibble**。符合铁律（不恢复 palette 数据模型）。✅ 退路纯 reforge 确认。

  **Opus 3 复验重点 + 1 独立阻塞**：均在 6051 视觉阶段落地（① sRGB 中间帧亮度 ② 首趟高位跳节奏对比 ③ 浏览器取样中间帧 + s001→s003 黑屏定位）——不涉及迁移层，GLM 无异议。

- counter / 分歧处理: 无设计层 counter。三签齐（Codex agree + Opus agree + GLM agree）。
- 缺签豁免: N/A
- build 准入结论: **三签齐，build allowed**。build 范围含 sRGB + gamma-correct 两路公式、s001→s003 黑屏定位。

### 第三次进入 build 前：假色桥接算法修订签字

- Codex: **agree**（2026-07-12；用户指出原版观感是“旧场景快速切到目标场景的近似反色/假色态，
  再从假色恢复正常”。本地复核确认开场未切 palette 1，仍使用 palette 0；关键是首趟
  `target 高 nibble | source 低 nibble`，即目标色系/几何与旧帧明暗的桥接。提议保持纯 RGBA：
  首次访问像素时跳到“目标色相/色度 + 旧帧感知亮度”的 bridge，后 11 趟再离散逼近 target）
- Opus: **agree**（2026-07-12 三审;bridge 模型正确模拟 `(target高nibble|source低nibble)` 的结构本质——hue/chroma 承接原版"高 nibble=色系"、感知 lightness 承接"低 nibble=明暗",全屏假色态时序 step6=180ms 与原版 speed2 精确吻合;visits 公式经程序验算:边界(s=0 全 source/s=1 rank0 首访/s=6 全屏 bridge/s=7 rank0 二访/s=72 全 12)、单调不减、每 step 恰一相位 +1 全部成立;中性/近黑退化与 gamut map 方向正确;预计算一次 + 复用 output 性能可行;拒绝 palette 重量化路径符合铁律 4/6。附 R1-R4 build 要求(单测边界/特例三件套/预计算成本测量/两处有意近似文档化),详见第三版主审立场）
- GLM: **agree**（三次，2026-07-12）。第三版假色桥接算法（OKLCH bridge + visits 收敛）对迁移层零影响，未否决部分沿用，测试矩阵含 R1/R2 完整性确认。逐项：

  **迁移零影响**：bridge 预计算 + visits 收敛 + gammaLerp 全是 reforge 运行时纯函数（dither-transition.ts）。迁移器照常产 `ditherScreen{ms}`——Command schema/语义不变，运行时用什么算法（linear/gamma/OKLCH bridge）画 backup→target 不归迁移管。✅ 零影响。

  **未否决部分沿用**：backup 两路来源（跨场景 loadScene 窄前瞻 / 独立站点命令内快照）、2160ms 时长、M2 对话时序、统一收尾、迁移四修（0x73 全站点 / 0x49 e-1 归零 / 0x50-0x51 ms×600 / speaker 继承）——**三次设计修订只改视觉算法（dither-transition.ts 的渐变公式），不改 backup/时序/收口/迁移**。三次签字里 GLM 第一/二次核过的迁移四修 + dry-run 数据（ditherScreen 110 处 / e-1=0 / fade 缺 ms=0）全部继续有效。✅

  **测试矩阵（含 R1/R2 完整性）**：
  - R1（visits 边界）：step 0 全 0(source) / step 1 rank0 首访(bridge) / step 6 全屏 bridge / step 7 rank0 二访 / step 67-72 全 12(target) + step6 全屏 bridge 断言 → **完整覆盖 visits 公式边界。** ✅
  - R2（特例三件套）：近中性 target 退化中性灰 / 近黑 source·target / gamut 极值（高饱和 target × 异亮度 source）→ **覆盖 palette→OKLCH 映射的退化路径。** ✅
  - 11 级收敛单调（bridge→target gamma-correct 离散步，visits 2..12）✅
  - 4×4 物理块共享逻辑 visits/level ✅
  - 0/72 端点精确等于 source/target ✅
  - alpha 线性不进色彩空间 ✅
  - R3（预计算成本实测）+ R4（两处近似注释文档化）→ build 时必落，非设计阻塞 ✅
  **测试矩阵完整，R1/R2 无遗漏。**

  **不采用精确兼容路径的评估**：Codex 拒绝"重新量化回 palette 0 + nibble 算法"路径正确——它会重新侵入 RGBA 壳层（铁律 4/6）。OKLCH bridge 是在不恢复 palette 数据模型前提下最忠实的近似。✅ 符合铁律。

- counter / 分歧处理: 无设计层 counter。三签齐（Codex agree + Opus agree + GLM agree）。
- 缺签豁免: N/A
- build 准入结论: **三签齐，build allowed**。build 范围含 OKLCH bridge 预计算 + visits 收敛 + R1-R4 + s001→s003 黑屏定位。

### 第四次进入 build 前：target-only 异色帧修订签字

- Codex: **agree**（2026-07-13 四审定案；接受 Route A 为 PAL 主路径、Route B 仅作无 profile
  fallback。profile 定为工程级单个 v1 RGB→RGB 内容表，由
  `manifest.content.ditherFalseColorProfile` 显式引用
  `content/transitions/dither-false-color.json`；不改 `ditherScreen` command schema。生成逻辑放
  `@type-pal/migrate` 资产 bake，绝不改 pal-extract。runtime 精确 RGB 哈希优先，miss 按 OKLab
  最近邻并按目标 RGB memoize；无 profile 才走 Opus 公式。bridge 构造 API 删除 source 入参，alpha
  取 target，从类型/调用层钉死 target-only。完整形态与 T3 修订见 Codex 定案段）
- Opus: **agree**（2026-07-13 四审;基于 palette 0 实测数据交付落地方案——**Route A(主,PAL 内容)**:烘焙期把 `pal[i]→pal[i&0xF0]` 生成 256 对通用 RGB→RGB 过渡 profile 资产,runtime 哈希精确命中+最近邻容差,**精确复刻原版异色帧**;**Route B(fallback,非 PAL 工程)**:`f_c=round(48·(t_c/M)^3)`(对全 ramp 拟合,均差 26.2 —— 同类深色浓彩但逊于 LUT,故仅无 profile 时用);bridge=纯 target 函数,visits/时序/端点沿用 v3 已验数学;ramp 知识只进烘焙脚本,schema 触点(profile 引用形态)标**三方必审**。附 T1-T7 测试(含 T3 反 v3 回归锚:98% 黑 source 下 bridge 均 max≥32)。详见第四版主审立场。**并记录我 v3 误判**:曾签"近黑 source→bridge≈黑 ✓"为等价——实测 ramp[0] 是深色高饱和族色([52,0,0]/[0,0,60]/[0,24,93]),黑≠族 0 档,该"✓"错误,是 v3 放行的根因之一）
- GLM: pending
- counter / 分歧处理: Codex 接受 Opus 双路方案并把引用形态定为显式 content manifest 字段；T3
  “所有 bridge max≥32”因部分合法 ramp 0 档低于 32 而收窄为 ramp1/5/13 精确字节锚，不构成
  路线 counter。请 GLM 复核 profile 烘焙对迁移主链零影响、T1-T7、Route B 拟合指标和具体形态。
- 缺签豁免: N/A
- build 准入结论: **blocked（Codex + Opus agree；待 GLM 复核；三签齐前不得 build）**

### 进入 done 前：审查签字

- Codex: **counter / accept 已撤销**（2026-07-13；用户澄清异色帧只属于 s001，与 s000 无关；
  `bdd35ff6` 用 source 绝对亮度构造 bridge，产品模型根本错误。其测试/性能只证明错误方案按设计运行，
  不再构成 done 准入）
- Opus: pending（第三版实现审查停止，先审第四版 target-only 设计）
- GLM: pending（第四版实现完成前不进入 done 复核）
- counter / 返工处理: 用户第三次视觉 counter；第三版视觉实现退回 rework。未变化的 backup、时序、
  生命周期和迁移四修结论继续有效。
- 缺签豁免: N/A
- done 准入结论: blocked（第四版尚未设计三签/build/review/用户验收）

## Draft: 设计与风险

### 用户第三次视觉裁决：异色帧只属于 s001

- **用户澄清**（2026-07-13）：正确观感是先切换成 s001 的异色版本，再从异色恢复正常 s001；
  这段异色恢复与 s000 没有关系。第三版仍像简单渐变，判定 `counter`。
- **Codex 根因复核**：第三版把 bridge 定义成 `target hue/chroma + source absolute L`。开场 s000
  最终截图约 98.3% 为暗像素，生成的 bridge 约 99.2% 仍为暗像素；source L=0 时 gamut map 会把
  任意 target chroma 压回纯黑。因此 s001 的颜色/结构只能在 bridge -> target 的后 11 趟逐渐出现，
  视觉必然退化成黑到 s001 的普通渐亮。
- **与原色坡的关键差异**：palette 0 各 16 色坡的第 0 档并不统一为黑，例如 index 16
  `[52,0,0]`、80 `[0,0,60]`、144 `[93,40,24]`。原版目标高 nibble 即使配低档 0，仍保留
  s001 的异色结构；“source RGB 黑 -> bridge 绝对黑”不是等价映射。
- **第二个退化原因**：第三版 bridge 与 target 共用同一 target hue/chroma，后 11 趟主要只改变
  lightness；连续 OKLCH + gamma 插值进一步抹平了原离散色坡的非线性色偏，所以即便非黑区域也更像
  调亮，而不是明显的异色归位。
- **第四版不可变产品约束**：`visits=0` 可显示切换前帧；`visits=1` 必须写
  `falseColor(target)`，且该异色像素只依赖 s001 target；`visits=2..12` 才从 falseColor 收敛到
  normal target。前六相位约 180ms 完成 s000 -> s001 异色帧的快速替换，主观主体是后续 s001
  异色 -> 正常，而不是 source/target crossfade。
- **待三方定案，不得先写代码**：
  1. 精确内容路径：把 PAL 色坡烘成隔离的“目标 RGB -> 异色 RGB”过渡 LUT/profile，reforge 壳层
     只消费通用颜色变换资源，不在世界/schema 恢复 paletteId/nibble；需审资产管线与多 palette 覆盖。
  2. 通用近似路径：纯 RGBA 的 target-only false-color 公式；必须先用一阶段动态帧验证公式，不再凭
     OKLab 常数猜测。若无法同时满足忠实观感与通用性，应优先把 PAL profile 隔离在内容适配层。

### 第四版 Opus 设计审查（2026-07-13,palette 0 实测数据 + 落地方案）

- **数据核对(data/extracted/data/palette/0.json 全表)**:16 ramp 结构 = 0 档最暗、15 档最亮;
  **0 档 = 深色高饱和族色**(ramp1=[52,0,0] 纯暗红/ramp5=[0,0,60] 纯暗蓝/ramp13=[0,24,93]/
  ramp3=[85,40,0],max 通道 16-93),仅 ramp0 灰阶的 0 档为纯黑。对 98.3% 黑的 s000,原版
  `(tgtHi|srcLo≈0)` = 逐像素取**目标族色 0 档** = s001 画成深色浓彩的异色帧 —— 用户钉死事实
  与数据完全吻合。**v3 死因数据化**:v3 把"src L≈0"塌缩为"bridge=黑",而原版映射到"族 0 档"
  ——黑 ≠ 族 0 档(仅灰阶族例外)。我三审曾把两者签为等价("✓"),该判断错误,已在日志自我修正。
- **落地方案(签字交付;build 细化)**:
  - **D1 双路承载**:
    - **Route A(主,PAL 内容,精确)**:烘焙期(migrate 资产步/pal-extract)读 palette 0 生成
      256 对 `RGB→RGB`(`pal[i] → pal[i & 0xF0]`),存为工程内容资产(如
      `projects/pal/content/transition/falsecolor.json`)——**格式零 palette 语义**(纯颜色映射对
      列表,任何工程都可手写自己的)。runtime bridge 预计算:哈希精确命中;miss → 256 键最近邻
      (容 ambience 微扰)。精确复刻原版异色帧,消灭"近似猜观感"的返工循环。
    - **Route B(fallback,非 PAL/无 profile 工程)**:`M=max(t); M≤8 → t 不变;否则
      f_c = round(48·(t_c/M)^3)`。常数对 palette 0 全 15 彩 ramp 的 4/8/12 档拟合(均差
      26.2/通道):族向正确、深色浓彩同类,但明显逊于 LUT —— 故**不用于 pal**,仅无 profile 兜底。
  - **D2 隔离**:ramp/nibble 知识**只存在于烘焙脚本**(读 data/extracted);资产格式、runtime、
    schema 均无 paletteId/nibble/index。**schema 触点 = profile 资产的引用形态(manifest 字段 vs
    约定路径自动发现)→ 三方必审,build 前定案**。
  - **D3 多 palette / 非 PAL**:现 reforge 锁盘 0(W7a-3)→ 单 profile 够;未来多盘 = 每盘烘
    一 profile、场景级选择(另卡)。非 PAL RGBA 工程无 profile → Route B;编辑器预览沿用
    "模拟时长"不受影响。
  - **D4 算法骨架沿用 v3 已验数学**:visits 公式(边界/单调/每 step 一相位/step6 全屏=180ms
    程序验算已过)不变;唯 bridge 定义改为 `falseColor(target)`(**纯 target 函数,零 source 读取**);
    visits=1 写 falseColor;v=2..12 从 falseColor gamma-lerp 11 级收敛 target(v=12 强制精确);
    step0=source/step72=target 端点不变;alpha 不变换;falseColor buffer 预计算一次(哈希 1M 次
    一次性数十 ms,远轻于 v3 的 OKLab)。
  - **D5 已知限(文档化)**:夜氛围乘法染色使捕获 RGB 偏离盘色 → 哈希 miss 走最近邻(乘法微扰
    下最近邻仍同族);开场 = 中性氛围,精确命中。
- **测试 T1-T7**:
  - T1 **纯度**:同一 target 配两个不同 source → falseColor buffer 字节相同(bridge 只依赖 target)。
  - T2 step6 全屏逐像素 == 预计算 falseColor(target)。
  - T3 **反 v3 回归锚**:98% 黑 source + 亮 target → bridge 均 max 通道 ≥32 且非黑像素占比 >90%
    (v3 实现必挂此测)。
  - T4 Route A:采样对精确命中(pal[i]→pal[i&0xF0] 抽 ramp1/5/13);miss→最近邻;无 profile→Route B。
  - T5 Route B:16 族代表输出族向正确(拟合常数断言);M≤8 passthrough;alpha 不变。
  - T6 端点/visits 边界(v3 R1 沿用)/4×4 同步/11 级收敛单调。
  - T7 6051 证据:step 0/1/6/7/36/72 截图;step6 帧与 falseColor buffer 逐像素比对;与 6002 并排
    交用户终裁。

### 第四版 Codex 定案（2026-07-13，选路 + profile 精确形态）

- **C1 选路**：接受 Opus 双路设计。PAL 工程必须使用 Route A 精确 profile；Route B 只在工程未声明
  profile 时启用，不允许 PAL 因加载失败静默退回近似。声明了 profile 但文件缺失/校验失败应在工程
  加载阶段明确报错。
- **C2 manifest 与文件路径**：采用显式内容引用，不用约定路径自动发现，也不把 profile id 写入
  `ditherScreen` 命令。`projects/pal/manifest.json` 增加：

  ```json
  "content": {
    "ditherFalseColorProfile": "content/transitions/dither-false-color.json"
  }
  ```

  文件为 `projects/pal/content/transitions/dither-false-color.json`，随工程提交/FSA 复制，不放引擎
  `public` 或共享 `/baked`，避免本地工程脱离仓库后丢失。v1 JSON 形态：

  ```json
  {
    "version": 1,
    "id": "pal-default-dither-false-color",
    "entries": [
      { "input": [0, 0, 0], "output": [0, 0, 0] },
      { "input": [24, 24, 24], "output": [0, 0, 0] }
    ]
  }
  ```

  `input/output` 都是 0..255 整数 RGB 三元组；格式不含 palette/ramp/index/nibble 术语。content 包新增
  `DitherFalseColorProfileV1` + validator：`version===1`、非空稳定 id、entries 非空、通道范围、input
  唯一。格式允许任意条目数；PAL 生成器单测另钉 256 条。palette 0 已实测 256 RGB 全唯一、零冲突，
  可无损编译为精确哈希表。
- **C3 生成归属**：不改 `pal-extract`。在 `packages/migrate/src/` 增加纯生成函数，输入 palette RGB
  数组，输出 `pal[i] -> pal[i & 0xF0]` 的通用 profile；由
  `packages/migrate/scripts/bake-assets.mts` 调用并稳定格式化写入上述工程内容路径。生成结果属于可审查
  的第二阶段迁移产物并提交；单测验证确定性、256 唯一 input 与 ramp1/5/13 字节真值。
- **C4 loader/runtime 接入**：`loadProjectFrom` 通过现有 `FileSource` 按可选
  `manifest.content.ditherFalseColorProfile` 读取并校验，挂为工程级单 profile；未声明才使用 Route B。
  profile 编译时建立 packed RGB 精确 Map，并预转 entries 的 OKLab。目标 RGB miss 时只做一次 OKLab
  最近邻扫描，结果按 packed target RGB memoize；相同像素色后续 O(1)，同距离按 entries 顺序稳定
  决胜。开场中性氛围应全部精确命中。
- **C5 target-only 类型约束**：把 v3 `buildDitherBridge(source,target,...)` 替换为不接收 source 的
  `buildFalseColorBridge(target,bridge,pixelCount,transform)`；bridge RGB 只由 target/profile 或 Route B
  产生，alpha 直接复制 target。`applyDitherGradient` 仍仅在 `visits=0` 显示 source，`visits=1`
  显示 bridge，后 11 级收敛；controller、backup、时序、收口与 command schema 全不动。
- **C6 范围边界**：本轮一个工程只允许一个默认 profile，覆盖当前 reforge 盘 0 内容。多 profile、
  场景级选择和未来多盘另开 schema 卡，不提前把 profile id 扩散到 ScriptCommand。
- **C7 测试修订**：沿用 T1/T2/T4-T7；T3 改为黑 source + target 循环
  `pal[0x1F]/pal[0x5F]/pal[0xDF]` 时，step6 必须逐字节等于
  `pal[0x10]/pal[0x50]/pal[0xD0]`，且两份不同 source 得到相同 bridge。原“所有输出 max>=32”会误杀
  ramp4/8/12/15 等合法低档，删除。Route B 拟合指标明确为 15 个彩色 ramp × level 4/8/12 的
  **RGB 欧氏距离均值 26.157**（每通道绝对误差均值 12.570，最大单通道误差 45），由 GLM 复算。
- **Codex 结论**：`agree`。该形态把 PAL 知识封死在 migrate 生成器，profile/runtime 只认识通用
  RGB 变换；显式 content 引用兼顾 HTTP/FSA 和缺失报错，也没有改变 0x73 迁移命令语义。

### 用户视觉裁决：覆盖第二次设计

- **用户观感**（2026-07-12）：当前效果近似透明度/crossfade；原版更像“场景 0 很快切到场景 1 的
  反色/假色形态，再从假色恢复成正常场景 1”。该观感否决第二版 RGB 线性/linear-light 插值。
- **不是 palette 1 -> palette 0**：开场 extracted 链为 `playMusic(0x43) -> battle config(0x45) ->
  teleport(0x46) -> fadeScreen(0x73)`，前面没有 `setPalette(0x8B)`；新局 `numPalette` 仍为 0。
  palette 1 是 DOS splash 等独立用途，不参与这次 s000 -> s001。
- **原版两段式真值**：palette 0 的 256 色按 16×16 ramp 排列，高 nibble 选色系/色坡，低 nibble 选
  该色坡内的明暗级。`packages/game/src/present/dither-fade.ts` 每个像素第一次被相位访问时直接写
  `(target & 0xF0) | (source & 0x0F)`：目标色系立即替换、旧帧明暗仍在，形成目标场景的强烈假色态；
  后续 outer 1..11 才让低 nibble 每趟向目标 ±1。speed=2 时前 6 相位约 180ms 完成全屏假色切换，
  剩余约 1980ms 从假色逐级恢复正常。用户描述与源码完全一致。
- **第二版为何仍错**：`applyDitherGradient` 从 source RGB 直接插值到 target RGB，gamma-correct 只改变
  中间亮度，仍然是一条 crossfade 色线；它没有“目标色系 + 旧明暗”的中间桥，因而动态结构不对。
- **第三版 clean RGBA 适配（Codex 提案）**：
  1. 保留 step 0 逐像素等于 source、step 72 逐像素等于 target、六相位与 4×4 逻辑像素同步。
  2. 为每个目标像素预计算 `bridge`：在 OKLCH/OKLab 中取 target 的 hue/chroma，取 source 的感知
     lightness；色度做 sRGB gamut map。目标近中性时退化为 source lightness 的中性色。它模拟
     `targetHigh | sourceLow`，但不把 palette/index/nibble 带回 schema 或运行时模型。
  3. 某像素访问次数 `visits = step > phaseRank ? floor((step - 1 - phaseRank) / 6) + 1 : 0`。
     `visits=0` 显示 source；`visits=1` 立即显示 bridge；`visits=2..12` 用 11 个离散级从 bridge
     gamma-correct 逼近 target；`visits=12` 强制精确 target。
  4. bridge 只在 target 捕获后预计算一次并持有一个额外 RGBA buffer；每个离散 step 继续复用 output，
     不在 72 帧里反复做 OKLab 转换。alpha 不做色彩空间变换，端点精确。
- **不采用的精确兼容路径**：把旧/新画面重新量化回 palette 0，再原样跑 nibble 算法，虽更接近 PAL，
  但会把 palette/index 兼容机制重新侵入通用 RGBA 壳层，也无法服务自有 RGBA 工程；除非用户另行
  推翻第二阶段架构铁律，否则不选。
- **第三版新增验收**：记录 step 0/1/6/7/36/72；step 6 必须全屏进入 bridge 假色态，不能仍是
  source/target crossfade；对同一逻辑像素验证第一次访问发生 hue/chroma 跳转，随后 11 趟亮度/色阶
  单调收敛；6051 与 6002 动态并排后由用户终裁。

### 第三版 Opus 设计审查（2026-07-12,数学核对）

- **结构映射正确**：原版假色态 = target 的**色系形状**(高 nibble 随 target 图像) × source 的**明暗分布**(低 nibble 随旧帧)。OKLCH bridge(target hue/chroma + source 感知 L)保留同一结构:目标场景的色相几何被旧帧亮度调制 —— 这正是用户描述的"场景 1 的假色形态";随后 11 级收敛 = 原版 outer 1..11 低 nibble ±1 的感知等价。
- **visits 公式程序验算全过**：`visits = step>p ? floor((step-1-p)/6)+1 : 0` —— s=0 全 0(source)/s=1 仅 rank0=1/**s=6 全屏 visits=1(bridge)**/s=7 rank0=2 开始收敛/s=67 rank0 达 12/s=72 全 12(强制 target);单调不减;每 step 恰一个相位 +1(=原版每 inner 处理一条 stride-6 组)。**step6=180ms**(2160/72×6)与原版 speed2 前 6 相位 180ms 精确吻合。
- **特例处理方向正确**：近中性 target(chroma≈0,hue 未定义)退化为 source L 的中性灰 —— 与原版"target 在灰 ramp → bridge=灰 ramp 的 source 档位"同构;近黑 source → bridge≈黑(原版 srcLo=0 → 目标 ramp 最暗档 ✓);gamut 越界持 L/h 压 C 是对的取舍(bridge 的本质是亮度结构,牺牲色度不牺牲明暗);alpha 线性覆盖率不做色彩变换,沿用二版。
- **性能可行**:bridge 仅 target 捕获后预计算一次(1280×800 OKLab 往返 ~1-2 亿次浮点,JS 预估 100-300ms 一次性),被冻帧遮蔽(该帧屏幕本就静止);72 步内零 OKLab 重算,每离散 step 只做 gammaLerp(bridge,target)。内存 +1 RGBA buffer(~4MB)。
- **两处有意近似(R4 要求文档化,防下轮忠实性翻案)**:
  1. bridge 亮度 = source **绝对**感知 L;原版 = 目标 ramp 在 source **明暗下标**处的亮度 —— 两 ramp 亮度范围不同时有偏差。绝对 L 是更干净的感知模型,且不引入 palette 知识(铁律)。
  2. v=12 强制精确 target;原版 11 趟 ±1 在 |srcLo−tgtLo|>11 时**有残留**(如 15→0 剩 4),靠 fade 完成后下一真实帧掩盖。强制精确是更优终态,验收 step72=target 依赖它。
- **build 要求 R1-R4**(非设计阻塞,build 必落):
  - R1: visits 边界单测(s=p+1 首访/s=p+6 仍 1/s=p+7 二访/s=67..72 全 12)+ step6 全屏 bridge 断言。
  - R2: 特例三件套单测:近中性 target 退化、近黑 source/target、gamut 极值(高饱和 target × 异亮度 source)。
  - R3: bridge 预计算一次性成本实测并记录(>150ms 亦可接受,冻帧遮蔽;禁止任何 per-step OKLab 重算)。
  - R4: 上述两处近似写进 dither-transition.ts 头注释。

### 用户视觉裁决：覆盖第一次设计

- **已否决算法**：当前 `applyDitherDissolve` 通过阈值把逻辑像素一次性从旧 RGBA 替换成新 RGBA，
  后续为了打散条带又加入 Bayer 空间顺序。它只保留了“分批处理像素”，没有保留一阶段“同一像素
  在多趟中持续变色”的核心动态，因此即使 backup、目标帧和时机正确，观感仍然生硬。
- **一阶段事实锚**：`packages/game/src/present/dither-fade.ts:29-42` 的每个 outer 会再次访问同一
  stride-6 像素组；首趟切到目标 palette 高 nibble，后续各趟把低 nibble 朝目标值移动 1。也就是
  6 个相位错峰启动、每个像素自身连续逼近，而不是给每个像素分配一个唯一显现阈值。
- **二阶段等价适配**：不恢复 palette/index/nibble 数据模型。对 320×200 逻辑像素按线性下标
  `k % 6` 和 `RG_INDEX = [0, 3, 1, 5, 2, 4]` 决定 phase rank；全局 `step` 为 0..72，令
  `outer = floor(step / 6)`、`inner = step % 6`，单像素级别为
  `level = clamp(outer + (phaseRank < inner ? 1 : 0), 0, 12)`。
- **颜色生成**：每帧都从不可变 old/target 计算，四通道使用
  `round((old * (12 - level) + target * level) / 12)`；禁止累积插值造成漂移。step 0 必须逐像素等于
  old，step 72 必须逐像素等于 target；中途同一个像素会经历离散中间色。一个 320×200 逻辑像素
  对应的 4×4 物理像素共享同一 level。输出 buffer 复用且只在离散 step 改变时重算，最多 72 次全帧写入。
- **明确删除**：旧的二值 hard replacement、`pixelOrder`/Bayer outer 空间阈值和“中间帧只能含
  旧/新原色”的验收标准。backup 两路来源、2160ms 时长、对话时序、生命周期收口和四项迁移修复不变。
- **验证新增**：纯函数测试逐 step 钉住 phase rank、12 级单调逼近、0/72 精确端点、4×4 同步；
  浏览器对同一逻辑像素跨时间取样，确认出现中间色，并与一阶段录屏的动态节奏做并排复验。

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
   backup。随后建立 active effect，下一次世界渲染后取 target 一次，按“6 相位错峰 × 每像素 12 级
   RGBA 离散插值”推进 72 步，完成后 resolve；old/target 均不可变，禁止二值替换与累积插值。
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

- 可保留：`dither-transition.ts` 的生命周期 controller、确定性前缀识别和 main.ts DEV
  `__rfScene/__rfDither`（验收后仅保留有用接口）。
- 必须重写：`applyDitherDissolve` 的二值替换/Bayer 阈值改为本卡二次设计的 12 级 RGBA 渐变；
  对应测试和注释一并替换，不能继续宣称当前 hard dissolve 是一阶段算法移植。
- 已完成但待二次审查：ScriptCommand、ScriptHost、runner dispatch、两路 backup、统一收口与四项迁移修复。
- 仍须补齐：普通换场景回归；当前 s001→s003 手工路径曾出现黑屏停留，尚未定位，不得宣称通过。
- 不属于本卡：`dialog-text.ts`、center slot、loadScene 1-based 修复、E2E checkpoint、全量场景差异；
  本卡不得顺手回退或提交这些改动。

### 已知风险

- 风险：只扫描“场景里任意 ditherScreen”会为未执行分支错误跳过普通 fade。
  - 缓解：按当前活动 stage 且仅扫描确定性的同步前缀；遇 branch/await 类命令立即判定“不跳过普通 fade”。
- 风险：一次性交接态错误路由或未消费会造成旧帧残留。
  - 缓解：交接态绑定 `targetSceneId`，仅匹配 scene 的首个 ditherScreen 可原子 take；onEnter 收尾/abort/
    再切场景统一清理，零超时；普通 loadScene 永不创建它。
- 风险：ImageData 物理尺寸大且每帧全扫描。
  - 缓解：只在显式过渡期间持有 old/target/output；缓存 lastStep，同一步的 rAF 不重算；最多 72 次
    全帧写入，结束立即释放；浏览器验证同时观察长帧和主线程卡顿。
- 风险：speaker 继承过宽造成跨人物串名。
  - 缓解：换 slot 清空、新姓名覆盖、walkBody 边界清空；用正反例测试钉住。
- 风险：全量迁移输出会覆盖工作区中其他 Agent 的大量改动。
  - 缓解：先在临时目录生成并做结构化 diff；本卡只应用白名单产物，禁止直接写盘全量迁移。
- 风险：当前工作区有大量其他未提交文件。
  - 缓解：实现和提交只按白名单文件收口，提交前逐文件审 diff，不运行全量迁移。

### 第一次主审立场（历史记录）

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
- 历史建议: 曾建议进入 build；**该建议已随 hard dissolve 被用户否决而撤销**。M1/M2/M3、opcode
  迁移和统一收尾的审查结论可沿用，但视觉算法必须按“二次设计签字”重新审查。

### 二次主审立场

- Reviewer: Opus（先审实现可行性/视觉等价）+ GLM（后审覆盖/测试矩阵）
- 当前结论: **agree**（二次视觉算法方向正确——12 级离散 RGBA 插值恢复了一阶段“每像素自身逐级变色”的核心动态,数学核对端点/相位/非累积/4×4 均正确;附 3 项复验重点 + 1 独立阻塞,均非设计层 counter）。
- 必审问题逐条结论:
  - **【动态特征·通过】** level 公式 `clamp(outer + (phaseRank<inner?1:0), 0, 12)` 经数学核对:step0→level0(纯 old)、step72→level12(纯 target)、`inner=step%6` 令 6 相位错峰在不同 step 达同 level、每像素 0→12 单调逐级——**抓住了一阶段“同一像素多趟连续逼近”的核心动态**(vs 被否的二值硬切)。⚠ 标注一处 palette→RGBA 的必然差异:一阶段是“首趟高 nibble 立即跳 target + 低 nibble 12 趟 ±1 渐变”(颜色先跳约半个 palette 距离再渐变),Codex 是纯线性插值(无首趟跳)。验收 112 已允许数值不同,但 6051 须与一阶段录屏**并排比动态节奏**(不是只看单帧),确认“逐级变色”观感一致。
  - **【端点/非累积/4×4·通过】** 每帧从不可变 old/target 重算 `round((old*(12-level)+target*level)/12)`(非累积)→ 无浮点漂移;step 0/72 精确端点;4×4 物理块共享逻辑 level → 无块内噪点/横带。设计正确,agree。
  - **【颜色空间·agree 起点 + 已定退路,正面回答 276】** sRGB 值上直接线性插值可作起点(简单、palette-free、满足逐级变色),**但这是本卡最可能的二次否决点**:sRGB 是 gamma≈2.2 编码,在编码值上线性插值 → 中间 level 的实际亮度低于感知中点,**两个色调过渡时中间会经过偏暗/浑浊带**;一阶段是 palette 查表(色阶美术定、非 sRGB 线性),不存在此问题。**必须 6051 中间帧(25/50/75%)重点复验亮度与色调自然度**;若明显偏暗/浑浊,**已定退路 = gamma-correct 插值**:`round((((old/255)**2.2*(12-level)+(target/255)**2.2*level)/12)**(1/2.2)*255)`,转线性光强空间插值再编码回——**纯 RGBA 运算,不恢复 palette/index/nibble**(满足 276“不恢复 palette 数据模型”约束)。build 时先跑 sRGB 直接插值,6051 复验后由用户视觉裁决是否切 gamma-correct;两条路的公式与测试都写进设计,不阻塞本次 agree。
  - **【性能/测试·通过 + 补一项】** “只在离散 step 改变时重算,最多 72 次全帧写入”→ 2160ms 内 ≤72 次 putImageData,性能可接受;测试矩阵(phase rank 顺序/12 级单像素单调逼近/0-72 端点/4×4 同步 + 浏览器同像素跨帧取样)完整。**补一项验收锚**:浏览器取样除“确认出现离散中间色”外,须记录 25/50/75% 中间帧的**亮度/色调数值**,作为 sRGB vs gamma-correct 裁决的量化依据。
  - **【普通换场景黑屏·独立阻塞,与视觉算法正交】** s001→s003 出口黑屏停留(Build 段/视觉记录已如实标“尚未定位,不得判回归通过”)——这是 loadScene 窄前瞻/普通 fade 路径的回归 bug,**与 dither 视觉算法无关**,不阻塞本次视觉算法 agree;但 done 前普通场景零回归(验收 93)未闭环即不得进 done。建议排查方向:窄前瞻误判(`hasEarlyDitherScreen` 是否把 s003 目标 stage 误判含早期 ditherScreen → 错误关对话/跳 fade/保持旧帧交接态)、或普通 `fade out→switchScene→fade in` 路径恢复不完整/交接态未清导致覆盖旧帧。

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

- Coding Owner: Codex（第三次 build 完成，已转 review）
- 当前实现提交: `bdd35ff6`（第三版假色 bridge；仅 X3 白名单 hunk）
- 第二版基线提交: `bede6b14`（两路 backup、生命周期、命令与迁移四修；结论中仅视觉公式被覆盖）
- 实现范围:
  - `packages/reforge/src/dither-transition.ts`：删除二值 hard replacement/Bayer 阈值，改为不可变
    source/target/output 三缓冲；按 `RG_INDEX={0,3,1,5,2,4}` 六相位错峰、每像素 12 级重新计算。
    同时提供 `srgb` 与 gamma 2.2 `linear-light` 两路；浏览器复验后默认采用后者，DEV 可用
    `?dither-srgb=1` 回退对照。RGB 做 gamma-correct，alpha 保持编码值线性插值。
  - `packages/reforge/src/main.ts`：接通跨场景窄前瞻 handoff、独立站点 snapshot、最终 canvas 壳层
    渲染、0% 像素锚、离散 step 缓存和正常/abort/读档/再换场统一收尾；普通 `loadScene` 仍走既有
    fade out/switch/fade in。
  - `packages/content/src/script.ts`、`packages/reforge/src/script-runner.ts`：新增通用
    `ditherScreen` command/host/dispatch，runner 阻塞等待并在 abort 后停止续跑。
  - `packages/migrate/src/translate-events.ts`：0x73 产 `ditherScreen`；0x49 operand0=0 不再产
    `e-1`；0x50/0x51 写入 delay×600ms；speaker 在同 slot 的批次间继承。
  - `projects/pal/content/scenes/s000.json`、`s001.json`：仅做开场相关最小产物同步。
  - `packages/editor/src/core/playback.ts`、`ui/ScriptTree.tsx`、`ui/CommandForm.tsx`：补齐公共命令的
    编辑器预览、树标签与时长编辑，消除全仓公共联合类型漏接。
- 自动验证:
  - dither + runner 定向测试：2 files / 34 tests 通过。
  - `@type-pal/content`：16 files / 159 tests 通过。
  - `@type-pal/migrate`：6 files / 92 tests 通过。
  - `@type-pal/reforge`：33 files / 306 tests 通过。
  - `@type-pal/editor`：13 files / 118 tests 通过。
  - 全仓 `pnpm check` 通过：shared 111、content 159、migrate 92、reforge 306、pal-extract 251、
    game 2294、editor 118。
  - 为排除大量未暂存改动造成的假绿，另用 `git write-tree` 从白名单暂存区生成隔离工作树并再次运行
    全仓 `pnpm check`：shared 67、content 150、migrate 92、reforge 306、pal-extract 251、game 2290、
    editor 118，全部通过。前两次隔离运行因临时树缺 Git 未跟踪的 `data/extracted` / 原版 raw 资源
    报 `ENOENT`；补只读链接后同一命令 exit 0，未把环境缺文件伪记为代码失败。
  - `git diff --check` 通过；dither 新文件 Biome 定向检查通过。未对既存混合脏文件做全文件格式化，
    避免产生与本任务无关的格式 churn。
- 不落盘迁移 dry-run：295 scenes；展开 AST 中 `ditherScreen` 110 处，`entity:"e-1"` 0，
  fade 缺 `ms` 0；临时脚本执行后已删除，未运行 `pnpm migrate:content`。
- 普通换场回归结论：先前所谓 s001→s003“黑屏”是测试落点误用 s003 默认坐标 `(86,9)`；该位置
  本来就是空白区域。使用真实出口落点 `(141,51)` 复验实际 ScriptRunner→host.loadScene 路径：
  `s001 -> s003` 完成、`fadeBlack=0`、`scriptRunning=false`、dither 全程 inactive，客栈大厅正常显示。
- 工作区仍有大量其他 Agent 的未提交迁移产物、对话与 E2E 改动；本任务不得回退或整批提交它们，
  git 收口必须按白名单逐文件/逐 hunk 处理。

### 第三次 build：假色 bridge

- `packages/reforge/src/dither-transition.ts`：新增一次性 `buildDitherBridge`。每个色对转换到 OKLab，
  以 source 的感知亮度和 target 的色相/色度构造 bridge；近中性 target 退化为中性灰，超出 sRGB
  gamut 时保持亮度/色相并二分压低 chroma。相同色对做有上限缓存，alpha 保持 source 覆盖率。
- 过渡从原来的 source -> target 插值改为 `visits=0 source / visits=1 bridge / visits=2..12`
  用 11 级 gamma-correct 收敛 target；第 12 次访问强制精确 target。源码头注释已记录 R4 两处
  有意近似：绝对 L 不等于 palette ramp 下标亮度，终次强制 target 不保留原版潜在 nibble 残差。
- `packages/reforge/src/main.ts`：目标帧捕获后只预计算一次额外 bridge ImageData；预计算结束后才设置
  `startedAt`，防止构建耗时吞掉首趟 180ms。DEV `__rfDither` 增加 `hasBridge/bridgeBuildMs`。
- 测试新增 R1/R2：step 0/6/72 三端点、各相位首访/第二访/第十二访、step 6 全屏 bridge、11 级
  单调非累积收敛、4×4 同步、alpha、中性退化、近黑 source/target、高饱和 gamut 和缓冲别名。
- 自动验证：定向 `dither-transition.test.ts` 15 tests；`@type-pal/reforge` 35 files / 316 tests；
  全仓 `pnpm check` 通过（shared 111、content 159、migrate 92、reforge 316、pal-extract 251、
  game 2294、editor 118）；`git diff --check` 与 dither 两文件 Biome 定向检查通过。`main.ts` 全文件
  Biome 仍报告该文件既存 import/lint 债，本次未用全文件自动修复制造无关 churn。
- R3 性能：1280×800 / 256 典型点阵色对预热后 17.35 / 17.51 / 17.56ms；百万随机色对压力
  1057.67ms。6051 真实开场两次分别 16.9 / 16.4ms，接近典型值；72 步内不重复 OKLab 转换。
- git 收口只提交 dither helper/test 与 `main.ts` 四个 X3 hunk；`main.ts` 底部另一位 Agent 的 E2E
  未提交改动继续留在工作区，未纳入 `bdd35ff6`。

## 资源生成记录（如适用）

N/A

## 视觉验证记录（如适用）

- Visual Verification Owner: Codex 自验；Opus 复验
- 验证方式: 6051 开场全链 + 普通出口回归 + 分阶段截图/像素检查 + 一阶段/二阶段动态并排对照

### 第三版假色桥接自验（2026-07-12）

- 6051 `?entry=new-game` 活体时间线：约 4056ms 在 s000 捕获 pending handoff；4198ms 进入 s001
  active（首次观测 `step=0`，`hasTarget/hasBridge=true`，`bridgeBuildMs=16.9`）；4355ms 命中
  `step=6`（约 180ms 首趟）；5281ms 命中 `step=36`；6355ms active 清零。扣除首次观测已晚约
  33ms，active 总时长与 2160ms 一致。
- 零帧锚继续为 `zeroFrameMatchesBackup=true`、`zeroFrameDiffersFromTarget=true`；handoff source、
  对白后置、终态 s001 与第二版已通过链路均未回归。真实 bridge 构建两轮为 16.9ms / 16.4ms。
- 动态观察：首趟先形成由 s001 色相/色度和 s000 最终帧亮度组成的深色假色桥，随后房间色阶逐级
  恢复；不再是 source/target 之间的直接 RGB crossfade。由于 s000 最终帧大面积接近黑，step 6
  bridge 也会大面积很暗，这是本设计“绝对 source L”近似的直接结果，已如实留给 Opus/用户终裁。
- 证据：`/tmp/type-pal-x3-v3-evidence/timeline.json`、`bridge-near-step6.png`（截图调用横跨
  state step 5 -> 11，不冒充精确 step 6 单帧）、`settle-near-step36.png`（调用横跨 step 34 -> 56）、
  `target.png`。精确 step 6/36 由 DEV dataset 时间线记录，纯函数对 step 0/1/6/7/36/72 有单测。

### 第二版历史验证记录

- 6051 开场全链已确认：handoff 指向 s001；active source 为 `handoff`；0% 帧
  `zeroFrameMatchesBackup=true` 且 `zeroFrameDiffersFromTarget=true`；约 2.16s 后完成，李大娘对白只在
  dither 完成后出现，终帧是正常 s001 世界帧。
- 已分别录制 sRGB 与 gamma-correct 的 25/50/75% 帧。对整屏非透明像素取编码亮度均值：旧帧
  1.568、目标帧 46.052；sRGB 为 15.786 / 20.112 / 29.991，gamma-correct 为
  19.508 / 26.395 / 35.072。高差异像素 `(383,275)` 从旧 `[0,0,0]` 到目标
  `[247,242,236]`；sRGB 三帧为 `[29,28,26]` / `[70,71,65]` / `[138,139,134]`，gamma
  三帧为 `[62,61,57]` / `[119,118,114]` / `[165,162,157]`。两路均出现真实中间色，gamma
  中段更明亮、较少暗浑，因此默认采用 `linear-light`。
- 截图证据：`/tmp/type-pal-x3-evidence/old.png`、`srgb25/50/75.png`、
  `gamma25/50/75.png`、`target.png`，并排图 `/tmp/type-pal-x3-evidence/compare.png`。
- 默认 gamma 路径与 `?dither-srgb=1` 回退路径均在 6051 实跑；默认终态 `scene=s001`、dither
  inactive、后续对白 active。普通 s001→s003 真实落点复验通过，无冻屏或残留旧帧。
- 未完成项：6002 可进入一阶段梦境场景，但本轮没有取得可重复触发的完整 s000→s001 动态录屏，
  因此“首趟 palette 高位跳”的并排动态节奏仍需 Opus 或用户复验。任务验收只要求一阶段确认顺序与
  姓名、RGBA 数值无需等同 palette；这一未验项不伪装成已通过。
- Opus 复验（2026-07-12,基线 bede6b14）:
  - `__rfDither` 活体两轮:`zeroFrameMatchesBackup=true` + `zeroFrameDiffersFromTarget=true`(M3 运行时逐像素断言复现)、`colorSpace:'linear-light'`、完成后 pending/active 双清零。
  - pending handoff 活体捕获:`{pending:true, targetSceneId:'s001'}` 于 scene 仍为 s000 时观测到(窄前瞻 arm 早于 switchScene 铁证)。
  - 对白时序:截图确认李大娘叫醒对白仅在 dither 完成后出现;`rfSceneLoad` 终态 `{from:s000,to:s001,step:done}`,全程 `fadeBlack=0`(handoff 路径未走黑场)。
  - **普通出口亲测**:开场跑完后自 (60,-24) 走至 e3(60,-12) 触发 s001→s003,`rfSceneLoad` 依次 `fade-out→switch→fade-in`(普通路径,非 handoff),s003 正常渲染无黑屏/冻结/残帧——此前"黑屏停留"回归确认已修。
  - 6002 动态并排:Opus 两次尝试同样受 dev server 热重载与截图延迟所限未取得中间帧,维持"未验"如实记录,交用户终裁。

## Review: 审查与返工

- Reviewer: Opus + GLM
- 审查结论: **rework**。用户澄清异色帧应完全由 s001 target 生成，与 s000/source 无关；第三版
  `bdd35ff6` 的 source-L bridge 产品模型错误，停止实现 review，先走第四版 target-only 设计三签。
- Opus 非阻塞观察(O1-O5,不构成返工):
  - **O1(留用户终裁)**: 6002 一阶段动态节奏并排复验未完成——dev server 热重载不稳定 + 截图链路延迟(~1-2s)大于 2.16s 窗口,Opus 两次尝试与 Codex 同样未取得可重复中间帧;"首趟 palette 高位跳"观感差异与默认 linear-light(与 Opus 二次审"sRGB 起步"建议相反,但双套 25/50/75% 证据+亮度数值齐全,`?dither-srgb=1` 可切)一并交用户视觉终裁(铁律 8)。
  - **O2(已声明的债)**: 产物仅 s001 含 ditherScreen(最小手工同步);其余 63 场景 0x73 站点仍是旧 alpha fade 形态,dry-run 已核对新迁移器出 110 处——须在未来全量重迁卡还清。
  - **O3(已知差异)**: dither 期间 autoRunners 未冻结(一阶段 fade-screen 冻 autoScript)——s001 开场无 auto 走位 NPC 无可见影响;通用站点若有巡逻 NPC,dither 结束瞬间可能小跳变;用户验收若见跳变再单开卡。
  - **O4(非本卡)**: `projects/pal/e2e-checkpoints/001-opening.save.json` 文件损坏(字符数组垃圾,旧会话产物);?e2e-load 对该文件回退默认新局。顺带报告,归 e2e checkpoint 任务修。
  - **O5(小瑕疵)**: 跨场景 handoff 若捕获时有对话框,switch 异步窗内活画面对话会先消失几帧、冻帧回来才含对话(s000→s001 该点无对话,不可见);通用站点理论可见,与 O3 同级观察。
- Accept / rework: **rework（用户 counter，Codex accept 已撤销）**

## 用户验收

- 历史结论: **reject 旧二值视觉算法**（2026-07-12）；时机和对应帧基本正确，但逐像素硬切观感不对。
- 第二次结论: **reject RGB crossfade 视觉算法**（2026-07-12）；它虽有 12 级和 gamma-correct，仍缺
  原版“目标色系 + 旧帧明暗”的首趟假色桥接，动态结构不对。
- 第三次结论: **reject source-L bridge**（2026-07-13）；仍像简单渐变。用户澄清正确结构是先得到
  s001 的异色帧，再恢复正常 s001，异色过程与 s000 无关。
- 当前状态: 第四版 target-only `falseColor(s001 target) -> normal target` 待三方设计签字；未三签前
  不得实现。李大娘停步脚本尚未重写，仍属本卡范围外的后续演出任务。

## 交接日志

- 2026-07-12 Codex: 读取用户转交说明并审计未提交实现；确认全局 loadScene 被错误劫持、0x73 被置空、schema/runner 未接通，reforge typecheck 失败。已按用户“当前改法作废、恢复正常跳转”要求重写设计并签 agree。Evidence: 本卡上下文锚点与基线命令。Next: 等待 opcode 审计补充后更新设计。
- 2026-07-12 Codex: 接收 GLM opcode 审计并本地复核：0x73 为通用独立站点（69 canonical + 4 shared 索引条目），旧 pending-loadScene 设计作废，改为命令内快照的 ditherScreen；同时纳入 0x49 no-op/e-1 与 0x50/51 delay×600ms。Evidence: `all.json`/`shared.json` 统计、`script.c:1711/1775`、`palette.c:PAL_FadeOut/In`。Next: Opus 复核修订版设计；不得实现。
- 2026-07-12 Opus: 设计签 **counter**（M1 阻塞 + M2/M3 非阻塞）。核对锚点:sdlpal script.c:2140-2147(0x73=VIDEO_BackupScreen→MakeScene→FadeScreen,原版不清对话)、:1780/:1790(0x50/0x51 delay 公式)、palette.c:163/232(×10×60=600ms) → 0x50/0x51 公式确认正确;main.ts:474/478(switchScene async)、:790/1881(onEnter 走 pendingOnEnter tick)、:810(setActorSprite async) → 坐实"命令内快照会取到新场景帧",跨场景须 loadScene 窄前瞻在 switchScene 前快照交接。整体通用 ditherScreen 架构、opcode 三修、统一收尾、speaker walkBody、产物白名单均 agree。Evidence: 本卡主审立场 + 三方争议 Opus 行。Next: GLM 复核迁移覆盖/测试矩阵;Codex 据 M1/M2/M3 更新 Draft 后三签齐再 build。未改任何实现文件。
- 2026-07-12 Codex: 已落实 Opus M1/M2/M3：跨场景由 loadScene 窄前瞻在 switch 前捕获并按 targetSceneId 一次性交接，等待期仅该路径保持旧帧；独立站点仍命令内快照；两路先关 dialog 状态再取最后已呈现 canvas；验收新增 0% 与 s000 冻帧逐像素相等。Evidence: Draft 设计点 2-6、验收 M3。Next: Opus 复核改签 agree；仍不得 build。
- 2026-07-12 Opus: **复核改签 agree,三签齐**。逐项核对 Draft 设计点 2-6:【M1 通过】backup 在 `switchScene` 前从当前 canvas 捕获 + `{targetSceneId,backup}` 一次性交接 + 收尾全路径(正常/abort/读档/再切场景/onEnter 未消费)零超时 → 根除 s001→s001;【M2 通过】核对 present.ts:262-267 `backupPixels` 在 `fb.clear()` 前拷、本就含上一帧对话像素,Codex"先 `dialogBox.close()` 再取最后已呈现 canvas"与一阶段顺序一致(纠正我原"清对话后 backup 不含对话"假设);【M3 通过】验收 103 补 0% 帧=s000 冻帧逐像素锚。0x50/0x51 公式、speaker walkBody、统一收尾、产物白名单沿用 agree。build 准入改 allow。Evidence: 主审立场复核结果 + present.ts:262-267。Next: Codex 进 build,钉死 ①0% 帧像素锚 ②普通场景 `__rfDither` inactive 回归 ③交接收口全路径测试 ④迁移 dry-run 白名单(禁 migrate:content 写盘)。未改任何实现文件。

- 2026-07-12 Codex: build 中完成 command/host/runner、两路 backup、生命周期收口、迁移四修和定向测试；
  6051 确认 backup/target/2160ms/对白时序正确，但视觉 helper 采用二值 hard dissolve，并为缓解条带
  加入 Bayer 阈值。用户复验明确否决：每个像素切换生硬，与一阶段逐像素渐变观感不符。Codex 回查
  `packages/game/src/present/dither-fade.ts:29-42`，确认一阶段同一像素会在 12 个 outer 中反复逼近目标，
  当前实现确实移植错了核心动态。Status 转 rework；旧三签失效，Codex 对“6 相位错峰 × 每像素 12 级
  离散 RGBA 插值”二次设计签 agree。Evidence: 本卡“用户视觉裁决”与“二次设计签字”。Next: Opus 审二次
  设计；不得改实现。
- 2026-07-12 Opus: 二次视觉算法签 **agree**。数学核对 level 公式(step0→level0/step72→level12/`inner=step%6` 令 6 相位错峰/每像素单调逐级)——12 级离散 RGBA 插值忠实恢复一阶段“单像素逐趟变色”动态,与被否的二值硬切本质不同。3 复验重点:①颜色空间——sRGB 直接插值中间色可能偏暗(gamma≈2.2 编码上线性插值),6051 中间帧复验亮度,已定纯 RGBA gamma-correct 退路(转线性光强空间插值再编码回,不恢复 palette);②“首趟高 nibble 立即跳 target”细节丢失(palette→RGBA 必然),6051 与一阶段录屏并排比节奏;③浏览器取样补 25/50/75% 亮度数值。1 独立阻塞:s001→s003 黑屏 done 前必解(与视觉算法正交,疑 `hasEarlyDitherScreen` 误判或普通 fade 恢复不全)。backup 两路/2160ms/对白时序/收口/迁移四修沿用一次 agree。Evidence: 二次主审立场逐条结论 + dither-fade.ts:29-42。Next: GLM 二次复核测试矩阵/迁移无影响;三签齐后 Codex build(含 sRGB+gamma 两路公式 + 黑屏定位)。未改实现文件。
- 2026-07-12 GLM: 二次设计签 **agree**；确认视觉 helper 仅改 reforge 运行时，对迁移四修零影响；
  12 级/phase/端点/4×4/非累积测试矩阵完整，gamma-correct 仍是纯 RGBA 运算。Evidence: 二次签字
  GLM 行。Next: 三签齐，Codex 进入 build。
- 2026-07-12 Codex: 二次 build 完成并自验 `accept`。删除 hard dissolve/Bayer，落地不可变三缓冲的
  6 相位 × 12 级 RGBA 渐变；sRGB 与 gamma 两路浏览器量化后默认 gamma-correct，保留
  `?dither-srgb=1` 对照。定向测试 34 项、content/migrate/reforge/editor 包检查和全仓
  `pnpm check` 全绿；dry-run 为 295 scenes / ditherScreen 110 / e-1 0 / fade missing ms 0。
  6051 的 0%/100% 锚、2160ms、对白时序通过；普通 s001→s003 所谓黑屏定位为错误测试落点，
  真实出口 `(141,51)` 回归通过。Evidence: Build/视觉验证段与 `/tmp/type-pal-x3-evidence/compare.png`。
  Commit: `bede6b14`。Next: Opus 做实现/视觉主审，不得标 done；Opus 后交 GLM 复核迁移覆盖和测试矩阵。
- 2026-07-12 Opus: 实现/视觉主审签 **accept**(基线 bede6b14)。逐文件审:helper 数学全对(端点 early-return 精确/相位序=RG_INDEX/12 级单调/4×4 同级/gamma LUT 量化仅暗部 ±1/alpha 无 gamma/别名 throw/非累积);main.ts 四收口齐(入口 cancel/switch 异常 cancel/脚本 finally clearPendingFor/abort cancel,begin 先 finish 防孤儿);迁移四修对齐 sdlpal(0x50 `(op0||1)*600`/0x51 int16>0/0x73 `(speed+1)*720`/0x49 flush-不-push/speaker walkBody+样式切换清);s000/s001 hunk 极小无夹带;editor 接线合理。定向测试本地重跑 34+32 绿。**6051 活体**:M3 零帧锚两轮复现(`zeroFrameMatchesBackup=true`+`DiffersFromTarget=true`);pending handoff 于 scene=s000 时活体捕获(arm 早于 switch 铁证);对白严格 dither 后;**普通出口亲测**(60,-24)→e3→`fade-out→switch→fade-in`→s003 正常渲染,黑屏回归证实已修。5 项非阻塞观察 O1-O5 落 Review 段(O1 6002 动态并排两次尝试未果、同 Codex,留用户终裁;O2 63 场景 0x73 旧形态债;O3 dither 期 autoRunners 未冻;O4 e2e save 损坏非本卡;O5 handoff 含对话时的几帧消失)。Evidence: Review/视觉验证 Opus 复验段。Next: GLM 复核迁移覆盖/测试矩阵/白名单;GLM accept 后交用户对动态观感终裁,方可 done。未改任何实现文件。
- 2026-07-12 User: 视觉终裁 **counter** 第二版。当前观感像透明度/crossfade；原版观感是场景 0
  很快进入场景 1 的反色/假色形态，再从假色恢复正常。Evidence: 用户现场观察。Next: 停止 GLM done
  复核，任务退回 rework，先审第三版视觉设计。
- 2026-07-12 Codex: 复核一阶段 nibble 算法与开场 opcode 链，确认用户观感准确：开场无 0x8B，
  palette 始终为 0；首趟执行 `(target & 0xF0) | (source & 0x0F)`，约 180ms 把全屏切成“目标色系
  + 旧明暗”假色态，后 11 趟才收敛。第二版 gamma RGB 插值无法产生该桥接。已提纯 RGBA 的
  OKLab/OKLCH bridge 方案并签 agree；原 Opus/Codex accept 被用户 counter 覆盖。Evidence: Draft 第三版
  与 `packages/game/src/present/dither-fade.ts:1-51`。Next: Opus 审第三版可行性；不得实现。
- 2026-07-12 Opus: 第三版假色桥接设计签 **agree**。数学核对(程序验算):visits 公式边界全过(s=0 全 source/s=1 rank0 首访/**s=6 全屏 bridge**/s=7 二访/s=72 全 12)、单调不减、每 step 恰一相位 +1、step6=180ms 与原版 speed2 精确吻合;bridge 模型(target hue-chroma × source 感知 L)正确保留原版 `(tgtHi|srcLo)` 的"目标色系形状 × 旧帧明暗分布"结构;特例(中性/近黑/gamut/alpha)方向全对;预计算一次+复用 output 性能可行(一次性 ~100-300ms 被冻帧遮蔽);拒绝 palette 重量化符合铁律 4/6。附 R1-R4 build 要求(visits 边界单测/特例三件套/预计算成本实测/两处有意近似写头注释——①bridge 用绝对 L 非 ramp 下标亮度 ②v=12 强制精确 target 而原版 ±1×11 可残留)。**自我修正记录**:我二审曾把"首趟高位跳缺失"标为非阻塞观察 O1 留用户终裁——用户否决证明视觉本质恰在此处,升级为阻塞是正确的;三审据此把结构映射当第一审查项。Evidence: 第三版主审立场(数学核对)段。Next: GLM 复核(迁移零影响/测试矩阵含 R1-R2);三签齐后 Codex build(R1-R4 纳入范围)。未改任何实现文件。
- 2026-07-12 GLM: 第三版设计签 **agree**。确认 bridge/visits 只改 reforge 视觉 helper，对迁移命令
  schema 与四项迁移修复零影响；R1 visits 边界、R2 中性/近黑/gamut、11 级收敛、4×4、端点、
  alpha、R3 性能与 R4 注释矩阵完整。Evidence: 第三次进入 build 前 GLM 签字。Next: 三签齐，Codex build。
- 2026-07-12 Codex: 第三次 build 完成并自验 **accept**。提交 `bdd35ff6` 落地 OKLab bridge、
  chroma gamut map、visits 首访跳转 + 后 11 级 gamma 收敛、额外单次 buffer 和预计算后起算；R1-R4
  全落。定向 15 tests、reforge 316 tests、全仓 `pnpm check` 全绿。6051 两轮真实 bridge 16.9/16.4ms，
  step6≈180ms、active≈2160ms、零帧双锚 true；截图/时间线见第三版视觉记录。`main.ts` E2E 脏 hunk
  未入提交。Evidence: Build/视觉验证段与 `/tmp/type-pal-x3-v3-evidence/`。Next: Opus 做第三版实现与
  动态视觉主审；不得标 done，Opus 后交 GLM 复核。
- 2026-07-13 User: 第三版视觉终裁 **counter**。效果仍是简单渐变；进一步澄清正确过程为“先切到
  s001 的异色帧，再由异色恢复正常 s001”，异色阶段与 s000 无关。Evidence: 用户现场观察与明确
  语义纠正。Next: 停止第三版 review，任务退回 rework。
- 2026-07-13 Codex: 承认第三版模型理解错误并量化根因：s000 终帧约 98.3% 暗，source-L bridge
  约 99.2% 暗；L=0 把 target chroma gamut-map 回纯黑，而 palette0 各色坡低档并非统一黑色，故
  `bdd35ff6` 必然退化为黑 -> s001 渐亮。已撤 Codex accept，钉死第四版 bridge 只能是
  `falseColor(s001 target)`、不得读取 source；精确 LUT/profile 与通用公式路线待架构审查。Evidence:
  Draft“用户第三次视觉裁决”与 palette0 index 16/80/144。Next: Opus 审第四版架构选路，不得实现。
- 2026-07-13 Opus: 第四版 target-only 设计签 **agree 并交付落地方案**。palette 0 全表实测:16 ramp 0 档 = 深色高饱和族色(max 16-93,仅灰阶族为黑),坐实原版对黑 source 的 bridge = "逐像素目标族 0 档" = s001 深色浓彩异色帧。**自我修正**:我三审签过"近黑 source→bridge≈黑 ✓"——该等价错误(黑≠族 0 档),是 v3 放行根因之一,本轮已数据化归档。方案:**Route A(主)**=烘焙期 `pal[i]→pal[i&0xF0]` 生成 256 对通用 RGB→RGB profile 资产(格式零 palette 语义,ramp 知识只进烘焙脚本),runtime 哈希+最近邻,精确复刻;**Route B(fallback)**=`f_c=round(48·(t_c/M)^3)`(全 ramp 拟合均差 26.2,仅无 profile 工程用);visits/时序/端点沿用 v3 已验数学,bridge 改纯 target 函数;**schema 触点(profile 引用形态)标三方必审**;T1-T7 测试含 T3 反 v3 回归锚(98% 黑 source 下 bridge 均 max≥32,v3 必挂)。Evidence: 第四版主审立场(数据+拟合脚本输出)。Next: Codex 定案签字(选路确认+profile 形态提案)→ GLM 复核(烘焙对迁移零影响/T1-T7/拟合方法)→ 三签齐 build。未改任何实现文件。
- 2026-07-13 Codex: 第四版定案签 **agree**。确认 PAL Route A / 无 profile Route B；profile 采用
  `manifest.content.ditherFalseColorProfile -> content/transitions/dither-false-color.json` 的工程级单表，
  v1 为 `{version,id,entries:[{input RGB,output RGB}]}`，显式校验、input 唯一。生成器归
  `@type-pal/migrate` bake，产物随工程提交/FSA 复制，不改 pal-extract/ScriptCommand。runtime 精确
  packed-RGB map，miss 用 memoized OKLab 最近邻；bridge API 删除 source 入参且 alpha 取 target。
  实测 palette0 256 RGB 全唯一。修订 T3 为 ramp1/5/13 精确字节锚；复算 Route B 指标为 RGB
  欧氏距离均值 26.157、每通道绝对误差均值 12.570。Evidence: “第四版 Codex 定案”C1-C7。
  Next: GLM 复核 profile 形态、migrate 主链零影响、T1-T7 与拟合方法；不得实现。

## 下一位 Agent 提示词

```text
接手任务:X3/M3 第四版 target-only 异色帧覆盖复核（GLM）
任务卡:docs/ops/tasks/X3-opening-dither-speaker-inheritance.md
当前状态:rework；第四版 Codex+Opus agree、GLM pending；build blocked
你的角色:GLM，覆盖/迁移/测试矩阵与 profile schema 复核；只审设计，不改实现文件
先读:任务卡“用户第三次视觉裁决”“第四版 Opus 设计审查(D1-D5/T1-T7)”“第四版 Codex 定案(C1-C7)”和第四次签字表；参考 packages/content/src/character.ts、packages/reforge/src/loader.ts、packages/migrate/scripts/bake-assets.mts
已定提案:PAL Route A；无 profile 才 Route B。manifest.content.ditherFalseColorProfile 显式指向项目内 content/transitions/dither-false-color.json；v1={version:1,id,entries:[{input:[r,g,b],output:[r,g,b]}]}；content validator 钉通道范围/input唯一，PAL generator 钉256条。生成归 migrate bake，不改 pal-extract。loader 经 FileSource 可选加载；声明但损坏必须报错。runtime 精确 RGB Map，miss 用 memoized OKLab 最近邻；buildFalseColorBridge API 无 source、alpha取target；command schema/controller/backup不变
请复核:1)该 content manifest 形态是否兼容 HTTP/FSA/编辑器工程复制且未把 paletteId/index/nibble 带回 schema/runtime；2)生成器只增加资产 bake，不影响 translate-events/migrate-content/ditherScreen 命令主链；3)T1-T7 是否完整，特别 T3 修订为黑 source + pal[1F/5F/DF] target 时精确得到 pal[10/50/D0]，两 source bridge相同；4)复算 Route B：15彩 ramp×level4/8/12，RGB欧氏距离均值应26.157、每通道绝对误差均值12.570、最大单通道45；5)一个工程单 profile/multi-profile另卡是否范围合理
不要做:不改实现文件；三签未齐不得 build；不重翻已通过的 backup/时序/收口/迁移四修；不把 fallback 用于已声明 profile 的 PAL 工程
输出要求:在“第四次进入 build 前”GLM 行签 agree/counter并写理由，更新 Draft/交接日志/看板并提交文档；若 agree即三签齐，但必须再次确认 profile 形态已三方过目后才把 build 准入改 allowed，并写可直接复制给 Codex 的 build 提示词（范围=falseColor profile+generator/loader+双路runtime+T1-T7+6051证据）
```
