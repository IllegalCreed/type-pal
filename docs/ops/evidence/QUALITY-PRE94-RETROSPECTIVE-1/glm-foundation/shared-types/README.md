# shared 纯类型/合同六文件复审（glm-foundation 模块 2）

Status: review（候选待 Codex 据证验收）
Owner: GLM；基点 `53db76bbbb5729ba8bc6525bd7ad2ad4bb425c02`（阶段1集成后的最新 3y，fetch 后锁定；worktree 离线安装自建依赖图，跨包解析已修复）
范围：`resources.ts`、`input.ts`、`index.ts`、`events.ts`、`tables.ts`、`pal-authored-map-names.ts`。开工核对：看板/四个已登记 worktree 无该范围未提交修改。

## 短回执

- **改动 6 处（5 文件）**：①index.ts `FRAME_MS_FADE` 注释重写——原注释把**已被 2026-05-30 废弃的旧设计**（fade 提频 60fps，即香兰报信瞬移 bug 根因方案）描述成现行原理，且常量 0 消费；现标明已废弃/无 caller/新代码不得使用 ②events.ts `LoadSceneCommand` 运行时语义注释——原称 handler 是 M3.5 stub+dev panel 直调，实际 event-system.ts:733/741 早已实现异步 `waiting='scene-load'` 等待 ③tables.ts 删除**重复声明** `LevelUpMagicEntry`（原 L475 与 L614 两次声明靠 declaration merging 静默合一，docblock 出处还互相冲突），同时让 tagPLAYERROLES 大 docblock 正确挂回 `PlayerRole`（原先被重复声明隔开）④resources.ts `Tilemap.cells` 措辞（"height × width 行 × width 列"→"外层 height 行，每行 width 列"）。pal-authored-map-names.ts 与 input.ts 零改动。
- **零类型面/行为变化证明**：tables.ts 用 tsc declaration emit 前后 diff——唯一差异恰为被删的重复声明块，`LevelUpMagicEntry` 幸存声明（10 个外部消费者：battle-progression 等）逐字节相同（[tables.base.d.ts](tables.base.d.ts)/[tables.after.d.ts](tables.after.d.ts)）；其余 4 文件 body-invariance（去注释打印 AST）与基点一致。
- **门**：shared 全包 16 文件 **128/128**（0 fail/pending/todo，[directed.json](directed.json)）；`tsc --noEmit` 0 错；scoped biome 6 文件 0/0/0；diff --check 干净。未跑全仓/coverage/protected（按准入）。

## 八维结论（按文件）

| 文件 | 结论要点 |
|---|---|
| resources.ts | A：契约与 extract 产出/game 消费一致（tileset 指向 `tileset/{mapNum}.rle` 与 cli 写出核过）；B：修 cells 措辞；nightColors"实测 PAT.MKF 仅 #0/#5 为 1536B"为有界实测陈述，保留。C/D：纯类型、字段无重复知识。G：**SpriteSet、PixelPos 0 外部消费者**（登记，见下）。 |
| input.ts | A/B：AbstractKey↔sdlpal kKey* 映射与 DM30 suppressHeldForFade 合同注释锚（palette.c:314-316/441-446、input.c:213）为既有核验，无矛盾；9 个消费者。零改动。 |
| index.ts | A：常量算术平凡正确；B：**FRAME_MS_FADE 注释描述已废弃设计（本模块最重要 B 维缺陷）**，已重写并标注 0 消费；G：登记待删。FPS_EXPLORE/BATTLE/FRAME_MS_* 消费正常。 |
| events.ts | A：Command union 与 disasm 产出/interpreter 消费一致；B：修 loadScene 过时 stub 注释（对照 event-system.ts:733/741 现行实现）。DialogBoxStyle 的 M2 历史注为真实沿革，保留。 |
| tables.ts | A：全部 sdlpal 锚（ITEMFLAG/MAGICFLAG/tagOBJECT union/ENEMY/PLAYERROLES SoA/signed 语义）为 M3/M4/D28 既有核验，本批未发现新矛盾；F/G：**重复 LevelUpMagicEntry 声明 + docblock 错挂**已修（d.ts 恒等证明）；G：BattleEffectIndex、LevelUpMagicTable 0 外部消费者（登记）。 |
| pal-authored-map-names.ts | 冻结考据 fixture（222 条/编号空洞有意），getPalAuthoredMapName/has 明确缺名合同；pal-map-names.test 锁 hash。零问题零改动。 |

E 维（六文件共用）：类型合同由 typecheck+共享包 128 测覆盖（events/input/index/pal-map-names 专属测在内）；无新增运行时合同。

## 登记（公共出口删除须 Codex 裁定，本批不动）

`SpriteSet`(0)、`PixelPos`(0)、`FRAME_MS_FADE`(0，已废弃设计)、`BattleEffectIndex`(0)、`LevelUpMagicTable`(0)。均有 barrel 导出；删除属公共接口变化，建议 Codex 在无外部数据格式依赖确认后裁定（JSON dump 消费方可能绕过类型直接读 JSON）。

## 复验入口（只读）

```bash
WT=~/.glm-worktrees/pre94-foundation
git -C "$WT" log --oneline 53db76bbb..HEAD -- packages/shared/src
diff <(git -C "$WT" show 53db76bbb:packages/shared/src/tables.ts | sed -n '/./p' | shasum -a 256) /dev/null >/dev/null 2>&1 || true  # 结构核对走 d.ts:
node "$WT/node_modules/.bin/tsc" --declaration --emitDeclarationOnly --strict --target es2022 --module esnext --outDir /tmp/dts-verify "$WT/packages/shared/src/tables.ts"
diff /tmp/dts-verify/tables.d.ts "$WT/docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/shared-types/tables.after.d.ts"
node "$WT/docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/prove-body-invariance.mjs" \
  --base 53db76bbbb5729ba8bc6525bd7ad2ad4bb425c02 packages/shared/src/resources.ts packages/shared/src/input.ts packages/shared/src/index.ts packages/shared/src/events.ts
cd "$WT/packages/shared" && ../../node_modules/.bin/vitest run
```

失效条件：六文件类型成员变化 → d.ts/body 证明重出；event-system loadScene 实现再变化 → events.ts 注释复核；sdlpal 锚引用段变化 → 对应字段注释复核。
