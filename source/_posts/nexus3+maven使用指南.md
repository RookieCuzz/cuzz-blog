---
title: nexus3+maven使用指南
date: 2025-08-31 11:15:15
tags:
---

# Nexus 3 + Maven 使用指南

## 一、 仓库结构

已设置以下仓库：

- maven-snapshots (仅接收 -SNAPSHOT 版本)
- maven-releases (只接收正式版本)
- 可另建 maven-group 聚合上述仓库与 Maven Central，统一访问

依据 Sonatype 官方文档，分仓库管理是最佳实践：
“一个 group 仓库可以聚合多个 proxy 和 hosted 仓库，提供单一 URL，使客户端配置更简单。”
## 二、开发者手册 — 配置项目
**1. 在项目 pom.xml 中配置发布目标**
```xml
<distributionManagement>
  <snapshotRepository>
    <id>nexus-snapshots</id>
    <url>https://www.4399mc.cn/nexus/repository/maven-snapshots/</url>
  </snapshotRepository>
  <repository>
    <id>nexus-releases</id>
    <url>https://www.4399mc.cn/nexus/repository/maven-releases/</url>
  </repository>
</distributionManagement>

```
Maven 会根据版本号处理上传目标：后缀 -SNAPSHOT 会发送到 snapshots 仓库，其它版本发送到 releases 仓库.

**2. 配置合并依赖来源（可选）**
若有配置统一仓库入口（如 maven-group），可在 settings.xml 添加镜像如下：
```xml
<mirrors>
    <mirror>
        <id>maven-central</id>
        <mirrorOf>*</mirrorOf>
        <url>https://www.4399mc.cn/nexus/repository/maven-central/</url>
    </mirror>
</mirrors>

```
什么是 Maven 的 mirror？

Maven 允许你在用户级配置（~/.m2/settings.xml）里配置“镜像仓库”，这样当 Maven 去找依赖时，就会绕过原本定义在项目 pom.xml 或默认中央仓库的 URL，统一转向你指定的内部仓库（比如 Nexus）上下载。

为什么这么做？

提高访问速度：团队内部访问内网 Nexus 比访问远端 Maven 中央更快；

控制与缓存：集中管理依赖，可监控、审计以及缓存所依赖的 Artifact；

无侵入项目配置：不需要改 pom.xml，项目依旧统一拉取依赖，但路径由你控制。

这里的起到一个代理缓存作用(机房网络不能访问外网,会导致拉取境外依赖失败)
## 三、本地 Maven settings.xml 设置
```xml

<settings>
  <servers>
    <server>
      <id>nexus-snapshots</id>
      <username>deploy-user</username>
      <password>部署用户密码</password>
    </server>
    <server>
      <id>nexus-releases</id>
      <username>deploy-user</username>
      <password>部署用户密码</password>
    </server>
  </servers>
  
  <!-- 可选，统一依赖来源 -->
  <mirrors>
    <mirror>
      <id>maven-central</id>
      <mirrorOf>*</mirrorOf>
      <url>https://www.4399mc.cn/nexus/repository/maven-central/</url>
    </mirror>
  </mirrors>
</settings>

```
说明：<id> 必须与 POM 文件中配置的 id 标签一致，否则 Maven 投递时不会携带凭据。

## 四、常用命令
正常发布：
```bash
mvn clean deploy
```
手动发布单个 JAR（无完整项目结构时）
```bash
mvn deploy:deploy-file \
  -DgroupId=com.yourorg \
  -DartifactId=your-artifact \
  -Dversion=1.0.0-SNAPSHOT \ 
  -Dpackaging=jar \
  -Dfile=path/to/your.jar \
  -DrepositoryId=nexus-snapshots \
  -Durl=https://www.4399mc.cn/nexus/repository/maven-snapshots/

```

## 五、引入已发布依赖
在项目 pom.xml 中添加：
```xml

<repositories>
  <repository>
    <id>nexus-group</id>
    <url>https://www.4399mc.cn/nexus/repository/maven-group/</url>
  </repository>
</repositories>

<dependencies>
  <dependency>
    <groupId>com.yourorg</groupId>
    <artifactId>your-artifact</artifactId>
    <version>1.0.0</version>
  </dependency>
</dependencies>


```

或者直接引用 release 或 snapshot 仓库依据版本合理选择即可。