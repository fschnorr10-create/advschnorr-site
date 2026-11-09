/* Interações progressivas: o conteúdo e seus links funcionam sem JavaScript. */
'use strict';
(() => {
  const grid = document.getElementById('posts-grid');
  if (grid) {
    const search = document.getElementById('article-search');
    const cards = Array.from(grid.querySelectorAll('.post-card'));
    const chips = Array.from(document.querySelectorAll('.filter-chip'));
    const count = document.getElementById('result-count');
    const empty = document.getElementById('no-results');
    const reset = document.getElementById('reset-filters');
    const more = document.getElementById('load-more');
    const featured = document.getElementById('featured-section');
    const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
    let selected = 'all';
    let limit = 9;
    function render() {
      const query = normalize(search.value);
      const filtered = cards.filter(card => (selected === 'all' || card.dataset.category === selected) && normalize(card.dataset.search || card.textContent).includes(query));
      const visible = new Set(filtered.slice(0, limit));
      cards.forEach(card => { card.hidden = !visible.has(card); });
      chips.forEach(chip => {
        const active = chip.dataset.category === selected;
        chip.classList.toggle('active', active);
        chip.setAttribute('aria-pressed', String(active));
      });
      const filtering = query.length > 0 || selected !== 'all';
      if (featured) featured.hidden = filtering;
      if (reset) reset.hidden = !filtering;
      if (empty) empty.hidden = filtered.length !== 0 || cards.length === 0;
      if (more) more.hidden = filtered.length <= limit;
      if (count) count.textContent = `${filtered.length} ${filtered.length === 1 ? 'artigo encontrado' : 'artigos encontrados'}`;
    }
    function clear() { selected = 'all'; search.value = ''; limit = 9; render(); }
    chips.forEach(chip => chip.addEventListener('click', () => { selected = chip.dataset.category || 'all'; limit = 9; render(); }));
    search.addEventListener('input', () => { limit = 9; render(); });
    search.addEventListener('keydown', event => { if (event.key === 'Escape') clear(); });
    reset?.addEventListener('click', clear);
    document.getElementById('reset-empty')?.addEventListener('click', clear);
    more?.addEventListener('click', () => { limit += 9; render(); });
    render();
  }
  const article = document.getElementById('article-content');
  if (article) {
    const list = document.getElementById('toc-list');
    const headings = Array.from(article.querySelectorAll('h2')).filter(heading => heading.id !== 'sources-title');
    headings.forEach((heading, index) => {
      if (!heading.id) heading.id = `secao-${index + 1}`;
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent;
      item.appendChild(link);
      list?.appendChild(item);
    });
    if (!headings.length) document.getElementById('article-toc')?.setAttribute('hidden', '');
    const progress = document.getElementById('reading-progress');
    let scheduled = false;
    function updateProgress() {
      const bounds = article.getBoundingClientRect();
      const start = window.scrollY + bounds.top;
      const total = Math.max(1, bounds.height - window.innerHeight * .5);
      const fraction = Math.min(1, Math.max(0, (window.scrollY - start + window.innerHeight * .35) / total));
      if (progress) progress.style.width = `${fraction * 100}%`;
      scheduled = false;
    }
    window.addEventListener('scroll', () => { if (!scheduled) { scheduled = true; requestAnimationFrame(updateProgress); } }, {passive: true});
    window.addEventListener('resize', updateProgress);
    updateProgress();
    document.getElementById('copy-link')?.addEventListener('click', async () => {
      const status = document.getElementById('copy-status');
      const url = document.querySelector('link[rel="canonical"]')?.href || window.location.href;
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(url);
        status.textContent = 'Link copiado.';
      } catch {
        status.replaceChildren(document.createTextNode('Copie este endereço: '));
        const input = document.createElement('input');
        input.type = 'text'; input.readOnly = true; input.value = url;
        input.setAttribute('aria-label', 'Endereço do artigo para copiar');
        input.style.cssText = 'display:block;width:100%;margin-top:10px;padding:10px;background:#191918;color:#f2eee5;border:1px solid #ffffff40';
        status.appendChild(input); input.focus(); input.select();
      }
    });
  }
})();
