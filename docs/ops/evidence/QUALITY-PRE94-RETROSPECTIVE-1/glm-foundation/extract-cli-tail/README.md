# extract cli + battle-sprite + output-boundary 复审（glm-foundation 模块 3 尾批）

Status: review（候选待 Codex 据证验收）
Owner: GLM；基点 `53db76bbb` 线（body 基准=批6提交后 HEAD）
范围：`cli.ts`（919 行全文深读）、`resources/battle-sprite.ts`（50）、`output-boundary.ts`（25，冻结卡范围只读）。开工核对无 Owner 冲突。

## 短回执

- **改动 4 处（仅注释,全在 cli.ts）**：①头部"产出目录"清单大半描述 2026-06-22 管线优化前的 per-frame PNG 布局 → 按现状改写(blob/PNG/manifest 三类分明) ②"rng-frames.json 逐帧 PNG manifest"→frameCount manifest 不含 PNG ③Musics 段"runtime 播放系统仍留 M6"过时(音频已接入)→按 audio-midi/audio-rix 现状改写 ④mus.mkf 小写文件名补防误改注(盘上即小写,已核 16 个 MKF 文件名)。battle-sprite/output-boundary 零改动。
- **过程披露**：首版头部注释含 `level-up-*/` 序列,`*/` 提前闭合块注释致 4 套件解析失败——即改即现即修(旧判例重演),修正后全绿;另有 --out wx 排他被 /tmp 旧文件触发一次,清理后通过。两态如实记录。
- **验证**：body-invariance 三文件一致;定向 5 套件 **24/24、0 failed-suites**(output-boundary/entrypoint-paths/font-lookup/global-entries + cli 直跑守卫);scoped biome 0/0/0;diff --check 干净。输出清理策略段(L200-214)严格只读未动(QUALITY-EXTRACT-OUTPUT-BOUNDARY-1 冻结)。未跑全量 extract 与全仓门。

## 八维结论(cli.ts)

| 维 | 结论要点 |
|---|---|
| A | round-trip 自检 exit(2) 硬门;entryIps 含 item/spell/enemyObj/player 脚本(M5.6 审计修);OUT 后缀双 guard+PRESERVE videos;各资源段容错 skip 均 warn+continue 且有 sdlpal 依据(空 chunk/尺寸不符/YJ2 fail);FBP splash 与 battle bg 双写有意注明;直跑守卫 realpathSync 正确。mus.mkf 小写与盘一致(本批核)。无新直接缺陷;清理策略冻结待用户裁决(原状)。 |
| B | 本批修 4 处。M4/M5 历史审计注释(dump-all 教训、0-based scene 起点、M3.30 翻译)质量高,保留。 |
| C/D | 总装入口单向依赖各 parser;helper 局部;prepareOutputRoot 独立可测(有专测)。 |
| E | 24 例覆盖守卫/入口路径/字体查找/全局条目;全量 extract 431/434 由 QUALITY-EXTRACT-RAW-TEST-EXECUTION-1 既有证据覆盖(源经 body-invariance 未变,适用性成立)。 |
| F/G/H | 分段清楚;dataSubdirPath 'font' 前向兼容已注明;直跑守卫保证 import 不启 main ✓。 |

battle-sprite:薄组装器,battle.c:856 锚+复合键设计清楚,零问题。output-boundary:守卫逻辑/注释准确,冻结范围只读不改。

## 复验入口（只读）

```bash
WT=~/.glm-worktrees/pre94-foundation
cd "$WT/packages/pal-extract" && ../../node_modules/.bin/vitest run src/output-boundary.test.ts \
  src/cli-entrypoint-paths.test.ts src/cli-font-lookup.glm-q.test.ts src/cli-global-entries.glm-q.test.ts
node "$WT/docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/prove-body-invariance.mjs" \
  --base c81352b02 packages/pal-extract/src/cli.ts packages/pal-extract/src/resources/battle-sprite.ts packages/pal-extract/src/output-boundary.ts
```

失效条件:三文件实现变化 → 重证;输出布局再迁移 → 头部清单复核;清理策略裁决落地 → 冻结段随裁重审。
