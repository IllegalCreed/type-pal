# V0 视觉小样（视觉通路证明）

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 testing archive 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision 5cd599bd28c6aaa67d61e00479bb5379099b9157；本轮 R73。此文件属于 testing archive 历史层，不能单独授权当前测试或发布。

## 原始结论

- V0 视觉小样（视觉通路证明）：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。

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

固定 source revision `5cd599bd28c6aaa67d61e00479bb5379099b9157`，source SHA `d6a8095f1afa8afac4bed0cb25fca236f1aba040d1ab6e5fccd133b509029d56`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # V0 视觉小样（视觉通路证明）
>
> 日期：2026-09-25。任务：[ARCH-SUPPORT-GLM-1](../../../../../ops/archive/tasks/done/ARCH-SUPPORT-GLM-1-eight-audit-packages.md)。
> 起点 SHA：`3270473862d1e1574f266b70b65de89ca8b65352`（生产文件与冻结 b11d4bc9 零 diff，已核
> `git diff b11d4bc9..32704738 -- packages/ scripts/` 为空）。
>
> ## 环境记录
>
> | 项 | 值 |
> |---|---|
> | worktree | `/Users/zhangxu/illegal/type-pal-glm-architecture`（独立分支 `codex/glm-architecture-support-r1`，未在 main 目录切分支） |
> | Node / pnpm | v22.19.0 / 10.29.2 |
> | 浏览器工具 | ZCode In-app Browser（iab，实际看到了截图画面——本席具备视觉，非 JS-only） |
> | dev 服务 | editor：`cd packages/editor && VITE_PROJECT_ID=pal npx vite --port 6013 --strictPort`（包内独立实例；未触碰 6010/6051） |
> | viewport / DPR | 1440×1024 CSS px（setViewportSize）；截图为 CSS px 尺寸 PNG |
> | 安装 | `pnpm install --frozen-lockfile` exit 0（冻结 lockfile） |
>
> ## 操作链（真实操作 → 截图 → 结论）
>
> 1. `browser.tabs.new()` → `goto http://localhost:6013/` → domSnapshot 显示"载入项目…"；
>    约 2s 后页面就绪（URL 自动带 `?module=scene&page=workspace`，标题"仙剑奇侠传·复刻 · type-pal 编辑器"）。
> 2. **截图 1**（初始场景工作区）：`/tmp/glm-arch-visual/sample-01-scene-workspace.png`
>    （SHA256 `95f64439bffa326ea833ffd1a9e5c708d2ece870fae91c3cd7eb7a86f43b3417`，1440×1024）。
>    可见：左侧场景列表（294 个）+ 落点/实体分组、中部画布、右侧场景属性 Inspector、顶部菜单/工具栏、
>    底部状态条"⚠ 182 项待处理"。
> 3. **实际交互**：点击右侧详情区 `tab "引用 1"`（首测用 `/引用/` 正则超时失败一次——快照显示 tab 文本
>    实为"引用 1"带计数 span；换 `getByRole("tab").filter({hasText:"引用"})` 成功。**该定位差异本身
>    已按纪律如实记录，未反复重试同一 locator**）。
> 4. **截图 2**（引用页）：`/tmp/glm-arch-visual/sample-02-scene-refs-tab.png`
>    （SHA256 `51541e6faa99d4bd1ddb9fbf97ae8e0494e7a20a80d92cb6855296a877134e9a`）。
>    可见：tab 切换成功（引用高亮），显示"阻断删除 1 处 / 1 处引用会阻断删除 / 外部引用 入口 新的故事
>    manifest.entryPoints.new-game.scene + 打开按钮"。
>
> ## 小样结论
>
> - **视觉通路成立**：真实页面操作（tab 切换）→ 截图 → 画面判读全链路可复现；后续 V1/V2 按同链路执行。
> - **环境发现（非产品缺陷）**：画布中央显示 `场景渲染失败: tileset AssetId "tileset.pal.020": bytes 登记
>   1437，实际 917`——与本 worktree 缺 gitignored 资源/只读接入不完整的预期一致（工作包 README 开工节
>   已预告"新 worktree 缺 gitignored 资源只记环境问题"）。V1/V2 的布局判定不依赖该 tileset 画面，
>   涉及画布内容的判定会先排除此环境因素再下结论。
> - 交互纪律：locator 超时后重建（未重试同 locator）、一次操作一观察、截图前不做无谓 snapshot+screenshot 叠加。
>
> ## 截图清单
>
> | 文件（/tmp/glm-arch-visual/，不入 Git） | SHA256（前 16） | viewport | 步骤 |
> |---|---|---|---|
> | sample-01-scene-workspace.png | 95f64439bffa326e | 1440×1024 | 初始加载完成后的场景工作区 |
> | sample-02-scene-refs-tab.png | 51541e6faa99d4bd | 1440×1024 | 点击"引用 1"tab 切换后 |
>
<!-- original-source-quote:end -->
