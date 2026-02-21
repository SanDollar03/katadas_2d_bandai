// ===============================
// KATADAS2D script.js (FULL)
// ===============================

// ----- Main DOM -----
const grid = document.getElementById('grid');
const select = document.getElementById('productSelect');
const issueSelect = document.getElementById('issueSelect');
const saveBtn = document.getElementById('saveButton');
const crossX = document.getElementById('crosshair-x');
const crossY = document.getElementById('crosshair-y');
const currentPathDisplay = document.getElementById('currentPath');

// ----- Left drawer (Trouble Note) -----
const hamburgerBtn = document.getElementById('hamburgerBtn');
const leftDrawer = document.getElementById('leftDrawer');
const leftOverlay = document.getElementById('leftOverlay');
const closeLeftDrawerBtn = document.getElementById('closeLeftDrawer');

// ----- Right sidebar (Settings) -----
const settingsBtn = document.getElementById('settingsBtn');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const closeSidebarBtn = document.getElementById('closeSidebar');

// Sidebar inputs
const inputSavePath = document.getElementById('inputSavePath');
const btnSavePath = document.getElementById('btnSavePath');
const crosshairRadios = document.querySelectorAll('input[name="crosshairColor"]');
const borderRadios = document.querySelectorAll('input[name="cellBorderColor"]');
const inputRows = document.getElementById('inputRows');
const inputCols = document.getElementById('inputCols');
const btnApplyGrid = document.getElementById('btnApplyGrid');

// ----- Left drawer open/close -----
function openLeftDrawer() {
    if (!leftDrawer) return;
    leftDrawer.classList.add('open');
    leftDrawer.setAttribute('aria-hidden', 'false');
    if (leftOverlay) { leftOverlay.hidden = false; leftOverlay.classList.add('active'); }
    if (hamburgerBtn) hamburgerBtn.setAttribute('aria-expanded', 'true');
    leftDrawer.focus({ preventScroll: true });
}
function closeLeftDrawer() {
    if (!leftDrawer) return;
    leftDrawer.classList.remove('open');
    leftDrawer.setAttribute('aria-hidden', 'true');
    if (leftOverlay) { leftOverlay.classList.remove('active'); leftOverlay.hidden = true; }
    if (hamburgerBtn) hamburgerBtn.setAttribute('aria-expanded', 'false');
    if (hamburgerBtn) hamburgerBtn.focus({ preventScroll: true });
}
if (hamburgerBtn) hamburgerBtn.addEventListener('click', openLeftDrawer);
if (closeLeftDrawerBtn) closeLeftDrawerBtn.addEventListener('click', closeLeftDrawer);
if (leftOverlay) leftOverlay.addEventListener('click', closeLeftDrawer);

// ----- Right sidebar open/close -----
function openSidebar() {
    if (!sidebar) return;
    sidebar.classList.add('open');
    sidebar.setAttribute('aria-hidden', 'false');
    if (overlay) { overlay.hidden = false; overlay.classList.add('active'); }
    if (settingsBtn) settingsBtn.setAttribute('aria-expanded', 'true');
    sidebar.focus({ preventScroll: true });
}
function closeSidebar() {
    if (!sidebar) return;
    sidebar.classList.remove('open');
    sidebar.setAttribute('aria-hidden', 'true');
    if (overlay) { overlay.classList.remove('active'); overlay.hidden = true; }
    if (settingsBtn) settingsBtn.setAttribute('aria-expanded', 'false');
    if (settingsBtn) settingsBtn.focus({ preventScroll: true });
}
if (settingsBtn) settingsBtn.addEventListener('click', openSidebar);
if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeSidebar);
if (overlay) overlay.addEventListener('click', closeSidebar);

// ESC closes whichever open
document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (leftDrawer && leftDrawer.classList.contains('open')) closeLeftDrawer();
    if (sidebar && sidebar.classList.contains('open')) closeSidebar();
});

// ----- Settings actions -----
fetch('/get_save_path')
    .then(res => res.json())
    .then(data => { if (inputSavePath) inputSavePath.value = data.path || ''; });

if (btnSavePath) {
    btnSavePath.addEventListener('click', () => {
        const newPath = (inputSavePath?.value || '').trim();
        if (!newPath) { alert('保存先を入力してください'); return; }
        alert(`保存先変更の要求: ${newPath}\n（サーバ側のLOG_DIR変更は未実装です）`);
    });
}

