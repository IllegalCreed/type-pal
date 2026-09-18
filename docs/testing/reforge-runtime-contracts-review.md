# TEST-REFORGE-RUNTIME-CONTRACTS-1 · Codex接收复核

## 当前结论（2026-09-19）：a9e1d4f1仍counter，仅剩D1输入保真与看板回退

候选`a9e1d4f1b8aff41aad0c320fb3a6608c3cf8319d`，counter基点ced4f2b9；本席主线评估基线为main/4df7823e。
origin/ls-remote/候选worktree三者一致且干净。**R1、R3已闭环，R2投影与resolver故障恢复、R4 A5与计数更正已闭环，不重开。**
仍不接收整包、不跑接收后的全仓check/官方ratchet/strict-fast，不转Kimi、不代签、不标done；r1设计不重签。
GLM测试贡献、自验及最新机器账仍保留候选树；主线官方fast仍为6969，本包59项未计入。

### 本轮已独立验证

- 产品相对返工基点零改，Reforge生产与冻结3bc20273相同；旧测试/scripts/锁文件未改，原四见证相对ced4f2b9零diff。
  相对冻结的editor adapter差异来自已接收guard，未误算GLM改动。测试/fixture/诊断白名单成立，**文档有越界看板回退，见下**。
- 定向10文件**59/59**；全包**116文件/1189项**；Reforge tsc exit0；14个新增TS/MJS/MTS/JSON Biome干净。
  catalog及更新后的menu items另经现行validateAssetCatalog/validateItems接受，scene-target sc-1结构合法。
- 原四正常对照全绿，四坏实现均从MISSED变**detected**，原函数体执行见证保留：BGM4项/MIDI8项/loader6项/equip3项。
  原15跑也全符合期望（5对照绿+10针钉名AssertionError红），混合失败判据自测拒绝，候选源文件hash不变。
- R1：C2现先初始化w，证b真读进入并挂起，再提交a，完整字节分别核w/a；释放b后无第三次提交。
  C4现确实A/B两读在途，A结束finally之后再请求B，读轨迹仍只有a/b，B三个等待者均兑现。均不是只改标题。
- R2已闭部分：cue明确钉作者identity与runtime speaker/portrait/rows；D4/D5同一resolver/source开关故障，
  urlFor真正进入IO失败包装并核全上下文及非目标零IO，不再用缺记录提前拒绝冒充读取失败。
- R3：B2/B3/B6深快照的就是实际调用world，比较在最后消费后；B5两类request分别来自useConfirm与useApply，
  不再手造非法origin/selectedItemId组合。R4 A5全状态终态与独立state/共享菜单树声明一致。
- 临时同树覆盖before106文件/1130项，after116文件/1189项，124生产文件与全部分母不变：
  行7853→7927/14118、语句8679→8763/16188、函数1375→1388/2416、分支5256→5329/11041。
  十目标模块也是+74行/+84语句/+13函数/+73臂；额外文件无增量。与回执一致，不将命中等同合同完整。
- 旧版本兼容审查：本包未新增生产兼容层、旧版本fixture或旧入口保活；冻结目标面通过。

### 剩余R2-D1：仍未钉住实际project/author输入

候选`packages/reforge/src/project-loader.current-boundaries.test.ts:75-87`只比较manifest/sceneIndex/authorContent，
**没有比较实际传入project上的actorsById等纯数据**。actorsById是loader投影直接消费的输入，不是活resolver/cache。
本席新增[独立输入污染见证](reforge-runtime-input-review-witness.mjs)：只在`loadAllScenes`批读完成后、返回前，
把传入project第一个actor.name改为`polluted.name`，保留正确返回投影；marker打印修改后的实际值。
正常对照6/6绿，污染实现也**6/6绿、exit0、MISSED**，无TypeError/超时，产品hash不变。
这验证的是上一轮已要求的“实际project输入不被污染”，不是新增产品规则或发现现存产品bug。

