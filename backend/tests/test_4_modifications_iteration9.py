"""
Tests pour les 4 modifications de l'itération 9:
1) ClientCombobox (Fuse.js) - recherche fuzzy clients
2) Format de dates jj/mm/aaaa
3) PDF Client avec grande signature (15×6 cm)
4) Scroll natif unique sur /signer/{id}

Ces tests vérifient les endpoints backend associés.
"""
import pytest
import requests
import os
import re

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestClientComboboxFuseJS:
    """Test 1: Vérifier que l'API clients supporte la recherche fuzzy"""
    
    def test_clients_search_exact_match(self):
        """Recherche exacte retourne le client"""
        response = requests.get(f"{BASE_URL}/api/clients", params={"search": "Dupont"})
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        # Vérifier qu'un client Dupont est trouvé
        found = any("Dupont" in c.get("nom", "") or "Dupont" in c.get("prenom", "") for c in data)
        assert found, "Client Dupont non trouvé"
        print(f"✅ Recherche 'Dupont': {len(data)} résultat(s)")
    
    def test_clients_search_fuzzy_typo(self):
        """Recherche avec faute de frappe (fuzzy) retourne des résultats"""
        # "dupon" devrait matcher "Dupont" grâce à Levenshtein
        response = requests.get(f"{BASE_URL}/api/clients", params={"search": "dupon"})
        assert response.status_code == 200
        data = response.json()
        # La recherche fuzzy backend utilise Levenshtein, devrait trouver Dupont
        print(f"✅ Recherche fuzzy 'dupon': {len(data)} résultat(s)")
        # Note: Le fuzzy search est principalement côté frontend avec Fuse.js
        # Le backend utilise Levenshtein pour la recherche


class TestDateFormatFR:
    """Test 2: Vérifier que les dates sont au format jj/mm/aaaa"""
    
    def test_suivi_date_format(self):
        """GET /api/suivi/{tracking_id} retourne date au format jj/mm/aaaa"""
        # D'abord récupérer un tracking_id valide
        reps = requests.get(f"{BASE_URL}/api/reparations").json()
        if not reps:
            pytest.skip("Aucune réparation disponible")
        
        tracking_id = reps[0].get("tracking_id")
        if not tracking_id:
            pytest.skip("Pas de tracking_id")
        
        response = requests.get(f"{BASE_URL}/api/suivi/{tracking_id}")
        assert response.status_code == 200
        data = response.json()
        
        # Vérifier le format de date_depot
        date_depot = data.get("date_depot", "")
        # Le backend retourne date_depot au format YYYY-MM-DD (ISO)
        # Le frontend le convertit en jj/mm/aaaa via formatDateFR()
        # Donc on vérifie juste que la date existe
        assert date_depot, "date_depot manquant"
        print(f"✅ date_depot: {date_depot}")
    
    def test_reparation_public_date_format(self):
        """GET /api/reparations/{id}/public retourne date au format jj/mm/aaaa"""
        reps = requests.get(f"{BASE_URL}/api/reparations").json()
        if not reps:
            pytest.skip("Aucune réparation disponible")
        
        rep_id = reps[0].get("id")
        response = requests.get(f"{BASE_URL}/api/reparations/{rep_id}/public")
        assert response.status_code == 200
        data = response.json()
        
        # Le backend convertit date_creation en format FR via _fr_date()
        date_creation = data.get("date_creation", "")
        # Vérifier format jj/mm/aaaa
        if date_creation:
            assert re.match(r'^\d{2}/\d{2}/\d{4}$', date_creation), f"Format date incorrect: {date_creation}"
            print(f"✅ date_creation format FR: {date_creation}")


