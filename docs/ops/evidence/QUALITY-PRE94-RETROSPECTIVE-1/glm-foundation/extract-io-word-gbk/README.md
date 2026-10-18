# extract io/word + utils/gbk 复审（glm-foundation 模块 3 批 2）

Status: review（候选待 Codex 据证验收）
Owner: GLM；基点 `53db76bbbb5729ba8bc6525bd7ad2ad4bb425c02` 线（叠加批 1 之上）
范围：`packages/pal-extract/src/io/word.ts`（109 行）、`utils/gbk.ts`（98 行）。开工核对无 Owner 冲突。

## 短回执

- **改动 1 处（仅注释）**：word.ts 模块头"(1998 Win9x 版)(WIN95)"重复括注（编辑残留）改为"(1998 Win9x 版,即 sdlpal fIsWIN95 分支)"。gbk.ts 零改动。
- **验证**：body-invariance 两文件一致（[body-invariance.json](body-invariance.json)）；定向 4 文件 **14/14**（word/word.boundaries/gbk + msg 相邻，0 fail/pending）；scoped biome 0/0/0；diff --check 干净。未跑全仓门。

## 八维结论

| 维 | 结论要点 |
|---|---|
| A | word.ts：段偏移/数量全部带实测锚（565×10B=5650B），flat[i]↔PAL_GetWord(i) 直对；尾部空格剥除+stripTrailingOne(L28,text.c:785-786)语义正确。gbk.ts：0x00 截断、PUA 快速路径、整条 BIG5 精确匹配、未知 PUA→空白（对齐 sdlpal 缺字行为）——46 处残留逐字核验+用户逐条确认的既有证据有效。无新直接缺陷。 |
| B | 修 1 处（重复括注）。gbk.ts 的三类残留考证注释（AE/AF/FE 造字区/A140-A14A 标点/整条 BIG5）与 BIG5 重解注释是本文件核心知识，保留。 |
| C/D | word→gbk 单向依赖；decodeGbk/fixupTranscodeResidue 双出口各有消费方（word/msg + 测试）。 |
| E | word 14 例内：段切片 oracle、flat 真盘、boundaries 越界（3b 期补强复用）；gbk 73 行测试含 PUA/整条/未知路径。 |
| F/G/H | 常量表驱动清楚；无死导出；纯字节确定性 ✓。 |

## 登记（不动）

- **word.ts readBlock 短输入静默空串**：短于 551×10B 的输入，越界段返回 ''（subarray 空）而非报错——与 flat 循环的 `break`（截断即止）不一致。真实 WORD.DAT 固定 5650B，无触发域；候选 fail-loud 改善，归错误合同候选族（同 O-2 类），Codex 裁定。
- **`Words.scenes` 字段名误导**：内容是"毒素/特殊文字"[551..564]，与"场景"无关（头注已自嘲"对应接口中的 scenes 字段"）。改名属公共类型变化，登记待 Codex。

## 复验入口（只读）

```bash
WT=~/.glm-worktrees/pre94-foundation
git -C "$WT" log --oneline 53db76bbb..HEAD -- packages/pal-extract/src/io/word.ts packages/pal-extract/src/utils/gbk.ts
node "$WT/docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation/prove-body-invariance.mjs" \
  --base 53db76bbbb5729ba8bc6525bd7ad2ad4bb425c02 packages/pal-extract/src/io/word.ts packages/pal-extract/src/utils/gbk.ts
cd "$WT/packages/pal-extract" && ../../node_modules/.bin/vitest run src/io/word.test.ts src/io/word.boundaries.test.ts src/utils/gbk.test.ts
```

失效条件：两文件实现变化 → 重证；WORD.DAT 实测布局变化 → 段表复核。
