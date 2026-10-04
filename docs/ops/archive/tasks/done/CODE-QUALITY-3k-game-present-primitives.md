# CODE-QUALITY-3k - game present 基础 primitive 逐文件治理

Status: done
Phase: phase1 game
Capability: ops / code-quality
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: dev-functional（仅 framebuffer/DOM-free primitive；剧情视觉集中 E2E）
Contributor: Codex
Branch: codex/code-quality-governance
Base: `c1bce8b42`

## 目标与范围

逐文件核验 game present 的基础 framebuffer、屏幕 shake/wave、dither fade、数字绘制和跟随者位置 helper；保留已核实的 sdlpal 公式、透明 mask、坐标和 UI 形态，只修有直接 caller/反例证据的问题。

- 白名单生产文件：`packages/game/src/present/{framebuffer,screen-shake,screen-wave,dither-fade,draw-number,follower-pos}.ts`
- 对应测试：各自 `.test.ts`、边界/GLM/Grok 合同；直接 caller 只读核对。
- 范围外：battle present、dialog/menu UI、剧情 E2E、save/schema、原版坐标重判和 coverage runner。

## 前提真值门

- 一句话前提：这些纯渲染 helper 对合法 framebuffer/typed 输入保持已核实的原版索引、循环、相位、mask 和跟随者位置语义；非法边界不能静默破坏 buffer。
- 真值来源：各源码注释中的 `reference/sdlpal/video.c/scene.c/ui.c` 锚点；`packages/game/src/present/present.ts` caller；对应定向测试和 `CLAUDE.md` 第一阶段忠实还原规则。
- 当前 before -> 目标 after：`present primitive 的 caller/边界证据分散 -> 六个文件逐一记录职责、输入域、反例和验证结论`。
- 最强替代解释 / 推翻观察：现有 clamp/回退可能是原版合法宽容或 fade-only 补帧语义；若 raw/primary source、caller 或反例证明依赖则保留；若错尺寸 buffer、NaN/越界参数能污染输出，或负控删 guard 仍全绿，则前提被推翻并修复。
- 是否主动偏离已核真值：N/A（不改用户可见形态和原版公式）。

## 上下文锚点

- `AGENTS.md`：逐文件 ledger、硬零诊断、少而精测试、原版/第一阶段真值门。
- `CLAUDE.md`：第一阶段原版行为边界、framebuffer/indexed rendering、透明 mask 与 present 时序。
- `docs/ops/audits/code-quality-file-ledger.md`：当前 146 个已闭合、5 个 review、2,813 个尚未核验；本卡不得用 game 全包绿灯代替文件证据。
- 不得重新引入：`indices===0` 代替 opaque mask、wave/shake 相位跨帧漂移、dither 低位算法改写、follower 坐标/朝向臆改。

## 验证

- 逐文件完整读取生产代码、真实 caller 和既有 tests；未知项保留 review/blocked。
- 若修代码：定向/相邻 present tests、game typecheck、全仓 `pnpm check`、support-mode ratchet、protected fast、Biome 零诊断；不以截图替代公式/typed 合同。

## 当前模式推进记录

- Codex 前提核验：verified（纯 helper 小域；无 save/schema；坐标只按源码和现有合同核对）。
- build 准入：Codex build allowed；只允许白名单窄修。
- 贡献者交付/自验：Codex；定向 13 files/77 tests、game typecheck、Biome 通过；修复 `screen-wave.ts` 负 progression 跨零关断缺陷。
- Codex 独立验收：accept（完整读取六个生产文件与 `present.ts` 真实 caller；真实 raw opcode 0x71 `[255,65532,0]` 与 `global.h:379 WORD` 直接证明；mutant 4 total/3 passed/1 failed，恢复 4/4；全仓 check、official ratchet、protected fast、Biome 零诊断通过）。
- 用户产品裁决/体验验收：N/A（不改 UI 形态；剧情视觉延后）。
- done 准入：Codex done allowed；提交 `03cc513df` 已推送，独立 diff/status 核对通过；本卡只关闭六个 primitive，不代表 present/battle/menu 或全仓治理完成。

## 交接日志

- 2026-10-05 Codex：Q3j 已归档；继续从 game present primitive 小域推进，不接 battle/menu/dialog/save。Next: 完成六文件逐文件证据与直接问题核验。
- 2026-10-05 Codex：六个 primitive 生产文件与真实 `present.ts` caller 逐段核验；发现 `screen-wave.ts` 在真实 `[255,65532,0]` 收尾时负波幅不关断，已按 C WORD 语义加 `<=0` guard；其余五文件保持公式/边界合同。定向 77、game typecheck/Biome 通过；未知的原版视觉坐标不靠静态合同关闭。Next: 完成全仓质量门并归档，继续 present/battle/menu 未核文件。

### 反控证据

- mutant command：临时恢复 `wScreenWave === 0` 旧条件，执行
  `NODE_DISABLE_COMPILE_CACHE=1 pnpm --filter @type-pal/game exec vitest run src/present/screen-wave.glm-phase1-leaves.test.ts --reporter=default --reporter=json --outputFile.json=/tmp/type-pal-q3k-counter/screen-wave-mutant.json`；raw `/tmp/type-pal-q3k-counter/screen-wave-mutant.raw`，exit 1，JSON `4 total / 3 passed / 1 failed / 0 pending`，唯一业务 assertion 是真实负 progression 跨零应关断。
- restored command 输出 `/tmp/type-pal-q3k-counter/screen-wave-restored.json`，exit 0，`4 / 4 / 0 / 0`；恢复后源码保留 `<=0` guard。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-3k game present 基础 primitive 逐文件治理
任务卡：docs/ops/tasks/CODE-QUALITY-3k-game-present-primitives.md
当前状态：build；只能在六个白名单生产文件及对应测试内工作。
你的角色：Codex Coding Owner / 独立验收。
先读：AGENTS.md、CLAUDE.md、本卡、code-quality-file-ledger.md、六个生产文件、真实 present caller 和测试。
请你做：逐文件核输入域/公式/边界/调用方；只有直接证据问题才修；不改原版坐标/公式或 UI 形态。
不要做：不得修改 battle/menu/dialog/save/schema/E2E/coverage runner，不能把视觉猜测当代码缺陷。
输出要求：每文件 verified/review/blocked；定向、game typecheck、pnpm check、support ratchet、protected fast、lint 全通过后更新账本、提交推送并标 done。
```
