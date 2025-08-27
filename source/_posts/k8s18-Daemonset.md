---
title: k8s18-Daemonset
date: 2025-08-27 17:36:30
tags:
---
### 一、DaemonSet

DaemonSet 是 Kubernetes 中的一种工作负载资源类型。

1. **DaemonSet 的目的**  
   DaemonSet 的核心功能是确保在每个集群节点上运行一个 Pod 实例。与 ReplicaSet 或 Deployment 不同，DaemonSet 不支持副本数配置，因为设计目标不是横向扩展，而是保证节点级的全覆盖部署。该机制适用于以下场景：  
   - 动态集群环境（节点数量可能变化）  
   - 控制平面与计算平面节点均需部署  
   - 日志收集或节点级监控任务

2. **DaemonSet 的流程**  
   DaemonSet 直接创建 Pod，而不是通过副本控制器管理，其工作流程不涉及 ReplicaSet 组件。

3. **DaemonSet 的 API 版本**  
   DaemonSet 的 API 版本与 Deployment 相同，均为 `apps/v1`。需注意：控制平面节点默认不接受工作负载，因此需通过 Toleration（容忍度）配置以允许部署。

4. **容忍（Toleration）与污点（Taint）的应用**  
   在控制平面上部署 DaemonSet Pod 需满足两个条件：  
   - 节点污点（Taint）与 Pod 容忍度相匹配 —— 显式声明 Toleration  
   - 该机制确保 Pod 可调度至带特定 Taint 的控制平面节点

5. **选择器的应用**  
   DaemonSet 通过双选择器机制识别管理的 Pod：  
   - `matchLabels`：精确匹配标签  
   - `matchExpressions`：表达式匹配标签  
   选择器必须与 Pod 模板（metadata.labels）完全匹配，否则无法建立关联关系。

6. **节点选择器（nodeSelector）与节点亲和性（nodeAffinity）的应用**  
   可通过调度控制机制限制 DaemonSet 的部署范围：

   | 机制类型       | 功能描述       | 适用场景           |
   |----------------|----------------|--------------------|
   | `nodeSelector` | 基础节点选择   | 按固定标签过滤节点 |
   | `nodeAffinity` | 高级调度策略   | 复杂条件（软/硬性）|
   | 默认配置       | 无特殊配置     | 全节点覆盖场景     |

7. **DaemonSet 的更新策略**  
   DaemonSet 支持两种更新策略：  
   - **RollingUpdate**（默认）：逐节点滚动升级，无需人工干预  
   - **OnDelete**：手动删除 Pod 后才触发更新（需要管理员手动操作）  
     
   与 Deployment 不同，DaemonSet 不支持 Scaling 操作，但仍保留版本回滚的能力 :contentReference[oaicite:1]{index=1}。

8. **修订历史限制（revisionHistoryLimit）**  
   DaemonSet 可通过 `revisionHistoryLimit` 参数控制历史版本保留数量，默认为 **10**。每个修订版本会存储在 `ControllerRevision` 资源中，用于记录镜像、环境变量等配置变更。你可以通过以下命令查看历史记录：  
```shell
kubectl get controllerrevision -l <DaemonSet 标签>
```