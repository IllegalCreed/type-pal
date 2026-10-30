# CODE70 音量测试逐文件复审

基点 `9cd270f26`；唯一 `codex/code-quality-3y`。Codex单一Owner，build allowed仅`audio-volume.test.ts`、相邻`audio-volume.boundaries.test.ts`及治理记录；生产源、公共API/UI、save/schema、资源管线、规则与baseline未改。70由pending推进partial；仍不作整卡accept。

## 实际读取、caller与oracle

[read-boundaries](read-boundaries.json)保存完整实现/两测试和实际bootstrap三通道注入、tools-panel滑块/主静音广播读取范围与SHA。[contracts](contracts.json)逐合同列合法输入、精确状态/sink/持久化oracle、排重和隔离。工具音量是项目扩展，SDLPal无同形UI合同；当前公开typed控制器与真实注入caller为依据。sink spy只观察注入输出，控制器状态与localStorage实际执行，无核心mock/强转。异常当前同步传播，没有在本片增加吞错/回退政策。

## 发现与处理

- 旧卡3+5的数量不是当前事实；修前实际main3/boundary3，共6例，旧记录按原时点保留。
- 主测试补全上下界/中间值的持久化与完整sink序列；静音工作流接收boundary原“静音中改目标”职责，明确区分目标音量与有效输出，验证取消静音恢复最新0.9及mute0。启动回读用exact一次apply0。
- boundary原stored0/default0混合拆为独立输入合同；三通道音量键与共享静音键拆为独立配置轴。原“setMuted仍读共享键”注释错误，改为持久化/新实例读取，存活实例不自动同步；生产面板显式向三路广播，不能把共享key误当响应式状态。
- 原keyMute测试总传默认tp-muted，忽略参数也能全绿；改用公开合法的自定义键验证写入、新实例恢复及默认键未受污染。不改变生产配置。两测试均before/after清偏好，失败不留状态。

修后3+5共8例，增加只来自拆分混合职责；没有为覆盖率堆测试。已证重复的静音中更新不留第二份用例。

## 反控、验证与未关闭

[before-proof](before-proof.json)、[after-proof](after-proof.json)与gzip native/raw保留command/cwd、exit/signal/spawn、完整file×fullName、正式源/测试/隔离变异hash和精确清理。仅在临时音量模块中忽略keyMute：旧6绿，新7绿/1个指定共享自定义keyMute用例AssertionError；正式恢复8绿。生产源字节未改，无collection/runtime failure或skip信用。

[test-gates](test-gates.json)：直接两文件8例及tools-panel/bootstrap-audio/music-source相邻合计 **6 files / 36 tests passed**，0 failed/pending/stderr；game typecheck通过，无诊断。最终[static-gates](static-gates.json)另记docs/lint/ledger/diff。本小批未跑新全仓check、official coverage ratchet或protected fast；旧53波次不认证本候选，昂贵门留完整模块窗口。

main测试新增一项有证据闭合；boundary更新证据，不重复计数；生产audio-volume.ts不由相邻全绿重新关闭。账本3312 tracked / 287 closed / 44 review / 2981 pending。83卡48 partial / 35 pending / 0 accept。未知storage-denied启动政策、真实播放/音量听感、完整bootstrap/UI仍不由本片认证；未改变高风险边界。下一批72 boot-loading的实现/主/host三文件，避开活跃Owner文件；随后续剩余pre-94，94–102/editor顺序不变。
