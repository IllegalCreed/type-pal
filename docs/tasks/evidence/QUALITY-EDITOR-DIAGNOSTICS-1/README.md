# Editor 三文件：异步生命周期与测试判别力

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「Editor 三文件：异步生命周期与测试判别力」的治理候选页;原件按固定main源逐字节保全(4854B,SHA 15c26a451268)。本片单一 Coding Owner=Codex,用户授权三文件白名单(world-sprite-harness.tsx、kit.ts、WorldSpriteLibrary.c01.cursor-r1.test.tsx),隔离治理分支;只改测试,不改变生产/资产/规则。当前首片 review,0 文件关闭、未合 main;作者自验不冒称独立验收。

## 来源与输入

生命周期分片证据链(基线 C01 70/70 且 604 条未包 act):仅等待真实共享精灵解码后剩 200 条;再把点击从重试断言移出、单次 act 后等待该资源解码,以及真实 session undo/redo 在 act 内执行后,70/70、未包 act/环境/导航全部 0,editor typecheck 通过——完整原件与当前源码 SHA 见 lifecycle-proof.json;mount-only 是中间差分实验,不算冻结业务反控。一手依据为 React act 官方文档;生产链为 SpriteResourceViewer.tsx:230-281 的真实 Promise.all→viewer 与父级 proof/frames 更新,editor 的 sprite-assets.ts 复用 SpriteAssetCache 真实 promise。WorldSpriteLibrary.tsx 全文 1457 行、SpriteResourceViewer.tsx 全文 581 行、三个白名单及 editor-asset-reader/sprite-assets/sprite-fixtures 全文读取;EditSession、reforge assets、DsCatalogControls/ListHeader 只作真实 caller/IO 段落,不据此关闭其它文件;harness 唯一 caller 为 C01(全仓 rg 确认)。当前存活入口:[window-review.md](window-review.md)。

## 断言与业务 oracle

第二提交(c8ad9416f 快照):三个 oracle 补强——G04-08 精确 c01gamma-static;G05-10 真实 readBytes 闸门证明 pending 禁用→真实解码后启用,finally 释放;G07-07 精确 4 项而非任意数字。独立临时树内同三个合法产品 mutant(错误后缀、提前启用、计数0)下旧弱 oracle 均绿、新 oracle 各恰一指定 AssertionError;恢复 67 全绿。oracle-old-complete-proof.json、oracle-new-final-proof.json 与 oracle-validation.json 固定命令/cwd、实际执行身份、source/test/mutant/重建 hash、原件和清理;最初两个临时树 setup 失败(缺 root tsconfig、外部资产路径不在隔离目录)原件保留,不计有效反控。仅移除 3 个已证严格子集:G01-10→G07-06、G03-09→G03-04、G03-10→G03-05,精确 body 与 hash 见 dedupe-proof.json;未核与外部相邻重复不自动删除,撤回原头注'已证不重领'的过 claim;7 处 layout 强转改为完整 typed union 结果断言。C01 显式注册 act 环境 flag 的 stub ownership,卸载后恢复旧环境,运行期间保持检查 true。没有空 act、sleep、延长 timeout、console 过滤或关闭 React 环境;真实 reader/缓存/解码/业务组件均保留。

## 结果

首片终态:C01 最终 67/67、未包 act/环境/导航均 0;editor typecheck 通过;相邻 6 文件 54 例通过但其它相邻测试仍有 231 条 act(见 first-slice-proof.json)。必要支持改动仅 approved-test-retirements 的 C01 精确 70→67 数据行与其固定表计数(18 文件/47 退役);matcher、拒绝条件及规则均未改;coverage-tools 63 通过,首跑旧固定计数失败原件保留。完整模块窗口(候选 c8ad9416f):完整 check、确认版 ratchet、普通 protected 均 exit0,但未包 act 分别 3001/3009/2955,另各 577 环境/2 导航,统一门不通过,未合 main;首跑 ratchet 因精确 70→67 删除需显式确认而 exit1,完整原件保留;pre-confirmation-scope 与普通 protected 双重核实,无规则改变。官方基线 736 源文件/19862 例,所有覆盖计数完全不变;当前 3284/229 closed/48 review/3007 pending,0 文件关闭。证据落盘后静态复验(docs 48 工具/570 content-review/184 阶段文档 0 issues、lint 4142 文件 0/0/0、ledger 通过)见 postflight.json,首个检查点两份失败原件(docs-initial-failure/ledger-initial-failure)亦保留。

## 限制与复核

上述三个弱 oracle 已补强并经有效反控;其它未核合同不因此升级通过;现行 67 条不因告警为 0 升级逐文件 accept;相邻 oracle/排重未知仍 review,未删除任何用例。kit 其它 caller 域未全面验收;默认 focus/拒绝分支的独立故障回归未单独补,不关闭文件。完整门仍有本片以外诊断时保留 CODE94 rework,不合 main;本片外的 act 环境/导航与其它测试诊断待独立有限切片。未重跑原命令/浏览器/测试;历史结论保持原时点;候选待 Owner 接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 4854B / SHA-256 15c26a4512681f32ac15f711abe88cae31058bd14391c05c98eeb34e7c09b8b3；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# Editor 三文件：异步生命周期与测试判别力

