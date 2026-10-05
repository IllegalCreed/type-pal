# CODE-QUALITY-3m - game battle core 合同逐文件治理

Status: review
Phase: phase1 game
Capability: ops / code-quality
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: N/A（纯公式/状态/坐标 helper）
Contributor: Codex
Branch: codex/code-quality-governance
Base: `07e2c1c39`

## 目标与范围

逐文件核验 battle core 的公式、magic damage、status tick、action queue、battle positions 和 seeded RNG，保持 `fight.c`/`battle.c` 公式、SHORT/WORD 语义、状态寿命、排序和坐标边界；只修有一手证据与可证伪反例的问题。

- 白名单生产文件：`packages/game/src/core/battle/{formulas,magic-damage,status,turn-queue,battle-positions}.ts`、`packages/game/src/core/rng.ts`
- 对应纯函数/战斗合同测试与真实 battle caller 只读核对。
- 范围外：battle-system/progression/actions、save/schema、runtime 玩法取舍、E2E、覆盖率 runner。

## 前提真值门

- 一句话前提：battle core helper 的数值、状态、队列和坐标输出在合法 typed 输入下保持已核实的第一阶段真值，坏输入不形成静默状态污染。
- 真值来源：`reference/sdlpal/fight.c`、`battle.c`、`global.h`、`util.c` 对应行；各文件注释；battle-system/magic caller；既有公式/边界测试。
- 当前 before -> 目标 after：`公式/状态 helper 的 caller 与 primary-source 证据分散 -> 六文件逐一登记公式、输入域、边界、反例和保留理由`。
- 最强替代解释 / 推翻观察：某些 JS 近似（如 dualMove 缺 dex2 fallback、mulberry32 与 sdlpal LCG 不同）可能是明确产品/测试合同；若 primary source 或真实 caller 证明实际语义漂移才修，不用记忆替换现行实现。
- 是否主动偏离已核真值：N/A（本批不主动改公式/战斗行为）。

## 上下文锚点

- `AGENTS.md`：高风险公式/第一阶段机制需一手证据、可证伪反例、单一 owner、硬零诊断。
- `CLAUDE.md`：sdlpal/原始数据真值边界；不要把 coverage 或大 census 当公式证据。
- `docs/ops/audits/code-quality-file-ledger.md`：Q3l 后 167 个已闭合、5 个 review、2,792 个尚未核验；本卡不能把 game 全包绿灯当逐文件验收。
- 不得重新引入：JS number 取代 SHORT/WORD 时的溢出/符号漂移、status 永久化、dualMove 顺序漂移、battle layout 重复来源、seed state 非确定性。

## 验证

- 每个文件完整读取生产代码、primary source、真实 caller 和测试；未知公式争议保留 review/blocked，不擅自修行为。
- 若修代码或改变合同：定向/相邻 battle tests、game typecheck、全仓 `pnpm check`、support-mode ratchet、protected fast、Biome 零诊断；纯审计也需记录实际验证范围。

## 当前模式推进记录

- Codex 前提核验：verified（六文件纯 helper；公式 primary source 已列，暂不做产品取舍）。
- build 准入：Codex build allowed；只有直接证据窄修可改实现。
- 贡献者交付/自验：Codex；定向 7 files/128 tests、game 全包 3400、typecheck 通过；六个生产文件审计保留，未改实现。
- Codex 独立验收：accept（formula/magic/status/queue/positions/RNG 的 primary source、真实 caller、反例合同逐段核对；全仓 `pnpm check`、official ratchet、protected fast、Biome 零诊断通过）。
- 用户产品裁决/体验验收：N/A（不主动改变数值/战斗行为）。
- done 准入：blocked，待提交推送和独立工作树核对；本卡只关闭六个 core helper，不代表 battle core/system/menu/save 或全仓治理完成。

## 交接日志

- 2026-10-05 Codex：Q3l 已归档；开始 battle core 合同窄批，先核公式/SHORT/WORD/状态/队列/坐标/RNG，未证实前不改实现。
- 2026-10-05 Codex：六个 battle core helper 逐文件核验；SHORT/WORD、formula、status、dualMove、layout、seed state 合同均有 primary source/caller/tests，未发现直接缺陷。定向 128、game 全包 3400、全仓 check/ratchet/protected/lint 全通过。Next: 提交后归档，继续 battle core/system/menu/scene 未核文件。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-3m game battle core 合同逐文件治理
任务卡：docs/ops/tasks/CODE-QUALITY-3m-game-battle-core-contracts.md
当前状态：build；只能在六个白名单生产文件及对应测试内工作。
你的角色：Codex Coding Owner / 独立验收。
先读：AGENTS.md、CLAUDE.md、本卡、code-quality-file-ledger.md、fight.c/battle.c/global.h/util.c 锚点、六个生产文件和真实 callers/tests。
请你做：逐文件核公式/SHORT/WORD/状态寿命/队列/坐标/RNG 输入域；只有 primary-source + caller + 反例直接证明问题才修。
不要做：不得修改 battle-system/actions/save/schema/E2E/coverage runner，不得凭记忆改公式或把 sdlpal LCG 偏好强行替换现行 RNG。
输出要求：每文件 verified/review/blocked；定向、game typecheck、pnpm check、support ratchet、protected fast、lint 全通过后更新账本、提交推送并标 done。
```
