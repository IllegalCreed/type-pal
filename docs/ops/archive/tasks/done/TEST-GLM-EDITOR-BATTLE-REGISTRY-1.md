# TEST-GLM-EDITOR-BATTLE-REGISTRY-1 — battle sprite registry authoring contracts

Status: done
Owner: GLM
Reviewer: Codex（独立验收）
Phase: phase2
Capability: editor / battle sprite registry
Branch: `codex/glm-editor-battle-registry-r1`
Visual Verification Timing: dev-functional

## 目标与范围

补齐 Editor 战斗精灵注册与敌方队伍作者流程的真实合同；不与已收口 Editor asset-lifecycle/authoring 卡重复，也不以覆盖率或例数作为指标。范围为 `BattleSpriteLibrary.tsx`、`BattleSpriteUploader.tsx`、`EnemyTeamTab.tsx`、`EnemyBattleSpriteThumbnail.tsx` 的公开交互：注册/替换/删除、缺失资源回落、重复 id/坏元数据拒绝、敌队引用同步和 undo。

先对照 BattleSpriteLibrary、BattleSpriteUploader、EnemyTeamTab 的所有旧测/GLM/Kimi/Cursor fullName 与业务 oracle 排重；已有证明只登记。

## 硬约束与交付

所有 React 更新在 act 内，afterEach 清理 object URL、listeners、session、临时文件并 unmount。只写本卡测试、合法 fixture、证据；不得改产品、旧测、配置、baseline、真实项目数据、强转、skip、ignore、扩大 timeout、私有 debug state 或业务核心 mock。反控必须原始绿→指定业务红→恢复绿，保存 raw/JSON/exit/执行集/三态 hash/清理证明。交付排重账、必要截图 hash、定向/相邻/typecheck/lint/docs/diff；覆盖率只记录到整体 main。

## 下一位 Agent 提示词

```text
你是 TEST-GLM-EDITOR-BATTLE-REGISTRY-1 的 Coding Owner（GLM）。先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡及已归档 Editor 卡；只在 codex/glm-editor-battle-registry-r1 工作。先对 BattleSpriteLibrary、BattleSpriteUploader、EnemyTeamTab、EnemyBattleSpriteThumbnail 的旧 fullName/caller/input/oracle 排重，再补注册/替换/删除、缺失回落、重复 id/坏元数据拒绝、敌队引用同步和 undo 合同。所有更新在 act 内并严格清理资源/session；禁止改产品、旧测、配置、baseline、真实数据、强转、skip、ignore、扩大 timeout、私有 debug state、业务核心 mock。反控须三态绿红绿并保存完整证据。交付定向/相邻测试、typecheck、lint 0/0/0、docs、diff 和完整 SHA；不得把覆盖率或例数当完成条件，不得标 done。
```
---

## Codex quality closure (2026-10-05)

候选 `02b2e04493028db3868d42eb3debd1ebd66f21ec` 已独立验收：4/4 定向测试、4/4 反控、typecheck、lint 0/0/0、docs、phase/lore 通过；content review 已同步最新 main，diff 干净。本卡已集成 main，原候选分支进入退休清理。
