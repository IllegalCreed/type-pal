# 用户转达的GLM独立审计：四项收口纪律返工

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

原审计主题按原文时点保留:基点 291b7b59d、唯一 codex/code-quality-3y 分支、Codex 单一 Owner;用户转达 GLM 独立审计的内容层通过(五修复、71锚、测试 diff、baseline 和六退役),但本轮未取得 GLM 原始脚本/逐项记录,不把摘要升级为 Codex 已独立重验全部内容。四项返工逐项裁定:(1)回执超卖——7fc92e98 已撤回通过/收口,四次执行可查 exit,check 持久化记录明确截断;C10 原件重核 624act/243环境只属于 C10 不冒充本次精确数,原"通过"无效、本次诊断 unknown 未补签零诊断;(2)原始附件缺失——已附原 README gzip、四份 CommandExecution 与持久化输出及 SHA 且全部明确片段边界,但完整未裁剪当轮日志仍缺,历史 47–52 回执保持 rework;(3)两源码上界越界——直接读 uibattle 后缀与 PAL_PlayerLevelUp 核实际 EOF/函数名/区间 SHA 并更正,不增加产品或全 71 锚信用;(4)旧授权头外推——六条分别定位真实 human 消息 ID/时间/摘录、Codex 新增提交与合同转移证据,registry 头限定 OPQ 仅原五快照,不把 Codex 卡面 build allowed 当用户原话。

## 范围与证据

一手来源:[anchor-corrections.json](anchor-corrections.json) 将 uibattle 原 1740–1810 限为 1740–1808(飘字循环 1746–1767、PAL_BattleUIShowNum 1770–1808),global 原 2347–2454 更正为 PAL_PlayerLevelUp 2347–2409,参考源码 SHA/行数/函数名/区间 SHA 均实取且不声称全文读过;[authorization-instructions.json](authorization-instructions.json) 只保存四条相关 human 指令必要摘录与来源(通用精简规则与 OPQ 历史五文件特批是两个不同来源);[retirement-authorizations.json](retirement-authorizations.json) 逐条区分 human 指令与 Codex 执行裁定、日期、commit、精确 count 与业务转移证据;[retirement-proof-before-comments.json](retirement-proof-before-comments.json)/[retirement-proof-after-comments.json](retirement-proof-after-comments.json) 使用 f544 前后真实 baseline 条目和当前六测试字节:精确六快照被已有 predicate 接受、文件字节漂移被拒,原 30 条 payload、matcher 函数和 baseline SHA 必须前后一致,只改 registry 注释不改表值/测试 body/拒绝规则/coverage/baseline。

## 发现

过程性事实:首轮 pnpm check:docs 的 125 工具测试通过,随后因本目录缺 README/父导航而 exit1;修正入口后仅重跑失败 consumer 和余下 docs/model/testing/phase/content 检查,均为 0 诊断,原 exit1/raw 保留;工具准备第一次因 execFileSync options 类型写错在读取 baseline 前退出,无源/表/基线写入,不算有效反控,修正工具后才得到六条实际证明。前两项结论不变:exit 0 可核,当轮 act/环境等诊断计数不可核;完整未裁剪原件仍缺,不能验收;C10 存量告警没有当轮完整原件证明已清零。

## 结论

本页治理结果=原文保全完整、链接处置如实,不产生新执行结果。[gates-followup.json](gates-followup.json) 记录定向既有判据、相邻 inventory/metrics 工具回归及 docs/lint/ledger/diff 的实际完整输出。本次全仓 check、官方 ratchet、protected fast、产品测试、E2E 均未运行,不修改 baseline,不补造历史完整日志。零新增文件关闭;账本仍 3312 tracked/289closed/47review/2976pending,83卡 49partial/34pending/0accept;47–52 原回执仍 rework,修正 3/4 不自动消除 1/2 证据缺口。

## 整改与复核

未来大模块另保完整 stdout/stderr、分项诊断计数后再验当前统一门;后续继续 UI 测试合同/隔离和 73 卡,不把治理缩成回执修饰,也不宣布全仓完成。未重跑命令;候选待Owner接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 4604B / SHA-256 13fc6cf3287fe1769c7680c6e266af90016e89914a800e8ba6f5e0cd98429b25；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# 用户转达的GLM独立审计：四项收口纪律返工

基点291b7b59d，唯一codex/code-quality-3y，Codex单一Owner。用户转达内容层通过（五修复、71锚、测试diff、baseline和六退役）；本轮没有取得GLM原始脚本/逐项记录，不把摘要升级为Codex已独立重验全部内容。

