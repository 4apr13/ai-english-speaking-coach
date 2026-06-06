// ========== 全局变量 ==========
let currentScene = 'interview';
let isRecording = false;
let isSpeaking = false;
let isWaiting = false;
let conversationHistory = [];
let grammarCorrections = [];
let recognition = null;
let currentUtterance = null;

// ========== DOM 元素 ==========
const sceneBtns = document.querySelectorAll('.scene-btn');
const chatBox = document.getElementById('chatBox');
const recordBtn = document.getElementById('recordBtn');
const statusDiv = document.getElementById('status');
const correctionSection = document.getElementById('correctionSection');
const correctionText = document.getElementById('correctionText');
const reportBtn = document.getElementById('reportBtn');
const reportSection = document.getElementById('reportSection');
const reportContent = document.getElementById('reportContent');

// ========== 按钮状态管理 ==========
function setBtnState(state) {
    recordBtn.classList.remove('recording');
    recordBtn.disabled = false;

    switch(state) {
        case 'idle':
            recordBtn.textContent = '🎤 点击说话';
            statusDiv.textContent = '⚪ 准备就绪，可以开始说话';
            break;
        case 'recording':
            recordBtn.classList.add('recording');
            recordBtn.textContent = '⏹️ 点击停止';
            statusDiv.textContent = '🔴 录音中，点击停止并发送...';
            break;
        case 'waiting':
            recordBtn.disabled = true;
            recordBtn.textContent = '⏳ AI 思考中...';
            statusDiv.textContent = '🤖 AI 思考中，请稍候...';
            break;
        case 'speaking':
            recordBtn.textContent = '⏸️ 点击打断 AI';
            statusDiv.textContent = '🔊 AI 正在说话，点击可打断...';
            break;
    }
}

// ========== 初始化 Web Speech API ==========
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        statusDiv.textContent = '❌ 请使用 Chrome 浏览器';
        recordBtn.disabled = true;
        return false;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
        isRecording = true;
        setBtnState('recording');
    };

    recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript;
            } else {
                interimTranscript += transcript;
            }
        }
        if (interimTranscript) {
            statusDiv.textContent = `🎙️ 识别中: "${interimTranscript}"`;
        }
        if (finalTranscript) {
            recognition._pendingTranscript = (recognition._pendingTranscript || '') + finalTranscript;
        }
    };

    recognition.onerror = (event) => {
        if (event.error === 'no-speech') return;
        if (event.error === 'not-allowed') {
            statusDiv.textContent = '❌ 麦克风权限被拒绝';
        }
        isRecording = false;
        setBtnState('idle');
    };

    recognition.onend = () => {
        if (isRecording) {
            try { recognition.start(); } catch (err) {}
        }
    };

    return true;
}

// ========== 录音按钮点击 ==========
recordBtn.addEventListener('click', () => {
    if (isWaiting) return;

    if (isSpeaking) {
        interruptAI();
        return;
    }

    if (isRecording) {
        stopAndSubmit();
        return;
    }

    if (!recognition) {
        const supported = initSpeechRecognition();
        if (!supported) return;
    }
    recognition._pendingTranscript = '';
    try {
        recognition.start();
    } catch (err) {
        statusDiv.textContent = '❌ 启动失败，请刷新页面重试';
    }
});

// ========== 打断 AI ==========
function interruptAI() {
    if (currentUtterance) {
        window.speechSynthesis.cancel();
    }
    isSpeaking = false;
    if (!recognition) initSpeechRecognition();
    recognition._pendingTranscript = '';
    try {
        recognition.start();
    } catch (err) {}
}

// ========== 停止录音并提交 ==========
function stopAndSubmit() {
    isRecording = false;
    recognition.stop();

    const transcript = (recognition._pendingTranscript || '').trim();
    recognition._pendingTranscript = '';

    if (!transcript) {
        statusDiv.textContent = '⚠️ 未识别到内容，请重试';
        setBtnState('idle');
        return;
    }

    addUserMessage(transcript);
    isWaiting = true;
    setBtnState('waiting');
    getAIResponse(transcript);
}

// ========== 场景切换 ==========
sceneBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        sceneBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentScene = btn.dataset.scene;
        conversationHistory = [];
        grammarCorrections = [];

        if (isRecording && recognition) {
            isRecording = false;
            recognition.stop();
        }
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            isSpeaking = false;
        }

        chatBox.innerHTML = '';
        addAIMessage(`已切换到「${btn.textContent}」场景，我们开始吧！`);
        getAIResponse(null);
    });
});

