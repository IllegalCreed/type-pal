# Wave Q r3：Codex 独立复核（2026-10-01）

结论：**counter，Q卡保持rework**。旧Q03四针hash、默认超时、DATA隔离合同有实质闭合；
但新五针总索引未同步、15格式错误、回执SHA及合同账仍错，Q07/Q08整体缩围未获准。
不合main、不done、不清活动树；不运行official ratchet/protected fast或正式覆盖结算。

## 候选与实跑

- 测试树 `ada23d3e659f3239d6ac7e65d467711c19d061a9`。
- 本地/远端tip `efff13afeb0b22f44e45860dfbe38fb39bd59864`，与测试树差分
  确实只改wave-Q/receipt.json的candidateHead字段，不改包内源或测试。
- 派发 `8b3ca062953b17a12178f8d1a9e36657971234b1`，
  冻结 `3ac9a2e2f6aba8a5cc97640c18fef8549d199380`不变。
- 三包串行执行 `env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/<pkg> test`
  （追加JSON reporter/outputFile），之后各自typecheck，再根lint/docs/diff/verifier。

| 包 | 全包实跑 | Q新文件 / 例 | typecheck |
|---|---:|---:|---|
| reforge | 2150/2150 | 13 / 98（audio12/12） | 零诊断 |
| game | 2788/2788 | 2 / 15 | 零诊断 |
| pal-extract | 360/360 | 1 / 3（默认门） | 零诊断 |

合计 **5298绿**。最终16文件/116条file×fullName×status与新实跑逐条相同，无漏/增项。
README Q01行6（+fixture）、receipt deliveredCases/newCases116正确；这些子项关闭。
docs815 Markdown/4277链接/245任务零；区间diff零；verifier716/716、
Owner交集0、429路径白名单通过。
全包有jsdom HTMLMediaElement.pause未实现提示，不冒称stdout/console全部归零。

[机器证据](codex-q-r3-review-20261001.json)保存全部116逐例、计数/命令、
三包完整报告hash、39枚复算、五枚独立重放及门禁原文。新报告在
`/tmp/codex-q-r3-review.EyEHQD/`。Vitest/pnpm技能用于真实实跑JSON、
typed IO/业务反控检查及串行包门；未改配置、规则或依赖。

## Q-R2-01关闭：Q03四枚重采对应最终audio

读取全部39枚三态JSON/raw/meta/索引及old/new：
正控/恢复全绿，变异恰一指定file/fullName业务红，三态执行集合/数相同，未见skip或运行异常。
Q03-RC1～RC4三态源hash与最终audio
`5f1f78ff0eda105bb476df7d812dc943f639c2b009c1edef6148286a1f7feb5b`
一致，变异字节重建hash也对应；原34枚索引/meta均一致。
旧四针不对应最终源项关闭，**本轮复算，不冒称另行执行全部34枚变异**。

各raw是JSON reporter实际notice（正/恢复64B、变异62B），目标断言全文在完整JSON。
notice中没有AssertionError不单独拒收，不要求为过审更改reporter或业务断言；
Vitest rejects的Error前缀也不单独判环境红，保持原文。

## Q-R3-01：Q10五枚业务成立，总索引却仍是旧hash

Q10-RC1～RC5的per-counter meta original/restored及重建mutant均匹配最终cli测试，
但counters.json五项全部不同；“39枚总索引全VALID”不能按布尔值accept。

- 最终ada23d3e/tip文件及五枚meta original/restored：
  `e46949e5fe6b9fbf92b46b2cc326aaf68fc9d159c6427580d867912baa3d03bd`。
- counters.json五项original/restored却均为：
  `30f0d88dc711f7054b9effaf8b4556a0e2d53fd793e50ad9838cadca99f8383f`。
- 五个总索引mutatedHash也全部与final重建/meta不符，逐枚值见机器账。

Codex另在fresh临时副本真实重放五枚，不筛相邻例：每枚3执行、2绿/1指定业务红、
无未处理异常；基线及最终恢复各3/3绿，恢复副本hash与候选相同。
STORE值、role spriteNum、giveItem、消息末字节、LEVELEXP记录数是五个不同观测断言，
不因共享两个fullName自动判重复。候选/main产品源从未改动。

已有meta/JSON业务成果保留；以最终真实meta重建索引，断言index/meta/实际三态逐枚相等。
若只同步登记且不改测试，五针无需为旧hash问题重造业务；
后续测试/格式导致源变时才在最终文件上重采，不手填hash掩盖不同运行版本。

## Q-R3-02：最终lint15格式error，回执零诊断说法不成立

本次 `pnpm lint` **exit1，15 error / 0 warning / 0 info**：
Q10-RC1～RC5各自positive/mutant/restored.json全未正常格式化，共15文件。
不是既有告警或反控字符串豁免，不能新增ignore、降规则；在本卡白名单正常格式化，
重算证据文件hash（如有登记）并重跑根lint完整0/0/0。
receipt“2925文件0/0/0”不是当前tip的可复核最终结果，须按最后门禁更新，历史另标。

