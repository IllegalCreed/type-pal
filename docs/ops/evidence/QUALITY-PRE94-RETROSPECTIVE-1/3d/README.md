# CODE3d：PNG 输入合同与注释复审

归属[94前全部83卡复审](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)，原[3d历史卡](../../../archive/tasks/done/CODE-QUALITY-3d-pal-extract-png-inputs.md)保持历史done。当前基点65c375e06、唯一codex/code-quality-3y、main=f98d0ddd8；本轮整卡仅partial，0新增关闭。

## 真值、调用与职责

[读取边界](read-boundaries.json)列十二份全文与四份局部的路径/SHA；CLI仅353–391/603–631/835–864，不伪称整文件已审。PNG是本项目运输格式，不能把它说成SDLPal的PNG编码。SDL palcommon.c的RLE跳过不写目标、literal照写palette-0；SpriteGetFrame解释容器索引。当前shared负责解码，extract encoder写RGB=下标、A=mask，game decodePngToIndices读取R/A并finally关闭bitmap。

真实生产入口包括CLI的DATA9 UI帧、320×200 FBP背景，BALL/RGM/FIRE wrapper。RNG PNG wrapper当前只供历史/测试，CLI改存gzip，不能沿旧卡把它冒充当前生产输出。framesToOut复用单一encoder，解码也复用shared；本片没有为了短函数新增抽象或复制算法。extractCharacterSprites在仓库源码搜索中只见定义和测试，没有搜到生产caller；保留review候选，不凭搜索擅删出口。

| 文件 | 直接结论与处理 | 未完成项 |
|---|---|---|
| sprite.ts | 原头引用不存在的sprite.c::PAL_LoadSprite；更正为实际palcommon/frame lookup与R/A consumer。无mask直接对应FBP caller；RGBA字节经过压缩，删去“磁盘必为四倍”的不实说法。所有实现字节不变。 | 整文件包含其它出口；无生产caller候选、超大尺寸域等尚未闭合，旧关闭撤回review。 |
| sprite.boundaries.test.ts | 旧两例把width正数/整数及pixels/opaque输入轴混在一起，且没测height。拆六独立合同，保留原四个断言，补height0/1.5的入口错误oracle。 | 不声称覆盖全部数值域；统一门未过，旧关闭撤回review。 |
| sprite.glm-runtime-resource.test.ts | 直接PNG解码核RGB/alpha与palette-0、多帧完整像素、多id顺序有实际业务执行。旧头虚称主测试已有PNG魔数/首帧等，已校正；测试body不变。 | 全域排重、全部ownership及统一门待续，仅review。 |
| sprite.test.ts | 全文已读；空组与缺id合同真实调用helper。生成物sanity只读已有文件，不调用CLI，不能证明实际提取或fetch去重。 | warn spy失败收尾、可选生成物早退及oracle边界继续待核；本片不改，pending→review。 |

RLE高位literal真值仍归[冻结前提卡](../../../tasks/QUALITY-RLE-COMMAND-TRUTH-1.md)，本片不改解码、格式、schema/save、管线、资源或公共接口。

## 两项测试盲点的直接反证

[旧三轮](before-proof.json)与[新三轮](after-proof.json)完整保留三文件每个file×fullName、原生JSON/raw、命令/cwd/exit/signal/spawn、源/副本SHA以及精确清理。没有把普通Error、collection失败、跳过或重复红算作有效针。

| 同目录隔离变异 | 旧结果 | 补证后 |
|---|---|---|
| 只删除height整数guard | 9例全绿 | 仅“height必须为整数”一项AssertionError，其余12绿。 |
| 只删除height正数guard | 9例全绿 | 仅“height必须为正数”一项AssertionError，其余12绿。 |

正常恢复13通过，0失败/跳过/诊断。9→13来自boundary2→6：四个原断言分成四合同，加两个height合同；无重复sanity堆数、无测试退役、无新增批准项，也没有手改coverage baseline。两阶段production从encodeIndexedPng声明到文件末尾逐字节一致，GLM imports之后字节一致，主测试全字节一致，由[只读核验](verify.py)另进程重建，见[verification.json](verification.json)。这证明测试缺口，不能冒充修了现有PNG实现bug。

## 实际回归与剩余范围

[原始回执](regressions.json)：初次相邻命令两个路径写错，原生JSON实际只有六文件47例，按实际六文件记账，不称八文件。完整包原生72文件432例已包含真正的ball/rgm.glm-runtime-resource.test.ts，两文件存在与执行由核验器确认；命令原件不改写。game实际PNG consumer三文件8例、extract typecheck均通过，无stderr/act/环境诊断。

docs/lint-zero/ledger与diff-check见[gates.md](gates.md)。完整全仓check、official ratchet、protected fast继续等待稳定窗口；editor当前仍有已登记诊断，不合main。机器账本以当前重跑为准；全83卡当前11partial/72pending/0整卡accept，下一片3g CLI IO，94–102/editor原目标与其余卡保持。
