import { format } from 'date-fns';

interface Row {
  student: {
    id: string;
    name: string;
    studentId?: string;
    enrolledCourses?: string[];
  };
  course?: {
    id: string;
    name: string;
    code: string;
  };
  stats: {
    total: number;
    present: number;
    absent: number;
    late: number;
    percentage: string;
  };
}

interface ReportTemplateProps {
  rows: Row[];
  visibleCourses: { id: string; name: string; code: string }[];
  filterCourse: string;
  startDate: string;
  endDate: string;
  generatedBy: string;
  role: string;
  allAttendance: any[];
}

export function ReportTemplate({
  rows,
  visibleCourses,
  filterCourse,
  startDate,
  endDate,
  generatedBy,
  role,
}: ReportTemplateProps) {
  const courseLabel =
    filterCourse === 'all'
      ? 'All Courses'
      : visibleCourses.find(c => c.id === filterCourse)?.name ?? filterCourse;

  const dateRange =
    startDate && endDate
      ? `${startDate} → ${endDate}`
      : startDate
      ? `From ${startDate}`
      : endDate
      ? `Until ${endDate}`
      : 'All dates';

  const now = format(new Date(), 'dd MMM yyyy, HH:mm');

  return (
    <div style={{ fontFamily: 'Georgia, serif', color: '#111', background: '#fff', padding: '0' }}>

      {/* Header */}
      <div style={{ borderBottom: '2px solid #1e3a5f', paddingBottom: 12, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#1e3a5f', letterSpacing: 1 }}>
              HEADCOUNT
            </div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 2, letterSpacing: 0.5 }}>
              National University of Lesotho — Attendance Management System
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 10, color: '#666' }}>
            <div>Generated: {now}</div>
            <div>By: {generatedBy} ({role})</div>
          </div>
        </div>
      </div>

      {/* Report meta */}
      <div style={{
        display: 'flex', gap: 32, marginBottom: 16,
        fontSize: 11, color: '#444',
        background: '#f5f7fa', padding: '8px 12px', borderRadius: 4,
      }}>
        <div><strong>Course:</strong> {courseLabel}</div>
        <div><strong>Period:</strong> {dateRange}</div>
        <div><strong>Records:</strong> {rows.length}</div>
      </div>

      {/* Table */}
      <table style={{
        width: '100%', borderCollapse: 'collapse',
        fontSize: 11, tableLayout: 'fixed',
      }}>
        <thead>
          <tr style={{ background: '#1e3a5f', color: '#fff' }}>
            <th style={th({ width: '11%' })}>Student ID</th>
            <th style={th({ width: '20%', textAlign: 'left' })}>Name</th>
            <th style={th({ width: '24%', textAlign: 'left' })}>Course</th>
            <th style={th({ width: '9%' })}>Total</th>
            <th style={th({ width: '9%' })}>Present</th>
            <th style={th({ width: '9%' })}>Absent</th>
            <th style={th({ width: '9%' })}>Late</th>
            <th style={th({ width: '9%' })}>Rate</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ textAlign: 'center', padding: '20px 0', color: '#888', fontSize: 12 }}>
                No attendance records found for the selected filters.
              </td>
            </tr>
          ) : rows.map(({ student, course, stats }, i) => {
            const pct = parseFloat(stats.percentage);
            const rateColor =
              pct >= 75 ? '#166534' :
              pct >= 50 ? '#854d0e' : '#991b1b';
            const rateBg =
              pct >= 75 ? '#dcfce7' :
              pct >= 50 ? '#fef9c3' : '#fee2e2';

            return (
              <tr key={`${student.id}-${course?.id ?? i}`}
                style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc' }}>
                <td style={td({ textAlign: 'center', fontFamily: 'monospace', fontSize: 10 })}>
                  {student.studentId ?? student.id.slice(0, 8)}
                </td>
                <td style={td({ textAlign: 'left' })}>{student.name}</td>
                <td style={td({ textAlign: 'left' })}>
                  {course ? `${course.name} (${course.code})` : 'N/A'}
                </td>
                <td style={td({ textAlign: 'center' })}>{stats.total}</td>
                <td style={td({ textAlign: 'center', color: '#166534', fontWeight: 600 })}>{stats.present}</td>
                <td style={td({ textAlign: 'center', color: '#991b1b', fontWeight: 600 })}>{stats.absent}</td>
                <td style={td({ textAlign: 'center', color: '#854d0e', fontWeight: 600 })}>{stats.late}</td>
                <td style={td({ textAlign: 'center' })}>
                  <span style={{
                    background: rateBg, color: rateColor,
                    padding: '1px 6px', borderRadius: 10,
                    fontWeight: 700, fontSize: 10,
                  }}>
                    {stats.percentage}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Summary row */}
      {rows.length > 0 && (() => {
        const totalPresent = rows.reduce((s, r) => s + r.stats.present, 0);
        const totalAbsent  = rows.reduce((s, r) => s + r.stats.absent,  0);
        const totalLate    = rows.reduce((s, r) => s + r.stats.late,    0);
        const totalAll     = rows.reduce((s, r) => s + r.stats.total,   0);
        const avgPct       = totalAll > 0
          ? (((totalPresent + totalLate * 0.5) / totalAll) * 100).toFixed(1)
          : '0';
        return (
          <div style={{
            marginTop: 10, display: 'flex', gap: 24,
            fontSize: 11, color: '#444',
            borderTop: '1.5px solid #1e3a5f', paddingTop: 8,
          }}>
            <span><strong>Total records:</strong> {totalAll}</span>
            <span style={{ color: '#166534' }}><strong>Present:</strong> {totalPresent}</span>
            <span style={{ color: '#991b1b' }}><strong>Absent:</strong> {totalAbsent}</span>
            <span style={{ color: '#854d0e' }}><strong>Late:</strong> {totalLate}</span>
            <span><strong>Avg rate:</strong> {avgPct}%</span>
          </div>
        );
      })()}

      {/* Footer */}
      <div style={{
        marginTop: 20, paddingTop: 8,
        borderTop: '1px solid #ddd',
        fontSize: 9, color: '#999', textAlign: 'center',
      }}>
        NUL HEADCOUNT · Attendance Management System · Confidential
      </div>
    </div>
  );
}

// ── Style helpers ────────────────────────────────────────────
function th(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    padding: '7px 8px',
    textAlign: 'center',
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: 0.3,
    borderRight: '1px solid rgba(255,255,255,0.15)',
    ...extra,
  };
}

function td(extra: React.CSSProperties = {}): React.CSSProperties {
  return {
    padding: '6px 8px',
    borderBottom: '1px solid #e5e7eb',
    fontSize: 11,
    ...extra,
  };
}
