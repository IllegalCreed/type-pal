# Wave I 开场菜单 console 补验（Codex，2026-09-29）

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 testing archive 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision 64bd3b936eb8fdd0943deba5e476d032a30c1830；本轮 R75。此文件属于 testing archive 历史层，不能单独授权当前测试或发布。

## 原始结论

- Wave I 开场菜单 console 补验（Codex，2026-09-29）：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。

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

固定 source revision `64bd3b936eb8fdd0943deba5e476d032a30c1830`，source SHA `9a07cc619f5b8eebefed6e89ed7e9694f148edd5ccfab548266e22527a5e9145`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # Wave I 开场菜单 console 补验（Codex，2026-09-29）
>
> 范围：`TEST-GLM-NEW-I-1` 的开场菜单最小功能视觉，不进入新游戏、
> 不走剧情或完整 E2E。原[GLM r2 回执](wave-I/README.md)两张截图与高亮切换
> 已由 Codex 看图通过，唯独当时浏览器 console 历史未采集。
>
> Codex 在已集成 main 的 game dev server 上用 `E2E=1`（仅 Vite HTTP 旁路）、
> Chrome headless、1440×900、独立 6093 端口，从初始页开始监听 Playwright
> `console`、≥400 response、requestfailed、pageerror。选择“拒绝”可选统计，
> 等待默认开场演出；为避免进入剧情，仅按 Escape 跳过演出，约 21 秒到达
> `window.__tpgs.mode='menu'`、`menuStack.at(-1).kind='opening'`。
> 没有点击“新的故事”或读取正式存档。
>
> 菜单初始 `selection.cursor=0`；点击画布聚焦后按 `ArrowDown`，条件等待
> `selection.cursor=1`，仍为 opening 菜单。Codex 再次实际看图，黄高亮从
> “新的故事”移到“旧的回忆”，与 GLM 两张原截图的可见差异一致。
> 本次本地补验截图仅存 `/tmp/type-pal-glm-new-wave/I/`：
>
> | 文件 | SHA256 | 状态 |
> |---|---|---|
> | `codex-menu-console.png` | `7a4f9dbbcddd01e771eba296c932625952b3ba8c308631811f0d36639edf3d42` | OpeningMenu 初始光标 0 |
> | `codex-menu-after-down.png` | `507a3d511d4e01260e5b5215bf358fc97c8779341df7449b338b8a3b13c60bda` | ArrowDown 后光标 1，已看图 |
>
> 从 `page.goto` 到 ArrowDown 截图，监听结果为：**console error 0、
> ≥400 response 0、requestfailed 0、pageerror 0**。这是同场景、同一页面
> 生命周期的 console 证据，不以旧截图或 DOM 无错误横幅代替。两台临时
> Vite 服务在补验后均已停止，端口 6092/6093 不再监听。
>
> 结论：Wave I 卡面的最小菜单视觉与 console 项闭合；产品/测试/覆盖率
> 基线均未因本补验更改。A–J 的[统一集成门](../../ops/testing-records/glm-wave-union-20260929.md)
> 仍适用，本纯测试卡可由 Codex 收口 `done`。
>
<!-- original-source-quote:end -->
