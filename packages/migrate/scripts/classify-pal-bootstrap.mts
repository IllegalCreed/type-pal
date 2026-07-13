/**
 * MG2 首次 PAL bootstrap 一次性分类器。
 * 只接受 2026-07-13 已人工审计的精确路径形态；任何新差异直接失败。
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { BootstrapDifference, BootstrapReportV1 } from '../src/migration-bootstrap.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const reportPath = resolve(repo, 'packages/migrate/bootstrap/pal.json')
const report = JSON.parse(readFileSync(reportPath, 'utf8')) as BootstrapReportV1

const SCENE_METADATA = new Set([
  'content/scenes/s001.json\0/battleFieldId',
  'content/scenes/s020.json\0/battleFieldId',
  'content/scenes/s020.json\0/battleMusicId',
  'content/scenes/s053.json\0/battleFieldId',
  'content/scenes/s053.json\0/battleMusicId',
  'content/scenes/s161.json\0/battleMusicId',
  'content/scenes/s162.json\0/battleMusicId',
  'content/scenes/s163.json\0/battleMusicId',
  'content/scenes/s181.json\0/battleFieldId',
  'content/scenes/s190.json\0/battleFieldId',
  'content/scenes/s206.json\0/battleMusicId',
  'content/scenes/s246.json\0/battleMusicId',
  'content/scenes/s251.json\0/entries',
  'content/scenes/s251.json\0/entry/pos/col',
  'content/scenes/s251.json\0/entry/pos/row',
  'content/scenes/s294.json\0/entries',
  'content/scenes/s294.json\0/entry/pos/col',
  'content/scenes/s294.json\0/entry/pos/row',
])

const BOSS_SCRIPT_CHANGES = new Set([
  'content/scripts/chunks/scene/s003.json\0/scripts/scene~1s003~1L-2719~1e59~1d-89d21e09',
  'content/scripts/chunks/scene/s003.json\0/scripts/scene~1s003~1L-2719~1e60~1d-89d21e09',
  'content/scripts/chunks/scene/s003.json\0/scripts/scene~1s003~1L-2719~1e61~1d-89d21e09',
  'content/scripts/chunks/scene/s021.json\0/scripts/scene~1s021~1L-5948~1e403~1d-89d21e09',
  'content/scripts/chunks/scene/s086.json\0/scripts/scene~1s086~1root~1entity-e1629~1page-0~1trigger~1stage-0',
  'content/scripts/chunks/scene/s093.json\0/scripts/scene~1s093~1root~1entity-e1759~1page-0~1trigger~1stage-0',
  'content/scripts/chunks/scene/s138.json\0/scripts/scene~1s138~1root~1entity-e2341~1page-0~1trigger~1stage-0',
])

function classify(
  difference: BootstrapDifference,
): Pick<BootstrapDifference, 'resolution' | 'reason'> {
  const { file, path, kind } = difference
  if (file === 'content/locale.json') {
    if (/^\/(menu|stat|equip|gameover)\./.test(path) && kind === 'delete')
      return {
        resolution: 'ours',
        reason: '第二阶段 UI/系统文案是工程自有内容，不在 PAL 提取源中，保留当前值',
      }
    if (/^\/(dlg|spk)\./.test(path))
      return {
        resolution: 'theirs',
        reason:
          kind === 'change'
            ? '采用当前对话解析器的原版换行/说话人结果'
            : kind === 'delete'
              ? '旧迁移留下的无目标脚本引用文本，目标脚本闭包门禁确认可删'
              : '采用新迁移器补齐的原版对话键',
      }
  }
  if (file === 'content/items.json' && kind === 'change' && /^\/@string:\d+\/desc$/.test(path))
    return {
      resolution: 'theirs',
      reason: '道具描述改用当前原版换行解析结果；隐蛊功能已上移纯 overlay',
    }
  if (
    file === 'content/skills.json' &&
    ((kind === 'add' && /^\/skills\/@string:\d+\/animation\/wave$/.test(path)) ||
      (kind === 'order' && path === '/skills/$order'))
  )
    return {
      resolution: 'theirs',
      reason: '显式保留原版 wave=0 并按提取源顺序归位；四个动态技能已上移纯 overlay',
    }
  if (
    file === 'content/enemies.json' &&
    ((kind === 'delete' && /^\/@string:enemy-(435|454|478|485|496)\/choreography$/.test(path)) ||
      (kind === 'change' && path === '/@string:enemy-478/ai/rules'))
  )
    return {
      resolution: 'theirs',
      reason: '敌种全局演出已迁到具体 startBattle encounter，防止同种普通敌误触发 boss 编排',
    }
  if (/^content\/scenes\/s\d+\.json$/.test(file)) {
    if (kind === 'delete' && /^\/entities\/@string:e\d+\/pages$/.test(path))
      return {
        resolution: 'theirs',
        reason: '标准野怪页已无损折叠为 hostile，删除重复 trigger/auto 脚本页',
      }
    if (SCENE_METADATA.has(`${file}\0${path}`))
      return {
        resolution: 'theirs',
        reason:
          path.startsWith('/entry') || path === '/entries'
            ? '修正 loadScene 1-based 源场景号换算后的错位入口元数据'
            : '采用当前一次性战斗配置烘焙/场景默认传播结果',
      }
  }
  if (
    file === 'content/scripts/index.json' &&
    kind === 'change' &&
    /^\/chunks\/[^/]+\/(bytes|hash)$/.test(path)
  )
    return {
      resolution: 'theirs',
      reason: '脚本实体变更后重算的派生 bytes/hash，禁止保留旧元数据',
    }
  if (/^content\/scripts\/chunks\//.test(file)) {
    if (
      kind === 'delete' &&
      /^\/scripts\/scene~1s\d+~1root~1entity-e\d+~1page-0~1(trigger|auto)~1stage-0$/.test(path)
    )
      return {
        resolution: 'theirs',
        reason: '与 hostile 数据重复的标准野怪脚本根退役',
      }
    if (kind === 'change' && BOSS_SCRIPT_CHANGES.has(`${file}\0${path}`))
      return {
        resolution: 'theirs',
        reason: '将已审计 boss choreography 挂到该次具体 startBattle 命令',
      }
  }
  throw new Error(`bootstrap 出现未审计差异: ${file}${path} (${kind})`)
}

if (report.version !== 1 || report.differences.length !== 5531)
  throw new Error(`bootstrap 差异规模漂移: ${report.differences.length}(期望 5531)`)
report.differences = report.differences.map((difference) => ({
  ...difference,
  ...classify(difference),
}))
const ours = report.differences.filter((difference) => difference.resolution === 'ours').length
const theirs = report.differences.filter((difference) => difference.resolution === 'theirs').length
if (ours !== 35 || theirs !== 5496)
  throw new Error(`bootstrap 分类计数漂移: ours=${ours} theirs=${theirs}`)
writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
console.log(`[classify-pal-bootstrap] 精确分类 5531 项: ours=${ours} theirs=${theirs}`)
