// ========== 全局变量 ==========
let currentScene = 'interview';
let isRecording = false;
let isSpeaking = false;
let isWaiting = false;
let conversationHistory = [];
let grammarCorrections = [];
let recognition = null;
let currentUtterance = null;
let voicesLoaded = false;
let sessionStartTime = null;
let totalWords = 0;
let pronunciationIssues = [];

// ========== DOM 元素 ==========
const sceneBtns = document.querySelectorAll('.scene-card');
const chatBox = document.getElementById('chatBox');
const recordBtn = document.getElementById('recordBtn');
const statusDiv = document.getElementById('status');
const correctionSection = document.getElementById('correctionSection');
const correctionText = document.getElementById('correctionText');
const reportBtn = document.getElementById('reportBtn');
const reportSection = document.getElementById('reportSection');
const reportContent = document.getElementById('reportContent');

// ========== 提前加载 voices ==========
function loadVoices() {
    if (voicesLoaded) return;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) voicesLoaded = true;
}
window.speechSynthesis.onvoiceschanged = () => {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = null;
};
loadVoices();

// ========== 按钮状态管理 ==========
function setBtnState(state) {
    recordBtn.classList.remove('recording');
    recordBtn.disabled = false;
    const recordWrap = document.querySelector('.record-wrap');
    recordWrap.classList.remove('recording-active');

    switch(state) {
        case 'idle':
            recordBtn.innerHTML = '<span class="record-icon">🎤</span><span class="record-text">点击说话</span>';
            statusDiv.textContent = '⚪ 准备就绪，可以开始说话';
            break;
        case 'recording':
            recordBtn.classList.add('recording');
            recordWrap.classList.add('recording-active');
            recordBtn.innerHTML = '<span class="record-icon">⏹️</span><span class="record-text">点击停止</span>';
            statusDiv.textContent = '🔴 录音中，点击停止并发送...';
            break;
        case 'waiting':
            recordBtn.disabled = true;
            recordBtn.innerHTML = '<span class="record-icon">⏳</span><span class="record-text">思考中</span>';
            statusDiv.textContent = '🤖 AI 思考中，请稍候...';
            break;
        case 'speaking':
            recordBtn.innerHTML = '<span class="record-icon">⏸️</span><span class="record-text">打断AI</span>';
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
    window.speechSynthesis.cancel();
    currentUtterance = null;
    isSpeaking = false;
    if (!recognition) initSpeechRecognition();
    recognition._pendingTranscript = '';
    try {
        recognition.start();
    } catch (err) {}
}

// ========== 发音评分逻辑 ==========
function analyzePronunciation(transcript) {
    let issues = [];
    let score = 5;

    const nonEnglishPattern = /[\u4e00-\u9fa5]/;
    if (nonEnglishPattern.test(transcript)) {
        issues.push('识别到非英语内容，可能存在发音不清晰');
        score -= 1.5;
    }

    const garbledPattern = /([a-z])\1{3,}/i;
    if (garbledPattern.test(transcript)) {
        issues.push('部分词汇识别异常，建议放慢语速');
        score -= 1;
    }

    const words = transcript.trim().split(/\s+/);
    if (words.length < 2 && transcript.length > 0) {
        issues.push('识别内容较短，可能存在发音不清晰');
        score -= 0.5;
    }

    totalWords += words.length;
    score = Math.max(1, Math.min(5, score));
    return { score, issues };
}

// ========== 停止录音并提交 ==========
function stopAndSubmit() {
    const transcript = (recognition._pendingTranscript || '').trim();
    recognition._pendingTranscript = '';

    isRecording = false;
    recognition.stop();

    if (!transcript) {
        statusDiv.textContent = '⚠️ 未识别到内容，请重试';
        setBtnState('idle');
        return;
    }

    const pronResult = analyzePronunciation(transcript);
    pronunciationIssues.push(pronResult);

    addUserMessage(transcript);
    isWaiting = true;
    setBtnState('waiting');

    setTimeout(() => {
        getAIResponse(transcript);
    }, 500);
}

// ========== 场景切换 ==========
sceneBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        sceneBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentScene = btn.dataset.scene;
        conversationHistory = [];
        grammarCorrections = [];
        pronunciationIssues = [];
        totalWords = 0;
        sessionStartTime = new Date();

        if (isRecording && recognition) {
            isRecording = false;
            recognition.stop();
        }
        if (isSpeaking) {
            window.speechSynthesis.cancel();
            isSpeaking = false;
        }

        chatBox.innerHTML = '';
        addAIMessage(`已切换到「${btn.querySelector('.scene-name').textContent}」场景，我们开始吧！`);
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
    if (!('speechSynthesis' in window)) {
        if (onEndCallback) onEndCallback();
        return;
    }

    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en-')) || voices[0];

    setTimeout(() => {
        currentUtterance = new SpeechSynthesisUtterance(text);
        currentUtterance.lang = 'en-US';
        currentUtterance.rate = 0.9;
        currentUtterance.pitch = 1.0;
        if (englishVoice) currentUtterance.voice = englishVoice;

        const fallbackTimer = setTimeout(() => {
            isSpeaking = false;
            if (onEndCallback) onEndCallback();
        }, text.length * 80 + 2000);

        currentUtterance.onend = () => {
            clearTimeout(fallbackTimer);
            currentUtterance = null;
            if (onEndCallback) onEndCallback();
        };

        currentUtterance.onerror = (e) => {
            if (e.error === 'interrupted') return;
            clearTimeout(fallbackTimer);
            currentUtterance = null;
            if (onEndCallback) onEndCallback();
        };

        window.speechSynthesis.speak(currentUtterance);
    }, 800);
}

