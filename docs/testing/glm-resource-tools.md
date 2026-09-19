# GLMRLE、事件与资源工具补测工作包（TB-05）

任务：[TEST-RESOURCE-TOOLS-COVERAGE-1](../ops/tasks/TEST-RESOURCE-TOOLS-COVERAGE-1-rle-events-font.md)，r1/draft。生产冻结 `e58834f6389a40ffe9f187e6a8051f552e964d79`；策划树 `4473c367`。
共同准入、负控、覆盖和隔离规则见[七批统一审核](glm-coverage-remaining-review.md)；本包只增测试，**未获build授权**。
表内为已按调用域筛选的候选，不是已经完成的新增覆盖；允许去重后减文件/减族，不设必须凑足的用例数。

## 合同族与去重

| 族/目标 | 当前调用/一手锚点 | 旧测试已覆盖 | 允许新增候选 |
|---|---|---|---|
| R01 shared/rle | reforge/assets:571、editor/project-io:660；PAL宽容入口game/tileset-blob:55；SDL palcommon:803–851 | rle.test：palette0 opaque、无sentinel、末尾sentinel、空洞、坏尾之后可解帧/重复offset拒绝 | 手列严格容器字节核完整pixels/opaque/report；有界零长度指令后跟合法指令、段越界/尺寸/offset单轴及相邻正控；精确区分canonical与批准profile |
| R02 shared/rle-encode | editor/seed-assets:116、SpriteUploadWizard:244、TilesetTab:419 | rle-encode.test.ts：长run、奇长pad、多帧、128KB | 合法126/127/128透明/实心run独立字节oracle；三帧奇偶组合的WORD offset和pad0完整字节，不只自家codec往返 |
| R03 events/disasm | cli:260；emitGiveItem:190–196；SDL script:970–975 | giveItem、13条件跳转、非0style、loadScene往返 | 8B literal向量：count 0x8000/0xffff保持32768/65535；messageIndex、raw三operand、entry与jump同目标去重；完整命令与原输入保真 |
| R04 events/recompile | cli:263，输入是disasm平面输出 | 单条往返/end advance/reset/空列表 | 手构当前producer可出命令，对独立字节；同文本不同messageIndex、合法labels/frameDelay、raw/style/u16全位模式；实际输入深快照 |
| R05 events/annotate | cli:270唯一caller，平面disasm输入 | _item、symbols优先、scene不取WORD、raw不注释；旧递归测已有 | 平面命令不串注释与输入保真仅在确有断言增量时新增；可以整模块记已有，不强制文件 |
| R06 events/slice | cli:271；game/loader:165/bootstrap:597、migrate/pal-migration-io:38/46 | shared goto、advance/reset、randomJump、13跳转 | globalEntries独达/与单scene重合仍shared；循环只收一次；enter/teleport/EO边界及最后scene；完整scene/shared命令与goto重写，raw数字operand不改 |
| R07 resources/palette | cli:729；SDL palette:66–82 | VGA63→255、全零、cycles | 768/1536合法输入，非对称day/night完整256×3；768无nightColors键；byteOffset，**不称与SDL逐色一致** |
| R08 font/bdf-to-json | cli:875–876，当前Unifont8/16宽；parser:30–34 | 两例8/16宽，但部分字节断言 | 两字形完整bitmap，LF/CRLF/空白等价，glyphsToJson完整count/字段/base64；不验像素观感 |
| R09 resources/asset-manifest | cli:883；asset-manifest:29–40 | 聚合/自身/任意目录DS_Store | 真实mkdtemp树多层/零字节/中文/二进制精确清单；根self与子目录同名区分；原entries不变；独立path:size序列hash |

## 收窄与隔离

