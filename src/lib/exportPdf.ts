import jsPDF from 'jspdf';

interface RubricScore {
  criterion: string;
  weight: number;
  score: number;
}

interface SummaryContent {
  overall_score: number;
  hiring_signal: string;
  one_line_summary?: string;
  rubric_scores?: RubricScore[];
  strengths?: string[];
  concerns?: string[];
  recommended_follow_ups?: string[];
}

interface ExportData {
  challengeTitle: string;
  candidateName: string;
  duration: string;
  sessionDate: string;
  summary: SummaryContent;
  signalCounts: { green: number; yellow: number; red: number };
}

// Colors (matching dashboard dark theme mapped to PDF-friendly values)
const COLORS = {
  bg: [9, 9, 11] as [number, number, number],
  bgSecondary: [17, 17, 20] as [number, number, number],
  bgTertiary: [24, 24, 27] as [number, number, number],
  border: [39, 39, 42] as [number, number, number],
  textPrimary: [250, 250, 250] as [number, number, number],
  textSecondary: [161, 161, 170] as [number, number, number],
  textTertiary: [113, 113, 122] as [number, number, number],
  green: [52, 211, 153] as [number, number, number],
  red: [248, 113, 113] as [number, number, number],
  orange: [251, 146, 60] as [number, number, number],
  blue: [59, 130, 246] as [number, number, number],
  accent: [59, 130, 246] as [number, number, number],
};

function setColor(doc: jsPDF, color: [number, number, number]) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function setFill(doc: jsPDF, color: [number, number, number]) {
  doc.setFillColor(color[0], color[1], color[2]);
}

function setDraw(doc: jsPDF, color: [number, number, number]) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

function scoreColor(score: number): [number, number, number] {
  if (score >= 7) return COLORS.green;
  if (score >= 5) return COLORS.orange;
  return COLORS.red;
}

function hiringSignalColor(signal: string): [number, number, number] {
  if (signal.includes('yes')) return COLORS.green;
  if (signal.includes('no')) return COLORS.red;
  return COLORS.orange;
}

function wrapText(doc: jsPDF, text: string, maxWidth: number): string[] {
  return doc.splitTextToSize(text, maxWidth);
}

