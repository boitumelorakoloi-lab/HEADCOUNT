// ... (imports and interfaces remain the same)

// ── Enrollment ────────────────────────────────────────────────

const enrollStudentInCourse = useCallback(async (studentId: string, courseId: string): Promise<boolean> => {
  try {
    // 1. Backend Call: Updated to match the standard enrollment route
    await apiFetch(`/users/${studentId}/enroll`, {
      method: "POST",
      body: JSON.stringify({ courseId }),
    });

    // 2. Local State Update: Update the users array immediately
    setUsers(prev => prev.map(u =>
      u.id === studentId
        ? { ...u, enrolledCourses: [...new Set([...(u.enrolledCourses ?? []), courseId])] }
        : u
    ));

    // 3. Auth Sync: If the current logged-in user is the one being enrolled, sync AuthContext
    if (authUser?.id === studentId) {
      updateCurrentUser({ 
        enrolledCourses: [...new Set([...(authUser.enrolledCourses ?? []), courseId])] 
      });
    }

    // 4. Logging and Course Meta
    const student = users.find(u => u.id === studentId);
    const course = courses.find(c => c.id === courseId);
    
    await writeLog(
      "student_status", 
      "Course Enrolled", 
      `${student?.name ?? studentId} enrolled in ${course?.name ?? courseId}`, 
      "info"
    );

    return true;
  } catch (err) {
    console.error("Enrollment failed:", err);
    return false; 
  }
}, [apiFetch, authUser, updateCurrentUser, users, courses, writeLog]);

const unenrollStudentFromCourse = useCallback(async (studentId: string, courseId: string) => {
  try {
    // 1. Backend Call: DELETE request for the specific enrollment
    await apiFetch(`/users/${studentId}/enroll/${courseId}`, { 
      method: "DELETE" 
    });

    // 2. Local State Update
    setUsers(prev => prev.map(u =>
      u.id === studentId
        ? { ...u, enrolledCourses: (u.enrolledCourses ?? []).filter(id => id !== courseId) }
        : u
    ));

    // 3. Auth Sync
    if (authUser?.id === studentId) {
      updateCurrentUser({ 
        enrolledCourses: (authUser.enrolledCourses ?? []).filter(id => id !== courseId) 
      });
    }

    const student = users.find(u => u.id === studentId);
    const course = courses.find(c => c.id === courseId);
    
    await writeLog(
      "student_status", 
      "Course Unenrolled", 
      `${student?.name ?? studentId} unenrolled from ${course?.name ?? courseId}`, 
      "warning"
    );
  } catch (err) {
    console.error("Unenrollment failed:", err);
  }
}, [apiFetch, authUser, updateCurrentUser, users, courses, writeLog]);

// ... (rest of the file remains the same)
