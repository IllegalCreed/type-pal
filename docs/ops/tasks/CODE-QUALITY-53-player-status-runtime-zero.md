# CODE-QUALITY-53 — game player status runtime-zero ownership conflict

Status: build
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 present/menu
Visual Verification Timing: mixed（状态数值为用户可见行为；视觉布局留集中 E2E）

## 目标

核定状态页 `runtimeOrBase` 在运行时值为 0 时的 ownership，再决定是否修复 `drawPlayerStatus` 及其测试。SDLPal 直接显示 runtime `rgwHP/rgwMP/rgwLevel`，0 具有真实语义（阵亡/零值）；TS 当前用 `||` 回退静态 `PlayerRoles`，可能把真实 0 显示成基线值。生产 bootstrap 会 hydrate runtime，但测试/早期状态可保持全零，两个输入域被同一 fallback 混合。

## 范围

- `packages/game/src/present/menu/draw-player-status.ts`
- `packages/game/src/present/menu/draw-player-status.test.ts`
- `packages/game/src/present/menu/draw-player-status.glm-phase1-leaves.test.ts`
- `packages/game/src/present/menu/status-vitals-pixels.grok-r1.test.ts`
- `packages/game/src/core/player-poison-state.ts`
- `packages/game/src/core/battle/battle-opcodes.ts`
- `packages/game/src/core/battle/battle-system.ts`
- `packages/game/src/core/inspect/battle-inspect.ts`
- `packages/game/src/present/battle/draw-battle-ui.ts`
- `packages/game/src/dev/dev-panel.ts`
- `packages/game/src/core/event-system.ts`
- `packages/game/src/core/game-state.ts`
- `packages/game/src/core/event-opcodes.cov85.test.ts`
- `packages/game/src/core/battle/__tests__/battle-opcodes.test.ts`
- `packages/game/src/core/battle/__tests__/battle-system.test.ts`
- `docs/ops/evidence/CODE-QUALITY-53/README.md`
- `docs/ops/evidence/CODE-QUALITY-53/reconstructed-negative-control.json`

只读上下文：`packages/game/src/present/__tests__/grok-present/p07-status.test.ts`、`draw-menu.ts`、`present.ts`、`core/menu/player-status.ts`、`core/game-state.ts:1385-1425,1800-1843`、`shell/bootstrap.ts:1628-1655`。

## 前提真值门

- 一句话行为 / 工程前提：状态页生产 caller 在 bootstrap 新游戏/读档后消费已 hydrate/normalize 的 `PlayerRolesRuntime`；primary source 显示 runtime 0 必须保留，未 hydrate 的全零 runtime 不应被静默伪装成生产状态。
- 四向真值矩阵：
  - 原版/primary source：`reference/sdlpal/uigame.c:1120-1229` 直接读 `gpGlobals->g.PlayerRoles.rgwLevel/rgwHP/rgwMaxHP/rgwMP/rgwMaxMP`；0 不回退；`global.c:1736-1897` 的 stat getter 也从 runtime 表直接计算。
  - 第一阶段当前实现：`draw-player-status.ts:120-137` 使用 `runtime.value || base.value`；`core/game-state.ts:1385-1425` 明确 hydrate runtime；`bootstrap.ts:1642-1655` normalize 读档 runtime 后进入菜单。
  - 当前测试 oracle：`draw-player-status.glm-phase1-leaves.test.ts:33-57` 把全零 runtime 回退 base 当作合同；相邻 P07/pixel tests 主要覆盖已写 runtime 值。该 oracle 与 primary 的真实零语义存在潜在冲突。
  - 本任务目标：确认生产输入域是否总能证明 hydrated runtime；若能，改为保留 runtime 0 并调整 fixture/oracle；若需要未 hydrate 防御，则必须定义显式 readiness/ownership，而不是用 `||` 猜测。
