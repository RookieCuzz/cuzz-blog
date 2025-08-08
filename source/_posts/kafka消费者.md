---
title: kafka消费者
date: 2025-08-08 16:45:15
tags:
---
# 消费者消费语义

##  至多一次 (At Most Once)
<img src="https://github.com/RookieCuzz/cuzz-blog/blob/main/source/_posts/images/4.png?raw=true" alt="图" width="1200" />

## 至少一次 (At Least Once) !要保证幂等性
<img src="https://github.com/RookieCuzz/cuzz-blog/blob/main/source/_posts/images/5.png?raw=true" alt="图" width="1200" />


# 消费者位点提交策略
### 自动提交

enable.auto.commit = true    
auto.commit.interval.ms=5000
<img src="https://github.com/RookieCuzz/cuzz-blog/blob/main/source/_posts/images/6.png?raw=true" alt="图" width="1200" />

消费者在调用 poll() 时，会检查是否达到提交间隔，若是就自动提交当前偏移量。   
消息还未处理完就提交-->然后系统崩溃后可能导致消息丢失   
消费处理后提交慢-->然后系统崩溃后会重复消费，造成消息重复处理     

### 手动提交（Manual Commit）

**commitSync()**：同步提交偏移量，调用方法会阻塞当前线程，直到提交成功或发生不可恢复的错误。    
性能影响：由于每次提交都会阻塞线程，导致吞吐量降低。     
**commitAsync()**：异步提交偏移量，调用方法不会阻塞当前线程，提交操作将在后台进行(可传入回调函数)。      
提交失败处理：如果提交失败，commitAsync() 不会自动重试，需要开发者在回调中处理失败情况。     
重复消费风险：在消费者崩溃或重启的情况下，可能导致重复消费未提交的消息。     
提交丢失：如果在提交操作完成前消费者崩溃，可能导致提交丢失，影响消费进度。   