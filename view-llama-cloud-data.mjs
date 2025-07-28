// File: view-llama-cloud-data.mjs
// Description: A script to connect to a LlamaCloud index, view its data, and save it to a CSV file.

import { LlamaCloudIndex } from "llamaindex";
import dotenv from "dotenv";
import fs from "fs"; // ADDED: Node.js File System module to write files
import path from "path"; // ADDED: Node.js Path module for creating file paths

// Load environment variables from your .env file
dotenv.config();

/**
 * Main function to fetch and display data from LlamaCloud.
 */
async function viewData() {
  // --- 1. Configuration ---
  const {
    LLAMA_CLOUD_API_KEY,
    LLAMA_CLOUD_INDEX_NAME,
    LLAMA_CLOUD_PROJECT_NAME,
    LLAMA_CLOUD_ORGANIZATION_ID,
  } = process.env;

  if (!LLAMA_CLOUD_API_KEY || !LLAMA_CLOUD_INDEX_NAME || !LLAMA_CLOUD_PROJECT_NAME || !LLAMA_CLOUD_ORGANIZATION_ID) {
    console.error("❌ Error: Missing one or more required LlamaCloud environment variables in your .env file.");
    console.error("Please ensure LLAMA_CLOUD_API_KEY, LLAMA_CLOUD_INDEX_NAME, LLAMA_CLOUD_PROJECT_NAME, and LLAMA_CLOUD_ORGANIZATION_ID are set.");
    return;
  }

  console.log(`\nConnecting to LlamaCloud...`);
  console.log(`- Project: ${LLAMA_CLOUD_PROJECT_NAME}`);
  console.log(`- Index:   ${LLAMA_CLOUD_INDEX_NAME}`);

  try {
    // --- 2. Initialize LlamaCloud Index ---
    const index = new LlamaCloudIndex({
      name: LLAMA_CLOUD_INDEX_NAME,
      projectName: LLAMA_CLOUD_PROJECT_NAME,
      organizationId: LLAMA_CLOUD_ORGANIZATION_ID,
      apiKey: LLAMA_CLOUD_API_KEY,
    });

    console.log("✅ Successfully connected to index.");

    // --- 3. Retrieve a Large Set of Nodes ---
    const retriever = index.asRetriever({
      similarityTopK: 100, // Use the maximum allowed value
    });

    console.log("\nFetching data from the index... Please wait.");
    
    // Using a common character as a generic query to fetch a broad set of documents.
    const query = "Xâu ký tự";
    console.log(`Using a generic query ("a") to retrieve available documents...`);
    const nodes = await retriever.retrieve(query);

    if (nodes.length === 0) {
      console.log(`\n⚠️ No data found in the index. It might be empty or still processing.`);
      return;
    }

    console.log(`\n✅ Retrieved ${nodes.length} data nodes.`);

    // --- 4. Prepare Data for CSV and Display ---
    // EDITED: Expanded to parse specific metadata fields for better readability.
    const dataToProcess = nodes.map((node, i) => {
      const metadata = node.node.metadata || {};
      
      return {
        '#': i + 1,
        'ID': node.node.id_,
        'File Name': metadata.file_name || 'N/A',
        'Page': metadata.page_label || 'N/A',
        'Text': node.node.getText(), // Get the full text
        'Full Metadata': JSON.stringify(metadata),
      };
    });

    // --- 5. Convert to CSV format and Save File ---
    if (dataToProcess.length > 0) {
      const outputPath = path.join(process.cwd(), 'llama_cloud_data.csv');
      const header = Object.keys(dataToProcess[0]);
      
      const formatCsvValue = (value) => {
        let strValue = String(value);
        if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
          return `"${strValue.replace(/"/g, '""')}"`;
        }
        return strValue;
      };

      const rows = dataToProcess.map(row => 
        header.map(fieldName => formatCsvValue(row[fieldName])).join(',')
      );
      
      const csvContent = [header.join(','), ...rows].join('\n');
      fs.writeFileSync(outputPath, csvContent, 'utf8');
      
      console.log(`\n✅ Data successfully saved to: ${outputPath}\n`);
    }
    
    // --- 6. Display Full Content in Console ---
    // EDITED: Updated display to show the new parsed metadata fields.
    console.log("--- Displaying Full Data in Console ---");
    dataToProcess.forEach(row => {
        console.log(`\n-------------------- NODE ${row['#']} --------------------`);
        console.log(`ID:        ${row['ID']}`);
        console.log(`File Name: ${row['File Name']}`);
        console.log(`Page:      ${row['Page']}`);
        console.log(`Text:      ${row['Text']}`);
    });
    console.log("\n---------------------------------------------");


    console.log("\nScript finished.");

  } catch (error) {
    console.error("\n❌ An error occurred while running the script:");
    console.error(error);
  }
}

// Run the main function
viewData();
