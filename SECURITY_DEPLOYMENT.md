# Security & Deployment Guide

## 🔐 Critical Changes Made

### 1. ✅ Environment Validation
- Backend now **fails to start** if required env vars are missing
- Required variables: `JWT_SECRET`, `ADMIN_KEY`, `CORS_ORIGIN`
- File: [backend/src/index.ts](../backend/src/index.ts)

### 2. ✅ Rate Limiting
- Global rate limit: 100 requests per 15 min per IP
- Auth endpoints: 5 attempts per 15 min per IP (strict)
- Installed: `express-rate-limit`

### 3. ✅ CORS Hardened
- No more `'*'` wildcard fallback
- Explicitly validate against comma-separated list
- Support for multiple origins (e.g., production + staging)

### 4. ✅ Enhanced Helmet Security
- Content Security Policy (CSP) enabled
- HSTS (HTTP Strict Transport Security) enforced
- Frame busting protection
- XSS filtering enabled
- Clickjacking protection

### 5. ✅ Email Privacy
- Removed `requester_email` from admin queries
- Queries now only return `requester_username`
- Prevents email harvesting/enumeration

### 6. ✅ Input Validation Improved
- Wallet request validation: amount limits (max $1M), details size limits (5KB max)
- Payment method validation
- String length checks to prevent DoS

### 7. ✅ Frontend Timeout Protection
- All API calls now have 10-second timeout
- Prevents hanging requests
- Better error handling for network failures

### 8. ✅ Graceful Shutdown
- SIGTERM/SIGINT handlers added
- Server closes connections cleanly on shutdown
- Better for containerized deployments

### 9. ✅ Database Migrations
- New migration: `006_security_improvements.sql`
- Adds unique constraint: prevents duplicate pending requests per user/game
- Performance indexes added

---

## 🚀 Production Deployment Checklist

### Phase 1: Secrets & Configuration
- [ ] Generate strong `ADMIN_KEY`: 
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] Generate strong `JWT_SECRET`:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- [ ] Update DATABASE_URL with production credentials
- [ ] Set `CORS_ORIGIN` to your production domain(s)
  ```bash
  CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
  ```
- [ ] Change database password in docker-compose (NOT `coinrow:coinrow`)
- [ ] Use `.env.production` with these values (never commit!)

### Phase 2: HTTPS & TLS
- [ ] Obtain SSL certificate (Let's Encrypt recommended)
- [ ] Configure reverse proxy (nginx/Apache) to terminate TLS
- [ ] Set `Secure` flag on cookies (backend will do this automatically)
- [ ] Redirect all HTTP traffic to HTTPS

### Phase 3: Database
- [ ] Use managed PostgreSQL (AWS RDS, Neon, Supabase)
- [ ] Enable automatic backups (daily minimum)
- [ ] Set up read replicas for high availability
- [ ] Use strong, unique database password
- [ ] Restrict database access to application IP only
- [ ] Run migration: `npm run migrate`

### Phase 4: Deployment
- [ ] Build backend: `npm run build`
- [ ] Build frontend: `npm run build`
- [ ] Test in staging environment first
- [ ] Monitor error logs during rollout
- [ ] Set up monitoring/alerting (DataDog, New Relic, etc.)

### Phase 5: Monitoring & Logging
- [ ] Enable request logging (add Morgan middleware)
- [ ] Monitor failed login attempts
- [ ] Alert on repeated 401/403 errors (brute force detection)
- [ ] Log all admin actions with IP address
- [ ] Set up error tracking (Sentry)

---

## ⚠️ Still TODO - Requires Manual Implementation

### HIGH PRIORITY

#### 1. Store Admin Key in Server-Side Sessions (Not localStorage)
**Problem:** Admin key visible in browser localStorage
**Solution:**
```typescript
// Option A: Use server-side session after initial login
// Option B: Use separate admin panel on internal network
// Option C: Use OAuth/OIDC for admin authentication
```

#### 2. Encrypt Game Credentials at Rest
**Problem:** Usernames/passwords stored in plain text
**Solution:**
```sql
-- Add encrypted_username, encrypted_password columns
-- Use AES-256 encryption (crypto module or pgcrypto)
-- Only decrypt on retrieval for admin view
```

#### 3. Add CSRF Protection
**Problem:** Admin panel vulnerable to cross-site request forgery
**Solution:**
```bash
npm install csurf
# Add CSRF token middleware to admin routes
```

#### 4. Add Audit Logging
**Problem:** Can't track who fulfilled requests or when
**Solution:**
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  admin_ip_address INET,
  action TEXT,
  resource_id UUID,
  created_at TIMESTAMPTZ
);
```

#### 5. Account Lockout After Failed Attempts
**Problem:** No brute force protection beyond rate limiting
**Solution:**
```sql
ALTER TABLE users ADD COLUMN failed_login_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TIMESTAMPTZ;
-- Lock account after 5 failed attempts for 30 minutes
```

#### 6. Force HTTPS Only (Add to Backend)
```typescript
app.use((req, res, next) => {
  if (!req.secure && process.env.NODE_ENV === 'production') {
    return res.redirect(`https://${req.get('host')}${req.url}`);
  }
  next();
});
```

#### 7. Add Request ID/Correlation Tracking
```typescript
import { v4 as uuidv4 } from 'uuid';
app.use((req, res, next) => {
  req.id = req.get('x-request-id') || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});
