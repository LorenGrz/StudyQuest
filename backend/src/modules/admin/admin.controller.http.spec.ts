import { INestApplication, ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { globalValidationPipe } from '../../common/validation';
import { Role } from '../../common/roles';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminController } from './admin.controller';
import { AdminCareerRequestsService } from './admin-career-requests.service';
import { AdminCommunitySubjectsService } from './admin-community-subjects.service';

/**
 * RolesGuard through real HTTP: a JWT that authenticates fine but isn't
 * ADMIN must still get 403 on every /admin/* route.
 */
describe('/admin (HTTP, RolesGuard)', () => {
  let app: INestApplication<App>;
  let currentUser: { userId: string; role: Role };
  const careerRequests = { list: jest.fn().mockResolvedValue([]) };
  const communitySubjects = { list: jest.fn().mockResolvedValue([]) };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminCareerRequestsService, useValue: careerRequests },
        { provide: AdminCommunitySubjectsService, useValue: communitySubjects },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: ExecutionContext) => {
          ctx.switchToHttp().getRequest().user = currentUser;
          return true;
        },
      })
      .compile();
    app = moduleRef.createNestApplication({ logger: false });
    app.useGlobalPipes(globalValidationPipe());
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(() => app.close());

  it('403s a non-admin on career requests', async () => {
    currentUser = { userId: 'u1', role: Role.USER };
    await request(app.getHttpServer())
      .get('/api/v1/admin/career-requests')
      .expect(403);
  });

  it('403s a non-admin on community subjects', async () => {
    currentUser = { userId: 'u1', role: Role.USER };
    await request(app.getHttpServer())
      .get('/api/v1/admin/community-subjects?tab=new')
      .expect(403);
  });

  it('lets an admin through', async () => {
    currentUser = { userId: 'admin-1', role: Role.ADMIN };
    await request(app.getHttpServer())
      .get('/api/v1/admin/career-requests')
      .expect(200, []);
    expect(careerRequests.list).toHaveBeenCalled();
  });
});