- 当前 `before` -> 目标 `after`：runtime HP/MP/level 为 0 时当前显示静态基线值；用户已裁决保留真实 runtime 0，未 hydrate 输入必须显式处理，不得用 `||` 猜测。代表场景：角色实际 HP=0 打开状态页，必须显示 0。
- 最强替代解释 / 什么观察会推翻前提：如果存在真实生产 caller 在 hydrate 前合法打开状态页，且产品明确要求显示静态基线，则需保留 fallback；但独立复核已确认 `battle-system.ts:1703-1711` 先把战斗结果写回 runtime、`game-state.ts:1777-1782` 可写入 HP=0，随后菜单可读取该 runtime；因此真实阵亡角色被当前页显示为静态正数，`||` 是直接 bug。剩余未知只在于如何显式表示未 hydrate fixture。
- 额外高风险冲突：SDLPal 在按角色施毒/解毒时找第一个对应 party slot；战斗回合和状态页则读取实际遍历槽/cursor（`global.c:1483-1505,1543-1599`; `fight.c:1622-1628,4454-4461`），但 `script.c:2153-2188` 的 `0x75 SetPlayerParty` 会 `memset(rgPoisonStatus, 0)` 清空换队伍后的全部毒，因此毒不会因换员转移给另一个人。用户已裁决按队伍位置寻址。换队清毒是已核源码行为，不是要求用户另作的产品选择。role→slot mapper 仅用于以角色为入口的操作；已有 slot 的消费者不能再回查 role，以免合法重复角色队伍重复执行首槽毒。
- 是否主动偏离已核真值：no（用户明确批准真实 runtime 0、按 party slot 读取毒，换队伍清空毒表）。

## 上下文锚点

- `draw-menu.ts:155-176` 只有 `extra.playerRoles` 存在才调用；`present.ts` 负责注入 runtime projection 与资源；`bootstrap.ts` 新游戏 hydrate、读档 normalize 后才进入可玩菜单。
- `game-state.ts:1385-1425` 明确 runtime 全零只是创建模板，hydrate 会复制静态值；`createInitialGameState` 仅供 bootstrap/fixture，不能直接代表生产菜单输入。
- 现有 tests 以全零 fixture 证明 fallback，但尚未证明真实生产 caller 在未 hydrate 时可达；这是本卡必须补齐的 caller/lifecycle 证据。

## 验证

### 已读取与证据锚点

- 生产状态 caller：`packages/game/src/present/menu/draw-menu.ts:155-176`、`packages/game/src/present/present.ts`、`packages/game/src/core/battle/battle-system.ts:1703-1712`、`packages/game/src/core/game-state.ts:1385-1425,1777-1782`、`packages/game/src/shell/bootstrap.ts:1628-1682`；确认状态页消费 hydrated runtime，战斗结束会把真实 HP=0 写回 runtime。
- SDLPal primary/reference：`reference/sdlpal/uigame.c:1120-1229` 直接读 runtime 数值；`reference/sdlpal/global.c:1459-1518,1543-1613,1669-1675` 按当前 party slot 读写毒；`reference/sdlpal/fight.c:1616-1628,4454-4461` 以战斗队伍槽跑毒；`reference/sdlpal/script.c:2164-2197` 的 `0x75` 换队伍后清空毒表并重算装备。原始二进制真值仍以 `data/raw` 为最终依据，reference 仅作可读实现证据。
- 当前 TS 换队入口：`packages/game/src/core/event-system.ts:4436-4455` 的 `OP_SET_PARTY` 清空 `gs.rgPoisonStatus`；dev 队伍切换与 fixture 重建也清空毒表（`packages/game/src/dev/dev-panel.ts:1464-1474,2052-2058`）。

### 反例与修复

