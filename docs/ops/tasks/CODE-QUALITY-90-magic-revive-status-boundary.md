# CODE-QUALITY-90 — magic revive status clearing boundary

> 2026-10-20本次正式验收：本卡既定合同已由Codex接受并收口，见[pre94收口裁定](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/completion.json)。当前done只覆盖下述原卡范围，不把共享大文件或其它卡自动关闭；旧pending/review/失败按历史时点保留。

Status: done
Phase: phase1
Capability: Q3 phase1 game core/menu magic script
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: e2e-deferred
Contributor: Codex
Branch: codex/code-quality-3y

> 高风险机制卡：已完成 primary source 核验并取得用户裁决；实现必须先补失败反例，再按 SDLPal 的 `<=999` 清除边界修复。

## 2026-10-20 当前验收

当前7个大世界spell链/完整runner与真实menu caller已核；测试清双单例、7退役/3更名/1非零use新增，35最终例通过；level3阈值及use阶段旧绿新单红。

18份本轮文件记录分别列A–H，广域上下文复用原A–H并核版本/适用域；原件、主caller、原始/SDL/TS真值、反控和测试退役映射见[五卡唯一入口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/README.md)。量化初筛只指向重点阅读，不作指标验收。此前16个具体文件接受维持；本卡范围/逐项验收和保留边界已据证核定，现正式done。共享复合文件与其它卡按原范围继续review。

同一3y，唯一Owner Codex；未写主树/GLM原树，94–102不扩展。当前无新产品选择待答；既有用户runtime0/party-slot/战中禁换队/第一阶段999装备边界沿用。本批门以回执integration状态和完整原件为准；不复用历史全仓绿，覆盖率仅大批收尾。

## 目标

按 SDLPal 修复大世界单体/全体复活：清除 `rgPlayerStatus` 的 `<=999` 临时状态，保留 `>999` 武器/装备永久效果；先写失败反例，再修复 `magic-script.ts`。

## 范围

- 范围内:
  - `packages/game/src/core/menu/magic-script.ts` 的 `revivePlayerSingle` / `revivePlayerAll`
  - 对应真实 status ownership、复活 caller 与最小失败反例
- 范围外: 战斗复活、save/schema/migration、毒键寻址 CODE53/79、其它脚本 opcode。
- 明确不做: 不改变 status schema、不恢复旧 upgrader/fallback、不清除 `>999` 装备永久效果、不触碰战斗复活或 CODE53/79 poison key。

## 前提真值门

### 一句话行为 / 工程前提

SDLPal `OP_REVIVE_PLAYER` 在目标 HP 为 0 时设置复活 HP、按 level≤3 清毒，并遍历状态调用 `PAL_RemovePlayerStatus`；后者只清 `<=999`，保留 `>999` 的装备永久效果。当前 TS 只清毒，缺少 `rgPlayerStatus` 的 `<=999` 清除。

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | 单体和全体 revive 分支均在复活后调用 `PAL_CurePoisonByLevel(...,3)`，遍历 `kStatusAll` 调 `PAL_RemovePlayerStatus`; 该函数与 `PAL_ClearAllPlayerStatus` 只清 `<=999`，保留装备效果 `>999`。 | `reference/sdlpal/script.c:1052-1102`; `reference/sdlpal/global.c:2279-2308,2310-2344` |
| 第一阶段（修复前，`13229f476`） | `revivePlayerSingle/All` 只写 runtime HP 并调用 `curePlayerPoisonByLevel`，未写 `rgPlayerStatus` | `packages/game/src/core/menu/magic-script.ts:91-111` |
| 当前二阶段 | N/A；本卡只涉及 phase1 game runtime | N/A |
| 本任务目标 | 单体/全体复活清 `rgPlayerStatus` 中 `<=999`，保留 `>999` 装备状态；用真实 runtime status oracle 验证成功、活人失败、非顺序队伍与毒边界。 | 用户已于 2026-10-14 裁决；实现/31定向/518相邻/4mutation已通过，完整质量门待收口 |

