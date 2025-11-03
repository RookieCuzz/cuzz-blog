---
title: etcd-study
date: 2025-11-3 22:26:11
tags:
---
# 什么是ETCD?
etcd 是一个开源的、分布式且强一致性（strongly‑consistent）的键值对（key‑value）存储系统。    
# 为什么需要 etcd 集群分布式部署

因为我们希望 可靠性／高可用：不会因为某台机器或某个节点故障就整个服务挂掉。
因为 etcd 的设计就是分布式的：它用了 Raft 共识算法、要求多数节点才能提交数据。
因为它承载的往往是 “关键系统状态” 或 “集群元数据”，服务整体的可用性很依赖它。
虽然“一个节点部署”在测试、开发环境可能足够，但在“生产环境”（要求稳定、容错、故障恢复能力）就远远不够了。
所以所以一个etcd 集群包含多个etcd节点,节点之间所持有的数据相同(数据冗余)
**节点的三种角色**
- Leader： 当前被选举出来的节点，负责接收客户端写请求、将日志（写入操作）复制给其它节点。
- Follower： 普通节点，接收 Leader 的心跳／日志复制请求，响应选举请求。
- Candidate： 当 Follower 一段时间未收到 Leader 心跳或发现 Leader 失效，就会转为 Candidate，竞争成为新的 Leader。

**一些Tip**
1. 客户端可以连接任意一个节点，但写操作最终会被转发到 Leader              
   leader基于Raft协议负责日志复制…客户端请求如果发送到 follower，将被转发给 leader。                          
   提示：在客户端配置时，不必只指向 Leader，通常指向所有节点其中之一／多个，这样即便某节点是 follower，客户端请求仍会被处理.             
2. 日志复制必须被多数节点确认（quorum）后，才能算「已提交」            
   客户端提交写数据请求给 Leader 时，Leader ... 仅当超过 50% 的 Follower 节点都已复制日志后，该日志才算提交            
   提示：这说明若集群中多数节点不可达（如网络分区、节点挂掉），写操作就可能失败或暂停。所以维护节点可达性很重要。          
3. 选举超时（election timeout）与心跳间隔（heartbeat）参数非常关键             
   Follower 在一定时间内未收到 Leader 心跳就会发起选举。Heartbeat 较长／Election timeout 太短都会导致频繁选举或系统不稳定。              
   提示：在部署 etcd 时，不要把选举超时设得太短，否则网络稍有延迟就可能触发误选举。反之，超时时间太长，Leader 宕机后切换过慢也影响可用性。              
4. 节点数通常建议为奇数，并且不要为了“更多节点”无限扩张                   
   对于 etcd 集群而言，节点数为奇数更易于判断多数；而即便节点数是偶数，容错能力并不会比之前大很多                      
   提示：例如 3 个节点就能容忍 1 个节点故障（多数为 2／3），而 4 个节点虽然增加一个，但多数仍是 3／4，可故障的节点数还是 1。更多节点意味着更多复制开销、延迟可能增大.                  
5. Leader 所在节点的磁盘 I/O 和网络状况尤为关键         
   如果 etcd Leader 处理大量并发写请求，可能会延迟对 follower 的 peer 请求，因为网络拥塞／发送缓冲区满.         
   提示：部署 Leader 节点时要优先考虑其机器、网络性能；此外可考虑将 peer（节点间通信）流量优先级设高于客户端请求流量        
6. 快照、日志裁剪（compaction）对于长期稳定运行重要         
   频繁更新键值时，需要执行 compaction 来保持 etcd 内存和磁盘使用在可控范围内                    
   提示：当 etcd 存储大量变更，而日志太长、快照太少，会导致恢复慢、资源占用高。定期配置合适的快照阈值、日志裁剪策略是运维中的好习惯                         
7. 网络、磁盘延迟或不稳定会严重影响 etcd 集群稳定性          
   etcd 的 Raft 集群对网络和磁盘 IO 非常敏感……集群失去领导（leader）时，客户端应具备重试机制                    
   提示：在生产环境，要监控网络延迟、磁盘吞吐、节点健康状态。客户端也要设计容错机制（如失败重试、备用 endpoint）                        
