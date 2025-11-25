---
description: 分析 Zoom Speech SDK 日志并生成业务问题报告
---

## User Input

```text
$ARGUMENTS
```

如果用户提供了日志文件路径，使用该路径。否则，提示用户提供日志文件。

## Execution Steps

### Step 1: Filter Logs

根据 `.specify/flows/analyze_zoom_speech_sdk_log.md` 中的流程：

1. **读取日志文件**:
   - 如果 `$ARGUMENTS` 包含文件路径，使用该路径
   - 如果用户提到"这个文件"或类似表述，检查当前打开的文件
   - 否则，提示用户提供日志文件路径
   - 如果文件不存在或无法读取，报告错误并停止

2. **过滤 Zoom Speech SDK 模块日志**:
   - 只保留包含以下模块关键字的日志行：
     - `asr_service`
     - `asr_recognizer_service`
     - `voice_command_service`
     - `websocket_transport`
     - `auth_manager`
     - `audio_device_manager`
     - `audio_cache_manager` - **必须搜索所有包含此模块关键字的日志行**（包含 ProcessCachedAudioAsync 等关键日志）
     - `asr_protocol_handler`
     - `voice_cmd_protocol_handler`
     - `protocol_handler`
     - `zZoomSpeechManager`
     - `zASRServiceBase`
     - `ZoomSpeechSDK`
   - 同时保留包含以下关键字的日志（**不管是否包含模块关键字**）：
     - `TransitionConnectionState` - **必须搜索所有包含此关键字的日志行**
     - `TransitionAudioState` - **必须搜索所有包含此关键字的日志行**
     - `UpdateResources` - **必须搜索所有包含此关键字的日志行**（Token 获取成功的关键证据）
     - `ProcessCachedAudioAsync` - **必须搜索所有包含此关键字的日志行**（ASR 就绪状态判断的关键证据）
     - `ASR not ready` - **必须搜索所有包含此关键字的日志行**（ASR 就绪状态判断的关键证据）
     - `Skipping processing` - **必须搜索所有包含此关键字的日志行**（音频处理被跳过的关键证据）
     - `Connection state`
     - `Audio state`
     - `realtime-zones/nexus-voice/auto-select-addr` - **必须搜索所有包含此 URL 的日志行**（不管域名）
     - `/nws/zr/2.0/core/voice/cmd/config` - **必须搜索所有包含此 URL 的日志行**（不管域名）
     - `Error`
     - `Warning`
     - `OnServiceError`
     - `Failed`
     - `Exception`

3. **检查多日志源**:
   - **主日志文件**: 分析主日志文件（如 `Zoom.exe_*.log`）
     - 搜索包含以下 URL 的请求：
       - `realtime-zones/nexus-voice/auto-select-addr` - ASR Server Token 获取 URL
       - `/nws/zr/2.0/core/voice/cmd/config` - Voice Command Server Token 获取 URL
     - 提取请求ID、URL、时间戳等信息
   - **HTTP 请求日志**: 搜索包含以下关键字的日志：
     - `realtime-zones/nexus-voice/auto-select-addr` - ASR Server Token 获取 URL
       - **重要**: 必须搜索包含此 URL 的所有日志行，不管域名是 `zoom.us` 还是 `zoomdev.us`
       - 搜索模式：`realtime-zones/nexus-voice/auto-select-addr`（大小写不敏感）
     - `/nws/zr/2.0/core/voice/cmd/config` - Voice Command Server Token 获取 URL
     - `RequestClusterEmit` - 集群请求发送（必须与上述 URL 相关）
     - `HandleClusterResponse` - 集群响应处理（必须与对应的请求ID匹配）
     - `ParseResponse` - 响应解析（必须与对应的请求ID匹配，避免混淆不同请求的响应）
     - `RequestDoneForEmitterRequest` - 请求完成（可能包含请求ID和URL信息）
     - HTTP 状态码（200, 302, 404, 500 等）
     - **重要**: 
       - 只关注包含 `realtime-zones/nexus-voice/auto-select-addr` 或 `/nws/zr/2.0/core/voice/cmd/config` 的请求（不管域名）
       - 排除 `/login`, `/com.snowplowanalytics.snowplow/tp2` 等非 Zoom Speech SDK 业务请求
       - 确保请求和响应通过请求ID精确匹配
       - 对于每个请求ID（如 `{8790A1AB-...}`），搜索所有包含该请求ID的日志行

