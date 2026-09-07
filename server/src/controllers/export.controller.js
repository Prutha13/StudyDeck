import PDFDocument from 'pdfkit';
import Document from '../models/Document.js';
import Summary from '../models/Summary.js';

export async function exportPdf(req, res) {
  const doc = await Document.findOne({ _id: req.params.id, owner: req.user.id });
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const summary = await Summary.findOne({ document: doc._id });
  if (!summary) return res.status(404).json({ error: 'Summary not ready yet' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${doc.title.replace(/[^a-z0-9]/gi, '_')}.pdf"`);

  const pdf = new PDFDocument({ margin: 50 });
  pdf.pipe(res);

  pdf.fontSize(20).text(doc.title, { underline: true });
  pdf.moveDown();

  pdf.fontSize(14).text('Summary', { underline: true });
  pdf.fontSize(11).text(summary.summary);
  pdf.moveDown();

  pdf.fontSize(14).text('Action Items', { underline: true });
  summary.actionItems.forEach((t, i) => pdf.fontSize(11).text(`${i + 1}. ${t.task} — ${t.owner || 'Unassigned'} (${t.dueDate || 'No date'})`));
  pdf.moveDown();

  pdf.fontSize(14).text('Quiz', { underline: true });
  summary.quiz.forEach((q, i) => {
    pdf.fontSize(11).text(`Q${i + 1}. ${q.question}`);
    q.options.forEach((opt, j) => pdf.text(`   ${String.fromCharCode(97 + j)}) ${opt}`));
  });

  pdf.end();
}