### 反证与替代解释

- 最强替代解释: `rgPlayerStatus` 可能只属于战斗或 `curePlayerPoisonByLevel` 可能间接清 status；已由 game-state ownership、player-status caller 与 poison 实现反证，二者分属不同结构。
- 什么观察会推翻当前前提: primary source 的 `PAL_RemovePlayerStatus` 被证明无 `<=999` guard，或真实 caller 证明大世界 revive 不消费 `rgPlayerStatus`；当前直接源码已排除。
- 已排查替代根因:
  - runtime 语义 / 命令分类: `magic-script.ts` 明确是大世界 `uigame.c` runner；未混用 battle runner。
  - 原版 / 第一阶段理解: 已逐行对照 `script.c` 单体/全体分支。
  - extractor / 数据解码: 不涉及。
  - audit / test model: 当前既有测试只断言 HP、毒等级和 MP gate，没有 status oracle；需新增失败反例。

### 用户可见偏离

- 是否主动偏离已核真值: no（保持 SDLPal 真值；用户已批准）
- `before -> after`: 当前“复活只清毒、状态槽不动” → 复活清 `<=999` 的临时状态，保留 `>999` 装备永久状态
- 代表场景: 角色处于 sleep/confused/paralyzed 后使用还魂咒；复活 HP 成功但状态图标/行为是否立即清除。
- 用户裁决: 2026-10-14 用户批准“对齐 SDLPal”，并补充 `>999` 武器/装备 buff 不清，避免清掉武器双攻。

## 上下文锚点

- 已拍板决策 / 铁律: 发现第一阶段机制真值与用户可见行为风险必须停线；行为修复先写失败反例再实现；不降低测试/静态门；`>999` 装备 buff 不是普通临时状态。
- 代码锚点: `magic-script.ts:91-111,225-251`; `player-poison-state.ts` cure ownership；`game-state.ts:552-570,1876-1880` status runtime；`menu-driver.ts:902-937` caller MP gate。
- 已知坑 / 审计文档: `docs/phase1/game-mechanics.md:1517-1539` 明确梦蛇 `DualAttack=9` 复活清；`1453,1483` 记录 `<=999` 临时/`>999` 装备分界；装备 `32760` 由 `game-state.ts:1082-1085` 与 SDLPal guard 核定；`packages/game/src/core/game-state.ts:1078-1087` 说明持久装备状态 ownership；不要与 CODE53/79 poison key 混改。
- 不得重新引入: 只清毒冒充清状态、无失败反例直接改实现、在 battle runner 中复用大世界同步 runner、改变 MP 扣除顺序。
- 相关测试: `packages/game/src/core/menu/magic-script.test.ts`、menu-driver cov85 magic tests、player status tests。

## 验收条件（裁决后）

- 功能: 单体/全体复活清 `rgPlayerStatus` 的 `<=999`，保留 `>999`；活人/满血失败不清状态，毒 level>3 保留规则不变，MP gate 与 scriptSuccess 不变。
- 测试: 失败反例先行；真实 runtime status 数组与 renderer/caller oracle；3 个以上精确反控；相邻 menu-driver/player-status 回归。
- 质量门: game typecheck/Biome、全仓 `pnpm check`、official ratchet、protected fast、lint-zero、docs/content-review、ledger。

## 当前模式推进记录

### 进入 build 前：Codex 核定

