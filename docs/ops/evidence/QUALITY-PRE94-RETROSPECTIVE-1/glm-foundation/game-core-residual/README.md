# game-core-residual(core 残余六件)八维复审批

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 pre-94 foundation 模块 11 批 26(core 收尾)的八维复审批回执:对象为 game core 残余六文件(rng 51/command-bus 88/inventory-state 31/equip-effect 295/equipment-state 392/event-opcode-player 427 行,全文读毕),整改类型为纯注释 5 处(三文件)、零代码改动,body-invariance allEqual=true。证据原件即下方逐字节保全的固定main源(3303B,SHA 见保全块)。

## 来源与输入

基线 origin/codex/code-quality-3y @ 53db76bbbb(候选线 58+ 提交)。整改清单:①command-bus.ts 模块头『异步回执机制(complete cmdId)接口留下,M3 转场/视频时激活』过时——转场/视频实际走 suspendRaf+每帧 drain,complete() 零生产消费方(仅自身 no-op 测试),改为『从未被激活…接口保留为兼容,清理候选已登记』;②complete() TODO 注同源过时,改为『保留的异步回执接口——从未激活(见模块头),现 no-op』;③equip-effect.ts runEquipScriptSync docblock『0x2D/0x29(待 identify)留 follow-up』过时——两 case 下方已实现(仙女剑 DualAttack/寿葫芦 563/564),改为『已实现(见下方 case)』;④runEquipScript docblock 整套过时——runEquipScriptSync 0x18 现已真做 swap(cur!==newItem 分支),menu-driver 按 DM23 只写入口值,改述现架构;⑤equipment-state.ts removeEquipmentEffect docblock『ts 简版:DualAttack status 模型未做(留 follow-up)』与函数末 partIdx 3/5 分支(两副作用均已实现)直接矛盾,改为『两项副作用均已实现』。零整改面(3 文件):rng.ts mulberry32 与 sdlpal LCG 差异声明+D29 对拍边界准确;inventory-state.ts qty==0→1 真值(global.c:1094)、id 0 哨兵守卫(扬州空宝箱根因)、99 clamp 全锚准确;event-opcode-player.ts 注释稀疏但全部准确。Codex 当前裁定(2026-10-19):本页保留作者阶段证据,未获整包/全维收口验收;可复用范围与逐文件依据见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 断言与业务 oracle

body-invariance:三整改文件 printedSha256 一致,见 [body-invariance.json](body-invariance.json);定向 10 文件(command-bus/equip-effect×2/equipment-state/event-opcode-player×4/cross-module/dependency-ownership)51 套件 127/127、0 failed suites,机器回执 [directed.json](directed.json);tsc --noEmit -p packages/game exit 0;scoped biome 0 诊断;git diff --check 干净。127 例真实主轴:G07 跨模块边界四链(scene 写 mapNum→对话历史、addItemToInventory id0 拒收、装备派生进 0x30 快照、装备脚本经 event 表执行);equip-effect 装备效果行写入真值(木剑 rgwOperand=[14,20,3]→DEXTERITY、长鞭 SPRITE_NUM_IN_BATTLE/ATTACK_ALL、圣灵珠 COOPERATIVE_MAGIC 行 65);event-opcode-player cov85 41 例(0x8d 封顶 99/999、0x17 装备效果层直写、0x18 交换分支);command-bus 6 例含 complete(cmdId) M2 内 no-op(死接口的运行侧印证)。

## 结果

纯注释整改批(5 处,零代码改动):127/127 定向绿+body-invariance 三文件恒真共同证明行为零变。登记项(交 Codex):CommandBus.complete(cmdId) 死接口(零生产消费方,与四死 union op 同族)——清理候选(批26新增)。模块收口:core/ 全目录收口(此前 b3/b4/四大文件+battle+menu+本批六件=core 46 文件,作者阶段主张);game 包余量 inspect/save→analytics→tools→dev。

## 限制与复核

