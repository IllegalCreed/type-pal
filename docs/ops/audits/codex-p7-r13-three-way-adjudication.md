# N3-1 P7-R13 三方源语义审计合并裁决

日期：2026-07-26
裁决者：Codex
独立输入：

- `docs/ops/audits/kimi-p7-r13-source-semantics-audit.md`
- `docs/ops/audits/glm-p7-r13-source-semantics-audit.md`
- N3-1 任务卡 P7-R13 的 Codex 金丝雀
- 用户随后给出的 s048/e796 鹿不逃运行时反例

本文件是两份双盲报告返回后的统一事实口径。原报告保留独立审计原貌；其中未经 CFG、最终
产物或运行时核验的初判，不直接成为 build 事实。

## 结论

P7-R13 必须进入新的高风险 `rework` 设计门禁。现有
`gaps=[] / flowCuts=0 / P7 ledger / item-only diagnostics` 只能证明既有登记关系闭合，
不能证明源语义、最终 canonical 与各运行上下文闭合。

确认的最高优先级缺口包括：

1. 12 个显式 owner 的 `0x04 callScript` 被整体错绑到后一号实体。
2. 36 个 `0x08` 中只有 2 个已有 checkpoint 等价修复，剩余 34 个会丢跨激活持久推进。
3. 11 个 `end.reset(idleFrames>0)` 丢失重入计数和阈值 fall-through。
4. 26 个源 `confirm` 在 Reforge 中恒返回“是”。
5. 76 件源可投掷物最终只有 18 件有 `throw`；确认缺 58 件，其中 48 件进入未消费
   `pendingThrow`，另 10 件静默返回空结果且没有诊断。
6. 12 个敌人的 `pendingScripts` 没有 fallback，最终产物又不保留诊断；林月如二和明王已有
   明确机制/演出损失。
7. s048/e796 证明动态安装 auto 行为后不会创建 runner；同型静态风险为 67 场景、177 实体。
   同时 auto 的源 `end 0` 被投影成“无 next 的非空 stage”后会被 runner 重播，需做终止语义
   census，不能只补启动。
8. 14 个 `setPalette` 中 4 个有真彩 RNG 资产烘焙证据，余下 10 个没有可执行替代。
9. 完整 `buildPalMigration` 仍报告 10 个 unresolved `pendingSkills` 和 4 个 `lossySkills`。

因此 P7-R12 的旧候选 `c3d620a9` 不能再进入终审；必须以 P7-R13 最终候选重新执行
runtime/save 与数据覆盖终审。

## 三方差集合并

### 确认最终缺失或运行时失效

| ID | 事实 | 精确口径 | 证据 / 裁决 |
|---|---|---:|---|
| A1 | `0x04 callScript` 显式 owner 偏一位 | 12 源站点 | `translate-events.ts` 使用 `e${operand}`，而源对象号是 1-based；应统一走与 `entRef` 相同的转换。s093/e1749 最终确实错误作用到 e1750/e1751… |
| A2 | `0x08` checkpoint 丢失 | 36 源站点；2 已补、34 open | SDLPal 同时推进当前 IP 和 `wNextScriptEntry`，`play.c` 把返回值写回宿主脚本槽；GLM 的“顺序执行天然 no-op”漏看了跨触发回写。 |
| A3 | `end.reset` 重入门闩丢失 | 11 源站点 | 非零 `idleFrames` 为 12/8/7/12/8/5/6/6/4/4/4；迁移只读 `resetTo`。当前投影会一直 reset，永远不能在阈值到达后 fall-through。 |
| A4 | `confirm` 恒为“是” | 26 源站点；最终因内联有 28 节点 | `main.ts` host 只 report 后 `return true`；schema/runner 的 `onNo` 与 `commandOutcome` 已存在，但真实 UI host 缺失。 |
| A5 | 投掷能力缺失 | 76 源 / 18 最终 / 58 缺失 | 48 条留在 `pendingThrow`；另 10 条（66-71、115、142、143、146）是单条 `0x42 + end`，翻译器返回 `effects=[]` 且不记 pending。 |
| A6 | 敌人脚本半成品继续发布 | 12 敌人 | 完整构建可复现 12 份 pending；最终 `enemies.json` 不保留 pending，也无 fallback。enemy-483 缺 `0x77/0x85/0x43`；enemy-519 缺 `0x43/0x19×8/0x22/0x1D/0x92`。 |
| A7 | 敌人 `0x79` 一条真实条件臂丢失 | 1 当前站点 | enemy-496 石长老的“盖罗娇在队”目标对白整臂丢失；其余 3 个敌钩 `0x79` 站点按现有数据没有同型实害。 |
| A8 | 动态 auto 不会唤醒 runner | 177 实体 / 67 场景同型风险 | e796 实机：touch 已执行、trigger 已 disabled、`auto/legacy-001` 已投影，但实体位置不变且 runner 不存在。 |
| A9 | auto 源终止可能被重播 | 1,060 个“非空 initial 且无 next”的 auto variant 审计池 | `ScriptRunnerV5` 在无 next 时把 cursor 留在当前 stage，外层 auto loop 再次激活。e796 七条源路线均以 `end 0` 停住，不能整段重播。1,060 只是待按源 end/loop 分类的池，不直接报成 1,060 个 bug。 |
| A10 | 自定义 palette 无替代 | 14 源；4 baked；10 open | palette2→RNG3→0 与 palette6→RNG7→0 共 4 条有真彩资产证据；5 组 palette5↔0 共 10 条仍无 executable equivalent。 |
| A11 | 技能报告仍有真实债务 | 完整构建 10 pending + 4 lossy | raw `migrateAll` 的 14 pending 中 4 个被后置层补回；最终 build report 仍有 10。回梦/夺魂/鬼降敌方分支及酒神动态伤害仍是 4 个 lossy。 |