- Coding Owner / 隔离工作树 / 修改白名单: Codex / `/Users/zhangxu/illegal/type-pal-quality-3x` / `packages/game/src/core/menu/magic-script.ts`、其专属测试、任务卡与 evidence；不得修改 schema/save、battle runner、poison key 或公共接口。
- 前提核验: verified（`script.c:1052-1102` + `global.c:2279-2344` 直接证明复活遍历 status 但只清 `<=999`；`game-mechanics.md:1453,1483,1517-1539` 记录 <=999 状态边界和 DualAttack 9 的复活清除；32760 的装备实例见 `game-state.ts:1082-1085`）。
- 范围、设计和验收条件: agree（先红反例，再最小实现；单体/全体/活人失败/非顺序队伍/`<=999`/`>999`/毒边界与相邻 caller 回归）。
- 高风险用户产品裁决: 2026-10-14 用户批准 SDLPal 行为，并明确保留 `>999` 武器/装备 buff。
- build 准入结论: Codex build allowed（仅白名单实现与测试；未完成独立验证前不得标记 done）。

## 本轮实现与验收记录（2026-10-14）

- 完整读取：`magic-script.ts`、`magic-script.test.ts`。核对 SDLPal `script.c:1052-1102` / `global.c:2279-2344`、`game-state.ts` 状态 ownership、`event-opcode-player.ts:170-204` 同类复活实现，以及 `menu-driver.ts:902-937` success/MP caller。
- 修改：仅在已确认 HP==0 的单体复活臂追加 `rgPlayerStatus[roleId]` 的 `<=999` 清除；全体复活沿用同一函数。活人路径不清状态，`>999` 装备状态、poison level>3、MP ownership 不变。
- 先红后绿：新增单体、活人失败、全体三例；实现前 2 failed / 29 passed（活人反例已通过），实现后 31/31。新增场景使用真实 GameState，party `[2,0]`，覆盖 999/1000/32760 与 party 外角色隔离。
- 相邻回归：8 files / 518 tests；game typecheck、两文件 Biome 通过。
- 4 个隔离精确 mutation：漏清理、999 误留、1000 误清、错误按 party position 寻址；各恰好 1 个业务 AssertionError，恢复绿、源码哈希一致，无运行时错误。
- 已完成全仓 `pnpm check`：content149/1498、shared16/131、game314/3555、pal-extract71/431、reforge359/8964、editor631/4951、migrate96/739；全包 typecheck 与 lint4022、0 errors/warnings/infos 通过。
- official ratchet：第一次恢复实跑因 pal-extract 五个 CLI 5000ms 超时失败，原件保留 `gate-ratchet-timeouts.txt`；原命令重试全部通过（731源文件/19860tests，总体89.93/83.66/89.50/91.82）。官方基线提升6项、范围变化2项，仅 game 新增3个复活合同与实现覆盖变化；其它包指标/范围未变化。
- check:fast（历史误标protected fast，已撤回）：默认并发两次因相同4个 pal-extract CLI 5000ms 超时失败，输出与exit1回执分别保留 `gate-protected-fast-timeouts*`。按已安装 Vitest 4.1.7 的官方 `VITEST_MAX_WORKERS=2` 接口限制文件并发，完整重跑同一 `pnpm check:fast`；pal-extract71/431通过，但全局设2同时覆盖editor原有单worker设置，editor出现1个业务失败（`BattleSpriteLibrary.glm-m.test.tsx:170`，expected apply.disabled=false / actual=true；631 files中1 failed，4951 tests中1 failed）。失败原件保留 `gate-protected-fast-workers2-editor-failure*`。单独重放2例exit0，但有3条React act诊断，**不计干净验收**。当前改用 `VITEST_MAX_WORKERS=1` 恢复editor原有并发，并限制其它包，完整门仍待续；timeout/测试范围/断言/静态规则未改，默认并发超时和editor抖动根因仍未知。
- 高风险：第一阶段机制/用户可见行为；已在实现前完成 primary source 核验并取得用户裁决，无 schema/save/migration/资产/公共接口改动。
- 第二阶段边界：`packages/reforge/src/battle/battle-core.ts:107-111` 单独区分 `status` 与 `grantedStatuses`；`:604-624` 复活只清临时 `status`。`packages/content/src/item.ts:36,449-462` 装备 `grantStatus` 实时派生。仅用作阶段区分证据，未修改、未关闭这些二阶段文件。
- **整文件仍未关闭**：`magic-script.ts` 的完整当前 spell chain/unsupported-op/input/step-limit 合同待核；`magic-script.test.ts` 的无断言伪 applyAll 用例已改成活人状态不变 oracle，`Spell` fixture 已改为完整公共类型；poison table cleanup、其余 synthetic fixture 与完整 script-chain/input/unsupported-op/step-limit 合同仍待隔离审查。本卡只验复活行为切片，两文件登记 review，closed 不增加。
- evidence：`docs/ops/evidence/CODE-QUALITY-90/`；protected fast、最终 lint-zero、ledger 与分支提交/推送回执尚待完成。

