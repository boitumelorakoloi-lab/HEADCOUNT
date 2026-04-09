import { ReportTemplate } from '../components/ReportTemplate';
import { useState, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useLog } from '../contexts/LogContext';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import { Download, BookOpen, TrendingUp, Eye, X, Printer } from 'lucide-react';
import { format } from 'date-fns';
export function ReportsPage() {
  const { user }                       = useAuth();
  const { courses, users, attendance } = useData();
  const { log }                        = useLog();

  const [filterCourse,  setFilterCourse]  = useState<string>('all');
  const [filterStudent, setFilterStudent] = useState<string>('all');
  const [startDate,     setStartDate]     = useState<string>('');
  const [endDate,       setEndDate]       = useState<string>('');
  const [previewing,    setPreviewing]    = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  const isLecturer = user?.role === 'lecturer';
  const isStudent  = user?.role === 'student';

  const visibleCourses = useMemo(() => {
    if (isLecturer) return courses.filter(c => (user.assignedCourses ?? []).includes(c.id));
    return courses;
  }, [courses, user, isLecturer]);

  const visibleStudents = useMemo(() => {
    const all = users.filter(u => u.role === 'student');
    if (isStudent)  return all.filter(s => s.id === user.id);
    if (isLecturer) {
      const ids = new Set(visibleCourses.map(c => c.id));
      return all.filter(s => (s.enrolledCourses ?? []).some(id => ids.has(id)));
    }
    return all;
  }, [users, user, isLecturer, isStudent, visibleCourses]);

  const courseStudents = useMemo(() =>
    filterCourse !== 'all'
      ? visibleStudents.filter(s => (s.enrolledCourses ?? []).includes(filterCourse))
      : visibleStudents,
    [visibleStudents, filterCourse]
  );

  const studentsToShow = useMemo(() => {
    if (isStudent) return visibleStudents;
    if (filterStudent !== 'all') return courseStudents.filter(s => s.id === filterStudent);
    return courseStudents;
  }, [isStudent, visibleStudents, filterStudent, courseStudents]);

  const getStudentStats = (studentId: string, courseId: string) => {
    const records = attendance.filter(a => {
      if (a.studentId !== studentId) return false;
      if (courseId !== 'all' && a.courseId !== courseId) return false;
      if (startDate && a.date < startDate) return false;
      if (endDate   && a.date > endDate)   return false;
      return true;
    });
    const total      = records.length;
    const present    = records.filter(r => r.status === 'present').length;
    const absent     = records.filter(r => r.status === 'absent').length;
    const late       = records.filter(r => r.status === 'late').length;
    const percentage = total > 0
      ? (((present + late * 0.5) / total) * 100).toFixed(1)
      : '0';
    return { total, present, absent, late, percentage };
  };

  const rows = useMemo(() =>
    studentsToShow.flatMap(student => {
      const enrolled = filterCourse !== 'all'
        ? [filterCourse]
        : (student.enrolledCourses ?? []).filter(id => visibleCourses.some(c => c.id === id));
      return enrolled.map(courseId => ({
        student,
        course: courses.find(c => c.id === courseId),
        stats:  getStudentStats(student.id, courseId),
      }));
    }),
    [studentsToShow, filterCourse, visibleCourses, attendance, startDate, endDate]
  );

  const courseSummaries = useMemo(() => {
    if (!isLecturer) return [];
    return visibleCourses.map(course => {
      const enrolled = visibleStudents.filter(s => (s.enrolledCourses ?? []).includes(course.id));
      const records  = attendance.filter(a => a.courseId === course.id);
      const present  = records.filter(r => r.status === 'present').length;
      const late     = records.filter(r => r.status === 'late').length;
      const total    = records.length;
      const avgPct   = total > 0 ? Math.round(((present + late * 0.5) / total) * 100) : 0;
      return { course, enrolled: enrolled.length, total, present, late, avgPct };
    });
  }, [isLecturer, visibleCourses, visibleStudents, attendance]);

  const handlePrint = () => {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const win     = window.open('', '_blank', 'width=960,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
  <head>
    <title>Attendance Report — NUL HEADCOUNT</title>
    <style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { background: #fff; }
      @media print {
        @page { margin: 12mm 14mm; size: A4 landscape; }
      }
    </style>
  </head>
  <body>${content}<script>window.onload=()=>{window.print();window.close();}<\/script></body>
</html>`);
    win.document.close();
    log('data_export', 'Report printed/downloaded', `PDF report by ${user?.name}`, 'info');
  };

  const handleExportCSV = () => {
    const csv = [
      ['Student ID', 'Name', 'Course', 'Total', 'Present', 'Absent', 'Late', 'Attendance %'].join(','),
      ...rows.map(({ student, course, stats }) =>
        [student.studentId ?? student.id, student.name, course?.name ?? 'N/A',
         stats.total, stats.present, stats.absent, stats.late, `${stats.percentage}%`].join(',')
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `attendance-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    log('data_export', 'CSV exported', `CSV by ${user?.name}`, 'info');
  };

  return (
    <div className="p-4 sm:p-8">

      {/* ── Header ── */}
      <div className="mb-6">
        <div className="mb-4">
          <h1 className="text-2xl sm:text-3xl mb-1 dark:text-white">Attendance Reports</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">View, preview and export attendance data.</p>
        </div>
        {/* Action buttons — stack on mobile, row on sm+ */}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline"
            className="gap-2 text-sm dark:border-gray-700 dark:text-gray-300 flex-1 sm:flex-none"
            onClick={() => setPreviewing(true)}>
            <Eye className="w-4 h-4" /> Preview
          </Button>
          <Button type="button" onClick={handlePrint}
            className="gap-2 text-sm flex-1 sm:flex-none"
            style={{ backgroundColor: 'var(--theme-primary)' }}>
            <Printer className="w-4 h-4" /> Print / PDF
          </Button>
          <Button type="button" variant="outline" onClick={handleExportCSV}
            className="gap-2 text-sm dark:border-gray-700 dark:text-gray-300 flex-1 sm:flex-none">
            <Download className="w-4 h-4" /> CSV
          </Button>
        </div>
      </div>

      {/* ── Lecturer course summaries ── */}
      {isLecturer && courseSummaries.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold text-gray-800 dark:text-white mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Course Summaries
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {courseSummaries.map(({ course, enrolled, total, present, late, avgPct }) => (
              <Card key={course.id}
                className="hover:shadow-md transition-shadow cursor-pointer dark:bg-gray-900 dark:border-gray-800"
                onClick={() => { setFilterCourse(course.id); setFilterStudent('all'); }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800 dark:text-white truncate">{course.name}</p>
                      <p className="text-xs text-gray-400">{course.code}</p>
                    </div>
                    <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ml-2 ${
                      avgPct >= 75 ? 'bg-green-100 text-green-700' :
                      avgPct >= 50 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                    }`}>{avgPct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 mb-2">
                    <div className={`h-1.5 rounded-full ${avgPct >= 75 ? 'bg-green-500' : avgPct >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                      style={{ width: `${avgPct}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>{enrolled} students</span>
                    <span>{present}P · {late}L · {total} records</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Filters ── */}
      {!isStudent && (
        <Card className="mb-6 dark:bg-gray-900 dark:border-gray-800">
          <CardHeader className="pb-3">
            <CardTitle className="dark:text-white flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4" /> Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* 1 col on mobile, 2 on sm, 4 on lg */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs dark:text-gray-300">Course</Label>
                <Select value={filterCourse} onValueChange={v => { setFilterCourse(v); setFilterStudent('all'); }}>
                  <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {visibleCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs dark:text-gray-300">Student</Label>
                <Select value={filterStudent} onValueChange={setFilterStudent}>
                  <SelectTrigger className="dark:bg-gray-800 dark:border-gray-700 dark:text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Students</SelectItem>
                    {courseStudents.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs dark:text-gray-300">Start Date</Label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs dark:text-gray-300">End Date</Label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Data table ── */}
      <Card className="dark:bg-gray-900 dark:border-gray-800">
        <CardHeader className="pb-3">
          <CardTitle className="dark:text-white text-base">Attendance Summary</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* overflow-x-auto ensures table scrolls horizontally on mobile */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Student ID</TableHead>
                  <TableHead className="whitespace-nowrap">Name</TableHead>
                  <TableHead className="whitespace-nowrap">Course</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Total</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Present</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Absent</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Late</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-gray-500 dark:text-gray-400 py-10 text-sm">
                      No attendance records found.
                    </TableCell>
                  </TableRow>
                ) : rows.map(({ student, course, stats }, i) => {
                  const pct = parseFloat(stats.percentage);
                  return (
                    <TableRow key={`${student.id}-${course?.id ?? i}`}>
                      <TableCell className="font-mono text-xs dark:text-gray-300 whitespace-nowrap">
                        {student.studentId ?? student.id}
                      </TableCell>
                      <TableCell className="font-medium text-sm dark:text-gray-300 whitespace-nowrap">
                        {student.name}
                      </TableCell>
                      <TableCell className="text-sm dark:text-gray-300 max-w-[140px] truncate">
                        {course?.name ?? 'N/A'}
                      </TableCell>
                      <TableCell className="text-center text-sm dark:text-gray-300">{stats.total}</TableCell>
                      <TableCell className="text-center text-sm text-green-600 font-medium">{stats.present}</TableCell>
                      <TableCell className="text-center text-sm text-red-600 font-medium">{stats.absent}</TableCell>
                      <TableCell className="text-center text-sm text-yellow-600 font-medium">{stats.late}</TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                          pct >= 75  ? 'bg-green-100 text-green-700'   :
                          pct >= 50  ? 'bg-yellow-100 text-yellow-700' :
                                       'bg-red-100 text-red-700'
                        }`}>{stats.percentage}%</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Hidden print target */}
      <div ref={printRef} style={{ display: 'none' }}>
        <ReportTemplate
          rows={rows}
          visibleCourses={visibleCourses}
          filterCourse={filterCourse}
          startDate={startDate}
          endDate={endDate}
          generatedBy={user?.name ?? 'Unknown'}
          role={user?.role ?? ''}
          allAttendance={attendance}
        />
      </div>

      {/* ── Preview modal ── */}
      {previewing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-auto py-4 px-2 sm:py-8 sm:px-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl">
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900 text-sm sm:text-base">Report Preview</h2>
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={handlePrint}
                  className="gap-1.5 text-xs sm:text-sm"
                  style={{ backgroundColor: 'var(--theme-primary)' }}>
                  <Printer className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Print / Save PDF</span>
                  <span className="sm:hidden">Print</span>
                </Button>
                <button type="button" onClick={() => setPreviewing(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
            {/* Scrollable preview area — works on mobile */}
            <div className="p-3 sm:p-8 overflow-auto max-h-[80vh] bg-gray-100">
              <div className="overflow-x-auto">
                <div style={{
                  background: '#fff',
                  boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                  borderRadius: 4,
                  padding: '16px',
                  minWidth: '640px',
                }}>
                  <ReportTemplate
                    rows={rows}
                    visibleCourses={visibleCourses}
                    filterCourse={filterCourse}
                    startDate={startDate}
                    endDate={endDate}
                    generatedBy={user?.name ?? 'Unknown'}
                    role={user?.role ?? ''}
                    allAttendance={attendance}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
