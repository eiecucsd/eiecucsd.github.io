// Effects Engine

// THREE.JS PARTICLE NETWORK (Hero)
function initParticles() {
  const canvas = document.getElementById('global-particles');
  if (!canvas || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Particles
  const particleCount = 120;
  const positions = new Float32Array(particleCount * 3);
  const velocities = [];
  const spread = 20;

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread;
    positions[i * 3 + 2] = (Math.random() - 0.5) * spread;
    velocities.push({
      x: (Math.random() - 0.5) * 0.008,
      y: (Math.random() - 0.5) * 0.008,
      z: (Math.random() - 0.5) * 0.008,
    });
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xFFA820,
    size: 0.06,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  // Lines between nearby particles
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xFFA820,
    transparent: true,
    opacity: 0.08,
    blending: THREE.AdditiveBlending,
  });

  let linesMesh = null;

  function updateLines() {
    if (linesMesh) scene.remove(linesMesh);

    const linePositions = [];
    const threshold = 4;

    for (let i = 0; i < particleCount; i++) {
      for (let j = i + 1; j < particleCount; j++) {
        const dx = positions[i * 3] - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < threshold) {
          linePositions.push(
            positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
            positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]
          );
        }
      }
    }

    if (linePositions.length > 0) {
      const lineGeometry = new THREE.BufferGeometry();
      lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
      linesMesh = new THREE.LineSegments(lineGeometry, lineMaterial);
      scene.add(linesMesh);
    }
  }

  camera.position.z = 12;

  // Mouse interaction
  let mouseX = 0, mouseY = 0;
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  // Animation
  let frame = 0;
  function animate() {
    requestAnimationFrame(animate);
    frame++;

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] += velocities[i].x;
      positions[i * 3 + 1] += velocities[i].y;
      positions[i * 3 + 2] += velocities[i].z;

      // Bounce
      const half = spread / 2;
      if (Math.abs(positions[i * 3]) > half) velocities[i].x *= -1;
      if (Math.abs(positions[i * 3 + 1]) > half) velocities[i].y *= -1;
      if (Math.abs(positions[i * 3 + 2]) > half) velocities[i].z *= -1;
    }

    geometry.attributes.position.needsUpdate = true;

    // Update lines every 3 frames for performance
    if (frame % 3 === 0) updateLines();

    // Subtle camera movement following mouse
    camera.position.x += (mouseX * 2 - camera.position.x) * 0.02;
    camera.position.y += (mouseY * 1.5 - camera.position.y) * 0.02;
    camera.lookAt(0, 0, 0);

    // Slow rotation
    points.rotation.y += 0.0005;
    if (linesMesh) linesMesh.rotation.y += 0.0005;

    renderer.render(scene, camera);
  }

  animate();

  // Resize handler
  window.addEventListener('resize', () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
}

