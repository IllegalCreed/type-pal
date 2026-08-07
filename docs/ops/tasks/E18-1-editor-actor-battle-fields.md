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
- Kimi: pending
- GLM: pending
- counter / 分歧处理: N/A
- 缺签豁免: N/A
- build 准入结论: blocked

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
- 结论: pending
- 必改项: pending
- 是否建议进入 build: pending

### 三方争议记录(按需)

- Codex: 2026-08-06 开卡（此前用户确认可开，被 D14-1 优先）。
- Kimi: pending
- GLM: pending

## Build: 实现与自测

- Coding Owner: Codex
- 修改文件: pending；设计三签前不得开始实现。
- 实现摘要: pending
- 运行命令: pending
- 浏览器 / 手工检查: pending
- 跳过的检查及原因: N/A

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

## 下一位 Agent 提示词

```text
接手任务: E18-1 编辑器角色战斗字段
任务卡: docs/ops/tasks/E18-1-editor-actor-battle-fields.md
当前状态: draft（build 准入 blocked；Codex 设计冻结并签 agree，见「设计结论」）
你的角色: GLM 表单/校验覆盖主审；Kimi 异步抽审
先读: AGENTS.md、docs/phase2/READ-FIRST.md、本卡、content/src/actor.ts:83-92、
  main.ts:2230/2368/2454、B11-1 卡、N6 共享脚本引用规则、LevelCurveEditor.tsx（中区宽幅
  编辑器交互先例）
已完成: Codex 设计冻结——三字段落 actor.battler，ActorMode 战斗数据区 + UpdateActorCommand；
  coveredBy/cooperativeMagic 下拉引用；**casualty = 右栏摘要(状态 chip + 入口按钮) +
  中区宽幅 CasualtyEditor(仿 LevelCurveEditor,与精灵帧/升级曲线互斥)**,master-detail
  无钻取导航(左 gates/fallback、右分支 lines/effects);校验复用 validate/validate-refs,
  B11-1 迁入数据作回归样例
请你做: 压测三字段编辑/校验/引用语义、casualty 中区交互(与 LevelCurveEditor 同构性/
  互斥状态/往返回显)、引用不存在与空态处理；冻结方案后 agree/counter
不要做: 不得修改实现文件；不得改 content schema
输出要求: 更新设计签字、主审立场、争议处理和下一位提示词
```
