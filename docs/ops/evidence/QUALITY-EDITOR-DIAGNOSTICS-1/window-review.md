# Editor 三文件首片：完整窗口回执

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「Editor 三文件首片：完整窗口回执」的治理候选页;原件按固定main源逐字节保全(6144B,SHA cff5c29e6727)。稳定源码候选 c8ad9416fc46b7aef3e89b4a106673fbcb9d34b3,主线保护基点 f98d0ddd89ebdee7b04502ee35de26ee82c6d246;单一 Coding Owner=Codex,作者自验,未冒称独立 accept。本片只修改三个测试文件及必要的精确退役数据/固定计数 oracle,不改产品、资产、schema、公共运行时接口或规则。

## 来源与输入

逐文件真实根因与判别证据:①__tests__/cursor-asset-r1/world-sprite-harness.tsx 原挂载只等一个微任务,真实 gzip/RLE 解码未完成;改为等待 viewer 同一个 SpriteAssetCache 的真实 promise 并在 act 内冲刷更新,仅此分片使 70 条测试的 604 条未包 act 告警降至 200;唯一 caller 为 C01。②__tests__/cursor-asset-r1/kit.ts 真实 session undo/redo 同步通知 React 订阅者,新增 applyHistoryAction 把历史操作放入 act 并返回真实 boolean,C01 逐次断言成功。③ui/WorldSpriteLibrary.c01.cursor-r1.test.tsx 资源行点击移出 vi.waitFor 重试回调、只点击一次并等待真实解码、消除空 act,70 条完整保留时即 0 诊断;再补强 3 个弱 oracle、清理 7 处 layout 强转、精简 3 个已证重复后 67/67 仍 0 诊断。一手依据为 [React act](https://react.dev/reference/react/act);生产链是 SpriteResourceViewer.tsx:218-280 的 Promise.all→snapshot/proof/frames 与 WorldSpriteLibrary.tsx:268-278 的真实 proof 判定,未用 mock 替代 reader、缓存、解码或业务组件。实际读取文件、SHA 与全文/部分 caller 边界见 read-boundaries.json。

## 断言与业务 oracle

三个补强后的 oracle:G04-08 精确要求 c01gamma-static(同时约束 label stem 和后缀);G05-10 用真实 readBytes 闸门证明未完成时 disabled、完成真实解码后 enabled,finally 释放、卸载后恢复原 act 环境;G07-07 精确检查目录标题 4 项(starter+3 authored),不再用整页任意数字作 oracle。同三个合法产品 mutant(错误后缀、提前启用、计数0)下旧弱断言均通过、新断言各恰一指定业务 AssertionError;恢复 67 全绿、0 skip。source/test/mutant 与独立重建 hash、命令/cwd、signal/spawn、临时树删除见 oracle-validation.json、oracle-new-final-proof.json、oracle-old-complete-proof.json、oracle-rebuild.json;两次临时树 setup 失败(缺 root tsconfig、外部资产路径被拒)保留原件,不计有效针。G01-10→G07-06、G03-09→G03-04、G03-10→G03-05 是相同合法输入/操作下的严格子集,精确 body/hash 见 dedupe-proof.json;其它未知重复不自动删除,未删除任何测试文件。

## 结果

定向 67/67、0 诊断;相邻 6 文件 54 例通过但仍有 231 条其它 act;editor typecheck 通过;coverage 工具 63 通过。完整门四行:pnpm check exit0(未包 act 3001/环境 577/导航 2)、首跑 pnpm coverage:ratchet exit1(精确退役 70→67 须显式确认,未包 3048)、pnpm coverage:ratchet --allow-scope-removal exit0(未包 3009)、protected pnpm coverage:fast exit0(未包 2955)——统一零诊断门全部不通过;四次完整输出均无 C01 stderr 头,gzip 解压后 SHA/字节数逐份核对,std-env.isAgent=false 确认无 reporter 检测干扰。完整 check 七包 1640 文件/20271 例通过(editor 631 文件/4948 例),docs48/coverage63/quality37/E2E397/script-governance22 工具通过,完整 check 内 lint 4133 文件 0 error/warning/info。官方 baseline 736 源文件/19862 例,所有包及汇总每个 covered/total 计数完全不变;唯一变化为 C01 70→67(editor fast 4789→4786),机械核验见 window-proof.json,没有手填 baseline。本轮 0 文件关闭;三个文件保持 review,机器 3284/229 closed/48 review/3007 pending。

## 限制与复核

这里没有执行新剧情 E2E,纯测试变更不要求视觉巡检;静态通过不消除上表执行诊断。CODE94 继续 rework,QUALITY-EDITOR-DIAGNOSTICS-1 保持 review,未合 main;本片外的 act 环境/导航与其它测试诊断仍待独立有限切片,相邻 54 全绿不消除 231 条诊断。后续候选为 BattleSpriteLibrary 的 C02 测试宿主与相邻测试,先核 Owner、完整 caller/oracle 和白名单再实施。未重跑原命令/浏览器/测试;历史结论保持原时点;候选待 Owner 接收。

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