- parseSpriteChunk是宽容压缩结果，parseSpriteChunkStrict/parseIndexedRleChunk才严格拒洞；不能依据旧注释要求所有入口保槽。
- decodeRle skipFilePrefix:true、deprecated parseWorldSpriteChunk alias、annotate sequence/if/choice没有本轮证实的生产调用，不扩测保活；不对宽容decode喂无界随机坏流。
- 结构化recompile/缺失label默认0、未定义operand尾、半夜色palette/非法BDF/BBX offset均不立新政策。
- asset-manifest实际version键为path+size，不是文件内容hash；同长度换内容的缓存风险不是本测试卡修复授权。symlink递归政策另行处理，fixture禁止创建指向根外的链接。
- YJ2两个后续政策与已done foundation139保持原归属，生产导出/编码器内部构造必然式不为覆盖强测。

## 代表性负控

至少6族：严格RLE有界拒绝、编码127分段/offset独立字节、u16/messageIndex、globalEntries归属、night偏移、FS递归/根self过滤；BDF第二字节与平面annotate原地污染可补。
正常对照先绿；精确本批标题业务红，不能依靠TypeError/超时；真实FS只在每例自建mkdtemp根，收尾仅删所建根。

## 冻结目标（不允许修改）

```text
packages/shared/src/rle.ts
packages/shared/src/rle-encode.ts
packages/pal-extract/src/events/disasm.ts
packages/pal-extract/src/events/recompile.ts
packages/pal-extract/src/events/annotate.ts
packages/pal-extract/src/events/slice.ts
packages/pal-extract/src/resources/palette.ts
packages/pal-extract/src/font/bdf-to-json.ts
packages/pal-extract/src/resources/asset-manifest.ts
```

## 新增文件白名单（上限，允许减项）

```text
packages/shared/src/rle.boundaries.test.ts
packages/shared/src/rle-encode.boundaries.test.ts
packages/pal-extract/src/events/disasm.boundaries.test.ts
packages/pal-extract/src/events/recompile.boundaries.test.ts
packages/pal-extract/src/events/annotate.boundaries.test.ts
packages/pal-extract/src/events/slice.boundaries.test.ts
packages/pal-extract/src/resources/palette.boundaries.test.ts
packages/pal-extract/src/font/__tests__/bdf-to-json.boundaries.test.ts
packages/pal-extract/src/__tests__/asset-manifest.boundaries.test.ts
packages/shared/src/__tests__/glm-tb05-fixtures.ts
packages/pal-extract/src/__tests__/glm-tb05-fixtures.ts
docs/testing/glm-resource-tools-mutants.mjs
docs/testing/glm-resource-tools.config.mts
docs/testing/glm-resource-tools-evidence.json
```

此外仅允许本工作包末尾GLM回执/逐族账、本卡本人签字和本人日志；如需README索引机械一行须先由Codex协调，禁止覆盖主线其他行。未存在文件不要求强建；需要另路径先申请收窄/扩白名单，不能借同名测试覆盖旧文件。

## 实施验证与回执要求

- 按统一审核协议先逐族核既有测试精确标题、当前caller/守卫、实际白名单与target hash；本次未运行任何新测试/负控，不得把拟定针点记已检出。
- 定向→相邻→涉及包全测/typecheck→所有新增文件Biome；负控工具带精确测试标题运行态见证与判据自测。实际记录失败和重跑原因，不能倒填SHA/数字。
- 覆盖config必须使用仓库官方testSelection口径，在专有/tmp目录作同树有/无本批测试对照，局部与全包双口径；旧资产排除两侧一致，不动全局超时/排除/官方baseline。
- GLM不跑全仓check/官方ratchet/strict-fast。Codex独立接收集成后串行执行；GLM贡献终审披露，不自证第三方，不代签、不标done。
- 提交时本节后附GLM实现回执：候选SHA、白名单diff、真实命令/退出码、逐族互斥分类与新增价值、负控细目、覆盖两时点与待证归属。

## GLM回执区

待实施。当前只有Codex规划与前提复核，不存在GLM交付或accept。
