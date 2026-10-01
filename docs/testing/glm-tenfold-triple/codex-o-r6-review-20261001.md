# TEST-GLM-WAVE-O-1 r6 独立复核（2026-10-01）

结论：**counter / rework，468/700仍为部分交付**。上次六针漂移已闭合，62份三态存档hash/
身份对应，硬门全绿；合同账仍不是实际排重证明、残留非法fixture与未证/重复轴、runner仍漏拒收。
[机器证据](codex-o-r6-review-20261001.json)明确这是存档复算，非62枚独立业务变异重跑。

## 固定对象与门禁

- 本地/远端HEAD `1d805509af6ecd94a95c0965d373bf98ccde123c`；
  receipt锚 `066308e36db3a5eee6897abe6888c3446a684a6d`到HEAD仅receipt变化。
  066308本身是receipt格式提交，勿称“最后非docs”；测试/证据提交另有46041fc3e。
- 派发 `8b3ca062953b17a12178f8d1a9e36657971234b1`、冻结
  `3ac9a2e2f6aba8a5cc97640c18fef8549d199380`不变。716/716源、O105源、
  **658**白名单路径、ownerOverlap=0通过。
- 独立detached临时树offline frozen-lockfile安装，复制gitignored extracted语料到副本；
  未跑真实工程migrate/extract/bake、未写真实数据或活动贡献者树。
  串行全包migrate **704**、content **1410**、shared **154**，合计**2268全绿**。
  三typecheck零；root lint **3153文件，完整0 error / 0 warning / 0 info**；
  docs **815 Markdown/4285链接/245卡、零问题**，diff/verifier通过。
- 468条新file×fullName×status逐条与directed一致；实际包分布**254/188/26**，
  receipt content194不对。执行匹配不等于468条均合法未重复。
- 62枚index/result/实际original-restored/rebuilt-mutant SHA256与三态身份、退出、指定单红/
  恢复passed全对应最终树；六枚O08-CC1/2、O10-CC2/3/4/5已重采。
  r4剩余50枚文件逐字保留，r6新增6枚存在；**O-R4-02证据层关闭**。
  仅做独立patch重建与原始记录审计，没有独立执行全部62枚变异。
- 七桥/两fixture-oracle及canAct旧删除仍关闭；以下item-use是另一个此前未闭合的残留，
  不推翻那些具体闭合项。私有migrate三项比率仅作者对照，不冒称正式ratchet或main收益。

## 窄counter

### O-R6-01：合同账仍误导；已确认重复/未证轴（P2）

468行oracle全是首条expect操作数，没有matcher与预期结果，甚至首行map解构被截断。
oldAssertion依“最近token标题”自动匹配，常用“新fullName/断言组合不重复”作结论，
没有逐条件证明。source/caller是整文件import域、还混入fixture路径，不是各合同源守卫/调用锚。
**O-R4-01不关闭**；补真实条件/caller/合法输入/旧fullName与断言行/完整可观察oracle。

- `content/src/item-use.glm-o.test.ts:84–95`声称allAllies不需目标，但传现存hero，
  只验reason不等missing-target。旧`item.test.ts:766–792`已经传missing-character，
  精确验success/两人HP/目标列表；新例没有该缺目标轴，不算新合同。
- `item-effects.glm-o.test.ts:155–173`的chance50失败/不消耗/HP不变，
  旧`item.test.ts:898–928`相同公开入口和阈值已验失败reason、原world引用与原inventory不变；
  把rng0.49换0.9、物品与HP数字换值不是新合同，删除或登记existing-proof，不计新增。
  成功路径新精确HP结果不在本条一并判重复；仍须逐条件说明。
- `item-effects.glm-o.test.ts:24–38`标题“死亡队员跳过”只有HP60/100，无死亡输入；
  `:72–89`标题“0/上限钳位”只有99→49、100→50。更正实际轴，或排重后补合法输入，
  不按标题虚算覆盖、不要把不可达输入塞进typed路径。

### O-R6-02：item-use仍有as never和Record扩展桥（P1）

`item-use.glm-o.test.ts:12–37`把world整形强作never，
CharacterInstance少必填exp（`character.ts:187–193`），传入typed公开
`resolveWorldItemUse(world: WorldState)`。不是unknown校验入口的坏数据合同。
`:39–48`Record扩展后强作ItemData，`:73`再靠inventory:unknown桥修改never，
不能用tsc/lint绿豁免。改完整WorldState/CharacterInstance、ItemData/UseSpec typed构造，
直接合法赋值，不补产品字段、双桥或业务mock。

