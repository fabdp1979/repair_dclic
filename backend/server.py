from fastapi import FastAPI, APIRouter, HTTPException, Query, Response
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import asyncio
import resend
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.units import cm, mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from unidecode import unidecode
import io
import base64
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, Border, Side, PatternFill
from Levenshtein import ratio as levenshtein_ratio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Resend configuration
resend.api_key = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

# PDF storage directory
PDF_DIR = ROOT_DIR / 'pdfs'
PDF_DIR.mkdir(exist_ok=True)

# Company info
COMPANY_INFO = {
    "name": "DCLIC INFORMATIQUE",
    "address": "30 AVENUE DU GENERAL DE GAULLE, 19140 UZERCHE",
    "phone": "05.55.73.57.20",
    "email": "contact@d-clic-informatique.fr"
}

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ===================== MODELS =====================

# Client Models
class ClientBase(BaseModel):
    nom: str
    prenom: str
    telephone: str
    email: Optional[EmailStr] = None
    adresse: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    telephone: Optional[str] = None
    email: Optional[EmailStr] = None
    adresse: Optional[str] = None

class Client(ClientBase):
    id: str
    created_at: str
    updated_at: str

# Repair Models
class ReparationBase(BaseModel):
    client_id: str
    marque: str
    modele: str
    mot_de_passe: Optional[str] = None
    probleme_declare: str
    diagnostic: Optional[str] = None
    action_realisee: Optional[str] = None
    prix: Optional[float] = None
    statut: str = "En cours"

class ReparationCreate(ReparationBase):
    pass

class ReparationUpdate(BaseModel):
    client_id: Optional[str] = None
    marque: Optional[str] = None
    modele: Optional[str] = None
    mot_de_passe: Optional[str] = None
    probleme_declare: Optional[str] = None
    diagnostic: Optional[str] = None
    action_realisee: Optional[str] = None
    prix: Optional[float] = None
    statut: Optional[str] = None

class Reparation(ReparationBase):
    id: str
    numero: str
    date_creation: str
    date_modification: str
    client_nom: Optional[str] = None
    client_prenom: Optional[str] = None
    client_email: Optional[str] = None
    client_telephone: Optional[str] = None

# Cash Register Models
class CaisseEntryBase(BaseModel):
    type: str  # "entree" or "sortie"
    montant: float
    description: str
    mode_paiement: Optional[str] = None
    reparation_id: Optional[str] = None

class CaisseEntryCreate(CaisseEntryBase):
    pass

class CaisseEntry(CaisseEntryBase):
    id: str
    date: str

class DashboardStats(BaseModel):
    total_clients: int
    total_reparations: int
    reparations_en_cours: int
    reparations_terminees: int
    total_caisse_jour: float
    total_entrees_jour: float
    total_sorties_jour: float

# ===================== HELPER FUNCTIONS =====================

async def get_next_repair_number():
    """Generate next repair number in format REP-YYYY-XXXX"""
    year = datetime.now(timezone.utc).year
    prefix = f"REP-{year}-"
    
    # Find the highest number for this year
    last_repair = await db.reparations.find_one(
        {"numero": {"$regex": f"^{prefix}"}},
        sort=[("numero", -1)]
    )
    
    if last_repair:
        try:
            last_num = int(last_repair["numero"].split("-")[-1])
            next_num = last_num + 1
        except:
            next_num = 1
    else:
        next_num = 1
    
    return f"{prefix}{next_num:04d}"

def sanitize_filename(filename):
    """Remove problematic characters from filename"""
    # Remove accents and special characters
    filename = unidecode(filename)
    # Replace spaces with underscores
    filename = filename.replace(" ", "_")
    # Remove any remaining problematic characters
    filename = "".join(c for c in filename if c.isalnum() or c in "._-")
    return filename

