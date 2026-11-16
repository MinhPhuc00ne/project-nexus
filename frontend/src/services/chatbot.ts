import axios from 'axios';
import api, { API_BASE_URL } from './api';
import { getApiErrorMessage } from '../lib/apiErrors';
export interface ChatbotAction {
  type: 'REQUEST_SUPPORT' | 'SELECT_ORDER' | 'LOGIN' | 'NAVIGATE';
  endpoint?: string;
  path?: string;
  label?: string;
  auto?: boolean;
}

export interface ChatbotReply {
  reply: string;
  engine: 'FAQ' | 'GEMINI' | 'ORDER';
  topic: string;
  sources: { id: string; title: string }[];
  actions: ChatbotAction[];
  order?: {
    id: string;
    status: string;
    shipmentStatus: string | null;
    waybillCode: string | null;
    afterSalesStatus: string | null;
  };
}
export interface ChatbotCapabilities {
  aiConfigured: boolean;
  topics: { id: string; title: string }[];
}
export async function getChatbotCapabilities(signal?: AbortSignal): Promise<ChatbotCapabilities> {
  const response = await api.get<{ data: ChatbotCapabilities }>('/chat/bot/capabilities', {
    signal,
  });
  return response.data.data;
}
export interface ChatbotHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendChatbotMessage(
  message: string,
  guest: boolean,
  orderId?: string,
  signal?: AbortSignal,
  history?: ChatbotHistoryItem[],
): Promise<ChatbotReply> {
  const body = {
    message,
    ...(!guest && orderId ? { orderId } : {}),
    ...(history && history.length > 0 ? { history: history.slice(-12) } : {}),
  };
  // Guest requests do not attach a session token or trigger token refresh.
  try {
    const response = guest
      ? await axios.post<{ data: ChatbotReply }>(`${API_BASE_URL}/chat/bot/guest/messages`, body, {
          signal,
          timeout: 20000,
        })
      : await api.post<{ data: ChatbotReply }>('/chat/bot/messages', body, { signal });
    return response.data.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.code !== 'ERR_CANCELED') {
      const fallback =
        error.response?.status === 429
          ? 'Bạn gửi quá nhiều câu hỏi. Vui lòng chờ một phút rồi thử lại.'
          : 'Không thể kết nối trợ lý NEXUS. Vui lòng thử lại.';
      throw new Error(getApiErrorMessage(error.response?.data, fallback));
    }
    throw error;
  }
}
