/* =========================================================
   时之洄游 / interaction layer
   Vanilla JS · no dependencies
   ========================================================= */
(function () {
  'use strict';

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const pad = (n) => String(Math.floor(n)).padStart(2, '0');
  const fmtTime = (s) => {
    if (!Number.isFinite(s) || s < 0) s = 0;
    return `${pad(s / 60)}:${pad(s % 60)}`;
  };

  document.documentElement.classList.add('js-ready');

  /* ---------------------------------------------------------
     0. Custom cursor
     --------------------------------------------------------- */
  const cursor = $('#cursor');
  if (finePointer && cursor && !reduceMotion) {
    document.documentElement.classList.add('cursor-enabled');
    let cx = window.innerWidth / 2;
    let cy = window.innerHeight / 2;
    let tx = cx;
    let ty = cy;
    let cursorRaf = null;

    const renderCursor = () => {
      cx += (tx - cx) * 0.24;
      cy += (ty - cy) * 0.24;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      cursorRaf = requestAnimationFrame(renderCursor);
    };
    renderCursor();

    document.addEventListener('pointermove', (e) => {
      tx = e.clientX;
      ty = e.clientY;
      cursor.classList.add('is-on');
    }, { passive: true });

    document.addEventListener('pointerleave', () => cursor.classList.remove('is-on'));

    document.addEventListener('pointerover', (e) => {
      const labelHost = e.target.closest('[data-cursor]');
      const target = e.target.closest('a, button, [data-cursor], .orbit-frame');
      const label = cursor.querySelector('b');
      cursor.classList.remove('is-link', 'is-view', 'is-drag');
      label.textContent = '';
      if (!target) return;

      if (target.classList.contains('orbit-frame')) {
        cursor.classList.add('is-drag');
        label.textContent = 'DRAG';
        return;
      }
      if (labelHost && labelHost.dataset.cursor) {
        cursor.classList.add('is-view');
        label.textContent = labelHost.dataset.cursor;
        return;
      }
      if (target.matches('a, button')) cursor.classList.add('is-link');
    });
  }

  /* ---------------------------------------------------------
     1. Reveal
     --------------------------------------------------------- */
  const revealEls = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------------------------------------------------------
     2. Chapter state, progress, header theme
     --------------------------------------------------------- */
  const chrome = $('#chrome');
  const sections = $$('section[data-chapter]');
  const themeZones = $$('[data-theme-zone]');
  const chapterCode = $('#chapterCode');
  const chapterLabel = $('#chapterLabel');
  const progressBar = $('#scrollProgress');
  const rail = $('.rail');
  const railLinks = $$('.rail a');
  const menuLinks = $$('.menu-nav a');
  const parallaxEls = $$('[data-parallax]');
  const heroMedia = $('#heroMedia');
  let currentSection = null;
  let ticking = false;

  const setChapter = (section) => {
    if (!section || section === currentSection) return;
    currentSection = section;

    const idx = section.dataset.chapter;
    const cn = section.dataset.cn;
    const name = section.dataset.name;
    chapterCode.textContent = idx;
    chapterLabel.textContent = `${cn} / ${name}`;

    const id = section.id || 'hero';
    railLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`));
    menuLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${id}`));
  };

  const setHeaderTheme = (baseTheme) => {
    let theme = baseTheme || 'dark';
    themeZones.forEach((zone) => {
      const rect = zone.getBoundingClientRect();
      if (rect.top <= 40 && rect.bottom > 40) theme = zone.dataset.themeZone;
    });
    if (chrome && chrome.dataset.theme !== theme) chrome.dataset.theme = theme;
    if (rail) rail.classList.toggle('light', theme === 'light');
  };

  const updateScrollUI = () => {
    ticking = false;
    const y = window.scrollY || window.pageYOffset;
    const vh = window.innerHeight;
    const max = Math.max(1, document.documentElement.scrollHeight - vh);
    progressBar.style.width = `${clamp(y / max, 0, 1) * 100}%`;
    if (chrome) chrome.classList.toggle('is-scrolled', y > 42);

    const probe = y + vh * 0.38;
    let active = sections[0];
    sections.forEach((section) => {
      if (section.offsetTop <= probe) active = section;
    });
    setChapter(active);
    setHeaderTheme(active.dataset.theme);

    if (!reduceMotion) {
      parallaxEls.forEach((img) => {
        const host = img.closest('figure, div, section') || img.parentElement;
        const rect = host.getBoundingClientRect();
        if (rect.bottom < -200 || rect.top > vh + 200) return;
        const speed = parseFloat(img.dataset.parallax) || 0.05;
        const offset = (rect.top + rect.height / 2 - vh / 2) * -speed;
        const scale = img.closest('.site-hero') ? 1.08 : 1.07;
        img.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0) scale(${scale})`;
      });

      if (heroMedia && y < vh * 1.3) {
        heroMedia.style.transform = `translate3d(0, ${(y * 0.12).toFixed(2)}px, 0)`;
        heroMedia.style.opacity = String(clamp(1 - y / (vh * 1.15), 0, 1));
      }
    }
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateScrollUI);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  updateScrollUI();

  /* ---------------------------------------------------------
     3. Fullscreen index
     --------------------------------------------------------- */
  const menu = $('#menu');
  const indexToggle = $('#indexToggle');
  const menuPreview = $('#menuPreview');
  const menuPreviewCaption = $('.menu-preview-caption');
  let menuOpen = false;
  let returnFocus = null;

  const openMenu = () => {
    menuOpen = true;
    returnFocus = document.activeElement;
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    indexToggle.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
    window.setTimeout(() => {
      const first = menu.querySelector('.menu-nav a');
      if (first) first.focus({ preventScroll: true });
    }, 220);
  };

  const closeMenu = (restore = true) => {
    if (!menuOpen) return;
    menuOpen = false;
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    indexToggle.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    if (restore && returnFocus) returnFocus.focus({ preventScroll: true });
  };

  if (indexToggle && menu) {
    indexToggle.addEventListener('click', () => {
      menuOpen ? closeMenu() : openMenu();
    });
    menuLinks.forEach((link) => {
      link.addEventListener('click', () => closeMenu(false));
      link.addEventListener('mouseenter', () => {
        if (!menuPreview) return;
        const src = link.dataset.preview;
        if (src && menuPreview.getAttribute('src') !== src) {
          menuPreview.style.opacity = '0.25';
          const img = new Image();
          img.onload = () => {
            menuPreview.src = src;
            menuPreview.style.opacity = '1';
          };
          img.src = src;
        }
        if (menuPreviewCaption) {
          const number = link.querySelector('span').textContent;
          const en = link.querySelector('small').textContent.split('/')[0].trim();
          menuPreviewCaption.textContent = `FIG. ${number} / ${en}`;
        }
      });
      link.addEventListener('focus', () => {
        if (!menuPreview) return;
        const src = link.dataset.preview;
        if (src) menuPreview.src = src;
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (menuOpen) closeMenu();
        if (lightbox && lightbox.classList.contains('is-open')) closeLightbox();
      }
      if (e.key === 'Tab' && menuOpen) {
        const focusables = [indexToggle, ...$$('.menu-nav a')].filter((el) => el && !el.hidden);
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }

  /* ---------------------------------------------------------
     4. 48-layer stack
     --------------------------------------------------------- */
  const layerStack = $('#layerStack');
  const layerRange = $('#layerRange');
  const layerPct = $('#layerPct');
  const layerHint = $('#layerHint');
  const layerFill = $('.range-fill');
  const layerStage = $('.layer-stage');

  const catmull = (points) => {
    const pts = points.concat(points.slice(0, 3));
    let d = `M ${pts[1][0].toFixed(2)} ${pts[1][1].toFixed(2)} `;
    for (let i = 1; i < pts.length - 2; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2];
      const c1x = p1[0] + (p2[0] - p0[0]) / 6;
      const c1y = p1[1] + (p2[1] - p0[1]) / 6;
      const c2x = p2[0] - (p3[0] - p1[0]) / 6;
      const c2y = p2[1] - (p3[1] - p1[1]) / 6;
      d += `C ${c1x.toFixed(2)} ${c1y.toFixed(2)} ${c2x.toFixed(2)} ${c2y.toFixed(2)} ${p2[0].toFixed(2)} ${p2[1].toFixed(2)} `;
    }
    return `${d}Z`;
  };

  const contourPath = (i) => {
    const t = i / 47;
    const scale = 0.64 + (1 - t) * 0.36;
    const points = [];
    for (let k = 0; k < 30; k++) {
      const a = (Math.PI * 2 * k) / 30;
      const wobble =
        (15 + t * 7) * Math.sin(3 * a + i * 0.31) +
        (8 + t * 4) * Math.sin(5 * a - i * 0.17) +
        4 * Math.sin(7 * a + 1.1);
      const rx = (156 + wobble) * scale;
      const ry = (94 + wobble * 0.68) * scale;
      points.push([
        220 + rx * Math.cos(a) + (1 - t) * 4,
        150 + ry * Math.sin(a) + (1 - t) * 2,
      ]);
    }
    return catmull(points);
  };

  if (layerStack) {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < 48; i++) {
      const layer = document.createElement('div');
      layer.className = 'layer';
      layer.style.setProperty('--i', i);
      layer.innerHTML = `<svg viewBox="0 0 440 300" aria-hidden="true"><path d="${contourPath(i)}"></path></svg>`;
      fragment.appendChild(layer);
    }
    layerStack.appendChild(fragment);
  }

  let layerAnim = null;
  let layerValue = 0;
  const layerEls = layerStack ? $$('.layer', layerStack) : [];

  const setLayerValue = (value, updateInput = true) => {
    layerValue = clamp(value, 0, 100);
    const gap = 0.12 + (layerValue / 100) * 6.2;
    layerEls.forEach((layer, i) => {
      layer.style.transform = `translateZ(${(i * gap).toFixed(2)}px)`;
    });
    if (layerPct) layerPct.textContent = `${Math.round(layerValue)}%`;
    if (layerFill) layerFill.style.width = `${layerValue}%`;
    if (updateInput && layerRange) layerRange.value = String(Math.round(layerValue));
    if (layerHint) {
      layerHint.textContent = layerValue > 75 ? 'FULL SECTION / 全展开' : layerValue < 12 ? 'COMPACT / 压实' : 'DRAG TO EXPLODE';
    }
    if (layerStage) layerStage.style.setProperty('--depth', `${(layerValue / 100).toFixed(2)}`);
  };

  const animateLayerTo = (target, duration = 900) => {
    if (layerAnim) cancelAnimationFrame(layerAnim);
    if (reduceMotion) {
      setLayerValue(target);
      return;
    }
    const from = layerValue;
    const start = performance.now();
    const tick = (now) => {
      const p = clamp((now - start) / duration, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setLayerValue(from + (target - from) * eased);
      if (p < 1) layerAnim = requestAnimationFrame(tick);
      else layerAnim = null;
    };
    layerAnim = requestAnimationFrame(tick);
  };

  if (layerRange) {
    setLayerValue(0, false);
    layerRange.addEventListener('input', () => {
      if (layerAnim) {
        cancelAnimationFrame(layerAnim);
        layerAnim = null;
      }
      setLayerValue(parseFloat(layerRange.value));
    });
    $$('[data-layer-action]').forEach((button) => {
      button.addEventListener('click', () => {
        animateLayerTo(button.dataset.layerAction === 'expand' ? 100 : 0, 800);
      });
    });
    if ('IntersectionObserver' in window) {
      const labObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          animateLayerTo(58, 1400);
          labObserver.disconnect();
        });
      }, { threshold: 0.22 });
      const lab = $('.layer-lab');
      if (lab) labObserver.observe(lab);
    } else {
      setLayerValue(58);
    }
  }

  /* ---------------------------------------------------------
     5. Terrain view switcher
     --------------------------------------------------------- */
  const terrainMain = $('#terrainMain');
  const terrainCaption = $('#terrainCaption');
  const terrainIndex = $('#terrainIndex');
  const terrainViewer = $('.terrain-viewer');
  let terrainCurrent = {
    src: terrainMain ? terrainMain.getAttribute('src') : '',
    caption: terrainCaption ? terrainCaption.textContent : '',
    index: '01',
  };

  const setTerrainView = (button) => {
    if (!terrainMain || !button) return;
    const src = button.dataset.terrain;
    const caption = button.dataset.caption;
    const index = button.dataset.index || '01';
    if (!src) return;
    terrainCurrent = { src, caption, index };
    if (terrainViewer) terrainViewer.classList.add('is-switching');
    terrainMain.style.opacity = '0';
    const img = new Image();
    img.onload = () => {
      terrainMain.src = src;
      terrainMain.alt = caption;
      if (terrainCaption) terrainCaption.textContent = caption;
      if (terrainIndex) terrainIndex.textContent = `${index} / 04`;
      requestAnimationFrame(() => {
        terrainMain.style.opacity = '1';
        if (terrainViewer) terrainViewer.classList.remove('is-switching');
      });
    };
    img.onerror = () => {
      terrainMain.style.opacity = '1';
      if (terrainViewer) terrainViewer.classList.remove('is-switching');
    };
    img.src = src;
    $$('.terrain-view-buttons [data-terrain]').forEach((el) => {
      el.classList.toggle('is-active', el.dataset.terrain === src);
    });
    $$('.terrain-thumb').forEach((el) => el.classList.toggle('is-active', el.dataset.terrain === src));
  };

  $$('.terrain-view-buttons [data-terrain], .terrain-thumb').forEach((button) => {
    button.addEventListener('click', () => setTerrainView(button));
  });

  /* ---------------------------------------------------------
     6. Object anatomy
     --------------------------------------------------------- */
  const objectData = {
    camera: {
      index: '01 / 05',
      en: 'CAMERA',
      title: '照相机 / 捕捉时间',
      lead: '镜头把世界框进一个矩形，快门把流动的时间切成一个瞬间。拆开后，光学、机械与电路第一次被放在同一张桌面上。',
      origin: '捕捉 / 定格',
      role: '观测窗 / 时间切片',
      method: '螺纹 · 卡扣 · 排线插接 · 破坏性拆解',
      parts: '外壳 / 光学 / 机械 / 电路',
      quote: '“相机留住过去，穿梭机挣脱定格。”',
      huge: 'CAMERA',
      side: ['VANTAGE SHOOTER / 135 FILM CAMERA', '约 140 × 75 × 50 MM'],
      states: [
        { label: '原件', stateLabel: 'ORIGINAL / 原件', src: 'assets/img/camera-full.jpg', alt: '一台完整的黑色 VANTAGE SHOOTER 胶片相机' },
        { label: '拆解零件', stateLabel: 'DISSECTED / 拆解零件', src: 'assets/img/camera-parts.jpg', alt: '照相机拆解后的外壳、镜头、机械与电路零件平铺' },
      ],
    },
    rod: {
      index: '02 / 05',
      en: 'FISHING ROD',
      title: '钓鱼竿 / 向未知抛出',
      lead: '渔轮收放鱼线，鱼线把远处的未知拉回手中；渔网与麻绳把散落的时间打成结。它像一根时空牵引索，也像一次对不可抵达之处的试探。',
      origin: '抛出 / 收回',
      role: '牵引索 / 引力缆绳',
      method: '旋卸 · 抽拉 · 剪断 · 绑线拆除',
      parts: '渔轮 / 竿节 / 导环 / 鱼线',
      quote: '“我们像垂钓一样，尝试触碰不可抵达的时空。”',
      huge: 'REEL / ROD',
      side: ['ROD / REEL / LINE', '渔轮 · 竿节 · 导环 · 鱼线'],
      states: [
        { label: '拆解后', stateLabel: 'DISSECTED / 渔轮与竿节', src: 'assets/img/rod-parts.jpg', alt: '钓鱼竿拆解后的渔轮、竿节、导环与鱼线' },
      ],
    },
    gamepad: {
      index: '03 / 05',
      en: 'GAME CONTROLLER',
      title: '游戏手柄 / 坐标控制台',
      lead: '现实里我们用手柄进入虚拟空间；在这台机器里，它是选择时间坐标、主动开启跃迁的控制台。摇杆选择坐标，按键确认跃迁。',
      origin: '进入虚拟空间',
      role: '操控台 / 坐标选择',
      method: '旋卸 · 撬分 · 拔取 · 排线脱接',
      parts: '外壳 / 操控 / 电路 / 动力',
      quote: '“时空穿梭如同一场游戏，我们尝试操纵时间。”',
      huge: 'CONTROL',
      side: ['PS3 COMPATIBLE / WIRELESS', '摇杆 · 按键 · 主板 · 震动马达'],
      states: [
        { label: '原件', stateLabel: 'ORIGINAL / 原件', src: 'assets/img/gamepad.jpg', alt: '一只黑色无线游戏手柄放在木桌上' },
        { label: '拆解零件', stateLabel: 'DISSECTED / 拆解零件', src: 'assets/img/gamepad-parts.jpg', alt: '游戏手柄拆解后的外壳、摇杆、按键、主板与马达平铺' },
      ],
    },
    gun: {
      index: '04 / 05',
      en: 'TOY GUN',
      title: '玩具枪 / 能量喷口',
      lead: '它是一把玩具，却自带武器、发射与推进的意象。枪口是能量喷口，弹匣是能量仓；它不是暴力，而是一次幻想式的启航。',
      origin: '玩具 / 发射',
      role: '推进器 / 能量喷口',
      method: '旋卸 · 销钉 · 卡扣 · 弹簧释放',
      parts: '外壳 / 弹匣 / 发射 / 附件',
      quote: '“以能量迸发冲破时间壁垒，启动时空跃迁。”',
      huge: 'LAUNCH',
      side: ['TOY / RIFLE / LAUNCH', 'ABS 模型 · 弹簧机构 · 可拆弹匣'],
      states: [
        { label: '原件', stateLabel: 'ORIGINAL / 原件', src: 'assets/img/gun-full.jpg', alt: '一把黑色玩具步枪的完整外形' },
        { label: '拆解零件', stateLabel: 'DISSECTED / 拆解零件', src: 'assets/img/gun-parts.jpg', alt: '玩具枪拆解后的机匣、弹匣、枪机与弹簧零件平铺' },
      ],
    },
    bag: {
      index: '05 / 05',
      en: 'CANVAS BAG',
      title: '帆布包 / 时间之网',
      lead: '网眼是节点，绳结是时间的褶皱。它不靠硬壳保持形状，而靠网眼与绳结彼此牵连；装进去的东西互相挤压，像记忆里无法完全割断的时刻。',
      origin: '装住 / 携带',
      role: '时间之网 / 节点',
      method: '解结 · 抽绳 · 展开 · 观察网眼',
      parts: '网面 / 提手 / 抽绳',
      quote: '“所有时刻彼此勾连，无法完全割裂。”',
      huge: 'MESH',
      side: ['MESH / KNOT / CORD', '网眼 · 编织带 · 黑色抽绳'],
      states: [
        { label: '网与结', stateLabel: 'OBJECT / 时间之网', src: 'assets/img/bag.jpg', alt: '一只米色网眼帆布包，黑色抽绳收紧袋口' },
        { label: '细部', stateLabel: 'DETAIL / 网眼', src: 'assets/img/bag-detail.jpg', alt: '帆布包网眼与绳结的局部细节' },
      ],
    },
  };

  const objectOrder = ['camera', 'rod', 'gamepad', 'gun', 'bag'];
  const objectTabs = $$('.anatomy-index button');
  const objectPanel = $('#objectPanel');
  const objectStage = $('#objectStage');
  const objectImgA = $('#objectImgA');
  const objectImgB = $('#objectImgB');
  const objectHuge = $('#objectHuge');
  const objectStateLabel = $('#objectStateLabel');
  const objectSideNote = $('#objectSideNote');
  const objectIndexEl = $('#objectIndex');
  const objectEnEl = $('#objectEn');
  const objectTitleEl = $('#objectTitle');
  const objectLeadEl = $('#objectLead');
  const objectOriginEl = $('#objectOrigin');
  const objectRoleEl = $('#objectRole');
  const objectMethodEl = $('#objectMethod');
  const objectPartsEl = $('#objectParts');
  const objectQuoteEl = $('#objectQuote');
  const objectProgressEl = $('#objectProgress i');
  const objectStates = $$('.object-states button');
  const anatomyInfo = $('.anatomy-info');

  let currentObjectKey = 'camera';
  let currentObjectState = 0;
  let currentImageSlot = objectImgA;
  let imageToken = 0;

  const preloadObjectImages = () => {
    const urls = [];
    Object.values(objectData).forEach((obj) => obj.states.forEach((s) => urls.push(s.src)));
    urls.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  };

  const showObjectImage = (state, animate = true) => {
    if (!objectImgA || !objectImgB) return;
    const targetState = state || objectData[currentObjectKey].states[0];
    const src = targetState.src;
    const token = ++imageToken;
    const active = currentImageSlot;
    const next = currentImageSlot === objectImgA ? objectImgB : objectImgA;

    if (active.getAttribute('src') === src && active.classList.contains('is-active')) {
      active.alt = targetState.alt;
      if (objectStateLabel) objectStateLabel.textContent = targetState.stateLabel;
      return;
    }

    next.hidden = false;
    next.alt = targetState.alt;
    next.src = src;
    next.style.transition = 'none';
    next.style.opacity = '0';

    const reveal = () => {
      if (token !== imageToken) return;
      next.style.transition = '';
      requestAnimationFrame(() => {
        next.style.opacity = '';
        next.classList.add('is-active');
        active.classList.remove('is-active');
        currentImageSlot = next;
        if (objectStateLabel) objectStateLabel.textContent = targetState.stateLabel;
      });
    };

    if (next.complete && next.naturalWidth) {
      reveal();
    } else {
      next.addEventListener('load', reveal, { once: true });
      next.addEventListener('error', reveal, { once: true });
      window.setTimeout(reveal, 600);
    }
  };

  const renderObject = (key, stateIndex = 0, animate = true) => {
    const data = objectData[key];
    if (!data) return;
    currentObjectKey = key;
    currentObjectState = clamp(stateIndex, 0, data.states.length - 1);

    objectTabs.forEach((tab) => {
      const active = tab.dataset.object === key;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      if (active && animate) {
        try { tab.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' }); } catch (e) { /* no-op */ }
      }
    });

    if (objectIndexEl) objectIndexEl.textContent = data.index;
    if (objectEnEl) objectEnEl.textContent = data.en;
    if (objectTitleEl) objectTitleEl.textContent = data.title;
    if (objectLeadEl) objectLeadEl.textContent = data.lead;
    if (objectOriginEl) objectOriginEl.textContent = data.origin;
    if (objectRoleEl) objectRoleEl.textContent = data.role;
    if (objectMethodEl) objectMethodEl.textContent = data.method;
    if (objectPartsEl) objectPartsEl.textContent = data.parts;
    if (objectQuoteEl) objectQuoteEl.textContent = data.quote;
    if (objectHuge) objectHuge.textContent = data.huge;
    if (objectProgressEl) objectProgressEl.style.width = `${((objectOrder.indexOf(key) + 1) / objectOrder.length) * 100}%`;
    if (objectSideNote) {
      objectSideNote.innerHTML = data.side.map((line) => `<span>${line}</span>`).join('');
    }

    objectStates.forEach((button, i) => {
      const state = data.states[i];
      button.hidden = !state;
      button.textContent = state ? state.label : '';
      button.classList.toggle('is-active', i === currentObjectState);
      button.setAttribute('aria-pressed', i === currentObjectState ? 'true' : 'false');
    });

    showObjectImage(data.states[currentObjectState], animate);

    if (animate && anatomyInfo && !reduceMotion) {
      anatomyInfo.animate(
        [
          { opacity: 0.35, transform: 'translateY(9px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: 450, easing: 'cubic-bezier(.22,.61,.36,1)' }
      );
    }
  };

  if (objectTabs.length && objectPanel) {
    objectTabs.forEach((tab) => {
      tab.addEventListener('click', () => renderObject(tab.dataset.object, 0));
      tab.addEventListener('keydown', (e) => {
        const i = objectOrder.indexOf(tab.dataset.object);
        let next = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % objectOrder.length;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + objectOrder.length) % objectOrder.length;
        if (e.key === 'Home') next = 0;
        if (e.key === 'End') next = objectOrder.length - 1;
        if (next === null) return;
        e.preventDefault();
        renderObject(objectOrder[next], 0);
        objectTabs[next].focus();
      });
    });

    objectStates.forEach((button, index) => {
      button.addEventListener('click', () => {
        currentObjectState = index;
        objectStates.forEach((b, i) => {
          b.classList.toggle('is-active', i === index);
          b.setAttribute('aria-pressed', i === index ? 'true' : 'false');
        });
        showObjectImage(objectData[currentObjectKey].states[index]);
      });
    });

    const stepObject = (dir) => {
      const i = objectOrder.indexOf(currentObjectKey);
      const next = (i + dir + objectOrder.length) % objectOrder.length;
      renderObject(objectOrder[next], 0);
    };
    const prev = $('#objectPrev');
    const next = $('#objectNext');
    if (prev) prev.addEventListener('click', () => stepObject(-1));
    if (next) next.addEventListener('click', () => stepObject(1));

    objectPanel.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepObject(-1);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepObject(1);
      }
    });

    renderObject('camera', 0, false);
    setTimeout(preloadObjectImages, 900);
  }

  /* ---------------------------------------------------------
     7. Hotspots
     --------------------------------------------------------- */
  const hotspotsData = [
    {
      kicker: 'NODE / 01',
      title: '观测窗',
      body: '相机镜头与取景器，对准想要抵达的时间节点。镜头把世界框进一个矩形，快门把流动的时间切成一个瞬间。',
      material: 'MATERIAL / 相机镜头 · 取景器',
      func: 'FUNCTION / 观测 · 瞄准',
    },
    {
      kicker: 'NODE / 02',
      title: '牵引索',
      body: '蓝色渔轮与鱼线，锚定、拉扯不同时空的坐标。收放之间，远处的未知被拉回掌心。',
      material: 'MATERIAL / 渔轮 · 鱼线',
      func: 'FUNCTION / 锚定 · 拉扯',
    },
    {
      kicker: 'NODE / 03',
      title: '控制台',
      body: '手柄的摇杆与按键，对应选择坐标、确认跃迁。时空穿梭像一场游戏，操控者主动开启下一次跃迁。',
      material: 'MATERIAL / 手柄 · 按键',
      func: 'FUNCTION / 选择 · 确认',
    },
    {
      kicker: 'NODE / 04',
      title: '能量口',
      body: '玩具枪的枪管与弹匣，把发射的动作翻译成推进。它是玩具，不是武器；这场穿越是幻想式的启航。',
      material: 'MATERIAL / 枪管 · 弹簧机构',
      func: 'FUNCTION / 推进 · 发射',
    },
    {
      kicker: 'NODE / 05',
      title: '记忆核心',
      body: '裸露的电路板与排线，不隐藏接口和焊点。重组过程本身就是造型，机器保留“未完成”的状态。',
      material: 'MATERIAL / 电路板 · 排线',
      func: 'FUNCTION / 记忆 · 连接',
    },
    {
      kicker: 'NODE / 06',
      title: '时间之网',
      body: '麻绳与渔网把散落的零件打成结。网眼是节点，绳结是时间的褶皱；所有时刻彼此勾连，无法完全割裂。',
      material: 'MATERIAL / 渔网 · 麻绳',
      func: 'FUNCTION / 打结 · 牵连',
    },
    {
      kicker: 'NODE / 07',
      title: '曲面舞台',
      body: '48 层白色层板托住一台倾斜的机器。它不是地面，而是被弯曲的时间；也是相对论式时空曲面的微缩模型。',
      material: 'MATERIAL / 层叠纸板 · 白色喷涂',
      func: 'FUNCTION / 承托 · 弯曲',
    },
  ];

  const hotspotKicker = $('#hotspotKicker');
  const hotspotTitle = $('#hotspotTitle');
  const hotspotBody = $('#hotspotBody');
  const hotspotMaterial = $('#hotspotMaterial');
  const hotspotFunction = $('#hotspotFunction');
  const hotspotProgressBar = $('#hotspotProgressBar');
  const hotspotButtons = $$('.hotspot');
  let activeHotspot = 1;

  const renderHotspot = (index) => {
    activeHotspot = (index + hotspotsData.length) % hotspotsData.length;
    const data = hotspotsData[activeHotspot];
    if (hotspotKicker) hotspotKicker.textContent = data.kicker;
    if (hotspotTitle) hotspotTitle.textContent = data.title;
    if (hotspotBody) hotspotBody.textContent = data.body;
    if (hotspotMaterial) hotspotMaterial.textContent = data.material;
    if (hotspotFunction) hotspotFunction.textContent = data.func;
    if (hotspotProgressBar) hotspotProgressBar.style.width = `${((activeHotspot + 1) / hotspotsData.length) * 100}%`;
    hotspotButtons.forEach((button) => {
      const active = Number(button.dataset.hotspot) === activeHotspot;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const panel = $('.hotspot-panel');
    if (panel && !reduceMotion) {
      panel.animate(
        [{ opacity: 0.55 }, { opacity: 1 }],
        { duration: 320, easing: 'ease-out' }
      );
    }
  };

  hotspotButtons.forEach((button) => {
    button.addEventListener('click', () => renderHotspot(Number(button.dataset.hotspot)));
  });
  const hotspotCycle = $('#hotspotCycle');
  if (hotspotCycle) {
    hotspotCycle.addEventListener('click', () => renderHotspot(activeHotspot + 1));
    renderHotspot(1);
  }

  /* ---------------------------------------------------------
     8. Orbit video / drag to turn
     --------------------------------------------------------- */
  const orbitFrame = $('#orbitFrame');
  const orbitVideo = $('#orbitVideo');
  const orbitPlay = $('#orbitPlay');
  const orbitTime = $('#orbitTime');
  const orbitProgress = $('#orbitProgress');
  const orbitHint = $('#orbitHint');

  if (orbitFrame && orbitVideo) {
    orbitFrame.tabIndex = 0;
    orbitFrame.setAttribute('role', 'group');
    orbitFrame.setAttribute('aria-label', '模型旋转影像，左右拖动查看');
    let dragging = false;
    let wasPlaying = false;
    let startX = 0;
    let startTime = 0;
    let userTouched = false;

    const updateOrbitTime = () => {
      const duration = Number.isFinite(orbitVideo.duration) ? orbitVideo.duration : 0;
      const current = orbitVideo.currentTime || 0;
      if (orbitTime) orbitTime.textContent = `${fmtTime(current)} — ${fmtTime(duration)}`;
      if (orbitProgress) {
        orbitProgress.style.width = duration ? `${clamp(current / duration, 0, 1) * 100}%` : '0%';
      }
    };

    const setPlayState = (playing) => {
      if (orbitPlay) {
        orbitPlay.classList.toggle('is-paused', !playing);
        orbitPlay.setAttribute('aria-label', playing ? '暂停旋转影像' : '播放旋转影像');
      }
    };

    const playVideo = () => {
      if (!orbitVideo.paused) return;
      const promise = orbitVideo.play();
      if (promise && promise.catch) promise.catch(() => setPlayState(false));
    };

    const pauseVideo = () => {
      if (!orbitVideo.paused) orbitVideo.pause();
    };

    orbitVideo.addEventListener('loadedmetadata', updateOrbitTime);
    orbitVideo.addEventListener('timeupdate', updateOrbitTime);
    orbitVideo.addEventListener('play', () => setPlayState(true));
    orbitVideo.addEventListener('pause', () => setPlayState(false));

    if (orbitPlay) {
      orbitPlay.addEventListener('click', () => {
        if (orbitVideo.paused) playVideo();
        else pauseVideo();
      });
    }

    orbitFrame.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.orbit-play')) return;
      dragging = true;
      wasPlaying = !orbitVideo.paused;
      pauseVideo();
      startX = e.clientX;
      startTime = orbitVideo.currentTime;
      orbitFrame.classList.add('is-dragging', 'is-touched');
      if (orbitHint) orbitHint.style.opacity = '0';
      if (orbitFrame.setPointerCapture) {
        try { orbitFrame.setPointerCapture(e.pointerId); } catch (err) { /* no-op */ }
      }
    });

    orbitFrame.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const rect = orbitFrame.getBoundingClientRect();
      const delta = (e.clientX - startX) / Math.max(1, rect.width);
      const duration = Number.isFinite(orbitVideo.duration) ? orbitVideo.duration : 5;
      orbitVideo.currentTime = clamp(startTime + delta * duration * 1.3, 0, duration);
      updateOrbitTime();
      if (e.cancelable) e.preventDefault();
    }, { passive: false });

    const endDrag = () => {
      if (!dragging) return;
      dragging = false;
      orbitFrame.classList.remove('is-dragging');
      if (wasPlaying) playVideo();
    };
    orbitFrame.addEventListener('pointerup', endDrag);
    orbitFrame.addEventListener('pointercancel', endDrag);
    orbitFrame.addEventListener('lostpointercapture', endDrag);

    orbitFrame.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        orbitVideo.paused ? playVideo() : pauseVideo();
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        orbitVideo.currentTime = clamp(orbitVideo.currentTime + 0.5, 0, orbitVideo.duration || 5);
        updateOrbitTime();
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        orbitVideo.currentTime = clamp(orbitVideo.currentTime - 0.5, 0, orbitVideo.duration || 5);
        updateOrbitTime();
      }
    });

    if ('IntersectionObserver' in window) {
      const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.35) {
            if (!reduceMotion && !userTouched) playVideo();
          } else {
            pauseVideo();
          }
        });
      }, { threshold: [0, 0.35, 0.7] });
      videoObserver.observe(orbitFrame);
    }
    orbitFrame.addEventListener('pointerdown', () => { userTouched = true; });
    updateOrbitTime();
  }

  /* ---------------------------------------------------------
     9. Lightbox
     --------------------------------------------------------- */
  const lightbox = $('#lightbox');
  const lightboxImg = $('#lightboxImg');
  const lightboxCaption = $('#lightboxCaption');
  const lightboxCount = $('#lightboxCount');
  const lightboxClose = $('#lightboxClose');
  const lightboxPrev = $('#lightboxPrev');
  const lightboxNext = $('#lightboxNext');
  let lbItems = [];
  let lbIndex = 0;
  let lbReturnFocus = null;

  const showLightboxItem = (index) => {
    if (!lbItems.length || !lightboxImg) return;
    lbIndex = (index + lbItems.length) % lbItems.length;
    const item = lbItems[lbIndex];
    lightboxImg.src = item.src;
    lightboxImg.alt = item.alt || item.caption || '';
    if (lightboxCaption) lightboxCaption.textContent = item.caption || '';
    if (lightboxCount) lightboxCount.textContent = `${pad(lbIndex + 1)} / ${pad(lbItems.length)}`;
    if (lightboxPrev) lightboxPrev.hidden = lbItems.length < 2;
    if (lightboxNext) lightboxNext.hidden = lbItems.length < 2;
  };
  const openLightbox = (items, index = 0, trigger = null) => {
    if (!lightbox || !items.length) return;
    lbItems = items;
    lbReturnFocus = trigger || document.activeElement;
    showLightboxItem(index);
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('menu-open', 'lightbox-open');
    if (lightboxClose) lightboxClose.focus({ preventScroll: true });
  };

  const closeLightbox = () => {
    if (!lightbox || !lightbox.classList.contains('is-open')) return;
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('menu-open', 'lightbox-open');
    if (lbReturnFocus) lbReturnFocus.focus({ preventScroll: true });
  };

  $$('.final-gallery [data-lightbox-trigger]').forEach((button) => {
    button.addEventListener('click', () => {
      const group = button.dataset.gallery || 'final';
      const buttons = $$('[data-lightbox-trigger]').filter((b) => b.dataset.gallery === group && b.dataset.src);
      const items = buttons.map((b) => {
        const img = b.querySelector('img');
        return {
          src: b.dataset.src,
          caption: b.dataset.caption || (img ? img.alt : ''),
          alt: img ? img.alt : '',
        };
      });
      openLightbox(items, buttons.indexOf(button), button);
    });
  });

  const terrainExpandBtn = $('.expand-btn');
  if (terrainExpandBtn) {
    terrainExpandBtn.addEventListener('click', () => {
      const img = $('#terrainMain');
      if (!img) return;
      openLightbox([{ src: terrainCurrent.src, caption: terrainCurrent.caption, alt: img.alt }], 0, terrainExpandBtn);
    });
  }

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightboxPrev) lightboxPrev.addEventListener('click', () => showLightboxItem(lbIndex - 1));
  if (lightboxNext) lightboxNext.addEventListener('click', () => showLightboxItem(lbIndex + 1));
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });
    lightbox.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const focusables = [lightboxClose, lightboxPrev, lightboxNext].filter((el) => el && !el.hidden);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }
  document.addEventListener('keydown', (e) => {
    if (!lightbox || !lightbox.classList.contains('is-open')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      showLightboxItem(lbIndex - 1);
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      showLightboxItem(lbIndex + 1);
    }
  });

  /* ---------------------------------------------------------
     10. Misc: lazy anchor offset + hero cursor
     --------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      closeMenu(false);
      const top = target.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
      try { history.replaceState(null, '', id); } catch (err) { /* file:// fallback */ }
      window.setTimeout(() => {
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }, reduceMotion ? 0 : 700);
    });
  });

  window.addEventListener('load', () => {
    updateScrollUI();
  });
})();
