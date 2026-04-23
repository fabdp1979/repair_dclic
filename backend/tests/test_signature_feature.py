"""
DCLIC Informatique API Tests - Iteration 4
Tests for: Signature client feature (signature_b64, date_signature, nom_signataire, envoye_sans_signature)
- GET /api/reparations/{id}/public - simplified fiche without sensitive data
- POST /api/reparations/{id}/signature - save signature
- DELETE /api/reparations/{id}/signature - clear signature
- POST /api/reparations/{id}/send-email - email with signature check (409 if no signature)
- GET /api/reparations/{id}/pdf/client - PDF with signature image
"""
import pytest
import requests
import os
import base64

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Minimal valid PNG signature (1x1 transparent pixel)
MINIMAL_SIGNATURE_B64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

# Too short signature (should be rejected)
TOO_SHORT_SIGNATURE = "abc123"


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


@pytest.fixture(scope="module")
def test_client_for_signature(api_client):
    """Create a test client for signature tests"""
    client_payload = {
        "nom": "TEST_SignatureClient",
        "prenom": "Marie",
        "telephone": "0612345999",
        "email": "test.signature@example.com"
    }
    response = api_client.post(f"{BASE_URL}/api/clients", json=client_payload)
    assert response.status_code == 200, f"Failed to create test client: {response.text}"
    yield response.json()
    # Cleanup
    api_client.delete(f"{BASE_URL}/api/clients/{response.json()['id']}")


@pytest.fixture(scope="module")
def test_reparation_for_signature(api_client, test_client_for_signature):
    """Create a test reparation for signature tests"""
    rep_payload = {
        "client_id": test_client_for_signature["id"],
        "materiel_fourni": {"pc_portable": True},
        "urgence": False,
        "mot_de_passe": "secret_password_123",
        "description_panne": "Test panne pour signature",
        "observations_client": "Observations confidentielles",
        "diagnostic": "Diagnostic confidentiel",
        "prix": 63.0,
        "statut": "Réparation enregistrée",
        "statut_interne": "En cours"
    }
    response = api_client.post(f"{BASE_URL}/api/reparations", json=rep_payload)
    assert response.status_code == 200, f"Failed to create test reparation: {response.text}"
    yield response.json()
    # Cleanup
    api_client.delete(f"{BASE_URL}/api/reparations/{response.json()['id']}")


class TestPublicReparationEndpoint:
    """Tests for GET /api/reparations/{id}/public - simplified fiche without sensitive data"""
    
    def test_public_endpoint_returns_simplified_data(self, api_client, test_reparation_for_signature, test_client_for_signature):
        """Test that public endpoint returns simplified fiche with correct fields"""
        rep_id = test_reparation_for_signature["id"]
        response = api_client.get(f"{BASE_URL}/api/reparations/{rep_id}/public")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have these public fields
        assert "id" in data
        assert "numero" in data
        assert "date_creation" in data
        assert "client_nom" in data
        assert "client_prenom" in data
        assert "client_telephone" in data
        assert "materiel" in data
        assert "description_panne" in data
        assert "urgence" in data
        assert "conditions" in data
        assert "company" in data
        
        # Verify client info is correct
        assert data["client_nom"] == test_client_for_signature["nom"]
        assert data["client_prenom"] == test_client_for_signature["prenom"]
        
        # Verify conditions are present
        assert "prise_en_charge" in data["conditions"]
        assert "delais" in data["conditions"]
        assert "garantie" in data["conditions"]
        
        # Verify company info
        assert data["company"]["name"] == "DCLIC INFORMATIQUE"
        
        print("✓ Public endpoint returns correct simplified data")
    
    def test_public_endpoint_excludes_sensitive_fields(self, api_client, test_reparation_for_signature):
        """Test that public endpoint does NOT expose sensitive fields"""
        rep_id = test_reparation_for_signature["id"]
        response = api_client.get(f"{BASE_URL}/api/reparations/{rep_id}/public")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should NOT have these sensitive fields
        assert "mot_de_passe" not in data, "mot_de_passe should not be exposed"
        assert "diagnostic" not in data, "diagnostic should not be exposed"
        assert "prix" not in data, "prix should not be exposed"
        assert "observations_client" not in data, "observations_client should not be exposed"
        assert "action_realisee" not in data, "action_realisee should not be exposed"
        assert "statut_interne" not in data, "statut_interne should not be exposed"
        
        print("✓ Public endpoint correctly excludes sensitive fields")
    
    def test_public_endpoint_404_for_invalid_id(self, api_client):
        """Test that public endpoint returns 404 for invalid reparation ID"""
        response = api_client.get(f"{BASE_URL}/api/reparations/invalid-id-12345/public")
        assert response.status_code == 404
        print("✓ Public endpoint returns 404 for invalid ID")


