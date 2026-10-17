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
