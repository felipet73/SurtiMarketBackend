import { Test, TestingModule } from '@nestjs/testing';
import { SustainabilityService } from './sustainability.service';

describe('SustainabilityService', () => {
  let service: SustainabilityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SustainabilityService],
    }).compile();

    service = module.get<SustainabilityService>(SustainabilityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
