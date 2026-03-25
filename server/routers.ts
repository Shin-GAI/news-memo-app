import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "./_core/llm";
import type { SummarizeResponse, MemoContent } from "../shared/types";

// Fetch article content from URL
async function fetchArticleContent(url: string): Promise<{ title: string; content: string }> {
  try {
    const origin = new URL(url).origin;
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
        "Accept-Encoding": "gzip, deflate, br",
        Referer: origin,
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "same-origin",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1",
        "cache-control": "max-age=0",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    let title = titleMatch ? titleMatch[1].trim() : "제목 없음";
    title = title.replace(/\s*[-|–]\s*[^-|–]+$/, "").trim();

    // Extract meta description and og tags
    const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
    const metaOgDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    const metaOgTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);

    if (metaOgTitleMatch) {
      title = metaOgTitleMatch[1].trim();
    }

    // Extract article body text - remove non-content elements
    let cleanHtml = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "");

    // Try to find article content
    const articleMatch =
      cleanHtml.match(/<article[^>]*>([\s\S]*?)<\/article>/i) ||
      cleanHtml.match(/<main[^>]*>([\s\S]*?)<\/main>/i) ||
      cleanHtml.match(/<div[^>]*class=["'][^"']*(?:article|content|body|post)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);

    const contentHtml = articleMatch ? articleMatch[1] : cleanHtml;

    // Strip remaining HTML tags
    const text = contentHtml
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();

    const description = metaDescMatch?.[1] || metaOgDescMatch?.[1] || "";
    const content = description ? `${description}\n\n${text.slice(0, 3000)}` : text.slice(0, 3000);

    return { title, content };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("[fetchArticleContent] Error fetching", url, "->", detail);
    throw new Error(`기사를 불러오는 데 실패했습니다. (${detail})`);
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  news: router({
    // Fetch article content only (used by on-device AI path)
    fetchArticle: publicProcedure
      .input(z.object({ url: z.string().url("올바른 URL을 입력해주세요") }))
      .mutation(async ({ input }) => {
        return await fetchArticleContent(input.url);
      }),

    summarize: publicProcedure
      .input(
        z.object({
          url: z.string().url("올바른 URL을 입력해주세요"),
          language: z.enum(["ko", "en"]).default("ko"),
          summaryLength: z.enum(["short", "medium", "long"]).default("medium"),
          summaryTone: z.enum(["expert", "casual"]).default("expert"),
        })
      )
      .mutation(async ({ input }): Promise<SummarizeResponse> => {
        const { url, language, summaryLength, summaryTone } = input;

        console.log("[summarize] start url:", url);
        // Fetch article content
        let title: string, content: string;
        try {
          ({ title, content } = await fetchArticleContent(url));
        } catch (err) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: err instanceof Error ? err.message : "기사를 불러오는 데 실패했습니다.",
          });
        }

        const langInstruction =
          language === "ko"
            ? "모든 응답은 반드시 한국어로 작성하세요."
            : "Write all responses in English.";

        const toneInstruction = summaryTone === "expert" 
          ? "Use formal, expert tone: write in '~함.' format (e.g., '분석함.', '제시함.') instead of casual tone."
          : "Use casual, friendly tone: write in conversational style with '~해요' or '~해' format.";

        const systemPrompt = `You are an expert content analyst and professional social media strategist. ${langInstruction}
Your task is to analyze news articles, categorize them, and create professional social media posts.
Always respond with valid JSON only, no markdown code blocks, no extra text outside JSON.
${toneInstruction}`;

        const userPrompt = `Analyze this news article and create social media posts.

Article URL: ${url}
Article Title: ${title}
Article Content:
${content}

Respond with this exact JSON structure (no markdown, pure JSON):
{
  "articleTitle": "clean article title (max 100 chars)",
  "summary": "3-5 key insights in outline format (개조식), using numbers. Example: 1. 첫 번째 인사이트\n2. 두 번째 인사이트\n3. 세 번째 인사이트 (max 400 chars total)",
  "category": {
    "major": "major category (기술, 경제, 사회, 정치, 문화, 과학, 스포츠 중 선택)",
    "minor": "minor category (AI, 주식, 정책, 법안, 영화, 우주, 축구 등)"
  },
  "memos": [
    {
      "platform": "linkedin",
      "text": "Professional LinkedIn post. Length setting is '${summaryLength}': short=150-200 chars, medium=250-350 chars, long=400-500 chars. Start with a hook, include key insights in outline format (1. 2. 3.), end with a thought-provoking question or call-to-action. ALWAYS include the source link at the end: 🔗 SOURCE: ${url}. Add 3-5 relevant hashtags."
    },
    {
      "platform": "twitter",
      "text": "Concise Twitter/X post. Length setting is '${summaryLength}': short=max 150 chars, medium=max 250 chars, long=max 280 chars. Punchy, engaging, with 2-3 hashtags. ALWAYS include source link: ${url}."
    },
    {
      "platform": "general",
      "text": "Detailed general memo. Length setting is '${summaryLength}': short=150-250 chars, medium=300-500 chars, long=600-800 chars. Comprehensive summary with key insights in outline format, explain implications and significance, include specific data/numbers if available. ALWAYS include source link at the end: SOURCE: ${url}."
    }
  ]
}`;

        console.log("[summarize] fetched article, invoking LLM for url:", url);
        let llmResult: Awaited<ReturnType<typeof invokeLLM>>;
        try {
          llmResult = await invokeLLM({
            messages: [
              { role: "system", content: [{ type: "text", text: systemPrompt }] },
              { role: "user", content: [{ type: "text", text: userPrompt }] },
            ],
          });
        } catch (err) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: err instanceof Error ? err.message : "AI 요약 중 오류가 발생했습니다.",
          });
        }

        const responseText = (() => {
          const choice = llmResult.choices?.[0];
          if (!choice) return "";
          const content = choice.message.content;
          if (typeof content === "string") return content;
          if (Array.isArray(content)) {
            return content
              .filter((c): c is { type: "text"; text: string } => c.type === "text")
              .map((c) => c.text)
              .join("");
          }
          return "";
        })();

        // Parse JSON response
        let parsed: SummarizeResponse;
        try {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error("No JSON found in response");
          parsed = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
          console.error("[summarize] JSON parse error:", parseError);
          // Fallback response
          parsed = {
            articleTitle: title,
            summary: `• ${title}\n• 기사 내용을 분석했습니다.\n• 원문 링크를 확인해주세요.`,
            category: {
              major: "기타",
              minor: "미분류",
            },
            memos: [
              {
                platform: "linkedin",
                text: `흥미로운 기사를 발견했습니다.\n\n${title}\n\n${url}\n\n#뉴스 #인사이트`,
              },
              {
                platform: "twitter",
                text: `${title.slice(0, 100)}\n\n${url}\n\n#뉴스`,
              },
              {
                platform: "general",
                text: `${title}\n\n출처: ${url}`,
              },
            ] as MemoContent[],
          };
        }

        return parsed;
      }),
  }),
});

export type AppRouter = typeof appRouter;
