---
title: k8s-21-Service-5-NodePort-2
date: 2025-08-29 14:17:43
tags:
---
# 一、服务工作流程概念图（NodePort 类型）

## 1. NodePort 服务类型概述
- **定义**：NodePort 是 Kubernetes Service 的一种类型，它会在每个节点（Node）上开放一个指定端口（范围默认为 `30000-32767`），并将请求转发至后端的 Pod。
- **访问方式**：客户端只需要知道集群中任意节点的 IP 和 NodePort，就可以访问到对应的服务。
    - 例如：`<NodeIP>:<NodePort>`

---

## 2. 外部客户端访问流程
1. 外部客户端通过节点 IP（如 `192.168.0.200`）+ NodePort（如 `32080`）发起请求。
2. 请求数据包包含：
    - **源地址**：客户端 IP
    - **目标地址**：节点 IP + NodePort
3. 数据包到达目标节点的 **kube-proxy** 组件，由其执行转发逻辑。

---

## 3. 网络地址转换（NAT 与反向 NAT）
在 NodePort 服务中，数据包的请求与响应涉及 NAT（地址转换）与 DNAT（目的地址转换），其原理类似家庭路由器共享公网 IP：

| 阶段   | 地址转换类型 | 源地址         | 目标地址            | 技术原理 |
|--------|--------------|----------------|---------------------|----------|
| 请求阶段 | DNAT          | 客户端 IP      | 节点 IP + NodePort  | kube-proxy 将目标地址改写为某个 Pod IP + 目标端口 |
| 响应阶段 | SNAT/反向DNAT | Pod IP        | 客户端 IP           | kube-proxy 将 Pod 源地址改写回节点 IP，确保客户端可识别 |

---

## 4. 请求与响应的流程
- **请求路径**：  
  <<<
  客户端 → 节点IP:NodePort → kube-proxy（DNAT） → Pod（可能在跨节点）
  <<<
- **响应路径**：  
  <<<
  Pod → kube-proxy（反向DNAT） → 节点IP → 客户端
  <<<
- **关键点**：
    - **跨节点通信**：kube-proxy 会将流量通过 **DNAT** 转发到正确的 Pod IP（即使 Pod 不在当前节点）。
    - **对称路径**：请求和响应都必须经过 kube-proxy，保证 NAT 映射一致。

---

## 5. 流量传输总结
- NodePort 服务的核心机制：
    1. **NAT**：实现外部访问 → 将 Node IP + NodePort 转换为 Pod IP + ContainerPort。
    2. **DNAT**：处理跨节点通信 → 确保流量被转发到目标 Pod。
    3. **反向 DNAT**：在返回时改写地址，保证客户端能够收到 Pod 的响应。
- **优点**：
    - 简单直接，外部可访问。
    - 请求可落到任意节点，由 kube-proxy 负责转发。
- **缺点**：
    - NodePort 端口范围有限。
    - 需额外管理防火墙和端口策略。
    - 大规模场景下通常配合 LoadBalancer 或 Ingress 使用。

---

