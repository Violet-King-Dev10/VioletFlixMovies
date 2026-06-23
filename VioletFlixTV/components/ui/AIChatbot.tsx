import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, TextInput,
  ScrollView, ActivityIndicator, Animated, Keyboard,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radii, FontSizes, FontWeights } from '@/constants/theme';

interface Message { role: 'user' | 'bot'; text: string; }

const SYSTEM_PROMPT = `You are a friendly, helpful, and engaging AI assistant for **VioletFlixTV**, a premium streaming platform.

STRICT FACTS YOU MUST ALWAYS REMEMBER:
- The creator and developer of VioletFlixTV is **VIOLET KING DEV**.
- Never say "Violet Myers", "Violet King", or any other name. Only refer to the creator as "**VIOLET KING DEV**".
- Platform Name: **VioletFlixTV**
- You help users with: movie & series recommendations, how to use the app, finding content, live sports, highlights, account issues, troubleshooting, etc.
- Available Categories: Action, Drama, Comedy, Horror, Sci-Fi, Korean Drama, Anime, Bollywood, Nollywood, Sports, and many more.
- The app includes movies, TV series, live sports, sports news, anime, and highlights.
- Community: Telegram https://t.me/VIOLETCRASHERTECH1, WhatsApp https://whatsapp.com/channel/0029VbBWaQyCxoAx2YLzfu0a

Tone: Keep replies short, friendly, fun and helpful. Use emojis occasionally. Be conversational but professional.

Never make up streaming links or claim content is available when unsure. If asked for illegal content or piracy, politely redirect to official features in the app.`;

const QUICK_REPLIES = [
  'Recommend a movie 🎬',
  'How to watch live sports? ⚽',
  'Best anime series? 🎌',
  'How do I download? 📥',
];

