# TEST-ENV-STABILITY-1 - 检查环境隔离与宿主测试负载

Status: done
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: task-card-v1 / 1.0.0

本页把已关闭 ops 任务卡接入 `task-card-v1`，并追加 `archive-record-v1` 历史边界。原始状态、日期、证据、counter、链接和未决项在 quote 中保全；历史 done 不自动授权当前 build、runtime、E2E、视觉或 coverage。

## 目标
- 保留原任务的目标、完成边界、历史结论和用户可见适用范围。

## 范围
- 当前包含：原卡声明的实现/测试/证据范围及其历史限制。
- 明确不包含：本次迁移不修改产品源码、旧测试、真实数据或历史结论。

## 前提与证据
- primary source：固定 source revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b` 与原卡全文。
- 合法输入、caller、证据和 counter：按原文 quote 解释；本次不重跑原执行。
- 事实权：当前 task card、代码、consumer 和新 receipt；历史卡不单独证明当前行为。

## 验收
- 原卡历史验收、失败、blocked、rework 和未执行边界保持原样。
- 本次迁移验收：source/after SHA、quote inverse、模板章节、链接和历史 overlay 通过。
- runtime/E2E/视觉/coverage：本次均未执行，信用为 0。

## 状态与交接
- `status`: done（历史快照）；当前工作不得从 quote 中自动获得 build 授权。
- Owner/provenance：原卡保留于 quote；当前文档治理 owner 为 Codex。
- 下一步：若需重新启用，创建当前 task card，重新核 primary source、合法输入、business oracle 和独立验收。

## 历史范围
- 原始日期、版本、阶段：源文档固定于 `bb7b1d24e9e517e09730282b104ce51b4204cb0b`；本轮为 2026-10-17 R42。
- 归档原因：已关闭任务记录只作为时点事实保留，避免历史状态冒充当前事实。

## 原始结论
- `Status: done`；原始任务语义完整保留于下方 quote。

## 当时证据
- 原始命令、产物、SHA、签字、counter、链接和状态保留于 quote。

## 当前有效性
historical。do not promote historical task card to current runtime/E2E/visual/coverage acceptance
- 历史冲突/未决：需由当前 task card、consumer 和新证据重新复核。

## 继任文档
- 当前 canonical 文档：当前任务卡、当前代码/consumer 和 fresh receipt。
- supersedes / superseded-by：替代 governed-legacy 的未分层呈现；原卡内容不删除。
- 若重新启用的复核条件：合法输入重跑、业务 oracle 可证伪、独立 review 和全量静态门通过。

## 原文保全
固定源 revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b`，source SHA `832e82753a956d2d57024037cadd6e51cd1ae5c481d75ba1d6e3cbe1c7bd1925`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-ENV-STABILITY-1 - 检查环境隔离与宿主测试负载
>
> Status: done
> Phase: cross-phase
> Capability: 既有测试基础设施维护，不增产品能力
> Coding Owner: Codex
> Reviewer: Codex（用户本次批准独立完成）
> Visual Verification Owner: N/A
> Unavailable Agents: Kimi额度耗尽；GLM按用户本次安排不参与，不代签
> Revision: r1
> Base: 1b4cf055
>
> ## 目标与边界
>
> 检查进程不受宿主NODE_COMPILE_CACHE干扰；真实宿主flows在合理受控并发下稳定运行。
> 不删/skip测试、不放宽5000ms、不减生产分母、不改游戏业务或升级Node/依赖。
>
> ## 前提真值与锚点
>
> | 维度 | 直接证据 |
> |---|---|
> | primary | Node官方module compile cache说明V8覆盖可不精确；NODE_DISABLE_COMPILE_CACHE=1可关闭 |
> | 一阶段 | N/A：基础设施环境隔离，不裁决原版机制 |
> | 当前仓库 | merge-initializers.test.mjs:74/175子进程继承宿主环境；run.mjs:62同样直传；22.19/22.23.2开启缓存均9/10、禁用均10/10 |
> | 目标 | collector/self-test所有覆盖子进程强制禁用缓存；其它环境保留；正常/反控下的业务计数保持 |
>
> 失败日志：`/tmp/type-pal-check-full.log`、`/tmp/type-pal-check-r.log`两轮各3个5000ms超时，合计boot/menu/dialog/save/scene五个首例；
> 当前Reforge未设maxWorkers，宿主installShellHost执行resetModules后真import main；11核机器默认多worker+跨包并发。
> 最强替代解释是业务Promise不收口；须先记录冷加载/全套并发与受控worker的实际耗时对照，不凭单独绿判修复。
> Node矩阵证据在临时`codex-cache-review-J14hpe`；不是Node升级修好了问题。
>
> ## 方案与验证
>
> 1. 显式覆盖子进程环境helper：移除NODE_COMPILE_CACHE、强制NODE_DISABLE_COMPILE_CACHE=1，输入环境不变，保留其它变量；原生捕获和Vitest收集均接入。
> 2. 子进程真实启动回归+继承污染的全覆盖工具自测；原判据/原生V8合并回归不削弱。
> 3. 先做同树默认/受控并发性能对照，再限定Reforge测试worker（含直接Vitest与官方口径）。不改旧业务断言、隔离或超时。
> 4. 全套定向/TC/Biome及最终整批check→ratchet→单次严格fast；配置摘要变化如实登记，不把它当新增业务覆盖。
>
> ## 推进签字
>
> - Codex：premise verified / design agree（2026-09-24）；直接双版本缓存反例与失败日志、现行子进程继承链已核，性能方案仍以对照证据确定。
> - Kimi/GLM：用户本次明确“glm你也不用管了先，你先独立完成工作吧”批准Codex单席推进；不是二席签字。
> - 风险：缺少第三方独立终审；本次范围为环境/测试稳定性，保持硬门禁与负控，不外推其它卡。
> - build准入：build allowed（用户本次独立授权，Codex记录）。
> - 实施验证：污染环境下两Node版本的工具自测30/30，真实子进程缓存关闭；受控并发对照1460/1460，首例从约3.3～3.4s降到0.5～1.93s（不宣称严格性能基准/总耗时更快）。旧断言与5000ms不改；统一门禁待验。
> - 首次ratchet发现3个AST链旧测试插桩后超时，未放行。只读源码解析/编译工厂按完整源+请求键缓存，每次执行仍用新env/闭包；lineage只读AST复用。新增3项隔离/源突变/缺失歧义回归，插桩23项通过；旧业务断言不变。此维护属于本卡负载根因处理，不扩产品修复范围。
> - Codex：accept（实施者自验，e17af240）；完整check8384、保护1b4cf055的ratchet7893/633及单次strict7893/633均exit0，编译环境污染注入下30工具自测通过，旧断言/超时/范围不弱化。
> - Kimi/GLM：用户本次明确批准独立完成的缺签豁免，非二席accept；补签不作为本次done前置，可后续异步抽查，不外推其它任务。
> - done准入：done allowed，Codex统一核定done（2026-09-24）。详见[实施记录](../../../../testing/archive/legacy/quality/quality-gates/check-environment-stability.md)/[统一机账](../../../../testing/archive/legacy/quality/quality-gates/stability-fire-closeout-evidence.json)。首次ratchet超时保留为失败记录，优化后才重跑整套，不择多数放行。
>
> ## 交接日志
>
> - 2026-09-24 Codex：e17af240通过最终check8384/ratchet及单次strict7893/633，Node22.23.2与宿主缓存污染输入均留证。按用户本批单席授权核done归档；旧AST重复编译已修，新增缓存键/环境隔离回归与单点反控，业务断言和5秒不变。
> - 2026-09-24 Codex：承接用户授权，单席环境维护；FIRE产品修复另卡独立，worktree清理另记运维回执，不混作测试贡献。
>
> 无下一位Agent提示词；本批已由Codex独立完成并向用户交付，不外推后续缺签豁免。
<!-- original-source-quote:end -->
