# Easy Generator MCP Server

基于模板的代码生成器 MCP 服务，支持 Handlebars 和 Velocity 模板引擎，提供灵活的自定义规则解析能力。

## MCP 配置

### 方式一：快速配置到 Claude Code（推荐）

使用 `claude mcp add` 命令通过 npx 快速添加：

```bash
# 基本配置（使用当前项目内的 .code-generator 目录）
claude mcp add code-generator --scope user -- npx @hyqf98/easy_generator_mcp_server@latest

# 指定模板路径（使用环境变量）
claude mcp add code-generator --scope user -e CODE_GENERATOR_PATH=/path/to/templates -- npx @hyqf98/easy_generator_mcp_server@latest
```

> **说明**: `--scope user` 将 MCP 配置到用户全局环境（`~/.claude/settings.json`），所有项目均可使用。

### 方式二：手动配置

编辑 Claude Code 用户配置文件 `~/.claude/settings.json`：

```json
{
  "mcpServers": {
    "code-generator": {
      "command": "npx",
      "args": ["@hyqf98/easy_generator_mcp_server@latest"],
      "env": {
        "CODE_GENERATOR_PATH": "/path/to/templates"
      }
    }
  }
}
```

## 本地开发

```bash
# 克隆项目
git clone https://github.com/hyqf98/easy_generator_mcp_server.git
cd easy_generator_mcp_server

# 安装依赖
npm install

# 编译
npm run build

# 开发模式（热重载）
npm run dev
```

### 模板路径优先级

1. 当前工作目录下的 `.code-generator` 目录
2. 环境变量 `CODE_GENERATOR_PATH` 指定的路径

## 配合数据库 MCP 使用

