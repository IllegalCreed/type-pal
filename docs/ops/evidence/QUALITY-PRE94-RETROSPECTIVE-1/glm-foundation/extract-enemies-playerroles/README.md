# extract enemies + player-roles 复审（glm-foundation 模块 3 批 5）

Status: review（候选待 Codex 据证验收）
Owner: GLM；基点 `53db76bbb` 线（body-invariance 基准=批4提交 c596dc89f,即三文件整改前状态）
范围：`parsers/enemies.ts`（250）、`parsers/player-roles.ts`（275）,连带修 `shared/tables.ts` PlayerRole docblock 同源过时。开工核对无 Owner 冲突。

## 短回执

- **改动 4 处（仅注释）**：①②enemies.ts 两处引用**不存在的 `EnemyTeam.slots` 字段**（Codex C2 登记"生产未改"的直接 counter）→ 改为现行 `enemyObjectIndexes`（翻译前 OBJECT 绝对 index）与 `enemies`（翻译后 id）双字段表述 ③player-roles.ts docblock"M3 子集、跳过 equipment/magic 等"与下方 M4 全字段 dump 实现矛盾 → 按 M4 全量现状改写 ④shared/tables.ts PlayerRole 大 docblock 同款 M3 过时 → 同步更正。
- **验证**：body-invariance（基准=整改前 HEAD）三文件一致；定向 4 文件 **14/14**（tables 真盘 + player-roles boundaries ×2 + misc-mkf 真盘）；scoped biome 0/0/0；diff --check 干净。未跑全仓门。

## 八维结论

| 维 | 结论要点 |
|---|---|
| A | enemies：%70 整除守卫 throw、signed/unsigned 语义与 fight.c:4634 锚一致、_name 反查 first-wins;parseEnemyObjects 界内 throw。player-roles：900B 精确尺寸守卫 + **cursor 走完 sizeof 校验**（自证布局）、装备行序 2026-07-02 逐位核验注、rgwName 3/4 对调坑文档化（用户报障溯源）。**登记**：buildEnemyObjectNameMap/buildObjectIndexToEnemyIdMap 短输入静默返空 Map（与 parseEnemyObjects 的 throw 不一致,O-2 族）。无新直接缺陷。 |
| B | 本批修 4 处（见短回执）。 |
| C/D | 依赖单向（parsers→io/utils→shared 类型）；build*两 Map 同构不同产出（文档自述）可接受。**登记**：extract 本地 `EnemyObject` 接口与 shared/tables.ts 同名同形并存（同 LevelUpMagicEntry 双类型模式）。 |
| E | 14 例含真盘 oracle;enemies C2 期 V8 证据复用（源未变）。 |
| F/G/H | SoA cursor 走法可读性佳;无死导出（cli 全消费）;确定性 ✓。 |

## 复验入口（只读）

```bash
WT=~/.glm-worktrees/pre94-foundation
git -C "$WT" log --oneline c596dc89f..HEAD -- packages/pal-extract/src/resources/parsers/enemies.ts packages/pal-extract/src/resources/parsers/player-roles.ts packages/shared/src/tables.ts
node "$WT/docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/prove-body-invariance.mjs" \
  --base c596dc89f0bb8d0b838c4ef64aa1079abc8f36e5 packages/pal-extract/src/resources/parsers/enemies.ts \
  packages/pal-extract/src/resources/parsers/player-roles.ts packages/shared/src/tables.ts
cd "$WT/packages/pal-extract" && ../../node_modules/.bin/vitest run src/resources/tables.test.ts \
  src/resources/parsers/__tests__/player-roles.boundaries.test.ts
```

失效条件：三文件实现变化 → 重证；PLAYERROLES 布局/EnemyTeam 字段变化 → 注释复核。

## 勘误（2026-10-18 晚补）

本批"14/14"未披露:**tables.test.ts 套件当时因缺 WORD.DAT 加载失败(0 断言,suite-status=failed,回执内可查)**,14 为其余三文件计数。补链后 tables 全量 **89/89** 已在批 6 回执中实测通过;两态均保留。


## Codex当前勘误与接管（2026-10-19）

本片原14断言通过但tables套件加载失败，不能写完整门通过；后续extract-spells-teams-items的tables89/89原件支持该tables恢复，word漏跑另由Codex补8例。旧原件与后续回执分别保留，不追溯清零。 [当前返工与限制](../codex-stage2-rework.json)。
