"""
RiffNecromancer Backend API Test Suite
Tests all endpoints with premium/free user scenarios
"""
import os
import requests
import sys
from datetime import datetime
from typing import Optional, Dict, Any

BASE_URL = os.environ.get(
    "TEST_BASE_URL", "https://tone-ritual-lab.preview.emergentagent.com/api"
)

# Demo credentials come from the environment so real passwords are never
# committed to the repo. These must match the values used to seed the demo
# accounts (DEMO_PREMIUM_PASSWORD / DEMO_FREE_PASSWORD).
DEMO_PREMIUM_PASSWORD = os.environ.get("DEMO_PREMIUM_PASSWORD")
DEMO_FREE_PASSWORD = os.environ.get("DEMO_FREE_PASSWORD")

class RiffNecromancerTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.tests_run = 0
        self.tests_passed = 0
        self.tests_failed = 0
        self.demo_token: Optional[str] = None
        self.free_token: Optional[str] = None
        self.new_user_token: Optional[str] = None
        self.failed_tests = []
        self.critical_issues = []

    def log(self, msg: str, level: str = "INFO"):
        """Log test messages"""
        prefix = {
            "INFO": "ℹ️",
            "PASS": "✅",
            "FAIL": "❌",
            "WARN": "⚠️",
            "CRITICAL": "🚨"
        }.get(level, "•")
        print(f"{prefix} {msg}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int,
                 data: Optional[Dict] = None, headers: Optional[Dict] = None,
                 token: Optional[str] = None) -> tuple[bool, Any]:
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        req_headers = {"Content-Type": "application/json"}
        if headers:
            req_headers.update(headers)
        if token:
            req_headers["Authorization"] = f"Bearer {token}"

        self.tests_run += 1
        self.log(f"Testing: {name}", "INFO")

        try:
            if method == "GET":
                response = requests.get(url, headers=req_headers, timeout=10)
            elif method == "POST":
                response = requests.post(url, json=data, headers=req_headers, timeout=10)
            elif method == "PUT":
                response = requests.put(url, json=data, headers=req_headers, timeout=10)
            else:
                raise ValueError(f"Unsupported method: {method}")

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                self.log(f"PASSED - {name} (Status: {response.status_code})", "PASS")
            else:
                self.tests_failed += 1
                self.failed_tests.append({
                    "test": name,
                    "expected": expected_status,
                    "actual": response.status_code,
                    "endpoint": endpoint
                })
                self.log(f"FAILED - {name} (Expected {expected_status}, got {response.status_code})", "FAIL")
                try:
                    self.log(f"Response: {response.text[:200]}", "WARN")
                except:
                    pass

            try:
                return success, response.json()
            except:
                return success, response.text

        except Exception as e:
            self.tests_failed += 1
            self.failed_tests.append({
                "test": name,
                "error": str(e),
                "endpoint": endpoint
            })
            self.log(f"FAILED - {name} (Error: {str(e)})", "FAIL")
            return False, {}

    def test_health(self):
        """Test health endpoint"""
        self.log("\n=== HEALTH CHECK ===", "INFO")
        success, resp = self.run_test(
            "Health endpoint returns 200",
            "GET", "", 200
        )
        if success and isinstance(resp, dict):
            if resp.get("status") == "ok":
                self.log(f"Health check OK: {resp}", "PASS")
            else:
                self.log(f"Health check returned unexpected data: {resp}", "WARN")

    def test_auth_register(self):
        """Test user registration"""
        self.log("\n=== AUTH: REGISTRATION ===", "INFO")
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        email = f"test_{timestamp}@example.com"
        success, resp = self.run_test(
            "POST /auth/register creates new account and returns JWT + user",
            "POST", "auth/register", 200,
            data={"email": email, "password": "TestPass123!", "name": "Test User"}
        )
        if success and isinstance(resp, dict):
            if "access_token" in resp and "user" in resp:
                self.new_user_token = resp["access_token"]
                self.log(f"New user created: {resp['user'].get('email')}", "PASS")
            else:
                self.critical_issues.append("Registration did not return access_token or user")
                self.log("Registration response missing access_token or user", "CRITICAL")

    def test_auth_login_demo(self):
        """Test login with demo premium account"""
        self.log("\n=== AUTH: LOGIN (DEMO PREMIUM) ===", "INFO")
        if not DEMO_PREMIUM_PASSWORD:
            self.log("DEMO_PREMIUM_PASSWORD not set; skipping demo premium login test", "WARN")
            return
        success, resp = self.run_test(
            "POST /auth/login with demo@riffnecromancer.com returns JWT + premium user",
            "POST", "auth/login", 200,
            data={"email": "demo@riffnecromancer.com", "password": DEMO_PREMIUM_PASSWORD}
        )
        if success and isinstance(resp, dict):
            if "access_token" in resp and "user" in resp:
                self.demo_token = resp["access_token"]
                user = resp["user"]
                if user.get("is_premium") == True:
                    self.log(f"Demo user logged in: {user.get('email')} (premium={user.get('is_premium')})", "PASS")
                else:
                    self.critical_issues.append("Demo user is_premium is not True")
                    self.log("Demo user is_premium flag is not True", "CRITICAL")
            else:
                self.critical_issues.append("Login did not return access_token or user")
                self.log("Login response missing access_token or user", "CRITICAL")

    def test_auth_login_free(self):
        """Test login with free account"""
        self.log("\n=== AUTH: LOGIN (FREE) ===", "INFO")
        if not DEMO_FREE_PASSWORD:
            self.log("DEMO_FREE_PASSWORD not set; skipping demo free login test", "WARN")
            return
        success, resp = self.run_test(
            "POST /auth/login with free@riffnecromancer.com returns JWT + free user",
            "POST", "auth/login", 200,
            data={"email": "free@riffnecromancer.com", "password": DEMO_FREE_PASSWORD}
        )
        if success and isinstance(resp, dict):
            if "access_token" in resp and "user" in resp:
                self.free_token = resp["access_token"]
                user = resp["user"]
                if user.get("is_premium") == False:
                    self.log(f"Free user logged in: {user.get('email')} (premium={user.get('is_premium')})", "PASS")
                else:
                    self.critical_issues.append("Free user is_premium is not False")
                    self.log("Free user is_premium flag is not False", "CRITICAL")
            else:
                self.critical_issues.append("Login did not return access_token or user")
                self.log("Login response missing access_token or user", "CRITICAL")

    def test_auth_me(self):
        """Test /auth/me endpoint"""
        self.log("\n=== AUTH: /me ===", "INFO")
        if not self.demo_token:
            self.log("Skipping /auth/me test - no demo token", "WARN")
            return
        success, resp = self.run_test(
            "GET /auth/me with Bearer token returns user",
            "GET", "auth/me", 200,
            token=self.demo_token
        )
        if success and isinstance(resp, dict):
            if "user_id" in resp and "email" in resp:
                self.log(f"/auth/me returned user: {resp.get('email')}", "PASS")
            else:
                self.log("/auth/me response missing user_id or email", "WARN")

    def test_lessons_list(self):
        """Test lessons listing"""
        self.log("\n=== LESSONS: LIST ===", "INFO")
        success, resp = self.run_test(
            "GET /lessons returns 12 lessons total",
            "GET", "lessons", 200
        )
        if success and isinstance(resp, list):
            if len(resp) == 12:
                self.log(f"Lessons count correct: {len(resp)}", "PASS")
                # Check for is_premium and locked fields
                sample = resp[0] if resp else {}
                if "is_premium" in sample and "locked" in sample:
                    self.log("Lessons have is_premium and locked fields", "PASS")
                else:
                    self.log("Lessons missing is_premium or locked fields", "WARN")
            else:
                self.critical_issues.append(f"Expected 12 lessons, got {len(resp)}")
                self.log(f"Expected 12 lessons, got {len(resp)}", "CRITICAL")

    def test_lessons_filter_guitar(self):
        """Test lessons filtering by guitar category"""
        self.log("\n=== LESSONS: FILTER GUITAR ===", "INFO")
        success, resp = self.run_test(
            "GET /lessons?category=guitar returns 7 guitar lessons",
            "GET", "lessons?category=guitar", 200
        )
        if success and isinstance(resp, list):
            if len(resp) == 7:
                self.log(f"Guitar lessons count correct: {len(resp)}", "PASS")
            else:
                self.critical_issues.append(f"Expected 7 guitar lessons, got {len(resp)}")
                self.log(f"Expected 7 guitar lessons, got {len(resp)}", "CRITICAL")

    def test_lessons_filter_vocal(self):
        """Test lessons filtering by vocal category"""
        self.log("\n=== LESSONS: FILTER VOCAL ===", "INFO")
        success, resp = self.run_test(
            "GET /lessons?category=vocal returns 5 vocal lessons",
            "GET", "lessons?category=vocal", 200
        )
        if success and isinstance(resp, list):
            if len(resp) == 5:
                self.log(f"Vocal lessons count correct: {len(resp)}", "PASS")
            else:
                self.critical_issues.append(f"Expected 5 vocal lessons, got {len(resp)}")
                self.log(f"Expected 5 vocal lessons, got {len(resp)}", "CRITICAL")

    def test_lesson_free_anonymous(self):
        """Test free lesson access as anonymous"""
        self.log("\n=== LESSONS: FREE LESSON (ANONYMOUS) ===", "INFO")
        success, resp = self.run_test(
            "GET /lessons/intro-drop-d as anonymous returns lesson with locked=false",
            "GET", "lessons/intro-drop-d", 200
        )
        if success and isinstance(resp, dict):
            if resp.get("locked") == False:
                self.log("Free lesson accessible to anonymous user", "PASS")
            else:
                self.critical_issues.append("Free lesson shows locked=true for anonymous")
                self.log("Free lesson shows locked=true for anonymous user", "CRITICAL")

    def test_lesson_premium_free_user(self):
        """Test premium lesson access as free user"""
        self.log("\n=== LESSONS: PREMIUM LESSON (FREE USER) ===", "INFO")
        if not self.free_token:
            self.log("Skipping premium lesson test - no free token", "WARN")
            return
        success, resp = self.run_test(
            "GET /lessons/galloping-shadows as free user returns locked=true with empty tab_pattern",
            "GET", "lessons/galloping-shadows", 200,
            token=self.free_token
        )
        if success and isinstance(resp, dict):
            if resp.get("locked") == True and len(resp.get("tab_pattern", [])) == 0:
                self.log("Premium lesson correctly locked for free user", "PASS")
            else:
                self.critical_issues.append("Premium lesson not properly locked for free user")
                self.log(f"Premium lesson lock issue: locked={resp.get('locked')}, tab_pattern={resp.get('tab_pattern')}", "CRITICAL")

    def test_lesson_premium_premium_user(self):
        """Test premium lesson access as premium user"""
        self.log("\n=== LESSONS: PREMIUM LESSON (PREMIUM USER) ===", "INFO")
        if not self.demo_token:
            self.log("Skipping premium lesson test - no demo token", "WARN")
            return
        success, resp = self.run_test(
            "GET /lessons/galloping-shadows as premium user returns locked=false with tab_pattern",
            "GET", "lessons/galloping-shadows", 200,
            token=self.demo_token
        )
        if success and isinstance(resp, dict):
            if resp.get("locked") == False and len(resp.get("tab_pattern", [])) > 0:
                self.log("Premium lesson accessible to premium user", "PASS")
            else:
                self.critical_issues.append("Premium lesson not accessible to premium user")
                self.log(f"Premium lesson access issue: locked={resp.get('locked')}, tab_pattern_len={len(resp.get('tab_pattern', []))}", "CRITICAL")

    def test_session_log_free_lesson(self):
        """Test session logging for free lesson"""
        self.log("\n=== SESSIONS: LOG FREE LESSON ===", "INFO")
        if not self.free_token:
            self.log("Skipping session log test - no free token", "WARN")
            return
        success, resp = self.run_test(
            "POST /sessions as free user with heavy-chugging returns ok=true and exact lesson_title",
            "POST", "sessions", 200,
            data={"lesson_id": "heavy-chugging", "duration_seconds": 120, "completed": True},
            token=self.free_token
        )
        if success and isinstance(resp, dict):
            if resp.get("ok") == True:
                lesson_title = resp.get("lesson_title")
                if lesson_title == "Heavy Chugging":
                    self.log(f"Session logged with EXACT title: '{lesson_title}'", "PASS")
                elif lesson_title == "Unknown Lesson":
                    self.critical_issues.append("Session recorded with 'Unknown Lesson' fallback")
                    self.log("CRITICAL: Session recorded with 'Unknown Lesson' instead of exact title", "CRITICAL")
                else:
                    self.log(f"Session title mismatch: expected 'Heavy Chugging', got '{lesson_title}'", "WARN")
            else:
                self.log("Session log did not return ok=true", "WARN")

    def test_session_log_premium_free_user(self):
        """Test session logging for premium lesson as free user"""
        self.log("\n=== SESSIONS: LOG PREMIUM LESSON (FREE USER) ===", "INFO")
        if not self.free_token:
            self.log("Skipping session log test - no free token", "WARN")
            return
        success, resp = self.run_test(
            "POST /sessions as free user with galloping-shadows returns 402",
            "POST", "sessions", 402,
            data={"lesson_id": "galloping-shadows", "duration_seconds": 120, "completed": True},
            token=self.free_token
        )
        if success:
            self.log("Premium lesson correctly gated for free user", "PASS")

    def test_session_log_premium_premium_user(self):
        """Test session logging for premium lesson as premium user"""
        self.log("\n=== SESSIONS: LOG PREMIUM LESSON (PREMIUM USER) ===", "INFO")
        if not self.demo_token:
            self.log("Skipping session log test - no demo token", "WARN")
            return
        success, resp = self.run_test(
            "POST /sessions as premium user with galloping-shadows succeeds with exact title",
            "POST", "sessions", 200,
            data={"lesson_id": "galloping-shadows", "duration_seconds": 180, "completed": True},
            token=self.demo_token
        )
        if success and isinstance(resp, dict):
            lesson_title = resp.get("lesson_title")
            if lesson_title == "Galloping Shadows":
                self.log(f"Premium session logged with EXACT title: '{lesson_title}'", "PASS")
            elif lesson_title == "Unknown Lesson":
                self.critical_issues.append("Premium session recorded with 'Unknown Lesson' fallback")
                self.log("CRITICAL: Premium session recorded with 'Unknown Lesson'", "CRITICAL")
            else:
                self.log(f"Session title mismatch: expected 'Galloping Shadows', got '{lesson_title}'", "WARN")

    def test_sessions_list(self):
        """Test sessions listing"""
        self.log("\n=== SESSIONS: LIST ===", "INFO")
        if not self.demo_token:
            self.log("Skipping sessions list test - no demo token", "WARN")
            return
        success, resp = self.run_test(
            "GET /sessions returns user's sessions sorted desc",
            "GET", "sessions", 200,
            token=self.demo_token
        )
        if success and isinstance(resp, list):
            self.log(f"Sessions list returned {len(resp)} sessions", "PASS")
            # Check for "Unknown Lesson" in any session
            for session in resp:
                if session.get("lesson_title") == "Unknown Lesson":
                    self.critical_issues.append("Found 'Unknown Lesson' in sessions list")
                    self.log(f"CRITICAL: Found 'Unknown Lesson' in session {session.get('session_id')}", "CRITICAL")
                    break

    def test_history_calendar(self):
        """Test history calendar endpoint"""
        self.log("\n=== HISTORY: CALENDAR ===", "INFO")
        if not self.demo_token:
            self.log("Skipping calendar test - no demo token", "WARN")
            return
        success, resp = self.run_test(
            "GET /history/calendar?year=2026&month=6 returns days and stats",
            "GET", "history/calendar?year=2026&month=6", 200,
            token=self.demo_token
        )
        if success and isinstance(resp, dict):
            if "days" in resp and "stats" in resp:
                stats = resp["stats"]
                required_keys = ["total_sessions", "total_minutes", "current_streak", "longest_streak"]
                if all(k in stats for k in required_keys):
                    self.log(f"Calendar stats: {stats}", "PASS")
                else:
                    self.log(f"Calendar stats missing keys: {stats}", "WARN")
            else:
                self.log("Calendar response missing days or stats", "WARN")

    def test_progress_altar(self):
        """Test progress altar endpoint"""
        self.log("\n=== PROGRESS: ALTAR ===", "INFO")
        if not self.demo_token:
            self.log("Skipping progress altar test - no demo token", "WARN")
            return
        success, resp = self.run_test(
            "GET /progress/altar returns summary, by_category, timeline, lessons",
            "GET", "progress/altar", 200,
            token=self.demo_token
        )
        if success and isinstance(resp, dict):
            required_keys = ["summary", "by_category", "timeline", "lessons"]
            if all(k in resp for k in required_keys):
                self.log("Progress altar structure correct", "PASS")
                # Check for "Unknown Lesson" in lessons
                for lesson in resp.get("lessons", []):
                    if lesson.get("title") == "Unknown Lesson":
                        self.critical_issues.append("Found 'Unknown Lesson' in progress altar")
                        self.log("CRITICAL: Found 'Unknown Lesson' in progress altar", "CRITICAL")
                        break
                # Verify timeline is 14 days
                timeline = resp.get("timeline", [])
                if len(timeline) == 14:
                    self.log(f"Timeline has correct 14 days", "PASS")
                else:
                    self.log(f"Timeline has {len(timeline)} days, expected 14", "WARN")
            else:
                self.log(f"Progress altar missing keys: {resp.keys()}", "WARN")

    def test_tone_presets(self):
        """Test tone presets listing"""
        self.log("\n=== TONE: PRESETS ===", "INFO")
        success, resp = self.run_test(
            "GET /tone/presets returns 6 presets with locked flag",
            "GET", "tone/presets", 200
        )
        if success and isinstance(resp, list):
            if len(resp) == 6:
                self.log(f"Tone presets count correct: {len(resp)}", "PASS")
                sample = resp[0] if resp else {}
                if "locked" in sample:
                    self.log("Tone presets have locked field", "PASS")
                else:
                    self.log("Tone presets missing locked field", "WARN")
            else:
                self.log(f"Expected 6 tone presets, got {len(resp)}", "WARN")

    def test_tone_presets_filter(self):
        """Test tone presets filtering by genre"""
        self.log("\n=== TONE: PRESETS FILTER ===", "INFO")
        success, resp = self.run_test(
            "GET /tone/presets?genre=Grunge filters correctly",
            "GET", "tone/presets?genre=Grunge", 200
        )
        if success and isinstance(resp, list):
            grunge_count = len([p for p in resp if p.get("genre") == "Grunge"])
            if grunge_count > 0:
                self.log(f"Grunge filter returned {grunge_count} presets", "PASS")
            else:
                self.log("Grunge filter returned no presets", "WARN")

    def test_payments_packages(self):
        """Test payment packages listing"""
        self.log("\n=== PAYMENTS: PACKAGES ===", "INFO")
        success, resp = self.run_test(
            "GET /payments/packages returns monthly $7 and annual $59",
            "GET", "payments/packages", 200
        )
        if success and isinstance(resp, list):
            monthly = next((p for p in resp if p.get("id") == "monthly"), None)
            annual = next((p for p in resp if p.get("id") == "annual"), None)
            if monthly and monthly.get("amount") == 7.0:
                self.log("Monthly package correct: $7", "PASS")
            else:
                self.log(f"Monthly package issue: {monthly}", "WARN")
            if annual and annual.get("amount") == 59.0:
                self.log("Annual package correct: $59", "PASS")
            else:
                self.log(f"Annual package issue: {annual}", "WARN")

    def test_payments_checkout_valid(self):
        """Test Stripe checkout with valid package"""
        self.log("\n=== PAYMENTS: CHECKOUT (VALID) ===", "INFO")
        if not self.demo_token:
            self.log("Skipping checkout test - no demo token", "WARN")
            return
        success, resp = self.run_test(
            "POST /payments/checkout with monthly creates Stripe session",
            "POST", "payments/checkout", 200,
            data={"package_id": "monthly", "origin_url": "https://tone-ritual-lab.preview.emergentagent.com"},
            token=self.demo_token
        )
        if success and isinstance(resp, dict):
            if "url" in resp and "session_id" in resp:
                self.log(f"Checkout session created: {resp.get('session_id')}", "PASS")
                # Test status endpoint
                session_id = resp.get("session_id")
                if session_id:
                    self.test_payment_status(session_id)
            else:
                self.log("Checkout response missing url or session_id", "WARN")

    def test_payment_status(self, session_id: str):
        """Test payment status endpoint"""
        self.log("\n=== PAYMENTS: STATUS ===", "INFO")
        if not self.demo_token:
            self.log("Skipping status test - no demo token", "WARN")
            return
        success, resp = self.run_test(
            f"GET /payments/status/{session_id} returns payment_status and checkout_status",
            "GET", f"payments/status/{session_id}", 200,
            token=self.demo_token
        )
        if success and isinstance(resp, dict):
            if "payment_status" in resp and "checkout_status" in resp:
                self.log(f"Payment status: {resp.get('payment_status')}, checkout: {resp.get('checkout_status')}", "PASS")
            else:
                self.log("Payment status response missing required fields", "WARN")

    def test_payments_checkout_invalid(self):
        """Test Stripe checkout with invalid package"""
        self.log("\n=== PAYMENTS: CHECKOUT (INVALID) ===", "INFO")
        if not self.demo_token:
            self.log("Skipping checkout test - no demo token", "WARN")
            return
        success, resp = self.run_test(
            "POST /payments/checkout with invalid package returns 400",
            "POST", "payments/checkout", 400,
            data={"package_id": "invalid", "origin_url": "https://tone-ritual-lab.preview.emergentagent.com"},
            token=self.demo_token
        )
        if success:
            self.log("Invalid package correctly rejected", "PASS")

    def test_profile_onboard(self):
        """Test profile onboarding"""
        self.log("\n=== PROFILE: ONBOARD ===", "INFO")
        if not self.new_user_token:
            self.log("Skipping onboard test - no new user token", "WARN")
            return
        success, resp = self.run_test(
            "POST /profile/onboard sets onboarded=true",
            "POST", "profile/onboard", 200,
            data={"skill_level": "Intermediate", "goals": ["Metal", "Grunge"], "accessibility": {"high_contrast": True}},
            token=self.new_user_token
        )
        if success and isinstance(resp, dict):
            if resp.get("onboarded") == True:
                self.log("User onboarded successfully", "PASS")
            else:
                self.log("Onboarded flag not set to true", "WARN")

    def test_profile_accessibility(self):
        """Test profile accessibility update"""
        self.log("\n=== PROFILE: ACCESSIBILITY ===", "INFO")
        if not self.demo_token:
            self.log("Skipping accessibility test - no demo token", "WARN")
            return
        success, resp = self.run_test(
            "POST /profile/accessibility persists accessibility dict",
            "POST", "profile/accessibility", 200,
            data={"screen_reader": True, "reduced_motion": True},
            token=self.demo_token
        )
        if success and isinstance(resp, dict):
            accessibility = resp.get("accessibility", {})
            if "screen_reader" in accessibility:
                self.log(f"Accessibility updated: {accessibility}", "PASS")
            else:
                self.log("Accessibility not persisted correctly", "WARN")

    def test_protected_endpoint_401(self):
        """Test 401 for protected endpoints without auth"""
        self.log("\n=== AUTH: 401 PROTECTION ===", "INFO")
        success, resp = self.run_test(
            "GET /auth/me without auth returns 401",
            "GET", "auth/me", 401
        )
        if success:
            self.log("Protected endpoint correctly returns 401", "PASS")

    def run_all_tests(self):
        """Run all test suites"""
        self.log("\n" + "="*60, "INFO")
        self.log("RIFFNECROMANCER BACKEND API TEST SUITE", "INFO")
        self.log("="*60 + "\n", "INFO")

        # Run tests in order
        self.test_health()
        self.test_auth_register()
        self.test_auth_login_demo()
        self.test_auth_login_free()
        self.test_auth_me()
        self.test_lessons_list()
        self.test_lessons_filter_guitar()
        self.test_lessons_filter_vocal()
        self.test_lesson_free_anonymous()
        self.test_lesson_premium_free_user()
        self.test_lesson_premium_premium_user()
        self.test_session_log_free_lesson()
        self.test_session_log_premium_free_user()
        self.test_session_log_premium_premium_user()
        self.test_sessions_list()
        self.test_history_calendar()
        self.test_progress_altar()
        self.test_tone_presets()
        self.test_tone_presets_filter()
        self.test_payments_packages()
        self.test_payments_checkout_valid()
        self.test_payments_checkout_invalid()
        self.test_profile_onboard()
        self.test_profile_accessibility()
        self.test_protected_endpoint_401()

        # Print summary
        self.print_summary()

    def print_summary(self):
        """Print test summary"""
        self.log("\n" + "="*60, "INFO")
        self.log("TEST SUMMARY", "INFO")
        self.log("="*60, "INFO")
        self.log(f"Total Tests: {self.tests_run}", "INFO")
        self.log(f"Passed: {self.tests_passed}", "PASS")
        self.log(f"Failed: {self.tests_failed}", "FAIL")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        self.log(f"Success Rate: {success_rate:.1f}%", "INFO")

        if self.critical_issues:
            self.log("\n🚨 CRITICAL ISSUES:", "CRITICAL")
            for issue in self.critical_issues:
                self.log(f"  - {issue}", "CRITICAL")

        if self.failed_tests:
            self.log("\n❌ FAILED TESTS:", "FAIL")
            for test in self.failed_tests:
                self.log(f"  - {test['test']}", "FAIL")
                if "expected" in test:
                    self.log(f"    Expected: {test['expected']}, Got: {test['actual']}", "FAIL")
                if "error" in test:
                    self.log(f"    Error: {test['error']}", "FAIL")

        self.log("\n" + "="*60 + "\n", "INFO")

        # Return exit code
        return 0 if self.tests_failed == 0 and len(self.critical_issues) == 0 else 1


def main():
    tester = RiffNecromancerTester()
    exit_code = tester.run_all_tests()
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
