# TEST-REFORGE-BATTLE-HOST-TEST-RELIABILITY-1 交付证据

主树后续CI维护（不扩本卡）：`1ef3a9ef4` 上战斗8/8、帧动画8/8及C卡表单5/5均通过；唯一失败是旧MapMode首帧焦点竞态。Codex独立复现、默认条件同步及相邻89/89证据见[菜单焦点维护](ci-map-menu-focus-sync.json)，新CI结果以新推送实测为准。

- 卡:[TEST-REFORGE-BATTLE-HOST-TEST-RELIABILITY-1](../../archive/tasks/done/TEST-REFORGE-BATTLE-HOST-TEST-RELIABILITY-1.md) · Owner: GLM · 状态: Codex独立accept，本地集成门通过，done
- 工作树 `/private/tmp/type-pal-reforge-battle-test-reliability` · 分支 `codex/glm-reforge-battle-test-reliability-r1` · 冻结产品基点 `ce808b42e06dcd85999c1f10a5f1ca0b9009580b` · 派发提交 `d84b3db236c35d2f7e2671741f4320b904f5c58c`
- 40 位 SHA 全表见 `identity.json`；冻结源 sha256 建树时逐文件核验（4/4 与卡面一致，见 `counterproof-lib.mjs` FROZEN_SOURCES）。

## R1 基点复现结论（如实：本地未复现）

CI 真红（gh 实录，签名一致：`untilActive:184 expected null not to be null`）:

- [CI 37560425624](https://github.com/IllegalCreed/type-pal/actions/runs/37560425624)（ce808b42e）：BF-08+BF-09 双红（该文件 261ms/3 例）。
- [CI 37585132871](https://github.com/IllegalCreed/type-pal/actions/runs/37585132871)（d84b3db23，本卡派发基点）：BF-09 单红（:231 首个 harness），BF-08/BF-10 过。
- ≤3e1ad5fe8 的更早运行无该文件命中；40039f290 给 reforge 新增 opening-menu.io-lifecycle.test.ts 后套件组成变化，flake 随之出现。

本地基点四条件均未复现（不制造失败）:定向 3/3、相邻 26/26、3 文件 instrumentation 绿、CI 同参全包 coverage 绿（`basepoint/fullsuite-ci-exact.*`）；CPU 加压（8 忙进程）与进程内线程池饱和探针下 rounds-until-active 仍 7–9（`basepoint/probe-*.json|raw`；探针为临时诊断文件，取证后已从交付树移除，其执行身份完整记录于 JSON）。

## R2 根因（可证伪链）

1. 失败签名=固定 100 轮事件循环预算耗尽（红例 60–127ms 即红，非超时），`host.active` 未建立。
2. 判别证据（同次 CI 运行内对照）:走同一 `scenarioProject→BattleLaunchPreparation→原生 DecompressionStream` 链、用 `vi.waitFor` 的 battle-host.test.ts 16 例全绿；唯一红的是固定轮数等待器 → 失败变量=等待器原语，非产品、非全局污染、非真实 prepare 拒绝。
3. 机制测量:单次原生 inflate ≈2 个 setImmediate 轮、整链本地 7–9 轮（空闲/加压/饱和三态稳定）——完成是调度相关异步事件，测试轮数预算与之无耦合；CI 2 核满包+coverage 下该预算随机不足。
4. 替代解释排除:P2 探针线程池饱和下 prepare 无拒绝（error undefined）、无污染、默认 vi.waitFor 期限内同链完成真实终局（victory/money 50+7/端口序完整）。
5. 遗留未知 U-1（如实登记）:CI 侧使预算不足的精确调度放大源未能在本地钉死（无 Linux 2 核 runner）；但等待器原语判别与修复有效性证据已闭环，且既有判例 battle-host-fixture.ts:163-167 早已注明同因（“原生解压完成不由事件循环轮数界定”）。

修复:等待器统一为条件+默认期限 `vi.waitFor`（不扩 timeout、不 sleep、不 fake、不 mock 业务）；`pumpUntilSettled` 保留（会话推进是 tick 驱动同步业务逻辑，会话内无原生 IO——sfx 无 AudioContext 时 `prepare` 即返）。

## 交付（零产品改动；旧测改动仅白名单文件）

- 重写 `packages/reforge/src/battle/battle-host.finalization.test.ts`:BF-08/BF-10 原断言保留（等待器迁移）；BF-09 拆 BF-09a（exp>0+boss 直传+胜利曲恰一次）/BF-09b（exp=0 门关+金钱不受门影响）两个独立输入合同（R4）；新增 BF-H1..H4 四条收尾纪律合同（R6:正常/准备拒绝/断言提前失败/取消——consume start Promise、cancel session、release 持定 IO、restore spy/global/DOM）。
- 新增专属 fixture `packages/reforge/src/__tests__/battle-finalization-reliability/battle-finalization-host-harness.ts`（真实装配提取+R2/R6 升级；外部 IO 门/故障注入仅作用于 fixture 读钩）。
- R3 复核:BF-08 事件序列逐项为公开端口事件（exitFrame/music:stop/publish+clear 同续原子/write:defeat/restore），无无业务意义实现细节绑定；R5:BF-10 真菜单 'q' 提交逃跑主体保留。
- 逐合同账（31 行，含 battle-host.test.ts 16 例与 world-result BF-01..07 的排重注记）: `contract-ledger.tsv`；旧→新映射: `before-after.tsv`。

## 验证

- 定向+相邻（卡面三文件）31/31，双 reporter 同进程；instrumentation（v8 coverage 独占目录）绿；复跑×2 稳定（`directed/`）。
- Reforge 全包、typecheck、根 lint 完整 0/0/0、check:docs、git diff --check:逐命令 exit 与原始输出见 `identity.json`（gate 表）。
- 覆盖率仅作 instrumentation 可靠性证明，不进官方结算。

## 三态反控（`counterproof/`）

`node run-counterproof.mjs formal` 重放:判据自测 22 例合成反例全拒收/放行正确 + 3 例真实 Vitest 探针（纯业务红接受；红+afterAll hook 错误拒收；红+异步 uncaught 拒收）先于真实针；随后 N1–N5 逐针四态（基线绿→变异恰一指定业务 AssertionError 红→还原绿→末次重放绿，执行集 file×fullName 逐字不变）+ N6 家族探针（共享 harness 复原步骤删除→H1..H4 复原身份断言四红，级联判据记录，不冒充恰一针）+ N3 三文件范围级联诚实披露（settle 层 exp 门为共享 oracle 点，同变异真实波及 4 例跨两层:BF-02（settle 层 onExpRewardCalls）、BF-09b（本针）、battle-host.test.ts:36/:232（host 层经 playVictory 多出 music:play 破坏端口序）；判据先以 2 例预期集拒收、修正为实测 4 例集后接受——预测偏差本身留档）。全部 state 落 `counterproof/mutation-logs/*.raw|json` 与 `counterproof/counterproof.json`（进程 exit/signal/pid/spawnError、argv/cwd/env(含 unset NODE_COMPILE_CACHE)、计数、执行身份全表、完整失败文本、raw+JSON 双 sha256、变异前/mutant/restored sha256）；变异只在 mkdtemp 隔离树，finally 整树删除（清理证明见 counterproof.json cleanup 字段）。

## 证据蒸馏注记

vitest JSON reporter 在 coverage 开启时内嵌 2.1MB `coverageMap`、全包 8781 测试明细 7.1MB，均超仓库 biome 1MiB 文件上限（不得以 ignore 过门）。按既有判例蒸馏:`directed/instrumentation-r1.json`、`basepoint/instrumentation.json` 移除 coverageMap（key sha256 与原文件 sha256 记录于 distillation 字段，执行身份 testResults 完整保留）；`basepoint/fullsuite-ci-exact.json` 按 media 卡“全包留 raw”判例蒸馏为 file 级（原文件 sha256 记录，进程原始输出保全于同名 .raw）。

## U/B 账

- U-1:CI 侧 100 轮预算不足的精确调度放大源未本地钉死（见 R2-5）；不影响等待器判别与修复结论。
- B:无。产品缺陷:无发现（4 冻结源逐字节核验未动）。

## Codex独立审核（2026-10-07）

见[独立审核记录](codex-review-r1.md)及[串行集成门回执](codex-integration-gates.json)。合同accept、全仓check/official ratchet/受保护fast全过；GitHub新CI需按具体运行另核，不冒称已通过。

新CI发现的旧帧动画等待问题由Codex主树维护，[真实慢IO对照与窄修](ci-frame-animation-io-sync.json)保留原始正常、单红、修后及相邻原件；不扩大GLM有限卡。A终局在失败的同次CI中已8/8通过，整门失败不可改写为通过。