```

#### 8. Implement API Key Rotation
- Add `key_rotated_at` column to track when keys were last changed
- Force rotation every 90 days in admin panel
- Display warning when key is >60 days old

### MEDIUM PRIORITY

- [ ] Add structured logging (Winston/Pino)
- [ ] Add request validation middleware (express-validator)
- [ ] Add password strength requirements
- [ ] Add email verification before account activation
- [ ] Add 2FA for admin accounts
- [ ] Implement OWASP dependency scanning (npm audit)
- [ ] Add security headers to frontend (X-Frame-Options, etc.)
- [ ] Rate limit by user (not just IP) for authenticated endpoints
- [ ] Add DELETE account endpoint
- [ ] Add password reset with email verification

### OPTIONAL (Nice-to-Have)

- WAF (Web Application Firewall) - Cloudflare/AWS WAF
- DDoS protection - Cloudflare/AWS Shield
- Database encryption (TDE)
- API versioning (v1, v2, etc.)
- GraphQL instead of REST (better attack surface)
- Request signing with HMAC

---

## 🔍 Security Testing Checklist

Run these tests before production launch:

```bash
# 1. Dependency vulnerability scan
npm audit

# 2. SQL injection test - try this in login:
# Email: ' OR '1'='1
# Password: anything

# 3. XSS test - try this in username field:
# <script>alert('xss')</script>

# 4. Rate limit test
for i in {1..10}; do curl -X POST http://localhost:4000/api/auth/login; done

# 5. CORS origin validation
curl -H "Origin: http://evil.com" http://localhost:4000/api/games

# 6. Admin key brute force
for i in {1..6}; do curl -H "x-admin-key: wrong" http://localhost:4000/api/admin/check; done
```

---

## 📊 Environment Variables Required

### Backend (.env)
```
# Database (use strong password!)
DATABASE_URL=postgres://user:STRONG_PASSWORD@host:5432/coinrow

# Server
PORT=4000
NODE_ENV=production

# Security (32+ character random strings)
JWT_SECRET=your_random_secret_here
ADMIN_KEY=your_random_secret_here

# CORS (no wildcards!)
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com

# Optional
LOG_LEVEL=info
```

### Frontend (.env)
```
VITE_API_URL=https://api.yourdomain.com/api
```

---

## 🚨 Emergency Response

If you suspect a breach:

1. **Immediately:**
   - Rotate `JWT_SECRET` (all existing tokens invalid)
   - Rotate `ADMIN_KEY`
   - Check database for unauthorized changes
   - Review admin action logs

2. **Within 1 hour:**
   - Reset all user passwords (force logout)
   - Review database backups
   - Check server access logs for suspicious IPs

3. **Within 24 hours:**
   - Notify users of the incident
   - Post-mortem analysis
   - Implement additional security measures

---

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practices-security.html)
- [JWT Security](https://tools.ietf.org/html/rfc8725)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/sql-syntax.html)
- [Node.js Security Checklist](https://nodejs.org/en/docs/guides/security/)
