// mvp-app.jsx — live, responsive FlowCal MVP
// State: localStorage. Time: real clock or scrubber. Schedule: template + rebalance overrides.

// ─────────────────────────────────────────────────────────────
// LocalStorage hook
// ─────────────────────────────────────────────────────────────
function useLS(key, initial) {
  const fullKey = 'flowcal:' + key;
  const [v, setV] = React.useState(() => {
    try {
      const s = localStorage.getItem(fullKey);
      return s != null ? JSON.parse(s) : initial;
    } catch { return initial; }
  });
  React.useEffect(() => {
    try { localStorage.setItem(fullKey, JSON.stringify(v)); } catch {}
  }, [fullKey, v]);
  return [v, setV];
}

// ─────────────────────────────────────────────────────────────
// Schedule model — categories are user-editable. CAT_TYPES is the
// initial seed; the live array lives in localStorage and is threaded
// through buildSchedule / TasksBody / WeekView / MiniRibbon.
// ─────────────────────────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  { id: 'focus',    name: 'Focus',     short: 'Focus',    color: 'var(--cat-focus)',    hint: 'deep work, one thing at a time' },
  { id: 'admin',    name: 'Admin',     short: 'Admin',    color: 'var(--cat-admin)',    hint: 'small messages, small wins' },
  { id: 'break',    name: 'Break',     short: 'Break',    color: 'var(--cat-break)',    hint: 'a real pause' },
  { id: 'meal',     name: 'Meal',      short: 'Meal',     color: 'var(--cat-meal)',     hint: 'eat something good' },
  { id: 'movement', name: 'Movement',  short: 'Move',     color: 'var(--cat-movement)', hint: 'reset the body' },
  { id: 'chores',   name: 'Chores',    short: 'Chores',   color: 'var(--cat-chores)',   hint: 'low-effort, hands-on' },
  { id: 'errands',  name: 'Errands',   short: 'Errands',  color: 'var(--cat-errands)',  hint: 'leave the house if you can' },
  { id: 'social',   name: 'Social',    short: 'Social',   color: 'var(--cat-social)',   hint: 'see a human' },
  { id: 'winddown', name: 'Wind Down', short: 'Wind',     color: 'var(--cat-winddown)', hint: 'low light, slow things' },
];

const CAT_PALETTE = [
  'var(--cat-focus)', 'var(--cat-admin)', 'var(--cat-break)',
  'var(--cat-meal)', 'var(--cat-movement)', 'var(--cat-chores)',
  'var(--cat-errands)', 'var(--cat-social)', 'var(--cat-winddown)',
];

const UNKNOWN_CAT = { name: 'Unknown', short: '—', color: 'var(--ink-4)', hint: '' };

function makeCatsById(catsArr) {
  const o = {};
  for (const c of (catsArr || [])) o[c.id] = c;
  return o;
}

// Back-compat lookup for any stragglers — falls back to defaults.
const CAT_TYPES = makeCatsById(DEFAULT_CATEGORIES);

const TEMPLATES_MVP = {
  workday: { id: 'workday', name: 'Workday', blurb: 'A standard day with two focus blocks.',
    slots: [['focus',2],['admin',1.25],['break',0.75],['meal',0.75],['movement',0.5],['focus',1.75],['chores',1],['errands',1],['social',1.5],['winddown',3]] },
  admin:   { id: 'admin',   name: 'Admin catch-up', blurb: 'Clear the small stuff first.',
    slots: [['admin',1.5],['admin',1.5],['break',0.5],['admin',1],['meal',0.75],['focus',2],['chores',1],['winddown',5.75]] },
  deep:    { id: 'deep',    name: 'Deep focus day', blurb: 'Long blocks. Few interruptions.',
    slots: [['focus',2.5],['focus',2],['break',0.5],['meal',0.75],['movement',0.75],['focus',2.5],['focus',1.5],['winddown',3.5]] },
  errands: { id: 'errands', name: 'Errands day', blurb: 'Out, around, back.',
    slots: [['admin',1],['errands',2],['errands',1.5],['meal',1],['chores',1.5],['errands',1.5],['social',2],['winddown',3.5]] },
  low:     { id: 'low',     name: 'Low-energy day', blurb: 'Gentle. Mostly rest.',
    slots: [['break',1.5],['admin',1],['break',1],['meal',1],['break',1],['chores',0.75],['winddown',3.75],['winddown',4]] },
  weekend: { id: 'weekend', name: 'Weekend reset', blurb: 'House, body, people.',
    slots: [['chores',1.5],['meal',1],['movement',1],['social',1.5],['break',1],['errands',1.5],['social',2],['winddown',4.5]] },
};

function softLabel(catId, midHour, catsById) {
  const tod = midHour < 11 ? 'Morning' : midHour < 13 ? 'Midday' : midHour < 17 ? 'Afternoon' : midHour < 20 ? 'Evening' : 'Night';
  if (catId === 'meal') return midHour < 11 ? 'Breakfast' : midHour < 15 ? 'Lunch' : 'Dinner';
  if (catId === 'winddown') return 'Wind down';
  if (catId === 'break') return midHour < 14 ? 'Around lunch' : 'Short break';
  if (catId === 'movement') return tod + ' walk';
  const name = (catsById && catsById[catId]?.name) || (CAT_TYPES[catId]?.name) || 'time';
  return tod + ' ' + name.toLowerCase();
}

function buildSchedule(templateId, catsById, dayStart = 8, dayEnd = 22) {
  const tpl = TEMPLATES_MVP[templateId] || TEMPLATES_MVP.workday;
  const total = tpl.slots.reduce((a, [, h]) => a + h, 0);
  const span = dayEnd - dayStart;
  let cur = dayStart;
  return tpl.slots.map(([catId, h], i) => {
    const dur = (h / total) * span;
    const start = cur, end = cur + dur;
    cur = end;
    const meta = (catsById && catsById[catId]) || CAT_TYPES[catId] || UNKNOWN_CAT;
    return {
      id: catId + '-' + i,
      catType: catId, start, end,
      color: meta.color, short: meta.short, name: meta.name, hint: meta.hint,
      soft: softLabel(catId, (start + end) / 2, catsById),
    };
  });
}

function findCurrent(schedule, now) {
  return schedule.find(s => s.start <= now && s.end > now)
    || schedule.find(s => s.start > now)
    || schedule[schedule.length - 1];
}

// rebalance: produce new schedule
function applyRebalance(schedule, now, optionId) {
  const idx = schedule.findIndex(s => s.start <= now && s.end >= now);
  if (idx < 0) return schedule;
  const cur = schedule[idx];
  const rest = schedule.slice(idx + 1);
  const dayEnd = schedule[schedule.length - 1].end;
  const restSpan = dayEnd - cur.end;

  const rebuildRest = (newCurEnd) => {
    const newRestSpan = dayEnd - newCurEnd;
    if (restSpan <= 0 || newRestSpan <= 0) return rest;
    const scale = newRestSpan / restSpan;
    let pos = newCurEnd;
    return rest.map(s => {
      const dur = (s.end - s.start) * scale;
      const ns = { ...s, start: pos, end: pos + dur };
      pos = ns.end;
      return ns;
    });
  };

  if (optionId === 'keep') {
    const newCurEnd = Math.min(cur.end + 0.5, dayEnd - 0.5);
    return [...schedule.slice(0, idx), { ...cur, end: newCurEnd }, ...rebuildRest(newCurEnd)];
  }
  if (optionId === 'ease') {
    const newCurEnd = Math.min(Math.max(now + 1/6, cur.start + 0.25), dayEnd - 0.5);
    return [...schedule.slice(0, idx), { ...cur, end: newCurEnd }, ...rebuildRest(newCurEnd)];
  }
  if (optionId === 'compress') {
    const flex = new Set(['chores','errands','admin']);
    const flexT  = rest.filter(s =>  flex.has(s.catType)).reduce((a,s)=>a+(s.end-s.start),0);
    const rigT   = rest.filter(s => !flex.has(s.catType)).reduce((a,s)=>a+(s.end-s.start),0);
    const saved = flexT * 0.35;
    let pos = cur.end;
    const newRest = rest.map(s => {
      const d = s.end - s.start;
      const nd = flex.has(s.catType) ? d * 0.65 : (rigT > 0 ? d + (d / rigT) * saved : d);
      const ns = { ...s, start: pos, end: pos + nd };
      pos = ns.end;
      return ns;
    });
    return [...schedule.slice(0, idx + 1), ...newRest];
  }
  return schedule; // shift / drop = task-level, no schedule change
}

// ─────────────────────────────────────────────────────────────
// Viewport + clock
// ─────────────────────────────────────────────────────────────
function useViewport() {
  const [vp, setVp] = React.useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  React.useEffect(() => {
    let raf;
    const onR = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setVp({ w: window.innerWidth, h: window.innerHeight }));
    };
    window.addEventListener('resize', onR);
    return () => { window.removeEventListener('resize', onR); cancelAnimationFrame(raf); };
  }, []);
  return { ...vp, isMobile: vp.w < 820, isCompact: vp.w < 1180 };
}

function useClock(enabled) {
  const get = () => { const d = new Date(); return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600; };
  const [t, setT] = React.useState(get);
  React.useEffect(() => {
    if (!enabled) return;
    setT(get());
    const id = setInterval(() => setT(get()), 30 * 1000);
    return () => clearInterval(id);
  }, [enabled]);
  return t;
}

