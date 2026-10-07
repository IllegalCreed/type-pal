# 当前存档校验测试精简与输入边界证据

当前：r3固定候选 `1d09128feac5dd479832df4ddb45fdc5e654e47b` 已获Codex独立accept；串行全仓check、官方ratchet、受保护fast全部通过，有限S1–S9收口done。见[归档任务卡](../../archive/tasks/done/TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1.md)、[三审](codex-review-r3.md)、[串行集成门](codex-integration-gates.json)、[46原件hash与17重建mutant审计](codex-r3-artifact-audit.json)。GitHub新CI按实际推送HEAD另核，不将本地门冒充托管通过。

历史：[二审counter](codex-review-r2.md)、[二审反例](codex-r2-loss/receipt.json)、[二审审计](codex-r2-artifact-audit.json)、[r1记录](codex-review-r1.md)。原counter均已在三审闭合，不重复派发。

托管首跑：`b836ad5d4`的Documentation通过；Coverage在质量台账tracked清单3084/实际3085的登记差异处拒收，尚未执行typecheck/lint或覆盖率。Codex仅同步新增测试的机器总数和待核数，不增加“已审”进度；详见[CI登记修复](ci-tracked-inventory-refresh.json)。后续新CI另按实际HEAD核验。

口径：三文件81次执行，80个唯一标题；两个既有null标题有重数。80行合同账按唯一标题分组，不冒称完整执行行数，完整多重集合以native JSON为准。作者r3全包8793是隔离旧基点数，集成A/C后实跑8798/8798。main正式并集分支83.26%（50132/60209），不与作者私有增量相加。

Codex集成修正：`generate-before-after.mjs`默认读取目录内基线与r3绿态JSON，不依赖固定`/tmp`文件；默认重建69条旧执行映射及80个唯一标题组。完整执行重数由反控native JSON判据核验，唯一标题组不代替执行多重集合。

## 贡献者r3交付（历史原口径保留）

当前存档校验测试精简与输入边界（S1–S9 有限清单）。贡献者 GLM（新对话B），基点
`d84b3db23`（产品冻结 `ce808b42e`），分支 `codex/glm-reforge-save-test-precision-r1`。
r2 按 Codex r1 counter（codex-review-r1.md，现存主树，集成后可链接；B-R1-01 四条独立
接线合同归还 + 容器缺席拆身份；B-R1-02 共享文档恢复派发值）；r3 按 r2 counter（codex-review-r2.md，
同前）归还 maxMP/extraStatuses 空洞/poisons 空洞三原合同并对齐反控入口。

## 改动面（白名单内）

