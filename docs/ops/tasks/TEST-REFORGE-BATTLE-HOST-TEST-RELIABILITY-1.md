# TEST-REFORGE-BATTLE-HOST-TEST-RELIABILITY-1 — 战斗宿主终局测试确定性与原子性

Status: build
Owner: GLM（新对话A，唯一测试写入者）
Reviewer: Codex（独立验收）
Phase: phase2
Capability: reforge / test-contract-precision
Visual Verification Timing: N/A（无UI变更，不宣称像素/剧情观感验收）

## 目标与路由

战斗宿主终局测试确定性与原子性。只完成本卡有限清单，不滚动扩围。

- 工作树 /private/tmp/type-pal-reforge-battle-test-reliability；分支 codex/glm-reforge-battle-test-reliability-r1。Codex从含本卡的派发提交建立，不在main checkout实施。
- 产品冻结 ce808b42e06dcd85999c1f10a5f1ca0b9009580b；交付需核Git对象/逐源hash，不rebase到产品漂移。本轮三卡写入白名单互斥，与活动Game turn/E2E/质量治理没有同文件写入；发现其它Owner占用即停受影响文件通知Codex。

## 已核前提与上下文

Codex已读 battle-host.finalization.test.ts、battle-host.ts、真实宿主fixture/driver。冻结main的 [CI 37560425624](https://github.com/IllegalCreed/type-pal/actions/runs/37560425624) 在 BF-08/BF-09 的 untilActive():184 失败，350文件通过、该文件两例红。仅证明准备期active未建立，尚未直接证明产品缺陷。

- 必读 [第二阶段纪律](../../phase2/READ-FIRST.md)、[测试质量验收](../agent-workflow.md)、[旧战斗包](../archive/tasks/done/TEST-GLM-REFORGE-BATTLE-FLOW-1.md)。不改战斗公式/UX，原版机制真值门 N/A；机制争议或产品修复需另行准入。
- packages/reforge/src/battle/battle-host.finalization.test.ts:63-201：真实prepare、Promise观测、100轮IO等待及close；:204-283：BF-08/09/10。
- packages/reforge/src/__tests__/battle-host-fixture.ts:158-205：已有默认期限vi.waitFor、pending/release/session清理；runtime-shell/dom-host.ts:193-223：一次setImmediate不等于原生解压已结束。
- 产品链 battle-host.ts:53-117,120-181、battle-launch-preparation.ts、battle-world-result.ts、battle-session.ts。
- 最强替代解释：原生IO慢、固定轮数不足、真实prepare拒绝或全局污染。可证伪：默认期限仍真实拒绝/全局红，或换等待器后变异不被终局oracle杀死，均不能accept。

## 有限工作清单

| 轴 | 必须回答与处理点 |
|---|---|
| R1 | 基点普通定向、相邻合跑、coverage instrumentation复现/对照BF-08/09，记录真实prepare/active/settled/error观测。未复现也如实记，不制造失败。 |
| R2 | 用实际IO完成/公开发布端口事件或默认vi.waitFor条件同步，替代100轮=完成。不得增timeout、sleep掩盖、fake成功prepare或吞真实error。 |
| R3 | BF-08保留真实defeat、零结算/战后脚本、HP写回和场景音恢复；核事件序列是否过度绑定无业务意义实现细节。 |
| R4 | BF-09 exp>0与exp=0拆成独立输入合同；boss直传、唯一胜利曲、金钱不受经验门影响逐项排重，保留原有效oracle。 |
| R5 | BF-10真菜单逃跑主体、无结算与唯一恢复；与host/world-result旧测排重，不直接跳过真实动作。 |
| R6 | 正常、准备拒绝、断言提前失败、取消四条收尾：consume本次start Promise、cancel本次session、释放本次IO、恢复spy/global/DOM；只restoreAllMocks不等于业务结束。 |
| R7 | 本文件、battle-host.test.ts、battle-finalization.world-result.test.ts逐合同保留/合并账；仅白名单旧文件执行精简，其它文件只提精确建议。 |
| R8 | 保留/改写oracle最小有效变异、真实污染红拒收；定向+相邻+instrumentation正常后跑一次Reforge全包，不宣称浏览器/公式验收。 |

## 独占白名单与特殊限制

- 可修改旧测仅 packages/reforge/src/battle/battle-host.finalization.test.ts。
- 可新增专属fixture packages/reforge/src/__tests__/battle-finalization-reliability/；本卡贡献者记录；docs/ops/evidence/TEST-REFORGE-BATTLE-HOST-TEST-RELIABILITY-1/。
- 其它旧测/共享fixture/产品/配置依赖/官方基准/真实数据/其它队列只读。不修开场D-Q01-1或试打D-1，不走剧情。
- 可只读复用既有外部IO fixture，不将其Canvas调用记录视作像素oracle，不复制不安全桥到新fixture。

## 定向验证

env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/reforge exec vitest run src/battle/battle-host.finalization.test.ts src/battle/battle-host.test.ts src/battle/battle-finalization.world-result.test.ts

同文件组另加 --coverage --coverage.provider=v8 --coverage.reportsDirectory=<本次独占临时目录>，只证明instrumentation可靠，不作官方结算。

## 冻结源

| 产品源 | SHA256 |
|---|---|
| packages/reforge/src/battle/battle-host.ts | 38a9dc227a35ac0292ccf25e95cfe59a2f9a8a21686fcef5a6d3e24a52c8cc2b |
| packages/reforge/src/battle/battle-launch-preparation.ts | c13c54d7e6cad926432e810cbd028661fc216b3f04e538e371e792e9710a7c20 |
| packages/reforge/src/battle/battle-world-result.ts | ebf23d84f68739fb15a46defde2a3016177d71130ed5a230afda8b827bd92050 |
| packages/reforge/src/battle/battle-session.ts | cd4bb233eacac2d2c175d7e1d8b466a90d7c8173dbd0308bf5160b19e6936b19 |

## 共同交付与严格验收

- 每轴先记 existing-proof / new-contract / consolidate / unreachable / blocked / product-counter；账必须给 source:line、公开 caller、合法输入、旧 file/fullName/实际断言行、精确 oracle、新身份及处置。允许零新增；换名字、换数字或 fixture 不算新合同。少而精、原子性、真实执行与判别力决定 accept，不设用例/针数/覆盖率配额。
- 本卡有限清单全部有证据即交付停止；产品缺陷只交专属隔离复现，不把坏行为写成绿测，不把故意红纳入默认 test；不滚动加任务。不合 main、不标 done、不删分支、不改共享导航/看板或其它任务。
- 正常门保留同一进程 default + native JSON reporter 的原始 stdout/stderr、完整 file×fullName×status、command/cwd/env/exit/signal/spawn。0 act/console.error/未处理异常是新测试要求，不能过滤输出冒称零；静态门完整 error/warning/info=0才通过。
- 新增或实质改写业务 oracle 以最小变异证明判别力：原始绿→恰一指定业务 AssertionError→恢复绿→最终重放。全态相同非空 file×fullName 多重集合；零 pending/todo/skip、collection/hook/runtime/global error，读取 suite.message、退出状态与原始诊断联判，不只查exit/count。
- 反控保留三态 JSON/raw 完整原件、失败全文、最终源/测试/重建mutant/restored SHA256及清理证明。只在本次 mkdtemp 树变异，finally只清本次树；活动贡献者树产品不改。可只读参考 docs/ops/evidence/TEST-GAME-MEDIA-LIFECYCLE-1/lib-isolated-tree.mjs，复用前核真实 hook/uncaught/额外collection/空集/身份漂移拒收，不重新造宽松判据。
- 禁止业务核心mock、私有state/新增后门、双桥/as never、ignore、skip/xfail、扩大timeout、复刻业务算法当oracle。只控制外部IO和合法时间，不造Partial Canvas冒充真实2D。依赖只在独占树安装；绝不 install 共享node_modules symlink，不改main ignored安装。
- 最终一次本包全包test/typecheck、根 pnpm lint（完整0/0/0）、pnpm check:docs、git diff --check；基点失败单列并给同命令对照，不越界修或自行豁免。贡献者只能改本卡白名单，Codex独立审核/串行全仓check→官方ratchet→受保护strict-fast后决定集成。
- README入口、contract-ledger.tsv、fresh执行身份、验证/诊断与有效反控分列；精简旧测的卡必须 before-after.tsv 映射每条被删/合并轴的剩余oracle。提交推送完整40位 dispatch/base/testCandidate/receiptHead，git rev-parse/cat-file核真实对象，docs-only区间单列。覆盖仅定位附件，正式仅main最终并集实测，官方baseline只由Codex结算。

## 当前模式推进记录

- 2026-10-07 Codex：真实CI失败位置和等待器对照已核；根因由R1证伪。build allowed仅测试治理白名单，产品修复未授权。
- 2026-10-07 GLM（r1 候选交付，待 Codex 独立验收；SHA 由 git rev-parse 核实）：
  - dispatch `d84b3db236c35d2f7e2671741f4320b904f5c58c` / 冻结产品基点 `ce808b42e06dcd85999c1f10a5f1ca0b9009580b`；testCandidate `9e902846df6a850d3fde9c32cbfd56277a0c981a`（测试重写+专属 harness）、证据 docs 提交 `dab130ed133e42d7bb17ecf11604f0659235fed6`（identity.json 另记 dispatch/evidence/testCandidate/冻结与交付源 sha256/门表）；receiptHead=本回执提交的推送头（GLM 最终回执同步报告，git rev-parse 可核）。分支 `codex/glm-reforge-battle-test-reliability-r1` 已推送，未合 main，不标 done。
  - R1：本地四条件（定向/相邻/instrumentation/CI 同参全包 coverage）均不复现，如实记录；CI 真红两次实录（37560425624 BF-08+09 双红、37585132871 BF-09@:231 单红），同签名 untilActive:184。
  - R2 根因：固定 100 轮事件循环预算≠原生 DecompressionStream 完成（判别证据=同次 CI 运行内走同一 prepare 链、用 vi.waitFor 的 battle-host.test.ts 16 例全绿而固定轮数等待器红）；等待器统一为条件+默认期限 vi.waitFor，不扩 timeout、不 sleep。遗留 U-1：CI 侧预算不足的精确调度放大源未本地钉死（不影响判别与修复结论）。
  - R3–R6：BF-08/BF-10 终局 oracle 原样保留（事件序列逐项复核均为公开端口事件）；BF-09 拆 exp>0/exp=0 两个独立输入合同；新增 BF-H1..H4 四条收尾纪律合同（正常/准备拒绝/断言提前失败/取消）；零产品改动（4 冻结源逐字节核验未动）。
  - R7–R8：contract-ledger 31 行+before-after 映射；反控=判据自测 22 例+3 真实探针+N1–N5 恰一针四态+N6 家族探针（H1..H4 同面四红，不冒充恰一）+N3 级联诚实披露（共享 settle exp 门真实波及 4 例跨两层）；mkdtemp 隔离树变异+整树清理证明。门：定向/相邻 31/31、instrumentation 绿、全包 8786/8786、typecheck 0 错、根 lint 完整 0/0/0（3575 文件）、check:docs、git diff --check 全过。
  - 证据全目录：`docs/ops/evidence/TEST-REFORGE-BATTLE-HOST-TEST-RELIABILITY-1/`（README/identity.json/counterproof/ledgers）。
- Codex独立验收：pending；done准入：blocked。
- 用户产品裁决：N/A（不变更产品行为，出现新取舍另卡）。

## 下一位 Agent 提示词

```text
你是 TEST-REFORGE-BATTLE-HOST-TEST-RELIABILITY-1 唯一执行方，新对话A。只在 /private/tmp/type-pal-reforge-battle-test-reliability、codex/glm-reforge-battle-test-reliability-r1 工作。先读 AGENTS.md、docs/phase2/READ-FIRST.md、docs/ops/agent-workflow.md、docs/ops/tasks/TEST-REFORGE-BATTLE-HOST-TEST-RELIABILITY-1.md。产品冻结 ce808b42e06dcd85999c1f10a5f1ca0b9009580b。按R1-R8一次完成真实CI红定位、默认期限IO同步、BF-09原子拆分、终局oracle保留、异常/取消清理、排重及有效反控。可改旧测仅battle-host.finalization.test.ts，不扩大timeout或sleep掩盖，不mock业务，不修产品或夹带旧draft。最终定向相邻+instrumentation、Reforge全包/typecheck及严格证据齐备。 按卡完成严格三态最小反控、同进程JSON/raw/执行身份/hash和精确清理，定向相邻、全包/typecheck、lint完整0/0/0、docs/diff。基点失败分列不越界修。所有有限轴有裁决即停，允许零新增，不追例数或覆盖率；只写自己的回执，完整真实SHA提交推送，不合main不done，等待Codex独立验收。
```
