---
title: k8s15-ReplicationController-1
date: 2025-08-26 11:34:53
tags:
---


## 核心功能与工作机制

1. **定义与作用**  
   ReplicationController（RC）是 Kubernetes 核心控制器之一，其主要功能是**保证集群中运行指定数量的 Pod 副本**。当有 Pod 被删除或失败时，RC 会自动新建 Pod；如果存在多余的 Pod，会自动删除以保持数量一致 ([kubernetes.io]())。

2. **动态调节副本数量**  
   RC 严格监控当前 Pod 数量与 `spec.replicas` 的期望值，若高于则删除、若低于则新建。该操作由 `kube-controller-manager` 控制().())。

---

## API 版本与声明方式

3. **API 版本**  
   - ReplicationController 的 API 版本为：**`apiVersion: v1`**（即核心 API 组）。  
   - 它是一种**声明式资源**，推荐通过 YAML/JSON 文件进行管理。

---

## 工作流程与管理建议

4. **创建与推荐方式**  
   - 建议通过 RC 创建 Pod 而不是单独创建“独立 Pod”，因为 RC 可在异常情况下自动重建 Pod，即便 `replicas: 1` 也具备容错能力   
   - 现代 Kubernetes 中，多推荐使用 Deployment，其背后使用的就是 ReplicaSet，具有滚动更新等高级功能 

---

## 结构与操作

5. **模板与扩缩容**  
   - RC 通过 Pod 模板（`template`）批量生成 Pod，并通过 `spec.replicas` 控制副本数量（默认值为 1，如未指定）。  
   - 可使用 `kubectl scale --replicas=<n> rc/<名称>` 来扩缩容。

6. **重启策略**  
   Pod 模板中的 `restartPolicy` 默认为 `Always`。如果需要改为 `OnFailure` 或 `Never`，需显式声明该参数。

7. **标签选择器（selector）**  
   - RC 使用基于等值匹配（equality-based）的标签选择器，仅支持 `matchLabels` 类似形式，不支持复杂的表达式。  
   - 如果没有显式配置 selector，Kubernetes 会自动使用模板中的标签作为选择条件。  
   - 模板中的 `metadata.labels` 必须与 selector 完全匹配，否则会报错。

---

## 删除及隔离 Pod 的方式

8. **删除策略**  
   - 直接删除 Pod 时，RC 会自动创建新的 Pod 来维持期望状态。  
   - 若要仅删除 RC 而保留 Pod，可使用：
     ```bash
     kubectl delete rc <名称> --cascade=orphan
     ```
     使 Pod “孤儿化”，脱离 RC 管理。

9. **隔离（脱离管理）**  
   - 将 Pod 的标签从 RC 的 selector 中移除，可让该 Pod 脱离 RC 管理。适用于故障排查或临时维护。完成后恢复标签即可再次纳入管理。

---

## 与 ReplicaSet 的关系与演进

10. **RS 是 RC 的升级版本**  
    - ReplicaSet 支持更灵活的标签选择器（如集合式 `matchExpressions`），而 RC 仅支持简单的等值匹配。

11. **推荐使用 Deployment 管理副本**  
    - Deployment 是更高级的控制对象，管理 ReplicaSet 并支持滚动更新、回滚、逐步扩缩容等高级功能。

12. **RC 的未来方向**  
    - 虽然 RC 仍被支持，但在现代 Kubernetes 中逐渐被弃用，推荐使用 ReplicaSet（在 Deployment 的控制下）。

---

## 总结对照表

| 方面 | RC (ReplicationController) | RS (ReplicaSet) | Deployment |
|------|-----------------------------|------------------|-------------|
| API 版本 | `v1` | `apps/v1` | `apps/v1` |
| Selector 类型 | 等值 (equality-based) | 等值 + 集合 (matchExpressions) | Deployment |
| 更新策略 | 无滚动更新概念 | 无滚动更新，需结合 Deployment 使用 | 支持滚动更新、回滚 |
| 管理方式 | 较旧，逐步弃用 | 常与 Deployment 配合使用 | Deployment（推荐） |
| 扩缩容命令 | `kubectl scale rc` | `kubectl scale rs` | `kubectl scale deployment` |

---

