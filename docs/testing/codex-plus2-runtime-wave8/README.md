# Codex 自有覆盖率第九批 · Reforge 状态画面与战斗资源边界

本批只新增六份 Reforge 测试（25 项）、两份隔离负控工具和本回执；产品、资产、既有测试、
官方 `testSelection`/排除规则及覆盖率门槛均未改。当前源码消费者分别是菜单状态板、
大世界呈现、战斗会话的全体物攻与合击时间线、编辑器预览的 `ScriptRunner` 条件链，
以及战场背景资源准备。未给无现行消费者的测试专用导出冒充业务收益。

| 新测试文件 | 项数 | 合同焦点 |
|---|---:|---|
| `menu-box.status-residual.test.ts` | 8 | 等级阈值/装备/毒状态、队员切换、当前形象立绘异步缓存、毒名布局及级联色 |
| `world-scene-presentation.residual.test.ts` | 4 | 实体可见帧筛选、显式动画与循环、队长姿势、队友/编外跟随帧与深度 |
| `battle-anim.attack-all.residual.test.ts` | 3 | 全体物攻一挥双目标、伤害与音效一次派发、单目标正控 |
| `battle-anim.coop.residual.test.ts` | 2 | 我方 1–3 人槽位、非贡献者占位、聚拢/出招/敌受击/归位及无特效数字 |
| `script-runner.conditions.residual.test.ts` | 4 | 编辑器预览条件的比较/查询身份、缺省与短路 |
| `assets.battle-bg.residual.test.ts` | 4 | catalog 路径下的真实 PNG 字节、320×200 尺寸、索引→调色板与坏像素拒绝 |

战场背景测试生成带 IHDR/IDAT/IEND/CRC 的真实 RGBA PNG；Node 宿主替身从同一
IDAT 解压真实像素，再交给生产加载器。它验证资源/Canvas 交接合同，**不等于浏览器视觉验收**。
其余画面测试核绘制命令和帧输入，未声称像素比对、音轨、剧情或 E2E 完成。

`node docs/testing/codex-plus2-runtime-wave8/mutants.mjs` 对六个现行源码点逐一做
虚拟单点反控，目标包括背景尺寸门、不可解毒显示、队长脚本姿势、全体物攻第二目标、
合击非贡献者占槽和物品拥有查询串源。每针绿对照、红例均只执行精确钉名新增用例；
红例必须是该用例的 `AssertionError`，拒绝超时/其它异常，并核生产源码 SHA-256 不变。

新测试加相邻 12 文件 **115/115**；Reforge typecheck 与本批八个改动代码文件
Biome **零诊断**。完整仓库 `pnpm check` exit0：**10,129** 项、docs PASS、
严格 lint 检查 **2,377** 文件且 error/warning/info 均为 0。随后官方
`pnpm coverage:ratchet` exit0，再以
`TYPE_PAL_COVERAGE_BASE_REF=464758a6 pnpm coverage:fast` 对同一冻结候选执行
受保护单次严格复核，exit0。两次 fast 均为 **9,668** 项/730 生产文件，
全仓分支 **47,425/63,323=74.89%**。相对上一主线 **47,325/63,323**，
本批 Codex 自有测试净增 **100** 个覆盖臂、分母不变；Reforge 包从
8,130/11,458 到 8,230/11,458。

用户本轮从 46,201/63,315=72.9701% 起算的绝对 +2pp 阈值，在当前分母下
为 **47,474/63,323**，尚差 **49** 个覆盖臂；母卡继续 build。本批既不宣称
浏览器画面通过，也不将 GLM/Cursor 的已接收贡献算作 Codex 自有增量。
