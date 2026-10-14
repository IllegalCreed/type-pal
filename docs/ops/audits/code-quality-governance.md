# 全仓代码质量治理总纲

基点：`b9ba7e0faadf56519da024c0343f5b44b9a5c447`（`origin/main`，2026-10-04）。
本文件是 CODE-QUALITY-1 的治理路线与证据入口，不是“全仓已审完”声明；逐文件机器清单由
[`scripts/quality/code-quality-inventory.mjs`](../../../scripts/quality/code-quality-inventory.mjs)按基点生成，
使用 `node scripts/quality/code-quality-inventory.mjs --out=/tmp/type-pal-code-quality-inventory.json` 获取完整 JSON，
不把机器快照当作产品源文件提交。
已经直接核验的文件另记在[逐文件代码治理账本](code-quality-file-ledger.md)；账本未清零前不得宣布专项完成。

## 边界与当前责任

本专项按工程 → 模块 → 功能 → 文件推进，Coding Owner 为 Codex，单批单一写入者；不接管
`TEST-COVERAGE85-*`、`E2E-*` 或测试文档线程，不重领 `architecture-debt.md` 已完成的 13 批架构拆分。
生产行为、公共 API、schema/save、生成物和用户可见形态默认保持不变；若一手证据证明必须改变，另开产品/高风险卡。

`docs/ops/archive/tasks/done/CODE-QUALITY-1-governance.md` 记录本轮范围、前提真值门、首批白名单和验收；本文件只写已经
核实的治理路线，未知职责与候选问题保留为“待核”，不从行数、`any`、重复片段或静态图直接推出缺陷。

## 工程 / 模块 / 功能地图

| 工程 | 模块 | 功能面 | 公开出口 / 生产 caller 形态 | 状态所有权与质量审计重点 | 当前 Owner / 决定 |
|---|---|---|---|---|---|
| 第一阶段 | `@type-pal/shared` | MKF/RLE/YJ2/RNG 编解码、资源与输入类型 | 根 barrel `packages/shared/src/index.ts`；game、pal-extract、migrate、reforge 直接消费 | 纯字节解码器；检查游标进度、边界、错误传播、透明度不变量，不能把测试 fixture 当生产输入 | Codex；首批 RLE 边界，需修 |
| 第一阶段 | `@type-pal/pal-extract` | 原始 MKF/事件/资源解析与 CLI 写出 | `src/cli.ts` 及各 parser；调用 shared 纯 codec | IO、纯解析、写盘职责与失败策略；不改 `data/raw` 或提取产物 | Codex；待核 |
| 第一阶段 | `@type-pal/game` | shell 启动、事件/战斗/地图、呈现和资源加载 | Vite app；`assets/`、`core/`、`present/`、`shell/` | 机制真值、状态生命周期、取消/清理、资源失败降级；不得把静态计数当债 | Codex；待核 |
| 第二阶段 | `@type-pal/content` | canonical 内容类型、作者校验、引用闭包 | `src/index.ts` 与各领域类型/validator | schema 所有权、稳定 ID、验证层与运行时层方向；不主动改 content20 | Codex；待核 |
| 第二阶段 | `@type-pal/migrate` | 迁移纯函数、源规划、写保护与 PAL 供给 | `src/`、`scripts/migrate-content.mts`、`scripts/bake-assets.mts` | 上游真源、幂等、事务/写盘边界；不单点改 `projects/pal` | Codex；待核，保留已收口 PAL supply 边界 |
| 第二阶段 | `@type-pal/reforge` | 新运行时 main、world、battle、script、assets、author IO | `src/index.ts` 及 `author-io`/`entity-action-player`/`script-compiler-core` | READ-FIRST 架构优先、稳定 ID、显式状态所有权、取消/资源释放；不把一阶段代码结构搬回去 | Codex；待核，不重领 A1–F2 |
| 第二阶段 | `@type-pal/editor` | React App、工作区会话、命令/表单、设计系统与工具脚本 | Vite app、`src/core`/`src/ui`、`scripts/design-system-audit*` | UI 状态与 IO/纯规则分层、异步竞态、焦点/可访问性、公共命令边界；不夹带 UI 形态变更 | Codex；待核 |
| 工具 | `scripts` | quality/docs/coverage/script-governance/E2E 工具 | package scripts 与 Node CLI | 子进程、临时目录、失败/取消/清理、确定性；E2E 文件与文档当前不占用 | Codex；质量工具可审，E2E 保持隔离 |

