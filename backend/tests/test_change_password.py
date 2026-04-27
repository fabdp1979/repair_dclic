"""
Test suite for POST /api/auth/change-password endpoint
Tests: valid change, wrong current password, new password < 8 chars, same as current, without auth
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "contact@d-clic-informatique.fr"
ADMIN_PASSWORD = "dclic2026!"
NEW_PASSWORD = "newpass2026!"  # For testing password change


class TestChangePassword:
    """Tests for POST /api/auth/change-password endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: ensure we start with the original password"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Try to login with original password first
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            self.token = response.json().get("access_token")
            self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        else:
            # Maybe password was changed in a previous test, try new password
            response = self.session.post(f"{BASE_URL}/api/auth/login", json={
                "email": ADMIN_EMAIL,
                "password": NEW_PASSWORD
            })
            if response.status_code == 200:
                self.token = response.json().get("access_token")
                self.session.headers.update({"Authorization": f"Bearer {self.token}"})
                # Revert to original password
                self.session.post(f"{BASE_URL}/api/auth/change-password", json={
                    "current_password": NEW_PASSWORD,
                    "new_password": ADMIN_PASSWORD
                })
                # Re-login with original password
                response = self.session.post(f"{BASE_URL}/api/auth/login", json={
                    "email": ADMIN_EMAIL,
                    "password": ADMIN_PASSWORD
                })
                self.token = response.json().get("access_token")
                self.session.headers.update({"Authorization": f"Bearer {self.token}"})
            else:
                pytest.skip("Cannot login with either password")
    
    def test_change_password_without_auth_returns_401(self):
        """Test: POST /api/auth/change-password without auth token returns 401"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        response = session.post(f"{BASE_URL}/api/auth/change-password", json={
            "current_password": ADMIN_PASSWORD,
            "new_password": NEW_PASSWORD
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        print("✓ POST /api/auth/change-password without auth returns 401")
    
    def test_change_password_wrong_current_returns_401(self):
        """Test: POST /api/auth/change-password with wrong current password returns 401"""
        response = self.session.post(f"{BASE_URL}/api/auth/change-password", json={
            "current_password": "wrongpassword123",
            "new_password": NEW_PASSWORD
        })
        assert response.status_code == 401, f"Expected 401, got {response.status_code}: {response.text}"
        data = response.json()
        assert "incorrect" in data.get("detail", "").lower() or "actuel" in data.get("detail", "").lower(), \
            f"Expected error about incorrect current password, got: {data}"
        print("✓ POST /api/auth/change-password with wrong current password returns 401 'Mot de passe actuel incorrect'")
    
    def test_change_password_new_too_short_returns_400(self):
        """Test: POST /api/auth/change-password with new password < 8 chars returns 400"""
        response = self.session.post(f"{BASE_URL}/api/auth/change-password", json={
            "current_password": ADMIN_PASSWORD,
            "new_password": "short"  # Only 5 chars
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "8" in data.get("detail", "") or "caractères" in data.get("detail", "").lower(), \
            f"Expected error about 8 characters minimum, got: {data}"
        print("✓ POST /api/auth/change-password with new password < 8 chars returns 400")
    
    def test_change_password_same_as_current_returns_400(self):
        """Test: POST /api/auth/change-password with same password returns 400"""
        response = self.session.post(f"{BASE_URL}/api/auth/change-password", json={
            "current_password": ADMIN_PASSWORD,
            "new_password": ADMIN_PASSWORD  # Same as current
        })
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        data = response.json()
        assert "différent" in data.get("detail", "").lower(), \
            f"Expected error about password must be different, got: {data}"
        print("✓ POST /api/auth/change-password with same password returns 400 'doit être différent'")
    
    def test_change_password_success_and_verify(self):
        """Test: POST /api/auth/change-password with valid data returns {ok:true} and password is updated"""
        # Change password
        response = self.session.post(f"{BASE_URL}/api/auth/change-password", json={
            "current_password": ADMIN_PASSWORD,
            "new_password": NEW_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True, f"Expected ok:true, got: {data}"
        print("✓ POST /api/auth/change-password with valid data returns {ok:true}")
        
        # Verify: old password no longer works
        new_session = requests.Session()
        new_session.headers.update({"Content-Type": "application/json"})
        response = new_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 401, f"Old password should not work anymore, got {response.status_code}"
        print("✓ Old password no longer works after change")
        
        # Verify: new password works
        response = new_session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": NEW_PASSWORD
        })
        assert response.status_code == 200, f"New password should work, got {response.status_code}: {response.text}"
        print("✓ New password works after change")
        
        # IMPORTANT: Revert password back to original for subsequent tests
        new_token = response.json().get("access_token")
        new_session.headers.update({"Authorization": f"Bearer {new_token}"})
        response = new_session.post(f"{BASE_URL}/api/auth/change-password", json={
            "current_password": NEW_PASSWORD,
            "new_password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Failed to revert password: {response.status_code}: {response.text}"
        print("✓ Password reverted back to original 'dclic2026!'")


class TestIpadEndpointsRegression:
    """Regression tests for iPad polling endpoints"""
    
    def test_ipad_current_returns_assignation(self):
        """Test: GET /api/ipad/current returns assignation correctly"""
        response = requests.get(f"{BASE_URL}/api/ipad/current")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "reparation_id" in data, f"Expected reparation_id in response, got: {data}"
        assert "assigned_at" in data, f"Expected assigned_at in response, got: {data}"
        assert "kiosk" in data, f"Expected kiosk in response, got: {data}"
        print("✓ GET /api/ipad/current returns assignation correctly")
    
    def test_ipad_heartbeat_works(self):
        """Test: PUT /api/ipad/heartbeat works"""
        response = requests.put(f"{BASE_URL}/api/ipad/heartbeat")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True, f"Expected ok:true, got: {data}"
        print("✓ PUT /api/ipad/heartbeat works")
    
    def test_ipad_status_returns_online_info(self):
        """Test: GET /api/ipad/status returns online info"""
        response = requests.get(f"{BASE_URL}/api/ipad/status")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "online" in data, f"Expected online in response, got: {data}"
        assert "last_heartbeat_at" in data, f"Expected last_heartbeat_at in response, got: {data}"
        print("✓ GET /api/ipad/status returns online info")


class TestIpadAssignFlow:
    """Test iPad assign flow for signature sync"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: login and get a reparation ID"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip("Cannot login")
        self.token = response.json().get("access_token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        
        # Get a reparation
        response = self.session.get(f"{BASE_URL}/api/reparations?limit=1")
        if response.status_code == 200 and len(response.json()) > 0:
            self.reparation_id = response.json()[0]["id"]
        else:
            self.reparation_id = None
    
    def test_ipad_assign_sets_state(self):
        """Test: POST /api/ipad/assign sets the state correctly"""
        if not self.reparation_id:
            pytest.skip("No reparation available for testing")
        
        # Assign reparation to iPad
        response = self.session.post(f"{BASE_URL}/api/ipad/assign", json={
            "reparation_id": self.reparation_id,
            "kiosk": True
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("ok") == True, f"Expected ok:true, got: {data}"
        assert "assigned_at" in data, f"Expected assigned_at in response, got: {data}"
        print(f"✓ POST /api/ipad/assign sets state for reparation {self.reparation_id}")
        
        # Verify: GET /api/ipad/current returns the assigned reparation
        response = requests.get(f"{BASE_URL}/api/ipad/current")
        assert response.status_code == 200
        data = response.json()
        assert data.get("reparation_id") == self.reparation_id, \
            f"Expected reparation_id={self.reparation_id}, got: {data}"
        print("✓ GET /api/ipad/current returns the assigned reparation")
        
        # Cleanup: release iPad
        response = self.session.post(f"{BASE_URL}/api/ipad/release")
        assert response.status_code == 200
        print("✓ POST /api/ipad/release clears the assignment")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
