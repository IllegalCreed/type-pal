# 当前作者命令表单独立验收

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-20
Template: audit-report-v1 / 1.0.0

本页是 Codex 2026-10-07 对 TEST-EDITOR-AUTHOR-COMMAND-FORM-CONTRACTS-1 的独立验收：固定候选 `80a9c5c6b`、测试提交 `f43359781`；Codex 只读固定候选在独占副本复跑。

## 审计问题

- 五个新合同及 E1–E12 分类的接受裁定；隔离复跑真实性与白名单核对；集成修正账中两处导航/分类错误的核对。

## 范围与证据

- 7/7 冻结源一致；改动均在白名单；重跑回执 hash a1638f82…7046、原候选回执 hash dd8ac291…3474；副本依赖最初指向作者真实目录被 Vite 隔离 allow 拒绝，改独占副本离线安装锁定依赖后完整复跑（首次失败不隐藏）。

## 发现

- 真 CanonicalScriptBodyEditor→aggregate→author bridge 链，无 mock 子控件/改产品/私有 draft；空 shop numeric 臂、sound/music 占位点击叶子守卫、portrait 选择/清除字段保全，与旧 body/oracle 不重复（旧 glw 音效空目录用例只打开菜单列选项；旧 current-identity 无 portrait 两路径）。
- 五针完整独立重跑、19 判据自测及 3 真实 hook/异步 uncaught 探针通过，恢复字节相同且临时树移除；原候选 34 个 JSON/raw artifact hash、五个重建 mutant/恢复 hash 逐枚一致。
- Editor typecheck 零诊断；新两文件零 act/console.error，相邻旧 App 文件 34 条 act 警告如实分列。
- 集成修正账勘误：不存在的 glm-control 文件简称应为真实 command-form-control.glm-large-wave.test.tsx、E2 未登记变量行错位——均为已直接核 body 的导航/分类修正，不改业务测试。

## 结论

- 五合同及分类接受，本地串行集成门全部通过（全仓 check、官方 ratchet、以原派发为保护基点的 fast 按序退出 0；Editor 全包 4906/4906、根 lint 3607 文件 0/0/0），本卡 done；不宣称 GitHub CI 已通过。

## 整改与复核

- 主树并集分支 50113/60209=83.23%，冻结与分母未缩，不将并集增益归成作者私有增量；与 A 共享唯一集成门回执（../TEST-REFORGE-BATTLE-HOST-TEST-RELIABILITY-1/codex-integration-gates.json）；B counter 未合、GitHub 新 CI 状态另核；不因整体未 85% 重开已闭合 E1–E12。

## 历史范围

- 2026-10-07 Codex 独立验收记录（候选 80a9c5c6/测试 f43359781）；固定源 revision 6855e6945bb0…。

## 原始结论

- 五合同+E1-E12 分类接受，本卡 done；两处集成修正账勘误如实。

## 当时证据

- 复跑细节、hash 与集成门数字在 quote 保全。

## 当前有效性

historical。验收按 2026-10-07 候选时点；GitHub CI 另核。

## 继任文档

当前结论归任务卡完成记录。

## 原文保全

固定 source revision `6855e6945bb015df4674dc64ad7410f56702ceee`，source SHA `964cd274866d265635d1c6797d4e92cab47672bf328dc179ed3327169982938b`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与固定原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # 当前作者命令表单独立验收
>
> 固定候选：`80a9c5c6baf8b015ceca95502c0e32629d605ee4`；测试提交`f43359781217bdc8c4ab4496272eeda92ce424d8`。Codex于2026-10-07只读固定候选，在独占副本复跑。
>
> 结论：五个新合同及E1–E12分类接受，本地串行集成门全部通过，本卡done；不宣称GitHub CI已通过。
>
> - 7/7冻结源一致；改动均在白名单。真CanonicalScriptBodyEditor→aggregate→author bridge链，没有mock子控件、改产品或私有draft。
> - 空shop numeric臂、sound/music占位点击的叶子守卫、portrait选择/清除字段保全，与旧body/oracle不重复。旧glw的音效空目录用例只打开菜单列选项，没有点击占位；旧current-identity没有portrait两路径。
> - 五针完整独立重跑、19判据自测及3真实hook/异步uncaught探针均通过，恢复字节相同且临时树移除。原候选34个JSON/raw artifact hash、五个重建mutant/恢复hash逐枚一致。
> - 副本依赖最初指向作者真实目录，Vite隔离allow拒绝该额外路径，第一次复跑未跑成测试；改在独占副本离线安装锁定依赖后完整复跑通过，不扩大产品配置、不写共享依赖、不把首次失败隐藏。
> - Editor typecheck零诊断。新两文件零act/console.error；作者相邻旧App文件34条act警告如实分列，不称全包console零。
> - Codex集成修正账中不存在的glm-control文件简称为真实command-form-control.glm-large-wave.test.tsx，以及E2未登记变量行错位；都是已直接核body的导航/分类修正，不改变业务测试。
>
> 重跑回执hash`a1638f826fa1b968112f6a9a000ba77be7fa1a79a825ebafd5f83f40c6137046`，原候选回执hash`dd8ac2912b25907a803cf66e8704368225f7cf75f0915cd8f7e08e9a9ddf3474`。全仓check/ratchet/受保护fast以最终集成记录为准。
>
> ## 串行集成收口
>
> 全仓check、官方ratchet、以原派发为保护基点的fast按序全部退出0；Editor全包4906/4906、根lint完整3607文件0/0/0。主树并集分支50113/60209=83.23%，冻结与分母未缩，不将并集增益归成作者私有增量。与A共享[唯一集成门回执](../TEST-REFORGE-BATTLE-HOST-TEST-RELIABILITY-1/codex-integration-gates.json)。B counter未合，GitHub新CI状态另核；不因整体未85%重开已闭合E1–E12。
>
<!-- original-source-quote:end -->
