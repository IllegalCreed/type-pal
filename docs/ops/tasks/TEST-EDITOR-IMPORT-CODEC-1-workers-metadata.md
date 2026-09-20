# TEST-EDITOR-IMPORT-CODEC-1 - 导入、编码工作线程与视频元数据补测（队列 TB-03）

Status: review
Phase: phase2
Capability: 已有导入/编码合同覆盖（不改变能力地图）
Coding Owner: GLM（只新增测试）
Integration Owner: Codex
Reviewer: Codex / Kimi
Visual Verification Owner: N/A
Visual Verification Timing: N/A
Unavailable Agents: none
Branch: codex/glm-editor-import-codec-r1

Revision: r2，2026-09-19；生产核对点`e58834f6389a40ffe9f187e6a8051f552e964d79`不变。r1前提/方案已收窄，旧签留历史，不授权r2。
来源：[补测长队列](../../testing/glm-coverage-work-queue.md) TB-03；r2三席已齐，实施时机以本卡当前准入为准。
唯一工作包/族账/白名单：[glm-editor-import-codec.md](../../testing/glm-editor-import-codec.md)。


## 当前r5接收（Codex，2026-09-20，e4461a30→91623a9a）

最后counter已闭合，限定路径集成；39/原3+9/tc/11文件Biome与两独立见证通过。
返回值完整字节/SHA、firstByteDiff全扫描及实际两次toBlob快照均独立核实，详细证据见[接收记录](../../testing/import-codec-acceptance.md)。
**Codex accept，统一候选4894719e**；完整check7748、官方ratchet及受保护单次strict-fast7259通过。
当前review待Kimi独立终审/GLM实现者确认；旧counter均闭合并留历史，其他八批done/模拟器build不动，不代签、不标done。

## r4接收复核（历史）（Codex，2026-09-20，源9eecaaf3）

**counter：r4重写时丢掉实际返回预览图的完整字节/摘要断言**。尺寸/PNG合法性/实际putImageData编码/主图SHA已接受，不重开。
真实两次编码后仅把effectPreviewBytes误换成main字节，候选5/5仍绿；独立返回值oracle为AssertionError红。
定向39/39、原3+8、tc及11文件Biome通过；源码白名单合规、产品零漂移。
仅补image-import.stages.test.ts:305–312的返回预览保真与单点负控，并勘误回执index109→182；
详见[本轮独立复核](../../testing/import-codec-r4-review.md)与[机器账](../../testing/import-codec-r4-evidence.json)。
未合并、未跑全仓门/ratchet/strict-fast、不代签、不标done；设计不重签，另八批done不动。
GLM r5 返工已交付（2026-09-20，源 9eecaaf3 + 合并 cda702d5）：宿主 `blobProducts` 记录两次真实
toBlob 产物、返回 main/preview 逐字节对齐对应产物、实际 preview SHA=独立常量；新负控针
「返回预览误交主图」detected；像素勘误 182 已落回执/机账；preview/尺寸双见证、3+9 负控、
定向 39、tc、白名单 Biome 全绿。详见工作包 r5 回执与机账 rework4 节，待 Codex 复核。

## r3接收复核（历史）（Codex，2026-09-20，源001dc9e1）

**counter，仅余PNG宿主尺寸合同**：真实320×200成功链返回2×1/3×1，删除canvas尺寸设置后候选仍5/5绿。
定向39项、原负控、包tc和完整自有文件Biome均通过；C0精确唯一判据/C1格式与回执已关闭，不重开旧有效断言。
见[本轮独立接收](../../testing/glm-nine-final-review.md)与[机账](../../testing/glm-nine-final-evidence.json)。
合法PNG与真实摘要已修，本轮只返同一编码宿主的实际尺寸合同；不改产品、不混入其它八批，不代签、不标done。
GLM r4 返工已交付（2026-09-20）：宿主按实际 canvas 尺寸+putImageData 像素编码、真实像素摘要差异、
Codex png-host 见证 control 绿+删尺寸 detected；详见工作包 r4 回执与机账 rework3 节，待 Codex 复核。

## 上轮返工复核（历史）（Codex，2026-09-19，9fe3a07f）

**counter，保持rework**。原七针/五夹具已关闭；公共C0精确唯一目标和C1最终树格式/回执仍未满足。
定向39项、原3+8跑与包tc通过；本批Biome 11文件/2 errors/1 warnings，exit1。
R03-PNG：合法PNG仍未落实；真实digest已修。
见[本轮复核及提示词](../../testing/glm-nine-rework-review.md)与[机账](../../testing/glm-nine-rework-evidence.json)。
不合并、不更基线、不转Kimi、不代签、不标done；设计保持，Mimosa不参与。

## 首轮接收裁决（历史）

