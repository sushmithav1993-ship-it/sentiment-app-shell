import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader } from 'lucide-react';
import axios from 'axios';

const ChatBot = () => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Hi! I can help you analyze customer sentiment across Shell stations in London. Ask me anything about reviews, ratings, common complaints, or specific stations.'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const suggestedQuestions = [
    "Which stations have the best ratings and why?",
    "What do customers complain about most across all stations?",
    "Which stations improved or got worse recently?",
    "Summarize sentiment for stations in North London.",
    "What are people saying about staff and service?",
    "Are there common issues with wait times or queues?"
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5001/api/chat', {
        question: userMessage
      });
      
      // Add assistant response
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: response.data.answer 
      }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error processing your question. Please try again.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestedQuestion = (question) => {
    setInput(question);
  };

  return (
    <div className="glass rounded-xl h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center mb-2">
          <div className="p-2 bg-yellow-500/20 rounded-lg mr-3">
            <Bot className="w-6 h-6 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold font-display">AI Assistant</h2>
            <p className="text-sm text-slate-400">Ask questions about customer reviews</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex items-start max-w-[80%] ${
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  message.role === 'user'
                    ? 'bg-blue-500/20 ml-3'
                    : 'bg-yellow-500/20 mr-3'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="w-4 h-4 text-blue-400" />
                ) : (
                  <Bot className="w-4 h-4 text-yellow-400" />
                )}
              </div>
              <div
                className={`px-4 py-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-500/20 text-blue-100'
                    : 'bg-slate-800 text-slate-200'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          </div>
        ))}
        
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-yellow-500/20 mr-3">
                <Bot className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="px-4 py-3 rounded-lg bg-slate-800">
                <Loader className="w-5 h-5 animate-spin text-yellow-400" />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length === 1 && (
        <div className="px-6 pb-4">
          <p className="text-xs text-slate-400 mb-2">Try asking:</p>
          <div className="space-y-2">
            {suggestedQuestions.slice(0, 3).map((question, index) => (
              <button
                key={index}
                onClick={() => handleSuggestedQuestion(question)}
                className="w-full text-left p-3 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg text-xs text-slate-300 transition border border-slate-700/50 hover:border-yellow-500/30"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-6 border-t border-slate-700">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about customer reviews..."
            className="flex-1 bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500 placeholder-slate-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-3 bg-yellow-500 hover:bg-yellow-600 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg transition flex items-center justify-center"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
        <p className="text-xs text-slate-500 mt-2">
          Powered by Claude AI • Responses are based on review analysis
        </p>
      </div>
    </div>
  );
};

export default ChatBot;
