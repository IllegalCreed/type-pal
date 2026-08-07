# E18-1 - 编辑器角色战斗字段（coveredBy / casualty / cooperativeMagic）

Status: draft
Phase: phase2
Capability: E18（编辑器角色战斗字段 coveredBy / casualty / cooperativeMagic）
Coding Owner: Codex
Generation Owner: N/A
Reviewer: GLM（表单/校验覆盖）+ Kimi（异步抽审）
Visual Verification Owner: N/A（表单为编辑器功能，走单测 + 手动）
Unavailable Agents: none
Branch: TBD

## 目标

编辑器 actor 表单支持 B11-1 已落地的三个战斗字段：coveredBy（援护者）、casualty（伤亡脚本）、
cooperativeMagic（合体技），数据/runtime 已就绪，编辑器补齐编辑与校验能力。

## 范围

- 范围内:
  - actor 表单新增 coveredBy（引用 actor id）、casualty（friendDeath/dying 脚本引用）、
    cooperativeMagicSkillId（引用 skill id）编辑。
  - 引用校验（目标存在、kind 匹配）纳入现有 validate。
- 范围外:
  - 战斗数据/runtime 改动（content 与 reforge 已 done）。
  - 战斗字段之外的角色字段。
- 明确不做:
  - 不改 content schema（actor.ts 字段已定）。

## 上下文锚点

- 已拍板决策 / 铁律:
  - B11-1 已落地数据与 runtime；18e 是编辑器补齐（用户确认可开卡）。
  - 编辑器引用一律走稳定 id + 校验（ED 系列纪律）。
- 代码锚点:
  - `packages/content/src/actor.ts:83-92`（coveredBy/casualty/cooperativeMagicSkillId）。
  - `packages/reforge/src/main.ts:2230/2368/2454`（runtime 消费点）。
  - 编辑器 actor 表单（`packages/editor/src/ui/` 对应组件）。
- 已知坑 / 审计文档:
  - B11-1 卡（玩家伤亡脚本）的字段语义；N6 共享脚本引用规则。
- 不得重新引入:
  - 裸字符串引用无校验。
- 相关测试:
  - validate 单测、actor 表单组件测试。

## 验收条件

- 功能:
  - 编辑器可编辑/保存三字段；引用不存在时校验报错。
  - 导出内容与 runtime 消费点兼容（B11-1 场景回归）。
- 测试:
  - 表单单测 + validate 用例；`pnpm check` 全绿。
- 文档:
  - 更新 backlog/能力表 18e 状态。
- 视觉 / 手工验证:
  - 编辑器手动路径（保存/重开/校验提示）。

## 推进签字

### 进入 build 前:设计签字

- Codex: agree（2026-08-07 设计冻结，见「设计结论」）
- Kimi: **agree**（2026-08-07，异步抽审：三字段编辑/校验/引用语义 + casualty 中区交互
  逐项一手核实，附 K1-K4 build 准入钉，见「Kimi 异步抽审」；G1-G3 附议）
- GLM: **agree（2026-08-07，附 G1-G3 build 准入钉，见「GLM 设计准入复审」)**
- counter / 分歧处理: 无 counter；G2（校验是新增非复用）为 build 前口径对齐项，Kimi 独立
  确认并补 shape 面（K2）
- 缺签豁免: N/A
- build 准入结论: **allowed**（2026-08-07，三方 agree 齐；G1-G3 + K1-K4 为 build 验收钉，
  不阻塞准入）

### 进入 done 前:审查签字

- Codex: pending
- Kimi: pending
- GLM: pending
- counter / 返工处理: N/A
- 缺签豁免: N/A
- done 准入结论: blocked

## Draft: 设计与风险

### 设计结论

**2026-08-07 冻结（Codex agree）**：

1. 三字段全部落在 `actor.battler`（BattlerSpec），复用 ActorMode.tsx 现有「战斗数据」区 +
   `UpdateActorCommand`（session.dispatch 原子合并，保存/重开闭环天然成立）。
2. **coveredBy**：下拉选本工程 actors（有 battler 的角色）+「无」；存 actor id；校验引用存在
   且有 battler。
