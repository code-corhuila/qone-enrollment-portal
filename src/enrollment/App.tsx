import { NavLink, Navigate, Route, Routes } from "react-router";
import { RosterPage } from "./pages/professor/RosterPage";
import { CertificatesPage } from "./pages/student/CertificatesPage";
import { EnrollPage } from "./pages/student/EnrollPage";
import { MyEnrollmentsPage } from "./pages/student/MyEnrollmentsPage";
import { PensumPage } from "./pages/student/PensumPage";
import { SchedulePage } from "./pages/student/SchedulePage";
import { useMountBase } from "./hooks/useMountBase";

// The module the shell mounts at /enrollment/* (exposed as ./App). Routes are relative to that
// mount: the student's pensum, enrollments and schedule (HU-ENR-001, HU-WEB-001). The enroll
// flow (HU-ENR-002), the certificates (HU-CER-001) and the roster (HU-WEB-002) are added on
// top of this file. The tabs are NavLinks: the current one carries aria-current and the shell's
// design system draws it as the active tab.
export function App() {
  const base = useMountBase();
  return (
    <section aria-labelledby="enrollment-title">
      <h2 id="enrollment-title">Enrollment</h2>
      <nav aria-label="Enrollment">
        <NavLink to={`${base}/pensum`}>Pensum</NavLink> <NavLink to={`${base}/enrollments`}>My enrollments</NavLink>{" "}
        <NavLink to={`${base}/schedule`}>Schedule</NavLink> <NavLink to={`${base}/certificates`}>Certificates</NavLink>
      </nav>
      <Routes>
        {/* The index redirects so every page has its own route segment and relative links resolve under the mount. */}
        <Route index element={<Navigate to="pensum" replace />} />
        <Route path="pensum" element={<PensumPage />} />
        <Route path="enrollments" element={<MyEnrollmentsPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="enroll/:code" element={<EnrollPage />} />
        <Route path="certificates" element={<CertificatesPage />} />
        <Route path="sections/:sectionId/roster" element={<RosterPage />} />
      </Routes>
    </section>
  );
}

export default App;
