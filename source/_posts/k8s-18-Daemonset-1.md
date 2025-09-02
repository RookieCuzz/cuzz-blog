---
title: k8s-18-Daemonset-1
date: 2025-08-28 09:20:13
tags:
---
## 一、DaemonSet 概览与工作机制

### 功能与架构
DaemonSet 是 Kubernetes 中的一种特殊控制器，用于确保集群中 **所有（或部分）合适节点上** 始终运行一份指定的 Pod（类似后台守护进程），这样即使节点动态加入或移除，也能自动调整 Pod 的部署状态（参考 Kubernetes 官方文档）:contentReference[oaicite:1]{index=1}。适用于日志收集、监控代理、存储插件、网络插件等运行在每个节点的服务:contentReference[oaicite:2]{index=2}。

### 工作流程
DaemonSet 控制器持续进行对群集节点状态的 "对比检查"（reconciliation）：
1. 一旦部署 DaemonSet 定义，集群中符合条件的每个节点都会被创建一个 Pod。
2. 当节点新增时，DaemonSet 会自动在该节点创建 Pod；节点移除时，相关 Pod 会被清除
3. 如果 Pod 被删除，也会被立即重建，具备自愈能力（Kubernetes 控制器特性）}。

---

## 二、DaemonSet 与 Deployment 有何不同？

| 特性 | DaemonSet | Deployment |
|------|-----------|------------|
| Pod 数量控制 | 自动与节点数量匹配，最多一个 Pod／节点 | 由 `replicas` 指定，和节点无关 |
| 调度方式 | 一般运行在所有（或特定）节点上 | 灵活调度到任意节点 |
| 典型用途 | 系统级服务，如日志/监控/网络插件等 | 应用级服务，支持弹性扩容 |
| 伸缩方式 | 节点增减自动增删 Pod | 修改 replicas 控制 Pod 数量 |
| 更新策略 | 支持 RollingUpdate 和 OnDelete 等策略 | 内建滚动更新、回滚等 |
| taints/tolerations | 支持，可用于控制平面节点部署 | 普通 Pod，通常不涉及节点调度限制 |

> DaemonSet 保证 Pod 在每个节点运行（例如日志收集、监控），而 Deployment 更适合应用服务的弹性扩展和版本控制。

根据 Stack Overflow 上的解释：DaemonSet 会尝试在每台节点上运行一个 Pod，节点新增时也会自动创建，Deployment 不具备这种特性。

---

## 三、具体操作说明补充

### DaemonSet YAML 核心配置要点
```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: nginx-daemonset
  labels:
    app: nginx
    env: prod
spec:
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      name: nginx-demo
      labels:
        app: nginx
        env: prod
        release: v1.0
    spec:
      # 如需在 control-plane 节点也运行，取消注释：
      # tolerations:
      #   - key: "node-role.kubernetes.io/control-plane"
      #     operator: "Exists"
      #     effect: "NoSchedule"

      containers:
        - name: read-container
          image: dd3av2v4785k4i.xuanyuan.run/library/nginx:latest
          ports:
            - containerPort: 80
              # 如需直接用 NodeIP:80 访问，再加：
              # hostPort: 80
          resources:
            limits:
              cpu: "0.2"
              memory: "300Mi"
          volumeMounts:
            - name: shared-data
              mountPath: /usr/share/nginx/html

        - name: write-container
          image: dd3av2v4785k4i.xuanyuan.run/library/alpine:latest
          command: ["/bin/sh"]
          args: ["-c","while true; do date >> /var/log/index.html; sleep 10; done"]
          volumeMounts:
            - name: shared-data
              mountPath: /var/log

      volumes:
        - name: shared-data
          emptyDir: {}
```

- `.spec.selector` 必须与 `.spec.template.metadata.labels` 匹配，且创建后不可更改；
- 默认 Pod 重启策略为 `Always`；
- 支持使用 `nodeSelector`、`affinity`、`tolerations` 定位节点部署；
- 支持 `RollingUpdate`（默认）和 `OnDelete` 更新策略。

### 创建与验证流程
- 使用 `kubectl apply -f nginx-demo-ds.yaml` 创建 DaemonSet；
- 用 `kubectl get ds -o wide` 查看 Desired/CURRENT 数是否与节点数一致；
- 节点扩容时自动创建 Pod、节点移除时自动删除 Pod；
- 删除 Pod 后会被即时重建，实现自愈。

---

## 四、典型应用场景与优势

常见场景包括：
- **日志收集**（如 Fluentd）：每节点统一采集日志；
- **监控代理**（如 Prometheus Node Exporter）：跨所有节点同步；
- **网络插件 / 存储插件**（如 Calico）：需要每个节点具备网络能力；
- **安全扫描**工具（如 kube-bench）：执行节点级检测。

优势如下：
- **自动覆盖新增节点**；
- **服务一致性确保**；
- **精准 Pod 部署，简单易管理**；
- 在节点级服务场景中无法被 Deployment 替代。

---

