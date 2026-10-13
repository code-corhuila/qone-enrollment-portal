import { apiClient } from "shell/apiClient";
import type { Page, Section } from "../model/enrollment";

// The two catalog reads the enroll flow needs (CA-05, CA-08), through the shell's client. The
// enrollment portal never owns catalog data: it lists the groups of a subject to pick one.
const BASE = "/api/v1/catalog";

export const catalogApi = {
  sectionsOf: (code: string, term: string, signal?: AbortSignal) =>
    apiClient.get<Page<Section>>(`${BASE}/subjects/${encodeURIComponent(code)}/sections`, { query: { term, limit: 50 }, ...(signal ? { signal } : {}) }),
  getSection: (id: string, signal?: AbortSignal) => apiClient.get<Section>(`${BASE}/sections/${encodeURIComponent(id)}`, signal ? { signal } : {}),
};
