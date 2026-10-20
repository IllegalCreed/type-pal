# Wave I 开场菜单 console 补验（Codex，2026-09-29）

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 TEST-GLM-NEW-I-1 开场菜单 console 补验回执（Codex；范围仅最小功能视觉，不进新游戏不走剧情完整 E2E）：原 r2 两张截图与高亮切换已看图通过，唯独浏览器 console 历史未采集——本补验闭合该未证项。

## Scope

- 环境：已集成 main 的 game dev server+E2E=1（仅 Vite HTTP 旁路）、Chrome headless 1440×900、独立 6093；从初始页监听 Playwright console、≥400 response、requestfailed、pageerror；拒绝可选统计、等默认开场演出、Escape 跳过（约 21 秒到 mode=menu/opening 菜单），未点「新的故事」未读正式存档。

## Execution and assertions

- **观察**：菜单初始 selection.cursor=0；点击画布聚焦后 ArrowDown 条件等待 cursor=1 仍 opening；Codex 再次实际看图：黄高亮从「新的故事」移到「旧的回忆」与 GLM 原截图一致；补验截图两枚（SHA 7a4f9dbb…/507a3d51…）存 /tmp/type-pal-glm-new-wave/I/
- **监听结果**：从 page.goto 到 ArrowDown 截图：console error 0、≥400 response 0、requestfailed 0、pageerror 0；同场景同一页面生命周期的 console 证据，不以旧截图或 DOM 无错误横幅代替；两台临时 Vite 服务补验后停止 6092/6093 不再监听

## Results

- 结论：Wave I 卡面最小菜单视觉与 console 项闭合；产品/测试/覆盖率基线未变；A-J 统一集成门仍适用，本纯测试卡可由 Codex 收口 done。

## Evidence

- 证据路径：本补验正文（quote 保全）；截图表在 quote。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| console 补验 | 2026-09-29 | 同场景四类监听全 0+看图 | Wave I console 项闭合→可 done | r2 验收未证项 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy batches/glm-new-waves 的 Wave I console 补验回执；固定来源与 source SHA 见下方保全节。

## 原始结论

同场景 console/400/failed/pageerror 全 0+ArrowDown 高亮看图一致；临时服务清理。

## 当时证据

截图 SHA 表与监听结果在 quote 保全。

## 当前有效性

historical。补验按当时 main。

## 继任文档

当前结论归 A-J 并集集成回执。

## 原文保全

固定源 revision `64bd3b936eb8fdd0943deba5e476d032a30c1830`，source SHA `9a07cc619f5b8eebefed6e89ed7e9694f148edd5ccfab548266e22527a5e9145`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
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
