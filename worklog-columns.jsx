// Project-columns view — each project is a column, time runs top→bottom
const WorklogColumns = (() => {
  const { useState, useMemo, useRef, useEffect } = React;
  const U = window.WorklogUtils;
  const { PROJECTS: SEED_PROJECTS, ENTRIES: SEED_ENTRIES, TODAY } = window.WorklogData;

  const TYPE_LABEL = { info: 'note', issue: 'issue', milestone: 'milestone' };

  function Glyph({ type, color, size = 10 }) {
    const c = color || 'currentColor';
    if (type === 'info') return <svg width={size} height={size} viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.2" fill={c} /></svg>;
    if (type === 'issue') return <svg width={size} height={size} viewBox="0 0 10 10"><polygon points="5,1.5 9,8.5 1,8.5" fill={c} /></svg>;
    return <svg width={size} height={size} viewBox="0 0 10 10"><polygon points="5,1 9,5 5,9 1,5" fill={c} /></svg>;
  }

  function App({ scale, density, headerSubtitle }) {
    const [projects, setProjects] = useState(SEED_PROJECTS);
    const [entries, setEntries] = useState(SEED_ENTRIES);
    const [dialog, setDialog] = useState(null); // null | {mode:'add', date, projectId} | {mode:'edit', entry}
    const [hovered, setHovered] = useState(null);
    const [hoveredCol, setHoveredCol] = useState(null);

    useEffect(() => {
      const onKey = (e) => {
        const tag = document.activeElement?.tagName;
        if (e.key === '/' && !['INPUT','TEXTAREA'].includes(tag)) {
          e.preventDefault();
          setDialog({ mode: 'add', date: U.fmtDate(TODAY), projectId: null });
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          setDialog({ mode: 'add', date: U.fmtDate(TODAY), projectId: null });
        } else if (e.key === 'Escape') {
          setDialog(null);
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, []);

    const dates = useMemo(() => U.buildDateRange(entries, TODAY), [entries]);

    const dayPx = density === 'airy' ? 40 : density === 'dense' ? 22 : 30;
    const showPeek = density !== 'dense';

    const indexed = useMemo(() => {
      const m = new Map();
      for (const e of entries) {
        const k = (e.project || '__none') + '|' + e.date;
        if (!m.has(k)) m.set(k, []);
        m.get(k).push(e);
      }
      return m;
    }, [entries]);

    const rows = useMemo(() => {
      if (scale === 'week') {
        return U.groupByWeek(dates).map(w => ({
          type: 'week', key: w.key, monday: w.monday, dates: w.dates,
        }));
      }
      return dates.map(ds => ({ type: 'day', key: ds, date: ds }));
    }, [dates, scale]);

    const columns = [...projects, { id: '__none', name: 'No project', color: '#c4c4c8' }];

    const resolveProjectId = (rawName) => {
      if (!rawName) return null;
      const existing = projects.find(p => p.name.toLowerCase() === rawName.toLowerCase());
      if (existing) return existing.id;
      const newP = { id: 'p' + Date.now(), name: rawName, color: `oklch(0.62 0.14 ${Math.floor(Math.random()*360)})` };
      setProjects(ps => [...ps, newP]);
      return newP.id;
    };

    const handleAdd = (date, projectId, payload) => {
      const id = 'e' + Date.now();
      let pid = projectId && projectId !== '__none' ? projectId : null;
      if (!pid && payload.project) pid = resolveProjectId(payload.project);
      setEntries(es => [...es, { id, date, type: payload.type, project: pid, text: payload.text }]);
      setDialog(null);
    };

    const handleUpdate = (id, payload) => {
      const pid = resolveProjectId(payload.project);
      setEntries(es => es.map(e => e.id === id ? { ...e, type: payload.type, text: payload.text, project: pid } : e));
      setDialog(null);
    };

    const handleDelete = (id) => {
      setEntries(es => es.filter(e => e.id !== id));
      setDialog(null);
    };

    return (
      <div className="wlCol-root" style={{ '--day-px': dayPx + 'px' }}>
        <header className="wlCol-header">
          <div className="wlCol-title">
            <h1>Worklog</h1>
            <div className="wlCol-sub">{headerSubtitle}</div>
          </div>
          <div className="wlCol-controls">
            <button className="wlCol-btn" onClick={() => setDialog({ mode: 'add', date: U.fmtDate(TODAY), projectId: null })}>
              <span className="wlCol-kbd">/</span> New entry
            </button>
          </div>
        </header>

        <div className="wlCol-legend">
          <span><Glyph type="info" /> note</span>
          <span><Glyph type="issue" /> issue</span>
          <span><Glyph type="milestone" /> milestone</span>
        </div>

        <div className="wlCol-grid" style={{ gridTemplateColumns: `84px repeat(${columns.length}, minmax(140px, 1fr))` }}>
          <div className="wlCol-corner" />
          {columns.map(p => (
            <div key={p.id} className="wlCol-colhead" style={{ '--proj': p.color }}>
              <span className="wlCol-colhead-dot" />
              <span className="wlCol-colhead-name">{p.name}</span>
              <span className="wlCol-colhead-count">
                {entries.filter(e => (e.project || '__none') === p.id).length}
              </span>
            </div>
          ))}

          {(() => {
            const out = [];
            let lastMonth = -1;
            const todayStr = U.fmtDate(TODAY);

            rows.forEach((row) => {
              if (row.type === 'day') {
                const ds = row.date;
                const d = U.parseDate(ds);
                const m = d.getMonth();
                const isToday = U.sameDay(d, TODAY);
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const isMonday = d.getDay() === 1;
                const isFirstOfMonth = m !== lastMonth;
                if (isFirstOfMonth) lastMonth = m;

                out.push(
                  <div key={'ax' + ds}
                    className={`wlCol-axis ${isToday ? 'is-today' : ''} ${isWeekend ? 'is-weekend' : ''} ${isMonday ? 'is-monday' : ''} ${isFirstOfMonth ? 'is-month-start' : ''}`}>
                    {isFirstOfMonth && (
                      <div className="wlCol-axis-month">{U.monthShort(m)}</div>
                    )}
                    <div className="wlCol-axis-dow">{U.dayShort(d.getDay())}</div>
                    <div className="wlCol-axis-day">{d.getDate()}</div>
                    {isToday && <div className="wlCol-axis-today">now</div>}
                  </div>
                );

                columns.forEach((p) => {
                  const k = p.id + '|' + ds;
                  const items = indexed.get(k) || [];
                  const cellId = ds + '|' + p.id;
                  out.push(
                    <div
                      key={'c' + cellId}
                      className={`wlCol-cell ${isToday ? 'is-today' : ''} ${isWeekend ? 'is-weekend' : ''} ${isMonday ? 'is-monday' : ''} ${isFirstOfMonth ? 'is-month-start' : ''} ${hoveredCol === p.id ? 'is-col-hover' : ''}`}
                      onMouseEnter={() => setHoveredCol(p.id)}
                      onMouseLeave={() => setHoveredCol(null)}
                      onClick={() => items.length === 0 && setDialog({ mode: 'add', date: ds, projectId: p.id })}
                    >
                      {items.map(e => (
                        <Pip key={e.id} entry={e} project={p} hovered={hovered} setHovered={setHovered} showPeek={showPeek} onEdit={() => setDialog({ mode: 'edit', entry: e })} />
                      ))}
                    </div>
                  );
                });
              } else {
                // 'week' row — aggregate the week's entries per project
                const monday = row.monday;
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                const m = monday.getMonth();
                const isFirstOfMonth = m !== lastMonth;
                if (isFirstOfMonth) lastMonth = m;
                const containsToday = row.dates.includes(todayStr);

                out.push(
                  <div key={'ax' + row.key}
                    className={`wlCol-axis is-monday ${containsToday ? 'is-today' : ''} ${isFirstOfMonth ? 'is-month-start' : ''}`}>
                    {isFirstOfMonth && (
                      <div className="wlCol-axis-month">{U.monthShort(m)}</div>
                    )}
                    <div className="wlCol-axis-day">{`${monday.getDate()}–${sunday.getDate()}`}</div>
                    {containsToday && <div className="wlCol-axis-today">now</div>}
                  </div>
                );

                columns.forEach((p) => {
                  const items = [];
                  for (const ds of row.dates) {
                    const its = indexed.get(p.id + '|' + ds);
                    if (its) items.push(...its);
                  }
                  items.sort((a, b) => b.date.localeCompare(a.date));
                  const cellId = row.key + '|' + p.id;
                  out.push(
                    <div
                      key={'c' + cellId}
                      className={`wlCol-cell is-monday ${containsToday ? 'is-today' : ''} ${isFirstOfMonth ? 'is-month-start' : ''} ${hoveredCol === p.id ? 'is-col-hover' : ''}`}
                      onMouseEnter={() => setHoveredCol(p.id)}
                      onMouseLeave={() => setHoveredCol(null)}
                      onClick={() => items.length === 0 && setDialog({ mode: 'add', date: U.fmtDate(monday), projectId: p.id })}
                    >
                      {items.map(e => (
                        <Pip key={e.id} entry={e} project={p} hovered={hovered} setHovered={setHovered} showPeek={showPeek} onEdit={() => setDialog({ mode: 'edit', entry: e })} />
                      ))}
                    </div>
                  );
                });
              }
            });
            return out;
          })()}
        </div>

        {dialog && (
          <EntryDialog
            mode={dialog.mode}
            date={dialog.mode === 'add' ? dialog.date : dialog.entry.date}
            projectId={dialog.mode === 'add' ? dialog.projectId : null}
            initialEntry={dialog.mode === 'edit' ? dialog.entry : null}
            projects={projects}
            onCancel={() => setDialog(null)}
            onSubmit={(payload) => {
              if (dialog.mode === 'add') handleAdd(dialog.date, dialog.projectId, payload);
              else handleUpdate(dialog.entry.id, payload);
            }}
            onDelete={dialog.mode === 'edit' ? () => handleDelete(dialog.entry.id) : null}
          />
        )}
      </div>
    );
  }

  function Pip({ entry, project, hovered, setHovered, showPeek, onEdit }) {
    const isHovered = hovered === entry.id;
    const color = project.id === '__none' ? '#8e8e92' : project.color;
    return (
      <div
        className={`wlCol-pip t-${entry.type} ${isHovered ? 'is-hovered' : ''} ${showPeek ? 'has-peek' : ''}`}
        style={{ '--proj': color }}
        onMouseEnter={() => setHovered(entry.id)}
        onMouseLeave={() => setHovered(null)}
        onDoubleClick={(ev) => { ev.stopPropagation(); onEdit && onEdit(); }}
        title="Double-click to edit"
      >
        <span className="wlCol-pip-glyph"><Glyph type={entry.type} color={color} size={9} /></span>
        {showPeek && (
          <span className="wlCol-pip-peek">{entry.text}</span>
        )}
        {isHovered && (
          <div className="wlCol-tip">
            <div className="wlCol-tip-meta">
              <span className="wlCol-tip-type">{entry.type}</span>
              <span className="wlCol-tip-date">{entry.date}</span>
            </div>
            <div className="wlCol-tip-text">{entry.text}</div>
            <div className="wlCol-tip-proj" style={{ color }}>
              <span className="wlCol-tip-dot" style={{ background: color }} />
              {project.name}
            </div>
          </div>
        )}
      </div>
    );
  }

  function EntryDialog({ mode, date, projectId, initialEntry, projects, onCancel, onSubmit, onDelete }) {
    const [type, setType] = useState(initialEntry?.type || 'info');
    const [text, setText] = useState(initialEntry?.text || '');
    const [project, setProject] = useState(() => {
      if (initialEntry?.project) {
        return projects.find(p => p.id === initialEntry.project)?.name || '';
      }
      if (!projectId || projectId === '__none') return '';
      return projects.find(p => p.id === projectId)?.name || '';
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
      <div className="wlCol-dialog-bg" onClick={onCancel}>
        <div className="wlCol-dialog" onClick={e => e.stopPropagation()}>
          <div className="wlCol-dialog-head">
            <span className="wlCol-dialog-date">
              {mode === 'edit' ? 'Editing · ' : ''}
              {U.dayName(d.getDay())}, {U.monthName(d.getMonth())} {d.getDate()}
            </span>
            <span className="wlCol-kbd-hint">esc to close</span>
          </div>
          <textarea
            ref={inputRef}
            className="wlCol-dialog-input"
            placeholder="What happened?"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
            rows={3}
          />
          <div className="wlCol-dialog-row">
            <div className="wlCol-projfield">
              <input
                className="wlCol-projinput"
                placeholder="Project (optional)"
                value={project}
                onChange={e => { setProject(e.target.value); setShowSugg(true); }}
                onFocus={() => setShowSugg(true)}
                onBlur={() => setTimeout(() => setShowSugg(false), 120)}
                onKeyDown={onProjKeyDown}
              />
              {showSugg && optionCount > 0 && (
                <div className="wlCol-sugg">
                  {suggestions.map((pr, i) => (
                    <div
                      key={pr.id}
                      className={`wlCol-sugg-row ${selectedIdx === i ? 'is-selected' : ''}`}
                      onMouseEnter={() => setSelectedIdx(i)}
                      onMouseDown={() => { setProject(pr.name); setShowSugg(false); }}
                    >
                      <span className="wlCol-sugg-dot" style={{ background: pr.color }} />
                      {pr.name}
                    </div>
                  ))}
                  {showCreate && (
                    <div
                      className={`wlCol-sugg-row wlCol-sugg-new ${selectedIdx === suggestions.length ? 'is-selected' : ''}`}
                      onMouseEnter={() => setSelectedIdx(suggestions.length)}
                      onMouseDown={() => setShowSugg(false)}
                    >
                      Create "{project}"
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="wlCol-typepick">
              {['info', 'issue', 'milestone'].map(t => (
                <button key={t} className={`wlCol-typebtn ${type === t ? 'is-on' : ''}`} onClick={() => setType(t)}>
                  <Glyph type={t} /> {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
          <div className="wlCol-dialog-actions">
            {onDelete && (
              <button className="wlCol-delete" onClick={onDelete}>Delete</button>
            )}
            <span className="wlCol-actions-spacer" />
            <button className="wlCol-cancel" onClick={onCancel}>Cancel</button>
            <button className="wlCol-submit" onClick={submit}>{mode === 'edit' ? 'Save changes' : 'Save'} <span className="wlCol-kbd">⌘↵</span></button>
          </div>
        </div>
      </div>
    );
  }

  return App;
})();

window.WorklogColumns = WorklogColumns;
