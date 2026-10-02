# EDITOR-AUTO-LOCATOR-1 — 精灵引用跳转到实际自动方案

Status: done
Phase: phase2
Owner: Codex Root
Coding Owner: pre005_editor_edges
Reviewer: Codex Root
Visual Verification Timing: dev-functional

## 实际缺陷与准入

本卡归[005前清账](PRE-005-DEBT-1-current-edge-closeout.md)。Root在6014隔离合法工程实际点击
精灵库引用行“编辑自动脚本”，虽然到了正确实体，却选中“交互脚本”，显示尚未创建；不是自动行为。
刷新后依旧，用户6012未动。这是现行功能可达性缺陷，不是17层测试输入才有的运行时限制。

原版/一阶段N/A：全新编辑器导航。当前一手链：WorldSpriteLibrary:1272调用
onJumpAutomaticScriptInstance；App:585–587只把旧`${entityId}:auto`写入drawer.src；
当前CanonicalSceneScriptWorkspace:79默认trigger、:100–148只消费focusOwner/focusReference，
App:2732–2760并不将drawer.src传入。故旧入口信息未进入当前工作台。
帧序投影world-sprite-behavior:480–487明确取initialPage（缺席时第一page）绑定的auto方案，
导航必须按同一已存在canonical绑定定位，不能任意取第一方案。

目标：点击“编辑自动脚本”后打开正确场景/实体/auto通道及实际初始页绑定的方案；不改作者数据。
最强替代解释是加载异步尚未完成，Root在资产完成后仍见aria-selected=false，已排除。
反控：非第一初始页/非第一个auto方案仍定位正确；引用过期或绑定被删时可见拒绝，不跳到另一方案。

Root premise verified / design agree / build allowed。只允许改App.tsx与App.reference-navigation.test.tsx，
复用现行canonical定位/失效拒绝能力，不加兼容drawer语法、不改schema/运行时/脚本正文/公共引用格式。
现有其它定位、未保存内容与history保持，新增测试先红后绿；Root再用实际精灵库入口核auto选中。

单一Owner隔离提交，自验不替代Root验收。无用户转交提示词，内部贡献者交付后由Root接收。

## Root独立接收

候选`45598749c`（Root接为`fcada709a`）直接审读：点击时读当前两个session，按实际initialPage与auto绑定，
再核当前精灵身份；复用既有canonicalOwner/Page focus，不复活drawer.src旧语法、不改数据/history。
贡献者5项先红后绿，Root独立App导航/真实工作台48项绿且stderr空、editor两段typecheck无诊断。
同一测试裸focus导致的tooltip act警告用一行await act消除，未屏蔽console或改产品tooltip。
Root在真实6014合成工程从精灵引用行点击，自动行为aria-selected=true、deep-empty的deep方案及实际共享调用正文可见；
截图`build/pre005/auto-locator-final.png`，保存/撤销保持disabled。不是只看mock callback。
主6012未操作；本轮全仓基线10989测试/七包types/2758文件静态零诊断已过，追加导航按以上独立验证，最终共享门归母卡。
