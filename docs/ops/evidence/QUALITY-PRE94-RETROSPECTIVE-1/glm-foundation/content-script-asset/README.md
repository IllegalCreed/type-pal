# content-script-asset(script.ts + asset.ts)八维复审批

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 pre-94 foundation 模块 12 批 35(content 包批 6)的八维复审批回执:对象为 packages/content 的 script.ts 与 asset.ts 两大文件,Coding Owner GLM 全文读毕(script 836/asset 938 行),裁定为零整改批(B–H 全维通过,零代码/注释改动,工作树零 diff)。证据原件即下方逐字节保全的固定main源(1433B,SHA eaa000346e7c)。

## 来源与输入

基线 origin/codex/code-quality-3y @ 53db76bbbb(候选线 70+ 提交)。本批零整改依据:script.ts 的 Command 联合每 kind 均带原版 opcode 锚(0x05/0x13/0x46/0x59/0x6E/0x73/0x7E/0x8A/0x9A/0xA1/0xA0 等,含 script.c:3318 boss 判定、returnScript 跳转臂终止论证、nudgeParty layer 缺省清 0 兼容)、SCENE_ENTRY_PREPARE_SAFETY 穷尽表 satisfies Record<Command['kind'],…> typecheck 强制(无第二决策源)、wait 在 prepare 安全的 PAL 行为考证、stages 越界钳末段原版语义;asset.ts 的 pal*AssetId 稳定 id 家族(播放器 0 合法 channel 入身份)、ownedPrefix 按来源强制目录、file closure『未引用资源 bytes/hash 也必须有效』防延迟爆炸论证、LocatedAssetReference origin typed 边表。Codex 当前裁定(2026-10-19)与可复用范围见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 断言与业务 oracle

定向验证 9 套件 54/54、0 failed suites,机器回执 [directed.json](directed.json);`tsc --noEmit -p packages/content` exit 0 且工作树零 diff。54 例真实身份:asset-catalog.contracts 27 例覆盖 A1 路径 fail-loud 且不规范化(NUL/盘符/scheme/反斜杠/上跳段等逐项拒绝)、A2 catalog 单字段反例+origin 前缀门、A3 角色 kind 门与音频要求、A5 引用闭包 severity/code/where 完整断言;asset.test 27 例覆盖 PAL 数字号只在迁移边界确定性映射、静态图 walker 对立绘/对话/物品/存档世界的 typed 资产边、文件缺失/大小/hash 不符独立错误、同一过场资源多次调用原始边表保留命令次数而引用站点只显示一处。绿结果为该时点定向事实,不外推整包收口。

## 结果

零整改批:B–H 八维全过,零代码/注释改动,工作树零 diff;登记项无新增。本页治理层面原文保全完整、链接处置如实,不产生新执行结果。

## 限制与复核

未重跑任何命令/测试;原文『定向 4 文件』口径与回执 testResults 的 2 个测试文件不同轴,未强行调和;opcode 锚与行数为原时点记录未逐个复核;Codex 2026-10-19 裁定本页保留作者阶段证据、未获整包/全维收口验收;历史结论保持原时点。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1433B / SHA-256 eaa000346e7c7742cf07c5bdb0f8dfba9fc9276967c0f8c08b8390a4b1bc4c14；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# content-script-asset(script.ts + asset.ts)八维复审批

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

- 批次:pre-94 foundation 模块 12 批 35(content 包批 6)
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 70+ 提交)
- Coding Owner:GLM;两大文件全文读毕(script 836/asset 938)
- **零整改批**(B–H 全维通过;零代码/注释改动,工作树零 diff)

## 零整改依据(亮点)

- **script.ts**:Command 联合每 kind 均带原版 opcode 锚(0x05/0x13/0x46/0x59/0x6E/0x73/0x7E/0x8A/0x9A/0xA1/0xA0…含 script.c:3318 boss 判定、returnScript 跳转臂终止论证、nudgeParty layer 缺省清 0 兼容);SCENE_ENTRY_PREPARE_SAFETY 穷尽表 satisfies Record<Command['kind'],…> typecheck 强制(无第二决策源);wait 在 prepare 安全的 PAL 行为考证;stages 越界钳末段原版语义。
- **asset.ts**:pal*AssetId 稳定 id 家族(播放器 0 合法 channel 入身份)、ownedPrefix 按来源强制目录、file closure"未引用资源 bytes/hash 也必须有效"防延迟爆炸论证、LocatedAssetReference origin typed 边表。

## 验证

- 定向 4 文件:**9 套件 54/54,0 failed suites** → [directed.json](directed.json)
- `tsc --noEmit -p packages/content`:exit 0;工作树零 diff

## 登记项

无新增。
```
<!-- incremental-original-source:end -->
