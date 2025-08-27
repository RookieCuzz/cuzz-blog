---
title: k8s17-Deployment-4
date: 2025-08-27 16:40:54
tags:
---
1. 默认升级策略为 RollingUpdate（滚动更新），确保高可用性：
   • 使用 maxSurge 与 maxUnavailable 控制更新节奏（默认 25%）。

2. 升级／回退镜像：
   • 使用命令：kubectl set image deployment/<deploy-name> container=<image>:<tag>。
   • 指定更高或更低的 tag 完成升级或回退（回退）。

3. 回退策略（Recreate）：
   • 修改 strategy.type 为 Recreate，删除 RollingUpdate 配置：
     strategy:
       type: Recreate
   • 会先停旧 Pod，再上新 Pod，适用于可短暂停机场景。
   • 使用 kubectl rollout status/history 验证。

4. 修订历史限制（revisionHistoryLimit）：
   • default = 10 ; 控制保留的旧ReplicaSet数量。
   • 设置为低值（如 3），可通过 kubectl edit 或 patch 实现。

5. 修订历史实际存储规则：
   • 实际保存 = revisionHistoryLimit + 1（包括当前修订）。
   • 超出最大值时，最旧版本会被删除。

6. 注意事项：
   • 设为 0 后将失去 rollback 能力。参考 
   • 太多历史修订可能造成 etcd 或控制面性能下降。参考
