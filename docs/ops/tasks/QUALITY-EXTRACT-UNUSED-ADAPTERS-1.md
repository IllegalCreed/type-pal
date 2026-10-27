# QUALITY-EXTRACT-UNUSED-ADAPTERS-1 — 提取器旧适配器退役候选

Status: done
Owner: Codex
Reviewer: Codex（单 Agent）
Phase: ops
Capability: extract-api
Visual Verification Timing: N/A（只读候选；未改产品）
Branch: codex/code-quality-94-102

## 目标

登记百文件窗口核到的零生产caller旧出口。用户裁决前只读，不为了减少pending强化无生产路径的旧测试。

## 范围

resources/battle-sprite.ts/test.ts：extractBattleSprites、BattleSpriteOut；resources/parsers/rng-frames.ts/test.ts：decodeRngAnim、RngAnimResult、该模块私有同名RngFrame，以及仅供旧测试的rngBlitDelta重导出。shared/rng.ts真正生产RngFrame和解码器不删。

## 前提真值门

上述四文件全文已读，packages/scripts全部引用已检索。extractBattleSprites/decodeRngAnim仅各自旧测试调用，真实CLI分别通过动画资源阶段/原始gzip管线输出；runtime使用shared RNG解码。旧RNG专测重复shared操作码合同，原盘PNG只验魔数/大小且缺盘skip；战斗专测用两个相同空chunk无法判别复合键错接。上述四文件不因本观察而新关闭。

## 上下文锚点

[百文件窗口](QUALITY-PENDING-100-1.md)、[接口停止线](../../../AGENTS.md)、[八维合同](../code-quality.md)。基点123595ac3a651957b36061eacced329369c495e5。活动英文/SLF范围不涉及。

## 验证

获准后先把每个旧测试合同映射至真实生产资源/CLI/shared入口；仅无生产语义的适配器专属装配断言退役。不能删除shared native/original RNG decode oracle、真实CLI资源清单验证或真正sprite编解码测试。定向/必要typecheck在模块内；官方测试退役/范围变化审查留约100冻结窗口，原件完整保存。

## 当前模式推进记录

最初只读核定后已获下述用户批准；当前三旧入口已退役，合同迁现用writer/shared，代码接受待统一门。

## 交接

用户决策只约束这组旧出口。保留真实生产入口及资源格式/编号/行为，不触存档/主树/规则；未获裁决不删除。

## 同源FIRE补充

resources/parsers/fire.ts的parseFirSprite/FireSpriteOut也仅被misc-mkf、fire.glm专测调用，当前writeFireAssets自行执行YJ2/raw准入并写gzip blob；其encodeIndexedPng重导出没有生产caller。该源及两专测已全文读。候选同组退役旧入口，真实FIRE全表原生RGBA/两帧raw、短输入与空槽合同迁到当前writer/shared入口；不能为退役删去独立原盘oracle。只读核定时尚未修改；后经同次用户裁决完成迁移，见后文。

## 用户裁决与准入（2026-10-27）

用户明确“允许退役并迁移有效测试”。Codex build allowed：删除上述三旧入口及仅其私用类型/重导出；旧测试身份逐一映射至现用writer/shared合同。允许移除旧两个专属测试文件，FIRE原盘golden和空/短/raw/压缩轴迁移至现用管线。真实writer、shared解码规则、资源编号/格式和产物内容不改。若新测试暴露产品缺陷另停线，不借批准调整产品语义。旧引用注释同步，test retirement正式门留约100收尾。

## 代码接受（2026-10-27）

本卡白名单代码/合同与八维已完成，详见共同review.json/native归档。整窗现55主体；retired5路径不计新增接受，源三旧closed从live表移除。14相邻52例、shared RNG22例、extract typecheck及局部Biome零诊断；原反控/超时/格式/暂存前错误与恢复原件均保留。review表示等待约100窗口集中重门和发布，未提交/推送/合并。

FIRE专测从parsers/fire.glm-runtime-resource.test.ts迁到与当前producer相邻的resources/animation-assets.fire.test.ts。仅路径/三个等价相对导入变化，三case身份不变，0额外主体信用；原生旧路径运行和新路径验证分开保留。

## 本窗口本地验收收口

2026-10-28（JST）：100主体八维及本地统一门接受；本次提交时远端PR/CI/合并尚待，发布以受保护PR实际结果为准。 20536包测试＋732工具测试全部通过、七包typecheck和whole lint error/warning/info为0；唯一official20,188fast/809src，有限计数调整后原报告ratchet/protected0。文件关闭只来自本卡既有逐文件证据，未扩大到其它pending。见[统一原件与只读复验](../evidence/QUALITY-TOOLS-CONTRACT-TESTS-1/uniform/README.md)。本卡done指本地审查/整改/验收，远端发布不是预先完成声明。
