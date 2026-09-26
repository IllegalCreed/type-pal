# TEST-GLM-CONTENT-GUARDS-2 — 六组校验叶边界补测

Status: rework
Owner: GLM
Reviewer / Integration Owner: Codex
Phase: phase2
Visual Verification Timing: N/A（同步数据守卫，无UI与浏览器）
Production Base: `51048353fc3bde5a3e6bf50653786b905fd2857d`
Branch: `codex/glm-content-guards-wave2`
Worktree: `/Users/zhangxu/illegal/type-pal-glm-content-guards-wave2`

实际起点记录为包含本卡的最新main SHA。51048353冻结的是content目标面；Codex同期Reforge改动属授权主线，
不归GLM增量，不得回退。产品零diff/白名单以实际开工提交→候选核对，三个目标仍核冻结hash。

## 目标与前提

为E2已拆出的同步校验器补齐真实未覆盖边界，非继续十二组实验室。只写测试，不改产品与规则。
Codex已读`enemy-validation-shapes.ts:1–37`、`enemy-ai-condition-guard.ts:4–72`、
`battle-choreography.ts:30–161`和`author-battle-dialogue-boundary.test.ts`；错误路径、百分比边界、
空/非空逻辑组合与选中dialogue validator由当前生产实现定义，不发明“更严格”的政策。

一阶段/原版N/A：当前二阶段数据合同，不测战斗公式或演出观感。before→after：产品零diff，旧合法输入仍通过，
非法单字段按已有错误拒绝。最强替代解释是该边界已被别的入口测到；必须先去重，已证写精确title/file，
不再添一份。若当前guard实际放过违反当前类型/正式loader合同的输入，写最小诊断并交Codex裁决，不锁定缺陷为绿预期。

必读AGENTS/CLAUDE/READ-FIRST、[E2回执](../../testing/content-validation-refactor.md)、
上述三个目标与`enemy-script.test.ts`、`enemy-script.boundaries.test.ts`、`enemy-script.wave2.test.ts`、
`author-battle-dialogue-boundary.test.ts`、`validate-enemy-crosscalls.test.ts`。

## 六组合同

| ID | 目标 | 边界与非空正控 |
|---|---|---|
| G1 | shapes六函数 | record原对象身份/数组与null；exactKeys精确未知键路径；trim；有限数、percent闭区间、正整数；各错误前有同型合法对照 |
| G2 | AI叶 | hpBelow/hpAbove/anyPlayerHpBelow/chance共用百分比；turn/allyCount操作符与整数；role非空；difficulty非空与元素索引；无参两kind多余键 |
| G3 | AI组合 | all/any/not的合法嵌套、空数组现状、坏子节点完整where；unknown kind；同一实际输入深快照；不写战斗求值器 |
| G4 | choreography动作 | wait/stopMusic非负有限、可选缺席/显式0；revivePartyAll 0/10、非整数/越界；increaseHpMp合法负delta/池；growth八字段与cast effect |
| G5 | dialogue委派 | 精确cue对象/路径、选中callback返回/抛出的原Error身份、无callback合法runtime分支；旧13项作者递归合同直接引用去重，不复制 |
| G6 | choreography容器 | action/body/hook三层对象形状、at/once/when；多个合法hook的非空正控后只破一轴；完整输入保真与叶错误定位 |

每组先读旧测试+现有同树coverage报告；无报告时允许只对content全包做一次before/after临时/tmp测量，
用官方fast testSelection及include/exclude，两侧同配置。不要按组跑coverage，不改全仓统计。
不设凑数指标，预计30–50个有效参数化case；已有证据可减少实际新增。不得为达到数量造不可达内部组合。
未知输入可以unknown，合法fixture用真实类型/当前guard；禁止as unknown as、核心mock、吞错和手写生产替身。

## 白名单与验收

- 新测试仅content/src下`enemy-validation-shapes.leaf.test.ts`、`enemy-ai-condition-guard.leaf.test.ts`、
  `battle-choreography.leaf.test.ts`。可新增`packages/content/src/__tests__/guard-leaf-fixtures.ts`，不需资源文件。
- 证据仅`docs/testing/glm-content-guards-wave2/**`及本卡作者交付块。产品、旧测试、scripts、基线、配置零diff。
- 使用真实入口；每个拒绝只改一个字段并先跑合法正控，完整精确Error路径或身份；实际传入对象前后深快照。
- 交六行去重/新增表（精确title/file），同包全测、TC、改动Biome/docs/diff；可复用原判据制作4–6针代表反控，
  不为每个字段再造一套工具。判据必须钉恰exit1/目标fullName+file/唯一注入命中/AssertionError；混错与timeout不算红。
- 新的产品缺陷诊断放专属证据目录且默认绿套件不收红；具体失败不能只标“待证”，须含可复制输入/命令/实际/预期来源。
- 各组在同一分支连续提交，最后统一交付；`env -u NODE_COMPILE_CACHE`。不启动浏览器、不跑全仓check/官方ratchet/strict。
  Codex接收后统一质量门，不借作者结果自证。Cursor写editor命令，Codex写reforge宿主，三个Owner互斥。

