// Main app shell — store + tabs + tweaks bar + the active view
const { useState, useEffect, useRef } = React;

const FSA_SUPPORTED = typeof window !== 'undefined' && 'showSaveFilePicker' in window;
const STORE_KEY = 'worklog.data';
const HANDLE_KEY = 'handle';

// --- tiny IndexedDB key-value store for the file handle ---
function idbOpen() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('worklog', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbGet(key) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const req = db.transaction('kv').objectStore('kv').get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbSet(key, value) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
async function idbDel(key) {
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    tx.objectStore('kv').delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function loadFromLS() {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function normalizeProjects(projects) {
  return (Array.isArray(projects) ? projects : []).map(p => ({
    ...p,
    hidden: Boolean(p.hidden),
  }));
}

async function writeToFile(handle, data) {
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}

function usePersistedState(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initial;
      return JSON.parse(raw);
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue];
}

function useWorklogStore() {
  const initial = loadFromLS();
  const [projects, setProjects] = useState(() => normalizeProjects(initial?.projects || window.WorklogData.PROJECTS));
  const [entries, setEntries] = useState(initial?.entries || window.WorklogData.ENTRIES);
  const [columnOrder, setColumnOrder] = useState(initial?.columnOrder || null);
  const [fileHandle, setFileHandle] = useState(null);
  const [pendingHandle, setPendingHandle] = useState(null);
  const [fileStatus, setFileStatus] = useState('idle');
  const skipNextSave = useRef(false);

  const adoptHandleData = async (handle) => {
    const file = await handle.getFile();
    const text = await file.text();
    if (text.trim()) {
      const data = JSON.parse(text);
      skipNextSave.current = true;
      if (Array.isArray(data.projects)) setProjects(normalizeProjects(data.projects));
      if (Array.isArray(data.entries)) setEntries(data.entries);
      if (Array.isArray(data.columnOrder)) setColumnOrder(data.columnOrder);
    }
  };

  // Restore the file handle from IndexedDB on first load (Chrome+ only)
  useEffect(() => {
    if (!FSA_SUPPORTED) return;
    (async () => {
      try {
        const handle = await idbGet(HANDLE_KEY);
        if (!handle) return;
        const perm = await handle.queryPermission({ mode: 'readwrite' });
        if (perm === 'granted') {
          await adoptHandleData(handle);
          setFileHandle(handle);
          setFileStatus('saved');
        } else {
          // Chrome drops file permission across reloads — surface a
          // one-click reconnect since requestPermission needs a gesture.
          setPendingHandle(handle);
        }
      } catch (err) {
        console.warn('Could not restore file handle:', err);
      }
    })();
  }, []);

  const reconnect = async () => {
    if (!pendingHandle) return;
    try {
      const granted = await pendingHandle.requestPermission({ mode: 'readwrite' });
      if (granted !== 'granted') return;
      await adoptHandleData(pendingHandle);
      setFileHandle(pendingHandle);
      setPendingHandle(null);
      setFileStatus('saved');
    } catch (err) {
      console.warn(err);
    }
  };

  const forgetPending = async () => {
    setPendingHandle(null);
    try { await idbDel(HANDLE_KEY); } catch {}
  };

  // Auto-save: localStorage always, file too if connected
  useEffect(() => {
    const data = { projects, entries, columnOrder };
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch {}
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    if (fileHandle) {
      setFileStatus('saving');
      writeToFile(fileHandle, data)
        .then(() => setFileStatus('saved'))
        .catch((err) => { console.warn('save failed', err); setFileStatus('error'); });
    }
  }, [projects, entries, columnOrder, fileHandle]);

  const connectSave = async () => {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'worklog.json',
        types: [{ description: 'Worklog data', accept: { 'application/json': ['.json'] } }],
      });
      await writeToFile(handle, { projects, entries, columnOrder });
      try { await idbSet(HANDLE_KEY, handle); } catch (e) { console.warn(e); }
      setFileHandle(handle);
      setFileStatus('saved');
    } catch (err) {
      if (err?.name !== 'AbortError') console.warn(err);
    }
  };

  const connectOpen = async () => {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{ description: 'Worklog data', accept: { 'application/json': ['.json'] } }],
      });
      const perm = await handle.queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted') {
        const granted = await handle.requestPermission({ mode: 'readwrite' });
        if (granted !== 'granted') return;
      }
      const file = await handle.getFile();
      const text = await file.text();
      if (text.trim()) {
        const data = JSON.parse(text);
        skipNextSave.current = true;
        if (Array.isArray(data.projects)) setProjects(normalizeProjects(data.projects));
        if (Array.isArray(data.entries)) setEntries(data.entries);
        if (Array.isArray(data.columnOrder)) setColumnOrder(data.columnOrder);
      }
      try { await idbSet(HANDLE_KEY, handle); } catch (e) { console.warn(e); }
      setFileHandle(handle);
      setFileStatus('saved');
    } catch (err) {
      if (err?.name !== 'AbortError') console.warn(err);
    }
  };

  const disconnect = async () => {
    setFileHandle(null);
    setFileStatus('idle');
    try { await idbDel(HANDLE_KEY); } catch {}
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ projects, entries, columnOrder }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'worklog.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const importJson = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (Array.isArray(data.projects)) setProjects(normalizeProjects(data.projects));
        if (Array.isArray(data.entries)) setEntries(data.entries);
        if (Array.isArray(data.columnOrder)) setColumnOrder(data.columnOrder);
      } catch (err) {
        alert('Could not parse JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return {
    projects, setProjects, entries, setEntries,
    columnOrder, setColumnOrder,
    fileHandle, pendingHandle, fileStatus,
    connectSave, connectOpen, disconnect, reconnect, forgetPending,
    exportJson, importJson,
  };
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function Seg({ value, options, onChange }) {
  return (
    <div className="tweaks-seg">
      {options.map(opt => (
        <button
          key={opt.value}
          className={value === opt.value ? 'is-on' : ''}
          onClick={() => onChange(opt.value)}
        >{opt.label}</button>
      ))}
    </div>
  );
}

function ProjectManager({ projects, entries, setProjects }) {
  const [draftNames, setDraftNames] = useState(() => Object.fromEntries(projects.map(p => [p.id, p.name])));
  const [filter, setFilter] = useState('visible');
  const [error, setError] = useState('');

  useEffect(() => {
    setDraftNames(prev => {
      const next = {};
      projects.forEach(p => { next[p.id] = prev[p.id] ?? p.name; });
      return next;
    });
  }, [projects]);

  const counts = React.useMemo(() => {
    const m = new Map();
    entries.forEach(e => {
      if (e.project) m.set(e.project, (m.get(e.project) || 0) + 1);
    });
    return m;
  }, [entries]);

  const visibleCount = projects.filter(p => !p.hidden).length;
  const hiddenCount = projects.length - visibleCount;
  const shownProjects = projects.filter(p => filter === 'hidden' ? p.hidden : !p.hidden);

  const commitRename = (projectId) => {
    const nextName = (draftNames[projectId] || '').trim();
    const current = projects.find(p => p.id === projectId);
    if (!current) return;
    if (!nextName) {
      setDraftNames(names => ({ ...names, [projectId]: current.name }));
      setError('Project names cannot be blank.');
      return;
    }
    const duplicate = projects.some(p => p.id !== projectId && p.name.toLowerCase() === nextName.toLowerCase());
    if (duplicate) {
      setDraftNames(names => ({ ...names, [projectId]: current.name }));
      setError('Another project already uses that name.');
      return;
    }
    setError('');
    if (nextName !== current.name) {
      setProjects(ps => ps.map(p => p.id === projectId ? { ...p, name: nextName } : p));
    }
  };

  const setHidden = (projectId, hidden) => {
    setProjects(ps => ps.map(p => p.id === projectId ? { ...p, hidden } : p));
    setError('');
  };

  return (
    <div className="proj-root">
      <header className="proj-header">
        <div className="proj-title">
          <h1>Projects</h1>
          <div className="proj-sub">{visibleCount} visible · {hiddenCount} hidden</div>
        </div>
        <Seg
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'visible', label: 'Visible' },
            { value: 'hidden', label: 'Hidden' },
          ]}
        />
      </header>

      {error && <div className="proj-error">{error}</div>}

      <div className="proj-list">
        {shownProjects.length === 0 ? (
          <div className="proj-empty">
            {filter === 'hidden' ? 'No hidden projects.' : 'No visible projects.'}
          </div>
        ) : shownProjects.map(project => (
          <div
            key={project.id}
            className={`proj-row ${project.hidden ? 'is-hidden' : ''}`}
            data-project-id={project.id}
          >
            <span className="proj-dot" style={{ background: project.color }} />
            <input
              className="proj-name-input"
              value={draftNames[project.id] ?? project.name}
              onChange={e => setDraftNames(names => ({ ...names, [project.id]: e.target.value }))}
              onBlur={() => commitRename(project.id)}
              onKeyDown={e => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') {
                  setDraftNames(names => ({ ...names, [project.id]: project.name }));
                  e.currentTarget.blur();
                }
              }}
              aria-label={`Rename ${project.name}`}
            />
            <span className="proj-count">{counts.get(project.id) || 0}</span>
            <button
              className="proj-action"
              data-project-action={project.hidden ? 'unhide' : 'hide'}
              onClick={() => setHidden(project.id, !project.hidden)}
            >
              {project.hidden ? 'Unhide' : 'Hide'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function DataControls({ store }) {
  const fileInputRef = useRef(null);
  const menuRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e) => {
      if (!menuRef.current?.contains(e.target)) setMenuOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const status = store.fileHandle
    ? {
        tone: store.fileStatus === 'error' ? 'error' : store.fileStatus === 'saving' ? 'saving' : 'connected',
        label: store.fileStatus === 'error' ? 'Save failed' : store.fileStatus === 'saving' ? 'Saving' : 'Connected',
        detail: store.fileHandle.name,
      }
    : store.pendingHandle
      ? { tone: 'pending', label: 'Needs permission', detail: store.pendingHandle.name }
      : { tone: 'local', label: 'Local only', detail: 'Browser storage' };

  const runAction = (action) => {
    setMenuOpen(false);
    action();
  };

  return (
    <div className="data-controls" ref={menuRef}>
      <span
        className={`data-indicator data-indicator--${status.tone}`}
        title={status.detail}
      >
        <span className="data-indicator-dot" />
        <span className="data-indicator-label">{status.label}</span>
        <span className="data-indicator-detail">{status.detail}</span>
      </span>

      <button
        className="data-menu-btn"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(open => !open)}
      >
        File
        <span className="data-menu-caret">▾</span>
      </button>

      {menuOpen && (
        <div className="data-menu" role="menu">
          <div className="data-menu-section">
            <div className="data-menu-label">File</div>
            {FSA_SUPPORTED && (
              <>
                <button role="menuitem" className="data-menu-item" onClick={() => runAction(store.connectOpen)}>
                  Open file…
                </button>
                <button role="menuitem" className="data-menu-item" onClick={() => runAction(store.connectSave)}>
                  Save to file…
                </button>
              </>
            )}
            {store.pendingHandle && (
              <>
                <button role="menuitem" className="data-menu-item data-menu-item--primary" onClick={() => runAction(store.reconnect)}>
                  Reconnect file
                </button>
                <button role="menuitem" className="data-menu-item" onClick={() => runAction(store.forgetPending)}>
                  Forget file
                </button>
              </>
            )}
            {store.fileHandle && (
              <button role="menuitem" className="data-menu-item" onClick={() => runAction(store.disconnect)}>
                Disconnect file
              </button>
            )}
          </div>
          <div className="data-menu-section">
            <div className="data-menu-label">Backup</div>
            <button role="menuitem" className="data-menu-item" onClick={() => runAction(store.exportJson)}>
              Export JSON
            </button>
            <button role="menuitem" className="data-menu-item" onClick={() => runAction(() => fileInputRef.current?.click())}>
              Import JSON…
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) store.importJson(f);
          e.target.value = '';
        }}
      />
    </div>
  );
}

