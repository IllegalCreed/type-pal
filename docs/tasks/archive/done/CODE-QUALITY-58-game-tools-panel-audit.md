# CODE-QUALITY-58 — game tools panel audit

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

原卡目标:逐文件核验生产工具面板（1014→1106 行 `tools-panel.ts`）及两份专属测试:tab/DOM ownership、键盘 stopPropagation、battle/scene/dialog/timer 只读投影、音量/缩放/FPS/fullscreen 委托、minimap 装配与导入导出 caller 合同;状态读取来自 GameState,玩家动作只委托 bootstrap 注入的 controller,不改 UI 形态或公共接口。

## 范围

`tools-panel.ts`、`tools-panel.test.ts`、`tools-panel.glm-phase1-leaves.test.ts`;只读相邻 bootstrap/minimap/save-io/quick-save/battle-inspect caller。save-io 版本合同（FORMAT/VERSION/payload 校验）归 CODE-QUALITY-59,不由本卡关闭。

## 前提与证据

工具面板是 type-pal 新增工具能力,SDLPal 无对应 UI（primary N/A）。2026-10-18 波次门勘误:53-wave-gates 统一回执 [README.md](../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates/README.md) 撤回收口信用。2026-10-18 测试夹具与跨例隔离勘误:前次 417 行主测试"合法fixture、fake timer隔离"结论不足——多个 `as never` 藏掉核心缺字段/错误 status 结构,共用宿主未清 window 监听器;旧 18 绿不证明这些合同。已改用正式 GameState/BattleState 构造器与显式 runtime hydrate,共用宿主清监听器/timer/rAF/音源订阅/controller/DOM/style/偏好/单例,敌 HP/turn 分轴观察,正式 19 例;隔离副本跨例探针旧 19 绿 1 个指定 AssertionError。证据见 [README.md](../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/58-tools-panel-fixtures/README.md)。

## 验收

历史 accept(定向18+全仓门);2026-10-18 夹具勘误后 partial。2026-10-24 增量:导出失败提示经用户批准先红后修（正式单红后 7 绿,11 相邻文件 102 绿,typecheck 0;原生 Chrome 真 NotFoundError、0 写/槽不变/同名重选成功）,回执见 [README.md](../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/gamestate-save-closeout/README.md);Dev 广域组织在 [README.md](../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/dev-panel-quality/README.md) 独立接受。2026-10-25 CODE58 代码接受:原三文件与文件 IO/共用 DOM 两叶逐文件八维闭合,三新关闭;3447 tracked/491 closed/73 review/2883 pending;统一门/coverage/PR 仍等全部 pre94,历史归档 done 不认证本轮集成,唯一证据见 [README.md](../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/tools-panel-closeout/README.md)。

## 状态与交接

done 保持原历史语义;后续轮次按 2026-10-25 代码接受收口,但不承接其余原件未证范围。无存档格式/数据库/槽位合同变更;导入错误提示按本次用户批准先红后修。

## 历史范围

原卡属 2026-10-13 首轮时点;2026-10-18 勘误、2026-10-24/25 增量与历史提示词在保全块内逐字保留。

## 原始结论

原始结论按 Status(done) 原样登记,后续勘误精确更正其测试夹具结论不足;不以 102 绿替代整文件质量。治理不撤销/不恢复旧信用。

## 当时证据

当时各轮回执（53-wave-gates、58 夹具勘误、gamestate-save-closeout、dev-panel-quality、tools-panel-closeout）按各自动时点保留;本页不重跑、不复授。

## 当前有效性

仅历史任务归属有效;当前有效结论以 tools-panel-closeout 回执为准,不凭旧基点授权新产品取舍。

## 继任文档

CODE-QUALITY-59（save-io 版本门）、CODE-QUALITY-56（minimap controller）、dev-panel-quality 回执为相邻归属;当前任务导航以看板为准。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 8026B / SHA-256 4c9ef604606556d013e2227f3b39140c9205d0b76c567737cdcea4b98cbd7610；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
````markdown
# CODE-QUALITY-58 — game tools panel audit

