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
- done准入：blocked，r2候选717d507d/登记9e5ba310仍有下列C1～C4；用户豁免两席不等于证据自动通过。

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

## 下一位Agent提示词

当前交接为[Codex r2接收报告末尾的GLM收窄提示](../../testing/glm-architecture-support/codex-r2-review.md#下一位agent提示词glm收窄返工)。
无下一位Kimi提示词。下方保留原始准备任务提示，不再代表本次无counter接收。

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
