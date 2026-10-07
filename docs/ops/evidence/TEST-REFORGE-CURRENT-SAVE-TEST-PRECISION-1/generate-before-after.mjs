// TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1 生成 before-after.tsv（一次性证据工具，不进默认 runner）。
// 旧侧 fullName 逐字取自基线 JSON 报告 /tmp/old-inventory.json（未改动树定向运行），
// 新侧取自候选 JSON /tmp/save-precision-candidate.json；处置与剩余 oracle 映射为人工裁决，
// 生成器只负责拼接，避免手抄 fullName 漂移。
import { readFileSync, writeFileSync } from 'node:fs'

const oldRows = JSON.parse(readFileSync('/tmp/old-inventory.json', 'utf8'))
const cand = JSON.parse(readFileSync('/tmp/save-precision-candidate-r2.json', 'utf8'))
const newFullNames = new Set()
for (const s of cand.testResults) {
  if (
    !s.name.endsWith('save/current-structure.test.ts') &&
    !s.name.endsWith('save/current-save.current-characterization.test.ts') &&
    !s.name.endsWith('save/current-codec.contracts.test.ts')
  )
    continue
  for (const a of s.assertionResults) newFullNames.add(a.fullName)
}

const STRUCT = 'packages/reforge/src/save/current-structure.test.ts'
const CHAR = 'packages/reforge/src/save/current-save.current-characterization.test.ts'
const CODEC = 'packages/reforge/src/save/current-codec.contracts.test.ts'

/** 处置表：before key 为旧 fullName（或其唯一前缀锚），after 为新 fullName（必须逐字存在，
 * 除非是 DROP——after 填剩余 oracle 位置）。 */
