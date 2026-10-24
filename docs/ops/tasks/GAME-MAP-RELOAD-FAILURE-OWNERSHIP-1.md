# GAME-MAP-RELOAD-FAILURE-OWNERSHIP-1 — 换图失败的活资源与拒绝归属

Status: review
Phase: phase1 game
Capability: Q3 shell / async resource ownership
Coding Owner: Codex（同一治理树单一写入Owner）
Reviewer: Codex
Visual Verification Owner: Codex
Visual Verification Timing: functional-ui
Branch: codex/code-quality-3y

## 目标与范围

使替换地图失败不会提前销毁当前可绘制瓦片，并由调用方消费IO拒绝。用户2026-10-25批准“失败保留当前地图并记录错误”；build allowed。不新增失败提示、重试、生成物、存档或剧情规则。候选涉及shell/bootstrap.ts的map-only资源发布、core/event-system.ts的0x99异步拒绝消费及必要正式回归；白名单为上述两个实现文件、现役K04专测、真实浏览器回归与配套证据。下载后只由仍有效的请求发布，场景重装/后来的换图使旧请求失去发布权；不改变成功路径的脚本继续语义。

## 前提真值门

| 维度 | 当前事实与直接来源 |
| --- | --- |
| primary | SDLPal script.c:2740–2753的0x99在当前场景换图；同步资源模型没有浏览器HTTP失败策略，不能伪称其规定了此取舍。 |
| 第一阶段 | bootstrap setMapReloader先delete当前scene的tileImages缓存，再await loadTilesetBlob；event-system OP_CHANGE_MAP用void丢弃返回promise。presentFrame清屏后从presentCtx.tileImages取图。 |
| 第二阶段 | N/A，本卡只辖phase1浏览器资源ownership，不借Reforge合同改变机制。 |
| 本任务目标 | 提议完整获得替换资源后才发布；失败保留当前地图，记录原始错误。不改变成功路径的地图数据/碰撞/脚本或Save。用户已批准。 |

最强替代解释是只有平台500日志而非产品拒绝、或资源丢失只是观察器错误。独立非持久Chrome实际main→bootstrap→正式raw0x99[65535,12,0]→真实资源loader，两条反例排除：tilemap JSON500产生未处理pageerror；瓦片blob500使当前tile0从存在变缺失，实际canvas由客栈变成黑底人物/少量遮挡块。原绘制函数、codec、主循环均未mock，只在HTTP端点返回500。不是原盘坏数据或地图解码错误，未写任何Save/原盘/提取产物。

## 证据与当前裁定

[父卡CODE57增量证据](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/bootstrap-quality/README.md)冻结三轮完整native/raw/producer、资源前后状态、已实际查看的before/after画布。各轮一个业务AssertionError；平台500与产品未处理拒绝均明确登记，不把负面轮次当零诊断通过。root纯重构和获批小地图补缝未改变此路径，原始反例不归因于本次重构。

此counter撤回event-system整文件关闭及CODE3r/53含该文件的整卡accept；其它逐文件/合同证据保留，不抹除已修毒/状态或专测信用。bootstrap继续review，CODE57不能整卡关闭；无需等待固定三签。用户call_6eeed1b6bbf9487da0a5579959147b46已批准，现按正式红例→窄修→相邻回归执行；旧停线与失败原件保留。

## 验收与停止线

获批后先写正式失败回归；JSON失败不发瓦片请求，blob失败不发布半份资源，成功保持既有映射与脚本继续顺序；拒绝由实际caller消费且原错误可定位。真实浏览器复核瓦片对象/画面保留与无未处理拒绝。迟到结果另以两个实际请求和同scene重装的浏览器反例核定，只消费仍拥有当前资源发布权的完整结果；不把固定scene失败回归外推为完整剧情通过。

八维、合法输入/独立oracle/隔离、失败与恢复原件、源码/调用版本和低成本只读快检同父卡证据。统一全仓/official/protected与一个PR等全部pre94解决，94–102不扩展。

## 交接

Codex同一3y单Owner；保留两条旧源反例，不重跑已可信的57相邻或旧全文。本次已获准，原始反例/错误对象与批准范围写回；CODE57/3r/53仅在其具体counter及剩余八维依据闭合后恢复代码信用，统一门仍待全部pre94。

## 2026-10-25 成功换图身份与重访准入（build allowed）

用户call_b5321581708e46f39e1c2043ce60ebf5批准修复编号/重访一致性。真实0x99换到76后getCurrentMapNum仍12；scene2→1→2重访得到tilemap12却仍借tiles76，GS override为76，零平台/运行诊断。此反例与失败保留分开：先固定正式浏览器合同再修，只同步现有一阶段map override/资源cache/工具身份，不改原脚本、Save格式或升级器。scene编号1-based与资源sceneId0-based需明确转换，map0合法，使用nullish而非真值判断。

Owner仍Codex，白名单仅bootstrap.ts、其现役场景身份说明的必要注释、正式浏览器回归和本卡证据。不新增shared cache API。cached SceneAssets由root发布时借用更新地图两字段；其它palette/NPC/event/onEnter字段原样保持。请求/scene发布权仍有效。非当前scene的既有override在入场时同样核资源配对，失败不发布半包；不由此增加重试或可见提示。


## 当前实现交付

失败保留及成功编号/重访两项批准均已完成代码修复；七真实浏览器合同、391相邻/TC0及精确旧版本回放/单守卫反控有完整原件。修前“待批/未修”均是原时点，现无本卡未修counter。代码验收成立；父卡统一门和最终集成仍开放，不以故障注入日志冒称console空。