def generate_client_pdf(reparation: dict, client: dict) -> bytes:
    """Generate PDF for client (without password)"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, 
                           leftMargin=2*cm, rightMargin=2*cm,
                           topMargin=2*cm, bottomMargin=2*cm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=30,
        textColor=colors.HexColor('#84CC16'),
        alignment=1
    )
    
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#64748B'),
        alignment=1
    )
    
    section_style = ParagraphStyle(
        'Section',
        parent=styles['Heading2'],
        fontSize=12,
        spaceBefore=15,
        spaceAfter=10,
        textColor=colors.HexColor('#0F172A')
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=5
    )
    
    elements = []
    
    # Header with company info
    elements.append(Paragraph(COMPANY_INFO["name"], title_style))
    elements.append(Paragraph(COMPANY_INFO["address"], header_style))
    elements.append(Paragraph(f"Tel: {COMPANY_INFO['phone']} | Email: {COMPANY_INFO['email']}", header_style))
    elements.append(Spacer(1, 20))
    
    # Repair number and date
    elements.append(Paragraph(f"<b>FICHE DE REPARATION N° {reparation['numero']}</b>", section_style))
    elements.append(Paragraph(f"Date: {reparation['date_creation'][:10]}", normal_style))
    elements.append(Spacer(1, 15))
    
    # Client info
    elements.append(Paragraph("<b>INFORMATIONS CLIENT</b>", section_style))
    client_data = [
        ["Nom:", f"{client.get('prenom', '')} {client.get('nom', '')}"],
        ["Téléphone:", client.get('telephone', '-')],
        ["Email:", client.get('email', '-') or '-'],
        ["Adresse:", client.get('adresse', '-') or '-']
    ]
    client_table = Table(client_data, colWidths=[4*cm, 12*cm])
    client_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(client_table)
    elements.append(Spacer(1, 15))
    
    # Device info
    elements.append(Paragraph("<b>APPAREIL</b>", section_style))
    device_data = [
        ["Marque:", reparation.get('marque', '-')],
        ["Modèle:", reparation.get('modele', '-')]
    ]
    device_table = Table(device_data, colWidths=[4*cm, 12*cm])
    device_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(device_table)
    elements.append(Spacer(1, 15))
    
    # Repair details
    elements.append(Paragraph("<b>DETAILS DE LA REPARATION</b>", section_style))
    repair_data = [
        ["Problème déclaré:", reparation.get('probleme_declare', '-')],
        ["Diagnostic:", reparation.get('diagnostic', '-') or '-'],
        ["Action réalisée:", reparation.get('action_realisee', '-') or '-'],
        ["Statut:", reparation.get('statut', '-')]
    ]
    repair_table = Table(repair_data, colWidths=[4*cm, 12*cm])
    repair_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(repair_table)
    elements.append(Spacer(1, 20))
    
    # Price
    if reparation.get('prix'):
        price_style = ParagraphStyle(
            'Price',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#84CC16'),
            alignment=2
        )
        elements.append(Paragraph(f"<b>TOTAL: {reparation['prix']:.2f} €</b>", price_style))
    
    elements.append(Spacer(1, 30))
    
    # Footer
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#94A3B8'),
        alignment=1
    )
    elements.append(Paragraph("Merci de votre confiance !", footer_style))
    elements.append(Paragraph(f"{COMPANY_INFO['name']} - {COMPANY_INFO['phone']}", footer_style))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()

def generate_internal_pdf(reparation: dict, client: dict) -> bytes:
    """Generate internal PDF (with password and technical notes)"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                           leftMargin=2*cm, rightMargin=2*cm,
                           topMargin=2*cm, bottomMargin=2*cm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        spaceAfter=30,
        textColor=colors.HexColor('#0F172A'),
        alignment=1
    )
    
    internal_badge = ParagraphStyle(
        'InternalBadge',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.white,
        backColor=colors.HexColor('#DC2626'),
        alignment=1,
        spaceBefore=10,
        spaceAfter=20
    )
    
    section_style = ParagraphStyle(
        'Section',
        parent=styles['Heading2'],
        fontSize=12,
        spaceBefore=15,
        spaceAfter=10,
        textColor=colors.HexColor('#0F172A')
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=5
    )
    
    elements = []
    
    # Internal badge
    elements.append(Paragraph("*** DOCUMENT INTERNE - NE PAS TRANSMETTRE AU CLIENT ***", internal_badge))
    
    # Header
    elements.append(Paragraph(f"FICHE INTERNE N° {reparation['numero']}", title_style))
    elements.append(Paragraph(f"Date: {reparation['date_creation'][:10]}", normal_style))
    elements.append(Spacer(1, 15))
    
    # Client info
    elements.append(Paragraph("<b>CLIENT</b>", section_style))
    client_data = [
        ["Nom:", f"{client.get('prenom', '')} {client.get('nom', '')}"],
        ["Téléphone:", client.get('telephone', '-')],
        ["Email:", client.get('email', '-') or '-'],
        ["Adresse:", client.get('adresse', '-') or '-']
    ]
    client_table = Table(client_data, colWidths=[4*cm, 12*cm])
    client_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    elements.append(client_table)
    elements.append(Spacer(1, 15))
    
    # Device info WITH PASSWORD
    elements.append(Paragraph("<b>APPAREIL</b>", section_style))
    device_data = [
        ["Marque:", reparation.get('marque', '-')],
        ["Modèle:", reparation.get('modele', '-')],
        ["Mot de passe:", reparation.get('mot_de_passe', '-') or '-']
    ]
    device_table = Table(device_data, colWidths=[4*cm, 12*cm])
    device_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('BACKGROUND', (1, 2), (1, 2), colors.HexColor('#FEF08A')),
    ]))
    elements.append(device_table)
    elements.append(Spacer(1, 15))
    
    # Repair details
    elements.append(Paragraph("<b>DETAILS TECHNIQUES</b>", section_style))
    repair_data = [
        ["Problème déclaré:", reparation.get('probleme_declare', '-')],
        ["Diagnostic:", reparation.get('diagnostic', '-') or '-'],
        ["Action réalisée:", reparation.get('action_realisee', '-') or '-'],
        ["Statut:", reparation.get('statut', '-')],
        ["Prix:", f"{reparation.get('prix', 0):.2f} €" if reparation.get('prix') else '-']
    ]
    repair_table = Table(repair_data, colWidths=[4*cm, 12*cm])
    repair_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    elements.append(repair_table)
    
    elements.append(Spacer(1, 30))
    
    # Timestamps
    elements.append(Paragraph(f"Créé le: {reparation['date_creation']}", normal_style))
    elements.append(Paragraph(f"Modifié le: {reparation['date_modification']}", normal_style))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()