// THREE.JS WIREFRAME GEAR (Home Hero)
function initGear() {
  const canvas = document.getElementById('gear-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  // Build gear shape as points + lines
  const gearGroup = new THREE.Group();

  // Gear parameters
  const teeth = 16;
  const innerR = 2.2;
  const outerR = 3.0;
  const toothDepth = 0.6;
  const thickness = 0.6;

  // Generate gear profile points (2D, then extrude)
  function gearProfile() {
    const pts = [];
    const step = (Math.PI * 2) / teeth;
    for (let i = 0; i < teeth; i++) {
      const a0 = i * step;
      const a1 = a0 + step * 0.15;
      const a2 = a0 + step * 0.35;
      const a3 = a0 + step * 0.5;
      const a4 = a0 + step * 0.65;
      const a5 = a0 + step * 0.85;
      // Outer base
      pts.push([Math.cos(a0) * outerR, Math.sin(a0) * outerR]);
      pts.push([Math.cos(a1) * outerR, Math.sin(a1) * outerR]);
      // Tooth rise
      pts.push([Math.cos(a2) * (outerR + toothDepth), Math.sin(a2) * (outerR + toothDepth)]);
      // Tooth top
      pts.push([Math.cos(a3) * (outerR + toothDepth), Math.sin(a3) * (outerR + toothDepth)]);
      // Tooth fall
      pts.push([Math.cos(a4) * (outerR + toothDepth), Math.sin(a4) * (outerR + toothDepth)]);
      // Back to base
      pts.push([Math.cos(a5) * outerR, Math.sin(a5) * outerR]);
    }
    return pts;
  }

  const profile = gearProfile();

  // Two gears layered: coral base + amber on top
  // Light point follows cursor, clamped to max radius from gear center
  const defaultLightPos = new THREE.Vector3(-(outerR + toothDepth), outerR + toothDepth, 0);
  const lightPoint = defaultLightPos.clone();
  const maxLightRadius = defaultLightPos.length(); // distance of default position from center
  const maxDist = (outerR + toothDepth) * 2.5;

  const amberMaterial = new THREE.LineBasicMaterial({
    color: 0xFFA820,
    vertexColors: true,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
  });

  const coralMaterial = new THREE.LineBasicMaterial({
    color: 0xad4400,
    vertexColors: true,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
  });

  const glowMaterial = new THREE.LineBasicMaterial({
    color: 0xFFA820,
    transparent: true,
    opacity: 0.15,
    blending: THREE.AdditiveBlending,
  });

  // Track all geometry pairs for per-frame color updates
  const gearLinePairs = []; // [{amberGeo, coralGeo}, ...]

  function addGearLine(geo) {
    const amberGeo = geo;
    const coralGeo = geo.clone();
    // Initialize color attributes
    const count = amberGeo.attributes.position.count;
    amberGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    coralGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    gearLinePairs.push({ amberGeo, coralGeo });
    gearGroup.add(new THREE.Line(amberGeo, amberMaterial));
    gearGroup.add(new THREE.Line(coralGeo, coralMaterial));
  }

  // Update vertex colors based on world-space position each frame
  const _v = new THREE.Vector3();
  function updateGearColors() {
    for (const pair of gearLinePairs) {
      const pos = pair.amberGeo.attributes.position;
      const amberCol = pair.amberGeo.attributes.color;
      const coralCol = pair.coralGeo.attributes.color;
      for (let i = 0; i < pos.count; i++) {
        _v.set(pos.getX(i), pos.getY(i), pos.getZ(i));
        // Transform to world space
        gearGroup.localToWorld(_v);
        const dist = _v.distanceTo(lightPoint);
        const t = Math.min(dist / maxDist, 1.0);
        // How far is the light from gear center (0 = center, 1 = edge)
        const intensity = Math.min(lightPoint.length() / maxLightRadius, 1.0);
        // Amber: lerp between full brightness (cursor at center) and distance-based (cursor at edge)
        const a = 1.0 - (1.0 - t) * intensity;
        amberCol.setXYZ(i, a, a, a);
        // Coral: only visible when cursor is at edge, near the light point
        const c = Math.pow(1 - t, 0.5) * intensity;
        coralCol.setXYZ(i, c, c, c);
      }
      amberCol.needsUpdate = true;
      coralCol.needsUpdate = true;
    }
  }

  // Front face outline
  function faceLoop(z) {
    const pts = [];
    for (const p of profile) {
      pts.push(new THREE.Vector3(p[0], p[1], z));
    }
    pts.push(pts[0].clone());
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    return geo;
  }

  const frontGeo = faceLoop(thickness / 2);
  const backGeo = faceLoop(-thickness / 2);
  addGearLine(frontGeo);
  addGearLine(backGeo);

  // Glow copies
  gearGroup.add(new THREE.Line(frontGeo.clone(), glowMaterial));
  gearGroup.add(new THREE.Line(backGeo.clone(), glowMaterial));

  // Connecting edges (front to back at each profile point)
  for (let i = 0; i < profile.length; i += 3) {
    const p = profile[i];
    const connGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(p[0], p[1], thickness / 2),
      new THREE.Vector3(p[0], p[1], -thickness / 2),
    ]);
    addGearLine(connGeo);
  }

  // Inner circle (hub)
  const hubR = 1.0;
  const hubPts = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    hubPts.push(new THREE.Vector3(Math.cos(a) * hubR, Math.sin(a) * hubR, thickness / 2));
  }
  addGearLine(new THREE.BufferGeometry().setFromPoints(hubPts));

  const hubBack = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    hubBack.push(new THREE.Vector3(Math.cos(a) * hubR, Math.sin(a) * hubR, -thickness / 2));
  }
  addGearLine(new THREE.BufferGeometry().setFromPoints(hubBack));

  // Spokes connecting hub to gear body
  const spokeCount = 6;
  for (let i = 0; i < spokeCount; i++) {
    const a = (i / spokeCount) * Math.PI * 2;
    const spoke = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(Math.cos(a) * hubR, Math.sin(a) * hubR, 0),
      new THREE.Vector3(Math.cos(a) * innerR, Math.sin(a) * innerR, 0),
    ]);
    addGearLine(spoke);
  }

  // Center axle hole
  const axleR = 0.4;
  const axlePts = [];
  for (let i = 0; i <= 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    axlePts.push(new THREE.Vector3(Math.cos(a) * axleR, Math.sin(a) * axleR, thickness / 2 + 0.01));
  }
  addGearLine(new THREE.BufferGeometry().setFromPoints(axlePts));

  // Initial slight angle so it's not a flat front view
  gearGroup.rotation.x = -0.4;
  gearGroup.rotation.y = -0.3;

  scene.add(gearGroup);
  camera.position.set(0, 0, window.innerWidth <= 1024 ? 14 : 11);

  // Mouse interaction
  let mouseX = 0, mouseY = 0;
  let gearMouseX = 0, gearMouseY = 0;
  const _raycaster = new THREE.Raycaster();
  const _gearPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const _intersect = new THREE.Vector3();

  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;

    // Mouse position relative to gear canvas
    const rect = canvas.getBoundingClientRect();
    gearMouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    gearMouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  });

  function animate() {
    requestAnimationFrame(animate);

    // Update light point to follow cursor, clamped to max radius
    _raycaster.setFromCamera({ x: gearMouseX, y: gearMouseY }, camera);
    if (_raycaster.ray.intersectPlane(_gearPlane, _intersect)) {
      // Clamp to max radius
      const dist = _intersect.length();
      if (dist > maxLightRadius) {
        _intersect.normalize().multiplyScalar(maxLightRadius);
      }
      lightPoint.lerp(_intersect, 0.1); // smooth follow
    }

    // Slow rotation
    gearGroup.rotation.z += 0.003;

    // Tilt with mouse (additive to base angle)
    gearGroup.rotation.x += (-0.4 + mouseY * 0.25 - gearGroup.rotation.x) * 0.03;
    gearGroup.rotation.y += (-0.3 + mouseX * 0.25 - gearGroup.rotation.y) * 0.03;

    // Update world matrix before computing world-space colors
    gearGroup.updateMatrixWorld(true);
    updateGearColors();

    renderer.render(scene, camera);
  }

  animate();

  window.addEventListener('resize', () => {
    if (canvas.clientWidth === 0 || canvas.clientHeight === 0) return;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.position.z = window.innerWidth <= 1024 ? 14 : 11;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });
}

