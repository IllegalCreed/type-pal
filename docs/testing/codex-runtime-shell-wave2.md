# Codex：真实宿主二批（战斗、物品、装备、实体）

2026-09-24。基点aa508566，实现94b59a6f；[任务卡](../ops/archive/tasks/done/TEST-RUNTIME-SHELL-COVERAGE-2-battle-items.md)已done。
用户本轮明确要求Codex独立推进，Kimi/GLM缺签只对本批豁免，不冒充第三方审查。

## 范围与结果

新增4测试文件+1薄fixture+1隔离负控工具；生产、旧测试、旧探针、配置、排除、超时均零改。
28项：H7装备7、H8物品8、H9战斗6、H10实体/切场7；不重领前批36宿主与46战斗会话测试。
前批测空列表或独立会话，本批经真实bootGame、键盘/作者脚本与真实BattleSession连接到宿主world。

| 组 | 新的宿主合同 |
|---|---|
| H7 | 确认前/取消零写；空槽精确扣一件；满槽交换并换回，非空库存哨兵保真；四方向选择实际装备 |
| H8 | 连用→耗尽回列表；合法chance=1门失败零消费及提示；全队直用一次消费；取消与close策略；真实私有脚本wait期间拒重复输入，钱与消费一起保留；缺onTeleport失败；执行期拥有输入；私有脚本切场后不恢复旧菜单 |
| H9 | 公共startBattle精确victory及奖励/战后脚本一次结算；作者脚本等战斗完成后续跑；败北HP=0且只走onLose；真实投掷库存写回；无敌队先拒；资源在途→切场→旧请求AbortError且零迟到战斗 |
| H10 | 绝对/相对定位的持久态+活体双核；move到达端点前不跑后续/不提交位置，到达后精确提交；hide/restore活体显隐；默认/显式loadScene落点；移动期间输入归属及完成后菜单可用 |

fixture复用旧外部宿主，不mock loader/runner/menu/session/结算；工程重新经过正式loader/guard与资产闭包。
原`files`表并不是唯一保真证据：新FileSource边界保存**实际交给loader的对象**（含lazy scene）及交付前深快照，
每项完成后逐对象比较；另比较实际交给bootGame的project纯数据。取消用例finally释放同一gate并消费原启动Promise。
异步失败观察先读同步outcome或非法会话，避免坏实现永不结束时只能靠5秒timeout变红。

Canvas/位图/最小字库仍是非视觉IO适配，提示只证renderer收到了文本；不证明像素、浏览器演出、剧情E2E/Q1/Q2。
不固化满血物品必须拒绝这一未经产品裁决的假设；现行纯回复物品可消费，显式gate失败才是本批失败合同。

## 鉴别力

[可重建工具](codex-runtime-shell-wave2-mutants.mjs)：完整28正控+8针业务AssertionError，
每针唯一源码替换、实际加载marker、确切文件/fullName、exit必须1；判据1正例+12反例自测，拒普通Error内嵌、
混错、timeout、exit2/null、错标题/文件/未执行。每针前后633生产文件hash不变。

- 装备宿主写回移除；物品跨场景close移除；战斗最终背包写回移除；奖励现金+1；战后hook移除。
- 活体定位公共函数移除；移动实际终点偏一格；公共intent断言移除导致旧battle迟到提交。
- **失败探索针保留披露**：仅删`main.ts:3756`投影调用仍绿，因为`:2967`宿主也调用同一定位函数。
  最终针移除公共`entity.pos = {...pos}`，不宣称单删任何调用方都红。battle intent针亦是多个epoch共用的原语。

最终负控日志：`/tmp/type-pal-shell-wave2-mutants-final.log`；完整JSON与日志在
`/var/folders/f3/8n7sqr293cl0rtxknfv8x4sc0000gn/T/type-pal-shell-wave2-mutants-qjuBVH/`。

## 当前树full校准（新增28项之前，不写fast基线）

`TYPE_PAL_COVERAGE_BASE_REF=aa508566 pnpm coverage:full` exit0，8230项/633生产文件，
日志`/tmp/type-pal-shell-wave2-full-before.log`。主壳测试尚未加入该次reforge执行清单（1469项）；
只读校准与开发重叠期间未改生产/旧测试/配置，新测试在该包覆盖完成后才落入测试目录。
源文件和四维分母与fast7893相同；full包含现行PAL测试，不是浏览器E2E。

