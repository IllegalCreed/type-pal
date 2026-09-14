# GLM剩余边界大批回执（二）

范围：[六组72检查点工作包](glm-pre-e2e-boundary-batch-2.md) r1，2026-09-14。
产品冻结：70e3f62770bbe0a23c4b9d90c31258a3d2883772。贡献者：GLM；接收复核：Codex。
状态：**counter，2026-09-14首轮接收不通过，交GLM按R1～R7返工**。不合入六探针/机器账，不改变产品、正式测试或覆盖基线。

## GLM原始交付索引（保留在冻结候选）

- 分支：`codex/glm-pre-e2e-boundary-batch-2`；候选`4ffae69b6e512fcc49081c5f3102b465622ae35e`；起点`c5152fcf`。
- 六组提交：A 9ed7f3d8、B e77915af、C 592f08ea、D 6aa3ef46、E 4ba47f82、F de30cdd7。
- 原回执与机器账分别见该候选的本文件路径及`docs/testing/glm-pre-e2e-boundary-batch-2-evidence.json`。
  不复制其尚未成立的covered结论到主线；原始八文件在Git分支保留，未改写其证据。
- Codex独立核白名单恰六探针+机器账+回执，产品/测试/脚本/项目/数据/锁文件相对70e3f627零diff。
  机器账确有72个唯一ID，算术48 covered/5 reproduced/19 risk成立；**业务分类不成立，不采纳这个分布作为完成结果**。

## Codex接收复核（保留，不由GLM填写）

结论：**counter**。已通读六探针、原72点合同和机器账，复跑六组observe、五组contract及定点反控。
部分真实观察有价值，但存在反向contract、零业务断言、手写被测算法、用静态存在性替代真实调用、归属与台账错误，不能整批接收。
本轮按Vitest断言/替身原则与Vite隔离加载复核；所有临时见证只在独立进程和tmp，不修改任一工作树产品或原探针。

### 一手复跑与鉴别力

证据目录：`/tmp/type-pal-glm-b2-review.JT6aXQ/`；运行树`/Users/zhangxu/illegal/type-pal-glm-b2`，HEAD钉4ffae69b。

| 复核 | 实测结果 |
|---|---|
| 六组observe（每组all） | 六条均exit0；只说明脚本正常执行，不能因此接受其分类 |
| 五组contract（每组all） | A exit1（首个A03）；B/C/D/E均exit0，后四者含错误合同或无业务assert |
| A07单跑contract | exit1：误要求inherit存入selection；生产script-world.ts:429明确删除selection，是测试错而非新产品bug |
| A09单跑contract | exit0，写入无/effect=false；仍输出reproduced，硬编码分类与实测相反 |
| A10/A11/A12单跑contract | 均exit0，cancel分支只打印分类，没有正确合同assert |
| A10/A11/A12时点见证 | abort调用之前behaviors={}，运行完成后分别残留trigger/page/activation；这三条取消前未提交的观察确实成立 |
| D组屏蔽全部BattleSession.tick | 临时覆写prototype.tick为空并统计调用，24次命中；contract all仍exit0、仍报12记录（11 covered/1 risk），证明缺业务鉴别力 |
| C01正常写回见证 | 仅临时让新偷91×1正常写回世界，见证调用1次；contract反而exit1，因为它断言世界必须为空 |
| 原probe-migration-boundaries | 原文件未改，exit0复现A-08作者新修改被覆盖、A-09真实materialize写到虚拟项目外；E组“已有守卫覆盖”不能解释这两条 |
| 六新探针Biome | exit1，7 errors/14 warnings/1 info；未自动修复，不把未来全仓lint失败留给集成 |

关键见证的重建方法（从候选读取原probe，另存本人tmp，保留真实模块加载）：

- 将probe相对root改指冻结worktree；tmp里的C/D probe裸typescript导入改为该worktree的实际模块绝对路径，仅环境适配。
- A：仅在entityCase中真正调用controller.abort()之前插入behaviors快照和空对象断言；记录运行后selection，不改取消调度或产品。
- D：在取得真实BattleSession类后，临时令其prototype.tick只递增调用计数；运行`--mode=contract --case all`。
  返工后此见证必须因缺少真实行动/结果而失败，不能仍输出covered。
