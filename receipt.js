/* 永駿合約系統：繳款單版面（簽約頁、繳款單頁共用）
   RC.page(r, copyLabel, wm) 回傳一張 A4 繳款單 <section>；r 是後端 payView 的資料加上公司資料 */
(function () {
  const CSS = `
.rcp{width:210mm;height:297mm;padding:9mm 11mm 7mm;background:#fff;position:relative;overflow:hidden;font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;color:#161616;font-size:9pt;line-height:1.4;box-sizing:border-box}
.rcp *{box-sizing:border-box}
.rcp h1{font-size:18pt;letter-spacing:.8em;text-align:center;margin:0 0 1.5mm;padding-left:.8em}
.rcp .sub{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:1.5mm;font-size:9pt}
.rcp .sub .no{font-size:10.5pt;font-weight:700}
.rcp .ver{display:inline-block;border:1px solid #161616;border-radius:3px;padding:0 1.5mm;margin-left:1.5mm;font-size:8.5pt}
.rcp table{width:100%;border-collapse:collapse;background:transparent}
.rcp td{border:1px solid #2b2b2b;padding:.9mm 1.6mm;vertical-align:middle}
.rcp td.h{background:rgba(120,105,80,.09);white-space:nowrap;width:1%;font-weight:500}
.rcp tr.th td{background:rgba(120,105,80,.09);text-align:center;font-weight:500}
.rcp td.c{text-align:center}.rcp td.r{text-align:right;font-variant-numeric:tabular-nums}
.rcp tr.new td{font-weight:700}
.rcp tr.new td.mk::before{content:"本次"}
.rcp .sec{font-weight:700;margin:2.5mm 0 1mm;font-size:9.5pt}
.rcp .sum{border:1px solid #2b2b2b;margin-top:2mm}
.rcp .sum .rw{display:flex;justify-content:space-between;gap:4mm;padding:1.1mm 1.8mm;border-top:1px solid #2b2b2b}
.rcp .sum .rw:first-child{border-top:0}
.rcp .big{font-size:10.5pt;font-weight:700}
.rcp .note{font-size:7.8pt;color:#555}
.rcp ol{margin:1mm 0 0;padding-left:1.6em;font-size:8.2pt;line-height:1.5}
.rcp .signs{display:flex;gap:3mm;margin-top:3mm}
.rcp .sbox{border:1px dashed #9a9a9a;border-radius:2px;position:relative;background:#fff}
.rcp .sbox .cap{position:absolute;left:1.5mm;top:.8mm;font-size:7.5pt;color:#777}
.rcp .foot{position:absolute;left:11mm;right:11mm;bottom:3.5mm;display:flex;justify-content:space-between;font-size:7pt;color:#666;border-top:1px solid #ccc;padding-top:.6mm}
.rcp .foot .cp{font-weight:700;color:#000;font-size:8.5pt;letter-spacing:.05em}`;
  function css() { if (document.getElementById('rcpCss')) return; const s = document.createElement('style'); s.id = 'rcpCss'; s.textContent = CSS; document.head.appendChild(s); }
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const money = n => Number(n || 0).toLocaleString('en-US');
  const roc = s => { const m = String(s || '').match(/^(\d{4})\/(\d{2})\/(\d{2})$/); return m ? (m[1] - 1911) + '/' + m[2] + '/' + m[3] : String(s || ''); };
  const rocLong = s => { const m = String(s || '').match(/^(\d{4})\/(\d{2})\/(\d{2})$/); return m ? `民國 ${m[1] - 1911} 年 ${+m[2]} 月 ${+m[3]} 日` : ''; };
  // 新臺幣大寫
  function zh(n) {
    n = Math.round(Number(n) || 0); if (!n) return '零元整';
    const D = '零壹貳參肆伍陸柒捌玖', U = ['', '拾', '佰', '仟'], B = ['', '萬', '億'];
    let out = '', sec = 0, needZero = false;
    while (n > 0) {
      const part = n % 10000; n = Math.floor(n / 10000);
      let s = '', z = false;
      for (let i = 0; i < 4; i++) { const d = Math.floor(part / Math.pow(10, i)) % 10;
        if (d) { s = D[d] + U[i] + (z ? '零' : '') + s; z = false; } else if (s) z = true; }
      if (part) { out = s + B[sec] + (needZero ? '零' : '') + out; needZero = part < 1000; }
      else if (out) needZero = true;
      sec++;
    }
    return out.replace(/^零+/, '') + '元整';
  }
  function watermark(name, no) {
    if (!name) return '';
    const c = document.createElement('canvas'), S = 2, TW = 330, TH = 230; c.width = TW * S; c.height = TH * S;
    const x = c.getContext('2d'); x.scale(S, S); x.translate(TW / 2, TH / 2); x.rotate(-28 * Math.PI / 180);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = 'rgba(150,25,25,.075)';
    const ff = '"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif';
    let fs = 21; x.font = `700 ${fs}px ${ff}`; while (x.measureText(name).width > 300 && fs > 12) { fs--; x.font = `700 ${fs}px ${ff}`; }
    x.fillText(name, 0, -9); x.font = `500 11px ${ff}`; x.fillText((no ? '合約編號 ' + no + '・' : '') + '本公司專用合約', 0, 14);
    return c.toDataURL('image/png');
  }
  // r: { 繳款單編號, 版次, 開立日, 合約編號, 客戶, 車牌, 車款, 業務, 成交價, 合約定金, 本次收款, 車價已收, 代辦已收, 剩餘尾款, lines, 備註 }, co: 公司
  function page(r, co, copy, wm) {
    css();
    const ver = Number(r['版次']) || 1, lines = r.lines || [], rows = Math.max(lines.length, 6);
    const dep = lines.filter(l => l.type === '定金').reduce((a, l) => a + l.amount, 0);
    const pre = lines.filter(l => l.type === '預付車款' || l.type === '尾款').reduce((a, l) => a + l.amount, 0);
    const fee = Number(r['代辦已收']) || 0, left = Number(r['剩餘尾款']) || 0;
    const sec = document.createElement('section'); sec.className = 'page rcp';
    if (wm) { sec.style.backgroundImage = `url(${wm})`; sec.style.backgroundSize = '330px 230px'; }
    const isCo = /公司/.test(copy || '');
    const prevNo = ver > 1 ? r['合約編號'] + '-' + ('0' + (ver - 1)).slice(-2) : '';
    sec.innerHTML = `
      <h1>繳款單</h1>
      <div class="sub"><span class="note">中古汽車買賣定型化契約書附件</span><span>開立日期：${rocLong(r['開立日'])}</span>
        <span class="no">No. ${esc(r['繳款單編號'])}<span class="ver">第 ${('0' + ver).slice(-2)} 版</span></span></div>
      <table>
        <tr><td class="h">收款公司（甲方）</td><td colspan="3">${esc(co.name)}${co.tax ? `　<span class="note">統一編號 ${esc(co.tax)}</span>` : ''}</td><td class="h">合約編號</td><td style="width:20%">${esc(r['合約編號'])}</td></tr>
        <tr><td class="h">乙方（買方）</td><td style="width:20%">${esc(r['客戶'])}</td><td class="h">牌照號碼</td><td style="width:15%">${esc(r['車牌'])}</td><td class="h">車　款</td><td>${esc(r['車款'])}</td></tr>
        <tr><td class="h">現金交易總價</td><td>NT$ ${money(r['成交價'])}</td><td class="h">合約定金</td><td colspan="3">NT$ ${money(r['合約定金'])}<span class="note">（定金不得超過總價百分之十）</span></td></tr>
      </table>
      <div class="sec">收款明細（截至本版之全部收款）</div>
      <table>
        <tr class="th"><td style="width:6%">項次</td><td style="width:12%">收款日期</td><td style="width:11%">款項</td><td style="width:11%">付款方式</td><td style="width:15%">金額（NT$）</td><td>收款帳戶／備註</td><td style="width:7%">版次</td></tr>
        ${Array.from({ length: rows }, (_, i) => { const l = lines[i];
          return l ? `<tr${l.ver === ver ? ' class="new"' : ''}><td class="c">${i + 1}</td><td class="c">${roc(l.date)}</td><td class="c">${esc(l.type)}</td><td class="c">${esc(l.method)}</td><td class="r">${money(l.amount)}</td><td>${esc([l.account, l.note].filter(Boolean).join('　'))}</td><td class="c">${('0' + l.ver).slice(-2)}</td></tr>`
            : `<tr><td class="c" style="color:#bbb">${i + 1}</td><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>`; }).join('')}
      </table>
      <div class="sum">
        <div class="rw"><span class="big">本次收款：新臺幣 ${zh(r['本次收款'])}</span><span class="big">NT$ ${money(r['本次收款'])}</span></div>
        <div class="rw"><span>車價累計已收 NT$ <b>${money(r['車價已收'])}</b><span class="note">（定金 ${money(dep)}＋預付車款／尾款 ${money(pre)}）</span></span>
          <span class="big">${left > 0 ? `尚未支付尾款 NT$ ${money(left)}` : '車價已全部付清'}</span></div>
        ${fee ? `<div class="rw"><span>代辦規費累計已收 NT$ <b>${money(fee)}</b><span class="note">（代收代付，不含於車價）</span></span><span></span></div>` : ''}
        ${r['備註'] ? `<div class="rw"><span>備註：${esc(r['備註'])}</span></div>` : ''}
      </div>
      <div class="sec" style="margin-top:3mm">說明</div>
      <ol>
        <li>本繳款單為合約編號 ${esc(r['合約編號'])} 之中古汽車買賣定型化契約書之附件，為甲方收款之憑證。</li>
        <li>定金以外之車價款項（預付車款、尾款）屬價金之預付，非屬定金。</li>
        <li>以匯款、刷卡、支票或貸款支付者，以實際入帳、兌現或撥款為準。</li>
        <li>本繳款單列載截至${rocLong(r['開立日'])}止之全部收款紀錄${ver > 1 ? `，並取代先前開立之繳款單（${esc(prevNo)}）` : ''}；各期款項以最新版本為準。如與先前繳款單記載不符，請於收受本單之日起七日內通知甲方。</li>
        <li>本繳款單經甲方用印及經手人簽名後生效。</li>
      </ol>
      ${isCo ? coSigns(r) : `<div class="signs">
        <div class="sbox" style="width:38mm;height:38mm"><span class="cap">甲方收款用印</span>${co.stamp && r['狀態'] === '已核准' ? `<img src="${co.stamp}" alt="" style="position:absolute;left:4mm;top:4mm;width:30mm;height:30mm;object-fit:contain">` : ''}</div>
        <div style="flex:1;display:flex;flex-direction:column;gap:2mm">
          <div class="sbox" style="height:14mm"><span class="cap">經手人簽名（業務 ${esc(r['業務'])}）</span></div>
          <div class="sbox" style="flex:1"><span class="cap">乙方確認簽名（確認上列「本次」款項已交付）</span></div></div>
      </div>`}
      <div class="foot"><span>繳款單 ${esc(r['繳款單編號'])}｜合約 ${esc(r['合約編號'])} 附件</span><span class="cp">${esc(copy || '')}</span></div>`;
    return sec;
  }
  // 公司留底聯的內部簽核欄：經手人／會計（行政核對）／財務經辦（核准）／主管簽核；系統簽核後自動帶入姓名與時間
  function coSigns(r) {
    const t = s => String(s || '').slice(0, 16);
    const cell = (name, when) => `<td style="height:24mm;vertical-align:middle;text-align:center"><div style="font-size:11pt;font-weight:700">${esc(name || '')}</div><div class="note">${esc(t(when))}</div></td>`;
    const n = Number(r.proofCount) || 0;
    return `<div class="sec" style="margin-top:3mm">內部簽核${n ? `<span class="note" style="font-weight:400">　繳款單據 ${n} 張，附於次頁</span>` : ''}</div>
      <table><tr class="th"><td style="width:25%">經手人</td><td style="width:25%">會計</td><td style="width:25%">財務經辦</td><td style="width:25%">主管簽核</td></tr>
        <tr>${cell(r['經手人名'], r['建立時間'])}${cell(r['會計名'], r['核對時間'])}${cell(r['財務名'], r['核准時間'])}${cell(r['主管名'], r['主管簽核時間'])}</tr></table>`;
  }
  // 繳款單據頁（附在公司留底聯後面）：每頁 2 張憑證
  function proofPages(r, co, imgs, wm) {
    css();
    const out = [], per = 2, total = Math.ceil(imgs.length / per);
    for (let p = 0; p < total; p++) {
      const sec = document.createElement('section'); sec.className = 'page rcp';
      if (wm) { sec.style.backgroundImage = `url(${wm})`; sec.style.backgroundSize = '330px 230px'; }
      const list = imgs.slice(p * per, p * per + per);
      sec.innerHTML = `
      <h1>繳款單據</h1>
      <div class="sub"><span class="note">繳款單 ${esc(r['繳款單編號'])} 附件${total > 1 ? `（${p + 1}／${total}）` : ''}</span><span class="no">No. ${esc(r['繳款單編號'])}</span></div>
      <table>
        <tr><td class="h">收款公司</td><td>${esc(co.name)}</td><td class="h">合約編號</td><td>${esc(r['合約編號'])}</td><td class="h">開立日期</td><td>${roc(r['開立日'])}</td></tr>
        <tr><td class="h">乙方（買方）</td><td>${esc(r['客戶'])}</td><td class="h">牌照號碼</td><td>${esc(r['車牌'])}</td><td class="h">本次收款</td><td>NT$ ${money(r['本次收款'])}</td></tr>
      </table>
      ${list.map((u, i) => `<div style="margin-top:3mm;border:1px solid #2b2b2b;height:${list.length > 1 ? 112 : 228}mm;display:flex;flex-direction:column">
        <div style="padding:.8mm 1.6mm;border-bottom:1px solid #2b2b2b;background:rgba(120,105,80,.09);font-size:8.5pt">單據 ${p * per + i + 1}</div>
        <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:2mm;min-height:0"><img src="${u}" alt="" style="max-width:100%;max-height:100%;object-fit:contain"></div></div>`).join('')}
      <div class="foot"><span>繳款單 ${esc(r['繳款單編號'])}｜繳款單據</span><span class="cp">第一聯　公司留底聯</span></div>`;
      out.push(sec);
    }
    return out;
  }
  // 簡易 PDF：每張圖一頁 A4
  function pdf(imgs) {
    const enc = new TextEncoder(), parts = [], off = []; let len = 0;
    const push = x => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
    const obj = (k, fn) => { off[k] = len; push(k + ' 0 obj\n'); fn(); push('\nendobj\n'); };
    const W = 595.28, H = 841.89, n = 2 + imgs.length * 3;
    push('%PDF-1.4\n');
    obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
    obj(2, () => push('<< /Type /Pages /Kids [' + imgs.map((_, i) => (3 + i * 3) + ' 0 R').join(' ') + '] /Count ' + imgs.length + ' >>'));
    imgs.forEach((im, i) => { const p = 3 + i * 3;
      obj(p, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${p + 1} 0 R >> >> /Contents ${p + 2} 0 R >>`));
      obj(p + 1, () => { push(`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.data.length} >>\nstream\n`); push(im.data); push('\nendstream'); });
      const cs = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`; obj(p + 2, () => push(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`)); });
    const x = len; let xr = 'xref\n0 ' + (n + 1) + '\n0000000000 65535 f \n'; for (let k = 1; k <= n; k++) xr += String(off[k]).padStart(10, '0') + ' 00000 n \n';
    push(xr + 'trailer\n<< /Size ' + (n + 1) + ' /Root 1 0 R >>\nstartxref\n' + x + '\n%%EOF\n');
    return new Blob(parts, { type: 'application/pdf' });
  }
  function jpeg(cv) { return new Promise((res, rej) => cv.toBlob(b => b ? b.arrayBuffer().then(a => res({ data: new Uint8Array(a), w: cv.width, h: cv.height })) : rej(new Error('toBlob failed')), 'image/jpeg', 0.9)); }

  // ===== 車籍資料申請單（證件申請）=====
  // r: 證件申請資料（後端 docView），c: { contract, car, company }
  function docPage(r, c, wm) {
    css();
    const sec = document.createElement('section'); sec.className = 'page rcp';
    if (wm) { sec.style.backgroundImage = `url(${wm})`; sec.style.backgroundSize = '330px 230px'; }
    const items = c.items || [], has = x => (r.items || []).indexOf(x) >= 0, all = items.length && items.every(has);
    const lab = x => x === '鑰匙' && r['鑰匙數量'] ? `鑰匙（${r['鑰匙數量']} 把）` : x === '鑑定報告' && c.car && /^(TSI|GOO)/.test(c.car.cert || '') ? `鑑定報告（${c.car.cert}）` : x;
    const bx = on => `<span style="display:inline-block;width:3.2mm;height:3.2mm;border:1px solid #222;margin-right:1mm;vertical-align:-.4mm;text-align:center;line-height:3mm;font-size:8pt">${on ? '✓' : ''}</span>`;
    const k = c.contract, car = c.car;
    const dt = s => { const m = String(s || '').match(/^(\d{4})\/(\d{2})\/(\d{2})(?:\s+(\d{2}:\d{2}))?/); return m ? `${m[1]}-${m[2]}-${m[3]}${m[4] ? ' ' + m[4] : ''}` : ''; };
    const sign = (t, name, when) => `<td style="height:20mm;vertical-align:top"><div class="note">${t}</div><div style="font-size:10.5pt;font-weight:700;margin-top:2mm;text-align:center">${esc(name || '')}</div><div class="note" style="text-align:center">${esc(when || '')}</div></td>`;
    sec.innerHTML = `
      <h1 style="letter-spacing:.35em">車籍資料申請單</h1>
      <div class="sub"><span class="note">過戶用・領取後不需歸還</span><span>申請時間：${dt(r['申請時間'])}</span><span class="no">No. ${esc(r['申請單號'])}</span></div>
      <table>
        <tr><td class="h">申請公司</td><td colspan="3">${esc(c.company.name)}${c.company.tax ? `　<span class="note">統一編號 ${esc(c.company.tax)}</span>` : ''}</td><td class="h">合約編號</td><td style="width:20%">${esc(k.no)}</td></tr>
        <tr><td class="h">預計領取日</td><td>${dt(r['預計領取日']) || '—'}</td><td class="h">預計過戶日</td><td>${dt(k.transfer) || '—'}</td><td class="h">簽約日</td><td>${dt(k.signDate)}</td></tr>
      </table>
      <div class="sec">車輛</div>
      <table>
        <tr><td class="h">廠牌</td><td>${esc(car.brand)}</td><td class="h">車款</td><td>${esc(car.model)}</td><td class="h">出廠年月</td><td>${esc(car.year)}</td></tr>
        <tr><td class="h">原始車號</td><td><b>${esc(k.plate)}</b></td><td class="h">新領車號</td><td colspan="3">${esc(r['新領車號']) || '—'}</td></tr>
        <tr><td class="h">車身號碼</td><td colspan="5" style="letter-spacing:.06em">${esc(car.vin)}</td></tr>
      </table>
      <div class="sec">領取資料</div>
      <table>
        <tr><td style="line-height:2">${bx(all)}全部　${items.map(x => `${bx(has(x))}${esc(lab(x))}`).join('　')}</td></tr>
        <tr><td>其他：${esc(r['其他項目']) || '—'}</td></tr>
      </table>
      <div class="sec">過戶對象</div>
      <table>
        <tr><td class="h">類別</td><td style="width:22%">${bx(r['過戶對象類型'] === '客戶')}客戶　${bx(r['過戶對象類型'] === '同業')}同業</td>
            <td class="h">${/^\d{8}$/.test(r['過戶對象證號'] || '') ? '公司名稱' : '姓名'}</td><td>${esc(r['過戶對象'])}</td>
            <td class="h">${/^\d{8}$/.test(r['過戶對象證號'] || '') ? '統一編號' : '身分證字號'}</td><td style="width:18%">${esc(r['過戶對象證號'])}</td></tr>
      </table>
      ${r['備註'] ? `<div class="sec">備註</div><table><tr><td>${esc(r['備註'])}</td></tr></table>` : ''}
      <div class="sec">簽核</div>
      <table><tr>
        ${sign('申請人', r['申請人名'] || r['申請人'], dt(r['申請時間']))}
        ${sign('核定主管', r['核准人'], dt(r['核准時間']) + (r['核准備註'] ? '　' + r['核准備註'] : ''))}
        ${sign('領取人', r['領取人'], dt(r['領取時間']))}
        ${sign('保管人', r['領取人'], dt(r['領取時間']))}
      </tr></table>
      <ol style="margin-top:3mm">
        <li>本申請單為合約 ${esc(k.no)} 辦理過戶之用；車籍資料領取後隨案辦理，不需歸還。</li>
        <li>本申請單經核定主管核准後生效，並作為總部歸檔附件。</li>
      </ol>
      <div class="foot"><span>車籍資料申請單 ${esc(r['申請單號'])}｜合約 ${esc(k.no)}</span><span class="cp">${esc(r['狀態'] === '作廢' ? '（已作廢）' : '')}</span></div>`;
    return sec;
  }

  // ===== 交車確認單 =====
  // r: 交車資料（後端 dlvView 或草稿），c: dlvInit 回傳的資料
  function dlvPage(r, c, copy, wm) {
    css();
    const sec = document.createElement('section'); sec.className = 'page rcp';
    if (wm) { sec.style.backgroundImage = `url(${wm})`; sec.style.backgroundSize = '330px 230px'; }
    const k = c.contract, car = c.car, rules = c.rules || {}, fees = r.fees || [], ck = r.checks || {};
    const bx = on => `<span style="display:inline-block;width:3.2mm;height:3.2mm;border:1px solid #222;margin-right:1mm;vertical-align:-.4mm;text-align:center;line-height:3mm;font-size:8pt">${on ? '✓' : ''}</span>`;
    const yn = v => `${bx(v === '有')}有　${bx(v === '無')}無`;
    const due = Number(r['尾款']) || 0, keys = r.keys || car.keys || '';
    const label = [String(car.year || '').replace('.', '.'), car.brand, car.model, car.cc ? (car.cc / 1000).toFixed(1) : ''].filter(Boolean).join('-');
    sec.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2mm">
        <div><h1 style="text-align:left;padding-left:0;letter-spacing:.5em;margin:0">交車確認單</h1><div class="note">合約編號 ${esc(k.no)}</div></div>
        <div style="text-align:right;font-size:8.5pt;line-height:1.5"><b>${esc(c.company.name)}</b><br>${esc(c.company.addr || '')}<br>${c.company.phone ? 'Tel：' + esc(c.company.phone) : ''}<div class="no" style="font-size:10.5pt;font-weight:700">No. ${esc(r['交車單號'])}</div></div>
      </div>
      <table>
        <tr><td class="h">車款型式</td><td>${esc(label)}</td><td class="h">車身號碼</td><td style="letter-spacing:.04em">${esc(car.vin)}</td></tr>
        <tr><td class="h">牌照號碼</td><td>${esc(k.newPlate || k.plate)}${k.newPlate ? `<span class="note">（原 ${esc(k.plate)}）</span>` : ''}</td><td class="h">車主（乙方）</td><td>${esc(k.buyer)}</td></tr>
      </table>
      <table style="margin-top:2.5mm"><tr class="th"><td colspan="6">車款明細</td></tr>
        <tr><td class="h">車　價</td><td class="r">${money(r['成交價'])}</td><td class="h">已收（定金及預付車款）</td><td class="r">${money(r['車價已收'])}</td>
            <td class="h"><b>尾　款</b></td><td class="r" style="background:rgba(244,185,66,.35);font-weight:700;font-size:10.5pt;width:16%">${money(r['尾款'])}</td></tr></table>
      <div class="sec">點交項目</div>
      <table>
        <tr class="th"><td>點交項目</td><td style="width:22%">點交資料</td><td style="width:30%">備註</td></tr>
        <tr><td><b>尾款 NT$ ${money(due)}</b></td><td>${due > 0 ? `${bx(r['尾款狀態'] === '已收')}已收　${bx(r['尾款狀態'] !== '已收')}未收` : `${bx(true)}已付清`}</td><td>${due > 0 && r['尾款狀態'] !== '已收' ? esc(r['備註'] || '') : ''}</td></tr>
        ${(c.checks || []).map(x => `<tr><td>${x === '汽車鑰匙' ? `汽車鑰匙 ${esc(keys || '＿')} 把` : esc(x)}</td><td>${yn(ck[x])}</td><td></td></tr>`).join('')}
        <tr><td>胎壓檢查確認　前輪 <b>${esc(r['胎壓前'] || '＿＿')}</b> psi　後輪 <b>${esc(r['胎壓後'] || '＿＿')}</b> psi</td><td>${bx(r['胎壓前'] && r['胎壓後'])}已確認</td><td></td></tr>
      </table>
      <div style="display:flex;justify-content:space-between;margin:2.5mm 0 1.5mm;font-size:10pt"><span>里程數：<b>${money(r['交車里程'])}</b> 公里</span><span>交車日期：<b>${esc(String(r['交車時間'] || '').replace(/\//g, '-'))}</b></span></div>
      <table><tr class="th"><td>實際交車人</td><td>銷售顧問簽章</td></tr>
        <tr><td style="height:15mm;vertical-align:bottom"><span class="note">${r['實際交車人'] && r['實際交車人'] !== k.buyer ? '（非車主本人：' + esc(r['實際交車人']) + '）' : ''}</span></td><td style="vertical-align:bottom"><span class="note">${esc(k.sellerName || '')}</span></td></tr></table>
      <div style="border:1px solid #2b2b2b;margin-top:2mm;padding:1.5mm 2mm;font-size:7.8pt;line-height:1.5">
        <b>【實際交車人與車主不同之責任聲明】</b><br>
        立聲明人（車主及實際交車人）茲確認本車之車籍資料及車輛已點交完畢。實際交車人非車主本人者，車主與實際交車人均同意：本車交付後所生之交通違規（如罰單、吊扣牌照）、稅費、停車費、通行費（如 ETC），以及因使用本車所生之民事、刑事責任或交通事故，由車主與實際交車人自行負責並負連帶責任，與甲方無涉。本聲明不影響原車主依法應負之責任。
      </div>
      <div class="foot"><span>交車確認單 ${esc(r['交車單號'])}｜合約 ${esc(k.no)}</span><span class="cp">${esc(copy || '')}</span></div>`;
    return sec;
  }
  // ===== 出庫單 =====
  function outPage(r, c, wm) {
    css();
    const sec = document.createElement('section'); sec.className = 'page rcp';
    if (wm) { sec.style.backgroundImage = `url(${wm})`; sec.style.backgroundSize = '330px 230px'; }
    const k = c.contract, car = c.car;
    const sign = (t, name, when) => `<td style="height:22mm;vertical-align:top;width:33.3%"><div class="note">${t}</div><div style="font-size:11pt;font-weight:700;margin-top:3mm;text-align:center">${esc(name || '')}</div><div class="note" style="text-align:center">${esc(when || '')}</div></td>`;
    sec.innerHTML = `
      <h1>出庫單</h1>
      <div class="sub"><span class="note">出庫＝交車；附交車確認單 ${esc(r['交車單號'])}</span><span></span><span class="no">No. ${esc(r['交車單號'])}</span></div>
      <table>
        <tr><td class="h">車　號</td><td><b>${esc(k.newPlate || k.plate)}</b>${k.newPlate ? `<span class="note">（原 ${esc(k.plate)}）</span>` : ''}</td><td class="h">出廠年月</td><td>${esc(car.year)}</td></tr>
        <tr><td class="h">廠　牌</td><td>${esc(car.brand)}</td><td class="h">車　款</td><td>${esc(car.model)}</td></tr>
        <tr><td class="h">車身號碼</td><td colspan="3" style="letter-spacing:.04em">${esc(car.vin)}</td></tr>
        <tr><td class="h">出庫日期</td><td>${esc(String(r['交車時間'] || '').replace(/\//g, '-'))}</td><td class="h">出庫地點</td><td>${esc(r['出庫地點'])}</td></tr>
        <tr><td class="h">合約編號</td><td>${esc(k.no)}</td><td class="h">客　戶</td><td>${esc(k.buyer)}</td></tr>
      </table>
      <div class="sec">簽核</div>
      <table><tr>${sign('出庫人員', r['申請人名'] || '', String(r['建立時間'] || '').slice(0, 16))}${sign('核定主管', r['核准人'], r['核准時間'])}${sign('財務經辦', r['財務經辦'], (r['財務時間'] || '') + (r['財務繳款單'] ? '　繳款單 ' + r['財務繳款單'] : ''))}</tr></table>
      <div class="foot"><span>出庫單 ${esc(r['交車單號'])}｜${esc(c.company.name)}</span><span class="cp">總部歸檔</span></div>`;
    return sec;
  }
  // 照片合成 PDF（每張照片一頁，A4 寬）
  function photoPdf(imgs) {
    const enc = new TextEncoder(), parts = [], off = []; let len = 0;
    const push = x => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
    const obj = (k, fn) => { off[k] = len; push(k + ' 0 obj\n'); fn(); push('\nendobj\n'); };
    const n = 2 + imgs.length * 3;
    push('%PDF-1.4\n');
    obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
    obj(2, () => push('<< /Type /Pages /Kids [' + imgs.map((_, i) => (3 + i * 3) + ' 0 R').join(' ') + '] /Count ' + imgs.length + ' >>'));
    imgs.forEach((im, i) => { const p = 3 + i * 3, W = 595.28, H = +(W * im.h / im.w).toFixed(2);
      obj(p, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${p + 1} 0 R >> >> /Contents ${p + 2} 0 R >>`));
      obj(p + 1, () => { push(`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.data.length} >>\nstream\n`); push(im.data); push('\nendstream'); });
      const cs = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`; obj(p + 2, () => push(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`)); });
    const x = len; let xr = 'xref\n0 ' + (n + 1) + '\n0000000000 65535 f \n'; for (let k = 1; k <= n; k++) xr += String(off[k]).padStart(10, '0') + ' 00000 n \n';
    push(xr + 'trailer\n<< /Size ' + (n + 1) + ' /Root 1 0 R >>\nstartxref\n' + x + '\n%%EOF\n');
    return new Blob(parts, { type: 'application/pdf' });
  }

  // ===== 代辦費用（代收代付明細）：不是合約附件 =====
  // r: { 單號, 開立日, 客戶, 電話, 車牌, 車款, 合約編號, items:[{cat,name,amount,note}], 合計, 付款方式, 經手人名, 收款人, 收款時間, 備註 }
  function agentPage(r, co, copy) {
    css();
    const sec = document.createElement('section'); sec.className = 'page rcp';
    const items = r.items || [], rows = Math.max(items.length, 10), total = items.reduce((a, x) => a + (Number(x.amount) || 0), 0);
    const bx = on => `<span style="display:inline-block;width:3.2mm;height:3.2mm;border:1px solid #222;margin-right:1mm;vertical-align:-.4mm;text-align:center;line-height:3mm;font-size:8pt">${on ? '✓' : ''}</span>`;
    const roc2 = s => { const m = String(s || '').match(/^(\d{4})\/(\d{2})\/(\d{2})/); return m ? `${m[1] - 1911} 年 ${+m[2]} 月 ${+m[3]} 日` : ''; };
    sec.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:2mm">
        <div><h1 style="text-align:left;padding-left:0;letter-spacing:.3em;margin:0">代收代付明細</h1><div class="note">代辦費用・非屬車輛買賣價金</div></div>
        <div style="text-align:right;font-size:8.5pt;line-height:1.5"><b>${esc(co.name || '')}</b><br>${esc(co.addr || '')}<br>${co.phone ? 'Tel：' + esc(co.phone) : ''}<div style="font-size:10.5pt;font-weight:700">No. ${esc(r['單號'])}</div></div>
      </div>
      <table>
        <tr><td class="h">客　戶</td><td style="width:26%">${esc(r['客戶'])}</td><td class="h">電　話</td><td style="width:22%">${esc(r['電話'] || '')}</td><td class="h">開立日期</td><td>民國 ${roc2(r['開立日'])}</td></tr>
        <tr><td class="h">牌照號碼</td><td>${esc(r['車牌'] || '')}</td><td class="h">車　款</td><td>${esc(r['車款'] || '')}</td><td class="h">合約編號</td><td>${esc(r['合約編號'] || '—')}</td></tr>
      </table>
      <div class="sec">代收項目</div>
      <table>
        <tr class="th"><td style="width:7%">項次</td><td style="width:14%">類別</td><td>項目說明</td><td style="width:18%">金額（NT$）</td></tr>
        ${Array.from({ length: rows }, (_, i) => { const x = items[i];
          return x ? `<tr><td class="c">${i + 1}</td><td class="c">${esc(x.cat)}</td><td>${esc(x.name)}${x.note ? `<span class="note">（${esc(x.note)}）</span>` : ''}</td><td class="r">${money(x.amount)}</td></tr>`
            : `<tr><td class="c" style="color:#bbb">${i + 1}</td><td>&nbsp;</td><td></td><td></td></tr>`; }).join('')}
        <tr><td colspan="3" style="text-align:right;font-weight:700">合　計　新臺幣 ${zh(total)}</td><td class="r" style="font-weight:700;font-size:10.5pt;background:rgba(244,185,66,.35)">${money(total)}</td></tr>
      </table>
      <div style="margin-top:2mm;font-size:9.5pt">付款方式：${['現金', '匯款', '刷卡'].map(m => `${bx(r['付款方式'] === m)}${m}`).join('　')}</div>
      ${r['備註'] ? `<div style="margin-top:1mm">備註：${esc(r['備註'])}</div>` : ''}
      <div class="sec" style="margin-top:3mm">說明</div>
      <ol>
        <li>本明細所列款項為本公司受客戶委託代為收取，將轉付予各服務廠商或主管機關，非屬車輛買賣價金，亦非買賣契約之附件。</li>
        <li>過戶規費、稅費依主管機關實際核定金額為準；如有差額，多退少補。</li>
        <li>保養、配件、烤漆等項目由各服務廠商提供，相關品質與保固依該廠商之規定辦理。</li>
      </ol>
      <table style="margin-top:3mm"><tr class="th"><td>經手人</td><td>收款確認</td><td>客戶簽收</td></tr>
        <tr><td style="height:18mm;vertical-align:bottom;text-align:center;font-weight:700">${esc(r['經手人名'] || '')}</td>
            <td style="vertical-align:bottom;text-align:center"><b>${esc(r['收款人'] || '')}</b><div class="note">${esc(r['收款時間'] || '')}</div></td><td></td></tr></table>
      <div class="foot"><span>代收代付明細 ${esc(r['單號'])}${r['合約編號'] ? '｜合約 ' + esc(r['合約編號']) : ''}</span><span class="cp">${esc(copy || '')}</span></div>`;
    return sec;
  }

  // 一張 A4 印上下兩聯（上：公司留底聯，下：客戶收執聯，中間裁切線）；項目超過 8 筆時改用每聯一整頁 agentPage
  function agentSheet(r, co) {
    css();
    const items = r.items || [], total = items.reduce((a, x) => a + (Number(x.amount) || 0), 0), rows = Math.max(items.length, 6);
    const bx = on => `<span style="display:inline-block;width:3mm;height:3mm;border:1px solid #222;margin-right:.8mm;vertical-align:-.4mm;text-align:center;line-height:2.8mm;font-size:7.5pt">${on ? '✓' : ''}</span>`;
    const roc2 = s => { const m = String(s || '').match(/^(\d{4})\/(\d{2})\/(\d{2})/); return m ? `${m[1] - 1911}/${m[2]}/${m[3]}` : ''; };
    const half = copy => `<div style="height:136mm;position:relative;font-size:8.6pt">
      <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:1.5mm">
        <div><span style="font-size:15pt;font-weight:700;letter-spacing:.25em">代收代付明細</span><span class="note" style="margin-left:2mm">代辦費用・非屬車輛買賣價金</span></div>
        <div style="text-align:right;line-height:1.35"><b>${esc(co.name || '')}</b>${co.phone ? '　Tel ' + esc(co.phone) : ''}<br><b style="font-size:10pt">No. ${esc(r['單號'])}</b></div></div>
      <table><tr><td class="h">客戶</td><td>${esc(r['客戶'])}</td><td class="h">電話</td><td>${esc(r['電話'] || '')}</td><td class="h">開立日期</td><td>${roc2(r['開立日'])}</td></tr>
        <tr><td class="h">車牌</td><td>${esc(r['車牌'] || '')}</td><td class="h">車款</td><td>${esc(r['車款'] || '')}</td><td class="h">合約編號</td><td>${esc(r['合約編號'] || '—')}</td></tr></table>
      <table style="margin-top:1.5mm"><tr class="th"><td style="width:6%">項次</td><td style="width:13%">類別</td><td>項目說明</td><td style="width:17%">金額（NT$）</td></tr>
        ${Array.from({ length: rows }, (_, i) => { const x = items[i]; return x ? `<tr><td class="c">${i + 1}</td><td class="c">${esc(x.cat)}</td><td>${esc(x.name)}${x.note ? `<span class="note">（${esc(x.note)}）</span>` : ''}</td><td class="r">${money(x.amount)}</td></tr>`
          : `<tr><td class="c" style="color:#bbb">${i + 1}</td><td>&nbsp;</td><td></td><td></td></tr>`; }).join('')}
        <tr><td colspan="3" style="text-align:right;font-weight:700">合計　新臺幣 ${zh(total)}</td><td class="r" style="font-weight:700;font-size:10pt;background:rgba(244,185,66,.35)">${money(total)}</td></tr></table>
      <div style="display:flex;justify-content:space-between;margin-top:1.2mm"><span>付款方式：${['現金', '匯款', '刷卡'].map(m => `${bx(r['付款方式'] === m)}${m}`).join('　')}</span>${r['備註'] ? `<span>備註：${esc(r['備註'])}</span>` : ''}</div>
      <div class="note" style="margin-top:1mm;line-height:1.45">本明細款項為本公司受客戶委託代為收取，將轉付予各服務廠商或主管機關，非屬車輛買賣價金，亦非買賣契約之附件。過戶規費、稅費依主管機關實際核定金額多退少補；保養、配件、烤漆之品質與保固依各服務廠商規定辦理。</div>
      <table style="margin-top:1.5mm"><tr class="th"><td>經手人</td><td>收款確認</td><td>客戶簽收</td></tr>
        <tr><td style="height:12mm;vertical-align:bottom;text-align:center;font-weight:700">${esc(r['經手人名'] || '')}</td><td style="vertical-align:bottom;text-align:center"><b>${esc(r['收款人'] || '')}</b> <span class="note">${esc(r['收款時間'] || '')}</span></td><td></td></tr></table>
      <div style="position:absolute;right:0;bottom:0;font-weight:700;font-size:8.5pt;letter-spacing:.05em">${copy}</div></div>`;
    const sec = document.createElement('section'); sec.className = 'page rcp'; sec.style.padding = '7mm 11mm';
    sec.innerHTML = half('第一聯　公司留底聯') + `<div style="border-top:1px dashed #888;margin:3.5mm -11mm 4mm;position:relative"><span style="position:absolute;left:50%;top:-2.2mm;transform:translateX(-50%);background:#fff;padding:0 2mm;font-size:7pt;color:#888">✂ 沿虛線裁開</span></div>` + half('第二聯　客戶收執聯');
    return sec;
  }
  window.RC = { css, page, proofPages, docPage, dlvPage, outPage, agentPage, agentSheet, photoPdf, watermark, zh, pdf, jpeg, roc, money };
})();
