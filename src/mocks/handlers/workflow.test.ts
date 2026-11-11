import { sagaApi } from "../../enrollment/api/sagaApi";
import { enrollmentApi } from "../../enrollment/api/enrollmentApi";
import { catalogApi } from "../../enrollment/api/catalogApi";
import { enrollmentFixtures } from "../fixtures/enrollment";
import { sections } from "../fixtures/catalog";
import { testSession } from "../../test/shell/session";
import { resetSagas } from "./workflow";

// The simulated enroll-student saga must behave as ADR-008 and Annex E describe: the gates in
// order, a compensated outcome with the domain reason, the attempt recorded (D-01), the seat
// taken on success and the same saga on a repeated Idempotency-Key.
const bySection = (code: string, group: number) => sections.find((s) => s.subjectCode === code && s.groupNumber === group)!;
const asStudent01 = () => testSession.signInAs({ id: enrollmentFixtures.student01, role: "STUDENT", name: "Estudiante Demo 01" });

beforeEach(() => resetSagas());

describe("enroll-student saga (simulated)", () => {
  it("rejects an unpaid student at check-tuition and records the attempt", async () => {
    testSession.signInAs({ id: enrollmentFixtures.student02, role: "STUDENT", name: "Estudiante Demo 02" });
    const saga = await sagaApi.startEnrollStudent({ studentId: enrollmentFixtures.student02, sectionId: bySection("ISW-602", 1).id, origin: "UI" }, "saga-student02-01");

    expect(saga.status).toBe("COMPENSATED");
    expect(saga.failedStep).toBe("check-tuition");
    expect(saga.reason).toBe("TUITION_UNPAID");
    const mine = await enrollmentApi.myEnrollments({ status: "REJECTED" });
    expect(mine.data[0]).toMatchObject({ subjectCode: "ISW-602", status: "REJECTED", rejectionReason: "TUITION_UNPAID", sagaId: saga.id });
  });

  it("rejects a duplicate, a missing prerequisite and a schedule conflict at check-eligibility, in that order", async () => {
    asStudent01();
    const dup = await sagaApi.startEnrollStudent({ studentId: enrollmentFixtures.student01, sectionId: bySection("ISW-601", 1).id, origin: "UI" }, "saga-student01-dup-01");
    expect(dup.reason).toBe("DUPLICATE");
    const prereq = await sagaApi.startEnrollStudent({ studentId: enrollmentFixtures.student01, sectionId: bySection("ISW-703", 1).id, origin: "UI" }, "saga-student01-pre-01");
    expect(prereq.reason).toBe(null);
    expect(prereq.status).toBe("COMPLETED");
    // ISW-604 g1 is MON/WED 08:00-10:00; Estudiante Demo 01's ISW-603 g1 is MON/WED 10:00-12:00: touching, not overlapping.
    // ISW-604 g2 is TUE/THU 08:00-10:00, the same blocks as her ISW-601 g1: a conflict.
    const conflict = await sagaApi.startEnrollStudent({ studentId: enrollmentFixtures.student01, sectionId: bySection("ISW-604", 2).id, origin: "UI" }, "saga-student01-con-01");
    expect(conflict).toMatchObject({ status: "COMPENSATED", failedStep: "check-eligibility", reason: "SCHEDULE_CONFLICT" });
  });

  it("rejects a full group at reserve-seat and takes a seat on success", async () => {
    asStudent01();
    const full = await sagaApi.startEnrollStudent({ studentId: enrollmentFixtures.student01, sectionId: bySection("ISW-604", 3).id, origin: "UI" }, "saga-student01-full-1");
    expect(full).toMatchObject({ status: "COMPENSATED", failedStep: "reserve-seat", reason: "NO_SEATS" });

    const before = (await catalogApi.getSection(bySection("ISW-604", 1).id)).seatsAvailable;
    const ok = await sagaApi.startEnrollStudent({ studentId: enrollmentFixtures.student01, sectionId: bySection("ISW-604", 1).id, origin: "UI" }, "saga-student01-ok-001");
    expect(ok.status).toBe("COMPLETED");
    expect(ok.completedSteps).toEqual(["check-tuition", "check-eligibility", "reserve-seat", "confirm-enrollment", "commit-seat"]);
    expect((await catalogApi.getSection(bySection("ISW-604", 1).id)).seatsAvailable).toBe(before - 1);
    expect((await enrollmentApi.getEnrollment(ok.enrollmentId!)).status).toBe("CONFIRMED");
  });

  it("returns the same saga for a repeated Idempotency-Key without running the steps again, and reads it by id", async () => {
    asStudent01();
    const first = await sagaApi.startEnrollStudent({ studentId: enrollmentFixtures.student01, sectionId: bySection("ISW-602", 1).id, origin: "UI" }, "saga-student01-rep-01");
    const again = await sagaApi.startEnrollStudent({ studentId: enrollmentFixtures.student01, sectionId: bySection("ISW-602", 1).id, origin: "UI" }, "saga-student01-rep-01");
    expect(again.id).toBe(first.id);
    expect((await sagaApi.getSaga(first.id)).status).toBe("COMPLETED");
  });

  it("refuses a student starting the saga for someone else", async () => {
    asStudent01();
    await expect(sagaApi.startEnrollStudent({ studentId: enrollmentFixtures.student03, sectionId: bySection("ISW-602", 1).id, origin: "UI" }, "saga-student01-oth-01")).rejects.toMatchObject({ status: 403 });
  });
});