const dispositions = [
  // ---- characterization ----
  [
    `${CHAR} :: current SAVE11/content22 contract round-trips the current envelope without mutating input or resetting world values`,
    'kept',
    `${CHAR} :: current SAVE11/content22 contract round-trips the current envelope without mutating input or resetting world values`,
  ],
  [
    `${CHAR} :: current SAVE11/content22 contract rejects non-current SAVE9/content21 before normalization`,
    'merged',
    `${CHAR} :: current SAVE11/content22 contract rejects non-current SAVE10/content21 before normalization`,
  ],
  [
    `${CHAR} :: current SAVE11/content22 contract rejects non-current SAVE10/content19 before normalization`,
    'merged',
    `${CHAR} :: current SAVE11/content22 contract rejects non-current SAVE10/content21 before normalization`,
  ],
  [
    `${CHAR} :: current SAVE11/content22 contract rejects non-current SAVE8/content20 before normalization`,
    'merged',
    `${CHAR} :: current SAVE11/content22 contract rejects non-current SAVE10/content21 before normalization`,
  ],
  [
    `${CHAR} :: current SAVE11/content22 contract rejects non-current SAVE7/content19 before normalization`,
    'merged',
    `${CHAR} :: current SAVE11/content22 contract rejects non-current SAVE10/content21 before normalization`,
  ],
  [
    `${CHAR} :: current SAVE11/content22 contract rejects non-current SAVE8/content18 before normalization`,
    'merged',
    `${CHAR} :: current SAVE11/content22 contract rejects non-current SAVE10/content21 before normalization`,
  ],
  [
    `${CHAR} :: current SAVE11/content22 contract rejects non-current SAVE9/content19 before normalization`,
    'merged',
    `${CHAR} :: current SAVE11/content22 contract rejects non-current SAVE10/content21 before normalization`,
  ],
  [
    `${CHAR} :: current SAVE11/content22 contract rejects malformed or dangling current lifecycle references`,
    'kept',
    `${CHAR} :: current SAVE11/content22 contract rejects malformed or dangling current lifecycle references`,
  ],
  // ---- structure 正边界 ----
  [
    `${STRUCT} :: current-structure · 合法载荷（正边界） 现行保存器产物通过；分数坐标/负坐标原样放行`,
    'kept',
    `${STRUCT} :: current-structure · 合法载荷（正边界） 现行保存器产物通过；分数坐标/负坐标原样放行`,
  ],
  [
    `${STRUCT} :: current-structure · 合法载荷（正边界） 全部可选子树缺席合法（reserve/skillUseCounts/ambience/collectValue/resources/audio/hostileAwareness/script/entityLifecycles + 实例级可选项）`,
    'reworked',
    `${STRUCT} :: current-structure · 合法载荷（正边界） 全部可选子树缺席合法（world 级九项 + 实例级五项，typed 缺席即合法）`,
  ],
  [
    `${STRUCT} :: current-structure · 合法载荷（正边界） 合法边界值：HP=0、空 equipment/tags/inventory、空 learnedSkills Record、显式静音 audio.currentMusic=null、空 reserve/skillUseCounts/entityLifecycles 容器`,
    'split',
    [
      `${STRUCT} :: current-structure · 合法载荷（正边界） 合法零值与空容器：HP=0、空 equipment/tags/inventory/learnedSkills、空 reserve/skillUseCounts/entityLifecycles`,
      `${STRUCT} :: current-structure · 合法载荷（正边界） audio.currentMusic=null 为显式静音，合法`,
    ],
  ],
  [
    `${STRUCT} :: current-structure · 合法载荷（正边界） hiddenExp 合法七个属性键 + appearance 三可选字段（portrait 为字符串 AssetId）`,
    'split',
    [
      `${STRUCT} :: current-structure · 合法载荷（正边界） hiddenExp 全部七个隐藏成长属性键通过（HIDDEN_STAT_KEYS 真源，含分数经验）`,
      `${STRUCT} :: current-structure · 合法载荷（正边界） appearance 三可选字段全为字符串 AssetId 通过`,
    ],
  ],
  [
    `${STRUCT} :: current-structure · 合法载荷（正边界） R3：稀疏数组空洞逐下标拒绝（inventory/tags/extraStatuses/poisons），不被 forEach 跳过`,
    'split',
    [
      `${STRUCT} :: current-structure · Envelope / world / position（负边界） R3：稀疏空洞逐下标拒绝：inventory[0]（记录型元素数组代表），不被 forEach 跳过`,
      `${STRUCT} :: current-structure · Envelope / world / position（负边界） R3：稀疏空洞逐下标拒绝：tags[0]（字符串元素数组代表），不被 forEach 跳过`,
    ],
  ],
  [
    `${STRUCT} :: current-structure · 合法载荷（正边界） R3：CarriedStatus.status 复用 content 枚举真源——合法 id 通过、未知 id 拒绝`,
    'split',
    [
      `${STRUCT} :: current-structure · 合法载荷（正边界） extraStatuses 合法可携带状态 id（protect）通过`,
      `${STRUCT} :: current-structure · CharacterInstance（party 与 reserve 同型） 实例坏形状 extraStatuses 未知状态 id（复用 content 枚举真源） 带路径拒绝`,
    ],
  ],
  [
    `${STRUCT} :: current-structure · 合法载荷（正边界） R3：appearance.portrait=null 不在合同内（AssetId | undefined），拒绝`,
    'reworked',
    `${STRUCT} :: current-structure · CharacterInstance（party 与 reserve 同型） appearance.portrait=null 不在合同内（AssetId | undefined；portrait 自有接线）`,
  ],
  [
    `${STRUCT} :: current-structure · 合法载荷（正边界） R4：错误携带完整路径 message 与固定短中文 shortMessage（像素宽度回归见 chain 测试）`,
    'kept',
    `${STRUCT} :: current-structure · 合法载荷（正边界） R4：错误携带完整路径 message 与固定短中文 shortMessage（像素宽度回归见 chain 测试）`,
  ],
  [
    `${STRUCT} :: current-structure · 合法载荷（正边界） guard 通过后输入与原对象无别名关系（不修改输入）`,
    'kept',
    `${STRUCT} :: current-structure · 合法载荷（正边界） guard 通过后输入与原对象无别名关系（不修改输入）`,
  ],
  // ---- Envelope 负边界 ----
  [
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） automatic chase claims retain only stable addresses and behavior IDs`,
    'kept',
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） automatic chase claims retain only stable addresses and behavior IDs`,
  ],
  ...chaseRows(STRUCT),
  [
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） null / 数组 / 缺 world / 缺 position 拒绝`,
    'split',
    [
      `${STRUCT} :: current-structure · Envelope / world / position（负边界） Envelope 坏形状 载荷=null 带路径拒绝`,
      `${STRUCT} :: current-structure · Envelope / world / position（负边界） Envelope 坏形状 载荷=数组 带路径拒绝`,
      `${STRUCT} :: current-structure · Envelope / world / position（负边界） Envelope 坏形状 world 缺席 带路径拒绝`,
      `${STRUCT} :: current-structure · Envelope / world / position（负边界） Envelope 坏形状 position 缺席 带路径拒绝`,
    ],
  ],
  [
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） version 非 8 / projectId 非字符串 / contentVersion 非数字拒绝`,
    'split',
    [
      `${STRUCT} :: current-structure · Envelope / world / position（负边界） Envelope 坏形状 version 非当前 SAVE 常量 带路径拒绝`,
      `${STRUCT} :: current-structure · Envelope / world / position（负边界） Envelope 坏形状 projectId 空串 带路径拒绝`,
      `${STRUCT} :: current-structure · Envelope / world / position（负边界） Envelope 坏形状 contentVersion 非数字 带路径拒绝`,
    ],
  ],
  [
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） world 坏形状 money=字符串 带路径拒绝`,
    'kept',
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） world 坏形状 money=字符串 带路径拒绝`,
  ],
  [
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） world 坏形状 money=NaN 带路径拒绝`,
    'reworked',
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） world 坏形状 money=NaN（有限数条件代表；Infinity 同层同 oracle） 带路径拒绝`,
  ],
  [
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） world 坏形状 money=Infinity 带路径拒绝`,
    'dropped',
    `remaining-oracle: world 坏形状 money=NaN 行——同 requireFiniteNumber 的 Number.isFinite=false 条件（current-structure.ts:59-61,73-76），同路径同文案，无独立条件`,
  ],
  [
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） world 坏形状 party=null 带路径拒绝`,
    'reworked',
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） world 坏形状 party=null（数组条件代表） 带路径拒绝`,
  ],
  [
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） world 坏形状 party=对象 带路径拒绝`,
    'dropped',
    `remaining-oracle: world 坏形状 party=null 行——同 requireArray !Array.isArray 失败（current-structure.ts:68-71），同路径同文案 必须为数组`,
  ],
  [
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） world 坏形状 learnedSkills 值非数组 带路径拒绝`,
    'kept',
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） world 坏形状 learnedSkills 值非数组 带路径拒绝`,
  ],
  [
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） world 坏形状 inventory 元素缺 itemId 带路径拒绝`,
    'kept',
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） world 坏形状 inventory 元素缺 itemId 带路径拒绝`,
  ],
  [
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） world 坏形状 inventory count=NaN 带路径拒绝`,
    'kept',
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） world 坏形状 inventory count=NaN 带路径拒绝`,
  ],
  [
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） position 坏形状 sceneId 空串 带路径拒绝`,
    'kept',
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） position 坏形状 sceneId 空串 带路径拒绝`,
  ],
  [
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） position 坏形状 pos 非对象 带路径拒绝`,
    'kept',
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） position 坏形状 pos 非对象 带路径拒绝`,
  ],
  [
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） position 坏形状 pos.col=NaN 带路径拒绝`,
    'kept',
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） position 坏形状 pos.col=NaN 带路径拒绝`,
  ],
  [
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） position 坏形状 pos.row=字符串 带路径拒绝`,
    'reworked',
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） position 坏形状 pos.row=字符串 带路径拒绝`,
  ],
  [
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） position 坏形状 缺 height 带路径拒绝`,
    'restored-r2',
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） position 坏形状 缺 height（独立接线，B-R1-01 归还） 带路径拒绝`,
  ],
  [
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） position 坏形状 facing=sideways 带路径拒绝`,
    'reworked',
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） position 坏形状 facing=sideways（四方向枚举条件代表） 带路径拒绝`,
  ],
  [
    `${STRUCT} :: current-structure · Envelope / world / position（负边界） position 坏形状 facing=undefined 带路径拒绝`,
    'dropped',
    `remaining-oracle: position 坏形状 facing=sideways 行——同检查同文案 必须为 up/down/left/right 四方向枚举（current-structure.ts:252-253），typeof 失败与集合成败在 oracle 上不可区分`,
  ],
  // ---- 可选子树 ----
  [
    `${STRUCT} :: current-structure · 可选子树存在时的形状检查 可选子树 resources 值非有限数 拒绝`,
    'reworked',
    `${STRUCT} :: current-structure · 可选子树存在时的形状检查 可选子树 resources 值非有限数 拒绝`,
  ],
  [
    `${STRUCT} :: current-structure · 可选子树存在时的形状检查 可选子树 audio.currentMusic=数字 拒绝`,
    'kept',
    `${STRUCT} :: current-structure · 可选子树存在时的形状检查 可选子树 audio.currentMusic=数字 拒绝`,
  ],
  [
    `${STRUCT} :: current-structure · 可选子树存在时的形状检查 可选子树 hostileAwareness.rangeMultiplier=1 拒绝`,
    'reworked',
    `${STRUCT} :: current-structure · 可选子树存在时的形状检查 可选子树 hostileAwareness.rangeMultiplier=1（外层 0/3 检查；深层正数性见 codec 合同） 拒绝`,
  ],
  [
    `${STRUCT} :: current-structure · 可选子树存在时的形状检查 可选子树 hostileAwareness.remainingMs=Infinity 拒绝`,
    'reworked',
    `${STRUCT} :: current-structure · 可选子树存在时的形状检查 可选子树 hostileAwareness.remainingMs=Infinity（外层有限数） 拒绝`,
  ],
  [
    `${STRUCT} :: current-structure · 可选子树存在时的形状检查 可选子树 script=数组（深层语义留给 codec guard，外层形状仍拒） 拒绝`,
    'reworked',
    `${STRUCT} :: current-structure · 可选子树存在时的形状检查 可选子树 script=数组（深层语义留给 codec，外层形状仍拒） 拒绝`,
  ],
  [
    `${STRUCT} :: current-structure · 可选子树存在时的形状检查 可选子树 ambience=数字 拒绝`,
    'kept',
    `${STRUCT} :: current-structure · 可选子树存在时的形状检查 可选子树 ambience=数字 拒绝`,
  ],
  [
    `${STRUCT} :: current-structure · 可选子树存在时的形状检查 可选子树 collectValue=NaN 拒绝`,
    'reworked',
    `${STRUCT} :: current-structure · 可选子树存在时的形状检查 可选子树 collectValue=NaN（标量有限数代表） 拒绝`,
  ],
  [
    `${STRUCT} :: current-structure · 可选子树存在时的形状检查 可选子树 skillUseCounts 内层值非有限数 拒绝`,
    'restored-r2',
    `${STRUCT} :: current-structure · 可选子树存在时的形状检查 可选子树 skillUseCounts 内层值非有限数（独立接线，B-R1-01 归还） 拒绝`,
  ],
  // ---- 实例 ----
  ...instanceRows(STRUCT),
  [
    `${STRUCT} :: current-structure · CharacterInstance（party 与 reserve 同型） reserve 元素坏形状同样拒绝（路径含 reserve）`,
    'reworked',
    `${STRUCT} :: current-structure · CharacterInstance（party 与 reserve 同型） reserve 元素坏形状同样拒绝（同型 guard 单代表，路径含 reserve）`,
  ],
]