### 已补回或当前数据没有实害

| 项 | 裁决 |
|---|---|
| C8 物品 use | 最终 use 域已有独立 100/0 closure；中间 `pendingUse` 仍显示 14，说明报告与最终产物缺少对账，不等于这 14 件再次缺失。 |
| palette 的 RNG 两组 | palette2/RNG3 与 palette6/RNG7 的 4 条由对应 palette 真彩烘焙补回；必须在 disposition 账中绑定资产证据，不能只写 note。 |
| battle choreography “default log-only” | 运行时开放口真实存在，但当前最终 enemy/encounter choreography 只含已支持的 dialog/playSound/flee/endBattle，没有现存 unsupported command；降为结构性门禁风险。 |
| enemy battleEnd 只取 stage 0 | 代码开放口真实存在，但当前 15 个 battleEnd 逐一翻译都恰好只有 1 stage；当前无第二段丢失，必须由生成门禁禁止未来静默截断。 |
| 573 条“引用目标含段转移” | 仅为机器审计池，不能当 573 个 bug；应逐条验证 target transition disposition。 |

### 尚需逐站或动态裁决

| 项 | 当前裁决 |
|---|---|
| `0x76 × 4` | 四站 operand 都是 `0xFFFF`，SDLPal/WIN95 会填黑，第一阶段也把它作为真实黑屏状态消费；“相邻 fade 所以 no-op”尚未证明。保留待动态验证，不得销账。 |
| `0x9B × 2` | SDLPal 虽写有 FIXME，但仍执行 backup + makeScene + fade；第一阶段也实现了可见 fade。两份报告把 FIXME 直接等同 no-op 都不成立，保留表现语义债务。 |
| `0x05` 非默认延时 | SDLPal 会按 operand 保留 redraw pacing。二阶段可将毫秒级观感差异登记为 approved-lossy，但不能说 `clearDialog` 完全等价，也不能静默。 |
| `loadScene` fade | GLM 附录称不存在 260ms 常量不成立；`main.ts` 明确使用 260ms out/in。它是现代统一过场近似，不是源时长等价，须登记而非冒充无损。 |
| 换装、vanish、`0x8A pendingAuto`、giveItem `"0"`、跟随者朝向、chase speed | 先做静态站点与 save/runtime 动态验证；最终必须得到 `fixed / runtime-equivalent / approved-lossy` 之一。 |

## 对独立报告的纠正

### Kimi 报告

- `0x04` off-by-one 定性正确，但被调 L_35644 链实际只有 `0x49 + 0x14 + end`；报告所写
  `0x6E/0x09` 不在该链，不影响错 owner 结论。
- `0x08` 机制判断正确，但“giveItem 6 站、cash 5 站、L_19289 每次 60000”的前向 60 条回看
  穿越了脚本边界，不能采用。当前按实际段入口线性核验，至少确认 L_9825 的 item284、
  L_741 的 +50 和 L_19289 的 +30000 存在重放风险；完整影响由 R13 指令账按 CFG 重算。
