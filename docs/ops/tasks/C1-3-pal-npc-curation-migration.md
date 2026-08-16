# C1-3 - PAL NPC 人工归档与可审计迁移

Status: done
Phase: phase2
Capability: C1 / migration
Coding Owner: Codex
Generation Owner: N/A
Reviewer: both
Visual Verification Owner: Codex
Visual Verification Timing: mixed
Unavailable Agents: none
Branch: TBD

## 目标

在 C1-1/C1-2 人物身份模型冻结后，对 PAL 的 scene entity、unbound dialogue、portrait 与剧情上下文做
人工可审计归档。第一批只交付 **1–8 个经用户逐项批准的稳定人物**：建立/补全 Actor 预制，并按精确
locator 选择性迁移场景实体与对话身份；所有未批准、泛称、歧义和换装实例原样保留。

## 范围

- 范围内：只读候选普查、人工 decision ledger、canonical locator、别名/立绘/默认精灵裁决、第一批
  Actor/实体/对话投影、回滚/重放、二次零计划和剧情 E2E 登记。
- 范围外：仅凭 sprite/name/portrait hash 自动聚类后直接写项目；手改 generated `projects/pal` 冒充上游修复。
- 明确不做：
  - 不把“士兵/村民/少女”等泛称建成稳定人物；若未来需要可复用群众模板，应另审 EntityTemplate/外观预制，
    不滥用 Actor 身份。
  - 不新增 per-instance sprite/portrait override；同一人物的换装实例若不等于 Actor 默认 sprite，本批保持
    自定义实体。
  - 不从脚本宿主实体、speaker 文本、sprite、portrait asset/hash 任一单维度推出人物身份。
  - 不推断 battler、face、敌对职责、pages 或行为；C1-3 只改共享身份/资源引用。
  - 不承诺一次归档全部 PAL NPC；第一批完成后，后续批次另开 successor 卡或重新过本卡范围门。

## 前提真值门

### 一句话行为 / 工程前提

PAL 原始 EventObject 不含稳定人物身份，当前 6,235 条对话中 Actor 身份仍为 0；speaker、portrait、
脚本宿主实体与真正说话者均不是稳定一一映射。任何 NPC 归并都必须由逐项 source/canonical 证据加用户
裁决驱动，不能从最终 JSON 或相似度反猜。

### 真值矩阵

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版 / primary source | EventObject 只有场景实例/脚本/精灵等字段，没有人物身份。 | `packages/pal-extract/src/io/sss.ts:45-63` |
| 第一阶段 | NpcState 按 event object id 与 sprite 运行，无共享人物 registry。 | `packages/game/src/core/game-state.ts` |
| 当前二阶段 | C1-1/C1-2 已 done：PAL 5,077 entities = 3,695 sprite + 1,382 zone + 0 actor；6,235 cues = 1,919 narration + 4,316 unbound + 0 actor。Actor/entity 判别联合与 dialogue narration/actor/unbound 已能表达目标，无需再改 schema。 | C1-1/C1-2 用户验收；`packages/content/src/actor.ts:114-137`; `packages/content/src/dialogue-v14.ts:18-38,162-196`; C1-2 卡 census |
| 本任务目标 | 保持 content14 / SAVE8 / ActorDef schema 不变，用人工 decision ledger 驱动第一批 PAL-only same-version successor；未批准项原样保留。 | 2026-08-14 用户要求继续；本卡设计 |

### 反证与替代解释

- 最强替代解释 1：同 speaker/sprite/portrait 就是同人物。反证：换装、群众复用、旁白、别名与立绘切换
  均会产生假合并；C1-2 已证明稳定 speaker→Actor 自动边为 0。
- 最强替代解释 2：dialog 所在 entity 就是说话者。反证：只读 scene 扫描中 `spk.李逍遥` 分布在 174 个
  script owner，含大量不相干 sprite/zone；hook/zone 也承载多人对话。owner 只能定位脚本，不能定人物。
- 最强替代解释 3：把泛称也做 Actor 能最大化复用。反证：ActorDef 是稳定人物身份；“士兵/居民”等可对应
  多个个体与外观，归为同 Actor 会让姓名/立绘修改跨无关实体传播。可复用群众外观是未来独立预制问题。
- 什么观察会推翻前提：若提取到稳定人物对照表，必须回到 extractor 上游并重新设计 ledger。
- audit 红项：完整 source provenance、换装归属、portrait expression 命名、跨场景同一人、剧情上下文与
  第一批精确清单均待 Kimi/GLM 独立核验；任何一项 unknown 都只能 deferred，不能带病投影。

### 用户可见偏离

- 是否主动偏离已核真值：yes（现代作者归档；每批需用户按精确 decision digest 审批）
- `before -> after`：重复临时拼装 -> 证据充分者复用预制人物，未知者保持原样
- 代表场景：同一命名 NPC 跨场景共用姓名/立绘，但各场景位置/pages/hostile 仍独立。
- 用户裁决：2026-08-14 已批准“预制人物 + 场景零件拼装双轨”和继续推进 C1-3；随后又批准第一批
  exact decision digest，具体 Actor、默认 sprite、立绘命名及实体/对话 locator 均按该 authority 发布。

## 上下文锚点

- 铁律：`docs/phase2/READ-FIRST.md` §4/5/10；迁移改上游；稳定 id 不用下标作语义身份；generated 数据
  不得手改冒充完成。
- 用户边界：C1-1 双轨创作已验收；Actor 只共享身份/资源，位置、行为、敌对与生命周期均属 scene instance；
  `docs/phase2/editor/actor-presets.md`。
- schema/runtime：`packages/content/src/actor.ts:114-137`；`packages/content/src/scene-v13.ts:30-43`；
  `packages/content/src/dialogue-v14.ts:18-38,162-196`。
- migration：`packages/migrate/src/pal-c1-dialogue-identity.ts:32-70,89-113`；
  `packages/migrate/scripts/migrate-content.mts:536-555`；`packages/migrate/src/migrate-content.ts:274-317,2628-2640`。
- 已知坑：C1-2 的 6,235 cue 零自动 promotion；scene entity/script owner 不是说话者；相同最终 leaf/hash
  不能替代 canonical locator；同人物换装受 ActorDef 单一 `spriteId` 限制。
- 不得重新引入：按 hash/address/name/sprite/portrait 模糊归并；`actor + sprite` 半状态；隐藏实例 override；
  非人物通道遗漏；只改 `projects/pal`；同进程 replay 冒充 clean-process 证据。

## 验收条件

- 功能：第一批 1–8 个 Actor 均有人工 decision；每个 entity/cue 投影有 source+canonical locator+parent
  leaf hash；未知项不变；Actor 与实例字段边界不变；投影前后对话解析出的 speaker/portrait/side 完全相等。
