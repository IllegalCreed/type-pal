/**
 * 跨引用完整性校验(D-B0 校验层地基)。
 *
 * `validate.ts` 只查形状(单表字段在不在);本层查**跨表引用**是否悬空 ——
 * 这是编辑器的核心价值:不让坏数据越积越多。loader 也能用来告警。
 *
 * 系统未落地的字段(poisonId / triggerScript.scriptId / teleport.target)跳过 ——
 * 待对应系统落地后再加(注释标明)。资产号是否有对应文件(reuseOriginalMap/paletteId/
 * icon/spriteNum)不在此校验 —— 那是 loader/资产层的事。
 *
 * 见 docs/phase2/editor/editor-design.md §6。
 */
import type {
  CharacterTemplate,
  ItemData,
  LevelUpSkill,
  LoadedManifest,
  Locale,
  SceneDef,
  SkillData,
  SpriteDef,
  StartWorld,
} from './index.js'

/** 一条校验问题。severity: error=会让游戏崩/逻辑错;warn=有降级(如显 id)但不崩。 */
export interface Issue {
  severity: 'error' | 'warn'
  /** 定位:具体数据路径,如 `scenes[0].entities[0].interact`。 */
  where: string
  message: string
}

/** 被校验的内容包(编辑器/loader 各自从工程组装出来的内容切片)。 */
export interface ContentBundle {
  scenes: SceneDef[]
  characters: CharacterTemplate[]
  skills: SkillData[]
  levelUp: Record<string, LevelUpSkill[]>
  items: ItemData[]
  locale: Locale
  sprites: SpriteDef[]
  startWorld: StartWorld
}

/** 编辑器被编辑的内容工作副本 = ContentBundle + manifest(EditSession 用)。 */
export type EditorContent = ContentBundle & { manifest: LoadedManifest }

/** 跨引用完整性校验:返回所有悬空引用(空数组 = 干净)。 */
export function validateReferences(b: ContentBundle): Issue[] {
  const issues: Issue[] = []

  // id 集合(O(1) 查表)
  const skillIds = new Set(b.skills.map((s) => s.id))
  const itemIds = new Set(b.items.map((i) => i.id))
  const charIds = new Set(b.characters.map((c) => c.id))
  const spriteIds = new Set(b.sprites.map((s) => s.id))
  const localeKeys = new Set(Object.keys(b.locale))

  // ── scenes ──────────────────────────────────────────────
  b.scenes.forEach((scene, si) => {
    const dialogueIds = new Set(scene.dialogues.map((d) => d.id))
    scene.entities.forEach((e, ei) => {
      const where = `scenes[${si}].entities[${ei}]`
      // sprite → sprites 注册表(缺 = error:引擎 loadSprite 会 throw)
      if (!spriteIds.has(e.sprite))
        issues.push({ severity: 'error', where: `${where}.sprite`, message: `精灵 "${e.sprite}" 不在 sprites 注册表` })
      // interact → 同场景 dialogues(缺 = error:startDialogue 会拿不到)
      if (e.interact && !dialogueIds.has(e.interact))
        issues.push({ severity: 'error', where: `${where}.interact`, message: `interact "${e.interact}" 不在场景 "${scene.id}" 的 dialogues` })
    })
    // DialogueLine.text / speaker → locale(缺 = warn:lookupText 回落显 id,不崩)
    scene.dialogues.forEach((d, di) => {
      d.lines.forEach((line, li) => {
        const lw = `scenes[${si}].dialogues[${di}].lines[${li}]`
        if (line.text && !localeKeys.has(line.text))
          issues.push({ severity: 'warn', where: `${lw}.text`, message: `文本 id "${line.text}" 不在 locale(渲染会显 id)` })
        if (line.speaker && !localeKeys.has(line.speaker))
          issues.push({ severity: 'warn', where: `${lw}.speaker`, message: `说话人 id "${line.speaker}" 不在 locale` })
      })
    })
  })

  // ── characters ──────────────────────────────────────────
  b.characters.forEach((c, ci) => {
    const where = `characters[${ci}]`
    // name → locale(缺 = warn:菜单显 id)
    if (!localeKeys.has(c.name))
      issues.push({ severity: 'warn', where: `${where}.name`, message: `角色名 id "${c.name}" 不在 locale` })
    // initialEquipment 值 → items(缺 = warn)
    for (const [slot, itemId] of Object.entries(c.initialEquipment)) {
      if (!itemIds.has(itemId))
        issues.push({ severity: 'warn', where: `${where}.initialEquipment[${slot}]`, message: `初始装备 "${itemId}" 不在 items` })
    }
    // initialMagic → skills(缺 = warn)
    c.initialMagic.forEach((skillId, mi) => {
      if (!skillIds.has(skillId))
        issues.push({ severity: 'warn', where: `${where}.initialMagic[${mi}]`, message: `初始仙术 "${skillId}" 不在 skills` })
    })
  })

  // ── startWorld ──────────────────────────────────────────
  b.startWorld.party.forEach((charId, pi) => {
    if (!charIds.has(charId))
      issues.push({ severity: 'error', where: `startWorld.party[${pi}]`, message: `队员模板 "${charId}" 不在 characters` })
  })
  for (const [cid, skillIds2] of Object.entries(b.startWorld.learnedSkills)) {
    skillIds2.forEach((skillId, si) => {
      if (!skillIds.has(skillId))
        issues.push({ severity: 'warn', where: `startWorld.learnedSkills[${cid}][${si}]`, message: `已学仙术 "${skillId}" 不在 skills` })
    })
  }
  b.startWorld.inventory.forEach((entry, ii) => {
    if (!itemIds.has(entry.itemId))
      issues.push({ severity: 'warn', where: `startWorld.inventory[${ii}].itemId`, message: `物品 "${entry.itemId}" 不在 items` })
  })

  // ── items ───────────────────────────────────────────────
  b.items.forEach((item, ii) => {
    const where = `items[${ii}](${item.id})`
    const equip = item.equip
    if (equip) {
      // equipableBy → characters(缺 = warn:装备菜单不显示该角色)
      equip.equipableBy.forEach((cid, ei) => {
        if (!charIds.has(cid))
          issues.push({ severity: 'warn', where: `${where}.equip.equipableBy[${ei}]`, message: `可装备角色 "${cid}" 不在 characters` })
      })
      // effects.grantSkill.skillId → skills(缺 = warn)
      equip.effects.forEach((eff, ei) => {
        if (eff.kind === 'grantSkill' && !skillIds.has(eff.skillId))
          issues.push({ severity: 'warn', where: `${where}.equip.effects[${ei}].grantSkill`, message: `授技 "${eff.skillId}" 不在 skills` })
      })
    }
  })

  // ── skills ──────────────────────────────────────────────
  b.skills.forEach((skill, si) => {
    const where = `skills[${si}](${skill.id})`
    // SkillCost.items[].itemId → items(缺 = warn:施法时扣不到)
    skill.cost?.items?.forEach((entry, ci) => {
      if (!itemIds.has(entry.itemId))
        issues.push({ severity: 'warn', where: `${where}.cost.items[${ci}].itemId`, message: `消耗物品 "${entry.itemId}" 不在 items` })
    })
  })

  // ── levelUp ─────────────────────────────────────────────
  for (const [cid, list] of Object.entries(b.levelUp)) {
    list.forEach((lu, li) => {
      if (!skillIds.has(lu.skillId))
        issues.push({ severity: 'warn', where: `levelUp[${cid}][${li}].skillId`, message: `升级习得 "${lu.skillId}" 不在 skills` })
    })
  }

  return issues
}
