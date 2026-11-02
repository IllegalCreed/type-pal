# fetch测试初始候选原件

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-31
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「fetch测试初始候选原件」的治理候选页;证据原件即下方逐字节保全的固定main源(1071B,SHA bdd8c7b9bfc8)。本目录承载fetch-retry切片的初始19例候选(未提交/未验收):其取消测试是『已取消的 init.signal 用原始非AbortError原因立即拒绝』(pre-aborted式),与最终候选的『init.signal 在请求中取消时…』(请求已开始后取消)不同;boundaries测试文件SHA为e9141c69(最终轮为b58d0abe)。

## 来源与输入

来源为固定Git载体,非本次运行;原2个链接处置见作者review的linkDisposition。当前存活入口:[README.md](../README.md) [initial-candidate-manifest.json](../initial-candidate-manifest.json)。本目录保留初始after七变异反控、list/V8与完整包raw/JSON;对应before业务基线仍在父目录,未重跑/改写。

## 断言与业务 oracle

本目录关键事实:(1)完整game只在此轮跑过一次:320文件/3605例通过、0失败/跳过,但17块stderr(见本目录test-gates.json的game-full回执,stderrBlocks=17),不能声称质量门通过;14份诊断文件均与dfd03a811同SHA,仍须逐文件归因。(2)初始pre-aborted测试要求底层恰一次调用,过度约束合法取消预检——scope-reference仅在临时生产副本加一条init预检即令其一红(父目录scope-proof initial轮);最终改成请求已开始在真实AbortController上取消,仍精确一次底层调用、未弱化为『至多一次』。(3)初始after七变异:control 19绿,其余六变异各18绿1指定AssertionError——但其中init-abort-guard-removed的红来自过度约束的旧取消例,该例后被重写,故本目录反控红不能直接当最终判别力。空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

本目录回执不作为当前整文件accept,不覆盖最终源SHA与范围修正;当前最终候选以父报告及父目录after/scope回执为准。目录内passing、反控或包回执保持初始轮归属。

## 限制与复核

未重跑任何命令/测试;17块stderr只定位未归因;初始与最终两轮boundaries差异未逐行读(经身份digest与SHA对照)。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1071B / SHA-256 bdd8c7b9bfc8f105160f733b4dc801a569941a716658f8948d0bdee6ffc2a1a6；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# fetch测试初始候选原件

这是未提交/未验收的初始19例候选。原三业务缺口的新红与scope核验之前，已运行完整game：320文件/3605例通过、0失败/跳过，但17块stderr，不能声称质量门通过。诊断14文件均与dfd03a811同SHA，仍须逐文件归因。

初始新增的pre-aborted init测试要求一次底层调用，过度约束合法取消预检；scope-reference仅增加预检就会使其一红。最终改成请求已经开始后在真实AbortController上取消，仍精确一次底层调用、不弱化为“至多一次”。本目录保留初始after、list/V8与完整包raw/JSON；当前最终候选以[父报告](../README.md)及父目录after/scope回执为准。

[文件SHA清单](../initial-candidate-manifest.json)记录归档候选当前的确切字节（JSON元数据仅统一格式；原生raw/JSON的gzip原件保持）；对应before业务基线仍在父目录，未重跑/改写。目录中的passing、反控或包回执不作为当前整文件accept，不覆盖最终源SHA和范围修正。
```
<!-- incremental-original-source:end -->
