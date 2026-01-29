const express = require('express');
const cors = require('cors');
const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
app.use(cors());
app.use(express.json());

// 1. LOAD THE GRAPH DATA
// I updated this to match the location you mentioned: scripts/data.json
const graphData = JSON.parse(fs.readFileSync('./dashboard/src/data.json', 'utf-8'));
console.log(`✅ Server loaded ${graphData.nodes.length} laws and ${graphData.links.length} connections`);

if (graphData.nodes.length > 0) {
    console.log("------------------------------------------------");
    console.log("🧐 DATA INSPECTION (First Node):");
    console.log(graphData.nodes[0]);
    console.log("------------------------------------------------");
}

// 2. THE SEARCH ALGORITHM
function findContext(query) {
    if (!query) return { nodes: [], links: [] };

    const queryLower = query.toLowerCase();

    // Step A. Find relevant nodes
    const directMatches = graphData.nodes.filter(node => {
        const queryLower = query.toLowerCase().trim(); // Trim spaces

        // Check if field exists AND matches the keyword
        const inLabel = node.label && node.label.toLowerCase().includes(queryLower);
        const inTitle = node.full_title && node.full_title.toLowerCase().includes(queryLower);
        const inTopics = node.topics && node.topics.toLowerCase().includes(queryLower);

        // --- NEW: Allow searching by ID ---
        const inID = node.id && node.id.toLowerCase().includes(queryLower);

        return inLabel || inTitle || inTopics || inID;
    });

    // Step B. Find their neighbors (Graph Traversal)
    let contextNodes = [...directMatches];
    let contextLinks = [];

    directMatches.forEach(node => {
        // Find links where this node is the SOURCE
        const relevantLinks = graphData.links.filter(l => l.source === node.id);
        contextLinks.push(...relevantLinks);

        // Add the TARGET nodes of those links (The citations)
        relevantLinks.forEach(link => {
            const targetNode = graphData.nodes.find(n => n.id === link.target);
            if (targetNode) contextNodes.push(targetNode);
        });
    });

    // Remove duplicates
    contextNodes = [...new Set(contextNodes)];

    return {
        nodes: contextNodes.slice(0, 15),
        links: contextLinks.slice(0, 10)
    };
}

// 3. THE API ENDPOINT
app.post('/api/ask', async (req, res) => {
    // --- FIX START ---
    // We must get the question FIRST before we can use it.
    const { question } = req.body;
    console.log("User asked:", question);

    if (!question) {
        return res.status(400).json({ error: "No question provided" });
    }

    // Now it is safe to search
    const context = findContext(question);
    // --- FIX END ---

    console.log(`📚 Found ${context.nodes.length} relevant laws in graph`);

    //if (context.nodes.length === 0) {
    //   return res.json({ answer: "I couldn't find any laws in the database matching that topic." });
    //}

    // B. AUGMENT THE PROMPT
    // Map over 'nodes' to get the labels
    const contextString = context.nodes.map(n =>
        `- Law ID: ${n.id}\n  Short Label: ${n.label}\n  Full Title: ${n.full_title}\n  Topics: ${n.topics}`
    ).join('\n\n');

    const linksString = context.links.map(l =>
        `- ${l.source} cites ${l.target}`
    ).join('\n');

    const prompt = `
    You are an expert EU Legal Consultant. Your goal is to explain complex legal data clearly to a user.

    SOURCE DATA (The only truth):
    ${contextString}

    USER QUESTION: "${question}"

    INSTRUCTIONS:
    1. **Structure**: Use Markdown headers (###) and bullet points. Do not write big walls of text.
    2. **Summary**: Start with a 1-sentence direct answer.
    3. **Details**: Explain the key details using bullet points.
    4. **Links**: When you cite a law ID (e.g. 32018D0514), you MUST make it a clickable Markdown link like this:
       [32018D0514](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32018D0514)
    5. **Honesty**: If the provided laws do not answer the question, admit it.
    \`;
    `;
    console.log('DEBUG')
    console.log(prompt)

    // C. GENERATE with Ollama
    try {
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: "llama3",
                prompt: prompt,
                stream: false
            })
        });
        const data = await response.json();
        res.json({ answer: data.response, context: context });

    } catch (error) {
        console.error("❌ Ollama Error:", error.message);
        res.status(500).json({ error: 'Is Ollama running? (run "ollama run llama3")' });
    }
});

app.listen(3001, () => console.log('🚀 API Server is running on port 3001'));