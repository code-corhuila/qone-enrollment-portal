import { apiClient, type RequestOptions } from "shell/apiClient";
import type { AcademicRecord, Certificate, CertificateType, Enrollment, EnrollmentStatus, Page, Pensum, RosterItem, ScheduleItem, Verification } from "../model/enrollment";

// Typed calls of qone-enrollment-api over the shell's client (Annex H: never fetch). Paths are
// relative; the shell knows the gateway. The saga operations are in sagaApi.ts.
const BASE = "/api/v1/enrollment";
type PageQuery = { page?: number; limit?: number };

const opts = (options: RequestOptions, signal?: AbortSignal): RequestOptions => (signal ? { ...options, signal } : options);

export const enrollmentApi = {
  /** EN-02 */
  myRecord: (signal?: AbortSignal) => apiClient.get<AcademicRecord>(`${BASE}/academic-records/me`, opts({}, signal)),
  /** EN-03 */
  myPensum: (signal?: AbortSignal) => apiClient.get<Pensum>(`${BASE}/pensum/me`, opts({}, signal)),
  /** EN-07 */
  myEnrollments: (query: PageQuery & { term?: string; status?: EnrollmentStatus } = {}, signal?: AbortSignal) =>
    apiClient.get<Page<Enrollment>>(`${BASE}/enrollments/me`, opts({ query }, signal)),
  /** EN-08 */
  getEnrollment: (id: string, signal?: AbortSignal) => apiClient.get<Enrollment>(`${BASE}/enrollments/${encodeURIComponent(id)}`, opts({}, signal)),
  /** EN-09 */
  mySchedule: (query: PageQuery & { term?: string } = {}, signal?: AbortSignal) => apiClient.get<Page<ScheduleItem>>(`${BASE}/schedule/me`, opts({ query }, signal)),
  /** EN-10, PROFESSOR or ADMIN */
  roster: (sectionId: string, query: PageQuery = {}, signal?: AbortSignal) =>
    apiClient.get<Page<RosterItem>>(`${BASE}/sections/${encodeURIComponent(sectionId)}/roster`, opts({ query }, signal)),
  /** EN-11, public */
  verifyCertificate: (code: string, signal?: AbortSignal) => apiClient.get<Verification>(`${BASE}/certificates/verify/${encodeURIComponent(code)}`, opts({}, signal)),
  /** EN-12 */
  myCertificates: (query: PageQuery = {}, signal?: AbortSignal) => apiClient.get<Page<Certificate>>(`${BASE}/certificates/me`, opts({ query }, signal)),
  /** EN-13. One Idempotency-Key per intention, reused on retry (norm 5.4.2). */
  issueCertificate: (type: CertificateType, idempotencyKey: string) => apiClient.post<Certificate>(`${BASE}/certificates`, { type }, { idempotencyKey }),
};