**核心特性**       
- 强一致性：任何节点读取的数据都是最新已提交的结果.                       
- 高可用性／容错：通过多数派 (quorum) 原则和共识算法（比如 Raft）来保证即便部分节点宕机、网络出现分区，系统仍可继续提供服务.           
- 简单易用的 API：提供 HTTP/JSON 或 gRPC 等接口以读写键值.                  
- 键值对存储 + 辅助机制: 支持租约（TTL）、Watch 机制（监视键或目录变化）、 目录（前缀）结构、版本控制（Revision）等.              
- 分布式系统友好：设计时就是为了服务发现、配置管理、Leader 选举、分布式锁等场景.        


# 常用功能   
## KV数据库
把 etcd 当做一个分布式、强一致性的键‑值存储来使用。你可以存储任何需要共享或协调的数据，如元数据、状态、配置快照等
**如何使用**
```shell
etcdctl put /app/config/db_host "10.0.0.5"
etcdctl get /app/config/db_host
etcdctl del /app/config/db_host
```


## 服务发现

在分布式系统中，服务实例启动后向 etcd 注册自己的地址／元信息，消费者或客户端通过 etcd 查询或监听服务实例变化。这样服务上线/下线可被及时发现。

**如何使用**
- 服务 A 启动后，在 etcd 写入一个 key，比如 /services/my‑service/instanceID → 其 value 为服务地址（IP:port）、元信息（可以 JSON）
- 设置该 key 带 TTL（租约） 或 心跳续约，如果服务实例挂掉或断开连接，租约到期后 etcd 自动删除该 key，从而标识服务下线。
- 消费者可以 Get 或 Watch /services/my‑service/ 前缀，获取所有实例，或监听实例变更
- 要设计好 key 的命名：通常用前缀 + 服务名 + 实例ID。
- 租约 TTL 要根据服务心跳频率设置，避免误删。
- Watch 机制可能产生延迟、客户端需处理实例快速上下线。
- 如果服务实例很多、频繁变动，要考虑 etcd 的负载与 watch 流量

## 共享配置
把配置（如超时、重试策略、开关标志等）存到 etcd，多个服务实例启动后从 etcd 加载配置，并可监听配置变更以动态更新。
**如何使用**
- 将配置以 key‑value 存放，比如 /config/app1/feature_flag = "true"，或 /config/app1/retry_count = "5"
- 服务启动时读取对应 key／前缀下多个键          
- 同时服务为其配置注册 Watch，当 key 值变更时接收通知，动态生效   
- 配置变更及时性 vs 稳定性：频繁变更可能导致服务不断重加载     
- 键命名应规范、前缀管理清晰     
- Watch 订阅机制要做好资源释放（例如退出时取消 watch），避免内存泄漏。        
## 协调分布式（Leader选举/协调任务）
在多个服务实例中选出一个主节点（Leader）或协调多个节点执行任务，用 etcd 提供的选举机制、租约机制、事务机制来实现。      
**如何使用**       
- 每个候选节点向 etcd 的一个 election 命名空间发起 Campaign() 请求，当一个节点获得领导地位后，它负责任务，其它节点观察该 key 的释放或变更           
- 租约机制：领导节点通常绑定一个租约，租约到期或心跳停止后，领导地位释放，新的候选可竞选       
- 要确保多个实例都能访问 etcd 并具备正确权限
- 租约 TTL 设置合理，领导节点心跳续约机制实现稳定          
- 在网络分区或 etcd leader 切换期间，可能出现过渡状态。要设计任务执行幂等、恢复机制
- 选举机制虽然 etcd 提供支持，但业务层在获得领导后也要做好监控与故障处理           
## 分布式锁
多个服务实例竞争访问同一资源（如共享文件、限流任务、分布式队列）时，用 etcd 实现“全局唯一锁”以保证互斥

- etcd 提供租约(Lease)、事务(Txn)、前缀(Prefix)、版本号(Revision)、监听(Watch) 等机制来实现
- 客户端为锁创建一个唯一 key（如 /locks/myresource/{uuid}），并附上一个租约（TTL）
- 客户端将 key 写入 etcd
- 客户端列出同前缀下的所有 keys，并判断自己插入的 key 的 revision 是否最小（即自己抢到锁）
- 如果不是最小，则监听（Watch）比自己 smaller revision 的 key 删除事件；当该 key 删除时，再判断自己是否最小 => 获得锁
- 客户端业务完成后删除自己的 key（或租约到期自动删除）释放锁
- 租约 TTL 要足够覆盖持锁时间，且持锁期间应续租，避免租约到期资源仍被占用
- 删除锁时要确保不会误删别人锁
- 虽然 etcd 锁机制比很多简单实现更强，但仍需设计异常场景（客户端崩溃、网络分区、锁饥饿）处理逻辑。


