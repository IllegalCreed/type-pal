# ARCH-F2-CURSOR-BATCH-1 — 24组命令族与设计系统模块整理

Status: rework
Phase: phase2 editor / 架构治理 F2
Coding Owner: Cursor
Review / Integration Owner: Codex
Base / production freeze: `0cb32631`（从包含本卡的最新origin/main创建隔离分支，实际起点落回执）
Branch: `codex/cursor-architecture-batch-r1`
Worktree: `/Users/zhangxu/illegal/type-pal-cursor-architecture-batch`
Visual Verification Timing: dev-functional（Codex最终核验）

## 授权与目标

2026-09-26用户要求剩余架构治理连续完成，并明确要求给Cursor大量任务。本卡一次授权24组连续实施，
不逐组等待签字。Cursor独占下列`commands.ts`/`controls.tsx`切片；Codex在其它文件推进E2/A3等高风险任务。
目标是把领域实现归到可直接测试的模块，旧入口保持同一构造器/函数/类型。默认值、错误文案、DOM、ARIA、
键盘/焦点、草稿提交和撤销时点均保持；不新增功能或重新设计UI。

直接前提：当前commands约4282行、战场族已迁出；其余类按实体领域排列且有既有命令/引用回归。
controls约2420行，已有overflow-text/status-values独立模块可作组织参考。本文行号为`0cb32631`源码锚，
开工按符号重定位。反证：新模块runtime回引旧barrel、旧入口身份变化、共享helper改变含义、DOM/事件顺序漂移。
出现反证时只隔离该组，继续其它已授权组并报告；不得为凑24组硬拆。

## 连续实施队列

| 组 | 现行边界/符号 | 新模块（core或design-system同目录） |
|---|---|---|
| C00 | `Command`协议及被多族使用的`BattleDataInUseError`；仅当前类型/错误身份 | `command-contract.ts`、`battle-data-command-errors.ts`；commands旧出口保留 |
| C01 | WorldVariableInUseError、Add/Update/DeleteWorldVariable（:116–240） | `world-variable-commands.ts` |
| C02 | withEnemy、EnemyPatch、Update/Add/DeleteEnemy（:2196–2313） | `enemy-commands.ts`，共享错误从C00导入 |
| C03 | UpdateEnemyTeams、withEnemyTeam、Add/Update/DeleteEnemyTeam、EnemyTeamInUseError（:2314–2423） | `enemy-team-commands.ts` |
| C04 | withItem、Add/Update/DeleteItem、ItemInUseError（:2032–2181） | `item-commands.ts`，不改私有脚本身份策略 |
| C05 | withSkill/SkillPatch、Update/Add/DeleteSkill（:2695–2746、:2916–2990） | `skill-commands.ts` |
| C06 | PoisonPatch/withPoison、Update/Add/DeletePoison（:3136–3186、:4223–末尾） | `poison-commands.ts` |
| C07 | AmbiencePatch、Update/Add/DeleteAmbience、AmbienceInUseError（:4114–4222） | `ambience-commands.ts` |
| C08 | nextShopId/appendShop、Update/Add/Duplicate/DeleteShop、ShopInUseError（:3522–3677） | `shop-commands.ts` |
| C09 | UpdateLocale、UpdateLevelUp、RenameProject（:2424、:2616、:2991） | `locale-commands.ts`、`level-up-commands.ts`、`project-name-command.ts`，分别保留领域边界 |
| C10 | UpdateAssetLabel（:2459–2504） | `asset-label-command.ts`；只移动label元数据命令，禁止扩张到二进制增删替换 |
| U00 | classes、describedBy、纯尺寸/字段协议等真正共享底层 | `control-utils.ts`、必要的`control-types.ts`；不得runtime回引controls |
| U01 | DsPressable/DsButton/DsActionLink（:34–111） | `buttons.tsx` |
| U02 | DsTooltip/DsHelpTip（:112–257） | `help-tips.tsx`，原浮层/监听清理原样 |
| U03 | DsIconButton（:258–297） | `icon-button.tsx`，依赖buttons/help-tips而非controls |
| U04 | DsFileInput/DsFilePicker/DsRangeInput/DsColorInput（:298–344） | `native-inputs.tsx` |
| U05 | DsFieldGroup/DsField/DsControlGroup与关联类型（:345–472） | `field-layout.tsx` |
| U06 | draftSource/useDsDraftController及草稿文本/多行控件 | `draft-input-state.ts`、`draft-text-inputs.tsx`，数字组复用同一状态协议 |
| U07 | 数字步进、numericAttribute/steppedDraft、ref保护、普通/草稿数字输入（:720–1003、:1125–1226） | `number-inputs.tsx`，不改解析/失焦/按键时点 |
| U08 | Text/DraftText/Number/DraftNumber/TextArea/DraftTextArea/Select的Field外壳与DsTextInput/DsTextArea | `text-inputs.tsx`、`field-controls.tsx`；单向依赖U05–U09 |
| U09 | DsOption/DsSelect及其搜索/虚拟窗/邻近Tab算法（:1408–2003） | `select.tsx`；焦点、Portal、搜索和禁用项语义不变 |
| U10 | DsCheckbox/DsRadioGroup/DsSwitch（:2043–2129） | `choice-controls.tsx` |
| U11 | DsListHeader与Action/MenuItem类型（:2150–2299） | `list-header.tsx` |
| U12 | DsTabs/DsTabItem、DsCard、DsStatus/DsEmptyState | `tabs.tsx`、`card.tsx`、`feedback.tsx`，按组件职责分文件 |

