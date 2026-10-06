# TEST-GLM-EDITOR-BATTLE-REGISTRY-1 证据索引

本卡已归档，测试与证据已由 Codex 集成 main。交付物仅为三份 Editor 合同测试：

- `packages/editor/src/ui/BattleSpriteLibrary.glm-battle-registry.test.tsx`（BR-01 注册证明门、BR-02 缺失字节回落）
- `packages/editor/src/ui/SpriteFrameDeletion.glm-battle-registry.test.ts`（BR-04 删帧规划守卫）
- `packages/editor/src/ui/EnemyTeamTab.glm-battle-registry.test.tsx`（BR-05 宿主深链同步）

定向证据见 [directed.raw](directed.raw)，四枚反控的三态原始输出见 [counterproof.json](counterproof.json) 与 [mutation-logs/](mutation-logs/)。
仓库根目录可重放：

```text
node docs/ops/evidence/TEST-GLM-EDITOR-BATTLE-REGISTRY-1/run-counterproof.mjs
```

本卡不以覆盖率或例数作为验收指标；排重、合法输入、真实 caller/oracle 与放弃分支举证保留在归档任务卡和三份测试文件头部。
