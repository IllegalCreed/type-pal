# CODE3l battle-present 三文件复审切片

基点：`24b0451f6`；分支：`codex/code-quality-3y`，相对 `origin/main` 为 `0 behind / 193 ahead`。本切片只处理 CODE-QUALITY-3l 七个 battle-present 实现中的 `draw-battle-bg`、`draw-battle-effect`、`draw-battle-num`，及其直接测试/装配 caller；结算、精灵、UI、`present-battle` 全文件语义留待后续。3l 整卡仍 `partial`。

## 逐文件与真值边界

完整读取三个实现和四份直接测试（背景、effect、effect/number 像素宿主、floating numbers）。按 caller 读取 `present-battle.ts` 的背景/keepEffect/波动/精灵/overlay/UI/数字装配区间。primary source 读取 `reference/sdlpal/battle.c` 的背景染色与绘制顺序、`uibattle.c:1746-1810` 的飘字寿命/位移/显示入口，以及 `fight.c` 的 effect anchor/伤害数字来源区间。SHA、行数和范围见 [`read-boundaries.json`](read-boundaries.json)。

## 判别力与结论

`draw-battle-bg.ts` 逐像素覆盖背景，保留 palette index 0，并按 `sBackgroundColorShift` 对低 nibble 做 signed clamp；小于屏幕素材的边界测试证明不越界。`draw-battle-effect.ts` 使用底中 anchor、opaque mask、frame/chunk 缺失 no-op，并由装配 caller 保持 effect 在 sprite 之后、UI 之前。`draw-battle-num.ts` 的 11 帧寿命、每帧上移一像素、5 位右对齐与黄/蓝/青颜色基址均有直接像素/状态 oracle；未发现本片新增直接缺陷。

`drawBattleNum` 最终复用 `drawNumber`，其正 Infinity 风险已在 3k 当前账本留 `review`；本片的真实战斗数字 caller 只产生伤害/治疗/MP 的有限数值，没有新增产品边界裁决。没有改战斗 core、玩法公式、坐标或 UI 形态。

## 验证

定向 `4 files / 23 tests passed`，`pnpm --filter @type-pal/game typecheck` 未见诊断；测试覆盖真实 framebuffer 像素、opaque mask、奇数宽 anchor、颜色基址、缺资源降级和寿命/位移。按用户成本约束，本小片未运行 coverage、official ratchet、protected fast 或全仓 `pnpm check`；整卡其余四个实现、统一门与视觉/E2E 保持 pending。

