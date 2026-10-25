# CODE1 RLE测试质量与真实资源影响域收口

> 2026-10-25当前：原盘格式停止线已获批准并修复，见[PAL来源修复及当前只读复验](../../code1-closeout/pal-source-fix/README.md)。本文测试质量原件保持；格式冻结措辞为历史时点，统一门另记。

Status: current evidence receipt
Owner: Codex
Date: 2026-10-25

## 结论和边界

基点13a68691f61693450a04cb3effae6ee5a6e8c277，同一codex/code-quality-3y，主树只读。六个测试范围按[逐文件A–H裁定](review.json)接受：rle.test、boundaries、GLM-o三旧review和新测试夹具四项新关闭；runtime-resource与encoder旧关闭刷新。**产品rle.ts仍review，CODE1整卡仍partial**；3m／42也未关闭，固定83卡80accept／3partial不变。产品算法、接口、原盘和生成物零改动。本页不授完整pre94／集成／原版结局验收信用。

## 实际读取、caller与取舍

五测试当前／基点全文、编码解码实现、共享barrel与类型及两处新fixture真实consumer；game tileset-blob／rle adapter、ending-player／DOS接线、extract sprite；SDLPal取帧／绘制／YJ2对应函数。广域CLI／Reforge调用仅复用既有有界证据，不冒充本窗全文。当前文件与主要caller／配置／primary指纹见review.context；旧GLM文案补证按Git和父README保留，不把其旧“51例”移作本窗结果。

三处原用例把SUT输出与同一SUT另一输入相比较，现改独立已知pixels／opaque／完整report。generic-opacity、strict-pixels、indexed-count三源副本反控都旧绿、新恰一业务AssertionError；不是收集错误或超时。官方源始终未改，临时目录finally移除；筛选时其余8个原生skipped身份来自名称过滤，不等于新增skip指令。

[59→59完整身份和断言合同去向（精简＋原子化）](identity-mapping.json)：九个已证重复合并，所有旧身份都有已执行的新身份承接，没有只按数量删除。strict sentinel保留直接strict入口和完整indexed报告；world出口在当前源是同一indexed函数别名。无sentinel／空表／坏尾等各原合同有明确承接。原伪“chunk encoder roundtrip”只调用frame encoder，现由真实公开chunk编码→严格／宽容双入口、独立原始帧和25-byte奇数payload覆盖。两个相同byte-table夹具收敛为test-only叶，错误oracle仍留各测试。generic和strict错误合同不同，未强并算法。

## 执行与诊断

| 门 | 实际结果 |
|---|---|
| 基点五RLE文件 | 59／59，0skip、stderr0 |
| 最终五文件 | 59／59（9+10+12+9+19），0skip、stderr0 |
| game相邻三文件 | 20／20，含真实blob快照，0skip、stderr0 |
| extract相邻三文件 | 12／12，0skip、stderr0 |
| Reforge相邻两文件 | 20／20，0skip、stderr0；不因此扩二阶段设计范围 |
| shared typecheck | exit0，stdout／stderr均空 |
| 精确退役账单文件回归 | 82／82；仅新增main精确快照和固定总数，退役判据不变 |
| scoped Biome最终普通reporter | exit0，stderr0；初次JSON reporter的experimental提示原件保留，未把它写成零输出 |
| 全仓check／official coverage／protected／PR | 未跑／未建，按用户要求等全部pre94冻结 |

所有命令、cwd／时间／exit／signal、完整stdout／stderr和原生JSON收在[无损归档](receipts.json.gz)，每member有字节数和SHA。最终将独立错误轴和单帧／空容器拆清：精简九个重复身份后再将原捆绑输入分成可定位的独立执行，最终仍59例；中间50例原件保留且不冒充最终结果。三反控与52相邻的产品／caller／受控测试体未变，直接复用。官方baseline未改；只有main26→19需要新精确退役记录，GLM-o现12例不适用旧13→9快照；历史记录保持，不叠加白名单。

## 格式停止线：MGO571由未知变成真实counter

只读扫描GOP／MGO／ABC／F／FIRE／DATA9,10,12／RGM／BALL：4,662,630条当前TS成功帧命令，0高位分类分歧、0解码拒绝、0解压失败，原盘SHA前后不变。**这是TS结构trace，不是全资源native像素一致**；此前1332帧native证据只按各自已冻结来源复用。合成高位literal与作者canonical透明游程分歧仍在原[格式卡](../../../../tasks/QUALITY-RLE-COMMAND-TRUTH-1.md)。

本次唯一special offset来自真实MGO571槽1：TS99396越界，SDLPal原取帧函数按特殊规则得到33860；原生YJ2与绘制函数经AddressSanitizer编译实跑得到两幅320×200帧。当前实际loadSpriteFramesBlob只返一帧，playEndingAnimation要求至少两帧，故完全跳过妖兽。真实Canvas在第200步，native第二帧有23036非零像素，实际为全黑；预期SHA与原生像素SHA完全一致，断言失败原件保留且浏览器已关闭、无其它诊断。

![当前实际播放入口：妖兽图层空白](ending-actual.png)

![原生帧接同一播放入口：妖兽可见](ending-native-reference.png)

这是黑背景／无女主／灰度palette隔离妖兽层的定向反例，不是PAL.EXE运行，也不是完整剧情结局验收。raw资源与原生大像素plane／二进制不入库；归档保留C源、生成者、函数SHA、完整编译／执行回执，需本地匹配原盘才能重新生产。产品修复请求已发用户，尚未获本次授权；不擅自把PAL偏移hack扩到自建canonical格式，不改原盘或生成物。

## 低成本复验和失效

先运行（只读、不联网、不跑测试／coverage）：

```bash
node docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/rle/quality-closeout/verify.mjs
```

预期exit0：核上下文／原件、全部身份映射、真实三单红、当前退役判据及MGO反例。SHA漂移按受影响claim定向复核；缺raw返回2并注明unavailable，不把缺数据当通过。脚本只核可机械事实，八维设计判断由Codex本次逐文件审查承担；附件和passed字段不能自动认证代码优良。

需要重放时先解压归档到新临时目录；完整producer命令保留原cwd和原临时路径，须将路径改为新owned目录，并保证wx不会覆盖冻结件。五RLE定向入口为shared目录下vitest run指定五文件（显式default+JSON reporter）；不要把vitest list位置参数当输出文件。未变候选不重复全部阅读、native或重型门。下一范围为已有3m／42裁决及本格式停止线，不扩94–102。

过程披露：首版快检误要求预期红例stderr为空，第二次把名称筛选的skipped也算成执行；两次失败原件均保留，最终按passed／failed、指定身份和业务AssertionError核验。没有修改测试原件或放宽业务反控。

原子性补审：boundaries四种帧错误、GLM-o三种容器头／两种offset／两种尺寸及独立合法正控、encoder单帧／空容器分别可定位；重复的count篡改表截断并入现有容器头oracle。未添加新行为轴或为覆盖率补数量。

[最终文档／lint／diff／ledger静态原件](static.json)与上表代码回执分开冻结；复用未变的docs工具回归，不重跑125例，也不把静态检查等同统一check或coverage。
