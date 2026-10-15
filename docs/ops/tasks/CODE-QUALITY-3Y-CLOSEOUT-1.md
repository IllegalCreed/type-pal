# CODE-QUALITY-3Y-CLOSEOUT-1 — 统一治理分支与3y复审集成

Status: build
Owner: Codex
Reviewer: Codex（作者自验与证据复核分记）
Phase: engineering / phase1
Capability: quality branch integration
Visual Verification Timing: mixed（功能界面沿历史实证核；剧情延后需可执行登记）

## 用户指令与安全边界

用户先要求把codex/code-quality-3y收尾复审并合并，又明确不希望存在多条治理分支。后续唯一活动治理分支为codex/code-quality-3y；停止新增分支。主树main只读，无未提交改动；旧3y工作树干净。独立新工作树从最新origin/main=f98d0ddd8建立，暂名closeout仅为同步保全；解决冲突后恢复3y名字并删除临时名。验收线a9be8ab9所有工作必须保留并汇入，再删其别名，不以分支清理丢弃未完成工作。

重复integration远端指向a9be8ab9，与accept完全相同；本地e4656ae00是a9be祖先，工作树干净，无open PR。远端按精确lease删除，旧managed树已可恢复归档，本地重复ref已删。未触碰主树、ED-ENTITY或其它文档线程。

## 范围、前提与准入

3y tip=d4cf7f57d，latest main=f98d0ddd8，main...3y=5behind/86ahead；65个packages/scripts增量与58张非index任务卡待逐项复审。新增关闭声称保留历史，当前未复验者统一review，不批量恢复credit。任务卡/差异/原件矩阵单独维护；不能把source相同或包绿当作逐文件新验收。

| 维度 | 依据与当前目标 |
|---|---|
| Primary | git两父对象、实际源码/callers/SDLPal/用户既有裁决；每产品卡仍逐项核前提。 |
| 第一阶段 | 3y含获批毒槽/真实0/战斗禁换队/复活≤999等候选，先复核再接收；不新增机制取舍。 |
| 二阶段 | editor/reforge只有相邻诊断测试；继续READ-FIRST，不能把phase1机制搬入。 |
| 本卡目标 | 保全两条既有治理成果，统一分支；全部复审与硬门清零后才合main并清退分支。 |

最强替代解释：main已用更完整实现替代某旧修复，不能把老代码再盖回去。唯一生产冲突audio-midi已全文读main与3y差异，main自有generation/AbortController/parser串行/stop/dispose，须保持main字节，旧CODE75测试随后核合法caller与库异步事件。coverage生成物不手拼，先取最新main原字节作为比较输入，保留3y原baseline，待官方ratchet重生并分别守两父保护线。

Codex premise verified / design agree / build allowed仅保全式合并、文档/账本一致性和只读复审；不授权未经事实核验的产品实现。发现schema/save/资产/公共接口或新用户取舍另卡停线。原53/57/79/80/81/90/95未知不关闭。

## 质量与交接

先定向/相邻/必要typecheck、代码审查，多个有限片集中跑check/官方ratchet/protected fast/lint-zero/ledger；exit0带诊断不算通过。合main前fetch并确认0behind、治理分支先commit/push。阶段同步提交不是集成accept。无下一位Agent提示词，Codex继续。

## 统一分支检查点（未验收）

最新main与旧3y先以66376bf51保全，临时closeout分支已删除，当前真实分支恢复codex/code-quality-3y并推送。原3x树只在相同d4cf7f57d脱离分支，文件/索引未改。重复menu-integration本地/远端已删，managed旧树归档可恢复。随后将a9be8ab9验收线全部成果合回同一3y，不再新增治理分支；accept ref待确认祖先且远端推送成功后清理。

58旧卡/65源码增量仍逐项复审。首次导入147条新增历史closed声称暂转review；与验收线按更保守状态合并后机器3288/223closed/198review/2867pending，0新增关闭。旧原件保留，不伪造此前读过。CODE53已有party-slot候选，重复GAME毒域卡取消归档，main冻结probe保留原时点事实。

两份C05测试冲突精确保留a9be经实测的真实事件/导航端口版本；其它自动合并增量仍需相邻与整体验证。两个精准退役账合并为22项/net51，固定表测试先67例中1失败，再同步实际清单计数；matcher/拒绝合同不变，原始红绿receipt另记。覆盖率基线仍未由官方重生，完整门未跑本新候选，不能合main。第一次同步git diff --cached --check检出4份历史raw文本的尾空格，尚未当作通过，保留原件待无损归档与链接核对。

补充：后续合入验收线时diff-check又检出历史日志空白；统一17份原件无损gzip+SHA索引，显示副本仅规范尾空格/EOF空行，所有非空白字节一致。旧receipt原哈希仍可按raw-originals-map解压重建，未把失败或非零诊断改写成通过。固定退役表67例全绿；完整质量门与58卡复审仍未完成。
