# pre94 五张遗留卡复审

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-31
Template: audit-report-v1 / 1.0.0

## 审计问题

用户2026-10-20要求补53/79/80/81/90五张遗留卡的复审欠账。审计问题不是重跑全部pre94,而是:这五卡涉及的18份文件是否具备逐文件A–H/caller/oracle质量,必要返工是什么,哪些边界必须继续保留。基点`b9bf6f7760d4d8b59e7dbc83b0f9aa0b74d9d9ce`,唯一集成分支`codex/code-quality-3y`,本批Owner为Codex;主树与GLM原候选只读,94–102不扩展。

## 范围与证据

范围=五卡slices共18份本轮文件+4个广域caller上下文(game-state/event-system/battle-system/player-poison-state,均裁定review、不得凭上下文复用关闭文件)。逐文件八维、旧→新合同/身份映射与native成员SHA在[review.json](review.json);原始包与只读快检(`node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/verify.mjs`)的完整raw/native在[native.json.gz](native.json.gz);任务卡见[QUALITY-PRE94-RETROSPECTIVE-1.md](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)。16个文件获显式接受(closedFiles),旧CODE53七ownership反控与helper/0x75/battle毒回调字节一致性由reuse-proof.json按实际范围+哈希见证,不推定整份event/battle文件未变。

## 发现

按卡真实发现:53补真实runtime0、直接显示槽/role入口映射、重复角色、离队guard、正式0x75清毒及装备重建,inspect测试改用公开工厂/hydrate替换残缺强转;79以只读生产解析器解码原盘SSS,真实performItem/runScript先取得2个HP业务红例(物品136/278只有装备伪毒时毒死目标而非施用者),再以既有isPlayerPoisoned修复战斗0x61重复非零扫描;80复用真实启战/旧卡guard/探索入离队四例,F1改独立嵌套字面量使旧4绿/新恰1业务红,去掉被真实链覆盖的fake-mode重复例;81的571候选到当前代码仅误导性Close(Esc)提示被纠正,两生命周期测试只对应selector变化,撤回旧check:fast的protected误标;90全runner/真实menu caller/当前7个大世界spell链,7旧弱/非法重复迁强合同、3标题更正、1真实非零use阶段新增,两枚旧绿新单红,测试退役magic-script 37→31、dev-panel.glm-next-wave 4→3附identityDigest与旧→新用例映射。过程失败如实保留(unbound snapshot、2项typecheck错误、临时producer路径错误均不充当产品红例)。

## 结论

16个文件按逐文件A–H/caller/oracle与必要返工明确接受;队列裁定五卡从pending登记为有明确A–H/限制的partial,83partial/0pending/0整卡accept。统一七门(check/ratchet/protected/docs/lint/ledger/diff)最终以review.json的integration、coreGates与完整原件为准:首跑check败于退役账显式总数(新增两条后常量仍31/66,已改33条/净少73例,保留14个拒绝轴),重跑七包20,377例全绿且静态/act/环境/stderr诊断均0;首次ratchet测试全绿但game branch/line四项floor下降,按用户已授权的合理整改重算,仅允许匹配完整旧baseline与23个当前SHA的有限game计数迁移,matcher字节未变。历史per-file branch原件缺失,不冒称19个covered branch变化均可归因。lint终态5691文件0诊断。另载erratum:Vitest4.1.7 reporter隐藏通过测试的console输出,历史raw counts仅为观测计数,撤回其runtime-zero门信用。未标passed的门不得当通过,旧门/旧行数/旧失败不倒写为本批结果。

## 整改与复核

仍保留的边界:53的Wear压缩/入口重入候选不顺带改,battle/event大状态机与集中浏览器视觉仍review;79已采纳的level≥99装备伪毒豁免不重问产品偏好;80的Dev Panel仍是DOM/编排复合模块,不虚构disposer公共接口;81共享成功缓存与生产renderer null策略保持;90第一阶段≤999清、>999装备状态保留不改,cost/caster签名按用户冻结保留。其它78张partial及94–102不扩展;浏览器截图/剧情E2E未新执行,像素/DOM证据仅覆盖表中指定功能。本页为historical时点回执入口;本轮用户可见变化仅79补齐既有机制与Dev关闭按钮去掉不存在的Esc承诺,无save/schema/生成物或公共接口变化。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 5525B / SHA-256 b9e1c138f248565ad120c71cf85c77c5efd940c6604cf2ffa80225cbea470d53；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# pre94 五张遗留卡复审

任务：[QUALITY-PRE94-RETROSPECTIVE-1](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)。基点 `b9bf6f7760d4d8b59e7dbc83b0f9aa0b74d9d9ce`；唯一集成分支 `codex/code-quality-3y`，Owner Codex。主树与GLM原候选只读，94–102不扩展。

用户2026-10-20要求补53/79/80/81/90复审欠账。本页是短入口，[逐文件记录](review.json)列18份本轮文件八维、4个广域上下文的复用边界、16个已明确接受的文件；没有把复合文件、83卡或包级全绿当作验收。