3. **cooperativeMagicSkillId**：下拉选 project.skills +「无」；存 skill id；校验引用存在。
4. **casualty**：friendDeath / dying 两个可折叠子编辑器，各编辑 `CasualtyScript`：
   - gates = 若干行 `chance(0-100) + branch`；fallback = 一个 branch。
   - branch = lines（text id 选择器 + style 下拉 bottom/top/narration）+ effects
     （kind 下拉 heal hp/mp 或 tempStatBuff stat 下拉 + percent 数字）。
5. 校验走现有 validate/validate-refs 基建（coveredBy → actor、cooperativeMagic → skill、
   line.text → text id）；B11-1 已迁入的 pal 数据作回归样例。
6. 范围重申：不改 content schema（actor.ts 字段已定）、不改 runtime（B11-1 已 done）。

**交互设计（2026-08-07 定稿，用户拍板「伤亡脚本走中区」）**：

- **位置**：右栏 inspector 新增「战斗关系」小节，插在「战斗数据」之后、「战斗形象」之前，
  与「战斗数据」同渲染条件（仅带 battler 角色）。
- **coveredBy / cooperativeMagicSkillId**：各一行 `.field` + 原生 `<select>`（CommandForm
  先例）；选项「（无）」+ 候选（显示名 + id 小字）；选择即 `UpdateActorCommand` 即时写回。
- **casualty = 右栏摘要 + 中区宽幅编辑器**（仿 LevelCurveEditor 模式，作者反馈
  「一大堆数没站在用户角度」重做同款）：
  - 右栏「战斗关系」节内：friendDeath / dying 两个状态 chip（已配置/未配置）+ 移除按钮 +
    「✎ 编辑伤亡脚本」入口按钮 → 展开中区 `CasualtyEditor`（与 SpriteFrames / LevelCurveEditor
    互斥，打开时关掉另一个）。
  - 中区 `CasualtyEditor`（宽幅 master-detail，无钻取导航）：
    - 顶部 tab：friendDeath / dying + 「移除本槽」 + 「✓ 完成」。
    - 左列：概率门 gates（chance 数字 + 分支行 + 删除，「＋ 加一扇门」）+ fallback 行；
      点击任一行选中其分支。
    - 右列：选中分支的编辑器——台词 lines（文本 id 输入 + 实时解析预览 + style 下拉 +
      删除，「＋ 台词」）+ 效果 effects（kind 下拉 heal hp/mp / tempStatBuff stat 下拉 +
      percent 数字 + 删除，「＋ 效果」）。
  - 空态：槽未配置 → 右栏 chip 灰 + 中区「＋ 配置」创建默认空脚本。
- **校验交互**：引用类错误（援护者角色不存在 / 技能不存在 / 文本 id 解析不到）行内红字 +
  编辑器问题列表报错，不阻断保存（编辑器现有惯例）。

### 已知风险

- 风险: 引用语义理解偏差（casualty 脚本作用域）。
- 缓解: 以 B11-1 卡字段语义为准；表单按 CasualtyScript 两层结构直编，不引入黑盒。
- 风险: 表单层级深（gates→branch→lines/effects）拖慢编辑。
- 缓解: 中区宽幅 master-detail（左 gates/fallback、右分支编辑器），无钻取导航；与
  LevelCurveEditor 同构,复用「右栏摘要 + 中区展开」交互语言。

### 主审立场

- Reviewer: GLM（表单/校验覆盖）+ Kimi（异步抽审）
- 结论: **GLM agree（附 G1-G3）+ Kimi agree（附 K1-K4）**
- 必改项: 见 G1-G3 + K1-K4（build 准入钉）
- 是否建议进入 build: **双方同意进入 build（钉子均为验收钉，不阻塞准入）**

### 三方争议记录(按需)

- Codex: 2026-08-06 开卡（此前用户确认可开，被 D14-1 优先）。
- Kimi: **agree（2026-08-07，异步抽审）**。详见「Kimi 异步抽审」。
- GLM: **agree（2026-08-07，表单/校验覆盖主审）**。详见「GLM 设计准入复审」。

#### Kimi 异步抽审（2026-08-07）：**agree（附 K1-K4 build 准入钉）**

