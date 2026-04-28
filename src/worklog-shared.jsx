// Shared JSX helpers used by the worklog views
const WorklogShared = (() => {
  const { useState, useMemo, useRef, useEffect } = React;

  const TYPE_LABEL = { info: 'note', issue: 'issue', milestone: 'milestone' };
  const ENTRY_TYPES = ['info', 'issue', 'milestone'];

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

  function useEntryDialogShortcut(setDialog, buildAddDialog) {
    const buildAddDialogRef = useRef(buildAddDialog);
    useEffect(() => {
      buildAddDialogRef.current = buildAddDialog;
    }, [buildAddDialog]);

    useEffect(() => {
      const onKey = (e) => {
        const tag = document.activeElement?.tagName;
        if (e.key === '/' && !['INPUT','TEXTAREA'].includes(tag)) {
          e.preventDefault();
          setDialog(buildAddDialogRef.current());
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
          e.preventDefault();
          setDialog(buildAddDialogRef.current());
        } else if (e.key === 'Escape') {
          setDialog(null);
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [setDialog]);
  }

  function resolveProjectName(rawName, { projects, allProjects, setProjects }) {
    if (!rawName) return null;
    const searchProjects = Array.isArray(allProjects) ? allProjects : projects;
    const existing = searchProjects.find(p => p.name.toLowerCase() === rawName.toLowerCase());
    if (existing) {
      if (existing.hidden) {
        setProjects(ps => ps.map(p => p.id === existing.id ? { ...p, hidden: false } : p));
      }
      return existing.id;
    }
    const newProject = {
      id: 'p' + Date.now(),
      name: rawName,
      color: `oklch(0.62 0.14 ${Math.floor(Math.random()*360)})`,
    };
    setProjects(ps => [...ps, newProject]);
    return newProject.id;
  }

  function EntryDialog({ p, mode, date, projectId, initialEntry, projects, onCancel, onSubmit, onDelete }) {
    const cn = (s) => `${p}-${s}`;
    const [type, setType] = useState(initialEntry?.type || 'info');
    const [text, setText] = useState(initialEntry?.text || '');
    const [entryDate, setEntryDate] = useState(date);
    const [project, setProject] = useState(() => {
      if (initialEntry?.project) {
        return projects.find(pr => pr.id === initialEntry.project)?.name || '';
      }
      if (!projectId || projectId === '__none') return '';
      return projects.find(pr => pr.id === projectId)?.name || '';
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

    const submit = () => {
      if (!text.trim() || !entryDate) return;
      onSubmit({ date: entryDate, type, text: text.trim(), project: project.trim() || null });
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

    return (
      <div className={cn('dialog-bg')} onClick={onCancel}>
        <div className={cn('dialog')} onClick={e => e.stopPropagation()}>
          <div className={cn('dialog-head')}>
            <div className={cn('dialog-date-wrap')}>
              <span className={cn('dialog-date')}>
                {mode === 'edit' ? 'Editing' : 'New entry'}
              </span>
              <input
                className={cn('dateinput')}
                type="date"
                aria-label="Entry date"
                value={entryDate}
                onChange={e => setEntryDate(e.target.value)}
              />
            </div>
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
              {ENTRY_TYPES.map(t => (
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

  return {
    Glyph,
    EntryDialog,
    TYPE_LABEL,
    ENTRY_TYPES,
    resolveProjectName,
    useEntryDialogShortcut,
  };
})();

window.WorklogShared = WorklogShared;
