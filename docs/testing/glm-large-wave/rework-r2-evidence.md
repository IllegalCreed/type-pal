# TEST-GLM-LARGE-WAVE-4 · R2 返工逐项证据（对 codex-review-8cb0af0a.md）

R2 返工候选（本文档所述各项）：`031b3e479e18bf1add1d5b559716172cfb7c031f`；
R3 窄返工候选（judge 清理/精确匹配与回执锚修正）：本次推送提交，完整 SHA 见推送输出与最终回执；
基点（R1）：`8cb0af0ad2e5952c01e8fa95144b495df4ceaecc`。
范围：仅原卡白名单（同目录 `.glm-large-wave.test.ts(x)`、`src/__tests__/glm-large-wave/**` fixture、
`docs/testing/glm-large-wave/**` 工具/回执/证据/隔离宿主）；未触产品、旧测试、官方基线或 F–J。

## 1. 完整 pnpm lint 15/2/1 → 0/0/0

- 复现：完整 `env -u NODE_COMPILE_CACHE pnpm lint` 在 r1 候选上 18 诊断（与审查一致：
  needle-judge、browser-host、四份 directed JSON、三份证据 JSON、script-chunk-store 测试）。
- 处置：JSON/mjs/tsx 全部 `biome check --write`（原规则格式化）；`drive-a.mjs` 去除未用
  `createHash`；`host-b.tsx` 两个按钮补 `type="button"`；`needle-judge.mjs` 重写时同步消除
  useTemplate/unused/organize。
- 终验：`env -u NODE_COMPILE_CACHE pnpm lint` → **PASS — 2666 files; 0 errors / 0 warnings /
  0 infos; complete report**（完整报告，非部分文件）。

## 2. 24 处非法强转（22 `as never` + 2 `as unknown as`）→ 0

- `grep -rn "as never|as unknown as" packages/editor/src/ui/*.glm-large-wave.test.* packages/editor/src/__tests__/glm-large-wave/*.ts` → **0 处**。
- 替换为当前构造器/真实有效对象：`assetBase` 一律 `loadLegalUiProject().assetBase`；
  `assetReader`/`audioResolver` 一律 `createEditorAssetReader(legal.source, state)`；
  EnemyDef 用 `validateEnemies` 同形状的完整 stats/ai/sounds；canvas 2d 走
  `packages/editor/src/__tests__/glm-large-wave/canvas-2d-port.ts` 的真原型派生替身（`Object.create(prototype)` 派生 +
  vi.fn 成员显式提供，无类型断言、无显式 any）；`getCurrentProjectReferenceIndex` 用
  `collectCurrentProjectReferenceIndex`；mock 回调参数直接标注 `BattleSpriteDef` 类型。
- DataMode 子组件替身（WorldSpriteLibrary/BattleSpriteLibrary/ShopTab 的 vi.mock）**全部移除**：
  改为真实挂载——域切换经真实 DsTabs「战斗/大世界」页签驱动真实回调，脏态合成经真实
  ShopTab「独立试买」弹窗内的保存提示断言（4/4 绿）。测试文件内不再有任何 vi.mock。

## 3. 两个测试后缀 → 与源扩展名一致

- `command-form-world.glm-large-wave.test.ts` → **`.tsx`**（源 `command-form-world.tsx`；git mv）。
- `use-editor-project-session.glm-large-wave.test.tsx` → **`.ts`**（源为 `.ts`；JSX 改
  `createElement`）。其余 15 个新测路径逐一复核，均与源扩展名一致。
- 新鲜 JSON（`batch-a/b-directed.json`）已按改名后路径重新生成：
  editor 13 文件 50/50、B 单文件 3/3、reforge 7/7、migrate 9/9。

## 4. needle-judge 严格判据 + 可复跑 selftest

- [needle-judge.mjs](needle-judge.mjs) R2：整体运行（无 -t 过滤）、基线 executed>0 且零 skip、
  注入点唯一、注入后恰 exit1 且恰 1 条 FAIL、FAIL 行核验为被注入的绝对临时文件、完整失败名
  含 --name、失败须 AssertionError、注入前后 executed 一致、生产源 SHA256 漂移即 INVALID
  （该门不满足绝不判 VALID）；`Test Files` 行不再污染计数（只解析 `Tests` 汇总行），
  `FAIL [tag] path > name`（migrate 带 `|unit|` 项目标签）可解析。
- [needle-judge.selftest.mjs](needle-judge.selftest.mjs)：/tmp 沙箱包上 8 项断言——好针
  VALID（含绝对文件与完整 fullName 回显）、hash 漂移 INVALID、skip INVALID、混错（双失败）
  INVALID、零执行 INVALID、timeout INVALID、错名 INVALID、注入点非唯一 INVALID。全部通过。
