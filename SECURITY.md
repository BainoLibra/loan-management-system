# Security Policy

## Known Vulnerabilities

### Frontend Dependencies (Build-Time)

The frontend has several transitive npm vulnerabilities reported by Snyk in development dependencies. These vulnerabilities are in packages used during build/development and do NOT affect the production application runtime:

**Affected Packages (Build/Dev Only):**
- `nth-check` (ReDoS) - CSS selector parser, transitive via Create React App
- `serialize-javascript` (XSS, Code Injection, Resource Exhaustion) - Webpack dependency
- `underscore` (Uncontrolled Recursion) - Indirect dependency
- `webpack-dev-server` (Origin Validation, Exposed Methods) - Dev server, not in production
- `eslint` (Uncontrolled Recursion) - Linting tool, dev-only
- `follow-redirects` (Information Exposure) - HTTP client utilities
- `inflight` (Resource Leak) - Indirect dependency
- `postcss` (Improper Input Validation) - CSS processing
- `@tootallnate/once` (Control Flow Scoping) - HTTP agent utility

### Remediation Strategy

1. **No Immediate Risk**: These vulnerabilities are in development/build tools, not in production code. The deployed application does not include these packages.

2. **To Fix When Upgrading**:
   - Keep `react-scripts` and other build dependencies up to date
   - Periodically run `npm audit fix` to patch fixable vulnerabilities
   - Test thoroughly after dependency updates to ensure no breaking changes
   - Monitor Snyk for new vulnerability disclosures

3. **Current Status**:
   - Backend: All critical security issues fixed (hardcoded secrets, type validation, header exposure)
   - Frontend: Production dependencies are secure; dev dependencies have known issues that should be addressed during the next major upgrade cycle

### Backend Security

The backend has been hardened with:
- ✅ JWT_SECRET now required as environment variable (no hardcoded fallback)
- ✅ Input type validation on all user-facing endpoints
- ✅ X-Powered-By header disabled
- ✅ Global error handler for graceful error responses
- ✅ Database connection error handling

## Reporting Security Issues

If you discover a security vulnerability, please email the development team directly rather than creating a public issue. Include:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested remediation