- 数据闭包：decision ledger 必须区分 `actor-only`、entity sites、dialogue sites；每个 site 恰好一次；
  泛称、换装、portrait-only 与冲突候选进入 deferred/rejected 清单，不能静默丢弃或自动采纳。
- 测试：候选 census、ledger schema/self-digest、locator/source drift、duplicate/overlap、projection/rewind、
  baseline/project 半状态、事务 exact allowlist、manifest raw 不变、current replay 与第二个 clean Node process
  `writes=0 deletes=0 conflicts=0`。
- 文档：人类可读归档表、Actor/别名/立绘命名、entity/cue 清单、deferred/rejected 理由、回滚与 E2E 批次；
  用户批准记录必须绑定 exact ledger digest，不接受“批准某名字全部出现”之类模糊谓词。
- 视觉：开发期只做功能性编辑器最小验证；剧情/演出观感统一进冻结后的 E2E 批次。
- E2E：逐批登记场景入口、角色、对话/立绘、关键时序和证据路径。

## 推进签字

### 进入 build 前:设计签字

- Codex:
  - premise: **verified（2026-08-14）**。C1-1/C1-2 已 done；current content14/SAVE8 已能无损表达
    Actor entity 与 Actor dialogue，无需新增 schema。PAL 0 actor entity / 0 actor cue，且 owner/speaker/
    portrait 多对多，证明必须人工逐 site 归档。
  - design: **agree（2026-08-14）**。同意下方“双层 authority + 小批用户 digest gate + PAL-only
    same-version successor”；实现文件在 Kimi/GLM 签字齐前不得修改。
- Kimi: premise **verified（2026-08-14，本人只读独立核证，非代理）** | design **agree
  （附必落钉 K1-K4，见「Kimi 独立反证审查」）**
- GLM: **premise verified + design agree（2026-08-14，本人独立复算 census + 候选 universe + 测试矩阵，
    非代理）**。全部数据精确吻合；双层 authority + digest gate + same-version successor 方向正确。
    附必落钉 G1（候选报告递归臂显式覆盖）+ G2（Entity 迁移保守性数据证据）。详见下方。
- 独立反证审查：GLM（2026-08-14，本人）+ Kimi（2026-08-14，本人），见各自下方
- counter / 分歧处理：none（Kimi agree 附 K1-K4；GLM agree 附 G1-G2）
- 缺签豁免：N/A
- build 准入结论：**allowed（2026-08-14）——Codex/Kimi/GLM 三方 premise verified + design agree 齐；
  Kimi K1-K4 与 GLM G1-G2 为 build 必落钉**

#### GLM 独立反证审查（2026-08-14，本人；非代理）

**方法**：Node 独立递归扫描 PAL 四来源 + 核实 speaker 分布 + Actor sprite 使用率 + C1-2 rewind 链。

**标准 1 — census 独立复算（全部精确吻合）✓：**

| 指标 | 卡文 | 本人复算 |
|---|---|---|
| entities | 5,077 | 5,077 ✓ |
| actor / sprite / zone | 0 / 3,695 / 1,382 | 0 / 3,695 / 1,382 ✓ |
| cues | 6,235 | 6,235 ✓ |
| narration / unbound / actor | 1,919 / 4,316 / 0 | 1,919 / 4,316 / 0 ✓ |
| `spk.李逍遥` 分布 owner 数 | ~174 | **174** ✓ 精确 |

**标准 2 — 候选 universe 覆盖 ✓（附 G1）：**

C1-2 已确认 dialogue cue 在 PAL 四来源的递归路径：
- scene（5995）：onEnter/hooks + entities[].pages/behaviors trigger/auto
- item（23）：私有脚本 body
- shared（0）：无 cue 但 walker 须覆盖
- enemy（217）：**ai.hooks ~202** + onDefeated ~15

卡文 `:132` 候选报告写"全量列出 current content14 entity/unbound cue/portrait 组合"——语义上覆盖，
但**未显式列出递归臂路径**。C1-2 G1 经验（enemy ai.hooks 被显式列表遗漏）在此重复风险存在。

**必落钉 G1（候选报告路径显式化）**：build 时 candidate report 的扫描范围应显式列出全部递归臂，
至少包括 scene onEnter + entities pages/behaviors trigger/auto + item private body + shared body +
enemy `ai.hooks.*.states.*.body` + `onDefeated` + `choreography`。报告自身必须有一个"覆盖零报告"
自检（每来源 cue 计数 = census 期望值），否则遗漏路径会产生静默漏报——人工审批基于不完整清单。

**标准 3 — Actor/Entity/Cue/Deferred 集合闭包 ✓（附 G2）：**

**关键数据发现 G2（Entity 迁移保守性实证）**：本人实测 6 个既有 Actor 的 `spriteId` 在 PAL 场景
entity 中的使用率均为 **0**：

| Actor | spriteId | scene entity 使用次数 |
|---|---|---|
| li-xiaoyao | li-xiaoyao | 0 |
| zhao-linger | zhao-linger | 0 |
| lin-yueru | lin-yueru | 0 |
| wu-hou | wu-hou | 0 |
| anu | anu | 0 |
| gai-luojiao | gai-luojiao | 0 |

这意味着卡文设计 `:150`"entity 只有当前 sprite 与 Actor spriteId **精确相等**才可换为 {actor}"在当前
数据下对既有 6 Actor 的 entity 迁移率 = 0。**第一批的 entity 迁移只可能发生在**：(a) 用户批准更新
Actor 默认 sprite 后再迁移等值 entity；(b) 为新 NPC Actor 选定与场景 sprite 一致的默认。设计应明确
说明这一现状——否则 build 实现者可能误以为 entity 迁移会大量发生，实际第一批可能以 dialogue 迁移
为主。

**必落钉 G2（第一批 entity 迁移预期管理）**：卡文或 build 文档应写明"当前 6 Actor 默认 sprite 在
场景 entity 中使用率为 0，第一批 entity 迁移预期极少/为零，以 dialogue 归档和 expression 补全为主"。
这不是缺陷——是保守设计的自然结果，但应避免误设预期。

**标准 4 — 测试矩阵审查 ✓：**

卡文 `:92-94` 已列：候选 census、ledger schema/self-digest、locator/source drift、duplicate/overlap、
projection/rewind、baseline/project 半状态、事务 exact allowlist、manifest raw 不变、current replay +
第二个 clean Node process 0/0/0。GLM 补充以下必要负测：

1. **candidate 覆盖自检负测**：candidate report 在某来源扫描器故意 stub 为空时必须 fail（防止未来
   schema 变更后静默漏报）。
2. **ledger digest 绑定负测**：用户批准 digest A 后 ledger 被改为 B → projector 必须拒绝执行。
3. **解析等价负测**：unbound→actor 投影后 resolved speaker/portrait/side 不等 → deferred 不投影。
4. **同 hash 多 occurrence 负测**：相同 source address/hash 的多 dialogue site 必须分别列出，不得
   去重合并。
