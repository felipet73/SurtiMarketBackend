import { Test, TestingModule } from '@nestjs/testing';
import { SustainabilityController } from './sustainability.controller';

describe('SustainabilityController', () => {
  let controller: SustainabilityController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SustainabilityController],
    }).compile();

    controller = module.get<SustainabilityController>(SustainabilityController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
