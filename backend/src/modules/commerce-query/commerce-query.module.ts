import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { CommerceChatQueryService } from './services/commerce-chat-query.service';

/**
 * Read-only answers about a person's cart and orders, for the chatbot.
 *
 * The chatbot has to answer "what is in my cart" and "where is my order"
 * without being able to place one, so it reads through this rather than through
 * the order module. It touches the database and the shared cart rules in
 * `core/domain` and nothing else, which is what keeps chat out of checkout.
 */
@Module({
  imports: [PrismaModule],
  providers: [CommerceChatQueryService],
  exports: [CommerceChatQueryService],
})
export class CommerceQueryModule {}