C00→C01…C10顺序实施。UI先U00→U01/U02→其余；U06/U07/U08/U09按实际依赖排序，不能为照表顺序造循环。
`commands.ts`/`controls.tsx`保留全部现有公开出口；留下其它领域实现本轮不动。`index.ts`只在必要时做等价
重导出/类型出口校正，不直接改业务消费者导入。旧战场/overflow-text/status-values模块不重开。

## 写入白名单与禁止项

- 可改`packages/editor/src/core/commands.ts`和`ui/design-system/controls.tsx`中上表符号、相应import/re-export；
  新建上表模块及同目录命名测试。若发现共享helper超出表中范围，列出具体消费者，优先保留原模块边界或
  仅将纯helper收进C00/U00；不得造传入完整App/运行时上下文的新万能模块。
- 可增补现有commands相关/controls/recipes/boundary/field-commit等测试，旧业务断言不删除不减弱。
  机械静态路径断言可以改为读取真实新生产模块，必须继续拒绝原违规反例。
- 允许adoption JSON中**真实producer文件/符号归属**的机械更新；旧政策、规则、选择器、消费者范围不变。
  adoption测试固定生产文件census可按独立列出的新增生产模块清单更新数值，不能改成宽松匹配。
- 文档仅本卡自己的交付块、`docs/testing/cursor-architecture-batch.md`与测试索引一条导航。
- 不改App/MapMode/ScriptEditor/CommandForm、edit-session/history、packages/content/reforge/game/migrate、
  CSS、schema/save/迁移/资产生成物、审计生产规则、锁文件、官方覆盖配置/排除/超时/阈值/基线。
- Cursor分支不合main、不标done、不代写Codex结论；作者自验不能替代独立接收。产品bug留独立诊断交Codex。

## 验证与交付

1. 首次记录源冻结、旧出口集合、现行测试清单；C01和U01先各做一组可运行小样，测试通过即继续，无需等回复。
2. 每个命令族对照移动前后AST/正文；仅import/导出归属变化，其余差异逐条解释。旧/新入口构造器和错误
   必须同一身份；对首次apply、undo/redo、输入快照、引用阻断使用非空合法正控。DOM组件比较旧/新路径
   SSR及实际DOM/ARIA/透传/ref/默认值，状态控件另钉Enter/blur一次提交、Escape取消、键盘/焦点清理。
3. 开发中跑定向与editor typecheck，按依赖组批跑，不逐例跑全仓coverage。收尾至少跑全editor check、
   设计系统adoption/field-commit及完整commands相邻套件、改动Biome、docs/diff。需资源时只补环境，不入Git。
4. 命令族每个关键guard/undo合同、UI每类交互至少有真实生产模块单点负控或精确既有负控证据。对照绿；
   负控恰exit1、目标文件+fullName执行、注入命中、AssertionError；Error/timeout/0执行不是有效红。
   用临时加载视图，产品hash不变；不能只mock新类然后测试自己写的坏实现。
5. 每组一提交、同一分支连续推进；最终交一个总回执，24行逐组表（已实施/既有证据/具体阻断）、
   精确SHA、白名单diff、出口/运行期图、测试与负控实际JSON、可复制命令。数字从最终树生成，旧回执勘误一并校准。
6. Codex接收后负责必要隔离UI验证、全仓check→官方ratchet→受保护严格fast，统一统计一次并集。

## 当前准入