# ===================== API ROUTES =====================

@api_router.get("/")
async def root():
    return {"message": "DCLIC Informatique API", "status": "running"}

# Dashboard
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats():
    """Get dashboard statistics"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    total_clients = await db.clients.count_documents({})
    total_reparations = await db.reparations.count_documents({})
    reparations_en_cours = await db.reparations.count_documents({"statut": "En cours"})
    reparations_terminees = await db.reparations.count_documents({"statut": "Terminé"})
    
    # Cash register for today
    today_entries = await db.caisse.find(
        {"date": {"$regex": f"^{today}"}},
        {"_id": 0}
    ).to_list(1000)
    
    total_entrees = sum(e["montant"] for e in today_entries if e["type"] == "entree")
    total_sorties = sum(e["montant"] for e in today_entries if e["type"] == "sortie")
    
    return DashboardStats(
        total_clients=total_clients,
        total_reparations=total_reparations,
        reparations_en_cours=reparations_en_cours,
        reparations_terminees=reparations_terminees,
        total_caisse_jour=total_entrees - total_sorties,
        total_entrees_jour=total_entrees,
        total_sorties_jour=total_sorties
    )

# ===================== CLIENTS CRUD =====================

@api_router.post("/clients", response_model=Client)
async def create_client(client: ClientCreate):
    """Create a new client"""
    now = datetime.now(timezone.utc).isoformat()
    client_doc = {
        "id": str(uuid.uuid4()),
        "nom": client.nom,
        "prenom": client.prenom,
        "telephone": client.telephone,
        "email": client.email,
        "adresse": client.adresse,
        "created_at": now,
        "updated_at": now
    }
    await db.clients.insert_one(client_doc)
    # Remove _id before returning
    client_doc.pop("_id", None)
    return client_doc

@api_router.get("/clients", response_model=List[Client])
async def get_clients(
    search: Optional[str] = Query(None, description="Search by name or phone"),
    limit: int = Query(100, le=500)
):
    """Get all clients with optional search"""
    query = {}
    
    if search:
        # Fuzzy search - get all and filter
        all_clients = await db.clients.find({}, {"_id": 0}).to_list(500)
        search_lower = search.lower()
        search_normalized = unidecode(search_lower)
        
        # Filter clients by fuzzy matching
        matched_clients = []
        for c in all_clients:
            nom_normalized = unidecode(c.get("nom", "").lower())
            prenom_normalized = unidecode(c.get("prenom", "").lower())
            full_name = f"{prenom_normalized} {nom_normalized}"
            telephone = c.get("telephone", "")
            
            # Check phone match
            if search in telephone:
                matched_clients.append(c)
                continue
            
            # Check fuzzy name match
            if (levenshtein_ratio(search_normalized, nom_normalized) > 0.7 or
                levenshtein_ratio(search_normalized, prenom_normalized) > 0.7 or
                levenshtein_ratio(search_normalized, full_name) > 0.6 or
                search_normalized in nom_normalized or
                search_normalized in prenom_normalized):
                matched_clients.append(c)
        
        return matched_clients[:limit]
    
    clients = await db.clients.find(query, {"_id": 0}).to_list(limit)
    return clients

@api_router.get("/clients/{client_id}", response_model=Client)
async def get_client(client_id: str):
    """Get a specific client"""
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    return client

@api_router.put("/clients/{client_id}", response_model=Client)
async def update_client(client_id: str, update: ClientUpdate):
    """Update a client"""
    existing = await db.clients.find_one({"id": client_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.clients.update_one({"id": client_id}, {"$set": update_data})
    
    updated = await db.clients.find_one({"id": client_id}, {"_id": 0})
    return updated

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str):
    """Delete a client"""
    result = await db.clients.delete_one({"id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    return {"message": "Client supprimé"}

# ===================== REPARATIONS CRUD =====================

@api_router.post("/reparations", response_model=Reparation)
async def create_reparation(reparation: ReparationCreate):
    """Create a new repair"""
    # Verify client exists
    client = await db.clients.find_one({"id": reparation.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    now = datetime.now(timezone.utc).isoformat()
    numero = await get_next_repair_number()
    
    rep_doc = {
        "id": str(uuid.uuid4()),
        "numero": numero,
        "client_id": reparation.client_id,
        "marque": reparation.marque,
        "modele": reparation.modele,
        "mot_de_passe": reparation.mot_de_passe,
        "probleme_declare": reparation.probleme_declare,
        "diagnostic": reparation.diagnostic,
        "action_realisee": reparation.action_realisee,
        "prix": reparation.prix,
        "statut": reparation.statut,
        "date_creation": now,
        "date_modification": now
    }
    
    await db.reparations.insert_one(rep_doc)
    rep_doc.pop("_id", None)
    
    # Add client info
    rep_doc["client_nom"] = client.get("nom")
    rep_doc["client_prenom"] = client.get("prenom")
    rep_doc["client_email"] = client.get("email")
    rep_doc["client_telephone"] = client.get("telephone")
    
    return rep_doc

@api_router.get("/reparations", response_model=List[Reparation])
async def get_reparations(
    search: Optional[str] = Query(None, description="Search by client name or repair number"),
    statut: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(100, le=500)
):
    """Get all repairs with optional filters"""
    query = {}
    
    if statut:
        query["statut"] = statut
    
    reparations = await db.reparations.find(query, {"_id": 0}).sort("date_creation", -1).to_list(limit)
    
    # Add client info to each repair
    for rep in reparations:
        client = await db.clients.find_one({"id": rep["client_id"]}, {"_id": 0})
        if client:
            rep["client_nom"] = client.get("nom")
            rep["client_prenom"] = client.get("prenom")
            rep["client_email"] = client.get("email")
            rep["client_telephone"] = client.get("telephone")
    
    # Apply search filter if provided
    if search:
        search_normalized = unidecode(search.lower())
        filtered = []
        for rep in reparations:
            client_name = f"{rep.get('client_prenom', '')} {rep.get('client_nom', '')}".lower()
            client_name_normalized = unidecode(client_name)
            numero = rep.get("numero", "").lower()
            
            if (search_normalized in client_name_normalized or
                search_normalized in numero or
                levenshtein_ratio(search_normalized, client_name_normalized) > 0.6):
                filtered.append(rep)
        
        return filtered
    
    return reparations

@api_router.get("/reparations/{reparation_id}", response_model=Reparation)
async def get_reparation(reparation_id: str):
    """Get a specific repair"""
    rep = await db.reparations.find_one({"id": reparation_id}, {"_id": 0})
    if not rep:
        raise HTTPException(status_code=404, detail="Réparation non trouvée")
    
    # Add client info
    client = await db.clients.find_one({"id": rep["client_id"]}, {"_id": 0})
    if client:
        rep["client_nom"] = client.get("nom")
        rep["client_prenom"] = client.get("prenom")
        rep["client_email"] = client.get("email")
        rep["client_telephone"] = client.get("telephone")
    
    return rep

@api_router.put("/reparations/{reparation_id}", response_model=Reparation)
async def update_reparation(reparation_id: str, update: ReparationUpdate):
    """Update a repair"""
    existing = await db.reparations.find_one({"id": reparation_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Réparation non trouvée")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["date_modification"] = datetime.now(timezone.utc).isoformat()
    
    await db.reparations.update_one({"id": reparation_id}, {"$set": update_data})
    
    updated = await db.reparations.find_one({"id": reparation_id}, {"_id": 0})
    
    # Add client info
    client = await db.clients.find_one({"id": updated["client_id"]}, {"_id": 0})
    if client:
        updated["client_nom"] = client.get("nom")
        updated["client_prenom"] = client.get("prenom")
        updated["client_email"] = client.get("email")
        updated["client_telephone"] = client.get("telephone")
    
    return updated

@api_router.delete("/reparations/{reparation_id}")
async def delete_reparation(reparation_id: str):
    """Delete a repair"""
    result = await db.reparations.delete_one({"id": reparation_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Réparation non trouvée")
    return {"message": "Réparation supprimée"}

# ===================== PDF GENERATION =====================

@api_router.get("/reparations/{reparation_id}/pdf/client")
async def get_client_pdf(reparation_id: str):
    """Generate and return client PDF"""
    rep = await db.reparations.find_one({"id": reparation_id}, {"_id": 0})
    if not rep:
        raise HTTPException(status_code=404, detail="Réparation non trouvée")
    
    client = await db.clients.find_one({"id": rep["client_id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    pdf_content = generate_client_pdf(rep, client)
    
    # Save to file for permanent access
    filename = sanitize_filename(f"Reparation_n{rep['numero']}_client.pdf")
    filepath = PDF_DIR / filename
    with open(filepath, 'wb') as f:
        f.write(pdf_content)
    
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@api_router.get("/reparations/{reparation_id}/pdf/interne")
async def get_internal_pdf(reparation_id: str):
    """Generate and return internal PDF"""
    rep = await db.reparations.find_one({"id": reparation_id}, {"_id": 0})
    if not rep:
        raise HTTPException(status_code=404, detail="Réparation non trouvée")
    
    client = await db.clients.find_one({"id": rep["client_id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    pdf_content = generate_internal_pdf(rep, client)
    
    # Save to file for permanent access
    filename = sanitize_filename(f"Reparation_n{rep['numero']}_interne.pdf")
    filepath = PDF_DIR / filename
    with open(filepath, 'wb') as f:
        f.write(pdf_content)
    
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

# ===================== EMAIL =====================

@api_router.post("/reparations/{reparation_id}/send-email")
async def send_repair_email(reparation_id: str):
    """Send repair completion email to client with PDF attachment"""
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Service email non configuré")
    
    rep = await db.reparations.find_one({"id": reparation_id}, {"_id": 0})
    if not rep:
        raise HTTPException(status_code=404, detail="Réparation non trouvée")
    
    client = await db.clients.find_one({"id": rep["client_id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    if not client.get("email"):
        raise HTTPException(status_code=400, detail="Le client n'a pas d'adresse email")
    
    # Generate PDF
    pdf_content = generate_client_pdf(rep, client)
    pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')
    filename = sanitize_filename(f"Reparation_n{rep['numero']}.pdf")
    
    # Prepare email
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333;">
        <p>Bonjour {client.get('prenom', '')} {client.get('nom', '')},</p>
        <p>Veuillez trouver en pièce jointe votre fiche de réparation n°{rep['numero']}.</p>
        <p>Cordialement,<br>
        <strong>{COMPANY_INFO['name']}</strong><br>
        {COMPANY_INFO['address']}<br>
        Tél: {COMPANY_INFO['phone']}<br>
        Email: {COMPANY_INFO['email']}</p>
    </body>
    </html>
    """
    
    params = {
        "from": SENDER_EMAIL,
        "to": [client["email"]],
        "subject": f"Fiche de réparation n°{rep['numero']} - {COMPANY_INFO['name']}",
        "html": html_content,
        "attachments": [
            {
                "filename": filename,
                "content": pdf_base64
            }
        ]
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        return {
            "status": "success",
            "message": f"Email envoyé à {client['email']}",
            "email_id": email.get("id")
        }
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'envoi: {str(e)}")

# ===================== CASH REGISTER (CAISSE) =====================

@api_router.post("/caisse", response_model=CaisseEntry)
async def create_caisse_entry(entry: CaisseEntryCreate):
    """Create a new cash register entry"""
    now = datetime.now(timezone.utc).isoformat()
    
    entry_doc = {
        "id": str(uuid.uuid4()),
        "type": entry.type,
        "montant": entry.montant,
        "description": entry.description,
        "mode_paiement": entry.mode_paiement,
        "reparation_id": entry.reparation_id,
        "date": now
    }
    
    await db.caisse.insert_one(entry_doc)
    entry_doc.pop("_id", None)
    return entry_doc

@api_router.get("/caisse", response_model=List[CaisseEntry])
async def get_caisse_entries(
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(100, le=500)
):
    """Get cash register entries"""
    query = {}
    
    if date_from or date_to:
        date_query = {}
        if date_from:
            date_query["$gte"] = date_from
        if date_to:
            date_query["$lte"] = date_to + "T23:59:59"
        if date_query:
            query["date"] = date_query
    
    entries = await db.caisse.find(query, {"_id": 0}).sort("date", -1).to_list(limit)
    return entries

@api_router.delete("/caisse/{entry_id}")
async def delete_caisse_entry(entry_id: str):
    """Delete a cash register entry"""
    result = await db.caisse.delete_one({"id": entry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entrée non trouvée")
    return {"message": "Entrée supprimée"}

# ===================== EXPORTS =====================

@api_router.get("/export/reparations/excel")
async def export_reparations_excel(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None)
):
    """Export repairs to Excel"""
    query = {}
    if date_from:
        query["date_creation"] = {"$gte": date_from}
    if date_to:
        if "date_creation" in query:
            query["date_creation"]["$lte"] = date_to + "T23:59:59"
        else:
            query["date_creation"] = {"$lte": date_to + "T23:59:59"}
    
    reparations = await db.reparations.find(query, {"_id": 0}).sort("date_creation", -1).to_list(1000)
    
    # Create workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "Réparations"
    
    # Header style
    header_fill = PatternFill(start_color="84CC16", end_color="84CC16", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    # Headers
    headers = ["N°", "Date", "Client", "Téléphone", "Marque", "Modèle", "Problème", "Diagnostic", "Action", "Prix", "Statut"]
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.border = thin_border
        cell.alignment = Alignment(horizontal='center')
    
    # Data
    for row_idx, rep in enumerate(reparations, 2):
        client = await db.clients.find_one({"id": rep["client_id"]}, {"_id": 0})
        client_name = f"{client.get('prenom', '')} {client.get('nom', '')}" if client else "-"
        client_phone = client.get("telephone", "-") if client else "-"
        
        data = [
            rep.get("numero", ""),
            rep.get("date_creation", "")[:10],
            client_name,
            client_phone,
            rep.get("marque", ""),
            rep.get("modele", ""),
            rep.get("probleme_declare", ""),
            rep.get("diagnostic", "") or "",
            rep.get("action_realisee", "") or "",
            rep.get("prix", "") or "",
            rep.get("statut", "")
        ]
        
        for col, value in enumerate(data, 1):
            cell = ws.cell(row=row_idx, column=col, value=value)
            cell.border = thin_border
    
    # Adjust column widths
    for col in ws.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        adjusted_width = min(max_length + 2, 50)
        ws.column_dimensions[column].width = adjusted_width
    
    # Save to buffer
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    
    filename = f"reparations_{datetime.now().strftime('%Y%m%d')}.xlsx"
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@api_router.get("/export/caisse/excel")
async def export_caisse_excel(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None)
):
    """Export cash register to Excel"""
    query = {}
    if date_from:
        query["date"] = {"$gte": date_from}
    if date_to:
        if "date" in query:
            query["date"]["$lte"] = date_to + "T23:59:59"
        else:
            query["date"] = {"$lte": date_to + "T23:59:59"}
    
    entries = await db.caisse.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    
    # Create workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "Journal de Caisse"
    
    # Header style
    header_fill = PatternFill(start_color="84CC16", end_color="84CC16", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")
    thin_border = Border(
        left=Side(style='thin'),
        right=Side(style='thin'),
        top=Side(style='thin'),
        bottom=Side(style='thin')
    )
    
    # Headers
    headers = ["Date", "Type", "Montant", "Description", "Mode de paiement"]
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.border = thin_border
        cell.alignment = Alignment(horizontal='center')
    
    # Data
    total_entrees = 0
    total_sorties = 0
    
    for row_idx, entry in enumerate(entries, 2):
        data = [
            entry.get("date", "")[:16].replace("T", " "),
            "Entrée" if entry.get("type") == "entree" else "Sortie",
            entry.get("montant", 0),
            entry.get("description", ""),
            entry.get("mode_paiement", "") or ""
        ]
        
        if entry.get("type") == "entree":
            total_entrees += entry.get("montant", 0)
        else:
            total_sorties += entry.get("montant", 0)
        
        for col, value in enumerate(data, 1):
            cell = ws.cell(row=row_idx, column=col, value=value)
            cell.border = thin_border
    
    # Summary
    last_row = len(entries) + 3
    ws.cell(row=last_row, column=1, value="TOTAL ENTREES").font = Font(bold=True)
    ws.cell(row=last_row, column=3, value=total_entrees).font = Font(bold=True)
    ws.cell(row=last_row + 1, column=1, value="TOTAL SORTIES").font = Font(bold=True)
    ws.cell(row=last_row + 1, column=3, value=total_sorties).font = Font(bold=True)
    ws.cell(row=last_row + 2, column=1, value="SOLDE").font = Font(bold=True)
    ws.cell(row=last_row + 2, column=3, value=total_entrees - total_sorties).font = Font(bold=True)
    
    # Adjust column widths
    for col in ws.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        adjusted_width = min(max_length + 2, 50)
        ws.column_dimensions[column].width = adjusted_width
    
    # Save to buffer
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    
    filename = f"journal_caisse_{datetime.now().strftime('%Y%m%d')}.xlsx"
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
