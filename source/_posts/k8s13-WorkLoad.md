---
title: k8s13-WorkLoad
date: 2025-08-26 11:10:08
tags:
---
# 一、Kubernetes 工作负载资源（Workload Resources）

> *此字幕由 AI 自动生成。本节将讨论 Kubernetes 的工作负载资源。*

---

## 1. 课前回顾

- Pod 是 Kubernetes 集群中部署独立应用的基本单元。  
- 当 Pod 所在节点发生硬件、软件或操作系统故障时，Pod 会被终止，且不会自动恢复。  
- Kubernetes 控制的是容器的重启（依据 `restartPolicy`），而不是 Pod 的创建与销毁。

---

## 2. 为什么要学习 Workload Resources？

- **独立 Pod 的缺陷**：需手动管理 Pod 的生命周期，Kubernetes 不保证故障后的自动恢复。
- **关键应用部署的风险**：独立 Pod 无法确保高可用性。  
- **Workload Resources 的核心价值**：通过控制器自动管理 Pod 生命周期，确保实际状态与预期状态一致。

---

## 3. Workload Resources 介绍

Kubernetes 提供多种内置的工作负载资源类型，每种适应不同的使用场景：

### （1）ReplicationController  
- 运行多个 Pod 副本的基础控制器。ReplicaSet 是它的升级版，目前更多使用后者。

### （2）ReplicaSet  
- 确保总有指定数量的 Pod 副本在运行。  
- 通常由 Deployment 管理，不建议直接使用。

### （3）Deployment  
- 最常用的负载资源，管理无状态应用的 Pod。  
- 核心功能包括：扩缩容、滚动更新与回滚、版本管理等。

### （4）DaemonSet  
- 确保集群中每个节点（或某些节点）都运行指定 Pod，一个节点对应一个副本。  
- 常用于日志收集、监控守护进程等节点级服务。

### （5）StatefulSet  
- 用于有状态应用，提供稳定的网络标识和持久化存储支持。  
- 常见于数据库、消息队列等场景。

### （6）Job 与 CronJob  
- **Job**：执行一次性任务（如数据备份/恢复），完成后自动清理。  
- **CronJob**：定期执行任务（如每日备份），基于 cron 调度。

---

## 4. 应用 Workload Resources 能带来哪些收益？

- 控制器会持续监控并确保 Pod 数量和状态符合预期，无需手动干预。
- Workload Resources 简化了应用部署操作，提高可靠性与可维护性。  

---

## 总结与补充

- **Pod 是基础单元**，但生产环境应通过 Deployment、StatefulSet 等控制器管理。  
- **Deployment** 是最常用的资源，支持高可用性、滚动更新、回滚等特性。  
- **StatefulSet** 适用于需要持久性和唯一标识的应用；**DaemonSet** 用于节点级服务；**Job / CronJob** 用于处理一次性或周期性任务。  
- 使用 Workload Resources 是 Kubernetes 最核心、最重要的实践方式。

---
