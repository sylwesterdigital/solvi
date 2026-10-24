/* No framework, no network service: the release log is a static local JSON file. */
(() => {
  const versionNode = document.getElementById('solviVersion');
  const currentNode = document.getElementById('devCurrent');
  const historyNode = document.getElementById('devHistory');
  const overlay = document.getElementById('devOverlay');
  const reopen = document.getElementById('devReopen');
  const reopenVersion = document.getElementById('devReopenVersion');
  const close = document.getElementById('devClose');
  if (!versionNode || !historyNode) return;
  const fallbackVersion = '0.10.1';
  const local = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
  const putLocal = (key, value) => { try { localStorage.setItem(key, value); } catch {} };
  const hidden = local('solvi-dev-hidden') === '1';
  function show(value) { overlay.classList.toggle('hidden', !value); reopen.classList.toggle('hidden', value); putLocal('solvi-dev-hidden', value ? '0' : '1'); }
  close.addEventListener('click', () => show(false));
  reopen.addEventListener('click', () => show(true));
  show(!hidden);
  function display(data) {
    if (!data || !Array.isArray(data.releases) || !data.releases.length) throw Error('Empty release history');
    const items = data.releases.slice().sort((a,b) => b.version.localeCompare(a.version, undefined, {numeric:true}));
    const current = String(data.currentVersion || items[0].version || fallbackVersion);
    versionNode.textContent = `v${current}`;
    currentNode.textContent = `Current: v${current}`;
    reopenVersion.textContent = `v${current}`;
    historyNode.replaceChildren();
    for (const item of items) {
      const section = document.createElement('section'); section.className = 'dev-release';
      const heading = document.createElement('div'); heading.className = 'dev-release-head';
      const label = document.createElement('b'); label.className = 'dev-release-version'; label.textContent = `v${item.version}`;
      const time = document.createElement('time'); time.textContent = item.publishedAt ? new Date(item.publishedAt).toLocaleString() : 'Date unavailable';
      if (item.publishedAt) time.dateTime = item.publishedAt;
      heading.append(label, time); section.append(heading);
      const list = document.createElement('ul');
      for (const change of item.changes || []) { const row = document.createElement('li'); row.textContent = change; list.append(row); }
      section.append(list); historyNode.append(section);
    }
  }
  fetch('./releases.json', {cache:'no-store'})
    .then(response => { if (!response.ok) throw Error(`HTTP ${response.status}`); return response.json(); })
    .then(display)
    .catch(error => {
      historyNode.textContent = `Release history unavailable (${error.message}).`;
      versionNode.textContent = `v${fallbackVersion}`;
      currentNode.textContent = `Current: v${fallbackVersion}`;
    });
})();
