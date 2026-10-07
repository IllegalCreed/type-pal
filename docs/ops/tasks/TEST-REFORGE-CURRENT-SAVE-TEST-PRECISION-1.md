# TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1 — 当前存档校验测试精简与输入边界

Status: build
Owner: GLM（新对话B，唯一测试写入者）
Reviewer: Codex（独立验收）
Phase: phase2
Capability: reforge / test-contract-precision
Visual Verification Timing: N/A（无UI变更，不宣称像素/剧情观感验收）

## 目标与路由

当前存档校验测试精简与输入边界。只完成本卡有限清单，不滚动扩围。

- 工作树 /private/tmp/type-pal-reforge-save-test-precision；分支 codex/glm-reforge-save-test-precision-r1。Codex从含本卡的派发提交建立，不在main checkout实施。
- 产品冻结 ce808b42e06dcd85999c1f10a5f1ca0b9009580b；交付需核Git对象/逐源hash，不rebase到产品漂移。本轮三卡写入白名单互斥，与活动Game turn/E2E/质量治理没有同文件写入；发现其它Owner占用即停受影响文件通知Codex。

## 已核前提与上下文

Codex直接读current-codec.ts及current-save.current-characterization.test.ts、current-structure.test.ts全文。旧结构测试多处as unknown as将故意坏形状塞进CurrentSavePayload；null/array/missing、多个稀疏/optional子树也被塞在多合同用例。公开assertCurrentSaveStructure(value: unknown)已是合法外部边界，不需要双桥。codec的空ID、安全整数与normalize行为不能与外层同字段形状检查混为一谈。

- 必读 [第二阶段纪律](../../phase2/READ-FIRST.md)、[测试质量验收](../agent-workflow.md)、[结构guard原卡](../archive/tasks/done/SAVE-PREFLIGHT-1-current-save-restore-preflight.md)。
- 只变测试，不变save/schema或格式，产品前提真值门N/A。唯一SAVE11/content22不兼容旧开发档；不授权转换器/sidecar/存档修复。
- current-structure.ts:104-245,280-288：unknown guard、optional、稀疏、party/reserve、追逐声明及路径；current-codec.ts:24-58,61-127：语义校验、preflight、clone和lifecycle。
- save/types.ts:74-91、ops.ts:37-43是当前envelope/builder；main.ts:4927-4931是真preflight→normalize caller。
- 先排重current两旧文件、ops.test.ts、main.save-flows.test.ts、automatic-target-command.test.ts、全量normalize/preflight调用测试和content entity-lifecycle旧断言。
- 反证：删/合并后旧合法轴或稳定错误路径失去oracle；所谓codec新测试只被外层guard拒绝而没到目标条件，均不成立。

## 有限工作清单

| 轴 | 必须回答与处理点 |
|---|---|
| S1 | 两旧文件逐条输入层/实际拒绝层/oracle/重复与跨合同账；before→after身份+断言映射，不按标题或matcher自动删。 |
| S2 | 坏形状直接构造unknown外部对象传公开guard；合法payload用现行builder/buildWorld+satisfies。两白名单旧测清零双桥/as never/假枚举强转，不把假数据送typed业务API。 |
| S3 | Envelope与position、party/reserve分清原子合同；修“version非8”错误标题，版本取常量；旧数字拒收只留真实不同条件代表。 |
| S4 | 稀疏数组按eachIndex与元素验证语义排重，holes只在unknown边界构造；保留精确错误下标与合法正边界。 |
| S5 | optional缺席、空合法容器、audio显式null、appearance不接受null分别归位；party/reserve同型guard不要每字段复制整套。 |
| S6 | skillUseCounts缺席只在clone补空且原件不变；空actor/skill ID、负数/非safe整数由真实codec语义拒绝。外层形状红不是证明。normalize只接typed合法可表达值。 |
| S7 | hostileAwareness、script深层语义、entity lifecycle引用/归一化各自排重；可合法到达才新增；unknown坏输入只能走guard，不伪造codec死臂。 |
| S8 | resolver/payload身份一致、current envelope克隆隔离与往返；与characterization/自动追逐合同合并证明，不恢复旧版本产品能力。 |
| S9 | 精确message/shortMessage、input不变和独立守卫的判别力；新/实质改写合同最小变异。删/并全部有剩余oracle映射，无净增加/净减少目标。 |

