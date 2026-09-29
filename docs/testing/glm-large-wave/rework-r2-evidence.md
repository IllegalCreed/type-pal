# TEST-GLM-LARGE-WAVE-4 · R2 返工逐项证据（对 codex-review-8cb0af0a.md）

返工候选：`codex/glm-large-wave-r1` 新的完整 HEAD（见返工提交）；基点 `8cb0af0ad2e5952c01e8fa95144b495df4ceaecc`。
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
  报 6 条「目录索引未链接」（五份回执 + 并集清单）——按审查指示留待 Codex 验收后维护链接。

## 复跑门（R2 候选）

- 定向：editor 50/50（13 文件）、reforge 7/7、migrate 9/9。
- typecheck：editor / reforge / migrate 三包 `tsc --noEmit` 全部 0 诊断。
- 完整 `pnpm lint`：PASS 0/0/0（2666 files，complete report）。
- `git diff --check`：干净。`verify-targets.mjs`：exit 0。
