// Main app shell — tabs + tweaks bar + the active view
const { useState, useEffect } = React;

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

function App() {
  const [view, setView] = useState('columns');
  const [scale, setScale] = usePersistedState('worklog.scale', 'week');
  const [density, setDensity] = usePersistedState('worklog.density', 'medium');
  const [groupByProject, setGroupByProject] = usePersistedState('worklog.groupByProject', false);

  const today = window.WorklogData.TODAY;
  const monthLabel = MONTH_NAMES[today.getMonth()] + ' ' + today.getFullYear();

  const totalEntries = window.WorklogData.ENTRIES.length;
  const projectCount = window.WorklogData.PROJECTS.length + 1; // +1 for "No project"

  const tabs = [
    { value: 'columns', label: 'Project columns' },
    { value: 'feed', label: 'Daily feed' },
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
        <div className="tweaks-group">
          <span className="tweaks-label">Density</span>
          <Seg
            value={density}
            onChange={setDensity}
            options={[
              { value: 'airy', label: 'Airy' },
              { value: 'medium', label: 'Medium' },
              { value: 'dense', label: 'Dense' },
            ]}
          />
        </div>
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
        <span className="tweaks-spacer" />
        <span className="tweaks-hint">press <b>/</b> or ⌘K to add</span>
      </div>

      <div className="views">
        <div className="view-card">
          {view === 'feed' ? (
            <window.WorklogCore
              p="wlC"
              headerSubtitle={monthLabel + ' · ' + totalEntries + ' entries'}
              scale={scale}
              density={density}
              groupByProject={groupByProject}
            />
          ) : (
            <window.WorklogColumns
              headerSubtitle={monthLabel + ' · ' + projectCount + ' columns'}
              scale={scale}
              density={density}
            />
          )}
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