> 2026-10-18 波次门勘误：本页引用的 [47–52统一门回执](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates/README.md) 已撤回“通过/收口”信用，未证明零诊断；不得沿用为本片验收或合并依据。本页原逐文件/定向结果按各自证据保留，旧计数不改写为0。

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 game/tools
Visual Verification Timing: functional-ui（DOM/委托/生命周期；不做剧情 E2E）

## 目标

逐文件核验生产工具面板及两份专属测试，确认 tab/DOM ownership、键盘传播、battle/scene/dialog/timer 只读投影、音量/缩放/FPS 委托、minimap 生命周期和导入导出 caller 合同；不改变 UI 形态或公共接口。

## 范围

- `packages/game/src/tools/tools-panel.ts`
- `packages/game/src/tools/tools-panel.test.ts`
- `packages/game/src/tools/tools-panel.glm-phase1-leaves.test.ts`

只读相邻 caller/oracle：`packages/game/src/shell/bootstrap.ts:1030-1120`、`packages/game/src/tools/minimap.ts`、`packages/game/src/tools/save-io.ts`、`packages/game/src/tools/quick-save.ts`、`packages/game/src/core/inspect/battle-inspect.ts`、`CLAUDE.md:129`。

## 前提真值门

- 一句话行为 / 工程前提：工具面板是 canvas 外的只读/便利 UI，状态读取来自 `GameState`，玩家动作只委托到 bootstrap 注入的保存、音量、缩放与 minimap controller。
- 原版/primary source：工具面板属于 type-pal 新增工具能力，SDLPal 无对应 UI；`N/A`。第一阶段真值仅约束其不改变核心战斗/移动/存档语义。
- 当前实现：`tools-panel.ts:1-1014`、bootstrap `setupToolsPanel` caller；测试覆盖 DOM、键盘、委托、战斗签名、对话搜索、计时器和 minimap 装配。
- 当前 `before -> after`：仍待逐文件核验 -> 保持现有 DOM/状态委托，登记 caller/oracle/生命周期证据；不扩大产品形态。
- 最强替代解释：工具面板的导入存档按钮可能把 save-io 的版本合同暴露给用户；该风险已单独开 CODE-QUALITY-59，不能由本卡关闭。

## 风险与边界

- `tools-panel.ts` 自身不拥有存档 schema，但 `serializeSave/parseImportedSave` 是用户可触发的 save/import 边界；CODE-QUALITY-59 发现版本字段未校验，故本卡保持 review，不改实现。
- 生产工具面板不是 DEV-only；DOM 生命周期、键盘 stopPropagation、定时器和文件下载/导入副作用必须保持可追踪。

## 验证

- 完整读取 1014 行实现、383 行主测试、107 行 leaves 测试和 bootstrap/minimap/save caller。
- 定向范围与相邻：`tools-panel.test.ts`、`tools-panel.glm-phase1-leaves.test.ts`，18 tests；minimap/dev-panel caller 已在 CODE-QUALITY-56 与本轮读取中核验。
- 当前结论：CODE-QUALITY-59 的 phase1 VERSION=1 guard 已完成并通过；tools-panel 及两份测试共 18 定向 tests、全仓质量门通过，未发现本卡直接缺陷。

## 交接

- 2026-10-13 Codex：完整读取 tools-panel 1014 行、两份测试及 bootstrap/minimap/save caller；定向 18 tests、全仓 check/ratchet/protected fast/lint-zero/docs/content/ledger 全部通过。导入存档 version 合同由 CODE-QUALITY-59 独立收口；本卡无产品形态或公共接口变更。账本收口为 `3266 / 290 closed / 8 review / 2968 pending`。

## 2026-10-18 Codex 当前独立复审

