/* ============================================
   CONTACT 3D SCENE
   A single rotating torus knot with small orbiting
   accents — quieter than the hero, just enough
   presence to fill the panel beside the form.
   ============================================ */
(function () {
  const canvas = document.getElementById('contact-canvas');
  if (!canvas || typeof THREE === 'undefined') return;

  const wrap = canvas.parentElement;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let width = wrap.clientWidth;
  let height = wrap.clientHeight;
  if (width === 0 || height === 0) return;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 0, 6.5);

  const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(width, height);

  const ambient = new THREE.AmbientLight(0xfff1e0, 0.8);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
  keyLight.position.set(4, 5, 6);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight(0xb0663f, 1.2, 24);
  rimLight.position.set(-4, -2, 3);
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

  // Centerpiece: torus knot
  const knot = makeMesh(new THREE.TorusKnotGeometry(1.1, 0.32, 120, 16), terracotta, 0.9, false);
  group.add(knot);

  const knotWire = makeMesh(new THREE.TorusKnotGeometry(1.16, 0.34, 90, 12), 0xffffff, 0.22, true);
  group.add(knotWire);

  // Small orbiting accents
  const accentA = makeMesh(new THREE.OctahedronGeometry(0.32, 0), terracottaSoft, 0.85, false);
  const accentB = makeMesh(new THREE.IcosahedronGeometry(0.22, 0), inkBrown, 0.5, true);

  const orbit = new THREE.Group();
  orbit.add(accentA);
  orbit.add(accentB);
  scene.add(orbit);

  accentA.position.set(2.1, 0.6, 0.4);
  accentB.position.set(-1.9, -0.8, 0.6);

  const clock = new THREE.Clock();

  // Intro: scale up from nothing
  group.scale.setScalar(prefersReducedMotion ? 1 : 0.001);
  orbit.scale.setScalar(prefersReducedMotion ? 1 : 0.001);
  let introStart = null;
  const introDuration = 1100;

  function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  let started = false;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !started) {
        started = true;
        requestAnimationFrame(animate);
      }
    });
  }, { threshold: 0.1 });
  io.observe(wrap);

  function onResize() {
    width = wrap.clientWidth;
    height = wrap.clientHeight;
    if (width === 0 || height === 0) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }
  window.addEventListener('resize', onResize);

  function animate(timestamp) {
    requestAnimationFrame(animate);

    if (introStart === null) introStart = timestamp;
    const introT = Math.min((timestamp - introStart) / introDuration, 1);
    const eased = easeOutBack(introT);

    const elapsed = clock.getElapsedTime();

    if (!prefersReducedMotion) {
      if (introT < 1) {
        group.scale.setScalar(THREE.MathUtils.lerp(0.001, 1, eased));
        orbit.scale.setScalar(THREE.MathUtils.lerp(0.001, 1, eased));
      }
      knot.rotation.x = elapsed * 0.28;
      knot.rotation.y = elapsed * 0.36;
      knotWire.rotation.copy(knot.rotation);

      orbit.rotation.y = elapsed * 0.22;
      accentA.rotation.x += 0.01;
      accentB.rotation.y += 0.012;
    }

    renderer.render(scene, camera);
  }

  requestAnimationFrame(() => {
    canvas.classList.add('ready');
  });
})();
