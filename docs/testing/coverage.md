# 测试覆盖率基线与只升不降门禁

状态：**Vitest 4.1.7 + V8 fast/full 覆盖率已接入；fast 基线见
[`scripts/coverage/baseline.fast.json`](../../scripts/coverage/baseline.fast.json)。**

覆盖率回答“哪些生产代码被测试执行过”，不回答业务是否正确。存档故障、异步乱序、跨会话撤销、浏览器文件
系统、完整战斗与通关仍必须由集成测试和 Q1/Q2/编辑器 E2E 证明，不能用覆盖率百分比替代。

## 最新实测（2026-09-12）

**后续fast更新**：另存为续批新增10项后，当前fast为**6,347项**、单次严格门禁通过，源码范围/分母不变。
以下full6,673及fast6,337的对照保留其运行时快照；本轮未重跑full，不能说后来新增的10项已包含在旧full清单中。

生产基线**b7a56dd4**，full运行时HEAD为仅文档变化的917b3470。fast为**6,337项**，本次完整PAL口径
`TYPE_PAL_COVERAGE_BASE_REF=b7a56dd4 pnpm coverage:full`为**6,673项**、exit0；两档均精确包含**618个生产文件**。
full机械验证fast测试身份清单是其子集，源码范围、全部指标分母相同，各包均不低于fast；fast基线没有改写。

| 包 | Full 行 | Full 语句 | Full 函数 | Full 分支 |
|---|---:|---:|---:|---:|
| shared | 55.06% | 53.45% | 66.67% | 60.45% |
| content | 82.73% | 79.98% | 89.51% | 71.45% |
| pal-extract | 61.09% | 60.59% | 71.43% | 59.37% |
| migrate | 82.96% | 80.57% | 79.93% | 74.18% |
| reforge | 54.06% | 52.13% | 54.96% | 46.15% |
| game | 76.21% | 74.30% | 72.65% | 67.00% |
| editor | 79.06% | 76.50% | 74.74% | 68.47% |
| **全仓** | **73.64%** | **71.37%** | **72.43%** | **65.01%** |

全仓精确数：行51,243/69,587，语句56,764/79,539，函数10,590/14,622，分支40,653/62,530。
那次full对应的fast为行69.66%、语句67.47%、函数69.52%、分支61.49%；各包当前fast以生成baseline为准。
full比fast多运行336项**已有**测试：pal-extract155、migrate118、game56、editor7，不是本轮新补336项。
full仍不是浏览器E2E，也不包括由普通check另跑的重型静态扫描；不能用6,673与check6,825的差值推断漏跑产品测试。

本轮验证的是当前完整覆盖率，**没有新增测试、修改生产或消除未覆盖代码**；约定的全仓90%/85%目标仍未达到。
当前双线：GLM在[身份基础工作包](editor-save-recovery-glm-identity-foundation.md)补代码测试，Codex处理保存恢复剩余风险和统一验证。
证据：`coverage/full/summary.json`（2026-09-12T13:21:17.236Z），日志及独立源码/指标/测试子集核对在
`/tmp/codex-full-current.eCPdt2/full.log`、`verified.json`。下面各日期段保留历史事实，旧表中的“当前”仅指该日期。
独立复核首次误将runner私有assertTestSuperset当成inventory导出，导入失败、未产生复核证据；
随后直接按报告identities逐项集合比较并核sourceFiles/分母/分子，全部通过。正式full运行自身的子集校验始终有效，不受该辅助脚本错误影响。

## 两个执行档

| 档位 | 命令 | 测试范围 | 用途 |
|---|---|---|---|
| fast | `pnpm coverage:fast` | 七包 unit/component/headless 测试；排除 `*.pal.test.*` 和已登记的原盘/迁移产物对拍文件 | 日常与提交前防回退 |
| full | `pnpm coverage:full` | 机械验证 fast 测试清单是其子集，并加入当前 PAL 真数据 Vitest 测试 | 发布前、迁移与真实 PAL 回归 |

