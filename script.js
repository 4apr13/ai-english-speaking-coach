// ========== 全局变量 ==========
let currentScene = 'interview';
let isRecording = false;
let conversationHistory = [];
let grammarCorrections = [];
let recognition = null;

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
const apiKeyInput = document.getElementById('apiKeyInput');

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
        recordBtn.classList.add('recording');
        recordBtn.textContent = '🎤 录音中... 再次点击结束';
        statusDiv.textContent = '🔴 正在录音，请说英语...';
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
            handleUserSpeech(finalTranscript);
        }
    };

    recognition.onerror = (event) => {
        if (event.error === 'no-speech') {
            statusDiv.textContent = '⚠️ 没有检测到声音，请重试';
        } else if (event.error === 'not-allowed') {
            statusDiv.textContent = '❌ 麦克风权限被拒绝';
        } else {
            statusDiv.textContent = `❌ 识别错误: ${event.error}`;
        }
        resetRecordBtn();
    };

    recognition.onend = () => {
        if (isRecording) {
            try { recognition.start(); } catch (err) { resetRecordBtn(); }
        } else {
            resetRecordBtn();
        }
    };
    return true;
}

function resetRecordBtn() {
    isRecording = false;
    recordBtn.classList.remove('recording');
    recordBtn.textContent = '🎤 点击说话';
    recordBtn.disabled = false;
    statusDiv.textContent = '⚪ 准备就绪，可以开始说话';
}

// ========== 处理用户语音 ==========
async function handleUserSpeech(transcript) {
    if (!transcript.trim()) return;
    isRecording = false;
    recognition.stop();
    addUserMessage(transcript);
    statusDiv.textContent = '🤖 AI 思考中...';
    await getAIResponse(transcript);
}

// ========== 录音按钮 ==========
recordBtn.addEventListener('click', () => {
    if (!recognition) {
        const supported = initSpeechRecognition();
        if (!supported) return;
    }
    if (isRecording) {
        isRecording = false;
        recognition.stop();
    } else {
        try {
            recognition.start();
        } catch (err) {
            statusDiv.textContent = '❌ 启动失败，请刷新页面重试';
        }
    }
});

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

        if (!response.ok) {
            throw new Error(`API 错误: ${response.status}`);
        }

        const data = await response.json();
        const aiReply = data.choices[0].message.content.trim();

        addAIMessage(aiReply);
        conversationHistory.push({ role: 'assistant', content: aiReply });

        // 检查 AI 回复里是否包含语法纠错
        if (aiReply.includes('→') || aiReply.toLowerCase().includes('should be') || aiReply.toLowerCase().includes('instead of')) {
            showGrammarCorrections([`💡 AI 纠错: ${aiReply}`]);
        }

        recordBtn.disabled = true;
        statusDiv.textContent = '🔊 AI 正在说话...';
        speakText(aiReply, () => { resetRecordBtn(); });

    } catch (err) {
        console.error('API 调用失败:', err);
        statusDiv.textContent = `❌ 连接失败: ${err.message}`;
        resetRecordBtn();
    }
}

// ========== 文字转语音 ==========
function speakText(text, onEndCallback) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        window.speechSynthesis.cancel();
        const fallbackTimer = setTimeout(() => {
            if (onEndCallback) onEndCallback();
        }, text.length * 80 + 1000);
        utterance.onend = () => {
            clearTimeout(fallbackTimer);
            if (onEndCallback) onEndCallback();
        };
        utterance.onerror = () => {
            clearTimeout(fallbackTimer);
            if (onEndCallback) onEndCallback();
        };
        window.speechSynthesis.speak(utterance);
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

function showGrammarCorrections(corrections) {
    grammarCorrections.push(...corrections);
    correctionSection.style.display = 'block';
    correctionText.innerHTML = corrections.join('<br>');
    setTimeout(() => { correctionSection.style.display = 'none'; }, 5000);
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
            <p>📊 对话轮数：${Math.floor(conversationHistory.length / 2)} 轮</p >
            <p><strong>🏆 Practice makes perfect!</strong></p >
        `;
        reportSection.style.display = 'block';
        reportSection.scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
        reportContent.innerHTML = `<p>❌ 生成失败，请检查网络连接</p >`;
        reportSection.style.display = 'block';
    }

    reportBtn.textContent = '📋 生成课后总结';
    reportBtn.disabled = false;
});

// ========== 初始化 ==========
addAIMessage("👋 Hi! I'm your AI English coach. Choose a scene above and click the mic to start speaking!");
initSpeechRecognition();
