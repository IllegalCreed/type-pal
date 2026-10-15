# CODE3h PNG 测试质量复审切片

基点46fb9d5fe，main=f98d0ddd8，唯一codex/code-quality-3y。原[3h卡](../../../archive/tasks/done/CODE-QUALITY-3h-game-assets-shell.md)的done保留历史身份；本片不替整卡补accept。四份测试10→9，0新增文件关闭；只改测试、注释和两项精确退役数据，生产/规则/官方基线/资源保持。全83卡范围以及94–102/editor返工继续。

后续[启动屏障与fixture切片](bootstrap/README.md)：两个旧绿新红、弱重复13→12、默认端口真实Promise收尾；三文件仍review，fetch-retry留下一有限片，整3h与统一门未收口。

## 逐文件结论与真实消费链

实际全文/分段读取和SHA见[读取边界](read-boundaries.json)，不把grep、执行过相邻测试或导入helper写成全文验收。生产png.ts、loader/tileset-blob/rle-decode、fetch-retry/bootstrap-resources六文件已全文读取，后五文件整域caller/异步/排重仍待后续切片；本片只补PNG测试证据。bootstrap.ts只读所列调用段，不触碰活跃57实现。

primary：extract的resources/sprite.ts:27–55将合法索引写入R/G/B、opaque写为0/255；game/assets/png.ts:24–51实际createImageBitmap→canvas→R/A平面并finally close。真实caller包括loader.ts:43–47的fetchPng、dialog-assets.ts:42–70头像加载，以及P10实际toSpriteImages→drawSprite→Framebuffer写像素。RLE格式、CLI输出ownership两个draft停线不因PNG测试解除。

| 实际修改的测试 | 原缺口/重复 | 当前证据与未核范围 |
|---|---|---|
| assets/png.test.ts | 唯一高位索引200正例，不是可凭短小删除的重复 | 完整[42,200]/[1,1]，复用独立PNG字节encoder；仍review，不声称覆盖全部PNG/浏览器域 |
| assets/png-decode.grok-r1.test.ts | A02只验尾像素；A05只验cause为某个Error；A04坏Blob摘要弱重复 | A02完整3×2有序下标/遮罩；A05默认透传spy观察真实解码Promise，核完整size/type前缀和原始失败对象身份；A03上下文缺失释放保留。5→4，所有spy/fault均finally恢复 |
| assets/png.glm-phase1-leaves.test.ts | 标题/头注释暗示dialog caller，实际只解码PNG；坏Blob摘要与A05重叠 | 头注释限于真实alpha合同，保留alpha=0/200且index0边界；2→1，弱错误摘要转A05，不虚报dialog调用 |
| present/__tests__/grok-present/p10-indexed-png.test.ts | 同例串四次解码，前一失败遮住后续close轴；强转绕开canvas overload | 保留真实像素、anchor与输入ownership；成功close并入正例，getImageData/drawImage失败各独立一例。2→3，typed局部helper在finally恢复context与bitmap端口，无新增强转 |

