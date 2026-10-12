import { enrollmentApi } from "../../api/enrollmentApi";
import { RequireRole } from "../../components/RequireRole";
import { RequestFailure } from "../../components/RequestFailure";
import { useRequest } from "../../hooks/useRequest";
import { CURRENT_TERM, formatSlots, REASON_TEXT, type Enrollment } from "../../model/enrollment";

const STATUS_TEXT: Record<Enrollment["status"], string> = { CONFIRMED: "Confirmed", REJECTED: "Rejected", CANCELLED: "Cancelled" };

// HU-ENR-001: my enrollments of the term, newest first (EN-07), including the rejected
// attempts with the reason the person understands (D-01). Four states (Annex H).
export function MyEnrollmentsPage() {
  return (
    <RequireRole roles={["STUDENT"]}>
      <MyEnrollments />
    </RequireRole>
  );
}

function MyEnrollments() {
  const state = useRequest((signal) => enrollmentApi.myEnrollments({ term: CURRENT_TERM, limit: 50 }, signal), []);
  if (state.status === "loading") return <p role="status">Loading your enrollments...</p>;
  if (state.status === "error") return <RequestFailure error={state.error} retry={state.retry} />;
  if (state.data.data.length === 0) return <p>You have no enrollments this term.</p>;

  return (
    <section aria-labelledby="enrollments-title">
      <h3 id="enrollments-title">My enrollments</h3>
      <p>Term {CURRENT_TERM}</p>
      <table aria-label="My enrollments">
        <thead>
          <tr>
            <th scope="col">Subject</th>
            <th scope="col">Group</th>
            <th scope="col">Schedule</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {state.data.data.map((e) => (
            <tr key={e.id}>
              <td>
                {e.subjectCode} {e.subjectName}
              </td>
              <td>Group {e.groupNumber}</td>
              <td>{formatSlots(e.slots)}</td>
              <td>
                {STATUS_TEXT[e.status]}
                {e.status === "REJECTED" && e.rejectionReason ? ` - ${REASON_TEXT[e.rejectionReason]}` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
