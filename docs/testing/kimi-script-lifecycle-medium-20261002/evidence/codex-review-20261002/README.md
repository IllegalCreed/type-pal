# Codex 独立复核 — Kimi 生命周期中包二（2026-10-02）

任务：[TEST-KIMI-SCRIPT-LIFECYCLE-MEDIUM-2](../../../../ops/tasks/TEST-KIMI-SCRIPT-LIFECYCLE-MEDIUM-2.md)。固定候选 `3be438a9424b2b95afc268c60874a4f068aef491`；测试 `9d384895b4fc6a1de3d700ddc5013dc8bc4491ab`，证据 `bf2274e1bc4fe5a95c90d45e3d4c917b3081f264`，末提交仅 receipt pin。BASE/sourceBase/14冻结保持原卡。

结论：`counter / rework`，仅 **KM-LIFE-R1-01：M01 未结算自己创建的请求**。不新增用例、不扩域、不重开原32或已冻结 O/P/Q；作者不得因本次复核写产品或共享文档。四枚反控与其余代码核验已完成，不把反控职责转给作者。

## 已核结果

- 9个候选改动文件全在两新测/作者 evidence 白名单，产品、旧测、配置、基线不变。作者真实路由 verifier 通过14/14；自有副本的路由保护拒收是预期结果，未删保护、未冒充作者工作树。
- 定向新16、main同域旧22、固定Q旧12，合计5文件50/50。作者原报告是4文件38/38（16+22）；Q12只在作者账中读源码排重，不在作者那次命令中执行。
- 实际串行变异 M03/M05/M06/L03，每次50例全执行，仅对应新例1个 AssertionError，旧34全绿；恢复后50/50。完整执行身份多重集合与支持文件哈希一致，生产变异可由记录的替换重建。各枚原正控复用上一次同源/同支持集真实全绿恢复，不伪称每枚另跑一次原正控。
- 新两测试使用真实 queue、Signal、coordinator minted lease 与公开入口；无 unsafe 桥、ignore、业务核心 mock 或超时扩容。L07 测试与作者 ledger 正确区分预取消原 reason 和 gate 等待时 coordinator 的规范化 AbortError；原派发措辞过宽，由 Codex 修正，不要求改产品。
- Reforge 全包2263：2258通过、5个 `pal-meal-shell` 环境红，原始原因 `portraits/001.png` 缺失。自有副本只读补入该 ignored 资产后，同域6例重跑1绿5红，下一缺失为 `item-icons/197.png`。不是第二次全包全绿，未隐藏环境红，也未执行真实工程迁移/提取。
- Reforge typecheck0；根完整 lint2782文件，error/warning/info为0/0/0；docs0；候选 diff check0。自有副本 readonly 资产与 canvas 原生构建的131文件 SHA256 记录在 manifest；没有修改主工程或作者树。

[机器复核账、各相位原始报告/输出/hash/执行身份](review.json)；[原字节 raw](raw/)。report中保存四变异 from/to、指定 fullName、退出码/signal/spawn 状态、真实单红原文与恢复绿；未承诺运行期间 console 全零。

审核登记后另跑：完整 lint2783文件0/0/0、docs829 Markdown/4417 links/263 tasks零问题、diff0；原始输出为 raw 内 review-lint、review-docs-final 与 review-diff。中途 docs 的索引/子目录导航两项已修复，仅调整本卡登记与链接，没有改质量规则。

## 唯一代码返工

`packages/reforge/src/script-confirm-lifecycle.kimi-mid-2.test.ts:26` 的 M01 用 `void queue.enqueue(...)` 丢弃 promise，最后断言 `pendingCount=1` 后结束。公开操作忠实复现的结束状态：active=true、pendingCount=1、settled=0、capture=1；探针自己补提交并 await 后 pendingCount=0、settled=1。此为独立诊断，不把原 Vitest 绿写成已失败。

原卡明确要求所有 pending/reject 结算，故需将 M01 改 async 并持有 answer，保留原 capture/token/count 断言，在末尾用公开 submitNo/presented/presented 消费自己的请求，await false并核最终 pendingCount0/view undefined。没有新业务合同或新例。

证据窄修：作者 README 的“同域旧含Q对照22/22”须改成“main两旧文件22/22；Q12为源码/ledger排重”；L07“reason身份”概述须区分预取消和等待取消。contracts中对应精确 oracle 已正确，不要求改测试行为。更新最终 directed/receipt 实际候选与门，保留原报告历史。

## 下一位 Kimi 提示词

```text
TEST-KIMI-SCRIPT-LIFECYCLE-MEDIUM-2 仅一次窄收尾，不加任务。原工作树 /Users/zhangxu/.codex/worktrees/kimi-script-lifecycle-medium/type-pal，分支 codex/kimi-script-lifecycle-medium-r1，基于 3be438a9424b2b95afc268c60874a4f068aef491，原 BASE 5805749d6c2954628cf912904bdd903a327d68c4/sourceBase 8990f0cde3edfe6feb908234aeafcc937daaec52 不变。先读原卡和 Codex 审核分支 codex/kimi-lifecycle-review-r1 中 evidence/codex-review-20261002/README.md/review.json；可只读 git show 读取审核文件，不 cherry-pick 共享任务卡/看板，不修改其它Owner。唯一代码项 KM-LIFE-R1-01：M01 改 async、保留 enqueue 的 answer 和全部原断言，最后用公开 submitNo+两次 presented 结算并 await false，断言 pendingCount0/view undefined，不新增 fullName/ID/用例。证据 README 校正作者 directed 是新16+main旧22=38，Q12当时仅源码/ledger排重；L07预取消原reason身份与gate等待规范化AbortError分述，原精确测试/账不重写。仅原两新test/专属fixture/evidence白名单可写，产品/旧测/配置/基线/真实资产/共享docs只读。更新真实38例 directed JSON与receipt；复跑两新+两旧、Reforge typecheck、完整lint0/0/0、docs/diff/verifier。候选重跑全包若仍缺ignored资产，保留原红与准确路径，不补假资产/不提取或迁移真实工程。四枚反控由Codex接收最终候选后负责必要重采，你不写/跑反控工具。不重开其余15例/原32/O/P/Q，不加配额，不跑official coverage/main，不标done。提交推送一次真实完整40位测试/证据候选，明确docs-only尾区间，随后停止等待Codex收口。
```

accept、main并集正式覆盖、check→official ratchet→protected fast、done和退休树清理尚未执行，不以这次预审替代统一集成门。