### Step 2: Parse Log Entries by AIServerType

**AIServerType 类型定义**:
- `kASRServer = 0` (语音识别服务器)
- `kVoiceCommandServer = 1` (语音命令服务器)

**按类型分别过滤和提取**:

1. **识别 AIServerType**:
   - 查找包含 `server_type` 的日志行
   - 提取 `server_type: 0` (ASR Server) 或 `server_type: 1` (Voice Command Server)
   - 如果日志中没有明确标识，根据服务类型推断：
     - `asr_recognizer_service` → `kASRServer (0)`
     - `voice_command_service` → `kVoiceCommandServer (1)`

2. **Token 获取和刷新时间线**:
   - 对于每个 AIServerType，提取所有 token 相关日志：
     - `RequestToken` - Token 请求开始
     - `UpdateResources` - Token 获取成功（直接证据）
       - **重要**: 必须搜索包含 `UpdateResources` 的所有日志行，不管是否包含模块关键字（如 `asr_service`）
       - 搜索模式：`UpdateResources`（大小写不敏感）
     - `RequestCluster` / `RequestClusterEmit` - 集群请求
     - `HandleClusterResponse` - 集群响应处理
     - Token 刷新相关日志
   - **识别重试逻辑**:
     - 查找域名切换模式（如 `zoom.us` → `zoomdev.us`）
     - 通过请求ID追踪重试请求（如 `{95876F57-...}` → `{8790A1AB-...}`）
     - 识别 HTTP 302 重定向后的重试
     - 记录每次重试的时间戳和域名
     - **重要**: 
       - 只关注包含以下 URL 的请求（不管域名是 `zoom.us` 还是 `zoomdev.us`）：
         - `realtime-zones/nexus-voice/auto-select-addr` - ASR Server Token 获取 URL
         - `/nws/zr/2.0/core/voice/cmd/config` - Voice Command Server Token 获取 URL
       - **搜索方法**: 搜索包含 `realtime-zones/nexus-voice/auto-select-addr` 的所有日志行，不管域名前缀
       - 排除 `/login` 等非业务请求
       - 通过请求ID（如 `{8790A1AB-...}`）在日志中搜索所有相关日志（包括 `RequestClusterEmit`, `HandleClusterResponse`, `ParseResponse`, `RequestDoneForEmitterRequest` 等）
   - **请求-响应精确匹配**:
     - 通过请求ID（如 `{95876F57-79BB-455A-8607-14B1390DA151}`）精确匹配对应的响应
     - 确保 `HandleClusterResponse` 和 `ParseResponse` 日志与对应的 `RequestClusterEmit` 请求ID匹配
     - **避免混淆不同请求的响应**:
       - 第一次请求（请求ID: `{95876F57-...}`）的 `ParseResponse` 日志应匹配第一次请求的请求ID
       - 第二次请求（请求ID: `{8790A1AB-...}`）的响应应匹配第二次请求的请求ID
       - 不要将第一次请求的 `ParseResponse empty data or not success` 误认为是第二次请求的结果
     - 如果响应日志中没有明确的请求ID，通过时间序列推断（响应时间应在请求时间之后，且时间间隔合理）
     - **关键**: 每次请求的响应必须与对应的请求ID匹配，不能混淆
   - **Token 获取成功判断（多证据源）**:
     - **直接证据**: `UpdateResources` 日志
     - **间接证据**:
       - HTTP 200 响应（`HandleClusterResponse` 中 `httpCode == 200`，且 URL 包含以下之一）:
         - `realtime-zones/nexus-voice/auto-select-addr` - ASR Server Token 获取 URL
         - `/nws/zr/2.0/core/voice/cmd/config` - Voice Command Server Token 获取 URL
       - **注意**: 只关注 Zoom Speech SDK 业务请求，排除 `/login` 等非业务请求
     - **不使用的间接证据**:
       - HTTPS 连接成功（`Connected to *.zoomdev.us` 或 `*.zoom.us`）- 可能来自其他请求
       - SSL 证书验证成功（`SSL certificate verify ok`）- 可能来自其他请求
       - POST /login 请求 - 不是 Zoom Speech SDK 业务请求
     - 如果只有间接证据，在报告中标注为"推断成功"
   - **请求-响应匹配**:
     - 通过请求ID精确匹配每次请求和对应的响应
     - 确保 `ParseResponse` 日志与对应的 `RequestClusterEmit` 请求ID匹配
     - 避免将不同请求的响应混淆（如第一次请求的 `ParseResponse` 不应匹配到第二次请求）
   - **记录每个操作的时间戳**
   - **计算 token 获取耗时**（从第一次 RequestToken 到最终成功，包括重试时间）
   - **识别 token 刷新事件和时间间隔**
   - **打印 token 获取和刷新的时间**（在报告中明确显示，包括重试次数和域名切换）