// ========== 调用 DeepSeek API ==========
async function getAIResponse(userMessage) {
    if (userMessage) {
        conversationHistory.push({ role: 'user', content: userMessage });
    }

    const systemPrompt = SCENE_PROMPTS[currentScene] || SCENE_PROMPTS.interview;
    const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory
    ];

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: CONFIG.MODEL,
                messages: messages,
                max_tokens: 150,
                temperature: 0.8
            })
        });

        if (!response.ok) throw new Error(`API 错误: ${response.status}`);

        const data = await response.json();
        const aiReply = data.choices[0].message.content.trim();

        addAIMessage(aiReply);
        conversationHistory.push({ role: 'assistant', content: aiReply });

        isWaiting = false;
        isSpeaking = true;
        setBtnState('speaking');
        speakText(aiReply, () => {
            isSpeaking = false;
            setBtnState('idle');
        });

    } catch (err) {
        console.error('API 调用失败:', err);
        statusDiv.textContent = `❌ 连接失败: ${err.message}`;
        isWaiting = false;
        isSpeaking = false;
        setBtnState('idle');
    }
}

// ========== 文字转语音 ==========
function speakText(text, onEndCallback) {
    if ('speechSynthesis' in window) {
        currentUtterance = new SpeechSynthesisUtterance(text);
        currentUtterance.lang = 'en-US';
        currentUtterance.rate = 0.9;
        currentUtterance.pitch = 1.0;
        window.speechSynthesis.cancel();

        const fallbackTimer = setTimeout(() => {
            isSpeaking = false;
            if (onEndCallback) onEndCallback();
        }, text.length * 80 + 1000);

        currentUtterance.onend = () => {
            clearTimeout(fallbackTimer);
            currentUtterance = null;
            if (onEndCallback) onEndCallback();
        };

        currentUtterance.onerror = () => {
            clearTimeout(fallbackTimer);
            currentUtterance = null;
            if (onEndCallback) onEndCallback();
        };

        window.speechSynthesis.speak(currentUtterance);
    } else {
        if (onEndCallback) onEndCallback();
    }
}

// ========== 界面更新 ==========
function addUserMessage(text) {
    const div = document.createElement('div');
    div.className = 'user-message';
    div.textContent = `🧑 ${text}`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function addAIMessage(text) {
    const div = document.createElement('div');
    div.className = 'ai-message';
    div.textContent = `👩‍💼 ${text}`;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ========== 课后总结 ==========
reportBtn.addEventListener('click', async () => {
    if (conversationHistory.length < 2) {
        alert('请先进行一段对话再生成总结');
        return;
    }

    reportBtn.textContent = '⏳ 生成中...';
    reportBtn.disabled = true;

    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: CONFIG.MODEL,
                messages: [
                    {
                        role: 'system',
                        content: `You are an English teacher. Analyze the student's conversation and provide a structured learning report in Chinese. Include:
1. 对话表现总结（2-3句话）
2. 优点（2-3条）
3. 需要改进的语法/表达问题（列出具体例子）
4. 本次使用的好表达（2-3个）
5. 下次练习建议`
                    },
                    {
                        role: 'user',
                        content: `请分析以下对话记录：\n${conversationHistory.map(m => `${m.role === 'user' ? '学生' : 'AI'}: ${m.content}`).join('\n')}`
                    }
                ],
                max_tokens: 500
            })
        });

        const data = await response.json();
        const summary = data.choices[0].message.content.trim();

        reportContent.innerHTML = `
            <div style="line-height:1.8; white-space:pre-wrap;">${summary}</div>
            <hr style="margin:16px 0">
            <p>📊 对话轮数：${Math.floor(conversationHistory.length / 2)} 轮</p>
            <p><strong>🏆 Practice makes perfect!</strong></p>
        `;
        reportSection.style.display = 'block';
        reportSection.scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
        reportContent.innerHTML = `<p>❌ 生成失败，请检查网络连接</p>`;
        reportSection.style.display = 'block';
    }

    reportBtn.textContent = '📋 生成课后总结';
    reportBtn.disabled = false;
});

// ========== 初始化 ==========
addAIMessage("👋 Hi! I'm your AI English coach. Choose a scene above and click the mic to start speaking!");
setBtnState('idle');
initSpeechRecognition();