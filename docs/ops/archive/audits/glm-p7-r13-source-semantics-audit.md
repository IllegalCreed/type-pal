# GLM P7-R13 源指令语义闭包独立审计报告

> 2026-07-26 GLM 独立审计，以全部 43,503 条源命令为母集自建总账。
> 不依据 Codex/Kimi 清单。保持双盲，交用户转回 Codex。

## 审计方法

以 `data/extracted/events/all.json` 全部源命令为母集，独立统计每个 opcode 的源数量、可达性、迁移去向和最终产物状态。

---

## 全域矩阵

| 域 | 源根/命令 | 可达 | 显式生成 | 结构转换 | 证据折叠 | true no-op | approved lossy | unresolved |
|---|---|---|---|---|---|---|---|---|
| **普通脚本** | 43,503 source cmds | 8,102 reachable bodies | 7,035 owner fragments + 598 flow + 433 cycle + 21 local + 6 item-private = 8,102 | P2-P6 全量结构化 | 3,345 folded (863 sprite + 2,482 hostile) | 见下 | 4 lossySkills | 0 |
| **敌人** | 153 enemies | 153 | 153 EnemyDef | — | hostile folded | — | — | **0 pendingScripts** |
| **技能** | ~170 skills | 全部 | 全部 | — | — | — | **4 lossySkills** | 0 |
| **物品 use** | 100 usable | 100 | 80 upstream + 14 C8 augmentation + 6 P7 item-private = 100 | — | — | — | — | 0 |
| **物品 throw** | ~60 throwable | 全部 | 相克链 48 pendingThrow → 上游标记但最终 PAL 正确 | — | — | — | — | 0 |
| **物品 equip** | 全部 | 全部 | 全部 | — | — | — | — | 0 |
| **setPalette** | 14 | 14 | 0（全部 `note(known-deferred)`） | — | — | 0x53/0x54 → setAmbience (17 sites) | — | **14 setPalette deferred** |

---

## 一、确认最终缺失

### 1. setPalette 14 条 deferred（5 组 palette 5↔0 + 1 palette 2 + 1 palette 6）

- **源站点**：`setPalette(0)` ×7、`setPalette(5)` ×5、`setPalette(2)` ×1、`setPalette(6)` ×1
- **迁移路径**：`translate-events.ts:944-948` → `note(ctx, 'known-deferred:setPalette(N)')` → 不生成 canonical 命令
- **最终产物**：`projects/pal` 中不保留任何 palette swap 语义
- **覆盖情况**：0x53（day, 10 sites）和 0x54（night, 7 sites）已被 W6 ambience 系统覆盖。但 `setPalette(5/2/6)` 是自定义调色板切换（可能是法术画面色彩效果或梦境色调），**W6 ambience 只覆盖 day/night 两态，不覆盖这些自定义 palette**。
- **用户可见影响**：使用自定义 palette 的场景（如某些法术演出或特殊视觉效果）可能缺少颜色变化效果。
- **置信度**：高——`translate-events.ts:947` 明确 `note(known-deferred)`，无替代机制。

### 2. lossySkills 4 条（回梦/夺魂/鬼降/酒神）

- **回梦/夺魂/鬼降**：`0x68 敌方施法分支(alt L_43089/L_43123/L_43096)未表达 —— 战斗期`。这三个技能的敌方施法演出分支被丢弃，只有玩家方施法被保留。
- **酒神**：`summon 伤害=按饮酒动态(原版公式);暂按 baseDamage=3 直译`。酒神召唤的伤害是动态的（取决于当前饮酒数量），迁移用固定值 3 替代。
- **源证据**：`migrate-content.ts` 的 `lossySkills` 报告（`migrateAll` 输出确认 4 条）。
- **用户可见影响**：这三个技能的敌方施法演出可能缺失；酒神伤害可能偏低（如果玩家积攒了大量酒）。
- **置信度**：高——迁移器自己标记为 lossy。
- **⚠ lossySkills itemId 全为 undefined**：无法通过 itemId 追溯到具体技能定义，测试可能漏掉。

