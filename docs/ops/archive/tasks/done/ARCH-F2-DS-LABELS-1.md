# ARCH-F2-DS-LABELS-1 — DsTag / DsReadonlyValue 窄拆

Status: done
Phase: phase2 editor / 架构治理 F2
Coding Owner: Cursor
Review / Integration Owner: Codex
Branch: `codex/cursor-arch-ds-labels-r1`（独立 worktree）
Base / production freeze: `95af9ed5`（开工先同步并记录实际 main SHA）

`controls.tsx:112-148` 的 `DsTag`、`DsReadonlyValue` 是两块相对独立的展示组件，只共用本文件的 `classes` 拼接。Grok 的同文件 `ARCH-F2-DS-OVERFLOW-1` 和 Cursor 的 `CURSOR-WAVE-2-1` 均已由 Codex 接收并 done，两个前置依赖齐。Codex 在 `95af9ed5` 直接核 `controls.test.tsx:806-807` 的 Tag 正控、`recipes.test.tsx:87` 的使用者、`boundary.test.ts:2024` 的静态门、`primitives.css:43-60,128-158` 的只读值/tag class，以及旧 `design-system/index.ts` 出口；本批仅整理实现归属。**before → after = 同样 DOM、class、语义、属性透传与旧导出，只换组件所在文件。** 若需要回引 `controls` 造成 runtime 环、改变 CSS/焦点/布局或发现真实调用者不止这两块，先停线报告，不硬拆。

## 白名单与验收

- 可改 `packages/editor/src/ui/design-system/controls.tsx` 的 `DsTagTone`、`DsTag`、`DsReadonlyValue` 定义；新建 `status-values.tsx` 承接三者，在 `controls.tsx` 直接 re-export **同一函数/类型**。`index.ts` 和既有消费导入路径不改；`status-values.tsx` 可局部等价实现 `classes`，不得从新文件 runtime import `controls`。
- 必要时只改 `controls.test.tsx`、`recipes.test.tsx`、`boundary.test.ts` 以补旧路径/根路径/新模块 identity 与默认/neutral/warning/danger tone、monospace、span/div、透传属性的非空业务断言；不得删除旧断言或弱化静态门。可新增 `docs/testing/cursor-arch-ds-labels.md` 回执及测试索引一行。**不改 CSS、其它控件、产品业务组件、schema/save/资源/覆盖基线。**
- 先记录既有测试名和旧组件/根出口 DOM/SSR，拆后跑 `controls.test.tsx`、`recipes.test.tsx`、`boundary.test.ts` 与 editor typecheck、改动文件 Biome、check:docs/diff。至少一条隔离单点**生产模块加载变异**应使新增 tone/class/element 断言业务红；不接受测试内仿写逻辑再抓自己的 AssertionError。临时证据放唯一目录，默认清理，源 hash 不变。无需每小例跑全仓覆盖；Codex 接收后统一 check→ratchet→单次严格 fast，并做最小隔离 UI 对照。

Cursor 自验不是独立证明，只在隔离分支提交推送，不合 main、不标 done。Grok 原卡已关闭，其 `DsOverflowText` 文件/行为和 `text-overflow-adoption.json` 本批只读。发现旧 UI 设计问题另列，不夹带改样式。

## 阶段门与交接

Codex：**premise verified / build allowed**，仅本卡白名单；新用户分工允许 Cursor 做低风险结构切片，Codex 独立验收与集成，固定三签暂停。done 未开放。

## Codex 独立接收与 done 准入（2026-09-26）

- **accept / done，仅两个展示组件窄拆**。Cursor 候选 `9593b06f` 的源、旧导出、138 定向测试、独立 Vite 单点负控与隔离 Design Lab 已由 Codex 直接核验；[完整记录](../../../../testing/cursor-arch-ds-labels-review.md)。Grok `DsOverflowText` 与其它控件未重开。
- main 接入 `27f61a4e`，Codex 另补两条 text-overflow adoption owner 登记；根 check、ratchet、单次严格 fast 均 exit0，8,122/643、分支分母不缩。ratchet 首次遇到未改 game 资源子进程 SIGABRT，日志、隔离绿与原范围复跑一并在回执披露，不以多数通过掩盖。
- 本卡最初“done 未开放”与 Cursor 提示词仅为历史状态。当前 Codex 独立验收模式下准入已齐；整批 F2 尚未完成。无下一位 Cursor 返工提示词。

### 下一位 Cursor 提示词

```text
在 /Users/zhangxu/illegal/type-pal 接手 ARCH-F2-DS-LABELS-1。先读 AGENTS.md、CLAUDE.md、
docs/phase2/READ-FIRST.md、本卡及最新 controls.tsx:112-148、controls/recipes/boundary 测试、
primitives.css 的 tag/readonly 样式。从最新 origin/main 建独立 worktree、
分支 codex/cursor-arch-ds-labels-r1。只把 DsTagTone、DsTag、DsReadonlyValue 移到
status-values.tsx，并从 controls.tsx 维持旧出口，禁止新文件 runtime 回引 controls。
DOM/class/ARIA/默认与各 tone/monospace/span-div 及根出口同一函数必须保真；按卡面白名单
补真实断言与隔离生产模块单点负控，跑定向、editor typecheck、Biome、docs/diff。
提交推送候选 SHA 和前后证据；不合 main、不标 done、不跑官方覆盖率。Codex独立复核。
```
