import { type HttpClient } from "./http.js";
import {
  type KibanaSearchResponse,
  type KibanaIndex,
  type KibanaIndexPattern,
  type KibanaDashboard,
  type KibanaDashboardDetail,
  type KibanaSavedObjectsResponse,
  type KibanaDashboardAttributes,
  type KibanaIndexManagementIndex,
  type KibanaIndexPatternResponse,
} from "../types/kibana.js";

export type SearchLogsParams = {
  index: string;
  query: string;
  from?: string;
  to?: string;
  size: number;
  offset: number;
};

export type RunQueryParams = {
  index: string;
  query: Record<string, unknown>;
  size: number;
};

export type GetDashboardsParams = {
  page: number;
  perPage: number;
};

export type KibanaClient = {
  searchLogs: (params: SearchLogsParams) => Promise<KibanaSearchResponse<unknown>>;
  getIndices: () => Promise<KibanaIndex[]>;
  getIndexPattern: (id: string) => Promise<KibanaIndexPattern>;
  runQuery: (params: RunQueryParams) => Promise<KibanaSearchResponse<unknown>>;
  getDashboards: (params: GetDashboardsParams) => Promise<{ total: number; items: KibanaDashboard[] }>;
  getDashboard: (id: string) => Promise<KibanaDashboardDetail>;
};

export const createKibanaClient = (http: HttpClient): KibanaClient => {
  const searchLogs = async (params: SearchLogsParams): Promise<KibanaSearchResponse<unknown>> => {
    const body: Record<string, unknown> = {
      from: params.offset,
      size: params.size,
      query: {
        bool: {
          must: [{ query_string: { query: params.query } }],
          ...(params.from || params.to
            ? {
                filter: [
                  {
                    range: {
                      "@timestamp": {
                        ...(params.from ? { gte: params.from } : {}),
                        ...(params.to ? { lte: params.to } : {}),
                      },
                    },
                  },
                ],
              }
            : {}),
        },
      },
      sort: [{ "@timestamp": { order: "desc" } }],
    };

    const path = `/api/console/proxy?path=${encodeURIComponent(`${params.index}/_search`)}&method=POST`;
    return http.post<KibanaSearchResponse<unknown>>(path, body);
  };

  const getIndices = async (): Promise<KibanaIndex[]> => {
    const raw = await http.get<KibanaIndexManagementIndex[]>("/api/index_management/indices");
    return raw.map((idx) => ({
      name: idx.name,
      health: idx.health,
      status: idx.status,
      docsCount: idx.documents.count,
      storeSize: idx.size.store,
    }));
  };

  const getIndexPattern = async (id: string): Promise<KibanaIndexPattern> => {
    const raw = await http.get<KibanaIndexPatternResponse>(
      `/api/index_patterns/index_pattern/${encodeURIComponent(id)}`
    );
    const ip = raw.index_pattern;
    return {
      id: ip.id,
      title: ip.title,
      timeFieldName: ip.timeFieldName,
      fields: Object.entries(ip.fields).map(([name, field]) => ({
        name,
        type: field.type,
        searchable: field.searchable,
        aggregatable: field.aggregatable,
      })),
    };
  };

  const runQuery = async (params: RunQueryParams): Promise<KibanaSearchResponse<unknown>> => {
    const body = { ...params.query, size: params.size };
    const path = `/api/console/proxy?path=${encodeURIComponent(`${params.index}/_search`)}&method=POST`;
    return http.post<KibanaSearchResponse<unknown>>(path, body);
  };

  const getDashboards = async (
    params: GetDashboardsParams
  ): Promise<{ total: number; items: KibanaDashboard[] }> => {
    const path = `/api/saved_objects/_find?type=dashboard&per_page=${params.perPage}&page=${params.page}`;
    const raw = await http.get<KibanaSavedObjectsResponse<KibanaDashboardAttributes>>(path);
    return {
      total: raw.total,
      items: raw.saved_objects.map((obj) => ({
        id: obj.id,
        title: obj.attributes.title,
        description: obj.attributes.description ?? "",
        updatedAt: obj.updated_at,
      })),
    };
  };

  const getDashboard = async (id: string): Promise<KibanaDashboardDetail> => {
    const raw = await http.get<KibanaSavedObjectsResponse<KibanaDashboardAttributes>["saved_objects"][number]>(
      `/api/saved_objects/dashboard/${encodeURIComponent(id)}`
    );
    const panels: unknown[] = raw.attributes.panelsJSON
      ? (JSON.parse(raw.attributes.panelsJSON) as unknown[])
      : [];
    return {
      id: raw.id,
      title: raw.attributes.title,
      description: raw.attributes.description ?? "",
      panels,
      updatedAt: raw.updated_at,
    };
  };

  return { searchLogs, getIndices, getIndexPattern, runQuery, getDashboards, getDashboard };
};