- 候选实现之后重建的旧版本反控（不能当作修复前 red 的时间证据）：把 `HEAD` 的旧 `player-poison-state.ts`、`battle-opcodes.ts` 临时恢复到隔离治理 worktree，运行
  `pnpm --filter @type-pal/game exec vitest run src/core/battle/__tests__/battle-opcodes.test.ts -t 非顺序队伍`，退出码 `1`；旧实现分别把 role 4 的毒读成未中毒、并写入 `0_4` 而不是当前队伍槽 `0_0`。早期弱fixture回执不交付为验收证据；本轮已改typed工厂并分别重跑两个反控，每次恰一AssertionError，原始JSON、源/测试hash和恢复绿均保存在 `docs/ops/evidence/CODE-QUALITY-53/reconstructed-negative-control.json`。测试后通过 `finally` 恢复候选实现。
- 当前实现新增 `partySlotForRole`，以角色为入口的施毒/解毒、头像颜色、dev 面板和 battle opcode 统一解析当前队伍位置；战斗 tick、状态页和 inspect 直接读已有的队伍槽；离队角色不再以 roleId 兜底。
- 状态页移除 `runtimeOrBase` 和 `||` 静态模板回退，runtime 的 0 保留为 0；fixture 改为显式 hydrate 后再覆盖合法的零值。
- 新增/强化回归：非顺序队伍 `[4,1]` 的战前毒进入战斗不换人；0x29 落当前 party slot；0x61 读取当前 slot；0x75 换队清空毒表；状态页/战斗头像/inspect 使用同一映射。

### 已运行的定向验证

- `pnpm --filter @type-pal/game typecheck`：通过。
- `pnpm --filter @type-pal/game exec vitest run src/core/battle/__tests__/battle-system.test.ts src/core/event-opcodes.cov85.test.ts src/core/battle/__tests__/battle-opcodes.test.ts`：3 files / 366 tests 通过。
- 此前误用 `test -- paths` 实际运行了 game 全包：312 files / 3529 tests 通过（不是定向集）；该结果仍只作为候选实现回归证据，不替代全仓质量门。
- 全仓质量门、coverage ratchet、protected fast、lint-zero 及本批最终 ledger 尚未在本候选变更后收口；退出码为 0 但带诊断的工具输出仍不能算通过。

### 当前状态与风险

- Codex build allowed；当前仍为 `build`，独立验收 pending，不能标记 done。
- 本批不新增 schema 字段、readiness 字段或迁移器，但确实改变 `rgPoisonStatus` 序列化键第二维的语义（role ID → party slot），不能写成“不触碰 save”。bootstrap 读档在消费毒之前无条件清空毒表并重算装备，因此当前正式读档路径不需要旧毒键迁移；Save API 的其它调用域仍须复核。
- 未知/需继续核对：全仓是否存在绕过正式 `OP_SET_PARTY` 的生产队伍重排；当前生产写点检索仅见 bootstrap 启动参数、`OP_SET_PARTY` 和 dev 工具，仍需在全仓门阶段复核。
- 候选前账本机器基线：`3267 files; 340 closed / 8 review / 2919 pending`；本轮两条实现记录重新打开为 review，最新计数见后续补记。

## 当前模式推进记录

- Codex 范围/前提核验：verified（primary/caller、runtime ownership、party-slot poison 与换队清表已核对）
- 受委派 Coding Owner / 隔离分支：Codex / `/Users/zhangxu/illegal/type-pal-quality-3x` / `codex/code-quality-3y`
- build 准入：Codex build allowed（用户授权键语义；原候选反控为事后重建，重复角色修正另有真实 red→green；save 语义边界见上）
- 贡献者交付/自验：N/A
- Codex 独立验收：pending（待全仓质量门与逐文件复核）
- 用户产品裁决/体验验收：2026-10-13 用户批准：①保留真实 runtime 0；②按当前 party slot 读取毒；换队清毒由 Agent 查源码确认
- done 准入：pending，未满足

## 交接

本卡仍由 Codex 在同一隔离治理分支连续推进，无下一位 Agent 提示词；尚未到用户验收/收口阶段。下一步先完成本批全量质量门、独立 diff 复核和账本/看板同步，再决定是否提交推送。

## 2026-10-13 当前候选复核补记

