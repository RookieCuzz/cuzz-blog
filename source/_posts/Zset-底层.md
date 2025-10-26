---
title: Zset 底层
date: 2025-10-01 17:49:16
tags:
---

# Zset 

## Zset支持的操作
ZADD：插入/更新成员与分数。   
ZINCRBY：给成员分数做加减。   
ZSCORE / ZMSCORE：返回一个或多个成员的分数。   
ZRANK / ZREVRANK：返回成员名次（从 0 开始）。   
ZRANDMEMBER：随机返回成员，可带 COUNT 与 WITHSCORES。    
ZRANGE：按索引/分数/字典序取区间。    
.....省略 



## Zset的底层数据结构
ZipList和SkipList。同时满足一下条件时使用zipList编码(紧挨在一起的压缩列表节点来保存)
- 元素数量小于28 ( zset max ziplist entires  128 ) 两参数都可以  
- 所有member 长度都小于64字节(zset-max-ziplist-value64)


不能满足上面两个条件的使用skiplist 编码    
```c
    zskiplist *zsl
    dict *dice
```

<img src="https://github.com/RookieCuzz/cuzz-blog/blob/main/source/_posts/images/33.png?raw=true" alt="图" width="1200" />



## 两套结构各司其职
字典（dict/hash table）：保存 member → score 的映射，用于 O(1) 的按成员查分/判存在（ZSCORE、ZMSCORE、更新时先查旧分）。                           
跳表（zskiplist）：按 score（同分再按成员字典序）维护全局有序，支持按分数/排名的区间定位与顺扫，是 ZRANGE ... BYSCORE/INDEX/LEX、ZRANK 等的底层载体。               
官方文档明确：Zset 采用跳表 + 哈希表的双端口结构，因此添加元素是 O(log N)，而读取有序结果无需再排序。(类似二分查找)                         


##  典型操作如何落到两套结构

### ZADD / 分数更新
1. 先在 dict 查该成员是否已存在及其旧分数；      
2. 新成员：写入 dict         
3. 改分：更新 dict，并在 skiplist 中删除旧节点再按新分插入（平均 O(log N)）。 



## 问题使用skiplist的时候如何得到节点的排序名次

ZRANK 先用字典找到该成员的分数，再用跳表按 (score, member) 从顶层往下“走指针 + 累计 span”算出名次；平均复杂度是 O(log N)
跳表节点每一层都带一个 span，表示从当前节点跨到下个节点会“越过多少底层节点”。ZRANK 就是沿路把跨过的 span 加和，从而不用逐个数节点就拿到名次。