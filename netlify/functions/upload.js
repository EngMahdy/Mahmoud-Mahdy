const { getStore } = require("@netlify/blobs");

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: ""
    };
  }
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "الطريقة غير مسموحة", success: false })
    };
  }

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "لا يوجد محتوى في الطلب", success: false })
      };
    }

    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    
    if (!contentType.includes('multipart/form-data')) {
      return {
        statusCode: 400,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "نوع المحتوى يجب أن يكون multipart/form-data", success: false })
      };
    }

    const formDataParser = require('parse-multipart-data');
    const boundaryMatch = contentType.match(/boundary=(.+)$/);
    
    if (!boundaryMatch) {
      return {
        statusCode: 400,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "لم يتم العثور على boundary في الطلب", success: false })
      };
    }

    const boundary = boundaryMatch[1];
    let parts;
    
    try {
      parts = formDataParser.parse(Buffer.from(event.body, 'base64'), boundary);
    } catch (parseError) {
      console.error("Parse error:", parseError);
      return {
        statusCode: 400,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "فشل تحليل بيانات الملف", success: false, details: parseError.message })
      };
    }
    
    const filePart = parts.find(p => p.name === 'file');
    
    if (!filePart || !filePart.data || filePart.data.length === 0) {
      return {
        statusCode: 400,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "لم يتم تحديد ملف للرفع", success: false })
      };
    }

    const maxSize = 50 * 1024 * 1024;
    if (filePart.data.length > maxSize) {
      return {
        statusCode: 413,
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ error: "حجم الملف كبير جداً (الحد الأقصى 50 ميجابايت)", success: false })
      };
    }

    const fileName = filePart.filename || 'unnamed-file';
    const fileType = filePart.type || 'application/octet-stream';
    const fileSize = filePart.data.length;

    const store = getStore("uploaded-files");
    
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._؀-ۿ-]/g, '_');
    const fileKey = `${timestamp}-${sanitizedFileName}`;
    
    await store.set(fileKey, filePart.data, {
      metadata: {
        originalName: fileName,
        contentType: fileType,
        size: fileSize.toString(),
        uploadedAt: new Date().toISOString()
      }
    });

    return {
      statusCode: 200,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ 
        success: true, 
        fileKey,
        fileName: fileName,
        fileSize: fileSize,
        downloadUrl: `/.netlify/functions/download?key=${encodeURIComponent(fileKey)}`
      })
    };

  } catch (error) {
    console.error("Upload error:", error);
    return {
      statusCode: 500,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ 
        error: "فشل رفع الملف إلى السحابة", 
        success: false,
        details: error.message 
      })
    };
  }
};

