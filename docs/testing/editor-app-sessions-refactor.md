# B1 编辑器总壳会话所有权候选

Owner：Codex；原始切片基点 `ae989b9b`；实现 `4101926d`、`93e4a9c4`、`6181d7eb`、`52112d86`；
同步主线 `7d64de13` 后的候选合并为 `f7f46c32`。所属
[连续治理卡](../ops/tasks/ARCH-CONTINUATION-1-remaining-queue.md)。这里的 `App` 指编辑器总壳
`packages/editor/src/ui/App.tsx`，不是移动应用或 Codex 桌面程序。

本候选不合 main、不运行共享全仓 coverage 门；待原接收对话统一集成和执行 check/ratchet/strict。
完整计数、命令和未证项见[机账](editor-app-sessions-refactor-evidence.json)。

## 所有权边界

- `useEditorNavigationSession` 独占 URL/current location、各模块位置记忆、workspace-scoped localStorage、
  push/replace/none 历史写入、popstate、三栏 scroll 捕获/恢复及 restore rAF 释放。业务对象焦点和页面装配
  仍由编辑器总壳提供窄端口；初次显式 URL 优先与非法参数归一化顺序不变。
- `useSceneWorkspaceSession` 独占活动场景、场景选择、放置/脚本子态、图层显隐及 scene deep-link 同步。
  显式切场先清选择与放置态，再 replace 场景 URL；保留 retained callback 读取最新 location 的时点。
- `useBattleTrialSession` 独占临时试玩草稿、discard continuation、beforeunload、单 popup 集合、卸载关闭、
  启动前 dirty/blocked 门和启动后 revision 重验。试玩结果仍通过原端口回写，不拥有工程历史。
- `useEditorProjectSession` 独占目录绑定、保存中断引用、快照/作者基线、save/open/save-as/export/rename/leave
  编排。既有 `ProjectLeaveGuard` 仍是唯一 leave admission/lease owner；主历史与脚本历史仍各自拥有 dirty、
  revision、undo/redo，没有复制进新 hook。
- `App.tsx` 从 5170 行降到 4688 行，只保留装配、跨会话端口和 UI 组合。四个 owner 接收窄输入，均不接收
  整个编辑器上下文。公共包出口、content20/SAVE8、schema、生成资产、玩法、公式和 UI 形态零改。

## 保存、离开与取消合同

- 新建/打开/离开仍先经 `ProjectLeaveGuard.request`；取消保持主历史与脚本历史，确认后才执行 intent。
- native picker 等待期间继续持有 revision lease；晚到编辑使 open/save-as 结果不能替换当前工程。export 的读取失败
  也必须在 finally 释放 lease，避免永久阻塞后续工程操作。
- save 仍使用真实 writer 与 author baseline；既有 37 项 conflict/checkpoint 测试只把源码抽取锚点从总壳适配到
  真正 owner，没有复制保存算法或 mock 掉 guard/history。
- 试玩草稿只有实际 changed 时占用 beforeunload；显式放弃才执行 continuation。新启动只允许一个窗口，捕获的
  editor revision 失效时不回写旧结果，卸载同步关闭仍存活窗口。

## 回归与反控

- 新增 18 项：导航 5、场景工作区 7、试玩 3、总壳所有权/资源协议 3。定向组合 6 文件/54 项通过；
  保存冲突与 checkpoint 37 项通过。
- 同步 `origin/main@7d64de13` 后，Editor 整包 328 文件/2847 项、TypeScript 与 production build 通过；
  build 只保留既有大 chunk 提示。候选文件 Biome 无 error，`App.tsx` 仍有 3 条既有无用 Fragment info。
- [二十针反控](editor-app-sessions-mutants.mjs)在真实 Vite 模块上覆盖 URL 优先、scroll、popstate、rAF 释放、
  scene deep-link/切换/latest-location、试玩 unload/discard/单窗/dirty/revision/关闭、工程 leave/open/save-as/export
  lease。control 50/50；20 个坏实现各由指定候选测试单一 `AssertionError` 检出；判据 1 正 9 反，且产品文件
  hash 不变。最终临时机账：
  `/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-editor-app-sessions-mutants-3yaRDP/summary.json`。

## 隔离功能核验与未证项

Codex 在 6054、`VITE_PROJECT_ID=pal` 的隔离编辑器直达 `scene/workspace/s135`：场景“京城武器铺”、实体、落点、
图层和 inspector 正常；经导航进入 `map/workspace/map-122` 后，浏览器回退准确恢复 s135 URL、选择和三栏工作区。
console error/warning 为零。未调用保存、打开或目录选择，未读写正常工程/存档，不占 6010；页面关闭、服务停止。

本对话按交接要求未运行全仓 check、官方 coverage ratchet、受保护 strict、full/Q1/Q2 或远端 CI，也未更新
官方 coverage 基线。原生 File System Access picker 的真实落盘视觉未执行；720/900 横向裁切、隐藏 outliner 后
separator 命中/焦点区、boot 首屏失败矩阵以及原生浏览器 125%/150% zoom 仍按既有后续矩阵保留。B1 只在候选树
四个 owner 齐备，须由原接收对话完成统一门并合 main 后才能正式标完成。
