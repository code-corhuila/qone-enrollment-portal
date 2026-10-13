import type { AcademicRecord, Certificate, Enrollment, Pensum, PensumSubject, Slot } from "../../enrollment/model/enrollment";
import { sections, subjects, TERM } from "./catalog";

// Synthetic data of the enrollment domain (ADR-009): the five students of the prototype seed
// with their passed subjects, their confirmed enrollments of 2026-B and their tuition state
// (the billing projection, 06-data billing_tuition_view). Same ids as qone-front's identity
// fixtures. Shapes follow qone-enrollment-api.yaml and are validated against it.

const createdAt = "2026-08-15T09:00:00Z";
const program = "Ingeniería de Software";

function record(n: number, studentName: string, semester: number, passedCodes: string[]): AcademicRecord {
  return { studentId: `11111111-1111-4111-8111-11111111111${n}`, studentName, program, semester, passedCodes, updatedAt: createdAt };
}

export const records: AcademicRecord[] = [
  record(1, "Laura Gómez", 6, ["ISW-501", "ISW-502", "RED-501", "HUM-501"]),
  record(2, "Santiago Rojas", 5, ["ISW-501"]),
  record(3, "María José Cabrera", 6, ["ISW-501", "ISW-502", "RED-501", "HUM-501", "MAT-501"]),
  record(4, "Andrés Pineda", 7, ["ISW-501", "ISW-502", "RED-501", "HUM-501", "MAT-501", "ISW-601"]),
  record(5, "Valentina Suárez", 7, ["ISW-501", "ISW-502", "RED-501", "HUM-501", "MAT-501", "ISW-601"]),
];

/** billing_tuition_view: Santiago's invoice is ISSUED (the tuition gate demo); the rest PAID. */
export const tuition: Record<string, "ISSUED" | "PAID"> = Object.fromEntries(records.map((r) => [r.studentId, r.studentName === "Santiago Rojas" ? "ISSUED" : "PAID"]));

let seq = 0;
function confirmed(studentId: string, subjectCode: string, groupNumber: number): Enrollment {
  const s = sections.find((x) => x.subjectCode === subjectCode && x.groupNumber === groupNumber)!;
  const r = records.find((x) => x.studentId === studentId)!;
  seq += 1;
  return {
    id: `66666666-6666-4666-8666-6666666666${String(seq).padStart(2, "0")}`,
    studentId,
    studentName: r.studentName,
    term: TERM,
    subjectCode,
    subjectName: s.subjectName,
    sectionId: s.id,
    groupNumber,
    slots: s.slots,
    status: "CONFIRMED",
    rejectionReason: null,
    origin: "UI",
    confirmationId: null,
    sagaId: `77777777-7777-4777-8777-7777777777${String(seq).padStart(2, "0")}`,
    createdAt,
  };
}

const laura = records[0]!.studentId;
const maria = records[2]!.studentId;
const andres = records[3]!.studentId;
const valentina = records[4]!.studentId;

export const enrollments: Enrollment[] = [
  confirmed(laura, "ISW-601", 1),
  confirmed(laura, "ISW-603", 1),
  confirmed(laura, "ISW-605", 1),
  confirmed(laura, "MAT-501", 1),
  confirmed(maria, "ISW-604", 1),
  confirmed(andres, "ISW-604", 1),
  confirmed(valentina, "ISW-604", 1),
];

export const certificates: Certificate[] = [];

/** Two blocks overlap when they share the day and start < other.end and other.start < end. */
export function slotsOverlap(a: Slot, b: Slot): boolean {
  const m = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
  return a.day === b.day && m(a.start) < m(b.end) && m(b.start) < m(a.end);
}

export function activeEnrollments(studentId: string): Enrollment[] {
  return enrollments.filter((e) => e.studentId === studentId && e.term === TERM && e.status === "CONFIRMED");
}

/** EN-03: the pensum derived from the record, the confirmed enrollments and the projection (INV-ENR-006). */
export function pensumOf(student: AcademicRecord): Pensum {
  const inProgress = new Set(activeEnrollments(student.studentId).map((e) => e.subjectCode));
  const passed = new Set(student.passedCodes);
  const list: PensumSubject[] = subjects.map((s) => {
    const missing = s.prerequisites.filter((p) => !passed.has(p));
    const state = passed.has(s.code) ? "PASSED" : inProgress.has(s.code) ? "IN_PROGRESS" : missing.length === 0 ? "AVAILABLE" : "LOCKED";
    return { code: s.code, name: s.name, credits: s.credits, semester: s.semester, prerequisites: s.prerequisites, state, missingPrerequisites: missing };
  });
  const creditsTotal = list.reduce((a, s) => a + s.credits, 0);
  const creditsPassed = list.filter((s) => s.state === "PASSED").reduce((a, s) => a + s.credits, 0);
  const creditsInProgress = list.filter((s) => s.state === "IN_PROGRESS").reduce((a, s) => a + s.credits, 0);
  return {
    student,
    subjects: list,
    totals: { creditsTotal, creditsPassed, creditsInProgress, percent: Math.round((creditsPassed * 100) / creditsTotal), subjectsPassed: passed.size, subjectsTotal: list.length },
  };
}

export const enrollmentFixtures = { records, enrollments, certificates, tuition, laura, maria, andres, valentina, santiago: records[1]!.studentId };
