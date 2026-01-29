import React, { useState, useRef, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import ChatInterface from './ChatInterface';
import graphDataFile from './data.json';

function App() {
  // 1. STATE
  const [showChat, setShowChat] = useState(false);
  const fgRef = useRef();
  const graphData = useMemo(() => graphDataFile, []);

  // New State: If this has a value, the graph will zoom to it on load
  const [jumpToNodeId, setJumpToNodeId] = useState(null);

  const [highlightNodes, setHighlightNodes] = useState(new Set());
  const [highlightLinks, setHighlightLinks] = useState(new Set());
  const [hoverNode, setHoverNode] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNode, setSelectedNode] = useState(null);

  // 2. THE BRIDGE FUNCTION
  // This function is passed to the Chat.
  // It says: "Close the chat AND memorize which node we want to visit."
  const handleChatJump = (nodeId) => {
      setJumpToNodeId(nodeId); // Remember the target
      setShowChat(false);      // Switch back to graph
  };

  // 3. EFFECT: Handle the Zoom AFTER the graph renders
  // We use a small timeout to let the graph load first
  React.useEffect(() => {
      if (!showChat && jumpToNodeId && fgRef.current) {
          // Find the node object in the data
          const node = graphData.nodes.find(n => n.id === jumpToNodeId);
          if (node) {
              setTimeout(() => {
                  handleNodeClick(node); // Reuse your existing click logic
                  setJumpToNodeId(null); // Reset the trigger
              }, 500); // 0.5s delay to make it smooth
          }
      }
  }, [showChat, jumpToNodeId, graphData]);

  // --- RENDER CHAT ---
  if (showChat) {
      // We pass the new handleChatJump function down
      return <ChatInterface
                onBack={() => setShowChat(false)}
                onJump={handleChatJump}
             />;
  }
  // --- OTHERWISE, SHOW THE GRAPH DASHBOARD ---

  const handleNodeHover = (node) => {
    if ((!node && !hoverNode) || (node && hoverNode === node)) return;

    if (node) {
        const neighborNodes = new Set();
        const neighborLinks = new Set();
        graphData.links.forEach(link => {
            if (link.source.id === node.id || link.target.id === node.id) {
                neighborLinks.add(link);
                neighborNodes.add(link.source.id);
                neighborNodes.add(link.target.id);
            }
        });
        setHoverNode(node);
        setHighlightNodes(neighborNodes);
        setHighlightLinks(neighborLinks);
    } else {
        setHoverNode(null);
        setHighlightNodes(new Set());
        setHighlightLinks(new Set());
    }
  };

  const handleSearch = () => {
    if (!searchTerm) return;
    const term = searchTerm.toLowerCase();
    const node = graphData.nodes.find(n =>
      (n.label && n.label.toLowerCase().includes(term)) ||
      (n.full_title && n.full_title.toLowerCase().includes(term)) ||
      (n.id && n.id.toLowerCase().includes(term))
    );

    if (node) {
      handleNodeClick(node);
    } else {
      alert(`No law found matching "${searchTerm}"`);
    }
  };

  const handleNodeClick = (node) => {
    setSelectedNode(node);
    if (fgRef.current) {
      fgRef.current.centerAt(node.x, node.y, 1000);
      fgRef.current.zoom(6, 2000);
    }
  };

  return (
    <div style={{ height: "100vh", width: "100vw", backgroundColor: "#050505", overflow: "hidden", fontFamily: "sans-serif" }}>

      {/* HEADER */}
      <div style={{ position: "absolute", left: 20, top: 20, zIndex: 10, color: "white" }}>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: "bold", background: "linear-gradient(90deg, #4a90e2, #9013fe)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          🇪🇺 Euro-Compliance Graph
        </h1>

        {/* NEW BUTTON TO OPEN CHAT PAGE */}
        <div style={{ marginTop: "15px", display: "flex", gap: "10px" }}>
            <button
                onClick={() => setShowChat(true)}
                style={{
                    padding: "10px 20px", background: "#9013fe", color: "white",
                    border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold",
                    boxShadow: "0 4px 15px rgba(144, 19, 254, 0.4)"
                }}
            >
                💬 Open AI Assistant
            </button>
        </div>

        {/* SEARCH BAR */}
        <div style={{ marginTop: "15px", display: "flex", gap: "5px" }}>
          <input
            type="text"
            placeholder="Search Law..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            style={{ padding: "10px", borderRadius: "8px", border: "1px solid #333", background: "#1a1a1a", color: "white", outline: "none", width: "220px" }}
          />
          <button onClick={handleSearch} style={{ padding: "0 15px", background: "#4a90e2", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>Find</button>
        </div>
      </div>

      {/* SIDEBAR DETAILS */}
      {selectedNode && (
        <div style={{
          position: "absolute", right: 20, top: 20, bottom: 20, width: "350px",
          backgroundColor: "rgba(15, 15, 15, 0.95)", border: "1px solid #333", borderRadius: "12px",
          padding: "25px", color: "white", zIndex: 20, overflowY: "auto",
          boxShadow: "0 10px 40px rgba(0,0,0,0.8)", backdropFilter: "blur(10px)"
        }}>
          <button onClick={() => setSelectedNode(null)} style={{ float: "right", background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: "1.2rem" }}>✕</button>
          <h4 style={{ color: "#4a90e2", marginTop: 0, fontSize: "0.8rem", textTransform: "uppercase" }}>Selected Law</h4>
          <h2 style={{ marginTop: "10px", fontSize: "1.3rem", lineHeight: "1.4" }}>{selectedNode.label}</h2>

          <div style={{ marginTop: "20px", padding: "15px", background: "#222", borderRadius: "8px", border: "1px solid #333" }}>
            <p style={{ margin: 0, color: "#888", fontSize: "0.7rem", fontWeight: "bold" }}>FULL LEGAL TITLE</p>
            <p style={{ margin: "8px 0 0 0", fontSize: "0.9rem", lineHeight: "1.5", color: "#ddd" }}>{selectedNode.full_title}</p>
          </div>

          <div style={{ marginTop: "20px" }}>
            <p style={{ margin: 0, color: "#888", fontSize: "0.7rem", fontWeight: "bold" }}>ID</p>
            <p style={{ margin: "5px 0 0 0", fontFamily: "monospace", fontSize: "1.1rem", color: "#4a90e2" }}>{selectedNode.id}</p>
          </div>

          <a href={`https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX:${selectedNode.id}`} target="_blank" rel="noreferrer" style={{ display: "block", marginTop: "25px", padding: "12px", background: "#4a90e2", color: "white", textAlign: "center", borderRadius: "8px", textDecoration: "none", fontWeight: "bold" }}>
            📖 Read on EUR-Lex
          </a>
        </div>
      )}

      {/* GRAPH ENGINE */}
      <ForceGraph2D
        ref={fgRef}
        graphData={graphData}
        nodeLabel="label"
        nodeColor={node => {
            if (hoverNode) {
                return (node === hoverNode || highlightNodes.has(node.id)) ? "#4a90e2" : "rgba(255, 255, 255, 0.1)";
            }
            return node === selectedNode ? "#ff0000" : "#4a90e2";
        }}
        nodeRelSize={6}
        linkColor={link => hoverNode && highlightLinks.has(link) ? "#ffffff" : "rgba(255, 255, 255, 0.02)"}
        linkWidth={link => hoverNode && highlightLinks.has(link) ? 2 : 1}
        backgroundColor="#050505"
        onNodeHover={handleNodeHover}
        onNodeClick={handleNodeClick}
        d3VelocityDecay={0.3}
        cooldownTicks={100}
        onEngineStop={() => fgRef.current.zoomToFit(400)}
        d3Force="charge"
        d3ForceStrength={-100}
      />
    </div>
  );
}

export default App;