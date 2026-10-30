# C1 BALL/RGM同步诊断IO合同

归[原盘执行卡C1准入](../../../tasks/QUALITY-EXTRACT-RAW-TEST-EXECUTION-1.md)与全83卡复审，起点d0151242f；唯一codex/code-quality-3y，main=f98d0ddd8，单Agent。产品解析器/资源/接口/规则不改，0新增关闭。

## 逐文件与根因

[实际全文/区间/SHA](read-boundaries.json)区分完整阅读与caller片段。以下三测试文件只列review。

| 文件 | 实际核验、变更与未修 |
|---|---|
| ball.glm-runtime-resource.test.ts | 原5→4。零尺寸是坏RLE，不是原盘空槽；原例只核null，漏日志内容和Error来源。现在同进程执行真实decoder，完整消息必须保留原chunk9、Error尺寸0x0、decodeRle与本parser来源，标记/无标记各一，返回两null。旧“此前无测试”已与真实misc-mkf caller冲突，纠正注释。两条无标记/形似前缀例完全同7B/同id1，弱例只核宽高，退役后由原完整PNG例承接；合法alpha/opaque-0仍有独立固定oracle。现用assert收窄nullable，不靠非空强断言。 |
| misc-guards.kimi-r1.test.ts | 保持16个身份。RGM坏0×2/2×0保留原7/8两chunk、两真实Error来源及null；缺sprite原console no-op移为真实Console完整输出合同，保留原有效sprite/帧。已有parseItems截断例经同一边界传播原始错误，核正常finally恢复console，测试外层finally保护反控隔离。其它混合parser/fixture/重复轴继续review，不以原coverage选点和不同标题证明去重。 |
| src/__tests__/parser-diagnostics.ts | 仅同步parser IO，caller在上述两测试内。每次创建Node Console和内存Writable，不mock业务函数；真实消息/对象仍按Node标准格式写入两路buffer，stdout必须空、stderr所有记录按手列消息与Error来源消费。动态stack行号不逐字相等，要求标准stack行、首两生产来源，不能据此声称任意栈文本字节完全相等。未声明的普通日志/漏日志/错id/多消息均失败；无全局onConsoleLog/ignore/弱化断言。catch只保留error，finally先恢复原console并销毁stream，检查IO后返回原值或rethrow原错误。只允许本片已核同步调用，不用于async/UI。 |
| ball.ts / rgm.ts / sprite.ts | 全文只读。decodeRle明确拒零尺寸，BALL/RGM catch写warn+原Error后null；当前产品行为正确，本片缺的是测试IO合同。CLI452–500用真实RGM/BALL生产函数；sprite缺id的warn是当前函数正式输出。未改PNG、catch降级或调用接口。 |
| tables.test.ts864行、enemy-teams与P07/fixture | 全文读但未改。P07正例漏403映射导致非本轴告警，tables旧未知999例也未完整核warn；它们是下一个C2有限片。实际生产caller为CLI320–347同时传names/map，不把BattleSpriteLibrary消费域误说成parser直接caller。其它table实现未全文重审，本片不accept这些大文件。 |
| approved-test-retirements.mjs/test.mjs | 只增本次BALL精确5→4快照与25→26/净59→60固定期望。其它25条、matcher与14拒绝合同不变，仍review；71工具绿不替代历史各项验收。 |

## 隔离、覆盖率与错误清理

初步考察子进程后，直接读installed Vitest4.1.7 V8 provider，确认只收当前worker inspector。将bad-input执行搬走会丢当前生产覆盖率，因此使用同worker同步Console IO边界。没有把产品warn删除或设日志过滤规则；这些指定负面输出是被测值，全部手列断言。全包仍有另外两处未核日志，不以“预期”给常驻豁免。

[修改前](before-coverage.json)/[修改后](after-coverage.json)同命令、同真实ball.ts/rgm.ts源码的V8 subset实测完全一致：BALL statements12/13、functions1/1、branches11/12；RGM8/13、1/1、6/12。这是局部生产覆盖保持证据，**不是**官方ratchet/protected通过，也不证明剩余未覆盖路径可达。

## 直接判别力与精简

[counter-probe.py](counter-probe.py)整两文件执行，无name filter/skip/todo/timeout变化，原src/test不改，临时同目录模块/copy finally清除。20轮完整命令/cwd/exit/signal、原生JSON/raw、源/副本与重建SHA在[before](before-proof.json)/[after](after-proof.json)。

- 六个原诊断缺口：BALL/RGM各省warn、改chunkId、额外一条输出。旧21全绿，新各19绿1指定业务AssertionError，0stderr泄漏；不是产品bug修复。
- 两个新增harness合同：包装原始parser错误、只在action成功时恢复console。旧测试直接调用parser，不使用新helper；新测试各精确一红，分别保护错误传播与throw时恢复，不宣称旧helper存在bug。
- 重复转移独立记录：只改bare id1的height，旧强/弱两例红→新仅强例红，全是AssertionError；该2→1转移不计单例针。两个输入字节和id完全相同，没有丢零ID/另一前缀输入。

[retirement.json](retirement.json)保存原生21→20、BALL5→4、描述更正的身份变化，不能伪称所有身份不变。HEAD/main/旧3y的旧文件字节及官方fast条目相同，冻结revision另列；登记前拒绝、登记后仅接受双digest+新SHA，字节漂移/额外删除继续拒绝。baseline/config/matcher不动。[collector](retirement-proof.mjs)仅是初次精确登记原件，不用于重复追加；[verify.py](verify.py)/[verification.json](verification.json)独立重建输入、失败集合/恢复/覆盖率/快照/清理，不冒充第三方签字。

## 回归与门

C1当前8文件53定向、shared16/126及双方typecheck、coverage-tools71通过，输出无act/环境/navigation或stderr泄漏。完整extract72文件431passed/0pending，仍有2个stderr块：tables未知OBJECT999、P07正例缺403映射。BALL/RGM的真实负面IO被检查，不静音产品日志；不能把431原生绿当包级零诊断或逐文件完成。

[静态回执](gates.md)按真实命令追加。证据collector初检exit0却有15条useTemplate info，未当通过，原始回执script-style.json/pre-script-style.raw.gz保留；只对该新文件修模板字面量，后续零诊断重跑另记。完整全仓check、official ratchet、protected fast未新跑，editor诊断未清，不合main。

本片新增唯一test-only helper进入tracked库存，两原pending测试和helper只记review，0文件关闭；全83编号卡仍9partial/74pending/0accept。下一片C2仅核enemy-teams/P07/tables的合法正向输入、未知域告警IO与精简，随后继续3b及94–102/editor。无下一位Agent提示词。

最终注释核对：helper原“every output byte”表述过强，已收窄为完整日志记录合同；动态stack并非逐字节固定。行为探针之后只改这一行注释，当前helper与探针快照的其它每个字节完全相同；verify.py显式核该唯一差异及两SHA，不重跑无行为变化的用例。
