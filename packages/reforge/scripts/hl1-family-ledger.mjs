#!/usr/bin/env node
// TEST-GLM-REFORGE-HOST-LIFECYCLE-1 — family ledger:逐 fullName→family→源行→caller→oracle,
// 与身份账(hl1-identity-status.json)双向核对,未匹配即退出非零。
// 重建:node scripts/hl1-family-ledger.mjs(输出经仓库 biome 定稿,再生成零 diff)。
import { spawnSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const evidenceDir = path.join(pkgRoot, 'src', '__tests__', 'host-lifecycle-1')
const identity = JSON.parse(
  await readFile(path.join(evidenceDir, 'hl1-identity-status.json'), 'utf8'),
)

const rows = [
  [
    'src/main.host-lifecycle-1.test.ts',
    '标题读档入口:标题菜单选读档后从真实存档完成开局',
    '标题读档入口',
    'src/main.ts',
    [530, 5874, 5879],
    'bootGame(?menu) → runOpeningMenu → doLoad(公开输入端口)',
    '从预置 quick 槽完成开局:sceneId=b、money=77、工程输入不变',
  ],
  [
    'src/main.host-lifecycle-1.test.ts',
    '标题入口视频:选中入口先播 intro 视频再进世界',
    '入口视频',
    'src/main.ts',
    [476, 477, 481, 535],
    'bootGame(?menu) → playVideoAsset(introVideo)',
    '视频 src 为入口 introVideo 资产,播完移除并进入世界',
  ],
  [
    'src/main.host-lifecycle-1.test.ts',
    '启动视频序列:无 skip-startup 时按 manifest 角色顺序播完两段再进标题菜单',
    '启动视频序列',
    'src/main.ts',
    [500, 501, 504, 488],
    'bootGame(?menu) → playVideoSequence(startupTrademark/Splash)',
    '两段视频按角色顺序开播,播完标题菜单接管帧循环',
  ],
  [
    'src/main.host-lifecycle-1.test.ts',
    '播放中快速读档:中止在途视频并按存档游标重放,奖励只结算一次',
    '播放中取消',
    'src/main.ts',
    [482, 5052, 5053],
    'F9 快速读档输入口 → restorePayload → stopAutoRunners/abortScript',
    '在途视频中止清理,行为按存档游标重放恰好一次,giveMoney 只结算一次(50→55)',
  ],
  [
    'src/main.host-lifecycle-1.test.ts',
    '资源解析中取消:视频 urlFor 返回后不再创建视频层,重放才首次开播',
    '解析中取消',
    'src/main.ts',
    [479, 480],
    'F9 → playVideoAsset 内 urlFor await 后的 signal 复检',
    '原请求 urlFor 返回后不开播(零视频层),恢复重放才首次开播',
  ],
  [
    'src/main.host-lifecycle-1.test.ts',
    '战败读最近档:多槽按 savedAt 恢复最新,战败流程不再重开',
    '战败读最近档',
    'src/main.ts',
    [2077, 2078, 2088],
    'gameOver 命令 → host.loadLastSave(公开 host 能力)',
    'savedAt 更新的 m01(66)胜过槽序在前的 m02(40),世界恢复其场景',
  ],
  [
    'src/main.host-lifecycle-1.test.ts',
    '战败无档重开:读档入口在零存档下安静收口,世界不被任何槽替换',
    '无档重开',
    'src/main.ts',
    [2080],
    'gameOver → host.loadLastSave(零 metas) → location.reload(jsdom 静默 no-op)',
    '零档下流程干净收口:世界 money/sceneId 不被替换、无未处理拒绝',
  ],
  [
    'src/main.host-lifecycle-1.test.ts',
    '场景 BGM 缺席曲臂:显式 null 停曲并落 world.audio.currentMusic=null,缺省场景延续不写键',
    '场景 BGM 三态',
    'src/main.ts',
    [914, 915, 916, 917],
    'bootGame → switchScene → commitSceneSwitch',
    '显式 null 写 world.audio.currentMusic=null 并停曲;缺省场景延续不写键',
  ],
  [
    'src/script-runner.host-lifecycle-1.test.ts',
    '生存周期命令:loadLastSave/gameOver/wait 按各自参数与 runner signal 派发宿主',
    '生存周期命令分发',
    'src/script-runner.ts',
    [529, 530, 531, 534],
    'ScriptRunner.run → exec(公开 author Command)',
    '三命令按参数与同一 runner signal 派发宿主',
  ],
  [
    'src/script-runner.host-lifecycle-1.test.ts',
    '实体与队伍走位命令:朝向/帧号/移动/坐骑逐参派发,异步项携带 signal',
    '实体走位命令分发',
    'src/script-runner.ts',
    [641, 642, 643, 724, 725, 732, 733, 697, 698, 699],
    'ScriptRunner.run → exec',
    '六命令逐参派发宿主,异步项携带 runner signal',
  ],
  [
    'src/script-runner.host-lifecycle-1.test.ts',
    '镜头与帧动画命令:cameraPan/cameraSnap/clearFrameAnimation 逐参派发',
    '镜头命令分发',
    'src/script-runner.ts',
    [782, 783, 784, 785, 773, 774],
    'ScriptRunner.run → exec',
    '镜头与帧动画命令逐参派发,pan 携带 signal',
  ],
  [
    'src/script-runner.host-lifecycle-1.test.ts',
    'setEntityPos 宿主能力缺席:跳过宿主派发仍持久写世界',
    '宿主能力缺席',
    'src/script-runner.ts',
    [581],
    'ScriptRunner.run → exec(setEntityPos?. 可选能力)',
    '宿主未实现 setEntityPos 时零派发不抛错,世界 entityPos 仍持久写入',
  ],
  [
    'src/script-runner.host-lifecycle-1.test.ts',
    'setSceneOnEnter 对既有槽覆写而不新建槽',
    '场景覆写既有槽',
    'src/script-runner.ts',
    [790, 791, 795],
    'ScriptRunner.run → exec(世界写)',
    '同场景二次 onEnter 覆写原槽,不新建槽',
  ],
  [
    'src/script-runner.host-lifecycle-1.test.ts',
    'callScript 内 returnScript 只终止被调脚本,调用方从调用点继续',
    '调用边界',
    'src/script-runner.ts',
    [456, 458, 459],
    'ScriptRunner.run → callScript(公开 resolver)',
    'callee 尾命令被终止,caller 从调用点继续执行后续命令',
  ],
  [
    'src/script-runner.host-lifecycle-1.test.ts',
    'jumpScript 在跳转处理前已取消:以 AbortError 拒绝且不解析目标',
    '跳转取消窗口',
    'src/script-runner.ts',
    [391, 392, 393],
    'ScriptRunner.onStep(公开钩子)内 abort → runLoop catch → yieldForJump',
    '已取消信号下 yieldForJump 立即以 AbortError 拒绝,resolver 零解析',
  ],
  [
    'src/script-runner-core.host-lifecycle-1.test.ts',
    'confirm 相位帧重放已选臂,宿主 confirm 不再询问',
    '续跑控制帧',
    'src/script-runner-core.ts',
    [474, 475],
    'ScriptRunnerCore.runFlow(resume frames,公开 checkAutoScriptContinuation 校验)',
    'confirm 控制帧直接重放已选臂,host.confirm 零调用,后续命令照常',
  ],
  [
    'src/script-runner-core.host-lifecycle-1.test.ts',
    'startBattle 已知战败相位只重放 onLose,不重开战斗',
    '续跑控制帧',
    'src/script-runner-core.ts',
    [508, 509],
    'ScriptRunnerCore.runFlow(resume frames)',
    'startBattle 控制帧只重放 onLose 体,host.startBattle 零调用',
  ],
  [
    'src/script-runner-core.host-lifecycle-1.test.ts',
    'teleportOut 已知失败相位只重放 onFail,不再传出',
    '续跑控制帧',
    'src/script-runner-core.ts',
    [520, 521, 522],
    'ScriptRunnerCore.runFlow(resume frames)',
    'teleportOut 控制帧只重放 onFail 体,host.teleportOut 零调用',
  ],
  [
    'src/script-runner-core.host-lifecycle-1.test.ts',
    'settle 相位写入续跑帧,宿主迟到回执静默不再发布',
    '自动单步检查点',
    'src/script-runner-core.ts',
    [387, 393, 395, 396, 400],
    'host.execute 收到的公开 AutomaticMotionCheckpoint',
    'settle(continuation) 把相位写入续跑游标帧;帧推进后的迟到 ready/settle 静默',
  ],
  [
    'src/script-runner-core.host-lifecycle-1.test.ts',
    '活发布窗口内的检查点 stop 被吞没,真实错误按原样穿透宿主提交批',
    '检查点发布窗口',
    'src/script-runner-core.ts',
    [382, 383, 384, 385, 386, 387],
    'AutomaticMotionCheckpoint.settle → publish(公开接口)',
    '租约过期 stop 吞没不打断宿主同步提交批;控制器真实错误原样穿透',
  ],
  [
    'src/script-runner-core.host-lifecycle-1.test.ts',
    '宿主持有的检查点在空执行帧上请求变更走 setCheckpointReady 的 wait 门',
    '空帧检查点门',
    'src/script-runner-core.ts',
    [227, 228, 229, 230, 231, 255, 256],
    'AutomaticCommandCheckpoint.beginMutation(段体收尾后宿主仍持有)',
    '空帧变更请求经 setCheckpointReady:wait 挂起并经 checkpointGate 重请求一次后放行',
  ],
  [
    'src/script-runner-core.host-lifecycle-1.test.ts',
    'setCheckpointReady 返回 stop 时空帧变更令本次激活干净收尾且不提交游标',
    '空帧检查点门',
    'src/script-runner-core.ts',
    [229, 230, 311, 312, 313],
    '同上',
    'stop 决策令激活干净收尾:零游标提交、无未处理拒绝',
  ],
  [
    'src/script-runner-core.host-lifecycle-1.test.ts',
    '嵌套分支超过 256 执行帧时精确熔断',
    '执行帧深',
    'src/script-runner-core.ts',
    [320, 321],
    'ScriptRunnerCore.runFlow(合法深层嵌套 author flow)',
    '第 257 层 runCommands 入口精确拒绝:执行帧深度超过256',
  ],
  [
    'src/script-host-adapter.host-lifecycle-1.test.ts',
    '生存周期命令:读档/战败/等待/回标题按 signal 与参数派发宿主',
    'adapter 生存周期',
    'src/script-host-adapter.ts',
    [62, 63, 65, 68, 69, 268, 269],
    'executeScriptHostEffect(公开入口,compileBaseCommands 守卫)',
    '四命令按参数与 signal 派发宿主',
  ],
  [
    'src/script-host-adapter.host-lifecycle-1.test.ts',
    '全队增益与装备命令:复活/学艺/卸装按角色参数派发宿主',
    'adapter 全队命令',
    'src/script-host-adapter.ts',
    [140, 141, 144, 147, 150, 151],
    'executeScriptHostEffect',
    '复活/学艺/卸装按角色参数派发,slot=all 与数字槽分别透传',
  ],
  [
    'src/script-host-adapter.host-lifecycle-1.test.ts',
    'runEntityTrigger 直派拒绝:adapter 层 fail-loud,必须由调用桥执行',
    'adapter 调用桥门',
    'src/script-host-adapter.ts',
    [31, 32],
    'executeScriptHostEffect(runEntityTrigger 叶)',
    '直派 fail-loud 且宿主零调用',
  ],
  [
    'src/script-host-adapter.host-lifecycle-1.test.ts',
    '队伍与镜头命令:瞬移/朝向/坐骑/镜头/帧动画清屏逐参派发',
    'adapter 队伍镜头',
    'src/script-host-adapter.ts',
    [
      71, 72, 85, 86, 87, 102, 103, 251, 252, 253, 291, 292, 293, 295, 296, 319, 320, 321, 323, 324,
      313, 314, 315,
    ],
    'executeScriptHostEffect',
    '九命令逐参派发,异步项携带 signal',
  ],
  [
    'src/script-host-adapter.host-lifecycle-1.test.ts',
    '全队与氛围命令:setParty/setFollowers/toggleDayNight/halveMoney 逐参派发且金额减半按查询余额',
    'adapter 全队氛围',
    'src/script-host-adapter.ts',
    [155, 156, 159, 162, 167, 168, 169, 170, 259, 260],
    'executeScriptHostEffect',
    '逐参派发;halveMoney 按查询余额 60 派发扣减 -30',
  ],
  [
    'src/script-host-adapter.host-lifecycle-1.test.ts',
    'vanishEntity 三态:显式在场派发,缺省回落 self,跨场景目标零派发',
    'vanish 三态',
    'src/script-host-adapter.ts',
    [57, 58, 59, 60],
    'executeScriptHostEffect(EntityAddress 目标过滤)',
    '显式在场派发秒数;缺省回落 self 且缺省 2 秒;跨场景零派发',
  ],
]

// vitest 的 fullName 把 describe 前缀以空格并入;ledger 记测试名本体,按后缀双向匹配。
const matched = new Map()
for (const [file, name] of rows.map((r) => [r[0], r[1]])) {
  const hits = identity.rows.filter((r) => r.file === file && r.fullName.endsWith(name))
  if (hits.length !== 1)
    throw new Error(`ledger 条目未唯一命中身份账: ${file}|${name} → ${hits.length}`)
  matched.set(`${file}|${name}`, hits[0])
}
const unmatched = identity.rows.filter((r) => ![...matched.values()].some((m) => m === r))
if (unmatched.length)
  throw new Error(
    `身份账存在 ledger 未覆盖用例: ${JSON.stringify(unmatched.map((r) => `${r.file}|${r.fullName}`))}`,
  )
const entries = rows
  .map(([file, fullName, family, source, sourceLines, caller, oracle]) => ({
    file,
    identityFullName: matched.get(`${file}|${fullName}`).fullName,
    name: fullName,
    family,
    source,
    sourceLines,
    caller,
    oracle,
  }))
  .sort((a, b) => (a.file < b.file ? -1 : a.file > b.file ? 1 : a.name < b.name ? -1 : 1))
const outPath = path.join(evidenceDir, 'hl1-family-ledger.json')
await writeFile(
  outPath,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), entries }, null, 2)}\n`,
)
// 以仓库 biome 为唯一定稿者,保证再生成逐字节一致。
const fmt = spawnSync('pnpm', ['exec', 'biome', 'format', '--write', outPath], {
  cwd: pkgRoot,
  encoding: 'utf8',
})
if (fmt.status !== 0) throw new Error(`biome format 失败: ${fmt.stderr}`)
console.log(`hl1 family ledger: ${entries.length} 条 → hl1-family-ledger.json`)
