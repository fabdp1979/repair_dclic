from fastapi import FastAPI, APIRouter, HTTPException, Query, Response
from fastapi.responses import FileResponse, HTMLResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any, Tuple
import uuid
from datetime import datetime, timezone
import asyncio
import resend
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.lib.units import cm, mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from unidecode import unidecode
import io
import base64
from openpyxl import Workbook
import openpyxl.utils
from openpyxl.styles import Font, Alignment, Border, Side, PatternFill
from Levenshtein import ratio as levenshtein_ratio
import qrcode

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

# Conditions de réparation
CONDITIONS_REPARATION = {
    "prise_en_charge": "Dclic Informatique est responsable du matériel fourni en cas de destruction, partielle ou totale, ou de vol. La société DClic Informatique ne pourra pas être tenue responsable en cas de pertes de données. Il est recommandé au client d'effectuer une sauvegarde des données avant sa réparation. En cas de réinstallation du système, le client fournira un numéro de licence Windows valide et officiel. Dans le cas contraire, une version d'évaluation de 30 jours sera installée, dans la mesure du possible.",
    "delais": "Les délais de réparation sont fonctions de la charge de travail en cours, ainsi que de la disponibilité des éventuelles pièces détachées. Aucune indemnité ne pourra être demandée en cas d'un éventuel dépassement de délai de réparation. Le client a la possibilité, en choisissant l'option \"Réparation Urgente\" à 25€, d'être prioritaire sur les autres réparations en cours.",
    "devis": "Tout devis de réparation sera offert dans le cas où il est accepté par le client. En cas de refus, il sera facturé 15€ TTC.",
    "tarifs": "Le forfait réparation en atelier est de 60€TTC. En cas de panne matérielle constatée par DClic Informatique, le client sera contacté et informé du montant des réparations. Il choisira alors s'il accepte de procéder à la réparation ou non.",
    "reglement": "La réparation est réglée au comptant, lorsque le client vient en boutique récupérer son (ses) appareil(s).",
    "garantie": "La réparation est garantie 3 mois concernant la main d'oeuvre, et 1 an concernant les pièces remplacées. Certaines pièces peuvent avoir une garantie différente, le client en sera alors informé sur sa facture. La garantie ne s'applique qu'en cas de même panne et non automatiquement de mêmes symptômes.",
    "abandon": "Tout appareil non réclamé dans un délai de 6 mois et 1 jour sera considéré comme abandonné par son propriétaire. Au-delà de ce délai, DClic Informatique se réserve le droit d'user du matériel comme bon lui semble. DClic Informatique peut proposer au client une reprise du matériel pour un montant valable uniquement avant le départ de l'appareil des locaux de DClic Informatique. Dans ce cas, le réglement ne pourra être fait que par chèque bancaire, sur justificatif de l'identité et du domicile du client.",
    "contestations": "En confiant son (ses) appareil(s) à DClic Informatique, le client lit, comprend, et approuve par sa signature ces conditions. Toute contestation devra se faire auprès du Tribunal de Commerce de Brive-La-Gaillarde, seul compétent."
}

# Matériel fourni options
MATERIEL_OPTIONS = [
    "pc_portable", "pc_fixe", "sacoche", "imprimante", "chargeur_pc", "disque_dur_externe",
    "souris", "webcam", "cd_dvd", "clavier", "cle_usb", "cables_divers",
    "cle_wifi", "ecran", "onduleur", "enceintes", "documents_divers", "ipad"
]

# Statuts client (simplifié pour suivi public)
STATUTS_CLIENT = [
    "Réparation enregistrée",
    "En cours de diagnostic", 
    "En attente pièce/intervention",
    "En cours de réparation",
    "Appareil prêt"
]

# Statuts commande
STATUTS_COMMANDE = [
    "En attente de commande",
    "Commandé",
    "En attente réception",
    "Reçu",
    "Livré/Récupéré",
    "Réglé",
    "Annulé"
]

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
    telephone2: Optional[str] = None
    email: Optional[EmailStr] = None
    adresse: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    telephone: Optional[str] = None
    telephone2: Optional[str] = None
    email: Optional[EmailStr] = None
    adresse: Optional[str] = None

class Client(ClientBase):
    id: str
    created_at: str
    updated_at: str

# Repair Models - Extended
class ReparationBase(BaseModel):
    client_id: str
    # Matériel fourni (cases à cocher)
    materiel_fourni: Optional[Dict[str, bool]] = None
    autre_materiel: Optional[str] = None
    # Option urgente
    urgence: Optional[bool] = False
    # Technique
    mot_de_passe: Optional[str] = None
    description_panne: str
    observations_client: Optional[str] = None
    # Diagnostic et action
    diagnostic: Optional[str] = None
    action_realisee: Optional[str] = None
    prix: Optional[float] = None
    # Statuts
    statut: str = "Réparation enregistrée"
    statut_interne: str = "En cours"

class ReparationCreate(ReparationBase):
    pass

class ReparationUpdate(BaseModel):
    client_id: Optional[str] = None
    materiel_fourni: Optional[Dict[str, bool]] = None
    autre_materiel: Optional[str] = None
    urgence: Optional[bool] = None
    mot_de_passe: Optional[str] = None
    description_panne: Optional[str] = None
    observations_client: Optional[str] = None
    diagnostic: Optional[str] = None
    action_realisee: Optional[str] = None
    prix: Optional[float] = None
    statut: Optional[str] = None
    statut_interne: Optional[str] = None

class Reparation(BaseModel):
    id: str
    numero: str
    client_id: str
    tracking_id: Optional[str] = None
    date_creation: str
    heure_creation: Optional[str] = None
    date_modification: str
    # Legacy field support
    marque: Optional[str] = None
    modele: Optional[str] = None
    probleme_declare: Optional[str] = None
    # New fields
    materiel_fourni: Optional[Dict[str, bool]] = None
    autre_materiel: Optional[str] = None
    urgence: Optional[bool] = False
    mot_de_passe: Optional[str] = None
    description_panne: Optional[str] = None
    observations_client: Optional[str] = None
    diagnostic: Optional[str] = None
    action_realisee: Optional[str] = None
    prix: Optional[float] = None
    statut: str = "Réparation enregistrée"
    statut_interne: Optional[str] = "En cours"
    # Client info
    client_nom: Optional[str] = None
    client_prenom: Optional[str] = None
    client_email: Optional[str] = None
    client_telephone: Optional[str] = None
    # Signature client
    signature_b64: Optional[str] = None
    date_signature: Optional[str] = None
    nom_signataire: Optional[str] = None
    envoye_sans_signature: Optional[bool] = False

# Commande Models
class CommandeBase(BaseModel):
    client_id: str
    reference_produit: Optional[str] = None
    designation: str
    fournisseur: Optional[str] = None
    quantite: int = 1
    prix_achat: Optional[float] = None
    prix_vente: Optional[float] = None
    statut: str = "En attente de commande"
    remarques: Optional[str] = None

class CommandeCreate(CommandeBase):
    pass

class CommandeUpdate(BaseModel):
    client_id: Optional[str] = None
    reference_produit: Optional[str] = None
    designation: Optional[str] = None
    fournisseur: Optional[str] = None
    quantite: Optional[int] = None
    prix_achat: Optional[float] = None
    prix_vente: Optional[float] = None
    statut: Optional[str] = None
    remarques: Optional[str] = None

class Commande(CommandeBase):
    id: str
    numero: str
    date_creation: str
    date_modification: str
    montant_total: Optional[float] = None
    client_nom: Optional[str] = None
    client_prenom: Optional[str] = None
    client_telephone: Optional[str] = None

# Cash Register Models (Caisse)
class CaisseEntryBase(BaseModel):
    type: str  # "entree" or "sortie"
    montant: float
    description: str
    mode_paiement: Optional[str] = None
    reparation_id: Optional[str] = None
    client_id: Optional[str] = None

class CaisseEntryCreate(CaisseEntryBase):
    pass

class CaisseEntry(CaisseEntryBase):
    id: str
    date: str

# Encaissement Models (entrées uniquement)
# Types: forfait_63, rapide_30, express_10, devis_15, ventes, autre
TYPES_RECETTE = {
    "forfait_63": {"label": "Forfait réparation", "ttc": 63.0, "ht": 52.50},
    "rapide_30": {"label": "Réparation rapide", "ttc": 30.0, "ht": 25.0},
    "express_10": {"label": "Réparation express", "ttc": 10.0, "ht": 8.33},
    "devis_15": {"label": "Devis", "ttc": 15.0, "ht": 12.50},
    "ventes": {"label": "Ventes", "ttc": None, "ht": None},
    "autre": {"label": "Autre", "ttc": None, "ht": None}
}

