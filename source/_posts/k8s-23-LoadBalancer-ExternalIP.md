---
title: k8s-23-LoadBalancer-ExternalIP
date: 2025-08-29 16:20:47
tags:
---


# 外部IP服务说明

## 一、外部IP服务概念
外部IP服务用于配置公共或私有IP地址以访问集群内的应用程序。  
当集群节点连接到某个网络时，可通过指定该网络中的IP地址，将外部请求重定向至集群内运行的应用程序。

- **核心功能**：通过外部IP地址将流量路由至集群中的一个或多个节点。
- **示例**：若某应用程序已创建负载均衡服务，当外部用户通过特定公共或私有IP访问时，可通过 External IP 方式实现。

## 二、外部IP服务类型特征
1. **管理权限**：外部IP不由 Kubernetes 控制，需由集群管理员手动配置。
2. **配置要求**：
    - 网络中需存在可用公共或私有 IP
    - 在 YAML 中声明 `externalIPs` 字段并绑定 IP
3. **流量路由**：  
   外部请求通过 外部IP + 端口 进入，`kube-proxy` 自动转发至服务端点（Pod）。

---

## 三、外部IP配置步骤

### 1) 文件创建
- 在 `service` 文件夹下创建 `external.yaml`
- 配置需包含以下字段：
    - `apiVersion: v1`
    - `kind: Service`
    - `metadata`: 服务名称（如 `engine-nics-vc`）
    - `spec`: 声明端口与 `externalIPs`

### 2) 端口与选择器
<<<yaml
ports:
- name: hlyp
  port: 80
  targetPort: 80
  protocol: TCP
  selector:
  app: engine-ics
  <<<

### 3) 完整 externalIPs 示例
<<<yaml
apiVersion: v1
kind: Service
metadata:
name: engine-nics-vc
spec:
selector:
app: engine-ics
ports:
- name: hlyp
port: 80
targetPort: 80
protocol: TCP
externalIPs:
- 192.168.110.235  # 确保未被占用
<<<

---

## 四、网络要求
1. **节点网络模式**：建议桥接模式，确保与路由器互通。
2. **IP选择规则**：
    - 从路由器未分配地址池中选择
    - 使用 `ping` 验证 IP 未被占用

---

## 五、外部IP服务应用流程
1. **先部署应用**  
   <<<bash
   kubectl apply -f engine-x-multi-container.yaml
   <<<

2. **应用外部IP服务**  
   <<<bash
   kubectl apply -f external.yaml
   <<<

3. **验证服务状态**  
   <<<bash
   kubectl get svc -o wide
   <<<

4. **转发逻辑**  
   外部请求 → Service → Pod IP（端口需保持一致）

---

## 六、访问验证
<<<bash
curl http://192.168.110.235:80
<<<

---

## 七、清理
- 删除服务  
  <<<bash
  kubectl delete -f external.yaml
  <<<
- 删除关联应用  
  <<<bash
  kubectl delete -f engine-x-multi-container.yaml
  <<<

---

## 八、核心用途总结
- 通过**固定IP**将应用对外暴露
- 适用于需要**绑定特定公网/私网IP**的场景

