# 批50:reforge main.ts 6710 行（零整改批,reforge 包收口）

范围：`packages/reforge/src/main.ts` 全文读毕(六段:1-1100/1100-2250/2250-3450/3450-4650/4650-5750/5750-6710)。八维审查（A–H）全部通过,零源码改动、零 diff。

## 结论(组合根质量)

- **bootGame 可复用启动函数**:模块级零 DOM/location(barrel 导出后 node 测试可 import);shop-trial/battle-trial 旧参数拒绝门;入口点/主菜单/读档/直开战斗/dev 参数(?scene/?pos/?party/?give/?field/?battle-scene)六条启动路径各自收口。
- **canonical 单一权威纪律**:world 是唯一当前世界;runtimeScript 是投影 scratch 绝不回填;replaceWorld 原地替换保留 canonicalScript 引用身份;七类 AsyncIntentController(world/load/sceneSwitch/scriptMutation/party/actorSprite/actorAppearance)全捕获-校验。
- **世界拍与运动组合**:advanceMoves 单一 100ms 快照统一规划(玩家/NPC/hostile/被动让位),commitMotionBatch 六段线性化(canonical endpoint 先于 live 位置,touch 优先接管,continuation 最后);chase 四相位(pacing/terminal/range/hidden)等待时长公式与 restore 校验一致;mount 复合足迹只在 lifecycle 投影 collidable 时并入。
- **runner 生命周期**:startScript 单槽 + runnerTriggerOwnerId/inlineTriggerOwners 层次;runDetachedScriptChain ownsRunnerSlot 时完整接续 pendingOnEnter;abortScript 清单完整(含 screenHold/dither/sceneEntry/gesture/actorSpriteOverrides);强停/收尾统一下筏+归还权威+auto 存档。
- **脚本执行门**:scriptExecutionGateOpen 对 auto activation 双门(settlement 边界/lifecycle+deferredTouch);waitForScriptModal 冻结期 waiter 登记;confirm 队列 activation 条件(shop/menus/reward/battle 全闲)。
- **存档系统**:enqueueSaveSnapshot 走 scriptRuntime.withSaveBarrier 同步快照队列;写队列保序失败不毒队尾;committedSavedTimes 只在三 store 事务后推进;doLoad 三态(loaded/absent/rejected)+R2 toast 归最新请求;restorePayload 自 prepare 后零 await 同步提交;读档净身(clearRestoredWorldActorConditions)对齐原版真值。
- **呈现栈定序注释与实现一致**:World→Cinematic→fade→shop→dialog→menu→reward→toast→ambience(RNG 跳过)→dither(壳层最后,backup/target 取最终 canvas 防夜景重复 multiply);preserveClosedDialogFrame 微任务窗口防泄漏。
- **注释锚密度高且全部核对**:0x15/0x1A/0x22/0x23/0x35/0x46/0x55/0x65/0x6C/0x6E/0x71/0x73/0x80/0x84/0x87/0x98/0x99/0x9A/0xA0/0xA1 逐条带 script.c/uigame.c 行号或一阶段事故日期(2026-07-05 错拍抖动/2026-07-03 对话不冻结 NPC 拍板等)。

## 登记移交（无新增）
本批无新清理候选。至此 reforge 包生产代码全量收口(50 批中 b40-50 共 11 批覆盖 battle/audio/script/world/project/中件/debug-tools/main)。

## 验证
- 定向测试:25 个 main 测试文件 216/216、numFailedTestSuites=0（directed.json）。
- 零 diff 批:无源码改动,不适用 body-invariance;typecheck 随 b44 后未再动源码,零新输入。