### O-R6-03：runner仍漏拒收与异常原始输出（P1）

`run-counter.mjs:63–83`的assertPhase在control/restored仅验exit与failed数，
零执行clean实际被接收；无多重file×fullName比较、叶状态要求，target只substring且不核file。
用本轮[P真实Vitest未处理异常探针](codex-p-r35-review-20261001.json)的1目标AssertionError+
1未处理Promise异常报告，实际提取此纯函数复核仍接收；不是伪造runtimeError计数字段。
`:36–46`只保存stdout、不保留stderr/signal/spawn；JSON不能代替该版本真实异常区段。
`:206–215`失败fallback做全局prune，超出“只清本次树”。

收紧唯一判据、完整三态身份/状态/精确目标/有效退出与signal/spawn，
保留stdout+stderr、拒真实collection/runtime/raw harness/未处理异常；
补实际进程自测，局部finally回收，不全局prune。保留已核62份业务记录，
变化仅重采受影响针，不因工具漏洞直接把所有存档判无效。

### O-R6-04：最终计数/来源及未完账（P2）

r6唯一468/包分布254/188/26、658路径从最终树生成；
194/595路径与content194不得再标最终门，历史数字保留但注明历史。
receipt“30组”与62、README末尾“O07–O10未建模”与已交r6互相矛盾，改成真实残余。
固定测试/证据锚与receipt-only区间区分，remoteFinalCandidate字段不是自引用循环pin游戏。
原**700例/60组/50有效反控**不缩；目前原始468尚含上述重复/未证输入轴，
至少原232例缺口还在，新62针不能替代700合法合同。继续已列合法残余，缺合法范围逐条件举证申请。

## 交接

修改item-effects的源/标题/执行集后重采O08-CC6/7、O09-CC12；
item-use改变后重采O09-CC6/7。其它不变记录保留，后续新增时按实际受影响集合判断。
本轮不合main、不标done、不清贡献者树、不运行official ratchet/protected fast、不结算85%。
不操作ZCode，提示词由用户转发。

### 下一位GLM O提示词（覆盖历史自动续派）

```text
继续 TEST-GLM-WAVE-O-1，原树 /Users/zhangxu/.codex/worktrees/glm-wave-o/type-pal，原分支 codex/glm-wave-o-supply-validation-r1，固定审核候选 1d805509af6ecd94a95c0965d373bf98ccde123c。先读 /Users/zhangxu/.codex/worktrees/glm-lmn-acceptance/type-pal/docs/ops/tasks/TEST-GLM-WAVE-O-1-supply-validation-tenfold.md 最新 r6 独立审核段及所链 codex-o-r6-review-20261001.md/json，按 O-R6-01～04 窄返工：合同账不能用token最近标题/首条expect代替逐条件排重与完整oracle；删 item-effects gate失败重复，不计 item-use 用存在hero伪证缺目标轴，死亡跳过未测须更名或先排重再补合法轴；item-use world/useItem 改完整 typed WorldState/CharacterInstance/ItemData，补exp、去as never及Record扩展强转；runner零执行/pending/todo/skip/异身份/错file或fullName/未处理异常/raw harness/signal/spawn拒收，保留stdout+stderr，不全局prune；最终包分布254/188/26及658路径从树生成，历史数字标历史，锚点与docs-only区间明确，勿循环自pin。旧七桥/两oracle/canAct删重、六针漂移及62枚hash对应项已关闭；不重跑未变业务，仅重采改动文件受影响针（item-effects目前O08-CC6/7、O09-CC12；item-use目前O09-CC6/7），其他保留。继续原合法余族，700例/60组/50有效反控不缩，468仍部分，缺合法轴逐项existing-proof/unreachable/blocked申请。只写原O白名单新测/专属fixture/wave-O证据，CLI mkdtemp合成工程，真实工程migrate含dry-run禁止；派发8b3ca062953b17a12178f8d1a9e36657971234b1、冻结3ac9a2e2f6aba8a5cc97640c18fef8549d199380不变。最终串行migrate/content/shared全包test/typecheck、lint完整0/0/0、docs/diff/verifier后推送40位候选；产品/旧测/配置/官方baseline/真实数据/P/Q/共享文档只读，不合main、不标done。
```
