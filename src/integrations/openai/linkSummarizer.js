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
        content: 'Summarize saved links for a personal Notion database. Be concise, factual, and do not invent details that are not in the extracted content.',
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
