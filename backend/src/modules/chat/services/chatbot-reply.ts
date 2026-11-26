import type { CommerceChatQueryService } from '../../commerce-query/services/commerce-chat-query.service';
import type { ChatbotTopic } from './chatbot-knowledge';

/**
 * The shape of a chatbot answer, shared by everything that produces one.
 *
 * It used to be declared inside `chatbot.service`, which `chatbot-commerce`
 * then imported for its return type while `chatbot.service` imported
 * `chatbot-commerce` for the service itself. Two files that import each other
 * cannot be read or loaded independently, and the answer shape belongs to
 * neither of them: it is the contract between them.
 */

/** Structured follow-up action rendered by the NEXUS chatbot UI. */
export interface ChatbotAction {
  type: 'REQUEST_SUPPORT' | 'SELECT_ORDER' | 'LOGIN' | 'NAVIGATE';
  endpoint?: string;
  path?: string;
  label?: string;
  auto?: boolean;
}

/** Response schema returned by the NEXUS conversational assistant endpoints. */
export interface ChatbotReply {
  reply: string;
  engine: 'FAQ' | 'GEMINI' | 'ORDER' | 'CART';
  topic: ChatbotTopic | 'WELCOME' | 'UNKNOWN';
  sources: { id: string; title: string }[];
  actions: ChatbotAction[];
  orders?: Awaited<ReturnType<CommerceChatQueryService['orders']>>;
  cart?: Awaited<ReturnType<CommerceChatQueryService['cart']>>;
  order?: {
    id: string;
    status: string;
    shipmentStatus: string | null;
    waybillCode: string | null;
    afterSalesStatus: string | null;
  };
}
