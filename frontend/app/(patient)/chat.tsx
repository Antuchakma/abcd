import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import api from '@/services/api';

interface Message {
  id: number;
  messageText: string;
  responseText: string;
  createdAt: string;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    api.get('/api/chat/history')
      .then((res) => setMessages(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSend() {
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    try {
      const res = await api.post('/api/chat', { messageText: text, messageType: 'SYMPTOM' });
      setMessages((prev) => [...prev, res.data]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  if (loading) return <ActivityIndicator style={styles.loader} size="large" color="#1565C0" />;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={80}>
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.length === 0 && (
          <View style={styles.intro}>
            <Text style={styles.introIcon}>🤖</Text>
            <Text style={styles.introTitle}>AROGGO Health Assistant</Text>
            <Text style={styles.introText}>Describe your symptoms and I&apos;ll suggest possible conditions and the right specialist to visit.</Text>
          </View>
        )}

        {messages.map((msg) => (
          <View key={msg.id}>
            {/* User message */}
            <View style={styles.userBubble}>
              <Text style={styles.userText}>{msg.messageText}</Text>
              <Text style={styles.timestamp}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
            {/* Bot response */}
            <View style={styles.botBubble}>
              <Text style={styles.botText}>{msg.responseText}</Text>
            </View>
          </View>
        ))}

        {sending && (
          <View style={styles.botBubble}>
            <ActivityIndicator size="small" color="#1565C0" />
          </View>
        )}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Describe your symptoms..."
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={sending || !input.trim()}>
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loader: { flex: 1 },
  messages: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 8 },
  intro: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 16 },
  introIcon: { fontSize: 48, marginBottom: 12 },
  introTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  introText: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 20 },
  userBubble: { alignSelf: 'flex-end', backgroundColor: '#1565C0', borderRadius: 16, borderBottomRightRadius: 4, padding: 12, marginBottom: 4, maxWidth: '80%' },
  userText: { color: '#fff', fontSize: 14, lineHeight: 20 },
  timestamp: { color: '#BBDEFB', fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
  botBubble: { alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 16, borderBottomLeftRadius: 4, padding: 12, marginBottom: 12, maxWidth: '85%', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  botText: { color: '#1e293b', fontSize: 14, lineHeight: 22 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0', backgroundColor: '#fff', gap: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, backgroundColor: '#f8fafc', maxHeight: 100 },
  sendBtn: { backgroundColor: '#1565C0', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  sendIcon: { color: '#fff', fontSize: 16 },
});