3. **提取状态机状态变化**:
   - **Connection State Transitions**:
     - **直接证据**: 查找以下模式（按优先级，使用大小写不敏感搜索）:
       1. `TransitionConnectionState` - 最精确的模式
          - **重要**: 必须搜索包含 `TransitionConnectionState` 的所有日志行，不管是否包含模块关键字（如 `asr_service`）
          - 搜索模式：`TransitionConnectionState`（大小写不敏感）
       2. `Connection state transition` - 备用模式
       3. `ConnectionState.*->` 或 `->.*ConnectionState` - 状态转换模式
       4. 包含 `ConnectionState::` 和状态名称的日志（如 `ConnectionState::Connected`, `ConnectionState::WaitingForResources`）
       5. 包含 `Connection state:` 的日志（如 `Connection state: Connected`）
       6. 包含状态名称的日志（如 `Disconnected`, `WaitingForResources`, `Connecting`, `Connected`）结合上下文判断
     - **搜索技巧**:
       - 使用大小写不敏感搜索
       - **必须搜索包含 `TransitionConnectionState` 的所有日志行**，不管是否包含模块关键字
       - 搜索包含 `ConnectionState` 或 `Connection state` 的所有日志行
       - 搜索包含状态名称（`Disconnected`, `WaitingForResources`, `Connecting`, `Connected`）的日志行
       - 只在主日志文件中搜索
       - 如果搜索无结果，尝试更宽泛的搜索模式
     - **间接证据**（仅在直接证据完全缺失时使用）:
       - WebSocket 连接日志（仅当主日志中无直接证据时，在主日志文件中搜索）：
         - `WEBSOCKET_CONNECTION_START` → 推断为 `Connecting`
         - `WEBSOCKET_CONNECTION_ESTABLISHED` → 推断为 `Connected`
         - `WEBSOCKET_CONNECTION_FAILED` → 推断为 `Disconnected`
         - `WEBSOCKET_CONNECTION_CLOSED` → 推断为 `Disconnected`
       - **注意**: 只在主日志文件中搜索
     - 提取状态转换：`Disconnected -> WaitingForResources -> Connecting -> Connected`
     - 记录每个状态转换的时间戳和证据类型（直接/间接）
     - 统计每个状态出现的次数和持续时间
     - 按 AIServerType 分别统计
     - **注意**: 如果只有间接证据，在报告中标注为"推断"，并说明证据来源
   
   - **Audio State Transitions**:
     - 查找 `TransitionAudioState` 或 `Audio state transition` 模式
     - 提取状态转换：`None -> ContinuousRecognition -> ManualAudioChunk`
     - 记录状态变化序列和时间戳
     - 按 AIServerType 分别统计

4. **记录异常状态**:
   - 长时间停留在某个状态（如 `WaitingForResources` 超过 5 秒）
   - 状态转换失败
   - 频繁的状态切换
   - 无法到达目标状态（如无法到达 `Connected`）
   - **注意**: 如果状态判断基于间接证据，需要特别标注，避免误判

5. **识别日志级别问题**:
   - 如果关键日志（如 `UpdateResources`, `HandleTokenEvent`, `TransitionConnectionState`）缺失：
     - 检查是否有间接证据（HTTP 日志、WebSocket 日志等，仅来自主日志文件）
     - 如果间接证据存在但直接日志缺失 → 推断为日志级别设置问题
     - 在报告中明确标注哪些结论基于间接证据，哪些基于直接日志
     - 提示用户检查日志级别设置

### Step 3: Business Analysis (基于日志模式匹配)

#### 3.1 Session Request/Response 匹配检查

**完全基于日志模式匹配，不依赖代码**:

