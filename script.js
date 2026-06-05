// ========== 全局变量 ==========
let currentScene = 'interview';
let isRecording = false;
let conversationHistory = [];
let grammarCorrections = [];
let recognition = null;

// 场景对应的系统提示词
const scenePrompts = {
    interview: "You are a professional job interviewer. Ask the user one question at a time about their work experience, skills, or career goals. Keep responses short (1-2 sentences). After the user answers, give a brief positive feedback and ask a follow-up question.",
    ordering: "You are a friendly restaurant waiter. Ask the user what they would like to order. Keep responses short. Help them order food and drinks naturally.",
    meeting: "You are a team meeting leader. Discuss a project update. Keep responses professional but friendly. Ask for the user's opinion on one topic at a time."
};

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

// ========== 初始化 Web Speech API ==========
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        statusDiv.textContent = '❌ 当前浏览器不支持语音识别，请使用 Chrome';
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
        console.error('语音识别错误:', event.error);
        if (event.error === 'no-speech') {
            statusDiv.textContent = '⚠️ 没有检测到声音，请重试';
        } else if (event.error === 'not-allowed') {
            statusDiv.textContent = '❌ 麦克风权限被拒绝，请在浏览器设置中允许';
        } else {
            statusDiv.textContent = `❌ 识别错误: ${event.error}`;
        }
        resetRecordBtn();
    };

    recognition.onend = () => {
        if (isRecording) {
            try {
                recognition.start();
            } catch (err) {
                resetRecordBtn();
            }
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
    statusDiv.textContent = '⚪ 准备就绪';
}

// ========== 处理用户语音输入 ==========
async function handleUserSpeech(transcript) {
    if (!transcript.trim()) return;

    isRecording = false;
    recognition.stop();

    addUserMessage(transcript);
    statusDiv.textContent = '🤖 AI 思考中...';

    const corrections = checkGrammar(transcript);
    if (corrections.length > 0) {
        showGrammarCorrections(corrections);
    }

    await getAIResponse(transcript);
}

// ========== 录音按钮：点击开关 ==========
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
            console.error('启动识别失败:', err);
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

        addAIMessage(`Scene changed to ${btn.textContent}. Let's start!`);
        getAIResponse("Let's begin the conversation. Say something to start.");
    });
});

// ========== 语法检查 ==========
function checkGrammar(text) {
    const corrections = [];
    const lowerText = text.toLowerCase();

    if (lowerText.includes('go to home')) {
        corrections.push('❌ "go to home" → ✅ "go home" (home 前不加 to)');
    }
    if (lowerText.includes('i am agree')) {
        corrections.push('❌ "I am agree" → ✅ "I agree" (agree 是动词，不需要 be 动词)');
    }
    if (lowerText.includes('i have 20 years')) {
        corrections.push('❌ "I have 20 years" → ✅ "I am 20 years old"');
    }
    if (lowerText.match(/\bgo\b.*\byesterday\b/)) {
        corrections.push('❌ 过去时间应用过去式: "go" → ✅ "went"');
    }
    if (lowerText.includes('i am boring')) {
        corrections.push('❌ "I am boring" → ✅ "I am bored" (boring 表示令人无聊)');
    }
    if (lowerText.includes('very very')) {
        corrections.push('💡 "very very" 过于口语化 → ✅ 可用 "extremely" 或 "incredibly" 替代');
    }
    if (lowerText.match(/\bdepends of\b/)) {
        corrections.push('❌ "depends of" → ✅ "depends on"');
    }

    return corrections;
}

function showGrammarCorrections(corrections) {
    grammarCorrections.push(...corrections);
    correctionSection.style.display = 'block';
    correctionText.innerHTML = corrections.join('<br>');

    setTimeout(() => {
        correctionSection.style.display = 'none';
    }, 5000);
}

// ========== AI 对话（模拟，PR #4 接入真实 API）==========
async function getAIResponse(userMessage) {
    if (userMessage) {
        conversationHistory.push({ role: 'user', content: userMessage });
    }

    const responses = {
        interview: [
            "That's interesting! Can you tell me more about your previous work experience?",
            "Great answer! What do you consider your biggest strength?",
            "I see. Why do you want to join our company?",
            "Good! Where do you see yourself in 5 years?"
        ],
        ordering: [
            "Would you like to see our menu? We have specials today.",
            "Excellent choice! Would you like anything to drink?",
            "Sure! Would you like that with fries or salad?",
            "Perfect! I'll bring that right away."
        ],
        meeting: [
            "Thanks for sharing. What's your opinion on this project timeline?",
            "Good point. How do you think we can improve our workflow?",
            "I appreciate your input. Any concerns about the budget?",
            "Let's move to the next agenda item. Any updates from your team?"
        ]
    };

    const sceneResponses = responses[currentScene] || responses.interview;
    const randomResponse = sceneResponses[Math.floor(Math.random() * sceneResponses.length)];

    await new Promise(resolve => setTimeout(resolve, 800));

    addAIMessage(randomResponse);
    conversationHistory.push({ role: 'assistant', content: randomResponse });

    recordBtn.disabled = true;
    statusDiv.textContent = '🔊 AI 正在说话...';

    speakText(randomResponse, () => {
        resetRecordBtn();
    });
}

// ========== 文字转语音 ==========
function speakText(text, onEndCallback) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        window.speechSynthesis.cancel();

        // 兜底计时器，防止 onend 不触发导致按钮永久禁用
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
    const messageDiv = document.createElement('div');
    messageDiv.className = 'user-message';
    messageDiv.textContent = `🧑 ${text}`;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function addAIMessage(text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'ai-message';
    messageDiv.textContent = `👩‍💼 ${text}`;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ========== 生成课后总结 ==========
reportBtn.addEventListener('click', () => {
    const avgScore = '待接入评测系统';
    const uniqueCorrections = [...new Set(grammarCorrections)];

    let reportHtml = `
        <p>📊 对话轮数：${Math.floor(conversationHistory.length / 2)} 轮</p>
        <p>🎤 发音评分：${avgScore}</p>
        <p>✏️ 发现语法问题：${uniqueCorrections.length} 个</p>
        <hr>
        <h4>💡 本次发现的问题：</h4>
        <ul>
    `;

    if (uniqueCorrections.length > 0) {
        uniqueCorrections.forEach(c => {
            reportHtml += `<li>${c}</li>`;
        });
    } else {
        reportHtml += `<li>👍 本次对话未检测到常见语法错误，继续保持！</li>`;
    }

    reportHtml += `
            <li>📖 建议每天练习15分钟，坚持一周会有明显进步。</li>
        </ul>
        <hr>
        <p><strong>🏆 继续保持！Practice makes perfect!</strong></p>
    `;

    reportContent.innerHTML = reportHtml;
    reportSection.style.display = 'block';
    reportSection.scrollIntoView({ behavior: 'smooth' });
});

// ========== 初始化 ==========
addAIMessage("👋 Hi! I'm your AI English coach. Click the mic button and speak in English. Let's practice! Choose a scene above to start.");
initSpeechRecognition();