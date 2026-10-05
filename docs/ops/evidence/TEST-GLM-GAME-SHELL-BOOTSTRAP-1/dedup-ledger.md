# TEST-GLM-GAME-SHELL-BOOTSTRAP-1 排重账(GLM r1)

排重域:卡面 8 源(`packages/game/src/shell/` 的 `bootstrap.ts`、`bootstrap-resources.ts`、
`boot-loading.ts`、`fetch-retry.ts`、`precache-client.ts`、`precache-ui.ts`、`main-loop.ts`、
`input.ts`)的全部旧测与归档 shell 卡:

- `bootstrap*.test.ts`(bootstrap-audio/bootstrap-load/bootstrap.glm-next-wave/bootstrap-resources×2)
- `boot-loading*.test.ts`(本体 + grok-r1 host)
- `fetch-retry*.test.ts`(本体 + boundaries + glm-phase1-leaves)
- `precache*.test.ts`(precache-client 本体 + glm-phase1-leaves;precache-ui 本体 + grok-r1 host)
- `main-loop*.test.ts`(本体 + grok-r1 gates + menu-input-lock.glm-msio)
- `input*.test.ts`(本体 + boundaries + input-replay.grok-r1)
- 归档卡:TEST-GLM-NEW-I-1-game-shell(Wave I,r2 已验收)、TEST-GROK-BOOT-RESOURCES-MEDIUM-1、
  TEST-RUNTIME-SHELL-COVERAGE-1(reforge 侧)、CODE-QUALITY-3h/-3i、TEST-GLM-PHASE1-LEAVES-3。

## 新增合同(6,全部未证轴;源锚 / 公开 caller / 合法输入 / 业务 oracle / fullName)

| # | fullName(节选) | 源锚 | 公开 caller | 合法输入 | 业务 oracle | 排重结论 |
|---|---|---|---|---|---|---|
| SB1 | `…边界 SB1 战斗胜利结算期 BGM 覆盖:track=胜利曲且不循环…` | bootstrap.ts:191-198 | `syncShellAudio`(export;bootstrap onPresent 每帧调) | 合法完整 BattleState(phase='won',expGained=100;grok mkState 同模式夹具) | audio.sync 恰一次 `{track:3,loop:false}`(胜利曲优先于 pickMusicTrack,FALSE=不循环) | audio.test.ts:33-38 只证 `battleVictoryTrack` 纯函数;bootstrap-audio.test.ts:29 只证 explore+suspendRaf;组合臂(won→track 覆盖+loop=false)未证 |
| SB2 | `…边界 SB2 揭场 introFade 期静默(DM29),揭场后切战斗曲并循环` | bootstrap.ts:192-199 | 同上 | phase='selectAction' ± `introFade:{step,total}`(D19 入场 dither 态) | introFade 期 `{track:0,loop:true}`;清后 `{track:7,loop:true}`(wNumBattleMusic=7 非 wNumMusic=16) | audio.test.ts:27-30 只证 pickMusicTrack 纯函数含 intro 参数;`introFade !== undefined` 组合判定与战斗 loop=true 臂未证 |
| SB3 | `…边界 SB3 战斗帧 bus SFX drain:playSound 正 id 与 per-单位声播出,explore 不消费` | bootstrap.ts:202-213 | 同上 | drained bus 4 条(playSound 12 / 无 id / playEnemyDeath idx0 / showDamageNum)+ 敌 deathSound=51 夹具 | inBattle:playSound 序恰 `[12,51]`(无 id 与 sfx=0 跳过);explore 同批输入 0 次 playSound | audio.test.ts:82-108 只证 `sfxForBattleEvent` 纯函数;`if (inBattle)` 消费门、`(soundId ?? 0) > 0` 守卫与 explore 不消费的整链未证 |
| SB4 | `…precache-client 边界 SB4 SW 进度消息路由:progress→onProgress(原对象)、done/error→onDone、未知类型忽略` | precache-client.ts:67-72 | `registerPrecache` 注册的 'message' listener(main.ts 挂 SW→UI 桥) | 真实 `new MessageEvent('message',{data})`×4(progress/done/error/未知) | onProgress 收原对象(identity);done+error 各收尾一次(共 2);未知类型两回调都不触发 | precache-client.test.ts 与 glm-phase1-leaves 的 `addEventListener` 全是 `vi.fn()` 桩,从未驱动注册的监听器;全仓 grep `precache-progress` 零测试命中 |
| SB5 | `…precache-client 边界 SB5 storage.persist 失败不降级注册:onReady 与 startPrecache 照常` | precache-client.ts:74-79 | 同上 | `navigator.storage.persist` 返 rejected promise(合法硬件端口失败) | registerPrecache 照常 resolve、onReady 恰一次、startPrecache 消息 `{type:'precache'}` 到 worker | 旧测从未定义 navigator.storage;`try/catch /* ignore */` 吞错容忍臂未证 |
| SB6 | `…主循环生命周期 SB6 startRafLoop 帧链:每帧回调驱动推进并自续订,cancel 停链` | main-loop.ts:173-180 | `startRafLoop`(export;bootstrap 末尾调) | 受控 rAF 队列桩(同签名直接赋值,无强转)+ 真实 explore ctx + 时间戳锚 performance.now() | 首帧排上→回调驱动 tick(frameNum 1→2)且每帧自续订(scheduled 1→2→3→4);dt<interval 不 tick 仍续订;present 仅 2 次;cancel 恰取消链头帧 id=4 后不再排新帧 | main-loop-gates G09-B13 的 rAF 桩**不回调**,只证 cancel 传 id;main-loop.test 只证 advanceRafFrame 三不变量;真实回调链(自续订+停链)未证 |