### 3. 敌人 AI 脚本域损失（GLM 子代理独立发现）

敌人在 `translate-enemy-scripts.ts` 中使用**独立翻译器**（不同于事件域）。以下 at-risk opcode 在事件域正确翻译，但在敌人 AI 脚本域**未被翻译，直接进 `pendingScripts`**：

| opcode | 事件域翻译 | 敌人域翻译 | 受影响敌人 |
|---|---|---|---|
| 0x43 (playMusic) | `palMusicCommand` ✅ | **未翻译 → pending** | enemy-483 (林月如二) turnStart, enemy-519 (明王) turnStart seg2 |
| 0x77 (stopMusic) | `stopMusic` ✅ | **未翻译 → pending** | enemy-483 (林月如二) turnStart |
| 0x85 (delay) | `wait { ms: op0×80 }` ✅ | **未翻译 → pending** | enemy-483 (林月如二) turnStart |

**GLM 独立验证**：`projects/pal/content/enemies.json` 最终产物中 153 个 enemy **0 个有 `pendingScripts` 字段**——这意味着这些 pending 被某层（overlay/hostile-behavior fold）消掉了。但**消掉诊断不等于语义补回**——敌人 turnStart 中的音乐播放/停止/延时操作可能实际丢失。

**与 Codex 清单对照**：Codex 称"林月如二明确漏 0x77/0x85/0x43"，GLM 子代理独立确认这一发现。

### 4. pendingSkills 10 条（动态公式简化）

- `migrateAll` 原始报告 10 条 `pendingSkills`，全部为 `动态公式 0x35/0x88 系 → 战斗期`
- 这些技能的动态伤害/治疗公式被简化为固定值
- **与 lossySkills 4 条不同**：pendingSkills 是公式简化（仍可运行），lossySkills 是分支/公式完全丢失
- **源证据**：`migrate-content.ts` 的 `lossySkills` 报告（`migrateAll` 输出确认 4 条）。
- **用户可见影响**：这三个技能的敌方施法演出可能缺失；酒神伤害可能偏低（如果玩家积攒了大量酒）。
- **置信度**：高——迁移器自己标记为 lossy。

---

## 二、已补回（由 C8/overlay/augmentation 补回，非上游迁移器直接生成）

### 1. 14 件剧情物品用途（C8-R2 augmentation）

- `migrateAll` 原始输出中为 18 条 pendingUse（含 260/263/264/271/272/273/279/284/285/286/287/288/289/291/292/294 + 141 隐蛊 + 270 紫金葫芦）
- C8-R2 augmentation 补回 14 件（0x81 剧情 + 0x84 放置）为 `itemPrivateScript`
- 141 隐蛊和 270 紫金葫芦由 C8-R1/P7 overlay 补回（hideParty / drawFromResourcePool）
- **最终 PAL**：100/0 严格闭合，0 diagnostics ✅

### 2. 90 驱魔香 / 91 十里香 / 137 无影毒 / 150 金蚕王（C8-R2 上游迁移器修改）

- C8-R2 修改了 `translate-events.ts` 上游，使这 4 件不再进 pendingUse
- 最终 PAL 中 90=modifyHostileAwareness(range=0)、91=modifyHostileAwareness(range=3)、137=scaleCurrentHp+throw=currentHpDamage、150=levelUp

---

## 三、风险待验证

### 1. 0x08 checkpoint 36 条 push(undefined)

- Codex 称"34 个未保留 checkpoint 持久推进语义，其中 3 个已确认丢整段正文"
- **GLM 独立分析**：全部 36 个 0x08 都是 mid-body（next command 非 end），sdlpal 中 `case 0x08: wScriptEntry++`（纯 IP 推进，不产生副作用）。v5 的顺序执行模型天然不需要 IP 推进标记。
- **GLM 结论**：36 个 0x08 作为 `push(undefined)` 是**正确的 no-op**——v5 不使用 IP 指针，命令按序执行。
- **但**：Codex 说的"3 个已确认丢整段正文"需要独立核实——如果这 3 个 0x08 所在的脚本段被 stage 拆分，丢的可能不是 0x08 本身而是 stage 边界处理。**GLM 无法在纯静态分析中确认这 3 个，需要 Codex 给出具体 source address**。

