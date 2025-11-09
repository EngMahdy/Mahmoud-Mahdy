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
    const fileKey = event.queryStringParameters?.key;
    
    if (!fileKey) {
      return {
        statusCode: 400,
        headers,
        body: "File key is required"
      };
    }

    const store = getStore("uploaded-files");
    const result = await store.getWithMetadata(fileKey, { type: 'arrayBuffer' });
    
    if (!result || !result.data) {
      return {
        statusCode: 404,
        headers,
        body: "File not found"
      };
    }

    return {
      statusCode: 200,
      headers: {
        ...headers,
        "Content-Type": result.metadata.contentType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${result.metadata.originalName}"`,
        "Content-Length": result.metadata.size
      },
      body: Buffer.from(result.data).toString('base64'),
      isBase64Encoded: true
    };

  } catch (error) {
    console.error("Download error:", error);
    return {
      statusCode: 500,
      headers,
      body: "Download failed"
    };
  }
};
