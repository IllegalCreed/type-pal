/**
 * 生成 pal-extract 126 边逐条不可达账（Markdown 片段）→ 拼接进证据文档。
 * 行数据 = fast lcov BRDA 一手测量（branch line 全集）+ 逐行源码条件手录。
 * 用法：node docs/ops/evidence/gen-kimi-r1-ledger.mjs（幂等重写 ledger 段）。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const docPath = resolve(root, 'docs/ops/evidence/coverage85-kimi-extract-migrate-r1-evidence.md')

// 公开入口速记（逐行填 `pnpm extract`）；G1 组级证明见表下注。
const PE = '`pnpm extract`（tsx 子进程）'
const PEV = '`pnpm extract:videos`（tsx 子进程）'

// cli.ts 93 边：[line, 分支条件, 阶段]
const cli = [
  [167, '`loadMkfChunk` default `decompress=false` 形参默认臂', '模块级 helper'],
  [170, '`decompress ? decompressYj2(chunk) : chunk`', '模块级 helper'],
  [170, '同上（另一方向）', '模块级 helper'],
  [174, '`if (a.byteLength !== b.byteLength) return false`（equalBytes）', '模块级 helper'],
  [174, '同上（另一方向）', '模块级 helper'],
  [176, '`if (a[i] !== b[i]) return false`（equalBytes）', '模块级 helper'],
  [176, '同上（另一方向）', '模块级 helper'],
  [189, '`if (!OUT.endsWith(sep + "data" + sep + "extracted")) throw`', 'OUT 清理'],
  [189, '同上（另一方向）', 'OUT 清理'],
  [195, '`if (PRESERVE.has(entry)) continue`（videos/ 保留）', 'OUT 清理'],
  [195, '同上（另一方向）', 'OUT 清理'],
  [204, '`existsSync(SYMBOLS_PATH) ? JSON.parse(…) : {}`', '共享数据'],
  [204, '同上（另一方向）', '共享数据'],
  [227, '`if (it.scriptOnUse > 0) globalScriptEntries.push`', 'entryIps 收集'],
  [227, '同上（另一方向）', 'entryIps 收集'],
  [228, '`if (it.scriptOnEquip > 0) push`', 'entryIps 收集'],
  [228, '同上（另一方向）', 'entryIps 收集'],
  [229, '`if (it.scriptOnThrow > 0) push`', 'entryIps 收集'],
  [229, '同上（另一方向）', 'entryIps 收集'],
  [230, '`if (it.scriptDesc > 0) push`', 'entryIps 收集'],
  [230, '同上（另一方向）', 'entryIps 收集'],
  [233, '`if (sp.scriptOnUse > 0) push`', 'entryIps 收集'],
  [233, '同上（另一方向）', 'entryIps 收集'],
  [234, '`if (sp.scriptOnSuccess > 0) push`', 'entryIps 收集'],
  [234, '同上（另一方向）', 'entryIps 收集'],
  [235, '`if (sp.scriptDesc > 0) push`', 'entryIps 收集'],
  [235, '同上（另一方向）', 'entryIps 收集'],
  [238, '`if (eo.scriptOnTurnStart > 0) push`', 'entryIps 收集'],
  [238, '同上（另一方向）', 'entryIps 收集'],
  [239, '`if (eo.scriptOnBattleEnd > 0) push`', 'entryIps 收集'],
  [239, '同上（另一方向）', 'entryIps 收集'],
  [240, '`if (eo.scriptOnReady > 0) push`', 'entryIps 收集'],
  [240, '同上（另一方向）', 'entryIps 收集'],
  [243, '`if (op.scriptOnFriendDeath > 0) push`', 'entryIps 收集'],
  [243, '同上（另一方向）', 'entryIps 收集'],
  [244, '`if (op.scriptOnDying > 0) push`', 'entryIps 收集'],
  [244, '同上（另一方向）', 'entryIps 收集'],
  [249, '`if (sc.scriptOnEnter > 0) entryIps.push`', 'entryIps 收集'],
  [249, '同上（另一方向）', 'entryIps 收集'],
  [250, '`if (sc.scriptOnTeleport > 0) entryIps.push`', 'entryIps 收集'],
  [250, '同上（另一方向）', 'entryIps 收集'],
  [253, '`if (eo.triggerScript > 0) entryIps.push`', 'entryIps 收集'],
  [253, '同上（另一方向）', 'entryIps 收集'],
  [254, '`if (eo.autoScript > 0) entryIps.push`', 'entryIps 收集'],
  [254, '同上（另一方向）', 'entryIps 收集'],
  [264, '`verify.byteLength !== sss.bytecode.byteLength ||`（round-trip 门）', 'round-trip 门'],
  [264, '`!equalBytes(verify, sss.bytecode)`（同门第二条件）', 'round-trip 门'],
  [264, '同上（另一方向）', 'round-trip 门'],
  [264, '同上（另一方向）', 'round-trip 门'],
  [462, '`if (!portrait) continue`（RGM 空头像 skip）', 'RGM.MKF'],
  [462, '同上（另一方向）', 'RGM.MKF'],
  [491, '`if (!icon) continue`（BALL 空图标 skip）', 'BALL.MKF'],
  [491, '同上（另一方向）', 'BALL.MKF'],
  [523, '`decompressed.byteLength < 2 ? [] : parseSpriteChunk(…)`', 'FIRE.MKF'],
  [523, '同上（另一方向）', 'FIRE.MKF'],
  [524, '`if (frames.length > 0) writeBinary(…)`', 'FIRE.MKF'],
  [524, '同上（另一方向）', 'FIRE.MKF'],
  [549, '`if (buf.byteLength === 0) continue`（空音效 skip）', 'SOUNDS.MKF'],
  [549, '同上（另一方向）', 'SOUNDS.MKF'],
  [566, "`if (lower.endsWith('.mid'))`", 'Musics/'],
  [566, '同上（另一方向）', 'Musics/'],
  [573, '`if (Number.isFinite(num)) midiNums.push(num)`', 'Musics/'],
  [573, '同上（另一方向）', 'Musics/'],
  [574, "`else if (lower.endsWith('.ogg'))`", 'Musics/'],
  [574, '同上（另一方向）', 'Musics/'],
  [604, '`if (raw.byteLength === 0) continue`（splash 空 chunk）', 'splash/FBP'],
  [604, '同上（另一方向）', 'splash/FBP'],
  [611, '`if (pixels.byteLength !== 320 * 200) warn+continue`', 'splash/FBP'],
  [611, '同上（另一方向）', 'splash/FBP'],
  [640, '`if (!scene) continue`（uniqueMapNums 收集）', '地图收集'],
  [640, '同上（另一方向）', '地图收集'],
  [641, '`if (scene.mapNum >= mapChunkCount) warn+continue`', '地图收集'],
  [641, '同上（另一方向）', '地图收集'],
  [653, '`if (uniqueMapNums.has(m)) continue`', '地图收集'],
  [653, '同上（另一方向）', '地图收集'],
  [654, '`if (readChunk(mapMkf, m).byteLength > 0) uniqueMapNums.add(m)`', '地图收集'],
  [654, '同上（另一方向）', '地图收集'],
  [663, '`if (rawMapChunk.byteLength === 0) warn+continue`', '地图收集'],
  [663, '同上（另一方向）', '地图收集'],
  [702, '`if (!s) continue`（scene dump）', 'scene dump'],
  [702, '同上（另一方向）', 'scene dump'],
  [727, '`if (palBuf.byteLength < 768) continue`（非调色板 chunk）', 'PAT.MKF'],
  [727, '同上（另一方向）', 'PAT.MKF'],
  [750, '`if (raw.byteLength === 0) continue`（MGO 空 chunk）', 'MGO.MKF'],
  [750, '同上（另一方向）', 'MGO.MKF'],
  [797, '`if (raw.byteLength === 0) continue`（F/ABC 空 chunk）', 'F/ABC.MKF'],
  [797, '同上（另一方向）', 'F/ABC.MKF'],
  [839, '`if (raw.byteLength === 0) continue`（FBP 背景空 chunk）', 'FBP.MKF 背景'],
  [839, '同上（另一方向）', 'FBP.MKF 背景'],
  [847, '`if (pixels.byteLength !== 320 * 200) warn+continue`', 'FBP.MKF 背景'],
  [847, '同上（另一方向）', 'FBP.MKF 背景'],
  [872, '`if (existsSync(BDF_PATH))`（BDF 缺失 warn 臂）', 'BDF 字形'],
  [872, '同上（另一方向）', 'BDF 字形'],
]

// extract-videos.ts 12 边
const videos = [
  [52, '`if (!existsSync(rawPath)) throw`（AVI missing）'],
  [52, '同上（另一方向）'],
  [57, '`if (existsSync(mp4Path))`（增量 skip 判定）'],
  [57, '同上（另一方向）'],
  [59, '`mp4Stat.mtimeMs >= rawStat.mtimeMs &&`'],
  [59, '同上（另一方向）'],
  [59, '`mp4Stat.size > 0`（同判定第三条件）'],
  [59, '同上（另一方向）'],
  [93, '`if (mp4Stat.size === 0) throw`（ffmpeg 空输出）'],
  [93, '同上（另一方向）'],
  [116, '`if (r.skipped) … else …`（日志分派）'],
  [116, '同上（另一方向）'],
]

// 其余 21 边：[file:line, 分支条件, 公开入口, 不可构造条件, 反例]
const others = [
  [
    'src/events/annotate.ts:43',
    '`s.spell?.[String(id)]`（symbols 优先臂）',
    'annotate()（导出；caller=cli.ts:270）',
    'RULES 的 spellId 无任何 Command 变体携带（shared/events.ts union 枚举），唯一 caller 只喂 disasm 产物，无生产者',
    '若 disasm 未来产出带 spellId 的具名命令，本臂即合法可测，本行失效',
  ],
  [
    'src/events/annotate.ts:43',
    '`?? wordAt(w.spells, id, SPELL_OBJ_START)`（word 回退臂）',
    'annotate()（同上）',
    '同上无生产者',
    '同上',
  ],
  [
    'src/events/annotate.ts:48',
    '`s.person?.[String(id)]`（symbols 优先臂）',
    'annotate()（同上）',
    'personId 无生产者（同上游枚举）',
    '同上（personId 具名化时）',
  ],
  [
    'src/events/annotate.ts:48',
    '`?? wordAt(w.persons, id, PERSON_OBJ_START)`（word 回退臂）',
    'annotate()（同上）',
    '同上无生产者',
    '同上',
  ],
  [
    'src/events/annotate.ts:53',
    '`s.enemy?.[String(id)]`（symbols 优先臂）',
    'annotate()（同上）',
    'enemyId 无生产者（同上游枚举）',
    '同上（enemyId 具名化时）',
  ],
  [
    'src/events/annotate.ts:53',
    '`?? wordAt(w.enemies, id, ENEMY_OBJ_START)`（word 回退臂）',
    'annotate()（同上）',
    '同上无生产者',
    '同上',
  ],
  [
    'src/events/disasm.ts:225',
    '`operands[0] ?? 0`（emitRawFallback）',
    'disasm()（导出；caller=cli.ts:260、roundtrip.ts:26）',
    'emitRawFallback 的唯一调用点 emitCommand 恒传定长三元组 [o0,o1,o2]（noUncheckedIndexedAccess 类型防御）',
    '若 emitCommand 改传变长 operands（无当前 caller 形状），本臂可测',
  ],
  [
    'src/events/disasm.ts:225',
    '`operands[1] ?? 0`（同上）',
    'disasm()（同上）',
    '同上定长三元组',
    '同上',
  ],
  [
    'src/events/disasm.ts:225',
    '`operands[2] ?? 0`（同上）',
    'disasm()（同上）',
    '同上定长三元组',
    '同上',
  ],
  [
    'src/events/disasm.ts:235',
    '`found === undefined`（findOpcodeByName `||` 左臂）',
    'disasm()（同上）',
    '能走到这里的 verb 在 opcodeTable 均单映射（startBattle/waitFrames/setObjectXY/setScriptEntry/setObjectState/playMusic/playSfx/ifItemLess 枚举），循环一次即出，左臂恒真',
    '若某 verb 在表内挂多 opcode 且走 raw 回退（当前仅 end/goto 系多挂且均有专属 case），本臂可测',
  ],
  [
    'src/events/disasm.ts:235',
    '`n < found`（`||` 右臂）',
    'disasm()（同上）',
    '同上：单映射使右臂永不求值',
    '同上',
  ],
  [
    'src/events/disasm.ts:238',
    '`found ?? 0`',
    'disasm()（同上）',
    'verb 必在表内（def 来自同一 opcodeTable），found 恒有值',
    '若 opcodeTable 与 emitCommand case 失配（def.name 不在表），本臂可测——即产品 bug，无合法输入',
  ],
  [
    'src/events/recompile.ts:34',
    '`c.resetTo ?? 0`',
    'recompile()（导出；caller=cli.ts:263、roundtrip.ts:27）',
    '真实 caller（disasm 产物）reset 时恒带 resetTo；R04/R05 评审明确缺省默认政策未定、不为无消费行为钉绿测',
    '若上游评审改定缺省政策且有真实消费者，本臂须补绿测，本行失效',
  ],
  [
    'src/events/recompile.ts:35',
    '`c.idleFrames ?? 0`',
    'recompile()（同上）',
    '同上（reset 时恒带 idleFrames）',
    '同上',
  ],
  [
    'src/events/recompile.ts:41',
    '`labels.get(c.to) ?? 0`（dangling label 写 0）',
    'recompile()（同上）',
    'disasm 的 goto 目标若出界则 pass-2 不打标，但 R04/R05 已裁决缺 label 政策未定、不为该默认钉合同',
    '同上',
  ],
  [
    'src/events/recompile.ts:42',
    '`c.frameDelay ?? 0`',
    'recompile()（同上）',
    'disasm emitGoto 恒产 frameDelay，真实 caller 无缺失形状',
    '同上',
  ],
  [
    'src/events/slice.ts:35',
    '`(c.operands[0] ?? 0)`（0xA2 随机跳）',
    'sliceByScene()（导出；caller=cli.ts:271）',
    'RawCommand.operands 为定长三元组类型，typed/真实 disasm 输入不可缺元素',
    '若 RawCommand 类型放宽为变长数组（schema 变更），本臂可测',
  ],
  [
    'src/events/slice.ts:193',
    '`(sceneCount[i] ?? 0) > 1`（shared predicate）',
    'sliceByScene()（同上）',
    'sceneCount 由 commands.map 构建、与 commands 同长，collectAndRewrite 的 i 恒 < commands.length',
    '若 collectAndRewrite 改为越界回调（无当前调用形状），本臂可测',
  ],
  [
    'src/events/roundtrip.ts:29',
    '`if (back.byteLength !== sss.bytecode.byteLength)`',
    'roundtripCheck()（导出；fast 排除的 roundtrip.test.ts 与本卡 roundtrip.kimi-r1 为 caller）',
    'disasm 每 8B 恒产 1 命令、recompile 每命令恒产 8B，byteLength 结构相等',
    '若 disasm 改为非 1:1 产命令（设计变更），本臂可测',
  ],
  [
    'src/resources/scene.ts:52',
    '`if (!scene) continue`（dumpAllEventObjects）',
    'dumpAllEventObjects()（导出；caller=cli.ts:713）',
    '循环上界为 scenes.length 且数组 dense（parseSss 固定 8B 记录产出），越界无源',
    '若 scenes 来源改为稀疏/ragged 输入（无当前 caller 形状），本臂可测',
  ],
  [
    'src/resources/parsers/player-roles.ts:211',
    '`if (cursor !== PLAYER_ROLES_BYTES) throw`',
    'parsePlayerRoles()（导出；caller=cli.ts:346）',
    '入函数先验 900B 长度，cursor 全程固定步进（PLAYER_FIELD_SIZE 常量），终值恒等',
    '若字段序/步进改动而 sizeof 断言未同步（产品 bug），本臂可测——无合法输入',
  ],
]

function row(cells) {
  return `| ${cells.join(' | ')} |`
}

const out = []
out.push('### U1 · pal-extract src/cli.ts 93 边（逐条）')
out.push('')
out.push('组级条件（适用全表）：cli.ts 无导出、import 即执行 `main()`；`REPO_ROOT/RAW/OUT` 由')
out.push('`import.meta.url` 派生真实仓库常量（cli.ts:73-77）；main 首步清理真实')
out.push('`data/extracted`（:189-197）并逐阶段写盘。唯一公开入口 `pnpm extract`（tsx 子进程）；')
out.push(
  '子进程执行零覆盖归因（`coverage85-kimi-extract-migrate-r1/subprocess-coverage-probe.txt`，',
)
out.push('non-zero DA/BRDA entries: 0）；进程内 import = 清理+覆写真实 extracted（卡面禁止）；')
out.push('mkdtemp 副本路径在 coverage.include（`src/**/*.ts`）之外不计入。')
out.push('组级反例：若未来 vitest v8 归并子进程 NODE_V8_COVERAGE，或 cli.ts 拆出可注入')
out.push('RAW/OUT 的公开 runner 导出，全表臂即合法可达，本账失效须重测。')
out.push('')
out.push(row(['source:file:line', '分支条件', '公开入口', '不可构造条件', '反例']))
out.push(row(['---', '---', '---', '---', '---']))
for (const [line, cond, stage] of cli) {
  out.push(
    row([
      `src/cli.ts:${line}`,
      cond,
      PE,
      `import 即于真实仓库执行 main（清理/覆写真实 extracted，卡面禁止）；子进程零归因；本臂属${stage}段`,
      '同 L01 组级反例',
    ]),
  )
}
out.push('')
out.push('### U2 · pal-extract scripts/extract-videos.ts 12 边（逐条）')
out.push('')
out.push('组级条件：同 L01 归因；另需 ffmpeg 与真实 `data/raw/{1-6}.avi`，写真实')
out.push('`data/extracted/videos`（extract-videos.ts:30-45/118-131）；无导出、import 即跑 main。')
out.push('')
out.push(row(['source:file:line', '分支条件', '公开入口', '不可构造条件', '反例']))
out.push(row(['---', '---', '---', '---', '---']))
for (const [line, cond] of videos) {
  out.push(
    row([
      `scripts/extract-videos.ts:${line}`,
      cond,
      PEV,
      '需 ffmpeg+真实 avi+写真实 videos/；子进程零归因；import 即于真实仓库执行',
      '同 L01 组级反例',
    ]),
  )
}
out.push('')
out.push('### U3 · pal-extract 类型防御/无生产者/政策未定 21 边（逐条）')
out.push('')
out.push(row(['source:file:line', '分支条件', '公开入口', '不可构造条件', '反例']))
out.push(row(['---', '---', '---', '---', '---']))
for (const [anchor, cond, entry, reason, falsifier] of others) {
  out.push(row([anchor, cond, entry, reason, falsifier]))
}

const ledger = out.join('\n')
let doc = readFileSync(docPath, 'utf8')
const sectionAnchor = '## 不可达/防御臂账（一手证明）'
const secIdx = doc.indexOf(sectionAnchor)
const migrateIdx = doc.indexOf('| U9 ')
const doneIdx = doc.indexOf('### U4-U15 · migrate 侧')
if (secIdx < 0) throw new Error('ledger section anchor missing')
// 幂等：既拼接态（### U4-U15 存在）时只替换 U1-U3 段；否则从原始 U9-U20 表重编号生成。
if (migrateIdx < 0 && doneIdx < 0) throw new Error('ledger splice anchors missing')
if (doneIdx >= 0) {
  if (doc.slice(doneIdx).search(/\n## /) < 0) throw new Error('migrate section tail missing')
  doc = `${doc.slice(0, secIdx + sectionAnchor.length)}\n\n${ledger}\n\n${doc.slice(doneIdx)}`
  writeFileSync(docPath, doc)
  console.log(`ledger rows: ${cli.length + videos.length + others.length} (idempotent re-splice)`)
} else {
  if (migrateIdx < 0 || migrateIdx <= secIdx) throw new Error('ledger splice anchors missing')
  // migrate 表头（U9-U20 共用一个表；重编号 U4-U15）
  const tableHead = `| # | 源锚 | 判定 | 一手证据 |
|---|---|---|---|
`
  const migrateBody = doc.slice(migrateIdx)
  const nextSection = migrateBody.search(/\n## /)
  if (nextSection < 0) throw new Error('migrate section tail missing')
  const renumbered = migrateBody
    .slice(0, nextSection)
    .replace(/^\| U(\d+) \|/gm, (_m, n) => `| U${Number(n) - 5} |`)
  const tail = migrateBody.slice(nextSection)
  doc =
    doc.slice(0, secIdx + sectionAnchor.length) +
    `

${ledger}

### U4-U15 · migrate 侧（原 U9-U20 重编号）

${tableHead}${renumbered}` +
    tail
  writeFileSync(docPath, doc)
  console.log(`ledger rows: ${cli.length + videos.length + others.length}`)
}
console.log(`ledger rows: ${cli.length + videos.length + others.length}`)
