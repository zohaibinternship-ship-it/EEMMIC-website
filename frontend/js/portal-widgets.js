/* Shared utilities + DOM-building widgets reused across every gated
   (admin/manager/investor/client-portal) page. Plain functions returning
   HTML strings or DOM elements — no framework, matching the rest of the
   site's vanilla-JS approach. */
window.EemmicWidgets = (function () {
  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = value == null ? '' : String(value);
    return div.innerHTML;
  }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function formatDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return formatDate(iso) + ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }

  function formatMoney(amount, currency) {
    const n = Number(amount) || 0;
    return (currency || 'PKR') + ' ' + n.toLocaleString();
  }

  /* Thin fetch wrapper matching the pattern already used in dashboard.js/
     my-dashboard.js: attaches the bearer token, parses JSON, rejects with
     an Error carrying the server's { error } message on non-2xx. */
  function apiFetch(path, opts) {
    opts = opts || {};
    const headers = { 'Authorization': 'Bearer ' + opts.token };
    if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
    return fetch(path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (!result.ok) throw new Error(result.data.error || 'Request failed.');
        return result.data;
      });
  }

  const ICON_PATHS = {
    home: 'M3 11.5 12 4l9 7.5M5 10v9h14v-9',
    inbox: 'M3 7h5l2 3h4l2-3h5M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7M3 7l2-4h14l2 4',
    users: 'M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M11 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    grid: 'M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z',
    tag: 'M20.59 13.41 11 3.83A2 2 0 0 0 9.59 3.24L3 3v6.59a2 2 0 0 0 .59 1.41l9.59 9.59a2 2 0 0 0 2.82 0l4.59-4.59a2 2 0 0 0 0-2.82ZM7 7h.01',
    gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z',
    mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z M22 6l-10 7L2 6',
    pulse: 'M22 12h-4l-3 9L9 3l-3 9H2',
    table: 'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18'
  };

  function icon(name, size) {
    const d = ICON_PATHS[name] || ICON_PATHS.grid;
    size = size || 18;
    // A single <path> handles multiple "M ..." subpaths in one `d` fine —
    // several of the icons above (mail, gear) are drawn as more than one
    // subpath this way.
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>';
  }

  function badge(text, variant) {
    return '<span class="portal-badge portal-badge--' + (variant || 'default') + '">' + escapeHtml(text) + '</span>';
  }

  function statCard(opts) {
    return '<div class="portal-stat-card">' +
      '<div class="portal-stat-card__label">' + escapeHtml(opts.label) + '</div>' +
      '<div class="portal-stat-card__value">' + escapeHtml(opts.value) + '</div>' +
      (opts.sublabel ? '<div class="portal-stat-card__sub">' + escapeHtml(opts.sublabel) + '</div>' : '') +
      '</div>';
  }

  const TIMELINE_ICON = { done: '&#10003;', in_progress: '&#8635;', pending: '&#9675;' };

  function statusTimeline(stages) {
    if (!stages || !stages.length) return '<p class="portal-empty">No timeline yet.</p>';
    return '<ol class="portal-timeline">' + stages.map(function (s) {
      return '<li class="portal-timeline__item portal-timeline__item--' + (s.status || 'pending') + '">' +
        '<span class="portal-timeline__dot">' + (TIMELINE_ICON[s.status] || TIMELINE_ICON.pending) + '</span>' +
        '<span class="portal-timeline__label">' + escapeHtml(s.label) + '</span>' +
        (s.date ? '<span class="portal-timeline__date">' + escapeHtml(formatDate(s.date)) + '</span>' : '') +
        '</li>';
    }).join('') + '</ol>';
  }

  function healthRing(score, size) {
    score = Math.max(0, Math.min(100, Number(score) || 0));
    size = size || 120;
    const r = (size / 2) - 10;
    const c = 2 * Math.PI * r;
    const offset = c * (1 - score / 100);
    const center = size / 2;
    return '<svg class="portal-health-ring" width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' +
      '<circle cx="' + center + '" cy="' + center + '" r="' + r + '" class="portal-health-ring__track"/>' +
      '<circle cx="' + center + '" cy="' + center + '" r="' + r + '" class="portal-health-ring__fill" ' +
        'stroke-dasharray="' + c + '" stroke-dashoffset="' + offset + '" transform="rotate(-90 ' + center + ' ' + center + ')"/>' +
      '<text x="' + center + '" y="' + (center + 7) + '" text-anchor="middle" class="portal-health-ring__text">' + Math.round(score) + '</text>' +
      '</svg>';
  }

  const ALERT_ICON = { critical: '&#9888;', warning: '&#9888;', info: '&#8505;' };

  function alertTicker(alerts, onMarkRead) {
    const wrap = document.createElement('div');
    wrap.className = 'portal-alerts';
    if (!alerts || !alerts.length) {
      wrap.innerHTML = '<p class="portal-empty">No alerts.</p>';
      return wrap;
    }
    alerts.forEach(function (a) {
      const row = document.createElement('div');
      row.className = 'portal-alert portal-alert--' + a.severity + (a.is_read ? ' is-read' : '');
      row.innerHTML =
        '<span class="portal-alert__icon">' + (ALERT_ICON[a.severity] || ALERT_ICON.info) + '</span>' +
        '<span class="portal-alert__body"><strong>' + escapeHtml(a.title) + '</strong><br>' + escapeHtml(a.message) + '</span>' +
        (a.is_read || !onMarkRead ? '' : '<button type="button" class="portal-alert__read-btn">Mark read</button>');
      const btn = row.querySelector('.portal-alert__read-btn');
      if (btn) btn.addEventListener('click', function () { onMarkRead(a.id); });
      wrap.appendChild(row);
    });
    return wrap;
  }

  const KANBAN_COLUMNS = [
    { key: 'todo', label: 'To Do' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'review', label: 'Review' },
    { key: 'done', label: 'Done' }
  ];

  function kanbanBoard(actions, onMove) {
    const wrap = document.createElement('div');
    wrap.className = 'portal-kanban';
    KANBAN_COLUMNS.forEach(function (col, colIndex) {
      const colEl = document.createElement('div');
      colEl.className = 'portal-kanban__col';
      const items = (actions || []).filter(function (a) { return a.status_column === col.key; });
      colEl.innerHTML = '<div class="portal-kanban__col-head">' + col.label + ' <span>' + items.length + '</span></div>';
      items.forEach(function (a) {
        const card = document.createElement('div');
        card.className = 'portal-kanban__card';
        card.innerHTML =
          '<div class="portal-kanban__card-title">' + escapeHtml(a.title) + '</div>' +
          (a.assignee ? '<div class="portal-kanban__card-meta">' + escapeHtml(a.assignee) + '</div>' : '') +
          '<div class="portal-kanban__card-footer">' +
            badge(a.priority, a.priority === 'high' ? 'critical' : a.priority === 'low' ? 'default' : 'warning') +
            '<span class="portal-kanban__card-moves"></span>' +
          '</div>';
        const moves = card.querySelector('.portal-kanban__card-moves');
        if (onMove) {
          if (colIndex > 0) {
            const left = document.createElement('button');
            left.type = 'button';
            left.className = 'portal-kanban__move';
            left.textContent = '←';
            left.addEventListener('click', function () { onMove(a.id, KANBAN_COLUMNS[colIndex - 1].key); });
            moves.appendChild(left);
          }
          if (colIndex < KANBAN_COLUMNS.length - 1) {
            const right = document.createElement('button');
            right.type = 'button';
            right.className = 'portal-kanban__move';
            right.textContent = '→';
            right.addEventListener('click', function () { onMove(a.id, KANBAN_COLUMNS[colIndex + 1].key); });
            moves.appendChild(right);
          }
        }
        colEl.appendChild(card);
      });
      wrap.appendChild(colEl);
    });
    return wrap;
  }

  function messagesThread(messages, onSend) {
    const wrap = document.createElement('div');
    wrap.className = 'portal-messages';

    const thread = document.createElement('div');
    thread.className = 'portal-messages__thread';
    if (!messages || !messages.length) {
      thread.innerHTML = '<p class="portal-empty">No messages yet.</p>';
    } else {
      messages.forEach(function (m) {
        const bubble = document.createElement('div');
        bubble.className = 'portal-message-bubble portal-message-bubble--' + (m.sender === 'client' ? 'client' : 'firm');
        bubble.innerHTML =
          (m.subject ? '<div class="portal-message-bubble__subject">' + escapeHtml(m.subject) + '</div>' : '') +
          '<div class="portal-message-bubble__body">' + escapeHtml(m.body) + '</div>' +
          '<div class="portal-message-bubble__time">' + escapeHtml(formatDateTime(m.created_at)) + '</div>';
        thread.appendChild(bubble);
      });
    }
    wrap.appendChild(thread);

    if (onSend) {
      const form = document.createElement('form');
      form.className = 'portal-messages__composer';
      form.innerHTML =
        '<input type="text" class="portal-messages__subject" placeholder="Subject (optional)">' +
        '<textarea class="portal-messages__body" placeholder="Write a message…" required></textarea>' +
        '<button type="submit" class="btn btn-primary btn-sm">Send</button>';
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const subject = form.querySelector('.portal-messages__subject').value.trim();
        const body = form.querySelector('.portal-messages__body').value.trim();
        if (!body) return;
        onSend({ subject: subject, body: body }, form);
      });
      wrap.appendChild(form);
    }

    return wrap;
  }

  function barChart(data, opts) {
    opts = opts || {};
    const w = opts.width || 480, h = opts.height || 200, pad = 28;
    const max = Math.max(1, ...data.map(function (d) { return d.value; }));
    const barW = (w - pad * 2) / data.length;
    let bars = '';
    data.forEach(function (d, i) {
      const barH = ((h - pad * 2) * d.value) / max;
      const x = pad + i * barW + barW * 0.15;
      const y = h - pad - barH;
      bars += '<rect x="' + x + '" y="' + y + '" width="' + (barW * 0.7) + '" height="' + barH + '" rx="4" class="portal-chart__bar"/>' +
        '<text x="' + (x + barW * 0.35) + '" y="' + (h - pad + 16) + '" class="portal-chart__label" text-anchor="middle">' + escapeHtml(d.label) + '</text>';
    });
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" class="portal-chart">' + bars + '</svg>';
  }

  function donutChart(data, opts) {
    opts = opts || {};
    const size = opts.size || 160, r = size / 2 - 14, center = size / 2;
    const rawTotal = data.reduce(function (s, d) { return s + d.value; }, 0);
    const total = rawTotal || 1;
    const c = 2 * Math.PI * r;
    let offset = 0;
    let circles = '';
    if (!rawTotal) {
      circles += '<circle cx="' + center + '" cy="' + center + '" r="' + r + '" fill="none" stroke-width="16" class="portal-health-ring__track"/>';
    }
    data.forEach(function (d, i) {
      const frac = d.value / total;
      const dash = frac * c;
      circles += '<circle cx="' + center + '" cy="' + center + '" r="' + r + '" fill="none" stroke-width="16" ' +
        'class="portal-chart__donut portal-chart__donut--' + (i % 4) + '" ' +
        'stroke-dasharray="' + dash + ' ' + (c - dash) + '" stroke-dashoffset="' + (-offset) + '" ' +
        'transform="rotate(-90 ' + center + ' ' + center + ')"/>';
      offset += dash;
    });
    return '<svg viewBox="0 0 ' + size + ' ' + size + '" class="portal-chart portal-chart--donut" style="width:' + size + 'px; flex-shrink:0;">' + circles + '</svg>';
  }

  return {
    escapeHtml: escapeHtml,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    formatMoney: formatMoney,
    apiFetch: apiFetch,
    icon: icon,
    badge: badge,
    statCard: statCard,
    statusTimeline: statusTimeline,
    healthRing: healthRing,
    alertTicker: alertTicker,
    kanbanBoard: kanbanBoard,
    messagesThread: messagesThread,
    barChart: barChart,
    donutChart: donutChart
  };
})();