**方法**：只读独立压测（非对 GLM G1-G3 逐项打勾）；一手核实 actor.ts:36-92 全形、
ActorMode.tsx（108 editingCurve / 179-202 中区槽 / 248-456 右栏节序）、LevelCurveEditor +
LevelingEditor 先例、validate.ts:261-314 validateActors 现状、validate-refs.ts
（:146-197 装备闭包先例、:705-737 validateReferences + validateBattleActor helper、
:999-1004 角色名 locale warn 先例）、PAL 实际产物 actors.json/skills.json 全量核对。

**独立确认（与 GLM 重合，附议）**：

1. **G1 互斥 state** 附议。补强：切角色时 LevelCurve 先例是「保持打开 + `key={actor.id}`
   重挂载换数据」（ActorMode.tsx:183 + editingCurve 不随 selId 重置）——CasualtyEditor 同例；
   右栏 chip 必须一律派生自 session state（禁本地副本，否则 undo/切角色后回显漂移）。
2. **G2 校验新增口径** 独立确认属实：validateActors:293-311 对 battler 只 requireKeys +
   battleSprite + sounds，三字段完全透过；validate-refs 无三字段规则。GLM 三条引用规则齐全
   （coveredBy→actor+battler / coop→skill / casualty lines text→text id）。
3. **G3 空态** 附议：空 CasualtyScript（gates:[] + 空 fallback）schema 合法（数组无最小长度
   约束），runtime sweep 对空分支无害；dying 空 effects 是 PAL 实有形态（纯对白）。

**K 钉（build 准入必落，增量于 G1-G3，不阻塞 agree）**：

- **K1（G1 的往返/选中态面）**：中区互斥按 G1 单枚举三态实现外——切角色时保持打开 +
  `key={actor.id}` 重挂载换数据（LevelCurve 先例，editingCurve 不随 selId 重置）；右栏 chip
  一律派生自 session state（禁本地副本，否则 undo/切角色回显漂移）；gates 删除时右列选中
  index clamp/回退 fallback，dispatch 后选中态不丢（LevelCurve sel 本地 state 先例）。

- **K2（G2 的 shape 面）**：GLM 列的是引用校验；**结构（shape）校验同样缺失且必须新增**——
  落 validate.ts validateActors（fail-closed throw，对齐现有纪律）：gates 数组、chance 整数
  ∈[1,100]（r∈[1,100] r≥chance；越界 = 恒中门/死门，多半笔误；PAL 全量 75/66/50）、
  style ∈ bottom/top/narration、effect kind 判别、tempStatBuff.percent 整数 ≥1（不门上限，
  >100 语义合法）。引用 severity 建议：coveredBy **error**（悬空语义丢失）；coop **error**
  （runtime main.ts:1505 expectDefined fail-loud）；casualty lines text **warn**（对齐
  validate-refs.ts:999 角色名先例，lookupText 缺键回显 id 不崩）。
- **K3（self-cover 与循环检测边界）**：G2 问 self-cover 环——coveredBy 自引用运行时天然无害
  （死者 hp=0 不满足援护 hp>0 前置，永不触发），源数据无此形态，建议 **warn 不 block**；
  **禁止加循环检测**——PAL 源数据 li-xiaoyao↔lin-yueru 互护（0→2、2→0）是合法形态，
  循环检测会把回归样例误报成红。
- **K4（移除/空壳纪律）**：槽移除 = 该键 undefined；两槽全移除 → `casualty` 整体置 undefined
  （对齐 setBattlerSound :133-143 的 nextSounds undefined 先例；PAL 无 casualty 角色即键缺失，
  非 `casualty:{}`），导出不得落脏键/显式 undefined——测试断言移除后导出 diff 干净。
  「槽已配置但 lines+effects 全空」校验 warn（防空壳误存）。

**实测核对记录**：PAL actors.json 六角色 coop（386/381/339/374/355/381，381 被两角色共享——
合法）+ coveredBy 六条全在；casualty 三角色有（李逍遥 friendDeath / 赵灵儿 dying / 林月如
双槽）、三角色键缺失；gates 全 [75,66,50]+fallback；style bottom/top/narration 三态实见；
coop 五个技能 id 在 skills.json 全存在——B11-1 回归样例可直接引用。

**结论**：**agree**。设计方向、交互先例、校验基建均核实成立；无 schema/runtime/save 级
反例。K1-K4 为 build 验收钉（实现期逐条核对），不阻塞准入。

**边界**：本 agree 只准入 E18-1 build，不代表 done。

