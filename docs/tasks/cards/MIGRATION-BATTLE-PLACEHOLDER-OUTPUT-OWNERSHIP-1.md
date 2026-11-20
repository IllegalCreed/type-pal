# MIGRATION-BATTLE-PLACEHOLDER-OUTPUT-OWNERSHIP-1 — 占位精灵与 FBP 预览的输出所有权

Status: review
Phase: phase2
Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-20
Template: task-card-v1 / 1.0.0
Visual Verification Timing: N/A

## 目标

固定输出归运行命令的工程树所有。遇到链接时拒绝写入，正常生成仍得到原定的资源或预览。

## 范围

占位精灵命令的两个工程目标，以及 FBP 预览命令的仓库内缺省目标。用户指定的预览路径沿用维护者负责目的地的合同。

## 前提与证据

| 真值层 | 已核事实 |
|---|---|
| #72 冻结实现 | `generate-project-battle-placeholders.mts:27–37` 编码后逐工程创建固定目录，直接写目标，路径所有权由实际文件系统决定。 |
| 第一阶段 | 该工具生成二阶段自建占位素材，原盘和旧引擎没有此输出合同。 |
| 第二阶段 | 两个资产目录表都消费 `assets/generated/battle-sprites/player-fighter.rle`。普通独立目录下原 #72 两份产物的字节验收仍适用。 |
| 本任务的修复前复现 | 原占位精灵命令跟随目录链接和文件链接。原 FBP 命令的缺省文件为链接时，输出也进入外树。 |

反证针对“输出目录始终属于运行的工程树”。复制 #72 的命令原字节到自有临时树，以第二棵自有临时树作为 demo 生成目录链接的目标，原有文件先放独立标记。真实 tsx 命令退出 0，标记从 20 字节变为 107 字节；另一个普通目录也产生 107 字节。用例以链接之外的文件字节为观察。运行源 SHA-256 为 `f3d4bc6555e8240524bad1e28aebdcc60763ea1cbde6a45343e5b33167af6838`。

## 验收

按 [二阶段准入](../../phase2/READ-FIRST.md) 与 [逐文件关闭门](../../engineering/guides/code-quality.md#逐文件关闭门) 核定两个真实维护入口。两个占位目标都通过本树路径检查后才开始写入。FBP 预览用实际 PNG 的位置、可见色与透明像素核缺省及显式输出。

[执行归档](../evidence/QUALITY-POST-GAME-ACCEPTANCE-AUDIT-1.tar.gz) 内 `placeholder-ownership.json` 保存原命令、输出、退出码与前后摘要。脚本可从 `b3f6104561d77ba270f08a3a7f4535aa63513350` 取回。两棵临时树均由本次审查创建。生产入口和核定范围由 [#72 原验收](QUALITY-MIGRATION-SOURCE-PROJECTIONS-1.md#合并后关闭复核) 对照。

同一归档的 `follow-up/` 保留正式回归。占位命令的目录和文件链接样例均在原版把外部哨兵覆盖，两条回归均红，普通重建通过。FBP 默认目标指向外树时，原版同样覆盖外部哨兵，明确目的地与普通缺省两项像素校验通过。复用迁移路径守卫后六项通过，迁移与相邻定向 49 项通过。两个产物的跟踪字节和真实项目目录未被测试写入。

## 状态与交接

用户在回溯交付后要求处理确认缺口并扩大核查。2026-11-20，Codex `build allowed`，单一 Coding Owner 为 Codex。已查最新 E2E 分支及其工作树，两个维护入口和既有路径守卫无重叠。统一复用 `assertMigrationFilePath` 核定固定写入地址。该守卫的合同是本地预检，写入本身出现系统错误时仍需按命令退出原因处理。

两个实现及三份专测或宿主的逐文件裁定见[回溯整改](QUALITY-POST-GAME-ACCEPTANCE-AUDIT-1.md#扩查结果与本轮整改)。本轮有定向证据，等待后续稳定窗口的统一门与集成。