class PaiementDetail(BaseModel):
    mode: str  # especes, cb, cheque, virement
    montant: float

class EncaissementBase(BaseModel):
    type_recette: str
    montant_ttc: float
    montant_ht: Optional[float] = None
    paiements: List[PaiementDetail]  # Permet plusieurs modes de paiement
    client_id: Optional[str] = None
    reference: Optional[str] = None
    remarque: Optional[str] = None

class EncaissementCreate(EncaissementBase):
    pass

class Encaissement(EncaissementBase):
    id: str
    date: str
    client_nom: Optional[str] = None
    client_prenom: Optional[str] = None

class DashboardStats(BaseModel):
    total_clients: int
    total_reparations: int
    reparations_en_cours: int
    reparations_terminees: int
    total_commandes: int
    commandes_en_attente: int
    total_caisse_jour: float
    total_entrees_jour: float
    total_sorties_jour: float

# ===================== HELPER FUNCTIONS =====================

async def get_next_repair_number():
    """Generate next repair number in format REP-YYYY-XXXX"""
    year = datetime.now(timezone.utc).year
    prefix = f"REP-{year}-"
    
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

async def get_next_commande_number():
    """Generate next commande number in format cmd-DD-MM-YYYY-XXXX"""
    now = datetime.now(timezone.utc)
    date_str = now.strftime("%d-%m-%Y")
    prefix = f"cmd-{date_str}-"
    
    last_commande = await db.commandes.find_one(
        {"numero": {"$regex": f"^{prefix}"}},
        sort=[("numero", -1)]
    )
    
    if last_commande:
        try:
            last_num = int(last_commande["numero"].split("-")[-1])
            next_num = last_num + 1
        except:
            next_num = 1
    else:
        next_num = 1
    
    return f"{prefix}{next_num:04d}"

def sanitize_filename(filename):
    """Remove problematic characters from filename"""
    filename = unidecode(filename)
    filename = filename.replace(" ", "_")
    filename = "".join(c for c in filename if c.isalnum() or c in "._-")
    return filename

def generate_qr_code(data: str) -> bytes:
    """Generate QR code as PNG bytes"""
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    buffer.seek(0)
    return buffer.getvalue()

def get_materiel_fourni_list(materiel: Dict[str, bool], autre: str = None) -> List[str]:
    """Convert materiel dict to readable list"""
    labels = {
        "pc_portable": "PC portable",
        "pc_fixe": "PC fixe",
        "sacoche": "Sacoche",
        "imprimante": "Imprimante",
        "chargeur_pc": "Chargeur PC portable",
        "disque_dur_externe": "Disque dur externe",
        "souris": "Souris",
        "webcam": "Webcam",
        "cd_dvd": "CD/DVD divers",
        "clavier": "Clavier",
        "cle_usb": "Clé USB",
        "cables_divers": "Câbles divers",
        "cle_wifi": "Clé Wifi",
        "ecran": "Écran",
        "onduleur": "Onduleur",
        "enceintes": "Enceintes",
        "documents_divers": "Documents divers",
        "ipad": "iPad"
    }
    result = []
    if materiel:
        for key, checked in materiel.items():
            if checked and key in labels:
                result.append(labels[key])
    if autre:
        result.append(f"Autre: {autre}")
    return result