export function exportSessionPdf(data: ExportData) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentW = pageW - margin * 2;
  let y = 0;

  // Full-page dark background
  setFill(doc, COLORS.bg);
  doc.rect(0, 0, pageW, pageH, 'F');

  // ── Header bar ──
  setFill(doc, COLORS.bgSecondary);
  doc.rect(0, 0, pageW, 28, 'F');
  setDraw(doc, COLORS.border);
  doc.line(0, 28, pageW, 28);

  // Logo / brand
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  setColor(doc, COLORS.textPrimary);
  doc.text('CodeLens', margin, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  setColor(doc, COLORS.textTertiary);
  doc.text('Interview Report', margin, 18);

  // Date + duration on right
  doc.setFontSize(8);
  setColor(doc, COLORS.textTertiary);
  doc.text(data.sessionDate, pageW - margin, 12, { align: 'right' });
  doc.text(`Duration: ${data.duration}`, pageW - margin, 18, { align: 'right' });

  y = 36;

  // ── Challenge title + candidate ──
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  setColor(doc, COLORS.textPrimary);
  const titleLines = wrapText(doc, data.challengeTitle, contentW);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 7 + 2;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  setColor(doc, COLORS.textSecondary);
  doc.text(`Candidate: ${data.candidateName}`, margin, y);
  y += 10;

  // ── Divider ──
  setDraw(doc, COLORS.border);
  doc.line(margin, y, pageW - margin, y);
  y += 8;

  // ── Overall Score + Hiring Signal ──
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  setColor(doc, COLORS.textTertiary);
  doc.text('OVERALL SCORE', margin, y);
  doc.text('HIRING SIGNAL', margin + 50, y);
  y += 6;

  const score = Math.min(10, data.summary.overall_score);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  setColor(doc, COLORS.textPrimary);
  doc.text(score.toFixed(1), margin, y + 2);

  doc.setFontSize(14);
  setColor(doc, COLORS.textTertiary);
  doc.text('/10', margin + doc.getTextWidth(score.toFixed(1)) + 1, y + 2);

  // Hiring signal badge
  const signal = data.summary.hiring_signal?.replace(/_/g, ' ').toUpperCase() || 'N/A';
  const sigColor = hiringSignalColor(data.summary.hiring_signal || '');
  const badgeX = margin + 50;
  const badgeW = doc.setFontSize(10).getTextWidth(signal) + 8;
  setFill(doc, [sigColor[0], sigColor[1], sigColor[2]]);
  doc.roundedRect(badgeX, y - 6, badgeW, 9, 2, 2, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  setColor(doc, COLORS.bg);
  doc.text(signal, badgeX + 4, y + 1);

  // Signal counts on right
  const sigY = y - 4;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  const sigLabels = [
    { label: 'Green', count: data.signalCounts.green, color: COLORS.green },
    { label: 'Yellow', count: data.signalCounts.yellow, color: COLORS.orange },
    { label: 'Red', count: data.signalCounts.red, color: COLORS.red },
  ];
  let sigX = pageW - margin;
  for (const s of [...sigLabels].reverse()) {
    const txt = `${s.count}`;
    setColor(doc, s.color);
    doc.text(txt, sigX, sigY + 4, { align: 'right' });
    sigX -= doc.getTextWidth(txt) + 1;
    setColor(doc, COLORS.textTertiary);
    doc.text(`${s.label}: `, sigX, sigY + 4, { align: 'right' });
    sigX -= doc.getTextWidth(`${s.label}: `) + 4;
  }

  y += 10;

  // ── One-line summary ──
  if (data.summary.one_line_summary) {
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'italic');
    setColor(doc, COLORS.textSecondary);
    const summaryLines = wrapText(doc, `\u201C${data.summary.one_line_summary}\u201D`, contentW);
    doc.text(summaryLines, margin, y);
    y += summaryLines.length * 4.5 + 6;
  }

  // ── Rubric Scores ──
  const rubricScores = data.summary.rubric_scores || [];
  if (rubricScores.length > 0) {
    setDraw(doc, COLORS.border);
    doc.line(margin, y, pageW - margin, y);
    y += 6;

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    setColor(doc, COLORS.textTertiary);
    doc.text('RUBRIC SCORES', margin, y);
    y += 6;

    for (const rs of rubricScores) {
      const rowY = y;
      const barColor = scoreColor(rs.score);

      // Criterion name
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      setColor(doc, COLORS.textSecondary);
      doc.text(rs.criterion, margin, rowY);

      // Weight
      doc.setFontSize(8);
      setColor(doc, COLORS.textTertiary);
      doc.text(`${rs.weight}%`, margin + 55, rowY);

      // Bar background
      const barX = margin + 68;
      const barW = contentW - 68 - 18;
      const barH = 3.5;
      setFill(doc, COLORS.bgTertiary);
      doc.roundedRect(barX, rowY - 3, barW, barH, 1.5, 1.5, 'F');

      // Bar fill
      const fillW = Math.max(0, Math.min(barW, (rs.score / 10) * barW));
      if (fillW > 0) {
        setFill(doc, barColor);
        doc.roundedRect(barX, rowY - 3, fillW, barH, 1.5, 1.5, 'F');
      }

      // Score value
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      setColor(doc, COLORS.textPrimary);
      doc.text(Math.min(10, rs.score).toFixed(1), pageW - margin, rowY, { align: 'right' });

      y += 8;
    }
    y += 2;
  }

  // ── Strengths / Concerns / Follow-ups ──
  const sections = [
    { title: 'STRENGTHS', items: data.summary.strengths || [], color: COLORS.green, numbered: false },
    { title: 'CONCERNS', items: data.summary.concerns || [], color: COLORS.red, numbered: false },
    { title: 'FOLLOW-UPS', items: data.summary.recommended_follow_ups || [], color: COLORS.blue, numbered: true },
  ];

  const colW = (contentW - 8) / 3; // 3 columns with 4mm gaps
  const colStartY = y + 4;

  // Draw section boxes
  setDraw(doc, COLORS.border);
  for (let i = 0; i < 3; i++) {
    const sec = sections[i];
    const colX = margin + i * (colW + 4);

    // Box background
    setFill(doc, COLORS.bgSecondary);
    doc.roundedRect(colX, colStartY, colW, 0.1, 2, 2, 'F'); // measure first

    // Section title
    let secY = colStartY + 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    setColor(doc, sec.color);
    doc.text(sec.title, colX + 4, secY);
    secY += 5;

    // Items
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    setColor(doc, COLORS.textSecondary);

    for (let j = 0; j < sec.items.length; j++) {
      const prefix = sec.numbered ? `${j + 1}. ` : '\u2022 ';
      const lines = wrapText(doc, prefix + sec.items[j], colW - 8);

      // Check page overflow
      if (secY + lines.length * 3.5 > pageH - 16) {
        doc.addPage();
        setFill(doc, COLORS.bg);
        doc.rect(0, 0, pageW, pageH, 'F');
        secY = margin;
      }

      setColor(doc, COLORS.textSecondary);
      doc.text(lines, colX + 4, secY);
      secY += lines.length * 3.5 + 1.5;
    }

    // Draw the box outline around the content
    const boxH = Math.max(secY - colStartY + 2, 20);
    setFill(doc, COLORS.bgSecondary);
    setDraw(doc, COLORS.border);
    doc.roundedRect(colX, colStartY, colW, boxH, 2, 2, 'S');
  }

  // ── Footer ──
  const footY = pageH - 8;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  setColor(doc, COLORS.textTertiary);
  doc.text('Generated by CodeLens \u2014 AI-Powered Technical Interviews', margin, footY);
  doc.text(new Date().toISOString().split('T')[0], pageW - margin, footY, { align: 'right' });

  // Save
  const filename = `CodeLens-Report-${data.candidateName.replace(/\s+/g, '-')}.pdf`;
  doc.save(filename);
}
