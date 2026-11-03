# CODE-QUALITY-3Y-CLOSEOUT-1 — 统一治理分支与3y复审集成

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-11-03
Template: task-card-v1 / 1.0.0

## 目标

记录多条治理分支保全、原pre94有限范围复审与最终集成。原3y的65个packages/scripts增量、58张卡和a9be8ab9验收线沿原件追溯；本卡收口不代表全仓逐文件治理完成。

## 范围

保全式合并、文档/账本一致性与只读复审；不授权未经事实核验的产品实现。唯一生产冲突audio-midi全文读main与3y差异后保持main字节（main自有generation/AbortController/parser串行/stop/dispose）。147条新增历史closed声称暂降review，与验收线按更保守状态合并。

## 前提与证据

固定源全文核读各检查点。统一分支手术：66376bf51保全两线、临时closeout与重复menu-integration分支已删、旧managed worktree归档可恢复、32855a267统一推送且两原tip均为祖先。机器账本3288/223closed/198review/2867pending，0新增关闭。Y01片CODE75 MIDI测试排重：旧audio-midi.boundaries.test.ts两例只断言plays列表、1字节MIDI/强转Response/不可恢复全局fetch/定时猜完成，与main 12例同合同重复且协议过期，删除后main测试原字节；定向12、相邻6文件44、game typecheck通过；隔离stop代际反控12绿→11绿1指定AssertionError→恢复12绿。coverage runner run.mjs:429-433只拦仍存在文件的test删除，官方ratchet需原生allow-scope-removal。2026-10-25最终门：a76881ec Docs完整日志0诊断、Coverage 20180例及protected通过，但实际4条act告警致集成拒绝，只修CutsceneTab专测等待边界（2文件9例，断言与生产不变）。原件:[README.md](../evidence/CODE-QUALITY-3Y-CLOSEOUT-1/midi-review/README.md) [README.md](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/final-pre94-gates/README.md)。

## 验收

固定pre94原83范围已有逐项代码接受，最终零诊断与发布义务亦已闭合。a76881ec四条act告警和首次diff-check失败均保留原结论，不能用后来的成功改写；17份原件的无损gzip与SHA恢复入口保持。本轮未重跑本地全仓coverage。

## 状态与交接

2026-11-03复核：[PR22](https://github.com/IllegalCreed/type-pal/pull/22)已合并为8ebcb70f0e054038f52e6a3b3f7b35a1f6e536b8；同一merge的[Documentation](https://github.com/IllegalCreed/type-pal/actions/runs/40168874490)与[Coverage](https://github.com/IllegalCreed/type-pal/actions/runs/40168874483)均为main push、completed/success，merge已在当前主线祖先链。最终发布回执与原生stdout保存在`/Users/zhangxu/.codex/quality-evidence/type-pal/pre94-pr22/release.json`及同目录原件；原治理分支已清退，工作树可恢复归档。

Status为done，仅关闭原83有限代码范围、统一门与集成义务；原全仓其余review/pending、广域文件与产品/视觉边界不附带关闭，不增加当前ledger信用。下方“未合main/待CI”均是发布前原时点；无下一位Agent提示词。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 8245B / SHA-256 7f94bdba59b3ace9d1a95b418e6fe421f27fb690415843466bede465136aa02d；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-3Y-CLOSEOUT-1 — 统一治理分支与3y复审集成

> 2026-10-25发布：固定pre94原83范围代码accept；同一3y／PR22未合并。a76881ec的Docs完整日志0诊断，Coverage20180例及protected通过，但实际4条act告警导致集成拒绝。只修CutsceneTab专测等待边界，2文件9例／editorTC0、断言与生产不变；完整原件和当前差异见[最终回执](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/final-pre94-gates/README.md)。不重跑本地全仓coverage，新远端CI零诊断后合并。

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

## 最新实际分支状态

32855a267已将两线全部提交统一并推送到codex/code-quality-3y，两原tip均为祖先。两个菜单别名本地/远端和本地临时closeout分支均已实际删除；旧managed worktree归档可恢复，旧3x工作树在原SHA只脱离分支。当前唯一治理分支为3y，不再新增。main未改未合；58卡与逐文件门仍未收口。CODE75是首个复审入口，旧测试在main新协议下1红/1绿，已留证；先核与主线现有同合同用例的排重，不回退已发布的MIDI owner。

## Y01 — CODE75 MIDI测试排重准入

Coding Owner Codex，当前995cd8aee，唯一3y分支，0behind。已全文读当前audio-midi.ts、旧audio-midi.boundaries.test.ts、main现有audio-midi.test.ts与CODE75历史卡；直接读MusicBackend合同和AudioManager实际play/stop/dispose caller、SDLPal TSF_Play。旧两例只断言plays列表，使用1字节MIDI/强转Response、不可恢复全局fetch及定时猜完成，FakeSequencer又缺当前事件协议，统一候选1红1绿。main12例已有同两合同，使用实际Response/有效SMF/canonical SF3/ready及arrayBuffer完成见证，且断言load/play/loop或stop后零提交。

Codex premise verified / design agree / build allowed仅本片：删除已证重复且协议过期的旧boundaries测试文件；保留main测试原字节；只更新本卡/账本/证据/复审矩阵。不得改MIDI产品、AudioManager公共接口、音色/资源或规则。删除2条旧用例不等于删两项业务合同，须保留file×fullName转移映射、完整12例/相邻回归、game typecheck和至少一枚隔离stop失效业务反控11绿1指定AssertionError→恢复12绿；全仓门按稳定窗口集中，0文件新增关闭。

coverage runner实际合同：run.mjs:429-433只拦仍存在文件中的test-file/test-count删除，已从Git树实际删除的重复测试文件可按既有精确scope机制处理；官方ratchet如有removal仍须原生allow-scope-removal，并比对main与旧3y保护线。不得新增exclude/ignore或扩大批准predicate；本片不改保护表、不手拼基线。

### Y01当前检查点

2026-10-16：已删除旧测试文件，原件无损gzip与两条file×fullName转移关系留证；main产品/12例测试均原字节。定向12、相邻6文件44、game typecheck通过且无运行时诊断。临时副本stop代际反控12绿→11绿1指定AssertionError→恢复12绿，清理后另进程重建recipe、SHA与实际runner身份核对通过；首次准备缺shared/node_modules未跑测试，失败记录保留。详见[本片证据](../evidence/CODE-QUALITY-3Y-CLOSEOUT-1/midi-review/README.md)。

机器3287/223closed/198review/2866pending，0新关闭；CODE75只收本片排重，不恢复历史产品closed，余57卡未复审。完整check/official ratchet/两父protected fast仍待稳定模块窗口集中，不合main。继续只用codex/code-quality-3y；fetch核main未前进，0behind，分支整合所有旧tip可达。
```
<!-- incremental-original-source:end -->
