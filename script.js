(() => {
  const screens = {
    boot: document.getElementById('bootScreen'),
    welcome: document.getElementById('welcomeScreen'),
    desktop: document.getElementById('desktop')
  };
  const startButton = document.getElementById('startButton');
  const startMenu = document.getElementById('startMenu');
  const taskButtons = document.getElementById('taskButtons');
  const clock = document.getElementById('clock');
  const desktopContextMenu = document.getElementById('desktopContextMenu');
  const systemOverlay = document.getElementById('systemOverlay');
  const systemOverlayText = document.getElementById('systemOverlayText');
  const xpWindows = [...document.querySelectorAll('.xp-window')];
  let zCounter = 35;
  let desktopStartedOnce = false;
  const startupAudio = document.getElementById('startupAudio');
  const soundUnlockButton = document.getElementById('soundUnlockButton');
  const MEDIA_BASE = 'https://github.com/toby53002/hanzgarage/releases/download/media';
  let startupPlayTimer = null;

  function hideSoundUnlock() {
    if (soundUnlockButton) soundUnlockButton.hidden = true;
  }

  async function playStartupSound({ restart = true } = {}) {
    if (!startupAudio) return false;
    try {
      if (!startupAudio.getAttribute('src')) { startupAudio.src = `${MEDIA_BASE}/xp-startup.mp3`; startupAudio.load(); }
      startupAudio.volume = 0.78;
      startupAudio.muted = false;
      if (restart) startupAudio.currentTime = 0;
      await startupAudio.play();
      hideSoundUnlock();
      return true;
    } catch (error) {
      // Browsers can block audible autoplay until the first user gesture.
      // Keep a small XP-style fallback so sound still works on mobile/strict browsers.
      if (soundUnlockButton) soundUnlockButton.hidden = false;
      console.info('Startup audio čeká na uživatelské gesto.', error);
      return false;
    }
  }

  function scheduleStartupSound() {
    if (startupPlayTimer) clearTimeout(startupPlayTimer);
    startupPlayTimer = setTimeout(() => playStartupSound({ restart: true }), 820);
  }

  soundUnlockButton?.addEventListener('click', async (event) => {
    event.stopPropagation();
    await playStartupSound({ restart: true });
  });
  startupAudio?.addEventListener('ended', hideSoundUnlock);

  const isMobile = () => window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 620;
  const taskbarHeight = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--xp-taskbar-h')) || 32;

  function setStage(stage) {
    Object.entries(screens).forEach(([key, el]) => {
      const active = key === stage;
      el.classList.toggle('is-active', active);
      el.setAttribute('aria-hidden', String(!active));
    });
    if (stage === 'desktop') {
      window.setTimeout(() => {
        if (!desktopStartedOnce || !document.getElementById('mascotWindow').classList.contains('is-open')) {
          openWindow('mascotWindow', { initial: true });
          window.setTimeout(() => {
            openWindow('mediaPlayerWindow', { initial: true });
            const playerWin=document.getElementById('mediaPlayerWindow');
            if(playerWin && window.innerWidth>760){
              const dr=screens.desktop.getBoundingClientRect(), wr=playerWin.getBoundingClientRect();
              playerWin.style.left=`${Math.max(8,dr.width-wr.width-22)}px`;
              playerWin.style.top='22px';
            }
          }, 170);
          desktopStartedOnce = true;
          setTimeout(() => showBalloon('Hanz Garage XP', 'Systém je připraven. Pravým tlačítkem na ploše najdeš další možnosti.'), 900);
        }
      }, 520);
    }
  }

  function updateClock() {
    clock.textContent = new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  }
  updateClock();
  setInterval(updateClock, 15000);

  function openStartMenu() {
    startMenu.classList.add('is-open');
    startMenu.setAttribute('aria-hidden', 'false');
    startButton.classList.add('is-open');
    startButton.setAttribute('aria-expanded', 'true');
  }
  function closeStartMenu() {
    startMenu.classList.remove('is-open');
    startMenu.setAttribute('aria-hidden', 'true');
    startButton.classList.remove('is-open');
    startButton.setAttribute('aria-expanded', 'false');
  }
  startButton.addEventListener('click', (e) => {
    e.stopPropagation();
    startMenu.classList.contains('is-open') ? closeStartMenu() : openStartMenu();
  });
  startMenu.addEventListener('pointerdown', e => e.stopPropagation());

  /* ---------------- Window manager ---------------- */
  function normalizeZ() {
    const open = xpWindows.filter(w => w.classList.contains('is-open') && !w.classList.contains('is-minimized'))
      .sort((a, b) => (+a.style.zIndex || 0) - (+b.style.zIndex || 0));
    zCounter = 35;
    open.forEach(w => { w.style.zIndex = String(++zCounter); });
  }

  function focusWindow(win) {
    if (!win || !win.classList.contains('is-open') || win.classList.contains('is-minimized')) return;
    if (zCounter > 70) normalizeZ();
    xpWindows.forEach(w => w.classList.remove('is-active-window'));
    win.classList.add('is-active-window');
    win.style.zIndex = String(++zCounter);
    document.querySelectorAll('.task-button').forEach(b => b.classList.toggle('is-active', b.dataset.windowId === win.id));
    refreshTaskManagerUI();
  }

  function placeWindow(win) {
    if (win.dataset.placed === '1') return;
    const desktopRect = screens.desktop.getBoundingClientRect();
    const availW = Math.max(240, desktopRect.width);
    const availH = Math.max(180, desktopRect.height - taskbarHeight());
    const requestedW = Number(win.dataset.width) || 520;
    const requestedH = Number(win.dataset.height) || 420;
    let width = Math.min(requestedW, availW - (isMobile() ? 8 : 30));
    let height = Math.min(requestedH, availH - (isMobile() ? 8 : 30));

    // On phones keep the mascot visibly inside a normal movable XP window instead
    // of making it cover the whole screen on first open.
    if (isMobile() && win.id === 'mascotWindow') {
      width = Math.min(430, Math.max(248, availW * .92));
      height = Math.min(660, Math.max(390, availH * .78));
    }
    if (isMobile() && win.id === 'mediaPlayerWindow') {
      const ratio = requestedW / Math.max(1, requestedH);
      width = Math.min(requestedW, availW - 8);
      height = width / ratio;
      if (height > availH - 8) { height = availH - 8; width = height * ratio; }
      width = Math.max(190, width); height = Math.max(150, height);
    }
    if (isMobile() && win.id === 'solitaireWindow') {
      width = Math.max(250, availW - 6);
      height = Math.min(availH - 8, Math.max(430, availH * .86));
    }
    if (isMobile() && win.id === 'paintWindow') {
      width = Math.max(250, availW - 6);
      height = Math.min(availH - 8, Math.max(430, availH * .84));
    }

    const index = xpWindows.indexOf(win);
    const cascade = isMobile() ? 0 : (index % 4) * 24;
    const left = Math.max(2, (availW - width) / 2 + cascade - (isMobile() ? 0 : 30));
    const top = Math.max(3, (availH - height) / 2 + cascade - (isMobile() ? 0 : 18));
    Object.assign(win.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
    win.dataset.placed = '1';
  }

  function createTaskButton(win) {
    let button = taskButtons.querySelector(`[data-window-id="${win.id}"]`);
    if (button) return button;
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'task-button';
    button.dataset.windowId = win.id;
    const icon = win.dataset.icon;
    if (icon) {
      const img = document.createElement('img');
      img.src = icon;
      img.alt = '';
      button.appendChild(img);
    } else {
      const fake = document.createElement('span');
      fake.className = 'task-css-icon';
      fake.textContent = win.id.includes('calculator') ? '12' : win.id.includes('notepad') ? '▤' : '▣';
      button.appendChild(fake);
    }
    const label = document.createElement('span');
    label.textContent = win.dataset.title || win.id;
    button.appendChild(label);
    button.addEventListener('click', () => {
      if (win.classList.contains('is-minimized')) {
        win.classList.remove('is-minimized');
        win.setAttribute('aria-hidden', 'false');
        focusWindow(win);
      } else if (win.classList.contains('is-active-window')) {
        minimizeWindow(win);
      } else {
        focusWindow(win);
      }
    });
    taskButtons.appendChild(button);
    return button;
  }

  function openWindow(id, options = {}) {
    const win = document.getElementById(id);
    if (!win) return;
    closeStartMenu();
    closeContextMenu();
    placeWindow(win);
    win.classList.add('is-open');
    win.classList.remove('is-minimized');
    win.setAttribute('aria-hidden', 'false');
    createTaskButton(win);
    focusWindow(win);
    if (id === 'mascotWindow') { resetMascotOkCounter(); requestAnimationFrame(positionMascotHotspots); }
    if (id === 'cmdWindow') setTimeout(() => document.getElementById('cmdInput')?.focus(), 40);
    if (id === 'internetExplorerWindow') setTimeout(() => { ieStartInfiniteLoading(); document.getElementById('ieAddress')?.focus(); }, 40);
    if (id === 'searchWindow') setTimeout(() => document.getElementById('xpSearchInput')?.focus(), 40);
    if (id === 'minesweeperWindow') setTimeout(() => showGameProfile('mines','launch'), 40);
    if (id === 'snakeWindow') setTimeout(() => showGameProfile('snake','launch'), 40);
    refreshTaskManagerUI();
  }

  function closeWindow(win) {
    if (!win) return;
    if (win.id === 'mediaPlayerWindow') {
      const player = document.getElementById('nachtfahrerAudio');
      if (player) { player.pause(); if (!wmpRadioMode) player.currentTime = 0; }
    }
    if (win.id === 'internetExplorerWindow') { clearInterval(ieLoadingTimer); ieLoadingTimer=null; }
    if (win.id === 'soundRecorderWindow' && typeof stopRecorder === 'function') stopRecorder();
    if (win.id === 'snakeWindow' && typeof snakeTimer !== 'undefined') { clearInterval(snakeTimer); snakeTimer=0; snakeRunning=false; }
    win.classList.remove('is-open', 'is-minimized', 'is-maximized', 'is-active-window');
    win.setAttribute('aria-hidden', 'true');
    const task = taskButtons.querySelector(`[data-window-id="${win.id}"]`);
    task?.remove();
    const remaining = xpWindows.filter(w => w.classList.contains('is-open') && !w.classList.contains('is-minimized'))
      .sort((a,b)=>(+b.style.zIndex||0)-(+a.style.zIndex||0));
    if (remaining[0]) focusWindow(remaining[0]);
    refreshTaskManagerUI();
  }

  function minimizeWindow(win) {
    if (!win) return;
    win.classList.add('is-minimized');
    win.classList.remove('is-active-window');
    win.setAttribute('aria-hidden', 'true');
    const task = taskButtons.querySelector(`[data-window-id="${win.id}"]`);
    if(win.id==='taskManagerWindow' && typeof taskHideWhenMinimized!=='undefined' && taskHideWhenMinimized){ task?.remove(); } else { task?.classList.remove('is-active'); }
    const remaining = xpWindows.filter(w => w.classList.contains('is-open') && !w.classList.contains('is-minimized'))
      .sort((a,b)=>(+b.style.zIndex||0)-(+a.style.zIndex||0));
    if (remaining[0]) focusWindow(remaining[0]);
    refreshTaskManagerUI();
  }

  function maximizeWindow(win, force = false) {
    if (!win) return;
    const currently = win.classList.contains('is-maximized');
    if (currently && !force) {
      const saved = win.dataset.restoreRect ? JSON.parse(win.dataset.restoreRect) : null;
      win.classList.remove('is-maximized');
      if (saved) Object.assign(win.style, saved);
      return;
    }
    if (!currently) {
      win.dataset.restoreRect = JSON.stringify({ left: win.style.left, top: win.style.top, width: win.style.width, height: win.style.height });
      win.classList.add('is-maximized');
    }
    focusWindow(win);
    if (win.id === 'mascotWindow') requestAnimationFrame(positionMascotHotspots);
  }

  xpWindows.forEach(win => {
    win.addEventListener('pointerdown', () => focusWindow(win));
    win.querySelectorAll('[data-window-action]').forEach(btn => {
      btn.addEventListener('pointerdown', e => e.stopPropagation());
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const action = btn.dataset.windowAction;
        if (action === 'close') closeWindow(win);
        if (action === 'minimize') minimizeWindow(win);
        if (action === 'maximize') maximizeWindow(win);
      });
    });
    const bar = win.querySelector('[data-drag-handle]');
    bar?.addEventListener('dblclick', e => {
      if (!e.target.closest('.xp-window-controls')) maximizeWindow(win);
    });
    bar?.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('.xp-window-controls') || win.classList.contains('is-maximized')) return;
      e.preventDefault();
      focusWindow(win);
      const start = win.getBoundingClientRect();
      const desktopRect = screens.desktop.getBoundingClientRect();
      const startX = e.clientX;
      const startY = e.clientY;
      bar.setPointerCapture?.(e.pointerId);
      const move = ev => {
        const x = start.left - desktopRect.left + (ev.clientX - startX);
        const y = start.top - desktopRect.top + (ev.clientY - startY);
        const maxX = Math.max(0, desktopRect.width - Math.min(90, start.width));
        const maxY = Math.max(0, desktopRect.height - taskbarHeight() - 30);
        win.style.left = `${Math.max(-(start.width - 90), Math.min(maxX, x))}px`;
        win.style.top = `${Math.max(0, Math.min(maxY, y))}px`;
      };
      const end = ev => {
        bar.releasePointerCapture?.(ev.pointerId);
        bar.removeEventListener('pointermove', move);
        bar.removeEventListener('pointerup', end);
        bar.removeEventListener('pointercancel', end);
      };
      bar.addEventListener('pointermove', move);
      bar.addEventListener('pointerup', end);
      bar.addEventListener('pointercancel', end);
    });
  });

  function attachAppTriggers(root = document) {
    root.querySelectorAll('[data-app]').forEach(el => {
      if (el.dataset.boundApp === '1') return;
      el.dataset.boundApp = '1';
      const open = () => openWindow(el.dataset.app);
      if (el.classList.contains('desktop-shortcut')) {
        el.addEventListener('click', () => {
          document.querySelectorAll('.desktop-shortcut').forEach(s => s.classList.remove('is-selected'));
          el.classList.add('is-selected');
          if (isMobile()) open();
        });
        el.addEventListener('dblclick', open);
      } else {
        el.addEventListener('click', e => { e.preventDefault(); open(); });
      }
    });
  }
  attachAppTriggers();

  /* ---------------- Mascot sign hotspots ---------------- */
  const mascotOkButton = document.getElementById('mascotOkButton');
  const mascotSignCloseButton = document.getElementById('mascotSignCloseButton');
  const mascotImage = document.querySelector('#mascotWindow .mascot-window-image');
  const mascotBody = document.querySelector('#mascotWindow .mascot-window-body');
  let mascotOkPressCount = 0;

  function resetMascotOkCounter() {
    mascotOkPressCount = 0;
    mascotOkButton?.setAttribute('aria-label', 'OK – přesunout nebo změnit velikost okna');
  }

  function positionMascotHotspots() {
    if (!mascotImage || !mascotBody) return;
    const imageRect = mascotImage.getBoundingClientRect();
    const bodyRect = mascotBody.getBoundingClientRect();
    if (!imageRect.width || !imageRect.height || !bodyRect.width || !bodyRect.height) return;

    // Hotspot over the OK button in the artwork.
    if (mascotOkButton) {
      mascotOkButton.style.left = `${imageRect.left - bodyRect.left + imageRect.width * 0.421}px`;
      mascotOkButton.style.top = `${imageRect.top - bodyRect.top + imageRect.height * 0.558}px`;
      mascotOkButton.style.width = `${imageRect.width * 0.171}px`;
      mascotOkButton.style.height = `${imageRect.height * 0.034}px`;
    }

    // Hotspot over the red X on the sign artwork.
    if (mascotSignCloseButton) {
      mascotSignCloseButton.style.left = `${imageRect.left - bodyRect.left + imageRect.width * 0.706}px`;
      mascotSignCloseButton.style.top = `${imageRect.top - bodyRect.top + imageRect.height * 0.391}px`;
      mascotSignCloseButton.style.width = `${imageRect.width * 0.052}px`;
      mascotSignCloseButton.style.height = `${imageRect.height * 0.035}px`;
    }
  }

  function mascotArtworkClose(event) {
    event.preventDefault();
    event.stopPropagation();
    resetMascotOkCounter();
    closeWindow(document.getElementById('mascotWindow'));
  }

  function mascotArtworkOk(event) {
    event.preventDefault();
    event.stopPropagation();
    const win = document.getElementById('mascotWindow');
    if (!win) return;

    mascotOkPressCount += 1;
    if (mascotOkPressCount >= 4) {
      resetMascotOkCounter();
      win.classList.add('is-teleporting');
      setTimeout(() => closeWindow(win), 120);
      return;
    }

    mascotOkButton?.setAttribute('aria-label', `OK – ${4 - mascotOkPressCount} kliknutí do zavření`);
    win.classList.remove('is-teleporting');
    void win.offsetWidth;
    win.classList.add('is-teleporting');

    // Na prvních třech stiscích se okno vždy buď přesune, zmenší, nebo zvětší.
    const desktopRect = screens.desktop.getBoundingClientRect();
    const availW = Math.max(240, desktopRect.width - 12);
    const availH = Math.max(220, desktopRect.height - taskbarHeight() - 12);
    const rect = win.getBoundingClientRect();
    const action = Math.floor(Math.random() * 3); // 0 = přesun, 1 = zmenšit, 2 = zvětšit

    // Když bylo okno maximalizované, nejdřív ho vrať do normální velikosti,
    // aby na mobilu nezabralo celou obrazovku.
    if (win.classList.contains('is-maximized')) maximizeWindow(win);

    setTimeout(() => {
      if (action === 0) {
        const current = win.getBoundingClientRect();
        const maxLeft = Math.max(4, desktopRect.width - current.width - 4);
        const maxTop = Math.max(4, desktopRect.height - taskbarHeight() - current.height - 4);
        win.style.left = `${4 + Math.random() * Math.max(1, maxLeft - 4)}px`;
        win.style.top = `${4 + Math.random() * Math.max(1, maxTop - 4)}px`;
      } else {
        const current = win.getBoundingClientRect();
        const factor = action === 1 ? 0.84 : 1.14;
        const ratio = current.width / Math.max(1, current.height);
        const minW = isMobile() ? Math.min(260, availW) : 320;
        const minH = isMobile() ? Math.min(350, availH) : 420;
        const maxW = isMobile() ? availW * 0.94 : availW * 0.9;
        const maxH = isMobile() ? availH * 0.94 : availH * 0.9;
        let nextW = Math.max(minW, Math.min(maxW, current.width * factor));
        let nextH = nextW / Math.max(.45, ratio);
        if (nextH > maxH) { nextH = maxH; nextW = nextH * ratio; }
        nextH = Math.max(Math.min(minH, maxH), nextH);
        nextW = Math.min(maxW, Math.max(minW, nextW));
        const centerX = current.left + current.width / 2;
        const centerY = current.top + current.height / 2;
        const maxLeft = Math.max(4, desktopRect.width - nextW - 4);
        const maxTop = Math.max(4, desktopRect.height - taskbarHeight() - nextH - 4);
        win.style.width = `${nextW}px`;
        win.style.height = `${nextH}px`;
        win.style.left = `${Math.max(4, Math.min(maxLeft, centerX - nextW / 2))}px`;
        win.style.top = `${Math.max(4, Math.min(maxTop, centerY - nextH / 2))}px`;
      }
      positionMascotHotspots();
    }, 115);

    setTimeout(() => win.classList.remove('is-teleporting'), 420);
  }

  mascotOkButton?.addEventListener('click', mascotArtworkOk);
  mascotSignCloseButton?.addEventListener('click', mascotArtworkClose);
  document.querySelector('#mascotWindow .xp-close')?.addEventListener('click', resetMascotOkCounter);

  mascotImage?.addEventListener('load', positionMascotHotspots);
  if (mascotImage?.complete) requestAnimationFrame(positionMascotHotspots);
  if (window.ResizeObserver && mascotBody) {
    new ResizeObserver(() => positionMascotHotspots()).observe(mascotBody);
  }
  window.addEventListener('resize', positionMascotHotspots);

  /* ---------------- Extra XP desktop functions ---------------- */
  document.querySelectorAll('.external-shortcut').forEach(shortcut => {
    const launch = () => shortcut.dataset.url && window.open(shortcut.dataset.url, '_blank', 'noopener,noreferrer');
    shortcut.addEventListener('click', () => {
      document.querySelectorAll('.desktop-shortcut').forEach(s => s.classList.remove('is-selected'));
      shortcut.classList.add('is-selected');
      if (isMobile()) launch();
    });
    shortcut.addEventListener('dblclick', launch);
  });

  const showDesktopButton = document.getElementById('showDesktopButton');
  let showDesktopRestore = [];
  showDesktopButton?.addEventListener('click', () => {
    const visible = xpWindows.filter(w => w.classList.contains('is-open') && !w.classList.contains('is-minimized'));
    if (visible.length) {
      showDesktopRestore = visible.map(w => w.id);
      visible.forEach(minimizeWindow);
    } else {
      showDesktopRestore.forEach(id => {
        const w = document.getElementById(id);
        if (w?.classList.contains('is-open')) { w.classList.remove('is-minimized'); w.setAttribute('aria-hidden','false'); }
      });
      const last = document.getElementById(showDesktopRestore.at(-1)); if (last) focusWindow(last);
      showDesktopRestore = [];
    }
  });

  /* ---------------- XP Explorer ---------------- */
  const computerContent = document.getElementById('computerContent');
  const computerFiles = document.getElementById('computerFiles');
  const explorerAddress = document.getElementById('explorerAddress');
  const explorerStatus = document.getElementById('explorerStatus');
  const explorerDetailsTitle = document.getElementById('explorerDetailsTitle');
  const explorerDetailsText = document.getElementById('explorerDetailsText');
  const explorerSearchbar = document.getElementById('explorerSearchbar');
  const explorerSearchInput = document.getElementById('explorerSearchInput');
  const explorerFolders = document.getElementById('explorerFolders');
  const explorerViews = document.getElementById('explorerViews');
  let explorerView = 'computer', explorerListMode = false, explorerHistory = ['computer'], explorerHistoryIndex = 0;
  const explorerPages = {
    computer: {title:'Tento počítač',detail:'Systémová složka',status:'5 objektů',html:document.getElementById('computerFiles')?.innerHTML || ''},
    documents: {title:'Hanz dokumenty',detail:'Složka se soubory',status:'3 objektů',html:`<section class="explorer-group"><h3>Hanz dokumenty</h3><div class="explorer-items"><button class="explorer-item" data-app="notepadWindow"><span class="explorer-item-icon">📄</span><span>poznamky.txt</span></button><button class="explorer-item" data-app="paintWindow"><span class="explorer-item-icon">🖼️</span><span>novy-obrazek.png</span></button><button class="explorer-item explorer-nav" data-explorer-target="shared"><span class="explorer-item-icon folder-xp-icon"></span><span>Sdílené dokumenty</span></button></div></section>`},
    shared: {title:'Sdílené dokumenty',detail:'Sdílená složka',status:'5 objektů',html:`<section class="explorer-group"><h3>Sdílené dokumenty</h3><div class="explorer-items"><a class="explorer-item" href="https://www.instagram.com/hanz.mrdke" target="_blank" rel="noopener noreferrer"><span class="explorer-item-icon"><img src="./assets/hanz-icon-norm.png" alt=""></span><span>Hanz Instagram</span></a><a class="explorer-item" href="https://www.youtube.com/@Nachtfahrer_podcast" target="_blank" rel="noopener noreferrer"><span class="explorer-item-icon"><img src="./assets/youtube-icon-norm.png" alt=""></span><span>YouTube</span></a><a class="explorer-item" href="https://herohero.co/nachtfahrer" target="_blank" rel="noopener noreferrer"><span class="explorer-item-icon"><img src="./assets/herohero-icon-norm.png" alt=""></span><span>HeroHero</span></a><a class="explorer-item" href="https://www.patreon.com/Nachtfahrer" target="_blank" rel="noopener noreferrer"><span class="explorer-item-icon"><img src="./assets/patreon-icon-norm.png" alt=""></span><span>Patreon</span></a><a class="explorer-item" href="https://www.instagram.com/nachtfahrerpodcast/" target="_blank" rel="noopener noreferrer"><span class="explorer-item-icon"><img src="./assets/nachtfahrer-icon-norm.png" alt=""></span><span>Nachtfahrer Podcast</span></a></div></section>`},
    network: {title:'Místa v síti',detail:'Síťová složka',status:'3 objektů',html:`<section class="explorer-group"><h3>Místa v síti</h3><div class="explorer-items"><a class="explorer-item" href="https://www.instagram.com/hanz.mrdke" target="_blank" rel="noopener noreferrer"><span class="explorer-item-icon">🌐</span><span>Hanz</span></a><a class="explorer-item" href="https://www.instagram.com/nachtfahrerpodcast/" target="_blank" rel="noopener noreferrer"><span class="explorer-item-icon">🌐</span><span>Nachtfahrer Podcast</span></a><a class="explorer-item" href="https://www.youtube.com/@Nachtfahrer_podcast" target="_blank" rel="noopener noreferrer"><span class="explorer-item-icon">🌐</span><span>YouTube</span></a></div></section>`}
  };
  function updateExplorerHistoryButtons(){document.getElementById('explorerBack')?.classList.toggle('is-disabled',explorerHistoryIndex<=0);document.getElementById('explorerForward')?.classList.toggle('is-disabled',explorerHistoryIndex>=explorerHistory.length-1)}
  function bindExplorerItems(){computerFiles?.querySelectorAll('.explorer-nav').forEach(el=>el.addEventListener('click',()=>navigateExplorer(el.dataset.explorerTarget)));attachAppTriggers(computerFiles||document);computerFiles?.querySelectorAll('.drive-item').forEach(el=>{el.addEventListener('click',()=>{computerFiles.querySelectorAll('.explorer-item').forEach(x=>x.classList.remove('is-selected'));el.classList.add('is-selected');explorerDetailsTitle.textContent=el.dataset.drive==='h'?'Hanz Garage (H:)':'Místní disk (C:)';explorerDetailsText.textContent=el.dataset.drive==='h'?'Produkty se připravují…':'Místní disk';});el.addEventListener('dblclick',()=>navigateExplorer(el.dataset.drive==='h'?'shared':'documents'));});computerFiles?.querySelectorAll('.camera-item').forEach(el=>el.addEventListener('dblclick',()=>openWindow('paintWindow')))}
  function renderExplorer(page,push=true){const data=explorerPages[page]||explorerPages.computer;explorerView=page;computerFiles.innerHTML=data.html;computerFiles.classList.toggle('explorer-list-view',explorerListMode);explorerAddress.value=data.title;explorerStatus.textContent=data.status;explorerDetailsTitle.textContent=data.title;explorerDetailsText.textContent=data.detail;if(explorerSearchInput)explorerSearchInput.value='';if(push){explorerHistory.splice(explorerHistoryIndex+1);explorerHistory.push(page);explorerHistoryIndex=explorerHistory.length-1}updateExplorerHistoryButtons();bindExplorerItems()}
  function navigateExplorer(page){if(page&&page!==explorerView)renderExplorer(page,true)}
  document.querySelectorAll('.explorer-nav').forEach(el=>el.addEventListener('click',()=>navigateExplorer(el.dataset.explorerTarget)));
  document.getElementById('explorerBack')?.addEventListener('click',()=>{if(explorerHistoryIndex>0){explorerHistoryIndex--;renderExplorer(explorerHistory[explorerHistoryIndex],false)}});
  document.getElementById('explorerForward')?.addEventListener('click',()=>{if(explorerHistoryIndex<explorerHistory.length-1){explorerHistoryIndex++;renderExplorer(explorerHistory[explorerHistoryIndex],false)}});
  document.getElementById('explorerUp')?.addEventListener('click',()=>renderExplorer('computer',explorerView!=='computer'));
  document.getElementById('explorerGo')?.addEventListener('click',()=>renderExplorer(explorerView,false));
  explorerFolders?.addEventListener('click',()=>{if(isMobile())computerContent.classList.toggle('show-sidebar-mobile');else{computerContent.classList.toggle('hide-sidebar');explorerFolders.classList.toggle('is-pressed',!computerContent.classList.contains('hide-sidebar'))}});
  explorerViews?.addEventListener('click',()=>{explorerListMode=!explorerListMode;computerFiles.classList.toggle('explorer-list-view',explorerListMode);explorerViews.classList.toggle('is-pressed',explorerListMode)});
  document.getElementById('explorerSearch')?.addEventListener('click',()=>{explorerSearchbar.hidden=!explorerSearchbar.hidden;if(!explorerSearchbar.hidden)explorerSearchInput.focus()});
  function filterExplorer(){const q=explorerSearchInput.value.trim().toLocaleLowerCase('cs');let visible=0;computerFiles.querySelectorAll('.explorer-item').forEach(item=>{const show=!q||item.textContent.toLocaleLowerCase('cs').includes(q);item.style.display=show?'':'none';if(show)visible++});computerFiles.querySelectorAll('.explorer-group').forEach(group=>group.classList.toggle('is-filtered-out',![...group.querySelectorAll('.explorer-item')].some(i=>i.style.display!=='none')));explorerStatus.textContent=q?`${visible} nalezených objektů`:(explorerPages[explorerView]?.status||'')}
  explorerSearchInput?.addEventListener('input',filterExplorer);document.getElementById('explorerSearchClear')?.addEventListener('click',()=>{explorerSearchInput.value='';filterExplorer();explorerSearchInput.focus()});
  document.querySelectorAll('.panel-collapse').forEach(btn=>btn.addEventListener('click',()=>btn.closest('.xp-task-panel')?.classList.toggle('is-collapsed')));updateExplorerHistoryButtons();
  document.getElementById('explorerFileMenu')?.addEventListener('click',()=>renderExplorer(explorerView,false));
  document.getElementById('explorerEditMenu')?.addEventListener('click',()=>computerFiles?.querySelectorAll('.explorer-item').forEach(x=>x.classList.remove('is-selected')));
  document.getElementById('explorerViewMenu')?.addEventListener('click',()=>explorerViews?.click());
  document.getElementById('explorerFavoritesMenu')?.addEventListener('click',()=>navigateExplorer('network'));
  document.getElementById('explorerToolsMenu')?.addEventListener('click',()=>openWindow('taskManagerWindow'));
  document.getElementById('explorerHelpMenu')?.addEventListener('click',()=>alert('Tento počítač: používej Zpět/Vpřed, Hledat, Složky a přepnutí zobrazení. Položky můžeš otevírat kliknutím nebo dvojklikem podle typu.'));

  /* ---------------- Windows Media Player ---------------- */
  const wmpAudio = document.getElementById('nachtfahrerAudio');
  const wmpPlayButton = document.getElementById('wmpPlayButton');
  const wmpStopButton = document.getElementById('wmpStopButton');
  const wmpBackButton = document.getElementById('wmpBackButton');
  const wmpForwardButton = document.getElementById('wmpForwardButton');
  const wmpSeek = document.getElementById('wmpSeek');
  const wmpVolume = document.getElementById('wmpVolume');
  const wmpMuteButton = document.getElementById('wmpMuteButton');
  const wmpPauseButton = document.getElementById('wmpPauseButton');
  const wmpEjectButton = document.getElementById('wmpEjectButton');
  const wmpSideBackButton = document.getElementById('wmpSideBackButton');
  const wmpSideForwardButton = document.getElementById('wmpSideForwardButton');
  const wmpLoopButton = document.getElementById('wmpLoopButton');
  const wmpCurrentTime = document.getElementById('wmpCurrentTime');
  const wmpDuration = document.getElementById('wmpDuration');
  const wmpStateText = document.getElementById('wmpStateText');
  const wmpStatusLight = document.getElementById('wmpStatusLight');
  const wmpTrackTitle = document.getElementById('wmpTrackTitle');
  const wmpFileButton = document.getElementById('wmpFileButton');
  const wmpFileInput = document.getElementById('wmpFileInput');
  const wmpPlayMenuButton = document.getElementById('wmpPlayMenuButton');
  const wmpHelpButton = document.getElementById('wmpHelpButton');
  const wmpSoundModeButton = document.getElementById('wmpSoundModeButton');
  const wmpSleepButton = document.getElementById('wmpSleepButton');
  const wmpBitrate = document.getElementById('wmpBitrate');
  const wmpSoundBadge = document.getElementById('wmpSoundBadge');
  const wmpRadioKiss = document.getElementById('wmpRadioKiss');
  const wmpRadioTools = document.getElementById('wmpRadioTools');
  const wmpRadioStatus = document.getElementById('wmpRadioStatus');
  const wmpReconnectButton = document.getElementById('wmpReconnectButton');
  const wmpCoverArt = document.getElementById('wmpCoverArt');
  const wmpVizModeButton = document.getElementById('wmpVizModeButton');
  const wmpCoverButton = document.getElementById('wmpCoverButton');
  const WMP_DEFAULT_TRACK = `${MEDIA_BASE}/Nachtfahrer.mp3`;
  const WMP_COVER_NACHT = './assets/nachtfahrer-cover-user.webp';
  const WMP_COVER_KISS = './assets/radio-kiss-cover-user.webp';
  const WMP_COVER_GENERIC = './assets/wmp-icon-norm.png';
  const WMP_KISS_STREAMS = [
    'https://icecast1.play.cz/kiss128.mp3',
    'https://icecast4.play.cz/kiss128.mp3'
  ];
  let wmpObjectUrl = null;
  let wmpLastVolume = .8;
  let wmpSoundMode = false;
  let wmpRadioMode = false;
  let wmpRadioStreamIndex = 0;
  let wmpRadioRecoveryTimer = 0;
  let wmpRadioRecoveryAttempts = 0;
  let wmpLoopBeforeRadio = false;
  let wmpSleepTimer = 0;
  let wmpSleepIndex = 0;
  let wmpCoverEnabled = true;
  let wmpCurrentCover = WMP_COVER_NACHT;
  let wmpVizMode = 'bars';
  const wmpSleepOptions = [0, 15, 30, 60];

  function setWmpCover(src, alt='') {
    wmpCurrentCover = src || WMP_COVER_GENERIC;
    if (wmpCoverArt) { wmpCoverArt.src = wmpCurrentCover; wmpCoverArt.alt = alt; wmpCoverArt.classList.toggle('is-hidden', !wmpCoverEnabled); }
    updateMediaExtras();
  }

  const formatMediaTime = value => {
    if (!Number.isFinite(value) || value < 0) return '0:00';
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  };

  const updateWmpState = (message = '') => {
    if (!wmpAudio) return;
    const playing = !wmpAudio.paused && !wmpAudio.ended;
    if (wmpPlayButton) wmpPlayButton.textContent = playing ? 'Ⅱ' : '▶';
    document.getElementById('wmpSkinStage')?.classList.toggle('is-playing', playing);
    if (wmpStateText) {
      wmpStateText.textContent = message || (playing ? (wmpRadioMode ? 'LIVE' : 'Playing') : (wmpAudio.currentTime > 0 && !wmpAudio.ended ? 'Paused' : 'Stopped'));
    }
    wmpStatusLight?.classList.toggle('is-playing', playing);
    updateMediaExtras(message);
  };

  function setWmpRangePercent(input,pct){if(!input)return;const value=Math.max(0,Math.min(100,Number(pct)||0));input.style.setProperty('--wmp-pct',`${value}%`);}

  const updateWmpProgress = () => {
    if (!wmpAudio) return;
    if (wmpRadioMode) {
      if (wmpCurrentTime) wmpCurrentTime.textContent = 'LIVE';
      if (wmpDuration) wmpDuration.textContent = '128k';
      if (wmpSeek) { wmpSeek.value = '1000'; setWmpRangePercent(wmpSeek,100); }
      return;
    }
    if (wmpCurrentTime) wmpCurrentTime.textContent = formatMediaTime(wmpAudio.currentTime);
    if (wmpDuration) wmpDuration.textContent = formatMediaTime(wmpAudio.duration);
    if (wmpSeek && Number.isFinite(wmpAudio.duration) && wmpAudio.duration > 0) {
      const progress=Math.max(0,Math.min(1,wmpAudio.currentTime/wmpAudio.duration));
      wmpSeek.value = String(Math.round(progress * 1000));setWmpRangePercent(wmpSeek,progress*100);
    } else setWmpRangePercent(wmpSeek,0);
  };

  function setWmpRadioStatus(text, state = '') {
    if (wmpRadioStatus) wmpRadioStatus.textContent = text;
    if (wmpRadioTools) {
      wmpRadioTools.dataset.state = state;
      wmpRadioTools.hidden = !wmpRadioMode;
    }
  }

  function setWmpCurrentRow(row) {
    document.querySelectorAll('.wmp-track-row').forEach(x => x.classList.remove('is-current'));
    row?.classList.add('is-current');
  }

  function applyWmpModeUi() {
    const live = wmpRadioMode;
    if (wmpSeek) wmpSeek.disabled = live;
    if (wmpBackButton) wmpBackButton.disabled = live;
    if (wmpForwardButton) wmpForwardButton.disabled = live;
    if (wmpLoopButton) wmpLoopButton.disabled = live;
    if (wmpSoundModeButton) wmpSoundModeButton.disabled = live;
    if (wmpSoundBadge) wmpSoundBadge.textContent = live ? 'LIVE' : 'Stereo';
    document.getElementById('wmpSkinStage')?.classList.toggle('is-radio', live);
    if (!live && wmpRadioTools) wmpRadioTools.hidden = true;
    updateWmpProgress();
  }

  function updateWmpMediaSession() {
    if (!('mediaSession' in navigator) || typeof MediaMetadata === 'undefined') return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: wmpRadioMode ? 'Rádio KISS' : (wmpTrackTitle?.textContent || 'Nachtfahrer'),
        artist: wmpRadioMode ? 'Radio Kiss • LIVE' : 'Hanz Garage',
        album: wmpRadioMode ? 'Online rádio' : 'Windows Media Player',
        artwork: [{ src: new URL(wmpCurrentCover || WMP_COVER_GENERIC, location.href).href }]
      });
    } catch {}
  }

  function clearWmpRadioRecovery() {
    if (wmpRadioRecoveryTimer) clearTimeout(wmpRadioRecoveryTimer);
    wmpRadioRecoveryTimer = 0;
  }

  function scheduleWmpRadioRecovery() {
    if (!wmpRadioMode || wmpRadioRecoveryTimer) return;
    setWmpRadioStatus('Stream se načítá…', 'buffering');
    wmpRadioRecoveryTimer = setTimeout(() => {
      wmpRadioRecoveryTimer = 0;
      if (!wmpRadioMode || (!wmpAudio.paused && wmpAudio.readyState >= 3)) return;
      wmpRadioRecoveryAttempts += 1;
      const next = wmpRadioRecoveryAttempts % WMP_KISS_STREAMS.length;
      connectWmpKiss(true, next);
    }, 10000);
  }

  function leaveWmpRadioMode() {
    if (!wmpRadioMode) return;
    clearWmpRadioRecovery();
    wmpRadioMode = false;
    wmpRadioRecoveryAttempts = 0;
    if (wmpAudio) {
      wmpAudio.loop = wmpLoopBeforeRadio;
      wmpAudio.playbackRate = wmpSoundMode ? .96 : 1;
    }
    applyWmpModeUi();
  }

  function enterWmpRadioMode() {
    if (!wmpRadioMode) {
      wmpLoopBeforeRadio = !!wmpAudio?.loop;
      wmpRadioMode = true;
    }
    if (wmpAudio) {
      wmpAudio.loop = false;
      wmpAudio.playbackRate = 1;
    }
    applyWmpModeUi();
    setWmpCurrentRow(wmpRadioKiss);
    if (wmpTrackTitle) wmpTrackTitle.textContent = 'Rádio KISS';
    if (wmpBitrate) wmpBitrate.textContent = 'Rádio KISS • 128 kbps MP3';
    setWmpCover(WMP_COVER_KISS, 'Rádio KISS cover');
    updateWmpMediaSession();
  }

  function connectWmpKiss(autoplay = true, streamIndex = 0) {
    if (!wmpAudio) return;
    enterWmpRadioMode();
    clearWmpRadioRecovery();
    wmpRadioStreamIndex = Math.max(0, Math.min(WMP_KISS_STREAMS.length - 1, streamIndex));
    setWmpRadioStatus('Připojuji Rádio KISS…', 'connecting');
    updateWmpState('Connecting…');
    wmpAudio.pause();
    wmpAudio.src = WMP_KISS_STREAMS[wmpRadioStreamIndex];
    wmpAudio.load();
    // Start from the original click whenever possible. Calling play() immediately
    // preserves the user gesture better than waiting for a later canplay event.
    if (autoplay) void playWmp();
  }

  async function playWmp() {
    if (!wmpAudio) return;
    try {
      if (!wmpRadioMode && !wmpAudio.getAttribute('src')) { wmpAudio.src = WMP_DEFAULT_TRACK; wmpAudio.load(); }
      // Use the native media element directly. This is considerably more reliable
      // than routing every playback through WebAudio and works on Vercel/mobile.
      wmpAudio.muted = false;
      if (wmpAudio.volume <= 0) {
        wmpAudio.volume = wmpLastVolume || .8;
        if (wmpVolume) wmpVolume.value = String(Math.round(wmpAudio.volume * 100));
      }
      await wmpAudio.play();
      updateWmpState();
    } catch (error) {
      console.error('Windows Media Player nemohl spustit audio:', error);
      updateWmpState('Play error');
      if (wmpRadioMode && error?.name === 'NotAllowedError') {
        setWmpRadioStatus('Rádio je připravené • klikni znovu na Play', 'ready');
      }
      // Reload once if the browser lost the source/metadata, then retry after the
      // next explicit Play click. Avoid silent swallowed errors.
      if (wmpAudio.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) wmpAudio.load();
    }
  }

  async function toggleWmpPlayback() {
    if (!wmpAudio) return;
    if (wmpAudio.paused || wmpAudio.ended) await playWmp();
    else wmpAudio.pause();
    updateWmpState();
  }

  wmpAudio?.addEventListener('loadedmetadata', updateWmpProgress);
  wmpAudio?.addEventListener('durationchange', updateWmpProgress);
  wmpAudio?.addEventListener('timeupdate', updateWmpProgress);
  wmpAudio?.addEventListener('canplay', () => {
    clearWmpRadioRecovery();
    if (wmpRadioMode) setWmpRadioStatus('Připojeno • připraveno', 'ready');
    if (wmpStateText?.textContent === 'Loading…' || wmpStateText?.textContent === 'Connecting…') updateWmpState();
  });
  wmpAudio?.addEventListener('loadstart', () => {
    if (wmpRadioMode) { setWmpRadioStatus('Připojuji Rádio KISS…', 'connecting'); updateWmpState('Connecting…'); }
    else updateWmpState('Loading…');
  });
  wmpAudio?.addEventListener('playing', () => {
    clearWmpRadioRecovery();
    if (wmpRadioMode) setWmpRadioStatus('Vysílání běží živě', 'live');
    updateWmpMediaSession();
    updateWmpState();
  });
  wmpAudio?.addEventListener('play', updateWmpState);
  wmpAudio?.addEventListener('pause', () => {
    if (wmpRadioMode) setWmpRadioStatus('Rádio pozastaveno', 'paused');
    updateWmpState();
  });
  wmpAudio?.addEventListener('waiting', () => { if (wmpRadioMode) scheduleWmpRadioRecovery(); });
  wmpAudio?.addEventListener('stalled', () => { if (wmpRadioMode) scheduleWmpRadioRecovery(); });
  wmpAudio?.addEventListener('volumechange', () => {
    if (!wmpAudio || !wmpMuteButton) return;
    const muted=wmpAudio.muted || wmpAudio.volume===0;wmpMuteButton.textContent = muted ? '🔇' : '🔊';wmpMuteButton.classList.toggle('is-muted',muted);setWmpRangePercent(wmpVolume,wmpAudio.volume*100);
  });
  wmpAudio?.addEventListener('error', () => {
    const code = wmpAudio?.error?.code || '?';
    console.error('Chyba audio souboru ve Windows Media Playeru, code:', code);
    if (wmpRadioMode) {
      const hasFallback = wmpRadioStreamIndex < WMP_KISS_STREAMS.length - 1;
      if (hasFallback) {
        setWmpRadioStatus('První server neodpovídá • zkouším záložní…', 'buffering');
        setTimeout(() => { if (wmpRadioMode) connectWmpKiss(true, wmpRadioStreamIndex + 1); }, 650);
      } else {
        setWmpRadioStatus('Rádio se nepodařilo připojit • klikni Obnovit stream', 'error');
        updateWmpState('Radio error');
      }
      return;
    }
    updateWmpState('Audio error');
  });
  wmpAudio?.addEventListener('ended', () => {
    if (!wmpAudio) return;
    if (wmpRadioMode) { scheduleWmpRadioRecovery(); return; }
    if (!wmpAudio.loop) wmpAudio.currentTime = 0;
    updateWmpProgress();
    updateWmpState();
  });

  if (wmpAudio) {
    wmpAudio.volume = .8;setWmpRangePercent(wmpVolume,80);
    wmpAudio.defaultPlaybackRate = 1;
    wmpAudio.playbackRate = 1;
    wmpAudio.load();
  }
  wmpPlayButton?.addEventListener('click', toggleWmpPlayback);
  wmpPlayMenuButton?.addEventListener('click', toggleWmpPlayback);
  wmpStopButton?.addEventListener('click', () => {
    if (!wmpAudio) return;
    wmpAudio.pause();
    if (!wmpRadioMode) wmpAudio.currentTime = 0;
    if (wmpRadioMode) setWmpRadioStatus('Rádio zastaveno • Play znovu připojí živé vysílání', 'stopped');
    updateWmpProgress();
    updateWmpState();
  });
  wmpBackButton?.addEventListener('click', () => {
    if (!wmpAudio || wmpRadioMode) return;
    wmpAudio.currentTime = Math.max(0, wmpAudio.currentTime - 10);
  });
  wmpForwardButton?.addEventListener('click', () => {
    if (!wmpAudio || wmpRadioMode || !Number.isFinite(wmpAudio.duration)) return;
    wmpAudio.currentTime = Math.min(wmpAudio.duration, wmpAudio.currentTime + 10);
  });
  wmpSeek?.addEventListener('input', () => {
    if (!wmpAudio || wmpRadioMode || !Number.isFinite(wmpAudio.duration) || wmpAudio.duration <= 0) return;
    wmpAudio.currentTime = (+wmpSeek.value / 1000) * wmpAudio.duration;setWmpRangePercent(wmpSeek,(+wmpSeek.value/1000)*100);
    updateWmpProgress();
  });
  wmpVolume?.addEventListener('input', () => {
    if (!wmpAudio) return;
    const volume = Math.max(0, Math.min(1, +wmpVolume.value / 100));
    wmpAudio.volume = volume;
    if (volume > 0) wmpLastVolume = volume;
    wmpAudio.muted = false;setWmpRangePercent(wmpVolume,volume*100);
  });
  wmpPauseButton?.addEventListener('click', () => {
    if (!wmpAudio) return;
    if (!wmpAudio.paused && !wmpAudio.ended) wmpAudio.pause();
  });
  wmpEjectButton?.addEventListener('click', () => {
    wmpFileInput?.click();
  });
  wmpSideBackButton?.addEventListener('click', () => wmpBackButton?.click());
  wmpSideForwardButton?.addEventListener('click', () => wmpForwardButton?.click());
  wmpMuteButton?.addEventListener('click', () => {
    if (!wmpAudio) return;
    wmpAudio.muted = !wmpAudio.muted;
    if (!wmpAudio.muted && wmpAudio.volume === 0) {
      wmpAudio.volume = wmpLastVolume || .8;
      if (wmpVolume) wmpVolume.value = String(Math.round(wmpAudio.volume * 100));
    }
  });
  wmpLoopButton?.addEventListener('click', () => {
    if (!wmpAudio || !wmpLoopButton || wmpRadioMode) return;
    wmpAudio.loop = !wmpAudio.loop;
    wmpLoopButton.classList.toggle('is-enabled', wmpAudio.loop);
    wmpLoopButton.title = wmpAudio.loop ? 'Opakování zapnuto' : 'Opakovat';
  });
  wmpFileButton?.addEventListener('click', () => wmpFileInput?.click());
  const wmpUserTrackUrls=[];
  function loadWmpSource(src, name, autoplay=false){
    if(!wmpAudio)return;
    leaveWmpRadioMode();
    wmpAudio.pause(); wmpAudio.src=src; wmpAudio.load();
    if(wmpTrackTitle)wmpTrackTitle.textContent=name.replace(/\.[^.]+$/,'');
    if(wmpBitrate)wmpBitrate.textContent=name;
    if(wmpSoundBadge)wmpSoundBadge.textContent='Stereo';
    setWmpCover(src===WMP_DEFAULT_TRACK ? WMP_COVER_NACHT : WMP_COVER_GENERIC, src===WMP_DEFAULT_TRACK ? 'Nachtfahrer cover' : 'Vlastní hudba');
    updateWmpMediaSession();
    updateWmpState('Loading…');
    if(autoplay) wmpAudio.addEventListener('canplay',()=>playWmp(),{once:true});
  }
  wmpFileInput?.addEventListener('change', () => {
    const files=[...(wmpFileInput.files||[])];
    if (!files.length || !wmpAudio) return;
    const actions=document.querySelector('.wmp-library-actions');
    files.forEach((file,index)=>{
      const url=URL.createObjectURL(file); wmpUserTrackUrls.push(url);
      const row=document.createElement('button'); row.type='button'; row.className='wmp-track-row'; row.textContent=`♪ ${file.name}`;
      row.addEventListener('click',()=>{setWmpCurrentRow(row);loadWmpSource(url,file.name,true);});
      actions?.before(row);
      if(index===0){setWmpCurrentRow(row);loadWmpSource(url,file.name,false);}
    });
    wmpFileInput.value='';
  });
  wmpRadioKiss?.addEventListener('click', () => connectWmpKiss(true, 0));
  wmpReconnectButton?.addEventListener('click', () => connectWmpKiss(true, 0));
  window.addEventListener('offline', () => { if (wmpRadioMode) { clearWmpRadioRecovery(); setWmpRadioStatus('Bez připojení k internetu', 'error'); updateWmpState('Offline'); } });
  window.addEventListener('online', () => { if (wmpRadioMode) connectWmpKiss(true, 0); });

  wmpSleepButton?.addEventListener('click', () => {
    wmpSleepIndex = (wmpSleepIndex + 1) % wmpSleepOptions.length;
    const minutes = wmpSleepOptions[wmpSleepIndex];
    if (wmpSleepTimer) clearTimeout(wmpSleepTimer);
    wmpSleepTimer = 0;
    if (wmpSleepButton) {
      wmpSleepButton.textContent = minutes ? `Časovač: ${minutes} min` : 'Časovač: OFF';
      wmpSleepButton.classList.toggle('is-enabled', !!minutes);
    }
    if (minutes) {
      wmpSleepTimer = setTimeout(() => {
        wmpSleepTimer = 0;
        wmpSleepIndex = 0;
        wmpAudio?.pause();
        if (wmpSleepButton) { wmpSleepButton.textContent = 'Časovač: OFF'; wmpSleepButton.classList.remove('is-enabled'); }
        updateWmpState('Sleep timer');
      }, minutes * 60000);
    }
  });

  wmpVizModeButton?.addEventListener('click', () => {
    const modes=['bars','wave','off']; const labels={bars:'Sloupce',wave:'Vlna',off:'Vypnuto'};
    wmpVizMode=modes[(modes.indexOf(wmpVizMode)+1)%modes.length];
    wmpVizModeButton.textContent=`Vizualizér: ${labels[wmpVizMode]}`;
    wmpVizModeButton.classList.toggle('is-enabled', wmpVizMode!=='off');
  });
  wmpCoverButton?.addEventListener('click', () => {
    wmpCoverEnabled=!wmpCoverEnabled; wmpCoverButton.textContent=`Cover: ${wmpCoverEnabled?'ON':'OFF'}`;
    wmpCoverButton.classList.toggle('is-enabled', wmpCoverEnabled); wmpCoverArt?.classList.toggle('is-hidden', !wmpCoverEnabled);
  });
  wmpHelpButton?.addEventListener('click', () => alert('Windows Media Player: Play/Pause, Stop, skok ±10 s, přetáčení, kolečko myši = hlasitost, mute, opakování, playlist z vlastních souborů, 6 motivů, dvojklik na přehrávač = Play/Pause a Sound Mod. Rádio KISS má LIVE režim, automatický záložní stream a ruční Obnovit stream. Nově jsou covery přímo za vizualizérem, režimy Sloupce/Vlna/Vypnuto, přepínač Cover a časovač vypnutí 15/30/60 min.'));
  wmpSoundModeButton?.addEventListener('click', () => {
    if (!wmpAudio || !wmpSoundModeButton || wmpRadioMode) return;
    wmpSoundMode = !wmpSoundMode;
    // Safe native sound effect: slightly slower playback without pitch preservation
    // gives the old-school “sound mod” character without risking silent WebAudio.
    try { wmpAudio.preservesPitch = !wmpSoundMode; } catch {}
    try { wmpAudio.webkitPreservesPitch = !wmpSoundMode; } catch {}
    wmpAudio.playbackRate = wmpSoundMode ? .96 : 1;
    wmpSoundModeButton.textContent = `Sound Mod: ${wmpSoundMode ? 'ON' : 'OFF'}`;
  });
  updateWmpState();
  updateWmpProgress();
  applyWmpModeUi();
  updateWmpMediaSession();
  if ('mediaSession' in navigator) {
    try { navigator.mediaSession.setActionHandler('play', () => playWmp()); } catch {}
    try { navigator.mediaSession.setActionHandler('pause', () => wmpAudio?.pause()); } catch {}
    try { navigator.mediaSession.setActionHandler('stop', () => wmpStopButton?.click()); } catch {}
    try { navigator.mediaSession.setActionHandler('seekbackward', () => { if(!wmpRadioMode) wmpBackButton?.click(); }); } catch {}
    try { navigator.mediaSession.setActionHandler('seekforward', () => { if(!wmpRadioMode) wmpForwardButton?.click(); }); } catch {}
  }


  /* ---------------- Windows Media Player skin system ---------------- */
  const wmpWindow = document.getElementById('mediaPlayerWindow');
  const wmpSkinStage = document.getElementById('wmpSkinStage');
  const wmpSkinArt = document.getElementById('wmpSkinArt');
  const wmpThemeButton = document.getElementById('wmpThemeButton');
  const wmpThemeMenu = document.getElementById('wmpThemeMenu');
  const wmpLibraryButton = document.getElementById('wmpLibraryButton');
  const wmpLibraryPanel = document.getElementById('wmpLibraryPanel');
  const wmpVisualizer = document.getElementById('wmpVisualizer');
  const wmpBuiltInTrack = document.getElementById('wmpBuiltInTrack');
  const wmpThemeSizes = {1:[346,344],2:[269,363],3:[619,367],4:[237,306],5:[345,213],6:[319,239]};
  const wmpThemeSources = {1:'./assets/wmp-skin-1-interactive.png',2:'./assets/wmp-skin-2.png',3:'./assets/wmp-skin-3-interactive.png',4:'./assets/wmp-skin-4.png',5:'./assets/wmp-skin-5-interactive.png',6:'./assets/wmp-skin-6-interactive.png'};
  let currentWmpTheme = 1;

  function fitWmpWindowToDesktop(width, height) {
    if (!wmpWindow) return;
    const d = screens.desktop.getBoundingClientRect();
    const maxW = Math.max(205, d.width - 10);
    const maxH = Math.max(190, d.height - taskbarHeight() - 10);
    const scale = Math.min(1, maxW / width, maxH / height);
    const w = Math.round(width * scale), h = Math.round(height * scale);
    wmpWindow.style.width = `${w}px`;
    wmpWindow.style.height = `${h}px`;
    wmpWindow.dataset.width = String(w);
    wmpWindow.dataset.height = String(h);
    if (wmpWindow.classList.contains('is-open')) {
      const left = Math.max(2, Math.min(parseFloat(wmpWindow.style.left)||8, d.width-w-2));
      const top = Math.max(2, Math.min(parseFloat(wmpWindow.style.top)||8, d.height-taskbarHeight()-h-2));
      wmpWindow.style.left = `${left}px`; wmpWindow.style.top = `${top}px`;
    }
  }

  function applyWmpTheme(theme, persist=true) {
    theme = Math.max(1, Math.min(6, Number(theme)||1));
    currentWmpTheme = theme;
    if (!wmpSkinStage || !wmpSkinArt) return;
    wmpSkinStage.className = `wmp-skin-stage theme-${theme}`;
    wmpSkinStage.classList.toggle('is-radio', wmpRadioMode);
    wmpSkinArt.src = wmpThemeSources[theme] || `./assets/wmp-skin-${theme}.png`;
    const [w,h] = wmpThemeSizes[theme];
    fitWmpWindowToDesktop(w,h);
    document.querySelectorAll('[data-wmp-theme]').forEach(b=>b.classList.toggle('is-selected', Number(b.dataset.wmpTheme)===theme));
    if (persist) { try { localStorage.setItem('hanzWmpTheme', String(theme)); } catch {} }
  }
  try { currentWmpTheme = Number(localStorage.getItem('hanzWmpTheme')) || 1; } catch {}
  applyWmpTheme(currentWmpTheme, false);

  wmpThemeButton?.addEventListener('click', e => { e.stopPropagation(); if(wmpThemeMenu) wmpThemeMenu.hidden=!wmpThemeMenu.hidden; if(wmpLibraryPanel) wmpLibraryPanel.hidden=true; });
  wmpLibraryButton?.addEventListener('click', e => { e.stopPropagation(); if(wmpLibraryPanel) wmpLibraryPanel.hidden=!wmpLibraryPanel.hidden; if(wmpThemeMenu) wmpThemeMenu.hidden=true; });
  document.querySelectorAll('[data-wmp-theme]').forEach(b=>b.addEventListener('click',()=>{applyWmpTheme(b.dataset.wmpTheme); if(wmpThemeMenu)wmpThemeMenu.hidden=true;}));
  wmpBuiltInTrack?.addEventListener('click',()=>{
    if(!wmpAudio) return;
    if(wmpObjectUrl){URL.revokeObjectURL(wmpObjectUrl);wmpObjectUrl=null;}
    setWmpCurrentRow(wmpBuiltInTrack);
    loadWmpSource(WMP_DEFAULT_TRACK,'Nachtfahrer.mp3',true);
  });
  wmpSkinStage?.addEventListener('dblclick', e=>{ if(!e.target.closest('button,input,.wmp-theme-menu,.wmp-library-panel')) toggleWmpPlayback(); });
  wmpSkinStage?.addEventListener('contextmenu', e=>{if(e.target.closest('button,input'))return;e.preventDefault();if(wmpThemeMenu){wmpThemeMenu.hidden=false;if(wmpLibraryPanel)wmpLibraryPanel.hidden=true;}});
  wmpSkinStage?.addEventListener('wheel', e=>{
    if(!wmpAudio || e.target.closest('.wmp-theme-menu,.wmp-library-panel')) return;
    e.preventDefault();
    wmpAudio.volume=Math.max(0,Math.min(1,wmpAudio.volume+(e.deltaY<0?.05:-.05)));
    if(wmpVolume)wmpVolume.value=String(Math.round(wmpAudio.volume*100));
  },{passive:false});
  document.addEventListener('pointerdown',e=>{
    if(wmpThemeMenu && !wmpThemeMenu.hidden && !e.target.closest('#wmpThemeMenu,#wmpThemeButton')) wmpThemeMenu.hidden=true;
    if(wmpLibraryPanel && !wmpLibraryPanel.hidden && !e.target.closest('#wmpLibraryPanel,#wmpLibraryButton')) wmpLibraryPanel.hidden=true;
  });

  // Lightweight XP-style visualizer that does not reroute audio, so playback remains reliable.
  let wmpVizFrame=0;
  function drawWmpVisualizer(){
    if(!wmpVisualizer){wmpVizFrame=requestAnimationFrame(drawWmpVisualizer);return;}
    const ctx=wmpVisualizer.getContext('2d'); const W=wmpVisualizer.width,H=wmpVisualizer.height;
    ctx.clearRect(0,0,W,H);
    const playing=wmpAudio && !wmpAudio.paused && !wmpAudio.ended;
    const t=(wmpAudio?.currentTime||performance.now()/1000);
    if(wmpVizMode!=='off'){
      ctx.fillStyle='rgba(0,0,18,.24)';ctx.fillRect(0,0,W,H);
      if(wmpVizMode==='bars'){
        const bars=28, gap=3, bw=(W-gap*(bars+1))/bars;
        for(let i=0;i<bars;i++){
          const pulse=playing?(0.2+0.8*Math.abs(Math.sin(t*3.1+i*.73)*Math.cos(t*1.7+i*.29))):.08;
          const bh=Math.max(3,pulse*(H*.62));
          const hue=(118+i*3)%360;
          ctx.fillStyle=`hsla(${hue},85%,58%,.78)`;
          ctx.fillRect(gap+i*(bw+gap),H-bh-8,bw,bh);
        }
      } else {
        ctx.lineWidth=Math.max(2,W/220); ctx.strokeStyle='rgba(102,255,176,.88)'; ctx.beginPath();
        for(let x=0;x<=W;x+=5){const amp=playing?H*.16:H*.025;const y=H*.55+Math.sin(x*.035+t*5.2)*amp+Math.sin(x*.078-t*3.1)*amp*.35;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
      }
      ctx.strokeStyle='rgba(130,220,255,.30)';ctx.lineWidth=1;ctx.beginPath();
      for(let x=0;x<W;x+=12){const y=H*.32+Math.sin(x*.03+t*4)*H*.07;if(x===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
    }
    wmpVizFrame=requestAnimationFrame(drawWmpVisualizer);
  }
  drawWmpVisualizer();
  /* ---------------- Game profiles + shared online TOP 10 ---------------- */
  const GAME_LEADERBOARD_KEYS={mines:'hanzMinesLeaderboardV1',snake:'hanzSnakeLeaderboardV1'};
  const activeGamePlayers={mines:'',snake:''};
  const onlineLeaderboardCache={mines:[],snake:[]};
  const onlineLeaderboardLoaded={mines:false,snake:false};
  let activeProfileGame=null;
  const gameProfileDialog=document.getElementById('gameProfileDialog');
  const gameProfileTitle=document.getElementById('gameProfileTitle');
  const gamePlayerName=document.getElementById('gamePlayerName');
  const gameLeaderboardList=document.getElementById('gameLeaderboardList');
  const gameLeaderboardStatus=document.getElementById('gameLeaderboardStatus');

  function cleanPlayerName(value){return String(value||'').normalize('NFKC').replace(/[<>]/g,'').replace(/\s+/g,' ').trim().slice(0,20);}
  function normalizePlayerName(value){return cleanPlayerName(value).toLocaleLowerCase('cs-CZ');}
  function getLocalGameLeaderboard(game){
    try{const rows=JSON.parse(localStorage.getItem(GAME_LEADERBOARD_KEYS[game])||'[]');return Array.isArray(rows)?rows.filter(x=>x&&x.name&&Number.isFinite(Number(x.score))).map(x=>({name:cleanPlayerName(x.name),score:Number(x.score),date:Number(x.date)||0})).sort((a,b)=>b.score-a.score||a.date-b.date).slice(0,10):[];}catch{return[];}
  }
  function saveLocalGameScore(game,name,score){
    name=cleanPlayerName(name);score=Math.max(0,Math.round(Number(score)||0));if(!name||!score)return false;
    const rows=getLocalGameLeaderboard(game),idx=rows.findIndex(x=>normalizePlayerName(x.name)===normalizePlayerName(name));
    if(idx>=0){if(score<=rows[idx].score)return false;rows[idx]={name,score,date:Date.now()};}else rows.push({name,score,date:Date.now()});
    rows.sort((a,b)=>b.score-a.score||a.date-b.date);const top=rows.slice(0,10);
    try{localStorage.setItem(GAME_LEADERBOARD_KEYS[game],JSON.stringify(top));}catch{}
    return true;
  }
  function setLeaderboardStatus(text,state=''){
    if(!gameLeaderboardStatus)return;
    gameLeaderboardStatus.textContent=text||'';
    gameLeaderboardStatus.classList.toggle('is-error',state==='error');
    gameLeaderboardStatus.classList.toggle('is-ok',state==='ok');
  }
  function getGameLeaderboard(game){
    const online=onlineLeaderboardCache[game];
    return onlineLeaderboardLoaded[game]&&Array.isArray(online)?online:getLocalGameLeaderboard(game);
  }
  function renderGameLeaderboard(game){
    if(!gameLeaderboardList)return;const rows=getGameLeaderboard(game);gameLeaderboardList.innerHTML='';
    if(!rows.length){const li=document.createElement('li');li.className='is-empty';li.textContent='Zatím žádné skóre';gameLeaderboardList.appendChild(li);return;}
    rows.forEach((row,i)=>{const li=document.createElement('li');const pos=document.createElement('span'),name=document.createElement('b'),score=document.createElement('strong');pos.textContent=`${i+1}.`;name.textContent=row.name;score.textContent=String(row.score);li.append(pos,name,score);gameLeaderboardList.appendChild(li);});
  }
  async function refreshGameLeaderboard(game,{quiet=false}={}){
    if(!GAME_LEADERBOARD_KEYS[game])return [];
    if(!quiet)setLeaderboardStatus('Načítám společný online TOP 10…');
    try{
      const response=await fetch(`/api/leaderboard?game=${encodeURIComponent(game)}`,{headers:{Accept:'application/json'},cache:'no-store'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const data=await response.json();
      if(!data||!Array.isArray(data.rows))throw new Error('Neplatná odpověď serveru');
      onlineLeaderboardCache[game]=data.rows.map(row=>({name:cleanPlayerName(row.name),score:Math.max(0,Math.round(Number(row.score)||0))})).filter(row=>row.name&&row.score>0).slice(0,10);
      onlineLeaderboardLoaded[game]=true;
      if(activeProfileGame===game)renderGameLeaderboard(game);
      if(!quiet)setLeaderboardStatus('Online TOP 10 • společný pro všechny návštěvníky','ok');
      return onlineLeaderboardCache[game];
    }catch(error){
      console.warn('Online leaderboard není dostupný.',error);
      onlineLeaderboardLoaded[game]=false;
      if(activeProfileGame===game){onlineLeaderboardCache[game]=[];renderGameLeaderboard(game);}
      if(!quiet)setLeaderboardStatus('Online TOP 10 není připojený — zobrazuji lokální zálohu.','error');
      return getLocalGameLeaderboard(game);
    }
  }
  async function saveGameScore(game,name,score){
    name=cleanPlayerName(name);score=Math.max(0,Math.round(Number(score)||0));
    if(!GAME_LEADERBOARD_KEYS[game]||!name||!score)return false;
    const localImproved=saveLocalGameScore(game,name,score);
    try{
      const response=await fetch('/api/leaderboard',{
        method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({game,name,score})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data?.error||`HTTP ${response.status}`);
      if(Array.isArray(data.rows)){
        onlineLeaderboardCache[game]=data.rows.map(row=>({name:cleanPlayerName(row.name),score:Math.max(0,Math.round(Number(row.score)||0))})).filter(row=>row.name&&row.score>0).slice(0,10);
        onlineLeaderboardLoaded[game]=true;
        if(activeProfileGame===game)renderGameLeaderboard(game);
      }else await refreshGameLeaderboard(game,{quiet:true});
      return Boolean(data.improved);
    }catch(error){
      console.warn('Skóre se nepodařilo odeslat do online leaderboardu.',error);
      return localImproved;
    }
  }
  function updateGamePlayerLabels(){
    const mineChip=document.getElementById('minePlayerChip');if(mineChip)mineChip.textContent=`Hráč: ${activeGamePlayers.mines||'—'}`;
    const snakeName=document.getElementById('snakePlayerName');if(snakeName)snakeName.textContent=activeGamePlayers.snake||'—';
  }
  let gameProfileMode='launch';
  let gameProfilePausedSnake=false;

  function showGameProfile(game,mode='launch'){
    if(!GAME_LEADERBOARD_KEYS[game]||!gameProfileDialog)return;
    activeProfileGame=game;
    gameProfileMode=mode==='leaderboard'?'leaderboard':'launch';
    gameProfilePausedSnake=false;
    if(game==='snake'&&typeof snakeRunning!=='undefined'&&snakeRunning&&!snakePaused){
      toggleSnakePause();
      gameProfilePausedSnake=true;
    }
    if(gameProfileTitle)gameProfileTitle.textContent=game==='mines'?'Hledání min — hráč a TOP 10':'Had — hráč a TOP 10';
    let saved='';try{saved=localStorage.getItem('hanzPlayerName')||'';}catch{}
    if(gamePlayerName)gamePlayerName.value=activeGamePlayers[game]||saved;
    const playButton=document.getElementById('gameProfilePlay');
    const cancelButton=document.getElementById('gameProfileCancel');
    if(playButton)playButton.textContent=gameProfileMode==='launch'?'Spustit hru':'Použít jméno';
    if(cancelButton)cancelButton.textContent=gameProfileMode==='launch'?'Storno':'Zavřít';
    renderGameLeaderboard(game);
    gameProfileDialog.hidden=false;
    gameProfileDialog.classList.add('is-open');
    gameProfileDialog.setAttribute('aria-hidden','false');
    refreshGameLeaderboard(game);
    setTimeout(()=>{gamePlayerName?.focus();gamePlayerName?.select();},20);
  }

  function hideGameProfile(){
    if(!gameProfileDialog)return;
    gameProfileDialog.classList.remove('is-open');
    gameProfileDialog.setAttribute('aria-hidden','true');
    gameProfileDialog.hidden=true;
    activeProfileGame=null;
    gameProfileMode='launch';
  }

  function cancelGameProfile(){
    const game=activeProfileGame;
    const wasLaunch=gameProfileMode==='launch';
    const resumeSnake=game==='snake'&&gameProfilePausedSnake&&!wasLaunch;
    hideGameProfile();
    gameProfilePausedSnake=false;
    if(resumeSnake&&typeof snakeRunning!=='undefined'&&snakeRunning&&snakePaused)toggleSnakePause();
    if(wasLaunch&&game&&!activeGamePlayers[game]){
      closeWindow(document.getElementById(game==='mines'?'minesweeperWindow':'snakeWindow'));
    }
  }

  function acceptGameProfile(){
    const game=activeProfileGame;
    const mode=gameProfileMode;
    const resumeSnake=game==='snake'&&gameProfilePausedSnake&&mode==='leaderboard';
    if(!game)return;
    const name=cleanPlayerName(gamePlayerName?.value);
    if(!name){
      gamePlayerName?.focus();
      gamePlayerName?.classList.add('is-invalid');
      setTimeout(()=>gamePlayerName?.classList.remove('is-invalid'),500);
      return;
    }
    activeGamePlayers[game]=name;
    try{localStorage.setItem('hanzPlayerName',name);}catch{}
    updateGamePlayerLabels();
    hideGameProfile();
    gameProfilePausedSnake=false;
    if(resumeSnake&&typeof snakeRunning!=='undefined'&&snakeRunning&&snakePaused)toggleSnakePause();

    // Při prvním otevření tlačítko opravdu spustí novou hru.
    if(mode==='launch'){
      if(game==='mines'&&typeof resetMinesweeper==='function')resetMinesweeper();
      if(game==='snake'&&typeof startSnake==='function')startSnake();
    }
  }

  // Ovládání modalu řešíme delegovaně přímo na dialogu, aby ho
  // nepřebily drag/drop a globální pointer listenery desktopu.
  gameProfileDialog?.addEventListener('pointerdown',event=>event.stopPropagation());
  gameProfileDialog?.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(!button||!gameProfileDialog.contains(button))return;
    if(button.id==='gameProfilePlay'){
      event.preventDefault();event.stopPropagation();acceptGameProfile();return;
    }
    if(button.id==='gameProfileClose'||button.id==='gameProfileCancel'){
      event.preventDefault();event.stopPropagation();cancelGameProfile();return;
    }
  },true);
  gameProfileDialog?.addEventListener('click',event=>{
    if(event.target===gameProfileDialog){event.preventDefault();event.stopPropagation();cancelGameProfile();}
  });
  gamePlayerName?.addEventListener('keydown',event=>{
    if(event.key==='Enter'){event.preventDefault();event.stopPropagation();acceptGameProfile();}
    if(event.key==='Escape'){event.preventDefault();event.stopPropagation();cancelGameProfile();}
  });
  document.getElementById('mineLeaderboardButton')?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();showGameProfile('mines','leaderboard');});
  document.getElementById('snakeLeaderboardButton')?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();showGameProfile('snake','leaderboard');});
  updateGamePlayerLabels();

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&gameProfileDialog?.classList.contains('is-open')){
      event.preventDefault();event.stopPropagation();cancelGameProfile();
    }
  },true);

  /* ---------------- Minesweeper ---------------- */
  const mineGrid = document.getElementById('mineGrid');
  const mineReset = document.getElementById('mineReset');
  const mineTimer = document.getElementById('mineTimer');
  const mineCounter = document.getElementById('mineCounter');
  const mineDifficulty = document.getElementById('mineDifficulty');
  const mineTouchModeButton = document.getElementById('mineTouchMode');
  const minePresets = {
    beginner: { rows: 9, cols: 9, count: 10 },
    intermediate: { rows: 16, cols: 16, count: 40 },
    expert: { rows: 16, cols: 30, count: 99 }
  };
  let mineRows = 9, mineCols = 9, mineCount = 10;
  let mines = new Set(), opened = new Set(), flags = new Set(), questions = new Set();
  let mineGameOver = false, mineStarted = false, mineSeconds = 0, mineInterval = null, mineTouchFlagMode = false;
  const mineKey = (r,c) => `${r}:${c}`;
  const mineNeighbours = (r,c) => {
    const out=[];
    for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++) {
      if(!dr&&!dc) continue;
      const rr=r+dr,cc=c+dc;
      if(rr>=0&&rr<mineRows&&cc>=0&&cc<mineCols) out.push([rr,cc]);
    }
    return out;
  };
  const mineNearby = (r,c) => mineNeighbours(r,c).filter(([rr,cc])=>mines.has(mineKey(rr,cc))).length;
  const mineFormatCounter = value => value < 0 ? `-${String(Math.min(99,Math.abs(value))).padStart(2,'0')}` : String(Math.min(999,value)).padStart(3,'0');
  function stopMineTimer(){ if(mineInterval) clearInterval(mineInterval); mineInterval=null; }
  function startMineTimer(){
    if(mineStarted) return;
    mineStarted=true;
    mineInterval=setInterval(()=>{mineSeconds=Math.min(999,mineSeconds+1);mineTimer.textContent=String(mineSeconds).padStart(3,'0');},1000);
  }
  function placeMines(firstR,firstC){
    mines.clear();
    const safe=new Set([mineKey(firstR,firstC),...mineNeighbours(firstR,firstC).map(([r,c])=>mineKey(r,c))]);
    while(mines.size<mineCount){
      const r=Math.floor(Math.random()*mineRows),c=Math.floor(Math.random()*mineCols),k=mineKey(r,c);
      if(!safe.has(k)) mines.add(k);
    }
  }
  function updateMineCounter(){ mineCounter.textContent=mineFormatCounter(mineCount-flags.size); }
  function getMineCell(k){ return mineGrid?.querySelector(`[data-key="${k}"]`); }
  function revealMineCell(r,c,fromChord=false){
    const k=mineKey(r,c);
    if(mineGameOver||opened.has(k)||flags.has(k)) return true;
    questions.delete(k);
    if(mines.has(k)){
      const b=getMineCell(k);
      b?.classList.add('is-open','is-mine','is-exploded');
      if(b) b.textContent='✹';
      mineGameOver=true; stopMineTimer(); mineReset.textContent='😵'; revealAllMines();
      return false;
    }
    opened.add(k);
    const b=getMineCell(k); if(!b) return true;
    b.classList.add('is-open'); b.classList.remove('is-question');
    const n=mineNearby(r,c); b.dataset.count=String(n); b.textContent=n?String(n):'';
    if(!n) mineNeighbours(r,c).forEach(([rr,cc])=>revealMineCell(rr,cc,fromChord));
    checkMineWin();
    return true;
  }
  function revealAllMines(){
    mines.forEach(k=>{const b=getMineCell(k);if(b&&!flags.has(k)){b.classList.add('is-open','is-mine');b.textContent='✹';}});
    flags.forEach(k=>{if(!mines.has(k)){const b=getMineCell(k);if(b){b.classList.add('is-wrong-flag');b.textContent='×';}}});
  }
  function checkMineWin(){
    if(!mineGameOver && opened.size===mineRows*mineCols-mineCount){
      mineGameOver=true; stopMineTimer(); mineReset.textContent='😎';
      mines.forEach(k=>{if(!flags.has(k)){flags.add(k);const b=getMineCell(k);if(b){b.classList.add('is-flagged');b.textContent='⚑';}}});
      updateMineCounter();
      const diff=mineDifficulty?.value||'beginner';const base={beginner:10000,intermediate:40000,expert:100000}[diff]||10000;const score=Math.max(1,base-mineSeconds*50);
      const player=activeGamePlayers.mines;if(player){const chip=document.getElementById('minePlayerChip');if(chip)chip.textContent=`Hráč: ${player} • ${score} b.`;saveGameScore('mines',player,score).then(improved=>{if(improved)showBalloon('Hledání min',`${player}: nové TOP skóre ${score} bodů.`);}).catch(()=>{});}
    }
  }
  function cycleMineMark(k){
    if(mineGameOver||opened.has(k)) return;
    const b=getMineCell(k); if(!b) return;
    if(flags.has(k)){
      flags.delete(k); questions.add(k); b.classList.remove('is-flagged'); b.classList.add('is-question'); b.textContent='?';
    } else if(questions.has(k)) {
      questions.delete(k); b.classList.remove('is-question'); b.textContent='';
    } else {
      flags.add(k); b.classList.add('is-flagged'); b.textContent='⚑';
    }
    updateMineCounter();
  }
  function chordMineCell(r,c){
    const k=mineKey(r,c); if(!opened.has(k)||mineGameOver) return;
    const n=mineNearby(r,c); if(!n) return;
    const around=mineNeighbours(r,c);
    const flagged=around.filter(([rr,cc])=>flags.has(mineKey(rr,cc))).length;
    if(flagged!==n) return;
    for(const [rr,cc] of around){
      if(!flags.has(mineKey(rr,cc)) && !revealMineCell(rr,cc,true)) break;
    }
  }
  function primaryMineAction(r,c){
    const k=mineKey(r,c);
    if(mineGameOver) return;
    if(mineTouchFlagMode){ cycleMineMark(k); return; }
    if(opened.has(k)){ chordMineCell(r,c); return; }
    if(flags.has(k)) return;
    if(!mineStarted){ placeMines(r,c); startMineTimer(); }
    revealMineCell(r,c);
  }
  function resizeMineWindow(){
    const win=document.getElementById('minesweeperWindow'); if(!win||isMobile()) return;
    const cell=24, width=Math.min(810,Math.max(300,mineCols*cell+42)),height=Math.min(620,Math.max(410,mineRows*cell+175));
    win.style.width=`${width}px`; win.style.height=`${height}px`;
  }
  function resetMinesweeper(){
    stopMineTimer();
    const preset=minePresets[mineDifficulty?.value||'beginner']||minePresets.beginner;
    mineRows=preset.rows; mineCols=preset.cols; mineCount=preset.count;
    mines=new Set();opened=new Set();flags=new Set();questions=new Set();mineGameOver=false;mineStarted=false;mineSeconds=0;
    mineTimer.textContent='000'; updateMineCounter(); mineReset.textContent='🙂'; mineGrid.innerHTML='';
    const playerChip=document.getElementById('minePlayerChip');if(playerChip)playerChip.textContent=`Hráč: ${activeGamePlayers.mines||'—'}`;
    mineGrid.style.setProperty('--mine-cols',String(mineCols));
    for(let r=0;r<mineRows;r++) for(let c=0;c<mineCols;c++){
      const k=mineKey(r,c),b=document.createElement('button');
      b.type='button';b.className='mine-cell';b.dataset.key=k;b.setAttribute('aria-label',`Pole ${r+1}, ${c+1}`);
      let holdTimer=null,held=false;
      b.addEventListener('pointerdown',ev=>{
        if(ev.pointerType!=='mouse'){
          held=false;
          holdTimer=setTimeout(()=>{held=true;cycleMineMark(k);navigator.vibrate?.(25);},430);
        }
      });
      const cancelHold=()=>{if(holdTimer)clearTimeout(holdTimer);holdTimer=null;};
      b.addEventListener('pointerup',cancelHold);b.addEventListener('pointercancel',cancelHold);b.addEventListener('pointerleave',cancelHold);
      b.addEventListener('click',()=>{if(held){held=false;return;}primaryMineAction(r,c);});
      b.addEventListener('dblclick',()=>chordMineCell(r,c));
      b.addEventListener('contextmenu',ev=>{ev.preventDefault();cycleMineMark(k);});
      mineGrid.appendChild(b);
    }
    resizeMineWindow();
  }
  mineReset?.addEventListener('click',resetMinesweeper);
  document.getElementById('newMineGame')?.addEventListener('click',resetMinesweeper);
  mineDifficulty?.addEventListener('change',resetMinesweeper);
  mineTouchModeButton?.addEventListener('click',()=>{
    mineTouchFlagMode=!mineTouchFlagMode;
    mineTouchModeButton.setAttribute('aria-pressed',String(mineTouchFlagMode));
    mineTouchModeButton.classList.toggle('is-active',mineTouchFlagMode);
    mineTouchModeButton.textContent=mineTouchFlagMode?'Dotyk: vlaječka':'Dotyk: odkrytí';
  });
  document.getElementById('mineHelp')?.addEventListener('click',()=>alert('Hledání min: odkryj všechna bezpečná pole. Pravé tlačítko cykluje vlaječku a otazník. Na mobilu podrž pole nebo přepni režim Dotyk. Kliknutím na už odkryté číslo otevřeš okolí, pokud počet vlaječek odpovídá číslu.'));
  resetMinesweeper();

  /* ---------------- Solitaire ---------------- */
  const solitaireBoard=document.getElementById('solitaireBoard');
  const solScoreEl=document.getElementById('solScore');
  const solTimeEl=document.getElementById('solTime');
  const solMessageEl=document.getElementById('solMessage');
  const solDrawMode=document.getElementById('solDrawMode');
  const solScoreMode=document.getElementById('solScoreMode');
  const solTimed=document.getElementById('solTimed');
  const solSuits=[['S','♠','black'],['H','♥','red'],['D','♦','red'],['C','♣','black']];
  let solState=null,solTimer=null,solSeconds=0,solSelected=null,solPointerDrag=null,solSuppressClick=false;
  const solRankLabel=r=>r===1?'A':r===11?'J':r===12?'Q':r===13?'K':String(r);

  function makeSolDeck(){
    const deck=[];
    for(const [suit,symbol,color] of solSuits){
      for(let rank=1;rank<=13;rank++) deck.push({id:`${suit}${rank}`,suit,symbol,color,rank,label:solRankLabel(rank),faceUp:false});
    }
    for(let i=deck.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[deck[i],deck[j]]=[deck[j],deck[i]];}
    return deck;
  }
  function stopSolTimer(){if(solTimer)clearInterval(solTimer);solTimer=null;}
  function startSolTimer(){
    stopSolTimer();solSeconds=0;solTimeEl.textContent='Čas: 0';
    if(!solTimed?.checked)return;
    solTimer=setInterval(()=>{solSeconds++;solTimeEl.textContent=`Čas: ${solSeconds}`;if(solState?.scoreMode==='standard'&&solSeconds%10===0)solAddScore(-2);},1000);
  }
  function solInitialScore(){return solScoreMode?.value==='vegas'?-52:0;}
  function newSolitaire(){
    stopSolTimer();
    const deck=makeSolDeck(),tableau=Array.from({length:7},()=>[]);
    for(let col=0;col<7;col++) for(let row=0;row<=col;row++){const card=deck.pop();card.faceUp=row===col;tableau[col].push(card);}
    solState={stock:deck,waste:[],foundations:{S:[],H:[],D:[],C:[]},tableau,score:solInitialScore(),draw:Number(solDrawMode?.value||3),scoreMode:solScoreMode?.value||'standard',recycles:0,won:false};
    solSelected=null;solPointerDrag=null;solSuppressClick=false;solMessageEl.textContent='Nová hra';startSolTimer();renderSolitaire();
  }
  function solSetMessage(msg){solMessageEl.textContent=msg;}
  function solAddScore(delta){
    if(!solState||solState.scoreMode==='none'){if(solScoreEl)solScoreEl.textContent='Skóre: —';return;}
    solState.score+=delta;
    if(solState.scoreMode==='standard')solState.score=Math.max(0,solState.score);
    solScoreEl.textContent=`Skóre: ${solState.score}`;
  }
  function solScoreMove(kind){
    if(solState.scoreMode==='none')return;
    if(solState.scoreMode==='vegas'){
      if(kind==='toFoundation')solAddScore(5);
      if(kind==='foundationBack')solAddScore(-5);
      return;
    }
    const points={wasteToTableau:5,toFoundation:10,flip:5,foundationBack:-15,recycleOne:-100};
    if(points[kind])solAddScore(points[kind]);
  }
  function solCardMarkup(card,attrs='',selected=false,offset=0){
    if(!card)return'';
    const style=`style="--sol-offset:${offset}px"`;
    if(!card.faceUp)return`<button class="sol-card sol-card-back" ${attrs} ${style} aria-label="Zakrytá karta"><span class="sol-back-design"></span></button>`;
    return`<button class="sol-card sol-card-face ${card.color} ${selected?'is-selected':''}" ${attrs} ${style} aria-label="${card.label}${card.symbol}"><span class="sol-corner">${card.label}<i>${card.symbol}</i></span><b>${card.symbol}</b></button>`;
  }
  function solSourceCards(src=solSelected){
    if(!src||!solState)return[];
    if(src.type==='waste')return solState.waste.length?[solState.waste.at(-1)]:[];
    if(src.type==='foundation'){const pile=solState.foundations[src.suit];return pile.length?[pile.at(-1)]:[];}
    if(src.type==='tableau')return solState.tableau[src.pile].slice(src.index);
    return[];
  }
  function solSourceValid(src){
    const cards=solSourceCards(src);if(!cards.length||!cards[0].faceUp)return false;
    if(src.type==='tableau'&&cards.length>1){for(let i=0;i<cards.length-1;i++){if(cards[i].color===cards[i+1].color||cards[i].rank!==cards[i+1].rank+1)return false;}}
    return true;
  }
  function solRemoveSource(src=solSelected){
    if(src.type==='waste')return[solState.waste.pop()];
    if(src.type==='foundation')return[solState.foundations[src.suit].pop()];
    if(src.type==='tableau')return solState.tableau[src.pile].splice(src.index);
    return[];
  }
  function solFlipTop(pileIndex){
    const pile=solState.tableau[pileIndex],top=pile.at(-1);
    if(top&&!top.faceUp){top.faceUp=true;solScoreMove('flip');return true;}return false;
  }
  function solCanTableau(cards,targetPile){
    if(!cards.length||!cards[0].faceUp)return false;
    const first=cards[0],pile=solState.tableau[targetPile],top=pile.at(-1);
    return top?top.faceUp&&top.color!==first.color&&top.rank===first.rank+1:first.rank===13;
  }
  function solCanFoundation(card,suit){
    const pile=solState.foundations[suit];
    return !!card&&card.faceUp&&card.suit===suit&&card.rank===pile.length+1;
  }
  function solMoveToTableau(targetPile,src=solSelected,{silent=false}={}){
    if(!src||!solSourceValid(src))return false;
    if(src.type==='tableau'&&src.pile===targetPile)return false;
    const cards=solSourceCards(src);if(!solCanTableau(cards,targetPile))return false;
    const origin=src.type==='tableau'?src.pile:null;const moved=solRemoveSource(src);solState.tableau[targetPile].push(...moved);
    if(src.type==='waste')solScoreMove('wasteToTableau');if(src.type==='foundation')solScoreMove('foundationBack');if(origin!==null)solFlipTop(origin);
    solSelected=null;if(!silent)solSetMessage(`${cards[0].label}${cards[0].symbol} přesunuta`);renderSolitaire();return true;
  }
  function solMoveToFoundation(suit,src=solSelected,{silent=false}={}){
    if(!src||!solSourceValid(src))return false;
    const cards=solSourceCards(src);if(cards.length!==1||!solCanFoundation(cards[0],suit))return false;
    const origin=src.type==='tableau'?src.pile:null;const moved=solRemoveSource(src)[0];solState.foundations[suit].push(moved);
    if(src.type==='waste'||src.type==='tableau')solScoreMove('toFoundation');if(origin!==null)solFlipTop(origin);
    solSelected=null;if(!silent)solSetMessage(`${moved.label}${moved.symbol} do základu`);renderSolitaire();checkSolitaireWin();return true;
  }
  function solAutoFoundation(src,{silent=false}={}){const card=solSourceCards(src)[0];return card?solMoveToFoundation(card.suit,src,{silent}):false;}
  function drawSolitaireStock(){
    if(solState.won)return;
    if(solState.stock.length){
      const count=Math.min(solState.draw,solState.stock.length);
      for(let i=0;i<count;i++){const card=solState.stock.pop();card.faceUp=true;solState.waste.push(card);}
      solSetMessage(`Rozdáno ${count}`);
    }else if(solState.waste.length){
      if(solState.scoreMode==='vegas'){
        const maxRecycles=solState.draw===3?2:0;
        if(solState.recycles>=maxRecycles){solSetMessage('V režimu Las Vegas už balíček nelze otočit.');return;}
      }
      const recycled=solState.waste.reverse();recycled.forEach(c=>c.faceUp=false);solState.stock=recycled;solState.waste=[];solState.recycles++;
      if(solState.draw===1)solScoreMove('recycleOne');solSetMessage('Balíček otočen');
    }
    solSelected=null;renderSolitaire();
  }
  function checkSolitaireWin(){
    const total=Object.values(solState.foundations).reduce((n,p)=>n+p.length,0);
    if(total!==52||solState.won)return;
    solState.won=true;stopSolTimer();
    if(solState.scoreMode==='standard'&&solTimed?.checked&&solSeconds>=30)solAddScore(Math.floor(700000/solSeconds));
    solMessageEl.textContent='Vyhráno! 🎉';solitaireBoard.classList.add('is-won');solVictoryCascade();setTimeout(()=>solitaireBoard.classList.remove('is-won'),4500);
  }
  function solVictoryCascade(){
    const layer=document.createElement('div');layer.className='sol-victory-layer';solitaireBoard.appendChild(layer);
    let delay=0;
    for(const [,symbol,color] of solSuits){for(let rank=13;rank>=1;rank--){const c=document.createElement('span');c.className=`sol-victory-card ${color}`;c.textContent=`${solRankLabel(rank)}${symbol}`;c.style.setProperty('--x',`${8+Math.random()*84}%`);c.style.setProperty('--r',`${-120+Math.random()*240}deg`);c.style.animationDelay=`${delay}ms`;layer.appendChild(c);delay+=18;}}
    setTimeout(()=>layer.remove(),5200);
  }
  function renderSolitaire(){
    if(!solitaireBoard||!solState)return;
    const wasteShown=solState.waste.slice(-Math.min(3,solState.waste.length));
    let html='<div class="sol-top-row">';
    html+=`<div class="sol-slot-wrap"><button class="sol-slot sol-stock" id="solStock" aria-label="Balíček">${solState.stock.length?'<span class="sol-back-design"></span>':'↻'}</button><small>${solState.stock.length}</small></div>`;
    html+='<div class="sol-slot sol-waste" data-sol-drop="waste">';
    wasteShown.forEach((card,i)=>{const playable=i===wasteShown.length-1;html+=solCardMarkup(card,playable?`data-sol-source="waste" data-card-id="${card.id}"`:'tabindex="-1"',solSelected?.type==='waste',i*15);});
    html+='</div><div class="sol-top-spacer"></div>';
    for(const [suit,symbol,color] of solSuits){const pile=solState.foundations[suit],card=pile.at(-1);html+=`<div class="sol-slot sol-foundation" data-sol-foundation="${suit}">${card?solCardMarkup(card,`data-sol-source="foundation" data-suit="${suit}" data-card-id="${card.id}"`,solSelected?.type==='foundation'&&solSelected.suit===suit):`<span class="sol-foundation-symbol ${color}">${symbol}</span>`}</div>`;}
    html+='</div><div class="sol-tableau">';
    solState.tableau.forEach((pile,pileIndex)=>{
      html+=`<div class="sol-tableau-pile" data-sol-tableau="${pileIndex}">`;
      if(!pile.length)html+='<span class="sol-empty-king">K</span>';
      let solY=0;pile.forEach((card,index)=>{const sel=solSelected?.type==='tableau'&&solSelected.pile===pileIndex&&index>=solSelected.index;html+=solCardMarkup(card,`data-sol-source="tableau" data-pile="${pileIndex}" data-index="${index}" data-card-id="${card.id}"`,sel,solY);solY+=card.faceUp?24:13;});
      html+='</div>';
    });
    html+='</div>';
    solitaireBoard.innerHTML=html;bindSolitaireEvents();
    solScoreEl.textContent=solState.scoreMode==='none'?'Skóre: —':`Skóre: ${solState.score}`;
  }
  function solSelectFromElement(el){
    const type=el?.dataset?.solSource;if(!type)return null;
    if(type==='waste')return{type:'waste'};
    if(type==='foundation')return{type:'foundation',suit:el.dataset.suit};
    if(type==='tableau')return{type:'tableau',pile:Number(el.dataset.pile),index:Number(el.dataset.index)};
    return null;
  }
  function solTargetFromPoint(x,y){
    const el=document.elementFromPoint(x,y);if(!el)return null;
    const foundation=el.closest('[data-sol-foundation]');if(foundation)return{type:'foundation',suit:foundation.dataset.solFoundation};
    const tableau=el.closest('[data-sol-tableau]');if(tableau)return{type:'tableau',pile:Number(tableau.dataset.solTableau)};
    return null;
  }
  function solCreateDragGhost(src,x,y){
    const cards=solSourceCards(src);if(!cards.length)return null;
    const ghost=document.createElement('div');ghost.className='sol-drag-ghost';
    const max=Math.min(cards.length,8);cards.slice(0,max).forEach((card,i)=>{const wrap=document.createElement('div');wrap.className=`sol-ghost-card ${card.color}`;wrap.style.top=`${i*22}px`;wrap.innerHTML=`<span>${card.label}${card.symbol}</span><b>${card.symbol}</b>`;ghost.appendChild(wrap);});
    document.body.appendChild(ghost);solPositionGhost(ghost,x,y);return ghost;
  }
  function solPositionGhost(ghost,x,y){ghost.style.left=`${x+10}px`;ghost.style.top=`${y+10}px`;}
  function solBeginPointerDrag(cardEl,src,ev){
    if(!solSourceValid(src))return;
    const startX=ev.clientX,startY=ev.clientY,pointerId=ev.pointerId;
    let ghost=null,moved=false;
    cardEl.setPointerCapture?.(pointerId);
    const onMove=e=>{
      if(e.pointerId!==pointerId)return;
      const dist=Math.hypot(e.clientX-startX,e.clientY-startY);
      if(!moved&&dist>7){moved=true;solSuppressClick=true;solSelected=src;cardEl.classList.add('is-selected');ghost=solCreateDragGhost(src,e.clientX,e.clientY);}
      if(moved&&ghost){e.preventDefault();solPositionGhost(ghost,e.clientX,e.clientY);}
    };
    const onEnd=e=>{
      if(e.pointerId!==pointerId)return;
      cardEl.releasePointerCapture?.(pointerId);cardEl.removeEventListener('pointermove',onMove);cardEl.removeEventListener('pointerup',onEnd);cardEl.removeEventListener('pointercancel',onEnd);
      ghost?.remove();
      if(moved){
        const target=solTargetFromPoint(e.clientX,e.clientY);let ok=false;
        if(target?.type==='tableau')ok=solMoveToTableau(target.pile,src);
        if(target?.type==='foundation')ok=solMoveToFoundation(target.suit,src);
        if(!ok){solSetMessage('Tento tah není možný');solSelected=null;renderSolitaire();}
        setTimeout(()=>{solSuppressClick=false;},0);
      }
    };
    cardEl.addEventListener('pointermove',onMove);cardEl.addEventListener('pointerup',onEnd);cardEl.addEventListener('pointercancel',onEnd);
  }
  function solHandleCardClick(cardEl){
    if(solSuppressClick)return;
    const src=solSelectFromElement(cardEl);if(!src)return;
    if(src.type==='tableau'){
      const card=solState.tableau[src.pile][src.index];
      if(!card.faceUp){if(src.index===solState.tableau[src.pile].length-1){card.faceUp=true;solScoreMove('flip');solSetMessage('Karta otočena');renderSolitaire();}return;}
    }
    if(solSelected){
      if(src.type==='tableau'&&solMoveToTableau(src.pile))return;
      if(src.type==='foundation'&&solMoveToFoundation(src.suit))return;
      const same=JSON.stringify(src)===JSON.stringify(solSelected);if(same){solSelected=null;renderSolitaire();return;}
    }
    solSelected=src;solSetMessage('Vybraná karta – klikni nebo přetáhni na cíl');renderSolitaire();
  }
  function bindSolitaireEvents(){
    document.getElementById('solStock')?.addEventListener('click',drawSolitaireStock);
    solitaireBoard.querySelectorAll('[data-sol-source]').forEach(cardEl=>{
      cardEl.addEventListener('click',e=>{e.stopPropagation();solHandleCardClick(cardEl);});
      cardEl.addEventListener('dblclick',e=>{e.preventDefault();e.stopPropagation();const src=solSelectFromElement(cardEl);if(src)solAutoFoundation(src);});
      cardEl.addEventListener('contextmenu',e=>{e.preventDefault();e.stopPropagation();const src=solSelectFromElement(cardEl);if(src)solAutoFoundation(src);});
      cardEl.addEventListener('pointerdown',e=>{if(e.button!==0||!cardEl.classList.contains('sol-card-face'))return;e.stopPropagation();const src=solSelectFromElement(cardEl);if(src)solBeginPointerDrag(cardEl,src,e);});
    });
    solitaireBoard.querySelectorAll('[data-sol-tableau]').forEach(pile=>{
      pile.addEventListener('click',e=>{if(e.target.closest('.sol-card'))return;if(solSelected)solMoveToTableau(Number(pile.dataset.solTableau));});
    });
    solitaireBoard.querySelectorAll('[data-sol-foundation]').forEach(slot=>{
      slot.addEventListener('click',e=>{if(e.target.closest('[data-sol-source]'))return;if(solSelected)solMoveToFoundation(slot.dataset.solFoundation);});
    });
    solitaireBoard.addEventListener('contextmenu',e=>{if(e.target.closest('[data-sol-source]'))return;e.preventDefault();solAutoAllFoundations();});
  }
  function solFindHint(){
    if(solState.waste.length){const src={type:'waste'};const c=solState.waste.at(-1);if(solCanFoundation(c,c.suit))return`Přesuň ${c.label}${c.symbol} z balíčku do základu.`;for(let p=0;p<7;p++)if(solCanTableau([c],p))return`Přesuň ${c.label}${c.symbol} z balíčku do sloupce ${p+1}.`;}
    for(let p=0;p<7;p++){
      const pile=solState.tableau[p],top=pile.at(-1);if(top&&!top.faceUp)return`Otoč zakrytou kartu ve sloupci ${p+1}.`;
      for(let i=0;i<pile.length;i++){const c=pile[i];if(!c.faceUp)continue;const src={type:'tableau',pile:p,index:i},cards=solSourceCards(src);if(cards.length===1&&solCanFoundation(c,c.suit))return`Přesuň ${c.label}${c.symbol} do základu.`;for(let t=0;t<7;t++)if(t!==p&&solCanTableau(cards,t))return`Přesuň ${c.label}${c.symbol}${cards.length>1?' a karty pod ní':''} do sloupce ${t+1}.`;}
    }
    if(solState.stock.length||solState.waste.length)return'Klikni na balíček.';
    return'Žádný tah jsem nenašel.';
  }
  function solAutoAllFoundations(){
    let moved=true,guard=0,count=0;
    while(moved&&guard++<100){moved=false;if(solState.waste.length&&solAutoFoundation({type:'waste'},{silent:true})){moved=true;count++;continue;}for(let i=0;i<7;i++){const pile=solState.tableau[i],top=pile.at(-1);if(top?.faceUp&&solAutoFoundation({type:'tableau',pile:i,index:pile.length-1},{silent:true})){moved=true;count++;break;}}}
    solSetMessage(count?`Automaticky přesunuto ${count} karet`:'Žádná dostupná karta do základu');renderSolitaire();checkSolitaireWin();
  }
  document.getElementById('solNewGame')?.addEventListener('click',newSolitaire);
  solDrawMode?.addEventListener('change',newSolitaire);
  solScoreMode?.addEventListener('change',newSolitaire);
  solTimed?.addEventListener('change',()=>{startSolTimer();});
  document.getElementById('solHint')?.addEventListener('click',()=>solSetMessage(solFindHint()));
  document.getElementById('solHelp')?.addEventListener('click',()=>alert('Solitaire (Klondike): sedm sloupců stav sestupně a střídavě červená/černá. Do prázdného sloupce patří pouze král. Čtyři základy nahoře stav podle barvy od esa po krále. Karty můžeš přetahovat myší i prstem, nebo je vybrat kliknutím a kliknout na cíl. Dvojklik nebo pravé tlačítko na kartě ji zkusí přesunout do základu. Pravé tlačítko na zelenou plochu přesune všechny právě dostupné karty do základů.')); 
  document.getElementById('solAutoFinish')?.addEventListener('click',solAutoAllFoundations);
  newSolitaire();


  /* ---------------- Paint ---------------- */
  const canvas=document.getElementById('paintCanvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
  const palette=document.getElementById('paintPalette');
  const paintStatus=document.getElementById('paintStatus');
  const paintCoords=document.getElementById('paintCoords');
  const paintSelectionMarquee=document.getElementById('paintSelectionMarquee');
  const paintSelectionOverlay=document.getElementById('paintSelectionOverlay');
  const paintSelectionCanvas=document.getElementById('paintSelectionCanvas');
  const paintSelectionCtx=paintSelectionCanvas?.getContext('2d',{willReadFrequently:true});
  const colors=['#000000','#808080','#800000','#808000','#008000','#008080','#000080','#800080','#ffffff','#c0c0c0','#ff0000','#ffff00','#00ff00','#00ffff','#0000ff','#ff00ff','#ff7f27','#a349a4','#00a2e8','#22b14c','#ffc90e','#efe4b0','#b97a57','#7092be','#3f48cc','#c8bfe7','#ffaec9','#b5e61d'];
  let paintPrimary='#000000',paintSecondary='#ffffff',paintTool='select',drawing=false,startPoint=null,lastPoint=null,shapeSnapshot=null,paintButton=0;
  let paintSelection=null,selectionDrag=null;
  const undoStack=[],redoStack=[];
  const paintToolLabels={
    'free-select':'Free-Form Select',select:'Select',eraser:'Eraser/Color Eraser',fill:'Fill With Color',eyedropper:'Pick Color',magnifier:'Magnifier',
    pencil:'Pencil',brush:'Brush',airbrush:'Airbrush',text:'Text',line:'Line',curve:'Curve',rectangle:'Rectangle',polygon:'Polygon',ellipse:'Ellipse','rounded-rectangle':'Rounded Rectangle'
  };
  const cloneCanvas=()=>ctx.getImageData(0,0,canvas.width,canvas.height);
  function setPaintStatus(text){if(paintStatus)paintStatus.textContent=text;}
  function pushPaintUndo(){try{undoStack.push(cloneCanvas());if(undoStack.length>30)undoStack.shift();redoStack.length=0;}catch{}}
  function restorePaint(img){if(img)ctx.putImageData(img,0,0);}
  function clearCanvas(){ctx.save();ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore();setPaintStatus('For Help, click Help Topics on the Help Menu.');}
  clearCanvas();
  function updatePaintPreviews(){const a=document.getElementById('paintPrimaryPreview'),b=document.getElementById('paintSecondaryPreview');if(a)a.style.background=paintPrimary;if(b)b.style.background=paintSecondary;}
  colors.forEach((c,i)=>{
    const b=document.createElement('button');b.type='button';b.className='palette-color'+(i===0?' is-selected':'');b.style.setProperty('--c',c);b.title=`Left: foreground ${c} • Right: background`;
    b.addEventListener('click',()=>{paintPrimary=c;palette.querySelectorAll('.palette-color').forEach(x=>x.classList.toggle('is-selected',x===b));updatePaintPreviews();});
    b.addEventListener('contextmenu',e=>{e.preventDefault();paintSecondary=c;updatePaintPreviews();});palette.appendChild(b);
  });updatePaintPreviews();

  const getDisplayScale=()=>({sx:canvas.clientWidth/canvas.width,sy:canvas.clientHeight/canvas.height});
  function hideMarquee(){paintSelectionMarquee.hidden=true;}
  function clearFloatingSelection(commit=true){
    if(!paintSelection)return;
    if(commit&&paintSelection.cut){
      ctx.drawImage(paintSelectionCanvas,paintSelection.x,paintSelection.y,paintSelection.w,paintSelection.h);
    }
    paintSelection=null;paintSelectionOverlay.hidden=true;selectionDrag=null;
  }
  function syncSelectionOverlay(){
    if(!paintSelection)return;
    const {sx,sy}=getDisplayScale();
    paintSelectionOverlay.style.left=`${canvas.offsetLeft+paintSelection.x*sx}px`;
    paintSelectionOverlay.style.top=`${canvas.offsetTop+paintSelection.y*sy}px`;
    paintSelectionOverlay.style.width=`${Math.max(1,paintSelection.w*sx)}px`;
    paintSelectionOverlay.style.height=`${Math.max(1,paintSelection.h*sy)}px`;
  }
  function makeSelection(a,b,transparent=false){
    clearFloatingSelection(true);
    const x=Math.max(0,Math.floor(Math.min(a.x,b.x))),y=Math.max(0,Math.floor(Math.min(a.y,b.y))),w=Math.max(1,Math.floor(Math.abs(b.x-a.x))),h=Math.max(1,Math.floor(Math.abs(b.y-a.y)));
    const clampedW=Math.min(w,canvas.width-x),clampedH=Math.min(h,canvas.height-y);
    if(clampedW<2||clampedH<2){hideMarquee();return;}
    const data=ctx.getImageData(x,y,clampedW,clampedH);
    if(transparent||document.getElementById('paintTransparentSelection')?.checked){
      for(let i=0;i<data.data.length;i+=4){if(data.data[i]>245&&data.data[i+1]>245&&data.data[i+2]>245)data.data[i+3]=0;}
    }
    paintSelectionCanvas.width=clampedW;paintSelectionCanvas.height=clampedH;paintSelectionCtx.clearRect(0,0,clampedW,clampedH);paintSelectionCtx.putImageData(data,0,0);
    paintSelection={x,y,w:clampedW,h:clampedH,sourceX:x,sourceY:y,cut:false};
    paintSelectionOverlay.hidden=false;syncSelectionOverlay();hideMarquee();setPaintStatus(`${paintToolLabels[paintTool]} ${clampedW} x ${clampedH}`);
  }
  paintSelectionOverlay?.addEventListener('pointerdown',ev=>{
    if(!paintSelection||ev.button!==0)return;ev.preventDefault();
    if(!paintSelection.cut){pushPaintUndo();ctx.fillStyle='#fff';ctx.fillRect(paintSelection.sourceX,paintSelection.sourceY,paintSelection.w,paintSelection.h);paintSelection.cut=true;}
    selectionDrag={startX:ev.clientX,startY:ev.clientY,x:paintSelection.x,y:paintSelection.y};paintSelectionOverlay.setPointerCapture?.(ev.pointerId);
  });
  paintSelectionOverlay?.addEventListener('pointermove',ev=>{
    if(!selectionDrag||!paintSelection)return;const {sx,sy}=getDisplayScale();paintSelection.x=Math.round(selectionDrag.x+(ev.clientX-selectionDrag.startX)/sx);paintSelection.y=Math.round(selectionDrag.y+(ev.clientY-selectionDrag.startY)/sy);paintSelection.x=Math.max(0,Math.min(canvas.width-paintSelection.w,paintSelection.x));paintSelection.y=Math.max(0,Math.min(canvas.height-paintSelection.h,paintSelection.y));syncSelectionOverlay();
  });
  paintSelectionOverlay?.addEventListener('pointerup',ev=>{if(!selectionDrag)return;paintSelectionOverlay.releasePointerCapture?.(ev.pointerId);selectionDrag=null;clearFloatingSelection(true);setPaintStatus('Selection moved.');});

  document.querySelectorAll('#paintWindow [data-tool]').forEach(b=>b.addEventListener('click',()=>{
    clearFloatingSelection(true);hideMarquee();paintTool=b.dataset.tool;document.querySelectorAll('#paintWindow [data-tool]').forEach(x=>x.classList.remove('is-selected'));b.classList.add('is-selected');
    const label=document.getElementById('paintToolLabel');if(label)label.textContent=paintToolLabels[paintTool];setPaintStatus(paintToolLabels[paintTool]);
  }));
  const paintPoint=ev=>{const r=canvas.getBoundingClientRect();return{x:Math.max(0,Math.min(canvas.width-1,(ev.clientX-r.left)*canvas.width/r.width)),y:Math.max(0,Math.min(canvas.height-1,(ev.clientY-r.top)*canvas.height/r.height))};};
  const paintColor=()=>paintButton===2?paintSecondary:paintPrimary;
  function paintStroke(a,b){const size=+document.getElementById('paintSize').value,color=paintTool==='eraser'?'#fff':paintColor();ctx.strokeStyle=color;ctx.lineWidth=paintTool==='pencil'?Math.max(1,Math.min(2,size)):paintTool==='eraser'?Math.max(8,size*2):size;ctx.lineCap=paintTool==='pencil'?'butt':'round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
  function sprayAt(p){const size=+document.getElementById('paintSize').value,r=Math.max(5,size*1.7),dots=Math.max(18,Math.round(size*3));ctx.fillStyle=paintColor();for(let i=0;i<dots;i++){const ang=Math.random()*Math.PI*2,rad=Math.sqrt(Math.random())*r;ctx.fillRect(p.x+Math.cos(ang)*rad,p.y+Math.sin(ang)*rad,1.3,1.3);}}
  function roundedRectPath(x,y,w,h,r){const rr=Math.min(r,w/2,h/2);if(ctx.roundRect){ctx.roundRect(x,y,w,h,rr);return;}ctx.moveTo(x+rr,y);ctx.lineTo(x+w-rr,y);ctx.quadraticCurveTo(x+w,y,x+w,y+rr);ctx.lineTo(x+w,y+h-rr);ctx.quadraticCurveTo(x+w,y+h,x+w-rr,y+h);ctx.lineTo(x+rr,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-rr);ctx.lineTo(x,y+rr);ctx.quadraticCurveTo(x,y,x+rr,y);}
  function drawPaintShape(a,b){
    const size=+document.getElementById('paintSize').value,fill=document.getElementById('paintShapeFill').checked,color=paintColor();ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=size;ctx.lineCap='round';ctx.lineJoin='round';
    const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(b.x-a.x),h=Math.abs(b.y-a.y);ctx.beginPath();
    if(paintTool==='line'){ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();return;}
    if(paintTool==='curve'){const dx=b.x-a.x,dy=b.y-a.y,cx=(a.x+b.x)/2-dy*.22,cy=(a.y+b.y)/2+dx*.22;ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo(cx,cy,b.x,b.y);ctx.stroke();return;}
    if(paintTool==='rectangle')ctx.rect(x,y,w,h);
    else if(paintTool==='rounded-rectangle')roundedRectPath(x,y,w,h,Math.max(6,Math.min(w,h)*.18));
    else if(paintTool==='ellipse')ctx.ellipse(x+w/2,y+h/2,Math.max(.5,w/2),Math.max(.5,h/2),0,0,Math.PI*2);
    else if(paintTool==='polygon'){ctx.moveTo(x+w*.18,y+h);ctx.lineTo(x,y+h*.38);ctx.lineTo(x+w*.45,y);ctx.lineTo(x+w,y+h*.28);ctx.lineTo(x+w*.82,y+h);ctx.closePath();}
    if(fill)ctx.fill();else ctx.stroke();
  }
  function hexToRgba(hex){const h=hex.replace('#','');return[h.length===3?parseInt(h[0]+h[0],16):parseInt(h.slice(0,2),16),h.length===3?parseInt(h[1]+h[1],16):parseInt(h.slice(2,4),16),h.length===3?parseInt(h[2]+h[2],16):parseInt(h.slice(4,6),16),255];}
  function floodFillAt(p,color){
    const img=ctx.getImageData(0,0,canvas.width,canvas.height),data=img.data,w=img.width,h=img.height,x=Math.floor(p.x),y=Math.floor(p.y),start=(y*w+x)*4,target=[data[start],data[start+1],data[start+2],data[start+3]],rep=hexToRgba(color);
    if(target.every((v,i)=>v===rep[i]))return;const match=idx=>data[idx]===target[0]&&data[idx+1]===target[1]&&data[idx+2]===target[2]&&data[idx+3]===target[3];const set=idx=>{data[idx]=rep[0];data[idx+1]=rep[1];data[idx+2]=rep[2];data[idx+3]=255;};
    const stack=[y*w+x];set(start);while(stack.length){const pix=stack.pop(),px=pix%w,py=(pix/w)|0;const candidates=[];if(px>0)candidates.push(pix-1);if(px<w-1)candidates.push(pix+1);if(py>0)candidates.push(pix-w);if(py<h-1)candidates.push(pix+w);for(const np of candidates){const idx=np*4;if(match(idx)){set(idx);stack.push(np);}}}ctx.putImageData(img,0,0);
  }
  function samplePaintColor(p,secondary=false){const d=ctx.getImageData(Math.floor(p.x),Math.floor(p.y),1,1).data;const hex='#'+[d[0],d[1],d[2]].map(v=>v.toString(16).padStart(2,'0')).join('');if(secondary)paintSecondary=hex;else paintPrimary=hex;updatePaintPreviews();setPaintStatus(`Color ${hex}`);}
  function showSelectionMarquee(a,b){const {sx,sy}=getDisplayScale(),x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(b.x-a.x),h=Math.abs(b.y-a.y);paintSelectionMarquee.hidden=false;paintSelectionMarquee.style.left=`${canvas.offsetLeft+x*sx}px`;paintSelectionMarquee.style.top=`${canvas.offsetTop+y*sy}px`;paintSelectionMarquee.style.width=`${w*sx}px`;paintSelectionMarquee.style.height=`${h*sy}px`;}
  function setPaintZoom(z){const zoom=document.getElementById('paintZoom');if(zoom){zoom.value=`${z}%`;canvas.style.width=`${z}%`;setPaintStatus(`Zoom ${z}%`);}}
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  canvas.addEventListener('pointerdown',ev=>{
    ev.preventDefault();paintButton=ev.button;const p=paintPoint(ev);lastPoint=startPoint=p;
    if(paintTool==='magnifier'){const current=parseInt(document.getElementById('paintZoom')?.value||'100',10);const steps=[50,100,150,200,400,800];let idx=steps.indexOf(current);if(idx<0)idx=1;idx=paintButton===2?Math.max(0,idx-1):Math.min(steps.length-1,idx+1);setPaintZoom(steps[idx]);return;}
    if(paintTool==='eyedropper'){samplePaintColor(p,paintButton===2);return;}
    if(paintTool==='fill'){pushPaintUndo();floodFillAt(p,paintColor());setPaintStatus('Area filled.');return;}
    if(paintTool==='text'){const text=prompt('Enter text:','Hanz Garage');if(text){pushPaintUndo();ctx.fillStyle=paintColor();ctx.font=`${Math.max(8,+document.getElementById('paintTextSize').value||24)}px Tahoma, Arial`;ctx.textBaseline='top';ctx.fillText(text,p.x,p.y);setPaintStatus('Text inserted.');}return;}
    if(['select','free-select'].includes(paintTool)){clearFloatingSelection(true);drawing=true;paintSelectionMarquee.hidden=false;showSelectionMarquee(p,p);canvas.setPointerCapture?.(ev.pointerId);return;}
    pushPaintUndo();drawing=true;shapeSnapshot=['line','curve','rectangle','polygon','ellipse','rounded-rectangle'].includes(paintTool)?cloneCanvas():null;canvas.setPointerCapture?.(ev.pointerId);if(paintTool==='airbrush')sprayAt(p);else if(!shapeSnapshot)paintStroke(p,{x:p.x+.01,y:p.y+.01});
  });
  canvas.addEventListener('pointermove',ev=>{const p=paintPoint(ev);if(paintCoords)paintCoords.textContent=`${Math.round(p.x)}, ${Math.round(p.y)}px`;if(!drawing)return;if(['select','free-select'].includes(paintTool)){showSelectionMarquee(startPoint,p);return;}if(shapeSnapshot){restorePaint(shapeSnapshot);drawPaintShape(startPoint,p);}else if(paintTool==='airbrush')sprayAt(p);else paintStroke(lastPoint,p);lastPoint=p;});
  function finishPaint(ev){if(!drawing)return;const p=paintPoint(ev);if(['select','free-select'].includes(paintTool)){drawing=false;makeSelection(startPoint,p,paintTool==='free-select');startPoint=lastPoint=null;return;}if(shapeSnapshot){restorePaint(shapeSnapshot);drawPaintShape(startPoint,p);}drawing=false;shapeSnapshot=startPoint=lastPoint=null;setPaintStatus('For Help, click Help Topics on the Help Menu.');}
  canvas.addEventListener('pointerup',finishPaint);canvas.addEventListener('pointercancel',()=>{drawing=false;shapeSnapshot=null;hideMarquee();});
  function paintUndoAction(){clearFloatingSelection(true);const img=undoStack.pop();if(!img)return;redoStack.push(cloneCanvas());restorePaint(img);setPaintStatus('Undo.');}
  function paintRedoAction(){clearFloatingSelection(true);const img=redoStack.pop();if(!img)return;undoStack.push(cloneCanvas());restorePaint(img);setPaintStatus('Redo.');}
  document.getElementById('paintClear')?.addEventListener('click',()=>{clearFloatingSelection(true);pushPaintUndo();clearCanvas();});
  document.getElementById('paintUndo')?.addEventListener('click',paintUndoAction);document.getElementById('paintUndoButton')?.addEventListener('click',paintUndoAction);document.getElementById('paintRedoButton')?.addEventListener('click',paintRedoAction);
  function savePaint(){clearFloatingSelection(true);const a=document.createElement('a');a.download='hanz-garage-malovani.png';a.href=canvas.toDataURL('image/png');a.click();setPaintStatus('Image saved.');}
  document.getElementById('paintSaveButton')?.addEventListener('click',savePaint);
  const paintNewAction=()=>{if(confirm('Create a new image? Unsaved changes will be lost.')){clearFloatingSelection(false);pushPaintUndo();clearCanvas();}};
  document.getElementById('paintNew')?.addEventListener('click',()=>{const choice=prompt('File menu:\nN = New\nO = Open\nS = Save','N');if(!choice)return;const c=choice.trim().toLowerCase();if(c==='n')paintNewAction();else if(c==='o')document.getElementById('paintFileInput')?.click();else if(c==='s')savePaint();});
  document.getElementById('paintNewButton')?.addEventListener('click',paintNewAction);
  document.getElementById('paintOpenButton')?.addEventListener('click',()=>document.getElementById('paintFileInput')?.click());
  document.getElementById('paintFileInput')?.addEventListener('change',e=>{const file=e.target.files?.[0];if(!file)return;const url=URL.createObjectURL(file),img=new Image();img.onload=()=>{clearFloatingSelection(false);pushPaintUndo();clearCanvas();const scale=Math.min(canvas.width/img.width,canvas.height/img.height,1);ctx.drawImage(img,0,0,img.width*scale,img.height*scale);URL.revokeObjectURL(url);document.getElementById('paintWindowCaption').textContent=`${file.name} - Paint`;setPaintStatus(file.name);};img.src=url;e.target.value='';});
  document.getElementById('paintZoom')?.addEventListener('change',e=>{const z=parseInt(e.target.value,10)||100;canvas.style.width=`${z}%`;syncSelectionOverlay();setPaintStatus(`Zoom ${z}%`);});
  document.getElementById('paintHelp')?.addEventListener('click',()=>alert('Paint tools: Free-Form Select, Select, Eraser, Fill, Pick Color, Magnifier, Pencil, Brush, Airbrush, Text, Line, Curve, Rectangle, Polygon, Ellipse and Rounded Rectangle. Select an area and drag it to move it. Left mouse button uses foreground color; right mouse button uses background color. Right-click a palette color to set the background color.'));
  document.getElementById('paintView')?.addEventListener('click',()=>{const z=document.getElementById('paintZoom');z.value=z.value==='100%'?'200%':'100%';z.dispatchEvent(new Event('change'));});
  document.getElementById('paintImageMenu')?.addEventListener('click',()=>{const fill=document.getElementById('paintShapeFill');fill.checked=!fill.checked;setPaintStatus(fill.checked?'Shape fill enabled.':'Shape fill disabled.');});
  document.getElementById('paintColorsMenu')?.addEventListener('click',()=>{[paintPrimary,paintSecondary]=[paintSecondary,paintPrimary];updatePaintPreviews();setPaintStatus('Colors swapped.');});
  window.addEventListener('resize',syncSelectionOverlay);

  /* ---------------- Notepad ---------------- */
  const note=document.getElementById('notepadArea'),noteStatus=document.getElementById('noteStatus');
  try{const saved=localStorage.getItem('hanzGarageNote');if(saved!==null)note.value=saved;}catch{}
  function updateNoteStatus(){const pos=note.selectionStart||0,before=note.value.slice(0,pos),lines=before.split('\n');noteStatus.textContent=`Řádek ${lines.length}, sloupec ${lines.at(-1).length+1}`;}
  note.addEventListener('input',()=>{try{localStorage.setItem('hanzGarageNote',note.value);}catch{}updateNoteStatus();});note.addEventListener('click',updateNoteStatus);note.addEventListener('keyup',updateNoteStatus);
  document.getElementById('noteClear').addEventListener('click',()=>{if(confirm('Vymazat celý obsah poznámkového bloku?')){note.value='';note.dispatchEvent(new Event('input'));note.focus();}});
  document.getElementById('noteSave').addEventListener('click',()=>{const blob=new Blob([note.value],{type:'text/plain;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='hanz-garage-poznamky.txt';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
  let noteWrap=true;
  document.getElementById('noteFormat')?.addEventListener('click',()=>{noteWrap=!noteWrap;note.wrap=noteWrap?'soft':'off';note.classList.toggle('no-wrap',!noteWrap);});
  document.getElementById('noteView')?.addEventListener('click',()=>{const bar=document.querySelector('#notepadWindow .xp-statusbar');if(bar)bar.hidden=!bar.hidden;});
  document.getElementById('noteHelp')?.addEventListener('click',()=>alert('Poznámkový blok: text se automaticky ukládá v prohlížeči. Soubor uloží TXT, Formát přepíná zalamování řádků. Ctrl+S uloží soubor, Ctrl+F hledá v textu.'));
  document.addEventListener('keydown',e=>{const win=document.getElementById('notepadWindow');if(!win?.classList.contains('is-active-window'))return;if(e.ctrlKey&&e.key.toLowerCase()==='s'){e.preventDefault();document.getElementById('noteSave')?.click();}if(e.ctrlKey&&e.key.toLowerCase()==='f'){e.preventDefault();const q=prompt('Najít:','');if(q){const pos=note.value.toLocaleLowerCase('cs').indexOf(q.toLocaleLowerCase('cs'),note.selectionEnd||0);const found=pos>=0?pos:note.value.toLocaleLowerCase('cs').indexOf(q.toLocaleLowerCase('cs'));if(found>=0){note.focus();note.setSelectionRange(found,found+q.length);updateNoteStatus();}else alert('Text nebyl nalezen.');}}});
  const noteOpenInput=document.getElementById('noteOpenInput');
  noteOpenInput?.addEventListener('change',e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{note.value=String(reader.result||'');note.dispatchEvent(new Event('input'));};reader.readAsText(file,'utf-8');e.target.value='';});
  document.addEventListener('keydown',e=>{const win=document.getElementById('notepadWindow');if(!win?.classList.contains('is-active-window'))return;if(e.ctrlKey&&e.key.toLowerCase()==='o'){e.preventDefault();noteOpenInput?.click();}});
  updateNoteStatus();

  /* ---------------- Calculator ---------------- */
  const calcDisplay=document.getElementById('calculatorDisplay'),calcGrid=document.getElementById('calculatorGrid');
  let calcValue='0',calcAcc=null,calcOp=null,calcWaiting=false,calcMemory=0;
  const calcKeys=[['MC','mem'],['MR','mem'],['MS','mem'],['M+','mem'],['M-','mem'],['Back','op'],['CE','op'],['C','op'],['±','op'],['√','op'],['7',''],['8',''],['9',''],['÷','op'],['%','op'],['4',''],['5',''],['6',''],['×','op'],['1/x','op'],['1',''],['2',''],['3',''],['−','op'],['=','op'],['0','wide'],['.',''],['+','op']];
  const showCalc=()=>{const n=Number(calcValue);calcDisplay.textContent=calcValue.length>18&&Number.isFinite(n)?n.toPrecision(12):calcValue;calcDisplay.classList.toggle('has-memory',calcMemory!==0);};
  function compute(){if(calcAcc===null||!calcOp)return;const b=Number(calcValue),a=calcAcc;let r=b;if(calcOp==='+')r=a+b;if(calcOp==='−')r=a-b;if(calcOp==='×')r=a*b;if(calcOp==='÷')r=b===0?NaN:a/b;if(calcOp==='xʸ')r=Math.pow(a,b);calcValue=Number.isFinite(r)?String(+r.toPrecision(12)):'Error';calcAcc=null;calcOp=null;calcWaiting=true;showCalc();}
  function calcPress(k){
    if(/^\d$/.test(k)){calcValue=(calcWaiting||calcValue==='0'||calcValue==='Error')?k:calcValue+k;calcWaiting=false;}
    else if(k==='.'){if(calcWaiting||calcValue==='Error'){calcValue='0.';calcWaiting=false;}else if(!calcValue.includes('.'))calcValue+='.';}
    else if(['+','−','×','÷','xʸ'].includes(k)){if(calcAcc!==null&&!calcWaiting)compute();calcAcc=Number(calcValue);calcOp=k;calcWaiting=true;}
    else if(k==='=')compute();
    else if(k==='C'){calcValue='0';calcAcc=null;calcOp=null;calcWaiting=false;}
    else if(k==='CE'){calcValue='0';calcWaiting=false;}
    else if(k==='Back'){if(!calcWaiting)calcValue=calcValue.length>1?calcValue.slice(0,-1):'0';}
    else if(k==='±'){calcValue=String(-Number(calcValue));}
    else if(k==='√'){calcValue=Number(calcValue)>=0?String(Math.sqrt(Number(calcValue))):'Error';calcWaiting=true;}
    else if(k==='1/x'){calcValue=Number(calcValue)!==0?String(1/Number(calcValue)):'Error';calcWaiting=true;}
    else if(k==='%'){calcValue=String(Number(calcValue)/100);calcWaiting=true;}
    else if(k==='sin'){calcValue=String(Math.sin(Number(calcValue)*Math.PI/180));calcWaiting=true;}
    else if(k==='cos'){calcValue=String(Math.cos(Number(calcValue)*Math.PI/180));calcWaiting=true;}
    else if(k==='tan'){calcValue=String(Math.tan(Number(calcValue)*Math.PI/180));calcWaiting=true;}
    else if(k==='log'){calcValue=Number(calcValue)>0?String(Math.log10(Number(calcValue))):'Error';calcWaiting=true;}
    else if(k==='ln'){calcValue=Number(calcValue)>0?String(Math.log(Number(calcValue))):'Error';calcWaiting=true;}
    else if(k==='x²'){calcValue=String(Math.pow(Number(calcValue),2));calcWaiting=true;}
    else if(k==='π'){calcValue=String(Math.PI);calcWaiting=true;}
    else if(k==='n!'){let n=Math.floor(Number(calcValue));if(n<0||n>170)calcValue='Error';else{let r=1;for(let i=2;i<=n;i++)r*=i;calcValue=String(r);}calcWaiting=true;}
    else if(k==='MC')calcMemory=0;
    else if(k==='MR'){calcValue=String(calcMemory);calcWaiting=true;}
    else if(k==='MS')calcMemory=Number(calcValue)||0;
    else if(k==='M+')calcMemory+=(Number(calcValue)||0);
    else if(k==='M-')calcMemory-=(Number(calcValue)||0);
    showCalc();
  }
  calcKeys.forEach(([k,cls])=>{const b=document.createElement('button');b.type='button';b.className='calc-key'+(cls==='op'?' op':'')+(cls==='mem'?' mem':'');if(cls==='wide')b.style.gridColumn='span 2';b.textContent=k;b.addEventListener('click',()=>calcPress(k));calcGrid.appendChild(b);});showCalc();
  ['sin','cos','tan','log','ln','x²','xʸ','π','n!'].forEach(k=>{const b=document.createElement('button');b.type='button';b.className='calc-key calc-scientific-key';b.textContent=k;b.addEventListener('click',()=>calcPress(k));calcGrid.appendChild(b);});
  document.addEventListener('keydown',e=>{
    const win=document.getElementById('calculatorWindow');if(!win?.classList.contains('is-active-window')||e.target.matches('input,textarea'))return;
    const map={Enter:'=',Escape:'C',Backspace:'Back','/':'÷','*':'×','-':'−','+':'+',',':'.'};const key=map[e.key]||e.key;if(/^\d$/.test(key)||['.','=','C','Back','÷','×','−','+'].includes(key)){e.preventDefault();calcPress(key);}
  });

  document.getElementById('calcView')?.addEventListener('click',()=>{const w=document.getElementById('calculatorWindow');if(!w)return;const sci=w.classList.toggle('calculator-scientific');w.style.width=sci?'430px':'315px';w.dataset.width=sci?'430':'315';showBalloon('Kalkulačka',sci?'Vědecké zobrazení zapnuto.':'Standardní zobrazení zapnuto.',1800);});
  document.getElementById('calcHelp')?.addEventListener('click',()=>alert('Kalkulačka podporuje standardní i vědecké zobrazení, klávesnici, paměť MC/MR/MS/M+/M−, trigonometrické funkce, logaritmy, mocniny a faktoriál.'));

  /* ---------------- Internet Explorer ---------------- */
  const ieAddress=document.getElementById('ieAddress'),ieStatus=document.getElementById('ieStatus'),ieHomePage=document.getElementById('ieHomePage'),ieExternalPage=document.getElementById('ieExternalPage'),ieExternalUrl=document.getElementById('ieExternalUrl'),ieExternalTitle=document.getElementById('ieExternalTitle'),ieOpenExternal=document.getElementById('ieOpenExternal'),ieLoadingDetail=document.getElementById('ieLoadingDetail');
  let ieHistory=['http://www.hanz-garage.cz/'],ieHistoryIndex=0,ieLoadingTick=0,ieLoadingTimer=null;
  function ieNormalizeAddress(raw){
    const v=(raw||'').trim();if(!v)return'http://www.hanz-garage.cz/';if(/^https?:\/\//i.test(v))return v;if(/^www\./i.test(v))return`http://${v}`;if(v.includes('.')&&!v.includes(' '))return`http://${v}`;return`http://search.msn.com/results.aspx?q=${encodeURIComponent(v)}`;
  }
  function ieStartInfiniteLoading(url){
    const normalized=ieNormalizeAddress(url||ieAddress?.value||'http://www.hanz-garage.cz/');
    if(ieAddress)ieAddress.value=normalized;
    if(ieHomePage)ieHomePage.hidden=true;
    if(ieExternalPage)ieExternalPage.hidden=false;
    const win=document.getElementById('internetExplorerWindow');
    win?.classList.remove('ie-loading-paused');
    if(ieExternalUrl)ieExternalUrl.textContent=normalized;
    if(ieExternalTitle)ieExternalTitle.textContent='Načítání stránky…';
    if(ieOpenExternal)ieOpenExternal.hidden=true;
    const title=document.getElementById('ieWindowTitle');if(title)title.textContent='Internet Explorer';
    clearInterval(ieLoadingTimer);ieLoadingTick=0;
    const states=['Vyhledávání serveru…','Připojování k webu…','Čekání na odpověď serveru…','Stahování stránky…'];
    const update=()=>{const dots='.'.repeat((ieLoadingTick%3)+1);if(ieStatus)ieStatus.textContent=`Otevírání stránky${dots}`;if(ieLoadingDetail)ieLoadingDetail.textContent=states[Math.floor(ieLoadingTick/3)%states.length];ieLoadingTick++;};
    update();ieLoadingTimer=setInterval(update,520);
  }
  function ieRender(url,{push=true}={}){
    const normalized=ieNormalizeAddress(url);if(push&&ieHistory[ieHistoryIndex]!==normalized){ieHistory=ieHistory.slice(0,ieHistoryIndex+1);ieHistory.push(normalized);ieHistoryIndex=ieHistory.length-1;}
    ieStartInfiniteLoading(normalized);
    document.getElementById('ieBack').disabled=ieHistoryIndex<=0;document.getElementById('ieForward').disabled=ieHistoryIndex>=ieHistory.length-1;
  }
  function ieGo(){ieRender(ieAddress?.value||'http://www.hanz-garage.cz/');}
  document.getElementById('ieGo')?.addEventListener('click',ieGo);ieAddress?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();ieGo();}});
  document.getElementById('ieBack')?.addEventListener('click',()=>{if(ieHistoryIndex>0){ieHistoryIndex--;ieRender(ieHistory[ieHistoryIndex],{push:false});}});
  document.getElementById('ieForward')?.addEventListener('click',()=>{if(ieHistoryIndex<ieHistory.length-1){ieHistoryIndex++;ieRender(ieHistory[ieHistoryIndex],{push:false});}});
  document.getElementById('ieStop')?.addEventListener('click',()=>{const win=document.getElementById('internetExplorerWindow');win?.classList.add('ie-loading-paused');clearInterval(ieLoadingTimer);if(ieStatus)ieStatus.textContent='Zastaveno';if(ieLoadingDetail)ieLoadingDetail.textContent='Načítání bylo zastaveno.';setTimeout(()=>{if(win?.classList.contains('is-open'))ieStartInfiniteLoading();},900);});
  document.getElementById('ieRefresh')?.addEventListener('click',()=>ieStartInfiniteLoading());
  document.getElementById('ieHome')?.addEventListener('click',()=>ieRender('http://www.hanz-garage.cz/'));
  document.getElementById('ieSearch')?.addEventListener('click',()=>{if(ieAddress){ieAddress.value='';ieAddress.placeholder='Hledat na webu…';ieAddress.focus();}});
  document.getElementById('ieFavorites')?.addEventListener('click',()=>ieStartInfiniteLoading('http://favorites/'));
  document.getElementById('ieHelp')?.addEventListener('click',()=>alert('Internet Explorer v této instalaci se pokouší připojit k internetu, ale stránka se stále načítá. Tlačítka Zpět, Vpřed, Zastavit, Aktualizovat, Domů a adresní řádek zůstávají funkční.'));
  document.querySelectorAll('[data-ie-url]').forEach(b=>b.addEventListener('click',()=>ieRender(b.dataset.ieUrl)));
  if(ieHomePage)ieHomePage.hidden=true;if(ieExternalPage)ieExternalPage.hidden=false;if(ieExternalUrl)ieExternalUrl.textContent='http://www.hanz-garage.cz/';if(ieStatus)ieStatus.textContent='Připraveno';

  /* ---------------- Command Prompt ---------------- */
  const cmdOutput=document.getElementById('cmdOutput'),cmdInput=document.getElementById('cmdInput'),cmdConsole=document.getElementById('cmdConsole');
  let cmdHistory=[],cmdHistoryPos=0,cmdCwd='C:\\Documents and Settings\\Hanz',cmdColor='0F';
  const cmdPrograms={sol:'solitaireWindow',solitaire:'solitaireWindow',winmine:'minesweeperWindow',mspaint:'paintWindow',paint:'paintWindow',notepad:'notepadWindow',calc:'calculatorWindow',wmplayer:'mediaPlayerWindow',taskmgr:'taskManagerWindow',explorer:'computerWindow',iexplore:'internetExplorerWindow',cmd:'cmdWindow',control:'controlPanelWindow',recycle:'recycleBinWindow',recyclebin:'recycleBinWindow',hanzcenter:'hanzCenterWindow',center:'hanzCenterWindow',soundrec:'soundRecorderWindow',sndrec32:'soundRecorderWindow',documents:'documentsWindow',docs:'documentsWindow',snake:'snakeWindow',had:'snakeWindow',archiv:'archiveWindow',archive:'archiveWindow','desk.cpl':'displayPropertiesWindow','sysdm.cpl':'systemPropertiesWindow',sysdm:'systemPropertiesWindow'};
  function cmdPrint(text=''){cmdOutput.textContent+=`${text}\n`;cmdConsole.scrollTop=cmdConsole.scrollHeight;}
  function cmdPromptText(){return`${cmdCwd}>`;}
  function updateCmdPrompt(){const p=document.getElementById('cmdPrompt');if(p)p.textContent=cmdPromptText();}
  function cmdDir(){cmdPrint(' Svazek v jednotce C nemá jmenovku.');cmdPrint(' Sériové číslo svazku je HGXP-2001');cmdPrint('');cmdPrint(` Výpis adresáře ${cmdCwd}`);cmdPrint('');cmdPrint('13.08.2026  21:06    <DIR>          .');cmdPrint('13.08.2026  21:06    <DIR>          ..');cmdPrint('13.08.2026  20:42    <DIR>          Dokumenty');cmdPrint('13.08.2026  20:43    <DIR>          Obrázky');cmdPrint('13.08.2026  20:45             4 398 078 Nachtfahrer.mp3');cmdPrint('13.08.2026  20:46                 1 hanz-garage.txt');cmdPrint('               2 souborů      4 398 079 bajtů');cmdPrint('               4 adresářů');}
  async function cmdExecute(raw){
    const line=(raw||'').trim();cmdPrint(`${cmdPromptText()}${raw||''}`);if(!line){cmdPrint();return;}
    cmdHistory.push(raw);cmdHistoryPos=cmdHistory.length;
    const [command,...restParts]=line.split(/\s+/),rest=line.slice(command.length).trim(),c=command.toLowerCase();
    if(c==='help'){cmdPrint('HELP CLS DIR CD ECHO DATE TIME VER WHOAMI HOSTNAME IPCONFIG PING START COLOR TITLE TYPE TREE SET SOL WINMINE MSPAINT NOTEPAD CALC WMPLAYER TASKMGR EXPLORER IEXPLORE CONTROL HANZCENTER RADIO SCREENSAVER EXIT');}
    else if(c==='cls'){cmdOutput.textContent='';}
    else if(c==='dir')cmdDir();
    else if(c==='cd'||c==='chdir'){if(!rest)cmdPrint(cmdCwd);else if(rest==='..'){cmdCwd=cmdCwd.includes('\\')?cmdCwd.slice(0,cmdCwd.lastIndexOf('\\')):cmdCwd;}else if(rest==='\\'||rest==='C:\\')cmdCwd='C:\\';else cmdCwd=rest.includes(':')?rest:`${cmdCwd}\\${rest}`;updateCmdPrompt();}
    else if(c==='echo')cmdPrint(rest);
    else if(c==='date')cmdPrint(`Aktuální datum: ${new Date().toLocaleDateString('cs-CZ')}`);
    else if(c==='time')cmdPrint(`Aktuální čas: ${new Date().toLocaleTimeString('cs-CZ')}`);
    else if(c==='ver')cmdPrint('Microsoft Windows XP [Verze 5.1.2600] – Hanz Garage Edition');
    else if(c==='whoami')cmdPrint('HANZ-GARAGE\\Hanz');
    else if(c==='hostname')cmdPrint('HANZ-GARAGE-XP');
    else if(c==='ipconfig'){cmdPrint('Konfigurace protokolu IP systému Windows');cmdPrint('');cmdPrint('Adaptér Ethernet Připojení k místní síti:');cmdPrint('   Adresa IP . . . . . . . . . . . : 192.168.1.69');cmdPrint('   Maska podsítě . . . . . . . . . : 255.255.255.0');cmdPrint('   Výchozí brána . . . . . . . . . : 192.168.1.1');}
    else if(c==='ping'){
      const host=rest||'hanzgarage.cz';cmdPrint(`Příkaz PING na ${host} [127.0.0.1] s délkou 32 bajtů:`);for(let i=0;i<4;i++){await new Promise(r=>setTimeout(r,110));cmdPrint(`Odpověď od 127.0.0.1: bajty=32 čas=${1+i}ms TTL=128`);}cmdPrint('Statistika ping: Odeslané = 4, Přijaté = 4, Ztracené = 0 (ztráta 0 %).');
    }
    else if(c==='start'){if(/^https?:\/\//i.test(rest))window.open(rest,'_blank','noopener,noreferrer');else if(cmdPrograms[rest.toLowerCase()])openWindow(cmdPrograms[rest.toLowerCase()]);else if(rest)window.open(ieNormalizeAddress(rest),'_blank','noopener,noreferrer');}
    else if(c==='hanzcenter'||c==='center')openWindow('hanzCenterWindow');
    else if(c==='radio'||c==='kiss'){openWindow('mediaPlayerWindow');connectWmpKiss(true,0);cmdPrint('Spouštím Rádio KISS…');}
    else if(c==='screensaver'){startScreensaver();}
    else if(c==='color'){if(!rest)cmdPrint(`COLOR ${cmdColor}`);else{cmdColor=rest.toUpperCase().slice(0,2);const map={'0':'#000','1':'#000080','2':'#008000','3':'#008080','4':'#800000','5':'#800080','6':'#808000','7':'#c0c0c0','8':'#808080','9':'#00f','A':'#0f0','B':'#0ff','C':'#f00','D':'#f0f','E':'#ff0','F':'#fff'};cmdConsole.style.background=map[cmdColor[0]]||'#000';cmdConsole.style.color=map[cmdColor[1]]||'#fff';}}
    else if(c==='title'){const t=document.querySelector('#cmdWindow .xp-window-title');if(t)t.lastChild.textContent=rest||'Příkazový řádek';}
    else if(c==='type'){cmdPrint(rest.toLowerCase().includes('hanz')?'Hanz Garage – Ještě na tom makáme, kámo. Na dobrý věci se vyplatí počkat!':'Systém nemůže nalézt zadaný soubor.');}
    else if(c==='tree'){cmdPrint('C:.');cmdPrint('├───Dokumenty');cmdPrint('├───Obrázky');cmdPrint('├───Hudba');cmdPrint('└───Programy');cmdPrint('    ├───Hry');cmdPrint('    └───Příslušenství');}
    else if(c==='set'){cmdPrint('COMPUTERNAME=HANZ-GARAGE-XP');cmdPrint('USERNAME=Hanz');cmdPrint('OS=Windows_NT');cmdPrint('HANZ=GARAGE');}
    else if(c==='exit'){closeWindow(document.getElementById('cmdWindow'));}
    else if(cmdPrograms[c]){openWindow(cmdPrograms[c]);}
    else{cmdPrint(`'${command}' není názvem vnitřního ani vnějšího příkazu, spustitelného programu nebo dávkového souboru.`);}
    cmdPrint();
  }
  cmdInput?.addEventListener('keydown',e=>{
    if(e.key==='Enter'){e.preventDefault();const v=cmdInput.value;cmdInput.value='';cmdExecute(v);}
    else if(e.key==='ArrowUp'){e.preventDefault();if(cmdHistory.length){cmdHistoryPos=Math.max(0,cmdHistoryPos-1);cmdInput.value=cmdHistory[cmdHistoryPos]||'';cmdInput.setSelectionRange(cmdInput.value.length,cmdInput.value.length);}}
    else if(e.key==='ArrowDown'){e.preventDefault();if(cmdHistory.length){cmdHistoryPos=Math.min(cmdHistory.length,cmdHistoryPos+1);cmdInput.value=cmdHistoryPos===cmdHistory.length?'':cmdHistory[cmdHistoryPos]||'';}}
  });
  cmdConsole?.addEventListener('click',()=>cmdInput?.focus());

  /* ---------------- Control Panel ---------------- */
  const cpVolume=document.getElementById('cpVolume'),cpIconSize=document.getElementById('cpIconSize'),cpBrightness=document.getElementById('cpBrightness');
  cpVolume?.addEventListener('input',()=>{const v=+cpVolume.value;const sys=document.getElementById('systemVolume');if(sys){sys.value=String(v);sys.dispatchEvent(new Event('input'));}});
  cpIconSize?.addEventListener('change',()=>{document.documentElement.dataset.iconSize=cpIconSize.value;setTimeout(()=>{snapDesktopIcons?.(desktopMovableIcons?.()||[],{save:true});positionRecycleBin?.();},40);});
  cpBrightness?.addEventListener('input',()=>{const wallpaper=document.querySelector('.wallpaper');if(wallpaper)wallpaper.style.filter=`brightness(${cpBrightness.value}%)`;});
  document.getElementById('cpResetWindows')?.addEventListener('click',()=>{xpWindows.forEach(w=>{delete w.dataset.placed;w.classList.remove('is-maximized');placeWindow(w);});});
  document.getElementById('cpPlayStartup')?.addEventListener('click',()=>playStartupSound({restart:true}));
  document.getElementById('cpSystemInfo')?.addEventListener('click',()=>alert('Hanz Garage XP Professional\nVerze 5.1.2600\nService Pack: Garage Edition\nProhlížeč: '+navigator.userAgent));
  const cpSettingsPopover=document.getElementById('cpSettingsPopover');
  document.getElementById('cpMoreOptions')?.addEventListener('click',()=>{if(cpSettingsPopover)cpSettingsPopover.hidden=false;});
  document.getElementById('cpSettingsClose')?.addEventListener('click',()=>{if(cpSettingsPopover)cpSettingsPopover.hidden=true;});
  document.getElementById('cpClassicView')?.addEventListener('click',()=>{
    const main=document.querySelector('#controlPanelWindow .cp-category-main');
    if(!main)return;
    main.classList.toggle('is-classic-view');
    const h=main.querySelector('h2'); if(h)h.textContent=main.classList.contains('is-classic-view')?'Ikony ovládacích panelů':'Vyberte kategorii úkolů';
  });
  document.getElementById('cpWindowsUpdate')?.addEventListener('click',()=>{openWindow('internetExplorerWindow');setTimeout(()=>{const a=document.getElementById('ieAddress');if(a){a.value='http://windowsupdate.microsoft.com';a.dispatchEvent(new Event('change'));}document.getElementById('ieGo')?.click();},60);});
  document.getElementById('cpHelpCenter')?.addEventListener('click',()=>{openWindow('searchWindow');setTimeout(()=>{const i=document.getElementById('xpSearchInput');if(i){i.value='Nápověda';i.dispatchEvent(new Event('input'));}},50);});
  document.getElementById('cpPerformance')?.addEventListener('click',()=>{openWindow('taskManagerWindow');setTimeout(()=>document.querySelector('[data-task-tab="performance"]')?.click(),40);});
  document.getElementById('cpPrograms')?.addEventListener('click',()=>{openWindow('taskManagerWindow');setTimeout(()=>document.querySelector('[data-task-tab="apps"]')?.click(),40);});
  document.getElementById('cpUsers')?.addEventListener('click',()=>{openWindow('taskManagerWindow');setTimeout(()=>document.querySelector('[data-task-tab="users"]')?.click(),40);});
  document.getElementById('cpSounds')?.addEventListener('click',()=>{if(cpSettingsPopover)cpSettingsPopover.hidden=false;setTimeout(()=>cpVolume?.focus(),20);});
  document.getElementById('cpAccessibility')?.addEventListener('click',()=>openWindow('displayPropertiesWindow'));
  document.getElementById('cpSecurity')?.addEventListener('click',()=>openWindow('systemPropertiesWindow'));
  document.getElementById('cpPrinters')?.addEventListener('click',()=>alert('Tiskárny a faxy\n\nNebyly nalezeny žádné tiskárny.'));
  document.getElementById('cpRegional')?.addEventListener('click',()=>alert('Místní a jazykové nastavení\n\nČeština (Česká republika)'));

  /* ---------------- Search ---------------- */
  const xpSearchInput=document.getElementById('xpSearchInput'),xpSearchResults=document.getElementById('xpSearchResults');
  const xpSearchItems=[
    ['Hanz Garage','mascotWindow'],['Hledání min','minesweeperWindow'],['Solitaire','solitaireWindow'],['Malování','paintWindow'],['Poznámkový blok','notepadWindow'],['Kalkulačka','calculatorWindow'],['Tento počítač','computerWindow'],['Správce úloh','taskManagerWindow'],['Windows Media Player','mediaPlayerWindow'],['Internet Explorer','internetExplorerWindow'],['Příkazový řádek','cmdWindow'],['Ovládací panely','controlPanelWindow'],['Koš','recycleBinWindow'],['Zobrazení – vlastnosti','displayPropertiesWindow'],['Vlastnosti systému','systemPropertiesWindow'],['Hanz Garage Centrum','hanzCenterWindow'],['Záznam zvuku','soundRecorderWindow'],['Moje dokumenty','documentsWindow'],['Had','snakeWindow'],['Archiv','archiveWindow'],['Rádio KISS','mediaPlayerWindow'],['Spustit','runDialogWindow'],['YouTube','https://www.youtube.com/@Nachtfahrer_podcast'],['HeroHero','https://herohero.co/nachtfahrer'],['Patreon','https://www.patreon.com/Nachtfahrer']
  ];
  function xpRunSearch(){
    const q=(xpSearchInput?.value||'').trim().toLocaleLowerCase('cs-CZ');xpSearchResults.innerHTML='';const results=xpSearchItems.filter(([n])=>!q||n.toLocaleLowerCase('cs-CZ').includes(q));
    results.forEach(([name,target])=>{const b=document.createElement('button');b.type='button';b.textContent=name;b.addEventListener('click',()=>{if(/^https?:/.test(target))window.open(target,'_blank','noopener,noreferrer');else openWindow(target);});xpSearchResults.appendChild(b);});if(!results.length)xpSearchResults.textContent='Nebyly nalezeny žádné položky.';
  }
  document.getElementById('xpSearchButton')?.addEventListener('click',xpRunSearch);xpSearchInput?.addEventListener('input',xpRunSearch);xpRunSearch();


  /* ---------------- Task Manager, Run and tray utilities ---------------- */
  const taskMgrList=document.getElementById('taskMgrList');
  const taskMgrProcessList=document.getElementById('taskMgrProcessList');
  const taskMgrMenuPopup=document.getElementById('taskMgrMenuPopup');
  let taskMgrSelected=null,taskMgrSelectedProcess=null,taskMgrSelectedUser='Hanz';
  let taskPerfHistory=Array(90).fill(8),taskMemHistory=Array(90).fill(25),taskNetworkHistory=Array(90).fill(0);
  let taskPerfInterval=null,taskRefreshMs=1000,taskUpdatePaused=false,taskAlwaysOnTop=false,taskMinimizeOnUse=false,taskHideWhenMinimized=false;
  let processSort={key:'name',dir:1},taskNetworkSent=128,taskNetworkReceived=384,taskPeakCommit=1200;
  const killedProcesses=new Set();
  const processSeed=[
    {id:'system-idle',name:'System Idle Process',user:'SYSTEM',cpu:76,memory:16,protected:true},
    {id:'system',name:'System',user:'SYSTEM',cpu:1,memory:236,protected:true},
    {id:'smss',name:'smss.exe',user:'SYSTEM',cpu:0,memory:420,protected:true},
    {id:'csrss',name:'csrss.exe',user:'SYSTEM',cpu:0,memory:4832,protected:true},
    {id:'winlogon',name:'winlogon.exe',user:'SYSTEM',cpu:0,memory:2876,protected:true},
    {id:'services',name:'services.exe',user:'SYSTEM',cpu:0,memory:4420,protected:true},
    {id:'lsass',name:'lsass.exe',user:'SYSTEM',cpu:0,memory:5916,protected:true},
    {id:'svchost1',name:'svchost.exe',user:'SYSTEM',cpu:0,memory:12600},
    {id:'svchost2',name:'svchost.exe',user:'NETWORK SERVICE',cpu:0,memory:8340},
    {id:'svchost3',name:'svchost.exe',user:'LOCAL SERVICE',cpu:0,memory:6672},
    {id:'explorer',name:'explorer.exe',user:'Hanz',cpu:1,memory:18640,protected:true},
    {id:'ctfmon',name:'ctfmon.exe',user:'Hanz',cpu:0,memory:2432},
    {id:'alg',name:'alg.exe',user:'LOCAL SERVICE',cpu:0,memory:1780},
    {id:'spoolsv',name:'spoolsv.exe',user:'SYSTEM',cpu:0,memory:4112}
  ];
  const windowProcessNames={
    mascotWindow:'hanz.exe',minesweeperWindow:'winmine.exe',solitaireWindow:'sol.exe',paintWindow:'mspaint.exe',notepadWindow:'notepad.exe',calculatorWindow:'calc.exe',computerWindow:'explorer.exe',taskManagerWindow:'taskmgr.exe',runDialogWindow:'rundll32.exe',mediaPlayerWindow:'wmplayer.exe',internetExplorerWindow:'iexplore.exe',cmdWindow:'cmd.exe',controlPanelWindow:'control.exe',searchWindow:'srchasst.exe',recycleBinWindow:'explorer.exe',displayPropertiesWindow:'desk.cpl',systemPropertiesWindow:'sysdm.cpl',hanzCenterWindow:'hanzcenter.exe'
  };
  const processMemBase={hanz:24600,winmine:6240,sol:7350,mspaint:15420,notepad:3780,calc:4450,explorer:18640,taskmgr:12100,rundll32:3840,wmplayer:28200,iexplore:33600,cmd:2640,control:9870,srchasst:7240,desk:4880,sysdm:5320,hanzcenter:8960};

  function getTaskProcesses(){
    const dynamic=xpWindows.filter(w=>w.classList.contains('is-open')).map((w,i)=>{
      const name=windowProcessNames[w.id]||`${w.id.replace(/Window$/,'').toLowerCase()}.exe`;
      const stem=name.split('.')[0];
      return {id:`win:${w.id}`,name,user:'Hanz',cpu:Math.max(0,Math.round((+w.dataset.taskCpu||0)+(Math.random()>.68?Math.random()*3:0))),memory:Math.round((processMemBase[stem]||7200)+(i*137)+(Math.random()*480)),windowId:w.id,protected:w.id==='taskManagerWindow'};
    });
    const all=[...processSeed.filter(p=>!killedProcesses.has(p.id)),...dynamic];
    const seen=new Set();
    return all.filter(p=>{const key=p.id.startsWith('win:')?p.id:`${p.name}:${p.user}`;if(seen.has(key))return false;seen.add(key);return true;});
  }
  function taskFormatMemory(kb){return `${Math.max(1,Math.round(kb)).toLocaleString('cs-CZ')} kB`;}
  function refreshTaskManagerUI(){
    if(!taskMgrList)return;
    const open=xpWindows.filter(w=>w.classList.contains('is-open'));
    taskMgrList.innerHTML='';
    open.forEach(w=>{
      const row=document.createElement('button');row.type='button';row.className='taskmgr-row'+(taskMgrSelected===w.id?' is-selected':'');row.dataset.taskWindow=w.id;
      const icon=w.dataset.icon?`<img src="${w.dataset.icon}" alt="" />`:'<span class="taskmgr-fallback-icon">▣</span>';
      row.innerHTML=`${icon}<span>${w.dataset.title||w.id}</span><em>${w.classList.contains('is-minimized')?'Minimalizováno':'Spuštěno'}</em>`;
      row.addEventListener('click',()=>{taskMgrSelected=w.id;refreshTaskManagerUI();});
      row.addEventListener('dblclick',()=>taskMgrSwitchToSelected());
      taskMgrList.appendChild(row);
    });
    if(taskMgrSelected&&!open.some(w=>w.id===taskMgrSelected))taskMgrSelected=null;
    refreshTaskProcesses();
    updateTaskStatus();
  }
  function taskMgrSwitchToSelected(){
    const w=document.getElementById(taskMgrSelected);if(!w)return;
    w.classList.remove('is-minimized');w.setAttribute('aria-hidden','false');focusWindow(w);
    if(taskMinimizeOnUse)minimizeWindow(document.getElementById('taskManagerWindow'));
  }
  function refreshTaskProcesses(){
    if(!taskMgrProcessList)return;
    const showAll=document.getElementById('taskMgrShowAll')?.checked;
    let rows=getTaskProcesses().filter(p=>showAll||p.user==='Hanz');
    const {key,dir}=processSort;
    rows.sort((a,b)=>{
      const av=key==='memory'||key==='cpu'?a[key]:String(a[key]||'').toLocaleLowerCase('cs-CZ');
      const bv=key==='memory'||key==='cpu'?b[key]:String(b[key]||'').toLocaleLowerCase('cs-CZ');
      return (av>bv?1:av<bv?-1:0)*dir;
    });
    taskMgrProcessList.innerHTML='';
    rows.forEach(p=>{
      const row=document.createElement('button');row.type='button';row.className='taskmgr-process-row'+(taskMgrSelectedProcess===p.id?' is-selected':'');row.dataset.processId=p.id;
      row.innerHTML=`<span>${p.name}</span><span>${p.user}</span><span>${String(p.cpu).padStart(2,'0')}</span><span>${taskFormatMemory(p.memory)}</span>`;
      row.title=p.protected?'Systémový proces':p.windowId?'Proces otevřené aplikace':'';
      row.addEventListener('click',()=>{taskMgrSelectedProcess=p.id;refreshTaskProcesses();});
      row.addEventListener('dblclick',()=>{if(p.windowId){taskMgrSelected=p.windowId;taskMgrSwitchToSelected();}});
      taskMgrProcessList.appendChild(row);
    });
    const count=document.getElementById('taskProcessCount');if(count)count.textContent=String(getTaskProcesses().length);
  }
  function endSelectedTask(){
    const w=document.getElementById(taskMgrSelected);if(!w)return;
    if(w.id==='taskManagerWindow'){alert('Správce úloh nemůže ukončit sám sebe tímto tlačítkem. Použij křížek vpravo nahoře.');return;}
    closeWindow(w);
  }
  function endSelectedProcess(){
    if(!taskMgrSelectedProcess)return;
    const p=getTaskProcesses().find(x=>x.id===taskMgrSelectedProcess);if(!p)return;
    if(p.protected){alert(`Proces ${p.name} je kritický systémový proces a nelze ho v této simulaci ukončit.`);return;}
    if(p.windowId){const w=document.getElementById(p.windowId);if(w)closeWindow(w);}else killedProcesses.add(p.id);
    taskMgrSelectedProcess=null;refreshTaskManagerUI();
  }
  function updateTaskStatus(cpu=0,mem=0){
    const processes=getTaskProcesses();
    const a=document.getElementById('taskMgrStatus'),b=document.getElementById('taskMgrCpuStatus'),c=document.getElementById('taskMgrMemStatus');
    if(a)a.textContent=`Procesy: ${processes.length}`;if(b)b.textContent=`Využití CPU: ${cpu} %`;if(c)c.textContent=`Využití paměti: ${mem} MB / 4096 MB`;
  }
  function drawXpGraph(canvas,history,line='#00ff39'){
    const ctx=canvas?.getContext('2d');if(!ctx||!canvas)return;const w=canvas.width,h=canvas.height;
    ctx.fillStyle='#001600';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#084b08';ctx.lineWidth=1;
    for(let x=0;x<w;x+=Math.max(12,w/12)){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
    for(let y=0;y<h;y+=Math.max(12,h/6)){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    ctx.strokeStyle=line;ctx.lineWidth=1.5;ctx.beginPath();history.forEach((v,i)=>{const x=i/(history.length-1)*w,y=h-(Math.max(0,Math.min(100,v))/100*h);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
  }
  function drawXpGauge(canvas,value){
    const ctx=canvas?.getContext('2d');if(!ctx||!canvas)return;const w=canvas.width,h=canvas.height;ctx.fillStyle='#001600';ctx.fillRect(0,0,w,h);ctx.strokeStyle='#084b08';ctx.lineWidth=1;
    for(let x=0;x<w;x+=10){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}for(let y=0;y<h;y+=10){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
    ctx.fillStyle='#00ff39';const bh=Math.max(1,(value/100)*(h-4));ctx.fillRect(3,h-2-bh,w-6,bh);
  }
  function updateTaskPerformance(){
    if(taskUpdatePaused)return;
    const open=xpWindows.filter(w=>w.classList.contains('is-open')).length;
    const base=7+open*3;const previous=taskPerfHistory.at(-1)||8;const cpu=Math.max(1,Math.min(94,Math.round(previous*.55+base*.25+Math.random()*18)));
    const mem=Math.max(420,Math.min(3600,Math.round(610+open*118+Math.random()*80)));const memPct=Math.round(mem/4096*100);
    taskPeakCommit=Math.max(taskPeakCommit,mem);taskPerfHistory.push(cpu);taskPerfHistory.shift();taskMemHistory.push(memPct);taskMemHistory.shift();
    drawXpGraph(document.getElementById('taskMgrGraph'),taskPerfHistory);drawXpGraph(document.getElementById('taskMgrMemGraph'),taskMemHistory);
    drawXpGauge(document.getElementById('taskCpuGauge'),cpu);drawXpGauge(document.getElementById('taskPageGauge'),memPct);
    const ct=document.getElementById('taskCpuText'),mt=document.getElementById('taskMemText');if(ct)ct.textContent=`${cpu} %`;if(mt)mt.textContent=`${mem} MB`;
    const handles=document.getElementById('taskHandles'),threads=document.getElementById('taskThreads'),avail=document.getElementById('taskAvailableMem'),cache=document.getElementById('taskCacheMem'),commit=document.getElementById('taskCommitTotal'),peak=document.getElementById('taskCommitPeak');
    const processCount=getTaskProcesses().length;if(handles)handles.textContent=String(7600+processCount*91);if(threads)threads.textContent=String(320+processCount*9);if(avail)avail.textContent=String(Math.max(0,4096-mem));if(cache)cache.textContent=String(Math.round(760+Math.random()*310));if(commit)commit.textContent=String(mem);if(peak)peak.textContent=String(taskPeakCommit);
    const netPrev=taskNetworkHistory.at(-1)||0,net=Math.max(.1,Math.min(42,netPrev*.55+Math.random()*8));taskNetworkHistory.push(net);taskNetworkHistory.shift();taskNetworkSent+=net*.8;taskNetworkReceived+=net*2.4;drawXpGraph(document.getElementById('taskMgrNetworkGraph'),taskNetworkHistory,'#00ff39');
    const nu=document.getElementById('taskNetworkUse'),ns=document.getElementById('taskNetworkSent'),nr=document.getElementById('taskNetworkReceived');if(nu)nu.textContent=`${net.toFixed(1).replace('.',',')} %`;if(ns)ns.textContent=`${Math.round(taskNetworkSent).toLocaleString('cs-CZ')} KB`;if(nr)nr.textContent=`${Math.round(taskNetworkReceived).toLocaleString('cs-CZ')} KB`;
    refreshTaskProcesses();updateTaskStatus(cpu,mem);
  }
  function setTaskRefresh(ms){taskRefreshMs=ms;clearInterval(taskPerfInterval);if(ms>0)taskPerfInterval=setInterval(updateTaskPerformance,ms);taskUpdatePaused=ms===0;if(!taskUpdatePaused)updateTaskPerformance();}

  document.querySelectorAll('[data-task-tab]').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('[data-task-tab]').forEach(x=>x.classList.toggle('is-active',x===btn));
    document.querySelectorAll('[data-task-panel]').forEach(p=>p.classList.toggle('is-active',p.dataset.taskPanel===btn.dataset.taskTab));
    if(btn.dataset.taskTab==='processes')refreshTaskProcesses();if(btn.dataset.taskTab==='performance'||btn.dataset.taskTab==='network')updateTaskPerformance();
  }));
  document.getElementById('taskMgrEnd')?.addEventListener('click',endSelectedTask);
  document.getElementById('taskMgrSwitch')?.addEventListener('click',taskMgrSwitchToSelected);
  document.getElementById('taskMgrNew')?.addEventListener('click',()=>openWindow('runDialogWindow'));
  document.getElementById('taskMgrEndProcess')?.addEventListener('click',endSelectedProcess);
  document.getElementById('taskMgrRefreshProcesses')?.addEventListener('click',refreshTaskProcesses);
  document.getElementById('taskMgrShowAll')?.addEventListener('change',refreshTaskProcesses);
  document.querySelectorAll('[data-process-sort]').forEach(btn=>btn.addEventListener('click',()=>{const key=btn.dataset.processSort;if(processSort.key===key)processSort.dir*=-1;else processSort={key,dir:1};refreshTaskProcesses();}));

  document.querySelectorAll('.taskmgr-user-row').forEach(row=>row.addEventListener('click',()=>{taskMgrSelectedUser=row.dataset.user;document.querySelectorAll('.taskmgr-user-row').forEach(r=>r.classList.toggle('is-selected',r===row));}));
  document.getElementById('taskMgrDisconnectUser')?.addEventListener('click',()=>{
    const row=document.querySelector(`.taskmgr-user-row[data-user="${taskMgrSelectedUser}"]`);if(!row)return;const cells=row.querySelectorAll('span');if(taskMgrSelectedUser==='Hanz'){if(!confirm('Odpojit aktivního uživatele Hanz?'))return;}if(cells[2])cells[2].textContent='Odpojeno';
  });
  document.getElementById('taskMgrLogoffUser')?.addEventListener('click',()=>{
    if(taskMgrSelectedUser==='Hanz'){if(confirm('Odhlásit uživatele Hanz?'))document.getElementById('logoffButton')?.click();return;}
    const row=document.querySelector('.taskmgr-user-row[data-user="Guest"]');if(row){row.remove();taskMgrSelectedUser='Hanz';document.querySelector('.taskmgr-user-row[data-user="Hanz"]')?.classList.add('is-selected');}
  });
  document.getElementById('taskMgrMessageUser')?.addEventListener('click',()=>{const msg=prompt(`Zpráva pro uživatele ${taskMgrSelectedUser}:`,'Ahoj!');if(msg!==null)alert(`Zpráva byla odeslána uživateli ${taskMgrSelectedUser}.\n\n${msg}`);});

  function closeTaskMgrMenu(){taskMgrMenuPopup?.classList.remove('is-open');taskMgrMenuPopup?.setAttribute('aria-hidden','true');}
  const taskMenus={
    file:[['Nová úloha (Spustit…)',()=>openWindow('runDialogWindow')],['divider'],['Ukončit Správce úloh',()=>closeWindow(document.getElementById('taskManagerWindow'))]],
    options:[['Vždy navrchu',()=>{taskAlwaysOnTop=!taskAlwaysOnTop;const w=document.getElementById('taskManagerWindow');if(w){w.dataset.alwaysOnTop=taskAlwaysOnTop?'1':'0';if(taskAlwaysOnTop)w.style.zIndex='120';}},{checked:()=>taskAlwaysOnTop}],['Minimalizovat při použití',()=>taskMinimizeOnUse=!taskMinimizeOnUse,{checked:()=>taskMinimizeOnUse}],['Skrýt při minimalizaci',()=>taskHideWhenMinimized=!taskHideWhenMinimized,{checked:()=>taskHideWhenMinimized}]],
    view:[['Aktualizovat nyní',()=>{refreshTaskManagerUI();updateTaskPerformance();}],['divider'],['Rychlost aktualizace: Vysoká',()=>setTaskRefresh(500),{checked:()=>taskRefreshMs===500}],['Rychlost aktualizace: Normální',()=>setTaskRefresh(1000),{checked:()=>taskRefreshMs===1000}],['Rychlost aktualizace: Nízká',()=>setTaskRefresh(2500),{checked:()=>taskRefreshMs===2500}],['Pozastaveno',()=>setTaskRefresh(0),{checked:()=>taskRefreshMs===0}]],
    windows:[['Minimalizovat aktivní okno',()=>{const w=xpWindows.find(w=>w.classList.contains('is-active-window')&&w.id!=='taskManagerWindow');if(w)minimizeWindow(w);}],['Maximalizovat aktivní okno',()=>{const w=xpWindows.find(w=>w.classList.contains('is-active-window')&&w.id!=='taskManagerWindow');if(w)maximizeWindow(w);}],['Kaskádovitě',()=>{let i=0;xpWindows.filter(w=>w.classList.contains('is-open')&&w.id!=='taskManagerWindow').forEach(w=>{w.classList.remove('is-maximized','is-minimized');w.style.left=`${30+i*24}px`;w.style.top=`${42+i*24}px`;w.style.width=`${Math.min(Number(w.dataset.width)||520,window.innerWidth-80)}px`;w.style.height=`${Math.min(Number(w.dataset.height)||420,window.innerHeight-110)}px`;i=(i+1)%7;});}]],
    shutdown:[['Odhlásit Hanz',()=>document.getElementById('logoffButton')?.click()],['Restartovat',()=>{systemOverlayText.textContent='Systém Hanz Garage se restartuje…';systemOverlay.classList.add('is-open');setTimeout(()=>systemOverlay.click(),900);}],['Vypnout počítač',()=>document.getElementById('shutdownButton')?.click()]],
    help:[['Témata nápovědy',()=>alert('Správce úloh systému Windows\n\nAplikace: přepnutí a ukončení oken.\nProcesy: sledování a ukončení procesů.\nVýkon: CPU a paměť v reálném čase.\nSítě: aktivita síťového adaptéru.\nUživatelé: práce s relacemi Hanz a Guest.')],['O programu Správce úloh',()=>alert('Správce úloh systému Windows\nHanz Garage XP Professional\nVerze 5.1.2600 – Garage Edition')]]
  };
  function openTaskMgrMenu(name,anchor){
    if(!taskMgrMenuPopup)return;taskMgrMenuPopup.innerHTML='';const items=taskMenus[name]||[];
    items.forEach(item=>{if(item[0]==='divider'){const d=document.createElement('div');d.className='menu-divider';taskMgrMenuPopup.appendChild(d);return;}const [label,fn,opt]=item,b=document.createElement('button');b.type='button';b.textContent=label;if(opt?.checked?.())b.classList.add('is-checked');b.addEventListener('click',()=>{closeTaskMgrMenu();fn();});taskMgrMenuPopup.appendChild(b);});
    const win=document.getElementById('taskManagerWindow'),wr=win.getBoundingClientRect(),ar=anchor.getBoundingClientRect();taskMgrMenuPopup.style.left=`${Math.max(2,ar.left-wr.left)}px`;taskMgrMenuPopup.style.top=`${ar.bottom-wr.top}px`;taskMgrMenuPopup.classList.add('is-open');taskMgrMenuPopup.setAttribute('aria-hidden','false');
  }
  document.querySelectorAll('[data-task-menu]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();const was=taskMgrMenuPopup?.classList.contains('is-open')&&taskMgrMenuPopup.dataset.menu===b.dataset.taskMenu;closeTaskMgrMenu();if(!was){taskMgrMenuPopup.dataset.menu=b.dataset.taskMenu;openTaskMgrMenu(b.dataset.taskMenu,b);}}));
  document.getElementById('taskManagerWindow')?.addEventListener('pointerdown',e=>{if(!e.target.closest('.taskmgr-menu-popup,[data-task-menu]'))closeTaskMgrMenu();});

  setTaskRefresh(1000);refreshTaskManagerUI();

  const runCommand=document.getElementById('runCommand');
  const runMap={sol:'solitaireWindow',solitaire:'solitaireWindow',winmine:'minesweeperWindow',minesweeper:'minesweeperWindow',mspaint:'paintWindow',paint:'paintWindow',notepad:'notepadWindow',calc:'calculatorWindow',calculator:'calculatorWindow',wmplayer:'mediaPlayerWindow',taskmgr:'taskManagerWindow',explorer:'computerWindow','tento počítač':'computerWindow',cmd:'cmdWindow','cmd.exe':'cmdWindow',iexplore:'internetExplorerWindow','iexplore.exe':'internetExplorerWindow',internet:'internetExplorerWindow',control:'controlPanelWindow','control.exe':'controlPanelWindow',search:'searchWindow',recycle:'recycleBinWindow',hanzcenter:'hanzCenterWindow',center:'hanzCenterWindow',soundrec:'soundRecorderWindow',sndrec32:'soundRecorderWindow',documents:'documentsWindow',docs:'documentsWindow',snake:'snakeWindow',had:'snakeWindow','desk.cpl':'displayPropertiesWindow','sysdm.cpl':'systemPropertiesWindow',sysdm:'systemPropertiesWindow'};
  function executeRun(){const cmd=(runCommand?.value||'').trim();if(!cmd)return;const key=cmd.toLocaleLowerCase('cs-CZ');if(key==='radio'||key==='kiss'){closeWindow(document.getElementById('runDialogWindow'));openWindow('mediaPlayerWindow');connectWmpKiss(true,0);}else if(key==='screensaver'||key==='dvd'){closeWindow(document.getElementById('runDialogWindow'));startScreensaver();}else if(runMap[key]){closeWindow(document.getElementById('runDialogWindow'));openWindow(runMap[key]);}else if(/^https?:\/\//i.test(cmd)){window.open(cmd,'_blank','noopener,noreferrer');closeWindow(document.getElementById('runDialogWindow'));}else alert(`Systém Windows nemůže najít soubor „${cmd}“.`);}
  document.getElementById('runOk')?.addEventListener('click',executeRun);runCommand?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();executeRun();}});document.getElementById('runCancel')?.addEventListener('click',()=>closeWindow(document.getElementById('runDialogWindow')));document.getElementById('runBrowse')?.addEventListener('click',()=>{closeWindow(document.getElementById('runDialogWindow'));openWindow('computerWindow');});

  const volumePopup=document.getElementById('volumePopup'),calendarPopup=document.getElementById('calendarPopup'),mediaTrayPopup=document.getElementById('mediaTrayPopup'),systemVolume=document.getElementById('systemVolume'),systemMute=document.getElementById('systemMute');
  function closeTrayPopups(){[volumePopup,calendarPopup,mediaTrayPopup].forEach(p=>{p?.classList.remove('is-open');p?.setAttribute('aria-hidden','true');});}
  function updateMediaExtras(stateMessage=''){
    const playing=!!(wmpAudio&&!wmpAudio.paused&&!wmpAudio.ended), title=wmpRadioMode?'Rádio KISS':(wmpTrackTitle?.textContent||'Nachtfahrer');
    const state=stateMessage||(playing?(wmpRadioMode?'LIVE vysílání':'Přehrávání'):(wmpAudio?.currentTime>0?'Pozastaveno':'Připraveno'));
    const trayBtn=document.getElementById('trayMediaButton'),trayTitle=document.getElementById('trayMediaTitle'),trayState=document.getElementById('trayMediaState'),trayCover=document.getElementById('trayMediaCover'),trayPlay=document.getElementById('trayMediaPlay');
    if(trayBtn){trayBtn.classList.toggle('is-playing',playing);trayBtn.title=`${title} — ${state}`;}if(trayTitle)trayTitle.textContent=title;if(trayState)trayState.textContent=state;if(trayCover)trayCover.src=wmpCurrentCover||WMP_COVER_GENERIC;if(trayPlay)trayPlay.textContent=playing?'Ⅱ':'▶';
    const cm=document.getElementById('centerMedia'),cms=document.getElementById('centerMediaState');if(cm)cm.textContent=title;if(cms)cms.textContent=state.toLocaleLowerCase('cs-CZ');
  }
  document.getElementById('trayVolumeButton')?.addEventListener('click',e=>{e.stopPropagation();const open=!volumePopup.classList.contains('is-open');closeTrayPopups();if(open){volumePopup.classList.add('is-open');volumePopup.setAttribute('aria-hidden','false');}});
  document.getElementById('trayMediaButton')?.addEventListener('click',e=>{e.stopPropagation();const open=!mediaTrayPopup?.classList.contains('is-open');closeTrayPopups();if(open&&mediaTrayPopup){updateMediaExtras();mediaTrayPopup.classList.add('is-open');mediaTrayPopup.setAttribute('aria-hidden','false');}});
  mediaTrayPopup?.addEventListener('pointerdown',e=>e.stopPropagation());
  document.getElementById('trayMediaPlay')?.addEventListener('click',()=>toggleWmpPlayback());
  document.getElementById('trayNachtfahrer')?.addEventListener('click',()=>{setWmpCurrentRow(wmpBuiltInTrack);loadWmpSource(WMP_DEFAULT_TRACK,'Nachtfahrer.mp3',true);});
  document.getElementById('trayKiss')?.addEventListener('click',()=>connectWmpKiss(true,0));
  document.getElementById('trayOpenWmp')?.addEventListener('click',()=>{openWindow('mediaPlayerWindow');closeTrayPopups();});
  function applySystemVolume(){const v=(+systemVolume.value||0)/100,m=systemMute.checked;[startupAudio,wmpAudio].forEach(a=>{if(a){a.muted=m;a.volume=Math.min(1,v);}});if(wmpVolume)wmpVolume.value=String(Math.round(v*100));document.getElementById('trayVolumeButton').textContent=m||v===0?'🔇':v<.45?'🔉':'🔊';}
  systemVolume?.addEventListener('input',applySystemVolume);systemMute?.addEventListener('change',applySystemVolume);
  let calendarDate=new Date();
  function renderCalendar(){const y=calendarDate.getFullYear(),m=calendarDate.getMonth(),today=new Date(),title=document.getElementById('calendarTitle'),grid=document.getElementById('calendarGrid');if(title)title.textContent=new Intl.DateTimeFormat('cs-CZ',{month:'long',year:'numeric'}).format(calendarDate);if(!grid)return;grid.innerHTML='';['Po','Út','St','Čt','Pá','So','Ne'].forEach(d=>{const x=document.createElement('b');x.textContent=d;grid.appendChild(x);});const first=new Date(y,m,1),offset=(first.getDay()+6)%7,days=new Date(y,m+1,0).getDate();for(let i=0;i<offset;i++)grid.appendChild(document.createElement('span'));for(let d=1;d<=days;d++){const x=document.createElement('button');x.type='button';x.textContent=String(d);if(today.getFullYear()===y&&today.getMonth()===m&&today.getDate()===d)x.classList.add('is-today');grid.appendChild(x);}}
  document.getElementById('trayClockButton')?.addEventListener('click',e=>{e.stopPropagation();const open=!calendarPopup.classList.contains('is-open');closeTrayPopups();if(open){calendarDate=new Date();renderCalendar();calendarPopup.classList.add('is-open');calendarPopup.setAttribute('aria-hidden','false');}});document.getElementById('calendarPrev')?.addEventListener('click',()=>{calendarDate.setMonth(calendarDate.getMonth()-1);renderCalendar();});document.getElementById('calendarNext')?.addEventListener('click',()=>{calendarDate.setMonth(calendarDate.getMonth()+1);renderCalendar();});document.getElementById('calendarToday')?.addEventListener('click',()=>{calendarDate=new Date();renderCalendar();});
  document.addEventListener('pointerdown',e=>{if(!e.target.closest('.tray,.tray-popup'))closeTrayPopups();});
  updateMediaExtras();

  /* ---------------- Extended XP shell features ---------------- */
  const recycleList=document.getElementById('recycleList'),recycleStatus=document.getElementById('recycleStatus'),recycleEmptyState=document.getElementById('recycleEmptyState'),recycleSelectionStatus=document.getElementById('recycleSelectionStatus');
  const RECYCLE_STORAGE='hanzRecycleBinV2',RECYCLE_DELETED_STORAGE='hanzRecycleDeletedDesktopV1';
  const recycleDefaults=[
    {id:'old-logo',name:'stare-logo.png',location:'C:\\Documents and Settings\\Hanz\\Obrázky',date:'13. 8. 2026 18:42',icon:'./assets/paint-icon-norm.png',kind:'file'},
    {id:'notes',name:'napad-na-web.txt',location:'C:\\Documents and Settings\\Hanz\\Dokumenty',date:'13. 8. 2026 19:06',icon:'./assets/notepad-icon-norm.png',kind:'file'},
    {id:'temp',name:'setup-old.tmp',location:'C:\\WINDOWS\\Temp',date:'13. 8. 2026 20:11',icon:'./assets/system-icon.svg',kind:'file'}
  ];
  let recycleItems=[...recycleDefaults],recycleSelectedIds=new Set(),permanentlyDeletedDesktopKeys=new Set();
  try{const saved=JSON.parse(localStorage.getItem(RECYCLE_STORAGE)||'null');if(Array.isArray(saved))recycleItems=saved;}catch{}
  try{const saved=JSON.parse(localStorage.getItem(RECYCLE_DELETED_STORAGE)||'[]');if(Array.isArray(saved))permanentlyDeletedDesktopKeys=new Set(saved);}catch{}

  function desktopShortcutKeyFromElement(icon){return icon?.dataset?.app||icon?.dataset?.url||icon?.id||icon?.querySelector('span:last-child')?.textContent?.trim()||'';}
  function findDesktopShortcutByKey(key){return [...document.querySelectorAll('#desktopShortcuts .desktop-shortcut')].find(icon=>desktopShortcutKeyFromElement(icon)===key)||null;}
  function saveRecycleState(){
    try{localStorage.setItem(RECYCLE_STORAGE,JSON.stringify(recycleItems));localStorage.setItem(RECYCLE_DELETED_STORAGE,JSON.stringify([...permanentlyDeletedDesktopKeys]));}catch{}
  }
  function updateRecycleDesktopIcon(){
    const bin=document.getElementById('desktopRecycleBin');if(!bin)return;
    bin.classList.toggle('has-items',recycleItems.length>0);
    bin.title=recycleItems.length?`Koš – ${recycleItems.length} objektů`:'Koš – prázdný';
  }
  function updateRecycleControls(){
    const selected=recycleSelectedIds.size,hasItems=recycleItems.length>0;
    ['recycleRestore','recycleRestoreSide','recycleDeletePermanent','recycleDeletePermanentSide'].forEach(id=>{const b=document.getElementById(id);if(b)b.disabled=!selected;});
    ['recycleRestoreAll','recycleRestoreAllSide','recycleEmpty','recycleEmptySide','recycleSelectAll'].forEach(id=>{const b=document.getElementById(id);if(b)b.disabled=!hasItems;});
    const clear=document.getElementById('recycleClearSelection');if(clear)clear.disabled=!selected;
  }
  function renderRecycleBin(){
    if(!recycleList)return;recycleList.innerHTML='';
    recycleSelectedIds=new Set([...recycleSelectedIds].filter(id=>recycleItems.some(item=>item.id===id)));
    recycleItems.forEach(item=>{
      const row=document.createElement('button');row.type='button';row.className='recycle-row'+(recycleSelectedIds.has(item.id)?' is-selected':'');row.dataset.recycleId=item.id;row.setAttribute('role','option');row.setAttribute('aria-selected',recycleSelectedIds.has(item.id)?'true':'false');
      row.innerHTML=`<span class="recycle-name"><img src="${item.icon}" alt=""><b>${item.name}</b></span><span>${item.location}</span><span>${item.date}</span>`;
      row.addEventListener('click',e=>{if(e.ctrlKey||e.shiftKey){recycleSelectedIds.has(item.id)?recycleSelectedIds.delete(item.id):recycleSelectedIds.add(item.id);}else{recycleSelectedIds.clear();recycleSelectedIds.add(item.id);}renderRecycleBin();});
      row.addEventListener('dblclick',e=>{e.preventDefault();restoreRecycleItems([item.id]);});recycleList.appendChild(row);
    });
    if(recycleStatus){const n=recycleItems.length,label=n===1?'objekt':(n>=2&&n<=4?'objekty':'objektů');recycleStatus.textContent=`${n} ${label}`;}
    if(recycleSelectionStatus){const n=recycleSelectedIds.size;recycleSelectionStatus.textContent=n===1?'1 vybráno':`${n} vybráno`; }
    if(recycleEmptyState)recycleEmptyState.hidden=recycleItems.length>0;
    updateRecycleControls();updateRecycleDesktopIcon();
  }
  function applyRecycledDesktopState(){
    const recycledKeys=new Set(recycleItems.filter(item=>item.desktopKey).map(item=>item.desktopKey));
    document.querySelectorAll('#desktopShortcuts .desktop-shortcut').forEach(icon=>{
      if(icon.id==='desktopRecycleBin')return;
      const key=desktopShortcutKeyFromElement(icon),isRecycled=recycledKeys.has(key),isDeleted=permanentlyDeletedDesktopKeys.has(key);
      icon.classList.toggle('is-recycled',isRecycled);icon.classList.toggle('is-permanently-deleted',isDeleted);icon.hidden=isRecycled||isDeleted;
    });
  }
  function restoreRecycleItems(ids=[...recycleSelectedIds]){
    const idSet=new Set(ids),items=recycleItems.filter(item=>idSet.has(item.id));if(!items.length){showBalloon('Koš','Nejdřív vyber položku.');return;}
    const restoredIcons=[];
    items.forEach(item=>{
      if(item.desktopKey){
        const icon=findDesktopShortcutByKey(item.desktopKey);permanentlyDeletedDesktopKeys.delete(item.desktopKey);
        if(icon){icon.hidden=false;icon.classList.remove('is-recycled','is-permanently-deleted');if(Number.isFinite(item.restoreX)&&Number.isFinite(item.restoreY))setDesktopIconPosition(icon,item.restoreX,item.restoreY,{save:false,animate:false});restoredIcons.push(icon);}
      }
    });
    recycleItems=recycleItems.filter(item=>!idSet.has(item.id));recycleSelectedIds.clear();saveRecycleState();renderRecycleBin();
    if(restoredIcons.length)requestAnimationFrame(()=>snapDesktopIcons(restoredIcons,{save:true}));
    showBalloon('Koš',items.length===1?`Položka ${items[0].name} byla obnovena.`:`Obnoveno ${items.length} položek.`);
  }
  function permanentlyDeleteRecycleItems(ids=[...recycleSelectedIds],ask=true){
    const idSet=new Set(ids),items=recycleItems.filter(item=>idSet.has(item.id));if(!items.length){showBalloon('Koš','Nejdřív vyber položku.');return;}
    if(ask&&!confirm(items.length===1?`Opravdu chcete trvale odstranit ${items[0].name}?`:`Opravdu chcete trvale odstranit ${items.length} položek?`))return;
    items.forEach(item=>{if(item.desktopKey){permanentlyDeletedDesktopKeys.add(item.desktopKey);const icon=findDesktopShortcutByKey(item.desktopKey);if(icon){icon.hidden=true;icon.classList.remove('is-recycled');icon.classList.add('is-permanently-deleted');}}});
    recycleItems=recycleItems.filter(item=>!idSet.has(item.id));recycleSelectedIds.clear();saveRecycleState();renderRecycleBin();showBalloon('Koš',items.length===1?'Položka byla trvale odstraněna.':`${items.length} položek bylo trvale odstraněno.`);
  }
  function emptyRecycleBin(){
    if(!recycleItems.length)return;if(!confirm(`Opravdu chcete trvale odstranit ${recycleItems.length} položek?`))return;
    recycleItems.forEach(item=>{if(item.desktopKey){permanentlyDeletedDesktopKeys.add(item.desktopKey);const icon=findDesktopShortcutByKey(item.desktopKey);if(icon){icon.hidden=true;icon.classList.remove('is-recycled');icon.classList.add('is-permanently-deleted');}}});
    recycleItems=[];recycleSelectedIds.clear();saveRecycleState();renderRecycleBin();showBalloon('Koš','Koš byl vyprázdněn.');
  }
  function moveDesktopIconsToRecycle(icons,starts=[]){
    const startMap=new Map(starts.map(o=>[o.icon,o])),now=new Date(),date=new Intl.DateTimeFormat('cs-CZ',{dateStyle:'short',timeStyle:'short'}).format(now);let added=0;
    icons.forEach(icon=>{
      if(!icon||icon.id==='desktopRecycleBin'||icon.hidden)return;
      const desktopKey=desktopShortcutKeyFromElement(icon);if(!desktopKey||recycleItems.some(item=>item.desktopKey===desktopKey))return;
      const pos=startMap.get(icon)||{x:parseFloat(icon.style.left)||icon.offsetLeft,y:parseFloat(icon.style.top)||icon.offsetTop};
      const name=icon.querySelector('span:last-child')?.textContent?.trim()||desktopKey;const image=icon.querySelector('img');
      recycleItems.push({id:`desktop-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,name:`${name}.lnk`,location:'C:\\Documents and Settings\\Hanz\\Plocha',date,icon:image?.getAttribute('src')||'./assets/system-icon.svg',kind:'desktop-shortcut',desktopKey,restoreX:Math.round(pos.x||0),restoreY:Math.round(pos.y||0)});
      icon.classList.remove('is-selected');icon.classList.add('is-recycled');icon.hidden=true;added++;
    });
    if(!added)return false;saveRecycleState();renderRecycleBin();positionRecycleBin?.();
    const bin=document.getElementById('desktopRecycleBin');bin?.classList.add('recycle-drop-success');setTimeout(()=>bin?.classList.remove('recycle-drop-success'),520);
    showBalloon('Koš',added===1?'Položka byla přesunuta do Koše.':`${added} položek bylo přesunuto do Koše.`);return true;
  }
  document.getElementById('recycleRestore')?.addEventListener('click',()=>restoreRecycleItems());
  document.getElementById('recycleRestoreSide')?.addEventListener('click',()=>restoreRecycleItems());
  document.getElementById('recycleRestoreAll')?.addEventListener('click',()=>restoreRecycleItems(recycleItems.map(x=>x.id)));
  document.getElementById('recycleRestoreAllSide')?.addEventListener('click',()=>restoreRecycleItems(recycleItems.map(x=>x.id)));
  document.getElementById('recycleDeletePermanent')?.addEventListener('click',()=>permanentlyDeleteRecycleItems());
  document.getElementById('recycleDeletePermanentSide')?.addEventListener('click',()=>permanentlyDeleteRecycleItems());
  document.getElementById('recycleEmpty')?.addEventListener('click',emptyRecycleBin);
  document.getElementById('recycleEmptySide')?.addEventListener('click',emptyRecycleBin);
  document.getElementById('recycleSelectAll')?.addEventListener('click',()=>{recycleSelectedIds=new Set(recycleItems.map(x=>x.id));renderRecycleBin();});
  document.getElementById('recycleClearSelection')?.addEventListener('click',()=>{recycleSelectedIds.clear();renderRecycleBin();});
  recycleList?.addEventListener('keydown',e=>{
    if(e.ctrlKey&&e.key.toLowerCase()==='a'){e.preventDefault();recycleSelectedIds=new Set(recycleItems.map(x=>x.id));renderRecycleBin();}
    else if(e.key==='Delete'&&recycleSelectedIds.size){e.preventDefault();permanentlyDeleteRecycleItems();}
    else if(e.key==='Enter'&&recycleSelectedIds.size){e.preventDefault();restoreRecycleItems();}
  });
  document.getElementById('recycleEditMenu')?.addEventListener('click',()=>{recycleSelectedIds=new Set(recycleItems.map(x=>x.id));renderRecycleBin();});
  document.getElementById('recycleViewMenu')?.addEventListener('click',()=>document.getElementById('recycleBinWindow')?.classList.toggle('recycle-compact'));
  document.getElementById('recycleFileMenu')?.addEventListener('click',()=>recycleSelectedIds.size?restoreRecycleItems():showBalloon('Koš','Nejdřív vyber položku.'));
  document.getElementById('recycleHelpMenu')?.addEventListener('click',()=>alert('Koš Hanz Garage: ikony z plochy můžeš přetáhnout přímo na Koš. Ctrl+klik vybírá více položek, Ctrl+A vybere vše, Enter obnoví výběr a Delete ho odstraní trvale. Obnovit vše vrátí všechny položky; Vyprázdnit koš je odstraní natrvalo.'));
  renderRecycleBin();

  const desktopEl=document.getElementById('desktop');

  /* ---------------- XP desktop icon grid, drag + marquee selection ---------------- */
  const desktopShortcutsEl=document.getElementById('desktopShortcuts');
  const desktopRecycleBin=document.getElementById('desktopRecycleBin');
  const desktopSelectionBox=document.createElement('div');
  desktopSelectionBox.className='desktop-selection-box';
  desktopSelectionBox.setAttribute('aria-hidden','true');
  desktopEl?.appendChild(desktopSelectionBox);
  const DESKTOP_ICON_STORAGE='hanzDesktopIconPositionsV4';
  let desktopIconPositions={};
  let desktopIconSuppressClickUntil=0;
  try{desktopIconPositions=JSON.parse(localStorage.getItem(DESKTOP_ICON_STORAGE)||'{}')||{};}catch{desktopIconPositions={};}

  function desktopGridMetrics(){
    const w=desktopEl?.clientWidth||innerWidth;
    if(w<=620)return{cellW:70,cellH:70,padX:5,padY:5};
    if(w<=820)return{cellW:78,cellH:76,padX:7,padY:7};
    return{cellW:92,cellH:88,padX:10,padY:10};
  }
  function desktopIconKey(icon,index=0){return icon.dataset.app||icon.dataset.url||icon.id||`icon-${index}`;}
  function allDesktopIcons(){return [...(desktopShortcutsEl?.querySelectorAll('.desktop-shortcut')||[])];}
  function desktopIcons(){return allDesktopIcons().filter(i=>!i.hidden&&!i.classList.contains('is-recycled')&&!i.classList.contains('is-permanently-deleted'));}
  function desktopMovableIcons(){return desktopIcons().filter(i=>i!==desktopRecycleBin&&i.dataset.lockPosition!=='bottom-right');}
  function desktopCellForPoint(x,y){
    const {cellW,cellH,padX,padY}=desktopGridMetrics();
    const maxCols=Math.max(1,Math.floor(((desktopShortcutsEl?.clientWidth||innerWidth)-padX*2)/cellW));
    const maxRows=Math.max(1,Math.floor(((desktopShortcutsEl?.clientHeight||innerHeight-taskbarHeight())-padY*2)/cellH));
    return{col:Math.max(0,Math.min(maxCols-1,Math.round((x-padX)/cellW))),row:Math.max(0,Math.min(maxRows-1,Math.round((y-padY)/cellH))),maxCols,maxRows};
  }
  function desktopPointForCell(col,row){const{cellW,cellH,padX,padY}=desktopGridMetrics();return{x:padX+col*cellW,y:padY+row*cellH};}
  function clampDesktopPoint(icon,x,y){
    const w=desktopShortcutsEl?.clientWidth||innerWidth,h=desktopShortcutsEl?.clientHeight||innerHeight-taskbarHeight();
    return{x:Math.max(0,Math.min(Math.max(0,w-icon.offsetWidth),x)),y:Math.max(0,Math.min(Math.max(0,h-icon.offsetHeight),y))};
  }
  function setDesktopIconPosition(icon,x,y,{save=true,animate=true}={}){
    if(!icon)return;const p=clampDesktopPoint(icon,x,y);if(!animate)icon.style.transition='none';icon.style.left=`${Math.round(p.x)}px`;icon.style.top=`${Math.round(p.y)}px`;if(!animate)requestAnimationFrame(()=>icon.style.transition='');
    if(save&&icon!==desktopRecycleBin){const key=desktopIconKey(icon,desktopIcons().indexOf(icon));desktopIconPositions[key]={x:Math.round(p.x),y:Math.round(p.y)};try{localStorage.setItem(DESKTOP_ICON_STORAGE,JSON.stringify(desktopIconPositions));}catch{}}
  }
  function positionRecycleBin(){
    if(!desktopRecycleBin||!desktopShortcutsEl)return;const pad=8;const x=Math.max(0,desktopShortcutsEl.clientWidth-desktopRecycleBin.offsetWidth-pad);const y=Math.max(0,desktopShortcutsEl.clientHeight-desktopRecycleBin.offsetHeight-pad);setDesktopIconPosition(desktopRecycleBin,x,y,{save:false});
  }
  function nearestFreeDesktopCell(icon,x,y,occupied){
    const start=desktopCellForPoint(x,y),candidates=[];
    for(let row=0;row<start.maxRows;row++)for(let col=0;col<start.maxCols;col++)candidates.push({col,row,d:Math.abs(col-start.col)+Math.abs(row-start.row)});
    candidates.sort((a,b)=>a.d-b.d||a.col-b.col||a.row-b.row);
    const cell=candidates.find(c=>!occupied.has(`${c.col}:${c.row}`))||start;occupied.add(`${cell.col}:${cell.row}`);return desktopPointForCell(cell.col,cell.row);
  }
  function snapDesktopIcons(icons,{save=true}={}){
    const moving=new Set(icons),occupied=new Set();
    desktopMovableIcons().filter(i=>!moving.has(i)).forEach(i=>{const c=desktopCellForPoint(parseFloat(i.style.left)||0,parseFloat(i.style.top)||0);occupied.add(`${c.col}:${c.row}`);});
    icons.forEach(icon=>{if(icon===desktopRecycleBin)return;const p=nearestFreeDesktopCell(icon,parseFloat(icon.style.left)||0,parseFloat(icon.style.top)||0,occupied);setDesktopIconPosition(icon,p.x,p.y,{save});});positionRecycleBin();
  }
  function arrangeDesktopIcons(){
    const icons=desktopMovableIcons(),{cellW,cellH,padX,padY}=desktopGridMetrics(),h=desktopShortcutsEl?.clientHeight||innerHeight-taskbarHeight(),rows=Math.max(1,Math.floor((h-padY*2)/cellH));
    icons.forEach((icon,i)=>{const col=Math.floor(i/rows),row=i%rows;setDesktopIconPosition(icon,padX+col*cellW,padY+row*cellH,{save:true});});positionRecycleBin();
  }
  function restoreDesktopIconLayout(){
    if(!desktopShortcutsEl)return;const icons=desktopMovableIcons(),occupied=new Set(),{cellW,cellH,padX,padY}=desktopGridMetrics(),rows=Math.max(1,Math.floor((desktopShortcutsEl.clientHeight-padY*2)/cellH));
    icons.forEach((icon,i)=>{const key=desktopIconKey(icon,i),saved=desktopIconPositions[key];const fallback={x:padX+Math.floor(i/rows)*cellW,y:padY+(i%rows)*cellH};const raw=saved||fallback;const free=nearestFreeDesktopCell(icon,raw.x,raw.y,occupied);setDesktopIconPosition(icon,free.x,free.y,{save:false,animate:false});});positionRecycleBin();
  }
  function clearDesktopSelection(except=[]){const keep=new Set(except);desktopIcons().forEach(i=>{if(!keep.has(i))i.classList.remove('is-selected');});}
  function selectDesktopIcon(icon,additive=false){if(!additive)clearDesktopSelection();icon?.classList.add('is-selected');}

  // Suppress the click/double-click generated after a real icon drag.
  desktopShortcutsEl?.addEventListener('click',e=>{if(Date.now()<desktopIconSuppressClickUntil){e.preventDefault();e.stopImmediatePropagation();}},true);
  desktopShortcutsEl?.addEventListener('dblclick',e=>{if(Date.now()<desktopIconSuppressClickUntil){e.preventDefault();e.stopImmediatePropagation();}},true);

  desktopIcons().forEach(icon=>{
    icon.addEventListener('pointerdown',e=>{
      if(e.button!==0)return;
      const additive=e.ctrlKey||e.shiftKey;
      if(!icon.classList.contains('is-selected'))selectDesktopIcon(icon,additive);
      if(icon===desktopRecycleBin||icon.dataset.lockPosition==='bottom-right')return;
      e.stopPropagation();
      const selected=desktopIcons().filter(i=>i.classList.contains('is-selected')&&i!==desktopRecycleBin);
      const dragIcons=selected.length?selected:[icon];
      const starts=dragIcons.map(i=>({icon:i,x:parseFloat(i.style.left)||i.offsetLeft,y:parseFloat(i.style.top)||i.offsetTop}));
      const startX=e.clientX,startY=e.clientY;let moved=false;
      icon.setPointerCapture?.(e.pointerId);icon.classList.add('is-icon-dragging');dragIcons.filter(i=>i!==icon).forEach(i=>i.classList.add('is-multi-dragging'));
      const overRecycle=(clientX,clientY)=>{if(!desktopRecycleBin)return false;const r=desktopRecycleBin.getBoundingClientRect(),pad=13;return clientX>=r.left-pad&&clientX<=r.right+pad&&clientY>=r.top-pad&&clientY<=r.bottom+pad;};
      const move=ev=>{
        const dx=ev.clientX-startX,dy=ev.clientY-startY;if(!moved&&Math.hypot(dx,dy)>4)moved=true;if(!moved)return;
        starts.forEach(o=>setDesktopIconPosition(o.icon,o.x+dx,o.y+dy,{save:false,animate:false}));
        desktopRecycleBin?.classList.toggle('is-drop-target',overRecycle(ev.clientX,ev.clientY));
      };
      const end=ev=>{
        icon.releasePointerCapture?.(e.pointerId);icon.removeEventListener('pointermove',move);icon.removeEventListener('pointerup',end);icon.removeEventListener('pointercancel',end);icon.classList.remove('is-icon-dragging');dragIcons.forEach(i=>i.classList.remove('is-multi-dragging'));desktopRecycleBin?.classList.remove('is-drop-target');
        if(moved){desktopIconSuppressClickUntil=Date.now()+420;if(overRecycle(ev.clientX,ev.clientY)){if(!moveDesktopIconsToRecycle(dragIcons,starts))snapDesktopIcons(dragIcons,{save:true});}else snapDesktopIcons(dragIcons,{save:true});}
      };
      icon.addEventListener('pointermove',move);icon.addEventListener('pointerup',end);icon.addEventListener('pointercancel',end);
    });
  });

  // Classic XP rubber-band selection on empty desktop space.
  desktopEl?.addEventListener('pointerdown',e=>{
    if(e.button!==0||e.target.closest('.desktop-shortcut,.xp-window,.taskbar,.start-menu,.desktop-context-menu,.taskbar-context-menu,.tray-popup,.xp-balloon'))return;
    e.preventDefault();e.stopPropagation();closeStartMenu();closeContextMenu();closeTaskbarMenu?.();
    const additive=e.ctrlKey||e.shiftKey;if(!additive)clearDesktopSelection();const initiallySelected=new Set(desktopIcons().filter(i=>i.classList.contains('is-selected')));
    const desk=desktopEl.getBoundingClientRect(),sx=e.clientX-desk.left,sy=e.clientY-desk.top;desktopSelectionBox.style.left=`${sx}px`;desktopSelectionBox.style.top=`${sy}px`;desktopSelectionBox.style.width='0px';desktopSelectionBox.style.height='0px';desktopSelectionBox.classList.add('is-visible');desktopSelectionBox.setAttribute('aria-hidden','false');desktopEl.setPointerCapture?.(e.pointerId);
    const move=ev=>{
      const ex=Math.max(0,Math.min(desk.width,ev.clientX-desk.left)),ey=Math.max(0,Math.min(desk.height-taskbarHeight(),ev.clientY-desk.top));const left=Math.min(sx,ex),top=Math.min(sy,ey),right=Math.max(sx,ex),bottom=Math.max(sy,ey);Object.assign(desktopSelectionBox.style,{left:`${left}px`,top:`${top}px`,width:`${right-left}px`,height:`${bottom-top}px`});
      desktopIcons().forEach(icon=>{const r=icon.getBoundingClientRect(),il=r.left-desk.left,it=r.top-desk.top,ir=il+r.width,ib=it+r.height;const hit=ir>=left&&il<=right&&ib>=top&&it<=bottom;icon.classList.toggle('is-selected',hit||initiallySelected.has(icon));});
    };
    const end=ev=>{desktopEl.releasePointerCapture?.(e.pointerId);desktopEl.removeEventListener('pointermove',move);desktopEl.removeEventListener('pointerup',end);desktopEl.removeEventListener('pointercancel',end);desktopSelectionBox.classList.remove('is-visible');desktopSelectionBox.setAttribute('aria-hidden','true');};
    desktopEl.addEventListener('pointermove',move);desktopEl.addEventListener('pointerup',end);desktopEl.addEventListener('pointercancel',end);
  });

  // Ctrl+A works on the desktop when no text field/window consumes it.
  document.addEventListener('keydown',e=>{if(e.ctrlKey&&e.key.toLowerCase()==='a'&&!e.target.matches('input,textarea')&&!xpWindows.some(w=>w.classList.contains('is-active-window')&&w.classList.contains('is-open')&&!w.classList.contains('is-minimized'))){e.preventDefault();desktopIcons().forEach(i=>i.classList.add('is-selected'));}});
  document.getElementById('arrangeDesktopIcons')?.addEventListener('click',()=>{arrangeDesktopIcons();showBalloon('Plocha','Ikony byly automaticky zarovnány podle mřížky.',1600);});
  document.getElementById('desktopMoveToRecycle')?.addEventListener('click',()=>{const selected=desktopIcons().filter(i=>i!==desktopRecycleBin&&i.classList.contains('is-selected'));if(!selected.length){showBalloon('Koš','Nejdřív vyber ikonu na ploše.');closeContextMenu?.();return;}const starts=selected.map(icon=>({icon,x:parseFloat(icon.style.left)||icon.offsetLeft,y:parseFloat(icon.style.top)||icon.offsetTop}));moveDesktopIconsToRecycle(selected,starts);closeContextMenu?.();});
  document.addEventListener('keydown',e=>{if(e.key!=='Delete'||e.ctrlKey||e.altKey||e.metaKey||e.target.matches('input,textarea,select')||e.target.closest('#recycleBinWindow')||xpWindows.some(w=>w.classList.contains('is-active-window')&&w.classList.contains('is-open')&&!w.classList.contains('is-minimized')))return;const selected=desktopIcons().filter(i=>i!==desktopRecycleBin&&i.classList.contains('is-selected'));if(!selected.length)return;e.preventDefault();const starts=selected.map(icon=>({icon,x:parseFloat(icon.style.left)||icon.offsetLeft,y:parseFloat(icon.style.top)||icon.offsetTop}));moveDesktopIconsToRecycle(selected,starts);});
  applyRecycledDesktopState();
  requestAnimationFrame(restoreDesktopIconLayout);
  const wallpaperEl=document.querySelector('.wallpaper');
  const wallpaperSelect=document.getElementById('wallpaperSelect'),wallpaperPosition=document.getElementById('wallpaperPosition'),desktopPreview=document.getElementById('desktopPreview');
  const wallpaperUploadInput=document.getElementById('wallpaperUploadInput'),wallpaperUploadButton=document.getElementById('wallpaperUploadButton'),wallpaperRemoveButton=document.getElementById('wallpaperRemoveButton'),wallpaperFileName=document.getElementById('wallpaperFileName');
  const appearanceSelect=document.getElementById('appearanceSelect'),showDesktopIconsCheckbox=document.getElementById('showDesktopIcons');
  let pendingDisplay={wallpaper:'bliss',position:'cover',theme:'luna',appearance:'blue',icons:true};
  let customWallpaperObjectUrl='';
  let customWallpaperStoredName='';

  function ensureCustomWallpaperOption(name='Vlastní obrázek'){
    if(!wallpaperSelect)return;
    let option=wallpaperSelect.querySelector('option[value="custom"]');
    if(!option){option=document.createElement('option');option.value='custom';wallpaperSelect.appendChild(option);}
    option.textContent=name?`Vlastní: ${name}`:'Vlastní obrázek';
  }
  function revokeCustomWallpaperUrl(){if(customWallpaperObjectUrl?.startsWith('blob:')){try{URL.revokeObjectURL(customWallpaperObjectUrl);}catch{}}customWallpaperObjectUrl='';}
  function setCustomWallpaperBlob(blob,name='Vlastní obrázek'){
    revokeCustomWallpaperUrl();
    customWallpaperObjectUrl=URL.createObjectURL(blob);
    customWallpaperStoredName=name||'Vlastní obrázek';
    ensureCustomWallpaperOption(customWallpaperStoredName);
    if(wallpaperFileName)wallpaperFileName.textContent=customWallpaperStoredName;
    if(wallpaperRemoveButton)wallpaperRemoveButton.hidden=false;
  }
  function openWallpaperDb(){return new Promise((resolve,reject)=>{try{const req=indexedDB.open('HanzGarageXP',1);req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('settings'))db.createObjectStore('settings');};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);}catch(err){reject(err);}});}
  async function saveCustomWallpaper(file){const db=await openWallpaperDb();await new Promise((resolve,reject)=>{const tx=db.transaction('settings','readwrite');tx.objectStore('settings').put({blob:file,name:file.name,type:file.type,updated:Date.now()},'customWallpaper');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}
  async function loadCustomWallpaper(){try{const db=await openWallpaperDb();const record=await new Promise((resolve,reject)=>{const tx=db.transaction('settings','readonly');const req=tx.objectStore('settings').get('customWallpaper');req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);});db.close();if(record?.blob){setCustomWallpaperBlob(record.blob,record.name||'Vlastní obrázek');return true;}}catch(err){console.warn('Custom wallpaper load failed:',err);}return false;}
  async function deleteCustomWallpaper(){try{const db=await openWallpaperDb();await new Promise((resolve,reject)=>{const tx=db.transaction('settings','readwrite');tx.objectStore('settings').delete('customWallpaper');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);});db.close();}catch(err){console.warn('Custom wallpaper delete failed:',err);}revokeCustomWallpaperUrl();customWallpaperStoredName='';wallpaperSelect?.querySelector('option[value="custom"]')?.remove();if(wallpaperFileName)wallpaperFileName.textContent='Není vybrán žádný soubor.';if(wallpaperRemoveButton)wallpaperRemoveButton.hidden=true;}

  function setWallpaperVisual(target,wallpaper,position='cover',isPreview=false){
    if(!target)return;
    const solid={blue:'#3a6ea5',black:'#000',green:'#2e8b57'};
    const isImage=wallpaper==='bliss'||(wallpaper==='custom'&&customWallpaperObjectUrl);
    target.style.backgroundColor=solid[wallpaper]||(wallpaper==='custom'?'#5ea1e9':'#5ea1e9');
    target.style.backgroundImage=wallpaper==='bliss'?"url('./assets/xp-wallpaper.webp')":wallpaper==='custom'&&customWallpaperObjectUrl?`url("${customWallpaperObjectUrl}")`:'none';
    target.style.backgroundPosition='center';
    target.style.backgroundRepeat=position==='repeat'&&isImage?'repeat':'no-repeat';
    if(position==='repeat'&&isImage)target.style.backgroundSize=isPreview?'82px auto':'auto';
    else target.style.backgroundSize=position==='contain'?'contain':'cover';
  }
  function previewWallpaper(){if(!desktopPreview)return;const w=wallpaperSelect?.value||'bliss';setWallpaperVisual(desktopPreview,w,wallpaperPosition?.value||'cover',true);}
  function applyDisplaySettings(notify=true){
    pendingDisplay.wallpaper=wallpaperSelect?.value||'bliss';pendingDisplay.position=wallpaperPosition?.value||'cover';pendingDisplay.theme=document.getElementById('displayThemeSelect')?.value||'luna';pendingDisplay.appearance=appearanceSelect?.value||'blue';pendingDisplay.icons=showDesktopIconsCheckbox?.checked!==false;
    if(pendingDisplay.wallpaper==='custom'&&!customWallpaperObjectUrl){pendingDisplay.wallpaper='bliss';if(wallpaperSelect)wallpaperSelect.value='bliss';}
    setWallpaperVisual(wallpaperEl,pendingDisplay.wallpaper,pendingDisplay.position,false);
    desktopEl.classList.toggle('desktop-icons-hidden',!pendingDisplay.icons);desktopEl.classList.remove('theme-classic','theme-hanz','appearance-olive','appearance-silver');if(pendingDisplay.theme==='classic')desktopEl.classList.add('theme-classic');if(pendingDisplay.theme==='hanz')desktopEl.classList.add('theme-hanz');if(pendingDisplay.appearance==='olive')desktopEl.classList.add('appearance-olive');if(pendingDisplay.appearance==='silver')desktopEl.classList.add('appearance-silver');
    try{localStorage.setItem('hanzDisplaySettings',JSON.stringify(pendingDisplay));}catch{}const toggle=document.getElementById('toggleDesktopIcons');if(toggle)toggle.textContent=`Zobrazit ikony na ploše ${pendingDisplay.icons?'✓':''}`;resetSaverTimer?.();if(notify){resetSaverTimer();showBalloon('Zobrazení','Nastavení vzhledu bylo použito.');}
  }
  try{const saved=JSON.parse(localStorage.getItem('hanzDisplaySettings')||'null');if(saved){pendingDisplay={...pendingDisplay,...saved};if(wallpaperSelect&&pendingDisplay.wallpaper!=='custom')wallpaperSelect.value=pendingDisplay.wallpaper;if(wallpaperPosition)wallpaperPosition.value=pendingDisplay.position;const ts=document.getElementById('displayThemeSelect');if(ts)ts.value=pendingDisplay.theme;if(appearanceSelect)appearanceSelect.value=pendingDisplay.appearance;if(showDesktopIconsCheckbox)showDesktopIconsCheckbox.checked=pendingDisplay.icons;if(pendingDisplay.wallpaper!=='custom')applyDisplaySettings(false);}}catch{}

  wallpaperUploadButton?.addEventListener('click',()=>wallpaperUploadInput?.click());
  wallpaperUploadInput?.addEventListener('change',async()=>{
    const file=wallpaperUploadInput.files?.[0];if(!file)return;
    if(!file.type.startsWith('image/')){showBalloon('Zobrazení','Vybraný soubor není obrázek.');wallpaperUploadInput.value='';return;}
    // Náhled a použití fungují ihned; IndexedDB navíc zajistí zachování tapety po obnovení stránky.
    setCustomWallpaperBlob(file,file.name);if(wallpaperSelect)wallpaperSelect.value='custom';previewWallpaper();
    try{await saveCustomWallpaper(file);showBalloon('Zobrazení','Vlastní tapeta je připravena. Klikni na Použít nebo OK.',3200);}
    catch(err){console.warn('Wallpaper persistence failed:',err);showBalloon('Zobrazení','Tapeta funguje, ale prohlížeč ji nemusí po obnovení stránky zachovat.',3800);}
    wallpaperUploadInput.value='';
  });
  wallpaperRemoveButton?.addEventListener('click',async()=>{await deleteCustomWallpaper();if(wallpaperSelect)wallpaperSelect.value='bliss';previewWallpaper();});
  loadCustomWallpaper().then(found=>{if(found&&pendingDisplay.wallpaper==='custom'){if(wallpaperSelect)wallpaperSelect.value='custom';applyDisplaySettings(false);}else if(!found&&pendingDisplay.wallpaper==='custom'){pendingDisplay.wallpaper='bliss';if(wallpaperSelect)wallpaperSelect.value='bliss';applyDisplaySettings(false);}previewWallpaper();});

  wallpaperSelect?.addEventListener('change',previewWallpaper);wallpaperPosition?.addEventListener('change',previewWallpaper);previewWallpaper();
  document.querySelectorAll('[data-display-tab]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-display-tab]').forEach(x=>x.classList.toggle('is-active',x===b));document.querySelectorAll('[data-display-panel]').forEach(x=>x.classList.toggle('is-active',x.dataset.displayPanel===b.dataset.displayTab));}));
  document.getElementById('displayApply')?.addEventListener('click',applyDisplaySettings);document.getElementById('displayOk')?.addEventListener('click',()=>{applyDisplaySettings();closeWindow(document.getElementById('displayPropertiesWindow'));});document.getElementById('displayCancel')?.addEventListener('click',()=>{try{const saved=JSON.parse(localStorage.getItem('hanzDisplaySettings')||'null');if(saved){pendingDisplay={...pendingDisplay,...saved};if(wallpaperSelect){if(saved.wallpaper==='custom'&&customWallpaperObjectUrl){ensureCustomWallpaperOption(customWallpaperStoredName);wallpaperSelect.value='custom';}else wallpaperSelect.value=saved.wallpaper||'bliss';}if(wallpaperPosition)wallpaperPosition.value=saved.position||'cover';previewWallpaper();}}catch{}closeWindow(document.getElementById('displayPropertiesWindow'));});

  document.querySelectorAll('[data-system-tab]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-system-tab]').forEach(x=>x.classList.toggle('is-active',x===b));document.querySelectorAll('[data-system-panel]').forEach(x=>x.classList.toggle('is-active',x.dataset.systemPanel===b.dataset.systemTab));}));
  const memInfo=document.getElementById('systemMemoryInfo'),browserInfo=document.getElementById('systemBrowserInfo');if(memInfo)memInfo.textContent=`${navigator.deviceMemory?Math.round(navigator.deviceMemory*1024):4096} MB RAM`;if(browserInfo)browserInfo.textContent=navigator.userAgent.includes('Chrome')?'Chromium compatible browser':navigator.userAgent.split(')')[0]+')';
  document.getElementById('renameComputer')?.addEventListener('click',()=>{const current=document.getElementById('computerNameValue');const name=prompt('Název počítače:',current?.textContent||'HANZ-GARAGE');if(name&&current){current.textContent=name.toUpperCase().replace(/[^A-Z0-9-]/g,'-').slice(0,15);showBalloon('Systém','Název počítače byl změněn.');}});
  document.getElementById('deviceManagerButton')?.addEventListener('click',()=>{openWindow('computerWindow');showBalloon('Správce zařízení','Všechna virtuální zařízení pracují správně.');});
  document.getElementById('hardwareProfilesButton')?.addEventListener('click',()=>alert('Profil hardwaru: Hanz Garage XP – výchozí profil.'));
  document.getElementById('performanceSettingsButton')?.addEventListener('click',()=>{openWindow('taskManagerWindow');document.querySelector('[data-task-tab="performance"]')?.click();});
  document.getElementById('startupRecoveryButton')?.addEventListener('click',()=>alert('Spuštění systému: Normální\nČas zobrazení seznamu OS: 0 s\nAutomatický restart: vypnutý'));
  ['systemOk','systemCancel'].forEach(id=>document.getElementById(id)?.addEventListener('click',()=>closeWindow(document.getElementById('systemPropertiesWindow'))));document.getElementById('systemApply')?.addEventListener('click',()=>showBalloon('Systém','Nastavení systému bylo použito.'));

  /* XP notification balloons */
  const xpBalloon=document.getElementById('xpBalloon'),xpBalloonTitle=document.getElementById('xpBalloonTitle'),xpBalloonText=document.getElementById('xpBalloonText');let balloonTimer=null;
  function showBalloon(title,text,duration=4600){if(!xpBalloon)return;clearTimeout(balloonTimer);xpBalloonTitle.textContent=title;xpBalloonText.textContent=text;xpBalloon.classList.add('is-open');xpBalloon.setAttribute('aria-hidden','false');balloonTimer=setTimeout(hideBalloon,duration);}
  function hideBalloon(){xpBalloon?.classList.remove('is-open');xpBalloon?.setAttribute('aria-hidden','true');}
  document.getElementById('xpBalloonClose')?.addEventListener('click',hideBalloon);
  wmpAudio?.addEventListener('play',()=>showBalloon('Windows Media Player',`Přehrává se: ${wmpTrackTitle?.textContent||'Nachtfahrer'}`,2800));

  /* Screensaver — Hanz Garage DVD mode */
  const screensaverOverlay=document.getElementById('screensaverOverlay');let saverTimer=null,saverActive=false,saverAnimFrame=0,saverLastTs=0,saverBounceCount=0,saverHue=0;
  const saverPos={x:0,y:0},saverVel={x:110,y:78};
  function resetSaverTimer(){clearTimeout(saverTimer);if(saverActive)return;const minutes=Math.max(1,+document.getElementById('screenSaverMinutes')?.value||3);if((document.getElementById('screenSaverSelect')?.value||'hanz')!=='none')saverTimer=setTimeout(()=>startScreensaver(),minutes*60000);}
  function dvdBaseSpeed(){const mode=document.getElementById('screenSaverSpeed')?.value||'classic';return mode==='slow'?78:mode==='fast'?165:112;}
  function setSaverHue(logo,bounced=false){if(!logo)return;if(bounced&&document.getElementById('screenSaverColorShift')?.checked){saverHue=(saverHue+47)%360;logo.style.filter=`hue-rotate(${saverHue}deg) drop-shadow(0 8px 14px rgba(0,0,0,.45))`; }else if(!document.getElementById('screenSaverColorShift')?.checked){logo.style.filter='drop-shadow(0 8px 14px rgba(0,0,0,.45))';}}
  function animateHanzDvd(ts){
    if(!saverActive||!screensaverOverlay?.classList.contains('dvd-mode'))return;const logo=document.getElementById('screensaverLogo');if(!logo)return;
    const dt=Math.min(.035,Math.max(0,(ts-(saverLastTs||ts))/1000));saverLastTs=ts;const area=screensaverOverlay.getBoundingClientRect(),lr=logo.getBoundingClientRect(),maxX=Math.max(0,area.width-lr.width),maxY=Math.max(0,area.height-lr.height);
    saverPos.x+=saverVel.x*dt;saverPos.y+=saverVel.y*dt;let hitX=false,hitY=false;
    if(saverPos.x<=0){saverPos.x=0;saverVel.x=Math.abs(saverVel.x);hitX=true;}else if(saverPos.x>=maxX){saverPos.x=maxX;saverVel.x=-Math.abs(saverVel.x);hitX=true;}
    if(saverPos.y<=0){saverPos.y=0;saverVel.y=Math.abs(saverVel.y);hitY=true;}else if(saverPos.y>=maxY){saverPos.y=maxY;saverVel.y=-Math.abs(saverVel.y);hitY=true;}
    if(hitX||hitY){saverBounceCount++;setSaverHue(logo,true);
      // Every few bounces subtly align the next flight to a real corner, just like the legendary DVD screensaver moment.
      if(saverBounceCount%7===0&&!(hitX&&hitY)){const base=dvdBaseSpeed();if(hitX&&maxX>20){const tx=maxX/Math.max(30,Math.abs(saverVel.x));const dy=saverVel.y>0?maxY-saverPos.y:saverPos.y;if(tx>.1&&dy>18)saverVel.y=Math.sign(saverVel.y||1)*Math.max(28,Math.min(base*1.25,dy/tx));}else if(hitY&&maxY>20){const ty=maxY/Math.max(30,Math.abs(saverVel.y));const dx=saverVel.x>0?maxX-saverPos.x:saverPos.x;if(ty>.1&&dx>18)saverVel.x=Math.sign(saverVel.x||1)*Math.max(32,Math.min(base*1.35,dx/ty));}}
      if(hitX&&hitY){screensaverOverlay.classList.add('dvd-corner-hit');setTimeout(()=>screensaverOverlay?.classList.remove('dvd-corner-hit'),360);const base=dvdBaseSpeed();saverVel.x=Math.sign(saverVel.x||1)*base;saverVel.y=Math.sign(saverVel.y||1)*base*.72;}
    }
    logo.style.transform=`translate3d(${saverPos.x}px,${saverPos.y}px,0)`;saverAnimFrame=requestAnimationFrame(animateHanzDvd);
  }
  function initHanzDvd(){cancelAnimationFrame(saverAnimFrame);const logo=document.getElementById('screensaverLogo');if(!logo||!screensaverOverlay)return;const area=screensaverOverlay.getBoundingClientRect(),lr=logo.getBoundingClientRect(),maxX=Math.max(0,area.width-lr.width),maxY=Math.max(0,area.height-lr.height),base=dvdBaseSpeed();saverPos.x=Math.min(maxX,Math.max(0,maxX*.13));saverPos.y=Math.min(maxY,Math.max(0,maxY*.21));saverVel.x=base;saverVel.y=base*.72;saverBounceCount=0;saverHue=0;saverLastTs=0;setSaverHue(logo,false);logo.style.transform=`translate3d(${saverPos.x}px,${saverPos.y}px,0)`;saverAnimFrame=requestAnimationFrame(animateHanzDvd);}
  function startScreensaver(){const type=document.getElementById('screenSaverSelect')?.value||'hanz';if(type==='none'||!screensaverOverlay)return;saverActive=true;screensaverOverlay.classList.add('is-open');screensaverOverlay.classList.toggle('dvd-mode',type==='hanz');screensaverOverlay.setAttribute('aria-hidden','false');const logo=document.getElementById('screensaverLogo'),stars=document.getElementById('screensaverStars');if(logo)logo.style.display=type==='stars'?'none':'';if(stars)stars.style.opacity=type==='stars'?'1':'0';if(type==='hanz')requestAnimationFrame(initHanzDvd);else cancelAnimationFrame(saverAnimFrame);}
  function stopScreensaver(){if(!saverActive)return;saverActive=false;cancelAnimationFrame(saverAnimFrame);screensaverOverlay.classList.remove('is-open','dvd-mode','dvd-corner-hit');screensaverOverlay.setAttribute('aria-hidden','true');const logo=document.getElementById('screensaverLogo');if(logo){logo.style.transform='';logo.style.filter='';}resetSaverTimer();}
  document.getElementById('screenSaverPreview')?.addEventListener('click',startScreensaver);['screenSaverSelect','screenSaverSpeed','screenSaverColorShift','screenSaverMinutes'].forEach(id=>document.getElementById(id)?.addEventListener('change',()=>{try{localStorage.setItem(`hanz-${id}`,String(document.getElementById(id)?.type==='checkbox'?document.getElementById(id)?.checked:document.getElementById(id)?.value));}catch{}resetSaverTimer();}));
  try{['screenSaverSelect','screenSaverSpeed','screenSaverMinutes'].forEach(id=>{const v=localStorage.getItem(`hanz-${id}`),el=document.getElementById(id);if(v&&el)el.value=v;});const c=localStorage.getItem('hanz-screenSaverColorShift');if(c!==null&&document.getElementById('screenSaverColorShift'))document.getElementById('screenSaverColorShift').checked=c==='true';}catch{}
  ['pointerdown','keydown','mousemove','touchstart'].forEach(ev=>document.addEventListener(ev,()=>{if(saverActive)stopScreensaver();else resetSaverTimer();},{passive:true}));window.addEventListener('resize',()=>{if(saverActive&&screensaverOverlay?.classList.contains('dvd-mode'))initHanzDvd();});resetSaverTimer();

  /* Taskbar right-click menu and window arrangement */
  const taskbarContextMenu=document.getElementById('taskbarContextMenu'),taskbarEl=document.querySelector('.taskbar');
  function closeTaskbarMenu(){taskbarContextMenu?.classList.remove('is-open');taskbarContextMenu?.setAttribute('aria-hidden','true');}
  taskbarEl?.addEventListener('contextmenu',e=>{if(e.target.closest('.start-button'))return;e.preventDefault();closeContextMenu();taskbarContextMenu.classList.add('is-open');taskbarContextMenu.setAttribute('aria-hidden','false');const d=screens.desktop.getBoundingClientRect(),w=210,h=150;taskbarContextMenu.style.left=`${Math.min(d.width-w-3,Math.max(3,e.clientX-d.left))}px`;taskbarContextMenu.style.top=`${Math.max(3,d.height-taskbarHeight()-h-3)}px`;});
  taskbarContextMenu?.addEventListener('pointerdown',e=>e.stopPropagation());attachAppTriggers(taskbarContextMenu);
  function visibleWindows(){return xpWindows.filter(w=>w.classList.contains('is-open')&&!w.classList.contains('is-minimized'));}
  function cascadeWindows(){let i=0;visibleWindows().forEach(w=>{w.classList.remove('is-maximized');w.style.left=`${25+i*24}px`;w.style.top=`${35+i*24}px`;w.style.width=`${Math.min(+w.dataset.width||520,window.innerWidth-90)}px`;w.style.height=`${Math.min(+w.dataset.height||420,window.innerHeight-115)}px`;i=(i+1)%8;});closeTaskbarMenu();}
  function tileWindows(horizontal=false){const wins=visibleWindows();if(!wins.length)return;const d=screens.desktop.getBoundingClientRect(),h=d.height-taskbarHeight();wins.forEach((w,i)=>{w.classList.remove('is-maximized');if(horizontal){const hh=h/wins.length;Object.assign(w.style,{left:'0px',top:`${i*hh}px`,width:`${d.width}px`,height:`${hh}px`});}else{const ww=d.width/wins.length;Object.assign(w.style,{left:`${i*ww}px`,top:'0px',width:`${ww}px`,height:`${h}px`});}});closeTaskbarMenu();}
  function toggleShowDesktop(){const visible=visibleWindows();if(visible.length){showDesktopRestore=visible.map(w=>w.id);visible.forEach(minimizeWindow);}else{showDesktopRestore.forEach(id=>{const w=document.getElementById(id);if(w?.classList.contains('is-open')){w.classList.remove('is-minimized');w.setAttribute('aria-hidden','false');}});const last=document.getElementById(showDesktopRestore.at(-1));if(last)focusWindow(last);showDesktopRestore=[];}}
  document.getElementById('cascadeWindows')?.addEventListener('click',cascadeWindows);document.getElementById('tileWindowsHorizontal')?.addEventListener('click',()=>tileWindows(true));document.getElementById('tileWindowsVertical')?.addEventListener('click',()=>tileWindows(false));document.getElementById('taskbarShowDesktop')?.addEventListener('click',()=>{toggleShowDesktop();closeTaskbarMenu();});

  /* Hanz Garage Centrum */
  const hanzSessionStarted=performance.now();
  function updateHanzCenter(){const elapsed=Math.max(0,performance.now()-hanzSessionStarted),mins=Math.floor(elapsed/60000),secs=Math.floor(elapsed/1000)%60;const up=document.getElementById('centerUptime'),apps=document.getElementById('centerOpenApps'),net=document.getElementById('centerNetwork'),clk=document.getElementById('centerClock');if(up)up.textContent=`${mins}:${String(secs).padStart(2,'0')}`;if(apps)apps.textContent=String(xpWindows.filter(w=>w.classList.contains('is-open')).length);if(net){net.textContent=navigator.onLine?'ONLINE':'OFFLINE';net.classList.toggle('is-offline',!navigator.onLine);}if(clk)clk.textContent=new Date().toLocaleTimeString('cs-CZ');updateMediaExtras();}
  document.getElementById('centerOpenWmp')?.addEventListener('click',()=>openWindow('mediaPlayerWindow'));
  document.getElementById('centerPlayPause')?.addEventListener('click',()=>toggleWmpPlayback());
  document.getElementById('centerRadio')?.addEventListener('click',()=>{openWindow('mediaPlayerWindow');connectWmpKiss(true,0);showBalloon('Rádio KISS','Připojuji živé vysílání…',2200);});
  document.getElementById('centerScreensaver')?.addEventListener('click',()=>startScreensaver());
  document.getElementById('centerDisplay')?.addEventListener('click',()=>openWindow('displayPropertiesWindow'));
  document.getElementById('centerTaskmgr')?.addEventListener('click',()=>openWindow('taskManagerWindow'));
  document.getElementById('centerShowDesktop')?.addEventListener('click',()=>toggleShowDesktop());
  document.getElementById('centerArrange')?.addEventListener('click',()=>{arrangeDesktopIcons();showBalloon('Hanz Garage Centrum','Ikony byly zarovnány podle mřížky.',1800);});
  document.getElementById('centerMute')?.addEventListener('click',()=>{if(systemMute){systemMute.checked=!systemMute.checked;systemMute.dispatchEvent(new Event('change'));document.getElementById('centerMute').textContent=systemMute.checked?'🔇 Zapnout zvuk':'🔊 Ztlumit systém';}});
  window.addEventListener('online',updateHanzCenter);window.addEventListener('offline',updateHanzCenter);setInterval(updateHanzCenter,1000);updateHanzCenter();

  /* Alt+Tab switcher */
  const altTabOverlay=document.getElementById('altTabOverlay'),altTabItems=document.getElementById('altTabItems'),altTabTitle=document.getElementById('altTabTitle');let altTabIndex=0,altTabWindows=[];
  function renderAltTab(){if(!altTabOverlay)return;altTabWindows=xpWindows.filter(w=>w.classList.contains('is-open'));if(!altTabWindows.length)return;altTabIndex%=altTabWindows.length;altTabItems.innerHTML='';altTabWindows.forEach((w,i)=>{const item=document.createElement('div');item.className='alt-tab-item'+(i===altTabIndex?' is-selected':'');item.innerHTML=w.dataset.icon?`<img src="${w.dataset.icon}" alt="">`:'▣';altTabItems.appendChild(item);});altTabTitle.textContent=altTabWindows[altTabIndex]?.dataset.title||'';altTabOverlay.classList.add('is-open');altTabOverlay.setAttribute('aria-hidden','false');}
  function closeAltTab(commit=true){if(commit&&altTabWindows[altTabIndex]){const w=altTabWindows[altTabIndex];w.classList.remove('is-minimized');w.setAttribute('aria-hidden','false');focusWindow(w);}altTabOverlay?.classList.remove('is-open');altTabOverlay?.setAttribute('aria-hidden','true');}

  /* Desktop icon helpers */
  document.getElementById('arrangeDesktopIcons')?.addEventListener('click',()=>{const icons=document.getElementById('desktopShortcuts');icons?.classList.add('arrange-flash');setTimeout(()=>icons?.classList.remove('arrange-flash'),260);closeContextMenu();showBalloon('Plocha','Ikony byly zarovnány podle mřížky.');});
  document.getElementById('toggleDesktopIcons')?.addEventListener('click',e=>{desktopEl.classList.toggle('desktop-icons-hidden');const hidden=desktopEl.classList.contains('desktop-icons-hidden');e.currentTarget.textContent=`Zobrazit ikony na ploše ${hidden?'':'✓'}`;if(showDesktopIconsCheckbox)showDesktopIconsCheckbox.checked=!hidden;closeContextMenu();});

  /* ---------------- Desktop context menu ---------------- */
  function closeContextMenu(){desktopContextMenu.classList.remove('is-open');desktopContextMenu.setAttribute('aria-hidden','true');}
  screens.desktop.addEventListener('contextmenu',e=>{
    if(e.target.closest('.xp-window,.taskbar,.start-menu'))return;
    e.preventDefault();closeStartMenu();desktopContextMenu.classList.add('is-open');desktopContextMenu.setAttribute('aria-hidden','false');
    const r=screens.desktop.getBoundingClientRect(),w=210,h=310;desktopContextMenu.style.left=`${Math.min(r.width-w-4,Math.max(2,e.clientX-r.left))}px`;desktopContextMenu.style.top=`${Math.min(r.height-taskbarHeight()-h-2,Math.max(2,e.clientY-r.top))}px`;
  });
  desktopContextMenu.addEventListener('pointerdown',e=>e.stopPropagation());attachAppTriggers(desktopContextMenu);
  document.getElementById('refreshDesktop').addEventListener('click',()=>{closeContextMenu();const icons=document.getElementById('desktopShortcuts');icons.style.opacity='.35';setTimeout(()=>icons.style.opacity='1',140);});

  /* ---------------- Session buttons ---------------- */
  function closeAllWindows(){xpWindows.forEach(closeWindow);}
  document.getElementById('shutdownButton').addEventListener('click',()=>{
    closeStartMenu();systemOverlayText.textContent='Systém Hanz Garage se vypíná…';systemOverlay.classList.add('is-open');systemOverlay.setAttribute('aria-hidden','false');
    setTimeout(()=>{systemOverlay.style.background='#000';systemOverlayText.textContent='Kliknutím znovu spustíš Hanz Garage.';},1500);
  });
  systemOverlay.addEventListener('click',()=>{
    systemOverlay.classList.remove('is-open');systemOverlay.setAttribute('aria-hidden','true');systemOverlay.style.background='';closeAllWindows();desktopStartedOnce=false;setStage('boot');scheduleStartupSound();setTimeout(()=>setStage('welcome'),4300);setTimeout(()=>setStage('desktop'),5900);
  });
  document.getElementById('logoffButton').addEventListener('click',()=>{closeStartMenu();closeAllWindows();desktopStartedOnce=false;setStage('welcome');setTimeout(()=>setStage('desktop'),1500);});

  document.addEventListener('pointerdown',e=>{
    if(!e.target.closest('.start-menu,.start-button'))closeStartMenu();
    if(!e.target.closest('.desktop-context-menu'))closeContextMenu();
    if(!e.target.closest('.taskbar-context-menu,.taskbar'))closeTaskbarMenu();
    if(!e.target.closest('.desktop-shortcut'))document.querySelectorAll('.desktop-shortcut').forEach(s=>s.classList.remove('is-selected'));
    if(!e.target.closest('.tray,.tray-popup'))closeTrayPopups();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeStartMenu(); closeContextMenu(); closeTaskbarMenu(); if(altTabOverlay?.classList.contains('is-open'))closeAltTab(false); }
    if (e.ctrlKey && e.key === 'Escape') { e.preventDefault(); startMenu.classList.contains('is-open') ? closeStartMenu() : openStartMenu(); }
    if (e.altKey && e.key === 'F4') {
      const active = xpWindows.find(w => w.classList.contains('is-active-window') && w.classList.contains('is-open') && !w.classList.contains('is-minimized'));
      if (active) { e.preventDefault(); closeWindow(active); }
    }
    if (e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'm') {
      const active = xpWindows.find(w => w.classList.contains('is-active-window') && w.classList.contains('is-open') && !w.classList.contains('is-minimized'));
      if (active) { e.preventDefault(); minimizeWindow(active); }
    }
    if (e.key === 'F5' && !e.target.matches('input,textarea')) {
      e.preventDefault(); const icons=document.getElementById('desktopShortcuts'); icons.style.opacity='.35'; setTimeout(()=>icons.style.opacity='1',140);
    }
    if (e.ctrlKey && e.shiftKey && e.key === 'Escape') { e.preventDefault(); openWindow('taskManagerWindow'); }
    if (e.ctrlKey && e.altKey && e.key.toLowerCase()==='m') { e.preventDefault(); openWindow('mediaPlayerWindow'); }
    if (e.ctrlKey && e.altKey && e.key.toLowerCase()==='k') { e.preventDefault(); openWindow('mediaPlayerWindow'); connectWmpKiss(true,0); }
    if (e.ctrlKey && e.altKey && e.key.toLowerCase()==='h') { e.preventDefault(); openWindow('hanzCenterWindow'); }
    if (e.altKey && e.key === 'Tab') {
      e.preventDefault();
      if(!altTabOverlay?.classList.contains('is-open')){altTabWindows=xpWindows.filter(w=>w.classList.contains('is-open')).sort((a,b)=>(+b.style.zIndex||0)-(+a.style.zIndex||0));altTabIndex=Math.min(1,Math.max(0,altTabWindows.length-1));}
      else if(altTabWindows.length){altTabIndex=(altTabIndex+1)%altTabWindows.length;}
      renderAltTab();
    }
    if ((e.key === 'F2' || (e.ctrlKey && e.key.toLowerCase()==='r')) && !e.target.matches('input,textarea')) { if(e.ctrlKey||e.key==='F2'){e.preventDefault();openWindow('runDialogWindow');setTimeout(()=>runCommand?.focus(),30);} }
    if ((e.metaKey && e.key.toLowerCase()==='e') || (e.ctrlKey && e.altKey && e.key.toLowerCase()==='e')) { e.preventDefault(); openWindow('computerWindow'); }
    if ((e.metaKey && e.key.toLowerCase()==='r') || (e.ctrlKey && e.altKey && e.key.toLowerCase()==='r')) { e.preventDefault(); openWindow('runDialogWindow'); setTimeout(()=>runCommand?.focus(),30); }
    if (e.ctrlKey && e.altKey && e.key.toLowerCase()==='b') { e.preventDefault(); openWindow('recycleBinWindow'); }
    if ((e.metaKey && e.key.toLowerCase()==='d') || (e.ctrlKey && e.altKey && e.key.toLowerCase()==='d')) { e.preventDefault(); toggleShowDesktop(); }
    if (e.ctrlKey && e.altKey && e.key.toLowerCase()==='c') { e.preventDefault(); openWindow('cmdWindow'); }
    if (e.ctrlKey && e.altKey && e.key.toLowerCase()==='i') { e.preventDefault(); openWindow('internetExplorerWindow'); }
    const paintActive=document.getElementById('paintWindow')?.classList.contains('is-active-window');
    if(paintActive&&e.ctrlKey&&!e.target.matches('input,textarea')){if(e.key.toLowerCase()==='z'){e.preventDefault();paintUndoAction();}if(e.key.toLowerCase()==='y'){e.preventDefault();paintRedoAction();}if(e.key.toLowerCase()==='s'){e.preventDefault();savePaint();}}
    const mediaActive = document.getElementById('mediaPlayerWindow')?.classList.contains('is-active-window') && document.getElementById('mediaPlayerWindow')?.classList.contains('is-open');
    if (mediaActive && !e.target.matches('input,textarea')) {
      if (e.code === 'Space') { e.preventDefault(); toggleWmpPlayback(); }
      if (e.key === 'ArrowLeft' && wmpAudio && !wmpRadioMode) { e.preventDefault(); wmpAudio.currentTime = Math.max(0, wmpAudio.currentTime - 10); }
      if (e.key === 'ArrowRight' && wmpAudio && !wmpRadioMode && Number.isFinite(wmpAudio.duration)) { e.preventDefault(); wmpAudio.currentTime = Math.min(wmpAudio.duration, wmpAudio.currentTime + 10); }
      if (e.key === 'ArrowUp' && wmpAudio) { e.preventDefault(); wmpAudio.volume = Math.min(1, wmpAudio.volume + .05); if (wmpVolume) wmpVolume.value = String(Math.round(wmpAudio.volume * 100)); }
      if (e.key === 'ArrowDown' && wmpAudio) { e.preventDefault(); wmpAudio.volume = Math.max(0, wmpAudio.volume - .05); if (wmpVolume) wmpVolume.value = String(Math.round(wmpAudio.volume * 100)); }
    }
  });
  document.addEventListener('keyup',e=>{if(e.key==='Alt'&&altTabOverlay?.classList.contains('is-open'))closeAltTab(true);});
  document.querySelectorAll('img').forEach(img=>img.addEventListener('dragstart',e=>e.preventDefault()));

  window.addEventListener('resize',()=>{
    xpWindows.forEach(win=>{
      if(!win.classList.contains('is-open')||win.classList.contains('is-maximized'))return;
      const r=win.getBoundingClientRect(),d=screens.desktop.getBoundingClientRect();
      if(r.left>d.right-80)win.style.left=`${Math.max(0,d.width-80)}px`;
      if(r.top>d.bottom-taskbarHeight()-30)win.style.top=`${Math.max(0,d.height-taskbarHeight()-30)}px`;
    });
    clearTimeout(window.__hanzDesktopResizeTimer);
    window.__hanzDesktopResizeTimer=setTimeout(()=>{snapDesktopIcons(desktopMovableIcons(),{save:true});positionRecycleBin();},120);
  });

  window.addEventListener('beforeunload',()=>{stopMineTimer();stopSolTimer();if(taskPerfInterval)clearInterval(taskPerfInterval);if(ieLoadingTimer)clearInterval(ieLoadingTimer);});


  /* ================= Additional XP features ================= */

  /* Záznam zvuku */
  const recorderRecord=document.getElementById('recorderRecord'),recorderStop=document.getElementById('recorderStop'),recorderPlay=document.getElementById('recorderPlay'),recorderDownload=document.getElementById('recorderDownload'),recorderClear=document.getElementById('recorderClear'),recorderAudio=document.getElementById('recorderAudio'),recorderTime=document.getElementById('recorderTime'),recorderStatus=document.getElementById('recorderStatus'),recorderFormat=document.getElementById('recorderFormat'),recorderLevel=document.getElementById('recorderLevel');
  let mediaRecorder=null,recorderStream=null,recorderChunks=[],recorderBlobUrl='',recorderStartAt=0,recorderTimer=0,recorderAnalyser=null,recorderAnim=0,recorderAudioCtx=null;
  function formatRecorderTime(ms){const sec=Math.max(0,ms/1000),m=Math.floor(sec/60),s=Math.floor(sec%60),d=Math.floor((sec%1)*10);return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${d}`;}
  function setRecorderButtons(recording=false,hasAudio=!!recorderBlobUrl){if(recorderRecord)recorderRecord.disabled=recording;if(recorderStop)recorderStop.disabled=!recording;if(recorderPlay)recorderPlay.disabled=recording||!hasAudio;if(recorderDownload)recorderDownload.disabled=recording||!hasAudio;if(recorderClear)recorderClear.disabled=recording||!hasAudio;}
  function stopRecorderMeter(){cancelAnimationFrame(recorderAnim);recorderAnim=0;recorderLevel?.querySelectorAll('i').forEach(i=>i.classList.remove('is-on'));}
  function drawRecorderMeter(){if(!recorderAnalyser||!recorderLevel)return;const arr=new Uint8Array(recorderAnalyser.fftSize);recorderAnalyser.getByteTimeDomainData(arr);let sum=0;for(const v of arr){const x=(v-128)/128;sum+=x*x;}const rms=Math.sqrt(sum/arr.length);const on=Math.min(16,Math.round(rms*48));recorderLevel.querySelectorAll('i').forEach((i,n)=>i.classList.toggle('is-on',n<on));recorderAnim=requestAnimationFrame(drawRecorderMeter);}
  async function startRecorder(){if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==='undefined'){alert('Tento prohlížeč nepodporuje nahrávání z mikrofonu.');return;}try{recorderStream=await navigator.mediaDevices.getUserMedia({audio:true});recorderChunks=[];let options={};if(MediaRecorder.isTypeSupported?.('audio/webm;codecs=opus'))options={mimeType:'audio/webm;codecs=opus'};mediaRecorder=new MediaRecorder(recorderStream,options);mediaRecorder.addEventListener('dataavailable',e=>{if(e.data?.size)recorderChunks.push(e.data);});mediaRecorder.addEventListener('stop',()=>{const type=mediaRecorder.mimeType||'audio/webm';const blob=new Blob(recorderChunks,{type});if(recorderBlobUrl)URL.revokeObjectURL(recorderBlobUrl);recorderBlobUrl=URL.createObjectURL(blob);if(recorderAudio){recorderAudio.src=recorderBlobUrl;recorderAudio.hidden=false;}if(recorderFormat)recorderFormat.textContent=type.includes('opus')?'WebM / Opus':'WebM audio';if(recorderStatus)recorderStatus.textContent='Záznam připraven';setRecorderButtons(false,true);recorderStream?.getTracks().forEach(t=>t.stop());recorderStream=null;stopRecorderMeter();});mediaRecorder.start(150);recorderStartAt=performance.now();if(recorderStatus)recorderStatus.textContent='Nahrávání…';setRecorderButtons(true,false);clearInterval(recorderTimer);recorderTimer=setInterval(()=>{if(recorderTime)recorderTime.textContent=formatRecorderTime(performance.now()-recorderStartAt);},100);try{recorderAudioCtx=new (window.AudioContext||window.webkitAudioContext)();const source=recorderAudioCtx.createMediaStreamSource(recorderStream);recorderAnalyser=recorderAudioCtx.createAnalyser();recorderAnalyser.fftSize=256;source.connect(recorderAnalyser);drawRecorderMeter();}catch{}}catch(err){if(recorderStatus)recorderStatus.textContent='Přístup k mikrofonu nebyl povolen';showBalloon('Záznam zvuku','Mikrofon nebyl povolen nebo není dostupný.');setRecorderButtons(false,!!recorderBlobUrl);}}
  function stopRecorder(){const wasRecording=!!(mediaRecorder&&mediaRecorder.state!=='inactive');if(wasRecording)mediaRecorder.stop();if(recorderTimer){clearInterval(recorderTimer);recorderTimer=0;if(recorderTime)recorderTime.textContent=formatRecorderTime(performance.now()-recorderStartAt);}if(!wasRecording&&recorderStream){recorderStream.getTracks().forEach(t=>t.stop());recorderStream=null;}stopRecorderMeter();recorderAudioCtx?.close?.();recorderAudioCtx=null;}
  recorderRecord?.addEventListener('click',startRecorder);recorderStop?.addEventListener('click',stopRecorder);recorderPlay?.addEventListener('click',()=>{if(!recorderAudio)return;if(recorderAudio.paused){recorderAudio.play().catch(()=>{});recorderPlay.textContent='Ⅱ';}else{recorderAudio.pause();recorderPlay.textContent='▶';}});recorderAudio?.addEventListener('ended',()=>{if(recorderPlay)recorderPlay.textContent='▶';});
  recorderDownload?.addEventListener('click',()=>{if(!recorderBlobUrl)return;const a=document.createElement('a');a.href=recorderBlobUrl;a.download=`hanz-zaznam-${new Date().toISOString().replace(/[:.]/g,'-')}.webm`;a.click();});recorderClear?.addEventListener('click',()=>{recorderAudio?.pause();if(recorderBlobUrl)URL.revokeObjectURL(recorderBlobUrl);recorderBlobUrl='';if(recorderAudio){recorderAudio.removeAttribute('src');recorderAudio.hidden=true;}if(recorderTime)recorderTime.textContent='00:00.0';if(recorderStatus)recorderStatus.textContent='Připraveno';if(recorderPlay)recorderPlay.textContent='▶';setRecorderButtons(false,false);});setRecorderButtons(false,false);

  /* 4) Moje dokumenty — virtual persistent file manager */
  const documentsList=document.getElementById('documentsList'),documentsStatus=document.getElementById('documentsStatus'),documentsEditor=document.getElementById('documentsEditor'),documentsEditorText=document.getElementById('documentsEditorText'),documentsEditorName=document.getElementById('documentsEditorName'),docsAddress=document.getElementById('docsAddress'),docsBack=document.getElementById('docsBack'),docsUp=document.getElementById('docsUp');let docItems=[],selectedDocId=null,editingDocId=null,currentDocFolder=null,docHistory=[];
  try{docItems=JSON.parse(localStorage.getItem('hanzDocuments')||'[]');if(!Array.isArray(docItems))docItems=[];}catch{docItems=[];}
  if(!docItems.length)docItems=[{id:'folder-hanz',type:'folder',name:'Hanz Garage',parent:null,modified:Date.now()},{id:'folder-nacht',type:'folder',name:'Nachtfahrer',parent:null,modified:Date.now()},{id:'readme',type:'text',name:'Vítej.txt',parent:null,content:'Vítej v Moje dokumenty Hanz Garage XP!\n\nTady můžeš vytvářet vlastní složky a textové dokumenty. Obsah zůstane uložený v tomto prohlížeči.',modified:Date.now()},{id:'hanz-info',type:'text',name:'O projektu.txt',parent:'folder-hanz',content:'Hanz Garage XP\n\nVirtuální Windows XP plocha vytvořená pro Hanz Garage.',modified:Date.now()}];
  docItems.forEach(i=>{if(!Object.prototype.hasOwnProperty.call(i,'parent'))i.parent=null;});
  function saveDocuments(){try{localStorage.setItem('hanzDocuments',JSON.stringify(docItems));}catch{} }
  function docDate(ts){return new Intl.DateTimeFormat('cs-CZ',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(ts||Date.now()));}
  function currentDocItems(){return docItems.filter(i=>(i.parent??null)===(currentDocFolder??null));}
  function docFolderPath(folderId=currentDocFolder){const names=[];let id=folderId,guard=0;while(id&&guard++<30){const f=docItems.find(i=>i.id===id&&i.type==='folder');if(!f)break;names.unshift(f.name);id=f.parent??null;}return 'C:\\Documents and Settings\\Hanz\\Moje dokumenty'+(names.length?'\\'+names.join('\\'):'');}
  function renderDocuments(){if(!documentsList)return;documentsList.innerHTML='';const items=currentDocItems().sort((a,b)=>a.type===b.type?a.name.localeCompare(b.name,'cs'):(a.type==='folder'?-1:1));items.forEach(item=>{const row=document.createElement('div');row.className='documents-row'+(item.id===selectedDocId?' is-selected':'');row.dataset.id=item.id;row.innerHTML=`<span class="doc-name"><b class="doc-icon">${item.type==='folder'?'📁':'📄'}</b>${item.name}</span><span>${item.type==='folder'?'Složka':'Textový dokument'}</span><span>${docDate(item.modified)}</span>`;row.addEventListener('click',()=>{selectedDocId=item.id;renderDocuments();});row.addEventListener('dblclick',()=>{if(item.type==='folder'){docHistory.push(currentDocFolder);currentDocFolder=item.id;selectedDocId=null;if(documentsEditor)documentsEditor.hidden=true;renderDocuments();}else openDocumentEditor(item);});documentsList.appendChild(row);});if(docsAddress)docsAddress.textContent=docFolderPath();if(documentsStatus)documentsStatus.textContent=`${items.length} ${items.length===1?'objekt':'objektů'}`;const has=!!items.find(i=>i.id===selectedDocId);document.getElementById('docsRename').disabled=!has;document.getElementById('docsDelete').disabled=!has;if(docsBack)docsBack.disabled=!docHistory.length;if(docsUp)docsUp.disabled=currentDocFolder===null;saveDocuments();}
  function uniqueDocName(base,ext=''){let name=base+ext,n=2;while(currentDocItems().some(i=>i.name.toLocaleLowerCase('cs')===name.toLocaleLowerCase('cs'))){name=`${base} (${n++})${ext}`;}return name;}
  function openDocumentEditor(item){editingDocId=item.id;if(documentsEditorName)documentsEditorName.textContent=item.name;if(documentsEditorText)documentsEditorText.value=item.content||'';if(documentsEditor)documentsEditor.hidden=false;setTimeout(()=>documentsEditorText?.focus(),20);}
  function removeDocTree(id){const children=docItems.filter(i=>i.parent===id);children.forEach(c=>removeDocTree(c.id));docItems=docItems.filter(i=>i.id!==id);}
  document.getElementById('docsNewFolder')?.addEventListener('click',()=>{const name=uniqueDocName('Nová složka');docItems.push({id:`folder-${Date.now()}-${Math.random().toString(36).slice(2,5)}`,type:'folder',name,parent:currentDocFolder,modified:Date.now()});selectedDocId=docItems.at(-1).id;renderDocuments();});document.getElementById('docsNewText')?.addEventListener('click',()=>{const name=uniqueDocName('Nový textový dokument','.txt');const item={id:`text-${Date.now()}-${Math.random().toString(36).slice(2,5)}`,type:'text',name,parent:currentDocFolder,content:'',modified:Date.now()};docItems.push(item);selectedDocId=item.id;renderDocuments();openDocumentEditor(item);});
  document.getElementById('docsRename')?.addEventListener('click',()=>{const item=docItems.find(i=>i.id===selectedDocId);if(!item)return;const next=prompt('Nový název:',item.name)?.trim();if(!next)return;if(currentDocItems().some(i=>i.id!==item.id&&i.name.toLocaleLowerCase('cs')===next.toLocaleLowerCase('cs'))){alert('Položka se stejným názvem už existuje.');return;}item.name=next;item.modified=Date.now();renderDocuments();});document.getElementById('docsDelete')?.addEventListener('click',()=>{const item=docItems.find(i=>i.id===selectedDocId);if(!item)return;if(confirm(`Odstranit „${item.name}“${item.type==='folder'?' včetně jejího obsahu':''}?`)){removeDocTree(item.id);selectedDocId=null;renderDocuments();}});
  docsBack?.addEventListener('click',()=>{if(!docHistory.length)return;currentDocFolder=docHistory.pop()??null;selectedDocId=null;if(documentsEditor)documentsEditor.hidden=true;renderDocuments();});docsUp?.addEventListener('click',()=>{if(currentDocFolder===null)return;const current=docItems.find(i=>i.id===currentDocFolder);docHistory.push(currentDocFolder);currentDocFolder=current?.parent??null;selectedDocId=null;if(documentsEditor)documentsEditor.hidden=true;renderDocuments();});
  document.getElementById('documentsEditorSave')?.addEventListener('click',()=>{const item=docItems.find(i=>i.id===editingDocId);if(!item)return;item.content=documentsEditorText?.value||'';item.modified=Date.now();saveDocuments();renderDocuments();showBalloon('Moje dokumenty',`${item.name} byl uložen.`);});document.getElementById('documentsEditorClose')?.addEventListener('click',()=>{if(documentsEditor)documentsEditor.hidden=true;editingDocId=null;});renderDocuments();

  /* Had — playable game with keyboard, touch controls and high score */
  const snakeCanvas=document.getElementById('snakeCanvas'),snakeCtx=snakeCanvas?.getContext('2d'),snakeScoreEl=document.getElementById('snakeScore'),snakeHighScoreEl=document.getElementById('snakeHighScore'),snakeOverlay=document.getElementById('snakeOverlay');const snakeCell=20,snakeCols=24,snakeRows=17;let snake=[],snakeFood={x:16,y:8},snakeDir={x:1,y:0},snakeNextDir={x:1,y:0},snakeScore=0,snakeHigh=Number(localStorage.getItem('hanzSnakeHigh')||0),snakeTimer=0,snakeRunning=false,snakePaused=false;
  if(snakeHighScoreEl)snakeHighScoreEl.textContent=String(snakeHigh);
  function placeSnakeFood(){let tries=0;do{snakeFood={x:Math.floor(Math.random()*snakeCols),y:Math.floor(Math.random()*snakeRows)};tries++;}while(snake.some(p=>p.x===snakeFood.x&&p.y===snakeFood.y)&&tries<200);}
  function drawSnake(){if(!snakeCtx)return;snakeCtx.fillStyle='#0c1b0b';snakeCtx.fillRect(0,0,snakeCanvas.width,snakeCanvas.height);snakeCtx.strokeStyle='rgba(132,255,94,.07)';snakeCtx.lineWidth=1;for(let x=0;x<=snakeCanvas.width;x+=snakeCell){snakeCtx.beginPath();snakeCtx.moveTo(x,0);snakeCtx.lineTo(x,snakeCanvas.height);snakeCtx.stroke();}for(let y=0;y<=snakeCanvas.height;y+=snakeCell){snakeCtx.beginPath();snakeCtx.moveTo(0,y);snakeCtx.lineTo(snakeCanvas.width,y);snakeCtx.stroke();}snakeCtx.fillStyle='#ff4d4d';snakeCtx.fillRect(snakeFood.x*snakeCell+3,snakeFood.y*snakeCell+3,snakeCell-6,snakeCell-6);snake.forEach((p,i)=>{snakeCtx.fillStyle=i===0?'#b7ff82':'#56c94c';snakeCtx.fillRect(p.x*snakeCell+1,p.y*snakeCell+1,snakeCell-2,snakeCell-2);snakeCtx.strokeStyle='#1d6d24';snakeCtx.strokeRect(p.x*snakeCell+1.5,p.y*snakeCell+1.5,snakeCell-3,snakeCell-3);});}
  function snakeSetDir(x,y){if(!snakeRunning||snakePaused)return;if(x===-snakeDir.x&&y===-snakeDir.y)return;snakeNextDir={x,y};}
  function snakeStep(){if(!snakeRunning||snakePaused)return;snakeDir=snakeNextDir;const head={x:snake[0].x+snakeDir.x,y:snake[0].y+snakeDir.y};if(head.x<0||head.y<0||head.x>=snakeCols||head.y>=snakeRows||snake.some(p=>p.x===head.x&&p.y===head.y)){endSnake();return;}snake.unshift(head);if(head.x===snakeFood.x&&head.y===snakeFood.y){snakeScore+=10;if(snakeScoreEl)snakeScoreEl.textContent=String(snakeScore);if(snakeScore>snakeHigh){snakeHigh=snakeScore;if(snakeHighScoreEl)snakeHighScoreEl.textContent=String(snakeHigh);try{localStorage.setItem('hanzSnakeHigh',String(snakeHigh));}catch{}}placeSnakeFood();clearInterval(snakeTimer);snakeTimer=setInterval(snakeStep,Math.max(60,125-Math.floor(snakeScore/50)*8));}else snake.pop();drawSnake();}
  function startSnake(){clearInterval(snakeTimer);snake=[{x:6,y:8},{x:5,y:8},{x:4,y:8}];snakeDir=snakeNextDir={x:1,y:0};snakeScore=0;if(snakeScoreEl)snakeScoreEl.textContent='0';snakeRunning=true;snakePaused=false;placeSnakeFood();snakeOverlay?.classList.add('is-hidden');const sb=document.getElementById('snakeStart');if(sb)sb.textContent='Spustit hru';const pb=document.getElementById('snakePause');if(pb)pb.textContent='Pozastavit';drawSnake();snakeTimer=setInterval(snakeStep,125);}
  function endSnake(){clearInterval(snakeTimer);snakeTimer=0;snakeRunning=false;const player=activeGamePlayers.snake;if(player&&snakeScore>0){saveGameScore('snake',player,snakeScore).then(improved=>{if(improved)showBalloon('Had',`${player}: nové TOP skóre ${snakeScore} bodů.`);}).catch(()=>{});}if(snakeOverlay){snakeOverlay.classList.remove('is-hidden');snakeOverlay.querySelector('strong').textContent='Konec hry';snakeOverlay.querySelector('span').textContent=`${player?player+' • ':''}Skóre: ${snakeScore}`;const b=document.getElementById('snakeStart');if(b)b.textContent='Hrát znovu';}}
  function toggleSnakePause(){if(!snakeRunning)return;snakePaused=!snakePaused;const b=document.getElementById('snakePause');if(b)b.textContent=snakePaused?'Pokračovat':'Pozastavit';if(snakeOverlay){snakeOverlay.classList.toggle('is-hidden',!snakePaused);if(snakePaused){snakeOverlay.querySelector('strong').textContent='Pozastaveno';snakeOverlay.querySelector('span').textContent='Klikni na Pokračovat nebo stiskni mezerník';const sb=document.getElementById('snakeStart');if(sb)sb.textContent='Pokračovat';}else{const sb=document.getElementById('snakeStart');if(sb)sb.textContent='Spustit hru';}}}
  document.getElementById('snakeStart')?.addEventListener('click',()=>{if(snakeRunning&&snakePaused)toggleSnakePause();else startSnake();});document.getElementById('snakeNew')?.addEventListener('click',startSnake);document.getElementById('snakePause')?.addEventListener('click',toggleSnakePause);document.querySelectorAll('[data-snake-dir]').forEach(b=>b.addEventListener('click',()=>{const d=b.dataset.snakeDir;if(d==='up')snakeSetDir(0,-1);if(d==='down')snakeSetDir(0,1);if(d==='left')snakeSetDir(-1,0);if(d==='right')snakeSetDir(1,0);}));
  document.addEventListener('keydown',e=>{const win=document.getElementById('snakeWindow');if(!win?.classList.contains('is-open')||win.classList.contains('is-minimized')||!win.classList.contains('is-active-window')||e.target.matches('input,textarea'))return;const k=e.key.toLowerCase();if(['arrowup','w'].includes(k)){e.preventDefault();snakeSetDir(0,-1);}else if(['arrowdown','s'].includes(k)){e.preventDefault();snakeSetDir(0,1);}else if(['arrowleft','a'].includes(k)){e.preventDefault();snakeSetDir(-1,0);}else if(['arrowright','d'].includes(k)){e.preventDefault();snakeSetDir(1,0);}else if(e.code==='Space'){e.preventDefault();toggleSnakePause();}});drawSnake();


  /* ---------------- Archiv photo folder ---------------- */
  const archiveGrid = document.getElementById('archivePhotoGrid');
  const archiveDetails = document.getElementById('archiveDetails');
  const archiveStatus = document.getElementById('archiveStatus');
  let archiveSelected = null;

  function selectArchivePhoto(item) {
    archiveGrid?.querySelectorAll('.archive-photo').forEach(x=>x.classList.remove('is-selected'));
    archiveSelected = item || null;
    if (!item) {
      if (archiveDetails) archiveDetails.innerHTML = 'Archiv<br>12 obrázků';
      if (archiveStatus) archiveStatus.textContent = '12 objektů';
      return;
    }
    item.classList.add('is-selected');
    const img = item.querySelector('img');
    const bits = [];
    if (img?.naturalWidth && img?.naturalHeight) bits.push(img.naturalWidth + ' × ' + img.naturalHeight + ' px');
    if (archiveDetails) archiveDetails.innerHTML = '<b>' + item.dataset.name + '</b><br>Obrázek' + (bits.length ? '<br>' + bits.join(' · ') : '');
    if (archiveStatus) archiveStatus.textContent = item.dataset.name;
  }

  function openArchivePhotoInPaint(item) {
    if (!item) return;
    const media = item.dataset.media, name = item.dataset.name || 'Obrázek';
    const src = media ? `${MEDIA_BASE}/${encodeURIComponent(media)}` : '';
    if (!src || !canvas || !ctx) return;
    const img = new Image();
    img.onload = () => {
      clearFloatingSelection?.(false);
      try { pushPaintUndo(); } catch {}
      const maxW = 1100, maxH = 760;
      const scale = Math.min(1, maxW / img.naturalWidth, maxH / img.naturalHeight);
      const w = Math.max(1, Math.round(img.naturalWidth * scale));
      const h = Math.max(1, Math.round(img.naturalHeight * scale));
      canvas.width = w; canvas.height = h;
      ctx.clearRect(0,0,w,h); ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h);
      ctx.drawImage(img,0,0,w,h);
      const caption=document.getElementById('paintWindowCaption'); if(caption) caption.textContent = name + ' - Paint';
      setPaintStatus(name + '  |  ' + img.naturalWidth + ' × ' + img.naturalHeight + ' px');
      openWindow('paintWindow');
      requestAnimationFrame(()=>{const z=document.getElementById('paintZoom'); if(z){z.value='100%';canvas.style.width='100%';}});
    };
    img.onerror = () => alert('Obrázek se nepodařilo otevřít.');
    img.src = src;
  }

  archiveGrid?.querySelectorAll('.archive-photo').forEach(item=>{
    item.addEventListener('click',()=>selectArchivePhoto(item));
    item.addEventListener('dblclick',e=>{e.preventDefault();e.stopPropagation();selectArchivePhoto(item);openArchivePhotoInPaint(item);});
    item.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();selectArchivePhoto(item);openArchivePhotoInPaint(item);}});
  });
  document.getElementById('archiveOpenPaint')?.addEventListener('click',()=>archiveSelected ? openArchivePhotoInPaint(archiveSelected) : alert('Nejdřív vyber obrázek.'));
  document.getElementById('archiveSelectAll')?.addEventListener('click',()=>{archiveGrid?.querySelectorAll('.archive-photo').forEach(x=>x.classList.add('is-selected'));archiveSelected=null;if(archiveStatus)archiveStatus.textContent='Vybráno 12 objektů';if(archiveDetails)archiveDetails.innerHTML='<b>12 vybraných objektů</b><br>Obrázky';});
  document.getElementById('archiveBack')?.addEventListener('click',()=>closeWindow(document.getElementById('archiveWindow')));
  document.getElementById('archiveUp')?.addEventListener('click',()=>{closeWindow(document.getElementById('archiveWindow'));});
  document.getElementById('archiveSearch')?.addEventListener('click',()=>openWindow('searchWindow'));

  /* ---------------- Factory reset ---------------- */
  const factoryResetDialog=document.getElementById('factoryResetDialog');
  const factoryResetCancel=document.getElementById('factoryResetCancel');
  const factoryResetClose=document.getElementById('factoryResetClose');
  function showFactoryReset(event){
    event?.preventDefault?.();event?.stopPropagation?.();closeStartMenu();if(!factoryResetDialog)return;
    factoryResetDialog.hidden=false;factoryResetDialog.classList.add('is-open');factoryResetDialog.setAttribute('aria-hidden','false');setTimeout(()=>factoryResetCancel?.focus(),0);
  }
  function hideFactoryReset(event){
    event?.preventDefault?.();event?.stopPropagation?.();if(!factoryResetDialog)return;
    factoryResetDialog.classList.remove('is-open');factoryResetDialog.setAttribute('aria-hidden','true');factoryResetDialog.hidden=true;
  }
  document.getElementById('factoryResetButton')?.addEventListener('click',showFactoryReset);
  factoryResetCancel?.addEventListener('click',hideFactoryReset);
  factoryResetClose?.addEventListener('click',hideFactoryReset);
  factoryResetDialog?.addEventListener('click',event=>{if(event.target===factoryResetDialog)hideFactoryReset(event);});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&factoryResetDialog?.classList.contains('is-open'))hideFactoryReset(event);});
  document.getElementById('factoryResetConfirm')?.addEventListener('click',async(event)=>{
    event.preventDefault();event.stopPropagation();try{localStorage.clear();sessionStorage.clear();}catch{}
    try{if('caches' in window){const keys=await caches.keys();await Promise.all(keys.map(k=>caches.delete(k)));}}catch{}
    location.reload();
  });

  scheduleStartupSound();
  setTimeout(()=>setStage('welcome'),5200);
  setTimeout(()=>setStage('desktop'),7050);
})();

