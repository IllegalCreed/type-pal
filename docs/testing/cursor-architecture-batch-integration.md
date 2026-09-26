# Cursor 24组架构整理 · 独立验收与集成

2026-09-26；作者候选`fc09645e`，Codex在`e0c3b6d0`合入主线已有D1/E2后验收。结论：**R1–R3闭合，accept，24组任务可收口**。用户免手动验证；本席未代签Cursor或其它Agent。

## 窄返工结论

- 三份实际fixture重新交现行validateEnemies/validateSkills/validateAssetCatalog，均accepted；C07新标题不再冒称守卫，反控改钉旧commands.test.ts真实引用阻断用例。既有声明搬移不重做。
- 实际judge自测8条均按预期拒绝错误输入；24针独立重跑均为正控实际执行、命中、恰exit1、候选AssertionError，产品hash不变。运行工具会回填逐针作者JSON，本席将这些文件恢复为作者提交内容，独立结果保存在/tmp并另记机账，不混写作者回执。
- 旧commands出口119、controls出口50保持；不必要的2值+5类型出口已撤回。两项formatter error消除，变异字面量5条warning如实保留，未把它们改成真实模板插值。
- 139个命令声明正文保持；78个控件声明只有draftSource补显式返回类型，运行正文保持。32新模块无runtime回引旧barrel；adoption仅11条producer归属机械变更，CSS/策略不变。

## 独立执行

完整editor check **313文件/2813项exit0**；24针与其自测、fixture守卫、Biome/docs/diff均通过。
与GLM已接收剩余4项一起统一执行完整check **8707项** → 官方ratchet → 保护`8d851fa6`的**单次严格fast 8215项/686生产文件**，全部exit0。
本卡新增25项测试/32生产模块；GLM另4项归其贡献，不串算。未缩统计范围、改超时/排除/阈值，未跑full/Q1/Q2。

## 最小功能实测

独立6018、Codex自有当前版本lab-v4内存工程，不动6010/6051或用户存档：

- 名称Enter提交，随后blur，一次undo恢复且undo禁用；Escape丢弃脏草稿且不添历史。
- 买价ArrowUp 150→151、Enter提交、undo回150；图标选择弹窗过滤10→1，Escape关闭且焦点回到“选择已有图标”按钮。
- 通过真实文件选择/导入替换同AssetId图标，引用1保留；资源预览、物品目录/页眉/图标区蓝→绿，undo全部回蓝。目录仍10项，AssetId不变。
- 900×700的非空场景（6条正式作者dialog命令）可渲染；左分隔条194→210，Home→194，真实拖拽+40→234；隐藏恢复保留234。脚本正文实际scrollHeight656/clientHeight364，scrollTop0→292。地图工作区再按右键234→250。
- 720px主体/Inspector既有横向裁切仍可见；隐藏对象列表后分隔条DOM及边缘8px命中区仍存在，不能宣称“全部隐藏/完整响应式已通过”。这些不由本包改动引入，登记B1布局/可达性治理，不能借本卡删除披露。

整体F2仍有actor/entity/map/资源命令剩余整理，并非架构队列全部完成。详情与日志摘要见[统一机账](architecture-intake-completion-evidence.json)。无下一位Agent提示词；Codex继续架构主线。