- C：只对C01输入，临时将writeBackInventory结果设为战内正数量项的拷贝，再运行`--mode=contract --case C01`。
  这是C01结果方向见证，不是获准产品修复算法；返工后正常结果应通过、原树丢物应业务红。
- 独立见证首次tmp导入缺typescript为环境失败，已修路径后重跑，最终日志为D-no-tick-confirmed/C01-good-writeback-confirmed。
  A时点首次疑问是“是否已提交才取消”，空状态观测推翻该疑问；最终A10～12-order-confirmed证实取消前为空，未把初疑当counter。

### R1 · 修正contract语义、分类与问题归属（阻断）

以下锚点均为候选`4ffae69b`的`docs/ops/audits/pre-e2e/probe-glm-next-*.mjs`，不是main上已接收源码。

- async:152–157（A02）把失败残留覆写明确断言为contract；barrier:149–154/225–230（B01/B03）要求保存超时/零快照；
  battle-result:112–131/175–179（C01/C02/C05）要求世界丢弃新物。这些是旧缺陷特征，不是正确合同，更不能记covered。
- async:391–394（A09）硬编码reproduced，实际输出已写明“行为写入=无”；取消后没有残留的正向结果被记成复现。
- async:453–458（A10～12）cancel分支没有contract判断，因此真实残留照样exit0。
- 归属必须纠正：A02/A03为运行时B-05；A09目标及A10～12为B-09/相邻selector取消边界，**不是编辑器D-01全局撤销**。
  偷取新物写回对应原审计C-01；原审计C-04是毒杀终态。工作包C04与审计C-04也不得混用。
- 保留F12“不设置90%才准起跑”原则，但撤回其D-01/C-04错误分流。不重开已done的D-01，不臆造已准入C-04修复卡。

返工：observe先证前提、再按真实业务结果分类；contract必须断言预期正确行为，错误原树红/正常对照绿。
不能仅把48 covered批量改成risk就宣称72点已做完；缺少的实作按下列原合同补齐。

### R2 · A组入口和取消时点（阻断）

- A01/A04的标量覆写、快照、通知或不reload分支可保留为有限单元证据；补合法目标scene/map与现场可观测状态，空reloadMap不证明完整换图一致性。
- async:237–344（A05～A08）从未调用main.prepareSceneSwitch/assertSceneSwitchPlanCurrent/reveal或依赖签名。
  仅把selection改成before/after、直接改money/flag后再读原selection，不能证明过期entry计划与无关变化正控。
- A07的inherit应验证继承生效及覆写移除，不应强求持久存储inherit字样；当前contract误报已独立复现。
- A09缺真实resolver进入/释放见证，调度结果没有残留；需把abort门放到实际await解析后、提交前，并有同输入不取消正控。
- A10～12的取消前空状态/取消后残留已独立证实，可保留fixture和观察；补精确内容、AbortError、通知及contract失败assert，不以JSON长度或硬编码分类替代。

### R3 · B组barrier/U-02/导出实际调用（阻断）

- B01/B03的互等超时观察可作为B-06/B-07复现继续用，修正R1后补完整父子活动/快照次数；60ms是缩短的真实计时器，不是虚拟时钟。
- B02改成普通setFlag后保存，缺原要求的同一confirm/startBattle链正控。B04正常快照可保留，但不只assert truthy。
- barrier:261–325（B05）所谓“重试”在成功runtime上，真正超时runtime的running2被void且未释放；没有同实例超时释放后重试。
- B06只有confirm→setFlag，单活动取消后不续行/后续保存是有限有效证据；没有子活动取消、活动数与嵌套barrier矩阵。
- barrier:383–465（B07～B12）主壳只做regex/indexOf存在性检查；B08先await旧链彻底结束，再创建全新world/runtime写flag，
  既没有旧finally在途，也没有新权威争用。B10守卫计数不能代替动态反向控制；B11字符串存在不能证明零参dumpSave/codec正确。