| 包 | full行 | full分支 | full项数 |
|---|---:|---:|---:|
| shared | 96.07% | 85.31% | 115 |
| content | 90.40% | 82.63% | 843 |
| pal-extract | 65.05% | 64.75% | 299 |
| migrate | 83.55% | 75.12% | 534 |
| reforge | 71.72% | 59.83% | 1469 |
| game | 76.29% | 67.22% | 2375 |
| editor | 81.60% | 71.36% | 2595 |
| 全仓 | 79.13%（55720/70420） | 69.81%（44083/63151） | 8230 |

全仓full语句61874/80452、函数11412/14914。迁移真实PAL已有大量覆盖，不能把fast全部缺口当全新工作；
reforge无额外full用例，本批选择真实宿主仍合理。该表是before，不能加上本批28后冒称最新full。

## 验证与开发失败（不隐去）

- 定向28/28、相邻31文件385项、全reforge164文件1497项与TC通过；完整check8412 exit0，
  既有47 warnings/6 infos不变。官方ratchet与保护aa508566的**单次严格fast7921/633**均exit0。
  Node22.23.2、CI=true/FORCE_COLOR=1、主动注入NODE_COMPILE_CACHE；子进程沿用环境隔离helper，
  严格前后基线hash一致。日志：`/tmp/type-pal-shell-wave2-{check,ratchet,strict}.log`，
  完整命令结果、28标题、8针与21文件增量见[机账](codex-runtime-shell-wave2-evidence.json)。
- 初轮14项3红：两例fixture删除friend却保留第二开局引用，已修第二入口为合法同队；
  一例物品脚本期用`]`切场不可达，已改真实输入所有权断言，不当产品缺陷。
- 战斗fixture初漏明确静音（缺defaultBattleMusic角色导致准备拒绝），现两场景显式battleMusic=null。
- 草稿错误预期已按源码纠正：零经验但战后仍半恢复HP/MP；无升级曲线不建立隐藏池；场景hook完成写游标。
- 满血拒用假设撤销；最初改chance=0又被guard拒绝，最终使用合法chance=1（roll≥1且需roll<chance）。
- 生命周期草稿误写mode/hidden，TC和定向拒绝；现按真实phase=despawned、restore删除条目及活体hidden断言。
- 资产闭包author/runtime类型错用经TC拒绝，改真实projectItemsView，不强转。负控参数化标题最初漏引号被正控清单拦下，按实际fullName更正。
- 单调用点投影探索仍绿详见上；未以重跑多数通过放行。
- full辅助对账第一次误读baseline未保存的identities字段而失败；改按实际identityDigest/fileEntries与报告内
  fast/full identities核验，七包源码/分母/fast摘要/超集全部通过。官方full自身门禁从未失败。

## 官方fast并集（ratchet与单次严格复验通过）

本批净增715行/797语句/118函数/507分支；633生产文件与四维分母不变，另六包**完整基线对象**相同。
Reforge before使用同树full校准（该包与fast均1469项），after为1497项；131文件逐文件分母相同、无任何分子回退。
其中main净增487L/539S/88F/281B，其余增量包括真实战斗/菜单渲染链，非额外独立合同数或像素验收。

| 范围 | 行 before → after | 分支 before → after |
|---|---|---|
| 全仓fast | 53684/70420（76.23%）→54399/70420（77.25%） | 42199/63151（66.82%）→42706/63151（67.63%） |
| Reforge | 10471/14599（71.72%）→11186/14599（76.62%） | 6797/11361（59.83%）→7304/11361（64.29%） |
| main.ts | 1140/3360（33.92%）→1627/3360（48.42%） | 544/2427（22.41%）→825/2427（33.99%） |

main仍缺1733行/1602分支，长期90%/85%目标未达到；未覆盖全部敌对遭遇策略、视频/帧动画和其他宿主分支。
后续仍按真实消费者批量补，不把full已覆盖的迁移分支重复计工作。

## 重跑

```bash
pnpm --filter @type-pal/reforge exec vitest run src/main.equipment-flows.test.ts src/main.item-flows.test.ts src/main.battle-host-flows.test.ts src/main.entity-host-flows.test.ts
pnpm --filter @type-pal/reforge run typecheck
node docs/testing/codex-runtime-shell-wave2-mutants.mjs
# 可选单针：未知名必须失败
SHELL_WAVE2_MUTANT=battle-intent node docs/testing/codex-runtime-shell-wave2-mutants.mjs
```

Node22.23.2；负控子进程使用现行环境隔离helper。不开额外reviewer任务，无下一位Agent提示词；
本卡统一质量门通过后已按用户本批豁免收口，不改其它卡状态；未代签第三方，也不外推下一批授权。
