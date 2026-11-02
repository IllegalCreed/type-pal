# C02 导入与历史回流：稳定模块窗口

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-31
Template: audit-report-v1 / 1.0.0

## 审计问题

原审计主题:C03精度检查点提交(addf1dca1400cf864535ce4b67257ab0adcdcb5e,推送两条治理分支后)在六份源码字节冻结的稳定窗口集中运行完整门,并裁定本片能否关闭/合main。审计对象为C02四文件(battle-sprite-ui.ts与G01/G02/G05三测试)及官方fast基线;protected main为f98d0ddd89ebdee7b04502ee35de26ee82c6d246。生产/公共API/schema/save/资产管线与生成物未改。

## 范围与证据

三门原件:pnpm check(406.2s)、pnpm coverage:ratchet --allow-scope-removal(379.17s,既有专属参数,仅确认已审计范围精简)、pnpm coverage:fast(365.07s),全exit0;数值、字节与SHA见同目录window-proof.json(单票window-check/window-ratchet-confirmed/window-protected)。范围证明scope-proof.json(19861→19860,唯一变化G01 10→9)、源码冻结window-snapshot.json、落盘后静态门postflight.json、剩余诊断逐文件归因diagnostic-census.json。

## 发现

三门全绿:七包1640文件/20269测试通过(editor631文件/4946测试、game318/3564),七包typecheck通过,check内lint4184文件0error/0warning/0info;C02/C01匹配stderr=0。但unwrappedAct 1501/1466/1422、unsupportedActEnvironment 577、navigationDiagnostics 2非零:严格统一零诊断门NOT PASSED,禁合main。剩余诊断头部归因(见diagnostic-census.json,最近stderr头启发式)为BattleSpriteLibrary.kimi-workflows(399)、WorldSpriteLibrary.kimi-workflows(204)、ImageTab.kimi(140)与LevelingEditor(118)/LevelCurveEditor.ui(115)/CasualtyEditor(101)等environment项;C02三文件已从归因表消失。官方fast基线736源文件/19860测试(editor4784),前后SHA b7de8663bf2e→462ddc75f0;四项覆盖分子/分母与生产范围全同,实际精简仅G01 10→9。逐文件:battle-sprite-ui.ts等待真实history/新notice/实际cache,535→23→0消融成立、bitmap-only旧归因已撤回;G01真实reader在交付前闸住pending窗口,移除proofReady守卫后01/08各恰一AssertionError,原02 oracle全部迁入03,最终9例;G02十例(取消重开/9→10帧恢复/坏PNG/同字节异用途/id前缀/选择与字段ownership)保留;G05十条历史回流保留并以canonical BattleSpriteProfile判别联合取代unknown强转。

## 结论

本片0关闭、四文件仍review、未合main;账本3284/229closed/54review/3001pending。exit0与全绿不等于零诊断:统一零诊断门不通过前不合main;CODE94/95/97–102仍按各卡处理。判据、拒绝测试与静态规则未放宽;定向29例与相邻9文件77例完整0skip/0诊断,首次相邻误写过滤名(7文件69例)不计完整相邻。历史结论保持原时点,不因本治理改写。

## 整改与复核

本轮治理只承载本报告语义并保全原件;未重跑三门与任何测试。宿主历史pending-promise导航与异常清理fault injection、未知跨文件重复仍待核。下一可直接继续:BattleSpriteLibrary.kimi-workflows,先新开有限白名单、复用C02真实宿主并核六例oracle,未知重复不删;其它导航/World候选只是已读线索,不是已验证根因。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3481B / SHA-256 f4179939b1ddee4930bb79de67b3dd9e03945bfa0745c1f15512c59136303700；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# C02 导入与历史回流：稳定模块窗口

源码候选 `addf1dca1400cf864535ce4b67257ab0adcdcb5e`；protected main `f98d0ddd89ebdee7b04502ee35de26ee82c6d246`。

本片四文件仍review、0关闭。生产/公共API/schema/save/资产管线与生成物未改。

| 门 | exit | 未包act | 环境 | 导航 | C02/C01匹配stderr |
|---|---:|---:|---:|---:|---:|
| pnpm check | 0 | 1501 | 577 | 2 | 0 |
| pnpm coverage:ratchet --allow-scope-removal | 0 | 1466 | 577 | 2 | 0 |
| pnpm coverage:fast | 0 | 1422 | 577 | 2 | 0 |

七包1640文件/20269测试通过，editor631/4946、game318/3564；七包typecheck均通过。
check内lint4184文件0error/0warning/0info；原始字节、SHA、源码冻结与诊断计数见window-proof.json，落盘后的静态门另记postflight。
官方fast736源文件/19860测试（editor4784）；前后基线SHA `b7de8663bf2ef950210e329e4d067a0ad2d94ac0ba7c50a6ff8ca227ed5b641f` → `462ddc75f0bdde8cfa1f168669c08f44b9cc145452eb1dd7c79172bf4299e433`。
四项覆盖分子/分母、全部生产范围与其它包对象完全未变。实际精简仅G01 10→9；精确身份与文件SHA登记匹配。
ratchet使用既有仅确认范围精简参数，确认这一条已证oracle转移；普通protected未加allow参数。判据、拒绝测试与静态规则未放宽。

## 逐文件结论

- battle-sprite-ui.ts：等待真实history/新notice/实际cache工作，点击一次、轮询只读；raw helper返回当次结果。全文与生产异步边界已核；原30例535→23→0，bitmap-only535的旧归因已撤回。异常/取消与全库未知排重仍review。
- G01：01/08真实reader在交付前闸住、见证已进入/未交付与应用禁用；移除proofReady守卫后各恰一AssertionError。原02的改名/应用/history oracle全部迁入03，同一12→10外部缩帧；原03在草稿mutant下漏报，原02和现03准确红。其余8例业务轴保留；最终9例，不把其它可能重复自动删除。
- G02：取消重开、9→10帧恢复、坏PNG恢复、同字节异用途、id/前缀、选择与字段ownership十例保留；异步提交与撤销走真实完成信号；头注不再声称未经本轮全库核实的新颖性。未知跨文件重复保持待核。
- G05：十条历史回流保留；unknown强转改canonical BattleSpriteProfile判别联合。每次undo/redo实际通知进入act，资源修订等待真实预览；头注只描述本文件合同。未由数量或包绿升级闭合。

定向29例与相邻9文件77例完整0skip/0诊断；首次相邻误写两个过滤名只跑7文件69例，原件保留，不算完整相邻。
隔离反控仅改临时副本，不改工作树产品；cleanup后重新从生产字节构造mutant并核所有raw/runner SHA，见oracle-rebuild.json。
真实读取范围/SHA见read-boundaries.json；下一片只读准备见next-read-boundaries.json。Primary为React官方act，阶段约束为phase2 READ-FIRST。
未运行剧情E2E或视觉（纯测试N/A）；root check内E2E工具单测不充当剧情巡检。

机器3284 inventory /229 closed /54 review /3001 pending，0新关闭。统一零诊断门不通过，未合main；CODE94/95/97–102仍按各卡rework/review。
下一可直接继续：BattleSpriteLibrary.kimi-workflows，先新开有限白名单、复用C02真实宿主并核六例oracle，未知重复不删。其它导航/World候选只是已读线索，不是已验证根因。
无下一位Agent提示词，Codex继续用户目标。
```
<!-- incremental-original-source:end -->
