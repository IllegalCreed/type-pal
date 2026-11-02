# extract io/word + utils/gbk 复审（glm-foundation 模块 3 批 2）

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: audit-report-v1 / 1.0.0

## 审计问题

本页审计主题:pal-extract 的 io/word.ts(109 行)、utils/gbk.ts(98 行)复审;基点 53db76bbbb5729ba8bc6525bd7ad2ad4bb425c02 线(叠加批 1 之上)。原文 Status: review(候选待 Codex 据证验收)。Codex 当前裁定(2026-10-19):本页保留作者阶段证据,未获整包/全维收口验收;可复用范围与逐文件依据见 [codex-stage2-rework.json](../codex-stage2-rework.json)。

## 范围与证据

改动 1 处仅注释。验证证据:body-invariance [body-invariance.json](body-invariance.json) 两文件一致;定向 4 文件 14/14 断言(word/word.boundaries/gbk+msg 相邻)——但回执 success=false:word.test.ts 套件因缺 WORD.DAT 未加载(0 断言);scoped biome 0/0/0;diff --check 干净。未跑全仓门。

## 发现

整改:word.ts 模块头『(1998 Win9x 版)(WIN95)』重复括注(编辑残留)改为『(1998 Win9x 版,即 sdlpal fIsWIN95 分支)』;gbk.ts 零改动。八维要点:word.ts 段偏移/数量全部带实测锚(565×10B=5650B),flat[i]↔PAL_GetWord(i) 直对,尾部空格剥除+stripTrailingOne(L28,text.c:785-786)语义正确;gbk.ts 0x00 截断、PUA 快速路径、整条 BIG5 精确匹配、未知 PUA→空白(对齐 sdlpal 缺字行为)——46 处残留逐字核验+用户逐条确认的既有证据有效。登记(不动):word.ts readBlock 短输入静默空串(短于 551×10B 输入越界段返回 ''而非报错,与 flat 循环 break 不一致;真实 WORD.DAT 固定 5650B 无触发域,候选 fail-loud 归 O-2 族);Words.scenes 字段名误导(内容是『毒素/特殊文字』[551..564]与场景无关,改名属公共类型变化待 Codex)。

## 结论

注释整改批(1 处);断言级 14/14 绿,但套件级 word.test.ts 未加载。Codex 2026-10-19 勘误与接管:旧『14/14、0 fail』仅指已收集断言,原『0 fail』与 flat 原盘执行信用撤回;Codex 已只读连接原盘并补跑 word 8/8(stdout/stderr/native/input/source 身份见返工记录);原失败 JSON 保持。

## 整改与复核

整改即上述 1 处注释。当前续片以 [codex-stage3-word.json](../codex-stage3-word.json) 为准:原漏跑 word 已补,之后实际结构/测试整改另存原件;20 独立合同、五文件 review,不将原 14/14 或包级摘要当逐文件验收。复验入口(原页给出,此处概述):git log 53db76bbb..HEAD 对两文件;prove-body-invariance.mjs --base 53db76bb…;定向跑 word/word.boundaries/gbk 三测试。失效条件:两文件实现变化→重证;WORD.DAT 实测布局变化→段表复核。本轮治理未重跑任何命令;候选待 Owner 接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3780B / SHA-256 5e665505469b5be2dd03eb6bda7a807e491518a7d01b898d382989813287df45；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
````markdown
# extract io/word + utils/gbk 复审（glm-foundation 模块 3 批 2）

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

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


## Codex当前勘误与接管（2026-10-19）

旧14/14仅指已收集的断言，success=false且word.test.ts因WORD.DAT缺失未加载，原“0 fail”与flat原盘执行信用撤回。Codex已只读连接原盘并补跑word8/8，stdout/stderr/native/input/source身份见当前返工记录；原失败JSON保持。 [当前返工与限制](../codex-stage2-rework.json)。

当前续片以[Codex五文件返工](../codex-stage3-word.json)为准：原漏跑word已补，之后实际结构/测试整改另存原件；20独立合同、五文件review，不将原14/14或包级摘要当逐文件验收。
````
<!-- incremental-original-source:end -->
