# Codex 自有覆盖率第六批 · Reforge 战斗画面与菜单绘制

本批仅新增三个 Reforge 测试文件和四针隔离负控；产品、旧测试、资产、
testSelection/exclude 配置均零改。直接调用现行 `battle-ui.ts`、
`present-battle.ts` 和 `menu-box.ts`，以绘制调用轨迹、布局锚点、RGBA
写入和状态恢复作业务断言；下层文字/菜单原语在对应测试内隔离。
**这些测试不等于真实浏览器像素或剧情演出验收。**

| 新测试 | 项数 | 实际合同 |
|---|---:|---|
| `battle-ui.residual.test.ts` | 5 | 一/三人信息框与坏状态、菜单禁用色和数量、技能/物品网格、MP/物品详情和箭头、四主图标灰/红重染及位图身份缓存 |
| `present-battle.residual.test.ts` | 4 | 背景/首帧回落/底锚、透明度绘制后恢复、溶解无 pattern 退化及可用 pattern 的相位批次 |
| `menu-box.residual.test.ts` | 3 | 数字左右对齐/缺字形、卷轴自然宽和右角外探、确认框位置与互斥高亮 |

`node docs/testing/codex-plus2-runtime-wave5/mutants.mjs` 的
`disabled-icon-red`、`fighter-bottom-anchor`、`dissolve-wave-count`、
`scroll-right-width` 四针各有同条件绿对照；虚拟单点替换使精确钉名的
新增用例以自身 `AssertionError` 业务红退出，产品源 SHA-256 前后不变。
定向与相邻四文件 **14/14**，Reforge typecheck 和五个代码文件 Biome 零诊断。

串行 `pnpm check` exit0：全仓 **10,038** 项、文档 PASS、严格 lint
扫描 2,345 文件零 error/warning/info。官方 `pnpm coverage:ratchet`
exit0 后，以 `TYPE_PAL_COVERAGE_BASE_REF=3ce5f48f pnpm coverage:fast`
做受保护的单次严格复核，exit0；两份 fast 均为 **9,577** 项/730 源码
文件、全仓 **46,948/63,323=74.14%**。相对本批前
46,903/63,323，Codex 自有测试净增 **45** 个已覆盖分支，分母不变；
Reforge 包由 7,924/11,458 升至 7,969/11,458。

用户本轮 +2pp 从 46,201/63,315=72.9701% 起算，当前分母下目标
47,474/63,323，仍差 **526** 个已覆盖分支。GLM UI 返工候选不计入；
Cursor 已接收的 +15 分支与 Codex 累计 +575 分支分栏，不互相冒称。
