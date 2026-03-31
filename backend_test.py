#!/usr/bin/env python3
"""
Backend API Testing for DCLIC Informatique Management System
Tests all CRUD operations, PDF generation, and Excel exports
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class DCLICAPITester:
    def __init__(self, base_url="https://fiche-repair.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_base = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.created_resources = {
            'clients': [],
            'reparations': [],
            'caisse': []
        }

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            'name': name,
            'success': success,
            'details': details,
            'response_data': response_data
        })

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, 
                 data: Optional[Dict] = None, params: Optional[Dict] = None) -> tuple[bool, Dict]:
        """Run a single API test"""
        url = f"{self.api_base}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            else:
                self.log_test(name, False, f"Unsupported method: {method}")
                return False, {}

            success = response.status_code == expected_status
            response_data = {}
            
            if response.headers.get('content-type', '').startswith('application/json'):
                try:
                    response_data = response.json()
                except:
                    response_data = {}
            
            details = f"Status: {response.status_code}"
            if not success:
                details += f" (expected {expected_status})"
                if response_data:
                    details += f" - {response_data.get('detail', '')}"
            
            self.log_test(name, success, details, response_data)
            return success, response_data

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_api_health(self):
        """Test API health endpoint"""
        print("\n🔍 Testing API Health...")
        success, data = self.run_test("API Health Check", "GET", "", 200)
        return success

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        print("\n📊 Testing Dashboard...")
        success, data = self.run_test("Dashboard Stats", "GET", "dashboard/stats", 200)
        
        if success and data:
            required_fields = ['total_clients', 'total_reparations', 'reparations_en_cours', 
                             'reparations_terminees', 'total_caisse_jour']
            for field in required_fields:
                if field not in data:
                    self.log_test(f"Dashboard field {field}", False, "Missing field")
                else:
                    self.log_test(f"Dashboard field {field}", True)
        
        return success

    def test_clients_crud(self):
        """Test complete CRUD operations for clients"""
        print("\n👥 Testing Clients CRUD...")
        
        # Test GET empty clients
        success, data = self.run_test("Get Clients (empty)", "GET", "clients", 200)
        
        # Test CREATE client
        client_data = {
            "nom": "Dupont",
            "prenom": "Jean",
            "telephone": "0612345678",
            "email": "jean.dupont@email.com",
            "adresse": "123 Rue de la Paix, 19140 Uzerche"
        }
        
        success, created_client = self.run_test("Create Client", "POST", "clients", 200, client_data)
        if success and created_client:
            client_id = created_client.get('id')
            if client_id:
                self.created_resources['clients'].append(client_id)
                
                # Test GET specific client
                self.run_test("Get Client by ID", "GET", f"clients/{client_id}", 200)
                
                # Test UPDATE client
                update_data = {"telephone": "0687654321"}
                self.run_test("Update Client", "PUT", f"clients/{client_id}", 200, update_data)
                
                # Test GET all clients (should have 1)
                success, clients = self.run_test("Get All Clients", "GET", "clients", 200)
                if success and isinstance(clients, list) and len(clients) > 0:
                    self.log_test("Client in list", True)
                else:
                    self.log_test("Client in list", False, "No clients found")
                
                # Test client search
                self.run_test("Search Clients", "GET", "clients", 200, params={"search": "Dupont"})
                
                return client_id
        
        return None

    def test_reparations_crud(self, client_id: str):
        """Test complete CRUD operations for reparations"""
        print("\n🔧 Testing Reparations CRUD...")
        
        if not client_id:
            self.log_test("Reparations CRUD", False, "No client ID available")
            return None
        
        # Test CREATE reparation
        reparation_data = {
            "client_id": client_id,
            "marque": "HP",
            "modele": "Pavilion 15",
            "mot_de_passe": "test123",
            "probleme_declare": "Ordinateur ne démarre plus",
            "diagnostic": "Problème d'alimentation",
            "action_realisee": "Remplacement du chargeur",
            "prix": 45.50,
            "statut": "En cours"
        }
        
        success, created_rep = self.run_test("Create Reparation", "POST", "reparations", 200, reparation_data)
        if success and created_rep:
            rep_id = created_rep.get('id')
            if rep_id:
                self.created_resources['reparations'].append(rep_id)
                
                # Test GET specific reparation
                self.run_test("Get Reparation by ID", "GET", f"reparations/{rep_id}", 200)
                
                # Test UPDATE reparation
                update_data = {"statut": "Terminé", "prix": 50.00}
                self.run_test("Update Reparation", "PUT", f"reparations/{rep_id}", 200, update_data)
                
                # Test GET all reparations
                self.run_test("Get All Reparations", "GET", "reparations", 200)
                
                # Test reparation search
                self.run_test("Search Reparations", "GET", "reparations", 200, params={"search": "HP"})
                
                # Test status filter
                self.run_test("Filter by Status", "GET", "reparations", 200, params={"statut": "Terminé"})
                
                return rep_id
        
        return None

    def test_pdf_generation(self, reparation_id: str):
        """Test PDF generation endpoints"""
        print("\n📄 Testing PDF Generation...")
        
        if not reparation_id:
            self.log_test("PDF Generation", False, "No reparation ID available")
            return
        
        # Test client PDF
        try:
            url = f"{self.api_base}/reparations/{reparation_id}/pdf/client"
            response = requests.get(url)
            success = response.status_code == 200 and response.headers.get('content-type') == 'application/pdf'
            self.log_test("Generate Client PDF", success, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Generate Client PDF", False, f"Exception: {str(e)}")
        
        # Test internal PDF
        try:
            url = f"{self.api_base}/reparations/{reparation_id}/pdf/interne"
            response = requests.get(url)
            success = response.status_code == 200 and response.headers.get('content-type') == 'application/pdf'
            self.log_test("Generate Internal PDF", success, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Generate Internal PDF", False, f"Exception: {str(e)}")

    def test_email_sending(self, reparation_id: str):
        """Test email sending (expected to fail due to missing API key)"""
        print("\n📧 Testing Email Sending...")
        
        if not reparation_id:
            self.log_test("Email Sending", False, "No reparation ID available")
            return
        
        # This should fail due to missing RESEND_API_KEY
        success, data = self.run_test("Send Repair Email", "POST", f"reparations/{reparation_id}/send-email", 500)
        # We expect this to fail, so success here means the endpoint is working (returning proper error)
        if not success:
            # Check if it's the expected error
            try:
                url = f"{self.api_base}/reparations/{reparation_id}/send-email"
                response = requests.post(url)
                if response.status_code == 500:
                    response_data = response.json()
                    if "Service email non configuré" in response_data.get('detail', ''):
                        self.log_test("Email Error Handling", True, "Correctly returns email not configured error")
                    else:
                        self.log_test("Email Error Handling", False, f"Unexpected error: {response_data}")
                else:
                    self.log_test("Email Error Handling", False, f"Unexpected status: {response.status_code}")
            except Exception as e:
                self.log_test("Email Error Handling", False, f"Exception: {str(e)}")

    def test_caisse_crud(self):
        """Test cash register CRUD operations"""
        print("\n💰 Testing Caisse CRUD...")
        
        # Test CREATE entree
        entree_data = {
            "type": "entree",
            "montant": 50.00,
            "description": "Réparation PC client",
            "mode_paiement": "especes"
        }
        
        success, created_entree = self.run_test("Create Caisse Entry", "POST", "caisse", 200, entree_data)
        if success and created_entree:
            entry_id = created_entree.get('id')
            if entry_id:
                self.created_resources['caisse'].append(entry_id)
        
        # Test CREATE sortie
        sortie_data = {
            "type": "sortie",
            "montant": 15.00,
            "description": "Achat pièces détachées",
            "mode_paiement": "cb"
        }
        
        success, created_sortie = self.run_test("Create Caisse Sortie", "POST", "caisse", 200, sortie_data)
        if success and created_sortie:
            entry_id = created_sortie.get('id')
            if entry_id:
                self.created_resources['caisse'].append(entry_id)
        
        # Test GET all entries
        self.run_test("Get All Caisse Entries", "GET", "caisse", 200)
        
        # Test date filtering
        today = datetime.now().strftime("%Y-%m-%d")
        self.run_test("Filter Caisse by Date", "GET", "caisse", 200, 
                     params={"date_from": today, "date_to": today})

    def test_excel_exports(self):
        """Test Excel export endpoints"""
        print("\n📊 Testing Excel Exports...")
        
        # Test reparations export
        try:
            url = f"{self.api_base}/export/reparations/excel"
            response = requests.get(url)
            success = (response.status_code == 200 and 
                      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' in 
                      response.headers.get('content-type', ''))
            self.log_test("Export Reparations Excel", success, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Export Reparations Excel", False, f"Exception: {str(e)}")
        
        # Test caisse export
        try:
            url = f"{self.api_base}/export/caisse/excel"
            response = requests.get(url)
            success = (response.status_code == 200 and 
                      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' in 
                      response.headers.get('content-type', ''))
            self.log_test("Export Caisse Excel", success, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Export Caisse Excel", False, f"Exception: {str(e)}")

    def cleanup_resources(self):
        """Clean up created test resources"""
        print("\n🧹 Cleaning up test resources...")
        
        # Delete reparations first (they depend on clients)
        for rep_id in self.created_resources['reparations']:
            try:
                self.run_test(f"Delete Reparation {rep_id}", "DELETE", f"reparations/{rep_id}", 200)
            except:
                pass
        
        # Delete clients
        for client_id in self.created_resources['clients']:
            try:
                self.run_test(f"Delete Client {client_id}", "DELETE", f"clients/{client_id}", 200)
            except:
                pass
        
        # Delete caisse entries
        for entry_id in self.created_resources['caisse']:
            try:
                self.run_test(f"Delete Caisse Entry {entry_id}", "DELETE", f"caisse/{entry_id}", 200)
            except:
                pass

    def run_all_tests(self):
        """Run complete test suite"""
        print("🚀 Starting DCLIC Informatique API Tests")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test API health
        if not self.test_api_health():
            print("❌ API is not responding. Stopping tests.")
            return False
        
        # Test dashboard
        self.test_dashboard_stats()
        
        # Test clients CRUD
        client_id = self.test_clients_crud()
        
        # Test reparations CRUD (requires client)
        reparation_id = self.test_reparations_crud(client_id)
        
        # Test PDF generation
        self.test_pdf_generation(reparation_id)
        
        # Test email sending
        self.test_email_sending(reparation_id)
        
        # Test caisse CRUD
        self.test_caisse_crud()
        
        # Test Excel exports
        self.test_excel_exports()
        
        # Cleanup
        self.cleanup_resources()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        print(f"Success rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️  Some tests failed. Check the details above.")
            return False

def main():
    """Main test execution"""
    tester = DCLICAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())