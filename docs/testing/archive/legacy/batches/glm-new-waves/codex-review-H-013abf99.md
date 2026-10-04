# TEST-GLM-NEW-H-1 · Codex 独立审核 r1

日期：2026-09-29。候选 `codex/glm-new-h-r1` HEAD
`013abf99e647ecd027aeb05d6225ae5c9ee7c6c2`，相对派发基点 `2948810f`。
结论：**rework，未合 main，未运行官方 ratchet/受保护 fast**。

## 已独立验证

- 差异为 12 个同目录新测试、一个 Wave H typed harness 和三份 wave-H JSON 证据；
  未改产品源、旧测试、共享配置/基线或其它 wave，候选工作树干净，diff check 干净。
- `@type-pal/game typecheck` 零诊断；Codex 定向复跑 12 文件 **48/48 passed**；
  候选文档检查 0 issue。派发版 `verify-targets.mjs` 会把交付后存在的新测试
  误判路径占用，属于 Codex 脚本缺陷，已在 main `10a5d601` 修复，非 GLM 返工项。
- 一手抽查：`reference/sdlpal/fight.c:4719–4775` 确有法术自动防御先掷再跑
  scriptOnUse；`battle.c:1238–1293` 有 hidden-exp 等级 99 钳制与仅主升级时回满；
  `script.c:3267/3428` 确有 ClearDialog。合成 fixture 不冒称原始实测，
  baseDamage≤0 等可疑产品差异被登记未证而未私改产品。

## 必须返工

1. 完整 `pnpm lint` **失败：3 errors**，均为提交的
   `docs/testing/archive/legacy/batches/glm-new-waves/wave-H/{counter-controls,receipt,vitest}.json`
   格式诊断。局部 13 代码文件 Biome 0 不等于硬门 0/0/0；按原规则格式化证据，
   重跑完整 lint，不加 ignore/降规则。
2. `packages/game/src/core/battle/actions/magic.glm-next-wave.test.ts:66–104`
   的“RNG 预掷先于 scriptOnUse”测试并未记录真实交错顺序：`runScript` 写独立
   `log`，函数结束才构造 `rngCalls: [...rng.calls, ...log]`，因此无论脚本何时执行，
   它在这个数组中永远排在全部 RNG 之后。改为 RNG 与脚本回调写**同一实时事件轨迹**，
   再断言首掷早于脚本；保留孪生战斗结果正/反证。
3. `wave-H/counter-controls.json` 记载四枚反控**直接临时改
   `battle-opcodes.ts`、`anim-timeline.ts`、`battle-progression.ts`、
   `battle-settlement.ts` 生产源码并用 checkout 还原**。虽然候选最终 hash/工作树已干净，
   卡面仍明确产品只读、贡献者仅写新测/专属 fixture/证据。请改用隔离副本或 loader
   注入完成代表针，不在正式源码路径做瞬态变异；判据需核基线 exit0、针 exit1、
   唯一注入、预期失败集合、绝对 test file/fullName、实际执行数、无混错/skip/
   timeout/exit2、前后生产 hash 不变，并留可复跑证据。
4. `wave-H/receipt.json:144–147` 的 `head` 是“branch tip at push”文字，
   不是固定完整候选 SHA。写入 r1 与返工候选的完整 SHA，更新新鲜测试 JSON 和
   反控结果；未经实测不把“48/48”推为官方覆盖率收益。

仅修 Wave H 原白名单；视觉按卡不要求。返工后复跑定向及相邻、game typecheck、
完整 lint 0/0/0、docs/diff，推送新 SHA 交 Codex 再审。