用户本轮明确批准九批先行实施、Codex恢复后统一接收；认可本批排期例外，不因旧两槽限制追溯判违规。设计签字保持，不重签。
**本席独立结论counter，任务rework，未合入正式测试/产品、不更新官方基线、不转Kimi终审。**
定向39项、原3对照+8针、包typecheck均通过；
Biome实测11文件/1 errors。
见[统一复核 TB-03](../../testing/glm-nine-intake-review.md#tb-03)与[机器接收账](../../testing/glm-nine-intake-evidence.json)。
公共C0判据误收适用，C1全部新增文件格式/回执不符也须修复；具体最小返工如下。

- **R03-1，量化实参保真漏检**：`frame-animation-codec.tpfs.test.ts:178/188`传的是input.slice().buffer，却比较外面的input。单点让产品原地改实际frame后候选6/6仍绿，oracle红（`quantize-mutates-actual-input`）。保留同一实际buffer、调用前快照，调用后与改输出后分别检查。
- **R03-2，输出transfer未证**：`frame-animation-worker-client.boundaries.test.ts` FakeWorker.reply直接回data，未执行输出transfer；worker测试只验transfer数组长度，未钉被发送buffer的byteLength变0。按已签r2实现输入/输出真实transfer，并检查实际缓冲，不仅“调用过structuredClone”。
- **R03-3，图片摘要正控被stub掩蔽**：`image-import.stages.test.ts:63/70–71`toBlob给8个零字节、digest固定32个零；摘要只验64位正则。无法证明catalog SHA与真实产物一致。用完整可解码PNG/真实digest、独立摘要和合法catalog字段；不扩为视觉测试，也不碰已隔离PNG失败close缺陷。
- C0/C1适用。覆盖与环境回执中不把host协议测试称为真实PNG/浏览器线程验收。


## 目标与边界

补 editor 七模块的导入阶段化失败、帧图序列守卫、TPFS 编码边界、worker 请求分派与 BMFF box 解析回归。
合法二进制独立构造+真实编码链，非上传界面；上传选图竞态（EDITOR-SPRITE-PICK-1）已 done 不重开；
不做视觉/截图/听感；不动 UI 布局与动画观感。

## 前提真值门

| 维度 | 一手证据与结论 |
|---|---|
| 原版/primary source | 原版机制N/A。TPFS是工程自定格式；PNG与ISO BMFF为标准格式；[W3C ISO BMFF来源](https://www.w3.org/TR/mse-byte-stream-format-isobmff/)。video-metadata只实现窄音轨探测，不充当完整MP4校验器 |
| 第一阶段 | N/A——编辑器为一期后新增 |
| 当前二阶段 | ImageTab:525导入、BattleSpriteLibrary:1269、FrameAnimationEditor:506/550/593分别为decode/quantize/encode；CutsceneTab:232是MP4探测，:472/479/491是图片/量化/编码。四旧文件6项已复跑，worker已零改源码调用真实self.onmessage并验证transfer；无同名直接测试不等于无间接消费 |
| 本任务目标 | before→after 只增合法正反测试与覆盖账；导入/编码行为零变 |

最强替代解释：旧codec量化/重排已覆盖、宿主替身替掉产品逻辑、box输入不在声明域、真实缺陷被错误绿测遮盖。
r2已证明现有worker handler可在Node窄宿主调用，不新增产品导出；PNG编码失败位图泄漏由Codex隔离修复，非本包正确绿测。

## 推进签字

### build前（r2，当前）

- Codex：**premise verified / design agree（2026-09-19，r2，冻结e58834f6）**。本人直读worker-client.ts/codec.worker.ts、image-import.ts:130–142、video-metadata.ts:23–52及正式UI调用；四既有文件6项绿。亲自复跑现有self.onmessage的真实quantize/encode、TPFS像素恢复、client真实transfer和原buffer保真，零产品导出；并复现PNG成功close=1、仅编码失败close=0。r2将泄漏交Codex另修，不让GLM写错绿或顺手改产品；订正ISO BMFF标准来源与窄探测边界。可证伪：真实handler/codec未执行、transfer没detach、非法fixture提前拦截、代码异常被包装成业务正控，则不准计覆盖。
- Kimi：**premise verified / design agree（2026-09-19，r2，冻结 e58834f6；全部锚点本人直读/复跑，未读 GLM 结论——其签字于本人核查完成后落盘，仅确认席位位置）**。
  - **worker 宿主方案核实**：现有 codec.worker 的 self.onmessage handler 可在 Node 窄宿主直接
    调用且零产品导出改动（Codex 已实证真实 quantize/encode）；client 发送副本 detached 而原
    buffer 保持、terminate 一次——真实 transfer 证据成立，不是「无同名 worker 测试即不可测」。
  - **PNG 失败释放缺陷隔离**：`image-import.ts:130-142` 全链路 canvas 操作后 `bitmap.close()`
    在末尾——编码失败时 close 不可达；本人复跑队列探针确认 closes=0、leakObserved=true。
    r2 把该缺陷交 Codex 另修、不让 GLM 写错绿或顺手改产品——隔离正确，不是本包正确绿测。
  - **BMFF 边界核实**：`video-metadata.ts:23-52` 只实现窄音轨探测（box 遍历/size===1 扩展头），
    不充当完整 MP4 校验器；ISO BMFF 标准来源已订正——边界声明准确。
  - **既有去重核实**：ImageTab/BattleSpriteLibrary/FrameAnimationEditor/CutsceneTab 四个调用点
    与四旧文件 6 项在册（Codex/GLM 计数一致）；SPRITE-PICK 上传竞态已 done 不重开。
  - **设计同意**：七模块导入阶段化失败/帧图序列守卫/TPFS 编码边界/worker 请求分派/BMFF box
    解析回归；合法二进制独立构造+真实编码链非上传界面；不做视觉/截图/听感；不动 UI 布局与
    动画观感；真实缺陷隔离不固化；负控钉名业务红+判据自测。
  - **可证伪观察**（任一反例即收窄或 counter）：① 某族已被 codec 两例同合同覆盖 → 登记已有；
    ② 真实 handler/codec 未执行 → 覆盖无效；③ transfer 没 detach 或原 buffer 被改 → 保真破；
    ④ 非法 fixture 提前被其它守卫拦截 → 负控未达目标分支须重造；⑤ 代码异常被包装成业务
    正控 → 覆盖无效；⑥ 产品/旧测试/基线任何 diff → 越界即停。
  - 返工项：无。
- GLM：**r2 premise verified / design agree（2026-09-19，r2，冻结 e58834f6；差异锚点本人直读/复跑，未读 Kimi 结论；r1 签字留历史）**。
  - **worker 零导出方案**：codec.worker.ts:27–35 本人直读——真实 handler 已挂 `self.onmessage`
    （quantize/encode + postMessage transfer），r1 稿"Node worker_threads 或直调 handler 留 Codex
    裁定"的悬置收口为"隔离 self 后动态 import 真实 worker"正确：零产品导出、真实 codec 执行、
    只测 Node 宿主协议不冒称浏览器线程调度。
  - **client transfer**：worker-client.ts:39–49 postMessage 前 `rgba.slice(0)` 复制、:76–77
    transfer 数组——探针 rc0 证明 structuredClone transfer 后传输副本 detach 而调用者原 buffer
    完好、terminate=1，与 C6 的假 Worker 方案（真实 structuredClone+transfer、输出也转移）一致。
  - **BMFF 订正**：video-metadata.ts:23–28 本人直读——窄音轨探测三态（非 ftyp→undefined、
    未找到/畸形→false、找到 soun→true），W3C ISO BMFF 标准来源正确；r1 稿"工程自定格式"有误。
  - **caller 订正**：FrameAnimationEditor:506=decode、:593=encode、CutsceneTab:232=MP4 探测
    ——r1 稿 :479 列为探测入口有偏，r2 订正正确。
  - **PNG 泄漏隔离**：image-import.ts:128–142 本人直读——canvasPng 抛错路径确无 finally、
    bitmap.close() 不可达；探针 rc0 复现 control close=1 / 编码失败 close=0。归 Codex 修复卡、
    本包不写默认红、不固化"不释放"为正确绿测——同意（这是 r2 最重要的边界收敛）。
  - **既有基线复跑**：四直接文件 6/6 绿（本人执行）；官方 include 含 worker（0/13 非排除）
    与 battle-sprite-import 输入由正式 Uploader 提供的分层同意。
  - **可证伪观察**：①真实 handler/codec 未执行（mock 整个模块）→C7 无效；②transfer 未 detach
    或原 buffer 变化→C6 无效；③非法 fixture 在守卫前被拦→该轴不能计新增；④泄漏被顺手修或
    写绿→越界即停。
  - 返工项：无。Kimi 签齐且无 counter 后由 Codex 核定 build。
- build准入：三席r2设计签字保持；用户本轮明确批准额度空窗期九批先行实施（排期例外），本卡据此进入实施后接收。当前counter/rework不要求重签设计，未开放done；不将本次例外泛化给未来新批。

### build前r1签字（历史，已被r2替代）

- Codex：pending（独立核队列 TB-03 范围/去重表/白名单，尤其 worker 测试宿主方案）。
- Kimi：pending（独立前提/设计审查，不读 GLM 结论）。
- GLM：**premise verified / design agree（2026-09-19，核对点 e58834f6；锚点本人直读，未读他席）**。
  七模块存在、计数与台账逐格一致（census --check）；caller 与既有测试计数（2/0/1/2/0/0/1）核实；
  C1-C8 族锚点在工作包；worker 宿主方案（Node worker_threads 或直调 handler）留待 Codex 定案时
  裁定并登记取舍。可证伪：某族已被 codec 两例同合同覆盖→登记已有；宿主不支持真 worker 且直调不等价
  →该族降防御并说明；产品/旧测试/基线 diff→停。
- build准入：未开放；三席同 r1 齐且无 counter 后由 Codex 核定。

### done前

- Codex：**accept（2026-09-20，统一候选4894719e，源e4461a30）**。独立复核真实toBlob快照/完整返回字节与preview SHA；helper26组检查、39定向/3+9负控/tc/Biome/双见证通过，最后counter闭合。集成源码与源候选逐字一致；完整check7748/官方ratchet/受保护单次严格fast7259通过，旧测试identity/生产清单/分母和其它六包基线对象不变。旧版本兼容审查pass；GLM贡献披露，编码失败close仍另归属，不代签、不标done。
- GLM：**实现者自验 accept（2026-09-20，统一候选 4894719e，源 e4461a30；本人为测试贡献者，非独立第三方）**。
  自验依据（本人独立执行）：① `git diff e4461a30..4894719e` 对本人 7 新测试 + fixture +
  mutants/config 白名单**逐字节为空**——主线未改语义；② 集成提交 91623a9a 范围恰为该 13 文件
  白名单（无产品/旧测试文件），4894719e 仅官方 baseline ratchet（本人未重跑/未修改）；③ 从集成
  后 main 树复跑本批定向 39/39（7 文件）；④ 机账并集 rework/rework2/rework3/codexR4Review/
  rework4 完整保留。官方 check/ratchet/strict-fast 已由 Codex 执行，不以本人复述为准。
- Kimi：**accept（2026-09-20，统一候选4894719e，源e4461a30；全部锚点本人直读/主树复跑，未读 GLM 结论）**。
  - **toBlob 快照与返回保真（直读+见证）**：`image-import.stages.test.ts:212-217` 按当时 canvas 实际
    宽高+最近交付像素编码，`blobProducts.push(bytes.slice())` 快照防别名；`:327-338` 返回 main/preview
    经 `firstByteDiff` 与宿主第 1/2 次产物逐字节比对（含 `:331` 长度下界）；`firstByteDiff`（`:158-164`）
    扫描全部共享字节+长度相等才返回 -1，非抽样。产品流对得上：`image-import.ts:136/140` 两次真实
    canvasPng、`:144` 主图摘要、`:142` close 在编码失败时不可达（泄漏仍归 Codex，未写错绿）。
  - **实际 preview SHA**：`:343-345` 对**实际返回** effectPreviewBytes 求 SHA===独立常量
    ee694d…8529 且≠主图 hash；preview 见证独立解码实际产物确认 main f614fb…27f7 / preview
    ee694d…8529、实际像素 [182,182,182,255] / [34,5,73,255]（index182 勘误一致），control 绿。
  - **新增返回值负控（主树复跑）**：mutants 工具第 9 针 returned-preview-replaced-by-main
    （仍执行第二次编码但交付主图字节，`:57-66` from 与产品 `:140` 逐字一致）由候选自身
    AssertionError 检出（`:338` “expected 49 to be -1”）；工具整体 exit0、3 对照绿+9 针全红。
    双见证主树复跑均 exit0：preview control 绿/换主图 detected；png-host control 绿/删尺寸 detected。
  - **范围与基线**：候选对比 cda702d5 仅 7 新测试+1 fixture+工具/回执/机账+baseline，产品零 diff；
    源 e4461a30 到集成 91623a9a packages 逐字一致（diff 为 0）。baseline.fast 7220→7259（恰+39）、
    editor 236→243 文件（7+6+3+6+6+5+6=39）、sourceFileCount 617 与另六包基线对象不变。本人主树
    复跑定向 39/39 绿。已关闭项（PNG 尺寸宿主/摘要/像素勘误等）未重开。
  - 旧版本兼容审查 pass：无旧模型/升级器/兼容分支新增。GLM 为测试贡献者，其自验不作独立第三方。
  - 返工项：无。编码失败 close 缺陷保持原隔离归 Codex，不因补测通过关闭。
- done准入：未开放；两席同候选accept齐后由Codex核定，不代签、不标done。

## 交接日志

- 2026-09-20 Kimi（独立终审）：统一候选4894719e对比cda702d5、源e4461a30，签 done 前 accept。
  本人独立证据（未读 GLM 结论）：直读 `image-import.stages.test.ts` 与产品 `image-import.ts`——
  blobProducts 两次真实 toBlob 的 slice 快照（:212-217）、返回 main/preview 与宿主对应产物
  firstByteDiff 全扫描逐字节比对（:158-164/:327-338）、实际返回 preview 的 SHA===独立常量且≠主图
  （:343-345）；主树复跑定向 39/39 绿、mutants 工具 exit0（3 对照绿+9 针全红，第 9 针
  returned-preview-replaced-by-main 由候选自身 AssertionError 在 :338 检出）、双见证 exit0
  （preview control 绿/换主图 detected；png-host control 绿/删尺寸 detected）；候选范围仅 7 新测试
  +1 fixture+工具/回执+baseline，产品零 diff，源到集成 packages 逐字一致；baseline 7220→7259 恰+39、
  617 源文件与另六包不变。完整 check7748/ratchet/strict-fast7259 采用 Codex 已落证据，未重跑官方
  基线。返工项无；编码失败 close 保持原隔离。不代签、不改状态、不标 done。
  Next：两席同候选 accept 已齐，交 Codex 核定 done 准入。

- 2026-09-20 GLM（集成后实现者自验）：在统一候选 4894719e 上完成本人贡献核对并签
  done 前实现者自验 accept（测试贡献者，非独立第三方）。依据：白名单
  `git diff e4461a30..4894719e` 逐字节为空；集成 91623a9a 恰为 13 文件白名单、无产品/
  旧测试改动；集成后 main 树复跑定向 39/39；机账并集完整保留；官方基线未重跑/未改。
  未读 Kimi 结论，不代签、不标 done；八批归档与模拟器 build 不动；编码失败 close
  仍归 Codex。无下一位 Agent 提示词由本席给出——等待 Kimi 独立终审与 Codex 核定 done。

- 2026-09-20 Codex（统一门禁完成）：候选4894719e通过check7748/ratchet/受保护单次strict-fast7259，签本人accept；最后counter关闭，39项计入基线、旧测试/范围不变。两席同候选提示词附后，不代签、不标done；八批done与模拟器build不动。


- 2026-09-20 Codex（r5独立接收）：e4461a30本地/远端一致、候选零修改；39/3+9/tc/Biome/双见证通过，helper26组检查通过。最后counter闭合并限定路径集成91623a9a，review待统一门禁；设计不重签，不代签、不标done。

- 2026-09-20 GLM：按 Codex r4 复核唯一阻断完成 r5 返工（分支合并 main cda702d5，源 9eecaaf3；
  合并冲突按并集解决：保留 GLM rework/rework2 回执历史 + Codex codexR4Review）：
  `installCanvasHost` 新增 `blobProducts`（每次 toBlob 实际产物 slice 快照）；断言返回
  main/preview 逐字节等于宿主第 1/2 次产物（`firstByteDiff` 全字节扫描——256k 字节失败
  diff 渲染实测 ~522 秒，扫描保持完整语义并即时报首个差异下标）；实际返回 preview 的
  SHA=独立常量 ee694d…8529 且≠主图 hash；负控新增第 9 针 returned-preview-replaced-by-main
  （仍执行第二次编码但交付主图字节）detected；回执/机账像素勘误 index 109→182
  （indexed[182,182,182,255]/preview[34,5,73,255]，生产算法不动）。复跑：preview 见证 rc=0
  （control 6/6、坏实现候选 AssertionError detected）；旧尺寸见证 rc=0；负控 3 对照+9 针
  rc=0（11 秒）；定向 39/39；tc rc=0；11 文件白名单 Biome rc=0。编码失败 close 仍归 Codex，
  不代签、不标 done。详见工作包 r5 回执与机账 rework4 节。
- 2026-09-20 GLM：按 Codex 终审唯一残项完成 r4 返工（分支已同步 main 合并 256116ee/1a44c3c6，
  源 001dc9e1）：`installCanvasHost` 改真实宿主合同——canvas 宽高由产品赋值、putImageData 快照
  实际交付像素、toBlob 按调用时实际尺寸+最近交付像素编码；`pngPayload` 改 (width,height,rgba?)
  实际像素扫描线（IHDR 宽高 4 字节大端，修复单字节截断 320→64，离线独立检查器发现）；
  `palette` 非同色映射使索引帧/预览帧真实像素不同；摘要常量为实际产物离线 SHA-256
  （主图 f614fb…27f7 / preview ee694d…8529，256283 字节）。复跑：Codex png-host 见证 rc=0
  （control 7/7、删 canvas 尺寸被候选业务断言 detected、三文件 hash 不变）；定向 39/39；
  原负控 3+8 rc=0（battle-background 针 redTest 随更名同步、判据不变）；tc rc=0；
  11 文件白名单 Biome rc=0。只动 TB-03 白名单与本人回执，编码失败 close 仍归 Codex，
  不代签、不标 done。详见工作包 r4 回执与机账 rework3 节。
- 2026-09-19 GLM：按 Codex 返工复核 counter 完成 r3 收窄返工：C0 精确唯一目标判据、
  C1 全白名单 Biome、R03-3 前半项（完整可解码 PNG：真 CRC/zlib stored/独立检查器三态通过
  + 离线摘要）、撤回 audit-performance 超时豁免归因。详见工作包 r3 回执与机账 rework2 节。


- 2026-09-20 Codex（r4复核）：本地/远端9eecaaf3一致、工作树干净；独立尺寸见证检出，CRC/像素/SHA正控匹配。
  新返回值单点见证MISSED，故签收窄counter；回执像素应为index182。只返丢失断言与文案勘误，不改GLM测试语义、不混其它八批/模拟器。


- 2026-09-20 Codex：独立复核001dc9e1，仅PNG尺寸宿主残项counter，其余关闭。不代签、不标done；当前提示词以本轮报告为准。


- 2026-09-19 Codex：复核9fe3a07f，按本轮报告收窄counter；原七针与五夹具已关闭。最终树格式与精确唯一判据仍失败，不重签、不并包、不标done。
- 2026-09-19 Codex：按用户九批统一接收授权独立审本候选；测试通过不等于证据有效，签counter并转rework，返工限公共C0/C1及本卡章节。GLM原回执/他席签字保留；用户最新确认Mimosa为GLM私有MCP，Codex不处理且不作接收门；TB00/TB01另排。
- 2026-09-19 GLM：按卡面授权领取 TB-03 并完成实施（r1）。worktree `type-pal-glm-import-codec`、
  分支 `codex/glm-editor-import-codec-r1`、基点 41cc7cd9；领取时产品对 e58834f6 零漂移已核。
  交付：7 新测试文件+1 fixture 共 39 项（C1-C8 逐族落账）；定向/相邻/官方 fast 口径
  2359→2398 双 exit0；editor tc rc=0；10 新文件 Biome rc=0；负控 8 针+3 对照全 detected
  （钉名 AssertionError 判据+四向自测）；覆盖对照见工作包回执与
  `docs/testing/glm-import-codec-evidence.json`。全包 3 项预存环境失败（PAL 迁移资产缺失×2、
  audit 并行超时×1）与本批无关，已核基线同样失败/隔离绿。PNG 编码失败泄漏保持 Codex 归属。
  状态按卡面授权同步 build；不代签 done，等 Codex 额度恢复后统一接收。
- 2026-09-19 Codex：用户告知“Kimi他们签了”后同步核三席同r2/冻结、直接证据及可证伪观察齐、无counter；生产目标零diff。核定设计准入通过，保留draft待实施槽按队列释放。 r1历史不回写，所有既有r2排除项保留；不代签、不标done。GLM当前返工仍优先，后续领取条件与交接已落卡，避免每批做完再等临时派活。
- 2026-09-19 Kimi：完成 r2 独立设计压力测试，签 premise verified + design agree，无返工项。
  直读 worker 零导出宿主方案可行性、client 真实 transfer/detach、video-metadata 窄音轨探测边界、
  image-import.ts:130-142 编码失败 close 不可达（复跑队列探针 closes=0/leakObserved=true——
  泄漏交 Codex 另修正确隔离）；SPRITE-PICK 不重开。六条可证伪观察写入本席。
  未改产品/他席/状态，未读 GLM 结论。Next：三席齐后 Codex 核准入。
- 2026-09-19 GLM：完成 r2 差异确认，签 premise verified / design agree，无 counter。复核
  worker 零导出宿主方案、client 真实 transfer/detach、BMFF 三态与标准来源订正、caller 修正、
  PNG 编码失败泄漏隔离边界；探针 rc0；四旧文件 6/6 复跑。未读 Kimi 结论；仅改本席与日志。

- 2026-09-19 Codex：按用户要求与TB-00返工并行推进本卡；固定零产品改动worker宿主方案；订正BMFF真源、三态与caller；已确认PNG失败释放缺陷隔离，正式测试不含默认红。已把修订合入工作包正文，r2本人前提/设计签字完成，待GLM补充确认与Kimi独立审查。仅文档/只读探针，未写正式测试或改产品。统一证据见[前三批设计收口](../../testing/glm-coverage-queue-design-review.md)。

- 2026-09-19 GLM：按队列 TB-03 细化。核七模块 caller（ImageTab/BattleSpriteLibrary/
  FrameAnimationEditor/CutsceneTab）与既有测试计数；battle-sprite-import/worker-client/worker 无
  既有测试确认；产出本卡+工作包（C1-C8 族账/负控/覆盖方案）。仅规划，未写测试。

## 历史交接提示词

### 当前 · GLM按已签队列实施

```text
在 /Users/zhangxu/illegal/type-pal 按 docs/ops/tasks/TEST-EDITOR-IMPORT-CODEC-1-workers-metadata.md 的r2实施，生产冻结e58834f6，三席齐且Codex已核准，不重签。先同步、检查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡当前准入、对应工作包及docs/testing/glm-coverage-queue-design-review.md的当前实施交接。
TB-00三项返工优先；未接收实施包最多两批。TB-01已开build，TB-02/03依序待空位；满足卡面条件后你可同步状态/看板/索引并开工，不再等用户逐批点头。领取前核目标产品未漂移；每批独立codex/glm-editor-import-codec-r1分支/worktree，不在主树切分支、不恢复stash、不混用未接收成果作为基线。
只新增已签白名单测试/fixture/诊断和本人回执，逐族去重，合法输入先过守卫，负控须由候选自身AssertionError变红，不能把超时/STACK_TRACE_ERROR或仅独立oracle红算检出。PNG编码失败泄漏及活动页/在途回填待证保持原归属，不改产品或写错绿。
完成定向/相邻/全包/tc/Biome、私有同口径覆盖与真实逐族账后交Codex接收；全仓check/官方ratchet/strict-fast留Codex。不做视觉/听感，不改旧测试/官方基线，不代签、不标done、不直接转Kimi终审。
```

### 历史 · r2设计交接（已完成，不重复执行）

两席完整合并提示词见[前三批r2设计交接](../../testing/glm-coverage-queue-design-review.md#两席并行提示词)。本卡最小可复制交接如下：

```text
在 /Users/zhangxu/illegal/type-pal 审 docs/ops/tasks/TEST-EDITOR-IMPORT-CODEC-1-workers-metadata.md（r2/draft，冻结e58834f6）。先同步检查工作树，读AGENTS/CLAUDE/READ-FIRST、本卡和对应工作包、docs/testing/glm-coverage-queue-design-review.md，直接读一手代码而非复述他席。
Codex已签r2。GLM负责对本卡r2差异补充确认，Kimi负责独立设计压力测试，两席可并行且不读另一席结论。分别只在本人r2席位/日志写带直接锚点和可证伪观察的premise verified/design agree或counter，并提交推送。
同时审其余TB-01～03同r2卡可用合并提示词，但各卡独立裁决。不得改产品/正式测试/另一席/状态，不标build/done；三席齐后Codex核准入。TB-00返工不因本轮设计等待而停止。
```

## 历史下一位Agent提示词：GLM

```text
在 /Users/zhangxu/illegal/type-pal 返工 TEST-EDITOR-IMPORT-CODEC-1（TB-03），卡 docs/ops/tasks/TEST-EDITOR-IMPORT-CODEC-1-workers-metadata.md 已rework，候选f4c229ed，生产冻结e58834f6；设计r2不重签。
先同步当前Codex counter到独立 codex/glm-editor-import-codec-r1，读AGENTS/CLAUDE/READ-FIRST、docs/testing/glm-delivery-checklist.md、本卡当前裁决和 docs/testing/glm-nine-intake-review.md 的公共C0/C1与TB-03章节、原工作包docs/testing/glm-editor-import-codec.md。
只修列明残项，保留有效测试与他席结论；正式guard合法、实际同一入参深快照、禁止把已排除未知/旧接口写正确绿测。公共工具判据必须按目标错误首行，真实运行与自测同函数。原负控+本席相关独立见证、定向/相邻/全包/tc/全部新TS/MJS/MTS/JSON的Biome及私有同口径覆盖从最终树复跑，失败/未完成如实记录。
只动原白名单/本人回执，分支不互合、不改产品/旧测试/官方基线/原审计探针/他席见证语义，不代签、不标done、不直接转Kimi。修完本批即可单独交Codex接收；全仓check/ratchet/strict-fast留接收后，用户已确认Mimosa归GLM私有MCP，Codex无需处理，不作为本轮接收/合并门。
```

## 历史GLM交接（r4已执行）

~~~text
在 /Users/zhangxu/illegal/type-pal 先读AGENTS/CLAUDE/READ-FIRST及 docs/testing/glm-nine-final-review.md；八批TB02/TB04～TB10已由Codex接收，统一候选256116ee，check7709/ratchet/严格fast7220通过。逐批核你的贡献在主线未改语义，在八卡GLM done前席位补“实现者自验accept”（非独立第三方）或counter并写本人日志，设计不重签，不复跑/改官方基线。
只返工TB03（docs/ops/tasks/TEST-EDITOR-IMPORT-CODEC-1-workers-metadata.md，rework，源001dc9e1）：原独立分支同步最新main并保留另八批既有成果，不计入自己贡献。按报告唯一PNG宿主尺寸counter，把320×200成功链的toBlob产物与实际canvas尺寸/putImageData像素对齐；主图/preview不同hash须来自真实不同像素，不用2×1/3×1造差异。保留真实SHA与完整字节断言，不改产品或编码失败close缺陷。
复跑 node docs/testing/import-codec-png-host-review.mjs <候选worktree>，删canvas尺寸须被候选业务断言检出；helper重构给真实入口由Codex适配见证。定向39/原3+8/tc/最终白名单Biome与回执从最终树复跑，其余关闭项不重开；仅TB03白名单与本人回执。Mimosa不参与。
另按 EDITOR-SKILL-TRIAL-1 卡末提示定点核r2a：我方1～3人、敌方五槽；本人签premise verified/design agree或counter，不重审保存/隔离/四目录，不改模拟器代码。
各卡裁决独立；不读/复述Kimi结论，不代签、不改状态、不标done。本人席位/日志直接提交推送，保留他席并自行处理push竞态。
~~~

## 历史下一位Agent提示词：Codex接收TB-03 r4（已执行）

~~~text
在 /Users/zhangxu/illegal/type-pal 接收 TB-03 r4 返工（docs/ops/tasks/TEST-EDITOR-IMPORT-CODEC-1-workers-metadata.md，rework）。候选分支 codex/glm-editor-import-codec-r1（worktree /Users/zhangxu/illegal/type-pal-glm-import-codec），已同步 main（含 256116ee 八批集成与 1a44c3c6），源 001dc9e1，生产对 e58834f6 零漂移，设计不重签。
先读 AGENTS/CLAUDE/READ-FIRST、本卡当前接收复核与交接日志、docs/testing/glm-nine-final-review.md 的 TB-03 章节、工作包 docs/testing/glm-editor-import-codec.md r4 回执与机账 docs/testing/glm-import-codec-evidence.json rework3 节。
唯一返工项为你上轮 counter：320×200 成功链 toBlob 产物对齐实际 canvas 尺寸与 putImageData 像素。实现：installCanvasHost 由产品赋 canvas 宽高、快照 putImageData 实际交付像素、toBlob 按调用时实际尺寸+最近交付像素编码；pngPayload(width,height,rgba?) 实际像素扫描线（IHDR 4 字节大端）；palette 非同色映射使索引帧/预览帧真实像素不同（b=109：(109,109,109,255) vs (71,6,146,255)）；摘要常量为实际产物离线 SHA-256。注意：helper 签名/结构有重构，你的 png-host 见证按 AST 提取三 helper 适配真实入口后复跑（本人已按现有见证脚本复跑 rc=0：control 7/7、删 canvas 尺寸 detected 候选业务断言、三文件 hash 不变；actualHost summary 的 main/preview [0,0] 为 mutated 末次覆写记录）。
请独立复核后在本卡 done 前席位签 accept 或 counter：定向 39/39、node docs/testing/glm-import-codec-mutants.mjs（3+8，battle-background 针 redTest 已随测试更名同步、判据未变）、包 tc、11 文件白名单 Biome 均已从最终树复跑（见机账 reruns 节）。只审 TB-03 白名单与 GLM 回执；其余八批已接收不重开；编码失败 close 缺陷仍归你修复卡；不代签、不混入他批。若接收，按你的统一集成流程合入并更新卡状态；全仓门由你执行。
~~~

## 历史下一位Agent提示词：GLM（仅补返回预览保真；r5已执行）

~~~text
在 /Users/zhangxu/illegal/type-pal 只返工TB03，卡 docs/ops/tasks/TEST-EDITOR-IMPORT-CODEC-1-workers-metadata.md 为rework，源9eecaaf3，生产e58834f6，设计不重签。
先同步最新main到原独立分支并保留八批归档/模拟器状态，读AGENTS/CLAUDE/READ-FIRST、本卡及 docs/testing/import-codec-r4-review.md、交付清单。本轮已接受尺寸、CRC/zlib、交付像素编码与主图摘要；不再重开这些项。
唯一阻断：r4删掉了返回预览完整字节断言。让宿主记录实际两次toBlob产物，核返回main/preview对应完整字节，并对实际preview做SHA断言；仅删除对主hash的“不等于preview常量”不能代替验证。
把报告的“仍调用第二次canvasPng但effectPreviewBytes改交主图”单点坏实现纳入负控，node docs/testing/import-codec-preview-review.mjs <worktree>须由候选自己的AssertionError检出，控制绿。旧尺寸见证和原3+8保持通过。helper改签时告知真实入口，Codex适配，不复制假helper。
回执像素数字勘误为index182 / [182,182,182,255] / [34,5,73,255]，不修改生产算法。最终定向39、tc、完整白名单Biome、原负控+新增针从提交树复跑并如实回填。
只改TB03白名单与本人回执，不改产品/旧测试/官方基线/原探针；编码失败close仍归Codex。不要回退另外八批done或模拟器build，不代签、不标done。本人落卡提交推送后交Codex；全仓门由Codex接收后运行，Mimosa不参与。
~~~

## 历史下一位Agent提示词：Codex接收TB-03 r5（已执行）

~~~text
在 /Users/zhangxu/illegal/type-pal 接收 TB-03 r5 返工（docs/ops/tasks/TEST-EDITOR-IMPORT-CODEC-1-workers-metadata.md，rework）。候选分支 codex/glm-editor-import-codec-r1（worktree /Users/zhangxu/illegal/type-pal-glm-import-codec），已合并 main cda702d5（你的 r4 复核；机账合并冲突按并集解决：GLM rework/rework2 历史 + 你的 codexR4Review 均保留），源 9eecaaf3，生产对 e58834f6 零漂移，设计不重签。
先读 AGENTS/CLAUDE/READ-FIRST、本卡「当前接收复核」与交接日志、docs/testing/import-codec-r4-review.md、工作包 docs/testing/glm-editor-import-codec.md r5 回执与机账 docs/testing/glm-import-codec-evidence.json rework4 节。
唯一返工项为你上轮阻断：返回预览保真。实现：installCanvasHost.blobProducts 每次 toBlob 以 slice 快照实际产物；断言返回 main/preview 逐字节等于宿主第 1/2 次产物（firstByteDiff 全字节扫描，-1 全等、失败报首个差异下标——256k 字节 toEqual 失败 diff 实测 ~522 秒单进程 CPU，扫描与你的 oracle Buffer.compare 同型且语义完整）；sha256Hex(实际返回 effectPreviewBytes)===独立 preview 常量且≠主图 hash；负控新增第 9 针 returned-preview-replaced-by-main（effectPreviewBytes=(await canvasPng(canvas), bytes.slice(0))），判据不变。helper 签名未再改，pngPayload/installCanvasHost/palette 三者可直接 AST 提取（installCanvasHost 返回值新增 blobProducts 字段）。像素勘误 index 109→182 已落回执 r4 节（带勘误标注）与机账 rework4.pixelErratum，生产算法未动。
请独立复核后在本卡 done 前席位签 accept 或 counter。最终树复跑：preview 见证 rc=0（control 6/6、坏实现候选 AssertionError detected）、旧尺寸见证 rc=0、负控 3 对照+9 针 rc=0（全跑 11 秒）、定向 39/39、tc rc=0、11 文件白名单 Biome rc=0。只审 TB-03 白名单与 GLM 回执；另八批 done 与模拟器 build 不动；编码失败 close 仍归你修复卡；不代签、不混入他批。若接收，按你的统一集成流程合入并更新卡状态；全仓门由你执行。
~~~

## 当前下一位Agent提示词（同一候选并行；GLM 已执行完毕，仅剩 Kimi）

### Kimi

~~~text
在 /Users/zhangxu/illegal/type-pal 独立终审 TEST-EDITOR-IMPORT-CODEC-1（TB03），卡 docs/ops/tasks/TEST-EDITOR-IMPORT-CODEC-1-workers-metadata.md，review，统一候选4894719e对比cda702d5，源e4461a30，设计r2不重签。
先同步并核工作树，读AGENTS/CLAUDE/READ-FIRST、本卡、docs/testing/import-codec-acceptance.md及机账/GLM工作包。独立读实际代码与输入，不读取或复述GLM审查结论；GLM是测试贡献者，不算独立第三方。
七新测试39项已逐字集成；39/3正控+9负控/tc/11文件Biome、尺寸与preview两见证全部通过。真实两次toBlob快照→返回main/preview完整字节→实际preview独立SHA已经闭合；firstByteDiff完整扫描含长度，不是抽样。此前误交主图为preview的单点坏实现现被候选自身AssertionError检出。像素182勘误已落，已关闭项不重开。
完整check7748、官方ratchet与受保护单次strict-fast7259通过；七包生产清单/分母/全部旧测试identity不变，其它六包基线对象不变，只增editor7文件39项。按需复跑定向及两个现有见证/3+9，不重跑或改官方基线。
在本人done前席位签accept或file:line counter，写直接证据及交接日志，提交推送。只改本人席位/日志，不代签、不改状态、不标done。另八批done、模拟器build不动；编码失败close缺陷保持隔离，非本卡修复。提交前同步保留他席，push竞态自行处理。
~~~

### GLM（已执行，2026-09-20 实现者自验 accept 落卡；保留原文备查）

~~~text
在 /Users/zhangxu/illegal/type-pal 对 TEST-EDITOR-IMPORT-CODEC-1（TB03）做集成后实现者自验确认，卡 docs/ops/tasks/TEST-EDITOR-IMPORT-CODEC-1-workers-metadata.md，review，统一候选4894719e对比cda702d5，源e4461a30；设计不重签，不再返工。
先同步核工作树并读AGENTS/CLAUDE/READ-FIRST、本卡、docs/testing/import-codec-acceptance.md及机账。独立核本人7新测试+fixture/工具在主线未改语义；可复跑本批39项，不重跑或改官方coverage基线。Codex已完成39/3+9/tc/Biome/两见证及check7748、ratchet、单次strict-fast7259。
仅在本人done前席位签“实现者自验accept（本人为测试贡献者，非独立第三方）”或明确counter，写本人日志并提交推送；不读或复述Kimi结论，不代签、不改状态、不标done。保留八批归档及模拟器build，编码失败close仍另归Codex；落盘前同步保留另一席修改，push竞态自行处理。
~~~
