import PDFDocument from 'pdfkit';
import type { Invoice } from './invoice.builder.js';

const INK = '#0F172A';
const MUTED = '#64748B';
const LINE = '#E2E8F0';

// The built-in PDF fonts have no rupee glyph, so amounts use the ISO code.
const money = (amount: number) =>
  `INR ${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Renders an invoice to a PDF buffer. Pure function of the invoice model. */
export function renderInvoicePdf(invoice: Invoice): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 56,
      info: { Title: `Invoice ${invoice.number}` },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;

    doc.fillColor(INK).font('Helvetica-Bold').fontSize(20).text('Wheelhouse', left, 56);
    doc.font('Helvetica').fontSize(9).fillColor(MUTED).text('Vehicle rentals', left, 80);
    doc
      .font('Helvetica-Bold')
      .fontSize(20)
      .fillColor(INK)
      .text('Invoice', left, 56, { width, align: 'right' });
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(MUTED)
      .text(invoice.number, left, 80, { width, align: 'right' })
      .text(`Issued ${invoice.issuedOn}`, { width, align: 'right' });

    const block = (title: string, lines: string[], x: number, y: number) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(MUTED)
        .text(title.toUpperCase(), x, y, { characterSpacing: 0.5 });
      doc.font('Helvetica').fontSize(10).fillColor(INK);
      lines.forEach((line, index) =>
        doc.text(line, x, y + 14 + index * 14, { width: width / 3 - 8 }),
      );
    };
    const top = 130;
    block('Billed to', [invoice.customer.name, invoice.customer.email], left, top);
    block('Owner', [invoice.owner.name], left + width / 3, top);
    block(
      'Vehicle',
      [invoice.vehicle.name, invoice.vehicle.registrationNumber, invoice.vehicle.location],
      left + (2 * width) / 3,
      top,
    );

    const periodY = top + 80;
    block(
      'Booking',
      [`ID ${invoice.bookingId}`, `Status ${invoice.status.replace('_', ' ').toLowerCase()}`],
      left,
      periodY,
    );
    block(
      'Rental period',
      [`${invoice.period.startDate} to ${invoice.period.endDate}`, `${invoice.period.days} day(s)`],
      left + width / 3,
      periodY,
    );

    // Line items
    let y = periodY + 70;
    const cols = {
      qty: left + width * 0.6,
      rate: left + width * 0.72,
      amount: left + width * 0.86,
    };
    doc.moveTo(left, y).lineTo(right, y).strokeColor(LINE).stroke();
    y += 8;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED);
    doc
      .text('DESCRIPTION', left, y)
      .text('DAYS', cols.qty, y)
      .text('DAILY RATE', cols.rate - 20, y, { width: 80, align: 'right' })
      .text('AMOUNT', cols.amount - 20, y, { width: right - cols.amount + 20, align: 'right' });
    y += 18;
    doc.font('Helvetica').fontSize(10).fillColor(INK);
    for (const line of invoice.lines) {
      doc.text(line.description, left, y, { width: width * 0.55 });
      doc.text(String(line.quantity), cols.qty, y);
      doc.text(money(line.unitPrice), cols.rate - 20, y, { width: 80, align: 'right' });
      doc.text(money(line.amount), cols.amount - 20, y, {
        width: right - cols.amount + 20,
        align: 'right',
      });
      y += 30;
    }
    doc.moveTo(left, y).lineTo(right, y).strokeColor(LINE).stroke();
    y += 12;

    const totalRow = (label: string, value: string, bold = false) => {
      doc
        .font(bold ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(bold ? 12 : 10)
        .fillColor(bold ? INK : MUTED);
      doc.text(label, cols.rate - 60, y, { width: 120, align: 'right' });
      doc
        .fillColor(INK)
        .text(value, cols.amount - 40, y, { width: right - cols.amount + 40, align: 'right' });
      y += bold ? 22 : 18;
    };
    totalRow('Subtotal', money(invoice.subtotal));
    totalRow(
      invoice.discount.code ? `Discount (${invoice.discount.code})` : 'Discount',
      `- ${money(invoice.discount.amount)}`,
    );
    totalRow('Total', money(invoice.total), true);

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(MUTED)
      .text(
        'Rental days run from the pickup date up to (not including) the return date. Prices were fixed when the booking was made.',
        left,
        doc.page.height - doc.page.margins.bottom - 24,
        { width, align: 'center' },
      );
    doc.end();
  });
}
