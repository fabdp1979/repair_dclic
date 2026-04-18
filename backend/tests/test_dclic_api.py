"""
DCLIC Informatique API Tests - Iteration 3
Tests for: clients, reparations, encaissements, commandes, PDFs, tracking, exports
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def test_client_data(api_client):
    """Create a test client and return its data"""
    client_payload = {
        "nom": "TEST_Dupont",
        "prenom": "Jean",
        "telephone": "0612345678",
        "telephone2": "0698765432",
        "email": "test.dupont@example.com",
        "adresse": "123 Rue Test, 75001 Paris"
    }
    response = api_client.post(f"{BASE_URL}/api/clients", json=client_payload)
    assert response.status_code == 200, f"Failed to create test client: {response.text}"
    return response.json()

@pytest.fixture(scope="module")
def test_reparation_data(api_client, test_client_data):
    """Create a test reparation and return its data"""
    rep_payload = {
        "client_id": test_client_data["id"],
        "materiel_fourni": {"pc_portable": True, "chargeur_pc": True},
        "autre_materiel": "Sacoche noire",
        "urgence": True,
        "mot_de_passe": "secret123",
        "description_panne": "Écran noir au démarrage",
        "observations_client": "Problème depuis 2 jours",
        "statut": "Réparation enregistrée",
        "statut_interne": "En cours"
    }
    response = api_client.post(f"{BASE_URL}/api/reparations", json=rep_payload)
    assert response.status_code == 200, f"Failed to create test reparation: {response.text}"
    return response.json()


class TestHealthAndRoot:
    """Basic API health checks"""
    
    def test_api_root(self, api_client):
        """Test API root endpoint"""
        response = api_client.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "DCLIC" in data["message"]
        print("✓ API root endpoint working")


class TestClients:
    """Client CRUD tests with telephone2 field"""
    
    def test_create_client_with_telephone2(self, api_client):
        """Test creating client with telephone2 field"""
        payload = {
            "nom": "TEST_Martin",
            "prenom": "Pierre",
            "telephone": "0611111111",
            "telephone2": "0622222222",
            "email": "pierre.martin@test.com"
        }
        response = api_client.post(f"{BASE_URL}/api/clients", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["nom"] == "TEST_Martin"
        assert data["telephone2"] == "0622222222"
        assert "id" in data
        print(f"✓ Client created with telephone2: {data['id']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/clients/{data['id']}")
    
    def test_get_clients_list(self, api_client, test_client_data):
        """Test getting clients list"""
        response = api_client.get(f"{BASE_URL}/api/clients")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} clients")
    
    def test_get_client_by_id(self, api_client, test_client_data):
        """Test getting single client"""
        response = api_client.get(f"{BASE_URL}/api/clients/{test_client_data['id']}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_client_data["id"]
        assert data["telephone2"] == "0698765432"
        print(f"✓ Got client: {data['prenom']} {data['nom']}")
    
    def test_update_client(self, api_client, test_client_data):
        """Test updating client"""
        update_payload = {"telephone2": "0699999999"}
        response = api_client.put(
            f"{BASE_URL}/api/clients/{test_client_data['id']}", 
            json=update_payload
        )
        assert response.status_code == 200
        data = response.json()
        assert data["telephone2"] == "0699999999"
        print("✓ Client updated successfully")


class TestReparations:
    """Reparation CRUD tests with new fields"""
    
    def test_create_reparation_with_new_fields(self, api_client, test_client_data):
        """Test creating reparation with materiel_fourni, urgence, mot_de_passe"""
        payload = {
            "client_id": test_client_data["id"],
            "materiel_fourni": {"pc_fixe": True, "ecran": True, "clavier": True},
            "autre_materiel": "Câble HDMI",
            "urgence": False,
            "mot_de_passe": "admin2024",
            "description_panne": "PC ne démarre plus",
            "observations_client": "Bruit de ventilateur",
            "statut": "Réparation enregistrée",
            "statut_interne": "En cours"
        }
        response = api_client.post(f"{BASE_URL}/api/reparations", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        # Verify all new fields
        assert "numero" in data
        assert data["numero"].startswith("REP-")
        assert "tracking_id" in data
        assert len(data["tracking_id"]) == 8
        assert data["materiel_fourni"]["pc_fixe"] == True
        assert data["urgence"] == False
        assert data["mot_de_passe"] == "admin2024"
        assert data["description_panne"] == "PC ne démarre plus"
        
        print(f"✓ Reparation created: {data['numero']} (tracking: {data['tracking_id']})")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/reparations/{data['id']}")
    
    def test_get_reparations_list(self, api_client, test_reparation_data):
        """Test getting reparations list"""
        response = api_client.get(f"{BASE_URL}/api/reparations")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} reparations")
    
    def test_get_reparation_by_id(self, api_client, test_reparation_data):
        """Test getting single reparation"""
        response = api_client.get(f"{BASE_URL}/api/reparations/{test_reparation_data['id']}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_reparation_data["id"]
        assert data["urgence"] == True
        assert data["mot_de_passe"] == "secret123"
        print(f"✓ Got reparation: {data['numero']}")


class TestPublicTracking:
    """Public tracking endpoint tests"""
    
    def test_public_tracking_returns_safe_data(self, api_client, test_reparation_data):
        """Test that public tracking doesn't expose sensitive data"""
        tracking_id = test_reparation_data["tracking_id"]
        response = api_client.get(f"{BASE_URL}/api/suivi/{tracking_id}")
        assert response.status_code == 200
        data = response.json()
        
        # Should have public fields
        assert "numero" in data
        assert "statut" in data
        assert "client_nom" in data
        assert "date_depot" in data
        
        # Should NOT have sensitive fields
        assert "mot_de_passe" not in data
        assert "client_id" not in data
        assert "diagnostic" not in data
        
        print(f"✓ Public tracking working for {tracking_id} - no sensitive data exposed")
    
    def test_public_tracking_invalid_id(self, api_client):
        """Test tracking with invalid ID returns 404"""
        response = api_client.get(f"{BASE_URL}/api/suivi/INVALID123")
        assert response.status_code == 404
        print("✓ Invalid tracking ID returns 404")