## 最新主线同步（2026-10-14）

- 修复/复活反例/旧基点质量与失败原件已以 review 检查点 `d7e9831f4` 提交并推送 `codex/code-quality-3y`；未合 main，未闭合文件。
- 主线随后新增 `579cdf668`（静态音频 chunk）、`d24981591`（RNG 普通 redraw 清遗留帧）和 `5116cd5bb`（库存纠正）。已 fetch，在隔离治理分支合入 origin/main；合并冲突只位于账本/证据导航/审查 JSON，保留双方记录与历史，没有改主工作树。
- 完整读取新增 RNG 任务卡/124行专属测试；核源差分 event-system/game-state/vite。RNG 实现保持主线原样，未扩大其产品范围或更改其任务状态。
- 默认fast两次CLI超时、workers2 editor断言失败、verbose probe的3条act诊断都保留原件；旧基点在跑的workers1 fast因主线推进而精确取消，仅结束确认属于本工作树的5个自有进程，receipt exit130，不算通过。
- 新机器计数：3271 inventory / 370 closed / 12 review / 2889 pending。新增 RNG 测试只计pending；event-system 最新机制改动尚未做本专项整文件复核，由旧已验证保守转review，历史 CODE3r 结论保留。
- magic-script 两文件源码字节未变，但最新集成基点的定向/typecheck、full check、official ratchet、protected fast、lint-zero、docs/content-review/ledger需重新实测；此前所有全门回执明确属于旧基点，不冒充最新基点结果。

## 交接日志

- 2026-10-14 用户裁决后 Codex: 补读 `global.c:2279-2344` 与 `game-mechanics.md:1517-1539`；确认 `PAL_RemovePlayerStatus` 只清 `<=999`，`>999` 装备永久状态必须保留。Next: 先写失败反例，再实现单体/全体最小修复并跑相邻质量门。

- 2026-10-14 Codex: 只读完整读取 `magic-script.ts`/测试、menu-driver caller、runtime status ownership 与 SDLPal `script.c:1052-1102`；确认单体/全体 revive 当前只清 poison，不调用 status removal。未修改实现，未新增会失败的 tracked 测试；等待用户裁决后先加失败反例，再决定实现。

## 下一位 Agent 提示词

