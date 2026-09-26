# TEST-GLM-CONTENT-GUARDS-2 — 六组校验叶边界补测

Status: build
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
- GLM作者交付：pending。
- Codex独立验收：pending；done未开放，固定三签暂停。

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