## 本批整改与证据

| 卡 | 已核与必要返工 | 仍保留的边界 |
|---|---|---|
| 53 | 真实runtime0、直接显示槽/role入口映射、重复角色、离队guard、正式0x75清毒及装备重建；inspect测试用公开工厂/hydrate替换残缺强转；状态测试补全图标/双早退oracle；纠正毒tick错引 | 原有Wear压缩/入口重入候选不顺带改；battle/event大状态机仍review；集中浏览器视觉未新执行 |
| 79 | 只读生产解析器解码原盘SSS对象/脚本；真实performItem/runScript先取得2个HP业务红例，再以既有isPlayerPoisoned消除战斗0x61重复非零扫描 | 已采纳的level≥99装备伪毒豁免，不重新问产品偏好；大dispatcher与旧广域测试不整文件关闭 |
| 80 | 真实启战/旧卡guard/探索入离队四例复用；F1从顶层克隆自比改为独立嵌套字面量，浅拷贝旧4绿/新恰1业务红；去掉被真实链覆盖的fake-mode重复例；测试清理自己监听 | Dev Panel仍是DOM/编排复合模块；全局监听有page单次启动Owner，不虚构disposer公共接口 |
| 81 | 571候选到当前执行代码仅误导性Close(Esc)提示纠正；两生命周期测试文件仅对应selector变化，旧反控复用；撤回旧check:fast的protected误标 | 共享成功缓存、生产renderer的null策略保持；新快捷键/AbortSignal/公共签名未引入 |
| 90 | 全runner/真实menu caller/当前7个大世界spell链；测试清poison/catalog单例；7旧弱/非法重复迁到强合同、3标题更正、1真实非零use阶段新增；两枚旧绿新单红 | 第一阶段≤999清、>999装备状态保留不改；cost/caster公共参数简化属非阻断候选，签名按用户冻结保留 |

本轮用户可见变化：79补齐既有机制；Dev关闭按钮撤掉不存在的Esc承诺，B/点击交互保持。无save/schema/生成物或公共接口变化。纯重构、测试质量返工与行为修复分提交。

## 低成本复验

- `review.json`：逐文件A–H、实际读域/复用来源、具体保留项、旧→新合同/身份映射、原盘/调用链及失效边界。
- 原始包与只读快检入口见本页集中门节；默认不联网、不写工作树、不跑coverage。版本/附件相符不等于自动认证设计质量。
- 旧CODE53七个ownership反控的测试字节仍一致；helper全体执行代码、0x75 case、battle毒回调分别与旧控源相同。状态绘制执行代码也相同。`reuse-proof.json`给实际范围和哈希，不把整份event/battle文件推定未变。
- CODE81旧原件/源/测试身份绑定复用；当前5类Dev文件43例、status/event/poison7文件76例、inspect修后15例、79相邻242例、90最终35例均有native/raw。它们有交集，禁止相加充当唯一测试数量。
- 旧反控为实现后的判别力证据，非伪造新的先红时间线。新79的2红确实先于修复；F1和90两针是测试增强的旧绿/新业务红对照。
- 过程失败如实保留：测试作者`unbound snapshot`、2项typecheck错误、临时producer/路径错误均不充当产品红例。详见记录的`processDisclosure`。

## 集中门与当前裁定

16个文件按逐文件A–H/caller/oracle与必要返工明确接受，具体路径见review.json.closedFiles；全仓check、official ratchet、origin/main protected fast及末轮静态门的真实结果见review.json.integration、coreGates和完整原件。未标passed的门不得当通过。旧门、旧行数与旧失败不倒写为本批结果。

只读快检：`node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/verify.mjs`。完整raw/native与producer保存在[native.json.gz](native.json.gz)，逐成员长度/SHA在review.json。快检核附件/版本/失败身份/门诊断，既有证据失效只复核对应claim，不自动重做整批。

本批首次check在退役账显式总数处失败：新增两条后常量仍为31/66，已改为33条/净少73例，原14个拒绝轴保留；重跑check七包20,377例且静态/act/环境/stderr诊断均0。首次ratchet测试全绿，但game/total的branch及line旧floor有4项下降，原件保留。按用户已授权的合理整改重算，新增只匹配完整旧baseline与23个当前SHA的有限game计数迁移，既有matcher字节未变，额外下降/源码变化/未知旧baseline反控均拒绝；未恢复死代码或弱测试。历史per-file branch原件缺失，不能冒称19个covered branch变化均归因于某一删除循环。最终ratchet/protected结果以integration及原件为准。

## 剩余风险与下一步

复审队列将五卡从pending登记为有明确A–H/限制的partial，仍0整卡accept；其它78张partial及94–102不扩展。单个文件可以凭完整本轮证据关闭；poison helper、battle dispatcher、Dev复合模块和大型event/battle上下文仍review。浏览器截图/剧情E2E未新执行；像素/DOM证据仅覆盖表中指定功能，不声称视觉全验收。
```
<!-- incremental-original-source:end -->