| 文件 | 类型 | 说明 |
|---|---|---|
| `packages/reforge/src/save/current-structure.test.ts` | 旧测重铸 | 双桥/假枚举清零；坏形状一律经 unknown 视图（JSON 往返）直传公开 guard；跨合同用例原子拆分；同一调用点同谓词值维度去重（r1 61→60，r2 按 B-R1-01 归还四接线 → 64 例，r3 按 B-R2-01 再归还 maxMP 成员资格与 extraStatuses/poisons 空洞 → 67 例） |
| `packages/reforge/src/save/current-save.current-characterization.test.ts` | 旧测重铸 | 版本拒收六行全为「两者不同」→ 三条件代表（仅 version/仅 content/两者，取 SAVE_VERSION/CONTENT_VERSION 常量）；新增 resolver/payload 身份合同（8→6 例，其中 1 新） |
| `packages/reforge/src/save/current-codec.contracts.test.ts` | 新增 | 真正 codec 层缺口：skillUseCounts 空 ID/负数/非安全整数、可省略容器缺席补空与原件不变（r2 拆为 skillUseCounts/entityLifecycles 两个独立 oracle 身份）、hostileAwareness 正数性、script 深层接线（typed 合法可达输入，先过结构 guard，8 例） |
| `before-after.tsv` | 账本 | 69 条旧用例逐条 before→after 身份与剩余 oracle 映射（r2 后 4 条 restored-r2、6 条 dropped 各附剩余 oracle 位置） |
| `contract-ledger.tsv` | 账本 | 80 条最终合同（existing-proof/reworked/consolidate/new-contract/restored-r2/restored-r3，按最终实跑统一） |
| `generate-before-after.mjs` | 证据工具 | 从基线/候选 JSON 程序化生成两账本并验证锚点唯一性、覆盖重数、after 存在性 |
| `lib-isolated-tree.mjs` / `run-counterproof.mjs`（r3 对齐版，**当前反控入口**）/ `run-counterproof-r2.mjs`（历史） | 反控工具 | 判据库三代共用未改；对齐版 runner 修 81 行绿基线、N05 拆分身份、N08 新名并纳入 NRR1–NRR3 共 17 针（B-R2-02） |
| `counterproof-r3.json` + `counterproof-r3-runs/`（**当前入口产物**，17 针）；`counterproof.json`/`counterproof-runs/`（r1 14 针）、`counterproof-r2.json`/`counterproof-r2-runs/`（r2 6 针） | 反控原件 | 三代每态 raw/stdout 与 native JSON（biome 定稿后计 hash）；**r1/r2 为历史原件**（对应各自候选，r2 六针经 Codex 二审独立复跑确认），不宣称 r1/r2 全部为最终源码证据 |
| `directed.raw` / `adjacent.raw` / `full-test.raw` / `typecheck.raw` / `lint.raw` / `docs-gate.raw` | 门禁原件 | 贡献者工作树实测输出（trimEof 恰一终止换行） |

产品零改动：五个冻结源 SHA256 与任务卡逐字一致（runner 逐树复验 4 个 reforge 源，
content/entity-lifecycle.ts 工作树直核）。

## 验证（贡献者工作树实测）

| 门 | 命令 | 结果 |
|---|---|---|
| 定向 | `env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/reforge exec vitest run src/save src/main.save-flows.test.ts src/automatic-target-command.test.ts` | **r3 176/176**（12 文件；历史：r1 168、r2 173；基点同一命令 164/164 全绿，无 A 卡基点红需单列） |
| 相邻 content lifecycle | `env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/content exec vitest run src/entity-lifecycle.test.ts src/rewards-lifecycle.glm-o.test.ts` | 12/12 |
| Reforge 全包 | `env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/reforge exec vitest run` | **r3 8793/8793**，exit 0（历史：r1 8785、r2 8790） |
| typecheck | `pnpm --filter @type-pal/reforge exec tsc --noEmit` / `--filter @type-pal/content exec tsc --noEmit` | 双 0 错 |
| lint | 根 `pnpm lint` | 完整 0/0/0（见 lint.raw） |
| docs | 根 `pnpm check:docs` + `git diff --check` | 见 docs-gate.raw |

定向集新旧对照：旧 164（两旧文件 69 例）→ 新 168（三文件 73 例）；净额 = 拆分/归位 +12、
同层排重 -10、新增 +8（7 codec + 1 resolver）。数量变化是排重与拆分的净额，非目标。

## 反控（严格四态，/tmp 隔离树；r3 对齐版为当前入口）

**当前入口 `run-counterproof.mjs`（r3 按 B-R2-02 对齐）**：绿基线 81 行（67 structure + 8
codec + 6 characterization，含判据自证 20 合成反例与 3 真实 Vitest 探针复验）→ **17 针逐针红**
（N01–N14 映射到当前源/测试 hash 与执行集 + B-R2-01 三新针 NRR1/NRR2/NRR3）→ 真正恢复绿
（全新原始树，执行集与快照逐字一致）→ 末次重放；20 树清理证明。定稿回执
`counterproof-r3.json`（biome 定稿字节）sha256
`fd65dc26a3bcbea2308f23d929ac392a6bd133cfab41c0d89ed2106de4889207`。

