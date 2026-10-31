# game-menu-driver(menu-driver.ts 1054 行)八维复审批

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「game-menu-driver(menu-driver.ts 1054 行)八维复审批」的治理候选页;证据原件即下方逐字节保全的固定main源(2132B,SHA 973f5ea76126)。

## 来源与输入

来源为固定Git载体,非本次运行;原3个链接处置见作者review的linkDisposition。当前存活入口:[codex-stage2-rework.json](../codex-stage2-rework.json) [body-invariance.json](body-invariance.json) [directed.json](directed.json)。

## 断言与业务 oracle

文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


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
