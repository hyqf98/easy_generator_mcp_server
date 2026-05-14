#!/usr/bin/env node
/**
 * Code Generator MCP Server
 *
 * 基于模板的代码生成器 MCP 服务，支持自定义规则解析
 *
 * 支持的模板引擎：
 * - Handlebars (.hbs)
 * - Velocity (.vm)
 *
 * 内置规则：
 * - @enum(名称:值1:描述1,值2:描述2)
 * - @dict(字典编码)
 * - @ignore
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  listGroupsTool,
  ListGroupsInputSchema,
  listTemplatesTool,
  ListTemplatesInputSchema,
  getTemplateConfigTool,
  GetTemplateConfigInputSchema,
  generateCodeTool,
  GenerateCodeInputSchema,
  parseRulesTool,
  ParseRulesInputSchema,
  generateModuleTool,
  GenerateModuleInputSchema
} from './tools/index.js';
import { validateConfig } from './utils/config.js';

// 创建 MCP Server 实例
const server = new McpServer({
  name: '@hyqf98/easy-generator-mcp-server',
  version: '1.0.0'
});

// 注册 list_groups 工具
server.registerTool(
  'code_generator_list_groups',
  {
    title: '列出模板分组',
    description: `列出所有可用的模板分组。

返回分组列表，每个分组包含：
- name: 分组名称
- templateCount: 该分组下的模板数量

示例输出：
{
  "groups": [
    { "name": "atom", "templateCount": 2 },
    { "name": "java", "templateCount": 1 }
  ]
}`,
    inputSchema: ListGroupsInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async () => {
    const result = await listGroupsTool();
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      structuredContent: result
    };
  }
);

// 注册 list_templates 工具
server.registerTool(
  'code_generator_list_templates',
  {
    title: '列出模板列表',
    description: `列出指定分组下的所有模板。

参数：
- group: 分组名称（必填）

返回模板列表，每个模板包含：
- name: 模板名称
- file: 模板文件名
- type: 模板类型 (handlebars/velocity)
- description: 模板描述
- inputParams: 输入参数定义

示例：
{
  "group": "atom",
  "templates": [
    { "name": "entity", "file": "entity.hbs", "type": "handlebars", "description": "生成实体类" }
  ]
}`,
    inputSchema: ListTemplatesInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params) => {
    const result = await listTemplatesTool(params);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      structuredContent: result
    };
  }
);

// 注册 get_template_config 工具
server.registerTool(
  'code_generator_get_template_config',
  {
    title: '获取模板配置',
    description: `获取模板分组的配置信息。

参数：
- group: 分组名称（必填）
- template: 模板名称（可选，不传则返回整个分组配置）

返回配置信息，包含：
- name: 分组名称
- description: 分组描述
- version: 版本号
- templates: 模板列表（包含详细定义）
- rules: 规则列表（内置 + 自定义）`,
    inputSchema: GetTemplateConfigInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params) => {
    const result = await getTemplateConfigTool(params);
    if (!result) {
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: '未找到配置' }, null, 2) }],
        isError: true
      };
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      structuredContent: result
    };
  }
);

// 注册 generate_code 工具
server.registerTool(
  'code_generator_generate_code',
  {
    title: '生成代码',
    description: `根据模板和数据生成代码，保存到指定文件。

参数：
- group: 分组名称（必填）
- template: 模板名称（必填）
- data: 模板数据（必填，JSON 对象）
- outputPath: 输出文件路径（必填）

处理流程：
1. 根据 group 和 template 找到模板文件
2. 根据文件扩展名选择对应的模板引擎
3. 调用规则解析器解析 data 中的自定义规则
4. 使用解析后的数据渲染模板
5. 将生成的代码写入 outputPath 指定的文件

数据中的规则示例：
{
  "className": "User",
  "fields": [
    { "name": "gender", "comment": "性别 @enum(GENDER:male:男,female:女)" }
  ]
}

返回：
{
  "success": true/false,
  "outputPath": "输出路径",
  "message": "结果消息"
}`,
    inputSchema: GenerateCodeInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false
    }
  },
  async (params) => {
    const result = await generateCodeTool(params);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
      isError: !result.success
    };
  }
);

// 注册 parse_rules 工具
server.registerTool(
  'code_generator_parse_rules',
  {
    title: '解析规则',
    description: `解析数据中的自定义规则（可单独调用预览解析结果）。

参数：
- group: 分组名称（必填，用于加载该分组的规则定义）
- data: 要解析的数据（必填）

支持的规则：
- @enum(名称:值1:描述1,值2:描述2): 解析枚举定义
- @dict(字典编码): 解析字典引用
- @ignore: 标记字段忽略

示例输入：
{
  "group": "atom",
  "data": { "comment": "性别 @enum(GENDER:male:男,female:女)" }
}

示例输出：
{
  "original": { "comment": "性别 @enum(GENDER:male:男,female:女)" },
  "parsed": { "comment": "性别", "_rules": { "enum": { "name": "GENDER", "values": [...] } } },
  "rules": { "enum": { "name": "GENDER", "values": [...] } }
}`,
    inputSchema: ParseRulesInputSchema,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false
    }
  },
  async (params) => {
    const result = await parseRulesTool(params);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      structuredContent: result
    };
  }
);

// 注册 generate_module 工具
server.registerTool(
  'code_generator_generate_module',
  {
    title: '批量生成模块代码',
    description: `根据简化的参数批量生成完整模块代码（PO、DTO、Form、Query、Mapper、Service、Controller、Converter、枚举等）。

参数：
- group: 模板分组名称（必填），如 "atom"
- basePackage: 基础包名（必填），如 "io.github.atom.ai.sales.module.project"
- moduleName: 模块名（必填），小写，用于生成目录，如 "project"
- className: 类名（必填），大驼峰，如 "AiProject"
- tableName: 数据库表名（必填），如 "ai_project"
- comment: 模块注释/描述（可选）
- outputDir: 输出基础目录（必填），如 "/path/to/project/src/main/java"
- resourcesDir: 资源目录（可选），用于XML等，如 "/path/to/project/src/main/resources"
- fields: 字段列表（必填），简化结构：
  - name: 字段名（数据库列名或Java字段名）
  - type: 字段类型（可选，自动推断）
  - comment: 字段注释（可选，支持规则标记）
  - isPrimary: 是否主键（可选）
- author: 作者（可选）
- date: 日期（可选）
- version: 版本号（可选）
- email: 邮箱后缀（可选）
- templates: 要生成的模板列表（可选，不传则生成全部）

字段注释支持的特殊标记：
- Q@: 标记为查询字段
- 自定义枚举:类型:名称:值列表;: 定义枚举
- @dict(编码): 字典引用
- @ignore: 忽略字段

示例输入：
{
  "group": "atom",
  "basePackage": "io.github.atom.ai.sales.module.project",
  "moduleName": "project",
  "className": "AiProject",
  "tableName": "ai_project",
  "comment": "AI项目",
  "outputDir": "/path/to/project/src/main/java",
  "fields": [
    { "name": "id", "type": "bigint", "isPrimary": true },
    { "name": "project_name", "type": "varchar", "comment": "Q@项目名称" },
    { "name": "project_type", "type": "tinyint", "comment": "Q@自定义枚举:Integer:项目类型:1(1, \"硬件销售\"),2(2, \"综合项目\");" }
  ],
  "author": "haijun"
}

返回：
{
  "success": true/false,
  "results": [
    { "template": "entity", "outputPath": "...", "success": true, "message": "生成成功" }
  ],
  "message": "生成完成: 成功 X 个，失败 Y 个"
}`,
    inputSchema: GenerateModuleInputSchema,
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false
    }
  },
  async (params) => {
    const result = await generateModuleTool(params);
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
      isError: !result.success
    };
  }
);

// 主函数
async function main() {
  // 验证配置
  const configStatus = validateConfig();
  if (!configStatus.valid) {
    console.error(`警告: ${configStatus.message}`);
  } else {
    console.error(`配置加载成功: ${configStatus.path}`);
  }

  // 启动 stdio 传输
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Code Generator MCP Server 已启动');
}

// 运行服务
main().catch(error => {
  console.error('服务启动失败:', error);
  process.exit(1);
});
