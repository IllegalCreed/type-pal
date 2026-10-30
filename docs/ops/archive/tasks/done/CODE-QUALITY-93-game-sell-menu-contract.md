# CODE-QUALITY-93 — game sell menu state contract

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game core/menu
Capability: sell menu navigation, sellability gate, confirmation and refresh lifecycle
Visual Verification Timing: N/A（本批未改 UI；相邻像素合同已跑，不宣称浏览器现场视觉验收）

## 范围与前提

白名单仅：

- `packages/game/src/core/menu/sell-menu.ts`
- `packages/game/src/core/menu/sell-menu.test.ts`
- `packages/game/src/core/menu/sell-menu.boundaries.test.ts`
- `packages/game/src/core/menu/sell-menu.glm-phase1-leaves.test.ts`

单一 Coding Owner 为 Codex。本批只做逐文件语义核验和测试夹具清理，不改变生产行为、公共接口、schema/save、资源或用户可见形态；CODE-QUALITY-85 已核验 shop buy/transaction，本批只收其明确留出的 sell-menu 四文件。

一句话前提：卖菜单必须按 SDLPal `PAL_SellMenu`/`PAL_ItemSelectMenu` 的全库存列表、sellable 与 `amount > amountInUse` 确认门、默认 No、单件半价交易意图、取消返回和卖出后游标刷新推进；菜单状态不能直接拥有 cash/inventory 交易。

| 方向 | 直接证据与判断 |
|---|---|
| primary source | `reference/sdlpal/uigame.c:1755-1789` 的 `PAL_SellMenu` 循环；`reference/sdlpal/itemmenu.c:287-310,331-377` 的全库存列表、sellable/inUse 确认门与游标；`reference/sdlpal/global.c:1063-1172` 的库存 helper。 |
| 第一阶段 | `sell-menu.ts` 四份白名单文件；`menu-driver.ts:349-435` 的真实 dispatch/transaction/refresh caller；`bootstrap.ts:1236-1249`、`event-system.ts:204-209,804-819,2192-2206` 的菜单入口；`draw-shop.ts` 与 shop/present tests 的渲染 oracle。 |
| 当前二阶段 | N/A；本批只覆盖 phase1 `packages/game` 运行时。 |
| 目标 | 证明 sell menu factory/navigation/confirm/cancel/refresh 的合法输入、边界、错误传播、状态 ownership、隔离和公共函数合同；未知项保持 review/pending，不以包级全绿替代逐文件证据。 |

## 逐文件核验计划

- 完整读取四个白名单文件；读取真实 `menu-driver`/`bootstrap`/`event-system`/`draw-shop` caller、GameState inventory/cash ownership、公共出口和相邻 inventory/shop 类型。
- 对照 SDLPal primary source；核验非卖物仍显示但确认 no-op、`count === inUse` 拒绝、合法剩余量、空/缩表游标、confirm/list 取消和半价交易意图。
- 测试只接受直接执行 public function 或真实 dispatcher 的判别性合同；不以覆盖率、数量或恒真断言关闭文件。

## 发现与停止线

- 未发现需要 schema/save/migration、生成物/资产管线、公共接口或用户可见行为改变的风险；因此没有实现修复或产品取舍。
- 若后续发现交易 ownership、重复库存条目、异步 catalog 或 UI 形态与第一阶段真值不一致，另开高风险卡，不在本批猜测修复。

## 上下文与反证

- 开批基点 `origin/main=cddf65557e60619e40e38168b276cf01981a106a`，隔离 worktree `/Users/zhangxu/illegal/type-pal-quality-3x`，治理分支 `codex/code-quality-3y`，开批 0 behind / 80 ahead。
- 忠实还原边界：`CLAUDE.md`、`docs/phase1/engineering-notes.md` §1.5/§2.1；game-mechanics 未提供卖菜单交易专节，本卡使用已读 SDLPal primary source，不外推成原版实测。
- 最强替代解释：卖菜单应提前过滤不可卖条目；`itemmenu.c:331-377` 全库存建表与 `287-310` 确认门直接反证。若生产入口使用另一个 picker/filter 或 cash/inventory 可在状态机中被改写，会推翻本批 ownership 前提；实际 bootstrap/menu-driver 调用已排除。
- 错误/异步/资源边界：本文件同步纯内存状态机，不启动 IO/Promise/listener；取消释放选择 id，菜单栈和脚本恢复由 menu-stack/menu-mode 拥有。未知 catalog item fail-closed，不抛出、不发交易意图。
- 旧版本兼容审查：pass；四白名单和直接调用域无旧 schema/version/upgrader 产品路径；不将状态机默认值当作旧版本兼容。
- 当前四文件只读和测试治理未触碰 schema/save/migration/资产/公共接口/玩法更改停止线；交易 apply 与 renderer 不随本批关闭。

## 验证计划

- 定向/相邻：三份 sell-menu 测试、shop/menu-driver/inventory/draw-shop 相邻合同。
- 受影响静态门：game typecheck 与四条白名单 Biome；随后全仓 `pnpm check`、official coverage ratchet、protected fast、lint-zero、docs/content-review、ledger。
- 退出码为 0 但存在诊断不算通过；不新增 ignore/exclude/强转或弱化断言。