def generate_client_pdf(reparation: dict, client: dict, tracking_url: str = None, force_no_signature: bool = False) -> bytes:
    """Generate PDF for client (without password, with conditions)"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, 
                           leftMargin=1.5*cm, rightMargin=1.5*cm,
                           topMargin=1.5*cm, bottomMargin=1.5*cm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'],
        fontSize=16, spaceAfter=10, textColor=colors.HexColor('#84CC16'), alignment=1)
    header_style = ParagraphStyle('Header', parent=styles['Normal'],
        fontSize=9, textColor=colors.HexColor('#64748B'), alignment=1)
    section_style = ParagraphStyle('Section', parent=styles['Heading2'],
        fontSize=11, spaceBefore=12, spaceAfter=6, textColor=colors.HexColor('#0F172A'))
    normal_style = ParagraphStyle('CustomNormal', parent=styles['Normal'],
        fontSize=9, spaceAfter=3)
    small_style = ParagraphStyle('Small', parent=styles['Normal'],
        fontSize=7, textColor=colors.HexColor('#64748B'), spaceAfter=2)
    condition_title = ParagraphStyle('ConditionTitle', parent=styles['Normal'],
        fontSize=8, fontName='Helvetica-Bold', textColor=colors.HexColor('#0F172A'), spaceAfter=2)
    condition_text = ParagraphStyle('ConditionText', parent=styles['Normal'],
        fontSize=7, textColor=colors.HexColor('#374151'), spaceAfter=4)
    
    elements = []
    
    # Header
    elements.append(Paragraph(COMPANY_INFO["name"], title_style))
    elements.append(Paragraph(COMPANY_INFO["address"], header_style))
    elements.append(Paragraph(f"Tél: {COMPANY_INFO['phone']} | Email: {COMPANY_INFO['email']}", header_style))
    elements.append(Spacer(1, 15))
    
    # Title with number and date
    elements.append(Paragraph(f"<b>FICHE DE RÉPARATION N° {reparation['numero']}</b>", section_style))
    elements.append(Paragraph(f"Date: {reparation.get('date_creation', '')[:10]} - Heure: {reparation.get('heure_creation', '')}", normal_style))
    if reparation.get('urgence'):
        elements.append(Paragraph("<font color='red'><b>⚠ RÉPARATION URGENTE (+25€)</b></font>", normal_style))
    elements.append(Spacer(1, 10))
    
    # Client info
    elements.append(Paragraph("<b>INFORMATIONS CLIENT</b>", section_style))
    client_data = [
        ["Nom:", f"{client.get('prenom', '')} {client.get('nom', '')}"],
        ["Téléphone:", client.get('telephone', '-')],
        ["Email:", client.get('email', '-') or '-'],
    ]
    client_table = Table(client_data, colWidths=[3*cm, 13*cm])
    client_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(client_table)
    elements.append(Spacer(1, 10))
    
    # Matériel fourni
    materiel_list = get_materiel_fourni_list(
        reparation.get('materiel_fourni', {}),
        reparation.get('autre_materiel')
    )
    if materiel_list:
        elements.append(Paragraph("<b>MATÉRIEL FOURNI</b>", section_style))
        elements.append(Paragraph(", ".join(materiel_list), normal_style))
        elements.append(Spacer(1, 10))
    
    # Description
    elements.append(Paragraph("<b>DESCRIPTION DE LA PANNE</b>", section_style))
    elements.append(Paragraph(reparation.get('description_panne', '-'), normal_style))
    
    if reparation.get('observations_client'):
        elements.append(Spacer(1, 5))
        elements.append(Paragraph("<b>Observations du client:</b>", normal_style))
        elements.append(Paragraph(reparation.get('observations_client', ''), normal_style))
    elements.append(Spacer(1, 10))
    
    # Diagnostic et action
    if reparation.get('diagnostic') or reparation.get('action_realisee'):
        elements.append(Paragraph("<b>DIAGNOSTIC ET INTERVENTION</b>", section_style))
        if reparation.get('diagnostic'):
            elements.append(Paragraph(f"<b>Diagnostic:</b> {reparation.get('diagnostic')}", normal_style))
        if reparation.get('action_realisee'):
            elements.append(Paragraph(f"<b>Action réalisée:</b> {reparation.get('action_realisee')}", normal_style))
        elements.append(Spacer(1, 10))
    
    # Prix et statut
    elements.append(Paragraph("<b>STATUT ET TARIF</b>", section_style))
    status_data = [
        ["Statut:", reparation.get('statut', '-')],
    ]
    if reparation.get('prix'):
        status_data.append(["Prix:", f"{reparation['prix']:.2f} €"])
    status_table = Table(status_data, colWidths=[3*cm, 13*cm])
    status_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(status_table)
    elements.append(Spacer(1, 15))
    
    # QR Code for tracking
    if tracking_url:
        elements.append(Paragraph("<b>SUIVI DE VOTRE RÉPARATION</b>", section_style))
        elements.append(Paragraph(f"Scannez le QR code ou visitez:", small_style))
        elements.append(Paragraph(f"<font color='blue'>{tracking_url}</font>", small_style))
        
        # Generate QR code
        qr_bytes = generate_qr_code(tracking_url)
        qr_img = Image(io.BytesIO(qr_bytes), width=2.5*cm, height=2.5*cm)
        elements.append(qr_img)
        elements.append(Spacer(1, 10))
    
    # Conditions de réparation
    elements.append(Paragraph("<b>CONDITIONS DE RÉPARATION</b>", section_style))
    elements.append(Paragraph("<b>Prise en charge du matériel:</b>", condition_title))
    elements.append(Paragraph(CONDITIONS_REPARATION["prise_en_charge"], condition_text))
    elements.append(Paragraph("<b>Délais:</b>", condition_title))
    elements.append(Paragraph(CONDITIONS_REPARATION["delais"], condition_text))
    elements.append(Paragraph("<b>Devis:</b>", condition_title))
    elements.append(Paragraph(CONDITIONS_REPARATION["devis"], condition_text))
    elements.append(Paragraph("<b>Tarifs:</b>", condition_title))
    elements.append(Paragraph(CONDITIONS_REPARATION["tarifs"], condition_text))
    elements.append(Paragraph("<b>Règlement:</b>", condition_title))
    elements.append(Paragraph(CONDITIONS_REPARATION["reglement"], condition_text))
    elements.append(Paragraph("<b>Garantie:</b>", condition_title))
    elements.append(Paragraph(CONDITIONS_REPARATION["garantie"], condition_text))
    elements.append(Paragraph("<b>Abandon:</b>", condition_title))
    elements.append(Paragraph(CONDITIONS_REPARATION["abandon"], condition_text))
    elements.append(Paragraph("<b>Contestations:</b>", condition_title))
    elements.append(Paragraph(CONDITIONS_REPARATION["contestations"], condition_text))
    
    elements.append(Spacer(1, 15))
    # Bloc signature
    if reparation.get("signature_b64"):
        signataire = reparation.get("nom_signataire") or f"{client.get('prenom','')} {client.get('nom','')}".strip()
        date_sig = reparation.get("date_signature", "")[:10]
        elements.append(Paragraph("<b>Lu et approuvé, bon pour accord</b>", normal_style))
        elements.append(Paragraph(f"Nom : {signataire}    —    Date : {date_sig}", normal_style))
        elements.append(Spacer(1, 4))
        try:
            raw = reparation["signature_b64"]
            if raw.startswith("data:"):
                raw = raw.split(",", 1)[1]
            sig_bytes = base64.b64decode(raw)
            sig_img = Image(io.BytesIO(sig_bytes), width=5 * cm, height=2 * cm)
            elements.append(sig_img)
        except Exception as exc:
            logger.error(f"Failed to embed signature: {exc}")
            elements.append(Paragraph("<i>[Signature non affichable]</i>", small_style))
    elif reparation.get("envoye_sans_signature") or force_no_signature:
        elements.append(Paragraph(
            "<font color='#DC2626'><b>Document envoyé sans signature du client</b></font>",
            normal_style,
        ))
    else:
        elements.append(Paragraph("Signature du client (lu et approuvé) :", normal_style))
        elements.append(Spacer(1, 20))

    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()

def generate_internal_pdf(reparation: dict, client: dict) -> bytes:
    """Generate internal PDF (with password and all details)"""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                           leftMargin=1.5*cm, rightMargin=1.5*cm,
                           topMargin=1.5*cm, bottomMargin=1.5*cm)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('CustomTitle', parent=styles['Heading1'],
        fontSize=16, spaceAfter=10, textColor=colors.HexColor('#0F172A'), alignment=1)
    internal_badge = ParagraphStyle('InternalBadge', parent=styles['Normal'],
        fontSize=10, textColor=colors.white, backColor=colors.HexColor('#DC2626'),
        alignment=1, spaceBefore=5, spaceAfter=10)
    section_style = ParagraphStyle('Section', parent=styles['Heading2'],
        fontSize=11, spaceBefore=12, spaceAfter=6, textColor=colors.HexColor('#0F172A'))
    normal_style = ParagraphStyle('CustomNormal', parent=styles['Normal'],
        fontSize=9, spaceAfter=3)
    
    elements = []
    
    # Internal badge
    elements.append(Paragraph("*** DOCUMENT INTERNE - NE PAS TRANSMETTRE AU CLIENT ***", internal_badge))
    
    # Header
    elements.append(Paragraph(f"FICHE INTERNE N° {reparation['numero']}", title_style))
    elements.append(Paragraph(f"Date: {reparation.get('date_creation', '')[:10]} - Heure: {reparation.get('heure_creation', '')}", normal_style))
    if reparation.get('urgence'):
        elements.append(Paragraph("<font color='red'><b>⚠ RÉPARATION URGENTE</b></font>", normal_style))
    elements.append(Spacer(1, 10))
    
    # Client info
    elements.append(Paragraph("<b>CLIENT</b>", section_style))
    client_data = [
        ["Nom:", f"{client.get('prenom', '')} {client.get('nom', '')}"],
        ["Téléphone:", client.get('telephone', '-')],
        ["Email:", client.get('email', '-') or '-'],
        ["Adresse:", client.get('adresse', '-') or '-'],
    ]
    client_table = Table(client_data, colWidths=[3*cm, 13*cm])
    client_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(client_table)
    elements.append(Spacer(1, 10))
    
    # Matériel fourni
    materiel_list = get_materiel_fourni_list(
        reparation.get('materiel_fourni', {}),
        reparation.get('autre_materiel')
    )
    if materiel_list:
        elements.append(Paragraph("<b>MATÉRIEL FOURNI</b>", section_style))
        elements.append(Paragraph(", ".join(materiel_list), normal_style))
        elements.append(Spacer(1, 10))
    
    # MOT DE PASSE (visible only on internal)
    elements.append(Paragraph("<b>INFORMATIONS TECHNIQUES</b>", section_style))
    tech_data = [
        ["Mot de passe:", reparation.get('mot_de_passe', '-') or '-'],
    ]
    tech_table = Table(tech_data, colWidths=[3*cm, 13*cm])
    tech_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#E5E7EB')),
    ]))
    elements.append(tech_table)
    elements.append(Spacer(1, 10))
    
    # Description
    elements.append(Paragraph("<b>DESCRIPTION DE LA PANNE</b>", section_style))
    elements.append(Paragraph(reparation.get('description_panne', '-'), normal_style))
    
    if reparation.get('observations_client'):
        elements.append(Spacer(1, 5))
        elements.append(Paragraph(f"<b>Observations client:</b> {reparation.get('observations_client')}", normal_style))
    elements.append(Spacer(1, 10))
    
    # Diagnostic et action
    elements.append(Paragraph("<b>DIAGNOSTIC ET INTERVENTION</b>", section_style))
    elements.append(Paragraph(f"<b>Diagnostic:</b> {reparation.get('diagnostic', '-') or '-'}", normal_style))
    elements.append(Paragraph(f"<b>Action réalisée:</b> {reparation.get('action_realisee', '-') or '-'}", normal_style))
    elements.append(Spacer(1, 10))
    
    # Status
    elements.append(Paragraph("<b>STATUT</b>", section_style))
    status_data = [
        ["Statut client:", reparation.get('statut', '-')],
        ["Statut interne:", reparation.get('statut_interne', '-')],
        ["Prix:", f"{reparation.get('prix', 0):.2f} €" if reparation.get('prix') else '-'],
    ]
    status_table = Table(status_data, colWidths=[3*cm, 13*cm])
    status_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(status_table)
    
    elements.append(Spacer(1, 20))
    elements.append(Paragraph(f"Créé le: {reparation['date_creation']}", normal_style))
    elements.append(Paragraph(f"Modifié le: {reparation['date_modification']}", normal_style))
    elements.append(Paragraph(f"Tracking ID: {reparation.get('tracking_id', '-')}", normal_style))
    
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
    reparations_en_cours = await db.reparations.count_documents({"statut_interne": "En cours"})
    reparations_terminees = await db.reparations.count_documents({"statut_interne": "Terminé"})
    total_commandes = await db.commandes.count_documents({})
    commandes_en_attente = await db.commandes.count_documents({"statut": {"$nin": ["Livré/Récupéré", "Réglé", "Annulé"]}})
    
    # Cash register for today
    today_entries = await db.caisse.find(
        {"date": {"$regex": f"^{today}"}},
        {"_id": 0}
    ).to_list(1000)
    
    total_entrees = sum(e["montant"] for e in today_entries if e["type"] == "entree")
    total_sorties = sum(e["montant"] for e in today_entries if e["type"] == "sortie")
    
    # Also add encaissements
    today_encaissements = await db.encaissements.find(
        {"date": {"$regex": f"^{today}"}},
        {"_id": 0}
    ).to_list(1000)
    total_entrees += sum(e.get("montant_ttc", e.get("montant", 0)) or 0 for e in today_encaissements)
    
    return DashboardStats(
        total_clients=total_clients,
        total_reparations=total_reparations,
        reparations_en_cours=reparations_en_cours,
        reparations_terminees=reparations_terminees,
        total_commandes=total_commandes,
        commandes_en_attente=commandes_en_attente,
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
        "telephone2": client.telephone2,
        "email": client.email,
        "adresse": client.adresse,
        "created_at": now,
        "updated_at": now
    }
    await db.clients.insert_one(client_doc)
    client_doc.pop("_id", None)
    return client_doc

@api_router.get("/clients", response_model=List[Client])
async def get_clients(
    search: Optional[str] = Query(None, description="Search by name or phone"),
    limit: int = Query(100, le=500)
):
    """Get all clients with optional search"""
    if search:
        all_clients = await db.clients.find({}, {"_id": 0}).to_list(500)
        search_lower = search.lower()
        search_normalized = unidecode(search_lower)
        
        matched_clients = []
        for c in all_clients:
            nom_normalized = unidecode(c.get("nom", "").lower())
            prenom_normalized = unidecode(c.get("prenom", "").lower())
            full_name = f"{prenom_normalized} {nom_normalized}"
            telephone = c.get("telephone", "")
            
            if search in telephone:
                matched_clients.append(c)
                continue
            
            if (levenshtein_ratio(search_normalized, nom_normalized) > 0.7 or
                levenshtein_ratio(search_normalized, prenom_normalized) > 0.7 or
                levenshtein_ratio(search_normalized, full_name) > 0.6 or
                search_normalized in nom_normalized or
                search_normalized in prenom_normalized):
                matched_clients.append(c)
        
        return matched_clients[:limit]
    
    clients = await db.clients.find({}, {"_id": 0}).to_list(limit)
    return clients

@api_router.get("/clients/{client_id}", response_model=Client)
async def get_client(client_id: str):
    """Get a specific client"""
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    return client

@api_router.get("/clients/{client_id}/reparations")
async def get_client_reparations(client_id: str):
    """Get all repairs for a specific client"""
    reparations = await db.reparations.find({"client_id": client_id}, {"_id": 0}).sort("date_creation", -1).to_list(100)
    return reparations

@api_router.get("/clients/{client_id}/commandes")
async def get_client_commandes(client_id: str):
    """Get all orders for a specific client"""
    commandes = await db.commandes.find({"client_id": client_id}, {"_id": 0}).sort("date_creation", -1).to_list(100)
    return commandes

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

@api_router.get("/reparations/statuts-client")
async def get_statuts_client():
    """Get available client statuses"""
    return {"statuts": STATUTS_CLIENT}

@api_router.get("/reparations/materiel-options")
async def get_materiel_options():
    """Get available equipment options"""
    labels = {
        "pc_portable": "PC portable", "pc_fixe": "PC fixe", "sacoche": "Sacoche",
        "imprimante": "Imprimante", "chargeur_pc": "Chargeur PC portable",
        "disque_dur_externe": "Disque dur externe", "souris": "Souris", "webcam": "Webcam",
        "cd_dvd": "CD/DVD divers", "clavier": "Clavier", "cle_usb": "Clé USB",
        "cables_divers": "Câbles divers", "cle_wifi": "Clé Wifi", "ecran": "Écran",
        "onduleur": "Onduleur", "enceintes": "Enceintes", "documents_divers": "Documents divers",
        "ipad": "iPad"
    }
    return {"options": labels}

@api_router.post("/reparations", response_model=Reparation)
async def create_reparation(reparation: ReparationCreate):
    """Create a new repair"""
    client = await db.clients.find_one({"id": reparation.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    now = datetime.now(timezone.utc)
    numero = await get_next_repair_number()
    tracking_id = str(uuid.uuid4())[:8].upper()
    
    rep_doc = {
        "id": str(uuid.uuid4()),
        "numero": numero,
        "tracking_id": tracking_id,
        "client_id": reparation.client_id,
        "materiel_fourni": reparation.materiel_fourni or {},
        "autre_materiel": reparation.autre_materiel,
        "urgence": reparation.urgence or False,
        "mot_de_passe": reparation.mot_de_passe,
        "description_panne": reparation.description_panne,
        "observations_client": reparation.observations_client,
        "diagnostic": reparation.diagnostic,
        "action_realisee": reparation.action_realisee,
        "prix": reparation.prix,
        "statut": reparation.statut,
        "statut_interne": reparation.statut_interne,
        "date_creation": now.isoformat(),
        "heure_creation": now.strftime("%H:%M"),
        "date_modification": now.isoformat()
    }
    
    await db.reparations.insert_one(rep_doc)
    rep_doc.pop("_id", None)
    
    rep_doc["client_nom"] = client.get("nom")
    rep_doc["client_prenom"] = client.get("prenom")
    rep_doc["client_email"] = client.get("email")
    rep_doc["client_telephone"] = client.get("telephone")
    
    return rep_doc

@api_router.get("/reparations", response_model=List[Reparation])
async def get_reparations(
    search: Optional[str] = Query(None),
    statut: Optional[str] = Query(None),
    statut_interne: Optional[str] = Query(None),
    limit: int = Query(100, le=500)
):
    """Get all repairs with optional filters"""
    query = {}
    
    if statut:
        query["statut"] = statut
    if statut_interne:
        query["statut_interne"] = statut_interne
    
    reparations = await db.reparations.find(query, {"_id": 0}).sort("date_creation", -1).to_list(limit)
    
    for rep in reparations:
        # Migrate old data: if description_panne doesn't exist, use probleme_declare
        if "description_panne" not in rep and "probleme_declare" in rep:
            rep["description_panne"] = rep.get("probleme_declare", "")
        
        # Add missing fields for old records
        if "tracking_id" not in rep:
            rep["tracking_id"] = str(uuid.uuid4())[:8].upper()
        if "heure_creation" not in rep:
            rep["heure_creation"] = ""
        if "statut_interne" not in rep:
            rep["statut_interne"] = "Terminé" if rep.get("statut") == "Terminé" else "En cours"
        
        client = await db.clients.find_one({"id": rep["client_id"]}, {"_id": 0})
        if client:
            rep["client_nom"] = client.get("nom")
            rep["client_prenom"] = client.get("prenom")
            rep["client_email"] = client.get("email")
            rep["client_telephone"] = client.get("telephone")
    
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
    
    # Migrate old data
    if "description_panne" not in rep and "probleme_declare" in rep:
        rep["description_panne"] = rep.get("probleme_declare", "")
    if "tracking_id" not in rep:
        rep["tracking_id"] = str(uuid.uuid4())[:8].upper()
    if "heure_creation" not in rep:
        rep["heure_creation"] = ""
    if "statut_interne" not in rep:
        rep["statut_interne"] = "Terminé" if rep.get("statut") == "Terminé" else "En cours"
    
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
    
    # Migrate old data
    if "description_panne" not in updated and "probleme_declare" in updated:
        updated["description_panne"] = updated.get("probleme_declare", "")
    if "tracking_id" not in updated:
        updated["tracking_id"] = str(uuid.uuid4())[:8].upper()
    if "heure_creation" not in updated:
        updated["heure_creation"] = ""
    if "statut_interne" not in updated:
        updated["statut_interne"] = "Terminé" if updated.get("statut") == "Terminé" else "En cours"
    
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

# ===================== SIGNATURE CLIENT =====================

class SignatureInput(BaseModel):
    signature_b64: str
    nom_signataire: Optional[str] = None
    accepte_conditions: bool = True

@api_router.get("/reparations/{reparation_id}/public")
async def get_reparation_public(reparation_id: str):
    """Fiche simplifiée pour le mode signature client (pas de données sensibles)"""
    rep = await db.reparations.find_one({"id": reparation_id}, {"_id": 0})
    if not rep:
        raise HTTPException(status_code=404, detail="Réparation non trouvée")
    client = await db.clients.find_one({"id": rep["client_id"]}, {"_id": 0})
    materiel_list = get_materiel_fourni_list(rep.get("materiel_fourni", {}), rep.get("autre_materiel"))
    return {
        "id": rep["id"],
        "numero": rep.get("numero"),
        "date_creation": rep.get("date_creation", "")[:10],
        "client_nom": client.get("nom") if client else "",
        "client_prenom": client.get("prenom") if client else "",
        "client_telephone": client.get("telephone") if client else "",
        "materiel": materiel_list,
        "description_panne": rep.get("description_panne", ""),
        "urgence": rep.get("urgence", False),
        "signature_b64": rep.get("signature_b64"),
        "date_signature": rep.get("date_signature"),
        "nom_signataire": rep.get("nom_signataire"),
        "conditions": CONDITIONS_REPARATION,
        "company": COMPANY_INFO,
    }

@api_router.post("/reparations/{reparation_id}/signature")
async def save_signature(reparation_id: str, payload: SignatureInput):
    """Enregistre la signature du client (écrase la précédente si présente)"""
    if not payload.accepte_conditions:
        raise HTTPException(status_code=400, detail="Les conditions de réparation doivent être acceptées")
    if not payload.signature_b64 or len(payload.signature_b64) < 100:
        raise HTTPException(status_code=400, detail="Signature invalide")

    rep = await db.reparations.find_one({"id": reparation_id})
    if not rep:
        raise HTTPException(status_code=404, detail="Réparation non trouvée")

    now = datetime.now(timezone.utc).isoformat()
    await db.reparations.update_one(
        {"id": reparation_id},
        {"$set": {
            "signature_b64": payload.signature_b64,
            "nom_signataire": payload.nom_signataire,
            "date_signature": now,
            "envoye_sans_signature": False,
            "date_modification": now,
        }}
    )
    return {"ok": True, "date_signature": now}

@api_router.delete("/reparations/{reparation_id}/signature")
async def delete_signature(reparation_id: str):
    """Supprime la signature (permet une re-signature)"""
    rep = await db.reparations.find_one({"id": reparation_id})
    if not rep:
        raise HTTPException(status_code=404, detail="Réparation non trouvée")
    await db.reparations.update_one(
        {"id": reparation_id},
        {"$set": {
            "signature_b64": None,
            "nom_signataire": None,
            "date_signature": None,
            "date_modification": datetime.now(timezone.utc).isoformat(),
        }}
    )
    return {"ok": True}

# ===================== PUBLIC TRACKING =====================

@api_router.get("/suivi/{tracking_id}")
async def get_public_tracking(tracking_id: str):
    """Get public tracking info for a repair (no sensitive data)"""
    rep = await db.reparations.find_one({"tracking_id": tracking_id.upper()}, {"_id": 0})
    if not rep:
        raise HTTPException(status_code=404, detail="Réparation non trouvée")
    
    client = await db.clients.find_one({"id": rep["client_id"]}, {"_id": 0})
    
    # Return only public info
    materiel_list = get_materiel_fourni_list(
        rep.get('materiel_fourni', {}),
        rep.get('autre_materiel')
    )
    
    return {
        "numero": rep.get("numero"),
        "client_nom": client.get("nom") if client else "",
        "client_prenom": client.get("prenom") if client else "",
        "date_depot": rep.get("date_creation", "")[:10],
        "materiel": materiel_list,
        "statut": rep.get("statut"),
        "urgence": rep.get("urgence", False)
    }

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
    
    # Generate tracking URL
    frontend_url = os.environ.get('FRONTEND_URL', 'https://fiche-repair.preview.emergentagent.com')
    tracking_url = f"{frontend_url}/suivi/{rep.get('tracking_id', '')}"
    
    pdf_content = generate_client_pdf(rep, client, tracking_url)
    
    filename = sanitize_filename(f"Reparation_n{rep['numero']}_client.pdf")
    filepath = PDF_DIR / filename
    with open(filepath, 'wb') as f:
        f.write(pdf_content)
    
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'}
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
    
    filename = sanitize_filename(f"Reparation_n{rep['numero']}_interne.pdf")
    filepath = PDF_DIR / filename
    with open(filepath, 'wb') as f:
        f.write(pdf_content)
    
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'}
    )

@api_router.get("/reparations/{reparation_id}/qrcode")
async def get_qrcode(reparation_id: str):
    """Generate QR code for repair tracking"""
    rep = await db.reparations.find_one({"id": reparation_id}, {"_id": 0})
    if not rep:
        raise HTTPException(status_code=404, detail="Réparation non trouvée")
    
    frontend_url = os.environ.get('FRONTEND_URL', 'https://fiche-repair.preview.emergentagent.com')
    tracking_url = f"{frontend_url}/suivi/{rep.get('tracking_id', '')}"
    
    qr_bytes = generate_qr_code(tracking_url)
    
    return Response(
        content=qr_bytes,
        media_type="image/png",
        headers={"Content-Disposition": f'inline; filename="qr_{rep["numero"]}.png"'}
    )

# ===================== EMAIL =====================

@api_router.post("/reparations/{reparation_id}/send-email")
async def send_repair_email(reparation_id: str, force: bool = Query(False, description="Forcer l'envoi sans signature")):
    """Send repair email to client with PDF attachment. Blocks if no signature unless force=true."""
    # First, check reparation and signature status BEFORE checking Resend config
    rep = await db.reparations.find_one({"id": reparation_id}, {"_id": 0})
    if not rep:
        raise HTTPException(status_code=404, detail="Réparation non trouvée")

    client = await db.clients.find_one({"id": rep["client_id"]}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")

    if not client.get("email"):
        raise HTTPException(status_code=400, detail="Le client n'a pas d'adresse email")

    # Check signature BEFORE checking Resend API key (per requirements)
    has_signature = bool(rep.get("signature_b64"))
    if not has_signature and not force:
        raise HTTPException(
            status_code=409,
            detail="Impossible d'envoyer : le client n'a pas signé. Utilisez force=true pour envoyer sans signature.",
        )

    # Marquer l'envoi forcé sans signature (do this BEFORE checking Resend)
    if not has_signature and force:
        await db.reparations.update_one(
            {"id": reparation_id},
            {"$set": {"envoye_sans_signature": True, "date_modification": datetime.now(timezone.utc).isoformat()}},
        )
        rep["envoye_sans_signature"] = True

    # Now check Resend configuration
    if not resend.api_key:
        raise HTTPException(status_code=500, detail="Service email non configuré")

    frontend_url = os.environ.get('FRONTEND_URL', 'https://fiche-repair.preview.emergentagent.com')
    tracking_url = f"{frontend_url}/suivi/{rep.get('tracking_id', '')}"
    
    pdf_content = generate_client_pdf(rep, client, tracking_url)
    pdf_base64 = base64.b64encode(pdf_content).decode('utf-8')
    filename = sanitize_filename(f"Reparation_n{rep['numero']}.pdf")
    
    html_content = f"""
    <html>
    <body style="font-family: Arial, sans-serif; color: #333;">
        <p>Bonjour {client.get('prenom', '')} {client.get('nom', '')},</p>
        <p>Veuillez trouver en pièce jointe votre fiche de réparation n°{rep['numero']}.</p>
        <p>Vous pouvez suivre l'avancement de votre réparation en ligne :</p>
        <p><a href="{tracking_url}" style="color: #84CC16; font-weight: bold;">{tracking_url}</a></p>
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
        "attachments": [{"filename": filename, "content": pdf_base64}]
    }
    
    try:
        email = await asyncio.to_thread(resend.Emails.send, params)
        return {"status": "success", "message": f"Email envoyé à {client['email']}", "email_id": email.get("id")}
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de l'envoi: {str(e)}")