fixture复用现有32行png-rgba.ts（zlib/CRC、自给字节，不调用SUT），移除两个重复canvas encoder及Grok PNG测试对大型legal-host.ts的编码耦合。未新增共享公共接口、核心mock或依赖。P10的world.ts仅核cloneInputs段，未将该大helper标为已验证。错误cause的身份来自真实失败Promise而非预制替代异常，符合[ECMAScript InstallErrorCause](https://tc39.es/ecma262/multipage/fundamental-objects.html#sec-installerrorcause)保存传入cause值的合同。

## 先旧绿再新红，转移证据单列

原件：[before-proof](before-proof.json)、[after-proof](after-proof.json)，每轮含同四文件完整原生集合、file/fullName/status、raw/runner SHA、临时源与测试副本SHA、命令/cwd/exit/signal/spawn/清理。每个故障只在临时生产副本改变一个已列片段，正式源始终未改；坏Blob使用真实node-canvas解码。

| 变异 | 旧10例 | 新9例 | 结论 |
|---|---|---|---|
| 正常实现 | 10绿 | 9绿 | 完整对照 |
| 合法palette index1错误变0 | 10绿 | 8绿/1个G02-A02 AssertionError | 新补的完整平面缺口 |
| cause替换成另一个Error | 10绿 | 8绿/1个G02-A05 AssertionError | 新补的真实异常身份缺口 |
| 丢掉解码错误上下文 | 6绿/4红 | 8绿/1个G02-A05 AssertionError | 原oracle 4→1转移，不算新针 |
| 删除finally close | 8绿/2红 | 5绿/4红 | Grok A03及P10三独立轴，原oracle转移，不算四个新缺口 |

全部失败的实际default reporter errorName为AssertionError，0skip/act/环境/stderr块；不是TypeError、导入失败、超时或0执行。旧A04的4B、GLM的3B和P10的3B均在同一catch路径，长度只插入错误文案；保留A05的1B完整文案/真实cause，没有删掉不同业务分支。高位200、非R通道、透明/非零alpha、上下文缺失和真实像素消费各轴保留。

初轮探针曾因Vitest4.1.7 `.rejects`的JSON failureMessages保留预分配Error栈而误判实际AssertionError；[分类诊断](classifier-diagnostic.json)、原探针gz与四轮checkpoint保留。改用原生default reporter的精确FAIL file/ancestor/title关联实际errorName，JSON仍保留完整栈。第一次resume只是tuple/list表示比较失败，未启动任何测试；随后复用原四份native回执，只补缺失close轮。没有重跑旧四轮、改写原raw或放松断言/产品规则。

## 身份、排重与实际覆盖

[collection.json](collection.json)及原生list/V8 gz：main、旧3y d4cf7f57d和本片基点的四测试均逐字节等于before快照；after按原生list计算Node localeCompare排序与JSON.stringify SHA。Grok5→4、GLM2→1两项精确count/双identityDigest/当前文件SHA见[retirement.json](retirement.json)。退役表27/net62→29/net64，旧27项、matcher与全部拒绝合同原样不变；P10 2→3和主例/A02标题变化公开，不以总数相近伪称身份相同。官方baseline/config完全未改。

局部V8在真实assets/png.ts运行旧/新测试，并非临时SUT副本；statements20/20、functions2/2、branches4/4、lines18/18保持。这只是本源局部覆盖对照，不是官方ratchet/protected。node-canvas适配的close是no-op，所以仅证明调用和恢复，不冒充真实浏览器内存释放或视觉验收。

[verify.py](verify.py)另进程只读重建10轮源/测试副本与原生执行身份、失败类型、原四回执复用、四轮native list/V8、三快照和两精确退役项；不执行SUT、不写批准表。它不是独立第三方审查。收集器和探针自身不计产品测试数量或已关闭文件。

## 验证与剩余范围

[测试回执](test-gates.json)：真实game相邻17文件107例、extract相邻4文件16例、coverage工具74例均exit0，0失败/跳过，原始输出无运行时诊断；game typecheck与四文件Biome检查见[初始静态回执](initial-test-static.json)。最终docs/lint-zero/ledger/diff见[gates](gates.md)，必须以实际回执为准。

四测试只从pending登记review，六旧生产关闭保留历史身份，本片未重新accept、也没有直接生产counter便批量撤回。全83卡当前13partial/70pending/0整卡accept。其它旧卡、assets cache/loader/blob、shell启动屏障的整文件合同/测试质量，以及94–102/editor诊断仍待；CLI清理策略继续等既有用户裁决。全仓check/official ratchet/protected本片未新跑，editor最新全包仍有诊断，未合main。

下一有限片：3h的bootstrap-resources两测试与fetch-retry boundary合同，先核合法LoadedAssets fixture、真实bootstrap caller与混合断言/排重；不改bootstrap.ts或未决产品/资产策略。完整模块稳定窗口再集中统一门。无下一位Agent提示词，Codex单Agent继续全部83卡。
