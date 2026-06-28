/**
 * @type-pal/editor — 第二阶段可视化内容编辑器（空壳占位）。
 *
 * 职责：读写 content 数据模型（@type-pal/content 的 schema），可视化编辑内容工程数据
 *   （地图笔刷 / 事件演出编排 / 数据表）；嵌 @type-pal/reforge 做实时预览。
 * 依赖边界：依赖 content（数据模型），将来嵌 reforge 预览；
 *   **不碰第一阶段包**（shared / game / pal-extract）。见 decisions D18、roadmap §7。
 * 状态：占位。P2 阶段（引擎吃通 schema 后）正式实现。
 */
export const EDITOR_PLACEHOLDER = true
