---
title: fiber2
date: 2025-08-15 14:02:23
tags:
---

# Go Fiber Web 框架请求参数处理笔记

## 1. 获取 GET 请求参数

- **查询参数（Query Parameters）**：通过 URL 中的查询字符串传递，例如 `/search?query=golang&limit=10`。
- **获取方式**：使用 `c.Query(key string, defaultValue ...string) string` 方法获取指定名称的查询参数值。
    - 如果参数存在，返回其值；
    - 如果不存在，返回默认值（如果提供）。
- **示例**：`c.Query("query", "default")`
- **批量查询**：使用 `c.Queries()` 获取所有查询参数，返回一个 `map[string]string`。
    - 例如：`c.Queries()["query"]`。:contentReference[oaicite:14]{index=14}

## 2. 获取 RESTful 风格路径参数

- **路径参数（Path Parameters）**：在 URL 路径中定义，例如 `/user/:id`。
- **获取方式**：使用 `c.Params(key string) string` 获取指定名称的路径参数值。
    - 如果参数存在，返回其值；
    - 如果不存在，返回空字符串。
- **示例**：`c.Params("id")`
- **可选参数**：使用 `*` 定义可选参数，例如 `/files/*filepath`。
- **获取所有路径参数**：使用 `c.Params("*")` 获取所有路径参数，返回一个字符串。:contentReference[oaicite:29]{index=29}

## 3. 处理 POST 请求参数

- **表单数据（Form Data）**：通过 POST 请求的表单提交数据。
- **获取方式**：使用 `c.FormValue(key string) string` 获取指定名称的表单字段值。
    - 如果字段存在，返回其值；
    - 如果不存在，返回空字符串。
- **示例**：`c.FormValue("username")`
- **获取所有表单数据**：使用 `c.Form()` 获取所有表单字段，返回一个 `map[string]string`。
    - 例如：`c.Form()["username"]`。:contentReference[oaicite:44]{index=44}

## 4. 处理 JSON 请求体

- **JSON 数据**：请求体为 JSON 格式的数据。
- **获取方式**：使用 `c.Body()` 获取请求体的原始字节切片。
    - 例如：`data := c.Body()`。
- **解析 JSON**：将字节切片解析为结构体，使用 `json.Unmarshal(data, &struct)`。
    - 注意：确保结构体字段标签与 JSON 键匹配。:contentReference[oaicite:55]{index=55}

## 5. 上传文件

- **上传文件**：处理客户端上传的文件。
- **获取方式**：使用 `c.FormFile(key string)` 获取指定名称的上传文件。
    - 返回一个 `*multipart.FileHeader`，包含文件信息。
- **保存文件**：使用 `c.SaveFile(file *multipart.FileHeader, dst string)` 将文件保存到指定路径。
    - 例如：`c.SaveFile(file, "./uploads/"+file.Filename)`。
- **上传多个文件**：使用 `c.MultipartForm()` 获取所有上传的文件，返回一个 `*multipart.Form`。
    - 遍历 `form.File` 字段获取所有文件。
    - 例如：
      ```go
      form, err := c.MultipartForm()
      if err != nil {
          // 处理错误
      }
      for _, files := range form.File {
          for _, file := range files {
              // 处理每个文件
          }
      }
      ```

## 6. 使用 Postman 工具测试接口

- **设置请求方法**：在 Postman 中选择相应的 HTTP 方法（GET、POST、PUT、DELETE 等）。
- **设置 URL**：输入接口的完整 URL。
- **设置请求参数**：
    - **查询参数**：在 URL 后添加查询字符串，或在 Postman 的 Params 标签页中添加键值对。
    - **路径参数**：在 URL 中使用占位符，例如 `/user/:id`，并在 Params 标签页中添加相应的键值对。
    - **表单数据**：在 Body 标签页中选择 form-data 或 x-www-form-urlencoded，添加字段和值。
    - **JSON 数据**：在 Body 标签页中选择 raw，设置类型为 JSON，输入 JSON 数据。
- **发送请求**：点击 Send 按钮发送请求，查看响应结果。:contentReference[oaicite:86]{index=86}

---

**参考资料**：

- [Fiber 官方文档](https://docs.gofiber.io/api/ctx)
- [Stack Overflow：如何在 Go Fiber 中获取查询字符串](https://stackoverflow.com/questions/68615135/how-do-i-get-the-querystring-using-golangs-fiber)
- [Stack Overflow：如何在 Go Fiber 中解析 JSON 请求体](https://stackoverflow.com/questions/65334615/in-a-gofiber-post-request-how-can-i-parse-the-request-body)
- [Stack Overflow：如何在 Go Fiber 中迭代多个文件](https://stackoverflow.com/questions/72577142/with-fibers-context-how-do-i-iterate-over-multiple-files)
- [Go Fiber 文件上传示例](https://docs.gofiber.io/recipes/upload-file/)

