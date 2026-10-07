# TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1 证据目录

当前存档校验测试精简与输入边界（S1–S9 有限清单）。贡献者 GLM（新对话B），基点
`d84b3db23`（产品冻结 `ce808b42e`），分支 `codex/glm-reforge-save-test-precision-r1`。
任务卡：[TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1](../../tasks/TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1.md)。

## 改动面（白名单内）

| 文件 | 类型 | 说明 |
|---|---|---|
| `packages/reforge/src/save/current-structure.test.ts` | 旧测重铸 | 双桥/假枚举清零；坏形状一律经 unknown 视图（JSON 往返）直传公开 guard；跨合同用例原子拆分；同层同 oracle 拒收去重（61→60 例） |
| `packages/reforge/src/save/current-save.current-characterization.test.ts` | 旧测重铸 | 版本拒收六行全为「两者不同」→ 三条件代表（仅 version/仅 content/两者，取 SAVE_VERSION/CONTENT_VERSION 常量）；新增 resolver/payload 身份合同（8→6 例，其中 1 新） |
| `packages/reforge/src/save/current-codec.contracts.test.ts` | 新增 | 真正 codec 层缺口：skillUseCounts 空 ID/负数/非安全整数、可省略容器缺席补空与原件不变、hostileAwareness 正数性、script 深层接线（typed 合法可达输入，先过结构 guard，7 例） |
| `before-after.tsv` | 账本 | 69 条旧用例逐条 before→after 身份与剩余 oracle 映射（10 dropped 各附剩余 oracle 位置） |
| `contract-ledger.tsv` | 账本 | 72 条最终合同（existing-proof/reworked/consolidate/new-contract） |
| `generate-before-after.mjs` | 证据工具 | 从基线/候选 JSON 程序化生成两账本并验证锚点唯一性、覆盖重数、after 存在性 |
| `lib-isolated-tree.mjs` / `run-counterproof.mjs` | 反控工具 | 判据库（移植 TEST-GAME-MEDIA-LIFECYCLE-1 r2 定稿版，未放宽）与四态协议 runner |
| `counterproof.json` + `counterproof-runs/` | 反控原件 | 每态 raw/stdout 与 native JSON（biome 定稿后计 hash） |
| `directed.raw` / `adjacent.raw` / `full-test.raw` / `typecheck.raw` / `lint.raw` / `docs-gate.raw` | 门禁原件 | 贡献者工作树实测输出（trimEof 恰一终止换行） |

产品零改动：五个冻结源 SHA256 与任务卡逐字一致（runner 逐树复验 4 个 reforge 源，
content/entity-lifecycle.ts 工作树直核）。

## 验证（贡献者工作树实测）

| 门 | 命令 | 结果 |
|---|---|---|
| 定向 | `env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/reforge exec vitest run src/save src/main.save-flows.test.ts src/automatic-target-command.test.ts` | 168/168（12 文件；基点同一命令 164/164 全绿，无 A 卡基点红需单列） |
| 相邻 content lifecycle | `env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/content exec vitest run src/entity-lifecycle.test.ts src/rewards-lifecycle.glm-o.test.ts` | 12/12 |
| Reforge 全包 | `env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/reforge exec vitest run` | 8785/8785，exit 0 |
| typecheck | `pnpm --filter @type-pal/reforge exec tsc --noEmit` / `--filter @type-pal/content exec tsc --noEmit` | 双 0 错 |
| lint | 根 `pnpm lint` | 完整 0/0/0（见 lint.raw） |
| docs | 根 `pnpm check:docs` + `git diff --check` | 见 docs-gate.raw |

定向集新旧对照：旧 164（两旧文件 69 例）→ 新 168（三文件 73 例）；净额 = 拆分/归位 +12、
同层排重 -10、新增 +8（7 codec + 1 resolver）。数量变化是排重与拆分的净额，非目标。

## 反控（严格三态，/tmp 隔离树）

定稿回执 `counterproof.json`（biome 定稿字节）sha256
`88f58c56fcaa0418499f04d64e64057544ac83d0c9b8def1f1a35e370d0b9d6b`；判据工具 biome 定稿后
完整重跑（格式化不改变语义，证据按定稿 runner 重出）。

协议：判据自证（20 合成反例 + 3 真实 Vitest 探针：纯业务红接受、目标红+afterAll 抛错拒收、
目标红+异步 uncaught 拒收）→ 原始绿（三文件执行集 73 行快照）→ 14 针逐针红（每针独立新树、
冻结源核验、恰一文本变异、恰一指定业务 AssertionError、marker 命中）→ 还原绿（全新原始树，
执行集与快照逐字一致）→ 末次重放（首针重建再现红）。产品变异只落在 `/tmp` 临时树，每树用后
删除并落清理证明；贡献者工作树产品零改动（工作树 git status 仅白名单文件）。

针清单：N01/N02 空角色/技能 ID、N03 负数、N04 非安全整数、N05 补空注入非空垃圾、
N06 remainingMs=0 正数性、N07 script 深层接线、N08/N09 稀疏空洞（inventory/tags）、
N10 hiddenExp 全键集、N11 envelope 版本常量、N12/N13 preflight 单条件隔离、N14 resolver 身份。

针设计返工记录（判据拒收驱动，非放宽）：

- N05 首版变异（去掉补空）使产品在断言前抛普通 `Error: 期望对象`——判据以「非
  AssertionError」拒收；改针为「补空注入 `{hero:{fire:1}}`」后由测试 `toEqual({})` 断言
  失败成红，与 S6「clone 内补空 {}」oracle 对齐。
- N12/N13 首版用 `rejects.toThrow`，变异未拒收时 vitest4 报裸 `Error: promise resolved …`
  而非 AssertionError——判据拒收；按 runtime-session 卡判例把断言改为 catch + 同步
  `toBeInstanceOf(Error)`（失败为 `AssertionError: SAVE… 必须被拒收`），oracle 不变。

## 排重与判别力口径

- 每条删除/合并的剩余 oracle 映射见 `before-after.tsv` 的 `after_or_remaining_oracle` 列；
  被删 10 例全部为「同检查函数、同路径、同文案」或「同输入更强 oracle 已存在」，无净合法轴
  损失（dropped 各附 `source:line` 锚点）。
- 新增 8 例全部 typed 合法可达（normalize 只接 typed 合法可表达值，先过 assertCurrentSaveStructure
  才到达 codec 语义层），以 N01–N07/N12/N13/N14 最小变异证明判别力。
- 旧测双桥/假枚举清零核验：两旧文件已无 `as unknown as`/`as never`/假枚举强转；
  坏输入全部经 unknown 视图进入公开 guard，合法输入仍走 buildWorld/builder typed 通道。
