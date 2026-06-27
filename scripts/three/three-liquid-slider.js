(function () {
  const canvas = document.getElementById("liquid-canvas");
  if (!canvas) return;

  // Initialize Three.js Scene
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(
    window.innerWidth / -2,
    window.innerWidth / 2,
    window.innerHeight / 2,
    window.innerHeight / -2,
    1,
    1000
  );
  camera.position.z = 1;

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true,
    antialias: true
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  const slidesData = [
    { 
      title: "Dashboards", 
      summary: "Research-backed AI workflow design that balanced executive summaries with trusted, visible KPI data.",
      url: "pages/dashboard.html",
      image: "./Pictures/Dashboards/Rename Dashboard.png"
    },
    { 
      title: "Inventory", 
      summary: "A real-time operational workflow that replaced spreadsheet tracking with a trusted inventory model across locations, projects, and purchasing.",
      url: "pages/inventory.html",
      image: "./Pictures/Inventory/Inventory Settings.png"
    },
    { 
      title: "Member<br>Portal", 
      summary: "An in-progress IA overhaul aligning a validated content taxonomy with navigation patterns for enterprise HR research discovery.",
      url: "pages/member-portal-overhaul.html",
      image: "./Pictures/Member Portal/Member Portal Mockup.png"
    }, 
    { 
      title: "AI-Coding<br>Portfolio", 
      summary: "A portfolio rebuilt from scratch in code with Cursor, Gemini, and Antigravity — reusable patterns, custom features, and AI woven into the workflow.",
      url: "pages/ai-coding-portfolio.html",
      image: "./Pictures/family-pic.jpg"
    }
  ];

  window.__slidesData = slidesData;

  let textures = [];
  let isLoaded = false;
  const loader = new THREE.TextureLoader();

  // Generate a placeholder texture for missing asset
  function createPlaceholderTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    
    // Abstract pattern
    const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
    grad.addColorStop(0, '#0F172A');
    grad.addColorStop(1, '#1E293B');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    ctx.strokeStyle = 'rgba(59, 130, 246, 0.2)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 1024; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 1024);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(1024, i);
      ctx.stroke();
    }
    
    ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.beginPath();
    ctx.arc(512, 512, 200, 0, Math.PI * 2);
    ctx.fill();

    return new THREE.CanvasTexture(canvas);
  }

  Promise.all(slidesData.map(data => {
    if (data.image === "GENERATED") {
      return Promise.resolve(createPlaceholderTexture());
    }
    return new Promise((resolve) => {
      loader.load(data.image, tex => {
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        resolve(tex);
      }, undefined, (err) => {
        console.error("Texture load error", err);
        resolve(createPlaceholderTexture()); // fallback to placeholder if error
      });
    });
  })).then(loadedTextures => {
    textures = loadedTextures;
    isLoaded = true;
    initShader();
    createTitles();
    updateDOM();
  });

  let material;
  let geometry;
  let mesh;
  let currentIndex = 0;
  let nextIndex = 0;
  let isAnimating = false;
  
  // Parallax tracking
  let targetMouseX = 0;
  let targetMouseY = 0;
  let mouseX = 0;
  let mouseY = 0;

  const vertexShader = `
    varying vec2 vUv;
    uniform vec2 uOffset;
    void main() {
      vUv = uv + uOffset * 0.08; // Parallax effect
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    varying vec2 vUv;
    uniform sampler2D texture1;
    uniform sampler2D texture2;
    uniform float dispFactor;
    uniform float effectFactor;

    // Simple 2D pseudo-random noise for procedural displacement
    float rand(vec2 n) { 
      return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
    }
    float noise(vec2 p){
      vec2 ip = floor(p);
      vec2 u = fract(p);
      u = u*u*(3.0-2.0*u);
      float res = mix(
        mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
        mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
      return res*res;
    }

    void main() {
      vec2 uv = vUv;
      
      // Prevent fetching out of bounds
      uv = clamp(uv, 0.0, 1.0);
      
      float n = noise(uv * 12.0);
      
      vec2 distortedPosition1 = uv + vec2(n * dispFactor * effectFactor, 0.0);
      vec2 distortedPosition2 = uv + vec2(-n * (1.0 - dispFactor) * effectFactor, 0.0);

      // Clamp distortions
      distortedPosition1 = clamp(distortedPosition1, 0.0, 1.0);
      distortedPosition2 = clamp(distortedPosition2, 0.0, 1.0);

      vec4 _texture1 = texture2D(texture1, distortedPosition1);
      vec4 _texture2 = texture2D(texture2, distortedPosition2);

      gl_FragColor = mix(_texture1, _texture2, dispFactor);
    }
  `;

  function initShader() {
    geometry = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight, 1, 1);
    
    // Check for reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const effect = prefersReducedMotion ? 0.0 : 1.2;

    material = new THREE.ShaderMaterial({
      uniforms: {
        effectFactor: { type: "f", value: effect },
        dispFactor: { type: "f", value: 0.0 },
        texture1: { type: "t", value: textures[0] },
        texture2: { type: "t", value: textures[1] },
        uOffset: { type: "v2", value: new THREE.Vector2(0, 0) }
      },
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      transparent: true,
      opacity: 1.0
    });

    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    updateDOM();
  }

  // Handle Resize
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.left = window.innerWidth / -2;
    camera.right = window.innerWidth / 2;
    camera.top = window.innerHeight / 2;
    camera.bottom = window.innerHeight / -2;
    camera.updateProjectionMatrix();
    if (mesh) {
      mesh.geometry.dispose();
      mesh.geometry = new THREE.PlaneGeometry(window.innerWidth, window.innerHeight, 1, 1);
    }
  });

  // Render Loop
  const animate = function () {
    requestAnimationFrame(animate);
    
    // Parallax easing
    mouseX += (targetMouseX - mouseX) * 0.05;
    mouseY += (targetMouseY - mouseY) * 0.05;
    
    if (material) {
      material.uniforms.uOffset.value.set(mouseX, mouseY);
    }
    
    renderer.render(scene, camera);
  };
  animate();

  // Mouse move for parallax
  document.addEventListener('mousemove', (e) => {
    targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
    targetMouseY = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  function updateDOM() {
    // Update left title active state — matches BOTH the real and the
    // looping duplicate copy, since the carousel now scrolls on its own.
    document.querySelectorAll('.home-title').forEach((t) => {
      t.classList.toggle('is-active', Number(t.dataset.slideIndex) === currentIndex);
    });
  }

  // Navigation Logic
  function animateTo(index) {
    if (isAnimating || index === currentIndex || !isLoaded) return;
    isAnimating = true;
    nextIndex = index;

    material.uniforms.texture1.value = textures[currentIndex];
    material.uniforms.texture2.value = textures[nextIndex];
    material.uniforms.dispFactor.value = 0;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dur = prefersReducedMotion ? 0.4 : 1.4;

    gsap.to(material.uniforms.dispFactor, {
      value: 1,
      duration: dur,
      ease: "power2.inOut",
      onUpdate: () => {
        // halfway change DOM
        if(material.uniforms.dispFactor.value > 0.5 && currentIndex !== nextIndex) {
          currentIndex = nextIndex;
          updateDOM();
        }
      },
      onComplete: () => {
        currentIndex = nextIndex;
        material.uniforms.texture1.value = textures[currentIndex];
        material.uniforms.dispFactor.value = 0;
        isAnimating = false;
        updateDOM();
      }
    });
  }

  function nextSlide() {
    animateTo((currentIndex + 1) % textures.length);
  }

  function prevSlide() {
    animateTo((currentIndex - 1 + textures.length) % textures.length);
  }

  // Build left vertical title list next to the NLI input
  function createTitles() {
    const gallery = document.querySelector('.home-gallery');
    if (!gallery) return;

    let container = document.querySelector('.home-titles');
    if (!container) {
      container = document.createElement('nav');
      container.className = 'home-titles';
      container.setAttribute('aria-label', 'Case studies');
      gallery.appendChild(container);
    } else {
      container.innerHTML = '';
    }

    const track = document.createElement('div');
    track.className = 'home-titles__track';

    function buildLink(s, i, isClone) {
      const link = document.createElement('a');
      link.className = 'home-title';
      link.href = s.url || '#';
      link.dataset.slideIndex = i;
      // Strip <br> tags for aria-label for accessibility
      const plainTitle = s.title.replace(/<br\s*\/?>/gi, ' ');
      link.setAttribute('aria-label', plainTitle + ' — View case study');

      if (isClone) {
        // Decorative duplicate — keeps the loop seamless, hidden from a11y tree
        link.setAttribute('aria-hidden', 'true');
        link.tabIndex = -1;
      } else {
        link.dataset.reveal = '';
        link.style.setProperty('--reveal-delay', `${Math.min(i * 80, 240)}ms`);
      }

      const eyebrow = document.createElement('span');
      eyebrow.className = 'home-title__eyebrow';
      eyebrow.setAttribute('aria-hidden', 'true');
      eyebrow.textContent = 'Case study';

      const text = document.createElement('span');
      text.className = 'home-title__text';
      text.innerHTML = s.title;

      link.append(eyebrow, text);

      link.addEventListener('mouseenter', () => {
        animateTo(i);
      });

      return link;
    }

    function buildAboutLink(isClone) {
      const link = document.createElement('a');
      link.className = 'home-title';
      link.href = 'pages/about.html';
      link.dataset.slideIndex = '-1';
      link.setAttribute('aria-label', 'About — View case study');

      if (isClone) {
        link.setAttribute('aria-hidden', 'true');
        link.tabIndex = -1;
      } else {
        link.dataset.reveal = '';
        link.style.setProperty('--reveal-delay', `${Math.min(slidesData.length * 80, 240)}ms`);
      }

      const eyebrow = document.createElement('span');
      eyebrow.className = 'home-title__eyebrow';
      eyebrow.setAttribute('aria-hidden', 'true');
      eyebrow.textContent = 'Case study';

      const text = document.createElement('span');
      text.className = 'home-title__text';
      text.textContent = 'About';

      link.append(eyebrow, text);
      return link;
    }

    // Real, interactive set
    slidesData.forEach((s, i) => track.appendChild(buildLink(s, i, false)));
    track.appendChild(buildAboutLink(false));
    // Duplicate set appended right after — this is what makes the carousel loop seamlessly
    slidesData.forEach((s, i) => track.appendChild(buildLink(s, i, true)));
    track.appendChild(buildAboutLink(true));

    container.appendChild(track);

    if (window.marqueeRafId) cancelAnimationFrame(window.marqueeRafId);
    
    let isHovering = false;
    let scrollY = 0;
    const pxPerFrame = -0.6; // Base auto-scroll speed

    container.addEventListener('mouseenter', () => isHovering = true);
    container.addEventListener('mouseleave', () => isHovering = false);
    
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      scrollY -= e.deltaY;
    }, { passive: false });

    // Touch swipe support
    let touchStartY = 0;
    container.addEventListener('touchstart', (e) => {
      touchStartY = e.touches[0].clientY;
      isHovering = true;
    }, { passive: true });
    
    container.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const y = e.touches[0].clientY;
      scrollY += (y - touchStartY);
      touchStartY = y;
    }, { passive: false });
    
    container.addEventListener('touchend', () => isHovering = false);

    function tick() {
      // Auto-scroll when not interacting
      if (!isHovering) {
        scrollY += pxPerFrame;
      }
      
      const fullHeight = track.getBoundingClientRect().height;
      if (fullHeight > 0) {
        const setHeight = fullHeight / 2;
        if (scrollY <= -setHeight) scrollY += setHeight;
        if (scrollY > 0) scrollY -= setHeight;
      }
      
      track.style.transform = `translateY(${scrollY}px)`;
      window.marqueeRafId = requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    if(e.key === 'ArrowRight') nextSlide();
    if(e.key === 'ArrowLeft') prevSlide();
  });

  // Drag / Swipe to change slides
  let startX = 0;
  canvas.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, {passive: true});
  canvas.addEventListener('touchend', (e) => {
    const endX = e.changedTouches[0].clientX;
    if (startX - endX > 50) nextSlide();
    else if (endX - startX > 50) prevSlide();
  });

  canvas.addEventListener('mousedown', (e) => { startX = e.clientX; });
  canvas.addEventListener('mouseup', (e) => {
    const endX = e.clientX;
    if (startX - endX > 100) nextSlide();
    else if (endX - startX > 100) prevSlide();
  });
})();