// ========== 界面更新 ==========
function addUserMessage(text) {
    const now = new Date().toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'});
    const div = document.createElement('div');
    div.className = 'user-message';
    div.innerHTML = `
        <div class="user-bubble">${text}</div>
        <div class="message-time">${now}</div>
    `;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

function addAIMessage(text) {
    const now = new Date().toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'});
    const div = document.createElement('div');
    div.className = 'ai-message';
    div.innerHTML = `
        <div class="ai-avatar">👩‍💼</div>
        <div>
            <div class="ai-bubble">${text}</div>
            <div class="message-time">${now}</div>
        </div>
    `;
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ========== 生成星星评分 ==========
function renderStars(score) {
    const full = Math.floor(score);
    const half = score - full >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
}

// ========== 课后总结 ==========
reportBtn.addEventListener('click', async () => {
    if (conversationHistory.length < 2) {
        alert('请先进行一段对话再生成总结');
        return;
    }

    reportBtn.textContent = '⏳ 生成中...';
    reportBtn.disabled = true;

    const rounds = Math.floor(conversationHistory.length / 2);
    const duration = sessionStartTime
        ? Math.floor((new Date() - sessionStartTime) / 1000 / 60)
        : '--';
    const avgPronScore = pronunciationIssues.length > 0
        ? (pronunciationIssues.reduce((a, b) => a + b.score, 0) / pronunciationIssues.length).toFixed(1)
        : '5.0';
    const allPronIssues = pronunciationIssues.flatMap(p => p.issues);

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
                        content: `你是一位专业英语老师，请严格按照以下 JSON 格式分析学生对话，不要输出任何其他内容：
{
  "grammar_errors": [
    {
      "wrong": "错误的表达",
      "correct": "正确的表达",
      "reason": "错误原因（一句话）"
    }
  ],
  "good_expressions": [
    "好的表达1",
    "好的表达2"
  ],
  "suggestion": "下次练习的一句话重点建议"
}`
                    },
                    {
                        role: 'user',
                        content: `请分析以下对话：\n${conversationHistory.map(m => `${m.role === 'user' ? '学生' : 'AI'}: ${m.content}`).join('\n')}`
                    }
                ],
                max_tokens: 800,
                temperature: 0.3
            })
        });

        const data = await response.json();
        let analysisText = data.choices[0].message.content.trim();
        analysisText = analysisText.replace(/```json|```/g, '').trim();
        const analysis = JSON.parse(analysisText);

        const grammarHTML = analysis.grammar_errors.length > 0
            ? analysis.grammar_errors.map((e, i) => `
                <div class="error-card">
                    <div class="error-num">错误 ${i + 1}</div>
                    <div class="error-wrong">❌ ${e.wrong}</div>
                    <div class="error-correct">✅ ${e.correct}</div>
                    <div class="error-reason">💡 ${e.reason}</div>
                </div>
            `).join('')
            : '<div class="no-error">👍 本次对话未发现明显语法错误</div>';

        const goodExpHTML = analysis.good_expressions.length > 0
            ? analysis.good_expressions.map(e => `<div class="good-item">🌟 ${e}</div>`).join('')
            : '<div class="no-error">继续积累地道表达！</div>';

        const pronIssuesHTML = allPronIssues.length > 0
            ? allPronIssues.map(i => `<div class="pron-issue">⚠️ ${i}</div>`).join('')
            : '<div class="no-error">👍 发音识别正常，继续保持！</div>';

        reportContent.innerHTML = `
            <div class="report-wrap">
                <div class="report-overview">
                    <div class="overview-card">
                        <div class="overview-num">${rounds}</div>
                        <div class="overview-label">💬 对话轮数</div>
                    </div>
                    <div class="overview-card">
                        <div class="overview-num">${duration}</div>
                        <div class="overview-label">⏱️ 练习时长(分)</div>
                    </div>
                    <div class="overview-card">
                        <div class="overview-num">${totalWords}</div>
                        <div class="overview-label">📝 总词数</div>
                    </div>
                </div>
                <div class="report-section-block">
                    <div class="section-title">🎤 发音评分</div>
                    <div class="pron-score">
                        <span class="stars">${renderStars(parseFloat(avgPronScore))}</span>
                        <span class="score-num">${avgPronScore} / 5.0</span>
                    </div>
                    <div class="pron-issues">${pronIssuesHTML}</div>
                </div>
                <div class="report-section-block">
                    <div class="section-title">✏️ 语法纠错</div>
                    <div class="grammar-count">本次发现 <strong>${analysis.grammar_errors.length}</strong> 个语法问题</div>
                    ${grammarHTML}
                </div>
                <div class="report-section-block">
                    <div class="section-title">🌟 表达亮点</div>
                    ${goodExpHTML}
                </div>
                <div class="report-section-block suggestion-block">
                    <div class="section-title">📌 下次练习重点</div>
                    <div class="suggestion-text">${analysis.suggestion}</div>
                </div>
            </div>
        `;

        reportSection.style.display = 'block';
        reportSection.scrollIntoView({ behavior: 'smooth' });

    } catch (err) {
        console.error('总结生成失败:', err);
        reportContent.innerHTML = `<p>❌ 生成失败，请检查网络连接后重试</p>`;
        reportSection.style.display = 'block';
    }

    reportBtn.innerHTML = '<span>📋</span> 生成课后总结';
    reportBtn.disabled = false;
});

// ========== 初始化 ==========
sessionStartTime = new Date();
addAIMessage("👋 Hi! I'm your AI English coach. Choose a scene above and click the mic to start speaking!");
setBtnState('idle');
initSpeechRecognition();