交付文件:`packages/game/src/shell/shell-bootstrap.glm-shell.test.ts`(6 合同,单文件)。

## existing-proof 饱和账(逐文件,不新增的理由)

- **fetch-retry.ts**:`fetch-retry.test.ts`(GET reject 重试/默认耗尽 3 attempt/503 重试/404 不重试/POST 不重试/幂等安装)+ `fetch-retry.boundaries.test.ts`(retries/backoff RangeError 且不替换 fetch/失败安装不占单例/init.method 优先于 Request.method/小写 get/GET Request 503 重试/最后 Error 身份/502→504→200 Response 身份/backoff 末值续用/空数组 1000ms fallback)+ `fetch-retry.glm-phase1-leaves.test.ts`(uninstall 还原+可重装)。残余未测轴:默认 `backoffMs=[300,900]` 常量值(与已测 backoff 数组臂同 caller/oracle,证常量非业务差,登记不增)。
- **boot-loading.ts**:`boot-loading.test.ts`(计数/单调/finish 还原+满格+移除/fail 留 overlay/note 追加清除/无 overlay no-op/重复 init 幂等/未 init 不抢写/PROD onProgress 不写 DOM)+ `grok-r1 host`(默认分母 810/fetch 拒绝仍计数/缺 fill/status 节点/无状态 fail/无 fill finish/restoreBootFetch 停回调/同帧 note 单 rAF/rAF 缺失走 setTimeout16/零分母 fraction 0)。残余:overlay 存在但未 init 时 finish(同 caller/oracle 子集,登记不增)。
- **bootstrap-resources.ts**:`bootstrap-resources.test.ts`(启动顺序 soundfont 最先/glyph 降级不阻塞/soundfont 拒绝保义 settle 仍 resolve)+ `grok-mid-1`(loadAssets 拒绝保身份/dialogAssets 拒绝/三 gate 未兑现保持 pending/glyph 失败后仍等 assets+dialog/默认端口真实 fetch 请求序/HTTP 503 原文/双 boot 不穿越)——20 例全臂饱和。
- **precache-ui.ts**:`precache-ui.test.ts`(必要段映射+单调/markPlayable 按钮 click/全量段 bytes 进度+necessary 段不响应/enterGame 建 widget+收尾/done 先于进入不建 widget/最后进度初始化)+ `grok-r1 host` 20 例(零字节/自定义虚线/缺按钮容器即放行/二次 markPlayable 与 enterGame 幂等/进入后 fail 不加错误类/无节点降级矩阵/600ms 移除时序)——饱和。
- **input.ts**:`input.test.ts`(CODE_MAP 全表含 WASD 原义/held-pressed 生命周期/clearPressed/last-press 优先/e.repeat 双臂/fade 抑制)+ `input.boundaries.test.ts`(真实 Window 事件/双 Set 防别名/未知 keyup/detach 后不进)+ `input-replay.grok-r1.test.ts`(键序归属/回放游标越界/录制数组 identity/帧号原样)——饱和。
- **main-loop.ts 其余臂**:advanceRafFrame 三不变量(main-loop.test ①-⑥ + G09-B01..B12:fadeState/battleAnim present 门、dt 150/200 余量、frozen、drain 交接、nowMs、dump walkFrames、无 suppressHeldForFade 输入源、explore→battle 切换 clamp、tickN(0))、scene-fade 吞键边界 4 例、tickN explore 行走与菜单 modal 输入锁(menu-input-lock.glm-msio)——除 SB6 帧链外饱和。
- **bootstrap.ts 叶子**:`cloneScreenPalette`/`makeBlackScreenPalette`(bootstrap-load.test)、`showError`(bootstrap.glm-next-wave,含时序端口值与无 ctx 静默)、`syncShellAudio` explore+suspendRaf 窗口(bootstrap-audio.test)——已证;战斗臂即 SB1-SB3。

