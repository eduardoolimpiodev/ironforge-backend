import { fromNodeHeaders } from "better-auth/node";
import { FastifyRequest } from "fastify";

import { auth } from "./auth.js";

export async function getSession(request: FastifyRequest) {
  // Tenta pegar sessão dos cookies primeiro
  const sessionFromCookies = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });

  if (sessionFromCookies) {
    return sessionFromCookies;
  }

  // Se não tiver sessão nos cookies, tenta pegar do Authorization header
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    
    try {
      // Valida o token usando Better Auth
      const sessionFromToken = await auth.api.getSession({
        headers: {
          ...fromNodeHeaders(request.headers),
          cookie: `better-auth.session_token=${token}`,
        },
      });

      return sessionFromToken;
    } catch (error) {
      return null;
    }
  }

  return null;
}
