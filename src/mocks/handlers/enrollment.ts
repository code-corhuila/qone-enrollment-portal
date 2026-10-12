import type { Msw } from "../msw";
import { callerOf } from "../caller";
import { paginate, sections } from "../fixtures/catalog";
import { activeEnrollments, enrollmentFixtures, pensumOf } from "../fixtures/enrollment";

// MSW handlers of qone-enrollment-api, read operations: EN-01 health, EN-02 record, EN-03
// pensum, EN-07 my enrollments, EN-08 one enrollment, EN-09 schedule, EN-10 roster. The stub
// caller comes from the stub token of the tests or from the claims of the shell's JWT (caller.ts).
export function enrollmentHandlers({ http, HttpResponse }: Msw) {
  const envelope = (status: number, error: string, message: string, details?: Array<{ field: string; message: string }>) =>
    HttpResponse.json({ error, message, ...(details ? { details } : {}), traceId: crypto.randomUUID() }, { status });

  const caller = callerOf;

  const pageParams = (url: URL) => ({ page: Number(url.searchParams.get("page") ?? "1"), limit: Number(url.searchParams.get("limit") ?? "20") });

  const studentOnly = (request: Request) => {
    const who = caller(request);
    if (!who) return { error: envelope(401, "UNAUTHORIZED", "missing or invalid token") };
    if (who.role !== "STUDENT") return { error: envelope(403, "FORBIDDEN", "this role may not perform the operation") };
    const record = enrollmentFixtures.records.find((r) => r.studentId === who.userId);
    if (!record) return { error: envelope(404, "NOT_FOUND", "resource not found") };
    return { record };
  };

  return [
    http.get("*/api/v1/enrollment/health", () => HttpResponse.json({ status: "ok", service: "qone-enrollment-api", version: "2.0.0" })),

    http.get("*/api/v1/enrollment/academic-records/me", ({ request }) => {
      const r = studentOnly(request);
      return r.error ?? HttpResponse.json(r.record);
    }),

    http.get("*/api/v1/enrollment/pensum/me", ({ request }) => {
      const r = studentOnly(request);
      return r.error ?? HttpResponse.json(pensumOf(r.record!));
    }),

    http.get("*/api/v1/enrollment/enrollments/me", ({ request }) => {
      const r = studentOnly(request);
      if (r.error) return r.error;
      const url = new URL(request.url);
      const { page, limit } = pageParams(url);
      const term = url.searchParams.get("term");
      const status = url.searchParams.get("status");
      const rows = enrollmentFixtures.enrollments
        .filter((e) => e.studentId === r.record!.studentId && (term ? e.term === term : true) && (status ? e.status === status : true))
        .slice()
        .reverse();
      return HttpResponse.json(paginate(rows, page, limit));
    }),

    http.get("*/api/v1/enrollment/enrollments/:id", ({ request, params }) => {
      const who = caller(request);
      if (!who) return envelope(401, "UNAUTHORIZED", "missing or invalid token");
      const e = enrollmentFixtures.enrollments.find((x) => x.id === params["id"]);
      if (!e) return envelope(404, "NOT_FOUND", "resource not found");
      if (who.role === "STUDENT" && e.studentId !== who.userId) return envelope(403, "FORBIDDEN", "this role may not perform the operation");
      return HttpResponse.json(e);
    }),

    http.get("*/api/v1/enrollment/schedule/me", ({ request }) => {
      const r = studentOnly(request);
      if (r.error) return r.error;
      const { page, limit } = pageParams(new URL(request.url));
      const items = activeEnrollments(r.record!.studentId).map((e) => ({ enrollmentId: e.id, subjectCode: e.subjectCode, subjectName: e.subjectName, groupNumber: e.groupNumber, slots: e.slots }));
      return HttpResponse.json(paginate(items, page, limit));
    }),

    http.get("*/api/v1/enrollment/sections/:sectionId/roster", ({ request, params }) => {
      const who = caller(request);
      if (!who) return envelope(401, "UNAUTHORIZED", "missing or invalid token");
      if (who.role !== "PROFESSOR" && who.role !== "ADMIN") return envelope(403, "FORBIDDEN", "this role may not perform the operation");
      if (!sections.some((s) => s.id === params["sectionId"])) return envelope(404, "NOT_FOUND", "resource not found");
      const { page, limit } = pageParams(new URL(request.url));
      const rows = enrollmentFixtures.enrollments
        .filter((e) => e.sectionId === params["sectionId"] && e.status === "CONFIRMED")
        .map((e) => ({ enrollmentId: e.id, studentId: e.studentId, studentName: e.studentName, enrolledAt: e.createdAt }));
      return HttpResponse.json(paginate(rows, page, limit));
    }),
  ];
}