1. **查找 Session Request 日志模式**:
   - 搜索包含以下关键字的日志行：
     - `SendSessionRequest`
     - `ComposeSessionRequest`
     - `session.*request` (不区分大小写)
     - `session_init_req`
   - 从日志中提取：
     - 时间戳
     - 请求标识符（如 `event_id`, `tracing_id`, `session_id`）
     - 任何相关的上下文信息

2. **查找 Session Response 日志模式**:
   - 搜索包含以下关键字的日志行：
     - `OnSessionStarted`
     - `SessionResponse`
     - `session.*response` (不区分大小写)
     - `session_init_resp`
     - `ParseSessionResponse`
     - `Session started`
   - 从日志中提取：
     - 时间戳
     - 响应标识符（尝试与请求匹配）
     - `session_id` 或其他匹配字段

3. **基于日志的匹配分析**:
   - **时间序列分析**: 检查 Request 时间戳后是否有对应的 Response 时间戳
   - **标识符匹配**: 尝试通过 `session_id`, `event_id`, `tracing_id` 等字段匹配请求和响应
   - **延迟计算**: 如果匹配成功，计算 Request 到 Response 的时间差
   - **未匹配检测**: 识别发送了 Request 但没有对应 Response 的情况
   - **超时推断**: 如果 Request 后超过合理时间（如 10 秒）仍无 Response，标记为可能超时
   - **状态匹配**: 通过日志中的状态信息推断 Request 和 Response 是否能对上

#### 3.2 Decode Request/Response 匹配检查

**完全基于日志模式匹配**:

1. **查找 Decode Request 日志模式**:
   - 搜索包含以下关键字的日志行：
     - `SendDecodeRequest`
     - `ComposeDecodeRequest`
     - `decode.*request` (不区分大小写)
     - `audio_decode_req`
     - `SendAudioData`
     - `SendAudioChunk`
   - 从日志中提取：
     - 时间戳
     - 请求标识符
     - 音频数据信息（如长度、格式等）

2. **查找 Decode Response 日志模式**:
   - 搜索包含以下关键字的日志行：
     - `OnAudioTranscriptReceived`
     - `ParseDecodeResponse`
     - `decode.*response` (不区分大小写)
     - `audio_decode_resp`
     - `Transcript.*received`
     - `recognition.*result`
   - 从日志中提取：
     - 时间戳
     - 响应标识符
     - 转录结果内容

3. **基于日志的匹配分析**:
   - **时间序列匹配**: 检查 Request 后是否有对应的 Response
   - **请求计数**: 统计发送的 Decode Request 数量
   - **响应计数**: 统计收到的 Decode Response 数量
   - **成功率计算**: Response 数量 / Request 数量
   - **延迟分析**: 计算平均响应延迟、最大延迟、最小延迟
   - **缺失检测**: 识别发送了 Request 但没有收到 Response 的情况
   - **模式识别**: 如果大量 Request 未匹配，推断可能存在系统性问题

#### 3.3 DecodeEnd Request/Response 匹配检查

**完全基于日志模式匹配**:

1. **查找 DecodeEnd Request 日志模式**:
   - 搜索包含以下关键字的日志行：
     - `SendDecodeEndRequest`
     - `ComposeDecodeEndRequest`
     - `decode.*end.*request` (不区分大小写)
     - `audio_decode_end_req`
     - `StopRecognition` (可能触发 DecodeEnd)
     - `OnAudioCacheEmptied` (可能触发 DecodeEnd)
   - 从日志中提取：
     - 时间戳
     - 请求标识符
     - 触发原因（如 `stop_requested`, `cache emptied` 等）

2. **查找 DecodeEnd Response 日志模式**:
   - 搜索包含以下关键字的日志行：
     - `OnAudioTranscriptCompleted`
     - `ParseDecodeEndResponse`
     - `decode.*end.*response` (不区分大小写)
     - `audio_decode_end_resp`
     - `TRANSCRIPT_COMPLETED`
     - `Transcript.*completed`
     - `Called OnAudioTranscriptCompleted`
   - 从日志中提取：
     - 时间戳
     - 响应标识符
     - 回调触发信息

3. **基于日志的匹配分析**:
   - **时间序列匹配**: 检查 Request 后是否有对应的 Response
   - **触发路径分析**: 通过日志推断 DecodeEnd 是如何被触发的
   - **条件检查**: 从日志中提取 `stop_requested`, `decode_end_called` 等状态信息
   - **缺失原因推断**: 
     - 如果看到 `StopRecognition` 但没有 `SendDecodeEndRequest` → 可能条件不满足
     - 如果看到 `SendDecodeEndRequest` 但没有 Response → 可能服务器未响应或网络问题
     - 如果看到 `OnAudioCacheEmptied` 但 `stop_requested: false` → 可能标志被重置
   - **成功率统计**: Response 数量 / Request 数量
   - **延迟分析**: 计算 Request 到 Response 的时间差

