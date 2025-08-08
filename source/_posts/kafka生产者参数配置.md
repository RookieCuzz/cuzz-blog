---
title: kafka生产者参数配置
date: 2025-08-08 16:15:15
tags:
---

# 生产者

## ACK= 1/0/-1 


![图](/images/1.png)

当acks=0 → 不等任何确认。  (对性能要求高，数据丢失可接受)

当 acks=1，Leader 写入本地日志后即回应，即使 follower 副本还未完成同步。(需要平衡性能和可靠性)

当 acks=-1（all） 且 min.insync.replicas(broker端参数) 条件满足时，Leader 会等待所有 ISR 副本成功写入后，再向 Producer 返回确认。 (对数据可靠性要求极高)    

如果当前 ISR 数量小于 min.insync.replicas，Leader 会拒绝写入并返回错误，提示生产者重试 

## Retries= maxint
当发送失败时，允许重试的次数。与 request.timeout.ms 联动使用.   
## Delivery timeout ms= 2min
定义整个发送流程（包括多次重试）的最大等待时间。一旦超时，生产者放弃该消息并返回异常。  
![图](/images/2.png)

 
## Idempotent= true/false 幂等性 (max.in.flight.requests.per.connection=1)
Producer ID (PID) + Sequence Number    
Kafka 幂等性通过为每个生产者分配一个唯一的 PID，以及为每条消息维护单调递增的序列号来实现。在 Broker 端，会记录每个 (PID, 分区) 的最后写入序列号，从而判断重复或乱序消息    
当消息送达后，Broker 会检查序列号是否正好是上一次 +1 的值：   
    如果是，则正常写入并更新高水位。    
    如果不是，则认为是重复或乱序，直接丢弃
![图](/images/3.png)