Codex：**premise verified / build allowed**（2026-09-26）。已核上表当前符号、既有战场/标签拆分回执，
范围与Codex的E2/A3等实现文件互斥。用户已授权本整包由Cursor连续实施；固定三签暂停。
done尚未开放。无额外产品裁决：本包只保持行为的模块归属整理。

## Codex 独立接收（2026-09-26，候选d0684e78）

**counter，仅R1–R3窄返工。** [本席报告](../../testing/cursor-architecture-batch-review.md)与[见证工具](../../testing/cursor-architecture-review-witnesses.mjs)记录直接反证：三份非法fixture、C07新例未证guard、负控判据错误接受普通Error/错文件，以及旧barrel新增出口/两项格式门。

机械搬移初核接收：139命令声明保持；78控件声明只有一处显式返回类型差异，运行正文保持；32新模块无runtime回引barrel。定向344/344、recipes/reorder57/57、完整editor check313文件2813项及TC/docs通过；完整环境已由Codex补齐，不要求用户验证。没有合入候选、改官方基线或标done，不代写作者结论。用户已委托Codex完成全部验收，窄修后由Codex接续UI与统一门禁。

### 下一位 Cursor 窄返工提示词

```text
在原codex/cursor-architecture-batch-r1工作树返工ARCH-F2-CURSOR-BATCH-1，候选d0684e78，状态rework。
fetch后先git show origin/main:docs/testing/cursor-architecture-batch-review.md；只修R1–R3，不为取报告合main。
机械搬移事实已接收，不重做24组。R1：C00/C05/C10三份fixture改当前typed合法数据，先过生产守卫；
C07收窄虚称guard的标题，引用commands.test.ts真实引用阻断用例并用删除守卫单点反控验证；
各组文案/属性针与guard/undo/交互证据分栏，可复用精确既有证据，不硬造重复测试。
R2：负控实际判据钉绝对file/fullName/执行数/exit1/具名注入命中，逐failureMessage拒普通Error、
混错、超时；正控零执行不能过。加真实判据自测，复跑24针，保留/tmp JSON/log。不改Codex见证工具。
R3：旧controls barrel恢复原50出口（下层所需内部出口保留）；更正回执2值+5类型误写；
修module-mutants.mjs与text-overflow-adoption.json格式门，语义/规则不变。
正确workspace依赖和自有资源环境下跑定向/editor check/TC/改动Biome/docs/diff，提交推送真实最终SHA。
不改其它产品正文、CSS、配置/超时/阈值/基线，不代签、不合main、不标done。
用户无需手工验证；Codex负责后续独立UI/全仓check/覆盖率及集成。
```

## 下一位 Cursor 提示词

```text
接手ARCH-F2-CURSOR-BATCH-1，先读本卡完整24组表与白名单、AGENTS/CLAUDE/READ-FIRST，
以及已done的战场/标签/overflow-text拆分回执。从最新origin/main新建独立worktree
/Users/zhangxu/illegal/type-pal-cursor-architecture-batch，分支codex/cursor-architecture-batch-r1。
按C00–C10、U00–U12连续实施，不逐组等Codex；先C01/U01小样自验再继续。只动本卡
命令族/设计系统模块与允许的测试/adoption归属，旧出口身份、DOM/ARIA、输入/撤销/
取消时序保持；CSS/产品宿主/格式/基线零改。每组一提交，整包末统一交24行真实状态账，
源正文/出口/运行期依赖对照、非空业务断言和真实单点负控、定向/editor check/TC/Biome/docs。
遇到结构或行为冲突只阻断该组，写直接证据，继续其它组；不改预期凑绿，不冒称全部完成。
不合main、不标done、不跑官方覆盖率。Codex负责独立验收、视觉和统一质量门。
```

## Cursor 交付（未标 done）

2026-09-26。作者自验回执：[docs/testing/cursor-architecture-batch.md](../../testing/cursor-architecture-batch.md)，24组负控汇总 [evidence.json](../../testing/cursor-architecture-batch/evidence.json)。起点 `origin/main` `8bf40b9094d9e43f6c3d146c1bda651962eb36c3`。24组均已实施，无隔离阻断。不合 main。Codex 独立验收与集成。

### Cursor r2 窄修（未标 done）

对照 origin/main 上 Codex 首轮接收（R1–R3）：三份 fixture 先过现行守卫；C07 改用既有 `commands.test.ts` 删除门与其单点负控；负控判据钉绝对路径/fullName/执行数/exit1/注入命中；旧 controls 恢复 50 出口；两项格式门已修。机械搬移不重做。最终 SHA 以推送为准。
