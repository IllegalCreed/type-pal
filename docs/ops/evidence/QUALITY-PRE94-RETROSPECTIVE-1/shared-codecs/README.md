# shared MKF/RNG/YJ2 收口窗口

Owner: Codex；分支 `codex/code-quality-3y`；基点 `bee8587f4f31c06f8eb3a4d158ae8195e9beb145`。
当前CODE2/2b accept：11文件八维成立，6新关闭、5既有关闭不重复计数；固定83卡53accept/30partial，不扩展94–102。

[逐文件A–H/依赖与失效条件](evidence.json)、[完整原件](raw.json.gz)、[只读快检](verify.mjs)。
复用[CODE2](../2/README.md)、[CODE2b](../2b/README.md)和GLM三个foundation八维记录，
当前AST/SDLPal源/15个raw输入与native日志SHA匹配；未重跑2373chunks/1464frames/2626segments全量对拍。

本轮只补具体缺口：RNG后加8字节连续delta弱子集删除，完整320×200 MARK-plane例保留；
同一skip清面变异失败集合4→3，恰少退休身份。YJ2增加一个独立树归约固定向量，禁用本轮归约时恰1个字节AssertionError，
9个其它例保持绿；恢复后shared114/114。extract18、game RNG31相邻零stderr。
YJ2算法正文未改，只纠正自适应/位偏移/脆弱引用等注释；精确退役表只登记17→16/双身份与当前SHA，谓词不变。

[独立fixture产生器](native-fixture.py)只在自有临时目录编译/执行：取未改SDLPal树函数，
编码32600个A及随后424个`(i*17+23)&255`字面，原C decoder核全部33024字节，恰过一次权重归约。
fixture不是TS编码/解码自比，也不是新资产管线；正常测试不依赖C工具链。未执行原PAL.EXE或视觉/E2E。

O-5继续作为适用域限制登记：u32损坏头可请求大分配，未实际分配/未发明cap；
原卡排除任意上限，当前核过固定raw cohort最大65536不等于格式上限。
接入任意上传/外部资产前必须重新核支持尺寸和可信边界，当前不认证任意恶意输入安全。
RLE格式风险/混合RLE文件、shared类型与广域caller仍保持各自review。

快检（只读、不跑测试或coverage）：`node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/shared-codecs/verify.mjs`。
定向：`pnpm --filter @type-pal/shared exec vitest run src/mkf.boundaries.test.ts src/rng.test.ts src/rng.boundaries.test.ts src/yj2.boundaries.test.ts --reporter=default`。
相应源码/caller/依赖/输入域或oracle变化使相关claim待复核；只读快检验证身份与原件，不能证明设计质量。
模块冻结后check20386、official ratchet19988、针对新baseline的protected fast19988全部零诊断；未降规则或基线。末轮文档/静态与Git同步见同一回执。
