# ARCH-SUPPORT-GLM-1 — 八组并行准备取证

Status: draft
Phase: ops
Capability: 架构治理只读准备，不开产品实现门
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex
Visual Verification Owner: GLM（明确委派初审，Codex接收复核）
Visual Verification Timing: dev-functional
Unavailable Agents: Kimi（本队列用户豁免）
Branch: codex/glm-architecture-support-r1

## 授权与目标

用户2026-09-25告知GLM已有视觉能力，要求多分配并行任务。
本卡只在draft阶段采集架构/回归/功能视觉证据，**不授权改产品或正式测试**；
Codex继续A3生产实现，GLM作为准备材料贡献者，不作为自证的独立第三方。
完整工作包：[八组范围/白名单/纪律/交付](../../testing/glm-architecture-support/README.md)。

## 前提与上下文

- 根协议/CLAUDE/READ-FIRST、[架构队列](../audits/architecture-debt.md)。
- 生产冻结b11d4bc9，当前fast7972/637；本卡不要求重算覆盖率。
- App5170/MapMode3819/ScriptEditor4361/CommandForm2098/BattleSession3022/event-system5784/migrate-content3314，
  为本轮只读wc实测；规模仅作定位，不作为缺陷证明。
- 2026-09-12旧视觉限制已由用户本次新裁决更新；新能力先交实际小样，不追溯改写历史签字。
- 任务只取证，无玩法/格式/原版机制变化；第一阶段分析须读其工程经验/机制资料，不能复述二阶段规则。

## 责任与阶段门

- Codex：已核任务互斥范围，授权GLM执行工作包定义的draft准备；接收/后续修复准入/统一统计归Codex。
- GLM：只编辑自己目录；报告自身实测、风险与建议，不写他席结论、不改共享看板/卡状态、不标done。
- Kimi：用户全架构队列豁免，不安排交接。
- build准入：not opened。本包不进入生产build，后续实施另按对应架构/修复卡准入。
- done准入：材料接收counter已全部闭合；本次按用户要求仍不标done，Status保持draft。
  统一收口、统计并集及对应实施卡准入另行核定，不由材料accept自动开放build。

## Codex最终定点接收席位（2026-09-25，58cdf938）

**accept：P5-GRAPH-1已闭合，无剩余接收counter。**

- `p5-phase1-core.md:29`已补`battle-opcodes → equip-effect`，紧邻`:28`的
  `battle-opcodes → event-system`；注释指向冻结源码`battle-opcodes.ts:18–24`五个getter值导入。
- 本席独立Node对账：仅抽取图中runtime边，排除type-only及环外节点，归一化路径别名后排序；
  与`codex-intake-evidence.json`的`mechanical.runtimeEdgesWithinComponent`执行精确相等断言通过。
  **7节点、15条边、15条唯一边、0缺失、0多余、邻接检查通过**，并非只比较条数。
- `b4fbcb7b..58cdf938`仅改P5报告图块；其它R3通过项、产品/测试/基线及旧反证未改。
  已核22hash/17图/JSON格式与先前检查结果沿用，不重做统计、浏览器或全仓测试。
- 本次接受的是八包准备取证材料的最终残项，不代表13批架构治理完成或所有风险已修。
  不代签GLM/Kimi，不标done、不改Status，不自动开启产品实现。

下方历轮counter保留为历史，已由此前通过项及本条accept关闭，不再作为当前阻断。

## Codex定点接收席位（2026-09-25，f4236474）

**counter，仅余P5-GRAPH-1；Status仍draft。**
[逐行复核和唯一完成条件](../../testing/glm-architecture-support/codex-f423-review.md)。

通过：38/38报告ID和分类一致；V1旧risk、P5测试表、P6扩大结论、P4门归属/三段动画清理、summary命令链均已修。
最终GLM JSON Biome exit0、check:docs PASS；5文件增量，产品/正式测试/基线、原机账/旧反证零改。
已核22hash/17图不重做。

唯一残项：P5图声称15边但实际14，缺`battle-opcodes → equip-effect`，冻结源码
`packages/game/src/core/battle/battle-opcodes.ts:18–24`和本席r1的15边机账直接证明。
只补图中一行并对集合，不新增研究、不重拍、不重跑全仓。不把历史counter再当当前未闭项。

