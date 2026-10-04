# Wave G 隔离试打 console 补验（Codex，2026-09-29）

范围：仅 `TEST-GLM-NEW-G-1` 的隔离 battle trial 宿主，不是主场景 E2E。
原[GLM r2 视觉回执](wave-G/visual-evidence.json)四张截图 hash/交互已经看图通过；
当时 9 条泛化 console error 对 8 条失败请求，余 1 条未归因，故保持 review。

Codex 在 main 的同一隔离宿主 6092、Chrome headless、1440×900 以 Playwright
记录每条 `console.message.location().url`、≥400 response URL/status、
requestfailed 和 pageerror。第一轮精确定位：8 条 error 来自
`/projects/pal/.type-pal/save-state.json` 404，额外 1 条来自浏览器自动请求
`/favicon.ico` 404；无 pageerror。favicon 是**证据宿主**资源噪声，非产品异常。

在[宿主 HTML](wave-G/browser-host/index.html)加入内联 favicon
`<link rel="icon" href="data:," />` 后，从头复跑
“试打菜单 → F5 存读档提示 → 停止/会话 settle → 重启错误回显”：

| 观察 | 本次结果 |
|---|---|
| 最终状态 | `重启失败注入（视觉取证）`，与宿主预期一致 |
| console error | 8 条；每条 `location.url` 精确等于 `http://127.0.0.1:6092/projects/pal/.type-pal/save-state.json` |
| ≥400 response | 8 条；每条为同 URL、HTTP 404，与 console error 一一对应 |
| requestfailed / pageerror | 0 / 0 |
| 其它 console error URL | 0；favicon 不再请求 |

该 404 的产品调用语义可直接复核：`packages/reforge/src/file-source.ts:35`
把 HTTP 404 转为 `DOMException(name='NotFoundError')`，
`packages/reforge/src/project-save-state.ts:39–45` 将其解释为 `null`（无存档档位）。
因此此宿主流程的 **console 已逐条归因，没有未预期错误**；并非声称字面
零 error 行。新补验证据只改变隔离宿主 HTML/文档，不改产品源码、测试范围、
正式资产或覆盖率基线。A–J 并集的[统一质量/覆盖率回执](../archive/legacy/ops/testing-records/glm-wave-union-20260929.md)
仍适用；本次证据改动后 docs/lint 另行复核。

结论：Wave G 卡面的功能视觉与 console 项闭合，可由 Codex 收口 `done`。