#### GLM 设计准入复审（2026-08-07）：**agree（附 G1-G3 build 准入钉）**

**方法**：只读审查；一手核实 schema（actor.ts:83-92 + CasualtyScript/Line/Branch/Effect 形状）、
中区互斥先例（ActorMode.tsx:108 `editingCurve` state + LevelCurveEditor.tsx）、validate 覆盖现状
（validate.ts:260-268 actors 形状、validate-refs.ts 引用扫描）、B11-1 已迁入数据。未修改实现。

**正面核实（设计成立）**

1. **三字段 schema 对源** ✅：`actor.battler` 含 `coveredBy?:string`（actor id）/`cooperativeMagicSkillId?:string`
   /`casualty?:{friendDeath?:CasualtyScript; dying?:CasualtyScript}`；`CasualtyScript = {gates:{chance,branch}[], fallback:branch}`、
   `CasualtyBranch = {lines:CasualtyLine[], effects:CasualtyEffect[]}`、`CasualtyLine = {text:TextId, style:bottom/top/narration}`、
   `CasualtyEffect = heal hp/mp | tempStatBuff(stat+percent)`。设计卡第 1-4 条描述与 schema **逐字段吻合**。
2. **B11-1 数据/runtime 已就绪** ✅：三字段在 B11-1 已迁入 + runtime 已消费（卡内锚点 main.ts 行号已漂移，
   但 B11-1 卡 + GLM 此前核实确认 runtime 消费点成立）。本卡纯编辑器补字段,不动 schema/runtime。
3. **中区宽幅先例真实** ✅：`LevelCurveEditor.tsx` 存在、`ActorMode.tsx:182` 引用、
   `ActorMode.tsx:108` `const [editingCurve, setEditingCurve] = useState(false)` 已是"中区编辑器展开"单 state。
   casualty 中区 `CasualtyEditor` 仿此有现成交互语言 + 渲染槽。
4. **下拉引用 + 即时写回** ✅：`UpdateActorCommand`（session.dispatch 原子合并）是 ED 系列既有纪律，
   coveredBy/cooperativeMagic 走原生 `<select>` + CommandForm 先例方向正确。
5. **范围纪律** ✅：不改 content schema（字段已定）、不改 runtime（B11-1 done）、纯编辑器补齐 → 常规迭代定性成立。

**G 钉（build 准入必落，非 agree 阻塞）**

- **G1（中区互斥 state 形态）**：现状 `editingCurve` 是单 boolean。casualty 中区编辑器加入后需与
  LevelCurveEditor（精灵帧编辑器若同在中区）**三选一互斥**。实现须明确 state 形态——要么扩成枚举
  `activeCenterEditor: 'curve'|'casualty'|null`，要么并列 boolean + 打开 casualty 时 setEditingCurve(false) 反之亦然。
  设计卡未点明此 state 变更，实现期必须定（不可两个 boolean 同时 true 导致中区叠两个编辑器）。
- **G2（校验是新增，非「复用现有」——build 前口径对齐）**：设计卡第 5 条说"校验走现有 validate/validate-refs
  基建"，但一手核实 `validate.ts:260-268` 只校 actors 形状（不查三字段引用存在性）、`validate-refs.ts` 覆盖
  sprite/scene/skill/item 但**无 coveredBy/cooperativeMagic/casualty.line.text 的引用规则**。即三字段校验是
  **新增规则**，不是复用现有。实现必须把以下校验**实加进 validate-refs**，并按 ED-5I 纪律**每字段单测**：
  - coveredBy → actor 存在 且 该 actor 有 battler（援护者须是可战斗角色）；
  - cooperativeMagicSkillId → skill 存在；
  - casualty.{friendDeath,dying}.gates[].branch.lines[].text + fallback.lines[].text → text id 解析存在
    （复用既有 textId 校验，但遍历 casualty 树是新代码）。
  另校验 self-cover 环（coveredBy 指向自己）与跨工程引用是否允许，实现期定（建议至少 warn）。