5. **rewind 保留非目标改动**：project 中的合法非 C1-3 编辑在 rewind 后必须保留。

**premise verified — 独立核实：**
1. PAL EventObject 无人物身份字段（C1-2 已核 `sss.ts:45-63`）。
2. 当前 0 actor entity / 0 actor cue；4316 unbound cue 中 speaker/portrait/owner 多对多（`spk.李逍遥`
   分布 174 owner 精确实证）。
3. content14/SAVE8 schema 已能表达目标——dialogue-v14.ts 联合 + actor.ts 判别联合均冻结。

**design agree — 方向正确：**
- 双层 authority（candidate 报告只读非权威 / decision ledger 唯一写入权威 + 用户 exact digest gate）
- 第一批 1-8 Actor 小批 + 泛称/换装/portrait-only deferred
- 同版本 same-version transition（content14 不变）+ C1-3→C1-2→W9 rewind 链
- 逐 locator source+canonical 双锚 + file+RFC6901 pointer + parent hash（不用数组下标）
- 解析等价验证（投影前后 resolved speaker/portrait/side 完全相等）
- clean-process replay 0/0/0（不冒充同进程）

**可证伪观察：**
① 若 candidate report 遗漏任一递归臂（如 enemy ai.hooks），该路径 NPC 不会出现在候选清单 → 人工
  无法归档——G1 要求覆盖自检。
② 若投影后 resolved 画面不等（如 speakerOverride locale 键写错），观众看到的名字/立绘会变——
  设计已要求解析等价验证为投影硬门。
③ 若 ledger digest 未与用户批准绑定，projector 可能在未批准状态下写盘——设计已要求 digest gate。

Evidence: entities 5077=0/3695/1382 / cues 6235=1919/4316/0 / spk.李逍遥 174 owner / 6 Actor sprite
使用率全 0 / dialogue-v14.ts 联合 / actor.ts:114-137 判别联合 / pal-c1-dialogue-identity.ts rewind
先例。只读审查，未改实现/generated PAL，未代签 Kimi，未标 build/done。

#### Kimi 独立反证审查（2026-08-14，本人；非代理）

**方法**：一手读取 C1-2 transition 全实现（`pal-c1-dialogue-identity.ts:32-70,89-113,351-447,
449-569`）与 current replay（`migrate-content.mts:536-568`），对照任务卡五点证伪要求逐项压测。
与 GLM 结论独立一致；GLM G2（6 Actor sprite 场景使用率全 0）本人附议——第一批 entity 迁移
预期极少、以 dialogue 归档为主，属保守设计的自然结果。

**前提核实**：C1-1/C1-2 四证链完整（本人分别签过 done 前 accept；卡交接日志记用户已验收）；
PAL 0 actor entity / 0 actor cue（本人 C1-2 终审独立 census：narration 1919 + unbound 4316 +
actor 0 = 6235）；`ActorDef` 无 pages/hostile/pos（`actor.ts:114-137`），content14 联合已能表达
目标，无需新增 schema。前提成立。

**五点证伪（全部不成立）：**

1. **Actor 误当群众/完整 prefab → 不成立**。泛称默认 deferred（:26-27,57-58）；新 NPC Actor
   默认无 battler/face、不推断行为（:31,144）；entity 仅当当前 `sprite` 与 Actor `spriteId`
   **精确相等**才可换 `{actor}`（:147）。ActorDef schema 无行为字段可污染；群众复用外观列为
   未来独立 EntityTemplate 问题。剩余本质风险（同 sprite 的「另一个体」只能靠人工判断）已在
   风险节显式登记，由人工 ledger + 用户 digest 门兜底，属已知情而非漏洞。
2. **换装/别名/立绘无损 → 成立**。换装实例保持自定义 sprite 实体、不加 override（:28-29,148）
   ——不迁移即无损；别名必须以 `speakerOverride` 保留原显示文本（:145-146）；投影后必须用
   C1-2 唯一 resolver 证明 speaker 文本/portrait asset/side 与 parent **完全相等**，不等价则
   deferred（:149-150）——「无损」从口头承诺变成逐 cue 可执行断言。portrait asset 逐一人工
   命名，不按 asset 号自动归组（:146）。
3. **decision ledger 防 wildcard/伪 provenance → 成立**。candidate report 明示非 authority
   （:132-133）；「不提供按 speaker/owner 的 wildcard projector」（:187）；每 site 绑定
   canonical locator（file+RFC6901 pointer+parent hash）与 source identity（bodyId/
   sourceAddress/ordinal），同 address/hash 多 occurrence 分别列出（:154-157）；projector 只
   消费验证过的 ledger、clone-before-write（:158）；未批准 digest 只能 dry-run（:136-137）。
4. **C1-3→C1-2 rewind fail-closed → 成立（有已验证先例）**。C1-2 rewind/project-rewind 已证明
   该模式：seal 四态校验、半状态/漂移/digest 不符/authority 不符全部 throw、非目标工程改动
   保留（`pal-c1-dialogue-identity.ts:351-447`）、install→rewind 自校验（:564-567）。C1-3
   沿用同构模式并要求 manifest raw bytes 不变（:165）。
5. **用户批准 exact digest 可审计 → 成立**。≤8 Actor 硬上限 + 人类可读摘要 + 批准绑定 exact
   ledger digest + 变更后重新确认（:171-176,96,188-189）。用户无法逐条复核数千 locator 的真实
   边界由小批次与 deferred/rejected 明清单约束。

**必落钉（K1-K4，build 必落，不阻塞设计准入；与 GLM G1-G2 互补不冲突）：**

- **K1（ledger 唯一写入 authority）**：ledger strict schema（exactKeys 风格）+ self-digest
  自校验；projector 的写入集合必须从 ledger 机械派生，拒绝任何不在 ledger 内的写入与任何
  自由参数。
- **K2（批准绑定全量内容）**：用户批准 digest 必须覆盖 ledger 全量（Actor 定义 + 每 site
  locator/hash + portrait 命名 + deferred/rejected 清单）；批准记录（批准人/时间/digest）
  checked-in；ledger 任何变更使旧批准自动失效，projector 校验批准 digest 与 ledger 当前
  digest 一致才可写（GLM 负测 2 同旨）。
- **K3（same-version seal 完整性）**：C1-3 seal 必须断言 manifest raw bytes 不变、
  contentVersion/minimumSaveVersion 不变、C1-2/W9 seal digest 不变、methodVersion 独立于
  C1-2；install→rewind 自校验照 C1-2 :564-567 模式；replay 顺序 C1-3→C1-2→W9，
  第二个 clean Node process 0/0/0。
- **K4（批次上限与对账）**：projector 校验第一批 ≤8 Actor；deferred/rejected 清单计数必须与
  candidate report 全量对账（候选 = 采纳 + deferred + rejected，无静默丢弃）。

