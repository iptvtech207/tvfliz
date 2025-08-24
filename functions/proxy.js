// netlify/functions/proxy.js
import fetch from "node-fetch";

export async function handler(event) {
  const targetUrl = event.queryStringParameters.url;

  if (!targetUrl) {
    return { statusCode: 400, body: "Falta el parámetro url" };
  }

  try {
    const response = await fetch(targetUrl);
    const contentType = response.headers.get("content-type") || "";

    // Si es una playlist m3u8, reescribimos sus URLs
    if (targetUrl.endsWith(".m3u8")) {
      let text = await response.text();
      
      // Convertir todas las líneas que apunten a segmentos en URLs proxificadas
      text = text.replace(/^(?!#)(.*\.ts.*)$/gm, (match) => {
        return `/.netlify/functions/proxy?url=${encodeURIComponent(new URL(match, targetUrl).href)}`;
      });

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*"
        },
        body: text
      };
    }

    // Si no es m3u8 (ej: segmentos .ts), devolvemos binario
    const buffer = await response.arrayBuffer();
    return {
      statusCode: 200,
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Access-Control-Allow-Origin": "*"
      },
      body: Buffer.from(buffer).toString("base64"),
      isBase64Encoded: true
    };

  } catch (err) {
    return { statusCode: 500, body: "Error al cargar el stream" };
  }
}