- **G3（空态 + 引用不存在处理）**：右栏 chip 灰（未配置）+ 中区「＋配置」创建默认空脚本（gates:[] + fallback
  空 branch）——须确认空 CasualtyScript（gates:[]、fallback.lines:[]/effects:[]）是合法 schema（不抛）且
  runtime 不炸（B11-1 sweep 对空脚本应跳过）。引用不存在（actor/skill/text）行内红字 + 问题列表报错、不阻断
  保存（编辑器惯例）——但**保存后产物里的悬空引用要能被 validate-refs 检出**（G2 落地后自然成立）。

**结论**：设计方向干净、schema 对源、中区先例真实、常规迭代无 schema/runtime 风险。**agree**。
G1（中区互斥 state）、G2（校验新增 + 单测）、G3（空态 + 悬空引用检出）为 build 准入必落钉——其中
**G2 必须在动手实现前对齐口径**（"复用现有"是错的，是新增），其余为实现期验收钉。建议进入 build。

**边界**：本 agree 只准入 E18-1 build。不代表 done；casualty runtime 表现属 B11-1（已 done），本卡只管编辑器。

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件:
  - `packages/content/src/validate.ts`（K2 shape 校验:coveredBy/cooperativeMagic 非空串 +
    validateCasualtyShape gates/chance∈[1,100]/style/effect kind/percent≥1,fail-closed throw）
  - `packages/content/src/validate-refs.ts`（G2/K2/K3 引用规则:coveredBy→actor+可战斗 error、
    coop→skill error、casualty text→locale warn、self-cover warn、空壳 warn）
  - `packages/editor/src/ui/ActorMode.tsx`（G1 中区互斥 editingCasualty + 战斗关系节:
    援护者/合体技下拉 + 伤亡 chip + 移除 + 编辑入口;K1 切角色 key 重挂载、chip 派生自 state）
  - `packages/editor/src/ui/CasualtyEditor.tsx`（新增:中区宽幅 master-detail,
    tab friendDeath/dying + 左 gates/fallback + 右 lines/effects;K4 移除纪律）
  - 测试: `validate.test.ts` +6、`validate-refs.test.ts` +5、`CasualtyEditor.test.tsx` +5、
    `ActorMode.test.tsx` +4
- 实现摘要: 三方签后完成。G1 中区单枚举三态 centerEditor('curve'|'casualty'|null);
  G2 引用校验为新增规则(validate-refs)非复用;G3 空槽 ＋配置 创建默认空脚本(运行时 sweep
  对空脚本无害已由 B11-1 真值核实);K1 选中态本地 + 删除 clamp/回退 fallback + key 重挂载;
  K2 shape 校验 fail-closed;K3 self-cover warn 不加循环检测(互护合法);
  K4 槽移除=键删,两槽全移除 → casualty undefined。
- 运行命令:
  - `pnpm --filter @type-pal/content check`（400 通过,含 PAL 真实数据回归）
  - `pnpm --filter @type-pal/reforge check`（800 通过,loader-v5.pal 真值验证新校验兼容）
  - `pnpm --filter @type-pal/editor check`（809 通过,含 ActorMode/CasualtyEditor 9 条新测）
- 浏览器 / 手工检查: pending（编辑器视觉/手工验收——表单交互与保存重开闭环;按协议编辑器
  功能走单测 + 手动,视觉项由 Kimi 抽审）
- 跳过的检查及原因: 浏览器手工操作未在提交前执行(Codex 自证到类型+单测层;编辑器交互
  由组件测试覆盖 + Kimi 抽审兜底)。

### 钉逐项对照(G1-G3/K1-K4)

- G1 中区互斥: ✅ 单枚举三态 centerEditor('curve'|'casualty'|null),切角色保持打开 +
  key={actor.id} 重挂载;LevelingEditor 入口走同枚举。
- G2 校验新增: ✅ validate-refs 加三字段引用规则 + validate.ts shape 规则,每字段单测。
- G3 空态/悬空: ✅ 空槽 chip 灰 + ＋配置 建默认空脚本;悬空引用 validate-refs 可检出。
- K1 往返/选中态: ✅ 切角色保持打开 + key={actor.id} 重挂载;chip 派生自 session state;
  gates 删除选中 clamp/回退 fallback(单测覆盖)。
- K2 shape fail-closed: ✅ chance∈[1,100]/style 枚举/effect kind/percent≥1,越界 throw。
- K3 self-cover/循环: ✅ self-cover warn;无循环检测(互护 0↔1 合法,单测零 issue)。
- K4 移除/空壳: ✅ 槽移除=键删、两槽全移除 → casualty undefined(组件测试断言);空壳
  warn 在 validate-refs。

