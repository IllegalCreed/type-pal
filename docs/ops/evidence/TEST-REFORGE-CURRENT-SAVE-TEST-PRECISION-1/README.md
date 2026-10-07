# TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1 证据目录

当前存档校验测试精简与输入边界（S1–S9 有限清单）。贡献者 GLM（新对话B），基点
`d84b3db23`（产品冻结 `ce808b42e`），分支 `codex/glm-reforge-save-test-precision-r1`。
r2 按 Codex [r1 counter](codex-review-r1.md)（B-R1-01 四条独立接线合同归还 + 容器缺席拆
身份；B-R1-02 共享文档恢复派发值）有限返工。

## 改动面（白名单内）

| 文件 | 类型 | 说明 |
|---|---|---|
| `packages/reforge/src/save/current-structure.test.ts` | 旧测重铸 | 双桥/假枚举清零；坏形状一律经 unknown 视图（JSON 往返）直传公开 guard；跨合同用例原子拆分；同一调用点同谓词值维度去重（r1 61→60，r2 按 B-R1-01 归还 height/spriteId/battleSprite/skillUseCounts 内层四接线 → 64 例） |
| `packages/reforge/src/save/current-save.current-characterization.test.ts` | 旧测重铸 | 版本拒收六行全为「两者不同」→ 三条件代表（仅 version/仅 content/两者，取 SAVE_VERSION/CONTENT_VERSION 常量）；新增 resolver/payload 身份合同（8→6 例，其中 1 新） |
| `packages/reforge/src/save/current-codec.contracts.test.ts` | 新增 | 真正 codec 层缺口：skillUseCounts 空 ID/负数/非安全整数、可省略容器缺席补空与原件不变（r2 拆为 skillUseCounts/entityLifecycles 两个独立 oracle 身份）、hostileAwareness 正数性、script 深层接线（typed 合法可达输入，先过结构 guard，8 例） |
| `before-after.tsv` | 账本 | 69 条旧用例逐条 before→after 身份与剩余 oracle 映射（r2 后 4 条 restored-r2、6 条 dropped 各附剩余 oracle 位置） |
| `contract-ledger.tsv` | 账本 | 77 条最终合同（existing-proof/reworked/consolidate/new-contract/restored-r2） |
| `generate-before-after.mjs` | 证据工具 | 从基线/候选 JSON 程序化生成两账本并验证锚点唯一性、覆盖重数、after 存在性 |
| `lib-isolated-tree.mjs` / `run-counterproof.mjs` / `run-counterproof-r2.mjs` | 反控工具 | 判据库（r1/r2 共用未改）与 r1/r2 四态协议 runner |
| `counterproof.json` + `counterproof-runs/`；`counterproof-r2.json` + `counterproof-r2-runs/` | 反控原件 | r1（14 针）与 r2（6 针）每态 raw/stdout 与 native JSON（biome 定稿后计 hash）；r1 证据原样保留 |
| `directed.raw` / `adjacent.raw` / `full-test.raw` / `typecheck.raw` / `lint.raw` / `docs-gate.raw` | 门禁原件 | 贡献者工作树实测输出（trimEof 恰一终止换行） |

产品零改动：五个冻结源 SHA256 与任务卡逐字一致（runner 逐树复验 4 个 reforge 源，
content/entity-lifecycle.ts 工作树直核）。

## 验证（贡献者工作树实测）

| 门 | 命令 | 结果 |
|---|---|---|
| 定向 | `env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/reforge exec vitest run src/save src/main.save-flows.test.ts src/automatic-target-command.test.ts` | r2 173/173（12 文件；r1 168/168；基点同一命令 164/164 全绿，无 A 卡基点红需单列） |
| 相邻 content lifecycle | `env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/content exec vitest run src/entity-lifecycle.test.ts src/rewards-lifecycle.glm-o.test.ts` | 12/12 |
| Reforge 全包 | `env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/reforge exec vitest run` | r2 8790/8790，exit 0 |
| typecheck | `pnpm --filter @type-pal/reforge exec tsc --noEmit` / `--filter @type-pal/content exec tsc --noEmit` | 双 0 错 |
| lint | 根 `pnpm lint` | 完整 0/0/0（见 lint.raw） |
| docs | 根 `pnpm check:docs` + `git diff --check` | 见 docs-gate.raw |

定向集新旧对照：旧 164（两旧文件 69 例）→ 新 168（三文件 73 例）；净额 = 拆分/归位 +12、
同层排重 -10、新增 +8（7 codec + 1 resolver）。数量变化是排重与拆分的净额，非目标。

