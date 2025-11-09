const { getStore } = require("@netlify/blobs");

exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS"
  };

  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: ""
    };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: "Method not allowed"
    };
  }

  try {
    const store = getStore("uploaded-files");
    const { blobs } = await store.list();
    
    const files = await Promise.all(
      blobs.map(async (blob) => {
        const metadata = await store.getMetadata(blob.key);
        return {
          key: blob.key,
          name: metadata?.metadata?.originalName || blob.key,
          size: metadata?.metadata?.size || 0,
          contentType: metadata?.metadata?.contentType || "unknown",
          uploadedAt: metadata?.metadata?.uploadedAt || "",
          downloadUrl: `/.netlify/functions/download?key=${encodeURIComponent(blob.key)}`
        };
      })
    );

    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ files })
    };

  } catch (error) {
    console.error("List error:", error);
    return {
      statusCode: 500,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Failed to list files" })
    };
  }
};