- 隔离目录/分支复核：`type-pal-quality-3x` / `codex/code-quality-3y`；fetch 后 origin/main 仍为 `646c8097034e4bd30a3ebde86cd61d46a2382e8a`，候选前 HEAD `a58c2a263`，0 behind / 49 ahead。主工作树仅只读检查，未写入。
- 新发现：无差别 role→slot mapper 对合法重复角色 `[4,5,4]` 不成立。`fight.c:1616-1628`、`uigame.c:1245-1253` 分别用实际队伍循环槽、菜单 cursor；`global.c:1483-1493` 与 `uibattle.c:119-129` 才找首个 role 匹配。候选把这两种入口混同，会让首槽毒执行两次（HP 200→180，而应为190），状态页/inspect 也重复显示首槽毒。
- 本轮先写上述失败用例，实测 3 个 AssertionError，再修 3 处消费者。战斗用例走真实大世界 `0x29` + 施毒入口脚本、`startBattle`、defend 整轮与回合末 `0x1B`；`[4,1]` 验证战前毒延续，`[4,5,4]` 验证不双 tick。第二成员无伤、毒脚本续点保存；不再用只检查表存在的弱测试替代发作证据。
- 新增测试使用 typed 工厂，无新增 any/双强转；全局脚本/毒表注入在 afterEach 清理。0x75 用真实 GameState 和 raw opcode，验证 `[4,1]`→`[1,2]` 后旧毒表清空；操作数 0 跳槽，不是 0xffff。
- 定向 5 files / 378 tests 通过；game typecheck exit 0。精确命令、red、green、重建源 hash 见 evidence。原始候选的旧源反控不能冒充 red-first，本轮修正有实际先失败记录。
- 独立发现的 0x61 level>=99 条件未随键迁移夹带修复；候选曾复用 isPlayerPoisoned 扩展行为，现撤回该扩展。单独登记 CODE-QUALITY-79；本卡只改寻址，battle-opcodes 整文件恢复 review。
- Dev 换队清表后装备伪毒重建、Save API 其它 caller、功能界面视觉与全部变更文件复核仍待完成；本卡不得 done 或合 main。未关闭任何新增文件。
- 最近全仓 check 日志已跑至 3996 files / 0 error / 0 warning / 0 info，但进程句柄跨中断失效，未取得最终 exit；另有 reforge/editor jsdom navigation 诊断，不能直接宣布全门通过。本候选后最终门重跑记录见后续交接。

### 本轮实际读取清单与范围

全文：`player-poison-state.ts`、`core/menu/player-status.ts`、`present/menu/draw-player-status.test.ts`、`core/inspect/battle-inspect.test.ts`、typed battle harness；其余候选实现/大测试文件本轮只补读相关分支与 caller，不能把这些片段等同全文件完成。历史逐文件审计保持历史含义，候选接受仍需补核。

变更白名单补充：所有 fixture 更新限于此次键语义/显式 hydrate；`actions.test.ts`、`dependency-ownership.test.ts`、`equip-effect.test.ts`、`event-opcode-player.glm-next-wave.test.ts`、`event-system.glm-event-contracts.test.ts`、`event-system.test.ts`、`core/inspect/battle-inspect.test.ts`、`p05-menu-stack.test.ts`、`draw-battle-ui.test.ts`、`battle-ui-pixels.grok-r1.test.ts`、`status-poison-equip.glm-q.test.ts`；当前 testing-docs 三个源 hash 清单联动更新，history 原样保留。完整路径以本提交 diff 为准。

### 后续只读补证（本轮未新增产品改动）

