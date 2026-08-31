import io
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_clinician_bloodwork_pdf(
    patient_name: str,
    patient_age: int,
    patient_sex: str,
    evaluated_labs: List[Dict[str, Any]],
    clinician_summary: str
) -> bytes:
    """
    Generates a PDF document for clinician bloodwork review using ReportLab.
    Applies beige & charcoal palette accents.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette Matching Application Colors
    CHARCOAL = colors.HexColor('#2E2B28')
    MUTED_TERRACOTTA = colors.HexColor('#B5654A')
    MUTED_SAGE = colors.HexColor('#6E7F5C')
    BEIGE_SURFACE = colors.HexColor('#F1EAD9')
    CARD_BG = colors.HexColor('#E6DECD')

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=18,
        textColor=CHARCOAL,
        spaceAfter=4
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=10,
        textColor=MUTED_TERRACOTTA,
        spaceAfter=12
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=CHARCOAL,
        leading=14
    )

    h2_style = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        textColor=CHARCOAL,
        spaceBefore=10,
        spaceAfter=6
    )

    story = []

    # Title & Subtitle Header
    story.append(Paragraph("Clinical AI Copilot — Lab Report Summary", title_style))
    story.append(Paragraph("FOR INFORMATIONAL & DECISION SUPPORT USE ONLY", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=CHARCOAL, spaceAfter=12))

    # Patient Meta Card Table
    patient_meta_data = [
        [
            Paragraph(f"<b>Patient Name:</b> {patient_name}", body_style),
            Paragraph(f"<b>Age:</b> {patient_age} | <b>Sex:</b> {patient_sex}", body_style)
        ]
    ]
    meta_table = Table(patient_meta_data, colWidths=[270, 270])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD_BG),
        ('PADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#BCB19A'))
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 14))

    # Clinician Attention Paragraph
    story.append(Paragraph("Clinician Radiology & Biomarker Impression", h2_style))
    story.append(Paragraph(clinician_summary.replace('\n', '<br/>'), body_style))
    story.append(Spacer(1, 14))

    # Lab Values Table
    story.append(Paragraph("Extracted Biomarker Panel & Reference Flagging", h2_style))

    table_data = [
        [
            Paragraph("<b>Test Name</b>", body_style),
            Paragraph("<b>Result</b>", body_style),
            Paragraph("<b>Unit</b>", body_style),
            Paragraph("<b>Reference Range</b>", body_style),
            Paragraph("<b>Flag</b>", body_style)
        ]
    ]

    for item in evaluated_labs:
        flag = item.get("flag", "normal")
        flag_label = item.get("flag_label", "NORMAL")
        flag_color = MUTED_TERRACOTTA if flag != "normal" else MUTED_SAGE

        flag_p = Paragraph(f"<b><font color='{flag_color.hexval()}'>{flag_label}</font></b>", body_style)

        table_data.append([
            Paragraph(str(item.get("test_name", "")), body_style),
            Paragraph(str(item.get("value", "")), body_style),
            Paragraph(str(item.get("unit", "")), body_style),
            Paragraph(str(item.get("reference_range", "")), body_style),
            flag_p
        ])

    lab_table = Table(table_data, colWidths=[140, 75, 75, 150, 100])
    lab_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BEIGE_SURFACE),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#D3C9B5')),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(lab_table)
    story.append(Spacer(1, 20))

    # Disclaimer Footer Function
    def add_disclaimer(canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica-Bold', 8)
        canvas.setFillColor(MUTED_TERRACOTTA)
        disclaimer_text = "AI-generated. Not a diagnosis. For informational use — a licensed clinician must review before acting."
        canvas.drawCentredString(letter[0] / 2.0, 20, disclaimer_text)
        canvas.restoreState()

    doc.build(story, onFirstPage=add_disclaimer, onLaterPages=add_disclaimer)
    return buffer.getvalue()
