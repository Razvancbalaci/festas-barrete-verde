import { jsPDF } from 'jspdf'

const BARRETE = [27, 94, 63]
const CREME = [248, 244, 236]
const INK = [28, 28, 28]
const MUTED = [90, 90, 90]

function formatGeneratedAt(date, locale = 'pt-PT') {
  try {
    return date.toLocaleString(locale, {
      timeZone: 'Europe/Lisbon',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return date.toISOString()
  }
}

/**
 * Gera e descarrega um PDF a partir do modelo de buildAnalyticsReportModel.
 * @param {ReturnType<import('./analyticsReport').buildAnalyticsReportModel>} model
 * @param {{ footerLabel?: string, generatedLabel?: string }} [labels]
 */
export function downloadAnalyticsReportPdf(model, labels = {}) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  const marginX = 16
  const contentW = pageW - marginX * 2
  let y = 0

  function ensureSpace(needed) {
    if (y + needed < pageH - 18) return
    doc.addPage()
    y = 18
  }

  // Header brand bar
  doc.setFillColor(...BARRETE)
  doc.rect(0, 0, pageW, 32, 'F')
  doc.setFillColor(232, 161, 58)
  doc.rect(0, 32, pageW, 1.2, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.text(model.brandTitle, marginX, 14, { maxWidth: contentW })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(220, 230, 224)
  if (model.brandSubtitle) {
    doc.text(model.brandSubtitle, marginX, 21, { maxWidth: contentW })
  }
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(10)
  doc.text(model.period, marginX, 28, { maxWidth: contentW })

  y = 42

  for (const section of model.sections) {
    ensureSpace(22)
    doc.setFillColor(...CREME)
    doc.roundedRect(marginX, y - 4, contentW, 8, 1.5, 1.5, 'F')
    doc.setTextColor(...BARRETE)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.text(section.title, marginX + 2, y + 1.5)
    y += 10

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    for (const metric of section.metrics || []) {
      ensureSpace(7)
      doc.setTextColor(...MUTED)
      doc.text(String(metric.label), marginX + 2, y)
      doc.setTextColor(...INK)
      doc.setFont('helvetica', 'bold')
      const value = String(metric.value ?? '—')
      doc.text(value, pageW - marginX, y, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      y += 5.5
    }

    for (const list of section.lists || []) {
      ensureSpace(10)
      y += 2
      doc.setTextColor(...BARRETE)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.text(list.title, marginX + 2, y)
      y += 5
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      list.rows.forEach((row, i) => {
        ensureSpace(6)
        doc.setTextColor(...MUTED)
        const label = `${i + 1}. ${row.label}`
        const clipped = doc.splitTextToSize(label, contentW - 22)
        doc.text(clipped[0], marginX + 2, y)
        doc.setTextColor(...INK)
        doc.setFont('helvetica', 'bold')
        doc.text(String(row.value ?? 0), pageW - marginX, y, { align: 'right' })
        doc.setFont('helvetica', 'normal')
        y += 5
      })
    }

    y += 6
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages()
  const generated =
    labels.generatedLabel ||
    `Gerado em ${formatGeneratedAt(model.generatedAt)}`
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i)
    doc.setDrawColor(200, 200, 200)
    doc.line(marginX, pageH - 12, pageW - marginX, pageH - 12)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(...MUTED)
    doc.text(generated, marginX, pageH - 7)
    doc.text(`${i} / ${pageCount}`, pageW - marginX, pageH - 7, {
      align: 'right',
    })
  }

  doc.save(model.filename)
  return model.filename
}
