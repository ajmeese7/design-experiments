// shared.jsx — tokens, timeline rail, marker, category bands, icons
// Globals exported to window at the bottom.

const CATS = [
  { id: 'focus',    name: 'Morning focus',     short: 'Focus',    color: 'var(--cat-focus)',    start: 8.5,  end: 10.5,
    soft: 'Morning focus',     hint: 'deep work, one thing at a time' },
  { id: 'admin',    name: 'Late morning admin', short: 'Admin',   color: 'var(--cat-admin)',    start: 10.5, end: 11.75,
    soft: 'Late morning admin', hint: 'small messages, small wins' },
  { id: 'break',    name: 'Around lunch',      short: 'Break',    color: 'var(--cat-break)',    start: 11.75, end: 12.5,
    soft: 'Around lunch',      hint: 'a real pause' },
  { id: 'meal',     name: 'Lunch',             short: 'Meal',     color: 'var(--cat-meal)',     start: 12.5, end: 13.25,
    soft: 'Lunch',             hint: 'eat something good' },
  { id: 'movement', name: 'Afternoon walk',    short: 'Move',     color: 'var(--cat-movement)', start: 13.25, end: 13.75,
    soft: 'Afternoon walk',    hint: 'reset the body' },
  { id: 'focus2',   name: 'Afternoon focus',   short: 'Focus',    color: 'var(--cat-focus)',    start: 13.75, end: 15.5,
    soft: 'Afternoon focus',   hint: 'second pass on the proposal' },
  { id: 'chores',   name: 'Early afternoon chores', short: 'Chores', color: 'var(--cat-chores)', start: 15.5, end: 16.5,
    soft: 'Early evening chores', hint: 'low-effort, hands-on' },
  { id: 'errands',  name: 'Errands',           short: 'Errands',  color: 'var(--cat-errands)',  start: 16.5, end: 17.5,
    soft: 'Errands',           hint: 'leave the house if you can' },
  { id: 'social',   name: 'Evening social',    short: 'Social',   color: 'var(--cat-social)',   start: 17.5, end: 19,
    soft: 'Evening social',    hint: 'see a human' },
  { id: 'winddown', name: 'Wind down',         short: 'Wind',     color: 'var(--cat-winddown)', start: 19,   end: 22,
    soft: 'Wind down',         hint: 'low light, slow things' },
];

const TASKS = {
  focus:    [
    { id: 't1', title: 'Draft Q3 proposal — opening + scope', size: 'long',   done: true  },
    { id: 't2', title: 'Review design notes from Tuesday',    size: 'short',  done: true  },
    { id: 't3', title: 'Write implementation outline',         size: 'medium', done: false },
  ],
  admin:    [
    { id: 't4', title: 'Reply to invoices (3)',     size: 'short',  done: false },
    { id: 't5', title: 'Inbox triage',              size: 'medium', done: false },
    { id: 't6', title: 'Update task tracker',       size: 'tiny',   done: false },
  ],
  break:    [
    { id: 't7', title: 'Stretch · tea',             size: 'tiny',   done: false },
  ],
  meal:     [
    { id: 't8', title: 'Lunch — leftovers',         size: 'short',  done: false },
  ],
  movement: [
    { id: 't9', title: 'Walk around the block',     size: 'tiny',   done: false },
  ],
  focus2:   [
    { id: 'ta', title: 'Second pass on proposal',   size: 'long',   done: false },
    { id: 'tb', title: 'Send to Maya for review',   size: 'tiny',   done: false },
  ],
  chores:   [
    { id: 'tc', title: 'Dishes',    size: 'tiny',   done: false },
    { id: 'td', title: 'Laundry',   size: 'short',  done: false },
    { id: 'te', title: 'Trash',     size: 'tiny',   done: false },
  ],
  errands:  [
    { id: 'tf', title: 'Pharmacy pickup', size: 'short', done: false },
    { id: 'tg', title: 'Drop off package', size: 'tiny',  done: false },
  ],
  social:   [
    { id: 'th', title: 'Dinner with R.', size: 'long',   done: false },
  ],
  winddown: [
    { id: 'ti', title: 'Read 20 pages', size: 'short', done: false },
    { id: 'tj', title: 'Lights low · phone away', size: 'tiny', done: false },
  ],
};

const CAL_EVENTS = [
  { id: 'c1', time: 14.0, label: 'Call with Maya', duration: 0.5 },
  { id: 'c2', time: 18.0, label: 'Dinner — R.',    duration: 1.5 },
];

