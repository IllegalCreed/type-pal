# DOCS-REGISTRY-SPLIT-1 — 文档 registry 存储拆分

Status: build
Phase: ops
Capability: documentation registry storage
Coding Owner: /root/registry_storage_author（隔离实现唯一写入者）
Reviewer: Codex（不得验收自己编写的实现）
Branch: codex/docs-audit-rework
Last reviewed: 2026-10-18
Template: task-card-v1 / 1.0.0

## 目标

将逼近 Biome 1 MiB 上限的文档 registry 改为薄 manifest 加分片，保持所有原生条目、顺序、审查状态、模板版本和引用。为继续逐篇语义重审恢复登记空间，不以拆分授予正文或执行信用。

## 范围

唯一设计见[storage v2 设计](../../phase-governance/reviews/20261018-document-registry-storage-v2-design.md)。允许修改 registry 存储、公开 loader/writer、三个在用 consumer、三项危险旧生成入口及文档工具的 schema fixture/专项反例；根 Owner 维护本卡、看板、索引、显式迁移映射及 review pin。禁止改产品、旧产品测试、coverage、Biome 上限或 ignore。

## 前提真值门

冻结源为 `3fae68aec8f448bf83d1d85e61da35c94d5200ae` 的 `document-registry.json`：1,047,444 字节，SHA256 `921eaef61673fdf83c69763e1f2e9a72e55b08afaf67bc8b5930dbd08331ae33`，2374 条，剩余 1132 字节。main 仍为 `28fd9013e09e8792decbff2fa117aae14c36b196`，本任务只在候选 worktree 推进。

当前 449 条 content-reviewed / 443 条 template-compliant 是账本继承投影，不是本卡新认证。1896 条历史撤回中仅 S02 已重授一篇；S01 在撤回集合之外。固定 1838 cohort 不因拆分或新增文件变化。

## 上下文锚点

- [文档模型](../guides/documentation-model.md)：显式源 SHA、目标、链接重算、真实 consumer；JSON 原生字段与事实权保持。
- [纠错卡](DOCS-RECORD-INTEGRITY-1.md)：五项历史回执隔离、原失败保留；不得恢复 artifactOnly 完成捷径。
- [全量卡](DOCS-FULL-TEMPLATE-1.md)：真实逐篇重审、非作者验收与全量硬门仍未满足。

## 验收条件

- 2374 个源 entry 对象和值逐一相等、原顺序可重建，迁移映射逐条记原索引与目标索引；新增项另列，状态不升档。
- loader 拒绝缺片、hash/count/summary/phase 漂移、重复或越界位置、丢失条目及越界/符号链接路径；writer 先格式化后 hash，manifest 最后发布，并检测输入变化。
- 三个在用 consumer 走同一 loader；危险旧生成器在任何写入前明确失败；专项测试保留并验证既有质量断言。
- 真实 consumer、文档工具测试、check:docs、lint、staged 与完整基点 diff 均保留命令/输入/原始输出；全量语义门的真实失败不改成通过。
- 非作者复核固定代码及迁移产物；未满足全量硬验收前不得合 main、标 done 或宣布统一门通过。

## 当前模式推进记录

Codex build allowed，仅隔离文档存储候选。`receipt_integrity_independent` 非作者接收固定 `38f18ff9102bf45104573b29beda4e3a2b662483` 的设计 2.0.2，设计 SHA `830e81119d2936f6cc714bcb75a1fd6f66b7d15663656fa0cf7d4bc888c4a75c`。独立报告 SHA `992fac9597ff974dc6a3d5d26ee447d2409173f9fd6f341b1d2cfe1099130870`，原报告与110项产物保存在`/tmp/type-pal-registry-design-independent-20261018-09ecbcbb`，中央证据登记待存储扩容后接入。原两个 counter 仅在设计层闭合，不授实现或全量信用。

指定唯一实现 Owner `/root/registry_storage_author`，隔离 worktree `docs-registry-storage-v2/type-pal`，候选分支 `codex/docs-registry-storage-v2`。允许其按本卡设计写公开工具/adapter/文档工具fixture及真实2374源的manifest+七片；显式映射由其工具生成到/tmp供root独立核验后登记。root不同时写其实现白名单，中央review/pin/卡/索引仍由root维护。固定源不加新条目、不变状态；新增登记另列待接入清单。

## Draft: 设计与风险

