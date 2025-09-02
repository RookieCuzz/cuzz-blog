---
title: k8s-21-Service-3
date: 2025-08-29 10:37:02
tags:
---



你提供的笔记内容相当完整，涵盖了 Kubernetes Service、Endpoints（终端对象）和其动态变化机制，也包括了通过声明式与命令式方式创建服务的操作步骤。以下是我对这段笔记进行的**修正与补充整理**，并结合权威资料进行说明和校正：

---

## 一、服务（Service）与终端对象（Endpoints / EndpointSlices）的功能与机制

### 核心功能 
- Service 的关键功能是创建一个或多个 **终端节点对象**（Endpoints 或 EndpointSlices），用于标识、更新和维护后端 Pod 的 IP 与端口映射，从而可借助负载均衡转发流量。(https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- 服务本身并不直接处理流量分发，而是依赖 kube-proxy 或其他 service proxy 使用该终端信息进行流量路由。(https://kubernetes.io/docs/concepts/services-networking/service/)

### 终端对象的动态机制
- 当 Service 包含 `selector` 时，控制平面会自动创建 Endpoints 或 EndpointSlices 对象与其关联，**动态维护当前匹配 Pod 的 IP 列表**。删除 Pod 后，新的 Pod IP 会加入 Endpoints/EndpointSlices，旧的则被移除。(https://kubernetes.io/docs/tutorials/kubernetes-basics/expose/expose-intro/)
- **EndpointSlices** 是相较旧版 Endpoints 的改进机制：更加可扩展，将一个 Service 的后端端点拆分为多个小块管理，并支持存储 `ready`、`terminating`、`serving` 等状态信息。(https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- 自 Kubernetes v1.33 起，官方已将 Endpoints API 标记为 **deprecated（弃用）**，推荐使用 EndpointSlices。(https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/)

---

## 二、笔记中关于标签与端口识别的说明

- Service 使用标签（如 `app=engineering`）匹配后端 Pod，以构成 Endpoints/EndpointSlices，这一点准确：标签选择器 (`selector`) 是 Service 与 Pod 联动的核心。
- 提到终端节点包含三个 IP 并可通过端口核对（如 139、141、236），对应的是 Endpoints 对象中的 `subsets.addresses` 和 `ports` 字段。示例结构类似：

```yaml
subsets:
  - addresses:
      - ip: 10.0.0.139
      - ip: 10.0.0.141
      - ip: 10.0.0.236
    ports:
      - port: 80
```

- “终端对象（EP）与服务同名创建，仅当服务使用选择器（selector）时才会生成终端节点。”——是的；若 Service 无 selector（例如 ExternalName），不会自动生成 Endpoints/EndpointSlices。
- “默认命名空间内所有应用监听 80 端口，默认使用 TCP 协议。”——这只是你当前环境的约定，并非 Kubernetes 的全局默认；协议默认是 TCP，但应用监听端口本身并无“默认 80”的强制规则。

---

## 三、删除 Pod 后的端口变化过程（动态更新机制）

1. 删除对应 Pod（如 IP 尾号 141）后，ReplicaSet/Deployment 会立即创建新 Pod（假设 IP 尾号 142）以维持副本数。
2. EndpointSlices/Endpoints 及时更新：移除旧 IP，加入新 IP。
3. Service 基于最新终端信息转发流量至新 Pod 的 `targetPort`（如 80），实现无缝切换。

---

## 四、通过声明式与命令式方式创建 Service

### 声明式（YAML）
可补充一个最小可用的 Service 示例（ClusterIP）：

```yaml
apiVersion: v1
kind: Service
metadata:
  name: engineering-svc
spec:
  selector:
    app: engineering
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: ClusterIP
```

> 说明：`port` 为 Service 对外（集群内）的端口，`targetPort` 为 Pod 内部容器监听端口。

### 命令式（kubectl expose）
使用 `kubectl expose` 快速创建 Service：

```bash
kubectl expose deployment nginx-deploy \
  --port=1890 \
  --target-port=80 \
  --selector=app=nginx \
  --name=nginx-svc
```

关键参数：
- `--port`：Service 端口（例如 1890）。
- `--target-port`：容器内应用实际监听端口（例如 80）。
- `--selector`：需与 Pod 标签匹配（如 `app=nginx`）。
- `--name`：Service 名称（如 `nginx-svc`）。

创建后可执行 `kubectl get svc -o wide` 查看 Service 类型为 ClusterIP，端口为 1890；并用 `curl <ClusterIP>:1890` 验证访问。

---

## 五、清理操作

- 删除工作负载：`kubectl delete -f nginx-deploy.yaml`
- 删除服务：`kubectl delete svc nginx-svc`

---

## 六、补充注意事项与建议

1. **优先使用 EndpointSlices**（大规模/生产环境），Endpoints 已弃用。
2. **Service 无 selector** 时不会自动生成终端对象；此时需手动管理后端或使用特定类型（如 ExternalName）。
3. **协议默认 TCP**；若需 UDP/SCTP，需显式指定。
4. **多端口/多地址**：EndpointSlices 支持复杂端口与地址组合，更利于扩展与可观测。

---

## 最终整理（速记版）

```text
一、核心功能
- Service 不直接分发流量；它通过 Endpoints/EndpointSlices 维护后端 Pod 的 IP:Port，kube-proxy 据此转发。

二、终端机制
- 有 selector 则自动生成同名终端对象并动态维护（加新 IP、移旧 IP）。

三、删除 Pod 的影响
- 控制器拉起新 Pod → 终端对象更新 → 流量自动指向新 Pod 的 targetPort。

四、创建方式
- 声明式（YAML）：定义 selector、ports、targetPort。
- 命令式（expose）：
  kubectl expose deployment nginx-deploy --port=1890 --target-port=80 --selector=app=nginx --name=nginx-svc

五、验证与清理
- kubectl get svc -o wide；
- curl <ClusterIP>:1890；
- kubectl delete -f …；kubectl delete svc …

建议：生产优先用 EndpointSlices，尽量熟悉其结构与状态字段。
```