- U-02继续待证，不据该B08宣布可达或安全。B12缺真实捕获/导出/恢复链；允许AST/模块级非视觉取证，不能笼统以“浏览器壳域”跳过原工作包。

### R4 · C组真实动作、库存与终态（阻断）

- C01～C03真实偷取链和新/已有库存的事实可复用；C01/C02缺陷与正确合同分开，逃跑留偷物包括世界写回，main.ts:2619–2621明确说明。
- battle-result:144–195（C04～C06）：直接清空数组不是实际消费到count0；手填新增数量不是新增后真实消费；
  C06只再跑一次已有物品的偷取，不是连续两次同ID/不同ID。C05说明还多出输入中不存在的91:1。
- C07养蛊未推进真实回合，应补可控core/session链或具体已尝试的阻断；不能仅因最终归Q2就免做当前非视觉准备。
- C08/C10只传maxHp=1但既有player fixture的hp仍100（battle-session.test.ts:74–87），同时没有提交玩家行动、未挂毒；
  空tick不终止不能归因“敌伤害不足”，也不构成战败/回合末玩家毒死证据。
- C09复用毒杀旧探针可行，但它是已知错误的复现，不是covered；补正确终态合同草案。
- C11顺序可继续待证，但须有当前实现/机制锚点及已尝试控制。C12读取不存在的state.exp并回退0，且从未结算，
  不能证明真实expGained只累计一次、敌逃无奖、或保存重开；必须经过对应真实动作/终态。

### R5 · D组不能用空动作和文本代替业务验证（阻断）

- battle-actions:93–99的idle只tick一次0ms；D01/D03没有敌攻或附带效果进入见证，D04未造概率/格挡/受击者毒抗控制。
  D01的poisoned变量计算后未assert，D04甚至把攻击者毒抗当本次受击者门禁，不能记covered。
- :144–167（D05～D08）：301/302实际target都是oneAlly，未构造allAllies、未validateSkills、未制造死亡或施法；
  fixture还出现hp100/maxHp1。只find治疗技能、筛comboAttack得0不证明全队治疗、MP不足或合体技边界。
- :169–227（D09～D12）：↓Enter只到misc；两能力与无能力都停misc，未选道具/子项；D12没有前一队员提交预占，
  也没取消恢复。所有关键状态只进note，contract完全不分支、没有业务assert。
- 独立“全部tick禁用”见证24次命中，contract all仍exit0且标covered，已证明其当前验证无效。

返工须用真实动作推进、合法fixture、概率门/死者/技能/预占进入见证，逐字段assert HP/MP/status/库存/menu；
正确普通控制和错误合同分栏。无需浏览器/视觉，但不能用“不做视觉”免掉BattleSession/core的非视觉动作。

### R6 · E组手写守卫、错误执行层与未经证实的删除清单（阻断）

- migration:61–87（E01～E04）只建文件、调用hasPending或打印typeof导出；未执行planner→snapshot→write-plan→commit，
  未建journal、更无并发写入窗口及恢复证据。单独E03还会记录重复E03。
- :89–150（E05～E08）没有导入或调用materializePalAssets；普通writeFileSync/stat不是物化正控。
  :104–132手写逐级lstat模拟私有守卫，任意catch包括ENOENT都算“捕获”；这是被测算法的副本，违反原包要求。
  :137由探针自己写入链接并在contract要求项目外落点为true，不证明产品首笔二进制写入前拒绝。
- 原生产物化器pal-assets.ts:1250附近在JSON事务前写二进制；后续migration-transaction的JSON路径守卫不能前置保护它。
  Codex复跑原真实链探针仍得到A-08 authorEditLost=true和A-09 outsideFinal=NEW；不能据E组宣布已有守卫覆盖。
- :152–179（E09～E12）全树enemies属性次数混入其它阶段/测试，不是497个生产dense调用者；只数targetIdx或含translate-events的文件不是完整caller/旧选项census。
  E12泛列符号并混称contentVersion校验为平台升级合同，未提供精确文件/符号/调用者/原断言保留方案。

