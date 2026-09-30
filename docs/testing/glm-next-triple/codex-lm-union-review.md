# Codex L/M 接收与 N 复核（2026-09-30）

当前结论：L r3、M r2、N r4 独立代码验收 accept，保持 review；
本轮统一门待完成。三波测试尚未合 main，均未 done 或清树。
下方“独立执行证据”为前一轮 L/M 并集历史结果，不冒称本轮 N r4 门禁。

- L：`69b56cc388bbd0c0b7632d7ed59154461dd0410b`，15 文件/67 例。
- M：`b59f1738f56f153a3c6d80b5f7dee1bcf27f7fae`，12 文件/31 例。
- N：`7bcd0fcdc2c600b2c1ba74ce41d4d4b789b3b826`，三处双强转、非法短色板、
  r1 定向 JSON 未刷新、RC1 三态 hash 不符；不纳入集成树。
- 接收分支 `codex/glm-lmn-acceptance-r1`，基于 main `6750b9a0`；
  L/M 共 98 个不同 fullName，无产品/旧测修改，62 冻结源核验通过。

详见 [L 卡](../../ops/tasks/TEST-GLM-WAVE-L-1-editor-map-scene.md)、
[M 卡](../../ops/tasks/TEST-GLM-WAVE-M-1-editor-data-assets.md)、
[N 卡](../../ops/tasks/TEST-GLM-WAVE-N-1-reforge-runtime-host.md)。

## 独立执行证据

M 原候选 Editor 493 文件/3684 例、typecheck、lint 2778 文件完整 0/0/0；
10 例反控 self-test、四枚原输入/注入副本反控重跑全部通过。
候选未被写入，独立反控结果保存于本机临时 `codex-m-counters-Q9azOE/evidence.json`。
L r3 packages 与已独立测过的 r2 完全相同，区间 diff 13 处尾空行已全部清零，
本次 lint 2780 文件完整 0/0/0；两波截图 hash/实际画面证据复核通过。
N 串行包测 259 文件/2052 例、typecheck/lint 0/0/0 和区间 diff 通过，
不替代卡面四项 counter。三候选 docs 各仅缺本波共享导航，由 Codex 接收时维护。

并集首次 check 因新工作树缺 gitignored 原版 MKF 失败，五例 ENOENT 与两组 skip；
保留 `check.log`。链接主树现有 raw/extracted/PAL 资源（不写资产、不改测试）后，
完整原命令重跑 `check-assets-ready.log` **exit0**：

| 包 | 文件 | 测试 |
|---|---:|---:|
| content | 123 | 1222 |
| shared | 16 | 128 |
| game | 243 | 2773 |
| pal-extract | 59 | 357 |
| reforge | 248 | 1999 |
| editor | 510 | 3786 |
| migrate | 77 | 450 |

合计 10715 例；root lint 2724 文件、完整 0 error/0 warning/0 info；
docs 803 Markdown/4212 本地链接/241 卡，零问题；区间 diff 零诊断。
jsdom navigation 提示原样保留，不冒称所有运行输出静默。

随后官方命令
`env -u NODE_COMPILE_CACHE TYPE_PAL_COVERAGE_BASE_REF=6750b9a0 pnpm coverage:ratchet --allow-scope-removal`
**exit1**。显式范围删除仅对应已批准并真正退休的生产/测试文件，不改变 include、
排除、超时或覆盖率阈值；实际失败仍是不得下降的比率门：

| migrate 指标 | 旧正式基线 | 实测 |
|---|---|---|
| statements | 5965/7722（77.25%） | 1879/2615（71.85%） |
| branches | 4876/6444（75.67%） | 1368/1814（75.41%） |
| lines | 5294/6730（78.66%） | 1643/2286（71.87%） |

官方 baseline 字节未改，protected fast 按串行门停止、未执行。
ratchet 实测 10303 例/716 生产源；候选全仓分支 46292/58773（78.76%），
**不是已生效的正式结算**，main 正式基线仍为 49584/63398（78.21%）。
Editor 实测 23063/28489 对旧 22848/28484，净 +215 命中/+5 分母；同时包括
派发后 main 作者工程检查等变动，不能把该差值全部归因 L/M，更不能把孤立 +133 相加。

完整日志在 `/tmp/type-pal-lm-acceptance.BarHmt/`，失败测量摘要在接收树
`coverage/fast/summary.json`。保留隔离分支和工作树，未降低规则或重写旧基线。
下一步需要单列剩余 migrate 覆盖率补测范围；不是让 L/M 越界返工。

## N 三审补记

候选 `eb6842111583b1d5e6111e357edf13f3f29791bd` 未纳入本接收树。
53/53 定向 JSON、四枚最终三态 hash/原始反控日志、62 源冻结通过；串行
Reforge 259 文件/2052 例、typecheck、根 lint 2780 文件完整 0/0/0、区间 diff
通过。docs 仅缺贡献者不得修改的共享导航项。
仍 counter：专属 Canvas fixture 用 getContext 函数断言掩盖 Partial 宿主；
mono 调制被宿主透明像素限制误记产品 unreachable；README 主体混有 r2 +96
和 13 文件口径。独立临时探针 2/2 通过证明普通对象宿主及合法不透明像素调制
可达，已撤销。最终 JSON 覆盖算术为 +94，未作 main 正式结算。
详见 N 卡三审及 r4 窄返工提示词。本补记不改变上面的历史并集门禁结果。

## N 四审接收

候选 `dbbdc9569e22249411dc680b3a50c5826edd0345` 代码 accept，53 例接入隔离树；
L/M/N 共 151 个新增用例，生产源/旧测未修改。原生上下文独立探针 1/1、
新鲜定向 53/53 与候选 file/fullName/status 完全相同；四枚三态 hash 核对通过。
Reforge 259 文件/2052 例、typecheck、根 lint 2780 文件完整 0/0/0、区间 diff
通过。隔离 +95/battle-ui +12 算术一致，不认作 main 正式收益。
Codex 补 N 导航并清理 README 当前/历史口径残留，保留历史测量数值。
接收树同步 main 已提交状态 `6c39f36a`，不消费主树未提交 E2E 工作。
