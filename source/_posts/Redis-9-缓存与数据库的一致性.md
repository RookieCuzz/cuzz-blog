---
title: Redis-9.缓存与数据库的一致性
date: 2025-09-03 13:54:08
tags:
---

# 缓存与数据库的一致性

想要保存缓存与数据库的双写一致,一共有四种方式,即四种同步策略:
- 1. 先更新缓存,再更新数据库
- 2. 先更新数据库,再更新缓存
- 3. 先删除缓存,再更新数据库
- 4. 先更新数据库,再删除缓存
这四种同步策略中,需要做出比较的是: 先操作缓存还是先操作数据库? 删除缓存还是更新缓存合适?

## 数据一致性案例分析: Redis和Mysql 一致性方案
<img src="https://github.com/RookieCuzz/cuzz-blog/blob/main/source/_posts/images/21.png?raw=true" alt="图" width="1200" />               

**具体业务流程如下图:**  

<img src="https://github.com/RookieCuzz/cuzz-blog/blob/main/source/_posts/images/22.png?raw=true" alt="图" width="1200" />     

读取缓存步骤一般没有什么问题，但是一旦涉及到数据更新：数据库和缓存更新，就容易出现缓存                                  
(Redis)和数据库（MySQL）间的数据一致性问题。不管是先写MySQL数据库，再删除Redis缓存,还是             
先删除缓存，再写库，都有可能出现数据不一致的情况。                    
***举二个例子：***       
1. 如果删除了缓存Redis，还没有来得及写库MySQL，另一个线程就来读取，发现缓存为空，则去数              
据库中读取数据写入缓存，此时缓存中为脏数据.    
   <img src="https://github.com/RookieCuzz/cuzz-blog/blob/main/source/_posts/images/23.png?raw=true" alt="图" width="1200" />

2. 如果先写了库，在删除缓存前，写库的线程宕机了，没有删除掉缓存，则也会出现数据不一致情况。  
   <img src="https://github.com/RookieCuzz/cuzz-blog/blob/main/source/_posts/images/24.png?raw=true" alt="图" width="1200" />

因为写和读是并发的，没法保证顺序,就会出现缓存和数据库的数据不一致的问题。

## 如何解决缓存和数据库的一致性问题?
### 第一种方案: 采用延时双删策略
在写库前后都进行redis.del(key)操作，并且设定合理的间隔时间。具体的步骤就是
(1) 先删除缓存
(2) 再写数据库
(3) 休眠一段时间
(5) 再次删除缓存
这么做的目的，就是确保读请求结束，写请求可以删除读请求造成的缓存脏数据。当然这种策略，还要
考虑redis和数据库主从同步的耗时。
那么，这个500毫秒怎么确定的，具体该休眠多久呢？需要评估自己的项目的读数据业务逻辑的耗时。   
这么做的目的，就是确保读请求结束，写请求可以删除读请求造成的缓存脏数据。从理论上来说，给缓
存设置过期时间，是保证最终一致性的解决方案。所有的写操作以数据库为准，只要到达缓存过期时
间，则后面的读请求自然会从数据库中读取新值然后回填缓存。      
该方案的缺点：结合双删策略+缓存超时设置，这样最差的情况就是在超时时间内数据存在不一致，而且
又增加了写请求的耗时。   

### 第二种方案: 异步更新缓存(基于订阅binlog的同步机制)
  <img src="https://github.com/RookieCuzz/cuzz-blog/blob/main/source/_posts/images/25.png?raw=true" alt="图" width="1200" />
这种解决的方案很类似MySQL的主从备份机制，因为MySQL的主备也是通过binlog来实现的数据一致
性。该方案存在的缺点是：由于更新的过程是异步完成的，因此在异步更新的过程中，依然是存在Redis
缓存与MySQL数据不一致的情况