## 机器清单口径

生成器以 Git 追踪树为输入，只扫描 `packages/{content,editor,game,migrate,pal-extract,reforge,shared}` 与 `scripts`，
记录路径、category、domain/module/feature、行数、公开出口、静态直接依赖与反向 caller，并预留
`stateOwnership/qualityIssues/evidence/risk/decision/status/verification` 字段。生产 callers 排除 test/fixture；
静态关系只是取证入口，不等同完整运行时调用图。

基点清单当前为 2,962 个记录：

| category | 文件数 | 解释 |
|---|---:|---|
| product | 772 | 包内生产 TypeScript/TSX/MTS/MJS 与工具生产代码 |
| test | 1,744 | `*.test.*` / `__tests__`，只作为合同与 caller 证据，不把数量当质量 |
| fixture | 9 | 独立测试输入/构造器 |
| generated | 356 | baselines、oracle、adoption/evidence 等机器产物；不直接改 |
| tool | 81 | `scripts` 非测试工具；E2E 工具在本轮只登记不修改 |

以上统计由 `node scripts/quality/code-quality-inventory.mjs` 生成；
重新生成后 `base` 必须与审计基点一致，若基点变化需在卡内记录 revision。所有记录初始为 `待核`，首批完成后
只把有直接 caller/oracle/验证证据的文件改为 `已验证`，未知候选不能自动删除或标成无问题。

## 问题优先级与停止线

### P0：安全/确定性/硬门

只收有直接执行证据的问题：无限循环、越界/未定义输入、未处理 Promise、资源/临时目录泄漏、共享状态竞态、
lint/typecheck/格式非零诊断。修复必须给出 before/after、生产 caller、失败 oracle 和相邻回归；不得用 ignore、
强转、缩小扫描范围或降低规则过门。

### P1：职责与公共边界

收状态/IO/纯逻辑/呈现 ownership 混杂、反向依赖、隐式全局、过宽 RuntimeContext、公共出口不清晰或失败策略
由相邻层吞掉的问题。只在调用关系和生命周期证据齐全时拆分；不以“文件变小”作为验收。

### P2：合同可读性与可维护性

收会误导维护者的过时注释、模糊业务命名、布尔模式参数、重复防御和与业务合同不一致的复用。改名/公共出口
必须全量更新 caller，并评估测试身份保护；纯表面注释不计整改。

### P3：死代码/历史兼容/低价值复杂度

只有生产 caller、输入域和替代证据均证明后才删除；开发期旧版本 fallback/upgrader 默认退役，除非任务卡列出
无法重建的真实输入、唯一调用者、删除条件和用户批准。未知项留 `待核`，不为凑数量改代码。

任何发现 schema/save/migration/asset pipeline、第一阶段机制真值、用户可见 UI/玩法或生成物影响时，立即停线，
升级高风险卡并重新过前提真值门。

## 有限批次与文件所有权

| 批次 | 白名单 | 目标 | 当前状态 |
|---|---|---|---|
| Q1 shared RLE safety | `packages/shared/src/rle.ts`、同域 RLE 回归 | generic framing 的截断/越界失败、strict sprite 零长 guard；合法像素/opaque 保真 | `done` |
| Q2 shared codecs/types | `shared/src/{mkf,yj2,rng,resources,tables}` 及必要 callers | MKF/RNG/YJ2 codec 边界已收；resources/tables/events/input/index/rle-encode 纯类型/合同文件已逐文件核验；剩余 caller/数据语义复核仍待后续账本批次 | `done`（codec/type 子批）；不得把剩余 caller/数据语义复核视作全仓已审完 |
| Q3 phase1 extract/game | `pal-extract` parsers/CLI、game assets/core/present/shell，分互斥子批 | pal-extract 生产文件（events/io/font/resources/parsers/CLI）已逐文件核验并分批收口；game assets/core/present/shell 仍待逐文件治理 | `draft`，不得与覆盖率/E2E线程重叠 |
| Q4 phase2 content/migrate | content validators/types、migrate pure/IO 薄壳 | canonical schema、迁移源、事务/幂等边界；不改生成物 | `draft`，不得开始实现 |
| Q5 phase2 reforge/editor | reforge runtime、editor core/ui/tooling | 新架构 ownership、异步清理和公共出口；不重领13批 | `draft`，需要逐批准入 |
| Q6 scripts tools | quality/docs/script-governance 等非 E2E 工具 | 子进程/临时树/失败语义/确定性；E2E 留给其 Owner | `draft`，按 caller 另卡 |

