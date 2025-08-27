---
title: k8s17-Deployment-1
date: 2025-08-27 11:40:30
tags:
---


## 二、复制集功能应用理解  
Deployment 与 ReplicaSet 的核心差异：  
- API 版本相同，仅需修改 `kind` 字段（`Deployment` 或 `ReplicaSet`）  
- 命名规则：Deployment 名称可自定义，需删除原 ReplicaSet 的 `engineer-x` 标签  
- 副本数默认值：未指定 `replicas` 参数时默认为 1  
- 选择器配置：支持 `matchLabels` 或 `matchExpressions`，Deployment 通过 ReplicaSet 间接管理 Pod 时需保持一致  
- 模板继承：除 `kind` 字段外，ReplicaSet 的其余参数可直接复用至 Deployment 配置  

## 三、部署操作  
执行命令 `kubectl apply -f deployment/engineers-multi-container.yaml` 完成部署。

### 1. 查看部署对象状态  
通过 `kubectl get deploy -o wide` 查看状态：  
- 运行状态：显示所有 Pod 均为 Running 且 Available  
- 容器信息：列示每个容器使用的镜像及标签  
- 选择器验证：确认 `matchLabels` 表达式与配置一致  
- 部署流程：Deployment 首先创建 ReplicaSet  

### 2. 查看副本集对象状态  
字段说明：  
- ReplicaSet 名称前缀为 Deployment 名称，后缀为随机哈希值  
- Pod 模板哈希由 ReplicaSet 自动添加，用于区分不同版本的 ReplicaSet（如升级/回滚场景）  
- 状态同步：Ready 状态计数与 Deployment 中定义的副本数一致  

### 3. 查看副本对象状态  
执行 `kubectl get pod -o wide` 输出：  
- 命名规则：Pod 名称以 ReplicaSet 前缀开头，后接随机字符  
- 网络配置：每个 Pod 分配独立 IP 地址，但 IP 为临时性分配（删除后重建会变更）  
- 数据隔离：同一 ReplicaSet 下的 Pod 共享模板配置，但应用数据相互独立  

#### 1) 应用案例  
- 通过 `curl` 访问 Pod IP 可获取实时数据：数据一致性高，但不保证完全同步  
- 故障自愈：手动删除 Pod 后，ReplicaSet 会自动重建新 Pod 以维持副本数  
- 状态验证：新 Pod 的创建时间、IP 地址均会更新  

### 4. 删除副本集操作  
- 操作结果：删除 ReplicaSet 后 Deployment 立即重建同名 ReplicaSet（哈希值不变）  
- Pod 生命周期：旧 Pod 终止，新 Pod 由新建的 ReplicaSet 创建  
- 应用场景：需重新加载 ReplicaSet 配置时，可直接删除原对象触发重建  

### 5. 部署的清理操作  
完整清理流程：  
- 删除 Deployment：执行 `kubectl delete deploy <name>`  
- 级联删除：Deployment 自动移除关联的 ReplicaSet 及 Pod  
- 状态验证：检查各资源状态均为 Terminating 直至完全清除  

---

**补充说明（参考官方文档）**

- **Deployment 管理 ReplicaSet**  
  Deployment 是用于声明所期望状态的高级控制器，它会创建/管理 ReplicaSet 和 Pod，以持续对齐实际状态与期望状态，并支持滚动更新、回滚等功能。

- **ReplicaSet 的自愈与扩缩容机制**  
  ReplicaSet 确保指定数量的 Pod 始终运行，如有 Pod 被删除或失败，会自动补齐 。

- **Deployment 的更新行为与模板哈希机制**  
  Deployment 更新 `.spec.template` 会触发新 ReplicaSet 的创建，Deployment 控制器会添加 `pod-template-hash` 标签以确保版本隔离 。

- **目录结构与配置管理建议**  
  Kubernetes 并不强制特定文件夹结构，但推荐将 YAML 文件放在版本控制目录中，并可使用 `kubectl apply` 操作整个目录 。

---

### 总览表

| 项目                           | 说明 |
|--------------------------------|------|
| Deployment 管理 ReplicaSet       | 高级控制器，提供滚动更新、回滚等功能 |
| ReplicaSet 自愈机制               | 确保 Pod 数量恒定，Pod 若删除会自动补齐 |
| `pod-template-hash`               | Deployment 自动添加，确保 ReplicaSet 版本隔离 |
| 目录结构建议                      | 将部署 YAML 放入版本控制目录，支持一次应用整个目录 |
---


