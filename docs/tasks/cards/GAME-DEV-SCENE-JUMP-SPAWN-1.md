# GAME-DEV-SCENE-JUMP-SPAWN-1 — 开发跳转落点避开移动边界

Status: done
Owner: Codex
Coding Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-05
Template: task-card-v1 / 1.0.0
Phase: phase1
Branch: codex/code-quality-94-102
Visual Verification Timing: dev-functional（真实数据与加载/移动入口；未做浏览器观感验收）

## 目标

修正开发面板scene-86的备用落点，使跳转后至少能正常走出当前位置。正常剧情入口、地图碰撞规则与存档保持原样。

## 范围

父批[QUALITY-PHASE1-PENDING-93-1](QUALITY-PHASE1-PENDING-93-1.md)。候选限`dev/fixtures/scene-jumps.json`中scene-86的partyStart，从(80,1048)改为(176,1048)，并更新该条取证说明；`dev/scene-jumps.pal.test.ts`补正式回归。不得借此修改其它93处备用坐标、场景编号、加载流程或产品移动规则。

## 前提与证据

全文核跳转表295条（294个不同资源场景，scene-15-mob为别名）及所有字段。295条mapNum与实际scene资源一致。94处备用点单核地形均可站立，但按实际队首移动的range=true复核，scene-86的x=80落在左侧不可进入带。

真实链：dev-panel::applySceneJump透传partyStart → scene-loading::loadScene（资源86/地图93，wNumScene=87，先跑onEnter再覆盖起点）→ scene-system::tickSceneInput → scene-collision::isWalkable(...,true)。四方向下一格x仅64/96，均小于左边界160，实际入口四次仍停(80,1048)。一手边界是SDLPal `PAL_CheckObstacleWithRange`及当前已核移动合同，不改变它们。

仓外唯一原件归父批归档。`scene-jump-range-candidates`使用真实scene/map/global脚本、实际loadScene与四方向输入：旧点四向不能移动；候选(176,1048)四向均能移动；中间候选(160,1040)仅两向可走。候选保持原等距网格相位，未改真实数据。正式回归首跑jsdom的文件URL TypeError是测试环境装配错误，已单独留勘误；Node环境业务红例以对应原生报告为准，不混算。

## 验收

先保留正式业务失败原件，再改唯一落点，恢复真实加载/移动回归；相邻scene-loading、dev面板和夹具验证同步。测试须断真实位移，不以仅检查JSON字段或isWalkable mock算成功。相关静态门和整批重型门随父卡；未跑不预填。浏览器演出或剧情E2E不由本卡自动授信。

## 状态与交接

2026-11-05用户批准“修正这一条调试落点”。Codex build allowed，仍是唯一Coding Owner；只将scene-86备用起点向右96px并核正式回归。原partyStart确有生产consumer，不按dev-panel旧“已删除”注释误删。原红例与候选探针保留，不借批准改其它场景或碰撞规则。

2026-11-05本地复核：只改scene-86备用x=176及该条说明；正式回归核四向实际位移，原业务红转绿。dev-panel两处失实注释同步更正，不改caller行为。完整A–H与原件指针见[父批回执](../evidence/QUALITY-PHASE1-PENDING-93-1/README.md#回合开发落点与资源宿主最后4个原主体)。统一门与集成随父批，未完成前保持review。

2026-11-05有限交付收口：本卡当前合同及获准差异已由Codex据证接受，原失败/历史撤回不恢复；集中组成门和唯一原件归[父批](QUALITY-PHASE1-PENDING-93-1.md)与[回执](../evidence/QUALITY-PHASE1-PENDING-93-1/README.md#集中门最终组成与必要返工)。本地验收不预报PR/main未来结果，发布按同分支保护检查执行。
