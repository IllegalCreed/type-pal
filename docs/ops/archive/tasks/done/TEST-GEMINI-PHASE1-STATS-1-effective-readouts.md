# TEST-GEMINI-PHASE1-STATS-1 — 一阶段有效属性与战斗状态只读投影候选回归

Status: done
Phase: phase1
Capability: 一阶段非视觉测试准备；不改玩法、格式或能力格
Coding Owner: Gemini（隔离候选）/ Codex（用户授权接手修订与正式集成）
Generation Owner: N/A
Reviewer: Codex（独立接收、质量门与收口）
Visual Verification Owner: N/A
Visual Verification Timing: N/A（只测结构化状态，不作视觉验收）
Collaboration Mode: Codex 分派、Gemini 贡献、Codex 独立验收
Branch: `codex/gemini-phase1-stats-r1`（独立 worktree，开工时从已含本卡的 main 创建）

## 目标与阶段边界

让 Gemini 连续完成一包中等复杂度的非视觉候选回归：先读真实消费者与旧测试，识别尚未被业务断言覆盖的有效属性/装备脚本及战斗检查器边界；只对现行且已核实的合同写可执行用例。候选留在隔离目录，不改正式 runner，也不凭候选数量或历史覆盖率快照报增量。

本次授权仅为 `draft` 取证和隔离候选；**没有开放产品 build、正式测试接入或 done 门**。Gemini 是贡献者，Codex 负责独立复核、决定转正、合并、全仓质量门；不等待固定三贤人签字。发生产品缺陷时先留显式诊断，不在此包顺手修产品。

## 前提真值门

### 一句话前提

第一阶段有效属性取运行时基础值与装备效果叠加，战斗状态检查器只读当前状态；本任务只补证现行且可达的行为，不调整它们。

| 维度 | 当前真值及限制 | 一手证据 |
|---|---|---|
| 原版 / primary source | sdlpal getter 为 base + 装备效果格；毒抗有截断边界。它是参考实现，不冒称原版二进制实测 | `reference/sdlpal/global.c:1736-1935`；`docs/phase1/game-mechanics.md:201-207` |
| 当前第一阶段 | 六 getter、装备效果写入/清理/重建、战内回灌均在同一模块；检查器是 dev-panel 与工具面板共享的只读投影 | `packages/game/src/core/equip-effect.ts:37-122,170-244,385-665`；`packages/game/src/core/inspect/battle-inspect.ts:1-8,136-205,319-390`；`packages/game/src/dev/dev-panel.ts:1397,1500` 与 `packages/game/src/tools/tools-panel.ts:444,482` |
| 当前第二阶段 | N/A：本包不改变 Reforge/editor 的身份或属性合同 | 范围只含 `packages/game` 的候选测试与本卡文档 |
| 本任务目标 | 自包含 typed fixture → 真实公开函数 → 完整业务结果和输入保真；未定原版政策列待证，不写成绿测 | 本卡「候选族」「验收」；旧测试 `equip-effect.test.ts`、`inspect/battle-inspect.test.ts` |

最强替代解释：fast 的 132+66 个未命中分支中有已由 full/PAL 测到的、宿主不可达的、或只是 `??` 防御臂；新增用例若只重复旧断言不会提高业务把握。能推翻当前准备范围的观察：对照旧测试精确标题/输入后没有独立合同，或真实调用者无法构造该路径。此时将族记 `existing-proof` / `no-current-caller` / `pending-contract`，不硬写用例。运行时语义、参考实现、提取数据和测试模型四种归因都须先排查；本卡不预判产品缺陷。

用户可见行为：`before -> after` 为无变化；主动偏离真值：否。若发现合同与用户所见或原版记忆冲突，停止该子项、交 Codex 复核 primary source，旧签字不适用。

## 上下文锚点与范围

