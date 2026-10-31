# QUALITY-EXTRACT-EVENT-TESTS-1 — 事件编解码专测及原始夹具

Status: done
Owner: Codex
Reviewer: Codex（单 Agent，自审与实际验证分开记录）
Phase: ops
Capability: extract-tests
Visual Verification Timing: N/A（原始字节/命令结构/原盘往返，不改游戏）
Branch: codex/code-quality-94-102

## 目标

接续[百文件窗口](QUALITY-PENDING-100-1.md)，复用已验收生产实现和一手结构合同，逐文件补专测八维与必要返工，不把文件短、包绿或往返自洽当完成。

## 范围

events下disasm四专测、recompile三专测、roundtrip两专测、opcodes专测，共10文件；允许一个实际共享的events/__tests__/bytecode-fixtures.ts，只构造原始LE指令，不引用编解码器或opcode表生成oracle。允许把glm-tb04中四个纯二进制builder原样提到src/__tests__/binary-fixtures.ts，保留原导出转发，防事件夹具依赖GBK/资源表。该叶与实际bytecode夹具各自八维，不为搬移重复计旧文件。另审__tests__/glm-q/yj2-encoder.ts、io/rle.test.ts。io/mkf.test.ts只在证明三个合同由shared既有更强测试/真实caller承接后精简，不算新接受主体。

## 前提真值门

生产disasm/recompile/opcodes/roundtrip完整读，真实CLI原始自检、消息读取/类型和slice入口已核。8B/WORD、dialog style与控制流语义依SDLPal具体case；既有YJ2/RLE来源证据按实际指纹复用。保留当前缺label与未用参数合同，不改实现/接口/资产输出。新行为风险只停止受影响项。

## 上下文锚点

[八维](../code-quality.md)、[共同证据](../evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/README.md)、[原窗口任务](QUALITY-PENDING-100-1.md)。基点123595ac3a651957b36061eacced329369c495e5；英文/SLF/script-corrections活跃范围不写。

## 验证

先保留10事件/2IO基线，修改后必要定向与相邻、typecheck/局部静态；原件default+JSON。用独立字节/完整命令预期防互相抵消，必要变异须唯一指定业务AssertionError。旧身份保留/合并/退役逐项映射；YJ2大/小/空流用已有有界native主源验证EOS，不拿TS长度退出当合法性证明。全仓/official/提交仍等约100主体冻结。

## 当前模式推进记录

Codex build allowed：上述测试/fixture与YJ2事实注释；生产算法、schema/save、公共出口/参数、提取格式和规则均不写。单一Owner，不委派，不增加ignore/超时/强转或核心mock。

## 交接

逐项完成才计主体；重要未知不关。约100时集中审正式退役映射和官方范围/基线，零诊断后再提交推送合并。

## 本片代码验收（2026-10-27）

14主体逐文件A–H已核且代码接受，旧glm-tb04仅版本桥不凑数；pending的MKF三重复专测退出。10事件旧60→58，IO旧6→1；逐身份合同映射见共同review.json所指events-case-mapping.json。59定向、表相邻66、shared MKF11、extract TC均0诊断，四有效业务单红与YJ2原生EOS0/1/65536字节验证已存。

首轮两个测试导入漏失产生7个ReferenceError，已修，不能给反控信用；opcodes表的$title原生标题截短冲突另改显式it(title)，最终21名与基线完全相同。每次原件保留，不把旧日志改成新事实。原盘SSS chunk4=348024来自独立Python头表；不改生产算法、接口或资产。

累计69／约100；中央账本3460／663closed／0review／2797pending经机器另核。全仓check/official/ratchet/protected、提交推送和PR仍未执行，约100冻结后收尾。无下一位Agent提示词；下一片仍选剩余提取fixture，活跃英文/SLF链保持隔离。

## 本窗口本地验收收口

2026-10-28（JST）：100主体八维及本地统一门接受；本次提交时远端PR/CI/合并尚待，发布以受保护PR实际结果为准。 20536包测试＋732工具测试全部通过、七包typecheck和whole lint error/warning/info为0；唯一official20,188fast/809src，有限计数调整后原报告ratchet/protected0。文件关闭只来自本卡既有逐文件证据，未扩大到其它pending。见[统一原件与只读复验](../evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/uniform/README.md)。本卡done指本地审查/整改/验收，远端发布不是预先完成声明。
