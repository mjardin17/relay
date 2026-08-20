import express, { Request, Response } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { AuthoritativeConnectorRegistryService } from '../services/authoritativeConnectorRegistryService';

export const connectorRegistryRouter = express.Router();
connectorRegistryRouter.use(authMiddleware);

// 1. Get Connector Catalog
connectorRegistryRouter.get('/catalog', (_req: Request, res: Response) => {
  try {
    const catalog = AuthoritativeConnectorRegistryService.getInstance().listCatalog();
    res.json({ success: true, catalog });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to fetch catalog' });
  }
});

// 2. List Tenant Connectors (Session-scoped)
connectorRegistryRouter.get('/list', (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const connectors = AuthoritativeConnectorRegistryService.getInstance().listTenantConnectors(tenantId);
    res.json({ success: true, connectors });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message || 'Failed to list tenant connectors' });
  }
});

// 3. Configure Connector (Role-protected)
connectorRegistryRouter.post('/configure', (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userId = (req as any).userId;
    const userRole = ((req as any).userRole || '').toUpperCase();

    if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN: Only owners and administrators may configure external connectors.'
      });
    }

    const { provider, credentials, enabledOperations } = req.body;
    if (!provider) {
      return res.status(400).json({ success: false, error: 'Missing provider' });
    }

    const connectorService = AuthoritativeConnectorRegistryService.getInstance();
    const instance = connectorService.configureTenantConnector(tenantId, {
      provider,
      credentials,
      enabledOperations,
      configuredBy: userId
    });

    res.json({ success: true, connector: instance });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message || 'Failed to configure connector' });
  }
});

// 4. Authoritative Verification Probe (Role-protected, zero simulation in production)
connectorRegistryRouter.post('/verify', (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId;
    const userRole = ((req as any).userRole || '').toUpperCase();

    if (userRole !== 'OWNER' && userRole !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'FORBIDDEN: Only owners and administrators may verify connector status.'
      });
    }

    const { provider, credentials } = req.body;
    if (!provider) {
      return res.status(400).json({ success: false, error: 'Missing provider' });
    }

    const connectorService = AuthoritativeConnectorRegistryService.getInstance();
    // In production HTTP route, simulateSuccess is forbidden and ignored
    const probe = connectorService.verifyTenantConnector(tenantId, provider, {
      credentials
    });

    res.json({ success: true, probe });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err?.message || 'Failed to verify connector' });
  }
});