function chaseRows(struct) {
  // 10 行 chase 负例逐字保留（before/after 同名），从旧清单动态取。
  return oldRows
    .filter((r) => r.fullName.includes('malformed automatic chase claims are rejected'))
    .map((r) => [`${struct} :: ${r.fullName}`, 'kept', `${struct} :: ${r.fullName}`])
}

function instanceRows(struct) {
  const prefix = 'current-structure · CharacterInstance（party 与 reserve 同型） 实例坏形状 '
  const map = {
    'id 空串': ['kept', 'id 空串'],
    'template 非字符串': ['kept', 'template 非字符串'],
    'hp=NaN': ['reworked', 'hp=NaN（十一条数值字段共用有限数循环；luck=字符串 为类型条件代表）'],
    'maxMP=Infinity': [
      'dropped',
      'remaining-oracle: 实例坏形状 hp=NaN 行——同一条 11 字段有限数循环（current-structure.ts:164-177），Number.isFinite=false 条件同层同文案',
    ],
    'luck=字符串': ['kept', 'luck=字符串'],
    'equipment 值非字符串': ['kept', 'equipment 值非字符串'],
    'tags 元素非字符串': ['kept', 'tags 元素非字符串'],
    'hiddenExp 未知键': ['kept', 'hiddenExp 未知键'],
    'hiddenExp.exp=NaN': [
      'dropped',
      'remaining-oracle: R4 message 测试（合法载荷同输入同拒绝层 current-structure.ts:140，oracle 更强：错误类 + 完整路径 message + 固定 shortMessage）',
    ],
    'poisons 元素缺 tickIndex': ['kept', 'poisons 元素缺 tickIndex'],
    'extraStatuses.turns=Infinity': ['kept', 'extraStatuses.turns=Infinity'],
    'extraPoisonRes=字符串': ['kept', 'extraPoisonRes=字符串'],
    'appearance.spriteId=数字': [
      'restored-r2',
      'appearance.spriteId=数字（独立接线，B-R1-01 归还）',
    ],
    'appearance.portrait=数字': [
      'dropped',
      'remaining-oracle: appearance.portrait=null 行——portrait 自有 optional 闭包上 number/null 同谓词同接线（current-structure.ts:150-154），Codex r1 裁决明示保留',
    ],
    'appearance.battleSprite=null（非可选 null）': [
      'restored-r2',
      'appearance.battleSprite=null（非可选 null；独立接线，B-R1-01 归还）',
    ],
  }
  return Object.entries(map).map(([oldName, [disp, newName]]) => [
    `${struct} :: ${prefix}${oldName} 带路径拒绝`,
    disp,
    disp === 'dropped' ? newName : `${struct} :: ${prefix}${newName} 带路径拒绝`,
  ])
}

