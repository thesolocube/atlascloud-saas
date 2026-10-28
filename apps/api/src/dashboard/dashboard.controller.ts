import * as fs from 'fs';
import * as path from 'path';

import { Controller, Get, Res, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';

import { Public } from '../common/decorators/public.decorator';

@ApiTags('dashboard')
@Controller({ path: '', version: VERSION_NEUTRAL })
export class DashboardController {
  @Get(['dashboard', 'login', ''])
  @Public()
  @ApiOperation({ summary: 'Interactive mission control dashboard and auth portal UI' })
  getDashboard(@Res() res: Response): void {
    const candidates = [
      path.resolve(__dirname, 'dashboard.html'),
      path.resolve(process.cwd(), 'dashboard.html'),
      path.resolve(process.cwd(), 'apps/api/src/dashboard/dashboard.html'),
      path.resolve(process.cwd(), 'apps/api/dist/dashboard/dashboard.html'),
      path.resolve(process.cwd(), '../dashboard.html'),
      path.resolve(process.cwd(), '../../dashboard.html'),
      path.resolve(__dirname, '../dashboard.html'),
      path.resolve(__dirname, '../../dashboard.html'),
      path.resolve(__dirname, '../../../dashboard.html'),
      path.resolve(__dirname, '../../../../dashboard.html'),
      path.resolve(__dirname, '../../../../../dashboard.html'),
    ];
    const foundPath = candidates.find((p) => fs.existsSync(p));
    if (foundPath) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      fs.createReadStream(foundPath).pipe(res);
      return;
    }
    res.status(404).send('Dashboard HTML template not found');
  }
}
