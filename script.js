// ========== 全局变量 ==========
let currentScene = 'interview';
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let conversationHistory = [];
let pronunciationScores = [];
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
const scoreSection = document.getElementById('scoreSection');
const scoreFill = document.getElementById('scoreFill');
const scoreText = document.getElementById('scoreText');
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
        pronunciationScores = [];
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
                // 关闭麦克风
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
    // 由于浏览器端无法直接调用 OpenAI API（会暴露密钥），
    // 这里先使用浏览器的 Web Speech API 做语音识别（免费，无需密钥）
    
    // 将 Blob 转为 base64 或直接使用 Web Speech API
    // 简化版：使用 Web Speech API 实时识别
    statusDiv.textContent = '🎙️ 识别中...';
    
    // 创建一个新的 AudioContext 来播放录音（或者直接使用 Web Speech API）
    // 为了简单，我们直接提示用户需要调用后端 API
    // 这里先模拟一个识别结果（实际使用时需要后端代理）
    
    // 方案：显示一个输入框让用户输入（演示用）
    const userText = prompt('🎙️ 请用英语说出你的回答（演示模式）：\n\n正式版本会自动识别语音，当前演示请手动输入：');
    
    if (userText) {
        addUserMessage(userText);
        statusDiv.textContent = '🤖 AI 思考中...';
        
        // 模拟发音评分（随机 70-95 分）
        const mockScore = Math.floor(Math.random() * 25) + 70;
        showPronunciationScore(mockScore);
        
        // 简单语法检查（基于关键词）
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

// ========== 模拟发音评分 ==========
function showPronunciationScore(score) {
    pronunciationScores.push(score);
    scoreSection.style.display = 'block';
    scoreFill.style.width = `${score}%`;
    scoreText.textContent = `${score}分`;
    
    if (score >= 90) {
        scoreText.style.color = '#00c853';
    } else if (score >= 70) {
        scoreText.style.color = '#ffa000';
    } else {
        scoreText.style.color = '#d32f2f';
    }
    
    // 3秒后自动隐藏
    setTimeout(() => {
        scoreSection.style.display = 'none';
    }, 3000);
}

// ========== 简单语法检查（演示用）==========
function checkGrammar(text) {
    const corrections = [];
    const lowerText = text.toLowerCase();
    
    // 常见错误检查
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

// ========== AI 对话（模拟，实际需要 API）==========
async function getAIResponse(userMessage) {
    // 记录对话历史
    if (userMessage) {
        conversationHistory.push({ role: 'user', content: userMessage });
    }
    
    // 模拟 AI 回复（演示模式）
    // 正式版需要调用 OpenAI API，这里先根据场景模拟回复
    
    const responses = {
        interview: [
            "That's interesting! Can you tell me more about your previous work experience?",
            "Great answer! What do you consider your biggest strength?",
            "I see. Why do you want to join our company?",
            "Good! Where do you see yourself in 5 years?"
        ],
        ordering: [
            "Would you like to see our menu? We have special today.",
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
    
    // 模拟延迟
    await new Promise(resolve => setTimeout(resolve, 800));
    
    addAIMessage(randomResponse);
    conversationHistory.push({ role: 'assistant', content: randomResponse });
    statusDiv.textContent = '⚪ 准备就绪';
    
    // 触发浏览器语音合成（TTS）
    speakText(randomResponse);
}

// ========== 文字转语音（浏览器原生）==========
function speakText(text) {
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        window.speechSynthesis.cancel(); // 清除之前的
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
    const avgScore = pronunciationScores.length > 0 
        ? (pronunciationScores.reduce((a,b) => a+b,0) / pronunciationScores.length).toFixed(1)
        : '暂无';
    
    const uniqueCorrections = [...new Set(grammarCorrections)];
    
    let reportHtml = `
        <p>📊 对话轮数：${Math.floor(conversationHistory.length / 2)} 轮</p>
        <p>🎤 平均发音得分：${avgScore} 分</p>
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
    
    if (avgScore !== '暂无' && avgScore < 75) {
        reportHtml += `<li>🎯 发音有待提高，建议多模仿母语者的语调。</li>`;
    } else if (avgScore !== '暂无' && avgScore > 85) {
        reportHtml += `<li>🌟 发音很棒！可以挑战更复杂的句子。</li>`;
    }
    
    reportHtml += `
            <li>📖 建议每天练习15分钟，坚持一周会有明显进步。</li>
        </ul>
        <hr>
        <p><strong>🏆 继续保持！Practice makes perfect!</strong></p>
    `;
    
    reportContent.innerHTML = reportHtml;
    reportSection.style.display = 'block';
    
    // 滚动到报告位置
    reportSection.scrollIntoView({ behavior: 'smooth' });
});

// ========== 初始化问候 ==========
addAIMessage("👋 Hi! I'm your AI English coach. Click and hold the mic button, speak your answer, then release. Let's practice! Choose a scene above to start.");