- **范围与读取**：完整读取当前 `tools-panel.ts`（1106 行）、两份专属测试；读取 bootstrap `setupToolsPanel`、minimap controller、save-io、quick-save、battle-inspect caller。核验根节点/样式幂等、六 tab、Backquote/键盘传播、战斗签名轮询、场景/minimap rAF、音量/音乐源/缩放/FPS/fullscreen 委托、对话搜索、计时器和存档按钮边界。
- **逐文件结论**：tools-panel 只读投影 GameState，动作通过注入依赖委托；setup 根节点幂等且 bootstrap 只安装一次。未发现本卡直接缺陷；save-io FORMAT/VERSION/payload 仍由 CODE-QUALITY-59 独立负责，不改公共接口或存档格式。
- **验证**：2 files / 18 tests passed；`pnpm --filter @type-pal/game typecheck` passed；coverage 等沿用 [`53-wave-gates`](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/53-wave-gates/README.md)，不重复运行昂贵 coverage。当前复审为 `partial`，不是整卡 `accept/done`。

## 2026-10-18 测试夹具与跨例隔离勘误

Codex单一Owner，build allowed仅两测试、共用测试宿主和治理证据。前次417行主测试“合法fixture、fake timer隔离”的结论不足，精确更正：多个`as never`藏掉核心缺字段/错误status结构；清body/timer没有移除window监听器。旧18绿不证明这些合同。隔离副本跨例探针旧19绿1个指定AssertionError，新21绿。

已改用正式GameState/BattleState构造器与显式runtime hydrate，复用typed角色/敌人；共用宿主清监听器、timer/rAF、音源订阅/controller、DOM/style、偏好和单例。敌HP/turn分轴观察且HP精确到目标单元；全屏/FPS拆职责，正式19例。生产源/UI/API/save未改，未扩大高风险边界。逐文件读取、19例oracle/排重、raw/native/hash/清理和34文件199例相邻、typecheck见 [58夹具勘误证据](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/58-tools-panel-fixtures/README.md)。静态门另记，本批无新全仓check/ratchet/protected；旧53波次不认证本候选。当前partial不变，不把相邻全绿当整卡accept。

## 历史下一位 Agent 提示词（不作当前准入）

```text
接手任务：CODE-QUALITY-58 game tools panel audit
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-58-game-tools-panel-audit.md
当前状态：done，已归档；不得修改 save/schema
先读：本卡、AGENTS.md、CLAUDE.md、tools-panel.ts 及两份测试、bootstrap.ts setupToolsPanel caller、save-io.ts、quick-save.ts
请做：若重开审计，重新复核 DOM/键盘/委托/定时器/输入隔离；不得直接重用本卡作为新 build 授权
输出：caller/oracle 证据；历史结论为 accept/done，现行增量结论见下节
```


2026-10-24当前增量：导出失败提示用户批准并先红后修，URL所有权、四项不同IO合同与真实Save/IDB浏览器失败链已核；尚不授整卡/Dev广域关闭。GS及工具专测有限接受与原件见[当前回执](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/gamestate-save-closeout/README.md)，统一门仍等全部pre94。

2026-10-25：Dev广域组织已在[独立质量回执](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/dev-panel-quality/README.md)接受，非本卡工具面板/导入FileReader的接受；58仍partial，不承接其余原件未证范围。


## 2026-10-25 CODE58代码接受

2026-10-25 CODE58代码接受：原三文件与文件IO/共用DOM两叶逐文件八维闭合；用户批准导入读取错误提示，正式单红后7绿，11相邻文件102绿与typecheck0；原生Chrome真NotFoundError、0写/槽不变、同名重选成功。三新关闭，3447tracked／491closed／73review／2883pending；固定79accept／4partial／0pending。统一门/coverage/PR仍等全部pre94。 [当前唯一证据](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/tools-panel-closeout/README.md)。原三文件、既有宿主/样式/导出证据复用；新叶完整TS还原。问题与Owner边界逐项说明，不用102绿替代整文件质量。导入错误已按本次用户批准先红后修；存档格式/数据库/槽位合同不改。主面板page寿命与独立动作跨tab完成为原行为；Reader新实例无LOADING重入、无生产abort调用，不制造未知停止线。本轮代码accept；父卡与本轮风险卡等全部pre94统一门/PR，历史归档done不认证本轮集成，历史通过不继承。

无下一位Agent提示词：Codex继续同一3y的1／3m／42／57；新裁决只暂停受影响范围。
````
<!-- incremental-original-source:end -->