本片单一Coding Owner=Codex，用户授权三文件，隔离治理分支；只改测试，不改变生产/资产/规则。
当前首片review，0文件关闭、未合main；作者自验不冒称独立验收。

## 完整模块窗口（当前）

[最终窗口回执](window-review.md)：源码c8ad9416f，完整check、确认版ratchet、普通protected均exit0；
但未包act分别3001/3009/2955，另各577环境/2导航诊断，统一门不通过，未合main。
首跑ratchet因精确70→67删除需显式确认而exit1，完整原件保留；pre-confirmation-scope与普通protected双重核实，无规则改变。
官方基线736源文件/19862tests，所有覆盖计数完全不变；五份源码/支持文件在全门期间未变。
当前3284/229closed/48review/3007pending，0文件关闭；全部原件SHA/执行集合、读取边界与独立重建mutant见window-proof/read-boundaries/oracle-rebuild。

## 首片第二提交（c8ad9416f快照）

C01最终67/67、未包act/环境/导航均0；editor typecheck通过。相邻6files/54tests通过，但其它相邻测试仍有231条act，
不算干净统一门。记录见first-slice-proof.json；完整模块门尚待本次稳定候选集中执行。

- 三个oracle补强：G04-08精确c01gamma-static；G05-10真实readBytes闸门证明pending禁用→真实解码后启用，finally释放；G07-07精确4项而非任意数字。
- 独立临时树内同一三个合法产品mutant（错误后缀、提前启用、计数0），旧弱oracle均绿，新oracle各恰一指定AssertionError；恢复67全绿。
  oracle-old-complete-proof.json、oracle-new-final-proof.json与oracle-validation.json固定命令/cwd、实际执行身份、source/test/mutant/重建hash、原件和清理。
  最初两个临时树setup失败（缺root tsconfig、外部资产路径不在隔离目录）原件保留，不计有效反控。
- 仅移除3个已证严格子集：G01-10→G07-06；G03-09→G03-04；G03-10→G03-05。dedupe-proof.json保留精确body与hash。
  未核与外部相邻重复不自动删除；撤回原头注“已证不重领”的过claim。7处layout强转改为完整typed union结果断言。
- C01显式注册act环境flag的stub ownership，卸载后恢复旧环境，运行期间保持检查true。kit其它caller域未全面验收，仍review。

必要支持改动仅approved-test-retirements的C01精确70→67数据行、其固定表计数oracle18文件/47退役；matcher、拒绝条件及规则均未改。
两端live list与原baseline摘要一致，当前test SHA精确绑定；coverage-tools63通过。首跑旧固定计数失败原件保留，更新精确新总量后通过。
没有删除测试文件、没有改产品/资产/接口/配置规则，没有手填覆盖率基线。

## 生命周期分片

基线C01 70/70且604条未包act；仅等待真实共享精灵解码后剩200条；
点击从重试断言移出、单次act后等待该资源解码，以及真实session undo/redo在act内执行后，
70/70、未包act/环境/导航全部0；editor typecheck通过。完整原件与当前源码SHA见lifecycle-proof.json。
mount-only是中间差分实验，不算冻结业务反控；原件不改写。

一手依据：[React act](https://react.dev/reference/react/act)；SpriteResourceViewer.tsx:230-281的真实
Promise.all→viewer与父级proof/frames更新；editor的sprite-assets.ts复用SpriteAssetCache真实promise。
WorldSpriteLibrary.tsx已全文1457行读取，SpriteResourceViewer.tsx全文581行，三个白名单及
editor-asset-reader/sprite-assets/sprite-fixtures全文读取；EditSession、reforge assets、DsCatalogControls/ListHeader
只作为真实caller/IO段落，不据此关闭其它文件。harness唯一caller为C01，经全仓rg确认。

没有空act、sleep、延长timeout、console过滤或关闭React环境；真实reader/缓存/解码/业务组件均保留。
kit新增的历史驱动只返回真实session undo/redo结果，调用方精确断言成功；不替换命令模型。
宿主加载失败时卸载并移除DOM；未指定显式focus的旧调用形态保留，不宣称已等待其默认资源。

## 待完成

上述三个弱oracle已补强并经有效反控；其它未核合同不因此升级通过。
现行67条不因告警为0升级逐文件accept；相邻oracle/排重未知仍review，未删除任何用例。
定向/相邻/typecheck与完整check、官方ratchet、protected fast、lint-zero、ledger将在本模块窗口集中完成。
完整门仍有本片以外诊断时保留CODE94 rework，不合main。

首个检查点文档接线失败原件为docs-initial-failure.raw.gz、ledger-initial-failure.raw.gz：
漏证据上级导航、表内空行使3行不被机器计数；随后修正，docs0issues、ledger3284/229/48/3007通过。
```
<!-- incremental-original-source:end -->