2026-10-05 Q3h 已闭合 game 资产/启动窄批：`assets/{loader,tileset-blob,png,rle-decode}.ts` 与
`shell/{fetch-retry,bootstrap-resources}.ts` 已逐文件直接核验；仅 `fetch-retry` 非法配置的悬空
`throw undefined` 有证据并修复。定向 77、game 全包 3,397、全仓第二轮 `pnpm check`、官方 ratchet、
protected fast、Biome 零诊断均通过；game 其余 core/present/shell/analytics/tools 仍待账本逐文件核验，
不可把本窄批写成 Q3 或全仓完成。

2026-10-05 Q3i 已闭合 game 对话资源/预缓存 UI 窄批：`assets/dialog-assets.ts` 与
`shell/{precache-client,precache-ui,audio-volume,trademark-fallback}.ts` 已逐文件核验；仅音量
controller 的 NaN 输入有直接证据并按 0 修复，另纠正一条与 `playRng` 真值冲突的过时注释。定向 68、
game 全包 3,398、全仓第二轮 `pnpm check`、official ratchet、protected fast、Biome 零诊断均通过；
game 其余 core/present/shell/analytics/tools 仍待逐文件治理。

2026-10-05 Q3j 已闭合 game tools/speedrun 小批：`tools/{display-scale,fps-overlay,toast,map-names}.ts`
与 `tools/speedrun/{time-format,countdown,checkpoints}.ts` 已逐文件核验；仅 display-scale 的 NaN
百分比有直接证据并按默认 100% 修复，速通 checkpoint 坐标继续保留“需真实运行证据”的未知项。
定向 47、game 全包 3,399、全仓 check、official ratchet、protected fast、Biome 零诊断均通过；
不得把本小批写成 game 或全仓治理完成。

Q3k 审计发现并修复一个真实 present 缺陷：sdlpal `wScreenWave` 是 unsigned WORD，而 TS
`number` 在真实 raw opcode 0x71 `[255,65532,0]` 的负 progression 收尾时会越过 0；现以
`<=0` 关断，避免负波幅继续参与扫描线位移。mutant `4 total / 3 passed / 1 failed`，恢复后
`4/4`；完整质量门尚待本卡收口。

Q3k 已完成全仓质量门：game 全包 3,400、全仓 `pnpm check`、official ratchet、protected fast、
Biome 零诊断均通过；coverage baseline 只升不降更新至 total 19,282 tests。六个 present primitive
已直接核验，但 present/battle/menu/dialog 其余生产文件仍未逐文件清点。

Q3l 已完成 game battle-present 七文件窄批：背景、effect、数字弹幕、结算、精灵、战斗 UI 与
`present-battle.ts` 逐文件核验，14 个直接测试文件/179 tests 通过；未发现需修的直接缺陷。
全仓第二轮 `pnpm check`、official ratchet、protected fast、Biome 零诊断均通过；battle core、
menu/dialog 与其它 present 生产文件仍待逐文件治理。

Q3m 已完成 game battle core 合同六文件窄批：formulas、magic-damage、status、turn-queue、
battle-positions、rng 逐文件读取 primary source/caller/tests，未发现直接缺陷或需要行为修复。
game 全包 3,400、全仓第二轮 `pnpm check`、official ratchet、protected fast、Biome 零诊断均通过；
其它 battle core/actions/system/menu/scene/save 文件仍待逐文件核验。

Q3n 已完成 game core fade/identity/catalog 四文件窄批：palette fade、scene identity、WORD
lookup、global script catalog 逐文件核验；发现并修复 global label map 对 inherited
`toString`/`constructor`/`__proto__` 的误解析，补 own-property/null-prototype 合同。全仓第二轮
`pnpm check`、official ratchet、protected fast、Biome 零诊断均通过；scene-system、event-system
及其它 core 生产文件仍待逐文件清点。

