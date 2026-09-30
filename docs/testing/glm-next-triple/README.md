# GLM L–N：三条独立大包（2026-09-30）

用户要求三个可并行开启的 GLM 对话，各自独立分支/工作树、测试 Owner 和证据目录。
[冻结目标](targets.json)列 18 组、62 个互异生产源；
`node docs/testing/glm-next-triple/verify-targets.mjs` 从 `f70db722` 核源字节与
A–K 历史目标去重。L/M 仅属 Editor 的不同文件族，N 仅属 Reforge。
Codex 当前 E2E-R4-1 的主树改动不可拿走或改写；三包都不占剧情路线/检查点测试。

官方 fast 基线 `49584/63398`（78.21%），距 85% 还需 **4305** 个净命中臂，
前提是分母不变。2026-09-29 本地 fast 逐文件报告对 L/M/N 冻结目标分别列
1155/1301/1473 个未命中分支，合计 3929；这是**缺口上限线索**，包括可能不可达、
旧测已有语义证明、只能由产品缺陷暴露的分支，绝非可获得收益。
即使全部命中，这三包单独也仍距 85% 至少 376 臂；不能以三包完成宣称 85%。
本地 fast 总计比正式冻结基线多 1 个 Game 命中臂，不据此改写官方起点。

交付证据目录：[N（Reforge 非剧情宿主）](wave-N/README.md)。

## 三包共同执行与验收

1. 从卡面指定的已推送派发提交各建独立 `codex/` 分支和独立工作树；不得共用可写
   fixture、截图目录、测试文件或证据目录。每包专属目录
   `docs/testing/glm-next-triple/wave-<ID>/**`，新测试文件命名
   `<stem>.glm-l.test.ts(x)` / `.glm-m` / `.glm-n`，薄 fixture 放
   `packages/<owner>/src/__tests__/glm-<id>/**`。冻结表、verifier、任务卡和看板只读。
2. 每组先读现行公开调用方、旧测试 **fullName 和实际断言**、对应守卫/类型；记录
   `new-contract / existing-proof / unreachable / blocked`。只为合法可达且未重复的
   当前合同写新测；不得按文件覆盖数字机械加 case。产品源、旧测、公共 fixture、
   共享配置/依赖、官方 coverage baseline、资产及 E2E 文档一概只读。
3. 使用真实公开入口和合法 typed fixture；不能 mock 被测业务核心、反射私有态、
   `any`/双强转/`as never`/`@ts-ignore`/`@ts-expect-error`、改测试答案凑绿。
   同输入正反对照、可观察最终状态/回调/资源释放；异步用 deferred/事件，不以
   固定 sleep 或测试 timeout 代替业务断言。发现真产品缺陷或用户可见选择，保留
   最短红诊断并停对应组，请 Codex 另卡，不越界改产品。
4. 每包至少 4 枚跨组代表性反控：合法输入单轴变异，未注入正控 exit0；注入后
   目标新增 file/fullName 实际执行且仅目标业务断言红、exit1。判据拒绝 skip、
   timeout、收集/环境错误、额外用例红、零执行及“仅改期望值”；恢复后源 hash 不变。
5. 交新鲜 Vitest JSON（file/fullName/status）、组别排重账、反控正控与判据、
   浏览器实际操作和 console/截图哈希（卡面适用时）、未证项、完整 40 位候选 SHA。
   定向/相邻测、包 typecheck、`pnpm lint` 完整 0 error/0 warning/0 info、
   `node scripts/docs/check.mjs`、`git diff --check` 必跑；失败如实报告。
   只做隔离私有覆盖对照，同分母算本包增量；不更新或解释官方 ratchet。
6. GLM 提交并推送候选，但不合 main、不标 done、不清理他人工作树。Codex 独立复核
   三包及交集后**选择性**集成，串行全仓 `check → coverage:ratchet → 受保护 fast`；
   只以 main 并集实测净增为准，不能相加隔离分支的百分比。
