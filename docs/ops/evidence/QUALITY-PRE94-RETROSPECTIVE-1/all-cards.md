# 94前全部83卡复审队列

2026-10-21当前：49 accept / 34 partial / 0 pending。CODE73/74原七文件接受；[当前证据与集中门](input-audio-closeout.json)。59和其余34partial未强关；94–102不扩展。

| 卡 | 原卡状态 | 当前复审 | 范围/证据 |
|---|---|---|---|
| [CODE-QUALITY-1](../../archive/tasks/done/CODE-QUALITY-1-governance.md) | done | partial | [RLE四文件](rle/README.md)：catch补证、格式风险draft；Q1b/其它范围未复验 |
| [CODE-QUALITY-2](../../archive/tasks/done/CODE-QUALITY-2-shared-codec-boundaries.md) | done | partial | [MKF/RNG四核心文件与相邻](2/README.md)：两补证/一精简，native1464帧一致，统一门待续 |
| [CODE-QUALITY-2b](../../archive/tasks/done/CODE-QUALITY-2b-shared-yj2-boundaries.md) | done | partial | [YJ2五文件/四合同转移](2b/README.md)：native2626段一致，独立树归约/统一门待续 |
| [CODE-QUALITY-3](../../archive/tasks/done/CODE-QUALITY-3-pal-extract-event-types.md) | done | partial | [切分](3/README.md)与[标注](3-annotate/README.md)：九有效反控，控制流风险draft；raw假绿/统一门待续 |
| [CODE-QUALITY-3b](../../archive/tasks/done/CODE-QUALITY-3b-pal-extract-io-boundaries.md) | done | partial | [SSS/M.MSG六文件](3b/README.md)：边界六反控；raw9→2/五新反控、全SSS与五原文已核；全正文/统一门待续 |
| [CODE-QUALITY-3c](../../archive/tasks/done/CODE-QUALITY-3c-editor-coverage-determinism.md) | done | partial | [动画与清理合同](3c/README.md)：原1例补活动timer卸载、三有效反控，相邻仍6act/统一门待续 |
| [CODE-QUALITY-3d](../../archive/tasks/done/CODE-QUALITY-3d-pal-extract-png-inputs.md) | done | partial | [PNG四文件](3d/README.md)：两height旧绿新红、输入合同2→6独立、primary/排重注释校正；其它出口/统一门待续 |
| [CODE-QUALITY-3f](../../archive/tasks/done/CODE-QUALITY-3f-pal-extract-symbols-input.md) | done | partial | [标注与symbols](3-annotate/README.md)：六有效反控，四重复转移；CLI/raw假绿/统一门待续 |
| [CODE-QUALITY-3g](../../archive/tasks/done/CODE-QUALITY-3g-pal-extract-cli-io.md) | done | partial | [CLI四目标/全链context](3g/README.md)：root/父链接清理反证停线draft；41相邻零诊断，注释窄修，统一门待续 |
| [CODE-QUALITY-3h](../../archive/tasks/done/CODE-QUALITY-3h-game-assets-shell.md) | done | partial | [PNG四测试](3h/README.md)：两旧绿新红/重复精简10→9；其它assets/shell整域与统一门仍待 |
| [CODE-QUALITY-3i](../../archive/tasks/done/CODE-QUALITY-3i-game-dialog-precache-ui.md) | done | partial | [原NaN窄修](3i-dialog-precache/README.md)保持；[72失败覆盖counter](72-boot-loading/README.md)使precache-ui旧关闭撤回rework；其它范围/统一门仍待 |
| [CODE-QUALITY-3j](../../archive/tasks/done/CODE-QUALITY-3j-game-tools-speedrun.md) | done | partial | [time-format 四文件切片](3j-time-format/README.md)：解析溢出反例与修复；3j 其余工具文件仍待核 |
| [CODE-QUALITY-3k](../../archive/tasks/done/CODE-QUALITY-3k-game-present-primitives.md) | done | partial | [present primitives 三文件切片](3k-present-primitives/README.md)：framebuffer/shake/wave 与直接 caller/SDL primary 已核读，35 例/typecheck通过；dither/number/follower 与整卡统一门仍待 |
| [CODE-QUALITY-3l](../../archive/tasks/done/CODE-QUALITY-3l-game-battle-present.md) | done | partial | [battle-present 三文件切片](3l-battle-present-primitives/README.md)：背景/effect/飘字与装配 caller/SDL primary 已核读，23 例通过；结算/精灵/UI/整卡统一门仍待 |
| [CODE-QUALITY-3m](../../archive/tasks/done/CODE-QUALITY-3m-game-battle-core-contracts.md) | done | partial | [battle positions](3m-battle-positions/README.md)、[turn-queue](3m-turn-queue/README.md)、[status](3m-status/README.md)、[formulas/magic-damage](3m-formulas-magic/README.md)、[RNG](3m-rng/README.md) 已形成局部证据；状态切片修复死敌槽位误跳过，公式/伤害222例、RNG边界与相邻638例通过；统一门仍待，整卡不关闭 |
| [CODE-QUALITY-3n](../../archive/tasks/done/CODE-QUALITY-3n-game-core-fade-identity-catalog.md) | done | partial | [fade / identity / catalog 复审切片](3n-fade-identity-catalog/README.md)：四个 core helper 与直接/跨模块 oracle 已重读；修复 PaletteFade `/31` 截断差异，直接34例通过；相邻诊断仍待统一收口 |
| [CODE-QUALITY-3o](../../archive/tasks/done/CODE-QUALITY-3o-game-core-mode-history-poison-search.md) | done | partial | [mode / history / poison / search 复审切片](3o-mode-history-poison-search/README.md)：四个 core helper 与真实 caller/primary 已重读；直接45例、相邻667例通过但预期 warning 仍待统一诊断收口 |
| [CODE-QUALITY-3p](../../archive/tasks/done/CODE-QUALITY-3p-event-opcode-player.md) | done | partial | [event-opcode-player 复审切片](3p-event-opcode-player/README.md)：helper、四份直接测试、owner callers/SDL primary 已重读；直接61例/相邻471例通过，预期诊断仍待统一收口 |
| [CODE-QUALITY-3q](../../archive/tasks/done/CODE-QUALITY-3q-game-scene-system.md) | done | partial | [scene-system 复审切片](3q-scene-system/README.md)：662行实现/2064行主测试、scene/mode/event/bootstrap caller 与 SDL primary 已重读；467例通过、预期诊断仍待统一收口 |
| [CODE-QUALITY-3r](../../archive/tasks/done/CODE-QUALITY-3r-game-event-system.md) | done | partial | [既有复审切片](3r-event-system/README.md)：只同步 JSON 中已登记的 partial；有限证据不等于整卡 accept |
| [CODE-QUALITY-3s](../../archive/tasks/done/CODE-QUALITY-3s-game-battle-system.md) | done | partial | [既有复审切片](3s-battle-system/README.md)：只同步 JSON 中已登记的 partial；有限证据不等于整卡 accept |
| [CODE-QUALITY-3t](../../archive/tasks/done/CODE-QUALITY-3t-game-battle-opcodes.md) | done | partial | [机制counter返工](../QUALITY-BATTLE-MAGIC-PARITY-1/README.md)：0x66裸武术/选靶已先红后修；主实现/主测已读，其他专测和统一门仍待 |
| [CODE-QUALITY-3u](../../archive/tasks/done/CODE-QUALITY-3u-game-battle-state-runtime.md) | done | partial | [工厂专测](3u-state-factory/README.md)：六针/快照保全，18→17排重；原清理片有限信用保留，元数据/极端域/统一门仍待 |
| [CODE-QUALITY-3v](../../archive/tasks/done/CODE-QUALITY-3v-game-battle-actions-basic.md) | done | partial | [既有复审切片](3v-battle-actions/README.md)：只同步 JSON 中已登记的 partial；有限证据不等于整卡 accept |
| [CODE-QUALITY-3w](../../archive/tasks/done/CODE-QUALITY-3w-game-battle-settlement-finalization.md) | done | partial | [结算复审](3w-settlement/README.md)：真实宿主/六反控与229执行，两旧关闭撤回review；原清理证据保留，Extra/脚本副作用/视觉/统一门仍待 |
| [CODE-QUALITY-3x](../../archive/tasks/done/CODE-QUALITY-3x-game-battle-progression.md) | done | partial | [既有复审切片](3x-battle-progression/README.md)：只同步 JSON 中已登记的 partial；有限证据不等于整卡 accept |
| [CODE-QUALITY-3y](../../archive/tasks/done/CODE-QUALITY-3y-game-analytics-consent.md) | done | accept | [当前八维/原件/集中门](analytics-closeout.json)；3个原范围/明确支持文件；不授实网/广域信用。 |
| [CODE-QUALITY-3z](../../archive/tasks/done/CODE-QUALITY-3z-game-google-analytics.md) | done | accept | [当前八维/原件/集中门](analytics-closeout.json)；5个原范围/明确支持文件；不授实网/广域信用。 |
| [CODE-QUALITY-6a](../../archive/tasks/done/CODE-QUALITY-6a-ledger-integrity.md) | done | accept | [本次正式验收](completion.json)：逐文件账本与清单工具的真实记录、输出和CLI合同（4文件）；6a-C1是可选的私有函数拆分建议；6a-O1涉及完整Markdown语法、特殊Git环境及符号级调用图，均超出当前声明合同，不冒称已验证，也不是现有canonical账本的未修缺陷。 |
| [CODE-QUALITY-40](../../archive/tasks/done/CODE-QUALITY-40-game-analytics-install.md) | done | accept | [当前八维/原件/集中门](analytics-closeout.json)；2个原范围/明确支持文件；不授实网/广域信用。 |
| [CODE-QUALITY-41](../../archive/tasks/done/CODE-QUALITY-41-game-analytics-consent-ui.md) | done | accept | [当前八维/原件/集中门](analytics-closeout.json)；2个原范围/明确支持文件；不授实网/广域信用。 |
| [CODE-QUALITY-42](../../archive/tasks/done/CODE-QUALITY-42-game-dialog-box.md) | done | partial | [既有复审切片](42-dialog-box/README.md)：只同步 JSON 中已登记的 partial；有限证据不等于整卡 accept |
| [CODE-QUALITY-43](../../archive/tasks/done/CODE-QUALITY-43-game-draw-sprite.md) | done | accept | [Current original scope](present-leaves-gates.json): 3 files; explicit A-H/evidence, full gates and limits; no broad/adjacent acceptance. |
| [CODE-QUALITY-44](../../archive/tasks/done/CODE-QUALITY-44-game-font.md) | done | accept | [Current original scope](present-leaves-gates.json): 4 files; explicit A-H/evidence, full gates and limits; no broad/adjacent acceptance. |
| [CODE-QUALITY-45](../../archive/tasks/done/CODE-QUALITY-45-game-follower-render.md) | done | accept | [Current original scope](present-leaves-gates.json): 3 files; explicit A-H/evidence, full gates and limits; no broad/adjacent acceptance. |
| [CODE-QUALITY-46](../../archive/tasks/done/CODE-QUALITY-46-game-draw-confirm.md) | done | accept | [Current original scope](present-leaves-gates.json): 3 files; explicit A-H/evidence, full gates and limits; no broad/adjacent acceptance. |
| [CODE-QUALITY-47](../../archive/tasks/done/CODE-QUALITY-47-game-draw-box.md) | done | accept | [Current original scope](present-leaves-gates.json): 4 files; explicit A-H/evidence, full gates and limits; no broad/adjacent acceptance. |
| [CODE-QUALITY-48](../../archive/tasks/done/CODE-QUALITY-48-game-draw-equip.md) | done | accept | [本轮36文件与集中门](present-speedrun-gates.json)：原白名单A–H、整改/排重和完整原件成立；不附带上下文文件或运行校准信用 |
| [CODE-QUALITY-49](../../archive/tasks/done/CODE-QUALITY-49-game-draw-inventory.md) | done | accept | [本轮36文件与集中门](present-speedrun-gates.json)：原白名单A–H、整改/排重和完整原件成立；不附带上下文文件或运行校准信用 |
| [CODE-QUALITY-50](../../archive/tasks/done/CODE-QUALITY-50-game-draw-magic.md) | done | accept | [本轮36文件与集中门](present-speedrun-gates.json)：原白名单A–H、整改/排重和完整原件成立；不附带上下文文件或运行校准信用 |
| [CODE-QUALITY-51](../../archive/tasks/done/CODE-QUALITY-51-game-draw-opening-menu.md) | done | accept | [renderer窗口](renderer-local.json)：原三文件A–H、真实caller/oracle、有限整改/合同映射和集中门；视觉/E2E延后，不附带广域接受。 |
| [CODE-QUALITY-52](../../archive/tasks/done/CODE-QUALITY-52-game-draw-shop-wave-member.md) | done | accept | [renderer窗口](renderer-local.json)：原三文件A–H、真实caller/oracle、有限整改/合同映射和集中门；视觉/E2E延后，不附带广域接受。 |
| [CODE-QUALITY-53](../../tasks/CODE-QUALITY-53-player-status-runtime-zero.md) | build | partial | [五卡八维/返工](five-cards/README.md)：runtime0/显示槽与role入口、正式换队/读档caller已复核；inspect合法工厂及状态页图标/双早退测试补强；Wear压缩/入口重入和广域状态机仍review，视觉未新跑。 |
| [CODE-QUALITY-54](../../archive/tasks/done/CODE-QUALITY-54-game-draw-tilemap.md) | done | accept | [renderer窗口](renderer-local.json)：原三文件A–H、真实caller/oracle、有限整改/合同映射和集中门；视觉/E2E延后，不附带广域接受。 |
| [CODE-QUALITY-55](../../archive/tasks/done/CODE-QUALITY-55-game-draw-menu-wave-member.md) | done | accept | [renderer窗口](renderer-local.json)：原三文件A–H、真实caller/oracle、有限整改/合同映射和集中门；视觉/E2E延后，不附带广域接受。 |
| [CODE-QUALITY-56](../../archive/tasks/done/CODE-QUALITY-56-game-minimap-thumbnail-lifecycle.md) | done | partial | [minimap lifecycle 复审](56-minimap/README.md)：2 文件/20 直接，tools/dev 51 + picker 5 相邻；loading ownership 变异1红5绿，seam repair 留 CODE-QUALITY-57 |
| [CODE-QUALITY-57](../../tasks/CODE-QUALITY-57-game-bootstrap-thumbnail-seam-boundary.md) | review | partial | [工具/thumbnail有限切片](core-comment-audit/tools-thumbnail-hotkeys/README.md)：1944行宿主与两helper测试全文，注释/接线已核；未驱动thumbnail，seam/色板/视觉仍review |
| [CODE-QUALITY-58](../../archive/tasks/done/CODE-QUALITY-58-game-tools-panel-audit.md) | done | partial | [夹具/隔离勘误](58-tools-panel-fixtures/README.md)：更正核心强转/窗口监听跨例，正式19绿/相邻199绿；无新统一门，save边界不认证 |
| [CODE-QUALITY-59](../../archive/tasks/done/CODE-QUALITY-59-game-save-import-version-boundary.md) | done | partial | [现金必要守卫红绿](save-cash-local.json)：两正式红后29相邻零诊断、原内存槽位保留；其余96字段/wire与FileReader仍待，未授整卡信用 |
| [CODE-QUALITY-60](../../archive/tasks/done/CODE-QUALITY-60-game-quick-save-lifecycle.md) | done | partial | [八维/合同迁移与反控](save-tools-local.json)：18定向/相邻与静态零诊断，模块大门留收尾，未新增accept |
| [CODE-QUALITY-61](../../archive/tasks/done/CODE-QUALITY-61-game-speedrun-store-boundary.md) | done | accept | [本轮36文件与集中门](present-speedrun-gates.json)：原白名单A–H、整改/排重和完整原件成立；不附带上下文文件或运行校准信用 |
| [CODE-QUALITY-62](../../archive/tasks/done/CODE-QUALITY-62-game-speedrun-timer-boundary.md) | done | accept | [本轮36文件与集中门](present-speedrun-gates.json)：原白名单A–H、整改/排重和完整原件成立；不附带上下文文件或运行校准信用 |
| [CODE-QUALITY-63](../../archive/tasks/done/CODE-QUALITY-63-game-speedrun-snapshot-boundary.md) | done | accept | [本轮36文件与集中门](present-speedrun-gates.json)：原白名单A–H、整改/排重和完整原件成立；不附带上下文文件或运行校准信用 |
| [CODE-QUALITY-64](../../archive/tasks/done/CODE-QUALITY-64-game-speedrun-detectors-boundary.md) | done | accept | [本轮36文件与集中门](present-speedrun-gates.json)：原白名单A–H、整改/排重和完整原件成立；不附带上下文文件或运行校准信用 |
| [CODE-QUALITY-65](../../archive/tasks/done/CODE-QUALITY-65-game-speedrun-index-orchestration.md) | done | accept | [本轮36文件与集中门](present-speedrun-gates.json)：原白名单A–H、整改/排重和完整原件成立；不附带上下文文件或运行校准信用 |
| [CODE-QUALITY-66](../../archive/tasks/done/CODE-QUALITY-66-game-speedrun-overlay-boundary.md) | done | accept | [本轮36文件与集中门](present-speedrun-gates.json)：原白名单A–H、整改/排重和完整原件成立；不附带上下文文件或运行校准信用 |
| [CODE-QUALITY-67](../../archive/tasks/done/CODE-QUALITY-67-game-speedrun-checkpoint-boundary-tests.md) | done | accept | [本轮36文件与集中门](present-speedrun-gates.json)：原白名单A–H、整改/排重和完整原件成立；不附带上下文文件或运行校准信用 |
| [CODE-QUALITY-68](../../archive/tasks/done/CODE-QUALITY-68-game-speedrun-countdown-tests.md) | done | accept | [本轮36文件与集中门](present-speedrun-gates.json)：原白名单A–H、整改/排重和完整原件成立；不附带上下文文件或运行校准信用 |
| [CODE-QUALITY-69](../../archive/tasks/done/CODE-QUALITY-69-game-speedrun-time-format-tests.md) | done | accept | [本轮36文件与集中门](present-speedrun-gates.json)：原白名单A–H、整改/排重和完整原件成立；不附带上下文文件或运行校准信用 |
| [CODE-QUALITY-70](../../archive/tasks/done/CODE-QUALITY-70-game-audio-volume-boundary.md) | done | accept | [Current original scope](present-leaves-gates.json): 1 files; explicit A-H/evidence, full gates and limits; no broad/adjacent acceptance. |
| [CODE-QUALITY-71](../../archive/tasks/done/CODE-QUALITY-71-game-fetch-retry-abort-boundary.md) | done | accept | [Current original scope](present-leaves-gates.json): 3 files; explicit A-H/evidence, full gates and limits; no broad/adjacent acceptance. |
| [CODE-QUALITY-72](../../archive/tasks/done/CODE-QUALITY-72-game-boot-loading-lifecycle.md) | done | accept | [原合同/明确迁移的当前八维与集中门](shell-lifecycle-local.json)；3个当前文件；广域/听感/剧情不附带接受。 |
| [CODE-QUALITY-73](../../archive/tasks/done/CODE-QUALITY-73-game-input-lifecycle.md) | done | accept | [当前逐文件A–H/原件/集中门](input-audio-closeout.json)；4个原范围文件；批准缺口已处理。 |
| [CODE-QUALITY-74](../../archive/tasks/done/CODE-QUALITY-74-game-audio-manager-contract.md) | done | accept | [当前逐文件A–H/原件/集中门](input-audio-closeout.json)；3个原范围文件；批准缺口已处理。 |
| [CODE-QUALITY-75](../../archive/tasks/done/CODE-QUALITY-75-game-audio-midi-race.md) | done | accept | [原合同/明确迁移的当前八维与集中门](shell-lifecycle-local.json)；2个当前文件；广域/听感/剧情不附带接受。 |
| [CODE-QUALITY-76](../../archive/tasks/done/CODE-QUALITY-76-game-main-loop-contract.md) | done | accept | [原合同/明确迁移的当前八维与集中门](shell-lifecycle-local.json)；3个当前文件；广域/听感/剧情不附带接受。 |
| [CODE-QUALITY-77](../../archive/tasks/done/CODE-QUALITY-77-game-rng-player-contract.md) | done | accept | [原合同/明确迁移的当前八维与集中门](shell-lifecycle-local.json)；3个当前文件；广域/听感/剧情不附带接受。 |
| [CODE-QUALITY-78](../../archive/tasks/done/CODE-QUALITY-78-game-avi-player-contract.md) | done | accept | [原合同/明确迁移的当前八维与集中门](shell-lifecycle-local.json)；3个当前文件；广域/听感/剧情不附带接受。 |
| [CODE-QUALITY-79](../../tasks/CODE-QUALITY-79-battle-poison-level-boundary.md) | draft | accept | [本次正式验收](completion.json)：战斗0x61普通毒与装备伪毒的判定边界；整份战斗opcode dispatcher及广域旧测试仍归CODE3t文件复审；它们不属于本卡这一窄缺陷的未满足验收条件。 |
| [CODE-QUALITY-80](../../tasks/CODE-QUALITY-80-dev-party-edit-lifecycle.md) | review | accept | [本次正式验收](completion.json)：B调试面板的战斗换队禁用与探索换队装备重建；picker生命周期由CODE81收口；Dev大文件的整体组织仍归CODE58及通用逐文件复审。当前没有宿主卸载caller，因此不强造新的公共disposer。现有功能DOM证据符合本卡验收范围，不声称完成额外美术或剧情视觉验收。 |
| [CODE-QUALITY-81](../../tasks/CODE-QUALITY-81-dev-panel-picker-lifecycle.md) | review | accept | [本次正式验收](completion.json)：picker observer释放、列表代际、迟到异步结果及失败占位；页面级监听按单宿主生命周期保留，不擅增公共卸载API；共享缓存跨picker保留是既有合同。整份Dev文件仍review，本卡仅接收observer/thumbnail功能合同，不引申为剧情或美术全验收。 |
| [CODE-QUALITY-82](../../archive/tasks/done/CODE-QUALITY-82-data-mkf-diagnostic.md) | done | accept | [本次正式验收](completion.json)：DATA.MKF独立只读诊断脚本与真实进程测试（2文件）；证据限定于声明的诊断结构及合法/非法输入轴；不承诺支持任意MKF文件或直接导入未构建TS工作区。没有为了共享短代码而改公共构建边界。 |
| [CODE-QUALITY-83](../../archive/tasks/done/CODE-QUALITY-83-game-menu-stack.md) | done | accept | [本轮菜单模块](menu-core-closeout.json)：原卡白名单A–H、真实caller/oracle、保留项和集中门成立；广域相邻文件不附带关闭。 |
| [CODE-QUALITY-84](../../archive/tasks/done/CODE-QUALITY-84-game-inventory-menu-contract.md) | done | accept | [本轮菜单模块](menu-core-closeout.json)：原卡白名单A–H、真实caller/oracle、保留项和集中门成立；广域相邻文件不附带关闭。 |
| [CODE-QUALITY-85](../../archive/tasks/done/CODE-QUALITY-85-game-shop-menu-contract.md) | done | accept | [本轮菜单模块](menu-core-closeout.json)：原卡白名单A–H、真实caller/oracle、保留项和集中门成立；广域相邻文件不附带关闭。 |
| [CODE-QUALITY-86](../../archive/tasks/done/CODE-QUALITY-86-game-equip-menu-contract.md) | done | accept | [本轮菜单模块](menu-core-closeout.json)：原卡白名单A–H、真实caller/oracle、保留项和集中门成立；广域相邻文件不附带关闭。 |
| [CODE-QUALITY-87](../../archive/tasks/done/CODE-QUALITY-87-game-ingame-menu-contract.md) | done | accept | [本轮菜单模块](menu-core-closeout.json)：原卡白名单A–H、真实caller/oracle、保留项和集中门成立；广域相邻文件不附带关闭。 |
| [CODE-QUALITY-88](../../archive/tasks/done/CODE-QUALITY-88-game-magic-select-contract.md) | done | accept | [本轮菜单模块](menu-core-closeout.json)：原卡白名单A–H、真实caller/oracle、保留项和集中门成立；广域相邻文件不附带关闭。 |
| [CODE-QUALITY-89](../../archive/tasks/done/CODE-QUALITY-89-game-in-game-magic-contract.md) | done | accept | [本轮菜单模块](menu-core-closeout.json)：原卡白名单A–H、真实caller/oracle、保留项和集中门成立；广域相邻文件不附带关闭。 |
| [CODE-QUALITY-90](../../tasks/CODE-QUALITY-90-magic-revive-status-boundary.md) | review | accept | [本次正式验收](completion.json)：大世界复活状态边界及runner与测试质量补审；公共cost/caster参数按既有接口冻结要求保留，可选参数精简不阻断本卡。毒槽压缩与其它机制问题仍归CODE53及对应候选；不把一阶段回合数规则套到二阶段装备来源字段。 |
| [CODE-QUALITY-91](../../archive/tasks/done/CODE-QUALITY-91-game-inventory-action-contract.md) | done | accept | [本轮菜单模块](menu-core-closeout.json)：原卡白名单A–H、真实caller/oracle、保留项和集中门成立；广域相邻文件不附带关闭。 |
| [CODE-QUALITY-92](../../archive/tasks/done/CODE-QUALITY-92-protected-fast-command-correction.md) | done | partial | [历史门/当前30源比对](92/README.md)：20同/10变，全30仍review |
| [CODE-QUALITY-93](../../archive/tasks/done/CODE-QUALITY-93-game-sell-menu-contract.md) | done | accept | [本轮菜单模块](menu-core-closeout.json)：原卡白名单A–H、真实caller/oracle、保留项和集中门成立；广域相邻文件不附带关闭。 |

字节SHA、行数和待人工核定的范围原文见[结构原件](all-cards.json)。范围片段不是已验证文件清单；不会因正则命中自动关闭任何文件。