接手任务: CODE-QUALITY-90 magic revive status clearing boundary
任务卡: docs/ops/tasks/CODE-QUALITY-90-magic-revive-status-boundary.md
当前状态: review
你的角色: Codex 验收者，继续本行为切片的质量门与提交；不得把整文件 review 改已验证
先读: AGENTS.md、CLAUDE.md、docs/phase1/game-mechanics.md:1453,1483,1517-1539、SDLPal script.c:1052-1102 / global.c:2279-2344、magic-script.ts/测试、evidence/CODE-QUALITY-90/
已完成: 单体/全体仅阵亡角色清 <=999、保留 >999 装备效果；先红2失败/29通过后绿31通过；518相邻tests、4精确mutations、game typecheck/Biome、full check与lint零诊断均通过
请你做: 先核最新 origin/main 5116cd5bb 及治理分支同步；最新基点重新跑定向/typecheck/full check/official ratchet/protected fast与最终静态/文档/ledger；旧基点的 official ratchet 完整通过回执（首次5个CLI超时保留原件）；检查 protected fast workers=1 当前完整回执；两次默认CLI超时与workers2 editor失败均保留exit1原件；editor probe虽两断言绿但有3条act诊断，不能accept 与最终lint/docs/content-review/ledger；证据补齐后收行为任务并commit/push治理分支
整文件剩余: magic-script全script-chain/input/unsupported-op/step-limit；测试无断言伪用例、Spell fixture、poison table隔离。两文件保持review，不增加closed
下一批候选: 先完整审 magic-script 两文件未闭合项，或不重叠 sell-menu.ts 与三份专属测试；已对 sell-menu 四文件只读，不等于已完成核验
不要做: 不清 >999；不改phase2 grantedStatuses模型、schema/save、battle runner或poison key；不混入主工作树改动；本分支含其它未收口治理卡，禁止直接合main
输出要求: 定向与全仓门实际回执、直接oracle/反控、账本3271inventory/370closed/12review/2889pending与分支ahead/behind；尚有失败时继续review，不宣称专项完成

## 当前验证与门纠错补充

最新集成源基点7a93336c6（包含origin/main588790383）：9 files / 522定向相邻tests、game typecheck和完整pnpm check已通过（worker1；game315/3559，editor631/4951，migrate96/739，lint4031/0/0/0）。真正protected fast是TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast，先前pnpm check:fast不能替代，原件保留且不计此门。CODE92已对Code83–89/91的30条记录开当前counter，机器账本暂为3271/340closed/42review/2889pending，待真实门通过与30/30已证源码一致性一起恢复。CODE90两文件仍review，不因工程门纠错而关闭。

### 新增复活反例的输入合法性复核

- SDLPal `global.h:175-195` 的法术脚本指针为 WORD；pal-extract `resources/parsers/spells.ts:141-142` 用 u16 读取。新增 applyAll 反例原用77779超出该域，已仅改为合法合成入口504，业务输入、assertion与生产实现不变。
- 新夹具重新实测31/31；隔离去清理反控仍恰好2个业务AssertionError，4针精确身份反控均baseline绿/mutant单业务红/restored绿，源码未动。新原件见 `mutation-raw-legal-script-id/` 与 `mutation-legal-script-id-result.json`；旧77779原件保留为历史，不替代合法输入的新证明。
- 这次只纠正新增反例的合成script id，不代表既有测试已全部合法：77777/77778、99999、无断言伪applyAll、Spell fixture和poison teardown仍留整文件review。
- 主线文档发布收口已在隔离治理分支合入 `cddf65557`，不触碰主工作树，不将RNG专项done扩大为event-system整文件关闭。


### 2026-10-14 测试合同与最新 ratchet 复核

- 将原错误调用 `L_39554`（0x1B 治疗）且 `void ok` 的全队复活用例改成合法 `L_504`（WORD 脚本入口）并断言全队存活时返回 false、临时/装备状态均不变；`mkSpell` 现在完整满足 shared `Spell` 公共类型，不再用 `as unknown as Spell`。定向 `magic-script.test.ts` + `magic-script.glm-next-wave.test.ts` 为 41/41，game typecheck、Biome 均通过。
- 合法 script-id mutation 重新执行：31/31 基线通过；去清理变异恰好2个业务 AssertionError；MUT-01..04 均 baseline绿、mutant单业务红、restored绿，源码/仓库字节未变。
- 最新官方 `VITEST_MAX_WORKERS=1 pnpm coverage:ratchet` 完整跑完 731 files / 19,864 tests，但仍 FAIL，未更新 baseline：game `13805/15602` statements、`12333/13685` lines；total `70847/78780` statements、`63303/68945` lines，分别低于旧基线 `13806/15599`、`12332/13682`、`70848/78777`、`63302/68942`。原始日志与 exit1 见 `evidence/CODE-QUALITY-90/gate-ratchet-current.txt`。
- 覆盖诊断不是门通过：当前源移除 RNG 测试为 3527 tests，game `13804/15602` statements；d7 exact/default 源快照重放均为 `13801/15599`，说明旧 d7 基线的 `13806` 在当前同一 V8 环境不可重现；没有因此降基线、加弱测试或改 exclusions。RNG guard 去除反控仍按业务断言失败，恢复绿。结果见 `rng-test-scope-diagnostic-result.json`、`rng-coverage-diagnostic-result.json`、`d7-exact-replay-result.json`、`d7-default-replay-result.json`。
- 本轮只改善测试合同，不改变生产实现、coverage baseline、规则或 ledger 状态；两文件仍 `review`，closed 不增加。


