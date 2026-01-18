export const ENTITY_IDS = [
  'village-of-oak-park',
  'oak-park-township',
  'district-97',
  'district-200',
  'park-district',
  'oak-park-library',
] as const;

export type EntityId = (typeof ENTITY_IDS)[number];

export const ENTITY_NAMES: Record<EntityId, string> = {
  'village-of-oak-park': 'Village of Oak Park',
  'oak-park-township': 'Oak Park Township',
  'district-97': 'School District 97',
  'district-200': 'OPRF High School District 200',
  'park-district': 'Park District of Oak Park',
  'oak-park-library': 'Oak Park Public Library',
};

export type SourceType = 'news' | 'meetings' | 'agendas' | 'minutes';

export interface SourceSelectors {
  items: string;
  title: string;
  link: string;
  date?: string;
  description?: string;
}

export interface PaginationConfig {
  nextSelector: string;
  maxPages: number;
}

export interface Source {
  id: string;
  entity: EntityId;
  name: string;
  type: SourceType;
  url: string;
  selectors: SourceSelectors;
  pagination?: PaginationConfig;
  requiresBrowser?: boolean;
}

export interface ScrapedItem {
  sourceId: string;
  entity: EntityId;
  type: SourceType;
  title: string;
  url: string;
  date?: string;
  description?: string;
  content?: string;
  documentUrl?: string;
  documentPath?: string;
}

export interface SummaryItem {
  item: ScrapedItem;
  summary: string;
}

export interface EntitySummary {
  entity: EntityId;
  entityName: string;
  date: string;
  items: SummaryItem[];
  summary: string;
}
