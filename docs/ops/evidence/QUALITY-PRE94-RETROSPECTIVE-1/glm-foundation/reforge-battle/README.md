# reforge-battle(battle/ 全目录 20 文件)八维复审批

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

- 批次:pre-94 foundation 模块 14 批 40(reforge 包批 1)
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 75+ 提交)
- Coding Owner:GLM;battle/ 全部 20 生产文件全文读毕(~11.2k 行,含 battle-core 2754 / battle-session 2593 / battle-anim 1789 三大件)
- **零整改批**(B–H 全维通过;零代码/注释改动,工作树零 diff)

## 零整改依据(按层)

- **battle-positions**:头部称"= sdlpal battle.c 真值"——敌方表已逐项对 data/extracted/data/enemy-pos.json(DATA.MKF chunk 13)核过:1 敌(100,110)/2 敌(70,130),(140,106)/3-5 敌逐项一致。比一阶段 ENEMY_POSITIONS_FALLBACK(另一套兜底值)更真;注释"原版 ENEMYPOS 表"自证准确。
- **battle-core(2754)**:headless 状态机全域 fight.c 逐段锚(队列装配 :1497-1565/防御出手才置位 :4115/逃跑 str>=roll :4143/物攻全链 :3629-3663 含李逍遥 1/12 彩蛋/敌物攻 :4917-5076 含 7/17 闪避+替挡全链/乾坤一掷 script.c:2547-2554/敌施法 str+(级+6)×6 :4673/玩家侧 resistMult 20 :4798);validatePlayerAction 降级链(封咒/MP→普攻或防御、物品空→防御、死目标环扫)与一阶段 battle-system 同构;伤亡 sweep P6 至多一脚本次 prevHp 刷新防重入;隐身 0x5C 三段负值→取反→衰减与一阶段 iHidingTime 同。
- **battle-session(2593)**:表现层状态机(visual/displayHp 防剧透/pendingDeaths 区分正被击杀与早死/pendingConfusedReveal OffMagic 收尾前不抖/appearanceTransition 双图溶解/skipNextReset 离场不复位/summonTint 与 fx.speed 两字段不混注)/choreography closure(pumpScriptExecution 序:伤亡对话→dialog→banner→wait→script playback→activeHook→choreoQueue→pendingHooks→terminal)/keepEffect 烙印 wave≥9 原版门/杂项盒 61×112 实机截图考证。
- **battle-anim(1789)**:19 条时间线逐帧考证(buildPlayerAttack/buildAttackAll/buildMateAttack×2/buildUseItem 六步线性整除形制+作者 2026-07-11 第六轮裁决/buildThrowItem/buildEnemyPhysical 含 cover 替挡 fight.c:5012-5099/buildPlayerCast PreMagic+OffMagic+召唤三段+PostMagic/buildPlayerCoop COOP_POS+fight.c:4091 非对称 t 计数/buildEnemyCast/buildPartyFlee 全员统一(+5,+4) 忠原版背弃 sdlpal TODO/buildFleeFail/buildSteal/buildEnemyEscape/buildEnemyTransform/buildPlayerTrance/buildEnemyDivide 二分收敛);AnimPlayer 每帧恰一次副作用。
- **外围件**:enemy-closure BFS 可达闭包;readiness 两件(sprite 闭包+profile 冲突 fail-loud / turn 快照冻结+fatal 分类);battle-host 唯一 launch identity+restoreMusic 语义;launch-preparation "预检先于第一个写入"+LRU re-touch;command-selection F/R/A 快捷态+coop 消费;ui 四层 chrome 色带不消费工程色盘;result/world-result/settlement-presentation 终态唯一 owner。

## 验证

- battle 族定向(src/battle 全目录):**148 套件 518/518,0 failed suites** → [directed.json](directed.json)
- `tsc --noEmit -p packages/reforge`:exit 0;工作树零 diff

## 登记项

无新增。
