"""
DCLIC Informatique - iPad Terminal Sync Tests (Iteration 6)
Tests for: /api/ipad/* endpoints (current, assign, release, heartbeat, status)
+ auto-release after signature + TTL 30 min expiration
"""
import pytest
import requests
import os
import time
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture(scope="module")
def test_client_data(api_client):
    """Create a test client for reparation tests"""
    client_payload = {
        "nom": "TEST_iPad_Client",
        "prenom": "Terminal",
        "telephone": "0600000001",
        "email": "ipad.test@example.com"
    }
    response = api_client.post(f"{BASE_URL}/api/clients", json=client_payload)
    assert response.status_code == 200, f"Failed to create test client: {response.text}"
    yield response.json()
    # Cleanup
    api_client.delete(f"{BASE_URL}/api/clients/{response.json()['id']}")

@pytest.fixture(scope="module")
def test_reparation_data(api_client, test_client_data):
    """Create a test reparation for iPad sync tests"""
    rep_payload = {
        "client_id": test_client_data["id"],
        "materiel_fourni": {"pc_portable": True},
        "description_panne": "Test iPad sync - écran cassé",
        "statut": "Réparation enregistrée",
        "statut_interne": "En cours"
    }
    response = api_client.post(f"{BASE_URL}/api/reparations", json=rep_payload)
    assert response.status_code == 200, f"Failed to create test reparation: {response.text}"
    yield response.json()
    # Cleanup
    api_client.delete(f"{BASE_URL}/api/reparations/{response.json()['id']}")


class TestIpadCurrentEndpoint:
    """Tests for GET /api/ipad/current"""
    
    def test_ipad_current_initial_state(self, api_client):
        """GET /api/ipad/current returns null reparation_id initially"""
        # First release to ensure clean state
        api_client.post(f"{BASE_URL}/api/ipad/release")
        
        response = api_client.get(f"{BASE_URL}/api/ipad/current")
        assert response.status_code == 200
        data = response.json()
        
        assert "reparation_id" in data
        assert "assigned_at" in data
        assert "kiosk" in data
        # After release, should be null
        assert data["reparation_id"] is None
        assert data["assigned_at"] is None
        
        print("✓ GET /api/ipad/current returns null state initially")
    
    def test_ipad_current_reflects_assignment(self, api_client, test_reparation_data):
        """GET /api/ipad/current reflects assigned reparation after POST /assign"""
        rep_id = test_reparation_data["id"]
        
        # Assign
        assign_resp = api_client.post(
            f"{BASE_URL}/api/ipad/assign",
            json={"reparation_id": rep_id, "kiosk": True}
        )
        assert assign_resp.status_code == 200
        
        # Check current
        response = api_client.get(f"{BASE_URL}/api/ipad/current")
        assert response.status_code == 200
        data = response.json()
        
        assert data["reparation_id"] == rep_id
        assert data["assigned_at"] is not None
        assert data["kiosk"] == True
        
        print(f"✓ GET /api/ipad/current reflects assigned reparation: {rep_id}")
        
        # Cleanup
        api_client.post(f"{BASE_URL}/api/ipad/release")


