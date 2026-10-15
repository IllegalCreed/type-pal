# Editor 三文件：异步生命周期与测试判别力

本片单一Coding Owner=Codex，用户授权三文件，隔离治理分支；只改测试，不改变生产/资产/规则。
当前build检查点，0文件关闭、未合main；作者自验不冒称独立验收。

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

ID草稿、真实catalog计数、pending→ready禁用合同需单独补强，并证明错误能被新断言识别。
全部70条不因告警为0升级逐文件accept；相邻oracle/排重未知仍review，未删除任何用例。
定向/相邻/typecheck与完整check、官方ratchet、protected fast、lint-zero、ledger将在本模块窗口集中完成。
完整门仍有本片以外诊断时保留CODE94 rework，不合main。