Q3o 已完成 game core mode/history/poison/search 四文件窄批：逐文件核对 play.c/scene.c/global.c
与真实 callers/tests，未发现直接缺陷；定向 42、game 全包 3,403、全仓第二轮 check、official
ratchet、protected fast、Biome 零诊断均通过。event-opcode-player、scene-system、battle-system
及其它 core 生产文件仍待核验。

Q3p 已完成高风险 event player/equipment/poison opcode 单文件核验：`event-opcode-player.ts`
及 3 个专属测试文件逐段对照 `script.c/global.c`、event-system/equipment/inventory/poison callers；
未发现直接缺陷或需改行为。全仓第二轮 `pnpm check`、official ratchet、protected fast、Biome 零诊断
均通过；event-system、scene-system、battle-system、save 等大型 core 文件仍待逐文件核验。

Q3q 已完成高风险 `scene-system.ts` 逐文件核验：662 行实现与 2064 行 scene-system tests 全文读取，
逐段对照 `play.c`/`scene.c`/`map.c`/`res.c`/`global.h` 及 `mode.ts`、`event-system.ts`、bootstrap/dev
callers；输入顺序、移动步长、trigger/vanish/revive、blocker push、菱形碰撞、camera/trail、loadScene/onEnter
均有直接 caller/oracle 证据，未发现直接缺陷。定向 131、game 全包 3,403、完整 check、official ratchet、
protected fast、Biome 零诊断均通过；ratchet 基线未变化。Q3q 只关闭这两个 scene-system 文件，event-system、
battle-system、save 及账本剩余 2,760 个待核记录仍未关闭。

Q3r 已完成高风险 `event-system.ts` 逐文件核验：5110 行实现与 5973 行主测试全文读取，逐段对照
`script.c`/`play.c`/`scene.c`/`text.c`/`global.h` 及 mode/bootstrap/scene/battle/menu/equipment/poison callers；
全局脚本表、auto/event/runScript、waiting/fade/modal、scene/battle resume、raw opcode、对象解析、移动/镜头与
runEnterScript 均有直接 caller/oracle 证据，未发现直接缺陷。定向 370、game 全包 3,403、完整 check、official
ratchet、protected fast、Biome 零诊断均通过；ratchet 基线未变化。Q3r 只关闭 event-system 与其主测试，
battle-opcodes、save 及账本剩余 2,758 个待核记录仍未关闭。

Q3s 已完成高风险 `battle-system.ts` 逐文件核验：3139 行实现与 4182 行主 lifecycle/UI 测试全文读取，另核
cov85/GLM/runtime-context、anim/death-fade/dialog/settlement/finalization callers；逐段对照 `battle.c`/`fight.c`/
`script.c`、bootstrap/mode/actions。startBattle 资源/敌槽/波场、phase guards、queue/UI、动画/dialog、逃跑/淡出、
毒/status/cleanup/resume 均有直接证据，未发现直接缺陷。定向 242、game 全包 3,403、完整 check、official ratchet、
protected fast、Biome 零诊断均通过；ratchet 基线未变化。Q3s 只关闭 battle-system 与四个直接 lifecycle oracle，
battle-opcodes、其它 actions/present、save 及账本剩余 2,753 个待核记录仍未关闭。

Q3t 已完成高风险 `battle-opcodes.ts` 与 4 个专属测试逐文件核验：1528 行实现、主/coverage/GLM opcode tests、summon slot reuse、
cross-module、actions、magic-damage、throw-item、coop-magic、anim-timeline caller 逐段对照
`script.c`/`fight.c`/`battle.c`、`runScript` battle caller 与 `BattleCtx` ownership。目标/状态/伤害/毒、召唤/分裂/变身/
逃跑、动画/偷窃/战斗结果和 `consumed/newIp` 均有直接证据，未发现直接缺陷；0x2E 的 `>=` 是既有
`game-mechanics.md` 记录的原版后期产品决策，不回改为 SDL 的 `>`。定向/相邻 470 tests、完整 check、official
ratchet、protected fast、Biome 零诊断均通过；ratchet 基线未变化。Q3t 关闭 5 条账本记录（1 个 product + 4 个 test），
当前账本为 2,964 条：已闭合 215、已读待审 5、尚未逐文件核验 2,744；其余 battle actions/present、save 及其它
pending 文件仍未完成，不得宣布全仓治理收口。

