import type { Msw } from "../msw";
import { callerOf } from "../caller";
import type { Certificate, CertificateType } from "../../enrollment/model/enrollment";
import { paginate, TERM } from "../fixtures/catalog";
import { activeEnrollments, enrollmentFixtures, tuition } from "../fixtures/enrollment";

// MSW handlers of the certificate operations (EN-11 public verification, EN-12 my
// certificates, EN-13 issue). Issue is idempotent (D-12) and enforces the preconditions per
// type: `pago` and `paz-y-salvo` need the current invoice PAID (INV-ENR-002, billing
// projection); `matricula` a confirmed enrollment this term; `avance` a non-empty record.
const TYPES: readonly CertificateType[] = ["estudios", "matricula", "pago", "paz-y-salvo", "avance"];
const byKey = new Map<string, string>();

function code(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return "QMP-" + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function certificateHandlers({ http, HttpResponse }: Msw) {
  const envelope = (status: number, error: string, message: string, details?: Array<{ field: string; message: string }>) =>
    HttpResponse.json({ error, message, ...(details ? { details } : {}), traceId: crypto.randomUUID() }, { status });

  return [
    http.get("*/api/v1/enrollment/certificates/verify/:code", ({ params }) => {
      const c = enrollmentFixtures.certificates.find((x) => x.code === params["code"]);
      return HttpResponse.json(c ? { valid: true, type: c.type, studentName: c.studentName, issuedAt: c.issuedAt } : { valid: false, type: null, studentName: null, issuedAt: null });
    }),

    http.get("*/api/v1/enrollment/certificates/me", ({ request }) => {
      const who = callerOf(request);
      if (!who) return envelope(401, "UNAUTHORIZED", "missing or invalid token");
      if (who.role !== "STUDENT") return envelope(403, "FORBIDDEN", "this role may not perform the operation");
      const url = new URL(request.url);
      const rows = enrollmentFixtures.certificates.filter((c) => c.studentId === who.userId).slice().reverse();
      return HttpResponse.json(paginate(rows, Number(url.searchParams.get("page") ?? "1"), Number(url.searchParams.get("limit") ?? "20")));
    }),

    http.post("*/api/v1/enrollment/certificates", async ({ request }) => {
      const who = callerOf(request);
      if (!who) return envelope(401, "UNAUTHORIZED", "missing or invalid token");
      if (who.role !== "STUDENT") return envelope(403, "FORBIDDEN", "this role may not perform the operation");
      const key = request.headers.get("idempotency-key") ?? "";
      if (key.length < 8 || key.length > 128) return envelope(400, "VALIDATION_ERROR", "the request has invalid fields", [{ field: "Idempotency-Key", message: "header required, 8 to 128 characters" }]);
      const existing = byKey.get(key);
      if (existing) return HttpResponse.json(enrollmentFixtures.certificates.find((c) => c.id === existing));
      const body = (await request.json().catch(() => null)) as { type?: string } | null;
      if (!body || !TYPES.includes(body.type as CertificateType)) return envelope(400, "VALIDATION_ERROR", "the request has invalid fields", [{ field: "type", message: `must be one of ${TYPES.join(", ")}` }]);
      const type = body.type as CertificateType;
      const record = enrollmentFixtures.records.find((r) => r.studentId === who.userId);
      if (!record) return envelope(404, "NOT_FOUND", "resource not found");
      if ((type === "pago" || type === "paz-y-salvo") && tuition[who.userId] !== "PAID") return envelope(422, "BUSINESS_RULE_VIOLATION", "INV-ENR-002: the current invoice is not PAID");
      if (type === "matricula" && activeEnrollments(who.userId).length === 0) return envelope(422, "BUSINESS_RULE_VIOLATION", "no confirmed enrollment this term");
      if (type === "avance" && record.passedCodes.length === 0) return envelope(422, "BUSINESS_RULE_VIOLATION", "the academic record is empty");
      const created: Certificate = { id: crypto.randomUUID(), studentId: who.userId, studentName: record.studentName, type, code: code(), term: TERM, issuedAt: new Date().toISOString().replace(/\.\d{3}Z$/, "Z") };
      enrollmentFixtures.certificates.push(created);
      byKey.set(key, created.id);
      return HttpResponse.json(created, { status: 201, headers: { Location: `/api/v1/enrollment/certificates/${created.id}` } });
    }),
  ];
}

/** Test support. */
export function resetCertificates(): void {
  byKey.clear();
  enrollmentFixtures.certificates.length = 0;
}