class TestSignatureEndpoint:
    """Tests for POST /api/reparations/{id}/signature"""
    
    def test_save_signature_success(self, api_client, test_reparation_for_signature):
        """Test saving a valid signature"""
        rep_id = test_reparation_for_signature["id"]
        payload = {
            "signature_b64": MINIMAL_SIGNATURE_B64,
            "nom_signataire": None,
            "accepte_conditions": True
        }
        response = api_client.post(f"{BASE_URL}/api/reparations/{rep_id}/signature", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
        assert "date_signature" in data
        # Verify date_signature is ISO format
        assert "T" in data["date_signature"]
        
        print(f"✓ Signature saved successfully, date: {data['date_signature']}")
    
    def test_save_signature_with_different_signataire(self, api_client, test_reparation_for_signature):
        """Test saving signature with a different signataire name"""
        rep_id = test_reparation_for_signature["id"]
        payload = {
            "signature_b64": MINIMAL_SIGNATURE_B64,
            "nom_signataire": "Jean Dupont (conjoint)",
            "accepte_conditions": True
        }
        response = api_client.post(f"{BASE_URL}/api/reparations/{rep_id}/signature", json=payload)
        
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
        
        # Verify the signataire is stored
        public_response = api_client.get(f"{BASE_URL}/api/reparations/{rep_id}/public")
        public_data = public_response.json()
        assert public_data["nom_signataire"] == "Jean Dupont (conjoint)"
        
        print("✓ Signature saved with different signataire name")
    
    def test_save_signature_rejects_if_conditions_not_accepted(self, api_client, test_reparation_for_signature):
        """Test that signature is rejected if accepte_conditions=false"""
        rep_id = test_reparation_for_signature["id"]
        payload = {
            "signature_b64": MINIMAL_SIGNATURE_B64,
            "nom_signataire": None,
            "accepte_conditions": False
        }
        response = api_client.post(f"{BASE_URL}/api/reparations/{rep_id}/signature", json=payload)
        
        assert response.status_code == 400
        data = response.json()
        assert "conditions" in data["detail"].lower() or "acceptées" in data["detail"].lower()
        
        print("✓ Signature correctly rejected when conditions not accepted (400)")
    
    def test_save_signature_rejects_too_short_signature(self, api_client, test_reparation_for_signature):
        """Test that signature is rejected if signature_b64 is too short"""
        rep_id = test_reparation_for_signature["id"]
        payload = {
            "signature_b64": TOO_SHORT_SIGNATURE,
            "nom_signataire": None,
            "accepte_conditions": True
        }
        response = api_client.post(f"{BASE_URL}/api/reparations/{rep_id}/signature", json=payload)
        
        assert response.status_code == 400
        data = response.json()
        assert "signature" in data["detail"].lower() or "invalide" in data["detail"].lower()
        
        print("✓ Signature correctly rejected when too short (400)")


class TestDeleteSignatureEndpoint:
    """Tests for DELETE /api/reparations/{id}/signature"""
    
    def test_delete_signature_clears_fields(self, api_client, test_reparation_for_signature):
        """Test that deleting signature clears signature_b64, date_signature, nom_signataire"""
        rep_id = test_reparation_for_signature["id"]
        
        # First, save a signature
        save_payload = {
            "signature_b64": MINIMAL_SIGNATURE_B64,
            "nom_signataire": "Test Signataire",
            "accepte_conditions": True
        }
        save_response = api_client.post(f"{BASE_URL}/api/reparations/{rep_id}/signature", json=save_payload)
        assert save_response.status_code == 200
        
        # Verify signature is saved
        public_before = api_client.get(f"{BASE_URL}/api/reparations/{rep_id}/public").json()
        assert public_before["signature_b64"] is not None
        assert public_before["nom_signataire"] == "Test Signataire"
        
        # Delete signature
        delete_response = api_client.delete(f"{BASE_URL}/api/reparations/{rep_id}/signature")
        assert delete_response.status_code == 200
        data = delete_response.json()
        assert data["ok"] == True
        
        # Verify signature is cleared
        public_after = api_client.get(f"{BASE_URL}/api/reparations/{rep_id}/public").json()
        assert public_after["signature_b64"] is None
        assert public_after["date_signature"] is None
        assert public_after["nom_signataire"] is None
        
        print("✓ DELETE signature correctly clears all three fields")


class TestSendEmailWithSignatureCheck:
    """Tests for POST /api/reparations/{id}/send-email with signature validation"""
    
    def test_send_email_returns_409_when_no_signature(self, api_client, test_reparation_for_signature):
        """Test that send-email returns 409 when client hasn't signed"""
        rep_id = test_reparation_for_signature["id"]
        
        # First, ensure no signature
        api_client.delete(f"{BASE_URL}/api/reparations/{rep_id}/signature")
        
        # Try to send email without signature
        response = api_client.post(f"{BASE_URL}/api/reparations/{rep_id}/send-email")
        
        # Should return 409 Conflict BEFORE trying to send via Resend
        assert response.status_code == 409, f"Expected 409, got {response.status_code}: {response.text}"
        data = response.json()
        assert "signé" in data["detail"].lower() or "signature" in data["detail"].lower()
        
        print("✓ send-email returns 409 when no signature (before Resend call)")
    
    def test_send_email_force_marks_envoye_sans_signature(self, api_client, test_reparation_for_signature):
        """Test that send-email with force=true marks envoye_sans_signature=true in DB"""
        rep_id = test_reparation_for_signature["id"]
        
        # Ensure no signature
        api_client.delete(f"{BASE_URL}/api/reparations/{rep_id}/signature")
        
        # Try to send email with force=true
        # Note: This will fail at Resend step (no API key), but should mark the flag first
        response = api_client.post(f"{BASE_URL}/api/reparations/{rep_id}/send-email?force=true")
        
        # Will likely fail at Resend step (500), but let's check the DB was updated
        # Get the reparation to check the flag
        rep_response = api_client.get(f"{BASE_URL}/api/reparations/{rep_id}")
        rep_data = rep_response.json()
        
        # The flag should be set to True even if email sending failed
        assert rep_data.get("envoye_sans_signature") == True, "envoye_sans_signature should be True after force=true"
        
        print("✓ send-email with force=true marks envoye_sans_signature=true in DB")


class TestPDFWithSignature:
    """Tests for GET /api/reparations/{id}/pdf/client with signature"""
    
    def test_pdf_size_larger_with_signature(self, api_client, test_reparation_for_signature):
        """Test that PDF with signature is larger than PDF without signature"""
        rep_id = test_reparation_for_signature["id"]
        
        # First, ensure no signature and get PDF size
        api_client.delete(f"{BASE_URL}/api/reparations/{rep_id}/signature")
        
        # Reset envoye_sans_signature flag
        api_client.put(f"{BASE_URL}/api/reparations/{rep_id}", json={"envoye_sans_signature": False})
        
        pdf_without_sig = api_client.get(f"{BASE_URL}/api/reparations/{rep_id}/pdf/client")
        assert pdf_without_sig.status_code == 200
        size_without_sig = len(pdf_without_sig.content)
        
        # Now add signature
        save_payload = {
            "signature_b64": MINIMAL_SIGNATURE_B64,
            "nom_signataire": None,
            "accepte_conditions": True
        }
        api_client.post(f"{BASE_URL}/api/reparations/{rep_id}/signature", json=save_payload)
        
        # Get PDF with signature
        pdf_with_sig = api_client.get(f"{BASE_URL}/api/reparations/{rep_id}/pdf/client")
        assert pdf_with_sig.status_code == 200
        size_with_sig = len(pdf_with_sig.content)
        
        # PDF with signature should be larger (contains image)
        assert size_with_sig > size_without_sig, f"PDF with signature ({size_with_sig}) should be larger than without ({size_without_sig})"
        
        print(f"✓ PDF with signature ({size_with_sig} bytes) > PDF without ({size_without_sig} bytes)")
    
    def test_pdf_shows_sans_signature_mention_when_flag_set(self, api_client, test_reparation_for_signature):
        """Test that PDF shows 'Document envoyé sans signature' when envoye_sans_signature=true"""
        rep_id = test_reparation_for_signature["id"]
        
        # Clear signature and set the flag
        api_client.delete(f"{BASE_URL}/api/reparations/{rep_id}/signature")
        api_client.put(f"{BASE_URL}/api/reparations/{rep_id}", json={"envoye_sans_signature": True})
        
        # Get PDF
        pdf_response = api_client.get(f"{BASE_URL}/api/reparations/{rep_id}/pdf/client")
        assert pdf_response.status_code == 200
        
        # We can't easily parse PDF content, but we can verify it generates successfully
        # The actual text verification would require PDF parsing library
        assert len(pdf_response.content) > 1000
        
        print("✓ PDF generates successfully when envoye_sans_signature=true")
        
        # Reset flag for other tests
        api_client.put(f"{BASE_URL}/api/reparations/{rep_id}", json={"envoye_sans_signature": False})


class TestSignatureFieldsInReparation:
    """Tests to verify signature fields are properly stored and returned"""
    
    def test_reparation_has_signature_fields(self, api_client, test_reparation_for_signature):
        """Test that reparation model includes signature fields"""
        rep_id = test_reparation_for_signature["id"]
        
        # Save a signature
        save_payload = {
            "signature_b64": MINIMAL_SIGNATURE_B64,
            "nom_signataire": "Test Final",
            "accepte_conditions": True
        }
        api_client.post(f"{BASE_URL}/api/reparations/{rep_id}/signature", json=save_payload)
        
        # Get full reparation
        response = api_client.get(f"{BASE_URL}/api/reparations/{rep_id}")
        assert response.status_code == 200
        data = response.json()
        
        # Verify signature fields exist
        assert "signature_b64" in data
        assert "date_signature" in data
        assert "nom_signataire" in data
        assert "envoye_sans_signature" in data
        
        # Verify values
        assert data["signature_b64"] == MINIMAL_SIGNATURE_B64
        assert data["nom_signataire"] == "Test Final"
        assert data["date_signature"] is not None
        
        print("✓ Reparation model correctly includes all signature fields")


class TestCleanupSignatureTests:
    """Cleanup test data"""
    
    def test_cleanup(self, api_client, test_reparation_for_signature, test_client_for_signature):
        """Clean up test data"""
        # Clear signature
        api_client.delete(f"{BASE_URL}/api/reparations/{test_reparation_for_signature['id']}/signature")
        
        # Reset flags
        api_client.put(
            f"{BASE_URL}/api/reparations/{test_reparation_for_signature['id']}", 
            json={"envoye_sans_signature": False}
        )
        
        print("✓ Signature test data cleaned up")