const DAY_START = 8;   // 8:00
const DAY_END   = 22;  // 10:00 pm

function fmtTime(h) {
  const hr = Math.floor(h);
  const m = Math.round((h - hr) * 60);
  const ap = hr >= 12 ? 'pm' : 'am';
  const h12 = ((hr + 11) % 12) + 1;
  return m === 0 ? `${h12}${ap}` : `${h12}:${String(m).padStart(2,'0')}${ap}`;
}
function fmtRange(a, b) { return `${fmtTime(a)} – ${fmtTime(b)}`; }

// gradient stops for a vertical rail spanning DAY_START..DAY_END
function buildGradient(cats, start, end) {
  const span = end - start;
  const stops = [];
  cats.forEach((c, i) => {
    const a = ((c.start - start) / span) * 100;
    const b = ((c.end   - start) / span) * 100;
    // soft transition: each band is core color in the middle, fading 8% at each edge
    stops.push(`${c.color} ${a + 1}%`);
    stops.push(`${c.color} ${b - 1}%`);
  });
  return `linear-gradient(to bottom, ${stops.join(', ')})`;
}

// ─────────────────────────────────────────────────────────────
// Size chip — task duration
// ─────────────────────────────────────────────────────────────
const sizeMeta = {
  tiny:   { label: 'tiny',   mins: '~15 min', dots: 1 },
  short:  { label: 'short',  mins: '~30 min', dots: 2 },
  medium: { label: 'medium', mins: '~60 min', dots: 3 },
  long:   { label: 'long',   mins: '90+ min', dots: 4 },
};
function SizeChip({ size }) {
  const m = sizeMeta[size]; if (!m) return null;
  return (
    <span className="mono" style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: 10.5, color: 'var(--ink-3)',
      padding: '2px 8px', borderRadius: 99,
      background: 'var(--paper-3)',
    }}>
      <span style={{ display:'inline-flex', gap: 2 }}>
        {[0,1,2,3].map(i => (
          <span key={i} style={{
            width: 4, height: 4, borderRadius: 99,
            background: i < m.dots ? 'var(--ink-3)' : 'var(--line-2)',
          }} />
        ))}
      </span>
      <span>{m.mins}</span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Soft category badge (pill)
// ─────────────────────────────────────────────────────────────
function CatDot({ color, size = 8 }) {
  return <span style={{
    display:'inline-block', width:size, height:size, borderRadius: 99,
    background: color, flexShrink: 0,
  }} />;
}
function CatPill({ cat, active = false, size = 'md' }) {
  const pad = size === 'sm' ? '4px 9px' : '6px 12px';
  const fs  = size === 'sm' ? 11 : 12.5;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 8,
      padding: pad, fontSize: fs,
      borderRadius: 99,
      background: active ? 'color-mix(in oklch, ' + cat.color + ' 22%, transparent)' : 'var(--paper-2)',
      color: active ? 'var(--ink)' : 'var(--ink-2)',
      border: active ? '1px solid color-mix(in oklch, ' + cat.color + ' 45%, transparent)' : '1px solid var(--line)',
      whiteSpace: 'nowrap',
    }}>
      <CatDot color={cat.color} />
      {cat.short}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Vertical timeline rail (gradient column + you-are-here marker)
// ─────────────────────────────────────────────────────────────
function pctOf(h, s = DAY_START, e = DAY_END) { return ((h - s) / (e - s)) * 100; }

