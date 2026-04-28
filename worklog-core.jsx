// Daily-feed view — vertical timeline, day rows, project chips, quick-add dialog
const WorklogCore = (() => {
  const { useState, useMemo } = React;
  const U = window.WorklogUtils;
  const S = window.WorklogShared;
  const { TODAY } = window.WorklogData;
  const { Glyph, EntryDialog } = S;

  function App({ p, scale, density, groupByProject, headerSubtitle, projects, allProjects, entries, setProjects, setEntries }) {
    const [filter, setFilter] = useState(null);
    const [dialog, setDialog] = useState(null); // null | {mode:'add', date} | {mode:'edit', entry}
    const [hovered, setHovered] = useState(null);

    S.useEntryDialogShortcut(setDialog, () => ({ mode: 'add', date: U.fmtDate(TODAY) }));

    const visible = useMemo(
      () => filter ? entries.filter(e => e.project === filter) : entries,
      [entries, filter]
    );
    const dates = useMemo(() => U.buildDateRange(visible, TODAY), [visible]);
    const byDate = useMemo(() => U.groupByDate(visible), [visible]);

    const rowGap = density === 'airy' ? 48 : density === 'dense' ? 14 : 26;
    const dayPad = density === 'airy' ? 24 : density === 'dense' ? 10 : 16;
    const compactDays = false;
    const collapseEmpty = scale !== 'day';
    const groupByWeek = scale === 'week';

    const resolveProject = (rawName) => {
      return S.resolveProjectName(rawName, { projects, allProjects, setProjects });
    };

    const handleAdd = (date, payload) => {
      const id = 'e' + Date.now();
      const projectId = resolveProject(payload.project);
      setEntries(es => [...es, { id, date: payload.date || date, type: payload.type, project: projectId, text: payload.text }]);
      setDialog(null);
    };

    const handleUpdate = (id, payload) => {
      const projectId = resolveProject(payload.project);
      setEntries(es => es.map(e => e.id === id ? { ...e, date: payload.date, type: payload.type, text: payload.text, project: projectId } : e));
      setDialog(null);
    };

    const handleDelete = (id) => {
      setEntries(es => es.filter(e => e.id !== id));
      setDialog(null);
    };

    const cn = (suffix) => `${p}-${suffix}`;

    return (
      <div className={cn('root')} style={{ '--row-gap': rowGap + 'px', '--day-pad': dayPad + 'px' }}>
        <header className={cn('header')}>
          <div className={cn('title')}>
            <h1>Worklog</h1>
            <div className={cn('sub')}>{headerSubtitle}</div>
          </div>
          <div className={cn('controls')}>
            <button className={cn('btn')} onClick={() => setDialog({ mode: 'add', date: U.fmtDate(TODAY) })}>
              <span className={cn('kbd')}>/</span> New entry
            </button>
          </div>
        </header>

        <div className={cn('filterbar')}>
          <button
            className={`${cn('chip')} ${filter === null ? 'is-active' : ''}`}
            onClick={() => setFilter(null)}
          >All projects</button>
          {projects.map(proj => (
            <button
              key={proj.id}
              className={`${cn('chip')} ${filter === proj.id ? 'is-active' : ''}`}
              onClick={() => setFilter(filter === proj.id ? null : proj.id)}
              style={{ '--proj': proj.color }}
            >
              <span className={cn('chip-dot')} />
              {proj.name}
            </button>
          ))}
        </div>

        <div className={cn('legend')}>
          <span><Glyph type="info" /> note</span>
          <span><Glyph type="issue" /> issue</span>
          <span><Glyph type="milestone" /> milestone</span>
        </div>

        <main className={cn('feed')}>
          {(() => {
            const out = [];
            let lastMonth = -1;

            if (groupByWeek) {
              const weeks = U.groupByWeek(dates);
              weeks.forEach((w) => {
                const weekEntries = w.dates
                  .flatMap(ds => byDate.get(ds) || [])
                  .sort((a, b) => b.date.localeCompare(a.date));
                if (weekEntries.length === 0) return;

                const m = w.monday.getMonth();
                if (m !== lastMonth) {
                  lastMonth = m;
                  out.push(
                    <div key={'m' + w.key} className={cn('month')}>
                      <span className={cn('month-label')}>{U.monthName(m)}</span>
                      <span className={cn('month-year')}>{w.monday.getFullYear()}</span>
                      <span className={cn('month-rule')} />
                    </div>
                  );
                }

                out.push(
                  <WeekRow
                    key={w.key}
                    p={p}
                    weekKey={w.key}
                    monday={w.monday}
                    entries={weekEntries}
                    projects={projects}
                    groupByProject={groupByProject}
                    compact={compactDays}
                    hovered={hovered}
                    setHovered={setHovered}
                    onAdd={() => setDialog({ mode: 'add', date: U.fmtDate(w.monday) })}
                    onEdit={(entry) => setDialog({ mode: 'edit', entry })}
                  />
                );
              });
              return out;
            }

            let runEmpty = 0;
            dates.forEach((ds) => {
              const d = U.parseDate(ds);
              const m = d.getMonth();
              const dayEntries = byDate.get(ds) || [];

              if (m !== lastMonth) {
                lastMonth = m;
                out.push(
                  <div key={'m'+ds} className={cn('month')}>
                    <span className={cn('month-label')}>{U.monthName(m)}</span>
                    <span className={cn('month-year')}>{d.getFullYear()}</span>
                    <span className={cn('month-rule')} />
                  </div>
                );
              }

              if (collapseEmpty && dayEntries.length === 0) {
                runEmpty++;
                if (runEmpty === 1) out.push(<div key={'gap'+ds} className={cn('gap')} />);
                return;
              }
              runEmpty = 0;

              out.push(
                <DayRow
                  key={ds}
                  p={p}
                  date={ds}
                  entries={dayEntries}
                  projects={projects}
                  groupByProject={groupByProject}
                  compact={compactDays}
                  hovered={hovered}
                  setHovered={setHovered}
                  onAdd={() => setDialog({ mode: 'add', date: ds })}
                  onEdit={(entry) => setDialog({ mode: 'edit', entry })}
                />
              );
            });
            return out;
          })()}
        </main>

        {dialog && (
          <EntryDialog
            p={p}
            mode={dialog.mode}
            date={dialog.mode === 'add' ? dialog.date : dialog.entry.date}
            projectId={null}
            initialEntry={dialog.mode === 'edit' ? dialog.entry : null}
            projects={projects}
            onCancel={() => setDialog(null)}
            onSubmit={(payload) => {
              if (dialog.mode === 'add') handleAdd(dialog.date, payload);
              else handleUpdate(dialog.entry.id, payload);
            }}
            onDelete={dialog.mode === 'edit' ? () => handleDelete(dialog.entry.id) : null}
          />
        )}
      </div>
    );
  }

  function WeekRow({ p, weekKey, monday, entries, projects, groupByProject, compact, hovered, setHovered, onAdd, onEdit }) {
    const cn = (s) => `${p}-${s}`;
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const todayStr = U.fmtDate(TODAY);
    const containsToday = entries.some(e => e.date === todayStr) ||
      (monday <= TODAY && TODAY <= sunday);

    const grouped = groupByProject
      ? entries.reduce((acc, e) => {
          const k = e.project || '__none';
          (acc[k] = acc[k] || []).push(e);
          return acc;
        }, {})
      : null;

    const renderEntry = (e) => {
      const d = U.parseDate(e.date);
      return (
        <div key={e.id} className={cn('week-line')}>
          <div className={cn('week-line-date')}>
            {U.dayShort(d.getDay())} {d.getDate()}
          </div>
          <Entry p={p} entry={e} projects={projects} compact={compact} hovered={hovered} setHovered={setHovered} onEdit={onEdit} />
        </div>
      );
    };

    return (
      <div className={`${cn('day')} is-monday ${containsToday ? 'is-today' : ''} ${entries.length === 0 ? 'is-empty' : ''}`}>
        <div className={cn('day-meta')}>
          <div className={cn('day-num')}>{`${monday.getDate()}–${sunday.getDate()}`}</div>
          <div className={cn('day-dow')}>{U.monthShort(monday.getMonth())}</div>
          {containsToday && <div className={cn('day-rel')}>This week</div>}
        </div>
        <div className={cn('day-body')}>
          {entries.length === 0 && (
            <div className={cn('day-blank')} onClick={onAdd}>+ add an entry</div>
          )}
          {!groupByProject && entries.map(renderEntry)}
          {groupByProject && Object.entries(grouped).map(([pid, es]) => {
            const proj = pid === '__none' ? null : projects.find(pp => pp.id === pid);
            return (
              <div key={pid} className={cn('pgroup')}>
                <div className={cn('pgroup-head')} style={{ '--proj': proj?.color || 'var(--ink-3)' }}>
                  <span className={cn('pgroup-dot')} />
                  {proj ? proj.name : 'No project'}
                </div>
                {es.map(e => {
                  const d = U.parseDate(e.date);
                  return (
                    <div key={e.id} className={cn('week-line')}>
                      <div className={cn('week-line-date')}>
                        {U.dayShort(d.getDay())} {d.getDate()}
                      </div>
                      <Entry p={p} entry={e} projects={projects} compact={compact} hovered={hovered} setHovered={setHovered} onEdit={onEdit} hideProject />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function DayRow({ p, date, entries, projects, groupByProject, compact, hovered, setHovered, onAdd, onEdit }) {
    const cn = (s) => `${p}-${s}`;
    const d = U.parseDate(date);
    const rel = U.relativeLabel(date, TODAY);
    const isToday = U.sameDay(d, TODAY);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const isMonday = d.getDay() === 1;

    const grouped = groupByProject
      ? entries.reduce((acc, e) => {
          const k = e.project || '__none';
          (acc[k] = acc[k] || []).push(e);
          return acc;
        }, {})
      : null;

    return (
      <div className={`${cn('day')} ${isToday ? 'is-today' : ''} ${isWeekend ? 'is-weekend' : ''} ${isMonday ? 'is-monday' : ''} ${entries.length === 0 ? 'is-empty' : ''}`}>
        <div className={cn('day-meta')}>
          <div className={cn('day-num')}>{d.getDate()}</div>
          <div className={cn('day-dow')}>{U.dayShort(d.getDay())}</div>
          {rel && <div className={cn('day-rel')}>{rel}</div>}
        </div>
        <div className={cn('day-body')}>
          {entries.length === 0 && (
            <div className={cn('day-blank')} onClick={onAdd}>+ add an entry</div>
          )}
          {!groupByProject && entries.map(e => (
            <Entry key={e.id} p={p} entry={e} projects={projects} compact={compact} hovered={hovered} setHovered={setHovered} onEdit={onEdit} />
          ))}
          {groupByProject && Object.entries(grouped).map(([pid, es]) => {
            const proj = pid === '__none' ? null : projects.find(pp => pp.id === pid);
            return (
              <div key={pid} className={cn('pgroup')}>
                <div className={cn('pgroup-head')} style={{ '--proj': proj?.color || 'var(--ink-3)' }}>
                  <span className={cn('pgroup-dot')} />
                  {proj ? proj.name : 'No project'}
                </div>
                {es.map(e => (
                  <Entry key={e.id} p={p} entry={e} projects={projects} compact={compact} hovered={hovered} setHovered={setHovered} onEdit={onEdit} hideProject />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function Entry({ p, entry, projects, compact, hovered, setHovered, hideProject, onEdit }) {
    const cn = (s) => `${p}-${s}`;
    const proj = entry.project ? projects.find(pp => pp.id === entry.project) : null;
    const color = proj?.color || 'var(--ink-3)';
    const isHovered = hovered === entry.id;

    return (
      <div
        className={`${cn('entry')} t-${entry.type} ${isHovered ? 'is-hovered' : ''}`}
        onMouseEnter={() => setHovered(entry.id)}
        onMouseLeave={() => setHovered(null)}
        onDoubleClick={() => onEdit && onEdit(entry)}
        title="Double-click to edit"
      >
        <div className={cn('entry-glyph')}>
          <Glyph type={entry.type} color={color} size={compact ? 8 : 11} />
        </div>
        <div className={cn('entry-text')}>
          {entry.text}
          {!hideProject && proj && (
            <span className={cn('entry-proj')} style={{ '--proj': color }}>
              <span className={cn('pdot')} />{proj.name}
            </span>
          )}
          {!hideProject && !proj && (
            <span className={`${cn('entry-proj')} ${cn('entry-proj--none')}`}>—</span>
          )}
        </div>
      </div>
    );
  }

  return App;
})();

window.WorklogCore = WorklogCore;
