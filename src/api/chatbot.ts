import apiClient from './index';

export interface ChatRequest {
    message: string;
    thread_id: string;
    guardian_id: number;
    elderly_id: number;
}

export interface ChatResponse {
    answer: string;
    threadId: string;
    sources: string[];
    confidence: number;
}

/**
 * 챗봇에게 메시지 전송
 */
export const sendMessage = async (data: ChatRequest): Promise<ChatResponse> => {
    const response = await apiClient.post<ChatResponse>('/api/chatbot/chat', data);
    return response.data;
};

export default {
    sendMessage,
};
