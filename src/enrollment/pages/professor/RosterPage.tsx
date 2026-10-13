import { useParams } from "react-router";
import { catalogApi } from "../../api/catalogApi";
import { enrollmentApi } from "../../api/enrollmentApi";
import { RequireRole } from "../../components/RequireRole";
import { RequestFailure } from "../../components/RequestFailure";
import { useRequest } from "../../hooks/useRequest";
import { formatSlots } from "../../model/enrollment";

// HU-WEB-002: the roster of a section (EN-10) for a professor or an admin, reached from
// "My sections" of the catalog portal. The section itself comes from catalog (CA-08) so the
// heading, the schedule and the seats are shown; the two requests keep their own state.
export function RosterPage() {
  return (
    <RequireRole roles={["PROFESSOR", "ADMIN"]}>
      <Roster />
    </RequireRole>
  );
}

function Roster() {
  const { sectionId = "" } = useParams();
  const section = useRequest((signal) => catalogApi.getSection(sectionId, signal), [sectionId]);
  const roster = useRequest((signal) => enrollmentApi.roster(sectionId, { limit: 100 }, signal), [sectionId]);

  return (
    <section aria-labelledby="roster-title">
      {section.status === "loading" ? <p role="status">Loading the roster...</p> : null}
      {section.status === "error" ? <RequestFailure error={section.error} retry={section.retry} /> : null}
      {section.status === "data" ? (
        <>
          <h3 id="roster-title">
            {section.data.subjectCode} {section.data.subjectName}, group {section.data.groupNumber}
          </h3>
          <p>
            {section.data.professorName}, {formatSlots(section.data.slots)}
          </p>
          {roster.status === "data" ? (
            <p>
              {roster.data.meta.total} students confirmed, {section.data.seatsAvailable} seats left of {section.data.capacity}
            </p>
          ) : null}
        </>
      ) : null}

      {section.status === "data" && roster.status === "loading" ? <p role="status">Loading the students...</p> : null}
      {roster.status === "error" ? <RequestFailure error={roster.error} retry={roster.retry} /> : null}
      {roster.status === "data" && roster.data.data.length === 0 ? <p>No student has confirmed this section yet.</p> : null}
      {roster.status === "data" && roster.data.data.length > 0 ? (
        <table aria-label="Roster">
          <thead>
            <tr>
              <th scope="col">Student</th>
              <th scope="col">Enrolled on</th>
            </tr>
          </thead>
          <tbody>
            {roster.data.data.map((r) => (
              <tr key={r.enrollmentId}>
                <td>{r.studentName}</td>
                <td>{r.enrolledAt.slice(0, 10)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
