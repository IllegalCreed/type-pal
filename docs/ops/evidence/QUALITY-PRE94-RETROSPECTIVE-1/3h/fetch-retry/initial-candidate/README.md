# fetch测试初始候选原件

这是未提交/未验收的初始19例候选。原三业务缺口的新红与scope核验之前，已运行完整game：320文件/3605例通过、0失败/跳过，但17块stderr，不能声称质量门通过。诊断14文件均与dfd03a811同SHA，仍须逐文件归因。

初始新增的pre-aborted init测试要求一次底层调用，过度约束合法取消预检；scope-reference仅增加预检就会使其一红。最终改成请求已经开始后在真实AbortController上取消，仍精确一次底层调用、不弱化为“至多一次”。本目录保留初始after、list/V8与完整包raw/JSON；当前最终候选以[父报告](../README.md)及父目录after/scope回执为准。

[文件SHA清单](../initial-candidate-manifest.json)记录归档候选当前的确切字节（JSON元数据仅统一格式；原生raw/JSON的gzip原件保持）；对应before业务基线仍在父目录，未重跑/改写。目录中的passing、反控或包回执不作为当前整文件accept，不覆盖最终源SHA和范围修正。
