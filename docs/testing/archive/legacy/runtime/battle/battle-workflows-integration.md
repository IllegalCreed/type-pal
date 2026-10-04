# 战斗流程 r5 统一集成与质量门

2026-09-24，Codex。源候选 `fd4efd76`，合入 `2ba3142f`；保护基线 `f9daa84b`。
GLM 是46项测试贡献者，Codex独立接收/集成；用户明确豁免Kimi本候选终审，未代签其accept。
设计r1不重签，原counter均已关闭。原实现9测试/fixture文件与源候选逐字一致；所有生产文件零修改。

## 已完成

- 完整 `pnpm check`：**8363项**，exit0；另含文档工具20项、覆盖工具27项。既有47 warning/6 info未扩大。
- 官方ratchet：**7872项 / 633生产文件**，保护f9daa84b，exit0。
- 单次严格fast：`CI=true FORCE_COLOR=1 TYPE_PAL_COVERAGE_BASE_REF=f9daa84b pnpm coverage:fast`，
  **7872/633、exit0、相对新基线0变化**。严格跑前后基线hash一致，无择多数放行。
- 其它六包完整基线对象不变；生产集合、四维分母、排除/超时/阈值、旧测试与历史反证不变。
- 按本卡Codex接收accept + GLM实施者自验 + 用户Kimi豁免及完整门禁，done准入满足，由Codex统一收口。

详见[机账](battle-workflows-integration-evidence.json)、[r5接收](battle-workflows-r5-review.md)。
本地通过不替代远端CI结论；未跑浏览器E2E、full覆盖率或Q1/Q2。

## 官方覆盖率（四维按整数计数比较）

| 范围 | 行 | 语句 | 函数 | 分支 | fast项数 |
|---|---:|---:|---:|---:|---:|
| Reforge | 71.72% | 69.01% | 69.44% | 59.81% | 1460 |
| 全仓 | **76.23%** | **74.05%** | **74.26%** | **66.81%** | **7872** |

相对已纳入真实宿主包的7826基线，净增 **97行 / 121语句 / 13函数 / 82分支 / 46测试**；
不是把不同批次局部报告直接相加。四生产目标贡献分别为session +48L/+54B/+8F、anim +49L/+27B/+5F、
core +1B，hook无净增；回归断言价值不等于覆盖率大幅提升。未达到全仓长期90%/85%目标，不夸大本批收益。

## 如实保留的两次检查中断

1. 合并后将卡推进review，漏更新生成索引，首次check在文档门exit1，未进入代码测试；
   已同步索引再完整重跑。日志 `/tmp/type-pal-battle-integrated-check.log`。
2. 第二次check中game两测试套件无法导入：本地音频库链接仍指向不存在的spessasynth_core4.3.22，
   锁文件固定4.3.20。普通冻结安装未修复，`pnpm install --force --frozen-lockfile --offline`
   重建为正确4.3.20；package.json/lock零变，原两套件2/2通过后再次完整check绿。
   不是改测试、放宽断言或重跑碰运气；日志 `check-final.log`、`install-force.log`、`env-control.log`
   共用 `/tmp/type-pal-battle-integrated-` 前缀。

最终全仓/ratchet/strict日志分别为该前缀的 `check-green.log`、`ratchet.log`、`strict.log`。
后者NO_COLOR/FORCE_COLOR共存仅产生环境提示，不改变exit0或门禁判据。

## 下一批建议（尚未开新卡/授权build）

最新报告与基线逐包/逐源对账通过；缺口是候选量，不保证全部合法可达：

1. **Codex：Reforge真实宿主第二批优先。** main尚缺2220行/1883分支。
   从 `main.ts:2202/:3352` 的真实进战斗→结算写回、`:6498/:6522` 非空装备/道具操作，
   以及`:3244`实体命令/取消接线选完整业务族；复用已合法化的真实loader/宿主，
   不重做首批36项，不靠mock掉业务或私改闭包刷行。必要功能界面视觉仅由Codex做，不等于剧情E2E。
2. **GLM：迁移主链先核full已有证明，再补自包含缺口。** migrate-content缺851行/1092分支，
   pal-assets缺361/225，pal-migration缺218/133；调用者分别有pal-migration:405和正式发布链。
   当前full报告还是9月12日6673项/618文件，不能与本次7872/633直接比较。
   先同树校准full/fast并去重，把“已有PAL回归的输入解耦”和“真正新增合同”分开；只操作临时fixture，
   不写真实工程、不改迁移政策、不重领已done TB批次。
3. **后续排一阶段bootstrap真实启动链，再扩编辑器大界面。** bootstrap尚缺633行/270分支，
   当前两专项仅调用palette/audio helper；真实caller在game/main.ts:56/:75。
   dev-panel虽缺1005行但优先级低于真实游玩入口；无caller审计模块不因低覆盖就补续命测试。

每包先核一个合法夹具+有鉴别力的负控样板，再连续扩成整包；开发中仅定向/相邻，封版后串行统一门禁。
原长期目标和高风险95/90目标不降；不按用例数承诺覆盖收益。新卡需独立准入，本卡Kimi豁免不外推。

无下一位Agent提示词：本卡收口；以上是下一轮提案，待用户选择后开卡，不默认启动新实现。