**可证伪观察**：① projector 存在任何不经 ledger 的写入路径（wildcard、批量 speaker 匹配）→
前提 3 失效，build 时核实现；② resolver 等价门在 speakerOverride 缺省时放宽（Actor.name 与
旧 speaker 文本不同仍通过）→ 无损性失效；③ C1-3 seal 允许 manifest/contentVersion 变动 →
same-version 前提失效，K3 已钉；④ 提取到稳定人物对照表 → 人工归档范围重审（卡 :59 已声明）。

Evidence: `pal-c1-dialogue-identity.ts:32-70,89-113,253-309,351-447,449-569` /
`migrate-content.mts:536-568` / `actor.ts:114-137` / `dialogue-v14.ts:18-38,162-196` /
C1-2 卡 census（本人终审复算）/ 任务卡 :26-31,130-176。只读审查，未改实现/迁移器/
projects/pal/baseline/capability-map，未代签 GLM，未标 build。

### 进入 done 前:审查签字

- Codex: **accept（2026-08-14）**。已复核批准 authority、169 个逐 locator edit、same-version
  transition、baseline/project rewind、current adapter、CLI 双 clean-process 事务、oracle 与发布态 PAL
  负证。首次正式写入后再次完整执行 `--c1-npc --write`，首子进程、同进程复验和第二 clean Node
  子进程均为 `writes=0 deletes=0 conflicts=0`；manifest raw bytes、content14、SAVE8 未变。
- Kimi: **accept（2026-08-14，本人只读 migration/架构终审 + 四包实跑 + PAL 独立 census，非代理）**。
  对照本人设计期 K1-K4 与 GLM G1-G2 逐项核销：
  1. **K1 ledger 唯一写入 authority ✓**：`projectPreparedC1NpcCuration`
     （`pal-c1-npc-curation-ledger.ts:764-845`）写前对 exact parent 重 prepare（`:769-775`，
     关闭 stale parent 复用）；写入仅从 ledger 机械派生——actors/locale/entity leaf/dialogue
     identity leaf 四类，entity 投影原位 `sprite`→`actor` 保留全部实例字段与键序（`:817-821`），
     零自由参数、零 wildcard 路径。
  2. **K2 批准绑定全量 ✓**：`pal-c1-npc-first-batch.ts:232-235` 从真实 parent/source 重算
     draft，`contentDigest != 批准值` 即 throw；approval 固定 `user @ 2026-08-14T07:45:56Z`；
     seal authority 强制 approver='user' 且 ledgerDigest==decisionContentDigest==批准常量
     （`pal-c1-npc-curation-transition.ts:308-315`）；提案文档明示任何 digest 变化提案自动失效。
  3. **K3 same-version seal 完整 ✓**：manifest raw/parsed 一致性 + content14/SAVE8 断言
     （`:221-233`）；seal 绑定 parent C1-2 surface、逐文件/逐 leaf edit digest、methodVersion
     独立；`projects/pal/manifest.json` 相对 C1-3 零变化（worktree 的 13→14 属 C1-2）。
  4. **K4 批次上限与闭包 ✓**：1–8 Actor 上限入 assert（ledger `:324`）；闭包
     8,011 = 169 accepted + 7,842 deferred + 0 rejected，candidate closure 漂移即 throw（`:581-583`）。
  5. **G1 ✓**：candidate report 显式分区臂 + 冻结 census（enemy-ai-hooks 202 / onDefeated 15 /
     choreography 0）+ 逐 cue coverage 自检。
  6. **无损等价 ✓**：`assertDialogueDecision` 比较解析后可见 speaker 文本/portrait/side
     （`:519-538`）；本人 PAL 独立 census：narration 1919 + actor 163 + unbound 4153 = 6235；
     speakerOverride 恰 13 条（醉道士 12 + 酒剑仙苦笑曰 1），locale 别名文本保留；
     两新 Actor 均无 battler/face，entity 仅 6 处且 sprite 精确相等。
  **本人实跑**：content 473 / reforge 1023 / editor 857 / migrate fast 88 files / 646 passed +
  5 skipped（含 `pal-c1-npc-curation-transition.pal.test.ts` 6/6、`candidate-report.pal.test` 3/3、
  `pal-c1-npc-curation.test.ts` 7/7），exit 0；`git diff --check` 通过（Codex 记录，本人未重复）。
  视觉/剧情观感按卡登记留集中 E2E，本人未重跑浏览器。未改实现/迁移器/projects/pal/baseline，
  未代签 GLM，未标 done。
- GLM: **accept（2026-08-14，本人覆盖/数据/测试矩阵终审，非代理）**。发布态逐项独立复算全部通过
  （见下方「GLM done 前终审证据」）。第一批 2 Actor + 6 entity + 163 cue 投影精确；speakerOverride
  别名保留；G1-G2 落实；replay/oracle/migrate fast 全绿。附 1 条非阻塞观察（proposal 文档留存）。
- counter / 返工处理：none（Kimi 已 accept；GLM accept）
- 缺签豁免：N/A
- done 准入结论：**satisfied（Codex accept + Kimi accept + GLM accept + 用户验收通过）**

#### GLM done 前终审证据（2026-08-14，本人；非代理）

**标准 1 — 发布态 census 独立复算（精确吻合第一批设计）✓**：

| 指标 | 第一批设计期望 | 发布后实际 | 核对 |
|---|---|---|---|
| entities 总数 | 5,077 | 5,077 | ✓ |
| actor entity | 6（李大娘 3 + 酒剑仙 3） | **6** | ✓ |
| sprite entity | 3,689 | 3,689 | ✓ |
| zone | 1,382 | 1,382 | ✓ |
| cues | 6,235 | 6,235 | ✓ |
| actor cue | 163（81+82） | **163**（li-daniang 81 + jiu-jianxian 82） | ✓ |
| unbound | 4,153（4,316-163） | 4,153 | ✓ |
| narration | 1,919（不变） | 1,919 | ✓ |
| actors.json | 8（6 既有 + 2 新） | **8**：jiu-jianxian(sprite-16) + li-daniang(sprite-21)，portraits 均 default | ✓ |

**标准 2 — speakerOverride 别名保留 ✓（逐条核实）**：
163 actor cue 中 13 条带 override：`spk.醉道士`×12 + `spk.酒剑仙苦笑曰`×1——与第一批 proposal
"含醉道士 12 cue 与酒剑仙苦笑曰 1 cue 均以 speakerOverride 保持显示"精确一致。locale 显示文本
保留（"醉道士"/"酒剑仙苦笑曰"）。无立绘 18 + default 立绘 145 = 163 ✓。

**标准 3 — entity 投影 spot check ✓**：
6 actor entity 全部定位正确（s001/e19、s002/e38、s003/e56 = li-daniang；s155/e2518、s158/e2648、
s159/e2651 = jiu-jianxian），pos/collide 实例字段保留（s003/e56 collide=true，s001/e19 无 collide
字段——与原状一致）。

