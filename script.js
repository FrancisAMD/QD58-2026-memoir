// V9：移动端字号加大；音乐菜单（选曲 + 静音）；卡片区更易读
(() => {
  // ========== 背景音乐曲目列表 ==========
  // 把文件放进 music/ 目录，文件名（不带后缀）写在这里即可。
  // 例如 music/01.mp3、music/夏日.mp3 → 写 '01'、'夏日'
  const MUSIC_TRACKS = ['City of Tears', '愛ゆえの決断'];

  const isEditableTarget = target => !!target?.closest?.('input, textarea, select, [contenteditable="true"]');
  document.addEventListener('copy', e => { if (!isEditableTarget(e.target)) e.preventDefault(); });
  document.addEventListener('cut', e => { if (!isEditableTarget(e.target)) e.preventDefault(); });
  document.addEventListener('dragstart', e => {
    if (!isEditableTarget(e.target)) e.preventDefault();
  });

  const root = document.body;
  const themeButton = document.querySelector('.theme-toggle');
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  const storedTheme = localStorage.getItem('suihua-theme');
  const initialTheme = storedTheme || (systemDark.matches ? 'dark' : 'light');
  root.dataset.theme = initialTheme;

  const updateThemeButton = () => {
    if (!themeButton) return;
    const dark = root.dataset.theme === 'dark';
    themeButton.setAttribute('aria-pressed', String(dark));
    themeButton.setAttribute('aria-label', dark ? '切换到浅色模式' : '切换到深色模式');
    themeButton.title = dark ? '切换到浅色模式' : '切换到深色模式';
  };
  updateThemeButton();
  themeButton?.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('suihua-theme', root.dataset.theme);
    updateThemeButton();
  });
  systemDark.addEventListener?.('change', e => {
    if (!localStorage.getItem('suihua-theme')) {
      root.dataset.theme = e.matches ? 'dark' : 'light';
      updateThemeButton();
    }
  });

  // ===== Background music widget =====
  const audio = document.getElementById('bg-music');
  const musicWidget = document.querySelector('.music-widget');
  const musicBtn = document.querySelector('.music-toggle');
  const musicPanel = document.querySelector('.music-panel');
  const trackListEl = document.querySelector('.music-track-list');
  const muteBtn = document.querySelector('.music-mute-btn');

  let currentTrack = localStorage.getItem('suihua-music-track') || (MUSIC_TRACKS[0] || '01');
  let isMuted = localStorage.getItem('suihua-music-muted') !== '0'; // default muted
  let isPlaying = false;
  let panelOpen = false;

  const trackSrc = name => `music/${encodeURIComponent(name)}.mp3`;

  const setAudioSrc = name => {
    if (!audio) return;
    const next = trackSrc(name);
    if (audio.dataset.track === name) return;
    audio.dataset.track = name;
    audio.src = next;
    audio.load();
  };

  const updateMuteUI = () => {
    if (!muteBtn || !musicBtn) return;
    muteBtn.classList.toggle('is-muted', isMuted);
    musicBtn.classList.toggle('is-muted', isMuted);
    musicBtn.classList.toggle('is-playing', isPlaying && !isMuted);
  };

  const updateTrackUI = () => {
    if (!trackListEl) return;
    trackListEl.querySelectorAll('.music-track').forEach(btn => {
      const active = btn.dataset.track === currentTrack;
      btn.classList.toggle('is-active', active);
      btn.setAttribute('aria-current', active ? 'true' : 'false');
    });
  };

  const openPanel = open => {
    panelOpen = open;
    if (!musicPanel || !musicBtn) return;
    if (open) {
      musicPanel.hidden = false;
      musicBtn.setAttribute('aria-expanded', 'true');
      musicWidget?.classList.add('is-open');
    } else {
      musicPanel.hidden = true;
      musicBtn.setAttribute('aria-expanded', 'false');
      musicWidget?.classList.remove('is-open');
    }
  };

  const playCurrent = async () => {
    if (!audio) return;
    setAudioSrc(currentTrack);
    audio.muted = isMuted;
    audio.volume = 0.55;
    try {
      await audio.play();
      isPlaying = true;
    } catch (err) {
      console.warn('Music play failed:', err);
      isPlaying = false;
    }
    updateMuteUI();
  };

  const pauseCurrent = () => {
    if (!audio) return;
    audio.pause();
    isPlaying = false;
    updateMuteUI();
  };

  if (audio && musicBtn && musicPanel && trackListEl && muteBtn) {
    // Build track list
    trackListEl.innerHTML = '';
    MUSIC_TRACKS.forEach(name => {
      const li = document.createElement('li');
      li.setAttribute('role', 'none');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'music-track';
      btn.dataset.track = name;
      btn.setAttribute('role', 'menuitem');
      btn.textContent = name;
      btn.addEventListener('click', async () => {
        currentTrack = name;
        localStorage.setItem('suihua-music-track', currentTrack);
        updateTrackUI();
        // Selecting a track implies user wants sound
        isMuted = false;
        localStorage.setItem('suihua-music-muted', '0');
        await playCurrent();
        updateMuteUI();
      });
      li.appendChild(btn);
      trackListEl.appendChild(li);
    });

    setAudioSrc(currentTrack);
    audio.muted = isMuted;
    audio.volume = 0.55;
    updateTrackUI();
    updateMuteUI();

    musicBtn.addEventListener('click', e => {
      e.stopPropagation();
      openPanel(!panelOpen);
    });

    muteBtn.addEventListener('click', async e => {
      e.stopPropagation();
      isMuted = !isMuted;
      localStorage.setItem('suihua-music-muted', isMuted ? '1' : '0');
      audio.muted = isMuted;
      if (!isMuted) {
        // unmute → try play
        await playCurrent();
      } else {
        // stay playing but muted, or pause — user asked mute, keep playing muted is ok
        audio.muted = true;
      }
      updateMuteUI();
    });

    // Close panel when clicking outside
    document.addEventListener('click', e => {
      if (!panelOpen) return;
      if (!e.target.closest('.music-widget')) openPanel(false);
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && panelOpen) openPanel(false);
    });

    audio.addEventListener('play', () => { isPlaying = true; updateMuteUI(); });
    audio.addEventListener('pause', () => {
      if (!audio.ended) { isPlaying = false; updateMuteUI(); }
    });
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canvas = document.querySelector('.particle-canvas');
  const ctx = canvas?.getContext('2d');
  let width = 0, height = 0, dpr = 1, particles = [], pointer = { x: -1000, y: -1000 };
  if (canvas && ctx) {
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = innerWidth;
      height = innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(125, Math.max(45, Math.floor(width * height / 11500)));
      particles = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 2.1 + .45,
        vx: (Math.random() - .5) * .28,
        vy: -(Math.random() * .2 + .035),
        phase: Math.random() * 6.28,
        warm: Math.random() > .72
      }));
    };
    resize();
    addEventListener('resize', resize, { passive: true });
    addEventListener('pointermove', e => { pointer.x = e.clientX; pointer.y = e.clientY; }, { passive: true });
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const now = performance.now() * .001;
      const dark = root.dataset.theme === 'dark';
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < -5) { p.y = height + 5; p.x = Math.random() * width; }
        if (p.x < -5) p.x = width + 5;
        if (p.x > width + 5) p.x = -5;
        const glow = .24 + (Math.sin(now * 1.6 + p.phase) + 1) * .31;
        const dx = p.x - pointer.x, dy = p.y - pointer.y, dist = Math.hypot(dx, dy);
        if (dist < 125 && dist > 0) { p.x += dx / dist * .28; p.y += dy / dist * .28; }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (.85 + glow), 0, Math.PI * 2);
        ctx.fillStyle = p.warm ? `rgba(231,174,139,${glow * .86})` : (dark ? `rgba(197,240,216,${glow})` : `rgba(255,255,239,${glow})`);
        ctx.shadowBlur = p.r > 1.3 ? 15 : 6;
        ctx.shadowColor = p.warm ? 'rgba(235,173,135,.7)' : (dark ? 'rgba(131,221,174,.65)' : 'rgba(194,232,212,.8)');
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      if (!reduced) requestAnimationFrame(draw);
    };
    draw();
  }

  const glassSelectors = '.memory-card,.floating-note,.about-side,.brand-mark,.nav-link,.theme-toggle,.music-toggle,.music-panel,.music-mute-btn';
  document.querySelectorAll(glassSelectors).forEach(el => {
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.setProperty('--mx', `${px * 100}%`);
      el.style.setProperty('--my', `${py * 100}%`);
      if (el.classList.contains('memory-card')) {
        const x = px - .5, y = py - .5;
        el.style.setProperty('--tilt-y', `${x * 7}deg`);
        el.style.setProperty('--tilt-x', `${-y * 6}deg`);
        el.style.setProperty('--tilt-z', `${x * 1.1}deg`);
      }
      if (el.classList.contains('about-side')) {
        const x = px - .5, y = py - .5;
        el.style.setProperty('--about-tilt-y', `${x * 10}deg`);
        el.style.setProperty('--about-tilt-x', `${-y * 8}deg`);
      }
    });
    el.addEventListener('pointerleave', () => {
      el.style.removeProperty('--mx');
      el.style.removeProperty('--my');
      if (el.classList.contains('memory-card')) {
        el.style.setProperty('--tilt-x', '0deg');
        el.style.setProperty('--tilt-y', '0deg');
        el.style.setProperty('--tilt-z', '0deg');
      }
      if (el.classList.contains('about-side')) {
        el.style.setProperty('--about-tilt-x', '0deg');
        el.style.setProperty('--about-tilt-y', '0deg');
      }
    });
  });

  document.addEventListener('click', e => {
    if (e.target.closest('a,button,.music-widget')) return;
    const ripple = document.createElement('span');
    Object.assign(ripple.style, {
      position: 'fixed',
      left: e.clientX + 'px',
      top: e.clientY + 'px',
      width: '8px',
      height: '8px',
      border: '1px solid rgba(255,255,255,.95)',
      borderRadius: '50%',
      pointerEvents: 'none',
      zIndex: '9',
      boxShadow: '0 0 25px 5px rgba(183,226,204,.7)',
      transform: 'translate(-50%,-50%)',
      animation: 'ambientRipple 1s ease-out forwards'
    });
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 1050);
  });
  const style = document.createElement('style');
  style.textContent = '@keyframes ambientRipple{to{width:160px;height:160px;opacity:0;border-color:rgba(130,183,158,.03)}}';
  document.head.appendChild(style);

  const scrollGuide = document.querySelector('.scroll-guide');
  if (scrollGuide) {
    const hideGuide = () => {
      if (window.scrollY > 40) scrollGuide.classList.add('is-hidden');
      else scrollGuide.classList.remove('is-hidden');
    };
    window.addEventListener('scroll', hideGuide, { passive: true });
    hideGuide();
  }
})();
