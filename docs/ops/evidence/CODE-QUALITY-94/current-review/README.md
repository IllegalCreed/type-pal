# CODE94–102：当前复审与有限返工

## 证据身份

- id：CODE-QUALITY-94/current-review；schemaVersion：1；status：recorded，尚未集成收口。
- Owner：Codex，单Agent；基点 `8ebcb70f0e054038f52e6a3b3f7b35a1f6e536b8`。
- 唯一分支 `codex/code-quality-94-102`，隔离树 `/Users/zhangxu/.codex/worktrees/quality-94-102/type-pal`。
- [53文件索引、19项逐文件A–H、合同映射和限制](review.json)。34项既有关闭复用；0新增关闭。历史manifest不重写。

## 来源与输入

原94/95的30路径与当前main字节一致，复用pre94菜单/renderer逐文件证据及PR22冻结门；CODE96既有精确退役、102既有工具关闭保留。索引分别记录当前和基点指纹、实际caller、oracle以及复用来源。指纹不证明读过或设计良好，未重复生产整套GLM复审。

本轮补读helper/状态机、完整driver、Save/IDB及当前改动测试片；driver测试全文作者证据复用，当前实际差异/夹具另核。IDB使用独立fake-indexeddb工厂，未读写用户数据库；[W3C IndexedDB](https://w3c.github.io/IndexedDB/)的连接关闭、versionchange与失败语义用于资源归属判断，未变存档格式、DB版本或旧store升级策略。

## 断言与业务oracle

- IDB四项：失败open不毒化后续调用；reset关闭自持连接；异常close后可重开并读到已提交321；第二客户端升级不被本连接阻塞。原三个complete/abort事务例保留。
- 标题Confirm/Menu两入口：公开启动回调拒绝时由路由记录确切错误，标题状态保留，后续合法回调仍可退出标题；没有自动重试写入或新UI。
- 内存元数据：改写第一次list返回的cash/savedTimes不能改写保存条目，第二次仍为100/7；GS存侧/读侧克隆和六字段往返仍各自保留。
- WORD兜底：错误但非空的文案在旧8例下全绿，加强后恰一个业务AssertionError。夹具构造逐字段保持和注释正文守恒属于结构证明，不当作业务oracle。
- 菜单纯Save元数据断言迁入API已有列表例，菜单15→14；primitive两混合同拆开，断言全部迁入对应原子用例。未以计数或覆盖率独立验收。

## 结果

正式红例分别为IDB四个、标题两个、元数据一个，均为指定AssertionError；完整恢复13文件147例。helper原子化后5文件51例；game typecheck和13文件scoped Biome均exit0、无诊断。显式default与JSON reporter保留可见日志。

[压缩原始回执](receipts.json.gz)包含逐次stdout/stderr、执行参数/退出码和原生JSON，压缩前字节数/SHA可复验。首次临时目录/缺二进制准备失败、IDB不兼容Event导致的运行错误、fixture工具解析失败均保留，不能当有效反控。一次未保存raw的早期手动Biome告警检查单列披露，不冒称全部过程均有字节原件。

[提交前静态原件](postflight.json.gz)单独保存docs、lint-zero、ledger及diff检查的完整收尾日志。它不替代尚未运行的全仓测试或coverage门；两个压缩件都由Git保存身份，不自嵌内容hash。

账本当前3452 tracked／511 closed／71 review／2870 pending。仅八个隐式pending登记review；未通过读取或局部绿减少未闭合总数。全仓check、官方coverage ratchet、protected fast和PR/合并均未执行，等相关范围稳定后集中。

## 限制与复核

`GAME-MENU-HELPER-API-1`的零生产菜单接口删除和`GAME-SAVE-INPUT-DOMAIN-1`的整数1–5输入合同已请求用户裁决，尚未收到，未实施。item-select混合同测试与分页专测清理随接口结果处理。没有新的浏览器持久化、视觉/E2E或并发多app信用。

在治理树运行以下只读快检，不重跑全仓或coverage：

```sh
node docs/ops/evidence/CODE-QUALITY-94/current-review/verify.mjs
pnpm exec tsx docs/ops/evidence/CODE-QUALITY-94/current-review/fixture-proof.mjs
```

第一条核源码/基点、回执字节、精确红集合和绿结果；第二条重新比较已有工厂的值/形状/嵌套freshness，以及三个注释源的正文守恒。两者默认仅输出，不写冻结件；任何漂移只重核受影响claim。后续提交/推送以Git为准，统一门和发布事实另记，不把本回执当成完成声明。
