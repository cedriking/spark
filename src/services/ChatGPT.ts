/**
 * ChatGPT.ts
 * by @Cedriking <https://github.com/cedriking>
 */
import { Client } from "undici";
import { Readable } from "stream";

export type ChatGPTAgent = "user" | "system" | "assistant";

export interface ChatGPTMessage {
  role: ChatGPTAgent;
  content: string;
}

export interface OpenAIStreamPayload {
  model: string;
  messages: ChatGPTMessage[];
  temperature: number;
  top_p: number;
  frequency_penalty: number;
  presence_penalty: number;
  max_tokens: number;
  stream: boolean;
  n: number;
}

export interface ChatMode {
  name: string;
  welcomeMessage: string;
  promptStart: string;
}

export class ChatGPT {
  private payload: OpenAIStreamPayload = {
    model: process.env.MODEL || "gpt-3.5-turbo",
    messages: [],
    temperature: 0.7,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0,
    max_tokens: 2048,
    stream: true,
    n: 1,
  };

  private client: Client;

  constructor() {
    this.client = new Client(process.env.SERVER || "http://localhost:8080");
  }

  async getModels(): Promise<string[]> {
    const res = await this.client.request({
      path: "/models",
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const { body, statusCode } = res;

    if (statusCode !== 200) {
      throw new Error(statusCode.toString());
    }

    const response: {
      object: string;
      data: {
        id: string;
        object: string;
      }[];
    } = await body.json();

    return response.data
      .filter((model) => model.object === "model")
      .map((model) => model.id);
  }

  async sendRequestToOpenAI(
    messages: ChatGPTMessage[],
    temperature?: number,
    onProgress?: (partialResponse: string, messageId: string) => void
  ): Promise<{ message: string; messageId: string }> {
    return new Promise(async (resolve, reject) => {
      let stream: Readable | undefined;
      let isError = true;

      while (isError && messages.length > 1) {
        console.log(
          `Trying to get completion with ${messages.length} messages...`
        );
        // Copy default payload
        const payload = { ...this.payload };
        payload.messages = messages;

        if (temperature) {
          payload.temperature = temperature;
        }

        try {
          stream = await this.getCompletion(payload);
          isError = false;
        } catch (error: any) {
          // remove the messages at pos 1 and add it to removedMessages
          if (error.toString().includes("400")) {
            // remove the messages at pos 1 and update messages
            messages.splice(1, 1);
            isError = true;
          } else {
            console.log(`Error getting completion: ${error}`);
            break;
          }
        }
      }

      if (!stream) {
        reject("Error getting completion");
        return;
      }

      let text = "";
      let messageId = "";

      // Send the stream message to onProgress, after stream is complete save it to this.messages
      stream.on("data", (data: string) => {
        const regex = /{.*}/g;
        const match = data.match(regex);

        if (match) {
          const jsonData: {
            id: string;
            choices: {
              delta: {
                content: string;
              };
            }[];
          } = JSON.parse(match[0]);

          if (!messageId) {
            messageId = cuid();
          }

          try {
            text += jsonData.choices[0].delta?.content || "";
          } catch (error) {
            console.error("Error parsing response:", error);
          }

          if (onProgress) {
            onProgress(text, messageId);
          }
        } else {
          console.log(data);
        }
      });

      stream.on("error", (error: Error) => {
        console.error("Stream error:", error);
        reject(error);
      });

      stream.on("end", async () => {
        resolve({ message: text, messageId });
      });
    });
  }

  private async getCompletion(
    payload: OpenAIStreamPayload = this.payload
  ): Promise<Readable> {
    const res = await this.client
      .request({
        path: "/v1/chat/completions",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      .catch(async (error) => {
        console.error("Error getting completion:", error);
        throw error;
      });

    console.log(res);
    const { body, statusCode } = res;

    if (statusCode !== 200) {
      throw new Error(statusCode.toString());
    }

    body.setEncoding("utf8");
    return body;
  }
}

function cuid(): string {
  const cuid: any = {};
  // Timestamp
  const timestamp = ((new Date().getTime() / 1000) | 0).toString(16);

  // Unique id
  let uniqid = "";
  for (let i = 0; i < 12; i++) {
    uniqid += Math.floor(Math.random() * 16).toString(16);
  }

  // Counter
  let counter = "";
  if (typeof cuid.counter === "undefined") {
    cuid.counter = Math.floor(Math.random() * 256);
  }
  counter = cuid.counter.toString(16);
  cuid.counter = (cuid.counter + 1) % 256;

  // Return the CUID
  return timestamp + "xxxxxxxxxxxx".replace(/[x]/g, uniqid) + counter;
}