## unreachable / blocked 账

- **`bootstrap()` 本体编排**(bootstrap.ts:232-1931):合法驱动需真实 `/extracted` 全资源链(loadAll ~20 数据表+sprite/tileset gzip blob+glyphs 7.8MB+portraits+events/all.json+PAT.MKF×9+event-objects.json)。vitest/jsdom 内只能整体伪造资源管线=核心 mock+非法 fixture;Wave I(TEST-GLM-GAME-SHELL r2 已验收)同结论"bootstrap() 本体不能合法驱动"。E2E 入口按卡面不跑(剧情 E2E 禁令)。**unreachable-in-vitest**,产品链由 dev/E2E 验证。
- **main-loop `tickN` 的 applySceneContext 接线**:setSceneContext 闭包单例由 tickN/startRafLoop 起手注入;walkability 效果已被 main-loop.test 行走例+scene-system 自身测试间接覆盖,单测它=断言函数被调用,非业务差(登记不增)。
- **boot-loading `finishBootLoading` 未 init+有 overlay**:restoreFetch 无 `_origFetch` 时 no-op,同 caller/oracle 子集(登记不增)。

## U 账(候选产品发现,不新增测试钉住,交 Codex 裁决)

- **U-1 `registerPrecache` 的 `swc.ready` 拒绝悬空**(precache-client.ts:83):register 失败走 `onUnavailable` 优雅降级,但 `await swc.ready` 拒绝既不触发 `onUnavailable` 也不 resolve——registerPrecache 直接 reject。唯一生产 caller `main.ts:49` 是 `void registerPrecache({...})` 未 catch → 悬空 unhandled rejection;PROD 下进度停在虚线前段(可玩门按钮仍由 markPlayable 兜底,不卡死)。修复属 main.ts/precache-client 产品取舍(如 ready 拒绝也走 onUnavailable),超出本卡"不改产品"边界,登记待裁决。
- **U-2 fetch-retry 默认 backoff `[300,900]` 与 boot-loading `EXPECTED_BOOT_REQUESTS=810` 为常量**:证常量值非业务合同(注释已锚生产实测来源),不新增。

## 反控针(6,全部 VALID;见 mutation-results.json)

| 针 | 源行 | 变异 | 目标合同 |
|---|---|---|---|
| MUT-01 | bootstrap.ts:191 | `victoryTrack = battleVictoryTrack(gs.battleState)` → `= -1` | SB1 |
| MUT-02 | bootstrap.ts:192 | `battleIntroActive = …introFade !== undefined` → `= false` | SB2 |
| MUT-03 | bootstrap.ts:202 | `if (inBattle) {` → `if (false) {` | SB3 |
| MUT-04 | precache-client.ts:69 | `'precache-progress'` → `'precache-progress-x'` | SB4 |
| MUT-05 | precache-client.ts:75-79 | persist try/catch 吞错 → catch 重抛 | SB5 |
| MUT-06 | main-loop.ts:177 | 帧回调尾部 `raf = requestAnimationFrame(loop)` 注释(上下文锚,tickFps 行+本行;`raf =…(loop)` 在文件中出现 2 次) | SB6 |

每针红相位 failed-total 恰 1 且为业务 AssertionError;恢复后源文件 sha256 逐字节等于原始;恢复绿 identity sha 等于原始绿。
