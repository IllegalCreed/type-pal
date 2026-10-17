# QUALITY-BATTLE-MAGIC-PARITY-1 — pre-94 战斗模拟法术与自动防御返工

Status: review
Phase: phase1
Capability: pre-94 / CODE3m、3t 战斗机制 counter
Coding Owner: Codex（单一写入 Owner）
Generation Owner: N/A（无资源生成）
Reviewer: Codex（对照独立审计反例与一手源码；作者自测不替代后续验收）
Visual Verification Owner: Codex
Visual Verification Timing: e2e-deferred
Contributor: Codex
Branch: codex/code-quality-3y

## 目标

修复用户转交 GLM 独立审计指出的三条第一阶段分叉：模拟法术优先上次存活目标、0x66 使用运行时基础武术、敌方非伤害法术也预掷自动防御并传递防御姿。三条均先落失败反例再改生产实现；不把局部修复当作整文件或波次验收。

## 范围

- 范围内：`core/battle/magic-damage.ts`、`battle-opcodes.ts`、`actions/magic.ts`，必要的模拟选靶内部共用 helper，与本卡专属 typed 回归。
- 范围外：CODE53/79 毒键/装备伪毒、CODE80/81 调试面板、CODE90 大世界复活、ED-ENTITY-STATE、二阶段、schema/save、资产管线及既有公共入口签名。
- 注释十项及证据簿记九项另作父卡返工队列；此处只改与三个行为错误直接有关的注释，不混入纯重构。

## 前提真值门

### 一句话行为 / 工程前提

当前 TS 将模拟法术自动选靶退化为首活敌/全灭槽0；0x66 将已含装备的战斗投影当基础武术；敌方 baseDamage 非正时既不预掷也不传递防御姿。SDLPal 三处直接控制流与这些行为不同。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | 自动选靶先检查上次存活且未清槽目标，全灭返回 -1；模拟函数将 -1 继续解释为全体槽位；显式目标及 applyToAll 优先级保留 | `reference/sdlpal/fight.c:87-128,5300-5400`，源函数名与EOF已复算 |
| 原版 / primary source | 0x66 取行动者角色的裸 `PlayerRoles.rgwAttackStrength`，不是 effective getter | `reference/sdlpal/script.c:2007-2014`；`docs/phase1/game-mechanics.md:395-471` 已记录本项目差异 |
| 原版 / primary source | 敌方法术在 scriptOnUse 前按状态短路预掷 1/3 防御，不受 baseDamage 门控，成功时 frame3 | `reference/sdlpal/fight.c:4719-4768`；PAL_CLASSIC 判 paralyzed，非 CLASSIC 才判 slow |
| 第一阶段修前 | 选靶 fallback0、0x66 读 projected attackStrength、autoDefend 预掷和动画名单受伤害门控 | `magic-damage.ts:297-327`、`battle-opcodes.ts:437-468`、`actions/magic.ts:244-254,319,363-390`（基点 0e3fc84fe） |
| 当前二阶段 | N/A：只修 phase1 game；不改变 Reforge 显式装备状态模型 | 本卡白名单 |
| 本任务目标 | 恢复上述 SDL 控制流与基础属性 ownership；输入、随机抽样序、伤害/动画目标分别给出反例和正控 | 用户本条处置“二节缺陷开新卡先红例后修” |

### 反证与替代解释

- 自动选靶并非总由上游预解：0x42 可从无 target 的 battleCtx 进入，0x66 同用模拟函数；全灭 -1 在模拟函数中不是直接 no-op。须同时核伤害与动画落点，含零伤 sentinel。
- 投影已经含装备：`projectRuntimeToBattleRoles` 在攻属性上累加 equipmentEffect；不能从该值再次推导裸基础，必须读 hydrate 后的 runtime。真实 0x66 caller `performThrowItem` 注入 gs。
- 敌法术可无伤害：伤害公式门与防御预掷是两个独立控制流；只移除预掷 guard 仍会漏动画名单。若源码存在包围预掷的伤害条件，本前提应推翻；完整对应 C 分支未见该条件。
- extractor/数据解码无改动；新回归不 mock 公式、选靶、脚本 dispatch 或动画 builder，使用公开工厂与真实 runScript，RNG 为合法可记录 IO。

### 用户可见偏离

- 是否主动偏离已核真值：no；恢复本卡直接核实的 SDLPal 机制。
- before → after：投掷误打首敌/装备抬高伤害/非伤害法术漏防御 → 上次目标优先、裸基础武术、预掷及防御姿保留。
- 用户裁决：2026-10-18 当前消息明确要求三个缺陷“开新卡先红例后修”；不将其扩展为其它 UI/机制决策授权。

## 上下文锚点

已读现行 AGENTS、CLAUDE、协作流程/测试治理、文档模型、机制投掷节、父复审卡和当前相关活动卡。真实 caller 为 battle-system → performThrowItem/performMagic → runScript → dispatch；状态 ownership 核 createBattleState、hydrate/runtime 投影及 BattleCtx。现有 selectAutoTargetFrom 位于 battle-system，直接从伤害叶模块导入会形成反向依赖；本卡共用模拟法术选靶 helper 只供伤害和投掷动画，不修改大主控接口。

## 验收条件

