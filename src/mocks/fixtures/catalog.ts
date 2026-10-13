import type { Page, Section, Slot } from "../../enrollment/model/enrollment";

// The catalog projection the enrollment domain keeps (D-11, 06-data: catalog_subject_view and
// catalog_section_view): the fourteen subjects and eleven sections of the prototype seed, the
// same rows as qone-catalog-portal/src/mocks/fixtures/catalog.ts. The enroll flow reads
// sections through the shell's client (CA-05, CA-08); the saga reserves and commits seats here.

export interface SubjectView {
  code: string;
  name: string;
  credits: number;
  semester: number;
  prerequisites: string[];
}

const createdAt = "2026-08-01T12:00:00Z";
export const TERM = "2026-B";

export const subjects: SubjectView[] = [
  { code: "ISW-501", name: "Bases de Datos I", credits: 3, semester: 5, prerequisites: [] },
  { code: "ISW-502", name: "Sistemas Operativos", credits: 3, semester: 5, prerequisites: [] },
  { code: "RED-501", name: "Redes de Datos", credits: 3, semester: 5, prerequisites: [] },
  { code: "HUM-501", name: "Ética Profesional", credits: 2, semester: 5, prerequisites: [] },
  { code: "MAT-501", name: "Estadística II", credits: 3, semester: 5, prerequisites: [] },
  { code: "ISW-601", name: "Bases de Datos II", credits: 3, semester: 6, prerequisites: ["ISW-501"] },
  { code: "ISW-602", name: "Teoría de la Computación", credits: 3, semester: 6, prerequisites: [] },
  { code: "ISW-603", name: "Ingeniería de Requisitos", credits: 3, semester: 6, prerequisites: [] },
  { code: "ISW-604", name: "Sistemas Distribuidos", credits: 4, semester: 6, prerequisites: ["RED-501"] },
  { code: "ISW-605", name: "Arquitectura de Software", credits: 3, semester: 6, prerequisites: [] },
  { code: "ISW-701", name: "Seguridad Informática", credits: 3, semester: 7, prerequisites: ["ISW-604"] },
  { code: "ISW-702", name: "Computación en la Nube", credits: 3, semester: 7, prerequisites: ["ISW-604"] },
  { code: "ISW-703", name: "Gestión de Proyectos", credits: 3, semester: 7, prerequisites: [] },
  { code: "ISW-704", name: "Analítica de Datos", credits: 3, semester: 7, prerequisites: ["MAT-501"] },
];

const P = {
  carlos: { id: "22222222-2222-4222-8222-222222222221", name: "Carlos Ramírez" },
  ana: { id: "22222222-2222-4222-8222-222222222222", name: "Ana Torres" },
  jorge: { id: "22222222-2222-4222-8222-222222222223", name: "Jorge Medina" },
} as const;

const slot = (day: Slot["day"], start: string, end: string): Slot => ({ day, start, end });

function section(n: number, subjectCode: string, groupNumber: number, professor: keyof typeof P, capacity: number, seatsAvailable: number, slots: Slot[]): Section {
  const s = subjects.find((x) => x.code === subjectCode)!;
  return { id: `55555555-5555-4555-8555-5555555555${String(n).padStart(2, "0")}`, subjectCode, subjectName: s.name, term: TERM, groupNumber, professorId: P[professor].id, professorName: P[professor].name, capacity, seatsAvailable, slots, createdAt };
}

export const sections: Section[] = [
  section(1, "ISW-601", 1, "ana", 30, 29, [slot("TUE", "08:00", "10:00"), slot("THU", "08:00", "10:00")]),
  section(2, "ISW-603", 1, "jorge", 30, 29, [slot("MON", "10:00", "12:00"), slot("WED", "10:00", "12:00")]),
  section(3, "ISW-605", 1, "ana", 30, 29, [slot("TUE", "14:00", "16:00"), slot("THU", "14:00", "16:00")]),
  section(4, "MAT-501", 1, "jorge", 30, 29, [slot("FRI", "14:00", "17:00")]),
  section(5, "ISW-604", 1, "carlos", 30, 27, [slot("MON", "08:00", "10:00"), slot("WED", "08:00", "10:00")]),
  section(6, "ISW-604", 2, "ana", 30, 30, [slot("TUE", "08:00", "10:00"), slot("THU", "08:00", "10:00")]),
  section(7, "ISW-604", 3, "jorge", 3, 0, [slot("FRI", "08:00", "12:00")]),
  section(8, "ISW-501", 2, "carlos", 30, 0, [slot("TUE", "10:00", "12:00"), slot("THU", "10:00", "12:00")]),
  section(9, "RED-501", 1, "carlos", 30, 30, [slot("FRI", "08:00", "11:00")]),
  section(10, "ISW-602", 1, "ana", 30, 30, [slot("TUE", "16:00", "18:00"), slot("THU", "16:00", "18:00")]),
  section(11, "ISW-703", 1, "jorge", 30, 30, [slot("WED", "16:00", "19:00")]),
];

export function paginate<T>(rows: readonly T[], page: number, limit: number): Page<T> {
  const start = (page - 1) * limit;
  return { data: rows.slice(start, start + limit), meta: { page, limit, total: rows.length, totalPages: Math.ceil(rows.length / limit) } };
}

export const catalogFixtures = { subjects, sections };
