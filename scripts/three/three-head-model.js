// HEAD MODEL SOURCE: Replace placeholder below with:
//   import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
//   loader.load('./models/head.glb', (gltf) => { headGroup = gltf.scene; ... });

(function () {
  const canvas = document.getElementById('head-canvas');
  if (!canvas) return; // guard: script does nothing on other pages

  // Scene Setup
  const scene = new THREE.Scene();
  
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const camera = new THREE.PerspectiveCamera(
    45,                            // fov
    canvas.clientWidth / canvas.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 0, 3.2); // centered, slight distance

  // Placeholder Head Model
  const headGroup = new THREE.Group();
  
  // Skull — flattened sphere
  const skullGeo = new THREE.SphereGeometry(1, 64, 48);
  // Chin — scaled and translated ellipsoid
  const chinGeo = new THREE.SphereGeometry(0.62, 32, 24);
  // Nose — small cone
  const noseGeo = new THREE.ConeGeometry(0.12, 0.22, 16);

  // Apply vertex displacement noise to make it organic
  function applyOrganicDisplacement(geometry) {
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      // Simple sine-based displacement
      const noise = Math.sin(x * 3) * Math.cos(y * 2) * Math.sin(z * 2) * 0.03;
      
      positions.setX(i, x + x * noise);
      positions.setY(i, y + y * noise);
      positions.setZ(i, z + z * noise);
    }
    geometry.computeVertexNormals();
  }

  applyOrganicDisplacement(skullGeo);
  applyOrganicDisplacement(chinGeo);
  applyOrganicDisplacement(noseGeo);

  const material = new THREE.MeshStandardMaterial({
    color: 0xc8b8a2,      // warm neutral skin tone
    roughness: 0.72,
    metalness: 0.04,
    wireframe: false
  });

  const skullMesh = new THREE.Mesh(skullGeo, material);
  const chinMesh = new THREE.Mesh(chinGeo, material);
  chinMesh.position.set(0, -0.85, 0.15);
  chinMesh.scale.set(0.9, 0.7, 0.85);

  const noseMesh = new THREE.Mesh(noseGeo, material);
  noseMesh.position.set(0, 0.05, 0.95);
  noseMesh.rotation.x = Math.PI * 0.1;

  headGroup.add(skullMesh);
  headGroup.add(chinMesh);
  headGroup.add(noseMesh);
  scene.add(headGroup);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  const keyLight = new THREE.DirectionalLight(0xfff4e0, 1.2); // warm key
  const fillLight = new THREE.DirectionalLight(0xc8d8ff, 0.4); // cool fill
  keyLight.position.set(2, 3, 4);
  fillLight.position.set(-3, 0, 2);
  scene.add(ambientLight);
  scene.add(keyLight);
  scene.add(fillLight);

  // Mouse Parallax
  let mouse = { x: 0, y: 0 }; // range: -1 to 1

  window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  // Mobile: Gyroscope Fallback
  if (window.matchMedia('(pointer: coarse)').matches) {
    window.addEventListener('deviceorientation', (e) => {
      mouse.x = Math.max(-1, Math.min(1, (e.gamma ?? 0) / 30));
      mouse.y = Math.max(-1, Math.min(1, (e.beta ?? 0) / 30));
    });
  }

  // Morph state
  let morphProgress = 0; // 0 = head, 1 = case-study morph
  let targetMorph = 0;
  let morphTexture = null;
  let headMesh = skullMesh; // primary mesh for morph effects

  // Build image map from DOM
  const casestudyImageMap = {};
  document.querySelectorAll('[data-slide-index]').forEach((el) => {
    const idx = parseInt(el.dataset.slideIndex, 10);
    if (idx < 0) return;
    const img = el.querySelector('img');
    if (img) casestudyImageMap[idx] = img.src || img.dataset.src;
  });

  // Fallback images from window.__slidesData
  const fallbackImages = (window.__slidesData || []).map(d => d.image);

  function activateMorph(slideIndex) {
    const url = casestudyImageMap[slideIndex]
             ?? fallbackImages[slideIndex]
             ?? null;
    if (!url) return;

    new THREE.TextureLoader().load(url, (tex) => {
      morphTexture = tex;
      targetMorph = 1;
    });
  }

  function deactivateMorph() {
    targetMorph = 0;
  }

  // Bind hover listeners
  function bindHoverListeners(navEl) {
    navEl.querySelectorAll('.home-title').forEach((link) => {
      const slideIndex = parseInt(link.dataset.slideIndex ?? '-1', 10);
      if (slideIndex < 0) return; // skip the "About" link (index -1)

      link.addEventListener('mouseenter', () => activateMorph(slideIndex));
      link.addEventListener('mouseleave', () => deactivateMorph());
      link.addEventListener('focusin', () => activateMorph(slideIndex));
      link.addEventListener('focusout', () => deactivateMorph());
    });
  }

  // Initial binding
  const navEl = document.querySelector('.home-titles');
  if (navEl) bindHoverListeners(navEl);

  // MutationObserver for dynamically added nodes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.addedNodes.length > 0) {
        const navEl = document.querySelector('.home-titles');
        if (navEl) bindHoverListeners(navEl);
      }
    });
  });
  
  const titlesContainer = document.querySelector('.home-titles');
  if (titlesContainer) {
    observer.observe(titlesContainer, { childList: true, subtree: true });
  }

  // Responsive Resize
  window.addEventListener('resize', () => {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  // Render Loop
  function animate() {
    requestAnimationFrame(animate);

    // Mouse parallax
    headGroup.rotation.x += (mouse.y * -0.35 - headGroup.rotation.x) * 0.06;
    headGroup.rotation.y += (mouse.x * 0.45 - headGroup.rotation.y) * 0.06;

    // Morph progress
    morphProgress += (targetMorph - morphProgress) * 0.08;
    if (headMesh.material) {
      headMesh.material.displacementMap = morphTexture;
      headMesh.material.displacementScale = morphProgress * 0.6;
      headMesh.material.map = morphTexture;
      headMesh.material.opacity = morphProgress * 0.35 + (1 - morphProgress);
      headMesh.material.transparent = morphProgress > 0;
      headMesh.material.needsUpdate = true;
    }

    renderer.render(scene, camera);
  }
  animate();
})();
