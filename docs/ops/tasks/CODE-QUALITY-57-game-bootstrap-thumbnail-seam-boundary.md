# CODE-QUALITY-57 — game bootstrap thumbnail seam boundary

Status: review
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 game/shell
Visual Verification Timing: functional-ui（缩略图/小地图功能性画面；不做剧情 E2E）

## 目标

逐文件核验 bootstrap 启动编排、相关测试与地图缩略图路径，确认资源加载、场景切换、thumbnail caller、framebuffer ownership 与 SDLPal scene 真值一致；明确 `renderMapThumbnail` 未调用 `repairTilemapSeams` 是否属于可直接修复的工程缺陷，还是需要用户/视觉证据裁决。

## 范围

- `packages/game/src/shell/bootstrap.ts`
- `packages/game/src/shell/bootstrap-load.test.ts`
- `packages/game/src/shell/bootstrap.glm-next-wave.test.ts`

只读相邻 caller/oracle：`packages/game/src/dev/dev-panel.ts:361-371,1161-1180`、`packages/game/src/tools/minimap.ts:247-481`、`packages/game/src/tools/tools-panel.ts:50-55,914-917`、`packages/game/src/present/draw-tilemap.ts:87-204`、`packages/game/src/present/present.ts:290-311,679-690`、`packages/game/src/shell/bootstrap-resources.ts`、`packages/game/src/shell/bootstrap-resources.test.ts`、`reference/sdlpal/scene.c:452-491`、`docs/phase1/engineering-notes.md:93-100,137-140`、`CLAUDE.md:129`。

## 前提真值门

- 一句话行为 / 工程前提：bootstrap 负责资源与生命周期 ownership，thumbnail 是 dev/tools 的离屏 map projection；主 gameplay present 的 seam repair 是 type-pal 对每帧 clear 的补偿，不自动等于 thumbnail 的产品视觉合同。
- 原版/primary source：`reference/sdlpal/scene.c:467-491` 的 `PAL_MakeScene` 先在持久 `gpScreen` 上画两层 map，再 wave、sprites；原版没有独立 static thumbnail API，故 thumbnail 视觉形态为 `N/A`，需以当前工具 caller 和用户可见目标核定。
- 第一阶段当前实现：`bootstrap.ts:661-760` 建立 thumbnail cache/并发门/离屏 framebuffer，`:687-705` 两层 draw；`:1104-1106` 注入 minimap；`present.ts:290-311` gameplay 才传 coverage 并 repair；`bootstrap-load.test.ts` 与 `bootstrap.glm-next-wave.test.ts` 只覆盖公开 helper/showError/启动失败端口，不驱动完整 bootstrap 或 thumbnail closure。
- 当前二阶段目标：只登记逐文件证据与 seam boundary；不改变地图资源、schema/save、启动时序或用户可见缩略图，除非补齐可证伪像素反例与明确视觉裁决。
- 当前 `before -> after`：thumbnail 两层直绘、无 seam repair，是否应与 gameplay 补偿一致仍 unknown -> 证据化为 review；若决定修复，必须另开实现卡并先写真实 thumbnail 反例。
- 最强替代解释 / 可证伪观察：透明 tile seam 在完整地图缩略图降采样后可能不可见，或邻居 dilation 会把真实透明沟槽涂平；需要真实 tileset/map 像素对照或用户视觉验收推翻/支持修复前提。单看 gameplay 的 map76 黑三角不能证明 thumbnail 必须同样修。

## 上下文锚点与风险

- bootstrap.ts 同时拥有音频、scene loader、save/load、modal、dev panel、minimap 与 RAF 资源；本批只把缩略图边界登记为 review，不能把整文件包绿推为已验证。
- `repairTilemapSeams` 使用 coverage mask，不可用 `indices===0` 判断；若未来接入 thumbnail，必须为两层 draw 传 coverage，并验证离屏大 framebuffer 的边缘 fence 与 dilation 不越界。
- 缩略图由 dev panel IntersectionObserver 和生产工具面板 minimap 共享；改变其内容会影响用户可见工具 UI，进入 build 前需要真实 caller/oracle 与视觉证据。
- 本批不改实现文件；发现 schema/save、资源管线、启动可玩门或公共接口变化立即停线。

## 验证

- 完整读取：bootstrap.ts 1931 行；两个范围测试；dev-panel/tools-panel/minimap/draw-tilemap/present caller 与 SDLPal primary 已读取。
- 定向：`bootstrap-load.test.ts`、`bootstrap.glm-next-wave.test.ts`、`bootstrap-resources.test.ts`，共 6 tests 通过；这些只证明公开 helper/资源端口，不证明 thumbnail closure。
- 当前结论：留在 review，未运行本卡专属全仓收口门；不得以现有包级全绿关闭 bootstrap.ts。

## 当前模式推进记录

- Codex 范围/前提核验: counter（已证主 gameplay seam repair 与 bootstrap thumbnail 直绘存在边界，但缺真实 thumbnail 像素 oracle，不能安全改行为）
- 受委派 Coding Owner / 隔离分支: Codex / `/Users/zhangxu/illegal/type-pal-quality-3x` / `codex/code-quality-3y`
- build 准入: review only；不得修改实现或标记 done
- 贡献者交付/自验: N/A
- Codex 独立验收: pending / review
- 用户产品裁决/体验验收: pending（是否要求 thumbnail 与 gameplay seam 补偿一致）
- done 准入: blocked by missing thumbnail pixel oracle / visual decision

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-57 game bootstrap thumbnail seam boundary
任务卡：docs/ops/tasks/CODE-QUALITY-57-game-bootstrap-thumbnail-seam-boundary.md
当前状态：review；不得开始实现或标记 done
先读：本卡、AGENTS.md、CLAUDE.md、bootstrap.ts:661-760/1104-1106、draw-tilemap.ts:87-204、present.ts:290-311、reference/sdlpal/scene.c:452-491、engineering-notes.md:93-100/137-140
请做：独立确认 thumbnail 是否有真实透明 seam 反例、当前 dev/minimap caller 的可见目标与是否需要用户裁决；若要修复，先写失败像素反例与单独 build 卡
不要做：不得把 repairTilemapSeams 直接接入 bootstrap、不得改地图 schema/save/启动时序/公共接口
输出：primary/caller/oracle 证据、counter/用户待裁决问题；未补证据前保持 review
```
