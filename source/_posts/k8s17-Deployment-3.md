---
title: k8s17-Deployment-3
date: 2025-08-27 16:14:31
tags:
---

# Deployment 的更新与回滚（Rollout / Rollback）

通过 Deployment 工作负载实现应用程序的升级（rollout）与降级（rollback）。  
执行命令 `kubectl create -f deployment-multi-container.yaml` 可创建 Deployment 对象；验证部署状态可使用 `kubectl get deploy -o wide` 查看 Deployment、ReplicaSet 和 Pod 信息。

---

## 更新策略类型

- **RollingUpdate**（滚动更新）：Kubernetes 的默认更新策略，允许逐步替换 Pod，减少中断风险。  
- **Recreate**（重建）：先终止所有旧 Pod，然后再创建新 Pod，可能会导致短暂停机。

### 查看当前策略
使用命令：
```bash
kubectl describe deploy <deployment-name>
```
在输出中查看 `Strategy Type` 字段以确定当前策略类型与参数。

---

## 1. 滚动更新（Rolling Update）

### a) 查看修订历史
```bash
kubectl rollout history deployment/<name>
kubectl rollout history deployment/<name> --revision=<N>
```
说明：`--revision=<N>` 可查看指定修订版本的 **Pod 模板** 详情。

**修订机制要点：**
- 只有 **Pod 模板**（`.spec.template`）发生变化才会生成新的修订版本（Revision）。
- 修订号按增量递增，系统保存完整模板；可通过 `revisionHistoryLimit` 控制保留数量。

### b) 升级应用程序

**命令式：设置镜像触发更新**
```bash
kubectl set image deployment/<name> <container>=<new-image> --record
```

**声明式：编辑 YAML 并应用**
- 修改 Deployment 清单（尤其是 `.spec.template` 部分），保存后：
```bash
kubectl apply -f deployment.yaml
```

**滚动更新过程特征：**
- 新旧 Pod 交替：先按 `maxSurge` 限制创建新 Pod，就绪后按 `maxUnavailable` 限制逐步删除旧 Pod。  
- 进度观察：
```bash
kubectl rollout status deployment/<name>
kubectl get rs,pods -w
```

### c) 回滚应用程序

**回滚到指定修订版本：**
```bash
kubectl rollout undo deployment/<name> --to-revision=2
```

**快速回退到上一个版本（N → N-1）：**
```bash
kubectl rollout undo deployment/<name>
```

---

## 2. RollingUpdate 策略参数（仅对 RollingUpdate 生效）

- **maxUnavailable**：更新期间允许不可用 Pod 的最大数量（整数或百分比）。  
- **maxSurge**：更新期间可超出期望副本数临时创建的新 Pod 数（整数或百分比）。  
- **默认值**：`25% maxUnavailable` 与 `25% maxSurge`。

**计算示例（replicas = 4）：**
- `maxUnavailable = 25%` → 最多 1 个 Pod 可暂时不可用；至少保持 3 个可用 Pod。
- `maxSurge = 25%` → 更新时最多可额外创建 1 个 Pod；总数峰值可达 5 个。

**更新循环简述：**
1. 按 `maxSurge` 创建新 Pod；  
2. 按 `maxUnavailable` 删除旧 Pod；  
3. 重复直至全部替换完成。

---

## 3. 实践示例

**修改滚动更新策略（YAML）**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: engineering-deployment
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 50%
      maxSurge: 50%
  selector:
    matchLabels:
      app: demo
  template:
    metadata:
      labels:
        app: demo
    spec:
      containers:
        - name: app
          image: nginx:1.25
```

**观察滚动批次：**
```bash
kubectl apply -f engineering-deployment.yaml
kubectl get pods -w
```

**镜像版本升级（命令式）：**
```bash
kubectl set image deployment/engineering-deployment app=nginx:1.27 --record
kubectl rollout status deployment/engineering-deployment
kubectl rollout history deployment/engineering-deployment
```

**回滚到指定版本：**
```bash
kubectl rollout undo deployment/engineering-deployment --to-revision=2   
kubectl rollout status deployment/engineering-deployment
```

---

## 4. 小贴士

- 仅更改 `replicas` **不会** 生成新的修订（Revision）；只有 `.spec.template` 变化才会。  
- 可以通过在 `kubectl` 命令加 `--record`（或在变更说明里写明原因）提升审计可读性。  
- 如删除**非活跃** ReplicaSet，则相应的历史记录可能被清理；`revisionHistoryLimit` 过小也会导致旧记录被回收。  
- 如需明显观察滚动过程，可临时使用体积较大的镜像标签（例如一个较慢的镜像版本），以延长拉取与就绪时间。

---

