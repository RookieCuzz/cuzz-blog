---
title: k8s17-Deployment
date: 2025-08-27 11:02:23
tags:
---


## 1. ReplicaSet 
- Deployment 是 Kubernetes 中用于管理 ReplicaSet 的工作负载资源  
- Replication Controller 和 ReplicaSet 是 Deployment 的前身技术  
- ReplicaSet 通过标签选择器确保指定数量的 Pod 副本始终运行  

## 2. Deployment 

### 1) 部署对象的特点
- Deployment 对象简写为 `deploy`，可通过 `kubectl` 命令操作  
- **继承 ReplicaSet 功能**：支持横向扩展（scaling）和收缩（scale out）  
- **新增功能**：  
  - 支持滚动更新（rollout）和回滚（rollback）操作  
  - 通过 `matchLabels` 和 `matchExpressions` 实现选择器功能  
- **升级流程**：  
  - 修改 Pod 模板后，Deployment 会创建新的 ReplicaSet  
  - 新 ReplicaSet 会生成带唯一 `template-hash` 标签的 Pod  
  - 旧 ReplicaSet 的 Pod 会被逐步替换  
- **回滚机制**：  
  - 回滚时不会删除历史 ReplicaSet  
  - 系统会重新激活旧 ReplicaSet 创建 Pod  
- **生产环境建议**：  
  必须使用 Deployment 对象管理应用，而非直接使用 Pod、ReplicationController 或 ReplicaSet  

### 2) 部署对象的流程  
- 工作流程：`Deployment → ReplicaSet → Pod`  
- 核心功能：  
  - 横向扩展/收缩  
  - 滚动更新/回滚  
  - 历史 ReplicaSet 保留（默认不删除，可手动清理）  

### 3) API 版本  
- YAML 文件中需指定 API 版本  
- Deployment 与 ReplicaSet 使用相同 API 版本  
- 版本一致性：因 Deployment 依赖 ReplicaSet 实现功能  

### 4) 部署管理复制集  
- 禁止手动修改 Pod 模板哈希标签（`pod-template-hash`）  
- 标签管理由 Deployment 自动维护，确保版本控制准确性  

### 5) 部署滚出和回滚  
- 两种操作方式：  
  - 命令式（imperative）：通过 kubectl CLI 执行  
  - 声明式（declarative）：通过 YAML 文件配置  
- 推荐方式：优先使用命令式操作  

### 6) 查看部署滚动历史  
- 查看命令：`kubectl rollout history deployment/<deployment-name>`  
- 输出内容：显示所有修订版本（升级/降级记录）  

### 7) 部署回滚  
- 回滚命令：`kubectl rollout undo`  
- 本质操作：将应用降级至历史版本  

### 8) 复制修订详情  
- 修订版本特性：每个版本对应唯一的 Pod 模板  
- 历史记录：不存在完全相同的两个修订版本  

### 9) 部署策略  
| 策略类型 | 操作特点 | 适用场景 | 默认状态 |
|---------|---------|---------|--------|
| RollingUpdate | 逐个 Pod 更新 | 保证服务连续性 | 是 |
| Recreate | 先删除全部旧 Pod 再创建新 Pod | 需要完全替换环境 | 否 |

### 10) 修订历史限制  
- 默认保留 10 个修订版本  
- 修改参数：通过 `spec.revisionHistoryLimit` 字段配置  
- 实践建议：根据存储资源和审计需求调整保留数量  

---

**补充说明（基于官方文档）**

- **Deployment 管理 ReplicaSet 与 Rolling Update / 回滚**  
  Deployment 支持声明式管理 Pod 与 ReplicaSet 的期望状态，同时提供滚动更新与回滚功能，能安全平滑地在不同版本间切换 。

- **`pod-template-hash` 标签作用**  
  该标签由 Deployment 控制器自动添加到每个由 Deployment 创建或采用的 ReplicaSet 中，确保不同 ReplicaSet 之间不发生重叠，维护版本隔离性。

- **默认保留历史 ReplicaSet 修订版本数量**  
  默认情况下，Deployment 会保留最近 10 个 ReplicaSet 版本，可通过 `revisionHistoryLimit` 调整，例如设置为 0 表示不保留任何历史版本。

---

### 总览表

| 项目                             | 描述 |
|----------------------------------|------|
| Deployment 管理 ReplicaSet       | 是较高级别的工作负载资源，支持滚动更新与回滚 |
| `pod-template-hash` 标签         | 自动添加，确保 ReplicaSet 版本隔离 |
| `revisionHistoryLimit`           | 控制历史版本保留数量，默认是 10，可自定义 |

---
  