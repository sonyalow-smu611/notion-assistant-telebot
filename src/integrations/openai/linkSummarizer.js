import { openai } from './client.js';

function buildInput({ url, sourceType, title, description, text, extractionStatus }) {
  return [
    `URL: ${url}`,
    `Source type: ${sourceType}`,
    `Extraction status: ${extractionStatus}`,
    `Title: ${title || 'Unknown'}`,
    `Description: ${description || 'None'}`,
    `Content: ${text || 'No readable content extracted.'}`,
  ].join('\n');
}

export async function summarizeLink(extracted) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Summarize saved links for a personal Notion database. Be concise, factual, and do not invent details that are not in the extracted content. You are a technical content analyst. When given a social media video URL, extract and structure the meaningful content into a concise proposal-style summary document. Include one to two sentences capturing the core idea or argument of the video. Bullet each distinct concept, insight, or claim made in the video. Include steps if video is instructional or lists a process. Include any tools, resources, or references mentioned in the video. Conclude with a one-sentence takeaway for the audience. If the video is concept-focused (not a tutorial), omit the Steps section and expand Key Points.',
      },
      {
        role: 'user',
        content: `Create a detailed summary for this link. Return plain text only with 2-4 short paragraphs.\n\n${buildInput(extracted)}`,
      },
    ],
    temperature: 0.2,
  });

  return response.choices?.[0]?.message?.content?.trim() || 'No summary was generated.';
}
