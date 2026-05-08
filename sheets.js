// Google Sheets Integration

const SHEET_BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRFSDjddvSUesDGf8AcUSUfvKqYyhasPnH5Vdi96mhAzOKPuHZbStS4tCV_OaJVd7uffUEqKjSuEj4q/pub';
const BOARD_GID = '0';
const EVENTS_GID = '1476852653';
const PROJECTS_GID = '85582537';
const CONTENT_GID = '909039884';

// CSV Parse
function parseCSV(text) {
  const rows = [];
  let row = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        // Escaped double-quote inside a quoted field
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ',') {
      row.push(current);
      current = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      // End of row. Skip a paired \r\n so we don't emit a blank row.
      row.push(current);
      rows.push(row);
      row = [];
      current = '';
      if (char === '\r' && text[i + 1] === '\n') i++;
      continue;
    }

    current += char;
  }

  // Flush the trailing field/row if the file didn't end with a newline.
  if (current.length || row.length) {
    row.push(current);
    rows.push(row);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map(h => h.trim().toLowerCase());
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const values = rows[r];
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (values[idx] || '').trim();
    });
    if (Object.values(obj).some(v => v)) {
      out.push(obj);
    }
  }
  return out;
}

// FETCH SHEET DATA (with cache)
const sheetCache = {};

async function fetchSheet(gid) {
  if (sheetCache[gid]) return sheetCache[gid];

  const url = `${SHEET_BASE}?gid=${gid}&single=true&output=csv`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch sheet: ${response.status}`);
  const text = await response.text();
  const data = parseCSV(text);
  sheetCache[gid] = data;
  return data;
}

// LOADING SKELETON
function showLoading(containerId, count = 3) {
  const el = document.getElementById(containerId);
  if (!el) return;
  // Only show skeleton if container is empty or has placeholder
  if (el.children.length > 0 && !el.querySelector('.loading-skeleton')) return;
  el.innerHTML = Array(count).fill(
    '<div class="loading-skeleton"><div class="skeleton-shimmer"></div></div>'
  ).join('');
}

// SITE CONTENT (Key/Value text)
let siteContent = {};

function parseContent(data) {
  const content = {};
  data.forEach(row => {
    if (row.key && row.value) {
      content[row.key] = row.value;
    }
  });
  return content;
}

function applyContent() {
  // Fill any element with data-content="key" attribute
  document.querySelectorAll('[data-content]').forEach(el => {
    const key = el.dataset.content;
    if (siteContent[key]) {
      el.textContent = siteContent[key];
    }
  });

  // Fill any element with data-content-html="key" (allows HTML like <br>, <em>)
  document.querySelectorAll('[data-content-html]').forEach(el => {
    const key = el.dataset.contentHtml;
    if (siteContent[key]) {
      el.innerHTML = siteContent[key];
    }
  });
}

// RENDER BOARD
function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// Convert Google Drive share URLs into something an <img> can render.
// Accepts:  https://drive.google.com/file/d/FILE_ID/view?usp=sharing
//           https://drive.google.com/open?id=FILE_ID
//           https://drive.google.com/uc?id=FILE_ID&export=view
//           a bare FILE_ID
// Returns:  https://lh3.googleusercontent.com/d/FILE_ID=w800
// Anything we can't recognize as a Drive URL passes through untouched, so
// direct-hosted images (Imgur, S3, etc.) keep working.
function resolvePhotoUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();

  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]{20,})/,   // /file/d/ID/view
    /[?&]id=([a-zA-Z0-9_-]{20,})/,        // ?id=ID  or  &id=ID
    /^([a-zA-Z0-9_-]{25,})$/,             // raw FILE_ID pasted alone
  ];
  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w800`;
  }

  return trimmed;
}

let boardData = [];

function renderBoard(data) {
  boardData = data;
  const container = document.getElementById('board-grid');
  if (!container) return;

  if (!data.length) {
    container.innerHTML = '<p class="empty-state">Board members coming soon.</p>';
    return;
  }

  container.innerHTML = data.map((member, i) => {
    const photo = resolvePhotoUrl(member['photo url']);
    return `
    <button type="button" class="team-card" data-board-index="${i}">
      <div class="team-avatar">
        ${photo
          ? `<img src="${photo}" alt="${member.name || ''}" referrerpolicy="no-referrer">`
          : getInitials(member.name || '??')
        }
      </div>
      <div class="team-name">${member.name || ''}</div>
      <div class="team-role">${member.role || ''}</div>
    </button>
  `;
  }).join('');
}