- “36 个 `0x08` 全以 plain end 收尾”不成立；至少存在 reset end。
- choreography 和 battleEnd 的代码开放口成立，但当前最终数据分别没有 unsupported command
  与多 stage 实例，因此不列为现存用户缺失。

### GLM 报告

- `0x08` 不是 no-op；报告漏看 `wNextScriptEntry` 的宿主回写。
- `pendingThrow 47/48` 且“武器本来不可投掷”的补充结论错误。完整构建是 48 pending；
  源 163-194 等武器明确 `throwable:true`，最终缺失集合总计 58。
- `lossySkills itemId=undefined` 不是当前 schema 缺陷：技能诊断使用稳定字段 `id`，完整构建的
  4 条均有 id。
- `0x49 op0=0` 的说明误写成 dialog flush；该 opcode 是 setEntityState。
- “loadScene 代码中无 260ms 常量”与当前 `main.ts` 不符。
- 全域矩阵把“最终文件没有 pending 字段”当成 unresolved=0，混淆了诊断被丢与语义补回；
  其附录已部分自我修正，但矩阵不能作为 closure 证明。

### 两份报告共同问题

- 都没有发现 10 个 `0x42-only` 投掷链静默返回空结果，也没有正确识别最终 58 件投掷缺口。
- 都没有覆盖 e796 暴露的 canonical 选择已成功、runtime activation lifecycle 仍丢语义。
- 都把 `0x9B` 的 FIXME 过快降成 no-op；代码有可见副作用，必须有等价或批准有损证据。

## P7-R13 build 分批设计

所有批次仍由 Codex 作为唯一 Coding Owner。进入任何实现前，Codex/Kimi/GLM 必须先对本设计
签 `agree`。若批次中需要新增 canonical schema、save 字段或跨包公共接口，必须对该 delta
另开三签，不能用总设计签字代替。

### R13-0：指令去向账、跨域 diagnostics 与 fail-closed

- 为 43,503 条源命令记录 reachability；对每个可达 `source site × execution context/owner`
  恰好登记一种 disposition：
  `translated / structured / folded(evidence) / asset-baked(evidence) /
  runtime-equivalent(evidence) / explicit-noop(evidence) /
  approved-lossy(ticket) / open-debt(batch)`。
- 把 raw migrate、overlay/augmentation 后状态和最终 PAL 三层并列对账。
- diagnostics 扩展到 item/skill/enemy/scene-script 等域；pending、lossy、note、
  `push(undefined)`、丢操作数与空翻译结果都必须入账。
- 建立 canonical command × runtime context 矩阵；`stub`、恒定返回、default log-only
  必须是 fail-loud 或明确 open debt。
- 本批只建控制面，不改运行时行为、不重迁 PAL 正文；已知缺陷只能登记 `open-debt`，不能冻结成
  approved-lossy。

### R13-1：身份与动态行为运行时

独立提交：

1. `0x04` owner 统一 1-based→稳定 EntityAddress 转换，12 站反解 oracle，全量重迁、MG2 与二跑。
2. 动态选择 auto 或切 page 后幂等 ensure runner；已有 runner 依靠 epoch 在 safe point 换手，
   不使用强制 restart。
3. 按源 auto end/loop census 修终止投影；e796 七条一次性路线进入 terminal idle，不整段重播。

浏览器金丝雀必须覆盖 e796：
`(86,38) → (72,38) → (72,36)`、恢复 touch range 3、无双 runner、切场景/save/abort 后旧
runner 不复活。

### R13-2：跨激活控制流

1. 36 个 `0x08` 逐站投影为现有 stages/stateMachine 能表达的持久 cursor：
   首次激活执行完整正文，安全点提交 checkpoint 后缀；后续激活只执行后缀。不得新增作者可见
   PAL IP/address 命令。
2. 11 个 `end.reset idleFrames` 优先编译成具名有限状态；只有证明现有模型不能干净表达时，
   才提出通用可存档 activation gate 的独立 schema/save 三签。

验收至少覆盖 L_9825、L_19289、既有 s048 repair、保存/读档、nested call/self 与
trigger/auto 计数隔离。

### R13-3：58 件投掷能力闭包

