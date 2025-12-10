
function hslToRgb(h, s, l) {
  // h: 0..360, s:0..100, l:0..100
  s /= 100;
  l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(Math.min(k(n) - 3, 9 - k(n), 1), -1);
  return [Math.round(255 * f(0)), Math.round(255 * f(8)), Math.round(255 * f(4))];
}
function rgbToHex(r,g,b){
  return "#" + [r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function hslToHex(h,s,l){
  const [r,g,b] = hslToRgb(h,s,l);
  return rgbToHex(r,g,b);
}


const STATE = {
  colors: [],         
  locks: [false,false,false,false], 
  favorites: []      
};

// DOM 
const paletteEl = document.getElementById('palette');
const generateBtn = document.getElementById('generateBtn');
const saveBtn = document.getElementById('saveBtn');
const copyAllBtn = document.getElementById('copyAllBtn');
const favoritesList = document.getElementById('favoritesList');
const clearFavs = document.getElementById('clearFavs');
const bgToggle = document.getElementById('bgToggle');
const showHex = document.getElementById('showHex');
const toast = document.getElementById('toast');


const FAVORITES_KEY = 'palette_lab_favorites_v1';
function loadFavorites(){
  try{
    const raw = localStorage.getItem(FAVORITES_KEY);
    STATE.favorites = raw ? JSON.parse(raw) : [];
  }catch(e){
    STATE.favorites = [];
  }
}
function saveFavoritesToStorage(){
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(STATE.favorites));
}


function generateMatchingPalette(baseHue=null){
  
  const hue = (baseHue === null) ? Math.floor(Math.random()*360) : baseHue;
  
  const offsets = [-24, -8, 8, 24];
  
  const satBase = 65 + Math.floor(Math.random()*10); 
  const lightBases = [48, 58, 38, 66]; 
  const palette = offsets.map((off, i) => {
    const h = (hue + off + 360) % 360;
    const s = Math.max(30, Math.min(90, satBase + (i-1)*4)); 
    const l = Math.max(15, Math.min(85, lightBases[i] + (Math.floor(Math.random()*7)-3)));
    return hslToHex(h,s,l);
  });
  return palette;
}


function renderPalette(){
  paletteEl.innerHTML = '';
  for(let i=0;i<4;i++){
    const hex = STATE.colors[i];
    const card = document.createElement('div');
    card.className = 'color-card';
    card.style.background = hex;
    card.setAttribute('data-index', i);
    card.innerHTML = 
      <div class="color-top">
        <button class="lock-btn ${STATE.locks[i] ? 'locked' : ''}" aria-label="Lock color" data-action="lock" data-index="${i}">
          ${STATE.locks[i] ? '🔒' : '🔓'}
        </button>
      </div>
      <div class="color-bottom">
        <div>
          <div class="hex">${showHex.checked ? hex : ''}</div>
          <div class="subhex">${showHex.checked ? 'Click color to copy' : ''}</div>
        </div>
        <div>
          <button class="btn small outline" data-action="copy" data-index="${i}">Copy</button>
        </div>
      </div>
    ;
    
    card.addEventListener('click', (e) => {
      
      const action = e.target.getAttribute('data-action');
      if(action === 'lock' || action === 'copy') return;
      copyToClipboard(hex);
    });
    paletteEl.appendChild(card);
  }
  updatePageBackground();
  
async function copyToClipboard(text){
  try{
    await navigator.clipboard.writeText(text);
    showToast('Copied ' + text);
  }catch(err){
    
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try{
      document.execCommand('copy');
      showToast('Copied ' + text);
    }catch(e){
      showToast('Copy failed');
    }
    ta.remove();
  }
}
action (respect locks) ----------
function handleGenerate(){
 
  if(STATE.colors.length !== 4) {
    STATE.colors = generateMatchingPalette();
  } else {
    let baseHue = null;
    for(let i=0;i<4;i++){
      if(!STATE.locks[i]){
        baseHue = null;
        break;
      }
    }
    const newPalette = generateMatchingPalette(baseHue);
    
    for(let i=0;i<4;i++){
      if(!STATE.locks[i]) STATE.colors[i] = newPalette[i];
    }
  }
  renderPalette();
}


function updatePageBackground(){
  if(!bgToggle.checked) return document.body.style.background = '';
  const gradient = STATE.colors.join(', ');
  document.body.style.background = linear-gradient(135deg, ${gradient});
  
  document.body.style.backgroundBlendMode = 'overlay';
}


function saveCurrentFavorite(){
 
  if(STATE.colors.length !== 4) return showToast('No palette to save');
  
  const key = STATE.colors.join(',');
  const exists = STATE.favorites.some(p => p.join(',') === key);
  if(exists) return showToast('Already saved');
  STATE.favorites.unshift([...STATE.colors]); 
  STATE.favorites = STATE.favorites.slice(0,30);
  saveFavoritesToStorage();
  renderFavorites();
  showToast('Saved to favorites');
}


function renderFavorites(){
  favoritesList.innerHTML = '';
  if(STATE.favorites.length === 0){
    favoritesList.innerHTML = <div style="color:var(--muted);font-size:13px">No favorites yet</div>;
    return;
  }
  STATE.favorites.forEach((p, idx) => {
    const chip = document.createElement('div');
    chip.className = 'fav-chip';
    chip.setAttribute('data-idx', idx);
    chip.innerHTML = 
      <div class="mini-palette">
        ${p.map(hex => <div class="mini" style="background:${hex}"></div>).join('')}
      </div>
      <div style="font-size:12px;color:var(--muted);margin-left:8px">${p.join(' • ')}</div>
      <div style="margin-left:8px;display:flex;gap:6px">
        <button class="btn small" data-action="load" data-idx="${idx}">Load</button>
        <button class="btn small outline" data-action="delete" data-idx="${idx}">Delete</button>
      </div>
    ;
    favoritesList.appendChild(chip);
  });
}


let toastTimer = null;
function showToast(text){
  toast.textContent = text;
  toast.style.opacity = '1';
  toast.setAttribute('aria-hidden','false');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> {
    toast.style.opacity = '0';
    toast.setAttribute('aria-hidden','true');
  }, 1400);
}


paletteEl.addEventListener('click', (e) => {
  const action = e.target.getAttribute('data-action');
  const idx = e.target.getAttribute('data-index');
  if(!action) return;
  const i = Number(idx);
  if(action === 'lock'){
    STATE.locks[i] = !STATE.locks[i];
    renderPalette();
  } else if(action === 'copy'){
    copyToClipboard(STATE.colors[i]);
  }
});
  
favoritesList.addEventListener('click', (e) => {
  const action = e.target.getAttribute('data-action');
  const idx = e.target.getAttribute('data-idx');
  if(!action) return;
  const i = Number(idx);
  if(action === 'load'){
    STATE.colors = [...STATE.favorites[i]];
    STATE.locks = [false,false,false,false];
    renderPalette();
    showToast('Loaded favorite');
  } else if(action === 'delete'){
    STATE.favorites.splice(i,1);
    saveFavoritesToStorage();
    renderFavorites();
    showToast('Deleted favorite');
  }
});

clearFavs.addEventListener('click', () => {
  if(!confirm('Clear all favorites?')) return;
  STATE.favorites = [];
  saveFavoritesToStorage();
  renderFavorites();
});
  
generateBtn.addEventListener('click', handleGenerate);
saveBtn.addEventListener('click', saveCurrentFavorite);
copyAllBtn.addEventListener('click', () => {
  if(STATE.colors.length !== 4) return showToast('No palette to copy');
  const text = STATE.colors.join(', ');
  copyToClipboard(text);
});

bgToggle.addEventListener('change', updatePageBackground);
showHex.addEventListener('change', renderPalette);


function init(){
  loadFavorites();
  renderFavorites();
  STATE.colors = generateMatchingPalette();
  renderPalette();
}
init();
}
