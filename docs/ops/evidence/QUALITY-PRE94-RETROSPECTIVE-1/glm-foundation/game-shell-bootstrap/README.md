# game-shell-bootstrap(bootstrap.ts + audio.ts)八维复审批

- 批次:pre-94 foundation 模块 9 批 22(shell 模块收口批)
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 50+ 提交)
- Coding Owner:GLM;bootstrap.ts 1934 行全文读毕 + audio.ts 323 行全文读毕
- 整改类型:纯注释 3 处(B 维,bootstrap.ts 一文件),零代码改动 — body-invariance `allEqual: true`

## 整改清单

| # | 位置 | 问题 | 修正 |
|---|---|---|---|
| 1 | bootstrap.ts L356-358 | "M4 简版 fallback 3…M5 真做时按 PlayerRoles[leaderRole].walkFrames 取"未来注过时 — present.getPartyWalkFrames(present.ts:113-124)已实现 per-role 真值链(runtime → playerRoles → 兜底) | 改述现架构:本值仅为 ctx 兜底,真值链在 present |
| 2 | bootstrap.ts L609-611 | "M5 把 sprite 数据装这里,present 切到从 sceneAssets 取"未来注 — 该计划未实施且 closure 共享 npcSprites map 已是定案架构(present 全读 ctx.npcSprites) | 改"定案的架构,不再计划切到从 sceneAssets 取" |
| 3 | bootstrap.ts L1860 | "其余 boot 资源(~3200 个请求)"过时 — 2026-06-22 资源管线优化后 ~800(boot-loading.ts EXPECTED_BOOT_REQUESTS=810 自己记录,含实测校准史) | 改"~800(优化后;曾 ~3200)" |

## 零整改面

- **audio.ts(323 行)**:L46 SFX 同号去重(sound.c:769-772 lastSFX 语义:未播完复位/挂起复位三臂全注)、L47 真实 loop 补播、DM29 战斗入场静默序、OGG 后端 release 释放论证 — 零缺陷。
- **bootstrap.ts 其余 1931 行**:全部 handler 注入(setSceneLoader/setMapReloader/setObstacleChecker/setStartBattleHandler/setRngPlayHandler/setShowFbpHandler/setScrollFbpHandler/setEndingAnimationHandler/setQuitHandler/setLoadGameHandler…)、loadSceneCommon 双路径(fromSavedGame 边界全集:DM25 屏波清/0x6D override 直用/读档 palette 黑屏 guard/DH7 读档解毒/L6/L7 复位)、DOS 结局全片编排(ending.c:420-511 逐 beat 配乐锚)、playDosOpening(M15 DOS FBP 0x26/0x27 真值)、H1 新游戏复位 — 真值锚密度全仓最高,零缺陷。

## 验证

- body-invariance:bootstrap.ts printedSha256 一致 → [body-invariance.json](body-invariance.json)
- 定向 8 文件(bootstrap×5 + audio×3):**23 套件 41/41,0 failed suites** → [directed.json](directed.json)
- `tsc --noEmit -p packages/game`:exit 0;scoped biome 0 诊断;`git diff --check` 干净

## 登记项(交 Codex)

1. `SceneAssets.npcSprites` 接口字段定案为不装数据(bootstrap 传空 map 满足接口)— schema 清理候选(批22新增)
