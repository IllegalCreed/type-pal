# TEST-GLM-NEW-I-1 · Codex 独立审核 r1

日期：2026-09-29。候选 `codex/glm-new-i-r1` HEAD
`2534b72c49366370e56841c5f2422515f83a7c5c`，相对派发基点 `2948810f`。
结论：**rework，未合 main，未运行官方 ratchet/受保护 fast**。

## 已独立验证

- 产品源、旧测试、依赖/锁和官方基线未改；新测试目标均属 Wave I 冻结清单。
  候选工作树干净、`git diff --check` 干净。
- `@type-pal/game typecheck` 零诊断；Codex 复跑 `vitest run glm-next-wave
  --no-file-parallelism`：**9 文件、40/40 通过**；文档检查在候选分支 0 issue。
- 两张菜单截图的 SHA256 与回执一致；Codex 实际看图确认高亮从“新的故事”移到
  “旧的回忆”。此证据只及开场菜单，不证明 dev panel 或完整剧情；浏览器 console
  历史未采集，仍是未证项，不得表述为 console 归零。
- 新测试没有显式 `any`、`as never`、双强转、`@ts-ignore/@ts-expect-error`
  或 mock 被测核心。候选基于旧版派发校验器，它会将新增测试误判路径占用；
  Codex 已在 main `10a5d601` 修校验器，不归责 GLM。

## 必须返工

1. 完整 `pnpm lint` **失败：4 errors**，均为提交的四份
   `docs/testing/archive/legacy/batches/glm-new-waves/wave-I/evidence/*.json` 格式诊断。
   作者只报新增 TS 的 Biome 0，不等于全仓零诊断。按原规则格式化证据，
   重跑完整 `pnpm lint` 并回报 0/0/0；不新增 ignore/降规则。
2. `wave-I/README.md:6–7/31/86` 写“8 新测试文件/4 existing-proof”，
   实际为 **9 个同目录新测试文件、3 个 existing-proof 源**；JSON 回执也证 9 文件/40 项。
   修正逐组与总览计数，并把完整候选 SHA 写进回执，不用“见提交”替代。
3. 反控 C1 与 C2 是**同一枚** rng 错误期望针的全跑/过滤重跑；C2 JSON 含一条
   `skipped`，按卡面严格判据不能记 valid；C3 零执行证明一个 invalid 陷阱，
   不算第二枚业务针。至少再补一枚不同业务合同的单点变异，
   对照 exit0、注入恰 exit1、唯一 failed、无混错/skip/零执行、
   绝对 test file + 完整 fullName 与产品 hash 不变须由同一判据核验并留证。
4. `packages/game/src/shell/bootstrap.glm-next-wave.test.ts:15–45` 的标题与回执
   声称证 `#400` 铺底，但 `fillRect` 仅记录参数，没记录调用当时的
   `fillStyle`；仅断言了结束时绘字色 `#f88`。记录时序并断言铺底时 `#400`，
   或收窄标题/回执，不把未测到的背景色报作已证。
5. `packages/game/src/shell/avi-player.glm-next-wave.test.ts:32–35` 用固定
   `setTimeout(0)` 当异步状态已发生的证明，与卡面 entered/deferred 的确定性要求
   不符；改为可控 play Promise/显式事件轨迹，并在 `finally` 释放。
   共享 `docs/testing/archive/legacy/batches/glm-new-waves/README.md` 是 GLM 只读范围，当前候选改了导航；
   请恢复该文件，Codex 在接收时补 wave-I 导航，届时共享导航的 docs issue
   由 Codex 承担，不得让 GLM 为过门越界写它。

返工仅在原 Wave I 新测和 `wave-I/**` 证据白名单内；视觉 console 仍未证，
Codex 在再审时补验或明确保持未证。推送新固定完整 SHA 后，Codex 再核定向+
相邻、game typecheck、完整 lint 零诊断、docs/diff 与反控，决定选择性集成。
