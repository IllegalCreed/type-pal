# 94前全部83卡复审队列

2026-10-17，结构基点bea19f80c、当前检查点基点7057dddd9；77历史done/1build/4review/1draft。本轮accept=0，partial=35，pending=48。pending表示本轮成果语义复审未完成；partial只表示已开展局部证据，不是验收。卡的读取边界和具体源文件另记切片报告，结构文本提取不计全文语义阅读。

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
| [CODE-QUALITY-3i](../../archive/tasks/done/CODE-QUALITY-3i-game-dialog-precache-ui.md) | done | partial | [对话资源/预缓存/音量/商标切片](3i-dialog-precache/README.md)：五个生产文件与直接caller已核读；补 `precache-ui` 非有限进度反例与修复，定向78例/typecheck通过；整卡仍待统一门与后续语义复核 |
| [CODE-QUALITY-3j](../../archive/tasks/done/CODE-QUALITY-3j-game-tools-speedrun.md) | done | partial | [time-format 四文件切片](3j-time-format/README.md)：解析溢出反例与修复；3j 其余工具文件仍待核 |
| [CODE-QUALITY-3k](../../archive/tasks/done/CODE-QUALITY-3k-game-present-primitives.md) | done | partial | [present primitives 三文件切片](3k-present-primitives/README.md)：framebuffer/shake/wave 与直接 caller/SDL primary 已核读，35 例/typecheck通过；dither/number/follower 与整卡统一门仍待 |
| [CODE-QUALITY-3l](../../archive/tasks/done/CODE-QUALITY-3l-game-battle-present.md) | done | partial | [battle-present 三文件切片](3l-battle-present-primitives/README.md)：背景/effect/飘字与装配 caller/SDL primary 已核读，23 例通过；结算/精灵/UI/整卡统一门仍待 |
| [CODE-QUALITY-3m](../../archive/tasks/done/CODE-QUALITY-3m-game-battle-core-contracts.md) | done | partial | [battle positions](3m-battle-positions/README.md)、[turn-queue](3m-turn-queue/README.md)、[status](3m-status/README.md)、[formulas/magic-damage](3m-formulas-magic/README.md)、[RNG](3m-rng/README.md) 已形成局部证据；状态切片修复死敌槽位误跳过，公式/伤害222例、RNG边界与相邻638例通过；统一门仍待，整卡不关闭 |
| [CODE-QUALITY-3n](../../archive/tasks/done/CODE-QUALITY-3n-game-core-fade-identity-catalog.md) | done | partial | [fade / identity / catalog 复审切片](3n-fade-identity-catalog/README.md)：四个 core helper 与直接/跨模块 oracle 已重读；修复 PaletteFade `/31` 截断差异，直接34例通过；相邻诊断仍待统一收口 |
| [CODE-QUALITY-3o](../../archive/tasks/done/CODE-QUALITY-3o-game-core-mode-history-poison-search.md) | done | partial | [mode / history / poison / search 复审切片](3o-mode-history-poison-search/README.md)：四个 core helper 与真实 caller/primary 已重读；直接45例、相邻667例通过但预期 warning 仍待统一诊断收口 |
| [CODE-QUALITY-3p](../../archive/tasks/done/CODE-QUALITY-3p-event-opcode-player.md) | done | partial | [event-opcode-player 复审切片](3p-event-opcode-player/README.md)：helper、四份直接测试、owner callers/SDL primary 已重读；直接61例/相邻471例通过，预期诊断仍待统一收口 |
| [CODE-QUALITY-3q](../../archive/tasks/done/CODE-QUALITY-3q-game-scene-system.md) | done | partial | [scene-system 复审切片](3q-scene-system/README.md)：662行实现/2064行主测试、scene/mode/event/bootstrap caller 与 SDL primary 已重读；467例通过、预期诊断仍待统一收口 |
| [CODE-QUALITY-3r](../../archive/tasks/done/CODE-QUALITY-3r-game-event-system.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-3s](../../archive/tasks/done/CODE-QUALITY-3s-game-battle-system.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-3t](../../archive/tasks/done/CODE-QUALITY-3t-game-battle-opcodes.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-3u](../../archive/tasks/done/CODE-QUALITY-3u-game-battle-state-runtime.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-3v](../../archive/tasks/done/CODE-QUALITY-3v-game-battle-actions-basic.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-3w](../../archive/tasks/done/CODE-QUALITY-3w-game-battle-settlement-finalization.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-3x](../../archive/tasks/done/CODE-QUALITY-3x-game-battle-progression.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-3y](../../archive/tasks/done/CODE-QUALITY-3y-game-analytics-consent.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-3z](../../archive/tasks/done/CODE-QUALITY-3z-game-google-analytics.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-6a](../../archive/tasks/done/CODE-QUALITY-6a-ledger-integrity.md) | done | partial | [账本/清单四文件](6a/README.md)，两测试补证/两有效反控；未accept |
| [CODE-QUALITY-40](../../archive/tasks/done/CODE-QUALITY-40-game-analytics-install.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-41](../../archive/tasks/done/CODE-QUALITY-41-game-analytics-consent-ui.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-42](../../archive/tasks/done/CODE-QUALITY-42-game-dialog-box.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-43](../../archive/tasks/done/CODE-QUALITY-43-game-draw-sprite.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-44](../../archive/tasks/done/CODE-QUALITY-44-game-font.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-45](../../archive/tasks/done/CODE-QUALITY-45-game-follower-render.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-46](../../archive/tasks/done/CODE-QUALITY-46-game-draw-confirm.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-47](../../archive/tasks/done/CODE-QUALITY-47-game-draw-box.md) | done | partial | [draw-box 复审](47-draw-box/README.md)：四文件全文、box caller/SDL primary、22 直接 + 127 相邻通过；未发现直接缺陷，统一门仍待 |
| [CODE-QUALITY-48](../../archive/tasks/done/CODE-QUALITY-48-game-draw-equip.md) | done | partial | [draw-equip 复审](48-draw-equip/README.md)：三文件全文、equip/menu caller/SDL primary、16 直接 + 167 相邻通过；零数量差异为不可达防御输入，统一门仍待 |
| [CODE-QUALITY-49](../../archive/tasks/done/CODE-QUALITY-49-game-draw-inventory.md) | done | partial | [draw-inventory 复审](49-draw-inventory/README.md)：实现/三测试、P01/P02、menu caller/SDL primary 已核；live-zero 已对齐；像素测试 1 条 node DOM 诊断保留 review，统一门仍待 |
| [CODE-QUALITY-50](../../archive/tasks/done/CODE-QUALITY-50-game-draw-magic.md) | done | partial | [draw-magic 复审](50-draw-magic/README.md)：四文件/P06/SDL primary、25 直接 + 136 相邻通过；PlayerInfoBox 状态/毒色缺口开高风险卡，统一门仍待 |
| [CODE-QUALITY-51](../../archive/tasks/done/CODE-QUALITY-51-game-draw-opening-menu.md) | done | partial | [draw-opening-menu 复审](51-draw-opening-menu/README.md)：三文件/SDL primary/P06相邻、17 直接 + 107 相邻通过；未发现 direct defect，wave 统一门仍待 |
| [CODE-QUALITY-52](../../archive/tasks/done/CODE-QUALITY-52-game-draw-shop-wave-member.md) | done | partial | [draw-shop 复审](52-draw-shop/README.md)：实现/三测试/P04/SDL primary，18/19 直接 + 117 相邻通过；shop-preview 保留 1 条 node DOM 诊断，wave 统一门仍待 |
| [CODE-QUALITY-53](../../tasks/CODE-QUALITY-53-player-status-runtime-zero.md) | build | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-54](../../archive/tasks/done/CODE-QUALITY-54-game-draw-tilemap.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-55](../../archive/tasks/done/CODE-QUALITY-55-game-draw-menu-wave-member.md) | done | partial | [draw-menu 复审](55-draw-menu/README.md)：3 文件/SDL primary/caller，15 直接 + 197 相邻通过；清掉历史无效 lint 伪用法，仍留视觉/E2E 与统一整卡边界 |
| [CODE-QUALITY-56](../../archive/tasks/done/CODE-QUALITY-56-game-minimap-thumbnail-lifecycle.md) | done | partial | [minimap lifecycle 复审](56-minimap/README.md)：2 文件/20 直接，tools/dev 51 + picker 5 相邻；loading ownership 变异1红5绿，seam repair 留 CODE-QUALITY-57 |
| [CODE-QUALITY-57](../../tasks/CODE-QUALITY-57-game-bootstrap-thumbnail-seam-boundary.md) | review | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-58](../../archive/tasks/done/CODE-QUALITY-58-game-tools-panel-audit.md) | done | partial | [tools-panel 复审](58-tools-panel/README.md)：2 文件/18 定向通过；DOM/键盘/委托/lifecycle 核清，save-io VERSION 留 CODE-QUALITY-59 |
| [CODE-QUALITY-59](../../archive/tasks/done/CODE-QUALITY-59-game-save-import-version-boundary.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-60](../../archive/tasks/done/CODE-QUALITY-60-game-quick-save-lifecycle.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-61](../../archive/tasks/done/CODE-QUALITY-61-game-speedrun-store-boundary.md) | done | partial | [speedrun store 复审](61-speedrun-store/README.md)：2 文件/9 直接，index/overlay/tools-panel 30 相邻；非法 localStorage 与小数毫秒 PB 合同已核 |
| [CODE-QUALITY-62](../../archive/tasks/done/CODE-QUALITY-62-game-speedrun-timer-boundary.md) | done | partial | [speedrun timer 复审](62-speedrun-timer/README.md)：3 文件/22 tests 通过；起表/暂停/倒计时/setStep/PB/detector 边界已核 |
| [CODE-QUALITY-63](../../archive/tasks/done/CODE-QUALITY-63-game-speedrun-snapshot-boundary.md) | done | partial | [speedrun snapshot 复审](63-speedrun-snapshot/README.md)：实现/测试与 index/timer/detectors/main-loop caller 已核；直接1文件/7 tests、相邻5文件/32 tests、game typecheck通过 |
| [CODE-QUALITY-64](../../archive/tasks/done/CODE-QUALITY-64-game-speedrun-detectors-boundary.md) | done | partial | [speedrun detectors 复审](64-speedrun-detectors/README.md)：实现/两测试与 timer/snapshot/checkpoints caller 已核；六文件/42 tests、game typecheck通过 |
| [CODE-QUALITY-65](../../archive/tasks/done/CODE-QUALITY-65-game-speedrun-index-orchestration.md) | done | partial | [speedrun index 复审](65-speedrun-index/README.md)：实现/两测试与 main-loop/tools-panel 及 speedrun caller 已核；六文件/39 tests、game typecheck通过 |
| [CODE-QUALITY-66](../../archive/tasks/done/CODE-QUALITY-66-game-speedrun-overlay-boundary.md) | done | partial | [speedrun overlay 复审](66-speedrun-overlay/README.md)：实现/两测试与 index/timer/store/time-format caller 已核；补差值/ETA oracle，5文件/25 tests、game typecheck通过 |
| [CODE-QUALITY-67](../../archive/tasks/done/CODE-QUALITY-67-game-speedrun-checkpoint-boundary-tests.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-68](../../archive/tasks/done/CODE-QUALITY-68-game-speedrun-countdown-tests.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-69](../../archive/tasks/done/CODE-QUALITY-69-game-speedrun-time-format-tests.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-70](../../archive/tasks/done/CODE-QUALITY-70-game-audio-volume-boundary.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-71](../../archive/tasks/done/CODE-QUALITY-71-game-fetch-retry-abort-boundary.md) | done | partial | [源/三测试与真实取消反证](3h/fetch-retry/README.md)：三旧绿新红、族19；取消生命周期draft/完整game17块未清 |
| [CODE-QUALITY-72](../../archive/tasks/done/CODE-QUALITY-72-game-boot-loading-lifecycle.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-73](../../archive/tasks/done/CODE-QUALITY-73-game-input-lifecycle.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-74](../../archive/tasks/done/CODE-QUALITY-74-game-audio-manager-contract.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-75](../../archive/tasks/done/CODE-QUALITY-75-game-audio-midi-race.md) | done | partial | MIDI局部排重见3Y/midi-review，整卡未accept |
| [CODE-QUALITY-76](../../archive/tasks/done/CODE-QUALITY-76-game-main-loop-contract.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-77](../../archive/tasks/done/CODE-QUALITY-77-game-rng-player-contract.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-78](../../archive/tasks/done/CODE-QUALITY-78-game-avi-player-contract.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-79](../../tasks/CODE-QUALITY-79-battle-poison-level-boundary.md) | draft | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-80](../../tasks/CODE-QUALITY-80-dev-party-edit-lifecycle.md) | review | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-81](../../tasks/CODE-QUALITY-81-dev-panel-picker-lifecycle.md) | review | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-82](../../archive/tasks/done/CODE-QUALITY-82-data-mkf-diagnostic.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-83](../../archive/tasks/done/CODE-QUALITY-83-game-menu-stack.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-84](../../archive/tasks/done/CODE-QUALITY-84-game-inventory-menu-contract.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-85](../../archive/tasks/done/CODE-QUALITY-85-game-shop-menu-contract.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-86](../../archive/tasks/done/CODE-QUALITY-86-game-equip-menu-contract.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-87](../../archive/tasks/done/CODE-QUALITY-87-game-ingame-menu-contract.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-88](../../archive/tasks/done/CODE-QUALITY-88-game-magic-select-contract.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-89](../../archive/tasks/done/CODE-QUALITY-89-game-in-game-magic-contract.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-90](../../tasks/CODE-QUALITY-90-magic-revive-status-boundary.md) | review | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-91](../../archive/tasks/done/CODE-QUALITY-91-game-inventory-action-contract.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |
| [CODE-QUALITY-92](../../archive/tasks/done/CODE-QUALITY-92-protected-fast-command-correction.md) | done | partial | [历史门/当前30源比对](92/README.md)：20同/10变，全30仍review |
| [CODE-QUALITY-93](../../archive/tasks/done/CODE-QUALITY-93-game-sell-menu-contract.md) | done | pending | 待全文核定真实交付文件及当前caller/oracle |

字节SHA、行数和待人工核定的范围原文见[结构原件](all-cards.json)。范围片段不是已验证文件清单；不会因正则命中自动关闭任何文件。