class TestIpadAssignEndpoint:
    """Tests for POST /api/ipad/assign"""
    
    def test_ipad_assign_valid_reparation(self, api_client, test_reparation_data):
        """POST /api/ipad/assign with valid reparation_id succeeds"""
        rep_id = test_reparation_data["id"]
        
        response = api_client.post(
            f"{BASE_URL}/api/ipad/assign",
            json={"reparation_id": rep_id, "kiosk": True}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["ok"] == True
        assert "assigned_at" in data
        assert data["kiosk"] == True
        
        print(f"✓ POST /api/ipad/assign succeeded for reparation: {rep_id}")
        
        # Cleanup
        api_client.post(f"{BASE_URL}/api/ipad/release")
    
    def test_ipad_assign_invalid_reparation_returns_404(self, api_client):
        """POST /api/ipad/assign with invalid reparation_id returns 404"""
        response = api_client.post(
            f"{BASE_URL}/api/ipad/assign",
            json={"reparation_id": "invalid-uuid-12345", "kiosk": True}
        )
        assert response.status_code == 404
        
        print("✓ POST /api/ipad/assign with invalid ID returns 404")
    
    def test_ipad_assign_kiosk_false(self, api_client, test_reparation_data):
        """POST /api/ipad/assign with kiosk=false works"""
        rep_id = test_reparation_data["id"]
        
        response = api_client.post(
            f"{BASE_URL}/api/ipad/assign",
            json={"reparation_id": rep_id, "kiosk": False}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data["kiosk"] == False
        
        # Verify in current
        current = api_client.get(f"{BASE_URL}/api/ipad/current").json()
        assert current["kiosk"] == False
        
        print("✓ POST /api/ipad/assign with kiosk=false works")
        
        # Cleanup
        api_client.post(f"{BASE_URL}/api/ipad/release")


class TestIpadReleaseEndpoint:
    """Tests for POST /api/ipad/release"""
    
    def test_ipad_release_clears_assignment(self, api_client, test_reparation_data):
        """POST /api/ipad/release clears reparation_id and assigned_at"""
        rep_id = test_reparation_data["id"]
        
        # First assign
        api_client.post(
            f"{BASE_URL}/api/ipad/assign",
            json={"reparation_id": rep_id, "kiosk": True}
        )
        
        # Verify assigned
        current = api_client.get(f"{BASE_URL}/api/ipad/current").json()
        assert current["reparation_id"] == rep_id
        
        # Release
        response = api_client.post(f"{BASE_URL}/api/ipad/release")
        assert response.status_code == 200
        data = response.json()
        assert data["ok"] == True
        
        # Verify released
        current_after = api_client.get(f"{BASE_URL}/api/ipad/current").json()
        assert current_after["reparation_id"] is None
        assert current_after["assigned_at"] is None
        
        print("✓ POST /api/ipad/release clears assignment")


class TestIpadHeartbeatEndpoint:
    """Tests for PUT /api/ipad/heartbeat"""
    
    def test_ipad_heartbeat_updates_timestamp(self, api_client):
        """PUT /api/ipad/heartbeat updates last_heartbeat_at"""
        response = api_client.put(f"{BASE_URL}/api/ipad/heartbeat")
        assert response.status_code == 200
        data = response.json()
        
        assert data["ok"] == True
        assert "at" in data
        
        # Verify timestamp is recent (within last 5 seconds)
        heartbeat_time = datetime.fromisoformat(data["at"].replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        diff = (now - heartbeat_time).total_seconds()
        assert diff < 5, f"Heartbeat timestamp too old: {diff}s"
        
        print(f"✓ PUT /api/ipad/heartbeat updated timestamp: {data['at']}")


class TestIpadStatusEndpoint:
    """Tests for GET /api/ipad/status"""
    
    def test_ipad_status_online_after_heartbeat(self, api_client):
        """GET /api/ipad/status returns online=true after recent heartbeat"""
        # Send heartbeat
        api_client.put(f"{BASE_URL}/api/ipad/heartbeat")
        
        response = api_client.get(f"{BASE_URL}/api/ipad/status")
        assert response.status_code == 200
        data = response.json()
        
        assert "online" in data
        assert "last_heartbeat_at" in data
        assert "reparation_id" in data
        assert "assigned_at" in data
        assert "kiosk" in data
        
        assert data["online"] == True
        
        print("✓ GET /api/ipad/status returns online=true after heartbeat")
    
    def test_ipad_status_includes_assignment_info(self, api_client, test_reparation_data):
        """GET /api/ipad/status includes current assignment info"""
        rep_id = test_reparation_data["id"]
        
        # Assign
        api_client.post(
            f"{BASE_URL}/api/ipad/assign",
            json={"reparation_id": rep_id, "kiosk": True}
        )
        
        # Send heartbeat
        api_client.put(f"{BASE_URL}/api/ipad/heartbeat")
        
        response = api_client.get(f"{BASE_URL}/api/ipad/status")
        assert response.status_code == 200
        data = response.json()
        
        assert data["reparation_id"] == rep_id
        assert data["kiosk"] == True
        assert data["online"] == True
        
        print(f"✓ GET /api/ipad/status includes assignment: {rep_id}")
        
        # Cleanup
        api_client.post(f"{BASE_URL}/api/ipad/release")


class TestAutoReleaseAfterSignature:
    """Tests for auto-release of iPad after signature"""
    
    def test_signature_releases_ipad_if_assigned(self, api_client, test_client_data):
        """POST /api/reparations/{id}/signature releases iPad if that reparation was assigned"""
        # Create a fresh reparation for this test
        rep_payload = {
            "client_id": test_client_data["id"],
            "materiel_fourni": {"pc_portable": True},
            "description_panne": "Test auto-release after signature",
            "statut": "Réparation enregistrée",
            "statut_interne": "En cours"
        }
        rep_resp = api_client.post(f"{BASE_URL}/api/reparations", json=rep_payload)
        assert rep_resp.status_code == 200
        rep_data = rep_resp.json()
        rep_id = rep_data["id"]
        
        try:
            # Assign to iPad
            api_client.post(
                f"{BASE_URL}/api/ipad/assign",
                json={"reparation_id": rep_id, "kiosk": True}
            )
            
            # Verify assigned
            current = api_client.get(f"{BASE_URL}/api/ipad/current").json()
            assert current["reparation_id"] == rep_id
            
            # Sign the reparation
            signature_payload = {
                "signature_b64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                "nom_signataire": "Test Signataire",
                "accepte_conditions": True
            }
            sign_resp = api_client.post(
                f"{BASE_URL}/api/reparations/{rep_id}/signature",
                json=signature_payload
            )
            assert sign_resp.status_code == 200
            
            # Verify iPad is released
            current_after = api_client.get(f"{BASE_URL}/api/ipad/current").json()
            assert current_after["reparation_id"] is None, "iPad should be released after signature"
            assert current_after["assigned_at"] is None
            
            print("✓ Signature auto-releases iPad when reparation was assigned")
        
        finally:
            # Cleanup
            api_client.delete(f"{BASE_URL}/api/reparations/{rep_id}")
    
    def test_signature_does_not_affect_different_assignment(self, api_client, test_client_data):
        """Signing a different reparation doesn't release iPad assigned to another"""
        # Create two reparations
        rep1_payload = {
            "client_id": test_client_data["id"],
            "description_panne": "Test rep 1 - assigned to iPad",
            "statut": "Réparation enregistrée",
            "statut_interne": "En cours"
        }
        rep1_resp = api_client.post(f"{BASE_URL}/api/reparations", json=rep1_payload)
        rep1_id = rep1_resp.json()["id"]
        
        rep2_payload = {
            "client_id": test_client_data["id"],
            "description_panne": "Test rep 2 - will be signed",
            "statut": "Réparation enregistrée",
            "statut_interne": "En cours"
        }
        rep2_resp = api_client.post(f"{BASE_URL}/api/reparations", json=rep2_payload)
        rep2_id = rep2_resp.json()["id"]
        
        try:
            # Assign rep1 to iPad
            api_client.post(
                f"{BASE_URL}/api/ipad/assign",
                json={"reparation_id": rep1_id, "kiosk": True}
            )
            
            # Sign rep2 (different reparation)
            signature_payload = {
                "signature_b64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                "accepte_conditions": True
            }
            api_client.post(f"{BASE_URL}/api/reparations/{rep2_id}/signature", json=signature_payload)
            
            # iPad should still be assigned to rep1
            current = api_client.get(f"{BASE_URL}/api/ipad/current").json()
            assert current["reparation_id"] == rep1_id, "iPad should still be assigned to rep1"
            
            print("✓ Signing different reparation doesn't affect iPad assignment")
        
        finally:
            # Cleanup
            api_client.post(f"{BASE_URL}/api/ipad/release")
            api_client.delete(f"{BASE_URL}/api/reparations/{rep1_id}")
            api_client.delete(f"{BASE_URL}/api/reparations/{rep2_id}")


class TestPublicReparationEndpoint:
    """Tests for GET /api/reparations/{id}/public (used by signature page)"""
    
    def test_public_reparation_returns_safe_data(self, api_client, test_reparation_data):
        """GET /api/reparations/{id}/public returns data for signature page"""
        rep_id = test_reparation_data["id"]
        
        response = api_client.get(f"{BASE_URL}/api/reparations/{rep_id}/public")
        assert response.status_code == 200
        data = response.json()
        
        # Should have public fields
        assert "id" in data
        assert "numero" in data
        assert "date_creation" in data
        assert "client_nom" in data
        assert "client_prenom" in data
        assert "materiel" in data
        assert "description_panne" in data
        assert "conditions" in data
        assert "company" in data
        
        # Should NOT have sensitive fields
        assert "mot_de_passe" not in data
        assert "client_id" not in data
        
        print(f"✓ GET /api/reparations/{rep_id}/public returns safe data")
    
    def test_public_reparation_invalid_id_returns_404(self, api_client):
        """GET /api/reparations/{invalid}/public returns 404"""
        response = api_client.get(f"{BASE_URL}/api/reparations/invalid-id-12345/public")
        assert response.status_code == 404
        
        print("✓ GET /api/reparations/{invalid}/public returns 404")


class TestCleanup:
    """Final cleanup"""
    
    def test_final_cleanup(self, api_client):
        """Release iPad and clean up any remaining test data"""
        # Release iPad
        api_client.post(f"{BASE_URL}/api/ipad/release")
        
        # Clean up TEST_ prefixed clients
        clients_resp = api_client.get(f"{BASE_URL}/api/clients")
        if clients_resp.status_code == 200:
            for client in clients_resp.json():
                if client.get("nom", "").startswith("TEST_"):
                    api_client.delete(f"{BASE_URL}/api/clients/{client['id']}")
        
        print("✓ Final cleanup completed")