- 48 个 pending 与 10 个 silent-empty 必须逐件从上游脚本翻译为最终 `throw`。
- `0x42` 必须区分 gameplay effect 与 presentation，不能因没有可烘焙 presentation 就返回空。
- 武器虽可装备，源 `throwable:true` 仍必须保留投掷能力。
- 验收口径为源 76 / 最终 76 / unresolved 0，并覆盖战斗菜单、消耗、单体/全体目标、
  伤害/状态/毒/演出和保存重开。

### R13-4：真实确认框

- 复用 Reforge 已有两框 confirm 视觉/输入状态机，不使用浏览器 `confirm()`。
- v5 host 必须等待真实结果并正确支持 cancel/AbortSignal/scene session/save barrier。
- 26 个源站点保留 yes/no 两臂；至少两个真实 PAL canary 分别自动化选择“是”和“否”。

### R13-5：敌人脚本与战斗运行上下文

- 12 个 pending 逐项 disposition；enemy-483、enemy-519 为强制动态金丝雀。
- 修 enemy-496 `0x79` 两臂。
- enemy translator 不再以独立漂移白名单静默吞掉主事件域已有能力。
- battleEnd 多 stage 与 choreography unsupported cell 必须生成期/运行前 fail-loud；当前没有
  实例的开放口不能继续裸奔。
- `onDefeated` 的状态写入不得落 structured-clone scratch；若改为 canonical runner/公共接口，
  需按 schema/runtime delta 重新三签。

### R13-6：技能、palette 与表现债务

- 先由 R13-0 最终账冻结 10 pending + 4 lossy skills 的真实最终差集，再修公式/敌方分支；
  不按 raw 14 重复实现已被 overlay 补回的 4 个。
- 14 个 palette 站必须 14/14 有 baked 或 executable disposition。剩余 10 条若要新增现代
  color-grade/visual-profile 能力，单独做 schema/render/save 三签；若不实现，必须由用户逐组
  批准 approved-lossy。
- `0x76/0x9B/0x05/loadScene` 与其余风险逐项定案，不设“杂项一包”。

### R13-Z：发布与终审

- disposition 账无 `open-debt`，无 unexplained pending/lossy/note/silent-empty。
- runtime context matrix 无 stub、恒定结果或未申报 log-only。
- 全量重迁二跑零 diff，MG2 零冲突，project/baseline/sidecar/manifest 同事务。
- migrate/content/reforge/editor 全量测试、root typecheck/lint、production build 通过。
- 浏览器至少覆盖 e796、s048 checkpoint/fade、s048 e789、s093 owner、confirm 两臂、
  投掷代表、enemy-483、enemy-519 与 palette canary。
- 重新执行 P7-R12 的 Kimi runtime/save 终审与 GLM 数据/排序终审；旧 `c3d620a9` 结论失效。
- N3-1 三方最终 `accept` 后，C8 与 ED-5I 仍分别做终态下游回归，不自动 done。

## 本轮只读复核命令摘要

```bash
# 完整最终构建报告，而非 raw migrateAll
node --import tsx -e '
  import { loadPalMigrationSources } from "./packages/migrate/src/pal-migration-io.ts";
  import { buildPalMigration } from "./packages/migrate/src/pal-migration.ts";
  const r = buildPalMigration(loadPalMigrationSources(process.cwd()));
  console.log(r.report.content.pendingSkills);
  console.log(r.report.content.lossySkills);
  console.log(r.report.content.pendingThrow);
  console.log(r.report.enemies.pendingScripts);
'

# 源/最终投掷守恒
node - <<'NODE'
const fs = require('fs')
const raw = JSON.parse(fs.readFileSync('data/extracted/data/items.json', 'utf8'))
const source = raw.items ?? raw
const product = JSON.parse(fs.readFileSync('projects/pal/content/items.json', 'utf8'))
const throwable = source.filter((x) => x.flags?.throwable && x.scriptOnThrow)
const final = new Map(product.map((x) => [Number(x.id), x]))
console.log({
  source: throwable.length,
  final: product.filter((x) => x.throw).length,
  missing: throwable.filter((x) => !final.get(x.id)?.throw).length,
})
NODE
```

本轮只修改审计、任务卡与看板；未修改实现、生成产物、baseline 或 schema。N3-1 继续为
`rework`；仅新增 Codex 的 P7-R13 build 设计 `agree`，Kimi / GLM 仍为 `pending`，
build 准入保持 `blocked`。
