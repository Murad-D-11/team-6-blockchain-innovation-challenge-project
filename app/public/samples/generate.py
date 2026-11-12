"""Generate fictional invoices for the Laya testnet demo."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter

HERE = Path(__file__).resolve().parent
for filename, provider, description, amount in [
    ("training.pdf", "Pasig Skills Training Center", "Hypothetical pre-departure training", "190.00"),
    ("medical.pdf", "Bayside Medical Clinic", "Pre-entry medical exam", "65.00"),
    ("placement.pdf", "Golden Gate Recruitment Agency (Philippines)", "Placement fee", "1,380.00"),
]:
    c = canvas.Canvas(str(HERE / filename), pagesize=letter)
    c.setTitle("Sample fictional invoice")
    c.setFont("Helvetica-Bold", 24)
    c.drawString(55, 725, "SAMPLE - FICTIONAL")
    c.setFont("Helvetica", 14)
    c.drawString(55, 665, "Invoice for testnet demonstration only")
    c.drawString(55, 625, "Provider: " + provider)
    c.drawString(55, 595, "Customer: Maria Santos (fictional)")
    c.drawString(55, 565, "Description: " + description)
    c.drawString(55, 535, "Amount: " + amount + " test USDC")
    c.setFont("Helvetica", 11)
    c.drawString(55, 470, "This document and all named parties are fictional. No payment is due.")
    c.showPage()
    c.save()
