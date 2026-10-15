# QUALITY-EDITOR-DIAGNOSTICS-3 — C02 导入、迟到操作者与历史回流

Status: build
Owner: Codex
Reviewer: Codex（作者自验与独立验收分开）
Phase: phase2
Capability: editor test lifecycle correctness
Visual Verification Timing: N/A（纯测试，不改产品）

## 准入与独占范围

上一goal轮是progress：三次提交推送与完整门原件已落盘；不是停止或等待中的进程。本轮从最新origin/main=f98d0ddd8核对，治理分支2eb5b1401为0behind/33ahead，工作树干净，主工作树只读。
机器3284/229closed/51review/3004pending。用户要求继续修妥94、95、97–102全部已发现问题，默认单Agent，Codex单一Coding Owner。

仅四份测试源码：

- `packages/editor/src/__tests__/cursor-asset-r1/battle-sprite-ui.ts`
- `packages/editor/src/ui/BattleSpriteLibrary.c02-g01.cursor-r1.test.tsx`
- `packages/editor/src/ui/BattleSpriteLibrary.c02-g02.cursor-r1.test.tsx`
- `packages/editor/src/ui/BattleSpriteLibrary.c02-g05.cursor-r1.test.tsx`

UI助手本轮全文重读；三测试及Uploader等上一轮全文读取的当前SHA逐一相同，复用[直接读取记录](../evidence/QUALITY-EDITOR-DIAGNOSTICS-2/next-read-boundaries.json)，不是以包绿代替读文件。
真实生产Library/InlinePreview/reader/cache/session/commands、typed fixture与硬件端口全文或调用段边界见上卡证据，本轮重核Uploader及Library异步提交段。
不改宿主实现、产品/公共API/schema/save/资产管线或生成物；不接管其它活跃任务。

## 真值与可证伪观察

| 方向 | 直接证据 |
|---|---|
| Primary | React官方[act](https://react.dev/reference/react/act)：等待触发更新的实际异步工作；不关闭检查。 |
| 第一阶段 | N/A，二阶段编辑器测试调度；无游戏机制或UI形态改变。 |
| 第二阶段 | Uploader pickFile实际await createImageBitmap后setRgba；apply先gzip再await onApply。Library:614-674异步新增用途，:732-783替换源，:792-863 raw提交/notice/finally；session订阅同步通知React。 |
| 目标 | 图片只等待真实硬件端口Promise；提交/失败只等待真实session或新notice；历史操作进入act并等实际预览；pending窗口用真实reader IO闸门证输入与解除。 |

最强替代解释：535条可能来自其它预览生命周期而非图片/提交。先只修图片等待做消融，再分别实测提交与外部历史；保留完整30例，未清零前不精简。
若等待真实bitmap不改变对应告警，撤回该归因；若闸门期间没有生产read，或mutant不能让指定断言红，不能称已验证。
未知跨文件重复不删；G01-02/03缩帧草稿可能重叠，需逐合同核验与oracle转移证据后才决定。
Codex：premise verified / design agree，build allowed，仅上述四文件。

## 验收与交接

先保留基线30例原件；逐文件核caller/oracle、合法输入、反例、隔离和重复。定向/相邻/typecheck后分批提交推送，稳定C02模块窗口集中跑全部门。
若精简成立，只另增精确退役metadata及固定账本数量支持，不修改判据/规则；baseline只由官方工具生成。
全仓未零诊断不合main，不把局部0诊断或全绿变为文件关闭。
证据见[本片](../evidence/QUALITY-EDITOR-DIAGNOSTICS-3/README.md)。无下一位Agent提示词，由Codex继续。

## 实测准入修订与生命周期检查点

bitmap-only 30/30、535条act，未降低告警；撤回图片主因解释与额外observer实现。
当前实际方案只等待真实提交/新raw notice及真实历史回流：535→23，余23均为G01 act外dispatch/undo；修后30/30、0诊断。
图片仍走既有真实硬件端口，不改IO或产品；raw helper返回当次DOM结果，旧waitRawMessage只有G01/G05 caller，已整体替换并移除，无生产出口变化。
新的premise verified / design agree，build allowed：当前四文件范围不变；下面继续pending窗口/强转/精简核验，0关闭，不冒称独立accept。

本检查点原30例与相邻78例均完整0skip/0诊断；editor typecheck/docs/lint0/0/0、ledger通过。3284/229closed/54review/3001pending，0关闭。继续精度提交后统一全门，不以当前结果替代逐文件验收。