class TestPDFGeneration:
    """PDF generation tests"""
    
    def test_client_pdf_generation(self, api_client, test_reparation_data):
        """Test client PDF generation"""
        response = api_client.get(
            f"{BASE_URL}/api/reparations/{test_reparation_data['id']}/pdf/client"
        )
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 1000  # PDF should have content
        print(f"✓ Client PDF generated ({len(response.content)} bytes)")
    
    def test_internal_pdf_generation(self, api_client, test_reparation_data):
        """Test internal PDF generation (should include password)"""
        response = api_client.get(
            f"{BASE_URL}/api/reparations/{test_reparation_data['id']}/pdf/interne"
        )
        assert response.status_code == 200
        assert response.headers.get("content-type") == "application/pdf"
        assert len(response.content) > 1000
        print(f"✓ Internal PDF generated ({len(response.content)} bytes)")


class TestEncaissements:
    """Encaissement tests with new multi-payment schema"""
    
    def test_get_types_recette(self, api_client):
        """Test getting receipt types"""
        response = api_client.get(f"{BASE_URL}/api/encaissements/types")
        assert response.status_code == 200
        data = response.json()
        assert "types" in data
        
        # Verify expected types exist
        types = data["types"]
        assert "forfait_63" in types
        assert "rapide_30" in types
        assert "express_10" in types
        assert "devis_15" in types
        assert "ventes" in types
        assert "autre" in types
        
        # Verify forfait_63 has correct values
        assert types["forfait_63"]["ttc"] == 63.0
        assert types["forfait_63"]["ht"] == 52.50
        
        print("✓ Receipt types returned correctly")
    
    def test_create_encaissement_single_payment(self, api_client):
        """Test creating encaissement with single payment method"""
        payload = {
            "type_recette": "forfait_63",
            "montant_ttc": 63.0,
            "montant_ht": 52.50,
            "paiements": [{"mode": "cb", "montant": 63.0}],
            "reference": "TEST-001",
            "remarque": "Test encaissement"
        }
        response = api_client.post(f"{BASE_URL}/api/encaissements", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert data["type_recette"] == "forfait_63"
        assert data["montant_ttc"] == 63.0
        assert data["montant_ht"] == 52.50
        assert len(data["paiements"]) == 1
        assert data["paiements"][0]["mode"] == "cb"
        
        print(f"✓ Encaissement created with single payment: {data['id']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/encaissements/{data['id']}")
    
    def test_create_encaissement_multiple_payments(self, api_client):
        """Test creating encaissement with multiple payment methods (CB + Chèque)"""
        payload = {
            "type_recette": "forfait_63",
            "montant_ttc": 63.0,
            "montant_ht": 52.50,
            "paiements": [
                {"mode": "cb", "montant": 30.0},
                {"mode": "cheque", "montant": 33.0}
            ],
            "reference": "TEST-MULTI-001"
        }
        response = api_client.post(f"{BASE_URL}/api/encaissements", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["paiements"]) == 2
        total_paiements = sum(p["montant"] for p in data["paiements"])
        assert total_paiements == 63.0
        
        print(f"✓ Encaissement created with multiple payments: CB(30) + Chèque(33)")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/encaissements/{data['id']}")
    
    def test_get_encaissements_with_date_filter(self, api_client):
        """Test getting encaissements with date filter"""
        today = "2026-04-18"
        response = api_client.get(
            f"{BASE_URL}/api/encaissements",
            params={"date_from": today, "date_to": today}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Got {len(data)} encaissements for {today}")


class TestCommandes:
    """Commande tests including purge functionality"""
    
    def test_create_commande(self, api_client, test_client_data):
        """Test creating a commande"""
        payload = {
            "client_id": test_client_data["id"],
            "designation": "TEST_Écran 27 pouces",
            "fournisseur": "LDLC",
            "quantite": 1,
            "prix_achat": 150.0,
            "prix_vente": 200.0,
            "statut": "En attente de commande"
        }
        response = api_client.post(f"{BASE_URL}/api/commandes", json=payload)
        assert response.status_code == 200
        data = response.json()
        
        assert "numero" in data
        assert data["numero"].startswith("cmd-")
        assert data["montant_total"] == 200.0
        
        print(f"✓ Commande created: {data['numero']}")
        
        # Cleanup
        api_client.delete(f"{BASE_URL}/api/commandes/{data['id']}")
    
    def test_purge_completed_commandes(self, api_client, test_client_data):
        """Test purging completed commandes (Livré/Récupéré and Réglé)"""
        # Create commandes with different statuses
        completed_ids = []
        
        # Create a "Livré/Récupéré" commande
        payload1 = {
            "client_id": test_client_data["id"],
            "designation": "TEST_Purge_Livre",
            "statut": "Livré/Récupéré"
        }
        resp1 = api_client.post(f"{BASE_URL}/api/commandes", json=payload1)
        assert resp1.status_code == 200
        completed_ids.append(resp1.json()["id"])
        
        # Create a "Réglé" commande
        payload2 = {
            "client_id": test_client_data["id"],
            "designation": "TEST_Purge_Regle",
            "statut": "Réglé"
        }
        resp2 = api_client.post(f"{BASE_URL}/api/commandes", json=payload2)
        assert resp2.status_code == 200
        completed_ids.append(resp2.json()["id"])
        
        # Create an "En attente" commande (should NOT be purged)
        payload3 = {
            "client_id": test_client_data["id"],
            "designation": "TEST_Purge_EnAttente",
            "statut": "En attente de commande"
        }
        resp3 = api_client.post(f"{BASE_URL}/api/commandes", json=payload3)
        assert resp3.status_code == 200
        active_id = resp3.json()["id"]
        
        # Purge completed
        purge_response = api_client.delete(f"{BASE_URL}/api/commandes/purge/completed")
        assert purge_response.status_code == 200
        purge_data = purge_response.json()
        assert "supprimées" in purge_data["message"]
        
        # Verify completed commandes are deleted
        for cid in completed_ids:
            check = api_client.get(f"{BASE_URL}/api/commandes/{cid}")
            assert check.status_code == 404, f"Completed commande {cid} should be deleted"
        
        # Verify active commande still exists
        check_active = api_client.get(f"{BASE_URL}/api/commandes/{active_id}")
        assert check_active.status_code == 200, "Active commande should still exist"
        
        print(f"✓ Purge completed: {purge_data['message']}")
        
        # Cleanup remaining
        api_client.delete(f"{BASE_URL}/api/commandes/{active_id}")


class TestExcelExport:
    """Excel export tests"""
    
    def test_caisse_excel_export(self, api_client):
        """Test caisse Excel export"""
        response = api_client.get(f"{BASE_URL}/api/export/caisse/excel")
        assert response.status_code == 200
        content_type = response.headers.get("content-type", "")
        assert "spreadsheet" in content_type or "excel" in content_type or "octet-stream" in content_type
        assert len(response.content) > 1000  # Should have content
        print(f"✓ Caisse Excel export generated ({len(response.content)} bytes)")
    
    def test_reparations_excel_export(self, api_client):
        """Test reparations Excel export"""
        response = api_client.get(f"{BASE_URL}/api/export/reparations/excel")
        assert response.status_code == 200
        assert len(response.content) > 1000
        print(f"✓ Reparations Excel export generated ({len(response.content)} bytes)")


class TestDashboard:
    """Dashboard statistics tests"""
    
    def test_dashboard_stats(self, api_client):
        """Test dashboard statistics endpoint"""
        response = api_client.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200
        data = response.json()
        
        # Verify all expected fields
        assert "total_clients" in data
        assert "total_reparations" in data
        assert "reparations_en_cours" in data
        assert "reparations_terminees" in data
        assert "total_commandes" in data
        assert "commandes_en_attente" in data
        assert "total_caisse_jour" in data
        assert "total_entrees_jour" in data
        assert "total_sorties_jour" in data
        
        print(f"✓ Dashboard stats: {data['total_clients']} clients, {data['total_reparations']} reparations")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_data(self, api_client, test_client_data, test_reparation_data):
        """Clean up test data created during tests"""
        # Delete test reparation
        api_client.delete(f"{BASE_URL}/api/reparations/{test_reparation_data['id']}")
        
        # Delete test client
        api_client.delete(f"{BASE_URL}/api/clients/{test_client_data['id']}")
        
        # Delete any remaining TEST_ prefixed clients
        clients_resp = api_client.get(f"{BASE_URL}/api/clients")
        if clients_resp.status_code == 200:
            for client in clients_resp.json():
                if client.get("nom", "").startswith("TEST_"):
                    api_client.delete(f"{BASE_URL}/api/clients/{client['id']}")
        
        print("✓ Test data cleaned up")