// BOARD MODAL — injected once into the body so it survives SPA page swaps
// (those only swap #page-content). Click any board card to open it with the
// member's photo, experience, and fun fact.
function ensureBoardModal() {
  if (document.getElementById('board-modal')) return;

  const html = `
    <div id="board-modal" class="board-modal" aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="board-modal-name">
      <div class="board-modal-backdrop" data-modal-close></div>
      <div class="board-modal-card">
        <button type="button" class="board-modal-close" aria-label="Close" data-modal-close>&times;</button>
        <div class="board-modal-avatar"></div>
        <div class="board-modal-name" id="board-modal-name"></div>
        <div class="board-modal-role"></div>
        <div class="board-modal-block" data-block="experience">
          <div class="board-modal-label">Experience</div>
          <p class="board-modal-text"></p>
        </div>
        <div class="board-modal-block" data-block="funfact">
          <div class="board-modal-label">Fun Fact</div>
          <p class="board-modal-text"></p>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);

  const modal = document.getElementById('board-modal');
  modal.addEventListener('click', (e) => {
    if (e.target.matches('[data-modal-close]')) closeBoardModal();
  });
}

function openBoardModal(member) {
  ensureBoardModal();
  const modal = document.getElementById('board-modal');

  const avatar = modal.querySelector('.board-modal-avatar');
  const photo = resolvePhotoUrl(member['photo url']);
  if (photo) {
    avatar.innerHTML = '';
    const img = document.createElement('img');
    img.src = photo;
    img.alt = member.name || '';
    img.referrerPolicy = 'no-referrer';
    avatar.appendChild(img);
  } else {
    avatar.textContent = getInitials(member.name || '??');
  }

  modal.querySelector('.board-modal-name').textContent = member.name || '';
  modal.querySelector('.board-modal-role').textContent = member.role || '';

  const expBlock = modal.querySelector('[data-block="experience"]');
  expBlock.querySelector('.board-modal-text').textContent = member.experience || '';
  expBlock.style.display = member.experience ? '' : 'none';

  const funBlock = modal.querySelector('[data-block="funfact"]');
  funBlock.querySelector('.board-modal-text').textContent = member['fun fact'] || '';
  funBlock.style.display = member['fun fact'] ? '' : 'none';

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeBoardModal() {
  const modal = document.getElementById('board-modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

// Document-level delegation, set up once. Survives SPA navigation and
// re-renders of the board grid since handlers don't bind to specific cards.
function initBoardClicks() {
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.team-card[data-board-index]');
    if (!card) return;
    const idx = parseInt(card.dataset.boardIndex, 10);
    const member = boardData[idx];
    if (member) openBoardModal(member);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeBoardModal();
  });
}

// RENDER EVENTS
function renderEvents(data) {
  const container = document.getElementById('events-timeline');
  if (!container) return;

  const events = data.filter(e => e.title);

  if (!events.length) {
    container.innerHTML = `
      <div class="empty-state-block">
        <p class="empty-state-title">No upcoming events</p>
        <p class="empty-state">Check back soon!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = events.map(event => {
    const isPast = event.past && event.past.toLowerCase() === 'true';
    return `
      <div class="timeline-item ${isPast ? 'past' : ''} reveal">
        <div class="timeline-date">${event.date || ''}</div>
        <div class="timeline-card">
          <h3>${event.title || ''}</h3>
          <p>${event.description || ''}</p>
          <div class="event-meta">
            ${event.location ? `<span>&#128205; ${event.location}</span>` : ''}
            ${event.time ? `<span>&#128339; ${event.time}</span>` : ''}
            ${event.audience ? `<span>&#127915; ${event.audience}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// RENDER PROJECTS (projects.html cards)
function renderProjectCards(data) {
  const container = document.getElementById('projects-grid');
  if (!container) return;

  // Group by project name
  const projects = [];
  const seen = {};
  data.forEach(row => {
    const name = row['project name'];
    if (!name) return;
    if (!seen[name]) {
      seen[name] = { name, color: row.color, tags: row.tags, description: row.description };
      projects.push(seen[name]);
    }
  });

  if (!projects.length) {
    container.innerHTML = '<p class="empty-state">No projects yet. Check back soon!</p>';
    return;
  }

  const colorTagClass = { green: 'tag-green', blue: 'tag-blue', pink: 'tag-pink', orange: 'tag-orange', purple: 'tag-purple' };

  container.innerHTML = projects.map((p, i) => {
    const tagClass = colorTagClass[p.color] || 'tag-green';
    const tags = p.tags.split(',').map(t => `<span class="tag ${tagClass}">${t.trim()}</span>`).join('');
    return `
      <div class="card tilt-card" data-color="${p.color}">
        <div class="card-body">
          <div class="card-label">Project ${String(i + 1).padStart(2, '0')}</div>
          <div class="card-title">${p.name}</div>
          <p class="card-text">${p.description}</p>
          <div class="card-tags">${tags}</div>
        </div>
      </div>
    `;
  }).join('');
}

// RENDER RECRUITMENT (roles per project)
function renderRecruitment(data) {
  const container = document.getElementById('recruitment-projects');
  if (!container) return;

  // Group roles by project
  const projectOrder = [];
  const projectMap = {};
  data.forEach(row => {
    const name = row['project name'];
    if (!name) return;
    if (!projectMap[name]) {
      projectMap[name] = {
        name, color: row.color, tags: row.tags, description: row.description, roles: []
      };
      projectOrder.push(name);
    }
    projectMap[name].roles.push(row);
  });

  if (!projectOrder.length) {
    container.innerHTML = '<p class="empty-state">No open roles right now. Check back soon!</p>';
    return;
  }

  const total = projectOrder.length;
  const colorTagClass = { green: 'tag-green', blue: 'tag-blue', pink: 'tag-pink', orange: 'tag-orange', purple: 'tag-purple' };
  const roleTagClass = { biz: 'tag-biz', swe: 'tag-swe', hw: 'tag-hw', design: 'tag-design', mkt: 'tag-mkt' };

  // Update stats
  const statsRoles = document.getElementById('stat-open-roles');
  const statsProjects = document.getElementById('stat-active-projects');
  const statsHours = document.getElementById('stat-hours');
  if (statsRoles) statsRoles.textContent = data.length;
  if (statsProjects) statsProjects.textContent = total;

  // Calculate average hours from "hours" column (e.g. "5-8 hrs / week")
  if (statsHours) {
    const lows = [];
    const highs = [];
    data.forEach(r => {
      const match = (r.hours || '').match(/(\d+)\s*[-–]\s*(\d+)/);
      if (match) {
        lows.push(parseInt(match[1]));
        highs.push(parseInt(match[2]));
      }
    });
    if (lows.length) {
      const avgLow = Math.floor(lows.reduce((a, b) => a + b, 0) / lows.length);
      const avgHigh = Math.floor(highs.reduce((a, b) => a + b, 0) / highs.length);
      statsHours.textContent = `${avgLow}–${avgHigh}`;
    }
  }

  container.innerHTML = projectOrder.map((name, i) => {
    const p = projectMap[name];
    const ptags = p.tags.split(',').map(t => `<span class="ptag">${t.trim()}</span>`).join('');

    const roles = p.roles.map(r => {
      const rTagClass = roleTagClass[r['role type']] || 'tag-biz';
      return `
        <div class="role-card" data-type="${r['role type']}">
          <div class="role-top">
            <span class="role-title">${r['role title']}</span>
            <span class="role-tag ${rTagClass}">${r['role tag label']}</span>
          </div>
          <p class="role-desc">${r['role description']}</p>
          <div class="role-footer">
            <span class="role-time">${r.hours || '5-8 hrs / week'}</span>
            ${r['apply url'] ? `<a href="${r['apply url']}" target="_blank" class="apply-btn">Apply →</a>` : ''}
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="project reveal" data-color="${p.color}">
        <div class="project-header">
          <div class="project-header-left">
            <span class="project-num">${String(i + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</span>
            <span class="project-name">${p.name}</span>
            <span class="project-tagline">${p.description}</span>
          </div>
          <div class="project-tags">${ptags}</div>
        </div>
        <div class="roles-grid">${roles}</div>
      </div>
    `;
  }).join('');
}

// INIT
async function loadSheetData() {
  // Show loading skeletons for containers that exist on this page
  showLoading('board-grid', 4);
  showLoading('events-timeline', 3);
  showLoading('projects-grid', 6);
  showLoading('recruitment-projects', 3);

  // Load all sheets in parallel.
  // Note: boardRows (not boardData) on purpose — the module-level `boardData`
  // is set by renderBoard() itself for the click handler to read later.
  const [contentData, boardRows, eventsData, projectsData] = await Promise.all([
    fetchSheet(CONTENT_GID).catch(e => { console.warn('Failed to load content:', e); return null; }),
    fetchSheet(BOARD_GID).catch(e => { console.warn('Failed to load board:', e); return null; }),
    fetchSheet(EVENTS_GID).catch(e => { console.warn('Failed to load events:', e); return null; }),
    fetchSheet(PROJECTS_GID).catch(e => { console.warn('Failed to load projects:', e); return null; }),
  ]);

  // Apply content
  if (contentData) {
    siteContent = parseContent(contentData);
    applyContent();
  }

  if (boardRows) renderBoard(boardRows);
  if (eventsData) renderEvents(eventsData);
  if (projectsData) {
    renderProjectCards(projectsData);
    renderRecruitment(projectsData);
  }

  // Re-init effects on dynamically loaded content
  if (typeof initScrollReveal === 'function') initScrollReveal();
  if (typeof initWaveformPulse === 'function') initWaveformPulse();
  if (typeof initTilt === 'function') initTilt();
}

document.addEventListener('DOMContentLoaded', () => {
  initBoardClicks();
  loadSheetData();
});
