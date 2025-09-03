---
title: Redis-10.分布式锁
date: 2025-09-03 14:47:20
tags:
---
# 分布式锁
分布式锁的作用是为了在微服务情况下解决单个服务线程同步的安全问题
分布式锁具体以下的特性:
1. 安全性（Safety / 互斥性）：任何时刻，只有一个客户端可以持有锁（Mutual Exclusion）
2. 活性 - 无死锁（Liveness A / Deadlock-free）：即使锁持有者崩溃或失联，锁最终仍会释放，后续客户端依然可以获取锁
3. 活性 - 容错性（Liveness B / Fault Tolerance）：在 Redis 集群中，只要大多数节点可用，锁机制依然正常有效

## Redis 实现分布式锁的几种方式与注意事项
### (1)  原始方式： SETNX + EXPIRE（非原子）
这种方式通常分两步执行：
使用 SETNX key value 尝试获取锁（仅当 key 不存在时设置成功）。
如果上一步成功，使用 EXPIRE key timeout 为锁设置过期时间。
```idl
if redis.setnx(lock_key, lock_value) == 1 then
    redis.expire(lock_key, timeout)
end
```
存在的问题：这两条命令是分开的，不是原子操作。若在 SETNX 执行后但在 EXPIRE 执行前，程序崩溃或重启，锁将永远不会过期，导致死锁，其他客户端将无法获取锁。
### (2) SET key value NX EX timeout  （原子操作）
```redis-cli
SET mykey myval NX EX seconds
#NX：仅在 key 不存在时设置（相当于 setnx）。
#EX seconds：设置过期时间。
```
这是原子执行的，解决了第一种方式不可原子的问题。
### (3) set nx 加锁+lua脚本解锁
1) **获取锁（原子 + 唯一值 + 过期**
```redis
SET lock_key <unique_id> NX EX <ttl_seconds>
```
NX：仅当 key 不存在才设置（互斥）。
EX：一次性设置过期时间（原子地解决了“SETNX + EXPIRE 非原子”的问题）。
<unique_id>：放一个随机唯一值（UUID、雪花 ID 等），用来证明“谁”持有锁。返回 OK 表示成功，返回 nil 表示锁已被占用

为什么一定要唯一值？
因为锁可能过期后被“B”重新抢到；如果“A”晚到一步还去解锁，不先核对持有者，就会删掉 B 的锁，破坏串行语义。唯一值就是“持有者凭证”。
2) **安全解锁（Lua 原子校验 + 删除)**
把“校验持有者（value 是否等于 <unique_id>）”与“DEL”合成一个 Lua 脚本原子执行，避免两条命令之间被别的请求插队：
``` lua

# KEYS[1] = lock_key, ARGV[1] = unique_id
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end

```
Redis 执行 Lua 脚本是原子的，脚本执行期间不会被其他命令穿插，确保了安全性
## 为什么还需要 “唯一值 + Lua 脚本解锁”？

单纯使用 SET key value NX EX expiry，虽然解决了原子性和过期问题，但解锁时仍存在 “误删他人锁” 的风险：

客户端 A 获取锁（设置 valueA）。
A 因业务耗时超过 TTL，锁过期后被客户端 B 获取（设置 valueB）。
A 完成后若执行 DEL key，错误地删除了 B 的锁，造成严重并发问题(连锁反应)。
A 用 DEL key 误删了 B 的锁，会让“临界区”同时被两个人占用，
## 超时与续期
业务耗时可能超过 EX 的 TTL。两种思路：
① 预估好 较短 TTL + 幂等/可重试 的业务；
② 使用“看门狗”续期：持锁进程存活就自动续期，避免锁在临界区中途过期（Redisson 就是这么做的，默认 30s 租约、每 10s 续一次）。

## 什么栅栏令牌(fencing token)
<img src="https://github.com/RookieCuzz/cuzz-blog/blob/main/source/_posts/images/26.png?raw=true" alt="图" width="1200" />

**如何解决上述超卖问题**

1. 设置库存改为 quantity = quantity - 1（原子递减）
问题: 业务失败后的回溯难题
2. 添加字段updatetime
让后续写操作依据时间戳或版本判断是否执行——本质上确实属于 fencing token 的一种轻量化实现。

栅栏令牌 是一个单调递增的标识符（通常是数字），每当一个客户端成功获取锁时，锁服务就会给它分配一个新的令牌。



