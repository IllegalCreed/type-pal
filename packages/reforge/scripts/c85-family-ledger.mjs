#!/usr/bin/env node
// TEST-COVERAGE85-GLM-REFORGE-1 — 逐 fullName → family → 源行 → caller → oracle 映射账生成。
// 数据表 + vitest list 重建:node scripts/c85-family-ledger.mjs
// 输出:src/__tests__/coverage85/c85-family-ledger.json
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'

const pkgRoot = path.resolve(import.meta.dirname, '..')
const repoRoot = path.resolve(pkgRoot, '..', '..')
const evidenceDir = path.join(pkgRoot, 'src', '__tests__', 'coverage85')

const testFiles = [
  'src/script-runner.c85-arms.test.ts',
  'src/script-host-adapter.c85-arms.test.ts',
  'src/battle/battle-core.c85-branches.test.ts',
  'src/battle/battle-session.c85-arms.test.ts',
  'src/script-world.c85-arms.test.ts',
  'src/entity-motion.c85-arms.test.ts',
  'src/runtime-host.c85-arms.test.ts',
  'src/main.c85-boot.test.ts',
]

// 每条 family:lines=源锚行,caller=公开入口,oracle=业务判据。
// match 数组按 fullName 片段匹配(每条测试必须且只能命中一条)。
const F = (family, lines, caller, oracle) => ({ family, lines, caller, oracle })
const ledger = [
  {
    file: 'src/script-runner.c85-arms.test.ts',
    source: 'src/script-runner.ts',
    families: [
      {
        ...F(
          '演出缺省臂',
          [510, 518],
          'ScriptRunner.run(公开)',
          '宿主收到的 fade/dither 逐参(缺省 300/720ms)',
        ),
        match: ['演出缺省臂'],
      },
      {
        ...F(
          'B8 chase 缺省臂',
          [521],
          'ScriptRunner.run',
          '空 self 派发 chaseStep 缺省 range8/speed4/floating',
        ),
        match: ['chasePlayer 以空 self'],
      },
      {
        ...F(
          'B8 vanish 双回落臂',
          [528],
          'ScriptRunner.run',
          'vanishEntity 回落 selfId 与缺省 seconds=2',
        ),
        match: ['vanishEntity 无 entity 时回落', 'vanish 双回落臂'],
      },
      {
        ...F(
          '0x13 高度缺省臂',
          [579],
          'ScriptRunner.run',
          'setEntityPos height 缺省 0 且持久写 entityPos',
        ),
        match: ['height 缺省落 0'],
      },
      {
        ...F(
          '0x98 清空臂',
          [616],
          'ScriptRunner.run',
          '空 followers 表把 world.followers 归 undefined',
        ),
        match: ['清空臂'],
      },
      {
        ...F(
          '后台失败上报臂',
          [658, 661],
          'ScriptRunner.exec playEntityAction catch',
          '非 abort 失败按复合引用 report;abort 静默;非 Error 按 String()',
        ),
        match: ['后台失败臂', '后台失败上报臂', '后台失败静默臂'],
      },
      {
        ...F(
          '缺省参数臂',
          [671, 681, 696],
          'ScriptRunner.exec',
          'loseItem count1/mountParty 偏移0/addVar 缺省底数0',
        ),
        match: ['缺省臂:loseItem'],
      },
      {
        ...F(
          'setSceneMapOverride 三臂',
          [619, 621, 623, 627, 633],
          'ScriptRunner.exec',
          '指定 scene 直写/当前场景无 reloadMap 落持久/无 sceneId 零写',
        ),
        match: ['setSceneMapOverride'],
      },
      {
        ...F(
          '脚本绑定双臂',
          [787, 820],
          'ScriptRunner.exec',
          'setEntityAuto/Trigger 以 script 引用与 stages 内联分别派发',
        ),
        match: ['脚本绑定双臂', '脚本绑定 stages 臂'],
      },
      {
        ...F(
          '场景覆写残留臂',
          [791, 801, 811],
          'ScriptRunner.exec',
          'onTeleport/clearSceneScripts/onEnter 各自建 override 槽',
        ),
        match: ['场景覆写残留臂', 'setSceneOnTeleport 内联段落到全新场景槽'],
      },
      {
        ...F(
          '战斗配置臂',
          [744],
          'ScriptRunner.exec startBattle',
          'choreography 透传且字段缺席裁剪',
        ),
        match: ['战斗配置臂'],
      },
      {
        ...F('节拍臂', [372], 'ScriptRunner.runBody paceMs', 'paceMs>0 每命令后按拍 wait'),
        match: ['节拍臂'],
      },
      {
        ...F('空段臂', [477], 'ScriptRunner.runStages', '空 stages 安静收尾不建阶段'),
        match: ['空段臂'],
      },
      {
        ...F('entry 宿主臂', [483], 'ScriptRunner.runStages', '无 revealSceneEntry 宿主 fail-loud'),
        match: ['entry 段遇无 revealSceneEntry'],
      },
      {
        ...F(
          '条件 flag/ownsItem 臂',
          [236, 273],
          'evalCondition(公开导出)',
          '缺席 flag 按 false;ownsItem 缺省 atLeast=1',
        ),
        match: ['缺席 flag 按 false'],
      },
      {
        ...F(
          '条件 var 六算子臂',
          [239, 241, 243, 245, 247, 249, 251, 253],
          'evalCondition',
          '六比较算子按数值语义',
        ),
        match: ['var 六比较算子'],
      },
      {
        ...F('条件组合臂', [283, 285, 287], 'evalCondition', '缺席 var 默认 0;not/all/any 组合'),
        match: ['缺席 var 按默认 0'],
      },
      {
        ...F(
          '条件 currentScene 臂',
          [256, 257, 258],
          'evalCondition',
          '缺查询 fail-loud;命中/不命中',
        ),
        match: ['currentScene 缺当前场景查询'],
      },
      {
        ...F(
          '条件实体臂',
          [261, 266, 270, 275, 276],
          'evalCondition',
          'NaN 哨兵拒缺席实体;facing/has/equipped 走查询',
        ),
        match: ['entityState 用 NaN 哨兵'],
      },
      {
        ...F(
          '条件透传臂',
          [264, 269],
          'evalCondition',
          'entitiesNear 透传 range;chance 用注入 random 定率',
        ),
        match: ['entitiesNear 透传 range'],
      },
      {
        ...F(
          '命令直通臂',
          [
            587, 590, 596, 598, 601, 604, 607, 610, 668, 672, 683, 687, 689, 713, 736, 748, 782,
            785, 806, 820,
          ],
          'ScriptRunner.exec 各 case',
          'flee/hold/reveal/shake/wave/layer/hpmp/revive/learn/unequip/daynight/giveitem/money/halve/sound/ambience/anim/nudge/step/nudgeparty 宿主派发与 world 写入',
        ),
        match: ['直通宿主能力'],
      },
      {
        ...F(
          '宿主能力缺席臂',
          [512, 516],
          'ScriptRunner.exec',
          'holdScreen/revealScreen 未实现 fail-loud',
        ),
        match: ['宿主能力缺席臂'],
      },
      {
        ...F(
          'call 重抛臂',
          [459],
          'ScriptRunner.callScript catch',
          'callee 非 returnScript 错误原样上抛',
        ),
        match: ['call 重抛臂'],
      },
      {
        ...F('endBattle 拒绝臂', [826], 'ScriptRunner.exec', '大世界 runner 拒绝战斗演出命令'),
        match: ['endBattle 拒绝臂'],
      },
    ],
  },
  {
    file: 'src/script-host-adapter.c85-arms.test.ts',
    source: 'src/script-host-adapter.ts',
    families: [
      {
        ...F(
          '在场地址臂',
          [119, 124, 179],
          'executeScriptHostEffect(公开)',
          'setEntityPos/PosRelParty/Frame 逐参派发',
        ),
        match: ['在场地址臂'],
      },
      {
        ...F(
          '跨场景过滤臂',
          [107, 119, 124, 173, 179, 184, 191, 209, 235, 242, 248, 256, 273, 278, 283, 288],
          'executeScriptHostEffect activeEntity',
          '跨场景 EntityAddress 零派发不抛',
        ),
        match: ['跨场景过滤臂'],
      },
      {
        ...F(
          'chasePlayer 臂',
          [47, 50, 51],
          'executeScriptHostEffect',
          'self 在场派发缺省参数;不在场零调用',
        ),
        match: ['chasePlayer'],
      },
      {
        ...F(
          '演出缺省臂',
          [43, 141],
          'executeScriptHostEffect',
          'dither 720ms;increaseHpMp 缺省 both',
        ),
        match: ['ditherScreen 缺省 720ms'],
      },
      {
        ...F(
          '动作相位臂',
          [191, 195],
          'executeScriptHostEffect playEntityAction',
          'startAtMs 透传;单次缺省阻塞',
        ),
        match: ['startAtMs 透传'],
      },
      {
        ...F(
          '后台失败臂',
          [198, 201],
          'executeScriptHostEffect catch',
          '循环失败经 report;非 Error 按 String()',
        ),
        match: ['后台失败臂'],
      },
      {
        ...F(
          'releaseEntity 双臂',
          [239, 242],
          'executeScriptHostEffect',
          '无 target 归还全部;点名只还该实体',
        ),
        match: ['releaseEntity 双臂'],
      },
      {
        ...F('提交控制臂', [161], 'executeScriptHostEffect', '缺同步提交控制 fail-loud'),
        match: ['setSceneMapOverride 提交控制臂'],
      },
      {
        ...F(
          '提交/reload 臂',
          [162, 164],
          'executeScriptHostEffect',
          'reloadMap 收提交控制;无 reloadMap 直合同拍提交',
        ),
        match: ['宿主 reloadMap 收到同拍提交控制', '无 reloadMap 的宿主直接同拍提交'],
      },
      {
        ...F(
          '宿主能力缺席臂',
          [328, 332],
          'executeScriptHostEffect',
          'holdScreen/revealScreen 未实现 fail-loud',
        ),
        match: ['宿主能力缺席臂'],
      },
      {
        ...F(
          '世界持久零派发臂',
          [130, 131, 132, 133, 134, 135, 136, 137, 138, 139],
          'executeScriptHostEffect',
          '状态写入类叶不触碰画面宿主',
        ),
        match: ['世界持久类叶零派发臂'],
      },
      {
        ...F(
          'loadScene 落点臂',
          [77, 78, 79, 81, 82],
          'executeScriptHostEffect',
          '三字段缺席空 spawn;pos+facing 与 source 过渡透传',
        ),
        match: ['loadScene 落点臂', 'loadScene 落点与 source 过渡'],
      },
      {
        ...F('形象补丁臂', [95, 96, 97], 'executeScriptHostEffect', '部分补丁缺席键;三维分别派发'),
        match: ['setActorAppearance'],
      },
      {
        ...F('后台取消臂', [198], 'executeScriptHostEffect', 'runner 取消后失败不再上报'),
        match: ['后台取消臂'],
      },
      {
        ...F('mountParty 缺省臂', [248], 'executeScriptHostEffect', '偏移缺席按 0 派发'),
        match: ['mountParty 在场缺省臂'],
      },
      {
        ...F(
          'endBattle 拒绝臂',
          [325, 326],
          'executeScriptHostEffect',
          '非战斗演出上下文 fail-loud',
        ),
        match: ['endBattle 拒绝臂'],
      },
    ],
  },
  {
    file: 'src/battle/battle-core.c85-branches.test.ts',
    source: 'src/battle/battle-core.ts',
    families: [
      {
        ...F(
          '毒 mpDelta 分侧臂',
          [499],
          'stepBattle 回合末 tickPoisons',
          '玩家扣蓝;敌无 mp 槽跳过只走 HP;发作日志分侧前缀',
        ),
        match: ['mpDelta 分侧臂'],
      },
      {
        ...F(
          '毒名与到期产物臂',
          [502, 508],
          'stepBattle 回合末 tickPoisons',
          '无 name 按 id 合成名;grantItem 叠已有槽/新开槽',
        ),
        match: ['毒名缺省与到期产物臂'],
      },
      {
        ...F(
          '偷窃 notice/回落臂',
          [651, 654, 663],
          'cast 效果链 performSteal',
          '文钱/道具 notice;未知道具名回落 itemId;c=0 静默',
        ),
        match: ['偷窃非重复臂'],
      },
      {
        ...F(
          '沉默 fallback 臂',
          [883],
          'decideEnemyAction(公开)',
          '技能在表的 cast fallback 被沉默拦落普攻',
        ),
        match: ['沉默臂'],
      },
      {
        ...F(
          '缺数据落普攻臂',
          [897, 907],
          'decideEnemyAction',
          'transform/summon 引用缺失 log 提示落普攻',
        ),
        match: ['缺数据落普攻臂'],
      },
      {
        ...F('无 enemyId 召唤臂', [906], 'decideEnemyAction', '召唤动作回落召唤者自身定义'),
        match: ['无 enemyId 召唤臂'],
      },
      {
        ...F('死亡宿主臂', [993], 'applyEnemyEffect(公开)', '死者宿主直接 failed'),
        match: ['死亡宿主臂'],
      },
      {
        ...F('回合末回蓝臂', [1138, 1139], 'stepBattle 回合末', 'regenMp 回蓝钳上限(regenHp 顺带)'),
        match: ['装备回蓝臂'],
      },
    ],
  },
  {
    file: 'src/battle/battle-session.c85-arms.test.ts',
    source: 'src/battle/battle-session.ts',
    families: [
      {
        ...F(
          'stopMusic 排程臂',
          [845, 846, 850],
          'BattleSession 构造器+tick(公开)',
          'fadeMs>0 只入排程,越时后原 serial 停曲',
        ),
        match: ['stopMusic 定时臂'],
      },
      {
        ...F('stopMusic 即时臂', [846], 'BattleSession.tick', 'fadeMs 缺省 0 当拍停曲'),
        match: ['stopMusic 即时臂'],
      },
      {
        ...F(
          '排程失效臂',
          [699, 701],
          'BattleSession.cancel/tick',
          '排程后 cancel 使 serial 失配,越时不停曲',
        ),
        match: ['排程失效臂'],
      },
      {
        ...F(
          'applyActorGrowth 身份臂',
          [706],
          'BattleSession.tick 演出动作',
          '队伍外角色 fail-loud',
        ),
        match: ['applyActorGrowth 身份臂'],
      },
      {
        ...F(
          '终局重复登记臂',
          [754],
          'BattleSession.tick 演出动作',
          '同链第二条终局命令 fail-loud',
        ),
        match: ['endBattle 重复登记臂'],
      },
      {
        ...F(
          'cancel 守卫臂',
          [515, 522, 530],
          'BattleSession.cancel/tick',
          '已取消会话 tick 不再驱动;终局后 cancel 安静',
        ),
        match: ['cancel 双守卫臂', 'cancel 幂等臂'],
      },
      {
        ...F('形象缺定义臂', [385], 'BattleSession 构造器 resetVisual', '未注册形象 fail-loud'),
        match: ['形象缺失臂'],
      },
    ],
  },
  {
    file: 'src/script-world.c85-arms.test.ts',
    source: 'src/script-world.ts',
    families: [
      {
        ...F(
          'page 缺席臂',
          [139, 290, 291],
          'resolveBaseEntityPage/selectBaseEntityPage(公开)',
          '无 pages 安静 undefined;结果省略 previousPage/page 键',
        ),
        match: ['entity 无 pages 时'],
      },
      {
        ...F('page 不存在臂', [131], 'resolveBaseEntityPage', 'initialPage 指向不存在页 fail-loud'),
        match: ['initialPage 指向不存在页'],
      },
      {
        ...F('behavior 注册表臂', [162], 'selectEntityBehavior', '页引用行为不在注册表 fail-loud'),
        match: ['behavior 注册表臂'],
      },
      {
        ...F(
          'inherit 清除臂',
          [221],
          'selectEntityBehavior',
          'inherit 清除手动选择;重复 inherit 无变化',
        ),
        match: ['selectEntityBehavior inherit 臂'],
      },
      {
        ...F(
          'auto bump 臂',
          [288],
          'selectBaseEntityPage+coordinator',
          '页切换改变 auto 行为时 bump auto owner',
        ),
        match: ['auto bump 臂'],
      },
      {
        ...F(
          'activation 校验臂',
          [308],
          'setEntityTriggerActivation(公开)',
          'range 非法 fail-loud;合法值落世界态',
        ),
        match: ['trigger activation 校验臂'],
      },
      {
        ...F(
          'hook 校验臂',
          [364, 367],
          'selectBaseSceneHooks(公开)',
          '空 selection fail-loud;未知变体 fail-loud;undefined 槽安静跳过',
        ),
        match: ['scene hook 校验臂'],
      },
      {
        ...F(
          'hook inherit 臂',
          [378, 382],
          'selectBaseSceneHooks',
          '继承清手动选择且同 id 游标保留',
        ),
        match: ['scene hook inherit 臂'],
      },
      {
        ...F('缺槽臂', [344, 346], 'resolveSceneHook(公开)', '场景无 onTeleport 槽返回 undefined'),
        match: ['resolveSceneHook 缺槽臂'],
      },
      {
        ...F(
          '租约停机臂',
          [404, 425, 433],
          'FlowActivationLease.setCheckpointReady/reachSafePoint',
          'epoch 失效与 closed 租约返回 stop',
        ),
        match: ['租约停机臂'],
      },
      {
        ...F(
          'checkpoint 门臂',
          [434, 435],
          'FlowActivationLease.checkpoint',
          'barrier 未就绪 wait;就绪 continue+commit',
        ),
        match: ['checkpoint 等待臂'],
      },
      {
        ...F(
          'barrier 句柄臂',
          [597, 602],
          'requestSaveBarrier',
          '未 ready release throw;双 release 失效句柄',
        ),
        match: ['barrier 句柄臂'],
      },
      {
        ...F(
          'barrier cancel 臂',
          [609],
          'requestSaveBarrier cancel',
          'Error 透传;字符串包 Error;无原因默认文案',
        ),
        match: ['barrier cancel 臂'],
      },
      {
        ...F(
          'activation gate 中止臂',
          [617, 634],
          'waitForActivationGate',
          '等待中/已中止 signal AbortError',
        ),
        match: ['activation gate 中止臂'],
      },
      {
        ...F(
          'owner idle 臂',
          [721, 726, 740],
          'waitForOwnerIdle',
          '空闲即解析;活动等待被关闭唤醒;中止拒绝',
        ),
        match: ['owner idle 臂'],
      },
    ],
  },
  {
    file: 'src/entity-motion.c85-arms.test.ts',
    source: 'src/entity-motion.ts',
    families: [
      {
        ...F('非法快照臂', [400, 401], 'planEntityMotion(公开)', '重复 actor/空足迹 fail-loud'),
        match: ['非法快照臂'],
      },
      {
        ...F(
          '非法意图臂',
          [417, 419, 421, 423, 425],
          'planEntityMotion',
          '重复/缺 actor、过期原点、非法 quantum/epoch fail-loud',
        ),
        match: ['非法意图臂'],
      },
      {
        ...F(
          '非法侧杖臂',
          [441, 443, 445, 447, 449, 451],
          'planEntityMotion',
          '缺 actor/重复/epoch/时长越界 fail-loud',
        ),
        match: ['非法侧杖臂'],
      },
      {
        ...F('公平拍臂', [670], 'planEntityMotion fairnessTickForGroup', '非整数公平拍 fail-loud'),
        match: ['公平拍臂'],
      },
      {
        ...F(
          '原地意图臂',
          [322, 344],
          'planEntityMotion',
          'desired==from 零位移成功且朝向回落 desiredFacing',
        ),
        match: ['原地意图臂'],
      },
      {
        ...F('悬浮臂', [521, 525], 'planEntityMotion', 'floating 无视全图地形封锁照常移动'),
        match: ['悬浮臂'],
      },
      {
        ...F('移动键臂', [163, 164], 'motionActorKey(公开)', 'party 键恒 0:party 且排序在前'),
        match: ['移动键臂'],
      },
      {
        ...F(
          '足迹重叠臂',
          [196, 197],
          'motionFootprintsOverlap(公开)',
          '精确相邻不重叠;分量靠近即重叠;高度不参与',
        ),
        match: ['足迹重叠臂'],
      },
    ],
  },
  {
    file: 'src/runtime-host.c85-arms.test.ts',
    source: 'src/runtime-script-project.ts + src/script-runner-core.ts',
    families: [
      {
        ...F(
          'runEntityTrigger 时机臂',
          [436],
          'ProjectScriptRuntimeHost.execute(公开)',
          'auto 时机 fail-loud',
        ),
        match: ['runEntityTrigger 时机臂'],
      },
      {
        ...F(
          'runEntityTrigger 桥臂',
          [442],
          'ProjectScriptRuntimeHost.execute',
          '缺调用桥 fail-loud',
        ),
        match: ['runEntityTrigger 桥臂'],
      },
      {
        ...F(
          'runEntityTrigger 派发臂',
          [446],
          'ProjectScriptRuntimeHost.execute',
          '调用桥收到同 target/context',
        ),
        match: ['runEntityTrigger 派发臂'],
      },
      {
        ...F(
          'lifecycle 提交臂',
          [98, 176, 180],
          'ProjectScriptRuntimeHost.execute',
          'lifecycle 命令提交世界态且 worldChanged 通知',
        ),
        match: ['lifecycle 拒收臂'],
      },
      {
        ...F('中止守卫臂', [166], 'ProjectScriptRuntimeHost.execute', '已中止 signal AbortError'),
        match: ['守卫臂:已中止'],
      },
      {
        ...F('摘要臂', [329], 'ScriptProjectRuntime 构造器(公开)', '非 64hex digest fail-loud'),
        match: ['摘要臂'],
      },
      {
        ...F(
          'script 初始化臂',
          [120, 332],
          'ScriptProjectRuntime 构造器',
          'world 缺 script 补空脚本态',
        ),
        match: ['script 初始化臂'],
      },
      {
        ...F('私有脚本臂', [663], 'runItemPrivateScript(公开)', '物品私有脚本缺定义 fail-loud'),
        match: ['私有脚本臂'],
      },
      {
        ...F('实体臂', [250], 'runEntityBehavior(公开)', '缺席实体 fail-loud;场景错位安静 false'),
        match: ['实体臂'],
      },
      {
        ...F(
          '无行为安静臂',
          [512],
          'runEntityBehavior(公开)',
          '实体未声明 trigger 行为时安静 false',
        ),
        match: ['实体无行为臂'],
      },
      {
        ...F('无钩子安静臂', [582], 'runSceneHook(公开)', '场景无 onTeleport 钩子时安静 false'),
        match: ['钩子无变体臂'],
      },
      {
        ...F(
          '完成游标复入臂',
          [678],
          'runSceneHook(公开)+resolveSceneHook',
          '已 completed 游标不再取得租约',
        ),
        match: ['完成游标复入臂'],
      },
      {
        ...F('场景钩子臂', [481, 553], 'runSceneHook(公开)', '场景错位安静 false'),
        match: ['场景钩子臂'],
      },
      {
        ...F(
          '完成游标臂',
          [183, 184, 185],
          'RuntimeScriptRunner.runFlow(公开)',
          '未声明 complete 拒;声明后立即收尾零效果',
        ),
        match: ['完成游标臂'],
      },
      {
        ...F(
          'auto 恢复臂',
          [179],
          'RuntimeScriptRunner.runFlow',
          'resume 无 checkpoint 游标 fail-loud',
        ),
        match: ['auto 恢复臂'],
      },
      {
        ...F('游标缺失臂', [274], 'RuntimeScriptRunner.runFlow', 'stage 游标不存在 fail-loud'),
        match: ['游标缺失臂'],
      },
      {
        ...F(
          'gate 停止臂',
          [638],
          'RuntimeScriptRunner.runFlow awaitGate',
          '宿主 gate stop 干净收尾零叶执行',
        ),
        match: ['gate 停止臂'],
      },
    ],
  },
  {
    file: 'src/main.c85-boot.test.ts',
    source: 'src/main.ts',
    families: [
      {
        ...F(
          '运动探针臂',
          [300, 814, 823, 826, 827, 831],
          'bootGame(公开启动入口)',
          '?motion-entity 在场实体坐标/在场性(canvas DEV dataset=DOM 面+observation)',
        ),
        match: ['运动探针臂'],
      },
      {
        ...F('运动探针缺席臂', [823, 831], 'bootGame', '探针实体不在场 present=false'),
        match: ['运动探针缺席臂'],
      },
      {
        ...F('存储回退臂', [469, 471], 'bootGame', 'indexedDB 缺席回落 MemorySaveStore 正常开局'),
        match: ['存储回退臂'],
      },
    ],
  },
]