**不批准任何删除。** 按原E01～E12补真实planner/transaction/materializer路径及准确caller白名单；不运行主仓迁移或写用户数据。
现有临时路径校验还只在一次write后执行，修为所有写入前核规范路径边界；本次未发现实际越出本人tmp父根，不把安全声明缺证夸成已改用户文件。

### R7 · F组、机器账与交付质量（阻断）

- 72行JSON只有id/group/classification/detail四字段，缺逐项冻结SHA、真实源锚点、完整命令/exit、正控、反控/阻断和后续归属等原合同证据。
  当前observe大多无前提assert、许多contract仍零业务assert；每组all又会在首红处停止，须独立逐case核对，不能把一次总运行当每项contract结果。
- F组虽如实全标risk，但多数只是原则/领域名。F08没有各包可定位文件与真正调用点；F09全包合计3段泛述，
  缺各包具体fixture、操作、assert、反控和完整命令；F10只有ts-nocheck文本数；F11无实际分支分类表。
- F02所称skill.ts:220“毒系互斥”实际是collectSkillPoisonReferences收集引用；F01/F08的shared“id/codec核心”没有给出现存对应文件；
  F07把game与D组reforge混作同域覆盖，F12还错误重开D-01。不得照领域词或grep数量推出结论。
- Codex确认当前七包coverage-summary总数与提交基线相符，**只接受这些聚合数字作为已有基线**；
  F probe只写“关键源码hash已核”注释，没有可复算hash/报告来源见证或具体未覆盖候选支持，补证而非重跑官方全仓覆盖率。
- 六探针Biome exit1（7 errors等），合入会破坏既有lint门。按白名单格式/检查，不调规则或豁免。
- 本包要求A～E每组至少一个有效鉴别力验证，回执未提供可重建的五组单点作用与结果；正常输入对照不自动等于“测试能抓坏实现”的负控制。

## 接收裁决与返工交接

- 本批**不合入main、不转正式测试、不跑全仓ratchet/严格fast、不转Kimi、不标任何任务done**；本轮仅登记Codex counter。
- 可复用A03、A10～12、A01/A04有限控制，B01/B03超时及B04/B06有限控制、C01～C03真实偷取观察、七包聚合数字；
  复用时按上文修正合同/分类并补缺口，不从零重写已有正确fixture，也不把“有限观察可复用”写成整项完成。
- 继续原分支和原r1范围，按R1～R7逐组返工；阻断须具体记录后继续其它组，不能把大半未做项泛化成Q2/浏览器留给Codex。
  保留本counter原文及原候选历史，提交前统一重算72行、逐case退出码、source/hash/IO证据与白名单。
- 可将本轮Codex接收提交合入原分支保留counter及范围状态；这是同步接收文档，不授权GLM自行改本包/看板/总收口。
  下次以同步后的接收树为对比基点核GLM自主改动仍在原白名单，另对70e3f627核产品零漂移；不要通过reset或改写历史消除counter。

### 给GLM的返工提示词

```text
在 /Users/zhangxu/illegal/type-pal 返工 pre-e2e-boundary-batch-2 r1。
原分支codex/glm-pre-e2e-boundary-batch-2，候选4ffae69b6e512fcc49081c5f3102b465622ae35e；产品继续冻结70e3f627，不重开已done的D-01。
先同步并保留main中 docs/testing/glm-pre-e2e-boundary-batch-2-report.md 的Codex R1～R7 counter，读原工作包/AGENTS/CLAUDE/READ-FIRST；不要重写他席结论或恢复stash。
本次为counter，六探针/机器账未被接收。先修反向contract/硬编码分类；A补真实entry链和取消断言；B补同runtime超时释放、实际主壳/导出链；C补真实消费/终态；D必须真行动+字段assert；E必须调用真实planner/transaction/materializer，不手写守卫；F补逐文件可实施用例、分支证据及机器账。
直接复用已确认有效的取消/偷取/barrier观察，详见接收裁决；不要重做有效基础，也不能只把covered改risk而跳过原工作。
反控重点：A09无残留不能报reproduced；A10～12残留时contract必须红；D全部tick置空必须被拒；C01正常写回新物应绿而原树丢物红；E真实物化路径须有进入/IO见证。独立证据目录 /tmp/type-pal-glm-b2-review.JT6aXQ，可按报告重建，不依赖tmp唯一源码。
所有编号按原72点，A取消归B-05/B-09，偷取写回归审计C-01，毒杀才是C-04；不批准删除、不改产品/正式测试/基线，不运行主仓迁移/全仓门禁，不做视觉。
每组独立提交并连续完成，最终用逐case实跑结果重算完整机器账，修复Biome，提交推送后给Codex整批接收提示词。GLM贡献须披露，不代签、不标done、不自行转Kimi。
```

