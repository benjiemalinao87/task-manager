import { DurableObject } from "cloudflare:workers";

interface Session {
  webSocket: WebSocket;
  userId: string;
  userName: string;
  workspaceId: string;
  quit?: boolean;
  blockedMessages?: string[];
}

interface Message {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
  type: 'message' | 'system';
}

interface OnlineUser {
  userId: string;
  userName: string;
  joinedAt: number;
}

export class ChatRoom extends DurableObject {
  private sessions: Session[];
  private messageHistory: Message[];
  private onlineUsers: Map<string, OnlineUser>;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sessions = [];
    this.messageHistory = [];
    this.onlineUsers = new Map();

    // Load message history from storage
    this.ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<Message[]>("messages");
      if (stored) {
        this.messageHistory = stored;
      }
    });

    // Clean up broken connections every 60 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanupBrokenSessions();
    }, 60000);
  }

  // Clean up broken or inactive sessions
  private cleanupBrokenSessions(): void {
    const before = this.sessions.length;

    this.sessions = this.sessions.filter(session => {
      if (session.quit) return false;

      try {
        // Check if WebSocket is still open
        if (session.webSocket.readyState !== 1) { // 1 = OPEN
          session.quit = true;
          this.onlineUsers.delete(session.userId);
          return false;
        }
        return true;
      } catch (err) {
        session.quit = true;
        this.onlineUsers.delete(session.userId);
        return false;
      }
    });

    const after = this.sessions.length;
    if (before !== after) {
      console.log(`Cleaned up ${before - after} broken sessions. Active: ${after}`);

      // Broadcast updated online users
      this.broadcast({
        type: "online_users",
        onlineUsers: Array.from(this.onlineUsers.values())
      });
    }
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Handle WebSocket upgrade
    if (request.headers.get("Upgrade") === "websocket") {
      const pair = new WebSocketPair();
      await this.handleSession(pair[1], request);
      return new Response(null, { status: 101, webSocket: pair[0] });
    }

    // Handle HTTP requests
    if (url.pathname === "/messages") {
      // Get message history
      return new Response(JSON.stringify({
        messages: this.messageHistory.slice(-100), // Last 100 messages
        onlineUsers: Array.from(this.onlineUsers.values())
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    if (url.pathname === "/online") {
      // Get online users
      return new Response(JSON.stringify({
        onlineUsers: Array.from(this.onlineUsers.values())
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Not found", { status: 404 });
  }

  async handleSession(webSocket: WebSocket, request: Request): Promise<void> {
    webSocket.accept();

    // Parse connection info from query params
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId") || "anonymous";
    const userName = url.searchParams.get("userName") || "Anonymous";
    const workspaceId = url.searchParams.get("workspaceId") || "";

    console.log(`[ChatRoom] User connecting: ${userName} (${userId}) to workspace: ${workspaceId}`);
    console.log(`[ChatRoom] Current online users before add:`, Array.from(this.onlineUsers.keys()));
    console.log(`[ChatRoom] Current sessions count:`, this.sessions.length);

    // Create session
    const session: Session = {
      webSocket,
      userId,
      userName,
      workspaceId,
      blockedMessages: []
    };

    this.sessions.push(session);

    // Add user to online list
    this.onlineUsers.set(userId, {
      userId,
      userName,
      joinedAt: Date.now()
    });

    console.log(`[ChatRoom] Online users after add:`, Array.from(this.onlineUsers.values()).map(u => `${u.userName} (${u.userId})`));

    // Broadcast user joined to OTHER users
    console.log(`[ChatRoom] Broadcasting user_joined to ${this.sessions.length - 1} other sessions`);
    this.broadcast({
      type: "user_joined",
      userId,
      userName,
      onlineUsers: Array.from(this.onlineUsers.values())
    }, session);

    // Send message history to new user
    webSocket.send(JSON.stringify({
      type: "history",
      messages: this.messageHistory.slice(-50) // Last 50 messages
    }));

    // Send current online users to the NEW user
    console.log(`[ChatRoom] Sending online_users list to new user ${userName}`);
    webSocket.send(JSON.stringify({
      type: "online_users",
      onlineUsers: Array.from(this.onlineUsers.values())
    }));

    // Handle incoming messages
    webSocket.addEventListener("message", async (msg) => {
      try {
        if (session.quit) return;

        const data = JSON.parse(msg.data as string);

        if (data.type === "message") {
          const message: Message = {
            id: crypto.randomUUID(),
            userId: session.userId,
            userName: session.userName,
            content: data.content,
            timestamp: Date.now(),
            type: 'message'
          };

          // Add to history
          this.messageHistory.push(message);

          // Keep only last 1000 messages
          if (this.messageHistory.length > 1000) {
            this.messageHistory = this.messageHistory.slice(-1000);
          }

          // Persist to storage
          await this.ctx.storage.put("messages", this.messageHistory);

          // Broadcast to all sessions
          this.broadcast({
            type: "new_message",
            message
          });
        } else if (data.type === "typing") {
          // Broadcast typing indicator
          this.broadcast({
            type: "typing",
            userId: session.userId,
            userName: session.userName
          }, session);
        } else if (data.type === "ping") {
          // Respond to ping to keep connection alive
          webSocket.send(JSON.stringify({ type: "pong" }));
        }
      } catch (err) {
        console.error("Error handling message:", err);
        webSocket.send(JSON.stringify({
          type: "error",
          message: "Failed to process message"
        }));
      }
    });

    // Handle close
    webSocket.addEventListener("close", () => {
      console.log(`[ChatRoom] User disconnecting: ${userName} (${userId})`);
      session.quit = true;
      this.sessions = this.sessions.filter(s => s !== session);
      this.onlineUsers.delete(userId);
      console.log(`[ChatRoom] Online users after disconnect:`, Array.from(this.onlineUsers.values()).map(u => `${u.userName} (${u.userId})`));

      // Broadcast user left
      this.broadcast({
        type: "user_left",
        userId,
        userName,
        onlineUsers: Array.from(this.onlineUsers.values())
      });
    });

    // Handle errors
    webSocket.addEventListener("error", () => {
      session.quit = true;
      this.sessions = this.sessions.filter(s => s !== session);
      this.onlineUsers.delete(userId);
    });
  }

  // Broadcast message to all sessions except sender
  broadcast(message: any, excludeSession?: Session): void {
    const messageStr = JSON.stringify(message);

    this.sessions.forEach(session => {
      if (session === excludeSession) return;
      if (session.quit) return;

      try {
        session.webSocket.send(messageStr);
      } catch (err) {
        // Session is broken, mark for cleanup
        session.quit = true;
      }
    });

    // Clean up broken sessions
    this.sessions = this.sessions.filter(s => !s.quit);
  }
}