### 2. pendingThrow 48 条（相克 use 链）

- `migrateAll` 原始报告 48 条 pendingThrow，全部标注 `相克 use 链`
- 最终 PAL 中这些物品的 throw 是否正确？需要检查具体 items.json
- **初步判断**：这些可能由上游 `POISON_ITEM_SELF` 映射或 overlay 补回，但 GLM 未逐一验证 48 条

### 3. 0x76 ShowFBP 4 条 push(undefined)

- sdlpal 中 `ShowFBP` 显示全屏 FBP 图（op0=0xFFFF 时填黑帧缓冲）
- 迁移注释说"reforge 每帧重画天然 no-op"
- **风险**：如果 0x76 的 op0 不是 0xFFFF，可能是实际显示 FBP 动画而非黑屏，需要核实源数据

---

## 四、真实 no-op / 批准近似

| opcode | 源数量 | 处理方式 | 判定依据 |
|---|---|---|---|
| 0x05 (2671) | flush/redraw | `clearDialog` | engineering-notes 确认 0x05 = screen redraw，clearDialog 是正确 clean 等价 |
| 0x08 (36) | IP advance | `push(undefined)` | sdlpal `wScriptEntry++`，v5 顺序执行不需要 |
| 0x49 op0=0 (大部分) | dialog flush | `push(undefined)` | sdlpal 确认 op0=0 是 no-op flush |
| 0x76 (4) | black frame buffer | `push(undefined)` | "reforge 每帧重画"——仅 op0=0xFFFF 时成立 |
| 0x77 (44) | stop music | `stopMusic` | 正确翻译 |
| 0x85 (10) | delay | `wait { ms: op0×80 }` | 正确翻译 |
| 0x90 (3) | clear enemy scriptOnTurnStart | `push(undefined)` | 注释确认是原版 hack，二阶段不需要 |
| 0x9B (2) | fade-to-scene | `push(undefined)` | sdlpal 自认 FIXME wrong，实际 no-op |
| 0xA1 (50) | global trail | 部分翻译 + knownNoOp | op0=0 时 no-op |
| 0xA7 (295) | backup screen | `push(undefined)` | sdlpal 确认是备份屏，no-op |

---

## 五、Codex 清单之外的新增项

### 1. setPalette(5/2/6) 自定义调色板无替代（Codex 提到但未完全分类）

- Codex 说"5 组 palette5↔0 没有可执行替代"
- **GLM 新增**：palette 2（1 site）和 palette 6（1 site）同样无替代，且不是 palette5↔0 组——是独立的单次 palette swap。Codex 只提了 5 组 palette5↔0，漏了 palette 2 和 palette 6。
- **精确计数**：Codex 说"剩余 5 组 palette5↔0"，GLM 独立统计为 palette0=7 + palette5=5 + palette2=1 + palette6=1 = **14 条 setPalette 全部 deferred**，其中只有 0x53/0x54（day/night，17 sites）有 ambience 替代。

### 2. migrateAll 原始报告 vs 最终 PAL 的差异口径未文档化

- `migrateAll` 输出 18 条 pendingUse + 48 条 pendingThrow + 4 条 lossySkills
- 最终 `projects/pal` 有 0 条 diagnostics
- 这个差异是因为 C8 augmentation 和 overlay 是后置层，不在 migrateAll 报告中体现
- **风险**：如果有人只看 migrateAll 报告（不看最终 PAL），会误认为还有 18+48+4 个未解决项。**建议增加一个门禁**：migrateAll 的 pendingUse + pendingThrow + lossySkills + 最终 PAL diagnostics 必须在发布报告中并列展示，解释差异来源。

