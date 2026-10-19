# extract events 核心四文件复审（glm-foundation 模块 3 批 1）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

Status: review（候选待 Codex 据证验收）
Owner: GLM；基点 `53db76bbbb5729ba8bc6525bd7ad2ad4bb425c02`（与模块 2 同线，模块 2 三笔尚未被上游集成，本批叠加其上）
范围：`packages/pal-extract/src/events/{opcodes,disasm,recompile,roundtrip}.ts`（311/239/95/58 行）。开工核对：看板/四个已登记 worktree 无 pal-extract 未提交修改；worktree 自有依赖图（离线安装）+ data/raw 逐文件软链（SSS.MKF/M.MSG，只读消费）。

## 短回执

- **改动 2 处（仅注释）**：①opcodes.ts 0x0059 注释——与模块 2 修过的 shared/events.ts 同源的过时"stub/dev panel 直调"表述，改为现行异步 `waiting='scene-load'` 消费现状（锚 game event-system.ts）②disasm.ts 模块头"M1 策略只产 end/goto/showDialog/giveItem"——实际具名产出早已扩到 loadScene/setPalette/setDialogStyle×4，按现行集合更正。
- **验证**：body-invariance 四文件与基点一致（零实现变化）；定向 12 测试文件 **77/77**（0 fail/pending/todo，[directed.json](directed.json)）——含 **roundtrip.test 真实原盘 SSS.MKF+M.MSG 全量字节恒等**（软链只读取证）；scoped biome 18 文件 0/0/0；diff --check 干净。未跑全仓/coverage/protected。

## 八维结论

| 维 | 结论要点 |
|---|---|
| A | opcodeTable 覆盖 0x0000..0xA7+0xFFFF（0x32/0x48/0x72/0x9D 缺口 raw 占位，已注明）；JUMP_TARGET_OPERAND 25 条带 script.c 行锚（含 L29 补的 13 条条件跳转，附 +244 条实测影响记录）；0xA2 随机跳相对目标全收集语义清楚。disasm 两遍扫描：%8 守卫、label 目标=具名 label 字段+raw 跳转 operand+随机跳区间+entryIps、越界目标跳过；loadScene/setPalette 尾操作数"实数据全 0，非 0 即 round-trip 报错"的安全阀设计自洽。recompile 严格对偶+结构化命令 throw。roundtrip 首差定位字段正确（8 对齐取 opcode）。**真实原盘 roundtrip 77/77 内含全量字节恒等**——A 维最强证据。无新直接缺陷。 |
| B | 本批修 2 处（见短回执）。其余锚（script.c 各行号、L29 记录、0x3B-0x3E 与 M2 plan 映射相反的说明）与实现一致，保留。 |
| C | 注册表/反汇编/重编译/校验四层单向依赖（disasm→opcodes，recompile→opcodes，roundtrip→前两者+io），无反向；recompile `_messages` 未用参数有接口对称性说明。 |
| D | 唯一实现；verb↔opcode 双向索引最小编号语义与 end 三态(0/1/2)兼容（recompile 显式映射 advance/reset）。 |
| E | 12 文件 77 例：opcodes 表驱动、disasm 正反例、recompile 边界、roundtrip 真盘全量、slice/annotate 相邻（CODE3/3f 已有判别力核验，本批复用）。 |
| F | 表驱动+两遍扫描结构清楚；emitCommand switch 分发直白。 |
| G | **登记**：`FieldKind`/`OpcodeDef` 仅 opcodes.ts 文件内使用、0 外部消费者（导出收窄候选，Codex 裁定）；RANDOM_JUMP_OPCODE/lookupVerb/lookupOpcode 各有 1 消费者在用。无死代码。 |
| H | 纯字节/确定性；真盘 fixture 经软链可直接跑。 |

## 登记（不动）

- **recompile `labels.get(c.to) ?? 0`**：未知 label 静默写目标 0。round-trip 路径不可能触发（disasm 产出的 label 必存在）；authored 内容域（手写 Command 误拼 label）会静默跳 0——候选行为修复（fail-loud），需 caller 域证据与 Codex 准入，本批不动。
- FieldKind/OpcodeDef 导出收窄候选（同上归 Codex）。

## 复验入口（只读）

```bash
WT=~/.glm-worktrees/pre94-foundation
git -C "$WT" log --oneline 53db76bbb..HEAD -- packages/pal-extract/src/events
node "$WT/docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/prove-body-invariance.mjs" \
  --base 53db76bbbb5729ba8bc6525bd7ad2ad4bb425c02 packages/pal-extract/src/events/opcodes.ts \
  packages/pal-extract/src/events/disasm.ts packages/pal-extract/src/events/recompile.ts packages/pal-extract/src/events/roundtrip.ts
cd "$WT/packages/pal-extract" && ../../node_modules/.bin/vitest run src/events/roundtrip.test.ts src/events/opcodes.test.ts src/events/disasm.test.ts src/events/recompile.test.ts
# 真盘 roundtrip 需 data/raw/{SSS.MKF,M.MSG}（worktree 内为指向主树的只读软链）
```

失效条件：四文件实现变化 → body 证明重出；opcodes 表/跳转表变化 → slice/roundtrip 重跑；script.c 参考变更 → 行锚复核。
