# CODE94–102：当前复审与有限返工

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

本页是 CODE94–102 检查点 b8 复审与有限返工（2026-10-25）的治理候选页；证据原件即下方逐字节保全的固定 main 源（4311B）。id：CODE-QUALITY-94/current-review；status：recorded，尚未集成收口。Owner：Codex 单 Agent；基点 8ebcb70f0e054038f52e6a3b3f7b35a1f6e536b8；唯一分支 codex/code-quality-94-102，隔离树 /Users/zhangxu/.codex/worktrees/quality-94-102/type-pal。机器索引为 [review.json](review.json)（53 文件、19 项逐文件 A–H、合同映射和限制）：34 项既有关闭复用、0 新增关闭、历史 manifest 不重写。本页回答的问题：在两项停止线等待用户裁决期间，94 原 30 路径与 97–102 的当前实际差异核到了什么、哪些红绿证据成立、哪些门明确未跑。

## 范围与证据

原 94/95 的 30 路径与当前 main 字节一致，复用 pre94 菜单/renderer 逐文件证据及 PR22 冻结门；CODE96 既有精确退役、102 既有工具关闭保留。指纹不证明读过或设计良好，未重复生产整套 GLM 复审。本轮补读 helper/状态机、完整 driver、Save/IDB 及当前改动测试片；driver 测试全文作者证据复用，当前实际差异/夹具另核。IDB 使用独立 fake-indexeddb 工厂，未读写用户数据库；W3C IndexedDB（2.1.1 versionchange/4.4 close/5.2 closing semantics，2026-10-25 查阅）的连接关闭、versionchange 与失败语义用于资源归属判断，未变存档格式、DB 版本或旧 store 升级策略。原 4 链接处置见作者 review 的 linkDisposition，当前存活入口：[receipts.json.gz](receipts.json.gz) [postflight.json.gz](postflight.json.gz)（含逐次 stdout/stderr、执行参数/退出码与原生 JSON，压缩前字节数/SHA 可复验；提交前静态原件单独保存 docs、lint-zero、ledger 及 diff 收尾日志，不替代尚未运行的全仓测试或 coverage 门）。

## 发现

四组核心发现（均先红后绿，红例为指定 AssertionError）：IDB 四项连接 ownership——失败 open 不毒化后续调用、reset 关闭自持连接、异常 close 后可重开并读到已提交 321、第二客户端升级不被本连接阻塞，原三个 complete/abort 事务例保留；标题 Confirm/Menu 两入口——公开启动回调拒绝时由路由记录确切错误、标题状态保留、后续合法回调仍可退出标题，无自动重试写入或新 UI；内存元数据——改写第一次 list 返回的 cash/savedTimes 不能改写保存条目，第二次仍为 100/7，GS 存侧/读侧克隆和六字段往返各自保留；WORD 兜底——错误但非空的文案在旧 8 例下全绿，加强后恰一个业务 AssertionError。夹具构造逐字段保持和注释正文守恒属结构证明，不当业务 oracle。菜单纯 Save 元数据断言迁入 API 已有列表例（菜单 15→14），primitive 两混合同拆开、断言迁入对应原子用例，未以计数或覆盖率独立验收。过程披露如实保留：首次临时目录/缺二进制准备失败、IDB 不兼容 Event 运行错误、fixture 工具解析失败均不作有效反控；一次未保存 raw 的早期手动 Biome 告警检查单列披露。

## 结论

正式红例 IDB 四个、标题两个、元数据一个共 7 个，均为指定 AssertionError；完整恢复 13 文件 147 例；helper 原子化后 5 文件 51 例；game typecheck 与 13 文件 scoped Biome 均 exit0 无诊断，显式 default 与 JSON reporter 保留可见日志。账本当前 3452 tracked／511 closed／71 review／2870 pending（仅八个隐式 pending 登记 review，未通过读取或局部绿减少未闭合总数）；全仓 check、官方 coverage ratchet、protected fast 和 PR/合并均未执行，等相关范围稳定后集中。GAME-MENU-HELPER-API-1 的零生产菜单接口删除与 GAME-SAVE-INPUT-DOMAIN-1 的整数 1–5 输入合同已请求用户裁决，尚未收到、未实施；item-select 混合同测试与分页专测清理随接口结果处理。没有新的浏览器持久化、视觉/E2E 或并发多 app 信用。

## 整改与复核

治理树可运行只读快检（node verify.mjs 核源码/基点、回执字节、精确红集合和绿结果；pnpm exec tsx fixture-proof.mjs 重新比较已有工厂的值/形状/嵌套 freshness 与三个注释源正文守恒），默认仅输出不写冻结件，任何漂移只重核受影响 claim；治理轮未重跑。后续提交/推送以 Git 为准，统一门和发布事实另记，不把本回执当成完成声明。同日后续：两项裁决获批落地并集中统一门后，收口记录见同目录 ../approved-closeout/（其 claimCorrections 对本阶段 primitiveG 等声明有明确撤回，历史不改写）。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 4311B / SHA-256 4a0956c2a553f13a7fa873b872c12b506c4ed0af32683e93a7e1faab3d543e9f；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
````markdown
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
````
<!-- incremental-original-source:end -->