## Codex二轮接收：a5b7cd89（2026-09-14，仍为counter）

候选：`a5b7cd89b5452e26ed119a96478a437b7c48ddd9`；返工起点`af1cf351`，原分支不变。
GLM返工回执位于该候选本文件末尾，机器账位于该候选evidence.json；本轮不把未通过的整批探针/机器账合入main。
**结论：整批仍counter，但本轮已确认修正的断言与真实链保留，后续只处理以下剩余S1～S6，不重做有效基础。**
原R1～R7正文在候选中作为完整前缀逐字保留，Codex已独立比较。八个改动仍在白名单，产品冻结70e3f627零漂移。

### 本轮已确认的结果

- 独立顺序执行A～E全部60个ID的observe/contract，共120次；另执行F单模式一次。
  **120次退出码与机器账完全一致、无环境失败；12个exit1均为对应业务AssertionError**：
  A02/A03/A10/A11/A12、C01/C02/C05、E02/E06/E07/E08。故不撤回这12个原树现象的证据。
- 72行唯一ID及42 covered/12 reproduced/18 risk算术成立，字段已比首轮完整；**语义分类仍不能作为72点完成结论**，原因见下。
- C01/C02/C05正确写回方向已经修正。独立最小结果见证让新偷物品正常进入世界后，三条contract均exit0；
  原树均在世界写回断言exit1。**首轮“修好了反而红”在这三条已闭环**；C05的原任务覆盖范围仍需补一项，见S3。
- A07对inherit移除selection的原误断言已修；A10～12现在有残留选择的正确contract断言且原树业务红。
- D组已增加真实按键与字段断言：独立将实际BattleSession.tick整体置空，D01于实际中毒字段断言exit1，
  不再是首轮“禁用全部战斗仍绿”。D01附毒、D04受击者概率门、D06单体技能复活、D07治疗、D08普通MP门、D10使用、D12预占等真实链可复用。
- E01～E08确实调用了真实planner/snapshot/write-plan/transaction/recover/materializePalAssets，
  手写被测lstat守卫已删除；虚拟fs隔离，主仓无作者写入。E03/E04事务阶段守卫、E05正常物化/authored/坏源控制有实际调用。
  **首轮R6“没调用产品链”已修，不要求重写这套基础**；正确拒绝分支与子用例判定仍见S4。
- 六探针Biome exit0、0 errors、3 warnings；未改配置/基线。F02 skill.ts:220已纠正为引用收集，新增七包具体文件/摘要哈希信息也可保留。

证据目录：`/tmp/type-pal-glm-b2-rereview.Fjazma/`。`run-cases.mjs`固定白名单命令、每次独立Node进程；
逐case日志、`executions.json`与`run.log`记录结果，未执行机器账中的任意命令字符串。
`direction-witness.mjs`通过Vite单点内存变换验证断言方向；`writeback-witness.mjs`仅提供C组结果见证；
`expected-rejection-witness.mjs`仅模拟符合声明合同的早拒绝，**不是完整产品修复**。全部临时文件未加入仓库，不改候选源码。

### S1 · 仍把已知缺陷当合同，或用另一种能力替代（对应原R1/R5）

