# Codex 三验：CODE94、95、97–102

日期：2026-10-15。独立候选 `5477af1e45a80fffe8afc56502659bc7785823bf`；
`origin/main=f98d0ddd89ebdee7b04502ee35de26ee82c6d246`，验收开始为 0 behind / 17 ahead。
工作树 `quality-menu-accept-94-95/type-pal`，分支 `codex/quality-menu-accept-94-95`。
主工作树与 GLM 工作树未写入；未合 main。本报告先冻结作者交付的独立结论，后续 Codex 接手修正另记。

## 分批裁定

| 批次 | 本次裁定 | 已接收与未闭合范围 |
|---|---|---|
| 94 | counter / rework | 接收真实 inventory 工厂、typed 输入与三条已证排重；全仓门仍非零诊断，法术隐藏反证仍在，manifest 有一条当前 SHA 失真。30 文件保持 review。 |
| 95 | 三份夹具局部 accept / review | 三份全文重读，完整 Item/PlayerRoles 数组、单体输入、死人/party[2,0]/恰等门 oracle 成立；不升级整卡 done。 |
| 97 | counter / rework | 位序与负例修正成立；内联仍捏造 kItemFlagImportant；测试头仍用不存在的 SDLPal PgUp/PgDn 锚。test-only 翻页只是现状记录，正确合同仍未知。 |
| 98 | 排重局部 accept / rework | choice 重复删除成立；新注把 player role index 0..5 叫作 wObjectID，仍需纠正。标题取消是 driver 的独立风险，不冒称本工厂已修复该链。 |
| 99 | counter / rework | typed 目录、不同库存 ID、确定性 cursor 安排成立；新增无必要双重强转；C4 的正向物品用例实际未启动脚本。 |
| 100 | 排重局部 accept / rework | 删除 simulateSave 合理，真 driver 聚合 oracle 保留；修正内存/IDB 与幽灵工厂声明成立；源码头仍误写 bus emit、取消返回 SystemMenu。 |
| 101 | counter / rework | 双路径注释修正成立；真实 IDB 事务 abort 后仍报保存成功再次复现，留 GAME-SAVE-IDB-COMMIT-1。 |
| 102 | counter / rework | 完整 GameState、toast 错误反馈与定时器清理成立；新增匿名 keydown 监听器泄漏，8 条绿测不能证明隔离。 |

本次新关闭 **0**。候选账本仍为 **3283 inventory / 229 closed / 44 review / 3010 pending**。
这些批次中的测试若未列入 review 记录，仍按机器账本保持 pending；不借本报告自动晋升。

## 新增可复现问题

### R3-1：快存测试遗留监听器（P2，102）

`packages/game/src/tools/quick-save.test.ts:90-93` 新增匿名观察监听器，但 afterEach 只解绑
setupQuickSave 返回的产品监听器。观察闭包在后续用例继续响应按键。

在原测试文件上附加只读监听器收支探针，8 条测试全部通过，afterAll 对剩余监听器断言失败：
`expected 1 to be 0`。原始命令、exit 1 与完整输出在 `codex-r3-listener-counter.raw.json`；
setup/config 精确快照为同目录 `codex-r3-listener-setup.ts.raw` / `codex-r3-listener-config.mts.raw`。
临时配置位于本工作树 node_modules 缓存，不进入官方测试发现，不修改产品/原测试。
探针在断言前先恢复监听器和 spies。修正可直接保留 KeyboardEvent 引用并读 defaultPrevented，无需观察监听器。

### R3-2：C4 用后续选正例未执行物品脚本（P2，99）

`menu-driver.test.ts:585-606` 设置 `party=[0]` 却继承 `MOCK_CATALOGS.playerRoles.roles=[]`。
真实 `menu-driver.ts:719-743` 经 confirmInventoryTarget 得到 null，第二次 Confirm 空操作。
仅断言 phase='use-target'，不会区分“脚本执行后恢复”和“从未执行”。

`codex-r3-item-counter.mts` 调用真实公开入口，复现原 fixture，并以完整 makeRole(0) 做正控：

| 输入 | 第二次 Confirm 后 mode | eventCursor | phase |
|---|---|---|---|
| 原空 roles | menu | 无，脚本未启动 | use-target |
| 完整角色正控 | event | 有，脚本已启动 | use-target |

