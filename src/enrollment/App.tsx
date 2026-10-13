import { Link, Navigate, Route, Routes } from "react-router";
import { EnrollPage } from "./pages/student/EnrollPage";
import { MyEnrollmentsPage } from "./pages/student/MyEnrollmentsPage";
import { PensumPage } from "./pages/student/PensumPage";
import { SchedulePage } from "./pages/student/SchedulePage";
import { useMountBase } from "./hooks/useMountBase";

// The module the shell mounts at /enrollment/* (exposed as ./App). Routes are relative to that
// mount: the student's pensum, enrollments and schedule (HU-ENR-001, HU-WEB-001). The enroll
// flow (HU-ENR-002), the certificates (HU-CER-001) and the roster (HU-WEB-002) are added on
// top of this file.
export function App() {
  const base = useMountBase();
  return (
    <section aria-labelledby="enrollment-title">
      <h2 id="enrollment-title">Enrollment</h2>
      <nav aria-label="Enrollment">
        <Link to={`${base}/pensum`}>Pensum</Link> <Link to={`${base}/enrollments`}>My enrollments</Link> <Link to={`${base}/schedule`}>Schedule</Link>
      </nav>
      <Routes>
        {/* The index redirects so every page has its own route segment and relative links resolve under the mount. */}
        <Route index element={<Navigate to="pensum" replace />} />
        <Route path="pensum" element={<PensumPage />} />
        <Route path="enrollments" element={<MyEnrollmentsPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="enroll/:code" element={<EnrollPage />} />
      </Routes>
    </section>
  );
}

export default App;
