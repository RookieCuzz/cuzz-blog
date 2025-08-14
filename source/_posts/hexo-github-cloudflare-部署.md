---
title: hexo&github&cloudflare 部署
date: 2025-08-08 16:59:35
tags:
---


# Hexo + GitHub + Cloudflare 部署教程

本文介绍如何使用 Hexo 搭建博客，利用 GitHub 进行代码托管，再通过 Cloudflare CICD托管博客。
## 1. 准备工作

- 安装 Node.js 和 Git
- 安装 Hexo：`npm install -g hexo-cli`
- 注册 GitHub 账号，创建一个仓库用于托管博客代码
- 注册 Cloudflare 账号

## 2. 初始化 Hexo 博客

```bash
hexo init blog
cd blog
npm install
```
## 3.创建一篇文章
```bash
hexo new "这是一篇测试文章"
```
## 4.创建GitHub仓库并推送
直接使用gitdesktop(也可以用命令行) 上传本地的blog仓库
后续每次更改代码,都进行commit push
## 5.在Cloudflare创建Blog项目的CICD
<img src="https://github.com/RookieCuzz/cuzz-blog/blob/main/source/_posts/images/8.png?raw=true" alt="图" width="1200" />

<img src="https://github.com/RookieCuzz/cuzz-blog/blob/main/source/_posts/images/9.png?raw=true" alt="图" width="1200" />
  
<img src="https://github.com/RookieCuzz/cuzz-blog/blob/main/source/_posts/images/10.png?raw=true" alt="图" width="1200" />

<img src="https://github.com/RookieCuzz/cuzz-blog/blob/main/source/_posts/images/11.png?raw=true" alt="图" width="1200" />  
执行命令如下
```bash
npm install -g hexo; hexo clean; hexo generate
```

cloudflare会提供一个域,后续我们可以通过这个域访问博客
<img src="https://github.com/RookieCuzz/cuzz-blog/blob/main/source/_posts/images/12.png?raw=true" alt="图" width="1200" />


## 6.如果更换主题
如果觉得默认的主题不好看,可以切换到其他主题.   
[主题网站](https://hexo.io/themes/)

切换博客项目根目录,进入themes目录下载想要切换主题的源码(记得解压).     
然后打开根目录修改为你之前下载的主题名称(!!!)
<img src="https://github.com/RookieCuzz/cuzz-blog/blob/main/source/_posts/images/13.png?raw=true" alt="图" width="1200" />