// Mount + active state with exit transition. `render` stays true for `ms`
// after `visible` flips off; `active` flips immediately so styles can animate.
function useAnimatedMount(visible, ms = 220) {
  const [render, setRender] = React.useState(visible);
  const [active, setActive] = React.useState(false);
  React.useEffect(() => {
    if (visible) {
      setRender(true);
      const id = requestAnimationFrame(() => {
        // double-rAF so the first paint registers the initial (inactive) state
        requestAnimationFrame(() => setActive(true));
      });
      return () => cancelAnimationFrame(id);
    } else {
      setActive(false);
      const id = setTimeout(() => setRender(false), ms);
      return () => clearTimeout(id);
    }
  }, [visible, ms]);
  return { render, active };
}

// ─────────────────────────────────────────────────────────────
// Scrubber (slim top bar) — shows demo mode + lets you scrub time
// ─────────────────────────────────────────────────────────────
function ScrubBar({ liveMode, setLiveMode, demoTime, setDemoTime, now, currentLabel, currentColor }) {
  const realWithinDay = (() => {
    const d = new Date(); const h = d.getHours() + d.getMinutes()/60;
    return h >= DAY_START && h <= DAY_END;
  })();
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '7px 14px',
      background: 'oklch(0.22 0.015 80)',
      color: 'var(--paper)',
      fontSize: 11, position: 'relative', zIndex: 10,
    }} className="mono">
      <span style={{ opacity: 0.55, letterSpacing: 0.08, textTransform: 'uppercase' }}>flow time</span>
      <button onClick={() => setLiveMode(!liveMode)} style={{
        padding: '3px 9px', borderRadius: 99,
        background: liveMode ? 'var(--cat-movement)' : 'rgba(255,255,255,0.10)',
        color: liveMode ? '#1E1B12' : 'var(--paper)',
        border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        whiteSpace: 'nowrap',
      }} title={realWithinDay ? '' : 'Real clock is outside 8am–10pm; scrub to see the flow.'}>
        <span style={{
          width: 5, height: 5, borderRadius: 99,
          background: liveMode ? '#1E1B12' : 'var(--paper)',
          boxShadow: liveMode ? '0 0 6px var(--cat-movement)' : 'none',
        }} />
        {liveMode ? 'live clock' : 'demo · scrub'}
      </button>
      <input type="range" min={DAY_START} max={DAY_END} step={0.05} value={now}
        disabled={liveMode}
        onChange={e => { setDemoTime(parseFloat(e.target.value)); }}
        style={{
          flex: 1, minWidth: 80, maxWidth: 520,
          accentColor: '#FDFBF4',
          opacity: liveMode ? 0.3 : 1,
        }}
      />
      <span style={{ minWidth: 110, textAlign: 'right', opacity: 0.85 }}>
        {fmtTime(now)} · <span style={{ color: 'var(--paper)' }}>{currentLabel}</span>
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Top app bar (chrome) — responsive
// ─────────────────────────────────────────────────────────────
function AppBar({ exactTime, setExactTime, onTemplate, onRebalance, onSettings, isCompact, isMobile, viewMode, setViewMode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: isMobile ? '12px 16px' : '14px 22px',
      borderBottom: '1px solid var(--line)',
      gap: 12,
      background: 'color-mix(in oklch, var(--paper) 75%, transparent)',
      backdropFilter: 'blur(8px)',
      position: 'sticky', top: 0, zIndex: 5,
    }}>
      <div style={{ display:'flex', alignItems:'center', gap: 14, minWidth: 0 }}>
        <Brand size={isMobile ? 15 : 17} />
        {!isMobile && (
          <>
            <span style={{ width: 1, height: 16, background: 'var(--line)' }} />
            <span style={{ fontSize: 12.5, color: 'var(--ink-3)', whiteSpace: 'nowrap' }}>
              <span className="serif" style={{ fontStyle: 'italic', color: 'var(--ink)' }}>
                {new Date().toLocaleDateString(undefined, { weekday: 'long' })}
              </span>
              <span> · {new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
            </span>
            {setViewMode && <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />}
          </>
        )}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap: isMobile ? 6 : 10 }}>
        {!isCompact && (
          <Toggle on={exactTime} onChange={setExactTime} label={exactTime ? 'Exact times' : 'Soft windows'} />
        )}
        {isCompact && !isMobile && (
          <button onClick={() => setExactTime(!exactTime)} style={{
            padding: '7px 12px', borderRadius: 99,
            border: '1px solid var(--line-2)',
            background: exactTime ? 'var(--ink)' : 'var(--paper)',
            color: exactTime ? 'var(--paper)' : 'var(--ink)',
            cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit',
          }}>{exactTime ? 'Exact times' : 'Soft windows'}</button>
        )}
        {!isMobile && <GhostBtn onClick={onTemplate}>Templates</GhostBtn>}
        {!isMobile && <GhostBtn onClick={onSettings}>Categories</GhostBtn>}
        <PrimaryBtn onClick={onRebalance}>
          {I.spark}{!isMobile && <span>Rebalance</span>}
        </PrimaryBtn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Desktop layout
// ─────────────────────────────────────────────────────────────
function DesktopMVP({ ctx }) {
  const { schedule, cur, curTasks, now, exactTime, isCompact,
          onToggle, onAdd, onRebalance, onReorderCurrent } = ctx;
  return (
    <div style={{
      flex: 1, display: 'grid', minHeight: 0,
      gridTemplateColumns: isCompact ? '220px 1fr' : '260px 1fr 320px',
      gap: isCompact ? 22 : 32, padding: isCompact ? '22px 24px 28px' : '28px 32px 36px',
    }}>
      {/* timeline rail */}
      <div style={{ position: 'relative', paddingLeft: 4, minWidth: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
          marginBottom: 14, paddingRight: 6,
        }}>
          <span style={{ fontSize: 11, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-3)' }}>your flow</span>
          <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>{fmtTime(DAY_START)} — {fmtTime(DAY_END)}</span>
        </div>
        <TimelineRail
          now={now} cats={schedule} events={ctx.events || []}
          height={isCompact ? 460 : 540}
          highlightId={cur.id}
          showEvents={!isCompact}
        />
      </div>

      {/* center: current */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minWidth: 0 }}>
        <CurrentCard cat={cur} tasks={curTasks} now={now} exactTime={exactTime}
          onToggle={onToggle} onAdd={onAdd} onRebalance={onRebalance}
          onReorder={onReorderCurrent}
          onRestore={ctx.onRestore}
          slipped={ctx.slipped} />

        {!ctx.slipped && (
          <div style={{
            display:'flex', alignItems:'center', gap: 12,
            padding: '12px 16px', borderRadius: 14,
            background: 'var(--paper-2)', border: '1px dashed var(--line-2)',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: cur.color }} />
            <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>
              You're inside the soft window for <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>{cur.short.toLowerCase()}</strong>.
              {' '}If you're not exactly aligned, you're still okay.
            </span>
          </div>
        )}

        {/* compact (md) shows up-next inline below */}
        {isCompact && (
          <UpNextList ctx={ctx} max={3} />
        )}
      </div>

      {/* right: up next + protected */}
      {!isCompact && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0, overflow: 'auto' }} className="nb">
          <UpNextList ctx={ctx} max={4} />

          <ProtectedMoments
            events={ctx.events || []}
            onAdd={ctx.addEvent} onRemove={ctx.removeEvent} />

          <ClickableLegend categories={ctx.categories} onOpen={ctx.onOpenSettings} />
        </div>
      )}
    </div>
  );
}

function ClickableLegend({ categories, onOpen }) {
  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10,
      }}>
        <span style={{ fontSize: 11, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-3)' }}>categories</span>
        <button onClick={onOpen} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--ink-3)', fontSize: 10.5, fontFamily: 'inherit',
          padding: 2, textTransform: 'lowercase', letterSpacing: 0.04,
        }}>edit →</button>
      </div>
      <button onClick={onOpen} style={{
        width: '100%', textAlign: 'left', cursor: 'pointer',
        background: 'var(--paper-2)', border: '1px solid var(--line)',
        borderRadius: 14, padding: 12,
        fontFamily: 'inherit',
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 8,
        transition: 'background .12s, border-color .12s',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--paper)'; e.currentTarget.style.borderColor = 'var(--line-2)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--paper-2)'; e.currentTarget.style.borderColor = 'var(--line)'; }}
      >
        {(categories || []).map(c => (
          <span key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <CatDot color={c.color} size={10} />
            <span style={{ fontSize: 12, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
          </span>
        ))}
      </button>
    </div>
  );
}

