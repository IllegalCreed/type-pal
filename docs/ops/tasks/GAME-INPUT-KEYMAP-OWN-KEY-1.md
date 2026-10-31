# GAME-INPUT-KEYMAP-OWN-KEY-1 — 未定义键名的查表所有权

Status: review
Owner: Codex（原卡作者；本轮文档pilot）
Phase: phase1
Last reviewed: 2026-10-31
Template: task-card-v1 / 1.0.0

## 目标

公开codeToAbstractKey只接受CODE_MAP自有键，未定义字符串回null。constructor/toString/__proto__在修复前分别暴露函数或对象，违背AbstractKey|null；普通原生KeyboardEvent.code不会产生这些字符串，不称玩家已遇到。

## 范围

仅查表所有权与真实KeyboardInputSource、modal/手柄/触屏相邻入口；34原支持键保持，不扩键表、类型、存档或机制。本卡原Status review保持，不借文档迁移关闭代码任务。

## 前提与证据

原基点e94098f9，用户2026-10-30批准且原Codex build allowed。先有公开API/null和原生事件不改变held/pressed两正式AssertionError，再加Object.hasOwn守卫。原卡记录正式2红2绿、34键守恒、14文件110邻测、game typecheck0；这里均是原卡时点，不是本轮复跑。

## 验收

核自有键结果、未知名不进入held/pressed、modal及设备所有权未变；不能用原型对象制造合法业务键。原代码已接受，统一门/提交仍随父窗口记录，不用文档结构通过代授。

## 状态与交接

查看[治理原件](../evidence/QUALITY-PENDING-100-3/README.md)与[输入所有权审查](../evidence/QUALITY-PENDING-100-3/input-keymap-own-key.json)。普通实体键盘触发未证明，新的产品行为另走授权；本轮只核固定源并等待独立文档验收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2787B / SHA-256 7cbee2ec65d8007144cbcc79166889d1ce9c2977004fe5cb9cfe5eb6345aab0b；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# GAME-INPUT-KEYMAP-OWN-KEY-1 — 未定义键名的查表所有权

Status: review
Owner: Codex
Phase: phase1
Capability: input-boundary / code-quality
Visual Verification Timing: N/A（直接键位API与原生事件边界）
Branch: codex/code-quality-94-102

## 目标

修正 `codeToAbstractKey` 对未定义字符串的现有 null 合同；用户2026-10-30批准只识别已定义键位，Codex build allowed。

## 范围

`packages/game/src/shell/input.ts` 的 CODE_MAP 查表及真实 KeyboardInputSource caller；相邻键位专测和 modal action 的输入域。现有键位、移动端、手柄、录放对象归属与存档均不扩张。

## 前提与证据

基点 e94098f949452bc3bf8d028f21bdc0a4e400ea22；Codex 单一 Owner。全文读取当前 input.ts、shared input 类型、现用主测与边界/回放专测；bootstrap 创建入口、GameShell 和 modal caller 已核实际使用。普通 native KeyboardEvent.code 不会产生以下字符串，不能声称普通玩家已遇到。

对完整当前模块以仓库 TypeScript 转译后直接调用公开函数：ArrowUp→Up、KeyZ/ControlRight→null，而 constructor/toString→function、__proto__→object，违背 AbstractKey|null 返回合同。初次只读复现未模拟查表算法、未改产品；后续用户批准的窄修见本卡交接。原件位于[当前治理证据入口](../evidence/QUALITY-PENDING-100-3/README.md)的 organization-shell-input-audio/keymap-probe，包含源码 SHA、命令与完整结果。

## 准入与停止线

用户批准读取确实存在的自有键；未知名称返回 null，已支持的物理键保持现状。本卡已单独获得第一阶段行为裁决，不外推其它字典或映射；纯组织与该修复分记录、分提交。

## 验收

批准后先在真实公开查表／原生事件入口补正式失败反例，再窄修并核正常键位与 modal/手柄/触屏相邻回归。未知键不得进入 held/pressed，不引入规则排除或强转。原件和用户决定同卡保存；未批准不标已修。

## 交接

2026-10-30：命名与组织补审期间发现；F/G 重组与新的 A 维风险分开记录。正式两反例先红：公开API回 null，以及原生事件不改变合法 held／pressed；均为指定业务 AssertionError、零pending。随后仅增加 Object.hasOwn 查表守卫；普通键位/类型/录放与移动输入不改，后续绿色与相邻门另记。

当前代码回执：正式2红2绿、34支持键结果守恒、14文件110相邻无诊断，当前game typecheck0。见[独立代码与八维证据](../evidence/QUALITY-PENDING-100-3/input-keymap-own-key.json)。不改支持键表/类型/保存/机制规则；普通实体键盘是否会触发未证明。代码接受，统一门/提交合并待父窗口。
```
<!-- incremental-original-source:end -->
