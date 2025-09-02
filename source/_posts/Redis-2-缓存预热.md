---
title: Redis-2.缓存预热
date: 2025-09-02 16:02:17
tags:
---
# 缓存预热
在系统刚刚启动的时候，Redis中并没有缓存任何的数据。如果在客户端发出请求的时候，先查询数据库
然后再将数据缓存，这样势必会给数据库带来较大压力。这就是Redis缓存会面临冷启动问题，甚至还可
能发送缓存穿透的问题。解决的方案就是通过缓存预热提前将相关的数据直接加载到Redis中，从而提供
缓存的命中率。

## 架构详解：Canal + Kafka 实现缓存预热与同
### 1.Canal 监听 MySQL binlog
Canal 模拟 MySQL 的从节点，通过协议订阅 Binlog，捕获数据变更事件（INSERT/UPDATE/DELETE）
### 2.推送到 Kafka（消息队列）
Canal 将变更事件发送至 Kafka 或另一种 MQ，中间存储处理解耦、增强可靠性。
### 3.Kafka 消费者写 Redis
后端服务订阅 Kafka 消息，收到数据变更后根据变更类型（插入、更新或删除），同步更新或删除对应 Redis 缓存。
也可以通过流计算实时统计哪些是热点数据,将其写入redis。

#### A) 普通 Kafka 消费者 → 写入/失效 Redis（旁路缓存）
- 订阅 product-change 主题；
- 收到 INSERT/UPDATE/DELETE 事件后，分别执行：写入/覆盖、失效/删除对应的 Redis key。
- 这样数据库一变更，缓存就同步更新或淘汰。
**要点:**
Spring 应用里用 @KafkaListener 消费、RedisTemplate 写缓存即可（Kafka 发送/消费参考 Spring Kafka 官方文档中的 KafkaTemplate/监听器示例）。
也可用 Kafka Connect 的 Redis sink（或自写消费者）把 Kafka 消息落到 Redis，形成“DB→Kafka→Redis”的链路。
需要幂等：同一事件重复消费也不出错（基于主键做覆盖写、为删除做 DEL）。若链路里还要回写 Kafka，可考虑 Kafka 的 EOS（Exactly-Once）事务

#### B) 流计算识别“热点”（Top-N）→ Redis 排行/热点集
- 用 Kafka Streams / Flink SQL 对“访问日志/点击流”做窗口聚合，实时统计一段时间内 PV/UV；
- 维护每个窗口的 Top-N 商品；
- 将结果写入 Redis 的 Sorted Set（ZSET） 或普通键值，供接口直接读取“热榜”。

####   什么时候选哪种？

只是“同步缓存”和“数据变更即刻落库/失效” → **A 方案（消费者直写 Redis）**足够；

需要“发现热点/Top-N 排行/实时推荐位” → 上 B 方案（流计算 + Redis ZSET），读性能极佳、接口非常轻。