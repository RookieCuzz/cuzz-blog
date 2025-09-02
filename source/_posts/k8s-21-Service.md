---
title: k8s-21-Service
date: 2025-08-29 09:28:30
tags:
---
## 什么是 Kubernetes Service？

Kubernetes Service 是一种网络抽象层，让集群内部运行的多个 Pod 通过一个统一的稳定访问入口暴露出来。这种方式 **避免了因 Pod IP 地址的不断变化而导致客户端配置频繁更新或请求失败**。  
Kubernetes Service 同时具备负载均衡功能，将请求分发给后端 Pod。

## Kubernetes Service 类型

Kubernetes 提供五种主要的 Service 类型，根据访问方式不同适用于不同场景：
- **ClusterIP**（默认）：仅在集群内部访问，提供内部稳定 IP。
- **NodePort**：在每个 Node 上开放静态端口，允许外部访问，同时仍保留 ClusterIP。
- **LoadBalancer**：在云平台上创建外部负载均衡器，自动转发流量，包含 NodePort 和 ClusterIP。
- **ExternalName**：将 Service 映射到外部 DNS 名，不关联后端 Pod，不提供负载均衡。
- **Headless Service**：不分配 ClusterIP，DNS 直接返回 Pod IP 地址，便于客户端自行选择 Pod 访问。

## 各类型 Service 的对比表

以下是不同 Service 类型的对比、用途和连接方式：

| 类型             | 可访问范围     | 典型用途                          | 连接方式                         |
|------------------|----------------|-----------------------------------|----------------------------------|
| **ClusterIP**     | 集群内部       | 内部服务间通信（如后端服务）       | `ClusterIP:port`                 |
| **NodePort**      | 外部（通过节点） | 简易暴露，适合测试或开发场景       | `NodeIP:nodePort` 或 `ClusterIP` |
| **LoadBalancer**  | 外部（云平台）   | 公网服务，生产环境常用               | LB → NodePort → ClusterIP       |
| **ExternalName**  | 集群内部       | 将 Service 映射到外部域名          | DNS 名 → 外部域名               |
| **Headless**      | 集群内部       | 允许客户端直接访问 Pod（无代理）     | DNS 返回 Pod IP 列表           |



## 为什么要使用不同类型的 Service？

- **ClusterIP**：保证集群内部应用可以稳定访问后端 Pods，不受 Pod IP 变动影响。
- **NodePort**：在无外部 Load Balancer 支持的环境下，也能实现基础外部访问。
- **LoadBalancer**：具备高可用外部接入能力，但通常依赖云平台资源。
- **ExternalName**：便于在集群内引用第三方服务而无需直接依赖其 IP。
- **Headless Service**：适用于需要客户端自己决定 Pod 目标（如自定义负载均衡）的特殊场景。

---

