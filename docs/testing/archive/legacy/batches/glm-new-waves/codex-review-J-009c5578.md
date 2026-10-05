# TEST-GLM-NEW-J-1 · Codex 独立审核 r1

日期：2026-09-29。候选 `codex/glm-new-j-r1` HEAD
`009c557851e43759b20e10d4d1284bdf1aa21247`，相对派发基点 `2948810f`。
结论：**rework，尚未合 main，也未运行官方 ratchet/受保护 fast**。

## 已独立验证

- 差异仅 12 个同目录新测试及 `docs/testing/archive/legacy/batches/glm-new-waves/wave-J/README.md`，
  产品源、旧测、共享配置/基线均未改变；候选工作树干净。
- 完整 `pnpm lint`：2639 文件，**0 error / 0 warning / 0 info**；
  `@type-pal/migrate typecheck` 零诊断；新测定向 12 文件、55/55 通过；
  `@type-pal/migrate test` 全包 130 文件、996/996 通过。
- 三枚反控的 JSON 文件 SHA256 与回执一致；各自恰一条 failed、其它 passed，
  文件为绝对路径且 fullName 精确归属本波新测。未见禁止的 `any`、`as never`、
  双强转、`@ts-ignore/@ts-expect-error`、跳过/独占测试或核心 mock。
- `node scripts/docs/check.mjs --json` 唯一问题为共享目录缺 `wave-J` 导航链接；
  该共享索引属于 Codex 写入范围，不是 GLM 返工项。派发版 `verify-targets.mjs`
  错把已交付的新测试视为“路径已占用”，属 Codex 派发脚本缺陷，已在 main
  `10a5d601` 修为检查派发冻结提交时的占用；不归责 GLM。

## 两项必须返工

1. `packages/migrate/src/pal-migration.glm-next-wave.test.ts:110–123` 对
   `migrationScenes` 写了三个新测试，其中正文缺失时期待 `[undefined]`。
   `pal-migration.ts:703–707` 自称仅供审计/测试，仓内除本新测外无调用者；
   该 `[undefined]` 来自源码中的 `as unknown as SceneDef`，并非有效 `SceneDef[]`
   合同。按卡面“现行 caller/合法 fixture”停止线，删除这三个无消费者测试、
   将其登记 `unreachable/未证`；保留同文件有生产调用者的 `palSoundAssetForSources`
   测试。若认为存在真实消费方，先提供直接调用锚和缺正文的正式政策证据，
   不把现状硬钉为正确行为。
2. `packages/migrate/src/pal-derived-content.glm-next-wave.test.ts:41–101` 的标题与
   Wave J 回执宣称“13 条毒全表逐条深等”，实际是 13 个 id/颜色与三条代表毒的
   业务字段深等；回执又明确说未重核 `data/raw`。毒数值/相克属一阶段机制真值，
   不能仅复制迁移实现注释作 oracle。请用
   `docs/phase1/game-mechanics.md:1180–1244` 所列原始字节/`reference/sdlpal`
   锚点逐项核实保留的数值/关系断言；若只做代表三条，修正测试 title/回执为
   “代表值 + 全表 id/颜色/结构关系”，不要声称全表所有业务字段深等。
   未能一手核的断言移出、登记未证，不为涨覆盖率保留来源不明的 golden。

返工回执还须写本候选和新候选的**完整 SHA**，更新受影响的 Vitest
`file/fullName/status` 与反控计数；只改 Wave J 原白名单。完成后重新运行新测、
migrate typecheck、完整 lint 零诊断、docs/diff，并推送固定 SHA。
Codex 负责共享导航与修过的冻结校验器，不要求 GLM 越界编辑。