function TimelineRail({
  now,                 // hours float, e.g. 11.4
  cats = CATS,
  events = [],
  height = 620,
  width = 14,
  showTicks = true,
  showLabels = true,
  showMarker = true,
  showEvents = true,
  highlightId = null,
  fade = false,
}) {
  const grad = buildGradient(cats, DAY_START, DAY_END);
  const nowPct = pctOf(now);

  // Layout: [label gutter 96px] [tick gutter 14px] [rail width px]
  const labelW = showLabels ? 96 : 0;
  const tickGutter = showLabels ? 14 : 0;
  const railLeft = labelW + tickGutter;

  return (
    <div style={{
      position: 'relative', height, width: railLeft + width,
      flexShrink: 0,
    }}>
      {/* rail */}
      <div style={{
        position: 'absolute', left: railLeft, top: 0, bottom: 0,
        width, borderRadius: width / 2,
        background: grad,
        opacity: fade ? 0.55 : 1,
        boxShadow: '0 1px 2px rgba(40,30,20,0.04)',
      }} />

      {/* hour ticks */}
      {showTicks && Array.from({ length: DAY_END - DAY_START + 1 }, (_, i) => DAY_START + i).map(h => {
        const p = pctOf(h);
        const major = h % 3 === 0;
        return (
          <div key={h} style={{
            position: 'absolute', top: `${p}%`,
            left: railLeft - (major ? 12 : 6) - 2,
            width: major ? 12 : 6, height: 1,
            background: 'var(--ink-4)', opacity: major ? 0.45 : 0.22,
            transform: 'translateY(-0.5px)',
          }} />
        );
      })}

      {/* category labels (inside container, right-aligned in left gutter) */}
      {showLabels && cats.map((c, i) => {
        const mid = pctOf((c.start + c.end) / 2);
        const isActive = c.id === highlightId;
        // fade label when the "now" pill is going to overlap it
        const dist = showMarker ? Math.abs(mid - nowPct) : Infinity;
        const fade = dist < 4 ? Math.max(0.18, dist / 4) : 1;
        return (
          <div key={c.id} style={{
            position: 'absolute',
            left: 0, width: labelW,
            top: `${mid}%`,
            transform: 'translateY(-50%)',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
            gap: 8, paddingRight: 4,
            whiteSpace: 'nowrap',
            color: isActive ? 'var(--ink)' : 'var(--ink-2)',
            fontSize: 11, letterSpacing: 0.04, textTransform: 'uppercase',
            fontWeight: isActive ? 600 : 500,
            opacity: fade,
            transition: 'opacity .25s',
          }}>
            {c.short}
          </div>
        );
      })}

      {/* calendar event pins */}
      {showEvents && events.map(e => {
        const top = pctOf(e.time);
        return (
          <div key={e.id} style={{
            position: 'absolute', top: `${top}%`,
            left: railLeft + width + 10,
            transform: 'translateY(-50%)',
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 11, color: 'var(--ink-3)',
            whiteSpace: 'nowrap',
          }}>
            <span style={{
              width: 10, height: 10, borderRadius: 3,
              background: 'var(--paper)',
              border: '1.5px solid var(--ink-3)',
              boxShadow: '0 0 0 3px var(--paper)',
            }} />
            <span className="mono" style={{ fontSize: 10.5 }}>{fmtTime(e.time)}</span>
            <span>· {e.label}</span>
          </div>
        );
      })}

      {/* you are here */}
      {showMarker && (
        <div style={{
          position: 'absolute', top: `${nowPct}%`,
          left: showLabels ? labelW - 28 : -28,
          right: -200,
          transform: 'translateY(-50%)',
          display: 'flex', alignItems: 'center', gap: 10,
          pointerEvents: 'none',
        }}>
          <span className="mono" style={{
            fontSize: 11, color: 'var(--ink)',
            background: 'var(--paper)', padding: '3px 7px',
            borderRadius: 6, border: '1px solid var(--line)',
            boxShadow: '0 1px 2px rgba(40,30,20,0.05)',
          }}>now · {fmtTime(now)}</span>
          <div style={{
            flex: 1, height: 2, borderRadius: 99,
            background: 'var(--ink)', opacity: 0.85,
            position: 'relative',
            maxWidth: 120,
          }}>
            <span style={{
              position:'absolute', right: -4, top: -3, width: 8, height: 8,
              borderRadius: 99, background: 'var(--ink)',
            }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Soft toggle
// ─────────────────────────────────────────────────────────────
function Toggle({ on, onChange, label, sub }) {
  return (
    <label style={{
      display: 'inline-flex', alignItems: 'center', gap: 12, cursor: 'pointer',
    }}>
      <span style={{
        width: 34, height: 20, borderRadius: 99,
        background: on ? 'var(--ink)' : 'var(--line-2)',
        position: 'relative', transition: 'background .2s',
      }}>
        <span style={{
          position: 'absolute', top: 2, left: on ? 16 : 2,
          width: 16, height: 16, borderRadius: 99,
          background: 'var(--paper)', transition: 'left .2s',
          boxShadow: '0 1px 3px rgba(0,0,0,.15)',
        }} />
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontSize: 13, color: 'var(--ink)' }}>{label}</span>
        {sub && <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{sub}</span>}
      </span>
      <input type="checkbox" checked={on} onChange={e => onChange(e.target.checked)} style={{ display: 'none' }} />
    </label>
  );
}

// ─────────────────────────────────────────────────────────────
// Tiny icons (inline SVG, line style)
// ─────────────────────────────────────────────────────────────
const I = {
  plus: <svg width="14" height="14" viewBox="0 0 14 14"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  grip: <svg width="10" height="14" viewBox="0 0 10 14"><g fill="currentColor"><circle cx="3" cy="3" r="1.1"/><circle cx="7" cy="3" r="1.1"/><circle cx="3" cy="7" r="1.1"/><circle cx="7" cy="7" r="1.1"/><circle cx="3" cy="11" r="1.1"/><circle cx="7" cy="11" r="1.1"/></g></svg>,
  check: <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2.5 6.5l2.4 2.4L9.5 3.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chevR: <svg width="10" height="10" viewBox="0 0 10 10"><path d="M3.5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chevD: <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  spark: <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 1v3M6 8v3M1 6h3M8 6h3M2.5 2.5l2 2M7.5 7.5l2 2M2.5 9.5l2-2M7.5 4.5l2-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  pin: <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 1.5l1.5 3.2 3.5.5-2.5 2.5.6 3.5L6 9.6 2.9 11.2l.6-3.5L1 5.2l3.5-.5L6 1.5z" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinejoin="round"/></svg>,
  cal: <svg width="12" height="12" viewBox="0 0 12 12"><rect x="1.5" y="2.5" width="9" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none"/><path d="M1.5 5h9M4 1.5v2M8 1.5v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
  arrow: <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>,
};

// ─────────────────────────────────────────────────────────────
// SortableList — HTML5 drag-and-drop, vertical reorder
// Usage:
//   <SortableList items={tasks} keyOf={t=>t.id} onReorder={ids=>...}
//     renderRow={(item, props) => <Row {...props} item={item} />} />
// renderRow receives: { rowProps, handleProps, isDragging }
// ─────────────────────────────────────────────────────────────
function SortableList({ items, keyOf = (x => x.id), onReorder, renderRow, gap = 8 }) {
  const [dragId, setDragId] = React.useState(null);
  const [overId, setOverId] = React.useState(null);
  const [before, setBefore] = React.useState(true);

  const reset = () => { setDragId(null); setOverId(null); };
  const commit = () => {
    if (!dragId || !overId || dragId === overId) { reset(); return; }
    const fromIdx = items.findIndex(x => keyOf(x) === dragId);
    const toIdx   = items.findIndex(x => keyOf(x) === overId);
    if (fromIdx < 0 || toIdx < 0) { reset(); return; }
    const insertAt = before ? toIdx : toIdx + 1;
    const arr = [...items];
    const [moved] = arr.splice(fromIdx, 1);
    const adj = insertAt > fromIdx ? insertAt - 1 : insertAt;
    arr.splice(adj, 0, moved);
    onReorder(arr.map(keyOf));
    reset();
  };

  const dropLine = (
    <div style={{
      height: 2, background: 'var(--ink)',
      borderRadius: 99, margin: '3px 0',
      pointerEvents: 'none',
    }} />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {items.map(item => {
        const id = keyOf(item);
        const isDragging = dragId === id;
        const showLineBefore = overId === id && dragId !== id && before;
        const showLineAfter  = overId === id && dragId !== id && !before;

        const rowProps = {
          onDragOver: (e) => {
            if (!dragId) return;
            e.preventDefault();
            const r = e.currentTarget.getBoundingClientRect();
            const b = (e.clientY - r.top) < r.height / 2;
            if (id !== overId) setOverId(id);
            if (b !== before) setBefore(b);
          },
          onDrop: (e) => { e.preventDefault(); commit(); },
          onDragEnd: reset,
          'data-sortable-row': true,
        };
        const handleProps = {
          draggable: true,
          onDragStart: (e) => {
            setDragId(id);
            try { e.dataTransfer.effectAllowed = 'move'; } catch {}
            // ensure the row (not just the handle) is the drag image
            const row = e.currentTarget.closest('[data-sortable-row]');
            if (row && e.dataTransfer && e.dataTransfer.setDragImage) {
              const r = row.getBoundingClientRect();
              e.dataTransfer.setDragImage(row, 16, r.height / 2);
            }
          },
          onDragEnd: reset,
        };

        return (
          <React.Fragment key={id}>
            {showLineBefore && dropLine}
            {renderRow(item, { rowProps, handleProps, isDragging })}
            {showLineAfter && dropLine}
          </React.Fragment>
        );
      })}
    </div>
  );
}

Object.assign(window, {
  CATS, TASKS, CAL_EVENTS, DAY_START, DAY_END,
  fmtTime, fmtRange, buildGradient, pctOf,
  SizeChip, CatDot, CatPill, TimelineRail, Toggle, sizeMeta, I,
  SortableList,
});
