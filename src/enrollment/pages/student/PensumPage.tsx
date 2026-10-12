import { Link } from "react-router";
import { enrollmentApi } from "../../api/enrollmentApi";
import { RequireRole } from "../../components/RequireRole";
import { RequestFailure } from "../../components/RequestFailure";
import { useRequest } from "../../hooks/useRequest";
import { useMountBase } from "../../hooks/useMountBase";
import type { PensumState, PensumSubject } from "../../model/enrollment";

const STATE_TEXT: Record<PensumState, string> = { PASSED: "Passed", IN_PROGRESS: "In progress", AVAILABLE: "Available", LOCKED: "Locked" };

// HU-ENR-001: the pensum, every subject classified from the record, the confirmed enrollments
// and the prerequisites (EN-03, INV-ENR-006), grouped by semester, with the way into the
// enroll flow for an available subject. Four states (Annex H).
export function PensumPage() {
  return (
    <RequireRole roles={["STUDENT"]}>
      <Pensum />
    </RequireRole>
  );
}

function Pensum() {
  const state = useRequest((signal) => enrollmentApi.myPensum(signal), []);
  if (state.status === "loading") return <p role="status">Loading your pensum...</p>;
  if (state.status === "error") return <RequestFailure error={state.error} retry={state.retry} />;
  const { subjects, totals } = state.data;
  const semesters = [...new Set(subjects.map((s) => s.semester))].sort((a, b) => a - b);

  return (
    <section aria-labelledby="pensum-title">
      <h3 id="pensum-title">My pensum</h3>
      <p>
        {totals.subjectsPassed} of {totals.subjectsTotal} subjects passed, {totals.creditsPassed} of {totals.creditsTotal} credits ({totals.percent}%)
      </p>
      {semesters.map((semester) => (
        <table key={semester} aria-label={`Semester ${semester}`}>
          <caption>Semester {semester}</caption>
          <thead>
            <tr>
              <th scope="col">Subject</th>
              <th scope="col">Credits</th>
              <th scope="col">State</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {subjects.filter((s) => s.semester === semester).map((s) => <SubjectRow key={s.code} subject={s} />)}
          </tbody>
        </table>
      ))}
    </section>
  );
}

function SubjectRow({ subject }: { subject: PensumSubject }) {
  const base = useMountBase();
  return (
    <tr>
      <th scope="row">
        {subject.code} {subject.name}
      </th>
      <td>{subject.credits}</td>
      <td>
        {STATE_TEXT[subject.state]}
        {subject.state === "LOCKED" ? ` (missing ${subject.missingPrerequisites.join(", ")})` : ""}
      </td>
      <td>{subject.state === "AVAILABLE" ? <Link to={`${base}/enroll/${subject.code}`}>Enroll</Link> : null}</td>
    </tr>
  );
}
