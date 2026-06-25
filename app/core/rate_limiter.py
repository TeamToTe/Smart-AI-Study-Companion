import time
import logging
import redis

logger = logging.getLogger(__name__)

class RedisTokenBucketRateLimiter:
    """
    A distributed token bucket rate limiter using Redis and Lua script for atomic operations.
    Suitable for coordinating rate limits across multiple concurrent Celery workers.
    """
    def __init__(self, redis_url: str, capacity: int, fill_rate: float):
        """
        Args:
            redis_url: The connection URL for Redis.
            capacity: Maximum number of tokens the bucket can hold.
            fill_rate: How many tokens are added to the bucket per second.
        """
        self.redis_client = redis.Redis.from_url(redis_url, decode_responses=True)
        self.capacity = capacity
        self.fill_rate = fill_rate

        # Lua script to atomically update the token bucket and consume tokens
        self.lua_script = """
        local key = KEYS[1]
        local requested = tonumber(ARGV[1])
        local capacity = tonumber(ARGV[2])
        local fill_rate = tonumber(ARGV[3])
        local now = tonumber(ARGV[4])

        local state = redis.call('HMGET', key, 'last_updated', 'tokens')
        local last_updated = tonumber(state[1]) or now
        local tokens = tonumber(state[2]) or capacity

        -- Replenish tokens based on elapsed time
        local elapsed = math.max(0, now - last_updated)
        tokens = math.min(capacity, tokens + (elapsed * fill_rate))

        if tokens >= requested then
            tokens = tokens - requested
            redis.call('HMSET', key, 'last_updated', now, 'tokens', tokens)
            return 1 -- Allowed
        else
            return 0 -- Rate limited
        end
        """
        try:
            self.script_runner = self.redis_client.register_script(self.lua_script)
        except Exception as e:
            logger.error(f"Failed to register Lua script in Redis: {e}")
            self.script_runner = None

    def acquire(self, service_name: str, tokens_requested: int) -> bool:
        """
        Atomically attempts to consume tokens from the bucket for a given service.
        Returns True if successful, False if rate-limited or in case of a Redis error.
        """
        if not self.script_runner:
            # Fallback if script is not registered
            logger.warning("Redis script runner not initialized. Allowing request by default.")
            return True
            
        key = f"rate_limit:{service_name}"
        now = time.time()
        try:
            result = self.script_runner(
                keys=[key],
                args=[tokens_requested, self.capacity, self.fill_rate, now]
            )
            return result == 1
        except Exception as e:
            logger.error(f"Error executing Redis rate limiter Lua script: {e}. Falling back to true.")
            # Fallback to avoid complete blockage if Redis goes down
            return True
