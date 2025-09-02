---
title: k8s-19-Job-1
date: 2025-08-28 11:12:13
tags:
---
以下是对 Kubernetes Job 行为的校对、补充以及示例，以 Markdown 源码形式完整呈现：

---

# 校对与补充

## 1) 任务完成后的 Pod 状态与清理
- **完成后的 Pod 会进入 `Completed` 状态**，默认**不会自动删除**；删除该 Job 会**级联清理**它创建的 Pod。适合保留用于排错与验收。（[kubernetes.io](https://kubernetes.io/docs/concepts/workloads/controllers/job/)）
- 如需自动回收，用 **TTL-after-finished**：在 Job 加上 `.spec.ttlSecondsAfterFinished`，到期后 Job **连同其 Pod 一起被删除**（级联删除）。该机制已稳定（v1.23+）。（[kubernetes.io](https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/?utm_source=chatgpt.com)）

> 你文中“永久保留，必须手动删除”这句建议改为：“默认保留；可用 TTL 自动清理或手动删除 Job 以级联清理”。

## 2) 失败与重试（backoffLimit、重启策略）
- **默认 `backoffLimit` 是 6（不是 7）**。达到该阈值后 Job 标记为失败，事件里常见 `BackoffLimitExceeded / Job has reached the specified backoff limit`。([kubernetes.io](https://kubernetes.io/docs/concepts/workloads/controllers/job/), [stackoverflow.com](https://stackoverflow.com/questions/54825671/understanding-backofflimit-in-kubernetes-job))
- 允许的 `restartPolicy` 只有 `Never` 和 `OnFailure`：  
  - `Never`：每次失败**新建 Pod**重试（因此看到多个失败的 Pod）。  
  - `OnFailure`：**同一个 Pod 内重启容器**，失败计数也会累计。  
  官方文档明确限制与行为。（[kubernetes.io](https://kubernetes.io/docs/concepts/workloads/controllers/job/)）
- **计数/观察现象小贴士**：当 `restartPolicy: Never` 时，通常会看到**失败 Pod 数≈ backoffLimit**，而“尝试次数”常被直观理解为“初次 + 重试”，所以有人会口头说“n+1 次尝试”。以实测为准，并以 `kubectl describe job` 中的事件为权威。（[stackoverflow.com](https://stackoverflow.com/questions/54825671/understanding-backofflimit-in-kubernetes-job)）

## 3) 挂起/恢复（suspend）
- 在 Job 规约中设置 `suspend: true` 时，**控制器不会创建 Pod**；把它改回 `false` 即刻恢复执行。该能力从 1.21 引入并随后成熟。（[kubernetes.io](https://kubernetes.io/blog/2021/04/12/introducing-suspended-jobs/)）

## 4) 查看状态与失败原因（诊断）
- 列出 Job 产生的 Pod 名称并看日志（官方推荐示例）：  
  ```bash
  # 列出 Job 的 Pod
  pods=$(kubectl get pods -l batch.kubernetes.io/job-name=<job-name> -o jsonpath='{.items[*].metadata.name}')
  echo $pods

  # 看其中一个 Pod 的日志
  kubectl logs $pods

  # 直接看 Job 聚合日志（kubectl 支持 TYPE/NAME）
  kubectl logs job/<job-name>
  ```

  上述命令和写法见官方 Job 文档示例。（[kubernetes.io](https://kubernetes.io/docs/concepts/workloads/controllers/job/)）
- 进一步排错：  
  ```bash
  # 看 Job 详情与事件（是否触发 BackoffLimitExceeded 等）
  kubectl describe job/<job-name>
  ```

  典型事件文案可见于社区问答截图与复现。（[stackoverflow.com](https://stackoverflow.com/questions/54825671/understanding-backofflimit-in-kubernetes-job)）

---

# 最小 YAML 示例

## A. 常规一次性任务（自定义重试次数 + 自动清理）
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: demo-job
spec:
  backoffLimit: 3                # 最多重试 3 次（默认是 6）
  ttlSecondsAfterFinished: 30    # 完成/失败 30s 后自动级联清理
  template:
    spec:
      restartPolicy: Never       # 只允许 Never 或 OnFailure
      containers:
        - name: work
          image: alpine:3.20
          command: ["sh","-c","echo doing work; exit 1"]  # 故意失败以观察重试
```

（`backoffLimit` 默认值与 `restartPolicy` 限制：官方文档）([kubernetes.io](https://kubernetes.io/docs/concepts/workloads/controllers/job/))  
（TTL 自动清理机制与级联删除：官方文档）([kubernetes.io](https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/?utm_source=chatgpt.com))

## B. 挂起后再恢复执行
```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: suspended-job
spec:
  suspend: true                  # 先挂起，不会创建 Pod
  template:
    spec:
      restartPolicy: Never
      containers:
        - name: work
          image: busybox:1.36
          command: ["sh","-c","date; sleep 5; echo done"]
```

- 创建后可用 `kubectl edit job suspended-job` 将 `suspend: false`，即刻开始执行。（[kubernetes.io](https://kubernetes.io/blog/2021/04/12/introducing-suspended-jobs/)）

---


---

# 常用排障清单（拎包即用）
```bash
# 1) 看 Job 列表与完成度
kubectl get jobs

# 2) 看 Job 事件（是否 BackoffLimitExceeded / DeadlineExceeded）
kubectl describe job/<job-name>

# 3) 聚合/逐 Pod 日志
kubectl logs job/<job-name>
kubectl get pods -l batch.kubernetes.io/job-name=<job-name> -o name | xargs -I{} kubectl logs {}

# 4) 观察 Pod 生命周期与退出码
kubectl get pods -l batch.kubernetes.io/job-name=<job-name> -o wide
kubectl describe pod/<pod-name>
```

（命令与示例出自官方文档 Job 页面）([kubernetes.io](https://kubernetes.io/docs/concepts/workloads/controllers/job/))
