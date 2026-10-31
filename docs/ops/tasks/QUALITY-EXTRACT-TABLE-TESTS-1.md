# QUALITY-EXTRACT-TABLE-TESTS-1 — 二进制表与调色/音频专测

Status: done
Owner: Codex
Reviewer: Codex（单 Agent 自审）
Phase: ops
Capability: extract-tests
Visual Verification Timing: N/A（解析/字节与真实原盘fixture；不改显示）
Branch: codex/code-quality-94-102

## 目标

按[百文件窗口](QUALITY-PENDING-100-1.md)继续pal-extract已读生产模块的pending专测/fixture质量，补测试判别力、注释事实及输入/生命周期边界。

## 范围

前20主体按五个互不重叠切片：

1. items/spells boundaries＋glm-foundation/glm-tb04两fixture；
2. battle-fields/enemy-teams/stores/data-misc四boundaries；
3. items/stores/enemy-teams/battle-fields四glm-runtime-resource专测；
4. palette三专测＋enemy-pos.boundaries；
5. data-misc主测、rix/sounds主测、indexed-frame-digest helper。

相邻palette.ts只允许事实注释勘误，不改变位复制、夜色或cycles行为；它原已closed，仅版本桥接，不计新主体。其它实现、schema/数据、生成物及English/SLF实现均不写。

补充同模块实际caller：`player-roles.event-boundaries-1.test.ts`作为第21个pending主体，全文核两条名称/元素字段合同并仅整理过时注释。fixture允许移除已全文核两个caller均未使用的avatar/spriteNumInBattle/attackAll三个测试行常量；四个构造函数与保留行值必须保持。不是产品接口变化。

## 前提真值门

一手参考为当前SDLPal的WORD/SHORT、ITEMFLAG/MAGICFLAG和记录结构；TS既有parse语义与正式CLI源分区已由pre94审查，按具体源指纹复用。palette已有TS位复制(25→101)与C左移(25→100)区别，见既有palette-approach-tests，不冒称SDL色值字节等价，也不重开既有颜色行为裁决。

测试输入是明确的原始IO/合成WORD记录，不作为完整可玩场景、合法库存或真实人物名称证据。完整字段预期、极值/字节偏移、5槽/6角色及临时资源所有权各自核定。重要未知留review，不按短小/绿数关闭。

## 上下文锚点

[当前八维](../code-quality.md)、[原生palette输入域](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/core-comment-audit/palette-approach-tests/README.md)、[共同窗口证据](../evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/README.md)。已实际全文读21主体文件及其表parser/fixture，真实caller为CLI与sprite dump；未核失效项不继承旧accept。

## 验证

只跑本切片必要default+JSON定向/相邻，支持原盘输入的测试缺资源就真实失败，不skip/pass占位。字段/tuple反控在独占复制树进行，必须旧绿新唯一业务AssertionError，完整原件和清理保留。纯注释用去注释发射JS等价验证；无产品行为修复，不伪造“产品红例先行”。全仓/官方覆盖率与提交继续留约100主体窗口。

## 当前模式推进记录

Codex build allowed：上述主体逐维审查及测试补强、palette单文件事实注释；保持全部生产算法/接口/数据/范围与默认超时。单一Owner Codex，不委派、不恢复旧兼容代码。

## 交接

无下一位Agent提示词；Codex按五切片完成，审查/整改/统一门/发布分别写回，未知不强关。

## 代码接受（2026-10-27）

21主体逐项A–H、两fixture真实caller及原盘golden已核。完整66例/20文件绿，0 stderr；extract包typecheck/11改动TS局部Biome零诊断；三反控旧绿新唯一AssertionError，原件/过程边界见共同review.json/native归档。palette仅事实注释、四fixture构造函数及保留键值不变。当前窗口42／约100、639closed／0review／2823pending；review表示代码接受待统一重门/发布，不冒称整窗完成。

## 本窗口本地验收收口

2026-10-28（JST）：100主体八维及本地统一门接受；本次提交时远端PR/CI/合并尚待，发布以受保护PR实际结果为准。 20536包测试＋732工具测试全部通过、七包typecheck和whole lint error/warning/info为0；唯一official20,188fast/809src，有限计数调整后原报告ratchet/protected0。文件关闭只来自本卡既有逐文件证据，未扩大到其它pending。见[统一原件与只读复验](../evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/uniform/README.md)。本卡done指本地审查/整改/验收，远端发布不是预先完成声明。