- 五批代表针 11/11 重跑 VALID（A1 playSound 提交、A2 makeLoadScene pos 深拷贝、
  A3 在途换选帧数、B1 rename、B2 绑定态、C1 hint 重推导、C2 重开残留、D1 通道记账、
  D2 场景守卫、E1 干净 bundle、E2 codec round-trip）；每针输出含绝对 needle 文件与完整失败名。

## 5. 并集 17/43 + 回执 SHA + README 恢复

- [five-batch-union.md](five-batch-union.md) 按实际文件重算：**17 源新增测试 / 43 源
  existing-proof**（r1 的「20/40」是按组双计的口径错误），文件名与改名后一致。
- 五份批回执补记本批完整候选 SHA（A `1429e1b1b8…`、B `1af7883b48…`、C `0e05c34610…`、
  D `623aa49c10…`、E `8cb0af0ad2…`）。
- `README.md` 已恢复到派发基点 `ced193f4` 的原样（GLM 只读范围）。已知后果：`docs/check.mjs`
  报 7 条「目录索引未链接」（五份回执 + 并集清单 + 本证据文档）——按审查指示留待 Codex 验收后维护链接。

## 复跑门（R2 候选）

- 定向：editor 50/50（13 文件）、reforge 7/7、migrate 9/9。
- typecheck：editor / reforge / migrate 三包 `tsc --noEmit` 全部 0 诊断。
- 完整 `pnpm lint`：PASS 0/0/0（2666 files，complete report）。
- `git diff --check`：干净。`verify-targets.mjs`：exit 0。

## R3 反控命令（可复跑；--name 为完整失败名，精确相等）

判据：`node docs/testing/glm-large-wave/needle-judge.mjs <args>`；R3 起所有
INVALID/异常路径先删除 `.needle-tmp` 临时副本再退出（selftest 逐例断言零遗留），
FAIL 文件经 `resolve` 与被注入绝对路径全等、失败名与 `--name` 完整相等、汇总 failed 恰 1。

| 针 | --file --package | --name（完整失败名） |
|---|---|---|
| A1 | packages/editor/src/ui/command-form-control.glm-large-wave.test.tsx（editor） | `playSound picks a catalog sound and forwards onOpenSound with the stable asset id` |
| A2 | packages/editor/src/ui/command-form-world.glm-large-wave.test.tsx（editor） | `makeLoadScene field preservation > pos mode deep-copies the temporary position so later mutation cannot leak in` |
| A3 | packages/editor/src/ui/EnemyAnimPreview.glm-large-wave.test.tsx（editor） | `A06 敌人动画预览 > 在途换定义时旧加载完成不得以旧帧数覆盖新选` |
| B1 | packages/editor/src/ui/use-editor-project-session.glm-large-wave.test.ts（editor） | `B04 编辑器项目会话 hook > rename 经一次真实命令改显示名，不改文件夹身份` |
| B2 | packages/editor/src/ui/use-editor-project-session.glm-large-wave.test.ts（editor） | `B04 编辑器项目会话 hook > 初始绑定目录时报告 local 身份与干净脏态` |
| C1 | packages/reforge/src/script-chunk-store.glm-large-wave.test.ts（reforge） | `MemoryScriptResolver current semantics > 错误 hint 不掩盖正文：按稳定 id 重推导命中另一 chunk` |
| C2 | packages/reforge/src/dialog/dialog-box.glm-large-wave.test.ts（reforge） | `异槽共存推进后关闭，重开单槽对话不残留旧槽渲染` |
| D1 | packages/migrate/src/sound-reference-audit.glm-large-wave.test.ts（migrate） | `auditPalSoundReferences current ledger > 源位点与目标引用边分离记账，通道各归其类` |
| D2 | packages/migrate/src/pal-migration-io.glm-large-wave.test.ts（migrate） | `loadPalMigrationSources source-tree guards > 场景源数量偏离 295 时停止迁移并给出精确计数` |
| E1 | packages/content/src/validate-refs.test.ts（content） | `干净 bundle → 无 issue` |
| E2 | packages/reforge/src/save/current-save.current-characterization.test.ts（reforge） | `current SAVE8/content20 contract > round-trips the current envelope without mutating input or resetting world values` |

R3 复跑结果：11/11 VALID（输出含被注入绝对临时文件与完整失败名，跑后零 `.needle-tmp` 遗留、
生产源 hash 不变）；`needle-judge.selftest.mjs` 9 项（好针 + 7 类 invalid 反例 + 逐例遗留断言）
全部通过。--find/--replace 注入点原文见各批回执与提交历史（judge 要求注入点恰 1 次）。