# ===================== COMMANDES CRUD =====================

@api_router.get("/commandes/statuts")
async def get_statuts_commande():
    """Get available order statuses"""
    return {"statuts": STATUTS_COMMANDE}

@api_router.post("/commandes", response_model=Commande)
async def create_commande(commande: CommandeCreate):
    """Create a new order"""
    client = await db.clients.find_one({"id": commande.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client non trouvé")
    
    now = datetime.now(timezone.utc).isoformat()
    numero = await get_next_commande_number()
    
    montant_total = None
    if commande.prix_vente and commande.quantite:
        montant_total = commande.prix_vente * commande.quantite
    
    cmd_doc = {
        "id": str(uuid.uuid4()),
        "numero": numero,
        "client_id": commande.client_id,
        "reference_produit": commande.reference_produit,
        "designation": commande.designation,
        "fournisseur": commande.fournisseur,
        "quantite": commande.quantite,
        "prix_achat": commande.prix_achat,
        "prix_vente": commande.prix_vente,
        "montant_total": montant_total,
        "statut": commande.statut,
        "remarques": commande.remarques,
        "date_creation": now,
        "date_modification": now
    }
    
    await db.commandes.insert_one(cmd_doc)
    cmd_doc.pop("_id", None)
    
    cmd_doc["client_nom"] = client.get("nom")
    cmd_doc["client_prenom"] = client.get("prenom")
    cmd_doc["client_telephone"] = client.get("telephone")
    
    return cmd_doc

@api_router.get("/commandes", response_model=List[Commande])
async def get_commandes(
    search: Optional[str] = Query(None),
    statut: Optional[str] = Query(None),
    limit: int = Query(100, le=500)
):
    """Get all orders with optional filters"""
    query = {}
    if statut:
        query["statut"] = statut
    
    commandes = await db.commandes.find(query, {"_id": 0}).sort("date_creation", -1).to_list(limit)
    
    for cmd in commandes:
        client = await db.clients.find_one({"id": cmd["client_id"]}, {"_id": 0})
        if client:
            cmd["client_nom"] = client.get("nom")
            cmd["client_prenom"] = client.get("prenom")
            cmd["client_telephone"] = client.get("telephone")
    
    if search:
        search_normalized = unidecode(search.lower())
        filtered = []
        for cmd in commandes:
            client_name = f"{cmd.get('client_prenom', '')} {cmd.get('client_nom', '')}".lower()
            client_name_normalized = unidecode(client_name)
            numero = cmd.get("numero", "").lower()
            designation = unidecode(cmd.get("designation", "").lower())
            
            if (search_normalized in client_name_normalized or
                search_normalized in numero or
                search_normalized in designation):
                filtered.append(cmd)
        return filtered
    
    return commandes

@api_router.get("/commandes/{commande_id}", response_model=Commande)
async def get_commande(commande_id: str):
    """Get a specific order"""
    cmd = await db.commandes.find_one({"id": commande_id}, {"_id": 0})
    if not cmd:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    client = await db.clients.find_one({"id": cmd["client_id"]}, {"_id": 0})
    if client:
        cmd["client_nom"] = client.get("nom")
        cmd["client_prenom"] = client.get("prenom")
        cmd["client_telephone"] = client.get("telephone")
    
    return cmd

@api_router.put("/commandes/{commande_id}", response_model=Commande)
async def update_commande(commande_id: str, update: CommandeUpdate):
    """Update an order"""
    existing = await db.commandes.find_one({"id": commande_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    update_data["date_modification"] = datetime.now(timezone.utc).isoformat()
    
    # Recalculate total
    prix_vente = update_data.get("prix_vente", existing.get("prix_vente"))
    quantite = update_data.get("quantite", existing.get("quantite"))
    if prix_vente and quantite:
        update_data["montant_total"] = prix_vente * quantite
    
    await db.commandes.update_one({"id": commande_id}, {"$set": update_data})
    
    updated = await db.commandes.find_one({"id": commande_id}, {"_id": 0})
    
    client = await db.clients.find_one({"id": updated["client_id"]}, {"_id": 0})
    if client:
        updated["client_nom"] = client.get("nom")
        updated["client_prenom"] = client.get("prenom")
        updated["client_telephone"] = client.get("telephone")
    
    return updated

@api_router.delete("/commandes/{commande_id}")
async def delete_commande(commande_id: str):
    """Delete an order"""
    result = await db.commandes.delete_one({"id": commande_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Commande non trouvée")
    return {"message": "Commande supprimée"}

@api_router.delete("/commandes/purge/completed")
async def purge_completed_commandes():
    """Delete all completed orders (Livré/Récupéré, Réglé)"""
    result = await db.commandes.delete_many({
        "statut": {"$in": ["Livré/Récupéré", "Réglé"]}
    })
    return {"message": f"{result.deleted_count} commandes supprimées"}

# ===================== ENCAISSEMENT =====================

@api_router.get("/encaissements/types")
async def get_types_recette():
    """Get available receipt types"""
    return {"types": TYPES_RECETTE}

@api_router.post("/encaissements", response_model=Encaissement)
async def create_encaissement(encaissement: EncaissementCreate):
    """Create a new receipt entry with multiple payment methods"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Calculate HT if not provided (assuming 20% TVA)
    montant_ht = encaissement.montant_ht
    if not montant_ht:
        montant_ht = round(encaissement.montant_ttc / 1.2, 2)
    
    entry_doc = {
        "id": str(uuid.uuid4()),
        "type_recette": encaissement.type_recette,
        "montant_ttc": encaissement.montant_ttc,
        "montant_ht": montant_ht,
        "paiements": [p.model_dump() for p in encaissement.paiements],
        "client_id": encaissement.client_id,
        "reference": encaissement.reference,
        "remarque": encaissement.remarque,
        "date": now
    }
    
    await db.encaissements.insert_one(entry_doc)
    entry_doc.pop("_id", None)
    
    if encaissement.client_id:
        client = await db.clients.find_one({"id": encaissement.client_id}, {"_id": 0})
        if client:
            entry_doc["client_nom"] = client.get("nom")
            entry_doc["client_prenom"] = client.get("prenom")
    
    return entry_doc

@api_router.get("/encaissements")
async def get_encaissements(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    limit: int = Query(100, le=500)
):
    """Get receipt entries"""
    query = {}
    if date_from or date_to:
        date_query = {}
        if date_from:
            date_query["$gte"] = date_from
        if date_to:
            date_query["$lte"] = date_to + "T23:59:59"
        if date_query:
            query["date"] = date_query
    
    entries = await db.encaissements.find(query, {"_id": 0}).sort("date", -1).to_list(limit)
    
    for entry in entries:
        # Migration for old entries
        if "montant" in entry and "montant_ttc" not in entry:
            entry["montant_ttc"] = entry["montant"]
            entry["montant_ht"] = round(entry["montant"] / 1.2, 2)
        if "mode_paiement" in entry and "paiements" not in entry:
            entry["paiements"] = [{"mode": entry["mode_paiement"], "montant": entry.get("montant_ttc", entry.get("montant", 0))}]
        
        if entry.get("client_id"):
            client = await db.clients.find_one({"id": entry["client_id"]}, {"_id": 0})
            if client:
                entry["client_nom"] = client.get("nom")
                entry["client_prenom"] = client.get("prenom")
    
    return entries

@api_router.delete("/encaissements/{entry_id}")
async def delete_encaissement(entry_id: str):
    """Delete a receipt entry"""
    result = await db.encaissements.delete_one({"id": entry_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entrée non trouvée")
    return {"message": "Entrée supprimée"}

# ===================== CAISSE (JOURNAL COMPLET) =====================

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
        "client_id": entry.client_id,
        "date": now
    }
    
    await db.caisse.insert_one(entry_doc)
    entry_doc.pop("_id", None)
    return entry_doc

@api_router.get("/caisse", response_model=List[CaisseEntry])
async def get_caisse_entries(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    limit: int = Query(500, le=2000)
):
    """Get cash register entries — unified view (caisse + encaissements)"""
    query = {}
    if date_from or date_to:
        date_query = {}
        if date_from:
            date_query["$gte"] = date_from
        if date_to:
            date_query["$lte"] = date_to + "T23:59:59"
        if date_query:
            query["date"] = date_query

    # Manual caisse entries
    entries = await db.caisse.find(query, {"_id": 0}).to_list(limit)

    # Also include encaissements (recettes quotidiennes) comme entrées de caisse automatiques
    encaissements = await db.encaissements.find(query, {"_id": 0}).to_list(limit)

    type_labels = {
        "forfait_63": "Forfait réparation 63€",
        "rapide_30": "Réparation rapide 30€",
        "express_10": "Réparation express 10€",
        "devis_15": "Devis 15€",
        "ventes": "Ventes",
        "autre": "Autre recette",
    }

    for enc in encaissements:
        total_ttc = enc.get("montant_ttc", enc.get("montant", 0)) or 0
        paiements = enc.get("paiements") or ([{"mode": enc.get("mode_paiement"), "montant": total_ttc}] if enc.get("mode_paiement") else [])
        # Créer une ligne caisse par mode de paiement (vue unifiée)
        type_label = type_labels.get(enc.get("type_recette"), enc.get("type_recette", "Recette"))
        remarque = enc.get("remarque") or ""
        description_base = f"{type_label}" + (f" — {remarque}" if remarque else "")
        if paiements:
            for p in paiements:
                entries.append({
                    "id": f"enc-{enc['id']}-{p.get('mode','')}",
                    "type": "entree",
                    "montant": float(p.get("montant") or 0),
                    "description": description_base,
                    "mode_paiement": p.get("mode"),
                    "reparation_id": None,
                    "client_id": enc.get("client_id"),
                    "date": enc.get("date"),
                })
        else:
            entries.append({
                "id": f"enc-{enc['id']}",
                "type": "entree",
                "montant": float(total_ttc),
                "description": description_base,
                "mode_paiement": None,
                "reparation_id": None,
                "client_id": enc.get("client_id"),
                "date": enc.get("date"),
            })

    # Tri décroissant par date
    entries.sort(key=lambda e: e.get("date") or "", reverse=True)
    return entries[:limit]

@api_router.delete("/caisse/{entry_id}")
async def delete_caisse_entry(entry_id: str):
    """Delete a cash register entry (or underlying encaissement if id starts with 'enc-')"""
    if entry_id.startswith("enc-"):
        # id format: enc-{encaissement_id} ou enc-{encaissement_id}-{mode}
        parts = entry_id.split("-")
        # UUID4 has 5 parts separated by '-', so we rebuild it
        if len(parts) >= 6:
            enc_id = "-".join(parts[1:6])
        else:
            enc_id = "-".join(parts[1:])
        result = await db.encaissements.delete_one({"id": enc_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Encaissement non trouvé")
        return {"message": "Encaissement supprimé"}

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
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Réparations"
    
    header_fill = PatternFill(start_color="84CC16", end_color="84CC16", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF")
    thin_border = Border(
        left=Side(style='thin'), right=Side(style='thin'),
        top=Side(style='thin'), bottom=Side(style='thin')
    )
    
    headers = ["N°", "Date", "Client", "Téléphone", "Matériel", "Description", "Diagnostic", "Action", "Prix", "Statut", "Urgence"]
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.fill = header_fill
        cell.font = header_font
        cell.border = thin_border
        cell.alignment = Alignment(horizontal='center')
    
    for row_idx, rep in enumerate(reparations, 2):
        client = await db.clients.find_one({"id": rep["client_id"]}, {"_id": 0})
        client_name = f"{client.get('prenom', '')} {client.get('nom', '')}" if client else "-"
        client_phone = client.get("telephone", "-") if client else "-"
        materiel_list = get_materiel_fourni_list(rep.get('materiel_fourni', {}), rep.get('autre_materiel'))
        
        data = [
            rep.get("numero", ""),
            rep.get("date_creation", "")[:10],
            client_name,
            client_phone,
            ", ".join(materiel_list),
            rep.get("description_panne", ""),
            rep.get("diagnostic", "") or "",
            rep.get("action_realisee", "") or "",
            rep.get("prix", "") or "",
            rep.get("statut", ""),
            "Oui" if rep.get("urgence") else "Non"
        ]
        
        for col, value in enumerate(data, 1):
            cell = ws.cell(row=row_idx, column=col, value=value)
            cell.border = thin_border
    
    for col in ws.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        ws.column_dimensions[column].width = min(max_length + 2, 50)
    
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
    date_to: Optional[str] = Query(None),
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None),
    include_empty_months: bool = Query(True, description="Create a tab for every month between first and last entry, even empty ones"),
):
    """
    Export Journal de caisse Excel — UN SEUL FICHIER avec UN ONGLET PAR MOIS.
    Structure identique au modèle DCLIC : colonnes A-S, formules Excel actives
    (TOTAL CA, SOLDE CAISSE, report M-1, TOTAL MOIS, HT/TVA) + onglet TOTAUX.
    """
    # ---------- 1. Récupération des données ----------
    query = {}
    if date_from or date_to:
        d = {}
        if date_from:
            d["$gte"] = date_from
        if date_to:
            d["$lte"] = date_to + "T23:59:59"
        query["date"] = d
    elif year and month:
        start = f"{year}-{month:02d}-01"
        end = f"{year+1}-01-01" if month == 12 else f"{year}-{month+1:02d}-01"
        query["date"] = {"$gte": start, "$lt": end}

    caisse_entries = await db.caisse.find(query, {"_id": 0}).sort("date", 1).to_list(10000)
    encaissement_entries = await db.encaissements.find(query, {"_id": 0}).sort("date", 1).to_list(10000)

    TYPE_LABELS = {
        "forfait_63": "Forfait réparation 63€",
        "rapide_30": "Réparation rapide 30€",
        "express_10": "Réparation express 10€",
        "devis_15": "Devis 15€",
        "ventes": "Ventes",
        "autre": "Autre recette",
    }

    # ---------- 2. Agrégation par (mois -> date -> totaux) ----------
    # {month_key: {date_str: {especes, cheques, cb, virement, depenses, remarques, reglement, numero, nom}}}
    months_data: Dict[str, Dict[str, Dict[str, Any]]] = {}

    def ensure_day(month_key: str, d: str):
        months_data.setdefault(month_key, {})
        months_data[month_key].setdefault(d, {
            "especes": 0.0, "cheques": 0.0, "cb": 0.0, "virement": 0.0,
            "depenses": 0.0, "remarques": [], "reglement": [],
            "numero": [], "nom": [],
        })
        return months_data[month_key][d]

    for e in caisse_entries:
        date_iso = e.get("date", "")
        if not date_iso:
            continue
        mk = date_iso[:7]
        d = date_iso[:10]
        row = ensure_day(mk, d)
        amount = float(e.get("montant") or 0)
        mode = (e.get("mode_paiement") or "").lower()
        if e.get("type") == "entree":
            if mode == "especes":
                row["especes"] += amount
            elif mode == "cheque":
                row["cheques"] += amount
            elif mode == "cb":
                row["cb"] += amount
            elif mode == "virement":
                row["virement"] += amount
        else:  # sortie
            row["depenses"] += amount
        if e.get("description"):
            row["remarques"].append(e["description"])

    for enc in encaissement_entries:
        date_iso = enc.get("date", "")
        if not date_iso:
            continue
        mk = date_iso[:7]
        d = date_iso[:10]
        row = ensure_day(mk, d)
        paiements = enc.get("paiements")
        total_ttc = float(enc.get("montant_ttc", enc.get("montant", 0)) or 0)
        if isinstance(paiements, list) and paiements:
            for p in paiements:
                mode = (p.get("mode") or "").lower()
                montant = float(p.get("montant") or 0)
                if mode == "especes":
                    row["especes"] += montant
                elif mode == "cheque":
                    row["cheques"] += montant
                elif mode == "cb":
                    row["cb"] += montant
                elif mode == "virement":
                    row["virement"] += montant
        else:
            mode = (enc.get("mode_paiement") or "").lower()
            if mode == "especes":
                row["especes"] += total_ttc
            elif mode == "cheque":
                row["cheques"] += total_ttc
            elif mode == "cb":
                row["cb"] += total_ttc
            elif mode == "virement":
                row["virement"] += total_ttc
        # Libellé : type + remarque
        label = TYPE_LABELS.get(enc.get("type_recette"), enc.get("type_recette") or "Recette")
        if enc.get("remarque"):
            label = f"{label} — {enc['remarque']}"
        row["remarques"].append(label)
        if enc.get("reference"):
            row["numero"].append(enc["reference"])
        if enc.get("client_prenom") or enc.get("client_nom"):
            row["nom"].append(f"{enc.get('client_prenom','')} {enc.get('client_nom','')}".strip())

    # ---------- 3. Si include_empty_months : créer une clé vide pour chaque mois entre min et max ----------
    if months_data and include_empty_months:
        from calendar import monthrange
        keys = sorted(months_data.keys())
        y, m = map(int, keys[0].split("-"))
        y2, m2 = map(int, keys[-1].split("-"))
        while (y, m) <= (y2, m2):
            months_data.setdefault(f"{y}-{m:02d}", {})
            m += 1
            if m > 12:
                m = 1
                y += 1

    # ---------- 4. Création du classeur ----------
    wb = Workbook()
    wb.remove(wb.active)  # on crée tous les onglets manuellement

    MONTH_ABBR = {
        1: "Jan", 2: "Fév", 3: "Mars", 4: "Avril", 5: "Mai", 6: "Juin",
        7: "Juillet", 8: "Aout", 9: "Sept", 10: "Oct", 11: "Nov", 12: "Déc",
    }

    def sheet_name_for(month_key: str) -> str:
        y, m = map(int, month_key.split("-"))
        return f"{MONTH_ABBR[m]} {str(y)[-2:]}"

    header_fill = PatternFill(start_color="84CC16", end_color="84CC16", fill_type="solid")
    header_font = Font(bold=True, color="FFFFFF", size=10)
    sub_font = Font(italic=True, size=9, color="475569")
    bold_font = Font(bold=True, size=10)
    thin = Side(style="thin", color="CBD5E1")
    border = Border(left=thin, right=thin, top=thin, bottom=thin)
    center = Alignment(horizontal="center", vertical="center", wrap_text=True)

    # Colonnes de la feuille (A..S)
    HEADERS_ROW1 = [
        "DATE", "ESPECES", "CHEQUES", "CB", "PNF", "TOTAL CA",
        "ENCAISSEM", "DEPENSES", "SOLDE CAISSE",
        "CLIENTS FACTURéS", "",  # J:K fusionnées
        "TOTAL ", "TOTAL",        # L:M fusionnées
        "REMARQUES", "REGLEMENT", "NUMERO", "NOM\nFACTURE",
        "GoCardLess\nmontant net", "Frais de\ncommission",
    ]
    HEADERS_ROW2 = [
        "REPORT M-1", "", "", "", "", "",
        "clients", "fourniss", "",     # I2 sera rempli par formule
        "chèques", "CB",
        "REM CHQ", "REM CB",
        "", "VIREMENT", "FACTURE", "",
        "", "",
    ]
    COL_WIDTHS = {
        "A": 12, "B": 10, "C": 10, "D": 10, "E": 8, "F": 12,
        "G": 12, "H": 12, "I": 14,
        "J": 10, "K": 10, "L": 10, "M": 10,
        "N": 24, "O": 12, "P": 12, "Q": 20, "R": 12, "S": 12,
    }

    ordered_month_keys = sorted(months_data.keys())
    month_totals_by_sheet: List[Tuple[str, str, int]] = []  # [(month_key, sheet_name, total_mois_row_idx)]

    for idx, month_key in enumerate(ordered_month_keys):
        sname = sheet_name_for(month_key)[:31]
        ws = wb.create_sheet(title=sname)

        # Row 1 headers
        for col_i, h in enumerate(HEADERS_ROW1, start=1):
            c = ws.cell(row=1, column=col_i, value=h)
            c.fill = header_fill
            c.font = header_font
            c.alignment = center
            c.border = border
        # Fusions ligne 1
        ws.merge_cells("J1:K1")
        ws.merge_cells("L1:M1")

        # Row 2 sub-headers
        for col_i, h in enumerate(HEADERS_ROW2, start=1):
            c = ws.cell(row=2, column=col_i, value=h)
            c.font = sub_font
            c.alignment = center
            c.border = border
        # I2 = report du solde caisse du mois précédent
        if idx == 0:
            ws.cell(row=2, column=9, value=0)
        else:
            prev_month_key, prev_sname, prev_total_row = month_totals_by_sheet[idx - 1]
            ws.cell(row=2, column=9, value=f"='{prev_sname}'!I{prev_total_row}")

        # Rows 3.. : une ligne par jour trié
        days = sorted(months_data[month_key].keys())
        last_data_row = 2
        for i, d in enumerate(days):
            r = 3 + i
            day = months_data[month_key][d]
            # A: DATE
            try:
                ws.cell(row=r, column=1, value=datetime.fromisoformat(d)).number_format = "DD/MM/YYYY"
            except Exception:
                ws.cell(row=r, column=1, value=d)
            # B/C/D: ESPECES/CHEQUES/CB
            if day["especes"]:
                ws.cell(row=r, column=2, value=round(day["especes"], 2))
            if day["cheques"]:
                ws.cell(row=r, column=3, value=round(day["cheques"], 2))
            if day["cb"]:
                ws.cell(row=r, column=4, value=round(day["cb"], 2))
            # F: TOTAL CA = SUM(B:D)
            ws.cell(row=r, column=6, value=f"=SUM(B{r}:D{r})")
            # H: DEPENSES
            if day["depenses"]:
                ws.cell(row=r, column=8, value=round(day["depenses"], 2))
            # I: SOLDE CAISSE = I_prev + B + G - H
            ws.cell(row=r, column=9, value=f"=I{r-1}+B{r}+G{r}-H{r}")
            # L: REM CHQ = C + J  ; M: REM CB = D + K
            ws.cell(row=r, column=12, value=f"=C{r}+J{r}")
            ws.cell(row=r, column=13, value=f"=D{r}+K{r}")
            # N: REMARQUES
            if day["remarques"]:
                ws.cell(row=r, column=14, value=" | ".join(day["remarques"])[:250])
            # O: REGLEMENT (virements)
            if day["virement"]:
                ws.cell(row=r, column=15, value=round(day["virement"], 2))
            # P: NUMERO
            if day["numero"]:
                ws.cell(row=r, column=16, value=", ".join(day["numero"]))
            # Q: NOM
            if day["nom"]:
                ws.cell(row=r, column=17, value=", ".join(day["nom"]))
            last_data_row = r

        # Ligne TOTAL MOIS
        total_row = max(last_data_row + 1, 3)
        ws.cell(row=total_row, column=1, value="TOTAL MOIS").font = bold_font
        for col_letter, col_i in [("B", 2), ("C", 3), ("D", 4), ("E", 5), ("F", 6),
                                   ("G", 7), ("H", 8), ("J", 10), ("K", 11),
                                   ("L", 12), ("M", 13), ("O", 15), ("R", 18), ("S", 19)]:
            if last_data_row >= 3:
                cell = ws.cell(row=total_row, column=col_i,
                               value=f"=SUM({col_letter}3:{col_letter}{last_data_row})")
                cell.font = bold_font
        # I TOTAL MOIS = solde caisse final
        if last_data_row >= 3:
            ws.cell(row=total_row, column=9, value=f"=I{last_data_row}").font = bold_font
        else:
            ws.cell(row=total_row, column=9, value=f"=I2").font = bold_font

        # Ligne HT / TVA
        ht_row = total_row + 2
        tva_row = total_row + 3
        ws.cell(row=ht_row, column=5, value="HT").font = bold_font
        ws.cell(row=ht_row, column=6, value=f"=F{total_row}/1.2")
        ws.cell(row=tva_row, column=5, value="TVA").font = bold_font
        ws.cell(row=tva_row, column=6, value=f"=F{ht_row}*0.2")

        # Largeurs colonnes
        for col_letter, w in COL_WIDTHS.items():
            ws.column_dimensions[col_letter].width = w
        ws.row_dimensions[1].height = 28
        ws.row_dimensions[2].height = 18
        ws.freeze_panes = "A3"

        month_totals_by_sheet.append((month_key, sname, total_row))

    # ---------- 5. Onglet TOTAUX ----------
    ws = wb.create_sheet(title="TOTAUX")
    ws.cell(row=1, column=5, value=f"SOMME PERIODE").font = bold_font

    tot_headers = ["MOIS", "ESPECES", "CHEQUES", "CB", "PNF", "TOTAL CA",
                   "ENCAISSEM", "DEPENSES", "SOLDE CAISSE", "CHQ+REM", "CB+REM"]
    for col_i, h in enumerate(tot_headers, start=1):
        c = ws.cell(row=3, column=col_i, value=h)
        c.fill = header_fill
        c.font = header_font
        c.alignment = center
        c.border = border

    for i, (month_key, sname, total_row) in enumerate(month_totals_by_sheet):
        r = 5 + i
        y, m = map(int, month_key.split("-"))
        ws.cell(row=r, column=1, value=f"{MONTH_ABBR[m]} {y}")
        for col_i, col_letter in enumerate(["B", "C", "D", "E", "F", "G", "H", "I", "L", "M"], start=2):
            ws.cell(row=r, column=col_i, value=f"='{sname}'!{col_letter}{total_row}")

    # Ligne TOTAUX globale
    if month_totals_by_sheet:
        last = 5 + len(month_totals_by_sheet) - 1
        tot_row = last + 2
        ws.cell(row=tot_row, column=1, value="TOTAUX :").font = bold_font
        for col_i in range(2, 12):
            letter = openpyxl.utils.get_column_letter(col_i)
            ws.cell(row=tot_row, column=col_i, value=f"=SUM({letter}5:{letter}{last})").font = bold_font

        # TOTAL CA global
        ws.cell(row=tot_row + 2, column=5, value="TOTAL CA :").font = bold_font
        ws.cell(row=tot_row + 2, column=6, value=f"=F{tot_row}+I{tot_row}+J{tot_row}+L{tot_row}").font = bold_font

    for col_letter, w in {"A": 12, "B": 11, "C": 11, "D": 11, "E": 10, "F": 12,
                          "G": 12, "H": 12, "I": 14, "J": 12, "K": 12}.items():
        ws.column_dimensions[col_letter].width = w

    # Pas de données -> on crée quand même un onglet courant
    if not ordered_month_keys:
        now = datetime.now()
        sname = f"{MONTH_ABBR[now.month]} {str(now.year)[-2:]}"
        wb.remove(ws)
        ws2 = wb.create_sheet(title=sname)
        for col_i, h in enumerate(HEADERS_ROW1, start=1):
            c = ws2.cell(row=1, column=col_i, value=h)
            c.fill = header_fill
            c.font = header_font
            c.alignment = center
        ws2.merge_cells("J1:K1")
        ws2.merge_cells("L1:M1")
        for col_letter, w in COL_WIDTHS.items():
            ws2.column_dimensions[col_letter].width = w
        wb.create_sheet(title="TOTAUX")

    # ---------- 6. Sortie ----------
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    filename = f"journal_caisse_{datetime.now().strftime('%Y%m%d')}.xlsx"
    return Response(
        content=buffer.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

# Include the router
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