**标准 4 — G1/G2 落实 ✓**：
- G1（候选报告递归臂）：`pal-c1-npc-candidate-report.ts` 显式扫描 scene entry/hooks/pages/trigger/
  auto/hostile + item private + shared body + enemy ai hooks/onDefeated/choreography；"未知递归分区
  或任一冻结 census 漂移直接失败"——覆盖自检负测在位。
- G2（entity 迁移预期）：第一批实际 6 entity 迁移（李大娘/酒剑仙各 3），与"预期极少"一致；
  8,011 候选闭包 = accepted 169 + deferred 7,842 + rejected 0（全量补集，无静默丢弃）。

**标准 5 — 门禁复跑（本人实跑）✓**：
- `migrate:content`（普通 current14）→ `writes=0 deletes=0 conflicts=0` + `[C1-3 dry-run]
  approved NPC curation writer/seal 预检完成；manifest bytes 未变`。
- `test:oracle:verify` → **2/2 passed**。
- `check:fast` → **88 files / 646 tests passed**（5 skipped）——与卡文数字一致。
- `git diff --check` → clean。

**标准 6 — seal 结构 ✓**：`c1-npc-curation-v1` seal：parent=c1-dialogue-identity-v1（sealDigest +
surfaceDigest 双绑定）；authority 含 candidateReportDigest（c2bb3bdc…）+ sourceEvidenceDigest
（c479628b…）+ sourceFileSha256；source 逐文件 parent/successor SHA256 + 逐 leaf edits；successor
contentVersion 14 + manifestDigest + manifestFileSha256（与卡文 166df8c2… 一致）。

**GLM 非阻塞观察（不阻塞 done）**：
`docs/ops/evidence/C1-3-first-batch-proposal.md` 人类可读批准表已生成，但该 evidence 目录不在
git 跟踪范围（docs/ops/evidence/ 未入库）。批准的权威记录是 `pal-c1-npc-first-batch.ts` 中的
digest 绑定（在库），proposal 表作为历史审计材料建议后续 commit 入库，否则跨会话不可追溯。

Evidence: entities 5077=6/3689/1382 / cues 6235=1919/4153/163 / actor cue 81+82 / override 13
（醉道士12+苦笑曰1）/ actors.json 8 / entity spot check 6 处 / seal authority/parent/successor /
check:fast 88/646 / oracle 2/2 / replay 0/0/0 / git diff --check clean。只读终审，未改实现文件，
未代签 Kimi，未标 done。

## Draft: 设计与风险

### 设计结论

#### 1. 两层 authority，候选不能直接写项目

1. `candidate report` 是只读派生物：全量列出 current content14 entity/unbound cue/portrait 组合、冲突和
   canonical locator，只帮助人工看，不具备投影 authority。
2. `curation decision ledger` 是唯一写入 authority：checked-in、strict schema、stable digest；每个 Actor
   明列 name/default sprite/portrait set，entity/cue 逐 locator 列出 parent payload/hash 与 source evidence。
3. 决策表必须由用户看到人类可读摘要后批准 exact digest；未批准 digest 时 projector 只能 dry-run，
   不得写 `projects/pal` 或 baseline。

#### 2. 第一批只做 1–8 个稳定人物

- 候选优先级只决定展示顺序，不决定身份：具名、跨场景复现、资源一致且剧情证据清楚者排前；泛称默认
  deferred。
- 每个 Actor 可独立选择：仅建预制（actor-only）、迁移若干 entity、迁移若干 dialogue，三者不强绑。
- 新 NPC Actor 默认无 battler/face；除非用户逐字段批准，否则不得从敌对配置、portrait 或 sprite 推导。
- Actor 采用新稳定 id 与 `name.<actorId>` locale；旧 speaker 若文字相同可去 override，别名必须以
  `speakerOverride` 保持原显示。portrait asset 必须逐一命名为 default/expression，不按 asset 号自动归组。
- entity 只有当前 `sprite` 与 Actor `spriteId` 精确相等才可换为 `{actor}`；其余字段和 JSON 顺序保持。
  换装/异形态实例保留 sprite entity，不加 override。
- dialogue 从 unbound 改 actor 后，必须用 C1-2 唯一 resolver 证明解析后的 speaker 文本、portrait asset、side
  与 parent 完全相等；无法等价则 deferred。

#### 3. source/canonical 双锚与逐字节可逆

- entity site：至少绑定 primary scene/event-object identity、当前 `sceneId/entityId`、file+RFC6901 pointer、
  完整 parent entity hash；不得用 entity 数组 index 作语义 id。
- dialogue site：至少绑定 source body/outcome identity（bodyId/sourceAddress/instruction ordinal 或等价冻结
  audit）、file+pointer、完整 parent cue hash；address/hash 相同的多 occurrence 必须分别列出。
- projector 只消费验证过的 ledger，clone-before-write；seal 绑定 decision digest、parent C1-2 seal、
  actor/locale/entity/cue site 集合、每个 affected file parent/successor hash、manifest raw/semantic digest。
- rewind 按 exact leaf/file/surface 恢复 C1-2 parent；baseline 与 project 分别校验，工程合法非目标改动保留，
  目标 leaf 冲突 fail-loud。

#### 4. same-version transition 与 current replay

- schema 不变：保持 contentVersion 14、minimumSaveVersion/SAVE 8、manifest raw bytes 不变。
- 新 PAL-only transition 位于 C1-2 外层；普通 current replay 顺序必须是 C1-3→C1-2→W9…，重建顺序反向，
  最终原 baseline/project 为 0/0/0。
- exact allowlist 仅含 `actors.json`、必要 locale/scene/enemy/item 文件与 C1-3 seal；决策未触及的文件、
  C1-2/W9 seal 和 manifest 一律不得变化。

#### 5. 中间用户门与视觉计划

- 三方 design agree 后，Codex 先实现/运行 audit-only candidate report 与 synthetic ledger/projector tests；
  此阶段不得发布 PAL 数据。
- 用户随后审批第一批表和 digest；若改 Actor/locator/portrait 命名，更新 ledger 后重新给用户确认。
- 功能性编辑器：开发期最小检查 Actor 列表、引用跳转、同一 Actor 跨场景实体与 cue 编辑；不保存额外手改。
- 剧情观感：每个批准 Actor 登记一个可执行剧情入口与旧/新解析对照，代码冻结后纳入集中 E2E，不在开发期
  反复走剧情。

### 已知风险

- 错误人物归并会跨场景传播姓名、立绘和默认精灵，且难以人工发现。
  - 缓解：分批小 allowlist、逐项 locator、可逆投影、独立 review 与剧情 E2E。
