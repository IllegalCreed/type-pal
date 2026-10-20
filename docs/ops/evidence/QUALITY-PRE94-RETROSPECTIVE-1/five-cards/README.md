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
