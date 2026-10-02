# Kimi 短审报告：标题读档 IO 拒绝的承接与资源归属

- 子卡：`docs/ops/tasks/AUDIT-KIMI-OPENING-LOAD-SMALL-1.md`（在审核树 glm-lmn-acceptance，固定源未含，按卡不复制）；母卡 REFORGE-OPENING-LOAD-ERROR-1（仍 draft，本报告不构成其产品准入）。
- 固定源：`849255a49ca795dae9259c3f12a44a2714e39e53`（content21/SAVE10，2026-10-02 直读）。
- 范围：`reforge/src/opening-menu.ts`、`save/store.ts`、`save/browser-state.ts`、`main.ts` 相关片段；补读 4 份直接证据（见末节）。
- 结论：**premise verified**。母卡工程前提在固定源逐行成立，且新旧行号漂移已核（旧证据 `:113-121/:138` 即现 `:122-131/:147`，差异仅 cleanup 新增退场黑底 `:110-118`）。

## 1. 三个 await 的拒绝由谁承接：无人承接

- `opening-menu.ts:123` `await saveStore.listMeta()`、`:126` `await saveStore.getThumb(...)`、`:127` `await createImageBitmap(blob)` 全部在 `enterLoad`（`:122-131`）内，全文件无 try/catch、无 `.catch`、无 `close()`（grep 全文件核）。
- 唯一调用点 `:147` `void enterLoad()`：拒绝沿 void 逃逸为 unhandled rejection。外层 `new Promise`（`:98`）执行器只有 `resolve`（`:150/:166`），**没有 reject，永远无法感知 enterLoad 失败**；`runOpeningMenuWithMusic`（`:67-79`）的 try/finally 只覆盖 `run()` 结算；`main.ts:508` 的 `await` 因此什么也接不到。reforge/src 全域无 `unhandledrejection` 监听（grep 核）。
- Store 侧拒绝真实存在：`store.ts:122`（get/getThumb/getPayload）、`:132`（listMeta）`req.onerror → reject(req.error)`；`:80` open 也可 reject，且 `:71` 缓存 `dbPromise`——open 失败后所有后续读永久拒绝（影响重试语义，见末节 Q2）。接口 `store.ts:11-14` 无"读永不拒绝"承诺。
- 失败后现场：phase 停留 `'menu'`、`browser` 仍 closed、rAF/键盘照常（`:210/:212`），用户零可见信号；getThumb/createImageBitmap 中途拒绝时 thumbs 已部分填充（`:124` clear 之后）。
- 对照先例：局内同构三联 await `refreshSaveMetas`（`main.ts:4625-4640`）的调用方有 `.catch` 降级为 warn（`main.ts:5479-5481`）。标题菜单是唯一的裸露路径。

## 2. 最强反证核查（逐一排除）

(a) 入口已有 catch/Promise 桥——无，opening-menu.ts 全文核；(b) 外层 Promise 有 reject——无，`:98` 执行器只 `resolve`；(c) 全局 unhandledrejection 承接——reforge/src 无；(d) Store 读不拒绝——`store.ts:80/122/132` 反例确凿。既有红证据复用不重复跑：D-Q01-1（`glm-tenfold-triple/codex-q-r2-review-20261001.json:1322-1348`）以 current typed payload（buildCurrentSavePayload/buildWorld）+ 合法 chromePng + 真 MemorySaveStore、仅 typed getThumb 边界 reject UnknownError，公开按键路径录得 1 unhandled rejection、进程 exit 1、phase 仍 menu，`productChanged:false`。排除"非法 PNG/旧存档前提"。

## 3. 重复 Enter / 迟到结果 / 退出后归属

- **重复 Enter**：`:147` 无在飞守卫（注释"载入前多按无副作用"不成立）。两次 enterLoad 交错：后跑者 `:124` `thumbs.clear()` 丢弃先跑者已解码 bitmap 而不 close；双倍 IO；`browser/phase` 后完者胜（`:129-130`）——终态侥幸一致，但资源与 IO 均浪费。
- **迟到结果**：enterLoad 在飞期间用户选开局项（`:149-150` cleanup+resolve）或读到槽（`:164-167`）后，在飞 await 仍完成并写已死闭包的 `browser/phase`——外部无害，但 IO 白做、bitmap 无主；**迟到拒绝同样 unhandled**。
- **退出后归属**：cleanup（`:107-119`）取消 rAF、摘 keydown、填黑底，**但 thumbs 的 ImageBitmap 任何路径都不 close**（`:124` clear、resolve 路径、Esc 重进 `:169-170` 均然），GPU 侧资源全交 GC。rAF `:210` 自续、`:108` 取消与 keydown `:212/:109` 在 resolve 路径归属正确；错误路径菜单存活故 rAF 续跑本身合理。

