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
