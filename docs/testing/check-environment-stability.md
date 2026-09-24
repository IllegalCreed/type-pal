# 检查环境隔离与真实宿主测试负载

2026-09-24，Codex独立实施；用户明确本批暂不安排GLM/Kimi，不代签。
任务卡：[TEST-ENV-STABILITY-1](../ops/archive/tasks/done/TEST-ENV-STABILITY-1-cache-and-host-load.md)。

## 缓存根因与修复

相同工具自测在Node22.19.0和22.23.2分别开启/禁用NODE_COMPILE_CACHE，两版本均为9/10与10/10。
失败是same-range初始化计数；升级Node不消除它。Node官方module文档明确指出编译缓存可能降低V8覆盖精度。
Codex当前进程原无该变量，Cursor报告过注入；因此不能把所有Agent环境混为一谈。

新增`preciseCoverageEnvironment`仅构造子进程环境：不修改调用者输入，移除NODE_COMPILE_CACHE，
强制NODE_DISABLE_COMPILE_CACHE=1（调用者override也不能重开），其它变量照常保留。
官方runner的所有spawn与原生/Vitest初始化自测的真实子进程都接入；不放宽现有断言或降低统计基线。
真实子进程测试观察getCompileCacheDir为空及禁用标记，另有冻结输入/覆盖优先级回归。
带污染环境的全部工具自测：当前Node30项绿；Node22.23.2也30项绿（最终全仓再统一验）。

## flows负载

原两轮日志各3失败，合计boot/menu/dialog/save/scene五个首例超时5000ms；不是固定三个用例。
installShellHost会resetModules，首次真实import main的冷图加载处于测试计时内；11核机器默认多worker与兄弟包并发争用。
Reforge vite配置仅增加maxWorkers=2，直接Vitest、包test与官方覆盖统一消费；不改timeout、测试身份、isolate、断言或排除。
工具回归直接加载真实配置并钉仅该测试选项，防止夹带宽限或删测试。

同树对照使用Reforge全集与game、pal-extract同时运行，两轮均1460/1460；此前失败日志作为已有反例，
本次没有假称默认调度每次必红。首轮还并行了缓存工具自测，因此这些时长是诊断观察，不是严格性能基准或速度承诺：

| 首例 | 默认并发 | 受控2 worker |
|---|---:|---:|
| boot | 3326ms | 1927ms |
| menu | 3326ms | 598ms |
| dialog | 3326ms | 503ms |
| save | 3426ms | 654ms |
| scene | 3368ms | 626ms |

Reforge总耗时18.2s→34.4s，明确接受吞吐换稳定余量，不宣称加速；仍需最终全仓同口径门禁确认。
JSON为`/tmp/type-pal-flows-{default,bounded}.json`，兄弟包日志为`/tmp/type-pal-load-{before,after}-*.log`。
缓存对照在临时`codex-cache-review-J14hpe`；修复后日志`/tmp/type-pal-cache-fixed*.log`。

## 覆盖插桩下的AST重复编译残项

首次统一check8381绿后，ratchet在Reforge发现3个旧链测试超时：checkpoint的同步DEV注册例6041ms，
save-lineage两例5631/5614ms，不能按普通套件绿就放行。日志`/tmp/type-pal-stability-fire-ratchet.log`。
实际fixture每次harness都重新解析main原文并transpile同一组绑定；DEV例一次构造两个harness，
lineage每次选择四个适配器和胜利分支均重新解析整文件。耗时位于测试用AST准备，不是放宽产品异步协议。

修复仅缓存编译工厂（严格按完整source+names+properties键），每次仍以新env执行，返回新闭包；
DEV编译lazy复用但每次真实注册；lineage共享只读AST，匹配唯一性断言仍逐次执行。
新增3个fixture回归钉环境隔离、同名源变异不复用、绑定选择以及缺失/歧义仍拒绝；不改旧业务断言。
带V8插桩的23项针对性验证全绿，最慢1660ms，原lineage两例1089/205ms；局部覆盖只供耗时诊断，不当官方分子。
单点删缓存键中的source由新增负控源用例应当业务红，防止优化吞掉历史突变证据。

未修改Node默认版本、依赖锁或测试超时。最终源码e17af240已重新串行完成check8384、ratchet7893/633、
受保护单次strict7893/633，均exit0，严格跑前后基线hash一致；负控源键删除后实际报3≠6的AssertionError。
两卡均由用户批准Codex独立完成，缺席席位不代签；已核done。完整[机账](stability-fire-closeout-evidence.json)保留首轮失败。