本代码生成器可配合 [easy_db_mcp_server](https://github.com/hyqf98/easy_db_mcp_server) 数据库 MCP 服务使用，直接从数据库表结构生成代码。详细配置请查看该项目的 README.md。

## 工具列表

| 工具名称 | 描述 |
|---------|------|
| `code_generator_list_groups` | 列出所有模板分组 |
| `code_generator_list_templates` | 列出指定分组的模板 |
| `code_generator_get_template_config` | 获取模板配置（包含字段解析规则） |
| `code_generator_generate_code` | 生成单个模板代码 |
| `code_generator_generate_module` | 批量生成完整模块代码（推荐） |
| `code_generator_parse_rules` | 解析自定义规则 |

## 工作流程

```
1. AI读取数据库表结构（通过数据库MCP）
          ↓
2. AI读取模板配置的 fieldParsingGuide（解析规则说明）
          ↓
3. AI根据规则从SQL注释中解析字段属性
          ↓
4. AI调用 generate_module 工具，传递解析后的参数
          ↓
5. 工具生成完整模块代码
```

### generate_module 工具（推荐）

批量生成完整模块代码。AI需要先根据模板规则从SQL注释中解析字段属性。

**参数说明：**

| 参数 | 必填 | 说明 |
|------|------|------|
| group | 是 | 模板分组名称，如 `atom` |
| basePackage | 是 | 基础包名（不包含模块名），如 `io.github.atom.ai.sales.module` |
| moduleName | 是 | 模块名（小写），如 `project` |
| className | 是 | 类名（大驼峰），如 `AiProject` |
| tableName | 是 | 数据库表名，如 `ai_project` |
| comment | 否 | 模块注释/描述 |
| outputDir | 是 | Java代码输出目录 |
| resourcesDir | 否 | 资源文件输出目录（用于XML等） |
| fields | 是 | 字段列表（AI解析后的结构） |
| author | 否 | 作者 |
| date | 否 | 日期 |
| version | 否 | 版本号 |
| email | 否 | 邮箱后缀 |

**字段结构（AI解析后）：**

```json
{
  "columnName": "project_name",     // 数据库列名（下划线命名）
  "fieldName": "projectName",       // Java字段名（驼峰命名）
  "fieldType": "String",            // Java类型（基础类型或枚举类名）
  "comment": "项目名称",             // 清理后的字段注释
  "isPrimaryKey": false,            // 是否主键
  "isQueryField": true,             // 是否查询字段
  "ignore": false,                  // 是否忽略
  "atomEnum": null,                 // Atom枚举定义（可选）
  "dict": null                      // 字典引用（可选）
}
```

**使用示例：**

```json
{
  "group": "atom",
  "basePackage": "io.github.atom.ai.sales.module",
  "moduleName": "project",
  "className": "AiProject",
  "tableName": "ai_project",
  "outputDir": "/path/to/project/src/main/java",
  "fields": [
    { "columnName": "id", "fieldName": "id", "fieldType": "Long", "comment": "主键id", "isPrimaryKey": true },
    { "columnName": "project_name", "fieldName": "projectName", "fieldType": "String", "comment": "项目名称", "isQueryField": true },
    {
      "columnName": "project_type",
      "fieldName": "projectType",
      "fieldType": "ProjectType",
      "comment": "项目类型",
      "isQueryField": true,
      "atomEnum": {
        "name": "ProjectType",
        "valueType": "Integer",
        "values": [
          { "code": "1", "desc": "硬件销售" },
          { "code": "2", "desc": "综合项目" }
        ]
      }
    }
  ]
}
```

**生成结果：**

- Entity (PO)、DTO、Form、Query
- Mapper 接口和 XML
- Service 接口和实现
- Controller
- 枚举类（自动从atomEnum提取）

### 字段解析规则说明

AI需要从模板配置的 `fieldParsingGuide` 中读取规则，理解如何从SQL注释中提取字段属性。

**类型映射：**

| SQL类型 | Java类型 |
|---------|----------|
| bigint, bigint unsigned | Long |
| varchar, char, text | String |
| tinyint, int | Integer |
| decimal | BigDecimal |
| date | LocalDate |
| datetime, timestamp | LocalDateTime |

**注释标记规则：**

| 标记 | 说明 | 输入示例 | 解析结果 |
|------|------|----------|----------|
| Q@ | 查询字段 | `Q@项目名称` | `isQueryField: true, comment: "项目名称"` |
| 自定义枚举 | 枚举定义 | `自定义枚举:Integer:项目类型:1(1,"硬件销售");` | `atomEnum: {...}, fieldType: "ProjectType"` |
| @dict | 字典引用 | `@dict(USER_STATUS)` | `dict: { code: "USER_STATUS" }` |
| @ignore | 忽略字段 | `@ignore` | `ignore: true` |

## 示例模板

`demo_template` 目录下提供了示例配置代码生成器，可供参考和学习：

### MyBatis-Plus 模板

```
demo_template/
└── mybatis-plus/              # MyBatis-Plus 代码生成模板示例
    ├── template.json          # 模板配置文件
    ├── entity.java.vm         # 实体类模板
    ├── controller.java.vm     # 控制器模板
    ├── service.java.vm        # 服务接口模板
    ├── service-impl.java.vm   # 服务实现模板
    ├── mapper.java.vm         # Mapper 接口模板
    ├── mapper.xml.vm          # Mapper XML 模板
    ├── form.java.vm           # 表单类模板
    ├── req.java.vm            # 请求类模板
    └── enum.java.vm           # 枚举类模板
```

### Atom 框架模板

```
demo_template/
└── atom/                      # Atom 框架代码生成模板
    ├── template.json          # 模板配置文件
    ├── entity.java.vm         # 实体类（PO）模板
    ├── dto.java.vm            # 数据传输对象模板
    ├── form.java.vm           # 表单对象模板
    ├── query.java.vm          # 查询对象模板
    ├── mapper.java.vm         # Mapper 接口模板
    ├── mapper.xml.vm          # Mapper XML 模板
    ├── service.java.vm        # 服务接口模板
    ├── serviceImpl.java.vm    # 服务实现模板
    ├── controller.java.vm     # 控制器模板
    ├── converter.java.vm      # MapStruct 转换器模板
    └── enum.java.vm           # 枚举类模板
```

#### Atom 框架特有规则

Atom 框架模板支持以下特有规则：

| 规则 | 语法 | 说明 |
|------|------|------|
| queryField | `Q@字段描述` | 标记字段为查询字段，将生成到 Query 类中 |
| atomEnum | `自定义枚举:类型:枚举名:值列表;` | 解析 Atom 框架枚举定义 |

**Atom 枚举规则示例：**

SQL 注释格式：
```sql
project_type tinyint default 1 not null comment 'Q@自定义枚举:Integer:项目类型:1(1, "硬件销售"),2(2, "综合项目");'
```

解析结果：
```json
{
  "comment": "项目类型",
  "rules": {
    "isQueryField": true,
    "atomEnum": {
      "valueType": "Integer",
      "name": "ProjectType",
      "values": [
        { "code": "1", "desc": "硬件销售" },
        { "code": "2", "desc": "综合项目" }
      ]
    }
  }
}
```

使用示例模板：

```bash
# 复制 MyBatis-Plus 示例模板到项目目录
cp -r demo_template/mybatis-plus .code-generator/

# 或复制 Atom 框架模板
cp -r demo_template/atom .code-generator/

# 或指定示例模板路径
export CODE_GENERATOR_PATH=/path/to/demo_template/atom
```

## Template.json 标准模板配置

### 目录结构

```
.code-generator/
├── java/                      # 分组名称
│   ├── template.json          # 分组配置文件
│   ├── entity.hbs             # Handlebars 模板
│   ├── controller.hbs
│   └── mapperXml.vm           # Velocity 模板
```

### Template.json 字段说明

```json
{
  "name": "java",                    // 分组名称（必填）
  "description": "Java 标准代码生成模板",  // 分组描述（可选）
  "version": "1.0.0",                // 版本号（可选）
  "templates": [...],                // 模板列表（必填）
  "rules": [...]                     // 自定义规则列表（可选）
}
```

#### Templates 字段详解

```json
{
  "name": "entity",                  // 模板名称（必填），用于调用时指定
  "file": "entity.hbs",              // 模板文件名（必填），支持 .hbs 和 .vm
  "description": "生成 Java 实体类",  // 模板描述（可选）
  "inputParams": [...],              // 输入参数定义（可选）
  "output": {...}                    // 输出配置（可选）
}
```

#### InputParams 参数定义

```json
{
  "name": "fields",                  // 参数名称（必填）
  "type": "array",                   // 参数类型：string/number/boolean/array/object
  "required": true,                  // 是否必填（可选，默认 false）
  "description": "字段列表",          // 参数描述（可选）
  "defaultValue": [],                // 默认值（可选）
  "items": {...},                    // 数组元素结构（type=array 时）
  "properties": [...],               // 对象属性列表（type=object 时）
  "example": [...]                   // 示例值（可选，帮助 AI 理解格式）
}
```

#### Output 输出配置

```json
{
  "extension": ".java",              // 输出文件扩展名
  "suffix": "Entity",                // 文件名后缀
  "prefix": "",                      // 文件名前缀
  "namingRule": "PascalCase",        // 命名规则：PascalCase/camelCase/snake_case/kebab-case
  "pathTemplate": "src/main/java/{{packageName}}/{{className}}.java"
}
```

#### Rules 规则定义

```json
{
  "name": "enum",                    // 规则名称
  "pattern": "@enum\\(([\\w]+):([^)]+)\\)",  // 正则表达式
  "description": "解析枚举定义",      // 规则描述
  "params": [                        // 正则捕获组参数
    { "name": "enumName", "group": 1, "description": "枚举名称" },
    { "name": "values", "group": 2, "separator": ",", "description": "枚举值列表" }
  ],
  "parse": {                         // 解析配置
    "valueFormat": "{code}:{desc}",  // 值格式
    "output": {                      // 输出映射
      "name": "enumName",
      "values": [
        { "code": "valueCode", "desc": "valueDesc" }
      ]
    }
  }
}
```

## 完整配置示例

### Java 标准模板配置

```json
{
  "name": "java",
  "description": "Java 标准代码生成模板",
  "version": "1.0.0",
  "templates": [
    {
      "name": "entity",
      "file": "entity.hbs",
      "description": "生成 Java 实体类代码",
      "inputParams": [
        { "name": "className", "type": "string", "required": true, "description": "类名" },
        { "name": "packageName", "type": "string", "required": true, "description": "包名" },
        { "name": "tableName", "type": "string", "required": true, "description": "表名" },
        { "name": "comment", "type": "string", "required": false, "description": "类注释" },
        {
          "name": "fields",
          "type": "array",
          "required": true,
          "description": "字段列表",
          "items": {
            "type": "object",
            "properties": [
              { "name": "name", "type": "string", "required": true, "description": "字段名称（驼峰命名）" },
              { "name": "columnName", "type": "string", "required": true, "description": "数据库列名" },
              { "name": "type", "type": "string", "required": true, "description": "Java类型" },
              { "name": "comment", "type": "string", "required": false, "description": "字段注释" },
              { "name": "primaryKey", "type": "boolean", "required": false, "description": "是否主键" },
              { "name": "autoIncrement", "type": "boolean", "required": false, "description": "是否自增" },
              { "name": "nullable", "type": "boolean", "required": false, "description": "是否允许为空" },
              { "name": "length", "type": "number", "required": false, "description": "字段长度" }
            ]
          },
          "example": [
            { "name": "id", "columnName": "id", "type": "Long", "comment": "主键ID", "primaryKey": true },
            { "name": "userName", "columnName": "user_name", "type": "String", "comment": "用户名" }
          ]
        }
      ],
      "output": {
        "extension": ".java",
        "namingRule": "PascalCase"
      }
    }
  ],
  "rules": [
    {
      "name": "enum",
      "pattern": "@enum\\(([\\w]+):([^)]+)\\)",
      "description": "解析字段 comment 中的枚举定义",
      "params": [
        { "name": "enumName", "group": 1, "description": "枚举名称" },
        { "name": "values", "group": 2, "separator": ",", "description": "枚举值列表" }
      ],
      "parse": {
        "valueFormat": "{code}:{desc}",
        "output": {
          "name": "enumName",
          "values": [
            { "code": "valueCode", "desc": "valueDesc" }
          ]
        }
      }
    }
  ]
}
```

## 自定义规则示例

### 内置规则

服务内置以下规则，可直接使用：

| 规则 | 语法 | 说明 |
|------|------|------|
| enum | `@enum(名称:值1:描述1,值2:描述2)` | 解析枚举定义 |
| dict | `@dict(字典编码)` | 解析字典引用 |
| ignore | `@ignore` | 标记字段忽略生成 |

### 枚举规则示例

**输入数据：**
```json
{
  "className": "User",
  "fields": [
    {
      "name": "gender",
      "type": "Integer",
      "comment": "性别 @enum(GENDER:1:男,2:女)"
    }
  ]
}
```

**解析结果：**
```json
{
  "original": { "comment": "性别 @enum(GENDER:1:男,2:女)" },
  "parsed": {
    "comment": "性别",
    "_rules": {
      "enum": {
        "name": "GENDER",
        "values": [
          { "code": "1", "desc": "男" },
          { "code": "2", "desc": "女" }
        ]
      }
    }
  }
}
```

### 字典规则示例

**输入数据：**
```json
{
  "fields": [
    {
      "name": "status",
      "comment": "状态 @dict(USER_STATUS)"
    }
  ]
}
```

**解析结果：**
```json
{
  "parsed": {
    "comment": "状态",
    "_rules": {
      "dict": { "code": "USER_STATUS" }
    }
  }
}
```

### 自定义规则示例

在 `template.json` 中添加自定义规则：

```json
{
  "rules": [
    {
      "name": "validation",
      "pattern": "@validation\\(([^)]+)\\)",
      "description": "解析字段验证规则",
      "params": [
        { "name": "rules", "group": 1, "separator": ";" }
      ],
      "parse": {
        "separator": ":",
        "output": {
          "rules": [
            { "type": "ruleType", "value": "ruleValue" }
          ]
        }
      }
    },
    {
      "name": "encrypt",
      "pattern": "@encrypt\\(([\\w]+)\\)",
      "description": "标记字段需要加密",
      "params": [
        { "name": "algorithm", "group": 1 }
      ],
      "output": {
        "encrypted": true,
        "algorithm": "algorithm"
      }
    }
  ]
}
```

**使用自定义规则：**

```json
{
  "fields": [
    {
      "name": "phone",
      "comment": "手机号 @validation(required;mobile) @encrypt(AES)"
    }
  ]
}
```

## 使用示例

### 1. 查看可用分组

```
调用 code_generator_list_groups
```

### 2. 查看分组下的模板

```
调用 code_generator_list_templates
参数: { "group": "java" }
```

### 3. 获取模板详细配置

```
调用 code_generator_get_template_config
参数: { "group": "java", "template": "entity" }
```

### 4. 生成代码

```
调用 code_generator_generate_code
参数: {
  "group": "java",
  "template": "entity",
  "data": {
    "className": "User",
    "packageName": "com.example.entity",
    "tableName": "sys_user",
    "comment": "用户实体",
    "fields": [
      { "name": "id", "columnName": "id", "type": "Long", "comment": "主键", "primaryKey": true },
      { "name": "userName", "columnName": "user_name", "type": "String", "comment": "用户名" },
      { "name": "gender", "columnName": "gender", "type": "Integer", "comment": "性别 @enum(GENDER:1:男,2:女)" }
    ]
  },
  "outputPath": "./output/User.java"
}
```

## 开发命令

```bash
# 开发模式（热重载）
npm run dev

# 编译
npm run build

# 使用 MCP Inspector 测试
npm run inspector
```

## 许可证

MIT
