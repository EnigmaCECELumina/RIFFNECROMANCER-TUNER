# Auth-Gated App Testing Playbook (RiffNecromancer)

## Test Identity

Use this for verifying any auth-gated page. The system supports BOTH:
1. Emergent Google OAuth (session_token cookie)
2. Email + Password (JWT Bearer)

## Step 1 — Create Test User & Session via Mongo

```
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  is_premium: true,
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2 — Test Backend

```
curl -X GET "$BACKEND/api/auth/me" -H "Authorization: Bearer YOUR_SESSION_TOKEN"
curl -X GET "$BACKEND/api/lessons" -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

## Step 3 — Browser via Cookie

```
await page.context.add_cookies([{
  "name": "session_token",
  "value": "YOUR_SESSION_TOKEN",
  "domain": "tone-ritual-lab.preview.emergentagent.com",
  "path": "/",
  "httpOnly": true,
  "secure": true,
  "sameSite": "None"
}]);
```

## Quick Bypass (Email/Password)

A standard `/api/auth/register` and `/api/auth/login` endpoint is available with JWT bearer tokens for testing-without-OAuth scenarios.

Demo seed account (only created when `SEED_DEMO_USERS` is enabled):
- email: demo@riffnecromancer.com
- password: value of the `DEMO_PREMIUM_PASSWORD` environment variable (never commit real credentials)
- is_premium: true (for testing premium content)
