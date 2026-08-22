# A7-2 静态图闭包与 engine chrome 自包含结果报告

> 日期：2026-07-19
> 任务卡：[`A7-2-static-images-engine-chrome.md`](../../ops/tasks/A7-2-static-images-engine-chrome.md)
> 状态：**done**；Codex / Kimi / GLM 三方审查与用户验收均已完成。A7/R7 总体仍未完成。
>
> **后续勘误（2026-08-23）**：MIG-PAL-ACTOR-FACE-1 以 raw RLE 字节重新核实，盖罗娇对应槽是
> 全透明占位，不是有效 face。下文 `6 / 10,392 B` 等数字保留为当时验收记录；现行口径是
> `5 / 10,324 B`，且 `ActorDef.face` 缺席后由编辑器通用头像兜底。

## 1. 结果

A7-2 将资源所有权拆成两条互斥链：

```text
工程内容静态图
  content AssetId -> assets/index.json -> AssetResolver -> FileSource

引擎默认 chrome
  typed slot -> packages/reforge/src/engine-chrome/assets -> bundler URL
```

- `portrait`、`face`、`item-icon`、`battle-background` 的 content、runtime、editor、save/upgrade 与
  PAL migrate 都只保留 AssetId，不再保存数字号、目录或 filename fallback。
- 默认标题、Unifont、对话光标和 85 个 UI slot 由 engine-chrome registry 随 Reforge/editor play 引擎壳构建，不登记为工程资产，
  不进入 A5 工程 ZIP。工程标准颜色表仍是项目 role。
- `data/baked` 和 `baked-manifest.json` 已退出所有消费者。PAL ignored 二进制由
  `migrate:content -- --write` 按 catalog 确定性物化；`bake` 只重建 engine chrome。

## 2. 冻结数据

| kind | records | bytes | typed edges | unique referenced | unused |
|---|---:|---:|---:|---:|---:|
| portrait | 88 | 768,841 | 2,365 | 84 | 4（050/068/072/089） |
| face | 6 | 10,392 | 6 | 6 | 0 |
| item-icon | 233 | 262,667 | 233 | 233 | 0 |
| battle-background | 52 | 4,422,281 | 52 | 52 | 0 |
| **合计** | **379** | **5,464,181** | **2,656** | **375** | **4** |

PAL catalog 从 469 增至 **848** 条。全项目 typed 引用为 **5,676**，warning 54，missing 0，
kind mismatch 0。全 catalog 物理复核为 848 条记录 / 59,704,628 B，missing file、bytes mismatch、
hash mismatch 均为 0。

## 3. 项目模型与升级

- `PortraitSet.default/expressions`、对话 portrait、`setActorAppearance`、世界态 appearance、Actor face、
  Item icon 与 BattleField background 均为 AssetId；item 277 的旧 `0` 正式变为字段缺席。
- typed walker 覆盖 actor、scene/script、item 与 battle field，引用列表、删除保护、诊断与 deep link 共用
  同一真值。未引用记录只报 warning，但全 catalog 文件仍必须通过存在、大小和 SHA-256 校验。
- 旧 v3 四个 static family 在本地打开边界一次性迁移；已存在的 authored 同 AssetId 整条记录和 bytes
  保留，缺文件或坏 hash 在写盘前失败。旧存档 portrait number 使用与项目升级相同的确定性映射纯函数。
- MG2 在合并前规范化三侧旧引用，保护 authored 记录；正式 PAL 二次迁移为
  `writes=0 deletes=0 conflicts=0`。

## 4. 图像语义与编辑器

- 立绘、头像、物品图标保持 RGBA PNG；战场背景保持 320×200 灰度索引 PNG。
- 作者上传普通战场图时，编辑器按 `visual.standardColorTable` 做确定性最近色量化，并显示最终工程色彩；
  作者 UI 不暴露 palette、索引号或 R 通道协议。召唤换色继续对索引做原版低 nibble shift。
