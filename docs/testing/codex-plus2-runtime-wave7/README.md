# Codex 自有覆盖率第八批 · Reforge 正式总壳与画面资源

本批仅新增两份 Reforge 测试与四针隔离反控，并给既有测试专用
`runtime-shell/scenarios.ts` 增加可选开局 HP/MP 参数（默认行为不变）。
产品、资产、旧测试、testSelection/exclude 配置均零改。

| 新测试 | 项数 | 当前业务证据 |
|---|---:|---|
| `main.effect-flows.residual.test.ts` | 11 | 正式 blank 内容经当前 loader/资源闭包进入 `bootGame`；实体显隐/图层/屏波、资源与半钱、编外跟随、持久形象、阵亡复活、跨场景批量状态、开发直达场景/落点及登记物品注入。每例核实际世界/场景输出与交付输入深快照 |
| `assets.presentation.residual.test.ts` | 3 | 索引背景的调色板 nibble 上下限、两种特效 AssetId 经真实 gzip 字节和 SHA 读取、缺地图源的路径/指引失败合同 |

测试里的 canvas context 仅用于纯索引着色输出，**不宣称浏览器像素、音轨或剧情演出验收**；
`?scene/pos` 与 `?give` 是已有 DEV 直达入口，不冒充从新游戏正常到达的 Q1 路线。
`node docs/testing/codex-plus2-runtime-wave7/mutants.mjs` 的
`party-mp-clamp`、`appearance-write-drop`、`preview-spawn-skip-drop`、
`background-nibble-underflow` 四针各有绿对照；虚拟单点替换使钉名新增用例自身
`AssertionError` 业务红，产品源 SHA-256 前后不变。新测试及相邻五文件 **39/39**，
Reforge typecheck 与五个改动代码文件 Biome 零诊断。

整批串行 `pnpm check` exit0：全仓 **10,065** 项、docs PASS、严格 lint
扫描 2,355 文件零 error/warning/info。官方 `pnpm coverage:ratchet` exit0 后，
以 `TYPE_PAL_COVERAGE_BASE_REF=1dcbc316 pnpm coverage:fast` 做受保护的单次
严格复核，exit0。两次 fast 均为 **9,604** 项/730 源码文件，分支
**47,109/63,323=74.39%**。相对本批前 47,038/63,323，Codex 自有测试
净增 **71** 个覆盖臂、分母不变；Reforge 包由 8,059/11,458 升至
8,130/11,458。

用户本轮从 46,201/63,315=72.9701% 起算的绝对 +2pp 目标，当前分母下
需 47,474/63,323，尚差 **365** 个覆盖臂。Codex 自有批次累计 +736；
GLM 已接收 +157、Cursor 已接收 +15 分栏；GLM UI 返工候选未计，母卡仍 build。