function UpNextList({ ctx, max = 4 }) {
  const { schedule, now, exactTime, tasks, setDemoTime, setLiveMode } = ctx;
  const upcoming = schedule.filter(c => c.end > now).slice(0, max);
  const [expandedId, setExpandedId] = React.useState(null);
  const remaining = schedule.filter(c => c.end > now).length;

  const jumpTo = (c, e) => {
    e.stopPropagation();
    if (setLiveMode) setLiveMode(false);
    if (setDemoTime) {
      const target = Math.max(c.start + 0.05, c.start + (c.end - c.start) * 0.2);
      setDemoTime(target);
    }
  };

  return (
    <div>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 10, paddingLeft: 2,
      }}>
        <span style={{ fontSize: 11, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-3)' }}>up next</span>
        <span className="mono" style={{
          fontSize: 10, padding: '1px 7px', borderRadius: 99,
          background: 'var(--paper-2)', color: 'var(--ink-3)', border: '1px solid var(--line)',
        }}>{remaining} left today</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {upcoming.map((c) => {
          const isCur = c.start <= now && c.end > now;
          const isExpanded = expandedId === c.id;
          const catTasks = tasks[c.catType] || [];
          return (
            <div key={c.id} style={{ position: 'relative' }}>
              <button onClick={() => setExpandedId(isExpanded ? null : c.id)} style={{
                width: '100%', textAlign: 'left', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 12,
                background: isCur ? 'color-mix(in oklch, ' + c.color + ' 14%, var(--paper))' : 'var(--paper)',
                border: '1px solid ' + (isCur ? 'color-mix(in oklch, ' + c.color + ' 35%, transparent)' : (isExpanded ? 'var(--line-2)' : 'var(--line)')),
                fontFamily: 'inherit', transition: 'border-color .15s',
              }}
                onMouseEnter={e => { if (!isCur && !isExpanded) e.currentTarget.style.background = 'var(--paper-2)'; }}
                onMouseLeave={e => { if (!isCur && !isExpanded) e.currentTarget.style.background = 'var(--paper)'; }}
              >
                <span style={{
                  width: 4, alignSelf: 'stretch', borderRadius: 99,
                  background: c.color, opacity: isCur ? 1 : 0.7, flexShrink: 0,
                }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ fontSize: 13, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.soft}</span>
                  <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>
                    {exactTime ? fmtRange(c.start, c.end) : ((c.end - c.start).toFixed(1).replace('.0','') + 'h window')}
                  </span>
                </div>
                {catTasks.length > 0 && (
                  <span className="mono" style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 99,
                    background: 'var(--paper-2)', color: 'var(--ink-3)', border: '1px solid var(--line)',
                    whiteSpace: 'nowrap',
                  }}>{catTasks.filter(t => !t.done).length} open</span>
                )}
                <span
                  onClick={(e) => jumpTo(c, e)}
                  role="button" tabIndex={0}
                  title="Jump time to this block"
                  style={{
                    width: 24, height: 24, borderRadius: 99,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    color: 'var(--ink-3)', cursor: 'pointer',
                    background: 'var(--paper-2)', border: '1px solid var(--line)',
                  }}
                >{I.arrow}</span>
                <span style={{
                  color: 'var(--ink-4)',
                  transform: isExpanded ? 'rotate(90deg)' : 'none',
                  transition: 'transform .2s',
                }}>{I.chevR}</span>
              </button>
              {isExpanded && (
                <div className="fc-expand" style={{
                  padding: '8px 12px 10px 28px',
                  display: 'flex', flexDirection: 'column', gap: 4,
                  borderLeft: '2px solid color-mix(in oklch, ' + c.color + ' 40%, transparent)',
                  marginLeft: 18, marginTop: 4,
                }}>
                  {catTasks.length === 0 ? (
                    <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>No tasks pinned to this block yet.</span>
                  ) : (
                    catTasks.slice(0, 5).map(t => (
                      <div key={t.id} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        fontSize: 12.5,
                        color: t.done ? 'var(--ink-3)' : 'var(--ink-2)',
                        textDecoration: t.done ? 'line-through' : 'none',
                      }}>
                        <span style={{
                          width: 10, height: 10, borderRadius: 99,
                          background: t.done ? c.color : 'transparent',
                          border: '1.2px solid ' + (t.done ? c.color : 'var(--line-2)'),
                          flexShrink: 0,
                        }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                      </div>
                    ))
                  )}
                  {catTasks.length > 5 && (
                    <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)', marginTop: 4 }}>
                      + {catTasks.length - 5} more in the Tasks tab
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Mobile layout — Flow tab body
// ─────────────────────────────────────────────────────────────
function MobileFlowBody({ ctx }) {
  const { schedule, cur, curTasks, now, exactTime,
          onToggle, onAdd, onRebalance, onReorderCurrent, onRestore } = ctx;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '12px 16px 16px' }}>
      <MobileRibbon now={now} exactTime={exactTime} cats={schedule} />
      <CurrentCard cat={cur} tasks={curTasks} now={now} exactTime={exactTime}
        onToggle={onToggle} onAdd={onAdd} onRebalance={onRebalance}
        onReorder={onReorderCurrent}
        onRestore={onRestore}
        slipped={ctx.slipped} compact />
      <UpNextList ctx={ctx} max={4} />
      <ProtectedMoments
        events={ctx.events || []}
        onAdd={ctx.addEvent} onRemove={ctx.removeEvent} />
    </div>
  );
}

// Protected moments (calendar events) — add/delete/edit inline
function AddEventForm({ onAdd, onCancel }) {
  const [label, setLabel] = React.useState('');
  const [time, setTime] = React.useState('14:00');
  const [duration, setDuration] = React.useState(0.5);
  const submit = () => {
    if (!label.trim()) return;
    const [h, m] = time.split(':').map(Number);
    const t = h + (m || 0) / 60;
    if (t < DAY_START || t > DAY_END) return;
    onAdd({ id: 'e' + Date.now().toString(36), label: label.trim(), time: t, duration });
    onCancel();
  };
  return (
    <div className="fc-pop" style={{
      padding: 12, borderRadius: 12,
      background: 'var(--paper)', border: '1px solid var(--ink)',
      boxShadow: '0 0 0 4px color-mix(in oklch, var(--ink) 10%, transparent)',
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <input value={label} onChange={e => setLabel(e.target.value)}
        autoFocus placeholder="event name"
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') onCancel(); }}
        style={{
          background: 'transparent', border: 'none', outline: 'none',
          fontFamily: 'inherit', fontSize: 13, color: 'var(--ink)', padding: '4px 0',
        }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <input type="time" value={time} min="08:00" max="22:00"
          onChange={e => setTime(e.target.value)}
          style={{
            padding: '5px 8px', borderRadius: 8,
            background: 'var(--paper-2)', border: '1px solid var(--line-2)',
            fontFamily: 'inherit', fontSize: 11.5, color: 'var(--ink)',
            outline: 'none',
          }} />
        <div style={{ display: 'inline-flex', padding: 2, borderRadius: 99, background: 'var(--paper-2)', border: '1px solid var(--line)' }}>
          {[
            { v: 0.25, l: '15m' },
            { v: 0.5,  l: '30m' },
            { v: 1,    l: '1h' },
            { v: 1.5,  l: '1.5h' },
          ].map(o => (
            <button key={o.v} onClick={() => setDuration(o.v)} style={{
              padding: '4px 9px', borderRadius: 99,
              background: duration === o.v ? 'var(--ink)' : 'transparent',
              color: duration === o.v ? 'var(--paper)' : 'var(--ink-3)',
              border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 11,
            }}>{o.l}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={{
          padding: '5px 10px', borderRadius: 99,
          background: 'transparent', border: '1px solid var(--line-2)',
          color: 'var(--ink-2)', fontSize: 11.5, fontFamily: 'inherit', cursor: 'pointer',
        }}>Cancel</button>
        <button onClick={submit} style={{
          padding: '5px 12px', borderRadius: 99,
          background: 'var(--ink)', border: 'none',
          color: 'var(--paper)', fontSize: 11.5, fontFamily: 'inherit', cursor: 'pointer',
        }}>Add</button>
      </div>
    </div>
  );
}

function ProtectedMoments({ events, onAdd, onRemove }) {
  const [adding, setAdding] = React.useState(false);
  const [hoverId, setHoverId] = React.useState(null);
  return (
    <div>
      <div style={{
        fontSize: 11, letterSpacing: 0.08, textTransform: 'uppercase',
        color: 'var(--ink-3)', marginBottom: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--ink-3)' }}>{I.pin}</span>
          <span>protected moments</span>
        </span>
        {!adding && (
          <button onClick={() => setAdding(true)} title="Add event" style={{
            width: 22, height: 22, borderRadius: 99,
            background: 'var(--paper-2)', border: '1px solid var(--line)',
            color: 'var(--ink-2)', cursor: 'pointer', padding: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>{I.plus}</button>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {events.length === 0 && !adding && (
          <div style={{
            padding: '10px 12px', borderRadius: 12,
            background: 'var(--paper-2)', border: '1px dashed var(--line-2)',
            fontSize: 12, color: 'var(--ink-3)',
          }}>No appointments. Click + to add one.</div>
        )}
        {events.map(e => (
          <div key={e.id}
            onMouseEnter={() => setHoverId(e.id)} onMouseLeave={() => setHoverId(null)}
            style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 12,
            background: 'var(--paper)', border: '1px solid var(--line)',
            transition: 'background .12s',
          }}>
            <span style={{ color: 'var(--ink-3)' }}>{I.cal}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.label}</div>
              <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>
                {fmtTime(e.time)}{e.duration ? ' · ' + Math.round(e.duration * 60) + ' min' : ''}
              </div>
            </div>
            <button onClick={() => onRemove(e.id)} title="Remove" style={{
              width: 22, height: 22, borderRadius: 99,
              background: 'transparent', border: 'none',
              cursor: 'pointer', color: 'var(--ink-4)',
              opacity: hoverId === e.id ? 1 : 0,
              transition: 'opacity .15s, color .15s',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              padding: 0,
            }}
              onMouseEnter={ev => ev.currentTarget.style.color = 'var(--ink)'}
              onMouseLeave={ev => ev.currentTarget.style.color = 'var(--ink-4)'}
            >
              <svg width="10" height="10" viewBox="0 0 10 10">
                <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
        {adding && (
          <AddEventForm
            onAdd={onAdd}
            onCancel={() => setAdding(false)}
          />
        )}
      </div>
    </div>
  );
}

// All tasks grouped — "Tasks" tab
function TasksBody({ ctx }) {
  const { tasks, onToggle, onAdd, onReorderCat, catsById, categories } = ctx;
  // Show all known categories in their user-ordered order, plus any orphan
  // catTypes that only exist in tasks.
  const order = (categories || []).map(c => c.id);
  Object.keys(tasks || {}).forEach(k => { if (!order.includes(k)) order.push(k); });

  return (
    <div style={{ padding: '12px 16px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={{ fontSize: 11, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-3)' }}>tasks · all categories</div>
        <h2 className="serif" style={{ margin: '4px 0 4px', fontSize: 24, fontWeight: 500, letterSpacing: -0.02 }}>
          Everything on the table.
        </h2>
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-3)' }}>
          Add to any category. Drag the grip to reorder.
        </p>
      </div>
      {order.map(catType => {
        const meta = (catsById && catsById[catType]) || UNKNOWN_CAT;
        const list = tasks[catType] || [];
        const isOrphan = !(catsById && catsById[catType]);
        return (
          <div key={catType}>
            <div style={{ display:'flex', alignItems:'center', gap: 10, marginBottom: 8 }}>
              <CatDot color={meta.color} size={10} />
              <span style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>{meta.name}</span>
              {isOrphan && (
                <span className="mono" style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 99,
                  background: 'var(--paper-2)', border: '1px dashed var(--line-2)',
                  color: 'var(--ink-3)',
                }}>deleted category</span>
              )}
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>
                {list.filter(t => !t.done).length} open · {list.filter(t => t.done).length} done
              </span>
            </div>
            <SortableList items={list} onReorder={(ids) => onReorderCat(catType, ids)}
              renderRow={(t, p) => (
                <TaskRow t={t} color={meta.color}
                  onToggle={() => onToggle(catType, t.id)}
                  onRestore={ctx.onRestore ? () => ctx.onRestore(t.id) : null}
                  rowProps={p.rowProps} dragHandleProps={p.handleProps}
                  isDragging={p.isDragging} />
              )} />
            {!isOrphan && (
              <div style={{ marginTop: 6 }}>
                <AddTaskInline catColor={meta.color} catName={(meta.name || meta.short).toLowerCase()}
                  onAdd={(title) => onAdd(catType, title)} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AddTaskInline({ onAdd, catColor, catName }) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const submit = () => { if (draft.trim()) onAdd(draft.trim()); setDraft(''); setEditing(false); };
  if (!editing) {
    return (
      <button onClick={() => setEditing(true)} style={{
        display:'flex', alignItems:'center', gap: 8,
        padding: '9px 12px', border: '1px dashed var(--line-2)',
        background: 'transparent', borderRadius: 12,
        color: 'var(--ink-3)', fontSize: 12.5, cursor: 'pointer',
        fontFamily: 'inherit',
      }}>
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>{I.plus}</span>
        <span>add to</span>
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '2px 9px 2px 8px', borderRadius: 99,
          background: 'color-mix(in oklch, ' + catColor + ' 22%, transparent)',
          color: 'var(--ink)', fontWeight: 500, fontSize: 11.5,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: catColor }} />
          {catName}
        </span>
      </button>
    );
  }
  return (
    <div style={{
      display:'flex', alignItems:'center', gap: 8,
      padding: '6px 10px', border: '1px solid ' + catColor,
      background: 'var(--paper)', borderRadius: 12,
    }}>
      <span style={{ width: 18, height: 18, borderRadius: 99, border: '1.5px solid var(--line-2)' }} />
      <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setEditing(false); setDraft(''); } }}
        onBlur={submit}
        placeholder={'add to ' + catName}
        style={{
          flex: 1, border: 'none', outline: 'none', background: 'transparent',
          fontFamily: 'inherit', fontSize: 13.5, color: 'var(--ink)', padding: '8px 0',
        }} />
    </div>
  );
}

// "You" tab — settings + reset + welcome restart
function YouBody({ ctx, onReset, templateId, onRestartWelcome, onOpenTemplates, onOpenSettings }) {
  return (
    <div style={{ padding: '12px 16px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={{ fontSize: 11, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-3)' }}>you</div>
        <h2 className="serif" style={{ margin: '4px 0 4px', fontSize: 24, fontWeight: 500, letterSpacing: -0.02 }}>
          Settings.
        </h2>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap: 14, padding: 14, borderRadius: 14, background: 'var(--paper)', border: '1px solid var(--line)' }}>
        <Toggle on={ctx.exactTime} onChange={ctx.setExactTime}
          label={ctx.exactTime ? 'Exact times' : 'Soft windows'}
          sub={ctx.exactTime ? 'Categories show hard times' : 'Categories show as windows'} />
        <Toggle on={ctx.liveMode} onChange={ctx.setLiveMode}
          label={ctx.liveMode ? 'Live clock' : 'Demo time'}
          sub={ctx.liveMode ? 'Following your device clock' : 'Scrub time from the top bar'} />
      </div>

      <div>
        <div style={{ fontSize: 11, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>
          active template
        </div>
        <div style={{ padding: 12, borderRadius: 12, background: 'var(--paper)', border: '1px solid var(--line)' }}>
          <div style={{ fontSize: 14, color: 'var(--ink)' }}>{TEMPLATES_MVP[templateId]?.name || 'Workday'}</div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>{TEMPLATES_MVP[templateId]?.blurb}</div>
        </div>
      </div>

      <CategoryLegend categories={ctx.categories} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button onClick={onOpenSettings} style={{
          alignSelf: 'flex-start',
          padding: '8px 14px', borderRadius: 99,
          background: 'var(--ink)', border: 'none',
          color: 'var(--paper)', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>{I.spark} Edit categories</button>
        <button onClick={onOpenTemplates} style={{
          alignSelf: 'flex-start',
          padding: '8px 14px', borderRadius: 99,
          background: 'var(--paper)', border: '1px solid var(--line-2)',
          color: 'var(--ink)', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}>{I.arrow} Browse templates</button>
        <button onClick={onRestartWelcome} style={{
          alignSelf: 'flex-start',
          padding: '8px 14px', borderRadius: 99,
          background: 'transparent', border: '1px solid var(--line-2)',
          color: 'var(--ink-2)', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
        }}>Replay welcome</button>
        <button onClick={onReset} style={{
          alignSelf: 'flex-start',
          padding: '8px 14px', borderRadius: 99,
          background: 'transparent', border: '1px solid var(--line-2)',
          color: 'var(--ink-2)', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
        }}>Reset everything</button>
      </div>

      <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ink-4)' }}>
        FlowCal · MVP · everything saved locally on this device
      </p>
    </div>
  );
}

// Templates body for mobile tab (full panel inline)
function TemplatesBody({ ctx, templateId, onApply }) {
  return (
    <div style={{ height: '100%' }}>
      <TemplatesPanel inline
        templates={Object.values(TEMPLATES_MVP).map(t => ({
          id: t.id, name: t.name, blurb: t.blurb,
          bands: t.slots.map(([c]) => c),
        }))}
        picked={templateId}
        onApply={onApply}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Bottom tab bar (mobile)
// ─────────────────────────────────────────────────────────────
function BottomTabs({ tab, setTab }) {
  const tabs = [
    { id: 'flow', label: 'Flow' },
    { id: 'week', label: 'Week' },
    { id: 'tasks', label: 'Tasks' },
    { id: 'you', label: 'You' },
  ];
  return (
    <div style={{
      padding: '10px 12px 14px',
      borderTop: '1px solid var(--line)',
      background: 'color-mix(in oklch, var(--paper) 92%, transparent)',
      backdropFilter: 'blur(8px)',
      display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      position: 'sticky', bottom: 0, zIndex: 5,
    }}>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{
          display:'flex', flexDirection:'column', alignItems:'center', gap:4,
          padding: '4px 12px', borderRadius: 10,
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: tab === t.id ? 'var(--ink)' : 'var(--ink-3)',
          fontFamily: 'inherit', fontSize: 11,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: 99,
            background: tab === t.id ? 'var(--ink)' : 'var(--ink-4)',
            opacity: tab === t.id ? 1 : 0.45,
          }} />
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Interactive Categories panel — drag-reorder, inline edit, color pick, add/delete
// ─────────────────────────────────────────────────────────────
function CategoryColorSwatch({ color, onPick, palette, active }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      <button onClick={() => setOpen(o => !o)} title="Change color" style={{
        width: 32, height: 32, borderRadius: 10,
        background: color, border: 'none', cursor: 'pointer',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08), 0 1px 2px rgba(40,30,20,0.05)',
        position: 'relative', padding: 0,
      }}>
        <span style={{
          position: 'absolute', right: -2, bottom: -2,
          width: 12, height: 12, borderRadius: 99,
          background: 'var(--paper)', border: '1px solid var(--line-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 7, color: 'var(--ink-3)',
        }}>▾</span>
      </button>
      {open && (
        <div className="fc-pop" style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 8, zIndex: 30,
          background: 'var(--paper)', border: '1px solid var(--line)',
          borderRadius: 14, padding: 10,
          boxShadow: '0 14px 36px -10px rgba(40,30,20,0.25)',
          display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8,
          width: 210,
        }}>
          {palette.map(c => (
            <button key={c} onClick={(e) => { e.stopPropagation(); onPick(c); setOpen(false); }} style={{
              width: 30, height: 30, borderRadius: 9,
              background: c, cursor: 'pointer', padding: 0,
              border: color === c ? '2px solid var(--ink)' : '1px solid var(--line-2)',
              boxShadow: color === c ? '0 0 0 3px color-mix(in oklch, var(--ink) 12%, transparent)' : 'none',
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryEditor({ cat, onChange, onDelete, dragHandleProps, rowProps, isDragging, palette }) {
  return (
    <div {...rowProps} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 14px', borderRadius: 14,
      background: isDragging ? 'var(--paper-2)' : 'var(--paper)',
      border: '1px solid var(--line)',
      opacity: isDragging ? 0.4 : 1,
      transition: 'opacity .15s, background .15s',
      position: 'relative',
      flexWrap: 'wrap',
    }}>
      <span {...dragHandleProps} style={{
        color: 'var(--ink-4)', cursor: 'grab', touchAction: 'none',
        padding: '4px 2px', display: 'inline-flex',
      }}>{I.grip}</span>

      <CategoryColorSwatch color={cat.color}
        onPick={(c) => onChange({ ...cat, color: c })}
        palette={palette} />

      <div style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <input
          value={cat.name}
          onChange={e => onChange({ ...cat, name: e.target.value })}
          placeholder="Category name"
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            fontFamily: 'inherit', fontSize: 15, color: 'var(--ink)',
            fontWeight: 500, padding: '3px 4px',
            borderRadius: 5,
            transition: 'background .12s',
          }}
          onFocus={e => e.target.style.background = 'var(--paper-2)'}
          onBlur={e => e.target.style.background = 'transparent'}
        />
        <input
          value={cat.hint || ''}
          onChange={e => onChange({ ...cat, hint: e.target.value })}
          placeholder="a short description"
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            fontFamily: 'inherit', fontSize: 12, color: 'var(--ink-3)',
            padding: '3px 4px',
            borderRadius: 5,
            transition: 'background .12s',
          }}
          onFocus={e => e.target.style.background = 'var(--paper-2)'}
          onBlur={e => e.target.style.background = 'transparent'}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10.5, color: 'var(--ink-4)', whiteSpace: 'nowrap' }} className="mono">short</span>
        <input
          value={cat.short}
          onChange={e => onChange({ ...cat, short: e.target.value })}
          maxLength={10}
          style={{
            width: 78, padding: '6px 10px',
            background: 'var(--paper-2)', border: '1px solid var(--line)',
            borderRadius: 99, outline: 'none',
            fontFamily: 'inherit', fontSize: 11.5, color: 'var(--ink-2)',
            textAlign: 'center',
          }}
        />
      </div>

      <button onClick={onDelete} title="Delete category" style={{
        width: 30, height: 30, borderRadius: 99,
        background: 'transparent', border: '1px solid var(--line-2)',
        cursor: 'pointer', color: 'var(--ink-3)',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        padding: 0, flexShrink: 0,
        transition: 'background .12s, color .12s, border-color .12s',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--paper-2)'; e.currentTarget.style.color = 'var(--ink)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-3)'; }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12">
          <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

function CategoriesPanel({ categories, setCategories, onClose }) {
  const updateCat = (id, newCat) =>
    setCategories(prev => prev.map(c => c.id === id ? newCat : c));
  const deleteCat = (id) => {
    if (typeof window !== 'undefined' && !window.confirm('Delete this category? Its tasks are kept but won\'t appear on the flow until you re-add a matching category.')) return;
    setCategories(prev => prev.filter(c => c.id !== id));
  };
  const addCat = () => {
    const id = 'cat-' + Date.now().toString(36);
    setCategories(prev => [...prev, {
      id, name: 'New category', short: 'New',
      color: CAT_PALETTE[prev.length % CAT_PALETTE.length],
      hint: '',
    }]);
  };
  const onReorder = (newIds) => {
    setCategories(prev => {
      const map = Object.fromEntries(prev.map(c => [c.id, c]));
      return newIds.map(id => map[id]).filter(Boolean);
    });
  };
  const resetCats = () => {
    if (typeof window !== 'undefined' && !window.confirm('Reset categories to the FlowCal defaults?')) return;
    setCategories(DEFAULT_CATEGORIES);
  };

  return (
    <div style={{
      width: '100%', height: '100%', background: 'var(--paper)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '22px 26px 16px',
        borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-3)' }}>
            settings · categories
          </div>
          <h2 className="serif" style={{ margin: '6px 0 4px', fontSize: 28, fontWeight: 500, letterSpacing: -0.02 }}>
            Your categories.
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)', maxWidth: 520 }}>
            The shapes you sort your day into. Drag to reorder. Tap any field to edit. The change flows through the timeline and templates right away.
          </p>
        </div>
        {onClose && <GhostBtn onClick={onClose}>Close</GhostBtn>}
      </div>

      <div style={{ padding: 18, flex: 1, overflow: 'auto' }}>
        <SortableList items={categories} onReorder={onReorder} gap={8}
          renderRow={(c, p) => (
            <CategoryEditor cat={c}
              onChange={(nc) => updateCat(c.id, nc)}
              onDelete={() => deleteCat(c.id)}
              dragHandleProps={p.handleProps}
              rowProps={p.rowProps}
              isDragging={p.isDragging}
              palette={CAT_PALETTE} />
          )} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <button onClick={addCat} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '9px 14px', borderRadius: 99,
            background: 'var(--ink)', border: 'none',
            color: 'var(--paper)', fontSize: 13, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>{I.plus} New category</button>
          <button onClick={resetCats} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '9px 14px', borderRadius: 99,
            background: 'transparent', border: '1px dashed var(--line-2)',
            color: 'var(--ink-2)', fontSize: 13, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>Reset to defaults</button>
        </div>

        <p style={{
          margin: '18px 0 0', padding: '12px 14px', borderRadius: 12,
          fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.5,
          background: 'var(--paper-2)', border: '1px solid var(--line)',
        }}>
          <strong style={{ color: 'var(--ink-2)', fontWeight: 600 }}>Heads up:</strong> templates reference categories
          by id. If you delete a category that a template uses, the slot will show as a neutral block until you re-add
          a category with the same id, or pick a different template.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Settings overlay — now wraps the interactive CategoriesPanel
// ─────────────────────────────────────────────────────────────
function SettingsOverlay({ categories, setCategories, onClose, active = true }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 60,
      background: 'color-mix(in oklch, var(--ink) 30%, transparent)',
      display: 'flex', alignItems: 'stretch', justifyContent: 'center', padding: 28,
      opacity: active ? 1 : 0,
      transition: 'opacity 220ms ease-out',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 820, borderRadius: 22, overflow: 'hidden',
        border: '1px solid var(--line)',
        boxShadow: '0 30px 80px -30px rgba(0,0,0,0.35)',
        opacity: active ? 1 : 0,
        transform: active ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.97)',
        transition: 'opacity 220ms cubic-bezier(.2,.7,.3,1), transform 220ms cubic-bezier(.2,.7,.3,1)',
      }}>
        <CategoriesPanel
          categories={categories}
          setCategories={setCategories}
          onClose={onClose} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Onboarding (first run) — 4 steps over the app
// ─────────────────────────────────────────────────────────────
function OnboardingStepper({ step, total }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} style={{
          height: 3, width: i === step ? 28 : 14,
          borderRadius: 99,
          background: i <= step ? 'var(--ink)' : 'var(--line-2)',
          transition: 'width .2s, background .2s',
        }} />
      ))}
    </div>
  );
}

function MiniRibbon({ templateId, height = 12, catsById }) {
  const schedule = React.useMemo(() => buildSchedule(templateId, catsById || CAT_TYPES), [templateId, catsById]);
  const grad = buildGradient(schedule, DAY_START, DAY_END);
  return (
    <div style={{
      height, borderRadius: height / 2,
      background: grad.replace('to bottom', 'to right'),
      boxShadow: 'inset 0 0 0 1px var(--line)',
    }} />
  );
}

function Onboarding({ initialTemplate, initialExact, catsById, onComplete, onSkip, active = true }) {
  const [step, setStep] = React.useState(0);
  const [picked, setPicked] = React.useState(initialTemplate || 'workday');
  const [exact, setExact] = React.useState(!!initialExact);
  const total = 4;

  const next = () => setStep(s => Math.min(s + 1, total - 1));
  const prev = () => setStep(s => Math.max(s - 1, 0));
  const finish = () => onComplete({ templateId: picked, exactTime: exact });

  const templates = Object.values(TEMPLATES_MVP);

  const stepBody = step === 0 ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'flex-start' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{
          width: 36, height: 36, borderRadius: 11,
          background: 'conic-gradient(from 200deg, var(--cat-focus), var(--cat-meal), var(--cat-movement), var(--cat-social), var(--cat-winddown), var(--cat-focus))',
          boxShadow: 'inset 0 0 0 3px var(--paper)',
        }} />
        <span className="serif" style={{ fontSize: 22, letterSpacing: -0.01 }}>FlowCal</span>
      </div>
      <h1 className="serif" style={{
        margin: 0, fontSize: 'clamp(34px, 5vw, 52px)', lineHeight: 1.02,
        fontWeight: 500, letterSpacing: -0.025, maxWidth: 620,
      }}>
        A daily flow,<br/>not a schedule.
      </h1>
      <p style={{ margin: 0, fontSize: 16, color: 'var(--ink-2)', maxWidth: 560, lineHeight: 1.5 }}>
        FlowCal organizes your day into soft windows — focus, meals, errands, wind&nbsp;down — so you always know
        roughly where you are. No precise times unless you want them. No shame when things slip.
      </p>
      <div style={{ width: '100%', maxWidth: 560, marginTop: 8 }}>
        <MiniRibbon templateId="workday" height={20} catsById={catsById} />
        <div style={{ display:'flex', justifyContent:'space-between', marginTop: 6,
          fontSize: 11, color: 'var(--ink-3)' }} className="mono">
          <span>morning</span><span>midday</span><span>evening</span><span>wind down</span>
        </div>
      </div>
    </div>
  ) : step === 1 ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={{ fontSize: 11, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-3)' }}>step 1 · choose a shape</div>
        <h2 className="serif" style={{ margin: '6px 0 4px', fontSize: 32, fontWeight: 500, letterSpacing: -0.02 }}>
          Pick a starting flow.
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-3)' }}>
          Templates suggest categories — they're a starting point, not a rule. You can change anytime.
        </p>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12,
        maxHeight: 360, overflow: 'auto', paddingRight: 4,
      }} className="nb">
        {templates.map(t => {
          const isSel = picked === t.id;
          return (
            <button key={t.id} onClick={() => setPicked(t.id)} style={{
              textAlign: 'left', cursor: 'pointer',
              border: '1px solid ' + (isSel ? 'var(--ink)' : 'var(--line)'),
              borderRadius: 16, padding: 14, fontFamily: 'inherit',
              background: 'var(--paper)',
              display: 'flex', flexDirection: 'column', gap: 10,
              boxShadow: isSel ? '0 0 0 4px color-mix(in oklch, var(--ink) 10%, transparent)' : 'none',
            }}>
              <MiniRibbon templateId={t.id} height={16} catsById={catsById} />
              <div>
                <div className="serif" style={{ fontSize: 17, lineHeight: 1.1 }}>{t.name}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>{t.blurb}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  ) : step === 2 ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <div style={{ fontSize: 11, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-3)' }}>step 2 · how time feels</div>
        <h2 className="serif" style={{ margin: '6px 0 4px', fontSize: 32, fontWeight: 500, letterSpacing: -0.02 }}>
          How would you like to see time?
        </h2>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-3)' }}>
          You can switch any time from the top bar.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {[
          { id: false, name: 'Soft windows', tag: 'recommended', desc: 'Categories feel like tides — "around lunch", "afternoon focus". The default for everyday flow.', example: 'Afternoon focus · 2-hour window' },
          { id: true,  name: 'Exact times',  tag: '',            desc: 'Hard times like "1:30 pm – 3:15 pm" — better when you coordinate with others or have hard appointments.', example: 'Afternoon focus · 1:30 pm – 3:15 pm' },
        ].map(o => {
          const isSel = exact === o.id;
          return (
            <button key={String(o.id)} onClick={() => setExact(o.id)} style={{
              textAlign: 'left', cursor: 'pointer',
              border: '1px solid ' + (isSel ? 'var(--ink)' : 'var(--line)'),
              borderRadius: 18, padding: 18, fontFamily: 'inherit',
              background: 'var(--paper)',
              display: 'flex', flexDirection: 'column', gap: 8,
              boxShadow: isSel ? '0 0 0 4px color-mix(in oklch, var(--ink) 10%, transparent)' : 'none',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                <span className="serif" style={{ fontSize: 20, fontWeight: 500 }}>{o.name}</span>
                {o.tag && (
                  <span className="mono" style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 99,
                    background: 'var(--paper-2)', border: '1px solid var(--line)',
                    color: 'var(--ink-3)',
                  }}>{o.tag}</span>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.5 }}>{o.desc}</div>
              <div className="mono" style={{
                marginTop: 6, fontSize: 11, color: 'var(--ink-3)',
                padding: '8px 10px', borderRadius: 8,
                background: 'var(--paper-2)', border: '1px dashed var(--line-2)',
              }}>{o.example}</div>
            </button>
          );
        })}
      </div>
    </div>
  ) : (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'flex-start' }}>
      <div style={{ fontSize: 11, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-3)' }}>step 3 · ready</div>
      <h2 className="serif" style={{
        margin: 0, fontSize: 'clamp(30px, 4.5vw, 48px)',
        fontWeight: 500, letterSpacing: -0.025, lineHeight: 1.05,
      }}>
        You're set.
      </h2>
      <p style={{ margin: 0, fontSize: 15, color: 'var(--ink-2)', maxWidth: 540, lineHeight: 1.5 }}>
        FlowCal will follow along as the day moves. You can rebalance whenever something slips, switch templates,
        or replay this welcome any time from the You tab.
      </p>
      <div style={{
        padding: 16, borderRadius: 14, background: 'var(--paper-2)', border: '1px solid var(--line)',
        width: '100%', maxWidth: 540, display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11.5, color: 'var(--ink-3)', minWidth: 80 }}>template</span>
          <span style={{ fontSize: 13.5, color: 'var(--ink)' }} className="serif">{TEMPLATES_MVP[picked]?.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11.5, color: 'var(--ink-3)', minWidth: 80 }}>time mode</span>
          <span style={{ fontSize: 13.5, color: 'var(--ink)' }} className="serif">{exact ? 'Exact times' : 'Soft windows'}</span>
        </div>
        <div style={{ marginTop: 4 }}><MiniRibbon templateId={picked} height={14} catsById={catsById} /></div>
      </div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'var(--paper)',
      display: 'flex', flexDirection: 'column',
      fontFamily: '"Geist", system-ui, sans-serif',
      opacity: active ? 1 : 0,
      transition: 'opacity 260ms ease-out',
    }}>
      {/* soft ambient gradient */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(60% 50% at 50% 0%, color-mix(in oklch, var(--cat-focus) 14%, var(--paper)) 0%, var(--paper) 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative', zIndex: 2,
        padding: '20px 28px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <OnboardingStepper step={step} total={total} />
        <button onClick={onSkip} style={{
          background: 'transparent', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 12.5, color: 'var(--ink-3)',
          padding: 6,
        }}>Skip for now</button>
      </div>

      <div style={{
        position: 'relative', zIndex: 2, flex: 1, minHeight: 0,
        overflow: 'auto',
        padding: '12px 28px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ width: '100%', maxWidth: 760 }}>{stepBody}</div>
      </div>

      <div style={{
        position: 'relative', zIndex: 2,
        padding: '14px 22px 22px',
        borderTop: '1px solid var(--line)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'color-mix(in oklch, var(--paper-2) 60%, transparent)',
        gap: 12,
      }}>
        <GhostBtn onClick={prev} style={{ visibility: step === 0 ? 'hidden' : 'visible' }}>← Back</GhostBtn>
        {step < total - 1 ? (
          <PrimaryBtn onClick={next}>{I.arrow} Next</PrimaryBtn>
        ) : (
          <PrimaryBtn onClick={finish}>{I.spark} Start flowing</PrimaryBtn>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Week view — 7 days, per-day template assignment
// ─────────────────────────────────────────────────────────────
const DEFAULT_WEEK_TPLS = {
  0: 'weekend', 1: 'workday', 2: 'workday', 3: 'workday',
  4: 'workday', 5: 'workday', 6: 'weekend',
};

function buildWeekDays() {
  const today = new Date();
  const dow = today.getDay();
  // Monday-start week
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const start = new Date(today);
  start.setDate(today.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return {
      date: d,
      dow: d.getDay(),
      isToday: d.toDateString() === today.toDateString(),
      isPast: d < new Date(today.getFullYear(), today.getMonth(), today.getDate()),
      shortName: d.toLocaleDateString(undefined, { weekday: 'short' }),
      dayNum: d.getDate(),
    };
  });
}

function WeekDayColumn({ day, templateId, onPick, now, isMobile, taskCounts, exactTime, catsById }) {
  const schedule = React.useMemo(() => buildSchedule(templateId, catsById || CAT_TYPES), [templateId, catsById]);
  const tpl = TEMPLATES_MVP[templateId];
  const [menuOpen, setMenuOpen] = React.useState(false);
  const grad = buildGradient(schedule, DAY_START, DAY_END);

  // count tasks for the day (proxy: union of categories used in the template)
  const usedCats = [...new Set(schedule.map(s => s.catType))];
  const open = usedCats.reduce((a, c) => a + (taskCounts[c]?.open || 0), 0);
  const done = usedCats.reduce((a, c) => a + (taskCounts[c]?.done || 0), 0);

  if (isMobile) {
    return (
      <div style={{
        padding: 14, borderRadius: 14,
        background: day.isToday ? 'color-mix(in oklch, var(--cat-focus) 10%, var(--paper))' : 'var(--paper)',
        border: '1px solid ' + (day.isToday ? 'var(--ink)' : 'var(--line)'),
        opacity: day.isPast ? 0.55 : 1,
        position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{
              fontSize: 11, letterSpacing: 0.08, textTransform: 'uppercase',
              color: day.isToday ? 'var(--ink)' : 'var(--ink-3)', fontWeight: 600,
            }}>{day.shortName}</span>
            <span className="serif" style={{
              fontSize: 22, color: 'var(--ink)', fontWeight: 500,
            }}>{day.dayNum}</span>
            {day.isToday && (
              <span className="mono" style={{
                fontSize: 10, padding: '2px 7px', borderRadius: 99,
                background: 'var(--ink)', color: 'var(--paper)',
              }}>today</span>
            )}
          </div>
          <button onClick={() => setMenuOpen(o => !o)} style={{
            background: 'var(--paper-2)', border: '1px solid var(--line)',
            padding: '5px 10px', borderRadius: 99, cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 11.5, color: 'var(--ink-2)',
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>{tpl?.name} {I.chevD}</button>
        </div>

        <div style={{ position: 'relative', height: 14, borderRadius: 7, background: grad.replace('to bottom', 'to right'), boxShadow: 'inset 0 0 0 1px var(--line)' }}>
          {day.isToday && (
            <div style={{
              position: 'absolute', left: `${pctOf(now)}%`, top: -4, bottom: -4,
              width: 2, background: 'var(--ink)', borderRadius: 99,
            }} />
          )}
        </div>

        <div style={{
          marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 11.5, color: 'var(--ink-3)',
        }} className="mono">
          <span>{open} open · {done} done</span>
          <span>{schedule.length} blocks</span>
        </div>

        {menuOpen && (
          <TemplateMiniMenu currentId={templateId}
            onPick={(id) => { onPick(id); setMenuOpen(false); }}
            onClose={() => setMenuOpen(false)} />
        )}
      </div>
    );
  }

  // desktop column
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 10,
      padding: 12, borderRadius: 16,
      background: day.isToday ? 'color-mix(in oklch, var(--cat-focus) 7%, var(--paper))' : 'var(--paper)',
      border: '1px solid ' + (day.isToday ? 'var(--ink)' : 'var(--line)'),
      opacity: day.isPast ? 0.55 : 1,
      minWidth: 0, position: 'relative',
      boxShadow: day.isToday ? '0 0 0 4px color-mix(in oklch, var(--ink) 8%, transparent)' : 'none',
    }}>
      <div>
        <div style={{
          fontSize: 10.5, letterSpacing: 0.1, textTransform: 'uppercase',
          color: day.isToday ? 'var(--ink)' : 'var(--ink-3)', fontWeight: 600,
        }}>{day.shortName}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span className="serif" style={{ fontSize: 26, fontWeight: 500, letterSpacing: -0.02 }}>{day.dayNum}</span>
          {day.isToday && (
            <span className="mono" style={{
              fontSize: 10, padding: '2px 7px', borderRadius: 99,
              background: 'var(--ink)', color: 'var(--paper)',
            }}>today</span>
          )}
        </div>
      </div>

      <button onClick={() => setMenuOpen(o => !o)} style={{
        background: 'var(--paper-2)', border: '1px solid var(--line)',
        padding: '6px 10px', borderRadius: 99, cursor: 'pointer',
        fontFamily: 'inherit', fontSize: 12, color: 'var(--ink-2)',
        display: 'inline-flex', alignItems: 'center', gap: 5,
        alignSelf: 'flex-start', maxWidth: '100%',
      }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tpl?.name}</span>
        {I.chevD}
      </button>

      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', height: 320, marginTop: 4 }}>
        <div style={{
          width: 12, height: '100%', borderRadius: 6, background: grad,
          boxShadow: 'inset 0 0 0 1px var(--line)',
        }} />
        {day.isToday && (
          <div style={{
            position: 'absolute', top: `${pctOf(now)}%`,
            left: '50%', transform: 'translate(-50%,-50%)',
            display: 'flex', alignItems: 'center', gap: 6,
            pointerEvents: 'none',
          }}>
            <span style={{ width: 28, height: 2, background: 'var(--ink)', borderRadius: 99 }} />
            <span className="mono" style={{
              fontSize: 10.5, padding: '2px 6px', borderRadius: 6,
              background: 'var(--paper)', color: 'var(--ink)',
              border: '1px solid var(--line-2)', whiteSpace: 'nowrap',
            }}>{fmtTime(now)}</span>
          </div>
        )}
      </div>

      <div style={{ display:'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
        <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{open} open · {done} done</div>
        <div style={{
          height: 4, borderRadius: 99,
          background: 'var(--paper-3)', overflow: 'hidden',
        }}>
          <div style={{
            width: (open + done) ? `${(done / (open + done)) * 100}%` : '0%',
            height: '100%', background: 'var(--ink-2)',
            transition: 'width .25s',
          }} />
        </div>
      </div>

      {menuOpen && (
        <TemplateMiniMenu currentId={templateId}
          onPick={(id) => { onPick(id); setMenuOpen(false); }}
          onClose={() => setMenuOpen(false)} />
      )}
    </div>
  );
}

function TemplateMiniMenu({ currentId, onPick, onClose }) {
  React.useEffect(() => {
    const onDoc = (e) => {
      if (!e.target.closest('[data-tpl-menu]')) onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [onClose]);
  return (
    <div data-tpl-menu className="fc-pop" style={{
      position: 'absolute', top: 56, left: 12, right: 12, zIndex: 20,
      background: 'var(--paper)', borderRadius: 12,
      border: '1px solid var(--line)',
      boxShadow: '0 12px 36px -10px rgba(40,30,20,0.25)',
      padding: 5, display: 'flex', flexDirection: 'column', gap: 2,
    }}>
      {Object.values(TEMPLATES_MVP).map(t => (
        <button key={t.id} onClick={(e) => { e.stopPropagation(); onPick(t.id); }} style={{
          padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
          background: currentId === t.id ? 'var(--paper-2)' : 'transparent',
          border: 'none', textAlign: 'left',
          fontFamily: 'inherit', fontSize: 12.5,
          color: 'var(--ink)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ width: 10, height: 10, borderRadius: 99,
            background: currentId === t.id ? 'var(--ink)' : 'var(--line-2)',
            flexShrink: 0,
          }} />
          {t.name}
        </button>
      ))}
    </div>
  );
}

function WeekView({ ctx, weekTpls, setWeekTpls, isMobile }) {
  const { tasks, now, catsById } = ctx;
  const days = React.useMemo(buildWeekDays, []);

  // task counts per category type
  const taskCounts = React.useMemo(() => {
    const o = {};
    Object.entries(tasks).forEach(([k, list]) => {
      o[k] = {
        open: (list || []).filter(t => !t.done).length,
        done: (list || []).filter(t => t.done).length,
      };
    });
    return o;
  }, [tasks]);

  const setDayTpl = (dow, id) => {
    setWeekTpls({ ...weekTpls, [dow]: id });
  };

  if (isMobile) {
    return (
      <div style={{ padding: '12px 16px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-3)' }}>week · the shape of it</div>
          <h2 className="serif" style={{ margin: '4px 0 4px', fontSize: 26, fontWeight: 500, letterSpacing: -0.02 }}>
            This week.
          </h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>
            Assign a template to each day. Pre-shape the week.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {days.map(d => (
            <WeekDayColumn key={d.dow} day={d}
              templateId={weekTpls[d.dow] || 'workday'}
              onPick={(id) => setDayTpl(d.dow, id)}
              now={now} isMobile taskCounts={taskCounts}
              catsById={catsById} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1, minHeight: 0, padding: '24px 28px',
      display: 'flex', flexDirection: 'column', gap: 16, overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-3)' }}>week · the shape of it</div>
          <h2 className="serif" style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 500, letterSpacing: -0.02 }}>
            This week.
          </h2>
        </div>
        <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
          Pre-shape each day. Tap a day's template to change it.
        </span>
      </div>
      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
        gap: 10, minHeight: 0, overflow: 'auto',
      }} className="nb">
        {days.map(d => (
          <WeekDayColumn key={d.dow} day={d}
            templateId={weekTpls[d.dow] || 'workday'}
            onPick={(id) => setDayTpl(d.dow, id)}
            now={now} taskCounts={taskCounts}
            catsById={catsById} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// View mode toggle (Day / Week)
// ─────────────────────────────────────────────────────────────
function ViewToggle({ viewMode, setViewMode }) {
  return (
    <div style={{
      display: 'inline-flex', padding: 3, borderRadius: 99,
      background: 'var(--paper-2)', border: '1px solid var(--line)',
    }}>
      {['day','week'].map(m => (
        <button key={m} onClick={() => setViewMode(m)} style={{
          padding: '5px 12px', borderRadius: 99,
          background: viewMode === m ? 'var(--ink)' : 'transparent',
          color: viewMode === m ? 'var(--paper)' : 'var(--ink-2)',
          border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 12, textTransform: 'capitalize',
          transition: 'background .15s, color .15s',
        }}>{m}</button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────
function MVPApp() {
  const vp = useViewport();

  const [templateId, setTemplateId] = useLS('template', 'workday');
  const [overrides,  setOverrides]  = useLS('overrides', null);
  const [tasks,      setTasks]      = useLS('tasks', TASKS);
  const [exactTime,  setExactTime]  = useLS('exactTime', false);
  const [liveMode,   setLiveMode]   = useLS('liveMode', false);
  const [demoTime,   setDemoTime]   = useLS('demoTime', 11.4);
  const [viewMode,   setViewMode]   = useLS('viewMode', 'day');
  const [weekTpls,   setWeekTpls]   = useLS('weekTpls', DEFAULT_WEEK_TPLS);
  const [onboarded,  setOnboarded]  = useLS('onboarded', false);
  const [categories, setCategories] = useLS('categories', DEFAULT_CATEGORIES);
  const catsById = React.useMemo(() => makeCatsById(categories), [categories]);
  const [events,     setEvents]     = useLS('events', CAL_EVENTS);

  const addEvent = (e) => setEvents(prev => [...(prev || []), e].sort((a, b) => a.time - b.time));
  const removeEvent = (id) => setEvents(prev => (prev || []).filter(e => e.id !== id));

  const [showRebalance, setShowRebalance] = React.useState(false);
  const [showTemplates, setShowTemplates] = React.useState(false);
  const [showSettings,  setShowSettings]  = React.useState(false);
  const [mobileTab, setMobileTab] = useLS('tab', 'flow');

  const rebalanceA = useAnimatedMount(showRebalance);
  const templatesA = useAnimatedMount(showTemplates);
  const settingsA  = useAnimatedMount(showSettings);
  const onboardA   = useAnimatedMount(!onboarded, 280);

  const clockNow = useClock(liveMode);
  let now = liveMode ? clockNow : demoTime;
  if (now < DAY_START) now = DAY_START + 0.01;
  if (now > DAY_END)   now = DAY_END   - 0.01;

  const schedule = React.useMemo(() => {
    if (overrides && Array.isArray(overrides) && overrides.length) {
      return overrides.map(s => {
        const meta = (catsById && catsById[s.catType]) || CAT_TYPES[s.catType] || UNKNOWN_CAT;
        return { ...s, color: meta.color, short: meta.short, name: meta.name, hint: meta.hint };
      });
    }
    return buildSchedule(templateId, catsById);
  }, [templateId, overrides, catsById]);

  const cur = findCurrent(schedule, now);
  const curTasks = tasks[cur.catType] || [];

  // "slipped" — within the last 8 minutes of the current slot, suggest rebalance
  const slipped = cur && ((cur.end - now) < 8/60) && ((cur.end - now) >= 0) && (cur.id !== schedule[schedule.length - 1].id);

  // task ops -----------------------------------------------------
  const onToggle = (idOrCat, maybeId) => {
    if (maybeId === undefined) {
      const taskId = idOrCat;
      setTasks(prev => ({
        ...prev,
        [cur.catType]: (prev[cur.catType] || []).map(t => t.id === taskId ? { ...t, done: !t.done } : t),
      }));
    } else {
      const [catType, taskId] = [idOrCat, maybeId];
      setTasks(prev => ({
        ...prev,
        [catType]: (prev[catType] || []).map(t => t.id === taskId ? { ...t, done: !t.done } : t),
      }));
    }
  };

  const onAdd = (titleOrCat, maybeTitle) => {
    const isMultiArg = maybeTitle !== undefined;
    const catType = isMultiArg ? titleOrCat : cur.catType;
    const title   = isMultiArg ? maybeTitle : titleOrCat;
    if (!title || !title.trim()) return;
    const id = 'u' + Date.now();
    setTasks(prev => ({
      ...prev,
      [catType]: [...(prev[catType] || []), { id, title: title.trim(), size: 'short', done: false }],
    }));
  };

  // Reorder current category's tasks (CurrentCard signature: only ids)
  const onReorderCurrent = (newIds) => {
    setTasks(prev => {
      const list = prev[cur.catType] || [];
      const byId = Object.fromEntries(list.map(t => [t.id, t]));
      const next = newIds.map(id => byId[id]).filter(Boolean);
      return { ...prev, [cur.catType]: next };
    });
  };
  // Reorder a specific category (TasksBody)
  const onReorderCat = (catType, newIds) => {
    setTasks(prev => {
      const list = prev[catType] || [];
      const byId = Object.fromEntries(list.map(t => [t.id, t]));
      const next = newIds.map(id => byId[id]).filter(Boolean);
      return { ...prev, [catType]: next };
    });
  };

  const applyRebalanceOpt = ({ strategy, taskIds }) => {
    if (['keep', 'ease', 'compress'].includes(strategy)) {
      setOverrides(applyRebalance(schedule, now, strategy));
      return;
    }
    if (strategy === 'shift' || strategy === 'drop') {
      const flagKey = strategy === 'shift' ? 'shifted' : 'deferred';
      const wanted = new Set(taskIds || []);
      setTasks(prev => {
        const next = {};
        for (const [cat, list] of Object.entries(prev || {})) {
          next[cat] = (list || []).map(t => wanted.has(t.id) ? { ...t, [flagKey]: true } : t);
        }
        return next;
      });
    }
  };

  // Un-shift / un-defer a single task by id (we don't know its category).
  const onRestoreTask = (taskId) => {
    setTasks(prev => {
      const next = {};
      for (const [cat, list] of Object.entries(prev || {})) {
        next[cat] = (list || []).map(t => t.id === taskId ? { ...t, shifted: false, deferred: false } : t);
      }
      return next;
    });
  };

  const applyTemplate = (id) => {
    setTemplateId(id);
    setOverrides(null);
    setShowTemplates(false);
    if (vp.isMobile) setMobileTab('flow');
  };

  const onReset = () => {
    if (typeof window !== 'undefined' && !window.confirm('Reset all tasks, schedule, and categories to defaults?')) return;
    setTemplateId('workday');
    setOverrides(null);
    setTasks(TASKS);
    setCategories(DEFAULT_CATEGORIES);
    setEvents(CAL_EVENTS);
  };

  const onRestartWelcome = () => setOnboarded(false);

  const ctx = {
    schedule, cur, curTasks, tasks, now, exactTime, setExactTime,
    isCompact: vp.isCompact, isMobile: vp.isMobile,
    onToggle, onAdd, onRestore: onRestoreTask,
    onReorderCurrent, onReorderCat,
    onRebalance: () => setShowRebalance(true),
    liveMode, setLiveMode, demoTime, setDemoTime,
    slipped,
    categories, setCategories, catsById,
    events, addEvent, removeEvent,
    onOpenSettings: () => setShowSettings(true),
  };

  const onOpenTemplates = () => setShowTemplates(true);

  return (
    <div style={{
      position: 'relative',
      minHeight: '100vh', height: '100vh',
      display: 'flex', flexDirection: 'column',
      background: 'var(--paper)',
      fontFamily: '"Geist", system-ui, sans-serif',
      overflow: 'hidden',
    }}>
      <ScrubBar
        liveMode={liveMode} setLiveMode={setLiveMode}
        demoTime={demoTime} setDemoTime={setDemoTime}
        now={now} currentLabel={cur.short} currentColor={cur.color}
      />
      <AppBar
        exactTime={exactTime} setExactTime={setExactTime}
        onTemplate={() => setShowTemplates(true)}
        onRebalance={() => setShowRebalance(true)}
        onSettings={() => setShowSettings(true)}
        isCompact={vp.isCompact} isMobile={vp.isMobile}
        viewMode={viewMode} setViewMode={setViewMode}
      />

      <div style={{
        flex: 1, minHeight: 0,
        overflow: vp.isMobile ? 'auto' : 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        {vp.isMobile ? (
          <div key={mobileTab} className="fc-tabin" style={{ display: 'contents' }}>
          {
            mobileTab === 'flow'      ? <MobileFlowBody ctx={{...ctx, onReorderCurrent}} /> :
            mobileTab === 'week'      ? <WeekView ctx={ctx} weekTpls={weekTpls} setWeekTpls={setWeekTpls} isMobile /> :
            mobileTab === 'tasks'     ? <TasksBody ctx={ctx} /> :
            mobileTab === 'you'       ? <YouBody ctx={ctx} onReset={onReset} templateId={templateId}
                                                  onRestartWelcome={onRestartWelcome}
                                                  onOpenTemplates={onOpenTemplates}
                                                  onOpenSettings={() => setShowSettings(true)} /> : null
          }
          </div>
        ) : (
          <div key={viewMode} className="fc-tabin" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            {viewMode === 'week'
              ? <WeekView ctx={ctx} weekTpls={weekTpls} setWeekTpls={setWeekTpls} />
              : <DesktopMVP ctx={{...ctx, onReorderCurrent}} />}
          </div>
        )}
      </div>

      {vp.isMobile && <BottomTabs tab={mobileTab} setTab={setMobileTab} />}

      {/* Floating "slipped" toast — desktop only, day view only */}
      {!vp.isMobile && viewMode === 'day' && slipped && !showRebalance && (
        <div className="fc-slide" style={{
          position: 'absolute', bottom: 24, right: 24, zIndex: 4,
          padding: '12px 14px 12px 18px',
          background: 'var(--ink)', color: 'var(--paper)',
          borderRadius: 14, boxShadow: '0 18px 40px -20px rgba(40,30,20,0.5)',
          display: 'flex', alignItems: 'center', gap: 12, maxWidth: 360,
        }}>
          <span style={{ fontSize: 13 }}>You're near the end of {cur.short.toLowerCase()}.</span>
          <button onClick={() => setShowRebalance(true)} style={{
            background: 'var(--paper)', color: 'var(--ink)',
            border: 'none', padding: '6px 12px', borderRadius: 99,
            cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>{I.spark} Rebalance</button>
        </div>
      )}

      {rebalanceA.render && (
        <RebalanceModal cur={cur} active={rebalanceA.active}
          onClose={() => setShowRebalance(false)}
          onApply={applyRebalanceOpt}
          tasks={tasks} schedule={schedule} catsById={catsById} now={now}
        />
      )}
      {templatesA.render && (
        <TemplatesPanel active={templatesA.active}
          onClose={() => setShowTemplates(false)}
          templates={Object.values(TEMPLATES_MVP).map(t => ({
            id: t.id, name: t.name, blurb: t.blurb,
            bands: t.slots.map(([c]) => c),
          }))}
          picked={templateId}
          onApply={applyTemplate}
        />
      )}
      {settingsA.render && (
        <SettingsOverlay active={settingsA.active}
          categories={categories} setCategories={setCategories}
          onClose={() => setShowSettings(false)} />
      )}

      {onboardA.render && (
        <Onboarding active={onboardA.active}
          initialTemplate={templateId}
          initialExact={exactTime}
          catsById={catsById}
          onComplete={({ templateId: tId, exactTime: et }) => {
            setTemplateId(tId);
            setExactTime(et);
            setOverrides(null);
            setOnboarded(true);
          }}
          onSkip={() => setOnboarded(true)}
        />
      )}
    </div>
  );
}

const mvpRoot = ReactDOM.createRoot(document.getElementById('root'));
mvpRoot.render(<MVPApp />);