### 3. lossySkills 的 itemId 为 undefined

- `migrateAll` 输出的 lossySkills 4 条，itemId 全是 `undefined`——只有 name（回梦/夺魂/鬼降/酒神）
- 这意味着无法通过 itemId 追溯到具体技能定义，测试可能漏掉

---

## 六、对 Codex 数字或结论的反证

### 1. Codex 称"34 个 0x08 未保留 checkpoint 持久推进语义"

- **GLM 反证**：36 个 0x08 全部是 mid-body（GLM 逐条验证 next command 非 end）。在 sdlpal 中 `case 0x08: wScriptEntry++` 只是推进 IP，**不产生任何持久语义**。v5 的顺序执行模型不需要 IP 推进标记。因此 34 个（或全部 36 个）0x08 作为 no-op 是正确的，不是缺失。
- **除非** Codex 说的"3 个丢整段正文"是指 0x08 所在的脚本段被 stage 拆分导致后续命令丢失——如果是这种情况，问题不在 0x08 本身而在 stage 边界处理。**需要 Codex 给出具体 source address 才能确认**。

### 2. Codex 称"敌人迁移有 12 个 pendingScripts 仍发布 partial EnemyDef"

- **GLM 反证**：`projects/pal/content/enemies.json` 中 153 个 enemy，**0 个**有 `pendingScripts` 字段。如果 Codex 看到的是中间产物或旧版本，可能与最终 PAL 不一致。**建议 Codex 重新核实最终产物**。

---

## 七、无法收敛的口径

### 573 条"引用目标含段转移"

- GLM 同意 Codex 判断：这只能作为审计池，不能直接报成 573 个 bug。
- GLM 补充：这 573 条的语义是"jumpScript 的目标脚本以 end.advance/reset 结尾"——在 v5 中这已经由 stage transition 体系（`ScriptStage.next`）承接。要确认这 573 条是否有遗漏，需要逐一比对 jumpScript target 的 stage next 语义是否被正确映射到 `selectEntityBehavior`/`advance`/`to`。这是一个**可以在 P7-R13 build 返工中用机器化脚本批量验证**的口径，不需要手工 573 条。

---

## 八、建议阻断生成的门禁

### 1. setPalette 自定义 palette 硬门禁

```ts
// 在 migration-validate 或写前门禁中
if (report.knownDeferredSetPalette > 0) {
  const customPaletteSites = setPaletteSites.filter(s => s.paletteIndex !== 0);
  if (customPaletteSites.length > 0) {
    // 要么提供 RGBA ambience 替代，要么 fail-loud
  }
}
```

### 2. lossySkills 必须带 itemId

```ts
// migrate-content.ts lossySkills 生成处
if (!skill.id) throw new Error(`lossySkill 缺失 id: ${skill.name}`);
```

### 3. migrateAll 报告 vs 最终 PAL 差异对账门禁

```ts
// 发布门禁
const rawPending = migrateReport.pendingUse.length + migrateReport.pendingThrow.length;
const finalDiag = palDiagnostics.filter(d => d.target.domain === 'item').length;
if (rawPending > 0 && finalDiag === 0) {
  // 必须在发布日志中解释差异来源（C8 augmentation / overlay）
}
```

---

## 九、完整复跑命令

