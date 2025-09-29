---
title: MVCC这一块
date: 2025-09-29 15:35:50
tags:
---
![img.png](img.png)

# Mysql MVCC机制
**MVCC通过Read View机制解决脏读问题的四步判断流程如下：**  
MySQL 官方文档在 “Consistent Nonlocking Reads” 一节中明确写道：   
如果事务隔离级别是 READ COMMITTED，则 每次一致性读（consistent read，快照读／非锁定读）,
即使在同一个事务中，也会 设置并读取它自己的 fresh snapshot。

如果事务隔离级别是 REPEATABLE READ（默认隔离级别）,
则同一个事务中的所有一致性读都读取在该事务中第一次一致性读时建立的快照。
在 RC 下：一次事务中的每次 SELECT（非锁定读）都用新的 snapshot   
在 RR 下：事务中第一次 SELECT 建立 snapshot，以后所有一致性读都复用这个 snapshot
## 1.生成Read View
- m_ids：创建 Read View 时刻 “所有 活跃（未提交）事务的 ID 集合”。集合可能是稀疏的，并不覆盖一个连续区间。
- min_trx_id：m_ids 中的最小事务 ID；若 m_ids 为空，则等于 max_trx_id
- max_trx_id：下一个将被分配的事务 ID（当前最大 ID + 1），所以“≥ max_trx_id 的版本”一定发生在 Read View 之后。
- reator_trx_id：创建该 Read View 的事务自身 ID（只读事务可能为 0，或实现上视环境而定；关键语义是“自己改的自己能看”）

## 2.四步可见性判断
对于“当前行版本”的 trx_id（行隐藏列 DB_TRX_ID）与 Read View 比较   
(1) trx_id == creator_trx_id → 可见
自己事务写入/更新过的版本，对自己可见。很多资料把这条与下面规则并列写出，便于实现与理解。

(2) trx_id < min_trx_id → 可见
这些版本在创建 Read View 之前就已提交

(3) trx_id ≥ max_trx_id → 不可见
这些版本在 Read View 之后才产生（“未来版本”），对这个 Read View 不可见.

(4) min_trx_id ≤ trx_id < max_trx_id：
在 m_ids 中 → 不可见（创建视图时仍未提交的活跃事务）。
不在 m_ids 中 → 可见（在视图创建前已提交；注意 m_ids 是稀疏集，处于区间内但不在 m_ids 的 ID 可能是已提交的）

**当命中“不可见”时，沿 roll_pointer 沿着版本链向旧版本回溯，直到找到第一个可见版本或链尾。**


# 问题A 未来事务修改（trx_id ≥ max_trx_id）如果很快提交，那能读到吗？

在 RR（Repeatable Read，可重复读，MySQL 默认） 下：读不到。RR 的 Read View 在事务内首次快照读时创建，并被复用,     
之后其他事务即使提交，你的事务也仍使用旧的 Read View，所以“未来版本”一直对你不可见，直到你开启新的事务。     


在 RC（Read Committed） 下：下次 SELECT 就能读到。    
RC 每次快照读都会创建新的 Read View，因此别的事务“刚提交”的数据在你下一条 SELECT 时可见，这也是 RC 会出现“不可重复读”的原因。   

# 问题B  活跃事务若在 Read View 生成后立刻提交，会不会影响可见性？

**不会改变已生成的 Read View 判断结果。Read View 是快照；创建后它的 m_ids / min_trx_id / max_trx_id 不再变化**

在 RR 下：你事务内后续快照读仍用同一个 Read View，所以对那条“当时还未提交”的版本仍然视为不可见（你继续回溯到更老的可见版本
