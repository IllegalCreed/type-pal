# content-authorcore(author-script-core.ts)八维复审批

> Codex当前裁定（2026-10-19）：本页保留作者阶段证据，未获整包/全维收口验收；可复用范围、逐文件依据与未知项见[当前返工记录](../codex-stage2-rework.json)。

- 批次:pre-94 foundation 模块 12 批 37(content 包批 8)
- 基线:origin/codex/code-quality-3y @ 53db76bbbb(候选线 72+ 提交)
- Coding Owner:GLM;全文读毕(1348 行)
- **零整改批**(B–H 全维通过;零代码/注释改动,工作树零 diff)

## 零整改依据(亮点)

- AUTHOR_COMMAND_KIND_TABLE 组合式词表(RETAINED 来自 runtime PREPARE_SAFETY 全量 + 7 retired 显式 false + 11 author-only)双 satisfies 编译期防漂移;"Canonical author command vocabulary"边界注准确。
- 词法循环纪律:loopAncestors 只在同根收集(breakLoop 需 loopDepth>0/continueLoop 需词法祖先且点名必命中)、prepare 禁循环、同根重复循环 id 全树预收集 fail-loud。
- 裸实体 id 禁令三处一致('entity' in command 拒收 → EntityAddress 强制);callScript 只存稳定 script id 拒 ref。
- checkAutoScriptContinuation:digest SHA-256 小写、frames 1..256、七类控制帧穷尽、completed 不能有续跑帧。
- SAVE12 WorldScriptState guard:"静态 inherit 不落盘;cursor 始终携带所属 behavior/hook 避免换槽串位"持久层设计声明。

## 验证

- 定向 2 文件:**suites 0 failed** → [directed.json](directed.json)
- `tsc --noEmit -p packages/content`:exit 0;工作树零 diff

## 登记项

无新增。