#### 3.4 基于日志模式的业务影响分析

**完全基于日志证据推断，不依赖代码理解**:

1. **Connection Issues (基于日志模式)**:
   - **模式**: 日志显示长时间停留在 `WaitingForResources` 状态
     - **推断**: 可能是认证/资源获取问题
     - **证据**: 检查是否有 token 获取失败的日志
   - **模式**: 日志显示频繁在 `Connecting` 和 `Disconnected` 之间切换
     - **推断**: 网络不稳定或连接建立失败
     - **证据**: 检查是否有网络错误、超时等日志
   - **模式**: 日志中从未出现 `Connected` 状态
     - **推断**: 用户无法使用服务
     - **证据**: 检查连接状态转换序列

2. **Session Issues (基于日志模式)**:
   - **模式**: 日志中有 `SendSessionRequest` 但没有 `OnSessionStarted`
     - **推断**: 会话建立失败
     - **证据**: 检查时间差，如果超过 10 秒可能超时
   - **模式**: 日志显示 Session Response 延迟过长（> 5 秒）
     - **推断**: 用户体验差
     - **证据**: 计算 Request 到 Response 的时间差
   - **模式**: 日志显示多个 Session Request 未匹配
     - **推断**: 可能存在系统性问题
     - **证据**: 统计未匹配的 Request 数量

3. **Decode Issues (基于日志模式)**:
   - **模式**: 日志中有 `SendDecodeRequest` 但没有对应的 Response
     - **推断**: 音频处理失败
     - **证据**: 检查时间序列，识别未匹配的 Request
   - **模式**: 日志显示 Decode Response 延迟过长（> 3 秒）
     - **推断**: 实时性差
     - **证据**: 计算平均响应延迟
   - **模式**: 日志显示大量 Decode Request 未匹配（> 50%）
     - **推断**: 可能影响核心功能
     - **证据**: 统计匹配率

4. **DecodeEnd Issues (基于日志模式)**:
   - **模式**: 日志中有 `SendDecodeEndRequest` 但没有 `OnAudioTranscriptCompleted`
     - **推断**: 音频处理未正确结束，可能导致资源未释放
     - **证据**: 检查时间序列和状态信息
   - **模式**: 日志显示 `StopRecognition` 但未看到 `SendDecodeEndRequest`
     - **推断**: 可能条件不满足（如 `stop_requested: false`）
     - **证据**: 检查 `OnAudioCacheEmptied` 日志中的状态信息
   - **模式**: 日志显示 `OnAudioCacheEmptied` 中 `stop_requested: false`
     - **推断**: 标志可能被重置（如 `OnSessionStarted` 中重置）
     - **证据**: 检查时间序列，看 `OnSessionStarted` 是否在缓存清空前重置了标志

5. **Audio Processing Issues (基于日志模式)**:
   - **模式**: 日志显示音频状态异常转换（如 `None` → `ManualAudioChunk` 直接跳转）
     - **推断**: 可能影响语音识别功能
     - **证据**: 分析音频状态转换序列
   - **模式**: 日志显示音频状态长时间停留在某个状态
     - **推断**: 可能影响用户体验
     - **证据**: 计算状态持续时间

6. **Service Errors (基于日志模式)**:
   - **模式**: 日志中包含 `ERROR` 或 `Failed` 关键字
     - **推断**: 根据错误信息推断问题严重性
     - **证据**: 提取错误代码、错误消息
   - **模式**: 日志显示 `OnServiceError` 调用
     - **推断**: 服务级别错误，可能影响核心功能
     - **证据**: 检查错误代码和上下文
   - **模式**: 按 AIServerType 分别统计错误
     - **推断**: 识别特定服务器类型的问题模式
     - **证据**: 按类型分组错误日志

