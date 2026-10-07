# TEST-REFORGE-BATTLE-PREVIEW-BINDING-1 — 交付证据

- 基线：产品冻结 `2f0fe6d2f0a4eb308febfbe6b787b4276b762b8d`；派发基（含本卡提交）
  `a2447b5c9ec19ff52f48cf4d3200c1af3a1245b8`；分支 `codex/glm-reforge-battle-preview-binding-r1`。
- 产品/schema/旧测/共享 fixture/配置/官方 baseline/真实数据**零改动**；共享索引、看板与证据导航已由 Codex 收口更新。
- **零新增正常合同**：七轴（B1–B7）排重后不存在既未证、又真实满足且不编码缺陷的正常合同；
  按卡面以准确诊断闭环而非测试数验收，故无变异反控（无新正常合同不造反控数量）。

## 交付物

- [dedup-ledger.md](dedup-ledger.md)：读取域双轨事实 + B1–B7 逐轴裁决（existing-proof /
  product-counter / 源码域证据 / 诊断 / blocked）+ 一手源锚点 + r2/r3 返工记录。
- [contract-ledger.tsv](contract-ledger.tsv)：逐轴 源条件/caller/合法输入/旧 file-fullName/oracle/处置。
- [run-d1-repro.mjs](run-d1-repro.mjs)：D-1 隔离正向红反例按需 repro 工具 r3（仓库外复制树、
  唯一严格判据含同次全局错误诊断 + 21 例拒收自测、真实污染样本拒收、清理演练；证据再生用，
  非测试）。
- [d1-repro.json](d1-repro.json)（回执：argv/cwd/env 指纹/spawn/退出码/signal/native 身份/复制树
  冻结源实测 hash/判据与自测结果/成功与提前失败清理证明）；
  [d1-repro.vitest.json](d1-repro.vitest.json) + [d1-repro.raw](d1-repro.raw) +
  [d1-repro.stderr.raw](d1-repro.stderr.raw)（D-1 主诊断同次 native JSON 与完整 raw）；
  [d1-pollution.vitest.json](d1-pollution.vitest.json) + [d1-pollution.raw](d1-pollution.raw) +
  [d1-pollution.stderr.raw](d1-pollution.stderr.raw)（真实污染样本同次两份）。
- `gates/`：定向相邻与全量绿门原始输出。

## r3（B-R2-01，二审唯一剩余项）

- **判据纳入同次子进程完整全局错误诊断**：JSON reporter 对异步 uncaught 静默（二审实证：native
  JSON 仍 total2/pass1/fail1、suite.message 空），故 `judgeReproRun` 增耗同一子进程的完整 raw
  （同次双 reporter：default→stdout/stderr 全局诊断、json→文件 native 身份），命中
  `Unhandled Errors` 段 / `Unhandled Rejection` / `Uncaught Exception` / `Errors  N error(s)`
  汇总行任一即 `global-error:*` 拒收。
- **真实 Vitest 污染样本**（复制树内判据最小输入，非 D-1 repro、非新增绿测）：同
  CONTROL/REPRO fullName、CONTROL 1=1、REPRO `expect(['actual']).toContain(needle)`、
  afterAll setTimeout 异步抛 `CODEX_EXTRA_RUNTIME_ERROR`——实测 exit1/signal null/pending·todo 0、
  REPRO 唯一指定 AssertionError、native JSON 干净两例一绿一红；判据拒收且**唯一拒收原因即
  global-error**（`soleReasonGlobalError=true`），证明其余严格条件不误伤、新条件真拒收。
- **正确纯形状仍接受**：D-1 主诊断（CONTROL 绿 + REPRO 恰一 needle AssertionError 红）在加严后
  判据下 `accept=true`、raw 零全局错误标志。
- 同判据自测扩至 **21 例**（新增 4 例 raw 标志畸形），含「正确形状必须 accept」防恒拒；
  仓库外复制树/finally 清理/演练、冻结实测、身份精确比对全部保留（r2 已核，不重开）。

## D-1 红反例（与正式绿门分列；r2 按一审 B-R1-01～03、r3 按二审 B-R2-01 重铸）

