---
title: k8s-21-Service-5-NodePort-1
date: 2025-08-29 11:35:31
tags:
---
# 更改 NodePort 范围操作指南

> 目标：将默认的 `30000–32767` 端口范围调整为符合组织要求的自定义区间（如 `32000–33000`），并验证变更。

---

## 一、为什么要修改 NodePort 范围
- 默认范围为 `30000–32767`，可通过 kube-apiserver 的 `--service-node-port-range` 参数自定义。
- 典型动机：与网络安全策略、防火墙放行策略或合规要求对齐，统一端口管理，减少暴露面。

---

## 二、修改方法（kubeadm 常见）

### 方法 1：直接编辑 kube-apiserver 静态 Pod 清单
1. 登录控制平面节点（root）。
2. 编辑文件路径：`/etc/kubernetes/manifests/kube-apiserver.yaml`（注意是 **manifests** 目录）。
3. 在 `apiServer` 的 `extraArgs`（或容器 `command`/`args`）处新增：  
   ```
   - --service-node-port-range=32000-33000
   ```
4. 保存文件后，kubelet 会自动重建 kube-apiserver Pod，使配置生效。

**提示**：若 YAML 结构使用了显式列表 `- --flag=...` 形式，请保持缩进与现有项一致。若写错导致 Pod 起不来，先 `kubectl -n kube-system get pods`/`crictl ps -a`/`journalctl -u kubelet` 排错。

### 方法 2：通过 kubeadm 集群配置（适用于 kubeadm 管理的集群）
1. 编辑集群配置：  
   ```
   kubectl -n kube-system edit configmap kubeadm-config
   ```
2. 在 `ClusterConfiguration.apiServer.extraArgs` 下添加：  
   ```
   apiServer:
     extraArgs:
       service-node-port-range: "32000-33000"
   ```
3. 按官方流程重载/升级以应用变更（示例，按你的版本与变更策略执行）：  
   ```
   kubeadm upgrade apply <YOUR_VERSION> --config <your-updated-config>.yaml
   ```
   
---

## 三、验证变更是否生效

### 1）验证进程参数
```
ps aux | grep kube-apiserver
# 预期在输出中看到：--service-node-port-range=32000-33000
```

### 2）功能性测试
- 创建一个 `type: NodePort` 的 Service，并**显式**指定 `nodePort`：  
  - 若端口在 `32000–33000` 范围内 —— 应创建成功；  
  - 若端口不在范围内 —— 将触发服务校验失败（schema/validation error）。

### 3）防火墙与安全组
- 放行节点上的 `32000–33000`（或你的自定义范围）端口，未放行将导致外部无法访问。
- 云环境需同步更新安全组；本地环境需更新 `iptables`/`firewalld`/Windows 防火墙策略等。

---

## 四、可选相关设置：限制 NodePort 监听的网卡/IP
- 在 **kube-proxy** 上使用：  
  ```
  --nodeport-addresses=<CIDR 列表或 'primary'>
  ```
- 作用：只在匹配的节点 IP（或 Node 对象的主 IP）上接受 NodePort 连接；默认未设置时在所有本地 IP 上监听。适合多网卡/多子网、仅内网暴露等场景。

---

## 五、常见问题（FAQ）
- **路径写成 `/etc/kubernetes/manifest/...` 起不来？**  
  正确目录是 `manifests`，注意有 **s**。
- **NodePort 范围想设成多个不连续区间（如 `80,443,32000-33000`）？**  
  kube-apiserver 的该参数只支持**连续区间**，不能逗号分隔多个片段。
- **修改后 `kubectl` 暂时连不上？**  
  kube-apiserver 重建期间短暂不可用，待 Pod Ready 后再执行。

---

## 六、参考命令与片段（便于复制）
```
# 方法1：静态 Pod 直接编辑（示意，仅展示参数行）
- --service-node-port-range=32000-33000

# 方法2：kubeadm ConfigMap 片段
apiServer:
  extraArgs:
    service-node-port-range: "32000-33000"

# 验证
ps aux | grep kube-apiserver
kubectl get svc -A | grep NodePort
```

---

## 七、注意与最佳实践
- 将范围收窄到业务必需，降低暴露面；并与资产台账、监控、入侵检测策略保持一致。
- 统一变更窗口与回滚预案；版本化保存 `manifests/` 与 kubeadm 配置；配合 CI/CD 与审计。
- 生产环境建议优先考虑 **LoadBalancer/Ingress** 对外暴露，NodePort 多用于调试/快速接入。

---

## 附：你可以在 Service YAML 中这样显式指定 nodePort（范围需匹配你的自定义设置）
```
apiVersion: v1
kind: Service
metadata:
  name: demo-svc
spec:
  type: NodePort
  selector:
    app: demo
  ports:
    - name: http
      port: 80
      targetPort: 8080
      protocol: TCP
      nodePort: 32500   # 必须落在 32000–33000 之间
```
