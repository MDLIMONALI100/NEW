/* ============================================
   HERO 3D SCENE
   Abstract floating geometric shapes that
   "assemble" on load — a nod to compiling code.
   ============================================ */
(function () {
  const canvas = document.getElementById('hero-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isSmallScreen = window.innerWidth < 769;

  const hero = document.querySelector('.hero');
  let width = hero.clientWidth;
  let height = hero.clientHeight;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 0, isSmallScreen ? 11 : 9);

  const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);

  // Lighting — warm, matches the cream/terracotta palette
  const ambient = new THREE.AmbientLight(0xfff1e0, 0.75);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
  keyLight.position.set(5, 6, 8);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight(0xb0663f, 1.4, 30);
  rimLight.position.set(-6, -3, 4);
  scene.add(rimLight);

  const terracotta = 0xb0663f;
  const terracottaSoft = 0xcf9a5c;
  const inkBrown = 0x6b4a34;

  const group = new THREE.Group();
  scene.add(group);

  function makeMesh(geometry, color, opacity, wireframe) {
    const material = wireframe
      ? new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity })
      : new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.15, transparent: true, opacity });
    return new THREE.Mesh(geometry, material);
  }

  // Shape 1: solid icosahedron (large, back-right)
  const icosa = makeMesh(new THREE.IcosahedronGeometry(1.6, 0), terracotta, 0.88, false);
  icosa.position.set(2.6, 0.6, -1.5);
  group.add(icosa);

  // Shape 2: wireframe icosahedron outline slightly larger, same position (assembled look)
  const icosaWire = makeMesh(new THREE.IcosahedronGeometry(1.68, 0), 0xffffff, 0.35, true);
  icosaWire.position.copy(icosa.position);
  group.add(icosaWire);

  // Shape 3: torus (mid, front-left)
  const torus = makeMesh(new THREE.TorusGeometry(1, 0.32, 16, 64), terracottaSoft, 0.9, false);
  torus.position.set(-2.4, -1, 0.5);
  torus.rotation.x = Math.PI / 3;
  group.add(torus);

  // Shape 4: small wireframe cube (top-left, floats independently)
  const cube = makeMesh(new THREE.BoxGeometry(1, 1, 1), inkBrown, 0.5, true);
  cube.position.set(-1.2, 1.8, 1);
  group.add(cube);

  // Shape 5: small solid octahedron (bottom-right accent)
  const octa = makeMesh(new THREE.OctahedronGeometry(0.55, 0), terracotta, 0.85, false);
  octa.position.set(1.4, -1.9, 1.2);
  group.add(octa);

  const shapes = [icosa, icosaWire, torus, cube, octa];

  // Store base positions/rotations for idle animation
  shapes.forEach((mesh, i) => {
    mesh.userData.baseY = mesh.position.y;
    mesh.userData.floatSpeed = 0.4 + i * 0.08;
    mesh.userData.floatOffset = i * 1.3;
  });

  // ---- Assembly intro animation ----
  // Shapes start scattered/scaled down and settle into place, like a build completing.
  const startState = shapes.map((mesh) => ({
    scale: 0.001,
    rotX: Math.random() * Math.PI * 4,
    rotY: Math.random() * Math.PI * 4,
    posOffset: new THREE.Vector3(
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4,
      (Math.random() - 0.5) * 4
    ),
  }));

  const targetPositions = shapes.map((m) => m.position.clone());

  shapes.forEach((mesh, i) => {
    mesh.scale.setScalar(prefersReducedMotion ? 1 : startState[i].scale);
    if (!prefersReducedMotion) {
      mesh.position.add(startState[i].posOffset);
      mesh.rotation.set(startState[i].rotX, startState[i].rotY, 0);
    }
  });

  let introStart = null;
  const introDuration = 1400; // ms

  function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  // ---- Mouse parallax ----
  let targetRotX = 0;
  let targetRotY = 0;
  let currentRotX = 0;
  let currentRotY = 0;

  function onPointerMove(e) {
    const rect = hero.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    targetRotY = x * 0.35;
    targetRotX = y * 0.2;
  }

  if (!isSmallScreen && !prefersReducedMotion) {
    hero.addEventListener('pointermove', onPointerMove);
  }

  // ---- Resize ----
  function onResize() {
    width = hero.clientWidth;
    height = hero.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  window.addEventListener('resize', onResize);

  // ---- Render loop ----
  const clock = new THREE.Clock();

  function animate(timestamp) {
    requestAnimationFrame(animate);

    if (introStart === null) introStart = timestamp;
    const introElapsed = timestamp - introStart;
    const introT = Math.min(introElapsed / introDuration, 1);
    const eased = easeOutBack(introT);

    const elapsed = clock.getElapsedTime();

    shapes.forEach((mesh, i) => {
      if (!prefersReducedMotion && introT < 1) {
        // Settle into place
        mesh.scale.setScalar(THREE.MathUtils.lerp(0.001, 1, eased));
        mesh.position.lerpVectors(
          targetPositions[i].clone().add(startState[i].posOffset),
          targetPositions[i],
          eased
        );
      } else if (!prefersReducedMotion) {
        // Idle float
        const floatY = Math.sin(elapsed * mesh.userData.floatSpeed + mesh.userData.floatOffset) * 0.18;
        mesh.position.y = mesh.userData.baseY + floatY;
        mesh.rotation.x += 0.0025 + i * 0.0004;
        mesh.rotation.y += 0.0032 + i * 0.0003;
      }
    });

    if (!prefersReducedMotion) {
      currentRotX += (targetRotX - currentRotX) * 0.04;
      currentRotY += (targetRotY - currentRotY) * 0.04;
      group.rotation.x = currentRotX;
      group.rotation.y = currentRotY;
    }

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);

  // Fade canvas in once ready
  requestAnimationFrame(() => {
    canvas.classList.add('ready');
  });
})();