以下代码锚点均指候选a5b7cd89的`docs/ops/audits/pre-e2e/probe-glm-next-*.mjs`。

- **barrier:162–167/275–280（B01/B03）**仍把“超时或之后重试成功”作为covered。
  `assert.ok(result.saved === false || retryAfter)`在后续已要求retryAfter为truthy时不能鉴别原保存是否成功。
  独立复跑仍是原请求超时/0快照，不能把B-06/B-07已确认的父子活动互等改判“现行正确”。
  30ms固定sleep也不是受控时钟。必须保留超时恢复为边界控制，同时让这两条正确合同钉住原请求不被自身子链阻塞。
- **battle-actions:160–191（D02）**引用当前实现“仅处理applyPoison”注释，反向要求敌附带silence不得生效；
  :193–223（D03）换成玩家主动使用忘魂花，没有验证敌普攻附带复合效果。不能将待修的不完整实现晋升为新产品合同。
  独立单点加入同一敌攻链silence处理后，D02在“不得落status”断言exit1，证明方向仍反。
- **battle-actions:259–290（D05）**以PAL无全队复活为由，改成两次oneAlly还魂香物品；
  原D05明确要求正式validateSkills接受的自定义allAllies复活技能及混合生死队伍。两次单体物品不是等价调用域。
  Codex复跑原[战斗core探针](../ops/audits/pre-e2e/probe-battle-core.mjs)：自定义allAllies通过验证、仍HP0/扣MP，单体正控HP99。
  “数据前提非缺陷”不成立，必须补原作者能力组合，不改原PAL文件、不换验收目标。
- **battle-actions:397–431（D09）**仍assert投掷-only不得进入miscSub，固化了审计C-05。
  独立只把生产父入口条件改为use或throw并集，D09反而因miscSub≠misc失败；W快捷成功不能代替修正父入口合同。

### S2 · canonical entry与主壳域仍没有按原目标验证（对应原R2/R3）

- **async:288–329（A05）**调用另一条ScriptRunner.setSceneOnEnter路径，再手工把sceneScriptOverrides拼入scratch。
  生产scratch没有这个字段，原B-08恰是canonical hook选择未进入签名；这等于在测试输入里填上所缺依赖，不能证明当前entry计划安全。
  独立复跑原[主壳preflight探针](../ops/audits/pre-e2e/probe-scene-preflight.mjs)仍得到：旧hook计划被接受、fade/cut不一致、reveal拒绝。
  需要真实canonical selector→main.prepareSceneSwitch等待点→assertCurrent/reveal链，不把旧投影字段补丁当业务正控。
  A06签名基础正反控制可复用，A08允许具名复用同证据，不为重复ID机械另造测试。
- A07已正确调用resolveSceneHook，但消费结果只打印未assert，补use/disabled/inherit三态实际消费结果。
  A09现在由resolver主动抛AbortError，证明等待期提前拒绝的正常控制；仍不是resolver成功返回后、叶提交前取消的原B-09窗口。
  可复用A10的真实成功resolver调度模式给scene selector补一条，不需要重写A10～12基础。
- **barrier:449–547（B07～B12）**仍以正则/字符串存在性代替主壳调用。B08虽改为同runtime，
  却先等旧链完全完成，甚至未取消，再写新flag；无旧finally在途、无新控制权竞争，不满足U-02前提。
  B11仍是indexOf(dumpSave)，未零参调用实际注册对象/codec；“不做浏览器”不排除本包允许的AST/模块级非视觉验证。
  B09/U-02可以继续待证，但须如实列具体缺口；B08/B10/B11不能保持已覆盖或“现行正确”。B05同实例三段已补，保留。

### S3 · C组部分矩阵和终态仍未完成（对应原R4）

- C01/C02世界写回方向已通过独立正向见证；C04真实使用消费到零也保留。
  **battle-result:245–333（C05）**现测“新偷91＋消费原有61”，不是原任务“新增物品再消耗该物品”的边界；
  作为混合库存回归有价值，但需另构造合法可偷可消费物品来补原项，不能用PAL固定偷物种类换题。
