# ARCH-F2-EDITOR-BATTLE-FIELD-COMMANDS-1 — 战场命令族独立模块

Status: done
Phase: phase2 editor / 架构治理 F2
Coding Owner: GLM
Review / Integration Owner: Codex
Branch: `codex/glm-arch-battle-field-commands-r1`（独立 worktree）
Base / production freeze: `f5f166aa`（实际开工基点；原卡 `620a29dd` 为历史准入锚）
Implementation candidate: `83833719`

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

Codex：**premise verified / build allowed**，仅本卡白名单；用户新分工覆盖旧“全队列 Codex 独立”对本切片的限制，不追溯旧卡。固定 Kimi/GLM 三签当前暂停，GLM 是 Coding Owner 不是独立审查席。2026-09-26 Codex完成下列独立验收后核定 **accept / done allowed**。

## Codex 独立接收与集成验证（2026-09-26）

- 已直读候选源码与新增测试。原 `commands.ts:2185-2387` 与新模块函数体逐字节一致（含结尾换行）：7276 bytes，SHA256 `8a56bbfcc9dd487a92363195deb92fcc475a60cb02a9a1478ea34165ec0351d1`；公开出口119→119，新模块8个出口（7运行期+1type）全部仍从旧入口提供。旧 `commands.test.ts` 零diff。
- TypeScript擦除type后核运行期本地依赖闭包13模块，新模块没有回到`commands.ts`的路径；content/reforge/shared没有反向editor依赖。候选156/156、editor typecheck、三个改动文件Biome、docs/diff均通过。
- 重建两针实际源代码加载变异：删除`references.length`阻断门，使原D24引用删除用例在“未抛错”AssertionError红；仅把Add的invert改为return state，使原首次登记还原用例在battleFields未恢复undefined处红。对照D24 8/8；两针均目标执行1/失败1、exit1、注入命中，源文件零改。采用本席证据替代不可重建的临时mock回执。
- 已将候选白名单文件适配至主线`7a18eaa6`后工作树。完整`pnpm check` exit0（七包8657项）；串行`coverage:ratchet` exit0后，设置`TYPE_PAL_COVERAGE_BASE_REF=7a18eaa6`的单次严格`coverage:fast` exit0。fast8159→8165项，生产文件643→644；四项覆盖率分子/分母完全不变：语句61237/80619、分支43254/63176、函数11385/15036、行55132/70572。基线仅更新模块/测试清单与摘要，未降门槛。日志`/tmp/codex-bfc-{check,ratchet,strict}.log`。
- 最小功能核验：隔离PAL开发快照6013从52项新建#058→53项，名称改为“Codex战场更新”、火属性0→3；复制#059后54项且属性保留；撤销复制回53项、重做回54项。默认#024删除按钮因引用禁用。IAB原生confirm接口阻塞该临时标签，未将其当产品故障；另以6014专用Vite宿主替身`window.confirm`（记录请求文字并返回true，产品文件不改）验证无引用#058删除后条目消失、撤销恢复原编号，最后撤销创建回52项。截图/可访问树已目视核对，未保存用户项目；原生确认框自身的自动化交互不在本次通过声明内。
- **Codex独立验收 accept，done准入满足并归档。** GLM是实现贡献者，不代签他席。此卡仅关闭战场命令窄拆，F2其余命令族、ARCH-REGRESSION-LAB剩余项及已登记的作者cue漏校验缺陷不随本卡关闭。无下一位Agent提示词。
- 主线集成提交`22a4492c`已推送。原候选`83833719`以远端标签`archive/glm-arch-battle-field-commands-r1`保存；确认源码/测试与主线完全一致、候选工作树干净后，已移除该worktree和本地/远端同名分支。其余活动工作树未动；本席临时6013 IPv4/6014服务已停止，既有6013 IPv6服务保留。

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