// 包内临时目录(子进程稳定可写);mkdtemp 唯一目录 + finally 清理,运行后零残留
const tempDir = await mkdtemp(path.join(pkgRoot, '.c85-ledger-tmp-'))
const identityJsonPath = path.join(tempDir, 'identity.json')

const listArgs = [
  '--filter',
  '@type-pal/reforge',
  'exec',
  'vitest',
  'list',
  '--passWithNoTests',
  '--exclude',
  '**/*.pal.test.ts',
  ...testFiles,
  `--json=${identityJsonPath}`,
]
// 临时目录 mkdtemp + finally 清理:运行后零残留,不写固定 /tmp 路径
let rows
try {
  const listed = spawnSync('pnpm', listArgs, { cwd: repoRoot, encoding: 'utf8', timeout: 180_000 })
  if (listed.status !== 0) {
    const out = listed.stdout + listed.stderr
    throw new Error(`vitest list 失败(exit ${listed.status}): ${out.slice(-500)}`)
  }
  rows = JSON.parse(readFileSync(identityJsonPath, 'utf8'))
} finally {
  await rm(tempDir, { recursive: true, force: true })
}

const entries = []
const unmatched = []
for (const row of rows) {
  const file = row.file
    .replace(/^.*packages\/reforge\//, 'packages/reforge/')
    .replace('packages/reforge/', '')
  const group = ledger.find((candidate) => candidate.file === file)
  if (!group) {
    unmatched.push(`NO GROUP ${file} :: ${row.name}`)
    continue
  }
  const family = group.families.find((candidate) =>
    candidate.match.some((m) => row.name.includes(m)),
  )
  if (!family) {
    unmatched.push(`NO FAMILY ${file} :: ${row.name}`)
    continue
  }
  entries.push({
    file,
    fullName: row.name,
    family: family.family,
    source: group.source,
    sourceLines: family.lines,
    caller: family.caller,
    oracle: family.oracle,
  })
}
entries.sort((a, b) => (a.file + a.fullName).localeCompare(b.file + b.fullName))
if (unmatched.length) {
  console.error(`UNMATCHED:\n${unmatched.join('\n')}`)
  process.exit(1)
}
const doc = {
  note: '逐 fullName → family → 源行 → caller → oracle;由 scripts/c85-family-ledger.mjs 从 vitest list + 表重建。',
  testCount: entries.length,
  entries,
  dedup: {
    revokedInR3: [
      'battle-core: deprecated enemies 别名/divide 扩上限/transform 解析/召唤解析/混乱/重掷/濒死伤亡 —— 与 battle-core.test.ts、battle-enemy-confused.test.ts、battle-casualty.test.ts 重复,闭合 0 新臂,已删',
      'battle-core: 偷物入包/余量递减/偷光/偷钱 moneyDelta —— battle-core.test.ts:3074 已覆盖,合并为单条 notice/回落非重复臂',
      'battle-session: fleeBattle 演出臂 —— battle-session.test.ts:1405 已覆盖,已删',
    ],
  },
}
await writeFile(
  path.join(evidenceDir, 'c85-family-ledger.json'),
  `${JSON.stringify(doc, null, 1)}\n`,
)
console.log(`family ledger: ${entries.length} entries across ${ledger.length} files`)