Q3u 完成 `battle-state.ts`、`battle-runtime-context.ts`、`battle-positions.ts` 三个基础文件的生产实现核验：918/98/93
行实现与 state/runtime/finalization/animation 相邻 tests 运行结果逐段对照 `battle.h`/`global.h`/`battle.c`/`fight.c`
及 `battle-system`/`battle-finalization` callers。BattleState 快照/phase/UI/空槽/对象身份、runtime resource/runner
ownership 与清理、玩家/敌人位置表和 y offset/fallback 均有直接证据，未发现直接缺陷。定向/相邻 55 tests、完整 check、
official ratchet、protected fast、Biome 零诊断均通过；ratchet 基线未变化。Q3u 的新增记录为 5 条（2 个 product + 3 个
test）；`battle-positions.ts` 与 `battle-runtime-context.test.ts` 沿用 Q3m/Q3s 历史核验，不重复计数。当前账本仍为
2,964 条：已闭合 215、已读待审 5、尚未逐文件核验 2,744；battle
actions/present、save 及其它 pending 文件仍未完成，不得宣布全仓治理收口。

Q3v 已完成 `actions/attack.ts`、`attack-mate.ts`、`defend.ts`、`flee.ts` 四个基础 action 文件逐文件核验：826 行
实现与真实 `performBattleAction` caller、`fight.c`/`battle.c` primary source、attack-mate/attack GLM 专属测试及
actions/anim/formula 相邻 oracle 全文/相关段读取。普通/群攻/DualAttack、敌攻格挡/替挡/protect、混乱攻友、逃跑
装备与 boss gate、equiv poison、动画与 legacy fallback 均有直接证据，未发现直接缺陷；`performFlee` 敌吉运修复按
`game-mechanics.md` 用户裁决保留。定向/相邻 154 tests、完整 check、official ratchet、protected fast、Biome 零诊断
均通过；ratchet 基线未变化。Q3v 关闭 6 条账本记录（4 个 product + 2 个 test），`actions.test.ts` 只作相关段相邻
oracle，不计入本批关闭。当前账本为 2,964 条：已闭合 221、已读待审 5、尚未逐文件核验 2,738；battle 其它 actions、
present、save 及其它 pending 文件仍未完成，不得宣布全仓治理收口。

Q3w 已完成 `battle-finalization.ts` 与 `battle-settlement.ts` 两个结算/清理文件逐文件核验：313 行实现、`battle.c:991-1373,1822-1857`、
真实 `tickBattle`/finalize caller、finalization/settlement 专属测试和 progression 相邻 oracle 全文对照。exp/cash/HP-MP 回写、
结算屏序与 timeout、Phase E 一次性执行、对话 hold、半血恢复、mode/wave/runtime/postBattle resume 清理均有直接证据，未发现直接缺陷。
定向/相邻 196 tests、完整 check、official ratchet、protected fast、Biome 零诊断均通过；ratchet 基线未变化。Q3w 关闭 3 条新增账本记录
（2 个 product + 1 个 test）；`battle-finalization.test.ts` 沿用 Q3u 历史记录，不重复计数。当前账本为 2,964 条：已闭合 224、已读待审 5、尚未逐文件核验 2,735；其它 battle actions/present、
save 及其它 pending 文件仍未完成，不得宣布全仓治理收口。

CODE-QUALITY-6a 增加了逐文件账本机器完整性门：真实 inventory 与 Markdown ledger 逐路径对账，重复/未知路径、非法状态、缺证据、
tracked 数量和状态汇总漂移均 fail-closed；37 个 quality-tool tests（含 9 个账本反例/真实仓库调用）通过。该门只验证记录完整性，
明确不把机器 PASS 当作源码语义审查；新增 `code-quality-ledger.mjs` 与其测试本身已登记为已验证文件。当前 tracked inventory 2,966：
已闭合 226、review 5、pending 2,735；全仓仍未完成。

随后已把治理分支同步到最新 `origin/main`（merge 后 0 behind）；主线新增的 tracked records 经 ledger integrity gate 重新纳入，均保留
pending，不作语义审查信用。当前 inventory 为 3,058，已闭合 229、review 5、pending 2,824；分支可继续增量治理，但不应把新增主线
文件误认为已核验。