当前仓库没有可运行的 Playwright/browser coverage 配置。`game` 中名字含 e2e 的文件是 headless Vitest，不是
浏览器 E2E。Q1/Q2 和编辑器完整工作流建立后，它们作为独立业务门禁加入发布流程；在浏览器输入、fixture 和
覆盖收集都稳定前，不把它们伪装进 fast 百分比，也不把录屏成功当覆盖证明。

full 在启动前会检查 PAL 原盘、`data/extracted`、current PAL 工程和迁移 baseline 的代表性完整输入；缺任一项
直接失败，不允许依靠 `skipIf` 产出一份看似成功、实际没跑真数据的报告。

编辑器中配置明确列出的重型 `*-adoption`、总 adoption、设计系统 boundary 与 field-commit boundary 静态扫描
会在 V8 instrumentation 下反复解析已插桩的全量源码，既不衡量产品运行覆盖，又把单次测试放大到数十秒，
因此不参加 fast/full coverage 进程；其他轻量 boundary 测试仍执行，这些重型门禁也继续由普通 `pnpm check`
完整执行。排除的是这组**测试执行器**，不是生产源码，编辑器全部 `src/**/*.{ts,tsx}` 仍进入覆盖报告。
编辑器普通测试同时固定 `maxWorkers=2`：不限 worker 时这批全源码扫描与 UI 焦点测试会争抢 CPU 并产生超时或
焦点竞态；受控并发下测试通过，断言和超时本身没有放宽。不要在本地同时运行完整 check 与 coverage：
即使各自受控并发，两套重型进程仍会争抢 CPU；E-06 最终实现的独立完整检查为 194 文件 / 1,756 项通过。

## 生产源码口径

Vitest 4.1.7 没有 `coverage.all`。只有显式 `coverage.include` 才会把未被任何测试导入的匹配文件按 0% 纳入。
本仓库的唯一配置在 `scripts/coverage/config.mjs`：

| 包 | 纳入范围 |
|---|---|
| shared / content / reforge / game / editor | `src/**/*.{ts,tsx}` |
| pal-extract | `src/**/*.ts` + 产品命令入口 `scripts/extract-videos.ts` |
| migrate | `src/**/*.ts` + 产品命令入口 `scripts/migrate-content.mts`、`scripts/bake-assets.mts` |

只排除测试/spec、`__tests__` 和 `.d.ts`；不按低覆盖率排除生产子树。每次运行还会独立遍历文件系统，将预期生产
文件与 `coverage-summary.json` 逐文件对账；任何漏报或越界都会失败。HTML、LCOV 和 JSON 运行产物写到
`coverage/<profile>/<package>/`，该目录不入 Git。

## fast 基线与 ratchet

首次基线由 `pnpm coverage:ratchet` 生成。以后：

1. `coverage:fast` 同时比较**每个包**和**全仓**的 statements、branches、functions、lines。
2. 比较使用 `covered / total` 整数交叉相乘，不依赖两位小数，细小回退也不会被四舍五入掩盖。
3. 任一包任一指标下降即失败，不能拿其他包的提升抵消保存、迁移或战斗模块的退步。
4. 基线保存逐个生产文件，以及每个 fast 测试文件的 case 数与 identity digest；每次先用相同 Vitest 参数执行
   `vitest list`，再验证报告。full 会在内存中逐 identity 检查 `fast ⊆ full`，不能靠命名约定声称是超集。
5. 生产文件、测试清单或 Vitest 配置变化时普通门禁失败；只有覆盖率未下降后，才能人工运行
   `pnpm coverage:ratchet` 接受新增或配置变化。ratchet 不允许把仍存在的生产文件移出统计；任何删除还必须
   显式使用 `--allow-scope-removal`，防止把缩窄范围伪装成覆盖提升。
6. PR 的 GitHub Actions 会读取目标分支旧 baseline，直接推送 main 时则读取 push 前一提交；两条路都拒绝
   候选提交降低计数或把仍存在的源码移出基线，所以改低当前 JSON 不能绕过检查。完整生产数据不进仓库，
   CI 只跑自包含 fast，full 仍在发布环境执行。
