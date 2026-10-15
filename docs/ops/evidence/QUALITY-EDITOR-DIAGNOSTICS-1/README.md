# Editor 三文件：异步生命周期与测试判别力

本片单一Coding Owner=Codex，用户授权三文件，隔离治理分支；只改测试，不改变生产/资产/规则。
当前首片review，0文件关闭、未合main；作者自验不冒称独立验收。

## 首片第二提交（当前）

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
全部70条不因告警为0升级逐文件accept；相邻oracle/排重未知仍review，未删除任何用例。
定向/相邻/typecheck与完整check、官方ratchet、protected fast、lint-zero、ledger将在本模块窗口集中完成。
完整门仍有本片以外诊断时保留CODE94 rework，不合main。

首个检查点文档接线失败原件为docs-initial-failure.raw.gz、ledger-initial-failure.raw.gz：
漏证据上级导航、表内空行使3行不被机器计数；随后修正，docs0issues、ledger3284/229/48/3007通过。
