# C1 逐文件 A–H 索引 — 73-78 shell 生命周期(16 条 fullReads)

读域标注:`【原审全文】`=原候选轮全文逐例读取;`【返工补读】`=原审查未全文读取、2026-10-20 C1 返工补全(不追溯为原审记录)。指纹勘误与真实 SHA-256 见 [`read-boundaries.json`](read-boundaries.json)(input.ts 两值锚 89800a1c1;其 C2 注释修改后 blob 为 `03803e5dff6baeec2fdb29305b0721fd51ffa026`)。共享论据引用本目录 README 对应节,不重复展开。

## 生产文件(5)

**packages/game/src/shell/input.ts**【原审全文】
- A:键表/WASD 原义/pressed-edge/repeat 过滤/delete-then-add 键序与 input.c:58-92/213 一致;suppressedHeld 单键场景等价 C,多键复活角点已登记(docblock,input.c:236/286 带 !fRepeat 守卫)。真实 caller:bootstrap 装配 KeyboardInputSource;menu-driver/scene-system/battle 消费 InputSnapshot。
- B:6 处错误/过时注释已修(候选 50704d25e);KeyM dev 追加已披露。C:键序/抑制状态唯一 Owner=本类,无跨层写。D:codeToAbstractKey 纯函数双 handler 复用;Replay/Recording 语义不同不合并。F:suppressedHeld 上移+`Set<AbstractKey>`(50704d25e)。G:无死分支(各防御有 C 对应+测试)。H:事件→快照可直接派发 KeyboardEvent 判别。
**packages/game/src/shell/main-loop.ts**【原审全文】
- A:DM31 顺延/结转与 game.c:65-80 一致;present 门控五条件;DM30 分族边界(palette.c:313-316/441-446)。caller=bootstrap startRafLoop/tickN、tools-panel 暂停经 isSpeedrunPaused。B:注释与真值一致,本片未改。C:编排者不持业务状态,dump/fps/speedrun 旁路注入。D:advanceRafFrame 抽出即复用(单测+loop)。F/G:无冗余层。H:RafLoopState 显式化,无需 mock rAF。
**packages/game/src/shell/audio.ts**【原审全文】
- A:L46 去重(sound.c:769-772/930)、DM29(battle.c:715-730)、胜利曲(battle.c:1030-1033)一致。caller=bootstrap.ts:194-199 每帧 sync、playSound。B:midi.c:67→69 已修。C:播放状态唯一 Owner=manager;OGG 元素与 WebAudio ctx 各归其位。D:createSfxDedup/pickMusicTrack/battleVictoryTrack/sfxForBattleEvent 纯函数拆分供单测与 shell 复用。F/G:无死分支。H:MusicBackend 注入端口使 jsdom 可测。
**packages/game/src/shell/rng-player.ts**【原审全文】
- A:帧窗口/shake 每帧递减+跳过结清/失败 Promise 驱逐/in-flight 缓存与注释一致;DM27 不可跳经 rngplay.c 无 dwKeyPress + main.c:395 属标题屏双核。caller=trademark-fallback.ts:96-102。B:3 处过时 PNG/默认可跳注释已修。C:chunk 缓存模块级单例,播放器不知 gs。D:RNG_OPAQUE 只读共享。F/G:`__setRngChunkLoaderForTest` 为已披露测试端口。H:fetchManifest/fetchFrame 注入口。
**packages/game/src/shell/avi-player.ts**【原审全文】
- A:跳过键 stopImmediatePropagation 防残留(历史用户报障)、DL27 500ms(aviplay.c:741-747)、cleanup 幂等、curVideoEl 解跟踪。caller=main/bootstrap 顺序 await + ending-avi-host。B:跳过键锚 uigame.c:395→aviplay.c:711 已修。C:videoVolume/curVideoEl 模块级与 audio.ts OGG 对称。D:warmUp 与 playAvi 共享解锁语义不合并(生命周期不同)。G:playsInline 仅 warmup 设置——键盘桌面游戏 iOS 域外,登记 N/A。H:play/pause 原型端口可 spy。

## 测试文件(11,E 为主)

**input.test.ts**【原审全文】E:键表逐键(oracle=sdlpal 键表)、键序末位、repeat 双臂、clearPressed、DM30 单键抑制;KeyM 断言已标注 dev 追加。B:标题"sdlpal 真值"范围经标注收窄。
**input.boundaries.test.ts**【原审全文】E:快照防别名、未知 keyup、方向-only 抑制判别(H02)、detach 三态。
**input-replay.grok-r1.test.ts**【原审全文】E:G09-A01-11 键序归属、回放游标越界后追加不复活、录制引用恒等、双源 detach 隔离。
**main-loop.test.ts**【原审全文】E:tickN 行走 oracle(scene.c East +16/+8)、三不变量、DM31 节奏 ±1 容差、冻结、吞键分族四条件(suppress spy)。
**main-loop-gates.grok-r1.test.ts**【返工补读】原审查仅读取 describe/it 标题全列+battleAnim/battleFade 命中行;全文 247 行于 2026-10-20 返工补读。E:G09-B01-13——dither/battleAnim 门控、dt 150/200 余量、冻结余量、drain 透传、nowMs、dump partyWalkFrames 双臂、无 suppress 端口容错、模式切换余量清零、tickN(0)、rAF 取消 id。补读后结论与原判一致,无需整改。
**audio.test.ts**【原审全文】E:url/选曲三参/胜利曲五臂/dedup 三例/OGG 释放两例 + 本候选新增 DM29、L47×2(分立单红反控见 [c3-evidence/README.md](c3-evidence/README.md))。
**audio.glm-phase1-leaves.test.ts**【原审全文】E:L24 setOggVolumeScale 新建/在播即时刷新、audio-midi 无 AudioContext no-op;与 audio-midi.test 分工去重。
**rng-player.test.ts**【原审全文】E:全帧末屏、跳过、缺 chunk、start>end、endFrame=-1、manifest throw、单帧失败续播、shake 四态(递减/偶帧位移/耗尽/跳过结清)、initialFadeIn 双 palette、stampede 恰 1 次加载。
**rng-player.glm-next-wave.test.ts**【原审全文】E:窗口=实际请求集合、失败驱逐后二次播放重载成功;C1 返工清一行重复 docblock(12a39b4c9,候选内)。
**avi-player.test.ts**【原审全文】E:元素创建/src、三默认跳过键、自定义 skipKeys 覆盖、非跳过键、error resolve、重复 ended 幂等、音量四合同(套用/实时/钳制/解跟踪)。
**avi-player.glm-next-wave.test.ts**【原审全文】E:deferred 受控 play 拒绝→overlay→真实 MouseEvent 重试→摘除;warm-up 成功 pause 一次/失败不 pause。

## 附:partialReads 4 条(bootstrap/trademark-fallback 片段、io/async-lifecycle 头部)

按原登记为部分读取(caller 锚与去重头),不计入 69 条 fullReads,无 A–H 结论主张;io/async-lifecycle 的逐例 E 归 TEST-GAME-MEDIA-LIFECYCLE-1。
