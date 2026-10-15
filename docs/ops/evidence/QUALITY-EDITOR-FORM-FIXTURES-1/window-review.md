# C04/C05/C06 联合稳定窗口

候选cae26b1c7d3f48f200d34aea280726591b36c41b；protected main f98d0ddd89ebdee7b04502ee35de26ee82c6d246。八份源文件在check→普通ratchet→普通protected全程SHA冻结，packages/scripts只有官方ratchet改写baseline.fast.json。没有scope-removal参数、退役、规则/配置/产品改动。本窗口只验前三检查点，不包含下一片临时副本的大世界精灵测试。

| 门 | 退出码 | act外更新 | 不支持act环境 | native导航 |
|---|---|---|---|---|
| check | 0 | 1152 | 243 | 0 |
| ratchet | 0 | 1071 | 243 | 0 |
| protected | 0 | 1031 | 243 | 0 |

严格统一诊断门：**未通过**。退出码0不能代替零诊断；这些是三个模式的原始计数，不推断其它runtime输出消失。最近stderr头仅做待核线索，worker交叠可能影响归因；逐文件根因仍须独立重跑。

全仓check：七包1640文件20269测试全通过，七包typecheck通过；editor631/4946、game318/3564。工具测试由check完整执行。check内lint4229文件0 error/0 warning/0 info，docs 0 issues、184phase/lore与570semantic记录。未用包级全绿关闭文件。

普通ratchet与protected均实测736生产源、19860测试，editor4784。scope无删除，生产include/exclude/sourceScopes完全一致，全部coverage分子/分母指标完全一致，六个其它包完整baseline对象也完全一致；只改变editor一处诚实标题身份及其摘要。官方baseline SHA由462ddc75f0bdde8cfa1f168669c08f44b9cc145452eb1dd7c79172bf4299e433变为f0d008c301aa4e86b2d08d8ffc292ffdf006f26efc021e8dffb747dbd0d4e790。精确核对见scope-proof.json。

C04 Kimi战斗精灵六例、C05导航两个测试、C06表单四测试及之前C01/C02在本窗口匹配的三类诊断0；范围/限制见window-proof与diagnostic-census，不能推成全部console零。C05音频端口/故障日志仍未收，原件保留。关闭0文件；账本3284/229closed/62review/2993pending，C04/C05/C06均留review，不合main。

下一片候选为WorldSpriteLibrary.kimi-workflows、glm-ui-wave及其共享宿主：已经只读完整核caller/proof/真实IO；冻结期间仅在独立四包临时副本准备，接收前核原始SHA并另跑定向/相邻/typecheck。其准备结果不能倒灌到本窗口宣称已覆盖。其它ImageTab、FrameAnimationEditor、SkillTab、TilesetTab、CutsceneTab等act/环境仍待逐文件核验，未知项不关闭。

无下一位Agent提示词，Codex继续。剧情视觉E2E N/A（纯测试），没有新增产品裁决。
