// screens.jsx — FlowCal screen compositions. All artboards mount one of these.

// ─────────────────────────────────────────────────────────────
// Common bits
// ─────────────────────────────────────────────────────────────
function Brand({ size = 18 }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap: 9 }}>
      <span style={{
        width: 22, height: 22, borderRadius: 7,
        background: 'conic-gradient(from 200deg, var(--cat-focus), var(--cat-meal), var(--cat-movement), var(--cat-social), var(--cat-winddown), var(--cat-focus))',
        boxShadow: 'inset 0 0 0 2px var(--paper)',
      }} />
      <span className="serif" style={{ fontSize: size, fontWeight: 500, letterSpacing: -0.01 }}>FlowCal</span>
    </div>
  );
}

function GhostBtn({ children, onClick, dark = false, style = {} }) {
  return (
    <button onClick={onClick} style={{
      border: '1px solid var(--line-2)', background: 'var(--paper)',
      color: 'var(--ink)', fontFamily: 'inherit', fontSize: 12.5,
      padding: '7px 12px', borderRadius: 99, cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 6,
      ...style,
    }}>{children}</button>
  );
}
function PrimaryBtn({ children, onClick, style = {} }) {
  return (
    <button onClick={onClick} style={{
      border: 'none', background: 'var(--ink)', color: 'var(--paper)',
      fontFamily: 'inherit', fontSize: 12.5,
      padding: '8px 14px', borderRadius: 99, cursor: 'pointer',
      display: 'inline-flex', alignItems: 'center', gap: 6,
      ...style,
    }}>{children}</button>
  );
}