## 反控（严格三态，/tmp 隔离树）

r1：判据自证（20 合成反例 + 3 真实 Vitest 探针：纯业务红接受、目标红+afterAll 抛错拒收、
目标红+异步 uncaught 拒收）→ 原始绿（三文件执行集 73 行快照）→ 14 针逐针红 → 还原绿（执行集
逐字一致）→ 末次重放；产品变异只落在 `/tmp` 临时树，17 树清理证明全落 `counterproof.json`。

r2（按 B-R1-01 重采受影响执行集，判据库未改、真实探针证据沿用 r1）：新绿基线（三文件执行集
78 行 = 64 structure + 8 codec + 6 characterization）→ 6 针逐针红（独立新树、冻结源核验、恰一
文本变异、恰一指定业务 AssertionError）→ 还原绿（执行集与快照逐字一致）→ 末次重放；9 树清理
证明。定稿回执 `counterproof-r2.json`（biome 定稿字节）sha256
`36904623dee7b2b7dabcab2ade33aa54c210c9014cb8dff3cbff14373a4fd48b`。

r2 针清单（每针对应 Codex 四变异实验指出的漏接线/独立身份）：NR1 assertGridPos height 有限数
接线、NR2 appearance.spriteId 自有闭包、NR3 appearance.battleSprite 自有闭包、NR4
assertSkillUseCounts 内层有限数接线、NR5 skillUseCounts 缺席补空（注入非空由 `toEqual({})`
成红）、NR6 entityLifecycles 缺席补空（normalize 后覆写非空表由 `toEqual({})` 成红）。

r1 针设计返工记录（判据拒收驱动，非放宽）：

- N05 首版变异（去掉补空）使产品在断言前抛普通 `Error: 期望对象`——判据以「非
  AssertionError」拒收；改针为「补空注入 `{hero:{fire:1}}`」后由测试 `toEqual({})` 断言
  失败成红，与 S6「clone 内补空 {}」oracle 对齐。
- N12/N13 首版用 `rejects.toThrow`，变异未拒收时 vitest4 报裸 `Error: promise resolved …`
  而非 AssertionError——判据拒收；按 runtime-session 卡判例把断言改为 catch + 同步
  `toBeInstanceOf(Error)`（失败为 `AssertionError: SAVE… 必须被拒收`），oracle 不变。

## 排重与判别力口径（r2 按 B-R1-01 接线维度复核）

- 每条删除/合并的剩余 oracle 映射见 `before-after.tsv`；r2 后 6 条 dropped 全部为 Codex r1
  明示保留的「同一调用点同谓词」值维度重复（money NaN/Infinity、party null/对象、portrait
  number/null、facing sideways/undefined、maxMP 与 hp 同一条 11 字段循环）或「更强 oracle 替代」
  （hiddenExp.exp=NaN → R4 message 测试），无「共享 helper 替代接线」类删除残留。
- r2 归还的四条接线合同（缺 height、spriteId=数字、battleSprite=null、skillUseCounts 内层）
  均以独立原子行 + NR1–NR4 最小变异证明判别力；容器缺席拆为两个独立 oracle 身份并以
  NR5/NR6 证明。
- 如实登记的残余暴露面（不扩为无限清单，供 Codex 复核裁量）：11 个数值字段共用单条 for
  循环语句（字面量字段数组），hp=NaN/luck=字符串 已证循环按条件执行，其余 8 个字段的数组成员
  资格未逐字段建行（属「不机械恢复重复数字矩阵」排除范围）；extraStatuses/poisons 稀疏空洞
  未单独建行——各自元素级合同（turns=Infinity/未知 id/缺 tickIndex）已证元素检查器按索引
  执行，hole-skip 类每调用点变异的残余暴露同此登记。
- B-R1-02：共享 `docs/ops/evidence/README.md` 与
  `docs/phase-governance/reviews/20261004-semantic-current-batch.json` 已恢复至派发
  `d84b3db23` 版本（本卡条目仍为「新派发，待交付」原文）；共享导航/pin 由 Codex 集成时
  维护，登记缺口在此如实报告。
- 旧测双桥/假枚举清零核验：两旧文件已无 `as unknown as`/`as never`/假枚举强转；
  坏输入全部经 unknown 视图进入公开 guard，合法输入仍走 buildWorld/builder typed 通道。
