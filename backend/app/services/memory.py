from cachetools import TTLCache
from langchain.memory import ChatMessageHistory
from typing import Optional
import logging


MEMORY_TTL_SECONDS=3600
MAX_CACHE_SIZE=2000

logger = logging.getLogger(__name__)


class MemoryService:
    """Service class for managing session-based conversation message history."""

    def __init__(self):
        """Initialize the memory service with TTL cache."""
        self.cache = TTLCache(
            maxsize=MAX_CACHE_SIZE,
            ttl=MEMORY_TTL_SECONDS
        )
        logger.info(f"Memory service initialized with TTL: {MEMORY_TTL_SECONDS}s, Max size: {MAX_CACHE_SIZE}")

    def get_session_history(self, session_id: str) -> ChatMessageHistory:
        """
        Get or create message history for a session.

        Args:
            session_id: Unique session identifier

        Returns:
            ChatMessageHistory: Message history object for the session
        """
        if session_id in self.cache:
            logger.debug(f"Retrieved existing history for session: {session_id}")
            return self.cache[session_id]

        # Create new history for session
        history = ChatMessageHistory()
        self.cache[session_id] = history
        logger.info(f"Created new message history for session: {session_id}")
        return history

    def clear_session(self, session_id: str) -> bool:
        """
        Clear history for a specific session.

        Args:
            session_id: Session identifier to clear

        Returns:
            bool: True if session was found and cleared, False otherwise
        """
        if session_id in self.cache:
            del self.cache[session_id]
            logger.info(f"Cleared history for session: {session_id}")
            return True
        return False

    def get_cache_stats(self) -> dict:
        """
        Get cache statistics.

        Returns:
            dict: Cache statistics including size and configuration
        """
        return {
            "current_size": len(self.cache),
            "max_size": self.cache.maxsize,
            "ttl_seconds": self.cache.ttl
        }

    def clear_all_sessions(self) -> int:
        """
        Clear all sessions from history.

        Returns:
            int: Number of sessions cleared
        """
        cleared_count = len(self.cache)
        self.cache.clear()
        logger.info(f"Cleared all {cleared_count} sessions from history")
        return cleared_count


# Global memory service instance
memory_service = MemoryService()