同时，:27/:43/:64-67的authors是**另一次读取得到的数组**，不是loadAllScenes实际消费的lazy scene；
fixture `glm-runtime-contract-fixtures.ts:383-388`每次readJson都structuredClone，:89重新读原文件自然又得到原值。
因此“实际进入loader的author输入”与“runtime不别名实际author输入”的声明仍过度；新增投影cue断言有效，不能替代输入观测。

返工只收这条：深快照实际project纯数据（包含actorsById，排除真正有活动状态的source/resolver/cache），
在读取边界记录/保留**实际返回给loadAllScenes**的author对象及其调用前快照，比较消费完成后仍保真；
需要别名证明时对实际对象做判断，不拿前后两次独立clone当同一输入。保持完整cue预期及原投影反控。
新污染针须detected，其余已闭环见证不变；用与该合同对应的业务断言拦截，不把生产函数改掉或用冻结导致TypeError充当证明。

```sh
node docs/testing/reforge-runtime-contracts-review-witnesses.mjs /Users/zhangxu/illegal/type-pal-glm-reforge-runtime
node docs/testing/reforge-runtime-input-review-witness.mjs /Users/zhangxu/illegal/type-pal-glm-reforge-runtime
```

### 剩余R4：候选回退了另一张卡的看板，文档门仍红

候选`docs/ops/board.md:15`相对ced4f2b9把EDITOR-SCENE-REF-GUARD-1的review行改回**build**，
不属于本人任务登记；候选`pnpm check:docs` **exit1**：看板build与该卡review不一致。
主线随后已把该卡done归档，集成更不能带回这个旧行。候选其他卡正文/实现未见回退，本席不夸大为代码被回退。
请同步本次counter及最新main，保留guard归档与预览缓存修复，只改本人状态/日志；修正过时链接与提示词中的旧tip，
跑check:docs。这里要求的是文档门，不让GLM补跑全仓check/官方覆盖。

### 本轮证据与交接

日志根`/tmp/codex-runtime-rework.vKqZUD/`：directed/reforge/typecheck/biome/fixtures/witnesses/mutants/
coverage-before/coverage-after/docs-candidate/input-witness。四见证明细`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/runtime-contract-review-KkuA40/`；
新输入污染明细`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/runtime-input-review-Aiyer2/`。
诊断可由入仓工具重建；本席未改GLM正式测试语义。下一位仅GLM收窄返工，见任务卡提示词；不是交Kimi重审已通过项。

## 首轮历史（以下钉75c9cfe8，不代表当前四见证仍漏检）

候选`75c9cfe883372c92cddf67e27b264aa335af89ce`，基点6300223a，生产冻结3bc20273；2026-09-18开始复核，09-19落结论。
任务：[运行时五组补测卡](../ops/tasks/TEST-REFORGE-RUNTIME-CONTRACTS-1-runtime-boundaries.md)。

## 首轮结论：counter，R1～R4定点返工，不合入

56项/10针及覆盖增量均可复算，不能由此证明尚未被断言验证的合同。四条独立坏实现实际执行后，候选对应新增套件仍全绿。
这是**测试交付的鉴别力/范围对账问题**，不是四个现存产品缺陷；不修改GLM测试语义、不代签、不标done、不转Kimi终审。
原候选回执、机器账与GLM实施者自验保留75c9cfe8树；本席不把未经接收的自验移录成主线accept。
设计r1不重签；保留有效测试和已确认事实，不推倒整包重做，不以固定56条为返工目标。

## 已确认事实

- 主工作区接手为main/a6725f5e，干净；期间另一卡终审写入main至34631e67，差异只有该卡文档，原样保留。
  guard分支当前a6725f5e。回执中“复位830db139”是早期竞态历史，**不是现在回退已实现guard的授权**；本席没有切分支/reset/stash。
- 候选worktree HEAD、origin引用、ls-remote一致75c9cfe8；对6300223a增量17文件：10测试、1fixture、3诊断/机器账、回执/卡/看板。
  产品、旧测试、scripts、依赖、projects/data对冻结零diff。不能把候选尚未合入的main后续guard代码误读成GLM删除。
