# CODE-QUALITY-94 — GLM 逐文件复核结论（2026-10-14/15）

Owner: GLM（按 CODE94/95 卡提示词接手）；Reviewer: Codex 独立验收。
对象：`source-manifest.json` 30 条候选，分支 `codex/code-quality-menu-integration`（基 `origin/main=cddf65557`）。
方法：9 个生产实现全文读取 + 真实 caller（menu-driver/scene-system/draw-menu）接线核对；22 个测试文件全文/差异读取；manifest SHA 逐条机械复核；CODE95 三份相对各自 closure 增量复核。质量维度按用户 2026-10-15 指令补齐：注释质量、可复用提取、测试用例质量、高内聚低耦合。

## Goal（用户 2026-10-15 设定，本专项总目标）

把全仓代码质量账本（3267 文件）逐文件审到闭合，标准是"好代码"四维——注释陈述代码看不出的约束且无过时误导；重复逻辑/fixture 按真实共享语义/输入/失败策略/生命周期评估提取（非按次数机械抽象，Codex R3 更正）；测试合法 typed 零强转、真实 caller/oracle、断言有判别力；纯数据状态机、显式所有权、无隐藏 IO/全局依赖。全程零诊断、覆盖率只升不降，每批经 Codex 独立验收后回写账本；从 CODE94/95 菜单窗口开始滚动推进到 review/pending 清零。

## 机械核验

- manifest candidate/main SHA 30/30 与实际字节一致（`glm-manifest-verify` 记录于本文件末）。
- closure 身份 27/30 候选=闭合版本字节一致；恰 3 份（inventory-menu.test / inventory-menu.boundaries.test / shop-menu.boundaries.test）按 manifest 标记偏离闭合版 = CODE95 fixture 修复，closureSha256 本身记录准确。
- 候选未改 `scripts/coverage/baseline.fast.json`、未改 sell-menu.ts（CODE93 域，main 已有版本原样）、无 CODE53/57/79/80/81/90 实现或毒键/状态页/战斗/Dev Panel/thumbnail/save/音频/生成物导入；新增 0 处 `as never`/`as unknown as`。

## CODE95 三份修复裁定（全文复核）

| 文件 | 修复内容 | 裁定 |
|---|---|---|
| inventory-menu.test.ts | 死人/空角色 fixture 换 `makeRole` 全 typed；`{roles:[]} as never` → 合法 typed；删本地 rowColor 复制（与 pickItemRowColor 重复）与死 import | 合法。旧“空角色”用例断言本就期望 use-target+selectedItemId=200（closure 原文核对），仅标题误导被更正并补 `targetMenu.items` 空断言；oracle 无弱化、有加强 |
| inventory-menu.boundaries.test.ts | `Object.fromEntries` 伪 roles → 6 元素真 roleId 数组（makeRole）；`as unknown as` 全删；inUse 经 `InventoryEntry & {inUse}` typed | 合法。party[2,0] 目标 roleId≠cursor 断言与 closure 一致，仅标题澄清 |
| shop-menu.boundaries.test.ts | 残缺 Item → 全字段 typed（satisfies 结构等价）；id 400/401 → 真域 105/110 | 合法。恰等门/差 1/意图收尾 oracle 不变 |

`makeRole`（`__tests__/coverage85-glm-game/harness.ts:41`）独立核验：纯函数、无顶层状态/IO、每参返回 fresh typed 对象；`PlayerRole.magic` 为可选字段（tables.ts:562），缺省合法。

## 逐文件结论（生产 9 + 测试 21）

生产文件均为纯数据状态机：无 IO、无 schema/save、无渲染依赖；模块级 static（inventory-menu `sSelectedItemTargetSlot`、in-game-magic-menu `sLastCasterCursor`）均有 sdlpal static 语义锚点且不入存档。注释普遍带 itemmenu.c/uigame.c/magicmenu.c 行号锚与历史 bug 备注，准确性抽核无误；main 版 in-game-menu.ts 的过时注释（系统菜单 4 项）已由候选更正为 5 项（与 SYSTEM_LABELS 实现一致）。

