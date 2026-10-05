# ARCH-REGRESSION-LAB-GLM-1 · 十二组准备包最终接收

2026-09-26；GLM r12候选`62142b16`；Codex补正`34f7bf91`。**本卡回归准备、代表功能视觉和已接受测试接入完成，accept/收口**；不等于架构实现、覆盖率目标或完整E2E完成。

## 逐组裁决与真实贡献

| 组 | 最终接收范围 |
|---|---|
| G01/G02 | 沿用已接收真实手势/会话用例；G01平移取消已由Codex独立三向浏览器重放，不重开 |
| G03/G04/G05 | 沿用真实App保存/卸载、草稿会话和播放wait/stop用例；已入正式集，不再整包返工 |
| G06 | 七递归入口分类有效；G06-08/09/10转正式；G06-11与Codex13项更强路径/输入测试去重。真实choreography漏options已由ebef3d5a修复并随E2进入main |
| G07 | 旧入口跨模块业务链正式保留，D1解环后同样通过 |
| G08 | globalRoots/回调/失败恢复与输出身份已证；G08-07正式副本由Codex补Map深快照、失败前独立正确基准和全输出比较，污染反控业务红 |
| V01 | Codex先前人物/五表单提交undo，加本轮可信Enter+blur一次提交、Escape、数值步进、过滤/关闭/归焦补验；不把单帧截图当完整事件链 |
| V02 | GLM的1280/720实物图与源锚保留；Codex补900合法非空场景/脚本、地图、键盘/指针resize、滚动、隐藏恢复。裁切及残留命中区单列B1，不称布局完美 |
| V03 | 持续500业务错误可见、仍可切换、解除后重选恢复；独立使用可区分红/蓝精灵，旧请求真实pending、15003ms返回后新蓝色预览不被覆盖，再选旧源确为红色正控 |
| V04 | 合法PNG/RLE/地图，fit/1:1与切对象；真实文件导入替换后AssetId/引用保留，三处物品图标更新，undo恢复，分别有实际状态与画面 |

原37项已正式接入，本次再接content3+migrate1=4项，累计41项；隔离候选42项中的G06-11不重复计数。
GLM是测试贡献者，不当作独立第三方自证。Codex主线A3场景/相机WIP未混入。

## Codex自行补正，不再交回小修

1. 生成器漏导入dirname：原候选新鲜运行实际ReferenceError红，补导入后可运行。
2. buildBlankProject已经把地图格式化为JSON文本；生成器再次JSON.stringify使地图变JSON字符串，真实场景页报`projectMap: 期望对象`。已保留字符串原字节，并增加正式validateProjectMap正控。修的是实验工具，不是产品。
3. 宿主增加显式LAB_REPO_ROOT以便对集成候选复验，并限定loopback；默认仍是本工作树。候选原分支未改写，修复在Codex接收分支落盘。
4. GLM两精灵原为同一RLE字节，本席独立fixture给镜像不透明像素改为红色索引，用真实encoder/gzip重建、更新实际bytes/SHA并解码往返核对，增强乱序画面的可鉴别性；仅/tmp测试资源，不生成生产美术。

本席红镜像128B/SHA`020b2a99f8e326813d9aefe06cde3a455f54b39ffc5557216e93b58f06721db5`，正常主角212B/SHA`35c00cea58c8793e696d74463efcafb7cb03b07d1a3f3c460e0e66cea6b7ed3a`。
本席替换PNG为118B/SHA`e2150f76b42dd9df6d5942823b11efb9010dd72d795a66aef8e80a3808f7193c`；不冒称重现GLM页内编码的342B/hash。
独立6017用于冻结产品的错误/乱序，6018用于Cursor集成候选的输入/替换/布局；对应UI生产函数已逐声明核无行为变化。自有内容先过正式作者scene/item/map守卫，未改用户数据。

## 质量门与披露

- r12账75条（72/1/1/1）、所有登记截图完整SHA校验PASS。历史blocked与G06诊断标签只描述冻结树，不当当前未处理产品阻断；GLM回执里的旧main工作树/修复分支位置亦按候选时点理解。
- 合并后隔离候选42/42、六针全部detected；修正生成器1/1。此前已有类型/截图门不为改账重做；本次新工具代码经Biome，主线全仓check包含其lint。
- 与Cursor统一check **8707项**、ratchet与保护8d851fa6的**单次strict-fast 8215项/686文件**全部exit0。较前基线8186新增29=Cursor25+本包4；32新生产模块全部属于Cursor拆分。
- V01实际可信点击关闭后焦点回打开按钮；GLM“回目录搜索框”只作为其当时操作路径观察，不推广。V02隐藏列表后separator节点/8px边缘命中区仍存在，撤销“DOM不可见”泛化。

## 未证轴的明确后续归属

本卡是准备包，原工作包不要求预断每轴缺测，也允许精确登记已有/不可测轴。以下不冒充本次动态覆盖：

- 浏览器原生125%/150%缩放：当前IAB没有对应接口；CSS viewport不是浏览器zoom。归后续功能/E2E环境矩阵，不以此延长本包反复返工。
- G08其余端到端组合归E1迁移治理：globalScriptAliases；palSemanticProfile/palReferenceSchema各组合。下层`translate-events.test.ts:74`已有“当前产品输出stable id；冻结6A输入可正交重放numeric team”，但不冒称mapScenesStatic全组合；源转交点migrate-content.ts:2555-2579、pal-migration.ts:497-500。sceneSemanticSpriteIds已有`world-sprite-layout-registry.test.ts:58/77/96`的严格等价/资源不同/布局不同实测，按existing-proof去重。
- V03本次是对象页读取三态，不是boot首屏失败矩阵。后者仍归B1生命周期/E2E入口；720/900横向裁切及隐藏分隔条可达性也归B1。

这些归属已同步连续治理卡，未删除风险、未降低覆盖门槛。无需再向GLM发整包返工提示词；本准备卡可关闭，后续实现按对应架构项推进。
