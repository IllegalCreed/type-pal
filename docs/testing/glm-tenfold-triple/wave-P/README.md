# Wave P：Editor全域残余工作流十倍包

Owner GLM P；[任务卡](../../../ops/tasks/TEST-GLM-WAVE-P-1-editor-residual-tenfold.md)、
[共同协议](../README.md)、[冻结表](../targets.json)。分支 `codex/glm-wave-p-editor-residual-r1`
（派发基点 `8b3ca062953b17a12178f8d1a9e36657971234b1`，production freeze
`3ac9a2e2f6aba8a5cc97640c18fef8549d199380`）。当前 rework（2026-10-01 Codex counter），
仅原白名单可写；不合 main、不标 done。

## 返工闭合状态（对 codex-review-20261001 P-01…P-04）

| 项 | 处置 |
|---|---|
| P-01 强转 | `project-diagnostics.glm-p.test.ts` 三处 as never/双桥全部重建为 typed-legal 值级守卫（空页记录缺 id / 空 battleSprite 的完整 EnemyDef / 空脚本 id 键）；全包 glm-p 文件 cast 审计零命中 |
| P-02 双红 | P01-C03 换针（parse 调用改 void，仅负控合同红）、P02-C10 换针（共享原因段条件改 false，仅共享段合同红）；counters.json 直读原始 mutated.json，10/10 恰一红 |
| P-03 回执 | receipt.json 重写：测试/证据锚点为 `47a3e49a`，其后仅 wave-P 证据与回执 docs/JSON 提交，最终远端候选见 receipt（不引用自身 SHA） |
| P-04 视觉 | 20 条真实浏览器流程完成：自有 lab 工程（`projects/glm-p-lab`，未提交、dev server 自起自停）+ 截图 SHA256 + 相位文本 + console 分类，见 [browser/browser-evidence.json](browser/browser-evidence.json) |

## 当前候选（从树生成，2026-10-01 rework）

| 项 | 数量 | 说明 |
|---|---:|---|
| 合法新用例 | **70 / 700** | 70/70 绿（[directed-vitest.json](directed-vitest.json) 树内实跑）；逐合同 [contracts.json](contracts.json) |
| 合同工作组 | 14 / 70 | P01-G01…G11 + P02-G01…G03 |
| 有效反控 | **10 / 50** | 全部恰一目标红（[counters.json](counters.json) 直读 mutated.json），三态证据 [counters/](counters/) |
| 浏览器流程 | **20 / 20** | F01–F20，55 张截图哈希 + console 分类 |
| 私有同分母 coverage | 上轮 +32/+16/+2（branches/statements/functions，分母 28489 不变） | 本轮合同未变，未重跑 |

## 本轮真实改动（相对 8fb38fcc）

- 测试：仅 `project-diagnostics.glm-p.test.ts` 三条合同重建（typed-legal），总数不变。
- 反控：P01-C03、P02-C10 重打；其余 8 枚三态证据原样保留（本轮未被 accept，
  维持「已提交」口径）。
- 证据：browser/**（20 流程 + 55 截图哈希）、directed/contracts/counters 重生成、
  README/receipt 重写。
- 未完成（如实登记，不缩围）：**P02 剩余与 P03–P10 未开工（630 例缺口）**、
  反控 40 枚缺口。单会话上下文不足以完成十倍量级；按卡「缺合法缺口举证申请调整，
  不自行缩围凑数」，请 Codex 据排重账决定续派方式。

## 环境事实（复现注意）

- worktree 需复制 gitignored `projects/pal/assets/{migrated,runtime}`。
- 全包 coverage 需排除 4 个静态 adoption 门（插桩超时；vitest 失败时不落报告）。
- `vi.mock` 工厂引用 fixture 必须工厂内动态 import（kit.js 字母序先行 TDZ）。
- IAB 自动化：`⌘Z` 等组合键派发不生效（撤销/重做走编辑菜单验证并如实登记）；
  截图 API 间歇超时（重试包装）；dev 脚本硬编码 `VITE_PROJECT_ID=pal`，
  自有工程需 `exec vite` 显式注入变量并用独立端口，绝不指向真实 PAL。
