/**
 * @type-pal/migrate — PAL 资源供应与作者 current publication。
 * 读取提取资源，烘 RGBA 素材，供应地图/角色/商店/窄源文案；
 * 事务与三方 merge 保留作者正文，不再转换原版环境动作脚本。
 * 依赖 content + shared，不依赖 reforge / editor。
 */
export { bakeIndexedRgba } from './bake-indexed-rgba.js'
export * from './project-map-audit.js'
export * from './project-map-converter.js'
