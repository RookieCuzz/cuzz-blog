---
title: k8s-21-Service-1
date: 2025-08-29 09:30:21
tags:
---



## 一、ClusterIP 服务概念

### 1) ClusterIP 是默认服务类型
- 如果在创建 Service 时未指定 `type`，默认会分配为 ClusterIP 类型。Service 会自动创建一个虚拟的内部 IP，仅在集群内部可访问。

### 2) 服务拥有独立的 DNS 和 ClusterIP
- 每个 Service 会分配一个 ClusterIP 地址，并生成对应的 DNS 名称（默认为 `<service>.<namespace>.svc.cluster.local`）。通过该 IP 或 DNS，客户端可以访问和负载均衡到后端 Pod。DNS 和 ClusterIP 同样只能在集群内部访问，外部无法直达。

### 3) kube-proxy 管理 VIP（虚拟 IP）机制
- `kube-proxy` 负责处理 Service 的虚拟 IP，将流量转发到后端 Pod。它通过数据包处理逻辑（如 Linux 的 `iptables`）来实现，而不是实际监听这些 IP 地址的主机。

### 4) kube-proxy 的三种运行模式
- **iptables（默认）**：通过 iptables 规则顺序执行匹配和转发，适用于普通规模集群
- **IPVS**：基于 Linux 内核中的 IPVS 模块，以哈希表方式高效处理大规模服务的流量负载，适用于超过约 1000 个 Service 的集群。
- **用户空间模式（已弃用）**：性能较低，不推荐用于生产环境。

### 5) 查询 kube-proxy 模式的方法
- 可以查看 `kube-proxy` 日志开头部分，日志中会包含类似 “Using ipvs Proxier” 的提示，来确认当前运行的模式。

### 6) 会话亲和性（Session Affinity）与粘滞超时
- 默认情况下，Service 的 `sessionAffinity` 为 `None`，即不保证同一客户端的请求会被分配到同一 Pod。可以显式设置为 `ClientIP` 来启用基于客户端 IP 的粘滞会话。
- `.spec.sessionAffinityConfig.clientIP.timeoutSeconds` 参数用以设定会话保持的超时时间，默认值为 3 小时（10800 秒），范围为 >0 且 ≤86400（即最多一天）。仅在 Linux 平台有效，Windows 系统暂不支持该功能。

#### 会话粘滞时间的工作机制
- 会话超时从最初连接时开始计时。如果客户端在超时之前再次发起连接，会重新计时。例如：超时时间设为 30 分钟，第一次访问是在 15:00 且持续 12 分钟，则服务会保持到 15:30；如果在 15:26 再次访问，超时自动重置至 15:56。

---

## 二、结构化整理一览

| 项目 | 说明 |
|------|------|
| **默认类型** | ClusterIP，生成内部可访问的虚拟 IP。 |
| **DNS 名称** | `<service>.<namespace>.svc.cluster.local`（只限内部解析）。 |
| **VIP 管理** | kube-proxy 通过 iptables/IPVS 实现流量转发。 |
| **默认代理模式** | iptables，适合中小规模集群。 |
| **高性能模式** | IPVS，适合大规模集群（数千服务）。 |
| **弃用模式** | 用户空间模式，不建议用于生产。 |
| **会话亲和** | 默认无粘滞，可设置 `ClientIP` 实现。 |
| **超时时间** | 默认 3 小时（10800 秒），仅支持 Linux。 |
| **模式查看方法** | 查看 `kube-proxy` 日志中的 “Using ipvs Proxier” 等提示。 |

---

