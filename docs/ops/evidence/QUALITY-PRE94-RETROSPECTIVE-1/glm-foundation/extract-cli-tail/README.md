# extract cli + battle-sprite + output-boundary 复审（glm-foundation 模块 3 尾批）

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

原审计「extract cli + battle-sprite + output-boundary 复审（glm-foundation 模块 3 尾批）」的主题按原文时点保留(摘录:> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见当前返工记录。 范围：`cli.ts`（919 行全文)。

## 范围与证据

原报告含章节[extract cli + battle-sprite + output-boundary 复审（glm-foundation 模块 3 尾批）、短回执、八维结论(cli.ts)、复验入口（只读）]、1个链接;固定main源3570B(SHA 8e9fa534947d)。当前存活入口:[codex-stage2-rework.json](../codex-stage2-rework.json)。

## 发现

原文发现/计数/日期按原时点保留在保全块;本页不重算审计结论。

## 结论

原结论保持原时点;治理不改写审计判定,不撤销旧撤信,不恢复旧完成声明。

## 整改与复核

本治理候选仅覆盖文档角色与保全;整改事实以原文与后继卡为准;候选待Owner接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3570B / SHA-256 8e9fa534947d8bc668a9b5f826e1f5094320fbe103246a1a8ba07282fc5e0d27；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
````markdown
# extract cli + battle-sprite + output-boundary 复审（glm-foundation 模块 3 尾批）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

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
````
<!-- incremental-original-source:end -->
