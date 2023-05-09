import { ChatGPT, ChatGPTMessage } from "./services/ChatGPT";

export const contextWindowSize = 8000;

const chatGPT = new ChatGPT();

export async function createChatCompletion(request: {
  messages: ChatGPTMessage[];
  temperature?: number;
}): Promise<string> {
  try {
    const response = await chatGPT.sendRequestToOpenAI(request.messages);
    // const response = await openai().createChatCompletion(request, options as any);
    return response.message;
  } catch (e) {
    console.error(e);
    throw e;
  }
}
