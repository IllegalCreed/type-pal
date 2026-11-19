# CONTENT-SHARD-RETIREMENT-BOUNDARY-1 — 旧脚本分片出口与在用测试分界

Status: draft
Phase: phase2
Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-19
Template: task-card-v1 / 1.0.0
Visual Verification Timing: N/A

## 目标

隔离当前仍在用的脚本引用合同和已退出磁盘格式的旧分片。确定各出口、断言及消费方的去留条件，再申请窄范围实施准入。

## 范围

`packages/content/src/` 下的 `script-library.ts`、`script-library.test.ts`、`script-library.glm-leaf-wave.test.ts`、`script-library.glm-o.test.ts`、`script-library.resource-boundaries.test.ts`。此卡只读取证。相邻编辑器引用、Reforge 运行时解析、活跃 E2E 改写留原 Owner。

## 前提与证据

[当前工程合同](../../phase2/specs/project-lifecycle.md)和[脚本真值](../../phase2/specs/script-system.md)不允许恢复磁盘分片。`toEditorState` 初始化 `scriptIndex` 为 `undefined`，但 `buildScriptReferenceIndex` 与指令表单仍保留旧分支，当前预览与脚本执行继续使用内存引用。Content `checkScriptRef` 确有投影守卫消费；通用 `ScriptResolver` 也有正式运行期接口，不能跟纯旧 `ScriptChunkStore` 整包删除。控制台对象形状不等于被现行项目加载过。

| 原文件 | A 正确边界 | B 注释 | C 内聚与耦合 | D 复用 | E 测试 | F 表达与命名 | G 简洁 | H 可测试性 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `script-library.ts` | EOF 全读。磁盘索引校验、全库写入和实际 ScriptRef 判定不是同一准入；通用键访问仍需边界定界 | “启动时只加载元数据”“编辑器/迁移器”不足以描述 current；先分清旧机制 | 仍在用的引用类型与旧索引、分桶、整库归一化同属一个文件，但不同生命周期 | 保留真实引用和有生产消费者的类型；无需给退役内容做通用 helper | 当前引用判定有调用者；旧 `upsert/remove` 只在测试中调用，定向绿不能证明发布链 | `script-library` 同现行作者库重名近义，侧重拆清身份，不单改文件名 | 看似闲置的出口须按公开范围、运行调用及在飞表单交叉确认 | 纯函数可单独复现；判断余留真实消费要测正式载入/预览入口 |
| `script-library.test.ts` | 既测旧分片存储，也测现行命令、入场、资源及默认动作 | 标题声称统一 library，不能定位现行合同；历史迁移文案保留与否须按现行错误合同 | 应分出仍有生产者的脚本命令和入场校验 | 现有 `projected-script-validation`、`scene-entry-preparation` 和作者验证共享当前入口，重合逐断言比对 | 命令非法目标和入口时序可用；哈希自比恒真，双字段非法未分因，部分归一化检查依赖本函数输出 | 未来按指令能力和分片生命周期归属 | 若退役旧存储，只迁唯一的现行断言，不复制整套 | 正式 guard 可独立调用，旧生成/读取往返不能充当独立真值 |
| `script-library.glm-leaf-wave.test.ts` | Scene/global 路由有可达例；CRUD 为旧索引 | “剩余合同”是历史描述 | 四个用例均绕旧分片，不能混入当前作者库 | 归属、增删、空分片已有更精确边界，错误 chunk 与 namespace 要单独对照 | `toMatch(/^shared/)` 和生产侧分桶查询不能证明落到正确桶；实例未受真实生产者调用 | 模型名与交付阶段不应进入留存文件名 | 多条 CRUD 从同一入口重复退空路径；只在退役决策中精简 | 用合法配置可确定复现；当前准入未知 |
| `script-library.glm-o.test.ts` | 实测无前缀 `s1..s6` 全返回 undefined；所谓直取在名为 `undefined` 的伪分片中扫到 body | 旧“直击未覆盖臂”不成立；排序用例未断言顺序 | 旧分桶、索引和 CRUD 不能成为新作者库合同 | 同轴合法 owner、字节和索引诊断已有资源边界候选 | 一条自比、一条桶数弱断言、隐含强转，正例并未命中声称路径；真重复 id 等断言仍可映射 | `O07`、模型、波次均不是模块职责 | 不保留虚假桶数、幂等没有行为判别的重复用例 | 纯入口可一条命令证伪现有测试设定，无需触碰生产 |
| `script-library.resource-boundaries.test.ts` | 合法旧分片、UTF-8 边界、缺文件、hash 与孤儿引用有独立输入 | Node UTF-8 oracle 来源明示；无正式工程消费主张 | 旧目录完整性与 in-memory ref 遍历需分治 | 可复用真正的当前 `ScriptRef` 用例，不把旧 1 MiB 限制带进作者格式 | 精确拒绝与 1 MiB 双侧保留证据；共址自算结果仍弱，需确认去留 | `resource-boundaries` 混合字节/索引/引用；待职责拆分 | 当前仅随已接受夹具整理切换 import，测试合同不改 | Node 字节 oracle 独立，`@ts-expect-error` 为旧测试已有，未扩散 |

[单一执行归档](../evidence/QUALITY-CONTENT-ASSET-CONTRACTS-1.tar.gz)内 `content-script-index-review.json` 固定五个原文件、相邻读取和测试身份；`content-script-index/` 内是 86 项观察执行及真分桶输入对照。通过只说明现状可运行，不表示旧存储或弱断言接受。

## 验收

在 Owner 交界核定后，对照 TS 引用和正式加载/预览逐出口确认去向。先分开并迁移现行命令唯一断言；旧出口退役需单独准入、有形消费证据和必要反例。遵循当前内容版本，不补旧 upgrader 或 fallback。

## 状态与交接

2026-11-19：原实现与四个测试均留 review，不计本窗口完成数。暂不修改公开出口或活跃 E2E 表单。仅整合既有夹具时发生的一处专测导入迁移有独立回执。