// ─────────────────────────────────────────────────────────────
// Task row (used in side panel + zoom)
// ─────────────────────────────────────────────────────────────
function TaskRow({ t, color, onToggle, onRestore, grip = true, dragHandleProps = {}, rowProps = {}, isDragging = false, isDropTarget = false }) {
  const { style: rowStyle, ...rowRest } = rowProps;
  const isShifted  = !!t.shifted && !t.done;
  const isDeferred = !!t.deferred;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 12px', borderRadius: 12,
      background: isDragging ? 'var(--paper-2)' : 'var(--paper)',
      border: '1px solid ' + (isDropTarget ? 'var(--ink)' : 'var(--line)'),
      transition: 'background .12s, border-color .12s, opacity .15s',
      opacity: isDragging ? 0.4 : (isDeferred ? 0.55 : (isShifted ? 0.7 : 1)),
      ...(rowStyle || {}),
    }}
    {...rowRest}
    onMouseEnter={e => { if (!isDragging) e.currentTarget.style.background = 'var(--paper-2)'; }}
    onMouseLeave={e => { if (!isDragging) e.currentTarget.style.background = 'var(--paper)'; }}
    >
      {grip && (
        <span
          {...dragHandleProps}
          style={{
            color: 'var(--ink-4)',
            cursor: dragHandleProps && dragHandleProps.onPointerDown ? 'grab' : 'grab',
            touchAction: 'none',
            padding: '4px 2px',
            display: 'inline-flex',
            ...(dragHandleProps.style || {}),
          }}>{I.grip}</span>
      )}
      <button onClick={onToggle} style={{
        width: 18, height: 18, borderRadius: 99,
        border: t.done ? 'none' : '1.5px solid var(--line-2)',
        background: t.done ? color : 'transparent',
        color: 'var(--paper)', display:'flex', alignItems:'center', justifyContent:'center',
        flexShrink: 0, cursor: 'pointer', padding: 0,
      }}>{t.done && I.check}</button>
      <span style={{
        flex: 1, fontSize: 13.5, minWidth: 0,
        color: (t.done || isDeferred) ? 'var(--ink-3)' : 'var(--ink)',
        textDecoration: t.done ? 'line-through' : 'none',
        textDecorationColor: 'var(--ink-4)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{t.title}</span>
      {(isShifted || isDeferred) && (
        <button onClick={(e) => { e.stopPropagation(); onRestore && onRestore(); }}
          title={isDeferred ? 'Restore from deferred' : 'Bring back to top'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '3px 8px 3px 7px', borderRadius: 99,
            background: 'var(--paper-2)', border: '1px solid var(--line-2)',
            color: 'var(--ink-2)', fontSize: 10, fontFamily: 'inherit',
            cursor: onRestore ? 'pointer' : 'default',
          }} className="mono">
          <span style={{
            width: 4, height: 4, borderRadius: 99,
            background: isDeferred ? 'var(--ink-3)' : color,
          }} />
          {isDeferred ? 'deferred' : 'later'}
        </button>
      )}
      <SizeChip size={t.size} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Current category card — the centerpiece. Big serif headline, gentle frame.
// ─────────────────────────────────────────────────────────────
function CurrentCard({ cat, tasks, now, exactTime, onToggle, onAdd, onReorder, onRebalance, onRestore, slipped = false, compact = false }) {
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const submit = () => {
    if (draft.trim() && onAdd) onAdd(draft.trim());
    setDraft(''); setAdding(false);
  };
  // Hide deferred, push shifted to the bottom (stable within each group).
  const visible = (tasks || []).filter(t => !t.deferred);
  const ordered = [...visible.filter(t => !t.shifted), ...visible.filter(t => t.shifted)];
  const deferredCount = (tasks || []).filter(t => t.deferred).length;
  return (
    <div style={{
      position: 'relative', borderRadius: 24, overflow: 'hidden',
      background: 'var(--paper)', border: '1px solid var(--line)',
      boxShadow: '0 2px 4px rgba(40,30,20,0.03), 0 22px 60px -30px rgba(40,30,20,0.18)',
    }}>
      {/* soft category wash on top */}
      <div style={{
        position:'absolute', inset: 0,
        background: `radial-gradient(120% 90% at 30% -20%, color-mix(in oklch, ${cat.color} 55%, transparent), transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', padding: '22px 26px 4px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap: 16 }}>
          <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
            <CatDot color={cat.color} size={11} />
            <span style={{ fontSize: 11.5, letterSpacing: 0.06, textTransform: 'uppercase', color: 'var(--ink-2)' }}>
              you are here · {cat.short}
            </span>
          </div>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            {exactTime ? fmtRange(cat.start, cat.end) : 'a soft window'}
          </span>
        </div>

        <h1 className="serif" style={{
          fontSize: compact ? 26 : 36, lineHeight: 1.05, margin: '12px 0 4px',
          fontWeight: 500, letterSpacing: -0.025, color: 'var(--ink)',
        }}>
          {slipped ? <>Still a good time for <em style={{ fontStyle: 'italic' }}>{cat.short.toLowerCase()}</em>.</> : <>{cat.soft}.</>}
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-3)', maxWidth: 480 }}>
          {slipped
            ? <>You spent a little longer here than planned. That's fine — the rest of the day will reshape around you.</>
            : <>{cat.hint}. Pick the one task that feels most possible right now.</>
          }
        </p>
      </div>

      {/* tasks */}
      <div style={{ position: 'relative', padding: '18px 22px 18px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {onReorder && ordered.length > 0 ? (
            <SortableList items={ordered} onReorder={onReorder}
              renderRow={(t, p) => (
                <TaskRow t={t} color={cat.color}
                  onToggle={() => onToggle && onToggle(t.id)}
                  onRestore={onRestore ? () => onRestore(t.id) : null}
                  rowProps={p.rowProps} dragHandleProps={p.handleProps}
                  isDragging={p.isDragging} />
              )} />
          ) : (
            ordered.map(t => <TaskRow key={t.id} t={t} color={cat.color}
              onToggle={() => onToggle && onToggle(t.id)}
              onRestore={onRestore ? () => onRestore(t.id) : null} />)
          )}
          {ordered.length === 0 && (
            <div style={{
              padding: '14px 12px', borderRadius: 12,
              background: 'var(--paper-2)', border: '1px dashed var(--line-2)',
              color: 'var(--ink-3)', fontSize: 13, textAlign: 'center',
            }}>Nothing here yet — and that's okay.</div>
          )}
          {deferredCount > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 12px', borderRadius: 10,
              background: 'transparent', border: '1px dashed var(--line)',
              color: 'var(--ink-3)', fontSize: 11.5,
            }} className="mono">
              <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--ink-3)' }} />
              {deferredCount} deferred · find them in the Tasks tab
            </div>
          )}
          {adding ? (
            <div style={{
              display:'flex', alignItems:'center', gap: 8,
              padding: '6px 10px', border: '1px solid ' + cat.color,
              background: 'var(--paper)', borderRadius: 12,
              boxShadow: '0 0 0 4px color-mix(in oklch, ' + cat.color + ' 18%, transparent)',
            }}>
              <span style={{ width: 18, height: 18, borderRadius: 99, border: '1.5px solid var(--line-2)', flexShrink: 0 }} />
              <input autoFocus value={draft} onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setAdding(false); setDraft(''); } }}
                onBlur={submit}
                placeholder={'something small for ' + (cat.name || cat.short).toLowerCase()}
                style={{
                  flex: 1, border: 'none', outline: 'none',
                  background: 'transparent', fontFamily: 'inherit',
                  fontSize: 13.5, color: 'var(--ink)', padding: '8px 0',
                }} />
              <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>↲ enter</span>
            </div>
          ) : (
            <button onClick={() => onAdd ? setAdding(true) : null} style={{
              display:'flex', alignItems:'center', gap: 8,
              padding: '9px 12px', border: '1px dashed var(--line-2)',
              background: 'transparent', borderRadius: 12,
              color: 'var(--ink-3)', fontSize: 12.5, cursor: onAdd ? 'pointer' : 'default',
              fontFamily: 'inherit',
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>{I.plus}</span>
              <span>add a task to</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '2px 9px 2px 8px', borderRadius: 99,
                background: 'color-mix(in oklch, ' + cat.color + ' 22%, transparent)',
                color: 'var(--ink)', fontWeight: 500,
                fontSize: 11.5,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: 99, background: cat.color }} />
                {(cat.name || cat.short).toLowerCase()}
              </span>
            </button>
          )}
        </div>
      </div>

      {slipped && (
        <div style={{
          position:'relative', display: 'flex', alignItems:'center', justifyContent:'space-between',
          padding: '12px 22px', borderTop: '1px solid var(--line)',
          background: 'color-mix(in oklch, var(--paper-2) 60%, transparent)',
          gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>Want to reshape the rest of today?</span>
          <PrimaryBtn onClick={onRebalance}>{I.spark} Rebalance remaining day</PrimaryBtn>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Upcoming category strip (small cards)
// ─────────────────────────────────────────────────────────────
function UpNext({ cats, now, exactTime, max = 4 }) {
  const upcoming = cats.filter(c => c.end > now).slice(0, max);
  return (
    <div>
      <div style={{
        fontSize: 11, letterSpacing: 0.08, textTransform: 'uppercase',
        color: 'var(--ink-3)', marginBottom: 10, paddingLeft: 2,
      }}>up next</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {upcoming.map((c, i) => {
          const isCur = c.start <= now && c.end > now;
          return (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 12,
              background: isCur ? 'color-mix(in oklch, ' + c.color + ' 14%, var(--paper))' : 'var(--paper)',
              border: '1px solid ' + (isCur ? 'color-mix(in oklch, ' + c.color + ' 35%, transparent)' : 'var(--line)'),
            }}>
              <span style={{
                width: 4, alignSelf: 'stretch', borderRadius: 99,
                background: c.color, opacity: isCur ? 1 : 0.7,
              }} />
              <div style={{ flex: 1, display:'flex', flexDirection:'column', gap: 2 }}>
                <span style={{ fontSize: 13, color: 'var(--ink)' }}>{c.soft}</span>
                <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>
                  {exactTime ? fmtRange(c.start, c.end) : `${(c.end - c.start).toFixed(1).replace('.0','')}h window`}
                </span>
              </div>
              <span style={{ color: 'var(--ink-4)' }}>{I.chevR}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Top bar (chrome inside the artboard)
// ─────────────────────────────────────────────────────────────
function TopBar({ exactTime, setExactTime, gcal = true, onTemplate, onRebalance }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 28px', borderBottom: '1px solid var(--line)',
      background: 'color-mix(in oklch, var(--paper) 70%, transparent)',
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap: 18 }}>
        <Brand />
        <span style={{ width: 1, height: 16, background: 'var(--line)' }} />
        <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>
          <span className="serif" style={{ fontStyle: 'italic', color: 'var(--ink)' }}>Tuesday</span>
          <span> · May 11</span>
        </span>
      </div>
      <div style={{ display:'flex', alignItems:'center', gap: 14 }}>
        {gcal && (
          <span style={{
            display:'inline-flex', alignItems:'center', gap: 6,
            fontSize: 11.5, color: 'var(--ink-3)',
            padding: '5px 10px', borderRadius: 99, border: '1px solid var(--line)',
          }}>
            {I.cal}
            <span>Google Calendar synced</span>
            <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--cat-movement)' }} />
          </span>
        )}
        <Toggle on={exactTime} onChange={setExactTime} label={exactTime ? 'Exact times' : 'Soft windows'} />
        <GhostBtn onClick={onTemplate}>Templates</GhostBtn>
        <PrimaryBtn onClick={onRebalance}>{I.spark} Rebalance</PrimaryBtn>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// DESKTOP MAIN FLOW
// ─────────────────────────────────────────────────────────────
function DesktopFlow({ slipped = false, now = 11.4, exactTime: et0 = false, openRebalance = false, openTemplates = false, calendar = true }) {
  const [exactTime, setExactTime] = React.useState(et0);
  const [showRebalance, setShowRebalance] = React.useState(openRebalance);
  const [showTemplates, setShowTemplates] = React.useState(openTemplates);
  const [tasks, setTasks] = React.useState(TASKS);

  // determine current cat based on `now`
  const cur = CATS.find(c => c.start <= now && c.end > now) || CATS[0];
  const curTasks = tasks[cur.id] || [];

  const onToggle = (id) => {
    setTasks(prev => ({ ...prev, [cur.id]: prev[cur.id].map(t => t.id === id ? { ...t, done: !t.done } : t) }));
  };

  return (
    <div style={{
      position: 'relative', width: '100%', height: '100%',
      background: 'var(--paper)', display: 'flex', flexDirection: 'column',
      fontFamily: '"Geist", system-ui, sans-serif',
    }}>
      <TopBar
        exactTime={exactTime} setExactTime={setExactTime}
        gcal={calendar}
        onTemplate={() => setShowTemplates(true)}
        onRebalance={() => setShowRebalance(true)}
      />

      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: '260px 1fr 320px',
        gap: 32, padding: '28px 32px 36px', minHeight: 0,
      }}>
        {/* timeline rail */}
        <div style={{ position: 'relative', paddingLeft: 8 }}>
          <div style={{
            display:'flex', alignItems:'baseline', justifyContent:'space-between',
            marginBottom: 16, paddingRight: 6,
          }}>
            <span style={{ fontSize: 11, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-3)' }}>your flow</span>
            <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>{fmtTime(DAY_START)} — {fmtTime(DAY_END)}</span>
          </div>
          <TimelineRail
            now={now} cats={CATS} events={calendar ? CAL_EVENTS : []}
            height={520} highlightId={cur.id}
          />
        </div>

        {/* center: current */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0 }}>
          <CurrentCard cat={cur} tasks={curTasks} now={now} exactTime={exactTime} onToggle={onToggle} slipped={slipped} />

          {/* approximate / okay strip */}
          <div style={{
            display:'flex', alignItems:'center', gap: 12,
            padding: '12px 16px', borderRadius: 14,
            background: 'var(--paper-2)', border: '1px dashed var(--line-2)',
          }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: 'var(--cat-movement)' }} />
            <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>
              You're inside the soft window for <strong style={{ color: 'var(--ink)', fontWeight: 600 }}>{cur.short.toLowerCase()}</strong>.
              {' '}If you're not exactly aligned, you're still okay.
            </span>
          </div>
        </div>

        {/* right: up next + protected */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0 }}>
          <UpNext cats={CATS} now={now} exactTime={exactTime} />

          {calendar && (
            <div>
              <div style={{
                fontSize: 11, letterSpacing: 0.08, textTransform: 'uppercase',
                color: 'var(--ink-3)', marginBottom: 10, display:'flex', alignItems:'center', gap: 8,
              }}>
                <span style={{ color: 'var(--ink-3)' }}>{I.pin}</span>
                <span>protected moments</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {CAL_EVENTS.map(e => (
                  <div key={e.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 12,
                    background: 'var(--paper)', border: '1px solid var(--line)',
                  }}>
                    <span style={{ color: 'var(--ink-3)' }}>{I.cal}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, color: 'var(--ink)' }}>{e.label}</div>
                      <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>{fmtTime(e.time)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <CategoryLegend compact />
        </div>
      </div>

      {/* overlays */}
      {showRebalance && <RebalanceModal cur={cur} onClose={() => setShowRebalance(false)} />}
      {showTemplates && <TemplatesPanel onClose={() => setShowTemplates(false)} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// CATEGORY LEGEND (small, also full panel mode)
// ─────────────────────────────────────────────────────────────
function CategoryLegend({ compact = false, categories }) {
  const items = categories && categories.length
    ? categories.map(c => [c.id, c.name, c.hint, c.color])
    : [
        ['focus','Focus','deep work', 'var(--cat-focus)'],
        ['admin','Admin','small tasks', 'var(--cat-admin)'],
        ['chores','Chores','around the house', 'var(--cat-chores)'],
        ['errands','Errands','out + about', 'var(--cat-errands)'],
        ['meal','Meal','eating', 'var(--cat-meal)'],
        ['break','Break','pause', 'var(--cat-break)'],
        ['movement','Movement','body reset', 'var(--cat-movement)'],
        ['social','Social','people time', 'var(--cat-social)'],
        ['winddown','Wind Down','end of day', 'var(--cat-winddown)'],
      ];
  return (
    <div>
      <div style={{
        fontSize: 11, letterSpacing: 0.08, textTransform: 'uppercase',
        color: 'var(--ink-3)', marginBottom: 10,
      }}>categories</div>
      <div style={{
        display: 'grid', gridTemplateColumns: compact ? '1fr 1fr' : '1fr 1fr 1fr',
        gap: 8, padding: 12, borderRadius: 14,
        background: 'var(--paper-2)', border: '1px solid var(--line)',
      }}>
        {items.map(([id, name, sub, color]) => (
          <div key={id} style={{ display:'flex', alignItems:'center', gap: 8, minWidth: 0 }}>
            <CatDot color={color || `var(--cat-${id})`} size={10} />
            <span style={{ fontSize: 12, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
            {!compact && sub && <span style={{ fontSize: 11, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>· {sub}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// REBALANCE MODAL
// ─────────────────────────────────────────────────────────────
function RebalanceModal({ cur, onClose, onApply, active = true, tasks, schedule, catsById, now }) {
  const [strategy, setStrategy] = React.useState('ease');
  const [picked, setPicked] = React.useState(() => new Set());

  // Candidate tasks: incomplete + non-deferred + non-shifted, from current
  // and upcoming categories. Current first, then upcoming in schedule order.
  const candidateGroups = React.useMemo(() => {
    if (!tasks || !schedule) return [];
    const seen = new Set();
    const groups = [];
    const push = (catType, isCurrent) => {
      if (seen.has(catType)) return;
      seen.add(catType);
      const meta = (catsById && catsById[catType]) || { name: catType, short: catType, color: 'var(--ink-4)' };
      const list = (tasks[catType] || []).filter(t => !t.done && !t.deferred && !t.shifted);
      if (list.length) groups.push({ catType, meta, list, isCurrent });
    };
    if (cur) push(cur.catType, true);
    for (const s of schedule) {
      if (s.end > now && s.catType !== cur?.catType) push(s.catType, false);
    }
    return groups;
  }, [tasks, schedule, catsById, now, cur]);

  const allIds = React.useMemo(() => candidateGroups.flatMap(g => g.list.map(t => t.id)), [candidateGroups]);

  const toggleId = (id) => setPicked(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });
  const selectAll = () => setPicked(new Set(allIds));
  const selectNone = () => setPicked(new Set());

  const needsPicker = strategy === 'shift' || strategy === 'drop';
  const apply = () => {
    if (onApply) onApply({ strategy, taskIds: Array.from(picked) });
    onClose();
  };
  const applyDisabled = needsPicker && picked.size === 0;
  const applyLabel = strategy === 'shift'
    ? (picked.size ? `Shift ${picked.size} ${picked.size === 1 ? 'task' : 'tasks'} later` : 'Pick a task to shift')
    : strategy === 'drop'
    ? (picked.size ? `Defer ${picked.size} ${picked.size === 1 ? 'task' : 'tasks'}` : 'Pick a task to defer')
    : 'Rebalance remaining day';

  const options = [
    { id: 'keep',     title: 'Keep going in current category',  sub: 'Stay with ' + cur.short.toLowerCase() + ' a little longer. The rest will catch up.' },
    { id: 'ease',     title: 'Ease into the next category',     sub: "Start drifting toward what's next when you're ready." },
    { id: 'shift',    title: 'Shift flexible tasks later',      sub: 'Push a few tasks toward the bottom of the day.' },
    { id: 'compress', title: 'Compress lower-priority categories', sub: 'Shorten chores, errands and admin; keep what matters.' },
    { id: 'drop',     title: 'Drop or defer selected tasks',    sub: 'Release a few things from today entirely.' },
  ];

  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 50,
      background: 'color-mix(in oklch, var(--ink) 35%, transparent)',
      backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 28,
      opacity: active ? 1 : 0,
      transition: 'opacity 220ms ease-out',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 720, maxWidth: '100%', maxHeight: '100%',
        background: 'var(--paper)', borderRadius: 24, overflow: 'hidden',
        border: '1px solid var(--line)',
        boxShadow: '0 30px 80px -30px rgba(40,30,20,0.4)',
        display: 'flex', flexDirection: 'column',
        opacity: active ? 1 : 0,
        transform: active ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.97)',
        transition: 'opacity 220ms cubic-bezier(.2,.7,.3,1), transform 220ms cubic-bezier(.2,.7,.3,1)',
      }}>
        <div style={{
          position: 'relative', padding: '24px 28px 18px',
          background: `linear-gradient(180deg, color-mix(in oklch, ${cur.color} 30%, var(--paper)) 0%, var(--paper) 100%)`,
        }}>
          <div style={{ fontSize: 11, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-2)', marginBottom: 6 }}>
            rebalance · no shame, no urgency
          </div>
          <h2 className="serif" style={{ fontSize: 30, lineHeight: 1.1, margin: 0, fontWeight: 500, letterSpacing: -0.02, maxWidth: 520 }}>
            Want to reshape the rest of today?
          </h2>
          <p style={{ margin: '8px 0 0', fontSize: 13.5, color: 'var(--ink-2)', maxWidth: 540 }}>
            Pick what feels right — you can change your mind later.
          </p>
        </div>

        <div style={{ padding: '8px 16px 16px', overflow: 'auto', flex: 1 }}>
          {options.map(o => {
            const isSel = strategy === o.id;
            return (
              <label key={o.id} onClick={() => setStrategy(o.id)} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                padding: '14px 14px', borderRadius: 14, cursor: 'pointer',
                background: isSel ? 'color-mix(in oklch, ' + cur.color + ' 10%, var(--paper))' : 'transparent',
                border: '1px solid ' + (isSel ? 'color-mix(in oklch, ' + cur.color + ' 40%, transparent)' : 'transparent'),
                marginTop: 4,
                transition: 'background 280ms cubic-bezier(.2,.7,.3,1), border-color 280ms cubic-bezier(.2,.7,.3,1)',
              }}>
                <span style={{
                  width: 18, height: 18, borderRadius: 99, marginTop: 2,
                  border: '1.5px solid ' + (isSel ? cur.color : 'var(--line-2)'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  transition: 'border-color 220ms ease-out',
                }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: 99,
                    background: cur.color,
                    transform: isSel ? 'scale(1)' : 'scale(0)',
                    transition: 'transform 220ms cubic-bezier(.34,1.56,.64,1)',
                  }} />
                </span>
                <div>
                  <div style={{ fontSize: 14, color: 'var(--ink)' }}>{o.title}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>{o.sub}</div>
                </div>
              </label>
            );
          })}

          {/* Task picker — stays mounted, animates in/out smoothly */}
          <div style={{
            maxHeight: needsPicker ? 520 : 0,
            opacity: needsPicker ? 1 : 0,
            marginTop: needsPicker ? 12 : 0,
            overflow: 'hidden',
            transition: 'max-height 360ms cubic-bezier(.2,.7,.3,1), opacity 260ms ease-out, margin-top 360ms cubic-bezier(.2,.7,.3,1)',
            pointerEvents: needsPicker ? 'auto' : 'none',
          }}>
            <div style={{
              padding: 14, borderRadius: 14,
              background: 'var(--paper-2)', border: '1px solid var(--line)',
              display: 'flex', flexDirection: 'column', gap: 10,
              maxHeight: 480, overflow: 'auto',
            }} className="nb">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: 11.5, letterSpacing: 0.06, textTransform: 'uppercase', color: 'var(--ink-2)' }}>
                  pick tasks to {strategy === 'drop' ? 'defer' : 'shift later'}
                </span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={selectAll} disabled={!allIds.length} style={{
                    padding: '4px 9px', borderRadius: 99,
                    background: 'var(--paper)', border: '1px solid var(--line-2)',
                    color: 'var(--ink-2)', fontSize: 11, fontFamily: 'inherit',
                    cursor: allIds.length ? 'pointer' : 'default',
                    transition: 'background .2s',
                  }}>All</button>
                  <button onClick={selectNone} disabled={!picked.size} style={{
                    padding: '4px 9px', borderRadius: 99,
                    background: 'var(--paper)', border: '1px solid var(--line-2)',
                    color: 'var(--ink-2)', fontSize: 11, fontFamily: 'inherit',
                    cursor: picked.size ? 'pointer' : 'default',
                    transition: 'background .2s',
                  }}>None</button>
                </div>
              </div>
              {candidateGroups.length === 0 ? (
                <div style={{
                  padding: '10px 12px', borderRadius: 10,
                  background: 'var(--paper)', border: '1px dashed var(--line-2)',
                  color: 'var(--ink-3)', fontSize: 12.5, textAlign: 'center',
                }}>
                  Nothing left to {strategy === 'drop' ? 'defer' : 'shift'} — your day is clear.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {candidateGroups.map(g => (
                    <div key={g.catType} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 2 }}>
                        <CatDot color={g.meta.color} size={9} />
                        <span style={{ fontSize: 11.5, color: 'var(--ink-2)', fontWeight: 500 }}>{g.meta.name}</span>
                        {g.isCurrent && (
                          <span className="mono" style={{
                            fontSize: 9.5, padding: '1px 6px', borderRadius: 99,
                            background: 'var(--ink)', color: 'var(--paper)',
                          }}>current</span>
                        )}
                      </div>
                      {g.list.map(t => {
                        const sel = picked.has(t.id);
                        return (
                          <label key={t.id} onClick={(e) => { e.stopPropagation(); toggleId(t.id); }} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                            background: sel ? 'color-mix(in oklch, ' + g.meta.color + ' 14%, var(--paper))' : 'var(--paper)',
                            border: '1px solid ' + (sel ? 'color-mix(in oklch, ' + g.meta.color + ' 50%, transparent)' : 'var(--line)'),
                            transition: 'background 260ms cubic-bezier(.2,.7,.3,1), border-color 260ms cubic-bezier(.2,.7,.3,1)',
                          }}>
                            <span style={{
                              width: 16, height: 16, borderRadius: 5, flexShrink: 0,
                              border: '1.5px solid ' + (sel ? g.meta.color : 'var(--line-2)'),
                              background: sel ? g.meta.color : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              transition: 'background 220ms cubic-bezier(.2,.7,.3,1), border-color 220ms cubic-bezier(.2,.7,.3,1)',
                            }}>
                              <svg width="10" height="10" viewBox="0 0 12 12" style={{
                                opacity: sel ? 1 : 0,
                                transform: sel ? 'scale(1)' : 'scale(0.6)',
                                transition: 'opacity 200ms ease-out, transform 220ms cubic-bezier(.34,1.56,.64,1)',
                              }}>
                                <path d="M2.5 6.5l2.4 2.4L9.5 3.5" stroke="var(--paper)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </span>
                            <span style={{
                              flex: 1, fontSize: 13, color: 'var(--ink)',
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{t.title}</span>
                            <SizeChip size={t.size} />
                          </label>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div style={{
          display:'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 22px', borderTop: '1px solid var(--line)',
          background: 'var(--paper-2)', gap: 8, flexWrap: 'wrap',
        }}>
          <GhostBtn onClick={onClose}>Keep current flow</GhostBtn>
          <button onClick={apply} disabled={applyDisabled} style={{
            border: 'none',
            background: applyDisabled ? 'var(--line-2)' : 'var(--ink)',
            color: 'var(--paper)',
            fontFamily: 'inherit', fontSize: 12.5,
            padding: '8px 14px', borderRadius: 99,
            cursor: applyDisabled ? 'not-allowed' : 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6,
            transition: 'background .15s, opacity .15s',
            opacity: applyDisabled ? 0.7 : 1,
          }}>{I.arrow} {applyLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// TEMPLATES PANEL
// ─────────────────────────────────────────────────────────────
function TemplatesPanel({ onClose, inline = false, templates, picked: pickedProp, onApply, active = true }) {
  const tpl = templates || [
    { id:'workday',  name:'Workday',          bands:['focus','admin','break','meal','focus','chores','social','winddown'], blurb:'A standard day with two focus blocks.' },
    { id:'admin',    name:'Admin catch-up',   bands:['admin','admin','break','admin','meal','focus','chores','winddown'], blurb:'Clear the small stuff first.' },
    { id:'deep',     name:'Deep focus day',   bands:['focus','focus','break','meal','movement','focus','focus','winddown'], blurb:'Long blocks. Few interruptions.' },
    { id:'errands',  name:'Errands day',      bands:['admin','errands','errands','meal','chores','errands','social','winddown'], blurb:'Out, around, back.' },
    { id:'low',      name:'Low-energy day',   bands:['break','admin','break','meal','break','chores','winddown','winddown'], blurb:'Gentle. Mostly rest.' },
    { id:'weekend',  name:'Weekend reset',    bands:['chores','meal','movement','social','break','errands','social','winddown'], blurb:'House, body, people.' },
  ];
  const [picked, setPicked] = React.useState(pickedProp || tpl[0].id);
  const apply = () => { if (onApply) onApply(picked); else if (onClose) onClose(); };

  const body = (
    <div style={{
      width: '100%', height: '100%',
      background: 'var(--paper)',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '24px 28px 12px',
        display:'flex', justifyContent:'space-between', alignItems:'flex-end',
        borderBottom: '1px solid var(--line)',
      }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 6 }}>
            templates · pre-shaped flows
          </div>
          <h2 className="serif" style={{ margin:0, fontSize: 30, fontWeight: 400, letterSpacing: -0.02 }}>
            Start the day with a shape.
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 13.5, color: 'var(--ink-3)', maxWidth: 520 }}>
            Templates pre-fill categories and a few starter tasks. Edit anything after — they're a starting point, not a rule.
          </p>
        </div>
        {!inline && <GhostBtn onClick={onClose} style={{ alignSelf: 'flex-start' }}>Close</GhostBtn>}
      </div>

      <div style={{
        flex: 1, padding: 22,
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14,
        overflow: 'auto',
      }}>
        {tpl.map(t => {
          const isSel = picked === t.id;
          // tiny preview gradient
          const stops = t.bands.map((b, i) => {
            const a = (i / t.bands.length) * 100;
            const z = ((i + 1) / t.bands.length) * 100;
            return `var(--cat-${b}) ${a + 1}%, var(--cat-${b}) ${z - 1}%`;
          }).join(', ');
          return (
            <button key={t.id} onClick={() => setPicked(t.id)} style={{
              textAlign: 'left', background: 'var(--paper)', cursor: 'pointer',
              border: '1px solid ' + (isSel ? 'var(--ink)' : 'var(--line)'),
              borderRadius: 18, padding: 14, fontFamily: 'inherit',
              display: 'flex', flexDirection: 'column', gap: 12,
              boxShadow: isSel ? '0 0 0 4px color-mix(in oklch, var(--ink) 10%, transparent)' : 'none',
              transition: 'box-shadow .15s, border-color .15s',
            }}>
              <div style={{
                height: 76, borderRadius: 12,
                background: `linear-gradient(to right, ${stops})`,
                border: '1px solid var(--line)',
                position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(180deg, transparent, color-mix(in oklch, var(--paper) 25%, transparent))',
                }} />
              </div>
              <div>
                <div className="serif" style={{ fontSize: 18, lineHeight: 1.1 }}>{t.name}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 3 }}>{t.blurb}</div>
              </div>
              <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                {[...new Set(t.bands)].slice(0, 4).map(b => (
                  <span key={b} className="mono" style={{
                    fontSize: 10, color: 'var(--ink-3)',
                    padding: '2px 7px', borderRadius: 99,
                    background: 'var(--paper-2)', border: '1px solid var(--line)',
                  }}>{b}</span>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 22px', borderTop: '1px solid var(--line)', background: 'var(--paper-2)',
      }}>
        <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Templates only suggest categories. Tasks stay yours.</span>
        <div style={{ display:'flex', gap: 10 }}>
          {onClose && <GhostBtn onClick={onClose}>Cancel</GhostBtn>}
          <PrimaryBtn onClick={apply}>{I.arrow} Use this template</PrimaryBtn>
        </div>
      </div>
    </div>
  );

  if (inline) return body;
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 60,
      background: 'color-mix(in oklch, var(--ink) 30%, transparent)',
      display: 'flex', alignItems: 'stretch', justifyContent: 'center', padding: 28,
      opacity: active ? 1 : 0,
      transition: 'opacity 220ms ease-out',
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 1040, borderRadius: 22, overflow: 'hidden',
        border: '1px solid var(--line)', boxShadow: '0 30px 80px -30px rgba(0,0,0,0.35)',
        opacity: active ? 1 : 0,
        transform: active ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.97)',
        transition: 'opacity 220ms cubic-bezier(.2,.7,.3,1), transform 220ms cubic-bezier(.2,.7,.3,1)',
      }}>{body}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SETTINGS PANEL — categories config (full screen artboard variant)
// ─────────────────────────────────────────────────────────────
function CategorySettings() {
  const items = [
    ['focus','Focus','indigo','deep work, single-thread'],
    ['admin','Admin','teal','small messages, small wins'],
    ['chores','Chores','green','around the house'],
    ['errands','Errands','sage','leave the house'],
    ['meal','Meal','amber','eating'],
    ['break','Break','lavender','pause'],
    ['movement','Movement','warm green','body reset'],
    ['social','Social','coral','people time'],
    ['winddown','Wind Down','deep purple','end of day'],
  ];
  return (
    <div style={{
      width: '100%', height: '100%', background: 'var(--paper)',
      padding: '24px 28px',
      display: 'flex', flexDirection: 'column', gap: 18,
    }}>
      <div>
        <div style={{ fontSize: 11, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-3)' }}>
          settings · categories
        </div>
        <h2 className="serif" style={{ margin: '4px 0 4px', fontSize: 26, fontWeight: 400, letterSpacing: -0.02 }}>
          Your categories.
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)' }}>
          The shapes you sort your day into. Drag to reorder. Rename anything.
        </p>
      </div>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', gap: 6,
        border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden',
      }}>
        {items.map(([id, name, c, sub], i) => (
          <div key={id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px',
            background: 'var(--paper)',
            borderBottom: i < items.length - 1 ? '1px solid var(--line)' : 'none',
          }}>
            <span style={{ color: 'var(--ink-4)', cursor: 'grab' }}>{I.grip}</span>
            <span style={{ width: 22, height: 22, borderRadius: 8, background: `var(--cat-${id})` }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: 'var(--ink)' }}>{name}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>{sub}</div>
            </div>
            <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{c}</span>
            <span style={{ color: 'var(--ink-4)' }}>{I.chevR}</span>
          </div>
        ))}
      </div>
      <button style={{
        alignSelf: 'flex-start', display:'inline-flex', alignItems:'center', gap: 6,
        background: 'transparent', border: '1px dashed var(--line-2)',
        padding: '8px 14px', borderRadius: 99, cursor: 'pointer',
        color: 'var(--ink-2)', fontSize: 13, fontFamily: 'inherit',
      }}>{I.plus} New category</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MOBILE FLOW
// ─────────────────────────────────────────────────────────────
function MobileFlow({ now = 11.4, exactTime: et0 = false, slipped = false, openRebalance = false }) {
  const [exactTime, setExactTime] = React.useState(et0);
  const [open, setOpen] = React.useState(openRebalance);
  const [tasks, setTasks] = React.useState(TASKS);
  const cur = CATS.find(c => c.start <= now && c.end > now) || CATS[0];
  const curTasks = tasks[cur.id] || [];

  return (
    <div style={{
      width: '100%', height: '100%', background: 'var(--paper)',
      display: 'flex', flexDirection: 'column',
      fontFamily: '"Geist", system-ui, sans-serif', overflow: 'hidden',
    }}>
      {/* top */}
      <div style={{
        padding: '14px 20px 8px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Brand size={15} />
        <button style={{
          width: 32, height: 32, borderRadius: 99, border: '1px solid var(--line)',
          background: 'var(--paper)', cursor: 'pointer', color: 'var(--ink-2)',
          display:'flex', alignItems:'center', justifyContent:'center',
        }}>{I.spark}</button>
      </div>

      {/* horizontal ribbon timeline */}
      <div style={{ padding: '4px 20px 12px' }}>
        <MobileRibbon now={now} exactTime={exactTime} />
      </div>

      {/* current card */}
      <div style={{ padding: '6px 20px 12px', flex: '0 0 auto' }}>
        <CurrentCard cat={cur} tasks={curTasks} now={now} exactTime={exactTime}
          onToggle={id => setTasks(p => ({ ...p, [cur.id]: p[cur.id].map(t => t.id === id ? { ...t, done: !t.done } : t) }))}
          slipped={slipped} />
      </div>

      {/* up next strip */}
      <div style={{ padding: '0 20px 12px', flex: 1, overflow: 'auto' }}>
        <UpNext cats={CATS} now={now} exactTime={exactTime} max={3} />
      </div>

      {/* bottom tab bar */}
      <div style={{
        padding: '10px 20px 18px',
        borderTop: '1px solid var(--line)',
        background: 'color-mix(in oklch, var(--paper) 90%, transparent)',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      }}>
        {['Flow','Tasks','Templates','You'].map((l, i) => (
          <div key={l} style={{
            display:'flex', flexDirection:'column', alignItems:'center', gap:4,
            color: i === 0 ? 'var(--ink)' : 'var(--ink-3)', fontSize: 10.5,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: 99,
              background: i === 0 ? 'var(--ink)' : 'var(--ink-4)',
              opacity: i === 0 ? 1 : 0.5,
            }} />
            {l}
          </div>
        ))}
      </div>

      {open && <RebalanceModal cur={cur} onClose={() => setOpen(false)} />}
    </div>
  );
}

function MobileRibbon({ now, exactTime, cats = CATS }) {
  const grad = buildGradient(cats, DAY_START, DAY_END);
  const np = pctOf(now);
  const cur = cats.find(c => c.start <= now && c.end > now) || cats[0];
  return (
    <div>
      <div style={{
        display:'flex', justifyContent:'space-between', alignItems:'center',
        marginBottom: 6,
      }}>
        <span style={{ fontSize: 11, letterSpacing: 0.06, textTransform: 'uppercase', color: 'var(--ink-3)' }}>your flow today</span>
        <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-4)' }}>
          {exactTime ? fmtRange(DAY_START, DAY_END) : 'morning → wind down'}
        </span>
      </div>
      <div style={{ position: 'relative', height: 38 }}>
        <div style={{
          position: 'absolute', inset: 0, borderRadius: 14,
          background: grad.replace('to bottom', 'to right'),
          boxShadow: 'inset 0 0 0 1px var(--line)',
        }} />
        {/* now marker */}
        <div style={{
          position: 'absolute', left: `${np}%`, top: -4, bottom: -4,
          width: 2, background: 'var(--ink)',
          transform: 'translateX(-1px)', borderRadius: 99,
        }}>
          <span style={{
            position: 'absolute', top: -16, left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 9.5, color: 'var(--ink)',
            background: 'var(--paper)', border: '1px solid var(--line)',
            padding: '1px 6px', borderRadius: 99, whiteSpace: 'nowrap',
          }} className="mono">now</span>
        </div>
      </div>
      <div style={{
        display:'flex', justifyContent: 'space-between',
        marginTop: 6, fontSize: 10, color: 'var(--ink-3)',
      }} className="mono">
        <span>{fmtTime(DAY_START)}</span>
        <span style={{ color: 'var(--ink)' }}>{cur ? cur.short : ''}</span>
        <span>{fmtTime(DAY_END)}</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// MOBILE — category task detail panel (separate screen)
// ─────────────────────────────────────────────────────────────
function MobileTaskPanel({ catId = 'focus' }) {
  const cat = CATS.find(c => c.id === catId);
  const [tasks, setTasks] = React.useState(TASKS[catId]);
  return (
    <div style={{
      width: '100%', height: '100%', background: 'var(--paper)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: '"Geist", system-ui, sans-serif',
    }}>
      {/* header with wash */}
      <div style={{
        position: 'relative', padding: '14px 20px 22px',
        background: `linear-gradient(170deg, color-mix(in oklch, ${cat.color} 40%, var(--paper)) 0%, var(--paper) 90%)`,
      }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 14 }}>
          <button style={{
            width: 32, height: 32, borderRadius: 99, border: '1px solid var(--line)',
            background: 'var(--paper)', cursor: 'pointer',
            display:'flex', alignItems:'center', justifyContent:'center',
            transform: 'rotate(180deg)', color: 'var(--ink-2)',
          }}>{I.chevR}</button>
          <CatPill cat={cat} active />
          <button style={{
            width: 32, height: 32, borderRadius: 99, border: '1px solid var(--line)',
            background: 'var(--paper)', cursor: 'pointer', color: 'var(--ink-2)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>{I.plus}</button>
        </div>
        <div style={{ fontSize: 11, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-2)' }}>
          you are here
        </div>
        <h1 className="serif" style={{ margin: '6px 0 2px', fontSize: 30, fontWeight: 400, lineHeight: 1.05, letterSpacing: -0.02 }}>
          {cat.soft}.
        </h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-2)' }}>
          {cat.hint}
        </p>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '14px 16px 16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {tasks.map(t => (
            <TaskRow key={t.id} t={t} color={cat.color}
              onToggle={() => setTasks(p => p.map(x => x.id === t.id ? { ...x, done: !x.done } : x))} />
          ))}
          <button style={{
            display:'flex', alignItems:'center', gap: 8,
            padding: '11px 14px', border: '1px dashed var(--line-2)',
            background: 'transparent', borderRadius: 12,
            color: 'var(--ink-3)', fontSize: 13, cursor: 'pointer',
            fontFamily: 'inherit',
          }}>{I.plus} add a task to {cat.short.toLowerCase()}</button>
        </div>

        <div style={{
          marginTop: 18, padding: '12px 14px', borderRadius: 14,
          background: 'var(--paper-2)', border: '1px dashed var(--line-2)',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <span style={{ width: 8, height: 8, borderRadius: 99, background: cat.color, marginTop: 5 }} />
          <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>
            Tasks here are suggestions, not assignments. Check off whatever lands. Skip whatever doesn't.
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Side-by-side: SOFT TIME vs EXACT TIME comparison
// ─────────────────────────────────────────────────────────────
function TimeToggleComparison() {
  const cell = (exact) => (
    <div style={{
      flex: 1, background: 'var(--paper)', padding: '20px 22px',
      display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0,
    }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ fontSize: 11, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-3)' }}>
          {exact ? 'exact times · on' : 'soft windows · default'}
        </div>
        <Toggle on={exact} onChange={() => {}} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {CATS.slice(0, 6).map(c => (
          <div key={c.id} style={{
            display:'flex', alignItems:'center', gap: 12,
            padding: '11px 12px', borderRadius: 12,
            background: 'var(--paper)', border: '1px solid var(--line)',
          }}>
            <span style={{ width: 6, height: 36, borderRadius: 99, background: c.color }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, color: 'var(--ink)' }}>
                {exact ? c.short : c.soft}
              </div>
              <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-3)' }}>
                {exact ? fmtRange(c.start, c.end) : `${(c.end - c.start).toFixed(1).replace('.0','')}h window`}
              </div>
            </div>
          </div>
        ))}
      </div>
      <p style={{
        margin: 0, fontSize: 12, color: 'var(--ink-3)',
        padding: '10px 12px', background: 'var(--paper-2)',
        borderRadius: 10, lineHeight: 1.45,
      }}>
        {exact
          ? 'Use exact times when you need to coordinate with others or remember a hard appointment.'
          : 'Soft windows make time feel like a tide, not a deadline. The default for everyday flow.'}
      </p>
    </div>
  );
  return (
    <div style={{
      display: 'flex', height: '100%',
      background: 'var(--paper-2)',
      fontFamily: '"Geist", system-ui, sans-serif',
    }}>
      {cell(false)}
      <div style={{ width: 1, background: 'var(--line)' }} />
      {cell(true)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GOOGLE CALENDAR TREATMENT (close-up of timeline with pins)
// ─────────────────────────────────────────────────────────────
function CalendarTreatment() {
  return (
    <div style={{
      width: '100%', height: '100%', background: 'var(--paper)',
      padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 18,
      fontFamily: '"Geist", system-ui, sans-serif',
    }}>
      <div>
        <div style={{ fontSize: 11, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-3)' }}>
          calendar integration · light touch
        </div>
        <h2 className="serif" style={{ margin: '4px 0 4px', fontSize: 26, fontWeight: 400, letterSpacing: -0.02 }}>
          Appointments live on the side of the flow.
        </h2>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-3)', maxWidth: 540 }}>
          Google Calendar events appear as small protected markers, not as the spine of the day.
        </p>
      </div>

      <div style={{ flex: 1, display: 'flex', gap: 36, padding: '8px 0 0' }}>
        {/* rail close-up */}
        <div style={{ flex: '0 0 280px' }}>
          <TimelineRail now={11.4} cats={CATS} events={CAL_EVENTS} height={460} highlightId="focus" />
        </div>

        {/* events card */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            padding: '14px 16px', borderRadius: 14,
            border: '1px solid var(--line)', background: 'var(--paper-2)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ color: 'var(--ink-2)' }}>{I.cal}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, color: 'var(--ink)' }}>Google Calendar · alex@</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-3)' }}>2 events visible today · synced 4 min ago</div>
            </div>
            <Toggle on={true} onChange={() => {}} />
          </div>

          <div style={{ fontSize: 11, letterSpacing: 0.08, textTransform: 'uppercase', color: 'var(--ink-3)', marginTop: 4 }}>
            protected moments
          </div>

          {CAL_EVENTS.map(e => (
            <div key={e.id} style={{
              display:'flex', alignItems:'center', gap: 14,
              padding: '14px 16px', borderRadius: 14,
              background: 'var(--paper)', border: '1px solid var(--line)',
            }}>
              <span style={{
                width: 10, height: 10, borderRadius: 3,
                background: 'var(--paper)', border: '1.5px solid var(--ink-3)',
              }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: 'var(--ink)' }}>{e.label}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
                  {fmtTime(e.time)} — {fmtTime(e.time + e.duration)} · {e.duration * 60} min
                </div>
              </div>
              <span style={{
                fontSize: 11, color: 'var(--ink-2)',
                padding: '4px 10px', borderRadius: 99,
                background: 'var(--paper-2)', border: '1px solid var(--line)',
                display:'inline-flex', alignItems:'center', gap: 6,
              }}>{I.pin} protected</span>
            </div>
          ))}

          <p style={{
            margin: '4px 0 0', fontSize: 12.5, color: 'var(--ink-3)',
            padding: '12px 14px', background: 'var(--paper-2)',
            borderRadius: 12, lineHeight: 1.55,
          }}>
            FlowCal won't try to plan inside your meetings. The flow gently bends around them — and rebalance can pause whichever
            category they fall into.
          </p>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  Brand, GhostBtn, PrimaryBtn, TaskRow, CurrentCard, UpNext, TopBar,
  DesktopFlow, MobileFlow, MobileRibbon, MobileTaskPanel,
  RebalanceModal, TemplatesPanel, CategorySettings, CategoryLegend,
  TimeToggleComparison, CalendarTreatment,
});