7. **缺失日志推断 (基于日志模式)**:
   - **模式**: 日志中只有 token 获取，没有连接、会话、解码相关日志
     - **推断**: ASR 服务可能未被使用，或日志级别设置问题
     - **证据**: 统计各类日志的数量
     - **验证**: 检查 WebSocket 日志等间接证据（仅来自主日志文件）
   - **模式**: 日志中缺少关键操作日志（如 `Connect`, `StartRecognition`）
     - **推断**: 可能方法未被调用，或日志级别过滤
     - **证据**: 检查是否有相关错误日志或警告日志
     - **验证**: 检查间接证据（如 WebSocket 连接日志）

8. **重试和域名切换识别 (基于日志模式)**:
   - **模式**: 日志显示 HTTP 302 重定向，然后出现不同域名的请求
     - **识别**: 提取第一次请求的域名（如 `zoom.us`）和重试请求的域名（如 `zoomdev.us`）
     - **追踪**: 通过请求ID或时间序列追踪重试请求
     - **判断**: 如果重试请求返回 HTTP 200 或 HTTPS 连接成功 → 推断 token 获取成功
     - **证据**: 
       - HTTP 状态码变化（302 → 200）
       - 域名变化（`zoom.us` → `zoomdev.us`）
       - HTTPS 连接成功日志（仅来自主日志文件）
   - **模式**: 日志显示多次 `RequestClusterEmit` 但域名不同
     - **识别**: 提取所有请求的域名和时间戳
     - **判断**: 最后一次成功的请求（HTTP 200 或连接成功）为最终结果
     - **证据**: HTTP 响应码、连接状态（仅来自主日志文件）

### Step 4: Generate Report

按照以下格式生成分析报告，参考 `.specify/flows/analyze_zoom_speech_sdk_log.md` 的输出要求：

