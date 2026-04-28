// Project-columns view — each project is a column, time runs top→bottom
const WorklogColumns = (() => {
  const { useState, useMemo } = React;
  const U = window.WorklogUtils;
  const S = window.WorklogShared;
  const { TODAY } = window.WorklogData;
  const { Glyph, EntryDialog } = S;

  function App({ title, scale, density, headerSubtitle, projects, allProjects, entries, setProjects, setEntries, columnOrder, setColumnOrder }) {
    const [dialog, setDialog] = useState(null); // null | {mode:'add', date, projectId} | {mode:'edit', entry}
    const [hovered, setHovered] = useState(null);
    const [hoveredCol, setHoveredCol] = useState(null);
    const [dragId, setDragId] = useState(null);
    const [dragOverId, setDragOverId] = useState(null);

    S.useEntryDialogShortcut(setDialog, () => ({ mode: 'add', date: U.fmtDate(TODAY), projectId: null }));

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

    const counts = useMemo(() => {
      const m = new Map();
      for (const e of entries) {
        const k = e.project || '__none';
        m.set(k, (m.get(k) || 0) + 1);
      }
      return m;
    }, [entries]);

    const columns = useMemo(() => {
      const byId = new Map(projects.map(p => [p.id, p]));
      const noneCol = { id: '__none', name: 'No project', color: '#c4c4c8' };
      byId.set('__none', noneCol);
      const order = Array.isArray(columnOrder) && columnOrder.length
        ? columnOrder.filter(id => byId.has(id))
        : [];
      const seen = new Set(order);
      for (const p of projects) if (!seen.has(p.id)) order.push(p.id);
      if (!seen.has('__none')) order.push('__none');
      return order.map(id => byId.get(id)).filter(p => (counts.get(p.id) || 0) > 0);
    }, [projects, columnOrder, counts]);

    const writeOrder = (nextOrder) => {
      if (typeof setColumnOrder === 'function') setColumnOrder(nextOrder);
    };

    const resolveProjectId = (rawName) => {
      return S.resolveProjectName(rawName, { projects, allProjects, setProjects });
    };

    const handleAdd = (date, projectId, payload) => {
      const id = 'e' + Date.now();
      let pid = projectId && projectId !== '__none' ? projectId : null;
      if (!pid && payload.project) pid = resolveProjectId(payload.project);
      setEntries(es => [...es, { id, date: payload.date || date, type: payload.type, project: pid, text: payload.text }]);
      setDialog(null);
    };

    const handleUpdate = (id, payload) => {
      const pid = resolveProjectId(payload.project);
      setEntries(es => es.map(e => e.id === id ? { ...e, date: payload.date, type: payload.type, text: payload.text, project: pid } : e));
      setDialog(null);
    };

    const handleDelete = (id) => {
      setEntries(es => es.filter(e => e.id !== id));
      setDialog(null);
    };

    const onColDragStart = (e, id) => {
      setDragId(id);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
    };
    const onColDragOver = (e, id) => {
      if (!dragId || id === dragId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragOverId !== id) setDragOverId(id);
    };
    const onColDragLeave = (id) => {
      if (dragOverId === id) setDragOverId(null);
    };
    const onColDrop = (e, targetId) => {
      e.preventDefault();
      const from = dragId;
      setDragId(null);
      setDragOverId(null);
      if (!from || from === targetId) return;
      const currentIds = columns.map(c => c.id);
      const fromIdx = currentIds.indexOf(from);
      const toIdx = currentIds.indexOf(targetId);
      if (fromIdx < 0 || toIdx < 0) return;
      const next = [...currentIds];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      writeOrder(next);
    };
    const onColDragEnd = () => { setDragId(null); setDragOverId(null); };

    return (
      <div className="wlCol-root" style={{ '--day-px': dayPx + 'px' }}>
        <header className="wlCol-header">
          <div className="wlCol-title">
            <h1>{title}</h1>
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

        <div className="wlCol-grid" style={{ gridTemplateColumns: `84px repeat(${columns.length}, minmax(180px, 1fr))` }}>
          <div className="wlCol-corner" />
          {columns.map(p => {
            const cls = [
              'wlCol-colhead is-draggable',
              dragId === p.id ? 'is-dragging' : '',
              dragOverId === p.id ? 'is-drop-target' : '',
            ].filter(Boolean).join(' ');
            return (
              <div
                key={p.id}
                className={cls}
                style={{ '--proj': p.color }}
                draggable
                onDragStart={(e) => onColDragStart(e, p.id)}
                onDragOver={(e) => onColDragOver(e, p.id)}
                onDragLeave={() => onColDragLeave(p.id)}
                onDrop={(e) => onColDrop(e, p.id)}
                onDragEnd={onColDragEnd}
              >
                <span className="wlCol-colhead-dot" />
                <span className="wlCol-colhead-name">{p.name}</span>
                <span className="wlCol-colhead-count">{counts.get(p.id) || 0}</span>
              </div>
            );
          })}

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
                    <div className="wlCol-axis-date">
                      {isFirstOfMonth && (
                        <div className="wlCol-axis-month">{U.monthShort(m)}</div>
                      )}
                      <div className="wlCol-axis-dow">{U.dayShort(d.getDay())}</div>
                      <div className="wlCol-axis-day">{d.getDate()}</div>
                    </div>
                    {isToday && <div className="wlCol-axis-today">Today</div>}
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
                    className={`wlCol-axis is-week is-monday ${containsToday ? 'is-today' : ''} ${isFirstOfMonth ? 'is-month-start' : ''}`}>
                    <div className="wlCol-axis-date">
                      {isFirstOfMonth && (
                        <div className="wlCol-axis-month">{U.monthShort(m)}</div>
                      )}
                      <div className="wlCol-axis-day">{`${monday.getDate()}–${sunday.getDate()}`}</div>
                    </div>
                    {containsToday && <div className="wlCol-axis-today">Today</div>}
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
                      className={`wlCol-cell is-week is-monday ${containsToday ? 'is-today' : ''} ${isFirstOfMonth ? 'is-month-start' : ''} ${hoveredCol === p.id ? 'is-col-hover' : ''}`}
                      onMouseEnter={() => setHoveredCol(p.id)}
                      onMouseLeave={() => setHoveredCol(null)}
                      onClick={() => items.length === 0 && setDialog({ mode: 'add', date: U.fmtDate(monday), projectId: p.id })}
                    >
                      {items.length > 0 && (
                        <WeekBlock
                          entries={items}
                          project={p}
                          hovered={hovered}
                          setHovered={setHovered}
                          onEditEntry={(e) => setDialog({ mode: 'edit', entry: e })}
                        />
                      )}
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
            p="wlCol"
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

  function WeekBlock({ entries, project, hovered, setHovered, onEditEntry }) {
    const color = project.id === '__none' ? '#8e8e92' : project.color;
    return (
      <div className="wlCol-weekblock" style={{ '--proj': color }}>
        {entries.map(e => {
          const isHovered = hovered === e.id;
          return (
            <div
              key={e.id}
              className={`wlCol-weekitem t-${e.type} ${isHovered ? 'is-hovered' : ''}`}
              onMouseEnter={() => setHovered(e.id)}
              onMouseLeave={() => setHovered(null)}
              onDoubleClick={(ev) => { ev.stopPropagation(); onEditEntry(e); }}
              title="Double-click to edit"
            >
              <span className="wlCol-weekitem-glyph"><Glyph type={e.type} color={color} size={9} /></span>
              <span className="wlCol-weekitem-text">{e.text}</span>
            </div>
          );
        })}
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

  return App;
})();

window.WorklogColumns = WorklogColumns;