crosshairRadios.forEach(r => {
    r.addEventListener('change', () => {
        const val = r.value;
        document.documentElement.style.setProperty(
            '--crosshair-color',
            val === 'white' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.3)'
        );
    });
});
borderRadios.forEach(r => {
    r.addEventListener('change', () => {
        const val = r.value;
        document.documentElement.style.setProperty(
            '--cell-border-color',
            val === 'white' ? 'rgba(255,255,255,0.5)' : 'rgba(200,200,200,0.3)'
        );
    });
});

// ----- Grid state -----
let rows = 180, cols = 320;
const activeCells = new Set();
let hasUnsavedChanges = false;

const canvas = document.createElement('canvas');
canvas.width = cols;
canvas.height = rows;
const ctx = canvas.getContext('2d');
let bgImage = new Image();
let imageReady = false;

// grid template
function applyGridTemplate() {
    grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    grid.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
}

// tooltip
function getTooltipEl() { return document.getElementById('cellTooltip'); }

// build grid
function buildGrid() {
    const xLine = document.getElementById('crosshair-x');
    const yLine = document.getElementById('crosshair-y');
    const tip = document.getElementById('cellTooltip');

    grid.innerHTML = '';
    grid.appendChild(xLine);
    grid.appendChild(yLine);
    grid.appendChild(tip);

    applyGridTemplate();

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.x = x;
            cell.dataset.y = y;

            cell.addEventListener('click', () => {
                const key = `${x},${y}`;
                if (cell.classList.contains('active')) {
                    cell.classList.remove('active');
                    cell.style.backgroundColor = '';
                    activeCells.delete(key);
                } else {
                    const color = getColorForPixel(x, y);
                    cell.classList.add('active');
                    cell.style.backgroundColor = color;
                    activeCells.add(key);
                }
                hasUnsavedChanges = true;
            });

            grid.appendChild(cell);
        }
    }
}

// update grid config (password)
if (btnApplyGrid) {
    btnApplyGrid.addEventListener('click', async () => {
        const r = Math.min(180, Math.max(1, parseInt(inputRows.value || '180', 10)));
        const c = Math.min(320, Math.max(1, parseInt(inputCols.value || '320', 10)));

        const pw = window.prompt('グリッド数の変更にはパスワードが必要です。\nパスワードを入力してください:');
        if (pw === null) return;

        const shouldSave = hasUnsavedChanges && window.confirm('現在のマーカーをCSVに保存しますか？');

        const proceed = async () => {
            try {
                const res = await fetch('/set_grid_config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: pw, rows: r, cols: c })
                });
                if (!res.ok) {
                    alert(res.status === 403 ? 'パスワードが一致しません' : 'グリッド設定の保存に失敗しました');
                    return;
                }
                const data = await res.json();
                rows = data.rows;
                cols = data.cols;

                canvas.width = cols;
                canvas.height = rows;
                if (bgImage && bgImage.complete) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
                    imageReady = true;
                }

                activeCells.clear();
                hasUnsavedChanges = false;
                buildGrid();

                if (inputRows) inputRows.value = String(rows);
                if (inputCols) inputCols.value = String(cols);

                alert(`グリッド設定を保存し、再生成しました：縦=${rows}, 横=${cols}`);
            } catch (e) {
                console.error(e);
                alert('サーバ通信に失敗しました');
            }
        };

        if (shouldSave) saveGrid(() => proceed());
        else proceed();
    });
}

// ----- Products & issues -----
fetch('/get_products')
    .then(res => res.json())
    .then(products => {
        select.innerHTML = products.map(p => `<option value="${p}">${p}</option>`).join('');
        updateBackground();
    });

fetch('/get_issues')
    .then(res => res.json())
    .then(issues => {
        issueSelect.innerHTML = issues.map(i => `<option value="${i}">${i}</option>`).join('');
    });

// background update
function updateBackground() {
    const imagePath = `/images/${select.value}.jpg`;
    imageReady = false;
    grid.style.backgroundImage = `url('${imagePath}')`;
    bgImage.src = imagePath;

    bgImage.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
        imageReady = true;
    };
}