- 必读 `AGENTS.md`、`CLAUDE.md`、`docs/phase1/engineering-notes.md` §1.3/§2.1/§3.7、`docs/phase1/game-mechanics.md` §攻击力/防御值由什么构成及装备/毒抗相关段；不借二阶段规则改第一阶段。
- 冻结起点：main `51d474e3`，源码 SHA-256：`equip-effect.ts` `7daa55fa6951af329a38691842fe241d2c623390823d2d69a8a8d20fddec26ea`；`battle-inspect.ts` `c8f76c397fd62af1f1bdbfefebeec781413cd29d5fcaa89ba51bfac8a7bf0bd3`。开工时重验 latest main；冻结只用于辨认漂移，不阻止 main 正常前进。
- 旧测试必须逐标题去重：`packages/game/src/core/equip-effect.test.ts`、`packages/game/src/core/inspect/battle-inspect.test.ts`，并查 `battle-opcodes.test.ts`、`battle-system.test.ts`、`event-system.test.ts` 的同域断言。既有 getter base+两格、清角色/部位、0x18→0x1A、poison clamp、敌普攻毒/灵葫值等不得换名复制。
- 最新可用 fast 快照 `coverage/fast/summary.json` 生成于 2026-09-25T05:37:55.300Z，8039 测试/641 生产文件。目标 `equip-effect.ts` 行 189/263、分支 122/254；`battle-inspect.ts` 行 95/115、分支 76/142。它只是选题依据，不是 Gemini 成果或可达性保证。
- 与 Grok 的 `present/menu`/PNG 像素候选、GLM 架构实验、Cursor 文档工作互斥；不改这些分支、公共 fixture 或官方覆盖率配置。

## 候选族（整包连续做，先去重再决定是否新增）

| 族 | 主入口 | 要查的差异，非预设正确答案 |
|---|---|---|
| E1 | 六 `getPlayer*` | Extra 格索引 6、不同角色相互隔离、毒抗 0/100 钳制；已有 base+两格断言引用而不复制 |
| E2 | `writeEquipmentEffectField` / `removeEquipmentEffect` | row/部位/角色的完整输出和无关域保真，越界与未知 row 按现行调用域分类 |
| E3 | `addPlayerStatRow` / `setPlayerStatRow` | base 与装备进行中覆盖层、非零/负向数值边界；先核 `global.c` 与现行类型，不发明溢出政策 |
| E4 | `runEquipScript` | 用真实 `setGlobalEvents`/label map 进入公开入口，区分有效链、跳转、早停/上限；不 mock 解释器主体 |
| E5 | `updateAllEquipments` | 多角色多部位重建、顺序、只清本轮归属；旧木剑、仙女剑、寿葫芦案例去重，零伪脚本 |
| E6 | `resyncBattleRoleStatsFromRuntime` | 运行时基础与有效属性回灌，而 live HP/MP 不被覆盖；与战斗已有 opcode 测试区分 |
| I1 | `collectPartyStatusReadouts` | battle/persistent 身份、五隐藏经验/状态/毒的结构化结果，队伍 slot 与 roleId 不混淆；旧综合案例去重 |
| I2 | `collectEnemyStatusReadouts` / `collectFieldInfoReadout` | 只读敌当前状态、战场有符号值和缺席态，精确去重旧攻击毒/灵葫/非战斗用例 |

不要求固定新增数量。某族没有新可证业务合同可只交 `existing-proof`；明确不可达不为抬分写非法 fixture。测试应覆盖非空正控与目标反例，核完整返回值/对应身份/无关数据保真，必要时提供真实 caller 或守卫到达见证。业务错误保留 `diagnostics/` 明确失败，不 `skip`、`test.fails` 或反转预期。

## 白名单与验证

唯一候选写入 `docs/testing/gemini-phase1-stats/**`：`README.md`、`tests/*.test.ts`、`fixtures/*.ts`、单独 `vitest.config.mts`/`tsconfig.json`、最多四组隔离单点 `mutants.mjs`、必要的显式 `diagnostics/`。不得改 `packages/**`（包括旧测试）、`scripts/**`、资源、锁文件、官方覆盖率/baseline、任务卡或看板；需要卡面纠正由 Codex 接收时处理。不要用 `as unknown as`/`ts-nocheck` 绕类型；测试运行者使用本 worktree 的真实源码。