## 视觉验证记录(如适用)

- Visual Verification Owner: N/A
- 验证方式: pending
- 结论: pending

## Review: 审查与返工

- Reviewer: GLM + Kimi
- 审查结论: pending
- 必须返工项: pending
- Accept / rework: pending

## 用户验收

- 用户结论: pending
- 后续任务: pending

## 交接日志

- 2026-08-06 Codex: 开卡。content（actor.ts:83-92）与 runtime（main.ts:2230/2368/2454）
  已就绪，编辑器无三字段编辑能力。
- 2026-08-07 GLM（表单/校验覆盖主审）: 签 **agree（附 G1-G3 build 准入钉）**。schema 对源、
  中区互斥先例真实、常规迭代定性成立；G1（中区互斥 state 形态）、G2（校验是新增非复用——
  build 前口径对齐）、G3（空态+悬空引用检出）为 build 准入钉。详见「GLM 设计准入复审」。
  待 Kimi 异步抽审。
- 2026-08-07 Kimi（异步抽审）: 签 **agree（附 K1-K4 build 准入钉）**——三方 agree 齐，
  **build 准入 allowed**。独立压测附议 G1-G3 并补：K1 互斥/选中态往返细节、K2 casualty
  shape 校验新增（chance∈[1,100]、style 枚举、percent≥1）+ severity 分级（coveredBy/coop
  error、text warn 对齐 :999 先例）、K3 self-cover warn 不 block + 禁止循环检测（PAL
  li-xiaoyao↔lin-yueru 互护合法）、K4 移除整体 undefined 无脏键 + 空壳 warn。PAL 六角色
  产物数据全量核对无误，B11-1 回归样例可直接引用。详见「Kimi 异步抽审」。
- 2026-08-07 Codex: 实现完成并自证——content 400 / reforge 800 / editor 809 全绿(含
  validate shape+ref 11 条、CasualtyEditor 5 条、ActorMode 4 条新测);G1-G3/K1-K4 逐项
  落地(见 Build 节钉对照)。待 Kimi/GLM 审查签字 + 用户验收。

## 下一位 Agent 提示词

```text
接手任务: E18-1 编辑器角色战斗字段实现（三方 agree 齐,build allowed）
任务卡: docs/ops/tasks/E18-1-editor-actor-battle-fields.md
当前状态: draft → build 准入 allowed(Codex/GLM/Kimi 三方 agree,2026-08-07)。
你的角色: Coding Owner——build 阶段唯一实现文件修改者。
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡全文(设计结论 + GLM G1-G3 + Kimi K1-K4);
  content/src/actor.ts:36-92、editor/src/ui/ActorMode.tsx(全文件,重点 :108/:179-202/
  :248-456)、LevelCurveEditor.tsx + LevelingEditor.tsx(中区/摘要先例)、
  content/src/validate.ts:261-314、content/src/validate-refs.ts:146-197/705-737/999-1004。
必落钉(build 验收逐项核):
  - G1+K1: 中区互斥单枚举三态(sprite/curve/casualty),切角色保持打开 + key={actor.id}
    重挂载;右栏 chip 派生自 session state;gates 删除选中 clamp;dispatch 后选中不丢。
  - G2+K2: 校验是新增——引用校验落 validate-refs(coveredBy→actor 存在+battler,error;
    coop→skill 存在,error;casualty lines text→locale,warn 对齐 :999 先例);shape 校验
    落 validate.ts validateActors(gates 数组/chance 整数∈[1,100]/style 枚举/effect kind
    判别/percent 整数≥1,fail-closed throw)。每字段单测(ED-5I 纪律)。
  - G3+K4: 空态(未配置 chip 灰 + 「＋配置」默认空脚本);移除=键 undefined,两槽全空
    casualty 整体 undefined,导出无脏键(测试断言);「已配置但全空」warn。
  - K3: coveredBy 自引用 warn 不 block;禁止循环检测(PAL 互护合法)。
回归样例: PAL actors.json 六角色(coop 386/381/339/374/355/381、coveredBy 六条、
  casualty 三角色、gates 全 [75,66,50]+fallback)过 validate 零 error。
纪律: 不改 content schema、不改 runtime;选择即 UpdateActorCommand 即时写回;
  pnpm check 全绿 + 表单单测/validate 用例齐全。
验收输出: 实现摘要 + G1-G3/K1-K4 逐项对照 + 测试证据;回卡后交 GLM/Kimi review 签字。
```

