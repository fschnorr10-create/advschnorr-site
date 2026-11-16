/* Animação decorativa com reprodução automática, sem controle de pausa. */
(() => {
  'use strict';

  const animation = document.getElementById('schnorr-hero-animation');
  if (!(animation instanceof HTMLVideoElement)) return;

  const motionPreference = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  let playbackRequest = 0;

  function automaticPlaybackAllowed() {
    return !motionPreference?.matches && !connection?.saveData;
  }

  function pauseAnimation() {
    playbackRequest += 1;
    animation.pause();
  }

  async function playAnimation() {
    if (!automaticPlaybackAllowed()) return;
    const request = ++playbackRequest;
    animation.muted = true;
    try {
      await animation.play();
      // Uma preferência pode ter mudado enquanto o navegador carregava.
      if (request !== playbackRequest || !automaticPlaybackAllowed()) {
        animation.pause();
      }
    } catch {
      if (request !== playbackRequest) return;
      animation.pause();
      // Restabelece a capa quando o navegador recusa autoplay ou a mídia está indisponível.
      animation.load();
    }
  }

  function handlePreferenceChange() {
    if (!automaticPlaybackAllowed()) pauseAnimation();
  }

  if (motionPreference?.addEventListener) {
    motionPreference.addEventListener('change', handlePreferenceChange);
  } else if (motionPreference?.addListener) {
    motionPreference.addListener(handlePreferenceChange);
  }
  connection?.addEventListener?.('change', handlePreferenceChange);

  if (automaticPlaybackAllowed()) void playAnimation();
})();