## 独占白名单与特殊限制

- 可改旧测仅 packages/reforge/src/save/current-structure.test.ts、packages/reforge/src/save/current-save.current-characterization.test.ts。
- 可新增 packages/reforge/src/save/current-codec.contracts.test.ts（缺口存在才建）、专属 save/__tests__/current-save-precision/；本卡贡献者记录；docs/ops/evidence/TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1/。
- 其它旧测/共享fixture/产品/配置依赖/基准/真实工程和存档/其它卡只读。不实际import/write/delete用户存档，不migrate projects/pal。
- A卡CI基点红未集成前可仍存在，给同命令基点对照，不越界修或宣称全包绿。

## 定向验证

env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/reforge exec vitest run src/save src/main.save-flows.test.ts src/automatic-target-command.test.ts

相邻content lifecycle旧测试定向及content typecheck；最终一次Reforge全包/typecheck。每个删/并映射核真实原始合同仍有可杀的oracle，不能以测试更少本身当成功。

## 冻结源

| 产品源 | SHA256 |
|---|---|
| packages/reforge/src/save/current-codec.ts | 690491b7c584db3e628f6d590dfe238b45a56ea6eee78d14624fd392347083de |
| packages/reforge/src/save/current-structure.ts | fd69938c815f33728a5fc7003b34d562a0f533900faf48acaf3135ae0680c331 |
| packages/reforge/src/save/types.ts | 856ba7ac63a7d0a314ac6189b4c2ec9b3e5c8130b03485e700a0ec38566f41bf |
| packages/reforge/src/save/ops.ts | dca51545dedd6da907e12f57f4c5d8793562dfb1b33b19afed68b44cdde82d80 |
| packages/content/src/entity-lifecycle.ts | eba9caaf60260067ddae40b769dbec9f1afe631a18f7e7ff2e81b718ad86054e |

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

- 2026-10-07 Codex：unknown边界、旧测双桥与多合同问题已核。build allowed仅两旧测及专属新增测试白名单；存档schema/实现不变。
- 贡献者交付/自验（2026-10-07，GLM 新对话B，工作提交 `d731f0f493c997637cf9e33b963db1e6d730d4ba`，基于 `d84b3db23`）：S1–S9 全轴有裁决，允许的新增均以缺口证据落地。
  - 两旧测重铸：`as unknown as`/假枚举清零；坏形状一律经 unknown 视图（合法 builder 产物 JSON 往返成 `Record<string, unknown>`，运行时核验收窄助手）直传公开 `assertCurrentSaveStructure`；合法正边界仍走 buildWorld/builder typed 通道。跨合同用例原子拆分；同层同 oracle 数字/形状拒收只留真实不同条件代表（61+8 → 60+6）。
  - 新增 `current-codec.contracts.test.ts` 7 合同：skillUseCounts 空 actor/skill ID、负数、`MAX_SAFE_INTEGER+1`；可省略容器（skillUseCounts/entityLifecycles）缺席 clone 补空 {} 且原件不变；hostileAwareness `remainingMs=0` 正数性；script vars 非有限数深层接线。输入全部 typed 合法可达，逐条先过结构 guard 才到 codec 语义层（外层形状红不作 codec 证明）。characterization 新增 resolver/payload 身份合同；版本拒收六行（全是两者不同）→ 三条件代表，取 SAVE_VERSION/CONTENT_VERSION 常量，修“version 非 8”标题。
  - 账本：`before-after.tsv` 69 条旧用例逐条 before→after 身份（kept/reworked/split/merged/dropped），10 dropped 各附剩余 oracle `source:line`；`contract-ledger.tsv` 72 条最终合同分型。
  - 门禁：定向 168/168（基点同命令 164/164 本就全绿，无基点红需单列）、相邻 content lifecycle 12/12、Reforge 全包 8785/8785、typecheck 双 0、根 lint 0/0/0（3562 文件）、check:docs 与 `git diff --check` 过。
  - 反控：判据自证 20 合成反例 + 3 真实 Vitest 探针（纯业务红接受、目标红+afterAll 抛错拒收、+异步 uncaught 拒收）；四态协议（绿 73 行执行集快照 → 14 针逐针红 → 还原绿执行集逐字一致 → 末次重放）全 VALID，恰一指定业务 AssertionError、双 reporter 联判、17 树清理证明；`counterproof.json` sha256 `88f58c56fcaa0418499f04d64e64057544ac83d0c9b8def1f1a35e370d0b9d6b`。两处针设计缺陷被判据拒收后修正（N05 去补空变异使产品先抛普通 Error → 改注入非空由 `toEqual({})` 成红；N12/N13 `rejects.toThrow` 变异时 vitest4 报裸 Error → 改 catch+同步断言，oracle 不变），判据未放宽。
  - 产品零改动（五冻结源 SHA256 逐字一致）；无用户可见行为变化、无产品缺陷新发现、无 blocked/U 账。