```text
接手任务: E18-1 编辑器角色战斗字段（Kimi 异步抽审）——已执行完毕,勿再执行
说明: 本提示词为历史记录,Kimi 已于 2026-08-07 签 agree(K1-K4),三方 agree 齐,
  build 准入 allowed。请改用上方实现提示词。
任务卡: docs/ops/tasks/E18-1-editor-actor-battle-fields.md
当前状态: draft；Codex agree + GLM agree（附 G1-G3 build 准入钉）已落，build 准入 blocked on Kimi。
你的角色: Kimi 异步抽审（表单/校验覆盖 GLM 已做，见「GLM 设计准入复审」G1-G3）。
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡（尤其「GLM 设计准入复审」G1-G3、设计结论交互设计）、
  content/src/actor.ts:83-92（coveredBy/casualty/cooperativeMagicSkillId + CasualtyScript/Line/Branch/Effect）、
  editor/src/ui/ActorMode.tsx:106-108/180-182（editingCurve state + LevelCurveEditor 中区槽）、
  LevelCurveEditor.tsx（中区宽幅先例）、content/src/validate.ts:260-268 + validate-refs.ts（校验现状）、
  B11-1 卡（字段语义）。
请你做（聚焦编辑器交互/UX 抽审，GLM 已覆盖 schema/校验矩阵）:
  1. casualty 中区 CasualtyEditor 的 master-detail 交互：左 gates/fallback 选中 → 右分支 lines/effects 编辑，
     往返回显是否丢选中/丢未保存行；与 LevelCurveEditor 同构性（同一中区槽、同一「右栏摘要+中区展开」语言）。
  2. 中区互斥：打开 casualty 时精灵帧/升级曲线是否关闭，反之亦然（G1 state 形态——核实设计是否覆盖三编辑器互斥）。
  3. 空态与引用不存在：未配置槽的 chip 灰 + 「＋配置」默认空脚本（gates:[] + fallback 空 branch）是否合法；
     引用不存在（actor/skill/text）的行内红字 + 问题列表；悬空引用保存后能否被 validate-refs 检出（依赖 G2 落地）。
  4. G2 校验新增口径：GLM 已指出「复用现有 validate/validate-refs」是错的，三字段校验是新规则——
     请你独立确认 coveredBy→actor+battler、cooperativeMagic→skill、casualty.lines[].text→text id 三条
     新规则是否齐全、是否需 self-cover 环检查。
输出: 签 agree（附你席位的 build 准入钉）或 counter（具体反例）；更新设计签字 Kimi 行、主审立场、
  三方争议记录；若三方 agree 齐，把 build 准入结论改 allowed，给 Codex 一段实现提示词。不得修改实现文件。
```

```text
接手任务: E18-1 编辑器角色战斗字段——实现完成,交 Kimi/GLM review(当前生效)
任务卡: docs/ops/tasks/E18-1-editor-actor-battle-fields.md
当前状态: build(实现完成,提交 `f67eaf97`;content 400 / reforge 800 / editor 809 全绿)。
你的角色: Kimi + GLM——review 签字(审查/验收),不是再改实现。
已实现(Codex): 战斗关系节(援护者/合体技下拉 + 伤亡 chip/移除/入口)+ 中区 CasualtyEditor
  (master-detail,单枚举三态互斥 centerEditor)+ validate.ts shape 校验 + validate-refs
  引用规则(coveredBy/coop error、text warn、self-cover warn、空壳 warn)+ 16 条新测。
请你做: 逐项核 G1-G3/K1-K4 钉(见 Build 节对照)与 PAL 真值回归;浏览器/编辑器手工走查
  (下拉写回、casualty 编辑往返、移除导出干净);在 done 前审查签字表签 accept/counter。
不要做: 不得修改实现文件(必改项以 counter + 返工项写卡)。
输出要求: 更新审查签字、视觉/手工验证记录、下一位提示词(无则写「等待用户验收」)。
```
