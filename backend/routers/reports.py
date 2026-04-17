from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlmodel import Session, select, func
from typing import List
import pandas as pd
from datetime import datetime
import os
from database.db import get_session
from database.models import Sale, Expense, Company, ReportHistory
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors

router = APIRouter(prefix="/reports", tags=["reports"])

def save_to_history(company_id: int, filename: str, report_type: str, month: int, year: int, session: Session):
    months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"]
    period = f"{months[month-1]} {year}"
    new_entry = ReportHistory(
        company_id=company_id,
        filename=filename,
        type=report_type,
        period=period
    )
    session.add(new_entry)
    session.commit()

def get_month_data(company_id: int, month: int, year: int, session: Session):
    # Filtrer les ventes du mois
    start_date = datetime(year, month, 1)
    if month == 12:
        end_date = datetime(year + 1, 1, 1)
    else:
        end_date = datetime(year, month + 1, 1)
        
    sales = session.exec(select(Sale).where(Sale.company_id == company_id, Sale.timestamp >= start_date, Sale.timestamp < end_date)).all()
    expenses = session.exec(select(Expense).where(Expense.company_id == company_id, Expense.date >= start_date, Expense.date < end_date)).all()
    
    return sales, expenses

@router.get("/summary")
def get_report_summary(company_id: int, month: int, year: int, session: Session = Depends(get_session)):
    sales, expenses = get_month_data(company_id, month, year, session)
    total_sales = sum(s.total_amount for s in sales)
    total_expenses = sum(e.amount for e in expenses)
    count_sales = len(sales)
    
    return {
        "total_sales": total_sales,
        "total_expenses": total_expenses,
        "sales_count": count_sales,
        "net_profit": total_sales - total_expenses
    }

@router.get("/history", response_model=List[ReportHistory])
def list_report_history(company_id: int, session: Session = Depends(get_session)):
    return session.exec(
        select(ReportHistory)
        .where(ReportHistory.company_id == company_id)
        .order_by(ReportHistory.timestamp.desc())
        .limit(5)
    ).all()

@router.get("/excel")
def generate_excel_report(company_id: int, month: int, year: int, session: Session = Depends(get_session)):
    sales, expenses = get_month_data(company_id, month, year, session)
    
    # Préparation des données pour Excel (Résumé Total)
    total_sales = sum(s.total_amount for s in sales)
    total_expenses = sum(e.amount for e in expenses)
    
    data = {
        "Indicateur": ["Total Ventes", "Total Dépenses", "Bénéfice Net"],
        "Montant (CFA)": [total_sales, total_expenses, total_sales - total_expenses]
    }
    
    df = pd.DataFrame(data)
    
    # Création du fichier temporaire
    filename = f"Rapport_Mensuel_{month}_{year}.xlsx"
    file_path = f"report_{company_id}_{month}_{year}.xlsx"
    df.to_excel(file_path, index=False)
    
    # Sauvegarde dans l'historique
    save_to_history(company_id, filename, "EXCEL", month, year, session)
    
    return FileResponse(path=file_path, filename=filename, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')

@router.get("/pdf")
def generate_pdf_report(company_id: int, month: int, year: int, session: Session = Depends(get_session)):
    sales, expenses = get_month_data(company_id, month, year, session)
    company = session.get(Company, company_id)
    
    filename = f"Rapport_Mensuel_{month}_{year}.pdf"
    file_path = f"report_{company_id}_{month}_{year}.pdf"
    doc = SimpleDocTemplate(file_path, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()
    
    # Titre
    elements.append(Paragraph(f"RAPPORT FINANCIER MENSUEL - {month}/{year}", styles['Title']))
    elements.append(Paragraph(f"Établissement : {company.name if company else 'N/A'}", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Tableau de synthèse
    total_sales = sum(s.total_amount for s in sales)
    total_expenses = sum(e.amount for e in expenses)
    
    data = [
        ["Indicateur", "Valeur (CFA)"],
        ["Total des Ventes", f"{total_sales:,.0f}"],
        ["Total des Dépenses", f"{total_expenses:,.0f}"],
        ["Résultat Net", f"{total_sales - total_expenses:,.0f}"]
    ]
    
    t = Table(data, colWidths=[200, 150])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    
    elements.append(t)
    elements.append(Spacer(1, 30))
    
    # Détail des dépenses par catégorie
    elements.append(Paragraph("Détail des Dépenses", styles['Heading2']))
    exp_data = [["Catégorie", "Description", "Montant"]]
    for e in expenses:
        exp_data.append([e.category, (e.description[:20] if e.description else "-"), f"{e.amount:,.0f}"])
        
    if len(expenses) > 0:
        te = Table(exp_data, colWidths=[100, 150, 100])
        te.setStyle(TableStyle([('GRID', (0, 0), (-1, -1), 0.5, colors.grey)]))
        elements.append(te)
    else:
        elements.append(Paragraph("Aucune dépense enregistrée.", styles['Normal']))

    doc.build(elements)
    
    # Sauvegarde dans l'historique
    save_to_history(company_id, filename, "PDF", month, year, session)
    
    return FileResponse(path=file_path, filename=filename, media_type='application/pdf')