| 文件 | 结论 | 质量维度备注 |
|---|---|---|
| menu-mode.ts | 通过 | 内聚：只做 tick+空栈 resume；pop/push 留 stack 模块，职责边界注释清晰 |
| menu-stack.ts | 通过 | 低耦合：不依赖输入路由/场景/脚本执行器（头注释明示）；三向 resume 分支各有 sdlpal 锚 |
| inventory-menu.ts | 通过 | 注释质量高（6-case 色表+C5 历史 bug 备忘）；pickItemRowColor 已是抽出的复用纯函数 |
| shop-menu.ts | 通过 | 纯意图状态机（cash/入包留 dispatcher）；指向 sell-menu 的职责分链注释准确 |
| equip-menu.ts | 通过（P2 登记） | `confirmEquipItem` 的 `_playerRoles`/`_partyMembers` 为死参（实现不读），公共签名留有冗余 → 见改进项 E-1 |
| in-game-menu.ts | 通过 | 注释更正后与实现一致（5 项 SYSTEM_LABELS）；choice 按 WORD id 反查不按位置，配防御测试 |
| magic-select.ts | 通过 | 排序/习得序/wObjectID 语义注释准确；单一建表职责 |
| in-game-magic-menu.ts | 通过 | 四相状态机与 sdlpal while-loop 对齐说明完备；DL22/L35/L37/L41 语义锚齐全 |
| inventory-action-menu.ts | 通过 | 最小职责（2 项子菜单）；static 记忆语义经 gs 字段外置，注释准确 |
| 21 个测试文件 | 逐文件结论见下表（R3 返工后重写；原“typed fixture 零强转”合并结论与源码不符，已废弃） | |

### 21 份测试文件逐文件证据（R3 返工版，2026-10-15）

强转账=R3 返工后剩余；“空数组类型标注”指 `[] as Item[]` 类 TS 断言（非残缺对象掩盖）。

| # | 文件 | 真实 caller 入口 | oracle 要点 | 合法输入 | 隔离/排重/判别 | 强转账 |
|---|---|---|---|---|---|---|
| 1 | menu-mode.test.ts | tickMenu→dispatchMenuInput+openMenu 栈 | mode/栈深/DH9 清栈 vs 两层 pop | 合法 catalogs（空 roles=已裁定的防御边界）+真菜单 state | beforeEach catalogs；DH9 与 pop 一层两轴互斥判别 | 0（R3 清 1 处 as unknown as PlayerRoles；余 3 处空数组类型标注） |
| 2 | inventory-menu.test.ts | create/confirm/cancel 直调+相邻 menu-driver 真实路由 | 六色真值表/matchesFilter/全显示/L39 追加/八键 clamp/确认门/H2 死人可选 | typed mkItem+makeRole；R4 后 200=单体 usable（真实 caller 选人域） | 每合同独立 it；H2 死人字段断言 | 0 |
| 3 | inventory-menu.boundaries.test.ts | confirmInventoryItem/Target | count==inUse 拒、0-(-1) 正控、roleId≠cursor、不别名 | typed+InventoryEntry&inUse | 与主测试去重表；快照不变性 | 0 |
| 4 | inventory-menu.glm-phase1-leaves.test.ts | 同上叶轴 | iCurInvMenuItem 恢复/越界 clamp/inUse 默认 0/use-target 委派/done no-op/cancel 回写 | typed | 文件头去重表 | 0 |
| 5 | shop-menu.test.ts | 状态机+opcode 0x26 端到端（setShopMenuHandler 真链） | 现金扣/入包/关店续跑脚本 | typed mkItem+真店铺目录 | beforeEach 重置 handler+catalogs | 0（R3 清 2 处：as never、冗余 ItemFlags） |
| 6 | shop-menu.boundaries.test.ts | shopSelectItem/Confirm/Cancel | 恰等/差 1/空列表/No 意图/零副作用 | CODE95 全字段 Item | catalog-before 对照 | 0 |
| 7 | shop-menu.glm-phase1-leaves.test.ts | createBuyMenu 等 | label 回退 ?id/pageSize 8/错相 null/缺目录 no-op | typed | 文件头去重表 | 0 |
| 8 | equip-menu.test.ts | createEquipMenu/confirm* | .list=InventoryMenuState 结构/全显示/非装备确认 no-op/wrap | typed mkItem | 防退化注释锚 | 0 |
| 9 | equip-menu.boundaries.test.ts | confirmEquipItem/Role | inUse 耗尽拒/roleId 语义/done 零副作用 | typed+合法 ROLES | structuredClone 快照对照 | 0 |
| 10 | equip-menu.glm-phase1-leaves.test.ts | 同上叶轴 | filter=equip 固定/缺目录/单人环绕 | typed | 文件头去重表 | 0 |
| 11 | in-game-menu.test.ts | create/choice/Up/Down | WORD id 3..6 真值/词表 fallback/choice id 反查 | 合法 state+词表 | beforeEach+afterEach setWordTable([]) | 0 |
| 12 | in-game-menu.boundaries.test.ts | systemMenu 三阶段 fn | EnterConfirm 重置/Toggle 翻转/EnterSwitch 按当前态/choice 按 id | 合法 state | reverse 公开 state 注明不冒充生产重排 | 0 |
| 13 | in-game-menu.glm-phase1-leaves.test.ts | 同上叶轴 | 环绕/越上界归 0/flat[11..15] | 合法 state | afterEach 词表隔离 | 0 |
| 14 | magic-select.boundaries.test.ts | createMagicSelectMenu | MP 恰等不禁/排序不污染入参/295 非连续/缺 spell 剔/坏角色空表 | 全字段 magic/spell/role 工厂 | 入参快照对照 | 0 |
| 15 | magic-select.glm-phase1-leaves.test.ts | 同上叶轴 | 悬空 magicNumber 剔/缺名回退 magic#id/cost0 可选/空表 | typed 工厂 | 文件头去重表 | 0 |
| 16 | __tests__/item-magic-select.test.ts | createItemSelectMenu+createMagicSelectMenu 组合 | filter 分类/rightText 三模式/排序恒定/MP 灰 | R3 后 makeItem 显式 Partial flags 参数域构造完整 | 组合双菜单真实输入 | 0（R3 清 6 处） |
| 17 | in-game-magic-menu.test.ts | create/confirmCaster/Spell/Target/cancel/refresh | 四相转换/死人 caster disabled/载荷对象/取消三层/网格 clamp/MP 刷新/battle-only 过滤 | 全字段 mkRole/magic/spell | PLAYER_ROLES 常量+JSON 深拷贝变体 | 0 |
| 18 | in-game-magic-menu.boundaries.test.ts | 同上边界轴 | 单人直进/applyToAll 留相/单体切相/非顺序 roleId/错相零请求/refresh 落回 | 全字段 role 工厂 | 与主测试去重 | 0 |
| 19 | in-game-magic-menu.glm-phase1-leaves.test.ts | 同上叶轴 | DL22 跨开记忆+越界归 0/缺角色剔/空表八向兜底/pick-target 左右/关后 refresh 不复活 | typed | 显式 rememberMagicCasterCursor 复位防串测 | 0 |
| 20 | inventory-action-menu.test.ts | create/choice/Up/Down | 2 项真值顺序/WORD id 22/23/defaultCursor 记忆 | 合法 state | 直查 choice | 0 |
| 21 | inventory-action-menu.glm-phase1-leaves.test.ts | 同上叶轴 | 越上界保持 0/环绕/词表 flat[22]/[23]/空防御 | 合法 state | afterEach 词表隔离 | 0 |

