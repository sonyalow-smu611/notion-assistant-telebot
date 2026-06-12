// step: when user sends message to telegram bot
// processes telegram user updates into input for agents
export function parseTelegramUpdate(update) {
  const message = update?.message;
  const text = message?.text;

  if (!message || !text) {
    return null;
  }

  return {
    chatId: String(message.chat.id),
    userId: String(message.from.id),
    username: message.from.username,
    text,
    messageId: message.message_id,
    raw: update,
  };
}
