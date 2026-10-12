// Types copied from 07-api/contracts/openapi: qone-enrollment-api.yaml (EN-xx),
// qone-workflow.yaml (WF-xx) and the slice of qone-catalog-api.yaml the enroll flow reads
// (Annex H: the portal's types mirror the contract field by field). The contract test
// validates the fixtures against the YAML; these types keep the compiler honest.

export const CURRENT_TERM = "2026-B";

export type Day = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";
export interface Slot {
  day: Day;
  start: string;
  end: string;
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
export interface Page<T> {
  data: T[];
  meta: PageMeta;
}

export interface AcademicRecord {
  studentId: string;
  studentName: string;
  program: string;
  semester: number;
  passedCodes: string[];
  updatedAt: string;
}

export type PensumState = "PASSED" | "IN_PROGRESS" | "AVAILABLE" | "LOCKED";
export interface PensumSubject {
  code: string;
  name: string;
  credits: number;
  semester: number;
  prerequisites: string[];
  state: PensumState;
  missingPrerequisites: string[];
}
export interface Pensum {
  student: AcademicRecord;
  subjects: PensumSubject[];
  totals: { creditsTotal: number; creditsPassed: number; creditsInProgress: number; percent: number; subjectsPassed: number; subjectsTotal: number };
}

export type RejectionReason = "TUITION_UNPAID" | "PREREQ_MISSING" | "NO_SEATS" | "SCHEDULE_CONFLICT";
export type EnrollmentStatus = "CONFIRMED" | "REJECTED" | "CANCELLED";
export interface Enrollment {
  id: string;
  studentId: string;
  studentName: string;
  term: string;
  subjectCode: string;
  subjectName: string;
  sectionId: string;
  groupNumber: number;
  slots: Slot[];
  status: EnrollmentStatus;
  rejectionReason?: RejectionReason | null;
  origin: "UI" | "AGENT";
  confirmationId?: string | null;
  sagaId: string;
  createdAt: string;
}

export interface ScheduleItem {
  enrollmentId: string;
  subjectCode: string;
  subjectName: string;
  groupNumber: number;
  slots: Slot[];
}

export interface RosterItem {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  enrolledAt: string;
}

export type CertificateType = "estudios" | "matricula" | "pago" | "paz-y-salvo" | "avance";
export interface Certificate {
  id: string;
  studentId: string;
  studentName: string;
  type: CertificateType;
  code: string;
  term: string;
  issuedAt: string;
}
export interface Verification {
  valid: boolean;
  type?: CertificateType | null;
  studentName?: string | null;
  issuedAt?: string | null;
}

// qone-workflow.yaml
export type SagaStep = "check-tuition" | "check-eligibility" | "reserve-seat" | "confirm-enrollment" | "commit-seat";
export type SagaStatus = "RUNNING" | "COMPLETED" | "COMPENSATED" | "FAILED";
export interface StartEnrollStudent {
  studentId: string;
  sectionId: string;
  origin: "UI" | "AGENT";
  confirmationId?: string;
}
export interface Saga {
  id: string;
  type: "enroll-student";
  studentId: string;
  sectionId: string;
  origin: "UI" | "AGENT";
  confirmationId?: string | null;
  status: SagaStatus;
  completedSteps: SagaStep[];
  failedStep?: SagaStep | null;
  reason?: RejectionReason | "DUPLICATE" | null;
  reservationId?: string | null;
  enrollmentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// The slice of qone-catalog-api.yaml the enroll flow reads (CA-05, CA-08).
export interface Section {
  id: string;
  subjectCode: string;
  subjectName: string;
  term: string;
  groupNumber: number;
  professorId: string;
  professorName: string;
  capacity: number;
  seatsAvailable: number;
  slots: Slot[];
  createdAt: string;
}

/** "MON 08:00-10:00, WED 08:00-10:00" */
export function formatSlots(slots: readonly Slot[]): string {
  return slots.map((s) => `${s.day} ${s.start}-${s.end}`).join(", ");
}

/** The message a person reads for a saga outcome (D-01 reasons), decided once here. */
export const REASON_TEXT: Record<NonNullable<Saga["reason"]>, string> = {
  TUITION_UNPAID: "Your tuition for this term is not paid yet. Pay the invoice in Billing and try again.",
  PREREQ_MISSING: "You have not passed every prerequisite of this subject.",
  NO_SEATS: "This group has no seats left. Try another group.",
  SCHEDULE_CONFLICT: "This group overlaps one of your confirmed classes.",
  DUPLICATE: "You already have an active enrollment in this subject.",
};
