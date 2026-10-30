# pre94 工具缩略图、快捷键与L18真实像素测试返工

Status: recorded
Owner: Codex（单Agent，自身源码核证，不冒充第三方）
Date: 2026-10-18
Base: `5d55e2c49a1eb517d4bd51b2814df840dd49052a`
Branch: `codex/code-quality-3y`

## 身份、准入与范围

id: QUALITY-PRE94-RETROSPECTIVE-1 / tools-thumbnail-hotkeys；schemaVersion:1；status:recorded。[父卡](../../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)低风险注释/测试准入。同一模块切片五代码文件：三源原487/1106/1944行、L18原189行、主测原140行全文；[实际边界](read-boundaries.json)区分已修主测、实际caller与primary。三实现仅注释，TS语法及JS同字节，[证明](emit-identity.json)不代替逐文件审查。CODE57只读/像素停止线保留，未改seam、palette、资源管线、save/schema、UI形态或公共接口。

## Caller与primary

main的互斥启动分支→bootstrap→setupToolsPanel→唯一setupMinimap；场景tab mount280CSSpx、widget180CSSpx，backing按DPR上限2配置。bootstrap标准map width64/height128产生2080×2080离屏图，picker默认96宽，小地图传640；缓存键含map/outW、并发2、临时tileset RLE不写游戏LRU。C map加载循环和本地parseMap只支持标准维度事实，SDLPal没有本工具UI，不能伪造其颜色/布局真值。speedrun/index按enabled门实际绑定F8暂停恢复、F4重置、F2覆盖层；tools快捷键页已同此口径，错在bootstrap注释。

源码撤销已列最后两组尺寸/快捷键错注，并修可直接证明的旧AVI stub、DOS splash块号、结局音乐/精灵叠加/等待按键未做、PNG/RLE说明；静态JSON cast不是运行时校验、分类95%无证、同数组原地标签不监听、battleSig非完整checksum也已如实说明。读取完整宿主不等于验证所有异步modal、保存、错误传播或完整启动；未知继续review。

## 测试oracle、排重与隔离

旧L18所谓手算使用被测worldToThumb、玩家颜色也从被测DOT_COLORS取；NPC开关漏反证，另worldToThumb primitive与主测重复。现6例保持：320画布用独立手算定位(156,156)/(233,79)/(79,233)，固定精确RGBA，不用±60容差或整图扫色。NPC/宝物分别关闭时另一类仍在。重复primitive例改自有640canvas的(100,120,320,320)窗口→64canvas，样本(5,5)必须蓝色，误画整图时为暗底。未增加同义弱测试。

控制器保留真实getGs稳定实例与setupMinimap、真实canvas，仅模拟Image IO/帧时钟；call-through监听不替换行为。禁用自有controller、移除自有DOM、消费一次pending rAF后断言0，再精确解绑/恢复偏好/地图号/全局与时钟。等待Image构造是可观察边界，不靠六次盲microtask；坏URL仅用于明确decode失败反例。getter/存储不冒充widget可见性，坏zoom并未验证，旧头注信用撤回。

[三反控](controls.json)分别改玩家颜色、忽略底图crop、忽略NPC toggle；各完整未过滤旧6绿→新5绿1指定业务AssertionError，0skip/pending/unhandled。source/spec/mutant/完整nativeJSON与raw/恢复SHA/精确临时树清理随片，复原后6绿。[两个身份映射](test-title-mappings.json)保留；未改baseline/retirement，不为数量保弱例。

## 当前状态、门与限制

最终2文件20直接、7文件36相邻（9文件56绿）与typecheck-final零诊断；早期6/50/初次lint保留原时点，不覆盖后来主测修改。[最终门回执](gates.json)与完整未裁剪gzip原件列命令/时间/exit/signal/spawn及实际诊断。文档工具未变：早期docs125原件保留，最终五个实际消费者重放及lint-final/ledger见最终回执，不重复工具125。全仓check、官方coverage ratchet、protected fast按用户成本规则留大任务收尾；未跑完整boot/thumbnail闭包、真实tileset/原EXE/视觉/E2E，不合main。

主minimap.test.ts的旧核心强转已改正式GameState工厂、完整NPC必需字段及typed Command，无新增cast。旧L18原点x/y六位精度与(320,0)>origin三谓词已逐项迁入主几何合同，另加X320精确值，详见[迁移实证](geometry-transfer.json)与[第四枚反控](transfer-controls.json)：y=0横移失效时旧主测14绿、新13绿1指定AssertionError。不能只按主题相近就宣称逐断言等价，故在本模块内补完后才交付；两个文件仍review，不认证全部分类/原盘语义。四旧关闭转review，bootstrap原未列pending转review；261closed/82review/2972pending，0新closed。CODE57完整范围和两helper测试已读，仅记partial，当前83卡51partial/32pending/0accept；scopeConfirmed=false及seam/色板/视觉未知保留，其他82对象与历史源SHA不改。

## 交接与下一步

同一模块三个comments-only与两个测试改动先同3y提交推送，fetch确认0behind，不合main。已列十组坏注已分批纠正，但整个专项未完成；法术数值/毒列表/两UI风险继续。下一优先minimap分类/缩放及剩余模块，再继续83卡其余范围；94–102/editor后置。DOM helper/640常量复用候选先核owner与生命周期，不借提取扩大接口。无下一位Agent提示词。

最终实测回执：lint-final为5294文件、0error/0warning/0info；五文档消费者均PASS，ledger-final为3315/261/82/2972。fetch-final成功，提交前origin/main...HEAD为0behind/250ahead；未合main。完整原始字节及命令/时间/状态见gates，不把旧全仓诊断写成已清零。
