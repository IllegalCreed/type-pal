# CODE46 draw-confirm 当前复审切片

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「CODE46 draw-confirm 当前复审切片」(基点 8e12c129,分支 codex/code-quality-3y)的治理候选页;证据原件即下方逐字节保全的固定main源。本页真实结论:重新复审确认/开关框渲染,不把历史 done、旧测试数量或旧全仓门当当前整卡验收;46 提升为 partial,未标 accept/done。

## 来源与输入

来源为固定Git载体,非本次运行。完整读取 draw-confirm.ts(48行)、draw-confirm.glm-phase1-leaves.test.ts(67行)、opening-confirm-pixels.grok-r1.test.ts(177行);核对 present.ts/draw-menu.ts/draw-shop.ts 真实 caller 与 draw-box/font/framebuffer 所有权;primary 为 SDLPal uigame.c:242-388;逐行读域见同目录 read-boundaries.json。核对轴:双框坐标/标签、selectedColor 时间依赖、shadow、空标签、多字标签测试边界、framebuffer 写入隔离、开场/商店/脚本确认调用。

## 断言与业务 oracle

本页正文按原文时点转述:当前实现与 primary/caller 一致——默认和合法开关标签使用 (130,100)/(205,100) 框与 (145,110)/(220,110) 文字,选中项走 0xF9..0xFE palette cycle,阴影由 font renderer 负责,空标签只跳过文字保留框体。关键裁决:SDLPal 通用 PAL_SelectionMenu 会按任意多字标签动态偏移第二项,本 TS 公共 helper 的真实生产 callers 只传单字"否/是""关/开",现有多字测试明确验证固定窄 helper 行为;没有直接证据授权扩大公共 UI 合同,因此不擅改。

## 结果

本页治理结果=原文保全完整,不产生新执行结果。原文验证事实:定向 2 files/10 tests passed;相邻 draw-menu/present 3 files/69 tests passed;pnpm --filter @type-pal/game typecheck passed。未修改产品实现、UI 形态、输入状态、脚本、存档或公共接口。

## 限制与复核

原文明言:coverage ratchet、protected fast、全仓 pnpm check 和官方 coverage 按用户成本边界未运行。未重跑命令;候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1745B / SHA-256 bd18c2d2e191bba95d6f53703ecab91880ab6d705c9ddc19e5a11256d548b1d5；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE46 draw-confirm 当前复审切片

基点：`8e12c1293`；分支：`codex/code-quality-3y`。本片重新复审历史 46 的确认/开关框渲染，不把历史 done、旧测试数量或旧全仓门当作当前整卡验收。46 当前复审提升为 `partial`，未标 accept/done。

完整读取 `packages/game/src/present/menu/draw-confirm.ts`（48 行）、`draw-confirm.glm-phase1-leaves.test.ts`（67 行）和 `opening-confirm-pixels.grok-r1.test.ts`（177 行）。核对 `present.ts`、`draw-menu.ts`、`draw-shop.ts` 的真实 caller，以及 `draw-box.ts`、font/framebuffer ownership；primary source 为 SDLPal `reference/sdlpal/uigame.c:242-388`。核对轴包括双框坐标/标签、selectedColor 时间依赖、shadow、空标签、多字标签测试边界、framebuffer 写入隔离和开场/商店/脚本确认调用。

当前实现与 primary/caller 一致：默认和合法开关标签使用 `(130,100)/(205,100)` 框与 `(145,110)/(220,110)` 文字，选中项走 `0xF9..0xFE` palette cycle，阴影由 font renderer 负责，空标签只跳过文字而保留框体。SDLPal 的通用 `PAL_SelectionMenu` 会按任意多字标签动态偏移第二项；本 TS 公共 helper 的真实生产 callers 只传单字“否/是”“关/开”，现有多字测试明确验证固定窄 helper 的行为；没有直接证据授权扩大公共 UI 合同，因此不擅改。

验证：定向 2 files / 10 tests passed；相邻 `draw-menu`/`present` 3 files / 69 tests passed；`pnpm --filter @type-pal/game typecheck` passed。coverage ratchet、protected fast、全仓 `pnpm check` 和官方 coverage 按用户成本边界未运行。没有修改产品实现、UI 形态、输入状态、脚本、存档或公共接口。
```
<!-- incremental-original-source:end -->
