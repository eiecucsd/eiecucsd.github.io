// Google Sheets Integration

const SHEET_BASE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRFSDjddvSUesDGf8AcUSUfvKqYyhasPnH5Vdi96mhAzOKPuHZbStS4tCV_OaJVd7uffUEqKjSuEj4q/pub';
const BOARD_GID = '0';
const EVENTS_GID = '1476852653';
const PROJECTS_GID = '85582537';
const CONTENT_GID = '909039884';

// CSV PARSER
function parseCSV(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] || '').trim();
    });
    if (Object.values(row).some(v => v)) {
      rows.push(row);
    }
  }
  return rows;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
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

function renderBoard(data) {
  const container = document.getElementById('board-grid');
  if (!container) return;

  if (!data.length) {
    container.innerHTML = '<p class="empty-state">Board members coming soon.</p>';
    return;
  }

  container.innerHTML = data.map(member => `
    <div class="team-card">
      <div class="team-avatar">
        ${member['photo url']
          ? `<img src="${member['photo url']}" alt="${member.name}">`
          : getInitials(member.name || '??')
        }
      </div>
      <div class="team-name">${member.name || ''}</div>
      <div class="team-role">${member.role || ''}</div>
      <div class="team-major">${member.major || ''}</div>
    </div>
  `).join('');
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

  // Load all sheets in parallel
  const [contentData, boardData, eventsData, projectsData] = await Promise.all([
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

  if (boardData) renderBoard(boardData);
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

document.addEventListener('DOMContentLoaded', loadSheetData);