## 4. 最小承接位置（二选一，均不改菜单布局/保存接口）

- **方案 A（局部 catch，推荐候选）**：`enterLoad` 内 try/catch 或 `:147` 改 `void enterLoad().catch(onError)`；错误时 `browser` 归 closed、停留 `'menu'`、rAF/键盘保留，错误呈现走产品选定 UI；附带在飞布尔守卫消重复 Enter。先例即 `main.ts:5479-5481`。取舍：diff 最小、菜单契约不变、瞬态 IO 失败不杀菜单、隐式重试=再按 Enter；但错误呈现仍需产品决定，且单独它不解决 bitmap close 生命周期。
- **方案 B（外层 Promise 桥）**：执行器加 `reject`，enterLoad 失败 → cleanup + reject，`main.ts:508` 调用域统一决策（致命开场错误屏/中止 boot）。取舍：顶层策略单一、收尾彻底；但 `runOpeningMenu` 契约变为可拒绝（全体调用方与既有测试须适配），瞬态失败即拆菜单，boot 流程新增错误分支，爆炸半径明显更大，且 main 拿到后怎么做仍是产品题。

## 5. 三条最小先红后绿回归方向（只设计）

均复用 `opening-menu.flows.test.ts` 既有合法 harness（current SAVE10 typed payload + chromePng + 透明 MemorySaveStore），不引入旧 SAVE8 fixture。

1. **listMeta 拒绝**：typed spy 拒 listMeta 一次，公开键 Enter「旧的回忆」→ 红：1 unhandled rejection；绿：零未处理拒绝、菜单可交互、仍能选开局项 resolve。
2. **getThumb 拒绝**：即 D-Q01-1，原样转回归 → 绿：零未处理拒绝、菜单处于定义态；随后成功重试能开读档浏览器（顺带覆盖隐式重试）。
3. **createImageBitmap 拒绝 + 退出后迟到归属**：dom-host 的 createImageBitmap stub（`__tests__/runtime-shell/dom-host.ts:119`）拒一次 → 绿：零未处理拒绝（含 enterLoad 在飞时已 Enter 开局项 resolve 之后的迟到拒绝）、无半成品 thumbs 入 drawSaveBrowser。

## 6. 仍需用户/Codex 拍板（本报告不自选）

- **Q1 错误呈现**：静默停留 / 仅 console.warn（局内先例 `main.ts:5480`）/ toast / 标题屏错误画——用户可见，须用户定。
- **Q2 重试与终态语义**：隐式重按 Enter vs 显式重试态；是否允许 IO 失败走方案 B 的拆菜单致命路径（before→after 用户可见）；注意 open 失败后 `dbPromise` 缓存使重试恒拒（`store.ts:71-84`），重试策略对此是否有解需一并裁决。
- **Q3 修复范围准入**：catch 之外是否同卡纳入在飞守卫与 ImageBitmap close 生命周期（`:124`/cleanup/resolve 路径）——工程项，Codex 定范围。

## 已跑 / 未跑

- 已跑：固定源静态直读（opening-menu/store/browser-state 全文 + main.ts `:440-569/:4618-4647/:5470-5489` 片段）+ reforge/src 全域 grep（catch/close/unhandledrejection/createImageBitmap/enterLoad）+ 4 份直接证据（母卡 JSON 红证据 D-Q01-1、`main.ts:4625-4640` 与 `:5479-5481` 对照先例、`opening-menu.flows.test.ts` 合法 harness）。
- 轻门实跑：`git diff --check` 零诊断；`node scripts/docs/check.mjs` 剩 1 项已知残项——`docs/testing/README.md` 目录索引未链接本报告，按卡"不要求修改共享导航"且唯一提交白名单仅本文件，留 Codex 集成时接线，不视为本卡收口通过。
- 未跑：任何新复现/测试/浏览器/coverage/全包（既有 D-Q01-1 红证据已成立，按卡复用；方案与回归仅为设计，未实现、未验证绿态）。不跑统一重门。