- 同一人物多套大世界 sprite 无法由当前单 `spriteId` ActorDef 无损覆盖。
  - 缓解：本批只迁移等于默认 sprite 的实例；换装保持自定义实体，不为迁移便利新增 override/schema。
- 对话宿主不是说话者，按 owner 全量替换会误归档。
  - 缓解：cue 逐 pointer 人工决策并做解析等价；不提供按 speaker/owner 的 wildcard projector。
- 批次太大使用户“批准”失去实际审计意义。
  - 缓解：第一批最多 8 Actor；摘要同时给 actor/entity/cue 数量、资源与 deferred 冲突，批准绑定 digest。

### 主审立场

- Reviewer: Kimi 主审 migration/架构，GLM 主审 census/覆盖/测试矩阵。
- 结论: **Kimi agree（附 K1-K4）+ GLM agree（附 G1-G2）**；两方独立反证结论一致，钉互补不冲突
- 必改项: Kimi K1-K4（ledger 唯一 authority/批准绑定全量/seal 完整性/批次对账）+ GLM G1-G2
  （候选报告递归臂显式覆盖 + 覆盖零报告自检/第一批 entity 迁移预期管理）
- 是否建议进入 build: **是（三方 premise verified + design agree 齐；build 准入 allowed）**

### 三方争议记录

- Codex: 不接受 speaker/sprite/portrait/owner 任一维度自动归并；第一批以 exact ledger + 用户 digest gate 为
  唯一 authority。
- Kimi: 无争议。五点证伪全部不成立；C1-2 rewind 先例证明 fail-closed 模式可行；附 K1-K4。
- GLM: 无争议。census 全部精确吻合；补 G1/G2 与五条必要负测。
- 用户拍板: 已批准继续 C1-3 设计；2026-08-14 已明确批准第一批 decision content digest
  `3b797613f508ebee9d0464f4185a59eaa3b3760a6c4ad5dbb33c09008f373c0f`。

## 额度 / 代班记录

- 缺席 Agent: none
- 其余: N/A

## Build: 实现与自测

- Coding Owner: Codex（仅三方 design agree 后）
- 2026-08-14 build 启动：三方 design agree 已齐。先实现 candidate report + synthetic decision-ledger
  authority/测试；在用户批准第一批 exact ledger digest 前，不投影或写入真实 PAL。
- 2026-08-14 candidate report 已落：`packages/migrate/src/pal-c1-npc-candidate-report.ts` 显式扫描
  scene entry/hooks/pages/trigger/auto/hostile、item private、shared body、enemy ai hooks/onDefeated/
  choreography；未知递归分区或任一冻结 census 漂移直接失败。报告只含
  `authority=read-only-candidate-evidence`，不可作为 projector 输入。
- PAL 只读实跑闭合：5,077 entities = 0 actor + 3,695 sprite + 1,382 zone；6,235 cues =
  1,919 narration + 4,316 unbound + 0 actor；来源 5,995/23/0/217；候选 universe 8,011，分成
  549 sprite evidence groups + 536 dialogue-display evidence groups。当前 report digest
  `c2bb3bdce36e973ee7d631344afab00e9a114d82fe2a03eecda1cf5091e97e82`，cue coverage digest
  `5dcbe205d0ac1b922433c163ca0a6f26d164159cd6be9083a677e6d07ed20491`。dialogue site 同时绑定完整
  parent cue hash 与独立 identity pointer/hash；这些 group 仅供排序/查看，
  明确不是 Actor 身份。
- source 双锚已落：`pal-c1-npc-source-evidence.ts` 将 4,316 个候选 cue / 8,817 行全部回接到
  `data/extracted/events/all.json` 的 13,513 条唯一 `showDialog`；每行绑定 exact TextId、locale text hash、
  messageIndex、source address 与 source command hash。对话变体 `dlg.N.v-xxxxxxxx` 另验可见文本
  `stableScriptHash`，不靠截后缀猜来源。source evidence digest
  `c479628b3b9cea83c8397749be60337736ebc4372d41620f992b97a16baefaf6`。
- 2026-08-14 strict synthetic authority 已落：`pal-c1-npc-curation-ledger.ts` 使用 exactKeys/self-digest、
  1–8 Actor 上限、accepted/rejected/deferred 全量补集闭包、用户批准 content digest 与 ledger self
  digest 双层绑定、module-private prepared authority、无自由 plan 的 clone-before-write projector；entity
  仅允许 exact sprite，dialogue 必须解析后 speaker 文本/portrait/side 完全等价。
- 第一批只读 draft 已生成并对真实 parent/source 做逐 locator 预校验：李大娘
  `sprite-21 + portrait.pal.055`，3 entity + 81 cue；酒剑仙
  `sprite-16 + portrait.pal.037`，3 entity + 82 cue（含“醉道士”12 cue与“酒剑仙苦笑曰”1 cue，均以
  `speakerOverride` 保持显示）。闭包 8,011 = accepted 169 + deferred 7,842 + rejected 0；draft content
  digest `3b797613f508ebee9d0464f4185a59eaa3b3760a6c4ad5dbb33c09008f373c0f`。人类可读表见
  `docs/ops/evidence/C1-3-first-batch-proposal.md`。
- 定向验证：migrate typecheck PASS；`pal-c1-npc-curation.test.ts` 7/7 PASS；
  `pal-c1-npc-candidate-report.pal.test.ts` 3/3 PASS。负证已覆盖漏来源、批准 digest A→ledger B、
  未知字段/wildcard、解析不等价、source evidence 漂移、stale canonical leaf、相同 hash 多 occurrence；
  real draft 另已通过 source/canonical/resolver 全部预校验；`test:manifest` PASS（共享工作树当前
  fast 86 files / 637 tests，release 110 / 769，canary 1 / 2）。
- 2026-08-14 用户批准第一批 exact **decision content digest**
  `3b797613f508ebee9d0464f4185a59eaa3b3760a6c4ad5dbb33c09008f373c0f`。批准 authority 已写入
  `pal-c1-npc-first-batch.ts`，绑定批准人、时间与完整 content digest；候选/source report digest 仍不是
  批准对象。开始实现 same-version seal、baseline/project rewind、事务与 clean-process replay；在这些门禁
  全绿前仍不写 `projects/pal`/baseline。
- 批准 authority 已由真实 source/C1-2 parent 重建：decision ledger digest
  `5fdd9f62a7166e924da0e25816e7d13264f480314ae00959146cee1bc0cefd93`；approval 固定为
  `user @ 2026-08-14T07:45:56.000Z`。旧 content digest、source bytes、candidate/source evidence 或任一
  locator 漂移都会在 projector 前失败。
- same-version transition 已落：seal 绑定 parent C1-2 surface、批准 authority、逐文件/逐 leaf edit、
  content14/SAVE8 与 manifest semantic/raw digest、successor managed surface；baseline 16 态与 project
  seal 三态 fail-closed，project rewind 保留非目标作者编辑，install→rewind byte-exact。
