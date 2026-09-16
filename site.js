// Photo links still work when JavaScript or the dialog API is unavailable.
(() => {
  const nav = document.querySelector('.nav');
  const updateNavOffset = () => document.documentElement.style.setProperty('--nav-height', `${nav.offsetHeight}px`);
  updateNavOffset();
  if ('ResizeObserver' in window) new ResizeObserver(updateNavOffset).observe(nav);
  else window.addEventListener('resize', updateNavOffset);

  const dialog = document.getElementById('lightbox');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const links = [...document.querySelectorAll('[data-lightbox]')];
  const img = document.getElementById('lightbox-img');
  const caption = document.getElementById('lightbox-caption');
  const count = document.getElementById('lightbox-count');
  const media = document.getElementById('lightbox-media');
  const status = document.getElementById('lightbox-status');
  const message = document.getElementById('lightbox-message');
  const retry = document.getElementById('lightbox-retry');
  const close = document.getElementById('lightbox-close');
  let current = 0;
  let opener;
  const setState = state => {
    media.dataset.state = state;
    media.setAttribute('aria-busy', String(state === 'loading'));
    // A successful retry hides its button; keep keyboard focus in the viewer.
    if (state !== 'error' && document.activeElement === retry) close.focus();
    retry.hidden = state !== 'error';
    status.hidden = state === 'ready';
    message.textContent = state === 'loading' ? 'Loading photograph…' :
      state === 'error' ? 'This photograph could not load. Please try again.' : '';
  };
  img.addEventListener('load', () => setState('ready'));
  img.addEventListener('error', () => setState('error'));
  const showPhoto = index => {
    current = (index + links.length) % links.length;
    const link = links[current];
    const thumb = link.querySelector('img');
    const figure = link.closest('figure');
    setState('loading');
    img.alt = thumb.alt;
    img.width = Number(link.dataset.width);
    img.height = Number(link.dataset.height);
    caption.textContent = `${figure.querySelector('.where').textContent} · ${figure.querySelector('.when').textContent}`;
    count.textContent = `${current + 1} / ${links.length}`;
    img.src = link.href;
    // A cached image may be complete before its load event reaches the listener.
    if (img.complete && img.naturalWidth) setState('ready');
  };
  links.forEach((link, index) => {
    link.setAttribute('aria-haspopup', 'dialog');
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      event.preventDefault();
      opener = link;
      showPhoto(index);
      dialog.showModal();
      document.documentElement.classList.add('lightbox-open');
    });
  });
  close.addEventListener('click', () => dialog.close());
  retry.addEventListener('click', () => {
    img.removeAttribute('src');
    showPhoto(current);
  });
  document.getElementById('lightbox-prev').addEventListener('click', () => showPhoto(current - 1));
  document.getElementById('lightbox-next').addEventListener('click', () => showPhoto(current + 1));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'Tab') {
      const buttons = [...dialog.querySelectorAll('button:not([hidden])')];
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      showPhoto(current + (event.key === 'ArrowLeft' ? -1 : 1));
    }
  });
  // Close only when both ends of a click are outside the dialog's rectangle.
  const outside = event => {
    const box = dialog.getBoundingClientRect();
    return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
  };
  let startedOutside = false;
  dialog.addEventListener('pointerdown', event => { startedOutside = outside(event); });
  dialog.addEventListener('click', event => { if (startedOutside && outside(event)) dialog.close(); });
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('lightbox-open');
    if (opener) opener.focus({preventScroll:true});
  });
})();
