import {
  getRecentConversationTurns,
  insertConversationTurn,
} from '../integrations/supabase/conversations.js';

// retrieves recent conversation turns from the `conversation_turns` table in Supabase
export async function getConversationMemory(userId) {
  const turns = await getRecentConversationTurns(userId);

  return turns.map((turn) => ({
    user: turn.input,
    assistant: turn.output,
    agentName: turn.agent_name,
    createdAt: turn.created_at,
  }));
}

// inserts a new conversation turn into the same table in supabase
export async function saveConversationTurn(turn) {
  return insertConversationTurn(turn);
}