// 校验：before 锚按重数覆盖旧清单（chase 两行 %j 同名）；kept/reworked/split/merged 的
// 每个目标必须逐字存在于候选清单。
const problems = []
const out = [['before_file', 'before_fullname', 'disposition', 'after_or_remaining_oracle']]
const used = new Map()
const bump = (key) => used.set(key, (used.get(key) ?? 0) + 1)
for (const [before, disp, after] of dispositions) {
  const idx = before.indexOf(' :: ')
  const file = before.slice(0, idx)
  const fullName = before.slice(idx + 4)
  const hits = oldRows.filter((r) => r.file === file && r.fullName === fullName).length
  if (hits === 0) problems.push(`before 缺失: ${before}`)
  bump(`${file} :: ${fullName}`)
  const targets = Array.isArray(after) ? after : disp === 'dropped' ? [] : [after]
  if (disp === 'dropped') out.push([file, fullName, disp, after])
  else {
    out.push([file, fullName, disp, targets.join(' ⊕ ')])
    for (const target of targets) {
      const tIdx = target.indexOf(' :: ')
      if (!newFullNames.has(target.slice(tIdx + 4))) problems.push(`after 不存在于候选: ${target}`)
    }
  }
}
for (const r of oldRows) {
  const key = `${r.file} :: ${r.fullName}`
  const have = used.get(key) ?? 0
  const need = oldRows.filter((x) => x.file === r.file && x.fullName === r.fullName).length
  if (have !== need) problems.push(`覆盖重数不符: ${key} have=${have} need=${need}`)
}
if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}
const tsv = out
  .map((cols) => cols.map((c) => c.replaceAll('\t', ' ').replaceAll('\n', ' ')).join('\t'))
  .join('\n')
