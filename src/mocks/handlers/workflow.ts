import type { Msw } from "../msw";
import { callerOf } from "../caller";
import type { Enrollment, RejectionReason, Saga, SagaStep, StartEnrollStudent } from "../../enrollment/model/enrollment";
import { sections, subjects, TERM } from "../fixtures/catalog";
import { activeEnrollments, enrollmentFixtures, slotsOverlap, tuition } from "../fixtures/enrollment";

// MSW handlers of qone-workflow (WF-01..WF-03): the enroll-student saga of ADR-008 simulated
// against the fixtures, in the real step order - check-tuition (billing), check-eligibility
// (duplicate, prerequisites, schedule conflict), reserve-seat (catalog), confirm-enrollment,
// commit-seat. A rejected gate ends COMPENSATED with failedStep and the domain reason, and the
// attempt is recorded REJECTED (D-01); the same Idempotency-Key returns the same saga (200).
const sagas = new Map<string, Saga>();
const byKey = new Map<string, string>();

const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

function runSaga(body: StartEnrollStudent): Saga {
  const section = sections.find((s) => s.id === body.sectionId)!;
  const record = enrollmentFixtures.records.find((r) => r.studentId === body.studentId)!;
  const saga: Saga = { id: crypto.randomUUID(), type: "enroll-student", studentId: body.studentId, sectionId: body.sectionId, origin: body.origin, confirmationId: body.confirmationId ?? null, status: "RUNNING", completedSteps: [], failedStep: null, reason: null, reservationId: null, enrollmentId: null, createdAt: now(), updatedAt: now() };

  const record_attempt = (status: Enrollment["status"], reason: RejectionReason | null) => {
    const e: Enrollment = { id: crypto.randomUUID(), studentId: record.studentId, studentName: record.studentName, term: TERM, subjectCode: section.subjectCode, subjectName: section.subjectName, sectionId: section.id, groupNumber: section.groupNumber, slots: section.slots, status, rejectionReason: reason, origin: body.origin, confirmationId: body.confirmationId ?? null, sagaId: saga.id, createdAt: now() };
    enrollmentFixtures.enrollments.push(e);
    saga.enrollmentId = e.id;
  };
  const fail = (step: SagaStep, reason: NonNullable<Saga["reason"]>) => {
    saga.status = "COMPENSATED";
    saga.failedStep = step;
    saga.reason = reason;
    if (reason !== "DUPLICATE") record_attempt("REJECTED", reason);
    saga.updatedAt = now();
    return saga;
  };

  // 1 check-tuition
  if (tuition[record.studentId] !== "PAID") return fail("check-tuition", "TUITION_UNPAID");
  saga.completedSteps.push("check-tuition");
  // 2 check-eligibility: duplicate, prerequisites, schedule conflict (in that order)
  const active = activeEnrollments(record.studentId);
  if (active.some((e) => e.subjectCode === section.subjectCode)) return fail("check-eligibility", "DUPLICATE");
  const subject = subjects.find((s) => s.code === section.subjectCode)!;
  if (subject.prerequisites.some((p) => !record.passedCodes.includes(p))) return fail("check-eligibility", "PREREQ_MISSING");
  if (active.some((e) => e.slots.some((a) => section.slots.some((b) => slotsOverlap(a, b))))) return fail("check-eligibility", "SCHEDULE_CONFLICT");
  saga.completedSteps.push("check-eligibility");
  // 3 reserve-seat
  if (section.seatsAvailable <= 0) return fail("reserve-seat", "NO_SEATS");
  section.seatsAvailable -= 1;
  saga.reservationId = crypto.randomUUID();
  saga.completedSteps.push("reserve-seat");
  // 4 confirm-enrollment, 5 commit-seat
  record_attempt("CONFIRMED", null);
  saga.completedSteps.push("confirm-enrollment", "commit-seat");
  saga.status = "COMPLETED";
  saga.updatedAt = now();
  return saga;
}

export function workflowHandlers({ http, HttpResponse }: Msw) {
  const envelope = (status: number, error: string, message: string, details?: Array<{ field: string; message: string }>) =>
    HttpResponse.json({ error, message, ...(details ? { details } : {}), traceId: crypto.randomUUID() }, { status });
  const caller = callerOf;

  return [
    http.get("*/api/v1/sagas/health", () => HttpResponse.json({ status: "ok", service: "qone-workflow", version: "2.0.0" })),

    http.post("*/api/v1/sagas/enroll-student", async ({ request }) => {
      const who = caller(request);
      if (!who) return envelope(401, "UNAUTHORIZED", "missing or invalid token");
      const key = request.headers.get("idempotency-key") ?? "";
      if (key.length < 8 || key.length > 128) return envelope(400, "VALIDATION_ERROR", "the request has invalid fields", [{ field: "Idempotency-Key", message: "header required, 8 to 128 characters" }]);
      const existing = byKey.get(key);
      if (existing) return HttpResponse.json(sagas.get(existing));
      const body = (await request.json().catch(() => null)) as Partial<StartEnrollStudent> | null;
      const details: Array<{ field: string; message: string }> = [];
      if (!body?.studentId) details.push({ field: "studentId", message: "required" });
      if (!body?.sectionId) details.push({ field: "sectionId", message: "required" });
      if (body?.origin !== "UI" && body?.origin !== "AGENT") details.push({ field: "origin", message: "must be UI or AGENT" });
      if (details.length) return envelope(400, "VALIDATION_ERROR", "the request has invalid fields", details);
      if (who.role === "STUDENT" && body!.studentId !== who.userId) return envelope(403, "FORBIDDEN", "a student may only enroll themselves");
      if (!enrollmentFixtures.records.some((r) => r.studentId === body!.studentId) || !sections.some((s) => s.id === body!.sectionId)) return envelope(404, "NOT_FOUND", "resource not found");
      const saga = runSaga(body as StartEnrollStudent);
      sagas.set(saga.id, saga);
      byKey.set(key, saga.id);
      return HttpResponse.json(saga, { status: 201, headers: { Location: `/api/v1/sagas/${saga.id}` } });
    }),

    http.get("*/api/v1/sagas/:id", ({ request, params }) => {
      const who = caller(request);
      if (!who) return envelope(401, "UNAUTHORIZED", "missing or invalid token");
      const saga = sagas.get(String(params["id"]));
      if (!saga || (who.role === "STUDENT" && saga.studentId !== who.userId)) return envelope(404, "NOT_FOUND", "resource not found");
      return HttpResponse.json(saga);
    }),
  ];
}

/** Test support: forget every saga and key (fixtures keep their state within a test file). */
export function resetSagas(): void {
  sagas.clear();
  byKey.clear();
}