再生：`env -u NODE_COMPILE_CACHE node docs/ops/evidence/TEST-REFORGE-BATTLE-PREVIEW-BINDING-1/run-d1-repro.mjs`
（runner 以「红形状正确 + 污染形状拒收 + 判据自测 + 清理演练全过」为通过判据，形状不对非零退出）。

- **B-R1-02 仓库外完整产品复制树**：os.tmpdir() 独占 mkdtemp（`reforge-d1-repro-r3-*`），拷贝根
  配置 + 全部 `packages/*`（去 node_modules 的真实文件）并软链根/包级 node_modules；红测试与污染
  样本只写进复制树 `packages/reforge/repro-d1-r3{,-pollution}/`，**活动 packages 永不出现默认
  runner 可发现的故意红测试**；四冻结源 SHA 从复制树实测并与卡面 pin 比对（漂移即拒收）。建树/
  写文件/执行全程 try/finally，另含「提前失败」「成功」两路清理演练，回执逐项记录 argv/cwd/env
  指纹/身份/raw hash。
- **B-R1-01 唯一严格判据**：CONTROL 绿 + REPRO 恰一指定 AssertionError 红由同一
  `judgeReproRun` 判定——JSON parse 失败、spawn/signal/退出码异常、身份多重集不恰为两例、
  状态/计数不符、needle 不符、非 AssertionError、双错误、todo/pending、suite 级 runtime 错误、
  冻结漂移一律拒收（r1「parse 失败仍 allChecksPass=true」已修：parseOk=false 直接 reject）。
  同判据 **17 例拒收自测**（含「正确形状必须 accept」防恒拒）先行，自测不过即整体非零退出。
- CONTROL（绿）：作者 `startBattle` 命令自带同一 choreography 经正常脚本 caller 呈现
  `♪ 音效 sfx-encounter` —— 排除「fixture 形状错/不可呈现」替代解释。
- REPRO（恰一红）：`?battle=encounter&battle-scene=b`；test 侧以公开 `loadScene` 独立验证
  canonical 合法性与正文（**非试打 IO 归因**），battleLog 断言 `to include '♪ 音效 sfx-encounter'`
  失败 —— 战斗正常胜利但遭遇演出零呈现。
- **B-R1-03 B4 读取归因降级**：boot 期 `references()` 预载全部场景（`main.ts:3215`），试打 walk
  是缓存命中，运行期读取无法按 caller 归因；r1「试打实际读取」表述撤回，B4 改源码域证据
  （见 [dedup-ledger.md](dedup-ledger.md) B4 节）。

## 绿门

- 定向相邻（基点先跑）：`main.host-boundaries-1` / `main.battle-host-flows` /
  `main.battle-preview.glm-q` / `main.glm-n` / `runtime-project-view` / `scene-resources` /
  `main.c85-boot` 全绿（见 `gates/`）。
- 全量：`env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/reforge test`（350 文件 8778/8778）、
  `pnpm --filter @type-pal/reforge typecheck`、根 `pnpm lint`（3477 文件 0/0/0 零诊断硬门）、
  `git diff --check` 全绿（见 `gates/`）。
- **`pnpm check:docs` 恰 1 项 FAIL（docs-only 尾巴，单列交 Codex）**：本卡白名单明令
  「共享索引/看板只读」，故未在 `docs/ops/evidence/README.md` 登记本目录导航行；该门其余
  6347 本地链接/347 任务/内容治理全过（`gates/check-docs.raw`）。Codex 集成时补一行导航即绿。
- 故意红 repro 与上述正式绿门分列：repro 的红是产品缺陷证据，不在默认 suite 内。

## 产品缺陷与决策点（不修产品，交 Codex/用户）

- **D-1**：试打 `?battle-scene=` walk 消费 `runtimeSceneView` 投影（stage 正文恒 `[]`），遭遇演出
  接线死路；修法应在产品侧（如 walk 改读 `getCanonicalScene`），本卡白名单不含 main.ts。
- **B6 策略**：搜索域（全部 variants/behaviors vs 当前激活；sharedScripts 是否跟进）与多匹配
  取舍（现行覆写=末个胜，未经产品确认）须随修复一并裁决。
- **B5(c) UX**：绑定目标缺失/不可读（含场景不在索引、IO 拒绝）时静默吞掉、无回执——是否给
  反馈交产品裁决。
