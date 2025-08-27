---
title: k8s17-Deployment-2
date: 2025-08-27 15:19:13
tags:
---


我

## 1. 使用 Deployment 实现横向扩展（Scale Out）与收缩（Scale In）

- Kubernetes 通过 **Deployment** 控制器管理 **ReplicaSet（副本集）**，再由副本集管理 Pod 副本，实现横向扩展与收缩。  
  Deployment 中设定的 `.spec.replicas` 值即为期望副本数，Deployment 会确保对应的 ReplicaSet 和 Pod 数量与之保持一致。([官方文档最新说明])([kubernetes.io](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/?utm_source=chatgpt.com), [kubernetes.io](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/?utm_source=chatgpt.com))

---

## 2. 创建 Deployment 对象

- 使用 YAML 文件定义 Deployment（包括名称、标签选择器、Pod 模板及 `.spec.replicas` 等）；
- 使用命令创建 Deployment，例如：

<<<bash
kubectl apply -f deployment.yaml
<<<

（推荐用 `apply` 而非 `create`，便于后续更新）

---

## 3. 查看 Deployment、ReplicaSet 和 Pod 状态

- 执行以下命令查询资源状态：

<<<bash
kubectl get deploy,rs,pod
<<<

- 要查看 ReplicaSet 或 Pod 的更多关联标签信息，可以加上 `--show-labels` 参数；Deployment rollout 状态可以通过 `kubectl rollout status deployment/<name>` 检查。

---

## 4. 使用 `kubectl scale` 执行横向扩展／收缩

- 手动调整副本数的命令格式：

<<<bash
kubectl scale deployment/<deployment-name> --replicas=<数量>
<<<

或通过 YAML 文件统一管理：

<<<bash
kubectl scale -f <filename>.yaml --replicas=<数量>
<<<

- 可搭配 `--current-replicas=<当前数量>` 参数设定前置条件，确保安全变更。([官方 kubectl scale 参考])([komodor.com](https://komodor.com/learn/kubectl-scale-deployment-the-basics-and-a-quick-tutorial/?utm_source=chatgpt.com), [kubernetes.io](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/?utm_source=chatgpt.com))

---

## 5. 扩展后的行为验证

- 执行扩展后，Deployment 控制器会启动新的 ReplicaSet（若模板已更新）或调整现有 ReplicaSet 的副本数量。系统会确保 Pods 数量匹配期望值。([官方文档说明])([kubernetes.io](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/?utm_source=chatgpt.com))
- 使用 `kubectl get pods` 可核实实际运行的 Pod 数量。

---

## 6. 缩减（Scale In）与收缩至 0 的行为

- 若将副本数设置为较小值，如 2，系统会自动终止多余 Pod，实现收缩功能。
- 若设置为 0，可保留 Deployment 和 ReplicaSet 对象，但 Pod 会全部删除。需要注意：缩减至 0 后可能存在 Pod 终止的延迟状态（Terminating 状态），应等待状态稳定后再继续操作。([实用参考说明])([stormforge.io](https://www.stormforge.io/kubernetes-autoscaling/kubectl-scale-deployment-to-0/?utm_source=chatgpt.com))

---

## 7. 再次扩展（Scale Out 再次使用）

- 再次设置副本数（如从 0 调整为 3），即可恢复对应数量的 Pods。Deployment 会重新启动对应 ReplicaSet 创建 Pod。无须重新创建 Deployment 对象。([官方机制说明])([kubernetes.io](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/?utm_source=chatgpt.com))

---

## 8. 自动扩缩机制（补充——更智能）

除了手动 `kubectl scale`，Kubernetes 还支持自动扩缩机制：

- **Horizontal Pod Autoscaler（HPA）**：基于 CPU／内存或自定义指标自动调整 Deployment 副本数。适用于工作负载波动频繁的场景。([官方 HPA 文档])([spot.io](https://spot.io/resources/kubernetes-architecture/kubernetes-hpa-the-basics-and-a-quick-tutorial/?utm_source=chatgpt.com), [kubernetes.io](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/?utm_source=chatgpt.com))
- **Vertical Pod Autoscaler（VPA）**：动态调整 Pod 的资源配置（例如 CPU、内存），通过重新调度 Pod 实现。更适用于性能提升和资源利用优化。([相关介绍])([medium.com](https://medium.com/%40muppedaanvesh/a-hands-on-guide-to-kubernetes-horizontal-vertical-pod-autoscalers-%EF%B8%8F-58903382ef71?utm_source=chatgpt.com))
- **Cluster Autoscaler**：自动调整 Kubernetes 集群中的节点数量，以适应 Pods 对资源的需求变化。HPA 和 Cluster Autoscaler 可协同工作：若 HPA 请求的 Pod 多于当前集群可用资源时，Cluster Autoscaler 会增加节点容量。([CA 与 HPA 协作说明])([docs.digitalocean.com](https://docs.digitalocean.com/products/kubernetes/how-to/set-up-autoscaling/?utm_source=chatgpt.com))

---

## 总结对比表

| 功能／场景         | 方式                             | 描述 |
|------------------|----------------------------------|------|
| 手动扩缩         | `kubectl scale`                   | 直接控制副本数，简洁直观 |
| 使用 YAML 管理扩缩 | 修改 `.spec.replicas` + `apply`   | 可与版本控制结合，方便管理 |
| 自动扩缩         | HPA、VPA、Cluster Autoscaler      | 根据指标自动伸缩，适应动态负载 |
| 缩减到 0         | `--replicas=0`                    | 删除所有 Pod，但保留对象结构；注意缩减后的影响 |

---
