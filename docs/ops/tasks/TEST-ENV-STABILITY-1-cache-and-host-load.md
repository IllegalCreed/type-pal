# TEST-ENV-STABILITY-1 - 检查环境隔离与宿主测试负载

Status: review
Phase: cross-phase
Capability: 既有测试基础设施维护，不增产品能力
Coding Owner: Codex
Reviewer: Codex（用户本次批准独立完成）
Visual Verification Owner: N/A
Unavailable Agents: Kimi额度耗尽；GLM按用户本次安排不参与，不代签
Revision: r1
Base: 1b4cf055

## 目标与边界

检查进程不受宿主NODE_COMPILE_CACHE干扰；真实宿主flows在合理受控并发下稳定运行。
不删/skip测试、不放宽5000ms、不减生产分母、不改游戏业务或升级Node/依赖。

## 前提真值与锚点

| 维度 | 直接证据 |
|---|---|
| primary | Node官方module compile cache说明V8覆盖可不精确；NODE_DISABLE_COMPILE_CACHE=1可关闭 |
| 一阶段 | N/A：基础设施环境隔离，不裁决原版机制 |
| 当前仓库 | merge-initializers.test.mjs:74/175子进程继承宿主环境；run.mjs:62同样直传；22.19/22.23.2开启缓存均9/10、禁用均10/10 |
| 目标 | collector/self-test所有覆盖子进程强制禁用缓存；其它环境保留；正常/反控下的业务计数保持 |

失败日志：`/tmp/type-pal-check-full.log`、`/tmp/type-pal-check-r.log`两轮各3个5000ms超时，合计boot/menu/dialog/save/scene五个首例；
当前Reforge未设maxWorkers，宿主installShellHost执行resetModules后真import main；11核机器默认多worker+跨包并发。
最强替代解释是业务Promise不收口；须先记录冷加载/全套并发与受控worker的实际耗时对照，不凭单独绿判修复。
Node矩阵证据在临时`codex-cache-review-J14hpe`；不是Node升级修好了问题。

## 方案与验证

1. 显式覆盖子进程环境helper：移除NODE_COMPILE_CACHE、强制NODE_DISABLE_COMPILE_CACHE=1，输入环境不变，保留其它变量；原生捕获和Vitest收集均接入。
2. 子进程真实启动回归+继承污染的全覆盖工具自测；原判据/原生V8合并回归不削弱。
3. 先做同树默认/受控并发性能对照，再限定Reforge测试worker（含直接Vitest与官方口径）。不改旧业务断言、隔离或超时。
4. 全套定向/TC/Biome及最终整批check→ratchet→单次严格fast；配置摘要变化如实登记，不把它当新增业务覆盖。

## 推进签字

- Codex：premise verified / design agree（2026-09-24）；直接双版本缓存反例与失败日志、现行子进程继承链已核，性能方案仍以对照证据确定。
- Kimi/GLM：用户本次明确“glm你也不用管了先，你先独立完成工作吧”批准Codex单席推进；不是二席签字。
- 风险：缺少第三方独立终审；本次范围为环境/测试稳定性，保持硬门禁与负控，不外推其它卡。
- build准入：build allowed（用户本次独立授权，Codex记录）。
- 实施验证：污染环境下两Node版本的工具自测30/30，真实子进程缓存关闭；受控并发对照1460/1460，首例从约3.3～3.4s降到0.5～1.93s（不宣称严格性能基准/总耗时更快）。旧断言与5000ms不改；统一门禁待验。
- 首次ratchet发现3个AST链旧测试插桩后超时，未放行。只读源码解析/编译工厂按完整源+请求键缓存，每次执行仍用新env/闭包；lineage只读AST复用。新增3项隔离/源突变/缺失歧义回归，插桩23项通过；旧业务断言不变。此维护属于本卡负载根因处理，不扩产品修复范围。
- done准入：pending，须统一门禁完成。详见[实施记录](../../testing/check-environment-stability.md)。

## 交接日志

- 2026-09-24 Codex：承接用户授权，单席环境维护；FIRE产品修复另卡独立，worktree清理另记运维回执，不混作测试贡献。

无下一位Agent提示词；本批由Codex独立完成，完成后报告用户。
