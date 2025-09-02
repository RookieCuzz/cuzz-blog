---
title: k8s-18-Daemonset-2
date: 2025-08-28 09:43:05
tags:
---

##  更新策略

默认更新策略为 **滚动更新（RollingUpdate）**，这是 DaemonSet 的默认行为，当不显式指定 `.spec.updateStrategy.type` 时即为此策略。DaemonSet 提供两种更新策略：
- `OnDelete`：只有在手动删除旧 Pod 后才会创建新 Pod；
- `RollingUpdate`：自动替换旧 Pod（一次一个节点），确保每个节点 **最多只有一个 DaemonSet Pod 运行** :contentReference[oaicite:1]{index=1}。

### 滚动更新执行方式
- 按 **节点顺序逐个升级**，而不会并发更新；
- 触发条件包括容器镜像变更或 Pod 模板规范修改；
- 与 Deployment 不同，DaemonSet 会 **先删除旧 Pod，再创建新 Pod**，因为每节点仅允许运行一个 Pod :contentReference[oaicite:2]{index=2}。

### 示例操作

1. **查看历史版本（Revision）**  
```bash

kubectl rollout history daemonset/nginx-ds-demo
```

此命令显示历史版本信息，初始部署版本通常为 Revision 1 :contentReference[oaicite:3]{index=3}。

2. **执行镜像更新**  

```bash
kubectl set image daemonset/nginx-ds-demo nginx=nginx:<new-version>
```
假设将版本从 “-19” 更新到 “-20”，将触发 RollingUpdate。

3. **更新过程特征说明**  
- 旧 Pod 被先终止；  
- 随后在相同节点创建新版 Pod；  
- 因限制每节点仅运行一个 Pod，因此无法并存旧版本与新版本 Pod。

4. **版本验证**  
更新后再次运行以下命令：

```bash
kubectl rollout history daemonset/nginx-ds-demo

```

通过：
```bash
kubectl rollout status daemonset/nginx-ds-demo
```
可以实时监控更新进度，非常适用于自动化/CI 流程中等待状态完成的场景 


## 1. onDelete 策略简介  
- `OnDelete` 策略是 DaemonSet 的一种更新方法，它与 Deployment 的 `recreate` 策略明显不同。  
- 使用 `OnDelete` 时，仅在手动删除现有 Pod 后，控制器才会创建新 Pod 并应用更新配置。  
- 启用该策略后，已有的修订版本可直接利用，无需额外修改。  
  参考资料指出：使用 `OnDelete` 更新策略时，即使更新 DaemonSet 模板，也只会在手动删除旧 Pod 后才会生成新 Pod :contentReference[oaicite:1]{index=1}。

## 2. 修改 DaemonSet 策略为 onDelete  
- 使用命令编辑相关 DaemonSet：  
```bash
  kubectl edit daemonset nginx-ds-d
 ```
  在编辑器中定位到 spec.updateStrategy 字段，执行以下步骤：

删除 rollingUpdate 配置块；

将 type 修改为 OnDelete，例如：

## 3. 验证 onDelete 策略前的准备

策略更改后，如果使用 kubectl set image 修改镜像版本，由于 OnDelete 策略不会自动替换 Pod，更新不会即时生效，这时系统可能提示操作未生效。

## 4. 验证 onDelete 策略：修改镜像版本

假设将镜像标签修改为 22，并检查修订历史，当前显示为 Revision 5；

然后检查 Pod 状态，以确认新版本未被部署。

## 5. 验证 onDelete 策略：检查 Pod 状态

关键待观察现象包括：

Pod 未自动重建，长时间持续运行（例如 8 分 56 秒）；

尽管模板希望使用新镜像（如 nginx:22），但 Pod 仍运行旧版本；

kubectl get ds 中 upToDate 字段为 0，表示 Pod 尚未更新；

使用 curl 访问仍返回旧版本结果。

## 6. onDelete 策略含义及操作

核心机制：必须手动删除 Pod，DaemonSet 控制器检测到删除后，才会创建新的 Pod，使其使用最新模板配置。

## 7. 验证 onDelete 策略：删除 Pod 并检查

验证流程如下：

使用 kubectl get ds,po 查看 DaemonSet 和 Pod 状态；

删除旧 Pod；

控制器创建新 Pod，并更新 upToDate 字段为 1；

使用 curl 确认新 Pod 镜像为期望版本（如 22）；

重复此操作直至所有 Pod 更新完成。

## 8. DaemonSet 策略总结
DaemonSet 支持以下更新策略：

RollingUpdate：默认策略，逐节点滚动更新；

OnDelete：手动删除 Pod 后触发更新；