- 独立复跑：定向10文件**56/56**，全reforge **116文件/1186项**，typecheck exit0；全部**14**新增TS/MJS/MTS/JSON文件Biome干净。
- 原工具独立重建：**5正控exit0＋10变异exit1**，指定新增测试failed、实际业务AssertionError；判据good/混合坏日志自测正常。
  MUTATION_HIT仍是load标记，不单独作为运行见证；本次原10针的唯一替换/钉名业务红对偶有效，不抹掉已确认结果。
- before106文件1130项、after116文件1186项；124生产文件/分母相同，临时报告不写官方目录。

| 口径 | 行before→after | 语句before→after | 函数before→after | 分支before→after |
|---|---:|---:|---:|---:|
| 十目标模块 | 469→542/740 | 510→593/855 | 89→102/143 | 296→369/598 |
| reforge全包 | 7853→7926/14118 | 8679→8762/16188 | 1375→1388/2416 | 5256→5329/11041 |

+73行/+83语句/+13函数/+73臂成立，全部增量来自十目标模块；未将执行覆盖冒称业务已验证。
当前main官方fast仍为guard候选的6954项，本包未接收56项不计入；未运行本包接收后的全仓check/ratchet/strict-fast。

## 四条独立见证

工具：[reforge-runtime-contracts-review-witnesses.mjs](reforge-runtime-contracts-review-witnesses.mjs)。

```sh
node docs/testing/reforge-runtime-contracts-review-witnesses.mjs /Users/zhangxu/illegal/type-pal-glm-reforge-runtime
```

只用Vite内存单点替换，不改候选文件；marker位于实际函数体并须来自Vitest stdout，非模块加载/错误源码片段。
四正常对照均exit0；每条坏实现的候选新增用例全部passed，产品hash前后相同。工具exit0指取证执行完成，应读取verdict。

| 见证 | 唯一坏实现 | 候选新增套件结果 |
|---|---|---|
| bgm-post-read-ownership | 删除doPlay读取字节后的isCurrent检查 | BGM 3/3绿，MISSED |
| midi-stale-finally | 旧load的finally无条件清loadPromise | MIDI 7/7绿，MISSED |
| loader-projection-bypassed | loadScene直接返回loadAuthorScene，跳过对话投影 | loader 6/6绿，MISSED |
| equip-input-pollution | openEquipMenu实际修改传入world.money +=17 | equip 3/3绿，MISSED |

## R1 · 音频异步场景没有覆盖声称的交错

路径以packages/reforge/src/为前缀，行号钉75c9cfe8。

- `audio/bgm.runtime-boundaries.test.ts:119-126`在初始化结束前连续play(b)/play(a)，随后明确断言reads仅有a。
  **b从未开始读取**，resolve其未被使用的gate不产生迟到结果。此例只证明初始化期间last接管，不证明C2读取乱序保护；
  :129的expect.any(ArrayBuffer)也没有核“完整字节身份”。移除真正post-read gate仍3/3绿，见证已确认执行该变异位置。
- `audio/midi-preview.lifecycle-boundaries.test.ts:111-114`等B完成后才释放A；这能证明旧结果拒收，不能证明旧finally不清**仍在途**B。
  独立的同key去重例没有A/B交错；删除finally的promise身份门后整个7项仍绿。

返工：保留并更名有效的懒初始化例；新增真实已初始化player、旧读取entered且挂起→新请求读取/播放成功→旧读取完成的对照。
两资源字节须不同，核最终backend载入字节/asset/loop与次数，所有挂起点均有完成见证。
MIDI加A仍挂起、B已entered但未完成→A结束→再次请求同B/key仍只读一次→释放B正常提交的组合；
四控中这两针应detected，不能只改标题或放宽判据。bgm initP初始化失败缓存政策仍允许待证，不在此要求改产品策略。

## R2 · loader投影断言不足，resolver遗漏要求的IO失败轴

- `project-loader.current-boundaries.test.ts:26-34`只验author IDs、flow.kind、runtime IDs和两个数组不是同一对象。
  没有读真实cue的identity/speaker/portrait/rows；全部投影被绕过仍6/6绿。两次读取生成不同数组不能证明投影。
