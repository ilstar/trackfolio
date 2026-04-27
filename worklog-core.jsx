// Daily-feed view — vertical timeline, day rows, project chips, quick-add dialog
const WorklogCore = (() => {
  const { useState, useMemo, useRef, useEffect } = React;
  const U = window.WorklogUtils;
  const { TODAY } = window.WorklogData;

  const TYPE_LABEL = { info: 'note', issue: 'issue', milestone: 'milestone' };

  function Glyph({ type, color, size = 10 }) {
    const c = color || 'currentColor';
    if (type === 'info') {
      return <svg width={size} height={size} viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.2" fill={c} /></svg>;
    }
    if (type === 'issue') {
      return <svg width={size} height={size} viewBox="0 0 10 10"><polygon points="5,1.5 9,8.5 1,8.5" fill={c} /></svg>;
    }
    return <svg width={size} height={size} viewBox="0 0 10 10"><polygon points="5,1 9,5 5,9 1,5" fill={c} /></svg>;
  }

  function App({ p, scale, density, groupByProject, headerSubtitle, projects, allProjects, entries, setProjects, setEntries }) {
    const [filter, setFilter] = useState(null);
    const [dialog, setDialog] = useState(null); // null | {mode:'add', date} | {mode:'edit', entry}
    const [hovered, setHovered] = useState(null);

    useEffect(() => {
      const onKey = (e) => {
        const tag = document.activeElement?.tagName;
        if (e.key === '/' && !['INPUT','TEXTAREA'].includes(tag)) {
          e.preventDefault();
          setDialog({ mode: 'add', date: U.fmtDate(TODAY) });
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          setDialog({ mode: 'add', date: U.fmtDate(TODAY) });
        } else if (e.key === 'Escape') {
          setDialog(null);
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, []);

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
      if (!rawName) return null;
      const searchProjects = Array.isArray(allProjects) ? allProjects : projects;
      const existing = searchProjects.find(p => p.name.toLowerCase() === rawName.toLowerCase());
      if (existing) {
        if (existing.hidden) {
          setProjects(ps => ps.map(p => p.id === existing.id ? { ...p, hidden: false } : p));
        }
        return existing.id;
      }
      const newP = {
        id: 'p' + Date.now(),
        name: rawName,
        color: `oklch(0.62 0.14 ${Math.floor(Math.random()*360)})`,
      };
      setProjects(ps => [...ps, newP]);
      return newP.id;
    };

    const handleAdd = (date, payload) => {
      const id = 'e' + Date.now();
      const projectId = resolveProject(payload.project);
      setEntries(es => [...es, { id, date, type: payload.type, project: projectId, text: payload.text }]);
      setDialog(null);
    };

    const handleUpdate = (id, payload) => {
      const projectId = resolveProject(payload.project);
      setEntries(es => es.map(e => e.id === id ? { ...e, type: payload.type, text: payload.text, project: projectId } : e));
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

  function EntryDialog({ p, mode, date, initialEntry, projects, onCancel, onSubmit, onDelete }) {
    const cn = (s) => `${p}-${s}`;
    const [type, setType] = useState(initialEntry?.type || 'info');
    const [text, setText] = useState(initialEntry?.text || '');
    const [project, setProject] = useState(() => {
      if (!initialEntry?.project) return '';
      return projects.find(pr => pr.id === initialEntry.project)?.name || '';
    });
    const [showSugg, setShowSugg] = useState(false);
    const [selectedIdx, setSelectedIdx] = useState(-1);
    const inputRef = useRef(null);
    useEffect(() => { inputRef.current?.focus(); inputRef.current?.select?.(); }, []);

    const suggestions = useMemo(() => {
      if (!project) return projects.slice(0, 5);
      const q = project.toLowerCase();
      return projects.filter(pr => pr.name.toLowerCase().includes(q)).slice(0, 5);
    }, [project, projects]);

    const showCreate = project && !projects.find(pr => pr.name.toLowerCase() === project.toLowerCase());
    const optionCount = suggestions.length + (showCreate ? 1 : 0);

    useEffect(() => { setSelectedIdx(-1); }, [project]);

    const pickOption = (idx) => {
      if (idx < 0 || idx >= optionCount) return;
      if (idx < suggestions.length) {
        setProject(suggestions[idx].name);
      }
      setShowSugg(false);
      setSelectedIdx(-1);
    };

    const onProjKeyDown = (e) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { submit(); return; }
      if (!showSugg || optionCount === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIdx(i => (i + 1) % optionCount);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIdx(i => (i <= 0 ? optionCount - 1 : i - 1));
      } else if (e.key === 'Enter') {
        if (selectedIdx >= 0) { e.preventDefault(); pickOption(selectedIdx); }
      } else if (e.key === 'Tab' && selectedIdx >= 0) {
        pickOption(selectedIdx);
      }
    };

    const submit = () => {
      if (!text.trim()) return;
      onSubmit({ type, text: text.trim(), project: project.trim() || null });
    };

    const d = U.parseDate(date);
    return (
      <div className={cn('dialog-bg')} onClick={onCancel}>
        <div className={cn('dialog')} onClick={e => e.stopPropagation()}>
          <div className={cn('dialog-head')}>
            <span className={cn('dialog-date')}>
              {mode === 'edit' ? 'Editing · ' : ''}
              {U.dayName(d.getDay())}, {U.monthName(d.getMonth())} {d.getDate()}
            </span>
            <span className={cn('kbd-hint')}>esc to close</span>
          </div>
          <textarea
            ref={inputRef}
            className={cn('dialog-input')}
            placeholder="What happened?"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
            rows={3}
          />
          <div className={cn('dialog-row')}>
            <div className={cn('projfield')}>
              <input
                className={cn('projinput')}
                placeholder="Project (optional)"
                value={project}
                onChange={e => { setProject(e.target.value); setShowSugg(true); }}
                onFocus={() => setShowSugg(true)}
                onBlur={() => setTimeout(() => setShowSugg(false), 120)}
                onKeyDown={onProjKeyDown}
              />
              {showSugg && optionCount > 0 && (
                <div className={cn('sugg')}>
                  {suggestions.map((pr, i) => (
                    <div
                      key={pr.id}
                      className={`${cn('sugg-row')} ${selectedIdx === i ? 'is-selected' : ''}`}
                      onMouseEnter={() => setSelectedIdx(i)}
                      onMouseDown={() => { setProject(pr.name); setShowSugg(false); }}
                    >
                      <span className={cn('sugg-dot')} style={{ background: pr.color }} />
                      {pr.name}
                    </div>
                  ))}
                  {showCreate && (
                    <div
                      className={`${cn('sugg-row')} ${cn('sugg-new')} ${selectedIdx === suggestions.length ? 'is-selected' : ''}`}
                      onMouseEnter={() => setSelectedIdx(suggestions.length)}
                      onMouseDown={() => setShowSugg(false)}
                    >
                      Create "{project}"
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className={cn('typepick')}>
              {['info', 'issue', 'milestone'].map(t => (
                <button key={t} className={`${cn('typebtn')} ${type === t ? 'is-on' : ''}`} onClick={() => setType(t)}>
                  <Glyph type={t} /> {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
          <div className={cn('dialog-actions')}>
            {onDelete && (
              <button className={cn('delete')} onClick={onDelete}>Delete</button>
            )}
            <span className={cn('actions-spacer')} />
            <button className={cn('cancel')} onClick={onCancel}>Cancel</button>
            <button className={cn('submit')} onClick={submit}>
              {mode === 'edit' ? 'Save changes' : 'Save'} <span className={cn('kbd')}>⌘↵</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return App;
})();

window.WorklogCore = WorklogCore;
