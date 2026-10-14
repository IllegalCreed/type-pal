# CODE-QUALITY-94 — GLM 逐文件复核结论（2026-10-14/15）

Owner: GLM（按 CODE94/95 卡提示词接手）；Reviewer: Codex 独立验收。
对象：`source-manifest.json` 30 条候选，分支 `codex/code-quality-menu-integration`（基 `origin/main=cddf65557`）。
方法：9 个生产实现全文读取 + 真实 caller（menu-driver/scene-system/draw-menu）接线核对；22 个测试文件全文/差异读取；manifest SHA 逐条机械复核；CODE95 三份相对各自 closure 增量复核。质量维度按用户 2026-10-15 指令补齐：注释质量、可复用提取、测试用例质量、高内聚低耦合。

## Goal（用户 2026-10-15 设定，本专项总目标）

把全仓代码质量账本（3267 文件）逐文件审到闭合，标准是"好代码"四维——注释陈述代码看不出的约束且无过时误导；重复逻辑/fixture（≥3 处）提取共享纯函数；测试合法 typed 零强转、真实 caller/oracle、断言有判别力；纯数据状态机、显式所有权、无隐藏 IO/全局依赖。全程零诊断、覆盖率只升不降，每批经 Codex 独立验收后回写账本；从 CODE94/95 菜单窗口开始滚动推进到 review/pending 清零。

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
| 21 个测试文件 | 通过 | 合同正交（每文件头部列去重表）；typed fixture 零强转；防御分支用“公开 state 直造”且注明不冒充生产行为；词表隔离 beforeEach/afterEach 提升 |

测试用例质量专项：定向 24 files/241 tests 独立复跑通过（VITEST_MAX_WORKERS=1）；相邻 menu-driver×2/item-select 同绿；game typecheck 0 错。defaultCursor 中段分支仍被 createInGameMenu(2)/(3)、createSystemMenu(4)/(2) 覆盖，删除构造参用例不降覆盖（由 coverage 门独立证实）。

## 改进项登记（不在本窗口执行，避免破坏 manifest 字节前提；供下一批）

- E-1（P2 公共签名）`equip-menu.confirmEquipItem` 死参 `_playerRoles/_partyMembers` 移除需同步 menu-driver caller 与 3 个测试文件签名，属公共接口变化，须另卡走前提门。
- E-2（P2 复用提取）5 个测试文件各自内联 ~30 行全字段 PlayerRole/Magic/Spell 工厂（magic-select.boundaries / magic-select.glm-leaves / in-game-magic-menu.boundaries / in-game-magic-menu.glm-leaves / inventory-menu.glm-leaves），可统一到 harness `makeRole`/共享工厂，减 ~150 行重复；统一时保持各文件合同与断言不变。
- E-3（P3）`__tests__/item-magic-select.test.ts` 的 `as Item['flags']` 展开强转可换显式字段覆盖，随 E-2 一并处理。

## 独立门禁回执

| 门 | 命令 | 结果 |
|---|---|---|
| 定向 | 24 files vitest run（含 3 相邻） | 241/241 PASS（本机复跑） |
| game typecheck | `pnpm --filter @type-pal/game run typecheck` | 0 错 |
| docs | `pnpm check:docs` | PASS（testing/lore/content-review） |
| lint-zero | `pnpm lint` | PASS 4012 files 0/0/0 |
| ledger | `node scripts/quality/code-quality-ledger.mjs` | PASS 3267；229 closed/35 review/3003 pending |
| protected fast（首跑） | `TYPE_PAL_COVERAGE_BASE_REF=origin/main VITEST_MAX_WORKERS=1 pnpm coverage:fast` | 七包 731 files/19822 tests 全绿、覆盖率 0 回退；按设计 fail-closed 于范围审计：game 测试内容变化 4 文件（恰=测试名/数量变化的 4 个白名单文件）+2 测试（3495→3497）+执行 digest |
| 官方 ratchet | 同上 env `pnpm coverage:ratchet` | PASS exit 0；基线只升不降更新（提升 0 项，范围变化 2 项）；baseline diff 精确=+2 计数、4 文件 identityDigest、game scope/execution digest，无其它改动 |
| protected fast（终跑） | 同首跑命令 | PASS exit 0「覆盖率门禁通过；相对 fast 基线未下降，提升 0 项」；731 files/19822 tests |
| 全仓 check | `pnpm check` | PASS exit 0（docs+四类工具测试+七包 typecheck/test+最终 lint-zero 4012 files 0/0/0） |

回执原文同目录；本文件只登记结论，不追溯改写历史回执。
