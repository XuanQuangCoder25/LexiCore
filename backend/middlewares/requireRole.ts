import { Request, Response, NextFunction } from 'express';

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;
    console.log('requireRole check:', { user: req.user, normalizedRoles: roles.map(r => r.toLowerCase().replace(/\s+/g, '_')) });
    const normalizedUserRole = userRole?.toLowerCase().replace(/\s+/g, '_');
    const normalizedRoles = roles.map(r => r.toLowerCase().replace(/\s+/g, '_'));
    if (!normalizedUserRole || !normalizedRoles.includes(normalizedUserRole)) {
      res.status(403).json({ status: 'error', message: 'Không có quyền truy cập.', role_found: userRole });
      return;
    }
    next();
  };
};