- 补全文读取 `present/menu/draw-player-status.ts`、`draw-player-status.glm-phase1-leaves.test.ts`、`core/inspect/battle-inspect.ts`、`status-poison-equip.glm-q.test.ts`、`event-opcode-player.glm-next-wave.test.ts`、`core/menu/menu-mode.ts`、`core/save/api.ts`、`core/save/indexed-db.ts`。不因完整阅读自动关闭，遗留fixture隔离/业务输入与dev生命周期仍待复核。
- `menu-driver.ts:206,959-969` 创建队伍快照并在cursor结束时关页；`present/menu/draw-menu.ts:158-176` 是实际绘制caller（更正旧卡遗漏menu目录的路径）。`tools-panel.ts:444-452` 消费按显示slot生成的inspect行。
- Save调用域补证：`bootstrap.ts:1103,1112,1634` 的三处load分别用于导出、quick-load预检、实际加载；`tools-panel.ts:630-660` 导入写槽后要求读档菜单载入，不直接激活毒表。实际加载仍统一经过`:1682`清毒。未修改save结构、驱动或生成物；键语义本身的影响仍明确登记。
- 普通 `[4,1]` 前后链回归并不证明旧TS必然把毒转给别人：旧TS大部分读写本来一致使用roleId。反控证明的是用户选定的party-slot合同；本轮重复角色反例针对未合入的迁移候选。
- 新增6个逐项重建反控：3个旧源对照（0x29/0x61/runtime0）和3个候选读槽退化对照（battle tick/status/inspect）；每次执行集合恰一业务AssertionError，恢复后同一fullName通过，源字节逐次恢复。实际首次slot红仍单独保留，未伪造红先于修复的时间线。
- 当前机器账本为 `3267 / 338 closed / 10 review / 2919 pending`，是两条旧已验证记录恢复review，无新增关闭。
- 未执行的集中视觉入口：game状态页打开已hydrate队伍`[4,1]`，角色4 HP/MP=0显示零；用公开0x29为首槽施毒后进入战斗，首槽毒每回合生效，0x75换队后无残留；重复角色`[4,5,4]`状态页cursor2不显示首槽毒。记录截图与实际输入时序后再判断视觉完成，当前不声称完成。

- 尚未关闭的脚本重入边界：`addPoisonForPlayer` 仍先运行入口、后写完整毒槽；SDLPal `global.c:1513-1517` 先写ID再运行入口。若入口重组队伍或重入施毒，ownership可能不同。本批不把合成重入场景当成已证生产缺陷，后续先扫描真实毒入口脚本/caller；未知保持review，不顺带改顺序。

- 原始提取数据补证：`events/all.json` raw entry16677 为 `0x75 [5,6,5]`，证明`[4,5,4]`不是非法测试队伍。扫描所有字面`0x29`引用得到12个毒ID；这些毒的首次入口仅HP/MP raw或end，没有SetParty/重入施毒。此结论只覆盖当前提取数据的首次入口，不扩展到任意注入catalog或之后的脚本续点；原始哈希与12段入口见`first-poison-entry.json`。

### 2026-10-13 隔离候选检查点（未收口）

