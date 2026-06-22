const fs = require('fs');
const path = 'c:/ASPAS/frontend/admin.html';
let content = fs.readFileSync(path, 'utf8');

const newStyle = `<style>
    :root {
      --primary: #007AFF;
      --danger: #ff3b30;
      --success: #34c759;
      --warning: #ff9500;
      --bg: #f2f2f7;
      --text-main: #1c1c1e;
      --text-muted: #8e8e93;
    }

    *, *::before, *::after { box-sizing: border-box; }

    body, html {
      margin: 0; padding: 0; min-height: 100vh;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: var(--bg);
      background-image:
        linear-gradient(rgba(0,0,0,0.02) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0,0,0,0.02) 1px, transparent 1px);
      background-size: 32px 32px;
      color: var(--text-main);
      overflow-x: hidden;
    }

    /* Ambient background blobs - AURORA EFFECT */
    .ambient-bg {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      z-index: 0; pointer-events: none; overflow: hidden;
      background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 0%, rgba(242,242,247,0.5) 100%);
    }
    .blob {
      position: absolute; border-radius: 50%;
      filter: blur(110px); opacity: 0.85;
      animation: blobFloat 20s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
      will-change: transform;
    }
    .blob-1 { width: 700px; height: 700px; background: linear-gradient(135deg, rgba(0,122,255,0.5), rgba(88,86,214,0.4)); top: -200px; right: -150px; }
    .blob-2 { width: 600px; height: 600px; background: linear-gradient(135deg, rgba(255,45,85,0.4), rgba(255,149,0,0.35)); bottom: -150px; left: -100px; animation-duration: 25s; animation-delay: -5s; }
    .blob-3 { width: 550px; height: 550px; background: linear-gradient(135deg, rgba(52,199,89,0.4), rgba(0,199,190,0.45)); top: 35%; left: 35%; animation-duration: 28s; animation-delay: -10s; }
    .blob-4 { width: 450px; height: 450px; background: linear-gradient(135deg, rgba(175,82,222,0.4), rgba(255,45,85,0.3)); top: 10%; left: 10%; animation-duration: 22s; }
    
    @keyframes blobFloat {
      0% { transform: translate(0, 0) scale(1) rotate(0deg); }
      50% { transform: translate(60px, 100px) scale(1.15) rotate(180deg); }
      100% { transform: translate(-40px, -60px) scale(0.9) rotate(360deg); }
    }

    /* GLASSMORPHISM BASE */
    .glass-panel {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.15) 100%);
      backdrop-filter: blur(40px) saturate(220%);
      -webkit-backdrop-filter: blur(40px) saturate(220%);
      box-shadow: 
        inset 0 0 0 1px rgba(255, 255, 255, 0.6),
        inset 0 2px 10px rgba(255, 255, 255, 0.5),
        0 15px 35px rgba(0, 0, 0, 0.08);
    }

    /* ======== NAVBAR ======== */
    .navbar {
      position: sticky; top: 0; z-index: 100;
      padding: 14px 28px;
      display: flex; justify-content: space-between; align-items: center;
      background: linear-gradient(to bottom, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0.3));
      backdrop-filter: blur(50px) saturate(250%);
      -webkit-backdrop-filter: blur(50px) saturate(250%);
      box-shadow: 0 4px 30px rgba(0,0,0,0.06), inset 0 -1px 0 rgba(255,255,255,0.4);
    }
    .navbar-brand {
      display: flex; align-items: center; gap: 10px;
      font-size: 18px; font-weight: 800; color: var(--primary);
    }
    .navbar-brand .icon-wrap {
      width: 38px; height: 38px; border-radius: 12px;
      background: linear-gradient(135deg, var(--primary), #3b82f6);
      display: flex; align-items: center; justify-content: center;
      color: white; font-size: 16px;
      box-shadow: 0 6px 15px rgba(0,122,255,0.4), inset 0 1px 2px rgba(255,255,255,0.4);
    }
    .navbar-link {
      display: flex; align-items: center; gap: 8px;
      text-decoration: none; color: var(--text-main);
      font-size: 14px; font-weight: 600;
      padding: 9px 18px; border-radius: 50px;
      background: linear-gradient(135deg, rgba(255,255,255,0.6), rgba(255,255,255,0.2));
      backdrop-filter: blur(20px);
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.6), 0 4px 12px rgba(0,0,0,0.06);
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .navbar-link:hover {
      transform: translateY(-2px);
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.9), 0 8px 20px rgba(0,0,0,0.1);
      background: linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.5));
    }

    /* ======== CONTAINER ======== */
    .container {
      position: relative; z-index: 10;
      max-width: 1200px; margin: 2.5rem auto; padding: 0 20px;
    }

    /* ======== TOOLBAR ======== */
    .toolbar {
      border-radius: 24px; padding: 20px 24px; margin-bottom: 24px;
      display: flex; gap: 16px; align-items: center; flex-wrap: wrap;
    }
    .toolbar-search { flex: 1; min-width: 250px; position: relative; display: flex; align-items: center; }
    .toolbar-search i { position: absolute; left: 16px; color: var(--text-muted); font-size: 15px; }
    .toolbar-search input {
      width: 100%; padding: 13px 16px 13px 44px; border: none;
      border-radius: 16px; font-family: 'Inter', sans-serif; font-size: 15px; 
      background: rgba(255,255,255,0.3); backdrop-filter: blur(20px) saturate(150%);
      color: var(--text-main);
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.6), inset 0 2px 5px rgba(0,0,0,0.05), 0 4px 10px rgba(0,0,0,0.03);
      transition: all 0.3s ease;
    }
    .toolbar-search input:focus {
      outline: none; background: rgba(255,255,255,0.6);
      box-shadow: inset 0 0 0 1px var(--primary), 0 0 0 4px rgba(0,122,255,0.15), 0 8px 20px rgba(0,0,0,0.08);
    }
    .koridor-group { display: flex; gap: 8px; }
    .koridor-chip {
      padding: 10px 18px; border-radius: 14px; background: rgba(255,255,255,0.4);
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.6), 0 4px 10px rgba(0,0,0,0.03);
      color: var(--text-main); font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 700;
      cursor: pointer; transition: all 0.3s; border: none; backdrop-filter: blur(10px);
    }
    .koridor-chip.active {
      background: var(--primary); color: white;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.4), 0 8px 20px rgba(0,122,255,0.35);
    }
    .koridor-chip:not(.active):hover { background: rgba(255,255,255,0.7); transform: translateY(-1px); }
    .btn-add {
      display: flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 16px;
      background: linear-gradient(135deg, var(--primary), #0056b3); color: white; border: none;
      font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer;
      box-shadow: inset 0 1px 1px rgba(255,255,255,0.4), 0 8px 20px rgba(0,122,255,0.35);
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); white-space: nowrap;
    }
    .btn-add:hover { transform: translateY(-3px) scale(1.02); box-shadow: inset 0 1px 1px rgba(255,255,255,0.6), 0 12px 25px rgba(0,122,255,0.5); }

    /* ======== TABLE CARD ======== */
    .table-card { border-radius: 24px; overflow: hidden; margin-bottom: 50px; }
    .table-card-header {
      padding: 24px 28px; border-bottom: 1px solid rgba(255,255,255,0.4);
      display: flex; align-items: center; gap: 12px; background: rgba(255,255,255,0.15);
    }
    .table-card-header h2 { margin: 0; font-size: 18px; font-weight: 800; }
    .badge-count {
      background: rgba(0,122,255,0.15); color: var(--primary); font-size: 12px; font-weight: 800;
      padding: 4px 12px; border-radius: 50px; box-shadow: inset 0 1px 1px rgba(255,255,255,0.6);
    }
    .table-wrapper { overflow-x: auto; }
    table { width: 100%; border-collapse: separate; border-spacing: 0; }
    thead th {
      padding: 16px 28px; text-align: left; font-size: 12px; font-weight: 700; letter-spacing: 0.5px;
      text-transform: uppercase; color: var(--text-muted); background: rgba(0,0,0,0.015);
      border-bottom: 1px solid rgba(255,255,255,0.4);
    }
    tbody td { padding: 16px 28px; border-bottom: 1px solid rgba(0,0,0,0.03); transition: all 0.3s ease; }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); position: relative; }
    tbody tr:hover { 
      background: rgba(255,255,255,0.6); transform: scale(1.003);
      box-shadow: 0 6px 20px rgba(0,0,0,0.04); z-index: 2;
    }
    tbody tr:hover td { border-bottom-color: transparent; }
    .cell-id { color: var(--text-muted); font-size: 14px; font-weight: 600; }
    .cell-name { font-weight: 700; font-size: 15px; }
    .badge-koridor {
      display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 50px;
      font-size: 12px; font-weight: 800; box-shadow: inset 0 1px 1px rgba(255,255,255,0.6);
    }
    .badge-koridor.k5 { background: rgba(255,149,0,0.15); color: #d97706; }
    .badge-koridor.k6 { background: rgba(0,122,255,0.15); color: var(--primary); }
    .cell-coords {
      font-size: 13px; color: #475569; background: rgba(255,255,255,0.6); padding: 6px 12px;
      border-radius: 10px; font-family: 'SF Mono', monospace; display: inline-block;
      box-shadow: inset 0 1px 2px rgba(0,0,0,0.03);
    }
    .action-btns { display: flex; gap: 10px; }
    .btn-action {
      width: 38px; height: 38px; border-radius: 12px; border: none; cursor: pointer; font-size: 14px;
      display: flex; align-items: center; justify-content: center; transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      box-shadow: inset 0 1px 1px rgba(255,255,255,0.6), 0 4px 10px rgba(0,0,0,0.05);
    }
    .btn-edit { background: rgba(255,149,0,0.15); color: var(--warning); }
    .btn-edit:hover { background: var(--warning); color: white; transform: translateY(-3px) scale(1.1); box-shadow: 0 8px 15px rgba(255,149,0,0.3); }
    .btn-del { background: rgba(255,59,48,0.15); color: var(--danger); }
    .btn-del:hover { background: var(--danger); color: white; transform: translateY(-3px) scale(1.1); box-shadow: 0 8px 15px rgba(255,59,48,0.3); }

    /* Empty State */
    .empty-state { text-align: center; padding: 70px 20px; color: var(--text-muted); }
    .empty-state i { font-size: 50px; margin-bottom: 20px; opacity: 0.2; display: block; }
    .empty-state p { font-size: 16px; margin: 4px 0; }

    /* ======== MODAL ======== */
    .modal-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.25); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      z-index: 1000; display: none; justify-content: center; align-items: center; transition: opacity 0.3s;
    }
    .modal-overlay.active { display: flex; }
    .modal-box {
      background: linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.55) 100%);
      backdrop-filter: blur(60px) saturate(220%); -webkit-backdrop-filter: blur(60px) saturate(220%);
      border-radius: 32px; padding: 40px; width: 90%; max-width: 580px;
      box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.9), inset 0 2px 10px rgba(255, 255, 255, 0.7), 0 40px 80px rgba(0,0,0,0.25);
      animation: modalPop 0.4s cubic-bezier(0.16, 1, 0.3, 1); max-height: 90vh; overflow-y: auto;
    }
    @keyframes modalPop { from { transform: translateY(40px) scale(0.92); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
    .modal-title { margin: 0 0 28px 0; font-size: 24px; font-weight: 800; }
    .form-group { margin-bottom: 18px; }
    .form-group label { display: block; margin-bottom: 8px; font-size: 13px; font-weight: 700; color: var(--text-muted); }
    .form-group input, .form-group select {
      width: 100%; padding: 14px 18px; border: none; border-radius: 16px; font-family: 'Inter', sans-serif; font-size: 15px; 
      background: rgba(255,255,255,0.5); box-shadow: inset 0 0 0 1px rgba(255,255,255,0.7), inset 0 2px 6px rgba(0,0,0,0.03); transition: all 0.3s;
    }
    .form-group input:focus, .form-group select:focus {
      outline: none; background: rgba(255,255,255,0.9); box-shadow: inset 0 0 0 2px var(--primary), 0 8px 20px rgba(0,122,255,0.15);
    }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .modal-footer { display: flex; justify-content: flex-end; gap: 12px; margin-top: 32px; }
    .btn-cancel {
      padding: 14px 26px; border-radius: 16px; background: rgba(0,0,0,0.05); color: var(--text-main); border: none;
      font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer; box-shadow: inset 0 1px 1px rgba(255,255,255,0.6); transition: all 0.3s;
    }
    .btn-cancel:hover { background: rgba(0,0,0,0.1); transform: translateY(-2px); }
    .btn-save {
      padding: 14px 26px; border-radius: 16px; background: linear-gradient(135deg, var(--primary), #0056b3); color: white;
      border: none; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 700; cursor: pointer;
      box-shadow: inset 0 1px 1px rgba(255,255,255,0.5), 0 8px 20px rgba(0,122,255,0.35); transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .btn-save:hover { transform: translateY(-3px) scale(1.02); box-shadow: inset 0 1px 1px rgba(255,255,255,0.7), 0 12px 25px rgba(0,122,255,0.45); }
    #location-picker-map {
      width: 100%; height: 240px; border-radius: 18px; border: 2px solid rgba(255,255,255,0.7); margin-top: 8px; cursor: crosshair; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);
    }
    .map-hint { font-size: 12.5px; color: var(--text-muted); margin-top: 8px; display: flex; align-items: center; gap: 6px; }
    #picked-coords-display {
      font-size: 13px; font-weight: 700; color: var(--primary); background: rgba(0,122,255,0.1); border-radius: 10px;
      padding: 8px 14px; margin-top: 10px; display: none; box-shadow: inset 0 1px 1px rgba(255,255,255,0.6);
    }

    /* ======== TOAST & CONFIRM ======== */
    .glass-toast {
      position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%) translateY(100px);
      background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.75));
      backdrop-filter: blur(30px); -webkit-backdrop-filter: blur(30px);
      padding: 16px 28px; border-radius: 50px; box-shadow: inset 0 1px 1px rgba(255,255,255,0.9), 0 15px 40px rgba(0,0,0,0.15);
      display: flex; align-items: center; gap: 14px; font-size: 15px; font-weight: 700; color: var(--text-main);
      z-index: 9999; opacity: 0; transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); pointer-events: none;
    }
    .glass-toast.show { transform: translateX(-50%) translateY(0); opacity: 1; }
    .glass-toast.error i { color: var(--danger); font-size: 20px; }
    .glass-toast.success i { color: var(--success); font-size: 20px; }

    .glass-confirm-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.3); backdrop-filter: blur(16px);
      z-index: 9999; display: none; justify-content: center; align-items: center;
    }
    .glass-confirm-overlay.active { display: flex; }
    .glass-confirm-box {
      background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.75) 100%); backdrop-filter: blur(40px);
      border-radius: 28px; padding: 36px; width: 90%; max-width: 380px; text-align: center;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.9), 0 30px 60px rgba(0,0,0,0.25); animation: modalPop 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .glass-confirm-icon { font-size: 48px; color: var(--danger); margin-bottom: 20px; filter: drop-shadow(0 8px 10px rgba(255,59,48,0.2)); }
    .glass-confirm-text { font-size: 16px; font-weight: 700; color: var(--text-main); margin-bottom: 30px; }
    .glass-confirm-actions { display: flex; gap: 12px; justify-content: center; }
    .btn-confirm-cancel { flex: 1; padding: 12px; border-radius: 14px; border: none; background: rgba(0,0,0,0.06); font-weight: 700; cursor: pointer; transition: 0.3s; box-shadow: inset 0 1px 1px rgba(255,255,255,0.6);}
    .btn-confirm-cancel:hover { background: rgba(0,0,0,0.1); transform: translateY(-2px); }
    .btn-confirm-ok { flex: 1; padding: 12px; border-radius: 14px; border: none; background: linear-gradient(135deg, var(--danger), #c92a21); color: white; font-weight: 700; cursor: pointer; box-shadow: inset 0 1px 1px rgba(255,255,255,0.4), 0 6px 15px rgba(255,59,48,0.3); transition: 0.3s; }
    .btn-confirm-ok:hover { transform: translateY(-2px); box-shadow: inset 0 1px 1px rgba(255,255,255,0.6), 0 10px 20px rgba(255,59,48,0.4); }
  </style>`;

content = content.replace(/<style>[\s\S]*?<\/style>/i, newStyle);

if (!content.includes('blob-4')) {
    content = content.replace('<div class="blob blob-3"></div>', '<div class="blob blob-3"></div>\n    <div class="blob blob-4"></div>');
}

// Add the glass-panel class to toolbar and table-card
content = content.replace('class="toolbar"', 'class="toolbar glass-panel"');
content = content.replace('class="table-card"', 'class="table-card glass-panel"');

fs.writeFileSync(path, content);
console.log("Admin CSS completely overwritten to Kece Badai Mode!");
