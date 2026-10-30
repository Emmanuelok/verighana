import { downloadEstimatePdf } from './estimate-pdf.js';
const byId = id => document.getElementById(id);
const money = value => new Intl.NumberFormat('en-GH', { maximumFractionDigits: 0 }).format(value);
const el = (tag, text, className) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; };
document.querySelectorAll('.retry').forEach(button => button.addEventListener('click', () => window.location.reload()));
window.addEventListener('online', () => { byId('connection-state').textContent = 'CONNECTION RESTORED · RETURN TO THE ONLINE VIEW'; });

fetch('/offline-catalogue.json').then(response => { if (!response.ok) throw Error('Unavailable'); return response.json(); }).then(data => {
  const audience = byId('audience');
  for (const item of data.audiences) { const option = el('option', item.label); option.value = item.id; audience.append(option); }
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem('vrg-estimate') || 'null'); } catch { /* This device has no saved estimate. */ }
  if (saved && data.audiences.some(item => item.id === saved.audience)) audience.value = saved.audience;
  function render() {
    const query = byId('search').value.trim().toLowerCase();
    const items = data.services.filter(item => (audience.value === 'all' || item.audiences.includes(audience.value)) && `${item.title} ${item.description} ${item.category}`.toLowerCase().includes(query));
    byId('result-count').textContent = `${items.length} ${items.length === 1 ? 'service' : 'services'} · saved catalogue`;
    byId('catalogue').replaceChildren();
    for (const item of items) {
      const article = el('article', undefined, 'card');
      article.append(el('div', item.category.toUpperCase(), 'eyebrow'), el('h2', item.title), el('p', item.description));
      const price = el('div', undefined, 'price');
      const value = audience.value === 'all' ? Math.min(...Object.values(item.prices)) : item.prices[audience.value];
      price.append(el('strong', `From GHS ${money(value)}`), el('span', `per ${item.unit} · ${item.days}`)); article.append(price); byId('catalogue').append(article);
    }
  }
  byId('search').addEventListener('input', render); audience.addEventListener('change', render); render();
  const savedItems = saved && data.audiences.some(item => item.id === saved.audience) && Array.isArray(saved.items) ? saved.items.slice(0, 12).filter(item => item && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 500 && data.services.some(service => service.id === item.id && service.audiences.includes(saved.audience))) : [];
  if (!savedItems.length) { byId('estimate').parentElement.classList.add('empty'); byId('estimate').append(el('p', 'No services have been saved on this device yet. Build an estimate when you are back online.')); return; }
  let total = 0;
  for (const item of savedItems) {
    const service = data.services.find(service => service.id === item.id); const amount = service.prices[saved.audience] * item.quantity; total += amount;
    const row = el('div', undefined, 'estimate-item');row.append(el('strong', service.title), el('span', `${item.quantity} × GHS ${money(service.prices[saved.audience])} · GHS ${money(amount)}`));byId('estimate').append(row);
  }
  const subtotal = el('p', 'Indicative subtotal', 'subtotal'); subtotal.append(el('strong', `GHS ${money(total)}`)); byId('estimate').append(subtotal);
  const download = el('button', 'Download saved estimate PDF', 'download'); download.type = 'button';
  download.addEventListener('click', async () => {
    download.disabled = true; download.textContent = 'Preparing PDF…';
    try {
      await downloadEstimatePdf({offline:true,pathway:data.audiences.find(item=>item.id===saved.audience).label,items:savedItems.map(item=>{const service=data.services.find(service=>service.id===item.id);return {title:service.title,quantity:item.quantity,unit:service.unit,unitPrice:service.prices[saved.audience],days:service.days,deliverables:service.deliverables||[]};})});
      download.textContent = 'Download saved estimate PDF';
    } catch { download.textContent = 'PDF unavailable. Try again'; }
    finally { download.disabled = false; }
  }); byId('estimate').append(download);
}).catch(() => { byId('load-error').hidden = false; byId('estimate').append(el('p', 'Please reconnect to complete offline setup.')); });
