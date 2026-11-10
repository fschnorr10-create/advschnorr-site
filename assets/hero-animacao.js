/* Animação decorativa com reprodução opcional e controle acessível de pausa. */
(() => {
  'use strict';

  const animation = document.getElementById('schnorr-hero-animation');
  const toggle = document.getElementById('schnorr-hero-animation-toggle');
  if (!(animation instanceof HTMLVideoElement) || !(toggle instanceof HTMLButtonElement)) return;

  const motionPreference = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  let playbackRequest = 0;

  function automaticPlaybackAllowed() {
    return !motionPreference?.matches && !connection?.saveData;
  }

  function updateToggle() {
    toggle.textContent = animation.paused ? 'Reproduzir animação' : 'Pausar animação';
    toggle.setAttribute('aria-label', toggle.textContent);
  }

  function pauseAnimation() {
    playbackRequest += 1;
    animation.pause();
    updateToggle();
  }

  async function playAnimation(userInitiated = false) {
    if (!userInitiated && !automaticPlaybackAllowed()) return;
    const request = ++playbackRequest;
    animation.muted = true;
    try {
      await animation.play();
      // Uma preferência ou uma pausa pode ter mudado enquanto o navegador carregava.
      if (request !== playbackRequest || (!userInitiated && !automaticPlaybackAllowed())) {
        animation.pause();
      }
    } catch {
      if (request !== playbackRequest) return;
      animation.pause();
      // Restabelece a capa quando o navegador recusa autoplay ou a mídia está indisponível.
      animation.load();
    }
    updateToggle();
  }

  function handlePreferenceChange() {
    if (!automaticPlaybackAllowed()) pauseAnimation();
  }

  toggle.addEventListener('click', () => {
    if (animation.paused) void playAnimation(true);
    else pauseAnimation();
  });
  animation.addEventListener('play', updateToggle);
  animation.addEventListener('pause', updateToggle);
  animation.addEventListener('error', updateToggle);

  if (motionPreference?.addEventListener) {
    motionPreference.addEventListener('change', handlePreferenceChange);
  } else if (motionPreference?.addListener) {
    motionPreference.addListener(handlePreferenceChange);
  }
  connection?.addEventListener?.('change', handlePreferenceChange);

  toggle.hidden = false;
  updateToggle();
  if (automaticPlaybackAllowed()) void playAnimation();
})();
