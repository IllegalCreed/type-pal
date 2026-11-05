# GAME-ASSET-SERVER-READ-FAILURE-1 — 本地资源读取失败的请求与流清理

Status: done
Owner: Codex
Coding Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-05
Template: task-card-v1 / 1.0.0
Phase: phase1
Branch: codex/code-quality-94-102
Visual Verification Timing: dev-functional

## 目标

处理game开发/预览资源中间件在stat成功、实际流读取失败时的错误传播与清理；失败请求收尾，服务继续可用。

## 范围

当前缺陷位于packages/game/vite.config.ts的serveDir。仅涉及本地HTTP读取失败与相关可测试性，不改资源字节、提取输出、schema/save、正常部署或其它包。修复若获准，先补实际流失败的正式红例，再决定必要的内部模块拆分；不为测试扩大产品接口。

## 前提与证据

- 父批[QUALITY-PHASE1-PENDING-93-1](QUALITY-PHASE1-PENDING-93-1.md)；取证基点config为Git 08d67e28ec454d29941f8fab614644c5e160d790；下述旧红在修复前采集。
- 使用已安装Vite的loadConfigFromFile runner加载真实config并捕获其configureServer中间件；没有复制serveDir算法，也不启动/修改现有服务器。
- 正常读取真实battle-fields.json得到9326字节，SHA与原文件相同，exit0、stderr空。
- 只在独立子进程的IO边界模拟stat后文件消失：stat返回本轮自有临时文件的真实Stats；createReadStream仍是原生实现，读取实际不存在的唯一测试路径。原生ReadStream发出未处理error，uncaughtExceptionMonitor记录ENOENT，进程真实exit1。monitor不拦截异常。
- 原件在父批唯一仓外暂存目录的vite-stream-normal / vite-stream-missing-after-stat（command/输入SHA/stdout/stderr/exit）与vite-asset-stream-probe.mjs。临时输入仅1字节，父进程已清本轮独占目录；未写data/extracted或主工作树。

## 验收

本次请求读取失败时报错、释放读取流和响应资源，服务继续可用；正常读取字节、headers及dev/preview行为不变。正式回归须覆盖正常字节、读流失败、客户端提前关闭和后续请求可用，错误不能靠吞异常/只记log处理。按父批窗口集中重型门，不单独开PR。

## 状态与交接

2026-11-05用户批准“修复并补失败回归”。Codex build allowed，唯一Coding Owner；先把真实中间件/原生流反例纳入正式测试，再窄修失败传播与清理。正常探针或其它局部测试不授vite.config整文件关闭；继续逐文件八维和相邻验证。

2026-11-05本地复核：真实dev/preview流4合同原1绿3红→4绿；未发头next(error)、已发头destroy、断连释放源，所有路径核同服务下一请求。正常资源字节/头不变，专用严格类型项目0诊断。完整A–H与原件指针见[父批回执](../evidence/QUALITY-PHASE1-PENDING-93-1/README.md#回合开发落点与资源宿主最后4个原主体)。统一门与集成随父批，未完成前保持review。

2026-11-05有限交付收口：本卡当前合同及获准差异已由Codex据证接受，原失败/历史撤回不恢复；集中组成门和唯一原件归[父批](QUALITY-PHASE1-PENDING-93-1.md)与[回执](../evidence/QUALITY-PHASE1-PENDING-93-1/README.md#集中门最终组成与必要返工)。本地验收不预报PR/main未来结果，发布按同分支保护检查执行。
