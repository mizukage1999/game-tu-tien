import type { ItemDef } from '../../data';
import type { PlayerSave } from './save';
import { enhancementLevel } from './enhancement';

/** Inventory/equipment keys identify a physical item; definitions and art use its base ID. */
export function equipmentBaseId(id: string): string {
  return id.split('~', 1)[0];
}

export function equipmentInstanceId(id: string): string {
  const token =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `${equipmentBaseId(id)}~${token}`;
}

export function isIndividualEquipment(id: string, items: Record<string, ItemDef>) {
  // The server entitlement is a single account-bound artifact, never a stack of loot.
  return equipmentBaseId(id) !== 'tien_phap_bao' && !!items[equipmentBaseId(id)]?.slot;
}

/** Deterministic, idempotent migration. An old shared upgrade belongs to one item only. */
export function normalizeEquipment(p: PlayerSave, items: Record<string, ItemDef>): PlayerSave {
  const inventory = { ...p.inventory },
    equipment = { ...p.equipment };
  const enhancements = { ...p.adventure?.enhancements };
  const occupied = new Set([...Object.keys(inventory), ...Object.values(equipment)]);
  const migrated = new Set<string>();
  let changed = false;
  const allocate = (base: string, suffix: string) => {
    let id = `${base}~legacy-${suffix}`,
      n = 0;
    while (occupied.has(id)) id = `${base}~legacy-${suffix}-${++n}`;
    occupied.add(id);
    if (!migrated.has(base) && enhancements[base])
      enhancements[id] = enhancementLevel(enhancements[base]);
    migrated.add(base);
    changed = true;
    return id;
  };
  // Preserve the upgrade on the item being worn ahead of spare copies in the bag.
  for (const slot of Object.keys(equipment) as (keyof typeof equipment)[]) {
    const id = equipment[slot];
    if (id && id === equipmentBaseId(id) && isIndividualEquipment(id, items))
      equipment[slot] = allocate(id, `worn-${slot}`);
  }
  for (const [id, qty] of Object.entries(p.inventory ?? {})) {
    if (id !== equipmentBaseId(id) || !isIndividualEquipment(id, items)) continue;
    delete inventory[id];
    changed = true;
    for (let i = 0; i < Math.max(0, Math.floor(qty)); i++) inventory[allocate(id, `bag-${i}`)] = 1;
  }
  if (!changed) return p;
  for (const base of migrated) delete enhancements[base];
  return {
    ...p,
    inventory,
    equipment,
    ...(p.adventure ? { adventure: { ...p.adventure, enhancements } } : {}),
  };
}

export function findOwnedEquipment(p: PlayerSave, id: string): string | undefined {
  if ((p.inventory[id] ?? 0) > 0) return id;
  if (id !== equipmentBaseId(id)) return undefined;
  return Object.keys(p.inventory).find(
    (key) => p.inventory[key] > 0 && equipmentBaseId(key) === id,
  );
}