- current replay/CLI 已接：`--c1-npc` 与 ordinary content14 都按 C1-3→C1-2→W9 方向重建后重新发布
  C1-3；transaction allowlist 只允许 14 个批准内容文件 + C1-3 seal，manifest 不产生 transaction change，
  写入入口拆成 write-once 与第二个 clean Node verify-idempotence 子进程。
- 真实 PAL C1-3 dry-run PASS：`writes=15 deletes=0 conflicts=0`，seal digest
  `03f51faa6610afd439c0f5cbcc86b5c5ad52a74b88113de0a276246cb745e5c0`；真实 transition PAL test
  6/6 PASS（190.50s），unit curation/current-adapter/write-plan 13/13 PASS，typecheck PASS，test manifest
  PASS（fast 88/646，release 112/778，canary 1/2）。
- 2026-08-14 正式发布完成：初次事务只改批准的 14 个内容文件 + C1-3 seal，project/baseline
  C1-3 seal bytes 与 actors bytes exact；随后重新执行完整 `--c1-npc --write`，首子进程即
  `0/0/0`、同进程复验 `0/0/0`、第二 clean Node 子进程 `0/0/0`，无事务写盘。manifest raw sha256
  `166df8c29e3fb6597f2d50bc7657c7cf8fabb7c997ab4b7b54427fe1e3af91e8` 与 seal 记录一致。
- 发布后回归：migrate typecheck PASS；`test:manifest` PASS（fast 88/646、release 112/778、canary 1/2）；
  `test:fast` 88 files / 646 passed / 5 skipped；canary 1 file / 2 tests PASS（240.60s）；发布态
  C1-3 transition PAL test 1 file / 6 tests PASS（164.20s）；oracle 已纳入
  `c1-npc-curation-v1` seal 并 2/2 PASS；`git diff --check` PASS。

## 视觉验证记录

- Visual Verification Owner: Codex
- Visual Verification Timing: mixed
- 功能性 UI：C1-1/C1-2 已验收的 Actor 工作区与引用跳转不在本卡重复启动；C1-3 不新增 UI。
- 集中剧情 E2E 登记（代码冻结后统一执行）：
  1. `s001/e19`、`s002/e38`、`s003/e56`：李大娘实例应解析为 Actor `li-daniang`，姓名仍为“李大娘”，
     默认 sprite/portrait 分别为 `sprite-21` / `portrait.pal.055`；抽查 left/right/无立绘 cue，显示与迁移前一致。
  2. `s155/e2518`、`s158/e2648`、`s159/e2651`：酒剑仙实例应解析为 Actor `jiu-jianxian`，默认资源
     `sprite-16` / `portrait.pal.037`；抽查“酒剑仙”“醉道士”“酒剑仙苦笑曰”三种显示名，alias 必须由
     speakerOverride 保留且立绘 side 不变。
  3. 三条 portrait-only/no-speaker deferred cue 仍不得凭空显示 Actor 姓名；任一未批准候选保持 unbound。
- 证据路径：本卡第一批人类决策表、C1-3 seal 的逐 locator edits、集中 E2E 截图/录像后续写入
  `output/playwright/c1-3/`。

## Review: 审查与返工

- Reviewer: both
- 审查结论: **Codex accept + Kimi accept + GLM accept（2026-08-14）**。Kimi 对照设计期 K1-K4，
  GLM 对照 G1-G2 分别独立核销通过（见 done 前签字区）；四包实跑、PAL census、replay/oracle 均通过。
- 必须返工项: none
- Accept / rework: **三方 accept；用户验收通过；done**

## 用户验收

- 用户结论: **通过（2026-08-14）**。
- 后续任务: 本卡完成；剩余 7,842 个 deferred 候选若继续归档，必须另开小批 decision、重新给用户批准
  exact digest，不得沿用本批 authority。剧情观感按已登记入口进入后续集中 E2E 批次。

## 交接日志

- 2026-08-14 Codex: 按 C1-1 冻结边界建立 successor，未改迁移器或 PAL 数据。Next: C1-2 完成后再排期。
- 2026-08-14 User: C1-2 最终验收后要求继续。Codex 启动 C1-3 前提审计与设计，不进入 build。
- 2026-08-14 Codex: 核 current content14、Actor/entity/dialogue schema、C1-1/C1-2 census 与迁移 replay；
  签 premise verified + design agree。冻结第一批 1–8 Actor、candidate/decision 两层 authority、逐 site
  source+canonical locator、用户 exact digest 中间门和 PAL-only same-version transition。Next: Kimi/GLM
  独立反证并签字；三签前不得改实现或生成 PAL。
- 2026-08-14 Kimi/GLM: 分别签 premise verified + design agree；Kimi 附 K1-K4，GLM 附 G1-G2，
  三方 design 签字齐，build allowed。
- 2026-08-14 Codex: 接手 Coding Owner 并将任务转 build。第一阶段只做候选审计、覆盖自检与 synthetic
  authority；用户批准 exact digest 前禁止真实 PAL projection。
- 2026-08-14 GLM: 签 premise verified + design agree（附 G1 候选报告递归臂显式覆盖 + G2 第一批
  entity 迁移预期管理——实测 6 Actor sprite 场景使用率全 0）。
- 2026-08-14 Kimi: 签 premise verified + design agree（附必落钉 K1-K4）。五点证伪全部不成立：
  泛称/换装/prefab 边界清晰、别名/立绘经 resolver 等价门无损、ledger 无 wildcard 路径、C1-3→C1-2
  rewind 有 C1-2 fail-closed 先例、≤8 Actor + digest 门可审计。三方设计签字齐，build 准入 allowed。
  Next: Codex 先做 audit-only candidate report 与 synthetic ledger/projector 测试（K1-K4/G1-G2 必落），
  用户批准第一批 digest 前不得发布 PAL 数据。
- 2026-08-14 User: 批准第一批 decision content digest
  `3b797613f508ebee9d0464f4185a59eaa3b3760a6c4ad5dbb33c09008f373c0f`。Codex 将批准记录固化为唯一
  写入 authority，继续实现 same-version transition；seal/rewind/replay/事务未闭合前不写 PAL。
- 2026-08-14 Codex: 正式发布批准批次并完成双 clean-process 0/0/0、发布态 transition/oracle/canary/
  fast/typecheck/manifest/diff 门禁；Codex review accept，任务转 review。Next: Kimi 与 GLM 只读独立审查，
  未齐三方 accept 前不得标 done。
