import type { Source, EntityId } from './types.js';
import { villageSources } from './village.js';
import { townshipSources } from './township.js';
import { district97Sources } from './district97.js';
import { district200Sources } from './district200.js';
import { parkDistrictSources } from './park-district.js';
import { librarySources } from './library.js';

export const allSources: Source[] = [
  ...villageSources,
  ...townshipSources,
  ...district97Sources,
  ...district200Sources,
  ...parkDistrictSources,
  ...librarySources,
];

export function getSourceById(id: string): Source | undefined {
  return allSources.find((s) => s.id === id);
}

export function getSourcesByEntity(entity: EntityId): Source[] {
  return allSources.filter((s) => s.entity === entity);
}

export function getAllEntities(): EntityId[] {
  const entities = new Set(allSources.map((s) => s.entity));
  return Array.from(entities);
}

export * from './types.js';
