# game-menu-large(magic-script + inventory-menu + in-game-magic-menu)八维复审批

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