// ----- Marker color picking -----
function srgbToLin(c) {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function relativeLuminance(r, g, b) {
    return 0.2126 * srgbToLin(r) + 0.7152 * srgbToLin(g) + 0.0722 * srgbToLin(b);
}
function contrastRatio(rgbA, rgbB) {
    const LA = relativeLuminance(rgbA[0], rgbA[1], rgbA[2]);
    const LB = relativeLuminance(rgbB[0], rgbB[1], rgbB[2]);
    const L1 = Math.max(LA, LB);
    const L2 = Math.min(LA, LB);
    return (L1 + 0.05) / (L2 + 0.05);
}
function rgbToHsv(r, g, b) {
    const R = r / 255, G = g / 255, B = b / 255;
    const max = Math.max(R, G, B), min = Math.min(R, G, B);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
        switch (max) {
            case R: h = 60 * (((G - B) / d) % 6); break;
            case G: h = 60 * (((B - R) / d) + 2); break;
            case B: h = 60 * (((R - G) / d) + 4); break;
        }
    }
    if (h < 0) h += 360;
    const s = max === 0 ? 0 : d / max;
    return { h, s, v: max };
}
function hsvToRgb(h, s, v) {
    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;
    let r = 0, g = 0, b = 0;
    if (0 <= h && h < 60) { r = c; g = x; b = 0; }
    else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
    else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
    else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
    else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }
    return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

const MARKER_PALETTE_HUES = [0, 30, 60, 120, 180, 210, 240, 270, 300];
const SAT = 1.2;
const VAL_BRIGHT = 0.95;
const VAL_DARK = 0.35;
const HUE_AVOID_DEG = 24;
let markerColorRotateIndex = 0;

function getColorForPixel(x, y) {
    if (!imageReady) return 'rgba(0,255,255,0.6)';

    const data = ctx.getImageData(x, y, 1, 1).data;
    const r = data[0], g = data[1], b = data[2];

    const bgHsv = rgbToHsv(r, g, b);
    const bgRgb = [r, g, b];
    const bgLum = relativeLuminance(r, g, b);

    const valueCandidates = bgLum > 0.5 ? [VAL_DARK, VAL_BRIGHT] : [VAL_BRIGHT, VAL_DARK];
    const candidates = [];

    for (const v of valueCandidates) {
        for (let i = 0; i < MARKER_PALETTE_HUES.length; i++) {
            const hue = MARKER_PALETTE_HUES[(i + markerColorRotateIndex) % MARKER_PALETTE_HUES.length];
            const hueDiff = Math.min(Math.abs(hue - bgHsv.h), 360 - Math.abs(hue - bgHsv.h));
            if (hueDiff < HUE_AVOID_DEG) continue;

            const rgb = hsvToRgb(hue, SAT, v);
            const cr = contrastRatio(rgb, bgRgb);
            const score = cr * (1 + hueDiff / 180);
            candidates.push({ rgb, score });
        }
    }

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0] || { rgb: [0, 255, 255] };
    markerColorRotateIndex = (markerColorRotateIndex + 2) % MARKER_PALETTE_HUES.length;

    return `rgba(${best.rgb[0]},${best.rgb[1]},${best.rgb[2]},0.7)`;
}

// ----- Save / switch product -----
select.addEventListener('change', () => {
    if (hasUnsavedChanges && confirm("変更があります。保存しますか？")) {
        saveGrid(() => { clearGrid(); updateBackground(); });
    } else {
        clearGrid();
        updateBackground();
    }
});

function clearGrid() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('active');
        cell.style.backgroundColor = '';
    });
    activeCells.clear();
    hasUnsavedChanges = false;
}

function saveGrid(callback) {
    const now = new Date();
    const timestamp = now.getFullYear().toString()
        + String(now.getMonth() + 1).padStart(2, '0')
        + String(now.getDate()).padStart(2, '0')
        + String(now.getHours()).padStart(2, '0')
        + String(now.getMinutes()).padStart(2, '0')
        + String(now.getSeconds()).padStart(2, '0');

    const product = select.value;
    const issue = issueSelect.value;

    const csv = ["日時,プロダクト名,問題,X座標,Y座標"];
    activeCells.forEach(key => {
        const [x, y] = key.split(',');
        csv.push(`${timestamp},${product},${issue},${x},${y}`);
    });

    fetch(`/save_csv?timestamp=${timestamp}`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: csv.join('\n')
    }).then(res => {
        if (res.ok) {
            alert("✅ CSV保存完了");
            clearGrid();
            if (callback) callback();
        } else {
            alert("❌ 保存に失敗しました。");
        }
    }).catch(err => {
        console.error(err);
        alert("⚠ 通信エラー：CSV保存に失敗しました。");
    });
}
saveBtn.addEventListener('click', () => saveGrid());

// save path display
function updateSavePathDisplay() {
    fetch('/get_save_path')
        .then(res => res.json())
        .then(data => { currentPathDisplay.textContent = `保存先: ${data.path}`; });
}
updateSavePathDisplay();

