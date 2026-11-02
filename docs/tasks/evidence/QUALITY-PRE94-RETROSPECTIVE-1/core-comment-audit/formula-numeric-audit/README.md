# pre94 公式数值、事实注释与既有测试判别力返工

Status: recorded
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「pre94 公式数值、事实注释与既有测试判别力返工」的治理候选页;证据原件即下方逐字节保全的固定main源(4776B,SHA 17939d86e604)。该证据片是 QUALITY-PRE94-RETROSPECTIVE-1 / core-comment-audit 的第七组注释返工(base 8dabfd49,codex/code-quality-3y 分支):只修事实注释并加强既有测试,不改数值执行,数值实现冻结待用户裁决。

## 来源与输入

三选定源/测为 packages/game/src/core/battle/formulas.ts、magic-damage.ts 与 __tests__/formulas.test.ts,全文与分段读取范围、SHA 及 7 条限制见[read-boundaries.json](read-boundaries.json);原C util.RandomFloat/fight.PAL_CalcBaseDamage/PAL_CalcMagicDamage 按真实边界提取并逐函数体钉 SHA,原C对照五轮运行回执见[numeric-counter.json](numeric-counter.json),五灵/中点与毒抗两个独立手算/原生 oracle 见[mapping-oracle.json](mapping-oracle.json)与[poison-oracle.json](poison-oracle.json)。授权与交接见[QUALITY-PRE94-RETROSPECTIVE-1.md](../../../../cards/QUALITY-PRE94-RETROSPECTIVE-1.md);[GAME-MAGIC-NUMERIC-ASSIGNMENT-1.md](../../../../cards/GAME-MAGIC-NUMERIC-ASSIGNMENT-1.md)数值风险卡当时仅 draft 只读、等待用户裁决,数值执行不在本片 build。

## 断言与业务 oracle

本片核心可感知差异:灵力240、有效防御30、基础伤50、无元素、HP9000 场景,真实 TS 公开调用链实扣 160(余 8840),C 原函数体用邻近归一化样本或四分之一样本扣 161;C float32 写回 WORD 再整数除 10 与 TS 连续 double 最后截断不能宣称等价,删除 *10/10 在本反例仍得 245、不是修复。两枚源变异反控(水/火抗性互换、漏毒抗)各为完整未过滤旧 28 绿→变异后恰 1 个指定业务 AssertionError,原件见[controls.json](controls.json);formulas.ts 与 magic-damage.ts 仅注释改动,去注释后 JS 逐字节一致见[emit-identity.json](emit-identity.json);formulas.test.ts 28 例保持、4 个标题按真实 oracle 改写(如 65535→-2 仅当前 TS 截取合同、毒抗5必须给80、倍率1.05/1.0 得 52/50),映射见[test-title-mappings.json](test-title-mappings.json)。

## 结果

恢复后 51 直接、293 相邻与 game typecheck 零诊断;docs check 125 例全过、lint 5250 文件零诊断,最终门汇总见[gates.json](gates.json)。两个原 closed 转 review(formulas.ts、formulas.test.ts),账面 267closed/75review/2973pending,0 新增 closed,83 卡 50partial/33pending/0accept;mergeAllowed=false,未合 main,数值行为未变、用户数值裁决 pending。

## 限制与复核

C 片段为最小 typed 上下文+单一归一化 lrand 样本,非完整 SDLPal/原盘实跑;两边不同 PRNG,不声称同 seed 序列。rng.ts rangeFloat『对齐SDL』端点错注只读登记;asShort 重复是复用候选,未借提取引新公共接口;其它 FLOAT 系数、WORD/SHORT 极端域、field permutations、原盘视觉/E2E、官方 coverage ratchet 与 protected fast 均 pending。未重跑原命令;历史结论保持原时点;候选待 Owner 非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 4776B / SHA-256 17939d86e604087ae18f2ff2341562e5b4cc201d387fb894648e56f90bc08906；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# pre94 公式数值、事实注释与既有测试判别力返工

Status: recorded
Owner: Codex（单Agent，自身源码核证，不冒充第三方）
Date: 2026-10-18
Base: `8dabfd49976f818364d451635f155af08a41b9a9`
Branch: `codex/code-quality-3y`

## 身份、准入与实际读取

