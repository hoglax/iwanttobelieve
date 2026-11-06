(() => {
  'use strict';
  const form = document.getElementById('access-form');
  const input = document.getElementById('password');
  const submit = document.getElementById('submit');
  const status = document.getElementById('access-status');
  const gate = document.getElementById('gate');
  const viewer = document.getElementById('viewer');
  const show = document.getElementById('show-password');
  const urls = new Set();
  let iframe;
  const bytes = value => Uint8Array.from(atob(value), c => c.charCodeAt(0));
  const makeURL = (data, type) => {
    const url = URL.createObjectURL(new Blob([data], {type}));
    urls.add(url);
    return url;
  };
  const dispose = () => {
    if (iframe) iframe.remove();
    iframe = undefined;
    for (const url of urls) URL.revokeObjectURL(url);
    urls.clear();
    viewer.hidden = true;
    gate.hidden = false;
    document.body.classList.remove('unlocked');
    input.value = '';
    input.type = 'password';
    show.setAttribute('aria-pressed', 'false');
    show.setAttribute('aria-label', 'Показать пароль');
  };
  show.addEventListener('click', () => {
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    show.setAttribute('aria-pressed', String(visible));
    show.setAttribute('aria-label', visible ? 'Скрыть пароль' : 'Показать пароль');
  });
  const lockJS = `(() => {
    const button = document.createElement('button');
    button.className = 'access-lock';
    button.type = 'button';
    button.title = 'Закрыть доступ';
    button.setAttribute('aria-label', 'Закрыть доступ');
    button.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
    button.addEventListener('click', () => parent.postMessage({type:'citycenter-lock'}, location.origin));
    document.querySelector('.header-actions').append(button);
  })();`;
  const lockCSS = `.access-lock{width:30px;height:32px;display:grid;place-items:center;flex-shrink:0;padding:5px;background:none;border:0;border-radius:8px;color:#bba16a;cursor:pointer}.access-lock svg{width:18px;height:18px;stroke:currentColor;stroke-width:1.6}.access-lock:focus-visible{outline:2px solid #dfcea4}@media(max-width:520px){.header-actions{gap:3px!important}.access-lock{width:26px;padding:3px}.site-header{padding-left:14px!important;padding-right:14px!important}.brand-caption{display:none!important}}`;
  function openPresentation(bundle) {
    const files = bundle.files;
    const mapped = new Map();
    const textFiles = [];
    for (const [path, file] of Object.entries(files)) {
      if (/\.(?:html|js|css)$/.test(path)) textFiles.push(path);
      else mapped.set(path, makeURL(bytes(file.data), file.type));
    }
    const rewrite = text => text.replace(/(?:https:\/\/hoglax\.github\.io\/iwanttobelieve\/)?(?:\.\/)?((?:assets|research)\/[\w./-]+)(?:\?[\w%=&.+:-]*)?/g,
      (match, path) => mapped.get(path) || match);
    // Preserve the source photo positioning selectors after images become Blob URLs.
    const rewriteSelectors = text => text.replace(/\[src\^="(assets\/[^"\]]+)"\]/g, (selector, prefix) => {
      const matches = [...mapped].filter(([path]) => path.startsWith(prefix)).map(([, url]) => `[src="${url}"]`);
      return matches.length ? `:is(${matches.join(',')})` : selector;
    });
    textFiles.sort((a, b) => Number(a.endsWith('.html')) - Number(b.endsWith('.html')));
    for (const path of textFiles) {
      let text = new TextDecoder().decode(bytes(files[path].data));
      if (path === 'assets/site.js') text = text.replace("['https:','http:']", "['https:','http:','blob:']");
      if (path.endsWith('.css')) text = rewriteSelectors(text);
      text = rewrite(text);
      if (path === 'index.html') {
        const css = makeURL(lockCSS, 'text/css');
        const js = makeURL(lockJS, 'text/javascript');
        text = text.replace('</head>', `<link rel="stylesheet" href="${css}"></head>`)
          .replace('</body>', `<script defer src="${js}"></script></body>`);
      }
      mapped.set(path, makeURL(text, files[path].type));
    }
    iframe = document.createElement('iframe');
    iframe.title = 'Презентация Сити-Центра';
    iframe.allow = 'fullscreen';
    iframe.allowFullscreen = true;
    iframe.src = mapped.get('index.html');
    viewer.replaceChildren(iframe);
    input.value = '';
    gate.hidden = true;
    viewer.hidden = false;
    document.body.classList.add('unlocked');
  }
  window.addEventListener('message', event => {
    if (event.source === iframe?.contentWindow && event.origin === location.origin && event.data?.type === 'citycenter-lock') {
      dispose();
      status.textContent = 'Доступ закрыт.';
      input.focus();
    }
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submit.disabled || !input.value) return;
    if (!window.crypto?.subtle) {
      status.textContent = 'Откройте ссылку в актуальном браузере по HTTPS.';
      return;
    }
    submit.disabled = true;
    form.setAttribute('aria-busy', 'true');
    input.removeAttribute('aria-invalid');
    status.classList.remove('error');
    status.textContent = 'Открываем презентацию…';
    let decrypted = false;
    let password = input.value.normalize('NFC');
    try {
      const response = await fetch('manifest.json', {cache:'no-store'});
      if (!response.ok) throw new Error('network');
      const manifest = await response.json();
      const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveKey']);
      password = '';
      const key = await crypto.subtle.deriveKey({name:'PBKDF2', hash:'SHA-256', salt:bytes(manifest.salt), iterations:manifest.iterations}, material, {name:'AES-GCM', length:256}, false, ['decrypt']);
      const payload = await fetch(manifest.payload, {cache:'no-store'});
      if (!payload.ok) throw new Error('network');
      const clear = await crypto.subtle.decrypt({name:'AES-GCM', iv:bytes(manifest.iv), additionalData:new TextEncoder().encode('citycenter-protected-v1')}, key, await payload.arrayBuffer());
      decrypted = true;
      const unpacked = fflate.gunzipSync(new Uint8Array(clear));
      const bundle = JSON.parse(new TextDecoder().decode(unpacked));
      openPresentation(bundle);
      status.textContent = '';
    } catch (error) {
      dispose();
      status.classList.add('error');
      if (error.name === 'OperationError' && !decrypted) {
        status.textContent = 'Неверный пароль. Попробуйте ещё раз.';
        input.setAttribute('aria-invalid', 'true');
      } else {
        status.textContent = 'Не удалось открыть презентацию. Обновите страницу и попробуйте ещё раз.';
      }
      input.focus();
    } finally {
      password = '';
      submit.disabled = false;
      form.removeAttribute('aria-busy');
    }
  });
})();