## 推进记录

Codex：premise verified / build allowed。完整读取与 caller/primary-source 核验完成；只允许移除无必要测试强转，禁止改生产行为。复核后补充允许清理已证重复测试、按独立合同拆分用例和补强真实入口/ownership oracle；不为覆盖率堆弱测试。

## 逐文件核验记录

### `sell-menu.ts`

完整读取 139 行。`createSellMenu` 复用 `createInventoryMenu(..., 'sellable')` 的全库存快照；list 导航委托 SDLPal 8-key cursor，confirm 方向键 toggle 默认 No；`sellSelectItem` 对 catalog flag 与 `count - inUse > 0` 双门，`sellConfirm` 只返回意图并回 list，`sellCancel` 分层返回，`refreshSellGrid` 重新快照并 clamp cursor。未发现输入、边界、错误传播、异步/资源清理或公共接口缺陷。

### `sell-menu.test.ts`

完整读取原 142 行及最终改动全文。使用真实 `createInitialGameState` 与 public state functions，覆盖全库存显示、不可卖 no-op、合法选择、导航/confirm toggle、意图收尾与卖光缩表。移除 `flags` fixture 的不必要 `as ItemFlags` 强转；无行为变化。

### `sell-menu.boundaries.test.ts`

完整读取原 112 行及最终改动全文。覆盖 `count === inUse` 拒绝、仍有剩余时确认、confirm 期 Page/Home/End 不改 grid、空/等长/增表刷新、游标与库存快照不别名、No 意图状态收尾（cancel 合同归主测试）。移除完整 Item fixture 的不必要 `as unknown as Item` 强转；无行为变化。

### `sell-menu.glm-phase1-leaves.test.ts`

完整读取原 77 行及最终改动全文。保留空库存/缺 slot 和真实确认态重复选择、list-phase 重复确认合同；直接改 phase 的构造改为公共 sellSelectItem/sellConfirm 入口。缩表 clamp 与主测试完全同合同，已删除重复；fixed filter 断言归主测试。

## 生产 caller / primary source 核验

`menu-driver.ts:349-435` 完整读取 sell dispatch、live cursor、confirm intent、`applyShopTransaction` 与 refresh ownership；`bootstrap.ts:1236-1249` 读取菜单 handler；`event-system.ts:204-209,804-819,2192-2206` 读取 0x0027 modal waiting/resume；`game-state.ts` inventory/cash ownership、`inventory-state.ts` add/remove helper、`draw-shop.ts` sell overlay 与其 L12 tests 已读。SDLPal `uigame.c:1755-1789`、`itemmenu.c:287-310,331-377`、`global.c:1063-1172` 逐段对照。未发现必须停线的 schema/save、迁移、资产、公共接口或用户可见行为分歧。

## 当前验证结果

- 定向与相邻：9 个测试文件、96 tests 通过。
- 全仓 check 首次在 docs 导航门失败：新增 evidence 目录未加入导航，业务测试未执行；原件 gate-check-docnav-failure 保留。已补导航后按原命令重跑，不弱化门。第二次在 content-review SHA 漂移门失败（新增 evidence 导航审阅记录未同步），业务测试未执行；原件 gate-check-content-hash-failure 保留。已完整读导航并同步 SHA 后再重跑。
- 受影响静态门：`@type-pal/game` typecheck 通过；四条白名单 Biome 通过且无诊断。
- 全仓质量门、official ratchet、protected fast、lint-zero、docs/content-review、ledger 结果写入 `docs/ops/evidence/CODE-QUALITY-93/` 后再允许归档。

- 3 个隔离精确反控：inUse 等值误放行、确认继承上轮 Yes、增表游标误归零；每针绿→恰一指定业务 AssertionError→恢复绿，源/测试/重建 mutant hash、执行身份/退出码/signal、raw JSON 与精确临时树清理见 mutation-raw。
- 测试复核：删除 GLM 重复缩表、纠正状态机测试冒称渲染红色/driver层、去强转；分开确认门/confirm 导航/等长刷新/空刷新/增表输入轴，非零 cursor 和逐操作断言避免反向操作抵消；用合法数量 7 替换 snapshot 777 以避免伪造业务域。

## 剩余与交接

- `menu-driver.ts` 交易 apply、`inventory-state.ts` 容量/装备占用、`draw-shop.ts` 视觉形态与其它 Q3 core/present 文件不因本批自动关闭；如需修复另开不重叠卡。
- CODE-QUALITY-53/57/79/80/81/90 与其它 pending/review 文件保持原状态。
- 无下一位 Agent 提示词；同一 Codex 继续从最新 ledger 选择下一组不重叠 pending 文件。

## 阶段检查点（2026-10-14）

- 定向/相邻 96 项、game typecheck、白名单 Biome、3 针反控、文档预检与 lint-zero 4045/0/0/0 已通过；全仓 check 正在 editor，official ratchet/protected fast 尚未运行。
- 本次提交为 review 检查点，四条新增记录保持 review；不视为批次收口或合 main 准入。正在写入的 gate-check 原件不进入本检查点提交，待真实 terminal exit 后补入。
- 阶段集成窗口须拆出已验收 menu 白名单，避免携带 CODE53/90 未收口生产改动。

