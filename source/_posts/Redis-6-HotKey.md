---
title: Redis-6.HotKey
date: 2025-09-03 11:15:22
tags:
---

# Hot Key（Redis 集群中的热点 Key）
<img src="https://github.com/RookieCuzz/cuzz-blog/blob/main/source/_posts/images/19.png?raw=true" alt="图" width="1200" />

在 Redis 集群环境中，当某些缓存 Key 被频繁访问且集中分布在同一个槽位（slot）上时，
会造成该节点负载过高，而其他节点相对空闲，导致整个集群性能不均衡，这就是所谓的 Hot Key 问题。

## Hot Key 监控方法
你提到可以使用 redis-cli --hotkeys 命令，它通过采样 SCAN 的方式识别热点 Key，不会阻塞 Redis，可用于监控热点 Key。

## 常见处理方案

##  Key 分片（Key Sharding / Splitting）
对热点 Key 进行拆分，例如将 counter 拆为 counter:1, counter:2, counter:3 等多个 Key，分布于不同槽位，
并在客户端汇总结果以形成全局值。这样可以分散访问负载。
(客户端首先要知道他写入的key是热点key)
## 读写分离（读扩展）
将热点 Key 的读请求导向多个 Redis replica 实例，缓解主节点（master）的读压力。
Replica 通常通过异步复制保持数据更新，但可能有延迟。
## 客户端缓存
在客户端层临时缓存热点 Key 的值（如内存中）,
减少对 Redis 集群的访问频次。不过要处理好缓存失效与同步机制。
## 限流或读速率控制
对热点 Key 的访问速度进行限制（如每秒最大请求数），避免短时间内瞬间并发请求压垮 Redis 节点。

## 客户端判断 Hot Key 的常见方法
1. 客户端统计并上报热点 Key
在业务代码层面，嵌入统计逻辑：每次访问 Redis 前，由客户端（如在 Jedis/Lettuce SDK 中）统计 key 的访问次数，
并定期上报至监控系统。监控系统可基于设定阈值，识别出 Hot Key。
2. 代理层（Proxy）统一收集 Key 访问
如果 Redis 请求经过统一代理（如 Twemproxy、Codis 等），
可以在代理层统计所有访问请求并进行上报和分析。这样可以统一集中识别热点 Key。
3. 采样 SCAN 
用 SCAN 游标分批抽样一些 key → 对抽到的每个 key 查询 OBJECT FREQ（LFU 频率计数）→ 维护一个小型 Top-N 列表 → 输出频率最高的那些 key。