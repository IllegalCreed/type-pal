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

---

## GLM返工交付回执（R1～R7，2026-09-11）

前置：Codex counter 原文与原候选历史完整保留（见上节与本分支 Git）；返工起点=合入接收提交后的 `af1cf351`（报告侧逐字保留 theirs）；产品冻结 `70e3f627` 全程零漂移（本批仅改 8 个白名单文件，packages/scripts/projects/data/锁文件对 `bce7599a` 零 diff）。

### 提交与白名单对账

- 返工提交：A `95b530d1`（R1/R2）、B `5c79cbbc`（R3）、C `56243171`（R4）+ `8bbe80c7`（C01/C02/C05 合同方向修正）、D `99f133c2`（R5）、E `4cc3bd0a`+`97f32f47`（R6）、F `2ec2bd1a`（R7）、`c8a039ae`（六探针 Biome 0 + 机器账重算）。
- 白名单：仅六探针 + 机器账 + 本回执；无白名单外文件改动（`git diff --stat bce7599a -- packages/ scripts/ projects/ data/ pnpm-lock.yaml` 为空）。

### 逐组返工要点

- **A（R1/R2）**：修反向合同与归属（A02/A03=B-05，A09-A12=B-09 相邻）；A05 真实 ScriptRunner `setSceneOnEnter` + capture/assert 生产原语；A07 三态真实消费；A09-A12 精确残留断言（`residual 必须 undefined`）+ 同输入正控 + AbortError/通知计数。
- **B（R3）**：B01/B03 完整 confirm→battle/teleport 父子链（barrier 有界或链后重试二居其一，不再误断"保存必成功"）；B05 同实例三段（挂起超时 40→同实例重试 50→释放后成功 60）；B08 旧链 await 彻底结束后新权威。
- **C（R4+方向修正）**：C04-C06 真实菜单键序/混合链/连续偷取；**C01/C02/C05 修正合同方向**：正确合同=新偷物应写回世界（修复树绿），原树丢弃新增 ID（审计 C-01）业务红；C01 备注审计编号 C-04→C-01 纠正。
- **D（R5）**：全部真行动+字段级 assert：D01 真实敌攻链毒入 `p.poisons`；D02 equiv 仅 applyPoison 合同与 use 链 silence 域分栏；D03 复合效果逐字段（sleep=2/hp-1）；D04 门禁矩阵（受击者毒抗门）；D05 两次真实还魂香复活（含死者选人+当回合自动出手）；D06 真实技能施放（hp=10/mp=84）；D07 全体治疗+同链死亡门禁；D08 MP 门；D09-D12 真实菜单路由/预占（`pendingItemUses` 提交时扣减+Esc 释放）；**D11 含 24 次全空 tick 禁用输入负控（被拒）**。
- **E（R6）**：真实 `createMigrationPlan/snapshotOf/loadProjectMigrationSnapshot/assertProjectSnapshotCurrent/buildMigrationTransactionChanges/commitMigrationTransaction/recoverMigrationTransaction/materializePalAssets` 全链，不手写守卫；E03/E04 真实守卫正控（journal 后修改被拒+恢复同拒+retired 预检零写入）；E06/E07/E08 真实物化逃逸复现（含多层父链/TOCTOU/JSON 层分栏）；E09-E12 准确 census（game 同名异符号分栏、定义排除、E11 双形式匹配 5 处全测试）；虚拟 fs 所有操作前校验路径边界；不批准删除。
- **F（R7）**：见证链（baseline+七包 summary sha256+聚合==基线断言+文件同内容标注）；F01-F07 逐包具体文件+真实消费点（如 decodeRngFrames→game/shell/rng-player.ts:19）；F02 现场读取 skill.ts:220 纠正 r1 误标（毒引用收集非互斥）；F09 各包 1 条共 7 条可实施用例（fixture/操作/assert/反控/命令）；F10 ts-nocheck 13 文件清单；F11 十行 classified 分支表；F12 修正去重顺序（D-01 不重开）。

### 72行机器账（现场重算，逐case实跑）

- 总计：**covered 42 / reproduced 12 / risk 18**，无 pending/空行；每行含源锚点/命令/observe+contract 退出码/红因/正控/反控/后续归属（[机器账](glm-pre-e2e-boundary-batch-2-evidence.json)）。
- 组内分布：A 7/5/0、B 10/0/2、C 5/3/4、D 12/0/0、E 8/4/0、F 0/0/12。
- reproduced 12 = A02/A03/A10/A11/A12（B-05/B-09 族）、C01/C02/C05（审计 C-01 写回丢弃）、E02（A-08 采样前窗口）、E06/E07/E08（A-09 物化 symlink）——全部 contract 业务红（exit1，正确合同在修复树应转绿）。
- risk 18 = B09/B12（主壳域需 B08 反例先行/浏览器壳）、C07/C08/C09/C11（养蛊九回合/战败写回/毒杀结算 Q2、同轮死亡顺序待裁决）、F01-F12（静态候选分流）。
- 退出码约定：observe 全 72 例 exit0；contract reproduced=exit1（红因逐行登记）、covered=exit0、F 单模式；**failures=0**（120 次探针调用无一环境失败）。

### 鉴别力验证（每组至少一项）

- A：A09 无残留（绿正控）vs A10-A12 残留红——同 fixture 双向鉴别。
- B：B05 同实例超时重试链（50ms 重试仍超时→60ms 释放后成功），非一次性观察。
- C：C03 已有物品写回 count=2 绿 vs C01 新增丢弃红——同一 writeBack 入口双向。
- D：D04 门禁矩阵三段（rate 拒/受击者 res 拒/对照中毒）+ D11 全空 tick 被拒。
- E：E03 守卫拒（绿）vs E02 采样前窗口不拒（红）；E08 JSON 层拒（绿）vs 物化层不拒（红）。

### 可转正式回归最小集合（由 Codex 复核准入）

1. C01/C02/C05 写回保留新物合同（审计 C-01 修复卡验收断言）。
2. E02 采样前窗口作者修改检出（A-08 修复卡）；E06-E08 物化 symlink 首写前拒绝（A-09 修复卡）。
3. A10-A12 selector 取消无残留（B-09 修复卡）。
4. D 组菜单/预占/复活真实键序断言（现有行为正控，防回归）。
5. F09 七条定向补测用例（各包准入后）。

### 未测/阻断与后续归属

- B09/B12 主壳域、C07-C09/C11 Q2 域、E11 历史重放通道需用户裁决、E12 删除候选不执行——均已在机器账逐行登记。
- 根因归并：取消域→B-05/B-09；偷取写回→审计 C-01；毒杀→审计 C-04；迁移窗口/物化→A-08/A-09；旧接口→N6b 前清理。
- 本批不代签、不标 done、不转 Kimi；GLM 贡献已披露（全部返工提交 Co-authored-by: GLM）。