7. ratchet 永远先检查旧基线，不能把较低结果直接覆盖进去；新基线先写同目录临时文件、格式化并复读验证，
   最后才原子替换。Vitest 或 provider 升级属于显式基线迁移，版本不匹配时直接拒绝比较。

`coverage:full` 使用同一生产文件范围并与 fast 基线比较；PAL 测试只能增加执行覆盖，不能把基础门槛降下来。

## 2026-09-06 首次真实结果

两档都确认覆盖报告精确包含 **608 个生产文件**。fast 执行 485 个测试文件 / 5,675 项测试；full 执行
524 个测试文件 / 6,010 项测试。以下百分比由整数计数展示，门禁实际仍比较未四舍五入的分数。

| 包 | Fast Lines | Fast Statements | Fast Functions | Fast Branches |
|---|---:|---:|---:|---:|
| shared | 55.06% | 53.45% | 66.67% | 60.45% |
| content | 82.73% | 79.98% | 89.51% | 71.45% |
| pal-extract | 25.00% | 24.87% | 35.00% | 38.78% |
| migrate | 51.43% | 49.94% | 51.42% | 44.36% |
| reforge | 53.27% | 51.28% | 53.08% | 45.57% |
| game | 75.38% | 73.44% | 70.65% | 66.31% |
| editor | 77.33% | 74.68% | 73.56% | 66.47% |
| **全仓** | **68.83%** | **66.60%** | **68.58%** | **60.61%** |

| 包 | Full Lines | Full Statements | Full Functions | Full Branches |
|---|---:|---:|---:|---:|
| shared | 55.06% | 53.45% | 66.67% | 60.45% |
| content | 82.73% | 79.98% | 89.51% | 71.45% |
| pal-extract | 61.09% | 60.59% | 71.43% | 59.37% |
| migrate | 82.92% | 80.52% | 79.93% | 74.10% |
| reforge | 53.27% | 51.28% | 53.08% | 45.57% |
| game | 76.15% | 74.24% | 72.33% | 66.84% |
| editor | 77.65% | 75.01% | 73.71% | 66.94% |
| **全仓** | **72.88%** | **70.57%** | **71.54%** | **64.19%** |

这说明测试数量很多不等于覆盖率已经高。近期补测收益最高的是 Reforge 的未触达运行路径，以及提取器的
自包含 fast 单测；content 已是当前最高，但分支覆盖仍只有 71.45%，也不能直接宣布达到目标。

## 门禁稳定性修复（2026-09-06）

