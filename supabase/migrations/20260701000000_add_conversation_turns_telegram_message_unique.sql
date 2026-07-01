create unique index if not exists conversation_turns_chat_message_id_key
on conversation_turns (chat_id, message_id);