## 推进记录

- Codex：premise verified / build allowed，2026-09-26，范围是已明确合同的同步叶测试；不扩公共API或格式。
- GLM作者交付（2026-09-26，分支`codex/glm-content-guards-wave2`，生产零diff）：G1–G6连续完成，
  三份白名单叶测试+`__tests__/guard-leaf-fixtures.ts`共**91行**（G1 33/G2 11/G3 6/G4 28/G5 3/G6 10）。
  去重先行：wave2 11行表/作者递归13项/G06三路递归已证轴逐条避开，只补未证半界、独立检查分支、容器形状、
  直入口委派身份。每个拒绝行先同型合法正控、单轴、精确Error路径或原Error身份（catch+toBe）、deepSnapshot输入保真。
  验证：91/91绿；6针反控（复用codex-content-boundaries判据，恰exit1/唯一注入/目标fullName+file/AssertionError-only）
  各恰红目标用例；同口径before/after各一次，三模块四维100%（如choreography行44/61→61/61、分支28/54→54/54），
  全包+20L/+25S/+30B分母零变化；全content 957/957、TC、改动Biome 0 error、check:docs均过。
  未发现产品缺陷；锁绿现状合同见[回执](https://github.com/IllegalCreed/type-pal/blob/b8e037cb3f4da68e4c5217842949bddbe6d23828/docs/testing/glm-content-guards-wave2/receipt.md)。
  不合main、不标done，待Codex独立验收。
- Codex独立验收：counter（b8e037cb，2026-09-26），仅R1–R4；见[本席报告](../../testing/guard-leaf-intake-review.md)与[机账](../../testing/guard-leaf-review-evidence.json)。上方作者交付区来自候选，仅将回执链接适配为固定SHA地址；仅作自验记录，不等于Codex确认其每项声明。done未开放。

## Codex接收日志 / 当前返工提示词

2026-09-26 Codex：白名单、生产零漂移、content957/957、TC与原六针实跑通过；三坏实现仍91/91全绿，
真实判据误收五类反例，最终JSON格式门exit1。仅落审查，不改GLM测试语义、不合候选、不跑官方统计；
保持main8232/688基线，工作树和分支留给GLM窄修，不交Kimi。

```text
在原codex/glm-content-guards-wave2返工TEST-GLM-CONTENT-GUARDS-2，候选b8e037cb，状态rework。
fetch后先git show origin/main:docs/testing/guard-leaf-intake-review.md，按R1–R4一次闭合；
无需为取报告合main，目标生产冻结与已过白名单/957全包/六针本次有效红不重开。
R1：对实际可变输入加独立快照；G1 record、G5回调cue不得共享expected遮盖改写；
精确路径用完整message全等，不能toThrow字符串子串。三Codex见证应从MISSED转为候选AssertionError检出。
R2：缺ms配同kind wait正控；turn op坏例保留合法value；多hook先证同型wait合法再仅破ms；
缺rows别用缺整个cue冒充；核其它同型正控，避免按字段有无猜错kind。
R3：实际judge钉同一失败项的绝对file+真实fullName、恰一个目标红/其余绿、exit1；
逐failureMessage拒混错/timeout；真实load记录唯一id/目标命中；自测走同一判据并拒本席五反例。
R4：修提交的evidence.json格式；最终树回执/计数/输入纪律如实校准；共享percent已证轴与直接入口补强分栏，
不要用无直测证明零重叠。不要凑91或30–50，不改产品/旧测试/配置/基线/本席反证工具。
只写本卡GLM返工块、三测试/fixture与专属证据。提交推送真实最终SHA；不合main、不标done。
无需替Codex补跑全仓check/ratchet/strict；局部自验结果如实登记，独立复验和最终收口由Codex完成。
```

## 下一位 GLM 提示词

```text
接手TEST-GLM-CONTENT-GUARDS-2，先读本卡及列出的三个生产模块/旧测试/E2回执。
从包含本卡的origin/main新建worktree type-pal-glm-content-guards-wave2、分支codex/glm-content-guards-wave2。
生产冻结51048353，只写三份白名单叶测试/可选typed fixture与专属证据。G1–G6连续完成，先去重再补真实未证轴；
不要复制已通过的作者递归13项，不追求测试数量。每个坏输入先证合法同型正控、仅破一轴、精确路径/原错误身份、
比较实际输入深快照。4–6针代表严格负控即可；整包一次全content/TC/Biome/docs/diff，覆盖只允许同口径/tmp前后一次。
产品/旧测试/配置/基线零改，不占浏览器、不跑全仓门。实际缺陷单列最小诊断，禁止改预期掩盖。
六组一份交付表，分组提交后推送；不合main、不标done、不代签。Codex独立验收、统一统计、集成和清理。
```
