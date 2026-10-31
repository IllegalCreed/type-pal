# game assets 三文件复审（glm-foundation 模块 4 批 1）

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

本页审计主题:game 的 src/assets/{loader,dialog-assets,tileset-blob}.ts(501/118/150 行)复审;基点 53db76bbb 线(body 基准=extract 尾批提交后 HEAD)。原文 Status: review(候选待 Codex 据证验收)。Codex 当前裁定(2026-10-19):本页保留作者阶段证据,未获整包/全维收口验收;可复用范围与逐文件依据见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 范围与证据

改动 1 处仅注释。验证证据:body-invariance(同目录)三文件一致;定向 6 文件 19 套件,directed.json 原生计数 38 passed+6 pending(原文短回执曾写 38/38、0 failed-suites,见下方 2026-10-20 勘误);scoped biome 0/0/0;diff --check 干净。未跑 game 全包/全仓门(按准入)。

## 发现

整改:loader.ts 战斗资源注释块仍写『逐条加 battle-sprite-*.json + PNG』——与 15 行之下的 .rle 管线注释自相矛盾(实际 L246-248 走 gzip RLE blob);『T28 整合时再修』远古将来时改为既定降级策略表述。八维要点:tileset-blob gzip 魔数双解压防御(chunk 首字节不可能 1f 8b 的推理成立)、DecompressionStream 环境守卫、分块拼接正确;dialog-assets portrait 逐条 warn+skip+整体降级空 map;loader 核心表 fail-hard/视觉资源降级的分层失败策略清楚,SceneAssetsCache LRU 命中刷新 MRU、protect 防黑屏、退化配置(maxEntries=1)边界已注明,splash 71/73 常载与 mapNum 链路正确。无新直接缺陷。登记(不动):DialogSprite 与 IndexedImage/SpriteAsset 同构(头注自认同结构共享渲染)——统一属接口变化,Codex 裁定;loader『三处 npc 加载共用』计数类注释随 caller 演化须复核(低优先 nit)。

## 结论

注释整改批(1 处):38 例断言绿+body-invariance 三文件 AST 一致证明源码零行为变。但定向计数必须按两态读:6 个 blob 真值对拍(rng 1+sprite 5)在缺 raw 盘输入时显式 skipped,0 failed 不等于零 skip,该 6 项不取得对拍信用。

## 整改与复核

Codex 2026-10-20 剩余29文件返工勘误:原生 directed.json 实为 38 passed+6 pending;此前 0 failed 不等于零 skip;新增文案只描述 loadAll 当前 warn+skip,不再称既定可玩策略;缺 blob 输入的 6 项不取得对拍信用。逐文件八维、原件与限制见 [codex-final29.json](../codex-final29.json);本节不接收原文整包/模块收口宣称。复验入口(原页给出,此处概述):在 packages/game 定向跑 loader/tileset-blob/rng-blob-snapshot/sprite-blob-snapshot 四测试;prove-body-invariance.mjs 以 loader.ts 最后提交为 base 对三文件。失效条件:三文件实现变化→重证;blob 管线/CDN 行为变化→双解压防御注释复核。本轮治理未重跑任何命令;候选待 Owner 接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3811B / SHA-256 35317777abd36d10512fff4a320084f8aac03c78d4e95e3ebb068eccf26c2bc9；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
````markdown
# game assets 三文件复审（glm-foundation 模块 4 批 1）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

Status: review（候选待 Codex 据证验收）
Owner: GLM；基点 `53db76bbb` 线（body 基准=extract 尾批提交后 HEAD；本轮 fetch 一次 SSL 瞬断已记录,origin 仍 53db76bbb）
范围：`game/src/assets/{loader,dialog-assets,tileset-blob}.ts`（501/118/150 行）。开工核对四个已登记 worktree 无 game 未提交修改。

## 短回执

- **改动 1 处（仅注释）**：loader.ts 战斗资源注释块仍写"逐条加 battle-sprite-*.json + PNG"——与 15 行之下的 .rle 管线注释自相矛盾（实际 L246-248 走 gzip RLE blob）;"T28 整合时再修"远古将来时改为既定降级策略表述。tileset-blob/dialog-assets 零缺陷零改动。
- **验证**：body-invariance 三文件一致；定向 6 文件 **19 套件 38/38、0 failed-suites**（loader/tileset-blob/rng+sprite blob 真快照/dialog 三合同——含 gzip 双解压防御与真 blob 解码链）；scoped biome 0/0/0；diff --check 干净。未跑 game 全包/全仓门（按准入）。

## 八维结论

| 维 | 结论要点 |
|---|---|
| A | tileset-blob:gzip 魔数双解压防御（chunk 首字节不可能 1f 8b 的推理成立）、DecompressionStream 环境守卫、分块拼接正确。dialog-assets:portrait 逐条 warn+skip + 整体降级空 map（可玩性优先,注释与行为一致）。loader:核心表 fail-hard/视觉资源降级的分层失败策略清楚;SceneAssetsCache LRU 命中刷新 MRU、protect 防黑屏、退化配置(maxEntries=1)边界已注明;splash 71/73 常载与 mapNum 链路正确。无新直接缺陷。 |
| B | 本批修 1 处（见短回执）。三文件头部/字段的 sdlpal 锚与管线沿革注准确（双解压防御/锚点同源/LRU 设计理由）。 |
| C/D | assets→shared codec 单向;loader 总装不重复解码逻辑;tileset-blob 为唯一 blob 解码入口（bootstrap 复用）。**登记**：`DialogSprite` 与 IndexedImage/SpriteAsset 同构（头注自认"同结构共享渲染"）——统一属接口变化,Codex 裁定。 |
| E | 38 例含真 gzip blob 解码快照（rng/sprite-blob-snapshot）与 loader 组装/边界/恢复三合同（grok-r1 家族,3h 期已判别力核验,源未变复用）。 |
| F/G/H | 分段清楚;出口全有 bootstrap/render 消费;IO 边界集中在 fetch/decompress,纯解码可直测 ✓。 |

## 登记（不动）

DialogSprite 接口同构统一候选;loader "三处 npc 加载共用"计数类注释随 caller 演化须复核（低优先 nit）。

## 复验入口（只读）

```bash
WT=~/.glm-worktrees/pre94-foundation
cd "$WT/packages/game" && ../../node_modules/.bin/vitest run src/assets/loader.test.ts src/assets/tileset-blob.test.ts \
  src/assets/rng-blob-snapshot.test.ts src/assets/sprite-blob-snapshot.test.ts
node "$WT/docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/prove-body-invariance.mjs" \
  --base $(git -C "$WT" log --format=%H -n1 -- packages/game/src/assets/loader.ts) \
  packages/game/src/assets/loader.ts packages/game/src/assets/dialog-assets.ts packages/game/src/assets/tileset-blob.ts
```

失效条件:三文件实现变化 → 重证;blob 管线/CDN 行为变化 → 双解压防御注释复核。


## Codex 剩余29文件返工（2026-10-20）

原生 directed.json 实为38passed+6pending；此前0failed不等于零skip。新增文案只描述loadAll当前warn+skip，不再称既定可玩策略。缺blob输入的6项不取得对拍信用。

逐文件八维、原件与限制见[本轮回执](../codex-final29.json)。本节不接收原文整包/模块收口宣称。
````
<!-- incremental-original-source:end -->
