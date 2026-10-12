import { http, HttpResponse } from "msw";
import { server } from "../../mocks/server";
import { catalogFixtures } from "../../mocks/fixtures/catalog";
import { enrollmentFixtures } from "../../mocks/fixtures/enrollment";
import { testSession } from "../../test/shell/session";
import { enrollmentApi } from "./enrollmentApi";
import { catalogApi } from "./catalogApi";
import { sagaApi } from "./sagaApi";

// Core level: typed calls over shell/apiClient (stubbed in tests). Paths, query parameters and
// the Idempotency-Key are the contract; nothing here knows the gateway.
const asLaura = () => testSession.signInAs({ id: enrollmentFixtures.laura, role: "STUDENT", name: "Laura Gómez" });

describe("enrollmentApi", () => {
  it("reads my record and my pensum (EN-02, EN-03)", async () => {
    asLaura();
    const record = await enrollmentApi.myRecord();
    const pensum = await enrollmentApi.myPensum();

    expect(record.passedCodes).toEqual(["ISW-501", "ISW-502", "RED-501", "HUM-501"]);
    expect(pensum.subjects).toHaveLength(14);
    expect(pensum.totals.percent).toBe(Math.round((11 * 100) / 42));
  });

  it("lists my enrollments newest first with the contract's page and filters (EN-07)", async () => {
    asLaura();
    const page = await enrollmentApi.myEnrollments({ term: "2026-B", status: "CONFIRMED", limit: 2 });

    expect(page.meta).toEqual({ page: 1, limit: 2, total: 4, totalPages: 2 });
    expect(page.data.map((e) => e.subjectCode)).toEqual(["MAT-501", "ISW-605"]);
  });

  it("refuses another student's enrollment with 403 and a professor's record read with 403", async () => {
    asLaura();
    const maria = enrollmentFixtures.enrollments.find((e) => e.studentId === enrollmentFixtures.maria)!;
    await expect(enrollmentApi.getEnrollment(maria.id)).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });

    testSession.signInAs({ id: "22222222-2222-4222-8222-222222222221", role: "PROFESSOR", name: "Carlos Ramírez" });
    await expect(enrollmentApi.myRecord()).rejects.toMatchObject({ status: 403 });
  });

  it("reads my schedule (EN-09) and, as a professor, a roster (EN-10)", async () => {
    asLaura();
    const schedule = await enrollmentApi.mySchedule({ term: "2026-B" });
    expect(schedule.data.map((i) => i.subjectCode)).toEqual(["ISW-601", "ISW-603", "ISW-605", "MAT-501"]);

    testSession.signInAs({ id: "22222222-2222-4222-8222-222222222221", role: "PROFESSOR", name: "Carlos Ramírez" });
    const isw604g1 = catalogFixtures.sections[4]!;
    const roster = await enrollmentApi.roster(isw604g1.id);
    expect(roster.data.map((r) => r.studentName)).toEqual(["María José Cabrera", "Andrés Pineda", "Valentina Suárez"]);
  });

  it("issues a certificate with the Idempotency-Key it was given (EN-13)", async () => {
    asLaura();
    let key: string | null = null;
    server.use(http.post("*/api/v1/enrollment/certificates", ({ request }) => { key = request.headers.get("idempotency-key"); return HttpResponse.json({ id: "c", studentId: enrollmentFixtures.laura, studentName: "Laura Gómez", type: "estudios", code: "QMP-ABCDEF12", term: "2026-B", issuedAt: "2026-10-12T00:00:00Z" }, { status: 201 }); }));

    const c = await enrollmentApi.issueCertificate("estudios", "cert-estudios-0001");

    expect(c.code).toBe("QMP-ABCDEF12");
    expect(key).toBe("cert-estudios-0001");
  });
});

describe("catalogApi and sagaApi", () => {
  it("lists the groups of a subject for the term (CA-05) and reads one section (CA-08)", async () => {
    asLaura();
    const groups = await catalogApi.sectionsOf("ISW-604", "2026-B");
    expect(groups.data.map((s) => `g${s.groupNumber}:${s.seatsAvailable}`)).toEqual(["g1:27", "g2:30", "g3:0"]);
    await expect(catalogApi.getSection(groups.data[0]!.id)).resolves.toMatchObject({ subjectName: "Sistemas Distribuidos" });
  });

  it("starts the saga with the Idempotency-Key and reads it by id (WF-02, WF-03)", async () => {
    asLaura();
    let key: string | null = null;
    let body: unknown;
    const saga = { id: "s-1", type: "enroll-student", studentId: enrollmentFixtures.laura, sectionId: "x", origin: "UI", status: "COMPLETED", completedSteps: [], createdAt: "2026-10-12T00:00:00Z", updatedAt: "2026-10-12T00:00:00Z" };
    server.use(
      http.post("*/api/v1/sagas/enroll-student", async ({ request }) => { key = request.headers.get("idempotency-key"); body = await request.json(); return HttpResponse.json(saga, { status: 201 }); }),
      http.get("*/api/v1/sagas/s-1", () => HttpResponse.json(saga)),
    );

    const started = await sagaApi.startEnrollStudent({ studentId: enrollmentFixtures.laura, sectionId: "x", origin: "UI" }, "enroll-x-0001");
    const read = await sagaApi.getSaga("s-1");

    expect(started.status).toBe("COMPLETED");
    expect(read.id).toBe("s-1");
    expect(key).toBe("enroll-x-0001");
    expect(body).toEqual({ studentId: enrollmentFixtures.laura, sectionId: "x", origin: "UI" });
  });
});
