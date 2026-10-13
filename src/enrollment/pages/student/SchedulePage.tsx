import { enrollmentApi } from "../../api/enrollmentApi";
import { RequireRole } from "../../components/RequireRole";
import { RequestFailure } from "../../components/RequestFailure";
import { useRequest } from "../../hooks/useRequest";
import { CURRENT_TERM, type Day, type ScheduleItem } from "../../model/enrollment";

const DAYS: readonly Day[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT"];

// HU-WEB-001: the weekly schedule - the confirmed classes of the term by day (EN-09), each
// day's blocks ordered by start time. Four states (Annex H).
export function SchedulePage() {
  return (
    <RequireRole roles={["STUDENT"]}>
      <Schedule />
    </RequireRole>
  );
}

interface Block {
  start: string;
  end: string;
  item: ScheduleItem;
}

function blocksByDay(items: readonly ScheduleItem[]): Record<Day, Block[]> {
  const week = Object.fromEntries(DAYS.map((d) => [d, [] as Block[]])) as Record<Day, Block[]>;
  for (const item of items) for (const slot of item.slots) week[slot.day].push({ start: slot.start, end: slot.end, item });
  for (const day of DAYS) week[day].sort((a, b) => a.start.localeCompare(b.start));
  return week;
}

function Schedule() {
  const state = useRequest((signal) => enrollmentApi.mySchedule({ term: CURRENT_TERM, limit: 50 }, signal), []);
  if (state.status === "loading") return <p role="status">Loading your schedule...</p>;
  if (state.status === "error") return <RequestFailure error={state.error} retry={state.retry} />;
  const items = state.data.data;
  if (items.length === 0) return <p>You have no confirmed classes this term.</p>;
  const week = blocksByDay(items);

  return (
    <section aria-labelledby="schedule-title">
      <h3 id="schedule-title">My schedule</h3>
      <p>{items.length} classes this term</p>
      <table aria-label="Weekly schedule">
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Classes</th>
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day) => (
            <tr key={day}>
              <th scope="row">{day}</th>
              <td>
                {week[day].length === 0 ? (
                  "No classes"
                ) : (
                  <ul>
                    {week[day].map((b) => (
                      <li key={`${b.item.enrollmentId}-${b.start}`}>
                        {b.start}-{b.end} {b.item.subjectCode} {b.item.subjectName} (group {b.item.groupNumber})
                      </li>
                    ))}
                  </ul>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