// THREE.JS WIREFRAME CALENDAR (Events Hero)
// Honestly unsure if this looks good
function initCalendar() {
  const canvas = document.getElementById('calendar-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const calGroup = new THREE.Group();

  const edgeMat = new THREE.LineBasicMaterial({
    color: 0xFFA820,
    transparent: true,
    opacity: 0.85,
    blending: THREE.AdditiveBlending,
  });

  const dimMat = new THREE.LineBasicMaterial({
    color: 0xFFA820,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
  });

  // Calendar body dimensions
  const w = 5, h = 4.5, d = 0.3;
  const headerH = 0.8;

  // Helper: line between two points
  function line(x1, y1, z1, x2, y2, z2, mat) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(x1, y1, z1),
      new THREE.Vector3(x2, y2, z2),
    ]);
    calGroup.add(new THREE.Line(geo, mat || edgeMat));
  }

  // Helper: rectangle outline
  function rect(x, y, z, rw, rh, mat) {
    line(x, y, z, x + rw, y, z, mat);
    line(x + rw, y, z, x + rw, y - rh, z, mat);
    line(x + rw, y - rh, z, x, y - rh, z, mat);
    line(x, y - rh, z, x, y, z, mat);
  }

  const x0 = -w / 2, y0 = h / 2;

  // Front face - outer frame
  rect(x0, y0, d / 2, w, h, edgeMat);

  // Back face - outer frame
  rect(x0, y0, -d / 2, w, h, dimMat);

  // Connect front to back (4 corners)
  line(x0, y0, d / 2, x0, y0, -d / 2, dimMat);
  line(x0 + w, y0, d / 2, x0 + w, y0, -d / 2, dimMat);
  line(x0, y0 - h, d / 2, x0, y0 - h, -d / 2, dimMat);
  line(x0 + w, y0 - h, d / 2, x0 + w, y0 - h, -d / 2, dimMat);

  // Header separator line
  line(x0, y0 - headerH, d / 2 + 0.01, x0 + w, y0 - headerH, d / 2 + 0.01, edgeMat);

  // Grid lines (7 columns, 5 rows for days)
  const cols = 7, rows = 5;
  const cellW = w / cols;
  const gridH = h - headerH;
  const cellH = gridH / rows;
  const gridY = y0 - headerH;

  // Vertical grid lines
  for (let i = 1; i < cols; i++) {
    line(x0 + i * cellW, gridY, d / 2 + 0.01, x0 + i * cellW, gridY - gridH, d / 2 + 0.01, dimMat);
  }

  // Horizontal grid lines
  for (let i = 1; i < rows; i++) {
    line(x0, gridY - i * cellH, d / 2 + 0.01, x0 + w, gridY - i * cellH, d / 2 + 0.01, dimMat);
  }

  // Calendar ring holes at top
  const ringSpacing = w / 4;
  for (let i = 1; i <= 3; i++) {
    const rx = x0 + i * ringSpacing;
    const ry = y0 + 0.15;

    // Ring (small circle)
    const ringPts = [];
    for (let j = 0; j <= 24; j++) {
      const a = (j / 24) * Math.PI * 2;
      ringPts.push(new THREE.Vector3(rx, ry + Math.sin(a) * 0.25, d / 2 + Math.cos(a) * 0.25));
    }
    calGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(ringPts), edgeMat));
  }

  // Event markers - shapes inside cells
  const highlightMat = new THREE.LineBasicMaterial({
    color: 0xFF944F,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
  });

  const zFront = d / 2 + 0.02;
  const markerSize = Math.min(cellW, cellH) * 0.28;

  function cellCenter(col, row) {
    return {
      x: x0 + col * cellW + cellW / 2,
      y: gridY - row * cellH - cellH / 2,
    };
  }

  function shapeFromPts(pts) {
    pts.push(pts[0].clone());
    calGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), highlightMat));
  }

  // Square 1
  const d1 = cellCenter(1, 0);
  const sq1S = markerSize;
  shapeFromPts([
    new THREE.Vector3(d1.x - sq1S, d1.y + sq1S, zFront),
    new THREE.Vector3(d1.x + sq1S, d1.y + sq1S, zFront),
    new THREE.Vector3(d1.x + sq1S, d1.y - sq1S, zFront),
    new THREE.Vector3(d1.x - sq1S, d1.y - sq1S, zFront),
  ]);

  // Circle
  const c1 = cellCenter(3, 1);
  const circleR = markerSize * 1.1;
  const circlePts = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    circlePts.push(new THREE.Vector3(c1.x + Math.cos(a) * circleR, c1.y + Math.sin(a) * circleR, zFront));
  }
  calGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(circlePts), highlightMat));

  // Triangle
  const t1 = cellCenter(5, 2);
  const triS = markerSize * 1.2;
  shapeFromPts([
    new THREE.Vector3(t1.x, t1.y + triS, zFront),
    new THREE.Vector3(t1.x + triS, t1.y - triS * 0.7, zFront),
    new THREE.Vector3(t1.x - triS, t1.y - triS * 0.7, zFront),
  ]);

  // Star
  const s1 = cellCenter(2, 3);
  const starR = markerSize * 1.4;
  const starPts = [];
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const r = i % 2 === 0 ? starR * 0.45 : starR;
    starPts.push(new THREE.Vector3(s1.x + Math.cos(a) * r, s1.y + Math.sin(a) * r, zFront));
  }
  starPts.push(starPts[0].clone());
  calGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(starPts), highlightMat));

  // Square 2
  const sq2 = cellCenter(4, 4);
  shapeFromPts([
    new THREE.Vector3(sq2.x - sq1S, sq2.y + sq1S, zFront),
    new THREE.Vector3(sq2.x + sq1S, sq2.y + sq1S, zFront),
    new THREE.Vector3(sq2.x + sq1S, sq2.y - sq1S, zFront),
    new THREE.Vector3(sq2.x - sq1S, sq2.y - sq1S, zFront),
  ]);

  // Slight initial angle
  calGroup.rotation.x = -0.25;
  calGroup.rotation.y = -0.2;

  scene.add(calGroup);
  camera.position.set(0, 0.25, window.innerWidth <= 1024 ? 14 : 11);

  // Mouse interaction
  let mouseX = 0, mouseY = 0;
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth) * 2 - 1;
    mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  function animate() {
    requestAnimationFrame(animate);

    // Slow float
    calGroup.rotation.z = Math.sin(Date.now() * 0.0005) * 0.03;

    // Tilt with mouse
    calGroup.rotation.x += (-0.25 + mouseY * 0.15 - calGroup.rotation.x) * 0.03;
    calGroup.rotation.y += (-0.2 + mouseX * 0.15 - calGroup.rotation.y) * 0.03;

    renderer.render(scene, camera);
  }

  animate();

  window.addEventListener('resize', () => {
    if (canvas.clientWidth === 0 || canvas.clientHeight === 0) return;
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    camera.aspect = cw / ch;
    camera.position.z = window.innerWidth <= 1024 ? 14 : 11;
    camera.updateProjectionMatrix();
    renderer.setSize(cw, ch);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  });
}