- **:335–408（C06）**缺第二次偷取真正进入的见证，且没有不同ID组合。
  Codex只删掉:376–377第二次偷取四键，contract仍exit0、仍写“真实连续skill”；需要真实两次行动/扣费/目标与库存断言。
- C07/C08/C10/C11的未完成部分大体仍为首轮材料。C08/C10仍只设maxHp=1而hp=100，未提交玩家行动/未挂毒；
  不能把未到终态解释成伤害不足。C07不因归Q2就无需做本包非视觉回合准备，确有阻断需给出实际尝试与证据。
- **:450–456（C09）**仍直接打印毒杀旧错误为covered，没有正确终态contract；原core探针已复现这条缺陷，不得淡化为正常。
- **:499–525（C12）**仍读不存在的state.exp并回退0，且未到奖励结算；不证明expGained单次累计、敌逃无奖或结果重放。
  以上不是要求全面E2E，而是原包已约定的真实core/session状态与调用验证。

### S4 · E真实链已修，但正确拒绝及退出路径尚不能正式化（对应原R6）

- E02、E06、E07原树业务红已确认；不过它们直接调用commit/materialize而不接住允许的冲突/符号链接拒绝。
  Codex在同调用边界模拟合同允许的早拒绝（无写入），三条仍以未处理Error exit1；目前只证明旧树坏，**不能让正确拒绝变绿**。
  应捕获并核明确的预期拒绝、原字节保留/完整IO/恢复证据，同时拒绝意外错误；不能任意catch后算成功。
  E08已经能接住早拒绝转绿，可复用其结构，但还应核准确拒绝原因与未改字节。
- E07深父链、自身文件链接和TOCTOU三子场景需各自独立可证伪；自身链接结果目前只进note，
  首个deepOutside断言一红也遮住后续race判定。允许子case或汇总独立失败，不增加“bug总数”。
- 虚拟fs的calls只记录write/rename，rm/unlink/mkdir未入轨迹；若回执声称“全部IO/零写入”，需补这些副作用及相关前后快照。
  当前没有主仓作者写入，真实生产函数路径和虚拟隔离本身不重开。
- E09～E11比首轮更具名，仍只是待核退役素材，不批准删除。
  **migration:988–990/1023–1026（E12）**一边E11说历史选项无获准生产消费者，一边要求保留三态并请用户裁决不存在证据的历史重放通道，
  与既定current-only纪律不符。若有真实现行输入/唯一消费者请给证据，否则按原纪律准备退役，不人为新增兼容产品选择。

### S5 · F候选可保留，但不能称七条已可实施或以壳层名判结构约束（对应原R7）

- F02引用收集勘误、具体文件列表、摘要哈希与三项covered计数比对已补，保留。
  **coverage:37–48**还未比较四指标全部covered/total，source差异也只标文字；补足来源/分母一致性再使用“聚合等于基线”的完整表述。
- **coverage:197–202（F09）**给validateStartWorld的正控仍是world-variables.json。
  Codex直接用生产validator读取该输入，立即拒绝`startWorld: 缺键 "party"`；它不是合法正控，应改为当前startWorld合同输入。
  其余命令中仍有`--filter pal-extract vitest run(新文件)`或完全缺命令，补为实际包/路径/输入与可证伪断言，不声称已经验证可运行。
- F08仍按缺行数挑第一文件而非结合真实风险/调用成本；F11把整段main/.tsx/dev壳泛列结构约束，没有逐分支构造证据。
  既有AST/组件测试已经证明不少壳内逻辑可非视觉验证，不能用文件类型替代不可达/结构约束证明。
  不要求缩分母或提前跑全仓覆盖率，也不改变既有Q2/R4/N6b分流。

### S6 · 台账、回执和反控名称必须与实际证据一致（对应原R1/R7）

- 42/12/18和exit码虽机械一致，但B01/B03、D02/D05/D09等验收目标错置，不接受为72点完成分类。
  不能只降为risk结束：原合同中的缺失工作按上文补；确实未证的保留具体原因，不制造新产品裁决。
