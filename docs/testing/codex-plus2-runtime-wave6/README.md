# Codex 自有覆盖率第七批 · Reforge 商店、运动与运行时缓存

本批仅新增四份 Reforge 测试和四针隔离反控；产品、旧测试、资产、
testSelection/exclude 配置零改。入口均有当前运行时消费者：商店 UI、
`WorldMotionRuntime`、`WavedBgCache` 和 `ScriptChunkStore`。断言为输入/状态、
世界提交轨迹、分片真实读取与画布调用合同，**不宣称浏览器像素或剧情视觉验收**。

| 新测试 | 项数 | 主要业务合同 |
|---|---:|---|
| `menu/shop-box.residual.test.ts` | 4 | 三列卖出导航、真实结算与售罄列表收敛；买入八行窗口、装备计入持有数、卖出与确认框绘制派发 |
| `world-motion-runtime.residual.test.ts` | 5 | 自动步进/追逐 authority 换代、脚本源独立、侧避锁休眠保留、真实阻挡原因与提交位置、4096 条有界诊断 |
| `screen-fx.residual.test.ts` | 2 | 波动背景的行卷动、相位与源身份缓存、零位移和 canvas 失败不回填缓存 |
| `script-chunk-store.residual.test.ts` | 2 | 经正式脚本库检查的双分片租约/LRU 淘汰、迟到读取在 abort 后零缓存 |

`node docs/testing/codex-plus2-runtime-wave6/mutants.mjs`：
`wave-cache-hit`、`sell-cursor-clamp`、`active-side-stick`、
`leased-chunk-eviction` 四针均有同条件绿对照；虚拟单点替换后，
精确钉名的新增业务测试自身 `AssertionError` 红 exit1，源 SHA-256 不变。
新测试与相邻旧测九文件 **39/39**，Reforge typecheck 和六个代码文件
Biome 均零诊断。

统一串行 `pnpm check` exit0：全仓 **10,051** 项、文档 PASS、严格 lint
扫描 2,351 文件零 error/warning/info；`pnpm coverage:ratchet` exit0，
随后以 `TYPE_PAL_COVERAGE_BASE_REF=9dbb9fd1 pnpm coverage:fast` 做
受保护的单次严格复核 exit0。两次 fast 均为 **9,590** 项/730 源码文件，
全仓分支 **47,038/63,323=74.28%**。相对本批前 46,948/63,323，
本批 Codex 自有测试净增 **90** 个覆盖臂、分母不变；Reforge 包从
7,969/11,458 升至 8,059/11,458。

用户本轮从 46,201/63,315=72.9701% 起算的绝对 +2pp 目标，
按当前分母需 47,474/63,323，尚差 **436** 个覆盖臂。Codex 自有批次
累计 +665；GLM 已接收 +157、Cursor 已接收 +15 分栏记录；
GLM UI 返工候选未计入，母任务保持 build。
