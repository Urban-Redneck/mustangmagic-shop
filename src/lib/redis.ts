// Redis client for cart sessions and inventory locking
import { Redis } from 'ioredis';

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    const url = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;
    if (url) {
      redisClient = new Redis(url, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
    } else {
      redisClient = new Redis(parseInt(process.env.REDIS_PORT || '6379'), 
        process.env.REDIS_HOST || '127.0.0.1', {
        password: process.env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: 3,
      });
    }
  }
  return redisClient;
}

// Cart helpers
export const CART_TTL = 3600; // 1 hour cart expiry in seconds

export async function addToCart(cartId: string, productId: string, quantity: number): Promise<boolean> {
  const r = getRedis();
  await r.connect();
  const itemKey = `cart:${cartId}:${productId}`;
  const existing = parseInt(await r.get(itemKey) || '0');
  const total = existing + quantity;
  if (total < 1) return false;
  await r.set(itemKey, String(total), 'EX', CART_TTL);
  await r.sadd(`cart:${cartId}:items`, productId);
  await r.expire(`cart:${cartId}:items`, CART_TTL);
  return true;
}

export async function removeFromCart(cartId: string, productId: string): Promise<boolean> {
  const r = getRedis();
  await r.connect();
  const key = `cart:${cartId}:${productId}`;
  const current = parseInt(await r.get(key) || '0');
  if (current <= 1) {
    await r.del(key);
    await r.srem(`cart:${cartId}:items`, productId);
    return true;
  }
  const newCount = current - 1;
  await r.set(key, String(newCount), 'EX', CART_TTL);
  return true;
}

export async function getCart(cartId: string): Promise<Array<{ product_id: string; quantity: number }>> {
  const r = getRedis();
  await r.connect();
  const itemKeys = await r.smembers(`cart:${cartId}:items`);
  if (itemKeys.length === 0) return [];
  const values = await r.mget(itemKeys.map(k => `cart:${cartId}:${k}`));
  return itemKeys
    .map((pid, i) => ({ product_id: pid, quantity: parseInt(values[i] || '0') }))
    .filter(item => item.quantity > 0);
}

export async function clearCart(cartId: string): Promise<void> {
  const r = getRedis();
  await r.connect();
  const items = await r.smembers(`cart:${cartId}:items`);
  if (items.length > 0) {
    const keys = items.map(k => `cart:${cartId}:${k}`);
    await r.del(...keys);
  }
  await r.del(`cart:${cartId}:items`);
}

// Inventory locking — reserve stock temporarily while customer checks out
export async function lockInventory(productId: string, quantity: number, ttlSeconds = 300): Promise<boolean> {
  const r = getRedis();
  await r.connect();
  const lockKey = `lock:${productId}`;
  const acquired = await r.set(lockKey, String(quantity), 'EX', ttlSeconds, 'NX');
  if (acquired) {
    const remaining = await r.decrby(`stock:${productId}`, quantity);
    if (remaining < 0) {
      await r.del(lockKey);
      await r.incrby(`stock:${productId}`, quantity);
      return false;
    }
    return true;
  }
  return false;
}

export async function confirmInventory(productId: string, quantity: number): Promise<boolean> {
  const r = getRedis();
  await r.connect();
  await r.del(`lock:${productId}`);
  return true;
}

export async function releaseInventory(productId: string, quantity: number): Promise<void> {
  const r = getRedis();
  await r.connect();
  await r.incrby(`stock:${productId}`, quantity);
  await r.del(`lock:${productId}`);
}
