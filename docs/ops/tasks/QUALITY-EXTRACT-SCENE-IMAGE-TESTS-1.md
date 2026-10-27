# QUALITY-EXTRACT-SCENE-IMAGE-TESTS-1 — 场景/地图与单帧图片专测

Status: done
Owner: Codex
Reviewer: Codex（单 Agent）
Phase: ops
Capability: extract-tests
Visual Verification Timing: N/A（字节、字段和PNG oracle，不改游戏显示）
Branch: codex/code-quality-94-102

## 目标

接续[百文件窗口](QUALITY-PENDING-100-1.md)，逐文件完善测试输入合法性、完整oracle和注释精度，不触产品算法。

## 范围

resources/scene.test.ts、scene.glm-runtime-resource.test.ts、map.test.ts；parsers/ball.glm-runtime-resource.test.ts、rgm.glm-runtime-resource.test.ts。允许新增两个场景专测共用的resources/__tests__/scene-fixtures.ts，仅构造原始SCENE/EVENTOBJECT记录并通过真实parseSss返回一致typed/raw视图。六主体，新增helper为实际复用，不额外造测试例凑数。

## 前提真值门

实现scene/map、io/sss和真实world-assets writer及PNG路径已全文读；全局id/半开场景区间、64×128×双u32及原盘PAL像素合同复用现有证据。SCENE/EVENTOBJECT是结构化原始IO fixture，不宣称整个脚本图可玩。原样保存脚本WORD域，源实现/管线/资源/接口均不改。

## 上下文锚点

[八维与测试规范](../code-quality.md)、[共同证据](../evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/README.md)。同一分支；单一Owner，英文/script-corrections仅类型依赖不改。

## 验证

基线及当前定向default+JSON；补齐场景完整映射、真实parseSss输入与地图非对称行列/view oracle。必要反控必须因业务AssertionError，负面案例与产品修复区分。只有实际闭合的文件才计数，整窗重门/覆盖率/提交仍在约100主体后。

## 当前模式推进记录

Codex build allowed：仅上述六文件测试/fixture，完整读实际实现和raw类型依赖；不改变timeout/规则，不mock业务核心。先移除过时注释与部分断言，再保留身份/合同映射。

## 交接

本模块代码接受与统一门/发布分开；其它pending不随包绿关闭。

## 代码接受（2026-10-27）

本卡白名单代码/合同与八维已完成，详见共同review.json/native归档。整窗现55主体；retired5路径不计新增接受，源三旧closed从live表移除。14相邻52例、shared RNG22例、extract typecheck及局部Biome零诊断；原反控/超时/格式/暂存前错误与恢复原件均保留。review表示等待约100窗口集中重门和发布，未提交/推送/合并。

## 本窗口本地验收收口

2026-10-28（JST）：100主体八维及本地统一门接受；本次提交时远端PR/CI/合并尚待，发布以受保护PR实际结果为准。 20536包测试＋732工具测试全部通过、七包typecheck和whole lint error/warning/info为0；唯一official20,188fast/809src，有限计数调整后原报告ratchet/protected0。文件关闭只来自本卡既有逐文件证据，未扩大到其它pending。见[统一原件与只读复验](../evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/uniform/README.md)。本卡done指本地审查/整改/验收，远端发布不是预先完成声明。
