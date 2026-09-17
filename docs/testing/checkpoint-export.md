# 当前检查点导出：实现与验证

任务：[Q1-CHECKPOINT-EXPORT-1](../ops/tasks/Q1-CHECKPOINT-EXPORT-1-current-save-hook.md)，r1。
build准入`a5df9fbc`（产品与c1cec3ad一致）；Codex实现，自验证/质量门完成，review待独立终审，未done。实现候选SHA见任务卡。

## 改动与证明边界

- 产品只改Reforge main：内部`enqueueSaveSnapshot`共用原saveSnapshotQueue和真实withSaveBarrier；
  doSave保留原meta/payload捕获、缩略图/写队列/计数逻辑；DEV零参dumpSave返回该队列的Promise。
- [正式回归](../../packages/reforge/src/checkpoint-export.chain.test.ts)与[测试宿主](../../packages/reforge/src/__tests__/checkpoint-export-fixture.ts)：
  抽取真实main函数和完整DEV注册块；使用真实ScriptProjectRuntime、MemorySaveStore、current codec、restore/replaceWorld/commitSceneSwitch。
  资源准备、渲染/音频/auto宿主为内存替身，未执行完整bootstrap、浏览器IndexedDB或PAL剧情；不冒称磁盘/E2E验证。
- 17项：实际注册→JSON→codec→restore；双向深隔离；transient尾标志与persistent安全点next cursor；
  三种并发排列；生产10秒超时/捕获异常后重试；导出零槽/缩略图副作用；慢槽I/O、写失败及慢缩略图；
  排队期间实际restore同步提交；DEV开关与三个motion钩子保持；真实quickSave→captureThumbnail的toBlob成功/null失败及同实例重试。
  最后两项只替换canvas宿主回调，验证Blob/存储/成功提示和并发导出，不声称缩略图像素或视觉通过。
- GLM批二提供B11/B12原始诊断，Codex独立复算并重写正式回归；本卡新测试/产品均由Codex实现。
  GLM另做的编辑器四组尚未集成，其条数不计入本卡。

## 先红与负控制

- 首条真实注册JSON合同在旧产品上exit1：缺projectId/world/position（`/tmp/q1-checkpoint-before.log`）。
  扩展测试宿主后正式回归绿，未保留旧接口fallback、未修改原审计探针。
- [隔离负控](checkpoint-export-mutants.mjs)：`node docs/testing/checkpoint-export-mutants.mjs`。
  实际main.ts?raw加载中唯一替换，校验源码hash不变；裸builder、绕barrier、独立export入口、吞异常、失败毒死队尾各自须业务红。
  无突变为同测试完整正控；拒绝环境/加载错误、零测试、超时和未处理异常作为证据。
- 开发中第一次负控发现timeout测试在突变树过早reject的**断言Promise**延后await产生未处理拒绝。
  改为先挂成功/失败收集、推进假时间后同步判定，不改产品/断言目标。首轮负控日志`/tmp/q1-checkpoint-mutants.log`不作为通过证据。
- 开发中首次typecheck暴露测试deferred泛型形参过宽；收窄为实际仅消费的`Promise<void>`。fixture三处非空断言改为expectDefined，生产既有三条Biome warning不顺手改动。

## 质量门

首批15项及相邻11文件175项、Reforge typecheck均exit0；新增文件Biome exit0。
首轮5项单点负控业务红、完整实现15项对照绿，产品hash前后相同；日志目录
`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/checkpoint-export-mutants-pdn8Yd/`。
首轮完整check exit0，七包7233项，48 warning/11 info、零error；日志`/tmp/q1-checkpoint-check.log`。

首次ratchet确定性拒绝：main的未插桩分母净增2语句/2函数/1行，使reforge的语句8674/16188、函数1373/2416、行7848/14118略低于旧基线；
不是editor抖动，基线未写入、未降标（`/tmp/q1-checkpoint-ratchet.log`）。补测同一被重构保存链中此前未执行的真实quickSave缩略图回调，
核成功、null失败、无成功提示/计数消费、重试以及export不等待/不生成缩略图；并非借其它功能凑指标，也不冒称AST已覆盖main。
补两项后重新完整check→ratchet→单次严格fast全部通过，精确数字见下。可重跑命令：

```sh
pnpm --filter @type-pal/reforge exec vitest run src/checkpoint-export.chain.test.ts src/save src/runtime-save-lineage.test.ts src/save-lineage.chain.test.ts
pnpm --filter @type-pal/reforge run typecheck
pnpm exec biome check packages/reforge/src/main.ts packages/reforge/src/checkpoint-export.chain.test.ts packages/reforge/src/__tests__/checkpoint-export-fixture.ts docs/testing/checkpoint-export-mutants.mjs
node docs/testing/checkpoint-export-mutants.mjs
pnpm check
pnpm coverage:ratchet
TYPE_PAL_COVERAGE_BASE_REF=a5df9fbc pnpm coverage:fast
```

完整check→ratchet→受保护单次严格fast串行；GLM临时覆盖在其独立worktree，不共享官方输出。
本卡不改生产/测试统计范围，不把raw AST执行算作main文件已被V8插桩覆盖；完整覆盖率以官方报告为准。

### 最终树结果

- 17项本卡回归、11文件177项定向/相邻、Reforge typecheck通过；5项负控业务红+17项正常对照绿，
  最终目录`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/checkpoint-export-mutants-EFJ67F/`。
- 完整`pnpm check` exit0：七包7235项（106/557/1130/265/2307/456/2414），文档工具20、覆盖率工具17另计；
  Biome零error、48 warning/11 info为既有项，未放宽。日志`/tmp/q1-checkpoint-check-final.log`。
- 官方ratchet exit0，6747项/617生产文件，提升8项、没有scope移除。
  Reforge：语句8679/16188、分支5256/11041、函数1375/2416、行7853/14118；
  全仓：语句54248/78901、分支38752/61999、函数10242/14509、行48961/69051。
  新增17项以外的105个Reforge测试文件计数/identity逐条不变；六个其他包的完整基线对象不变，七包sourceFiles完全相同。
  日志`/tmp/q1-checkpoint-ratchet-final.log`。
- `TYPE_PAL_COVERAGE_BASE_REF=a5df9fbc pnpm coverage:fast`单次严格exit0，6747/617与ratchet所有整数逐项一致，零回退/零新增提升；
  日志`/tmp/q1-checkpoint-strict-fast.log`。这不是coverage:full或浏览器E2E，本轮未运行两者。
- 主壳`saveWriteQueue.then`至`reportSaveFailure`前的整个持久化/缩略图/计数块相对a5df9fbc逐字一致。

## 剩余验证

R4集中执行的导出文件→新页e2e-load→下一段可操作行为、确认挂起时导出失败/恢复，详见任务卡。
只修基础接口，不声称001–010链、runner或全通关完成。没有新界面，本轮不做逐卡剧情视觉巡检。