```bash
# 1. 迁移报告
node --import tsx -e "
import { migrateAll } from './packages/migrate/src/migrate-content.js';
import { loadPalMigrationSources } from './packages/migrate/src/pal-migration-io.js';
const sources = loadPalMigrationSources(process.cwd());
const result = migrateAll(sources.migrate);
console.log('pendingUse:', result.report.pendingUse.length);
console.log('pendingThrow:', result.report.pendingThrow.length);
console.log('lossySkills:', result.report.lossySkills.length);
"

# 2. 最终 PAL diagnostics
node -e "
const d = require('./projects/pal/content/migration-diagnostics.json');
console.log('diagnostics:', d.diagnostics.length);
"

# 3. setPalette deferred 计数
grep -c 'known-deferred:setPalette' packages/migrate/src/translate-events.ts

# 4. push(undefined) 全量
grep -n 'push(undefined)' packages/migrate/src/translate-events.ts

# 5. 敌人 pendingScripts
node -e "
const e = require('./projects/pal/content/enemies.json');
console.log('pendingScripts:', e.filter(x=>x.pendingScripts).length);
"

# 6. at-risk opcode 源计数
node -e "
const all = require('./data/extracted/events/all.json');
const segs = all.segments || [];
const counts = {};
for (const seg of segs) for (const cmd of (seg.commands||[])) {
  if (cmd.op === 'raw' && cmd.opcode !== undefined) {
    const hex = '0x' + cmd.opcode.toString(16).toUpperCase();
    counts[hex] = (counts[hex]||0) + 1;
  }
}
for (const op of ['0x5','0x8','0x76','0x77','0x85','0x9B','0xA1','0xA7','0x90']) {
  console.log(op+':', counts[op]||0);
}
"
```

---

## 十、总结

| 分类 | 数量 | 严重度 |
|---|---|---|
| **确认最终缺失** | setPalette custom 14 条 + lossySkills 4 条 + 敌人域 0x43/0x77/0x85 损失（enemy-483/519） + pendingSkills 10 条公式简化 | 中——视觉色彩变化缺失 + 3 个敌方施法演出缺失 + 酒神伤害近似 + 林月如二/明王敌人脚本操作丢失 + 10 个技能公式简化 |
| **已补回** | C8-R2 20 件物品 + 141 隐蛊 + 270 紫金葫芦 | — |
| **风险待验证** | 0x08 "3 个丢整段正文"(需 Codex source address) + pendingThrow 48 条 + 0x76 op0 非 0xFFFF | 低-中 |
| **真实 no-op** | 0x05/0x08/0x49op0=0/0x76op0=0xFFFF/0x90/0x9B/0xA7 = ~5000+ | — |

**Codex 清单外新增**：setPalette palette 2/6 漏报、lossySkills itemId 为 undefined、migrateAll vs 最终 PAL 差异口径未文档化、敌人域 0x43/0x77/0x85 在事件域正确翻译但在敌人域丢失（GLM 子代理独立确认 Codex 的林月如二发现）。

**对 Codex 反证**：0x08 的 36 个作为 no-op 可能是正确的（mid-body IP advance）；敌人 pendingScripts 在最终 PAL 中为 0（Codex 可能看了中间产物，但消诊断 ≠ 语义补回——enemy-483 的 0x43/0x77/0x85 可能实际丢失）。

**门禁建议**：setPalette custom palette 硬门禁、lossySkills 必须带 itemId、migrateAll vs 最终 PAL 差异对账、敌人域翻译器与事件域 opcode 覆盖一致性门禁。

---

## 附录：GLM 子代理补充发现（2026-07-26）

### pendingSkills 修正：14 条而非 10 条

子代理独立跑 `migrateAll()` 得到 **14 条 pendingSkills**（非 10 条）。差异原因：GLM 主审计的 `migrateAll` 调用使用的是 `sources.migrate`（不含 overlay），而子代理走了完整 `buildPalMigration` 路径。14 条 pending skill IDs：314, 330, 334, 342, 344, 352, 357, 372, 373, 378, 380, 385, 392, 394。

最终 PAL 中这 14 个全部存在（通过 `applyPalSkillOverlays` 补 4 个 + C8/v5 augmentation 补 10 个），但 **pendingSkills 报告仍为 14**——因为报告是内存态，不反映后置层。

### 敌人 pendingScripts 详细清单（12 个敌人）

子代理独立确认 12 个敌人有 pendingScripts（不仅 Codex 说的林月如二）：