Q3x 已完成 `battle-progression.ts` 与两个专属 progression/levelup 测试逐文件核验：306 行实现、`battle.c:991-1373,1226-1328`、
`global.c:2347-2454`、settlement caller 和 battle-system progression 相邻段均有直接证据。主升级活人 gate、隐藏经验池顺序/截断/
99 边界与无 cap、主升级 cap、HP/MP 回满时机、法术 level gate/去重/槽写入和 snapshot 有效值均闭合，未发现直接缺陷。定向/相邻
205 tests、完整 check、official ratchet、protected fast、Biome 零诊断均通过；ratchet 基线未变化。Q3x 关闭 3 条账本记录（1 个 product +
2 个 test），当前账本为 2,966 条：已闭合 229、review 5、pending 2,732；全仓仍未完成。

Q3y / CODE-QUALITY-83 已完成 `menu-mode.ts`、`menu-stack.ts`、`menu-mode.test.ts` 三文件逐文件核验：完整读取实现与测试，并核对 `mode.ts`、`scene-system.ts`、`menu-driver.ts`、`battle-system.ts`、`bootstrap.ts`、`present.ts` caller、`GameState.menuStack` ownership，以及 SDLPal `uigame.c`/`script.c`/`uibattle.c` modal 返回合同。空栈恢复、栈顶 dispatch、嵌套 pop、inventory goto-out、battle/shop/explore resume、同帧关闭边界均有直接 oracle；未发现输入、边界、状态 ownership、异步取消、资源清理或公共接口缺陷，也未触碰高风险边界。定向/相邻 342 tests、game typecheck、Biome、全仓 `pnpm check`、official ratchet、protected fast、lint-zero、docs/content-review、ledger 全部通过；ratchet 基线未变化。CODE-QUALITY-83 只关闭 3 条账本记录，当前 inventory 3,270：closed 344、review 9、pending 2,917；CODE53/57/79/80/81 与其它 Q3 core/present/shell/analytics/tools 文件仍保持原状态，下一批从最新账本选择互斥 pending 文件。

Q3y / CODE-QUALITY-84 已完成 `inventory-menu.ts`、`inventory-menu.test.ts`、`inventory-menu.boundaries.test.ts`、`inventory-menu.glm-phase1-leaves.test.ts` 四文件逐文件核验：完整读取实现与测试，并核对 `menu-driver`、`event-system`、`draw-inventory`、`item-select`、`game-state` 真实 caller/ownership，以及 SDLPal `itemmenu.c`/`uigame.c`/`play.c` primary source。输入、边界、role identity、状态 ownership、失败传播、异步/资源清理与公共接口未发现直接缺陷，也未触碰 schema/save、资源、生成物或用户可见行为高风险边界。定向 9 个测试文件 413 tests、game typecheck/Biome、全仓 `pnpm check`、official ratchet、protected fast、lint-zero、docs/content-review、ledger 全部通过；只关闭 4 条记录，当前 inventory 3,270：closed 348、review 9、pending 2,913。CODE53/57/79/80/81 与其它 Q3 core/present/shell/analytics/tools 文件继续保持原状态，专项仍未完成。

Q3y / CODE-QUALITY-85 已完成 `shop-menu.ts`、`shop-menu.test.ts`、`shop-menu.boundaries.test.ts`、`shop-menu.glm-phase1-leaves.test.ts` 四文件逐文件核验：完整读取实现与测试，并核对 `menu-driver`、`bootstrap`、`event-system`、`game-state`、`sell-menu`、`draw-shop` 真实 caller/ownership，以及 SDLPal `uigame.c`/`itemmenu.c`/`play.c` primary source。买卖状态机、价格门、环绕导航、确认/取消、交易意图与菜单恢复未发现直接缺陷，也未触碰 schema/save、资源、生成物、公共接口或用户可见行为。清理两处测试质量残留（dead touch import 与恒真 clone 自比），补为真实 catalog 不变性 oracle。定向 11 个测试文件 408 tests、game typecheck/Biome、全仓 `pnpm check`、official ratchet、protected fast、lint-zero、docs/content-review、ledger 全部通过；只关闭 4 条记录，当前 inventory 3,270：closed 352、review 9、pending 2,909。相邻 transaction/inventory capacity 与 CODE53/57/79/80/81 继续保持原状态，专项仍未完成。

