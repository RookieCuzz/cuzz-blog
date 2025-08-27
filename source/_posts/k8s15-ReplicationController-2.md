---
title: k8s15-ReplicationController-2
date: 2025-08-26 15:46:58
tags:
---

## 一、实践演示

### 1. 复制控制器的实践环境准备

- **多节点集群环境**  
  为了演示复制控制器（ReplicationController）、ReplicaSet、DaemonSet、StatefulSet、Job 和 CronJob，你需要一个至少由一个控制平面节点和一个或多个计算节点组成的多节点集群。

- **查看节点信息**  
  使用命令 `kubectl get nodes -o wide` 可以查看当前集群中所有节点及其角色和状态。

- **允许在控制平面节点上部署应用**  
  默认情况下，控制平面节点带有 `NoSchedule` taint（通常为 `node-role.kubernetes.io/control-plane:NoSchedule` 或旧版本 `node-role.kubernetes.io/master:NoSchedule`），这会阻止普通 Pod 被调度到该节点。若需允许调度，请执行以下命令去除该 taint：
  ```bash
  kubectl taint nodes <control-plane-node-name> node-role.kubernetes.io/control-plane:NoSchedule-
  ```
  这样，控制平面节点就可以部署普通应用了。

---

## 二、实践工作流程准备

1. 在本地（或集群中）创建一个名为 `replication-controller` 的文件夹，用于存放所有 YAML 配置清单文件。  
2. 在该目录下新建你的 ReplicationController 配置文件，例如命名为 `engineerics-rc.yaml`。

---

## 三、复制控制器配置详解（ReplicationController）

### YAML 示例（推荐参考版本）
```yaml
apiVersion: v1
kind: ReplicationController
metadata:
  name: engineerics-rc
  labels:
    app: engineerics
    type: rc-production
spec:
  replicas: 2               # 说明你期望运行的 Pod 副本数
  selector:
    app: engineerics        # 使用等号选择器，只支持相等匹配
  template:
    metadata:
      labels:
        app: engineerics
        role: pro           # 模板标签（可自定义）
    spec:
      containers:
      - name: nginx
        image: nginx:1.14   # 镜像需要指定明确版本
        ports:
        - containerPort: 80
        resources:
          limits:
            cpu: "2"        # 例如限制为 2 CPU cores
            memory: "300Mi" # 限制为 300Mi 内存
      restartPolicy: Always  # 默认策略
```

#### 核心字段说明

- `apiVersion: v1`、`kind: ReplicationController`：RC 对象的类型标识。  
- `metadata`：包括名字和标签，用于标识资源。  
- `spec.replicas`：声明希望的 Pod 数量，默认值为 1（若不指定）。  
- `spec.selector`：标签选择器，只支持 equality 基于标签匹配。ReplicaSet 与之相比支持更灵活的 set-based selectors。  
- `spec.template`：Pod 模板，定义多个属性，包括 labels、容器规格（镜像、端口、资源、restartPolicy 等）。

---

## 四、操作与验证流程

1. **部署 ReplicationController**  
   ```bash
   kubectl apply -f engineerics-rc.yaml
   ```

2. **检查控制器状态**  
   ```bash
   kubectl get rc engineerics-rc -o wide
   ```  
   - `DESIRED`：期望副本数  
   - `CURRENT`：实际正在运行的副本数  
   - `CONTAINERS`：关联的容器镜像详情

3. **查看对应 Pod 状态**  
   ```bash
   kubectl get pods -l app=engineerics -o wide
   ```  
   Pod 名称通常为 `<rc名称>-<随机字符串>`。

4. **访问验证**  
   可通过 `curl <Pod_IP>` 或结合 Service 做访问验证。

5. **容错测试**  
   删除一个 Pod，例如：  
   ```bash
   kubectl delete pod <pod-name>
   ```  
   你会发现 RC 自动创建新的 Pod 恢复副本数。

6. **完全删除资源**  
   若要清理资源：  
   ```bash
   kubectl delete rc engineerics-rc
   ```  
   默认行为会级联删除所有归属的 Pod。若使用 `--cascade=orphan` 可阻止 Pod 随 RC 一起删除。

---

## 五、复制控制器的核心机制与特性总结

- **自我修复**  
  当实际 Pod 数量与声明数量不符时（如 Pod 异常退出或删除），RC 会自动补齐或缩减 Pod 数量。

- **模板一致性**  
  所有由 RC 创建的 Pod 都将严格依据 `spec.template` 定义，包括镜像、资源限制、标签等。

- **标签选择器驱动管理**  
  Pod 必须正确打上与 selector 匹配的标签，否则 RC 无法识别，不会纳入管理。

- **级联删除**  
  默认情况下，删除 RC 会自动删除其所有 Pod；使用 `--cascade=orphan` 可阻止 Pod 随 RC 一起删除。

- **使用建议**  
  虽然 ReplicationController 可用，但 Kubernetes 推荐使用 ReplicaSet（支持更强大的标签选择器）或 Deployment（支持滚动更新、版本控制等增强功能）。