- Codex r1 验收：counter（codex-review-r1.md，现存主树，集成后可链接）。B-R1-01 共享 helper 不替代各字段接线（height/spriteId/battleSprite/skillUseCounts 内层四变异下候选全绿）、两容器缺席是独立 normalizer；B-R1-02 越权改共享 evidence 导航与 semantic review 台账。
- 贡献者 r2 交付（2026-10-07，GLM 会话B，共享文档恢复提交 `e44a2dd34`（docs-only）+ r2 工作提交 `81f205328`）：
  - B-R1-01：四条独立接线合同归还各自原子行（pos.height 缺席、appearance.spriteId=数字、appearance.battleSprite=null、skillUseCounts 内层非有限数，全部 unknown 视图构造，structure 60→64 例）；三处标题失效的「代表」声明修正（pos.row/resources/portrait/sparse-inventory）；容器缺席拆为 skillUseCounts/entityLifecycles 两个独立 oracle 身份、各自保留原件不变断言（codec 7→8 例）。其余删/并按接线维度复核：余 6 条 dropped 全为 Codex 明示保留项（同调用点同谓词值维度重复或更强 oracle 替代）；11 字段循环成员资格与 statuses/poisons 每调用点 hole-skip 的残余暴露面在证据 README 如实登记，不扩为无限清单、不恢复重复数字矩阵。
  - B-R1-02：`docs/ops/evidence/README.md` 与 `docs/phase-governance/reviews/20261004-semantic-current-batch.json` 已 `git checkout d84b3db23` 恢复派发值（docs-only 提交单列）；共享导航/pin 登记缺口如实报告，由 Codex 集成时维护。
  - r2 反控（受影响执行集重采，判据库未改、真实探针证据沿用 r1）：新绿基线 78 行（64+8+6）→ NR1–NR6 六针全 VALID（四接线变异 + skillUseCounts 补空注入非空 + entityLifecycles normalize 后覆写非空表，均恰一指定业务 AssertionError）→ 还原绿执行集逐字一致 → 末次重放；9 树清理证明；`counterproof-r2.json` sha256 `36904623dee7b2b7dabcab2ade33aa54c210c9014cb8dff3cbff14373a4fd48b`；r1 14 针证据原样保留。
  - 账本更新：`before-after.tsv` 4 条 dropped→restored-r2、余 6 条 dropped 附剩余 oracle；`contract-ledger.tsv` 77 条（新增 restored-r2 分型与两条拆分身份）。
  - 门禁：定向 173/173、相邻 content lifecycle 12/12（r1 原件保留，content 未动）、Reforge 全包 8790/8790、reforge/content typecheck 双 0、根 lint 0/0/0（3574 文件）、check:docs PASS（共享文档恢复后 pin 天然匹配）、`git diff --check` 清零。
  - 产品零改动（五冻结源逐字一致）；未处理 Codex 已修的帧动画 CI 问题；无新 blocked/U 账。有限项闭合即停。