// init grid config
fetch('/get_grid_config')
    .then(res => res.json())
    .then(cfg => {
        rows = Math.min(180, Math.max(1, parseInt(cfg.rows || '180', 10)));
        cols = Math.min(320, Math.max(1, parseInt(cfg.cols || '320', 10)));
        if (inputRows) inputRows.value = String(rows);
        if (inputCols) inputCols.value = String(cols);
        canvas.width = cols; canvas.height = rows;
        buildGrid();
    })
    .catch(() => buildGrid());

// tooltip + crosshair
function showTooltip(relX, relY) {
    const tooltip = getTooltipEl();
    if (!tooltip) return;

    const rect = grid.getBoundingClientRect();
    const cellW = rect.width / cols;
    const cellH = rect.height / rows;

    let cx = Math.floor(relX / cellW);
    let cy = Math.floor(relY / cellH);
    cx = Math.max(0, Math.min(cols - 1, cx));
    cy = Math.max(0, Math.min(rows - 1, cy));

    const category = (issueSelect && issueSelect.value) || "";
    tooltip.innerHTML = `X座標: <b>${cx}</b><br>Y座標: <b>${cy}</b><br>分類名: <b>${category || '-'}</b>`;

    tooltip.style.left = `${Math.min(rect.width - 200, Math.max(10, relX + 16))}px`;
    tooltip.style.top = `${Math.min(rect.height - 80, Math.max(10, relY + 16))}px`;
    tooltip.hidden = false;
}
function hideTooltip() {
    const tooltip = getTooltipEl();
    if (tooltip) tooltip.hidden = true;
}

document.addEventListener('mousemove', e => {
    const rect = grid.getBoundingClientRect();
    const inside = e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top && e.clientY <= rect.bottom;

    if (inside) {
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;

        crossX.style.display = 'block';
        crossY.style.display = 'block';
        showTooltip(relX, relY);

        requestAnimationFrame(() => {
            crossX.style.transform = `translateY(${relY}px)`;
            crossY.style.transform = `translateX(${relX}px)`;
        });
    } else {
        crossX.style.display = 'none';
        crossY.style.display = 'none';
        hideTooltip();
    }
});

// ==============================
// tn-multi: static panel + only one open
// ==============================
function initTnMultiSelectStatic() {
    const multis = Array.from(document.querySelectorAll('.tn-multi'));

    function closeMulti(m) {
        const panel = m.querySelector('.tn-multi-panel');
        if (panel) panel.hidden = true;
        m.dataset.open = '0';
    }

    function openMulti(m) {
        const panel = m.querySelector('.tn-multi-panel');
        if (panel) panel.hidden = false;
        m.dataset.open = '1';
        try { m.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (_) { }
    }

    function closeAll(except = null) {
        multis.forEach(mm => {
            if (except && mm === except) return;
            closeMulti(mm);
        });
    }

    multis.forEach(m => {
        const btn = m.querySelector('.tn-multi-btn');
        const panel = m.querySelector('.tn-multi-panel');
        const hidden = m.querySelector('input[type="hidden"]');
        const placeholder = m.dataset.placeholder || '選択';

        if (!btn || !panel || !hidden) return;

        panel.hidden = true;
        m.dataset.open = '0';

        function update() {
            const checks = panel.querySelectorAll('input[type="checkbox"]');
            const selected = [];
            checks.forEach(c => { if (c.checked) selected.push(c.value); });
            hidden.value = selected.join(',');
            btn.textContent = selected.length ? selected.join(' / ') : placeholder;
        }

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const isOpen = m.dataset.open === '1';
            if (isOpen) closeMulti(m);
            else { closeAll(m); openMulti(m); }
        });

        panel.addEventListener('change', update);
        update();
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.tn-multi')) closeAll(null);
    });
}

// ==============================
// Load trouble_note_options.json and reflect
// ==============================
async function loadTroubleNoteOptions() {
    const res = await fetch('/get_trouble_note_options');
    if (!res.ok) throw new Error('Failed to load trouble_note_options.json');
    return await res.json();
}

function fillSelect(selectEl, items, placeholder = '選択してください') {
    if (!selectEl) return;
    selectEl.innerHTML = '';
    const opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = placeholder;
    selectEl.appendChild(opt0);

    (items || []).forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        selectEl.appendChild(opt);
    });
}

