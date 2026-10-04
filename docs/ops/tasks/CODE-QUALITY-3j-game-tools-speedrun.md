# CODE-QUALITY-3j - game tools 与速通纯函数逐文件治理

Status: review
Phase: phase1 game
Capability: ops / code-quality
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: dev-functional（仅工具 DOM 状态）
Contributor: Codex
Branch: codex/code-quality-governance
Base: `fe189dc4d`

## 目标与范围

逐文件核验 game 工具小域的显示缩放、FPS 诊断、toast/countdown DOM、地图名回退和 speedrun 时间格式/节点配置，保持现有工具形态与速通数据，不进入 save、core、E2E 或玩法语义。

- 白名单生产文件：`tools/{display-scale,fps-overlay,toast,map-names}.ts`、`tools/speedrun/{time-format,countdown,checkpoints}.ts`
- 对应测试：既有纯函数/DOM/边界/GLM leaves 合同；`checkpoints.ts` 只读审计，不修改坐标或节点数据。

## 前提真值门

- 一句话前提：工具输入的非法数值不能形成 NaN CSS/计时输出；已核实的速通节点、地图名和工具 DOM 形态保持不变。
- 真值来源：各白名单文件及对应测试；`CLAUDE.md` 第一阶段工具/原版真值规则；`tools/speedrun/checkpoints.ts:92-109` 的 PalTimer 坐标注释与 BANANA 配置。
- 当前 before -> 目标 after：`工具边界和速通数据分散 -> 每个文件有 caller、合法输入、坏输入和证据结论`。
- 最强替代解释 / 推翻观察：UI 只会产生有限 slider/timer 输入，速通配置由源码固定；若当前 caller 不能产生坏值且测试钉住保留语义，则不改；若 NaN/Infinity 进入 CSS/格式化输出或配置与一手数据冲突，则停线并单独升级。
- 是否主动偏离已核真值：N/A（不改工具形态、节点坐标或玩法）。

## 上下文锚点

- `AGENTS.md`：逐文件 ledger、硬零诊断、少而精测试、用户可见 UI 仍需保持形态。
- `docs/ops/audits/code-quality-file-ledger.md`：Q3i 后 119 个已闭合，2,840 个尚未逐文件核验；本卡不能用 game 全包绿灯代替文件证据。
- `CLAUDE.md`：第一阶段工具应服务诊断，不改原版玩法；checkpoint 坐标若不确定必须停线，不凭近似修正。
- 不得重新引入：显示缩放 NaN、FPS 跨启停脏帧、toast 堆叠容器误删、速通节点坐标臆改。

## 验证

- 逐文件读取生产代码和对应测试；未知项保留 review，不为了覆盖率堆断言。
- 若修代码：定向工具测试、game typecheck、全仓 `pnpm check`、support-mode ratchet、protected fast、Biome 零诊断；DOM 只做功能性最小验证。

## 当前模式推进记录

- Codex 前提核验：verified（小域、无 save/schema；checkpoint 只读）。
- build 准入：Codex build allowed；只允许白名单窄修。
- 贡献者交付/自验：Codex；定向 12 files/47 tests、game 全包 298/3399、typecheck 通过。
- Codex 独立验收：accept（七个生产文件逐个重读；display-scale NaN guard 负控 6 tests=5 pass/1 fail，恢复后 6/6；速通 checkpoints 坐标只读核验并保留实跑未知；全仓 `pnpm check`、support ratchet、protected fast、Biome 零诊断通过）。
- 用户产品裁决/体验验收：N/A（不改形态/节点）。
- done 准入：blocked，待提交推送后核对工作树、账本计数和任务索引；本卡只关闭七个文件，不代表 game 或全仓治理完成。

## 交接日志

- 2026-10-05 Codex：Q3i 已归档；本卡从 game tools 小域继续，不接 core/save/玩法。Next: 完成七个白名单文件的逐文件证据与最小窄修。
- 2026-10-05 Codex：七个生产文件逐个核验；仅 `display-scale.ts` NaN 输入有直接证据并修复，删除 guard 的隔离 mutant 失败（5/6），恢复后 6/6；FPS/toast/map-names/time-format/countdown 合同保留；checkpoints 仅核配置与 caller，坐标仍待真实运行证据。定向 47、game 全包 3399、全仓 check/ratchet/protected/lint 全通过。Next: 提交后归档，继续 game core/present 未核文件。

### 反控证据

- mutant command：在隔离工作树临时移除 `clampPct` 的 `Number.isNaN` guard，执行
  `NODE_DISABLE_COMPILE_CACHE=1 pnpm --filter @type-pal/game exec vitest run src/tools/display-scale.glm-phase1-leaves.test.ts --reporter=default --reporter=json --outputFile.json=/tmp/type-pal-q3h-counter.bMPKQT/q3j-mutant.json`；raw `/tmp/type-pal-q3h-counter.bMPKQT/q3j-mutant.raw`，exit 1，JSON `6 total / 5 passed / 1 failed / 0 pending`，唯一业务 assertion 为 NaN 应回 100%。
- restored command 同 runner/output `/tmp/type-pal-q3h-counter.bMPKQT/q3j-restored.json`，exit 0，`6 / 6 / 0 / 0`；源文件恢复 hash `d4e8c6b76cc2fdad64eea63a0124be1c955f04c074413022f246f0ba415c6cc8`，测试 hash `0c249bc261f9cc53aeae444a24f5cde5d94d543639b5ee3c205c391ceffd051b`。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-3j game tools 与速通纯函数逐文件治理
任务卡：docs/ops/tasks/CODE-QUALITY-3j-game-tools-speedrun.md
当前状态：build；只能在七个白名单生产文件及对应测试内工作。
你的角色：Codex Coding Owner / 独立验收。
先读：AGENTS.md、CLAUDE.md、本卡、code-quality-file-ledger.md、七个生产文件及其测试。
请你做：逐文件核 caller/输入域/失败语义；若直接证据证明 NaN CSS 或其它边界缺陷才修；checkpoints 只读核对，不改坐标。
不要做：不得修改 core/save/schema/E2E/coverage runner、速通节点坐标或产品 UI 形态。
输出要求：每文件 verified/review/blocked；定向、game typecheck、pnpm check、support ratchet、protected fast、lint 全通过后更新账本、提交推送并标 done。
```