# 上手时间

## 部署单节点etcd
```shell
# 1. 安装所需工具
sudo apt update              # 如果是 Ubuntu/Debian／用 yum for CentOS
sudo apt install -y wget curl tar

# 2. 下载最新版本的 etcd（以 v3.6.0 为例）
export ETCD_VER=v3.6.0
wget https://github.com/etcd-io/etcd/releases/download/${ETCD_VER}/etcd-${ETCD_VER}-linux-amd64.tar.gz

# 3. 解压文件
tar xzvf etcd-${ETCD_VER}-linux-amd64.tar.gz
cd etcd-${ETCD_VER}-linux-amd64

# 4. 将可执行文件移动到 /usr/local/bin（或你的 PATH 下）
sudo mv etcd etcdctl /usr/local/bin/

# 5. 检查版本，确认安装成功
etcd --version
etcdctl version

# 6. 后台启动 etcd 单节点服务（默认监听 127.0.0.1:2379）
nohup etcd --data-dir=/var/lib/etcd/data \
     --listen-client-urls=http://0.0.0.0:2379 \
     --advertise-client-urls=http://0.0.0.0:2379 \
     > /var/log/etcd.log 2>&1 &

```
## 简单CRUD
```shell
# 设置使用 v3 API
export ETCDCTL_API=3

# 写(改)入一个键值
etcdctl put greeting "Hello etc2"

# response - > OK

# 读取该键
etcdctl get greeting
# response - > greeting     Hello etc2 
# 删除该键
etcdctl del greeting   
# response - > 1


```
## 查看集群状态
```shell


# 查看集群状态（即使是单节点也可用） 推荐: etcdctl --endpoints=http://127.0.0.1:2379 endpoint health -w table
etcdctl endpoint status

```
| ENDPOINT               | ID              | VERSION | STORAGE VERSION | DB SIZE | IN USE | PERCENTAGE NOT IN USE | QUOTA | ISLEADER | ISLEARNER | RAFTTERM | RAFTINDEX | RAFTAPPLIEDINDEX | ERRORS | DOWNGRADETARGETVERSION | DOWNGRADEENABLED |
|------------------------|-----------------|---------|-----------------|---------|--------|------------------------|------|-----------|------------|-----------|------------|--------------------|--------|--------------------------|-------------------|
| http://127.0.0.1:2379  | 8e9e05c52164694d | 3.6.0   | 3.6.0           | 16kB    | 16kB  | 20%                    | 0B   | true      | false      | 3         | 9          | 9                  |        |                          | false             |





ENDPOINT：该 etcd 节点地址（客户端监听端口）

ID：该节点在 Raft 集群中的成员 ID

VERSION：该节点运行的 etcd 服务版本号

STORAGE VERSION：存储版本（可理解为数据模型兼容版本）

DB SIZE：该节点后端数据库当前占用大小

IN USE：当前实际使用的数据空间（比如多少 kB）

PERCENTAGE NOT IN USE：相对于总配额而言尚未使用的空间百分比

QUOTA：数据库容量配额（如没有配额，多数显示 0）

IS LEADER：是否为当前集群的 Leader 节点（true/false）

IS LEARNER：是否为 Raft 学习者（Learner）节点（true/false）  非投票成员，不能被选为 Leader，也不改变多数派规则；它主要用于 “安全扩容” 或 “备份同步” 场景

RAFT TERM：当前 Raft 任期（term）编号

RAFT INDEX：Raft 日志的当前最高索引（即写入日志位置）

RAFT APPLIED INDEX：已应用到状态机的日志索引（通常与 RAFT INDEX 相近）

ERRORS：如有错误信息，会在此列显示

DOWNGRADE TARGET VERSION：如果集群处于降级流程，会显示目标版本号

DOWNGRADE ENABLED：是否启用了版本降级功能
   

