import { fromNodeHeaders } from "better-auth/node";
import { FastifyRequest } from "fastify";

import { auth } from "./auth.js";
import { prisma } from "./db.js";

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
      // Busca sessão diretamente no banco usando o token
      const session = await prisma.session.findUnique({
        where: { token },
        include: { user: true },
      });

      if (session && session.expiresAt > new Date()) {
        console.log("Sessão válida encontrada no banco para user:", session.userId);
        return {
          session: {
            token: session.token,
            userId: session.userId,
            expiresAt: session.expiresAt,
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
          },
          user: session.user,
        };
      }

      console.log("Sessão não encontrada ou expirada");
      return null;
    } catch (error) {
      console.log("Erro ao buscar sessão:", error);
      return null;
    }
  }

  console.log("Nenhum Authorization header encontrado");
  return null;
}
