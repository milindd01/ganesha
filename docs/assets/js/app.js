(() => {
  const YEARS = Array.from({ length: 26 }, (_, i) => 2001 + i);
  const rawMedia = window.GANESH_PHOTOS || {};
  const rawDecorations = window.GANESH_DECORATIONS || [];
  const selfieView = document.getElementById('selfieView');
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
  const selfieVideo = document.getElementById('selfieVideo');
  const selfiePreview = document.getElementById('selfiePreview');
  const selfieCanvas = document.getElementById('selfieCanvas');
  const selfiePlaceholder = document.getElementById('selfiePlaceholder');
  const selfieStatus = document.getElementById('selfieStatus');
  const startSelfieCameraButton = document.getElementById('startSelfieCamera');
  const captureSelfieButton = document.getElementById('captureSelfie');
  const retakeSelfieButton = document.getElementById('retakeSelfie');
  const saveSelfieButton = document.getElementById('saveSelfie');

  let currentYear = 2026;
  let currentList = [];
  let currentIndex = 0;
  let slideshowTimer = null;
  let idleTimer = null;
  let slideshowSequence = [];
  let slideshowSequenceIndex = 0;
  let touchStartX = 0;
  let slideshowMode = 'all-years';
  let selfieStream = null;
  let selfieImageUrl = '';

  function clearIdleTimer() {
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  }

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
    [selfieView, homeView, yearsView, galleryView].forEach(v => v.classList.remove('active'));
    if (view !== selfieView) stopSelfieCamera();
    view.classList.add('active');
    resetIdle();
  }

  function setSelfieStatus(message) {
    selfieStatus.textContent = message;
  }

  function resetSelfieStage() {
    selfiePreview.classList.add('hidden');
    selfiePreview.removeAttribute('src');
    selfieVideo.classList.add('hidden');
    selfiePlaceholder.classList.remove('hidden');
    captureSelfieButton.classList.add('hidden');
    retakeSelfieButton.classList.add('hidden');
    saveSelfieButton.classList.add('hidden');
    if (selfieImageUrl) {
      URL.revokeObjectURL(selfieImageUrl);
      selfieImageUrl = '';
    }
  }

  function stopSelfieCamera() {
    if (selfieStream) {
      selfieStream.getTracks().forEach(track => track.stop());
      selfieStream = null;
    }
    selfieVideo.pause();
    selfieVideo.srcObject = null;
    startSelfieCameraButton.textContent = 'Start Camera';
  }

  async function startSelfieCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setSelfieStatus('This browser does not support the camera.');
      return;
    }
    try {
      stopSelfieCamera();
      resetSelfieStage();
      selfieStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false
      });
      selfieVideo.srcObject = selfieStream;
      selfiePlaceholder.classList.add('hidden');
      selfieVideo.classList.remove('hidden');
      captureSelfieButton.classList.remove('hidden');
      startSelfieCameraButton.textContent = 'Restart Camera';
      setSelfieStatus('Position yourself, then tap Capture.');
    } catch (error) {
      setSelfieStatus('Camera access was not allowed. Please allow camera access and try again.');
    }
  }

  function showSelfieView() {
    showView(selfieView);
    resetSelfieStage();
    stopSelfieCamera();
    setSelfieStatus('Ready when you are.');
  }

  function captureSelfie() {
    if (!selfieStream || !selfieVideo.videoWidth || !selfieVideo.videoHeight) {
      setSelfieStatus('Start the camera first.');
      return;
    }
    selfieCanvas.width = selfieVideo.videoWidth;
    selfieCanvas.height = selfieVideo.videoHeight;
    const context = selfieCanvas.getContext('2d');
    context.drawImage(selfieVideo, 0, 0, selfieCanvas.width, selfieCanvas.height);
    if (selfieImageUrl) URL.revokeObjectURL(selfieImageUrl);
    selfieImageUrl = selfieCanvas.toDataURL('image/jpeg', 0.92);
    selfiePreview.src = selfieImageUrl;
    selfiePreview.classList.remove('hidden');
    selfieVideo.classList.add('hidden');
    captureSelfieButton.classList.add('hidden');
    retakeSelfieButton.classList.remove('hidden');
    saveSelfieButton.classList.remove('hidden');
    setSelfieStatus('Selfie captured. Save it or retake it.');
  }

  async function saveSelfie() {
    if (!selfieCanvas.width || !selfieCanvas.height) {
      setSelfieStatus('Capture a selfie first.');
      return;
    }
    const blob = await new Promise(resolve => selfieCanvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob) {
      setSelfieStatus('Could not create the selfie image.');
      return;
    }
    const filename = `ganesh-selfie-${new Date().toISOString().slice(0, 10)}.jpg`;
    const file = new File([blob], filename, { type: 'image/jpeg' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Ganesh Selfie' });
        setSelfieStatus('Shared successfully.');
        return;
      } catch (error) {
        if (error && error.name === 'AbortError') {
          setSelfieStatus('Share canceled.');
          return;
        }
      }
    }
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    setSelfieStatus('Saved to this device.');
  }

  function buildYears() {
    yearGrid.innerHTML = '';
    if (decorations.length) {
      const decorationCard = document.createElement('button');
      decorationCard.className = 'year-card special-card';
      decorationCard.innerHTML = `<strong>Decorations</strong><span>${decorations.length} years of decor</span>`;
      decorationCard.addEventListener('click', startDecorationsSlideshow);
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

  function buildDecorationsSequence() {
    return [...decorations]
      .filter(item => !isVideo(item))
      .sort((a, b) => Number.parseInt(a.caption, 10) - Number.parseInt(b.caption, 10))
      .map(item => ({
        year: Number.parseInt(item.caption, 10) || 0,
        index: decorations.indexOf(item),
      }));
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
  }

  function openViewer(index) {
    if (!currentList.length) return;
    currentIndex = (index + currentList.length) % currentList.length;
    renderViewer();
    viewer.classList.remove('hidden');
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
    viewer.classList.toggle('decorations-mode', slideshowMode === 'decorations');
    if (isVideo(item)) {
      stopSlideshow();
      viewerImage.classList.add('hidden');
      viewerVideo.classList.remove('hidden');
      viewerVideo.src = item.src;
      if (item.poster) viewerVideo.poster = item.poster;
      else viewerVideo.removeAttribute('poster');
      viewerVideo.load();
    } else {
      clearVideo();
      viewerVideo.classList.add('hidden');
      viewerImage.classList.remove('hidden');
      viewerImage.src = item.src;
      viewerImage.style.transform = '';
    }
    const label = item.caption || `${currentYear}`;
    viewerCaption.textContent = label;
    viewerProgress.textContent = `${label} • ${currentIndex + 1} / ${currentList.length}${isVideo(item) ? ' • Video' : ''}`;
  }

  function nextPhoto(direction = 1) {
    if (!currentList.length) return;
    currentIndex = (currentIndex + direction + currentList.length) % currentList.length;
    renderViewer();
  }

  function stopSlideshow() {
    if (slideshowTimer) clearInterval(slideshowTimer);
    slideshowTimer = null;
    slideshowMode = 'all-years';
    viewer.classList.remove('decorations-mode');
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
    clearIdleTimer();
    stopSlideshow();
    slideshowMode = 'all-years';
    slideshowSequence = buildSequence();
    if (!slideshowSequence.length) return;
    slideshowSequenceIndex = 0;
    showSequenceItem();
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

  function startDecorationsSlideshow() {
    clearIdleTimer();
    stopSlideshow();
    currentYear = 0;
    currentList = decorations;
    if (!currentList.length) return;
    slideshowMode = 'decorations';
    slideshowSequence = buildDecorationsSequence();
    if (!slideshowSequence.length) return;
    slideshowSequenceIndex = 0;
    showSequenceItem();
    document.getElementById('viewerPlay').textContent = 'Ⅱ';
    slideshowTimer = setInterval(() => {
      slideshowSequenceIndex = (slideshowSequenceIndex + 1) % slideshowSequence.length;
      showSequenceItem();
    }, 2500);
  }

  function showSequenceItem() {
    const seq = slideshowSequence[slideshowSequenceIndex];
    currentYear = seq.year;
    currentList = slideshowMode === 'decorations' ? decorations : (media[currentYear] || []);
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
    clearIdleTimer();
    if (selfieView.classList.contains('active')) return;
    if (!slideshowTimer && viewerVideo.paused) idleTimer = setTimeout(startAllYearsSlideshow, 10000);
  }

  document.getElementById('enterGallery').addEventListener('click', () => showView(yearsView));
  document.getElementById('startDecorations').addEventListener('click', startDecorationsSlideshow);
  document.getElementById('showSelfieView').addEventListener('click', showSelfieView);
  document.querySelectorAll('[data-action="home"]').forEach(b => b.addEventListener('click', () => showView(homeView)));
  document.querySelectorAll('[data-action="years"]').forEach(b => b.addEventListener('click', () => showView(yearsView)));
  document.getElementById('startSlideshow').addEventListener('click', startAllYearsSlideshow);
  document.getElementById('gallerySlideshow').addEventListener('click', startAllYearsSlideshow);
  startSelfieCameraButton.addEventListener('click', startSelfieCamera);
  captureSelfieButton.addEventListener('click', captureSelfie);
  retakeSelfieButton.addEventListener('click', startSelfieCamera);
  saveSelfieButton.addEventListener('click', saveSelfie);
  document.querySelector('.viewer-close').addEventListener('click', () => { stopSlideshow(); clearVideo(); viewer.classList.add('hidden'); resetIdle(); });
  document.querySelector('.nav-button.prev').addEventListener('click', () => { stopSlideshow(); nextPhoto(-1); resetIdle(); });
  document.querySelector('.nav-button.next').addEventListener('click', () => { stopSlideshow(); nextPhoto(1); resetIdle(); });
  document.getElementById('viewerPlay').addEventListener('click', () => {
    if (slideshowTimer) {
      stopSlideshow();
      return;
    }
    if (currentList === decorations || slideshowMode === 'decorations') {
      startDecorationsSlideshow();
      return;
    }
    startAllYearsSlideshow();
  });
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
