# 批49:reforge debug-tools.ts（零整改批）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

范围：`packages/reforge/src/debug-tools.ts`(1444行)全文读毕。八维审查（A–H）全部通过,零源码改动、零 diff。

## 结论

- **纪律落地与头部声明一致(K1-K5/G1-G4)**:DEV-only 动态 import 主链不触及;全内存态不落档;世界变更一律走 runDetached(runCommands 真实命令链)或 dev 内存 mutation;触发器走 detached current runtime 不静默丢;输入隔离(root keydown/keyup stopPropagation + 唯一 controller capture 监听管 Esc,表单字段键入不泄漏进游戏快捷键)。
- **生命周期干净**:activeDebugCleanup 单例替换;dispose 顺序(先 hide→abort 全部 panelOperations→摘监听→remove root→按所有权摘样式→清全局引用);样式注入幂等(STYLE_ID 去重)。
- **触发器面板**:runningButtons 二次点击取消;presentationBusy 时 window.confirm 阻断场景切换类 detached 执行并说明动机(detached 并发不排 onEnter);AbortError 与 error 分色收口。
- **战斗构建器**:enemyOverride/partyPreset 只组参数不越权;memberOverrides `_d` 挂 DOM 行数据的窄类型;预设应用 isCarryableStatusId 过滤防非法状态 id;字段数校验(fieldId/actorIds/敌队)前置。
- **命令控制台**:14 命令全覆盖 help;scene/run-script/run-trigger 三命令共享 sceneSwitch()+presentationBusy 确认门;money 用 delta 走真实 giveMoney 链。
- **无障碍**:tablist/tab/tabpanel 角色 + 方向键/Home/End 导航 + focus-visible 样式 + aria-label 全覆盖;状态行 role=status aria-live=polite。

## 登记移交（无新增）
本批无新清理候选。

## 验证
- 定向测试:8 个测试文件 71/71、numFailedTestSuites=0（directed.json）。
- 零 diff 批:无源码改动,不适用 body-invariance。
