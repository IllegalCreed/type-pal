# CODE68 countdown 测试复审与去重

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

历史 CODE68 的两份 countdown 测试存在重复与失实注释:原四例在创建/更新与移除路径重复;GLM 文件头注声称'相同文字不重写'实际从未调用同文字,且'无副作用可观察'不成立——DOM MutationObserver 能观察重复的 textContent 写入;旧 CODE3j 的'未发现重复'结论由本片纠正,旧 raw 保留原时点。基点 4121531c7、唯一分支 codex/code-quality-3y,修改白名单为两份 countdown 测试与本批治理记录;生产 countdown.ts、UI、公共 API、schema/save、资产管线均未修改;本片不作整卡 accept,CODE68 当前为 partial。2026-10-18 波次勘误:统一门 [README.md](../53-wave-gates/README.md) 信用撤回。

## 范围与证据

完整读取两份测试、29 行 countdown 实现、speedrun/index 与 timer,SHA/边界见 [read-boundaries.json](read-boundaries.json)。index 每 rAF 传入正整数秒的字符串;禁用或没有倒计时时传 null;timer 拥有暂停和时钟,countdown 只拥有 DOM 节点;无异步资源/网络/计时器。primary 是 speedrun design Task 7 的字符串/null 视图合同及真实 index caller,不涉及 SDLPal 机制;未做浏览器视觉验收。

## 发现

countdown.test.ts 合入原 GLM 的节点身份、单根、pointer-events、null 幂等与重建 oracle,两个生命周期测试负责创建/更新、移除/重建;countdown.glm-phase1-leaves.test.ts 撤掉重复生命周期用例,改核同文字刷新无 DOM mutation、无 document 时字符串/null 无 DOM 访问;observer 在 finally 断开、global/spy 在 afterEach 恢复;两文件仍共四例,未为数量保留弱断言。[before-proof.json](before-proof.json) 与 [after-proof.json](after-proof.json) 及 gzip 原生回执记录命令、cwd、退出/信号/spawn、file×fullName、源/副本/hash 和清理;probe.py 只改同目录临时副本,正式生产源两阶段 SHA 相同。四变异矩阵:control 新旧各 4 通过;删除同文字写入 guard——旧 4 通过、新 3 通过+1 指定 AssertionError(原盲点,新 observer oracle 有判别力);更新时替换根节点——旧 3通过/1红、新 3通过/1红(身份 oracle 从 GLM 转到主测试,未丢失);null 不移除——旧 2通过/2红、新 3通过/1红(重复移除 oracle 收敛为唯一生命周期用例)。宿主无 document 一例是合法边界测试,未把移除 guard 引发的运行错误冒充有效业务反控。

## 结论

[test-gates.json](test-gates.json):整个 speedrun 相邻模块与 tools-panel 两测试实际 20 files/104 tests passed,0 failed/pending/stderr;game typecheck 退出 0 无诊断。首次静态门尝试失败(docs/lint 各 exit1,失败原件另存),修正后最终 [static-gates.json](static-gates.json) docs/lint/ledger/diff 全过。两份测试登记已验证;ledger 3311 tracked/282 closed/44 review/2985 pending;全 83 卡 46 partial/37 pending/0 accept。

## 整改与复核

本片未运行全仓 check、coverage ratchet、protected fast;53-wave-gates 仅是早先候选回执不能认证本片,昂贵门留到完整模块/集成窗口;69 的 time-format 重复与相邻输入/隔离缺口继续待核;本片不触碰活跃 53/57/79/80/81/90 的实现,不合 main。未重跑任何命令;历史结论保持原时点;候选待 Owner 非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3552B / SHA-256 861f74702c0a4eeb4af5d19ac71c36ab1a9a48cb5b132aa21d70293277121ef1；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE68 countdown 测试复审与去重

> 2026-10-18 波次门勘误：本页引用的 [47–52统一门回执](../53-wave-gates/README.md) 已撤回“通过/收口”信用，未证明零诊断；不得沿用为本片验收或合并依据。本页原逐文件/定向结果按各自证据保留，旧计数不改写为0。

基点 `4121531c7`，唯一分支 `codex/code-quality-3y`。修改白名单为两份 countdown 测试与本批治理记录；生产 `countdown.ts`、UI、公共 API、schema/save、资产管线均未修改。本片不作整卡 accept，CODE68 当前为 partial。

## 实际读取、caller 与 oracle

完整读取两份测试、29 行 countdown 实现、speedrun/index 与 timer，SHA/边界见 [read-boundaries](read-boundaries.json)。index 每 rAF 传入正整数秒的字符串；禁用或没有倒计时时传 null。timer 拥有暂停和时钟，countdown 只拥有 DOM 节点；无异步资源、网络或计时器。primary 是 speedrun design Task 7 的字符串/null 视图合同及真实 index caller，不涉及 SDLPal 机制；未做浏览器视觉验收。

## 发现与处理

原四例在创建/更新与移除路径重复；GLM 文件注释声称“相同文字不重写”，实际从未调用同文字，且“无副作用可观察”不成立：DOM MutationObserver 能观察重复的 textContent 写入。旧 CODE3j 的“未发现重复”结论由本片纠正，旧 raw 保留原时点。

- `countdown.test.ts`：合入原 GLM 的节点身份、单根、pointer-events、null 幂等与重建 oracle；两个生命周期测试负责创建/更新、移除/重建。
- `countdown.glm-phase1-leaves.test.ts`：撤掉重复生命周期用例，改核同文字刷新无 DOM mutation、无 document 时字符串/null 无 DOM 访问。observer 在 finally 断开；global/spy 在 afterEach 恢复。两文件仍共四例，未为数量保留弱断言，也未增加规则豁免。

## 可证伪验证

[before-proof](before-proof.json)、[after-proof](after-proof.json) 及 gzip 原生 default/JSON 回执记录命令、cwd、退出/信号/spawn、file×fullName、源/副本/hash和清理。`probe.py` 只改同目录临时副本，正式生产源两阶段 SHA 相同，全部副本已删除。

| 隔离变异 | 旧四例 | 新四例 | 结论 |
|---|---|---|---|
| control | 4 通过 | 4 通过 | 恢复对照 |
| 删除同文字写入 guard | 4 通过 | 3 通过/1 个指定 AssertionError | 原盲点，新 observer oracle 有判别力 |
| 更新时替换根节点 | 3 通过/1 红 | 3 通过/1 红 | 身份 oracle 从 GLM 转到主测试，未丢失 |
| null 不移除 | 2 通过/2 红 | 3 通过/1 红 | 重复移除 oracle 收敛为唯一生命周期用例 |

宿主无 document 一例是合法边界测试，未把移除 guard 引发的运行错误冒充有效业务反控。

[test-gates](test-gates.json)：整个 speedrun 相邻模块与 tools-panel 两测试实际 **20 files / 104 tests passed**，0 failed/pending/stderr；game typecheck 退出 0、无诊断。提交前 docs/lint/ledger/diff 结果记 [static-gates](static-gates.json)。本片未运行全仓 check、coverage ratchet、protected fast，53-wave-gates 仅是早先候选回执，不能认证本片；昂贵门留到完整模块/集成窗口。

两份测试登记已验证，ledger 为 3311 tracked / 282 closed / 44 review / 2985 pending。全 83 卡为 46 partial / 37 pending / 0 accept；69 的 time-format 重复与相邻输入/隔离缺口继续待核。本片不触碰活跃 53/57/79/80/81/90 的实现，不合 main。
```
<!-- incremental-original-source:end -->
