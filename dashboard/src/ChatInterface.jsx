import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

const ChatInterface = ({ onBack, onJump }) => {
  const [messages, setMessages] = useState([
    { role: 'system', text: 'Hello! I am your EU Legal Assistant. I can analyze the laws in your graph.' }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3001/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMsg.text })
      });

      const data = await response.json();

      setMessages(prev => [...prev, {
        role: 'ai',
        text: data.answer,
        context: data.context
      }]);

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'ai', text: "Error: Is your node server running on port 3001?" }]);
    }
    setLoading(false);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: "100vw", height: "100vh",
      backgroundColor: "#111", zIndex: 200, display: "flex", flexDirection: "column",
      fontFamily: 'sans-serif'
    }}>

      {/* HEADER */}
      <div style={{
        padding: "20px 40px", borderBottom: "1px solid #333", background: "#1a1a1a",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
            <button
                onClick={onBack}
                style={{
                    background: "#333", border: "1px solid #555", color: "white",
                    padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold"
                }}
            >
                ← Back to Graph
            </button>
            <h2 style={{ color: "white", margin: 0 }}>⚖️ EU Legal Assistant</h2>
        </div>
      </div>

      {/* MESSAGES AREA */}
      <div style={{
        flex: 1, padding: "40px", overflowY: "auto",
        maxWidth: "1000px", width: "100%", margin: "0 auto"
      }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: "30px", textAlign: m.role === 'user' ? "right" : "left" }}>

            <div style={{
              display: "inline-block", padding: "25px", borderRadius: "12px",
              background: m.role === 'user' ? "#4a90e2" : "#222", color: "white",
              maxWidth: "75%", textAlign: "left", fontSize: "16px", lineHeight: "1.6",
              boxShadow: "0 4px 15px rgba(0,0,0,0.3)"
            }}>
              {/* --- CORRECTED MARKDOWN COMPONENT --- */}
              {m.role === 'ai' ? (
                 <ReactMarkdown
                    components={{
                        // 1. Headers (Blue)
                        h3: ({node, ...props}) => <h3 style={{color: '#4a90e2', marginTop: 10}} {...props} />,

                        // 2. Bold Text (Gold)
                        strong: ({node, ...props}) => <strong style={{color: '#ffcc00'}} {...props} />,

                        // 3. Lists (Spaced out)
                        li: ({node, ...props}) => <li style={{marginBottom: '8px'}} {...props} />,

                        // 4. SMART LINKS (Fixed Closure Here)
                        a: ({node, ...props}) => {
                            const lawId = String(props.children).trim();
                            return (
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
                                    {/* The Web Link */}
                                    <a
                                        {...props}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{ color: '#4a90e2', fontWeight: 'bold' }}
                                    >
                                        {props.children}
                                    </a>

                                    {/* The Graph Button */}
                                    <button
                                        onClick={() => onJump(lawId)}
                                        style={{
                                            background: "rgba(255,255,255,0.1)",
                                            border: "1px solid #4a90e2",
                                            color: "#4a90e2",
                                            borderRadius: "4px",
                                            padding: "2px 6px",
                                            fontSize: "10px",
                                            cursor: "pointer",
                                            fontWeight: "bold",
                                            marginLeft: "5px"
                                        }}
                                        title="View in Graph"
                                    >
                                        🔍 Graph
                                    </button>
                                </span>
                            );
                        }
                    }}
                 >
                    {m.text}
                 </ReactMarkdown>
              ) : (
                 m.text
              )}
              {/* ------------------------------------ */}
            </div>

            {/* CITATIONS */}
            {m.context && m.context.nodes && m.context.nodes.length > 0 && (
              <div style={{ marginTop: "10px", fontSize: "13px", color: "#888" }}>
                📚 <strong>Sources:</strong> {m.context.nodes.map(n => n.id).join(", ")}
              </div>
            )}
          </div>
        ))}
        {loading && <div style={{ color: "#666", textAlign: "center", marginTop: "20px" }}>AI is analyzing legal documents...</div>}
      </div>

      {/* INPUT AREA */}
      <div style={{ padding: "30px", background: "#1a1a1a", borderTop: "1px solid #333" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto", display: "flex", gap: "10px" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask a question..."
              style={{
                  flex: 1, padding: "15px", borderRadius: "8px", border: "1px solid #444",
                  background: "#050505", color: "white", outline: "none", fontSize: "16px"
              }}
            />
            <button
                onClick={sendMessage}
                style={{
                    background: "#4a90e2", border: "none", color: "white",
                    padding: "0 30px", borderRadius: "8px", cursor: "pointer", fontSize: "20px"
                }}
            >
                →
            </button>
        </div>
      </div>

    </div>
  );
};

export default ChatInterface;