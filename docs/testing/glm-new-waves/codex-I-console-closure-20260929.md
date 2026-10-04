# Wave I 开场菜单 console 补验（Codex，2026-09-29）

范围：`TEST-GLM-NEW-I-1` 的开场菜单最小功能视觉，不进入新游戏、
不走剧情或完整 E2E。原[GLM r2 回执](wave-I/README.md)两张截图与高亮切换
已由 Codex 看图通过，唯独当时浏览器 console 历史未采集。

Codex 在已集成 main 的 game dev server 上用 `E2E=1`（仅 Vite HTTP 旁路）、
Chrome headless、1440×900、独立 6093 端口，从初始页开始监听 Playwright
`console`、≥400 response、requestfailed、pageerror。选择“拒绝”可选统计，
等待默认开场演出；为避免进入剧情，仅按 Escape 跳过演出，约 21 秒到达
`window.__tpgs.mode='menu'`、`menuStack.at(-1).kind='opening'`。
没有点击“新的故事”或读取正式存档。

菜单初始 `selection.cursor=0`；点击画布聚焦后按 `ArrowDown`，条件等待
`selection.cursor=1`，仍为 opening 菜单。Codex 再次实际看图，黄高亮从
“新的故事”移到“旧的回忆”，与 GLM 两张原截图的可见差异一致。
本次本地补验截图仅存 `/tmp/type-pal-glm-new-wave/I/`：

| 文件 | SHA256 | 状态 |
|---|---|---|
| `codex-menu-console.png` | `7a4f9dbbcddd01e771eba296c932625952b3ba8c308631811f0d36639edf3d42` | OpeningMenu 初始光标 0 |
| `codex-menu-after-down.png` | `507a3d511d4e01260e5b5215bf358fc97c8779341df7449b338b8a3b13c60bda` | ArrowDown 后光标 1，已看图 |

从 `page.goto` 到 ArrowDown 截图，监听结果为：**console error 0、
≥400 response 0、requestfailed 0、pageerror 0**。这是同场景、同一页面
生命周期的 console 证据，不以旧截图或 DOM 无错误横幅代替。两台临时
Vite 服务在补验后均已停止，端口 6092/6093 不再监听。

结论：Wave I 卡面的最小菜单视觉与 console 项闭合；产品/测试/覆盖率
基线均未因本补验更改。A–J 的[统一集成门](../archive/legacy/ops/testing-records/glm-wave-union-20260929.md)
仍适用，本纯测试卡可由 Codex 收口 `done`。