// SCROLL REVEAL
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal, .reveal-stagger');
  if (!reveals.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  reveals.forEach(el => observer.observe(el));
}

// 3D TILT ON CARDS
function initTilt() {
  if (window.innerWidth < 781) return;

  document.querySelectorAll('.tilt-card').forEach(card => {
    // Add a subtle glow overlay that follows cursor
    let glow = card.querySelector('.tilt-glow');
    if (!glow) {
      glow = document.createElement('div');
      glow.className = 'tilt-glow';
      card.style.position = 'relative';
      glow.style.cssText = `
        position: absolute;
        inset: 0;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.3s ease;
        z-index: 2;
        border-radius: inherit;
        background: radial-gradient(circle at 50% 50%, rgba(255,168,32,0.04) 0%, transparent 60%);
      `;
      card.appendChild(glow);
    }

    // Smooth spring animation
    let currentX = 0, currentY = 0;
    let targetX = 0, targetY = 0;
    let rafId = null;

    function springAnimate() {
      currentX += (targetX - currentX) * 0.12;
      currentY += (targetY - currentY) * 0.12;

      card.style.transform = `perspective(800px) rotateX(${currentY}deg) rotateY(${currentX}deg) scale3d(1.02, 1.02, 1.02)`;

      const dist = Math.abs(targetX - currentX) + Math.abs(targetY - currentY);
      if (dist > 0.01) {
        rafId = requestAnimationFrame(springAnimate);
      } else {
        rafId = null;
      }
    }

    function startSpring() {
      if (!rafId) {
        rafId = requestAnimationFrame(springAnimate);
      }
    }

    card.addEventListener('mouseenter', () => {
      glow.style.opacity = '1';
    });

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;

      targetX = (x - 0.5) * 12;
      targetY = (y - 0.5) * -12;

      glow.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,168,32,0.04) 0%, transparent 60%)`;

      startSpring();
    });

    card.addEventListener('mouseleave', () => {
      targetX = 0;
      targetY = 0;
      glow.style.opacity = '0';
      startSpring();
    });
  });
}

// IMAGE CAROUSEL
let carouselIndex = 0;
let carouselTotal = 0;
let carouselBusy = false;

function carouselMove(dir) {
  const track = document.getElementById('carousel-track');
  if (!track || carouselBusy || carouselTotal === 0) return;

  carouselBusy = true;
  carouselIndex += dir;
  track.style.transition = 'transform 0.4s ease';
  track.style.transform = `translateX(-${carouselIndex * 100}%)`;

  setTimeout(() => {
    // After transition completes, check if we're on a clone
    if (carouselIndex <= 0) {
      // On clone of last - jump to real last
      carouselIndex = carouselTotal;
      track.style.transition = 'none';
      track.style.transform = `translateX(-${carouselIndex * 100}%)`;
    } else if (carouselIndex > carouselTotal) {
      // On clone of first - jump to real first
      carouselIndex = 1;
      track.style.transition = 'none';
      track.style.transform = `translateX(-${carouselIndex * 100}%)`;
    }
    carouselBusy = false;
  }, 420);
}

function initCarousel() {
  const track = document.getElementById('carousel-track');
  if (!track) return;

  fetch('photos/photos.json')
    .then(r => r.json())
    .then(files => {
      if (!files.length) {
        track.innerHTML = '<div class="carousel-placeholder">Photos coming soon. Stay tuned!</div>';
        return;
      }

      carouselTotal = files.length;
      const allFiles = [files[files.length - 1], ...files, files[0]];
      track.innerHTML = allFiles.map(f => `<img src="photos/${f}" alt="EIEC">`).join('');

      carouselIndex = 1;
      track.style.transition = 'none';
      track.style.transform = `translateX(-${carouselIndex * 100}%)`;
      carouselBusy = false;
    })
    .catch(() => {
      track.innerHTML = '<div class="carousel-placeholder">Photos coming soon. Stay tuned!</div>';
    });
}

// WAVEFORM PULSE BORDERS (OK they aren't really "waveforms" but whatever)
function initWaveformPulse() {
  const colorMap = {
    green: 'waveform-green',
    blue: 'waveform-blue',
    pink: 'waveform-pink',
    orange: 'waveform-orange',
    purple: 'waveform-purple',
  };

  const selectors = '.card, .project, .cta-banner, .timeline-card, .team-card, .about-visual, .hero-stats, .role-card, .carousel';
  document.querySelectorAll(selectors).forEach(el => {
    if (el.classList.contains('waveform-pulse')) return;

    el.classList.add('waveform-pulse');

    // Determine color
    const dataColor = el.dataset.color || (el.closest('[data-color]')?.dataset.color);
    if (dataColor && colorMap[dataColor]) {
      el.classList.add(colorMap[dataColor]);
    }

  });
}

// SPA PAGE TRANSITIONS
function initSPA() {
  // Intercept nav clicks and internal links
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    // Only handle local .html links
    if (!href || href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:')) return;
    if (link.target === '_blank') return;

    e.preventDefault();

    // Don't transition to the same page
    const currentPage = location.pathname.split('/').pop() || 'index.html';
    if (href === currentPage) return;

    navigateTo(href);
  });

  // Handle browser back/forward
  window.addEventListener('popstate', () => {
    const page = location.pathname.split('/').pop() || 'index.html';
    navigateTo(page, false);
  });
}

function navigateTo(href, pushState = true) {
  const content = document.getElementById('page-content');
  if (!content) { window.location.href = href; return; }

  // Fade out
  content.classList.add('fade-out');

  setTimeout(() => {
    // Fetch new page
    fetch(href)
      .then(r => r.text())
      .then(html => {
        // Parse the fetched HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const newContent = doc.getElementById('page-content');

        if (!newContent) { window.location.href = href; return; }

        // Swap content
        content.innerHTML = newContent.innerHTML;
        content.className = 'fade-in';

        // Update URL
        if (pushState) history.pushState(null, '', href);

        // Update page title
        document.title = doc.title;

        // Update active nav link
        const navLinks = document.querySelectorAll('.nav-links a');
        navLinks.forEach(a => {
          const aHref = a.getAttribute('href');
          a.classList.toggle('active', aHref === href);
        });

        // Update active footer link styling too
        const footerLinks = document.querySelectorAll('.footer-links a');
        footerLinks.forEach(a => {
          const aHref = a.getAttribute('href');
          a.classList.toggle('active', aHref === href);
        });

        // Scroll to top
        window.scrollTo(0, 0);

        // Re-run page-specific scripts
        const newScripts = doc.querySelectorAll('script:not([src])');
        newScripts.forEach(script => {
          const s = document.createElement('script');
          s.textContent = script.textContent;
          document.body.appendChild(s);
          document.body.removeChild(s);
        });

        // Re-init effects for new content
        initScrollReveal();
        initTilt();
        initWaveformPulse();
        initCarousel();

        // Init page-specific 3D elements
        if (href === 'index.html') initGear();
        if (href === 'events.html') initCalendar();

        // Re-load sheet data (board + events)
        if (typeof loadSheetData === 'function') loadSheetData();

        // Fade in
        requestAnimationFrame(() => {
          content.classList.remove('fade-in');
        });
      })
      .catch(() => {
        // Fallback to normal navigation on error
        window.location.href = href;
      });
  }, 180); // Match CSS transition duration
}

// INIT ALL
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initGear();
  initCalendar();
  initScrollReveal();
  initTilt();
  initWaveformPulse();
  initCarousel();
  initSPA();
});
