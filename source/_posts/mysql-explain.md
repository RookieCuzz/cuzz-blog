---
title: mysql-explain
date: 2025-10-26 14:13:38
tags:
---

# MySQL EXPLAIN / 索引优化·速记

> 面向实战的“看图说话版”笔记：**访问类型、`key_len`、`rows/filtered`、`Extra` 关键项、ICP/覆盖索引、`ORDER BY`/filesort、联合索引与最左前缀、Skip Scan**。

---

## 1) InnoDB 索引与“回表”
- **聚簇索引（PRIMARY）**：叶子页存**整行**。  
- **二级索引**：叶子页存**索引列 + 主键**；命中后再回到聚簇索引取整行 = **回表**。

---

## 2) EXPLAIN 核心字段怎么读

### 访问类型（由优到劣，能过滤越多越好）
`const / eq_ref / ref / range / index / ALL`  
- **`const`**：单表、主键/唯一索引**等值**，最多 1 行（当常量表) -> 最多找到一行,找完直接终止  
- **`eq_ref`**：JOIN 被驱动表用唯一/PK **等值**，每个外层行**最多 1个**。  最多找到一行,找完直接终止
- **`ref`**：普通索引**等值**（可能多行）-> 最多找到N行,例如 where name = '张三' 可能有多个张三行记录,但是遍历范围被收紧无需遍历后续非张三的记录.
- **`range`**：一个或多个**索引区间**（`> < BETWEEN IN 前缀LIKE`).   WHERE name LIKE 'cp%'（命中 (name, ...) 的前缀）。
- **`index`**：**全索引扫描**（顺序读整棵索引树,直到END).  SELECT email FROM users; 只有 INDEX(email)
- **`ALL`**：**全表扫描**。

### `key` / `key_len`
- **`key`**：实际使用的索引。  
- **`key_len`**：**用到的索引前缀长度**；可由此判断联合索引用到了几列/多少字节。

### `rows` / `filtered`
- **`rows`**：估计扫描行数（越小越好）。  
- **`filtered`**：本表条件的**通过率**（0–100；100≈几乎不筛）。  
- 估算产出≈`rows × filtered%`。

### `Extra`（最有优化指向的提示）
- **`Using index`**：**覆盖索引**（所需列全在索引里），通常**不回表**。  
- **`Using where`**：还有**服务器层**的 `WHERE` 过滤（索引没全筛干净）。  
- **`Using index condition`**：**ICP（索引条件下推）**，在**索引扫描阶段**先用“仅依赖索引列”的条件过滤；**依然需要读整行**。  
- **`Using filesort`**：无法用索引完成 `ORDER BY`，触发额外排序阶段。

---

## 3) ICP（Index Condition Pushdown，索引下推）

**定义**：把 `WHERE` 中**只依赖当前索引列**的那部分，**下放到存储引擎在“索引扫描”时先过滤**，以**减少回表次数**。出现于 `Extra: Using index condition`。**覆盖查询时不会出现**（不回表无需下推）。

**典型对照（联合索引 `(drug_name, strength_mg)`）**  

存储引起先获取模糊记录的PK,然后回表查询完整的模糊记录,然后在Mysql服务层对条件进行补充过滤,得到精准的行记录.
如果where部分条件在索引中存在则在索引层遍历索引树的时候进行判断过滤
```sql
-- 案例1
-- index(drug_name,strenth_mg)
EXPLAIN SELECT *
FROM drugs
WHERE drug_name LIKE 'cpd%' AND strength_mg = 500 AND brand = 'helloworld';
-- result type=range  extra= using index condition,using where,

-- 案例2
-- index(drug_name,strenth_mg)
EXPLAIN SELECT *
        FROM drugs
        WHERE drug_name LIKE 'cpd%' AND strength_mg = 500 ;
-- result type=range  extra= using index condition,





```


- `drug_name='cpdd' AND strength_mg=500` → 两个都是**访问条件**（一次精准 seek），**通常不出现 ICP**。  
  - `drug_name LIKE 'cp%' AND strength_mg=500` → 前者是**范围**、后者**不能再缩小区间**但仍在同一索引里 ⇒ **ICP 下推**，`Extra: Using index condition`。



---

## 4) 覆盖索引 vs. 回表

- **覆盖（`Using index`）**：查询列**都在索引**，只读索引树即可返回；既减少 I/O，也避开回表随机访问。  
- **非覆盖**：二级索引命中后需凭主键**回聚簇索引**取整行。

---

## 5) `ORDER BY` 与 `Using filesort`

**触发 filesort 的常见原因**  
- `ORDER BY` **没有可用索引**。  
- 索引**列序或方向**与 `ORDER BY` **不匹配**（混合 ASC/DESC 通常不行）。  
- `WHERE` 对索引**前导列是范围**（如 `LIKE 'cp%'`），而 `ORDER BY` 又依赖**后续列**，整体顺序“断开”。

**避免办法**  
- 设计**联合索引**同时覆盖 `WHERE` + `ORDER BY` 的**最左前缀**，并保证排序列**同向**；必要时用 8.0 的**降序索引**。

---

## 6) 联合索引与“最左前缀” + Range 访问

- 多列索引必须从**最左列开始连续使用**才能成为**访问条件**。  
- **Range 访问**：用单列或多列索引取**一个/多个区间**（`IN/ BETWEEN / 比较 / 前缀LIKE` 都属于 range）。一旦**首个范围出现**，**后续列通常不能再收窄区间**，常作为下推/过滤条件。

---

## 7) Skip Scan（8.0+）

- **Index Skip Scan**：**缺少主导列条件**时，优化器可按主导列的不同值**分段做多次小范围扫描**，把原本 `ALL` 的场景“拉回”到 `range`。**收益取决于主导列基数**与成本评估。

---

## 8) 其他常见优化点

- **Index Merge**：对**同一表多个索引**做多段 range 扫描并**合并**（并/交/并-交）。  
- **`GROUP BY`**：若分组键与索引顺序吻合，可用**索引驱动分组**（避免临时表 / filesort），EXPLAIN 可能出现 *Using index for group-by*。

---

## 9) 上手检查清单（按 EXPLAIN 排查）

1) **`type`**：目标是向 **`const/eq_ref/ref/range`** 靠拢，避免 `index/ALL`。  
2) **`rows × filtered`**：估算实际产出，**越小越好**；必要时用 `EXPLAIN ANALYZE` 验证。  
3) **`Extra`**：  
   - 出现 **`Using filesort` / `Using temporary`** → 优先考虑**联合索引**匹配 `WHERE + ORDER BY/GROUP BY`。  
   - **`Using index condition`** → ICP 在工作；若频繁回表，考虑**覆盖索引**（让它变 `Using index`）。  
4) **`key_len`**：确认**命中的联合索引前缀**是否足够；不够时检查最左前缀/隐式类型转换等。
---