未重跑任何命令/测试;tsc exit 0 与零诊断为原时点自报;body-invariance 的 base 为字面量 HEAD(运行时解析),证明力弱于族内钉死 SHA 的姊妹件;『core 46 文件收口』为作者主张,Codex 2026-10-19 未收口;历史结论保持原时点。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3303B / SHA-256 9c3b78ae9fc6f46a6013ac2501b7403d6a4ba6eaa5a39bd62c24588bf5defa54；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# game-core-residual(core 残余六件)八维复审批

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

- 批次:pre-94 foundation 模块 11 批 26(core 收尾)
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 58+ 提交)
- Coding Owner:GLM;六文件全文读毕(rng 51/command-bus 88/inventory-state 31/equip-effect 295/equipment-state 392/event-opcode-player 427)
- 整改类型:纯注释 5 处(三文件),零代码改动 — body-invariance `allEqual: true`

## 整改清单

| # | 位置 | 问题 | 修正 |
|---|---|---|---|
| 1 | command-bus.ts 模块头 | "异步回执机制(complete cmdId)接口留下,M3 转场/视频时激活"过时 — 转场/视频实际走 suspendRaf + 每帧 drain;complete() 零生产消费方(仅自身 no-op 测试) | 改"从未被激活…接口保留为兼容,清理候选已登记" |
| 2 | command-bus.ts complete() TODO 注 | "TODO(M3) 把异步资源跟 cmdId 关联"同源过时 | 改"保留的异步回执接口 — 从未激活(见模块头),现 no-op" |
| 3 | equip-effect.ts runEquipScriptSync docblock | "0x2D/0x29(待 identify)留 follow-up"过时 — 两 case 下方已实现(仙女剑 DualAttack/寿葫芦 563/564) | 改"已实现(见下方 case)" |
| 4 | equip-effect.ts runEquipScript docblock | "runEquipScriptSync 当前是 update 上下文…0x18 走 noop;dispatcher 用 event-system swap handler + 手动管理 wLastUnequippedItem"整套过时 — runEquipScriptSync 0x18 现已真做 swap(cur!==newItem 分支),menu-driver 按 DM23 只写入口值 | 改述现架构(0x18 真做 swap;update 上下文 cur===newItem 自然不 swap;DM23 入口值) |
| 5 | equipment-state.ts removeEquipmentEffect docblock | "ts 简版:DualAttack status 模型未做(留 follow-up),poison level 99 清留 D15 整组做时一并"与函数末 partIdx 3/5 分支(两副作用均已实现)直接矛盾 | 改"两项副作用均已实现(见函数末分支)" |

## 零整改面(3 文件)

- **rng.ts**:mulberry32 与 sdlpal LCG 差异声明 + D29 对拍边界(只对结果不对内部 state)准确。
- **inventory-state.ts**:qty==0→1 真值(global.c:1094)、id 0 哨兵守卫(扬州空宝箱根因)、99 clamp 全锚准确。
- **event-opcode-player.ts**:注释稀疏但全部准确(唯一行内注指向 battle-opcodes 归属正确);家族真值锚在 event-system.ts(owner)与 equipment-state.ts;0x29 毒抗闸与 equip-effect 0x29 语义一致(rand>resist 才上毒)。

## 验证

- body-invariance:三整改文件 printedSha256 一致 → [body-invariance.json](body-invariance.json)
- 定向 10 文件(command-bus/equip-effect×2/equipment-state/event-opcode-player×4/cross-module/dependency-ownership):**51 套件 127/127,0 failed suites** → [directed.json](directed.json)
- `tsc --noEmit -p packages/game`:exit 0;scoped biome 0 诊断;`git diff --check` 干净

## 登记项(交 Codex)

1. `CommandBus.complete(cmdId)` 死接口(零生产消费方,与四死 union op 同族)— 清理候选(批26新增)

## 模块收口

**core/ 全目录收口**(此前 b3/b4/四大文件 + battle + menu + 本批六件 = core 46 文件)。game 包余量:inspect/save → analytics → tools → dev。
```
<!-- incremental-original-source:end -->