## 全仓 check 已通过，coverage 两门执行中（2026-10-14）

- Review 检查点 `2399b59ec` 已推送；首次 push SSL 连接错误，原命令重试成功。再次 fetch 后 origin/main 仍 `cddf65557e60619e40e38168b276cf01981a106a`，0 behind / 81 ahead；未合 main。
- `VITEST_MAX_WORKERS=1 pnpm check` exit0：content149/1498、shared16/131、game315/3569、pal-extract71/431、reforge359/8964、editor631/4951、migrate96/739；7包 typecheck 与文档/工具门通过。最终 lint 4047 files，0 errors/warnings/infos；未出现 React act/Warning/Unhandled 诊断。原件 `gate-check.txt`、`gate-check.exit`。
- 当前正在串行运行官方 `VITEST_MAX_WORKERS=1 pnpm coverage:ratchet` → `TYPE_PAL_COVERAGE_BASE_REF=origin/main VITEST_MAX_WORKERS=1 pnpm coverage:fast`；第一门失败时不会运行第二门。工具 exec session 为 **68449**，续接必须先查询该 handle 或当前真实进程，不因观察超时或只有日志文件就重启。
- 官方 coverage 回执仍未 terminal，不计通过；四条记录继续 review，机器 inventory3271 / closed370 / review16 / pending2885。全仓治理未完成。
- 下一步：等 coverage 两门实际终态、核日志/官方 baseline、最终 lint/docs/ledger 后才关闭本四文件；提交推送批次收口后，从最新 main 拆出已闭合 menu 的独立集成候选。不得整条合入含 CODE53/90 未收口行为的分支，不再继续积累新的 pending 实现批次而跳过阶段集成窗口。

## 用户收尾边界（2026-10-14）

用户要求当前部分完成后停止，后续由 GLM 接手。Codex 完成 CODE93 与配套 CODE96 的全部门、归档与治理分支提交推送；不领取新的 pending 文件。独立 CODE94 集成候选/CODE95 fixture 修正以明确 review 检查点和 GLM 提示词交接，不在未验收前合 main。


## 最终验收与用户停止交接（2026-10-14）

Codex review accept：完整读取与直接caller/primary/oracle成立，定向相邻96、coverage工具59、quality工具37、game/七包typecheck、完整pnpm check及official ratchet和真正protected fast均exit0，无Warning/act/Unhandled诊断。protected明确核准唯一sell GLM测试3→2精确退役；731生产文件/19874fast tests、指标与ratchet新基线一致，未降低规则、ignore/exclude或生产范围。最终导航/账本/lint回执见CODE96/final-*，未通过时不得提交done。

只关闭CODE93四文件及CODE96两工具文件。当前3271/373closed/15review/2883pending；CODE95三份旧测试、CODE90两文件与其它review/pending保持未闭合。来源/最终文件SHA见CODE96/final-source-snapshot.json，原始失败回执保留，不追溯改写历史。

再次fetch后origin/main仍cddf65557e60619e40e38168b276cf01981a106a；0behind，本分支含未收口行为，未合main。用户要求本部分后停止，Codex不领取新的pending；GLM候选abf284d75已推送，独立30文件仍review、24files/241tests及typecheck/docs/lint4012零诊断通过，独立完整check/ratchet/protected尚未执行。

## 下一位 Agent 提示词（GLM）

接手CODE94/95，工作树`/Users/zhangxu/.codex/worktrees/quality-menu-integration/type-pal`、分支`codex/code-quality-menu-integration`（推送检查点abf284d75）。先fetch/status/show/ledger，完整读取AGENTS/CLAUDE/agent-workflow、board/治理总纲/逐文件账本、phase1工程经验/机制，以及CODE94/95和83–89/91/92历史卡；完整提示词在候选CODE94/95。30条仍review，先独立核typed fixture/真实caller/oracle、跑全部门再交Codex验收；不得把旧卡或源分支门当当前接收，未验收不得标done。允许白名单测试补证，不允许未知产品/public/schema/save/资产修改。

CODE93/96已经在源分支收口，按六文件白名单及相关卡/证据接收时须同时核精确退役metadata，不复制源分支整份coverage baseline，不整条合含CODE53/90的治理分支。再次核origin/main并同步至0behind，先commit/push候选，再进入阶段集成窗口；主工作树与活跃GLM/ED任务禁止覆盖。下一批仍按2–4文件或独立模块逐文件收证，未知review/pending不强关。保留原用户阶段裁决（见源CODE95提示词），输出全部真实门/账本/未修风险供独立验收。Codex当前工作到此停止，全仓goal未完成；后续heartbeat不能覆盖用户停止要求。

最终收口静态回执：docs1280 Markdown/6792links/417tasks、content-review570、quality工具37/37、lint4056/0errors/0warnings/0infos、ledger3271/373/15/2883均exit0。CODEx仅本六文件accept，未合main，后续GLM按上述提示词接手。
