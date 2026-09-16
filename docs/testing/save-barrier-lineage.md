# SAVE-BARRIER-LINEAGE-1 · 实现与验证记录

任务：[保存与嵌套脚本活动互等](../ops/tasks/SAVE-BARRIER-LINEAGE-1-nested-script-save.md)，r1。
实现前产品`e13216e7`；build准入提交`11ad25fa`（自身Codex/Kimi/GLM三席设计齐，未用缺签豁免）。
2026-09-17实现完成并进入review，候选SHA由实现提交后回填；不代表done或完整E2E。

## 实现边界

- `runtime-script-project.ts`当前wrapper开战直接以自身身份进入activity包装，再透传原signal给同一个options.startBattle；无父入口照常登记活动。
- `script-activity-lineage.ts`计数改为逐登记的真实lease/coordinator记录；只复用仍在coordinator.active表中的同runtime/exact signal成员，finally精确删除本次记录。
- `script-world.ts`私有WeakMap只作lease→key查询，是否活跃仍由active表对象身份裁决，不拿key存在/instanceof/计数当准入。
  嵌套持久lease仍单独登记；只免除保存gate造成的中途stop，不免除owner epoch检查，也不改变stage/状态机语义。
- 当前与共享基础runtime两条调用面都接入parent准入；独立root保留等待+场景/session复验，同owner busy不等自身保存。
- 产品严格4文件；main、runner语法、content、codec、存储、迁移、GLM四包白名单与原探针未改；SAVE8/content20、F5区域与10秒上限不变。
- 原审计probe冻结旧API/修前预期，不为让旧probe绿而保留旧调用签名fallback；正式回归替代它们作为当前门禁。

## 正式回归（43项；本卡Codex编写）

| 文件 | 数量 | 验收映射 |
|---|---:|---|
| reforge/src/script-activity-lineage.test.ts | 18 | SL-03～07：exact身份三轴、失效/外来/伪造lease、残留finally、重叠登记、父先关闭仍等待子/孙、同owner互斥、多root、epoch与活动存活分离、异常/取消收尾 |
| reforge/src/runtime-save-lineage.test.ts | 22 | SL-01～07：确认保存后开战/双状态出口、无保存正常对照、独立root暂停续跑/排队、busy、transient→entity→hook、多来源失效、实际快照取消断言、失败/10秒超时/重复/同步快照门、基础host现行路径 |
| reforge/src/save-lineage.chain.test.ts | 3 | SL-08：真实main AST开战/出口adapter、onDefeated分支和detached内联执行、exact signal与不清父槽；无父host开战仍等gate |

脚本运行fixture为独立测试内存世界，不声称经过完整loader/current-save codec或浏览器。
主壳测试原样提取AST节点执行，战斗呈现/Session外围由边界替身承接，不是假称跑完整战斗；
onDefeated脚本及canonical runtime是真实执行，快照直接比较实际captured script，不沿用旧B06的optional字段空真断言。
独立入口源码另核：main.startAutoRunner为每实体新建controller，startScript为新主脚本新建controller；没有把所有auto共同使用一个signal的假设带入家族准入。
fixture只在`__tests__`，没有生产导入；未改既有测试或放宽断言。

## 先红后绿

先只落fixture与首批3项，产品仍e13216e7：`runtime-save-lineage.test.ts` **2红/1绿**。
两红分别是确认保存后开战/内联出口首次保存超时，错误为`script save barrier 超时 10000ms`；独立root正确暂停对照绿。
测试以受控confirm和Vitest假时钟推进同一生产10秒计时器，不靠机器睡眠/抬超时制造结果。
实现后同3项全绿。扩展最终3文件43项通过；连原runtime/script-world/runner与WORLD换图/预检共8文件127项通过；Reforge typecheck exit0。

```sh
pnpm --filter @type-pal/reforge exec vitest run src/script-activity-lineage.test.ts src/runtime-save-lineage.test.ts src/save-lineage.chain.test.ts src/runtime-script-project.test.ts src/script-world.test.ts src/script-runner-core.test.ts src/world-async-commit.test.ts src/scene-preflight.chain.test.ts
pnpm --filter @type-pal/reforge typecheck
node docs/testing/save-lineage-mutants.mjs
```

## 单点反控

