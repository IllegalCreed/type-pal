# Editor 三文件首片：完整窗口回执

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「Editor 三文件首片：完整窗口回执」的治理候选页;证据原件即下方逐字节保全的固定main源(6144B,SHA cff5c29e6727)。

## 来源与输入

来源为固定Git载体,非本次运行;原1个链接处置见作者review的linkDisposition。当前存活入口:无当前仓库内存活链接。

## 断言与业务 oracle

文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 6144B / SHA-256 cff5c29e67270a6ec1c010881225e40c4547118678166af0cdb65337700362ef；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# Editor 三文件首片：完整窗口回执

稳定源码候选 `c8ad9416fc46b7aef3e89b4a106673fbcb9d34b3`；主线保护基点
`f98d0ddd89ebdee7b04502ee35de26ee82c6d246`。单一Coding Owner=Codex，作者自验，未冒称独立accept。
本片只修改三个测试文件及必要的精确退役数据/固定计数oracle，不改产品、资产、schema、公共运行时接口或规则。

## 逐文件结果

| 文件（相对 packages/editor/src） | 真实根因、改变与判别证据 | 当前边界 |
|---|---|---|
| __tests__/cursor-asset-r1/world-sprite-harness.tsx | 原挂载只等一个微任务，真实gzip/RLE解码仍未完成；现在等待viewer同一个SpriteAssetCache的真实promise，并在act内冲刷更新。仅此分片使70条的604条告警降至200。 | 唯一caller为C01；显式focus加载与pending选择路径已验证。默认focus/拒绝分支的独立故障回归未单独补，不关闭文件。 |
| __tests__/cursor-asset-r1/kit.ts | 真实session undo/redo同步通知React订阅者；新增applyHistoryAction把历史操作放入act并返回真实boolean，C01逐次断言成功。 | 原输入/组合框helper仍执行真实DOM事件。其它caller域未完整验收，保持review。 |
| ui/WorldSpriteLibrary.c01.cursor-r1.test.tsx | 资源行点击移出重试回调，只点击一次并等待真实解码；消除空act。70条完整保留时即为0诊断。补强3个弱oracle、清理7处layout强转、精简3个已证重复后，67/67仍0诊断。 | 文件内3条重复已直接证明；与外部相邻测试的完整排重仍review，不把67条等同67个独立合同。 |

实际读取文件、SHA与全文/部分caller边界见 `read-boundaries.json`；caller读取不替其它文件增加闭合信用。
完整原件、执行集合与分片差分见本目录JSON/gzip；[React act](https://react.dev/reference/react/act)为框架一手依据。
生产链为SpriteResourceViewer.tsx:218-280的Promise.all→snapshot/proof/frames，及
WorldSpriteLibrary.tsx:268-278的真实proof判定；未用mock替代reader、缓存、解码或业务组件。

## Oracle、排重与隔离

- G04-08：精确要求 `c01gamma-static`，同时约束label stem和后缀。
- G05-10：真实readBytes闸门证明未完成时disabled、完成真实解码后enabled；finally释放，卸载后恢复原act环境。
- G07-07：精确检查目录标题4项（starter+3 authored），不再用整页任意数字作为oracle。
- 同三个合法产品mutant下旧弱断言均通过，新断言各恰一指定业务AssertionError；恢复67全绿、0skip。
  source/test/mutant与独立重建hash、命令/cwd、file×fullName、signal/spawn、临时树删除见
  `oracle-validation.json`、`oracle-new-final-proof.json`、`oracle-old-complete-proof.json`、`oracle-rebuild.json`。
  两次临时树setup失败保留原件，不计有效针。
- G01-10→G07-06、G03-09→G03-04、G03-10→G03-05是相同合法输入/操作下的严格子集，精确body/hash见dedupe-proof.json。
  保留较强代表；其它未知重复不自动删除。未删除任何测试文件。

## 质量门

定向67/67、0诊断；相邻6files/54tests通过但有231条其它act；editor typecheck通过；coverage工具63通过。
完整check七包1640files/20271tests通过，editor631files/4948tests，七包typecheck通过；
docs工具48、coverage工具63、quality工具37、E2E工具397、script-governance22通过。
这里没有执行新剧情E2E，纯测试变更不要求视觉巡检。

| 命令 | 进程/数值结果 | 未包act | act环境提示 | 导航 | 统一零诊断门 |
|---|---|---:|---:|---:|---|
| pnpm check | exit0 | 3001 | 577 | 2 | 不通过 |
| 首跑pnpm coverage:ratchet | exit1，精确退役须显式确认 | 3048 | 577 | 2 | 不通过 |
| pnpm coverage:ratchet --allow-scope-removal | exit0 | 3009 | 577 | 2 | 不通过 |
| protected pnpm coverage:fast | exit0 | 2955 | 577 | 2 | 不通过 |

四次完整输出均无C01 stderr头，gzip解压后SHA/字节数逐份核对通过；表内为特定诊断模式计数，
不冒称全部console的完整语义分类。已确认std-env.isAgent=false，保留原React检查与诊断可见性。
完整check内lint4133files、0error/warning/info；最终证据落盘后的静态复验另记postflight回执。

首跑只被现有显式退役确认门拦住，覆盖率0回退/0提升；pre-confirmation-scope.json确认唯一删除为C01 70→67。
现有确认参数只用于已核测试精简，生产范围保护、覆盖率底线及普通protected的精确matcher未改。
随后protected正常核准C01及此前3份game退役；没有把确认参数传给protected。

官方baseline为736源文件/19862tests，editor4786；所有包及汇总的每个covered/total计数完全不变。
diff仅timestamp、测试计数/身份/执行digest；源范围/include/exclude不变，其它包baseline字节内容不变。
五份冻结测试/支持文件在完整门期间未改变。机械核验见 `window-proof.json`，没有手填baseline。

## 状态与继续边界

本轮0文件关闭；三个文件保持review，机器3284 inventory /229 closed /48 review /3007 pending。
CODE94继续rework，QUALITY-EDITOR-DIAGNOSTICS-1保持review，未合main；其余任务/待核文件不升级。
本片外的act环境/导航与其它测试诊断仍待独立有限切片；相邻54全绿不消除231条诊断。
后续候选为BattleSpriteLibrary的C02测试宿主与相邻测试，先核Owner、完整caller/oracle和白名单，再实施。
无下一位Agent提示词，当前由Codex维护；不宣告全仓专项完成。

## 证据落盘后的复验

check:docs通过：48工具测试、570严格content-review、184阶段文档均通过，0issues；
官方生成索引与现行401行字节一致，保持review状态。仅刷新看板自身语义pin，未改其它569条记录。
最终lint4142files、0errors/0warnings/0infos；ledger3284/229closed/48review/3007pending通过。
postflight.json保留完整命令/exit、原始gzip/SHA/字节数，JSON再经Biome检查。
这些静态通过不消除上表执行诊断，当前仍不合main。
```
<!-- incremental-original-source:end -->
