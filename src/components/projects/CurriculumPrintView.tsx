interface CurriculumPrintViewProps {
  projects: any[];
  lessonsByProject: Record<string, any[]>;
  trackName: string;
}

/**
 * Fully-expanded, print-only rendering of the curricula for the selected track.
 * Hidden on screen; shown only when printing / saving as PDF.
 */
export function CurriculumPrintView({ projects, lessonsByProject, trackName }: CurriculumPrintViewProps) {
  const ordered = [...projects].sort((a, b) => (a.week_number ?? 999) - (b.week_number ?? 999));

  return (
    <div className="print-doc">
      <div className="print-doc-header">
        <h1>Curriculum — {trackName}</h1>
        <p>
          {ordered.length} {ordered.length === 1 ? 'entry' : 'entries'} · Generated{' '}
          {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {ordered.map((p) => {
        const lessons = lessonsByProject[p.id] || [];
        return (
          <section key={p.id} className="print-week">
            <h2>
              {p.week_number != null ? `Week ${p.week_number}: ` : ''}
              {p.title}
            </h2>
            <p className="print-meta">
              {p.tracks?.name}
              {p.project_type ? ` · ${p.project_type}` : ''}
            </p>

            {p.objectives && (
              <div className="print-block">
                <h3>Learning Objectives</h3>
                <p>{p.objectives}</p>
              </div>
            )}

            {p.description && (
              <div className="print-block">
                <h3>Tasks</h3>
                <p>{p.description}</p>
              </div>
            )}

            {p.deliverables && (
              <div className="print-block">
                <h3>Deliverables</h3>
                <p>{p.deliverables}</p>
              </div>
            )}

            {p.tools_technologies && (
              <div className="print-block">
                <h3>Tools &amp; Technologies</h3>
                <p>{p.tools_technologies}</p>
              </div>
            )}

            <div className="print-block">
              <h3>Lessons</h3>
              {lessons.length === 0 ? (
                <p>No lessons added.</p>
              ) : (
                <ul>
                  {lessons.map((l) => (
                    <li key={l.id}>
                      <strong>{l.title}</strong>
                      {l.lesson_type ? ` (${l.lesson_type})` : ''}
                      {l.description ? ` — ${l.description}` : ''}
                      {l.external_url ? ` — ${l.external_url}` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
