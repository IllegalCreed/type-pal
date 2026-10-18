# game core 3o/3n 余量四件复审（glm-foundation 模块 5 批 4）

Status: review（候选待 Codex 据证验收）
Owner: GLM；基点 `53db76bbb` 线（body 基准=批3提交后 HEAD）
范围：`core/{player-poison-state,scene-system-search,palette-fade,scene-identity}.ts`（142/98/328/13 行）。均处 Codex 3o/3n+后续审计深切片范围（palette-fade 另经数值审计与 ColorFade 输入域两轮），本批为 B–G 补维轮。

## 短回执

- **改动 0 处**：四文件零缺陷。核验要点:poison 的 level≥99 伪毒/ByKind-ByLevel 分工/Wear 与首空槽差异已显式挂 GAME-PLAYER-POISON-SLOT-COMPACTION-1(与看板 draft 一致,不做行为改动);search 的 13-cell/mode*6-4/h-parity 与 c3d943dde 注释修正一致;palette-fade 的 fade60/fade63 量化封顶、freeze 冻屏语义(真机 trace 档案)、approach 等价边界声明全部与实现吻合;scene-identity 单一存储 + loadSceneCommon 手动同步说明准确。
- **验证**：body-invariance 四文件一致;定向 **27 套件 90/90、0 failed-suites**(game-state 61 含毒/身份合同 + palette-fade 17 + search 12;poison 另有 status-poison-equip.glm-q/event-opcode-player 族相邻覆盖);scoped biome 0/0/0;diff --check 干净。未跑 game 全包/全仓门。

## 八维结论（B–G 补维重点）

| 维 | 结论要点 |
|---|---|
| B | 四文件注释为仓内标杆级:poison 的 sdlpal 行锚+原版早期 bug 考据、palette-fade 的量化/冻结/等价边界声明、identity 的写路径分工——零修改。 |
| C | poison/word 类模块单例写入 Owner 唯一(setObjectPoisons);palette-fade 纯函数构造器+原地 mutate 边界清楚(colors=gs.palette.colors,快照防别名有 cloneColors 保证);identity 单变量单写者。 |
| D | 无重复知识;moveToward/solidColors 等 helper 私有且单一职责。 |
| E | 90 例含量化中点/非网格 approach/黑行独立快照(ColorFade 输入域批产物)、13-cell 手算 oracle、毒槽全生命周期。 |
| F/G/H | 命名/结构清楚;`_DIR_WEST` 下划线前缀为 4 向枚举完整性锚(有意保留,nit 登记);纯函数直测/时间经 nowMs 注入可测 ✓。 |

## 登记（不动）

`_DIR_WEST` 未用枚举锚 nit;poison 槽压缩差异归既有 draft 卡(本批未触碰)。

## 复验入口（只读）

```bash
WT=~/.glm-worktrees/pre94-foundation
cd "$WT/packages/game" && ../../node_modules/.bin/vitest run src/core/palette-fade.test.ts \
  src/core/scene-system-search.test.ts src/core/game-state.test.ts
```

失效条件:四文件实现变化 → 重测;palette.c 真值或毒槽裁决变化 → 对应注释复核。