## 逐项裁定

| 项 | 当前直接证据与处理 | 当前结论 |
|---|---|---|
| 1 回执超卖 | 7fc92e98已撤回通过/收口；四次执行可查exit，check持久化记录明确截断。C10原件重核624act/243环境只属于C10，不冒充本次精确数。 | 原“通过”无效；本次诊断unknown，未补签零诊断 |
| 2 原始附件缺失 | 已附原README gzip、四份CommandExecution与持久化输出及SHA；全部明确片段边界。 | 完整未裁剪当轮日志仍缺，不能把片段称原始全量；历史47–52回执保持rework |
| 3 两源码上界越界 | 直接读uibattle后缀和PAL_PlayerLevelUp，核实际EOF/函数名/区间SHA，更正当前README、read-boundaries、live ledger、父任务；旧quote不篡改。 | 这两处源区间更正完成；不增加产品或全71锚信用 |
| 4 旧授权头外推 | 六条分别定位真实human消息ID/时间/摘录、Codex新增提交与合同转移证据；registry头限定OPQ仅原五快照，每条注释指出实际当前规则/范围来源。 | 来源登记完成；不是六次用户逐条签字，不用旧OPQ任务授权，也不新增matcher/豁免 |

## 一手来源与范围

[anchor-corrections.json](anchor-corrections.json)将uibattle原1740–1810限为1740–1808；对外精确指出PAL_BattleUIUpdate飘字循环1746–1767和PAL_BattleUIShowNum 1770–1808。global原2347–2454更正为PAL_PlayerLevelUp 2347–2409。参考源码SHA、文件实际行数、函数名位置与读取区间SHA均实取；不声称全文读过uibattle/global。两个旧read-boundaries gzip保留，历史quote/旧审计采集文本中的原错误上界仅作历史，现行引用按本条。

[authorization-instructions.json](authorization-instructions.json)只保存四条相关human指令的必要摘录与来源：2026-10-11用户提供的AGENTS明确“已证重复、恒真或无业务执行的用例精简”；同日全仓治理范围包含shared/extract/game/editor；源消息按UTC记录：2026-10-15继续editor核测试判别力，15:44Z（本地10-16）重申复审94前全部卡。它们均早于六条新增提交。该通用精简规则与OPQ历史五文件特批是两个不同来源。没有新增的逐条用户产品取舍；本轮选择用户要求的“登记实际来源”路径，不重复索要已有授权。

[retirement-authorizations.json](retirement-authorizations.json)逐条区分human指令与Codex执行裁定、日期、commit、精确count和业务转移证据；不把Codex卡面build allowed当作用户原话。[前证明](retirement-proof-before-comments.json)/[后证明](retirement-proof-after-comments.json)使用f544前后真实baseline条目和当前六测试字节：精确六快照被已有predicate接受，文件字节漂移被拒；原30条payload、matcher函数和baseline SHA必须前后一致。这里只改registry注释，没有改表值、测试body、拒绝规则、coverage或baseline。

首轮`pnpm check:docs`的125工具测试通过，随后因本目录缺README/父导航而exit1；修正入口后仅重跑失败consumer和余下docs/model/testing/phase/content检查，均为0诊断。原exit1/raw保留，没有重复运行未改动的125工具测试。

工具准备第一次因execFileSync options类型写错在读取baseline前退出，无源/表/基线写入，不算有效反控；修正工具后才得到六条实际证明。它与产品测试失败、覆盖率失败或业务反控分开。

## 质量门与未完成

[gates-followup.json](gates-followup.json)记录定向既有判据、相邻inventory/metrics工具回归及docs/lint/ledger/diff的实际完整输出。对注释更正不新增镜像测试；源锚直接读取、授权原文与前后predicate/payload重建分别留证。本次全仓check、官方ratchet、protected fast、产品测试、E2E均未运行，不修改baseline，不补造历史完整日志。

零新增文件关闭；账本仍3312 tracked /289closed/47review/2976pending，83卡49partial/34pending/0accept。47–52原回执仍rework，修正3/4不自动消除1/2证据缺口；未来大模块另保完整stdout/stderr、分项诊断计数后再验当前统一门。后续继续UI测试合同/隔离和73卡，不把治理缩成回执修饰，也不宣布全仓完成。
```
<!-- incremental-original-source:end -->
