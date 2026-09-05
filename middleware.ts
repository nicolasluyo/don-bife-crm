import { NextRequest, NextResponse } from "next/server";

const REALM = "Los Postres de Patty CRM";

// Protege el panel y las APIs con autenticación básica (usuario/contraseña por
// variables de entorno). El webhook de WhatsApp se excluye en el matcher porque
// Meta debe poder llamarlo sin login.
export function middleware(req: NextRequest) {
  const user = process.env.PANEL_USER;
  const pass = process.env.PANEL_PASSWORD;

  // Fail-closed: si no hay credenciales configuradas, el panel queda BLOQUEADO
  // (mejor bloqueado que abierto). Define PANEL_USER y PANEL_PASSWORD en Vercel.
  if (!user || !pass) {
    return new NextResponse(
      "Panel no configurado: falta definir PANEL_USER y PANEL_PASSWORD.",
      { status: 503 }
    );
  }

  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    let decoded = "";
    try {
      decoded = atob(header.slice(6));
    } catch {
      decoded = "";
    }
    const sep = decoded.indexOf(":");
    if (sep !== -1) {
      const u = decoded.slice(0, sep);
      const p = decoded.slice(sep + 1);
      if (u === user && p === pass) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Autenticación requerida.", {
    status: 401,
    headers: { "WWW-Authenticate": `Basic realm="${REALM}", charset="UTF-8"` },
  });
}

export const config = {
  matcher: [
    // Todo excepto el webhook de WhatsApp y los recursos internos/estáticos.
    "/((?!api/webhook/whatsapp|_next/static|_next/image|favicon.ico).*)",
  ],
};
