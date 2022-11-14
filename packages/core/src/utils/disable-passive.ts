export let DISABLE_PASSIVE: boolean | AddEventListenerOptions = true;

try {
  // @ts-expect-error https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener#safely_detecting_option_support
  window.addEventListener('test', null, {
    get passive() {
      DISABLE_PASSIVE = { passive: false };
      return true;
    },
  });
} catch {}