- 2026-08-14 Kimi / GLM: 分别完成 done 前独立终审并签 accept；无 counter、无阻塞返工。
- 2026-08-14 User: `C1-3：通过`。三方 accept 与用户验收齐，任务转 done。
- 无下一位 Agent 提示词；本卡已完成，等待用户选择下一项任务。
- 2026-08-14 Kimi: done 前 migration/架构终审 **accept**——K1-K4/G1-G2 逐项核销（ledger 唯一写入、
  批准全量绑定、same-version seal 完整、批次闭包、candidate 覆盖自检、resolver 可见文本等价）；
  本人实跑四包 content 473 / reforge 1023 / editor 857 / migrate fast 646+5 全绿；PAL 独立 census
  narration 1919 + actor 163 + unbound 4153 = 6235，speakerOverride 恰 13 条别名保留。
  Next: GLM done 前审查 + 用户最终验收；未齐前不得标 done。

### 下一位 Agent 提示词（Kimi，代码/架构审查）——已于 2026-08-14 执行完毕，签 accept（保留备查，勿再执行）

```text
接手任务：C1-3 PAL NPC 人工归档与可审计迁移——done 前架构/代码审查
任务卡：docs/ops/tasks/C1-3-pal-npc-curation-migration.md
当前状态：review；Codex 已 accept；Kimi/GLM pending；不得标 done，不得修改实现文件。
必读：AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、C1-3 任务卡、
docs/ops/evidence/C1-3-first-batch-proposal.md，以及 C1-1/C1-2 任务卡。
重点核验：用户批准 content digest 3b797613... 是否是唯一写入 authority；169 个逐 locator edit 是否
fail-closed；C1-3→C1-2→W9 baseline/project rewind；16 态/工程半状态；same-version manifest raw；
transaction exact allowlist；历史 --c1-dialogue/current caller 是否不会降级；oracle 是否绑定 C1-3 seal。
已验证：正式发布后双 clean-process 0/0/0；transition PAL 6/6；fast 88/646；canary 2/2；oracle 2/2；
typecheck/test-manifest/diff PASS。请只读独立复跑必要门禁并输出 Kimi accept，或明确 counter/返工项；
不要代签 GLM，不要把剧情 E2E 尚未集中执行误写成已完成。
```

### 下一位 Agent 提示词（GLM，覆盖/数据/测试审查）——已于 2026-08-14 执行完毕，签 accept（保留备查，勿再执行）

```text
接手任务：C1-3 PAL NPC 人工归档与可审计迁移——done 前覆盖/数据审查
任务卡：docs/ops/tasks/C1-3-pal-npc-curation-migration.md
当前状态：review；Codex 已 accept；Kimi/GLM pending；不得标 done，不得修改实现文件。
必读：AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、C1-3 任务卡、
docs/ops/evidence/C1-3-first-batch-proposal.md，以及 C1-1/C1-2 任务卡。
请独立复算并核对：候选闭包 8011=169 accepted+7842 deferred+0 rejected；2 Actor、6 entity、
163 cue；李大娘/酒剑仙别名与 portrait/side 解析迁移前后等价；三条 portrait-only/no-speaker 仍 deferred；
无 wildcard/重复/漏 site；发布文件、seal、baseline/project/manifest exact；测试矩阵和 E2E 登记是否完整。
已验证：正式发布后双 clean-process 0/0/0；transition PAL 6/6；fast 88/646；canary 2/2；oracle 2/2；
typecheck/test-manifest/diff PASS。请只读独立输出 GLM accept，或明确 counter/遗漏；不要代签 Kimi，
不要标 done。
```

## 下一位 Agent 提示词

### 给 Kimi（架构 / migration 反证）——已于 2026-08-14 执行完毕，签 premise verified + design agree 附 K1-K4（保留备查，勿再执行）

```text
接手任务: C1-3 PAL NPC 人工归档与可审计迁移——build 前设计审查
任务卡: docs/ops/tasks/C1-3-pal-npc-curation-migration.md
当前状态: draft；Codex 已 premise verified + design agree；build blocked on Kimi/GLM
你的角色: Kimi 独立核人物身份边界、same-version transition、project rewind 与用户可审计性
先读: AGENTS.md；docs/phase2/READ-FIRST.md；本卡全文；docs/phase2/editor/actor-presets.md；
  C1-1/C1-2 任务卡；packages/content/src/actor.ts、dialogue-v14.ts；
  packages/migrate/src/pal-c1-dialogue-identity.ts 与 migrate-content.mts current replay
已完成: Codex 核实 current content14/SAVE8 已足够表达目标；PAL 0 actor entity/0 actor cue，owner/speaker/
  sprite/portrait 多对多；提出 1–8 Actor 第一批、candidate report 非 authority、用户批准 exact decision
  digest 后才允许逐 locator 投影，manifest/schema/save 不变。
请你做: 独立尝试证伪：Actor 是否被误当群众/完整 prefab；换装和 alias/portrait 是否无损；decision
  ledger 能否防 wildcard/伪 provenance；C1-3→C1-2 project/baseline rewind 是否 fail-closed；第一批中间
  用户门是否真正可审计。把 premise verified/counter、design agree/counter 与直接 file:line 证据写回本卡。
不要做: 不改实现、迁移器、projects/pal、baseline 或 capability map；不代签 GLM；三签前不得标 build。
输出要求: 明确 agree 或 counter；counter 给最小复现/修法，agree 给必须落钉与审查矩阵。
```

### 给 GLM（数据 / 覆盖 / 决策账反证）——已于 2026-08-14 执行完毕，签 premise verified + design agree 附 G1-G2（保留备查，勿再执行）

```text
接手任务: C1-3 PAL NPC 人工归档与可审计迁移——build 前覆盖审查
任务卡: docs/ops/tasks/C1-3-pal-npc-curation-migration.md
当前状态: draft；Codex 已 premise verified + design agree；build blocked on Kimi/GLM
你的角色: GLM 独立复算数据口径、candidate universe、source/canonical locator 与测试矩阵
先读: AGENTS.md；docs/phase2/READ-FIRST.md；本卡全文；C1-1/C1-2 的 PAL census/迁移矩阵；
  packages/content/src/actor.ts、dialogue-v14.ts；packages/migrate/src/pal-c1-dialogue-identity.ts
已完成: Codex 冻结第一批最多 8 Actor；候选报告只能帮助人工、不能直接写；每个 actor/entity/cue 必须
  进入 exact decision ledger，未知/泛称/换装进入 deferred/rejected，用户批准 ledger digest 后才投影。
请你做: 独立复算 5,077 entity、3,695 sprite、1,382 zone、0 actor 与 6,235 cue 分流；检查候选扫描是否
  漏 scenes/items/enemies/shared/递归 arms；设计 actor/entity/cue/deferred 集合闭包与 duplicate/overlap/
  drift/half-state/clean-process 测试。把 premise verified/counter、design agree/counter 和证据写回本卡。
不要做: 不按名字/图片/脚本 owner 替用户裁决；不改实现或 generated PAL；不代签 Kimi；不得标 build。
输出要求: 明确 agree 或 counter；附精确 census、遗漏路径和必须新增的负测/冻结值。
```
