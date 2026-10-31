# game-menu-driver(menu-driver.ts 1054 行)八维复审批

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 pre-94 foundation 模块 10 批 25(menu(core) 收口批)的作者复审回执:Coding Owner GLM,menu-driver.ts 1054 行全文读毕,基点 origin/codex/code-quality-3y@53db76bbbb(候选线 56+ 提交)。证据原件即下方逐字节保全的固定main源。

## 来源与输入

整改类型:纯注释 1 处、零代码改动。唯一整改项是 dispatchOpeningMenu load-game 分支注释——『选完 slot 后由 M6 真做 load(现 stub 在 dispatchSaveSlotMenu 内 console.debug)』过时,dispatchSaveSlotMenu 现经 bootstrap 注入的 _loadGameHandler 真做整套 load、无 console.debug stub,改为述现机制。行为不变由 [body-invariance.json](body-invariance.json) 见证(menu-driver.ts 去注释打印 AST 双侧 27333 字节、printedSha256 一致、allEqual=true)。零整改面:11 个 dispatcher 的 sdlpal 真值锚(DL20 use-target 方向/DL21 左=上/DM23 wLastUnequippedItem 入口写/DM24 默认槽/DH9 goto out 关整栈族谱)、catalog singleton+menuRoles runtime 投影(user 2026-05-31 学法术不可见根因)、C2-quit/DH9 switch 取消关整栈控制流、dispatchInventoryMenu 每帧 snapshot refresh(『道具不减少』根因)与 applyToAll return 语义(桂花酒 trigger)均准确。返工范围见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 断言与业务 oracle

原文验证口径:[directed.json](directed.json) 定向 31 套件 83/83、0 failed suites;tsc --noEmit -p packages/game exit 0;scoped biome 0 诊断;git diff --check 干净。语义整改轮核出并如实并记的口径出入:原文称『定向 5 文件(menu-driver×2/menu-mode/menu-save-chain/menu-stack)』,而该回执 testResults 实际恰 4 个测试文件(37+37+7+2=83)且全文零处『menu-stack』字样——menu-stack 的覆盖仅由 cov85『菜单栈恢复与生命周期』8 例从旁承担,『5 文件』超出回执实际覆盖。绿值与 exit 0 为文档时点事实,不外推产品通过(currentExecution=false)。

## 结果

登记项(交 Codex):makeEquipMenuEntry 导出零消费方(注释自称『W0.e/f task 内引用』已无实指)——死导出清理候选,批 25 新增。模块宣称:menu(core) 18 文件全部收口(批 23 十五小中件+批 24 三大件+批 25 driver);该收口属作者候选,原文时点 Codex 裁定保留作者阶段证据、未获整包/全维收口验收。

## 限制与复核

未重跑原命令/测试;makeEquipMenuEntry 是否仍零消费未复核;定向文件数 5-vs-4 出入原因(笔误/漏跑/另有回执)未定,交 Owner 裁定。历史结论保持原时点;候选待 Owner 非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2132B / SHA-256 973f5ea7612671c4ac4dda99ff6aff870749a2a3ddd1afa37f8c26753f0a6f40；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# game-menu-driver(menu-driver.ts 1054 行)八维复审批

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

- 批次:pre-94 foundation 模块 10 批 25(menu(core) 收口批)
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 56+ 提交)
- Coding Owner:GLM;全文读毕(1054 行)
- 整改类型:纯注释 1 处,零代码改动 — body-invariance `allEqual: true`

## 整改清单

| # | 位置 | 问题 | 修正 |
|---|---|---|---|
| 1 | dispatchOpeningMenu load-game 分支注释 | "选完 slot 后由 M6 真做 load(现 stub 在 dispatchSaveSlotMenu 内 console.debug)"过时 — dispatchSaveSlotMenu 现经 bootstrap 注入的 \_loadGameHandler 真做整套 load,无 console.debug stub | 改述现机制(handler 注入真做) |

## 零整改面

- 全部 11 个 dispatcher 的 sdlpal 真值锚(DL20 use-target 方向/DL21 左=上/DM23 wLastUnequippedItem 入口写/DM24 默认槽/DH9 goto out 关整栈族谱)与 catalog singleton + menuRoles runtime 投影(user 2026-05-31 学法术不可见根因)均准确;C2-quit/DH9 switch 取消关整栈两处控制流考证完整;dispatchInventoryMenu 每帧 snapshot refresh(“道具不减少”根因)与 applyToAll return 语义(桂花酒 trigger)论证完整。

## 验证

- body-invariance:menu-driver.ts printedSha256 一致 → [body-invariance.json](body-invariance.json)
- 定向 5 文件(menu-driver×2/menu-mode/menu-save-chain/menu-stack):**31 套件 83/83,0 failed suites** → [directed.json](directed.json)
- `tsc --noEmit -p packages/game`:exit 0;scoped biome 0 诊断;`git diff --check` 干净

## 登记项(交 Codex)

1. `makeEquipMenuEntry` 导出零消费方(注释自称"W0.e/f task 内引用"已无实指)— 死导出清理候选(批25新增)

## 模块收口

**menu(core) 18 文件全部收口**(批 23 十五小中件 + 批 24 三大件 + 批 25 driver)。下一模块:game 余量目录(core 残余小目录如 inspect/save/tools/dev)→ content/migrate/reforge/editor → 94-102 返工。
```
<!-- incremental-original-source:end -->