测试用例质量专项：定向 24 files/241 tests 独立复跑通过（VITEST_MAX_WORKERS=1）；相邻 menu-driver×2/item-select 同绿；game typecheck 0 错。defaultCursor 中段分支仍被 createInGameMenu(2)/(3)、createSystemMenu(4)/(2) 覆盖，删除构造参用例不降覆盖（由 coverage 门独立证实）。

## 改进项登记（不在本窗口执行，避免破坏 manifest 字节前提；供下一批）

- E-1（P2 公共签名）`equip-menu.confirmEquipItem` 死参 `_playerRoles/_partyMembers` 移除需同步 menu-driver caller 与 3 个测试文件签名，属公共接口变化，须另卡走前提门。
- E-2（P2 复用候选，非机械规则）5 个测试文件各自内联全字段 PlayerRole/Magic/Spell 工厂（magic-select.boundaries / magic-select.glm-leaves / in-game-magic-menu.boundaries / in-game-magic-menu.glm-leaves / inventory-menu.glm-leaves）；是否统一到 harness `makeRole` 须按各文件输入语义/失败策略实际比对后定，不以行数或出现次数为依据（Codex R3 更正：“重复≥3必须提取”非用户规则，已从 Goal 段删除）。
- E-3 **已于 R3 返工修复**（makeItem 显式 Partial flags 参数域+删 6 处强转含 :127 冗余 Spell 断言），不再是登记项。

## 独立门禁回执