function App() {
  const [view, setView] = useState('columns');
  const [scale, setScale] = usePersistedState('worklog.scale', 'week');
  const [groupByProject, setGroupByProject] = usePersistedState('worklog.groupByProject', false);

  const store = useWorklogStore();

  const today = window.WorklogData.TODAY;
  const monthLabel = MONTH_NAMES[today.getMonth()] + ' ' + today.getFullYear();
  const hiddenProjectIds = React.useMemo(
    () => new Set(store.projects.filter(p => p.hidden).map(p => p.id)),
    [store.projects]
  );
  const activeProjects = React.useMemo(
    () => store.projects.filter(p => !p.hidden),
    [store.projects]
  );
  const visibleEntries = React.useMemo(
    () => store.entries.filter(e => !e.project || !hiddenProjectIds.has(e.project)),
    [store.entries, hiddenProjectIds]
  );

  const totalEntries = visibleEntries.length;
  const projectCount = activeProjects.length + 1; // +1 for "No project"

  const tabs = [
    { value: 'columns', label: 'Project columns' },
    { value: 'feed', label: 'Feed' },
    { value: 'projects', label: 'Projects' },
  ];

  return (
    <div className="app">
      <div className="tabs-bar">
        <div className="tabs">
          {tabs.map(t => (
            <button
              key={t.value}
              className={`tab ${view === t.value ? 'is-on' : ''}`}
              onClick={() => setView(t.value)}
            >{t.label}</button>
          ))}
        </div>
      </div>

      <div className="tweaks-bar">
        {view !== 'projects' && (
          <div className="tweaks-group">
            <span className="tweaks-label">Time scale</span>
            <Seg
              value={scale}
              onChange={setScale}
              options={[
                { value: 'day', label: 'Day' },
                { value: 'week', label: 'Week' },
              ]}
            />
          </div>
        )}
        {view === 'feed' && (
          <label className="tweaks-toggle">
            <input
              type="checkbox"
              checked={groupByProject}
              onChange={e => setGroupByProject(e.target.checked)}
            />
            Group by project
          </label>
        )}
        {view !== 'projects' && <span className="tweaks-hint">press <b>/</b> or ⌘K to add</span>}
        <span className="tweaks-spacer" />
        <DataControls store={store} />
      </div>

      <div className={`views ${view === 'columns' ? 'views--full' : ''}`}>
        <div className="view-card">
          {view === 'projects' ? (
            <ProjectManager
              projects={store.projects}
              entries={store.entries}
              setProjects={store.setProjects}
            />
          ) : view === 'feed' ? (
            <window.WorklogCore
              p="wlC"
              headerSubtitle={monthLabel + ' · ' + totalEntries + ' entries'}
              scale={scale}
              density="medium"
              groupByProject={groupByProject}
              projects={activeProjects}
              allProjects={store.projects}
              entries={visibleEntries}
              setProjects={store.setProjects}
              setEntries={store.setEntries}
            />
          ) : (
            <window.WorklogColumns
              headerSubtitle={monthLabel + ' · ' + projectCount + ' columns'}
              scale={scale}
              density="airy"
              projects={activeProjects}
              allProjects={store.projects}
              entries={visibleEntries}
              setProjects={store.setProjects}
              setEntries={store.setEntries}
              columnOrder={store.columnOrder}
              setColumnOrder={store.setColumnOrder}
            />
          )}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
