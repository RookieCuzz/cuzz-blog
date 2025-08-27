---
title: k8s15-ReplicationController-3
date: 2025-08-26 16:14:12
tags:
---
# ReplicationController（RC）操作笔记（修正与补充）

> RC 是早期控制器，当前更推荐使用 **Deployment/ReplicaSet**；若必须用 RC，请参考本笔记的注意事项。

## 一、删除 RC 而不删除其 Pod

- 命令：
```bash
  kubectl delete rc <rc-name> --cascade=orphan  
```

结果：RC 会被删除，但其已创建的 Pod 会 继续运行，仅是脱离控制。    

复用：后续若用 同一选择器 重建 RC（或其他控制器）且副本数与当前 Pod 数一致，可以直接接管已有 Pod（匹配选择器时会被采用；注意不同控制器的选择器/owner 关系）。   

说明：--cascade 可取 background|foreground|orphan，默认 background。orphan 即孤儿化删除，仅删除上层对象，保留下游对象（此处为 Pod）。    
 默认删除策略：不加 --cascade 时，默认 background，会在后台清理由该对象管理的下游资源（对 RC 而言是 Pod）
## 二、修改 RC 配置文件后的正确流程

修改副本数（例：3 → 2）：   

建议使用 声明式 更新：
```bash

kubectl apply -f <file-name>   
  ```

控制器会缩容至 2 个副本。被删掉的是由控制器选择的多余 Pod，未承诺稳定顺序，不要依赖“随机在哪个节点”的说法。   

不要用 create -f 覆盖已存在资源：create 仅用于首次创建，资源已存在会报错或不生效。更新请用 apply。   

## 三、镜像与模板的更新注意事项

RC 不会自动“滚动更新”已有 Pod：

更新 RC 的 Pod 模板（如容器镜像）不会修改已经在跑的 Pod。

想让老 Pod 使用新镜像，有两种安全做法：

少量 Pod： 手动删除旧 Pod，让 RC 按新模板重建

kubectl delete pod <pod-name>


批量更新： 先将 RC 缩为 0，再扩回目标副本数
```bash

kubectl scale rc <rc-name> --replicas=0
kubectl scale rc <rc-name> --replicas=<N>
```

更推荐：把 RC 迁移为 Deployment，获得滚动发布、回滚等能力。

历史上有 kubectl rolling-update 可在 RC 之间做滚更，但该命令已淘汰；现代集群应使用 Deployment。
