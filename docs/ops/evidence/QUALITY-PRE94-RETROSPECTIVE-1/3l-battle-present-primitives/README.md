# CODE3l battle-present 三文件复审切片

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-31
Template: audit-report-v1 / 1.0.0

## 审计问题

CODE-QUALITY-3l七个battle-present实现中draw-battle-bg/draw-battle-effect/draw-battle-num三文件复审切片(基点24b0451f6,0 behind/193 ahead);结算、精灵、UI、present-battle全文件语义留待后续;3l整卡仍partial。

## 范围与证据

完整读取三实现与四份直接测试(背景、effect、effect/number像素宿主、floating numbers);按caller读present-battle.ts背景/keepEffect/波动/精灵/overlay/UI/数字装配区间;primary读reference/sdlpal/battle.c背景染色与绘制顺序、uibattle.c:1746-1767,1770-1808飘字寿命/位移/显示入口、fight.c effect anchor/伤害数字来源。SHA与范围见[read-boundaries.json](read-boundaries.json)。

## 发现

draw-battle-bg逐像素覆盖背景、保留palette index 0、按sBackgroundColorShift对低nibble做signed clamp,小于屏幕素材边界测试证不越界;draw-battle-effect底中anchor、opaque mask、frame/chunk缺失no-op,装配caller保持effect在sprite后UI前;draw-battle-num 11帧寿命、每帧上移一像素、5位右对齐与黄/蓝/青颜色基址均有直接像素/状态oracle。未发现本片新增直接缺陷;drawBattleNum最终复用drawNumber,其正Infinity风险已在3k账本留review,本片真实战斗数字caller只产生有限伤害/治疗/MP数值,无新增产品边界裁决;未改战斗core、玩法公式、坐标或UI形态。

## 结论

定向4 files/23 tests passed、game typecheck无诊断;按用户成本约束未运行coverage/official ratchet/protected fast/全仓check;整卡其余四实现、统一门与视觉/E2E保持pending。

## 整改与复核

未重跑;2026-10-18源区间勘误:旧上界越过实际EOF,现按[anchor-corrections.json](../53-wave-gates/receipt-audit/anchor-corrections.json)更正(uibattle.c 1740-1810改1740-1808),原read-boundaries字节在审计附件保留,不据此补签未运行门。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2436B / SHA-256 dba39d040e11448c264c3e8c1229cd8d7098a16790ab195cdb17bf87696e7035；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3l battle-present 三文件复审切片

基点：`24b0451f6`；分支：`codex/code-quality-3y`，相对 `origin/main` 为 `0 behind / 193 ahead`。本切片只处理 CODE-QUALITY-3l 七个 battle-present 实现中的 `draw-battle-bg`、`draw-battle-effect`、`draw-battle-num`，及其直接测试/装配 caller；结算、精灵、UI、`present-battle` 全文件语义留待后续。3l 整卡仍 `partial`。

## 逐文件与真值边界

完整读取三个实现和四份直接测试（背景、effect、effect/number 像素宿主、floating numbers）。按 caller 读取 `present-battle.ts` 的背景/keepEffect/波动/精灵/overlay/UI/数字装配区间。primary source 读取 `reference/sdlpal/battle.c` 的背景染色与绘制顺序、`uibattle.c:1746-1767,1770-1808` 的飘字寿命/位移/显示入口，以及 `fight.c` 的 effect anchor/伤害数字来源区间。SHA、行数和范围见 [`read-boundaries.json`](read-boundaries.json)。

## 判别力与结论

`draw-battle-bg.ts` 逐像素覆盖背景，保留 palette index 0，并按 `sBackgroundColorShift` 对低 nibble 做 signed clamp；小于屏幕素材的边界测试证明不越界。`draw-battle-effect.ts` 使用底中 anchor、opaque mask、frame/chunk 缺失 no-op，并由装配 caller 保持 effect 在 sprite 之后、UI 之前。`draw-battle-num.ts` 的 11 帧寿命、每帧上移一像素、5 位右对齐与黄/蓝/青颜色基址均有直接像素/状态 oracle；未发现本片新增直接缺陷。

`drawBattleNum` 最终复用 `drawNumber`，其正 Infinity 风险已在 3k 当前账本留 `review`；本片的真实战斗数字 caller 只产生伤害/治疗/MP 的有限数值，没有新增产品边界裁决。没有改战斗 core、玩法公式、坐标或 UI 形态。

## 验证

定向 `4 files / 23 tests passed`，`pnpm --filter @type-pal/game typecheck` 未见诊断；测试覆盖真实 framebuffer 像素、opaque mask、奇数宽 anchor、颜色基址、缺资源降级和寿命/位移。按用户成本约束，本小片未运行 coverage、official ratchet、protected fast 或全仓 `pnpm check`；整卡其余四个实现、统一门与视觉/E2E 保持 pending。


2026-10-18 源区间勘误：旧上界越过实际EOF，现按[直接源码核对](../53-wave-gates/receipt-audit/anchor-corrections.json)更正；原read-boundaries字节在审计附件保留，不据此补签未运行的产品/全仓/coverage门。
```
<!-- incremental-original-source:end -->
