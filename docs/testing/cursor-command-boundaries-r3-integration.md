# Cursor 八组命令残项返工接收与集成

候选 `a732f7d2dba5401f428cf53ca5df682ec28885f9`，基于 `b6bcc9b4` 的 R1–R3 修订。
2026-09-26 Codex 独立实现接收 **accept**；统一质量门全部通过，核定 **done**。
[任务卡](../ops/archive/tasks/done/TEST-CURSOR-COMMAND-BOUNDARIES-3-editor-residuals.md) /
[原counter](cursor-command-boundaries-r3-review.md) /
[作者回执](cursor-command-boundaries-r3/receipt.md) /
[独立隔离见证](parallel-guard-command-r2-review-witnesses.mjs)。

## 逐项裁决

- R1：crate/vase 用真实 seed hero 字节+正式 AddSprite 登记；敌初态用真实 starter 字节+enemy profile
  登记，再 AddEnemy。现行 assertProjectSaveValid 在实际状态通过，非法 player profile 的拒绝是单轴。
  本席额外插入保存门的两组各4/4绿；不再以原非法初态冒充成功工程。
- R2：map/def 构造前独立深快照，新增图层全内容、manifest、索引与旁对象、undo/redo比较。
  原图层名污染单点变异由原2/2绿翻为1绿/1候选AssertionError。
  共享tileset读取非空实际gzip字节进入pending，catalog/blob独立预期；本席新增“撤销删除共享字节”
  与“apply污染共享catalog”两针，均5项对照绿、突变4绿/1候选AssertionError，源码hash不变。
- R3：八组表已分未覆盖/真不可达；C4如实列后层AssetInUseError重叠保护，不宣称错误放行。
  C8 existing-proof与其余已核项不重开。不将未测防御臂新增为任务范围。

定向+相邻52/52（本包29+相邻23），TC通过；作者五针由本席重跑通过。
日志 `/tmp/codex-cursor-r3-r2-{mutants,directed,tc}.log`；独立五组目录
`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/codex-cursor-residual-r2-Uz9Obl`。
全套独立复跑命令（只改内存加载，不修改候选）：

```sh
env -u NODE_COMPILE_CACHE node docs/testing/parallel-guard-command-r2-review-witnesses.mjs cursor /Users/zhangxu/illegal/type-pal-cursor-command-boundaries-r3
```

## 集成边界

从最新 `origin/main@449adb54` 建隔离集成树，合并候选，仅新增七正式测试/一个fixture与专属文档。
产品、旧测试、资产、coverage配置/timeout/排除零改；不将GLM仍counter的111项或主工作树未完帧动画混入。
保护449adb54，统一串行check→官方ratchet→单次strict-fast全部通过；由Codex归档收口并推送。
功能UI/完整E2E N/A，不用数据命令回归宣称视觉通过。Cursor是测试贡献者，作者自验不替代独立接收。

完整 `pnpm check` 首次执行exit0：9602项/964测试文件；editor3019（主线2990+29），其余六包与
主线一致；TC和Biome通过（70 warnings/7 infos、零error，包含字面量变异针警告，未越界清理旧诊断）。
日志 `/tmp/codex-cursor-r3-integration-check.log`。入口先行docs检查因review状态索引未同步失败一次，
只同步索引后重新通过，正式check未发生测试失败。未运行迁移发布、未改用户工程或6010；
隔离目录只临时链接既有MKF/M.MSG/WORD.DAT、extracted/baked与PAL资产供正式套件读取，没有链接RPG存档。

官方ratchet已通过：9110项/728生产文件；相对449adb54净增48分支、39行、47语句、7函数。
全仓分支45786/63288（72.35%），行57500/70849（81.16%）；editor分支20690/28410（72.83%）。
七包sourceFiles、各分母不变，其余六包完整baseline对象逐一深比较相同；只提高editor与全仓指标。
日志 `/tmp/codex-cursor-r3-integration-ratchet.log`。保护449adb54的单次严格fast **9110/9110**
通过，日志 `/tmp/codex-cursor-r3-integration-strict.log`；按正式baselineView投影并去除生成时刻后，
严格summary与ratchet基线全对象深比较相等（含测试身份摘要、生产清单、七包与总计），没有择优取多数。
本席汇总比对首次误将summary独有的selectedTests/identities也与精简baseline比较，诊断断言失败；
核run.mjs:318-341的正式投影后更正比对，未重跑覆盖或改变任何指标。

## 收口

候选合入提交 `cf40748a1ddf90331fe1da2c82a2082a0f7475ea`；后续仅追加本席证据、官方基线和归档文档，
未改变已验证的产品/测试。R1–R3清零，纯测试卡无用户UI取舍；依当前模式由Codex独立核定done。
GLM另包仍rework、主工作树帧编辑在途测试和full/E2E/Q1/Q2均不随本卡通过。
无下一位Agent提示词，Cursor无需继续返工。
