# CODE-QUALITY-3f - pal-extract symbols 输入合同

Status: done
Phase: phase1 pal-extract
Capability: ops / code-quality
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex（独立验收）
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Contributor: Codex
Branch: codex/code-quality-governance
Base: `5e1213f60`

## 目标与范围

为可选 `data/symbols.json` 建立 fail-loud 的纯结构校验，避免 CLI 把任意 JSON 强制 cast 成 `Symbols` 后在注释阶段深处崩溃；合法 symbols 和无文件 `{}` 行为保持。

- 范围内：`packages/pal-extract/src/events/annotate.ts`、CLI 读取入口与专属边界测试、任务账本。
- 范围外：事件数字 ID/opcode、WORD fallback、生成物、原始数据、运行时/UI。

## 前提真值门

- Primary/第一阶段：`docs/phase1/05-events-schema.md:134-136` 明确 symbols 可选、只为 `_` 人读注释；`annotate.ts:9-87` 是当前类型和消费者；`cli.ts:204-206` 是无验证 JSON cast。
- before → after：`任意 JSON cast 成 Symbols -> 入口只接受对象及可选 Record<string,string>，坏输入带路径显式失败`
- 反证：合法 `{}`、合法 item/spell/person/enemy/scene map 的 annotate 输出改变即 rework；不修改数字命令。
- 二阶段：N/A，仅第一阶段提取器输入边界。

## 上下文锚点

- `CLAUDE.md:31-38`：提取器上游边界、生成物禁止单点改。
- `packages/pal-extract/src/events/annotate.ts`、`cli.ts`：生产 caller。
- 不得重新引入：`as Symbols` 绕过验证、未知字段静默吞掉、把 symbols 名字写成事件真值。

## 验收条件

- 功能：缺失文件仍 `{}`；合法映射保真；null/数组/非字符串 map value/未知字段显式失败。
- 测试：symbols parser/annotate 定向、pal-extract 全包、全仓 check、support-mode ratchet、protected fast、lint。
- 视觉/E2E：N/A。

## 当前模式推进记录

- Codex 前提核验：verified；build allowed；白名单只含 annotate/CLI 入口与专属测试/文档。
- 独立验收：accept；定向/包级、全仓 check、support-mode ratchet、protected fast、lint 均通过，事件数字真值与生成物边界不变。

## 交接日志

- 2026-10-05 Codex：CLI 对可选 symbols JSON 直接 cast，primary 文档确认它只是可选人读注释；开卡实现最小结构合同。Next: 先补 parser 反例与合法映射回归。
- 2026-10-05 Codex：新增 `parseSymbols` 结构验证并接入 CLI；annotate 定向 17/17、pal-extract 69/421、typecheck 通过。Next: 跑全仓 check/ratchet/protected/lint。
- 2026-10-05 Codex：全仓 check、support-mode ratchet、protected fast、lint 通过；symbols 合同闭合，归档 done。Next: 继续逐文件 CLI/game/content/migrate 治理。

## 下一位 Agent 提示词

无；本批由 Codex 继续实现与独立验收。
