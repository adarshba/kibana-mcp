import { type HttpClient } from "@/types/http";
import {
  type KibanaClient,
  type KibanaDashboardAttributes,
  type KibanaCatIndex,
  type KibanaFieldCapsResponse,
  type KibanaIndexPatternAttributes,
  type KibanaSavedObject,
  type KibanaSavedObjectsResponse,
  type KibanaSearchResponse,
} from "@/types/kibana";
import { type JsonObject, type JsonValue } from "@/types/json";

const proxyPath = (path: string, method: "GET" | "POST"): string =>
  `/api/console/proxy?path=${encodeURIComponent(path)}&method=${method}`;

export const createKibanaClient = (http: HttpClient): KibanaClient => ({
  searchLogs: (params) =>
    http.post<KibanaSearchResponse<JsonObject>>(proxyPath(`${params.index}/_search`, "POST"), {
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
                      [params.timeField]: {
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
      sort: [{ [params.timeField]: { order: "desc" } }],
    }),

  getIndices: async () => {
    const indices = await http.post<KibanaCatIndex[]>(
      proxyPath("_cat/indices?format=json&h=index,health,status,docs.count,store.size", "GET")
    );
    return indices.map((idx) => ({
      name: idx.index,
      health: idx.health,
      status: idx.status,
      docsCount: Number(idx["docs.count"] ?? 0),
      storeSize: idx["store.size"] ?? "",
    }));
  },

  getIndexPattern: async (id) => {
    const { attributes } = await http.get<KibanaSavedObject<KibanaIndexPatternAttributes>>(
      `/api/saved_objects/index-pattern/${encodeURIComponent(id)}`
    );
    const { fields } = await http.post<KibanaFieldCapsResponse>(
      proxyPath(`${attributes.title}/_field_caps?fields=*`, "GET")
    );
    return {
      id,
      title: attributes.title,
      timeFieldName: attributes.timeFieldName,
      fields: Object.entries(fields).map(([name, caps]) => {
        const types = Object.values(caps);
        return {
          name,
          type: types.length > 1 ? "conflict" : types[0].type,
          searchable: types.every((t) => t.searchable),
          aggregatable: types.every((t) => t.aggregatable),
        };
      }),
    };
  },

  runQuery: (params) =>
    http.post<KibanaSearchResponse<JsonObject>>(proxyPath(`${params.index}/_search`, "POST"), { ...params.query, size: params.size }),

  getDashboards: async (params) => {
    const found = await http.get<KibanaSavedObjectsResponse<KibanaDashboardAttributes>>(
      `/api/saved_objects/_find?type=dashboard&per_page=${params.perPage}&page=${params.page}`
    );
    return {
      total: found.total,
      items: found.saved_objects.map((obj) => ({
        id: obj.id,
        title: obj.attributes.title,
        description: obj.attributes.description ?? "",
        updatedAt: obj.updated_at,
      })),
    };
  },

  getDashboard: async (id) => {
    const dashboard = await http.get<KibanaSavedObject<KibanaDashboardAttributes>>(
      `/api/saved_objects/dashboard/${encodeURIComponent(id)}`
    );
    return {
      id: dashboard.id,
      title: dashboard.attributes.title,
      description: dashboard.attributes.description ?? "",
      panels: dashboard.attributes.panelsJSON ? (JSON.parse(dashboard.attributes.panelsJSON) as JsonValue[]) : [],
      updatedAt: dashboard.updated_at,
    };
  },
});