三新针（B-R2-01，恰一指定业务 AssertionError）：NRR1 从 assertCharacterInstance 字段数组移除
`maxMP`、NRR2 assertCarriedStatuses 回调对 undefined entry 提前 return、NRR3 assertActivePoisons
回调同——分别只由 maxMP=Infinity 精确路径行、extraStatuses[0]/poisons[0] 空洞行捕获。

信用不重复计：N05（当前入口内，指向 r2 拆分后的 skillUseCounts 独立身份）与历史 r2 runner 的
NR5 是同一变异（补空注入非空），按一个合同计。

**历史原件（不宣称全部为最终源码证据）**：`counterproof.json`/`counterproof-runs/`（r1 14 针，
对应 r1 候选，见 Codex r1 审计）；`counterproof-r2.json`/`counterproof-r2-runs/`（r2 6 针，
对应 r2 候选，经 Codex 二审独立复跑确认）。当前入口的全部 17 针已在 r3 候选上重采。

针设计返工记录（判据拒收驱动，非放宽）：

- N05 首版变异（去掉补空）使产品在断言前抛普通 `Error: 期望对象`——判据以「非
  AssertionError」拒收；改针为「补空注入 `{hero:{fire:1}}`」后由测试 `toEqual({})` 断言
  失败成红，与 S6「clone 内补空 {}」oracle 对齐。
- N12/N13 首版用 `rejects.toThrow`，变异未拒收时 vitest4 报裸 `Error: promise resolved …`
  而非 AssertionError——判据拒收；按 runtime-session 卡判例把断言改为 catch + 同步
  `toBeInstanceOf(Error)`（失败为 `AssertionError: SAVE… 必须被拒收`），oracle 不变。

## 排重与判别力口径（r3 按 B-R2-01/B-R2-02 复核后终态）

- 每条删除/合并的剩余 oracle 映射见 `before-after.tsv`；r3 后余 5 条 dropped 全部为
  「同一调用点同谓词」值维度重复（money NaN/Infinity、party null/对象、portrait number/null、
  facing sideways/undefined）或「更强 oracle 替代」（hiddenExp.exp=NaN → R4 message 测试），
  无「共享 helper 替代接线」类删除残留；maxMP 与 extraStatuses/poisons 空洞已按 B-R2-01
  归还（dropped 6→5，restored-r3 +3）。
- r2 归还的四条接线合同与 r3 归还的三条原合同均以独立原子行 + 对应针（NR1–NR4、NRR1–NRR3）
  证明判别力；容器缺席两个独立身份以 N05/NR6（历史）→ 当前入口 N05 重采覆盖。
- 如实登记的残余暴露面（不扩为无限清单，供 Codex 复核裁量）：11 个数值字段共用单条 for
  循环语句（字面量字段数组），hp=NaN/luck=字符串/maxMP=Infinity 已证循环按条件执行且 maxMP
  成员在数组内，其余 8 个字段（level/exp/maxHP/mp/attack/defense/magicAttack/speed）的数组
  成员资格未逐字段建行（属「不机械恢复重复数字矩阵」排除范围）。extraStatuses/poisons 空洞
  残余已随 r3 归还闭合。
- B-R1-02：共享 `docs/ops/evidence/README.md` 与
  `docs/phase-governance/reviews/20261004-semantic-current-batch.json` 已恢复至派发
  `d84b3db23` 版本并保持；共享导航/pin 由 Codex 集成时维护。
- 共享登记缺口如实列明（不越界修）：① evidence 导航本卡条目仍为派发原文「新派发，待交付」，
  状态更新与 codex-review-r1/r2/r3 审计文件均在主树，由 Codex 集成时统一登记/链接；本目录与
  任务卡中的审核文件引用为纯文本（r2 曾以相对链接引用主树文件导致 docs 链接门红，r3 已去
  链接）。② r2 交付时 docs-gate.raw 早于 README 链接编辑采集，坏链接漏检，r3 已修正采集顺序。
- 旧测双桥/假枚举清零核验：两旧文件已无 `as unknown as`/`as never`/假枚举强转；
  坏输入全部经 unknown 视图进入公开 guard，合法输入仍走 buildWorld/builder typed 通道。
