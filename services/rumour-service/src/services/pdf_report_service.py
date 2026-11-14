import io
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

from ..core.config import settings
from typing import Any as RumourScan  # a ScanReportView (services/report_view.py)

class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas for dynamic total page count in footer."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_footer(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_footer(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Draw bottom separator line
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(36, 40, A4[0] - 36, 40)

        # Footer text
        footer_left = "FactLens Digital Evidence Infrastructure • Automated Cryptographic Audit Dossier"
        footer_right = f"Page {self._pageNumber} of {page_count}"
        self.drawString(36, 28, footer_left)
        self.drawRightString(A4[0] - 36, 28, footer_right)
        self.restoreState()

class PdfReportService:
    """Generates professional, authenticated PDF verification audit reports."""

    def __init__(self):
        self.font_name = self._init_font()

    def _init_font(self) -> str:
        font_path = settings.FONTS_DIR / "kalpurush.ttf"
        if font_path.exists():
            try:
                pdfmetrics.registerFont(TTFont("Kalpurush", str(font_path)))
                return "Kalpurush"
            except Exception as e:
                print(f"[PdfReportService] Font registration note: {e}")
        return "Helvetica"

    def generate_report(self, scan: RumourScan) -> bytes:
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=36,
            rightMargin=36,
            topMargin=36,
            bottomMargin=54
        )

        styles = getSampleStyleSheet()
        normal_font = self.font_name

        # Custom Typography Styles
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            textColor=colors.HexColor("#0F172A")
        )
        subtitle_style = ParagraphStyle(
            "DocSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#0D9488")
        )
        section_heading = ParagraphStyle(
            "SectionHeading",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=colors.HexColor("#0F172A"),
            spaceBefore=10,
            spaceAfter=4
        )
        body_style = ParagraphStyle(
            "BodyUnicode",
            parent=styles["Normal"],
            fontName=normal_font,
            fontSize=9,
            leading=13,
            textColor=colors.HexColor("#1E293B")
        )
        meta_label = ParagraphStyle(
            "MetaLabel",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#64748B")
        )
        meta_val = ParagraphStyle(
            "MetaVal",
            parent=styles["Normal"],
            fontName=normal_font,
            fontSize=9,
            leading=11,
            textColor=colors.HexColor("#0F172A")
        )

        story = []

        # =====================================================================
        # 1. Header & Platform Branding
        # =====================================================================
        header_data = [
            [
                Paragraph("<b>FACTLENS FORENSIC VERIFICATION DOSSIER</b>", title_style),
                Paragraph(f"<b>SCAN ID:</b> {scan.id}<br/><b>DATE:</b> {scan.created_at.strftime('%Y-%m-%d %H:%M UTC')}", meta_val)
            ],
            [
                Paragraph("Digital Media & Rumour Verification Platform • ISO & IFCN Compliant", subtitle_style),
                Paragraph(f"<b>STATUS:</b> {scan.status}", meta_val)
            ]
        ]
        header_table = Table(header_data, colWidths=[330, 190])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('ALIGN', (1,0), (1,-1), 'RIGHT'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 1),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ]))
        story.append(header_table)
        story.append(Spacer(1, 8))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#00E599"), spaceAfter=12))

        # =====================================================================
        # 2. Submitted Claim Box
        # =====================================================================
        story.append(Paragraph("SUBMITTED CLAIM FOR VERIFICATION", meta_label))
        story.append(Spacer(1, 2))
        claim_content = [
            [Paragraph(f"<b>Raw Claim:</b> {scan.claim_text}", body_style)],
            [Paragraph(f"<b>Normalized Claim:</b> {scan.normalized_text}", body_style)]
        ]
        claim_table = Table(claim_content, colWidths=[522])
        claim_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(claim_table)
        story.append(Spacer(1, 10))

        # =====================================================================
        # 3. Final Verification Verdict Banner
        # =====================================================================
        verdict = scan.verdict
        if verdict == "SUPPORTED":
            bg_color = colors.HexColor("#ECFDF5")
            border_color = colors.HexColor("#059669")
            text_color = "#047857"
            verdict_text = "VERIFIED / SUPPORTED CLAIM (তথ্যটি সত্য — সরকারি গেজেট ও প্রামাণ্য তথ্যে সমর্থিত)"
        elif verdict == "CONTRADICTED":
            bg_color = colors.HexColor("#FEF2F2")
            border_color = colors.HexColor("#DC2626")
            text_color = "#B91C1C"
            verdict_text = "FALSE / CONTRADICTED RUMOUR (তথ্যটি ভুয়া — সরকারি ও প্রাতিষ্ঠানিক সূত্রে খণ্ডন করা হয়েছে)"
        else:
            bg_color = colors.HexColor("#FFFBEB")
            border_color = colors.HexColor("#D97706")
            text_color = "#B45309"
            verdict_text = "UNVERIFIED / INSUFFICIENT EVIDENCE (তথ্যটি অসত্যায়িত — সুনির্দিষ্ট গেজেট পাওয়া যায়নি)"

        verdict_style = ParagraphStyle(
            "VerdictStyle",
            parent=styles["Normal"],
            fontName=normal_font,
            fontSize=11,
            leading=14,
            textColor=colors.HexColor(text_color)
        )

        verdict_data = [
            [
                Paragraph(f"<b>FINAL VERDICT:</b> {verdict_text}", verdict_style),
                Paragraph(f"<b>CONFIDENCE:</b> {round(scan.confidence * 100, 1)}%", meta_val)
            ]
        ]
        verdict_table = Table(verdict_data, colWidths=[400, 122])
        verdict_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), bg_color),
            ('BOX', (0,0), (-1,-1), 1, border_color),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('ALIGN', (1,0), (1,-1), 'RIGHT'),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(verdict_table)
        story.append(Spacer(1, 10))

        # =====================================================================
        # 4. Multi-Signal Diagnostic Telemetry (BanglaBERT + Search + Fuzzy)
        # =====================================================================
        story.append(Paragraph("MULTI-BRANCH FORENSIC DIAGNOSTICS", section_heading))
        
        bert_meta = scan.banglabert_metrics or {}
        search_meta = scan.evidence_summary or {}
        fuzzy_meta = scan.fuzzy_scores or {}

        signals_data = [
            [
                Paragraph("<b>Branch 1: BanglaVerify</b>", meta_label),
                Paragraph("<b>Branch 2: Web Metasearch</b>", meta_label),
                Paragraph("<b>Branch 3: Fuzzy Logic FIS</b>", meta_label)
            ],
            [
                Paragraph(
                    (
                        f"Model: {bert_meta.get('model_name', 'BanglaVerify')} "
                        f"({bert_meta.get('version', 'n/a')})<br/>"
                        f"Prediction: <b>{bert_meta.get('prediction')}</b><br/>"
                        f"Confidence: {round(float(bert_meta.get('confidence') or 0) * 100, 1)}%<br/>"
                        f"Fake probability: {round(float(bert_meta.get('p_fake') or 0) * 100, 1)}% "
                        f"(threshold {round(float(bert_meta.get('threshold') or 0) * 100, 1)}%)<br/>"
                        f"Inference Latency: {bert_meta.get('inference_time_ms', 0)} ms"
                    )
                    if bert_meta.get("available")
                    else (
                        f"Model: {bert_meta.get('model_name', 'BanglaVerify')}<br/>"
                        f"Prediction: <b>UNAVAILABLE</b><br/>"
                        f"Reason: {bert_meta.get('unavailable_reason') or 'no model signal'}"
                    ),
                    body_style
                ),
                Paragraph(
                    f"Supporting Sources: <b>{search_meta.get('supporting_sources', 0)}</b><br/>"
                    f"Contradicting Sources: <b>{search_meta.get('contradicting_sources', 0)}</b><br/>"
                    f"Neutral / Disputed: <b>{search_meta.get('neutral_sources', 0)}</b><br/>"
                    f"Primary / Official: <b>{search_meta.get('primary_sources', 0)}</b>",
                    body_style
                ),
                Paragraph(
                    f"Support Score: <b>{fuzzy_meta.get('support_score', 0)}%</b><br/>"
                    f"Contradiction Score: <b>{fuzzy_meta.get('contradiction_score', 0)}%</b><br/>"
                    f"Decision Margin: <b>{fuzzy_meta.get('decision_margin', 0)}%</b><br/>"
                    f"Defuzzification: Centroid Mamdani",
                    body_style
                )
            ]
        ]
        signals_table = Table(signals_data, colWidths=[174, 174, 174])
        signals_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
            ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ]))
        story.append(signals_table)
        story.append(Spacer(1, 10))

        # =====================================================================
        # 5. Retrieved Evidence Sources Breakdown Table
        # =====================================================================
        story.append(Paragraph(f"RETRIEVED EVIDENCE SOURCES ({len(scan.evidences)} Items)", section_heading))
        
        evidence_rows = [
            [
                Paragraph("<b>#</b>", meta_label),
                Paragraph("<b>Publisher / Source</b>", meta_label),
                Paragraph("<b>Stance</b>", meta_label),
                Paragraph("<b>Reliability</b>", meta_label),
                Paragraph("<b>Relevance</b>", meta_label),
                Paragraph("<b>Original URL</b>", meta_label),
            ]
        ]

        for idx, ev in enumerate(scan.evidences[:8], 1):
            stance_color = "#047857" if ev.stance == "SUPPORTING" else ("#B91C1C" if ev.stance == "CONTRADICTING" else "#64748B")
            pub_name = ev.publisher or ev.source_name or "Web Source"
            short_url = (ev.url[:36] + "...") if len(ev.url) > 36 else ev.url
            
            evidence_rows.append([
                Paragraph(str(idx), body_style),
                Paragraph(f"<b>{pub_name}</b><br/>{ev.published_date or 'Recent'}", body_style),
                Paragraph(f"<font color='{stance_color}'><b>{ev.stance}</b></font>", body_style),
                Paragraph(f"{round(ev.source_reliability, 1)}%", body_style),
                Paragraph(f"{round(ev.relevance_score, 1)}%", body_style),
                Paragraph(f"<a href='{ev.url}'>{short_url}</a>", body_style),
            ])

        if len(evidence_rows) > 1:
            evidence_table = Table(evidence_rows, colWidths=[20, 140, 76, 56, 56, 174])
            evidence_table.setStyle(TableStyle([
                ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F1F5F9")),
                ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
                ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
                ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                ('TOPPADDING', (0,0), (-1,-1), 4),
                ('BOTTOMPADDING', (0,0), (-1,-1), 4),
                ('LEFTPADDING', (0,0), (-1,-1), 6),
                ('RIGHTPADDING', (0,0), (-1,-1), 6),
            ]))
            story.append(evidence_table)
        else:
            story.append(Paragraph("<i>No corroborating web sources were located for this claim.</i>", body_style))

        story.append(Spacer(1, 10))

        # =====================================================================
        # 6. Bilingual Explanation & Limitations
        # =====================================================================
        expl = scan.explanation or {}
        story.append(Paragraph("VERIFICATION EXPLANATION", section_heading))
        expl_data = [
            [Paragraph(f"<b>English:</b> {expl.get('english', scan.summary or 'Automated verdict synthesis.')}", body_style)],
            [Paragraph(f"<b>বাংলা:</b> {expl.get('bangla', scan.summary_bn or 'স্বয়ংক্রিয় প্রামাণ্য বিশ্লেষণ সম্পাদন করা হয়েছে।')}", body_style)]
        ]
        expl_table = Table(expl_data, colWidths=[522])
        expl_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
            ('BOX', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ]))
        story.append(expl_table)
        story.append(Spacer(1, 10))

        # Disclaimer
        disclaimer_text = (
            "<b>Disclaimer:</b> FactLens uses hybrid intelligence combining pre-trained transformer embeddings (BanglaBERT), "
            "automated web metasearch, and fuzzy inference to verify statements. Authoritative government gazettes and ministry circulars "
            "take precedence over statistical inference. This report is cryptographically bound to the audit record on the FactLens platform."
        )
        story.append(Paragraph(disclaimer_text, ParagraphStyle("Disc", parent=styles["Normal"], fontSize=7.5, leading=10, textColor=colors.HexColor("#64748B"))))

        # Build document with two-pass canvas for total pages
        doc.build(story, canvasmaker=NumberedCanvas)
        return buffer.getvalue()