function fillMulti(multiRoot, hiddenInputId, items, placeholderText) {
    if (!multiRoot) return;
    const btn = multiRoot.querySelector('.tn-multi-btn');
    const panel = multiRoot.querySelector('.tn-multi-panel');
    const hidden = document.getElementById(hiddenInputId);

    if (!btn || !panel || !hidden) return;

    multiRoot.dataset.placeholder = placeholderText;
    btn.textContent = placeholderText;

    panel.innerHTML = '';
    (items || []).forEach(v => {
        const label = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = v;
        label.appendChild(cb);
        label.appendChild(document.createTextNode(' ' + v));
        panel.appendChild(label);
    });

    panel.hidden = true;
    hidden.value = '';
}

(async function bootstrapTroubleNoteOptions() {
    try {
        const opt = await loadTroubleNoteOptions();

        fillSelect(document.getElementById('tn_maker'), opt.maker);
        fillSelect(document.getElementById('tn_second_maker'), opt.second_maker);
        fillSelect(document.getElementById('tn_mold_name'), opt.mold_name);
        fillSelect(document.getElementById('tn_mold_vendor'), opt.mold_vendor);

        fillMulti(document.getElementById('tn_materials_multi'), 'tn_materials', opt.materials, '素材を選択');
        fillMulti(document.getElementById('tn_trouble_types_multi'), 'tn_trouble_types', opt.trouble_types, 'トラブル内容を選択');
        fillMulti(document.getElementById('tn_repair_types_multi'), 'tn_repair_types', opt.repair_types, '修理内容を選択');
        fillMulti(document.getElementById('tn_causes_multi'), 'tn_causes', opt.causes, '原因を選択');
        fillMulti(document.getElementById('tn_cause_owner_multi'), 'tn_cause_owner', opt.cause_owner, '発生原因先を選択');

        initTnMultiSelectStatic();
    } catch (e) {
        console.error(e);
        alert('trouble_note_options.json の読み込みに失敗しました');
    }
})();

// ==============================
// 強制半角/フォーマット（3,5,8,12,13,14,15,19,21,22,29）
// ==============================
function toHalfWidth(str) {
    if (typeof str !== 'string') return str;
    return str
        .replace(/[\uFF01-\uFF5E]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
        .replace(/\u3000/g, ' ');
}
function bindForce(el, fn) {
    if (!el) return;
    const handler = () => fn(el);
    el.addEventListener('input', handler);
    el.addEventListener('blur', handler);
    el.addEventListener('change', handler);
    el.addEventListener('paste', () => setTimeout(handler, 0));
    handler();
}
function forceHalf(el) { el.value = toHalfWidth(el.value); }
function forceDigits(el, maxLen = null) {
    let v = toHalfWidth(el.value).replace(/\D/g, '');
    if (maxLen != null) v = v.slice(0, maxLen);
    el.value = v;
}
function forceShotPlan(el) {
    let v = toHalfWidth(el.value);
    v = v.replace(/[^0-9\/pcs]/gi, '');
    el.value = v;

    if (document.activeElement !== el) {
        const m = v.match(/^(\d+)\s*\/\s*(\d+)\s*pcs$/i) || v.match(/^(\d+)\/(\d+)pcs$/i);
        if (m) el.value = `${m[1]}/${m[2]}pcs`;
    }
}
function forceNumberUnit(el, unit, maxLen = 6) {
    let v = toHalfWidth(el.value).replace(/\s+/g, '');
    v = v.replace(/[^\d]/g, '');
    if (maxLen != null) v = v.slice(0, maxLen);
    if (document.activeElement !== el) el.value = v ? `${v}${unit}` : '';
    else el.value = v;
}

// 3
bindForce(document.getElementById('tn_team_no'), forceHalf);
// 5
bindForce(document.getElementById('tn_partno7'), (el) => forceDigits(el, 7));
// 8
bindForce(document.getElementById('tn_eq11'), (el) => forceDigits(el, 11));
// 12
bindForce(document.getElementById('tn_lot4'), (el) => forceDigits(el, 4));
// 13
bindForce(document.getElementById('tn_switch_shape'), forceHalf);
// 14
bindForce(document.getElementById('tn_shot_plan'), forceShotPlan);
// 15
bindForce(document.getElementById('tn_total_shots'), (el) => forceDigits(el, 10));
// 19
bindForce(document.getElementById('tn_machine_t'), (el) => forceDigits(el, 5));
// 21
bindForce(document.getElementById('tn_molding_t'), (el) => forceNumberUnit(el, 't', 6));
// 22
bindForce(document.getElementById('tn_molding_sheets'), (el) => forceNumberUnit(el, '枚', 6));
// 29
bindForce(document.getElementById('tn_repair_time'), forceHalf);
