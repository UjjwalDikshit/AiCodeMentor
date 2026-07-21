/**
 * Full-viewport chat shell — used when route is /chat (via AiChatPage itself).
 * Kept for clarity / future nested outlets.
 */
export default function ChatLayout({ children }) {
  return <div className="h-[100dvh] w-full overflow-hidden">{children}</div>;
}