- Gemini 自验：定向候选 JSON 测试数/失败数、相邻原测试、候选 tsc/Biome、代表性隔离负控（原树绿、单点业务 `AssertionError` 红，精确 title/file、源 hash 前后相同）。不同族的反控优先 E4/E6/I1，不为凑针数破坏多层守卫。
- 只有合同已核、去重确认且有合法 fixture 的新用例才进默认绿集合。回执逐族列 exact 旧测试标题、当前 caller/守卫、证据、候选测试名或未落原因；结论和数量从实际提交树/JSON 生成。
- 允许做同分母局部覆盖前后对照，但不得改官方报告/基线或把局部数相加报全仓收益；不跑全仓 check、ratchet、strict-fast、E2E 或真实 PAL 提取。正式集成后统一全仓门禁由 Codex 执行。

## 当前模式推进记录与交接

- Codex：2026-09-25仅授权 `draft` 隔离取证与候选；已直读两模块公开入口、消费者及旧测试目录，发现旧测试密集，因此先去重。**未批准产品实现或正式测试接入，也未预签候选 accept**。
- 用户同日明确改为“Codex 分派、其他 Agent 执行、Codex 验收”，三贤人固定签字暂休。本卡待 Gemini 交付后由 Codex 独立判断返工/接入，不因 Kimi/GLM 缺签阻断；高风险机制真值或产品取舍仍须用户裁决。
- 交接：Codex 创建本卡与互斥范围；Gemini 在独立 worktree 交连续整包，Codex 独立复核后再决定下一阶段。无产品文件修改授权。

## Codex 正式接收与 done 收口（2026-09-25）

- 用户明确 Gemini 无额度，“他如果做得不对需要你替他收尾”；Codex据此接手候选测试质量修订，不接管产品机制变更。贡献者 `64dd4cf9`、Codex候选修订 `1443d407`、正式一阶段测试 `cca91809` 分账披露。[完整接收与统一门禁](../../../../testing/gemini-phase1-stats-integration.md)。
- Codex 独立复核八族合同与旧测试差异，E2/I1/I2/E4/E5 输入/断言/全局清理问题已修；八族26项正式接入。前提仍成立：只读有效属性和检查器，不改公式、格式、产品或用户可见行为。
- `pnpm check` exit0，官方受保护 ratchet 和单次严格 fast exit0；8065项/641生产文件，无旧测试或生产范围移出，分母不变。隔离负控四针业务红、相邻41项绿。full/E2E/Q1/Q2未借本卡关闭。
- 当前委派模式下由 Codex 独立 `accept` 并核 `done allowed`；纯测试任务无用户可感知行为变化，不需重复用户技术复审。无下一位 Agent 提示词，待后续覆盖批次另行分配。

## 下一位 Agent 提示词

```text
在 /Users/zhangxu/illegal/type-pal 接手 TEST-GEMINI-PHASE1-STATS-1，任务卡 docs/ops/tasks/TEST-GEMINI-PHASE1-STATS-1-effective-readouts.md，状态 draft。你是 Gemini 隔离候选测试贡献者，Codex 将独立验收；不需要固定三贤人签字。先读 AGENTS.md、CLAUDE.md、卡内 phase1 原版/工程笔记锚点及两个目标模块和精确旧测试；开工先同步 main、核工作树与两源码 SHA，从含本卡的 main 创建独立 worktree /Users/zhangxu/illegal/type-pal-gemini-stats 和分支 codex/gemini-phase1-stats-r1，不在 main 或他人 worktree 切分支。
按卡内 E1–E6/I1–I2 连续做完整包。先逐族核真实 caller、守卫与旧标题；只对有独立价值的合同写 docs/testing/gemini-phase1-stats/** 下的 typed 自包含候选测试。真值未定、非法输入、已有同义证据如实分类，不为数字硬补。自验定向/相邻/tsc/Biome、最多四组单点隔离负控并记录 JSON 与源码 hash；不得改产品、旧测试、公共配置、资产或官方覆盖率，不跑全仓/E2E，不合 main、不标 done。发现产品失败留 diagnostics 与正控，不顺手修。
完成后提交推送分支，交候选 SHA、逐族去重与合同锚点、命令/退出码、准确测试/诊断数量、负控红因和待证清单。Codex 将独立审核，再裁定正式接入；你的自测不作独立第三方证明。
```
