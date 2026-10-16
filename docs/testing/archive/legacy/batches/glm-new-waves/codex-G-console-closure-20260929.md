# Wave G 隔离试打 console 补验（Codex，2026-09-29）

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 testing archive 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision 64bd3b936eb8fdd0943deba5e476d032a30c1830；本轮 R75。此文件属于 testing archive 历史层，不能单独授权当前测试或发布。

## 原始结论

- Wave G 隔离试打 console 补验（Codex，2026-09-29）：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。

## 当时证据

- 原始命令、输入、caller/oracle、结果、机器字段、SHA、counter、链接和未执行项保留于 quote。

## 当前有效性

historical。历史测试结论必须带日期和 source revision，并由当前 catalog、contract、fresh receipt 重新核定。

## 继任文档

- 当前入口：对应 testing catalog/domain report、contract、paired evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、真实 caller/oracle、排重、独立 review 和静态零诊断。

## 停止线

- 本页不证明 runtime、E2E、视觉、coverage 或当前产品行为；不得以 archive wrapper 替代执行回执。

## 原文保全

固定 source revision `64bd3b936eb8fdd0943deba5e476d032a30c1830`，source SHA `f94d698d4256b1764454ec2a00ea31b0a4995eb59705fc4e071ad365478b19e2`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # Wave G 隔离试打 console 补验（Codex，2026-09-29）
>
> 范围：仅 `TEST-GLM-NEW-G-1` 的隔离 battle trial 宿主，不是主场景 E2E。
> 原[GLM r2 视觉回执](wave-G/visual-evidence.json)四张截图 hash/交互已经看图通过；
> 当时 9 条泛化 console error 对 8 条失败请求，余 1 条未归因，故保持 review。
>
> Codex 在 main 的同一隔离宿主 6092、Chrome headless、1440×900 以 Playwright
> 记录每条 `console.message.location().url`、≥400 response URL/status、
> requestfailed 和 pageerror。第一轮精确定位：8 条 error 来自
> `/projects/pal/.type-pal/save-state.json` 404，额外 1 条来自浏览器自动请求
> `/favicon.ico` 404；无 pageerror。favicon 是**证据宿主**资源噪声，非产品异常。
>
> 在[宿主 HTML](wave-G/browser-host/index.html)加入内联 favicon
> `<link rel="icon" href="data:," />` 后，从头复跑
> “试打菜单 → F5 存读档提示 → 停止/会话 settle → 重启错误回显”：
>
> | 观察 | 本次结果 |
> |---|---|
> | 最终状态 | `重启失败注入（视觉取证）`，与宿主预期一致 |
> | console error | 8 条；每条 `location.url` 精确等于 `http://127.0.0.1:6092/projects/pal/.type-pal/save-state.json` |
> | ≥400 response | 8 条；每条为同 URL、HTTP 404，与 console error 一一对应 |
> | requestfailed / pageerror | 0 / 0 |
> | 其它 console error URL | 0；favicon 不再请求 |
>
> 该 404 的产品调用语义可直接复核：`packages/reforge/src/file-source.ts:35`
> 把 HTTP 404 转为 `DOMException(name='NotFoundError')`，
> `packages/reforge/src/project-save-state.ts:39–45` 将其解释为 `null`（无存档档位）。
> 因此此宿主流程的 **console 已逐条归因，没有未预期错误**；并非声称字面
> 零 error 行。新补验证据只改变隔离宿主 HTML/文档，不改产品源码、测试范围、
> 正式资产或覆盖率基线。A–J 并集的[统一质量/覆盖率回执](../../ops/testing-records/glm-wave-union-20260929.md)
> 仍适用；本次证据改动后 docs/lint 另行复核。
>
> 结论：Wave G 卡面的功能视觉与 console 项闭合，可由 Codex 收口 `done`。
>
<!-- original-source-quote:end -->
