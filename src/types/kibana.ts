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

export type KibanaDashboardDetail = {
  id: string;
  title: string;
  description: string;
  panels: unknown[];
  updatedAt: string;
};

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
};

export type KibanaSavedObjectsResponse<T> = {
  total: number;
  saved_objects: Array<{
    id: string;
    attributes: T;
    updated_at: string;
  }>;
};

export type KibanaDashboardAttributes = {
  title: string;
  description?: string;
  panelsJSON?: string;
};

export type KibanaIndexManagementIndex = {
  name: string;
  health: string;
  status: string;
  documents: { count: number };
  size: { store: string };
};

export type KibanaIndexPatternResponse = {
  index_pattern: {
    id: string;
    title: string;
    timeFieldName?: string;
    fields: Record<string, { type: string; searchable: boolean; aggregatable: boolean }>;
  };
};
