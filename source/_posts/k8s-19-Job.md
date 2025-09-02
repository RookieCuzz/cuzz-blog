---
title: k8s-19-Job
date: 2025-08-28 10:29:42
tags:
---

## 一、什么是 Kubernetes Job？

- **一次性任务（Run-to-Completion）**  
  Kubernetes 的 Job 是一种用于一次性任务的控制器：确保一个或多个 Pod 被创建，并且成功执行完成后终止（来源: Kubernetes 文档）。

- **容错与重试机制**  
  如果 Pod 失败，Job 会根据配置重试创建新的 Pod，直到满足成功的次数或达到失败条件。

- **常见应用场景**  
  适合数据库迁移、数据处理、备份恢复等需要可靠完成且非持续运行的任务。

---

## 二、Job 的关键配置项及机制

### 1. `apiVersion`  
Job 和 CronJob 使用 API 版本：`batch/v1`。

### 2. `restartPolicy`  
只能设为 `Never` 或 `OnFailure`，不能使用 `Always`，因为 Job 的 Pod 不应持续运行。

### 3. 并行处理模式（Parallelism）

- **非并行 Job（默认）**  
  `.spec.parallelism` 默认是 1，仅启动一个 Pod 执行任务。

- **固定完成次数并行（Fixed completions）**  
  设置 `completions` 和 `parallelism`，系统会并行创建多个 Pod，直到达到成功 Pod 数。

- **索引式并行（Indexed）**  
  设置 `completionMode: "Indexed"` 后，每个 Pod 会被赋予一个从 `0` 到 `completions-1` 的索引，适用于静态任务分配。

- **工作队列式并行（Work queue）**  
  不指定 `completions`，依赖 Pod 自行消费任务队列进行工作，任务完成时 Job 结束。

### 4. 失败处理与终止机制

- **BackoffRetries（失败重试）**  
  使用 `.spec.backoffLimit` 控制失败重试次数，失败 Pod 重试间隔会指数回退，最长约六分钟。

- **Active Deadline（超时机制）**  
  `.spec.activeDeadlineSeconds` 指定 Job 的最大运行时长，超时后所有 Pod 将被终止，Job 标记为失败（`Failed` 状态）。

### 5. 成功策略（Success Policy）与终止条件

- **成功与失败的状态**  
  Job 的终态为 `Complete` 或 `Failed`，取决于 `backoffLimit`、`activeDeadlineSeconds`、Indexed。

- **SuccessPolicy 定制**  
  可以通过 `.spec.successPolicy` 定制判定 Job 成功的规则，例如：只要某些索引成功即可作为整体成功。

### 6. 清理机制：TTL 自动删除

- **TTL-after-finished**  
  设置 `.spec.ttlSecondsAfterFinished`，Job 在完成后经过指定秒数自动删除，包括其 Pod。

- **注意事项**  
  TTL 到期后若延长 TTL，无法保证 Job 不被删除；集群时间偏差可能导致删除时机不准确。

### 7. Job 暂停与恢复（Suspend）

- 设置 `.spec.suspend: true` 可暂停 Job，并终止所有非 Completed 状态的 Pod，Completed 状态的 Pod 不受影响；恢复后 `.status.startTime` 和 `activeDeadlineSeconds` 计时将重置。

### 8. 自定义选择器（selector）

- 默认情况下无需设置 `.spec.selector`，系统会自动生成唯一 selector。若手动定义，需确保标签唯一性，避免出现冲突。

### 9. 其他高级功能

- **调度指令更新**：在暂停状态下支持修改 nodeAffinity、标签等，以影响 Pod 分布。
- **JobManagedBy 字段**：可以指定其他控制器管理该 Job（需启用 Feature Gate）。
- **Pod 终结器**：Job 控制器使用 finalizer 追踪其 Pod；在 Pod 被 Job 处理后才会移除 finalizer。
- **延迟替换 Pod（podReplacementPolicy）**：可配置只有 Pod 完全失败后才创建替代 Pod，减少并行数量超额。

---

## 三、对照你的内容结构回顾总结

| 你提到的点                         | 官方文档的补充或对齐                        |
|------------------------------|-------------------------------------|
| Job 概述                         | 一次性任务，可靠完成后终止                   |
| 备份、还原场景                    | 属于常见应用场景                             |
| API 版本 batch/v1                 | 核心 API 版本                              |
| 并行任务                         | 支持多种并行策略，包括 Indexed 与 Work Queue |
| `restartPolicy` 必须是 Never/OnFailure | 官方明确禁止使用 Always                   |
| selector 可选                     | 默认自动生成，手动需谨慎                    |
| `ttlSecondsAfterFinished` 建议启用 | 官方推荐用于自动清理                         |
| `suspend` 参数                    | 支持暂停与恢复 Job                          |

---

## 四、实战应用建议

1. **小型任务推荐**：使用默认 parallelism:1 的简单 Job，设置 restartPolicy 为 `Never`，加上 backoffLimit 做容错。
2. **多任务并行场景**：结合 `completions` 与 `parallelism` 控制并发；需要静态任务索引的可用 Indexed 模式。
3. **队列处理场景**：通过工作队列方式，不设 `completions`，Pod 自主 pull 任务完成终止。
4. **清理策略**：务必配置 TTL（`ttlSecondsAfterFinished`），避免 API server 压力与资源积累。
5. **暂停与预调度**：创建或更新 Job 时暂挂（`suspend`），再统一启动或调度资源。
6. **监控与失败策略**：结合 `backoffLimit`、`activeDeadlineSeconds`、`successPolicy` 灵活定制符合业务需求的 Job 行为。

---

、