| 门 | 命令 | 结果 |
|---|---|---|
| 定向 | 24 files vitest run（含 3 相邻） | 241/241 PASS（本机复跑） |
| game typecheck | `pnpm --filter @type-pal/game run typecheck` | 0 错 |
| docs | `pnpm check:docs` | PASS（testing/lore/content-review） |
| lint-zero | `pnpm lint` | PASS 4012 files 0/0/0 |
| ledger | `node scripts/quality/code-quality-ledger.mjs` | PASS 3267；229 closed/35 review/3003 pending |
| protected fast（首跑） | `TYPE_PAL_COVERAGE_BASE_REF=origin/main VITEST_MAX_WORKERS=1 pnpm coverage:fast` | 七包 731 files/19822 tests 全绿、覆盖率 0 回退；按设计 fail-closed 于范围审计：game 测试内容变化 4 文件（恰=测试名/数量变化的 4 个白名单文件）+2 测试（3495→3497）+执行 digest |
| 官方 ratchet | 同上 env `pnpm coverage:ratchet` | exit 0 **但带存量诊断**（R1 更正）：act 警告 3,527+导航 2；基线更新本身合法（提升 0 项/范围变化 2 项，diff 精确最小） |
| protected fast（终跑） | 同首跑命令 | exit 0 **但带存量诊断**（R1 更正）：act 警告 3,499+导航 2；coverage 门本身通过（731 files/19822 tests 无回退） |
| 全仓 check | `pnpm check` | exit 0 **但带存量诊断，非干净通过**（R1 更正）：React act 警告 3,489 + jsdom 导航诊断 2；归属量化见返工段 |

回执原文同目录；本文件只登记结论，不追溯改写历史回执。

## R1–R4 返工记录（2026-10-15，响应 Codex counter 8c951cd7a）

### R1 存量诊断归属量化（不修、不静音，交 Codex 集中清理卡）

glm-check.txt 3,489 条 React act 警告归属：**全部 editor 包**——src/ui 815 条段、src/ui/design-system 7、src/__tests__/architecture-lab 6、scripts 1，涉及 139 个 .tsx 文件（Top：WorldSpriteLibrary.c01 153、BattleSpriteLibrary.kimi-workflows 64、BattleSpriteLibrary.c02-g01 55、c02-g04 43、c02-g02 43）。**game 包（CODE94/95 域）零贡献**；Codex 独立 targeted/typecheck 复跑亦确认 game 域无 stderr 诊断。jsdom "Not implemented: navigation" 2 条（check:5250/43827 同类）。本报告原"PASS exit 0"三处门状态已按上表更正为"带存量诊断非干净通过"；act 警告属 editor 存量，按 AGENTS 由 Codex 核 Owner/白名单另卡，GLM 不为 CODE94 越界改 editor。

### R2 注释更正（inventory-menu.ts，2 处）

- :22 "跑 item.scriptOnUse(M5 stub log)" → 现行 menu-driver `startOverworldItemScript` 完整脚本链（applyToAll/单体两分支）。
- :126-127 "id 0 是真值物品(观音符)" → 一手核实提取器 `resources/parsers/items.ts`：id=wObjectID（61..294，梦蛇 295 排除），0 是空哨兵；旧注为 local-id 时代历史误会，已改写并注明更正日期与依据。

### R3 fixture 参数合同修复（item-magic-select.test.ts + menu-mode/shop-menu 残留）

- makeItem 参数域改 `Omit<Partial<Item>,'flags'> & { flags?: Partial<Item['flags']> }`，构造方补全默认位；删调用处 4 处 `as Item['flags']` + 构造内 1 处 + makeSpell 冗余 `as Spell['flags']`（全字段已齐）共 6 处。
- menu-mode.test.ts 删 `as unknown as PlayerRoles`（空 roles 数组本就合法，CODE95 判例）；shop-menu.test.ts 删 `as never` 同理 + 删 flags() 冗余 `as ItemFlags`。21 份白名单测试现强转账=0（余 `[] as Item[]` 空数组类型标注 3 处，非掩盖）。
- 逐文件证据表（21 行）已重写如上；"重复≥3必须提取"自创规则已从 Goal 段删除。

### R4 死人目标用例输入修正（inventory-menu.test.ts）

- ITEMS[2] 200 由 `{usable, applyToAll: true, consuming}` 改 `{usable, consuming}`（单体检伤类合成 fixture，注释声明名字/flags 不代表 items.json 原始属性）；真实 caller menu-driver:711-717 对 applyToAll 直接跑脚本 return，:720 才进选人（play.c:268-323 同）——正向单体/死人/取消用例现处于真实 caller 可达输入域，oracle（死人可选/返回 roleId/取消状态）未动。202 风灵珠保留 applyToAll=true（建表/过滤合同与此无关）。相邻 menu-driver cov85 的 applyToAll/single-target 真实分派回归保留未动。

### 返工验证

定向（含返工 5 文件+相邻 driver 双测试）109/109、menu-mode+shop 17/17、game typecheck 0 错；完整门禁（定向 241/typecheck/docs/lint/ledger/ratchet/protected fast）重跑回执见同目录 glm-r2-*.txt。受影响 manifest SHA 已更新并附 reworkCounter 标注。