[可重建入口](save-lineage-mutants.mjs)：1个完整43项正常对照绿，8针全部唯一源码替换、load命中且业务AssertionError红，
拒绝把无用例/模块错误/超时/unhandled rejection作为负控证据；磁盘源文件前后hash不变。

| 反控 | 拦截的错误 |
|---|---|
| wrapper-key | 回到retainedHost身份，开战子链重新等自身保存 |
| wide-admission | 无父持久root越过保存gate |
| premature-child-stop | 嵌套出口to链提前停，缺childEnd |
| stale-registration | 仅凭残留登记而忽略live成员资格 |
| exception-lease-leak | 抛错后未关闭transient lease（直接核成员资格，不依赖超时红） |
| stale-epoch-write | owner已失效仍提交旧cursor |
| forged-parent | begin接受已关闭/外来/伪造parent |
| key-not-identity | owner key相同就冒认旧lease仍存活 |

## 质量门与范围对账

- Reforge定向8文件127项、typecheck、改动文件Biome、diff-check已通过。
- 全仓`pnpm check`：最终exit0，七包7,079项（79/488/246/432/1113/2307/2414），文档工具20项与coverage-tools17项；0 lint errors，既有48 warnings/11 infos保留。
- `TYPE_PAL_COVERAGE_BASE_REF=11ad25fa pnpm coverage:ratchet`：exit0，只升不降更新；随后同保护基线`pnpm coverage:fast`单次严格运行exit0。
- fast **6,591项 / 617生产文件**，相对6,548新增恰43项；旧测试文件/identity digest逐项保持，生产文件清单完全相同，零范围移除。
  除reforge外六包基线对象逐字相同；reforge行7,680/14,089→7,848/14,117、分支5,149/11,021→5,252/11,041、
  语句8,494/16,158→8,674/16,186、函数1,337/2,413→1,373/2,414。未改include/exclude/provider/超时/阈值。
- 全仓fast行48,509/69,050（70.25%）、语句53,749/78,899（68.12%）、函数10,209/14,507（70.37%）、分支38,576/61,999（62.22%）。
  未跑coverage:full，不把历史PAL完整口径当本次结果；最终覆盖目标尚未完成。
- WORLD实现终审与GLM四包返工是独立任务；本卡不替它们标done、不把其未集成测试算本卡增量。
- 旧版本兼容审查：无新版本分支/升级器/content或存档token；lineage旧签名直接替换，不提供双协议fallback。

日志根`/tmp/type-pal-save-lineage-build.CpRUZH/`：`before.log`、`first-green.log`、`targeted.log`、
`typecheck-final.log`、`mutants-final.json`与`mutants-final-progress.log`；每针独立日志路径在JSON中，入口可重建。
全仓日志：`check-final.log`、`ratchet.log`、`strict-fast.log`。运行按check→ratchet→严格fast串行，未取多数放行。

### 实现期失败记录（不删去）

- 一次apply_patch因同文件Delete/Add重复操作、一次因格式化后上下文不符被工具拒绝；未部分应用，不是产品结果。
- `lineage-tests.log`：21项断言绿但1个unhandled rejection，来自测试取消barrier却未消费ready rejection；修复测试观察端，再跑无该错误，未放宽Vitest门禁。
- `typecheck-expanded.log`：Base fixture自引用推断TS7022/7023；显式类型后，`typecheck-chain.log`暴露通用RuntimeCommand过宽TS2322；将fixture的flag/confirm收窄到真实叶类型后最终tc绿，没有ts-ignore/ts-nocheck。
- 首次反控前7针符合预期，第8针因needle在hasActiveLease与finish出现两次被唯一性门拒绝；收窄为完整return句，最终8针全跑，不把原工具错误算成功。
- 首轮完整`check.log`七包7079项通过，但最后Biome报新增测试类型标注处1个缩进错误；修正后完整重跑`check-final.log`exit0，未关闭规则或跳过lint。

## 延后验证与剩余风险

SL-E1～E3已在卡登记，由Codex在R4/Q1集中验证确认框F5→短战斗/出口→保存读回，真实长战斗超时后重试及取消/换会话。
本次没有浏览器视觉、PAL剧情邻接证明、完整战斗/存档磁盘E2E；不扩成U-02全局finally修复。
exact signal是当前内部家族合同，不保证把刻意共用同signal的外部调用按JS调用栈区分。
barrier.ready后额外parent仍需active身份，理论不可达的内部防御分支不通过伪造私有状态强刷覆盖。
