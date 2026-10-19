# 批46:reforge render/assets/world 族 15 文件（零整改批）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

范围：`render-scene.ts`(42)、`deferred-trigger.ts`(82)、`motion-batch.ts`(82)、`entity-walk.ts`(95)、`world-camera.ts`(118)、`follower.ts`(158)、`entity-lifecycle.ts`(208)、`motion-runtime-coordinator.ts`(211)、`motion-runtime-wiring.ts`(222)、`world-scene-presentation.ts`(370)、`render.ts`(619)、`assets.ts`(621)、`entity-action-player.ts`(781)、`world-motion-runtime.ts`(783)、`entity-motion.ts`(1403)。全文读毕。八维审查（A–H）全部通过,零源码改动、零 diff。

## 逐件结论（要点）

- **render-scene**:纯绘制函数单一真源(编辑器复用零漂移);renderer 与目标 context 一致性守卫。
- **deferred-trigger**:单落地认领状态机;"认领已提交、触发后送达"与 NPC 世界运动解耦;deliveryFence 保证新触发至少一个微/宏任务执行机会。
- **motion-batch**:计划器纯函数,副作用边界显式线性化(canonical 先于 live,touch 先于 post-contact,continuation 最后);MotionCompletionRecord 双边界(持久提交/迟唤醒分离,commit 后 detach 不可回滚)。
- **entity-walk**:SPEED_GRID 按 100ms tick 折算;facingToward(投影像素象限)与 interactionFacingToward(play.c 零轴平局差异)分离各带出处;walkTick 只在剩余距离完整容纳于一拍时判达(不吸附无关轴)。
- **world-camera**:只拥有相机运动,不捕获场景(每拍读 live player/bounds);pan 的新旧替换与 abort 清理对称。
- **follower**:1:1 移植一阶段 follower-pos;BASE_SLOT=2 有 live 实测校准注(勿改回 1);pushTrail 记「离开方向」的拐弯甩尾是 2026-07-07 双轨迹对比定案;两处静态冗余条件(m===2 块内三元复测/trailing if(s.walking))按移植忠实性接受不改。
- **entity-lifecycle**:static def → entityState 覆写 → lifecycle 的唯一 gate 派生顺序;四叶纯 reducer 输入表不可变;advanceEntityLifecycleWorldStep 先推进再只查步前 awaitingExit(最后一拍守源 continue 语义);320×320 重现边界 0/320 仍隐藏。
- **motion-runtime-coordinator / wiring**:authority epoch/slot 注册表/committedAutoContinuation 三表身份一致;partyBodyContactDistance 加权等距像素足迹非方格半径;terminateLifecycleMotion 精确 activation epoch 防陈旧 lineage 中止替代激活;teardown 顺序钩子完整。
- **world-scene-presentation**:renderedEntityFrames 区分「选中帧」与「瞬态命令计数」(E2E 证据语义);帧选择链 override>gait>explicitAnimation>actionFrame>loop>idle 逐级回落;wave 路径 skipCover 烘焙 + 主画布 skipBase 叠加;partySprite baseYBias=-0.01×idx 平同 Y 平局。
- **render**:高度感知 baseY cover-tile 模型(port PAL_CalcCoverTiles);五邻候选+高度门注释带 scene.c:156 锚;OcclusionLatch 迟滞只存候选载荷不存角色帧;revealParty 设备分辨率 scratch 用宿主精确变换含相机取整;+7 统一落点偏移集中于 spriteBlitRect 单一真源(2026-07-07 编辑器漏 +7 教训锚)。
- **assets**:record snapshot 防异步期间混读替换前后字段;profile 只由 record.origin 决定(禁按 AssetId 选容错);两缓存(sprite/battle-sprite)同 AssetId 共享解码 promise、签名失效、失败自动驱逐;战场背景 R=G=B 索引契约逐像素校验;bakeBgImageData 调色板级 nibble 染色带 battle.c:62-80 锚。
- **entity-action-player**:时间轴-only(不读 DOM/全局壁钟);restore 前全量校验(base/override/completed 三槽各自不变量,fail 带 entity.slot 定位);awaitingRestoredPlay 防 auto once-action 超前于重入续体;loopFrom 启动段相位 pendingLoopStartAtMs 只在进入循环首刻应用。
- **world-motion-runtime**:cadence 累加器(丢帧钳制防螺旋);registerMove 的 restored 续体五字段精确匹配才继承 slow 节奏;scriptGaitHandoff 严格十条件守卫(pos/session/epoch/activation/非终点);markGait/advanceExplicitAnimation 保留原版单一 wCurrentFrameNum 语义(0x87/0x0F/0x14/0x6C 共寄存器);trace 环形 4096 上限。
- **entity-motion**:纯规划器(无场景/runner/promise/持久状态);精确 L-infinity 相对最小距离(四候选时解析解);「已有重叠必须改善且任一改善即合法」的复合逃逸语义;公平环按稳定 actor 集合键(不按叶 epoch);候选求解器有限步收敛上界证明(maximumProgress);fail-closed 逐相位重放不变量(提交前抓陈旧依赖/同相位交叉/终点重叠);玩家被动让位四方向试探各带 primary-only 复核。

## 登记移交（无新增）
本批无新清理候选。

## 验证
- 定向测试:34 个测试文件 363/363、numFailedTestSuites=0（directed.json）。
- 零 diff 批:无源码改动,不适用 body-invariance。
