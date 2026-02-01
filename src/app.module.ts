import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { AdminModule } from './admin/admin.module';
import { ProductsModule } from './products/products.module';
import { WalletModule } from './wallet/wallet.module';
import { OrdersModule } from './orders/orders.module';
import { ChallengesModule } from './challenges/challenges.module';
import { SustainabilityModule } from './sustainability/sustainability.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { CommunityModule } from './community/community.module';
import { SocialModule } from './social/social.module';
import { NotificationsModule } from './notifications/notifications.module';
import { GroupsModule } from './groups/groups.module';
import { PuzzleModule } from './puzzle/puzzle.module';
import { StreakModule } from './streak/streak.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        uri: cfg.get<string>('MONGO_URI'),
      }),
    }),
    UsersModule,
    AuthModule,
    AdminModule,
    ProductsModule,
    WalletModule,
    OrdersModule,
    ChallengesModule,
    SustainabilityModule,
    DashboardModule,
    CommunityModule,
    SocialModule,
    NotificationsModule,
    GroupsModule,
    PuzzleModule,
    StreakModule,
  ],
})
export class AppModule {}
