# 测试覆盖率基线与只升不降门禁

状态：**Vitest 4.1.7 + V8 fast/full 覆盖率已接入；fast 基线见
[`scripts/coverage/baseline.fast.json`](../../scripts/coverage/baseline.fast.json)。**

覆盖率回答“哪些生产代码被测试执行过”，不回答业务是否正确。存档故障、异步乱序、跨会话撤销、浏览器文件
系统、完整战斗与通关仍必须由集成测试和 Q1/Q2/编辑器 E2E 证明，不能用覆盖率百分比替代。

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

| 当前 Fast 全仓 | 精确计数 | 展示值 |
|---|---:|---:|
| Lines | 47,079 / 68,387 | 68.84% |
| Statements | 52,073 / 78,182 | 66.60% |
| Functions | 9,859 / 14,375 | 68.58% |
| Branches | 37,331 / 61,578 | 60.62% |

最初的格式清理曾使 migrate 行覆盖从 3,435/6,679 变为 3,433/6,677，ratchet 正确拒绝了这个微小下降；
补真实守卫回归后达到 3,436/6,677 才接受新基线，没有降低阈值、缩窄生产范围或使用 coverage ignore。
GitHub Actions 的 fast coverage 前置运行 `pnpm typecheck && pnpm lint`，完整 PAL 回归仍在本地完整检查中运行。

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
