---
title: k8s15-ReplicaSet-1
date: 2025-08-27 09:20:38
tags:
---


### 一、ReplicaSet 基础与原理

- **ReplicaSet 的职责**：确保在任意时刻都维持指定数量的 Pod 副本，增强应用的可用性与稳定性。
- **与 ReplicationController 的区别**：
  - ReplicaSet 支持更灵活的选择器机制（如 `matchExpressions`），而 ReplicationController 仅支持简单的等号匹配。 (注：文中原有网页引用在此省略)
  - ReplicationController 已逐渐被淘汰，ReplicaSet 是更现代、更高效的替代方案。

### 二、ReplicaSet YAML 基本结构与示例

以下是一个典型的 `apps/v1` 版本 ReplicaSet YAML 示例：

```yaml
apiVersion: apps/v1
kind: ReplicaSet
metadata:
  name: engine-x-replicaset
  labels:
    app: engine-x
    environment: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: engine-x
      environment: production
  template:
    metadata:
      labels:
        app: engine-x
        environment: production
    spec:
      containers:
      - name: engine-x-container
        image: your-image:tag
        ports:
        - containerPort: 80
      # volumes 可按需添加，与多容器配置一致
```

- `apiVersion: apps/v1` 与 `kind: ReplicaSet` 是必选项。
- `spec.selector` 可以使用 `matchLabels` 或 `matchExpressions`，后者提供更灵活的匹配逻辑。
- `template.metadata.labels` 必须完全匹配 `spec.selector`，否则 ReplicaSet 无法正确识别与管理 Pods。

### 三、部署与验证流程

1. **部署 ReplicaSet：**  

```bash
kubectl apply -f engine-x-multi-container.yaml ##推荐
#或 kubectl create -f engine-x-multi-container.yaml
```
2. **查看 ReplicaSet 状态：**  
```shell
kubectl get rs -o wide
```
3. **清理操作**

```bash
删除 ReplicaSet 及其所有关联 Pods：
```