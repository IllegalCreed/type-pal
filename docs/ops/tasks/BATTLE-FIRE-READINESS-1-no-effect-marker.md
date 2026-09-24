# BATTLE-FIRE-READINESS-1 - 无特效技能的战斗资源准备

Status: review
Phase: phase2
Capability: 既有战斗资源准备缺陷；PAL试打预制数据交付阻断
Coding Owner: Codex
Reviewer: Kimi / GLM
Generation Owner: N/A
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Unavailable Agents: Kimi额度耗尽；GLM按用户2026-09-24本次安排不参与；用户批准Codex独立完成，不代签
Branch: codex/pal-simulator-presets（ea80749a，未合并；卡文件已回迁main，预制数据/回归仍只在该分支）
Revision: r1 / 2026-09-22

## 回迁main核对（2026-09-24）

按用户2026-09-24拍板，本卡以`git show ea80749a:<本文件>`取回main，未合并`codex/pal-simulator-presets`。r1原文保留，过时处标注如下：

- **分支产物不在main**：七套预制数据`projects/pal/editor/battle-simulator.json`、11项回归`packages/editor/scripts/pal-simulator-presets.test.ts`、预制方案记录及其README索引仍只在ea80749a（基4bcd38b1，截至23ffebbb落后origin/main 72提交）。下文“数据11/11”“完整check 8040项”“只读集合复算”均为该分支树证据，不能在main复现；预制记录链接已改为冻结提交永久链接。这些产物如何进main（合并/cherry-pick/重做）未裁决。
- **生产锚点仍成立**：57dda7ed..main在`packages/`与`projects/pal/content`只增测试/fixture，生产源码零改，“生产与57dda7ed相同”对main仍真。逐条复核`pal-authored-overlays.ts:151-168`（392的effectSprite=65535）、`game/src/assets/loader.ts:287-310`、`battle-session.ts:1711/:1860-1935`、`battle/battle-sprite-readiness.ts:40-57`（仍只判`chunk >= 0`）、`battle-trial-assets.ts:232-247`（实际路径`packages/reforge/src/battle-trial-assets.ts`）均与卡述一致；`projects/pal/content/skills.json`仍只有295/377/392含65535，`projects/pal/assets/index.json`仍无`effect-sprite.pal.magic.65535`；main尚无钉住此行为的回归。补锚：普通战斗同一collector入口`packages/reforge/src/main.ts:2356`。
- **额度状态过时**：2026-09-24用户告知Kimi额度耗尽；[TEST-BATTLE-WORKFLOWS-1](../archive/tasks/done/TEST-BATTLE-WORKFLOWS-1-session-flows.md)的Kimi豁免仅限该卡r5终审，不外推本卡。本卡Kimi席位的代班或豁免未裁决，下方Kimi提示词不可直接转发；接手时按实际额度再确认。
- **门禁未变**：main看板仍写“七套预制方案候选及其资源准备阻断不因本次排期调整自动通过”，未见用户对“三席流程/本次豁免”的选择记录；build准入仍blocked。本次只在看板登记draft。

## 目标与范围

