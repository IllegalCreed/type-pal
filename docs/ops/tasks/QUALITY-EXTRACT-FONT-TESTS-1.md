# QUALITY-EXTRACT-FONT-TESTS-1 — 字体专测合同与排重

Status: done
Owner: Codex
Reviewer: Codex（单 Agent 自审，不冒称外部签字）
Phase: ops
Capability: extract-tests
Visual Verification Timing: N/A（BDF/JSON字节合同，不改字体显示）
Branch: codex/code-quality-94-102

## 目标

接续[百文件窗口](QUALITY-PENDING-100-1.md)，核字体三份pending专测的完整oracle、重复合同和真实caller。当前42主体已接受，不继承其它文件信用。

## 范围

font/__tests__/bdf-to-json.test.ts、bdf-to-json.boundaries.test.ts及font/bdf-to-json.glm-runtime-resource.test.ts。实际来源为font/bdf-to-json.ts与resources/lookup-assets.ts；生产实现、数据、输出格式与公开出口不改。ASCII元数据旧例由现有两字形完整合同承接，保留原ASCII全部16行；非对称CJK例完整32B，混合字形顺序、EOL、JSON与缺省/过滤/EOF各自分工。

## 前提真值门

固定本地Unifont由CLI预检后交lookup writer；parseBdf不是不可信通用BDF校验器，既有宽容合同仅characterization，不扩大输入安全信用。全文三专测、parser与writer已读；不把纯解析测试当Canvas或原盘字库视觉验收。

## 上下文锚点

[现行八维](../code-quality.md)、[共同文件索引](../evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/review.json)。基点123595ac3a651957b36061eacced329369c495e5；同一治理树，英文/SLF不触碰。

## 验证

保留baseline与default+JSON最终定向原件；序列化宽度单点变异须旧绿新一条业务AssertionError。ASCII旧身份→完整字形身份与字节输入明确映射，官方退役/基线验收留约100文件冻结窗口，不为覆盖率保弱例。完整原件追加共同native归档。

## 当前模式推进记录

Codex build allowed：只改上述三专测，补强/排重与注释真实性，不改规则、timeout、核心mock或产品实现。同一Owner Codex，不委派。

## 交接

继续同窗资源专测，只有实际代码接受计主体；整窗重门、提交/推送与合并仍待约100冻结。

## 代码接受（2026-10-27）

本卡白名单代码/合同与八维已完成，详见共同review.json/native归档。整窗现55主体；retired5路径不计新增接受，源三旧closed从live表移除。14相邻52例、shared RNG22例、extract typecheck及局部Biome零诊断；原反控/超时/格式/暂存前错误与恢复原件均保留。review表示等待约100窗口集中重门和发布，未提交/推送/合并。

## 本窗口本地验收收口

2026-10-28（JST）：100主体八维及本地统一门接受；本次提交时远端PR/CI/合并尚待，发布以受保护PR实际结果为准。 20536包测试＋732工具测试全部通过、七包typecheck和whole lint error/warning/info为0；唯一official20,188fast/809src，有限计数调整后原报告ratchet/protected0。文件关闭只来自本卡既有逐文件证据，未扩大到其它pending。见[统一原件与只读复验](../evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/uniform/README.md)。本卡done指本地审查/整改/验收，远端发布不是预先完成声明。
