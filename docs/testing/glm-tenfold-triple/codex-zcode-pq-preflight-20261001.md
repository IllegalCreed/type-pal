# ZCode 巡检：P r3 / Q r4 固定候选工具与证据预审

2026-10-01 Codex；[机器记录](codex-zcode-pq-preflight-20261001.json)。
这是固定 Git blob 审计、P judge 自测实跑及独立拒收探针，不是整包最终验收。
未重跑业务变异、全包/typecheck/统一门，未合 main、未 done、未正式结算覆盖率。
不向活动 O/Q 树写入文件，不把作者门禁数字改写为本次实跑。

## 调度事实

P 可恢复归档确认框仍在，有限 AX 点击重试未产生变化；没有归档或新建第三槽。
不重复通知同一 UI 阻塞、不排入重复 P Owner。O 原固定候选后已有四枚阶段提交，
本次读取 tip `d0bb58f95065f6d83ecbf9c21d33a0ba61863c45`；只写 O 后缀新测与本波反控证据。
Q 出现 `battle-action-error-arms.glm-q.test.ts` 新文件；本轮未向 UI 发送任何新消息。
提交/文件进展不冒称新的 UI 运行状态或新测试已 accept。

## P：counter，P-R2-01 未完整关闭

固定候选 `48ade197eb508273168f62384141f8d1dde854ec`；P 工作树干净且 judge/自测
与该提交逐字节一致。实际 `node --test .../wave-P/tools/counter-judge.test.mjs`
退出 0，10/10 通过，但自测只证明被列出的拒收条件。

对真实候选导出的 `judgeClean` / `judgeMutant` 独立执行四个反例，均错误返回 `valid:true`：

| 反例 | 实际输入与误收 |
|---|---|
| 零执行 clean | exit 0、testResults=[]、expectedExecuted=0；接受，未拒收零执行 |
| 同数换身份 | restored 只有 different-neighbor，expectedExecuted=1；只核数量，无法核原 file/fullName 身份 |
| 单目标红叠加收集错误 | 一条 target AssertionError，加另一文件空 assertionResults / status=failed / SyntaxError，numRuntimeErrorTestSuites=1；接受 |
| pending clean | exit 0、一条 status=pending；接受，未要求每条 passed |

源锚点：`wave-P/tools/counter-judge.mjs` 的 tests.flatMap、skipped/todo 过滤和执行数比较；
没有检查顶层 runtime/collection 错误、非 passed/failed 状态和完整执行身份。
`wave-P/tools/counter.mjs:276-285` 恢复相仅检查 exit，不调用 `judgeClean` 或比较集合。
同文件隔离树是固定 `/tmp/glm-p-counter-${id}`，会预先递归移除该路径并全局 prune，
未遵循共同协议 mkdtemp 独占与失败 finally 回收边界。

可复核拒收探针（在干净固定 P 候选根，先核文件与候选无 diff；无产品写入）：

```js
import { judgeClean, judgeMutant } from './docs/testing/glm-tenfold-triple/wave-P/tools/counter-judge.mjs'
const file = (name, status, message) => ({
  name: '/repo/packages/editor/src/a.glm-p.test.ts',
  assertionResults: [{ fullName: name, status, failureMessages: message ? [message] : [] }],
})
judgeClean({ exitCode: 0, json: { testResults: [] }, expectedExecuted: 0, label: 'positive' })
judgeClean({ exitCode: 0, json: { testResults: [file('different-neighbor', 'passed')] }, expectedExecuted: 1, label: 'restored' })
judgeMutant({
  exitCode: 1, targetFile: 'src/a.glm-p.test.ts', targetFullName: 'target', positiveExecuted: 1,
  json: { numRuntimeErrorTestSuites: 1, numFailedTestSuites: 2, testResults: [
    file('target', 'failed', 'AssertionError: boom'),
    { name: '/repo/packages/editor/src/b.glm-p.test.ts', status: 'failed', message: 'SyntaxError: broken collection', assertionResults: [] },
  ] },
})
judgeClean({ exitCode: 0, json: { testResults: [file('target', 'pending')] }, expectedExecuted: 1, label: 'restored' })
```

同时核全部 10 枚已有证据：original 产品字节 hash 与候选匹配，find/replace 重建 mutant
hash 与 per-counter receipt 匹配；原始 JSON 恰一红、恢复全 passed，三态 fullName 集合
及每个登记单文件的最终 directed 集合一致。没有把有效业务旧成果重判无效，也不要求
仅工具修正时重造不变业务针。然而 `counters.json[].patch` **10/10 与各 receipt.patch 不同**，
仍含旧 `@@ -1 +1 @@` 腐坏整文 patch；总索引不能作为可重建最终证据。
独立内存 unified-diff/context 审计：per-counter receipt 的10枚 patch 重建字节均命中
mutant hash，总索引10枚均因context mismatch拒收；不是本轮执行git apply或业务变异。

下一步：原白名单内补真实拒收自测；唯一 judge 核完整 file/fullName 多重集合、各相位状态/
顶层与 suite 收集错误及 raw harness 错误，恢复相同样调用；正常 exit 与 signal/spawn 失败
分开。改 mkdtemp/finally 只回收本次树，不全局 prune。由最终 per-counter receipt
重建总索引并逐项验证 patch/hash。旧业务/source/执行集不变时保留原始证据；源或执行集
改变才真实重采受影响针。随后连续补 P02 剩余/P03–P10，F14/F18 仍未证，700/70组/50/20 不缩。

## Q：hash 总索引预审通过，但候选回执 counter

实际 r4 提交是 `9da8354d4e7c706d0c9e1fc70035b351807bf3a3`；文档 pin
`86d2a4c42925ce636691ca573baa5eada94e940e` 后只改 `wave-Q/receipt.json`。
该 receipt 的 candidateHead 和 Note 却写
`9da8354dc6b1c68ee8aee42c66f577c93d38c2a6`；`git cat-file -e <错误SHA>^{commit}`
退出 128，非本仓有效提交对象。此前调度卡/续派与 automation 转录了作者此错误值，
现由 Codex 更正路由，历史误记不掩去；GLM 仍须修自己的 receipt，不批准错误 pin。

以正确 r4/doc-pin 固定树逐枚复算 **39/39**：index 与 meta 的登记字段对应；
original/restored 等于实际候选字节 hash；`.old` 恰命中一次、`.new` 重建 mutant hash 对应；
三态原始 JSON 与登记 exit/执行数/passed/failed/目标 file/fullName 一致，无 pending/todo/
runtime-error，多重执行身份相同；Q10 五枚各 3 执行/1 指定目标红/恢复 3 passed。
因此 Q-R3-01 总索引同步的证据层已成立，旧独立五针业务复现不重做。

117 份 raw 存在且仅为 `JSON report written to ...`：这是 JSON reporter 的 stdout，
目标业务断言原文在对应 JSON；不冒称 default reporter 全 console 零。初始额外探针
要求 raw 也含 fullName 会误拒这种合法 reporter 输出，未采用为贡献者 counter。
本次是证据/hash 复算，不称独立重新执行全部39变异或复跑全包。

下一步仅修回执有效对象/Note，保留已核 hash/CLI 默认超时成果；活动 Q07/Q08/Q10 合法
余族可继续。新报告/合同/门禁在最终候选另审，原700/50不缩，D-Q01-1 产品卡仍独立。

本次审查文档门：docs 821 Markdown/4345本地链接/247任务，0 issues；
lint-zero 完整2750文件、0 error/0 warning/0 info；diff-check零。仅审查树文档门，
不拿它代替贡献者最终候选或main全仓门。
