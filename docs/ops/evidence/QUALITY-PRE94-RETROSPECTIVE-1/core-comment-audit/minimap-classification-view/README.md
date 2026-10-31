# pre94 minimap 分类与缩放 oracle 返工

Status: recorded
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「pre94 minimap 分类与缩放 oracle 返工」的治理候选页;证据原件即下方逐字节保全的固定main源(4979B,SHA 12db758df754)。该证据片属 QUALITY-PRE94-RETROSPECTIVE-1 / core-comment-audit(base 987bddda,codex/code-quality-3y):只修两条事实注释并加强minimap测试,产品分类、缩放/键盘行为、seam/色板、资产、schema/save、公共接口均未修改。

## 来源与输入

三文件(minimap.ts原487行、minimap.test.ts原148行、minimap.glm-phase1-leaves.test.ts原200行)全文读取,tools/bootstrap接线、GameState/NPC/Command、disasm/SSS、库存helper与脚本catalog的逐文件行界与SHA见[read-boundaries.json](read-boundaries.json);授权与交接见[QUALITY-PRE94-RETROSPECTIVE-1.md](../../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)。原盘SSS.MKF只读统计(43503条script中425条0x1F、401条count0、0条signed负量)见[raw-quantity-audit.json](raw-quantity-audit.json),旧『绝大多数地图宝物/木鞋』断言据此收窄——这是该版本全部0x1F,不是仅地图宝箱,更不是可达剧情或原EXE观察。

## 断言与业务 oracle

SDLPal无同形态minimap,不能伪造原版UI真值;独立期望由4/13与180/世界视野宽推导,不借被测worldToThumb/BASE_PX反推。主测仍14例:中心视野改独立sx/sy/sw精确数值并以不同x/y排除轴混用,item/teleport保留旧顺序并核teleport先出现仍item优先,count0只改无据标题。[五枚源变异反控](controls.json):主测组Y误用X、漏角落钳制、传送抢先返回各完整旧14绿→恰1指定AssertionError;leaves组Equal无效、移除输入焦点守卫各旧6绿→新8例(含两条真实公开widget合同:keydown→setZoom→computeView→原生strokeRect四档裁剪与两端钳制、INPUT/TEXTAREA焦点守卫)恰1指定AssertionError。minimap.ts仅注释改动,去注释JS逐字节一致见[emit-identity.json](emit-identity.json);测试身份仅一标题勘误加两合同新增、无退役,见[test-identity-delta.json](test-identity-delta.json)。

## 结果

复原正式9文件58绿(22直接/36相邻),无skip/pending/unhandled;game typecheck通过,docs check 125例五组静态消费者全过,lint零诊断,账本3315 tracked/261 closed/82 review/2972 pending,门汇总见[gates.json](gates.json)。三文件继续review,0新closed,83卡51partial/32pending/0accept不变;本片不合main。

## 限制与复核

未知仍有非法持久zoom、DPR/越界与labelMap原型/非整数输入域、原地triggerLabel缓存失效、完整异步IO/取消/卸载与save/UI相邻边界;全仓check、official coverage ratchet、protected fast、完整包/真实原盘纹理/原EXE/浏览器视觉/E2E均不跑、留大任务收尾。raw负数量与具名高位数量语义缺生产输入证据留review;无复用提取,未证收益不扩大API。未重跑原命令;历史结论保持原时点;候选待 Owner 非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 4979B / SHA-256 12db758df754d892209e2d2271e77180657a8d483f6ff627279222c624736970；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# pre94 minimap 分类与缩放 oracle 返工

Status: recorded
Owner: Codex（单Agent；自身源码复核，不冒充第三方）
Date: 2026-10-18
Base: `987bdddac38ea3e95d84a3b82dcdeb1ba314556c`
Branch: `codex/code-quality-3y`

## 准入、完整读取与实现边界

id: QUALITY-PRE94-RETROSPECTIVE-1 / minimap-classification-view；schemaVersion:1；status:recorded。沿用[父卡](../../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)三文件低风险注释/测试准入；三文件原487/148/200行全文，真实tools/bootstrap接线、正式GameState/NPC/Command、提取器disasm/SSS、库存helper与脚本catalog按[实际读取边界](read-boundaries.json)核读。两邻接panel测试全文只作排重，不授本轮整文件验收。minimap.ts只改两条事实注释；[parsed TS/JS证明](emit-identity.json)不能替代审查。产品分类、缩放/键盘行为、生命周期、seam/色板、资产、schema/save、公共接口均未修改。