本卡与设计为已明确列出的新增候选，因旧 registry 无安全扩展空间暂未接入其 entries；这是待拆分迁移的显式登记缺口，不能宣布零孤儿。旧 registry 保持冻结，新增文件在 v2 接入时连同 review 记录登记为 partial-review-unknown / needs-migration，未接入前不授信用。

## Build: 实现与自测

设计门已完成：root实际check:docs1、lint0与完整基点/staged diff0；非作者自己的完整check超时照原保留，不借作者128测试替换其退出码。非作者strict/progress仍失败，board/index当前两处pin漂移待实际delta接入处理，不能伪称零诊断。实现 Owner 只写专属隔离worktree，交固定候选后由root独立核实现、迁移与反例；通过存储验收后才接入S03中央记录。

## Review: 审查与返工

设计与固定实现分别获得限定接收；中央真实接入待核，任务仍build，不将存储验收误称正文或全量验收。全量strict/require-complete仍真实失败。

设计原报告与110项产物已按原SHA/无损gzip映射接入[本卡证据](../evidence/DOCS-REGISTRY-SPLIT-1/README.md)。以下保留拆分前的初轮待验观察；固定95的逐项闭合见下节，旧反例本身不重写成通过：

- REGISTRY-MIGRATION-OUTPUT-PREFLIGHT：root在owned/tmp真实运行缺mapping父目录的CLI，exit1但源已由v1转v2并写七片，mapping缺失。原完整输出与限制见[独立反例](../evidence/DOCS-REGISTRY-SPLIT-1/implementation-output-counter.json)；作者已修前置排他输出fd，仍待固定候选独立重跑。
- 映射TOCTOU：源码观察到publish解锁后重新读live分片，可能与返回snapshot错批；作者已改私有验证bytes并报告双writer反例，待root固定源码与实跑复核。此观察不虚称原路径已有race实跑。
- 半发布判别力：原SIGKILL用例只改manifest scopeNote，首片字节未实际变化。作者正增强为真实首片delta/旧manifest混包，核锁拒绝、SHA拒绝及全部旧bytes恢复凭证。

### 固定95def601的非作者限定存储接收

- 37原实现因首段`./..`与空段别名counter退回；db814e补丁再因孤立UTF16代理项被Node编码到同一文件退回。两份原rework报告与全部失败保留，95def601仅拒非法scalar，合法中文/内部空格/emoji及补充平面字符继续通过。
- 非作者报告SHA `6753b624bd867d706db48cf5e110c960b3c28e4ed97fd001b676183dda7b1d0d`，228项清单逐项核对。50专项与178工具测试实跑通过、lint4462文件零诊断，完整治理门仍FAIL；不是228个不同测试，亦不授产品或历史执行信用。
- root将三笔作者提交同字节接入候选，固定canonical快照为`b7534fc5b2d9d9c640f311d548cf64d96f51d92d`。root实际逐项重核原2374对象/顺序/键、八metadata、每个sourceIndex/objectSHA/shard/localIndex/globalPosition及八目标文件的原mapping↔canonical字节；[机械回执](../evidence/DOCS-REGISTRY-SPLIT-1/canonical-intake-b7534fc5.json)不冒称非作者或正文审阅。
- root中央接入脚本首版在owned/tmp被独立检出输出前置、引用环、伪独立布尔升档和并发自动pin四类counter；首版从未用于仓库。固定344623版先核DAG/输出排他FD，升档仅许S03/S04固定body+report SHA，所有target绑定精确已核bytes。独立合法pending/S03与完整七条donor的S04正反针通过，真实中央计划和结果仍须另验。发布后竞态并非事务回滚，原始捕获与空输出区别保留。
- 新报告、无损映射、设计/本卡、七片等逐项登记partial/needs；原2374继承条目不因扩容升档。行政board/index仅核原新增registry任务行与producer字节，不借此称全索引或全部卡语义重审。
- 首轮中央入账33项后，实际178工具通过、文档结构零问题，但lint因四份原始报告格式不合规则失败，完整raw保留。原始报告移入已指明的无损容器，同名文件只作JSON值相等的格式化阅读投影；配对表分别钉原件与展示SHA，未篡改命令数字、exit或原报告。修正后须重跑，不把首次失败改成通过。

## 用户验收

用户已授权持续完成全量治理、纠错和结构方案，不逐批申请。新的产品取舍、不可逆清理仍超出本卡。
