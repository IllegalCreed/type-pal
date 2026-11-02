# 检查环境隔离与真实宿主测试负载

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-ENV-STABILITY-1 回执（2026-09-24，Codex 独立实施，用户明确本批暂不安排 GLM/Kimi 不代签）：三个问题面——NODE_COMPILE_CACHE 覆盖精度污染、flows 五首例并发超时、覆盖插桩下 AST 重复编译超时；最终源码 `e17af240` 三门 exit0，两卡已核 done。

## Scope

- 对象=检查环境隔离（preciseCoverageEnvironment 子进程环境）与真实宿主负载（Reforge maxWorkers=2）+AST 编译缓存。

## Execution and assertions

- **缓存根因**：Node22.19.0/22.23.2 分别开/禁 NODE_COMPILE_CACHE 均 9/10 与 10/10；失败是 same-range 初始化计数，升级 Node 不消除；Node 官方文档明确编译缓存可能降低 V8 覆盖精度；新增 preciseCoverageEnvironment 仅构造子进程环境：移除 NODE_COMPILE_CACHE、强制 NODE_DISABLE_COMPILE_CACHE=1（调用者 override 不能重开）、其它变量保留；官方 runner 所有 spawn 与自测真实子进程接入；不放宽断言或降基线；带污染环境工具自测 Node30 30 绿+Node22.23.2 30 绿
- **flows 负载**：原两轮各 3 失败=boot/menu/dialog/save/scene 五首例超时（非固定三用例）；installShellHost resetModules 首次冷图加载在测试计时内+11 核多 worker 争用；Reforge vite 配置仅增 maxWorkers=2（直接 Vitest/包 test/官方覆盖统一消费）；不改 timeout/身份/isolate/断言/排除；同树对照 Reforge 全集与 game/pal-extract 同时运行两轮 1,460/1,460；首例 3326/3326/3326/3426/3368ms→1927/598/503/654/626ms；总耗时 18.2s→34.4s 明确接受吞吐换稳定余量不宣称加速
- **AST 残项**：首次统一 check 8,381 绿后 ratchet 在 Reforge 发现 3 旧链超时（checkpoint DEV 注册例 6,041ms、save-lineage 5,631/5,614ms）；根因=fixture 每次 harness 重新解析 main 原文并 transpile；修复仅缓存编译工厂（严格按 source+names+properties 键，每次新 env 新闭包；DEV lazy 复用但每次真实注册；lineage 共享只读 AST）；新增 3 fixture 回归+负控源键删除实际报 3≠6 AssertionError；带 V8 插桩 23 项全绿最慢 1,660ms；未修改 Node 默认版本/依赖锁/测试超时
- **最终门**：最终源码 e17af240 重新串行；check 8,384、ratchet 7,893/633、受保护单次 strict 7,893/633 均 exit0；严格跑前后基线 hash 一致；机账 stability-fire-closeout-evidence.json 保留首轮失败

## Results

- 本轮时长是诊断观察，不是严格性能基准或速度承诺；仍需最终全仓同口径门禁确认。

## Evidence

- 证据路径：本回执正文（quote 保全）；/tmp JSON 与日志按原文时点。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| 环境稳定 | 2026-09-24 | 缓存隔离+maxWorkers+AST 工厂缓存 | 三门 exit0，两卡 done | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy quality/quality-gates 的环境稳定回执；固定来源与 source SHA 见下方保全节。

## 原始结论

三根因（编译缓存精度/冷图并发超时/AST 重复编译）修复+对照数字；吞吐换稳定余量如实登记。

## 当时证据

对照表、修复边界与最终门数字在 quote 保全。

## 当前有效性

historical。性能数字按当时机器；当前配置以现行 vite/runner 为准。

## 继任文档

当前结论归 TEST-ENV-STABILITY-1 完成卡与现行配置。

## 原文保全

