#!/usr/bin/env node
/** Wave O 逐合同账生成器（r9 修正版）。
 *  旧生成器按行扫描导致 oracle 空参与截断（182 空参/332 不配对，含 r8 基线），
 *  本生成器用共享 tokenizer（test-titles.mjs）从真实测试源提取**完整断言链**，
 *  并强制不变量：每行 ≥1 断言、括号配平、值类 matcher 禁止空参——违例即失败退出，
 *  不再静默截断。
 *  字段来源：directed-vitest.json（成员/状态）+ 旧账 join（batch/source/caller/
 *  oldAssertion/axis/classification，r7 gap-map 与人工审计结果）+ migration-merge
 *  30 行人工 oracle/condition 原样保留 + r9 保留 9 行人工 condition/caller/oldAssertion。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { extractAssertions, parseTestTitles } from './test-titles.mjs'

const here = import.meta.dirname
const repoRoot = resolve(here, '../../../..')
const directed = JSON.parse(readFileSync(resolve(here, 'directed-vitest.json'), 'utf8'))
const prev = JSON.parse(readFileSync(resolve(here, 'contracts.json'), 'utf8'))
const prevByKey = new Map(prev.contracts.map((c) => [`${c.testFile} :: ${c.id}`, c]))
// O-R10-02：逐域人工真账（源码条件/生产 caller/旧完整锚）外置 JSON，按 file::fullName 覆盖
const overrides = JSON.parse(readFileSync(resolve(here, 'contracts-overrides.json'), 'utf8'))
const overrideCount = Object.keys(overrides).length

// r9 续审保留的 9 行人工账（O-R9-03 + a89e49d73 去重后仍为真实新轴）
const manualOverlay = {
  'packages/content/src/ambience-skill.glm-o.test.ts :: O09 lerpTint：t 夹取与分量四舍五入 非整数结果按分量四舍五入（旧中点全整数的真实新轴）':
    {
      source: 'ambience.ts',
      axis: '非整数中点四舍五入（.5 分量逐位 round）',
      classification: 'boundary-rounding',
      condition:
        'lerpTint 中点含 .5 分量：[0,0,0]→[101,103,105] t=0.5 与 [10,10,10]→[15,15,15] t=0.5',
      caller: 'lerpTint(from, to, t)',
      oldAssertion:
        'ambience.test.ts:38-44（中点全整数 186/242/255；非整数 .5 舍入未证 → gap 新轴）',
    },
  'packages/content/src/ambience-skill.glm-o.test.ts :: O09 resolveSkillExecution / authoredSkillExecutionLayers 无 override：两侧都回退公共 effects/animation，prepare 为空':
    {
      condition: 'SkillData 无 execution 字段，side=player/enemy 各解析一次',
      caller: 'resolveSkillExecution(skill, side)',
      oldAssertion: '全仓旧测试零覆盖（grep resolveSkillExecution 仅本卡）→ gap 新轴',
    },
  'packages/content/src/ambience-skill.glm-o.test.ts :: O09 resolveSkillExecution / authoredSkillExecutionLayers 单侧 override：覆盖侧用 override，另一侧回退公共':
    {
      condition: 'execution.enemy.effects 显式覆盖（对象恒等），player 侧回退公共 effects',
      caller: 'resolveSkillExecution(skill({enemy:{effects}}), side)',
      oldAssertion: '全仓旧测试零覆盖 → gap 新轴',
    },
  'packages/content/src/ambience-skill.glm-o.test.ts :: O09 resolveSkillExecution / authoredSkillExecutionLayers authoredSkillExecutionLayers：base 恒在 + 两个显式 override 按序追加':
    {
      condition:
        '无 override（仅 base 层）与 player+enemy 双显式 override（按 base,player,enemy 序）',
      caller: 'authoredSkillExecutionLayers(skill)',
      oldAssertion: '全仓旧测试零覆盖 → gap 新轴',
    },
  'packages/content/src/ambience-skill.glm-o.test.ts :: O09 resolveDialogueIdentity：合法 unbound 透传 unbound：speaker/portrait 声明性透传（浅拷贝 portrait）':
    {
      source: 'author-dialogue.ts',
      axis: '合法 unbound identity 的 resolver 透传结果',
      classification: 'normal-input',
      condition:
        '合法 unbound identity：仅 speaker / 仅 portrait（asset+side）两种形态，actor 表为空',
      caller: 'resolveDialogueIdentity({kind:"unbound", speaker|portrait}, actors)',
      oldAssertion:
        'author-dialogue.test.ts:84-90 仅空 unbound 拒绝；contracts E1 :26-29 仅合法性 check——合法 unbound 的 resolver 结果旧证未断言 → gap 新轴',
    },
  'packages/content/src/rewards-lifecycle.glm-o.test.ts :: O08 applyLevelGrowth：钳位与确定性区间 负级/零级 → 不改任何属性，delta 全 0':
    {
      condition: 'levels ∈ {-3, 0, 0.9}（防御钳位：count=max(0,floor(levels))=0）',
      caller: 'applyLevelGrowth(target, levels, rng)',
      oldAssertion:
        'rewards.cursor-pure-wave2.test.ts:3 显式声明「不计本包」；rewards.test.ts 仅 :54 单正级 → gap 新轴',
    },
  'packages/content/src/rewards-lifecycle.glm-o.test.ts :: O08 applyLevelGrowth：钳位与确定性区间 每级固定+2 luck（无随机）；rng=0/1 区间上下界（未钳位精确值）':
    {
      source: 'rewards.ts',
      axis: '未钳位区间端点精确值 + luck 固定 +2',
      classification: 'normal-input',
      condition: '基座 luck=10/maxHP=100/maxMP=50/attack=10（未触 999 钳），rng=0 与 rng→1 两端',
      caller: 'applyLevelGrowth(target(), 1, rng)',
      oldAssertion:
        'rewards.test.ts:43-75 仅 998 钳位处上界（delta=1，区间端点与 luck 固定+2 不可分辨）→ gap 新轴',
    },
  'packages/content/src/rewards-lifecycle.glm-o.test.ts :: O08 applyLevelGrowth：钳位与确定性区间 多级累积：每级独立掷随机':
    {
      condition: 'levels=3，rng 恒 0：delta.maxHP=3×10、delta.luck=3×2、delta.level=3',
      caller: 'applyLevelGrowth(t, 3, rng)',
      oldAssertion: 'rewards.test.ts:54 仅单级 → 多级独立累积 gap 新轴',
    },
  'packages/content/src/hidden-exp-grid.glm-o.test.ts :: O08 applyHiddenExp：池经验 WORD 截断 池 exp 超 0xffff 时按位与截断（100000 → 34464），未截断值不可能出现':
    {
      source: 'rewards.ts',
      axis: 'pool.exp = exp & 0xffff 掩码可观测',
      classification: 'boundary-truncation',
      condition:
        'expGained=50000 单属性全量：exp=100000，当前级阈值 1e9 使升级循环立即退出 → 掩码可观测（34464）',
      caller: 'applyHiddenExp(c, {attack:1}, 50000, table, rng)',
      oldAssertion:
        'rewards.test.ts:139-160 数值远小于 0xffff，掩码不可观测 → gap 新轴（r9 加强为可证伪断言）',
    },
}

// r9 续批：rich-text 残余 9 轴人工账（rich-text.test.ts:5-39 已证纯文本/空串/句中/行首/多标记/未闭合；
// 以下九臂逐一对照源码正则确认未覆盖）
const richTextRows = [
  [
    '未知色名标记 → 按纯文本（COLOR_TAGS 白名单外）',
    '<blue>海</blue>：色名不在 cyan|red|redAlt|yellow 白名单，整段按纯文本',
    'rich-text.test.ts:5-39 未涉白名单外色名 → gap 新轴',
  ],
  [
    '错配闭合 → 按纯文本（反向引用要求同名开闭）',
    '<cyan>青</red>：闭合标签与开标签色名不同，反向引用 </\\1> 不匹配',
    'rich-text.test.ts:37 仅未闭合同名单臂；错配闭合未证 → gap 新轴',
  ],
  [
    '空标记内容 → 产出带色的空 span（非空数组语义保持）',
    '<red></red>：空捕获组 (.*?) 命中空串，产出 {text:"",color:"red"}',
    'rich-text.test.ts:9 空串输入产无色空 span；空标记内容臂未证 → gap 新轴',
  ],
  [
    '相邻标记无间隔 → 两个着色 span，之间不产生空文本 span',
    '<cyan>a</cyan><red>b</red>：m.index===last 时不插入空文本 span',
    'rich-text.test.ts:28-33 多标记之间有文本；零间隔臂未证 → gap 新轴',
  ],
  [
    '同名嵌套 → 非贪婪取首个闭合（文档明示非嵌套语义）',
    'a<cyan>b<cyan>c</cyan>d</cyan>：非贪婪 (.*?) 至首个 </cyan>，尾段 d</cyan> 纯文本',
    'rich-text.test.ts 无嵌套输入 → gap 新轴',
  ],
  [
    'redAlt 与 red 交替序区分（redAlt 不被截成 red）',
    '<redAlt>x</redAlt> 与 <red>y</red>：交替 cyan|red|redAlt 中 redAlt 完整命中不被 red 前缀截断',
    'rich-text.test.ts:13-26 仅 cyan/red；redAlt 全域未证 → gap 新轴',
  ],
  [
    '大小写敏感：<CYAN> 不识别 → 纯文本',
    '<CYAN>青</CYAN>：大小写不折叠',
    'rich-text.test.ts 全小写输入 → gap 新轴',
  ],
  [
    '孤儿闭合 → 按纯文本',
    '前</cyan>后：无开标签的闭合标记整段纯文本',
    'rich-text.test.ts:37 是未闭合（有开无闭）；孤儿闭合（有闭无开）未证 → gap 新轴',
  ],
  [
    '标记内容含 "<" → 着色 span 文本原样保留',
    '<cyan>a<b</cyan>：捕获组含 < 字符原样保留',
    'rich-text.test.ts 标记内容不含 < → gap 新轴',
  ],
]
for (const [title, condition, oldNote] of richTextRows) {
  manualOverlay[
    `packages/content/src/rich-text-residual.glm-o.test.ts :: O09 parseRichText：标记识别残余轴 ${title}`
  ] = {
    source: 'rich-text.ts',
    caller: 'parseRichText(s)',
    classification: 'boundary-tag-recognition',
    condition,
    oldAssertion: oldNote,
    axis: title,
  }
}

// 不变检查：值类 matcher 空参 = 截断残留，直接失败
const EMPTY_ARG_BAD =
  /\.(toEqual|toStrictEqual|toMatchObject|toBe|toBeCloseTo|toHaveProperty|toContain|toContainEqual|toHaveLength|toBeGreaterThan|toBeLessThan|toMatch|toStrictEqual)\(\s*\)/
const balanced = (text) => {
  let p = 0
  let b = 0
  let c = 0
  for (const ch of text) {
    if (ch === '(') p++
    else if (ch === ')') p--
    else if (ch === '[') b++
    else if (ch === ']') b--
    else if (ch === '{') c++
    else if (ch === '}') c--
  }
  return p === 0 && b === 0 && c === 0
}

const sourceCache = new Map()
const loadSource = (testFile) => {
  if (!sourceCache.has(testFile))
    sourceCache.set(testFile, readFileSync(resolve(repoRoot, testFile), 'utf8'))
  return sourceCache.get(testFile)
}

const rows = []
const errors = []
for (const t of directed.tests) {
  const key = `${t.file} :: ${t.fullName}`
  const prevRow = prevByKey.get(key)
  const overlay = manualOverlay[key] ?? overrides[key]
  if (!prevRow && !overlay) {
    errors.push(`旧账无此行且无人工账（join 失败）: ${key}`)
    continue
  }
  const source = loadSource(t.file)
  const parsed = parseTestTitles(source)
  const entry = parsed.find((p) => p.fullName === t.fullName)
  if (!entry) {
    errors.push(`源码未解析到该测试: ${key}`)
    continue
  }
  const assertions = extractAssertions(source, entry.bodyStart, entry.bodyEnd)
  if (assertions.length === 0) {
    errors.push(`零断言: ${key}`)
    continue
  }
  const oracleText = assertions.map((a) => a.text).join('; ')
  if (!balanced(oracleText)) errors.push(`oracle 括号不配平: ${key}`)
  if (EMPTY_ARG_BAD.test(oracleText)) errors.push(`值类 matcher 空参（截断残留）: ${key}`)
  const isManualMerge = t.file.endsWith('migration-merge.glm-o.test.ts')
  rows.push({
    batch: prevRow?.batch ?? t.fullName.slice(0, 3),
    id: t.fullName,
    source: overlay?.source ?? prevRow.source,
    caller: overlay?.caller ?? prevRow.caller,
    testFile: t.file,
    oldAssertion: overlay?.oldAssertion ?? prevRow.oldAssertion,
    axis: overlay?.axis ?? prevRow.axis,
    oracle:
      isManualMerge &&
      prevRow.oracle &&
      !EMPTY_ARG_BAD.test(prevRow.oracle) &&
      balanced(prevRow.oracle)
        ? prevRow.oracle
        : `${oracleText}  // ${t.file}:${assertions[0].startLine}`,
    classification: overlay?.classification ?? prevRow.classification,
    status: t.status,
    condition: overlay?.condition ?? prevRow.condition ?? '',
  })
}

if (errors.length) {
  console.error(`FAIL ${errors.length}:`)
  for (const e of errors.slice(0, 20)) console.error(' -', e)
  process.exit(1)
}

writeFileSync(
  resolve(here, 'contracts.json'),
  `${JSON.stringify(
    {
      total: rows.length,
      note: `逐合同账（r10 修正）：oracle=测试源完整断言链（共享 tokenizer 全量提取，无截断）+首断言行锚；逐域人工真账（源码条件/生产 caller/旧完整 fullName+行锚或显式 gap 说明）外置 contracts-overrides.json（本批 ${overrideCount} 行已覆盖，未覆盖域仍为空 condition 待续——不以旧 join 当 closed）；known-existing-proof 与 cross-check-not-new 不计净新`,
      contracts: rows,
    },
    null,
    2,
  )}\n`,
)
console.log(
  `contracts: ${rows.length} rows, overrides applied: ${rows.filter((r) => overrides[`${r.testFile} :: ${r.id}`]).length}/${overrideCount}, manualOverlay: ${rows.filter((r) => manualOverlay[`${r.testFile} :: ${r.id}`]).length}, emptyCondition remaining: ${rows.filter((r) => !(r.condition || '').trim()).length}`,
)
