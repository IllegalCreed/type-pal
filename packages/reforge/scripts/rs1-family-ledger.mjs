#!/usr/bin/env node
// TEST-GLM-REFORGE-RUNTIME-SESSION-1 — family ledger:逐 fullName→family→源行→caller→oracle,
// 与身份账(rs1-identity-status.json)双向核对,未匹配即退出非零。
// 重建:node scripts/rs1-family-ledger.mjs(输出经仓库 biome 定稿,再生成零 diff)。
import { spawnSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const evidenceDir = path.join(pkgRoot, 'src', '__tests__', 'runtime-session-1')
const identity = JSON.parse(
  await readFile(path.join(evidenceDir, 'rs1-identity-status.json'), 'utf8'),
)

const rows = [
  [
    'src/runtime-input-router.runtime-session-1.test.ts',
    '菜单层原样接收完整按键集合,路由器不预滤也不旁路派发任何键',
    '输入仲裁',
    'src/runtime-input-router.ts',
    [37],
    'routeRuntimeInput(公开 router,main.ts:5635 routeInput 桥)',
    '菜单帧把完整按键集(方向/取消/F5/[/杂键)原样交给 menu.input;不触发 save/open/changeDebugScene',
  ],
  [
    'src/runtime-frame-session.runtime-session-1.test.ts',
    '混合截止时间的等待按到期子集逆向结算,零毫秒等待在下一帧边界先行完成',
    '帧推进',
    'src/runtime-frame-session.ts',
    [96, 97, 98, 99, 100, 101, 102, 103],
    'RuntimeFrameSession.tick(公开 tick,main.ts:5635 帧循环)',
    '到期子集(含 >= 边界与 0ms)按注册逆序结算;未到期等待不因他人到期被连带结算',
  ],
  [
    'src/runtime-frame-session.runtime-session-1.test.ts',
    '暂停后恢复的淡入从 gameplay 时间推进,不采用墙钟时间',
    '暂停/恢复',
    'src/runtime-frame-session.ts',
    [93, 94, 104],
    'RuntimeFrameSession.tick → ports.advanceFade(this.#now)',
    '冻结帧零淡入;恢复帧淡入收到 gameplay now(200)而非 realNow(5100)',
  ],
  [
    'src/world-motion-runtime.runtime-session-1.test.ts',
    '中止在途实体走位按来源署名拒绝并清空注册表',
    '取消',
    'src/world-motion-runtime.ts',
    [258, 290],
    'registerMove(公开注册,main.ts script/auto 走位适配)',
    'signal 中止以「实体 id {source} 走位所属 runner 已取消」拒绝;槽位出注册表且 abort 监听器分离',
  ],
  [
    'src/world-motion-runtime.runtime-session-1.test.ts',
    '预中止信号让全部注册入口立即拒绝且不留槽位',
    '取消',
    'src/world-motion-runtime.ts',
    [216, 254, 298, 355],
    'schedulePartyMove/registerMove/registerAutoStep/registerChase(公开注册入口)',
    '预中止 signal 立即拒绝四个入口;partyMove 为 null、双注册表空、onRegistered 零调用',
  ],
  [
    'src/world-motion-runtime.runtime-session-1.test.ts',
    '中止在途 auto 单步拒绝且不留下已提交续点',
    '取消',
    'src/world-motion-runtime.ts',
    [336, 337, 338, 339, 340, 341, 342, 344, 348],
    'registerAutoStep(公开注册,main.ts auto 单步适配)',
    '中止以「auto 实体 id 单步所属 runner 已取消」拒绝;autoSlots 清空且 autoLineages 无残留',
  ],
  [
    'src/world-motion-runtime.runtime-session-1.test.ts',
    '同目标重复注册以替换消息拒绝旧等待者并由新槽接管注册表',
    '取消/迟到回执',
    'src/world-motion-runtime.ts',
    [288, 345, 413],
    'registerMove/registerAutoStep(公开注册,替换路径)',
    '同源重注册旧等待者以替换消息拒绝、新槽接管注册表与 commandEpoch;auto 走位被单步跨类替换',
  ],
  [
    'src/world-motion-runtime.runtime-session-1.test.ts',
    '实体 authority 接管清空旧 owner 的步态与侧避锁',
    '取消',
    'src/world-motion-runtime.ts',
    [163, 164, 165, 166, 167, 168, 169, 170, 171],
    'MotionRuntimeCoordinator 构造回调(authorityChanged → clearGait/clearStick)',
    'setAuthority(实体)后步态/gaitOwner/lastMovedTick 清空、休眠侧避锁不再进入下一批 plan',
  ],
  [
    'src/world-motion-runtime.runtime-session-1.test.ts',
    '单步 attempted 结算后的迟到回执不再重发 committed 回调',
    '迟到回执',
    'src/world-motion-runtime.ts',
    [312, 313, 314, 315, 316, 317, 318, 334, 335],
    'registerAutoStep settle(公开 slot 回执:resolve/dropByAuthority/cancel)',
    'attempted 结算后迟到 drop/cancel/resolve 不重发 onCommitted;已提交续点保留',
  ],
  [
    'src/world-motion-runtime.runtime-session-1.test.ts',
    '追逐取消结算后的迟到调用不再重发任何回调',
    '迟到回执',
    'src/world-motion-runtime.ts',
    [372, 373, 374, 375, 376, 377, 378, 396, 403, 404, 405, 406, 407, 408],
    'registerChase settle(公开 slot 回执:resolve/dropByAuthority/cancel)',
    '取消结算后迟到 resolve/drop/cancel 不重发 onCancelled/onDropped/onCommitted 任何一个',
  ],
  [
    'src/world-motion-runtime.runtime-session-1.test.ts',
    'scene token 在注册时快照,teardown 失效后旧槽保持旧 token 而新注册取新 token',
    'scene token 失效',
    'src/world-motion-runtime.ts',
    [276, 565, 566, 567, 568, 569, 570, 571, 572, 573, 574, 575, 576],
    'registerMove(teardownScene → teardownMotionRuntime → invalidateSceneSession)',
    'token 注册时快照;teardown 先取消槽位(authority 尚在)再释放;旧槽迟到回执持旧 token,新注册(含跨场景)取换代后 token',
  ],
  [
    'src/runtime-project-view.runtime-session-1.test.ts',
    '运行时视图剥离 hostile onLose 命令体,gameOver 与其余 hostile 字段逐字保留',
    'world-view 替换',
    'src/runtime-project-view.ts',
    [152, 153, 154, 155, 159],
    'baseSceneView/projectRuntimeEntity(公开投影,main.ts:365 runtimeSceneView)',
    '命令体 onLose 投影为 [];gameOver/chase/onVictory/onPlayerFlee 逐字克隆;无 hostile 实体不造键;投影不写回 canonical',
  ],
  [
    'src/runtime-project-view.runtime-session-1.test.ts',
    '刷新跳过 canonical 缺席的视图实体,保留其活体绑定',
    'world-view 替换',
    'src/runtime-project-view.ts',
    [181, 182, 183, 184, 185, 186, 187],
    'refreshSceneViewBindings(公开刷新,main.ts:2956 refreshCurrentScriptBindings)',
    'canonical 离场实体(定义缺席)页绑定与活体位置原样保留;在场实体照常刷新回缺省投影',
  ],
  [
    'src/runtime-project-view.runtime-session-1.test.ts',
    'scratch 对 followers/mapOverride/entityLayer 逐腿深拷贝,缺席不造空对象',
    'world-view 替换',
    'src/runtime-project-view.ts',
    [277, 278, 279, 280, 281, 282],
    'projectedWorldScriptScratch(公开平面化,main.ts:561/605)',
    '三条可选腿按在场深拷贝(改 scratch 不写回 world)、只含当前场景、缺席不造空对象',
  ],
  [
    'src/runtime-project-view.runtime-session-1.test.ts',
    'runtimeProjectView 整体替换:入口场景重投影、items 适配、scriptStore 显式置空、其余透传',
    'world-view 替换',
    'src/runtime-project-view.ts',
    [255, 256, 257, 258, 259, 260, 261, 262, 263, 264, 265],
    'runtimeProjectView(公开整体投影,main.ts:279)',
    '入口场景为新投影对象;items runScript 引用落运行时 chunk;scriptStore own-key 显式 undefined;sceneIndex/actorsById/assetResolver 引用透传',
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
const outPath = path.join(evidenceDir, 'rs1-family-ledger.json')
await writeFile(
  outPath,
  `${JSON.stringify({ generatedAt: identity.generatedAt, entries }, null, 2)}\n`,
)
// 以仓库 biome 为唯一定稿者,保证再生成逐字节一致。
const fmt = spawnSync('pnpm', ['exec', 'biome', 'format', '--write', outPath], {
  cwd: pkgRoot,
  encoding: 'utf8',
})
if (fmt.status !== 0) throw new Error(`biome format 失败: ${fmt.stderr}`)
console.log(`rs1 family ledger: ${entries.length} 条 → rs1-family-ledger.json`)
