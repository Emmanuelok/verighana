import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { audiences, services, money, rate } from './catalog';
import { loadAssets } from './estimate-pdf';
import type { Brief } from './local-briefs';

export async function createBriefPdf(brief: Brief): Promise<Uint8Array> {
  const assets = await loadAssets();
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const regular = await pdf.embedFont(assets.regular, { subset: true });
  const bold = await pdf.embedFont(assets.bold, { subset: true });
  const serif = await pdf.embedFont(assets.serif, { subset: true });
  const logo = await pdf.embedPng(assets.logo);
  pdf.setTitle(`${brief.title || 'Research brief'} | Fullview Signature`);
  pdf.setAuthor('Fullview Signature by Veridanth Group');
  pdf.setSubject('Research planning brief');
  const width = 595.28, height = 841.89, margin = 46, usable = width - 2 * margin;
  const ink = rgb(.08, .13, .11), muted = rgb(.32, .39, .36), green = rgb(.027, .239, .208);
  let page: PDFPage;
  let y: number;
  function addPage() {
    page = pdf.addPage([width, height]);
    const dimensions = logo.scale(245 / logo.width);
    page.drawImage(logo, { x: margin, y: height - 35 - dimensions.height, ...dimensions });
    y = height - 116;
  }
  function line(text: string, size = 10.5, font: PDFFont = regular, color = ink) {
    if (y < 65 + size * 1.5) addPage();
    page.drawText(text, { x: margin, y, size, font, color });
    y -= size * 1.55;
  }
  function block(text: string, size = 10.5, font: PDFFont = regular, color = ink) {
    for (const paragraph of text.replaceAll('\r', '').split('\n')) {
      let current = '';
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const candidate = current ? current + ' ' + word : word;
        if (font.widthOfTextAtSize(candidate, size) <= usable) { current = candidate; continue; }
        if (current) { line(current, size, font, color); current = ''; }
        for (const char of word) {
          if (font.widthOfTextAtSize(current + char, size) > usable) { line(current, size, font, color); current = ''; }
          current += char;
        }
      }
      if (current) line(current, size, font, color);
      else if (!paragraph.trim()) y -= 8;
    }
    y -= 9;
  }
  function heading(text: string) { if (y < 135) addPage(); y -= 10; block(text, 12, bold, green); }
  addPage();
  block('RESEARCH BRIEF', 10, bold, green);
  block(brief.title || 'Untitled research draft', 24, serif);
  block(`Reference: ${brief.id}\nStatus: ${brief.status}\nPrepared: ${new Date(brief.createdAt).toLocaleDateString('en-GB')}`, 9.5, regular, muted);
  heading('Your project');
  block(`Research pathway: ${audiences.find(item => item.id === brief.audience)?.label || brief.audience}\nName: ${brief.name || 'Not provided'}\nEmail: ${brief.email || 'Not provided'}\nOrganisation: ${brief.organisation || 'Not specified'}\nRequested completion: ${brief.deadline || 'Not set'}\nBudget: ${brief.budget}`);
  heading('Research description');
  block(brief.description || 'To be completed.');
  heading('Requested support');
  if (!brief.selections.length) block('Custom scope — advice requested.');
  for (const item of brief.selections) {
    const service = services.find(service => service.id === item.id);
    if (!service) continue;
    block(`${item.quantity} × ${service.title}`, 11, bold);
    block(`GHS ${money(rate(service, brief.audience))} per ${service.unit} · GHS ${money(rate(service, brief.audience) * item.quantity)}\n${service.deliverables.join('; ')}`, 10, regular, muted);
  }
  heading('Indicative project estimate');
  block(brief.selections.length ? `GHS ${money(brief.estimate)}` : 'To be scoped', 19, bold, green);
  block('Saving or downloading this brief does not send it to Fullview, confirm a consultation or create a paid engagement. Scope, availability, fees, timing and applicable taxes require separate agreement.', 9.5, regular, muted);
  for (const [index, current] of pdf.getPages().entries()) {
    current.drawLine({ start: { x: margin, y: 43 }, end: { x: width - margin, y: 43 }, thickness: .6, color: rgb(.8, .84, .8) });
    current.drawText('Fullview Signature by Veridanth Group · fvsignature.com', { x: margin, y: 29, size: 8, font: regular, color: muted });
    current.drawText(`${index + 1} / ${pdf.getPageCount()}`, { x: width - margin - 28, y: 29, size: 8, font: regular, color: muted });
  }
  return pdf.save();
}

export async function downloadBriefPdf(brief: Brief): Promise<void> {
  const bytes = await createBriefPdf(brief);
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `Fullview-Signature-research-brief-${brief.id === 'UNSAVED DRAFT' ? 'draft' : brief.id}.pdf`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