Q3y / CODE-QUALITY-86 已完成 `equip-menu.ts`、`equip-menu.test.ts`、`equip-menu.boundaries.test.ts`、`equip-menu.glm-phase1-leaves.test.ts` 四文件逐文件核验：完整读取实现与测试，并核对 `menu-driver`、`equip-effect`、`equipment-state`、`game-state`、`draw-equip` 真实 caller/ownership，以及 SDLPal `itemmenu.c`/`uigame.c`/`play.c`/`script.c` primary source。装备过滤、role ID 映射、环绕选人、取消阶段与换装意图未发现白名单生产实现直接缺陷。清理测试中的 `as never`/空 party 输入并补齐完整 typed Item/PlayerRoles fixture。定向 12 个测试文件 127 tests、game typecheck/Biome、全仓 `pnpm check`、official ratchet、protected fast、lint-zero、docs/content-review、ledger 全部通过；只关闭 4 条记录，当前 inventory 3,270：closed 356、review 9、pending 2,905。相邻 dispatcher/equip-effect/inventory-state 与 CODE53/57/79/80/81 继续保持原状态，专项仍未完成。

Q3y / CODE-QUALITY-87 已完成 `in-game-menu.ts`、`in-game-menu.test.ts`、`in-game-menu.boundaries.test.ts`、`in-game-menu.glm-phase1-leaves.test.ts` 四文件逐文件核验：完整读取实现与测试，并核对 `menu-driver`、`game-state`、`draw-menu` 真实 caller/ownership，以及 SDLPal `uigame.c`/`ui.c` primary source。真实 WORD id/label、cursor memory、环绕导航、confirm/switch phase 与错 phase 合同均未发现白名单缺陷。补强确认重置、按 id mapping、词表隔离和开关初始化测试 oracle。定向 7 个测试文件 74 tests、全仓 `pnpm check`、official ratchet、protected fast、lint-zero、docs/content-review、ledger 全部通过；只关闭 4 条记录，当前 inventory 3,270：closed 360、review 9、pending 2,901。相邻 save/load/audio/quit 与 CODE53/57/79/80/81 继续保持原状态，专项仍未完成。
Q3y / CODE-QUALITY-88 已完成 `magic-select.ts`、`magic-select.boundaries.test.ts`、`magic-select.glm-phase1-leaves.test.ts` 与组合 `__tests__/item-magic-select.test.ts` 四文件逐文件核验：完整读取实现/测试，并核对 `in-game-magic-menu`、battle-system magic builder/input、draw-magic/draw-battle-ui、primitives、shared types、extractor/player-role parser caller/ownership，以及 SDLPal `magicmenu.c`/`uigame.c` primary source。object-id 排序、Spell→Magic 成本连接、MP 边界、缺失关联、空槽/名称回退、disabled cursor 与输入隔离均未发现直接生产缺陷；修正非法最小 fixture 与旧局部 id 断言。定向/相邻 10 个测试文件 261 tests、3 针隔离反控、game typecheck/Biome、全仓 `pnpm check`、official ratchet、protected fast、lint-zero、docs/content-review、ledger 全部通过，ratchet 基线保持。只关闭 4 条记录，当前 inventory 3,270：closed 364、review 9、pending 2,897。shared `tables.ts` 旧 Spell.id 注释风险保留 pending；in-game-magic/battle/present 生产文件未随本批关闭，专项仍未完成。
Q3y / CODE-QUALITY-89 已完成 `in-game-magic-menu.ts`、三份状态测试逐文件核验：完整读取实现/测试，并核对 `menu-driver`、runtime hydrate/project、`magic-script`、draw caller 与 SDLPal `uigame.c`/`magicmenu.c`。施法人/法术/目标 phase、单人快速道、非顺序 party role id、取消、光标记忆、MP refresh、outside battle filter 与 script/MP ownership 未发现直接生产缺陷。清理三份测试不完整 `as unknown` fixture，并补齐 battle-only Magic 关联；定向/相邻 9 个测试文件 158 tests、白名单 3 files / 37 tests、3 针隔离反控、game typecheck/Biome、全仓 `pnpm check`、official ratchet、protected fast、lint-zero、docs/content-review、ledger 全部通过，ratchet 基线保持。只关闭 4 条记录，当前 inventory 3,270：closed 368、review 9、pending 2,893。script/MP caller、battle magic、draw 与 shared Spell 类型保持原状态，专项仍未完成。
Q3y / CODE-QUALITY-91 已完成 `inventory-action-menu.ts` 与两份状态测试逐文件核验：完整读取实现/测试，并核对 `menu-driver.ts:459-503,605-651`、`game-state.ts` cursor ownership、`primitives.ts`、`draw-menu.ts` 与 SDLPal `uigame.c:878-919`、`ui.h:80-81`、`play.c:244-359`。装备/使用顺序、WORD 22/23、static cursor 记忆、默认 cursor 上界、两项环绕、WORD table 文案和空 selection 防御均有直接 caller/oracle；未发现白名单直接生产缺陷，也未修改实现文件。定向/相邻 5 files / 85 tests、4 针隔离反控（初次等价 Down→Up 变异已撤销）、game typecheck、Biome、全仓 `pnpm check`、official ratchet、protected fast、lint-zero、docs/content-review、ledger 全部通过；ratchet 基线未变化。CODE-QUALITY-91 只关闭上述三条记录，当前 inventory 3,270：closed 371、review 9、pending 2,890。`menu-driver`/`inventory-menu`/`equip-menu`/`draw-menu` 与 CODE53/57/79/80/81、CODE90 仍保持原状态，专项仍未完成。

