---
title: k8s-20-CronJob
date: 2025-08-28 14:26:10
tags:
---



# Kubernetes CronJob 总结与说明


## 1. CronJob 的基本概念
- CronJob 是 Kubernetes 中的一种工作负载资源，作用是依据设定的时间表定期创建 Job，从而执行批处理任务，比如备份、数据处理等。
- `.spec.jobTemplate` 定义了用于生成 Job 的模版，而 Job 再进一步创建 Pod 来执行具体任务。
- 调度语法采用标准 cron（分钟、小时、日、月、周），格式与 Linux 系统中的 crontab 一致。

---

## 2. CronJob 的 API 版本和字段说明
- 当前 CronJob 使用的 API 版本为 **batch/v1**。
- 核心字段包括：
    - `schedule`: cron 表达式，**必填**。
    - `jobTemplate`: Job 模板，**必填**。
    - `startingDeadlineSeconds`: 可选，定义错过调度时间的最大延迟秒数，超过后跳过该次任务。
    - `suspend`: 可选，布尔类型，默认 `false`；设为 `true` 可暂停后续调度（但不影响已创建的 Job）。

---

## 3. 关于时区（timeZone）支持
- **默认行为**：如果未指定时区，CronJob 调度将基于 `kube-controller-manager` 所在主机或容器的本地时区进行。
- **时区字段 `.spec.timeZone`**：
    - 在 Kubernetes **v1.27 已稳定（GA）支持**。可以通过 `.spec.timeZone` 设置一个有效的时区名称，比如 `"Etc/UTC"` 或 `"Asia/Taipei"`。
    - 在 v1.24 为 alpha 阶段，需要开启 `CronJobTimeZone` 特性门控（feature gate）；v1.25 为 beta；v1.27 为正式稳定。
- **不推荐使用** `CRON_TZ` 或 `TZ` 前缀在 `.spec.schedule` 中指定时区，这是实现层的实现细节，**不被官方支持**，未来版本甚至可能导致验证错误。

---

## 4. CronJob TimeZone 设置示例
以下是在 v1.27 及以上版本中使用时区字段的一个示例：

```yaml

apiVersion: batch/v1
kind: CronJob
metadata:
  name: cj-demo

spec:
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: ubuntu-demo
              image: ubuntu:22.04
              args:
                - /bin/sh
                - -c
                - date; echo Welcome to CronJob batch operation              
          restartPolicy: Never
  #每五分钟  分 时  日 月  周几
  schedule: "*/5 * * * *"
```
- 若未启用 `.spec.timeZone`，调度时间将参考 kube-controller-manager 容器的本地时区。
- 若指定了无效时区名，控制器会停止创建新的 Job，并记录 `UnknownTimeZone` 的系统事件。

---

## 5. 暂停 CronJob 的命令
使用如下命令可以暂停 CronJob 的后续调度：

```bash
kubectl patch cronjob <name> --type=strategic --patch '{"spec":{"suspend":true}}'
```