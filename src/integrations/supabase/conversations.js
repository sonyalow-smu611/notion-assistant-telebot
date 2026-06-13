import { supabase } from './client.js';

// retrieves recent conversation turns for a given user from the `conversation_turns` table in Supabase, allowing us to provide context to the agents when generating responses to Telegram messages. 
export async function getRecentConversationTurns(userId, limit = 20) {
  const { data, error } = await supabase
    .from('conversation_turns')
    .select('input, output, agent_name, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw error;
  }

  return (data ?? []).reverse();
}

// inserts a new conversation turn into the `conversation_turns` table in Supabase, including the user ID, chat ID, message ID, input text, output text, and agent name.
export async function insertConversationTurn(turn) {
  const { data, error } = await supabase
    .from('conversation_turns')
    .insert({
      user_id: turn.userId,
      chat_id: turn.chatId,
      message_id: turn.messageId,
      input: turn.input,
      output: turn.output,
      agent_name: turn.agentName,
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}