- 补全文读取 `packages/game/src/dev/dev-panel.ts` 的 1–2299 行，涵盖生产入口、全部 DOM handler、场景异步回调、关闭流程与 fixture/custom/boss 启战入口。完整读取不等于完成验收；该文件仍 pending。
- 已确认当前候选需要继续处理的边界：队伍头像切换在 explore 和 battle 都可达；修改 `gs.partyMembers` 后只清毒表，未重算装备伪毒，也未同步正在进行的 `battleState.players`。`applyFixture` 同样清表后 hydrate/startBattle，但未在这里重放装备脚本。下一批先对照正式 `OP_SET_PARTY` / bootstrap equipment 生命周期，构造合法失败反例，再限定修复；当前不允许合入 main。
- 另记只读候选而不顺带实现：`setupDevPanel` 没有返回监听器 disposer；`closePicker` 仅移除 DOM，没有断开局部 `IntersectionObserver`，缩略图 Promise 没有关闭后的取消/拒绝处理。这些仍需真实调用生命周期与反例，未认定整文件通过。
- 全仓 `pnpm check` 已取得可靠 exit 0（UTC 03:34:11–03:48:52）：content 149 files/1498 tests；shared 16/131；game 312/3535；pal-extract 70/423；reforge 359/8964；editor 631/4951；migrate 96/739。静态 lint 3997 files，error/warning/info 全 0。
- 上述 check 的 reforge/editor 测试各输出一次 `Not implemented: navigation to another Document`。因此只记录命令执行成功，统一零诊断验收仍未通过；不得以既有问题豁免，也未增加 suppression/ignore。coverage ratchet、protected fast、最终 lint/ledger 结果待本次串行检查完成后追加。
- 本轮新关闭文件：无。`player-poison-state.ts`、`battle-opcodes.ts` 保持 review；状态页、battle-system、inspect、dev 等未完成整文件证据的项继续 pending。本卡 build、CODE79 draft；不是已闭合批次。
- 补全文读取 `dev-panel.pure.test.ts`（574行）、`dev-panel.glm-next-wave.test.ts`（107行）、`dev-panel.test.ts`（40行）和 `core/dependency-ownership.test.ts`（178行）。dev 现有测试未覆盖清毒后的装备恢复或战中队伍切换；pure fixture 还有多处强转/不完整资源，不能直接复制为新增反例。GLM 的“释放”只验证 DOM 移除，并未证明全局 listener/observer 释放；这些文件不因本次全包绿而关闭。
- 官方 ratchet 已完整执行，exit 1：game statements `13569/15563` 低于基线 `13560/15548`；branches `8925/11331` 低于 `8924/11324`；lines `12123/13658` 低于 `12115/13647`，相应总比率也下降。保留官方基线；后续应验证本次新增的离队角色边界与 dev 生命周期等真实合同，不以弱断言填百分比。
- `event-opcodes.cov85.test.ts` 的 0x75 回归目前通过同步脚本 helper 检查 raw dispatcher 的换队/清表结果，不能称为真实剧情事件入口到装备重建的端到端证明。下一批要把它接到正式事件 tick，并核装备刷新；不为同一合同再堆一个重复用例。

### 本检查点质量门与后续顺序

| 质量门 | 实测结果 | 验收解释 |
|---|---|---|
| 定向5文件 | 378 tests passed | 仅对应反例与相邻回归 |
| game全包/必要typecheck | 312 files / 3535 tests；typecheck exit 0 | 不替代逐文件核验 |
| 全仓check | exit 0；全部包测试通过 | reforge/editor各有1条jsdom导航诊断，统一零诊断验收未通过 |
| 官方coverage ratchet | exit 1 | game及total三个比率下降，未降基线 |
| protected fast | `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast` exit 1 | 同一覆盖率下降；19832 tests通过不等于门通过 |
| lint-zero | exit 0；3999 files，0 error / 0 warning / 0 info | 静态门通过；最终文档落盘后另复查 |
| ledger | exit 0 | 3267 files / 338 closed / 10 review / 2919 pending |
| docs | exit 0；0 issues | 文档静态一致性，不是产品验收 |

完整日志与候选源hash见 `docs/ops/evidence/CODE-QUALITY-53/`。只提交/推送 build 检查点保全本轮工作，未合并、未标done；治理分支在本次fetch后为0 behind / 49 ahead（检查点提交前）。

下一批直接继续：优先保留当前候选，核离队角色调用域并补有判别力的 ownership 反例；把现有0x75用例改为正式事件入口，连同dev换队/fixture的装备恢复和战中ownership一起判断。完成这组生命周期与测试质量修正后集中重跑统一门；另行定位jsdom导航诊断。CODE79继续只读核真实battle-item链，不夹带产品改动。未完成全文件核验、统一门和集中视觉前，不得把任何上述pending/review改为已验证。

检查点文档落盘后复查：`pnpm check:docs` exit 0、0 issues；`pnpm lint` exit 0、4000 files、0 error / 0 warning / 0 info；ledger exit 0、计数未变。25个game变更文件与质量门源SHA逐一相同。最近fetch仍为 `646c8097034e4bd30a3ebde86cd61d46a2382e8a`，主工作树仅只读检查；完整复查输出见 `final-docs.txt` / `final-lint.txt`。
