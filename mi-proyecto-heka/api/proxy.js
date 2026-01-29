// api/proxy.js

// La URL de tu Google Apps Script.
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbyty3zrvxgXcKSoJCf_x8LGe-hmzEhfMP3Y5GUPpmb0aAN0PeMsYg8O4ZTUbPIKbCFX/exec";

export async function onRequest(request) {
  // 1. Configurar los encabezados CORS para la respuesta al navegador
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*', // En producción, cámbialo por tu dominio de Cloudflare
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // 2. Manejar solicitudes preflight (OPTIONS)
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 3. Obtener los datos de la solicitud (pueden venir por GET o POST)
    let action, params;
    if (request.method === 'GET') {
      const url = new URL(request.url);
      action = url.searchParams.get('action');
      const paramsString = url.searchParams.get('params');
      params = paramsString ? JSON.parse(paramsString) : {};
    } else if (request.method === 'POST') {
      const body = await request.json();
      action = body.action;
      params = body.params || {};
    } else {
      throw new Error('Método no permitido');
    }

    // 4. Construir la URL para Google Apps Script
    const targetUrl = `${GAS_WEB_APP_URL}?action=${encodeURIComponent(action)}&params=${encodeURIComponent(JSON.stringify(params))}`;

    // 5. Hacer la solicitud a Google Apps Script (servidor a servidor)
    const gasResponse = await fetch(targetUrl, {
      method: 'GET', // GAS maneja todo como GET con parámetros en la URL
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!gasResponse.ok) {
      throw new Error(`Google Apps Script respondió con error: ${gasResponse.status} ${gasResponse.statusText}`);
    }

    const data = await gasResponse.json();

    // 6. Devolver la respuesta a tu frontend, con los encabezados CORS
    return new Response(JSON.stringify(data), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });

  } catch (error) {
    console.error("Error en el proxy de Cloudflare:", error);
    return new Response(JSON.stringify({ success: false, message: error.message }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
}