## Q-R2-02及COMMON-01 DATA路径成立，元数据/合同账仍counter

cli-isolated已无自定义超时，默认门3/3及pal-extract360全绿，旧60000项关闭。
DATA15chunk格式与当前公开parser一致：STORE18B×1、PLAYERROLES900B SoA、
SPRITEUI正向encoder、LEVELEXP100条等；源相对REPO_ROOT/RAW/OUT全部派生至mkdtemp。
CLI在临时树输出事件及数据表/图片/blob，再在缺RNG.MKF图像边界拒绝；
不冒称整个提取成功，不触真实raw/extracted。
一手锚点cli.ts:74-77、296-407，parsers/stores.ts:35-53、
player-roles.ts:90-112、data-misc.ts:29-35；SDL global.h:252/299-303、global.c:292字段同义。
本轮验证正常的预期非零退出，不额外宣称spawn错误/取消也已实测。

仍需以下准确登记（Q-R3-03）：

- receipt.json:8 candidateHead仍是
  `ada23d3e (r3 测试候选树完整 SHA；其后仅 docs-only pin 提交回填本字段)`，
  **不是40位SHA**。应是上方完整ada23d3e…，说明仅放candidateHeadNote；
  该Note开头也仍是r2，应统一当前口径。不能将tip/pin冒称测试修改提交。
- contracts.json仍113项，无Q10三条CLI合同，且C099～C113的15条game合同误记package=reforge。
  补3条并纠正package/仓库路径，file/fullName与最终实跑对应。
- 原账oracle/classification模板不能代替source/caller/oldAssertion/axis/精确oracle。
  每条按共同协议给可复核锚点；已有效的业务断言保留，不要求重做已证合同。

## Q07/Q08裁决：接受具体排重轴及展开方向，不接受整族缩围

直接读Q08新第6/8/10行旧测试**真实断言**，以下具体existing-proof成立：

| 行 | 实际旧证据 | 可接受范围 |
|---|---|---|
| 6 | game battle-opcodes.test.ts:1386/1436/1460/1482；battle-system.test.ts:3513-3547 | summon满血/脚本/抗性/动画，transform保血/脚本/音/底锚；单敌无空槽不扩容 |
| 8 | game turn-queue.test.ts:9/23/35/63/69 | dex排序、dualMove双入列、稳定同速、两种空输入 |
| 10 | game battle-system.test.ts:145/160/1495/1549 | 逃跑出屏/停顿/终态返回/HP不变/玩家动画 |

第6行最后测试名称虽称“空槽复用”，实际构造单敌无空槽并断言不扩容，
不要将此一例扩大为正向死亡空槽复用全轴证明。
第8行只证buildActionQueue，不覆盖列名中的全部performAction/selectAction。
第10行四锚只证逃跑推进，不提供captureEnemy或全部flee判定；
game actions.test.ts:1025-1080另有成功/失败/boss等旧证据，可按真实完整fullName/断言补账，
无需重复旧测或虚构不存在的API。

r3补充“typed session-driver逐合同展开，不作为缩围”方向可接受；
但账正文:30/37仍把Reforge coop/session文件挂game，第37及:53-58仍称
headless不可达、全公开合同已覆盖并整体申请缩围，与补充:45-49及README继续计划矛盾。
被引session/round-flows文件实际仅在packages/reforge/src/battle，不是game证明。
同步表/结论，只跳过已证具体轴；无合法输入须逐未命中条件/caller/可证伪观察举证，
成本高或另引擎同名不能证明不可达。剧情及新机制真值停线保留，不批准越界测试。

原700合法未重复例/50组/50有效反控/10实际非剧情流程不缩；
当前116/39是部分，未扣排重前还差584条运行数/11枚提交数。
Q10图像段及其它合法残余可按原卡继续；现行合同不足须逐项申请，不凑量、不恢复旧机制。

## 边界与交接

r3未改浏览器证据，F1撤回保持关闭，本轮不重复已有浏览器操作，
不由本次代码/门禁审核扩大为10流程全部accept。
D-Q01-1保留独立产品draft，不随GLM返工修产品；私有覆盖未新测，CLI子进程
不自动算父进程V8覆盖，未正式结算或宣称85%。
完整r4提示词落在[Q任务卡三审段](../../ops/tasks/TEST-GLM-WAVE-Q-1-runtime-residual-tenfold.md#codex-三审2026-10-01r3)。
本次仅在Codex验收分支新增审查/机账并更新任务卡、看板、导航；文档工具37/37、
docs819 Markdown/4326链接/246任务零问题、根lint2749文件完整0/0/0、diff零。
