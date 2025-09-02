---
title: k8s-24-LoadBalancer-Headless
date: 2025-08-29 17:43:27
tags:
---
## Images:
![Kubernetes Headless Service - Introduction and examples | Devops Junction](https://tse4.mm.bing.net/th/id/OIP.K1hbPuFfHC89mrUY7D88gQHaEn?r=0&pid=Api)
![kubernetes Headless Service | HYOUBLOG](https://tse2.mm.bing.net/th/id/OIP.HIHhLP6mDtll44DMNccjEgHaEJ?r=0&pid=Api)
![k8s的 Headless Service和target port_service targetport-CSDN博客](https://tse2.mm.bing.net/th/id/OIP.Hqg3aBESMRJ-hP7tlCfkdgHaEQ?r=0&pid=Api)
![Headless services in Kubernetes Vs Regular Service: What, Why, and How ...](https://tse3.mm.bing.net/th/id/OIP.zt8f6LnlWRlNXNPZAobMRwHaEK?r=0&pid=Api)

---

## 一、传统方式部署（ClusterIP Service + Deployment）

- **部署流程**：通过 `Deployment` 控制器创建 `ReplicaSet`，由 ReplicaSet 生成所需数量的 Pod；
- **Service 作用**：当使用 `Service`（如默认 `ClusterIP` 或者 `LoadBalancer` 类型）时，系统会分配一个稳定的 Cluster IP，并注册 DNS 名称（例如 `nginx-svc.default.svc.cluster.local`）；
- **流量分发**：访问 Service 的 DNS 后，流量首先路由到 Cluster IP，接着由 kube‑proxy 执行轮询负载均衡，将请求转发至后端 Pod。kube‑proxy 提供了代理与负载均衡功能。([kubernetes.io](https://kubernetes.io/docs/concepts/services-networking/service/), [en.wikipedia.org](https://en.wikipedia.org/wiki/Kubernetes), [cloud.google.com](https://cloud.google.com/kubernetes-engine/docs/concepts/service))

这种方式适用于无状态服务（如 Web 服务、API 请求等），客户端无需感知 Pod 的具体 IP。

---

## 二、头尾服务方式部署（Headless Service）

| 对比项         | 传统 Service（ClusterIP）                | Headless Service                               |
|----------------|-----------------------------------------|-----------------------------------------------|
| Cluster IP     | 存在，作为流量中介                        | 不存在（clusterIP: None）                      |
| DNS 解析目标   | 指向 Service 的 IP                       | 直接返回所有 Pod 的 IP                          |
| 负载均衡       | 由 kube‑proxy 实现                       | 无中间层，由客户端/解析结果自行决定访问目标     |
| 使用场景       | 无状态应用，需要统一入口                  | 需要直接访问到 Pod 的有状态或定制场景           |

**关键差异**：Headless Service 不会分配 Cluster IP，客户端通过 DNS 查询会直接获取每个 Pod 的 IP，绕过 kube‑proxy 的 Service 代理机制，适用于需要直连 Pod 的场景，例如分布式数据库节点、StatefulSet 应用等。([Stack Overflow](https://stackoverflow.com/questions/52707840/what-is-a-headless-service-what-does-it-do-accomplish-and-what-are-some-legiti), [Timeplus Blog](https://www.timeplus.com/post/kubernetes-service-vs-headless-service))

---

## 三、Headless Service 的工作机制及实践

1. **创建 Headless Service**：在 Service 的 YAML 中设置 `spec.clusterIP: None`，示例如下：  
    ```yaml
    apiVersion: v1
    kind: Service
    metadata:
      name: my-headless-service
    spec:
      clusterIP: None
      selector:
        app: my-app
      ports:
      - port: 80
        targetPort: 8080
    ```  
    应用后，会看到 `ClusterIP` 显示为 `None`，并且 Type 通常仍显示为 `ClusterIP`。（参考：[Plural](https://www.plural.sh/blog/kubernetes-headless-service-guide/)）  

2. **DNS 解析行为**：DNS 查询（如 `nslookup my-headless-svc`）会返回所有符合 selector 的 Pod IP，而不是单一的 Service IP。客户端可以使用这些 IP 直接访问对应 Pod。（参考：[Plural](https://www.plural.sh/blog/kubernetes-headless-service-guide/)）

3. **扩缩容动态更新**：Deployment 扩容或缩容 Pod 副本后，DNS 返回结果也会实时更新，反映当前 Pod 的 IP 列表。

4. **适用场景**：
   - **StatefulSet 应用**：每个 Pod 拥有稳定的网络标识，可以通过 headless service 实现 Pod 名称解析（例如 `pod-0.svc.namespace.svc.cluster.local`），便于有状态服务识别节点身份。
   - **自定义客户端负载均衡**：客户端可以基于 Pod IP 实现更细粒度的策略，例如优先访问延迟最低的 Pod。
   - **服务发现机制**：不依赖 kube‑proxy 的代理机制，而是由客户端自行选择目标 Pod，有利于微服务或自定义发现方案。

---

## 四、总结建议

- **无状态服务**（如 Web 服务、API）适宜使用传统 `ClusterIP`（或 `LoadBalancer`）Service，提供统一入口与负载均衡；
- **有状态服务或需要节点标识的场景**（如数据库集群、分布式应用、StatefulSet 等）推荐使用 Headless Service。
