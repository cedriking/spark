import { ChatGPT } from "./services/ChatGPT";

const args = process.argv.slice(2); // Remove the first two elements (Node.js executable and script path)

const model = process.env.MODEL || "gpt-3.5-turbo";
export const numberOfAgents = args.length > 0 ? parseInt(args[0]) : 1;
console.log(`Number of agents: ${numberOfAgents}`);
console.log(`Model: ${model}`);

const chatGpt = new ChatGPT();
(async () => {
  const models = await chatGpt.getModels();
  if (!models.includes(model)) {
    throw Error(`Unrecognized OpenAI model: '${model}'`);
  }
})();
