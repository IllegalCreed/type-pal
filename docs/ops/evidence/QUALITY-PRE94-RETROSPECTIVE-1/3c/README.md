# CODE3c动画回归与清理合同复审

归[全83卡复审](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)。起点ceda5bb12，main=f98d0ddd8；单Agent、唯一codex/code-quality-3y。原卡done和旧签字按历史保留，本次partial，0新增关闭。

## 原交付与真值边界

完整读取[原3c卡](../../../archive/tasks/done/CODE-QUALITY-3c-editor-coverage-determinism.md)及历史确定性调查。原卡先后提出runner/worker假说，最终却用逐分支差额定位SpriteFrameWorkbench缺帧fallback，并新增一条公开组件回归；不能把早期假说升级为已证runner缺陷。8fea6a4ec的baseline diff可复核：production scope未变，editor测试4682→4683、文件586→587，branches covered24166→24168/29058，没有下调比例。对应完整旧运行raw未在本卡tracked证据中找到；baseline和卡中文字不能代替原命令/环境/exit原件，也不追补伪原件。

起始候选的生产模块及专属测试与8fea6a4ec逐字节相同。本片不改产品、runtime、content类型、资产、coverage配置/规则或baseline。只加强原1例的活动timer卸载合同，保持身份与数量。

| 真值方向 | 直接证据与适用范围 |
|---|---|
| 原版/第一阶段 | N/A：第二阶段编辑器预览的缺帧修复提示和组件清理合同；没有移植SDL帧调度或修改第一阶段机制。 |
| 第二阶段定义 | content/src/sprite.ts:33–47：显式frame/durationMs、无loopFrom为单次。spriteDefinitionFrameDemand注释明确历史声明量可大于真实帧数；预览可展示待修复输入。 |
| 当前真实caller | SpriteFrames全文：真实资产解码/烘焙、revision/alive归属、超出资源声明的提示与共享shelf；world-sprite-action-preview全文把作者动作durationMs映射到holdMs。BattleSpriteInlinePreview及battle组生成器全文：多帧战斗观察面显式loopFrom=0，本例未把它改成单次。 |
| 当前时序/目标 | reforge/entity-action-player.ts:180–238的共享resolver定义0、20、50ms的步骤/完成；Workbench:150–191拥有预览timer并在effect清理。目标是证明现有公开组件fallback、终点停止与活动卸载取消，不是改变越界动作的运行时绑定准入。 |

严格运行时resolveSpriteActionBinding可拒绝越界帧；本例走的是修复预览入口，不能用它声称运行时允许无效动作。输入20/30ms均正有限，frames为两个8×8真实canvas，步序[1,9]故意表示可显示的历史缺帧。固定绿色/红色RGBA是独立oracle，未调用产品resolver计算expected。

## 实际读取、职责与剩余

全文路径/SHA及区间边界见[read-boundaries.json](read-boundaries.json)。

| 文件/读取范围 | 核验与尚未完成 |
|---|---|
| ui/SpriteFrameWorkbench.tsx，全文684行 | 公开类型/选择器/检查器/语义架与私有绘制、reduced-motion、动画effect全文读取；动画复用共享resolver，timer只归本effect，绘制不改静态动作数据，卸载清理当前正确。本卡仅动画切片；拖拽输入各caller、picker焦点调度、所有按钮/多组与reduced-motion分支未完成整文件当前验收，撤回旧“单branch+门即整文件关闭”，继续review。 |
| ui/SpriteFrameWorkbench.animation-boundary.test.tsx，全文原78/现94行 | 原1例真canvas像素与source identity、受控performance/timeout，不sleep；本片在同一动作完成后重新进入，带1个活动timer离开，核queue=0且脱离的canvas无后续绘制。帧初始化进入try、嵌套finally恢复root/host/mocks/globals/真实timers。仍1例、无重复新身份；全仓门未完成，继续review。 |
| 另外三份Workbench测试，全文 | main5例关心结构/交互，C05九例关心MIME/picker/静态像素，GLM四例关心检查器回显；都没有本例的非均匀受控时间、缺帧动画像素与终点队列组合，未发现应退役本例的重复。C05-09标题“互异RGB至少2”与实际opaque.size>=1不符；GLM frameView先fillRect后设color，颜色参数并未影响当前像素。它们未改、未知合同不删，不由本片升级为已验证。 |
| SpriteFrames.test.tsx，全文 | 用mock验证嵌入结构，含as-never asset接口与伪context；不充当真实解码/原生canvas的oracle，不因相邻绿关闭。 |
| entity-action-player.ts / index.ts | 仅分别1–270/1–100及public函数区间，非整份重新验收。共享函数直接调用，不mock业务时间解析；其主测试全文，boundaries此次只执行相邻回归。 |
| SpriteResourceViewer.tsx | 当前520–580直接调用段；完整文件已有C09历史读取，本片不补签当前整文件。其它加载、写回与撤销风险维持原任务。 |