- Codex r2 验收：counter（codex-review-r2.md，现存主树，集成后可链接）。B-R2-01 三原合同剩余 oracle 不足（maxMP 字段数组成员、extraStatuses/poisons 各自回调空洞）；B-R2-02 旧 runner 锁 73 行、N05 指向合并身份、N08 旧名称，非当前可重放入口，README 历史计数未标清。
- 贡献者 r3 交付（2026-10-07，GLM 会话B，工作提交见回执）：
  - B-R2-01：三原合同归还（structure 64→67 例）：`实例坏形状 maxMP=Infinity（字段数组成员资格）`、`R3：稀疏空洞逐下标拒绝：extraStatuses[0]`、`R3：稀疏空洞逐下标拒绝：poisons[0]`，全部 unknown 视图构造、原子 oracle；未恢复重复数字矩阵（其余 8 个数值字段成员资格仍在证据 README 登记残余暴露面）。
  - B-R2-02：`run-counterproof.mjs` 对齐为当前反控入口——绿基线 73→81 行断言、N05 fullName 改指 r2 拆分后的 skillUseCounts 独立身份、N08 fullName 改指 r2 更名后的稀疏标题，输出迁至 `counterproof-r3-runs/`+`counterproof-r3.json`（r1/r2 证据保持历史原件不动）；纳入 NRR1–NRR3 共 17 针在 r3 候选整体重采：绿 81 行（20 自测+3 探针复验）→ 17 针全 VALID 恰一指定业务 AssertionError → 真正恢复绿执行集逐字一致 → 末次重放；20 树清理证明；`counterproof-r3.json` sha256 `fd65dc26a3bcbea2308f23d929ac392a6bd133cfab41c0d89ed2106de4889207`。N05 与历史 r2 NR5 同变异不重复计信用（回执注明）。
  - README 数量按最终实跑统一并标历史：定向 176/176（历史 168/173）、全包 8793/8793（历史 8785/8790）、合同账 80 条、dropped 6→5（maxMP/两空洞转 restored-r3）。
  - docs 链接门修正：r2 曾以相对链接引用仅存主树的 codex-review-r1.md（且 r2 的 docs-gate.raw 早于该编辑采集而漏检），r3 已改纯文本并在两处注明「现存主树，集成后可链接」，采集顺序修正后 check:docs PASS。
  - 门禁：定向 176/176、相邻 content lifecycle 12/12、Reforge 全包 8793/8793、reforge/content typecheck 双 0、根 lint 0/0/0（3598 文件）、check:docs PASS、`git diff --check` 清零。
  - 产品零改动（五冻结源逐字一致）；共享文档维持派发值未动；未处理 Codex 的 MapMode 修复；共享登记缺口（evidence 导航条目、审核文件链接）在证据 README 列明由 Codex 集成时维护。有限项闭合即停。
- Codex独立验收（r3）：pending；done准入：blocked。
- 用户产品裁决：N/A（不变更产品行为，出现新取舍另卡）。

## 下一位 Agent 提示词

```text
你是 TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1 的独立验收方 Codex（r3 复审）。工作树 /private/tmp/type-pal-reforge-save-test-precision、分支 codex/glm-reforge-save-test-precision-r1，r3 候选 = r3 工作提交（回执 SHA 见推进记录，基于 3f925b0d3；r1/r2 链：d731f0f49/1b89e3eb8、e44a2dd34/81f205328；基 d84b3db23，产品冻结 ce808b42e 五源 SHA 逐字一致）。先读 docs/ops/tasks/TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1.md、docs/ops/evidence/TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1/README.md 与你的 codex-review-r2.md。请独立核：① B-R2-01 三原合同（maxMP=Infinity 精确路径、extraStatuses[0]/poisons[0] 空洞）是否已归位且 unknown 边界原子 oracle，NRR1–NRR3 变异是否恰一红；② B-R2-02 对齐后的 run-counterproof.mjs（81 行基线、N05 拆分身份、N08 新名、17 针）能否在你侧重放，r1/r2 历史原件是否未动、N05/NR5 信用不重复计；③ README 数量是否与最终实跑一致（176/8793/80 合同/5 dropped）与历史标记；④ 复跑定向（env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/reforge exec vitest run src/save src/main.save-flows.test.ts src/automatic-target-command.test.ts，期望 176/176）与抽核全包/typecheck/lint/check:docs。共享导航/pin/审核文件链接由你集成时维护。产品/schema 零改动，不合 main 不标 done 由你收口；counter 请按 B-R2-01/02 逐条列出。
```