## Codex r3接收席位（2026-09-25，1410916e）

**继续counter，仅保留定点残项；Status仍draft，不开build、不标done。**
[r3具体行与完成条件](../../testing/glm-architecture-support/codex-r3-review.md)、
[本席r3机账](../../testing/glm-architecture-support/codex-r3-evidence.json)。

已闭：C2主要源码真值、38唯一ID/21covered+12risk+5N/A及八包合计、hash引用清理、最终JSON Biome exit0；
产品零漂移、旧Codex六文件、22源码hash与17图均未变；39旧独立定向证据保留，不重跑。

- R3-1：V1风险表、P5旧分项表/边界描述、P6无fs扩大结论仍未同步到已确认口径。
- R3-2：P4-002正文risk/ui分散与机账covered/门归属不一致；V1-003/005仍与机账不同义。
  P4共享状态小表的1220–1224是终态动画分支，不是1565–1573的performAction；清理语义需分开。
- R3-3：summary复算范围仍包含Codex任务卡修改；cd后根相对命令路径错误，输出注释仍19/14。

仅修上述材料，不增加产品/测试/视觉任务；有效事实不重开。下方r1/r2结论为历史记录。

## Codex r2接收席位（2026-09-25，717d507d / 9e5ba310）

**继续counter，收窄返工；Status仍draft，不开build、不标done。**
[r2报告与精确锚点](../../testing/glm-architecture-support/codex-r2-review.md)、
[本席机账](../../testing/glm-architecture-support/codex-r2-evidence.json)、
[只读复算器](../../testing/glm-architecture-support/codex-r2-probe.mjs)。

已闭合：白名单、产品零漂移、旧Codex三文件未改；38唯一ID与JSON19/14/5小计、22个源码hash、17图哈希与尺寸；
新增6图对应可见布局；derivedStore/cancel/50vs81/hooks三轴/preparing门/SCC/双向校验及6参数的更正方向；
搜索名与即时多选合同、折叠正常的Codex归属。不要求重新取证这些事实。

剩余：

- C1：顶部更正未同步到正文/表/风险列表，P5仍写无环，V1仍写缺名/未进入等；P4共享状态边界需小表而非一句概括。
- C2：App新盘点仍24state/8ref且列不存在的四个state；实际App29/16/15effect+1layout。P5分项仍合703却称702；
  P6函数体自递归7处非6；V2“没有分隔条测试”被既有PanelResizeHandle-interaction用例直接反证。
- C3：summary各包行数合40而机账38；P3/V1行数、P4/V1 ID含义不一致；hash注册表仍有不存在的引用，命名门不可证明两模型映射。
- C4：9e5ba310最终JSON Biome仍exit1；可复制命令的基点/工作目录需修。原交付check:docs通过，不混称Biome通过。

源码及正式测试不变，沿用前轮独立39/39，不重复跑统计并集/全仓；未改GLM语义、旧反证，不代签。
逐项细节以r2报告为准；下方r1原结论留历史，不把已闭事实重新打开。

## Codex接收席位（2026-09-25，候选3967a376）

**counter；仍为draft，build未开放，不标done。**
完整理由与返工提示：[独立接收报告](../../testing/glm-architecture-support/codex-intake-review.md)；
[机账](../../testing/glm-architecture-support/codex-intake-evidence.json)；
[冻结只读复算器](../../testing/glm-architecture-support/codex-intake-probe.mjs)。

| 包 | 本席结论 | 阻断摘要 |
|---|---|---|
| P1 | counter | derivedStore由App创建，start返回stop；不是缺清理；导航测试也非helper |
| P2 | counter | 冻结MapMode已经有pointerCancel/lostcapture/blur完整清理；实际收集72项 |
| P3 | counter | 50旧表单分派与81 canonical命名键混淆；default/hook/session证据漏项；effect归因不实 |
| P4 | counter | writeBackHp无报告所称preparing早退；实际93项；补本类pump/render边界 |
| P5 | counter | 静态runtime图仍7节点同一SCC/15边，battle/equip两反向边被漏读；收集702项 |
| P6 | counter | 漏author↔enemy双向校验及onFlee/onFail/onNo；mapScenesStatic实际6参数 |
| V1 | counter | 搜索已有可访问名并实测有效；即时多选是已定合同，不能套用整份草稿替换取消 |
| V2 | counter（收窄） | Inspector Tab测试不能证明separator；对象列表本席已补验正常，原不确定记录保留为历史 |