路径前缀packages/editor/src/，content/reforge除外。没有新抽象或跨包helper；本例复用本地JSX完成两次真实挂载，不为测试建立另一套播放实现。全模块进一步复用/内聚审核仍逐文件推进，不能由一次动画证明全部684行架构合格。

## 三枚隔离反控与恢复

[probe.py](probe.py)仅在原目录创建独立模块/测试副本，唯一变动分别是移除fallback、移除finished gate、移除clearTimeout。真实模块不写入；测试只改import指向对应副本，保留公开shelf和真实resolver。无name filter、skip/todo或timeout增大；命令/cwd/exit、源/test/mutant SHA、原生JSON与raw.gz均保存。

- [补证前](before-proof.json)：正常1绿；fallback和finish各1个指定AssertionError；cleanup变异仍1绿，证明卸载清理未被判别。
- [补证后](after-proof.json)：正常1绿；三变异各精确1个指定AssertionError。cleanup失败点为活动卸载后timer数1而expected0；另外两针仍分别在draw调用和动作终点队列断言失败。0skip、0act/环境/navigation。
- 每针finally删除精确副本；另进程[核验](verification.json)校验raw/runner SHA、失败身份与类型、生产/原测试起始快照、所有副本清理及恢复原身份。

[恢复回执](tests.json)：editor八文件36通过/0skip，但BattleSpriteInlinePreview.kimi-workflows中三个用例各2条act诊断，共6条，**相邻零诊断门未通过**。分别为“迟到解码结果不得覆盖已切换的新选择”“record缺失或kind不符”“profile期望不符”；只记录直接观察，不以既有告警豁免。目标单例及三变异0诊断；reforge动作相邻22通过/0skip/0诊断，editor typecheck通过。

## 交接与门

[静态门](gates.md)按实际命令另记。全仓check、official ratchet、protected fast未新跑；完整editor上轮仍有运行时诊断，本次相邻也明确非零。禁止合main、不把测试退出0记统一门通过。没有触碰高风险产品边界，无新增ignore/exclude/强转或规则放宽；0新增关闭，原两条记录改review，机器计数由ledger重跑确认。

下一片CODE3的pal-extract event/type模块，再推进3b/3d等真实交付；C10和94–102的editor诊断返工仍保留。全部83卡当前accept=0，不以3c有限证据宣布专项完成；无下一位Agent提示词，Codex单Agent继续。

本片ledger已原命令重跑确认：3287 inventory /213closed /211review /2863pending。静态docs、phase/content review、lint-zero和diff-check通过，运行时相邻6act仍是未过门项。

## 2026-10-22 原合同当前收口

[本轮逐文件八维与绑定](closeout.json)、[原件/合并漂移证据](closeout-native.json.gz)、[只读快检](verify-closeout.mjs)。原单例及17项源码/依赖同版，三枚旧有效业务反控原件校验通过；最新完整check与official各明确执行该文件1例且零诊断，复用既有结果，不新跑测试/覆盖率。专测接受，684行Workbench继续review；原相邻6act与旧计数原样保留。

原两撤回在89bf84e16合并丢失已补正，再按本轮八维单独接受专测，相对前窗closed净减1。3c按原专属回归合同接受，不授全组件或全runner确定性信用；最终文档静态与集成以父卡和实际refs为准。

本窗最终静态、失败披露和集成进度见[集中回执](closeout-gates.json)。完整check/official fast只按同版原件复用，不因文案/账本整改新采集。快检核证据身份，不替代语义判断。
