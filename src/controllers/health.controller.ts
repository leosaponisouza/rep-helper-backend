// src/controllers/health.controller.ts
import { Request, Response } from 'express';

export class HealthController {
  public async check(req: Request, res: Response): Promise<void> {
    try {
      // You can add any basic system checks here
      res.status(200).json({
        status: 'UP',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        status: 'DOWN',
      });
    }
  }
}