- 同文件:36-41快照的是原始files，而memoryFileSource.readJson先structuredClone；原文件表不变是有效事实，
  但不能代替实际project/author输入与输出完整树的保真断言。D1回执不能称完整runtime树已核对。
- `asset-resolver.io-boundaries.test.ts:55-71`只测urlFor成功、缺role/缺asset；没有source.urlFor读取失败，
  后两项在record/role层提前拒绝，不经过`asset-resolver.ts:64`的IO错误包装。after覆盖该行仍未命中，与签定D5不同。
- 同文件:38-48恢复对照换了一个resolver/source；应将同reader故障修复后重试，不能把新对象成功称旧实例恢复。

返工：直接钉author与runtime cue的完整预期及不相关字段；比较实际输入，绕过投影针应detected。
补真实urlFor故障与上下文包装、同一resolver/source恢复正控，明确非目标IO零调用；按现行真实color-table/video消费域构造合法catalog/roles。
本席已独立调用validateAssetCatalog(dAssetCatalog())与validateItems(multiItems())，二者均accepted；**不指控其结构非法**，
也不向AssetResolver凭空追加字节摘要校验或要求本包验证渲染解码。

## R3 · 不变性检查比错对象/比错时机，B5请求不是实际入口产物

- `equip-menu-state.navigation-boundaries.test.ts:45-52`快照world，却用open()内部另一份multiWorld构造s0；
  真正使用world的equipBackToList在:56，位于唯一world比较**之后**。修改实际openEquipMenu输入的money仍3/3绿。
- `use-menu-state.navigation-boundaries.test.ts:132-133`只看菜单items长度，不能证明world没变化。
- 同文件:62-77手造u-5的origin='pick-item'请求，但全部u-*都是oneAlly；本席调用真实useConfirm(cursor4)明确返回pick-target。
  :108又只把request.itemId换成u-2、state.selectedItemId仍为u-1，不能称来自正常单体用完链。

返工：让真实函数收到的world/items/state就是被快照的对象，在最后一次相关调用之后比较全部状态；污染针应detected。
B5用合法非单体物品（例如明确menuAfterUse=keep）经useConfirm产生真实execute请求，再验证重建/clamp；
pick-target请求经useConfirm/useApply构造，itemId与selectedItemId一致。继续限定菜单协议，不扩张战斗/物品效果实现。

## R4 · 30族账与交付卫生同步实证

- C2目前只有初始化last接管、C4缺旧finally撞新在途、D1未验投影、D5缺IO失败、B2/B6未证实际world不变；
  修复后按真实测试名/输入/正反控更新30族状态与机器账，不继续笼统记新增完成。
- `menu-state.navigation-boundaries.test.ts:44-52`两次run只返回depth/panel再toEqual，未证明“独立终态/无共享可变节点”；
  MAIN_MENU节点本来按合同共享。改准确标题/断言或删除重复弱例，不为了保持56条造新的不共享规则。
- 实际新文件Biome检查为14文件，回执写12需更正；候选docs检查exit1，任务index与Status不一致，需机械再生成。
- 分支竞态记录保留；返工仅在自己的worktree。合入本counter后保留主线guard实现/他席终审，不回退guard分支或恢复stash。
  冻结继续约束reforge目标面；最新主线editor变化按来源提交区分，不能为凑全仓旧树零diff删除已接收修复。

## 验证日志与接续

`/tmp/codex-runtime-contracts-review.TaeZrc/`：directed/reforge/typecheck/biome、mutants、coverage-before/after、witnesses与docs日志。
独立见证详情：`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/runtime-contract-review-goB25e/`；
原15跑详情：`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/rr1-mutants-96RLYD/`。临时日志可用入仓命令重建。
本席未改候选源码/测试/官方基线；见证脚本的格式整理不改变变异点或测试选择。
下一席直接GLM返工，不交Kimi；通过独立重新接收后才执行全仓check→官方ratchet→受保护单次fast。