- 合法 typed 场景：上次活目标、无效上次目标、显式/全体优先级、全灭未清槽、零伤害动画；基础武术不变只改装备/Extra、真实 runtime0；非伤害法术的预掷序、frame3、状态短路与玩家施法负控。
- 先保留生产修前的原生失败日志，再实现；每个断言对应 C 或手算 oracle，排除同义重复，不新增 skip/only/ignore/弱断言。
- 定向与相邻战斗回归、game typecheck、docs/lint/ledger/diff；全仓 check、official coverage ratchet、protected fast 按用户成本指令留大任务收尾。
- 演出本轮先验声明式帧与真实动画驱动；浏览器/视觉与统一门未实跑时保留 pending，不据单测宣布观感通过。

## 当前模式推进记录

### 进入 build 前：Codex 核定

- Coding Owner / 隔离树：Codex / `/Users/zhangxu/.codex/worktrees/quality-3y-closeout/type-pal`；基点 `0e3fc84fe5949f7ca9c3eb87b1d2a284be945f3c`，fetch 后 0 behind / 240 ahead。
- 前提核验：verified，仅上述三条；现有活动卡 Owner 均为 Codex，白名单不写其不同机制边界，无其它 Coding Owner 写入。
- 范围、设计和验收条件：agree；先红后绿，内部选靶共用、不增配置或兼容层。
- build 准入结论：Codex build allowed（用户本条明确授权，限本卡范围）。

### 进入 done 前：独立验收

- 实现/自测：本卡窄修、15定向/935相邻与五反控已测；原始红例/失败与限制见下文。
- Codex 源码窄复核已完成；统一门和视觉仍pending，不能以收到 GLM 审计或定向绿数关闭文件。
- done 准入结论：blocked（等待反例、修复、证据与统一门；不暂停父治理目标）。

## Draft: 设计与风险

将选靶政策供模拟伤害与投掷特效共同消费，防止打甲画乙。0x66 从 gs runtime 读取，真实0不回退静态或投影；缺少非生产上下文的测试需显式 hydrate，不以兼容回退掩盖。敌法术预掷名单独立于伤害名单，保持既有状态短路和每目标 RNG 抽样序。极端 WORD 溢出、脚本失败动画时序及其它旧分支不据本卡自动验收。

## Build: 实现与自测

已按先红后绿实施。原始日志与文件 SHA 置于 `docs/ops/evidence/QUALITY-BATTLE-MAGIC-PARITY-1/`，不替代旧波次缺失原件。

## Review: 审查与返工

GLM 本条 counter 使 magic-damage/battle-opcodes 的旧“未发现直接缺陷”不能继续作为当前闭合证据。父卡/账本转 review，历史原结论保留；actions/magic 原文件状态另按机器账本核定，不凭记忆增减。

## 用户验收

本卡三个窄修已授权；浏览器视觉与统一集成验收未完成。

## 交接日志

- 2026-10-18 Codex：同步主线、确认三条源级分叉并登记独占白名单；下一步落真实 caller 失败反例，后续逐项写回原件与结果。

## 下一位 Agent 提示词

无；Codex 单 Agent 持续处理本卡。父卡仍优先 pre-94 全部成果复审，随后才是 94–102。

## 2026-10-18 实施结果与限制

修前正式反例8红6绿；初版FIRE帧数误写2已在改生产前按真实builder纠正为1，初次原件保留且不作该错误oracle信用。修后15定向、37文件935相邻全绿；首次相邻3个旧fixture缺runtime失败，随后仅补runtime并保留77/223等精确伤害断言。五枚精确变异各1个业务AssertionError、零runtime error，finally恢复SHA一致。

magic-damage、battle-opcodes、actions/magic和新增内部helper已按本卡窄范围复核；battle-opcodes主测全文重读但旧any/无崩oracle未全数治理，battle-system主测沿用本会话3s全文读取且SHA相同的记录，本次只补读投掷caller/fixture，不重签整文件。五条旧闭合记录转review，新增两文件和actions/magic登记review，0新增closed。game typecheck已过；最终docs/lint/ledger与提交状态以evidence回执为准。

高风险范围限phase1战斗机制；无schema/save/生成物/规则/公开签名改动。未执行全仓check、official ratchet、protected fast（用户要求集中到大任务收尾），未实跑浏览器/视觉；声明式帧已通过真实advanceBattleAnimFrames消费。其它旧分支（极端WORD溢出、脚本失败动画、全灭normal FIRE落点）仍待专项，不能据本卡认证。完整读取/边界/primary、raw和反控工具见[本卡证据](../evidence/QUALITY-BATTLE-MAGIC-PARITY-1/README.md)。

最终合法spec在原基点三源重放为9红6绿/零runtime error suite；全灭改用attackWhole，排除C normal无目标assert输入。初次14例与初版错误帧数/raw保留，正式15例精确spec及原件另存，不覆盖历史。原始门诊断计数见本卡evidence；账本实跑3314 / 284 closed / 55 review / 2975 pending。

相邻独立counter：显式reporter发现H01单敌fixture误造缺失101警告，roster反例1红2绿后修为0xffff终止符；该测试原闭合信用也转review。新增本相邻测试为白名单最小fixture修复；此前摘要日志不作为零诊断证明，带诊断原件保留。

H01测试判别力另修一行：敌B入口ip2=end→ip3=对话；漏终态break的同一精确变异下旧绿1/新红1，生产恢复SHA一致，当前3例绿零stderr。没有增加测试数量；三机制专属五反控及本条旧绿新红分别记账。

静态收尾：game typecheck零诊断；docs工具125通过，初次完整命令因机制catalog SHA失败，补精确catalog/manifest绑定后五consumer全0 issue（不重复125工具tests）；lint5086文件0/0/0，ledger3314/284/55/2975、diff通过。完整失败/修后原件见gates.json，尚未合main。