- 资源模块新增统一图像工作台：四类筛选、缩略图/像素预览、搜索、导入/同 ID 替换、改名、引用定位、
  受引用禁删、未引用删除、undo/redo、pending blob、保存重开与 expected-kind picker。
- battle background 深链
  `?module=asset&page=image&object=battle-background.pal.006` 可直接选中目标与引用；900 px 视口无横向溢出。

## 5. Engine chrome

- `packages/reforge/src/engine-chrome/registry.ts` 定义 85 个封闭 UI slot、默认标题、BDF、光标与许可证入口；调用点不再拼接站点根
  `/ui`。缺 slot、HTTP 或解码失败会携 slot fail-loud。
- `packages/migrate/scripts/bake-assets.mts` 可复现生成 85 个 PNG / 48,629 B、默认标题与对话光标；
  `PROVENANCE.md` 记录 PAL 派生源、SHA-256、Unifont 来源及 OFL/GPL embedding exception 许可文本。
- Reforge standalone 与 editor play 共享同一 registry；`vite build --base=/a7/` 和
  `vite build --base=/a7/editor/` 均由 bundler 产生相对 base 的哈希 URL，无站点根 `/ui`、`/baked`。

## 6. 验证证据

已执行：

```bash
pnpm --filter @type-pal/content run check
pnpm --filter @type-pal/reforge run check
pnpm --filter @type-pal/editor run check
pnpm --filter @type-pal/migrate run check
pnpm --filter @type-pal/migrate run migrate:content
pnpm --filter @type-pal/migrate run bake
VITE_PROJECT_ID=pal pnpm --filter @type-pal/reforge exec vite build --base=/a7/
VITE_PROJECT_ID=pal pnpm --filter @type-pal/editor exec vite build --base=/a7/editor/
git diff --check
```

最终 `pnpm check` 全绿：content 241、reforge 431、editor 421、migrate 223 passed + 1 skipped，另有
shared 111、pal-extract 246、game 2,289；Biome 检查 759 个文件无问题。

浏览器检查：

- editor `6010`：四类数量 88 / 6 / 233 / 52，battle background deep link、引用定位和工程色缩略图正常；
  900×700 时 `scrollWidth === innerWidth`。
- reforge `6051`：PAL 默认开局与 `?scene=s066` 正常，控制台 0 error；四类静态图只从
  `projects/pal/assets/migrated/**` 读取，未请求 `/baked`、站点根 `/ui`、旧 portraits/font/dialog 清单。
- production：临时按部署形态挂载 PAL 工程后，`/a7/?scene=s066` 与
  `/a7/editor/play.html?project=pal&scene=s066` 均为 0 console error、0 404/500；BDF/UI 与工程图分别从
  当前 base 下的 bundle/project 路径加载。
- 截图在 `output/playwright/a7-2-editor-image-battle-background-final.png`、
  `output/playwright/a7-2-editor-image-narrow.png`、`output/playwright/a7-2-reforge-title.png`、
  `output/playwright/a7-2-reforge-s066.png`、`output/playwright/a7-2-reforge-non-root-production.png`、
  `output/playwright/a7-2-editor-play-non-root-production.png`。

review 签字结果在任务卡记录。

## 7. 明确保留到 A7-4 的缺口

- `tileset`、`sprite`、`battle-sprite`、`effect-sprite`、`image` 五个 legacy family 尚未迁入 catalog。
- clone/seed 已退出 baked 清单，但仍需 extracted 清单复制上述 legacy；catalog-only clone、另存与 ZIP 闭包
  以及 contentVersion 4 尚未完成。
- 全 catalog 文件校验已有公共能力并用于迁移/测试；保存、导出与显式“检查工程”的统一重哈希门禁仍需 A7-4 接线。
- engine chrome 的 PAL 派生默认美术仍受 R8 替代范围约束；本卡记录来源，不等于获得新的发行权利。

因此 A7-2 切片已完成，但不能把 A7 或 R7 标成 done。
