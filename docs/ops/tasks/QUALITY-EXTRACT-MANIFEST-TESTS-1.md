# QUALITY-EXTRACT-MANIFEST-TESTS-1 — 资源清单三专测的oracle与ownership

Status: done
Owner: Codex
Reviewer: Codex（单 Agent 自审）
Phase: ops
Capability: extract-tests
Visual Verification Timing: N/A（真实临时FS，未改产品）
Branch: codex/code-quality-94-102

## 目标

接续[百文件窗口](QUALITY-PENDING-100-1.md)，逐文件核资源清单三专测，复用已接受生产manifest/caller合同，只补测试/注释质量缺口。

## 范围

`packages/pal-extract/src/__tests__/asset-manifest{,.boundaries}.test.ts` 与 `src/resources/asset-manifest.glm-runtime-resource.test.ts`。61行生产实现与CLI写清单、Service Worker消费作依赖补读，不改实现、资源、规则或生成物。

## 前提真值门

版本是排序后path:size:sha256序列的SHA256前16位；排除根self与所有.DS_Store；collect只读取真实文件字节。现有ownership例在已排序输入上取snapshot，捕获不了原地排序；预期version又从被测manifest.files按相同循环推导。用倒序合法前像及独立常量oracle补强，单点错误变异应旧绿新恰一AssertionError。原生产合同不变。

## 上下文锚点

[长期质量](../code-quality.md)、[测试验收](../agent-workflow.md#测试质量验收用户-2026-10-03-固化)、[共同证据入口](../evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/README.md)。标准空串SHA与真实临时文件字节作为独立预期，不让测试结果为自身背书。

## 验证

先留旧7例原生JSON/default原件，再补实际缺口并核唯一ownership反控；必要extract相邻回归留本模块后续相关卡集中运行。Vitest固定4.1.7、default+JSON，禁止silent/核心mock/放宽时限。未运行产品全仓或官方coverage，提交仍等约100主体文件。

## 当前模式推进记录

Codex build allowed：仅三测试的oracle、合法前像与注释整改，Owner仅Codex。SLF/localization属于英文资源链，尚未核独占Owner，本窗口先避开实现文件。

## 交接

无下一位Agent提示词；Codex在同树继续，源/测试/反控与实际结果写回共同窗口证据。

- 2026-10-26 3主体代码接受；原7身份保留/7绿，唯一原地排序反控旧7绿/新单AssertionError。A–H、身份/原件见共同review.json；统一门/提交留约100窗口，未宣布本窗口集成完成。

## 本窗口本地验收收口

2026-10-28（JST）：100主体八维及本地统一门接受；本次提交时远端PR/CI/合并尚待，发布以受保护PR实际结果为准。 20536包测试＋732工具测试全部通过、七包typecheck和whole lint error/warning/info为0；唯一official20,188fast/809src，有限计数调整后原报告ratchet/protected0。文件关闭只来自本卡既有逐文件证据，未扩大到其它pending。见[统一原件与只读复验](../evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/uniform/README.md)。本卡done指本地审查/整改/验收，远端发布不是预先完成声明。
