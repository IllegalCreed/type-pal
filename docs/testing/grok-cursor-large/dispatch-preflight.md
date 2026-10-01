# GC-1 派发前核验（2026-10-01）

本轮只新增Grok/Cursor测试任务、冻结/所有权表、验证器与文档；
没有新增作者业务测试、没有接收O/P/Q、没有合main或正式覆盖结算。

- 分派源基点：5cbe5c08b43a3e53b9b7109bc26ab2f913df969e。
- 保留源46+74=120，交集0；全局冻结716/716复核通过，官方baseline未变。
- 与当前main逐源核验：120/120 hash相同。发现world-sprite-behavior完成流变更，
  已移出Cursor表，以stamp-commands替换；新机制相关轴不在build，不能沿用旧真值。
- 固定O/P/Q排重对象完整SHA已通过git cat-file；不把其作者回执当accept。
- 新所有权/写入判据自测34/34；现有docs工具37/37，均非零执行、无skip/todo。
- 首轮正常格式检查2个新工具文件有format error，已正常格式化；没有忽略/降低规则。
- 首次根lint完整2757文件，新增本证据后最终2758文件，均0 error/0 warning/0 info。
  初次内联main-hash探针语法错误，
  修正临时命令后120/120通过；不把第一次失败冒称绿。
- 登记本证据前docs实测830 Markdown/4403本地链接/249任务、零问题；
  增加本证据后最终831 Markdown/4406本地链接/249任务，docs/diff均零问题。
- 修改均为本轮docs/card/tool。主树、GLM活动树、产品/旧测试/配置/官方baseline与真实数据未写。
- 本卡写入scope在targets注册提交产生后，再分别在两个新隔离树以完整BASE复核；
  此项不伪装为已核作者候选。

后续由用户转发[两卡提示词](README.md)及GLM P/Q避让。
Grok/Cursor新任务待实际开工；O/P/Q仍rework、未done。没有自动发消息、切模型或清树。
