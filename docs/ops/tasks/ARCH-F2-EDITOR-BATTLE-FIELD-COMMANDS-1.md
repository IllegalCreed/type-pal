# ARCH-F2-EDITOR-BATTLE-FIELD-COMMANDS-1 — 战场命令族独立模块

Status: build
Phase: phase2 editor / 架构治理 F2
Coding Owner: GLM
Review / Integration Owner: Codex
Branch: `codex/glm-arch-battle-field-commands-r1`（独立 worktree）
Base / production freeze: `620a29dd`（开工先同步 main 并登记实际 SHA）

## 前提与准入

用户 2026-09-25 更新分工，允许中低风险架构切片由其它 Agent 实施、Codex 独立验收。Codex 直接读 `packages/editor/src/core/commands.ts:2185-2387`：战场表快照、`BATTLE_FIELDS_PATH`、ID 分配和增删复制修改命令集中成连续约 200 行；外部从 `commands.js` 导入。`commands.test.ts:728-970` 已有首次登记、复制、引用阻断、空表、更新/撤销等现行合同。`edit-session.ts:24` 对 `Command` 是 type-only 导入。此批仅改变模块归属，不改变用户可见行为、作者数据或公共导入路径：**before → after = 同样命令行为、同样出口，只把战场命令的实现移入专属模块**。如果遇到真实运行时 import 环、隐藏调用者或无法保真的静态审计，应停线报 counter，不以新循环或整态万能依赖换行数。

最强替代解释是这段实际共享不可搬的私有 helper；直接检查 `withBattleField` 仅服务战场更新、快照/append 仅服务这四类命令，目前未见其它命令消费者。可证伪观察：移出后出现 runtime import 环、旧入口 `instanceof` 身份变化、首次 apply/invert 保真或删除阻断轨迹不同。

## 白名单与实施

- `packages/editor/src/core/commands.ts`：只移除战场族实现并从新模块 re-export 原有公开符号；不得改其它命令类/label/错误文案/guard。
- 新建 `packages/editor/src/core/battle-field-commands.ts`：承接 `withBattleField`、表快照、append、`BATTLE_FIELDS_PATH`、`nextBattleFieldId`、四命令和 `BattleFieldInUseError`/patch type；对 `Command` 只用 type import，避免 runtime 回环。不能另写近似算法。
- 仅在必要时改 `packages/editor/src/core/commands.test.ts` 或新同目录测试，以证明新模块直接入口与旧导出是**同一构造器身份**，以及 apply/invert/引用阻断/输入深保真；旧测试断言不得删改迁就。允许 `docs/testing/glm-arch-battle-field-commands.md` 回执和 `docs/testing/README.md` 一条索引，不改任务卡/看板。
- 不改 `packages/content`、`reforge`、`main/App/MapMode/ScriptEditor`、schema/SAVE8、资产/生成工程、公共配置和覆盖基线。无新 `await`、副作用或状态采样时点变化。重构与发现的产品缺陷分开；若现行测试暴露 bug，留隔离反证交 Codex，不混修。

## 验收

先跑现行 `commands.test.ts` 的战场子集并记录标题，再拆；拆后跑完整该文件与相邻 `BattleFieldTab.test.tsx`、`project-diagnostics.test.ts`、editor typecheck 和改动文件 Biome。对一条删除 blocker 和一条撤销/还原用隔离单点反控证明回归可红；反控不能改入仓生产文件。给出最终树 `git diff --name-status`、导出集合前后对照、运行时 import 图、测试计数和错误/状态深快照。不要把行数减少当通过条件。

GLM 只在隔离分支提交推送，不合 main、不标 done；其 ARCH-REGRESSION-LAB 候选仍有 Codex counter，不得拿该包自验替代本卡独立验证。Codex 接收后统一串行全仓 check→ratchet→受保护 strict-fast 与最小功能核验。

## 阶段门

Codex：**premise verified / build allowed**，仅本卡白名单；用户新分工覆盖旧“全队列 Codex 独立”对本切片的限制，不追溯旧卡。固定 Kimi/GLM 三签当前暂停，GLM 是 Coding Owner 不是独立审查席。done 未开放。

## 下一位 GLM 提示词

```text
在 /Users/zhangxu/illegal/type-pal 接手 ARCH-F2-EDITOR-BATTLE-FIELD-COMMANDS-1。
先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡及
packages/editor/src/core/commands.ts:2185-2387、commands.test.ts:728-970。
从最新 origin/main 新建独立 worktree，分支 codex/glm-arch-battle-field-commands-r1。
只把战场命令族及专用 helper 搬到 battle-field-commands.ts，在 commands.ts 维持同一公开出口；
严格遵守白名单，不改其它命令、产品行为、作者格式或基线。先证现有测试，再跑定向/相邻、
editor typecheck、Biome和隔离负控制；记录导出身份/输入快照/错误与undo保真。候选提交推送，
给真实SHA、diff、测试命令与退出码；不合main、不标done。Codex独立复核后统一全仓门禁。
```
