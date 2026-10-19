# 批53:editor core 大件 13 文件（零整改批,core 包收口）

范围:`packages/editor/src/core/` 600+ 行生产文件 13 件(item-references 690/project-io 774/map-selection 778/author-save-journal 871/edit-session 876/project-diagnostics 921/playback 972/workspace-persistence 999/command-catalog 1009/project-reference 1341/world-sprite-behavior 1581/project-reference-adapters 1886/script-editor 2153,共 14.85k 行)。全文读毕。八维审查（A–H）全部通过,零源码改动、零 diff。至此 editor core 包 125 文件全量收口(批51-53)。

## 结论(要点)

- **author-save-journal(871)**:崩溃安全作者保存日志——stage 逐 blob 持久化(先登记 receipt 后写盘)/封存计划全文重读校验/planHash 哈希互锁;execute 逐步「观测目标→reconcile→issued 标记→IO→复核→游标+1」;published committed 标记后的失败只作 cleanup warning 绝不重放;publishState 处理 close 已提交但 reject 的丢确认场景(写后重读为真);recoverOwn 只允许原页面(WorkspaceContext 身份+ownerNonce+baseline 三验)。
- **workspace-persistence(999)**:不透明单次写入 capability(brand 类型+WeakMap 真值);target/mutation 相位机(ready/verifying/active/spent,同步转移封并发);PAL 开发基线受控 JSON 指纹(expect→actual 前后核,部分前滚只在精确匹配时采纳);沙盒 marker 作为首个 mutation 在双锁内提交(失败不留 unrestricted 副本);恢复基线只采纳原封存计划目标字节。
- **project-io(774)**:writeProject 点击时冻结输出集;磁盘 catalog 前滚检测强制全量重写;staged→final catalog 两段(内容 JSON 提交完成才收缩);manifest 最后写(旧 manifest 仍指旧 catalog 时物理删除推迟);copy-through 不 JSON.parse 不全量物化;preflight 逐资源 bytes/sha/gzip 魔数/三类 sprite 真解码。
- **edit-session(876)**:不可变工作副本+undo/redo+绑定唯一项目历史(prepare/validate/commit 两段防中间态);地图懒加载 LRU(只淘汰干净文档);mapRevision 单调(封 pointer preview→click 过期窗口);地图引用事实扫描 6 并发 worker+目标时效复核。
- **script-editor(2153)**:canonical 脚本作者态唯一真值;一次命令遍历材料化(visits)供全部派生索引复用;SnapshotCommand 基类(clone→transform→validate→缓存 after);重命名命令跨记录改写(mapAllCommands 重写 select* 引用);受影响记录按历史版本记账(getAffectedRecordsSince 供派生 worker 增量 patch)。
- **project-reference(1341)+adapters(1886)**:紧凑可序列化快照(target/source/relation/locator/whereSuffix 五表编码+默认值折叠 0 哨兵+tail 打包 policy+detail);索引按 target bucket+offsets;deletionScope(deletedWith)防自删除死锁;canonical/legacy 双通道建边严格分流(脚本引用必须走 visit 通道,直接 throw)。
- **world-sprite-behavior(1581)**:有界视觉投影——确定性单路径(once/cycle)/六分支采样策略(不冒充概率分布,循环可终止时拒绝唯一循环声明)/纯 canonical 帧采样(条件只认 chance);三预算(4096 命令/48 tick/16 深度)。
- **playback(972)**:预览控制器双运行时(旧 ScriptRunner/canonical ScriptProjectRuntime scratch world);演出态全 overlay 不触编辑器数据;单步门(gateQueue 不积攒连点、confirm 不代选);loadScene 当演出结束。
- **map-selection(778)**:W8 纯选择状态(reducer 表驱动,replace/add/subtract/toggle);像素命中优先于逻辑格(frame.opaque 精确);stamp 组内编辑上下文独立选区并 clip。
- **item-references(690)/project-diagnostics(921)/command-catalog(1009)**:物品全项目闭包(剧本/商店/入口/技能/敌人/毒/配方/存档,unavailableReason 不伪装可跳转);诊断唯一 orchestrator(一次 revision 全索引共享,status 缓存按 worldVariables 元数据失效);指令目录与 AuthorCommand 词表全对齐(含退役 overrideSceneBattle 注记)。

## 登记移交（无新增）
本批无新清理候选。

## 验证
- 定向测试:src/core 全量 2331/2331、numFailedTestSuites=0（directed.json）。
- 零 diff 批:无源码改动,不适用 body-invariance。
