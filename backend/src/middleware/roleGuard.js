/**
 * middleware/roleGuard.js — Role-based access control middleware
 *
 * Usage:
 *   router.post('/admin-only', authenticate, requireRoles(['ADMIN']), handler)
 *   router.put('/managers', authenticate, requireRoles(['ADMIN', 'ASSET_MANAGER']), handler)
 */

/**
 * Returns middleware that allows only the specified roles.
 * @param {string[]} roles - Array of Role enum values allowed
 */
function requireRoles(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role(s): ${roles.join(', ')}`,
      });
    }

    next();
  };
}

// Convenience wrappers
const requireAdmin = requireRoles(['ADMIN']);
const requireAssetManager = requireRoles(['ADMIN', 'ASSET_MANAGER']);
const requireDeptHead = requireRoles(['ADMIN', 'ASSET_MANAGER', 'DEPT_HEAD']);
const requireAny = requireRoles(['ADMIN', 'ASSET_MANAGER', 'DEPT_HEAD', 'EMPLOYEE']);

module.exports = { requireRoles, requireAdmin, requireAssetManager, requireDeptHead, requireAny };