使当前合法的无FIRE特效技能不被当作不存在的特效资源预载，解除七套预制方案中三套的真实开战阻断。
准备候选起点4bcd38b1；生产与57dda7ed相同。七套数据与11项回归见[预制方案记录](https://github.com/IllegalCreed/type-pal/blob/ea80749a/docs/testing/pal-simulator-presets.md)（仅在分支，main无此文件）。
数据工作原属既有格式下的常规作者内容迭代；发现资源链缺陷后升级本卡，产品修复尚未开始。

范围内：FIRE集合计算的无特效标记、原有双方execution/合击/敌方闭包回归、七套实际启动补证。
范围外：schema/content20/SAVE8切版、迁移/资源重生成、伤害/成长/AI、其它Q2问题、360主壳、其它GLM任务。
不删预设中的梦蛇/金蝉脱壳来使测试变绿，不伪造65535号资产，不忽略真正缺失的普通资源。

## 前提真值门

一句话：当前内容使用65535表达没有FIRE位图的技能，而准备集合把所有非负数均当成待加载资源。

| 维度 | 当前真值 | 一手证据 |
|---|---|---|
| primary/current内容 | 梦蛇295、飞龙探云手377、金蝉脱壳392含effectSprite=65535；catalog无该资源 | `projects/pal/content/skills.json`按id定位；`packages/migrate/src/pal-authored-overlays.ts:151-168`显式生成392的同一语义；不是预制文件引入新技能 |
| 第一阶段 | 预载以真实FIRE目录条目为集合，保留合法0号，不向虚构65535号发请求 | `packages/game/src/assets/loader.ts:287-310`；此为UX/资源参考，不复制旧吞错fallback |
| 当前二阶段演出 | 梦蛇使用专用变身时间线，偷窃/逃跑同样有专用路径，注释明确65535无特效 | `packages/reforge/src/battle/battle-session.ts:1860-1935`；普通施法取预载fire后允许其为空`:1711` |
| 当前准备/失败 | collectBattleSkillFireChunks仅判断chunk>=0；prepareBattleTrialAssets将其严格解析为AssetId并加载 | `battle/battle-sprite-readiness.ts:40-57`、`battle-trial-assets.ts:232-247`；Codex浏览器回梦往昔实际报catalog无effect-sprite.pal.magic.65535 |
| 目标 | 无FIRE特效不请求虚构位图；合法0号/普通编号、双方覆写选择及真实缺资源拒绝保持 | 窄修集合语义，后续测试与原生试打验证；不修改skill定义/动画机制 |

最强替代解释：预制选了非法技能/资产提取遗漏/目录坏输入。已排查：七套正式loader→guard→prepare均零issues，
65535来自既有技能与显式overlay；正式演出已有无FIRE专用路径，而不是存在一个尚未拷贝的正常65535资源。
可证伪观察：若当前合法场景实际把65535用作真实FIRE位图，或resolveSkillExecution在进入此函数前已经归一无特效，
则窄修前提不成立。独立审查须直接读取上述链路，不能只复述此表。
其它替代根因：不涉及碰撞/地图解码；只读collector复算三套包含65535，四套无缺失；不是浏览器缓存推断或手写技能模拟器。

用户可见before→after：选含梦蛇/金蝉脱壳的合法方案报资源失败→正常入战，技能按既有正式机制执行。
用户已批准七套预制方案及实现；根因保持现有行为意图，不新增产品裁决。资产准备链的三席/本次豁免另等门禁。

## 设计与验收

1. 在实际collector对已解析执行面的65535无特效值不建FIRE请求，保留既有负值处理；不按技能ID或角色ID特判。
2. 覆盖玩家/合击/敌人及execution覆写后65535；0号与常规正编号保留；错误普通编号继续进入严格resolver失败，不能按catalog有无来静默过滤。
3. 七预制按正式准备链读取实际资源，不只验证基础config；补实际集合闭包回归，梦蛇/逃跑/偷窃的原演出与音效准备保持。
4. 单点移除修复条件时新回归必须业务红；定向+相邻、完整check→ratchet→受保护单次strict-fast串行，不与GLM争用官方输出。
5. Codex真实浏览器查看默认三人及巫后双人；至少验证本场停止/重开，七套不出现资源准备失败。仅功能验证，不冒充全部技能平衡/剧情Q1/Q2。

已知风险：该collector也服务普通战斗，修复不得只修试打入口；无特效与资源丢失的区分必须按合同，不增加catch-and-skip。
旧版本兼容审查：拟保持当前canonical数据语义，不新增版本分支、旧upgrader或缺资源fallback。
遵守[第二阶段铁律](../../phase2/READ-FIRST.md)、[知识收获](../../phase2/reference/phase1-knowledge-harvest.md)与
[模拟器原设计](../../testing/battle-simulator-r2-design.md)。不改已done卡签字。

## 推进签字

### 2026-09-24用户本次独立推进裁决

用户在明确询问本卡Kimi设计/终审安排后指示“glm你也不用管了先，你先独立完成工作吧”。
本次按Codex独立完成环境稳定性、FIRE窄修、七套预制交付记录两席缺签豁免；不外推未来任务，不写Kimi/GLM accept。
独立第三方复核缺席的风险由此次明确授权承担，Codex保留完整失败回归/单点负控/真资源与功能视觉验证，不豁免质量门。
当前main再次正式validateSkills通过；实际collector对377/295/392返回65535，catalog无该资产。
预制分支仅1个独有提交、生产源码/内容模型无漂移：只取预制JSON、11测试与记录，保留main卡/索引新状态，不整树覆盖。
下方r1历史pending保留；**本次有效build准入：build allowed（Codex按用户明确单席授权核定）**；done仍待实施与验证。

### 进入build前

- Codex：premise verified / design agree。依据当前collector的实际65535输出、现有专用演出及浏览器错误；
  归因在预载集合而非缺失二进制，拒绝通过删除技能或假资产规避。可证伪观察见上；2026-09-22。
- Kimi：pending。
- GLM：pending。
- 独立primary-source反证：待至少一位非Coding Owner审查。
- 缺签豁免：尚无。已向用户询问“按三席流程”或“本次豁免由Codex独立窄修验证”，未收到选择前不视为豁免。
- build准入：blocked（缺签；不把卡的draft状态写成产品修复授权）。

### 进入done前

- Codex：pending。
- Kimi：pending。
- GLM：pending。
- done准入：blocked。

## 当前证据与剩余工作

### 2026-09-24本次实施已完成，统一门禁待验

- Codex按用户本次独立授权完成collector一处条件窄修（0xffff不请求，负值旧行为/0号/普通缺资源拒绝保持）；新合法guard矩阵和真实prepare资产正反对照6项，修前4红2绿、修后全绿，相邻29绿；单点移除条件，新player回归自身AssertionError红。
- 七套JSON和原11回归按文件取回，追加实际玩家/合击/敌人FIRE闭包目录检查，12/12；Reforge/Editor TC通过；代码Biome通过。
- 原生Chrome七套全部真实入战；三人及巫后双人截图检查和停止/重开通过。所有场次为临时试玩，不写正常存档或作者配置；视觉细节/工具时序披露见[预制记录](../../testing/pal-simulator-presets.md)。
- 本次不改schema、公式、脚本语义、迁移与资源二进制；统一check→ratchet→单次strict与最终收口待完成。

> 2026-09-24回迁注：本节证据均出自分支ea80749a树；main上没有七预制数据与11项回归，不能在main复现。

- 数据11/11通过；初版序列化夹具错误已补完整作者场景输入，未改正式guard。
- 数据树完整check exit0：七包8040项，47既有warning/6info；日志`/tmp/type-pal-pal-presets-check.log`。
- 官方ratchet/strict-fast尚未执行：真实开战阻断未修，不能把数据单测绿写成交付。
- 浏览器三人成型和初出江湖能入战；回梦往昔真实错误如前。其它方案不冒称全量视觉通过。
- 只读集合复算：三人成型/初出江湖/逍遥与灵儿/中段双人无missing；苗疆组合/决战准备/回梦往昔缺65535。
- 代码修复、正式失败回归、负控、统一门和最终交付均待准入后执行。

## 交接日志

- 2026-09-24 Codex：用户明确“glm你也不用管了先，你先独立完成工作吧”，按本批范围记录两席缺签豁免；独立完成失败回归、collector窄修、原生七套开战及两代表阵容停止/重开。进入review，统一门禁未完前不done；不把本次授权外推后续任务。
- 2026-09-24 Cursor代理（用户指派，仅文档回迁）：按用户拍板以`git show ea80749a`取回本卡并在main看板登记draft；
  未合并分支，未取回预制数据/回归/记录。逐条复核锚点，过时处见“回迁main核对”。不签字、不改状态、不开始实现。
- 2026-09-22 Codex：用户批准七预制，完成作者侧数据及回归；真实试打定位旧资源准备缺陷，暂停交付并开本卡。
  七方案不删技能，未改产品源码/迁移baseline/覆盖率门；等待设计签字或用户明确本次豁免。

## 下一位Agent提示词

> 2026-09-24回迁注：以下提示词写于分支时期，部分过时——预制记录、7预制JSON与11测试须以`git show ea80749a:<path>`或检出该分支读取；
> Kimi额度耗尽，Kimi段在其恢复或用户裁决代班/豁免前不可直接转发。

以下两席可并行，分别独立取证，只改本人签字/日志并提交推送；不读或复述另一席结论，不改状态/不开始实现/不标done。

### Kimi

在 `/Users/zhangxu/illegal/type-pal` 审 BATTLE-FIRE-READINESS-1 r1，卡
`docs/ops/tasks/BATTLE-FIRE-READINESS-1-no-effect-marker.md`，draft，候选分支`codex/pal-simulator-presets`。
先读AGENTS/CLAUDE/READ-FIRST、卡与`docs/testing/pal-simulator-presets.md`。独立核collector→双方execution→
试打/普通战斗→专用trance/steal/flee演出，判断65535是否应从FIRE集合排除而保留0号及真正缺资源拒绝。
不扩schema/迁移，不删预制技能，不伪造资产。核7预制作者旁车唯一真源/非托管保护策略。
在本席签带file:line与可证伪观察的premise verified/design agree或counter；提交推送。不代签，不改状态或实现。

### GLM

在 `/Users/zhangxu/illegal/type-pal` 审 BATTLE-FIRE-READINESS-1 r1，同卡draft/同候选分支。
先读AGENTS/CLAUDE/READ-FIRST、卡、`docs/testing/pal-simulator-presets.md`及7预制JSON/11测试。
独立核3套missing65535与4套无missing分组、当前特殊技能语义、集合侧别/0号/真缺资源的反例设计，
确认新回归能钉住而不是只核guard通过；复核不覆盖作者配置/不向其他工程注入。你只做代码/文本，不做视觉。
仅本席签带一手锚点的premise verified/design agree或counter并提交推送，不改状态/实现，不代签。