固定源 revision `b6b32d2ac3c0276357e43eee8658c50da8da695b`，source SHA `00d9a939e7b274f3c8af67482a3cb560b2c96a30dfa80e895f59eba0758470cf`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # 检查环境隔离与真实宿主测试负载
>
> 2026-09-24，Codex独立实施；用户明确本批暂不安排GLM/Kimi，不代签。
> 任务卡：[TEST-ENV-STABILITY-1](../../../../../ops/archive/tasks/done/TEST-ENV-STABILITY-1-cache-and-host-load.md)。
>
> ## 缓存根因与修复
>
> 相同工具自测在Node22.19.0和22.23.2分别开启/禁用NODE_COMPILE_CACHE，两版本均为9/10与10/10。
> 失败是same-range初始化计数；升级Node不消除它。Node官方module文档明确指出编译缓存可能降低V8覆盖精度。
> Codex当前进程原无该变量，Cursor报告过注入；因此不能把所有Agent环境混为一谈。
>
> 新增`preciseCoverageEnvironment`仅构造子进程环境：不修改调用者输入，移除NODE_COMPILE_CACHE，
> 强制NODE_DISABLE_COMPILE_CACHE=1（调用者override也不能重开），其它变量照常保留。
> 官方runner的所有spawn与原生/Vitest初始化自测的真实子进程都接入；不放宽现有断言或降低统计基线。
> 真实子进程测试观察getCompileCacheDir为空及禁用标记，另有冻结输入/覆盖优先级回归。
> 带污染环境的全部工具自测：当前Node30项绿；Node22.23.2也30项绿（最终全仓再统一验）。
>
> ## flows负载
>
> 原两轮日志各3失败，合计boot/menu/dialog/save/scene五个首例超时5000ms；不是固定三个用例。
> installShellHost会resetModules，首次真实import main的冷图加载处于测试计时内；11核机器默认多worker与兄弟包并发争用。
> Reforge vite配置仅增加maxWorkers=2，直接Vitest、包test与官方覆盖统一消费；不改timeout、测试身份、isolate、断言或排除。
> 工具回归直接加载真实配置并钉仅该测试选项，防止夹带宽限或删测试。
>
> 同树对照使用Reforge全集与game、pal-extract同时运行，两轮均1460/1460；此前失败日志作为已有反例，
> 本次没有假称默认调度每次必红。首轮还并行了缓存工具自测，因此这些时长是诊断观察，不是严格性能基准或速度承诺：
>
> | 首例 | 默认并发 | 受控2 worker |
> |---|---:|---:|
> | boot | 3326ms | 1927ms |
> | menu | 3326ms | 598ms |
> | dialog | 3326ms | 503ms |
> | save | 3426ms | 654ms |
> | scene | 3368ms | 626ms |
>
> Reforge总耗时18.2s→34.4s，明确接受吞吐换稳定余量，不宣称加速；仍需最终全仓同口径门禁确认。
> JSON为`/tmp/type-pal-flows-{default,bounded}.json`，兄弟包日志为`/tmp/type-pal-load-{before,after}-*.log`。
> 缓存对照在临时`codex-cache-review-J14hpe`；修复后日志`/tmp/type-pal-cache-fixed*.log`。
>
> ## 覆盖插桩下的AST重复编译残项
>
> 首次统一check8381绿后，ratchet在Reforge发现3个旧链测试超时：checkpoint的同步DEV注册例6041ms，
> save-lineage两例5631/5614ms，不能按普通套件绿就放行。日志`/tmp/type-pal-stability-fire-ratchet.log`。
> 实际fixture每次harness都重新解析main原文并transpile同一组绑定；DEV例一次构造两个harness，
> lineage每次选择四个适配器和胜利分支均重新解析整文件。耗时位于测试用AST准备，不是放宽产品异步协议。
>
> 修复仅缓存编译工厂（严格按完整source+names+properties键），每次仍以新env执行，返回新闭包；
> DEV编译lazy复用但每次真实注册；lineage共享只读AST，匹配唯一性断言仍逐次执行。
> 新增3个fixture回归钉环境隔离、同名源变异不复用、绑定选择以及缺失/歧义仍拒绝；不改旧业务断言。
> 带V8插桩的23项针对性验证全绿，最慢1660ms，原lineage两例1089/205ms；局部覆盖只供耗时诊断，不当官方分子。
> 单点删缓存键中的source由新增负控源用例应当业务红，防止优化吞掉历史突变证据。
>
> 未修改Node默认版本、依赖锁或测试超时。最终源码e17af240已重新串行完成check8384、ratchet7893/633、
> 受保护单次strict7893/633，均exit0，严格跑前后基线hash一致；负控源键删除后实际报3≠6的AssertionError。
> 两卡均由用户批准Codex独立完成，缺席席位不代签；已核done。完整[机账](stability-fire-closeout-evidence.json)保留首轮失败。
>
<!-- original-source-quote:end -->