```markdown
# Zoom Speech SDK 日志分析报告

**日志文件**: [文件路径]  
**文件大小**: [大小]  
**分析时间**: [时间]  
**分析范围**: Zoom Speech SDK 相关日志

---

## 1. 过滤后的关键日志列表

### 按 AIServerType 分类

#### AIServerType: kASRServer (0) - 语音识别服务器

[列出该类型的所有相关日志，按时间顺序]

**Token 时间线**:
- **[Token 请求时间]**: RequestToken 开始
- **[第一次请求时间]**: RequestClusterEmit (zoom.us) - 请求ID: {XXX} (如果存在)
- **[第一次请求失败时间]**: HandleClusterResponse - HTTP 302 (如果失败)
- **[重试请求时间]**: RequestClusterEmit (zoomdev.us) - 请求ID: {YYY} (如果存在重试)
- **[Token 获取时间]**: 
  - UpdateResources - Token 获取成功（直接证据，耗时 X 秒）
  - 或 HTTP 200 响应 / HTTPS 连接成功（间接证据，耗时 X 秒，标注为"推断成功"）
- **[Token 刷新时间]**: Token 刷新（如果存在，显示刷新间隔）

#### AIServerType: kVoiceCommandServer (1) - 语音命令服务器

[列出该类型的所有相关日志，按时间顺序]

**Token 时间线**:
- **[Token 请求时间]**: RequestToken 开始
- **[第一次请求时间]**: RequestClusterEmit (zoom.us) - 请求ID: {XXX} (如果存在)
- **[第一次请求失败时间]**: HandleClusterResponse - HTTP 302 (如果失败)
- **[重试请求时间]**: RequestClusterEmit (zoomdev.us) - 请求ID: {YYY} (如果存在重试)
- **[Token 获取时间]**: 
  - UpdateResources - Token 获取成功（直接证据，耗时 X 秒）
  - 或 HTTP 200 响应 / HTTPS 连接成功（间接证据，耗时 X 秒，标注为"推断成功"）
- **[Token 刷新时间]**: Token 刷新（如果存在，显示刷新间隔）

---

## 2. 状态机分析摘要

### 按 AIServerType 分类的状态转换

#### AIServerType: kASRServer (0)

**Connection State 转换序列**:
- [时间戳]: `Disconnected` → `WaitingForResources` (证据类型: 直接/间接)
- [时间戳]: `WaitingForResources` → `Connecting` (证据类型: 直接/间接)
- [时间戳]: `Connecting` → `Connected` (如果成功，证据类型: 直接/间接)

**注意**: 
- **直接证据**: 来自 `TransitionConnectionState` 日志
- **间接证据**: 来自 WebSocket 连接日志、HTTP 连接日志等
- 如果只有间接证据，在报告中明确标注，并说明证据来源

**Audio State 转换序列**:
- [列出所有音频状态转换]

**状态统计**:
- `Disconnected`: 出现 X 次，总时长 Y
- `WaitingForResources`: 出现 X 次，总时长 Y
- `Connecting`: 出现 X 次，总时长 Y
- `Connected`: 出现 X 次，总时长 Y

#### AIServerType: kVoiceCommandServer (1)

[同样的格式]

### 异常状态检测

- [列出任何异常状态，按 AIServerType 分类]

---

## 3. 业务问题分析

### Session Request/Response 匹配分析

#### AIServerType: kASRServer (0)

**Session Request**:
- [时间戳]: Request sent - event_id: XXX, tracing_id: XXX
- [时间戳]: Request sent - event_id: YYY, tracing_id: YYY

**Session Response**:
- [时间戳]: Response received - event_id: XXX (匹配成功，延迟 X 秒)
- [时间戳]: Request XXX - **未收到响应** ⚠️

**匹配统计**:
- 总请求数: X
- 成功匹配: Y
- 未匹配: Z
- 平均延迟: X 秒

**状态匹配结果**: [说明 Request 和 Response 是否能对上]

#### AIServerType: kVoiceCommandServer (1)

[同样的格式]

### Decode Request/Response 匹配分析

#### AIServerType: kASRServer (0)

**Decode Request**:
- [列出所有解码请求，包含时间戳和标识符]

**Decode Response**:
- [列出所有解码响应，并标记匹配情况]

**匹配统计**:
- 总请求数: X
- 成功匹配: Y
- 未匹配: Z
- 平均延迟: X 秒

**状态匹配结果**: [说明 Request 和 Response 是否能对上]

#### AIServerType: kVoiceCommandServer (1)

[同样的格式]

### DecodeEnd Request/Response 匹配分析

#### AIServerType: kASRServer (0)

**DecodeEnd Request**:
- [列出所有解码结束请求，包含时间戳和标识符]

**DecodeEnd Response**:
- [列出所有解码结束响应，并标记匹配情况]

**匹配统计**:
- 总请求数: X
- 成功匹配: Y
- 未匹配: Z
- 平均延迟: X 秒

**状态匹配结果**: [说明 Request 和 Response 是否能对上]

#### AIServerType: kVoiceCommandServer (1)

[同样的格式]

### 问题分类

#### 🔴 严重问题 (Critical)

**按 AIServerType 分类**:
- [列出影响核心功能的问题]

#### ⚠️ 警告问题 (Warning)

**按 AIServerType 分类**:
- [列出可能影响用户体验的问题]

#### ℹ️ 信息问题 (Info)

**按 AIServerType 分类**:
- [列出需要注意但不紧急的问题]

### 业务影响评估

- **用户影响**: [评估对最终用户的影响]
- **功能影响**: [评估对哪些功能有影响，按 AIServerType 分类]
- **性能影响**: [评估性能相关问题]

---

## 5. 关键结论总结（必须包含）

### 5.1 Token 获取详细总结

**按 AIServerType 分类，以最终结果为准**:

#### AIServerType: kASRServer (0)

**Token 获取结果**: [成功 ✅ / 失败 ❌]

**尝试次数**: [X 次]

**详细过程**:
1. **第 1 次尝试**:
   - **时间**: [时间戳]
   - **域名**: [zoom.us / zoomdev.us]
   - **请求ID**: [{XXX}] (必须与以下 URL 之一相关)
   - **URL**: [必须包含以下之一]:
     - `realtime-zones/nexus-voice/auto-select-addr` - ASR Server Token 获取 URL
     - `/nws/zr/2.0/core/voice/cmd/config` - Voice Command Server Token 获取 URL
   - **结果**: [成功 / 失败]
   - **失败原因**: [HTTP 302 / 响应解析失败 / 网络错误等] (如果失败)
   - **对应响应**: [列出与此次请求ID匹配的 `HandleClusterResponse` 和 `ParseResponse` 日志]
   - **证据类型**: [直接证据 / 间接证据]
   - **注意**: 确保响应日志与此次请求的请求ID匹配，不要混淆其他请求的响应

2. **第 2 次尝试** (如果存在):
   - **时间**: [时间戳]
   - **域名**: [zoom.us / zoomdev.us]
   - **请求ID**: [{YYY}] (必须与以下 URL 之一相关)
   - **URL**: [必须包含以下之一]:
     - `realtime-zones/nexus-voice/auto-select-addr` - ASR Server Token 获取 URL
     - `/nws/zr/2.0/core/voice/cmd/config` - Voice Command Server Token 获取 URL
   - **结果**: [成功 / 失败]
   - **失败原因**: [HTTP 302 / 响应解析失败 / 网络错误等] (如果失败)
   - **对应响应**: [列出与此次请求ID匹配的 `HandleClusterResponse` 和 `ParseResponse` 日志]
   - **证据类型**: [直接证据 / 间接证据]
   - **注意**: 确保响应日志与此次请求的请求ID匹配，不要将第一次请求的响应误认为是第二次请求的结果

[... 继续列出所有尝试]

**重要说明**:
- 只关注包含以下 URL 的请求：
  - `realtime-zones/nexus-voice/auto-select-addr` - ASR Server Token 获取 URL
  - `/nws/zr/2.0/core/voice/cmd/config` - Voice Command Server Token 获取 URL
- 排除 `/login`, `/com.snowplowanalytics.snowplow/tp2` 等非 Zoom Speech SDK 业务请求
- 每次请求的响应必须通过请求ID精确匹配，避免混淆

**最终结果判断**:
- **直接证据**: [UpdateResources 日志存在 / 不存在]
- **间接证据**: [HTTP 200 响应 / HTTPS 连接成功 / SSL 证书验证成功 / 不存在]
- **最终结论**: [成功 ✅ / 失败 ❌] - [基于直接证据 / 基于间接证据推断]
- **总耗时**: [从第一次 RequestToken 到最终结果的时间]

**关键问题** (如果失败):
- [列出导致失败的关键问题，如响应解析失败、网络错误等]

#### AIServerType: kVoiceCommandServer (1)

[同样的格式]

### 5.2 连接状态机当前状态

**按 AIServerType 分类**:

#### AIServerType: kASRServer (0)

**当前连接状态**: [Disconnected / WaitingForResources / Connecting / Connected / 未知]

**证据类型**: [直接证据 / 间接证据 / 无证据]

**状态判断依据**:
- **直接证据**: 
  - [TransitionConnectionState 日志存在 / 不存在]
  - [最后记录的状态: XXX]
- **间接证据**:
  - [WebSocket 连接状态: WebSocketState_XXX]
  - [HTTP/HTTPS 连接状态: Connected / Failed]
  - [Token 获取状态: 成功 / 失败]
- **推断逻辑**: [基于间接证据推断当前状态的原因]

**状态转换历史**:
- [时间戳]: `XXX` → `YYY` (证据类型: 直接/间接)
- [时间戳]: `YYY` → `ZZZ` (证据类型: 直接/间接)
- [... 列出所有状态转换]

**当前状态持续时间**: [从进入当前状态到现在的时间，如果可计算]

**异常情况** (如果存在):
- [长时间停留在某个状态 / 状态转换失败 / 无法到达目标状态等]

#### AIServerType: kVoiceCommandServer (1)

[同样的格式]

### 5.3 问题根本原因分析（Root Cause）

**按 AIServerType 分类**:

#### AIServerType: kASRServer (0)

**问题链分析**:
1. **[问题1]**: [描述第一个问题]
   - **时间**: [时间戳]
   - **证据**: [列出相关日志证据]
   - **影响**: [说明这个问题导致什么后果]

2. **[问题2]**: [描述第二个问题（由问题1导致）]
   - **时间**: [时间戳]
   - **证据**: [列出相关日志证据]
   - **影响**: [说明这个问题导致什么后果]

[... 继续列出问题链]

**根本原因（Root Cause）**:
- **核心问题**: [识别最根本的问题，通常是问题链的起点]
- **证据**: [列出支持根本原因判断的关键日志证据]
- **为什么是根本原因**: [解释为什么这个问题是根本原因，而不是其他问题]

**问题影响链**:
```
[根本原因] 
  → [问题1: 由根本原因导致]
    → [问题2: 由问题1导致]
      → [问题3: 由问题2导致]
        → [最终表现: 用户看到的问题]
```

**关键时间线**:
- [时间戳]: [根本原因发生]
- [时间戳]: [问题1发生]
- [时间戳]: [问题2发生]
- [时间戳]: [最终表现出现]

#### AIServerType: kVoiceCommandServer (1)

[同样的格式]