脚本尚未 tick，因此两者库存均为 2，不能拿消耗作为这一步的 oracle。修正应提供合法角色并断言
脚本确实启动；相邻 tickByMode 用例已证明同帧执行/2→1，不能再复制一套同义用例。
原件 `codex-r3-item-counter.raw.json` exit 0 代表反证成立，不是产品质量门通过。

### R3-3：强转与错误注释仍在（P2/P3，97–100）

- `menu-driver.cov85.test.ts:1006-1008` 新增 `as unknown as`。直接抛错函数返回 never，能赋给现有 handler 类型，强转无必要。只核当前同步抛错传播现状，不据此擅改错误策略。
- `item-select.ts:49-50` 内联仍称 SDLPal kItemFlagImportant；一手 `global.h:134-142` 枚举没有该项。important 当前只是 `!sellable && !equipable` 工程分类，没有 consuming 条件。
- `primitives.glm-phase1-leaves.test.ts` 头注仍用 ui.c:540+ 解释 PgUp/PgDn；`primitives.ts` 已正确收回此锚，两处不能矛盾。翻页无生产 caller，当前落 disabled 的观察不能证明原版机制正确。
- `equip-menu.glm-phase1-leaves.test.ts` 去重表仍列已删除的 filter/phase 轴为“新差异”。
- `player-status.test.ts:18-20` 把 role index 叫 wObjectID；`rgParty[].wPlayerRole` 索引 PlayerRoles，与物品/法术对象 ID 分域。
- `save-slot-menu.ts:4-5/39-40` bus emit、返回 SystemMenu、push 后启动 fetch 与真实 driver 不符。实际由 driver 直接调用 Save/handler；标题上下文取消 pop，游戏内取消清整栈；fetch 在 openMenu 前启动。

### R3-4：manifest 当前摘要过时（P2，94）

30 条逐个重算，`in-game-magic-menu.test.ts` 的 candidateSha256 仍为 `a33e922…`，实际是 `e8345b4…`。
其余 29 条 candidateSha256 及全部 mainSha256 匹配。旧 currentSourceSha256 某些项明确为历史快照，
不把“与现树不同”单独认定新缺陷；sourceChanged 的比较 revision 仍含混，应明确 main-vs-candidate 或 closure-vs-candidate。
完整实际 SHA 与有条件比较见 `codex-r3-mechanical-proof.json`；不改写作者历史 receipt。

## 逐文件读取与已接收范围

R2 的 57 个全文读取 SHA 仍保留。R3 全文重读其中 **17 个发生变化的文件**；另全文复核 CODE95 三份、
opening/player-status 实现与主测试、两个 approved-test-retirements 工具文件。未变文件复用 R2 直接证据并校验 SHA，
不宣称本轮重新全文阅读所有未变文件。完整实际路径和字节见 mechanical-proof 的 changedSinceR2 / unchangedR2FullReadBytes。

| R3 变更文件（menu 路径省略共同前缀） | Caller/oracle 与裁定 |
|---|---|
| menu-mode.test.ts | 真实 createInventoryMenu；替代残缺 state 成立。 |
| equip-menu.glm-phase1-leaves.test.ts | 对照主测试 filter/phase/cursor，删除重复成立；头表待同步。 |
| in-game-menu.glm-phase1-leaves.test.ts | 真 choice 映射/词表，越界测试标题修正成立。 |
| in-game-magic-menu.test.ts | structuredClone 等价；battle-only 隐藏 oracle 仍与 SDLPal 338–372 冲突，保持 review。 |
| primitives.ts | page helper 无生产消费，不能把 test-only 现状当 SDL 合同；不删公共出口。 |
| item-select.ts | matchesFilter 被 inventory/equip 等生产消费；头部位序成立，内联 Important 仍误导。 |
| primitives.glm-phase1-leaves.test.ts | 真 disabled fixture 比前版有判别力；错误锚与未知翻页合同仍待核。 |
| item-select.glm-phase1-leaves.test.ts | potion 的 throwable 反例、important 的 equip-only/sell-only 负例可独立判别，接收。 |
| opening-menu.glm-phase1-leaves.test.ts | 保留词表同步/空表防御，重复 choice 删除接收。 |
| player-status.test.ts | 任意 ID 只证数组遍历，不证生产域；wObjectID 注释待改。 |
| menu-driver.test.ts | typed fixture/确定性 cursor 接收；C4 空角色假正例 counter。 |
| menu-driver.cov85.test.ts | 11 个不同库存 ID 与真实 inventory ownership 相符；错误传播测当前实现，新增强转待删。 |
| save-slot-menu.ts | listSlots 只读，Save 动作归 driver；源码 ownership 注释未收净。 |
| save-slot-menu.test.ts | 去掉自写聚合，真实 menu-save-chain 7→8 留存；此环境只证内存路径。 |
| save-slot-menu.glm-phase1-leaves.test.ts | slots10/20 为工厂防御输入，限定成立，不冒充 Save 1..5 输入。 |
| core/save/api.ts | 双路径头注纠正成立；实际驱动事务风险未修。 |
| tools/quick-save.test.ts | 完整状态/DOM/计时器/反馈增量接收；事件监听器隔离 counter。 |

