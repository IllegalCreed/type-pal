# CODE3w结算复审

Status: recorded
Owner: Codex（单Agent核读与执行，不冒充第三方）
Date: 2026-10-18
Base: `9bc478671044f2dff222581b6326884694e5b9e2`
Branch: `codex/code-quality-3y`

## 范围与实际证据

[父卡](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)的低风险准入；实现原246行与专测原259行均全文，当前实现/专测全文核读。完整原字节见[before-sources](before-sources.json)，当前SHA/行数与限定读域见[read-boundaries](read-boundaries.json)。真正caller是startBattle安装资源与mode、tickBattle won首tick建屏、顶层dialog→settlement hold；progression只提供数值结果。SDLPal battle.c:991–1373逐段核，play.c:603–681核清键；这是C参考验证，未跑原盘。原[清理/runtime片](../3u-3w-finalization/README.md)只保留其既定证据，不代替本轮脚本/整卡验收。

## 修改与测试质量

实现只改事实注释：Phase C/E/F owner、逐人主升级→隐藏涨点→练成、C的#if1恒真恢复、TS首tick残键防护与C清键的边界，以及0x89可直接置won，不能断言所有胜利全敌已死。类型/执行JS相同，不改产品机制、UI/API、save/schema、资产、phase2或baseline。现有小模块职责清楚：数值在progression、显示等待在settlement、资源/事件接回在cleanup；未把相邻所有职责复制进本模块或擅自扩大公共出口。

专测复用H的纯typed资源工厂，改走正式default/hydrate→projection→startBattle与真实core RNG，未复用未hydrate的makeHBattle或仿PRNG。截取合法won状态边界，不宣称实际打完整场。两角色[1,0]校验屏的roleId/名字/次序；普通74+1与Boss137+1离散tick，实际pressed/held/Menu与每屏残键；真实Phase E脚本入队→宿主active box→skip/line-done/end-key→恢复和释放，既有模式/autoBattle/resource从非终值开始。无对话脚本用公开runner透传观察前值，业务仍执行真实解释器。只用局部GameState/Set/Bus，无全局spy、IO或监听残留。

[迁移与排重](assertion-transfers.json)：旧5→新8，拆混合同、补判别力，无整例退役；旧timeout五类型、cash/index/时长、HPMP写回、level/hidden/learn、PhaseE一次及半恢复/退出断言逐项保留。相邻已有exp0 cash/defeated-return-IP不再新增独立重复用例；数值公式/装备快照留progression。测试仍有明确限界：timeout helper只测typed DTO时间元数据，不能当数值/绘制验证。

## 实测与反控

[六反控](controls.json)：颠倒队伍屏序、宿主忽略Boss超时、held冒充pressed、忽略active box、漏释放runtime、只回写首队员。每枚完整未过滤旧文件5绿，新文件7绿1指定业务AssertionError；command/cwd/身份集合、原生JSON/raw及hash、变异源与精确恢复/临时树清理齐全。[精确控制输入](control-sources.json)冻结当时源码；随后只补0x89注释，独立验证发射JS相同，最终模块另实跑。

[实际门](gates.json)：7文件229绿（8直接/221相邻），game typecheck；静态消费者、lint/ledger以本目录最终回执为准。[原生附件](native-archives.json)与全部未裁剪gzip raw保留。早期direct的1红来自测试作者误读dialogBox.text，改真实currentLineText及关框时序后绿；没有对应产品修复，不能冒充先红。该早期草稿未捕获精确源码快照，明确不授有效反控信用。

## 当前结论与继续范围

两旧关闭撤回review，0新增closed；3317 tracked/251 closed/101 review/2965 pending。83卡仍55partial/28pending/0accept，仅3w证据指针变化。脚本副作用/异常、特殊脚本胜利的完整生产影响域、极端数值/资源容量和结算视觉未全验；非队员Extra归原draft，不拿手搭状态冒充剧情缺陷。

完整check/official coverage/protected按用户要求留大任务收尾，本片不跑全game/原盘/E2E/浏览器，不合main。下一批可直接核3w战后脚本真实影响域或pre94 40/41；94–102/editor继续后置。无下一位Agent提示词，Codex单Agent继续。
