(() => {
  const YEARS = Array.from({ length: 26 }, (_, i) => 2001 + i);
  const rawMedia = window.GANESH_PHOTOS || {};
  const rawDecorations = window.GANESH_DECORATIONS || [];
  const homeView = document.getElementById('homeView');
  const yearsView = document.getElementById('yearsView');
  const galleryView = document.getElementById('galleryView');
  const yearGrid = document.getElementById('yearGrid');
  const photoGrid = document.getElementById('photoGrid');
  const emptyState = document.getElementById('emptyState');
  const viewer = document.getElementById('viewer');
  const viewerImage = document.getElementById('viewerImage');
  const viewerVideo = document.getElementById('viewerVideo');
  const viewerCaption = document.getElementById('viewerCaption');
  const viewerProgress = document.getElementById('viewerProgress');
  const galleryTitle = document.getElementById('galleryTitle');
  const galleryCount = document.getElementById('galleryCount');
  const rotateLeftButton = document.getElementById('rotateLeft');
  const rotateRightButton = document.getElementById('rotateRight');

  let currentYear = 2026;
  let currentList = [];
  let currentIndex = 0;
  let slideshowTimer = null;
  let idleTimer = null;
  let slideshowSequence = [];
  let slideshowSequenceIndex = 0;
  let touchStartX = 0;
  let currentRotation = 0;

  function detectType(src, explicitType) {
    if (explicitType) return explicitType.toLowerCase();
    return /\.(mp4|m4v|mov|webm)(?:[?#].*)?$/i.test(src || '') ? 'video' : 'image';
  }

  function normalizeItem(item, year) {
    if (typeof item === 'string') {
      const src = item.includes('/') ? item : `photos/${year}/${item}`;
      return { src, type: detectType(src), caption: `${year}` };
    }
    const src = item && item.src ? item.src : '';
    return {
      ...item,
      src,
      type: detectType(src, item && item.type),
      caption: `${year}`
    };
  }

  const media = Object.fromEntries(YEARS.map(year => [year, (rawMedia[year] || []).map(item => normalizeItem(item, year)).filter(item => item.src)]));
  const decorations = rawDecorations.map(item => {
    const year = Number.parseInt(item.caption, 10) || 0;
    return normalizeItem(item, year);
  }).filter(item => item.src);

  function isVideo(item) { return item && item.type === 'video'; }

  function showView(view) {
    [homeView, yearsView, galleryView].forEach(v => v.classList.remove('active'));
    view.classList.add('active');
    resetIdle();
  }

  function buildYears() {
    yearGrid.innerHTML = '';
    if (decorations.length) {
      const decorationCard = document.createElement('button');
      decorationCard.className = 'year-card special-card';
      decorationCard.innerHTML = `<strong>Decorations</strong><span>${decorations.length} years of decor</span>`;
      decorationCard.addEventListener('click', openDecorations);
      yearGrid.appendChild(decorationCard);
    }
    YEARS.forEach(year => {
      const count = (media[year] || []).length;
      const btn = document.createElement('button');
      btn.className = 'year-card' + (year === 2026 ? ' featured' : '');
      const note = year === 2001 ? 'Our Beginning • Sep 2001' : (year === 2026 ? '25th Anniversary' : (count ? `${count} ${count === 1 ? 'memory' : 'memories'}` : 'Add memories'));
      btn.innerHTML = `<strong>${year}</strong><span>${note}</span>`;
      btn.addEventListener('click', () => openYear(year));
      yearGrid.appendChild(btn);
    });
  }

  function openYear(year) {
    currentYear = year;
    currentList = media[year] || [];
    galleryTitle.textContent = `Ganesh ${year}`;
    galleryCount.textContent = currentList.length ? `${currentList.length} memories` : 'Ready for photos & videos';
    photoGrid.innerHTML = '';
    currentList.forEach((item, index) => {
      const btn = document.createElement('button');
      btn.className = 'photo-card' + (isVideo(item) ? ' video-card' : '');
      if (isVideo(item)) {
        const poster = item.poster ? ` poster="${escapeHtml(item.poster)}"` : '';
        btn.innerHTML = `<video src="${escapeHtml(item.src)}"${poster} muted playsinline preload="metadata"></video><span class="video-badge" aria-hidden="true">▶</span>`;
      } else {
        btn.innerHTML = `<img src="${escapeHtml(item.src)}" alt="${currentYear}" loading="lazy">`;
      }
      btn.setAttribute('aria-label', `${isVideo(item) ? 'Play video' : 'Open photo'} from ${year}`);
      btn.addEventListener('click', () => openViewer(index));
      photoGrid.appendChild(btn);
    });
    emptyState.classList.toggle('hidden', currentList.length !== 0);
    showView(galleryView);
  }

  function openDecorations() {
    currentYear = 0;
    currentList = decorations;
    galleryTitle.textContent = 'Decorations Through the Years';
    galleryCount.textContent = currentList.length ? `${currentList.length} decoration highlights` : 'Ready for decoration photos';
    photoGrid.innerHTML = '';
    currentList.forEach((item, index) => {
      const btn = document.createElement('button');
      btn.className = 'photo-card' + (isVideo(item) ? ' video-card' : '');
      if (isVideo(item)) {
        const poster = item.poster ? ` poster="${escapeHtml(item.poster)}"` : '';
        btn.innerHTML = `<video src="${escapeHtml(item.src)}"${poster} muted playsinline preload="metadata"></video><span class="video-badge" aria-hidden="true">▶</span>`;
      } else {
        btn.innerHTML = `<img src="${escapeHtml(item.src)}" alt="${escapeHtml(item.caption)} decorations" loading="lazy">`;
      }
      btn.setAttribute('aria-label', `${isVideo(item) ? 'Play decoration video' : 'Open decoration photo'} from ${item.caption}`);
      btn.addEventListener('click', () => openViewer(index));
      photoGrid.appendChild(btn);
    });
    emptyState.classList.toggle('hidden', currentList.length !== 0);
    showView(galleryView);
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  }

  function openViewer(index) {
    if (!currentList.length) return;
    currentIndex = (index + currentList.length) % currentList.length;
    currentRotation = 0;
    renderViewer();
    viewer.classList.remove('hidden');
    resetIdle();
  }

  function applyRotation() {
    viewerImage.style.transform = `rotate(${currentRotation}deg)`;
  }

  function rotateCurrentPhoto(direction) {
    const item = currentList[currentIndex];
    if (!item || isVideo(item)) return;
    currentRotation = (currentRotation + direction + 360) % 360;
    applyRotation();
    resetIdle();
  }

  function clearVideo() {
    if (!viewerVideo.paused) viewerVideo.pause();
    viewerVideo.removeAttribute('src');
    viewerVideo.removeAttribute('poster');
    viewerVideo.load();
  }

  function renderViewer() {
    const item = currentList[currentIndex];
    if (!item) return;
    if (isVideo(item)) {
      stopSlideshow();
      viewerImage.classList.add('hidden');
      viewerVideo.classList.remove('hidden');
      currentRotation = 0;
      viewerImage.style.transform = '';
      viewerVideo.src = item.src;
      if (item.poster) viewerVideo.poster = item.poster;
      else viewerVideo.removeAttribute('poster');
      viewerVideo.load();
    } else {
      clearVideo();
      viewerVideo.classList.add('hidden');
      viewerImage.classList.remove('hidden');
      viewerImage.src = item.src;
      applyRotation();
    }
    const label = item.caption || `${currentYear}`;
    viewerCaption.textContent = label;
    viewerProgress.textContent = `${label} • ${currentIndex + 1} / ${currentList.length}${isVideo(item) ? ' • Video' : ''}`;
  }

  function nextPhoto(direction = 1) {
    if (!currentList.length) return;
    currentIndex = (currentIndex + direction + currentList.length) % currentList.length;
    currentRotation = 0;
    renderViewer();
  }

  function stopSlideshow() {
    if (slideshowTimer) clearInterval(slideshowTimer);
    slideshowTimer = null;
    document.getElementById('viewerPlay').textContent = '▶';
  }

  function shuffleItems(items) {
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  function buildSequence() {
    return shuffleItems(
      YEARS.flatMap(year => (media[year] || []).map((item, index) => ({ year, item, index })).filter(entry => !isVideo(entry.item)))
    );
  }

  function prefetchAllMedia() {
    const sources = [...new Set(YEARS.flatMap(year => (media[year] || []).flatMap(item => [item.src, item.poster]).filter(Boolean)) )];
    sources.forEach(src => fetch(src, { cache: 'reload' }).catch(() => {}));
  }

  function startAllYearsSlideshow() {
    slideshowSequence = buildSequence();
    if (!slideshowSequence.length) return;
    slideshowSequenceIndex = 0;
    showSequenceItem();
    stopSlideshow();
    document.getElementById('viewerPlay').textContent = 'Ⅱ';
    slideshowTimer = setInterval(() => {
      slideshowSequenceIndex += 1;
      if (slideshowSequenceIndex >= slideshowSequence.length) {
        slideshowSequence = buildSequence();
        slideshowSequenceIndex = 0;
      }
      showSequenceItem();
    }, 6000);
  }

  function showSequenceItem() {
    const seq = slideshowSequence[slideshowSequenceIndex];
    currentYear = seq.year;
    currentList = media[currentYear] || [];
    currentIndex = seq.index;
    renderViewer();
    viewer.classList.remove('hidden');
  }

  function startCurrentYearSlideshow() {
    const imageIndexes = currentList.map((item, index) => ({ item, index })).filter(entry => !isVideo(entry.item)).map(entry => entry.index);
    if (!imageIndexes.length) return startAllYearsSlideshow();
    let position = Math.max(0, imageIndexes.indexOf(currentIndex));
    currentIndex = imageIndexes[position];
    renderViewer();
    viewer.classList.remove('hidden');
    stopSlideshow();
    document.getElementById('viewerPlay').textContent = 'Ⅱ';
    slideshowTimer = setInterval(() => {
      position = (position + 1) % imageIndexes.length;
      currentIndex = imageIndexes[position];
      renderViewer();
    }, 6000);
  }

  function resetIdle() {
    if (idleTimer) clearTimeout(idleTimer);
    if (!slideshowTimer && viewerVideo.paused) idleTimer = setTimeout(startAllYearsSlideshow, 10000);
  }

  document.getElementById('enterGallery').addEventListener('click', () => showView(yearsView));
  document.querySelectorAll('[data-action="home"]').forEach(b => b.addEventListener('click', () => showView(homeView)));
  document.querySelectorAll('[data-action="years"]').forEach(b => b.addEventListener('click', () => showView(yearsView)));
  document.getElementById('startSlideshow').addEventListener('click', startAllYearsSlideshow);
  document.getElementById('gallerySlideshow').addEventListener('click', startAllYearsSlideshow);
  document.querySelector('.viewer-close').addEventListener('click', () => { stopSlideshow(); clearVideo(); viewer.classList.add('hidden'); resetIdle(); });
  document.querySelector('.nav-button.prev').addEventListener('click', () => { stopSlideshow(); nextPhoto(-1); resetIdle(); });
  document.querySelector('.nav-button.next').addEventListener('click', () => { stopSlideshow(); nextPhoto(1); resetIdle(); });
  document.getElementById('viewerPlay').addEventListener('click', () => slideshowTimer ? stopSlideshow() : startAllYearsSlideshow());
  rotateLeftButton.addEventListener('click', () => rotateCurrentPhoto(-90));
  rotateRightButton.addEventListener('click', () => rotateCurrentPhoto(90));

  viewerVideo.addEventListener('play', () => { stopSlideshow(); if (idleTimer) clearTimeout(idleTimer); });
  viewerVideo.addEventListener('pause', resetIdle);
  viewerVideo.addEventListener('ended', resetIdle);

  viewer.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
  viewer.addEventListener('touchend', e => {
    if (!viewerVideo.classList.contains('hidden') && !viewerVideo.paused) return;
    const dx = e.changedTouches[0].screenX - touchStartX;
    if (Math.abs(dx) > 45) { stopSlideshow(); nextPhoto(dx < 0 ? 1 : -1); }
    resetIdle();
  }, { passive: true });

  ['touchstart','mousedown','keydown','pointerdown'].forEach(evt => document.addEventListener(evt, resetIdle, { passive: true }));

  buildYears();
  prefetchAllMedia();
  resetIdle();
})();