CODE95 逐文件：inventory-menu.test.ts 的合成单体 flags 与真实 driver 路径一致；
inventory-menu.boundaries.test.ts 的 6 角色数组与 party[2,0] 返回 roleId 0、count===inUse 拒绝成立；
shop-menu.boundaries.test.ts 的完整 Item、150/149 恰等门与纯意图无副作用成立。三份仅局部 accept。
复用 makeRole 纯工厂合理；不为减少几行把不同领域的 Item/Spell/Magic 合成一套过度抽象。

## Primary 与未修高风险

- SDLPal `magicmenu.c:338-372` 把所有已学法术入列，场景限制只置 disabled；R2 menu 反证本轮再次成立。
- SDLPal `uigame.c:143-150` 标题取消重置 wDefaultItem=0；当前真实 driver 仍保留 cursor=1。源码工厂初值不等于取消链行为。
- Save→IndexedDbSave 请求 success 后合法 abort，API 仍 resolve、槽为空；本轮复跑原真实函数探针，正控正常写回，反控仍成立。
  这是 fake-indexeddb 6.2.5 的规范时序注入，不声称自然浏览器磁盘满实测。

上述三项分别由 GAME-OUTSIDE-MAGIC-DISABLED-1 / GAME-OPENING-CANCEL-CURSOR-1 /
GAME-SAVE-IDB-COMMIT-1 跟踪，保持 draft / 无 build allowed，不在测试返工中偷改机制、Save 或公共接口。

## 验证证据

Codex 本轮独立：定向 36 files / 326 tests、game typecheck、coverage-tools 62、quality-tools 37、
pal-extract 71 files / 427 tests 通过。game 全包 317 files / 3561 tests 通过，结果见 `codex-r3-game.raw.json`；
各命令 cwd/候选/exit/原始字节 SHA 均随同名 raw.json 留存。

三条退役逐项从最新 main 的旧 baseline、当前 Vitest list、当前文件 SHA 计算：4→3、3→2、15→14，
旧/新 identity digest 和字节均匹配；额外删除与字节漂移均拒绝。见 retirement-proof.json。
根据用户持续测试质量规则和 R2 已证排重指令接收精确退役，不是一般 scope removal 豁免。

全仓 check / 官方 ratchet / protected fast 本轮在确认 counter 后未重复跑。独立审查 GLM 原始输出：

| 原件 | exit | React act 诊断 | jsdom 导航诊断 | 统一质量门 |
|---|---|---|---|---|
| glm-c5-check | 0 | 3574 | 2 | 不通过 |
| glm-c5-ratchet | 0 | 3458 | 2 | 不通过 |
| glm-c5-protected | 0 | 3572 | 2 | 不通过 |
| glm-c5-merge-ratchet | 0 | 3479 | 2 | 不通过 |
| glm-c5-merge-protected | 0 | 3470 | 2 | 不通过 |

最新合并回执的数值 ratchet/protected 成立，但含真实诊断。作者 coverage-note 的 ratchet 3518 与原件3458不同，
按原件计数；不能称“所有门通过”。docs/lint-zero/ledger 在本报告落盘后另留当前 receipt，不能挪用作者结果。

## 接手与下一步

用户在本次三验中明确：GLM 本批质量不足时由 Codex 接手。Codex 先提交本独立审核检查点，再分提交修复
已证测试/注释问题；不把作者自验升级为独立 accept，不开始未授权高风险行为修改。
有限切片先定向，再在同一完整模块窗口集中验证并更新真实状态；所有未闭合项保持 review/pending。
无下一位 Agent 提示词；当前由 Codex 继续，GLM 不再是这些修复文件的 Coding Owner。
