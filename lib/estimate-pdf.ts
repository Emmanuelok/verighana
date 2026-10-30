import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

export type EstimateDocument = {
  pathway: string;
  items: { title: string; quantity: number; unit: string; unitPrice: number; days: string; deliverables: string[] }[];
  generatedAt?: Date;
  offline?: boolean;
  packageProposal?: {title: string; notes: string[]};
};
type Assets = { regular: Uint8Array; bold: Uint8Array; serif: Uint8Array; logo: Uint8Array };
const assetPaths = {
  regular: '/fonts/dm-sans-regular.ttf', bold: '/fonts/dm-sans-semibold.ttf',
  serif: '/fonts/instrument-serif-regular.ttf', logo: '/brand/logo-dark.png',
};
const amount = (value: number) => new Intl.NumberFormat('en-GH', { maximumFractionDigits: 0 }).format(value);

export async function loadAssets(): Promise<Assets> {
  const entries = await Promise.all(Object.entries(assetPaths).map(async ([key, path]) => {
    const response = await fetch(path);
    if (!response.ok) throw new Error('The estimate assets could not be loaded. Please try again.');
    return [key, new Uint8Array(await response.arrayBuffer())] as const;
  }));
  return Object.fromEntries(entries) as Assets;
}

/** Shared by the online estimate and the saved offline catalogue. No project data leaves the browser. */
export async function createEstimatePdf(input: EstimateDocument, assets?: Assets): Promise<Uint8Array> {
  if (!input.items.length || input.items.length > 12) throw new Error('Select between 1 and 12 services.');
  if (input.items.some(item => !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 500 || !Number.isFinite(item.unitPrice) || item.unitPrice < 0)) {
    throw new Error('An estimate contains an invalid quantity or rate.');
  }
  const files = assets ?? await loadAssets();
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const [regular, bold, serif, logo] = await Promise.all([
    pdf.embedFont(files.regular, { subset: true }), pdf.embedFont(files.bold, { subset: true }),
    pdf.embedFont(files.serif, { subset: true }), pdf.embedPng(files.logo),
  ]);
  const generatedAt = input.generatedAt ?? new Date();
  const date = generatedAt.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const total = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  pdf.setTitle((input.packageProposal ? 'Draft package proposal' : 'Project estimate') + ' | Fullview Signature by Veridanth Group');
  pdf.setAuthor('Fullview Signature by Veridanth Group');
  pdf.setSubject(`${input.pathway} - indicative project planning estimate`);
  pdf.setCreationDate(generatedAt);
  pdf.setModificationDate(generatedAt);
  pdf.setLanguage('en-GH');
  const width = 595.28, height = 841.89, margin = 44, right = width - margin, usable = right - margin;
  const ink = rgb(.067, .067, .067), green = rgb(.027, .239, .208), muted = rgb(.32, .39, .36);
  const line = rgb(.83, .87, .83), paper = rgb(.963, .965, .947);
  let page!: PDFPage;
  let y = 0;
  const text = (value: string, x: number, top: number, size = 10, font: PDFFont = regular, color = ink) => {
    page.drawText(value, { x, y: height - top - size, size, font, color });
  };
  const alignRight = (value: string, x: number, top: number, size = 10, font: PDFFont = regular, color = ink) => {
    text(value, x - font.widthOfTextAtSize(value, size), top, size, font, color);
  };
  const wrap = (value: string, maxWidth: number, font: PDFFont, size: number): string[] => {
    const result: string[] = [];
    for (const paragraph of value.replace(/[\r\n]+/g, ' ').split(/\n/)) {
      let current = '';
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const candidate = current ? `${current} ${word}` : word;
        if (current && font.widthOfTextAtSize(candidate, size) > maxWidth) { result.push(current); current = word; }
        else current = candidate;
      }
      if (current) result.push(current);
    }
    return result;
  };
  const tableHeader = () => {
    page.drawRectangle({ x: margin, y: height - y - 28, width: usable, height: 28, color: green });
    text('SERVICE & SCOPE', margin + 10, y + 8, 8.5, bold, rgb(1, 1, 1));
    alignRight('QTY', 338, y + 8, 8.5, bold, rgb(1, 1, 1));
    alignRight('RATE (GHS)', 436, y + 8, 8.5, bold, rgb(1, 1, 1));
    alignRight('AMOUNT (GHS)', right - 10, y + 8, 8.5, bold, rgb(1, 1, 1));
    y += 38;
  };
  const addPage = (first = false) => {
    page = pdf.addPage([width, height]);
    const dimensions = logo.scale(268 / logo.width);
    page.drawImage(logo, { x: margin, y: height - 40 - dimensions.height, ...dimensions });
    alignRight(input.packageProposal ? 'DRAFT PACKAGE PROPOSAL' : 'PROJECT ESTIMATE', right, 46, 8.5, bold, muted);
    alignRight(date, right, 63, 8.5, regular, muted);
    y = 112;
    if (first) {
      const headingLines = wrap(input.packageProposal?.title || 'A clear starting point.', usable, serif, 26);
      headingLines.forEach(value => {text(value, margin, y, 26, serif); y += 31;}); y += 15;
      const pathLines = wrap(input.pathway, usable - 28, bold, 10.5);
      const boxHeight = 87 + (pathLines.length - 1) * 14;
      page.drawRectangle({ x: margin, y: height - y - boxHeight, width: usable, height: boxHeight, color: paper });
      text(input.offline ? 'SAVED OFFLINE ESTIMATE' : 'RESEARCH PATHWAY', margin + 14, y + 12, 8, bold, muted);
      pathLines.forEach((v, i) => text(v, margin + 14, y + 28 + i * 14, 10.5, bold));
      text(`${input.items.length} selected ${input.items.length === 1 ? 'service' : 'services'}`, margin + 14, y + boxHeight - 24, 9, regular, muted);
      alignRight(`GHS ${amount(total)}`, right - 14, y + boxHeight - 28, 16, bold, green);
      y += boxHeight + 24;
    } else {
      text('Your selected services', margin, y, 20, serif); y += 34;
    }
  };
  addPage(true);
  tableHeader();
  for (const [index, item] of input.items.entries()) {
    const titles = wrap(`${String(index + 1).padStart(2, '0')}  ${item.title}`, 265, bold, 10.5);
    const detail = wrap(`Per ${item.unit}  |  Typical turnaround: ${item.days}`, usable - 20, regular, 9);
    const scope = wrap(item.deliverables.join(' / '), usable - 20, regular, 9);
    const rowHeight = titles.length * 14 + detail.length * 12 + scope.length * 12 + 28;
    if (y + rowHeight > height - 70) { addPage(); tableHeader(); }
    titles.forEach((v, i) => text(v, margin + 10, y + i * 14, 10.5, bold));
    alignRight(String(item.quantity), 338, y, 10);
    alignRight(amount(item.unitPrice), 436, y, 10);
    alignRight(amount(item.unitPrice * item.quantity), right - 10, y, 10, bold);
    let innerY = y + titles.length * 14 + 5;
    detail.forEach(v => { text(v, margin + 10, innerY, 9, regular, muted); innerY += 12; });
    innerY += 3;
    scope.forEach(v => { text(v, margin + 10, innerY, 9, regular, muted); innerY += 12; });
    y += rowHeight;
    page.drawLine({ start: { x: margin, y: height - y + 7 }, end: { x: right, y: height - y + 7 }, thickness: .65, color: line });
    y += 6;
  }
  if (input.packageProposal) {
    if (y > height - 145) addPage();
    text('PACKAGE SCOPE · DRAFT FOR REVIEW', margin, y, 10, bold, green); y += 24;
    for (const note of input.packageProposal.notes) {
      for (const value of wrap(note, usable, regular, 9)) {
        if (y > height - 85) addPage();
        text(value, margin, y, 9, regular, muted); y += 13;
      }
      y += 10;
    }
  }
  const notes = 'These are indicative planning rates, subject to an agreed written scope and availability. Fieldwork, travel, recruitment, software licences, journal fees and applicable taxes are excluded unless expressly included. This is not an invoice. No payment is due.';
  const noteLines = wrap(notes, usable - 28, regular, 9);
  const closingHeight = 118 + noteLines.length * 13;
  if (y + closingHeight > height - 65) addPage();
  y += 10;
  text('Indicative subtotal', margin + 10, y, 12, bold);
  alignRight(`GHS ${amount(total)}`, right - 10, y - 3, 20, bold, green);
  y += 37;
  page.drawRectangle({ x: margin, y: height - y - (noteLines.length * 13 + 29), width: usable, height: noteLines.length * 13 + 29, color: paper });
  text('BEFORE WE BEGIN', margin + 14, y + 10, 8, bold, muted);
  noteLines.forEach((v, i) => text(v, margin + 14, y + 25 + i * 13, 9, regular, muted));
  y += noteLines.length * 13 + 44;
  text('Turn this estimate into a research brief at fvsignature.com/workspace.', margin, y, 10, regular, green);
  const pages = pdf.getPages();
  for (const [index, p] of pages.entries()) {
    page = p;
    page.drawLine({ start: { x: margin, y: 43 }, end: { x: right, y: 43 }, thickness: .65, color: line });
    text('Fullview Signature by Veridanth Group  |  fvsignature.com', margin, height - 32, 8, regular, muted);
    alignRight(`${index + 1} / ${pages.length}`, right, height - 32, 8, regular, muted);
  }
  return pdf.save();
}

export async function downloadEstimatePdf(input: EstimateDocument): Promise<void> {
  const bytes = await createEstimatePdf(input);
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `Fullview-Signature-${input.offline ? 'saved-' : ''}project-estimate-${(input.generatedAt ?? new Date()).toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
