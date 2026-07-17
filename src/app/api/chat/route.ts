import OpenAI from "openai";
import { NextResponse, type NextRequest } from "next/server";
import {
  CHAT_MODEL,
  CUSTOMER_ASSISTANT_INSTRUCTIONS,
  formatCatalogContext,
  latestUserMessage,
  normalizeChatMessages,
} from "@/lib/chat/customer-assistant";
import { getProducts } from "@/lib/catalog/queries";

export const runtime = "nodejs";

const MAX_MESSAGES = 10;
const MAX_PRODUCTS = 6;

let openai: OpenAI | null | undefined;

export async function POST(request: NextRequest) {
  const client = getOpenAIClient();
  if (!client) {
    return NextResponse.json(
      { error: "Chat is not configured yet." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const messages = normalizeChatMessages(
    body && typeof body === "object" && "messages" in body
      ? body.messages
      : null,
  ).slice(-MAX_MESSAGES);
  const prompt = latestUserMessage(messages);

  if (!prompt) {
    return NextResponse.json(
      { error: "Send a message to start chatting." },
      { status: 400 },
    );
  }

  const products = await getProducts({
    query: prompt,
    limit: MAX_PRODUCTS,
  });
  const catalogContext = formatCatalogContext(products);

  try {
    const response = await client.responses.create({
      model: CHAT_MODEL,
      instructions: [
        CUSTOMER_ASSISTANT_INSTRUCTIONS,
        catalogContext,
      ].join("\n\n"),
      input: messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
      reasoning: { effort: "minimal" },
      max_output_tokens: 900,
      store: false,
    });
    const reply = response.output_text?.trim();

    if (!reply) {
      console.warn("Chat response completed without output text", {
        status: response.status,
        incompleteDetails: response.incomplete_details,
        usage: response.usage,
      });
    }

    return NextResponse.json({
      reply:
        reply ||
        "I could not generate an answer. Please contact Mustang Magic for help.",
      products: products.map((product) => ({
        name: product.name,
        partNumber: product.partNumber,
        url: `/products/${product.slug}`,
      })),
    });
  } catch (error) {
    console.error("Chat response failed", error);
    return NextResponse.json(
      { error: "Chat is temporarily unavailable." },
      { status: 502 },
    );
  }
}

function getOpenAIClient() {
  if (openai !== undefined) {
    return openai;
  }

  if (!process.env.OPENAI_API_KEY) {
    openai = null;
    return openai;
  }

  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  return openai;
}
