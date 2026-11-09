/* Inicializa o vídeo sem obrigar reprodução nem contrariar movimento reduzido. */
(() => {
  'use strict';

  const video = document.getElementById('schnorr-valores-video');
  if (!(video instanceof HTMLVideoElement)) return;

  const motionPreference = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  function retainManualPlayback() {
    video.pause();
    video.dataset.playback = 'manual';
  }

  async function tryAutomaticPlayback() {
    if (motionPreference?.matches) {
      retainManualPlayback();
      return;
    }

    video.muted = true;
    try {
      await video.play();
      video.dataset.playback = 'automatic';
    } catch {
      // A recusa de autoplay é normal. O poster e os controles ficam disponíveis.
      retainManualPlayback();
    }
  }

  function handleMotionPreference(event) {
    if (event.matches) retainManualPlayback();
  }

  if (motionPreference?.addEventListener) {
    motionPreference.addEventListener('change', handleMotionPreference);
  } else if (motionPreference?.addListener) {
    motionPreference.addListener(handleMotionPreference);
  }

  // Sem JavaScript, o HTML já permite reprodução manual pelos controles nativos.
  void tryAutomaticPlayback();
})();
