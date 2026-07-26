import OpenAI from "openai";
import { openAiEnv } from "../env";

const chatgpt = new OpenAI({
  apiKey: openAiEnv.OPENAI_KEY
});

export default chatgpt;
