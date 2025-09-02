---
title: k8s-20-CronJob-1
date: 2025-08-28 14:47:37
tags:
---


## 一、CronJob 并发策略详解

CronJob 的 `concurrencyPolicy` 参数用来控制多个任务调度是否可以重叠执行。这个字段有三个可能的值：

- **Allow**（默认）：允许并发执行，不管前一个任务是否还在运行，都会按计划调度新的任务。
  来源：Kubernetes 文档指出默认值为 Allow 
- **Forbid**：禁止并发执行。如果前一个任务未完成，将跳过这次调度，确保同一时刻仅有一个任务实例运行。
  来源：Stack Overflow 说明 Forbid 会在前一个任务仍在运行时跳过新任务调度 :
- **Replace**：替换现有任务，在新任务触发时终止当前仍在运行的任务，用新任务替代旧任务。
  来源：GKE 文档和多个博客中都明确说明 Replace 行为 

补充说明：
- 这些策略只针对 **同一个 CronJob** 的任务实例，不同 CronJob 间的任务仍可并发运行。 
- 在使用 `Forbid` 时，如果错过调度时间点且超过 `startingDeadlineSeconds`，该次调度也会被跳过。 

---

## 二、实践操作示例与验证方式

### 1) 创建 CronJob

使用以下命令创建 CronJob：

```bash
kubectl create -f cronjob.yaml
```

确保 YAML 文件中包含 `schedule`、`jobTemplate`，以及可选的 `concurrencyPolicy` 配置。

### 2) 查看默认并发策略

执行下面命令查看 CronJob 当前并发策略（如果未显式配置，默认为 Allow）：

```bash
kubectl get cronjob <name> -o yaml
```

查看 `spec.concurrencyPolicy` 字段的值即可。

### 3) 设置替换策略（Replace）

在 YAML 中添加：

```yaml
spec:
  concurrencyPolicy: Replace
```

这意味着如果前一个任务仍在运行，新的调度将终止旧任务并启动新任务。

### 4) 设置禁止策略（Forbid）

在 YAML 中添加：

```yaml
spec:
  concurrencyPolicy: Forbid
```

若前一个任务仍未结束，则此次调度会被跳过，你可以通过持续运行任务并观察调度日志来验证。

---

## 三、关键点对照表

| 策略类型            | 行为说明                                                                 |
|--------------------|--------------------------------------------------------------------------|
| **Allow（默认）**   | 允许多任务并发执行，不考虑前一任务是否完成。                                    |
| **Forbid**         | 若前任务未完成则跳过新任务；若超出 `startingDeadlineSeconds`，同样会被跳过。         |
| **Replace**        | 若前任务未完成，则终止旧任务并立即启动新任务。                                 |

---



## 一、默认历史限制值

- `successfulJobsHistoryLimit`（成功作业历史保留数量）的默认值是 **3**。
- `failedJobsHistoryLimit`（失败作业历史保留数量）的默认值是 **1**。

---

## 二、应用案例与操作步骤（示例）

1. **创建 CronJob**  
   使用 `kubectl apply -f cronjob.yaml` 创建 CronJob。

2. **查看默认历史限制**  
   执行如下命令查看历史限制情况：  
   ```bash
   kubectl describe cronjob <name>
   ```  
   你会看到成功历史限制默认是 3，失败历史限制默认是 1。

3. **修改配置**  
   可以通过以下方式修改参数：
   - 修改 YAML 文件，在 `spec` 中添加字段：
     ```yaml
     spec:
       successfulJobsHistoryLimit: <设置值>
       failedJobsHistoryLimit: <设置值>
     ```
   - 或者使用命令在线编辑：
     ```bash
     kubectl edit cronjob <name>
     ```  
     然后更新上述字段，保存即可应用。

---

## 三、配置建议与影响分析

| 配置项                        | 建议设定值       | 说明 |
|------------------------------|------------------|------|
| `successfulJobsHistoryLimit` | 建议保留默认值 3 | 若设为 `0`，完成作业将立即删除，可能影响故障排查。 |
| `failedJobsHistoryLimit`     | 建议设为 1～3，最大不超过 5 | 适度保留失败记录便于问题排查，避免资源浪费。 |

- **设置为 0**：成功作业不保留，后续无法查看执行历史。
- **失败历史适度保留**：建议值为 1 或 3，过多（如超过 5）可能占用过多资源。此建议总结后基于常见实践与社区经验。

---

## 四、官方文档与社区支持

- Kubernetes（包括 GKE 官方文档）明确说明默认历史限制分别为 `successfulJobsHistoryLimit: 3` 和 `failedJobsHistoryLimit: 1`，并支持自定义设置。
- Dev.to、IONOS 等文章推荐显式配置这两个字段，并强调失败历史重要性。
- Red Hat 开发者指南亦说明默认值，并指出设为 0 会清理作业记录。

---

## 总结建议

- 默认值（成功保留 3，失败保留 1）是实际操作中的推荐基线。
- 将 `successfulJobsHistoryLimit` 设为 0 不建议使用，会影响追踪历史。
- `failedJobsHistoryLimit` 建议设置为 1 或 3，即便设置为更高值切记资源成本。
- 可结合其他参数（如 `startingDeadlineSeconds`、并发策略等）整体优化 CronJob 行为与资源管理。

若你希望进一步查看 CronJob YAML 示例，或想我帮你优化配置，我可以进一步协助！
