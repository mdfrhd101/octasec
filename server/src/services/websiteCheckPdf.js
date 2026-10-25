import PDFDocument from "pdfkit";

const COLORS = { critical: "#b42318", high: "#c4322b", warning: "#a15c00", good: "#147d46", info: "#35566d" };
const ascii = (v) => String(v ?? "").replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2013\u2014]/g, "-").replace(/[^\x09\x0a\x0d\x20-\x7e]/g, "?");

export function websiteCheckPdf(report, reportId) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margins: { top: 48, bottom: 54, left: 48, right: 48 }, bufferPages: true, info: { Title: `OctaSec Website Safety Check - ${report.target}`, Author: "OctaSec", Subject: "Low-impact external website safety report" } });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const ensure = (height) => { if (doc.y + height > doc.page.height - 65) doc.addPage(); };
    const text = (value, options) => doc.text(ascii(value), options);

    doc.fillColor("#b42318").font("Helvetica-Bold").fontSize(22).text("OCTASEC");
    doc.fillColor("#111827").fontSize(17).text("Website Safety Check", { continued: false });
    doc.moveDown(0.5).font("Helvetica").fontSize(10).fillColor("#4b5563");
    text(`Target: ${report.target}`);
    text(`Checked: ${report.checkedAtDhaka} (Bangladesh)`);
    text(`Report ID: ${reportId}`);
    doc.moveDown(1.2);
    const urgent = report.overall.verdict === "urgent";
    doc.roundedRect(48, doc.y, doc.page.width - 96, 74, 5).fill(urgent ? "#fff0ee" : "#f2f7f4");
    const boxY = doc.y + 13;
    doc.fillColor(urgent ? COLORS.critical : COLORS.good).font("Helvetica-Bold").fontSize(14).text(ascii(report.overall.label), 60, boxY, { width: doc.page.width - 120 });
    doc.fillColor("#263442").font("Helvetica").fontSize(10).text(ascii(report.overall.summary), 60, boxY + 23, { width: doc.page.width - 120 });
    doc.y += 88;
    doc.fillColor("#111827").font("Helvetica-Bold").fontSize(11);
    text(`Critical ${report.counts.critical || 0}   High ${report.counts.high || 0}   Warning ${report.counts.warning || 0}   Good ${report.counts.good || 0}   Info ${report.counts.info || 0}`);
    doc.moveDown(1.2);

    let lastCategory = "";
    for (const f of report.findings) {
      if (f.category !== lastCategory) {
        ensure(70);
        doc.moveDown(lastCategory ? 0.8 : 0).fillColor("#111827").font("Helvetica-Bold").fontSize(13).text(ascii(f.category));
        doc.moveDown(0.3);
        lastCategory = f.category;
      }
      ensure(95);
      doc.fillColor(COLORS[f.status] || COLORS.info).font("Helvetica-Bold").fontSize(10.5);
      text(`${String(f.status).toUpperCase()} - ${f.title}`, { width: doc.page.width - 96 });
      doc.fillColor("#374151").font("Helvetica").fontSize(9.5);
      text(`Evidence: ${f.evidence}`, { width: doc.page.width - 96 });
      doc.fillColor("#1f4e6c");
      text(`Action: ${f.remediation}`, { width: doc.page.width - 96 });
      doc.moveDown(0.55);
    }

    ensure(120);
    doc.moveDown(0.8).fillColor("#111827").font("Helvetica-Bold").fontSize(12).text("Scope and next step");
    doc.fillColor("#4b5563").font("Helvetica").fontSize(9.5);
    text(report.limitations);
    doc.moveDown(0.7);
    text("Need the issues fixed or want a deeper authorized assessment? Contact OctaSec at support@octasec.ai or https://octasec.ai/contact");
    text(`${report.requests} bounded web request(s), plus DNS and TLS checks. Sensitive-path response values were inspected in memory and never included in this report.`);

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fillColor("#6b7280").font("Helvetica").fontSize(8).text(`OctaSec | ${ascii(report.target)} | Page ${i + 1} of ${range.count}`, 48, doc.page.height - 38, { width: doc.page.width - 96, align: "center", lineBreak: false });
    }
    doc.end();
  });
}
