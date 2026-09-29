# GLM A–J 测试 wave 并集集成回执（2026-09-29）

集成基点：`9863736420a48e9240ef85935e54d37cced6d9dd`（当时 main）。
隔离集成分支：`codex/glm-union-intake-r1`；A–E 与 F–J 六条已独立接收候选
依次合入，无文件冲突。各卡的代码接收结论见
[A–E](glm-large-wave/codex-accept-r3-4e200099.md)、
[F](glm-new-waves/codex-accept-F-r2-c5ecf694.md)、
[G](glm-new-waves/codex-accept-G-r2-fd1189a3.md)、
[H](glm-new-waves/codex-accept-H-r1-6a25727c.md)、
[I](glm-new-waves/codex-accept-I-r2-044d3fa4.md)、
[J](glm-new-waves/codex-accept-J-r2-acd67499.md)。

| 包 | 最终候选 HEAD |
|---|---|
| A–E | `4e200099257ed5167b640eb5abadd7129859dfee` |
| F | `c5ecf694ed4942a42ecd7e32f5f033e785d47b69` |
| G | `fd1189a314e96863f052439cd1d33b01f1e2951d` |
| H | `6a25727ccc0806640f444c01e271207094207ee8` |
| I | `044d3fa4c525521658c28b4a7a5365098c706d86` |
| J | `acd67499dc0d7a5e0b1de6fb7df2c7838b021a00` |

## 统一质量门

- 集成后 `pnpm check` **exit 0**；七包 typecheck/test、docs/coverage/quality/E2E
  工具测试和最终完整 lint 均通过。主要包测试数：pal-extract 357、game 2753、
  Reforge 1999、migrate 1008、editor 3653；最终 lint 2749 文件，
  **0 error / 0 warning / 0 info**。
- `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:ratchet` **exit 0**；
  随后同一受保护基准的**单次** `pnpm coverage:fast` **exit 0**，与新基线
  一致、零回退。fast 10,659 测试 / 730 生产文件；无产品源码、旧测试、
  include/exclude 或官方门规则改动。
- 新基线 `scripts/coverage/baseline.fast.json` SHA256
  `ea0fcdba42f41cf4be5b41c39b15a5c399e7ec0d944d454cdd5b68c07eff40c9`。
  A–E 与 F–J 的冻结校验器仍用原冻结提交的基线字节证派单时口径，
  不把这次合法 ratchet 误判成派单漂移；两套 60 源 digest 均重核通过。
- 首轮集成树缺 gitignored `data/raw/*.MKF`、`data/extracted` 与
  `projects/pal/assets/migrated`：pal-extract 曾因原始文件 ENOENT 红，editor
  `world-sprite-behavior.pal.test.ts` 曾因 035/044.rle 缺失红。Codex 只在
  **隔离集成树**为缺失路径建立指向主树的本地资源链接（无覆盖已有文件、
  均不入 Git）；先定向复跑这两条 editor 用例 2/2，再从头重跑完整
  `pnpm check` 获得上述单次全绿。环境首轮红不记为候选代码通过证据。

## 正式覆盖率：未达 85%

| 指标 | 原 main 基线 | 本次并集严格结果 | 净增 |
|---|---:|---:|---:|
| fast 测试 | 10,380 | 10,659 | +279 |
| 生产文件 | 730 | 730 | 0 |
| 分支命中/总数 | 49,081/63,398 | **49,529/63,398** | **+448 分支** |
| 分支覆盖率 | 77.42% | **78.12%** | **+0.71 个百分点** |

包级净增：migrate +80、Reforge +80、game +121、editor +167；其它包分支
命中不变。若分母仍为 63,398，85% 至少需 53,889 个命中分支，当前仍差
**4,360**。这是本次目标的明确未完成项，不把隔离分支百分比相加、不缩
生产范围或降低门禁来宣称达标；后续须重新核真实 caller/旧测与可达性后
另开大缺口工作包。

## 视觉与未证

- A–E/F 的隔离功能视觉截图 hash/代表画面由 Codex 复核；G 的试打/F5/
  停止恢复画面及 I 的菜单高亮画面亦已看图，但两 wave 的 browser console
  **未形成逐条零错误证明**：G 尚有 1 条 console error 未能归因，I 未采集
  历史 console。G/I 任务仍保留 `review` 的视觉补验项，不因代码集成自动
  标 done，也不冒充完整 E2E。
- H 回执登记的 baseDamage≤0 RNG 消耗序与 physicalResistance=0 偏离仍为
  未证产品疑点；本次仅集成测试，不自动授权产品修复。