id: QUALITY-PRE94-RETROSPECTIVE-1 / formula-numeric-audit；schemaVersion:1；status:recorded。授权与交接见[父卡](../../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)，[数值风险卡](../../../../tasks/GAME-MAGIC-NUMERIC-ASSIGNMENT-1.md)仅draft只读、等待用户裁决，数值执行不在本片build。三选定源/测全文，实际RNG/H工厂全文及primary/caller分段由[read-boundaries](read-boundaries.json)给出；未把grep命中或相邻绿算全文验收。旧3m原README完整gzip保留，当前正文撤回过度信用。

## Primary、caller与新停止线

原C util.RandomFloat、fight.PAL_CalcBaseDamage/PAL_CalcMagicDamage原函数体按真实边界提取，common.h的WORD/SHORT/FLOAT宽度以static_assert约束，最小typed globals和指定lrand样本。clang O0/O2均-Wall/-Wextra/-Werror零诊断、输出相同。真实TS公开GS创建→hydrate→projection→createBattleState→applyMagicDamage，使用实际SeedableRng(244049)并核下一state，仅typed角色/敌人/战场工厂，未stub RNG/伤害。

灵力240、有效防御30、基础伤50、无元素、HP9000：实际TS扣160/余8840，C原函数使用邻近归一化样本或四分之一样本扣161；TS叶倍率1.025也为160。C float32写回WORD再整数除10与TS连续double最后截断不能宣称等价。C INT_MAX端点RandomFloat=11，TS生产倍率[1,1.1)；两边不同PRNG，不声称同seed序列或完整原版EXE/原盘实跑。删除*10/10在本反例仍得到245，不是修复。[numeric-counter](numeric-counter.json)保留命令/完整raw/程序/SHA/临时清理；这是可感知差异证据，不是修复绿灯。

## 三文件问题与有限改动

- formulas.ts：撤销1:1大包票、玩家等级项和抗性默认10；分清TS/C端点与赋值、SHORT越界域；只修注释，未删算式。
- magic-damage.ts：原注“抗性倍率永>=5”错误，在公开投影[0,100]前提下实际[0,5]；旧行号改函数锚，RNG说明分清TS与C。敌伤害JSDoc原错贴rollAutoDefend，归回实际函数；AoE先掷后判HP及结果HP字段说明纠正。执行与类型结构均不变，见[去注释双重证明](emit-identity.json)。
- formulas.test.ts：原“五灵”仅测1/2/5且多零，换成同生产除数1与五个独立值；毒抗全零恒辨不出漏读，改非零毒抗5/元素抗8/场效10，必须给80；1.1端点换next=0.5可达1.05/52。删除finite和单调两条被精确值蕴含断言，28例保持。65535→-2仅当前TS截取合同，不承诺C越界浮点转换。

独立手算与原C O0/O2给五灵[160,128,96,64,32]、毒抗80与中点52；[matrix](mapping-oracle.json)、[poison](poison-oracle.json)附完整程序/raw。用例不从被测TS函数生成期望。两反控（水/火抗性互换、漏毒抗）各完整未过滤旧28绿→新27绿1指定业务AssertionError，0skip/pending/unhandled；source/spec/mutant/全量nativeJSON及finally恢复SHA见[controls](controls.json)。未以现有错误伤害160为期望加产品回归，数值修复先红留获准后。

## 门与证据限制

完整未裁剪stdout/stderr gzip与独立命令回执保留，最终[gates](gates.json)汇总实际诊断。恢复后51直接、293相邻与game typecheck；只有本次三源/测审查信用，未读相邻不关闭。文档check125与所有消费者、lint-zero和ledger以最终回执实际结果为准。全仓check、官方coverage ratchet、protected fast按用户成本规则留大任务收尾，未运行、不授统一门/合并信用。4个标题变化映射另存[test identities](test-title-mappings.json)，未改baseline或退役账。

两个原closed转review，magic-damage原review保持；267closed/75review/2973pending，0新增closed，83卡50partial/33pending/0accept。三组其它坏注、两UI差异、毒列表与本次数值风险继续；其它FLOAT系数/WORD极端域、field permutations、原盘/视觉/E2E均pending。rng.ts另有rangeFloat“对齐SDL”的端点错注，只读登记；asShort重复是复用候选，先核域和owner，未借提取引新公共接口。

## 交接与下一步

同一3y分支有限提交推送，fetch确认0behind后保留待审；未合main。数值裁决未到时继续尺寸/快捷键/ColorFade的独立核验；获准后另卡先红后修、行为另提交。初次本地编辑脚本因零抗性注释命中两处而中止，测试文件尚未写入；随后仅执行测试段并完成本回执验证，不当作产品失败或反控证据。
```
<!-- incremental-original-source:end -->