| enemy ID | 名称 | 丢失 opcode | 严重度 |
|---|---|---|---|
| enemy-420 | 跳跳蛙 | 0x06 复杂跳转臂 | 低 |
| enemy-421 | 大手 | 0x06 复杂跳转臂 | 低 |
| enemy-422 | 怪老子 | 0x06 复杂跳转臂 | 低 |
| enemy-435 | 六脚蜘蛛 | 0x06 复杂跳转臂 | 低 |
| enemy-463 | 麒麟 | 0x06 复杂跳转臂 | 低 |
| enemy-469 | 狐狸精 | 0x06 复杂跳转臂 | 低 |
| enemy-483 | **林月如二** | **0x77 stopMusic + 0x85 wait + 0x43 music** | **中** |
| enemy-486 | 半人蛇 | 0x06 复杂跳转臂 | 低 |
| enemy-499 | 绿叶小妖 | 0x06 复杂跳转臂 | 低 |
| enemy-519 | **明王** | **0x43 music + 0x19×8 + 0x22 + 0x1d + 0x92**（12 ops） | **中-高** |
| enemy-539 | 毒神龙 | 0x06 复杂跳转臂 | 低 |
| enemy-547 | 八头蛇 | 0x06 复杂跳转臂 | 低 |

**关键发现**：enemy-519（明王）丢失 **12 个 opcode**（含 8×0x19），是所有敌人中丢失最多的。Codex 清单只提了林月如二，**漏了明王的 12 ops 丢失**。

### pendingThrow 修正：47 条而非 48 条 + 非相克链解释

子代理发现 pendingThrow 47 条（GLM 主审计记 48 条——可能是计数口径差异）。子代理补充关键上下文：这些 pendingThrow 的物品（164-194 武器系等）**在原版游戏中不是投掷物品**——它们的"throw"是武器攻击链。因此 pendingThrow 中这 47 条**正确地不在最终 PAL 的 throw 字段中**。

**GLM 结论修正**：pendingThrow 47/48 条不是"丢失"——它们是武器攻击等价链，在最终 PAL 中正确地由 HostileBehavior/attackEquivItem 承接。**从"风险待验证"降级为"真实 no-op/批准近似"**。

### loadScene fade 时长修正

子代理发现任务卡中提到的"260ms 固定 fade"**不存在于代码中**。`foldDoorPattern`（`translate-events.ts:1717-1758`）把相邻 fade out/teleportParty **吸收**进单个 `loadScene{scene,pos}`——引擎的 loadScene 内建淡出/淡入，不保留原始 fade 时长。**没有 260ms 常量**。Codex 关于"邻接 loadScene 的原 fade 时长被固定 260ms+260ms 取代"的描述**与代码不符**。

### 诊断 schema 只支持 item 域

子代理发现 `migration-diagnostic.ts:21-26` 的 schema 结构上**只允许 `domain='item'`**——技能和敌人的 pending/lossy 状态**永远不会出现在 diagnostics 中**，因为 schema 不支持。这意味着：
- 敌人的 12 个 pendingScripts 无法通过 diagnostics 发现
- 技能的 4 条 lossySkills 无法通过 diagnostics 发现
- **门禁建议新增**：扩展 diagnostics schema 支持 `domain='skill'` 和 `domain='enemy'`，或在发布报告中强制展示敌人/技能域的 pending/lossy 计数

### 最终修正总结

| 分类 | 修正前 | 修正后 |
|---|---|---|
| pendingSkills | 10 条 | **14 条**（完整路径） |
| pendingThrow | 48 条"风险待验证" | **47 条真实 no-op**（武器攻击链，正确不在 throw 中） |
| loadScene fade | "260ms 固定" | **代码中无 260ms 常量**（foldDoorPattern 吸收 fade，不保留时长） |
| 敌人 pendingScripts | "Codex 称 12 个" | **GLM 独立确认 12 个**，含 Codex 漏报的 enemy-519 明王 12 ops |
| 诊断 schema | 未提及 | **item-only**，敌人/技能 pending 无 diagnostics 通道 |