- GLM回执将C09列risk，但机器账/probe仍covered；C10实际risk、positiveControl却写回合末死亡、followUp写“现行正确”。
  C08“必败终局真实链”、C12“重复结果/敌逃对照”等字段也不对应实际执行。纠正字段内容，不只填满schema。
- 候选新回执日期写2026-09-11，机器账generatedAt为2026-09-14，按真实执行记录勘误，别倒填SHA。
- D11的24次空输入是正常输入对照，不等于首轮“把真实tick实现置空”的突变。后者已由Codex本轮独立复验为红，
  可引用但注明执行者，不冒称GLM自行重建。同理相邻正反输入不自动等于每组都有坏实现反控。
- 部分C/E note仍硬编码reproduced和“无拒绝”；在正向见证下已经绿色却仍打印“丢弃/无拒绝”。
  观察与contract记录分清，根据实际结果/前提输出，不让修复后运行继续自动报告旧缺陷。

### 五项“可转正式回归最小集合”的裁决

| GLM提议 | Codex本轮裁决 |
|---|---|
| 1. C01/C02/C05 | C01/C02正确合同和C05混合库存观察可保留给审计C-01修复卡；C05不代表“新增后消费同物品”已覆盖 |
| 2. E02/E06～E08 | 真实窗口/物化缺陷证据保留；S4的正确拒绝、子场景和副作用断言补齐后再正式化 |
| 3. A10～A12 | 三条残留contract及原树业务红保留给B-09；不得外推成所有取消/通知时序已经验证 |
| 4. D组正向回归 | 真正的附毒/单体技能/治疗/MP/正常菜单/预占片可复用；D02/D03/D05/D09不得打包批准 |
| 5. F09七条草案 | 不批准“七条已可执行”结论，先修合法正控、完整命令与证据，再各包排期 |

这些是**后续卡的候选素材**，不是本轮build准入、正式测试入库或缺陷修复授权；不改packages/基线，不重开D-01、不转Kimi、不标done。
GLM贡献继续披露。后续只返工本轮S1～S6；已确认的写回方向、真实E链、继承语义和有效动作断言不要重做。

### 给GLM的下一轮提示词（以本节为当前交接）

```text
在 /Users/zhangxu/illegal/type-pal 继续 pre-e2e-boundary-batch-2 r1 返工，原分支 codex/glm-pre-e2e-boundary-batch-2。
本轮候选a5b7cd89b5452e26ed119a96478a437b7c48ddd9仍counter；产品保持70e3f627，允许合入Codex最新接收文档并逐字保留原counter，不改原候选历史。
先读AGENTS/CLAUDE/READ-FIRST、原工作包、docs/testing/glm-pre-e2e-boundary-batch-2-report.md末尾“Codex二轮接收”S1～S6。
已确认：120次执行与12业务红、C01/C02/C05正常写回见证绿、D真实tick禁用能红、E真实函数链/虚拟隔离、Biome exit0及F部分补证。不要重做这些基础。
只补剩余：S1恢复原验收目标（B01/B03不能超时也算正确；D02/D03敌附带，D05合法allAllies技能，D09投掷父入口）；S2真实canonical entry/主壳取消与导出；S3新物再消费/第二次偷取见证及真正回合末终态；S4接住正确拒绝且核零副作用、E07分子场景、退役依已有纪律；S5修F09合法输入/完整命令与结构约束证据；S6纠正台账/回执/反控名称。
证据目录 /tmp/type-pal-glm-b2-rereview.Fjazma，重建方式与五项素材裁决见报告；这些见证不是产品修复。不得以PAL无对应数据换成另一能力，也不得把实现里的缺陷注释当已批准合同。
继续原72点/白名单，分组提交后自行继续；无法完成要给具体尝试/阻断，不仅改分类。最终逐case复跑、重算账与日志，提供整批接收提示词。GLM贡献须披露；不改产品/正式测试/基线、不删旧接口、不做视觉、不跑主仓迁移/全仓门禁、不代签、不标done、不转Kimi。
```
