import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SustainabilityController } from './sustainability.controller';
import { SustainabilityService } from './sustainability.service';
import {
  SustainabilityProfile,
  SustainabilityProfileSchema,
} from './schemas/sustainability-profile.schema';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SustainabilityProfile.name, schema: SustainabilityProfileSchema }]),
    WalletModule,
  ],
  controllers: [SustainabilityController],
  providers: [SustainabilityService],
})
export class SustainabilityModule {}