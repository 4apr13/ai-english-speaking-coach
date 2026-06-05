// ========== 全局变量 ==========
let currentScene = 'interview';
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let conversationHistory = [];
let grammarCorrections = [];

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

// ========== 场景切换 ==========
sceneBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        sceneBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentScene = btn.dataset.scene;

        // 重置对话
        conversationHistory = [];
        grammarCorrections = [];

        // AI 发送开场白
        addAIMessage(`Scene changed to ${btn.textContent}. Let's start!`);

        // 调用 API 获取开场白
        getAIResponse("Let's begin the conversation. Say something to start.");
    });
});

// ========== 录音功能 ==========
recordBtn.addEventListener('mousedown', startRecording);
recordBtn.addEventListener('mouseup', stopRecording);
recordBtn.addEventListener('mouseleave', stopRecording);

function startRecording() {
    if (isRecording) return;

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = event => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                processAudio(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            isRecording = true;
            recordBtn.classList.add('recording');
            recordBtn.textContent = '🎤 录音中... 松手结束';
            statusDiv.textContent = '🔴 正在录音... 松手后自动识别';
        })
        .catch(err => {
            console.error('麦克风错误:', err);
            statusDiv.textContent = '❌ 无法访问麦克风，请检查权限';
        });
}

function stopRecording() {
    if (!isRecording) return;

    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
        isRecording = false;
        recordBtn.classList.remove('recording');
        recordBtn.textContent = '🎤 点击说话';
        statusDiv.textContent = '⚪ 处理中...';
    }
}

// ========== 处理音频并转文字 ==========
async function processAudio(audioBlob) {
    statusDiv.textContent = '🎙️ 识别中...';

    const userText = prompt('🎙️ 请用英语说出你的回答（演示模式）：\n\n正式版本会自动识别语音，当前演示请手动输入：');

    if (userText) {
        addUserMessage(userText);
        statusDiv.textContent = '🤖 AI 思考中...';

        // 语法检查
        const corrections = checkGrammar(userText);
        if (corrections.length > 0) {
            showGrammarCorrections(corrections);
        }

        // 获取 AI 回复
        await getAIResponse(userText);
    } else {
        statusDiv.textContent = '⚪ 准备就绪';
    }
}

// ========== 语法检查（演示用）==========
function checkGrammar(text) {
    const corrections = [];
    const lowerText = text.toLowerCase();

    if (lowerText.includes('go to home')) {
        corrections.push('❌ "go to home" → ✅ "go home" (home 前不加 to)');
    }
    if (lowerText.includes('i am agree')) {
        corrections.push('❌ "I am agree" → ✅ "I agree" (agree 是动词)');
    }
    if (lowerText.includes('i have 20 years')) {
        corrections.push('❌ "I have 20 years" → ✅ "I am 20 years old"');
    }
    if (lowerText.match(/go.*yesterday/)) {
        corrections.push('❌ 过去时间用过去式: "go" → "went"');
    }
    if (text.includes(' ') && !text.match(/[.!?]$/)) {
        corrections.push('💡 建议在句尾加标点符号，如 . 或 ?');
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

// ========== AI 对话（模拟）==========
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
    statusDiv.textContent = '⚪ 准备就绪';

    speakText(randomResponse);
}

// ========== 文字转语音 ==========
function speakText(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
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
    // 发音评分待接入真实评测系统，暂不展示
    const avgScore = '待接入评测系统';

    const uniqueCorrections = [...new Set(grammarCorrections)];

    let reportHtml = `
        <p>📊 对话轮数：${Math.floor(conversationHistory.length / 2)} 轮</p>
        <p>🎤 发音评分：${avgScore}</p>
        <p>✏️ 发现语法问题：${uniqueCorrections.length} 个</p>
        <hr>
        <h4>💡 提升建议：</h4>
        <ul>
    `;

    if (uniqueCorrections.length > 0) {
        uniqueCorrections.forEach(c => {
            reportHtml += `<li>${c}</li>`;
        });
    } else {
        reportHtml += `<li>👍 语法表现不错！继续练习可以更流利。</li>`;
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

// ========== 初始化问候 ==========
addAIMessage("👋 Hi! I'm your AI English coach. Click and hold the mic button, speak your answer, then release. Let's practice! Choose a scene above to start.");