全包R0：实际38唯一条目=12covered/18risk/2blocked/0reproduced/6N/A，不是32；
源hash/完整测试名/预期来源等字段未闭合，JSON Biome formatter失败，候选SHA占位需回填。
接受白名单12文件、生产零漂移、11PNG实物/哈希前缀/尺寸与有限图面观察，不要求重做有效证据。
复跑39项现有定向测试通过；其余Vitest list只收集，不宣称已运行。未改产品/测试/基线，未做统计并集。

## 交接日志

- 2026-09-25 Codex：按用户新增并行请求落8包，冻结b11d4bc9，白名单只在专属文档/诊断目录；
  A3当前生产工作不交叉，视觉初审允许GLM，最终由Codex核验。Next: GLM draft取证。
- 2026-09-25 Codex：同步GLM独立分支确认3967a376；完成冻结/白名单/38条复算、11图哈希与目视、
  主线6010实际折叠/搜索复核、39定向绿及各包独立源码反证，按上表分别counter。
  仅落本人审查文件与本人席位，README只追加机械索引，原GLM报告/机账未改；main不切分支、不合入；Kimi豁免。
  后续GLM按接收报告末尾提示返工，保留冻结与只读白名单，不因审查开放产品实现。
- 2026-09-25 Codex：同步并核717d507d/9e5ba310 r2；确认多项事实与17图有效，独立AST/机账对账仍发现C1～C4。
  新反证单列r2文件，r1三文件零改；保持draft，GLM只需按收窄提示修材料，未授权产品实现。
- 2026-09-25 Codex：核1c6c6d91+f20a88a6/49054552至1410916e；最终JSON格式和docs均通过，
  独立核八包合38与旧证据零变。仍有报告表内错义/错数及复制命令残项，收窄为R3-1～R3-3。
  未改GLM语义/旧反证/产品，未重跑统计或视觉；等待其定点更正文档，不转Kimi。
- 2026-09-25 Codex：独立核f4236474，R3残项除P5图一条已核边漏写外全部闭合；38ID/格式/docs均通过。
  只在本人席位和新复核记录登记counter，未代改GLM语义；下一位只需补该行，不转Kimi。
- 2026-09-25 Codex：同步并核58cdf938，独立程序比较完整15边集合及新增边邻接，全部通过；
  签accept关闭P5-GRAPH-1，接收counter清零。仅更新本人席位和日志，不改GLM报告，保持draft、不标done。

## 下一位Agent提示词

无下一位Agent提示词，等待用户验收/收口；无需GLM再次返工，Kimi本队列豁免。
统计并集和实施准入仍由Codex另行核定。下方及历史复核报告中的提示仅作过程记录，不是当前待办。

```text
在 /Users/zhangxu/illegal/type-pal 接手 ARCH-SUPPORT-GLM-1 的八包只读准备取证。
先同步并读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、
docs/ops/tasks/ARCH-SUPPORT-GLM-1-eight-audit-packages.md 与
docs/testing/glm-architecture-support/README.md，严格按工作包八组连续执行。
用户已确认你具备视觉能力，允许本包实际浏览器/截图/交互初审；先完成一个完整视觉小样证明工具通路，
再做P1～P6、V1～V2。无法实际看图时如实blocked，先完成非视觉组。
生产冻结b11d4bc9；从包含工作包的提交开独立分支codex/glm-architecture-support-r1和独立worktree，
不得在main目录切分支，不改Codex的A3实现或现有测试。只写专属文档/机账/只读probe目录，
不得改产品/配置/基线/共享看板/任务状态，不跑全仓check/ratchet/strict，不跑迁移写盘或完整剧情E2E。
每组报告精确源码/真实caller/已有测试去重/可复现证据；视觉给截图与操作链，遵循现行设计规范和已披露边界。
每组一提交，八组做完统一push交Codex。最终给总报告、机账小计、起点与最终SHA、复算命令及未证风险。
GLM为贡献者，不自充独立第三方，不代签、不标done、不转Kimi；产品实现门未开放。
```
