# game-menu-large(magic-script + inventory-menu + in-game-magic-menu)八维复审批

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 pre-94 foundation 模块 10 批 24(menu(core) 批 2)的作者复审回执:Coding Owner GLM,三文件全文读毕(magic-script 258 行/inventory-menu 280/in-game-magic-menu 306),基点 origin/codex/code-quality-3y@53db76bbbb(候选线 54+ 提交)。证据原件即下方逐字节保全的固定main源。

## 来源与输入

整改类型:死代码删除 1 项(两处联动),零其他改动——magic-script.ts L33 `const MAX_PLAYER_ROLES = 6` 全程零消费,文件尾 `void MAX_PLAYER_ROLES` + 『roleId max check helper(防越界)』注纯粹为消 unused-lint(同 battle-opcodes beforeHealth 模式,批 11 判例),删常量+删 void 语句及其注释,diff 恰两块删除。零整改面:inventory-menu.ts L39 装备槽 usable 追加(itemmenu.c:352-376 圣灵珠)、L40 sSelectedItemTargetSlot static 记忆、pickItemRowColor 6-case 表、H2 死人可选(复活类物品前提);in-game-magic-menu.ts DL22 施法人 static 记忆、L35 Cancel 不重弹施法人框、L37 caster fEnabled 仅判 HP、L41 单人队直进法术列表。机器证据:[body-invariance.json](body-invariance.json) allEqual=false 为**预期**(magic-script.ts 去注释打印 5948→5897 字节,SHA 变化即删码本体);[directed.json](directed.json) 8 文件 41 套件 110/110。返工/裁定入口:[codex-dead-removals.json](../codex-dead-removals.json)、[codex-stage2-rework.json](../codex-stage2-rework.json)。

## 断言与业务 oracle

混合批协议:定向超集 + typecheck + diff 逐行核对。body-invariance 的 allEqual=false 不是失败,而是删码的机器见证;行为保持由 8 文件定向 110/110(0 failed suites,magic 族 41 例=37+4)与 diff 恰两块删除(无其他行变动)共同承担。tsc --noEmit -p packages/game exit 0;scoped biome 0 诊断;git diff --check 干净。绿值为文档时点事实,不外推产品通过(currentExecution=false)。

## 结果

Codex 2026-10-20 当前有限裁定:常量+void 删除成立;修正文案中的完整 port、always-success、成本 Owner 与复活装备例外表述;castOverworldMagic 仍有两个未用公共参数,登记候选而非原文的『无新增』;当前 41 magic 测试不构成整文件测试质量重验。文件保持 review,未授整卡/整包 accept。

## 限制与复核

未重跑原命令/测试;diff 两块删除的逐行内容以 codex-dead-removals.json 记载为准;Codex 裁定中『在103内』的 103 所指未在本页核实。历史结论保持原时点;候选待 Owner 非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2360B / SHA-256 7daf95491b9cb9cb7cf404d853ad0e5fb44d81be7f6a28819ddf64b2aedd58e8；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# game-menu-large(magic-script + inventory-menu + in-game-magic-menu)八维复审批

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

- 批次:pre-94 foundation 模块 10 批 24(menu(core) 批 2)
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 54+ 提交)
- Coding Owner:GLM;三文件全文读毕(magic-script 258/inventory-menu 280/in-game-magic-menu 306)
- 整改类型:死代码删除 1 项(两处联动:常量 + void 消 lint 语句),零其他改动

## 整改清单

| # | 位置 | 问题 | 处置 |
|---|---|---|---|
| 1 | magic-script.ts L33+L257-258 | `const MAX_PLAYER_ROLES = 6` 全程零消费,文件尾 `void MAX_PLAYER_ROLES` + "// roleId max check helper(防越界)" 注纯粹为消 unused-lint(同 battle-opcodes beforeHealth 模式,批 11 判例) | 删常量 + 删 void 语句及其注释 — diff 恰两块删除,无其他行变动 |

## 零整改面(2 文件)

- **inventory-menu.ts**:L39 装备槽 usable 追加(itemmenu.c:352-376 圣灵珠)、L40 sSelectedItemTargetSlot static 记忆、pickItemRowColor 6-case 表、H2 死人可选(复活类物品前提)— 全锚准确。
- **in-game-magic-menu.ts**:DL22 施法人 static 记忆、L35 Cancel 不重弹施法人框、L37 caster fEnabled 仅判 HP、L41 单人队直进法术列表 — 全锚准确。

## 验证(混合批协议:定向超集 + typecheck + diff 逐行)

- body-invariance `allEqual: false` 为**预期**(含代码删除)→ [body-invariance.json](body-invariance.json);diff 逐行核对 = 恰两块删除(常量行/void 行+注释行),已在上方案录。
- 定向 8 文件(三目标全部测试族):**41 套件 110/110,0 failed suites** → [directed.json](directed.json)
- `tsc --noEmit -p packages/game`:exit 0;scoped biome 0 诊断;`git diff --check` 干净

## 登记项

无新增。

## Codex 2026-10-20 当前有限裁定

常量+void删除成立；修正文案中的完整port、always-success、成本Owner与复活装备例外。castOverworldMagic仍有两个未用公共参数，登记候选而非“无新增”；当前41magic测试在103内，非整文件测试质量重验。 [逐文件依据与原件](../codex-dead-removals.json)。文件保持review，未授整卡/整包accept。
```
<!-- incremental-original-source:end -->
