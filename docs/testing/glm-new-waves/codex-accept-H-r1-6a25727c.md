# TEST-GLM-NEW-H-1 · Codex r1 返工候选验收

日期：2026-09-29。分支最终 HEAD
`6a25727ccc0806640f444c01e271207094207ee8`；测试/证据返工提交
`6e9fe6e01eb69bb243712c0720941e88dc3c8bfa`，HEAD 仅再钉回执 SHA。
结论：**代码/证据候选 accept；尚未集成 main，任务保持 review，官方统一
质量/覆盖门未运行，不标 done**。

- 相对首轮候选仅改 Wave H 专属 harness、H02 新测与 wave-H JSON/反控脚本。
  产品源码、旧测试、共享配置/基线未改，候选工作树干净、diff check 干净。
- Codex 复跑完整 lint：2644 文件，0 error/0 warning/0 info；game
  typecheck 零诊断、docs check 零 issue；新增定向 12 文件、48/48 通过，
  battle-opcodes/actions 两个关键相邻旧测 247/247 通过。GLM 回执另记录
  相邻 25 文件 789/789，统一全仓测试仍待 main 集成门。
- H02 的 `recordingRng(..., trace)` 与 `runScript` 回调在事件发生时写同一
  数组，新测精确断言 `rng:range(0,3)` → `script:scriptOnUse@9` →
  `rng:next`，不再事后拼接两份日志；与一手 `fight.c:4719–4775` 顺序相符。
- `counter-run.mjs` 已改为 `packages/game/node_modules/.glm-counter-H/<id>/`
  隔离副本，经 Vite resolveId 注入；正式生产源只读。Codex 审核 runner
  与四枚回执：基线 exit0、针 exit1、预期 red/green 集合、实际执行数、
  无 skip/todo/timeout、产品源前后 SHA256 一致、候选 Git 干净。
  它不再依赖瞬态修改产品再 checkout。反控 runner 本次未在原候选上重跑，
  以免重写其已提交证据 JSON；统一集成前仍可在隔离副本复建。
- `receipt.json` 固定首轮候选与返工工作提交的完整 SHA；最终 HEAD 由本
  审核回执固定，避免提交文件自引用。baseDamage≤0 自动防御 RNG 序、
  physicalResistance=0 等疑点仍是未证登记，不随本测试候选宣布产品结论。

后续：与其它已接收 wave 选择性集成，统一串行 `pnpm check` → 官方 ratchet →
受保护 fast。正式覆盖收益仅按 main 并集实测；未过这些门前不标 done/
不清理工作树。