GLM 文档提交 `e1314089` 的 [CI](https://github.com/IllegalCreed/type-pal/actions/runs/33983303477)
曾在 `StampTemplateDialog` 的关闭还焦点用例失败。直接证据是 `overlays.tsx` 的 `finishCycle` 使用
`requestAnimationFrame` 恢复焦点，而原测试在卸载后立即断言；只改文档也能触发该时序问题。
现已将该用例的动画帧时钟改成受控推进：先确认打开后焦点进入弹窗，关闭后推进下一帧，再断言返回触发按钮。
测试结束恢复真实时钟；组件代码、断言目标与覆盖范围不变，不靠重试或跳过用例取得绿色。

验证：相关 6 项测试通过；完整 `coverage:fast` 仍为 608 个生产文件、5,675 项测试，
四项精确覆盖计数均与原基线相同，未降低或重写基线。

## E-06 增量基线（2026-09-06）

[质量门禁修复](../ops/audits/pre-e2e/quality-gate-remediation.md)累计新增 16 项用例：6 项原生标签关联、
1 项目录行角色/选择状态切换、8 项迁移写入计划守卫与无变化发布回归，以及 1 项弹窗取消聚焦/晚到回调回归。
`coverage:ratchet` 验证 608 个生产文件、486 个 fast 测试文件 / 5,691 项测试，所有包四项指标均未回退；
本次未重跑 full coverage，前文 Full 表仍为首次基线，不把普通完整 check 当成 full 覆盖率报告。

| E-06 时点 Fast 全仓 | 精确计数 | 展示值 |
|---|---:|---:|
| Lines | 47,079 / 68,387 | 68.84% |
| Statements | 52,073 / 78,182 | 66.60% |
| Functions | 9,859 / 14,375 | 68.58% |
| Branches | 37,331 / 61,578 | 60.62% |

最初的格式清理曾使 migrate 行覆盖从 3,435/6,679 变为 3,433/6,677，ratchet 正确拒绝了这个微小下降；
补真实守卫回归后达到 3,436/6,677 才接受新基线，没有降低阈值、缩窄生产范围或使用 coverage ignore。
GitHub Actions 的 fast coverage 前置运行 `pnpm typecheck && pnpm lint`，完整 PAL 回归仍在本地完整检查中运行。

## SAVE-PREFLIGHT-1 增量基线（2026-09-06）

[B-04 修复](../ops/audits/pre-e2e/save-preflight-remediation.md)终审候选 `2c39b1af` 的单次严格 fast
为 **609 个生产文件 / 5,761 项测试**，各包精确比较通过，生产范围未缩窄；本轮文档收口没有改动基线或重跑覆盖率。
相对 E-06 净增 70 项：结构矩阵 50 项、真实 main.ts 恢复调用链 20 项。首轮重复矩阵已在返工中替换，
不沿用初版 5,783 次执行数冒充最终独立用例数。

| 当前 Fast 全仓 | 精确计数 | 展示值 |
|---|---:|---:|
| Lines | 47,203 / 68,527 | 68.88% |
| Statements | 52,217 / 78,345 | 66.65% |
| Functions | 9,898 / 14,415 | 68.66% |
| Branches | 37,385 / 61,645 | 60.65% |

新结构 guard 的行/语句/函数均 100%，分支 46/51（90.19%）；不代表整个存档域或全仓已达长期目标。
本卡未重跑 full coverage，前文 Full 表继续标记首次基线，完整普通 check 不能替代 full 报告。

## TEST-COVERAGE-DETERMINISM-1 稳定性收口（2026-09-06）

[TEST-COVERAGE-DETERMINISM-1](../ops/archive/tasks/done/TEST-COVERAGE-DETERMINISM-1-editor-ratchet.md)已三席验收收口，
候选 `7c447c38` 新增一条独立受控帧回归，未改生产组件或既有断言。
该时点 fast 为 **609 个生产文件 / 5,762 项测试**，editor 为 **213 个生产文件 / 1,601 项**，定向排序用例 24 项。
基线仅更新测试清单相关信息；上表所有覆盖率计数和百分比保持不变，并非靠增加用例数抬高百分比。

[受控帧调查](../ops/audits/pre-e2e/coverage-determinism.md)已在同一树上精确复得差额，唯一差异为
`reorder.tsx:730` 的无滚动容器返回。新增测试明确推进该帧，Codex/Kimi 独立移除 guard 均使新回归失败；
GLM 与 Codex 的实际检查保持 editor statements 23,456/31,407、branches 18,169/27,329，严格 fast 零回退。
本卡未重跑 full coverage。历史“clean HEAD 次数/概率”并未因此获证，未来其他回退仍停线补证，不重试取多数、不下调基线。

## SAVE-ISOLATION-1 增量基线（2026-09-07，三席终审通过）

更新：候选 `526eea00` 已获三席终审 accept，Codex 核定无实现漂移；用户明确免复验通过，本卡已收口。
此次文档汇总未改基线或重跑覆盖率。

[存档隔离卡](../ops/archive/tasks/done/SAVE-ISOLATION-1-project-workspace-save-scope.md)新增 80 项独立测试：
scope 29、IDB/Memory 隔离与事务 18、boot/独立试买 2、URL 16、工作区记录 1、真实 play.ts 入口 14。
`coverage:ratchet` 先与旧基线比较，提升 12 项且无下降，更新为 **610 个生产文件 / 5,842 项测试**；
随后一次严格 `coverage:fast` exit 0，所有精确计数与新基线一致，无重试取多数。

| 本候选 Fast 全仓 | 精确计数 | 展示值 |
|---|---:|---:|
| Lines | 47,323 / 68,582 | 69.00% |
| Statements | 52,360 / 78,411 | 66.78% |
| Functions | 9,935 / 14,425 | 68.87% |
| Branches | 37,467 / 61,711 | 60.71% |

新增纯核 `save/scope.ts` 分支 29/29、`core/play-url.ts` 分支 29/29；工作区记录校验 11/11，
三者行/语句/函数均 100%。存储层行/语句/函数均 100%，分支 15/16（93.75%）；入口 play.ts 行/语句/
函数 100%、分支 11/14（78.57%），未把错误展示的剩余分支伪装成已覆盖。没有 coverage ignore 或缩范围。
editor 为 1,632 项，statements 23,516/31,429、branches 18,210/27,360，两次统计精确一致。
本次未跑 full coverage；普通完整 `pnpm check` 的 6,327 项与上述 fast 是不同口径，不冒充 full 或浏览器 E2E。

## EDITOR-SAVE-CONFLICT-1 增量基线（2026-09-07，三席终审通过）

候选 `6780d220` 已三席 accept、用户验收通过并收口，Codex 核定无实现漂移。本轮文档收口未改基线或重跑覆盖率。

[作者保存冲突卡](../ops/archive/tasks/done/EDITOR-SAVE-CONFLICT-1-stale-author-snapshot.md)新增 25 项 fast 回归与 1 项 PAL 文件清单对账。
完整普通 check 为 544 文件/6,353 项；ratchet 验证 8 项指标提升、零回退后更新到 **611 个生产文件 / 5,867 项 fast**，
随后单次严格 fast 精确通过。没有改配置、排除、超时或 ignore；新增测试 helper 位于既有排除的 `__tests__`，不伪装生产源码。

| 本候选 Fast 全仓 | 精确计数 | 展示值 |
|---|---:|---:|
| Lines | 47,469 / 68,669 | 69.13% |
| Statements | 52,516 / 78,501 | 66.90% |
| Functions | 9,970 / 14,441 | 69.04% |
| Branches | 37,554 / 61,760 | 60.81% |

editor 为 214 文件/1,657 项，statements 23,672/31,519、branches 18,297/27,409；其余包精确计数不变。
新增 `author-disk-baseline.ts` 行 89/93（95.69%）、语句 95/99（95.95%）、函数 24/25（96%）、分支 55/61（90.16%）。
它包含文件源/状态/签名验证链，不冒称纯核或整个保存系统已 100%；后续仍按缺口补测。
原生浏览器结果与 PAL 真磁盘成本另见任务卡，不计入 fast 百分比，本次未跑 full coverage。

## 长期目标（本轮不硬卡）

| 范围 | Lines / Statements / Functions | Branches |
|---|---:|---:|
| 全仓最终目标 | ≥ 90% | ≥ 85% |
| 存档、迁移、脚本、战斗核心、编辑器命令 | ≥ 95% | ≥ 90% |
| 经逐项认定的纯公式、解析器、校验器、reducer | 尽量 100% | 100% |

这些是增量建设目标，不是拿理想数字覆盖首次真实基线。先修审计已确认的缺陷并补真实业务断言，再按模块提高；
纯核的 100% 也必须先确认没有不可达的防御分支，不能靠 `v8 ignore` 或删分支制造绿色。

## 维护命令

```sh
# 日常：收集全部生产源码并检查 fast 基线
pnpm coverage:fast

# 发布前：加入 PAL 真数据 Vitest 测试，仍不得低于 fast 基线
pnpm coverage:full

# 仅在新增源码或真实覆盖提升后，由维护者确认并提高基线
pnpm coverage:ratchet

# 只验证覆盖率工具自身的精确分数比较与聚合逻辑
pnpm test:coverage-tools
```

不要手改基线计数。需要变更生产源码口径、fast/full 测试归类或 provider 版本时，先改配置并审阅范围 diff，
跑 ratchet 后提交配置与基线同一变更。