writeFileSync(new URL('./before-after.tsv', import.meta.url), `${tsv}\n`)
console.log(`ok rows=${dispositions.length} old=${oldRows.length}`)

// ---- contract-ledger.tsv:最终合同清单(类型:existing-proof=旧轴保留/归位;reworked=构造
// 重铸同轴;new-contract=本卡新增;consolidate=合并代表) ----
const ledgerTypes = [
  ['existing-proof', /现行保存器产物通过/],
  ['existing-proof', /全部可选子树缺席合法/],
  ['consolidate', /合法零值与空容器/],
  ['existing-proof', /audio\.currentMusic=null 为显式静音/],
  ['reworked', /hiddenExp 全部七个隐藏成长属性键/],
  ['existing-proof', /appearance 三可选字段全为字符串/],
  ['existing-proof', /extraStatuses 合法可携带状态 id/],
  ['existing-proof', /R4：错误携带完整路径/],
  ['existing-proof', /guard 通过后输入与原对象无别名关系/],
  ['existing-proof', /automatic chase claims retain only/],
  ['existing-proof', /malformed automatic chase claims/],
  ['consolidate', /Envelope 坏形状 载荷=null/],
  ['consolidate', /Envelope 坏形状 载荷=数组/],
  ['consolidate', /Envelope 坏形状 world 缺席/],
  ['consolidate', /Envelope 坏形状 position 缺席/],
  ['reworked', /Envelope 坏形状 version 非当前 SAVE 常量/],
  ['existing-proof', /Envelope 坏形状 projectId 空串/],
  ['existing-proof', /Envelope 坏形状 contentVersion 非数字/],
  ['existing-proof', /world 坏形状 money=字符串/],
  ['consolidate', /world 坏形状 money=NaN/],
  ['consolidate', /world 坏形状 party=null/],
  ['existing-proof', /world 坏形状 learnedSkills/],
  ['existing-proof', /world 坏形状 inventory 元素缺 itemId/],
  ['existing-proof', /world 坏形状 inventory count=NaN/],
  ['existing-proof', /position 坏形状 sceneId 空串/],
  ['existing-proof', /position 坏形状 pos 非对象/],
  ['existing-proof', /position 坏形状 pos\.col=NaN/],
  ['consolidate', /position 坏形状 pos\.row=字符串/],
  ['consolidate', /position 坏形状 facing=sideways/],
  ['reworked', /稀疏空洞逐下标拒绝：inventory\[0\]/],
  ['reworked', /稀疏空洞逐下标拒绝：tags\[0\]/],
  ['consolidate', /可选子树 resources 值非有限数/],
  ['existing-proof', /可选子树 audio\.currentMusic=数字/],
  ['existing-proof', /可选子树 hostileAwareness\.rangeMultiplier=1/],
  ['existing-proof', /可选子树 hostileAwareness\.remainingMs=Infinity/],
  ['existing-proof', /可选子树 script=数组/],
  ['existing-proof', /可选子树 ambience=数字/],
  ['consolidate', /可选子树 collectValue=NaN/],
  ['existing-proof', /实例坏形状 id 空串/],
  ['existing-proof', /实例坏形状 template 非字符串/],
  ['consolidate', /实例坏形状 hp=NaN/],
  ['existing-proof', /实例坏形状 luck=字符串/],
  ['existing-proof', /实例坏形状 equipment 值非字符串/],
  ['existing-proof', /实例坏形状 tags 元素非字符串/],
  ['existing-proof', /实例坏形状 hiddenExp 未知键/],
  ['existing-proof', /实例坏形状 poisons 元素缺 tickIndex/],
  ['existing-proof', /实例坏形状 extraStatuses\.turns=Infinity/],
  ['reworked', /实例坏形状 extraStatuses 未知状态 id/],
  ['existing-proof', /实例坏形状 extraPoisonRes=字符串/],
  ['reworked', /appearance\.portrait=null 不在合同内/],
  ['existing-proof', /reserve 元素坏形状同样拒绝/],
  ['existing-proof', /round-trips the current envelope/],
  ['new-contract', /rejects non-current SAVE10\/content22/],
  ['new-contract', /rejects non-current SAVE11\/content21/],
  ['consolidate', /rejects non-current SAVE10\/content21/],
  ['new-contract', /rejects a resolver whose identity/],
  ['existing-proof', /rejects malformed or dangling current lifecycle/],
  ['new-contract', /空角色 ID 拒绝/],
  ['new-contract', /空技能 ID 拒绝/],
  ['new-contract', /负数计数拒绝/],
  ['new-contract', /超出安全整数边界拒绝/],
  ['restored-r2', /缺 height（独立接线/],
  ['restored-r2', /appearance\.spriteId=数字（独立接线/],
  ['restored-r2', /battleSprite=null（非可选 null；独立接线/],
  ['restored-r2', /skillUseCounts 内层值非有限数（独立接线/],
  ['new-contract', /skillUseCounts 缺席：clone 内补空/],
  ['new-contract', /entityLifecycles 缺席：clone 内补空/],
  ['new-contract', /remainingMs=0 拒绝/],
  ['new-contract', /vars 非有限数由 checkWorldScriptState 拒绝/],
]
const axisOf = (name) =>
  name.includes('current-codec · skillUseCounts')
    ? 'S6 codec skillUseCounts 语义'
    : name.includes('可省略容器缺省')
      ? 'S6 缺席补空/原件不变'
      : name.includes('hostileAwareness 正数性')
        ? 'S7 codec hostile 正数性'
        : name.includes('script 深层语义接线')
          ? 'S7 script 深层接线'
          : name.includes('resolver whose identity')
            ? 'S8 resolver/payload 身份'
            : name.includes('rejects non-current')
              ? 'S3 版本条件隔离'
              : name.includes('独立接线，B-R1-01 归还')
                ? 'r2 B-R1-01 接线归还'
                : name.includes('缺席：clone 内补空')
                  ? 'r2 B-R1-01 缺席拆身份'
                  : name.includes('稀疏空洞')
                    ? 'S4 稀疏空洞'
                    : name.includes('hiddenExp 全部七个')
                      ? 'S1 hiddenExp 全键集'
                      : name.includes('version 非当前')
                        ? 'S3 版本常量'
                        : 'S1-S5/S8 结构与表征轴'
const ledgerRows = [['id', 'file', 'fullName', 'type', 'axis', 'oracle']]
let idx = 1
for (const name of [...newFullNames]) {
  const hit = ledgerTypes.find(([, re]) => re.test(name))
  if (!hit) throw new Error(`contract-ledger 未映射: ${name}`)
  const file = name.includes('current SAVE11/content22')
    ? CHAR
    : name.startsWith('current-codec')
      ? CODEC
      : STRUCT
  ledgerRows.push([
    `C${String(idx).padStart(2, '0')}`,
    file,
    name,
    hit[0],
    axisOf(name),
    '见 before-after.tsv 与反控 N01-N14',
  ])
  idx += 1
}
const ledgerTsv = ledgerRows
  .map((cols) => cols.map((c) => String(c).replaceAll('\t', ' ').replaceAll('\n', ' ')).join('\t'))
  .join('\n')
writeFileSync(new URL('./contract-ledger.tsv', import.meta.url), `${ledgerTsv}\n`)
console.log(`ledger rows=${ledgerRows.length - 1}`)
