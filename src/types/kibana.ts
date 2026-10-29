import { type JsonObject, type JsonValue } from "./json";
import { type GetDashboardsInput, type RunQueryInput, type SearchLogsInput } from "./tool";

export type KibanaIndex = {
  name: string;
  health: string;
  status: string;
  docsCount: number;
  storeSize: string;
};

export type KibanaIndexPatternField = {
  name: string;
  type: string;
  searchable: boolean;
  aggregatable: boolean;
};

export type KibanaIndexPattern = {
  id: string;
  title: string;
  timeFieldName: string | undefined;
  fields: KibanaIndexPatternField[];
};

export type KibanaDashboard = {
  id: string;
  title: string;
  description: string;
  updatedAt: string;
};

export type KibanaDashboardDetail = KibanaDashboard & { panels: JsonValue[] };

export type KibanaHit<T> = {
  _id: string;
  _index: string;
  _score: number | null;
  _source: T;
};

export type KibanaSearchResponse<T> = {
  took: number;
  hits: {
    total: { value: number; relation: string };
    hits: KibanaHit<T>[];
  };
  aggregations?: JsonObject;
};

export type KibanaSavedObject<T> = {
  id: string;
  attributes: T;
  updated_at: string;
};

export type KibanaSavedObjectsResponse<T> = {
  total: number;
  saved_objects: KibanaSavedObject<T>[];
};

export type KibanaDashboardAttributes = {
  title: string;
  description?: string;
  panelsJSON?: string;
};

export type KibanaCatIndex = {
  index: string;
  health: string;
  status: string;
  "docs.count": string | null;
  "store.size": string | null;
};

export type KibanaIndexPatternAttributes = {
  title: string;
  timeFieldName?: string;
};

export type KibanaFieldCapsResponse = {
  fields: Record<string, Record<string, { type: string; searchable: boolean; aggregatable: boolean }>>;
};

export type KibanaDashboardList = {
  total: number;
  items: KibanaDashboard[];
};

export type KibanaClient = {
  searchLogs: (params: SearchLogsInput) => Promise<KibanaSearchResponse<JsonObject>>;
  getIndices: () => Promise<KibanaIndex[]>;
  getIndexPattern: (id: string) => Promise<KibanaIndexPattern>;
  runQuery: (params: RunQueryInput) => Promise<KibanaSearchResponse<JsonObject>>;
  getDashboards: (params: GetDashboardsInput) => Promise<KibanaDashboardList>;
  getDashboard: (id: string) => Promise<KibanaDashboardDetail>;
};
