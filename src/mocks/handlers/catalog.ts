import type { Msw } from "../msw";
import { paginate, sections, subjects } from "../fixtures/catalog";

// The two catalog reads the enroll flow uses (CA-05, CA-08), answered from the projection
// fixtures so the portal runs with no catalog service behind it.
export function catalogHandlers({ http, HttpResponse }: Msw) {
  const envelope = (status: number, error: string, message: string) => HttpResponse.json({ error, message, traceId: crypto.randomUUID() }, { status });
  const authorized = (request: Request) => (request.headers.get("authorization") ?? "").startsWith("Bearer ");

  return [
    http.get("*/api/v1/catalog/subjects/:code/sections", ({ request, params }) => {
      if (!authorized(request)) return envelope(401, "UNAUTHORIZED", "missing or invalid token");
      if (!subjects.some((s) => s.code === params["code"])) return envelope(404, "NOT_FOUND", "resource not found");
      const url = new URL(request.url);
      const term = url.searchParams.get("term");
      const rows = sections.filter((s) => s.subjectCode === params["code"] && (term ? s.term === term : true));
      return HttpResponse.json(paginate(rows, Number(url.searchParams.get("page") ?? "1"), Number(url.searchParams.get("limit") ?? "20")));
    }),

    http.get("*/api/v1/catalog/sections/:id", ({ request, params }) => {
      if (!authorized(request)) return envelope(401, "UNAUTHORIZED", "missing or invalid token");
      const s = sections.find((x) => x.id === params["id"]);
      return s ? HttpResponse.json(s) : envelope(404, "NOT_FOUND", "resource not found");
    }),
  ];
}
