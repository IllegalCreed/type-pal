# TEST-GLM-EDITOR-DATA-BATTLE-AUTHORING-1 — data and battle authoring contracts

Status: build
Owner: GLM
Reviewer: Codex（独立验收）
Phase: phase2
Capability: editor / data and battle authoring
Branch: `codex/glm-editor-data-battle-authoring-r1`
Visual Verification Timing: dev-functional

## 目标

对 Editor 数据与战斗作者面板做一轮大范围但严格排重的合同补测，覆盖数据编辑、战场/敌人/队伍引用、合法性守卫、撤销和 stale focus；避开已完成的 authoring panels、asset lifecycle、battle registry、audio ownership 卡。

## 独占范围

只允许写 `packages/editor/src/ui/` 本卡测试、合法 typed fixture 和证据。重点包括：

- `DataMode.tsx`：数据页切换、引用缺失、保存/取消和 session patch；
- `BattleFieldTab.tsx`：战场字段、引用选择、非法资源与 undo；
- `EnemyTab.tsx` / `EnemyTeamTab.tsx`：敌人属性、状态/技能、队伍成员增删、deep-link focus 和缺失回落；
- `ItemAlchemyTab.tsx` / `PoisonTab.tsx`：数据关联、重复/非法输入、空值删除与保存门；
- 只补真实作者 workflow 的功能性 UI 证据，不重复剧情 E2E。

先对照上述全部旧测、GLM/Kimi/Cursor 波次测试、已归档 Editor 卡和全量 fullName/caller/oracle 排重；已有同状态轴只登记。

## 质量与安全约束

- 合同必须走真实组件 caller，使用合法 typed project/session/data 输入，断言 session patch、序列化值、错误守卫、DOM 业务结果或 undo 结果。
- React 更新必须在 act 内；afterEach 清理 object URL/listener/session/临时文件并 unmount。
- 不改产品、旧测、配置、baseline、真实项目数据；禁止强转、skip、ignore、扩大 timeout、私有 debug state 和业务核心 mock。
- 反控必须原始绿→指定业务红→恢复绿，保存 raw/JSON/exit/执行集/三态 hash/清理证明；必要截图只做最小功能性证据。

## 验证与交付

交付逐合同排重账、identity、source hash、反控证据、必要截图 hash、定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check。覆盖率只进入整体 main 统计，不是本卡完成条件。

## 下一位 Agent 提示词

```text
你是 TEST-GLM-EDITOR-DATA-BATTLE-AUTHORING-1 的 Coding Owner（GLM）。先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡和已归档 Editor authoring/asset/battle 卡；只在 codex/glm-editor-data-battle-authoring-r1 工作。
先对 DataMode、BattleFieldTab、EnemyTab、EnemyTeamTab、ItemAlchemyTab、PoisonTab 的旧 fullName/caller/input/oracle 排重，再补数据编辑、引用、队伍、非法输入、空值删除、stale focus 与 undo 合同。
所有 React 更新在 act 内并严格清理资源/session；不得改产品、旧测、配置、baseline、真实数据、强转、skip、ignore、扩大 timeout、私有 debug state 或业务核心 mock。反控须三态绿红绿、唯一业务 AssertionError 和完整证据。
交付定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check 和完整 SHA。不得把覆盖率或测试数量当完成条件，不得标 done，等待 Codex 独立验收。
```