Q3y / CODE-QUALITY-90 phase1 magic revive 行为切片进入 review：`magic-script.ts` 漏调用 status removal 已经先红后绿修复，单体/全体清 `<=999`，保留 `>999` 武器/装备效果；31 定向与 518 相邻 tests、game typecheck/Biome、full check/lint4022零诊断通过，ratchet 原命令重试完整通过并提升6项基线，protected fast 超时按原命令重试，最终回执待续。两份文件完整读取后仍有完整 script-chain、unsupported-op/input/step-limit 与测试精简/fixture/隔离项待核，**不按行为切片或包级全绿关闭文件**；只登记两条 review。当前 inventory3,270：closed371、review11、pending2,888；CODE53/57/79/80/81 和其它 pending 继续原状态，二阶段显式 grantedStatuses/status 模型未动。

2026-10-14 最新主线同步到 `5116cd5bb`：保留 RNG 功能任务与静态音频分包，新增 RNG 测试只计pending；event-system 最新机制改动保守重开review，旧CODE3r结论留作历史。机器库存3271：closed370/review12/pending2889。CODE90修复检查点d7e9831f4已推送但仍review；旧基点门/失败原件保留，最新集成基点质量门须重跑，不以同步或包级全绿自动关闭任何文件。

同一文件同一时间只有 Codex 作为 Coding Owner；Q2–Q6 不能因为清单已生成就自动进入 build。每个批次闭合问题
清单后停止，跑定向/相邻测试、受影响 typecheck、Biome 零诊断，再按风险串行全仓 `pnpm check` → 官方 ratchet →
受保护 strict；不借测试候选或历史门替代独立验收。

## 首批结论（Q1 / Q1b）

`packages/shared/src/rle.ts:61-100` 对 header、source 游标、literal/透明段边界缺少显式失败；strict sprite container 的
`command === 0/0x80` 仍拒绝无像素进度命令。通用 `decodeRle` 则保留 PAL 帧 framing 中的 0/0x80 no-op，只要后续指令
能填满帧；源流耗尽或段越界时显式失败。真实 callers 为 game tileset/dialog 资源、pal-extract 资产导出和 reforge
资产加载；本批没有改变合法帧结果或资源格式。

Q1b 复核了 editor PAL project-reference census：`379304503` 将历史总数更新为 22,666，随后
`66676dc9f` 增加 `projects/pal` 场景状态字段后，当前 collector 的直接结果变为 22,663；同一漂移同步影响
blockers、behavior-reference edges、compact rows/target edges（4,353 / 4,448 / 25,196 / 28,092）。本批只更新
过期测试 oracle，不改 collector、项目内容或 UI。Q1/Q1b 的完整 check、官方 ratchet 和 protected fast 已通过；
这只关闭首批问题，不关闭 Q2–Q6，也不代表全仓逐文件治理完成。

Q2 的 MKF/RNG 子批已完成：真实 raw 的 2,373 个 chunks 与 1,464 个 RNG frames 通过新边界检查，完整 check、
official ratchet、protected fast 和 lint 全绿。剩余 YJ2、resources、tables 仍保持待核，下一批从 Q3 phase1
extract/game 开始。

验证完成前本节不标“已验证”；完整质量门与全仓逐文件治理仍未完成。