- 追加四条真实 runner 合同：0x1C applyAll、0x1C 单体无变化失败、0x1D applyAll、0x1D 单体无变化失败；另有脚本表越界与复活 0xFFFF 哨兵反例。它们覆盖了完整 magic-script 的剩余语句合同，而不是为覆盖率堆空断言；targeted 41/41，magic-script 独立 coverage source statements/lines 110/110、94/94。


### 2026-10-14 ratchet 收口

- `VITEST_MAX_WORKERS=1 pnpm coverage:ratchet` 在边界合同加入后 exit 0：731 production files / 19,870 fast tests；game 3537 tests，`13812/15602` statements、`9064/11373` branches、`12336/13685` lines；total `70854/78780` statements、`51557/61618` branches、`63306/68945` lines。
- 官方工具只升不降地更新 `scripts/coverage/baseline.fast.json`（SHA-256 `aabca727e834ab4f3c5700ca940208a78a7cc81ee60c8fb4eaa866efd4dc15ce`），提升6个指标、范围变化2项；没有降阈值、加排除或手工拼 baseline。原始 receipt：`evidence/CODE-QUALITY-90/gate-ratchet-after-boundary.txt`。
- 这只完成 official ratchet；真实 protected fast 需在该新 baseline 推送后重跑。两文件仍 `review`，closed 不增加。


### 2026-10-14 最终 workspace check

- `VITEST_MAX_WORKERS=1 pnpm check` exit 0：content149/1498、shared16/131、game3565、pal-extract71/431、reforge359/8964、editor631/4951、migrate96/739；全包 typecheck/test 与严格 docs/content-review 通过。
- 最终 `lint-zero` 为 4041 files，0 errors / 0 warnings / 0 infos；原始全仓日志见 `evidence/CODE-QUALITY-90/gate-check-after-boundary.txt`。CODE90 两文件仍 review，因为本卡只覆盖行为切片和当前 runner 合同，完整文件审查未结束。


## 2026-10-20 原卡合同正式收口

大世界复活状态边界及runner与测试质量补审。第一阶段≤999临时状态清除、>999装备效果保留的用户裁决和四项历史精确反控仍成立；当前七条法术链与真实菜单caller已核验。三个文件八维已接受，合法WORD/Spell夹具、双单例清理、七项弱/非法合同迁移、三项更名和一个use阶段合同均有映射与反控。35项定向、菜单相邻、typecheck及全仓门均通过且诊断为零；三个已关闭文件不重复计数。

保留范围：公共cost/caster参数按既有接口冻结要求保留，可选参数精简不阻断本卡。毒槽压缩与其它机制问题仍归CODE53及对应候选；不把一阶段回合数规则套到二阶段装备来源字段。

Owner/Reviewer Codex。本轮核对原卡验收条件、有效八维记录与实际原件，复用仍匹配的审查和测试；当前产品及测试源码相对ea9c3cc02没有变化。文档/索引/账本门本次另实跑，见completion.json.checks。无下一位Agent提示词，Codex继续剩余pre94。
