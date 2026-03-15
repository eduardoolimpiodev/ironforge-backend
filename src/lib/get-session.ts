import { fromNodeHeaders } from "better-auth/node";
import { FastifyRequest } from "fastify";

import { auth } from "./auth.js";

export async function getSession(request: FastifyRequest) {
  console.log("=== GET SESSION DEBUG ===");
  console.log("Authorization header:", request.headers.authorization);
  
  // Tenta pegar sessão dos cookies primeiro
  const sessionFromCookies = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });

  if (sessionFromCookies) {
    console.log("Sessão encontrada nos cookies");
    return sessionFromCookies;
  }

  console.log("Sem sessão nos cookies, tentando Authorization header");

  // Se não tiver sessão nos cookies, tenta pegar do Authorization header
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    console.log("Token encontrado no header:", token.substring(0, 20) + "...");
    
    try {
      // Valida o token usando Better Auth
      const sessionFromToken = await auth.api.getSession({
        headers: {
          ...fromNodeHeaders(request.headers),
          cookie: `better-auth.session_token=${token}`,
        },
      });

      console.log("Sessão do token:", sessionFromToken ? "válida" : "inválida");
      return sessionFromToken;
    } catch (error) {
      console.log("Erro ao validar token:", error);
      return null;
    }
  }

  console.log("Nenhum Authorization header encontrado");
  return null;
}