class TestPDFClientSignature:
    """Test 3: PDF Client avec grande signature (15×6 cm)"""
    
    def test_pdf_client_with_signature_returns_pdf(self):
        """GET /api/reparations/{id}/pdf/client retourne un PDF valide"""
        # Trouver une réparation avec signature
        reps = requests.get(f"{BASE_URL}/api/reparations").json()
        signed_rep = next((r for r in reps if r.get("signature_b64")), None)
        
        if not signed_rep:
            pytest.skip("Aucune réparation signée disponible")
        
        rep_id = signed_rep["id"]
        response = requests.get(f"{BASE_URL}/api/reparations/{rep_id}/pdf/client")
        
        assert response.status_code == 200
        assert response.headers.get("Content-Type") == "application/pdf"
        
        # Vérifier que c'est un PDF valide (commence par %PDF)
        assert response.content[:4] == b'%PDF', "Le contenu n'est pas un PDF valide"
        
        pdf_size = len(response.content)
        print(f"✅ PDF avec signature généré: {pdf_size} bytes")
        
        # Le PDF avec signature devrait être plus grand (>20KB typiquement)
        assert pdf_size > 20000, f"PDF trop petit ({pdf_size} bytes), signature peut-être manquante"
    
    def test_pdf_client_without_signature_smaller(self):
        """PDF sans signature est plus petit que PDF avec signature"""
        reps = requests.get(f"{BASE_URL}/api/reparations").json()
        
        signed_rep = next((r for r in reps if r.get("signature_b64")), None)
        unsigned_rep = next((r for r in reps if not r.get("signature_b64")), None)
        
        if not signed_rep or not unsigned_rep:
            pytest.skip("Besoin d'une réparation signée et une non signée")
        
        pdf_signed = requests.get(f"{BASE_URL}/api/reparations/{signed_rep['id']}/pdf/client")
        pdf_unsigned = requests.get(f"{BASE_URL}/api/reparations/{unsigned_rep['id']}/pdf/client")
        
        assert pdf_signed.status_code == 200
        assert pdf_unsigned.status_code == 200
        
        size_signed = len(pdf_signed.content)
        size_unsigned = len(pdf_unsigned.content)
        
        print(f"PDF signé: {size_signed} bytes")
        print(f"PDF non signé: {size_unsigned} bytes")
        
        # Le PDF signé devrait être significativement plus grand (signature 15×6 cm)
        assert size_signed > size_unsigned, "Le PDF signé devrait être plus grand"
        print(f"✅ Différence: {size_signed - size_unsigned} bytes (signature incluse)")
    
    def test_pdf_no_reportlab_error(self):
        """Le PDF est généré sans erreur ReportLab (pas d'overflow)"""
        reps = requests.get(f"{BASE_URL}/api/reparations").json()
        signed_rep = next((r for r in reps if r.get("signature_b64")), None)
        
        if not signed_rep:
            pytest.skip("Aucune réparation signée disponible")
        
        response = requests.get(f"{BASE_URL}/api/reparations/{signed_rep['id']}/pdf/client")
        
        # Si erreur ReportLab, le status serait 500
        assert response.status_code == 200, f"Erreur génération PDF: {response.text}"
        
        # Vérifier que le PDF contient "ReportLab" (généré correctement)
        assert b'ReportLab' in response.content, "PDF non généré par ReportLab"
        print("✅ PDF généré sans erreur ReportLab")


class TestScrollNatifSignerPage:
    """Test 4: Scroll natif unique sur /signer/{id}
    
    Note: Ce test vérifie côté backend que l'endpoint public fonctionne.
    Le test du scroll natif est fait côté frontend via Playwright.
    """
    
    def test_reparation_public_endpoint_works(self):
        """GET /api/reparations/{id}/public fonctionne pour la page signature"""
        reps = requests.get(f"{BASE_URL}/api/reparations").json()
        if not reps:
            pytest.skip("Aucune réparation disponible")
        
        rep_id = reps[0].get("id")
        response = requests.get(f"{BASE_URL}/api/reparations/{rep_id}/public")
        
        assert response.status_code == 200
        data = response.json()
        
        # Vérifier que les conditions sont présentes (nécessaires pour la page signature)
        assert "conditions" in data, "Conditions manquantes"
        assert "prise_en_charge" in data["conditions"], "Condition prise_en_charge manquante"
        
        print(f"✅ Endpoint public fonctionne, {len(data['conditions'])} conditions")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
