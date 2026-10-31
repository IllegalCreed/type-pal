import type { Item } from '@type-pal/shared'
import { inventoryItem } from './inventory-fixture.js'
export const buyFlowItems: Item[] = [
  inventoryItem(87, { name: 'item87', price: 100 }),
  inventoryItem(99, { name: 'item99', price: 200 }),
  inventoryItem(105, { name: 'item105', price: 50, flags: { sellable: true } }),
]
export const affordabilityItems = [
  inventoryItem(105, { bitmap: 0, price: 150 }),
  inventoryItem(110, { bitmap: 0, price: 200 }),
]
export const sellableInventoryItems: Item[] = [
  inventoryItem(87, { name: 'item87', price: 100 }),
  inventoryItem(105, { name: 'item105', price: 50, flags: { sellable: true } }),
  inventoryItem(110, { name: 'item110', price: 100, flags: { sellable: true } }),
]
export const refreshInventoryItems = [
  inventoryItem(105, { price: 100, flags: { sellable: true } }),
  inventoryItem(87, { price: 100, flags: { sellable: false } }),
  inventoryItem(110, { price: 100, flags: { sellable: true } }),
]
export const singleSaleItems: Item[] = [
  inventoryItem(105, { bitmap: 0, price: 40, flags: { sellable: true } }),
]