## Primary、caller 与合法域

SDLPal无同形态minimap，不能伪造原版UI真值。生产bootstrap把640输出注入tools→setupMinimap；scene280 CSS视图与widget180 CSS画布分别全图/按队长缩放。有效缩放为2080/1280/960/640，world相机偏移16、framebuffer2080、viewport320×200；本片独立期望用4/13和180/世界视野宽推导，不借被测worldToThumb/BASE_PX反推。

C script.c:970–975把0x1F数量按SHORT传库存，global.c:1063–1172支持正加/负减/零作1。真实disasm的具名count保留U16，事件具名路径直接传给inventory；raw路径另signExtendI16。原盘SSS只读统计425条0x1F、401条count0、0条signed负量，详见[计数](raw-quantity-audit.json)的raw SHA/offset/全指令边界；这是该版本全部0x1F，不是仅地图宝箱，更不是可达剧情或原EXE观察。原“绝大多数地图宝物/木鞋”断言收窄；测试名不再把人工_item名当原盘映射。raw负数量与具名高位数量语义尚缺实际生产输入/调用证据，留review，不改解释器/提取器或宣称当前剧情缺陷。

## 测试判别力与排重

主测仍14例：中心视野改独立sx/sy/sw精确数值，并用不同x/y排除对称夹具掩盖轴混用；角落核左右上下实际钳制和宽度。新数值在同一旧输入上比原3位/弱包含关系更强；原geometry与其它合同保留。item/teleport原先先item早返回，未区分“先出现就胜出”；现保留旧顺序并核teleport先出现仍item优先。count0只改无据标题，原断言/输入保留。

leaves原6例保持，加两项真实公开widget合同：实际keydown→setZoom→computeView→drawMinimap→原生canvas.strokeRect，穿透spy核四档裁剪及两端钳制的参数和持久index；INPUT/TEXTAREA冒泡和widget关闭时不修改index/重绘。正式GameState工厂提供真实camera=party-(160,112)，无核心mock/强转/宽容matcher。ctx spy精确finally恢复，沿原自有宿主释放rAF/window/DOM/偏好/地图号。没有把canvas调用参数冒充截图/原版视觉或完整widget生命周期。

[五反控](controls.json)：Y误用X、漏右下钳制、传送抢先返回各完整旧14绿→新13绿1指定AssertionError；Equal无效、移除输入焦点守卫各完整旧6绿→新7绿1指定AssertionError（新8含两独立增量合同）。每轮完整未过滤nativeJSON/raw、command/cwd/身份/exit/signal/spawn、源/测试/mutant SHA与finally逐字节恢复、精确临时树清理保留。复原正式9文件58绿，22直接/36相邻、无skip/pending/unhandled/运行时诊断，game typecheck通过。[身份差异](test-identity-delta.json)仅一标题勘误及两合同新增，无退役/baseline变更；邻接panel的display-scale委托并不重复widget缩放合同。

## 门、账本与未完成范围

[门回执](gates.json)保留完整未裁剪gzip原件。最终docs/lint/ledger结果按回执，不从exit0臆称无诊断。全仓check、official coverage ratchet、protected fast按用户成本规则留大任务收尾；本片不合main，不重跑完整包/真实原盘纹理/原EXE/浏览器视觉/E2E。

三文件继续review；3315 tracked /261 closed /82 review /2972 pending，0新closed。83卡51partial/32pending/0accept不变，CODE57 seam/thumbnail闭包停止线不解除。未知仍有非法持久zoom、DPR/越界与labelMap原型/非整数等输入域、原地triggerLabel缓存失效、完整异步IO/取消/卸载与save/UI相邻边界；未试项不“保留已验证”。无复用提取：本图几何与DOM宿主职责不同，未证公共抽象收益前不扩大API。

## 交接与下一步

同3y提交推送，fresh fetch且0behind后继续；全仓存量运行时诊断未清，不合main。接下来回到pre94尚pending的最小不重叠模块；minimap剩余输入/生命周期保留review，遇真实产品差异先专卡，不在这里顺手改。94–102/editor仍后置。无下一位Agent提示词，Codex单Agent继续完整83卡。
```
<!-- incremental-original-source:end -->
