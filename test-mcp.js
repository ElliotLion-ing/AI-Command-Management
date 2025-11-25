#!/usr/bin/env node

/**
 * MCP Tool Manual Testing Script
 * 使用 stdio 模式测试 MCP 工具
 */

const { spawn } = require('child_process');
const readline = require('readline');

// 启动 MCP 服务器
const mcpServer = spawn('node', ['dist/index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let requestId = 1;

// 监听服务器输出
mcpServer.stdout.on('data', (data) => {
  const lines = data.toString().split('\n').filter(line => line.trim());
  lines.forEach(line => {
    try {
      const response = JSON.parse(line);
      console.log('\n📥 收到响应:');
      console.log(JSON.stringify(response, null, 2));
    } catch (e) {
      console.log('📄 服务器输出:', line);
    }
  });
});

// 监听错误输出（日志）
mcpServer.stderr.on('data', (data) => {
  console.log('📋 日志:', data.toString().trim());
});

// 发送 MCP 请求
function sendRequest(method, params = {}) {
  const request = {
    jsonrpc: '2.0',
    id: requestId++,
    method,
    params
  };
  console.log('\n📤 发送请求:', method);
  console.log(JSON.stringify(request, null, 2));
  mcpServer.stdin.write(JSON.stringify(request) + '\n');
}

// 等待服务器启动
setTimeout(() => {
  console.log('\n🚀 MCP 服务器已启动，开始测试...\n');
  console.log('=' .repeat(60));
  
  // 测试序列
  runTests();
}, 1000);

function runTests() {
  let step = 0;
  
  const tests = [
    // Test 1: 列出所有工具
    {
      name: '列出可用工具',
      action: () => sendRequest('tools/list'),
      delay: 2000
    },
    
    // Test 2: 列出所有命令
    {
      name: '列出所有命令',
      action: () => sendRequest('tools/call', {
        name: 'list_commands',
        arguments: { page: 1, page_size: 10 }
      }),
      delay: 2000
    },
    
    // Test 3: 搜索命令
    {
      name: '搜索命令 - "speech SDK log"',
      action: () => sendRequest('tools/call', {
        name: 'search_commands',
        arguments: { query: 'speech SDK log', max_results: 5 }
      }),
      delay: 2000
    },
    
    // Test 4: 获取特定命令
    {
      name: '获取命令详情 - analyze_zoom_speech_sdk_log',
      action: () => sendRequest('tools/call', {
        name: 'get_command',
        arguments: { command_name: 'analyze_zoom_speech_sdk_log' }
      }),
      delay: 2000
    },
    
    // Test 5: 搜索报告
    {
      name: '搜索报告 - "decode_response"',
      action: () => sendRequest('tools/call', {
        name: 'search_reports',
        arguments: { query: 'decode_response', max_results: 5 }
      }),
      delay: 2000
    },
    
    // Test 6: 列出特定命令的报告
    {
      name: '列出命令报告 - analyze_zoom_speech_sdk_log',
      action: () => sendRequest('tools/call', {
        name: 'list_command_reports',
        arguments: { command_name: 'analyze_zoom_speech_sdk_log' }
      }),
      delay: 2000
    },
    
    // Test 7: 测试模糊搜索
    {
      name: '模糊搜索 - "plist avatar"',
      action: () => sendRequest('tools/call', {
        name: 'search_commands',
        arguments: { query: 'plist avatar', max_results: 5 }
      }),
      delay: 2000
    }
  ];
  
  function runNextTest() {
    if (step >= tests.length) {
      console.log('\n' + '='.repeat(60));
      console.log('✅ 所有测试完成！');
      console.log('\n按 Ctrl+C 退出');
      return;
    }
    
    const test = tests[step];
    console.log(`\n[${'#'.repeat(step + 1)}] 测试 ${step + 1}/${tests.length}: ${test.name}`);
    console.log('-'.repeat(60));
    
    test.action();
    step++;
    
    setTimeout(runNextTest, test.delay);
  }
  
  runNextTest();
}

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n\n👋 关闭服务器...');
  mcpServer.kill();
  process.exit(0);
});

mcpServer.on('close', (code) => {
  console.log(`\n服务器已关闭，退出码: ${code}`);
  process.exit(code);
});

