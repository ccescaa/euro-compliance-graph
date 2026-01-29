const fs = require('fs');
const csv = require('csv-parser');

// PATH CONFIGURATION
// 1. Where is the CSV? (Up one level from 'scripts', then into 'data')
const inputFile = './data/EurLex_all.csv';

// 2. Where should the JSON go? (Into the dashboard so React can see it)
const outputFile = './dashboard/src/data.json';

const nodes = new Map();
const links = [];
let rowCount = 0;

console.log(`🚀 SCRIPT STARTING...`);
console.log(`📖 Reading: ${inputFile}`);
console.log(`🎯 Saving to: ${outputFile}`);

if (!fs.existsSync(inputFile)) {
    console.error(`❌ FATAL: CSV file not found at ${inputFile}`);
    process.exit(1);
}

fs.createReadStream(inputFile)
    .pipe(csv())
    .on('data', (row) => {
        rowCount++;
        if (rowCount % 10000 === 0) process.stdout.write("."); // Progress dots

        const subject = row['Subject_matter'];
        const lawID = row['CELEX'];
        const title = row['Act_name'];
        const cites = row['Act_cites'];

        // FILTER: Keep Data & Tech laws
        if (!subject || (!subject.toLowerCase().includes('technology') && !subject.toLowerCase().includes('data protection'))) {
            return;
        }

        // NODE CREATION
        if (lawID && title) {
            // Smart Label Logic
            let smartLabel = title;
            if (title.includes(" on ")) smartLabel = title.split(" on ")[1];
            else if (title.includes(" regarding ")) smartLabel = title.split(" regarding ")[1];

            smartLabel = smartLabel.charAt(0).toUpperCase() + smartLabel.slice(1);
            if (smartLabel.length > 50) smartLabel = smartLabel.substring(0, 50) + "...";

            nodes.set(lawID, {
                id: lawID,
                label: smartLabel,  // For Graph
                full_title: title,  // For AI
                topics: subject,    // For Search
                val: 5
            });
        }

        // LINK CREATION
        if (cites) {
            cites.split(';').forEach(targetID => {
                const cleanTarget = targetID.trim();
                if (cleanTarget.length > 0) {
                    links.push({ source: lawID, target: cleanTarget });
                }
            });
        }
    })
    .on('end', () => {
        console.log(`\n🏁 DONE! Processed ${rowCount} rows.`);
        console.log(`📦 Generated ${nodes.size} laws and ${links.length} connections.`);

        const output = { nodes: Array.from(nodes.values()), links: links };
        fs.writeFileSync(outputFile, JSON.stringify(output, null, 2));
        console.log(`✅ Success! Data saved to ${outputFile}`);
    });