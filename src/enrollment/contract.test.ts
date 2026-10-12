// @vitest-environment node
// Contract level (ADR-009): the synthetic data and the handler responses must match the YAML
// copies of qone-enrollment-api, qone-workflow and the catalog slice, so "aligned with 07" is
// a test result.
import { catalogFixtures, paginate } from "../mocks/fixtures/catalog";
import { activeEnrollments, enrollmentFixtures, pensumOf } from "../mocks/fixtures/enrollment";
import { expectValid, loadContract, type Contract } from "../test/contracts";

let enrollment: Contract;
let catalog: Contract;
beforeAll(async () => {
  [enrollment, catalog] = await Promise.all([loadContract("qone-enrollment-api.yaml"), loadContract("qone-catalog-api.yaml")]);
});

describe("enrollment fixtures against qone-enrollment-api.yaml", () => {
  it("every record matches AcademicRecord and EN-02's 200", () => {
    for (const r of enrollmentFixtures.records) expectValid(enrollment.response("get", "/enrollment/academic-records/me", 200), r, `record ${r.studentName}`);
  });

  it("the derived pensum of every student matches Pensum (EN-03)", () => {
    for (const r of enrollmentFixtures.records) expectValid(enrollment.response("get", "/enrollment/pensum/me", 200), pensumOf(r), `pensum ${r.studentName}`);
    const laura = pensumOf(enrollmentFixtures.records[0]!);
    expect(laura.subjects.find((s) => s.code === "ISW-604")?.state).toBe("AVAILABLE");
    expect(laura.subjects.find((s) => s.code === "ISW-601")?.state).toBe("IN_PROGRESS");
    expect(laura.subjects.find((s) => s.code === "ISW-701")?.missingPrerequisites).toEqual(["ISW-604"]);
    expect(laura.totals.subjectsPassed).toBe(4);
  });

  it("every enrollment matches Enrollment and the page matches EN-07's 200", () => {
    for (const e of enrollmentFixtures.enrollments) expectValid(enrollment.schema("Enrollment"), e, `enrollment ${e.subjectCode} of ${e.studentName}`);
    expectValid(enrollment.response("get", "/enrollment/enrollments/me", 200), paginate(enrollmentFixtures.enrollments, 1, 20), "enrollments page");
  });

  it("the schedule and the roster pages match EN-09 and EN-10", () => {
    const items = activeEnrollments(enrollmentFixtures.laura).map((e) => ({ enrollmentId: e.id, subjectCode: e.subjectCode, subjectName: e.subjectName, groupNumber: e.groupNumber, slots: e.slots }));
    expectValid(enrollment.response("get", "/enrollment/schedule/me", 200), paginate(items, 1, 20), "schedule page");
    const roster = enrollmentFixtures.enrollments.filter((e) => e.subjectCode === "ISW-604").map((e) => ({ enrollmentId: e.id, studentId: e.studentId, studentName: e.studentName, enrolledAt: e.createdAt }));
    expectValid(enrollment.response("get", "/enrollment/sections/{sectionId}/roster", 200), paginate(roster, 1, 20), "roster page");
  });

  it("the catalog projection matches the Section schema of qone-catalog-api.yaml", () => {
    for (const s of catalogFixtures.sections) expectValid(catalog.schema("Section"), s, `section ${s.subjectCode} g${s.groupNumber}`);
  });

  it("rejects a fixture that drifts from the contract", () => {
    const drifted = { ...enrollmentFixtures.enrollments[0]!, status: "PENDING" };
    expect(enrollment.schema("Enrollment")(drifted)).toBe(false);
  });
});
