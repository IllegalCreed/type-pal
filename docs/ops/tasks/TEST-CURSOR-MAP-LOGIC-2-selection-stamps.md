# TEST-CURSOR-MAP-LOGIC-2 — 地图与组合块纯逻辑六组补测

Status: rework
Owner: Cursor
Reviewer / Integration Owner: Codex
Phase: phase2
Visual Verification Timing: N/A（纯函数/真实patch，不宣称浏览器拖拽或布局）
Production Base: `a95618fc`
Branch: `codex/cursor-map-logic-r2`

## 准入与前提

### 2026-09-27 Codex接收070d3bf3

**counter / CM1–CM4**，见[独立接收与可转交提示词](../../testing/cursor-map-logic-r1-review.md)。
30新增/105定向相邻/全editor3049/TC/Biome/原六针独立通过，地图三工厂通过正式guard。
但实际输入保真两针与组合高度丢失一针候选仍绿；judge接受缩进混错，EditorState为强转假状态，
双组哨兵/精确结果与去重声明需修。已转rework，候选未合入、不计官方覆盖；产品/旧测试/配置不改。

2026-09-27用户授权Cursor继续补测、Codex转E2E讨论，Codex核本包build allowed。
当前消费者MapMode.tsx:644/651实际调用planMapPaste/planStampGroupMove；组合草稿与放置均为现行core入口。
六目标冻结分支命中共701/827，126未命中；只是选题池，不是必须新增126臂。
[共同规则/冻结账](../../testing/background-tests-20260927/README.md)。
第一阶段/原版N/A：本包仅当前编辑器模型；不改变地图坐标、碰撞或走位语义。
最强替代解释为既有boundaries已经证明；必须先去重，不把不可能输入当真实用户路径。

## 六组连续工作

| 组 | 生产模块与公开入口 | 范围 |
|---|---|---|
| M1 | stamp-draft.ts :61/213/269/288/294/334/391 | 规范化、视觉/碰撞编辑、改锚/resize/选区移动/边界计算剩余；合法模板先过guard |
| M2 | map-selection.ts :250/288/327/373/543/623/647/714 | selection/reducer/crop/hit与摘要；精确层/点/id，不只长度 |
| M3 | map-transform.ts :131/333/404/478 | 真实clipboard→paste/delete/move，剩余目标/冲突/越界组合；失败全空patch及输入保真 |
| M4 | stamp-group-transform.ts :92/419/466/488 | 组合clipboard、移动/复制/删除计划剩余；原成员及非目标哨兵、稳定ID |
| M5 | stamp-placement.ts :124/144/152 | 放置ID/高度/计划剩余，真实地图与组合模板，精确patch与合法正控 |
| M6 | stamp-ownership.ts :80/92/127/182/186/191/231 | 对真实地图查询owner、索引继承/增量与真实编辑后结果；通过公开查询比前后，不反射WeakMap私有缓存 |

优先中低复杂确定性输入；不改MapMode/Canvas，不操作6010，不接管Codex帧动画UI测试。
已有map-transform.boundaries完整map/clipboard快照、stamp-draft.boundaries层门、stamp-group-transform.boundaries
必须精确去重。禁止仅更换数字/名字复制一遍旧测试。

## 唯一白名单

- `packages/editor/src/core/{stamp-draft,map-selection,map-transform,stamp-group-transform,stamp-placement,stamp-ownership}.background.test.ts`。
- `packages/editor/src/core/__tests__/cursor-map-logic-fixtures.ts`（可选）。
- `docs/testing/cursor-map-logic-r2/**`及本卡Cursor交付追加块。
- 产品/旧测试/共享fixture/配置/排除/超时/资产/基线/索引全部不改；不改运行时、E2E与其他贡献者测试。

构造走buildBlankProjectMap/实际绘制和组合公开函数，适用validateProjectMap/validateStampTemplates必须先过。
实际map/clipboard/draft每次调用前独立快照，调用后立即比较；成功计划用真实patch应用核业务，不能只看canApply。
不能把计划器返回新对象就解释成已提交。若现行API有特定原地合同先核源码与旧测试再断言。
4–6单点反控，每针只删一门或改一产物字段，候选自身AssertionError、确切file/fullName、拒超时/环境红。
整包定向/相邻六模块旧套件、editor TC、改动Biome/docs/diff；不跑全仓check或任何coverage。
疑似产品bug隔离诊断，不改预期迎合；不为覆盖率新增或放宽产品接口。

## 交接

从含本卡的最新origin/main独立worktree/上述分支开始，旧Cursor目录已清理。
六组连做，重复/无可达新增项如实existing-proof，不凑数量。receipt/evidence按新鲜JSON逐文件登记。
完成提交推送完整SHA；不合main、不标done、不代签。Codex独立验收并安排统一门禁。

## 作者交付

2026-09-27。M1–M6 已连续补测并提交，未合 main，未标 done。Status 保持 build。Codex 验收 pending。

- 工作树 `/Users/zhangxu/illegal/type-pal-cursor-map-logic-r2`，分支 `codex/cursor-map-logic-r2`
- 生产冻结 `a95618fc2a9586c77ff42ff253f72fcfba1fa09a`；准入 `7de01ea6`
- 6 份 background + 可选 fixture；产品六模块相对冻结空 diff
- 背景 JSON 6 files / 30 tests；定向+相邻 17/105；editor 359/3049
- 6 针 ok+hit、`redExit=1`、`hashUnchanged`
- 回执 [receipt.md](../../testing/cursor-map-logic-r2/receipt.md)

```bash
cd /Users/zhangxu/illegal/type-pal-cursor-map-logic-r2
env -u NODE_COMPILE_CACHE node docs/testing/cursor-map-logic-r2/module-mutants.mjs --self-test
env -u NODE_COMPILE_CACHE node docs/testing/cursor-map-logic-r2/module-mutants.mjs
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor typecheck
env -u NODE_COMPILE_CACHE pnpm --filter @type-pal/editor exec vitest run --passWithNoTests --maxWorkers=2
```

作者自验：背景 6/30；定向+相邻 17/105；editor 359/3049；6 针 ok+hit。不能替代 Codex 独立验收。

## 作者返工

2026-09-27。只闭 CM1–CM4，已核项不重开。不合 main、不标 done。Status 保持 rework。

- CM1：六文件逐调用前 `structuredClone`，成功/拒绝后立即比同一原对象
- CM2：双组移动钉精确成员/tile/source/height/collision 与未选普通哨兵；删除与旧 `stamp-group-transform.test.ts:152` 重复的单组 copy，记 existing-proof
- CM3：`isErrorHeader` 用 `trimStart`；自测拒绝空格/tab 缩进混错（17 项）
- CM4：`buildBlankProject` → loader → `toEditorState`，只核 `validateCurrentManifestStartup`；修正重叠平移/哨兵标题
- 回执按新鲜 JSON：背景 6/29；定向+相邻 17/104；editor 359/3048
- 产品/旧测试/配置/基线/Codex 见证未改