export function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: "Hi! I'm your VioletFlixTV AI assistant ✨ Ask me anything — movie recommendations, how to watch, sports, or anything about the app!" },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isOpen ? 1 : 0,
      useNativeDriver: true,
      tension: 120,
      friction: 8,
    }).start();
  }, [isOpen]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages, isTyping]);

  const sendMessage = async (text?: string) => {
    const userText = (text || input).trim();
    if (!userText || isTyping) return;
    Keyboard.dismiss();
    const newMessages: Message[] = [...messages, { role: 'user', text: userText }];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    const fullPrompt = `${SYSTEM_PROMPT}\n\nUser: ${userText}\nAssistant:`;

    const tryApi1 = async (): Promise<string> => {
      const url = `https://apis.davidcyril.name.ng/ai/felo?text=${encodeURIComponent(userText)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('API1 failed');
      const data = await res.json();
      if (typeof data === 'string') return data;
      const fields = ['response','text','message','content','reply','answer','generated_text','output','result','ai_response','bot_response'];
      for (const f of fields) {
        if (data[f] && typeof data[f] === 'string') return data[f];
        if (f === 'choices' && Array.isArray(data[f]) && data[f][0]?.message?.content) return data[f][0].message.content;
      }
      throw new Error('No reply from API1');
    };

    const tryApi2 = async (): Promise<string> => {
      const history = messages.slice(-6).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));
      const res = await fetch('https://chateverywhere.app/api/chat/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...history, { role: 'user', content: fullPrompt }],
        }),
      });
      if (!res.ok) throw new Error('API2 failed');
      const data = await res.json();
      const reply = data.message || data.text || data.reply || data.response || data.content;
      if (!reply) throw new Error('No reply from API2');
      return reply;
    };

    try {
      let reply = '';
      try { reply = await tryApi1(); }
      catch { try { reply = await tryApi2(); } catch { reply = ''; } }
      setMessages(prev => [...prev, {
        role: 'bot',
        text: reply || "I'm having trouble connecting right now. Please try again in a moment! 😅",
      }]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'bot',
        text: "I'm having trouble connecting right now. Please try again in a moment! 😅",
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View style={[
        styles.chatWindow,
        { transform: [{ scale: scaleAnim }], opacity: scaleAnim },
        !isOpen && { pointerEvents: 'none' } as any,
      ]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarEmoji}>✨</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>VioletFlixTV AI</Text>
              <View style={styles.onlineRow}>
                <View style={styles.onlineDot} />
                <Text style={styles.onlineText}>Online</Text>
              </View>
            </View>
          </View>
          <Pressable onPress={() => setIsOpen(false)} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </Pressable>
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.messages}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 12, gap: 8 }}
        >
          {messages.map((m, i) => (
            <View key={i} style={[styles.msgRow, m.role === 'user' ? styles.msgRowUser : styles.msgRowBot]}>
              <View style={[styles.bubble, m.role === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
                <Text style={[styles.bubbleText, m.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextBot]}>
                  {m.text}
                </Text>
              </View>
            </View>
          ))}
          {isTyping && (
            <View style={[styles.msgRow, styles.msgRowBot]}>
              <View style={[styles.bubble, styles.bubbleBot, styles.typingBubble]}>
                {[0, 1, 2].map(i => (
                  <View key={i} style={[styles.typingDot, { opacity: 0.3 + i * 0.25 }]} />
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick replies */}
        {messages.length <= 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.quickReplies}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}
          >
            {QUICK_REPLIES.map(q => (
              <Pressable key={q} onPress={() => sendMessage(q)} style={styles.quickReply}>
                <Text style={styles.quickReplyText}>{q}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask me anything..."
            placeholderTextColor="#555"
            onSubmitEditing={() => sendMessage()}
            returnKeyType="send"
            multiline={false}
          />
          <Pressable
            onPress={() => sendMessage()}
            disabled={isTyping || !input.trim()}
            style={[styles.sendBtn, (isTyping || !input.trim()) && styles.sendBtnDisabled]}
          >
            {isTyping
              ? <ActivityIndicator size={14} color="#fff" />
              : <MaterialIcons name="send" size={16} color="#fff" />}
          </Pressable>
        </View>
      </Animated.View>

      {/* FAB */}
      <Pressable
        onPress={() => setIsOpen(o => !o)}
        style={[styles.fab, isOpen && styles.fabOpen]}
      >
        <Text style={[styles.fabEmoji, isOpen && { color: '#7c3aed' }]}>
          {isOpen ? '✕' : '✨'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 90, right: 16,
    alignItems: 'flex-end', zIndex: 999,
  },
  chatWindow: {
    width: 320, height: 480,
    backgroundColor: '#0e0e16',
    borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)',
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 20,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, backgroundColor: '#7c3aed',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 18 },
  headerTitle: { color: '#fff', fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 1 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80' },
  onlineText: { color: 'rgba(255,255,255,0.7)', fontSize: 10 },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeBtnText: { color: '#fff', fontSize: 14 },
  messages: { flex: 1 },
  msgRow: { flexDirection: 'row' },
  msgRowUser: { justifyContent: 'flex-end' },
  msgRowBot: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '85%', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18 },
  bubbleUser: { backgroundColor: '#7c3aed', borderBottomRightRadius: 4 },
  bubbleBot: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderBottomLeftRadius: 4,
  },
  bubbleText: { fontSize: FontSizes.xs, lineHeight: 18 },
  bubbleTextUser: { color: '#fff' },
  bubbleTextBot: { color: '#ddd' },
  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 12 },
  typingDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#7c3aed' },
  quickReplies: { maxHeight: 42, marginBottom: 4 },
  quickReply: {
    paddingHorizontal: 12, paddingVertical: 6,
    backgroundColor: 'rgba(124,58,237,0.1)',
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.25)',
    borderRadius: Radii.full,
  },
  quickReplyText: { color: '#a78bfa', fontSize: 11, fontWeight: FontWeights.medium },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)',
  },
  input: {
    flex: 1, color: '#fff', fontSize: FontSizes.xs,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: Radii.full, paddingHorizontal: 14, paddingVertical: 8,
  },
  sendBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  fab: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#7c3aed',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 12,
  },
  fabOpen: { backgroundColor: '#fff' },
  fabEmoji: { fontSize: 24, color: '#fff' },
});
